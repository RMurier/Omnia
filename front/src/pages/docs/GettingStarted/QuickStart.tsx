import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CodeBlock from "../../../components/CodeBlock";

export default function QuickStart() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    stepTitle: { fontWeight: 700, marginBottom: 8, color: "#111827" },
    step: { marginBottom: 24 },
  };

  const curlExample = `curl -X POST https://your-omnia-instance/api/log \\
  -H "Content-Type: application/json" \\
  -H "X-App-Id: YOUR_APP_ID" \\
  -H "X-Key-Version: 1" \\
  -H "X-Timestamp: $(date +%s)" \\
  -H "X-Nonce: $(uuidgen)" \\
  -H "X-Signature: YOUR_COMPUTED_SIGNATURE" \\
  -d '{
    "refApplication": "YOUR_APP_ID",
    "category": "Error",
    "level": "Error",
    "message": "Test error message",
    "payloadJson": "{\\"stack\\": \\"...\\"}"
  }'`;

  return (
    <DocSection id="quick-start" title={t("docs.gettingStarted.quickStart")}>
      <div style={styles.step}>
        <div style={styles.stepTitle}>{t("docs.gettingStarted.step1Title")}</div>
        <p style={styles.paragraph}>{t("docs.gettingStarted.step1Text")}</p>
      </div>

      <div style={styles.step}>
        <div style={styles.stepTitle}>{t("docs.gettingStarted.step2Title")}</div>
        <p style={styles.paragraph}>{t("docs.gettingStarted.step2Text")}</p>
      </div>

      <div style={styles.step}>
        <div style={styles.stepTitle}>{t("docs.gettingStarted.step3Title")}</div>
        <p style={styles.paragraph}>{t("docs.gettingStarted.step3Text")}</p>
        <CodeBlock code={curlExample} language="bash" filename="terminal" />
      </div>
    </DocSection>
  );
}
