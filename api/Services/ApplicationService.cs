using api.Data.Models;
using api.DTOs.Application;
using api.Factories;
using api.Helper;
using api.Interfaces;
using api.Provider.Interface;
using Data;
using Microsoft.EntityFrameworkCore;

using api.Exceptions;
using Microsoft.AspNetCore.Http;
namespace api.Services
{
    public sealed class ApplicationService : IApplication
    {
        private readonly AppDbContext _db;
        private readonly IApplicationSecretProtector _protector;
        private readonly IApplicationEncryptionKeyProvider _encryptionKeyProvider;
        private readonly IAuth _auth;
        private readonly IMailSender _mailSender;
        private readonly IConfiguration _config;

        public ApplicationService(
            AppDbContext db,
            IApplicationSecretProtector protector,
            IApplicationEncryptionKeyProvider encryptionKeyProvider,
            IAuth auth,
            IMailSender mailSender,
            IConfiguration config)
        {
            _db = db;
            _protector = protector;
            _encryptionKeyProvider = encryptionKeyProvider;
            _auth = auth;
            _mailSender = mailSender;
            _config = config;
        }

        public async Task<IEnumerable<ApplicationDto>> GetAll(Guid userId, CancellationToken ct)
        {
            // Personal apps only: user is a member AND app has no org
            var accessibleIds = await ApplicationAccessHelper.GetAccessibleApplicationIdsAsync(_db, userId, ct);

            return await _db.Application
                .AsNoTracking()
                .Where(a => accessibleIds.Contains(a.Id) && a.RefOrganization == null)
                .OrderBy(a => a.Name)
                .Select(a => new ApplicationDto()
                {
                    Id = a.Id,
                    Name = a.Name,
                    Url = a.Url,
                    IsActive = a.IsActive,
                    Description = a.Description,
                    LogRetentionValue = a.LogRetentionValue,
                    LogRetentionUnit = a.LogRetentionUnit
                })
                .ToListAsync(ct);
        }

        public async Task<ApplicationDto?> GetById(Guid id, Guid userId, CancellationToken ct)
        {
            if (!await ApplicationAccessHelper.CanAccessApplicationAsync(_db, userId, id, ct))
                return null;

            var a = await _db.Application
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            if (a is null) return null;

            var roleName = await ApplicationAccessHelper.GetUserRoleNameAsync(_db, userId, id, ct);

            return new ApplicationDto()
            {
                Id = a.Id,
                Name = a.Name,
                Description = a.Description,
                IsActive = a.IsActive,
                Url = a.Url,
                LogRetentionValue = a.LogRetentionValue,
                LogRetentionUnit = a.LogRetentionUnit,
                RefOrganization = a.RefOrganization,
                MyRole = roleName
            };
        }

        public async Task<CreateApplicationResultDto> Create(ApplicationDto dto, Guid userId, CancellationToken ct)
        {
            var name = (dto.Name ?? string.Empty).Trim();
            if (name.Length < 2)
                throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.ApplicationNameTooShort);

            var exists = await _db.Application.AsNoTracking().AnyAsync(x => x.Name == name, ct);
            if (exists)
                throw new ApiException(StatusCodes.Status409Conflict, ErrorKeys.ApplicationNameExists);

            var app = new Application
            {
                Id = Guid.NewGuid(),
                RefOwner = userId,
                Name = name,
                Url = dto.Url,
                IsActive = dto.IsActive ?? true,
                Description = dto.Description,
                CreatedAt = DateTime.UtcNow,
                LogRetentionValue = dto.LogRetentionValue ?? 7,
                LogRetentionUnit = dto.LogRetentionUnit ?? "days"
            };

            var member = new ApplicationMember
            {
                Id = Guid.NewGuid(),
                RefApplication = app.Id,
                RefUser = userId,
                RefRoleApplication = RoleApplication.Ids.Owner,
                CreatedAt = DateTime.UtcNow
            };

            const int version = 1;
            var (secretBase64, secretEnc) = ApplicationSecretFactory.CreateProtectedSecret(_protector, version);

