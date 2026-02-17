using api.Data.Models;
using api.DTOs.Mail;
using api.Helper;
using api.Interfaces;
using api.Provider.Interface;
using Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

using api.Exceptions;
using Microsoft.AspNetCore.Http;

namespace api.Services
{
    public sealed class MailService : IMail
    {
        private readonly AppDbContext _context;
        private readonly IDataEncryptor _encryptor;
        private readonly IMailSender _mailSender;

        public MailService(AppDbContext context, IDataEncryptor encryptor, IMailSender mailSender)
        {
            _context = context;
            _encryptor = encryptor;
            _mailSender = mailSender;
        }

        public async Task SendAndLogAsync(
            string from,
            IEnumerable<string> to,
            IEnumerable<string>? cc,
            IEnumerable<string>? bcc,
            string subject,
            string htmlBody,
            string? plainTextBody,
            CancellationToken ct)
        {
            string mailStatus;
            string? errorMessage = null;

            try
            {
                await _mailSender.SendAsync(from, to, cc, bcc, subject, htmlBody, true, ct, plainTextBody);
                mailStatus = "sent";
            }
            catch (Exception ex)
            {
                mailStatus = "failed";
                errorMessage = ex.Message;
            }

            var toJson = JsonSerializer.Serialize(to);
            var ccJson = cc is not null ? JsonSerializer.Serialize(cc) : null;
            var bccJson = bcc is not null ? JsonSerializer.Serialize(bcc) : null;

            var entity = new SystemMailLog
            {
                Id = Guid.NewGuid(),
                FromAddress = _encryptor.EncryptSystem(from),
                ToAddresses = _encryptor.EncryptSystem(toJson),
                CcAddresses = ccJson is not null ? _encryptor.EncryptSystem(ccJson) : null,
                BccAddresses = bccJson is not null ? _encryptor.EncryptSystem(bccJson) : null,
                Subject = _encryptor.EncryptSystem(subject),
                Body = _encryptor.EncryptSystem(htmlBody),
                Status = mailStatus,
                ErrorMessage = errorMessage is not null ? _encryptor.EncryptSystem(errorMessage) : null,
                Fingerprint = ComputeFingerprint(Guid.Empty, from, toJson, subject),
                SentAtUtc = DateTime.UtcNow
            };

            _context.SystemMailLog.Add(entity);
            await _context.SaveChangesAsync(ct);
        }

        public async Task<IReadOnlyList<MailLogDto>> GetAll(
            Guid? refApplication,
            DateTime? fromUtc,
            DateTime? toUtc,
            string? status,
            bool? isPatched,
            Guid userId,
            CancellationToken ct)
        {
            var accessibleIds = await ApplicationAccessHelper.GetAccessibleApplicationIdsAsync(_context, userId, ct);

            IQueryable<MailLog> q = _context.MailLog.AsQueryable()
                .Where(x => accessibleIds.Contains(x.RefApplication));

            if (refApplication.HasValue) q = q.Where(x => x.RefApplication == refApplication.Value);
            if (fromUtc.HasValue) q = q.Where(x => x.SentAtUtc >= fromUtc.Value);
            if (toUtc.HasValue) q = q.Where(x => x.SentAtUtc <= toUtc.Value);
            if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.Status == status);
            if (isPatched.HasValue) q = q.Where(x => x.IsPatched == isPatched.Value);

            var logs = await q.OrderByDescending(x => x.SentAtUtc).ToListAsync(ct);

            var result = new List<MailLogDto>(logs.Count);
            foreach (var x in logs)
            {
                result.Add(new MailLogDto
                {
                    Id = x.Id,
                    RefApplication = x.RefApplication,
                    FromAddress = await _encryptor.DecryptAsync(x.FromAddress, x.RefApplication, ct),
                    ToAddresses = await _encryptor.DecryptAsync(x.ToAddresses, x.RefApplication, ct),
                    CcAddresses = x.CcAddresses is not null ? await _encryptor.DecryptAsync(x.CcAddresses, x.RefApplication, ct) : null,
                    BccAddresses = x.BccAddresses is not null ? await _encryptor.DecryptAsync(x.BccAddresses, x.RefApplication, ct) : null,
                    Subject = await _encryptor.DecryptAsync(x.Subject, x.RefApplication, ct),
                    Body = await _encryptor.DecryptAsync(x.Body, x.RefApplication, ct),
                    AttachmentsJson = await _encryptor.DecryptAsync(x.AttachmentsJson, x.RefApplication, ct),
                    Status = x.Status,
                    ErrorMessage = x.ErrorMessage is not null ? await _encryptor.DecryptAsync(x.ErrorMessage, x.RefApplication, ct) : null,
                    Fingerprint = x.Fingerprint,
                    IsPatched = x.IsPatched,
                    SentAtUtc = x.SentAtUtc
                });
            }

