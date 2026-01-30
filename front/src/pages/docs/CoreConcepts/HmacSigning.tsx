import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CodeBlock from "../../../components/CodeBlock";

export default function HmacSigning() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    list: { paddingLeft: 24, marginBottom: 16 },
    listItem: { marginBottom: 8 },
    headerTable: {
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
    mono: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      background: "#f3f4f6",
      padding: "2px 6px",
      borderRadius: 4,
      fontSize: 12,
    },
  };

  const signatureCode = `// Signature computation
const method = "POST";
const path = "/api/log";
const timestamp = Date.now().toString();
const nonce = crypto.randomUUID();
const body = JSON.stringify(payload);

const dataToSign = \`\${method}\\n\${path}\\n\${timestamp}\\n\${nonce}\\n\${body}\`;
const signature = hmacSha256(secret, dataToSign);`;

  return (
    <DocSection id="hmac-signing" title={t("docs.coreConcepts.hmacSigning")}>
      <p style={styles.paragraph}>{t("docs.coreConcepts.hmacText1")}</p>

      <table style={styles.headerTable}>
        <thead>
          <tr>
            <th style={styles.th}>{t("docs.coreConcepts.headerName")}</th>
            <th style={styles.th}>{t("docs.coreConcepts.headerDesc")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.td}><code style={styles.mono}>X-App-Id</code></td>
            <td style={styles.td}>{t("docs.coreConcepts.headerAppId")}</td>
          </tr>
          <tr>
            <td style={styles.td}><code style={styles.mono}>X-Key-Version</code></td>
            <td style={styles.td}>{t("docs.coreConcepts.headerKeyVersion")}</td>
          </tr>
          <tr>
            <td style={styles.td}><code style={styles.mono}>X-Timestamp</code></td>
            <td style={styles.td}>{t("docs.coreConcepts.headerTimestamp")}</td>
          </tr>
          <tr>
            <td style={styles.td}><code style={styles.mono}>X-Nonce</code></td>
            <td style={styles.td}>{t("docs.coreConcepts.headerNonce")}</td>
          </tr>
          <tr>
            <td style={styles.td}><code style={styles.mono}>X-Signature</code></td>
            <td style={styles.td}>{t("docs.coreConcepts.headerSignature")}</td>
          </tr>
        </tbody>
      </table>

      <p style={styles.paragraph}>{t("docs.coreConcepts.hmacText2")}</p>
      <CodeBlock code={signatureCode} language="javascript" filename="hmac-example.js" />
    </DocSection>
  );
}
