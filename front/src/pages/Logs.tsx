import React, { useEffect, useMemo, useState } from "react";
import type { ApplicationItem } from "../interfaces/ApplicationItem";
import type { LogDto } from "../interfaces/LogDto";
import type { LogGroupUi } from "../interfaces/LogGroupUi";
import { authFetch } from "../utils/authFetch";
import { useTranslation } from "react-i18next";

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

function safeParseJson(s?: string | null): any | null {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function extractStack(payloadJson?: string | null): string | null {
  const j = safeParseJson(payloadJson);
  if (!j) return null;

  // Common stack trace field names across languages
  const stackFields = [
    // JavaScript/Node.js
    "stack",
    "stackTrace",
    // Python
    "traceback",
    "tb",
    "exc_info",
    // Ruby
    "backtrace",
    // PHP/Java
    "trace",
    // Go
    "stacktrace",
    // Generic
    "exception",
    "frames",
  ];

  // Check root level
  for (const field of stackFields) {
    if (j[field]) return String(j[field]);
  }

  // Check inside error/exception object
  const errorObj = j.error ?? j.exception ?? j.err ?? j.exc ?? null;
  if (errorObj && typeof errorObj === "object") {
    for (const field of stackFields) {
      if (errorObj[field]) return String(errorObj[field]);
    }
  }

  // Check for array of frames (Sentry-style)
  if (Array.isArray(j.frames)) {
    return j.frames.map((f: any) => `  at ${f.function || f.method || "?"} (${f.filename || f.file || "?"}:${f.lineno || f.line || "?"})`).join("\n");
  }
  if (Array.isArray(errorObj?.frames)) {
    return errorObj.frames.map((f: any) => `  at ${f.function || f.method || "?"} (${f.filename || f.file || "?"}:${f.lineno || f.line || "?"})`).join("\n");
  }

  return null;
}

function categoryLabel(t: (key: string) => string, c?: string | null) {
  const v = (c || "").toLowerCase();
  switch (v) {
    case "connection":
      return t("logs.connection");
    case "error":
      return t("logs.error");
    case "warning":
      return t("logs.warning");
    case "info":
      return t("logs.info");
    case "debug":
      return t("logs.debug");
    case "exception":
      return t("logs.exception");
    case "http":
      return t("logs.http");
    case "validation":
      return t("logs.validation");
    case "security":
      return t("logs.security");
    default:
      return c || "-";
  }
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    const onChange = () => setMatches(Boolean(m.matches));
    onChange();

    if ((m as any).addEventListener) (m as any).addEventListener("change", onChange);
    else (m as any).addListener(onChange);

    return () => {
      if ((m as any).removeEventListener) (m as any).removeEventListener("change", onChange);
      else (m as any).removeListener(onChange);
    };
  }, [query]);

  return matches;
}

function sortGroups(items: LogGroupUi[], sortBy: "lastSeen" | "occurrences" | "firstSeen", sortDir: "desc" | "asc") {
  const dir = sortDir === "asc" ? 1 : -1;

  const getKey = (g: LogGroupUi) => {
    if (sortBy === "occurrences") return g.occurrences;
    if (sortBy === "firstSeen") return new Date(g.firstSeenAtUtc).getTime();
    return new Date(g.lastSeenAtUtc).getTime();
  };

  return [...items].sort((a, b) => {
    const ka = getKey(a);
    const kb = getKey(b);

    if (ka < kb) return -1 * dir;
    if (ka > kb) return 1 * dir;

    const am = (a.message || "").toLowerCase();
    const bm = (b.message || "").toLowerCase();
    if (am < bm) return -1;
    if (am > bm) return 1;
    return 0;
  });
}

