using api.DTOs.Auth;
using api.Exceptions;
using api.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class AuthController : ControllerBase
{
    private readonly IAuth _auth;
    private readonly IStringLocalizer<Shared> _t;

    public AuthController(IAuth auth, IStringLocalizer<Shared> t)
    {
        _auth = auth;
        _t = t;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _auth.Login(request, ct);
            SetAuthCookies(result.AccessToken, result.RefreshToken);
            return Ok(new { ok = true });
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] CreateUserRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _auth.Register(request, ct);
            return CreatedAtAction(nameof(Register), result);
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        if (!Request.Cookies.TryGetValue("refresh_token", out var refreshToken) || string.IsNullOrWhiteSpace(refreshToken))
            return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        try
        {
            var result = await _auth.RefreshAccessToken(refreshToken, ct);
            if (result is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            SetAuthCookies(result.AccessToken, result.RefreshToken);
            return Ok(new { ok = true });
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        if (Request.Cookies.TryGetValue("refresh_token", out var refreshToken) && !string.IsNullOrWhiteSpace(refreshToken))
            await _auth.RevokeRefreshToken(refreshToken, ct);

        ExpireCookie("access_token", "/");
        ExpireCookie("refresh_token", "/api/auth/refresh");
        return Ok(new { ok = true });
    }

    [HttpGet("me")]
    public async Task<ActionResult<MeResponseDto>> Me(CancellationToken ct)
    {
        var userId = GetUserIdFromClaims();
        if (userId is null)
            return Unauthorized(new { message = _t[Shared.Keys.Errors.Unauthorized].Value });

        var me = await _auth.GetMe(userId.Value, ct);
        if (me is null)
            return Unauthorized(new { message = _t[Shared.Keys.Errors.Unauthorized].Value });

        return Ok(me);
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest(new { message = _t["Errors.RequiredFields"].Value });

        if (request.NewPassword.Length < 6)
            return BadRequest(new { message = _t["Errors.PasswordTooShort"].Value });

        var userId = GetUserIdFromClaims();
        if (userId is null)
            return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        try
        {
            await _auth.ChangePassword(userId.Value, request.CurrentPassword, request.NewPassword, ct);
            return Ok(new { ok = true });
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }

    private Guid? GetUserIdFromClaims()
    {
        var v =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("sub") ??
            User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (Guid.TryParse(v, out var id))
            return id;

        return null;
    }

    private void SetAuthCookies(string accessToken, string refreshToken)
    {
        var accessMinutes = _auth.GetAccessTokenMinutes();
        var refreshDays = _auth.GetRefreshTokenDays();
        var secure = Request.IsHttps;

        Response.Cookies.Append("access_token", accessToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = secure,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            MaxAge = TimeSpan.FromMinutes(accessMinutes)
        });

        Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = secure,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth/refresh",
            MaxAge = TimeSpan.FromDays(refreshDays)
        });
    }

    private void ExpireCookie(string name, string path)
    {
        var secure = Request.IsHttps;

        Response.Cookies.Append(name, "", new CookieOptions
        {
            HttpOnly = true,
            Secure = secure,
            SameSite = SameSiteMode.Lax,
            Path = path,
            Expires = DateTimeOffset.UnixEpoch,
            MaxAge = TimeSpan.Zero
        });
    }
}
