---
sidebar_position: 4
title: "Desafio 03: Implantar Modelos de IA"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 03: Implantar Modelos de IA

:::info Tempo Estimado
**60 min** | **Custo**: ~$1.00 | **DomÃ­nio**: Planejar e Gerenciar SoluÃ§Ãµes de IA (20-25%)
:::

## Habilidades do exame cobertas
- Implantar modelos de IA usando opÃ§Ãµes de implantaÃ§Ã£o apropriadas
- Planejar capacidade para implantaÃ§Ãµes de modelos (tokens por minuto, requisiÃ§Ãµes por minuto)
- Gerenciar versÃµes de modelos e ciclo de vida
- Escolher entre implantaÃ§Ãµes Standard, Global Standard e Provisioned Throughput

## VisÃ£o Geral

O Azure OpenAI Service requer implantaÃ§Ã£o explÃ­cita do modelo antes de vocÃª poder fazer chamadas de inferÃªncia. Diferente dos serviÃ§os tradicionais do Azure AI (onde vocÃª cria um recurso e imediatamente obtÃ©m um endpoint), o Azure OpenAI separa a criaÃ§Ã£o do recurso da implantaÃ§Ã£o do modelo â€” dando a vocÃª controle sobre quais modelos estÃ£o disponÃ­veis, sua capacidade e seu ciclo de vida de versÃµes.

Este desafio cobre os trÃªs tipos de implantaÃ§Ã£o que aparecem no exame AI-102: **Standard** (pago por token, regional), **Global Standard** (pago por token, roteamento global) e **Provisioned Throughput** (capacidade reservada, latÃªncia previsÃ­vel). VocÃª implantarÃ¡ modelos programaticamente, configurarÃ¡ capacidade em Tokens Por Minuto (TPM), gerenciarÃ¡ versÃµes de modelos e entenderÃ¡ as polÃ­ticas de atualizaÃ§Ã£o que controlam transiÃ§Ãµes automÃ¡ticas de versÃ£o.

O planejamento de capacidade Ã© um tÃ³pico importante no exame â€” vocÃª precisa entender como TPM se traduz em throughput real, como monitorar utilizaÃ§Ã£o e quando escolher provisioned throughput em vez de implantaÃ§Ãµes standard.

## Arquitetura

VocÃª criarÃ¡ um recurso Azure OpenAI, implantarÃ¡ mÃºltiplos modelos com diferentes tipos de implantaÃ§Ã£o e capacidades, e entÃ£o validarÃ¡ sua disponibilidade e compararÃ¡ seus comportamentos.

![Topologia do Desafio 03](/img/ai-102/challenge-03-topology.svg)

## PrÃ©-requisitos
- Assinatura Azure com acesso ao Azure OpenAI aprovado
- Azure CLI 2.50+ com extensÃ£o `cognitiveservices`
- Python 3.9+ com `pip` ou .NET 8 SDK
- Pacotes Python `azure-identity`, `azure-mgmt-cognitiveservices`, `openai`

## ImplementaÃ§Ã£o

### Tarefa 1: Criar um Recurso Azure OpenAI e Implantar um Modelo

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient
from azure.mgmt.cognitiveservices.models import (
    Account, Sku, AccountProperties, Deployment, DeploymentProperties,
    DeploymentModel
)

credential = DefaultAzureCredential()
subscription_id = "YOUR_SUBSCRIPTION_ID"
client = CognitiveServicesManagementClient(credential, subscription_id)

# Create Azure OpenAI resource
account = client.accounts.begin_create(
    resource_group_name="rg-ai102-challenge03",
    account_name="ai102-openai-03",
    account=Account(
        sku=Sku(name="S0"),
        kind="OpenAI",
        location="eastus2",
        properties=AccountProperties(
            custom_sub_domain_name="ai102-openai-03"
        )
    )
).result()
print(f"OpenAI resource: {account.properties.endpoint}")

