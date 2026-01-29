// Validator/ResourceValidator.cs — version complète FIX (satellites OK)
using System.Collections;
using System.Globalization;
using System.Resources;

namespace api.Validator;

public static class ResourceValidator
{
    public static void Validate<TMarker>(IEnumerable<string> culturesToCheck)
    {
        var asm = typeof(TMarker).Assembly;
        var markerName = typeof(TMarker).Name;

        var neutralManifest = asm
            .GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith($".{markerName}.resources", StringComparison.OrdinalIgnoreCase));

        if (neutralManifest is null)
        {
            var all = string.Join(", ", asm.GetManifestResourceNames());
            throw new MissingManifestResourceException(
                $"Neutral resource for '{markerName}' not found in main assembly. " +
                $"Expected something ending with '.{markerName}.resources'. Available: {all}"
            );
        }

        var baseName = neutralManifest[..^".resources".Length];
        var rm = new ResourceManager(baseName, asm);

        var sets = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase)
        {
            ["neutral"] = GetKeysOrThrow(rm, CultureInfo.InvariantCulture, baseName, "neutral")
        };

        foreach (var c in culturesToCheck
                     .Where(x => !string.IsNullOrWhiteSpace(x))
                     .Select(x => x.Trim())
                     .Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var ci = CultureInfo.GetCultureInfo(c);

         
            sets[ci.Name] = GetKeysOrThrow(rm, ci, baseName, ci.Name);
        }

        var union = new HashSet<string>(StringComparer.Ordinal);
        foreach (var s in sets.Values) union.UnionWith(s);

        var errors = new List<string>();

        foreach (var (name, keys) in sets)
        {
            var missing = union.Except(keys).ToList();
            if (missing.Count > 0)
                errors.Add($"Missing keys in '{baseName}' for '{name}': {string.Join(", ", missing)}");
        }

        if (errors.Count > 0)
            throw new Exception("Resource validation failed:\n" + string.Join("\n", errors));
    }

    private static HashSet<string> GetKeysOrThrow(ResourceManager rm, CultureInfo culture, string baseName, string label)
    {
        var rs = rm.GetResourceSet(culture, createIfNotExists: true, tryParents: false);
        if (rs is null)
        {
            throw new MissingManifestResourceException(
                $"Resource set '{baseName}' for culture '{label}' not found. " +
                $"(Satellite assembly missing or resource file not compiled.)"
            );
        }

        return rs.Cast<DictionaryEntry>()
            .Select(e => e.Key!.ToString()!)
            .ToHashSet(StringComparer.Ordinal);
    }
}
