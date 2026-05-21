---
sidebar_position: 29
title: "Desafio 29: Segurança de IA – AI Gateway no Azure API Management para Foundry"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 29: Segurança de IA – AI Gateway no Azure API Management para Foundry

## Habilidades do exame cobertas

- Configurar o Azure API Management como um AI Gateway para modelos do Azure AI Foundry
- Implementar rate limiting baseado em tokens e políticas de cota para consumo de modelos de IA
- Configurar filtros de Content Safety e proteção contra jailbreak via políticas do APIM
- Habilitar semantic caching para reduzir custo e latência
- Monitorar uso de modelos de IA com métricas de tokens e rastreamento de custos
- Implementar load balancing entre múltiplos endpoints de modelos de IA

## Cenário

A Contoso Ltd está implantando modelos do Azure AI Foundry (GPT-4o, Claude e Llama) para múltiplas aplicações de negócios. A equipe de segurança exige governança centralizada sobre todo o tráfego de modelos de IA — incluindo rate limiting por consumidor, filtragem de Content Safety, detecção de jailbreak, alocação de custos por unidade de negócios e padrões de circuit-breaker para prevenir falhas em cascata. Você deve implantar o Azure API Management como um AI Gateway.

---

## Pré-requisitos

- Assinatura Azure com acesso de Contributor
- Instância do Azure API Management (Standard v2 ou Premium tier)
- Projeto do Azure AI Foundry com modelos implantados
- Recurso Azure OpenAI com implantações de modelo
- Azure CLI instalado com extensão `az apim`

---

## Tarefa 1: Implantar o Azure API Management com capacidades de AI Gateway

Crie uma instância do APIM configurada como AI Gateway.

```bash
# Create resource group
az group create --name "rg-contoso-aigateway" --location "eastus"

# Create APIM instance (Standard v2 for AI Gateway features)
az apim create \
    --name "contoso-ai-gateway" \
    --resource-group "rg-contoso-aigateway" \
    --location "eastus" \
    --publisher-name "Contoso Ltd" \
    --publisher-email "security@contoso.com" \
    --sku-name "StandardV2" \
    --sku-capacity 1

# Enable managed identity for APIM to authenticate to AI services
az apim update \
    --name "contoso-ai-gateway" \
    --resource-group "rg-contoso-aigateway" \
    --enable-managed-identity true

# Grant APIM identity access to Azure OpenAI
APIM_IDENTITY=$(az apim show \
    --name "contoso-ai-gateway" \
    --resource-group "rg-contoso-aigateway" \
    --query "identity.principalId" -o tsv)

az role assignment create \
    --assignee $APIM_IDENTITY \
    --role "Cognitive Services OpenAI User" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-aigateway/providers/Microsoft.CognitiveServices/accounts/contoso-openai"
```

---

## Tarefa 2: Importar a API do Azure OpenAI e configurar backends

Importe a especificação da API do Azure OpenAI e configure múltiplos endpoints de backend para load balancing.

```bash
# Import Azure OpenAI API from specification
az apim api import \
    --resource-group "rg-contoso-aigateway" \
    --service-name "contoso-ai-gateway" \
    --path "openai" \
    --display-name "Azure OpenAI Gateway" \
    --specification-format "OpenApiJson" \
    --specification-url "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/stable/2024-06-01/inference.json" \
    --api-type "http" \
    --protocols "https"

# Create backend pool for load balancing across regions
az apim backend create \
    --resource-group "rg-contoso-aigateway" \
    --service-name "contoso-ai-gateway" \
    --backend-id "openai-eastus" \
    --url "https://contoso-openai-eastus.openai.azure.com" \
    --protocol "http" \
    --title "OpenAI East US" \
    --description "Primary Azure OpenAI endpoint"

az apim backend create \
    --resource-group "rg-contoso-aigateway" \
    --service-name "contoso-ai-gateway" \
    --backend-id "openai-westus" \
    --url "https://contoso-openai-westus.openai.azure.com" \
    --protocol "http" \
    --title "OpenAI West US" \
    --description "Secondary Azure OpenAI endpoint"
```

Configure a política de load balancing:

