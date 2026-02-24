using api.Data.Models;
using api.DTOs.Auth;
using api.Helpers;
using api.Interfaces;
using Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

using api.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Localization;
namespace api.Services;

public class AuthService : IAuth
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _config;
    private readonly IMail _mail;
    private readonly IStringLocalizer<Shared> _t;

    public AuthService(AppDbContext context, IConfiguration config, IMail mail, IStringLocalizer<Shared> t)
    {
        _context = context;
        _config = config;
        _mail = mail;
        _t = t;
    }

    private static string NormalizeEmail(string email)
        => (email ?? string.Empty).Trim().ToLowerInvariant();

    private static byte[] DeriveAesKeyBytes(string rawKey)
        => SHA256.HashData(Encoding.UTF8.GetBytes((rawKey ?? string.Empty).Trim()));

    private static string EncryptDeterministic(string rawKey, string plainText)
    {
        byte[] iv = new byte[16];
        byte[] keyBytes = DeriveAesKeyBytes(rawKey);

        using var aes = Aes.Create();
        aes.Key = keyBytes;
        aes.IV = iv;

        using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
        using var ms = new MemoryStream();
        using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
        using (var sw = new StreamWriter(cs, Encoding.UTF8))
        {
            sw.Write(plainText);
        }

        return Convert.ToBase64String(ms.ToArray());
    }

    private static string? DecryptDeterministic(string rawKey, string cipherTextBase64)
    {
        if (string.IsNullOrWhiteSpace(cipherTextBase64)) return null;

        byte[] iv = new byte[16];
        byte[] keyBytes = DeriveAesKeyBytes(rawKey);
        byte[] cipherBytes;

        try
        {
            cipherBytes = Convert.FromBase64String(cipherTextBase64);
        }
        catch
        {
            return null;
        }

        using var aes = Aes.Create();
        aes.Key = keyBytes;
        aes.IV = iv;

        using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
        using var ms = new MemoryStream(cipherBytes);
        using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
        using var sr = new StreamReader(cs, Encoding.UTF8);
        return sr.ReadToEnd();
    }

    private string GetPepper()
        => _config["Security:Pepper"] ?? throw new InvalidOperationException("Security:Pepper manquant");

    private string GetEmailKey()
        => _config["Security:EmailKey"] ?? throw new InvalidOperationException("Security:EmailKey manquant");

    private string GetNameKey()
        => _config["Security:NameKey"] ?? throw new InvalidOperationException("Security:NameKey manquant");

    private string GetLastNameKey()
        => _config["Security:LastNameKey"] ?? throw new InvalidOperationException("Security:LastNameKey manquant");

    private IConfigurationSection JwtCfg()
        => _config.GetSection("JwtSettings");

    public int GetAccessTokenMinutes()
        => int.Parse(JwtCfg()["timeValidityAccessToken"] ?? "10");

    public int GetRefreshTokenDays()
    {
        var v = JwtCfg()["timeValidityRefreshToken"];
        if (string.IsNullOrWhiteSpace(v)) return 30;
        return int.TryParse(v, out var days) ? days : 30;
    }

    public async Task<LoginResponse> Login(LoginRequest request, CancellationToken ct)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            throw new ApiException(StatusCodes.Status401Unauthorized, ErrorKeys.InvalidCredentials);

        string pepper = GetPepper();
        string emailKey = GetEmailKey();

        string normalizedEmail = NormalizeEmail(request.Email);
        string encryptedEmail = EncryptDeterministic(emailKey, normalizedEmail);

        User? user = await _context.User.FirstOrDefaultAsync(u => u.Email == encryptedEmail, ct);
        if (user == null || string.IsNullOrWhiteSpace(user.Password) || string.IsNullOrWhiteSpace(user.Salt))
            throw new ApiException(StatusCodes.Status401Unauthorized, ErrorKeys.InvalidCredentials);

        string computedHash = AuthHelper.HashPassword(request.Password, user.Salt, pepper);
        if (!AuthHelper.VerifyPassword(user.Password, computedHash))
            throw new ApiException(StatusCodes.Status401Unauthorized, ErrorKeys.InvalidCredentials);

        if (!user.EmailConfirmed)
            throw new ApiException(StatusCodes.Status401Unauthorized, ErrorKeys.EmailNotConfirmed);

        string accessToken = GenerateToken(user.Id);
        string refreshToken = GenerateRefreshToken(user.Id);

        return new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken
        };
    }

    public async Task<CreateUserResponse> Register(CreateUserRequest request, CancellationToken ct)
    {
        bool isBeta = string.Equals(_config["AppSettings:IsBeta"], "true", StringComparison.OrdinalIgnoreCase);
        if (isBeta)
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.BetaRegistrationDisabled);

        if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.EmailPasswordRequired);

        if (request.Password.Length < 6)
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.PasswordTooShort);

        if (!request.TermsAccepted)
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.TermsNotAccepted);

        string pepper = GetPepper();
        string emailKey = GetEmailKey();
        string nameKey = GetNameKey();
        string lastNameKey = GetLastNameKey();

        string normalizedEmail = NormalizeEmail(request.Email);
        string encryptedEmail = EncryptDeterministic(emailKey, normalizedEmail);

        bool exists = await _context.User.AnyAsync(u => u.Email == encryptedEmail, ct);
        if (exists)
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.EmailAlreadyUsed);

        string salt = AuthHelper.GenerateSalt();
        string passwordHash = AuthHelper.HashPassword(request.Password, salt, pepper);
        string confirmationToken = Guid.NewGuid().ToString();

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = encryptedEmail,
            Name = string.IsNullOrWhiteSpace(request.Name) ? null : EncryptDeterministic(nameKey, request.Name.Trim()),
            LastName = string.IsNullOrWhiteSpace(request.LastName) ? null : EncryptDeterministic(lastNameKey, request.LastName.Trim()),
            Password = passwordHash,
            Salt = salt,
            EmailConfirmed = false,
            EmailConfirmationToken = confirmationToken,
            TermsAcceptedAt = DateTime.UtcNow,
            TermsVersion = TermsKeys.CurrentVersion
        };

        _context.User.Add(user);
        await _context.SaveChangesAsync(ct);

        // Process pending invitations for this email
        var pendingInvitations = await _context.ApplicationInvitation
            .Where(i => i.Email == encryptedEmail)
            .ToListAsync(ct);

        foreach (var inv in pendingInvitations)
        {
            var alreadyMember = await _context.ApplicationMember
                .AnyAsync(m => m.RefApplication == inv.RefApplication && m.RefUser == user.Id, ct);

            if (!alreadyMember)
            {
                _context.ApplicationMember.Add(new ApplicationMember
                {
                    Id = Guid.NewGuid(),
                    RefApplication = inv.RefApplication,
                    RefUser = user.Id,
                    RefRoleApplication = inv.RefRoleApplication,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        if (pendingInvitations.Count > 0)
        {
            _context.ApplicationInvitation.RemoveRange(pendingInvitations);
            await _context.SaveChangesAsync(ct);
        }

        await SendConfirmationEmail(normalizedEmail, confirmationToken, ct);

        return new CreateUserResponse
        {
            Id = user.Id,
            Email = normalizedEmail
        };
    }

    public string GenerateToken(Guid userId)
    {
        IConfigurationSection jwtConfig = JwtCfg();
        string keyJwt = jwtConfig["Key"] ?? throw new ApplicationException("JWT key missing");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyJwt));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512);

        var claims = new List<Claim>
    {
        new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
        new Claim(ClaimTypes.NameIdentifier, userId.ToString())
    };

        var token = new JwtSecurityToken(
            issuer: jwtConfig["Issuer"],
            audience: jwtConfig["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(GetAccessTokenMinutes()),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }


    public string GenerateRefreshToken(Guid userId)
    {
        IConfigurationSection jwtConfig = JwtCfg();
        string keyJwt = jwtConfig["Key"] ?? throw new ApplicationException("JWT key missing");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyJwt));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512);

        var claims = new List<Claim>
        {
            new Claim("userId", userId.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: jwtConfig["Issuer"],
            audience: jwtConfig["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(GetRefreshTokenDays()),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<TokenResponseDto?> RefreshAccessToken(string refreshToken, CancellationToken ct)
    {
        IConfigurationSection jwtConfig = JwtCfg();
        var tokenHandler = new JwtSecurityTokenHandler();

        string keyJwt = jwtConfig["Key"] ?? throw new ApplicationException("JWT key missing");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyJwt));

        try
        {
            var principal = tokenHandler.ValidateToken(
                refreshToken,
                new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = key,
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidIssuer = jwtConfig["Issuer"],
                    ValidAudience = jwtConfig["Audience"],
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                },
                out var validatedToken
            );

            if (validatedToken is not JwtSecurityToken jwt)
                return null;

            var tokenUserIdStr = jwt.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            if (!Guid.TryParse(tokenUserIdStr, out var userId))
                return null;

            var user = await _context.User.AsNoTracking()
                .Where(x => x.Id == userId)
                .Select(x => new { x.Id, x.PasswordChangedAt })
                .FirstOrDefaultAsync(ct);
            if (user is null) return null;

            if (user.PasswordChangedAt is not null && jwt.IssuedAt < user.PasswordChangedAt)
                return null;

            string newAccessToken = GenerateToken(userId);
            string newRefreshToken = GenerateRefreshToken(userId);

            return new TokenResponseDto
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken
            };
        }
        catch
        {
            return null;
        }
    }

    public Task RevokeRefreshToken(string refreshToken, CancellationToken ct)
    {
        return Task.CompletedTask;
    }

    public async Task<string?> GetEmail(Guid userId, CancellationToken ct)
    {
        var user = await _context.User.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, ct);
        if (user is null) return null;

        var emailKey = GetEmailKey();
        return DecryptDeterministic(emailKey, user.Email);
    }

    public async Task<string?> GetName(Guid userId, CancellationToken ct)
    {
        var user = await _context.User.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, ct);
        if (user is null || string.IsNullOrWhiteSpace(user.Name)) return null;

        var nameKey = GetNameKey();
        return DecryptDeterministic(nameKey, user.Name);
    }

    public async Task<string?> GetLastName(Guid userId, CancellationToken ct)
    {
        var user = await _context.User.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, ct);
        if (user is null || string.IsNullOrWhiteSpace(user.LastName)) return null;

        var lastNameKey = GetLastNameKey();
        return DecryptDeterministic(lastNameKey, user.LastName);
    }

    public async Task<MeResponseDto?> GetMe(Guid userId, CancellationToken ct)
    {
        var user = await _context.User.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, ct);
        if (user is null) return null;

        var emailKey = GetEmailKey();
        var nameKey = GetNameKey();
        var lastNameKey = GetLastNameKey();

        return new MeResponseDto
        {
            Email = DecryptDeterministic(emailKey, user.Email) ?? string.Empty,
            Name = string.IsNullOrWhiteSpace(user.Name) ? null : DecryptDeterministic(nameKey, user.Name),
            LastName = string.IsNullOrWhiteSpace(user.LastName) ? null : DecryptDeterministic(lastNameKey, user.LastName)
        };
    }

    public async Task ChangePassword(Guid userId, string currentPassword, string newPassword, CancellationToken ct)
    {
        var user = await _context.User.FirstOrDefaultAsync(x => x.Id == userId, ct);
        if (user is null) throw new ApiException(StatusCodes.Status401Unauthorized, ErrorKeys.UserNotFound);

        var pepper = GetPepper();

        var computedHash = AuthHelper.HashPassword(currentPassword, user.Salt, pepper);
        if (!AuthHelper.VerifyPassword(user.Password, computedHash))
            throw new ApiException(StatusCodes.Status401Unauthorized, ErrorKeys.CurrentPasswordInvalid);

        var newSalt = AuthHelper.GenerateSalt();
        var newHash = AuthHelper.HashPassword(newPassword, newSalt, pepper);

        var token = Guid.NewGuid().ToString();
        user.PendingPassword = newHash;
        user.PendingSalt = newSalt;
        user.PasswordChangeToken = token;
        user.PasswordChangeTokenExpiresAt = DateTime.UtcNow.AddMinutes(10);

        await _context.SaveChangesAsync(ct);

        var emailKey = GetEmailKey();
        var plainEmail = DecryptDeterministic(emailKey, user.Email);
        if (!string.IsNullOrWhiteSpace(plainEmail))
            await SendPasswordChangeConfirmationEmail(plainEmail, token, ct);
    }

    public async Task ConfirmPasswordChange(string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.InvalidPasswordChangeToken);

        var user = await _context.User.FirstOrDefaultAsync(
            u => u.PasswordChangeToken == token, ct);

        if (user is null
            || user.PasswordChangeTokenExpiresAt is null
            || user.PasswordChangeTokenExpiresAt < DateTime.UtcNow
            || string.IsNullOrWhiteSpace(user.PendingPassword)
            || string.IsNullOrWhiteSpace(user.PendingSalt))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.InvalidPasswordChangeToken);
        }

        user.Password = user.PendingPassword;
        user.Salt = user.PendingSalt;
        user.PendingPassword = null;
        user.PendingSalt = null;
        user.PasswordChangeToken = null;
        user.PasswordChangeTokenExpiresAt = null;
        user.PasswordChangedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
    }

    public async Task ConfirmEmail(string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.InvalidConfirmationToken);

        var user = await _context.User.FirstOrDefaultAsync(u => u.EmailConfirmationToken == token, ct);
        if (user is null)
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.InvalidConfirmationToken);

        user.EmailConfirmed = true;
        user.EmailConfirmationToken = null;
        await _context.SaveChangesAsync(ct);
    }

    public async Task ResendConfirmation(string email, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(email)) return;

        string emailKey = GetEmailKey();
        string normalizedEmail = NormalizeEmail(email);
        string encryptedEmail = EncryptDeterministic(emailKey, normalizedEmail);

        var user = await _context.User.FirstOrDefaultAsync(u => u.Email == encryptedEmail, ct);
        if (user is null || user.EmailConfirmed) return;

        var newToken = Guid.NewGuid().ToString();
        user.EmailConfirmationToken = newToken;
        await _context.SaveChangesAsync(ct);

        await SendConfirmationEmail(normalizedEmail, newToken, ct);
    }

    private async Task SendConfirmationEmail(string plainEmail, string token, CancellationToken ct)
    {
        string frontendUrl = _config["AppSettings:FrontendUrl"] ?? "https://localhost:5173";
        string fromAddress = _config["SmtpSettings:FromAddress"] ?? "noreply@omnia-monitoring.com";
        string confirmLink = $"{frontendUrl}/confirm-email?token={token}";

        string lang = System.Globalization.CultureInfo.CurrentUICulture.TwoLetterISOLanguageName;
        string subject = _t[EmailKeys.Confirm.Subject].Value;
        string title = _t[EmailKeys.Confirm.Title].Value;
        string body = _t[EmailKeys.Confirm.Body].Value;
        string button = _t[EmailKeys.Confirm.Button].Value;
        string footer = _t[EmailKeys.Confirm.Footer].Value;

        string htmlBody = $@"<!DOCTYPE html>
<html lang=""{lang}"">
<head><meta charset=""UTF-8""></head>
<body style=""margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f4f4f5;color:#18181b;"">
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""padding:40px 20px;"">
    <tr><td align=""center"">
      <table width=""420"" cellpadding=""0"" cellspacing=""0"" style=""background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;padding:32px;"">
        <tr><td>
          <h2 style=""margin:0 0 16px;font-size:20px;font-weight:600;color:#18181b;"">{title}</h2>
          <p style=""margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;"">
            {body}
          </p>
          <table cellpadding=""0"" cellspacing=""0"" style=""margin:0 0 24px;""><tr><td>
            <a href=""{confirmLink}"" style=""display:inline-block;padding:12px 28px;background-color:#6366f1;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;"">{button}</a>
          </td></tr></table>
          <p style=""margin:0;font-size:13px;line-height:1.5;color:#71717a;"">{footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>";

        string plainTextBody = $@"{title}

{body}
{confirmLink}

{footer}";

        await _mail.SendAndLogAsync(
            fromAddress,
            new[] { plainEmail },
            null,
            null,
            subject,
            htmlBody,
            plainTextBody,
            ct);
    }

    public async Task ForgotPassword(string email, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(email)) return;

        string emailKey = GetEmailKey();
        string normalizedEmail = NormalizeEmail(email);
        string encryptedEmail = EncryptDeterministic(emailKey, normalizedEmail);

        var user = await _context.User.FirstOrDefaultAsync(u => u.Email == encryptedEmail, ct);
        if (user is null || !user.EmailConfirmed) return;

        var token = Guid.NewGuid().ToString();
        user.PasswordResetToken = token;
        user.PasswordResetTokenExpiresAt = DateTime.UtcNow.AddHours(1);
        await _context.SaveChangesAsync(ct);

        await SendResetPasswordEmail(normalizedEmail, token, ct);
    }

    public async Task ResetPassword(string token, string newPassword, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.InvalidResetToken);

        var user = await _context.User.FirstOrDefaultAsync(
            u => u.PasswordResetToken == token, ct);

        if (user is null || user.PasswordResetTokenExpiresAt is null || user.PasswordResetTokenExpiresAt < DateTime.UtcNow)
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.InvalidResetToken);

        var pepper = GetPepper();
        var newSalt = AuthHelper.GenerateSalt();
        var newHash = AuthHelper.HashPassword(newPassword, newSalt, pepper);

        user.Salt = newSalt;
        user.Password = newHash;
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiresAt = null;
        user.PasswordChangedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
    }

    private async Task SendResetPasswordEmail(string plainEmail, string token, CancellationToken ct)
    {
        string frontendUrl = _config["AppSettings:FrontendUrl"] ?? "https://localhost:5173";
        string fromAddress = _config["SmtpSettings:FromAddress"] ?? "noreply@omnia-monitoring.com";
        string resetLink = $"{frontendUrl}/reset-password?token={token}";

        string lang = System.Globalization.CultureInfo.CurrentUICulture.TwoLetterISOLanguageName;
        string subject = _t[EmailKeys.Reset.Subject].Value;
        string title = _t[EmailKeys.Reset.Title].Value;
        string body = _t[EmailKeys.Reset.Body].Value;
        string button = _t[EmailKeys.Reset.Button].Value;
        string expires = _t[EmailKeys.Reset.Expires].Value;
        string footer = _t[EmailKeys.Reset.Footer].Value;

        string htmlBody = $@"<!DOCTYPE html>
<html lang=""{lang}"">
<head><meta charset=""UTF-8""></head>
<body style=""margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f4f4f5;color:#18181b;"">
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""padding:40px 20px;"">
    <tr><td align=""center"">
      <table width=""420"" cellpadding=""0"" cellspacing=""0"" style=""background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;padding:32px;"">
        <tr><td>
          <h2 style=""margin:0 0 16px;font-size:20px;font-weight:600;color:#18181b;"">{title}</h2>
          <p style=""margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;"">
            {body}
          </p>
          <table cellpadding=""0"" cellspacing=""0"" style=""margin:0 0 24px;""><tr><td>
            <a href=""{resetLink}"" style=""display:inline-block;padding:12px 28px;background-color:#6366f1;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;"">{button}</a>
          </td></tr></table>
          <p style=""margin:0 0 8px;font-size:13px;line-height:1.5;color:#71717a;"">{expires}</p>
          <p style=""margin:0;font-size:13px;line-height:1.5;color:#71717a;"">{footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>";

        string plainTextBody = $@"{title}

{body}

{resetLink}

{expires}

{footer}";

        await _mail.SendAndLogAsync(
            fromAddress,
            new[] { plainEmail },
            null,
            null,
            subject,
            htmlBody,
            plainTextBody,
            ct);
    }

    private async Task SendPasswordChangeConfirmationEmail(string plainEmail, string token, CancellationToken ct)
    {
        string frontendUrl = _config["AppSettings:FrontendUrl"] ?? "https://localhost:5173";
        string fromAddress = _config["SmtpSettings:FromAddress"] ?? "noreply@omnia-monitoring.com";
        string confirmLink = $"{frontendUrl}/confirm-password-change?token={token}";

        string lang = System.Globalization.CultureInfo.CurrentUICulture.TwoLetterISOLanguageName;
        string subject = _t[EmailKeys.ChangePassword.Subject].Value;
        string title = _t[EmailKeys.ChangePassword.Title].Value;
        string body = _t[EmailKeys.ChangePassword.Body].Value;
        string button = _t[EmailKeys.ChangePassword.Button].Value;
        string expires = _t[EmailKeys.ChangePassword.Expires].Value;
        string footer = _t[EmailKeys.ChangePassword.Footer].Value;

        string htmlBody = $@"<!DOCTYPE html>
<html lang=""{lang}"">
<head><meta charset=""UTF-8""></head>
<body style=""margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f4f4f5;color:#18181b;"">
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""padding:40px 20px;"">
    <tr><td align=""center"">
      <table width=""420"" cellpadding=""0"" cellspacing=""0"" style=""background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;padding:32px;"">
        <tr><td>
          <h2 style=""margin:0 0 16px;font-size:20px;font-weight:600;color:#18181b;"">{title}</h2>
          <p style=""margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;"">
            {body}
          </p>
          <table cellpadding=""0"" cellspacing=""0"" style=""margin:0 0 24px;""><tr><td>
            <a href=""{confirmLink}"" style=""display:inline-block;padding:12px 28px;background-color:#6366f1;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;"">{button}</a>
          </td></tr></table>
          <p style=""margin:0 0 8px;font-size:13px;line-height:1.5;color:#71717a;"">{expires}</p>
          <p style=""margin:0;font-size:13px;line-height:1.5;color:#71717a;"">{footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>";

        string plainTextBody = $@"{title}

{body}

{confirmLink}

{expires}

{footer}";

        await _mail.SendAndLogAsync(
            fromAddress,
            new[] { plainEmail },
            null,
            null,
            subject,
            htmlBody,
            plainTextBody,
            ct);
    }

    public async Task<(Guid userId, string? name, string? lastName)?> FindUserByEmail(string email, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(email)) return null;

        string emailKey = GetEmailKey();
        string normalizedEmail = NormalizeEmail(email);
        string encryptedEmail = EncryptDeterministic(emailKey, normalizedEmail);

        var user = await _context.User.AsNoTracking().FirstOrDefaultAsync(u => u.Email == encryptedEmail, ct);
        if (user is null) return null;

        string nameKey = GetNameKey();
        string lastNameKey = GetLastNameKey();

        string? name = string.IsNullOrWhiteSpace(user.Name) ? null : DecryptDeterministic(nameKey, user.Name);
        string? lastName = string.IsNullOrWhiteSpace(user.LastName) ? null : DecryptDeterministic(lastNameKey, user.LastName);

        return (user.Id, name, lastName);
    }

    public string EncryptEmail(string plainEmail)
    {
        string emailKey = GetEmailKey();
        string normalizedEmail = NormalizeEmail(plainEmail);
        return EncryptDeterministic(emailKey, normalizedEmail);
    }

    public string? DecryptEmail(string encryptedEmail)
        => DecryptDeterministic(GetEmailKey(), encryptedEmail);

    public string? DecryptName(string? encryptedName)
        => string.IsNullOrWhiteSpace(encryptedName) ? null : DecryptDeterministic(GetNameKey(), encryptedName);

    public string? DecryptLastName(string? encryptedLastName)
        => string.IsNullOrWhiteSpace(encryptedLastName) ? null : DecryptDeterministic(GetLastNameKey(), encryptedLastName);

    public async Task<List<SoloOwnedAppDto>> GetSoloOwnedApps(Guid userId, CancellationToken ct)
    {
        List<Guid> ownedAppIds = await _context.ApplicationMember
            .Where(m => m.RefUser == userId && m.RefRoleApplication == RoleApplication.Ids.Owner)
            .Select(m => m.RefApplication)
            .ToListAsync(ct);

        List<SoloOwnedAppDto> result = new();
        string emailKey = GetEmailKey();
        string nameKey = GetNameKey();
        string lastNameKey = GetLastNameKey();

        foreach (Guid appId in ownedAppIds)
        {
            int otherOwners = await _context.ApplicationMember
                .CountAsync(m => m.RefApplication == appId
                    && m.RefRoleApplication == RoleApplication.Ids.Owner
                    && m.RefUser != userId, ct);

            if (otherOwners > 0) continue;

            Application? app = await _context.Application
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == appId, ct);

            if (app is null) continue;

            List<ApplicationMember> members = await _context.ApplicationMember
                .AsNoTracking()
                .Where(m => m.RefApplication == appId && m.RefUser != userId)
                .ToListAsync(ct);

            List<AppMemberDto> memberDtos = new();
            foreach (ApplicationMember member in members)
            {
                User? memberUser = await _context.User
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == member.RefUser, ct);

                if (memberUser is null) continue;

                memberDtos.Add(new AppMemberDto
                {
                    UserId = member.RefUser,
                    Email = DecryptDeterministic(emailKey, memberUser.Email) ?? string.Empty,
                    Name = string.IsNullOrWhiteSpace(memberUser.Name) ? null : DecryptDeterministic(nameKey, memberUser.Name),
                    LastName = string.IsNullOrWhiteSpace(memberUser.LastName) ? null : DecryptDeterministic(lastNameKey, memberUser.LastName),
                    Role = member.RefRoleApplication == RoleApplication.Ids.Owner ? "Owner"
                         : member.RefRoleApplication == RoleApplication.Ids.Maintainer ? "Maintainer"
                         : "Viewer"
                });
            }

            result.Add(new SoloOwnedAppDto
            {
                AppId = appId,
                AppName = app.Name,
                Members = memberDtos
            });
        }

        return result;
    }

    public async Task<ExportDataDto> ExportData(Guid userId, CancellationToken ct)
    {
        User? user = await _context.User.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
            throw new ApiException(StatusCodes.Status404NotFound, ErrorKeys.UserNotFound);

        return new ExportDataDto
        {
            Email = DecryptDeterministic(GetEmailKey(), user.Email) ?? string.Empty,
            Name = string.IsNullOrWhiteSpace(user.Name) ? null : DecryptDeterministic(GetNameKey(), user.Name),
            LastName = string.IsNullOrWhiteSpace(user.LastName) ? null : DecryptDeterministic(GetLastNameKey(), user.LastName),
            TermsAcceptedAt = user.TermsAcceptedAt,
            TermsVersion = user.TermsVersion,
            ExportedAt = DateTime.UtcNow
        };
    }

    public async Task DeleteAccount(Guid userId, List<AppDecisionDto> decisions, CancellationToken ct)
    {
        User? user = await _context.User.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
            throw new ApiException(StatusCodes.Status404NotFound, ErrorKeys.UserNotFound);

        foreach (AppDecisionDto decision in decisions)
        {
            if (decision.Action == AppDecisionAction.Delete)
            {
                Application? app = await _context.Application.FirstOrDefaultAsync(a => a.Id == decision.AppId, ct);
                if (app is not null)
                    _context.Application.Remove(app);
            }
            else if (decision.Action == AppDecisionAction.Transfer && decision.TransferToUserId.HasValue)
            {
                ApplicationMember? targetMember = await _context.ApplicationMember
                    .FirstOrDefaultAsync(m => m.RefApplication == decision.AppId && m.RefUser == decision.TransferToUserId.Value, ct);

                if (targetMember is not null)
                    targetMember.RefRoleApplication = RoleApplication.Ids.Owner;
            }
        }

        List<ApplicationMember> memberships = await _context.ApplicationMember
            .Where(m => m.RefUser == userId)
            .ToListAsync(ct);
        _context.ApplicationMember.RemoveRange(memberships);

        _context.User.Remove(user);
        await _context.SaveChangesAsync(ct);
    }
}
