using api.Services;
using NUnit.Framework;
using System.Text.Json;

namespace api.Tests.Services;

[TestFixture]
public class LogServiceTests
{
    // ─── NormalizeMessage ────────────────────────────────────────────────────

    [Test]
    public void NormalizeMessage_ReplacesGuid()
    {
        var input = "Record 550e8400-e29b-41d4-a716-446655440000 not found";
        var result = LogService.NormalizeMessage(input);
        Assert.That(result, Does.Not.Contain("550e8400-e29b-41d4-a716-446655440000"));
        Assert.That(result, Does.Contain("?"));
    }

    [Test]
    public void NormalizeMessage_ReplacesUppercaseGuid()
    {
        var input = "Error for user 550E8400-E29B-41D4-A716-446655440000";
        var result = LogService.NormalizeMessage(input);
        Assert.That(result, Does.Not.Contain("550E8400"));
        Assert.That(result, Does.Contain("?"));
    }

    [Test]
    public void NormalizeMessage_ReplacesEmail()
    {
        var input = "User user@example.com logged in";
        var result = LogService.NormalizeMessage(input);
        Assert.That(result, Does.Not.Contain("user@example.com"));
        Assert.That(result, Does.Contain("?"));
    }

    [Test]
    public void NormalizeMessage_ReplacesHttpUrl()
    {
        var input = "Request to https://api.example.com/v1/users failed";
        var result = LogService.NormalizeMessage(input);
        Assert.That(result, Does.Not.Contain("https://api.example.com/v1/users"));
        Assert.That(result, Does.Contain("?"));
    }

    [Test]
    public void NormalizeMessage_ReplacesHttpUrlCaseInsensitive()
    {
        var input = "Request to HTTP://api.example.com failed";
        var result = LogService.NormalizeMessage(input);
        Assert.That(result, Does.Not.Contain("HTTP://api.example.com"));
        Assert.That(result, Does.Contain("?"));
    }

    [Test]
    public void NormalizeMessage_ReplacesStandaloneNumbers()
    {
        var input = "Retry 3 after 30000 ms";
        var result = LogService.NormalizeMessage(input);
        Assert.That(result, Does.Not.Contain(" 3 "));
        Assert.That(result, Does.Not.Contain("30000"));
        Assert.That(result, Does.Contain("Retry ? after ? ms"));
    }

    [Test]
    public void NormalizeMessage_CollapsesWhitespace()
    {
        var result = LogService.NormalizeMessage("word   too   many   spaces");
        Assert.That(result, Is.EqualTo("word too many spaces"));
    }

    [Test]
    public void NormalizeMessage_Trims()
    {
        var result = LogService.NormalizeMessage("   trimmed   ");
        Assert.That(result, Is.EqualTo("trimmed"));
    }

    [Test]
    public void NormalizeMessage_MultiplePatterns_AllReplaced()
    {
        var input = "User user@test.com failed 5 times at https://app.com for 550e8400-e29b-41d4-a716-446655440000";
        var result = LogService.NormalizeMessage(input);
        Assert.That(result, Is.EqualTo("User ? failed ? times at ? for ?"));
    }

    [Test]
    public void NormalizeMessage_NoPatterns_ReturnsOriginal()
    {
        const string input = "Connection timeout";
        var result = LogService.NormalizeMessage(input);
        Assert.That(result, Is.EqualTo(input));
    }

    // ─── ComputeFingerprint ──────────────────────────────────────────────────

    [Test]
    public void ComputeFingerprint_SameCategoryLevelMessage_ReturnsSameFingerprint()
    {
        var appId = Guid.NewGuid();
        var fp1 = LogService.ComputeFingerprint(appId, "DB", "Error", "Connection failed", "{}");
        var fp2 = LogService.ComputeFingerprint(appId, "DB", "Error", "Connection failed", "{}");
        Assert.That(fp1, Is.EqualTo(fp2));
    }

    [Test]
    public void ComputeFingerprint_MessagesDifferingOnlyInNumbers_ReturnsSameFingerprint()
    {
        // Numbers must be standalone (word boundaries on both sides) to be normalized.
        // "1000ms" is NOT replaced because 'm' is a word char — no boundary after the digits.
        var appId = Guid.NewGuid();
        var fp1 = LogService.ComputeFingerprint(appId, "DB", "Error", "Retry count 3 after 1000 seconds", "{}");
        var fp2 = LogService.ComputeFingerprint(appId, "DB", "Error", "Retry count 7 after 5000 seconds", "{}");
        Assert.That(fp1, Is.EqualTo(fp2));
    }

    [Test]
    public void ComputeFingerprint_MessagesDifferingOnlyInGuids_ReturnsSameFingerprint()
    {
        var appId = Guid.NewGuid();
        var fp1 = LogService.ComputeFingerprint(appId, null, "Error", "User 550e8400-e29b-41d4-a716-446655440000 not found", "{}");
        var fp2 = LogService.ComputeFingerprint(appId, null, "Error", "User aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee not found", "{}");
        Assert.That(fp1, Is.EqualTo(fp2));
    }

    [Test]
    public void ComputeFingerprint_DifferentMessage_ReturnsDifferentFingerprint()
    {
        var appId = Guid.NewGuid();
        var fp1 = LogService.ComputeFingerprint(appId, "DB", "Error", "Connection failed", "{}");
        var fp2 = LogService.ComputeFingerprint(appId, "DB", "Error", "Timeout exceeded", "{}");
        Assert.That(fp1, Is.Not.EqualTo(fp2));
    }

