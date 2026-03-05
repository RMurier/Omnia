import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CollapsibleEndpoint from "../../../components/CollapsibleEndpoint";

export default function ApplicationEndpoints() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
  };

  const getAppsResponse = `[
  {
    "id": "00000000-0000-0000-0000-000000000001",
    "name": "MyApp",
    "description": "My application",
    "url": "https://myapp.com",
    "isActive": true
  }
]`;

  const createAppRequest = `POST /api/application
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "NewApp",
  "description": "A new application",
  "url": "https://newapp.com",
  "isActive": true
}`;

  const updateAppRequest = `PUT /api/application/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "UpdatedApp",
  "description": "An updated application",
  "url": "https://updatedapp.com",
  "isActive": true
}`;

  return (
    <DocSection id="application-endpoints" title={t("docs.apiReference.applicationEndpoints")}>
      <p style={styles.paragraph}>{t("docs.apiReference.applicationText")}</p>

      <CollapsibleEndpoint
        method="GET"
        path="/api/application"
        description={t("docs.apiReference.getAppsDesc")}
        response={{ code: getAppsResponse, language: "json", filename: "get-applications-response.json" }}
      />

      <CollapsibleEndpoint
        method="POST"
        path="/api/application"
        description={t("docs.apiReference.createAppDesc")}
        request={{ code: createAppRequest, language: "http", filename: "create-application-request.http" }}
      />

      <CollapsibleEndpoint
        method="PUT"
        path="/api/application/:id"
        description={t("docs.apiReference.updateAppDesc")}
        request={{ code: updateAppRequest, language: "http", filename: "update-application-request.http" }}
      />

      <CollapsibleEndpoint
        method="DELETE"
        path="/api/application/:id"
        description={t("docs.apiReference.deleteAppDesc")}
      />
    </DocSection>
  );
}
