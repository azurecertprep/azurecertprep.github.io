---
sidebar_position: 2
title: "Desafio 11: Configuração do Azure AI Foundry"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 11: Configuração do Azure AI Foundry

:::info Tempo Estimado
**45-60 min** | **Custo**: ~$2.00 (recursos do hub) | **Domínio**: IA Generativa e Soluções Agênticas (35-40%)
:::

## Habilidades do exame cobertas

- Planejar e gerenciar um recurso do Azure AI Foundry
- Implantar recursos de hub e projeto com hierarquia de recursos adequada
- Configurar conexões com Azure OpenAI e Azure AI Search

## Visão Geral

O Azure AI Foundry (anteriormente Azure AI Studio) fornece uma plataforma unificada para construir aplicações de IA generativa. A arquitetura segue um modelo de hub e projeto onde um **hub** atua como um contêiner de nível superior que gerencia a infraestrutura compartilhada—incluindo Azure Storage, Key Vault e Container Registry—enquanto **projetos** são workspaces dentro de um hub onde equipes constroem e implantam soluções de IA.

Compreender a hierarquia de recursos é essencial para o exame AI-103. Um hub cria recursos dependentes automaticamente (Storage Account, Key Vault e opcionalmente Container Registry e Application Insights). Projetos herdam as conexões e recursos de computação do hub, mas mantêm seus próprios artefatos, implantações e dados. Essa separação permite governança corporativa enquanto dá autonomia às equipes de desenvolvimento.

Conexões são o mecanismo pelo qual hubs e projetos acessam serviços externos como endpoints do Azure OpenAI, índices do Azure AI Search e APIs personalizadas. As conexões armazenam credenciais de forma segura no Key Vault associado e podem ser compartilhadas entre todos os projetos dentro de um hub.

## Arquitetura

A hierarquia de recursos do AI Foundry segue um modelo hub → projeto com recursos dependentes compartilhados e conexões configuráveis com serviços de IA.

![Topologia do Desafio 11](/img/ai-103/challenge-11-topology.svg)

## Pré-requisitos

- Assinatura Azure com acesso de Contributor
- Azure CLI instalado (v2.60+) com extensão `ml`
- Provedores de recursos registrados: `Microsoft.MachineLearningServices`, `Microsoft.CognitiveServices`
- Um recurso Azure OpenAI existente (ou permissão para criar um)

## Implementação

### Tarefa 1: Criar um Resource Group e um Hub do AI Foundry

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.machinelearningservices import MachineLearningServicesMgmtClient
from azure.mgmt.machinelearningservices.models import Workspace

credential = DefaultAzureCredential()
subscription_id = "YOUR_SUBSCRIPTION_ID"
resource_group = "rg-ai102-challenge11"
hub_name = "hub-ai102-foundry"
location = "eastus2"

ml_client = MachineLearningServicesMgmtClient(credential, subscription_id)

# Create AI Foundry Hub
hub = Workspace(
    location=location,
    kind="Hub",
    display_name="AI-103 Foundry Hub",
    description="Hub for AI-103 certification prep",
    storage_account=f"/subscriptions/{subscription_id}/resourceGroups/{resource_group}/providers/Microsoft.Storage/storageAccounts/stai102hub",
    key_vault=f"/subscriptions/{subscription_id}/resourceGroups/{resource_group}/providers/Microsoft.KeyVault/vaults/kv-ai102-hub",
)

poller = ml_client.workspaces.begin_create_or_update(
    resource_group_name=resource_group,
    workspace_name=hub_name,
    body=hub
)
result = poller.result()
print(f"Hub created: {result.name} (State: {result.provisioning_state})")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.MachineLearning;
using Azure.ResourceManager.MachineLearning.Models;

var credential = new DefaultAzureCredential();
var client = new ArmClient(credential);

string subscriptionId = "YOUR_SUBSCRIPTION_ID";
string resourceGroup = "rg-ai102-challenge11";
string hubName = "hub-ai102-foundry";

var subscription = await client.GetDefaultSubscriptionAsync();
var rg = await subscription.GetResourceGroupAsync(resourceGroup);

