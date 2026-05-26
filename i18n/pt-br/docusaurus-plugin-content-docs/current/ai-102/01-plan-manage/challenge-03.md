---
sidebar_position: 4
title: "Desafio 03: Implantar Modelos de IA"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 03: Implantar Modelos de IA

:::info Tempo Estimado
**60 min** | **Custo**: ~$1.00 | **Domínio**: Planejar e Gerenciar Soluções de IA (20-25%)
:::

## Habilidades do exame cobertas
- Implantar modelos de IA usando opções de implantação apropriadas
- Planejar capacidade para implantações de modelos (tokens por minuto, requisições por minuto)
- Gerenciar versões de modelos e ciclo de vida
- Escolher entre implantações Standard, Global Standard e Provisioned Throughput

## Visão Geral

O Azure OpenAI Service requer implantação explícita do modelo antes de você poder fazer chamadas de inferência. Diferente dos serviços tradicionais do Azure AI (onde você cria um recurso e imediatamente obtém um endpoint), o Azure OpenAI separa a criação do recurso da implantação do modelo — dando a você controle sobre quais modelos estão disponíveis, sua capacidade e seu ciclo de vida de versões.

Este desafio cobre os três tipos de implantação que aparecem no exame AI-102: **Standard** (pago por token, regional), **Global Standard** (pago por token, roteamento global) e **Provisioned Throughput** (capacidade reservada, latência previsível). Você implantará modelos programaticamente, configurará capacidade em Tokens Por Minuto (TPM), gerenciará versões de modelos e entenderá as políticas de atualização que controlam transições automáticas de versão.

O planejamento de capacidade é um tópico importante no exame — você precisa entender como TPM se traduz em throughput real, como monitorar utilização e quando escolher provisioned throughput em vez de implantações standard.

## Arquitetura

Você criará um recurso Azure OpenAI, implantará múltiplos modelos com diferentes tipos de implantação e capacidades, e então validará sua disponibilidade e comparará seus comportamentos.

![Topologia do Desafio 03](/img/ai-102/challenge-03-topology.svg)

## Pré-requisitos
- Assinatura Azure com acesso ao Azure OpenAI aprovado
- Azure CLI 2.50+ com extensão `cognitiveservices`
- Python 3.9+ com `pip` ou .NET 8 SDK
- Pacotes Python `azure-identity`, `azure-mgmt-cognitiveservices`, `openai`

## Implementação

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

### Tarefa 2: Implantar Múltiplos Modelos com Diferentes Configurações

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

### Tarefa 3: Testar Implantação e Monitorar Capacidade

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

## Saída Esperada

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

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Modelo não disponível | Erro `ModelNotFound` | Modelo não disponível na região selecionada | Verifique `az cognitiveservices account list-models` para disponibilidade regional |
| Capacidade excedida | `InsufficientQuota` | Cota de TPM da assinatura totalmente alocada | Reduza a capacidade em outras implantações ou solicite aumento de cota |
| Versão inválida | `InvalidModelVersion` | Versão especificada foi descontinuada ou ainda não está disponível | Liste as versões disponíveis com a API de modelos |
| 429 Too Many Requests | Rate limiting durante inferência | Excedendo TPM/RPM configurado | Aumente a capacidade da implantação ou implemente retry com backoff exponencial |
| Nome de implantação errado | `DeploymentNotFound` nas chamadas do SDK | Usando nome do modelo em vez do nome da implantação | O parâmetro `model` no SDK deve ser o nome da implantação que você escolheu, não "gpt-4o" |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a principal diferença entre implantações Standard e Global Standard no Azure OpenAI?",
    options: [
      "Standard usa GPT-4o enquanto Global Standard suporta apenas GPT-4o-mini",
      "Global Standard roteia o tráfego entre múltiplas regiões para maior disponibilidade",
      "Implantações Standard são gratuitas enquanto Global Standard é pago por token",
      "Global Standard requer unidades de throughput provisionado (PTUs)"
    ],
    correctAnswer: 1,
    explanation: "Implantações Global Standard roteiam o tráfego dinamicamente pela infraestrutura global do Azure, proporcionando maior disponibilidade e throughput. Ambos são pagos por token, mas Global Standard pode aproveitar capacidade entre regiões."
  },
  {
    question: "Você configurou uma capacidade de implantação de 30K TPM. O que acontece quando sua aplicação envia requisições que excedem esse limite?",
    options: [
      "As requisições são enfileiradas e processadas quando há capacidade disponível",
      "A implantação escala automaticamente para lidar com a carga",
      "Requisições excedentes recebem respostas HTTP 429 e devem ser reenviadas",
      "As requisições são roteadas para outra implantação no mesmo recurso"
    ],
    correctAnswer: 2,
    explanation: "Quando o TPM é excedido, o Azure OpenAI retorna HTTP 429 (Too Many Requests) com um header Retry-After. As aplicações devem implementar lógica de retry com backoff exponencial. Implantações Standard não escalam automaticamente."
  },
  {
    question: "Qual opção de atualização de versão você deve escolher se deseja controlar exatamente quando a versão do seu modelo muda?",
    options: [
      "NoAutoUpgrade",
      "OnceNewDefaultVersionAvailable",
      "OnceCurrentVersionExpired",
      "ManualUpgradeOnly"
    ],
    correctAnswer: 0,
    explanation: "NoAutoUpgrade significa que a implantação nunca será atualizada automaticamente para uma versão mais recente do modelo — você deve atualizá-la manualmente, dando controle completo sobre o momento. OnceCurrentVersionExpired ainda faz atualização automática quando a versão é descontinuada. OnceNewDefaultVersionAvailable atualiza quando um novo padrão é designado. ManualUpgradeOnly não é uma opção válida."
  },
  {
    question: "Ao fazer uma chamada de API para o Azure OpenAI, qual valor você deve passar como parâmetro 'model' no SDK?",
    options: [
      "O nome base do modelo (ex: 'gpt-4o')",
      "O nome da implantação que você especificou ao criar a implantação",
      "A string da versão do modelo (ex: '2024-08-06')",
      "O nome do recurso combinado com o nome do modelo"
    ],
    correctAnswer: 1,
    explanation: "No Azure OpenAI, o parâmetro 'model' nas chamadas do SDK se refere ao nome da sua implantação, não ao nome do modelo subjacente. Isso é diferente da API do OpenAI onde você especifica o modelo diretamente."
  },
  {
    question: "Quando você deve escolher Provisioned Throughput (PTU) em vez de implantação Standard?",
    options: [
      "Quando você precisa do menor custo possível por token",
      "Quando você precisa de latência previsível e capacidade garantida para cargas de trabalho de produção",
      "Quando você quer usar as versões mais recentes dos modelos imediatamente",
      "Quando você precisa apenas de chamadas de API ocasionais e em rajadas"
    ],
    correctAnswer: 1,
    explanation: "Provisioned Throughput fornece capacidade reservada com latência previsível, sendo ideal para cargas de trabalho de produção com padrões de tráfego consistentes. Standard é mais econômico para uso variável/baixo, enquanto PTU garante throughput independentemente da demanda regional."
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