            var secret = new ApplicationSecret
            {
                Id = Guid.NewGuid(),
                RefApplication = app.Id,
                Version = version,
                SecretEnc = secretEnc,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            await _db.Application.AddAsync(app, ct);
            await _db.ApplicationMember.AddAsync(member, ct);
            await _db.ApplicationSecret.AddAsync(secret, ct);
            await _db.SaveChangesAsync(ct);

            await _encryptionKeyProvider.CreateKeyAsync(app.Id, ct);

            await tx.CommitAsync(ct);

            return new CreateApplicationResultDto
            {
                Application = new ApplicationDto
                {
                    Id = app.Id,
                    Name = app.Name,
                    Url = app.Url,
                    IsActive = app.IsActive,
                    Description = app.Description,
                    LogRetentionValue = app.LogRetentionValue,
                    LogRetentionUnit = app.LogRetentionUnit
                },
                SecretBase64 = secretBase64,
                Version = new ApplicationSecretDto
                {
                    Id = secret.Id,
                    ApplicationId = secret.RefApplication,
                    Version = secret.Version,
                    IsActive = secret.IsActive,
                    CreatedAt = secret.CreatedAt
                }
            };
        }

        public async Task<ApplicationDto?> Update(Guid id, ApplicationDto dto, Guid userId, CancellationToken ct)
        {
            if (!await ApplicationAccessHelper.CanMaintainApplicationAsync(_db, userId, id, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.Forbidden);

            var entity = await _db.Application.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return null;

            if (dto.Name is not null)
            {
                var name = dto.Name.Trim();
                if (name.Length < 2)
                    throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.ApplicationNameTooShort);

                entity.Name = name;
            }

            if (dto.Url is not null) entity.Url = dto.Url;
            if (dto.Description is not null) entity.Description = dto.Description;
            if (dto.IsActive.HasValue) entity.IsActive = dto.IsActive.Value;
            if (dto.LogRetentionValue.HasValue) entity.LogRetentionValue = dto.LogRetentionValue.Value;
            if (dto.LogRetentionUnit is not null)
            {
                var validUnits = new[] { "days", "weeks", "months", "years" };
                if (!validUnits.Contains(dto.LogRetentionUnit))
                    throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.InvalidRetentionUnit);
                entity.LogRetentionUnit = dto.LogRetentionUnit;
            }

            await _db.SaveChangesAsync(ct);

            return new ApplicationDto()
            {
                Id = entity.Id,
                Name = entity.Name,
                Description = entity.Description,
                IsActive = entity.IsActive,
                Url = entity.Url,
                LogRetentionValue = entity.LogRetentionValue,
                LogRetentionUnit = entity.LogRetentionUnit
            };
        }