# Deploy GPT-4o with Standard deployment type
deployment = client.deployments.begin_create_or_update(
    resource_group_name="rg-ai102-challenge03",
    account_name="ai102-openai-03",
    deployment_name="gpt-4o-standard",
    deployment=Deployment(
        sku=Sku(name="Standard", capacity=30),  # 30K tokens per minute
        properties=DeploymentProperties(
            model=DeploymentModel(
                format="OpenAI",
                name="gpt-4o",
                version="2024-08-06"
            ),
            version_upgrade_option="OnceCurrentVersionExpired"
        )
    )
).result()
print(f"Deployed: {deployment.name}")
print(f"Model: {deployment.properties.model.name} v{deployment.properties.model.version}")
print(f"Capacity: {deployment.sku.capacity}K TPM")
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
var resourceGroup = await subscription.GetResourceGroupAsync("rg-ai102-challenge03");
var accounts = resourceGroup.Value.GetCognitiveServicesAccounts();

// Create Azure OpenAI resource
var accountData = new CognitiveServicesAccountData(Azure.Core.AzureLocation.EastUS2)
{
    Kind = "OpenAI",
    Sku = new CognitiveServicesSku("S0"),
    Properties = new CognitiveServicesAccountProperties
    {
        CustomSubDomainName = "ai102-openai-03"
    }
};

var account = await accounts.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "ai102-openai-03", accountData);

// Deploy GPT-4o
var deployments = account.Value.GetCognitiveServicesAccountDeployments();
var deploymentData = new CognitiveServicesAccountDeploymentData
{
    Properties = new CognitiveServicesAccountDeploymentProperties
    {
        Model = new CognitiveServicesAccountDeploymentModel
        {
            Format = "OpenAI",
            Name = "gpt-4o",
            Version = "2024-08-06"
        },
        VersionUpgradeOption = DeploymentModelVersionUpgradeOption.OnceCurrentVersionExpired
    },
    Sku = new CognitiveServicesSku("Standard") { Capacity = 30 }
};

var deployment = await deployments.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "gpt-4o-standard", deploymentData);

Console.WriteLine($"Deployed: {deployment.Value.Data.Name}");
Console.WriteLine($"Model: {deployment.Value.Data.Properties.Model.Name}");
Console.WriteLine($"Capacity: {deployment.Value.Data.Sku.Capacity}K TPM");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create resource group
az group create --name rg-ai102-challenge03 --location eastus2

# Create Azure OpenAI resource
az cognitiveservices account create \
  --name ai102-openai-03 \
  --resource-group rg-ai102-challenge03 \
  --kind OpenAI \
  --sku S0 \
  --location eastus2 \
  --custom-domain ai102-openai-03 \
  --yes

# Deploy GPT-4o with Standard deployment
az cognitiveservices account deployment create \
  --name ai102-openai-03 \
  --resource-group rg-ai102-challenge03 \
  --deployment-name gpt-4o-standard \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-name "Standard" \
  --sku-capacity 30

# Verify deployment
az cognitiveservices account deployment show \
  --name ai102-openai-03 \
  --resource-group rg-ai102-challenge03 \
  --deployment-name gpt-4o-standard \
  -o json
