---
sidebar_position: 3
title: "Challenge 27: Feature flags"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 27: Feature flags

## Exam skills mapped

- Implement feature flags by using Azure App Configuration Feature Manager

## Scenario

Contoso Ltd wants to decouple their deployment cadence from feature releases. Currently, a "big bang" release every two weeks bundles multiple features together, making it difficult to isolate which feature causes issues. The product team wants the ability to:

1. Deploy code to production with features hidden behind flags
2. Enable features for internal users first (ring 0)
3. Gradually roll out to beta testers by percentage
4. Instantly disable a feature without redeploying if issues are detected
5. Run A/B tests comparing the new checkout flow against the existing one

**Environment details:**
- .NET 8 Web API application
- Azure App Configuration: `appconfig-contoso-prod`
- Resource group: `rg-contoso-config`
- Region: East US

---

## Task 1: Create Azure App Configuration resource

### Provision the App Configuration store

```bash
RESOURCE_GROUP="rg-contoso-config"
LOCATION="eastus"
CONFIG_STORE="appconfig-contoso-prod"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Configuration store (Standard tier for feature flags)
az appconfig create \
  --name $CONFIG_STORE \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard

# Enable managed identity for the App Configuration store
az appconfig identity assign \
  --name $CONFIG_STORE \
  --resource-group $RESOURCE_GROUP
```

### Configure RBAC for applications to read feature flags

```bash
# Get the App Configuration resource ID
CONFIG_ID=$(az appconfig show \
  --name $CONFIG_STORE \
  --resource-group $RESOURCE_GROUP \
  --query id -o tsv)

# Get the web app managed identity principal ID
APP_PRINCIPAL_ID=$(az webapp identity show \
  --name app-contoso-web \
  --resource-group rg-contoso-webapp-prod \
  --query principalId -o tsv)

# Assign App Configuration Data Reader role
az role assignment create \
  --assignee $APP_PRINCIPAL_ID \
  --role "App Configuration Data Reader" \
  --scope $CONFIG_ID
```

---

## Task 2: Configure feature flags (boolean, targeting, time window)

### Create basic boolean feature flags

```bash
# Simple on/off feature flag
az appconfig feature set \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --label production \
  --description "New streamlined checkout experience" \
  --yes

# Disable the flag initially (safe deployment)
az appconfig feature disable \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --label production \
  --yes

# Create a time-window feature flag
az appconfig feature set \
  --name $CONFIG_STORE \
  --feature MaintenanceMode \
  --label production \
  --description "Enable maintenance mode banner" \
  --yes

# Add a time window filter
az appconfig feature filter add \
  --name $CONFIG_STORE \
  --feature MaintenanceMode \
  --label production \
  --filter-name "Microsoft.TimeWindow" \
  --filter-parameters Start="2025-03-01T00:00:00Z" End="2025-03-01T06:00:00Z"
```

### Create a targeting feature flag (percentage rollout)

```bash
# Create the feature flag for gradual rollout
az appconfig feature set \
  --name $CONFIG_STORE \
  --feature NewPaymentProcessor \
  --label production \
  --description "New payment processing engine with improved performance" \
  --yes

# Add targeting filter for percentage-based rollout
az appconfig feature filter add \
  --name $CONFIG_STORE \
  --feature NewPaymentProcessor \
  --label production \
  --filter-name "Microsoft.Targeting" \
  --filter-parameters \
    Audience.DefaultRolloutPercentage=0 \
    Audience.Groups.0.Name="InternalTeam" \
    Audience.Groups.0.RolloutPercentage=100 \
    Audience.Groups.1.Name="BetaTesters" \
    Audience.Groups.1.RolloutPercentage=50 \
    Audience.Users.0="admin@contoso.com" \
    Audience.Users.1="productmanager@contoso.com"
```

### List and manage feature flags

```bash
# List all feature flags
az appconfig feature list \
  --name $CONFIG_STORE \
  --label production \
  --query "[].{name:name, state:state, description:description}" \
  --output table

# Enable a feature flag
az appconfig feature enable \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --label production \
  --yes

# Disable a feature flag (instant kill switch)
az appconfig feature disable \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --label production \
  --yes
```

---

## Task 3: Implement feature flags in a .NET app

### Install required NuGet packages

```bash
dotnet add package Microsoft.Azure.AppConfiguration.AspNetCore
dotnet add package Microsoft.FeatureManagement.AspNetCore
```

### Configure the application to use App Configuration

In `Program.cs`:

