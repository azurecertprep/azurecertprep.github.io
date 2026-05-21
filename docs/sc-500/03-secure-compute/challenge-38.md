---
sidebar_position: 38
title: "Challenge 38: App Platform Security – Functions, Logic Apps, App Service, WAF, APIM"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 38: App Platform Security – Functions, Logic Apps, App Service, WAF, APIM

## Exam skills covered

- Secure Azure Functions with VNet integration, managed identity, and authentication
- Harden Azure Logic Apps with access restrictions and secure connectors
- Configure Azure App Service with security best practices
- Deploy and configure Azure Web Application Firewall (WAF) policies
- Implement Azure API Management security features (authentication, rate limiting, IP filtering)
- Monitor application platform security with Defender for App Service

## Scenario

Contoso Ltd operates a multi-tier web application consisting of an App Service frontend, Azure Functions for background processing, Logic Apps for workflow automation, and API Management as the API gateway. A security audit revealed multiple issues: Functions accessible without authentication, Logic Apps triggers exposed publicly, App Service missing security headers, and no WAF protection. You must harden the entire application platform.

---

## Prerequisites

- Azure subscription with Contributor access
- Microsoft Defender for App Service enabled
- Azure CLI installed
- Basic understanding of Azure networking and application hosting

---

## Task 1: Secure Azure App Service

Deploy and harden an App Service with authentication, TLS, and network restrictions.

```bash
# Create resource group
az group create --name "rg-contoso-app-security" --location "eastus"

# Create App Service plan
az appservice plan create \
    --resource-group "rg-contoso-app-security" \
    --name "plan-contoso-prod" \
    --sku "P1v3" \
    --is-linux

# Create web app
az webapp create \
    --resource-group "rg-contoso-app-security" \
    --plan "plan-contoso-prod" \
    --name "app-contoso-frontend" \
    --runtime "NODE:20-lts" \
    --assign-identity "[system]"

# Enforce HTTPS only
az webapp update \
    --resource-group "rg-contoso-app-security" \
    --name "app-contoso-frontend" \
    --https-only true

# Configure minimum TLS 1.2
az webapp config set \
    --resource-group "rg-contoso-app-security" \
    --name "app-contoso-frontend" \
    --min-tls-version "1.2"

# Disable FTP access (security best practice)
az webapp config set \
    --resource-group "rg-contoso-app-security" \
    --name "app-contoso-frontend" \
    --ftps-state "Disabled"

# Configure security headers
az webapp config appsettings set \
    --resource-group "rg-contoso-app-security" \
    --name "app-contoso-frontend" \
    --settings \
        "WEBSITE_ADD_SITENAME_BINDINGS_IN_APPHOST_CONFIG=1"

# Enable authentication with Entra ID
az webapp auth update \
    --resource-group "rg-contoso-app-security" \
    --name "app-contoso-frontend" \
    --enabled true \
    --unauthenticated-client-action "RedirectToLoginPage" \
    --aad-allowed-token-audiences "api://app-contoso-frontend" \
    --aad-client-id "{app-registration-client-id}" \
    --aad-token-issuer-url "https://login.microsoftonline.com/{tenant-id}/v2.0"

# Enable VNet integration for outbound traffic
az network vnet create \
    --resource-group "rg-contoso-app-security" \
    --name "vnet-app-platform" \
    --address-prefix "10.0.0.0/16" \
    --subnet-name "subnet-app-integration" \
    --subnet-prefix "10.0.1.0/24"

az webapp vnet-integration add \
    --resource-group "rg-contoso-app-security" \
    --name "app-contoso-frontend" \
    --vnet "vnet-app-platform" \
    --subnet "subnet-app-integration"

# Restrict inbound access to only allow from WAF
az webapp config access-restriction add \
    --resource-group "rg-contoso-app-security" \
    --name "app-contoso-frontend" \
    --rule-name "AllowWAFOnly" \
    --priority 100 \
    --service-tag "AzureFrontDoor.Backend" \
    --action "Allow"

az webapp config access-restriction add \
    --resource-group "rg-contoso-app-security" \
    --name "app-contoso-frontend" \
    --rule-name "DenyAll" \
    --priority 200 \
    --ip-address "0.0.0.0/0" \
    --action "Deny"
```