```xml
<!-- APIM Policy: Load balancing with circuit breaker -->
<policies>
    <inbound>
        <base />
        <set-backend-service backend-id="openai-lb-pool" />
    </inbound>
    <backend>
        <retry condition="@(context.Response.StatusCode == 429 || context.Response.StatusCode >= 500)"
               count="3" interval="1" delta="1" max-interval="10" first-fast-retry="true">
            <forward-request buffer-request-body="true" />
        </retry>
    </backend>
</policies>
```

---

## Tarefa 3: Implementar rate limiting baseado em tokens

Configure rate limiting baseado no consumo de tokens em vez de contagem de requisições para governança precisa de modelos de IA.

```bash
# Create a product for rate-limited AI access
az apim product create \
    --resource-group "rg-contoso-aigateway" \
    --service-name "contoso-ai-gateway" \
    --product-id "ai-standard" \
    --display-name "AI Standard Tier" \
    --description "Standard AI access with 100K tokens per minute" \
    --approval-required true \
    --subscription-required true \
    --state "published"

# Create a product for premium AI access
az apim product create \
    --resource-group "rg-contoso-aigateway" \
    --service-name "contoso-ai-gateway" \
    --product-id "ai-premium" \
    --display-name "AI Premium Tier" \
    --description "Premium AI access with 500K tokens per minute" \
    --approval-required true \
    --subscription-required true \
    --state "published"
```

Aplique a política de rate limiting baseado em tokens:

```xml
<!-- APIM Policy: Token rate limiting for AI models -->
<policies>
    <inbound>
        <base />
        <!-- Token-based rate limiting using azure-openai-token-limit -->
        <azure-openai-token-limit
            tokens-per-minute="100000"
            counter-key="@(context.Subscription.Id)"
            estimate-prompt-tokens="true"
            remaining-tokens-variable-name="remainingTokens"
            remaining-tokens-header-name="x-ratelimit-remaining-tokens" />
    </inbound>
    <outbound>
        <base />
        <!-- Emit token usage metrics for cost tracking -->
        <azure-openai-emit-token-metric
            namespace="AIGateway">
            <dimension name="Subscription" value="@(context.Subscription.Name)" />
            <dimension name="BusinessUnit" value="@(context.Request.Headers.GetValueOrDefault("X-Business-Unit", "Unknown"))" />
            <dimension name="Model" value="@(context.Request.MatchedParameters["deployment-id"])" />
        </azure-openai-emit-token-metric>
    </outbound>
</policies>
```

---

## Tarefa 4: Configurar Content Safety e proteção contra jailbreak

Adicione filtragem de Content Safety para detectar e bloquear prompts prejudiciais ou manipulativos.

```xml
<!-- APIM Policy: Content safety and jailbreak detection -->
<policies>
    <inbound>
        <base />
        <!-- Extract the prompt for content safety analysis -->
        <set-variable name="userPrompt"
            value="@{
                var body = context.Request.Body.As<JObject>();
                var messages = body["messages"] as JArray;
                var lastMessage = messages?.Last;
                return lastMessage?["content"]?.ToString() ?? string.Empty;
            }" />

        <!-- Call Azure Content Safety API for jailbreak detection -->
        <send-request mode="new" response-variable-name="contentSafetyResponse" timeout="10">
            <set-url>https://contoso-content-safety.cognitiveservices.azure.com/contentsafety/text:shieldPrompt?api-version=2024-09-01</set-url>
            <set-method>POST</set-method>
            <set-header name="Content-Type" exists-action="override">
                <value>application/json</value>
            </set-header>
            <authentication-managed-identity resource="https://cognitiveservices.azure.com" />
            <set-body>@{
                return new JObject(
                    new JProperty("userPrompt", context.Variables["userPrompt"]),
                    new JProperty("documents", new JArray())
                ).ToString();
            }</set-body>
        </send-request>

        <!-- Block if jailbreak detected -->
        <choose>
            <when condition="@{
                var response = ((IResponse)context.Variables["contentSafetyResponse"]).Body.As<JObject>();
                var attack = response["userPromptAnalysis"]?["attackDetected"]?.Value<bool>() ?? false;
                return attack;
            }">
                <return-response>
                    <set-status code="400" reason="Content Policy Violation" />
                    <set-body>{"error": {"code": "content_policy_violation", "message": "Request blocked due to content safety policy."}}</set-body>
                </return-response>
            </when>
        </choose>
    </inbound>
</policies>
```

