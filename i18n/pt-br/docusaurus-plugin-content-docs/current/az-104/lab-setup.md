---
sidebar_position: 3
title: "Lab Setup"
---

# Configuração do Laboratório

Todo desafio requer uma assinatura do Azure e ferramentas de linha de comando. Esta página orienta você em ambas as opções de configuração.

## Opção 1: GitHub Codespaces (Recomendado)

A maneira mais rápida de começar | tudo já vem pré-instalado.

[![Open in GitHub Codespaces](https://img.shields.io/badge/Open_in_GitHub_Codespaces-181717?style=for-the-badge&logo=github&logoColor=white)](https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1)

Seu Codespace vem pré-configurado com:
- **Azure CLI** (mais recente) com suporte a Bicep
- **Azure PowerShell** (módulo Az)
- **jq** e **yq** para manipulação de JSON/YAML
- **Git** e **GitHub CLI**

> Contas GitHub Free oferecem **60 horas/mês** de Codespaces | mais que suficiente para completar todos os desafios.

### Após abrir o Codespaces, faça login no Azure:

```bash
# Login to Azure (opens a browser window)
az login --use-device-code

# Verify your subscription
az account show --output table

# Set your default subscription (if you have multiple)
az account set --subscription "YOUR_SUBSCRIPTION_NAME"
```

## Opção 2: Configuração Local

Se você preferir trabalhar localmente, instale estas ferramentas:

| Ferramenta | Comando de Instalação | Finalidade |
|------------|----------------------|------------|
| Azure CLI | [Guia de instalação](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) | Ferramenta CLI principal |
| Bicep | `az bicep install` | Infraestrutura como Código |
| PowerShell 7+ | [Guia de instalação](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell) | CLI alternativa |
| Módulo Az PowerShell | `Install-Module -Name Az -Force` | Cmdlets Azure PowerShell |
| jq | [Guia de instalação](https://jqlang.github.io/jq/download/) | Processamento de JSON |

### Verifique sua configuração:

```bash
az --version
az bicep version
pwsh --version
jq --version
```

## Assinatura do Azure

Você precisa de uma assinatura do Azure para todos os desafios, exceto o Desafio 07 (ARM/Bicep pode ser validado localmente).

### Opções Gratuitas

| Opção | Crédito | Duração | Cartão de Crédito Necessário? |
|-------|---------|---------|-------------------------------|
| [Conta Gratuita do Azure](https://azure.microsoft.com/free/) | $200 | 30 dias | Sim (não é cobrado) |
| [Azure para Estudantes](https://azure.microsoft.com/free/students/) | $100 | 12 meses | Não |
| [Assinatura Visual Studio](https://azure.microsoft.com/pricing/member-offers/credit-for-visual-studio-subscribers/) | $50-150/mês | Mensal | Depende do plano |

:::warning Atenção

Gerenciamento de custos | Todos os desafios incluem scripts de limpeza. **Sempre execute a limpeza após cada desafio** para evitar cobranças inesperadas. O custo total para todos os 28 desafios é estimado em ~$5 com a limpeza adequada.

:::
## Convenção de Nomenclatura de Recursos

Usamos uma convenção de nomenclatura consistente em todos os desafios:

```
rg-az104-challenge-XX        # Resource group per challenge
staz104chXXxxxx               # Storage accounts (globally unique)
vm-az104-XX                   # Virtual machines
vnet-az104-XX                 # Virtual networks
```

## Script de Configuração Rápida

Execute isto uma vez para configurar variáveis comuns usadas em todos os desafios:

```bash
# Set your preferred region
export LOCATION="eastus"

# Create a base resource group for shared resources
az group create --name rg-az104-shared --location $LOCATION

# Verify
az group list --output table
```

:::tip Dica

Equivalente em PowerShell:
```powershell
$Location = "eastus"
New-AzResourceGroup -Name "rg-az104-shared" -Location $Location
Get-AzResourceGroup | Format-Table
```

:::
---

**Configuração completa?** Comece com o [Desafio 01: Usuários e Grupos do Entra ID](/docs/az-104/identity/challenge-01).
