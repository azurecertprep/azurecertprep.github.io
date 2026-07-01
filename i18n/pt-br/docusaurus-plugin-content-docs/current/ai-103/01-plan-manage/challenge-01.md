---
sidebar_position: 2
title: "Desafio 01: Selecionar o Serviço Azure AI Correto"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 01: Selecionar o Serviço Azure AI Correto

:::info Tempo Estimado
**45 min** | **Custo**: ~$0,50 | **Domínio**: Planejar e Gerenciar Soluções de IA (15-20%)
:::

## Habilidades do exame cobertas
- Selecionar o serviço Azure AI apropriado para uma solução de IA generativa
- Selecionar o serviço Azure AI apropriado para uma solução de visão computacional
- Selecionar o serviço Azure AI apropriado para uma solução de processamento de linguagem natural
- Selecionar o serviço Azure AI apropriado para uma solução de fala
- Selecionar o serviço Azure AI apropriado para uma solução de inteligência de documentos
- Selecionar o serviço Azure AI apropriado para uma solução de mineração de conhecimento

## Visão Geral

Os serviços Azure AI fornecem um amplo portfólio de capacidades cognitivas por meio de APIs pré-construídas e modelos personalizáveis. Escolher o serviço correto é crítico—usar o Azure OpenAI para extração simples de texto quando o Document Intelligence existe, ou usar Computer Vision para tarefas mais adequadas ao GPT-4o multimodal, leva a custos e complexidade desnecessários.

Este desafio orienta você pela taxonomia dos serviços Azure AI, ajuda a construir uma árvore de decisão mental e verifica sua capacidade de descobrir e validar programaticamente os serviços disponíveis em uma assinatura. Você comparará recursos multi-serviço (que fornecem um único endpoint para múltiplas capacidades) com recursos de serviço único (que oferecem recursos específicos do serviço e isolamento).

Compreender os trade-offs entre tipos de serviço—camadas de preço, disponibilidade regional, conjuntos de recursos e diferenças de SLA—é essencial para o exame AI-103 e para decisões de arquitetura no mundo real.

## Arquitetura

Você criará tanto um recurso Azure AI multi-serviço quanto recursos individuais de serviço único, e então enumerará programaticamente suas capacidades e comparará seus endpoints.

![Topologia do Desafio 01](/img/ai-103/challenge-01-topology.svg)

## Pré-requisitos
- Assinatura Azure com acesso aos serviços Azure AI
- Azure CLI 2.50+ instalado
- Python 3.9+ com `pip` ou .NET 8 SDK
- Pacotes Python `azure-identity` e `azure-mgmt-cognitiveservices` (ou NuGet equivalente)

## Implementação

### Tarefa 1: Criar um Recurso Azure AI Multi-Serviço

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient
from azure.mgmt.cognitiveservices.models import Account, Sku, AccountProperties

credential = DefaultAzureCredential()
subscription_id = "YOUR_SUBSCRIPTION_ID"
client = CognitiveServicesManagementClient(credential, subscription_id)

# Create a multi-service resource
account = client.accounts.begin_create(
    resource_group_name="rg-ai102-challenge01",
    account_name="ai-multiservice-01",
    account=Account(
        sku=Sku(name="S0"),
        kind="AIServices",
        location="eastus",
        properties=AccountProperties()
    )
).result()

print(f"Created: {account.name}")
print(f"Endpoint: {account.properties.endpoint}")
print(f"Kind: {account.kind}")
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

var subscription = await client.GetDefaultSubscriptionAsync();
var resourceGroup = await subscription
    .GetResourceGroupAsync("rg-ai102-challenge01");

var collection = resourceGroup.Value.GetCognitiveServicesAccounts();

var data = new CognitiveServicesAccountData(Azure.Core.AzureLocation.EastUS)
{
    Kind = "CognitiveServices",
    Sku = new CognitiveServicesSku("S0"),
    Properties = new CognitiveServicesAccountProperties()
};

var result = await collection.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "ai-multiservice-01", data);