---

## Task 2: Secure Azure Functions

Harden Azure Functions with authentication, network isolation, and secure configuration.

```bash
# Create storage account for Functions (with security settings) - must exist before function app
az storage account create \
    --resource-group "rg-contoso-app-security" \
    --name "stcontosofunc" \
    --sku "Standard_LRS" \
    --min-tls-version "TLS1_2" \
    --allow-blob-public-access false \
    --https-only true

# Create Function App with security settings
az functionapp create \
    --resource-group "rg-contoso-app-security" \
    --name "func-contoso-processor" \
    --storage-account "stcontosofunc" \
    --plan "plan-contoso-prod" \
    --runtime "dotnet-isolated" \
    --runtime-version "8" \
    --assign-identity "[system]" \
    --https-only true \
    --disable-app-insights false

# Configure authentication on Function App
az functionapp auth update \
    --resource-group "rg-contoso-app-security" \
    --name "func-contoso-processor" \
    --enabled true \
    --unauthenticated-client-action "Return401"

# Set function access level to require authentication
az functionapp config appsettings set \
    --resource-group "rg-contoso-app-security" \
    --name "func-contoso-processor" \
    --settings "AzureWebJobsDisableHomepage=true"

# Disable remote debugging
az functionapp config set \
    --resource-group "rg-contoso-app-security" \
    --name "func-contoso-processor" \
    --remote-debugging-enabled false

# Restrict network access — only allow from VNet
az functionapp config access-restriction add \
    --resource-group "rg-contoso-app-security" \
    --name "func-contoso-processor" \
    --rule-name "AllowVNet" \
    --priority 100 \
    --vnet-name "vnet-app-platform" \
    --subnet "subnet-app-integration" \
    --action "Allow"

# Use Key Vault references for secrets (not app settings)
FUNC_IDENTITY=$(az functionapp identity show \
    --resource-group "rg-contoso-app-security" \
    --name "func-contoso-processor" \
    --query "principalId" -o tsv)

az keyvault set-policy \
    --name "kv-contoso-apps" \
    --object-id $FUNC_IDENTITY \
    --secret-permissions get list

az functionapp config appsettings set \
    --resource-group "rg-contoso-app-security" \
    --name "func-contoso-processor" \
    --settings "SqlConnection=@Microsoft.KeyVault(SecretUri=https://kv-contoso-apps.vault.azure.net/secrets/sql-connection/)"
```

---

## Task 3: Secure Azure Logic Apps

Harden Logic App triggers and configure secure connector access.

```bash
# Create Logic App (Standard - for VNet integration)
az logicapp create \
    --resource-group "rg-contoso-app-security" \
    --name "logic-contoso-workflow" \
    --storage-account "stcontosofunc" \
    --plan "plan-contoso-prod" \
    --assign-identity "[system]"
```

Secure Logic App trigger endpoints:

1. Navigate to **Azure Portal** → **Logic App** → **Settings** → **Workflow settings**
2. Under **Access control configuration**:
   - **Trigger access**: Restrict to specific IP ranges
   - **Contents access**: Restrict to specific IP ranges
   - **Action access**: Restrict to specific IP ranges

```bash
# Configure IP-based access restrictions for Logic App triggers
# (Logic Apps Standard uses webapp access-restriction commands)
az webapp config access-restriction add \
    --resource-group "rg-contoso-app-security" \
    --name "logic-contoso-workflow" \
    --rule-name "AllowAPIMOnly" \
    --priority 100 \
    --ip-address "10.0.3.0/24" \
    --action "Allow"

# Configure Logic App to use managed identity for connectors
# (Logic Apps Standard identity is managed via webapp commands)
LOGIC_IDENTITY=$(az webapp identity show \
    --resource-group "rg-contoso-app-security" \
    --name "logic-contoso-workflow" \
    --query "principalId" -o tsv)

# Grant identity access to required services (instead of storing connection strings)
az role assignment create \
    --assignee $LOGIC_IDENTITY \
    --role "Azure Service Bus Data Sender" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-app-security/providers/Microsoft.ServiceBus/namespaces/sb-contoso"

# Enable SAS key rotation for HTTP triggers
# Navigate to Logic App > Workflow > Trigger > "Regenerate Access Key"
```

