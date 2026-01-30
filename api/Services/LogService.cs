using api.Data.Models;
using api.DTOs.Log;
using api.Helper;
using api.Interfaces;
using api.Provider.Interface;
using Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

using api.Exceptions;
using Microsoft.AspNetCore.Http;
namespace api.Services
{
    public sealed class LogService : ILog
    {
        private readonly AppDbContext _context;
        private readonly IDataEncryptor _encryptor;

        private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

        public LogService(AppDbContext context, IDataEncryptor encryptor)
        {
            _context = context;
            _encryptor = encryptor;
        }

        public async Task<IReadOnlyList<LogDto>> GetAll(
            Guid? refApplication,
            DateTime? fromUtc,
            DateTime? toUtc,
            string? category,
            string? level,
            bool? isPatched,
            Guid userId,
            CancellationToken ct)
        {
            var accessibleIds = await ApplicationAccessHelper.GetAccessibleApplicationIdsAsync(_context, userId, ct);

            IQueryable<ErrorLog> q = _context.Log.AsQueryable()
                .Where(x => accessibleIds.Contains(x.RefApplication));

            if (refApplication.HasValue) q = q.Where(x => x.RefApplication == refApplication.Value);
            if (fromUtc.HasValue) q = q.Where(x => x.OccurredAtUtc >= fromUtc.Value);
            if (toUtc.HasValue) q = q.Where(x => x.OccurredAtUtc <= toUtc.Value);
            if (!string.IsNullOrWhiteSpace(category)) q = q.Where(x => x.Category == category);
            if (!string.IsNullOrWhiteSpace(level)) q = q.Where(x => x.Level == level);
            if (isPatched.HasValue) q = q.Where(x => x.IsPatched == isPatched.Value);

            var logs = await q.OrderByDescending(x => x.OccurredAtUtc).ToListAsync(ct);

            var result = new List<LogDto>(logs.Count);
            foreach (var x in logs)
            {
                result.Add(new LogDto
                {
                    Id = x.Id,
                    RefApplication = x.RefApplication,
                    Category = x.Category,
                    Level = x.Level,
                    Message = await _encryptor.DecryptAsync(x.Message, x.RefApplication, ct),
                    PayloadJson = await _encryptor.DecryptAsync(x.PayloadJson, x.RefApplication, ct),
                    Fingerprint = x.Fingerprint,
                    IsPatched = x.IsPatched,
                    OccurredAtUtc = x.OccurredAtUtc
                });
            }

            return result;
        }

        public async Task<LogDto?> GetById(Guid id, Guid userId, CancellationToken ct)
        {
            var log = await _context.Log.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (log is null) return null;

            if (!await ApplicationAccessHelper.CanAccessApplicationAsync(_context, userId, log.RefApplication, ct))
                return null;

            return new LogDto
            {
                Id = log.Id,
                RefApplication = log.RefApplication,
                Category = log.Category,
                Level = log.Level,
                Message = await _encryptor.DecryptAsync(log.Message, log.RefApplication, ct),
                PayloadJson = await _encryptor.DecryptAsync(log.PayloadJson, log.RefApplication, ct),
                Fingerprint = log.Fingerprint,
                IsPatched = log.IsPatched,
                OccurredAtUtc = log.OccurredAtUtc
            };
        }

        public async Task<LogDto> Create(AddLogDto dto, CancellationToken ct)
        {
            if (dto.RefApplication is null || dto.RefApplication == Guid.Empty)
                throw new ApiException(StatusCodes.Status400BadRequest, Shared.Keys.Errors.RefApplicationRequired);
            if (string.IsNullOrWhiteSpace(dto.Message))
                throw new ApiException(StatusCodes.Status400BadRequest, Shared.Keys.Errors.MessageRequired);

            var appId = dto.RefApplication.Value;
            var plainMessage = dto.Message.Trim();
            var plainPayload = string.IsNullOrWhiteSpace(dto.PayloadJson) ? "{}" : dto.PayloadJson;

            var entity = new ErrorLog
            {
                Id = Guid.NewGuid(),
                RefApplication = appId,
                Category = dto.Category?.Trim(),
                Level = dto.Level?.Trim(),
                Message = await _encryptor.EncryptAsync(plainMessage, appId, ct),
                PayloadJson = await _encryptor.EncryptAsync(plainPayload, appId, ct),
                Fingerprint = ComputeFingerprint(appId, dto.Category?.Trim(), dto.Level?.Trim(), plainMessage, plainPayload),
                OccurredAtUtc = dto.OccurredAtUtc ?? DateTime.UtcNow,
                IsPatched = false
            };

            _context.Log.Add(entity);
            await _context.SaveChangesAsync(ct);

            return new LogDto
            {
                Id = entity.Id,
                RefApplication = entity.RefApplication,
                Category = entity.Category,
                Level = entity.Level,
                Message = plainMessage,
                PayloadJson = plainPayload,
                Fingerprint = entity.Fingerprint,
                IsPatched = entity.IsPatched,
                OccurredAtUtc = entity.OccurredAtUtc
            };
        }