            return result;
        }

        public async Task<MailLogDto?> GetById(Guid id, Guid userId, CancellationToken ct)
        {
            var log = await _context.MailLog.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (log is null) return null;

            if (!await ApplicationAccessHelper.CanAccessApplicationAsync(_context, userId, log.RefApplication, ct))
                return null;

            return new MailLogDto
            {
                Id = log.Id,
                RefApplication = log.RefApplication,
                FromAddress = await _encryptor.DecryptAsync(log.FromAddress, log.RefApplication, ct),
                ToAddresses = await _encryptor.DecryptAsync(log.ToAddresses, log.RefApplication, ct),
                CcAddresses = log.CcAddresses is not null ? await _encryptor.DecryptAsync(log.CcAddresses, log.RefApplication, ct) : null,
                BccAddresses = log.BccAddresses is not null ? await _encryptor.DecryptAsync(log.BccAddresses, log.RefApplication, ct) : null,
                Subject = await _encryptor.DecryptAsync(log.Subject, log.RefApplication, ct),
                Body = await _encryptor.DecryptAsync(log.Body, log.RefApplication, ct),
                AttachmentsJson = await _encryptor.DecryptAsync(log.AttachmentsJson, log.RefApplication, ct),
                Status = log.Status,
                ErrorMessage = log.ErrorMessage is not null ? await _encryptor.DecryptAsync(log.ErrorMessage, log.RefApplication, ct) : null,
                Fingerprint = log.Fingerprint,
                IsPatched = log.IsPatched,
                SentAtUtc = log.SentAtUtc
            };
        }

        public async Task<MailLogDto> Create(AddMailLogDto dto, CancellationToken ct)
        {
            if (dto.RefApplication is null || dto.RefApplication == Guid.Empty)
                throw new ApiException(StatusCodes.Status400BadRequest, Shared.Keys.Errors.RefApplicationRequired);
            if (string.IsNullOrWhiteSpace(dto.Subject))
                throw new ApiException(StatusCodes.Status400BadRequest, Shared.Keys.Errors.SubjectRequired);

            var appId = dto.RefApplication.Value;
            var plainFrom = (dto.FromAddress ?? "").Trim();
            var plainTo = string.IsNullOrWhiteSpace(dto.ToAddresses) ? "[]" : dto.ToAddresses;
            var plainCc = dto.CcAddresses;
            var plainBcc = dto.BccAddresses;
            var plainSubject = dto.Subject.Trim();
            var plainBody = dto.Body ?? "";
            var plainAttachments = string.IsNullOrWhiteSpace(dto.AttachmentsJson) ? "[]" : dto.AttachmentsJson;
            var plainError = dto.ErrorMessage;

            var mailStatus = string.IsNullOrWhiteSpace(dto.Status) ? "sent" : dto.Status.Trim().ToLowerInvariant();

            if (dto.SendMail)
            {
                var toList = ParseJsonArray(plainTo);
                var ccList = plainCc is not null ? ParseJsonArray(plainCc) : null;
                var bccList = plainBcc is not null ? ParseJsonArray(plainBcc) : null;

                try
                {
                    await _mailSender.SendAsync(plainFrom, toList, ccList, bccList, plainSubject, plainBody, dto.IsHtml, ct);
                    mailStatus = "sent";
                }
                catch (Exception ex)
                {
                    mailStatus = "failed";
                    plainError = ex.Message;
                }
            }

            var entity = new MailLog
            {
                Id = Guid.NewGuid(),
                RefApplication = appId,
                FromAddress = await _encryptor.EncryptAsync(plainFrom, appId, ct),
                ToAddresses = await _encryptor.EncryptAsync(plainTo, appId, ct),
                CcAddresses = plainCc is not null ? await _encryptor.EncryptAsync(plainCc, appId, ct) : null,
                BccAddresses = plainBcc is not null ? await _encryptor.EncryptAsync(plainBcc, appId, ct) : null,
                Subject = await _encryptor.EncryptAsync(plainSubject, appId, ct),
                Body = await _encryptor.EncryptAsync(plainBody, appId, ct),
                AttachmentsJson = await _encryptor.EncryptAsync(plainAttachments, appId, ct),
                Status = mailStatus,
                ErrorMessage = plainError is not null ? await _encryptor.EncryptAsync(plainError, appId, ct) : null,
                Fingerprint = ComputeFingerprint(appId, plainFrom, plainTo, plainSubject),
                SentAtUtc = dto.SentAtUtc ?? DateTime.UtcNow,
                IsPatched = false
            };

            _context.MailLog.Add(entity);
            await _context.SaveChangesAsync(ct);

            return new MailLogDto
            {
                Id = entity.Id,
                RefApplication = entity.RefApplication,
                FromAddress = plainFrom,
                ToAddresses = plainTo,
                CcAddresses = plainCc,
                BccAddresses = plainBcc,
                Subject = plainSubject,
                Body = plainBody,
                AttachmentsJson = plainAttachments,
                Status = entity.Status,
                ErrorMessage = plainError,
                Fingerprint = entity.Fingerprint,
                IsPatched = entity.IsPatched,
                SentAtUtc = entity.SentAtUtc
            };
        }

