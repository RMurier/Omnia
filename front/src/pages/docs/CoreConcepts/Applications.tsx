import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";

export default function Applications() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    list: { paddingLeft: 24, marginBottom: 16 },
    listItem: { marginBottom: 8 },
  };

  return (
    <DocSection id="applications" title={t("docs.coreConcepts.applications")}>
      <p style={styles.paragraph}>{t("docs.coreConcepts.applicationsText1")}</p>
      <p style={styles.paragraph}>{t("docs.coreConcepts.applicationsText2")}</p>
      <ul style={styles.list}>
        <li style={styles.listItem}>{t("docs.coreConcepts.appFeature1")}</li>
        <li style={styles.listItem}>{t("docs.coreConcepts.appFeature2")}</li>
        <li style={styles.listItem}>{t("docs.coreConcepts.appFeature3")}</li>
      </ul>
    </DocSection>
  );
}
