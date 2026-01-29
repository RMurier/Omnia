using System.Security.Claims;
using System.Text.Encodings.Web;
using api.Models;
using api.Validator;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace api.Handler
{
    public sealed class HmacAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        private readonly HmacValidator _validator;

        public HmacAuthenticationHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            HmacValidator validator)
            : base(options, logger, encoder)
        {
            _validator = validator;
        }

        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.ContainsKey(HmacAuthDefaults.HeaderAppId))
                return AuthenticateResult.NoResult();

            try
            {
                await _validator.ValidateAsync(Context, Context.RequestAborted);

                var appId = Request.Headers[HmacAuthDefaults.HeaderAppId].ToString();
                var ver = Request.Headers[HmacAuthDefaults.HeaderKeyVersion].ToString();

                var claims = new List<Claim>
                {
                    new Claim(HmacAuthDefaults.ClaimAppId, appId),
                    new Claim(HmacAuthDefaults.ClaimKeyVersion, ver),
                };

                var identity = new ClaimsIdentity(claims, HmacAuthDefaults.Scheme);
                return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), HmacAuthDefaults.Scheme));
            }
            catch (Exception ex)
            {
                return AuthenticateResult.Fail(ex);
            }
        }
    }
}
