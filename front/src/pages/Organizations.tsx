import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../utils/authFetch";
import { toast } from "sonner";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { BREAKPOINTS } from "../hooks/breakpoints";

type OrgItem = {
  id: string;
  name: string;
  isActive: boolean;
  lastActiveAt?: string | null;
  createdAt: string;
  myRole?: string | null;
  memberCount: number;
  appCount: number;
};

type OrgApp = {
  id: string;
  name?: string | null;
  url?: string | null;
  isActive?: boolean;
  myRole?: string | null;
};

export default function OrganizationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);

  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [orgApps, setOrgApps] = useState<Record<string, OrgApp[]>>({});
  const [orgAppsLoading, setOrgAppsLoading] = useState<string | null>(null);

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadOrgs();
  }, []);

  async function loadOrgs() {
    setLoading(true);
    try {
      const data = await authFetch<OrgItem[]>("/organization");
      setOrgs(data ?? []);
    } catch {
      // stay empty
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(orgId: string) {
    if (expandedOrg === orgId) {
      setExpandedOrg(null);
      return;
    }
    setExpandedOrg(orgId);
    if (!orgApps[orgId]) {
      setOrgAppsLoading(orgId);
      try {
        const data = await authFetch<OrgApp[]>(`/organization/${orgId}/apps`);
        setOrgApps((prev) => ({ ...prev, [orgId]: data ?? [] }));
      } catch {
        setOrgApps((prev) => ({ ...prev, [orgId]: [] }));
      } finally {
        setOrgAppsLoading(null);
      }
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (createName.trim().length < 2 || busy) return;
    setBusy(true);
    try {
      const created = await authFetch<OrgItem>("/organization", {
        method: "POST",
        body: JSON.stringify({ name: createName.trim() }),
      });
      setOrgs((prev) => [...prev, created]);
      setIsCreateOpen(false);
      setCreateName("");
      toast.success(`"${created.name}" created`);
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const styles: Record<string, React.CSSProperties> = {
    page: {
      padding: isMobile ? "12px 8px" : isTablet ? "16px 12px" : 24,
      maxWidth: 860,
      margin: "0 auto",
    },
    header: {
      display: "flex",
      alignItems: isMobile ? "flex-start" : "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 24,
    },
    title: { fontSize: isMobile ? 18 : 22, fontWeight: 700, color: "var(--color-text-primary)" },
    addBtn: {
      padding: "8px 16px",
      background: "var(--color-primary)",
      color: "var(--color-surface)",
      border: "none",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 14,
      whiteSpace: "nowrap" as const,
    },
    card: {
      border: "1px solid var(--color-border)",
      borderRadius: 10,
      background: "var(--color-surface)",
      marginBottom: 12,
      overflow: "hidden",
    },
    cardHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: isMobile ? "wrap" : "nowrap" as const,
      padding: isMobile ? "12px 14px" : "14px 18px",
      cursor: "pointer",
      gap: 10,
    },
    cardTitle: { fontWeight: 600, fontSize: isMobile ? 14 : 16, color: "var(--color-text-primary)", flex: 1 },
    badge: {
      padding: "2px 8px",
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
      background: "var(--color-primary-bg)",
      color: "var(--color-primary)",
    },
    meta: {
      fontSize: 13,
      color: "var(--color-text-secondary)",
      display: "flex",
      flexWrap: "wrap" as const,
      gap: isMobile ? 8 : 16,
    },
    actions: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap" as const,
      flexShrink: 0,
    },
    iconBtn: {
      padding: "6px 10px",
      border: "1px solid var(--color-border-strong)",
      borderRadius: 6,
      background: "var(--color-surface)",
      cursor: "pointer",
      color: "var(--color-text-primary)",
      display: "flex",
      alignItems: "center",
      gap: 4,
      fontSize: 13,
      fontWeight: 600,
    },
    appsPanel: {
      borderTop: "1px solid var(--color-border)",
      padding: isMobile ? "10px 14px" : "12px 18px",
      background: "var(--color-surface-sunken)",
    },
    appRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap" as const,
      gap: 8,
      padding: "8px 0",
      borderBottom: "1px solid var(--color-border-subtle)",
    },
    appName: { fontWeight: 500, color: "var(--color-text-primary)", fontSize: 14 },
    modal: {
      position: "fixed",
      inset: 0,
      background: "var(--color-overlay)",
      display: "flex",
      alignItems: isMobile ? "flex-end" : "center",
      justifyContent: "center",
      zIndex: 100,
      padding: isMobile ? 0 : 16,
    },
    modalBox: {
      background: "var(--color-surface)",
      borderRadius: isMobile ? "16px 16px 0 0" : 12,
      padding: isMobile ? "24px 16px 32px" : 28,
      width: "100%",
      maxWidth: isMobile ? "100%" : 420,
      boxShadow: "0 8px 32px var(--color-shadow-heavy)",
    },
    modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 20, color: "var(--color-text-primary)" },
    input: {
      width: "100%",
      padding: "10px 14px",
      borderRadius: 8,
      border: "1px solid var(--color-border)",
      background: "var(--color-surface-sunken)",
      color: "var(--color-text-primary)",
      fontSize: 15,
      boxSizing: "border-box" as const,
    },
    label: { fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, display: "block" },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 },
    cancelBtn: {
      padding: "8px 16px",
      border: "1px solid var(--color-border-strong)",
      borderRadius: 8,
      background: "transparent",
      cursor: "pointer",
      color: "var(--color-text-primary)",
      fontWeight: 600,
    },
    submitBtn: {
      padding: "8px 16px",
      background: "var(--color-primary)",
      color: "var(--color-surface)",
      border: "none",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 700,
    },
    emptyText: { color: "var(--color-text-secondary)", fontSize: 15, textAlign: "center", paddingTop: 40 },
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>{t("organizations.title")}</div>
          <div style={{ color: "var(--color-text-secondary)", fontSize: 14, marginTop: 4 }}>
            {t("organizations.subtitle")}
          </div>
        </div>
        <button style={styles.addBtn} onClick={() => setIsCreateOpen(true)}>
          {t("organizations.add")}
        </button>
      </div>

      {loading && <div style={styles.emptyText}>{t("common.loading")}</div>}

      {!loading && orgs.length === 0 && (
        <div style={styles.emptyText}>{t("organizations.empty")}</div>
      )}

      {orgs.map((org) => (
        <div key={org.id} style={styles.card}>
          <div style={styles.cardHeader} onClick={() => toggleExpand(org.id)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={styles.cardTitle}>{org.name}</span>
                <span style={{
                  ...styles.badge,
                  background: org.isActive ? "var(--color-success-bg)" : "var(--color-error-bg)",
                  color: org.isActive ? "var(--color-success)" : "var(--color-error)",
                }}>
                  {org.isActive ? t("organizations.active") : t("organizations.inactive")}
                </span>
                {org.myRole && <span style={styles.badge}>{org.myRole}</span>}
              </div>
              <div style={{ ...styles.meta, marginTop: 4 }}>
                <span>{t("organizations.members")}: {org.memberCount}</span>
                <span>{t("organizations.apps")}: {org.appCount}</span>
              </div>
            </div>
            <div style={styles.actions} onClick={(e) => e.stopPropagation()}>
              <button style={styles.iconBtn} onClick={() => navigate(`/organizations/${org.id}`)}>
                <ExternalLink size={14} /> {!isMobile && t("organizations.home")}
              </button>
              <button style={styles.iconBtn} onClick={() => navigate(`/organizations/${org.id}/settings`)}>
                <Settings size={14} /> {!isMobile && t("organizations.settings")}
              </button>
            </div>
            {expandedOrg === org.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {expandedOrg === org.id && (
            <div style={styles.appsPanel}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: "var(--color-text-secondary)" }}>
                {t("organizations.orgApps")}
              </div>
              {orgAppsLoading === org.id && <div style={{ color: "var(--color-text-secondary)" }}>{t("common.loading")}</div>}
              {!orgAppsLoading && (orgApps[org.id] ?? []).length === 0 && (
                <div style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>{t("organizations.orgAppsEmpty")}</div>
              )}
              {(orgApps[org.id] ?? []).map((app) => (
                <div key={app.id} style={styles.appRow}>
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.appName}>{app.name}</div>
                    {app.url && <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{app.url}</div>}
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--color-text-muted)", marginTop: 2, userSelect: "all" }}>{app.id}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      style={styles.iconBtn}
                      onClick={() => navigate(`/organizations/${org.id}/apps/${app.id}`)}
                    >
                      {t("organizations.appOverviewBtn")}
                    </button>
                    <button
                      style={styles.iconBtn}
                      onClick={() => navigate(`/applications/${app.id}/settings`)}
                    >
                      <Settings size={13} /> {t("organizations.openApp")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {isCreateOpen && (
        <div style={styles.modal} onClick={() => setIsCreateOpen(false)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>{t("organizations.addOne")}</div>
            <form onSubmit={handleCreate}>
              <label style={styles.label}>{t("organizations.name")}</label>
              <input
                style={styles.input}
                placeholder={t("organizations.namePlaceholder")}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                autoFocus
                maxLength={100}
              />
              <div style={styles.modalFooter}>
                <button type="button" style={styles.cancelBtn} onClick={() => setIsCreateOpen(false)}>
                  {t("common.cancel")}
                </button>
                <button type="submit" style={{ ...styles.submitBtn, opacity: createName.trim().length < 2 || busy ? 0.6 : 1, cursor: createName.trim().length < 2 || busy ? "not-allowed" : "pointer" }} disabled={createName.trim().length < 2 || busy}>
                  {busy ? t("organizations.saving") : t("common.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
