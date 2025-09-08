import React from 'react';
import { ProcessedEmployerData, MetricType } from '../types/census';
import { Building2, Users, Hash, TrendingUp, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

interface EmployerResultsProps {
  data: ProcessedEmployerData[];
  zipCode: string;
  metric: MetricType;
  onMetricChange: (metric: MetricType) => void;
  onExpandIndustry: (naicsCode: string, state: string, county: string) => void;
  expandedIndustries: Set<string>;
}

export const EmployerResults: React.FC<EmployerResultsProps> = ({ 
  data, 
  zipCode, 
  metric, 
  onMetricChange,
  onExpandIndustry,
  expandedIndustries
}) => {
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPayroll = (amount: number): string => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${formatNumber(amount)}`;
  };

  const getMetricValue = (employer: ProcessedEmployerData): number => {
    switch (metric) {
      case 'employees':
        return employer.employees;
      case 'establishments':
        return employer.establishments;
      case 'payroll':
        return employer.payroll;
      default:
        return employer.employees;
    }
  };

  const getMetricLabel = (): string => {
    switch (metric) {
      case 'employees':
        return 'Employees';
      case 'establishments':
        return 'Establishments';
      case 'payroll':
        return 'Annual Payroll';
      default:
        return 'Employees';
    }
  };

  const getMetricIcon = () => {
    switch (metric) {
      case 'employees':
        return <Users className="w-5 h-5" />;
      case 'establishments':
        return <Building2 className="w-5 h-5" />;
      case 'payroll':
        return <Hash className="w-5 h-5" />;
      default:
        return <Users className="w-5 h-5" />;
    }
  };

  const formatMetricValue = (value: number): string => {
    if (metric === 'payroll') {
      return formatPayroll(value);
    }
    return formatNumber(value);
  };

  const getTotalMetric = (): number => {
    return data.reduce((sum, employer) => sum + getMetricValue(employer), 0);
  };

  const getMetricPercentage = (value: number): number => {
    if (data.length === 0) return 0;
    
    // Use county totals for percentage calculation
    const firstItem = data[0];
    let countyTotal = 0;
    
    switch (metric) {
      case 'employees':
        countyTotal = firstItem.countyTotalEmployees || 0;
        break;
      case 'establishments':
        countyTotal = firstItem.countyTotalEstablishments || 0;
        break;
      case 'payroll':
        countyTotal = firstItem.countyTotalPayroll || 0;
        break;
    }
    
    return countyTotal > 0 ? (value / countyTotal) * 100 : 0;
  };

  // Sort data by the selected metric
  const sortedData = [...data].sort((a, b) => getMetricValue(b) - getMetricValue(a));

  // Cap at top 10 industries
  const top10Data = sortedData.slice(0, 10);

  // Extract state and county from location string (e.g., "Middlesex County, Massachusetts")
  const getStateCountyFromLocation = (location: string): { state: string, county: string } => {
    // This is a simplified extraction - in a real app you'd want more robust parsing
    // For now, we'll use hardcoded values that match our ZIP code mappings
    const zipToStateCounty: Record<string, { state: string, county: string }> = {
      '02459': { state: '25', county: '017' }, // Newton, MA -> Middlesex County
      '10001': { state: '36', county: '061' }, // Manhattan, NY -> New York County
      '90210': { state: '06', county: '037' }, // Beverly Hills, CA -> Los Angeles County
      '60601': { state: '17', county: '031' }, // Chicago, IL -> Cook County
    };
    
    return zipToStateCounty[zipCode] || { state: '25', county: '017' }; // Default to MA
  };

  const { state, county } = getStateCountyFromLocation(sortedData[0]?.location || '');

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">No Data Found</h3>
        <p className="text-gray-500">
          No employment data was found for ZIP code {zipCode}. This could mean:
        </p>
        <ul className="text-sm text-gray-500 mt-2 space-y-1">
          <li>• The ZIP code has limited economic activity</li>
          <li>• Data may not be available for privacy reasons</li>
          <li>• The ZIP code might not exist in the census database</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-6 h-6" />
          <h2 className="text-2xl font-bold">County Employment Summary for ZIP {zipCode}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              {getMetricIcon()}
              <span className="text-sm font-medium">Total {getMetricLabel()}</span>
            </div>
            <span className="text-2xl font-bold">{formatMetricValue(getTotalMetric())}</span>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">Largest Sector</span>
            </div>
            <span className="text-sm font-bold">{sortedData[0]?.industry.split(' - ')[0] || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Top 10 Industries by {getMetricLabel()}</h3>
              <p className="text-sm text-gray-600 mt-1">County-level data ranked by {metric}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onMetricChange('employees')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  metric === 'employees'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline mr-1" />
                Employees
              </button>
              <button
                onClick={() => onMetricChange('establishments')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  metric === 'establishments'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Building2 className="w-4 h-4 inline mr-1" />
                Firms
              </button>
              <button
                onClick={() => onMetricChange('payroll')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  metric === 'payroll'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Hash className="w-4 h-4 inline mr-1" />
                Payroll
              </button>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {top10Data.map((employer, index) => {
            const metricValue = getMetricValue(employer);
            const isExpanded = expandedIndustries.has(employer.naicsCode);
            const subIndustries = employer.subIndustries || [];
            const sortedSubIndustries = [...subIndustries].sort((a, b) => getMetricValue(b) - getMetricValue(a));
            
            return (
              <div key={`${employer.naicsCode}-${index}`}>
                <div className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-lg">
                            {employer.industry.includes(' - ') 
                              ? employer.industry.split(' - ')[1] 
                              : employer.industry}
                          </h4>
                          <p className="text-sm text-gray-600">
                            NAICS Code: {employer.naicsCode}
                          </p>
                        </div>
                        <button
                          onClick={() => onExpandIndustry(employer.naicsCode, state, county)}
                          disabled={employer.isLoadingSubIndustries}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                        >
                          {employer.isLoadingSubIndustries ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          {employer.isLoadingSubIndustries ? 'Loading...' : isExpanded ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                      
                      <div className="ml-11 space-y-2">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            {getMetricIcon()}
                            <span className="font-medium text-gray-900">
                              {formatMetricValue(metricValue)} {metric}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>{getMetricPercentage(metricValue).toFixed(1)}% of county</span>
                          </div>
                        </div>
                        
                        {employer.location && employer.location !== 'Unknown Location' && (
                          <p className="text-sm text-gray-500 ml-0">
                            Location: {employer.location}
                          </p>
                        )}
                        
                        {/* Visual bar showing relative size */}
                        <div className="w-full bg-gray-200 rounded-full h-2 ml-0">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.max(getMetricPercentage(metricValue), 2)}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Sub-industries */}
                {isExpanded && sortedSubIndustries.length > 0 && (
                  <div className="bg-gray-50 border-t border-gray-200">
                    <div className="px-6 py-3">
                      <h5 className="text-sm font-semibold text-gray-700 mb-3">
                        Sub-industries ({(employer.level || 2) + 1}-digit NAICS) - Sorted by {getMetricLabel()}
                      </h5>
                      <div className="space-y-2">
                        {sortedSubIndustries.map((subIndustry, subIndex) => {
                          const subMetricValue = getMetricValue(subIndustry);
                          const canExpand = (subIndustry.level || 3) < 4; // Allow expansion up to 4-digit codes
                          
                          return (
                            <div key={`${subIndustry.naicsCode}-${subIndex}`} className="py-2 px-3 bg-white rounded-lg">
                              <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded font-mono">
                                    {subIndustry.naicsCode}
                                  </span>
                                  <span className="text-sm font-medium text-gray-800">
                                    {subIndustry.industry.includes(' - ') 
                                      ? subIndustry.industry.split(' - ')[1] 
                                      : subIndustry.industry}
                                  </span>
                                  {canExpand && (
                                    <button
                                      onClick={() => onExpandIndustry(subIndustry.naicsCode, state, county)}
                                      disabled={subIndustry.isLoadingSubIndustries}
                                      className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                                    >
                                      {subIndustry.isLoadingSubIndustries ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : expandedIndustries.has(subIndustry.naicsCode) ? (
                                        <>
                                          <ChevronDown className="w-3 h-3 inline mr-1" />
                                          Expand
                                        </>
                                      ) : (
                                        <>
                                          <ChevronRight className="w-3 h-3 inline mr-1" />
                                          Expand
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-1">
                                  {getMetricIcon()}
                                  <span className="font-medium">
                                    {formatMetricValue(subMetricValue)}
                                  </span>
                                </div>
                                <span className="text-gray-500">
                                  {getMetricPercentage(subMetricValue).toFixed(1)}%
                                </span>
                              </div>
                              </div>
                              
                              {/* Nested sub-sub-industries (4-digit codes) */}
                              {expandedIndustries.has(subIndustry.naicsCode) && subIndustry.subIndustries && subIndustry.subIndustries.length > 0 && (
                                <div className="mt-2 ml-4 space-y-1">
                                  {subIndustry.subIndustries.map((subSubIndustry, subSubIndex) => {
                                    const subSubMetricValue = getMetricValue(subSubIndustry);
                                    return (
                                      <div key={`${subSubIndustry.naicsCode}-${subSubIndex}`} className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded text-xs">
                                        <div className="flex items-center gap-2">
                                          <span className="bg-gray-300 text-gray-700 px-1 py-0.5 rounded font-mono text-xs">
                                            {subSubIndustry.naicsCode}
                                          </span>
                                          <span className="text-gray-700">
                                            {subSubIndustry.industry.includes(' - ') 
                                              ? subSubIndustry.industry.split(' - ')[1] 
                                              : subSubIndustry.industry}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-gray-800">
                                            {formatMetricValue(subSubMetricValue)}
                                          </span>
                                          <span className="text-gray-500">
                                            {getMetricPercentage(subSubMetricValue).toFixed(1)}%
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
          );
          })}
        </div>
      </div>
    </div>
  );
};