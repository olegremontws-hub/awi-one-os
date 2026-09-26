# VS-002 — Document & Contract Intelligence

## Canonical flow

Document → Version → Evidence → Fact → Relation → WorkItem → Quantity → PriceEvidence → EstimateItem → ContractItem → Obligation → Execution → Acceptance → Invoice → Payment.

The model deliberately separates extracted facts from verified evidence and separates quantities from price evidence. Missing prices remain unverified/missing; AI agents must not invent them.

## First data-model slice

Migration 0007 introduces versioned document evidence, extracted facts, document relations, work items, estimates, price evidence, contracts, contract items and obligations. TypeScript contracts mirror the domain boundary.

This is the foundation for Format Registry, OCR/parser gateway, quantity extraction, estimate calculation, contract comparison and AI Document Factory. Customer documents are acceptance inputs outside the repository; CI uses synthetic data only.
