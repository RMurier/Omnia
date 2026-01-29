export interface LogDto {
  id?: string | null;
  refApplication?: string | null;
  category?: string | null;
  level?: string | null;
  message?: string | null;
  payloadJson?: string | null;
  fingerprint?: string | null;
  isPatched?: boolean | null;
  occurredAtUtc?: string | null;
  occurrences?: number | null;
}