```bash
# Create Azure Content Safety resource for the gateway
az cognitiveservices account create \
    --name "contoso-content-safety" \
    --resource-group "rg-contoso-aigateway" \
    --kind "ContentSafety" \
    --sku "S0" \
    --location "eastus"

# Grant APIM identity access to Content Safety
az role assignment create \
    --assignee $APIM_IDENTITY \
    --role "Cognitive Services User" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-aigateway/providers/Microsoft.CognitiveServices/accounts/contoso-content-safety"
```

---

## Tarefa 5: Habilitar semantic caching para otimização de custos

Configure semantic caching para retornar respostas em cache para prompts semanticamente similares.

```bash
# Create Azure Cache for Redis (Enterprise tier for semantic caching)
az redis create \
    --name "contoso-ai-cache" \
    --resource-group "rg-contoso-aigateway" \
    --location "eastus" \
    --sku "Premium" \
    --vm-size "P1" \
    --redis-version "6"
```

```xml
<!-- APIM Policy: Semantic caching for AI responses -->
<policies>
    <inbound>
        <base />
        <!-- Check semantic cache before calling backend -->
        <azure-openai-semantic-cache-lookup
            score-threshold="0.8"
            embeddings-backend-id="openai-embeddings"
            embeddings-backend-auth="system-assigned" />
    </inbound>
    <outbound>
        <base />
        <!-- Store response in semantic cache -->
        <azure-openai-semantic-cache-store duration="3600" />
    </outbound>
</policies>
```

---

## Tarefa 6: Configurar monitoramento e dashboards de rastreamento de custos

Configure monitoramento abrangente para o AI Gateway.

```bash
# Create Log Analytics workspace for AI Gateway metrics
az monitor log-analytics workspace create \
    --resource-group "rg-contoso-aigateway" \
    --workspace-name "law-ai-gateway" \
    --location "eastus"

# Enable diagnostic settings for APIM
az monitor diagnostic-settings create \
    --name "ai-gateway-diagnostics" \
    --resource "/subscriptions/{sub-id}/resourceGroups/rg-contoso-aigateway/providers/Microsoft.ApiManagement/service/contoso-ai-gateway" \
    --workspace "/subscriptions/{sub-id}/resourceGroups/rg-contoso-aigateway/providers/Microsoft.OperationalInsights/workspaces/law-ai-gateway" \
    --logs '[{"category": "GatewayLogs", "enabled": true}, {"category": "WebSocketConnectionLogs", "enabled": true}]' \
    --metrics '[{"category": "AllMetrics", "enabled": true}]'

# Create alert for high token consumption
az monitor metrics alert create \
    --name "high-token-consumption" \
    --resource-group "rg-contoso-aigateway" \
    --scopes "/subscriptions/{sub-id}/resourceGroups/rg-contoso-aigateway/providers/Microsoft.ApiManagement/service/contoso-ai-gateway" \
    --condition "total Requests > 10000" \
    --window-size "5m" \
    --evaluation-frequency "1m" \
    --description "Alert when AI Gateway requests exceed threshold"

# Create alert for jailbreak attempts
az monitor scheduled-query create \
    --name "jailbreak-detection-alert" \
    --resource-group "rg-contoso-aigateway" \
    --scopes "/subscriptions/{sub-id}/resourceGroups/rg-contoso-aigateway/providers/Microsoft.OperationalInsights/workspaces/law-ai-gateway" \
    --condition "count 'AzureDiagnostics | where ResponseCode_d == 400 and ResponseBody_s contains \"content_policy_violation\"' > 5" \
    --window-size "PT5M" \
    --evaluation-frequency "PT1M" \
    --severity 2
```

---

## Quebre & Conserte

### Cenário 1: AI Gateway retornando erros 429 apesar de baixo uso de tokens

