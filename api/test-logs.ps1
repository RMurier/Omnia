# Test script to add logs with stack traces from various languages
# Uses HMAC authentication

# ====== CONFIGURATION ======
$API_BASE = "https://localhost"
$BASE_PATH = "/api"
$APP_ID = "6932a69e-eaa0-4e9c-b4cf-d7a9c6524e4c"
$KEY_VERSION = 2
$SECRET_BASE64 = "fSem4Oe3tiCV3iKpPvlTBlXRWCGMJcMFl4zYgs1WXVI="  # Replace with your actual secret

# Skip SSL certificate validation for localhost
add-type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAllCertsPolicy : ICertificatePolicy {
    public bool CheckValidationResult(ServicePoint srvPoint, X509Certificate certificate, WebRequest request, int certificateProblem) { return true; }
}
"@
[System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# ====== HMAC HELPERS ======
function Get-Sha256Hex([string]$text) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
    return [BitConverter]::ToString($hash).Replace("-", "").ToLower()
}

function Get-HmacSha256Base64([string]$secretB64, [string]$message) {
    $keyBytes = [Convert]::FromBase64String($secretB64)
    $msgBytes = [System.Text.Encoding]::UTF8.GetBytes($message)
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = $keyBytes
    $hash = $hmac.ComputeHash($msgBytes)
    return [Convert]::ToBase64String($hash)
}

function Get-RandomNonce {
    $bytes = New-Object byte[] 16
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [BitConverter]::ToString($bytes).Replace("-", "").ToLower()
}

function Send-HmacRequest([string]$path, [string]$body, [bool]$debug = $false) {
    $method = "POST"
    $fullPath = "$BASE_PATH$path"
    $url = "$API_BASE$fullPath"

    # Minify JSON
    $jsonBody = $body | ConvertFrom-Json | ConvertTo-Json -Compress

    # Compute HMAC - Unix timestamp as integer string
    $epoch = [DateTime]::new(1970, 1, 1, 0, 0, 0, [DateTimeKind]::Utc)
    $timestamp = [Math]::Floor(([DateTime]::UtcNow - $epoch).TotalSeconds).ToString()
    $nonce = Get-RandomNonce
    $bodyHash = Get-Sha256Hex $jsonBody

    $canonical = "$APP_ID`n$KEY_VERSION`n$timestamp`n$nonce`n$method`n$fullPath`n$bodyHash"
    $signature = Get-HmacSha256Base64 $SECRET_BASE64 $canonical

    if ($debug) {
        Write-Host "DEBUG:" -ForegroundColor Magenta
        Write-Host "  URL: $url" -ForegroundColor Gray
        Write-Host "  PATH: $fullPath" -ForegroundColor Gray
        Write-Host "  TIMESTAMP: $timestamp" -ForegroundColor Gray
        Write-Host "  NONCE: $nonce" -ForegroundColor Gray
        Write-Host "  BODYHASH: $bodyHash" -ForegroundColor Gray
        Write-Host "  CANONICAL:" -ForegroundColor Gray
        Write-Host $canonical -ForegroundColor DarkGray
        Write-Host "  SIGNATURE: $signature" -ForegroundColor Gray
        Write-Host "  BODY: $jsonBody" -ForegroundColor Gray
    }

    $headers = @{
        "Content-Type" = "application/json"
        "X-App-Id" = $APP_ID
        "X-Key-Version" = $KEY_VERSION.ToString()
        "X-Timestamp" = $timestamp
        "X-Nonce" = $nonce
        "X-Signature" = $signature
    }

    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $jsonBody
        return $true
    } catch {
        if ($debug) {
            Write-Host "Error details: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
        } else {
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        return $false
    }
}

