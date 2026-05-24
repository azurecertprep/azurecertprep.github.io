---
sidebar_position: 8
title: "Challenge 32: Azure Front Door rules & Private Link"
sidebar_label: "Challenge 32"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 32: Azure Front Door rules & Private Link

:::info Estimated time and cost
**60-90 minutes** | **~$35/mo base** (Front Door Premium required for Private Link) | **Exam weight: 15-20%**
:::

## Scenario

Northwind SaaS operates a multi-tenant application where each tenant accesses the platform via a path prefix (e.g., `/tenant-alpha/`, `/tenant-beta/`). The platform team needs to implement URL rewrite rules to strip tenant prefixes before forwarding to the backend, configure HTTP-to-HTTPS redirects, modify response headers for security, and connect to App Service backends via Private Link to eliminate public internet exposure. Custom domains with Azure-managed TLS certificates must also be configured for each tenant.

You will create rule sets with conditions and actions, configure Private Link origins, and set up custom domains with managed certificates.

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Create and configure rule sets (conditions and actions) | High |
| Configure URL rewrite and redirect actions | High |
| Configure request/response header modifications | Medium |
| Configure Private Link origins | High |
| Configure custom domains with managed certificates | High |
| Understand rule set evaluation order | Medium |

## Prerequisites

- Azure subscription with Contributor role
- Azure CLI 2.60+ or Azure PowerShell Az 12.0+
- Existing Front Door Premium profile (from Challenge 31 or new)
- App Service plan with a web app deployed (for Private Link origin)
- A custom domain with DNS access (for custom domain task)

## Task 1: Create a rule set

Rule sets contain delivery rules that modify requests and responses as they flow through Front Door. Each rule has conditions (when to apply) and actions (what to do).

### Azure CLI

```bash
# Set variables
RG="rg-northwind-frontdoor"
LOCATION="eastus2"
FD_PROFILE="fd-northwind-saas"

# Create resource group and Front Door profile
az group create --name $RG --location $LOCATION

az afd profile create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --sku Premium_AzureFrontDoor

# Create the endpoint
az afd endpoint create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --endpoint-name ep-northwind-saas \
  --enabled-state Enabled

# Create origin group (needed before routes)
az afd origin-group create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --origin-group-name og-northwind-backend \
  --probe-request-type GET \
  --probe-protocol Https \
  --probe-interval-in-seconds 30 \
  --probe-path "/health" \
  --sample-size 4 \
  --successful-samples-required 3 \
  --additional-latency-in-milliseconds 50

# Create a rule set for tenant URL rewrites
az afd rule-set create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --rule-set-name RuleSetTenantRewrite

# Create a second rule set for security headers
az afd rule-set create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --rule-set-name RuleSetSecurityHeaders

# List rule sets
az afd rule-set list \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --query "[].name" \
  --output tsv
```

### Azure PowerShell

```powershell
# Set variables
$rg = "rg-northwind-frontdoor"
$location = "eastus2"
$fdProfile = "fd-northwind-saas"

# Create resource group and Front Door profile
New-AzResourceGroup -Name $rg -Location $location

New-AzFrontDoorCdnProfile `
  -ResourceGroupName $rg `
  -ProfileName $fdProfile `
  -SkuName "Premium_AzureFrontDoor"

# Create endpoint
New-AzFrontDoorCdnEndpoint `
  -ResourceGroupName $rg `
  -ProfileName $fdProfile `
  -EndpointName "ep-northwind-saas" `
  -Location "Global" `
  -EnabledState "Enabled"

# Create rule set
New-AzFrontDoorCdnRuleSet `
  -ResourceGroupName $rg `
  -ProfileName $fdProfile `
  -RuleSetName "RuleSetTenantRewrite"

New-AzFrontDoorCdnRuleSet `
  -ResourceGroupName $rg `
  -ProfileName $fdProfile `
  -RuleSetName "RuleSetSecurityHeaders"
```

## Task 2: Create rules with URL rewrite actions

Configure a rule that strips the tenant prefix from the URL path before forwarding to the backend. For example, `/tenant-alpha/products/123` becomes `/products/123` at the origin.

