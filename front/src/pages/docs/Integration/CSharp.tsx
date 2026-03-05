import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";
import CodeBlock from "../../../components/CodeBlock";

export default function CSharp() {
  const { t, i18n } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    paragraph: { marginBottom: 16, lineHeight: 1.7 },
  };

  const omniaClientCodeEn = `using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

// Interface for Omnia Client
public interface IOmniaClient
{
    Task SendLogAsync(string category, string level, string message, object? payload = null);
    Task TrackActivityAsync(string anonymousUserId);
}

// Omnia Client Implementation
public class OmniaClient : IOmniaClient
{
    private readonly HttpClient _http;
    private readonly string _appId;
    private readonly string _secret;
    private readonly int _keyVersion;
    private readonly string _baseUrl;

    public OmniaClient(string baseUrl, string appId, string secret, int keyVersion)
    {
        _http = new HttpClient();
        _baseUrl = baseUrl.TrimEnd('/');
        _appId = appId;
        _secret = secret;
        _keyVersion = keyVersion;
    }

    // Sends a log entry to Omnia
    public async Task SendLogAsync(string category, string level, string message, object? payload = null)
    {
        var body = new
        {
            refApplication = _appId,
            category,
            level,
            message,
            payloadJson = payload != null ? JsonSerializer.Serialize(payload) : "{}",
            occurredAtUtc = DateTime.UtcNow
        };

        await PostWithHmacAsync("/api/log", body);
    }

    // Tracks user activity in Omnia
    public async Task TrackActivityAsync(string anonymousUserId)
    {
        var body = new
        {
            refApplication = _appId,
            anonymousUserId
        };

        await PostWithHmacAsync("/api/activity/track", body);
    }

    // Generic method to post data with HMAC authentication
    private async Task PostWithHmacAsync(string path, object body)
    {
        var json = JsonSerializer.Serialize(body);
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
        var nonce = Guid.NewGuid().ToString();

        var dataToSign = $"POST\\n{path}\\n{timestamp}\\n{nonce}\\n{json}";
        var signature = ComputeHmacSha256(dataToSign);

        var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}{path}")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        request.Headers.Add("X-App-Id", _appId);
        request.Headers.Add("X-Key-Version", _keyVersion.ToString());
        request.Headers.Add("X-Timestamp", timestamp);
        request.Headers.Add("X-Nonce", nonce);
        request.Headers.Add("X-Signature", signature);

        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();
    }

    // Computes HMAC-SHA256 signature
    private string ComputeHmacSha256(string data)
    {
        var keyBytes = Convert.FromBase64String(_secret);
        using var hmac = new HMACSHA256(keyBytes);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToBase64String(hash);
    }
}
`;

  const omniaClientCodeFr = `using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

// Interface pour le client Omnia
public interface IOmniaClient
{
    Task SendLogAsync(string category, string level, string message, object? payload = null);
    Task TrackActivityAsync(string anonymousUserId);
}

// Implémentation du client Omnia
public class OmniaClient : IOmniaClient
{
    private readonly HttpClient _http;
    private readonly string _appId; // ID de l'application
    private readonly string _secret; // Secret HMAC
    private readonly int _keyVersion; // Version de la clé
    private readonly string _baseUrl; // URL de base d'Omnia

    public OmniaClient(string baseUrl, string appId, string secret, int keyVersion)
    {
        _http = new HttpClient();
        _baseUrl = baseUrl.TrimEnd('/');
        _appId = appId;
        _secret = secret;
        _keyVersion = keyVersion;
    }

    // Envoie une entrée de log à Omnia
    public async Task SendLogAsync(string category, string level, string message, object? payload = null)
    {
        var body = new
        {
            refApplication = _appId,
            category,
            level,
            message,
            payloadJson = payload != null ? JsonSerializer.Serialize(payload) : "{}",
            occurredAtUtc = DateTime.UtcNow
        };

        await PostWithHmacAsync("/api/log", body);
    }

    // Suivi de l'activité utilisateur dans Omnia
    public async Task TrackActivityAsync(string anonymousUserId)
    {
        var body = new
        {
            refApplication = _appId,
            anonymousUserId
        };

        await PostWithHmacAsync("/api/activity/track", body);
    }

    // Méthode générique pour envoyer des requêtes avec authentification HMAC
    private async Task PostWithHmacAsync(string path, object body)
    {
        var json = JsonSerializer.Serialize(body);
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
        var nonce = Guid.NewGuid().ToString(); // Nonce unique pour chaque requête

        var dataToSign = $"POST\\n{path}\\n{timestamp}\\n{nonce}\\n{json}";
        var signature = ComputeHmacSha256(dataToSign);

        var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}{path}")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        request.Headers.Add("X-App-Id", _appId);
        request.Headers.Add("X-Key-Version", _keyVersion.ToString());
        request.Headers.Add("X-Timestamp", timestamp);
        request.Headers.Add("X-Nonce", nonce);
        request.Headers.Add("X-Signature", signature);

        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();
    }

    // Calcule la signature HMAC-SHA256
    private string ComputeHmacSha256(string data)
    {
        var keyBytes = Convert.FromBase64String(_secret);
        using var hmac = new HMACSHA256(keyBytes);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToBase64String(hash);
    }
}
`;

  const exceptionMiddlewareCodeEn = `using Microsoft.AspNetCore.Http;
using System.Net;
using System.Text.Json;

// Middleware for handling exceptions and logging them to Omnia
public class OmniaExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IOmniaClient _omniaClient;

    public OmniaExceptionMiddleware(RequestDelegate next, IOmniaClient omniaClient)
    {
        _next = next;
        _omniaClient = omniaClient;
    }

    public async Task InvokeAsync(HttpContext httpContext)
    {
        try
        {
            await _next(httpContext);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(httpContext, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        // Log the exception to Omnia (fire-and-forget)
        _ = _omniaClient.SendLogAsync(
            category: "Error",
            level: "Critical", // or Error, Warning, Info, Debug
            message: exception.Message,
            payload: new
            {
                Stack = exception.StackTrace,
                Type = exception.GetType().Name,
                // Add more relevant context here, e.g., RequestId, UserId
            }
        );

        // Return a generic error response to the client
        var response = new { message = "An internal server error occurred." };
        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}

// Extension method to easily add the middleware
public static class OmniaExceptionMiddlewareExtensions
{
    public static IApplicationBuilder UseOmniaExceptionHandling(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<OmniaExceptionMiddleware>();
    }
}
`;

  const exceptionMiddlewareCodeFr = `using Microsoft.AspNetCore.Http;
using System.Net;
using System.Text.Json;

// Middleware pour la gestion des exceptions et leur journalisation dans Omnia
public class OmniaExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IOmniaClient _omniaClient;

    public OmniaExceptionMiddleware(RequestDelegate next, IOmniaClient omniaClient)
    {
        _next = next;
        _omniaClient = omniaClient;
    }

    public async Task InvokeAsync(HttpContext httpContext)
    {
        try
        {
            await _next(httpContext);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(httpContext, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        // Journalise l'exception dans Omnia (en mode "fire-and-forget")
        _ = _omniaClient.SendLogAsync(
            category: "Error",
            level: "Critical", // ou Error, Warning, Info, Debug
            message: exception.Message,
            payload: new
            {
                Stack = exception.StackTrace,
                Type = exception.GetType().Name,
                // Ajouter d'autres contextes pertinents ici, ex: RequestId, UserId
            }
        );

        // Retourne une réponse d'erreur générique au client
        var response = new { message = "Une erreur interne du serveur est survenue." };
        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}

// Méthode d'extension pour ajouter facilement le middleware
public static class OmniaExceptionMiddlewareExtensions
{
    public static IApplicationBuilder UseOmniaExceptionHandling(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<OmniaExceptionMiddleware>();
    }
}
`;

  const programCsSetupCodeEn = `// Program.cs
using Omnia.Client; // Assuming your client and middleware are in Omnia.Client namespace

var builder = WebApplication.CreateBuilder(args);

// Register OmniaClient as a singleton
builder.Services.AddSingleton<IOmniaClient>(new OmniaClient(
    baseUrl: "https://omnia-monitoring.com", // Your Omnia instance URL
    appId: builder.Configuration["Omnia:AppId"]!,
    secret: builder.Configuration["Omnia:Secret"]!,
    keyVersion: int.Parse(builder.Configuration["Omnia:KeyVersion"]!)
));

// Add services to the container.
builder.Services.AddControllers();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    // Use Omnia exception handling middleware in production
    app.UseOmniaExceptionHandling();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();
`;

  const programCsSetupCodeFr = `// Program.cs
using Omnia.Client; // En supposant que votre client et middleware sont dans l'espace de noms Omnia.Client

var builder = WebApplication.CreateBuilder(args);

// Enregistre OmniaClient en tant que singleton
builder.Services.AddSingleton<IOmniaClient>(new OmniaClient(
    baseUrl: "https://omnia-monitoring.com", // URL de votre instance Omnia
    appId: builder.Configuration["Omnia:AppId"]!, // L'ID de l'application doit être configuré
    secret: builder.Configuration["Omnia:Secret"]!, // Le secret de l'application doit être configuré
    keyVersion: int.Parse(builder.Configuration["Omnia:KeyVersion"]!) // La version de la clé doit être configurée
));

// Ajoute les services au conteneur.
builder.Services.AddControllers();

var app = builder.Build();

// Configure le pipeline de requêtes HTTP.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    // Utilise le middleware de gestion des exceptions Omnia en production
    app.UseOmniaExceptionHandling();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();
`;

  return (
    <DocSection id="csharp" title={t("docs.integration.csharp")}>
      <p style={styles.paragraph}>{t("docs.integration.csharpText")}</p>
      <CodeBlock code={i18n.language === 'fr' ? omniaClientCodeFr : omniaClientCodeEn} language="csharp" filename="OmniaClient.cs" />

      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, marginTop: 24 }}>{t("docs.integration.csharp.errorMiddlewareTitle")}</h3>
      <p style={styles.paragraph}>
        {t("docs.integration.csharp.errorMiddlewareDesc")}
      </p>
      <CodeBlock code={i18n.language === 'fr' ? exceptionMiddlewareCodeFr : exceptionMiddlewareCodeEn} language="csharp" filename="OmniaExceptionMiddleware.cs" />

      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, marginTop: 24 }}>{t("docs.integration.csharp.programCsTitle")}</h3>
      <p style={styles.paragraph}>
        {t("docs.integration.csharp.programCsDesc")}
      </p>
      <CodeBlock code={i18n.language === 'fr' ? programCsSetupCodeFr : programCsSetupCodeEn} language="csharp" filename="Program.cs" />
    </DocSection>
  );
}
