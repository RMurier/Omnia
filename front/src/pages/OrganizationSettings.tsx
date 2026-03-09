import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Settings } from "lucide-react";
import { authFetch } from "../utils/authFetch";
import { toast } from "sonner";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { BREAKPOINTS } from "../hooks/breakpoints";

type OrgDto = {
  id: string;
  name: string;
  isActive: boolean;
  myRole?: string | null;
};

type RoleItem = { id: string; name: string; description?: string | null };
type MemberItem = {
  memberId: string;
  userId: string;
  email?: string | null;
  name?: string | null;
  lastName?: string | null;
  role?: RoleItem | null;
  createdAt: string;
};
type PendingInv = { id: string; email?: string | null; role?: RoleItem | null; createdAt: string };
type CheckEmailResult = { exists: boolean; name?: string | null; lastName?: string | null };
type OrgApp = { id: string; name?: string | null; url?: string | null; isActive?: boolean };
type CreateAppResult = { application: OrgApp; secretBase64: string; version: { version: number } };

type Tab = "general" | "members" | "apps";

function useApiError() {
  const { t } = useTranslation();
  return (msg: string | undefined): string => {
    if (!msg) return t("common.error");
    const key = msg.startsWith("Errors.") ? msg.slice(7) : null;
    if (key) {
      const translated = t(`errors.${key}` as any, { defaultValue: "" });
      if (translated) return translated;
    }
    return msg;
  };
}

function translateRole(name: string | null | undefined, t: (key: string) => string): string {
  if (!name) return "";
  const map: Record<string, string> = {
    Owner: t("organizations.roleOwner"),
    Maintainer: t("organizations.roleMaintainer"),
    Viewer: t("organizations.roleViewer"),
  };
  return map[name] ?? name;
}

