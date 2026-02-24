import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { BREAKPOINTS } from "../hooks/breakpoints";
import { authFetch } from "../utils/authFetch";

type AppItem = {
  id: string;
  name: string;
  description?: string | null;
  url?: string | null;
  isActive?: boolean;
  logRetentionValue?: number | null;
  logRetentionUnit?: string | null;
};

type AppVersion = {
  id: string;
  version: number;
  isActive: boolean;
  createdAt: string;
};

type CreateAppResult = {
  application: AppItem;
  secretBase64: string;
  version: AppVersion;
};

export default function AdminApplicationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);

  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createUrl, setCreateUrl] = useState("");
  const [createIsActive, setCreateIsActive] = useState(true);

  // One-time secret modal
  const [secretModalOpen, setSecretModalOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [createdVersion, setCreatedVersion] = useState<number | null>(null);
  const [createdAppName, setCreatedAppName] = useState<string | null>(null);

  // Versions inline panel
  const [versionsOpenFor, setVersionsOpenFor] = useState<string | null>(null);
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const canCreate = useMemo(() => createName.trim().length >= 2 && !busy, [createName, busy]);

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

  useEffect(() => { loadApps(); }, []);

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
    if (versionsOpenFor === appId) { setVersionsOpenFor(null); setVersions([]); return; }
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
      setCreatedAppName(app.name);
      setCreatedVersion(res.version.version);
      setCreatedSecret(res.secretBase64);
      setSecretModalOpen(true);
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
      await authFetch<void>(`/application/${appId}/versions/${version}/active?isActive=${isActiveValue}`, { method: "PATCH" });
      await loadVersions(appId);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const onSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    setBusy(true);
    setError(null);
    try {
      const created = await authFetch<CreateAppResult>("/application", {
        method: "POST",
        body: JSON.stringify({ name: createName.trim(), description: createDescription.trim() || null, url: createUrl.trim() || null, isActive: createIsActive }),
      });
      await loadApps();
      setIsCreateOpen(false);
      setCreateName(""); setCreateDescription(""); setCreateUrl(""); setCreateIsActive(true);
      if (created?.secretBase64 && created?.version?.version) {
        setCreatedAppName(created.application?.name ?? createName);
        setCreatedVersion(created.version.version);
        setCreatedSecret(created.secretBase64);
        setSecretModalOpen(true);
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (app: AppItem) => {
    if (!globalThis.confirm(t("applications.confirmDelete", { name: app.name }))) return;
    setBusy(true);
    setError(null);
    try {
      await authFetch<void>(`/application/${app.id}`, { method: "DELETE" });
      if (versionsOpenFor === app.id) { setVersionsOpenFor(null); setVersions([]); }
      await loadApps();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  const s: Record<string, React.CSSProperties> = {
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
    footer: { padding: 16, borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: 10, background: "var(--color-surface-raised)" },
    form: { display: "grid", gap: 12 },
    field: { display: "grid", gap: 6 },
    label: { fontSize: 13, fontWeight: 700, color: "var(--color-text-secondary)" },
    input: { height: 42, borderRadius: 8, border: "1px solid var(--color-border-strong)", padding: "0 12px", outline: "none", fontSize: 14, background: "var(--color-surface)", color: "var(--color-text-primary)" },
    textarea: { minHeight: 80, borderRadius: 8, border: "1px solid var(--color-border-strong)", padding: "10px 12px", outline: "none", fontSize: 14, resize: "vertical", background: "var(--color-surface)", color: "var(--color-text-primary)" },
    row: { display: "grid", gridTemplateColumns: isTablet ? "1fr" : "1fr 1fr", gap: 12 },
    checkboxRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 6 },
    mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
    hint: { fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.4 },
    secretBox: { border: "1px dashed var(--color-border-strong)", background: "var(--color-surface)", padding: 12, borderRadius: 10, display: "grid", gap: 10 },
    versionsWrap: { background: "var(--color-surface-raised)", borderTop: "1px solid var(--color-border)" },
    versionsInner: { padding: 14 },
    versionsTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" },
    versionsTitle: { margin: 0, fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)" },
    versionsTable: { width: "100%", borderCollapse: "collapse", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" },
    versionsTh: { textAlign: "left", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--color-text-muted)", padding: "10px 12px", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-raised)" },
    versionsTd: { padding: "10px 12px", borderBottom: "1px solid var(--color-border-td)", fontSize: 13, color: "var(--color-text-primary)", verticalAlign: "top" },
  };

  return (
    <div className="animate-page" style={s.page}>
      <div style={s.topBar}>
        <div>
          <h1 style={s.title}>{t("applications.title")}</h1>
          <p style={s.subtitle}>{t("applications.subtitle")}</p>
        </div>
        <div style={s.actions}>
          <button style={s.btn} onClick={loadApps} disabled={loading || busy}>{t("common.refresh")}</button>
          <button style={s.btnPrimary} onClick={() => setIsCreateOpen(true)} disabled={busy}>{t("applications.add")}</button>
        </div>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div className="hover-lift" style={s.card}>
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>{t("common.id")}</th>
                <th style={s.th}>{t("applications.name")}</th>
                <th style={s.th}>{t("applications.url")}</th>
                <th style={s.th}>{t("common.status")}</th>
                <th style={{ ...s.th, textAlign: "right" }}>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={s.td} colSpan={5}>{t("common.loading")}</td></tr>
              ) : apps.length === 0 ? (
                <tr><td style={s.td} colSpan={5}><div style={s.empty}>{t("applications.empty")}</div></td></tr>
              ) : (
                apps.map((a) => (
                  <React.Fragment key={a.id}>
                    <tr>
                      <td style={s.td}><div style={s.mono}>{a.id}</div></td>
                      <td style={s.td}>
                        <div style={{ fontWeight: 800 }}>{a.name}</div>
                        {a.description && <div style={s.tdMuted}>{a.description}</div>}
                      </td>
                      <td style={s.td}>
                        {a.url
                          ? <a href={a.url} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)" }}>{a.url}</a>
                          : <span style={{ color: "var(--color-text-faint)" }}>{t("common.noneSymbol")}</span>}
                      </td>
                      <td style={s.td}>
                        <span style={s.badge}>
                          <span style={{ width: 8, height: 8, borderRadius: 999, background: a.isActive === false ? "var(--color-error)" : "var(--color-success)", display: "inline-block" }} />
                          {a.isActive === false ? t("common.inactive") : t("common.active")}
                        </span>
                      </td>
                      <td style={{ ...s.td, textAlign: "right" }}>
                        <div style={s.rowActions}>
                          <button
                            style={{ ...s.smallBtn, display: "inline-flex", alignItems: "center", gap: 5 }}
                            onClick={() => navigate(`/applications/${a.id}/settings`)}
                            title={t("applications.settings")}
                          >
                            <Settings size={14} />
                          </button>
                          <button style={s.smallBtn} onClick={() => toggleVersions(a.id)} disabled={busy}>
                            {versionsOpenFor === a.id ? t("applications.hideVersions") : t("applications.versions")}
                          </button>
                          <button style={s.dangerBtn} onClick={() => onDelete(a)} disabled={busy}>{t("common.delete")}</button>
                        </div>
                      </td>
                    </tr>

                    {versionsOpenFor === a.id && (
                      <tr>
                        <td colSpan={5} style={{ padding: 0 }}>
                          <div style={s.versionsWrap}>
                            <div style={s.versionsInner}>
                              <div style={s.versionsTitleRow}>
                                <h3 style={s.versionsTitle}>{t("applications.versionsTitle", { name: a.name })}</h3>
                                <div style={{ display: "flex", gap: 10 }}>
                                  <button style={s.btn} onClick={() => loadVersions(a.id)} disabled={busy || versionsLoading}>{t("applications.refreshVersions")}</button>
                                  <button style={s.btnPrimary} onClick={() => onCreateVersion(a)} disabled={busy}>{t("applications.newVersion")}</button>
                                </div>
                              </div>
                              {versionsLoading ? (
                                <div style={s.empty}>{t("applications.versionsLoading")}</div>
                              ) : versions.length === 0 ? (
                                <div style={s.empty}>{t("applications.versionsEmpty")}</div>
                              ) : (
                                <table style={s.versionsTable}>
                                  <thead>
                                    <tr>
                                      <th style={s.versionsTh}>{t("applications.version")}</th>
                                      <th style={s.versionsTh}>{t("common.status")}</th>
                                      <th style={s.versionsTh}>{t("applications.createdAt")}</th>
                                      <th style={{ ...s.versionsTh, textAlign: "right" }}>{t("common.actions")}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {versions.map((v) => (
                                      <tr key={v.id}>
                                        <td style={s.versionsTd}><span style={s.badge}><span style={{ ...s.mono, fontWeight: 900 }}>{v.version}</span></span></td>
                                        <td style={s.versionsTd}>
                                          <span style={s.badge}>
                                            <span style={{ width: 8, height: 8, borderRadius: 999, background: v.isActive ? "var(--color-success)" : "var(--color-error)", display: "inline-block" }} />
                                            {v.isActive ? t("common.active") : t("common.inactive")}
                                          </span>
                                        </td>
                                        <td style={s.versionsTd}>{fmtDate(v.createdAt)}</td>
                                        <td style={{ ...s.versionsTd, textAlign: "right" }}>
                                          {v.isActive
                                            ? <button style={s.dangerBtn} onClick={() => onToggleVersionActive(a.id, v.version, false)} disabled={busy}>{t("applications.disable")}</button>
                                            : <button style={s.smallBtn} onClick={() => onToggleVersionActive(a.id, v.version, true)} disabled={busy}>{t("applications.enable")}</button>}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                              <div style={{ ...s.hint, marginTop: 8 }}>
                                {t("applications.reminderPrefix")} <span style={s.mono}>X-Key-Version</span>.
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {isCreateOpen && (
        <div className="animate-overlay" style={s.overlay} onMouseDown={() => setIsCreateOpen(false)} role="dialog" aria-modal="true">
          <div className="animate-modal" style={s.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>{t("applications.addOne")}</h2>
              <button style={s.btn} onClick={() => setIsCreateOpen(false)} disabled={busy}>{t("applications.close")}</button>
            </div>
            <form onSubmit={onSaveCreate}>
              <div style={s.modalBody}>
                <div style={s.form}>
                  <div style={s.field}>
                    <label style={s.label}>{t("applications.name")}</label>
                    <input style={s.input} value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder={t("applications.namePlaceholder")} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>{t("applications.description")}</label>
                    <textarea style={s.textarea} value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} placeholder={t("applications.shortDescriptionPlaceholder")} />
                  </div>
                  <div style={s.row}>
                    <div style={s.field}>
                      <label style={s.label}>{t("applications.url")}</label>
                      <input style={s.input} value={createUrl} onChange={(e) => setCreateUrl(e.target.value)} placeholder={t("applications.urlPlaceholder")} />
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>{t("applications.isActive")}</label>
                      <div style={s.checkboxRow}>
                        <input type="checkbox" checked={createIsActive} onChange={(e) => setCreateIsActive(e.target.checked)} />
                        <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>{createIsActive ? t("common.yes") : t("common.no")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={s.footer}>
                <button style={s.btn} type="button" onClick={() => setIsCreateOpen(false)} disabled={busy}>{t("common.cancel")}</button>
                <button style={{ ...s.btnPrimary, ...(canCreate ? {} : s.btnDisabled) }} type="submit" disabled={!canCreate}>
                  {busy ? t("applications.saving") : t("common.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-time secret modal */}
      {secretModalOpen && (
        <div className="animate-overlay" style={s.overlay} onMouseDown={() => setSecretModalOpen(false)} role="dialog" aria-modal="true">
          <div className="animate-modal" style={s.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>{t("applications.secretModalTitle")}</h2>
              <button style={s.btn} onClick={() => setSecretModalOpen(false)}>{t("applications.close")}</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ color: "var(--color-text-primary)", fontWeight: 800 }}>
                  {t("applications.secretHeader", { name: createdAppName, version: createdVersion })}
                </div>
                <div style={s.secretBox}>
                  <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{t("applications.secretHelp")}</div>
                  <div style={{ ...s.mono, wordBreak: "break-all", fontSize: 13 }}>{createdSecret}</div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button style={s.btn} onClick={() => createdSecret && copyToClipboard(createdSecret)} type="button">{t("applications.copy")}</button>
                  </div>
                </div>
                <div style={s.hint}>
                  {t("applications.clientSidePrefix")} <span style={s.mono}>X-App-Id</span>, <span style={s.mono}>X-Key-Version</span>,{" "}
                  <span style={s.mono}>X-Timestamp</span>, <span style={s.mono}>X-Nonce</span>, <span style={s.mono}>X-Signature</span>.
                </div>
              </div>
            </div>
            <div style={s.footer}>
              <button style={s.btnPrimary} onClick={() => setSecretModalOpen(false)} type="button">{t("applications.copiedSecret")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
