import { HttpClientTestDriver } from './http-driver.js';
import { runClientJourney } from './journey.js';

const baseUrl=process.env.AWI_TEST_BASE_URL ?? 'http://127.0.0.1:3001';
const report=await runClientJourney(new HttpClientTestDriver(baseUrl));
console.log(JSON.stringify(report,null,2));
if(!report.passed) process.exitCode=1;
