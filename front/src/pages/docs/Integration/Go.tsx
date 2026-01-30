import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CodeBlock from "../../../components/CodeBlock";

export default function Go() {
  const { t, i18n } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
  };

  const omniaClientCodeEn = `// omnia/client.go
package omnia

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
)

// Client for interacting with the Omnia API
type Client struct {
	baseURL    string
	appID      string
	secret     []byte
	keyVersion int
	httpClient *http.Client
}

// NewClient creates a new Omnia client
func NewClient(baseURL, appID, secretBase64 string, keyVersion int) (*Client, error) {
	secret, err := base64.StdEncoding.DecodeString(secretBase64)
	if err != nil {
		return nil, fmt.Errorf("invalid secret: %w", err)
	}

	return &Client{
		baseURL:    baseURL,
		appID:      appID,
		secret:     secret,
		keyVersion: keyVersion,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}, nil
}

// Computes the HMAC-SHA256 signature
func (c *Client) computeSignature(method, path, timestamp, nonce, body string) string {
	dataToSign := fmt.Sprintf("%s\\n%s\\n%s\\n%s\\n%s", method, path, timestamp, nonce, body)
	h := hmac.New(sha256.New, c.secret)
	h.Write([]byte(dataToSign))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

// Generic method to post data with HMAC authentication
func (c *Client) postWithHMAC(path string, body interface{}) error {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return err
	}

	timestamp := strconv.FormatInt(time.Now().UnixMilli(), 10)
	nonce := uuid.New().String()
	signature := c.computeSignature("POST", path, timestamp, nonce, string(jsonBody))

	req, err := http.NewRequest("POST", c.baseURL+path, bytes.NewBuffer(jsonBody))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-App-Id", c.appID)
	req.Header.Set("X-Key-Version", strconv.Itoa(c.keyVersion))
	req.Header.Set("X-Timestamp", timestamp)
	req.Header.Set("X-Nonce", nonce)
	req.Header.Set("X-Signature", signature)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("omnia error: %d", resp.StatusCode)
	}

	return nil
}

// LogPayload defines the structure for a log entry
type LogPayload struct {
	RefApplication string \`json:"refApplication"\`
	Category       string \`json:"category"\`
	Level          string \`json:"level"\`
	Message        string \`json:"message"\`
	PayloadJSON    string \`json:"payloadJson"\`
	OccurredAtUTC  string \`json:"occurredAtUtc"\`
}

// SendLog sends a log entry to Omnia
func (c *Client) SendLog(category, level, message string, payload map[string]interface{}) error {
	payloadJSON, _ := json.Marshal(payload)

	return c.postWithHMAC("/api/log", LogPayload{
		RefApplication: c.appID,
		Category:       category,
		Level:          level,
		Message:        message,
		PayloadJSON:    string(payloadJSON),
		OccurredAtUTC:  time.Now().UTC().Format(time.RFC3339),
	})
}

// ActivityPayload defines the structure for an activity tracking entry
type ActivityPayload struct {
	RefApplication  string \`json:"refApplication"\`
	AnonymousUserID string \`json:"anonymousUserId"\`
}

// TrackActivity tracks user activity in Omnia
func (c *Client) TrackActivity(anonymousUserID string) error {
	return c.postWithHMAC("/api/activity/track", ActivityPayload{
		RefApplication:  c.appID,
		AnonymousUserID: anonymousUserID,
	})
}`;

  const omniaClientCodeFr = `// omnia/client.go
package omnia

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
)

// Client pour interagir avec l'API Omnia
type Client struct {
	baseURL    string
	appID      string
	secret     []byte
	keyVersion int
	httpClient *http.Client
}

// NewClient crée un nouveau client Omnia
func NewClient(baseURL, appID, secretBase64 string, keyVersion int) (*Client, error) {
	secret, err := base64.StdEncoding.DecodeString(secretBase64)
	if err != nil {
		return nil, fmt.Errorf("secret invalide: %w", err)
	}

	return &Client{
		baseURL:    baseURL,
		appID:      appID,
		secret:     secret,
		keyVersion: keyVersion,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}, nil
}

// Calcule la signature HMAC-SHA256
func (c *Client) computeSignature(method, path, timestamp, nonce, body string) string {
	dataToSign := fmt.Sprintf("%s\\n%s\\n%s\\n%s\\n%s", method, path, timestamp, nonce, body)
	h := hmac.New(sha256.New, c.secret)
	h.Write([]byte(dataToSign))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

// Méthode générique pour envoyer des données avec authentification HMAC
func (c *Client) postWithHMAC(path string, body interface{}) error {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return err
	}

	timestamp := strconv.FormatInt(time.Now().UnixMilli(), 10)
	nonce := uuid.New().String()
	signature := c.computeSignature("POST", path, timestamp, nonce, string(jsonBody))

	req, err := http.NewRequest("POST", c.baseURL+path, bytes.NewBuffer(jsonBody))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-App-Id", c.appID)
	req.Header.Set("X-Key-Version", strconv.Itoa(c.keyVersion))
	req.Header.Set("X-Timestamp", timestamp)
	req.Header.Set("X-Nonce", nonce)
	req.Header.Set("X-Signature", signature)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("erreur omnia: %d", resp.StatusCode)
	}

	return nil
}

// LogPayload définit la structure pour une entrée de log
type LogPayload struct {
	RefApplication string \`json:"refApplication"\`
	Category       string \`json:"category"\`
	Level          string \`json:"level"\`
	Message        string \`json:"message"\`
	PayloadJSON    string \`json:"payloadJson"\`
	OccurredAtUTC  string \`json:"occurredAtUtc"\`
}

// SendLog envoie une entrée de log à Omnia
func (c *Client) SendLog(category, level, message string, payload map[string]interface{}) error {
	payloadJSON, _ := json.Marshal(payload)

	return c.postWithHMAC("/api/log", LogPayload{
		RefApplication: c.appID,
		Category:       category,
		Level:          level,
		Message:        message,
		PayloadJSON:    string(payloadJSON),
		OccurredAtUTC:  time.Now().UTC().Format(time.RFC3339),
	})
}

// ActivityPayload définit la structure pour une entrée de suivi d'activité
type ActivityPayload struct {
	RefApplication  string \`json:"refApplication"\`
	AnonymousUserID string \`json:"anonymousUserId"\`
}

// TrackActivity suivi de l'activité utilisateur dans Omnia
func (c *Client) TrackActivity(anonymousUserID string) error {
	return c.postWithHMAC("/api/activity/track", ActivityPayload{
		RefApplication:  c.appID,
		AnonymousUserID: anonymousUserID,
	})
}`;

  const middlewareCodeEn = `// middleware/omnia.go
package middleware

import (
	"log"
	"net/http"
	"runtime/debug"

	"github.com/google/uuid"
	"yourapp/omnia"
)

// OmniaErrorHandler is a middleware to catch panics and log them to Omnia.
func OmniaErrorHandler(client *omnia.Client, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				stack := string(debug.Stack())

				// Log to Omnia in a new goroutine (fire-and-forget)
				go func() {
					if logErr := client.SendLog("Error", "Critical", fmt.Sprintf("%v", err), map[string]interface{}{
						"stack":  stack,
						"method": r.Method,
						"path":   r.URL.Path,
					}); logErr != nil {
						log.Printf("Failed to send log: %v", logErr)
					}
				}()

				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
		}()

		next.ServeHTTP(w, r)
	})
}

// OmniaActivityTracker is a middleware for tracking user activity.
func OmniaActivityTracker(client *omnia.Client, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sessionID := ""
		cookie, err := r.Cookie("session_id")
		if err != nil {
			sessionID = uuid.New().String()
			http.SetCookie(w, &http.Cookie{
				Name:     "session_id",
				Value:    sessionID,
				HttpOnly: true,
				MaxAge:   86400, // 24 hours
			})
		} else {
			sessionID = cookie.Value
		}

		// Track in the background (fire-and-forget)
		go func() {
			if err := client.TrackActivity(sessionID); err != nil {
				log.Printf("Failed to track activity: %v", err)
			}
		}()

		next.ServeHTTP(w, r)
	})
}`;

  const middlewareCodeFr = `// middleware/omnia.go
package middleware

import (
	"log"
	"net/http"
	"runtime/debug"

	"github.com/google/uuid"
	"yourapp/omnia"
)

// OmniaErrorHandler est un middleware pour intercepter les paniques et les journaliser dans Omnia.
func OmniaErrorHandler(client *omnia.Client, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				stack := string(debug.Stack())

				// Journalise dans Omnia dans une nouvelle goroutine (fire-and-forget)
				go func() {
					if logErr := client.SendLog("Error", "Critical", fmt.Sprintf("%v", err), map[string]interface{}{
						"stack":  stack,
						"method": r.Method,
						"path":   r.URL.Path,
					}); logErr != nil {
						log.Printf("Échec de l'envoi du log: %v", logErr)
					}
				}()

				http.Error(w, "Erreur Interne du Serveur", http.StatusInternalServerError)
			}
		}()

		next.ServeHTTP(w, r)
	})
}

// OmniaActivityTracker est un middleware pour le suivi de l'activité utilisateur.
func OmniaActivityTracker(client *omnia.Client, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sessionID := ""
		cookie, err := r.Cookie("session_id")
		if err != nil {
			sessionID = uuid.New().String()
			http.SetCookie(w, &http.Cookie{
				Name:     "session_id",
				Value:    sessionID,
				HttpOnly: true,
				MaxAge:   86400, // 24 heures
			})
		} else {
			sessionID = cookie.Value
		}

		// Suivi en arrière-plan (fire-and-forget)
		go func() {
			if err := client.TrackActivity(sessionID); err != nil {
				log.Printf("Échec du suivi de l'activité: %v", err)
			}
		}()

		next.ServeHTTP(w, r)
	})
}`;

  const mainCodeEn = `// main.go
package main

import (
	"log"
	"net/http"
	"os"

	"yourapp/middleware"
	"yourapp/omnia"
)

func main() {
	// Initialize the Omnia client from environment variables
	client, err := omnia.NewClient(
		os.Getenv("OMNIA_URL"),
		os.Getenv("OMNIA_APP_ID"),
		os.Getenv("OMNIA_SECRET"),
		1, // Key version
	)
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/example", exampleHandler)

	// Wrap the mux with your middleware. The order is important.
	handler := middleware.OmniaActivityTracker(client,
		middleware.OmniaErrorHandler(client, mux))

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}

func exampleHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Hello, World!"))
}`;

  const mainCodeFr = `// main.go
package main

import (
	"log"
	"net/http"
	"os"

	"yourapp/middleware"
	"yourapp/omnia"
)

func main() {
	// Initialise le client Omnia à partir des variables d'environnement
	client, err := omnia.NewClient(
		os.Getenv("OMNIA_URL"),
		os.Getenv("OMNIA_APP_ID"),
		os.Getenv("OMNIA_SECRET"),
		1, // Version de la clé
	)
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/example", exampleHandler)

	// Enveloppez le mux avec vos middlewares. L'ordre est important.
	handler := middleware.OmniaActivityTracker(client,
		middleware.OmniaErrorHandler(client, mux))

	log.Println("Serveur démarré sur :8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}

func exampleHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Bonjour le monde !"))
}`;

  return (
    <DocSection id="go" title={t("docs.integration.go")}>
      <p style={styles.paragraph}>{t("docs.integration.goText")}</p>
      <CodeBlock code={i18n.language === "fr" ? omniaClientCodeFr : omniaClientCodeEn} language="go" filename="omnia/client.go" />
      <p style={styles.paragraph}>{t("docs.integration.goMiddlewareText")}</p>
      <CodeBlock code={i18n.language === "fr" ? middlewareCodeFr : middlewareCodeEn} language="go" filename="middleware/omnia.go" />
      <p style={styles.paragraph}>{t("docs.integration.goSetupText")}</p>
      <CodeBlock code={i18n.language === "fr" ? mainCodeFr : mainCodeEn} language="go" filename="main.go" />
    </DocSection>
  );
}
