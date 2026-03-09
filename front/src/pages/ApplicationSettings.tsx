import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { BREAKPOINTS } from "../hooks/breakpoints";
import { authFetch, authFetchResponse } from "../utils/authFetch";
import { useAuthStore } from "../stores/authStore";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────
type AppDto = {
  id: string;
  name: string;
  description?: string | null;
  url?: string | null;
  isActive?: boolean;
  logRetentionValue?: number | null;
  logRetentionUnit?: string | null;
  myRole?: string | null;
  refOrganization?: string | null;
};

type OrgItem = { id: string; name: string; myRole?: string | null };

type RoleItem = {
  id: string;
  name: string;
  description?: string | null;
};

type MemberItem = {
  memberId: string;
  userId: string;
  email?: string | null;
  name?: string | null;
  lastName?: string | null;
  role?: RoleItem | null;
  createdAt: string;
};

type PendingInvitation = {
  id: string;
  email?: string | null;
  role?: RoleItem | null;
  createdAt: string;
};

type CheckEmailResult = {
  exists: boolean;
  name?: string | null;
  lastName?: string | null;
};

type Tab = "general" | "members" | "logs";

const RETENTION_UNITS = ["days", "weeks", "months", "years"] as const;

// ── Component ────────────────────────────────────────────────────────────────
export default function ApplicationSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);
  const myEmail = useAuthStore((s) => s.email);

  const [app, setApp] = useState<AppDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("general");

  // Derived permissions
  const myRole = app?.myRole ?? "";
  const isMaintainerOrOwner = myRole === "Owner" || myRole === "Maintainer";
  const isOwner = myRole === "Owner";
  const isOrgApp = !!app?.refOrganization;
  const showMembersTab = !isOrgApp || isMaintainerOrOwner;

  // ── General tab ───────────────────────────────────────────
  const [gName, setGName]               = useState("");
  const [gDescription, setGDescription] = useState("");
  const [gUrl, setGUrl]                 = useState("");
  const [gIsActive, setGIsActive]       = useState(true);
  const [gSaving, setGSaving]           = useState(false);
  const [gMsg, setGMsg]                 = useState<string | null>(null);
  const [gError, setGError]             = useState<string | null>(null);

  // ── Logs tab ──────────────────────────────────────────────
  const [retentionValue, setRetentionValue] = useState(7);
  const [retentionUnit, setRetentionUnit]   = useState("days");
  const [retSaving, setRetSaving]           = useState(false);
  const [retMsg, setRetMsg]                 = useState<string | null>(null);
  const [retError, setRetError]             = useState<string | null>(null);

  // ── Members tab ───────────────────────────────────────────
  const [members, setMembers]                       = useState<MemberItem[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [membersLoading, setMembersLoading]         = useState(false);
  const [membersError, setMembersError]             = useState<string | null>(null);
  const [roles, setRoles]                           = useState<RoleItem[]>([]);
  const [inviteEmail, setInviteEmail]               = useState("");
  const [inviteRoleId, setInviteRoleId]             = useState("");
  const [inviting, setInviting]                     = useState(false);
  const [inviteMsg, setInviteMsg]                   = useState<string | null>(null);
  const [checkResult, setCheckResult]               = useState<CheckEmailResult | null>(null);
  const [checking, setChecking]                     = useState(false);
  const [memberBusy, setMemberBusy]                 = useState(false);

  // ── Transfer state ────────────────────────────────────────
  const [orgs, setOrgs]                             = useState<OrgItem[]>([]);
  const [transferOrgId, setTransferOrgId]           = useState("");
  const [transferring, setTransferring]             = useState(false);
  const [transferOwnerMemberId, setTransferOwnerMemberId] = useState("");
  const [transferringOwnership, setTransferringOwnership] = useState(false);

  // ── Load app ──────────────────────────────────────────────
  const loadApp = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetchResponse(`/application/${id}`, { method: "GET" });
      if (res.status === 404) {
        navigate(location.pathname, { replace: true, state: { notFound: true } });
        return;
      }
      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        setError(raw || t("common.error"));
        return;
      }
      const data: AppDto = await res.json();
      if (!data) { setError(t("applications.empty")); return; }
      setApp(data);
      setGName(data.name ?? "");
      setGDescription(data.description ?? "");
      setGUrl(data.url ?? "");
      setGIsActive(data.isActive ?? true);
      setRetentionValue(data.logRetentionValue ?? 7);
      setRetentionUnit(data.logRetentionUnit ?? "days");
      // Pre-load members for personal app owners (needed for transfer ownership dropdown)
      if (data.myRole === "Owner" && !data.refOrganization) {
        loadMembersForApp(id);
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadApp(); loadOrgs(); }, [id]);

  // ── Members loaders ───────────────────────────────────────
  const loadRoles = async () => {
    try {
      const data = await authFetch<RoleItem[]>("/application/roles", { method: "GET" });
      setRoles(data ?? []);
      if (data?.length && !inviteRoleId) {
        const viewer = data.find((r) => r.name === "Viewer");
        setInviteRoleId(viewer?.id ?? data[0].id);
      }
    } catch {}
  };

  const loadOrgs = async () => {
    try {
      const data = await authFetch<OrgItem[]>("/organization");
      setOrgs(data ?? []);
    } catch {}
  };

  const loadMembersForApp = async (appId: string) => {
    try {
      const [m, inv] = await Promise.all([
        authFetch<MemberItem[]>(`/application/${appId}/members`, { method: "GET" }),
        authFetch<PendingInvitation[]>(`/application/${appId}/invitations`, { method: "GET" }),
      ]);
      setMembers(m ?? []);
      setPendingInvitations(inv ?? []);
    } catch {}
  };

  const loadMembers = async () => {
    if (!id) return;
    setMembersLoading(true);
    setMembersError(null);
    try {
      if (app?.refOrganization) {
        const m = await authFetch<MemberItem[]>(`/organization/${app.refOrganization}/members`);
        setMembers(m ?? []);
        setPendingInvitations([]);
      } else {
        await loadMembersForApp(id);
      }
    } catch (e: any) {
      setMembersError(String(e?.message ?? e));
    } finally {
      setMembersLoading(false);
    }
  };

  const switchTab = async (t: Tab) => {
    setTab(t);
    if (t === "members") {
      await loadRoles();
      await loadMembers();
    }
  };

  // ── General save ─────────────────────────────────────────
  const onSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || gSaving) return;
    setGSaving(true); setGMsg(null); setGError(null);
    try {
      await authFetch<AppDto>(`/application/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: gName.trim(), description: gDescription.trim() || null, url: gUrl.trim() || null, isActive: gIsActive }),
      });
      await loadApp();
      setGMsg(t("common.save") + " ✓");
    } catch (e: any) {
      setGError(String(e?.message ?? e));
    } finally {
      setGSaving(false);
    }
  };

  // ── Logs save / purge ─────────────────────────────────────
  const onSaveRetention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || retSaving) return;
    setRetSaving(true); setRetMsg(null); setRetError(null);
    try {
      await authFetch<AppDto>(`/application/${id}`, {
        method: "PUT",
        body: JSON.stringify({ logRetentionValue: retentionValue, logRetentionUnit: retentionUnit }),
      });
      await loadApp();
      setRetMsg(t("common.save") + " ✓");
    } catch (e: any) {
      setRetError(String(e?.message ?? e));
    } finally {
      setRetSaving(false);
    }
  };

  // ── Members actions ───────────────────────────────────────
  const onCheckEmail = async () => {
    if (!id || !inviteEmail.trim()) return;
    setChecking(true); setCheckResult(null);
    try {
      const res = await authFetch<CheckEmailResult>(`/application/${id}/members/check-email?email=${encodeURIComponent(inviteEmail.trim())}`, { method: "GET" });
      setCheckResult(res);
    } catch {
      setCheckResult(null);
    } finally {
      setChecking(false);
    }
  };

  const onInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error(t("applications.inviteEmailRequired"));
      return;
    }
    if (!id || !inviteRoleId) return;
    setInviting(true); setInviteMsg(null); setMembersError(null);
    try {
      const res = await authFetch<{ memberAdded: boolean; invitationSent: boolean }>(`/application/${id}/members/invite`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), refRoleApplication: inviteRoleId }),
      });
      if (res.memberAdded) setInviteMsg(t("applications.inviteSuccessAdded"));
      else if (res.invitationSent) setInviteMsg(t("applications.inviteSuccessSent"));
      setInviteEmail(""); setCheckResult(null);
      await loadMembers();
    } catch (e: any) {
      setMembersError(String(e?.message ?? e));
    } finally {
      setInviting(false);
    }
  };

  const onChangeRole = async (memberId: string, newRoleId: string) => {
    if (!id) return;
    setMemberBusy(true); setMembersError(null);
    try {
      await authFetch<void>(`/application/${id}/members/${memberId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ refRoleApplication: newRoleId }),
      });
      await loadMembers();
    } catch (e: any) {
      setMembersError(String(e?.message ?? e));
    } finally {
      setMemberBusy(false);
    }
  };

  const onRemoveMember = async (memberId: string) => {
    if (!id || !globalThis.confirm(t("applications.confirmRemoveMember"))) return;
    setMemberBusy(true); setMembersError(null);
    try {
      await authFetch<void>(`/application/${id}/members/${memberId}`, { method: "DELETE" });
      await loadMembers();
    } catch (e: any) {
      setMembersError(String(e?.message ?? e));
    } finally {
      setMemberBusy(false);
    }
  };

  const onCancelInvitation = async (invitationId: string) => {
    if (!id) return;
    setMemberBusy(true); setMembersError(null);
    try {
      await authFetch<void>(`/application/${id}/invitations/${invitationId}`, { method: "DELETE" });
      await loadMembers();
    } catch (e: any) {
      setMembersError(String(e?.message ?? e));
    } finally {
      setMemberBusy(false);
    }
  };

  const onTransferToOrg = async () => {
    if (!id || !transferOrgId || !globalThis.confirm(t("applications.confirmTransferToOrg"))) return;
    setTransferring(true);
    try {
      await authFetch<void>(`/organization/transfer-app-to-org?appId=${id}`, {
        method: "POST",
        body: JSON.stringify({ refOrganization: transferOrgId }),
      });
      toast.success(t("applications.transferToOrgSuccess"));
      navigate(`/organizations/${transferOrgId}`);
    } catch (e: any) {
      toast.error(String(e?.message ?? e));
    } finally {
      setTransferring(false);
    }
  };

  const onTransferOwnership = async () => {
    if (!id || !transferOwnerMemberId || !globalThis.confirm(t("applications.confirmTransferOwnership"))) return;
    setTransferringOwnership(true);
    try {
      const member = members.find((m) => m.memberId === transferOwnerMemberId);
      await authFetch<void>(`/organization/transfer-app-ownership?appId=${id}`, {
        method: "POST",
        body: JSON.stringify({ newOwnerUserId: member?.userId }),
      });
      toast.success(t("applications.transferOwnershipSuccess"));
      await loadApp();
      await loadMembers();
    } catch (e: any) {
      toast.error(String(e?.message ?? e));
    } finally {
      setTransferringOwnership(false);
    }
  };

  const inviteableRoles = isOwner ? roles : roles.filter((r) => r.name !== "Owner");

  const unitLabel = (unit: string) =>
    t(`applications.unit${unit.charAt(0).toUpperCase() + unit.slice(1)}`);

  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  // ── Styles ────────────────────────────────────────────────
  const sideMenuBtnStyle = (active: boolean): React.CSSProperties => ({
    width: "100%",
    textAlign: "left",
    padding: "10px 20px",
    border: "none",
    borderLeft: active ? "3px solid var(--color-primary)" : "3px solid transparent",
    background: active ? "var(--color-sidebar-active-bg)" : "transparent",
    color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
    cursor: "pointer",
    fontWeight: active ? 700 : 500,
    fontSize: 14,
    whiteSpace: "nowrap",
  });

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "12px 20px",
    background: "none",
    border: "none",
    borderBottom: active ? "2px solid var(--color-primary)" : "2px solid transparent",
    color: active ? "var(--color-primary)" : "var(--color-text-muted)",
    cursor: "pointer",
    fontWeight: active ? 700 : 500,
    fontSize: 14,
    marginBottom: -1,
    whiteSpace: "nowrap",
  });

  const s: Record<string, React.CSSProperties> = {
    page: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" },
    header: { padding: isTablet ? "12px 16px" : "14px 32px", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-raised)", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 },
    backBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 600, fontSize: 13 },
    headerInfo: { flex: 1, minWidth: 0 },
    appName: { margin: 0, fontSize: 18, fontWeight: 800, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    roleBadge: { display: "inline-block", marginTop: 4, fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 999, border: "1px solid var(--color-border)", color: "var(--color-text-muted)", background: "var(--color-surface)" },
    tabBar: { display: "flex", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-raised)", paddingLeft: 8, overflowX: "auto", flexShrink: 0 },
    contentWrapper: { display: "flex", flex: 1, minHeight: 0, overflow: "hidden" },
    sideMenu: { width: 200, minWidth: 200, flexShrink: 0, background: "var(--color-surface-raised)", borderRight: "1px solid var(--color-border)", overflowY: "auto", paddingTop: 12 },
    body: { flex: 1, overflowY: "auto", padding: isTablet ? "20px 16px" : "28px 32px" },
    section: { maxWidth: 680 },
    sectionTitle: { margin: "0 0 6px 0", fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)" },
    sectionHint: { margin: "0 0 20px 0", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 },
    form: { display: "grid", gap: 14 },
    field: { display: "grid", gap: 6 },
    label: { fontSize: 13, fontWeight: 700, color: "var(--color-text-secondary)" },
    labelRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
    lockedHint: { fontSize: 11, color: "var(--color-text-faint)", fontStyle: "italic" },
    input: { height: 42, borderRadius: 8, border: "1px solid var(--color-border-strong)", padding: "0 12px", outline: "none", fontSize: 14, background: "var(--color-surface)", color: "var(--color-text-primary)" },
    inputDisabled: { opacity: 0.5, cursor: "not-allowed" },
    textarea: { minHeight: 80, borderRadius: 8, border: "1px solid var(--color-border-strong)", padding: "10px 12px", outline: "none", fontSize: 14, resize: "vertical", background: "var(--color-surface)", color: "var(--color-text-primary)" },
    twoCol: { display: "grid", gridTemplateColumns: isTablet ? "1fr" : "1fr 1fr", gap: 14 },
    checkboxRow: { display: "flex", alignItems: "center", gap: 10 },
    btn: { padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 600, fontSize: 14 },
    btnPrimary: { padding: "10px 14px", borderRadius: 8, border: "none", background: "var(--color-primary)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14 },
    btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
    dangerBtn: { padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-error)", background: "var(--color-surface)", cursor: "pointer", fontWeight: 700, color: "var(--color-error-text)", fontSize: 13 },
    smallBtn: { padding: "6px 10px", borderRadius: 8, border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 600, fontSize: 12 },
    errorBox: { border: "1px solid var(--color-error)", background: "var(--color-error-bg)", color: "var(--color-error-text)", padding: 12, borderRadius: 10, marginBottom: 14, fontSize: 14 },
    successText: { fontSize: 13, color: "var(--color-success)", marginTop: 8 },
inviteBox: { border: "1px dashed var(--color-border-strong)", borderRadius: 10, padding: 14, display: "grid", gap: 10, background: "var(--color-surface)" },
    table: { width: "100%", borderCollapse: "collapse", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden", marginTop: 10 },
    th: { textAlign: "left", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--color-text-secondary)", padding: "10px 12px", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-raised)" },
    td: { padding: "10px 12px", borderBottom: "1px solid var(--color-border-td)", fontSize: 13, color: "var(--color-text-primary)", verticalAlign: "middle", background: "var(--color-surface)" },
    badge: { display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, border: "1px solid var(--color-border)", background: "var(--color-surface)" },
    inlineRow: { display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" },
    mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
  };

  // ── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...s.page, alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--color-text-muted)" }}>{t("common.loading")}</span>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div style={{ ...s.page, alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", display: "grid", gap: 12 }}>
          <span style={{ color: "var(--color-error-text)" }}>{error ?? t("applications.empty")}</span>
          <button style={s.btn} onClick={() => navigate("/applications")}>{t("applications.title")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-page" style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => app.refOrganization ? navigate(`/organizations/${app.refOrganization}/settings`) : navigate("/applications")}>
          <ArrowLeft size={14} />
          {app.refOrganization ? t("organizations.title") : t("applications.title")}
        </button>
        <div style={s.headerInfo}>
          <h1 style={s.appName}>{app.name}</h1>
          <span style={s.roleBadge}>{myRole || "—"}</span>
        </div>
      </div>

      {/* Mobile: horizontal tab bar */}
      {isTablet && (
        <div style={s.tabBar}>
          {(["general", ...(showMembersTab ? ["members"] : []), "logs"] as Tab[]).map((k) => (
            <button key={k} style={tabStyle(tab === k)} onClick={() => switchTab(k)}>
              {t(`applications.tab${k.charAt(0).toUpperCase() + k.slice(1)}`)}
            </button>
          ))}
        </div>
      )}

      {/* Content: sidebar + body */}
      <div style={s.contentWrapper}>
        {/* Desktop: left sidebar */}
        {!isTablet && (
          <aside style={s.sideMenu}>
            {(["general", ...(showMembersTab ? ["members"] : []), "logs"] as Tab[]).map((k) => (
              <button key={k} style={sideMenuBtnStyle(tab === k)} onClick={() => switchTab(k)}>
                {t(`applications.tab${k.charAt(0).toUpperCase() + k.slice(1)}`)}
              </button>
            ))}
          </aside>
        )}

        {/* Body */}
        <div style={s.body}>

        {/* ── General ── */}
        {tab === "general" && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>{t("applications.tabGeneral")}</h2>
            <p style={s.sectionHint}>
              {isMaintainerOrOwner ? t("applications.generalHintEditable") : t("applications.generalHintReadonly")}
            </p>

            {gError && <div style={s.errorBox}>{gError}</div>}

            <form onSubmit={onSaveGeneral}>
              <div style={s.form}>
                <div style={s.field}>
                  <label style={s.label}>{t("applications.name")}</label>
                  <input
                    style={{ ...s.input, ...(isMaintainerOrOwner ? {} : s.inputDisabled) }}
                    value={gName}
                    onChange={(e) => setGName(e.target.value)}
                    placeholder={t("applications.namePlaceholder")}
                    maxLength={100}
                    disabled={!isMaintainerOrOwner}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label}>{t("applications.description")}</label>
                  <textarea
                    style={{ ...s.textarea, ...(isMaintainerOrOwner ? {} : s.inputDisabled) }}
                    value={gDescription}
                    onChange={(e) => setGDescription(e.target.value)}
                    placeholder={t("applications.shortDescriptionPlaceholder")}
                    maxLength={500}
                    disabled={!isMaintainerOrOwner}
                  />
                </div>
                <div style={s.twoCol}>
                  <div style={s.field}>
                    <label style={s.label}>{t("applications.url")}</label>
                    <input
                      style={{ ...s.input, ...(isMaintainerOrOwner ? {} : s.inputDisabled) }}
                      value={gUrl}
                      onChange={(e) => setGUrl(e.target.value)}
                      placeholder={t("applications.urlPlaceholder")}
                      maxLength={2048}
                      disabled={!isMaintainerOrOwner}
                    />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>{t("applications.isActive")}</label>
                    <div style={{ ...s.checkboxRow, marginTop: 10 }}>
                      <input
                        type="checkbox"
                        checked={gIsActive}
                        onChange={(e) => setGIsActive(e.target.checked)}
                        disabled={!isMaintainerOrOwner}
                      />
                      <span style={{ fontSize: 14, color: "var(--color-text-secondary)", ...(isMaintainerOrOwner ? {} : { opacity: 0.5 }) }}>
                        {gIsActive ? t("common.yes") : t("common.no")}
                      </span>
                    </div>
                  </div>
                </div>

                {isMaintainerOrOwner && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                      style={{ ...s.btnPrimary, ...(gName.trim().length < 2 || gSaving ? s.btnDisabled : {}) }}
                      type="submit"
                      disabled={gName.trim().length < 2 || gSaving}
                    >
                      {gSaving ? t("applications.saving") : t("common.save")}
                    </button>
                    {gMsg && <span style={s.successText}>{gMsg}</span>}
                  </div>
                )}
              </div>
            </form>

            {/* Transfer actions — personal app, Owner only */}
            {isOwner && !isOrgApp && (
              <div style={{ marginTop: 32, display: "grid", gap: 16 }}>
                <div style={{ height: 1, background: "var(--color-border)" }} />

                {/* Transfer to org */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                    {t("applications.transferToOrgTitle")}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 10 }}>
                    {t("applications.transferToOrgHint")}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <select
                      style={{ ...s.input, width: "auto", minWidth: 200 }}
                      value={transferOrgId}
                      onChange={(e) => setTransferOrgId(e.target.value)}
                    >
                      <option value="">— {t("organizations.select")} —</option>
                      {orgs
                        .filter((o) => o.myRole === "Owner" || o.myRole === "Maintainer")
                        .map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    <button
                      type="button"
                      style={{ ...s.dangerBtn, ...(transferring || !transferOrgId ? s.btnDisabled : {}) }}
                      onClick={onTransferToOrg}
                      disabled={transferring || !transferOrgId}
                    >
                      {transferring ? t("applications.transferring") : t("applications.transferToOrgBtn")}
                    </button>
                  </div>
                </div>

                {/* Transfer ownership */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                    {t("applications.transferOwnershipTitle")}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 10 }}>
                    {t("applications.transferOwnershipHint")}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <select
                      style={{ ...s.input, width: "auto", minWidth: 200 }}
                      value={transferOwnerMemberId}
                      onChange={(e) => setTransferOwnerMemberId(e.target.value)}
                    >
                      <option value="">— {t("applications.selectMember")} —</option>
                      {members
                        .filter((m) => m.email !== myEmail)
                        .map((m) => <option key={m.memberId} value={m.memberId}>{m.name || m.email}</option>)}
                    </select>
                    <button
                      type="button"
                      style={{ ...s.dangerBtn, ...(transferringOwnership || !transferOwnerMemberId ? s.btnDisabled : {}) }}
                      onClick={onTransferOwnership}
                      disabled={transferringOwnership || !transferOwnerMemberId}
                    >
                      {transferringOwnership ? t("applications.transferring") : t("applications.transferOwnershipBtn")}
                    </button>
                  </div>
                  {members.filter((m) => m.email !== myEmail).length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
                      {t("applications.noMembersToTransfer")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Members ── */}
        {tab === "members" && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>{t("applications.tabMembers")}</h2>
            <p style={s.sectionHint}>
              {isOrgApp
                ? t("applications.membersHintOrg")
                : isMaintainerOrOwner
                  ? t("applications.membersHintEditable")
                  : t("applications.membersHintReadonly")}
            </p>

            {membersError && <div style={s.errorBox}>{membersError}</div>}

            {/* Invite form — Maintainer+ only, personal apps only */}
            {isMaintainerOrOwner && !isOrgApp && (
              <div style={{ ...s.inviteBox, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-primary)" }}>{t("applications.inviteTitle")}</div>
                <div style={s.inlineRow}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <label style={{ ...s.label, marginBottom: 4, display: "block" }}>{t("applications.inviteEmail")}</label>
                    <input
                      style={{ ...s.input, width: "100%", boxSizing: "border-box" }}
                      value={inviteEmail}
                      onChange={(e) => { setInviteEmail(e.target.value); setCheckResult(null); setInviteMsg(null); }}
                      onBlur={() => inviteEmail.trim() && onCheckEmail()}
                      placeholder={t("applications.inviteEmailPlaceholder")}
                      maxLength={254}
                    />
                  </div>
                  <div style={{ minWidth: 120 }}>
                    <label style={{ ...s.label, marginBottom: 4, display: "block" }}>{t("applications.inviteRole")}</label>
                    <select
                      style={{ ...s.input, width: "100%", boxSizing: "border-box" }}
                      value={inviteRoleId}
                      onChange={(e) => setInviteRoleId(e.target.value)}
                    >
                      {inviteableRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <button
                    style={{ ...s.btnPrimary, ...(inviting ? s.btnDisabled : {}), alignSelf: "flex-end" }}
                    onClick={onInvite}
                    disabled={inviting}
                    type="button"
                  >
                    {inviting ? t("applications.inviting") : t("applications.inviteBtn")}
                  </button>
                </div>
                {checking && <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t("applications.checkingEmail")}</div>}
                {checkResult && !checking && (
                  <div style={{ fontSize: 12, color: checkResult.exists ? "var(--color-success)" : "var(--color-text-muted)" }}>
                    {checkResult.exists
                      ? t("applications.userFound", { name: [checkResult.name, checkResult.lastName].filter(Boolean).join(" ") || "—" })
                      : t("applications.userNotFound")}
                  </div>
                )}
                {inviteMsg && <div style={{ fontSize: 12, color: "var(--color-success)" }}>{inviteMsg}</div>}
              </div>
            )}

            {/* Members list */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-secondary)" }}>
                {t("applications.membersTitle", { name: app.name })}
              </span>
              <button style={s.btn} onClick={loadMembers} disabled={membersLoading || memberBusy} type="button" >{t("applications.refreshMembers")}</button>
            </div>

            {membersLoading ? (
              <div style={{ color: "var(--color-text-muted)", padding: 14 }}>{t("applications.membersLoading")}</div>
            ) : members.length === 0 ? (
              <div style={{ color: "var(--color-text-muted)", padding: 14 }}>{t("applications.membersEmpty")}</div>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Email</th>
                    <th style={s.th}>{t("applications.name")}</th>
                    <th style={s.th}>{t("applications.inviteRole")}</th>
                    {isOwner && !isOrgApp && <th style={{ ...s.th, textAlign: "right" }}>{t("common.actions")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.memberId}>
                      <td style={s.td}>{m.email ?? "—"}</td>
                      <td style={s.td}>{[m.name, m.lastName].filter(Boolean).join(" ") || "—"}</td>
                      <td style={s.td}>
                        {isOwner && !isOrgApp && m.email !== myEmail ? (
                          <select
                            style={{ ...s.input, height: 32, fontSize: 12, padding: "0 6px" }}
                            value={m.role?.id ?? ""}
                            onChange={(e) => onChangeRole(m.memberId, e.target.value)}
                            disabled={memberBusy}
                          >
                            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        ) : (
                          <span style={s.badge}>{m.role?.name ?? "—"}</span>
                        )}
                      </td>
                      {isOwner && !isOrgApp && m.email !== myEmail && (
                        <td style={{ ...s.td, textAlign: "right" }}>
                          <button style={s.dangerBtn} onClick={() => onRemoveMember(m.memberId)} disabled={memberBusy}>
                            {t("applications.removeMember")}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pending invitations — personal apps only */}
            {!isOrgApp && pendingInvitations.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>{t("applications.pendingInvitations")}</div>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Email</th>
                      <th style={s.th}>{t("applications.inviteRole")}</th>
                      <th style={s.th}>{t("applications.createdAt")}</th>
                      {isMaintainerOrOwner && <th style={{ ...s.th, textAlign: "right" }}>{t("common.actions")}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInvitations.map((inv) => (
                      <tr key={inv.id}>
                        <td style={s.td}>{inv.email ?? "—"}</td>
                        <td style={s.td}>{inv.role?.name ?? "—"}</td>
                        <td style={s.td}>{fmtDate(inv.createdAt)}</td>
                        {isMaintainerOrOwner && (
                          <td style={{ ...s.td, textAlign: "right" }}>
                            <button style={s.dangerBtn} onClick={() => onCancelInvitation(inv.id)} disabled={memberBusy}>
                              {t("applications.cancelInvitation")}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Logs ── */}
        {tab === "logs" && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>{t("applications.tabLogs")}</h2>
            <p style={s.sectionHint}>{t("applications.logRetentionHelp")}</p>

            {retError && <div style={s.errorBox}>{retError}</div>}

            {/* Retention policy */}
            <form onSubmit={onSaveRetention}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 10 }}>{t("applications.logRetention")}</div>
              <div style={s.inlineRow}>
                <div style={s.field}>
                  <label style={{ ...s.label, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {t("applications.logRetentionValue")}
                    {!isOwner && <span style={s.lockedHint}>{t("applications.ownerOnly")}</span>}
                  </label>
                  <input
                    style={{ ...s.input, width: 90, ...(isOwner ? {} : s.inputDisabled) }}
                    type="number"
                    min={1}
                    value={retentionValue}
                    onChange={(e) => setRetentionValue(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={!isOwner}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label}>{t("applications.logRetentionUnit")}</label>
                  <select
                    style={{ ...s.input, width: 130, ...(isOwner ? {} : s.inputDisabled) }}
                    value={retentionUnit}
                    onChange={(e) => setRetentionUnit(e.target.value)}
                    disabled={!isOwner}
                  >
                    {RETENTION_UNITS.map((u) => (
                      <option key={u} value={u}>{unitLabel(u)}</option>
                    ))}
                  </select>
                </div>
                {isOwner && (
                  <button
                    style={{ ...s.btnPrimary, ...(retSaving ? s.btnDisabled : {}), alignSelf: "flex-end" }}
                    type="submit"
                    disabled={retSaving}
                  >
                    {retSaving ? t("applications.saving") : t("common.save")}
                  </button>
                )}
              </div>
              {retMsg && <div style={s.successText}>{retMsg}</div>}
            </form>

          </div>
        )}

        </div>{/* end body */}
      </div>{/* end contentWrapper */}
    </div>
  );
}
