import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/authFetch";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { BREAKPOINTS } from "../hooks/breakpoints";

export default function ConfirmPasswordChange() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isMobile = useMediaQuery(BREAKPOINTS.mobile);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setErrorMsg(t("confirmPasswordChange.invalidLink"));
      return;
    }

    apiFetch(`/auth/confirm-password-change?token=${encodeURIComponent(token)}`)
      .then(() => setStatus("success"))
      .catch((err: any) => {
        setStatus("error");
        setErrorMsg(String(err?.message ?? err ?? t("confirmPasswordChange.invalidLink")));
      });
  }, [t]);

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
    title: { margin: 0, fontSize: 24, fontWeight: 600, lineHeight: 1.2, marginBottom: 16 },
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
    <div className="animate-page" style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>{t("confirmPasswordChange.title")}</h1>

        {status === "loading" && (
          <div style={styles.box}>
            <p>{t("common.loading")}</p>
          </div>
        )}

        {status === "success" && (
          <>
            <div style={styles.box}>
              <p>{t("confirmPasswordChange.success")}</p>
            </div>
            <div style={styles.link}>
              <a href="/signin" style={styles.a}>{t("confirmPasswordChange.goToSignin")}</a>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div style={styles.box}>
              <p>{errorMsg || t("confirmPasswordChange.invalidLink")}</p>
            </div>
            <div style={styles.link}>
              <a href="/signin" style={styles.a}>{t("confirmPasswordChange.goToSignin")}</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
