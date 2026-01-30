import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CodeBlock from "../../../components/CodeBlock";

export default function ReactNative() {
  const { t, i18n } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
    note: {
      background: "#fef3c7",
      border: "1px solid #fcd34d",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      color: "#92400e",
    },
  };

  const installCode = `npm install react-native-get-random-values crypto-js
# or
yarn add react-native-get-random-values crypto-js`;

  const omniaClientCodeEn = `// src/utils/omniaClient.ts
import "react-native-get-random-values";
import CryptoJS from "crypto-js";
import { OMNIA_URL, OMNIA_APP_ID, OMNIA_SECRET, OMNIA_KEY_VERSION } from "@env";

// Computes the HMAC-SHA256 signature
function computeSignature(method: string, path: string, timestamp: string, nonce: string, body: string): string {
  const dataToSign = \`\${method}\\n\${path}\\n\${timestamp}\\n\${nonce}\\n\${body}\`;
  const key = CryptoJS.enc.Base64.parse(OMNIA_SECRET);
  const hash = CryptoJS.HmacSHA256(dataToSign, key);
  return CryptoJS.enc.Base64.stringify(hash);
}

// Generates a UUID
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Generic method to post data with HMAC authentication
async function postWithHmac<T>(path: string, body: object): Promise<T> {
  const json = JSON.stringify(body);
  const timestamp = Date.now().toString();
  const nonce = generateUUID();
  const signature = computeSignature("POST", path, timestamp, nonce, json);

  const response = await fetch(\`\${OMNIA_URL}\${path}\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Id": OMNIA_APP_ID,
      "X-Key-Version": OMNIA_KEY_VERSION || "1",
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
      "X-Signature": signature,
    },
    body: json,
  });

  if (!response.ok) {
    throw new Error(\`Omnia error: \${response.status}\`);
  }

  return response.json();
}

// Sends a log entry to Omnia
export async function sendLog(
  category: string,
  level: string,
  message: string,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    await postWithHmac("/api/log", {
      refApplication: OMNIA_APP_ID,
      category,
      level,
      message,
      payloadJson: JSON.stringify(payload ?? {}),
      occurredAtUtc: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("Failed to send log to Omnia:", error);
  }
}

// Tracks user activity in Omnia
export async function trackActivity(anonymousUserId: string): Promise<void> {
  try {
    await postWithHmac("/api/activity/track", {
      refApplication: OMNIA_APP_ID,
      anonymousUserId,
    });
  } catch (error) {
    console.warn("Failed to track activity:", error);
  }
}`;

  const omniaClientCodeFr = `// src/utils/omniaClient.ts
import "react-native-get-random-values";
import CryptoJS from "crypto-js";
import { OMNIA_URL, OMNIA_APP_ID, OMNIA_SECRET, OMNIA_KEY_VERSION } from "@env";

// Calcule la signature HMAC-SHA256
function computeSignature(method: string, path: string, timestamp: string, nonce: string, body: string): string {
  const dataToSign = \`\${method}\\n\${path}\\n\${timestamp}\\n\${nonce}\\n\${body}\`;
  const key = CryptoJS.enc.Base64.parse(OMNIA_SECRET);
  const hash = CryptoJS.HmacSHA256(dataToSign, key);
  return CryptoJS.enc.Base64.stringify(hash);
}

// Génère un UUID
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Méthode générique pour envoyer des données avec authentification HMAC
async function postWithHmac<T>(path: string, body: object): Promise<T> {
  const json = JSON.stringify(body);
  const timestamp = Date.now().toString();
  const nonce = generateUUID();
  const signature = computeSignature("POST", path, timestamp, nonce, json);

  const response = await fetch(\`\${OMNIA_URL}\${path}\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Id": OMNIA_APP_ID,
      "X-Key-Version": OMNIA_KEY_VERSION || "1",
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
      "X-Signature": signature,
    },
    body: json,
  });

  if (!response.ok) {
    throw new Error(\`Erreur Omnia: \${response.status}\`);
  }

  return response.json();
}

// Envoie une entrée de log à Omnia
export async function sendLog(
  category: string,
  level: string,
  message: string,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    await postWithHmac("/api/log", {
      refApplication: OMNIA_APP_ID,
      category,
      level,
      message,
      payloadJson: JSON.stringify(payload ?? {}),
      occurredAtUtc: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("Échec de l'envoi du log à Omnia:", error);
  }
}

// Suivi de l'activité utilisateur dans Omnia
export async function trackActivity(anonymousUserId: string): Promise<void> {
  try {
    await postWithHmac("/api/activity/track", {
      refApplication: OMNIA_APP_ID,
      anonymousUserId,
    });
  } catch (error) {
    console.warn("Échec du suivi de l'activité:", error);
  }
}`;

  const setupCodeEn = `// App.tsx
import React, { useEffect } from "react";
import { setJSExceptionHandler, setNativeExceptionHandler } from "react-native-exception-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendLog, trackActivity } from "./src/utils/omniaClient";

// Global error handler for JS errors
setJSExceptionHandler((error, isFatal) => {
  sendLog(
    "Error",
    isFatal ? "Critical" : "Error",
    error.message,
    { stack: error.stack, isFatal }
  );
}, true);

// Native exception handler
setNativeExceptionHandler((errorString) => {
  sendLog("Error", "Critical", errorString, { native: true });
});

export default function App() {
  useEffect(() => {
    const initTracking = async () => {
      let sessionId = await AsyncStorage.getItem("sessionId");
      if (!sessionId) {
        sessionId = generateUUID();
        await AsyncStorage.setItem("sessionId", sessionId);
      }
      trackActivity(sessionId);
    };
    initTracking();
  }, []);

  return <YourApp />;
}`;

  const setupCodeFr = `// App.tsx
import React, { useEffect } from "react";
import { setJSExceptionHandler, setNativeExceptionHandler } from "react-native-exception-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendLog, trackActivity } from "./src/utils/omniaClient";

// Gestionnaire d'erreurs global pour les erreurs JS
setJSExceptionHandler((error, isFatal) => {
  sendLog(
    "Error",
    isFatal ? "Critical" : "Error",
    error.message,
    { stack: error.stack, isFatal }
  );
}, true);

// Gestionnaire d'exceptions natives
setNativeExceptionHandler((errorString) => {
  sendLog("Error", "Critical", errorString, { native: true });
});

export default function App() {
  useEffect(() => {
    const initTracking = async () => {
      let sessionId = await AsyncStorage.getItem("sessionId");
      if (!sessionId) {
        sessionId = generateUUID();
        await AsyncStorage.setItem("sessionId", sessionId);
      }
      trackActivity(sessionId);
    };
    initTracking();
  }, []);

  return <VotreApp />;
}`;

  return (
    <DocSection id="react-native" title={t("docs.integration.reactNative")}>
      <p style={styles.paragraph}>{t("docs.integration.reactNativeText")}</p>
      <div style={styles.note}>
        {t("docs.integration.reactNativeNote")}
      </div>
      <CodeBlock code={installCode} language="bash" filename="terminal" />
      <CodeBlock code={i18n.language === "fr" ? omniaClientCodeFr : omniaClientCodeEn} language="typescript" filename="src/utils/omniaClient.ts" />
      <p style={styles.paragraph}>{t("docs.integration.reactNativeSetupText")}</p>
      <CodeBlock code={i18n.language === "fr" ? setupCodeFr : setupCodeEn} language="typescript" filename="App.tsx" />
    </DocSection>
  );
}
