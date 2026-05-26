---
sidebar_position: 5
title: "Desafio 04: SDKs, REST APIs e Autenticação"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 04: SDKs, REST APIs e Autenticação

:::info Tempo Estimado
**45 min** | **Custo**: ~$0.25 | **Domínio**: Planejar e Gerenciar Soluções de IA (20-25%)
:::

## Habilidades do exame cobertas
- Instalar SDKs e APIs para Azure AI services
- Determinar o endpoint padrão de um serviço
- Gerenciar autenticação usando chaves e Microsoft Entra ID
- Implementar DefaultAzureCredential para cargas de trabalho em produção
- Entender versionamento de API e compatibilidade de SDK

## Visão Geral

Os Azure AI services podem ser consumidos via SDKs específicos de linguagem ou chamadas diretas à REST API. O exame AI-102 testa sua capacidade de escolher o método de autenticação correto, entender a construção de endpoints e lidar com versionamento de API corretamente.

Existem dois padrões principais de autenticação: **baseado em chave** (usando `AzureKeyCredential` ou o cabeçalho `Ocp-Apim-Subscription-Key`) e **Microsoft Entra ID** (usando `DefaultAzureCredential` com tokens bearer OAuth2). A autenticação baseada em chave é mais simples, porém menos segura—chaves podem ser vazadas e não fornecem trilhas de auditoria baseadas em identidade. A autenticação via Entra ID requer um subdomínio personalizado e atribuições de role RBAC adequadas, mas oferece suporte a managed identity, acesso condicional e auditoria granular.

Este desafio guia você por ambos os métodos de autenticação usando o SDK Azure AI Text Analytics, demonstra chamadas REST API com cabeçalhos adequados e mostra como o `DefaultAzureCredential` percorre múltiplos tipos de credencial para um desenvolvimento local-para-nuvem transparente.

## Arquitetura

Você irá autenticar no Azure AI Language usando ambos os métodos (baseado em chave e Entra ID), fazer a mesma chamada de API com cada um e comparar os padrões de requisição.

![Challenge 04 topology](/img/ai-102/challenge-04-topology.svg)

## Pré-requisitos
- Assinatura Azure com um recurso Azure AI Language (com subdomínio personalizado)
- Azure CLI 2.50+ instalado e autenticado
- Python 3.9+ com `pip` ou .NET 8 SDK
- Atribuição de role: "Cognitive Services User" no recurso para autenticação via Entra ID

## Implementação

### Tarefa 1: Autenticação Baseada em Chave com Azure AI Text Analytics

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.core.credentials import AzureKeyCredential
from azure.ai.textanalytics import TextAnalyticsClient

# Key-based authentication
endpoint = os.environ["AZURE_AI_ENDPOINT"]  # https://<name>.cognitiveservices.azure.com/
key = os.environ["AZURE_AI_KEY"]

credential = AzureKeyCredential(key)
client = TextAnalyticsClient(endpoint=endpoint, credential=credential)

# Detect language
documents = [
    "This is a document written in English.",
    "Este es un documento escrito en español.",
    "Dies ist ein auf Deutsch verfasstes Dokument."
]

result = client.detect_language(documents=documents)

