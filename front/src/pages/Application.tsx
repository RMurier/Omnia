import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { BREAKPOINTS } from "../hooks/breakpoints";
import { authFetch } from "../utils/authFetch";

type AppItem = {
  id: string;
  name: string;
  description?: string | null;
  url?: string | null;
  isActive?: boolean;
  currentKeyVersion?: number | null;
};

type AppVersion = {
  id: string;
  applicationId: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  disabledAt?: string | null;
};

type CreateAppResult = {
  application: AppItem;
  secretBase64: string;
  version: AppVersion;
};

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

export default function AdminApplicationsPage() {
  const { t } = useTranslation();

  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppItem | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Secret display (one-time)
  const [secretModalOpen, setSecretModalOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [createdVersion, setCreatedVersion] = useState<number | null>(null);
  const [createdAppName, setCreatedAppName] = useState<string | null>(null);

  // Versions panel
  const [versionsOpenFor, setVersionsOpenFor] = useState<string | null>(null);
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // Members panel
  const [membersOpenFor, setMembersOpenFor] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [roles, setRoles] = useState<RoleItem[]>([]);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<CheckEmailResult | null>(null);
  const [checking, setChecking] = useState(false);
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);

  const canSubmit = useMemo(() => name.trim().length >= 2 && !busy, [name, busy]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setUrl("");
    setIsActive(true);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (app: AppItem) => {
    setEditing(app);
    setName(app.name ?? "");
    setDescription(app.description ?? "");
    setUrl(app.url ?? "");
    setIsActive(app.isActive ?? true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const loadApps = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authFetch<AppItem[]>("/application", { method: "GET" });
      setApps(data ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const openSecretModal = (appName: string, version: number, secretBase64: string) => {
    setCreatedAppName(appName);
    setCreatedVersion(version);
    setCreatedSecret(secretBase64);
    setSecretModalOpen(true);
  };

  const closeSecretModal = () => {
    setSecretModalOpen(false);
    setCreatedAppName(null);
    setCreatedVersion(null);
    setCreatedSecret(null);
  };

  const loadVersions = async (appId: string) => {
    setVersionsLoading(true);
    setError(null);
    try {
      const data = await authFetch<AppVersion[]>(`/application/${appId}/versions`, { method: "GET" });
      setVersions(data ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setVersionsLoading(false);
    }
  };

  const toggleVersions = async (appId: string) => {
    if (versionsOpenFor === appId) {
      setVersionsOpenFor(null);
      setVersions([]);
      return;
    }
    setVersionsOpenFor(appId);
    await loadVersions(appId);
  };

  const onCreateVersion = async (app: AppItem) => {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch<{ version: AppVersion; secretBase64: string }>(`/application/${app.id}/versions`, { method: "POST" });
      await loadApps();
      await loadVersions(app.id);

      openSecretModal(app.name, res.version.version, res.secretBase64);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const onToggleVersionActive = async (appId: string, version: number, isActiveValue: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await authFetch<void>(`/application/${appId}/versions/${version}/active?isActive=${isActiveValue ? "true" : "false"}`, {
        method: "PATCH",
      });
      await loadVersions(appId);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        url: url.trim() || null,
        isActive,
      };

      if (!editing) {
        const created = await authFetch<CreateAppResult>("/application", { method: "POST", body: JSON.stringify(payload) });

        await loadApps();
        closeModal();

        // Secret is returned only on create
        if (created?.secretBase64 && created?.version?.version) {
          openSecretModal(created.application?.name ?? payload.name, created.version.version, created.secretBase64);
        }
      } else {
        await authFetch<AppItem>(`/application/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
        await loadApps();
        closeModal();
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (app: AppItem) => {
    const ok = globalThis.confirm(t("applications.confirmDelete", { name: app.name }));
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      await authFetch<void>(`/application/${app.id}`, { method: "DELETE" });
      if (versionsOpenFor === app.id) {
        setVersionsOpenFor(null);
        setVersions([]);
      }
      if (membersOpenFor === app.id) {
        setMembersOpenFor(null);
        setMembers([]);
        setPendingInvitations([]);
      }
      await loadApps();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  // ── Members ────────────────────────────────────────────

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

  const loadMembers = async (appId: string) => {
    setMembersLoading(true);
    setError(null);
    try {
      const [m, inv] = await Promise.all([
        authFetch<MemberItem[]>(`/application/${appId}/members`, { method: "GET" }),
        authFetch<PendingInvitation[]>(`/application/${appId}/invitations`, { method: "GET" }),
      ]);
      setMembers(m ?? []);
      setPendingInvitations(inv ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setMembersLoading(false);
    }
  };

  const toggleMembers = async (appId: string) => {
    if (membersOpenFor === appId) {
      setMembersOpenFor(null);
      setMembers([]);
      setPendingInvitations([]);
      setInviteEmail("");
      setInviteMsg(null);
      setCheckResult(null);
      return;
    }
    setMembersOpenFor(appId);
    setInviteEmail("");
    setInviteMsg(null);
    setCheckResult(null);
    await loadRoles();
    await loadMembers(appId);
  };

  const onCheckEmail = async (appId: string) => {
    const email = inviteEmail.trim();
    if (!email) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await authFetch<CheckEmailResult>(`/application/${appId}/members/check-email?email=${encodeURIComponent(email)}`, { method: "GET" });
      setCheckResult(res);
    } catch {
      setCheckResult(null);
    } finally {
      setChecking(false);
    }
  };

  const onInvite = async (appId: string) => {
    const email = inviteEmail.trim();
    if (!email || !inviteRoleId) return;
    setInviting(true);
    setInviteMsg(null);
    setError(null);
    try {
      const res = await authFetch<{ memberAdded: boolean; invitationSent: boolean }>(`/application/${appId}/members/invite`, {
        method: "POST",
        body: JSON.stringify({ email, refRoleApplication: inviteRoleId }),
      });
      if (res.memberAdded) {
        setInviteMsg(t("applications.inviteSuccessAdded"));
      } else if (res.invitationSent) {
        setInviteMsg(t("applications.inviteSuccessSent"));
      }
      setInviteEmail("");
      setCheckResult(null);
      await loadMembers(appId);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setInviting(false);
    }
  };

  const onChangeRole = async (appId: string, memberId: string, newRoleId: string) => {
    setBusy(true);
    setError(null);
    try {
      await authFetch<void>(`/application/${appId}/members/${memberId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ refRoleApplication: newRoleId }),
      });
      await loadMembers(appId);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const onRemoveMember = async (appId: string, memberId: string) => {
    if (!globalThis.confirm(t("applications.confirmRemoveMember"))) return;
    setBusy(true);
    setError(null);
    try {
      await authFetch<void>(`/application/${appId}/members/${memberId}`, { method: "DELETE" });
      await loadMembers(appId);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const onCancelInvitation = async (appId: string, invitationId: string) => {
    setBusy(true);
    setError(null);
    try {
      await authFetch<void>(`/application/${appId}/invitations/${invitationId}`, { method: "DELETE" });
      await loadMembers(appId);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    page: { padding: isTablet ? 12 : 24, maxWidth: 1100, margin: "0 auto" },
    topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 },
    title: { margin: 0, fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)" },
    subtitle: { margin: "6px 0 0 0", color: "var(--color-text-muted)", fontSize: 14 },
    actions: { display: "flex", gap: 10, alignItems: "center" },
    btn: { padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 600 },
    btnPrimary: { padding: "10px 12px", borderRadius: 8, border: "none", background: "var(--color-primary)", color: "var(--color-surface)", cursor: "pointer", fontWeight: 700 },
    btnDisabled: { opacity: 0.7, cursor: "not-allowed" },

    card: { border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface)", overflow: "hidden" },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { textAlign: "left", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--color-text-muted)", padding: "12px 14px", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-raised)" },
    td: { padding: "12px 14px", borderBottom: "1px solid var(--color-border-td)", verticalAlign: "top", color: "var(--color-text-primary)", fontSize: 14 },
    tdMuted: { color: "var(--color-text-muted)", fontSize: 13, marginTop: 4 },

    rowActions: { display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" },
    smallBtn: { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 600, fontSize: 13 },
    dangerBtn: { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-error)", background: "var(--color-surface)", cursor: "pointer", fontWeight: 700, color: "var(--color-error-text)", fontSize: 13 },

    badge: { display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "1px solid var(--color-border)", background: "var(--color-surface)" },

    error: { border: "1px solid var(--color-error)", background: "var(--color-error-bg)", color: "var(--color-error-text)", padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 14 },
    empty: { padding: 18, color: "var(--color-text-muted)" },

    overlay: { position: "fixed", inset: 0, background: "var(--color-overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 },
    modal: { width: "100%", maxWidth: isTablet ? "100%" : 620, background: "var(--color-surface)", borderRadius: isTablet ? 0 : 12, border: "1px solid var(--color-border)", boxShadow: "0 18px 60px var(--color-shadow-heavy)", overflow: "hidden", ...(isTablet ? { height: "100%", display: "flex", flexDirection: "column" as const } : {}) },
    modalHeader: { padding: "14px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--color-surface-raised)" },
    modalTitle: { margin: 0, fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)" },
    modalBody: { padding: 16 },
    form: { display: "grid", gap: 12 },
    field: { display: "grid", gap: 6 },
    label: { fontSize: 13, fontWeight: 700, color: "var(--color-text-secondary)" },
    input: { height: 42, borderRadius: 8, border: "1px solid var(--color-border-strong)", padding: "0 12px", outline: "none", fontSize: 14 },
    textarea: { minHeight: 90, borderRadius: 8, border: "1px solid var(--color-border-strong)", padding: "10px 12px", outline: "none", fontSize: 14, resize: "vertical" },
    row: { display: "grid", gridTemplateColumns: isTablet ? "1fr" : "1fr 1fr", gap: 12 },
    checkboxRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 6 },

    footer: { padding: 16, borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: 10, background: "var(--color-surface-raised)" },

    versionsWrap: { background: "var(--color-surface-raised)", borderTop: "1px solid var(--color-border)" },
    versionsInner: { padding: 14 },
    versionsTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" },
    versionsTitle: { margin: 0, fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)" },
    versionsTable: { width: "100%", borderCollapse: "collapse", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" },
    versionsTh: { textAlign: "left", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--color-text-muted)", padding: "10px 12px", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-raised)" },
    versionsTd: { padding: "10px 12px", borderBottom: "1px solid var(--color-border-td)", fontSize: 13, color: "var(--color-text-primary)", verticalAlign: "top" },
    mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" },
    hint: { fontSize: 13, color: "var(--color-text-muted)", marginTop: 8, lineHeight: 1.4 },
    secretBox: { border: "1px dashed var(--color-border-strong)", background: "var(--color-surface)", padding: 12, borderRadius: 10, display: "grid", gap: 10 },
  };

  return (
    <div className="animate-page" style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>{t("applications.title")}</h1>
          <p style={styles.subtitle}>{t("applications.subtitle")}</p>
        </div>

        <div style={styles.actions}>
          <button style={styles.btn} onClick={loadApps} disabled={loading || busy}>
            {t("common.refresh")}
          </button>
          <button style={styles.btnPrimary} onClick={openCreate} disabled={busy}>
            {t("applications.add")}
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div className="hover-lift" style={styles.card}>
        <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>{t("common.id")}</th>
              <th style={styles.th}>{t("applications.name")}</th>
              <th style={styles.th}>{t("applications.url")}</th>
              <th style={styles.th}>{t("common.status")}</th>
              <th style={{ ...styles.th, textAlign: "right" }}>{t("common.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td style={styles.td} colSpan={6}>
                  {t("common.loading")}
                </td>
              </tr>
            ) : apps.length === 0 ? (
              <tr>
                <td style={styles.td} colSpan={6}>
                  <div style={styles.empty}>{t("applications.empty")}</div>
                </td>
              </tr>
            ) : (
              apps.map((a) => {
                const isVersionsOpen = versionsOpenFor === a.id;

                return (
                  <React.Fragment key={a.id}>
                    <tr>
                      <td style={styles.td}>
                        <div style={styles.mono}>{a.id}</div>
                      </td>

                      <td style={styles.td}>
                        <div style={{ fontWeight: 800 }}>{a.name}</div>
                        {a.description ? <div style={styles.tdMuted}>{a.description}</div> : null}
                      </td>

                      <td style={styles.td}>
                        {a.url ? (
                          <a href={a.url} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)" }}>
                            {a.url}
                          </a>
                        ) : (
                          <span style={{ color: "var(--color-text-faint)" }}>{t("common.noneSymbol")}</span>
                        )}
                      </td>

                      <td style={styles.td}>
                        <span style={styles.badge}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background: a.isActive === false ? "var(--color-error)" : "var(--color-success)",
                              display: "inline-block",
                            }}
                          />
                          {a.isActive === false ? t("common.inactive") : t("common.active")}
                        </span>
                      </td>

                      <td style={{ ...styles.td, textAlign: "right" }}>
                        <div style={styles.rowActions}>
                          <button style={styles.smallBtn} onClick={() => toggleMembers(a.id)} disabled={busy}>
                            {membersOpenFor === a.id ? t("applications.hideMembers") : t("applications.members")}
                          </button>
                          <button style={styles.smallBtn} onClick={() => toggleVersions(a.id)} disabled={busy}>
                            {isVersionsOpen ? t("applications.hideVersions") : t("applications.versions")}
                          </button>
                          <button style={styles.smallBtn} onClick={() => openEdit(a)} disabled={busy}>
                            {t("common.edit")}
                          </button>
                          <button style={styles.dangerBtn} onClick={() => onDelete(a)} disabled={busy}>
                            {t("common.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isVersionsOpen && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <div style={styles.versionsWrap}>
                            <div style={styles.versionsInner}>
                              <div style={styles.versionsTitleRow}>
                                <h3 style={styles.versionsTitle}>
                                  {t("applications.versionsTitle", { name: a.name })}
                                </h3>

                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                  <button style={styles.btn} onClick={() => loadVersions(a.id)} disabled={busy || versionsLoading}>
                                    {t("applications.refreshVersions")}
                                  </button>
                                  <button style={styles.btnPrimary} onClick={() => onCreateVersion(a)} disabled={busy}>
                                    {t("applications.newVersion")}
                                  </button>
                                </div>
                              </div>

                              {versionsLoading ? (
                                <div style={styles.empty}>{t("applications.versionsLoading")}</div>
                              ) : versions.length === 0 ? (
                                <div style={styles.empty}>{t("applications.versionsEmpty")}</div>
                              ) : (
                                <table style={styles.versionsTable}>
                                  <thead>
                                    <tr>
                                      <th style={styles.versionsTh}>{t("applications.version")}</th>
                                      <th style={styles.versionsTh}>{t("common.status")}</th>
                                      <th style={styles.versionsTh}>{t("applications.createdAt")}</th>
                                      <th style={{ ...styles.versionsTh, textAlign: "right" }}>{t("common.actions")}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {versions.map((v) => (
                                      <tr key={v.id}>
                                        <td style={styles.versionsTd}>
                                          <span style={styles.badge}>
                                            <span style={{ ...styles.mono, fontWeight: 900 }}>{v.version}</span>
                                          </span>
                                        </td>

                                        <td style={styles.versionsTd}>
                                          <span style={styles.badge}>
                                            <span
                                              style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: 999,
                                                background: v.isActive ? "var(--color-success)" : "var(--color-error)",
                                                display: "inline-block",
                                              }}
                                            />
                                            {v.isActive ? t("common.active") : t("common.inactive")}
                                          </span>
                                        </td>

                                        <td style={styles.versionsTd}>{fmtDate(v.createdAt)}</td>

                                        <td style={{ ...styles.versionsTd, textAlign: "right" }}>
                                          <div style={styles.rowActions}>
                                            {v.isActive ? (
                                              <button
                                                style={styles.dangerBtn}
                                                onClick={() => onToggleVersionActive(a.id, v.version, false)}
                                                disabled={busy}
                                              >
                                                {t("applications.disable")}
                                              </button>
                                            ) : (
                                              <button
                                                style={styles.smallBtn}
                                                onClick={() => onToggleVersionActive(a.id, v.version, true)}
                                                disabled={busy}
                                              >
                                                {t("applications.enable")}
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              <div style={styles.hint}>
                                {t("applications.reminderPrefix")} <span style={styles.mono}>X-Key-Version</span>.
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {membersOpenFor === a.id && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <div style={styles.versionsWrap}>
                            <div style={styles.versionsInner}>
                              <div style={styles.versionsTitleRow}>
                                <h3 style={styles.versionsTitle}>
                                  {t("applications.membersTitle", { name: a.name })}
                                </h3>
                                <button style={styles.btn} onClick={() => loadMembers(a.id)} disabled={busy || membersLoading}>
                                  {t("applications.refreshMembers")}
                                </button>
                              </div>

                              {/* Invite form */}
                              <div style={{ ...styles.secretBox, marginBottom: 12 }}>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{t("applications.inviteTitle")}</div>
                                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                                  <div style={{ flex: 1, minWidth: 180 }}>
                                    <label style={styles.label}>{t("applications.inviteEmail")}</label>
                                    <input
                                      style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                                      value={inviteEmail}
                                      onChange={(e) => { setInviteEmail(e.target.value); setCheckResult(null); setInviteMsg(null); }}
                                      onBlur={() => inviteEmail.trim() && onCheckEmail(a.id)}
                                      placeholder={t("applications.inviteEmailPlaceholder")}
                                    />
                                  </div>
                                  <div style={{ minWidth: 130 }}>
                                    <label style={styles.label}>{t("applications.inviteRole")}</label>
                                    <select
                                      style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                                      value={inviteRoleId}
                                      onChange={(e) => setInviteRoleId(e.target.value)}
                                    >
                                      {roles.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <button
                                    style={styles.btnPrimary}
                                    onClick={() => onInvite(a.id)}
                                    disabled={inviting || !inviteEmail.trim() || !inviteRoleId}
                                  >
                                    {inviting ? t("applications.inviting") : t("applications.inviteBtn")}
                                  </button>
                                </div>
                                {checking && (
                                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t("applications.checkingEmail")}</div>
                                )}
                                {checkResult && !checking && (
                                  <div style={{ fontSize: 12, color: checkResult.exists ? "var(--color-success)" : "var(--color-text-muted)" }}>
                                    {checkResult.exists
                                      ? t("applications.userFound", { name: [checkResult.name, checkResult.lastName].filter(Boolean).join(" ") || checkResult.name || "—" })
                                      : t("applications.userNotFound")}
                                  </div>
                                )}
                                {inviteMsg && (
                                  <div style={{ fontSize: 12, color: "var(--color-success)" }}>{inviteMsg}</div>
                                )}
                              </div>

                              {/* Members list */}
                              {membersLoading ? (
                                <div style={styles.empty}>{t("applications.membersLoading")}</div>
                              ) : members.length === 0 ? (
                                <div style={styles.empty}>{t("applications.membersEmpty")}</div>
                              ) : (
                                <table style={styles.versionsTable}>
                                  <thead>
                                    <tr>
                                      <th style={styles.versionsTh}>Email</th>
                                      <th style={styles.versionsTh}>{t("applications.name")}</th>
                                      <th style={styles.versionsTh}>{t("applications.inviteRole")}</th>
                                      <th style={{ ...styles.versionsTh, textAlign: "right" }}>{t("common.actions")}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {members.map((m) => (
                                      <tr key={m.memberId}>
                                        <td style={styles.versionsTd}>{m.email ?? "—"}</td>
                                        <td style={styles.versionsTd}>
                                          {[m.name, m.lastName].filter(Boolean).join(" ") || "—"}
                                        </td>
                                        <td style={styles.versionsTd}>
                                          <select
                                            style={{ ...styles.input, height: 32, fontSize: 12, padding: "0 6px" }}
                                            value={m.role?.id ?? ""}
                                            onChange={(e) => onChangeRole(a.id, m.memberId, e.target.value)}
                                            disabled={busy}
                                          >
                                            {roles.map((r) => (
                                              <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                          </select>
                                        </td>
                                        <td style={{ ...styles.versionsTd, textAlign: "right" }}>
                                          <button
                                            style={styles.dangerBtn}
                                            onClick={() => onRemoveMember(a.id, m.memberId)}
                                            disabled={busy}
                                          >
                                            {t("applications.removeMember")}
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              {/* Pending invitations */}
                              {pendingInvitations.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "var(--color-text-secondary)" }}>
                                    {t("applications.pendingInvitations")}
                                  </div>
                                  <table style={styles.versionsTable}>
                                    <thead>
                                      <tr>
                                        <th style={styles.versionsTh}>Email</th>
                                        <th style={styles.versionsTh}>{t("applications.inviteRole")}</th>
                                        <th style={styles.versionsTh}>{t("applications.createdAt")}</th>
                                        <th style={{ ...styles.versionsTh, textAlign: "right" }}>{t("common.actions")}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pendingInvitations.map((inv) => (
                                        <tr key={inv.id}>
                                          <td style={styles.versionsTd}>{inv.email ?? "—"}</td>
                                          <td style={styles.versionsTd}>{inv.role?.name ?? "—"}</td>
                                          <td style={styles.versionsTd}>{fmtDate(inv.createdAt)}</td>
                                          <td style={{ ...styles.versionsTd, textAlign: "right" }}>
                                            <button
                                              style={styles.dangerBtn}
                                              onClick={() => onCancelInvitation(a.id, inv.id)}
                                              disabled={busy}
                                            >
                                              {t("applications.cancelInvitation")}
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="animate-overlay" style={styles.overlay} onMouseDown={closeModal} role="dialog" aria-modal="true">
          <div className="animate-modal" style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editing ? t("applications.edit") : t("applications.addOne")}</h2>
              <button style={styles.btn} onClick={closeModal} disabled={busy}>
                {t("applications.close")}
              </button>
            </div>

            <form onSubmit={onSave}>
              <div style={styles.modalBody}>
                <div style={styles.form}>
                  <div style={styles.field}>
                    <label style={styles.label}>{t("applications.name")}</label>
                    <input
                      style={styles.input}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("applications.namePlaceholder")}
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>{t("applications.description")}</label>
                    <textarea
                      style={styles.textarea}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t("applications.shortDescriptionPlaceholder")}
                    />
                  </div>

                  <div style={styles.row}>
                    <div style={styles.field}>
                      <label style={styles.label}>{t("applications.url")}</label>
                      <input
                        style={styles.input}
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder={t("applications.urlPlaceholder")}
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>{t("applications.isActive")}</label>
                      <div style={styles.checkboxRow}>
                        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                        <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>{isActive ? t("common.yes") : t("common.no")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.footer}>
                <button style={styles.btn} type="button" onClick={closeModal} disabled={busy}>
                  {t("common.cancel")}
                </button>
                <button style={{ ...styles.btnPrimary, ...(canSubmit ? {} : styles.btnDisabled) }} type="submit" disabled={!canSubmit}>
                  {busy ? t("applications.saving") : editing ? t("common.save") : t("common.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-time secret modal */}
      {secretModalOpen && (
        <div className="animate-overlay" style={styles.overlay} onMouseDown={closeSecretModal} role="dialog" aria-modal="true">
          <div className="animate-modal" style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{t("applications.secretModalTitle")}</h2>
              <button style={styles.btn} onClick={closeSecretModal}>
                {t("applications.close")}
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ color: "var(--color-text-primary)", fontWeight: 800 }}>
                  {t("applications.secretHeader", { name: createdAppName, version: createdVersion })}
                </div>

                <div style={styles.secretBox}>
                  <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{t("applications.secretHelp")}</div>

                  <div style={{ ...styles.mono, wordBreak: "break-all", fontSize: 13 }}>{createdSecret}</div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button
                      style={styles.btn}
                      onClick={() => createdSecret && copyToClipboard(createdSecret)}
                      disabled={!createdSecret}
                      type="button"
                    >
                      {t("applications.copy")}
                    </button>
                  </div>
                </div>

                <div style={styles.hint}>
                  {t("applications.clientSidePrefix")} <span style={styles.mono}>X-App-Id</span>, <span style={styles.mono}>X-Key-Version</span>,{" "}
                  <span style={styles.mono}>X-Timestamp</span>, <span style={styles.mono}>X-Nonce</span>, <span style={styles.mono}>X-Signature</span>.
                </div>
              </div>
            </div>

            <div style={styles.footer}>
              <button style={styles.btnPrimary} onClick={closeSecretModal} type="button">
                {t("applications.copiedSecret")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
