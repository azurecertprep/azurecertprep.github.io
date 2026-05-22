---
sidebar_position: 3
title: "Lab Setup"
---

# Lab setup

## Requirements

| Component | Minimum |
|-----------|---------|
| Azure subscription | Pay-as-you-go or Free Account ($200 credit) |
| Role | Contributor on the subscription |
| Azure CLI | 2.60+ (`az --version`) |
| Azure PowerShell | Az 12.0+ (`Get-InstalledModule Az`) |
| GitHub Codespaces | Optional — pre-configured environment |

## Quick start with GitHub Codespaces

The fastest way to start is using our pre-configured Codespace:

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1)

The Codespace includes Azure CLI, PowerShell Az module, and all required tools pre-installed.

## Local setup

```bash
# Install Azure CLI (if not already installed)
# https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

# Login to Azure
az login

# Verify subscription
az account show --query "{name:name, id:id, state:state}" -o table

# Set the subscription (if you have multiple)
az account set --subscription "<subscription-id>"

# Register required resource providers
az provider register --namespace Microsoft.Network --wait
az provider register --namespace Microsoft.Compute --wait
az provider register --namespace Microsoft.Storage --wait
az provider register --namespace Microsoft.OperationalInsights --wait
```

## Resource group convention

All challenges use a consistent naming pattern:

```bash
# Create resource group for a challenge
az group create --name "rg-az700-challenge-XX" --location "eastus2"
```

:::tip Location selection

Use `eastus2` or `westus2` for all challenges — they have full availability of networking services including VPN Gateway, ExpressRoute, and Azure Firewall.

:::

## Cost management strategy

### Per-domain estimated costs

| Domain | Estimated total cost | Strategy |
|--------|---------------------|----------|
| 1. Core Networking | ~$2–5 | Low cost — mostly VNets, DNS zones, routing |
| 2. Connectivity | ~$10–20 | VPN Gateways are ~$0.19/h — deploy, test, delete immediately |
| 3. App Delivery | ~$8–15 | App Gateway and Front Door — use minimum SKU |
| 4. Private Access | ~$2–5 | Low cost — Private Endpoints are ~$0.01/h |
| 5. Network Security | ~$10–25 | Azure Firewall is expensive — delete after each challenge |

### Cost guardrails

```bash
# Set a budget alert (recommended: $50 for the entire AZ-700 lab series)
az consumption budget create \
  --budget-name "az700-labs" \
  --amount 50 \
  --time-grain Monthly \
  --category Cost \
  --resource-group "rg-az700-*"

# Check current spending
az consumption usage list \
  --query "[?contains(instanceName, 'az700')].{Name:instanceName, Cost:pretaxCost}" \
  --top 20 -o table
```

### ExpressRoute challenges (19–21): simulation mode

:::caution ExpressRoute requires a physical circuit

ExpressRoute challenges are **simulation-based**. You will:
- Learn the CLI commands and configuration parameters
- Review expected outputs and verify understanding
- Practice with the configuration concepts without deploying actual circuits

Deploying an ExpressRoute circuit requires a connectivity provider and costs $55–$10,000+/month. The challenges show exact commands, expected outputs, and configuration patterns so you can master the material for the exam.

:::

### Expensive resources: deploy → test → delete

For VPN Gateways, Azure Firewall, and Application Gateways:

```bash
# After completing a challenge, IMMEDIATELY delete the resource group
az group delete --name "rg-az700-challenge-XX" --yes --no-wait

# Verify deletion
az group list --query "[?starts_with(name, 'rg-az700')]" -o table
```

## Cleanup all AZ-700 resources

```bash
# Nuclear option: delete ALL AZ-700 resource groups
for rg in $(az group list --query "[?starts_with(name, 'rg-az700')].name" -o tsv); do
  echo "Deleting $rg..."
  az group delete --name "$rg" --yes --no-wait
done

echo "All AZ-700 resource groups queued for deletion"
```

## Network-specific prerequisites

Some challenges require specific network conditions:

```bash
# Verify you can create VPN Gateways (check quota)
az network list-usages --location eastus2 \
  --query "[?contains(name.value, 'VirtualNetworkGateways')].{Name:name.localizedValue, Current:currentValue, Limit:limit}" \
  -o table

# Verify Public IP availability
az network list-usages --location eastus2 \
  --query "[?contains(name.value, 'PublicIPAddresses')].{Name:name.localizedValue, Current:currentValue, Limit:limit}" \
  -o table
```