---

## Task 4: Deploy Web Application Firewall (WAF)

Configure Azure WAF to protect the application frontend.

```bash
# Create WAF policy
az network application-gateway waf-policy create \
    --resource-group "rg-contoso-app-security" \
    --name "waf-policy-contoso" \
    --location "eastus"

# Configure WAF managed rules (OWASP 3.2)
az network application-gateway waf-policy managed-rule rule-set add \
    --resource-group "rg-contoso-app-security" \
    --policy-name "waf-policy-contoso" \
    --type "OWASP" \
    --version "3.2"

# Add bot protection rule set
az network application-gateway waf-policy managed-rule rule-set add \
    --resource-group "rg-contoso-app-security" \
    --policy-name "waf-policy-contoso" \
    --type "Microsoft_BotManagerRuleSet" \
    --version "1.0"

# Add custom rule: Block requests from specific geolocations
az network application-gateway waf-policy custom-rule create \
    --resource-group "rg-contoso-app-security" \
    --policy-name "waf-policy-contoso" \
    --name "BlockHighRiskCountries" \
    --priority 10 \
    --action "Block" \
    --rule-type "MatchRule"

az network application-gateway waf-policy custom-rule match-condition add \
    --resource-group "rg-contoso-app-security" \
    --policy-name "waf-policy-contoso" \
    --name "BlockHighRiskCountries" \
    --match-variables "RemoteAddr" \
    --operator "GeoMatch" \
    --values "KP" "IR"

# Add custom rule: Rate limiting
az network application-gateway waf-policy custom-rule create \
    --resource-group "rg-contoso-app-security" \
    --policy-name "waf-policy-contoso" \
    --name "RateLimit100PerMin" \
    --priority 20 \
    --action "Block" \
    --rule-type "RateLimitRule" \
    --rate-limit-duration "OneMin" \
    --rate-limit-threshold 100 \
    --group-by-user-session "ClientAddr"

az network application-gateway waf-policy custom-rule match-condition add \
    --resource-group "rg-contoso-app-security" \
    --policy-name "waf-policy-contoso" \
    --name "RateLimit100PerMin" \
    --match-variables "RequestUri" \
    --operator "Contains" \
    --values "/api/"

# Set WAF policy to Prevention mode
az network application-gateway waf-policy update \
    --resource-group "rg-contoso-app-security" \
    --name "waf-policy-contoso" \
    --mode "Prevention" \
    --state "Enabled"

# Create Application Gateway with WAF
az network public-ip create \
    --resource-group "rg-contoso-app-security" \
    --name "pip-appgw" \
    --sku "Standard" \
    --allocation-method "Static"

az network vnet subnet create \
    --resource-group "rg-contoso-app-security" \
    --vnet-name "vnet-app-platform" \
    --name "subnet-appgw" \
    --address-prefix "10.0.3.0/24"

az network application-gateway create \
    --resource-group "rg-contoso-app-security" \
    --name "appgw-contoso-waf" \
    --location "eastus" \
    --sku "WAF_v2" \
    --capacity 2 \
    --vnet-name "vnet-app-platform" \
    --subnet "subnet-appgw" \
    --public-ip-address "pip-appgw" \
    --waf-policy "waf-policy-contoso" \
    --priority 1
```

---

## Task 5: Configure Azure API Management security

Harden APIM with authentication policies, IP filtering, and threat protection.

```bash
# Create APIM instance
az apim create \
    --resource-group "rg-contoso-app-security" \
    --name "apim-contoso-prod" \
    --location "eastus" \
    --publisher-name "Contoso" \
    --publisher-email "api@contoso.com" \
    --sku-name "StandardV2"

# Import API
az apim api create \
    --resource-group "rg-contoso-app-security" \
    --service-name "apim-contoso-prod" \
    --api-id "contoso-api" \
    --display-name "Contoso API" \
    --path "api" \
    --protocols "https"
```

