import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { authFetch } from "../utils/authFetch";
import { toast } from "sonner";

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

type Tab = "general" | "members";

export default function OrganizationSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [org, setOrg] = useState<OrgDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("general");

  const isOwner = org?.myRole === "Owner";

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

  useEffect(() => {
    if (!id) return;
    loadOrg();
    loadRoles();
  }, [id]);

  useEffect(() => {
    if (tab === "members" && id) loadMembers();
  }, [tab]);

  async function loadOrg() {
    setLoading(true);
    try {
      const data = await authFetch<OrgDto>(`/organization/${id}`);
      setOrg(data);
      setGName(data.name);
    } catch {
      navigate("/organizations");
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
    try {
      const [m, p] = await Promise.all([
        authFetch<MemberItem[]>(`/organization/${id}/members`),
        authFetch<PendingInv[]>(`/organization/${id}/invitations`),
      ]);
      setMembers(m ?? []);
      setPending(p ?? []);
    } catch {
      setMembers([]);
      setPending([]);
    } finally {
      setMembersLoading(false);
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
      toast.error(e?.message ?? t("common.error"));
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
      toast.error(e?.message ?? t("common.error"));
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
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm(t("organizations.confirmRemoveMember"))) return;
    try {
      await authFetch<void>(`/organization/${id}/members/${memberId}`, { method: "DELETE" });
      toast.success(t("organizations.removeMember"));
      loadMembers();
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  async function handleCancelInvitation(invId: string) {
    try {
      await authFetch<void>(`/organization/${id}/invitations/${invId}`, { method: "DELETE" });
      loadMembers();
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 18px", fontWeight: 600, fontSize: 14, cursor: "pointer",
    border: "none", background: "none",
    borderBottom: active ? "2px solid var(--color-accent)" : "2px solid transparent",
    color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
  });

  const s: Record<string, React.CSSProperties> = {
    page: { padding: 24, maxWidth: 760, margin: "0 auto" },
    back: { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 14, padding: 0, marginBottom: 20 },
    title: { fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 24 },
    tabs: { display: "flex", borderBottom: "1px solid var(--color-border)", marginBottom: 24, gap: 0 },
    card: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: 20, marginBottom: 16 },
    label: { fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, display: "block" },
    input: { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-background)", color: "var(--color-text-primary)", fontSize: 15, boxSizing: "border-box" as const },
    saveBtn: { marginTop: 14, padding: "8px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 },
    memberRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-border-subtle)" },
    memberName: { fontWeight: 500, color: "var(--color-text-primary)" },
    memberEmail: { fontSize: 12, color: "var(--color-text-secondary)" },
    select: { padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-background)", color: "var(--color-text-primary)", fontSize: 13 },
    removeBtn: { padding: "5px 10px", border: "1px solid var(--color-danger)", borderRadius: 6, background: "transparent", cursor: "pointer", color: "var(--color-danger)", fontSize: 13 },
    inviteForm: { display: "flex", gap: 10, flexWrap: "wrap" as const, alignItems: "flex-end" },
    inviteInput: { flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-background)", color: "var(--color-text-primary)", fontSize: 14 },
    inviteBtn: { padding: "8px 16px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 },
    hint: { fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 },
    sectionTitle: { fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)", marginBottom: 12 },
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)" }}>{t("common.loading")}</div>;
  if (!org) return null;

  return (
    <div style={s.page}>
      <button style={s.back} onClick={() => navigate("/organizations")}>
        <ArrowLeft size={16} /> {t("organizations.title")}
      </button>
      <div style={s.title}>{t("organizations.settingsTitle", { name: org.name })}</div>

      <div style={s.tabs}>
        <button style={tabStyle(tab === "general")} onClick={() => setTab("general")}>{t("organizations.tabGeneral")}</button>
        <button style={tabStyle(tab === "members")} onClick={() => setTab("members")}>{t("organizations.tabMembers")}</button>
      </div>

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
              <button type="submit" style={s.saveBtn} disabled={gName.trim().length < 2 || gSaving}>
                {gSaving ? t("organizations.saving") : t("common.save")}
              </button>
            )}
          </form>
        </div>
      )}

      {tab === "members" && (
        <>
          {membersLoading && <div style={{ color: "var(--color-text-secondary)" }}>{t("organizations.membersLoading")}</div>}

          {/* Members list */}
          <div style={s.card}>
            <div style={s.sectionTitle}>{t("organizations.membersTitle")}</div>
            {isOwner && <div style={s.hint}>{t("organizations.membersHint")}</div>}
            {members.length === 0 && !membersLoading && <div style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>{t("organizations.membersEmpty")}</div>}
            {members.map((m) => (
              <div key={m.memberId} style={s.memberRow}>
                <div>
                  <div style={s.memberName}>{m.name} {m.lastName}</div>
                  <div style={s.memberEmail}>{m.email}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isOwner ? (
                    <select
                      style={s.select}
                      value={m.role?.id ?? ""}
                      onChange={(e) => handleUpdateRole(m.memberId, e.target.value)}
                    >
                      {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{m.role?.name}</span>
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

          {/* Invite form — Owner only */}
          {isOwner && (
            <div style={s.card}>
              <div style={s.sectionTitle}>{t("organizations.inviteTitle")}</div>
              <form onSubmit={handleInvite}>
                <div style={s.inviteForm}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={s.label}>{t("organizations.inviteEmail")}</label>
                    <input
                      style={s.inviteInput}
                      placeholder={t("organizations.inviteEmailPlaceholder")}
                      value={inviteEmail}
                      onChange={(e) => { setInviteEmail(e.target.value); setCheckResult(null); }}
                      onBlur={() => handleCheckEmail(inviteEmail)}
                      type="email"
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
                  <div>
                    <label style={s.label}>{t("organizations.inviteRole")}</label>
                    <select style={s.select} value={inviteRoleId} onChange={(e) => setInviteRoleId(e.target.value)}>
                      <option value="">—</option>
                      {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" style={s.inviteBtn} disabled={!inviteEmail.trim() || !inviteRoleId || inviting}>
                    {inviting ? t("organizations.inviting") : t("organizations.inviteBtn")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Pending invitations — Owner only */}
          {isOwner && (
            <div style={s.card}>
              <div style={s.sectionTitle}>{t("organizations.pendingInvitations")}</div>
              {pending.length === 0 && <div style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>{t("organizations.pendingEmpty")}</div>}
              {pending.map((inv) => (
                <div key={inv.id} style={s.memberRow}>
                  <div>
                    <div style={s.memberEmail}>{inv.email}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{inv.role?.name}</div>
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
    </div>
  );
}
