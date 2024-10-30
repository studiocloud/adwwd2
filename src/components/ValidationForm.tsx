import React, { useState } from 'react';
import { EmailInput } from './EmailInput';
import { BulkUpload } from './BulkUpload';
import { ResultsDisplay } from './ResultsDisplay';
import { ValidationResult } from '../types';

export function ValidationForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateSingleEmail = async () => {
    if (!email) return;
    
    setLoading(true);
    setError(null);
    setResults([]);
    
    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to validate email');
      }
      
      const result = await response.json();
      
      // Transform the result to match the expected format
      const transformedResult = {
        email: result.email,
        validation_result: result.valid ? 'Valid' : 'Invalid',
        validation_reason: result.reason,
        mx_check: result.checks.mx,
        dns_check: result.checks.dns,
        spf_check: result.checks.spf,
        mailbox_check: result.checks.mailbox,
        smtp_check: result.checks.smtp
      };
      
      setResults([transformedResult]);
    } catch (error) {
      console.error('Validation error:', error);
      setError('Failed to validate email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    setLoading(true);
    setProgress(0);
    setError(null);
    setResults([]);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/validate/bulk', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process CSV file');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to read response');
      }

      let accumulatedResults: ValidationResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'progress') {
              setProgress(data.progress);
              if (data.partialResults) {
                accumulatedResults = [...accumulatedResults, ...data.partialResults];
                setResults(accumulatedResults);
              }
            } else if (data.type === 'complete') {
              setResults(data.results);
              setProgress(100);
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (e) {
            console.error('Error parsing chunk:', e);
          }
        }
      }
    } catch (error) {
      console.error('Bulk validation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process CSV file');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (results.length === 0) return;

    const headers = Array.from(new Set(
      results.flatMap(result => Object.keys(result))
    ));

    const csvContent = [
      headers.join(','),
      ...results.map(result => 
        headers.map(header => {
          const value = result[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value ?? '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email-validation-results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-8">
      <EmailInput
        email={email}
        setEmail={setEmail}
        onValidate={validateSingleEmail}
        loading={loading}
      />
      
      <BulkUpload
        onFileSelect={handleFileSelect}
        loading={loading}
        progress={progress}
      />
      
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}
      
      {results.length > 0 && (
        <ResultsDisplay
          results={results}
          onDownload={handleDownload}
          showDownload={results.length > 1}
        />
      )}
    </div>
  );
}