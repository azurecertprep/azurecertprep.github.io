---
sidebar_position: 3
title: "Lab Setup"
---

# Lab Setup

The AI-103 is a hands-on engineering exam. Every challenge requires writing code that calls Azure AI services. Expect to spend **$20–50** on Azure resources across all challenges (with diligent cleanup).

## Option 1: GitHub Codespaces (Recommended)

The fastest way to get started — everything is pre-installed.

[![Open in GitHub Codespaces](https://img.shields.io/badge/Open_in_GitHub_Codespaces-181717?style=for-the-badge&logo=github&logoColor=white)](https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1)

Your Codespace comes pre-configured with:
- **Python 3.11+** with Azure AI SDKs
- **.NET 8** SDK
- **Azure CLI** (latest) with AI extensions
- **Docker** for container-based challenges
- **Git** and **GitHub CLI**

> GitHub Free accounts get **60 hours/month** of Codespaces — more than enough to complete all challenges.

### After opening Codespaces, log in to Azure:

```bash
# Login to Azure (opens a browser window)
az login --use-device-code

# Verify your subscription
az account show --output table

# Register required resource providers
az provider register --namespace Microsoft.CognitiveServices
az provider register --namespace Microsoft.Search
```

## Option 2: Local Setup

If you prefer to work locally, install these tools:

| Tool | Install | Purpose |
|------|---------|---------|
| Azure Subscription | [Pay-As-You-Go](https://azure.microsoft.com/pricing/purchase-options/pay-as-you-go/) or MSDN | All labs require billable resources |
| VS Code | [Download](https://code.visualstudio.com/) | Primary IDE |
| Python 3.9+ | [Download](https://www.python.org/downloads/) | SDK challenges |
| .NET 8+ | [Download](https://dotnet.microsoft.com/download) | C# tab challenges |
| Azure CLI | [Install guide](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) | Resource management |
| Git | [Download](https://git-scm.com/) | Clone challenge repos |
| Docker Desktop | [Download](https://www.docker.com/products/docker-desktop/) | Container challenges |

### VS Code Extensions

Install these extensions for the best experience:
- **Python** (ms-python.python)
- **Azure Tools** (ms-vscode.vscode-node-azure-pack)
- **Azure AI** (ms-azuretools.vscode-ai)
- **REST Client** (humao.rest-client) — for testing REST API calls
- **C# Dev Kit** (ms-dotnettools.csdevkit) — if using C#

### Verify your setup:

```bash
python --version    # 3.9+
dotnet --version    # 8.0+
az --version        # 2.60+
git --version
docker --version
```

## Azure Resource Setup

### Step 1: Create a resource group for labs

```bash
export LOCATION="eastus"
az group create --name rg-ai102-labs --location $LOCATION
```

### Step 2: Provision Azure AI Services (multi-service resource)

```bash
az cognitiveservices account create \
  --name ai102-ai-services \
  --resource-group rg-ai102-labs \
  --kind AIServices \
  --sku S0 \
  --location $LOCATION \
  --yes
```

### Step 3: Set up Azure OpenAI (if access is approved)

```bash
az cognitiveservices account create \
  --name ai102-openai \
  --resource-group rg-ai102-labs \
  --kind OpenAI \
  --sku S0 \
  --location swedencentral \
  --yes
```

:::warning Azure OpenAI Access
Azure OpenAI requires an approved access request. Apply at [https://aka.ms/oai/access](https://aka.ms/oai/access). Approval typically takes 1–2 business days. You can start with Challenges 01–10 while waiting.
:::

### Step 4: Save environment variables

```bash
# Get your keys and endpoints
export AZURE_AI_SERVICES_ENDPOINT=$(az cognitiveservices account show \
  --name ai102-ai-services --resource-group rg-ai102-labs \
  --query properties.endpoint -o tsv)

export AZURE_AI_SERVICES_KEY=$(az cognitiveservices account keys list \
  --name ai102-ai-services --resource-group rg-ai102-labs \
  --query key1 -o tsv)

echo "Endpoint: $AZURE_AI_SERVICES_ENDPOINT"
```

## Cost Management

:::warning Lab Costs
AI-103 challenges create billable resources. Total cost: **$20–50** with proper cleanup.
:::

| Tip | Details |
|-----|---------|
| **Use free tiers** | Azure AI Services has free-tier limits (20 calls/min for many APIs) |
| **Delete after each challenge** | Every challenge includes a cleanup script — run it! |
| **Set budget alerts** | Create a $30 budget alert on your resource group |
| **Use S0 tier** | Standard tier is pay-per-use — you only pay for calls made |
| **Azure OpenAI** | Most expensive service — delete deployments when not in use |

### Set a budget alert:

```bash
# Create a budget with email alert at 80%
az consumption budget create \
  --budget-name ai102-budget \
  --amount 30 \
  --resource-group rg-ai102-labs \
  --time-grain Monthly \
  --category Cost \
  --start-date 2025-01-01 \
  --end-date 2025-12-31
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Resource provider not registered" | Run `az provider register --namespace Microsoft.CognitiveServices` |
| "Azure OpenAI access denied" | Apply at [aka.ms/oai/access](https://aka.ms/oai/access) — use Challenges 01–10 while waiting |
| "Quota exceeded" | Switch regions or request a quota increase in the Azure Portal |
| "Python SDK import errors" | Run `pip install azure-ai-textanalytics azure-ai-vision-imageanalysis azure-identity` |
| "Region not available" | Use `eastus`, `westus2`, or `swedencentral` (best OpenAI availability) |
| "Authentication failed" | Run `az login` again, verify `az account show` shows correct subscription |
| "Docker permission denied" | Ensure Docker Desktop is running; on Linux use `sudo usermod -aG docker $USER` |

---

**Setup complete?** Start with [Challenge 01: Select and Provision Azure AI Services](/docs/ai-103/plan-manage/challenge-01).