Console.WriteLine($"Created: {result.Value.Data.Name}");
Console.WriteLine($"Endpoint: {result.Value.Data.Properties.Endpoint}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create multi-service resource
az cognitiveservices account create \
  --name ai-multiservice-01 \
  --resource-group rg-ai102-challenge01 \
  --kind AIServices \
  --sku S0 \
  --location eastus \
  --yes

# Get endpoint and keys
az cognitiveservices account show \
  --name ai-multiservice-01 \
  --resource-group rg-ai102-challenge01 \
  --query "properties.endpoint" -o tsv

az cognitiveservices account keys list \
  --name ai-multiservice-01 \
  --resource-group rg-ai102-challenge01
```

</TabItem>
</Tabs>

### Tarefa 2: Listar os Tipos de Serviços AI Disponíveis

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# List all available cognitive service kinds in the subscription
kinds = client.resource_skus.list()
service_kinds = set()
for sku in kinds:
    service_kinds.add(sku.kind)

print("Available Azure AI service kinds:")
for kind in sorted(service_kinds):
    print(f"  - {kind}")

# Key kinds for AI-103:
# CognitiveServices (multi-service), OpenAI, ComputerVision,
# TextAnalytics, SpeechServices, FormRecognizer, ContentSafety
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.CognitiveServices;

var credential = new DefaultAzureCredential();
var client = new ArmClient(credential);
var subscription = await client.GetDefaultSubscriptionAsync();

// List available SKUs to see service kinds
var skus = subscription.GetCognitiveServicesResourceSkusAsync();
var serviceKinds = new HashSet<string>();

await foreach (var sku in skus)
{
    serviceKinds.Add(sku.Kind);
}

Console.WriteLine("Available Azure AI service kinds:");
foreach (var kind in serviceKinds.OrderBy(k => k))
{
    Console.WriteLine($"  - {kind}");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# List all cognitive services accounts in a resource group
az cognitiveservices account list \
  --resource-group rg-ai102-challenge01 \
  -o table

# List available kinds in a region
az cognitiveservices account list-skus \
  --kind AIServices \
  --location eastus \
  -o table

# Check specific service availability
az cognitiveservices account list-skus \
  --kind OpenAI \
  --location eastus \
  -o table
```

</TabItem>
</Tabs>

### Tarefa 3: Criar Recursos de Serviço Único e Comparar

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Create individual service resources for comparison
services = [
    {"name": "ai-vision-01", "kind": "ComputerVision", "sku": "S1"},
    {"name": "ai-language-01", "kind": "TextAnalytics", "sku": "S"},
    {"name": "ai-speech-01", "kind": "SpeechServices", "sku": "S0"},
]

for svc in services:
    result = client.accounts.begin_create(
        resource_group_name="rg-ai102-challenge01",
        account_name=svc["name"],
        account=Account(
            sku=Sku(name=svc["sku"]),
            kind=svc["kind"],
            location="eastus",
            properties=AccountProperties()
        )
    ).result()
    print(f"Created {svc['kind']}: {result.properties.endpoint}")

# Compare: multi-service has ONE endpoint for all
# Single-service has dedicated endpoints with service-specific features
multi = client.accounts.get("rg-ai102-challenge01", "ai-multiservice-01")
print(f"\nMulti-service endpoint: {multi.properties.endpoint}")
print("Supports: Vision, Language, Speech, Decision (single key)")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
var servicesToCreate = new[]
{
    new { Name = "ai-vision-01", Kind = "ComputerVision", Sku = "S1" },
    new { Name = "ai-language-01", Kind = "TextAnalytics", Sku = "S" },
    new { Name = "ai-speech-01", Kind = "SpeechServices", Sku = "S0" }
};

foreach (var svc in servicesToCreate)
{
    var svcData = new CognitiveServicesAccountData(Azure.Core.AzureLocation.EastUS)
    {
        Kind = svc.Kind,
        Sku = new CognitiveServicesSku(svc.Sku),
        Properties = new CognitiveServicesAccountProperties()
    };

    var result = await collection.CreateOrUpdateAsync(
        Azure.WaitUntil.Completed, svc.Name, svcData);
    Console.WriteLine($"Created {svc.Kind}: {result.Value.Data.Properties.Endpoint}");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create individual services
az cognitiveservices account create \
  --name ai-vision-01 \
  --resource-group rg-ai102-challenge01 \
  --kind ComputerVision --sku S1 --location eastus --yes

az cognitiveservices account create \
  --name ai-language-01 \
  --resource-group rg-ai102-challenge01 \
  --kind TextAnalytics --sku S --location eastus --yes

az cognitiveservices account create \
  --name ai-speech-01 \
  --resource-group rg-ai102-challenge01 \
  --kind SpeechServices --sku S0 --location eastus --yes

# Compare endpoints
echo "Multi-service endpoint:"
az cognitiveservices account show --name ai-multiservice-01 \
  --resource-group rg-ai102-challenge01 --query "properties.endpoint" -o tsv

echo "Vision endpoint:"
az cognitiveservices account show --name ai-vision-01 \
  --resource-group rg-ai102-challenge01 --query "properties.endpoint" -o tsv
```

</TabItem>
</Tabs>

## Saída Esperada

```text
Created: ai-multiservice-01
Endpoint: https://eastus.api.cognitive.microsoft.com/
Kind: CognitiveServices

Available Azure AI service kinds:
  - CognitiveServices
  - ComputerVision
  - ContentSafety
  - FormRecognizer
  - OpenAI
  - SpeechServices
  - TextAnalytics
  ...

Created ComputerVision: https://eastus.api.cognitive.microsoft.com/
Created TextAnalytics: https://eastus.api.cognitive.microsoft.com/
Created SpeechServices: https://eastus.cognitiveservices.azure.com/

Multi-service endpoint: https://eastus.api.cognitive.microsoft.com/
Supports: Vision, Language, Speech, Decision (single key)
```

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Tipo incorreto especificado | Erro `InvalidParameterValue` | Usando nome de tipo obsoleto (ex.: "Face" vs "CognitiveServices") | Verifique `az cognitiveservices account list-skus` para tipos válidos |
| Região não disponível | Erro `LocationNotAvailable` | Serviço não disponível na região escolhida | Use `az account list-locations` e verifique a matriz de disponibilidade do serviço |
| SKU incompatível | `SkuNotAvailable` | SKU solicitado não oferecido para aquele tipo | Combine o SKU com o tipo de serviço (ex.: TextAnalytics usa "S" e não "S0") |
| Cota excedida | `QuotaExceeded` | Muitos recursos do mesmo tipo na assinatura | Exclua recursos não utilizados ou solicite aumento de cota |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Você precisa usar um único endpoint e chave para acessar as capacidades de Computer Vision, Language e Speech. Qual tipo de recurso você deve criar?",
    options: [
      "ComputerVision com SKU S1",
      "CognitiveServices (recurso multi-serviço)",
      "OpenAI com implantação Standard",
      "AIServices com SKU combinado"
    ],
    correctAnswer: 1,
    explanation: "Um recurso multi-serviço (kind: AIServices) fornece um único endpoint e chave para múltiplos serviços Azure AI, incluindo Vision, Language e Speech."
  },
  {
    question: "Qual serviço Azure AI você deve usar para extrair dados estruturados de faturas e recibos?",
    options: [
      "Azure AI Language com reconhecimento de entidades personalizadas",
      "Azure AI Vision com OCR",
      "Azure AI Document Intelligence (Form Recognizer)",
      "Azure OpenAI com GPT-4o"
    ],
    correctAnswer: 2,
    explanation: "O Azure AI Document Intelligence (anteriormente Form Recognizer) é projetado especificamente para extrair dados estruturados de documentos como faturas, recibos e formulários com modelos pré-construídos e personalizados."
  },
  {
    question: "Qual é uma limitação importante dos recursos multi-serviço do Azure AI em comparação com recursos de serviço único?",
    options: [
      "Recursos multi-serviço custam mais por chamada de API",
      "Recursos multi-serviço não podem usar identidade gerenciada",
      "Alguns recursos específicos do serviço requerem recursos de serviço único",
      "Recursos multi-serviço são limitados a uma região"
    ],
    correctAnswer: 2,
    explanation: "Alguns recursos avançados específicos do serviço (como voz neural personalizada ou certas implantações em contêiner) requerem recursos dedicados de serviço único em vez do recurso multi-serviço."
  },
  {
    question: "Você precisa implementar tradução de fala em tempo real para uma aplicação de conferência. Qual serviço você deve selecionar?",
    options: [
      "Azure AI Translator com tradução de documentos",
      "Azure AI Speech com API de tradução de fala",
      "Azure OpenAI com modelo Whisper",
      "Azure AI Language com tradução de texto"
    ],
    correctAnswer: 1,
    explanation: "O serviço Azure AI Speech inclui uma API de tradução de fala que fornece tradução em tempo real de fala para fala e de fala para texto, ideal para cenários de conferência."
  },
  {
    question: "Qual cenário requer o Azure OpenAI Service em vez do Azure AI Language?",
    options: [
      "Extrair frases-chave de avaliações de clientes",
      "Detectar o idioma de texto recebido",
      "Gerar textos de marketing criativos a partir de descrições de produtos",
      "Classificar tickets de suporte em categorias predefinidas"
    ],
    correctAnswer: 2,
    explanation: "Gerar conteúdo criativo requer capacidades de IA generativa fornecidas pelo Azure OpenAI Service. O Azure AI Language lida com tarefas de extração, detecção e classificação, mas não com geração de texto aberta."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-challenge01 --yes --no-wait
```

## Saiba Mais
- [Documentação dos serviços Azure AI](https://learn.microsoft.com/azure/ai-services/)
- [Recursos multi-serviço vs serviço único](https://learn.microsoft.com/azure/ai-services/multi-service-resource)
- [Preços dos serviços Azure AI](https://azure.microsoft.com/pricing/details/cognitive-services/)
- [Disponibilidade regional](https://azure.microsoft.com/global-infrastructure/services/?products=cognitive-services)
