import { HttpClientTestDriver } from './http-driver.js';
import { runClientJourney } from './journey.js';

const baseUrl=process.env.AWI_TEST_BASE_URL ?? 'http://127.0.0.1:3001';
const driver=new HttpClientTestDriver(baseUrl);
const report=await runClientJourney(driver);
if(report.passed){
  const project=await driver.createProject();
  const malformed=await driver.uploadMalformedPdf(project.id);
  if(malformed.status!==422 || malformed.body?.error!=='PDF_EXTRACTION_FAILED') throw new Error('CLIENT_QA_MALFORMED_PDF_CONTRACT_FAILED');
  const unsupported=await driver.uploadUnsupported(project.id);
  if(unsupported.status!==422 || !String(unsupported.body?.error??'').startsWith('UNSUPPORTED_DOCUMENT_TYPE:')) throw new Error('CLIENT_QA_UNSUPPORTED_DOCUMENT_CONTRACT_FAILED');
  const idempotencyProject=await driver.createProject();
  const correlation=`qa-repeat-${Date.now()}`;
  const repeatFixture=`Repeated upload fixture ${correlation}`;
  const first=await driver.uploadDocumentWithCorrelation(idempotencyProject.id,correlation,repeatFixture);
  const second=await driver.uploadDocumentWithCorrelation(idempotencyProject.id,correlation,repeatFixture);
  if(second?.duplicate!==true) throw new Error('CLIENT_QA_REPEAT_UPLOAD_NOT_IDEMPOTENT');
  const firstId=first?.document?.documentId ?? first?.document?.id;
  const secondId=second?.document?.documentId ?? second?.document?.id;
  if(!firstId || !secondId || firstId!==secondId) throw new Error('CLIENT_QA_REPEAT_UPLOAD_CHANGED_DOCUMENT');
  const history=await driver.history(idempotencyProject.id);
  if(!Array.isArray(history) || history.some((event:any)=>!event.eventId || !event.type || !event.occurredAt)) throw new Error('CLIENT_QA_HISTORY_CONTRACT_FAILED');
  const correlated=history.filter((event:any)=>event.correlationId===correlation);
  if(correlated.length===0) throw new Error('CLIENT_QA_HISTORY_CORRELATION_MISSING');
}
console.log(JSON.stringify(report,null,2));
if(!report.passed) process.exitCode=1;
