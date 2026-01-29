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
      background: "#fff",
    },
    card: {
      width: "100%",
      maxWidth: 720,
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      padding: 22,
      background: "#fff",
    },
    code: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "6px 12px",
      borderRadius: 999,
      border: "1px solid #e5e7eb",
      background: "#fafafa",
      color: "#111827",
      fontWeight: 800,
      letterSpacing: 0.2,
      marginBottom: 12,
      fontSize: 13,
    },
    title: { margin: "6px 0 6px", fontSize: 26, color: "#111827", fontWeight: 900 },
    text: { margin: 0, color: "#6b7280", lineHeight: 1.55, fontSize: 14 },
    actions: { display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" },
    btn: {
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid #d1d5db",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 14,
      textDecoration: "none",
      color: "#111827",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    btnPrimary: {
      padding: "10px 12px",
      borderRadius: 10,
      border: "none",
      background: "#6366f1",
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
      border: "1px solid #e5e7eb",
      background: "#fafafa",
      color: "#374151",
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