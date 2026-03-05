import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const BETA_KEY = "omnia_beta_seen";

export default function BetaBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(BETA_KEY)) return;

    fetch("/api/auth/beta-status", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (data?.isBeta) setVisible(true); })
      .catch(() => {});
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(BETA_KEY, "1");
    setVisible(false);
  }

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    },
    card: {
      width: "100%",
      maxWidth: 480,
      borderRadius: 14,
      border: "1px solid var(--color-border)",
      background: "var(--color-surface)",
      padding: 28,
      display: "flex",
      flexDirection: "column",
      gap: 16,
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: 999,
      background: "var(--color-primary)",
      color: "#fff",
      fontWeight: 800,
      fontSize: 12,
      letterSpacing: 0.5,
      width: "fit-content",
    },
    title: {
      margin: 0,
      fontSize: 20,
      fontWeight: 800,
      color: "var(--color-text-primary)",
    },
    text: {
      margin: 0,
      fontSize: 14,
      lineHeight: 1.6,
      color: "var(--color-text-muted)",
    },
    actions: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap" as const,
    },
    btnPrimary: {
      flex: 1,
      padding: "10px 16px",
      borderRadius: 10,
      border: "none",
      background: "var(--color-primary)",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 14,
      textAlign: "center" as const,
    },
    btnDiscord: {
      flex: 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "10px 16px",
      borderRadius: 10,
      border: "none",
      background: "#5865F2",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 14,
      textDecoration: "none",
    },
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.badge}>β {t("betaBanner.badge")}</div>
        <h2 style={styles.title}>{t("betaBanner.title")}</h2>
        <p style={styles.text}>{t("betaBanner.message")}</p>
        <div style={styles.actions}>
          <button style={styles.btnPrimary} onClick={dismiss}>
            {t("betaBanner.dismiss")}
          </button>
          <a
            href="https://discord.gg/v947VjM9Rk"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.btnDiscord}
            onClick={dismiss}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.899 19.899 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            {t("betaBanner.discord")}
          </a>
        </div>
      </div>
    </div>
  );
}
