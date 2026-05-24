---
sidebar_position: 2
title: "Desafio 01: Selecionar o ServiÃ§o Azure AI Correto"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 01: Selecionar o ServiÃ§o Azure AI Correto

:::info Tempo Estimado
**45 min** | **Custo**: ~$0,50 | **DomÃ­nio**: Planejar e Gerenciar SoluÃ§Ãµes de IA (20-25%)
:::

## Habilidades do exame cobertas
- Selecionar o serviÃ§o Azure AI apropriado para uma soluÃ§Ã£o de IA generativa
- Selecionar o serviÃ§o Azure AI apropriado para uma soluÃ§Ã£o de visÃ£o computacional
- Selecionar o serviÃ§o Azure AI apropriado para uma soluÃ§Ã£o de processamento de linguagem natural
- Selecionar o serviÃ§o Azure AI apropriado para uma soluÃ§Ã£o de fala
- Selecionar o serviÃ§o Azure AI apropriado para uma soluÃ§Ã£o de inteligÃªncia de documentos
- Selecionar o serviÃ§o Azure AI apropriado para uma soluÃ§Ã£o de mineraÃ§Ã£o de conhecimento

## VisÃ£o Geral

Os serviÃ§os Azure AI fornecem um amplo portfÃ³lio de capacidades cognitivas por meio de APIs prÃ©-construÃ­das e modelos personalizÃ¡veis. Escolher o serviÃ§o correto Ã© crÃ­ticoâ€”usar o Azure OpenAI para extraÃ§Ã£o simples de texto quando o Document Intelligence existe, ou usar Computer Vision para tarefas mais adequadas ao GPT-4o multimodal, leva a custos e complexidade desnecessÃ¡rios.

Este desafio orienta vocÃª pela taxonomia dos serviÃ§os Azure AI, ajuda a construir uma Ã¡rvore de decisÃ£o mental e verifica sua capacidade de descobrir e validar programaticamente os serviÃ§os disponÃ­veis em uma assinatura. VocÃª compararÃ¡ recursos multi-serviÃ§o (que fornecem um Ãºnico endpoint para mÃºltiplas capacidades) com recursos de serviÃ§o Ãºnico (que oferecem recursos especÃ­ficos do serviÃ§o e isolamento).

Compreender os trade-offs entre tipos de serviÃ§oâ€”camadas de preÃ§o, disponibilidade regional, conjuntos de recursos e diferenÃ§as de SLAâ€”Ã© essencial para o exame AI-102 e para decisÃµes de arquitetura no mundo real.

## Arquitetura

VocÃª criarÃ¡ tanto um recurso Azure AI multi-serviÃ§o quanto recursos individuais de serviÃ§o Ãºnico, e entÃ£o enumerarÃ¡ programaticamente suas capacidades e compararÃ¡ seus endpoints.

![Topologia do Desafio 01](/img/ai-102/challenge-01-topology.svg)

## PrÃ©-requisitos
- Assinatura Azure com acesso aos serviÃ§os Azure AI
- Azure CLI 2.50+ instalado
- Python 3.9+ com `pip` ou .NET 8 SDK
- Pacotes Python `azure-identity` e `azure-mgmt-cognitiveservices` (ou NuGet equivalente)

## ImplementaÃ§Ã£o

### Tarefa 1: Criar um Recurso Azure AI Multi-ServiÃ§o

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

### Tarefa 2: Listar os Tipos de ServiÃ§os AI DisponÃ­veis

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

# Key kinds for AI-102:
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

### Tarefa 3: Criar Recursos de ServiÃ§o Ãšnico e Comparar

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