```

</TabItem>
</Tabs>

### Tarefa 2: Implantar MÃºltiplos Modelos com Diferentes ConfiguraÃ§Ãµes

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Deploy GPT-4o-mini for cost-effective workloads
mini_deployment = client.deployments.begin_create_or_update(
    resource_group_name="rg-ai102-challenge03",
    account_name="ai102-openai-03",
    deployment_name="gpt-4o-mini-standard",
    deployment=Deployment(
        sku=Sku(name="GlobalStandard", capacity=50),  # 50K TPM with global routing
        properties=DeploymentProperties(
            model=DeploymentModel(
                format="OpenAI",
                name="gpt-4o-mini",
                version="2024-07-18"
            ),
            version_upgrade_option="OnceNewDefaultVersionAvailable"
        )
    )
).result()
print(f"Deployed: {mini_deployment.name} (Global Standard)")

# List all deployments to compare
deployments = client.deployments.list(
    resource_group_name="rg-ai102-challenge03",
    account_name="ai102-openai-03"
)

print("\n--- All Deployments ---")
for d in deployments:
    print(f"  {d.name}:")
    print(f"    Model: {d.properties.model.name} v{d.properties.model.version}")
    print(f"    Type: {d.sku.name}")
    print(f"    Capacity: {d.sku.capacity}K TPM")
    print(f"    Upgrade: {d.properties.version_upgrade_option}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// Deploy GPT-4o-mini with Global Standard
var miniDeploymentData = new CognitiveServicesAccountDeploymentData
{
    Properties = new CognitiveServicesAccountDeploymentProperties
    {
        Model = new CognitiveServicesAccountDeploymentModel
        {
            Format = "OpenAI",
            Name = "gpt-4o-mini",
            Version = "2024-07-18"
        },
        VersionUpgradeOption = DeploymentModelVersionUpgradeOption.OnceNewDefaultVersionAvailable
    },
    Sku = new CognitiveServicesSku("GlobalStandard") { Capacity = 50 }
};

var miniDeployment = await deployments.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "gpt-4o-mini-standard", miniDeploymentData);
Console.WriteLine($"Deployed: {miniDeployment.Value.Data.Name} (Global Standard)");

// List all deployments
Console.WriteLine("\n--- All Deployments ---");
await foreach (var d in deployments.GetAllAsync())
{
    Console.WriteLine($"  {d.Data.Name}:");
    Console.WriteLine($"    Model: {d.Data.Properties.Model.Name} v{d.Data.Properties.Model.Version}");
    Console.WriteLine($"    Type: {d.Data.Sku.Name}");
    Console.WriteLine($"    Capacity: {d.Data.Sku.Capacity}K TPM");
    Console.WriteLine($"    Upgrade: {d.Data.Properties.VersionUpgradeOption}");
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Deploy GPT-4o-mini with Global Standard
az cognitiveservices account deployment create \
  --name ai102-openai-03 \
  --resource-group rg-ai102-challenge03 \
  --deployment-name gpt-4o-mini-standard \
  --model-name gpt-4o-mini \
  --model-version "2024-07-18" \
  --model-format OpenAI \
  --sku-name "GlobalStandard" \
  --sku-capacity 50

# List all deployments
az cognitiveservices account deployment list \
  --name ai102-openai-03 \
  --resource-group rg-ai102-challenge03 \
  -o table

# Check available models in the region
az cognitiveservices account list-models \
  --name ai102-openai-03 \
  --resource-group rg-ai102-challenge03 \
  -o table
```

</TabItem>
</Tabs>

### Tarefa 3: Testar ImplantaÃ§Ã£o e Monitorar Capacidade

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import os
from openai import AzureOpenAI

# Test the deployed model
os.environ["AZURE_OPENAI_ENDPOINT"] = "https://ai102-openai-03.openai.azure.com/"
os.environ["AZURE_OPENAI_KEY"] = "YOUR_KEY"

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-21"
)

# Call the Standard deployment
response = client.chat.completions.create(
    model="gpt-4o-standard",  # deployment name, not model name
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What deployment types does Azure OpenAI support?"}
    ],
    max_tokens=200
)

print(f"Model: {response.model}")
print(f"Tokens used: {response.usage.total_tokens}")
print(f"Response: {response.choices[0].message.content[:200]}...")

# Check remaining capacity via headers (rate limit info)
print(f"\nDeployment: gpt-4o-standard")
print(f"Configured: 30K TPM")
print(f"Tokens this call: {response.usage.total_tokens}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;

var endpoint = new Uri("https://ai102-openai-03.openai.azure.com/");
var key = new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")!);
var openAiClient = new AzureOpenAIClient(endpoint, key);

var chatClient = openAiClient.GetChatClient("gpt-4o-standard");

var response = await chatClient.CompleteChatAsync(
    new[]
    {
        new SystemChatMessage("You are a helpful assistant."),
        new UserChatMessage("What deployment types does Azure OpenAI support?")
    },
    new ChatCompletionOptions { MaxOutputTokenCount = 200 }
);

Console.WriteLine($"Model: {response.Value.Model}");
Console.WriteLine($"Tokens: {response.Value.Usage.TotalTokenCount}");
Console.WriteLine($"Response: {response.Value.Content[0].Text[..200]}...");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
ENDPOINT="https://ai102-openai-03.openai.azure.com"
KEY=$(az cognitiveservices account keys list \
  --name ai102-openai-03 \
  --resource-group rg-ai102-challenge03 \
  --query "key1" -o tsv)

# Test Standard deployment
curl -s "${ENDPOINT}/openai/deployments/gpt-4o-standard/chat/completions?api-version=2024-10-21" \
  -H "api-key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What deployment types does Azure OpenAI support?"}
    ],
    "max_tokens": 200
  }' | python -m json.tool

