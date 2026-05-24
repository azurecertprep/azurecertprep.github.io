---
sidebar_position: 3
title: "Configuração do Laboratório"
---

# Configuração do Laboratório

O AI-102 é um exame de engenharia prática. Cada desafio requer escrever código que chama serviços Azure AI. Espere gastar **$20–50** em recursos Azure ao longo de todos os desafios (com limpeza cuidadosa).

## Opção 1: GitHub Codespaces (Recomendado)

A forma mais rápida de começar — tudo já vem pré-instalado.

[![Open in GitHub Codespaces](https://img.shields.io/badge/Open_in_GitHub_Codespaces-181717?style=for-the-badge&logo=github&logoColor=white)](https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1)

Seu Codespace vem pré-configurado com:
- **Python 3.11+** com SDKs Azure AI
- **.NET 8** SDK
- **Azure CLI** (última versão) com extensões de IA
- **Docker** para desafios baseados em containers
- **Git** e **GitHub CLI**

> Contas GitHub Free recebem **60 horas/mês** de Codespaces — mais que suficiente para completar todos os desafios.

### Após abrir o Codespaces, faça login no Azure:

```bash
# Login no Azure (abre uma janela do navegador)
az login --use-device-code

# Verifique sua assinatura
az account show --output table

# Registre os provedores de recursos necessários
az provider register --namespace Microsoft.CognitiveServices
az provider register --namespace Microsoft.Search
```

## Opção 2: Configuração Local

Se você prefere trabalhar localmente, instale estas ferramentas:

| Ferramenta | Instalação | Propósito |
|------|---------|---------|
| Assinatura Azure | [Pay-As-You-Go](https://azure.microsoft.com/pricing/purchase-options/pay-as-you-go/) ou MSDN | Todos os labs requerem recursos faturáveis |
| VS Code | [Download](https://code.visualstudio.com/) | IDE principal |
| Python 3.9+ | [Download](https://www.python.org/downloads/) | Desafios com SDK |
| .NET 8+ | [Download](https://dotnet.microsoft.com/download) | Desafios com aba C# |
| Azure CLI | [Guia de instalação](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) | Gerenciamento de recursos |
| Git | [Download](https://git-scm.com/) | Clonar repositórios dos desafios |
| Docker Desktop | [Download](https://www.docker.com/products/docker-desktop/) | Desafios com containers |

### Extensões do VS Code

Instale estas extensões para a melhor experiência:
- **Python** (ms-python.python)
- **Azure Tools** (ms-vscode.vscode-node-azure-pack)
- **Azure AI** (ms-azuretools.vscode-ai)
- **REST Client** (humao.rest-client) — para testar chamadas REST API
- **C# Dev Kit** (ms-dotnettools.csdevkit) — se usar C#

### Verifique sua configuração:

```bash
python --version    # 3.9+
dotnet --version    # 8.0+
az --version        # 2.60+
git --version
docker --version
```

## Configuração de Recursos Azure

### Passo 1: Crie um grupo de recursos para os labs

```bash
export LOCATION="eastus"
az group create --name rg-ai102-labs --location $LOCATION
```

### Passo 2: Provisione Azure AI Services (recurso multi-serviço)

```bash
az cognitiveservices account create \
  --name ai102-ai-services \
  --resource-group rg-ai102-labs \
  --kind AIServices \
  --sku S0 \
  --location $LOCATION \
  --yes
```

### Passo 3: Configure o Azure OpenAI (se o acesso foi aprovado)

```bash
az cognitiveservices account create \
  --name ai102-openai \
  --resource-group rg-ai102-labs \
  --kind OpenAI \
  --sku S0 \
  --location swedencentral \
  --yes
```

:::warning Acesso ao Azure OpenAI
O Azure OpenAI requer uma solicitação de acesso aprovada. Solicite em [https://aka.ms/oai/access](https://aka.ms/oai/access). A aprovação geralmente leva 1–2 dias úteis. Você pode começar com os Desafios 01–10 enquanto aguarda.
:::

### Passo 4: Salve as variáveis de ambiente

```bash
# Obtenha suas chaves e endpoints
export AZURE_AI_SERVICES_ENDPOINT=$(az cognitiveservices account show \
  --name ai102-ai-services --resource-group rg-ai102-labs \
  --query properties.endpoint -o tsv)

export AZURE_AI_SERVICES_KEY=$(az cognitiveservices account keys list \
  --name ai102-ai-services --resource-group rg-ai102-labs \
  --query key1 -o tsv)

echo "Endpoint: $AZURE_AI_SERVICES_ENDPOINT"
```

## Gerenciamento de Custos

:::warning Custos dos Labs
Os desafios do AI-102 criam recursos faturáveis. Custo total: **$20–50** com limpeza adequada.
:::

| Dica | Detalhes |
|-----|---------|
| **Use tiers gratuitos** | Azure AI Services tem limites gratuitos (20 chamadas/min para muitas APIs) |
| **Exclua após cada desafio** | Cada desafio inclui um script de limpeza — execute-o! |
| **Configure alertas de orçamento** | Crie um alerta de orçamento de $30 no seu grupo de recursos |
| **Use o tier S0** | O tier Standard é pay-per-use — você só paga pelas chamadas feitas |
| **Azure OpenAI** | Serviço mais caro — exclua deployments quando não estiver em uso |

### Configure um alerta de orçamento:

```bash
# Crie um orçamento com alerta por email em 80%
az consumption budget create \
  --budget-name ai102-budget \
  --amount 30 \
  --resource-group rg-ai102-labs \
  --time-grain Monthly \
  --category Cost \
  --start-date 2025-01-01 \
  --end-date 2025-12-31
```

## Solução de Problemas

| Problema | Solução |
|---------|----------|
| "Resource provider not registered" | Execute `az provider register --namespace Microsoft.CognitiveServices` |
| "Azure OpenAI access denied" | Solicite em [aka.ms/oai/access](https://aka.ms/oai/access) — use os Desafios 01–10 enquanto aguarda |
| "Quota exceeded" | Troque de região ou solicite aumento de cota no Portal Azure |
| "Python SDK import errors" | Execute `pip install azure-ai-textanalytics azure-ai-vision-imageanalysis azure-identity` |
| "Region not available" | Use `eastus`, `westus2` ou `swedencentral` (melhor disponibilidade para OpenAI) |
| "Authentication failed" | Execute `az login` novamente, verifique se `az account show` mostra a assinatura correta |
| "Docker permission denied" | Certifique-se de que o Docker Desktop está rodando; no Linux use `sudo usermod -aG docker $USER` |

---

**Configuração completa?** Comece com o [Desafio 01: Selecionar e Provisionar Azure AI Services](/docs/ai-102/plan-manage/challenge-01).
