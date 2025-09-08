export interface NAICSCode {
  code: string;
  title: string;
  description?: string;
}

export class NAICSApiService {
  private static readonly BASE_URL = 'https://www.census.gov/naics/resources/model/dataHandler.php';
  
  // Cache to avoid repeated API calls
  private static cache = new Map<string, NAICSCode[]>();

  static async fetchNAICSCodes(year: string = '2022'): Promise<NAICSCode[]> {
    const cacheKey = `all-${year}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Try the chart method first
      let codes = await this.tryChartMethod(year);
      
      // If chart method fails, try sweep method
      if (codes.length === 0) {
        codes = await this.sweepSearchMethod(year);
      }
      
      // If both fail, use fallback
      if (codes.length === 0) {
        console.warn('Both NAICS fetching methods failed, using fallback data');
        codes = this.getFallbackNAICSCodes();
      }
      
      this.cache.set(cacheKey, codes);
      return codes;
    } catch (error) {
      console.error('Error fetching NAICS codes:', error);
      const fallbackData = this.getFallbackNAICSCodes();
      this.cache.set(cacheKey, fallbackData);
      return fallbackData;
    }
  }

  private static async tryChartMethod(year: string): Promise<NAICSCode[]> {
    try {
      const params = new URLSearchParams({
        search: year,
        input: '',
        chart: 'chart'
      });
      
      const response = await fetch(`${this.BASE_URL}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'naics-collector/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const codes = new Set<string>();
      const titles: Record<string, string> = {};
      
      const result = data.result;
      let iterItems: any[] = [];
      
      if (typeof result === 'object' && result !== null) {
        if (Array.isArray(result)) {
          iterItems = result;
        } else {
          iterItems = Object.values(result);
        }
      }
      
      for (const item of iterItems) {
        if (typeof item === 'object' && item !== null) {
          const code = (item.code || item.naics22 || '').toString().trim();
          const title = (item.title || item.index_desc || '').toString().trim();
          
          if (/^\d{2}$/.test(code)) {
            codes.add(code);
            if (title) {
              titles[code] = title;
            }
          }
        }
      }
      
      return Array.from(codes).sort().map(code => ({
        code,
        title: titles[code] || `NAICS ${code}`
      }));
    } catch (error) {
      console.error('Chart method failed:', error);
      return [];
    }
  }

  private static async sweepSearchMethod(year: string): Promise<NAICSCode[]> {
    const seeds = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
    const codes = new Map<string, string>(); // code -> title
    
    for (const seed of seeds) {
      try {
        const params = new URLSearchParams({
          search: year,
          input: seed
        });
        
        const response = await fetch(`${this.BASE_URL}?${params}`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'naics-collector/1.0'
          }
        });
        
        if (!response.ok) {
          continue;
        }
        
        const data = await response.json();
        const result = data.result || {};
        
        let records: any[] = [];
        if (typeof result === 'object' && result !== null) {
          if (Array.isArray(result)) {
            records = result;
          } else {
            records = Object.values(result);
          }
        }
        
        for (const rec of records) {
          if (typeof rec === 'object' && rec !== null) {
            const code = (rec.naics22 || '').toString().trim();
            const title = (rec.title || rec.index_desc || '').toString().trim();
            
            if (/^\d{2}$/.test(code)) {
              if (!codes.has(code) && title) {
                codes.set(code, title);
              } else if (!codes.has(code)) {
                codes.set(code, `NAICS ${code}`);
              }
            }
          }
        }
      } catch (error) {
        // Continue with next seed
        continue;
      }
    }
    
    return Array.from(codes.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, title]) => ({ code, title }));
  }

  static async get2DigitCodes(): Promise<Record<string, string>> {
    try {
      const allCodes = await this.fetchNAICSCodes();
      const twoDigitCodes = allCodes
        .filter(d => d.code.length === 2)
        .reduce((acc, d) => {
          acc[d.code] = d.title;
          return acc;
        }, {} as Record<string, string>);
      
      console.log('2-digit NAICS codes:', twoDigitCodes);
      return twoDigitCodes;
    } catch (error) {
      console.error('Error getting 2-digit codes:', error);
      return this.getFallback2DigitCodes();
    }
  }

  static async getChildCodes(parentCode: string): Promise<NAICSCode[]> {
    const cacheKey = `children-${parentCode}`;
    
    if (this.cache.has(cacheKey)) {
      console.log(`Using cached child codes for ${parentCode}:`, this.cache.get(cacheKey));
      return this.cache.get(cacheKey)!;
    }

    try {
      // Dynamically search for children of the parent code
      const children = await this.searchChildCodes(parentCode);
      console.log(`Found ${children.length} child codes for ${parentCode}:`, children.map(c => c.code));
      
      this.cache.set(cacheKey, children);
      return children;
    } catch (error) {
      console.error(`Error getting child codes for ${parentCode}:`, error);
      return this.getFallbackChildCodes(parentCode);
    }
  }

  private static async searchChildCodes(parentCode: string): Promise<NAICSCode[]> {
    console.log(`🔍 Searching for children of NAICS code: ${parentCode}`);
    
    const targetLength = parentCode.length + 1;
    const codes = new Map<string, string>();
    
    // Try multiple search strategies
    const searchStrategies = [
      // Strategy 1: Search with parent code directly
      parentCode,
      // Strategy 2: Search with parent code + wildcard patterns
      `${parentCode}*`,
      `${parentCode}0`,
      `${parentCode}1`,
      // Strategy 3: Try broader searches
      parentCode.substring(0, 2), // Go back to 2-digit for 3-digit searches
    ];
    
    for (const searchTerm of searchStrategies) {
      console.log(`🔍 Trying search term: "${searchTerm}"`);
      
      try {
        // Try the Census NAICS API
        const params = new URLSearchParams({
          search: '2022',
          input: searchTerm
        });
        
        const url = `/census-naics-api/naics/resources/model/dataHandler.php?${params}`;
        console.log(`📡 Fetching: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'naics-collector/1.0'
          }
        });
        
        console.log(`📡 Response status: ${response.status}`);
        
        if (!response.ok) {
          console.log(`❌ Request failed with status ${response.status}`);
          continue;
        }
        
        const responseText = await response.text();
        console.log(`📄 Raw response: ${responseText.substring(0, 200)}...`);
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.log(`❌ JSON parse error:`, parseError);
          continue;
        }
        
        console.log(`📊 Parsed data structure:`, Object.keys(data));
        
        const result = data.result || {};
        console.log(`📊 Result structure:`, typeof result, Array.isArray(result) ? `Array[${result.length}]` : Object.keys(result));
        
        let records: any[] = [];
        if (typeof result === 'object' && result !== null) {
          if (Array.isArray(result)) {
            records = result;
          } else {
            records = Object.values(result);
          }
        }
        
        console.log(`📊 Processing ${records.length} records`);
        
        for (const rec of records) {
          if (typeof rec === 'object' && rec !== null) {
            const code = (rec.naics22 || rec.code || '').toString().trim();
            const title = (rec.title || rec.index_desc || rec.description || '').toString().trim();
            
            console.log(`🔍 Checking record: code="${code}", title="${title}"`);
            
            // Check if this code is a direct child of the parent
            if (code.length === targetLength && 
                code.startsWith(parentCode) && 
                /^\d+$/.test(code)) {
              
              console.log(`✅ Found child code: ${code} - ${title}`);
              
              if (!codes.has(code)) {
                codes.set(code, title || `NAICS ${code}`);
              }
            }
          }
        }
        
        // If we found some codes with this search term, we can stop
        if (codes.size > 0) {
          console.log(`✅ Found ${codes.size} children with search term "${searchTerm}"`);
          break;
        }
        
      } catch (error) {
        console.log(`❌ Error with search term "${searchTerm}":`, error);
        continue;
      }
    }
    
    console.log(`🎯 Final result: Found ${codes.size} children for ${parentCode}`);
    
    if (codes.size === 0) {
      console.log(`❌ No children found for ${parentCode} - this might be a leaf node or the API might not have this data`);
      return [];
    }
    
    const result = Array.from(codes.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, title]) => ({ code, title }));
    
    console.log(`🎯 Returning children:`, result);
    return result;
  }

  static async getCodeDescription(code: string): Promise<string> {
    try {
      const allCodes = await this.fetchNAICSCodes();
      const found = allCodes.find(c => c.code === code);
      return found ? found.title : `NAICS ${code}`;
    } catch (error) {
      console.error(`Error getting description for ${code}:`, error);
      return `NAICS ${code}`;
    }
  }

  // Fallback data in case the API is unavailable
  private static getFallbackNAICSCodes(): NAICSCode[] {
    return [
      // 2-digit codes
      { code: '11', title: 'Agriculture, Forestry, Fishing and Hunting' },
      { code: '21', title: 'Mining, Quarrying, and Oil and Gas Extraction' },
      { code: '22', title: 'Utilities' },
      { code: '23', title: 'Construction' },
      { code: '31', title: 'Manufacturing' },
      { code: '32', title: 'Manufacturing' },
      { code: '33', title: 'Manufacturing' },
      { code: '42', title: 'Wholesale Trade' },
      { code: '44', title: 'Retail Trade' },
      { code: '45', title: 'Retail Trade' },
      { code: '48', title: 'Transportation and Warehousing' },
      { code: '49', title: 'Transportation and Warehousing' },
      { code: '51', title: 'Information' },
      { code: '52', title: 'Finance and Insurance' },
      { code: '53', title: 'Real Estate and Rental and Leasing' },
      { code: '54', title: 'Professional, Scientific, and Technical Services' },
      { code: '55', title: 'Management of Companies and Enterprises' },
      { code: '56', title: 'Administrative and Support and Waste Management' },
      { code: '61', title: 'Educational Services' },
      { code: '62', title: 'Health Care and Social Assistance' },
      { code: '71', title: 'Arts, Entertainment, and Recreation' },
      { code: '72', title: 'Accommodation and Food Services' },
      { code: '81', title: 'Other Services (except Public Administration)' },
      { code: '92', title: 'Public Administration' },
      
      // 3-digit codes for common sectors
      { code: '621', title: 'Ambulatory Health Care Services' },
      { code: '622', title: 'Hospitals' },
      { code: '623', title: 'Nursing and Residential Care Facilities' },
      { code: '624', title: 'Social Assistance' },
      { code: '611', title: 'Educational Services' },
      { code: '541', title: 'Professional, Scientific, and Technical Services' },
      { code: '722', title: 'Food Services and Drinking Places' },
      { code: '721', title: 'Accommodation' },
      { code: '236', title: 'Construction of Buildings' },
      { code: '237', title: 'Heavy and Civil Engineering Construction' },
      { code: '238', title: 'Specialty Trade Contractors' },
      { code: '441', title: 'Motor Vehicle and Parts Dealers' },
      { code: '445', title: 'Food and Beverage Stores' },
      { code: '452', title: 'General Merchandise Stores' },
      { code: '561', title: 'Administrative and Support Services' },
      { code: '562', title: 'Waste Management and Remediation Services' },
      { code: '311', title: 'Food Manufacturing' },
      { code: '332', title: 'Fabricated Metal Product Manufacturing' },
      { code: '333', title: 'Machinery Manufacturing' },
      { code: '334', title: 'Computer and Electronic Product Manufacturing' },
      { code: '484', title: 'Truck Transportation' },
      { code: '493', title: 'Warehousing and Storage' },
      { code: '522', title: 'Credit Intermediation and Related Activities' },
    ];
  }

  private static getFallback2DigitCodes(): Record<string, string> {
    return {
      '11': 'Agriculture, Forestry, Fishing and Hunting',
      '21': 'Mining, Quarrying, and Oil and Gas Extraction',
      '22': 'Utilities',
      '23': 'Construction',
      '31': 'Manufacturing',
      '32': 'Manufacturing',
      '33': 'Manufacturing',
      '42': 'Wholesale Trade',
      '44': 'Retail Trade',
      '45': 'Retail Trade',
      '48': 'Transportation and Warehousing',
      '49': 'Transportation and Warehousing',
      '51': 'Information',
      '52': 'Finance and Insurance',
      '53': 'Real Estate and Rental and Leasing',
      '54': 'Professional, Scientific, and Technical Services',
      '55': 'Management of Companies and Enterprises',
      '56': 'Administrative and Support and Waste Management',
      '61': 'Educational Services',
      '62': 'Health Care and Social Assistance',
      '71': 'Arts, Entertainment, and Recreation',
      '72': 'Accommodation and Food Services',
      '81': 'Other Services (except Public Administration)',
      '92': 'Public Administration'
    };
  }

  private static getFallbackChildCodes(parentCode: string): NAICSCode[] {
    // No fallback - we want to rely on dynamic search only
    console.log(`❌ No fallback available for ${parentCode}`);
    return [];
  }
}