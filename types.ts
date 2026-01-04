export interface Organization {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
}

export interface Company {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: any;
  updatedAt: any;
}

export interface InvestmentScore {
  "Business Model & Traction": number;
  "Competitive Advantage": number;
  "Market Opportunity": number;
  "Presentation & Storytelling": number;
  "Problem and Solution": number;
  "Team": number;
}

export interface InvestmentData {
  "Document ID": string;
  companyName: string;
  organization: string;
  investorName: string;
  lastUpdatedBy?: string;
  overallComment: string;
  projectId: number;
  scores: InvestmentScore;
  submissionTimestamp: string;
  // Keep these for backward compatibility/internal mapping if needed
  organizationId?: string;
  confidenceLevel?: number;
  investmentAmount?: number;
  rationaleTags?: string[];
}

export interface CompanyInvestmentSummary {
  rank: number;
  companyName: string;
  totalInvestment: number;
}