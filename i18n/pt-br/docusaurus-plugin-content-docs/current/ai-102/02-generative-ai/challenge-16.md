---
sidebar_position: 7
title: "Desafio 16: Azure OpenAI: Provisionamento e Configuração"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 16: Azure OpenAI: Provisionamento e Configuração

:::info Tempo Estimado
**45-60 min** | **Custo**: ~$1.00 (estimado) | **Domínio**: Generative AI Solutions (15-20%)
:::

## Habilidades do exame cobertas
- Provisionar um recurso Azure OpenAI
- Selecionar e implantar um modelo Azure OpenAI
- Configurar limites de taxa e gerenciar tipos de implantação

## Visão Geral

O Azure OpenAI Service fornece acesso via REST API aos poderosos modelos de linguagem da OpenAI, incluindo GPT-4o, GPT-4o-mini e modelos de embedding. O provisionamento requer a seleção do SKU apropriado (S0 para consumo padrão) e o entendimento das opções de implantação disponíveis: **Standard** (infraestrutura compartilhada, pagamento por token), **Global Standard** (roteamento otimizado entre regiões) e **Provisioned Throughput Units (PTU)** para capacidade garantida.

Cada implantação está sujeita a limites de taxa medidos em Tokens Per Minute (TPM) e Requests Per Minute (RPM). Quando os limites são excedidos, o serviço retorna respostas HTTP 429 com headers `Retry-After`. Aplicações em produção devem implementar estratégias de retry com exponential backoff para lidar com o throttling de forma elegante.

As versões da API seguem o formato `YYYY-MM-DD` com sufixos preview para recursos pré-GA. As aplicações devem usar versões estáveis da API (ex.: `2024-10-21`) e planejar a aposentadoria de versões, que é anunciada com pelo menos 90 dias de antecedência.

## Arquitetura

Este desafio provisiona um recurso Azure OpenAI, implanta modelos com configurações específicas de capacidade e testa o comportamento de rate-limiting e estratégias de retry.

![Challenge 16 topology](/img/ai-102/challenge-16-topology.svg)

## Pré-requisitos
- Assinatura Azure com acesso ao Azure OpenAI aprovado
- Azure CLI 2.60+ instalado
- Python 3.9+ com pacotes `openai` e `azure-identity`
- .NET 8 SDK com pacote NuGet `Azure.AI.OpenAI`

## Implementação

### Tarefa 1: Provisionar Recurso Azure OpenAI

Crie um recurso Azure OpenAI com o SKU S0 em uma região suportada.

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Provisioning is done via Azure CLI or ARM—use the resource with Python SDK
import os
from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

# Option 1: API Key authentication
client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

# Option 2: Microsoft Entra ID authentication (recommended)
token_provider = get_bearer_token_provider(
    DefaultAzureCredential(),
    "https://cognitiveservices.azure.com/.default"
)

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    azure_ad_token_provider=token_provider,
    api_version="2024-10-21"
)