Usuários de negócios relatam erros constantes de rate limiting (429) do AI Gateway, mesmo que o dashboard de monitoramento mostre uso de tokens bem abaixo dos limites configurados.

<details>
<summary>Mostrar solução</summary>

```bash
# 1. Check if the issue is at APIM level or backend level
az monitor metrics list \
    --resource "/subscriptions/{sub-id}/resourceGroups/rg-contoso-aigateway/providers/Microsoft.ApiManagement/service/contoso-ai-gateway" \
    --metric "Requests" \
    --dimension "BackendResponseCode" \
    --interval "PT1M"

# 2. The 429s are likely from the Azure OpenAI backend, not APIM rate limiting
# Check APIM gateway logs to see if BackendResponseCode is 429
# This means the backend model deployment has its own TPM limits

# 3. Verify the azure-openai-token-limit policy is using estimate-prompt-tokens
# If not, tokens are only counted AFTER the response, allowing bursts

# 4. Fix: Implement proper retry with exponential backoff
# Update the backend policy to handle backend 429s with retry:
cat <<'EOF'
<backend>
    <retry condition="@(context.Response.StatusCode == 429)"
           count="3" interval="2" delta="2" max-interval="30"
           first-fast-retry="false">
        <set-backend-service backend-id="openai-westus" />
        <forward-request buffer-request-body="true" />
    </retry>
</backend>
EOF

# 5. Consider increasing backend model TPM or adding more deployments
# to the load balancer pool
```

</details>

### Cenário 2: Semantic cache retornando respostas desatualizadas/incorretas

Usuários estão recebendo respostas em cache que estão factualmente incorretas porque os dados subjacentes mudaram desde que a resposta foi armazenada em cache.

<details>
<summary>Mostrar solução</summary>

```bash
# 1. Review the cache duration setting
# Current: duration="3600" (1 hour) - too long for dynamic data

# 2. Lower the semantic cache similarity threshold
# Current: score-threshold="0.8" - too permissive, similar but different
# queries are returning wrong cached results

# 3. Fix: Reduce cache duration and increase threshold
cat <<'EOF'
<azure-openai-semantic-cache-lookup
    score-threshold="0.95"
    embeddings-backend-id="openai-embeddings"
    embeddings-backend-auth="system-assigned" />

<azure-openai-semantic-cache-store duration="600" />
EOF

# 4. Add cache bypass for specific scenarios
cat <<'EOF'
<choose>
    <when condition="@(context.Request.Headers.GetValueOrDefault("X-Cache-Bypass", "false") == "true")">
        <!-- Skip cache lookup for explicit bypass -->
    </when>
    <otherwise>
        <azure-openai-semantic-cache-lookup score-threshold="0.95"
            embeddings-backend-id="openai-embeddings"
            embeddings-backend-auth="system-assigned" />
    </otherwise>
</choose>
EOF

# 5. Flush the current cache
az redis force-reboot \
    --name "contoso-ai-cache" \
    --resource-group "rg-contoso-aigateway" \
    --reboot-type "AllNodes"
```

</details>

### Cenário 3: Detecção de jailbreak bloqueando prompts legítimos de negócios

A política de Content Safety está produzindo falsos positivos — bloqueando consultas das equipes jurídica e de compliance que contêm palavras como "ataque", "violação" e "explorar" em contextos legais legítimos.

<details>
<summary>Mostrar solução</summary>

