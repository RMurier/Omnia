import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CollapsibleEndpoint from "../../../components/CollapsibleEndpoint";

export default function LogEndpoints() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    note: {
      background: "#dbeafe",
      border: "1px solid #3b82f6",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      color: "#1e40af",
    },
  };

  const createLogRequest = `POST /api/log
X-App-Id: YOUR_APP_ID
X-Key-Version: 1
X-Timestamp: 1706529600000
X-Nonce: abc123-uuid
X-Signature: computed_hmac_signature
Content-Type: application/json

{
  "refApplication": "YOUR_APP_ID",
  "category": "Error",
  "level": "Error",
  "message": "NullReferenceException occurred",
  "payloadJson": "{\\"stack\\": \\"at Method()\\\\n  at Caller()\\"}",
  "occurredAtUtc": "2026-01-29T12:00:00Z"
}`;

  const getLogsResponse = `[
  {
    "id": "00000000-0000-0000-0000-000000000001",
    "refApplication": "YOUR_APP_ID",
    "category": "Error",
    "level": "Error",
    "message": "NullReferenceException occurred",
    "fingerprint": "ABC123...",
    "isPatched": false,
    "occurredAtUtc": "2026-01-29T12:00:00Z"
  }
]`;

  const patchLogsRequest = `PATCH /api/log/patch
Authorization: Bearer <token>
Content-Type: application/json

{
  "fingerprints": ["ABC123...", "DEF456..."],
  "isPatched": true
}`;

  return (
    <DocSection id="log-endpoints" title={t("docs.apiReference.logEndpoints")}>
      <p style={styles.paragraph}>{t("docs.apiReference.logText")}</p>

      <div style={styles.note}>
        {t("docs.apiReference.logNote")}
      </div>

      <CollapsibleEndpoint
        method="POST"
        path="/api/log"
        description={t("docs.apiReference.createLogDesc")}
        request={{ code: createLogRequest, language: "http", filename: "create-log-request.http" }}
      />

      <CollapsibleEndpoint
        method="GET"
        path="/api/log"
        description={t("docs.apiReference.getLogsDesc")}
        response={{ code: getLogsResponse, language: "json", filename: "get-logs-response.json" }}
      />

      <CollapsibleEndpoint
        method="GET"
        path="/api/log/distinct"
        description={t("docs.apiReference.getDistinctDesc")}
      />

      <CollapsibleEndpoint
        method="PATCH"
        path="/api/log/patch"
        description={t("docs.apiReference.patchLogsDesc")}
        request={{ code: patchLogsRequest, language: "http", filename: "patch-logs-request.http" }}
      />
    </DocSection>
  );
}
