import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CodeBlock from "../../../components/CodeBlock";

export default function Logs() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    list: { paddingLeft: 24, marginBottom: 16 },
    listItem: { marginBottom: 8 },
  };

  const logStructure = `{
  "refApplication": "00000000-0000-0000-0000-000000000000",
  "category": "Error",
  "level": "Error",
  "message": "NullReferenceException in UserService.GetById",
  "payloadJson": {
    "stack": "at UserService.GetById(Guid id)\\n  at UserController.Get(Guid id)",
    "userId": "123",
    "requestId": "abc-123"
  },
  "occurredAtUtc": "2026-01-29T12:00:00Z"
}`;

  return (
    <DocSection id="logs" title={t("docs.coreConcepts.logs")}>
      <p style={styles.paragraph}>{t("docs.coreConcepts.logsText1")}</p>
      <ul style={styles.list}>
        <li style={styles.listItem}><strong>category</strong>: {t("docs.coreConcepts.logsCategory")}</li>
        <li style={styles.listItem}><strong>level</strong>: {t("docs.coreConcepts.logsLevel")}</li>
        <li style={styles.listItem}><strong>message</strong>: {t("docs.coreConcepts.logsMessage")}</li>
        <li style={styles.listItem}><strong>payloadJson</strong>: {t("docs.coreConcepts.logsPayload")}</li>
      </ul>
      <p style={styles.paragraph}>{t("docs.coreConcepts.logsText2")}</p>
      <CodeBlock code={logStructure} language="json" filename="log-example.json" />
    </DocSection>
  );
}
