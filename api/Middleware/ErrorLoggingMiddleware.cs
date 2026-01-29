using api.Data.Models;
using Data;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace api.Middlewares
{
    public sealed class ErrorLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ErrorLoggingMiddleware> _logger;

        private static readonly Guid RefApplicationId =
            Guid.Parse("6932a69e-eaa0-4e9c-b4cf-d7a9c6524e4c");

        private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web)
        {
            WriteIndented = false
        };

        public ErrorLoggingMiddleware(RequestDelegate next, ILogger<ErrorLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, AppDbContext db)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                try
                {
                    var now = DateTime.UtcNow;

                    var payload = BuildPayload(context, ex, now);
                    var payloadJson = JsonSerializer.Serialize(payload, JsonOpts);

                    var stackSig = ExtractStackSignature(ex, maxFrames: 3);
                    var fingerprint = ComputeFingerprint(
                        refApplication: RefApplicationId,
                        category: "exception",
                        level: "error",
                        message: ex.Message,
                        stackSignature: stackSig,
                        httpMethod: context.Request.Method,
                        path: context.Request.Path.Value ?? ""
                    );

                    var error = new ErrorLog
                    {
                        Id = Guid.NewGuid(),
                        RefApplication = RefApplicationId,
                        Category = "exception",
                        Level = "error",
                        Message = Truncate(ex.Message, 1024),
                        Fingerprint = fingerprint,
                        PayloadJson = payloadJson,
                        IsPatched = false,
                        OccurredAtUtc = now
                    };

                    db.Log.Add(error);
                    await db.SaveChangesAsync();

                    _logger.LogError(ex, "Unhandled exception logged. Fingerprint={Fingerprint}", fingerprint);
                }
                catch (Exception logEx)
                {
                    _logger.LogError(logEx, "Failed to persist ErrorLog");
                }

                throw; 
            }
        }

        private static object BuildPayload(HttpContext ctx, Exception ex, DateTime occurredAtUtc)
        {
            var traceId = System.Diagnostics.Activity.Current?.TraceId.ToString() ?? ctx.TraceIdentifier;

            var headers = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
            {
                ["User-Agent"] = ctx.Request.Headers.UserAgent.ToString(),
                ["Accept-Language"] = ctx.Request.Headers.AcceptLanguage.ToString()
            };

            return new
            {
                occurredAtUtc,
                source = new
                {
                    runtime = "dotnet",
                    framework = "aspnetcore"
                },
                http = new
                {
                    method = ctx.Request.Method,
                    path = ctx.Request.Path.Value,
                    query = ctx.Request.QueryString.Value,
                    host = ctx.Request.Host.Value,
                    scheme = ctx.Request.Scheme
                },
                trace = new
                {
                    traceId,
                    spanId = System.Diagnostics.Activity.Current?.SpanId.ToString()
                },
                error = new
                {
                    type = ex.GetType().FullName,
                    message = ex.Message,
                    stack = ex.ToString(),
                    stackSignature = ExtractStackSignature(ex, 3)
                },
                request = new
                {
                    headers
                }
            };
        }

        private static string[] ExtractStackSignature(Exception ex, int maxFrames)
        {
            var st = new System.Diagnostics.StackTrace(ex, fNeedFileInfo: false);
            var frames = st.GetFrames();
            if (frames == null || frames.Length == 0) return Array.Empty<string>();

            var sig = new List<string>(maxFrames);

            foreach (var f in frames)
            {
                if (sig.Count >= maxFrames) break;

                var m = f.GetMethod();
                if (m == null) continue;

                var type = m.DeclaringType?.FullName ?? "";
                var name = m.Name ?? "";

                if (type.StartsWith("System.", StringComparison.Ordinal) ||
                    type.StartsWith("Microsoft.", StringComparison.Ordinal))
                    continue;

                sig.Add(string.IsNullOrEmpty(type) ? name : $"{type}.{name}");
            }

            return sig.ToArray();
        }

        private static string ComputeFingerprint(
            Guid refApplication,
            string? category,
            string? level,
            string message,
            IEnumerable<string>? stackSignature,
            string httpMethod,
            string path)
        {
            var normalized = NormalizeMessage(message);
            var stackPart = stackSignature != null ? string.Join(">", stackSignature) : "";

            var raw = $"{refApplication}|{category}|{level}|{httpMethod}|{path}|{normalized}|{stackPart}";

            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(raw));
            return Convert.ToHexString(bytes);
        }

        private static string NormalizeMessage(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return "";

            var s = input;

            s = Regex.Replace(s,
                @"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
                "?",
                RegexOptions.IgnoreCase);

            s = Regex.Replace(s,
                @"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
                "?");

            s = Regex.Replace(s,
                @"https?:\/\/\S+",
                "?",
                RegexOptions.IgnoreCase);

            s = Regex.Replace(s,
                @"\b\d+\b",
                "?");

            s = Regex.Replace(s, @"\s+", " ").Trim();

            return s;
        }

        private static string Truncate(string s, int max)
            => string.IsNullOrEmpty(s) ? "" : (s.Length <= max ? s : s.Substring(0, max));
    }
}
