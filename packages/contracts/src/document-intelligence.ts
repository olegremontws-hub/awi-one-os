export type DocumentKind =
  | 'contract' | 'additional_agreement' | 'specification' | 'estimate' | 'commercial_offer'
  | 'invoice' | 'payment_request' | 'rfq' | 'purchase_order' | 'delivery_note' | 'act'
  | 'ks2' | 'ks3' | 'technical_specification' | 'technical_conditions'
  | 'design_documentation' | 'working_documentation' | 'drawing' | 'bim_model'
  | 'work_volume_sheet' | 'executive_document' | 'inspection_act' | 'ncr' | 'claim'
  | 'letter' | 'meeting_minutes' | 'schedule' | 'photo_report' | 'other';

export type EvidenceLocator = {
  documentId: string;
  documentVersionId: string;
  page?: number;
  sheet?: string;
  cellRange?: string;
  bbox?: [number, number, number, number];
  quote?: string;
};

export type ExtractedFact = {
  id: string; projectId: string; factType: string; value: unknown; unit?: string;
  confidence?: number; evidenceIds: string[]; status: 'extracted'|'verified'|'rejected';
};

export type WorkItem = {
  id: string; projectId: string; workPackageId?: string; code?: string; name: string;
  description?: string; unit?: string; plannedQuantity?: number; completedQuantity?: number;
  designRef?: string; technicalConditionRef?: string; evidenceIds: string[];
};

export type PriceEvidence = {
  id: string; projectId: string; sourceType: 'supplier_quote'|'contract'|'purchase_history'|'price_list'|'normative'|'manual';
  amount: number; currency: string; priceDate: string; sourceDocumentId?: string; evidenceIds: string[];
  status: 'unverified'|'verified'|'expired'|'rejected';
};

export type EstimateItem = {
  id: string; estimateId: string; workItemId: string; quantity: number; unit: string;
  laborAmount?: number; materialAmount?: number; equipmentAmount?: number; logisticsAmount?: number;
  subcontractAmount?: number; overheadAmount?: number; riskAmount?: number; vatAmount?: number;
  totalAmount: number; priceEvidenceIds: string[]; evidenceIds: string[];
};

export type ContractItem = {
  id: string; contractId: string; workItemId?: string; code?: string; name: string;
  quantity?: number; unit?: string; unitPrice?: number; amount?: number; currency: string;
  evidenceIds: string[]; version: number;
};

export type Obligation = {
  id: string; contractId: string; contractItemId?: string; obligatedPartyId?: string;
  obligationType: string; description: string; dueAt?: string; status: 'planned'|'active'|'fulfilled'|'breached'|'cancelled';
  evidenceIds: string[];
};

export type DocumentRelationType =
  | 'supersedes'|'amends'|'attachment_to'|'derived_from'|'supports'|'contradicts'
  | 'prices'|'accepts'|'invoices'|'pays'|'specifies'|'requires';
