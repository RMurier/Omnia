import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CodeBlock from "../../../components/CodeBlock";

export default function ErrorHandling() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    list: { paddingLeft: 24, marginBottom: 16 },
    listItem: { marginBottom: 8 },
  };

  const asyncExample = `// Always handle Omnia errors gracefully
async function logError(error: Error) {
  try {
    await omniaClient.sendLog("Error", "Error", error.message, {
      stack: error.stack,
    });
  } catch (omniaError) {
    // Don't let Omnia failures break your app
    console.error("Failed to send to Omnia:", omniaError);

    // Optional: fallback to local logging
    localStorage.setItem(\`omnia_fallback_\${Date.now()}\`, JSON.stringify({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    }));
  }
}`;

  const retryExample = `// Retry with exponential backoff
async function sendLogWithRetry(
  category: string,
  level: string,
  message: string,
  payload: object,
  maxRetries = 3
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await omniaClient.sendLog(category, level, message, payload);
      return; // Success
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error("Failed after retries:", error);
        return;
      }
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
}`;

  return (
    <DocSection id="error-handling" title={t("docs.bestPractices.errorHandling")}>
      <p style={styles.paragraph}>{t("docs.bestPractices.errorText1")}</p>

      <ul style={styles.list}>
        <li style={styles.listItem}>{t("docs.bestPractices.errorTip1")}</li>
        <li style={styles.listItem}>{t("docs.bestPractices.errorTip2")}</li>
        <li style={styles.listItem}>{t("docs.bestPractices.errorTip3")}</li>
      </ul>

      <p style={styles.paragraph}>{t("docs.bestPractices.errorAsyncText")}</p>
      <CodeBlock code={asyncExample} language="typescript" filename="errorHandler.ts" />

      <p style={styles.paragraph}>{t("docs.bestPractices.errorRetryText")}</p>
      <CodeBlock code={retryExample} language="typescript" filename="retryHandler.ts" />
    </DocSection>
  );
}