        public async Task<bool> Delete(Guid id, Guid userId, CancellationToken ct)
        {
            if (!await ApplicationAccessHelper.IsApplicationOwnerAsync(_db, userId, id, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.Forbidden);

            var entity = await _db.Application.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return false;

            _db.Application.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<IEnumerable<ApplicationSecretDto>> GetVersions(Guid applicationId, Guid userId, CancellationToken ct)
        {
            if (!await ApplicationAccessHelper.CanAccessApplicationAsync(_db, userId, applicationId, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.Forbidden);

            return await _db.ApplicationSecret
                .AsNoTracking()
                .Where(x => x.RefApplication == applicationId)
                .OrderByDescending(x => x.Version)
                .Select(x => new ApplicationSecretDto
                {
                    Id = x.Id,
                    ApplicationId = x.RefApplication,
                    Version = x.Version,
                    IsActive = x.IsActive,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync(ct);
        }

        public async Task<(ApplicationSecretDto version, string secretBase64)> CreateVersion(Guid applicationId, Guid userId, CancellationToken ct)
        {
            if (!await ApplicationAccessHelper.CanMaintainApplicationAsync(_db, userId, applicationId, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.Forbidden);

            var app = await _db.Application.FirstOrDefaultAsync(x => x.Id == applicationId, ct);
            if (app is null) throw new ApiException(StatusCodes.Status404NotFound, ErrorKeys.ApplicationNotFound);

            var maxVersion = await _db.ApplicationSecret
                .AsNoTracking()
                .Where(x => x.RefApplication == applicationId)
                .Select(x => (int?)x.Version)
                .MaxAsync(ct) ?? 0;

            var next = maxVersion + 1;

            var (secretBase64, secretEnc) = ApplicationSecretFactory.CreateProtectedSecret(_protector, next);

            secretBase64 = secretBase64.Trim();
            if (!Convert.TryFromBase64String(secretBase64, new Span<byte>(new byte[secretBase64.Length]), out _))
                throw new ApiException(StatusCodes.Status500InternalServerError, ErrorKeys.SecretInvalid);

            var secret = new ApplicationSecret
            {
                Id = Guid.NewGuid(),
                RefApplication = applicationId,
                Version = next,
                SecretEnc = secretEnc,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _db.ApplicationSecret.AddAsync(secret, ct);

            await _db.SaveChangesAsync(ct);

            return (
                new ApplicationSecretDto
                {
                    Id = secret.Id,
                    ApplicationId = secret.RefApplication,
                    Version = secret.Version,
                    IsActive = secret.IsActive,
                    CreatedAt = secret.CreatedAt
                },
                secretBase64
            );
        }

        public async Task<bool> SetVersionActive(Guid applicationId, int version, bool isActive, Guid userId, CancellationToken ct)
        {
            if (!await ApplicationAccessHelper.CanMaintainApplicationAsync(_db, userId, applicationId, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.Forbidden);

            var row = await _db.ApplicationSecret
                .FirstOrDefaultAsync(x => x.RefApplication == applicationId && x.Version == version, ct);

            if (row is null) return false;

            row.IsActive = isActive;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        // ── Member management ───────────────────────────────────────────

        private static readonly HashSet<Guid> ValidRoleIds = new()
        {
            RoleApplication.Ids.Owner,
            RoleApplication.Ids.Maintainer,
            RoleApplication.Ids.Viewer
        };

        public async Task<IEnumerable<ApplicationMemberDto>> GetMembers(Guid applicationId, Guid userId, CancellationToken ct)
        {
            if (!await ApplicationAccessHelper.CanAccessApplicationAsync(_db, userId, applicationId, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.Forbidden);

            var members = await _db.ApplicationMember
                .AsNoTracking()
                .Include(m => m.User)
                .Include(m => m.RoleApplication)
                .Where(m => m.RefApplication == applicationId)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync(ct);

            return members.Select(m => new ApplicationMemberDto
            {
                MemberId = m.Id,
                UserId = m.RefUser,
                Email = _auth.DecryptEmail(m.User!.Email),
                Name = _auth.DecryptName(m.User.Name),
                LastName = _auth.DecryptLastName(m.User.LastName),
                Role = m.RoleApplication is null ? null : new RoleDto
                {
                    Id = m.RoleApplication.Id,
                    Name = m.RoleApplication.Name,
                    Description = m.RoleApplication.Description
                },
                CreatedAt = m.CreatedAt
            });
        }

        public async Task<IEnumerable<PendingInvitationDto>> GetPendingInvitations(Guid applicationId, Guid userId, CancellationToken ct)
        {
            if (!await ApplicationAccessHelper.CanMaintainApplicationAsync(_db, userId, applicationId, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.Forbidden);

            var invitations = await _db.ApplicationInvitation
                .AsNoTracking()
                .Include(i => i.RoleApplication)
                .Where(i => i.RefApplication == applicationId)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync(ct);

            return invitations.Select(i => new PendingInvitationDto
            {
                Id = i.Id,
                Email = _auth.DecryptEmail(i.Email),
                Role = i.RoleApplication is null ? null : new RoleDto
                {
                    Id = i.RoleApplication.Id,
                    Name = i.RoleApplication.Name,
                    Description = i.RoleApplication.Description
                },
                CreatedAt = i.CreatedAt
            });
        }

        public async Task<InviteMemberResultDto> InviteMember(Guid applicationId, InviteMemberRequest request, Guid userId, CancellationToken ct)
        {
            if (!await ApplicationAccessHelper.CanMaintainApplicationAsync(_db, userId, applicationId, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.Forbidden);

            if (!ValidRoleIds.Contains(request.RefRoleApplication))
                throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.InvalidRole);

            var app = await _db.Application.AsNoTracking().FirstOrDefaultAsync(x => x.Id == applicationId, ct);
            if (app is null)
                throw new ApiException(StatusCodes.Status404NotFound, ErrorKeys.ApplicationNotFound);

            string plainEmail = (request.Email ?? "").Trim().ToLowerInvariant();
            string encryptedEmail = _auth.EncryptEmail(plainEmail);

            // Check if user exists
            var found = await _auth.FindUserByEmail(plainEmail, ct);

            if (found.HasValue)
            {
                var targetUserId = found.Value.userId;

                // Check if already a member
                bool alreadyMember = await _db.ApplicationMember
                    .AnyAsync(m => m.RefApplication == applicationId && m.RefUser == targetUserId, ct);
                if (alreadyMember)
                    throw new ApiException(StatusCodes.Status409Conflict, ErrorKeys.MemberAlreadyExists);

                // Add as member
                _db.ApplicationMember.Add(new ApplicationMember
                {
                    Id = Guid.NewGuid(),
                    RefApplication = applicationId,
                    RefUser = targetUserId,
                    RefRoleApplication = request.RefRoleApplication,
                    CreatedAt = DateTime.UtcNow
                });

                // Remove any pending invitation for this email
                var existingInv = await _db.ApplicationInvitation
                    .FirstOrDefaultAsync(i => i.RefApplication == applicationId && i.Email == encryptedEmail, ct);
                if (existingInv is not null)
                    _db.ApplicationInvitation.Remove(existingInv);

                await _db.SaveChangesAsync(ct);

                // Send notification email
                var roleName = RoleApplication.All.FirstOrDefault(r => r.Id == request.RefRoleApplication)?.Name ?? "Member";
                await SendMemberAddedEmail(plainEmail, app.Name ?? "Unknown", roleName, ct);

                return new InviteMemberResultDto { MemberAdded = true, InvitationSent = false };
            }
            else
            {
                // User doesn't exist — create invitation
                bool invExists = await _db.ApplicationInvitation
                    .AnyAsync(i => i.RefApplication == applicationId && i.Email == encryptedEmail, ct);
                if (invExists)
                    throw new ApiException(StatusCodes.Status409Conflict, ErrorKeys.InvitationAlreadyPending);

                _db.ApplicationInvitation.Add(new ApplicationInvitation
                {
                    Id = Guid.NewGuid(),
                    RefApplication = applicationId,
                    Email = encryptedEmail,
                    RefRoleApplication = request.RefRoleApplication,
                    InvitedBy = userId,
                    CreatedAt = DateTime.UtcNow
                });
                await _db.SaveChangesAsync(ct);

                // Send invitation email
                var roleName = RoleApplication.All.FirstOrDefault(r => r.Id == request.RefRoleApplication)?.Name ?? "Member";
                await SendInvitationEmail(plainEmail, app.Name ?? "Unknown", roleName, ct);

                return new InviteMemberResultDto { MemberAdded = false, InvitationSent = true };
            }
        }

        public async Task UpdateMemberRole(Guid applicationId, Guid memberId, UpdateMemberRoleRequest request, Guid userId, CancellationToken ct)
        {
            if (!await ApplicationAccessHelper.IsApplicationOwnerAsync(_db, userId, applicationId, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.Forbidden);

            if (!ValidRoleIds.Contains(request.RefRoleApplication))
                throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.InvalidRole);

            var member = await _db.ApplicationMember
                .FirstOrDefaultAsync(m => m.Id == memberId && m.RefApplication == applicationId, ct);
            if (member is null)
                throw new ApiException(StatusCodes.Status404NotFound, ErrorKeys.NotFound);

            // If changing from Owner, ensure there's at least one other owner
            if (member.RefRoleApplication == RoleApplication.Ids.Owner && request.RefRoleApplication != RoleApplication.Ids.Owner)
            {
                int ownerCount = await _db.ApplicationMember
                    .CountAsync(m => m.RefApplication == applicationId && m.RefRoleApplication == RoleApplication.Ids.Owner, ct);
                if (ownerCount <= 1)
                    throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.CannotRemoveLastOwner);
            }

            member.RefRoleApplication = request.RefRoleApplication;
            await _db.SaveChangesAsync(ct);
        }

        public async Task RemoveMember(Guid applicationId, Guid memberId, Guid userId, CancellationToken ct)
        {
            if (!await ApplicationAccessHelper.IsApplicationOwnerAsync(_db, userId, applicationId, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.Forbidden);

            var member = await _db.ApplicationMember
                .FirstOrDefaultAsync(m => m.Id == memberId && m.RefApplication == applicationId, ct);
            if (member is null)
                throw new ApiException(StatusCodes.Status404NotFound, ErrorKeys.NotFound);

            // Cannot remove the last owner
            if (member.RefRoleApplication == RoleApplication.Ids.Owner)
            {
                int ownerCount = await _db.ApplicationMember
                    .CountAsync(m => m.RefApplication == applicationId && m.RefRoleApplication == RoleApplication.Ids.Owner, ct);
                if (ownerCount <= 1)
                    throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.CannotRemoveLastOwner);
            }

            _db.ApplicationMember.Remove(member);
            await _db.SaveChangesAsync(ct);
        }

        public async Task CancelInvitation(Guid applicationId, Guid invitationId, Guid userId, CancellationToken ct)
        {
            if (!await ApplicationAccessHelper.CanMaintainApplicationAsync(_db, userId, applicationId, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.Forbidden);

            var inv = await _db.ApplicationInvitation
                .FirstOrDefaultAsync(i => i.Id == invitationId && i.RefApplication == applicationId, ct);
            if (inv is null)
                throw new ApiException(StatusCodes.Status404NotFound, ErrorKeys.NotFound);

            _db.ApplicationInvitation.Remove(inv);
            await _db.SaveChangesAsync(ct);
        }

        public async Task<CheckEmailResultDto> CheckEmail(Guid applicationId, string email, Guid userId, CancellationToken ct)
        {
            if (!await ApplicationAccessHelper.CanMaintainApplicationAsync(_db, userId, applicationId, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.Forbidden);

            var found = await _auth.FindUserByEmail(email, ct);
            if (!found.HasValue)
                return new CheckEmailResultDto { Exists = false };

            return new CheckEmailResultDto
            {
                Exists = true,
                Name = found.Value.name,
                LastName = found.Value.lastName
            };
        }

        public async Task<IEnumerable<RoleDto>> GetRoles(CancellationToken ct)
        {
            return await _db.RoleApplication
                .AsNoTracking()
                .OrderBy(r => r.Name)
                .Select(r => new RoleDto
                {
                    Id = r.Id,
                    Name = r.Name,
                    Description = r.Description
                })
                .ToListAsync(ct);
        }

        private async Task SendMemberAddedEmail(string plainEmail, string appName, string roleName, CancellationToken ct)
        {
            string fromAddress = _config["SmtpSettings:FromAddress"] ?? "noreply@omnia-monitoring.com";
            string frontendUrl = _config["AppSettings:FrontendUrl"] ?? "https://localhost:5173";

            string body = $@"
<html>
<body style=""font-family: sans-serif; padding: 24px;"">
  <h2>You've been added to {appName}</h2>
  <p>You have been added as <strong>{roleName}</strong> on the application <strong>{appName}</strong> in Omnia.</p>
  <p><a href=""{frontendUrl}/applications"" style=""display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;"">Go to Omnia</a></p>
</body>
</html>";

            try
            {
                await _mailSender.SendAsync(fromAddress, new[] { plainEmail }, null, null,
                    $"You've been added to {appName}", body, true, ct);
            }
            catch { /* don't fail the invite if email fails */ }
        }

        private async Task SendInvitationEmail(string plainEmail, string appName, string roleName, CancellationToken ct)
        {
            string fromAddress = _config["SmtpSettings:FromAddress"] ?? "noreply@omnia-monitoring.com";
            string frontendUrl = _config["AppSettings:FrontendUrl"] ?? "https://localhost:5173";

            string body = $@"
<html>
<body style=""font-family: sans-serif; padding: 24px;"">
  <h2>You've been invited to {appName}</h2>
  <p>You have been invited as <strong>{roleName}</strong> on the application <strong>{appName}</strong> in Omnia.</p>
  <p>Create your account to get started:</p>
  <p><a href=""{frontendUrl}/signup"" style=""display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;"">Create my account</a></p>
</body>
</html>";

            try
            {
                await _mailSender.SendAsync(fromAddress, new[] { plainEmail }, null, null,
                    $"Invitation to join {appName} on Omnia", body, true, ct);
            }
            catch { /* don't fail the invite if email fails */ }
        }
    }
}
