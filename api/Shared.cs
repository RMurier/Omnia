namespace api
{
    public sealed class Shared
    {
        public static class Keys
        {
            public static class Errors
            {
                public const string NotFound = "Errors.NotFound";
                public const string Unauthorized = "Errors.Unauthorized";
                public const string Forbidden = "Errors.Forbidden";
                public const string RequiredFields = "Errors.RequiredFields";
                public const string PasswordTooShort = "Errors.PasswordTooShort";
                public const string InvalidCredentials = "Errors.InvalidCredentials";
                public const string UsernamePasswordRequired = "Errors.UsernamePasswordRequired";
                public const string UsernameAlreadyUsed = "Errors.UsernameAlreadyUsed";
                public const string EmailPasswordRequired = "Errors.EmailPasswordRequired";
                public const string EmailAlreadyUsed = "Errors.EmailAlreadyUsed";
                public const string UserNotFound = "Errors.UserNotFound";
                public const string CurrentPasswordInvalid = "Errors.CurrentPasswordInvalid";
                public const string ApplicationNameTooShort = "Errors.ApplicationNameTooShort";
                public const string ApplicationNameExists = "Errors.ApplicationNameExists";
                public const string ApplicationNotFound = "Errors.ApplicationNotFound";
                public const string SecretInvalid = "Errors.SecretInvalid";
                public const string RefApplicationRequired = "Errors.RefApplicationRequired";
                public const string AnonymousUserIdRequired = "Errors.AnonymousUserIdRequired";
                public const string MessageRequired = "Errors.MessageRequired";
            }
        }
    }
}
