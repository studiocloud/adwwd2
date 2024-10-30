import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ValidationResultProps {
  result: {
    valid: boolean;
    reason?: string;
    checks?: {
      mx: boolean;
      dns: boolean;
      spf: boolean;
      mailbox: boolean;
      smtp: boolean;
    };
  };
  email?: string;
}

export function ValidationResult({ result }: ValidationResultProps) {
  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-md ${result.valid ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
        <div className="flex items-center">
          {result.valid ? (
            <CheckCircle2 className="w-5 h-5 text-green-400 mr-2" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400 mr-2" />
          )}
          <span className={`text-sm ${result.valid ? 'text-green-400' : 'text-red-400'}`}>
            {result.valid ? 'Valid email address' : result.reason}
          </span>
        </div>
      </div>

      {result.checks && (
        <div className="bg-gray-700/50 rounded-md p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Detailed Checks</h3>
          <div className="space-y-2">
            {Object.entries(result.checks).map(([check, passed]) => (
              <div key={check} className="flex items-center justify-between">
                <span className="text-sm text-gray-400 capitalize">{check}</span>
                {passed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}