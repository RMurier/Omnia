import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { authFetch } from "../utils/authFetch";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { BREAKPOINTS } from "../hooks/breakpoints";

// ── Types ─────────────────────────────────────────────────────────────────────
type OrgDto = { id: string; name: string; isActive: boolean; myRole?: string | null };
type DashboardDaySeries = { date: string; refApplication: string; count: number };
type DashboardStats = { apps: Record<string, string>; dailySeries: DashboardDaySeries[] };

const PALETTE = ["#6366f1", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#0ea5e9", "#f97316", "#84cc16"];

function buildLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return days;
}

function fmtDay(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function ErrorBarChart({
  dailySeries,
  apps,
  days,
  height = 220,
}: {
  dailySeries: DashboardDaySeries[];
  apps: Record<string, string>;
  days: string[];
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [w, setW] = useState(600);
  const [hoverDayIdx, setHoverDayIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr?.width) setW(Math.max(280, Math.floor(cr.width)));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const appIds = useMemo(() => Object.keys(apps), [apps]);
  const numApps = appIds.length;

  const countMatrix = useMemo(
    () =>
      days.map((date) =>
        appIds.map((appId) => {
          const entry = dailySeries.find(
            (s) => s.date === date && s.refApplication.toLowerCase() === appId.toLowerCase()
          );
          return entry?.count ?? 0;
        })
      ),
    [days, appIds, dailySeries]
  );

  const maxCount = useMemo(() => {
    const flat = countMatrix.flat();
    const m = flat.length ? Math.max(...flat) : 0;
    if (m <= 0) return 5;
    const p = Math.pow(10, Math.floor(Math.log10(m)));
    return Math.ceil(m / p) * p;
  }, [countMatrix]);

  const pad = { l: 44, r: 12, t: 14, b: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const numDays = 7;
  const groupW = innerW / numDays;
  const groupPad = groupW * 0.12;
  const barsAreaW = groupW - groupPad * 2;
  const barW = numApps > 0 ? Math.max(2, barsAreaW / numApps - 1) : barsAreaW;

  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => (maxCount * i) / yTicks);

  function yAt(v: number) {
    return pad.t + (1 - v / maxCount) * innerH;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * w;
    const idx = Math.floor((relX - pad.l) / groupW);
    setHoverDayIdx(idx >= 0 && idx < numDays ? idx : null);
  }

  const tooltipItems = useMemo(() => {
    if (hoverDayIdx === null) return null;
    return appIds.map((appId, ai) => ({
      name: apps[appId] ?? appId,
      count: countMatrix[hoverDayIdx]?.[ai] ?? 0,
      color: PALETTE[ai % PALETTE.length],
    }));
  }, [hoverDayIdx, appIds, apps, countMatrix]);

  const tooltipX = hoverDayIdx !== null ? pad.l + hoverDayIdx * groupW + groupW / 2 : 0;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${height}`}
        style={{ display: "block", width: "100%", height }}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHoverDayIdx(null)}
      >
        {yTickVals.map((v, i) => {
          const y = yAt(v);
          return (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--color-border)" strokeWidth="1" />
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--color-text-muted)" fontWeight="700">
                {Math.round(v)}
              </text>
            </g>
          );
        })}
        <line x1={pad.l} x2={pad.l} y1={pad.t} y2={height - pad.b} stroke="var(--color-border-strong)" />
        <line x1={pad.l} x2={w - pad.r} y1={height - pad.b} y2={height - pad.b} stroke="var(--color-border-strong)" />
        {days.map((date, di) => (
          <text
            key={date}
            x={pad.l + di * groupW + groupW / 2}
            y={height - pad.b + 16}
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-text-muted)"
            fontWeight="700"
          >
            {fmtDay(date)}
          </text>
        ))}
        {days.map((date, di) => {
          const groupX = pad.l + di * groupW + groupPad;
          return appIds.map((appId, ai) => {
            const count = countMatrix[di]?.[ai] ?? 0;
            const barH = count === 0 ? 0 : Math.max(2, (count / maxCount) * innerH);
            return (
              <rect
                key={`${date}-${appId}`}
                x={groupX + ai * (barW + 1)}
                y={pad.t + innerH - barH}
                width={barW}
                height={barH}
                fill={PALETTE[ai % PALETTE.length]}
                rx={2}
                opacity={hoverDayIdx !== null && hoverDayIdx !== di ? 0.35 : 1}
              />
            );
          });
        })}
        {hoverDayIdx !== null && (
          <line
            x1={tooltipX}
            x2={tooltipX}
            y1={pad.t}
            y2={height - pad.b}
            stroke="var(--color-text-primary)"
            strokeOpacity="0.12"
            strokeWidth="1.5"
          />
        )}
      </svg>

      {hoverDayIdx !== null && tooltipItems && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: Math.min(tooltipX + 8, w - 180),
            minWidth: 160,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            padding: "8px 10px",
            boxShadow: "0 8px 32px var(--color-shadow-tooltip)",
            pointerEvents: "none",
            fontSize: 12,
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6, color: "var(--color-text-primary)" }}>
            {fmtDay(days[hoverDayIdx])}
          </div>
          {tooltipItems.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-secondary)", fontWeight: 700 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: it.color, display: "inline-block" }} />
                {it.name}
              </span>
              <span style={{ fontWeight: 900, color: "var(--color-text-primary)" }}>{it.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Podium ────────────────────────────────────────────────────────────────────
function Podium({
  apps,
  dailySeries,
  errorsLabel,
}: {
  apps: Record<string, string>;
  dailySeries: DashboardDaySeries[];
  errorsLabel: (n: number) => string;
}) {
  const ranked = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const s of dailySeries) {
      const id = s.refApplication.toLowerCase();
      totals[id] = (totals[id] ?? 0) + s.count;
    }
    return Object.entries(totals)
      .map(([id, total]) => {
        const name =
          apps[id] ??
          apps[Object.keys(apps).find((k) => k.toLowerCase() === id) ?? ""] ??
          id;
        return { id, name, total };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [apps, dailySeries]);

  if (ranked.length === 0) return null;

  const order = [ranked[1] ?? null, ranked[0] ?? null, ranked[2] ?? null];
  const heights = [76, 108, 56];
  const medals = ["🥈", "🥇", "🥉"];
  const colors = ["#94a3b8", "#f59e0b", "#cd7f32"];

  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, height: 130, padding: "0 4px" }}>
      {order.map((entry, idx) => {
        if (!entry) return <div key={idx} style={{ flex: 1 }} />;
        const color = colors[idx];
        return (
          <div
            key={entry.id}
            style={{
              flex: 1,
              height: heights[idx],
              background: `${color}18`,
              border: `1.5px solid ${color}`,
              borderRadius: "8px 8px 0 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px 4px",
              overflow: "hidden",
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{medals[idx]}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 900,
                textAlign: "center",
                color: "var(--color-text-primary)",
                lineHeight: 1.2,
                marginTop: 4,
                width: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {entry.name}
            </span>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, marginTop: 2 }}>
              {entry.total} {errorsLabel(entry.total)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const DAYS = buildLast7Days();

export default function OrganizationHomePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useMediaQuery(BREAKPOINTS.tablet);

  const [org, setOrg] = useState<OrgDto | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setOrgLoading(true);
    authFetch<OrgDto>(`/organization/${id}`)
      .then((data) => setOrg(data))
      .catch(() => {})
      .finally(() => setOrgLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    setDashLoading(true);
    authFetch<DashboardStats>(`/log/org-dashboard/${id}`)
      .then((data) => setDashboard(data))
      .catch(() => setDashboard(null))
      .finally(() => setDashLoading(false));
  }, [id]);

  const styles: Record<string, React.CSSProperties> = {
    page: { padding: isMobile ? "12px 8px" : 24, maxWidth: "min(96vw, 1400px)", margin: "0 auto" },
    back: { display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 14, padding: 0, marginBottom: 16 },
    headRow: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 20 },
    title: { fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)", margin: 0 },
    roleBadge: { fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 999, border: "1px solid var(--color-border)", color: "var(--color-text-muted)", background: "var(--color-surface)" },
    settingsBtn: { padding: "7px 14px", borderRadius: 8, border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 600, fontSize: 13 },
    dashGrid: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 280px", gap: 12 },
    dashCard: { border: "1px solid var(--color-border)", borderRadius: 14, background: "var(--color-surface)", padding: 16, minWidth: 0 },
    dashCardTitle: { margin: "0 0 12px", fontSize: 13, fontWeight: 900, color: "var(--color-text-primary)", textTransform: "uppercase" as const, letterSpacing: 0.4 },
    legend: { display: "flex", flexWrap: "wrap" as const, gap: "4px 12px", marginBottom: 8 },
    legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)" },
    legendDot: { width: 10, height: 10, borderRadius: 2, display: "inline-block" },
    muted: { fontSize: 13, color: "var(--color-text-muted)", fontWeight: 700 },
  };

  if (orgLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)" }}>{t("common.loading")}</div>;
  }
  if (!org) return null;

  return (
    <div className="animate-page" style={styles.page}>
      <button style={styles.back} onClick={() => navigate("/organizations")}>
        <ArrowLeft size={16} /> {t("organizations.title")}
      </button>

      <div style={styles.headRow}>
        <div>
          <h1 style={styles.title}>{org.name}</h1>
          {org.myRole && <span style={styles.roleBadge}>{org.myRole}</span>}
        </div>
        <button style={styles.settingsBtn} onClick={() => navigate(`/organizations/${id}/settings`)}>
          {t("organizations.settingsBtn")}
        </button>
      </div>

      {dashLoading && <p style={styles.muted}>{t("me.dashboardLoading")}</p>}

      {!dashLoading && dashboard && Object.keys(dashboard.apps).length === 0 && (
        <p style={styles.muted}>{t("me.dashboardNoData")}</p>
      )}

      {!dashLoading && dashboard && Object.keys(dashboard.apps).length > 0 && (
        <div style={styles.dashGrid}>
          <div style={styles.dashCard}>
            <h2 style={styles.dashCardTitle}>{t("me.dashboardChartTitle")}</h2>
            <div style={styles.legend}>
              {Object.entries(dashboard.apps).map(([id, name], i) => (
                <span key={id} style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: PALETTE[i % PALETTE.length] }} />
                  {name}
                </span>
              ))}
            </div>
            <ErrorBarChart dailySeries={dashboard.dailySeries} apps={dashboard.apps} days={DAYS} />
          </div>

          <div style={styles.dashCard}>
            <h2 style={styles.dashCardTitle}>{t("me.dashboardPodiumTitle")}</h2>
            <Podium
              apps={dashboard.apps}
              dailySeries={dashboard.dailySeries}
              errorsLabel={(n) => (n === 1 ? t("me.dashboardError") : t("me.dashboardErrors"))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