var hubData = new MachineLearningWorkspaceData(Azure.Core.AzureLocation.EastUS2)
{
    Kind = "Hub",
    DisplayName = "AI-103 Foundry Hub",
    Description = "Hub for AI-103 certification prep",
    StorageAccountResourceId = new Azure.Core.ResourceIdentifier(
        $"/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/providers/Microsoft.Storage/storageAccounts/stai102hub"),
    KeyVaultResourceId = new Azure.Core.ResourceIdentifier(
        $"/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/providers/Microsoft.KeyVault/vaults/kv-ai102-hub"),
};

var workspaces = rg.Value.GetMachineLearningWorkspaces();
var operation = await workspaces.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, hubName, hubData);

Console.WriteLine($"Hub created: {operation.Value.Data.Name}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Set variables
SUBSCRIPTION_ID="YOUR_SUBSCRIPTION_ID"
RESOURCE_GROUP="rg-ai102-challenge11"
HUB_NAME="hub-ai102-foundry"
LOCATION="eastus2"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create AI Foundry Hub using az ml
az ml workspace create \
  --kind hub \
  --name $HUB_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --display-name "AI-103 Foundry Hub"

# Alternatively, use REST API directly
TOKEN=$(az account get-access-token --query accessToken -o tsv)

curl -X PUT \
  "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.MachineLearningServices/workspaces/${HUB_NAME}?api-version=2024-04-01" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "eastus2",
    "kind": "Hub",
    "properties": {
      "displayName": "AI-103 Foundry Hub",
      "description": "Hub for AI-103 certification prep"
    }
  }'
```

</TabItem>
</Tabs>

### Tarefa 2: Criar um Projeto Dentro do Hub

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.machinelearningservices import MachineLearningServicesMgmtClient
from azure.mgmt.machinelearningservices.models import Workspace

credential = DefaultAzureCredential()
subscription_id = "YOUR_SUBSCRIPTION_ID"
resource_group = "rg-ai102-challenge11"
hub_name = "hub-ai102-foundry"
project_name = "proj-ai102-genai"

ml_client = MachineLearningServicesMgmtClient(credential, subscription_id)

hub_id = f"/subscriptions/{subscription_id}/resourceGroups/{resource_group}/providers/Microsoft.MachineLearningServices/workspaces/{hub_name}"

project = Workspace(
    location="eastus2",
    kind="Project",
    display_name="GenAI Project",
    description="Project for generative AI challenges",
    hub_resource_id=hub_id,
)

poller = ml_client.workspaces.begin_create_or_update(
    resource_group_name=resource_group,
    workspace_name=project_name,
    body=project
)
result = poller.result()
print(f"Project created: {result.name}")
print(f"Hub: {result.hub_resource_id}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.MachineLearning;
using Azure.ResourceManager.MachineLearning.Models;

var credential = new DefaultAzureCredential();
var client = new ArmClient(credential);

string subscriptionId = "YOUR_SUBSCRIPTION_ID";
string resourceGroup = "rg-ai102-challenge11";
string hubName = "hub-ai102-foundry";
string projectName = "proj-ai102-genai";

var subscription = await client.GetDefaultSubscriptionAsync();
var rg = await subscription.GetResourceGroupAsync(resourceGroup);

string hubId = $"/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}" +
    $"/providers/Microsoft.MachineLearningServices/workspaces/{hubName}";

var projectData = new MachineLearningWorkspaceData(Azure.Core.AzureLocation.EastUS2)
{
    Kind = "Project",
    DisplayName = "GenAI Project",
    Description = "Project for generative AI challenges",
    HubResourceId = new Azure.Core.ResourceIdentifier(hubId),
};

var workspaces = rg.Value.GetMachineLearningWorkspaces();
var operation = await workspaces.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, projectName, projectData);

Console.WriteLine($"Project created: {operation.Value.Data.Name}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create project under the hub
az ml workspace create \
  --kind project \
  --name "proj-ai102-genai" \
  --resource-group $RESOURCE_GROUP \
  --hub-id "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.MachineLearningServices/workspaces/${HUB_NAME}" \
  --display-name "GenAI Project"

# REST API equivalent
curl -X PUT \
  "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.MachineLearningServices/workspaces/proj-ai102-genai?api-version=2024-04-01" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "eastus2",
    "kind": "Project",
    "properties": {
      "displayName": "GenAI Project",
      "hubResourceId": "/subscriptions/'${SUBSCRIPTION_ID}'/resourceGroups/'${RESOURCE_GROUP}'/providers/Microsoft.MachineLearningServices/workspaces/'${HUB_NAME}'"
    }
  }'
```

