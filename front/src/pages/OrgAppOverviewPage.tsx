import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { authFetch } from "../utils/authFetch";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { BREAKPOINTS } from "../hooks/breakpoints";
import { OrgActivityContent } from "./OrgActivityPage";
import { OrgLogsContent } from "./OrgLogsPage";

type OrgDto = { id: string; name: string; isActive: boolean; myRole?: string | null };
type OrgApp = { id: string; name?: string | null };

type Tab = "activity" | "logs";

export default function OrgAppOverviewPage() {
  const { orgId, appId } = useParams<{ orgId: string; appId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);

  const [org, setOrg] = useState<OrgDto | null>(null);
  const [appName, setAppName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("activity");

  useEffect(() => {
    if (!orgId || !appId) return;
    setLoading(true);
    Promise.all([
      authFetch<OrgDto>(`/organization/${orgId}`).catch(() => null),
      authFetch<OrgApp[]>(`/organization/${orgId}/apps`).catch(() => [] as OrgApp[]),
    ]).then(([orgData, apps]) => {
      if (orgData) setOrg(orgData);
      const found = (apps ?? []).find(a => a.id === appId);
      if (found) setAppName(found.name ?? null);
    }).finally(() => setLoading(false));
  }, [orgId, appId]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)" }}>{t("common.loading")}</div>;
  if (!orgId || !appId) return null;

  const canPatch = org?.myRole === "Owner" || org?.myRole === "Maintainer";
  const displayName = appName ?? appId;
  const pad = isMobile ? "12px 8px" : isTablet ? "16px 12px" : 24;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: isMobile ? "8px 12px" : "10px 18px",
    fontWeight: 600,
    fontSize: isMobile ? 13 : 14,
    cursor: "pointer",
    border: "none",
    background: "none",
    borderBottom: active ? "2px solid var(--color-primary)" : "2px solid transparent",
    color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
    whiteSpace: "nowrap" as const,
  });

  return (
    <div className="animate-page" style={{ padding: pad }}>
      <button
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 14, padding: 0, marginBottom: 16 }}
        onClick={() => navigate(`/organizations/${orgId}`)}
      >
        <ArrowLeft size={16} /> {org?.name ?? t("organizations.title")}
      </button>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 900, color: "var(--color-text-primary)" }}>
          {displayName}
        </h1>
        {org?.name && (
          <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>{org.name}</div>
        )}
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)", marginBottom: 24, gap: 0, overflowX: "auto" }}>
        <button style={tabStyle(tab === "activity")} onClick={() => setTab("activity")}>
          {t("organizations.tabActivity")}
        </button>
        <button style={tabStyle(tab === "logs")} onClick={() => setTab("logs")}>
          {t("organizations.tabLogs")}
        </button>
      </div>

      {tab === "activity" && (
        <OrgActivityContent orgId={orgId} fixedAppId={appId} />
      )}

      {tab === "logs" && (
        <>
          {!canPatch && (
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
              {t("organizations.orgReadOnly")}
            </p>
          )}
          <OrgLogsContent orgId={orgId} fixedAppId={appId} canPatch={canPatch} />
        </>
      )}
    </div>
  );
}
