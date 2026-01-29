import React, { useMemo, useState } from "react";
import { signin } from "../utils/authFetch";
import { useAuthStore } from "../stores/authStore";
import { useTranslation } from "react-i18next";

export default function SignIn() {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPwd, setShowPwd] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const from = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("from") || "/";
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signin(email.trim(), password);
      useAuthStore.getState().setAuthenticated(true);
      window.location.href = from;
    } catch (err: any) {
      setError(String(err?.message ?? err ?? t("signin.connectionError")));
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
      backgroundColor: "#ffffff",
      border: "1px solid #e5e7eb",
      boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
      padding: 32,
      color: "#1f2937",
    },
    header: { marginBottom: 16 },
    title: { margin: 0, fontSize: 24, fontWeight: 600, lineHeight: 1.2 },
    subtitle: { margin: "8px 0 0 0", fontSize: 14, color: "#6b7280" },
    form: { display: "grid", gap: 16 },
    field: { display: "grid", gap: 8 },
    label: { fontSize: 14, color: "#374151", fontWeight: 500 },
    input: {
      height: 42,
      borderRadius: 8,
      border: "1px solid #d1d5db",
      backgroundColor: "#ffffff",
      color: "#111827",
      padding: "0 12px",
      outline: "none",
    },
    help: { fontSize: 12, color: "#f59e0b" },
    pwdRow: { display: "flex", gap: 12, alignItems: "center" },
    pwdInput: { flex: 1 },
    pwdBtn: {
      height: 42,
      padding: "0 12px",
      borderRadius: 8,
      border: "1px solid #d1d5db",
      backgroundColor: "#f3f4f6",
      color: "#374151",
      cursor: "pointer",
      fontSize: 14,
    },
    error: {
      padding: 12,
      borderRadius: 8,
      border: "1px solid #ef4444",
      backgroundColor: "#fef2f2",
      color: "#991b1b",
      fontSize: 14,
    },
    btn: {
      height: 44,
      borderRadius: 8,
      border: "none",
      backgroundColor: "#6366f1",
      color: "#ffffff",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 16,
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>{t("signin.title")}</h1>
          <p style={styles.subtitle}>{t("signin.subtitle")}</p>
        </div>

        <form onSubmit={onSubmit} style={styles.form} noValidate>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="email">
              {t("signin.email")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("signin.emailPlaceholder")}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">
              {t("signin.password")}
            </label>
            <div style={styles.pwdRow}>
              <input
                id="password"
                autoComplete="current-password"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ ...styles.input, ...styles.pwdInput }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                style={styles.pwdBtn}
                aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPwd ? t("signin.hide") : t("signin.show")}
              </button>
            </div>
            {password.length > 0 && password.length < 6 && <div style={styles.help}>{t("signin.minChars")}</div>}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? t("signin.loading") : t("signin.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}