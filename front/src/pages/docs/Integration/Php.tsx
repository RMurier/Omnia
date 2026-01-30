import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CodeBlock from "../../../components/CodeBlock";

export default function Php() {
  const { t, i18n } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
  };

  const omniaClientCodeEn = `<?php
// src/OmniaClient.php
namespace App;

use Exception;

class OmniaClient
{
    private string $baseUrl;
    private string $appId;
    private string $secret;
    private int $keyVersion;

    public function __construct(string $baseUrl, string $appId, string $secret, int $keyVersion = 1)
    {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->appId = $appId;
        $this->secret = base64_decode($secret);
        $this->keyVersion = $keyVersion;
    }

    // Computes the HMAC-SHA256 signature
    private function computeSignature(string $method, string $path, string $timestamp, string $nonce, string $body): string
    {
        $dataToSign = implode("\\n", [$method, $path, $timestamp, $nonce, $body]);
        $signature = hash_hmac('sha256', $dataToSign, $this->secret, true);
        return base64_encode($signature);
    }

    // Generic method to post data with HMAC authentication
    private function postWithHmac(string $path, array $body): array
    {
        $json = json_encode($body, JSON_UNESCAPED_SLASHES);
        $timestamp = (string)(int)(microtime(true) * 1000);
        $nonce = $this->generateUuid();
        $signature = $this->computeSignature('POST', $path, $timestamp, $nonce, $json);

        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-App-Id: ' . $this->appId,
                'X-Key-Version: ' . $this->keyVersion,
                'X-Timestamp: ' . $timestamp,
                'X-Nonce: ' . $nonce,
                'X-Signature: ' . $signature,
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 400) {
            throw new Exception("Omnia error: {$httpCode}");
        }

        return json_decode($response, true) ?? [];
    }

    // Generates a UUID
    private function generateUuid(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    // Sends a log entry to Omnia
    public function sendLog(string $category, string $level, string $message, array $payload = []): array
    {
        return $this->postWithHmac('/api/log', [
            'refApplication' => $this->appId,
            'category' => $category,
            'level' => $level,
            'message' => $message,
            'payloadJson' => json_encode($payload),
            'occurredAtUtc' => gmdate('Y-m-d\\TH:i:s\\Z'),
        ]);
    }

    // Tracks user activity in Omnia
    public function trackActivity(string $anonymousUserId): array
    {
        return $this->postWithHmac('/api/activity/track', [
            'refApplication' => $this->appId,
            'anonymousUserId' => $anonymousUserId,
        ]);
    }
}`;

  const omniaClientCodeFr = `<?php
// src/OmniaClient.php
namespace App;

use Exception;

class OmniaClient
{
    private string $baseUrl;
    private string $appId;
    private string $secret;
    private int $keyVersion;

    public function __construct(string $baseUrl, string $appId, string $secret, int $keyVersion = 1)
    {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->appId = $appId;
        $this->secret = base64_decode($secret);
        $this->keyVersion = $keyVersion;
    }

    // Calcule la signature HMAC-SHA256
    private function computeSignature(string $method, string $path, string $timestamp, string $nonce, string $body): string
    {
        $dataToSign = implode("\\n", [$method, $path, $timestamp, $nonce, $body]);
        $signature = hash_hmac('sha256', $dataToSign, $this->secret, true);
        return base64_encode($signature);
    }

    // Méthode générique pour envoyer des données avec authentification HMAC
    private function postWithHmac(string $path, array $body): array
    {
        $json = json_encode($body, JSON_UNESCAPED_SLASHES);
        $timestamp = (string)(int)(microtime(true) * 1000);
        $nonce = $this->generateUuid();
        $signature = $this->computeSignature('POST', $path, $timestamp, $nonce, $json);

        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-App-Id: ' . $this->appId,
                'X-Key-Version: ' . $this->keyVersion,
                'X-Timestamp: ' . $timestamp,
                'X-Nonce: ' . $nonce,
                'X-Signature: ' . $signature,
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 400) {
            throw new Exception("Erreur Omnia: {$httpCode}");
        }

        return json_decode($response, true) ?? [];
    }

    // Génère un UUID
    private function generateUuid(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    // Envoie une entrée de log à Omnia
    public function sendLog(string $category, string $level, string $message, array $payload = []): array
    {
        return $this->postWithHmac('/api/log', [
            'refApplication' => $this->appId,
            'category' => $category,
            'level' => $level,
            'message' => $message,
            'payloadJson' => json_encode($payload),
            'occurredAtUtc' => gmdate('Y-m-d\\TH:i:s\\Z'),
        ]);
    }

    // Suivi de l'activité utilisateur dans Omnia
    public function trackActivity(string $anonymousUserId): array
    {
        return $this->postWithHmac('/api/activity/track', [
            'refApplication' => $this->appId,
            'anonymousUserId' => $anonymousUserId,
        ]);
    }
}`;

  const laravelCodeEn = `<?php
// app/Exceptions/Handler.php (Laravel)
namespace App\\Exceptions;

use App\\OmniaClient;
use Illuminate\\Foundation\\Exceptions\\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    private OmniaClient $omnia;

    public function __construct()
    {
        parent::__construct(app());

        // Initialize the client from config
        $this->omnia = new OmniaClient(
            config('services.omnia.url'),
            config('services.omnia.app_id'),
            config('services.omnia.secret'),
            config('services.omnia.key_version', 1)
        );
    }

    // Report exceptions to Omnia
    public function report(Throwable $e)
    {
        if ($this->shouldReport($e)) {
            try {
                $this->omnia->sendLog('Error', 'Error', $e->getMessage(), [
                    'trace' => $e->getTraceAsString(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'url' => request()?->fullUrl(),
                    'method' => request()?->method(),
                ]);
            } catch (\\Exception $logError) {
                \\Log::warning('Failed to send log to Omnia: ' . $logError->getMessage());
            }
        }

        parent::report($e);
    }
}`;

  const laravelCodeFr = `<?php
// app/Exceptions/Handler.php (Laravel)
namespace App\\Exceptions;

use App\\OmniaClient;
use Illuminate\\Foundation\\Exceptions\\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    private OmniaClient $omnia;

    public function __construct()
    {
        parent::__construct(app());

        // Initialise le client à partir de la configuration
        $this->omnia = new OmniaClient(
            config('services.omnia.url'),
            config('services.omnia.app_id'),
            config('services.omnia.secret'),
            config('services.omnia.key_version', 1)
        );
    }

    // Signale les exceptions à Omnia
    public function report(Throwable $e)
    {
        if ($this->shouldReport($e)) {
            try {
                $this->omnia->sendLog('Error', 'Error', $e->getMessage(), [
                    'trace' => $e->getTraceAsString(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'url' => request()?->fullUrl(),
                    'method' => request()?->method(),
                ]);
            } catch (\\Exception $logError) {
                \\Log::warning('Échec de l'envoi du log à Omnia: ' . $logError->getMessage());
            }
        }

        parent::report($e);
    }
}`;

  const middlewareCodeEn = `<?php
// app/Http/Middleware/TrackActivity.php (Laravel)
namespace App\\Http\\Middleware;

use App\\OmniaClient;
use Closure;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Str;

class TrackActivity
{
    private OmniaClient $omnia;

    public function __construct()
    {
        $this->omnia = new OmniaClient(
            config('services.omnia.url'),
            config('services.omnia.app_id'),
            config('services.omnia.secret'),
            config('services.omnia.key_version', 1)
        );
    }

    // Handle an incoming request.
    public function handle(Request $request, Closure $next)
    {
        $sessionId = $request->cookie('session_id') ?? Str::uuid()->toString();

        try {
            $this->omnia->trackActivity($sessionId);
        } catch (\\Exception $e) {
            \\Log::warning('Failed to track activity: ' . $e->getMessage());
        }

        $response = $next($request);

        // Set cookie if not present
        if (!$request->cookie('session_id')) {
            $response->cookie('session_id', $sessionId, 60 * 24, '/', null, true, true);
        }

        return $response;
    }
}`;

  const middlewareCodeFr = `<?php
// app/Http/Middleware/TrackActivity.php (Laravel)
namespace App\\Http\\Middleware;

use App\\OmniaClient;
use Closure;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Str;

class TrackActivity
{
    private OmniaClient $omnia;

    public function __construct()
    {
        $this->omnia = new OmniaClient(
            config('services.omnia.url'),
            config('services.omnia.app_id'),
            config('services.omnia.secret'),
            config('services.omnia.key_version', 1)
        );
    }

    // Gère une requête entrante.
    public function handle(Request $request, Closure $next)
    {
        $sessionId = $request->cookie('session_id') ?? Str::uuid()->toString();

        try {
            $this->omnia->trackActivity($sessionId);
        } catch (\\Exception $e) {
            \\Log::warning('Échec du suivi de l'activité: ' . $e->getMessage());
        }

        $response = $next($request);

        // Définit le cookie s'il n'est pas présent
        if (!$request->cookie('session_id')) {
            $response->cookie('session_id', $sessionId, 60 * 24, '/', null, true, true);
        }

        return $response;
    }
}`;

  const symfonyCodeEn = `<?php
// src/EventSubscriber/OmniaSubscriber.php (Symfony)
namespace App\\EventSubscriber;

use App\\OmniaClient;
use Symfony\\Component\\EventDispatcher\\EventSubscriberInterface;
use Symfony\\Component\\HttpKernel\\Event\\ExceptionEvent;
use Symfony\\Component\\HttpKernel\\Event\\RequestEvent;
use Symfony\\Component\\HttpKernel\\KernelEvents;
use Symfony\\Component\\Uid\\Uuid;

class OmniaSubscriber implements EventSubscriberInterface
{
    private OmniaClient $omnia;

    // Inject parameters from services.yaml
    public function __construct(string $omniaUrl, string $appId, string $secret, int $keyVersion)
    {
        $this->omnia = new OmniaClient($omniaUrl, $appId, $secret, $keyVersion);
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => 'onRequest',
            KernelEvents::EXCEPTION => 'onException',
        ];
    }

    // Track activity on each request
    public function onRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();
        $sessionId = $request->cookies->get('session_id') ?? Uuid::v4()->toRfc4122();
        $request->attributes->set('session_id', $sessionId);

        try {
            $this->omnia->trackActivity($sessionId);
        } catch (\\Exception $e) {
            // Log warning, e.g., using Monolog
        }
    }

    // Log exceptions to Omnia
    public function onException(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();

        try {
            $this->omnia->sendLog('Error', 'Error', $exception->getMessage(), [
                'trace' => $exception->getTraceAsString(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ]);
        } catch (\\Exception $e) {
            // Log warning
        }
    }
}`;

  const symfonyCodeFr = `<?php
// src/EventSubscriber/OmniaSubscriber.php (Symfony)
namespace App\\EventSubscriber;

use App\\OmniaClient;
use Symfony\\Component\\EventDispatcher\\EventSubscriberInterface;
use Symfony\\Component\\HttpKernel\\Event\\ExceptionEvent;
use Symfony\\Component\\HttpKernel\\Event\\RequestEvent;
use Symfony\\Component\\HttpKernel\\KernelEvents;
use Symfony\\Component\\Uid\\Uuid;

class OmniaSubscriber implements EventSubscriberInterface
{
    private OmniaClient $omnia;

    // Injecte les paramètres depuis services.yaml
    public function __construct(string $omniaUrl, string $appId, string $secret, int $keyVersion)
    {
        $this->omnia = new OmniaClient($omniaUrl, $appId, $secret, $keyVersion);
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => 'onRequest',
            KernelEvents::EXCEPTION => 'onException',
        ];
    }

    // Suivi de l'activité sur chaque requête
    public function onRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();
        $sessionId = $request->cookies->get('session_id') ?? Uuid::v4()->toRfc4122();
        $request->attributes->set('session_id', $sessionId);

        try {
            $this->omnia->trackActivity($sessionId);
        } catch (\\Exception $e) {
            // Journaliser un avertissement, ex: avec Monolog
        }
    }

    // Journalise les exceptions dans Omnia
    public function onException(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();

        try {
            $this->omnia->sendLog('Error', 'Error', $exception->getMessage(), [
                'trace' => $exception->getTraceAsString(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ]);
        } catch (\\Exception $e) {
            // Journaliser un avertissement
        }
    }
}`;

  return (
    <DocSection id="php" title={t("docs.integration.php")}>
      <p style={styles.paragraph}>{t("docs.integration.phpText")}</p>
      <CodeBlock code={i18n.language === "fr" ? omniaClientCodeFr : omniaClientCodeEn} language="php" filename="src/OmniaClient.php" />
      <p style={styles.paragraph}>{t("docs.integration.phpLaravelText")}</p>
      <CodeBlock code={i18n.language === "fr" ? laravelCodeFr : laravelCodeEn} language="php" filename="app/Exceptions/Handler.php" />
      <CodeBlock code={i18n.language === "fr" ? middlewareCodeFr : middlewareCodeEn} language="php" filename="app/Http/Middleware/TrackActivity.php" />
      <p style={styles.paragraph}>{t("docs.integration.phpSymfonyText")}</p>
      <CodeBlock code={i18n.language === "fr" ? symfonyCodeFr : symfonyCodeEn} language="php" filename="src/EventSubscriber/OmniaSubscriber.php" />
    </DocSection>
  );
}