Apply security policies to APIM:

```xml
<!-- All-APIs inbound policy for security hardening -->
<policies>
    <inbound>
        <base />

        <!-- Validate JWT token from Entra ID -->
        <validate-jwt header-name="Authorization" failed-validation-httpcode="401" require-scheme="Bearer">
            <openid-config url="https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration" />
            <required-claims>
                <claim name="aud" match="all">
                    <value>api://contoso-api</value>
                </claim>
            </required-claims>
        </validate-jwt>

        <!-- Rate limiting per subscription -->
        <rate-limit-by-key calls="100" renewal-period="60"
            counter-key="@(context.Subscription.Id)"
            remaining-calls-variable-name="remainingCalls" />

        <!-- IP filtering -->
        <ip-filter action="allow">
            <address-range from="10.0.0.0" to="10.0.255.255" />
            <address-range from="203.0.113.0" to="203.0.113.255" />
        </ip-filter>

        <!-- Remove server headers -->
        <set-header name="X-Powered-By" exists-action="delete" />
        <set-header name="Server" exists-action="delete" />

        <!-- CORS policy -->
        <cors allow-credentials="true">
            <allowed-origins>
                <origin>https://app.contoso.com</origin>
            </allowed-origins>
            <allowed-methods>
                <method>GET</method>
                <method>POST</method>
                <method>PUT</method>
                <method>DELETE</method>
            </allowed-methods>
            <allowed-headers>
                <header>Authorization</header>
                <header>Content-Type</header>
            </allowed-headers>
        </cors>
    </inbound>
    <outbound>
        <base />
        <!-- Add security headers -->
        <set-header name="X-Content-Type-Options" exists-action="override">
            <value>nosniff</value>
        </set-header>
        <set-header name="X-Frame-Options" exists-action="override">
            <value>DENY</value>
        </set-header>
        <set-header name="Strict-Transport-Security" exists-action="override">
            <value>max-age=31536000; includeSubDomains</value>
        </set-header>
    </outbound>
</policies>
```

---

## Task 6: Enable Defender for App Service and monitor security

Configure threat detection for the entire application platform.

```bash
# Enable Defender for App Service
az security pricing create --name "AppServices" --tier "Standard"

# Verify status
az security pricing show --name "AppServices" --query "{name: name, tier: pricingTier}"

# List security recommendations for app services
az security assessment list \
    --query "[?contains(displayName, 'App Service') || contains(displayName, 'Function') || contains(displayName, 'Web app')]" \
    --output table

# Enable diagnostic logging for App Service
az webapp log config \
    --resource-group "rg-contoso-app-security" \
    --name "app-contoso-frontend" \
    --web-server-logging "filesystem" \
    --detailed-error-messages true \
    --failed-request-tracing true

# Create security alerts for app platform
az monitor metrics alert create \
    --name "high-4xx-errors" \
    --resource-group "rg-contoso-app-security" \
    --scopes "/subscriptions/{sub-id}/resourceGroups/rg-contoso-app-security/providers/Microsoft.Web/sites/app-contoso-frontend" \
    --condition "total Http4xx > 500" \
    --window-size "PT5M" \
    --description "High rate of 4xx errors - possible attack"

# Monitor WAF logs for blocked requests
az monitor diagnostic-settings create \
    --name "waf-diagnostics" \
    --resource "/subscriptions/{sub-id}/resourceGroups/rg-contoso-app-security/providers/Microsoft.Network/applicationGateways/appgw-contoso-waf" \
    --workspace "/subscriptions/{sub-id}/resourceGroups/rg-contoso-app-security/providers/Microsoft.OperationalInsights/workspaces/law-contoso-apps" \
    --logs '[{"category": "ApplicationGatewayFirewallLog", "enabled": true}, {"category": "ApplicationGatewayAccessLog", "enabled": true}]'
```

---

## Break & Fix

### Scenario 1: WAF blocking legitimate API requests with SQL injection false positives

After enabling WAF in Prevention mode, legitimate search queries containing special characters (like "O'Brien" or "SELECT model") are being blocked as SQL injection attacks.

