import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";

export default function AuthErrors() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    errorBox: {
      background: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 13,
      color: "#991b1b",
    },
    solutionBox: {
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      borderRadius: 8,
      padding: 12,
      marginBottom: 24,
      color: "#166534",
    },
    errorTitle: {
      fontWeight: 700,
      marginBottom: 8,
      color: "#111827",
    },
  };

  return (
    <DocSection id="auth-errors" title={t("docs.troubleshooting.authErrors")}>
      <div style={styles.errorTitle}>401 Unauthorized</div>
      <div style={styles.errorBox}>
        {"{ \"error\": \"Unauthorized\" }"}
      </div>
      <div style={styles.solutionBox}>
        <strong>{t("docs.troubleshooting.causes")}:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>{t("docs.troubleshooting.auth401Cause1")}</li>
          <li>{t("docs.troubleshooting.auth401Cause2")}</li>
          <li>{t("docs.troubleshooting.auth401Cause3")}</li>
        </ul>
      </div>

      <div style={styles.errorTitle}>403 Forbidden</div>
      <div style={styles.errorBox}>
        {"{ \"error\": \"Forbidden\" }"}
      </div>
      <div style={styles.solutionBox}>
        <strong>{t("docs.troubleshooting.causes")}:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>{t("docs.troubleshooting.auth403Cause1")}</li>
          <li>{t("docs.troubleshooting.auth403Cause2")}</li>
        </ul>
      </div>
    </DocSection>
  );
}
