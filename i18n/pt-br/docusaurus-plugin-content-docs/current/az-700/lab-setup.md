---
sidebar_position: 3
title: "Lab Setup"
---

# Configuração do laboratório

## Requisitos

| Componente | Mínimo |
|------------|--------|
| Assinatura do Azure | Pay-as-you-go ou Conta Gratuita (crédito de $200) |
| Função | Contributor na assinatura |
| Azure CLI | 2.60+ (`az --version`) |
| Azure PowerShell | Az 12.0+ (`Get-InstalledModule Az`) |
| GitHub Codespaces | Opcional — ambiente pré-configurado |

## Início rápido com GitHub Codespaces

A forma mais rápida de começar é usando nosso Codespace pré-configurado:

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1)

O Codespace inclui Azure CLI, módulo PowerShell Az e todas as ferramentas necessárias pré-instaladas.

## Configuração local

```bash
# Instalar Azure CLI (se ainda não estiver instalado)
# https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

# Login no Azure
az login

# Verificar assinatura
az account show --query "{name:name, id:id, state:state}" -o table

# Definir a assinatura (se você tiver múltiplas)
az account set --subscription "<subscription-id>"

# Registrar os provedores de recursos necessários
az provider register --namespace Microsoft.Network --wait
az provider register --namespace Microsoft.Compute --wait
az provider register --namespace Microsoft.Storage --wait
az provider register --namespace Microsoft.OperationalInsights --wait
```

## Convenção de grupo de recursos

Todos os desafios utilizam um padrão de nomenclatura consistente:

```bash
# Criar grupo de recursos para um desafio
az group create --name "rg-az700-challenge-XX" --location "eastus2"
```

:::tip Seleção de região

Use `eastus2` ou `westus2` para todos os desafios — elas possuem disponibilidade completa de serviços de rede, incluindo VPN Gateway, ExpressRoute e Azure Firewall.

:::

## Estratégia de gerenciamento de custos

### Custos estimados por domínio

| Domínio | Custo total estimado | Estratégia |
|---------|---------------------|------------|
| 1. Rede Principal | ~$2–5 | Baixo custo — principalmente VNets, DNS zones, roteamento |
| 2. Conectividade | ~$10–20 | VPN Gateways custam ~$0,19/h — implante, teste e exclua imediatamente |
| 3. Entrega de Aplicações | ~$8–15 | App Gateway e Front Door — use SKU mínimo |
| 4. Acesso Privado | ~$2–5 | Baixo custo — Private Endpoints custam ~$0,01/h |
| 5. Segurança de Rede | ~$10–25 | Azure Firewall é caro — exclua após cada desafio |

### Proteções de custo

```bash
# Definir um alerta de orçamento (recomendado: $50 para toda a série de labs AZ-700)
az consumption budget create \
  --budget-name "az700-labs" \
  --amount 50 \
  --time-grain Monthly \
  --category Cost \
  --resource-group "rg-az700-*"

# Verificar gastos atuais
az consumption usage list \
  --query "[?contains(instanceName, 'az700')].{Name:instanceName, Cost:pretaxCost}" \
  --top 20 -o table
```

### Desafios de ExpressRoute (19–21): modo simulação

:::caution ExpressRoute requer um circuito físico

Os desafios de ExpressRoute são **baseados em simulação**. Você irá:
- Aprender os comandos CLI e parâmetros de configuração
- Revisar as saídas esperadas e verificar sua compreensão
- Praticar com os conceitos de configuração sem implantar circuitos reais

Implantar um circuito ExpressRoute requer um provedor de conectividade e custa $55–$10.000+/mês. Os desafios mostram comandos exatos, saídas esperadas e padrões de configuração para que você domine o material para o exame.

:::

### Recursos caros: implantar → testar → excluir

Para VPN Gateways, Azure Firewall e Application Gateways:

```bash
# Após concluir um desafio, IMEDIATAMENTE exclua o grupo de recursos
az group delete --name "rg-az700-challenge-XX" --yes --no-wait

# Verificar exclusão
az group list --query "[?starts_with(name, 'rg-az700')]" -o table
```

## Limpar todos os recursos do AZ-700

```bash
# Opção nuclear: excluir TODOS os grupos de recursos do AZ-700
for rg in $(az group list --query "[?starts_with(name, 'rg-az700')].name" -o tsv); do
  echo "Excluindo $rg..."
  az group delete --name "$rg" --yes --no-wait
done

echo "Todos os grupos de recursos do AZ-700 foram enfileirados para exclusão"
```

## Pré-requisitos específicos de rede

Alguns desafios requerem condições específicas de rede:

```bash
# Verificar se você pode criar VPN Gateways (checar cota)
az network list-usages --location eastus2 \
  --query "[?contains(name.value, 'VirtualNetworkGateways')].{Name:name.localizedValue, Current:currentValue, Limit:limit}" \
  -o table

# Verificar disponibilidade de IP Público
az network list-usages --location eastus2 \
  --query "[?contains(name.value, 'PublicIPAddresses')].{Name:name.localizedValue, Current:currentValue, Limit:limit}" \
  -o table
```
