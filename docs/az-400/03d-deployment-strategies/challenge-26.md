---
sidebar_position: 2
title: "Challenge 26: Rolling deployments and slot swaps"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 26: Rolling deployments and slot swaps

## Exam skills mapped

- Plan for minimizing downtime during deployments by using load balancing, rolling deployments, and deployment slot usage and swap

## Scenario

Contoso Ltd runs their customer-facing web application on Azure App Service with 4 instances behind the built-in load balancer. The application serves 2 million page views per day. During their last deployment, all instances were updated simultaneously, causing a 3-minute outage that resulted in 4,200 failed requests and a flood of customer support tickets.

The engineering team needs to implement rolling deployments that update instances gradually while maintaining availability, and leverage deployment slots for zero-downtime releases with proper warm-up and auto-swap configurations.

**Environment details:**
- Azure App Service Plan: Premium V3, 4 instances
- Azure DevOps organization: `contoso-devops`
- Project: `WebApp`
- Resource group: `rg-contoso-webapp-prod`
- Region: West US 2

---

## Task 1: Configure Azure App Service deployment slots

Create a multi-slot deployment architecture with staging and pre-production environments.

### Provision slots

```bash
RESOURCE_GROUP="rg-contoso-webapp-prod"
APP_NAME="app-contoso-web"

# Create staging slot
az webapp deployment slot create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging

# Create pre-production slot (for integration testing)
az webapp deployment slot create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot preprod

# List all slots
az webapp deployment slot list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[].name" -o tsv
```

### Configure slot traffic routing for testing

```bash
# Route 10% of production traffic to staging for pre-swap validation
az webapp traffic-routing set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --distribution staging=10

# Verify traffic routing configuration
az webapp traffic-routing show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP
```

---

## Task 2: Configure auto-swap

Enable auto-swap so that deployments to the staging slot automatically swap to production after warm-up completes.

```bash
# Enable auto-swap on the staging slot
az webapp deployment slot auto-swap \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --auto-swap-slot production

# Verify auto-swap configuration
az webapp config show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --query "autoSwapSlotName"
```

### How auto-swap works

1. Code is deployed to the staging slot
2. Azure automatically warms up the staging slot by sending requests to its root path
3. Once warm-up is complete, Azure performs the swap automatically
4. If warm-up fails, the swap does not occur

### Disable auto-swap (when manual validation is needed)

```bash
az webapp deployment slot auto-swap \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --auto-swap-slot ""
```

---

## Task 3: Slot-specific app settings (sticky settings)

Configure settings that stay with a slot rather than moving with the application during swap.

```bash
# Production slot settings (slot-sticky)
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot-settings \
    "ENVIRONMENT=production" \
    "CACHE_CONNECTION=redis-contoso-prod.redis.cache.windows.net:6380" \
    "APPINSIGHTS_INSTRUMENTATIONKEY=<prod-key>"

# Staging slot settings (slot-sticky)
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --slot-settings \
    "ENVIRONMENT=staging" \
    "CACHE_CONNECTION=redis-contoso-staging.redis.cache.windows.net:6380" \
    "APPINSIGHTS_INSTRUMENTATIONKEY=<staging-key>"

# Non-sticky settings (these WILL swap with the app code)
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "API_VERSION=v2.3.1" \
    "FEATURE_NEW_CHECKOUT=true"
```

### Connection strings that stay with slots

```bash
# Production connection string (slot-sticky)
az webapp config connection-string set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --connection-string-type SQLAzure \
  --slot-settings \
    "DefaultConnection=Server=sql-contoso-prod.database.windows.net;Database=ContosoWeb;Authentication=Active Directory Managed Identity;"

# Staging connection string (slot-sticky)
az webapp config connection-string set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --connection-string-type SQLAzure \
  --slot-settings \
    "DefaultConnection=Server=sql-contoso-staging.database.windows.net;Database=ContosoWeb;Authentication=Active Directory Managed Identity;"
```

---

## Task 4: Rolling deployment with Azure Pipelines and VMSS

