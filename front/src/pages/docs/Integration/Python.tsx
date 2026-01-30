import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CodeBlock from "../../../components/CodeBlock";

export default function Python() {
  const { t, i18n } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
  };

  const omniaClientCodeEn = `# omnia_client.py
import base64
import hashlib
import hmac
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

class OmniaClient:
    def __init__(self, base_url: str, app_id: str, secret: str, key_version: int = 1):
        self.base_url = base_url.rstrip("/")
        self.app_id = app_id
        self.secret = base64.b64decode(secret)
        self.key_version = key_version
        self._client = httpx.Client()

    # Computes the HMAC-SHA256 signature
    def _compute_signature(self, method: str, path: str, timestamp: str, nonce: str, body: str) -> str:
        data_to_sign = f"{method}\\n{path}\\n{timestamp}\\n{nonce}\\n{body}"
        signature = hmac.new(self.secret, data_to_sign.encode(), hashlib.sha256)
        return base64.b64encode(signature.digest()).decode()

    # Generic method to post data with HMAC authentication
    def _post_with_hmac(self, path: str, body: dict) -> dict:
        json_body = json.dumps(body, separators=(",", ":"))
        timestamp = str(int(time.time() * 1000))
        nonce = str(uuid.uuid4())
        signature = self._compute_signature("POST", path, timestamp, nonce, json_body)

        headers = {
            "Content-Type": "application/json",
            "X-App-Id": self.app_id,
            "X-Key-Version": str(self.key_version),
            "X-Timestamp": timestamp,
            "X-Nonce": nonce,
            "X-Signature": signature,
        }

        response = self._client.post(f"{self.base_url}{path}", content=json_body, headers=headers)
        response.raise_for_status()
        return response.json() if response.content else {}

    # Sends a log entry to Omnia
    def send_log(
        self,
        category: str,
        level: str,
        message: str,
        payload: Optional[dict[str, Any]] = None,
        occurred_at: Optional[datetime] = None,
    ) -> dict:
        return self._post_with_hmac("/api/log", {
            "refApplication": self.app_id,
            "category": category,
            "level": level,
            "message": message,
            "payloadJson": json.dumps(payload or {}),
            "occurredAtUtc": (occurred_at or datetime.now(timezone.utc)).isoformat(),
        })

    # Tracks user activity in Omnia
    def track_activity(self, anonymous_user_id: str) -> dict:
        return self._post_with_hmac("/api/activity/track", {
            "refApplication": self.app_id,
            "anonymousUserId": anonymous_user_id,
        })

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()`;

  const omniaClientCodeFr = `# omnia_client.py
import base64
import hashlib
import hmac
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

class OmniaClient:
    def __init__(self, base_url: str, app_id: str, secret: str, key_version: int = 1):
        self.base_url = base_url.rstrip("/")
        self.app_id = app_id
        self.secret = base64.b64decode(secret)
        self.key_version = key_version
        self._client = httpx.Client()

    # Calcule la signature HMAC-SHA256
    def _compute_signature(self, method: str, path: str, timestamp: str, nonce: str, body: str) -> str:
        data_to_sign = f"{method}\\n{path}\\n{timestamp}\\n{nonce}\\n{body}"
        signature = hmac.new(self.secret, data_to_sign.encode(), hashlib.sha256)
        return base64.b64encode(signature.digest()).decode()

    # Méthode générique pour envoyer des données avec authentification HMAC
    def _post_with_hmac(self, path: str, body: dict) -> dict:
        json_body = json.dumps(body, separators=(",", ":"))
        timestamp = str(int(time.time() * 1000))
        nonce = str(uuid.uuid4())
        signature = self._compute_signature("POST", path, timestamp, nonce, json_body)

        headers = {
            "Content-Type": "application/json",
            "X-App-Id": self.app_id,
            "X-Key-Version": str(self.key_version),
            "X-Timestamp": timestamp,
            "X-Nonce": nonce,
            "X-Signature": signature,
        }

        response = self._client.post(f"{self.base_url}{path}", content=json_body, headers=headers)
        response.raise_for_status()
        return response.json() if response.content else {}

    # Envoie une entrée de log à Omnia
    def send_log(
        self,
        category: str,
        level: str,
        message: str,
        payload: Optional[dict[str, Any]] = None,
        occurred_at: Optional[datetime] = None,
    ) -> dict:
        return self._post_with_hmac("/api/log", {
            "refApplication": self.app_id,
            "category": category,
            "level": level,
            "message": message,
            "payloadJson": json.dumps(payload or {}),
            "occurredAtUtc": (occurred_at or datetime.now(timezone.utc)).isoformat(),
        })

    # Suivi de l'activité utilisateur dans Omnia
    def track_activity(self, anonymous_user_id: str) -> dict:
        return self._post_with_hmac("/api/activity/track", {
            "refApplication": self.app_id,
            "anonymousUserId": anonymous_user_id,
        })

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()`;

  const flaskCodeEn = `# app.py (Flask)
import os
import traceback
from flask import Flask, g, request
from omnia_client import OmniaClient

app = Flask(__name__)

# Initialize Omnia client from environment variables
omnia = OmniaClient(
    base_url=os.environ["OMNIA_URL"],
    app_id=os.environ["OMNIA_APP_ID"],
    secret=os.environ["OMNIA_SECRET"],
    key_version=int(os.environ.get("OMNIA_KEY_VERSION", "1")),
)

# Track activity before each request
@app.before_request
def track_activity():
    session_id = request.cookies.get("session_id") or str(uuid.uuid4())
    g.session_id = session_id
    try:
        omnia.track_activity(session_id)
    except Exception as e:
        app.logger.warning(f"Failed to track activity: {e}")

# Set session cookie after each request
@app.after_request
def set_session_cookie(response):
    if hasattr(g, "session_id"):
        response.set_cookie("session_id", g.session_id, httponly=True, max_age=86400)
    return response

# Global error handler
@app.errorhandler(Exception)
def handle_exception(e):
    try:
        omnia.send_log(
            category="Error",
            level="Error",
            message=str(e),
            payload={
                "traceback": traceback.format_exc(),
                "method": request.method,
                "path": request.path,
            },
        )
    except Exception as log_error:
        app.logger.error(f"Failed to send log: {log_error}")

    return {"error": "Internal Server Error"}, 500

@app.route("/api/example")
def example():
    return {"message": "Hello, World!"}

if __name__ == "__main__":
    app.run()`;

  const flaskCodeFr = `# app.py (Flask)
import os
import traceback
from flask import Flask, g, request
from omnia_client import OmniaClient

app = Flask(__name__)

# Initialise le client Omnia à partir des variables d'environnement
omnia = OmniaClient(
    base_url=os.environ["OMNIA_URL"],
    app_id=os.environ["OMNIA_APP_ID"],
    secret=os.environ["OMNIA_SECRET"],
    key_version=int(os.environ.get("OMNIA_KEY_VERSION", "1")),
)

# Suivi de l'activité avant chaque requête
@app.before_request
def track_activity():
    session_id = request.cookies.get("session_id") or str(uuid.uuid4())
    g.session_id = session_id
    try:
        omnia.track_activity(session_id)
    except Exception as e:
        app.logger.warning(f"Échec du suivi de l'activité: {e}")

# Définit le cookie de session après chaque requête
@app.after_request
def set_session_cookie(response):
    if hasattr(g, "session_id"):
        response.set_cookie("session_id", g.session_id, httponly=True, max_age=86400)
    return response

# Gestionnaire d'erreurs global
@app.errorhandler(Exception)
def handle_exception(e):
    try:
        omnia.send_log(
            category="Error",
            level="Error",
            message=str(e),
            payload={
                "traceback": traceback.format_exc(),
                "method": request.method,
                "path": request.path,
            },
        )
    except Exception as log_error:
        app.logger.error(f"Échec de l'envoi du log: {log_error}")

    return {"error": "Erreur Interne du Serveur"}, 500

@app.route("/api/example")
def example():
    return {"message": "Bonjour le monde !"}

if __name__ == "__main__":
    app.run()`;

  const djangoCodeEn = `# middleware.py (Django)
import logging
import traceback
import uuid
from django.conf import settings
from omnia_client import OmniaClient

logger = logging.getLogger(__name__)

# Initialize Omnia client from Django settings
omnia = OmniaClient(
    base_url=settings.OMNIA_URL,
    app_id=settings.OMNIA_APP_ID,
    secret=settings.OMNIA_SECRET,
    key_version=settings.OMNIA_KEY_VERSION,
)

class OmniaMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Track activity
        session_id = request.COOKIES.get("session_id") or str(uuid.uuid4())
        request.session_id = session_id

        try:
            omnia.track_activity(session_id)
        except Exception as e:
            logger.warning(f"Failed to track activity: {e}")

        response = self.get_response(request)

        # Set cookie if not already present
        if not request.COOKIES.get("session_id"):
            response.set_cookie("session_id", session_id, httponly=True, max_age=86400)

        return response

    # Process exceptions that occur in views
    def process_exception(self, request, exception):
        try:
            omnia.send_log(
                category="Error",
                level="Error",
                message=str(exception),
                payload={
                    "traceback": traceback.format_exc(),
                    "method": request.method,
                    "path": request.path,
                    "user_id": str(request.user.id) if request.user.is_authenticated else None,
                },
            )
        except Exception as log_error:
            logger.error(f"Failed to send log: {log_error}")
        return None # Let Django's default error handling continue`;

  const djangoCodeFr = `# middleware.py (Django)
import logging
import traceback
import uuid
from django.conf import settings
from omnia_client import OmniaClient

logger = logging.getLogger(__name__)

# Initialise le client Omnia à partir des paramètres Django
omnia = OmniaClient(
    base_url=settings.OMNIA_URL,
    app_id=settings.OMNIA_APP_ID,
    secret=settings.OMNIA_SECRET,
    key_version=settings.OMNIA_KEY_VERSION,
)

class OmniaMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Suivi de l'activité
        session_id = request.COOKIES.get("session_id") or str(uuid.uuid4())
        request.session_id = session_id

        try:
            omnia.track_activity(session_id)
        except Exception as e:
            logger.warning(f"Échec du suivi de l'activité: {e}")

        response = self.get_response(request)

        # Définit le cookie s'il n'est pas déjà présent
        if not request.COOKIES.get("session_id"):
            response.set_cookie("session_id", session_id, httponly=True, max_age=86400)

        return response

    # Traite les exceptions qui se produisent dans les vues
    def process_exception(self, request, exception):
        try:
            omnia.send_log(
                category="Error",
                level="Error",
                message=str(exception),
                payload={
                    "traceback": traceback.format_exc(),
                    "method": request.method,
                    "path": request.path,
                    "user_id": str(request.user.id) if request.user.is_authenticated else None,
                },
            )
        except Exception as log_error:
            logger.error(f"Échec de l'envoi du log: {log_error}")
        return None # Laisse la gestion d'erreurs par défaut de Django continuer`;

  return (
    <DocSection id="python" title={t("docs.integration.python")}>
      <p style={styles.paragraph}>{t("docs.integration.pythonText")}</p>
      <CodeBlock code={i18n.language === "fr" ? omniaClientCodeFr : omniaClientCodeEn} language="python" filename="omnia_client.py" />
      <p style={styles.paragraph}>{t("docs.integration.pythonFlaskText")}</p>
      <CodeBlock code={i18n.language === "fr" ? flaskCodeFr : flaskCodeEn} language="python" filename="app.py" />
      <p style={styles.paragraph}>{t("docs.integration.pythonDjangoText")}</p>
      <CodeBlock code={i18n.language === "fr" ? djangoCodeFr : djangoCodeEn} language="python" filename="middleware.py" />
    </DocSection>
  );
}
