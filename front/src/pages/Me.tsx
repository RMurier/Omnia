import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuthStore } from "../stores/authStore";
import { authFetch, authFetchResponse } from "../utils/authFetch";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { BREAKPOINTS } from "../hooks/breakpoints";

export default function MePage() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, email, name, lastName, hydrateFromServer } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  type AppMember = { userId: string; name?: string; lastName?: string; email: string; role: string };
  type SoloOwnedApp = { appId: string; appName: string; members: AppMember[] };
  type AppDecision = { action: "Delete" | "Transfer"; transferToUserId?: string };

  const [exporting, setExporting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"idle" | "loading" | "apps" | "confirm" | "deleting">("idle");
  const [soloApps, setSoloApps] = useState<SoloOwnedApp[]>([]);
  const [decisions, setDecisions] = useState<Record<string, AppDecision>>({});
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    hydrateFromServer();
  }, [hydrateFromServer]);

  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const currentLang = (i18n.language || "en").toLowerCase();
  const isFr = currentLang.startsWith("fr");
  const isEn = currentLang.startsWith("en");

  const setLanguage = async (lng: "en" | "fr") => {
    setError(null);
    setSuccess(null);
    await i18n.changeLanguage(lng);
    // le language detector persiste déjà dans localStorage (i18nextLng)
  };

  const canSubmit = useMemo(() => {
    if (!currentPassword || !newPassword || !confirm) return false;
    if (newPassword.length < 6) return false;
    if (newPassword !== confirm) return false;
    return true;
  }, [currentPassword, newPassword, confirm]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canSubmit) return;

    setLoading(true);
    try {
      await authFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setSuccess(t("me.passwordChangeEmailSent"));
    } catch (err: any) {
      setError(String(err?.message ?? err ?? t("me.error")));
    } finally {
      setLoading(false);
    }
  };

  const onExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await authFetchResponse("/auth/me/export");
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `omnia-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
    } finally {
      setExporting(false);
    }
  }, []);

  const onDeleteStart = useCallback(async () => {
    setDeleteError(null);
    setDeleteStep("loading");
    try {
      const apps = await authFetch<SoloOwnedApp[]>("/auth/me/solo-owned-apps");
      setSoloApps(apps);
      const initial: Record<string, AppDecision> = {};
      apps.forEach((app) => {
        initial[app.appId] = app.members.length === 0
          ? { action: "Delete" }
          : { action: "Delete" };
      });
      setDecisions(initial);
      setDeleteStep(apps.length > 0 ? "apps" : "confirm");
    } catch {
      setDeleteStep("idle");
    }
  }, []);

  const onDeleteConfirm = useCallback(async () => {
    setDeleteError(null);
    setDeleteStep("deleting");
    try {
      const appDecisions = Object.entries(decisions).map(([appId, d]) => ({
        appId,
        action: d.action,
        transferToUserId: d.transferToUserId ?? null,
      }));
      await authFetch("/auth/me", {
        method: "DELETE",
        body: JSON.stringify({ appDecisions }),
      });
      window.location.href = "/";
    } catch (err: any) {
      setDeleteError(String(err?.message ?? err));
      setDeleteStep("confirm");
    }
  }, [decisions]);

  const allDecisionsValid = soloApps.every((app) => {
    const d = decisions[app.appId];
    if (!d) return false;
    if (d.action === "Transfer" && !d.transferToUserId) return false;
    return true;
  });

  const styles: Record<string, React.CSSProperties> = {
    page: { padding: isMobile ? "12px 8px" : 24, maxWidth: 720, margin: "0 auto" },
    card: {
      border: "1px solid var(--color-border)",
      borderRadius: 14,
      background: "var(--color-surface)",
      padding: 20,
    },
    title: { margin: 0, fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)" },
    sub: { margin: "8px 0 0", color: "var(--color-text-muted)" },

    section: { marginTop: 18 },
    sectionTitle: { margin: 0, fontSize: 16, fontWeight: 900, color: "var(--color-text-primary)" },

    label: { display: "block", fontSize: 13, fontWeight: 800, color: "var(--color-text-secondary)", marginBottom: 6 },
    input: {
      width: "100%",
      height: 42,
      borderRadius: 10,
      border: "1px solid var(--color-border-strong)",
      padding: "0 12px",
      outline: "none",
      boxSizing: "border-box" as const,
      backgroundColor: "var(--color-surface)",
      color: "var(--color-text-primary)",
      fontSize: 14,
    },
    row: { display: "grid", gap: 12, marginTop: 12 },
    btn: {
      height: 44,
      borderRadius: 10,
      border: "none",
      backgroundColor: "var(--color-primary)",
      color: "var(--color-surface)",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14,
      marginTop: 14,
      opacity: loading || !canSubmit ? 0.6 : 1,
    },
    error: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      border: "1px solid var(--color-error-border)",
      background: "var(--color-error-bg)",
      color: "var(--color-error-text)",
      fontWeight: 700,
    },
    success: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      border: "1px solid var(--color-success-border)",
      background: "var(--color-success-bg-alt)",
      color: "var(--color-success-text-alt)",
      fontWeight: 700,
    },
    pill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      borderRadius: 999,
      border: "1px solid var(--color-border)",
      padding: "6px 10px",
      background: "var(--color-surface-raised)",
      fontWeight: 800,
      color: "var(--color-text-primary)",
      marginTop: 12,
    },

    langRow: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "center",
      marginTop: 10,
    },
    langBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      height: 40,
      padding: "0 12px",
      borderRadius: 10,
      border: "1px solid var(--color-border-strong)",
      background: "var(--color-surface)",
      cursor: "pointer",
      fontWeight: 800,
      color: "var(--color-text-primary)",
    },
    langBtnActive: {
      border: "1px solid var(--color-primary)",
      boxShadow: "0 0 0 3px rgba(99,102,241,0.15)",
    },
    flag: { fontSize: 18, lineHeight: 1 },
    langHint: { color: "var(--color-text-muted)", fontSize: 13, marginTop: 8 },
    dangerBtn: {
      height: 44,
      borderRadius: 10,
      border: "1px solid var(--color-error-border)",
      backgroundColor: "transparent",
      color: "var(--color-error-text)",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14,
    },
    secondaryBtn: {
      height: 44,
      borderRadius: 10,
      border: "1px solid var(--color-border-strong)",
      backgroundColor: "transparent",
      color: "var(--color-text-secondary)",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14,
    },
    overlay: {
      position: "fixed" as const,
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 16,
    },
    modal: {
      backgroundColor: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 14,
      padding: 24,
      maxWidth: 540,
      width: "100%",
      maxHeight: "80vh",
      overflowY: "auto" as const,
    },
    modalTitle: { margin: "0 0 16px", fontSize: 18, fontWeight: 900, color: "var(--color-text-primary)" },
    appCard: {
      border: "1px solid var(--color-border)",
      borderRadius: 10,
      padding: 16,
      marginBottom: 12,
      backgroundColor: "var(--color-surface-sunken)",
    },
    appName: { fontWeight: 800, fontSize: 15, marginBottom: 12, color: "var(--color-text-primary)" },
    radioRow: { display: "flex", flexDirection: "column" as const, gap: 8 },
    radioLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer", color: "var(--color-text-secondary)" },
    select: {
      marginTop: 8,
      width: "100%",
      height: 38,
      borderRadius: 8,
      border: "1px solid var(--color-border-strong)",
      backgroundColor: "var(--color-surface)",
      color: "var(--color-text-primary)",
      padding: "0 10px",
      fontSize: 14,
    },
    modalActions: { display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" },
  };

  if (!isAuthenticated) {
    return (
      <div className="animate-page" style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>{t("me.title")}</h1>
          <p style={styles.sub}>{t("me.mustBeConnected")}</p>
          <div style={{ marginTop: 12 }}>
            <a href="/signin">{t("me.goToSignin")}</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-page" style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>{t("me.title")}</h1>
        <p style={styles.sub}>{t("me.subtitle")}</p>

        {/* Language selector */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>{t("me.languageTitle")}</h2>

          <div style={styles.langRow}>
            <button
              type="button"
              style={{ ...styles.langBtn, ...(isEn ? styles.langBtnActive : {}) }}
              onClick={() => setLanguage("en")}
              aria-pressed={isEn}
            >
              <span style={styles.flag} aria-hidden="true">
                🇬🇧
              </span>
              <span>English</span>
            </button>

            <button
              type="button"
              style={{ ...styles.langBtn, ...(isFr ? styles.langBtnActive : {}) }}
              onClick={() => setLanguage("fr")}
              aria-pressed={isFr}
            >
              <span style={styles.flag} aria-hidden="true">
                🇫🇷
              </span>
              <span>Français</span>
            </button>
          </div>

          <div style={styles.langHint}>
            {t("me.currentLanguage")} <strong>{isFr ? "fr" : "en"}</strong>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <div style={styles.pill}>
            <span>{t("me.email")}</span>
            <span>{email ?? "-"}</span>
          </div>
          {name && (
            <div style={styles.pill}>
              <span>{t("me.name")}</span>
              <span>{name}</span>
            </div>
          )}
          {lastName && (
            <div style={styles.pill}>
              <span>{t("me.lastName")}</span>
              <span>{lastName}</span>
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>{t("me.changePassword")}</h2>

          <form onSubmit={onSubmit} style={styles.row}>
            <div>
              <label style={styles.label} htmlFor="currentPassword">
                {t("me.currentPassword")}
              </label>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label} htmlFor="newPassword">
                {t("me.newPassword")}
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label} htmlFor="confirmPassword">
                {t("me.confirmNewPassword")}
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={styles.input}
              />
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.success}>{success}</div>}

            <button type="submit" style={styles.btn} disabled={loading || !canSubmit}>
              {loading ? t("me.updating") : t("me.update")}
            </button>
          </form>
        </div>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>{t("me.gdprTitle")}</h2>
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              style={styles.secondaryBtn}
              onClick={onExport}
              disabled={exporting}
            >
              {exporting ? t("me.exporting") : t("me.exportData")}
            </button>
            <button
              type="button"
              style={styles.dangerBtn}
              onClick={onDeleteStart}
              disabled={deleteStep !== "idle"}
            >
              {t("me.deleteAccount")}
            </button>
          </div>
        </div>
      </div>

      {/* Delete modal — step: apps */}
      {deleteStep === "apps" && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>{t("me.deleteAccount")}</h2>
            <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 16 }}>{t("me.appsToResolve")}</p>

            {soloApps.map((app) => (
              <div key={app.appId} style={styles.appCard}>
                <div style={styles.appName}>{app.appName}</div>

                {app.members.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>{t("me.appNoMembers")}</p>
                ) : (
                  <div style={styles.radioRow}>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name={app.appId}
                        checked={decisions[app.appId]?.action === "Delete"}
                        onChange={() => setDecisions((d) => ({ ...d, [app.appId]: { action: "Delete" } }))}
                      />
                      {t("me.appActionDelete")}
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name={app.appId}
                        checked={decisions[app.appId]?.action === "Transfer"}
                        onChange={() => setDecisions((d) => ({ ...d, [app.appId]: { action: "Transfer" } }))}
                      />
                      {t("me.appActionTransfer")}
                    </label>
                    {decisions[app.appId]?.action === "Transfer" && (
                      <select
                        style={styles.select}
                        value={decisions[app.appId]?.transferToUserId ?? ""}
                        onChange={(e) => setDecisions((d) => ({ ...d, [app.appId]: { action: "Transfer", transferToUserId: e.target.value } }))}
                      >
                        <option value="">{t("me.transferPlaceholder")}</option>
                        {app.members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.name || m.lastName ? `${m.name ?? ""} ${m.lastName ?? ""}`.trim() : m.email} ({m.role})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div style={styles.modalActions}>
              <button type="button" style={styles.secondaryBtn} onClick={() => setDeleteStep("idle")}>
                {t("me.deleteAccountCancel")}
              </button>
              <button
                type="button"
                style={{ ...styles.dangerBtn, opacity: allDecisionsValid ? 1 : 0.5 }}
                disabled={!allDecisionsValid}
                onClick={() => setDeleteStep("confirm")}
              >
                {t("me.next")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal — step: confirm */}
      {(deleteStep === "confirm" || deleteStep === "deleting") && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>{t("me.deleteAccount")}</h2>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 20 }}>{t("me.deleteAccountConfirm")}</p>
            {deleteError && (
              <div style={{ ...styles.error, marginBottom: 12 }}>{deleteError}</div>
            )}
            <div style={styles.modalActions}>
              <button type="button" style={styles.secondaryBtn} onClick={() => setDeleteStep("idle")} disabled={deleteStep === "deleting"}>
                {t("me.deleteAccountCancel")}
              </button>
              <button type="button" style={styles.dangerBtn} onClick={onDeleteConfirm} disabled={deleteStep === "deleting"}>
                {deleteStep === "deleting" ? t("me.deleting") : t("me.deleteAccountConfirmBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
