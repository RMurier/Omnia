import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CollapsibleEndpoint from "../../../components/CollapsibleEndpoint";

export default function ActivityEndpoints() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
  };

  const trackRequest = `POST /api/activity/track
X-App-Id: YOUR_APP_ID
X-Key-Version: 1
X-Timestamp: 1706529600000
X-Nonce: abc123-uuid
X-Signature: computed_hmac_signature
Content-Type: application/json

{
  "refApplication": "YOUR_APP_ID",
  "anonymousUserId": "user-session-id"
}`;

  const getActivityResponse = `{
  "series": [
    {
      "refApplication": "YOUR_APP_ID",
      "applicationName": "MyApp",
      "points": [
        { "timestamp": "2026-01-29T00:00:00Z", "count": 150 },
        { "timestamp": "2026-01-29T01:00:00Z", "count": 120 }
      ]
    }
  ]
}`;

  return (
    <DocSection id="activity-endpoints" title={t("docs.apiReference.activityEndpoints")}>
      <p style={styles.paragraph}>{t("docs.apiReference.activityText")}</p>

      <CollapsibleEndpoint
        method="POST"
        path="/api/activity/track"
        description={t("docs.apiReference.trackDesc")}
        request={{ code: trackRequest, language: "http", filename: "track-activity-request.http" }}
      />

      <CollapsibleEndpoint
        method="GET"
        path="/api/activity"
        description={t("docs.apiReference.getActivityDesc")}
        response={{ code: getActivityResponse, language: "json", filename: "get-activity-response.json" }}
      />
    </DocSection>
  );
}