        public async Task<MailLogDto?> Update(Guid id, MailLogDto dto, Guid userId, CancellationToken ct)
        {
            var entity = await _context.MailLog.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return null;

            if (!await ApplicationAccessHelper.CanMaintainApplicationAsync(_context, userId, entity.RefApplication, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, Shared.Keys.Errors.Forbidden);

            var appId = entity.RefApplication;

            if (dto.RefApplication.HasValue && dto.RefApplication.Value != Guid.Empty)
            {
                appId = dto.RefApplication.Value;
                entity.RefApplication = appId;
            }

            string plainFrom;
            if (dto.FromAddress is not null)
            {
                plainFrom = dto.FromAddress.Trim();
                entity.FromAddress = await _encryptor.EncryptAsync(plainFrom, appId, ct);
            }
            else
            {
                plainFrom = await _encryptor.DecryptAsync(entity.FromAddress, appId, ct);
            }

            string plainTo;
            if (dto.ToAddresses is not null)
            {
                plainTo = dto.ToAddresses;
                entity.ToAddresses = await _encryptor.EncryptAsync(plainTo, appId, ct);
            }
            else
            {
                plainTo = await _encryptor.DecryptAsync(entity.ToAddresses, appId, ct);
            }

            string? plainCc;
            if (dto.CcAddresses is not null)
            {
                plainCc = dto.CcAddresses;
                entity.CcAddresses = await _encryptor.EncryptAsync(plainCc, appId, ct);
            }
            else
            {
                plainCc = entity.CcAddresses is not null ? await _encryptor.DecryptAsync(entity.CcAddresses, appId, ct) : null;
            }

            string? plainBcc;
            if (dto.BccAddresses is not null)
            {
                plainBcc = dto.BccAddresses;
                entity.BccAddresses = await _encryptor.EncryptAsync(plainBcc, appId, ct);
            }
            else
            {
                plainBcc = entity.BccAddresses is not null ? await _encryptor.DecryptAsync(entity.BccAddresses, appId, ct) : null;
            }

            string plainSubject;
            if (dto.Subject is not null)
            {
                plainSubject = dto.Subject.Trim();
                entity.Subject = await _encryptor.EncryptAsync(plainSubject, appId, ct);
            }
            else
            {
                plainSubject = await _encryptor.DecryptAsync(entity.Subject, appId, ct);
            }

            string plainBody;
            if (dto.Body is not null)
            {
                plainBody = dto.Body;
                entity.Body = await _encryptor.EncryptAsync(plainBody, appId, ct);
            }
            else
            {
                plainBody = await _encryptor.DecryptAsync(entity.Body, appId, ct);
            }

            string plainAttachments;
            if (dto.AttachmentsJson is not null)
            {
                plainAttachments = dto.AttachmentsJson;
                entity.AttachmentsJson = await _encryptor.EncryptAsync(plainAttachments, appId, ct);
            }
            else
            {
                plainAttachments = await _encryptor.DecryptAsync(entity.AttachmentsJson, appId, ct);
            }

            if (dto.Status is not null) entity.Status = dto.Status.Trim().ToLowerInvariant();

            string? plainError;
            if (dto.ErrorMessage is not null)
            {
                plainError = dto.ErrorMessage;
                entity.ErrorMessage = await _encryptor.EncryptAsync(plainError, appId, ct);
            }
            else
            {
                plainError = entity.ErrorMessage is not null ? await _encryptor.DecryptAsync(entity.ErrorMessage, appId, ct) : null;
            }

            if (dto.SentAtUtc.HasValue) entity.SentAtUtc = dto.SentAtUtc.Value;
            if (dto.IsPatched.HasValue) entity.IsPatched = dto.IsPatched.Value;

            if (dto.Fingerprint is not null)
            {
                entity.Fingerprint = string.IsNullOrWhiteSpace(dto.Fingerprint)
                    ? ComputeFingerprint(appId, plainFrom, plainTo, plainSubject)
                    : dto.Fingerprint.Trim();
            }

            await _context.SaveChangesAsync(ct);

            return new MailLogDto
            {
                Id = entity.Id,
                RefApplication = entity.RefApplication,
                FromAddress = plainFrom,
                ToAddresses = plainTo,
                CcAddresses = plainCc,
                BccAddresses = plainBcc,
                Subject = plainSubject,
                Body = plainBody,
                AttachmentsJson = plainAttachments,
                Status = entity.Status,
                ErrorMessage = plainError,
                Fingerprint = entity.Fingerprint,
                IsPatched = entity.IsPatched,
                SentAtUtc = entity.SentAtUtc
            };
        }

        public async Task<bool> Delete(Guid id, Guid userId, CancellationToken ct)
        {
            var entity = await _context.MailLog.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return false;

            if (!await ApplicationAccessHelper.CanMaintainApplicationAsync(_context, userId, entity.RefApplication, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, Shared.Keys.Errors.Forbidden);

            _context.MailLog.Remove(entity);
            await _context.SaveChangesAsync(ct);
            return true;
        }

        public async Task<IReadOnlyList<MailLogDto>> GetDistinct(
            string? status,
            Guid[]? refsApplication,
            DateTime? fromUtc,
            DateTime? toUtc,
            bool? isPatched,
            Guid userId,
            CancellationToken ct)
        {
            var accessibleIds = await ApplicationAccessHelper.GetAccessibleApplicationIdsAsync(_context, userId, ct);

            IQueryable<MailLog> q = _context.MailLog.AsQueryable()
                .Where(x => accessibleIds.Contains(x.RefApplication));

            if (refsApplication is { Length: > 0 })
            {
                var filteredRefs = refsApplication.Where(id => accessibleIds.Contains(id)).ToArray();
                if (filteredRefs.Length > 0)
                    q = q.Where(x => filteredRefs.Contains(x.RefApplication));
            }
            if (fromUtc.HasValue) q = q.Where(x => x.SentAtUtc >= fromUtc.Value);
            if (toUtc.HasValue) q = q.Where(x => x.SentAtUtc <= toUtc.Value);
            if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.Status == status);
            if (isPatched.HasValue) q = q.Where(x => x.IsPatched == isPatched.Value);

            var logs = await q.ToListAsync(ct);

            var groups = logs
                .GroupBy(x => new { x.Fingerprint, x.RefApplication, x.Status })
                .Select(g => new
                {
                    g.Key.Fingerprint,
                    g.Key.RefApplication,
                    g.Key.Status,
                    FirstSubject = g.First().Subject,
                    FirstFrom = g.First().FromAddress,
                    FirstTo = g.First().ToAddresses,
                    Occurrences = g.LongCount(),
                    SentAtUtc = g.Max(x => x.SentAtUtc),
                    IsPatched = g.All(x => x.IsPatched)
                })
                .OrderByDescending(x => x.Occurrences)
                .ThenByDescending(x => x.SentAtUtc)
                .ToList();

            var result = new List<MailLogDto>(groups.Count);
            foreach (var g in groups)
            {
                result.Add(new MailLogDto
                {
                    Fingerprint = g.Fingerprint,
                    RefApplication = g.RefApplication,
                    Status = g.Status,
                    Subject = await _encryptor.DecryptAsync(g.FirstSubject, g.RefApplication, ct),
                    FromAddress = await _encryptor.DecryptAsync(g.FirstFrom, g.RefApplication, ct),
                    ToAddresses = await _encryptor.DecryptAsync(g.FirstTo, g.RefApplication, ct),
                    Occurrences = g.Occurrences,
                    SentAtUtc = g.SentAtUtc,
                    IsPatched = g.IsPatched
                });
            }

            return result;
        }

        public async Task<List<MailLogDto>> MarkPatched(IEnumerable<Guid> ids, bool isPatched, Guid userId, CancellationToken ct)
        {
            var idList = ids.Distinct().ToList();
            if (idList.Count == 0) return new List<MailLogDto>();

            var accessibleIds = await ApplicationAccessHelper.GetAccessibleApplicationIdsAsync(_context, userId, ct);

            var entities = await _context.MailLog
                .Where(x => idList.Contains(x.Id) && accessibleIds.Contains(x.RefApplication))
                .ToListAsync(ct);
            if (entities.Count == 0) return new List<MailLogDto>();

            foreach (var e in entities)
                e.IsPatched = isPatched;

            await _context.SaveChangesAsync(ct);

            var result = new List<MailLogDto>(entities.Count);
            foreach (var entity in entities)
            {
                result.Add(new MailLogDto
                {
                    Id = entity.Id,
                    RefApplication = entity.RefApplication,
                    FromAddress = await _encryptor.DecryptAsync(entity.FromAddress, entity.RefApplication, ct),
                    ToAddresses = await _encryptor.DecryptAsync(entity.ToAddresses, entity.RefApplication, ct),
                    CcAddresses = entity.CcAddresses is not null ? await _encryptor.DecryptAsync(entity.CcAddresses, entity.RefApplication, ct) : null,
                    BccAddresses = entity.BccAddresses is not null ? await _encryptor.DecryptAsync(entity.BccAddresses, entity.RefApplication, ct) : null,
                    Subject = await _encryptor.DecryptAsync(entity.Subject, entity.RefApplication, ct),
                    Body = await _encryptor.DecryptAsync(entity.Body, entity.RefApplication, ct),
                    AttachmentsJson = await _encryptor.DecryptAsync(entity.AttachmentsJson, entity.RefApplication, ct),
                    Status = entity.Status,
                    ErrorMessage = entity.ErrorMessage is not null ? await _encryptor.DecryptAsync(entity.ErrorMessage, entity.RefApplication, ct) : null,
                    Fingerprint = entity.Fingerprint,
                    IsPatched = entity.IsPatched,
                    SentAtUtc = entity.SentAtUtc
                });
            }

            return result;
        }

        private static string ComputeFingerprint(
            Guid refApplication,
            string fromAddress,
            string toAddresses,
            string subject)
        {
            var normalizedFrom = fromAddress.Trim().ToLowerInvariant();
            var normalizedTo = toAddresses.Trim().ToLowerInvariant();
            var normalizedSubject = subject.Trim().ToLowerInvariant();
            var raw = $"{refApplication}|{normalizedFrom}|{normalizedTo}|{normalizedSubject}";
            byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
            return Convert.ToHexString(bytes);
        }

        private static List<string> ParseJsonArray(string json)
        {
            try
            {
                var arr = JsonSerializer.Deserialize<List<string>>(json);
                return arr ?? new List<string>();
            }
            catch
            {
                return string.IsNullOrWhiteSpace(json) ? new List<string>() : new List<string> { json };
            }
        }
    }
}
