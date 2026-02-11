using api.DTOs.Auth;

namespace api.Interfaces;

public interface IAuth
{
    Task<LoginResponse> Login(LoginRequest request, CancellationToken ct);
    Task<CreateUserResponse> Register(CreateUserRequest request, CancellationToken ct);
    string GenerateToken(Guid userId);
    string GenerateRefreshToken(Guid userId);
    Task<TokenResponseDto?> RefreshAccessToken(string refreshToken, CancellationToken ct);
    Task RevokeRefreshToken(string refreshToken, CancellationToken ct);
    int GetAccessTokenMinutes();
    int GetRefreshTokenDays();
    Task<string?> GetEmail(Guid userId, CancellationToken ct);
    Task<string?> GetName(Guid userId, CancellationToken ct);
    Task<string?> GetLastName(Guid userId, CancellationToken ct);
    Task<MeResponseDto?> GetMe(Guid userId, CancellationToken ct);
    Task ChangePassword(Guid userId, string currentPassword, string newPassword, CancellationToken ct);
    Task ConfirmPasswordChange(string token, CancellationToken ct);
    Task ConfirmEmail(string token, CancellationToken ct);
    Task ResendConfirmation(string email, CancellationToken ct);
    Task ForgotPassword(string email, CancellationToken ct);
    Task ResetPassword(string token, string newPassword, CancellationToken ct);
    Task<(Guid userId, string? name, string? lastName)?> FindUserByEmail(string email, CancellationToken ct);
    string EncryptEmail(string plainEmail);
    string? DecryptEmail(string encryptedEmail);
    string? DecryptName(string? encryptedName);
    string? DecryptLastName(string? encryptedLastName);
}
