---
sidebar_position: 3
title: "Lab setup"
---

# Lab environment setup

## What you need

SC-500 labs use Azure services, Microsoft Entra ID, and optionally Microsoft 365. Most challenges run on free tiers or trial licenses.

| Platform | What | Free tier |
|----------|------|-----------|
| **Azure** | Defender, Sentinel, Key Vault, networking, compute | $200 credit (new account) or free-tier services |
| **Microsoft Entra ID** | PIM, Conditional Access, Identity Protection | P2 trial (30 days free) |
| **Microsoft 365** | Purview, sensitivity labels, Copilot readiness | E5 trial (optional, 30 days free) |

## Option 1: GitHub Codespaces (recommended)

Click the button below for a pre-configured environment:

[![Open in GitHub Codespaces](https://img.shields.io/badge/Open_in_GitHub_Codespaces-181717?style=for-the-badge&logo=github&logoColor=white)](https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1)

Your Codespace includes:
- **Azure CLI** with security and sentinel extensions
- **Microsoft Graph CLI** (`mgc`)
- **PowerShell 7** with Az modules
- **Terraform CLI** (for IaC-based security deployments)
- **kubectl** (for container security labs)

> GitHub Free accounts get **60 hours/month** of Codespaces.

## Option 2: Local setup

If you prefer working locally, install:

```bash
# Azure CLI
# https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

# Required extensions for SC-500 labs
az extension add --name sentinel
az extension add --name security
az extension add --name account
az extension add --name resource-graph

# Microsoft Graph CLI (for Entra ID labs)
# https://learn.microsoft.com/en-us/graph/sdks/sdk-installation#install-the-microsoft-graph-command-line-interface

# PowerShell Az module (alternative to CLI)
# Install-Module -Name Az -Scope CurrentUser -Force

# kubectl (for container security labs)
az aks install-cli
```

## Step 1: Create an Azure free account

1. Go to [azure.microsoft.com/free](https://azure.microsoft.com/free)
2. Sign up with a Microsoft account
3. You get **$200 credit** for 30 days + always-free services

```bash
# Login to Azure CLI
az login

# Verify your subscription
az account show --query "{name:name, id:id, state:state}" -o table

# Create a resource group for lab resources
az group create --name rg-sc500-labs --location eastus
```

## Step 2: Activate Entra ID P2 trial

PIM, Identity Protection, and access reviews require Entra ID P2:

1. Go to [Microsoft Entra admin center](https://entra.microsoft.com)
2. Navigate to **Identity** → **Overview** → **Manage tenants**
3. Click **Licenses** → **All products** → **Try/Buy**
4. Activate **Microsoft Entra ID P2** free trial (25 licenses, 30 days)

:::warning Important

Start your P2 trial when you're ready to work on Domain 1 challenges. The trial runs for 30 days regardless of usage.

:::

## Step 3: Enable Defender for Cloud (free tier)

```bash
# Register security resource provider
az provider register --namespace Microsoft.Security

# Verify Defender for Cloud is accessible
az security pricing list --query "[].{name:name, tier:pricingTier}" -o table
```

Defender for Cloud's **free tier** (CSPM) provides:
- Secure Score and recommendations
- Security alerts for Azure resources
- Basic security posture assessment

Individual **Defender plans** (paid) are enabled per-challenge and disabled after.

## Step 4: Set up Microsoft Sentinel workspace

```bash
# Create a Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group rg-sc500-labs \
  --workspace-name law-sc500-sentinel \
  --location eastus

# Enable Microsoft Sentinel on the workspace
az sentinel onboarding-state create \
  --resource-group rg-sc500-labs \
  --workspace-name law-sc500-sentinel \
  --name default
```

> Sentinel offers **10 GB/day free** for the first 31 days on a new workspace.

## Step 5 (optional): M365 E5 trial for Purview/Copilot labs

Some Domain 3 challenges (AI security) require Microsoft 365 E5:

1. Go to [Microsoft 365 E5 trial](https://www.microsoft.com/en-us/microsoft-365/enterprise/e5)
2. Sign up for a 30-day trial (25 user licenses)
3. This enables: Purview, sensitivity labels, DLP, DSPM for AI

## License requirements by challenge

| Challenges | License needed | Free trial available? |
|------------|---------------|----------------------|
| 01–06 (PIM, Conditional Access, identity) | Entra ID P2 | ✅ 30-day trial |
| 07–12 (governance, access reviews) | Entra ID P2 | ✅ 30-day trial |
| 13–25 (storage, network, databases) | Azure subscription | ✅ $200 credit |
| 26–30 (AI security, Purview DSPM) | M365 E5 + Purview | ✅ 30-day trial |
| 31–38 (VMs, containers, Defender plans) | Azure subscription | ✅ $200 credit |
| 39–51 (Defender CSPM, Sentinel) | Azure subscription | ✅ Free tier + trial |
| 52 (capstone) | All of the above | ✅ Plan timing carefully |

## Cleanup between challenges

Most challenges include a cleanup section. For a full reset:

```bash
# Delete all lab Azure resources
az group delete --name rg-sc500-labs --yes --no-wait

# Recreate fresh
az group create --name rg-sc500-labs --location eastus

# Disable paid Defender plans to stop billing
az security pricing create --name VirtualMachines --tier free
az security pricing create --name StorageAccounts --tier free
az security pricing create --name SqlServers --tier free
```

## Cost management

- **Entra ID P2**: Free for 30 days. Start the trial when ready for Domain 1.
- **Defender plans**: Enable per-challenge, disable immediately after. Billed hourly.
- **Sentinel**: 10 GB/day free for first 31 days. Monitor ingestion at **Workspace** → **Usage and estimated costs**.
- **VMs**: Use B1s size, deallocate when not in use. JIT labs need VMs running briefly.
- **Set a budget alert at $15**: Go to Azure Portal → Cost Management → Budgets.

:::tip Pro tip

Study order matters for cost optimization. Start with Domain 1 (identity — uses Entra P2 trial), then Domain 4 (uses Sentinel free period), then Domains 2–3 (use Azure credit). This maximizes free trial coverage.

:::

## Cost estimation

| Resource | Cost | Duration |
|----------|------|----------|
| Entra ID P2 trial | $0 | 30 days |
| M365 E5 trial | $0 | 30 days |
| Sentinel (free tier) | $0 | 31 days |
| Azure VMs (B1s, ~4 hours total) | ~$2 | Per-challenge |
| Storage accounts, Key Vault, networking | ~$5 | Across all labs |
| Defender plans (enabled briefly) | ~$3–5 | Per-challenge |
| **Total estimated** | **$10–15** | **With aggressive cleanup** |