        public async Task<LogDto?> Update(Guid id, LogDto dto, Guid userId, CancellationToken ct)
        {
            var entity = await _context.Log.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return null;

            if (!await ApplicationAccessHelper.CanMaintainApplicationAsync(_context, userId, entity.RefApplication, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, Shared.Keys.Errors.Forbidden);

            var appId = entity.RefApplication;
            string? plainMessage = null;
            string? plainPayload = null;

            if (dto.RefApplication.HasValue && dto.RefApplication.Value != Guid.Empty)
            {
                appId = dto.RefApplication.Value;
                entity.RefApplication = appId;
            }

            if (dto.Category is not null) entity.Category = dto.Category?.Trim();
            if (dto.Level is not null) entity.Level = dto.Level?.Trim();

            if (dto.Message is not null)
            {
                plainMessage = dto.Message.Trim();
                entity.Message = await _encryptor.EncryptAsync(plainMessage, appId, ct);
            }
            else
            {
                plainMessage = await _encryptor.DecryptAsync(entity.Message, appId, ct);
            }

            if (dto.PayloadJson is not null)
            {
                plainPayload = dto.PayloadJson;
                entity.PayloadJson = await _encryptor.EncryptAsync(plainPayload, appId, ct);
            }
            else
            {
                plainPayload = await _encryptor.DecryptAsync(entity.PayloadJson, appId, ct);
            }

            if (dto.OccurredAtUtc.HasValue) entity.OccurredAtUtc = dto.OccurredAtUtc.Value;
            if (dto.IsPatched.HasValue) entity.IsPatched = dto.IsPatched.Value;

            if (dto.Fingerprint is not null)
            {
                entity.Fingerprint = string.IsNullOrWhiteSpace(dto.Fingerprint)
                    ? ComputeFingerprint(appId, entity.Category, entity.Level, plainMessage, plainPayload)
                    : dto.Fingerprint.Trim();
            }

            await _context.SaveChangesAsync(ct);

            return new LogDto
            {
                Id = entity.Id,
                RefApplication = entity.RefApplication,
                Category = entity.Category,
                Level = entity.Level,
                Message = plainMessage,
                PayloadJson = plainPayload,
                Fingerprint = entity.Fingerprint,
                IsPatched = entity.IsPatched,
                OccurredAtUtc = entity.OccurredAtUtc
            };
        }

        public async Task<bool> Delete(Guid id, Guid userId, CancellationToken ct)
        {
            var entity = await _context.Log.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return false;

            if (!await ApplicationAccessHelper.CanMaintainApplicationAsync(_context, userId, entity.RefApplication, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, Shared.Keys.Errors.Forbidden);

            _context.Log.Remove(entity);
            await _context.SaveChangesAsync(ct);
            return true;
        }

        public async Task<IReadOnlyList<LogDto>> GetDistinct(
            string? category,
            string? level,
            Guid[]? refsApplication,
            DateTime? fromUtc,
            DateTime? toUtc,
            bool? isPatched,
            Guid userId,
            CancellationToken ct)
        {
            var accessibleIds = await ApplicationAccessHelper.GetAccessibleApplicationIdsAsync(_context, userId, ct);

            IQueryable<ErrorLog> q = _context.Log.AsQueryable()
                .Where(x => accessibleIds.Contains(x.RefApplication));

            if (refsApplication is { Length: > 0 })
            {
                var filteredRefs = refsApplication.Where(id => accessibleIds.Contains(id)).ToArray();
                if (filteredRefs.Length > 0)
                    q = q.Where(x => filteredRefs.Contains(x.RefApplication));
            }
            if (fromUtc.HasValue) q = q.Where(x => x.OccurredAtUtc >= fromUtc.Value);
            if (toUtc.HasValue) q = q.Where(x => x.OccurredAtUtc <= toUtc.Value);
            if (!string.IsNullOrWhiteSpace(category)) q = q.Where(x => x.Category == category);
            if (!string.IsNullOrWhiteSpace(level)) q = q.Where(x => x.Level == level);
            if (isPatched.HasValue) q = q.Where(x => x.IsPatched == isPatched.Value);

            var logs = await q.ToListAsync(ct);

            var groups = logs
                .GroupBy(x => new { x.Fingerprint, x.RefApplication, x.Category, x.Level })
                .Select(g => new
                {
                    g.Key.Fingerprint,
                    g.Key.RefApplication,
                    g.Key.Category,
                    g.Key.Level,
                    FirstMessage = g.First().Message,
                    Occurrences = g.LongCount(),
                    OccurredAtUtc = g.Max(x => x.OccurredAtUtc),
                    IsPatched = g.All(x => x.IsPatched)
                })
                .OrderByDescending(x => x.Occurrences)
                .ThenByDescending(x => x.OccurredAtUtc)
                .ToList();

            var result = new List<LogDto>(groups.Count);
            foreach (var g in groups)
            {
                result.Add(new LogDto
                {
                    Fingerprint = g.Fingerprint,
                    RefApplication = g.RefApplication,
                    Category = g.Category,
                    Level = g.Level,
                    Message = await _encryptor.DecryptAsync(g.FirstMessage, g.RefApplication, ct),
                    Occurrences = g.Occurrences,
                    OccurredAtUtc = g.OccurredAtUtc,
                    IsPatched = g.IsPatched
                });
            }

            return result;
        }

        public async Task<List<LogDto>> MarkPatched(IEnumerable<Guid> ids, bool isPatched, Guid userId, CancellationToken ct)
        {
            var idList = ids.Distinct().ToList();
            if (idList.Count == 0) return new List<LogDto>();

            var accessibleIds = await ApplicationAccessHelper.GetAccessibleApplicationIdsAsync(_context, userId, ct);

            var entities = await _context.Log
                .Where(x => idList.Contains(x.Id) && accessibleIds.Contains(x.RefApplication))
                .ToListAsync(ct);
            if (entities.Count == 0) return new List<LogDto>();

            foreach (var e in entities)
                e.IsPatched = isPatched;

            await _context.SaveChangesAsync(ct);

            var result = new List<LogDto>(entities.Count);
            foreach (var entity in entities)
            {
                result.Add(new LogDto
                {
                    Id = entity.Id,
                    RefApplication = entity.RefApplication,
                    Category = entity.Category,
                    Level = entity.Level,
                    Message = await _encryptor.DecryptAsync(entity.Message, entity.RefApplication, ct),
                    PayloadJson = await _encryptor.DecryptAsync(entity.PayloadJson, entity.RefApplication, ct),
                    Fingerprint = entity.Fingerprint,
                    IsPatched = entity.IsPatched,
                    OccurredAtUtc = entity.OccurredAtUtc
                });
            }

            return result;
        }

        private static string ComputeFingerprint(
            Guid refApplication,
            string? category,
            string? level,
            string message,
            string payloadJson)
        {
            var normalizedMessage = NormalizeMessage(message);
            var stackSig = TryExtractStackSignature(payloadJson);
            var stackPart = stackSig.Length > 0 ? string.Join(">", stackSig) : "";
            var raw = $"{refApplication}|{category}|{level}|{normalizedMessage}|{stackPart}";
            byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
            return Convert.ToHexString(bytes);
        }

        private static string NormalizeMessage(string input)
        {
            var s = input;
            s = Regex.Replace(s, @"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", "?", RegexOptions.IgnoreCase);
            s = Regex.Replace(s, @"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", "?");
            s = Regex.Replace(s, @"https?:\/\/\S+", "?", RegexOptions.IgnoreCase);
            s = Regex.Replace(s, @"\b\d+\b", "?");
            s = Regex.Replace(s, @"\s+", " ").Trim();
            return s;
        }

        private static string[] TryExtractStackSignature(string payloadJson)
        {
            try
            {
                using var doc = JsonDocument.Parse(payloadJson);
                var root = doc.RootElement;

                if (TryReadFrames(root, out var frames)) return frames;
                if (root.TryGetProperty("error", out var error) && TryReadFrames(error, out frames)) return frames;
            }
            catch { }

            return Array.Empty<string>();
        }

        private static bool TryReadFrames(JsonElement el, out string[] frames)
        {
            frames = Array.Empty<string>();

            if (el.TryGetProperty("stackSignature", out var s) && s.ValueKind == JsonValueKind.Array)
            {
                frames = s.EnumerateArray()
                    .Where(x => x.ValueKind == JsonValueKind.String)
                    .Select(x => x.GetString()!)
                    .Take(3)
                    .ToArray();
                return frames.Length > 0;
            }

            if (el.TryGetProperty("frames", out var f) && f.ValueKind == JsonValueKind.Array)
            {
                frames = f.EnumerateArray()
                    .Where(x => x.ValueKind == JsonValueKind.String)
                    .Select(x => x.GetString()!)
                    .Take(3)
                    .ToArray();
                return frames.Length > 0;
            }

            return false;
        }
    }
}