### Azure CLI

```bash
# Rule 1: Rewrite tenant-alpha paths
# Match: RequestUri path starts with /tenant-alpha/
# Action: URL Rewrite to strip the prefix
az afd rule create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --rule-set-name RuleSetTenantRewrite \
  --rule-name RewriteTenantAlpha \
  --order 1 \
  --match-variable RequestUri \
  --operator Contains \
  --match-values "/tenant-alpha/" \
  --action-name UrlRewrite \
  --source-pattern "/tenant-alpha/" \
  --destination "/" \
  --preserve-unmatched-path true

# Rule 2: Rewrite tenant-beta paths
az afd rule create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --rule-set-name RuleSetTenantRewrite \
  --rule-name RewriteTenantBeta \
  --order 2 \
  --match-variable RequestUri \
  --operator Contains \
  --match-values "/tenant-beta/" \
  --action-name UrlRewrite \
  --source-pattern "/tenant-beta/" \
  --destination "/" \
  --preserve-unmatched-path true

# Rule 3: HTTP to HTTPS redirect (in security rule set)
az afd rule create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --rule-set-name RuleSetSecurityHeaders \
  --rule-name RedirectHttpToHttps \
  --order 1 \
  --match-variable RequestScheme \
  --operator Equal \
  --match-values "HTTP" \
  --action-name UrlRedirect \
  --redirect-type Moved \
  --redirect-protocol Https \
  --match-processing-behavior Stop
```

### Azure PowerShell

```powershell
# Create the URL rewrite rule for tenant-alpha
$condition = New-AzFrontDoorCdnRuleRequestUriConditionObject `
  -Name "RequestUri" `
  -ParameterOperator "Contains" `
  -ParameterMatchValue "/tenant-alpha/"

$action = New-AzFrontDoorCdnRuleUrlRewriteActionObject `
  -Name "UrlRewrite" `
  -ParameterSourcePattern "/tenant-alpha/" `
  -ParameterDestination "/" `
  -ParameterPreserveUnmatchedPath $true

New-AzFrontDoorCdnRule `
  -ResourceGroupName $rg `
  -ProfileName $fdProfile `
  -RuleSetName "RuleSetTenantRewrite" `
  -RuleName "RewriteTenantAlpha" `
  -Order 1 `
  -Condition $condition `
  -Action $action
```

:::note Rule evaluation order
- Rules within a rule set execute in ascending order by the `--order` value
- Multiple rule sets on a route execute in the order they are associated with the route
- Use `--match-processing-behavior Stop` to prevent subsequent rules from executing after a match (useful for redirects)
- If no condition is specified, the rule matches all requests (acts as a default action)
:::

## Task 3: Add response header modification rules

Add security headers to all responses flowing through Front Door.

### Azure CLI

```bash
# Rule: Add Strict-Transport-Security header
az afd rule create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --rule-set-name RuleSetSecurityHeaders \
  --rule-name AddHstsHeader \
  --order 2 \
  --action-name ModifyResponseHeader \
  --header-action Overwrite \
  --header-name "Strict-Transport-Security" \
  --header-value "max-age=31536000; includeSubDomains"

# Rule: Add X-Content-Type-Options header
az afd rule create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --rule-set-name RuleSetSecurityHeaders \
  --rule-name AddContentTypeOptions \
  --order 3 \
  --action-name ModifyResponseHeader \
  --header-action Overwrite \
  --header-name "X-Content-Type-Options" \
  --header-value "nosniff"

# Rule: Remove the Server header (hide backend info)
az afd rule create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --rule-set-name RuleSetSecurityHeaders \
  --rule-name RemoveServerHeader \
  --order 4 \
  --action-name ModifyResponseHeader \
  --header-action Delete \
  --header-name "Server"

# List all rules in the security rule set
az afd rule list \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --rule-set-name RuleSetSecurityHeaders \
  --query "[].{name:name, order:order}" \
  --output table
```

### Azure PowerShell

