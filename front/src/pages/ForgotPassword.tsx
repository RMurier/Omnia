import React, { useState } from "react";
import { apiFetch } from "../utils/authFetch";
import { useTranslation } from "react-i18next";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch (err: any) {
      setError(String(err?.message ?? err ?? t("forgotPassword.error")));
    } finally {
      setLoading(false);
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" },
    card: {
      width: "100%",
      maxWidth: 420,
      borderRadius: 12,
      backgroundColor: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      boxShadow: "0 4px 15px var(--color-shadow)",
      padding: 32,
      color: "var(--color-text-primary)",
    },
    header: { marginBottom: 16 },
    title: { margin: 0, fontSize: 24, fontWeight: 600, lineHeight: 1.2 },
    subtitle: { margin: "8px 0 0 0", fontSize: 14, color: "var(--color-text-muted)" },
    form: { display: "grid", gap: 16 },
    field: { display: "grid", gap: 8 },
    label: { fontSize: 14, color: "var(--color-text-secondary)", fontWeight: 500 },
    input: {
      height: 42,
      borderRadius: 8,
      border: "1px solid var(--color-border-strong)",
      backgroundColor: "var(--color-surface)",
      color: "var(--color-text-primary)",
      padding: "0 12px",
      outline: "none",
    },
    error: {
      padding: 12,
      borderRadius: 8,
      border: "1px solid var(--color-error-border)",
      backgroundColor: "var(--color-error-bg)",
      color: "var(--color-error-text)",
      fontSize: 14,
    },
    btn: {
      height: 44,
      borderRadius: 8,
      border: "none",
      backgroundColor: "var(--color-primary)",
      color: "#ffffff",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 16,
    },
    box: {
      padding: 16,
      borderRadius: 8,
      border: "1px solid var(--color-border)",
      backgroundColor: "var(--color-surface-sunken)",
      textAlign: "center" as const,
    },
    link: { textAlign: "center" as const, marginTop: 16, fontSize: 14, color: "var(--color-text-muted)" },
    a: { color: "var(--color-primary)", textDecoration: "none" },
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>{t("forgotPassword.title")}</h1>
          <p style={styles.subtitle}>{t("forgotPassword.subtitle")}</p>
        </div>

        {sent ? (
          <>
            <div style={styles.box}>
              <p>{t("forgotPassword.success")}</p>
            </div>
            <div style={styles.link}>
              <a href="/signin" style={styles.a}>{t("forgotPassword.backToSignin")}</a>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={onSubmit} style={styles.form} noValidate>
              <div style={styles.field}>
                <label style={styles.label} htmlFor="email">
                  {t("forgotPassword.email")}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("forgotPassword.emailPlaceholder")}
                  style={styles.input}
                />
              </div>

              {error && <div style={styles.error}>{error}</div>}

              <button type="submit" style={styles.btn} disabled={loading}>
                {loading ? t("forgotPassword.loading") : t("forgotPassword.submit")}
              </button>
            </form>

            <div style={styles.link}>
              <a href="/signin" style={styles.a}>{t("forgotPassword.backToSignin")}</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
