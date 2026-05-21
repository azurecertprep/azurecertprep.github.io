---
sidebar_position: 3
title: "Configuracao do ambiente de lab"
---

# Configuracao do ambiente de lab

## O que voce precisa

Os labs do SC-500 usam servicos Azure, Microsoft Entra ID, e opcionalmente Microsoft 365. A maioria dos desafios roda em free tiers ou licencas trial.

| Plataforma | O que | Free tier |
|------------|-------|-----------|
| **Azure** | Defender, Sentinel, Key Vault, rede, computacao | $200 de credito (conta nova) ou servicos free-tier |
| **Microsoft Entra ID** | PIM, Conditional Access, Identity Protection | Trial P2 (30 dias gratuito) |
| **Microsoft 365** | Purview, sensitivity labels, Copilot readiness | Trial E5 (opcional, 30 dias gratuito) |

## Opcao 1: GitHub Codespaces (recomendado)

Clique no botao abaixo para um ambiente pre-configurado:

[![Open in GitHub Codespaces](https://img.shields.io/badge/Open_in_GitHub_Codespaces-181717?style=for-the-badge&logo=github&logoColor=white)](https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1)

Seu Codespace inclui:
- **Azure CLI** com extensoes de security e sentinel
- **Microsoft Graph CLI** (`mgc`)
- **PowerShell 7** com modulos Az
- **Terraform CLI** (para deployments de seguranca baseados em IaC)
- **kubectl** (para labs de seguranca de containers)

> Contas GitHub Free tem **60 horas/mes** de Codespaces.

## Opcao 2: Setup local

Se voce prefere trabalhar localmente, instale:

```bash
# Azure CLI
# https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

# Extensoes necessarias para labs SC-500
az extension add --name sentinel
az extension add --name security
az extension add --name account
az extension add --name resource-graph

# Microsoft Graph CLI (para labs de Entra ID)
# https://learn.microsoft.com/en-us/graph/sdks/sdk-installation#install-the-microsoft-graph-command-line-interface

# Modulo PowerShell Az (alternativa ao CLI)
# Install-Module -Name Az -Scope CurrentUser -Force

# kubectl (para labs de seguranca de containers)
az aks install-cli
```

## Passo 1: Criar uma conta gratuita Azure

1. Acesse [azure.microsoft.com/free](https://azure.microsoft.com/free)
2. Cadastre-se com uma conta Microsoft
3. Voce recebe **$200 de credito** por 30 dias + servicos always-free

```bash
# Login no Azure CLI
az login

# Verificar sua subscription
az account show --query "{name:name, id:id, state:state}" -o table

# Criar um resource group para recursos de lab
az group create --name rg-sc500-labs --location eastus
```

## Passo 2: Ativar trial do Entra ID P2

PIM, Identity Protection e access reviews requerem Entra ID P2:

1. Acesse o [Microsoft Entra admin center](https://entra.microsoft.com)
2. Navegue ate **Identity** → **Overview** → **Manage tenants**
3. Clique em **Licenses** → **All products** → **Try/Buy**
4. Ative o trial gratuito do **Microsoft Entra ID P2** (25 licencas, 30 dias)

:::warning Importante

Inicie seu trial P2 quando voce estiver pronto para trabalhar nos desafios do Dominio 1. O trial roda por 30 dias independente do uso.

:::

## Passo 3: Habilitar Defender for Cloud (free tier)

```bash
# Registrar o resource provider de seguranca
az provider register --namespace Microsoft.Security

# Verificar que o Defender for Cloud esta acessivel
az security pricing list --query "[].{name:name, tier:pricingTier}" -o table
```

O **free tier** (CSPM) do Defender for Cloud fornece:
- Secure Score e recomendacoes
- Alertas de seguranca para recursos Azure
- Avaliacao basica de postura de seguranca

**Planos Defender** individuais (pagos) sao habilitados por desafio e desabilitados depois.

## Passo 4: Configurar workspace do Microsoft Sentinel

```bash
# Criar um workspace Log Analytics
az monitor log-analytics workspace create \
  --resource-group rg-sc500-labs \
  --workspace-name law-sc500-sentinel \
  --location eastus

# Habilitar Microsoft Sentinel no workspace
az sentinel onboarding-state create \
  --resource-group rg-sc500-labs \
  --workspace-name law-sc500-sentinel \
  --name default
```

> O Sentinel oferece **10 GB/dia gratuitos** nos primeiros 31 dias em um novo workspace.

## Passo 5 (opcional): Trial M365 E5 para labs de Purview/Copilot

Alguns desafios do Dominio 3 (seguranca de IA) requerem Microsoft 365 E5:

1. Acesse [Microsoft 365 E5 trial](https://www.microsoft.com/en-us/microsoft-365/enterprise/e5)
2. Cadastre-se para um trial de 30 dias (25 licencas de usuario)
3. Isso habilita: Purview, sensitivity labels, DLP, DSPM para IA

## Requisitos de licenca por desafio

| Desafios | Licenca necessaria | Trial gratuito disponivel? |
|----------|-------------------|---------------------------|
| 01–06 (PIM, Conditional Access, identidade) | Entra ID P2 | ✅ Trial de 30 dias |
| 07–12 (governanca, access reviews) | Entra ID P2 | ✅ Trial de 30 dias |
| 13–25 (armazenamento, rede, bancos de dados) | Subscription Azure | ✅ $200 de credito |
| 26–30 (seguranca de IA, Purview DSPM) | M365 E5 + Purview | ✅ Trial de 30 dias |
| 31–38 (VMs, containers, planos Defender) | Subscription Azure | ✅ $200 de credito |
| 39–51 (Defender CSPM, Sentinel) | Subscription Azure | ✅ Free tier + trial |
| 52 (capstone) | Todos os acima | ✅ Planeje o timing com cuidado |

## Limpeza entre desafios

A maioria dos desafios inclui uma secao de limpeza. Para um reset completo:

```bash
# Deletar todos os recursos Azure de lab
az group delete --name rg-sc500-labs --yes --no-wait

# Recriar do zero
az group create --name rg-sc500-labs --location eastus

# Desabilitar planos Defender pagos para parar a cobranca
az security pricing create --name VirtualMachines --tier free
az security pricing create --name StorageAccounts --tier free
az security pricing create --name SqlServers --tier free
```

## Gerenciamento de custo

- **Entra ID P2**: Gratuito por 30 dias. Inicie o trial quando estiver pronto para o Dominio 1.
- **Planos Defender**: Habilite por desafio, desabilite imediatamente depois. Cobrado por hora.
- **Sentinel**: 10 GB/dia gratuitos nos primeiros 31 dias. Monitore a ingestao em **Workspace** → **Usage and estimated costs**.
- **VMs**: Use tamanho B1s, desaloque quando nao estiver usando. Labs de JIT precisam de VMs rodando brevemente.
- **Defina um alerta de orcamento em $15**: Va ao Portal Azure → Cost Management → Budgets.

:::tip Dica profissional

A ordem de estudo importa para otimizacao de custo. Comece com Dominio 1 (identidade — usa trial do Entra P2), depois Dominio 4 (usa periodo gratuito do Sentinel), depois Dominios 2–3 (usam credito Azure). Isso maximiza a cobertura dos trials gratuitos.

:::

## Estimativa de custo

| Recurso | Custo | Duracao |
|---------|-------|---------|
| Trial Entra ID P2 | $0 | 30 dias |
| Trial M365 E5 | $0 | 30 dias |
| Sentinel (free tier) | $0 | 31 dias |
| VMs Azure (B1s, ~4 horas total) | ~$2 | Por desafio |
| Storage accounts, Key Vault, rede | ~$5 | Ao longo de todos os labs |
| Planos Defender (habilitados brevemente) | ~$3–5 | Por desafio |
| **Total estimado** | **$10–15** | **Com limpeza agressiva** |
