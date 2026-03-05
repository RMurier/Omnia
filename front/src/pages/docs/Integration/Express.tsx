import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CodeBlock from "../../../components/CodeBlock";

export default function Express() {
  const { t, i18n } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
  };

  const omniaClientCodeEn = `// lib/omnia.js
const crypto = require("crypto");

const OMNIA_URL = process.env.OMNIA_URL;
const OMNIA_APP_ID = process.env.OMNIA_APP_ID;
const OMNIA_SECRET = process.env.OMNIA_SECRET;
const OMNIA_KEY_VERSION = process.env.OMNIA_KEY_VERSION || "1";

// Computes the HMAC-SHA256 signature
function computeSignature(method, path, timestamp, nonce, body) {
  const dataToSign = \`\${method}\\n\${path}\\n\${timestamp}\\n\${nonce}\\n\${body}\`;
  const key = Buffer.from(OMNIA_SECRET, "base64");
  return crypto.createHmac("sha256", key).update(dataToSign).digest("base64");
}

// Generic method to post data with HMAC authentication
async function postWithHmac(path, body) {
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
async function sendLog(category, level, message, payload = {}) {
  return postWithHmac("/api/log", {
    refApplication: OMNIA_APP_ID,
    category,
    level,
    message,
    payloadJson: JSON.stringify(payload),
    occurredAtUtc: new Date().toISOString(),
  });
}

// Tracks user activity in Omnia
async function trackActivity(anonymousUserId) {
  return postWithHmac("/api/activity/track", {
    refApplication: OMNIA_APP_ID,
    anonymousUserId,
  });
}

module.exports = { sendLog, trackActivity };`;

  const omniaClientCodeFr = `// lib/omnia.js
const crypto = require("crypto");

const OMNIA_URL = process.env.OMNIA_URL;
const OMNIA_APP_ID = process.env.OMNIA_APP_ID;
const OMNIA_SECRET = process.env.OMNIA_SECRET;
const OMNIA_KEY_VERSION = process.env.OMNIA_KEY_VERSION || "1";

// Calcule la signature HMAC-SHA256
function computeSignature(method, path, timestamp, nonce, body) {
  const dataToSign = \`\${method}\\n\${path}\\n\${timestamp}\\n\${nonce}\\n\${body}\`;
  const key = Buffer.from(OMNIA_SECRET, "base64");
  return crypto.createHmac("sha256", key).update(dataToSign).digest("base64");
}

// Méthode générique pour envoyer des données avec authentification HMAC
async function postWithHmac(path, body) {
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
async function sendLog(category, level, message, payload = {}) {
  return postWithHmac("/api/log", {
    refApplication: OMNIA_APP_ID,
    category,
    level,
    message,
    payloadJson: JSON.stringify(payload),
    occurredAtUtc: new Date().toISOString(),
  });
}

// Suivi de l'activité utilisateur dans Omnia
async function trackActivity(anonymousUserId) {
  return postWithHmac("/api/activity/track", {
    refApplication: OMNIA_APP_ID,
    anonymousUserId,
  });
}

module.exports = { sendLog, trackActivity };`;

  const middlewareCodeEn = `// middleware/errorHandler.js
const { sendLog } = require("../lib/omnia");

// An Express error handling middleware must have 4 arguments: err, req, res, next.
function errorHandler(err, req, res, next) {
  // Log to Omnia (fire-and-forget)
  sendLog("Error", "Error", err.message, {
    stack: err.stack,
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.user?.id, // if you have user authentication
  }).catch(console.error);

  // Send response to the client
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message,
  });
}

module.exports = errorHandler;`;

  const middlewareCodeFr = `// middleware/errorHandler.js
const { sendLog } = require("../lib/omnia");

// Un middleware de gestion d'erreurs Express doit avoir 4 arguments : err, req, res, next.
function errorHandler(err, req, res, next) {
  // Journalise l'erreur dans Omnia (en mode "fire-and-forget")
  sendLog("Error", "Error", err.message, {
    stack: err.stack,
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.user?.id, // si vous avez une authentification utilisateur
  }).catch(console.error);

  // Envoie une réponse au client
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === "production"
      ? "Erreur Interne du Serveur"
      : err.message,
  });
}

module.exports = errorHandler;`;

  const activityMiddlewareCodeEn = `// middleware/trackActivity.js
const { trackActivity } = require("../lib/omnia");
const { v4: uuidv4 } = require("uuid");

function trackActivityMiddleware(req, res, next) {
  // Get or create session ID from cookies
  let sessionId = req.cookies?.sessionId;

  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  // Track in the background (fire-and-forget)
  trackActivity(sessionId).catch(console.error);

  next();
}

module.exports = trackActivityMiddleware;`;

  const activityMiddlewareCodeFr = `// middleware/trackActivity.js
const { trackActivity } = require("../lib/omnia");
const { v4: uuidv4 } = require("uuid");

function trackActivityMiddleware(req, res, next) {
  // Récupère ou crée un ID de session à partir des cookies
  let sessionId = req.cookies?.sessionId;

  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 heures
    });
  }

  // Suivi en arrière-plan (en mode "fire-and-forget")
  trackActivity(sessionId).catch(console.error);

  next();
}

module.exports = trackActivityMiddleware;`;

  const appCodeEn = `// app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middleware/errorHandler");
const trackActivityMiddleware = require("./middleware/trackActivity");

const app = express();

app.use(express.json());
app.use(cookieParser());

// Track activity for all routes
app.use(trackActivityMiddleware);

// Your application's routes
app.get("/api/users", async (req, res) => {
  // Your route logic...
});

// The error handler must be the last middleware
app.use(errorHandler);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});`;

  const appCodeFr = `// app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middleware/errorHandler");
const trackActivityMiddleware = require("./middleware/trackActivity");

const app = express();

app.use(express.json());
app.use(cookieParser());

// Suivi de l'activité pour toutes les routes
app.use(trackActivityMiddleware);

// Les routes de votre application
app.get("/api/users", async (req, res) => {
  // Votre logique de route...
});

// Le gestionnaire d'erreurs doit être le dernier middleware
app.use(errorHandler);

app.listen(3000, () => {
  console.log("Serveur démarré sur le port 3000");
});`;

  return (
    <DocSection id="express" title={t("docs.integration.express")}>
      <p style={styles.paragraph}>{t("docs.integration.expressText")}</p>
      <CodeBlock code={i18n.language === "fr" ? omniaClientCodeFr : omniaClientCodeEn} language="javascript" filename="lib/omnia.js" />
      <p style={styles.paragraph}>{t("docs.integration.expressErrorText")}</p>
      <p style={styles.paragraph}>
        Using a middleware for error handling in Express is a best practice. It allows you to create a centralized place to catch all unhandled errors that occur in your route handlers, ensuring consistent error logging and responses.
      </p>
      <CodeBlock code={i18n.language === "fr" ? middlewareCodeFr : middlewareCodeEn} language="javascript" filename="middleware/errorHandler.js" />
      <p style={styles.paragraph}>{t("docs.integration.expressActivityText")}</p>
      <CodeBlock code={i18n.language === "fr" ? activityMiddlewareCodeFr : activityMiddlewareCodeEn} language="javascript" filename="middleware/trackActivity.js" />
      <p style={styles.paragraph}>{t("docs.integration.expressSetupText")}</p>
      <CodeBlock code={i18n.language === "fr" ? appCodeFr : appCodeEn} language="javascript" filename="app.js" />
    </DocSection>
  );
}
