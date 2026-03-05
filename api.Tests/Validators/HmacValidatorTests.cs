using System.Security.Cryptography;
using System.Text;
using api.Models;
using api.Provider.Interface;
using api.Validator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using NUnit.Framework;

namespace api.Tests.Validators;

[TestFixture]
public class HmacValidatorTests
{
    private static readonly byte[] DefaultSecret = Encoding.UTF8.GetBytes("test-secret-32-bytes-long-padded!!");
    private static readonly string DefaultSecretB64 = Convert.ToBase64String(DefaultSecret);

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static string ComputeHmac(byte[] key, string message)
    {
        using var h = new HMACSHA256(key);
        return Convert.ToBase64String(h.ComputeHash(Encoding.UTF8.GetBytes(message)));
    }

    private static HmacValidator BuildValidator(
        Guid appId,
        int version,
        string secretB64,
        bool isActive = true,
        bool nonceOk = true)
    {
        var secretsMock = new Mock<IApplicationSecretProvider>();
        secretsMock
            .Setup(s => s.GetSecretAsync(appId, version, It.IsAny<CancellationToken>()))
            .ReturnsAsync((secretB64, isActive));

        var nonceMock = new Mock<IHmacNonceStore>();
        nonceMock
            .Setup(n => n.TryUseNonceAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(nonceOk);

        var logger = NullLogger<HmacValidator>.Instance;
        return new HmacValidator(secretsMock.Object, nonceMock.Object, logger);
    }

    private static HttpContext BuildHttpContext(
        string appIdStr,
        string versionStr,
        string tsStr,
        string nonce,
        string signature,
        string method = "POST",
        string path = "/api/log",
        string body = "{}",
        string? keyVersionOverride = null)
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = method;
        ctx.Request.Path = path;

        ctx.Request.Headers[HmacAuthDefaults.HeaderAppId] = appIdStr;
        ctx.Request.Headers[HmacAuthDefaults.HeaderKeyVersion] = keyVersionOverride ?? versionStr;
        ctx.Request.Headers[HmacAuthDefaults.HeaderTimestamp] = tsStr;
        ctx.Request.Headers[HmacAuthDefaults.HeaderNonce] = nonce;
        ctx.Request.Headers[HmacAuthDefaults.HeaderSignature] = signature;

        var bodyBytes = Encoding.UTF8.GetBytes(body);
        ctx.Request.Body = new MemoryStream(bodyBytes);
        ctx.Request.ContentLength = bodyBytes.Length;

        return ctx;
    }

    private static (HttpContext ctx, HmacValidator validator) BuildValid(
        Guid? appIdOverride = null,
        string? bodyOverride = null)
    {
        var appId = appIdOverride ?? Guid.NewGuid();
        const int version = 1;
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        const string nonce = "unique-nonce-1234";
        var body = bodyOverride ?? "{}";

        var bodyBytes = Encoding.UTF8.GetBytes(body);
        var bodyHashHex = Convert.ToHexString(SHA256.HashData(bodyBytes)).ToLowerInvariant();

        var canonical = $"{appId}\n{version}\n{ts}\n{nonce}\nPOST\n/api/log\n{bodyHashHex}";
        var sig = ComputeHmac(DefaultSecret, canonical);

        var ctx = BuildHttpContext(appId.ToString(), version.ToString(), ts.ToString(), nonce, sig, body: body);
        var validator = BuildValidator(appId, version, DefaultSecretB64);
        return (ctx, validator);
    }

    // ─── Valid request ───────────────────────────────────────────────────────

