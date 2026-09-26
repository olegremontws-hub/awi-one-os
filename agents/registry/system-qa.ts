export const SYSTEM_QA_AGENTS = [{
  id: 'QA-CLIENT-001',
  name: 'Client Journey Tester',
  layer: 'system_qa',
  mission: 'Validate AWI ONE from the client perspective using isolated synthetic projects.',
  decisionRights: ['create_test_project','upload_test_document','read_test_round_table','submit_test_h2'],
  prohibitedActions: ['production_data_write','approve_h3','perform_h4','external_communication','financial_action','legal_signature'],
  evidenceRequired: true,
  releaseBlocking: true,
}] as const;
