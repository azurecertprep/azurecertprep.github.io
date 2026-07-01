---
sidebar_position: 3
title: "Desafio 12: Implantar Modelos de IA Generativa"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 12: Implantar Modelos de IA Generativa

:::info Tempo Estimado
**45-60 min** | **Custo**: ~$1.00 (estimado) | **Domínio**: IA Generativa e Soluções Agênticas (35-40%)
:::

## Habilidades do exame cobertas

- Implantar modelos de IA generativa apropriados para casos de uso específicos
- Configurar parâmetros de implantação de modelos incluindo cotas e limites de taxa
- Comparar tipos de implantação (Standard, Global Standard, Provisioned)

## Visão Geral

O Azure OpenAI Service fornece acesso a uma variedade de modelos de IA generativa através de um modelo de implantação gerenciado. Escolher o modelo e tipo de implantação corretos é uma habilidade crítica para o exame AI-103. O **catálogo de modelos** inclui GPT-4o (multimodal, alta capacidade), GPT-4o-mini (custo-eficiente para tarefas mais simples) e modelos open-source como Phi-4, Mistral e Llama disponíveis através de Models as a Service (MaaS).

**Tipos de implantação** determinam como seu modelo é hospedado e cobrado. Implantações **Standard** usam computação compartilhada com cobrança por token e estão sujeitas a cotas de Tokens-Per-Minute (TPM) e Requests-Per-Minute (RPM). Implantações **Global Standard** roteiam tráfego globalmente para maior disponibilidade e throughput. Implantações **Provisioned (PTU)** reservam capacidade de computação dedicada, fornecendo throughput garantido para cargas de trabalho de produção com custos previsíveis.

Compreender cotas é essencial—cada assinatura tem limites de TPM por modelo por região. Quando você implanta um modelo, aloca uma porção da sua cota disponível. O rate limiting (HTTP 429) ocorre quando requisições excedem o TPM/RPM alocado. Monitorar o uso de cotas e planejar capacidade entre implantações é uma habilidade operacional fundamental.

## Arquitetura

A arquitetura de implantação conecta sua aplicação aos endpoints do Azure OpenAI através de implantações de modelos configuradas com SKUs específicos e alocações de cota.

![Topologia do Desafio 12](/img/ai-103/challenge-12-topology.svg)

## Pré-requisitos

- Assinatura Azure com acesso ao Azure OpenAI aprovado
- Azure CLI com extensão `cognitiveservices`
- Um recurso Azure OpenAI existente (ou permissões para criar um)
- Cota suficiente na região alvo para GPT-4o e GPT-4o-mini

## Implementação

### Tarefa 1: Listar Modelos Disponíveis e Implantar GPT-4o

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient

credential = DefaultAzureCredential()
subscription_id = "YOUR_SUBSCRIPTION_ID"
resource_group = "rg-ai102-challenge12"
account_name = "aoai-ai102-challenge12"

client = CognitiveServicesManagementClient(credential, subscription_id)

# List available models for the account
models = client.accounts.list_models(
    resource_group_name=resource_group,
    account_name=account_name
)
print("Available models:")
for model in models:
    print(f"  {model.model.name} ({model.model.version}) - {model.model.format}")

# Create GPT-4o deployment (Standard)
from azure.mgmt.cognitiveservices.models import Deployment, DeploymentModel, Sku

deployment = Deployment(
    sku=Sku(name="Standard", capacity=30),  # 30K TPM
    properties={
        "model": DeploymentModel(
            format="OpenAI",
            name="gpt-4o",
            version="2024-08-06"
        )
    }
)

poller = client.deployments.begin_create_or_update(
    resource_group_name=resource_group,
    account_name=account_name,
    deployment_name="gpt-4o-standard",
    deployment=deployment
)
result = poller.result()
print(f"\nDeployed: {result.name}")
print(f"  Model: {result.properties.model.name} v{result.properties.model.version}")
print(f"  SKU: {result.sku.name} ({result.sku.capacity}K TPM)")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.CognitiveServices;
using Azure.ResourceManager.CognitiveServices.Models;

var credential = new DefaultAzureCredential();
var client = new ArmClient(credential);

string subscriptionId = "YOUR_SUBSCRIPTION_ID";
string resourceGroup = "rg-ai102-challenge12";
string accountName = "aoai-ai102-challenge12";

var accountId = CognitiveServicesAccountResource.CreateResourceIdentifier(
    subscriptionId, resourceGroup, accountName);
