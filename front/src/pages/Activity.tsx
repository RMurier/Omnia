import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Granularity } from "../interfaces/Granularity";
import type { SeriesPointActivity } from "../interfaces/SeriesPointActivity";
import type { ApplicationItem } from "../interfaces/ApplicationItem";
import { authFetch } from "../utils/authFetch";
import { useTranslation } from "react-i18next";
import { t } from "i18next";

type AppsMode = "all" | "select";

type SeriesPointActivityMulti = SeriesPointActivity & {
  refApplication?: string | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function normalizeGuid(s?: string | null) {
  return (s ?? "").trim().toLowerCase();
}

function isIsoWithTz(s: string) {
  return /([zZ]|[+\-]\d{2}:\d{2})$/.test(s);
}

function parseUtcMs(s?: string | null) {
  if (!s) return NaN;
  const raw = String(s).trim();
  const iso = isIsoWithTz(raw) ? raw : `${raw}Z`;
  const d = new Date(iso);
  return d.getTime();
}

function toDatetimeLocalFromIsoUtc(iso: string) {
  if (!iso) return "";
  const ms = parseUtcMs(iso);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function toIsoUtcFromDatetimeLocal(v: string) {
  if (!v) return "";
  return new Date(v).toISOString();
}

function buildQuery(params: Record<string, string | undefined | null>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s) continue;
    usp.set(k, s);
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function startOfPeriodUtcMs(ms: number, g: Granularity) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const h = d.getUTCHours();
  const min = d.getUTCMinutes();

  if (g === "minute") return Date.UTC(y, m, day, h, min, 0, 0);
  if (g === "hour") return Date.UTC(y, m, day, h, 0, 0, 0);
  if (g === "day") return Date.UTC(y, m, day, 0, 0, 0, 0);
  if (g === "month") return Date.UTC(y, m, 1, 0, 0, 0, 0);
  if (g === "year") return Date.UTC(y, 0, 1, 0, 0, 0, 0);

  const jsDay = new Date(Date.UTC(y, m, day, 0, 0, 0, 0)).getUTCDay() || 7;
  const diff = jsDay - 1;
  return Date.UTC(y, m, day - diff, 0, 0, 0, 0);
}

function getBucketStartUtcMs(ms: number, unit: Granularity, step: number) {
  const s = Math.max(1, Math.floor(step || 1));
  const d0 = new Date(ms);
  const d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate(), d0.getUTCHours(), d0.getUTCMinutes(), 0, 0));
  if (s <= 1) return startOfPeriodUtcMs(d.getTime(), unit);

  const epoch = Date.UTC(1970, 0, 1, 0, 0, 0, 0);

  if (unit === "minute") {
    const u = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), 0, 0);
    const total = Math.floor((u - epoch) / 60_000);
    const bucket = Math.floor(total / s) * s;
    return epoch + bucket * 60_000;
  }

  if (unit === "hour") {
    const u = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), 0, 0, 0);
    const total = Math.floor((u - epoch) / 3_600_000);
    const bucket = Math.floor(total / s) * s;
    return epoch + bucket * 3_600_000;
  }

  if (unit === "day") {
    const u = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
    const total = Math.floor((u - epoch) / 86_400_000);
    const bucket = Math.floor(total / s) * s;
    return epoch + bucket * 86_400_000;
  }

  if (unit === "week") {
    const weekStart = startOfPeriodUtcMs(d.getTime(), "week");
    const epochWeek = startOfPeriodUtcMs(epoch, "week");
    const totalWeeks = Math.floor((weekStart - epochWeek) / (7 * 86_400_000));
    const bucketWeeks = Math.floor(totalWeeks / s) * s;
    return epochWeek + bucketWeeks * 7 * 86_400_000;
  }

  if (unit === "month") {
    const totalMonths = d.getUTCFullYear() * 12 + d.getUTCMonth();
    const bucketMonths = Math.floor(totalMonths / s) * s;
    const year = Math.floor(bucketMonths / 12);
    const month = bucketMonths % 12;
    return Date.UTC(year, month, 1, 0, 0, 0, 0);
  }

  const year = d.getUTCFullYear();
  const bucketYears = Math.floor(year / s) * s;
  return Date.UTC(bucketYears, 0, 1, 0, 0, 0, 0);
}