for doc in result:
    if not doc.is_error:
        print(f"'{doc.primary_language.name}' (confidence: {doc.primary_language.confidence_score:.2f})")
    else:
        print(f"Error: {doc.error.code} - {doc.error.message}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.TextAnalytics;

// Key-based authentication
var endpoint = new Uri(Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")!);
var key = new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_AI_KEY")!);

var client = new TextAnalyticsClient(endpoint, key);

// Detect language
var documents = new[]
{
    "This is a document written in English.",
    "Este es un documento escrito en español.",
    "Dies ist ein auf Deutsch verfasstes Dokument."
};

var response = await client.DetectLanguageBatchAsync(documents);

foreach (var result in response.Value)
{
    if (!result.HasError)
    {
        Console.WriteLine($"'{result.PrimaryLanguage.Name}' " +
            $"(confidence: {result.PrimaryLanguage.ConfidenceScore:F2})");
    }
    else
    {
        Console.WriteLine($"Error: {result.Error.ErrorCode} - {result.Error.Message}");
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="${AZURE_AI_ENDPOINT}"
KEY="${AZURE_AI_KEY}"

# Language detection via REST with key-based auth
curl -s "${ENDPOINT}language/:analyze-text?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "LanguageDetection",
    "parameters": { "modelVersion": "latest" },
    "analysisInput": {
      "documents": [
        {"id": "1", "text": "This is a document written in English."},
        {"id": "2", "text": "Este es un documento escrito en español."},
        {"id": "3", "text": "Dies ist ein auf Deutsch verfasstes Dokument."}
      ]
    }
  }' | python -m json.tool
```

</TabItem>
</Tabs>

### Tarefa 2: Autenticação Microsoft Entra ID com DefaultAzureCredential

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.identity import DefaultAzureCredential
from azure.ai.textanalytics import TextAnalyticsClient

# Entra ID authentication (requires custom subdomain on resource)
endpoint = os.environ["AZURE_AI_ENDPOINT"]  # Must be custom: https://<name>.cognitiveservices.azure.com/

# DefaultAzureCredential tries: Environment → Managed Identity → Azure CLI → etc.
credential = DefaultAzureCredential()
client = TextAnalyticsClient(endpoint=endpoint, credential=credential)

# Same API call, different auth method
documents = ["Azure AI services support multiple authentication methods."]

# Sentiment analysis
result = client.analyze_sentiment(documents=documents)

for doc in result:
    if not doc.is_error:
        print(f"Sentiment: {doc.sentiment}")
        print(f"  Positive: {doc.confidence_scores.positive:.2f}")
        print(f"  Neutral:  {doc.confidence_scores.neutral:.2f}")
        print(f"  Negative: {doc.confidence_scores.negative:.2f}")

# Key phrase extraction
keyphrases = client.extract_key_phrases(documents=documents)
for doc in keyphrases:
    if not doc.is_error:
        print(f"Key phrases: {', '.join(doc.key_phrases)}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.AI.TextAnalytics;

// Entra ID authentication with DefaultAzureCredential
var endpoint = new Uri(Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")!);
var credential = new DefaultAzureCredential();

var client = new TextAnalyticsClient(endpoint, credential);

// Sentiment analysis
var documents = new[] { "Azure AI services support multiple authentication methods." };

var sentimentResults = await client.AnalyzeSentimentBatchAsync(documents);

foreach (var result in sentimentResults.Value)
{
    if (!result.HasError)
    {
        Console.WriteLine($"Sentiment: {result.DocumentSentiment.Sentiment}");
        Console.WriteLine($"  Positive: {result.DocumentSentiment.ConfidenceScores.Positive:F2}");
        Console.WriteLine($"  Neutral:  {result.DocumentSentiment.ConfidenceScores.Neutral:F2}");
        Console.WriteLine($"  Negative: {result.DocumentSentiment.ConfidenceScores.Negative:F2}");
    }
}

// Key phrase extraction
var keyPhraseResults = await client.ExtractKeyPhrasesBatchAsync(documents);
foreach (var result in keyPhraseResults.Value)
{
    if (!result.HasError)
    {
        Console.WriteLine($"Key phrases: {string.Join(", ", result.KeyPhrases)}");
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="${AZURE_AI_ENDPOINT}"

# Get bearer token using Azure CLI (simulates DefaultAzureCredential)
TOKEN=$(az account get-access-token \
  --resource "https://cognitiveservices.azure.com" \
  --query "accessToken" -o tsv)

# Sentiment analysis with Entra ID bearer token
curl -s "${ENDPOINT}language/:analyze-text?api-version=2023-04-01" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "SentimentAnalysis",
    "parameters": { "modelVersion": "latest" },
    "analysisInput": {
      "documents": [
        {"id": "1", "text": "Azure AI services support multiple authentication methods."}
      ]
    }
  }' | python -m json.tool

# Note: No Ocp-Apim-Subscription-Key header needed with bearer token
# The token scope is https://cognitiveservices.azure.com/.default
```

</TabItem>
</Tabs>

### Tarefa 3: Atribuir Role RBAC e Entender a Cadeia de Credenciais

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential, ChainedTokenCredential
from azure.identity import AzureCliCredential, ManagedIdentityCredential

# DefaultAzureCredential tries credentials in this order:
# 1. EnvironmentCredential (AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET)
# 2. WorkloadIdentityCredential (Kubernetes)
# 3. ManagedIdentityCredential (Azure VMs, App Service, Functions)
# 4. AzureCliCredential (local dev with 'az login')
# 5. AzurePowerShellCredential
# 6. AzureDeveloperCliCredential

# For production: use managed identity explicitly
production_credential = ManagedIdentityCredential()

# For local development: use Azure CLI
dev_credential = AzureCliCredential()

# Custom chain for specific needs
custom_credential = ChainedTokenCredential(
    ManagedIdentityCredential(),
    AzureCliCredential()
)

# Verify which credential is being used
from azure.identity import DefaultAzureCredential
import logging

logging.basicConfig(level=logging.DEBUG)
logging.getLogger("azure.identity").setLevel(logging.DEBUG)

credential = DefaultAzureCredential()
# Logs will show which credential in the chain succeeded

# Required RBAC role: "Cognitive Services User"
# az role assignment create \
#   --assignee <principal-id> \
#   --role "Cognitive Services User" \
#   --scope /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<name>
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.AI.TextAnalytics;

// DefaultAzureCredential tries multiple sources automatically
// Order: Environment → Workload Identity → Managed Identity → Azure CLI → etc.

// For production with managed identity
var productionCredential = new ManagedIdentityCredential();

// For local development
var devCredential = new AzureCliCredential();

// Custom chain with specific order
var customCredential = new ChainedTokenCredential(
    new ManagedIdentityCredential(),
    new AzureCliCredential()
);

// DefaultAzureCredential with options
var options = new DefaultAzureCredentialOptions
{
    ExcludeEnvironmentCredential = false,
    ExcludeManagedIdentityCredential = false,
    ExcludeAzureCliCredential = false,
    // Exclude credentials you don't use for faster auth
    ExcludeVisualStudioCredential = true,
    ExcludeVisualStudioCodeCredential = true,
    ExcludeSharedTokenCacheCredential = true
};

var credential = new DefaultAzureCredential(options);
var client = new TextAnalyticsClient(
    new Uri(Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")!),
    credential);

// Test authentication
var result = await client.DetectLanguageAsync("Test connectivity");
Console.WriteLine($"Auth successful! Detected: {result.Value.Name}");

// Required RBAC: "Cognitive Services User" role
// az role assignment create --assignee <principal-id> \
//   --role "Cognitive Services User" --scope <resource-id>
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Assign "Cognitive Services User" role for Entra ID auth
RESOURCE_ID=$(az cognitiveservices account show \
  --name ai102-language-04 \
  --resource-group rg-ai102-challenge04 \
  --query "id" -o tsv)

USER_PRINCIPAL=$(az ad signed-in-user show --query "id" -o tsv)

az role assignment create \
  --assignee "${USER_PRINCIPAL}" \
  --role "Cognitive Services User" \
  --scope "${RESOURCE_ID}"

# Verify role assignment
az role assignment list \
  --scope "${RESOURCE_ID}" \
  --assignee "${USER_PRINCIPAL}" \
  -o table

# Compare auth methods - both produce same results:
# Method 1: Key-based
curl -s "${ENDPOINT}language/:analyze-text?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"kind":"LanguageDetection","parameters":{"modelVersion":"latest"},"analysisInput":{"documents":[{"id":"1","text":"Hello"}]}}'

# Method 2: Bearer token
TOKEN=$(az account get-access-token \
  --resource "https://cognitiveservices.azure.com" \
  --query "accessToken" -o tsv)

curl -s "${ENDPOINT}language/:analyze-text?api-version=2023-04-01" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"kind":"LanguageDetection","parameters":{"modelVersion":"latest"},"analysisInput":{"documents":[{"id":"1","text":"Hello"}]}}'
```

</TabItem>
</Tabs>

## Saída Esperada

```text
'English' (confidence: 1.00)
'Spanish' (confidence: 1.00)
'German' (confidence: 1.00)

Sentiment: neutral
  Positive: 0.10
  Neutral:  0.88
  Negative: 0.02
Key phrases: Azure AI services, multiple authentication methods

Auth successful! Detected: English
```

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Autenticação Entra 401 | `AuthenticationFailed` | Atribuição de role RBAC ausente | Atribuir a role "Cognitive Services User" à identidade |
| Domínio personalizado ausente | `InvalidAuthentication` com bearer token | Recurso usa endpoint regional (sem subdomínio personalizado) | Recriar recurso com o parâmetro `--custom-domain` |
| Audience do token incorreta | `401 Unauthorized` | Token solicitado para recurso errado | Usar `https://cognitiveservices.azure.com` como resource/scope |
| Incompatibilidade de versão do SDK | `ApiVersionNotSupported` | Versão do SDK espera versão de API mais recente | Fixar versão da API ou atualizar pacote do SDK |
| Chave no cabeçalho errado | `401` na chamada REST | Usando `api-key` em vez de `Ocp-Apim-Subscription-Key` | Azure AI services usam `Ocp-Apim-Subscription-Key`; Azure OpenAI usa `api-key` |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual role RBAC é o mínimo necessário para uma aplicação fazer chamadas de inferência aos Azure AI services usando autenticação Microsoft Entra?",
    options: [
      "Contributor",
      "Cognitive Services Contributor",
      "Cognitive Services User",
      "Reader"
    ],
    correctAnswer: 2,
    explanation: "Cognitive Services User é a role RBAC mínima necessária para inferência (leitura/chamadas de APIs). Cognitive Services Contributor permite gerenciar o recurso em si. Contributor é muito ampla, e Reader não pode fazer chamadas de API."
  },
  {
    question: "Sua aplicação roda no Azure App Service e precisa autenticar no Azure AI Language sem armazenar credenciais. O que você deve usar?",
    options: [
      "Armazenar a chave de API nas configurações de aplicação do App Service",
      "Usar uma managed identity atribuída pelo sistema com DefaultAzureCredential",
      "Armazenar a chave de API no Azure Key Vault e recuperá-la na inicialização",
      "Usar um certificado armazenado no repositório de certificados do App Service"
    ],
    correctAnswer: 1,
    explanation: "Uma managed identity atribuída pelo sistema com DefaultAzureCredential elimina completamente o gerenciamento de credenciais. A identidade é provisionada, rotacionada e removida automaticamente pelo Azure. Nenhum segredo para armazenar ou gerenciar."
  },
  {
    question: "Qual é o nome correto do cabeçalho HTTP para autenticação por chave de API ao chamar Azure AI services (não-OpenAI) via REST?",
    options: [
      "api-key",
      "Authorization: Bearer <key>",
      "Ocp-Apim-Subscription-Key",
      "x-api-key"
    ],
    correctAnswer: 2,
    explanation: "Os Azure AI services (Language, Vision, Speech, etc.) usam o cabeçalho 'Ocp-Apim-Subscription-Key' para autenticação baseada em chave. Nota: Azure OpenAI usa 'api-key' em vez disso—eles têm convenções de cabeçalho diferentes."
  },
  {
    question: "DefaultAzureCredential falha localmente com 'No credential in this chain provided a token'. Qual é a correção mais provável?",
    options: [
      "Instalar o pacote azure-identity novamente",
      "Executar 'az login' para autenticar o Azure CLI",
      "Definir a variável de ambiente AZURE_AI_KEY",
      "Reiniciar a aplicação com privilégios de administrador"
    ],
    correctAnswer: 1,
    explanation: "DefaultAzureCredential tenta múltiplas fontes de credencial em ordem. Localmente, ele geralmente depende do AzureCliCredential—se você não executou 'az login' ou sua sessão expirou, nenhuma credencial na cadeia pode fornecer um token."
  },
  {
    question: "Você precisa chamar o Azure AI Language com a versão de API '2023-04-01', mas o SDK mais recente usa '2024-04-01' como padrão. Como você deve lidar com isso?",
    options: [
      "Fazer downgrade do pacote SDK para uma versão mais antiga",
      "Usar chamadas REST API em vez do SDK",
      "Definir o parâmetro api_version ao construir o cliente, se suportado",
      "Versões de API são sempre compatíveis com versões anteriores, então nenhuma ação é necessária"
    ],
    correctAnswer: 2,
    explanation: "A maioria dos SDKs do Azure AI permite especificar a versão da API via parâmetro ou opções do cliente. Isso permite fixar uma versão específica sem fazer downgrade do pacote inteiro, que é a abordagem recomendada para controle de versão."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-challenge04 --yes --no-wait
```

## Saiba Mais
- [Authenticate with Microsoft Entra ID](https://learn.microsoft.com/azure/ai-services/authentication)
- [DefaultAzureCredential overview](https://learn.microsoft.com/python/api/azure-identity/azure.identity.defaultazurecredential)
- [Azure AI services SDKs](https://learn.microsoft.com/azure/ai-services/reference/sdk-package-resources)
- [REST API reference](https://learn.microsoft.com/rest/api/cognitiveservices/)
