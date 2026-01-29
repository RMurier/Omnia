namespace api.DTOs.Application
{
    public sealed class CreateApplicationResultDto
    {
        public ApplicationDto Application { get; set; } = default!;
        /// <summary>
        /// À afficher une seule fois (à l’utilisateur/admin) puis à stocker côté application cliente.
        /// Non stocké en clair en base.
        /// </summary>
        public string SecretBase64 { get; set; } = default!;
        public ApplicationSecretDto Version { get; set; } = default!;
    }
}
