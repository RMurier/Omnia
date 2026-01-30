import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CodeBlock from "../../../components/CodeBlock";

export default function HmacErrors() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    list: { paddingLeft: 24, marginBottom: 16 },
    listItem: { marginBottom: 8 },
    warning: {
      background: "#fef3c7",
      border: "1px solid #fcd34d",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      color: "#92400e",
    },
    mono: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      background: "#f3f4f6",
      padding: "2px 6px",
      borderRadius: 4,
      fontSize: 12,
    },
  };

  const signatureFormat = `// The signature must be computed from this exact format:
// METHOD\\nPATH\\nTIMESTAMP\\nNONCE\\nBODY

const dataToSign = \`POST
/api/log
1706529600000
abc123-uuid
{"refApplication":"...","message":"..."}\`;

// Important:
// - Use \\n (newline), not \\r\\n
// - PATH must start with /
// - TIMESTAMP is milliseconds (not seconds)
// - BODY must be compact JSON (no extra spaces)`;

  const commonMistakes = `// WRONG: Using seconds instead of milliseconds
const timestamp = Math.floor(Date.now() / 1000); // Wrong!
const timestamp = Date.now().toString(); // Correct!

// WRONG: Pretty-printed JSON
const body = JSON.stringify(data, null, 2); // Wrong!
const body = JSON.stringify(data); // Correct!

// WRONG: Missing leading slash in path
const path = "api/log"; // Wrong!
const path = "/api/log"; // Correct!`;

  return (
    <DocSection id="hmac-errors" title={t("docs.troubleshooting.hmacErrors")}>
      <p style={styles.paragraph}>{t("docs.troubleshooting.hmacText1")}</p>

      <div style={styles.warning}>
        {t("docs.troubleshooting.hmacWarning")}
      </div>

      <p style={styles.paragraph}>{t("docs.troubleshooting.hmacFormatText")}</p>
      <CodeBlock code={signatureFormat} language="javascript" filename="signature-format.js" />

      <p style={styles.paragraph}>{t("docs.troubleshooting.hmacMistakesText")}</p>
      <CodeBlock code={commonMistakes} language="javascript" filename="common-mistakes.js" />

      <p style={styles.paragraph}>{t("docs.troubleshooting.hmacChecklistText")}</p>
      <ul style={styles.list}>
        <li style={styles.listItem}>{t("docs.troubleshooting.hmacCheck1")}</li>
        <li style={styles.listItem}>{t("docs.troubleshooting.hmacCheck2")}</li>
        <li style={styles.listItem}>{t("docs.troubleshooting.hmacCheck3")}</li>
        <li style={styles.listItem}>{t("docs.troubleshooting.hmacCheck4")}</li>
        <li style={styles.listItem}>{t("docs.troubleshooting.hmacCheck5")}</li>
      </ul>
    </DocSection>
  );
}
