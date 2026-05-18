---
sidebar_position: 3
title: "Lab Setup"
---

# Lab Setup

Every challenge requires an Azure subscription and command-line tools. This page walks you through both setup options.

## Option 1: GitHub Codespaces (Recommended)

The fastest way to get started | everything is pre-installed.

[![Open in GitHub Codespaces](https://img.shields.io/badge/Open_in_GitHub_Codespaces-181717?style=for-the-badge&logo=github&logoColor=white)](https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1)

Your Codespace comes pre-configured with:
- **Azure CLI** (latest) with Bicep support
- **Azure PowerShell** (Az module)
- **jq** and **yq** for JSON/YAML manipulation
- **Git** and **GitHub CLI**

> 💡 GitHub Free accounts get **60 hours/month** of Codespaces | more than enough to complete all challenges.

### After opening Codespaces, log in to Azure:

```bash
# Login to Azure (opens a browser window)
az login --use-device-code

# Verify your subscription
az account show --output table

# Set your default subscription (if you have multiple)
az account set --subscription "YOUR_SUBSCRIPTION_NAME"
```

## Option 2: Local Setup

If you prefer to work locally, install these tools:

| Tool | Install Command | Purpose |
|------|----------------|---------|
| Azure CLI | [Install guide](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) | Primary CLI tool |
| Bicep | `az bicep install` | Infrastructure as Code |
| PowerShell 7+ | [Install guide](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell) | Alternative CLI |
| Az PowerShell Module | `Install-Module -Name Az -Force` | Azure PowerShell cmdlets |
| jq | [Install guide](https://jqlang.github.io/jq/download/) | JSON processing |

### Verify your setup:

```bash
az --version
az bicep version
pwsh --version
jq --version
```

## Azure Subscription

You need an Azure subscription for all challenges except Challenge 07 (ARM/Bicep can be validated locally).

### Free Options

| Option | Credit | Duration | Credit Card Required? |
|--------|--------|----------|-----------------------|
| [Azure Free Account](https://azure.microsoft.com/free/) | $200 | 30 days | Yes (not charged) |
| [Azure for Students](https://azure.microsoft.com/free/students/) | $100 | 12 months | No |
| [Visual Studio Subscription](https://azure.microsoft.com/pricing/member-offers/credit-for-visual-studio-subscribers/) | $50-150/mo | Monthly | Depends on tier |

:::warning Cost Management

All challenges include cleanup scripts. **Always run cleanup after each challenge** to avoid unexpected charges. Total cost for all 28 challenges is estimated at ~$5 with proper cleanup.
:::

## Resource Naming Convention

We use a consistent naming convention across all challenges:

```
rg-az104-challenge-XX        # Resource group per challenge
staz104chXXxxxx               # Storage accounts (globally unique)
vm-az104-XX                   # Virtual machines
vnet-az104-XX                 # Virtual networks
```

## Quick Setup Script

Run this once to set up common variables used across all challenges:

```bash
# Set your preferred region
export LOCATION="eastus"

# Create a base resource group for shared resources
az group create --name rg-az104-shared --location $LOCATION

# Verify
az group list --output table
```

:::tip PowerShell equivalent

```powershell
$Location = "eastus"
New-AzResourceGroup -Name "rg-az104-shared" -Location $Location
Get-AzResourceGroup | Format-Table
```
:::

---

**Setup complete?** Start with [Challenge 01: Entra ID Users & Groups](/docs/az-104/identity/challenge-01).