</TabItem>
</Tabs>

### Tarefa 3: Configurar Conexões

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.ai.ml import MLClient
from azure.ai.ml.entities import WorkspaceConnection
from azure.ai.ml.entities._workspace.connections import (
    AzureOpenAIConnection,
    AzureAISearchConnection,
)

credential = DefaultAzureCredential()
ml_client = MLClient(
    credential=credential,
    subscription_id="YOUR_SUBSCRIPTION_ID",
    resource_group_name="rg-ai102-challenge11",
    workspace_name="hub-ai102-foundry",
)

# Create Azure OpenAI connection
aoai_connection = WorkspaceConnection(
    name="aoai-connection",
    type="azure_open_ai",
    target="https://your-openai.openai.azure.com/",
    credentials={
        "type": "api_key",
        "api_key": "YOUR_AZURE_OPENAI_KEY"
    },
)
ml_client.connections.create_or_update(aoai_connection)
print("Azure OpenAI connection created")

# Create Azure AI Search connection
search_connection = WorkspaceConnection(
    name="search-connection",
    type="cognitive_search",
    target="https://your-search.search.windows.net",
    credentials={
        "type": "api_key",
        "api_key": "YOUR_AZURE_SEARCH_KEY"
    },
)
ml_client.connections.create_or_update(search_connection)
print("Azure AI Search connection created")

# List all connections
connections = ml_client.connections.list()
for conn in connections:
    print(f"  {conn.name} ({conn.type})")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.MachineLearning;
using Azure.ResourceManager.MachineLearning.Models;

var credential = new DefaultAzureCredential();
var client = new ArmClient(credential);

string subscriptionId = "YOUR_SUBSCRIPTION_ID";
string resourceGroup = "rg-ai102-challenge11";
string hubName = "hub-ai102-foundry";

var hubResourceId = MachineLearningWorkspaceResource.CreateResourceIdentifier(
    subscriptionId, resourceGroup, hubName);
var hub = client.GetMachineLearningWorkspaceResource(hubResourceId);
var connections = hub.GetMachineLearningWorkspaceConnections();

// Create Azure OpenAI connection
var aoaiConnectionData = new MachineLearningWorkspaceConnectionData
{
    Properties = new MachineLearningApiKeyAuthWorkspaceConnectionProperties
    {
        Category = MachineLearningConnectionCategory.AzureOpenAI,
        Target = "https://your-openai.openai.azure.com/",
        Credentials = new MachineLearningWorkspaceConnectionApiKey("YOUR_KEY"),
    }
};

await connections.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "aoai-connection", aoaiConnectionData);
Console.WriteLine("Azure OpenAI connection created");

// Create Azure AI Search connection
var searchConnectionData = new MachineLearningWorkspaceConnectionData
{
    Properties = new MachineLearningApiKeyAuthWorkspaceConnectionProperties
    {
        Category = MachineLearningConnectionCategory.CognitiveSearch,
        Target = "https://your-search.search.windows.net",
        Credentials = new MachineLearningWorkspaceConnectionApiKey("YOUR_KEY"),
    }
};

await connections.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "search-connection", searchConnectionData);
Console.WriteLine("Azure AI Search connection created");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create Azure OpenAI connection via REST
curl -X PUT \
  "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.MachineLearningServices/workspaces/${HUB_NAME}/connections/aoai-connection?api-version=2024-04-01" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "category": "AzureOpenAI",
      "target": "https://your-openai.openai.azure.com/",
      "authType": "ApiKey",
      "credentials": {
        "key": "YOUR_AZURE_OPENAI_KEY"
      }
    }
  }'

# Create Azure AI Search connection
curl -X PUT \
  "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.MachineLearningServices/workspaces/${HUB_NAME}/connections/search-connection?api-version=2024-04-01" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "category": "CognitiveSearch",
      "target": "https://your-search.search.windows.net",
      "authType": "ApiKey",
      "credentials": {
        "key": "YOUR_AZURE_SEARCH_KEY"
      }
    }
  }'

