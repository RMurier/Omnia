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
                public const string SubjectRequired = "Errors.SubjectRequired";
                public const string BetaRegistrationDisabled = "Errors.BetaRegistrationDisabled";
                public const string EmailNotConfirmed = "Errors.EmailNotConfirmed";
                public const string InvalidConfirmationToken = "Errors.InvalidConfirmationToken";
                public const string MemberAlreadyExists = "Errors.MemberAlreadyExists";
                public const string CannotRemoveLastOwner = "Errors.CannotRemoveLastOwner";
                public const string InvalidRole = "Errors.InvalidRole";
                public const string InvitationAlreadyPending = "Errors.InvitationAlreadyPending";
                public const string InvalidResetToken = "Errors.InvalidResetToken";
            }

            public static class Email
            {
                public static class Confirm
                {
                    public const string Subject = "Email.Confirm.Subject";
                    public const string Title = "Email.Confirm.Title";
                    public const string Body = "Email.Confirm.Body";
                    public const string Button = "Email.Confirm.Button";
                    public const string Footer = "Email.Confirm.Footer";
                }

                public static class Reset
                {
                    public const string Subject = "Email.Reset.Subject";
                    public const string Title = "Email.Reset.Title";
                    public const string Body = "Email.Reset.Body";
                    public const string Button = "Email.Reset.Button";
                    public const string Expires = "Email.Reset.Expires";
                    public const string Footer = "Email.Reset.Footer";
                }
            }
        }
    }
}
