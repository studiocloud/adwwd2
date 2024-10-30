import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { createReadStream, unlinkSync } from 'fs';
import { validateEmail } from '../validators/email.js';

const router = express.Router();

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      cb(new Error('Only CSV files are allowed'));
      return;
    }
    cb(null, true);
  }
});

router.post('/validate', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        valid: false,
        reason: 'Email is required'
      });
    }

    const result = await validateEmail(email);
    return res.json(result);
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({
      valid: false,
      reason: 'Server error occurred'
    });
  }
});

router.post('/validate/bulk', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required' });
  }

  try {
    const results = [];
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const records = [];
    const processChunk = async (chunk) => {
      const email = chunk.email || chunk.Email || chunk.EMAIL;
      if (email) {
        const validationResult = await validateEmail(email);
        return {
          ...chunk,
          validation_result: validationResult.valid ? 'Valid' : 'Invalid',
          validation_reason: validationResult.reason,
          mx_check: validationResult.checks.mx,
          dns_check: validationResult.checks.dns,
          spf_check: validationResult.checks.spf,
          mailbox_check: validationResult.checks.mailbox,
          smtp_check: validationResult.checks.smtp
        };
      }
      return chunk;
    };

    parser.on('readable', async function() {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });

    parser.on('error', (error) => {
      console.error('CSV parsing error:', error);
      res.status(500).json({ error: 'Failed to process CSV file' });
    });

    parser.on('end', async () => {
      try {
        const chunkSize = 10;
        for (let i = 0; i < records.length; i += chunkSize) {
          const chunk = records.slice(i, i + chunkSize);
          const processedChunk = await Promise.all(chunk.map(processChunk));
          results.push(...processedChunk);
          
          res.write(JSON.stringify({ 
            type: 'progress',
            progress: Math.min(((i + chunkSize) / records.length) * 100, 100),
            partialResults: processedChunk
          }) + '\n');
        }

        res.write(JSON.stringify({ 
          type: 'complete',
          results 
        }) + '\n');
        res.end();
      } catch (error) {
        console.error('Processing error:', error);
        res.write(JSON.stringify({ 
          type: 'error',
          error: 'Failed to process records'
        }) + '\n');
        res.end();
      }
    });

    createReadStream(req.file.path).pipe(parser);

    req.on('end', () => {
      try {
        unlinkSync(req.file.path);
      } catch (error) {
        console.error('Failed to cleanup uploaded file:', error);
      }
    });
  } catch (error) {
    console.error('Bulk validation error:', error);
    res.status(500).json({ error: 'Failed to process CSV file' });
  }
});

export default router;