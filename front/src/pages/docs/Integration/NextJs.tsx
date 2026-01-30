import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CodeBlock from "../../../components/CodeBlock";

export default function NextJs() {
  const { t, i18n } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
  };

  const serverClientCodeEn = `// lib/omnia.ts
import crypto from "crypto";

const OMNIA_URL = process.env.OMNIA_URL!;
const OMNIA_APP_ID = process.env.OMNIA_APP_ID!;
const OMNIA_SECRET = process.env.OMNIA_SECRET!;
const OMNIA_KEY_VERSION = process.env.OMNIA_KEY_VERSION || "1";

// Computes the HMAC-SHA256 signature
function computeSignature(method: string, path: string, timestamp: string, nonce: string, body: string): string {
  const dataToSign = \`\${method}\\n\${path}\\n\${timestamp}\\n\${nonce}\\n\${body}\`;
  const key = Buffer.from(OMNIA_SECRET, "base64");
  const hash = crypto.createHmac("sha256", key).update(dataToSign).digest("base64");
  return hash;
}

// Generic method to post data with HMAC authentication
async function postWithHmac<T>(path: string, body: object): Promise<T> {
  const json = JSON.stringify(body);
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const signature = computeSignature("POST", path, timestamp, nonce, json);

  const response = await fetch(\`\${OMNIA_URL}\${path}\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Id": OMNIA_APP_ID,
      "X-Key-Version": OMNIA_KEY_VERSION,
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
  await postWithHmac("/api/log", {
    refApplication: OMNIA_APP_ID,
    category,
    level,
    message,
    payloadJson: JSON.stringify(payload ?? {}),
    occurredAtUtc: new Date().toISOString(),
  });
}

// Tracks user activity in Omnia
export async function trackActivity(anonymousUserId: string): Promise<void> {
  await postWithHmac("/api/activity/track", {
    refApplication: OMNIA_APP_ID,
    anonymousUserId,
  });
}`;

  const serverClientCodeFr = `// lib/omnia.ts
import crypto from "crypto";

const OMNIA_URL = process.env.OMNIA_URL!;
const OMNIA_APP_ID = process.env.OMNIA_APP_ID!;
const OMNIA_SECRET = process.env.OMNIA_SECRET!;
const OMNIA_KEY_VERSION = process.env.OMNIA_KEY_VERSION || "1";

// Calcule la signature HMAC-SHA256
function computeSignature(method: string, path: string, timestamp: string, nonce: string, body: string): string {
  const dataToSign = \`\${method}\\n\${path}\\n\${timestamp}\\n\${nonce}\\n\${body}\`;
  const key = Buffer.from(OMNIA_SECRET, "base64");
  const hash = crypto.createHmac("sha256", key).update(dataToSign).digest("base64");
  return hash;
}

// Méthode générique pour envoyer des données avec authentification HMAC
async function postWithHmac<T>(path: string, body: object): Promise<T> {
  const json = JSON.stringify(body);
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const signature = computeSignature("POST", path, timestamp, nonce, json);

  const response = await fetch(\`\${OMNIA_URL}\${path}\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Id": OMNIA_APP_ID,
      "X-Key-Version": OMNIA_KEY_VERSION,
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
  await postWithHmac("/api/log", {
    refApplication: OMNIA_APP_ID,
    category,
    level,
    message,
    payloadJson: JSON.stringify(payload ?? {}),
    occurredAtUtc: new Date().toISOString(),
  });
}

// Suivi de l'activité utilisateur dans Omnia
export async function trackActivity(anonymousUserId: string): Promise<void> {
  await postWithHmac("/api/activity/track", {
    refApplication: OMNIA_APP_ID,
    anonymousUserId,
  });
}`;

  const apiRouteCodeEn = `// app/api/log-error/route.ts (App Router)
import { NextRequest, NextResponse } from "next/server";
import { sendLog } from "@/lib/omnia";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Securely log the error from the server side
    await sendLog(
      body.category || "Error",
      body.level || "Error",
      body.message,
      body.payload
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send log:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}`;

  const apiRouteCodeFr = `// app/api/log-error/route.ts (App Router)
import { NextRequest, NextResponse } from "next/server";
import { sendLog } from "@/lib/omnia";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Journalise l'erreur en toute sécurité côté serveur
    await sendLog(
      body.category || "Error",
      body.level || "Error",
      body.message,
      body.payload
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Échec de l'envoi du log:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}`;

  const middlewareCodeEn = `// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { trackActivity } from "@/lib/omnia";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Track activity for page views
  const sessionId = request.cookies.get("sessionId")?.value || crypto.randomUUID();

  if (!request.cookies.get("sessionId")) {
    response.cookies.set("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    });
  }

  // Track in the background (don't await)
  trackActivity(sessionId).catch(console.error);

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};`;

  const middlewareCodeFr = `// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { trackActivity } from "@/lib/omnia";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Suivi de l'activité pour les pages vues
  const sessionId = request.cookies.get("sessionId")?.value || crypto.randomUUID();

  if (!request.cookies.get("sessionId")) {
    response.cookies.set("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    });
  }

  // Suivi en arrière-plan (ne pas attendre)
  trackActivity(sessionId).catch(console.error);

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};`;

  const errorPageCodeEn = `// app/error.tsx (App Router global error)
"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Send error to Omnia via API route (client-side safe)
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Error",
        level: "Error",
        message: error.message,
        payload: { stack: error.stack, digest: error.digest },
      }),
    }).catch(console.error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}`;

  const errorPageCodeFr = `// app/error.tsx (App Router erreur globale)
"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Envoie l'erreur à Omnia via la route API (sécurisé côté client)
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Error",
        level: "Error",
        message: error.message,
        payload: { stack: error.stack, digest: error.digest },
      }),
    }).catch(console.error);
  }, [error]);

  return (
    <div>
      <h2>Quelque chose s'est mal passé !</h2>
      <button onClick={reset}>Réessayer</button>
    </div>
  );
}`;

  return (
    <DocSection id="nextjs" title={t("docs.integration.nextjs")}>
      <p style={styles.paragraph}>{t("docs.integration.nextjsText")}</p>
      <CodeBlock code={i18n.language === 'fr' ? serverClientCodeFr : serverClientCodeEn} language="typescript" filename="lib/omnia.ts" />
      <p style={styles.paragraph}>{t("docs.integration.nextjsApiText")}</p>
      <CodeBlock code={i18n.language === 'fr' ? apiRouteCodeFr : apiRouteCodeEn} language="typescript" filename="app/api/log-error/route.ts" />
      <p style={styles.paragraph}>{t("docs.integration.nextjsMiddlewareText")}</p>
      <CodeBlock code={i18n.language === 'fr' ? middlewareCodeFr : middlewareCodeEn} language="typescript" filename="middleware.ts" />
      <p style={styles.paragraph}>{t("docs.integration.nextjsErrorText")}</p>
      <CodeBlock code={i18n.language === 'fr' ? errorPageCodeFr : errorPageCodeEn} language="typescript" filename="app/error.tsx" />
    </DocSection>
  );
}