```csharp
using Microsoft.FeatureManagement;
using Azure.Identity;

var builder = WebApplication.CreateBuilder(args);

// Connect to Azure App Configuration
var appConfigEndpoint = builder.Configuration["AppConfig:Endpoint"];
builder.Configuration.AddAzureAppConfiguration(options =>
{
    options.Connect(new Uri(appConfigEndpoint), new DefaultAzureCredential())
           .UseFeatureFlags(featureFlagOptions =>
           {
               featureFlagOptions.Label = "production";
               featureFlagOptions.CacheExpirationInterval = TimeSpan.FromSeconds(30);
           });
});

// Add feature management services
builder.Services.AddFeatureManagement()
    .AddFeatureFilter<TargetingFilter>();

// Add Azure App Configuration middleware for dynamic refresh
builder.Services.AddAzureAppConfiguration();

// Register targeting context accessor
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<ITargetingContextAccessor, HttpContextTargetingContextAccessor>();

builder.Services.AddControllers();
var app = builder.Build();

// Use Azure App Configuration middleware
app.UseAzureAppConfiguration();

app.MapControllers();
app.Run();
```

### Configure `appsettings.json`

```json
{
  "AppConfig": {
    "Endpoint": "https://appconfig-contoso-prod.azconfig.io"
  }
}
```

### Use feature flags in controllers

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.FeatureManagement;
using Microsoft.FeatureManagement.Mvc;

[ApiController]
[Route("api/[controller]")]
public class CheckoutController : ControllerBase
{
    private readonly IFeatureManager _featureManager;
    private readonly ILogger<CheckoutController> _logger;

    public CheckoutController(IFeatureManager featureManager, ILogger<CheckoutController> logger)
    {
        _featureManager = featureManager;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> ProcessCheckout([FromBody] CheckoutRequest request)
    {
        if (await _featureManager.IsEnabledAsync("NewCheckoutFlow"))
        {
            _logger.LogInformation("Processing with new checkout flow");
            return await ProcessNewCheckout(request);
        }

        _logger.LogInformation("Processing with legacy checkout flow");
        return await ProcessLegacyCheckout(request);
    }

    // Gate an entire endpoint behind a feature flag
    [FeatureGate("NewPaymentProcessor")]
    [HttpPost("v2/payment")]
    public async Task<IActionResult> ProcessPaymentV2([FromBody] PaymentRequest request)
    {
        return Ok(new { processor = "v2", transactionId = Guid.NewGuid() });
    }

    private async Task<IActionResult> ProcessNewCheckout(CheckoutRequest request)
    {
        // New checkout logic
        return Ok(new { flow = "new", orderId = Guid.NewGuid() });
    }

    private async Task<IActionResult> ProcessLegacyCheckout(CheckoutRequest request)
    {
        // Legacy checkout logic
        return Ok(new { flow = "legacy", orderId = Guid.NewGuid() });
    }
}
```

---

## Task 4: Implement targeting filters (user groups, percentages)

### Custom targeting context accessor

```csharp
using Microsoft.FeatureManagement.FeatureFilters;

public class HttpContextTargetingContextAccessor : ITargetingContextAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpContextTargetingContextAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public ValueTask<TargetingContext> GetContextAsync()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        var user = httpContext?.User;

        var targetingContext = new TargetingContext
        {
            UserId = user?.Identity?.Name ?? "anonymous",
            Groups = GetUserGroups(user)
        };

        return new ValueTask<TargetingContext>(targetingContext);
    }

    private IEnumerable<string> GetUserGroups(System.Security.Claims.ClaimsPrincipal? user)
    {
        if (user == null) return Enumerable.Empty<string>();

        var groups = new List<string>();

        // Add internal team group based on email domain
        var email = user.FindFirst("email")?.Value ?? "";
        if (email.EndsWith("@contoso.com"))
            groups.Add("InternalTeam");

        // Add beta testers group based on claim
        if (user.HasClaim("beta_tester", "true"))
            groups.Add("BetaTesters");

        // Add enterprise users group
        if (user.HasClaim("tier", "enterprise"))
            groups.Add("EnterpriseUsers");

        return groups;
    }
}
```

### Targeting with percentage rollout per group

```csharp
[HttpGet("features/status")]
public async Task<IActionResult> GetFeatureStatus()
{
    var features = new Dictionary<string, bool>
    {
        ["NewCheckoutFlow"] = await _featureManager.IsEnabledAsync("NewCheckoutFlow"),
        ["NewPaymentProcessor"] = await _featureManager.IsEnabledAsync("NewPaymentProcessor"),
        ["MaintenanceMode"] = await _featureManager.IsEnabledAsync("MaintenanceMode")
    };

    return Ok(features);
}
```

---

## Task 5: Integrate feature flags with CI/CD pipeline

### GitHub Actions workflow that toggles feature flag after deployment verification

Create `.github/workflows/deploy-with-feature-flag.yml`:

```yaml
name: Deploy and enable feature flag

