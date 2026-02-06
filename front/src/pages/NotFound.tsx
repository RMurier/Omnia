import React from "react";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();
  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "calc(100vh - 64px)",
      display: "grid",
      placeItems: "center",
      padding: 24,
      background: "var(--color-surface)",
    },
    card: {
      width: "100%",
      maxWidth: 720,
      border: "1px solid var(--color-border)",
      borderRadius: 14,
      padding: 22,
      background: "var(--color-surface)",
    },
    code: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "6px 12px",
      borderRadius: 999,
      border: "1px solid var(--color-border)",
      background: "var(--color-surface-raised)",
      color: "var(--color-text-primary)",
      fontWeight: 800,
      letterSpacing: 0.2,
      marginBottom: 12,
      fontSize: 13,
    },
    title: { margin: "6px 0 6px", fontSize: 26, color: "var(--color-text-primary)", fontWeight: 900 },
    text: { margin: 0, color: "var(--color-text-muted)", lineHeight: 1.55, fontSize: 14 },
    actions: { display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" },
    btn: {
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid var(--color-border-strong)",
      background: "var(--color-surface)",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 14,
      textDecoration: "none",
      color: "var(--color-text-primary)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    btnPrimary: {
      padding: "10px 12px",
      borderRadius: 10,
      border: "none",
      background: "var(--color-primary)",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14,
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    hint: {
      marginTop: 14,
      padding: 12,
      borderRadius: 12,
      border: "1px solid var(--color-border)",
      background: "var(--color-surface-raised)",
      color: "var(--color-text-secondary)",
      fontSize: 13,
    },
    mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
  };

  const path = typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.code}>404</div>
        <h1 style={styles.title}>{t("notFound.title")}</h1>
        <p style={styles.text}>
          {t("notFound.subtitle")}
        </p>

        <div style={styles.actions}>
          <a href="/" style={styles.btnPrimary}>
            {t("notFound.backHome")}
          </a>
          <a href="/signin" style={styles.btn}>
            {t("notFound.signin")}
          </a>
        </div>

        {path && (
          <div style={styles.hint}>
            {t("notFound.pathRequested")} <span style={styles.mono}>{path}</span>
          </div>
        )}
      </div>
    </div>
  );
}