var account = client.GetCognitiveServicesAccountResource(accountId);

// List available models
var models = account.GetModelsAsync();
await foreach (var model in models)
{
    Console.WriteLine($"  {model.Model.Name} ({model.Model.Version})");
}

// Create GPT-4o deployment
var deployments = account.GetCognitiveServicesAccountDeployments();
var deploymentData = new CognitiveServicesAccountDeploymentData
{
    Sku = new CognitiveServicesSku("Standard") { Capacity = 30 },
    Properties = new CognitiveServicesAccountDeploymentProperties
    {
        Model = new CognitiveServicesAccountDeploymentModel
        {
            Format = "OpenAI",
            Name = "gpt-4o",
            Version = "2024-08-06"
        }
    }
};

var operation = await deployments.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "gpt-4o-standard", deploymentData);

Console.WriteLine($"Deployed: {operation.Value.Data.Name}");
Console.WriteLine($"  Capacity: {operation.Value.Data.Sku.Capacity}K TPM");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
SUBSCRIPTION_ID="YOUR_SUBSCRIPTION_ID"
RESOURCE_GROUP="rg-ai102-challenge12"
ACCOUNT_NAME="aoai-ai102-challenge12"
LOCATION="eastus2"

# Create resource group and OpenAI account
az group create --name $RESOURCE_GROUP --location $LOCATION

az cognitiveservices account create \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --kind OpenAI \
  --sku S0

# List available models
az cognitiveservices account list-models \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --output table

# Deploy GPT-4o (Standard, 30K TPM)
az cognitiveservices account deployment create \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --deployment-name "gpt-4o-standard" \
  --model-name "gpt-4o" \
  --model-version "2024-08-06" \
  --model-format "OpenAI" \
  --sku-name "Standard" \
  --sku-capacity 30
```

</TabItem>
</Tabs>

### Tarefa 2: Implantar GPT-4o-mini para Comparação de Custos

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient
from azure.mgmt.cognitiveservices.models import Deployment, DeploymentModel, Sku

credential = DefaultAzureCredential()
subscription_id = "YOUR_SUBSCRIPTION_ID"
resource_group = "rg-ai102-challenge12"
account_name = "aoai-ai102-challenge12"

client = CognitiveServicesManagementClient(credential, subscription_id)

# Deploy GPT-4o-mini (Global Standard for higher throughput)
deployment_mini = Deployment(
    sku=Sku(name="GlobalStandard", capacity=50),  # 50K TPM
    properties={
        "model": DeploymentModel(
            format="OpenAI",
            name="gpt-4o-mini",
            version="2024-07-18"
        )
    }
)

poller = client.deployments.begin_create_or_update(
    resource_group_name=resource_group,
    account_name=account_name,
    deployment_name="gpt-4o-mini-global",
    deployment=deployment_mini
)
result = poller.result()
print(f"Deployed: {result.name}")
print(f"  Model: {result.properties.model.name}")
print(f"  SKU: {result.sku.name} ({result.sku.capacity}K TPM)")

# Compare deployments
deployments = client.deployments.list(
    resource_group_name=resource_group,
    account_name=account_name
)
print("\n--- Deployment Comparison ---")
print(f"{'Name':<25} {'Model':<15} {'SKU':<18} {'TPM':<8}")
print("-" * 70)
for d in deployments:
    print(f"{d.name:<25} {d.properties.model.name:<15} {d.sku.name:<18} {d.sku.capacity}K")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.CognitiveServices;
using Azure.ResourceManager.CognitiveServices.Models;

var credential = new DefaultAzureCredential();
var client = new ArmClient(credential);

string subscriptionId = "YOUR_SUBSCRIPTION_ID";
string resourceGroup = "rg-ai102-challenge12";
string accountName = "aoai-ai102-challenge12";

var accountId = CognitiveServicesAccountResource.CreateResourceIdentifier(
    subscriptionId, resourceGroup, accountName);
var account = client.GetCognitiveServicesAccountResource(accountId);
var deployments = account.GetCognitiveServicesAccountDeployments();

// Deploy GPT-4o-mini with Global Standard SKU
var miniDeployment = new CognitiveServicesAccountDeploymentData
{
    Sku = new CognitiveServicesSku("GlobalStandard") { Capacity = 50 },
    Properties = new CognitiveServicesAccountDeploymentProperties
    {
        Model = new CognitiveServicesAccountDeploymentModel
        {
            Format = "OpenAI",
            Name = "gpt-4o-mini",
            Version = "2024-07-18"
        }
    }
};

var operation = await deployments.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "gpt-4o-mini-global", miniDeployment);
Console.WriteLine($"Deployed: {operation.Value.Data.Name}");

// List all deployments for comparison
Console.WriteLine("\n--- Deployment Comparison ---");
await foreach (var d in deployments.GetAllAsync())
{
    Console.WriteLine($"{d.Data.Name,-25} {d.Data.Properties.Model.Name,-15} " +
        $"{d.Data.Sku.Name,-18} {d.Data.Sku.Capacity}K TPM");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Deploy GPT-4o-mini with Global Standard
az cognitiveservices account deployment create \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --deployment-name "gpt-4o-mini-global" \
  --model-name "gpt-4o-mini" \
  --model-version "2024-07-18" \
  --model-format "OpenAI" \
  --sku-name "GlobalStandard" \
  --sku-capacity 50

# List all deployments
az cognitiveservices account deployment list \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --output table
```

