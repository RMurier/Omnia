using api;
using api.Handler;
using api.Interfaces;
using api.Middlewares;
using api.Models;
using api.Provider.Implementation;
using api.Provider.Interface;
using api.Services;
using api.Validator;
using Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Globalization;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
            "http://localhost",
            "https://localhost",
            "http://localhost:3000",
            "https://localhost:3000",
            "http://localhost:5173",
            "https://localhost:5173",
            "https://dev.omnia-monitoring.com",
            "https://omnia-monitoring.com"
        )
        .SetIsOriginAllowedToAllowWildcardSubdomains()
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});

builder.Services.AddOpenApi();

builder.Services.AddLocalization(options => options.ResourcesPath = "Resources");

var supportedCultures = new[]
{
    new CultureInfo("en"),
    new CultureInfo("fr"),
    new CultureInfo("en-US"),
    new CultureInfo("en-GB"),
    new CultureInfo("fr-FR"),
};

builder.Services.Configure<RequestLocalizationOptions>(options =>
{
    options.DefaultRequestCulture = new RequestCulture("en");
    options.SupportedCultures = supportedCultures;
    options.SupportedUICultures = supportedCultures;

    options.RequestCultureProviders = new List<IRequestCultureProvider>
    {
        new AcceptLanguageHeaderRequestCultureProvider()
    };
});


IConfigurationSection jwtConfig = builder.Configuration.GetSection("JwtSettings");
string jwtKey = jwtConfig["Key"] ?? throw new ApplicationException("JWT key is not configured.");

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = jwtConfig["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtConfig["Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (context.Request.Headers.ContainsKey("Authorization"))
                    return Task.CompletedTask;

                if (context.Request.Cookies.TryGetValue("access_token", out var token) && !string.IsNullOrWhiteSpace(token))
                    context.Token = token;

                return Task.CompletedTask;
            }
        };
    })
    .AddScheme<AuthenticationSchemeOptions, HmacAuthenticationHandler>(
        HmacAuthDefaults.Scheme,
        _ => { });

var cs = builder.Configuration.GetConnectionString("DefaultConnection")
         ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection manquante");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(cs);
    if (builder.Environment.IsDevelopment())
    {
        options.EnableDetailedErrors();
        options.EnableSensitiveDataLogging();
    }
});

builder.Services.AddDataProtection();

builder.Services.AddAuthorization();

builder.Services.AddScoped<IAuth, AuthService>();
builder.Services.AddScoped<IApplication, ApplicationService>();
builder.Services.AddScoped<IApplicationSecretProtector, ApplicationSecretProtector>();
builder.Services.AddScoped<IActivity, ActivityService>();
builder.Services.AddScoped<ILog, LogService>();

builder.Services.AddScoped<IApplicationSecretProvider, EfApplicationSecretProvider>();
builder.Services.AddScoped<IHmacNonceStore, EfHmacNonceStore>();
builder.Services.AddScoped<HmacValidator>();

var app = builder.Build();

app.UseRequestLocalization(
    app.Services.GetRequiredService<IOptions<RequestLocalizationOptions>>().Value
);


//Validators
try
{
    ResourceValidator.Validate<Shared>(new[] { "fr" })
    ;
}
catch (Exception ex)
{
    app.Logger.LogCritical(ex, "Resource validation failed (missing keys between cultures).");
    throw;
}

app.UseMiddleware<ErrorLoggingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
