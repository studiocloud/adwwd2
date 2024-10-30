import React from 'react';
import { Mail } from 'lucide-react';

interface EmailInputProps {
  email: string;
  setEmail: (email: string) => void;
  onValidate: () => void;
  loading: boolean;
}

export function EmailInput({ email, setEmail, onValidate, loading }: EmailInputProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
          Single Email Validation
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter email to validate"
        />
      </div>
      <button
        onClick={onValidate}
        disabled={loading || !email}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Validate Email
      </button>
    </div>
  );
}