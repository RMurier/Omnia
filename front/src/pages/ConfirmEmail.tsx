import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/authFetch";
import { useTranslation } from "react-i18next";

export default function ConfirmEmail() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendOk, setResendOk] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setErrorMsg(t("confirmEmail.invalidLink"));
      return;
    }

    apiFetch(`/auth/confirm-email?token=${encodeURIComponent(token)}`)
      .then(() => setStatus("success"))
      .catch((err: any) => {
        setStatus("error");
        setErrorMsg(String(err?.message ?? err ?? t("confirmEmail.invalidLink")));
      });
  }, [t]);

  const onResend = async () => {
    setResending(true);
    setResendOk(false);
    try {
      await apiFetch("/auth/resend-confirmation", {
        method: "POST",
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
      setResendOk(true);
    } catch {
    } finally {
      setResending(false);
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
    title: { margin: 0, fontSize: 24, fontWeight: 600, lineHeight: 1.2, marginBottom: 16 },
    box: {
      padding: 16,
      borderRadius: 8,
      border: "1px solid var(--color-border)",
      backgroundColor: "var(--color-surface-sunken)",
      textAlign: "center" as const,
    },
    input: {
      height: 42,
      borderRadius: 8,
      border: "1px solid var(--color-border-strong)",
      backgroundColor: "var(--color-surface)",
      color: "var(--color-text-primary)",
      padding: "0 12px",
      outline: "none",
      width: "100%",
      boxSizing: "border-box" as const,
    },
    btn: {
      height: 36,
      borderRadius: 8,
      border: "none",
      backgroundColor: "var(--color-primary)",
      color: "#ffffff",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 14,
      padding: "0 16px",
    },
    link: { textAlign: "center" as const, marginTop: 16, fontSize: 14, color: "var(--color-text-muted)" },
    a: { color: "var(--color-primary)", textDecoration: "none" },
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>{t("confirmEmail.title")}</h1>

        {status === "loading" && (
          <div style={styles.box}>
            <p>{t("common.loading")}</p>
          </div>
        )}

        {status === "success" && (
          <>
            <div style={styles.box}>
              <p>{t("confirmEmail.success")}</p>
            </div>
            <div style={styles.link}>
              <a href="/signin" style={styles.a}>{t("confirmEmail.goToSignin")}</a>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div style={styles.box}>
              <p style={{ marginBottom: 12 }}>{errorMsg || t("confirmEmail.invalidLink")}</p>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 8 }}>{t("confirmEmail.resendPrompt")}</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder={t("confirmEmail.emailPlaceholder")}
                  style={{ ...styles.input, width: "auto", flex: 1 }}
                />
                <button type="button" onClick={onResend} disabled={resending} style={styles.btn}>
                  {resending ? t("confirmEmail.resending") : t("confirmEmail.resend")}
                </button>
              </div>
              {resendOk && <p style={{ marginTop: 8, fontSize: 13, color: "var(--color-text-muted)" }}>{t("confirmEmail.resendOk")}</p>}
            </div>
            <div style={styles.link}>
              <a href="/signin" style={styles.a}>{t("confirmEmail.goToSignin")}</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
