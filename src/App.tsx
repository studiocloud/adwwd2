import React from 'react';
import { ValidationForm } from './components/ValidationForm';
import { Mail } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <Mail className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Email Validator Pro
          </h1>
          <p className="text-lg text-gray-300">
            Deep verification with MX, DNS, SPF, and mailbox checks
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
          <ValidationForm />
        </div>
      </div>
    </div>
  );
}

export default App;