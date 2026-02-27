export interface RFPSection {
  section_title: string;
  page_range: string;
  content_summary: string;
  relevance_reason: string;
}

export interface EligibilityCriterion {
  criterion: string;
  passed: boolean;
  detail: string;
}

export interface TechnicalScore {
  category: string;
  score: number;
  max_score: number;
  justification: string;
}

export interface MissingDeliverable {
  deliverable: string;
  rfp_clause: string;
  page_number: string;
}

export interface VendorResult {
  name: string;
  eligibility: EligibilityCriterion[];
  technical_scores: TechnicalScore[];
  total_technical_score: number;
  missing_deliverables: MissingDeliverable[];
  strengths: string[];
  risks: string[];
  rfp_citations: RFPSection[];
}

export interface AnalysisResult {
  winner: string;
  vendors: VendorResult[];
}