    [Test]
    public async Task ValidateAsync_ValidRequest_DoesNotThrow()
    {
        var (ctx, validator) = BuildValid();
        Assert.DoesNotThrowAsync(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
    }

    // ─── AppId ───────────────────────────────────────────────────────────────

    [Test]
    public async Task ValidateAsync_InvalidAppId_ThrowsUnauthorized()
    {
        var (ctx, validator) = BuildValid();
        ctx.Request.Headers[HmacAuthDefaults.HeaderAppId] = "not-a-guid";

        var ex = Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
        Assert.That(ex!.Message, Does.Contain("X-App-Id"));
    }

    [Test]
    public async Task ValidateAsync_MissingAppId_ThrowsUnauthorized()
    {
        var (ctx, validator) = BuildValid();
        ctx.Request.Headers.Remove(HmacAuthDefaults.HeaderAppId);

        Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
    }

    // ─── Key Version ─────────────────────────────────────────────────────────

    [Test]
    public async Task ValidateAsync_InvalidKeyVersion_ThrowsUnauthorized()
    {
        var (ctx, validator) = BuildValid();
        ctx.Request.Headers[HmacAuthDefaults.HeaderKeyVersion] = "abc";

        var ex = Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
        Assert.That(ex!.Message, Does.Contain("X-Key-Version"));
    }

    [Test]
    public async Task ValidateAsync_ZeroKeyVersion_ThrowsUnauthorized()
    {
        var (ctx, validator) = BuildValid();
        ctx.Request.Headers[HmacAuthDefaults.HeaderKeyVersion] = "0";

        var ex = Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
        Assert.That(ex!.Message, Does.Contain("X-Key-Version"));
    }

    // ─── Timestamp ───────────────────────────────────────────────────────────

    [Test]
    public async Task ValidateAsync_InvalidTimestamp_ThrowsUnauthorized()
    {
        var (ctx, validator) = BuildValid();
        ctx.Request.Headers[HmacAuthDefaults.HeaderTimestamp] = "not-a-timestamp";

        var ex = Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
        Assert.That(ex!.Message, Does.Contain("X-Timestamp"));
    }

    [Test]
    public async Task ValidateAsync_TimestampTooOld_ThrowsUnauthorized()
    {
        var appId = Guid.NewGuid();
        const int version = 1;
        // 10 minutes in the past
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds() - 600;
        const string nonce = "old-nonce-12345678";
        const string body = "{}";
        var bodyHashHex = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(body))).ToLowerInvariant();
        var canonical = $"{appId}\n{version}\n{ts}\n{nonce}\nPOST\n/api/log\n{bodyHashHex}";
        var sig = ComputeHmac(DefaultSecret, canonical);

        var ctx = BuildHttpContext(appId.ToString(), version.ToString(), ts.ToString(), nonce, sig);
        var validator = BuildValidator(appId, version, DefaultSecretB64);

