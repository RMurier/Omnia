public interface IApplicationSecretProtector
{
    string Protect(string secretPlain, int version);
    string Unprotect(string secretEnc, int version);
}