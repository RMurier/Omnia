namespace api.Models
{
    public static class HmacAuthDefaults
    {
        public const string Scheme = "Hmac";

        public const string HeaderAppId = "X-App-Id";
        public const string HeaderKeyVersion = "X-Key-Version";
        public const string HeaderTimestamp = "X-Timestamp";
        public const string HeaderNonce = "X-Nonce";
        public const string HeaderSignature = "X-Signature";

        public const string ClaimAppId = "app_id";
        public const string ClaimKeyVersion = "key_version";
    }

}
