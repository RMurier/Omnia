import React from "react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { BREAKPOINTS } from "../hooks/breakpoints";

export default function NotFound() {
  const { t } = useTranslation();
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "calc(100vh - 64px)",
      display: "grid",
      placeItems: "center",
      padding: isMobile ? 12 : 24,
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
    divider: { height: 1, background: "var(--color-border)", margin: "16px 0" },
    discordRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap" as const,
      gap: 12,
    },
    discordText: { margin: 0, fontSize: 13, color: "var(--color-text-muted)" },
    discordBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 14px",
      borderRadius: 10,
      border: "none",
      background: "#5865F2",
      color: "#ffffff",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 13,
      textDecoration: "none",
      flexShrink: 0,
    },
  };

  const path = typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <div className="animate-page" style={styles.page}>
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

        <div style={styles.divider} />
        <div style={styles.discordRow}>
          <p style={styles.discordText}>{t("notFound.discordPrompt")}</p>
          <a
            href="https://discord.gg/KtM9hD5VPn"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.discordBtn}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.899 19.899 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            {t("notFound.discordBtn")}
          </a>
        </div>
      </div>
    </div>
  );
}