</TabItem>
</Tabs>

### Tarefa 3: Verificar Uso de Cota

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient

credential = DefaultAzureCredential()
subscription_id = "YOUR_SUBSCRIPTION_ID"
resource_group = "rg-ai102-challenge12"
account_name = "aoai-ai102-challenge12"
location = "eastus2"

client = CognitiveServicesManagementClient(credential, subscription_id)

# Check model quota/usage for the subscription in this region
usages = client.usages.list(location=location)
print(f"Quota usage for {location}:")
print(f"{'Model':<30} {'Used':<10} {'Limit':<10} {'Unit':<10}")
print("-" * 60)
for usage in usages:
    if usage.current_value > 0 or "OpenAI" in (usage.name.value or ""):
        print(f"{usage.name.localized_value:<30} "
              f"{usage.current_value:<10} "
              f"{usage.limit:<10} "
              f"{usage.unit:<10}")

# Check deployment-level rate limits
deployments = client.deployments.list(
    resource_group_name=resource_group,
    account_name=account_name
)
print("\n--- Rate Limits per Deployment ---")
for d in deployments:
    tpm = d.sku.capacity
    # RPM is typically 6x TPM in thousands for standard
    estimated_rpm = tpm * 6
    print(f"{d.name}: {tpm}K TPM, ~{estimated_rpm} RPM")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.CognitiveServices;

var credential = new DefaultAzureCredential();
var client = new ArmClient(credential);

string subscriptionId = "YOUR_SUBSCRIPTION_ID";
string resourceGroup = "rg-ai102-challenge12";
string accountName = "aoai-ai102-challenge12";

var subscription = await client.GetDefaultSubscriptionAsync();

// Check usages for the account
var accountId = CognitiveServicesAccountResource.CreateResourceIdentifier(
    subscriptionId, resourceGroup, accountName);
var account = client.GetCognitiveServicesAccountResource(accountId);

var usages = account.GetUsagesAsync();
Console.WriteLine("Account Usage:");
await foreach (var usage in usages)
{
    Console.WriteLine($"  {usage.Name?.LocalizedValue}: " +
        $"{usage.CurrentValue}/{usage.Limit} ({usage.Unit})");
}