on:
  push:
    branches: [main]
    paths:
      - 'src/WebApp/**'

env:
  CONFIG_STORE: appconfig-contoso-prod
  RESOURCE_GROUP: rg-contoso-config
  APP_NAME: app-contoso-web

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Build and publish
        run: |
          dotnet publish src/WebApp/WebApp.csproj \
            --configuration Release \
            --output ./publish

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.APP_NAME }}
          slot-name: staging
          package: ./publish

      - name: Validate deployment
        run: |
          STAGING_URL="https://${{ env.APP_NAME }}-staging.azurewebsites.net"
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/health")
          if [ "$STATUS" != "200" ]; then
            echo "Deployment validation failed"
            exit 1
          fi

      - name: Swap to production
        run: |
          az webapp deployment slot swap \
            --name ${{ env.APP_NAME }} \
            --resource-group rg-contoso-webapp-prod \
            --slot staging \
            --target-slot production

      - name: Enable feature flag for internal team
        run: |
          az appconfig feature enable \
            --name ${{ env.CONFIG_STORE }} \
            --feature NewCheckoutFlow \
            --label production \
            --yes
          echo "Feature 'NewCheckoutFlow' enabled for internal team"
```

### Azure Pipelines feature flag toggle

```yaml
- task: AzureCLI@2
  displayName: 'Toggle feature flag based on deployment success'
  inputs:
    azureSubscription: 'contoso-production-connection'
    scriptType: 'bash'
    scriptLocation: 'inlineScript'
    inlineScript: |
      FEATURE_NAME="NewCheckoutFlow"
      CONFIG_STORE="appconfig-contoso-prod"
      LABEL="production"

      HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://app-contoso-web.azurewebsites.net/health")

      if [ "$HEALTH_STATUS" == "200" ]; then
        az appconfig feature enable \
          --name $CONFIG_STORE \
          --feature $FEATURE_NAME \
          --label $LABEL \
          --yes
        echo "Feature flag '$FEATURE_NAME' enabled"
      else
        az appconfig feature disable \
          --name $CONFIG_STORE \
          --feature $FEATURE_NAME \
          --label $LABEL \
          --yes
        echo "Deployment unhealthy - feature flag '$FEATURE_NAME' disabled"
      fi
```

---

## Task 6: GitHub Actions workflow for feature flag management

Create `.github/workflows/feature-flag-management.yml`:

```yaml
name: Feature flag management

on:
  workflow_dispatch:
    inputs:
      feature_name:
        description: 'Feature flag name'
        required: true
        type: string
      action:
        description: 'Action to perform'
        required: true
        type: choice
        options:
          - enable
          - disable
          - rollout-10
          - rollout-50
          - rollout-100
      label:
        description: 'Label (environment)'
        required: true
        default: 'production'
        type: string

env:
  CONFIG_STORE: appconfig-contoso-prod

jobs:
  manage-feature-flag:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Perform feature flag action
        run: |
          FEATURE="${{ inputs.feature_name }}"
          ACTION="${{ inputs.action }}"
          LABEL="${{ inputs.label }}"

          case $ACTION in
            enable)
              az appconfig feature enable \
                --name ${{ env.CONFIG_STORE }} \
                --feature "$FEATURE" \
                --label "$LABEL" \
                --yes
              echo "Feature '$FEATURE' enabled"
              ;;
            disable)
              az appconfig feature disable \
                --name ${{ env.CONFIG_STORE }} \
                --feature "$FEATURE" \
                --label "$LABEL" \
                --yes
              echo "Feature '$FEATURE' disabled (kill switch activated)"
              ;;
            rollout-10)
              az appconfig feature filter update \
                --name ${{ env.CONFIG_STORE }} \
                --feature "$FEATURE" \
                --label "$LABEL" \
                --filter-name "Microsoft.Targeting" \
                --filter-parameters Audience.DefaultRolloutPercentage=10 \
                --yes
              echo "Feature '$FEATURE' rolling out to 10%"
              ;;
            rollout-50)
              az appconfig feature filter update \
                --name ${{ env.CONFIG_STORE }} \
                --feature "$FEATURE" \
                --label "$LABEL" \
                --filter-name "Microsoft.Targeting" \
                --filter-parameters Audience.DefaultRolloutPercentage=50 \
                --yes
              echo "Feature '$FEATURE' rolling out to 50%"
              ;;
            rollout-100)
              az appconfig feature filter update \
                --name ${{ env.CONFIG_STORE }} \
                --feature "$FEATURE" \
                --label "$LABEL" \
                --filter-name "Microsoft.Targeting" \
                --filter-parameters Audience.DefaultRolloutPercentage=100 \
                --yes
              echo "Feature '$FEATURE' fully rolled out to 100%"
              ;;
          esac

      - name: Verify feature flag state
        run: |
          az appconfig feature show \
            --name ${{ env.CONFIG_STORE }} \
            --feature "${{ inputs.feature_name }}" \
            --label "${{ inputs.label }}"
