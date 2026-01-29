using api.Data.Models;
using api.DTOs.Application;
using api.Factories;
using api.Helper;
using api.Interfaces;
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

        public ApplicationService(AppDbContext db, IApplicationSecretProtector protector)
        {
            _db = db;
            _protector = protector;
        }

        public async Task<IEnumerable<ApplicationDto>> GetAll(Guid userId, CancellationToken ct)
        {
            var accessibleIds = await ApplicationAccessHelper.GetAccessibleApplicationIdsAsync(_db, userId, ct);

            return await _db.Application
                .AsNoTracking()
                .Where(a => accessibleIds.Contains(a.Id))
                .OrderBy(a => a.Name)
                .Select(a => new ApplicationDto()
                {
                    Id = a.Id,
                    Name = a.Name,
                    Url = a.Url,
                    IsActive = a.IsActive,
                    Description = a.Description
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

            return new ApplicationDto()
            {
                Id = a.Id,
                Name = a.Name,
                Description = a.Description,
                IsActive = a.IsActive,
                Url = a.Url
            };
        }

        public async Task<CreateApplicationResultDto> Create(ApplicationDto dto, Guid userId, CancellationToken ct)
        {
            var name = (dto.Name ?? string.Empty).Trim();
            if (name.Length < 2)
                throw new ApiException(StatusCodes.Status400BadRequest, Shared.Keys.Errors.ApplicationNameTooShort);

            var exists = await _db.Application.AsNoTracking().AnyAsync(x => x.Name == name, ct);
            if (exists)
                throw new ApiException(StatusCodes.Status409Conflict, Shared.Keys.Errors.ApplicationNameExists);

            var app = new Application
            {
                Id = Guid.NewGuid(),
                RefOwner = userId,
                Name = name,
                Url = dto.Url,
                IsActive = dto.IsActive ?? true,
                Description = dto.Description,
                CreatedAt = DateTime.UtcNow
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

            await tx.CommitAsync(ct);

            return new CreateApplicationResultDto
            {
                Application = new ApplicationDto
                {
                    Id = app.Id,
                    Name = app.Name,
                    Url = app.Url,
                    IsActive = app.IsActive,
                    Description = app.Description
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
                throw new ApiException(StatusCodes.Status403Forbidden, Shared.Keys.Errors.Forbidden);

            var entity = await _db.Application.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return null;

            if (dto.Name is not null)
            {
                var name = dto.Name.Trim();
                if (name.Length < 2)
                    throw new ApiException(StatusCodes.Status400BadRequest, Shared.Keys.Errors.ApplicationNameTooShort);

                entity.Name = name;
            }

            if (dto.Url is not null) entity.Url = dto.Url;
            if (dto.Description is not null) entity.Description = dto.Description;
            if (dto.IsActive.HasValue) entity.IsActive = dto.IsActive.Value;

            await _db.SaveChangesAsync(ct);

            return new ApplicationDto()
            {
                Id = entity.Id,
                Name = entity.Name,
                Description = entity.Description,
                IsActive = entity.IsActive,
                Url = entity.Url
            };
        }

        public async Task<bool> Delete(Guid id, Guid userId, CancellationToken ct)
        {
            if (!await ApplicationAccessHelper.IsApplicationOwnerAsync(_db, userId, id, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, Shared.Keys.Errors.Forbidden);

            var entity = await _db.Application.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return false;

            _db.Application.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<IEnumerable<ApplicationSecretDto>> GetVersions(Guid applicationId, Guid userId, CancellationToken ct)
        {
            if (!await ApplicationAccessHelper.CanAccessApplicationAsync(_db, userId, applicationId, ct))
                throw new ApiException(StatusCodes.Status403Forbidden, Shared.Keys.Errors.Forbidden);

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
                throw new ApiException(StatusCodes.Status403Forbidden, Shared.Keys.Errors.Forbidden);

            var app = await _db.Application.FirstOrDefaultAsync(x => x.Id == applicationId, ct);
            if (app is null) throw new ApiException(StatusCodes.Status404NotFound, Shared.Keys.Errors.ApplicationNotFound);

            var maxVersion = await _db.ApplicationSecret
                .AsNoTracking()
                .Where(x => x.RefApplication == applicationId)
                .Select(x => (int?)x.Version)
                .MaxAsync(ct) ?? 0;

            var next = maxVersion + 1;

            var (secretBase64, secretEnc) = ApplicationSecretFactory.CreateProtectedSecret(_protector, next);

            secretBase64 = secretBase64.Trim();
            if (!Convert.TryFromBase64String(secretBase64, new Span<byte>(new byte[secretBase64.Length]), out _))
                throw new ApiException(StatusCodes.Status500InternalServerError, Shared.Keys.Errors.SecretInvalid);

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
                throw new ApiException(StatusCodes.Status403Forbidden, Shared.Keys.Errors.Forbidden);

            var row = await _db.ApplicationSecret
                .FirstOrDefaultAsync(x => x.RefApplication == applicationId && x.Version == version, ct);

            if (row is null) return false;

            row.IsActive = isActive;

            await _db.SaveChangesAsync(ct);
            return true;
        }
    }
}
