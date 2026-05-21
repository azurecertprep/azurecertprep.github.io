---
sidebar_position: 29
title: "Challenge 29: AI Security – AI Gateway in Azure API Management for Foundry"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 29: AI Security – AI Gateway in Azure API Management for Foundry

## Exam skills covered

- Configure Azure API Management as an AI Gateway for Azure AI Foundry models
- Implement token rate limiting and quota policies for AI model consumption
- Configure content safety filters and jailbreak protection via APIM policies
- Enable semantic caching to reduce cost and latency
- Monitor AI model usage with token metrics and cost tracking
- Implement load balancing across multiple AI model endpoints

## Scenario

Contoso Ltd is deploying Azure AI Foundry models (GPT-4o, Claude, and Llama) for multiple business applications. The security team requires centralized governance over all AI model traffic — including rate limiting per consumer, content safety filtering, jailbreak detection, cost allocation per business unit, and circuit-breaker patterns to prevent cascading failures. You must deploy Azure API Management as an AI Gateway.

---

## Prerequisites

- Azure subscription with Contributor access
- Azure API Management instance (Standard v2 or Premium tier)
- Azure AI Foundry project with deployed models
- Azure OpenAI resource with model deployments
- Azure CLI installed with `az apim` extension

---

## Task 1: Deploy Azure API Management with AI Gateway capabilities

Create an APIM instance configured as an AI Gateway.

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
az apim identity assign \
    --name "contoso-ai-gateway" \
    --resource-group "rg-contoso-aigateway"

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

## Task 2: Import Azure OpenAI API and configure backends

Import the Azure OpenAI API specification and configure multiple backend endpoints for load balancing.

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

Configure load balancing policy:

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

## Task 3: Implement token-based rate limiting

Configure rate limiting based on token consumption rather than request count for accurate AI model governance.

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

Apply token-based rate limiting policy:

```xml
<!-- APIM Policy: Token rate limiting for AI models -->
<policies>
    <inbound>
        <base />
        <!-- Token-based rate limiting using llm-token-limit -->
        <!-- (Previously named azure-openai-token-limit; renamed to support all LLM providers) -->
        <llm-token-limit
            tokens-per-minute="100000"
            counter-key="@(context.Subscription.Id)"
            estimate-prompt-tokens="true"
            remaining-tokens-variable-name="remainingTokens" />
    </inbound>
    <outbound>
        <base />
        <!-- Emit token usage metrics for cost tracking -->
        <llm-emit-token-metric
            namespace="AIGateway">
            <dimension name="Subscription" value="@(context.Subscription.Name)" />
            <dimension name="BusinessUnit" value="@(context.Request.Headers.GetValueOrDefault("X-Business-Unit", "Unknown"))" />
            <dimension name="Model" value="@(context.Request.MatchedParameters["deployment-id"])" />
        </llm-emit-token-metric>
    </outbound>
</policies>
```

---

## Task 4: Configure content safety and jailbreak protection

Add content safety filtering to detect and block harmful or manipulative prompts.

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

## Task 5: Enable semantic caching for cost optimization

Configure semantic caching to return cached responses for semantically similar prompts.

```bash
# Create Azure Cache for Redis Enterprise (required for semantic caching with RediSearch module)
# Note: Semantic caching requires Enterprise tier, not Premium, because it needs the RediSearch module
az redisenterprise create \
    --name "contoso-ai-cache" \
    --resource-group "rg-contoso-aigateway" \
    --location "eastus" \
    --sku "Enterprise_E10"

# Create a Redis database with the RediSearch module enabled
az redisenterprise database create \
    --cluster-name "contoso-ai-cache" \
    --resource-group "rg-contoso-aigateway" \
    --modules "[{\"name\":\"RediSearch\"}]" \
    --eviction-policy "NoEviction"
```

```xml
<!-- APIM Policy: Semantic caching for AI responses -->
<policies>
    <inbound>
        <base />
        <!-- Check semantic cache before calling backend -->
        <!-- (Previously named azure-openai-semantic-cache-lookup; renamed to support all LLM providers) -->
        <llm-semantic-cache-lookup
            score-threshold="0.8"
            embeddings-backend-id="openai-embeddings"
            embeddings-backend-auth="system-assigned" />
    </inbound>
    <outbound>
        <base />
        <!-- Store response in semantic cache -->
        <llm-semantic-cache-store duration="3600" />
    </outbound>
</policies>
```

---

## Task 6: Configure monitoring and cost tracking dashboards

Set up comprehensive monitoring for the AI Gateway.

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

## Break & Fix

