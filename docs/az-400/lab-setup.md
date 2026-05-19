---
sidebar_position: 3
title: "Lab setup"
---

# Lab environment setup

## What you need

AZ-400 labs use three platforms. All have free tiers sufficient for every challenge.

| Platform | What | Free tier |
|----------|------|-----------|
| **GitHub** | Actions, Packages, Advanced Security | 2000 min/month Actions, GHAS free on public repos |
| **Azure DevOps** | Pipelines, Repos, Boards, Artifacts | 1 free parallel job (1800 min/month) |
| **Azure** | Deployment targets (App Service, ACA) | $200 credit (new account) or F1/free tiers |

## Option 1: GitHub Codespaces (recommended)

Click the button below for a pre-configured environment:

[![Open in GitHub Codespaces](https://img.shields.io/badge/Open_in_GitHub_Codespaces-181717?style=for-the-badge&logo=github&logoColor=white)](https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1)

Your Codespace includes:
- **Git** (latest)
- **GitHub CLI** (`gh`)
- **Azure CLI** with DevOps extension (`az devops`)
- **Docker** (for container labs)
- **Node.js 20 LTS** (for build/test labs)
- **Terraform CLI** (for IaC labs)

> GitHub Free accounts get **60 hours/month** of Codespaces.

## Option 2: Local setup

If you prefer working locally, install:

```bash
# GitHub CLI
# https://cli.github.com/

# Azure CLI + DevOps extension
az extension add --name azure-devops

# Docker Desktop
# https://docker.com/products/docker-desktop

# Node.js 20 LTS
# https://nodejs.org/

# Terraform
# https://developer.hashicorp.com/terraform/install
```

## Step 1: Create a free Azure DevOps organization

1. Go to [dev.azure.com](https://dev.azure.com)
2. Sign in with your Microsoft account
3. Click **"New organization"**
4. Name it (e.g., `yourname-certprep`)
5. Create a project named `az400-labs`

```bash
# Or via CLI (after signing in):
az devops configure --defaults organization=https://dev.azure.com/yourname-certprep
az devops project create --name az400-labs
```

## Step 2: Fork the lab starter repo

Many challenges reference a pre-built sample repository:

```bash
# Fork the lab starter repo to your GitHub account
gh repo fork azurecertprep/az400-lab-starter --clone

# This gives you:
# - Sample Node.js app with tests
# - Incomplete/broken CI workflows to fix
# - Pre-configured Dockerfile
# - Intentional security vulnerabilities for scanning labs
```

## Step 3: Connect Azure subscription

```bash
# Login to Azure CLI
az login

# Set a default subscription
az account set --subscription "Your Subscription Name"

# Create a resource group for lab resources
az group create --name rg-az400-labs --location eastus
```

## Step 4: Connect Azure DevOps to GitHub

For challenges that test integration between platforms:

1. In Azure DevOps → Project Settings → Service Connections
2. New service connection → GitHub
3. Authorize with your GitHub account

Or via CLI:

```bash
az devops service-endpoint github create \
  --github-url https://github.com \
  --name github-connection \
  --project az400-labs
```

## Cleanup between challenges

Most challenges include a cleanup section. For a full reset:

```bash
# Delete all lab Azure resources
az group delete --name rg-az400-labs --yes --no-wait

# Recreate fresh
az group create --name rg-az400-labs --location eastus
```

## Cost management

- **GitHub Actions**: 2000 minutes/month free (Linux runners). Monitor usage at github.com → Settings → Billing
- **Azure DevOps**: 1 free Microsoft-hosted parallel job. Check at dev.azure.com → Organization Settings → Pipelines → Parallel jobs
- **Azure resources**: Use F1/free tiers. Delete after each challenge. Set budget alerts at $10.

:::tip Pro tip

Many Domain 3 challenges can be completed entirely with GitHub Actions free tier + Azure free tier App Service (F1). No paid services required.

:::
