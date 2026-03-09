import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import type { LogDto } from "../interfaces/LogDto";
import type { LogGroupUi } from "../interfaces/LogGroupUi";
import { authFetch } from "../utils/authFetch";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { BREAKPOINTS } from "../hooks/breakpoints";

type OrgApp = { id: string; name?: string | null };
type OrgDto = { id: string; name: string; isActive: boolean; myRole?: string | null };

function toDateInputValue(d: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function startOfDayMs(s: string) { return new Date(`${s}T00:00:00`).getTime(); }
function endOfDayMs(s: string) { return new Date(`${s}T23:59:59.999`).getTime(); }
function safeParseJson(s?: string | null): any { if (!s) return null; try { return JSON.parse(s); } catch { return null; } }

function extractStack(payloadJson?: string | null): string | null {
  const j = safeParseJson(payloadJson);
  if (!j) return null;
  const fields = ["stack", "stackTrace", "traceback", "tb", "exc_info", "backtrace", "trace", "stacktrace", "exception", "frames"];
  for (const f of fields) if (j[f]) return String(j[f]);
  const errObj = j.error ?? j.exception ?? j.err ?? j.exc ?? null;
  if (errObj && typeof errObj === "object") for (const f of fields) if (errObj[f]) return String(errObj[f]);
  if (Array.isArray(j.frames)) return j.frames.map((f: any) => `  at ${f.function || f.method || "?"} (${f.filename || f.file || "?"}:${f.lineno || f.line || "?"})`).join("\n");
  if (Array.isArray(errObj?.frames)) return errObj.frames.map((f: any) => `  at ${f.function || f.method || "?"} (${f.filename || f.file || "?"}:${f.lineno || f.line || "?"})`).join("\n");
  return null;
}

function categoryLabel(t: (key: string) => string, c?: string | null) {
  const v = (c || "").toLowerCase();
  const map: Record<string, string> = { connection: "logs.connection", error: "logs.error", warning: "logs.warning", info: "logs.info", debug: "logs.debug", exception: "logs.exception", http: "logs.http", validation: "logs.validation", security: "logs.security" };
  return map[v] ? t(map[v]) : (c || "-");
}

function sortGroups(items: LogGroupUi[], sortBy: "lastSeen" | "occurrences" | "firstSeen", sortDir: "desc" | "asc") {
  const dir = sortDir === "asc" ? 1 : -1;
  const getKey = (g: LogGroupUi) => sortBy === "occurrences" ? g.occurrences : sortBy === "firstSeen" ? new Date(g.firstSeenAtUtc).getTime() : new Date(g.lastSeenAtUtc).getTime();
  return [...items].sort((a, b) => { const ka = getKey(a), kb = getKey(b); if (ka < kb) return -1 * dir; if (ka > kb) return 1 * dir; return (a.message || "").localeCompare(b.message || ""); });
}

function fallbackFingerprint(l: LogDto): string {
  return `${l.refApplication ?? ""}|${(l.category ?? "").toLowerCase()}|${(l.level ?? "").toLowerCase()}|${(l.message ?? "").trim().toLowerCase()}|${(l.payloadJson ?? "").trim()}`.slice(0, 512);
}

// ── OrgLogsContent ────────────────────────────────────────────────────────────
export function OrgLogsContent({ orgId, fixedAppId, canPatch }: { orgId: string; fixedAppId?: string; canPatch: boolean }) {
  const { t } = useTranslation();
  const [apps, setApps] = useState<OrgApp[]>([]);
  const [rawLogs, setRawLogs] = useState<LogDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [applicationId, setApplicationId] = useState<string>(fixedAppId ?? "all");
  const [category, setCategory] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
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
  const canRefresh = !loading && !busy;

  const appNameById = useMemo(() => { const m = new Map<string, string>(); for (const a of apps) m.set(a.id, String(a.name ?? a.id)); return m; }, [apps]);

  async function loadApps() {
    try { const data = await authFetch<OrgApp[]>(`/organization/${orgId}/apps`); setApps(data ?? []); } catch {}
  }

  async function loadLogs() {
    setLoading(true); setError(null);
    try { const data = await authFetch<LogDto[]>(`/log/org/${orgId}`); setRawLogs(data ?? []); }
    catch (e: any) { setError(String(e?.message ?? e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadApps(); loadLogs(); }, [orgId]);

  const filters = useMemo(() => ({
    refApplication: applicationId !== "all" ? applicationId : null,
    category: category !== "all" ? category.toLowerCase() : null,
    level: level !== "all" ? level.toLowerCase() : null,
    isPatched: patched === "all" ? null : patched === "true" ? true : patched === "false" ? false : null,
    fromMs: dateFrom ? startOfDayMs(dateFrom) : null,
    toMs: dateTo ? endOfDayMs(dateTo) : null,
    search: search.trim().toLowerCase(),
  }), [applicationId, category, level, patched, dateFrom, dateTo, search]);

  const filteredLogs = useMemo(() => (rawLogs ?? []).filter(l => {
    const refApp = (l.refApplication ?? "").trim();
    const fp = (l.fingerprint ?? "").trim() || fallbackFingerprint(l);
    if (!refApp || !fp) return false;
    if (filters.refApplication && refApp !== filters.refApplication) return false;
    if (filters.category && (l.category ?? "").toLowerCase() !== filters.category) return false;
    if (filters.level && (l.level ?? "").toLowerCase() !== filters.level) return false;
    if (filters.isPatched !== null && Boolean(l.isPatched) !== filters.isPatched) return false;
    const occurredAt = l.occurredAtUtc ? new Date(l.occurredAtUtc).getTime() : NaN;
    if (filters.fromMs !== null && (!Number.isFinite(occurredAt) || occurredAt < filters.fromMs)) return false;
    if (filters.toMs !== null && (!Number.isFinite(occurredAt) || occurredAt > filters.toMs)) return false;
    if (filters.search && !(l.message ?? "").toLowerCase().includes(filters.search)) return false;
    return true;
  }), [rawLogs, filters]);

  const groups = useMemo<LogGroupUi[]>(() => {
    const map = new Map<string, LogGroupUi>();
    for (const l of filteredLogs) {
      const fp = (l.fingerprint ?? "").trim() || fallbackFingerprint(l);
      const ref = (l.refApplication ?? "").trim();
      const id = (l.id as any) as string;
      if (!fp || !ref || !id) continue;
      const occurred = l.occurredAtUtc ?? new Date().toISOString();
      const key = `${ref}::${fp}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { key, fingerprint: fp, refApplication: ref, category: String(l.category ?? "error"), level: String(l.level ?? "error"), message: String(l.message ?? ""), occurrences: 1, firstSeenAtUtc: occurred, lastSeenAtUtc: occurred, anyPatched: Boolean(l.isPatched), allPatched: Boolean(l.isPatched), ids: [id] });
      } else {
        existing.occurrences += 1; existing.ids.push(id);
        const ms = new Date(occurred).getTime();
        if (Number.isFinite(ms) && ms < new Date(existing.firstSeenAtUtc).getTime()) existing.firstSeenAtUtc = occurred;
        if (Number.isFinite(ms) && ms > new Date(existing.lastSeenAtUtc).getTime()) existing.lastSeenAtUtc = occurred;
        const p = Boolean(l.isPatched); existing.anyPatched = existing.anyPatched || p; existing.allPatched = existing.allPatched && p;
      }
    }
    return sortGroups(Array.from(map.values()), sortBy, sortDir);
  }, [filteredLogs, sortBy, sortDir]);

  const logsById = useMemo(() => { const m = new Map<string, LogDto>(); for (const l of filteredLogs) { const id = (l.id as any) as string; if (id) m.set(id, l); } return m; }, [filteredLogs]);

  async function patchMany(ids: string[], value: boolean) {
    await authFetch<LogDto[]>("/log/patch", { method: "PATCH", body: JSON.stringify({ ids, value }) });
    setRawLogs(prev => prev.map(l => { const id = (l.id as any) as string; return id && ids.includes(id) ? { ...l, isPatched: value } : l; }));
  }

  async function onPatchSingle(id: string, value: boolean) {
    if (busy) return; setBusy(true); setError(null);
    const snapshot = rawLogs;
    setRawLogs(prev => prev.map(l => (l.id as any) === id ? { ...l, isPatched: value } : l));
    try { await patchMany([id], value); } catch (e: any) { setRawLogs(snapshot); setError(String(e?.message ?? e)); } finally { setBusy(false); }
  }

  async function onPatchGroup(group: LogGroupUi, value: boolean) {
    if (busy) return; setBusy(true); setError(null);
    const snapshot = rawLogs;
    setRawLogs(prev => prev.map(l => { const id = (l.id as any) as string; return id && group.ids.includes(id) ? { ...l, isPatched: value } : l; }));
    try { await patchMany(group.ids, value); } catch (e: any) { setRawLogs(snapshot); setError(String(e?.message ?? e)); } finally { setBusy(false); }
  }

  const s: Record<string, React.CSSProperties> = {
    panel: { border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface)", padding: 14, marginBottom: 12 },
    filtersGrid: { display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(12, minmax(0, 1fr))", gap: isMobile ? 8 : 14, alignItems: "end" },
    filterBlock: { padding: 10, borderRadius: 12, border: "1px solid var(--color-border-subtle)", background: "var(--color-surface-raised)", minWidth: 0 },
    field: { display: "grid", gap: 6 },
    label: { display: "block", fontSize: 12, fontWeight: 800, color: "var(--color-text-secondary)" },
    input: { height: 40, borderRadius: 10, border: "1px solid var(--color-border-strong)", padding: "0 12px", outline: "none", fontSize: 14, width: "100%", background: "var(--color-surface)", boxSizing: "border-box" as const },
    btn: { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 800, fontSize: 14, whiteSpace: "nowrap" as const },
    btnSmall: { padding: "7px 10px", borderRadius: 10, border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" as const },
    disabled: { opacity: 0.6, cursor: "not-allowed" },
    error: { border: "1px solid var(--color-error)", background: "var(--color-error-bg)", color: "var(--color-error-text)", padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 14 },
    card: { border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface)", overflow: "hidden" },
    listWrap: { overflow: "auto", background: "var(--color-surface)" },
    table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: 980 },
    th: { position: "sticky", top: 0, zIndex: 2, textAlign: "left", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase" as const, color: "var(--color-text-secondary)", padding: "12px 14px", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-raised)", whiteSpace: "nowrap" as const },
    td: { padding: "12px 14px", borderBottom: "1px solid var(--color-border-td)", verticalAlign: "top", color: "var(--color-text-primary)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", background: "var(--color-surface)" },
    tdMuted: { color: "var(--color-text-muted)", fontSize: 12, marginTop: 6 },
    badge: { display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 900, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)", whiteSpace: "nowrap" as const },
    pillBad: { borderColor: "var(--color-error)", color: "var(--color-error-text-dark)", background: "var(--color-error-bg)" },
    pillWarn: { borderColor: "var(--color-warning)", color: "var(--color-warning-text)", background: "var(--color-warning-bg)" },
    pillOk: { borderColor: "var(--color-success)", color: "var(--color-success-text)", background: "var(--color-success-bg)" },
    subRow: { background: "var(--color-surface)" },
    subCell: { padding: "10px 14px", borderBottom: "1px solid var(--color-border-subtle)", fontSize: 13, color: "var(--color-text-primary)" },
    subCard: { border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface)", padding: 12, display: "grid", gap: 8 },
    mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
    pre: { margin: 0, padding: 12, borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-surface-raised)", overflowX: "auto", fontSize: 12, lineHeight: 1.5, color: "var(--color-text-primary)" },
    mobileList: { display: "grid", gap: 8, padding: 12 },
    mobileEmpty: { padding: "20px 14px", color: "var(--color-text-muted)", fontSize: 14 },
    mobileGroup: { border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface)", overflow: "hidden" },
    mobileGroupHeader: { display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", cursor: "pointer" },
    mobileGroupHeaderOpen: { background: "var(--color-surface-sunken)" },
    mobileGroupActions: { padding: "8px 14px 12px", borderTop: "1px solid var(--color-border-subtle)" },
    mobileOccurrences: { borderTop: "1px solid var(--color-border)", background: "var(--color-surface-sunken)", padding: "10px 12px", display: "grid", gap: 8 },
  };

  function badgeCat(cat: string): React.CSSProperties { const v = (cat || "").toLowerCase(); if (v === "error" || v === "exception") return { ...s.badge, ...s.pillBad }; if (v === "warning") return { ...s.badge, ...s.pillWarn }; return s.badge; }
  function badgePatched(p: boolean): React.CSSProperties { return p ? { ...s.badge, ...s.pillOk } : s.badge; }

  const col3 = isMobile ? { gridColumn: "span 2" } : isNarrow ? { gridColumn: "span 6" } : { gridColumn: "span 3" };
  const col2 = isMobile ? { gridColumn: "span 1" } : isNarrow ? { gridColumn: "span 6" } : { gridColumn: "span 2" };
  const colFull = { gridColumn: isMobile ? "span 2" : "span 12" };

  const colSpan = canPatch ? 7 : 6;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button style={{ ...s.btn, ...(canRefresh ? {} : s.disabled) }} onClick={() => { loadApps(); loadLogs(); }} disabled={!canRefresh}>{t("common.refresh")}</button>
      </div>

      <div style={s.panel}>
        <div style={s.filtersGrid}>
          {!fixedAppId && (
            <div style={col3}>
              <div style={s.filterBlock}>
                <div style={s.field}>
                  <label style={s.label}>{t("logs.application")}</label>
                  <select style={s.input} value={applicationId} onChange={e => setApplicationId(e.target.value)}>
                    <option value="all">{t("logs.all")}</option>
                    {apps.map(a => <option key={a.id} value={a.id}>{a.name ?? a.id}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
          <div style={col2}><div style={s.filterBlock}><div style={s.field}><label style={s.label}>{t("logs.category")}</label><select style={s.input} value={category} onChange={e => setCategory(e.target.value)}><option value="all">{t("logs.all")}</option><option value="exception">{t("logs.exception")}</option><option value="http">{t("logs.http")}</option><option value="validation">{t("logs.validation")}</option><option value="security">{t("logs.security")}</option><option value="connection">{t("logs.connection")}</option><option value="error">{t("logs.error")}</option><option value="warning">{t("logs.warning")}</option><option value="info">{t("logs.info")}</option><option value="debug">{t("logs.debug")}</option></select></div></div></div>
          <div style={col2}><div style={s.filterBlock}><div style={s.field}><label style={s.label}>{t("logs.level")}</label><select style={s.input} value={level} onChange={e => setLevel(e.target.value)}><option value="all">{t("logs.levelAll")}</option><option value="debug">{t("logs.levelDebug")}</option><option value="info">{t("logs.levelInfo")}</option><option value="warning">{t("logs.levelWarning")}</option><option value="error">{t("logs.levelError")}</option><option value="critical">{t("logs.levelCritical")}</option></select></div></div></div>
          <div style={col2}><div style={s.filterBlock}><div style={s.field}><label style={s.label}>{t("logs.patched")}</label><select style={s.input} value={patched} onChange={e => setPatched(e.target.value)}><option value="all">{t("logs.levelAll")}</option><option value="true">{t("logs.patched")}</option><option value="false">{t("logs.notPatched")}</option></select></div></div></div>
          <div style={col2}><div style={s.filterBlock}><div style={s.field}><label style={s.label}>{t("logs.from")}</label><input style={s.input} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div></div></div>
          <div style={col2}><div style={s.filterBlock}><div style={s.field}><label style={s.label}>{t("logs.to")}</label><input style={s.input} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div></div></div>
          <div style={colFull}><div style={s.filterBlock}><div style={s.field}><label style={s.label}>{t("logs.search")}</label><input style={s.input} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("logs.searchPlaceholder")} /></div></div></div>
          <div style={col2}><div style={s.filterBlock}><div style={s.field}><label style={s.label}>{t("logs.sortBy")}</label><select style={s.input} value={sortBy} onChange={e => setSortBy(e.target.value as any)}><option value="lastSeen">{t("logs.sortLastSeen")}</option><option value="occurrences">{t("logs.sortOccurrences")}</option><option value="firstSeen">{t("logs.sortFirstSeen")}</option></select></div></div></div>
          <div style={col2}><div style={s.filterBlock}><div style={s.field}><label style={s.label}>{t("logs.sortOrder")}</label><select style={s.input} value={sortDir} onChange={e => setSortDir(e.target.value as any)}><option value="desc">{t("logs.sortDesc")}</option><option value="asc">{t("logs.sortAsc")}</option></select></div></div></div>
        </div>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.card}>
        {isNarrow ? (
          <div style={s.mobileList}>
            {loading ? <div style={s.mobileEmpty}>{t("logs.loading")}</div> : groups.length === 0 ? <div style={s.mobileEmpty}>{t("logs.none")}</div> : groups.map(g => {
              const isOpen = Boolean(expanded[g.key]);
              const appName = appNameById.get(g.refApplication) ?? g.refApplication;
              return (
                <div key={g.key} style={s.mobileGroup}>
                  <div style={{ ...s.mobileGroupHeader, ...(isOpen ? s.mobileGroupHeaderOpen : {}) }} onClick={() => setExpanded(p => ({ ...p, [g.key]: !p[g.key] }))}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={badgeCat(g.category)}>{categoryLabel(t, g.category)}</span>
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 700 }}>{appName}</span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.message}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span>{g.occurrences} {t("logs.occurrences")}</span><span>·</span><span>{new Date(g.lastSeenAtUtc).toLocaleString()}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 16, color: "var(--color-text-muted)", flexShrink: 0, marginTop: 2 }}>{isOpen ? "▾" : "▸"}</span>
                  </div>
                  {canPatch && (
                    <div style={s.mobileGroupActions}>
                      <button type="button" style={{ ...s.btnSmall, ...(g.allPatched ? s.pillOk : g.anyPatched ? s.pillWarn : {}), ...(busy ? s.disabled : {}) }} disabled={busy} onClick={e => { e.stopPropagation(); onPatchGroup(g, !g.allPatched); }}>
                        {g.allPatched ? t("logs.allPatched") : g.anyPatched ? t("logs.partialPatched") : t("logs.nonePatched")}
                      </button>
                    </div>
                  )}
                  {isOpen && (
                    <div style={s.mobileOccurrences}>
                      {g.ids.map(id => logsById.get(id)).filter(Boolean).sort((a, b) => new Date((b as any).occurredAtUtc).getTime() - new Date((a as any).occurredAtUtc).getTime()).slice(0, 30).map(l => {
                        const id = (l!.id as any) as string;
                        const isPatched = Boolean(l!.isPatched);
                        const stack = extractStack((l!.payloadJson as any) as string);
                        return (
                          <div key={id} style={s.subCard}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                <span style={badgePatched(isPatched)}>{isPatched ? t("logs.patched") : t("logs.notPatched")}</span>
                                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{new Date((l!.occurredAtUtc as any) as string).toLocaleString()}</span>
                              </div>
                              {canPatch && <button type="button" style={{ ...s.btnSmall, ...(isPatched ? s.pillOk : {}), ...(busy ? s.disabled : {}) }} disabled={busy} onClick={() => onPatchSingle(id, !isPatched)}>{isPatched ? t("logs.unpatch") : t("logs.patch")}</button>}
                            </div>
                            <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{String(l!.message ?? "")}</div>
                            {stack ? <pre style={{ ...s.pre, ...s.mono }}>{stack}</pre> : null}
                          </div>
                        );
                      })}
                      {g.ids.length > 30 && <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t("logs.limited", { count: g.ids.length })}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={s.listWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}></th>
                  <th style={s.th}>{t("logs.tableCategory")}</th>
                  <th style={s.th}>{t("logs.tableError")}</th>
                  <th style={s.th}>{t("logs.app")}</th>
                  <th style={s.th}>{t("logs.occurrences")}</th>
                  <th style={s.th}>{t("logs.lastSeen")}</th>
                  {canPatch && <th style={{ ...s.th, textAlign: "right" }}>{t("logs.patchGroup")}</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td style={s.td} colSpan={colSpan}>{t("logs.loading")}</td></tr>
                  : groups.length === 0 ? <tr><td style={s.td} colSpan={colSpan}>{t("logs.none")}</td></tr>
                  : groups.flatMap(g => {
                    const isOpen = Boolean(expanded[g.key]);
                    const appName = appNameById.get(g.refApplication) ?? g.refApplication;
                    const groupRow = (
                      <tr key={`g:${g.key}`} style={{ cursor: "pointer", ...(isOpen ? { background: "var(--color-skeleton-box)" } : {}) }} onClick={() => setExpanded(p => ({ ...p, [g.key]: !p[g.key] }))}>
                        <td style={s.td}>{isOpen ? "▾" : "▸"}</td>
                        <td style={s.td}><span style={badgeCat(g.category)}>{categoryLabel(t, g.category)}</span></td>
                        <td style={s.td} title={g.message}><div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.message}</div><div style={s.tdMuted}><span style={s.mono}>{g.fingerprint}</span></div></td>
                        <td style={s.td} title={appName}><div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{appName}</div></td>
                        <td style={s.td}>{g.occurrences}</td>
                        <td style={s.td}>{new Date(g.lastSeenAtUtc).toLocaleString()}</td>
                        {canPatch && <td style={{ ...s.td, textAlign: "right" }}><button type="button" style={{ ...s.btnSmall, ...(g.allPatched ? s.pillOk : g.anyPatched ? s.pillWarn : {}), ...(busy ? s.disabled : {}) }} disabled={busy} onClick={e => { e.stopPropagation(); onPatchGroup(g, !g.allPatched); }}>{g.allPatched ? t("logs.allPatched") : g.anyPatched ? t("logs.partialPatched") : t("logs.nonePatched")}</button></td>}
                      </tr>
                    );
                    if (!isOpen) return [groupRow];
                    const occRows = g.ids.map(id => logsById.get(id)).filter(Boolean).sort((a, b) => new Date((b as any).occurredAtUtc).getTime() - new Date((a as any).occurredAtUtc).getTime()).slice(0, 30).map(l => {
                      const id = (l!.id as any) as string;
                      const isPatched = Boolean(l!.isPatched);
                      const stack = extractStack((l!.payloadJson as any) as string);
                      return (
                        <tr key={`o:${g.key}:${id}`} style={s.subRow}>
                          <td style={s.subCell} colSpan={colSpan}>
                            <div style={s.subCard}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                  <span style={badgePatched(isPatched)}>{isPatched ? t("logs.patched") : t("logs.notPatched")}</span>
                                  <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{new Date((l!.occurredAtUtc as any) as string).toLocaleString()}</span>
                                  <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}><span style={s.mono}>{id}</span></span>
                                </div>
                                {canPatch && <button type="button" style={{ ...s.btnSmall, ...(isPatched ? s.pillOk : {}), ...(busy ? s.disabled : {}) }} disabled={busy} onClick={() => onPatchSingle(id, !isPatched)}>{isPatched ? t("logs.unpatch") : t("logs.patch")}</button>}
                              </div>
                              <div style={{ color: "var(--color-text-primary)", fontSize: 13 }}>{String(l!.message ?? "")}</div>
                              {stack ? <pre style={{ ...s.pre, ...s.mono }}>{stack}</pre> : null}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                    const limitedNote = g.ids.length > 30 ? [<tr key={`limit:${g.key}`} style={s.subRow}><td style={s.subCell} colSpan={colSpan}><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{t("logs.limited", { count: g.ids.length })}.</div></td></tr>] : [];
                    return [groupRow, ...occRows, ...limitedNote];
                  })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Page wrapper ──────────────────────────────────────────────────────────────
export default function OrgLogsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const [org, setOrg] = useState<OrgDto | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    authFetch<OrgDto>(`/organization/${id}`)
      .then(data => setOrg(data))
      .catch(() => {})
      .finally(() => setOrgLoading(false));
  }, [id]);

  if (orgLoading) return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)" }}>{t("common.loading")}</div>;
  if (!id) return null;

  const canPatch = org?.myRole === "Owner" || org?.myRole === "Maintainer";
  const pad = isMobile ? "12px 8px" : 24;

  return (
    <div className="animate-page" style={{ padding: pad }}>
      <button
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 14, padding: 0, marginBottom: 16 }}
        onClick={() => navigate(`/organizations/${id}`)}
      >
        <ArrowLeft size={16} /> {org?.name ?? t("organizations.title")}
      </button>
      <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)" }}>{t("logs.title")}</h1>
      {!canPatch && <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--color-text-muted)" }}>{t("organizations.orgReadOnly")}</p>}
      {canPatch && <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--color-text-muted)" }}>{t("logs.subtitle")}</p>}
      <OrgLogsContent orgId={id} canPatch={canPatch} />
    </div>
  );
}