```

---

## Task 7: A/B testing with feature flags

### Configure an A/B test using targeting percentages

```bash
# Create an A/B test feature flag with 50/50 split
az appconfig feature set \
  --name $CONFIG_STORE \
  --feature CheckoutExperiment \
  --label production \
  --description "A/B test: new checkout vs existing checkout" \
  --yes

az appconfig feature filter add \
  --name $CONFIG_STORE \
  --feature CheckoutExperiment \
  --label production \
  --filter-name "Microsoft.Targeting" \
  --filter-parameters \
    Audience.DefaultRolloutPercentage=50

az appconfig feature enable \
  --name $CONFIG_STORE \
  --feature CheckoutExperiment \
  --label production \
  --yes
```

### Track A/B test results in Application Insights

```csharp
[HttpPost("checkout")]
public async Task<IActionResult> Checkout([FromBody] CheckoutRequest request)
{
    var isNewCheckout = await _featureManager.IsEnabledAsync("CheckoutExperiment");
    var variant = isNewCheckout ? "new_checkout" : "legacy_checkout";

    // Track which variant the user is in
    _telemetryClient.TrackEvent("CheckoutStarted", new Dictionary<string, string>
    {
        ["variant"] = variant,
        ["userId"] = User.Identity?.Name ?? "anonymous"
    });

    var stopwatch = System.Diagnostics.Stopwatch.StartNew();

    IActionResult result = isNewCheckout
        ? await ProcessNewCheckout(request)
        : await ProcessLegacyCheckout(request);

    stopwatch.Stop();

    // Track completion metrics for both variants
    _telemetryClient.TrackMetric("CheckoutDurationMs", stopwatch.ElapsedMilliseconds,
        new Dictionary<string, string> { ["variant"] = variant });

    return result;
}
```

### Query A/B test results in Application Insights (KQL)

```kusto
// Compare conversion rates between variants
customEvents
| where name == "CheckoutCompleted"
| extend variant = tostring(customDimensions["variant"])
| summarize
    totalAttempts = count(),
    successCount = countif(tostring(customDimensions["success"]) == "true")
    by variant
| extend conversionRate = round(100.0 * successCount / totalAttempts, 2)
| project variant, totalAttempts, successCount, conversionRate
```

---

## Break & fix

### Exercise 1: Feature flag not refreshing

**Symptom:** A feature flag was enabled in Azure App Configuration 10 minutes ago, but the application still shows the old behavior.

**Investigate:**
```bash
# Verify the flag is enabled in App Configuration
az appconfig feature show \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --label production \
  --query "{state:state, lastModified:lastModified}"
```


<details>
<summary>Show solution</summary>

**Root cause:** The `CacheExpirationInterval` is set too high (default may have been overridden), or the Azure App Configuration middleware (`app.UseAzureAppConfiguration()`) is missing from the pipeline.


**Fix:**
```csharp
// Ensure cache expiration is set to 30 seconds
options.UseFeatureFlags(featureFlagOptions =>
{
    featureFlagOptions.CacheExpirationInterval = TimeSpan.FromSeconds(30);
    featureFlagOptions.Label = "production";
});

