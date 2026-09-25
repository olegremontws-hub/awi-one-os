# VS-001 — Project Intake

## Goal
Prove the AWI-ONE-OS execution core end-to-end with one project-centric workflow.

## Flow
1. Create Project.
2. Upload source document.
3. Store file and metadata.
4. Emit `PROJECT_DOCUMENT_UPLOADED`.
5. D-024 selects the intake workflow.
6. Document Intelligence extracts structured facts.
7. Agent Runtime invokes the required intake roles.
8. Build a decision card for the Round Table.
9. Apply Human Gate when required.
10. Persist decision, evidence, execution state, audit trail, and memory.

## Initial runtime roles
- Project Intake Coordinator
- Document Intelligence Agent
- Requirements Analyst
- Risk Triage Agent
- Executive Decision Briefing Agent
- Audit & Decision Recorder

## Definition of Done
A user can create a project, attach a document, observe processing status, receive a structured decision card, approve/reject when a Human Gate is raised, and inspect the immutable history of the workflow.