# Check rate limit headers with verbose curl
curl -v "${ENDPOINT}/openai/deployments/gpt-4o-standard/chat/completions?api-version=2024-10-21" \
  -H "api-key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi"}],"max_tokens":5}' \
  2>&1 | grep -i "x-ratelimit"
```

</TabItem>
</Tabs>

## SaÃ­da Esperada

```text
OpenAI resource: https://ai102-openai-03.openai.azure.com/
Deployed: gpt-4o-standard
Model: gpt-4o v2024-08-06
Capacity: 30K TPM

Deployed: gpt-4o-mini-standard (Global Standard)

--- All Deployments ---
  gpt-4o-standard:
    Model: gpt-4o v2024-08-06
    Type: Standard
    Capacity: 30K TPM
    Upgrade: OnceCurrentVersionExpired
  gpt-4o-mini-standard:
    Model: gpt-4o-mini v2024-07-18
    Type: GlobalStandard
    Capacity: 50K TPM
    Upgrade: OnceNewDefaultVersionAvailable

Model: gpt-4o-2024-08-06
Tokens used: 156
Response: Azure OpenAI supports three deployment types...
```

## Quebra & conserta

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| Modelo nÃ£o disponÃ­vel | Erro `ModelNotFound` | Modelo nÃ£o disponÃ­vel na regiÃ£o selecionada | Verifique `az cognitiveservices account list-models` para disponibilidade regional |
| Capacidade excedida | `InsufficientQuota` | Cota de TPM da assinatura totalmente alocada | Reduza a capacidade em outras implantaÃ§Ãµes ou solicite aumento de cota |
| VersÃ£o invÃ¡lida | `InvalidModelVersion` | VersÃ£o especificada foi descontinuada ou ainda nÃ£o estÃ¡ disponÃ­vel | Liste as versÃµes disponÃ­veis com a API de modelos |
| 429 Too Many Requests | Rate limiting durante inferÃªncia | Excedendo TPM/RPM configurado | Aumente a capacidade da implantaÃ§Ã£o ou implemente retry com backoff exponencial |
| Nome de implantaÃ§Ã£o errado | `DeploymentNotFound` nas chamadas do SDK | Usando nome do modelo em vez do nome da implantaÃ§Ã£o | O parÃ¢metro `model` no SDK deve ser o nome da implantaÃ§Ã£o que vocÃª escolheu, nÃ£o "gpt-4o" |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual Ã© a principal diferenÃ§a entre implantaÃ§Ãµes Standard e Global Standard no Azure OpenAI?",
    options: [
      "Standard usa GPT-4o enquanto Global Standard suporta apenas GPT-4o-mini",
      "Global Standard roteia o trÃ¡fego entre mÃºltiplas regiÃµes para maior disponibilidade",
      "ImplantaÃ§Ãµes Standard sÃ£o gratuitas enquanto Global Standard Ã© pago por token",
      "Global Standard requer unidades de throughput provisionado (PTUs)"
    ],
    correctAnswer: 1,
    explanation: "ImplantaÃ§Ãµes Global Standard roteiam o trÃ¡fego dinamicamente pela infraestrutura global do Azure, proporcionando maior disponibilidade e throughput. Ambos sÃ£o pagos por token, mas Global Standard pode aproveitar capacidade entre regiÃµes."
  },
  {
    question: "VocÃª configurou uma capacidade de implantaÃ§Ã£o de 30K TPM. O que acontece quando sua aplicaÃ§Ã£o envia requisiÃ§Ãµes que excedem esse limite?",
    options: [
      "As requisiÃ§Ãµes sÃ£o enfileiradas e processadas quando hÃ¡ capacidade disponÃ­vel",
      "A implantaÃ§Ã£o escala automaticamente para lidar com a carga",
      "RequisiÃ§Ãµes excedentes recebem respostas HTTP 429 e devem ser reenviadas",
      "As requisiÃ§Ãµes sÃ£o roteadas para outra implantaÃ§Ã£o no mesmo recurso"
    ],
    correctAnswer: 2,
    explanation: "Quando o TPM Ã© excedido, o Azure OpenAI retorna HTTP 429 (Too Many Requests) com um header Retry-After. As aplicaÃ§Ãµes devem implementar lÃ³gica de retry com backoff exponencial. ImplantaÃ§Ãµes Standard nÃ£o escalam automaticamente."
  },
  {
    question: "Qual opÃ§Ã£o de atualizaÃ§Ã£o de versÃ£o vocÃª deve escolher se deseja controlar exatamente quando a versÃ£o do seu modelo muda?",
    options: [
      "NoAutoUpgrade",
      "OnceNewDefaultVersionAvailable",
      "OnceCurrentVersionExpired",
      "ManualUpgradeOnly"
    ],
    correctAnswer: 0,
    explanation: "NoAutoUpgrade significa que a implantaÃ§Ã£o nunca serÃ¡ atualizada automaticamente para uma versÃ£o mais recente do modelo â€” vocÃª deve atualizÃ¡-la manualmente, dando controle completo sobre o momento. OnceCurrentVersionExpired ainda faz atualizaÃ§Ã£o automÃ¡tica quando a versÃ£o Ã© descontinuada. OnceNewDefaultVersionAvailable atualiza quando um novo padrÃ£o Ã© designado. ManualUpgradeOnly nÃ£o Ã© uma opÃ§Ã£o vÃ¡lida."
  },
  {
    question: "Ao fazer uma chamada de API para o Azure OpenAI, qual valor vocÃª deve passar como parÃ¢metro 'model' no SDK?",
    options: [
      "O nome base do modelo (ex: 'gpt-4o')",
      "O nome da implantaÃ§Ã£o que vocÃª especificou ao criar a implantaÃ§Ã£o",
      "A string da versÃ£o do modelo (ex: '2024-08-06')",
      "O nome do recurso combinado com o nome do modelo"
    ],
    correctAnswer: 1,
    explanation: "No Azure OpenAI, o parÃ¢metro 'model' nas chamadas do SDK se refere ao nome da sua implantaÃ§Ã£o, nÃ£o ao nome do modelo subjacente. Isso Ã© diferente da API do OpenAI onde vocÃª especifica o modelo diretamente."
  },
  {
    question: "Quando vocÃª deve escolher Provisioned Throughput (PTU) em vez de implantaÃ§Ã£o Standard?",
    options: [
      "Quando vocÃª precisa do menor custo possÃ­vel por token",
      "Quando vocÃª precisa de latÃªncia previsÃ­vel e capacidade garantida para cargas de trabalho de produÃ§Ã£o",
      "Quando vocÃª quer usar as versÃµes mais recentes dos modelos imediatamente",
      "Quando vocÃª precisa apenas de chamadas de API ocasionais e em rajadas"
    ],
    correctAnswer: 1,
    explanation: "Provisioned Throughput fornece capacidade reservada com latÃªncia previsÃ­vel, sendo ideal para cargas de trabalho de produÃ§Ã£o com padrÃµes de trÃ¡fego consistentes. Standard Ã© mais econÃ´mico para uso variÃ¡vel/baixo, enquanto PTU garante throughput independentemente da demanda regional."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-challenge03 --yes --no-wait
```

## Saiba Mais
- [Azure OpenAI deployment types](https://learn.microsoft.com/azure/ai-services/openai/how-to/deployment-types)
- [Quota and limits](https://learn.microsoft.com/azure/ai-services/openai/quotas-limits)
- [Model versions and lifecycle](https://learn.microsoft.com/azure/ai-services/openai/concepts/model-retirements)
- [Provisioned throughput](https://learn.microsoft.com/azure/ai-services/openai/concepts/provisioned-throughput)
