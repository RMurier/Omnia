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
namespace api.Services;

public class AuthService : IAuth
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
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
            throw new ApiException(StatusCodes.Status401Unauthorized, Shared.Keys.Errors.InvalidCredentials);

        string pepper = GetPepper();
        string emailKey = GetEmailKey();

        string normalizedEmail = NormalizeEmail(request.Email);
        string encryptedEmail = EncryptDeterministic(emailKey, normalizedEmail);

        User? user = await _context.User.FirstOrDefaultAsync(u => u.Email == encryptedEmail, ct);
        if (user == null || string.IsNullOrWhiteSpace(user.Password) || string.IsNullOrWhiteSpace(user.Salt))
            throw new ApiException(StatusCodes.Status401Unauthorized, Shared.Keys.Errors.InvalidCredentials);

        string computedHash = AuthHelper.HashPassword(request.Password, user.Salt, pepper);
        if (!AuthHelper.VerifyPassword(user.Password, computedHash))
            throw new ApiException(StatusCodes.Status401Unauthorized, Shared.Keys.Errors.InvalidCredentials);

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
        if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            throw new ApiException(StatusCodes.Status400BadRequest, Shared.Keys.Errors.EmailPasswordRequired);

        if (request.Password.Length < 6)
            throw new ApiException(StatusCodes.Status400BadRequest, Shared.Keys.Errors.PasswordTooShort);

        string pepper = GetPepper();
        string emailKey = GetEmailKey();
        string nameKey = GetNameKey();
        string lastNameKey = GetLastNameKey();

        string normalizedEmail = NormalizeEmail(request.Email);
        string encryptedEmail = EncryptDeterministic(emailKey, normalizedEmail);

        bool exists = await _context.User.AnyAsync(u => u.Email == encryptedEmail, ct);
        if (exists)
            throw new ApiException(StatusCodes.Status400BadRequest, Shared.Keys.Errors.EmailAlreadyUsed);

        string salt = AuthHelper.GenerateSalt();
        string passwordHash = AuthHelper.HashPassword(request.Password, salt, pepper);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = encryptedEmail,
            Name = string.IsNullOrWhiteSpace(request.Name) ? null : EncryptDeterministic(nameKey, request.Name.Trim()),
            LastName = string.IsNullOrWhiteSpace(request.LastName) ? null : EncryptDeterministic(lastNameKey, request.LastName.Trim()),
            Password = passwordHash,
            Salt = salt
        };

        _context.User.Add(user);
        await _context.SaveChangesAsync(ct);

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

            var userExists = await _context.User.AsNoTracking().AnyAsync(x => x.Id == userId, ct);
            if (!userExists) return null;

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
        if (user is null) throw new ApiException(StatusCodes.Status401Unauthorized, Shared.Keys.Errors.UserNotFound);

        var pepper = GetPepper();

        var computedHash = AuthHelper.HashPassword(currentPassword, user.Salt, pepper);
        if (!AuthHelper.VerifyPassword(user.Password, computedHash))
            throw new ApiException(StatusCodes.Status401Unauthorized, Shared.Keys.Errors.CurrentPasswordInvalid);

        var newSalt = AuthHelper.GenerateSalt();
        var newHash = AuthHelper.HashPassword(newPassword, newSalt, pepper);

        user.Salt = newSalt;
        user.Password = newHash;

        await _context.SaveChangesAsync(ct);
    }
}