        var ex = Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
        Assert.That(ex!.Message, Does.Contain("Timestamp"));
    }

    [Test]
    public async Task ValidateAsync_TimestampInFuture_ThrowsUnauthorized()
    {
        var appId = Guid.NewGuid();
        const int version = 1;
        // 10 minutes in the future
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 600;
        const string nonce = "future-nonce-12345";
        const string body = "{}";
        var bodyHashHex = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(body))).ToLowerInvariant();
        var canonical = $"{appId}\n{version}\n{ts}\n{nonce}\nPOST\n/api/log\n{bodyHashHex}";
        var sig = ComputeHmac(DefaultSecret, canonical);

        var ctx = BuildHttpContext(appId.ToString(), version.ToString(), ts.ToString(), nonce, sig);
        var validator = BuildValidator(appId, version, DefaultSecretB64);

        var ex = Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
        Assert.That(ex!.Message, Does.Contain("Timestamp"));
    }

    // ─── Nonce ────────────────────────────────────────────────────────────────

    [Test]
    public async Task ValidateAsync_EmptyNonce_ThrowsUnauthorized()
    {
        var (ctx, validator) = BuildValid();
        ctx.Request.Headers[HmacAuthDefaults.HeaderNonce] = "";

        var ex = Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
        Assert.That(ex!.Message, Does.Contain("X-Nonce"));
    }

    [Test]
    public async Task ValidateAsync_NonceTooShort_ThrowsUnauthorized()
    {
        var (ctx, validator) = BuildValid();
        ctx.Request.Headers[HmacAuthDefaults.HeaderNonce] = "short";

        var ex = Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
        Assert.That(ex!.Message, Does.Contain("X-Nonce"));
    }

    [Test]
    public async Task ValidateAsync_NonceTooLong_ThrowsUnauthorized()
    {
        var (ctx, validator) = BuildValid();
        ctx.Request.Headers[HmacAuthDefaults.HeaderNonce] = new string('x', 129);

        var ex = Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
        Assert.That(ex!.Message, Does.Contain("X-Nonce"));
    }

    [Test]
    public async Task ValidateAsync_ReplayedNonce_ThrowsUnauthorized()
    {
        var appId = Guid.NewGuid();
        const int version = 1;
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        const string nonce = "replayed-nonce-123";
        const string body = "{}";
        var bodyHashHex = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(body))).ToLowerInvariant();
        var canonical = $"{appId}\n{version}\n{ts}\n{nonce}\nPOST\n/api/log\n{bodyHashHex}";
        var sig = ComputeHmac(DefaultSecret, canonical);

        var ctx = BuildHttpContext(appId.ToString(), version.ToString(), ts.ToString(), nonce, sig);
        // nonceOk=false simulates a replayed nonce
        var validator = BuildValidator(appId, version, DefaultSecretB64, nonceOk: false);

        var ex = Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
        Assert.That(ex!.Message, Does.Contain("Nonce"));
    }

    // ─── Signature ───────────────────────────────────────────────────────────

    [Test]
    public async Task ValidateAsync_MissingSignature_ThrowsUnauthorized()
    {
        var (ctx, validator) = BuildValid();
        ctx.Request.Headers[HmacAuthDefaults.HeaderSignature] = "";

        var ex = Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
        Assert.That(ex!.Message, Does.Contain("X-Signature"));
    }

    [Test]
    public async Task ValidateAsync_WrongSignature_ThrowsUnauthorized()
    {
        var (ctx, validator) = BuildValid();
        ctx.Request.Headers[HmacAuthDefaults.HeaderSignature] = "dGhpcyBpcyBub3QgdGhlIHJpZ2h0IHNpZ25hdHVyZQ==";

        var ex = Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
        Assert.That(ex!.Message, Does.Contain("signature"));
    }

    // ─── Application / Version ───────────────────────────────────────────────

    [Test]
    public async Task ValidateAsync_UnknownApplication_ThrowsUnauthorized()
    {
        var appId = Guid.NewGuid();
        const int version = 1;
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        const string nonce = "nonce-unknown-app1";
        const string body = "{}";
        var bodyHashHex = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(body))).ToLowerInvariant();
        var canonical = $"{appId}\n{version}\n{ts}\n{nonce}\nPOST\n/api/log\n{bodyHashHex}";
        var sig = ComputeHmac(DefaultSecret, canonical);

        var ctx = BuildHttpContext(appId.ToString(), version.ToString(), ts.ToString(), nonce, sig);

        // Return null secret = unknown app
        var secretsMock = new Mock<IApplicationSecretProvider>();
        secretsMock
            .Setup(s => s.GetSecretAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(((string secretBase64, bool isActive)?)null);

        var validator = new HmacValidator(
            secretsMock.Object,
            new Mock<IHmacNonceStore>().Object,
            NullLogger<HmacValidator>.Instance);

        var ex = Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
        Assert.That(ex!.Message, Does.Contain("Unknown"));
    }

    [Test]
    public async Task ValidateAsync_InactiveVersion_ThrowsUnauthorized()
    {
        var appId = Guid.NewGuid();
        const int version = 1;
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        const string nonce = "nonce-inactive-ver";
        const string body = "{}";
        var bodyHashHex = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(body))).ToLowerInvariant();
        var canonical = $"{appId}\n{version}\n{ts}\n{nonce}\nPOST\n/api/log\n{bodyHashHex}";
        var sig = ComputeHmac(DefaultSecret, canonical);

        var ctx = BuildHttpContext(appId.ToString(), version.ToString(), ts.ToString(), nonce, sig);
        var validator = BuildValidator(appId, version, DefaultSecretB64, isActive: false);

        var ex = Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await validator.ValidateAsync(ctx, CancellationToken.None));
        Assert.That(ex!.Message, Does.Contain("inactive"));
    }
}