    [Test]
    public void ComputeFingerprint_DifferentCategory_ReturnsDifferentFingerprint()
    {
        var appId = Guid.NewGuid();
        var fp1 = LogService.ComputeFingerprint(appId, "DB", "Error", "Connection failed", "{}");
        var fp2 = LogService.ComputeFingerprint(appId, "Auth", "Error", "Connection failed", "{}");
        Assert.That(fp1, Is.Not.EqualTo(fp2));
    }

    [Test]
    public void ComputeFingerprint_DifferentLevel_ReturnsDifferentFingerprint()
    {
        var appId = Guid.NewGuid();
        var fp1 = LogService.ComputeFingerprint(appId, "DB", "Error", "Connection failed", "{}");
        var fp2 = LogService.ComputeFingerprint(appId, "DB", "Warning", "Connection failed", "{}");
        Assert.That(fp1, Is.Not.EqualTo(fp2));
    }

    [Test]
    public void ComputeFingerprint_DifferentAppId_ReturnsDifferentFingerprint()
    {
        var fp1 = LogService.ComputeFingerprint(Guid.NewGuid(), "DB", "Error", "msg", "{}");
        var fp2 = LogService.ComputeFingerprint(Guid.NewGuid(), "DB", "Error", "msg", "{}");
        Assert.That(fp1, Is.Not.EqualTo(fp2));
    }

    [Test]
    public void ComputeFingerprint_NullCategoryAndLevel_DoesNotThrow()
    {
        var appId = Guid.NewGuid();
        Assert.DoesNotThrow(() =>
            LogService.ComputeFingerprint(appId, null, null, "some message", "{}"));
    }

    [Test]
    public void ComputeFingerprint_ReturnsHexString()
    {
        var fp = LogService.ComputeFingerprint(Guid.NewGuid(), "Cat", "Lvl", "msg", "{}");
        // SHA-256 = 32 bytes → 64 hex chars
        Assert.That(fp, Has.Length.EqualTo(64));
        Assert.That(fp, Does.Match("^[0-9A-Fa-f]+$"));
    }

    [Test]
    public void ComputeFingerprint_SameStackSignature_ReturnsSameFingerprint()
    {
        var appId = Guid.NewGuid();
        var payload = """{"stackSignature":["A.method","B.handler"]}""";
        var fp1 = LogService.ComputeFingerprint(appId, null, "Error", "Error in user 5", payload);
        var fp2 = LogService.ComputeFingerprint(appId, null, "Error", "Error in user 9", payload);
        Assert.That(fp1, Is.EqualTo(fp2));
    }

    [Test]
    public void ComputeFingerprint_DifferentStackSignature_ReturnsDifferentFingerprint()
    {
        var appId = Guid.NewGuid();
        var p1 = """{"stackSignature":["A.method"]}""";
        var p2 = """{"stackSignature":["B.method"]}""";
        var fp1 = LogService.ComputeFingerprint(appId, null, "Error", "Connection failed", p1);
        var fp2 = LogService.ComputeFingerprint(appId, null, "Error", "Connection failed", p2);
        Assert.That(fp1, Is.Not.EqualTo(fp2));
    }

    // ─── TryExtractStackSignature ────────────────────────────────────────────

    [Test]
    public void TryExtractStackSignature_WithStackSignatureArray_ReturnsFrames()
    {
        var json = """{"stackSignature":["A.connect","B.query","C.execute"]}""";
        var frames = LogService.TryExtractStackSignature(json);
        Assert.That(frames, Is.EqualTo(new[] { "A.connect", "B.query", "C.execute" }));
    }

    [Test]
    public void TryExtractStackSignature_WithFramesArray_ReturnsFrames()
    {
        var json = """{"frames":["X.run","Y.call"]}""";
        var frames = LogService.TryExtractStackSignature(json);
        Assert.That(frames, Is.EqualTo(new[] { "X.run", "Y.call" }));
    }

    [Test]
    public void TryExtractStackSignature_TakesMax3Frames()
    {
        var json = """{"stackSignature":["A","B","C","D","E"]}""";
        var frames = LogService.TryExtractStackSignature(json);
        Assert.That(frames, Has.Length.EqualTo(3));
        Assert.That(frames, Is.EqualTo(new[] { "A", "B", "C" }));
    }

    [Test]
    public void TryExtractStackSignature_NestedInError_ReturnsFrames()
    {
        var json = """{"error":{"stackSignature":["A.inner","B.outer"]}}""";
        var frames = LogService.TryExtractStackSignature(json);
        Assert.That(frames, Is.EqualTo(new[] { "A.inner", "B.outer" }));
    }

    [Test]
    public void TryExtractStackSignature_InvalidJson_ReturnsEmpty()
    {
        var frames = LogService.TryExtractStackSignature("not json at all");
        Assert.That(frames, Is.Empty);
    }

    [Test]
    public void TryExtractStackSignature_EmptyObject_ReturnsEmpty()
    {
        var frames = LogService.TryExtractStackSignature("{}");
        Assert.That(frames, Is.Empty);
    }

    [Test]
    public void TryExtractStackSignature_EmptyStackSignatureArray_ReturnsEmpty()
    {
        var json = """{"stackSignature":[]}""";
        var frames = LogService.TryExtractStackSignature(json);
        Assert.That(frames, Is.Empty);
    }

    [Test]
    public void TryExtractStackSignature_StackSignatureNotArray_ReturnsEmpty()
    {
        var json = """{"stackSignature":"not-an-array"}""";
        var frames = LogService.TryExtractStackSignature(json);
        Assert.That(frames, Is.Empty);
    }

    [Test]
    public void TryExtractStackSignature_NonStringElementsFiltered()
    {
        var json = """{"stackSignature":["A.method", 42, null, "B.method"]}""";
        var frames = LogService.TryExtractStackSignature(json);
        Assert.That(frames, Is.EqualTo(new[] { "A.method", "B.method" }));
    }
}
