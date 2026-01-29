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
}
