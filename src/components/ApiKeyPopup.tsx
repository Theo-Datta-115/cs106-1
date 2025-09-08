import React, { useState } from 'react';
import { Key, Eye, EyeOff, ExternalLink, X, CheckCircle } from 'lucide-react';

interface ApiKeyPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyPopup: React.FC<ApiKeyPopupProps> = ({ isOpen, onClose }) => {
  const [userApiKey, setUserApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const handleTestConnection = async () => {
    if (!userApiKey) return;

    setIsTestingConnection(true);
    setIsConnected(null);

    try {
      const testUrl = `https://api.census.gov/data/2022/cbp?get=NAME,NAICS2017_LABEL,EMP&for=us:*&NAICS2017=00&key=${userApiKey}`;
      const response = await fetch(testUrl);
      setIsConnected(response.ok);
    } catch {
      setIsConnected(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Key className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">Get Your Own API Key</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800 font-medium mb-1">
                    Currently using demo API key
                  </p>
                  <p className="text-xs text-blue-700">
                    The app is working with a shared demo key. Get your own for better reliability and higher rate limits.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="userApiKey" className="block text-sm font-medium text-gray-700 mb-2">
                Your Census Bureau API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  id="userApiKey"
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                  placeholder="Enter your Census Bureau API key"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={!userApiKey || isTestingConnection}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isTestingConnection ? 'Testing...' : 'Test Key'}
                </button>
                
                {isConnected !== null && (
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    isConnected 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    {isConnected ? 'Valid Key' : 'Invalid Key'}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800">How to get your API key:</h3>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>Visit the Census Bureau API key signup page</li>
                <li>Fill out the simple registration form</li>
                <li>Check your email for the API key</li>
                <li>Copy and paste it above to test</li>
              </ol>
              
              <a
                href="https://api.census.gov/data/key_signup.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Get Free API Key <ExternalLink size={16} />
              </a>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">Benefits of your own key:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Higher rate limits (500 calls/day vs shared limits)</li>
                <li>• Better reliability and performance</li>
                <li>• No dependency on shared demo key</li>
                <li>• Free and takes less than 2 minutes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};