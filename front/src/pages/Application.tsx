import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
      await loadApps();
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
    page: { padding: 24, maxWidth: 1100, margin: "0 auto" },
    topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 },
    title: { margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" },
    subtitle: { margin: "6px 0 0 0", color: "#6b7280", fontSize: 14 },
    actions: { display: "flex", gap: 10, alignItems: "center" },
    btn: { padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontWeight: 600 },
    btnPrimary: { padding: "10px 12px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontWeight: 700 },
    btnDisabled: { opacity: 0.7, cursor: "not-allowed" },

    card: { border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", overflow: "hidden" },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { textAlign: "left", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: "#6b7280", padding: "12px 14px", borderBottom: "1px solid #e5e7eb", background: "#fafafa" },
    td: { padding: "12px 14px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top", color: "#111827", fontSize: 14 },
    tdMuted: { color: "#6b7280", fontSize: 13, marginTop: 4 },

    rowActions: { display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" },
    smallBtn: { padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 },
    dangerBtn: { padding: "8px 10px", borderRadius: 8, border: "1px solid #ef4444", background: "#fff", cursor: "pointer", fontWeight: 700, color: "#b91c1c", fontSize: 13 },

    badge: { display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "1px solid #e5e7eb", background: "#fff" },

    error: { border: "1px solid #ef4444", background: "#fef2f2", color: "#991b1b", padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 14 },
    empty: { padding: 18, color: "#6b7280" },

    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 },
    modal: { width: "100%", maxWidth: 620, background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 18px 60px rgba(0,0,0,0.25)", overflow: "hidden" },
    modalHeader: { padding: "14px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#fafafa" },
    modalTitle: { margin: 0, fontSize: 16, fontWeight: 800, color: "#111827" },
    modalBody: { padding: 16 },
    form: { display: "grid", gap: 12 },
    field: { display: "grid", gap: 6 },
    label: { fontSize: 13, fontWeight: 700, color: "#374151" },
    input: { height: 42, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 12px", outline: "none", fontSize: 14 },
    textarea: { minHeight: 90, borderRadius: 8, border: "1px solid #d1d5db", padding: "10px 12px", outline: "none", fontSize: 14, resize: "vertical" },
    row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    checkboxRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 6 },

    footer: { padding: 16, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 10, background: "#fafafa" },

    versionsWrap: { background: "#fafafa", borderTop: "1px solid #e5e7eb" },
    versionsInner: { padding: 14 },
    versionsTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" },
    versionsTitle: { margin: 0, fontSize: 14, fontWeight: 800, color: "#111827" },
    versionsTable: { width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" },
    versionsTh: { textAlign: "left", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: "#6b7280", padding: "10px 12px", borderBottom: "1px solid #e5e7eb", background: "#fafafa" },
    versionsTd: { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#111827", verticalAlign: "top" },
    mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" },
    hint: { fontSize: 13, color: "#6b7280", marginTop: 8, lineHeight: 1.4 },
    secretBox: { border: "1px dashed #d1d5db", background: "#fff", padding: 12, borderRadius: 10, display: "grid", gap: 10 },
  };

  return (
    <div style={styles.page}>
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

      <div style={styles.card}>
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
                          <a href={a.url} target="_blank" rel="noreferrer" style={{ color: "#6366f1" }}>
                            {a.url}
                          </a>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>{t("common.noneSymbol")}</span>
                        )}
                      </td>

                      <td style={styles.td}>
                        <span style={styles.badge}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background: a.isActive === false ? "#ef4444" : "#10b981",
                              display: "inline-block",
                            }}
                          />
                          {a.isActive === false ? t("common.inactive") : t("common.active")}
                        </span>
                      </td>

                      <td style={{ ...styles.td, textAlign: "right" }}>
                        <div style={styles.rowActions}>
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
                                                background: v.isActive ? "#10b981" : "#ef4444",
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
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div style={styles.overlay} onMouseDown={closeModal} role="dialog" aria-modal="true">
          <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
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
                        <span style={{ color: "#374151", fontSize: 14 }}>{isActive ? t("common.yes") : t("common.no")}</span>
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
        <div style={styles.overlay} onMouseDown={closeSecretModal} role="dialog" aria-modal="true">
          <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{t("applications.secretModalTitle")}</h2>
              <button style={styles.btn} onClick={closeSecretModal}>
                {t("applications.close")}
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ color: "#111827", fontWeight: 800 }}>
                  {t("applications.secretHeader", { name: createdAppName, version: createdVersion })}
                </div>

                <div style={styles.secretBox}>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>{t("applications.secretHelp")}</div>

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
