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
}
console.log(JSON.stringify(report,null,2));
if(!report.passed) process.exitCode=1;