<details>
<summary>Show solution</summary>

```bash
# 1. Check WAF logs to identify the specific rule being triggered
# Query Application Gateway Firewall Log:
# AzureDiagnostics
# | where ResourceType == "APPLICATIONGATEWAYS" and Category == "ApplicationGatewayFirewallLog"
# | where action_s == "Blocked"
# | project TimeGenerated, requestUri_s, ruleId_s, message_s, details_message_s

# 2. Identify the rule ID (e.g., 942430 - SQL Injection Attack)
# Create a rule exclusion for the specific parameter
az network application-gateway waf-policy managed-rule exclusion add \
    --resource-group "rg-contoso-app-security" \
    --policy-name "waf-policy-contoso" \
    --match-variable "RequestArgNames" \
    --selector-match-operator "Equals" \
    --selector "searchQuery"

# 3. Alternatively, disable the specific overly aggressive rule
az network application-gateway waf-policy managed-rule override rule-group add \
    --resource-group "rg-contoso-app-security" \
    --policy-name "waf-policy-contoso" \
    --type "OWASP" \
    --version "3.2" \
    --group-name "REQUEST-942-APPLICATION-ATTACK-SQLI" \
    --rules "942430" \
    --rule-id "942430" \
    --state "Disabled"

# 4. Better approach: Use per-URI policy for the search endpoint
az network application-gateway waf-policy custom-rule create \
    --resource-group "rg-contoso-app-security" \
    --policy-name "waf-policy-contoso" \
    --name "SearchEndpointException" \
    --priority 5 \
    --action "Allow" \
    --rule-type "MatchRule"

az network application-gateway waf-policy custom-rule match-condition add \
    --resource-group "rg-contoso-app-security" \
    --policy-name "waf-policy-contoso" \
    --name "SearchEndpointException" \
    --match-variables "RequestUri" \
    --operator "Contains" \
    --values "/api/search"
```

</details>

### Scenario 2: Function App accepting unauthenticated requests despite auth being enabled

After configuring authentication on the Function App, API calls without an Authorization header still succeed and return data.

<details>
<summary>Show solution</summary>

```bash
# 1. Check authentication configuration
az functionapp auth show \
    --resource-group "rg-contoso-app-security" \
    --name "func-contoso-processor" \
    --query "{enabled: enabled, unauthenticatedAction: unauthenticatedClientAction}"

# 2. Common issue: unauthenticatedClientAction is "AllowAnonymous" instead of "Return401"
az functionapp auth update \
    --resource-group "rg-contoso-app-security" \
    --name "func-contoso-processor" \
    --unauthenticated-client-action "Return401"

# 3. Check if function-level authorization keys are being used instead of platform auth
# Functions have their own auth levels: anonymous, function, admin
# If function.json has "authLevel": "anonymous", the function bypasses platform auth
# Fix: Set authLevel to "function" or "admin" in function.json/code

# 4. Verify the identity provider is correctly configured
az functionapp auth show \
    --resource-group "rg-contoso-app-security" \
    --name "func-contoso-processor" \
    --query "identityProviders.azureActiveDirectory"

# 5. If using APIM as the gateway, ensure APIM validates tokens
# AND passes the validated identity to Functions
# APIM should set the subscription key AND validate JWT

# 6. Test authentication enforcement
curl -v "https://func-contoso-processor.azurewebsites.net/api/process" \
    --header "Content-Type: application/json"
# Should return 401 Unauthorized
```

</details>

### Scenario 3: Logic App HTTP trigger URL leaked and being abused

The Logic App's HTTP trigger URL (including SAS token) was accidentally committed to a public GitHub repository. Attackers are sending thousands of requests triggering expensive downstream operations.

<details>
<summary>Show solution</summary>

