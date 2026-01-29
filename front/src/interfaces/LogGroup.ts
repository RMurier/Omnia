export interface LogGroup {
  fingerprint: string;
  refApplication: string;
  category: string;
  level: string;
  message: string;
  occurrences: number;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
  isPatched: boolean;
};