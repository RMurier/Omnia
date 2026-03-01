using api.Helpers;
using NUnit.Framework;

namespace api.Tests.Helpers;

[TestFixture]
public class AuthHelperTests
{
    // ─── HashPassword ───────────────────────────────────────────────────────────

    [Test]
    public void HashPassword_SameInputs_ReturnsSameHash()
    {
        var h1 = AuthHelper.HashPassword("pass", "salt", "pepper");
        var h2 = AuthHelper.HashPassword("pass", "salt", "pepper");
        Assert.That(h1, Is.EqualTo(h2));
    }

    [Test]
    public void HashPassword_DifferentSalt_ReturnsDifferentHash()
    {
        var h1 = AuthHelper.HashPassword("pass", "salt1", "pepper");
        var h2 = AuthHelper.HashPassword("pass", "salt2", "pepper");
        Assert.That(h1, Is.Not.EqualTo(h2));
    }

    [Test]
    public void HashPassword_DifferentPepper_ReturnsDifferentHash()
    {
        var h1 = AuthHelper.HashPassword("pass", "salt", "pepper1");
        var h2 = AuthHelper.HashPassword("pass", "salt", "pepper2");
        Assert.That(h1, Is.Not.EqualTo(h2));
    }

    [Test]
    public void HashPassword_ReturnsValidBase64()
    {
        var hash = AuthHelper.HashPassword("password", "salt", "pepper");
        Assert.DoesNotThrow(() => Convert.FromBase64String(hash));
    }

    [Test]
    public void HashPassword_SHA512ProducesExpectedLength()
    {
        // SHA-512 = 64 bytes → base64 = 88 chars
        var hash = AuthHelper.HashPassword("p", "s", "e");
        Assert.That(hash.Length, Is.EqualTo(88));
    }

    // ─── GenerateSalt ────────────────────────────────────────────────────────────

    [Test]
    public void GenerateSalt_DefaultSize_Returns44CharBase64()
    {
        // 32 bytes → ceil(32/3)*4 = 44 chars in base64
        var salt = AuthHelper.GenerateSalt();
        Assert.That(salt.Length, Is.EqualTo(44));
    }

    [Test]
    public void GenerateSalt_CustomSize_ReturnsCorrectLength()
    {
        // 16 bytes → 24 chars base64
        var salt = AuthHelper.GenerateSalt(16);
        Assert.That(salt.Length, Is.EqualTo(24));
    }

    [Test]
    public void GenerateSalt_EachCallReturnsDifferentValue()
    {
        var s1 = AuthHelper.GenerateSalt();
        var s2 = AuthHelper.GenerateSalt();
        Assert.That(s1, Is.Not.EqualTo(s2));
    }

    [Test]
    public void GenerateSalt_ReturnsValidBase64()
    {
        var salt = AuthHelper.GenerateSalt();
        Assert.DoesNotThrow(() => Convert.FromBase64String(salt));
    }

    // ─── EncryptString / DecryptString ────────────────────────────────────────

    [Test]
    public void EncryptDecrypt_RoundTrip_RestoresOriginalText()
    {
        const string key = "my-test-key";
        const string plain = "Hello, World!";

        var cipher = AuthHelper.EncryptString(key, plain);
        var decrypted = AuthHelper.DecryptString(key, cipher);

        Assert.That(decrypted, Is.EqualTo(plain));
    }

    [Test]
    public void EncryptDecrypt_LongText_RoundTrip()
    {
        const string key = "long-key-value";
        var plain = new string('x', 10_000);

        var cipher = AuthHelper.EncryptString(key, plain);
        var decrypted = AuthHelper.DecryptString(key, cipher);

        Assert.That(decrypted, Is.EqualTo(plain));
    }

    [Test]
    public void Encrypt_SameKeyAndPlaintext_IsDeterministic()
    {
        // AES with fixed zero IV is deterministic
        const string key = "deterministic-key";
        const string plain = "test";

        var c1 = AuthHelper.EncryptString(key, plain);
        var c2 = AuthHelper.EncryptString(key, plain);

        Assert.That(c1, Is.EqualTo(c2));
    }

    [Test]
    public void Encrypt_DifferentKeys_ProduceDifferentCiphertext()
    {
        var c1 = AuthHelper.EncryptString("key1", "same-text");
        var c2 = AuthHelper.EncryptString("key2", "same-text");
        Assert.That(c1, Is.Not.EqualTo(c2));
    }

    [Test]
    public void Decrypt_WrongKey_DoesNotReturnOriginal()
    {
        var cipher = AuthHelper.EncryptString("correct-key", "secret");
        // Decrypting with a wrong key will produce garbled output or throw
        try
        {
            var result = AuthHelper.DecryptString("wrong-key", cipher);
            Assert.That(result, Is.Not.EqualTo("secret"));
        }
        catch
        {
            // A padding/format exception is also an acceptable outcome
            Assert.Pass("Decryption with wrong key threw an exception as expected.");
        }
    }

    // ─── VerifyPassword ──────────────────────────────────────────────────────

    [Test]
    public void VerifyPassword_MatchingHashes_ReturnsTrue()
    {
        var hash = AuthHelper.HashPassword("mypass", "salt", "pepper");
        Assert.That(AuthHelper.VerifyPassword(hash, hash), Is.True);
    }

    [Test]
    public void VerifyPassword_DifferentHashes_ReturnsFalse()
    {
        var h1 = AuthHelper.HashPassword("pass1", "salt", "pepper");
        var h2 = AuthHelper.HashPassword("pass2", "salt", "pepper");
        Assert.That(AuthHelper.VerifyPassword(h1, h2), Is.False);
    }

    [Test]
    public void VerifyPassword_EmptyStoredHash_ReturnsFalse()
    {
        Assert.That(AuthHelper.VerifyPassword("", "someHash"), Is.False);
    }

    [Test]
    public void VerifyPassword_EmptyComputedHash_ReturnsFalse()
    {
        Assert.That(AuthHelper.VerifyPassword("someHash", ""), Is.False);
    }

    [Test]
    public void VerifyPassword_BothEmpty_ReturnsFalse()
    {
        Assert.That(AuthHelper.VerifyPassword("", ""), Is.False);
    }

    [Test]
    public void VerifyPassword_InvalidBase64Stored_ReturnsFalse()
    {
        Assert.That(AuthHelper.VerifyPassword("not-valid-base64!!!", "validBase64"), Is.False);
    }

    [Test]
    public void VerifyPassword_InvalidBase64Computed_ReturnsFalse()
    {
        Assert.That(AuthHelper.VerifyPassword("validBase64", "not-valid-base64!!!"), Is.False);
    }
}
