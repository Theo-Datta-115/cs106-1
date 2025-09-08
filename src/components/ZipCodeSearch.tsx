import React, { useState } from 'react';
import { Search, MapPin } from 'lucide-react';

interface ZipCodeSearchProps {
  onSearch: (zipCode: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

export const ZipCodeSearch: React.FC<ZipCodeSearchProps> = ({
  onSearch,
  isLoading,
  disabled
}) => {
  const [zipCode, setZipCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (zipCode.trim() && zipCode.length === 5) {
      onSearch(zipCode.trim());
    }
  };

  const isValidZip = zipCode.length === 5 && /^\d{5}$/.test(zipCode);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <MapPin className="w-6 h-6 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-800">County Employment Data Search</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-2">
            ZIP Code
          </label>
          <div className="relative">
            <input
              type="text"
              id="zipCode"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="Enter 5-digit ZIP code (e.g., 02459)"
              disabled={disabled}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
          {zipCode.length > 0 && !isValidZip && (
            <p className="mt-1 text-sm text-red-600">Please enter a valid 5-digit ZIP code</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!isValidZip || isLoading || disabled}
          className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search size={20} />
              Find Top Industries by County
            </>
          )}
        </button>
      </form>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This searches for employment data at the county level for the ZIP code you enter, 
          showing the top industries by employment across all 2-digit NAICS sectors.
        </p>
      </div>
    </div>
  );
};