# List connections
az ml connection list \
  --resource-group $RESOURCE_GROUP \
  --workspace-name $HUB_NAME \
  --output table
```

</TabItem>
</Tabs>

### Tarefa 4: Explorar a Hierarquia de Recursos

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.ai.ml import MLClient

credential = DefaultAzureCredential()

# Connect to hub
hub_client = MLClient(
    credential=credential,
    subscription_id="YOUR_SUBSCRIPTION_ID",
    resource_group_name="rg-ai102-challenge11",
    workspace_name="hub-ai102-foundry",
)

# Get hub details
hub = hub_client.workspaces.get("hub-ai102-foundry")
print(f"Hub: {hub.name}")
print(f"  Storage: {hub.storage_account}")
print(f"  Key Vault: {hub.key_vault}")
print(f"  Container Registry: {hub.container_registry}")

# Connect to project
project_client = MLClient(
    credential=credential,
    subscription_id="YOUR_SUBSCRIPTION_ID",
    resource_group_name="rg-ai102-challenge11",
    workspace_name="proj-ai102-genai",
)

# Verify project inherits hub connections
project_connections = project_client.connections.list()
print(f"\nProject connections (inherited from hub):")
for conn in project_connections:
    print(f"  {conn.name} -> {conn.type}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.MachineLearning;

var credential = new DefaultAzureCredential();
var client = new ArmClient(credential);

string subscriptionId = "YOUR_SUBSCRIPTION_ID";
string resourceGroup = "rg-ai102-challenge11";

var subscription = await client.GetDefaultSubscriptionAsync();
var rg = await subscription.GetResourceGroupAsync(resourceGroup);

// List all workspaces (hub + projects)
var workspaces = rg.Value.GetMachineLearningWorkspaces();
await foreach (var workspace in workspaces.GetAllAsync())
{
    Console.WriteLine($"Name: {workspace.Data.Name}");
    Console.WriteLine($"  Kind: {workspace.Data.Kind}");
    Console.WriteLine($"  Storage: {workspace.Data.StorageAccountResourceId}");
    Console.WriteLine($"  Key Vault: {workspace.Data.KeyVaultResourceId}");
    Console.WriteLine($"  Hub: {workspace.Data.HubResourceId}");
    Console.WriteLine();
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# List all workspaces in the resource group (shows hub + projects)
az ml workspace list \
  --resource-group $RESOURCE_GROUP \
  --output table

# Show hub details
az ml workspace show \
  --name $HUB_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "{name:name, kind:kind, storage:storage_account, keyvault:key_vault}"

# Show project details (note the hub reference)
az ml workspace show \
  --name "proj-ai102-genai" \
  --resource-group $RESOURCE_GROUP \
  --query "{name:name, kind:kind, hub:hub_resource_id}"

# REST API - get workspace details
curl -s \
  "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.MachineLearningServices/workspaces/${HUB_NAME}?api-version=2024-04-01" \
  -H "Authorization: Bearer $TOKEN" | jq '.{name, kind, properties.storageAccount, properties.keyVault}'
```

</TabItem>
</Tabs>

## Saída Esperada

Após completar todas as tarefas, você deve ter:

1. **Resource group** `rg-ai102-challenge11` contendo:
   - AI Foundry Hub (`hub-ai102-foundry`) com kind=Hub
   - AI Foundry Project (`proj-ai102-genai`) com kind=Project
   - Storage Account (criado automaticamente pelo hub)
   - Key Vault (criado automaticamente pelo hub)
2. **Conexões** configuradas no hub:
   - `aoai-connection` → endpoint do Azure OpenAI
   - `search-connection` → endpoint do Azure AI Search
