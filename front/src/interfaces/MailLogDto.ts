export interface MailLogDto {
  id?: string | null;
  refApplication?: string | null;
  fromAddress?: string | null;
  toAddresses?: string | null;
  ccAddresses?: string | null;
  bccAddresses?: string | null;
  subject?: string | null;
  body?: string | null;
  attachmentsJson?: string | null;
  status?: string | null;
  errorMessage?: string | null;
  fingerprint?: string | null;
  isPatched?: boolean | null;
  sentAtUtc?: string | null;
  occurrences?: number | null;
}
