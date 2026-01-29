import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { authFetch } from "../utils/authFetch";
import { useTranslation } from "react-i18next";

export default function MePage() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, email, name, lastName, hydrateFromServer } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    hydrateFromServer();
  }, [hydrateFromServer]);

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
      setSuccess(t("me.passwordUpdated"));
    } catch (err: any) {
      setError(String(err?.message ?? err ?? t("me.error")));
    } finally {
      setLoading(false);
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    page: { padding: 24, maxWidth: 720, margin: "0 auto" },
    card: {
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      background: "#fff",
      padding: 20,
    },
    title: { margin: 0, fontSize: 22, fontWeight: 900, color: "#111827" },
    sub: { margin: "8px 0 0", color: "#6b7280" },

    section: { marginTop: 18 },
    sectionTitle: { margin: 0, fontSize: 16, fontWeight: 900, color: "#111827" },

    label: { display: "block", fontSize: 13, fontWeight: 800, color: "#374151", marginBottom: 6 },
    input: {
      width: "100%",
      height: 42,
      borderRadius: 10,
      border: "1px solid #d1d5db",
      padding: "0 12px",
      outline: "none",
    },
    row: { display: "grid", gap: 12, marginTop: 12 },
    btn: {
      height: 44,
      borderRadius: 10,
      border: "none",
      backgroundColor: "#6366f1",
      color: "#ffffff",
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
      border: "1px solid #ef4444",
      background: "#fef2f2",
      color: "#991b1b",
      fontWeight: 700,
    },
    success: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      border: "1px solid #22c55e",
      background: "#f0fdf4",
      color: "#166534",
      fontWeight: 700,
    },
    pill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      borderRadius: 999,
      border: "1px solid #e5e7eb",
      padding: "6px 10px",
      background: "#fafafa",
      fontWeight: 800,
      color: "#111827",
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
      border: "1px solid #d1d5db",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 800,
      color: "#111827",
    },
    langBtnActive: {
      border: "1px solid #6366f1",
      boxShadow: "0 0 0 3px rgba(99,102,241,0.15)",
    },
    flag: { fontSize: 18, lineHeight: 1 },
    langHint: { color: "#6b7280", fontSize: 13, marginTop: 8 },
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.page}>
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
    <div style={styles.page}>
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
      </div>
    </div>
  );
}
