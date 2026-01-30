import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CodeBlock from "../../../components/CodeBlock";

export default function LogStructure() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    list: { paddingLeft: 24, marginBottom: 16 },
    listItem: { marginBottom: 8 },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: 16,
    },
    th: {
      textAlign: "left",
      padding: "10px 12px",
      background: "#f3f4f6",
      borderBottom: "1px solid #e5e7eb",
      fontSize: 13,
      fontWeight: 700,
    },
    td: {
      padding: "10px 12px",
      borderBottom: "1px solid #e5e7eb",
      fontSize: 13,
    },
  };

  const goodExample = `// Good: Structured and consistent
await omniaClient.sendLog("Database", "Error", "Connection timeout", {
  database: "users_db",
  host: "db.example.com",
  timeout_ms: 30000,
  retry_count: 3,
  stack: error.stack,
});`;

  const badExample = `// Bad: Unstructured and hard to search
await omniaClient.sendLog("Error", "Error",
  "Database connection timeout after 30s on db.example.com users_db retry 3",
  {}
);`;

  const stackExample = `// Include stack traces for debugging
{
  "stack": "Error: Connection timeout\\n    at Database.connect (db.js:45)\\n    at UserService.getUser (user.js:23)",
  "stackSignature": ["Database.connect", "UserService.getUser"]
}`;

  return (
    <DocSection id="log-structure" title={t("docs.bestPractices.logStructure")}>
      <p style={styles.paragraph}>{t("docs.bestPractices.logText1")}</p>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>{t("docs.bestPractices.logLevel")}</th>
            <th style={styles.th}>{t("docs.bestPractices.logUsage")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.td}>Debug</td>
            <td style={styles.td}>{t("docs.bestPractices.levelDebug")}</td>
          </tr>
          <tr>
            <td style={styles.td}>Info</td>
            <td style={styles.td}>{t("docs.bestPractices.levelInfo")}</td>
          </tr>
          <tr>
            <td style={styles.td}>Warning</td>
            <td style={styles.td}>{t("docs.bestPractices.levelWarning")}</td>
          </tr>
          <tr>
            <td style={styles.td}>Error</td>
            <td style={styles.td}>{t("docs.bestPractices.levelError")}</td>
          </tr>
          <tr>
            <td style={styles.td}>Critical</td>
            <td style={styles.td}>{t("docs.bestPractices.levelCritical")}</td>
          </tr>
        </tbody>
      </table>

      <p style={styles.paragraph}>{t("docs.bestPractices.logGoodText")}</p>
      <CodeBlock code={goodExample} language="typescript" filename="good-example.ts" />

      <p style={styles.paragraph}>{t("docs.bestPractices.logBadText")}</p>
      <CodeBlock code={badExample} language="typescript" filename="bad-example.ts" />

      <p style={styles.paragraph}>{t("docs.bestPractices.logStackText")}</p>
      <CodeBlock code={stackExample} language="json" filename="payload-with-stack.json" />
    </DocSection>
  );
}