# Verify connectivity
response = client.chat.completions.create(
    model="gpt-4o",  # This is the deployment name
    messages=[{"role": "user", "content": "Hello, confirm connection."}],
    max_tokens=10
)
print(f"Connected successfully: {response.choices[0].message.content}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using Azure.Identity;
using OpenAI.Chat;

// Option 1: API Key authentication
string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

// Option 2: Microsoft Entra ID authentication (recommended)
AzureOpenAIClient azureClientEntra = new(
    new Uri(endpoint),
    new DefaultAzureCredential());

// Get a ChatClient for a specific deployment
ChatClient chatClient = azureClient.GetChatClient("gpt-4o");

// Verify connectivity
ChatCompletion completion = await chatClient.CompleteChatAsync(
    new ChatMessage[] { new UserChatMessage("Hello, confirm connection.") },
    new ChatCompletionOptions { MaxOutputTokenCount = 10 });

Console.WriteLine($"Connected successfully: {completion.Content[0].Text}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create resource group
az group create --name rg-ai102-challenge16 --location eastus2

# Create Azure OpenAI resource (S0 SKU)
az cognitiveservices account create \
  --name aoai-challenge16 \
  --resource-group rg-ai102-challenge16 \
  --location eastus2 \
  --kind OpenAI \
  --sku S0 \
  --custom-domain aoai-challenge16

# Get the endpoint and keys
az cognitiveservices account show \
  --name aoai-challenge16 \
  --resource-group rg-ai102-challenge16 \
  --query properties.endpoint -o tsv

az cognitiveservices account keys list \
  --name aoai-challenge16 \
  --resource-group rg-ai102-challenge16

# Verify with a direct REST call
curl -X POST "https://aoai-challenge16.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{"role": "user", "content": "Hello, confirm connection."}],
    "max_tokens": 10
  }'
```

</TabItem>
</Tabs>

### Tarefa 2: Implantar GPT-4o com Capacidade Específica

Implante um modelo GPT-4o com tipo de implantação Standard e configure a capacidade de TPM.

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Model deployment is managed via Azure CLI or REST management API
# After deployment, test with the Python SDK
import os
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

# Test the deployed model
response = client.chat.completions.create(
    model="gpt-4o",  # deployment name
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain Azure OpenAI deployment types in one sentence."}
    ],
    max_tokens=100
)

print(f"Response: {response.choices[0].message.content}")
print(f"Tokens used - Prompt: {response.usage.prompt_tokens}, "
      f"Completion: {response.usage.completion_tokens}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

ChatClient chatClient = azureClient.GetChatClient("gpt-4o");

ChatCompletion completion = await chatClient.CompleteChatAsync(
    new ChatMessage[]
    {
        new SystemChatMessage("You are a helpful assistant."),
        new UserChatMessage("Explain Azure OpenAI deployment types in one sentence.")
    },
    new ChatCompletionOptions { MaxOutputTokenCount = 100 });

Console.WriteLine($"Response: {completion.Content[0].Text}");
Console.WriteLine($"Tokens used - Prompt: {completion.Usage.InputTokenCount}, "
    + $"Completion: {completion.Usage.OutputTokenCount}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Deploy GPT-4o with Standard deployment type and 30K TPM capacity
az cognitiveservices account deployment create \
  --name aoai-challenge16 \
  --resource-group rg-ai102-challenge16 \
  --deployment-name gpt-4o \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-name "Standard" \
  --sku-capacity 30

# Deploy GPT-4o-mini for cost-efficient workloads
az cognitiveservices account deployment create \
  --name aoai-challenge16 \
  --resource-group rg-ai102-challenge16 \
  --deployment-name gpt-4o-mini \
  --model-name gpt-4o-mini \
  --model-version "2024-07-18" \
  --model-format OpenAI \
  --sku-name "GlobalStandard" \
  --sku-capacity 50

# List deployments to verify
az cognitiveservices account deployment list \
  --name aoai-challenge16 \
  --resource-group rg-ai102-challenge16 \
  -o table
```

</TabItem>
</Tabs>

### Tarefa 3: Testar Limites de Taxa e Implementar Exponential Backoff

Envie requisições para observar o comportamento de rate limiting e implemente a lógica de retry adequada.

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import time
from openai import AzureOpenAI, RateLimitError

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

def call_with_exponential_backoff(messages, max_retries=5, base_delay=1.0):
    """Implement exponential backoff for rate-limited requests."""
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=50
            )
            return response
        except RateLimitError as e:
            if attempt == max_retries - 1:
                raise
            # Use Retry-After header if available, otherwise exponential backoff
            retry_after = getattr(e, "retry_after", None)
            delay = retry_after if retry_after else base_delay * (2 ** attempt)
            print(f"Rate limited. Retrying in {delay:.1f}s (attempt {attempt + 1})")
            time.sleep(delay)

# Simulate high-volume requests to trigger rate limiting
results = []
for i in range(20):
    try:
        response = call_with_exponential_backoff(
            [{"role": "user", "content": f"Say the number {i}"}]
        )
        results.append(response.choices[0].message.content)
        print(f"Request {i}: Success")
    except RateLimitError:
        print(f"Request {i}: Exhausted retries")

print(f"\nCompleted {len(results)}/20 requests")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;
using System.ClientModel;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

ChatClient chatClient = azureClient.GetChatClient("gpt-4o");

async Task<ChatCompletion?> CallWithExponentialBackoff(
    ChatMessage[] messages, int maxRetries = 5, double baseDelay = 1.0)
{
    for (int attempt = 0; attempt < maxRetries; attempt++)
    {
        try
        {
            return await chatClient.CompleteChatAsync(
                messages,
                new ChatCompletionOptions { MaxOutputTokenCount = 50 });
        }
        catch (ClientResultException ex) when (ex.Status == 429)
        {
            if (attempt == maxRetries - 1) throw;
            double delay = baseDelay * Math.Pow(2, attempt);
            Console.WriteLine(
                $"Rate limited. Retrying in {delay:F1}s (attempt {attempt + 1})");
            await Task.Delay(TimeSpan.FromSeconds(delay));
        }
    }
    return null;
}

// Simulate high-volume requests
int successCount = 0;
for (int i = 0; i < 20; i++)
{
    try
    {
        var result = await CallWithExponentialBackoff(
            new ChatMessage[] { new UserChatMessage($"Say the number {i}") });
        if (result != null)
        {
            successCount++;
            Console.WriteLine($"Request {i}: Success");
        }
    }
    catch (ClientResultException)
    {
        Console.WriteLine($"Request {i}: Exhausted retries");
    }
}

