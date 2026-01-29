export interface LogItem {
  id: string;
  category: string;
  level: string;
  message: string;
  occurredAtUtc: string;
  fingerprint: string;
  payloadJson: string;
  isPatched: boolean;
};