```powershell
# Add HSTS header action
$hstsAction = New-AzFrontDoorCdnRuleResponseHeaderActionObject `
  -Name "ModifyResponseHeader" `
  -ParameterHeaderAction "Overwrite" `
  -ParameterHeaderName "Strict-Transport-Security" `
  -ParameterValue "max-age=31536000; includeSubDomains"

New-AzFrontDoorCdnRule `
  -ResourceGroupName $rg `
  -ProfileName $fdProfile `
  -RuleSetName "RuleSetSecurityHeaders" `
  -RuleName "AddHstsHeader" `
  -Order 2 `
  -Action $hstsAction
```

## Task 4: Configure a Private Link origin

Private Link origins allow Front Door Premium to connect to your backend over the Microsoft backbone network without exposing the backend to the public internet.

:::warning Premium SKU required
Private Link origins are only available with the Front Door Premium SKU. Standard SKU profiles do not support this feature.
:::

### Azure CLI

```bash
# First, create the App Service that will serve as our Private Link origin
APP_SERVICE_PLAN="asp-northwind-backend"
WEB_APP="app-northwind-api-eastus2"

az appservice plan create \
  --resource-group $RG \
  --name $APP_SERVICE_PLAN \
  --location $LOCATION \
  --sku P1V3 \
  --is-linux

az webapp create \
  --resource-group $RG \
  --plan $APP_SERVICE_PLAN \
  --name $WEB_APP \
  --runtime "NODE:20-lts"

# Get the App Service resource ID
APP_SERVICE_ID=$(az webapp show \
  --resource-group $RG \
  --name $WEB_APP \
  --query "id" \
  --output tsv)

# Create origin with Private Link enabled
az afd origin create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --origin-group-name og-northwind-backend \
  --origin-name origin-privatelink-api \
  --host-name "${WEB_APP}.azurewebsites.net" \
  --origin-host-header "${WEB_APP}.azurewebsites.net" \
  --http-port 80 \
  --https-port 443 \
  --priority 1 \
  --weight 1000 \
  --enabled-state Enabled \
  --enable-private-link true \
  --private-link-resource $APP_SERVICE_ID \
  --private-link-location $LOCATION \
  --private-link-request-message "Front Door Private Link connection" \
  --private-link-sub-resource-type "sites"

# Check the private link connection state (will be Pending until approved)
az afd origin show \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --origin-group-name og-northwind-backend \
  --origin-name origin-privatelink-api \
  --query "sharedPrivateLinkResource.status" \
  --output tsv
```

### Approve the Private Link connection

After creating the Private Link origin, you must approve the pending connection on the App Service side:

```bash
# List pending Private Endpoint connections on the App Service
az network private-endpoint-connection list \
  --id $APP_SERVICE_ID \
  --query "[?properties.privateLinkServiceConnectionState.status=='Pending'].{id:id, status:properties.privateLinkServiceConnectionState.status}" \
  --output table

# Approve the pending connection
PE_CONN_ID=$(az network private-endpoint-connection list \
  --id $APP_SERVICE_ID \
  --query "[?properties.privateLinkServiceConnectionState.status=='Pending'].id" \
  --output tsv)

az network private-endpoint-connection approve \
  --id $PE_CONN_ID \
  --description "Approved for Front Door"
```

### Azure PowerShell

```powershell
# Create App Service
New-AzAppServicePlan `
  -ResourceGroupName $rg `
  -Name "asp-northwind-backend" `
  -Location $location `
  -Tier "PremiumV3" `
  -WorkerSize "Small" `
  -Linux

New-AzWebApp `
  -ResourceGroupName $rg `
  -AppServicePlan "asp-northwind-backend" `
  -Name "app-northwind-api-eastus2" `
  -Location $location

# Get resource ID
$appId = (Get-AzWebApp -ResourceGroupName $rg -Name "app-northwind-api-eastus2").Id

# Create Private Link origin
New-AzFrontDoorCdnOrigin `
  -ResourceGroupName $rg `
  -ProfileName $fdProfile `
  -OriginGroupName "og-northwind-backend" `
  -OriginName "origin-privatelink-api" `
  -HostName "app-northwind-api-eastus2.azurewebsites.net" `
  -OriginHostHeader "app-northwind-api-eastus2.azurewebsites.net" `
  -HttpPort 80 `
  -HttpsPort 443 `
  -Priority 1 `
  -Weight 1000 `
  -EnabledState "Enabled" `
  -SharedPrivateLinkResourcePrivateLinkLocation $location `
  -SharedPrivateLinkResourceRequestMessage "Front Door Private Link" `
  -SharedPrivateLinkResourcePrivateLink $appId `
  -SharedPrivateLinkResourceGroupId "sites"