Console.WriteLine($"\nCompleted {successCount}/20 requests");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Send rapid requests to observe rate limiting (429 responses)
for i in $(seq 1 20); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "https://aoai-challenge16.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
    -H "Content-Type: application/json" \
    -H "api-key: ${AZURE_OPENAI_KEY}" \
    -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Say ${i}\"}], \"max_tokens\": 10}")
  echo "Request $i: HTTP $HTTP_CODE"
done

# Check rate limit headers in response
curl -i -X POST "https://aoai-challenge16.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }' 2>/dev/null | grep -i "x-ratelimit\|retry-after"

# Headers to observe:
# x-ratelimit-remaining-tokens
# x-ratelimit-remaining-requests
# Retry-After (when 429)
```

</TabItem>
</Tabs>

### Tarefa 4: Comparar Implantações Standard vs Global Standard

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
import time
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

def measure_latency(deployment_name, num_requests=5):
    """Measure average latency for a deployment."""
    latencies = []
    for _ in range(num_requests):
        start = time.time()
        response = client.chat.completions.create(
            model=deployment_name,
            messages=[{"role": "user", "content": "Respond with OK."}],
            max_tokens=5
        )
        latencies.append(time.time() - start)
    return {
        "deployment": deployment_name,
        "avg_latency_ms": sum(latencies) / len(latencies) * 1000,
        "min_latency_ms": min(latencies) * 1000,
        "max_latency_ms": max(latencies) * 1000
    }

# Compare Standard vs Global Standard deployments
standard_results = measure_latency("gpt-4o")          # Standard deployment
global_results = measure_latency("gpt-4o-mini")       # Global Standard deployment

print("Standard Deployment:")
print(f"  Avg: {standard_results['avg_latency_ms']:.0f}ms | "
      f"Min: {standard_results['min_latency_ms']:.0f}ms | "
      f"Max: {standard_results['max_latency_ms']:.0f}ms")

print("\nGlobal Standard Deployment:")
print(f"  Avg: {global_results['avg_latency_ms']:.0f}ms | "
      f"Min: {global_results['min_latency_ms']:.0f}ms | "
      f"Max: {global_results['max_latency_ms']:.0f}ms")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;
using System.Diagnostics;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey));

async Task<(double avg, double min, double max)> MeasureLatency(
    string deploymentName, int numRequests = 5)
{
    ChatClient chatClient = azureClient.GetChatClient(deploymentName);
    var latencies = new List<double>();

    for (int i = 0; i < numRequests; i++)
    {
        var sw = Stopwatch.StartNew();
        await chatClient.CompleteChatAsync(
            new ChatMessage[] { new UserChatMessage("Respond with OK.") },
            new ChatCompletionOptions { MaxOutputTokenCount = 5 });
        sw.Stop();
        latencies.Add(sw.Elapsed.TotalMilliseconds);
    }

    return (latencies.Average(), latencies.Min(), latencies.Max());
}

var standard = await MeasureLatency("gpt-4o");
var global = await MeasureLatency("gpt-4o-mini");

Console.WriteLine($"Standard: Avg={standard.avg:F0}ms Min={standard.min:F0}ms Max={standard.max:F0}ms");
Console.WriteLine($"Global Standard: Avg={global.avg:F0}ms Min={global.min:F0}ms Max={global.max:F0}ms");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Compare latencies between deployment types
echo "=== Standard Deployment (gpt-4o) ==="
for i in $(seq 1 5); do
  START=$(date +%s%N)
  curl -s -o /dev/null \
    -X POST "https://aoai-challenge16.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21" \
    -H "Content-Type: application/json" \
    -H "api-key: ${AZURE_OPENAI_KEY}" \
    -d '{"messages": [{"role": "user", "content": "OK"}], "max_tokens": 5}'
  END=$(date +%s%N)
  echo "Request $i: $(( (END - START) / 1000000 ))ms"
done

echo ""
echo "=== Global Standard Deployment (gpt-4o-mini) ==="
for i in $(seq 1 5); do
  START=$(date +%s%N)
  curl -s -o /dev/null \
    -X POST "https://aoai-challenge16.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-21" \
    -H "Content-Type: application/json" \
    -H "api-key: ${AZURE_OPENAI_KEY}" \
    -d '{"messages": [{"role": "user", "content": "OK"}], "max_tokens": 5}'
  END=$(date +%s%N)
  echo "Request $i: $(( (END - START) / 1000000 ))ms"
done
```

</TabItem>
</Tabs>

## Saída Esperada

