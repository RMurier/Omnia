import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CollapsibleEndpoint from "../../../components/CollapsibleEndpoint";

export default function AuthEndpoints() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
  };

  const loginRequest = `POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}`;

  const loginResponse = `{
  "accessToken": "eyJhbGciOiJIUzI1...",
  "refreshToken": "dGhpcyBpcyBhIHJl...",
  "expiresAt": "2026-01-29T14:00:00Z"
}`;

  const refreshRequest = `POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "dGhpcyBpcyBhIHJl..."
}`;

  return (
    <DocSection id="auth-endpoints" title={t("docs.apiReference.authEndpoints")}>
      <p style={styles.paragraph}>{t("docs.apiReference.authText")}</p>

      <CollapsibleEndpoint
        method="POST"
        path="/api/auth/login"
        description={t("docs.apiReference.loginDesc")}
        request={{ code: loginRequest, language: "http", filename: "login-request.http" }}
        response={{ code: loginResponse, language: "json", filename: "login-response.json" }}
      />

      <CollapsibleEndpoint
        method="POST"
        path="/api/auth/refresh"
        description={t("docs.apiReference.refreshDesc")}
        request={{ code: refreshRequest, language: "http", filename: "refresh-request.http" }}
      />
    </DocSection>
  );
}
