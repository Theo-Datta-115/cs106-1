import { CensusDataPoint, ProcessedEmployerData, ApiError } from '../types/census';
import { NAICSApiService } from './naicsApi';

const BASE_URL = 'https://api.census.gov/data/2022/cbp';

export class CensusApiService {
  private apiKey: string;

  // 2-digit NAICS codes for major industry sectors
  private readonly naicsCodes = [
    '11', // Agriculture, Forestry, Fishing and Hunting
    '21', // Mining, Quarrying, and Oil and Gas Extraction
    '22', // Utilities
    '23', // Construction
    '31', // Manufacturing (31-33)
    '32', // Manufacturing (31-33)
    '33', // Manufacturing (31-33)
    '42', // Wholesale Trade
    '44', // Retail Trade (44-45)
    '45', // Retail Trade (44-45)
    '48', // Transportation and Warehousing (48-49)
    '49', // Transportation and Warehousing (48-49)
    '51', // Information
    '52', // Finance and Insurance
    '53', // Real Estate and Rental and Leasing
    '54', // Professional, Scientific, and Technical Services
    '55', // Management of Companies and Enterprises
    '56', // Administrative and Support and Waste Management
    '61', // Educational Services
    '62', // Health Care and Social Assistance
    '71', // Arts, Entertainment, and Recreation
    '72', // Accommodation and Food Services
    '81', // Other Services (except Public Administration)
    '92'  // Public Administration
  ];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchEmploymentDataForZip(zipCode: string): Promise<ProcessedEmployerData[]> {
    try {
      // First, get the county for this ZIP code
      const county = await this.getCountyFromZip(zipCode);
      if (!county) {
        throw new Error(`Could not find county for ZIP code ${zipCode}`);
      }

      console.log(`Found county: ${county.name} (${county.state}:${county.county})`);

      // Fetch both sector data and county totals
      const [sectorData, countyTotals] = await Promise.all([
        this.fetchEmploymentByCounty(county.state, county.county, zipCode),
        this.fetchCountyTotals(county.state, county.county, zipCode)
      ]);

      // Add county totals to each sector for percentage calculations
      return sectorData.map(sector => ({
        ...sector,
        countyTotalEmployees: countyTotals.employees,
        countyTotalEstablishments: countyTotals.establishments,
        countyTotalPayroll: countyTotals.payroll
      }));
    } catch (error) {
      throw new ApiError(`Failed to fetch employment data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getCountyFromZip(zipCode: string): Promise<{state: string, county: string, name: string} | null> {
    try {
      return await this.countyFromZip_viaHUD(zipCode);
    } catch (error) {
      console.error(`HUD API method failed for ZIP ${zipCode}:`, error);
      return this.getCountyFallback(zipCode);
    }
  }

  private async countyFromZip_viaHUD(zip: string): Promise<{state: string, county: string, name: string} | null> {
    const z = (zip || "").replace(/\D/g, "").padStart(5, "0").slice(0, 5);

    console.log(`Looking up county for ZIP ${z} using HUD API`);

    const hudURL = `https://www.huduser.gov/hudapi/public/usps?type=2&query=${z}`;

    console.log(`Fetching county data from HUD API: ${hudURL}`);

    const hudRes = await fetch(hudURL, { 
      headers: { 
        "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI2IiwianRpIjoiMjdiNzY2YWY2MzRkNGYxNWJkZjI3YjhjZGQ4MDZmOTg1OGRjODhmYmUzYzU5ZjE5ZGQwZWMzNWQ5YTg5ZTYzNWFhNzQ0MmFhMjA3OWJjMDQiLCJpYXQiOjE3NTczMDgyNzYuMTkxNTQ5LCJuYmYiOjE3NTczMDgyNzYuMTkxNTUxLCJleHAiOjIwNzI4NDEwNzYuMTg1NjMyLCJzdWIiOiIxMDgzMjAiLCJzY29wZXMiOltdfQ.FGIvAWcNJ_V97VPCNmg-N9VTKRZzr7SOMe68wWqTBRmmVYZ-z3kOZVhYVIjyKhMBr3OI1M9HR3iie__EYEu5Dw"
      }
    });
    const hudTxt = await hudRes.text();
    
    console.log(`HUD response status: ${hudRes.status}`);
    console.log(`HUD response: ${hudTxt.slice(0, 200)}...`);
    
    if (!hudRes.ok) {
      throw new Error(`HUD API query failed: ${hudRes.status} ${hudTxt.slice(0, 200)}`);
    }
    
    const hudData = JSON.parse(hudTxt);
    const hudResult = hudData?.data?.results?.[0];
    
    if (!hudResult) {
      console.log(`No results found for ZIP ${z} in HUD API`);
      console.log(`HUD response structure:`, Object.keys(hudData));
      throw new Error(`ZIP code ${z} not found in HUD database.`);
    }

    console.log(`HUD result:`, hudResult);
    
    // Extract FIPS codes from geoid field
    const geoid = hudResult.geoid;
    const countyName = hudResult.county_name;
    const stateName = hudResult.state_name;
    
    if (!geoid || geoid.length !== 5) {
      console.log(`Invalid or missing geoid in HUD response: geoid=${geoid}`);
      throw new Error(`Could not determine county FIPS codes for ZIP ${z}`);
    }

    // Parse FIPS codes from 5-digit geoid (first 2 digits = state, last 3 digits = county)
    const stateFips = geoid.substring(0, 2);
    const countyFips = geoid.substring(2, 5);

    const result = {
      state: stateFips,
      county: countyFips,
      name: `${countyName}, ${stateName}`
    };
    
    console.log(`Successfully found county via HUD API:`, result);
    return result;
  }

  private getCountyFallback(zipCode: string): {state: string, county: string, name: string} | null {
    // Hardcoded mapping for common ZIP codes as fallback
    const zipToCounty: Record<string, {state: string, county: string, name: string}> = {
      // Massachusetts
      '02459': { state: '25', county: '017', name: 'Middlesex County, MA' }, // Newton, MA
      '02138': { state: '25', county: '017', name: 'Middlesex County, MA' }, // Cambridge, MA
      '02115': { state: '25', county: '025', name: 'Suffolk County, MA' }, // Boston, MA
      '02101': { state: '25', county: '025', name: 'Suffolk County, MA' }, // Boston, MA
      '02116': { state: '25', county: '025', name: 'Suffolk County, MA' }, // Boston, MA
      '02134': { state: '25', county: '025', name: 'Suffolk County, MA' }, // Allston, MA
      
      // New York
      '10001': { state: '36', county: '061', name: 'New York County, NY' }, // Manhattan, NY
      '10002': { state: '36', county: '061', name: 'New York County, NY' }, // Manhattan, NY
      '10003': { state: '36', county: '061', name: 'New York County, NY' }, // Manhattan, NY
      '11201': { state: '36', county: '047', name: 'Kings County, NY' }, // Brooklyn, NY
      
      // California
      '90210': { state: '06', county: '037', name: 'Los Angeles County, CA' }, // Beverly Hills, CA
      '90211': { state: '06', county: '037', name: 'Los Angeles County, CA' }, // Beverly Hills, CA
      '94102': { state: '06', county: '075', name: 'San Francisco County, CA' }, // San Francisco, CA
      '94103': { state: '06', county: '075', name: 'San Francisco County, CA' }, // San Francisco, CA
      
      // Illinois
      '60601': { state: '17', county: '031', name: 'Cook County, IL' }, // Chicago, IL
      '60602': { state: '17', county: '031', name: 'Cook County, IL' }, // Chicago, IL
      '60603': { state: '17', county: '031', name: 'Cook County, IL' }, // Chicago, IL
      
      // Texas
      '77001': { state: '48', county: '201', name: 'Harris County, TX' }, // Houston, TX
      '75201': { state: '48', county: '113', name: 'Dallas County, TX' }, // Dallas, TX
      
      // Florida
      '33101': { state: '12', county: '086', name: 'Miami-Dade County, FL' }, // Miami, FL
      '33102': { state: '12', county: '086', name: 'Miami-Dade County, FL' }, // Miami, FL
      
      // Washington
      '98101': { state: '53', county: '033', name: 'King County, WA' }, // Seattle, WA
      '98102': { state: '53', county: '033', name: 'King County, WA' }, // Seattle, WA
      
      // Maryland
      '20810': { state: '24', county: '031', name: 'Montgomery County, MD' }, // Bethesda, MD
    };
    
    console.log(`Using fallback mapping for ZIP ${zipCode}`);
    return zipToCounty[zipCode] || null;
  }

  private async fetchCountyTotals(state: string, county: string, originalZip: string): Promise<{employees: number, establishments: number, payroll: number}> {
    const url = `${BASE_URL}?get=NAME,EMP,ESTAB,PAYANN&for=county:${county}&in=state:${state}&NAICS2017=00&key=${this.apiKey}`;
    
    console.log(`Fetching county totals for county ${county}, state ${state}`);
    console.log(`County totals URL: ${url}`);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Error fetching county totals:`, response.status);
        return { employees: 0, establishments: 0, payroll: 0 };
      }

      const responseText = await response.text();
      console.log(`County totals response:`, responseText);
      
      if (!responseText.trim()) {
        return { employees: 0, establishments: 0, payroll: 0 };
      }
      
      const data = JSON.parse(responseText);
      if (!Array.isArray(data) || data.length < 2) {
        return { employees: 0, establishments: 0, payroll: 0 };
      }

      const row = data[1]; // Skip header
      return {
        employees: this.parseEmployeeCount(row[1]), // EMP
        establishments: this.parseEmployeeCount(row[2]), // ESTAB
        payroll: this.parsePayroll(row[3]) // PAYANN
      };
    } catch (error) {
      console.error(`Error fetching county totals:`, error);
      return { employees: 0, establishments: 0, payroll: 0 };
    }
  }

  private async fetchEmploymentByCounty(state: string, county: string, originalZip: string): Promise<ProcessedEmployerData[]> {
    const results: ProcessedEmployerData[] = [];
    
    console.log(`Fetching employment data for county ${county} in state ${state}`);
    
    for (const naicsCode of this.naicsCodes) {
      try {
        const sectorData = await this.fetchCountySectorData(state, county, naicsCode, originalZip);
        results.push(...sectorData);
      } catch (error) {
        console.error(`Error fetching NAICS ${naicsCode}:`, error);
        // Continue with other sectors even if one fails
      }
    }
    
    // Filter out items with no data and sort by employees
    return results
      .filter(item => item.employees > 0 || item.establishments > 0 || item.payroll > 0)
      .sort((a, b) => b.employees - a.employees);
  }

  private async fetchCountySectorData(state: string, county: string, naicsCode: string, originalZip: string): Promise<ProcessedEmployerData[]> {
    const url = `${BASE_URL}?get=NAME,NAICS2017_LABEL,EMP,ESTAB,PAYANN,GEO_ID&for=county:${county}&in=state:${state}&NAICS2017=${naicsCode}&key=${this.apiKey}`;
    
    console.log(`Fetching data for NAICS ${naicsCode}: ${url}`);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Error fetching NAICS ${naicsCode}:`, response.status);
        return [];
      }

      const responseText = await response.text();
      console.log(`NAICS ${naicsCode} response:`, responseText);
      
      if (!responseText.trim()) {
        return [];
      }
      
      const data = JSON.parse(responseText);
      if (!Array.isArray(data) || data.length < 2) {
        return [];
      }

      const results: ProcessedEmployerData[] = [];
      
      // Skip header row (index 0)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const employees = this.parseEmployeeCount(row[2]); // EMP
        const establishments = this.parseEmployeeCount(row[3]); // ESTAB
        const payroll = this.parsePayroll(row[4]); // PAYANN
        
        if (employees > 0 || establishments > 0 || payroll > 0) {
          results.push({
            industry: row[1] || `NAICS ${naicsCode}`, // NAICS2017_LABEL
            employees,
            establishments,
            payroll,
            naicsCode,
            location: row[0] || 'Unknown Location', // NAME
            geoId: row[5] || '', // GEO_ID
            level: naicsCode.length
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error processing NAICS ${naicsCode}:`, error);
      return [];
    }
  }

  async fetchSubIndustries(state: string, county: string, parentNaicsCode: string, originalZip: string): Promise<ProcessedEmployerData[]> {
    console.log(`Fetching sub-industries for NAICS ${parentNaicsCode} in county ${county}, state ${state}`);
    
    try {
      // Get child NAICS codes from the API service
      const childCodes = await NAICSApiService.getChildCodes(parentNaicsCode);
      console.log(`Found ${childCodes.length} child codes for ${parentNaicsCode}:`, childCodes.map(c => c.code));
      
      if (childCodes.length === 0) {
        console.log(`No child codes found for ${parentNaicsCode}`);
        return [];
      }

      const results: ProcessedEmployerData[] = [];
      
      // Fetch data for each child code
      for (const childCode of childCodes) {
        try {
          const childData = await this.fetchCountySectorData(state, county, childCode.code, originalZip);
          results.push(...childData.map(item => ({
            ...item,
            level: childCode.code.length
          })));
        } catch (error) {
          console.error(`Error fetching child NAICS ${childCode.code}:`, error);
          // Continue with other child codes
        }
      }
      
      console.log(`Found ${results.length} sub-industries with data for ${parentNaicsCode}`);
      
      return results
        .filter(item => item.employees > 0 || item.establishments > 0 || item.payroll > 0)
        .sort((a, b) => b.employees - a.employees);
        
    } catch (error) {
      console.error(`Error fetching sub-industries for ${parentNaicsCode}:`, error);
      return [];
    }
  }

  private parseEmployeeCount(value: string): number {
    if (!value || value === 'null' || value === 'N' || value === 'D' || value === 'S') {
      return 0;
    }
    
    const num = parseInt(value, 10);
    return isNaN(num) ? 0 : num;
  }

  private parsePayroll(value: string): number {
    if (!value || value === 'null' || value === 'N' || value === 'D' || value === 'S') {
      return 0;
    }
    
    // Payroll is in thousands of dollars
    const num = parseInt(value, 10);
    return isNaN(num) ? 0 : num * 1000;
  }
}