export interface LogGroupUi {
  key: string;
  refApplication: string;
  fingerprint: string;
  message: string;
  category: string;
  level: string;
  occurrences: number;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
  anyPatched: boolean;
  allPatched: boolean;
  ids: string[];
}
