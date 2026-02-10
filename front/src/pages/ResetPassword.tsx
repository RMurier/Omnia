import React, { useMemo, useState } from "react";
import { apiFetch } from "../utils/authFetch";
import { useTranslation } from "react-i18next";

export default function ResetPassword() {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t("resetPassword.passwordMismatch"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("resetPassword.minChars"));
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(String(err?.message ?? err ?? t("resetPassword.invalidLink")));
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
    help: { fontSize: 12, color: "var(--color-warning-help)" },
    pwdRow: { display: "flex", gap: 12, alignItems: "center" },
    pwdInput: { flex: 1 },
    pwdBtn: {
      height: 42,
      padding: "0 12px",
      borderRadius: 8,
      border: "1px solid var(--color-border-strong)",
      backgroundColor: "var(--color-surface-sunken)",
      color: "var(--color-text-secondary)",
      cursor: "pointer",
      fontSize: 14,
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

  if (!token) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>{t("resetPassword.title")}</h1>
          <div style={styles.box}>
            <p>{t("resetPassword.invalidLink")}</p>
          </div>
          <div style={styles.link}>
            <a href="/signin" style={styles.a}>{t("resetPassword.goToSignin")}</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>{t("resetPassword.title")}</h1>
        </div>

        {success ? (
          <>
            <div style={styles.box}>
              <p>{t("resetPassword.success")}</p>
            </div>
            <div style={styles.link}>
              <a href="/signin" style={styles.a}>{t("resetPassword.goToSignin")}</a>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={onSubmit} style={styles.form} noValidate>
              <div style={styles.field}>
                <label style={styles.label} htmlFor="newPassword">
                  {t("resetPassword.newPassword")}
                </label>
                <div style={styles.pwdRow}>
                  <input
                    id="newPassword"
                    autoComplete="new-password"
                    type={showPwd ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ ...styles.input, ...styles.pwdInput }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    style={styles.pwdBtn}
                  >
                    {showPwd ? t("signin.hide") : t("signin.show")}
                  </button>
                </div>
                {newPassword.length > 0 && newPassword.length < 6 && (
                  <div style={styles.help}>{t("resetPassword.minChars")}</div>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label} htmlFor="confirmPassword">
                  {t("resetPassword.confirmPassword")}
                </label>
                <input
                  id="confirmPassword"
                  autoComplete="new-password"
                  type={showPwd ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={styles.input}
                />
              </div>

              {error && <div style={styles.error}>{error}</div>}

              <button type="submit" style={styles.btn} disabled={loading}>
                {loading ? t("resetPassword.loading") : t("resetPassword.submit")}
              </button>
            </form>

            <div style={styles.link}>
              <a href="/signin" style={styles.a}>{t("resetPassword.goToSignin")}</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