### Scenario 1: AI Gateway returning 429 errors despite low token usage

Business users report constant rate limiting (429) errors from the AI Gateway even though the monitoring dashboard shows token usage well below the configured limits.

<details>
<summary>Show solution</summary>

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

# 3. Verify the llm-token-limit policy is using estimate-prompt-tokens
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

### Scenario 2: Semantic cache returning outdated/incorrect responses

Users are receiving cached responses that are factually incorrect because the underlying data has changed since the response was cached.

<details>
<summary>Show solution</summary>

```bash
# 1. Review the cache duration setting
# Current: duration="3600" (1 hour) - too long for dynamic data

# 2. Lower the semantic cache similarity threshold
# Current: score-threshold="0.8" - too permissive, similar but different
# queries are returning wrong cached results

# 3. Fix: Reduce cache duration and increase threshold
cat <<'EOF'
<llm-semantic-cache-lookup
    score-threshold="0.95"
    embeddings-backend-id="openai-embeddings"
    embeddings-backend-auth="system-assigned" />

<llm-semantic-cache-store duration="600" />
EOF

# 4. Add cache bypass for specific scenarios
cat <<'EOF'
<choose>
    <when condition="@(context.Request.Headers.GetValueOrDefault("X-Cache-Bypass", "false") == "true")">
        <!-- Skip cache lookup for explicit bypass -->
    </when>
    <otherwise>
        <llm-semantic-cache-lookup score-threshold="0.95"
            embeddings-backend-id="openai-embeddings"
            embeddings-backend-auth="system-assigned" />
    </otherwise>
</choose>
EOF

# 5. Flush the current cache
az redisenterprise database flush \
    --cluster-name "contoso-ai-cache" \
    --resource-group "rg-contoso-aigateway"
```

</details>

### Scenario 3: Jailbreak detection blocking legitimate business prompts

The content safety policy is producing false positives — blocking legal and compliance team queries that contain words like "attack," "breach," and "exploit" in legitimate legal contexts.

<details>
<summary>Show solution</summary>

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

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the primary advantage of using Azure API Management as an AI Gateway over direct client-to-model connections?",
    options: [
      "AI Gateway provides faster model inference times",
      "Centralized governance including rate limiting, content safety, cost tracking, and load balancing across all AI model consumers",
      "AI Gateway eliminates the need for Azure OpenAI model deployments",
      "AI Gateway provides built-in model fine-tuning capabilities"
    ],
    correctIndex: 1,
    explanation: "APIM as AI Gateway provides centralized governance over all AI model traffic, enabling consistent rate limiting, content safety filtering, cost allocation per consumer, semantic caching, and load balancing across multiple model endpoints."
  },
  {
    question: "How does the llm-token-limit policy differ from standard APIM rate limiting?",
    options: [
      "It counts individual HTTP requests instead of tokens",
      "It measures and limits consumption based on token usage (prompt + completion tokens) rather than request count",
      "It only applies to streaming responses",
      "It requires a separate licensing tier"
    ],
    correctIndex: 1,
    explanation: "The llm-token-limit policy (previously azure-openai-token-limit) specifically counts AI tokens (prompt tokens estimated before the request and completion tokens counted after) rather than HTTP requests, providing accurate consumption-based rate limiting for AI workloads."
  },
  {
    question: "What is the purpose of semantic caching in an AI Gateway?",
    options: [
      "To store model weights closer to users for faster inference",
      "To return cached responses for semantically similar prompts, reducing cost and latency without re-calling the AI model",
      "To encrypt all AI model responses at rest",
      "To cache user authentication tokens for faster login"
    ],
    correctIndex: 1,
    explanation: "Semantic caching uses embeddings to identify semantically similar prompts and returns previously cached responses, avoiding redundant calls to the AI model backend. This reduces both cost (fewer token consumed) and latency."
  },
  {
    question: "How should the AI Gateway handle jailbreak detection for sensitive business prompts that contain security-related terminology?",
    options: [
      "Disable jailbreak detection entirely to avoid false positives",
      "Use subscription-based policies to apply different sensitivity thresholds per consumer, with logging for review",
      "Block all requests containing words like 'attack' or 'exploit'",
      "Route suspicious requests to a human moderator before processing"
    ],
    correctIndex: 1,
    explanation: "Best practice is to use APIM's subscription/product-based policy differentiation to apply appropriate sensitivity levels per consumer group (e.g., legal teams may use security terminology legitimately), while logging all flagged requests for security review."
  }
]} />

## Cleanup

```bash
# Delete all resources
az group delete --name "rg-contoso-aigateway" --yes --no-wait
```
