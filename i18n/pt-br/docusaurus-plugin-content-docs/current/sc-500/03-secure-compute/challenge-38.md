---
sidebar_position: 38
title: "Desafio 38: Segurança de Plataforma de Apps – Functions, Logic Apps, App Service, WAF, APIM"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 38: Segurança de Plataforma de Apps – Functions, Logic Apps, App Service, WAF, APIM

## Habilidades do exame cobertas

- Proteger Azure Functions com integração VNet, managed identity e autenticação
- Endurecer Azure Logic Apps com restrições de acesso e conectores seguros
- Configurar Azure App Service com melhores práticas de segurança
- Implantar e configurar políticas de Azure Web Application Firewall (WAF)
- Implementar recursos de segurança do Azure API Management (autenticação, rate limiting, filtragem de IP)
- Monitorar segurança da plataforma de aplicações com Defender for App Service

## Cenário

A Contoso Ltd opera uma aplicação web multi-camadas composta por um frontend em App Service, Azure Functions para processamento em segundo plano, Logic Apps para automação de workflows e API Management como gateway de API. Uma auditoria de segurança revelou múltiplos problemas: Functions acessíveis sem autenticação, triggers de Logic Apps expostos publicamente, App Service sem cabeçalhos de segurança e nenhuma proteção WAF. Você deve endurecer toda a plataforma de aplicações.

---

## Pré-requisitos

- Assinatura Azure com acesso de Contributor
- Microsoft Defender for App Service habilitado
- Azure CLI instalado
- Conhecimento básico de networking Azure e hospedagem de aplicações

---

## Tarefa 1: Proteger o Azure App Service

Implante e endureça um App Service com autenticação, TLS e restrições de rede.

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
    --action "RedirectToLoginPage" \
    --aad-allowed-token-audiences "api://app-contoso-frontend" \
    --aad-client-id "{app-registration-client-id}" \
    --aad-token-issuer-url "https://sts.windows.net/{tenant-id}/v2.0"

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

## Tarefa 2: Proteger Azure Functions

Endureça Azure Functions com autenticação, isolamento de rede e configuração segura.

```bash
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

# Create storage account for Functions (with security settings)
az storage account create \
    --resource-group "rg-contoso-app-security" \
    --name "stcontosofunc" \
    --sku "Standard_LRS" \
    --min-tls-version "TLS1_2" \
    --allow-blob-public-access false \
    --https-only true

# Configure authentication on Function App
az functionapp auth update \
    --resource-group "rg-contoso-app-security" \
    --name "func-contoso-processor" \
    --enabled true \
    --action "Return401" \
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

## Tarefa 3: Proteger Azure Logic Apps

Endureça triggers de Logic Apps e configure acesso seguro a conectores.

```bash
# Create Logic App (Standard - for VNet integration)
az logicapp create \
    --resource-group "rg-contoso-app-security" \
    --name "logic-contoso-workflow" \
    --storage-account "stcontosofunc" \
    --plan "plan-contoso-prod" \
    --assign-identity "[system]"
```

Proteja os endpoints de trigger do Logic App:

1. Navegue até **Azure Portal** → **Logic App** → **Settings** → **Workflow settings**
2. Em **Access control configuration**:
   - **Trigger access**: Restrinja a faixas de IP específicas
   - **Contents access**: Restrinja a faixas de IP específicas
   - **Action access**: Restrinja a faixas de IP específicas

```bash
# Configure IP-based access restrictions for Logic App triggers
az logicapp config access-restriction add \
    --resource-group "rg-contoso-app-security" \
    --name "logic-contoso-workflow" \
    --rule-name "AllowAPIMOnly" \
    --priority 100 \
    --ip-address "10.0.3.0/24" \
    --action "Allow"

