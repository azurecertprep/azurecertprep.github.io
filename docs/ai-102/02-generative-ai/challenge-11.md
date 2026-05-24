---
sidebar_position: 2
title: "Challenge 11: Azure AI Foundry Setup"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 11: Azure AI Foundry Setup

:::info Estimated Time
**45-60 min** | **Cost**: ~$2.00 (hub resources) | **Domain**: Generative AI Solutions (15-20%)
:::

## Exam skills covered

- Plan and manage an Azure AI Foundry resource
- Deploy hub and project resources with proper resource hierarchy
- Configure connections to Azure OpenAI and Azure AI Search

## Overview

Azure AI Foundry (formerly Azure AI Studio) provides a unified platform for building generative AI applications. The architecture follows a hub-and-project model where a **hub** acts as a top-level container that manages shared infrastructure—including Azure Storage, Key Vault, and Container Registry—while **projects** are workspaces within a hub where teams build and deploy AI solutions.

Understanding the resource hierarchy is critical for the AI-102 exam. A hub creates dependent resources automatically (Storage Account, Key Vault, and optionally Container Registry and Application Insights). Projects inherit the hub's connections and compute resources but maintain their own artifacts, deployments, and data. This separation enables enterprise governance while giving development teams autonomy.

Connections are the mechanism by which hubs and projects access external services like Azure OpenAI endpoints, Azure AI Search indexes, and custom APIs. Connections store credentials securely in the associated Key Vault and can be shared across all projects within a hub.

## Architecture

The AI Foundry resource hierarchy follows a hub → project model with shared dependent resources and configurable connections to AI services.

![Challenge 11 topology](/img/ai-102/challenge-11-topology.svg)

## Prerequisites

- Azure subscription with Contributor access
- Azure CLI installed (v2.60+) with `ml` extension
- Resource providers registered: `Microsoft.MachineLearningServices`, `Microsoft.CognitiveServices`
- An existing Azure OpenAI resource (or permission to create one)

## Implementation

### Task 1: Create a Resource Group and AI Foundry Hub

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
    display_name="AI-102 Foundry Hub",
    description="Hub for AI-102 certification prep",
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
    DisplayName = "AI-102 Foundry Hub",
    Description = "Hub for AI-102 certification prep",
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
  --display-name "AI-102 Foundry Hub"

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
      "displayName": "AI-102 Foundry Hub",
      "description": "Hub for AI-102 certification prep"
    }
  }'
```

</TabItem>
</Tabs>

### Task 2: Create a Project Under the Hub

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

### Task 3: Configure Connections

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

### Task 4: Explore the Resource Hierarchy

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

## Expected Output

After completing all tasks, you should have:

1. **Resource group** `rg-ai102-challenge11` containing:
   - AI Foundry Hub (`hub-ai102-foundry`) with kind=Hub
   - AI Foundry Project (`proj-ai102-genai`) with kind=Project
   - Storage Account (auto-created by hub)
   - Key Vault (auto-created by hub)
2. **Connections** configured on the hub:
   - `aoai-connection` → Azure OpenAI endpoint
   - `search-connection` → Azure AI Search endpoint
3. **Project** inherits all hub connections automatically

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Hub creation fails | `ResourceProviderNotRegistered` error | `Microsoft.MachineLearningServices` not registered | `az provider register --namespace Microsoft.MachineLearningServices` |
| Project can't see connections | Empty connection list in project | Project created in different hub or wrong workspace context | Verify `hub_resource_id` points to correct hub |
| Connection test fails | 401 Unauthorized on connection | API key rotated or expired | Update connection credentials in hub settings |
| Storage account conflict | `StorageAccountAlreadyTaken` | Storage name not globally unique | Use unique prefix in storage account name |
| Project creation timeout | Operation takes >10 minutes | Region capacity constraints | Try a different region or wait and retry |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    id: "ch11-q1",
    question: "What is the relationship between an AI Foundry Hub and a Project?",
    options: [
      "A Hub is a top-level container that manages shared infrastructure; Projects are workspaces within a Hub where teams build AI solutions",
      "A Hub and Project are identical resources with different names",
      "A Project is the top-level resource that contains multiple Hubs",
      "Hubs and Projects are independent resources with no relationship"
    ],
    correctAnswer: 0,
    explanation: "A Hub acts as a top-level container managing shared infrastructure (Storage, Key Vault, Container Registry). Projects are workspaces within a Hub that inherit shared resources while maintaining their own artifacts and deployments."
  },
  {
    id: "ch11-q2",
    question: "Which Azure CLI command creates an AI Foundry Hub?",
    options: [
      "az cognitiveservices account create --kind AIHub",
      "az ml workspace create --kind hub",
      "az ai foundry create --type hub",
      "az resource create --type Microsoft.AIFoundry/hubs"
    ],
    correctAnswer: 1,
    explanation: "AI Foundry Hubs are created using 'az ml workspace create --kind hub'. The hub is a specialized workspace resource under Microsoft.MachineLearningServices."
  },
  {
    id: "ch11-q3",
    question: "Which dependent resources are automatically created when provisioning an AI Foundry Hub?",
    options: [
      "Azure OpenAI and Azure AI Search only",
      "Virtual Network and Load Balancer",
      "Storage Account, Key Vault, and optionally Container Registry",
      "Cosmos DB and Azure Functions"
    ],
    correctAnswer: 2,
    explanation: "When creating an AI Foundry Hub, Azure automatically provisions a Storage Account and Key Vault (required), and optionally a Container Registry and Application Insights for managing artifacts and secrets."
  },
  {
    id: "ch11-q4",
    question: "How do Projects access connections configured on the Hub?",
    options: [
      "Projects must create their own separate connections",
      "Projects automatically inherit connections from their parent Hub",
      "Connections must be manually copied from Hub to each Project",
      "Projects access connections through a separate API gateway"
    ],
    correctAnswer: 1,
    explanation: "Projects automatically inherit connections configured on their parent Hub. This enables centralized management of service credentials while giving projects seamless access to connected services."
  },
  {
    id: "ch11-q5",
    question: "What resource provider must be registered to create AI Foundry resources?",
    options: [
      "Microsoft.CognitiveServices",
      "Microsoft.AIFoundry",
      "Microsoft.MachineLearningServices",
      "Microsoft.AzureAI"
    ],
    correctAnswer: 2,
    explanation: "AI Foundry resources (Hubs and Projects) are part of the Microsoft.MachineLearningServices resource provider. This provider must be registered in the subscription before creating any AI Foundry resources."
  }
]} />

## Cleanup

```bash
az group delete --name rg-ai102-challenge11 --yes --no-wait
```

## Learn More

- [Azure AI Foundry documentation](https://learn.microsoft.com/azure/ai-studio/)
- [Create and manage an AI Foundry hub](https://learn.microsoft.com/azure/ai-studio/how-to/create-azure-ai-resource)
- [Create a project in AI Foundry](https://learn.microsoft.com/azure/ai-studio/how-to/create-projects)
- [Connections in AI Foundry](https://learn.microsoft.com/azure/ai-studio/how-to/connections-add)
- [AI Foundry architecture](https://learn.microsoft.com/azure/ai-studio/concepts/architecture)
