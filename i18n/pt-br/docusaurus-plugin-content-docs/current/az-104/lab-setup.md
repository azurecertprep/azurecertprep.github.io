---
sidebar_position: 3
title: "Lab Setup"
---

# ConfiguraÃ§Ã£o do laboratÃ³rio

Todo desafio requer uma assinatura do Azure e ferramentas de linha de comando. Esta pÃ¡gina orienta vocÃª em ambas as opÃ§Ãµes de configuraÃ§Ã£o.

## OpÃ§Ã£o 1: GitHub Codespaces (Recomendado)

A maneira mais rÃ¡pida de comeÃ§ar | tudo jÃ¡ vem prÃ©-instalado.

[![Open in GitHub Codespaces](https://img.shields.io/badge/Open_in_GitHub_Codespaces-181717?style=for-the-badge&logo=github&logoColor=white)](https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1)

Seu Codespace vem prÃ©-configurado com:
- **Azure CLI** (mais recente) com suporte a Bicep
- **Azure PowerShell** (mÃ³dulo Az)
- **jq** e **yq** para manipulaÃ§Ã£o de JSON/YAML
- **Git** e **GitHub CLI**

> Contas GitHub Free oferecem **60 horas/mÃªs** de Codespaces | mais que suficiente para completar todos os desafios.

### ApÃ³s abrir o Codespaces, faÃ§a login no Azure:

```bash
# Login to Azure (opens a browser window)
az login --use-device-code

# Verify your subscription
az account show --output table

# Set your default subscription (if you have multiple)
az account set --subscription "YOUR_SUBSCRIPTION_NAME"
```

## OpÃ§Ã£o 2: configuraÃ§Ã£o local

Se vocÃª preferir trabalhar localmente, instale estas ferramentas:

| Ferramenta | Comando de InstalaÃ§Ã£o | Finalidade |
|------------|----------------------|------------|
| Azure CLI | [Guia de instalaÃ§Ã£o](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) | Ferramenta CLI principal |
| Bicep | `az bicep install` | Infraestrutura como CÃ³digo |
| PowerShell 7+ | [Guia de instalaÃ§Ã£o](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell) | CLI alternativa |
| MÃ³dulo Az PowerShell | `Install-Module -Name Az -Force` | Cmdlets Azure PowerShell |
| jq | [Guia de instalaÃ§Ã£o](https://jqlang.github.io/jq/download/) | Processamento de JSON |

### Verifique sua configuraÃ§Ã£o:

```bash
az --version
az bicep version
pwsh --version
jq --version
```

## Assinatura do Azure

VocÃª precisa de uma assinatura do Azure para todos os desafios, exceto o Desafio 07 (ARM/Bicep pode ser validado localmente).

### OpÃ§Ãµes gratuitas

| OpÃ§Ã£o | CrÃ©dito | DuraÃ§Ã£o | CartÃ£o de CrÃ©dito NecessÃ¡rio? |
|-------|---------|---------|-------------------------------|
| [Conta Gratuita do Azure](https://azure.microsoft.com/free/) | $200 | 30 dias | Sim (nÃ£o Ã© cobrado) |
| [Azure para Estudantes](https://azure.microsoft.com/free/students/) | $100 | 12 meses | NÃ£o |
| [Assinatura Visual Studio](https://azure.microsoft.com/pricing/member-offers/credit-for-visual-studio-subscribers/) | $50-150/mÃªs | Mensal | Depende do plano |

:::warning AtenÃ§Ã£o

Gerenciamento de custos | Todos os desafios incluem scripts de limpeza. **Sempre execute a limpeza apÃ³s cada desafio** para evitar cobranÃ§as inesperadas. O custo total para todos os 28 desafios Ã© estimado em ~$5 com a limpeza adequada.

:::
## ConvenÃ§Ã£o de nomenclatura de recursos

Usamos uma convenÃ§Ã£o de nomenclatura consistente em todos os desafios:

```text
rg-az104-challenge-XX        # Resource group per challenge
staz104chXXxxxx               # Storage accounts (globally unique)
vm-az104-XX                   # Virtual machines
vnet-az104-XX                 # Virtual networks
```

## Script de configuraÃ§Ã£o rÃ¡pida

Execute isto uma vez para configurar variÃ¡veis comuns usadas em todos os desafios:

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

**ConfiguraÃ§Ã£o completa?** Comece com o [Desafio 01: UsuÃ¡rios e Grupos do Entra ID](/docs/az-104/identity/challenge-01).
