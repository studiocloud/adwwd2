import React, { useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface BulkUploadProps {
  onFileSelect: (file: File) => void;
  loading: boolean;
  progress: number;
}

export function BulkUpload({ onFileSelect, loading, progress }: BulkUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-t border-gray-700 my-6"></div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Bulk Email Validation (CSV)
      </label>
      <div className="relative">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".csv"
          className="hidden"
          disabled={loading}
        />
        <div className="flex items-center space-x-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Upload CSV</span>
          </button>
          {selectedFile && (
            <button
              onClick={clearFile}
              className="p-2 text-gray-400 hover:text-gray-300"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {selectedFile && (
        <div className="bg-gray-700/50 rounded-md p-4">
          <div className="flex items-center space-x-3 mb-3">
            <FileText className="w-5 h-5 text-blue-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 truncate">{selectedFile.name}</p>
            </div>
          </div>
          {loading && (
            <div className="space-y-2">
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 text-center">
                Processing... {Math.round(progress)}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}