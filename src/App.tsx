import React, { useState, useCallback } from 'react';
import { BarChart3, Building2 } from 'lucide-react';

import { CensusApiService } from './services/censusApi';
import { ProcessedEmployerData, MetricType } from './types/census';
import { ApiKeyInput } from './components/ApiKeyInput';
import { ApiKeyPopup } from './components/ApiKeyPopup';
import { NAICSExplanation } from './components/NAICSExplanation';
import { ZipCodeSearch } from './components/ZipCodeSearch';
import { EmployerResults } from './components/EmployerResults';
import { ErrorMessage } from './components/ErrorMessage';

function App() {
  // Hardcoded API key for automatic queries
  const [apiKey, setApiKey] = useState('d82844f623c93853b33709876d80621f7cfa30ae');
  const [showApiKeyPopup, setShowApiKeyPopup] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [employerData, setEmployerData] = useState<ProcessedEmployerData[]>([]);
  const [currentZip, setCurrentZip] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('employees');
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set());

  const handleSearch = useCallback(async (zipCode: string) => {
    if (!apiKey) return;

    setIsSearching(true);
    setError('');
    setEmployerData([]);
    setCurrentZip(zipCode);

    try {
      const service = new CensusApiService(apiKey);
      const data = await service.fetchEmploymentDataForZip(zipCode);
      setEmployerData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch employment data';
      setError(errorMessage);
    } finally {
      setIsSearching(false);
    }
  }, [apiKey]);

  const handleShowApiKeyPopup = useCallback(() => {
    setShowApiKeyPopup(true);
  }, []);

  const handleCloseApiKeyPopup = useCallback(() => {
    setShowApiKeyPopup(false);
  }, []);

  const handleDismissError = useCallback(() => {
    setError('');
  }, []);

  const handleMetricChange = useCallback((metric: MetricType) => {
    setSelectedMetric(metric);
  }, []);

  const handleExpandIndustry = useCallback(async (naicsCode: string, state: string, county: string) => {
    if (!apiKey) return;

    console.log(`Expanding NAICS code: ${naicsCode}`);

    const isCurrentlyExpanded = expandedIndustries.has(naicsCode);
    
    if (isCurrentlyExpanded) {
      // Collapse
      setExpandedIndustries(prev => {
        const newSet = new Set(prev);
        newSet.delete(naicsCode);
        return newSet;
      });
      
      // Remove sub-industries from the data (handle nested structure)
      setEmployerData(prev => prev.map(item => {
        if (item.naicsCode === naicsCode) {
          return { ...item, subIndustries: [], isExpanded: false };
        }
        // Also check sub-industries for nested expansion
        if (item.subIndustries) {
          return {
            ...item,
            subIndustries: item.subIndustries.map(subItem => 
              subItem.naicsCode === naicsCode 
                ? { ...subItem, subIndustries: [], isExpanded: false }
                : subItem
            )
          };
        }
        return item;
      }));
    } else {
      // Expand
      setExpandedIndustries(prev => new Set([...prev, naicsCode]));
      
      // Mark as loading (handle nested structure)
      setEmployerData(prev => prev.map(item => {
        if (item.naicsCode === naicsCode) {
          return { ...item, isLoadingSubIndustries: true, isExpanded: true };
        }
        // Also check sub-industries for nested expansion
        if (item.subIndustries) {
          return {
            ...item,
            subIndustries: item.subIndustries.map(subItem => 
              subItem.naicsCode === naicsCode 
                ? { ...subItem, isLoadingSubIndustries: true, isExpanded: true }
                : subItem
            )
          };
        }
        return item;
      }));

      try {
        const service = new CensusApiService(apiKey);
        const subIndustries = await service.fetchSubIndustries(state, county, naicsCode, currentZip);
        
        console.log(`Found ${subIndustries.length} sub-industries for ${naicsCode}:`, subIndustries);
        
        // Add county totals to sub-industries
        const firstItem = employerData.find(item => item.naicsCode === naicsCode);
        const enrichedSubIndustries = subIndustries.map(sub => ({
          ...sub,
          countyTotalEmployees: firstItem?.countyTotalEmployees,
          countyTotalEstablishments: firstItem?.countyTotalEstablishments,
          countyTotalPayroll: firstItem?.countyTotalPayroll
        }));
        
        setEmployerData(prev => prev.map(item => {
          if (item.naicsCode === naicsCode) {
            return { ...item, subIndustries: enrichedSubIndustries, isLoadingSubIndustries: false };
          }
          // Also check sub-industries for nested expansion
          if (item.subIndustries) {
            return {
              ...item,
              subIndustries: item.subIndustries.map(subItem => 
                subItem.naicsCode === naicsCode 
                  ? { ...subItem, subIndustries: enrichedSubIndustries, isLoadingSubIndustries: false }
                  : subItem
              )
            };
          }
          return item;
        }));
      } catch (err) {
        console.error(`Error expanding ${naicsCode}:`, err);
        setError(`Failed to fetch sub-industries: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setEmployerData(prev => prev.map(item => {
          if (item.naicsCode === naicsCode) {
            return { ...item, isLoadingSubIndustries: false, isExpanded: false };
          }
          // Also check sub-industries for nested expansion
          if (item.subIndustries) {
            return {
              ...item,
              subIndustries: item.subIndustries.map(subItem => 
                subItem.naicsCode === naicsCode 
                  ? { ...subItem, isLoadingSubIndustries: false, isExpanded: false }
                  : subItem
              )
            };
          }
          return item;
        }));
        setExpandedIndustries(prev => {
          const newSet = new Set(prev);
          newSet.delete(naicsCode);
          return newSet;
        });
      }
    }
  }, [apiKey, currentZip, employerData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">
              Census Economic Data Explorer
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover the top 10 largest employers by industry in any U.S. ZIP code using 
            official Census Bureau economic data from 2022. Allows for granular exploration of sub-industries according to NAICS codes.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <ErrorMessage 
            message={error} 
            onDismiss={handleDismissError}
          />
        )}

        {/* API Key Configuration */}
        <ApiKeyInput onShowApiKeyPopup={handleShowApiKeyPopup} />

        {/* API Key Popup */}
        <ApiKeyPopup 
          isOpen={showApiKeyPopup} 
          onClose={handleCloseApiKeyPopup} 
        />

        {/* ZIP Code Search */}
        <ZipCodeSearch
          onSearch={handleSearch}
          isLoading={isSearching}
          disabled={false}
        />

        {/* NAICS Explanation */}
        <NAICSExplanation />

        {/* Results */}
        {employerData.length > 0 && (
          <EmployerResults 
            data={employerData} 
            zipCode={currentZip}
            metric={selectedMetric}
            onMetricChange={handleMetricChange}
            onExpandIndustry={handleExpandIndustry}
            expandedIndustries={expandedIndustries}
          />
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Building2 className="w-4 h-4" />
            <span>
              Data provided by the U.S. Census Bureau Economic Census 2022
            </span>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            Employment figures represent establishments within industry sectors (NAICS codes) 
            and may include multiple businesses per category.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;