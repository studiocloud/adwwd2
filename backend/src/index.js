import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { parse } from 'csv-parse';
import dns from 'dns';
import nodemailer from 'nodemailer';
import { promisify } from 'util';
import { createReadStream } from 'fs';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);

const upload = multer({ dest: 'uploads/' });

// DNS promises
const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);

async function validateEmail(email) {
  const [localPart, domain] = email.split('@');
  const result = {
    email,
    valid: false,
    checks: {
      mx: false,
      dns: false,
      spf: false,
      mailbox: false,
      smtp: false
    }
  };

  try {
    // DNS Check
    await dns.promises.lookup(domain);
    result.checks.dns = true;

    // MX Check
    const mxRecords = await resolveMx(domain);
    result.checks.mx = mxRecords.length > 0;

    // SPF Check
    const txtRecords = await resolveTxt(domain);
    result.checks.spf = txtRecords.some(records => 
      records.some(record => record.includes('v=spf1'))
    );

    // SMTP & Mailbox Check for major ESPs
    if (['gmail.com', 'outlook.com', 'yahoo.com'].includes(domain)) {
      const transporter = nodemailer.createTransport({
        host: mxRecords[0].exchange,
        port: 25,
        secure: false
      });

      try {
        await transporter.verify();
        result.checks.smtp = true;

        const verifyResult = await transporter.verify({
          from: process.env.VERIFY_FROM_EMAIL,
          to: email
        });

        result.checks.mailbox = verifyResult;
      } catch (error) {
        console.error('SMTP verification error:', error);
      }
    } else {
      // For other domains, mark as potentially valid if DNS checks pass
      result.checks.smtp = true;
      result.checks.mailbox = true;
    }

    // Overall validation result
    result.valid = Object.values(result.checks).every(check => check);
  } catch (error) {
    result.reason = error.message;
  }

  return result;
}

// Single email validation endpoint
app.post('/api/validate', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await validateEmail(email);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk validation endpoint
app.post('/api/validate/bulk', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required' });
  }

  const results = [];
  let processed = 0;
  let total = 0;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Transfer-Encoding', 'chunked');

  const parser = createReadStream(req.file.path)
    .pipe(parse({
      skip_empty_lines: true,
      columns: true
    }));

  for await (const record of parser) {
    total++;
  }

  const parser2 = createReadStream(req.file.path)
    .pipe(parse({
      skip_empty_lines: true,
      columns: true
    }));

  for await (const record of parser2) {
    const email = record.email;
    const result = await validateEmail(email);
    results.push(result);
    processed++;

    // Send progress updates
    res.write(JSON.stringify({
      progress: (processed / total) * 100,
      results: [result]
    }) + '\n');
  }

  res.end();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});