// Ensure middleware is registered in the correct order
app.UseAzureAppConfiguration(); // Must be before app.MapControllers()
app.MapControllers();
```

</details>

### Exercise 2: Targeting filter not applying correctly

**Symptom:** Internal team members (with @contoso.com email) are not seeing the new feature even though the targeting filter includes them at 100%.


<details>
<summary>Show solution</summary>

**Root cause:** The `IHttpContextAccessor` is not registered in the DI container, so the `HttpContext` is null and the targeting context resolver returns "anonymous" with no groups.


**Fix:**
```csharp
// In Program.cs, register IHttpContextAccessor
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<ITargetingContextAccessor, HttpContextTargetingContextAccessor>();
```

</details>

### Exercise 3: Feature flag label mismatch

**Symptom:** Feature flags work in staging but not in production. The flag is shown as enabled in the Azure portal.

**Investigate:**
```bash
# Check what labels exist for the feature
az appconfig feature list \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --query "[].{label:label, state:state}"
```


<details>
<summary>Show solution</summary>

**Root cause:** The flag was enabled with label `staging` but the production app is configured to read label `production`.


**Fix:**
```bash
# Enable the flag with the correct label
az appconfig feature enable \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --label production \
  --yes
```


</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Contoso wants to enable a new feature for 10% of all users, 100% of internal team members, and specific named beta testers. Which Azure App Configuration feature flag filter should they use?",
    options: [
      "Microsoft.TimeWindow filter",
      "Microsoft.Targeting filter",
      "Microsoft.Percentage filter",
      "Custom filter with Azure AD group membership"
    ],
    correctIndex: 1,
    explanation: "The Microsoft.Targeting filter supports all three requirements: percentage-based rollout (DefaultRolloutPercentage), group-based targeting with different percentages per group, and specific user targeting by user ID. The TimeWindow filter only supports time-based activation. The Percentage filter only supports a global percentage without group or user granularity."
  },
  {
    question: "A .NET application uses Azure App Configuration feature flags, but changes made in the portal take over 5 minutes to reflect in the application. What configuration change reduces this delay to under 30 seconds?",
    options: [
      "Enable real-time push notifications via Azure Event Grid",
      "Set 'CacheExpirationInterval' to 'TimeSpan.FromSeconds(30)' in 'UseFeatureFlags' options",
      "Restart the App Service after each feature flag change",
      "Set the App Configuration SKU to Premium for faster replication"
    ],
    correctIndex: 1,
    explanation: "The CacheExpirationInterval controls how often the feature management library checks App Configuration for updates. The default is 30 seconds, but if it was overridden to a higher value, reducing it ensures the application picks up changes faster. The Azure App Configuration middleware uses a polling model, so the interval directly determines the maximum delay."
  },
  {
    question: "Contoso deploys new code that includes a feature behind a feature flag. The flag is disabled at deploy time. After verifying the deployment is healthy, the pipeline enables the flag. If the feature causes errors, what is the fastest remediation?",
    options: [
      "Redeploy the previous version of the application",
      "Disable the feature flag in Azure App Configuration",
      "Perform a slot swap back to the previous version",
      "Scale out the App Service to handle the additional error load"
    ],
    correctIndex: 1,
    explanation: "Disabling the feature flag is instant (takes effect within the cache expiration interval, typically 30 seconds) and requires no deployment or infrastructure change. A slot swap or redeployment takes minutes. This is the primary advantage of feature flags: they decouple deployment from release and provide an instant kill switch."
  },
  {
    question: "Which NuGet package provides the '[FeatureGate]' attribute for gating ASP.NET Core controller actions behind feature flags?",
    options: [
      "Microsoft.Azure.AppConfiguration.AspNetCore",
      "Microsoft.FeatureManagement.AspNetCore",
      "Azure.Data.AppConfiguration",
      "Microsoft.Extensions.Configuration.AzureAppConfiguration"
    ],
    correctIndex: 1,
    explanation: "The Microsoft.FeatureManagement.AspNetCore package provides the [FeatureGate] attribute, IFeatureManager interface, and ASP.NET Core integration including tag helpers and action filters. The Microsoft.Azure.AppConfiguration.AspNetCore package provides the connection to Azure App Configuration but does not include the feature management attributes."
  }
]} />

## Cleanup

```bash
# Delete feature flags
az appconfig feature delete \
  --name $CONFIG_STORE \
  --feature NewCheckoutFlow \
  --label production \
  --yes

az appconfig feature delete \
  --name $CONFIG_STORE \
  --feature NewPaymentProcessor \
  --label production \
  --yes

az appconfig feature delete \
  --name $CONFIG_STORE \
  --feature CheckoutExperiment \
  --label production \
  --yes

# Delete the resource group
az group delete --name rg-contoso-config --yes --no-wait
```