```text
Connected successfully: Hello! Connection confirmed.
Response: Standard uses shared compute with pay-per-token, Global Standard optimizes
routing across regions, and Provisioned (PTU) guarantees dedicated throughput capacity.
Tokens used - Prompt: 22, Completion: 31

Rate limited. Retrying in 1.0s (attempt 1)
Request 0: Success
...
Completed 18/20 requests

Standard Deployment:
  Avg: 450ms | Min: 320ms | Max: 680ms
Global Standard Deployment:
  Avg: 380ms | Min: 280ms | Max: 520ms
```

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Criação do recurso falha | Erro `InvalidApiProperties` | Região não suporta Azure OpenAI | Use uma região suportada (eastus, eastus2, westus, etc.) |
| Implantação falha | `ModelNotAvailable` | Modelo não disponível na região selecionada | Verifique a matriz de disponibilidade de modelos ou mude a região |
| API retorna 401 | `Access denied due to invalid subscription key` | Chave incorreta ou endpoint incompatível | Verifique se a chave corresponde ao recurso; confira a URL do endpoint |
| API retorna 429 | `Rate limit is exceeded` | Limite de TPM ou RPM excedido | Implemente exponential backoff; aumente a capacidade |
| API retorna 404 | `Resource not found` | Nome da implantação errado na requisição | Verifique se o nome da implantação está exatamente correto |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ch16-q1",
    question: "Qual SKU é necessário ao criar um recurso Azure OpenAI via Azure CLI?",
    options: [
      "F0 (Camada gratuita)",
      "S0 (Camada padrão)",
      "P1 (Camada premium)",
      "B1 (Camada básica)"
    ],
    correctAnswer: 1,
    explanation: "O Azure OpenAI Service usa o SKU S0. Não existe camada gratuita para o Azure OpenAI. O parâmetro --sku deve ser definido como S0 ao usar az cognitiveservices account create --kind OpenAI."
  },
  {
    id: "ch16-q2",
    question: "Qual tipo de implantação oferece capacidade de throughput garantida com custo mensal fixo?",
    options: [
      "Standard",
      "Global Standard",
      "Provisioned Throughput Units (PTU)",
      "Data Zone Standard"
    ],
    correctAnswer: 2,
    explanation: "Provisioned Throughput Units (PTU) fornecem capacidade de computação dedicada com throughput garantido e custos mensais previsíveis, ideal para workloads de produção com padrões de tráfego consistentes."
  },
  {
    id: "ch16-q3",
    question: "Quando o Azure OpenAI retorna HTTP 429, qual header indica quanto tempo esperar antes de tentar novamente?",
    options: [
      "x-ratelimit-remaining-tokens",
      "Retry-After",
      "x-ms-throttle-duration",
      "Rate-Limit-Reset"
    ],
    correctAnswer: 1,
    explanation: "O header Retry-After especifica o número de segundos para esperar antes de fazer outra requisição. O header x-ratelimit-remaining-tokens mostra a cota restante, mas não indica o tempo de retry."
  },
  {
    id: "ch16-q4",
    question: "Qual é a unidade de capacidade para implantações Standard ao configurar limites de taxa?",
    options: [
      "Requests Per Second (RPS)",
      "Tokens Per Minute (TPM) em milhares",
      "Conexões simultâneas",
      "Unidades de computação GPU"
    ],
    correctAnswer: 1,
    explanation: "Implantações Standard são configuradas com capacidade medida em milhares de Tokens Per Minute (TPM). Por exemplo, --sku-capacity 30 significa 30.000 TPM. Os limites de RPM são derivados do TPM."
  },
  {
    id: "ch16-q5",
    question: "Qual formato de versão da API o Azure OpenAI usa, e o que acontece quando uma versão é aposentada?",
    options: [
      "Versionamento semântico (v1.2.3); versões aposentadas retornam 410 Gone",
      "Baseado em data (YYYY-MM-DD); versões aposentadas retornam 404 Not Found",
      "Baseado em data (YYYY-MM-DD); versões aposentadas são atualizadas automaticamente para a última versão estável",
      "Versionamento inteiro (v1, v2); versões aposentadas continuam funcionando indefinidamente"
    ],
    correctAnswer: 2,
    explanation: "O Azure OpenAI usa versões de API baseadas em data (ex.: 2024-10-21). Quando uma versão é aposentada (com aviso de 90 dias), as requisições usando essa versão são automaticamente roteadas para a última versão estável GA."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-challenge16 --yes --no-wait
```

## Saiba Mais
- [Azure OpenAI Service documentation](https://learn.microsoft.com/azure/ai-services/openai/)
- [Model deployment types](https://learn.microsoft.com/azure/ai-services/openai/how-to/deployment-types)
- [Rate limits and quotas](https://learn.microsoft.com/azure/ai-services/openai/quotas-limits)
- [API version lifecycle](https://learn.microsoft.com/azure/ai-services/openai/api-version-deprecation)
- [Azure OpenAI Python SDK](https://github.com/openai/openai-python)