For Contoso's backend services running on Virtual Machine Scale Sets (VMSS), implement a rolling update strategy.

### Configure VMSS rolling update policy

```bash
VMSS_NAME="vmss-contoso-backend"

# Configure rolling upgrade policy
az vmss update \
  --name $VMSS_NAME \
  --resource-group $RESOURCE_GROUP \
  --set upgradePolicy.mode=Rolling \
  --set upgradePolicy.rollingUpgradePolicy.maxBatchInstancePercent=25 \
  --set upgradePolicy.rollingUpgradePolicy.maxUnhealthyInstancePercent=25 \
  --set upgradePolicy.rollingUpgradePolicy.maxUnhealthyUpgradedInstancePercent=25 \
  --set upgradePolicy.rollingUpgradePolicy.pauseTimeBetweenBatches="PT30S"
```

### Azure Pipelines YAML for VMSS rolling deployment

Create `azure-pipelines-vmss-rolling.yml`:

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - src/BackendService/**

pool:
  vmImage: 'ubuntu-latest'

variables:
  resourceGroup: 'rg-contoso-webapp-prod'
  vmssName: 'vmss-contoso-backend'
  azureSubscription: 'contoso-production-connection'

stages:
  - stage: Build
    displayName: 'Build application'
    jobs:
      - job: BuildApp
        steps:
          - task: UseDotNet@2
            inputs:
              packageType: 'sdk'
              version: '8.0.x'

          - script: |
              dotnet publish src/BackendService/BackendService.csproj \
                --configuration Release \
                --output $(Build.ArtifactStagingDirectory)/app
            displayName: 'Build and publish'

          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)/app'
              ArtifactName: 'backend-app'

  - stage: Deploy
    displayName: 'Rolling deployment to VMSS'
    dependsOn: Build
    jobs:
      - deployment: RollingDeploy
        environment: 'production'
        strategy:
          rolling:
            maxParallel: 25%
            preDeploy:
              steps:
                - task: AzureCLI@2
                  displayName: 'Drain instance from load balancer'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      echo "Draining instance from load balancer pool..."
                      sleep 30
            deploy:
              steps:
                - download: current
                  artifact: backend-app

                - task: AzureCLI@2
                  displayName: 'Deploy to instance'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      echo "Deploying new version to instance..."
                      az vmss extension set \
                        --vmss-name $(vmssName) \
                        --resource-group $(resourceGroup) \
                        --name CustomScript \
                        --publisher Microsoft.Azure.Extensions \
                        --version 2.1 \
                        --settings '{"commandToExecute":"bash /opt/deploy/update-app.sh"}'
            routeTraffic:
              steps:
                - task: AzureCLI@2
                  displayName: 'Re-enable instance in load balancer'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      echo "Adding instance back to load balancer pool..."
            postRouteTraffic:
              steps:
                - task: AzureCLI@2
                  displayName: 'Verify instance health'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      echo "Running health check on updated instance..."
                      sleep 15
                      HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
                      if [ "$HEALTH_STATUS" != "200" ]; then
                        echo "##vso[task.logissue type=error]Health check failed"
                        exit 1
                      fi
            on:
              failure:
                steps:
                  - task: AzureCLI@2
                    displayName: 'Rollback instance'
                    inputs:
                      azureSubscription: $(azureSubscription)
                      scriptType: 'bash'
                      scriptLocation: 'inlineScript'
                      inlineScript: |
                        echo "Rolling back failed instance..."
                        az vmss extension set \
                          --vmss-name $(vmssName) \
                          --resource-group $(resourceGroup) \
                          --name CustomScript \
                          --publisher Microsoft.Azure.Extensions \
                          --version 2.1 \
                          --settings '{"commandToExecute":"bash /opt/deploy/rollback-app.sh"}'
```

---

## Task 5: Health probes during rolling updates

Configure health probes that the load balancer uses to determine if an instance is ready to receive traffic.

### Application health extension for VMSS

```bash
# Install the Application Health extension
az vmss extension set \
  --vmss-name $VMSS_NAME \
  --resource-group $RESOURCE_GROUP \
  --name ApplicationHealthLinux \
  --publisher Microsoft.ManagedServices \
  --version 1.0 \
  --settings '{
    "protocol": "http",
    "port": 8080,
    "requestPath": "/health",
    "intervalInSeconds": 5,
    "numberOfProbes": 3,
    "gracePeriod": 600
  }'

# Configure automatic instance repair
az vmss update \
  --name $VMSS_NAME \
  --resource-group $RESOURCE_GROUP \
  --set automaticRepairsPolicy.enabled=true \
  --set automaticRepairsPolicy.gracePeriod="PT30M"
```

### App Service health check configuration

```bash
# Enable health check for the App Service
az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --generic-configurations '{"healthCheckPath":"/health"}'
```

---

## Task 6: Warm-up configuration for slots

Configure application initialization rules that ensure the application is fully loaded before receiving production traffic.

### App Service warm-up settings

```bash
# Configure slot warm-up path and expected status
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --settings \
    "WEBSITE_SWAP_WARMUP_PING_PATH=/health/ready" \
    "WEBSITE_SWAP_WARMUP_PING_STATUSES=200" \
    "WEBSITE_WARMUP_PATH=/api/warmup"
```

### Application initialization module (for Windows App Service)

For Windows-based App Service, configure `web.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <applicationInitialization doAppInitAfterRestart="true">
      <add initializationPage="/health" hostName="" />
      <add initializationPage="/api/products" hostName="" />
      <add initializationPage="/api/categories" hostName="" />
    </applicationInitialization>
  </system.webServer>
</configuration>
```

### Custom warm-up endpoint in application code

```csharp
[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    private readonly IDistributedCache _cache;
    private readonly IProductRepository _products;

    public HealthController(IDistributedCache cache, IProductRepository products)
    {
        _cache = cache;
        _products = products;
    }

    [HttpGet("ready")]
    public async Task<IActionResult> Ready()
    {
        // Warm up the distributed cache connection
        var cacheStatus = await _cache.GetStringAsync("warmup-check");
        if (cacheStatus == null)
        {
            await _cache.SetStringAsync("warmup-check", "initialized",
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
                });
        }

        // Pre-load frequently accessed data
        var productCount = await _products.GetCountAsync();
        if (productCount == 0)
        {
            return StatusCode(503, "Data not yet loaded");
        }

        return Ok(new { status = "ready", products = productCount });
    }
}
```

---

## Task 7: Azure Pipelines YAML for slot swap deployment

Create a complete Azure Pipelines workflow that deploys to staging, validates, and swaps.

Create `azure-pipelines-slot-swap.yml`:

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - src/WebApp/**

pool:
  vmImage: 'ubuntu-latest'

variables:
  azureSubscription: 'contoso-production-connection'
  resourceGroup: 'rg-contoso-webapp-prod'
  appName: 'app-contoso-web'
  dotnetVersion: '8.0.x'

stages:
  - stage: Build
    displayName: 'Build application'
    jobs:
      - job: Build
        steps:
          - task: UseDotNet@2
            inputs:
              packageType: 'sdk'
              version: $(dotnetVersion)

          - script: |
              dotnet restore src/WebApp/WebApp.csproj
              dotnet build src/WebApp/WebApp.csproj --configuration Release --no-restore
              dotnet test tests/WebApp.Tests/WebApp.Tests.csproj --configuration Release
              dotnet publish src/WebApp/WebApp.csproj --configuration Release --output $(Build.ArtifactStagingDirectory)/webapp
            displayName: 'Build, test, and publish'

          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)/webapp'
              ArtifactName: 'webapp'

  - stage: DeployStaging
    displayName: 'Deploy to staging slot'
    dependsOn: Build
    jobs:
      - deployment: DeployStaging
        environment: 'staging'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  displayName: 'Deploy to staging slot'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    appType: 'webAppLinux'
                    appName: $(appName)
                    deployToSlotOrASE: true
                    resourceGroupName: $(resourceGroup)
                    slotName: 'staging'
                    package: '$(Pipeline.Workspace)/webapp'

                - task: AzureCLI@2
                  displayName: 'Wait for warm-up'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      echo "Waiting for staging slot to warm up..."
                      STAGING_URL="https://$(appName)-staging.azurewebsites.net/health/ready"
                      MAX_ATTEMPTS=20
                      ATTEMPT=0

                      while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
                        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL")
                        if [ "$HTTP_STATUS" == "200" ]; then
                          echo "Staging is warm and ready (attempt $ATTEMPT)"
                          exit 0
                        fi
                        echo "Attempt $ATTEMPT: status=$HTTP_STATUS, waiting..."
                        ATTEMPT=$((ATTEMPT + 1))
                        sleep 15
                      done
                      echo "##vso[task.logissue type=error]Staging warm-up failed after $MAX_ATTEMPTS attempts"
                      exit 1

  - stage: ValidateStaging
    displayName: 'Validate staging deployment'
    dependsOn: DeployStaging
    jobs:
      - job: SmokeTests
        steps:
          - task: AzureCLI@2
            displayName: 'Run smoke tests against staging'
            inputs:
              azureSubscription: $(azureSubscription)
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                STAGING_URL="https://$(appName)-staging.azurewebsites.net"

                # Test health endpoint
                STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/health")
                [ "$STATUS" == "200" ] || { echo "Health check failed"; exit 1; }

                # Test API endpoint
                STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/api/products")
                [ "$STATUS" == "200" ] || { echo "Products API failed"; exit 1; }

                # Test response time
                RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$STAGING_URL/api/products")
                echo "Response time: ${RESPONSE_TIME}s"

                echo "All smoke tests passed"

  - stage: SwapToProduction
    displayName: 'Swap staging to production'
    dependsOn: ValidateStaging
    jobs:
      - deployment: SwapSlots
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureAppServiceManage@0
                  displayName: 'Swap staging to production'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    action: 'Swap Slots'
                    webAppName: $(appName)
                    resourceGroupName: $(resourceGroup)
                    sourceSlot: 'staging'

                - task: AzureCLI@2
                  displayName: 'Post-swap production validation'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      PROD_URL="https://$(appName).azurewebsites.net/health"
                      for i in {1..5}; do
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")
                        if [ "$STATUS" == "200" ]; then
                          echo "Production validation passed"
                          exit 0
                        fi
                        sleep 10
                      done
                      echo "##vso[task.logissue type=error]Production validation failed"
                      exit 1

  - stage: Rollback
    displayName: 'Rollback on failure'
    dependsOn: SwapToProduction
    condition: failed()
    jobs:
      - deployment: RollbackSwap
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureAppServiceManage@0
                  displayName: 'Swap back (rollback)'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    action: 'Swap Slots'
                    webAppName: $(appName)
                    resourceGroupName: $(resourceGroup)
                    sourceSlot: 'staging'
```

---

## Break and fix exercises

### Exercise 1: Auto-swap not triggering

**Symptom:** Code is deployed to the staging slot, but the auto-swap to production never occurs.

**Investigate:**
```bash
# Check if auto-swap is configured
az webapp config show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --query "autoSwapSlotName"

# Check slot activity log for swap errors
az monitor activity-log list \
  --resource-group $RESOURCE_GROUP \
  --query "[?contains(operationName.value, 'slotsswap')].{time:eventTimestamp, status:status.value}" \
  --output table
```

**Root cause:** The App Service plan is on the Free or Basic tier, which does not support auto-swap.


<details>
<summary>Solution</summary>

**Fix:**
```bash
# Upgrade to Standard tier or higher
az appservice plan update \
  --name asp-contoso-webapp \
  --resource-group $RESOURCE_GROUP \
  --sku S1
```

</details>

### Exercise 2: Rolling update stuck at 25%

**Symptom:** The VMSS rolling update processes 25% of instances and then halts.

**Investigate:**
```bash
# Check rolling upgrade status
az vmss rolling-upgrade get-latest \
  --name $VMSS_NAME \
  --resource-group $RESOURCE_GROUP

# Check instance health states
az vmss list-instances \
  --name $VMSS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[].{id:instanceId, state:provisioningState}" \
  --output table
```

**Root cause:** The first batch of updated instances is failing health checks. The `maxUnhealthyUpgradedInstancePercent` threshold is met, blocking further updates.


<details>
<summary>Solution</summary>

**Fix:**
```bash
# Fix the application issue, then restart the rolling upgrade
az vmss rolling-upgrade start \
  --name $VMSS_NAME \
  --resource-group $RESOURCE_GROUP
```

</details>

### Exercise 3: Slot swap causes cold start

**Symptom:** After swapping staging to production, the first batch of requests experiences 10-15 second response times.

**Investigate:**
```bash
# Check if warm-up settings are configured
az webapp config appsettings list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --query "[?name=='WEBSITE_SWAP_WARMUP_PING_PATH']"
```

**Root cause:** No warm-up path is configured. Azure performs the swap without ensuring the application is fully initialized.


<details>
<summary>Solution</summary>

**Fix:**
```bash
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging \
  --settings \
    "WEBSITE_SWAP_WARMUP_PING_PATH=/health/ready" \
    "WEBSITE_SWAP_WARMUP_PING_STATUSES=200"
```


</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Contoso runs 4 instances of their web app on a VMSS and wants to perform a rolling deployment that updates one instance at a time. Which configuration ensures that no more than 25% of instances are unavailable during the update?",
    options: [
      "Set 'maxBatchInstancePercent' to 25 in the VMSS rolling upgrade policy",
      "Set the App Service scaling to a minimum of 3 instances",
      "Configure the load balancer with a drain timeout of 25 seconds",
      "Set 'maxUnhealthyInstancePercent' to 75 in the VMSS rolling upgrade policy"
    ],
    correctIndex: 0,
    explanation: "The maxBatchInstancePercent parameter controls what percentage of instances can be upgraded simultaneously. Setting it to 25 means only 1 out of 4 instances (25%) will be upgraded at a time, ensuring 75% capacity is maintained throughout the deployment."
  },
  {
    question: "Which App Service plan tiers support deployment slots? (Select the MINIMUM tier required)",
    options: [
      "Free (F1)",
      "Basic (B1)",
      "Standard (S1)",
      "Premium (P1V2)"
    ],
    correctIndex: 2,
    explanation: "Deployment slots are available starting from the Standard tier. The Free and Basic tiers do not support deployment slots. Standard allows up to 5 slots, Premium allows up to 20 slots."
  },
  {
    question: "During a slot swap, which of the following settings moves WITH the application code to the target slot by default?",
    options: [
      "Connection strings marked as slot settings",
      "App settings marked as slot settings",
      "App settings NOT marked as slot settings",
      "Custom domain bindings"
    ],
    correctIndex: 2,
    explanation: "Settings that are NOT marked as \"slot settings\" (non-sticky) move with the application code during a swap. Slot-sticky settings remain in their respective slots. Custom domain bindings and connection strings marked as slot settings stay with their slot."
  },
  {
    question: "Contoso's staging slot serves requests successfully, but after the swap to production, the first 100 requests fail with HTTP 503. What should be configured to prevent this?",
    options: [
      "Increase the App Service Plan instance count",
      "Configure 'WEBSITE_SWAP_WARMUP_PING_PATH' to a health endpoint on the staging slot",
      "Enable Always On for the production slot",
      "Reduce the DNS TTL for the custom domain"
    ],
    correctIndex: 1,
    explanation: "The WEBSITE_SWAP_WARMUP_PING_PATH setting tells Azure to send requests to the specified path on the staging slot before completing the swap. This ensures the application is fully initialized (caches loaded, connections established) before receiving production traffic. The swap will not complete until the warm-up path returns the expected status code."
  }
]} />

## Cleanup

```bash
# Delete deployment slots
az webapp deployment slot delete \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot staging

az webapp deployment slot delete \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot preprod

# Delete the resource group and all resources
az group delete --name rg-contoso-webapp-prod --yes --no-wait
```