# Approve the private endpoint connection
$peConnections = Get-AzPrivateEndpointConnection -PrivateLinkResourceId $appId |
  Where-Object { $_.PrivateLinkServiceConnectionState.Status -eq "Pending" }

$peConnections | ForEach-Object {
  Approve-AzPrivateEndpointConnection -ResourceId $_.Id -Description "Approved for Front Door"
}
```

:::tip Restrict App Service to Private Link only
After approving the Private Link connection, restrict the App Service to accept traffic only from the private endpoint:

```bash
az webapp update \
  --resource-group $RG \
  --name $WEB_APP \
  --set publicNetworkAccess=Disabled
```

This ensures all traffic to the backend flows through Front Door via Private Link.
:::

## Task 5: Configure a custom domain with managed certificate

Custom domains allow you to use your own domain name (e.g., `app.northwindtraders.com`) instead of the Front Door-generated hostname.

### Azure CLI

```bash
# Create custom domain with managed certificate
az afd custom-domain create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --custom-domain-name cd-northwind-app \
  --host-name "app.northwindtraders.com" \
  --minimum-tls-version TLS12 \
  --certificate-type ManagedCertificate

# Show the validation token (needed for DNS TXT record)
az afd custom-domain show \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --custom-domain-name cd-northwind-app \
  --query "{hostname:hostName, validationState:domainValidationState, validationToken:validationProperties.validationToken}" \
  --output json
```

Before the managed certificate is issued, you must create DNS records:

1. **CNAME record**: Point `app.northwindtraders.com` to the Front Door endpoint hostname
2. **TXT record**: Create `_dnsauth.app.northwindtraders.com` with the validation token value

```bash
# After DNS records are created, associate the custom domain with the route
az afd route update \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --endpoint-name ep-northwind-saas \
  --route-name route-default \
  --custom-domains cd-northwind-app

# Check domain validation state (wait for DomainValidationState: Approved)
az afd custom-domain show \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --custom-domain-name cd-northwind-app \
  --query "domainValidationState" \
  --output tsv
```

### Azure PowerShell

```powershell
# Create custom domain with managed certificate
New-AzFrontDoorCdnCustomDomain `
  -ResourceGroupName $rg `
  -ProfileName $fdProfile `
  -CustomDomainName "cd-northwind-app" `
  -HostName "app.northwindtraders.com" `
  -TlsSettingMinimumTlsVersion "TLS12" `
  -TlsSettingCertificateType "ManagedCertificate"

# Get validation token
$domain = Get-AzFrontDoorCdnCustomDomain `
  -ResourceGroupName $rg `
  -ProfileName $fdProfile `
  -CustomDomainName "cd-northwind-app"

Write-Host "Validation token: $($domain.ValidationPropertyValidationToken)"
Write-Host "Add TXT record _dnsauth.app.northwindtraders.com with this value"
```

### Portal steps

1. In the Front Door profile, go to **Domains** > **+ Add**.
2. Select **DNS management: Other** (non-Azure DNS).
3. Enter hostname `app.northwindtraders.com`.
4. Select **Certificate type: AFD Managed**.
5. Set minimum TLS version to **TLS 1.2**.
6. Click **Add** and note the validation token shown.
7. Create the required DNS records at your DNS provider.
8. Return to **Domains** and associate it with your route.

## Task 6: Associate rule sets with a route

Rule sets must be explicitly associated with routes to take effect.

### Azure CLI

