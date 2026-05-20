---
sidebar_position: 3
title: "Configuração do laboratório"
---

# Configuração do ambiente de laboratório

## O que você precisa

Os laboratórios do AZ-400 usam três plataformas. Todas possuem tiers gratuitos suficientes para todos os desafios.

| Plataforma | O quê | Tier gratuito |
|----------|------|-----------|
| **GitHub** | Actions, Packages, Advanced Security | 2000 min/mês Actions, GHAS gratuito em repositórios públicos |
| **Azure DevOps** | Pipelines, Repos, Boards, Artifacts | 1 parallel job gratuito (1800 min/mês) |
| **Azure** | Alvos de deploy (App Service, ACA) | Crédito de $200 (conta nova) ou tiers F1/gratuito |

## Opção 1: GitHub Codespaces (recomendado)

Clique no botão abaixo para um ambiente pré-configurado:

[![Open in GitHub Codespaces](https://img.shields.io/badge/Open_in_GitHub_Codespaces-181717?style=for-the-badge&logo=github&logoColor=white)](https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1)

Seu Codespace inclui:
- **Git** (mais recente)
- **GitHub CLI** (`gh`)
- **Azure CLI** com extensão DevOps (`az devops`)
- **Docker** (para laboratórios de containers)
- **Node.js 20 LTS** (para laboratórios de build/teste)
- **Terraform CLI** (para laboratórios de IaC)

> Contas GitHub Free recebem **60 horas/mês** de Codespaces.

## Opção 2: Configuração local

Se preferir trabalhar localmente, instale:

```bash
# GitHub CLI
# https://cli.github.com/

# Azure CLI + extensão DevOps
az extension add --name azure-devops

# Docker Desktop
# https://docker.com/products/docker-desktop

# Node.js 20 LTS
# https://nodejs.org/

# Terraform
# https://developer.hashicorp.com/terraform/install
```

## Passo 1: Criar uma organização gratuita no Azure DevOps

1. Acesse [dev.azure.com](https://dev.azure.com)
2. Entre com sua conta Microsoft
3. Clique em **"New organization"**
4. Dê um nome (ex.: `seunome-certprep`)
5. Crie um projeto chamado `az400-labs`

```bash
# Ou via CLI (após fazer login):
az devops configure --defaults organization=https://dev.azure.com/yourname-certprep
az devops project create --name az400-labs
```

## Passo 2: Fazer fork do repositório inicial de laboratório

Muitos desafios fazem referência a um repositório de exemplo pré-construído:

```bash
# Faça fork do repositório inicial de laboratório para sua conta GitHub
gh repo fork azurecertprep/az400-lab-starter --clone

# Isso lhe dará:
# - App Node.js de exemplo com testes
# - Workflows de CI incompletos/quebrados para corrigir
# - Dockerfile pré-configurado
# - Vulnerabilidades de segurança intencionais para laboratórios de varredura
```

## Passo 3: Conectar a assinatura Azure

```bash
# Login no Azure CLI
az login

# Definir uma assinatura padrão
az account set --subscription "Your Subscription Name"

# Criar um resource group para recursos de laboratório
az group create --name rg-az400-labs --location eastus
```

## Passo 4: Conectar Azure DevOps ao GitHub

Para desafios que testam integração entre plataformas:

1. No Azure DevOps → Project Settings → Service Connections
2. New service connection → GitHub
3. Autorize com sua conta GitHub

Ou via CLI:

```bash
az devops service-endpoint github create \
  --github-url https://github.com \
  --name github-connection \
  --project az400-labs
```

## Limpeza entre desafios

A maioria dos desafios inclui uma seção de limpeza. Para um reset completo:

```bash
# Deletar todos os recursos Azure de laboratório
az group delete --name rg-az400-labs --yes --no-wait

# Recriar do zero
az group create --name rg-az400-labs --location eastus
```

## Gerenciamento de custos

- **GitHub Actions**: 2000 minutos/mês grátis (runners Linux). Monitore o uso em github.com → Settings → Billing
- **Azure DevOps**: 1 parallel job Microsoft-hosted gratuito. Verifique em dev.azure.com → Organization Settings → Pipelines → Parallel jobs
- **Recursos Azure**: Use tiers F1/gratuitos. Delete após cada desafio. Configure alertas de orçamento em $10.

:::tip Dica profissional

Muitos desafios do Domínio 3 podem ser completados inteiramente com o tier gratuito do GitHub Actions + App Service gratuito do Azure (F1). Nenhum serviço pago é necessário.

:::
