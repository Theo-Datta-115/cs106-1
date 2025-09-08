import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export const NAICSExplanation: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-800">What is NAICS?</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-blue-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-blue-600" />
        )}
      </button>
      
      {isExpanded && (
        <div className="mt-4 space-y-3 text-sm text-blue-800">
          <p>
            <strong>NAICS (North American Industry Classification System)</strong> is the standard 
            system used by the U.S. Census Bureau to classify business establishments by industry.
          </p>
          
          <div className="space-y-2">
            <p><strong>How NAICS codes work:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>2-digit codes</strong> represent major industry sectors (e.g., 62 = Health Care)</li>
              <li><strong>3-digit codes</strong> represent subsectors (e.g., 621 = Ambulatory Health Care)</li>
              <li><strong>4-6 digit codes</strong> provide increasingly specific industry details</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <p className="font-medium mb-2">Example breakdown:</p>
            <div className="space-y-1 text-xs">
              <div>• <strong>62</strong> - Health Care and Social Assistance</div>
              <div className="ml-4">• <strong>621</strong> - Ambulatory Health Care Services</div>
              <div className="ml-4">• <strong>622</strong> - Hospitals</div>
              <div className="ml-4">• <strong>623</strong> - Nursing and Residential Care</div>
              <div className="ml-4">• <strong>624</strong> - Social Assistance</div>
            </div>
          </div>
          
          <p>
            This data comes from the U.S. Census Bureau's County Business Patterns (CBP) survey, 
            which provides annual statistics on business establishments, employment, and payroll.
          </p>
          
          <a
            href="https://www.census.gov/naics/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900 font-medium"
          >
            Learn more about NAICS <ExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  );
};