3. **Projeto** herda todas as conexões do hub automaticamente

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Criação do hub falha | Erro `ResourceProviderNotRegistered` | `Microsoft.MachineLearningServices` não registrado | `az provider register --namespace Microsoft.MachineLearningServices` |
| Projeto não vê conexões | Lista de conexões vazia no projeto | Projeto criado em hub diferente ou contexto de workspace errado | Verifique se `hub_resource_id` aponta para o hub correto |
| Teste de conexão falha | 401 Unauthorized na conexão | API key rotacionada ou expirada | Atualize as credenciais da conexão nas configurações do hub |
| Conflito de storage account | `StorageAccountAlreadyTaken` | Nome do storage não é globalmente único | Use um prefixo único no nome do storage account |
| Timeout na criação do projeto | Operação leva >10 minutos | Restrições de capacidade na região | Tente uma região diferente ou aguarde e tente novamente |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    id: "ch11-q1",
    question: "Qual é a relação entre um Hub e um Projeto no AI Foundry?",
    options: [
      "Um Hub é um contêiner de nível superior que gerencia infraestrutura compartilhada; Projetos são workspaces dentro de um Hub onde equipes constroem soluções de IA",
      "Um Hub e um Projeto são recursos idênticos com nomes diferentes",
      "Um Projeto é o recurso de nível superior que contém múltiplos Hubs",
      "Hubs e Projetos são recursos independentes sem nenhuma relação"
    ],
    correctAnswer: 0,
    explanation: "Um Hub atua como um contêiner de nível superior gerenciando infraestrutura compartilhada (Storage, Key Vault, Container Registry). Projetos são workspaces dentro de um Hub que herdam recursos compartilhados enquanto mantêm seus próprios artefatos e implantações."
  },
  {
    id: "ch11-q2",
    question: "Qual comando do Azure CLI cria um Hub do AI Foundry?",
    options: [
      "az cognitiveservices account create --kind AIHub",
      "az ml workspace create --kind hub",
      "az ai foundry create --type hub",
      "az resource create --type Microsoft.AIFoundry/hubs"
    ],
    correctAnswer: 1,
    explanation: "Hubs do AI Foundry são criados usando 'az ml workspace create --kind hub'. O hub é um recurso de workspace especializado sob o Microsoft.MachineLearningServices."
  },
  {
    id: "ch11-q3",
    question: "Quais recursos dependentes são criados automaticamente ao provisionar um Hub do AI Foundry?",
    options: [
      "Apenas Azure OpenAI e Azure AI Search",
      "Virtual Network e Load Balancer",
      "Storage Account, Key Vault e opcionalmente Container Registry",
      "Cosmos DB e Azure Functions"
    ],
    correctAnswer: 2,
    explanation: "Ao criar um Hub do AI Foundry, o Azure provisiona automaticamente um Storage Account e Key Vault (obrigatórios), e opcionalmente um Container Registry e Application Insights para gerenciar artefatos e segredos."
  },
  {
    id: "ch11-q4",
    question: "Como os Projetos acessam conexões configuradas no Hub?",
    options: [
      "Projetos devem criar suas próprias conexões separadas",
      "Projetos herdam automaticamente as conexões do Hub pai",
      "Conexões devem ser copiadas manualmente do Hub para cada Projeto",
      "Projetos acessam conexões através de um API gateway separado"
    ],
    correctAnswer: 1,
    explanation: "Projetos herdam automaticamente as conexões configuradas no Hub pai. Isso permite gerenciamento centralizado de credenciais de serviço enquanto dá aos projetos acesso transparente aos serviços conectados."
  },
  {
    id: "ch11-q5",
    question: "Qual provedor de recursos deve ser registrado para criar recursos do AI Foundry?",
    options: [
      "Microsoft.CognitiveServices",
      "Microsoft.AIFoundry",
      "Microsoft.MachineLearningServices",
      "Microsoft.AzureAI"
    ],
    correctAnswer: 2,
    explanation: "Os recursos do AI Foundry (Hubs e Projetos) fazem parte do provedor de recursos Microsoft.MachineLearningServices. Este provedor deve ser registrado na assinatura antes de criar qualquer recurso do AI Foundry."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-challenge11 --yes --no-wait
```

## Saiba Mais

- [Documentação do Azure AI Foundry](https://learn.microsoft.com/azure/ai-studio/)
- [Criar e gerenciar um hub do AI Foundry](https://learn.microsoft.com/azure/ai-studio/how-to/create-azure-ai-resource)
- [Criar um projeto no AI Foundry](https://learn.microsoft.com/azure/ai-studio/how-to/create-projects)
- [Conexões no AI Foundry](https://learn.microsoft.com/azure/ai-studio/how-to/connections-add)
- [Arquitetura do AI Foundry](https://learn.microsoft.com/azure/ai-studio/concepts/architecture)
