import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";

export default function Authentication() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    list: { paddingLeft: 24, marginBottom: 16 },
    listItem: { marginBottom: 8 },
    note: {
      background: "#fef3c7",
      border: "1px solid #fcd34d",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      color: "#92400e",
    },
  };

  return (
    <DocSection id="authentication" title={t("docs.coreConcepts.authentication")}>
      <p style={styles.paragraph}>{t("docs.coreConcepts.authText1")}</p>
      <ul style={styles.list}>
        <li style={styles.listItem}><strong>JWT</strong>: {t("docs.coreConcepts.authJwt")}</li>
        <li style={styles.listItem}><strong>HMAC</strong>: {t("docs.coreConcepts.authHmac")}</li>
      </ul>
      <div style={styles.note}>
        {t("docs.coreConcepts.authNote")}
      </div>
    </DocSection>
  );
}