```bash
# Create a route and associate both rule sets
az afd route create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --endpoint-name ep-northwind-saas \
  --route-name route-default \
  --origin-group og-northwind-backend \
  --patterns-to-match "/*" \
  --supported-protocols Http Https \
  --https-redirect Enabled \
  --forwarding-protocol HttpsOnly \
  --link-to-default-domain Enabled \
  --rule-sets RuleSetTenantRewrite RuleSetSecurityHeaders
```

:::note Rule set execution order
Rule sets execute in the order they are listed in the `--rule-sets` parameter. In this example, tenant URL rewrites happen first, then security headers are added. This order matters: if the security redirect rule fires first (with `--match-processing-behavior Stop`), subsequent rules in other rule sets would not execute for that request.
:::

## Break & fix

### Scenario 1: Rule set not evaluating (order/condition mismatch)

```bash
# Create a rule with conflicting conditions
az afd rule create \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --rule-set-name RuleSetTenantRewrite \
  --rule-name BrokenRule \
  --order 0 \
  --match-variable RequestScheme \
  --operator Equal \
  --match-values "HTTP" \
  --action-name UrlRewrite \
  --source-pattern "/tenant-alpha/" \
  --destination "/" \
  --preserve-unmatched-path true \
  --match-processing-behavior Stop
```

**Symptom**: Tenant URL rewrites stop working. Requests to `/tenant-alpha/products` arrive at the origin unchanged.

**Root cause**: The rule at order 0 executes before the rewrite rules (order 1, 2). It matches HTTP requests and sets `--match-processing-behavior Stop`, preventing subsequent rules from executing. Since HTTPS redirect also happens, the rewrite rules never fire.

**Fix**: Delete the broken rule or change its order and behavior:

```bash
az afd rule delete \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --rule-set-name RuleSetTenantRewrite \
  --rule-name BrokenRule \
  --yes
```

### Scenario 2: Private Link not approved (pending state)

**Symptom**: After creating a Private Link origin, the origin shows as unhealthy and requests timeout or return 503.

**Root cause**: The Private Link connection is still in `Pending` state. Until the resource owner approves the connection, no traffic flows through it.

**Diagnosis**:

```bash
# Check Private Link status on the origin
az afd origin show \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --origin-group-name og-northwind-backend \
  --origin-name origin-privatelink-api \
  --query "sharedPrivateLinkResource.status" \
  --output tsv
# Expected output: "Pending" (when not yet approved)
```

**Fix**: Approve the connection on the target resource:

```bash
PE_CONN_ID=$(az network private-endpoint-connection list \
  --id $APP_SERVICE_ID \
  --query "[?properties.privateLinkServiceConnectionState.status=='Pending'].id" \
  --output tsv)

az network private-endpoint-connection approve \
  --id $PE_CONN_ID \
  --description "Approved for Front Door"
```

### Scenario 3: Custom domain CNAME validation failing

**Symptom**: Custom domain remains in `Pending` validation state. The managed certificate is not issued.

**Root cause**: The DNS CNAME record points to the wrong target, or the TXT validation record is missing or incorrect.

**Diagnosis**:

```bash
# Check what validation expects
az afd custom-domain show \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --custom-domain-name cd-northwind-app \
  --query "{state:domainValidationState, token:validationProperties.validationToken, expiresOn:validationProperties.expirationDate}" \
  --output json

# Verify DNS from command line
nslookup -type=TXT _dnsauth.app.northwindtraders.com
nslookup -type=CNAME app.northwindtraders.com
```

**Fix**: Ensure the DNS records are correct:
- CNAME: `app.northwindtraders.com` pointing to `ep-northwind-saas-xxxxxx.z01.azurefd.net`
- TXT: `_dnsauth.app.northwindtraders.com` with the exact validation token value

If the token has expired, regenerate it:

