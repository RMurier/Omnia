import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";

export default function Introduction() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    list: { paddingLeft: 24, marginBottom: 16 },
    listItem: { marginBottom: 8 },
  };

  return (
    <DocSection id="introduction" title={t("docs.gettingStarted.introduction")}>
      <p style={styles.paragraph}>{t("docs.gettingStarted.introText1")}</p>
      <p style={styles.paragraph}>{t("docs.gettingStarted.introText2")}</p>
      <ul style={styles.list}>
        <li style={styles.listItem}>{t("docs.gettingStarted.feature1")}</li>
        <li style={styles.listItem}>{t("docs.gettingStarted.feature2")}</li>
        <li style={styles.listItem}>{t("docs.gettingStarted.feature3")}</li>
        <li style={styles.listItem}>{t("docs.gettingStarted.feature4")}</li>
      </ul>
    </DocSection>
  );
}
