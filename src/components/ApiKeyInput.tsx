import React, { useState } from 'react';
import { Key, ExternalLink, CheckCircle } from 'lucide-react';

interface ApiKeyInputProps {
  onShowApiKeyPopup: () => void;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onShowApiKeyPopup }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <Key className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">API Status</h2>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Demo API Key Active</span>
          </div>
          <span className="text-sm text-gray-600">Ready to search employment data</span>
        </div>


        <button
          onClick={onShowApiKeyPopup}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <ExternalLink size={16} />
          Get Your Own API Key
        </button>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Currently using a demo API key.</strong> The app is fully functional, but getting your own free API key provides better reliability and higher rate limits.
        </p>
      </div>
    </div>
  );
};