function addStepUtcMs(ms: number, g: Granularity, step: number) {
  const d = new Date(ms);
  const s = Math.max(1, step || 1);

  if (g === "minute") return ms + s * 60_000;
  if (g === "hour") return ms + s * 3_600_000;
  if (g === "day") return ms + s * 86_400_000;
  if (g === "week") return ms + s * 7 * 86_400_000;
  if (g === "month") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + s, 1, 0, 0, 0, 0);
  return Date.UTC(d.getUTCFullYear() + s, 0, 1, 0, 0, 0, 0);
}

function fmtXTick(ms: number, g: Granularity) {
  const d = new Date(ms);
  if (g === "minute") return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  if (g === "hour") return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)} ${pad2(d.getUTCHours())}h`;
  if (g === "day") return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}`;
  if (g === "week") return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}`;
  if (g === "month") return `${pad2(d.getUTCMonth() + 1)}/${String(d.getUTCFullYear()).slice(-2)}`;
  return `${d.getUTCFullYear()}`;
}

function fmtUtcRangeLabel(startMs: number, unit: Granularity, step: number, tFn: (key: string) => string) {
  const endExclusive = addStepUtcMs(startMs, unit, Math.max(1, step || 1));
  const endMs = Math.max(startMs, endExclusive - 1);

  const start = new Date(startMs);
  const end = new Date(endMs);

  const dmy = (x: Date) => `${pad2(x.getUTCDate())}/${pad2(x.getUTCMonth() + 1)}/${x.getUTCFullYear()}`;
  const hm = (x: Date) => `${pad2(x.getUTCHours())}:${pad2(x.getUTCMinutes())}`;

  if (unit === "hour" && Math.max(1, step || 1) === 1) return `${dmy(start)} ${pad2(start.getUTCHours())}h`;
  if (unit === "day" && Math.max(1, step || 1) === 1) return `${dmy(start)}`;

  return `${tFn("activity.rangeFrom")} ${dmy(start)} ${hm(start)} ${tFn("activity.rangeTo")} ${dmy(end)} ${hm(end)}`;
}

function useDebouncedEffect(fn: () => void, deps: any[], delayMs: number) {
  useEffect(() => {
    const t = window.setTimeout(fn, delayMs);
    return () => window.clearTimeout(t);
  }, deps);
}

type ChartLine = { id: string; name: string; key: string };

function SkeletonChart({ height = 360 }: { height?: number }) {
  const styles: Record<string, React.CSSProperties> = {
    wrap: { border: "1px solid var(--color-border)", borderRadius: 14, background: "var(--color-surface)", padding: 12 },
    bar: { height: 14, borderRadius: 999, background: "var(--color-skeleton)", width: "42%" },
    bar2: { height: 12, borderRadius: 999, background: "var(--color-skeleton)", width: "28%" },
    box: { height, borderRadius: 12, background: "var(--color-skeleton-box)", border: "1px solid var(--color-skeleton)" },
    row: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    right: { display: "flex", gap: 10, alignItems: "center" },
    dot: { width: 10, height: 10, borderRadius: 999, background: "var(--color-skeleton)" },
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.row}>
        <div style={styles.bar} />
        <div style={styles.right}>
          <div style={styles.dot} />
          <div style={styles.bar2} />
        </div>
      </div>
      <div style={styles.box} />
    </div>
  );
}

function LineChart({
  rows,
  lines,
  tickGranularity,
  spacingUnit,
  spacingStep,
  height = 360,
  loading,
}: {
  rows: Array<{ ts: number; [k: string]: any }>;
  lines: ChartLine[];
  tickGranularity: Granularity;
  spacingUnit: Granularity;
  spacingStep: number;
  height?: number;
  loading?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [w, setW] = useState(800);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;

    const ro = new ResizeObserver((entries) => {
      const cr = entries?.[0]?.contentRect;
      if (cr?.width) setW(Math.max(320, Math.floor(cr.width)));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const padding = { l: 56, r: 18, t: 18, b: 44 };
  const innerW = Math.max(1, w - padding.l - padding.r);
  const innerH = Math.max(1, height - padding.t - padding.b);

  const xCount = rows.length;
  const xStep = xCount <= 1 ? innerW : innerW / (xCount - 1);

  const allValues = useMemo(() => {
    const vals: number[] = [];
    for (const r of rows) {
      for (const ln of lines) {
        const v = Number(r[ln.key] ?? 0);
        if (Number.isFinite(v)) vals.push(v);
      }
    }
    return vals;
  }, [rows, lines]);

  const maxY = useMemo(() => {
    let m = 0;
    for (let i = 0; i < allValues.length; i++) {
      const v = allValues[i];
      if (v > m) m = v;
    }
    if (m <= 10) return 10;
    const p = Math.pow(10, Math.floor(Math.log10(m)));
    return Math.ceil(m / p) * p;
  }, [allValues]);

  const yTicks = 5;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => (maxY * i) / yTicks);

  function xAt(i: number) {
    return padding.l + i * xStep;
  }

  function yAt(v: number) {
    const t = maxY === 0 ? 0 : v / maxY;
    return padding.t + (1 - t) * innerH;
  }

  const palette = ["#6366f1", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#0ea5e9", "#f97316", "#84cc16"];
  const colorForLine = (idx: number) => palette[idx % palette.length];

  const paths = useMemo(() => {
    return lines.map((ln, li) => {
      let d = "";
      rows.forEach((r, i) => {
        const x = xAt(i);
        const y = yAt(Number(r[ln.key] ?? 0));
        d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      });
      return { ln, d, color: colorForLine(li) };
    });
  }, [lines, rows, xStep, innerH, maxY, w, height]);

  function pickIdxFromClientX(clientX: number) {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const px = clientX - rect.left;
    const ix = Math.round((px - (padding.l * rect.width) / w) / ((xStep * rect.width) / w));
    return clamp(ix, 0, rows.length - 1);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!rows.length) return;
    const ix = pickIdxFromClientX(e.clientX);
    if (ix === null) return;
    setHoverIdx(ix);
  }

  const tooltip = useMemo(() => {
    if (hoverIdx === null) return null;
    const r = rows[hoverIdx];
    if (!r) return null;
    const items = lines.map((ln) => ({ name: ln.name, value: Number(r[ln.key] ?? 0) }));
    return { x: xAt(hoverIdx), row: r, items };
  }, [hoverIdx, rows, lines, xStep, w]);

  const styles: Record<string, React.CSSProperties> = {
    wrap: { border: "1px solid var(--color-border)", borderRadius: 14, background: "var(--color-surface)", padding: 12, position: "relative" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 },
    title: { fontWeight: 900, color: "var(--color-text-primary)" },
    legend: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
    legendItem: { display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 700 },
    dot: { width: 10, height: 10, borderRadius: 999 },
    svg: { display: "block", width: "100%", height, touchAction: "none" },
    tooltip: {
      position: "absolute",
      minWidth: 240,
      maxWidth: 360,
      border: "1px solid var(--color-border)",
      background: "var(--color-surface)",
      borderRadius: 12,
      padding: 12,
      boxShadow: "0 18px 60px var(--color-shadow-tooltip)",
      pointerEvents: "none",
      fontSize: 12,
      color: "var(--color-text-primary)",
      lineHeight: 1.35,
      top: 52,
    },
    tooltipTitle: { fontWeight: 900, marginBottom: 8 },
    ttRow: { display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 },
    ttKey: { display: "flex", gap: 8, alignItems: "center" },
    ttVal: { fontWeight: 900 },
    loadingMask: {
      position: "absolute",
      inset: 0,
      borderRadius: 14,
      background: "var(--color-loading-mask)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 900,
      color: "var(--color-text-secondary)",
    },
  };

  return (
    <div style={styles.wrap} ref={wrapRef}>
      <div style={styles.header}>
        <div style={styles.title}>{t("activity.connectionsSeries")}</div>
        <div style={styles.legend}>
          {lines.map((ln, i) => (
            <div key={ln.id} style={styles.legendItem} title={ln.name}>
              <span style={{ ...styles.dot, background: colorForLine(i) }} />
              <span style={{ whiteSpace: "nowrap", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>{ln.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div onPointerMove={onPointerMove} onPointerLeave={() => setHoverIdx(null)} onPointerDown={onPointerMove}>
        <svg ref={svgRef} style={styles.svg} viewBox={`0 0 ${w} ${height}`} role="img" aria-label="Activity chart">
          <g>
            {yTickVals.map((v, i) => {
              const y = yAt(v);
              return (
                <g key={i}>
                  <line x1={padding.l} x2={w - padding.r} y1={y} y2={y} stroke="var(--color-border)" strokeWidth="1" />
                  <text x={padding.l - 10} y={y + 4} textAnchor="end" fontSize="11" fill="var(--color-text-muted)" fontWeight="700">
                    {Math.round(v)}
                  </text>
                </g>
              );
            })}
            <line x1={padding.l} x2={padding.l} y1={padding.t} y2={height - padding.b} stroke="var(--color-border-strong)" />
            <line x1={padding.l} x2={w - padding.r} y1={height - padding.b} y2={height - padding.b} stroke="var(--color-border-strong)" />
          </g>

          <g>
            {rows.map((r, i) => {
              const maxLabels = 6;
              const step = rows.length <= maxLabels ? 1 : Math.ceil(rows.length / maxLabels);
              if (i % step !== 0 && i !== rows.length - 1) return null;
              const x = xAt(i);
              return (
                <g key={String(r.ts)}>
                  <line x1={x} x2={x} y1={height - padding.b} y2={height - padding.b + 6} stroke="var(--color-border-strong)" />
                  <text x={x} y={height - padding.b + 22} textAnchor="middle" fontSize="11" fill="var(--color-text-muted)" fontWeight="700">
                    {fmtXTick(r.ts, tickGranularity)}
                  </text>
                </g>
              );
            })}
          </g>

          <g>
            {paths.map((p) => (
              <path key={p.ln.id} d={p.d} fill="none" stroke={p.color} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
            ))}
          </g>

          {hoverIdx !== null && rows[hoverIdx] ? (
            <g>
              <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={padding.t} y2={height - padding.b} stroke="var(--color-text-primary)" strokeOpacity="0.18" strokeWidth="2" />
              {lines.map((ln, li) => {
                const v = Number(rows[hoverIdx][ln.key] ?? 0);
                return <circle key={ln.id} cx={xAt(hoverIdx)} cy={yAt(v)} r="4.2" fill={colorForLine(li)} stroke="var(--color-surface)" strokeWidth="2" />;
              })}
            </g>
          ) : null}
        </svg>

        {tooltip ? (
          <div
            style={{
              ...styles.tooltip,
              left: clamp(tooltip.x - 100, 8, w - 8 - 260),
            }}
          >
            <div style={styles.tooltipTitle}>{fmtUtcRangeLabel(tooltip.row.ts, spacingUnit, spacingStep, t)}</div>
            {tooltip.items.map((it, i) => (
              <div key={i} style={styles.ttRow}>
                <div style={styles.ttKey}>
                  <span style={{ ...styles.dot, width: 9, height: 9, background: palette[i % palette.length] }} />
                  <span style={{ fontWeight: 800 }}>{it.name}</span>
                </div>
                <div style={styles.ttVal}>{it.value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {loading ? <div style={styles.loadingMask}>{t("activity.loadingMask")}</div> : null}
    </div>
  );
}

export default function AdminActivityPage() {
  const { t } = useTranslation();
  const [apps, setApps] = useState<ApplicationItem[]>([]);
  const [seriesRaw, setSeriesRaw] = useState<SeriesPointActivityMulti[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [pendingSeries, setPendingSeries] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const defaultFromLocal = useMemo(() => toDatetimeLocalFromIsoUtc(new Date(now.getTime() - 7 * 86400000).toISOString()), [now]);
  const defaultToLocal = useMemo(() => toDatetimeLocalFromIsoUtc(now.toISOString()), [now]);

  const [granularity, setGranularity] = useState<Granularity>("hour");
  const [fromLocal, setFromLocal] = useState<string>(defaultFromLocal);
  const [toLocal, setToLocal] = useState<string>(defaultToLocal);

  const [spacingUnit, setSpacingUnit] = useState<Granularity>("hour");
  const [spacingStep, setSpacingStep] = useState<number>(1);

  const [appsMode, setAppsMode] = useState<AppsMode>("all");
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [filterOneApp, setFilterOneApp] = useState<string>("");

  const appNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of apps as any[]) {
      const id = normalizeGuid(a?.id ?? a?.Id);
      const name = String(a?.name ?? a?.Name ?? "");
      if (id) m.set(id, name || id);
    }
    return m;
  }, [apps]);

  async function loadApps() {
    setLoadingApps(true);
    try {
      const data = await authFetch<ApplicationItem[]>("/application", { method: "GET" });
      setApps(data ?? []);
    } catch {
      setApps([]);
    } finally {
      setLoadingApps(false);
    }
  }

  async function loadSeries() {
    setLoadingSeries(true);
    setPendingSeries(false);
    setError(null);

    try {
      const fromUtc = fromLocal ? toIsoUtcFromDatetimeLocal(fromLocal) : undefined;
      const toUtc = toLocal ? toIsoUtcFromDatetimeLocal(toLocal) : undefined;

      const qs = buildQuery({
        granularity,
        fromUtc,
        toUtc,
      });

      const data = await authFetch<SeriesPointActivityMulti[]>(`/activity/series${qs}`, { method: "GET" });
      setSeriesRaw(data ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setSeriesRaw([]);
    } finally {
      setLoadingSeries(false);
    }
  }

  function refresh() {
    loadApps();
    loadSeries();
  }

  useEffect(() => {
    loadApps();
    loadSeries();
  }, []);

  useDebouncedEffect(() => {
    setPendingSeries(true);
  }, [granularity, fromLocal, toLocal], 50);

  useDebouncedEffect(() => {
    loadSeries();
  }, [granularity, fromLocal, toLocal], 1000);

  function toggleSelected(id: string) {
    setSelectedAppIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const chartBuild = useMemo(() => {
    const fromUtcIso = fromLocal ? toIsoUtcFromDatetimeLocal(fromLocal) : "";
    const toUtcIso = toLocal ? toIsoUtcFromDatetimeLocal(toLocal) : "";
    const fromMsRaw = fromUtcIso ? parseUtcMs(fromUtcIso) : Date.now() - 7 * 86400000;
    const toMsRaw = toUtcIso ? parseUtcMs(toUtcIso) : Date.now();

    const step = Math.max(1, Math.floor(spacingStep || 1));

    const fromBucket = getBucketStartUtcMs(fromMsRaw, spacingUnit, step);
    const toBucket = getBucketStartUtcMs(toMsRaw, spacingUnit, step);

    const hasAppId = (seriesRaw ?? []).some((x) => Boolean(normalizeGuid(x.refApplication ?? "")));
    const allIdsInSeries = Array.from(
      new Set(
        (seriesRaw ?? [])
          .map((p) => normalizeGuid(p.refApplication ?? ""))
          .filter(Boolean)
      )
    );

    let ids: string[] = [];
    if (hasAppId) {
      if (appsMode === "select" && selectedAppIds.length) ids = selectedAppIds.map(normalizeGuid).filter(Boolean);
      else ids = allIdsInSeries;

      if (filterOneApp) ids = [normalizeGuid(filterOneApp)];
    }

    const bucketTotals = new Map<number, number>();
    const bucketByApp = new Map<number, Map<string, number>>();

    for (const p of seriesRaw ?? []) {
      const periodStr = String(p.periodStartUtc ?? "");
      const periodTs = parseUtcMs(periodStr);
      if (!Number.isFinite(periodTs)) continue;

      const bucketTs = getBucketStartUtcMs(periodTs, spacingUnit, step);
      const c = p.connections ?? 0;

      if (!hasAppId) {
        bucketTotals.set(bucketTs, (bucketTotals.get(bucketTs) ?? 0) + c);
        continue;
      }

      const appId = normalizeGuid(p.refApplication ?? "");
      if (!appId) continue;
      if (ids.length && !ids.includes(appId)) continue;

      if (!bucketByApp.has(bucketTs)) bucketByApp.set(bucketTs, new Map());
      const m = bucketByApp.get(bucketTs)!;
      m.set(appId, (m.get(appId) ?? 0) + c);
    }

    const rows: Array<{ ts: number; [k: string]: any }> = [];
    for (let cur = fromBucket; cur <= toBucket; cur = addStepUtcMs(cur, spacingUnit, step)) {
      if (!hasAppId) {
        rows.push({ ts: cur, total: bucketTotals.get(cur) ?? 0 });
      } else {
        const m = bucketByApp.get(cur);
        const row: any = { ts: cur };
        for (const id of ids) row[id] = m?.get(id) ?? 0;
        rows.push(row);
      }
    }

    const lines: ChartLine[] = hasAppId
      ? ids.map((id) => ({ id, key: id, name: appNameById.get(id) || id }))
      : [{ id: "total", key: "total", name: t("activity.total") }];

    return { rows, lines };
  }, [seriesRaw, fromLocal, toLocal, spacingUnit, spacingStep, appsMode, selectedAppIds, filterOneApp, appNameById]);

  const styles: Record<string, React.CSSProperties> = {
    page: { padding: 24, maxWidth: 1280, margin: "0 auto" },
    topBar: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" },
    title: { margin: 0, fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)" },
    subtitle: { margin: "6px 0 0 0", color: "var(--color-text-muted)", fontSize: 14 },
    actions: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
    btn: { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", cursor: "pointer", fontWeight: 800 },

    section: { border: "1px solid var(--color-border)", borderRadius: 14, background: "var(--color-surface)", overflow: "hidden", marginBottom: 16 },
    sectionHeader: { padding: "12px 14px", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-raised)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
    sectionTitle: { margin: 0, fontSize: 13, fontWeight: 900, color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: 0.4 },
    sectionBody: { padding: 14 },

    grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    field: { display: "grid", gap: 6, minWidth: 0 },
    label: { fontSize: 12, fontWeight: 900, color: "var(--color-text-secondary)" },
    input: { height: 42, borderRadius: 10, border: "1px solid var(--color-border-strong)", padding: "0 12px", outline: "none", fontSize: 14, background: "var(--color-surface)", width: "100%", boxSizing: "border-box" },
    help: { fontSize: 12, color: "var(--color-text-muted)" },
    err: { border: "1px solid var(--color-error)", background: "var(--color-error-bg)", color: "var(--color-error-text)", padding: 12, borderRadius: 12, marginBottom: 12, fontSize: 13, fontWeight: 800 },

    multiselect: { border: "1px solid var(--color-border-strong)", borderRadius: 12, background: "var(--color-surface)", padding: 10, maxHeight: 190, overflow: "auto" },
    checkRow: { display: "flex", alignItems: "center", gap: 10, padding: "6px 6px", borderRadius: 10 },
    pill: { display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 900, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" },
  };

  const showChartSkeleton = loadingSeries || pendingSeries;

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>{t("activity.title")}</h1>
          <p style={styles.subtitle}>{t("activity.subtitle")}</p>
        </div>
        <div style={styles.actions}>
          <button style={styles.btn} onClick={refresh} disabled={loadingApps || loadingSeries}>
            {t("common.refresh")}
          </button>
        </div>
      </div>

      {error ? <div style={styles.err}>{error}</div> : null}

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>{t("activity.filters")}</h2>
        </div>

        <div style={styles.sectionBody}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={styles.grid3}>
              <div style={styles.field}>
                <label style={styles.label}>{t("activity.granularityServer")}</label>
                <select style={styles.input} value={granularity} onChange={(e) => setGranularity(e.target.value as Granularity)}>
                  <option value="minute">{t("activity.granularityMinute")}</option>
                  <option value="hour">{t("activity.granularityHour")}</option>
                  <option value="day">{t("activity.granularityDay")}</option>
                  <option value="week">{t("activity.granularityWeek")}</option>
                  <option value="month">{t("activity.months")}</option>
                  <option value="year">{t("activity.years")}</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{t("activity.fromLocal")}</label>
                <input style={styles.input} type="datetime-local" value={fromLocal} onChange={(e) => setFromLocal(e.target.value)} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{t("activity.toLocal")}</label>
                <input style={styles.input} type="datetime-local" value={toLocal} onChange={(e) => setToLocal(e.target.value)} />
              </div>
            </div>

            <div style={styles.grid3}>
              <div style={styles.field}>
                <label style={styles.label}>{t("activity.spacingUnit")}</label>
                <select style={styles.input} value={spacingUnit} onChange={(e) => setSpacingUnit(e.target.value as Granularity)}>
                  <option value="minute">{t("activity.minutes")}</option>
                  <option value="hour">{t("activity.hours")}</option>
                  <option value="day">{t("activity.days")}</option>
                  <option value="week">{t("activity.weeks")}</option>
                  <option value="month">{t("activity.months")}</option>
                  <option value="year">{t("activity.years")}</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{t("activity.spacingStep")}</label>
                <input
                  style={styles.input}
                  type="number"
                  min={1}
                  value={String(spacingStep)}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setSpacingStep(Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1);
                  }}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{t("activity.filterOneApp")}</label>
                <select style={styles.input} value={filterOneApp} onChange={(e) => setFilterOneApp(e.target.value)}>
                  <option value="">{t("activity.all")}</option>
                  {(apps as any[]).map((a) => {
                    const id = String(a?.id ?? a?.Id ?? "");
                    const name = String(a?.name ?? a?.Name ?? id);
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div style={styles.grid3}>
              <div style={styles.field}>
                <label style={styles.label}>{t("activity.curves")}</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", height: 42 }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 800, color: "var(--color-text-secondary)" }}>
                    <input type="radio" checked={appsMode === "all"} onChange={() => setAppsMode("all")} />
                    {t("activity.curvesAll")}
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 800, color: "var(--color-text-secondary)" }}>
                    <input type="radio" checked={appsMode === "select"} onChange={() => setAppsMode("select")} />
                    {t("activity.curvesSelect")}
                  </label>
                  {appsMode === "select" ? <span style={styles.pill}>{selectedAppIds.length ? t("activity.selectedCount", { count: selectedAppIds.length }) : t("activity.noSelection")}</span> : null}
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>{t("activity.debug")}</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", height: 42 }}>
                  <span style={styles.pill}>{t("activity.points")}: {seriesRaw.length}</span>
                  <span style={styles.pill}>{t("activity.rows")}: {chartBuild.rows.length}</span>
                  <span style={styles.pill}>{t("activity.lines")}: {chartBuild.lines.length}</span>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>{t("activity.applications")}</label>
                <span style={styles.help}>{loadingApps ? t("activity.appsLoading") : t("activity.appsCount", { count: apps.length })}</span>
              </div>
            </div>

            {appsMode === "select" ? (
              <div style={styles.grid2}>
                <div style={styles.field}>
                  <label style={styles.label}>{t("activity.selectApps")}</label>
                  <div style={styles.multiselect}>
                    {(apps as any[]).map((a) => {
                      const id = String(a?.id ?? a?.Id ?? "");
                      const name = String(a?.name ?? a?.Name ?? id);
                      return (
                        <label key={id} style={styles.checkRow} title={id}>
                          <input type="checkbox" checked={selectedAppIds.includes(id)} onChange={() => toggleSelected(id)} />
                          <span style={{ fontWeight: 900, color: "#111827" }}>{name}</span>
                          <span style={{ color: "#6b7280", fontSize: 12, marginLeft: "auto" }}>{id}</span>
                        </label>
                      );
                    })}
                    {!apps.length ? <div style={{ padding: 10, color: "#6b7280", fontSize: 12 }}>{t("activity.noneApp")}</div> : null}
                  </div>
                </div>
                <div />
              </div>
            ) : null}

            {showChartSkeleton ? (
              <SkeletonChart height={360} />
            ) : (
              <LineChart
                rows={chartBuild.rows}
                lines={chartBuild.lines}
                tickGranularity={spacingUnit}
                spacingUnit={spacingUnit}
                spacingStep={spacingStep}
                height={360}
                loading={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}