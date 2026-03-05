import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";

export default function Activity() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    list: { paddingLeft: 24, marginBottom: 16 },
    listItem: { marginBottom: 8 },
  };

  return (
    <DocSection id="activity" title={t("docs.coreConcepts.activity")}>
      <p style={styles.paragraph}>{t("docs.coreConcepts.activityText1")}</p>
      <ul style={styles.list}>
        <li style={styles.listItem}>{t("docs.coreConcepts.activityFeature1")}</li>
        <li style={styles.listItem}>{t("docs.coreConcepts.activityFeature2")}</li>
        <li style={styles.listItem}>{t("docs.coreConcepts.activityFeature3")}</li>
      </ul>
    </DocSection>
  );
}