```bash
az afd custom-domain regenerate-validation-token \
  --resource-group $RG \
  --profile-name $FD_PROFILE \
  --custom-domain-name cd-northwind-app
```

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-32-q1",
    question: "In which order do rule sets execute when multiple are associated with a single route?",
    options: [
      "In the order they are listed in the route's rule-sets association \u2705",
      "Alphabetically by rule set name",
      "By creation timestamp (oldest first)",
      "All rule sets execute simultaneously in parallel"
    ],
    correctIndex: 0,
    explanation: "Rule sets execute in the order they appear in the route's rule-sets list. Within each rule set, individual rules execute in ascending order of their 'order' value. This sequencing is important for dependencies between rules."
  },
  {
    id: "az700-32-q2",
    question: "After creating a Private Link origin in Front Door Premium, the origin status shows as 'Pending'. What must happen next?",
    options: [
      "The target resource owner must approve the Private Link connection \u2705",
      "Wait 24 hours for automatic approval",
      "Run az afd origin update with --approve-private-link flag",
      "Create a Private Endpoint in the target resource's VNet"
    ],
    correctIndex: 0,
    explanation: "Private Link connections initiated by Front Door enter a 'Pending' state. The owner of the target resource (App Service, Storage, etc.) must explicitly approve the connection. Until approved, no traffic flows through the private link."
  },
  {
    id: "az700-32-q3",
    question: "You configure a managed certificate for custom domain 'app.contoso.com'. Which DNS records must you create for validation?",
    options: [
      "A CNAME for the domain pointing to the FD endpoint AND a TXT record _dnsauth.app.contoso.com with the validation token \u2705",
      "Only a CNAME record pointing to the Front Door endpoint",
      "An A record pointing to the Front Door IP address",
      "A TXT record at the apex domain with 'azure-verify=<profile-id>'"
    ],
    correctIndex: 0,
    explanation: "Front Door managed certificate validation requires both a CNAME record (pointing the custom domain to the FD endpoint) and a TXT record at _dnsauth.<domain> containing the validation token. Both records must be present for certificate issuance."
  },
  {
    id: "az700-32-q4",
    question: "A rule has --match-processing-behavior set to 'Stop'. What happens when this rule matches a request?",
    options: [
      "The rule's action executes and no subsequent rules in any rule set are evaluated \u2705",
      "Only rules in the current rule set stop; other rule sets still execute",
      "The request is immediately dropped without forwarding",
      "Caching is disabled for this request"
    ],
    correctIndex: 0,
    explanation: "When match-processing-behavior is 'Stop', the current rule's action executes and then ALL remaining rules (in the current and subsequent rule sets) are skipped. This is commonly used for redirect rules to prevent further processing."
  },
  {
    id: "az700-32-q5",
    question: "Which Front Door SKU supports Private Link origins?",
    options: [
      "Premium only \u2705",
      "Both Standard and Premium",
      "Standard only",
      "Neither; Private Link requires a separate Private Endpoint resource"
    ],
    correctIndex: 0,
    explanation: "Private Link origin connectivity is an exclusive feature of Azure Front Door Premium. Standard SKU does not support Private Link origins. This is one of the key differentiators between the two tiers."
  },
  {
    id: "az700-32-q6",
    question: "You create a URL rewrite rule with source-pattern '/api/v1/' and destination '/api/v2/' with preserve-unmatched-path set to true. A request arrives for '/api/v1/users/123'. What path reaches the origin?",
    options: [
      "/api/v2/users/123 \u2705",
      "/api/v2/",
      "/api/v1/users/123 (no change)",
      "/users/123"
    ],
    correctIndex: 0,
    explanation: "With preserve-unmatched-path set to true, the matched portion '/api/v1/' is replaced with '/api/v2/' and the remaining path '/users/123' is appended. This preserves the full path structure while changing the prefix."
  }
]} />

## Cleanup

Remove all resources created in this challenge.

### Azure CLI

```bash
# Delete the entire resource group and all resources within it
az group delete --name rg-northwind-frontdoor --yes --no-wait
```

### Azure PowerShell

```powershell
# Delete the entire resource group and all resources within it
Remove-AzResourceGroup -Name "rg-northwind-frontdoor" -Force -AsJob
```

:::danger Cost warning
Azure Front Door Premium costs approximately $35/month base plus per-request charges. The App Service on P1V3 adds approximately $100/month. Delete all resources promptly after completing this challenge to avoid unnecessary billing.
:::

:::tip Verify cleanup
After a few minutes, confirm deletion:
```bash
az group show --name rg-northwind-frontdoor 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists"
```
:::