# ====== TEST LOGS ======
$logs = @(
    @{
        name = "JavaScript/Node.js"
        body = @{
            refApplication = $APP_ID
            category = "error"
            level = "error"
            message = "TypeError: Cannot read property 'length' of undefined"
            payloadJson = '{"error":{"name":"TypeError","message":"Cannot read property ''length'' of undefined","stack":"TypeError: Cannot read property ''length'' of undefined\n    at processItems (/app/src/services/itemService.js:45:23)\n    at async handleRequest (/app/src/controllers/itemController.js:28:5)\n    at async /app/src/middleware/asyncHandler.js:5:5\n    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)"}}'
        }
    },
    @{
        name = "React"
        body = @{
            refApplication = $APP_ID
            category = "error"
            level = "error"
            message = "Unhandled React error in UserProfile component"
            payloadJson = '{"error":{"name":"Error","message":"Cannot update a component while rendering","stack":"Error: Cannot update a component while rendering\n    at UserProfile (http://localhost:3000/static/js/main.chunk.js:1234:15)\n    at div\n    at Dashboard (http://localhost:3000/static/js/main.chunk.js:567:20)\n    at Route\n    at App"},"componentStack":"\n    in UserProfile (at Dashboard.tsx:45)\n    in Dashboard (at App.tsx:23)"}'
        }
    },
    @{
        name = "TypeScript"
        body = @{
            refApplication = $APP_ID
            category = "error"
            level = "error"
            message = "ValidationError: Invalid user input"
            payloadJson = '{"error":{"name":"ValidationError","message":"Invalid user input","stack":"ValidationError: Invalid user input\n    at UserService.validateInput (/app/dist/services/UserService.js:89:15)\n    at UserService.createUser (/app/dist/services/UserService.js:45:14)\n    at UserController.create (/app/dist/controllers/UserController.js:23:28)"}}'
        }
    },
    @{
        name = "C# / .NET"
        body = @{
            refApplication = $APP_ID
            category = "exception"
            level = "error"
            message = "System.NullReferenceException: Object reference not set to an instance of an object"
            payloadJson = '{"exception":{"type":"System.NullReferenceException","message":"Object reference not set to an instance of an object","stackTrace":"   at MyApp.Services.UserService.GetUserById(Guid userId) in C:\\Projects\\MyApp\\Services\\UserService.cs:line 45\n   at MyApp.Controllers.UserController.Get(Guid id) in C:\\Projects\\MyApp\\Controllers\\UserController.cs:line 28\n   at Microsoft.AspNetCore.Mvc.Infrastructure.ActionMethodExecutor.Execute()"}}'
        }
    },
    @{
        name = "Python"
        body = @{
            refApplication = $APP_ID
            category = "exception"
            level = "error"
            message = "KeyError: 'user_id'"
            payloadJson = '{"exc_type":"KeyError","exc_value":"user_id","traceback":"Traceback (most recent call last):\n  File \"/app/main.py\", line 45, in handle_request\n    user = get_user(request.data)\n  File \"/app/services/user_service.py\", line 23, in get_user\n    user_id = data[''user_id'']\nKeyError: ''user_id''"}'
        }
    },
    @{
        name = "Java"
        body = @{
            refApplication = $APP_ID
            category = "exception"
            level = "error"
            message = "java.lang.NullPointerException: Cannot invoke method on null object"
            payloadJson = '{"exception":"java.lang.NullPointerException","message":"Cannot invoke method on null object","stackTrace":"java.lang.NullPointerException: Cannot invoke method on null object\n\tat com.myapp.services.UserService.findById(UserService.java:67)\n\tat com.myapp.controllers.UserController.getUser(UserController.java:34)\n\tat org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:190)"}'
        }
    },
    @{
        name = "Go"
        body = @{
            refApplication = $APP_ID
            category = "error"
            level = "error"
            message = "panic: runtime error: index out of range [5] with length 3"
            payloadJson = '{"error":"index out of range","stacktrace":"goroutine 1 [running]:\nmain.processItems(0xc0000b4000, 0x3, 0x4)\n\t/app/main.go:45 +0x1a5\nmain.handleRequest(0xc0000a8000)\n\t/app/handlers/request.go:28 +0x85\nmain.main()\n\t/app/main.go:15 +0x25"}'
        }
    },
    @{
        name = "Ruby"
        body = @{
            refApplication = $APP_ID
            category = "exception"
            level = "error"
            message = "NoMethodError: undefined method 'name' for nil:NilClass"
            payloadJson = '{"exception":"NoMethodError","message":"undefined method ''name'' for nil:NilClass","backtrace":["/app/app/services/user_service.rb:34:in ''get_user_name''","/app/app/controllers/users_controller.rb:18:in ''show''","/usr/local/bundle/gems/actionpack-7.0.4/lib/action_controller/metal/basic_implicit_render.rb:6:in ''send_action''"]}'
        }
    },
    @{
        name = "PHP"
        body = @{
            refApplication = $APP_ID
            category = "exception"
            level = "error"
            message = "ErrorException: Undefined array key 'user_id'"
            payloadJson = '{"exception":"ErrorException","message":"Undefined array key \"user_id\"","trace":"#0 /var/www/html/app/Services/UserService.php(45): App\\Services\\UserService->getUserById()\n#1 /var/www/html/app/Http/Controllers/UserController.php(28): App\\Services\\UserService->find()\n#2 /var/www/html/vendor/laravel/framework/src/Illuminate/Routing/Controller.php(54): App\\Http\\Controllers\\UserController->show()"}'
        }
    },
    @{
        name = "Rust"
        body = @{
            refApplication = $APP_ID
            category = "error"
            level = "error"
            message = "thread 'main' panicked at 'index out of bounds'"
            payloadJson = '{"error":"panic","message":"index out of bounds: the len is 3 but the index is 5","stack":"stack backtrace:\n   0: rust_begin_unwind\n   1: core::panicking::panic_fmt\n   2: core::panicking::panic_bounds_check\n   3: myapp::services::user_service::get_user\n             at ./src/services/user_service.rs:45:12\n   4: myapp::handlers::user_handler::handle\n             at ./src/handlers/user_handler.rs:28:5"}'
        }
    },
    @{
        name = "Swift/iOS"
        body = @{
            refApplication = $APP_ID
            category = "exception"
            level = "error"
            message = "Fatal error: Unexpectedly found nil while unwrapping an Optional value"
            payloadJson = '{"error":"fatalError","message":"Unexpectedly found nil while unwrapping an Optional value","stack":"0   MyApp    0x0000000104a8c1a4 UserService.getUserName() + 148\n1   MyApp    0x0000000104a8b8f0 UserViewController.viewDidLoad() + 240\n2   UIKitCore    0x00000001a5f8e9a8 -[UIViewController _sendViewDidLoadWithAppearanceProxyObjectTaggingEnabled] + 100"}'
        }
    },
    @{
        name = "Kotlin/Android"
        body = @{
            refApplication = $APP_ID
            category = "exception"
            level = "error"
            message = "kotlin.KotlinNullPointerException"
            payloadJson = '{"exception":"kotlin.KotlinNullPointerException","stackTrace":"kotlin.KotlinNullPointerException\n\tat com.myapp.services.UserService.getUserName(UserService.kt:45)\n\tat com.myapp.ui.UserFragment.onViewCreated(UserFragment.kt:28)\n\tat androidx.fragment.app.Fragment.performViewCreated(Fragment.java:2987)"}'
        }
    },
    @{
        name = "C/C++"
        body = @{
            refApplication = $APP_ID
            category = "error"
            level = "error"
            message = "Segmentation fault (core dumped)"
            payloadJson = '{"signal":"SIGSEGV","message":"Segmentation fault","stack":"#0  0x00005555555551a9 in process_data (data=0x0) at src/processor.c:45\n#1  0x0000555555555234 in handle_request (req=0x7fffffffe3a0) at src/handler.c:28\n#2  0x00005555555552f8 in main (argc=1, argv=0x7fffffffe4b8) at src/main.c:15"}'
        }
    },
    @{
        name = "Vue.js"
        body = @{
            refApplication = $APP_ID
            category = "error"
            level = "error"
            message = "[Vue warn]: Error in render: TypeError: Cannot read properties of undefined"
            payloadJson = '{"error":{"name":"TypeError","message":"Cannot read properties of undefined (reading ''name'')","stack":"TypeError: Cannot read properties of undefined (reading ''name'')\n    at Proxy.render (webpack-internal:///./src/components/UserCard.vue:42:28)\n    at renderComponentRoot (webpack-internal:///./node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js:893:44)"},"component":"UserCard"}'
        }
    },
    @{
        name = "Angular"
        body = @{
            refApplication = $APP_ID
            category = "error"
            level = "error"
            message = "ERROR TypeError: Cannot read property 'id' of undefined"
            payloadJson = '{"error":{"name":"TypeError","message":"Cannot read property ''id'' of undefined","stack":"TypeError: Cannot read property ''id'' of undefined\n    at UserComponent.ngOnInit (http://localhost:4200/main.js:234:45)\n    at callHook (http://localhost:4200/vendor.js:45678:22)\n    at callHooks (http://localhost:4200/vendor.js:45649:17)"},"ngDebugContext":{"component":"UserComponent"}}'
        }
    },
    @{
        name = "Sentry-style frames"
        body = @{
            refApplication = $APP_ID
            category = "error"
            level = "error"
            message = "Unhandled exception from Sentry SDK"
            payloadJson = '{"event_id":"abc123def456","exception":{"type":"ValueError","value":"Invalid input","frames":[{"filename":"app/services/validator.py","function":"validate","lineno":45},{"filename":"app/handlers/api.py","function":"handle_request","lineno":28},{"filename":"app/main.py","function":"main","lineno":15}]}}'
        }
    },
    @{
        name = "Django"
        body = @{
            refApplication = $APP_ID
            category = "exception"
            level = "error"
            message = "DoesNotExist: User matching query does not exist."
            payloadJson = '{"exception":"User.DoesNotExist","traceback":"Traceback (most recent call last):\n  File \"/app/venv/lib/python3.9/site-packages/django/core/handlers/exception.py\", line 47, in inner\n    response = get_response(request)\n  File \"/app/myapp/views.py\", line 45, in user_detail\n    user = User.objects.get(pk=user_id)\nUser.DoesNotExist: User matching query does not exist."}'
        }
    },
    @{
        name = "Express.js/MongoDB"
        body = @{
            refApplication = $APP_ID
            category = "error"
            level = "error"
            message = "MongooseError: Operation users.findOne() buffering timed out"
            payloadJson = '{"error":{"name":"MongooseError","message":"Operation users.findOne() buffering timed out after 10000ms","stack":"MongooseError: Operation users.findOne() buffering timed out after 10000ms\n    at Timeout.<anonymous> (/app/node_modules/mongoose/lib/drivers/node-mongodb-native/collection.js:185:23)\n    at listOnTimeout (node:internal/timers:559:17)"}}'
        }
    },
    @{
        name = ".NET Core SQL"
        body = @{
            refApplication = $APP_ID
            category = "exception"
            level = "error"
            message = "Microsoft.Data.SqlClient.SqlException: A network-related error occurred"
            payloadJson = '{"exception":{"type":"Microsoft.Data.SqlClient.SqlException","message":"A network-related or instance-specific error occurred while establishing a connection to SQL Server.","stackTrace":"   at Microsoft.Data.SqlClient.SqlInternalConnection.OnError(SqlException exception)\n   at Microsoft.Data.SqlClient.TdsParser.ThrowExceptionAndWarning(TdsParserStateObject stateObj)\n   at Microsoft.Data.SqlClient.TdsParser.Connect(ServerInfo serverInfo)"},"innerException":{"type":"System.ComponentModel.Win32Exception","message":"The network path was not found"}}'
        }
    },
    @{
        name = "React Native"
        body = @{
            refApplication = $APP_ID
            category = "error"
            level = "error"
            message = "Invariant Violation: Text strings must be rendered within a <Text> component"
            payloadJson = '{"error":{"name":"Invariant Violation","message":"Text strings must be rendered within a <Text> component","stack":"Invariant Violation: Text strings must be rendered within a <Text> component\n    at UserCard (http://localhost:8081/index.bundle?platform=ios:12345:20)\n    at RCTView\n    at View (http://localhost:8081/index.bundle?platform=ios:23456:43)\n    at HomeScreen (http://localhost:8081/index.bundle?platform=ios:34567:12)\n    at SceneView (http://localhost:8081/index.bundle?platform=ios:45678:23)"}}'
        }
    }
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OMNIA Log Test Script (HMAC Auth)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($SECRET_BASE64 -eq "YOUR_SECRET_HERE") {
    Write-Host "ERROR: Please set your SECRET_BASE64 in the script!" -ForegroundColor Red
    Write-Host "Edit test-logs.ps1 and replace 'YOUR_SECRET_HERE' with your actual secret." -ForegroundColor Yellow
    exit 1
}

$successCount = 0
$failCount = 0
$isFirst = $true

foreach ($log in $logs) {
    $jsonBody = $log.body | ConvertTo-Json -Depth 10
    $result = Send-HmacRequest "/log" $jsonBody $isFirst

    if ($result) {
        Write-Host "[OK] $($log.name)" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "[FAIL] $($log.name)" -ForegroundColor Red
        $failCount++
    }

    $isFirst = $false
    Start-Sleep -Milliseconds 100
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Results: $successCount success, $failCount failed" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check your frontend Logs page to verify stack trace formatting!" -ForegroundColor Yellow
