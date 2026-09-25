export type GateLevel = 'H0'|'H1'|'H2'|'H3'|'H4';

export function classifyHumanGate(input: {
  externalCommunication?: boolean; sensitiveReversible?: boolean; money?: boolean;
  legalWill?: boolean; strategic?: boolean; professionalResponsibility?: boolean; physicalWorld?: boolean;
}): GateLevel {
  if (input.physicalWorld) return 'H4';
  if (input.money || input.legalWill || input.strategic || input.professionalResponsibility) return 'H3';
  if (input.externalCommunication || input.sensitiveReversible) return 'H2';
  return 'H0';
}
