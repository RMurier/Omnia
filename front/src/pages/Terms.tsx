import React from "react";
import { useTranslation } from "react-i18next";
import { CURRENT_VERSION, VERSIONS, VERSION_LIST } from "../terms-versions";

export default function TermsPage() {
  const { i18n, t } = useTranslation();
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

  const params = new URLSearchParams(window.location.search);
  const requestedVersion = params.get("v");
  const version = requestedVersion && VERSIONS[requestedVersion] ? requestedVersion : CURRENT_VERSION;
  const isOldVersion = version !== CURRENT_VERSION;

  const Content = VERSIONS[version][lang];

  const styles: Record<string, React.CSSProperties> = {
    page: { maxWidth: 800, margin: "0 auto", padding: "40px 24px", color: "var(--color-text-primary)" },
    banner: {
      marginBottom: 24,
      padding: "12px 16px",
      borderRadius: 8,
      backgroundColor: "var(--color-warning-bg, #fef9c3)",
      border: "1px solid var(--color-warning-border, #fde047)",
      color: "var(--color-warning-text, #713f12)",
      fontSize: 14,
    },
    h1: { margin: "0 0 4px 0", fontSize: 28, fontWeight: 700 },
    version: { color: "var(--color-text-muted)", fontSize: 14, marginBottom: 32 },
    h2: { fontSize: 18, fontWeight: 600, marginTop: 32, marginBottom: 12 },
    p: { fontSize: 15, lineHeight: 1.7, color: "var(--color-text-secondary)", margin: "0 0 12px 0" },
    ul: { paddingLeft: 20, margin: "0 0 12px 0" },
    li: { fontSize: 15, lineHeight: 1.7, color: "var(--color-text-secondary)", marginBottom: 4 },
    a: { color: "var(--color-primary)", textDecoration: "none" },
    highlight: {
      padding: "12px 16px",
      borderRadius: 8,
      backgroundColor: "var(--color-surface-sunken)",
      border: "1px solid var(--color-border)",
      marginBottom: 12,
    },
    historySection: { marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--color-border)" },
    historyTitle: { fontSize: 14, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 8 },
    historyLink: { fontSize: 14, color: "var(--color-primary)", textDecoration: "none", marginRight: 16 },
  };

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
    <div className="animate-page" style={styles.page}>
      {isOldVersion && (
        <div style={styles.banner}>
          {t("terms.oldVersionBanner")}{" "}
          <a href="/terms" style={{ color: "inherit", fontWeight: 600 }}>
            {t("terms.viewCurrent")}
          </a>
        </div>
      )}

      <Content styles={styles} />

      <div style={styles.historySection}>
        <p style={styles.historyTitle}>{t("terms.previousVersions")}</p>
        {VERSION_LIST.map((v) => (
          <a key={v} href={`/terms?v=${v}`} style={styles.historyLink}>
            {v === CURRENT_VERSION ? `v${v} (${t("terms.current")})` : `v${v}`}
          </a>
        ))}
      </div>
    </div>
    </div>
  );
}
