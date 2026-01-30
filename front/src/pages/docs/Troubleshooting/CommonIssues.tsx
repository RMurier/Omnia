import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CodeBlock from "../../../components/CodeBlock";

export default function CommonIssues() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    issueBox: {
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      marginBottom: 24,
      overflow: "hidden",
    },
    issueHeader: {
      background: "#f3f4f6",
      padding: "12px 16px",
      fontWeight: 700,
      color: "#111827",
      borderBottom: "1px solid #e5e7eb",
    },
    issueBody: {
      padding: 16,
    },
  };

  const corsExample = `// If using a browser client, ensure CORS is configured
// Server-side (your Omnia instance):
app.UseCors(policy => policy
    .WithOrigins("https://your-app.com")
    .AllowAnyHeader()
    .AllowAnyMethod());`;

  const timeoutExample = `// Increase timeout for slow connections
const client = new OmniaClient({
  baseUrl: "https://omnia.example.com",
  timeout: 30000, // 30 seconds
});`;

  return (
    <DocSection id="common-issues" title={t("docs.troubleshooting.commonIssues")}>
      <div style={styles.issueBox}>
        <div style={styles.issueHeader}>{t("docs.troubleshooting.issueCors")}</div>
        <div style={styles.issueBody}>
          <p style={styles.paragraph}>{t("docs.troubleshooting.corsText")}</p>
          <CodeBlock code={corsExample} language="csharp" filename="Program.cs" />
        </div>
      </div>

      <div style={styles.issueBox}>
        <div style={styles.issueHeader}>{t("docs.troubleshooting.issueTimeout")}</div>
        <div style={styles.issueBody}>
          <p style={styles.paragraph}>{t("docs.troubleshooting.timeoutText")}</p>
          <CodeBlock code={timeoutExample} language="typescript" filename="client-config.ts" />
        </div>
      </div>

      <div style={styles.issueBox}>
        <div style={styles.issueHeader}>{t("docs.troubleshooting.issueDuplicates")}</div>
        <div style={styles.issueBody}>
          <p style={styles.paragraph}>{t("docs.troubleshooting.duplicatesText")}</p>
        </div>
      </div>

      <div style={styles.issueBox}>
        <div style={styles.issueHeader}>{t("docs.troubleshooting.issueEncoding")}</div>
        <div style={styles.issueBody}>
          <p style={styles.paragraph}>{t("docs.troubleshooting.encodingText")}</p>
        </div>
      </div>
    </DocSection>
  );
}