export default function OrganizationSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const apiError = useApiError();
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);

  const [org, setOrg] = useState<OrgDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("general");

  const isOwner = org?.myRole === "Owner";
  const isMaintainerOrOwner = org?.myRole === "Owner" || org?.myRole === "Maintainer";

  // General tab
  const [gName, setGName] = useState("");
  const [gSaving, setGSaving] = useState(false);

  // Members tab
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [pending, setPending] = useState<PendingInv[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckEmailResult | null>(null);
  const [checking, setChecking] = useState(false);

  // Apps tab
  const [apps, setApps] = useState<OrgApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [isCreateAppOpen, setIsCreateAppOpen] = useState(false);
  const [createAppName, setCreateAppName] = useState("");
  const [createAppUrl, setCreateAppUrl] = useState("");
  const [createAppDesc, setCreateAppDesc] = useState("");
  const [creatingApp, setCreatingApp] = useState(false);
  // One-time secret modal
  const [secretModalOpen, setSecretModalOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [createdAppName, setCreatedAppName] = useState<string | null>(null);
  const [createdVersion, setCreatedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    loadOrg();
    loadRoles();
  }, [id]);

  useEffect(() => {
    if (tab === "members" && id) loadMembers();
    if (tab === "apps" && id) loadApps();
  }, [tab]);

  async function loadOrg() {
    setLoading(true);
    try {
      const data = await authFetch<OrgDto>(`/organization/${id}`);
      setOrg(data);
      setGName(data.name);
    } catch {
      // 403/404 handled automatically by NotFoundBoundary via authFetch
    } finally {
      setLoading(false);
    }
  }

  async function loadRoles() {
    try {
      const data = await authFetch<RoleItem[]>("/organization/roles");
      setRoles(data ?? []);
    } catch {}
  }

  async function loadMembers() {
    setMembersLoading(true);
    // Load members and invitations independently so one failure doesn't block the other
    try {
      const m = await authFetch<MemberItem[]>(`/organization/${id}/members`);
      setMembers(m ?? []);
    } catch {
      setMembers([]);
    }
    try {
      const p = await authFetch<PendingInv[]>(`/organization/${id}/invitations`);
      setPending(p ?? []);
    } catch {
      setPending([]);
    }
    setMembersLoading(false);
  }

  async function loadApps() {
    setAppsLoading(true);
    try {
      const data = await authFetch<OrgApp[]>(`/organization/${id}/apps`);
      setApps(data ?? []);
    } catch {
      setApps([]);
    } finally {
      setAppsLoading(false);
    }
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (gName.trim().length < 2 || gSaving) return;
    setGSaving(true);
    try {
      const updated = await authFetch<OrgDto>(`/organization/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: gName.trim() }),
      });
      setOrg(updated);
      toast.success(t("common.save"));
    } catch (e: any) {
      toast.error(apiError(e?.message));
    } finally {
      setGSaving(false);
    }
  }

  async function handleCheckEmail(email: string) {
    if (!email.trim()) { setCheckResult(null); return; }
    setChecking(true);
    try {
      const result = await authFetch<CheckEmailResult>(
        `/organization/${id}/members/check-email?email=${encodeURIComponent(email)}`
      );
      setCheckResult(result);
    } catch {
      setCheckResult(null);
    } finally {
      setChecking(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteRoleId || inviting) return;
    setInviting(true);
    try {
      const result = await authFetch<{ memberAdded: boolean }>(`/organization/${id}/members/invite`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), refRoleOrganization: inviteRoleId }),
      });
      toast.success(result.memberAdded ? t("organizations.inviteSuccessAdded") : t("organizations.inviteSuccessSent"));
      setInviteEmail(""); setInviteRoleId(""); setCheckResult(null);
      loadMembers();
    } catch (e: any) {
      toast.error(apiError(e?.message));
    } finally {
      setInviting(false);
    }
  }

  async function handleUpdateRole(memberId: string, roleId: string) {
    try {
      await authFetch<void>(`/organization/${id}/members/${memberId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ refRoleOrganization: roleId }),
      });
      toast.success(t("common.save"));
      loadMembers();
    } catch (e: any) {
      toast.error(apiError(e?.message));
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm(t("organizations.confirmRemoveMember"))) return;
    try {
      await authFetch<void>(`/organization/${id}/members/${memberId}`, { method: "DELETE" });
      toast.success(t("organizations.removeMember"));
      loadMembers();
    } catch (e: any) {
      toast.error(apiError(e?.message));
    }
  }

  async function handleCancelInvitation(invId: string) {
    try {
      await authFetch<void>(`/organization/${id}/invitations/${invId}`, { method: "DELETE" });
      loadMembers();
    } catch (e: any) {
      toast.error(apiError(e?.message));
    }
  }

  async function handleCreateApp(e: React.FormEvent) {
    e.preventDefault();
    if (createAppName.trim().length < 2 || creatingApp) return;
    setCreatingApp(true);
    try {
      const result = await authFetch<CreateAppResult>("/application", {
        method: "POST",
        body: JSON.stringify({
          name: createAppName.trim(),
          url: createAppUrl.trim() || null,
          description: createAppDesc.trim() || null,
          isActive: true,
          refOrganization: id,
        }),
      });
      setIsCreateAppOpen(false);
      setCreateAppName(""); setCreateAppUrl(""); setCreateAppDesc("");
      loadApps();
      if (result?.secretBase64) {
        setCreatedAppName(result.application?.name ?? createAppName);
        setCreatedVersion(result.version?.version ?? 1);
        setCreatedSecret(result.secretBase64);
        setSecretModalOpen(true);
      }
    } catch (e: any) {
      toast.error(apiError(e?.message));
    } finally {
      setCreatingApp(false);
    }
  }

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

  const s: Record<string, React.CSSProperties> = {
    page: {
      padding: isMobile ? "12px 8px" : isTablet ? "16px 12px" : 24,
      maxWidth: 760,
      margin: "0 auto",
    },
    back: {
      display: "flex", alignItems: "center", gap: 6,
      background: "none", border: "none", cursor: "pointer",
      color: "var(--color-text-secondary)", fontSize: 14,
      padding: 0, marginBottom: 20,
    },
    title: { fontSize: isMobile ? 17 : 20, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 24 },
    tabs: { display: "flex", borderBottom: "1px solid var(--color-border)", marginBottom: 24, gap: 0, overflowX: "auto" as const },
    card: {
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 10,
      padding: isMobile ? 14 : 20,
      marginBottom: 16,
    },
    label: { fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, display: "block" },
    input: {
      width: "100%", padding: "10px 14px", borderRadius: 8,
      border: "1px solid var(--color-border)",
      background: "var(--color-surface-sunken)",
      color: "var(--color-text-primary)",
      fontSize: 15, boxSizing: "border-box" as const,
    },
    saveBtn: {
      marginTop: 14, padding: "8px 20px",
      background: "var(--color-primary)",
      color: "var(--color-surface)",
      border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700,
    },
    memberRow: {
      display: "flex",
      alignItems: isMobile ? "flex-start" : "center",
      justifyContent: "space-between",
      flexWrap: "wrap" as const,
      gap: 10,
      padding: "10px 0",
      borderBottom: "1px solid var(--color-border-subtle)",
    },
    memberName: { fontWeight: 500, color: "var(--color-text-primary)" },
    memberEmail: { fontSize: 12, color: "var(--color-text-secondary)" },
    select: {
      padding: "7px 10px", borderRadius: 6,
      border: "1px solid var(--color-border-strong)",
      background: "var(--color-surface)",
      color: "var(--color-text-primary)",
      fontSize: 13,
    },
    removeBtn: {
      padding: "6px 12px",
      border: "1px solid var(--color-error-border)",
      borderRadius: 6,
      background: "transparent",
      cursor: "pointer",
      color: "var(--color-error-text)",
      fontSize: 13,
      fontWeight: 600,
    },
    inviteForm: {
      display: "flex",
      gap: 10,
      flexDirection: isMobile ? "column" : "row" as const,
      flexWrap: isMobile ? "nowrap" : "wrap" as const,
      alignItems: isMobile ? "stretch" : "flex-end",
    },
    inviteInput: {
      flex: 1, minWidth: isMobile ? "auto" : 200,
      padding: "8px 12px", borderRadius: 8,
      border: "1px solid var(--color-border)",
      background: "var(--color-surface-sunken)",
      color: "var(--color-text-primary)",
      fontSize: 14,
    },
    primaryBtn: {
      padding: "8px 16px",
      background: "var(--color-primary)",
      color: "var(--color-surface)",
      border: "none", borderRadius: 8, cursor: "pointer",
      fontWeight: 700, fontSize: 14,
    },
    secondaryBtn: {
      padding: "8px 16px",
      border: "1px solid var(--color-border-strong)",
      borderRadius: 8, background: "transparent", cursor: "pointer",
      color: "var(--color-text-primary)", fontWeight: 600, fontSize: 14,
    },
    hint: { fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 },
    sectionTitle: { fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)", marginBottom: 12 },
    appRow: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap" as const, gap: 8,
      padding: "10px 0", borderBottom: "1px solid var(--color-border-subtle)",
    },
    iconBtn: {
      padding: "6px 10px", border: "1px solid var(--color-border-strong)",
      borderRadius: 6, background: "var(--color-surface)", cursor: "pointer",
      color: "var(--color-text-primary)", display: "flex", alignItems: "center",
      gap: 4, fontSize: 13, fontWeight: 600,
    },
    overlay: {
      position: "fixed", inset: 0, background: "var(--color-overlay)",
      display: "flex", alignItems: isMobile ? "flex-end" : "center",
      justifyContent: "center", zIndex: 100, padding: isMobile ? 0 : 16,
    },
    modal: {
      background: "var(--color-surface)",
      borderRadius: isMobile ? "16px 16px 0 0" : 12,
      padding: isMobile ? "24px 16px 32px" : 28,
      width: "100%", maxWidth: isMobile ? "100%" : 460,
      boxShadow: "0 8px 32px var(--color-shadow-heavy)",
    },
    modalTitle: { fontSize: 17, fontWeight: 700, marginBottom: 20, color: "var(--color-text-primary)" },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 },
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)" }}>{t("common.loading")}</div>;
  if (!org) return null;

  const canSave = gName.trim().length >= 2 && !gSaving;
  const canInvite = !!inviteEmail.trim() && !!inviteRoleId && !inviting;
  const canCreateApp = createAppName.trim().length >= 2 && !creatingApp;

  return (
    <div style={s.page}>
      <button style={s.back} onClick={() => navigate("/organizations")}>
        <ArrowLeft size={16} /> {t("organizations.title")}
      </button>
      <div style={s.title}>{t("organizations.settingsTitle", { name: org.name })}</div>

      <div style={s.tabs}>
        <button style={tabStyle(tab === "general")} onClick={() => setTab("general")}>{t("organizations.tabGeneral")}</button>
        <button style={tabStyle(tab === "members")} onClick={() => setTab("members")}>{t("organizations.tabMembers")}</button>
        <button style={tabStyle(tab === "apps")} onClick={() => setTab("apps")}>{t("organizations.tabApps")}</button>
      </div>

      {/* ── General ── */}
      {tab === "general" && (
        <div style={s.card}>
          {isOwner && <div style={s.hint}>{t("organizations.generalHint")}</div>}
          <form onSubmit={handleSaveName}>
            <label style={s.label}>{t("organizations.name")}</label>
            <input
              style={s.input}
              value={gName}
              onChange={(e) => setGName(e.target.value)}
              disabled={!isOwner}
              maxLength={100}
            />
            {isOwner && (
              <button
                type="submit"
                style={{ ...s.saveBtn, opacity: canSave ? 1 : 0.6, cursor: canSave ? "pointer" : "not-allowed" }}
                disabled={!canSave}
              >
                {gSaving ? t("organizations.saving") : t("common.save")}
              </button>
            )}
          </form>
        </div>
      )}

      {/* ── Members ── */}
      {tab === "members" && (
        <>
          {membersLoading && <div style={{ color: "var(--color-text-secondary)" }}>{t("organizations.membersLoading")}</div>}

          <div style={s.card}>
            <div style={s.sectionTitle}>{t("organizations.membersTitle")}</div>
            {isMaintainerOrOwner && <div style={s.hint}>{t("organizations.membersHint")}</div>}
            {members.length === 0 && !membersLoading && (
              <div style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>{t("organizations.membersEmpty")}</div>
            )}
            {members.map((m) => (
              <div key={m.memberId} style={s.memberRow}>
                <div style={{ minWidth: 0 }}>
                  <div style={s.memberName}>{m.name} {m.lastName}</div>
                  <div style={s.memberEmail}>{m.email}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {isOwner ? (
                    <select
                      style={s.select}
                      value={m.role?.id ?? ""}
                      onChange={(e) => handleUpdateRole(m.memberId, e.target.value)}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{translateRole(r.name, t)}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{translateRole(m.role?.name, t)}</span>
                  )}
                  {isOwner && (
                    <button style={s.removeBtn} onClick={() => handleRemoveMember(m.memberId)}>
                      {t("organizations.removeMember")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Invite form — Maintainer or Owner */}
          {isMaintainerOrOwner && (
            <div style={s.card}>
              <div style={s.sectionTitle}>{t("organizations.inviteTitle")}</div>
              <form onSubmit={handleInvite}>
                <div style={s.inviteForm}>
                  <div style={{ flex: 1, minWidth: isMobile ? "auto" : 200 }}>
                    <label style={s.label}>{t("organizations.inviteEmail")}</label>
                    <input
                      style={s.inviteInput}
                      placeholder={t("organizations.inviteEmailPlaceholder")}
                      value={inviteEmail}
                      onChange={(e) => { setInviteEmail(e.target.value); setCheckResult(null); }}
                      onBlur={() => handleCheckEmail(inviteEmail)}
                      type="email"
                      maxLength={254}
                    />
                    {checking && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>{t("organizations.checkingEmail")}</div>}
                    {checkResult?.exists && (
                      <div style={{ fontSize: 12, color: "var(--color-success)", marginTop: 4 }}>
                        {t("organizations.userFound", { name: `${checkResult.name ?? ""} ${checkResult.lastName ?? ""}`.trim() })}
                      </div>
                    )}
                    {checkResult && !checkResult.exists && (
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>{t("organizations.userNotFound")}</div>
                    )}
                  </div>
                  <div style={{ minWidth: isMobile ? "auto" : 140 }}>
                    <label style={s.label}>{t("organizations.inviteRole")}</label>
                    <select
                      style={{ ...s.select, width: isMobile ? "100%" : "auto" }}
                      value={inviteRoleId}
                      onChange={(e) => setInviteRoleId(e.target.value)}
                    >
                      <option value="">—</option>
                      {roles
                        .filter((r) => r.name !== "Owner")
                        .map((r) => (
                          <option key={r.id} value={r.id}>{translateRole(r.name, t)}</option>
                        ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    style={{ ...s.primaryBtn, alignSelf: isMobile ? "stretch" : "flex-end", opacity: canInvite ? 1 : 0.6, cursor: canInvite ? "pointer" : "not-allowed" }}
                    disabled={!canInvite}
                  >
                    {inviting ? t("organizations.inviting") : t("organizations.inviteBtn")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Pending invitations — Maintainer or Owner */}
          {isMaintainerOrOwner && (
            <div style={s.card}>
              <div style={s.sectionTitle}>{t("organizations.pendingInvitations")}</div>
              {pending.length === 0 && (
                <div style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>{t("organizations.pendingEmpty")}</div>
              )}
              {pending.map((inv) => (
                <div key={inv.id} style={s.memberRow}>
                  <div>
                    <div style={s.memberEmail}>{inv.email}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{translateRole(inv.role?.name, t)}</div>
                  </div>
                  <button style={s.removeBtn} onClick={() => handleCancelInvitation(inv.id)}>
                    {t("organizations.cancelInvitation")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Apps ── */}
      {tab === "apps" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            {isMaintainerOrOwner && (
              <button style={s.primaryBtn} onClick={() => setIsCreateAppOpen(true)}>
                {t("organizations.appsCreateBtn")}
              </button>
            )}
          </div>

          {appsLoading && <div style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>{t("common.loading")}</div>}

          {!appsLoading && apps.length === 0 && (
            <div style={{ color: "var(--color-text-secondary)", fontSize: 14, textAlign: "center", paddingTop: 32 }}>
              {t("organizations.orgAppsEmpty")}
            </div>
          )}

          {apps.map((app) => (
            <div key={app.id} style={{ ...s.card, padding: isMobile ? "10px 14px" : "12px 18px" }}>
              <div style={s.appRow}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: 14 }}>{app.name}</div>
                  {app.url && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{app.url}</div>}
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--color-text-muted)", marginTop: 2, userSelect: "all" }}>{app.id}</div>
                </div>
                <button style={s.iconBtn} onClick={() => navigate(`/applications/${app.id}/settings`)}>
                  <Settings size={13} /> {t("organizations.openApp")}
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Create app modal ── */}
      {isCreateAppOpen && (
        <div style={s.overlay} onClick={() => setIsCreateAppOpen(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>{t("organizations.appsCreateTitle", { name: org.name })}</div>
            <form onSubmit={handleCreateApp}>
              <label style={s.label}>{t("applications.name")} *</label>
              <input
                style={{ ...s.input, marginBottom: 12 }}
                placeholder={t("applications.namePlaceholder")}
                value={createAppName}
                onChange={(e) => setCreateAppName(e.target.value)}
                autoFocus
                maxLength={100}
              />
              <label style={s.label}>{t("applications.url")}</label>
              <input
                style={{ ...s.input, marginBottom: 12 }}
                placeholder={t("applications.urlPlaceholder")}
                value={createAppUrl}
                onChange={(e) => setCreateAppUrl(e.target.value)}
                maxLength={2048}
              />
              <label style={s.label}>{t("applications.description")}</label>
              <input
                style={s.input}
                placeholder={t("applications.shortDescriptionPlaceholder")}
                value={createAppDesc}
                onChange={(e) => setCreateAppDesc(e.target.value)}
                maxLength={500}
              />
              <div style={s.modalFooter}>
                <button type="button" style={s.secondaryBtn} onClick={() => setIsCreateAppOpen(false)}>
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  style={{ ...s.primaryBtn, opacity: canCreateApp ? 1 : 0.6, cursor: canCreateApp ? "pointer" : "not-allowed" }}
                  disabled={!canCreateApp}
                >
                  {creatingApp ? t("applications.saving") : t("common.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── One-time secret modal ── */}
      {secretModalOpen && createdSecret && (
        <div style={s.overlay} onClick={() => setSecretModalOpen(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>{t("applications.secretModalTitle")}</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
              {t("applications.secretHeader", { name: createdAppName, version: createdVersion })}
            </div>
            <div style={{
              fontFamily: "monospace", fontSize: 13, wordBreak: "break-all",
              background: "var(--color-surface-sunken)", border: "1px solid var(--color-border)",
              borderRadius: 8, padding: "10px 12px", marginBottom: 12,
            }}>
              {createdSecret}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 16 }}>
              {t("applications.secretHelp")}
            </div>
            <div style={s.modalFooter}>
              <button style={s.secondaryBtn} onClick={async () => { await navigator.clipboard.writeText(createdSecret); }}>
                {t("applications.copy")}
              </button>
              <button style={s.primaryBtn} onClick={() => { setSecretModalOpen(false); setCreatedSecret(null); }}>
                {t("applications.copiedSecret")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
