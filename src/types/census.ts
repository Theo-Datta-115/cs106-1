export interface CensusDataPoint {
  NAICS2022_LABEL: string;
  EMP: string;
  ESTAB: string;
  PAYANN: string;
  NAME: string;
  GEO_ID: string;
  NAICS2022: string;
}

export interface ProcessedEmployerData {
  industry: string;
  employees: number;
  establishments: number;
  payroll: number;
  naicsCode: string;
  location: string;
  geoId: string;
  countyTotalEmployees?: number;
  countyTotalEstablishments?: number;
  countyTotalPayroll?: number;
  subIndustries?: ProcessedEmployerData[];
  isExpanded?: boolean;
  isLoadingSubIndustries?: boolean;
  level?: number; // Track the NAICS level (2, 3, 4, etc.)
}

export type MetricType = 'employees' | 'establishments' | 'payroll';

export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}