// List deployments with capacity info
var deployments = account.GetCognitiveServicesAccountDeployments();
Console.WriteLine("\n--- Rate Limits per Deployment ---");
await foreach (var d in deployments.GetAllAsync())
{
    var tpm = d.Data.Sku.Capacity;
    Console.WriteLine($"  {d.Data.Name}: {tpm}K TPM");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Check quota usage for a specific model in your region
az cognitiveservices usage list \
  --location $LOCATION \
  --output table

# Show deployment details including capacity
az cognitiveservices account deployment show \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --deployment-name "gpt-4o-standard" \
  --query "{name:name, model:properties.model.name, sku:sku.name, capacity:sku.capacity}"

# REST API - check quota
TOKEN=$(az account get-access-token --query accessToken -o tsv)

curl -s \
  "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.CognitiveServices/locations/${LOCATION}/usages?api-version=2024-04-01-preview" \
  -H "Authorization: Bearer $TOKEN" | jq '.value[] | select(.currentValue > 0)'
```

</TabItem>
</Tabs>

### Tarefa 4: Testar as Implantações

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI

endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
api_key = os.environ["AZURE_OPENAI_KEY"]

client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=api_key,
    api_version="2024-10-21"
)

test_prompt = "Explain the difference between GPT-4o and GPT-4o-mini in 2 sentences."

# Test GPT-4o
response_4o = client.chat.completions.create(
    model="gpt-4o-standard",
    messages=[{"role": "user", "content": test_prompt}],
    max_tokens=150
)
print(f"GPT-4o response:")
print(f"  {response_4o.choices[0].message.content}")
print(f"  Tokens: {response_4o.usage.total_tokens}")

# Test GPT-4o-mini
response_mini = client.chat.completions.create(
    model="gpt-4o-mini-global",
    messages=[{"role": "user", "content": test_prompt}],
    max_tokens=150
)
print(f"\nGPT-4o-mini response:")
print(f"  {response_mini.choices[0].message.content}")
print(f"  Tokens: {response_mini.usage.total_tokens}")

# Cost comparison (approximate pricing)
print("\n--- Cost Comparison (approximate) ---")
print(f"GPT-4o:      Input ${5.00}/1M tokens, Output ${15.00}/1M tokens")
print(f"GPT-4o-mini: Input ${0.15}/1M tokens, Output ${0.60}/1M tokens")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;

string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!;

var client = new AzureOpenAIClient(
    new Uri(endpoint), new AzureKeyCredential(apiKey));

string testPrompt = "Explain the difference between GPT-4o and GPT-4o-mini in 2 sentences.";

// Test GPT-4o
var chatClient4o = client.GetChatClient("gpt-4o-standard");
var response4o = await chatClient4o.CompleteChatAsync(
    new[] { new Azure.AI.OpenAI.Chat.UserChatMessage(testPrompt) });

Console.WriteLine("GPT-4o response:");
Console.WriteLine($"  {response4o.Value.Content[0].Text}");
Console.WriteLine($"  Tokens: {response4o.Value.Usage.TotalTokenCount}");

// Test GPT-4o-mini
var chatClientMini = client.GetChatClient("gpt-4o-mini-global");
var responseMini = await chatClientMini.CompleteChatAsync(
    new[] { new Azure.AI.OpenAI.Chat.UserChatMessage(testPrompt) });

Console.WriteLine("\nGPT-4o-mini response:");
Console.WriteLine($"  {responseMini.Value.Content[0].Text}");
Console.WriteLine($"  Tokens: {responseMini.Value.Usage.TotalTokenCount}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
AZURE_OPENAI_ENDPOINT="https://aoai-ai102-challenge12.openai.azure.com"
AZURE_OPENAI_KEY="YOUR_KEY"

# Test GPT-4o deployment
curl -s "${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o-standard/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{"role": "user", "content": "Explain GPT-4o vs GPT-4o-mini in 2 sentences."}],
    "max_tokens": 150
  }' | jq '{content: .choices[0].message.content, tokens: .usage.total_tokens}'

# Test GPT-4o-mini deployment
curl -s "${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o-mini-global/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -d '{
    "messages": [{"role": "user", "content": "Explain GPT-4o vs GPT-4o-mini in 2 sentences."}],
    "max_tokens": 150
  }' | jq '{content: .choices[0].message.content, tokens: .usage.total_tokens}'
```

</TabItem>
</Tabs>

## Saída Esperada

Após completar todas as tarefas, você deve ter:

1. **Recurso Azure OpenAI** `aoai-ai102-challenge12` com duas implantações:
   - `gpt-4o-standard` — SKU Standard, 30K TPM, versão do modelo 2024-08-06
   - `gpt-4o-mini-global` — SKU GlobalStandard, 50K TPM, versão do modelo 2024-07-18
2. **Cota consumida**: 30K TPM da cota do GPT-4o, 50K TPM da cota do GPT-4o-mini
3. **Respostas de teste bem-sucedidas** de ambas as implantações mostrando estilos de resposta diferentes

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Implantação falha | Erro `QuotaExceeded` | Cota de TPM insuficiente na região | Reduza a capacidade ou solicite aumento de cota pelo Portal do Azure |
| Modelo não encontrado | `ModelNotFound` ou lista de modelos vazia | Modelo não disponível na região selecionada | Verifique disponibilidade regional; tente `eastus2` ou `swedencentral` |
| 429 Too Many Requests | Erros de rate limit durante testes | Requisições excedem TPM/RPM alocado | Implemente exponential backoff; aumente a capacidade da implantação |
| Versão errada do modelo | `InvalidModelVersion` | Versão especificada descontinuada ou ainda não disponível | Use `az cognitiveservices account list-models` para encontrar versões válidas |
| Global Standard indisponível | SKU não suportado | Nem todos os modelos suportam Global Standard | Use SKU Standard ou verifique a documentação de compatibilidade modelo-SKU |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ch12-q1",
    question: "Qual é a diferença principal entre os tipos de implantação Standard e Provisioned?",
    options: [
      "Standard usa computação compartilhada com cobrança por token; Provisioned reserva capacidade dedicada com throughput garantido",
      "Standard suporta mais modelos que Provisioned",
      "Provisioned está disponível apenas para GPT-4o; Standard funciona com todos os modelos",
      "Standard tem limites de throughput mais altos que Provisioned"
    ],
    correctAnswer: 0,
    explanation: "Implantações Standard usam computação compartilhada cobrada por token consumido e estão sujeitas a limites de TPM/RPM. Implantações Provisioned reservam capacidade de computação dedicada (medida em PTUs) fornecendo throughput garantido para cargas de trabalho de produção."
  },
  {
    id: "ch12-q2",
    question: "Ao implantar um modelo, o que o parâmetro 'capacity' no SKU representa?",
    options: [
      "O número de usuários simultâneos permitidos",
      "O armazenamento alocado para o modelo",
      "Milhares de Tokens Per Minute (TPM) alocados para a implantação",
      "O número de GPUs reservadas"
    ],
    correctAnswer: 2,
    explanation: "O parâmetro capacity representa a alocação de Tokens Per Minute (TPM) em milhares. Por exemplo, capacity=30 significa 30.000 TPM. Isso é descontado da cota disponível da sua assinatura para aquele modelo naquela região."
  },
  {
    id: "ch12-q3",
    question: "Qual modelo seria mais custo-eficiente para uma tarefa de classificação de alto volume que não requer raciocínio avançado?",
    options: [
      "GPT-4o com implantação Provisioned",
      "GPT-4o-mini com implantação Global Standard",
      "GPT-4o com implantação Standard",
      "GPT-4o-mini com implantação Provisioned"
    ],
    correctAnswer: 1,
    explanation: "GPT-4o-mini é significativamente mais barato por token que GPT-4o e performa bem para tarefas diretas como classificação. Global Standard fornece maior throughput em regiões globais, tornando-o ideal para cargas de trabalho de alto volume que não precisam das capacidades avançadas do GPT-4o."
  },
  {
    id: "ch12-q4",
    question: "O que acontece quando o limite de taxa (TPM/RPM) de uma implantação é excedido?",
    options: [
      "A API retorna HTTP 429 (Too Many Requests) com um header Retry-After",
      "A requisição é enfileirada e processada depois",
      "A implantação escala automaticamente",
      "A requisição é roteada para outra implantação"
    ],
    correctAnswer: 0,
    explanation: "Quando limites de taxa são excedidos, o Azure OpenAI retorna HTTP 429 (Too Many Requests) com um header Retry-After indicando quanto tempo esperar antes de tentar novamente. Aplicações devem implementar exponential backoff para lidar com rate limiting de forma elegante."
  },
  {
    id: "ch12-q5",
    question: "Qual comando do Azure CLI implanta um modelo GPT-4o em um recurso Azure OpenAI?",
    options: [
      "az openai deployment create --model gpt-4o",
      "az ml model deploy --name gpt-4o",
      "az cognitiveservices account deployment create --model-name gpt-4o --model-format OpenAI",
      "az ai model deploy --type openai --model gpt-4o"
    ],
    correctAnswer: 2,
    explanation: "O comando correto é 'az cognitiveservices account deployment create' com --model-name, --model-format OpenAI, --model-version e parâmetros de SKU. O Azure OpenAI é gerenciado sob o provedor de recursos Cognitive Services."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-challenge12 --yes --no-wait
```

## Saiba Mais

- [Implantação de modelos do Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/how-to/create-resource)
- [Catálogo de modelos e disponibilidade](https://learn.microsoft.com/azure/ai-services/openai/concepts/models)
- [Tipos de implantação (Standard, Global, Provisioned)](https://learn.microsoft.com/azure/ai-services/openai/how-to/deployment-types)
- [Cotas e limites](https://learn.microsoft.com/azure/ai-services/openai/quotas-limits)
- [Preços](https://azure.microsoft.com/pricing/details/cognitive-services/openai-service/)
