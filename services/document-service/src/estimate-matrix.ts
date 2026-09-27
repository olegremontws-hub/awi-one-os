import {calculateEstimate,type EstimateInput,type EstimateCalculation} from './estimate-calculation.js';
export type EstimateMatrixRow={workItemId:string;code?:string;name:string;quantity:number;unit:string;designRef?:string;technicalConditionRef?:string;calculation:EstimateCalculation;evidenceIds:string[]};
export function buildEstimateRow(input:{workItemId:string;code?:string;name:string;designRef?:string;technicalConditionRef?:string;evidenceIds:string[];estimate:EstimateInput}):EstimateMatrixRow{
 return{workItemId:input.workItemId,code:input.code,name:input.name,quantity:input.estimate.quantity,unit:input.estimate.unit,designRef:input.designRef,technicalConditionRef:input.technicalConditionRef,calculation:calculateEstimate(input.estimate),evidenceIds:input.evidenceIds};
}
