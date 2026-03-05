using api.DTOs.Log;
using api.Interfaces;
using System.Text.Json;

namespace api.Middlewares
{
    public sealed class ErrorLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ErrorLoggingMiddleware> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        private static readonly Guid RefApplicationId =
            Guid.Parse("6932a69e-eaa0-4e9c-b4cf-d7a9c6524e4c");

        private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web)
        {
            WriteIndented = false
        };

        public ErrorLoggingMiddleware(RequestDelegate next, ILogger<ErrorLoggingMiddleware> logger, IServiceScopeFactory scopeFactory)
        {
            _next = next;
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        public async Task InvokeAsync(HttpContext context)
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
                    var payloadJson = JsonSerializer.Serialize(BuildPayload(context, ex, now), JsonOpts);

                    await using var scope = _scopeFactory.CreateAsyncScope();
                    var logService = scope.ServiceProvider.GetRequiredService<ILog>();

                    await logService.Create(new AddLogDto
                    {
                        RefApplication = RefApplicationId,
                        Category = "exception",
                        Level = "error",
                        Message = Truncate(ex.Message, 1024),
                        PayloadJson = payloadJson,
                        OccurredAtUtc = now
                    }, CancellationToken.None);

                    _logger.LogError(ex, "Unhandled exception logged.");
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
                traceContext = new
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

        private static string Truncate(string s, int max)
            => string.IsNullOrEmpty(s) ? "" : (s.Length <= max ? s : s.Substring(0, max));
    }
}