# Configure Logic App to use managed identity for connectors
LOGIC_IDENTITY=$(az logicapp identity show \
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

## Tarefa 4: Implantar Web Application Firewall (WAF)

Configure o Azure WAF para proteger o frontend da aplicação.

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

## Tarefa 5: Configurar segurança do Azure API Management

Endureça o APIM com políticas de autenticação, filtragem de IP e proteção contra ameaças.

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

Aplique políticas de segurança no APIM:

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

## Tarefa 6: Habilitar Defender for App Service e monitorar segurança

Configure a detecção de ameaças para toda a plataforma de aplicações.

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

## Quebre & Conserte

### Cenário 1: WAF bloqueando requisições legítimas de API com falsos positivos de SQL injection

Após habilitar o WAF em modo Prevention, consultas de busca legítimas contendo caracteres especiais (como "O'Brien" ou "SELECT model") estão sendo bloqueadas como ataques de SQL injection.

<details>
<summary>Mostrar solução</summary>

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

### Cenário 2: Function App aceitando requisições não autenticadas apesar da autenticação estar habilitada

Após configurar autenticação no Function App, chamadas de API sem cabeçalho Authorization ainda funcionam e retornam dados.

<details>
<summary>Mostrar solução</summary>

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

### Cenário 3: URL de trigger HTTP do Logic App vazada e sendo abusada

A URL de trigger HTTP do Logic App (incluindo o token SAS) foi acidentalmente commitada em um repositório público do GitHub. Atacantes estão enviando milhares de requisições acionando operações downstream caras.

<details>
<summary>Mostrar solução</summary>

```bash
# 1. IMMEDIATELY regenerate the trigger access keys
# Navigate to Logic App > Workflow > Trigger > "Regenerate Access Key"
# This invalidates the leaked URL

# 2. Alternatively via CLI, regenerate workflow access keys
az logicapp regenerate-access-key \
    --resource-group "rg-contoso-app-security" \
    --name "logic-contoso-workflow" \
    --key-type "Primary"

# 3. Add IP-based access restrictions to prevent future abuse
az logicapp config access-restriction add \
    --resource-group "rg-contoso-app-security" \
    --name "logic-contoso-workflow" \
    --rule-name "AllowAPIMOnly" \
    --priority 100 \
    --ip-address "10.0.3.0/24" \
    --action "Allow"

az logicapp config access-restriction add \
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

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a abordagem recomendada para proteger segredos de Azure Function Apps como strings de conexão de banco de dados?",
    options: [
      "Armazená-los nas configurações do aplicativo como texto simples",
      "Usar referências do Azure Key Vault nas configurações do app para que os segredos sejam buscados em tempo de execução via managed identity",
      "Codificá-los diretamente no código da função",
      "Armazená-los em variáveis de ambiente no servidor de build"
    ],
    correctIndex: 1,
    explanation: "Referências do Key Vault (@Microsoft.KeyVault()) permitem que Function Apps resolvam segredos do Key Vault em tempo de execução usando managed identity. Isso elimina segredos em texto simples na configuração e fornece gerenciamento centralizado de segredos com capacidades de rotação."
  },
  {
    question: "Qual modo de WAF deve ser usado em produção, e qual é o risco de mudar para ele?",
    options: [
      "Modo Detection — não tem riscos",
      "O modo Prevention bloqueia requisições maliciosas mas pode causar falsos positivos que bloqueiam tráfego legítimo, exigindo ajuste de regras",
      "Modo Transparent — não tem impacto no tráfego",
      "O modo Prevention nunca causa falsos positivos"
    ],
    correctIndex: 1,
    explanation: "O modo Prevention bloqueia ativamente ataques detectados (vs. modo Detection que apenas registra). O risco são falsos positivos — requisições legítimas que correspondem a padrões de ataque são bloqueadas. A melhor prática é executar primeiro em modo Detection, ajustar regras/exclusões e depois mudar para Prevention."
  },
  {
    question: "Como os endpoints de trigger HTTP do Azure Logic App devem ser protegidos contra acesso não autorizado?",
    options: [
      "O token SAS na URL é segurança suficiente",
      "Combine restrições de IP, autenticação OAuth via APIM e regenere as chaves de acesso regularmente — nunca confie apenas na URL com SAS",
      "Triggers de Logic App são sempre privados e não podem ser acessados externamente",
      "Adicione um parâmetro de senha ao trigger"
    ],
    correctIndex: 1,
    explanation: "Tokens SAS podem ser vazados (ex: commitados no controle de código fonte). Defesa em profundidade requer restrições de IP (limitar quem pode chamar o trigger), validação OAuth (via frontend APIM) e rotação regular de chaves. APIM como frontend adiciona validação JWT e rate limiting."
  },
  {
    question: "O que o Defender for App Service detecta que o WAF tradicional não detecta?",
    options: [
      "Ataques de SQL injection em requisições HTTP",
      "Ameaças em tempo de execução como comunicação com IPs maliciosos conhecidos, web shells, execução de processos suspeitos na instância do App Service",
      "Ataques DDoS na camada de rede",
      "Cross-site scripting em respostas HTML"
    ],
    correctIndex: 1,
    explanation: "O Defender for App Service monitora o comportamento em tempo de execução do host da aplicação — detectando comunicação com servidores C2, uploads de web shell, cadeias de processos suspeitos e indicadores de aplicação comprometida. O WAF apenas inspeciona padrões de requisição/resposta HTTP na borda."
  }
]} />

## Limpeza

```bash
# Delete all resources
az group delete --name "rg-contoso-app-security" --yes --no-wait
```
