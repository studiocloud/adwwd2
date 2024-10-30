import React from 'react';
import { Download } from 'lucide-react';
import { ValidationResult } from '../types';

interface ResultsDisplayProps {
  results: ValidationResult[];
  onDownload: () => void;
  showDownload?: boolean;
}

export function ResultsDisplay({ results, onDownload, showDownload = true }: ResultsDisplayProps) {
  if (results.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-xl shadow-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Validation Results</h2>
        {showDownload && (
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        )}
      </div>
      <div className="space-y-4">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${
              result.validation_result === 'Valid' ? 'bg-green-900/30' : 'bg-red-900/30'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="font-medium">{result.email}</p>
                <p className={`text-sm ${
                  result.validation_result === 'Valid' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {result.validation_result} - {result.validation_reason}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {['mx_check', 'dns_check', 'spf_check', 'mailbox_check', 'smtp_check'].map((check) => (
                  <div
                    key={check}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      result[check]
                        ? 'bg-green-900/50 text-green-400' 
                        : 'bg-red-900/50 text-red-400'
                    }`}
                  >
                    {check.replace('_check', '').toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}