export default function LogsPage() {
  const { t } = useTranslation();
  const [apps, setApps] = useState<ApplicationItem[]>([]);
  const [rawLogs, setRawLogs] = useState<LogDto[]>([]);

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [applicationId, setApplicationId] = useState<string>("all");
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

  const isNarrow = useMediaQuery("(max-width: 980px)");
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

  async function loadLogs() {
    setLoading(true);
    setError(null);

    try {
      const data = await authFetch<LogDto[]>("/log", { method: "GET" });
      setRawLogs(data ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApps();
    loadLogs();
  }, []);

  const filters = useMemo(() => {
    const fromMs = dateFrom ? startOfDayMs(dateFrom) : null;
    const toMs = dateTo ? endOfDayMs(dateTo) : null;
    const isPatched = patched === "all" ? null : patched === "true" ? true : patched === "false" ? false : null;

    return {
      refApplication: applicationId !== "all" ? applicationId : null,
      category: category !== "all" ? category.toLowerCase() : null,
      level: level !== "all" ? level.toLowerCase() : null,
      isPatched,
      fromMs,
      toMs,
      search: search.trim().toLowerCase(),
    };
  }, [applicationId, category, level, patched, dateFrom, dateTo, search]);

  const filteredLogs = useMemo(() => {
    return (rawLogs ?? []).filter((l) => {
      const refApp = (l.refApplication ?? "").trim();
      const fpRaw = (l.fingerprint ?? "").trim();
      const effectiveFp = fpRaw || fallbackFingerprint(l);

      const msg = (l.message ?? "").toLowerCase();
      const cat = (l.category ?? "").toLowerCase();
      const lvl = (l.level ?? "").toLowerCase();
      const isPat = Boolean(l.isPatched);
      const occurredAt = l.occurredAtUtc ? new Date(l.occurredAtUtc).getTime() : NaN;

      // ⚠️ ne bloque plus sur fingerprint vide, on utilise effectiveFp
      if (!refApp || !effectiveFp) return false;

      if (filters.refApplication && refApp !== filters.refApplication) return false;
      if (filters.category && cat !== filters.category) return false;
      if (filters.level && lvl !== filters.level) return false;
      if (filters.isPatched !== null && isPat !== filters.isPatched) return false;

      if (filters.fromMs !== null) {
        if (!Number.isFinite(occurredAt) || occurredAt < filters.fromMs) return false;
      }
      if (filters.toMs !== null) {
        if (!Number.isFinite(occurredAt) || occurredAt > filters.toMs) return false;
      }

      if (filters.search) {
        if (!msg.includes(filters.search)) return false;
      }

      return true;
    });
  }, [rawLogs, filters]);


  const groups = useMemo<LogGroupUi[]>(() => {
    const map = new Map<string, LogGroupUi>();

    for (const l of filteredLogs) {
      const fpRaw = (l.fingerprint ?? "").trim();
      const fp = fpRaw || fallbackFingerprint(l);

      const ref = (l.refApplication ?? "").trim();
      const id = (l.id as any) as string;

      if (!fp || !ref || !id) continue;

      const occurred = l.occurredAtUtc ?? new Date().toISOString();
      const key = `${ref}::${fp}`;


      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          fingerprint: fp,
          refApplication: ref,
          category: (l.category ?? "error").toString(),
          level: (l.level ?? "error").toString(),
          message: (l.message ?? "").toString(),
          occurrences: 1,
          firstSeenAtUtc: occurred,
          lastSeenAtUtc: occurred,
          anyPatched: Boolean(l.isPatched),
          allPatched: Boolean(l.isPatched),
          ids: [id],
        });
      } else {
        existing.occurrences += 1;
        existing.ids.push(id);

        const occurredMs = new Date(occurred).getTime();
        const firstMs = new Date(existing.firstSeenAtUtc).getTime();
        const lastMs = new Date(existing.lastSeenAtUtc).getTime();

        if (Number.isFinite(occurredMs) && occurredMs < firstMs) existing.firstSeenAtUtc = occurred;
        if (Number.isFinite(occurredMs) && occurredMs > lastMs) existing.lastSeenAtUtc = occurred;

        const p = Boolean(l.isPatched);
        existing.anyPatched = existing.anyPatched || p;
        existing.allPatched = existing.allPatched && p;
      }
    }

    return sortGroups(Array.from(map.values()), sortBy, sortDir);
  }, [filteredLogs, sortBy, sortDir]);

  const logsById = useMemo(() => {
    const m = new Map<string, LogDto>();
    for (const l of filteredLogs) {
      const id = (l.id as any) as string;
      if (id) m.set(id, l);
    }
    return m;
  }, [filteredLogs]);

  const styles: Record<string, React.CSSProperties> = {
    page: { padding: 20, maxWidth: "min(99vw, 3600px)", margin: "0 auto" },
    topBar: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 },
    title: { margin: 0, fontSize: 22, fontWeight: 900, color: "#111827" },
    subtitle: { margin: "6px 0 0", color: "#6b7280", fontSize: 14 },
    panel: { border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 14, marginBottom: 12 },

    filtersGrid: { display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 14, alignItems: "end" },
    filterBlock: { padding: 10, borderRadius: 12, border: "1px solid #eef2f7", background: "#fafafa", minWidth: 0 },
    field: { display: "grid", gap: 6 },
    col3: { gridColumn: "span 3", minWidth: 0 },
    col2: { gridColumn: "span 2", minWidth: 0 },
    col3Mobile: { gridColumn: "span 6", minWidth: 0 },
    col2Mobile: { gridColumn: "span 6", minWidth: 0 },

    label: { display: "block", fontSize: 12, fontWeight: 800, color: "#374151" },
    input: { height: 40, borderRadius: 10, border: "1px solid #d1d5db", padding: "0 12px", outline: "none", fontSize: 14, width: "100%", background: "#fff", boxSizing: "border-box" },

    btn: { padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 14, whiteSpace: "nowrap" },
    btnSmall: { padding: "7px 10px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" },
    disabled: { opacity: 0.6, cursor: "not-allowed" },

    error: { border: "1px solid #ef4444", background: "#fef2f2", color: "#991b1b", padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 14 },

    card: { border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", overflow: "hidden" },
    listWrap: { overflow: "auto" },

    table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: 980 },
    th: { position: "sticky", top: 0, zIndex: 2, textAlign: "left", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: "#6b7280", padding: "12px 14px", borderBottom: "1px solid #e5e7eb", background: "#fafafa", whiteSpace: "nowrap" },
    td: { padding: "12px 14px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top", color: "#111827", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis" },
    tdMuted: { color: "#6b7280", fontSize: 12, marginTop: 6 },

    groupRow: { cursor: "pointer" },
    expandedRow: { background: "#f8fafc" },

    badge: { display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 900, border: "1px solid #e5e7eb", background: "#fff", color: "#111827", whiteSpace: "nowrap" },
    pillBad: { borderColor: "#ef4444", color: "#7f1d1d", background: "#fef2f2" },
    pillWarn: { borderColor: "#f59e0b", color: "#7c2d12", background: "#fffbeb" },
    pillOk: { borderColor: "#10b981", color: "#065f46", background: "#ecfdf5" },

    subRow: { background: "#ffffff" },
    subCell: { padding: "10px 14px", borderBottom: "1px solid #eef2f7", fontSize: 13, color: "#111827" },
    subCard: { border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 12, display: "grid", gap: 8 },

    mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
    pre: { margin: 0, padding: 12, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fafafa", overflowX: "auto", fontSize: 12, lineHeight: 1.5, color: "#111827" },
  };

  function categoryBadgeStyle(cat: string): React.CSSProperties {
    const v = (cat || "").toLowerCase();
    if (v === "error" || v === "exception") return { ...styles.badge, ...styles.pillBad };
    if (v === "warning") return { ...styles.badge, ...styles.pillWarn };
    return styles.badge;
  }

  function patchedBadgeStyle(isPatched: boolean): React.CSSProperties {
    if (isPatched) return { ...styles.badge, ...styles.pillOk };
    return styles.badge;
  }

  const col3 = isNarrow ? styles.col3Mobile : styles.col3;
  const col2 = isNarrow ? styles.col2Mobile : styles.col2;

  async function patchMany(ids: string[], value: boolean) {
    await authFetch<LogDto[]>("/log/patch", {
      method: "PATCH",
      body: JSON.stringify({ ids, value }),
    });

    setRawLogs((prev) =>
      prev.map((l) => {
        const id = (l.id as any) as string;
        if (!id) return l;
        if (!ids.includes(id)) return l;
        return { ...l, isPatched: value };
      })
    );
  }

  function fallbackFingerprint(l: LogDto): string {
    const ref = l.refApplication ?? "";
    const cat = (l.category ?? "").toLowerCase();
    const lvl = (l.level ?? "").toLowerCase();
    const msg = (l.message ?? "").trim().toLowerCase();
    const payload = (l.payloadJson ?? "").trim();

    return `${ref}|${cat}|${lvl}|${msg}|${payload}`.slice(0, 512);
  }


  async function onPatchSingle(id: string, value: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);

    const snapshot = rawLogs;

    setRawLogs((prev) =>
      prev.map((l) => {
        const lid = (l.id as any) as string;
        if (lid !== id) return l;
        return { ...l, isPatched: value };
      })
    );

    try {
      await patchMany([id], value);
    } catch (e: any) {
      setRawLogs(snapshot);
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function onPatchGroup(group: LogGroupUi, value: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);

    const ids = group.ids;
    const snapshot = rawLogs;

    setRawLogs((prev) =>
      prev.map((l) => {
        const lid = (l.id as any) as string;
        if (!lid || !ids.includes(lid)) return l;
        return { ...l, isPatched: value };
      })
    );

    try {
      await patchMany(ids, value);
    } catch (e: any) {
      setRawLogs(snapshot);
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>{t("logs.title")}</h1>
          <p style={styles.subtitle}>{t("logs.subtitle")}</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button style={{ ...styles.btn, ...(canRefresh ? {} : styles.disabled) }} onClick={loadLogs} disabled={!canRefresh}>
            {t("common.refresh")}
          </button>
        </div>
      </div>

      <div style={styles.panel}>
        <div style={styles.filtersGrid}>
          <div style={col3}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("logs.application")}</label>
                <select style={styles.input} value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
                  <option value="all">{t("logs.all")}</option>
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
                <label style={styles.label}>{t("logs.category")}</label>
                <select style={styles.input} value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="all">{t("logs.all")}</option>
                  <option value="exception">{t("logs.exception")}</option>
                  <option value="http">{t("logs.http")}</option>
                  <option value="validation">{t("logs.validation")}</option>
                  <option value="security">{t("logs.security")}</option>
                  <option value="connection">{t("logs.connection")}</option>
                  <option value="error">{t("logs.error")}</option>
                  <option value="warning">{t("logs.warning")}</option>
                  <option value="info">{t("logs.info")}</option>
                  <option value="debug">{t("logs.debug")}</option>
                </select>
              </div>
            </div>
          </div>

          <div style={col2}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("logs.level")}</label>
                <select style={styles.input} value={level} onChange={(e) => setLevel(e.target.value)}>
                  <option value="all">{t("logs.levelAll")}</option>
                  <option value="debug">{t("logs.levelDebug")}</option>
                  <option value="info">{t("logs.levelInfo")}</option>
                  <option value="warning">{t("logs.levelWarning")}</option>
                  <option value="error">{t("logs.levelError")}</option>
                  <option value="critical">{t("logs.levelCritical")}</option>
                </select>
              </div>
            </div>
          </div>

          <div style={col2}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("logs.patched")}</label>
                <select style={styles.input} value={patched} onChange={(e) => setPatched(e.target.value)}>
                  <option value="all">{t("logs.levelAll")}</option>
                  <option value="true">{t("logs.patched")}</option>
                  <option value="false">{t("logs.notPatched")}</option>
                </select>
              </div>
            </div>
          </div>

          <div style={col2}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("logs.from")}</label>
                <input style={styles.input} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
            </div>
          </div>

          <div style={col2}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("logs.to")}</label>
                <input style={styles.input} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          </div>

          <div style={col3}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("logs.search")}</label>
                <input style={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("logs.searchPlaceholder")} />
              </div>
            </div>
          </div>

          <div style={col2}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("logs.sortBy")}</label>
                <select style={styles.input} value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                  <option value="lastSeen">{t("logs.sortLastSeen")}</option>
                  <option value="occurrences">{t("logs.sortOccurrences")}</option>
                  <option value="firstSeen">{t("logs.sortFirstSeen")}</option>
                </select>
              </div>
            </div>
          </div>

          <div style={col2}>
            <div style={styles.filterBlock}>
              <div style={styles.field}>
                <label style={styles.label}>{t("logs.sortOrder")}</label>
                <select style={styles.input} value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
                  <option value="desc">{t("logs.sortDesc")}</option>
                  <option value="asc">{t("logs.sortAsc")}</option>
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
                <th style={styles.th}>{t("logs.tableCategory")}</th>
                <th style={styles.th}>{t("logs.tableError")}</th>
                <th style={styles.th}>{t("logs.app")}</th>
                <th style={styles.th}>{t("logs.occurrences")}</th>
                <th style={styles.th}>{t("logs.lastSeen")}</th>
                <th style={{ ...styles.th, textAlign: "right" }}>{t("logs.patchGroup")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td style={styles.td} colSpan={7}>
                    {t("logs.loading")}
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={7}>
                    {t("logs.none")}
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
                      <td style={styles.td}>{isOpen ? "▾" : "▸"}</td>
                      <td style={styles.td}>
                        <span style={categoryBadgeStyle(g.category)}>{categoryLabel(t, g.category)}</span>
                      </td>
                      <td style={styles.td} title={g.message}>
                        <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.message}</div>
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
                          {g.allPatched ? t("logs.allPatched") : g.anyPatched ? t("logs.partialPatched") : t("logs.nonePatched")}
                        </button>
                      </td>
                    </tr>
                  );

                  if (!isOpen) return [groupRow];

                  const occurrenceRows = g.ids
                    .map((id) => logsById.get(id))
                    .filter(Boolean)
                    .sort((a, b) => new Date((b as any).occurredAtUtc).getTime() - new Date((a as any).occurredAtUtc).getTime())
                    .slice(0, 30)
                    .map((l) => {
                      const id = (l!.id as any) as string;
                      const occurredAtUtc = (l!.occurredAtUtc as any) as string;
                      const stack = extractStack((l!.payloadJson as any) as string);
                      const isPatched = Boolean(l!.isPatched);

                      return (
                        <tr key={`o:${g.key}:${id}`} style={styles.subRow}>
                          <td style={styles.subCell} colSpan={7}>
                            <div style={styles.subCard}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                  <span style={patchedBadgeStyle(isPatched)}>{isPatched ? t("logs.patched") : t("logs.notPatched")}</span>
                                  <span style={{ color: "#6b7280", fontSize: 12 }}>{new Date(occurredAtUtc).toLocaleString()}</span>
                                  <span style={{ color: "#6b7280", fontSize: 12 }}>
                                    <span style={styles.mono}>{id}</span>
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  style={{ ...styles.btnSmall, ...(isPatched ? styles.pillOk : {}), ...(busy ? styles.disabled : {}) }}
                                  disabled={busy}
                                  onClick={() => onPatchSingle(id, !isPatched)}
                                >
                                  {isPatched ? t("logs.unpatch") : t("logs.patch")}
                                </button>
                              </div>

                              <div style={{ color: "#111827", fontSize: 13 }}>{(l!.message ?? "") as any}</div>
                              {stack ? <pre style={{ ...styles.pre, ...(styles.mono as any) }}>{stack}</pre> : null}
                            </div>
                          </td>
                        </tr>
                      );
                    });

                  const limitedNote =
                    g.ids.length > 30 ? (
                      <tr key={`limit:${g.key}`} style={styles.subRow}>
                        <td style={styles.subCell} colSpan={7}>
                          <div style={{ color: "#6b7280", fontSize: 12 }}>{t("logs.limited", { count: g.ids.length })}.</div>
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