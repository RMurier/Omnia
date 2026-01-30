import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";

export default function Prerequisites() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    list: { paddingLeft: 24, marginBottom: 16 },
    listItem: { marginBottom: 8 },
  };

  return (
    <DocSection id="prerequisites" title={t("docs.gettingStarted.prerequisites")}>
      <p style={styles.paragraph}>{t("docs.gettingStarted.prereqText")}</p>
      <ul style={styles.list}>
        <li style={styles.listItem}>{t("docs.gettingStarted.prereq1")}</li>
        <li style={styles.listItem}>{t("docs.gettingStarted.prereq2")}</li>
        <li style={styles.listItem}>{t("docs.gettingStarted.prereq3")}</li>
      </ul>
    </DocSection>
  );
}
