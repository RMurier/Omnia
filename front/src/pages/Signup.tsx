import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/authFetch";
import { useAuthStore } from "../stores/authStore";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { BREAKPOINTS } from "../hooks/breakpoints";

export default function SignUp() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendOk, setResendOk] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);

  const isMobile = useMediaQuery(BREAKPOINTS.mobile);

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      window.location.replace("/");
    }
  }, [hydrated, isAuthenticated]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !lastName.trim()) {
      setError(t("signup.nameRequired"));
      return;
    }
    if (!termsAccepted) {
      setError(t("signup.termsRequired"));
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          lastName: lastName.trim(),
          termsAccepted: true,
        }),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(String(err?.message ?? err ?? t("signup.error")));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    setResendOk(false);
    try {
      await apiFetch("/auth/resend-confirmation", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setResendOk(true);
    } catch {
    } finally {
      setResending(false);
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "24px 12px" : "40px" },
    card: {
      width: "100%",
      maxWidth: 420,
      borderRadius: 12,
      backgroundColor: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      boxShadow: "0 4px 15px var(--color-shadow)",
      padding: isMobile ? 16 : 32,
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
    successBox: {
      padding: 16,
      borderRadius: 8,
      border: "1px solid var(--color-border)",
      backgroundColor: "var(--color-surface-sunken)",
      textAlign: "center" as const,
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
    link: { textAlign: "center" as const, marginTop: 16, fontSize: 14, color: "var(--color-text-muted)" },
    a: { color: "var(--color-primary)", textDecoration: "none" },
  };


  if (success) {
    return (
      <div className="animate-page" style={styles.page}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h1 style={styles.title}>{t("signup.title")}</h1>
          </div>
          <div style={styles.successBox}>
            <p style={{ marginBottom: 12 }}>{t("signup.checkEmail")}</p>
            <button
              type="button"
              onClick={onResend}
              disabled={resending}
              style={{ ...styles.btn, height: 36, fontSize: 14, padding: "0 16px" }}
            >
              {resending ? t("signup.resending") : t("signup.resend")}
            </button>
            {resendOk && <p style={{ marginTop: 8, fontSize: 13, color: "var(--color-text-muted)" }}>{t("signup.resendOk")}</p>}
          </div>
          <div style={styles.link}>
            <a href="/signin" style={styles.a}>{t("signup.alreadyHaveAccount")}</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-page" style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>{t("signup.title")}</h1>
          <p style={styles.subtitle}>{t("signup.subtitle")}</p>
        </div>

        <form onSubmit={onSubmit} style={styles.form} noValidate>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="email">{t("signup.email")}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("signup.emailPlaceholder")}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">{t("signup.password")}</label>
            <div style={styles.pwdRow}>
              <input
                id="password"
                autoComplete="new-password"
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
              >
                {showPwd ? t("signup.hide") : t("signup.show")}
              </button>
            </div>
            {password.length > 0 && password.length < 6 && <div style={styles.help}>{t("signup.minChars")}</div>}
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="name">{t("signup.name")}</label>
            <input
              id="name"
              type="text"
              autoComplete="given-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("signup.namePlaceholder")}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="lastName">{t("signup.lastName")}</label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("signup.lastNamePlaceholder")}
              style={styles.input}
            />
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{ marginTop: 3, cursor: "pointer", accentColor: "var(--color-primary)", flexShrink: 0 }}
            />
            <label htmlFor="terms" style={{ fontSize: 14, color: "var(--color-text-secondary)", cursor: "pointer", lineHeight: 1.5 }}>
              {t("signup.termsPrefix")}{" "}
              <a href="/terms" target="_blank" rel="noreferrer" style={styles.a}>
                {t("signup.termsLink")}
              </a>
            </label>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? t("signup.loading") : t("signup.submit")}
          </button>
        </form>

        <div style={styles.link}>
          <a href="/signin" style={styles.a}>{t("signup.alreadyHaveAccount")}</a>
        </div>
      </div>
    </div>
  );
}
