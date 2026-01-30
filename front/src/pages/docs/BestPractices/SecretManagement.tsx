import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CodeBlock from "../../../components/CodeBlock";

export default function SecretManagement() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    list: { paddingLeft: 24, marginBottom: 16 },
    listItem: { marginBottom: 8 },
    warning: {
      background: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      color: "#991b1b",
    },
    success: {
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      color: "#166534",
    },
  };

  const envExample = `# .env (Never commit this file!)
OMNIA_URL=https://your-omnia-instance.com
OMNIA_APP_ID=00000000-0000-0000-0000-000000000001
OMNIA_SECRET=your-base64-secret-here
OMNIA_KEY_VERSION=1`;

  const dockerExample = `# docker-compose.yml
services:
  app:
    environment:
      - OMNIA_URL=\${OMNIA_URL}
      - OMNIA_APP_ID=\${OMNIA_APP_ID}
      - OMNIA_SECRET=\${OMNIA_SECRET}
      - OMNIA_KEY_VERSION=\${OMNIA_KEY_VERSION}`;

  return (
    <DocSection id="secret-management" title={t("docs.bestPractices.secretManagement")}>
      <p style={styles.paragraph}>{t("docs.bestPractices.secretText1")}</p>

      <div style={styles.warning}>
        {t("docs.bestPractices.secretWarning")}
      </div>

      <ul style={styles.list}>
        <li style={styles.listItem}>{t("docs.bestPractices.secretTip1")}</li>
        <li style={styles.listItem}>{t("docs.bestPractices.secretTip2")}</li>
        <li style={styles.listItem}>{t("docs.bestPractices.secretTip3")}</li>
        <li style={styles.listItem}>{t("docs.bestPractices.secretTip4")}</li>
      </ul>

      <CodeBlock code={envExample} language="bash" filename=".env" />

      <div style={styles.success}>
        {t("docs.bestPractices.secretSuccess")}
      </div>

      <p style={styles.paragraph}>{t("docs.bestPractices.secretDockerText")}</p>
      <CodeBlock code={dockerExample} language="yaml" filename="docker-compose.yml" />
    </DocSection>
  );
}