```bash
# 1. IMMEDIATELY regenerate the trigger access keys
# Navigate to Logic App > Workflow > Trigger > "Regenerate Access Key"
# This invalidates the leaked URL

# 2. Regenerate workflow access keys via REST API
# (az logicapp does not have a regenerate-access-key subcommand)
az rest --method POST \
    --url "https://management.azure.com/subscriptions/{sub-id}/resourceGroups/rg-contoso-app-security/providers/Microsoft.Web/sites/logic-contoso-workflow/host/default/listkeys?api-version=2022-03-01"
# Then regenerate:
az rest --method POST \
    --url "https://management.azure.com/subscriptions/{sub-id}/resourceGroups/rg-contoso-app-security/providers/Microsoft.Web/sites/logic-contoso-workflow/host/default/functionkeys/default?api-version=2022-03-01" \
    --body '{"properties": {}}'

# 3. Add IP-based access restrictions to prevent future abuse
# (Logic Apps Standard uses the webapp access-restriction commands)
az webapp config access-restriction add \
    --resource-group "rg-contoso-app-security" \
    --name "logic-contoso-workflow" \
    --rule-name "AllowAPIMOnly" \
    --priority 100 \
    --ip-address "10.0.3.0/24" \
    --action "Allow"

az webapp config access-restriction add \
    --resource-group "rg-contoso-app-security" \
    --name "logic-contoso-workflow" \
    --rule-name "DenyAll" \
    --priority 200 \
    --ip-address "0.0.0.0/0" \
    --action "Deny"

# 4. Review audit logs for scope of abuse
# Check how many times the trigger was called
# And what downstream resources were affected

# 5. Add GitHub Secret Scanning alert rules
# to prevent SAS tokens from being committed in the future

# 6. Move to OAuth-based trigger authentication instead of SAS
# Use APIM as the entry point with proper JWT validation
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the recommended approach for securing Azure Function App secrets like database connection strings?",
    options: [
      "Store them in application settings as plain text",
      "Use Azure Key Vault references in app settings so secrets are fetched at runtime via managed identity",
      "Hardcode them in the function code",
      "Store them in environment variables on the build server"
    ],
    correctIndex: 1,
    explanation: "Key Vault references (@Microsoft.KeyVault()) allow Function Apps to resolve secrets from Key Vault at runtime using managed identity. This eliminates plaintext secrets in configuration and provides centralized secret management with rotation capabilities."
  },
  {
    question: "What WAF mode should be used in production, and what is the risk of switching to it?",
    options: [
      "Detection mode — it has no risks",
      "Prevention mode blocks malicious requests but may cause false positives that block legitimate traffic, requiring rule tuning",
      "Transparent mode — it has no impact on traffic",
      "Prevention mode never causes false positives"
    ],
    correctIndex: 1,
    explanation: "Prevention mode actively blocks detected attacks (vs. Detection mode which only logs). The risk is false positives — legitimate requests matching attack patterns get blocked. Best practice is to run in Detection mode first, tune rules/exclusions, then switch to Prevention."
  },
  {
    question: "How should Azure Logic App HTTP trigger endpoints be protected from unauthorized access?",
    options: [
      "The SAS token in the URL is sufficient security",
      "Combine IP restrictions, OAuth authentication via APIM, and regenerate access keys regularly — never rely solely on the SAS URL",
      "Logic App triggers are always private and cannot be accessed externally",
      "Add a password parameter to the trigger"
    ],
    correctIndex: 1,
    explanation: "SAS tokens can be leaked (e.g., committed to source control). Defense-in-depth requires IP restrictions (limit who can call the trigger), OAuth validation (via APIM frontend), and regular key rotation. APIM as a frontend adds JWT validation and rate limiting."
  },
  {
    question: "What does Defender for App Service detect that traditional WAF does not?",
    options: [
      "SQL injection attacks in HTTP requests",
      "Runtime threats like communication with known malicious IPs, web shells, suspicious process execution on the App Service instance",
      "DDoS attacks at the network layer",
      "Cross-site scripting in HTML responses"
    ],
    correctIndex: 1,
    explanation: "Defender for App Service monitors runtime behavior of the application host — detecting communication with C2 servers, web shell uploads, suspicious process chains, and compromised application indicators. WAF only inspects HTTP request/response patterns at the edge."
  }
]} />

## Cleanup

```bash
# Delete all resources
az group delete --name "rg-contoso-app-security" --yes --no-wait
```