## SaÃ­da Esperada

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

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| Tipo incorreto especificado | Erro `InvalidParameterValue` | Usando nome de tipo obsoleto (ex.: "Face" vs "CognitiveServices") | Verifique `az cognitiveservices account list-skus` para tipos vÃ¡lidos |
| RegiÃ£o nÃ£o disponÃ­vel | Erro `LocationNotAvailable` | ServiÃ§o nÃ£o disponÃ­vel na regiÃ£o escolhida | Use `az account list-locations` e verifique a matriz de disponibilidade do serviÃ§o |
| SKU incompatÃ­vel | `SkuNotAvailable` | SKU solicitado nÃ£o oferecido para aquele tipo | Combine o SKU com o tipo de serviÃ§o (ex.: TextAnalytics usa "S" e nÃ£o "S0") |
| Cota excedida | `QuotaExceeded` | Muitos recursos do mesmo tipo na assinatura | Exclua recursos nÃ£o utilizados ou solicite aumento de cota |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "VocÃª precisa usar um Ãºnico endpoint e chave para acessar as capacidades de Computer Vision, Language e Speech. Qual tipo de recurso vocÃª deve criar?",
    options: [
      "ComputerVision com SKU S1",
      "CognitiveServices (recurso multi-serviÃ§o)",
      "OpenAI com implantaÃ§Ã£o Standard",
      "AIServices com SKU combinado"
    ],
    correctAnswer: 1,
    explanation: "Um recurso multi-serviÃ§o (kind: AIServices) fornece um Ãºnico endpoint e chave para mÃºltiplos serviÃ§os Azure AI, incluindo Vision, Language e Speech."
  },
  {
    question: "Qual serviÃ§o Azure AI vocÃª deve usar para extrair dados estruturados de faturas e recibos?",
    options: [
      "Azure AI Language com reconhecimento de entidades personalizadas",
      "Azure AI Vision com OCR",
      "Azure AI Document Intelligence (Form Recognizer)",
      "Azure OpenAI com GPT-4o"
    ],
    correctAnswer: 2,
    explanation: "O Azure AI Document Intelligence (anteriormente Form Recognizer) Ã© projetado especificamente para extrair dados estruturados de documentos como faturas, recibos e formulÃ¡rios com modelos prÃ©-construÃ­dos e personalizados."
  },
  {
    question: "Qual Ã© uma limitaÃ§Ã£o importante dos recursos multi-serviÃ§o do Azure AI em comparaÃ§Ã£o com recursos de serviÃ§o Ãºnico?",
    options: [
      "Recursos multi-serviÃ§o custam mais por chamada de API",
      "Recursos multi-serviÃ§o nÃ£o podem usar identidade gerenciada",
      "Alguns recursos especÃ­ficos do serviÃ§o requerem recursos de serviÃ§o Ãºnico",
      "Recursos multi-serviÃ§o sÃ£o limitados a uma regiÃ£o"
    ],
    correctAnswer: 2,
    explanation: "Alguns recursos avanÃ§ados especÃ­ficos do serviÃ§o (como voz neural personalizada ou certas implantaÃ§Ãµes em contÃªiner) requerem recursos dedicados de serviÃ§o Ãºnico em vez do recurso multi-serviÃ§o."
  },
  {
    question: "VocÃª precisa implementar traduÃ§Ã£o de fala em tempo real para uma aplicaÃ§Ã£o de conferÃªncia. Qual serviÃ§o vocÃª deve selecionar?",
    options: [
      "Azure AI Translator com traduÃ§Ã£o de documentos",
      "Azure AI Speech com API de traduÃ§Ã£o de fala",
      "Azure OpenAI com modelo Whisper",
      "Azure AI Language com traduÃ§Ã£o de texto"
    ],
    correctAnswer: 1,
    explanation: "O serviÃ§o Azure AI Speech inclui uma API de traduÃ§Ã£o de fala que fornece traduÃ§Ã£o em tempo real de fala para fala e de fala para texto, ideal para cenÃ¡rios de conferÃªncia."
  },
  {
    question: "Qual cenÃ¡rio requer o Azure OpenAI Service em vez do Azure AI Language?",
    options: [
      "Extrair frases-chave de avaliaÃ§Ãµes de clientes",
      "Detectar o idioma de texto recebido",
      "Gerar textos de marketing criativos a partir de descriÃ§Ãµes de produtos",
      "Classificar tickets de suporte em categorias predefinidas"
    ],
    correctAnswer: 2,
    explanation: "Gerar conteÃºdo criativo requer capacidades de IA generativa fornecidas pelo Azure OpenAI Service. O Azure AI Language lida com tarefas de extraÃ§Ã£o, detecÃ§Ã£o e classificaÃ§Ã£o, mas nÃ£o com geraÃ§Ã£o de texto aberta."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-challenge01 --yes --no-wait
```

## Saiba Mais
- [DocumentaÃ§Ã£o dos serviÃ§os Azure AI](https://learn.microsoft.com/azure/ai-services/)
- [Recursos multi-serviÃ§o vs serviÃ§o Ãºnico](https://learn.microsoft.com/azure/ai-services/multi-service-resource)
- [PreÃ§os dos serviÃ§os Azure AI](https://azure.microsoft.com/pricing/details/cognitive-services/)
- [Disponibilidade regional](https://azure.microsoft.com/global-infrastructure/services/?products=cognitive-services)
