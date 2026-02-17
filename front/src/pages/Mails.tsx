import React, { useEffect, useMemo, useState } from "react";
import type { ApplicationItem } from "../interfaces/ApplicationItem";
import type { MailLogDto } from "../interfaces/MailLogDto";
import { authFetch } from "../utils/authFetch";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { BREAKPOINTS } from "../hooks/breakpoints";

interface MailGroupUi {
  key: string;
  refApplication: string;
  fingerprint: string;
  subject: string;
  fromAddress: string;
  toAddresses: string;
  status: string;
  occurrences: number;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
  anyPatched: boolean;
  allPatched: boolean;
  ids: string[];
}

function toDateInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfDayMs(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).getTime();
}

function endOfDayMs(dateStr: string) {
  return new Date(`${dateStr}T23:59:59.999`).getTime();
}

function safeParseJson(s?: string | null): any[] | null {
  if (!s) return null;
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function sortGroups(items: MailGroupUi[], sortBy: "lastSeen" | "occurrences" | "firstSeen", sortDir: "desc" | "asc") {
  const dir = sortDir === "asc" ? 1 : -1;

  const getKey = (g: MailGroupUi) => {
    if (sortBy === "occurrences") return g.occurrences;
    if (sortBy === "firstSeen") return new Date(g.firstSeenAtUtc).getTime();
    return new Date(g.lastSeenAtUtc).getTime();
  };

  return [...items].sort((a, b) => {
    const ka = getKey(a);
    const kb = getKey(b);

    if (ka < kb) return -1 * dir;
    if (ka > kb) return 1 * dir;

    const am = (a.subject || "").toLowerCase();
    const bm = (b.subject || "").toLowerCase();
    if (am < bm) return -1;
    if (am > bm) return 1;
    return 0;
  });
}

function fallbackFingerprint(l: MailLogDto): string {
  const ref = l.refApplication ?? "";
  const from = (l.fromAddress ?? "").trim().toLowerCase();
  const to = (l.toAddresses ?? "").trim().toLowerCase();
  const subj = (l.subject ?? "").trim().toLowerCase();

  return `${ref}|${from}|${to}|${subj}`.slice(0, 512);
}

export default function MailsPage() {
  const { t } = useTranslation();
  const [apps, setApps] = useState<ApplicationItem[]>([]);
  const [rawMails, setRawMails] = useState<MailLogDto[]>([]);

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [applicationId, setApplicationId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const [patched, setPatched] = useState<string>("all");
  const today = useMemo(() => new Date(), []);
  const [dateFrom, setDateFrom] = useState<string>(() => toDateInputValue(new Date(today.getTime() - 7 * 86400000)));
  const [dateTo, setDateTo] = useState<string>(() => toDateInputValue(today));

  const [sortBy, setSortBy] = useState<"lastSeen" | "occurrences" | "firstSeen">("lastSeen");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const isNarrow = useMediaQuery(BREAKPOINTS.narrow);
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const canRefresh = useMemo(() => !loading && !busy, [loading, busy]);

  const appNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of apps) m.set(a.id, a.name);
    return m;
  }, [apps]);

  async function loadApps() {
    try {
      const data = await authFetch<ApplicationItem[]>("/application", { method: "GET" });
      setApps(data ?? []);
    } catch { }
  }

  async function loadMails() {
    setLoading(true);
    setError(null);

    try {
      const data = await authFetch<MailLogDto[]>("/mail", { method: "GET" });
      setRawMails(data ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApps();
    loadMails();
  }, []);

  const filters = useMemo(() => {
    const fromMs = dateFrom ? startOfDayMs(dateFrom) : null;
    const toMs = dateTo ? endOfDayMs(dateTo) : null;
    const isPatched = patched === "all" ? null : patched === "true" ? true : patched === "false" ? false : null;

    return {
      refApplication: applicationId !== "all" ? applicationId : null,
      status: statusFilter !== "all" ? statusFilter.toLowerCase() : null,
      isPatched,
      fromMs,
      toMs,
      search: search.trim().toLowerCase(),
    };
  }, [applicationId, statusFilter, patched, dateFrom, dateTo, search]);

  const filteredMails = useMemo(() => {
    return (rawMails ?? []).filter((l) => {
      const refApp = (l.refApplication ?? "").trim();
      const fpRaw = (l.fingerprint ?? "").trim();
      const effectiveFp = fpRaw || fallbackFingerprint(l);

      const subj = (l.subject ?? "").toLowerCase();
      const from = (l.fromAddress ?? "").toLowerCase();
      const st = (l.status ?? "").toLowerCase();
      const isPat = Boolean(l.isPatched);
      const sentAt = l.sentAtUtc ? new Date(l.sentAtUtc).getTime() : NaN;

      if (!refApp || !effectiveFp) return false;

      if (filters.refApplication && refApp !== filters.refApplication) return false;
      if (filters.status && st !== filters.status) return false;
      if (filters.isPatched !== null && isPat !== filters.isPatched) return false;

      if (filters.fromMs !== null) {
        if (!Number.isFinite(sentAt) || sentAt < filters.fromMs) return false;
      }
      if (filters.toMs !== null) {
        if (!Number.isFinite(sentAt) || sentAt > filters.toMs) return false;
      }

      if (filters.search) {
        if (!subj.includes(filters.search) && !from.includes(filters.search)) return false;
      }

      return true;
    });
  }, [rawMails, filters]);

  const groups = useMemo<MailGroupUi[]>(() => {
    const map = new Map<string, MailGroupUi>();

    for (const l of filteredMails) {
      const fpRaw = (l.fingerprint ?? "").trim();
      const fp = fpRaw || fallbackFingerprint(l);

      const ref = (l.refApplication ?? "").trim();
      const id = (l.id as any) as string;

      if (!fp || !ref || !id) continue;

      const sentAt = l.sentAtUtc ?? new Date().toISOString();
      const key = `${ref}::${fp}`;

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          fingerprint: fp,
          refApplication: ref,
          subject: (l.subject ?? "").toString(),
          fromAddress: (l.fromAddress ?? "").toString(),
          toAddresses: (l.toAddresses ?? "[]").toString(),
          status: (l.status ?? "pending").toString(),
          occurrences: 1,
          firstSeenAtUtc: sentAt,
          lastSeenAtUtc: sentAt,
          anyPatched: Boolean(l.isPatched),
          allPatched: Boolean(l.isPatched),
          ids: [id],
        });
      } else {
        existing.occurrences += 1;
        existing.ids.push(id);

        const sentMs = new Date(sentAt).getTime();
        const firstMs = new Date(existing.firstSeenAtUtc).getTime();
        const lastMs = new Date(existing.lastSeenAtUtc).getTime();

        if (Number.isFinite(sentMs) && sentMs < firstMs) existing.firstSeenAtUtc = sentAt;
        if (Number.isFinite(sentMs) && sentMs > lastMs) existing.lastSeenAtUtc = sentAt;

        const p = Boolean(l.isPatched);
        existing.anyPatched = existing.anyPatched || p;
        existing.allPatched = existing.allPatched && p;
      }
    }

    return sortGroups(Array.from(map.values()), sortBy, sortDir);
  }, [filteredMails, sortBy, sortDir]);

  const mailsById = useMemo(() => {
    const m = new Map<string, MailLogDto>();
    for (const l of filteredMails) {
      const id = (l.id as any) as string;
      if (id) m.set(id, l);
    }
    return m;
  }, [filteredMails]);

  const styles: Record<string, React.CSSProperties> = {
    page: { padding: isMobile ? "12px 8px" : 20, maxWidth: "min(99vw, 3600px)", margin: "0 auto" },
    topBar: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 },
    title: { margin: 0, fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)" },
    subtitle: { margin: "6px 0 0", color: "var(--color-text-muted)", fontSize: 14 },
    panel: { border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface)", padding: 14, marginBottom: 12 },

    filtersGrid: { display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 14, alignItems: "end" },
    filterBlock: { padding: 10, borderRadius: 12, border: "1px solid var(--color-border-subtle)", background: "var(--color-surface-raised)", minWidth: 0 },
    field: { display: "grid", gap: 6 },
    col3: { gridColumn: "span 3", minWidth: 0 },
    col2: { gridColumn: "span 2", minWidth: 0 },
    col3Mobile: { gridColumn: "span 6", minWidth: 0 },
    col2Mobile: { gridColumn: "span 6", minWidth: 0 },

    label: { display: "block", fontSize: 12, fontWeight: 800, color: "var(--color-text-secondary)" },
    input: { height: 40, borderRadius: 10, border: "1px solid var(--color-border-strong)", padding: "0 12px", outline: "none", fontSize: 14, width: "100%", background: "var(--color-surface)", boxSizing: "border-box" },

    btn: { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", cursor: "pointer", fontWeight: 800, fontSize: 14, whiteSpace: "nowrap" },
    btnSmall: { padding: "7px 10px", borderRadius: 10, border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", cursor: "pointer", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" },
    disabled: { opacity: 0.6, cursor: "not-allowed" },

    error: { border: "1px solid var(--color-error)", background: "var(--color-error-bg)", color: "var(--color-error-text)", padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 14 },

    card: { border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface)", overflow: "hidden" },
    listWrap: { overflow: "auto" },

    table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: 980 },
    th: { position: "sticky", top: 0, zIndex: 2, textAlign: "left", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--color-text-muted)", padding: "12px 14px", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-raised)", whiteSpace: "nowrap" },
    td: { padding: "12px 14px", borderBottom: "1px solid var(--color-border-td)", verticalAlign: "top", color: "var(--color-text-primary)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis" },
    tdMuted: { color: "var(--color-text-muted)", fontSize: 12, marginTop: 6 },

    groupRow: { cursor: "pointer" },
    expandedRow: { background: "var(--color-skeleton-box)" },

    badge: { display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 900, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)", whiteSpace: "nowrap" },
    pillBad: { borderColor: "var(--color-error)", color: "var(--color-error-text-dark)", background: "var(--color-error-bg)" },
    pillWarn: { borderColor: "var(--color-warning)", color: "var(--color-warning-text)", background: "var(--color-warning-bg)" },
    pillOk: { borderColor: "var(--color-success)", color: "var(--color-success-text)", background: "var(--color-success-bg)" },
    pillInfo: { borderColor: "var(--color-primary)", color: "var(--color-primary)", background: "var(--color-surface)" },

    subRow: { background: "var(--color-surface)" },
    subCell: { padding: "10px 14px", borderBottom: "1px solid var(--color-border-subtle)", fontSize: 13, color: "var(--color-text-primary)" },
    subCard: { border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface)", padding: 12, display: "grid", gap: 8 },

    mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
    pre: { margin: 0, padding: 12, borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-surface-raised)", overflowX: "auto", fontSize: 12, lineHeight: 1.5, color: "var(--color-text-primary)" },

    detailRow: { display: "flex", gap: 6, fontSize: 13 },
    detailLabel: { fontWeight: 800, color: "var(--color-text-secondary)", minWidth: 80 },
    detailValue: { color: "var(--color-text-primary)", wordBreak: "break-all" as const },
  };

  function statusBadgeStyle(st: string): React.CSSProperties {
    const v = (st || "").toLowerCase();
    if (v === "failed" || v === "bounced") return { ...styles.badge, ...styles.pillBad };
    if (v === "pending") return { ...styles.badge, ...styles.pillWarn };
    if (v === "sent") return { ...styles.badge, ...styles.pillOk };
    return styles.badge;
  }

  function patchedBadgeStyle(isPatched: boolean): React.CSSProperties {
    if (isPatched) return { ...styles.badge, ...styles.pillOk };
    return styles.badge;
  }

  const col3 = isNarrow ? styles.col3Mobile : styles.col3;
  const col2 = isNarrow ? styles.col2Mobile : styles.col2;

  async function patchMany(ids: string[], value: boolean) {
    await authFetch<MailLogDto[]>("/mail/patch", {
      method: "PATCH",
      body: JSON.stringify({ ids, value }),
    });

    setRawMails((prev) =>
      prev.map((l) => {
        const id = (l.id as any) as string;
        if (!id) return l;
        if (!ids.includes(id)) return l;
        return { ...l, isPatched: value };
      })
    );
  }

  async function onPatchSingle(id: string, value: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);

    const snapshot = rawMails;

    setRawMails((prev) =>
      prev.map((l) => {
        const lid = (l.id as any) as string;
        if (lid !== id) return l;
        return { ...l, isPatched: value };
      })
    );

    try {
      await patchMany([id], value);
    } catch (e: any) {
      setRawMails(snapshot);
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function onPatchGroup(group: MailGroupUi, value: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);

    const ids = group.ids;
    const snapshot = rawMails;

    setRawMails((prev) =>
      prev.map((l) => {
        const lid = (l.id as any) as string;
        if (!lid || !ids.includes(lid)) return l;
        return { ...l, isPatched: value };
      })
    );

    try {
      await patchMany(ids, value);
    } catch (e: any) {
      setRawMails(snapshot);
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  function formatRecipients(json?: string | null): string {
    const arr = safeParseJson(json);
    if (!arr || arr.length === 0) return "-";
    return arr.join(", ");
  }

  return (
    <div className="animate-page" style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>{t("mails.title")}</h1>
          <p style={styles.subtitle}>{t("mails.subtitle")}</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button style={{ ...styles.btn, ...(canRefresh ? {} : styles.disabled) }} onClick={loadMails} disabled={!canRefresh}>
            {t("common.refresh")}
          </button>
        </div>
      </div>

      <div style={styles.panel}>
        <div style={styles.filtersGrid}>
          <div style={col3}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("mails.application")}</label>
                <select style={styles.input} value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
                  <option value="all">{t("mails.all")}</option>
                  {apps.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={col2}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("mails.status")}</label>
                <select style={styles.input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">{t("mails.all")}</option>
                  <option value="sent">{t("mails.statusSent")}</option>
                  <option value="failed">{t("mails.statusFailed")}</option>
                  <option value="bounced">{t("mails.statusBounced")}</option>
                  <option value="pending">{t("mails.statusPending")}</option>
                </select>
              </div>
            </div>
          </div>

          <div style={col2}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("mails.patched")}</label>
                <select style={styles.input} value={patched} onChange={(e) => setPatched(e.target.value)}>
                  <option value="all">{t("mails.all")}</option>
                  <option value="true">{t("mails.patched")}</option>
                  <option value="false">{t("mails.notPatched")}</option>
                </select>
              </div>
            </div>
          </div>

          <div style={col2}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("mails.from")}</label>
                <input style={styles.input} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
            </div>
          </div>

          <div style={col2}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("mails.to")}</label>
                <input style={styles.input} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          </div>

          <div style={col3}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("mails.search")}</label>
                <input style={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("mails.searchPlaceholder")} />
              </div>
            </div>
          </div>

          <div style={col2}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("mails.sortBy")}</label>
                <select style={styles.input} value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                  <option value="lastSeen">{t("mails.sortLastSeen")}</option>
                  <option value="occurrences">{t("mails.sortOccurrences")}</option>
                  <option value="firstSeen">{t("mails.sortFirstSeen")}</option>
                </select>
              </div>
            </div>
          </div>

          <div style={col2}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("mails.sortOrder")}</label>
                <select style={styles.input} value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
                  <option value="desc">{t("mails.sortDesc")}</option>
                  <option value="asc">{t("mails.sortAsc")}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.card}>
        <div style={styles.listWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}></th>
                <th style={styles.th}>{t("mails.tableStatus")}</th>
                <th style={styles.th}>{t("mails.tableFrom")}</th>
                <th style={styles.th}>{t("mails.tableTo")}</th>
                <th style={styles.th}>{t("mails.tableSubject")}</th>
                <th style={styles.th}>{t("mails.app")}</th>
                <th style={styles.th}>{t("mails.occurrences")}</th>
                <th style={styles.th}>{t("mails.lastSeen")}</th>
                <th style={{ ...styles.th, textAlign: "right" }}>{t("mails.patchGroup")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td style={styles.td} colSpan={9}>
                    {t("mails.loading")}
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={9}>
                    {t("mails.none")}
                  </td>
                </tr>
              ) : (
                groups.flatMap((g) => {
                  const isOpen = Boolean(expanded[g.key]);
                  const appName = appNameById.get(g.refApplication) ?? g.refApplication;

                  const groupRow = (
                    <tr
                      key={`g:${g.key}`}
                      style={{ ...(styles.groupRow as any), ...(isOpen ? (styles.expandedRow as any) : {}) }}
                      onClick={() => setExpanded((p) => ({ ...p, [g.key]: !p[g.key] }))}
                    >
                      <td style={styles.td}>{isOpen ? "\u25BE" : "\u25B8"}</td>
                      <td style={styles.td}>
                        <span style={statusBadgeStyle(g.status)}>{t(`mails.status${g.status.charAt(0).toUpperCase() + g.status.slice(1)}`)}</span>
                      </td>
                      <td style={styles.td} title={g.fromAddress}>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.fromAddress || "-"}</div>
                      </td>
                      <td style={styles.td} title={formatRecipients(g.toAddresses)}>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{formatRecipients(g.toAddresses)}</div>
                      </td>
                      <td style={styles.td} title={g.subject}>
                        <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.subject}</div>
                        <div style={styles.tdMuted}>
                          <span style={styles.mono}>{g.fingerprint}</span>
                        </div>
                      </td>
                      <td style={styles.td} title={appName}>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{appName}</div>
                      </td>
                      <td style={styles.td}>{g.occurrences}</td>
                      <td style={styles.td}>{new Date(g.lastSeenAtUtc).toLocaleString()}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        <button
                          type="button"
                          style={{
                            ...styles.btnSmall,
                            ...(g.allPatched ? styles.pillOk : g.anyPatched ? styles.pillWarn : {}),
                            ...(busy ? styles.disabled : {}),
                          }}
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPatchGroup(g, !g.allPatched);
                          }}
                        >
                          {g.allPatched ? t("mails.allPatched") : g.anyPatched ? t("mails.partialPatched") : t("mails.nonePatched")}
                        </button>
                      </td>
                    </tr>
                  );

                  if (!isOpen) return [groupRow];

                  const occurrenceRows = g.ids
                    .map((id) => mailsById.get(id))
                    .filter(Boolean)
                    .sort((a, b) => new Date((b as any).sentAtUtc).getTime() - new Date((a as any).sentAtUtc).getTime())
                    .slice(0, 30)
                    .map((l) => {
                      const id = (l!.id as any) as string;
                      const sentAtUtc = (l!.sentAtUtc as any) as string;
                      const isPatched = Boolean(l!.isPatched);
                      const attachments = safeParseJson(l!.attachmentsJson);

                      return (
                        <tr key={`o:${g.key}:${id}`} style={styles.subRow}>
                          <td style={styles.subCell} colSpan={9}>
                            <div style={styles.subCard}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                  <span style={statusBadgeStyle(l!.status ?? "")}>{l!.status}</span>
                                  <span style={patchedBadgeStyle(isPatched)}>{isPatched ? t("mails.patched") : t("mails.notPatched")}</span>
                                  <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{new Date(sentAtUtc).toLocaleString()}</span>
                                  <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                                    <span style={styles.mono}>{id}</span>
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  style={{ ...styles.btnSmall, ...(isPatched ? styles.pillOk : {}), ...(busy ? styles.disabled : {}) }}
                                  disabled={busy}
                                  onClick={() => onPatchSingle(id, !isPatched)}
                                >
                                  {isPatched ? t("mails.unpatch") : t("mails.patch")}
                                </button>
                              </div>

                              <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>{t("mails.detailFrom")}:</span>
                                <span style={styles.detailValue}>{l!.fromAddress || "-"}</span>
                              </div>
                              <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>{t("mails.detailTo")}:</span>
                                <span style={styles.detailValue}>{formatRecipients(l!.toAddresses)}</span>
                              </div>
                              {l!.ccAddresses && (
                                <div style={styles.detailRow}>
                                  <span style={styles.detailLabel}>{t("mails.detailCc")}:</span>
                                  <span style={styles.detailValue}>{formatRecipients(l!.ccAddresses)}</span>
                                </div>
                              )}
                              {l!.bccAddresses && (
                                <div style={styles.detailRow}>
                                  <span style={styles.detailLabel}>{t("mails.detailBcc")}:</span>
                                  <span style={styles.detailValue}>{formatRecipients(l!.bccAddresses)}</span>
                                </div>
                              )}
                              <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>{t("mails.detailSubject")}:</span>
                                <span style={{ ...styles.detailValue, fontWeight: 700 }}>{l!.subject || "-"}</span>
                              </div>

                              {l!.body && (
                                <div>
                                  <div style={{ ...styles.detailLabel, marginBottom: 4 }}>{t("mails.detailBody")}:</div>
                                  <pre style={{ ...styles.pre, ...(styles.mono as any) }}>{l!.body}</pre>
                                </div>
                              )}

                              {attachments && attachments.length > 0 && (
                                <div>
                                  <div style={{ ...styles.detailLabel, marginBottom: 4 }}>{t("mails.detailAttachments")}:</div>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    {attachments.map((att: any, i: number) => (
                                      <span key={i} style={styles.badge}>
                                        {att.name || "file"} ({att.contentType || "?"}, {att.size ? `${Math.round(att.size / 1024)}KB` : "?"})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {l!.errorMessage && (
                                <div>
                                  <div style={{ ...styles.detailLabel, marginBottom: 4, color: "var(--color-error)" }}>{t("mails.detailError")}:</div>
                                  <pre style={{ ...styles.pre, ...(styles.mono as any), borderColor: "var(--color-error)" }}>{l!.errorMessage}</pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    });

                  const limitedNote =
                    g.ids.length > 30 ? (
                      <tr key={`limit:${g.key}`} style={styles.subRow}>
                        <td style={styles.subCell} colSpan={9}>
                          <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{t("mails.limited", { count: g.ids.length })}.</div>
                        </td>
                      </tr>
                    ) : null;

                  return [groupRow, ...occurrenceRows, ...(limitedNote ? [limitedNote] : [])];
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