```xml
<!-- Fix: Add allowlist for specific subscription IDs (Legal team) -->
<choose>
    <when condition="@(context.Subscription.Name == "Legal-Team-Subscription")">
        <!-- Legal team: Use higher threshold for jailbreak detection -->
        <send-request mode="new" response-variable-name="contentSafetyResponse" timeout="10">
            <set-url>https://contoso-content-safety.cognitiveservices.azure.com/contentsafety/text:shieldPrompt?api-version=2024-09-01</set-url>
            <set-method>POST</set-method>
            <set-header name="Content-Type" exists-action="override">
                <value>application/json</value>
            </set-header>
            <authentication-managed-identity resource="https://cognitiveservices.azure.com" />
            <set-body>@{
                return new JObject(
                    new JProperty("userPrompt", context.Variables["userPrompt"]),
                    new JProperty("documents", new JArray())
                ).ToString();
            }</set-body>
        </send-request>
        <!-- Only block if BOTH attack AND injection detected -->
        <choose>
            <when condition="@{
                var response = ((IResponse)context.Variables["contentSafetyResponse"]).Body.As<JObject>();
                var attack = response["userPromptAnalysis"]?["attackDetected"]?.Value<bool>() ?? false;
                // Additional check: require high severity
                return attack;
            }">
                <!-- Log but allow for legal team - alert security for review -->
                <set-header name="X-Content-Safety-Warning" exists-action="override">
                    <value>potential-jailbreak-logged</value>
                </set-header>
            </when>
        </choose>
    </when>
    <otherwise>
        <!-- Standard jailbreak detection for other teams -->
    </otherwise>
</choose>
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a principal vantagem de usar o Azure API Management como AI Gateway em vez de conexões diretas do cliente ao modelo?",
    options: [
      "O AI Gateway fornece tempos de inferência de modelo mais rápidos",
      "Governança centralizada incluindo rate limiting, Content Safety, rastreamento de custos e load balancing entre todos os consumidores de modelos de IA",
      "O AI Gateway elimina a necessidade de implantações de modelos do Azure OpenAI",
      "O AI Gateway fornece capacidades integradas de fine-tuning de modelos"
    ],
    correctIndex: 1,
    explanation: "O APIM como AI Gateway fornece governança centralizada sobre todo o tráfego de modelos de IA, habilitando rate limiting consistente, filtragem de Content Safety, alocação de custos por consumidor, semantic caching e load balancing entre múltiplos endpoints de modelos."
  },
  {
    question: "Como a política azure-openai-token-limit difere do rate limiting padrão do APIM?",
    options: [
      "Ela conta requisições HTTP individuais em vez de tokens",
      "Ela mede e limita o consumo com base no uso de tokens (tokens de prompt + completion) em vez de contagem de requisições",
      "Ela se aplica apenas a respostas de streaming",
      "Ela requer um tier de licenciamento separado"
    ],
    correctIndex: 1,
    explanation: "A política azure-openai-token-limit conta especificamente tokens de IA (tokens de prompt estimados antes da requisição e tokens de completion contados depois) em vez de requisições HTTP, fornecendo rate limiting preciso baseado em consumo para cargas de trabalho de IA."
  },
  {
    question: "Qual é o propósito do semantic caching em um AI Gateway?",
    options: [
      "Armazenar pesos do modelo mais próximos dos usuários para inferência mais rápida",
      "Retornar respostas em cache para prompts semanticamente similares, reduzindo custo e latência sem chamar novamente o modelo de IA",
      "Criptografar todas as respostas do modelo de IA em repouso",
      "Armazenar em cache tokens de autenticação de usuários para login mais rápido"
    ],
    correctIndex: 1,
    explanation: "O semantic caching usa embeddings para identificar prompts semanticamente similares e retorna respostas previamente armazenadas em cache, evitando chamadas redundantes ao backend do modelo de IA. Isso reduz tanto custo (menos tokens consumidos) quanto latência."
  },
  {
    question: "Como o AI Gateway deve lidar com a detecção de jailbreak para prompts de negócios sensíveis que contêm terminologia de segurança?",
    options: [
      "Desabilitar completamente a detecção de jailbreak para evitar falsos positivos",
      "Usar políticas baseadas em subscription para aplicar diferentes limites de sensibilidade por consumidor, com registro para revisão",
      "Bloquear todas as requisições contendo palavras como 'ataque' ou 'explorar'",
      "Encaminhar requisições suspeitas para um moderador humano antes do processamento"
    ],
    correctIndex: 1,
    explanation: "A melhor prática é usar a diferenciação de políticas baseada em subscription/product do APIM para aplicar níveis de sensibilidade apropriados por grupo de consumidores (por exemplo, equipes jurídicas podem usar terminologia de segurança legitimamente), enquanto registra todas as requisições sinalizadas para revisão de segurança."
  }
]} />

## Limpeza

```bash
# Delete all resources
az group delete --name "rg-contoso-aigateway" --yes --no-wait
```
