---
sidebar_position: 3
title: "Desafio 36: Private Link Service (Lado do Provedor)"
sidebar_label: "Challenge 36"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 36: Private Link Service (lado do provedor)

:::info Tempo e custo estimados

**60-75 minutos** | **~$0,05/h** | **Peso no exame: 10-15%**

:::

## Cenário

A NovaTech Solutions, uma empresa ISV, construiu uma plataforma de API interna atrás de um Azure Standard Load Balancer. Eles desejam oferecer esse serviço de API a clientes externos (consumidores) usando o Azure Private Link, para que os consumidores possam acessar o serviço da NovaTech por meio de um private endpoint em suas próprias redes virtuais, sem qualquer exposição Ã  internet pública. Você é o engenheiro de rede responsável por configurar o Private Link Service do lado do provedor, gerenciar endereços IP NAT, configurar políticas de visibilidade e aprovação automática, e lidar com aprovações de conexão de consumidores.

**Arquitetura:**

```text
    PROVIDER (NovaTech VNet: 10.0.0.0/16)            CONSUMER (Customer VNet: 10.1.0.0/16)
    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”            â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
    â”‚                                    â”‚            â”‚                            â”‚
    â”‚  snet-backend (10.0.1.0/24)        â”‚            â”‚  snet-consumer (10.1.1.0/24)â”‚
    â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”         â”‚            â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”           â”‚
    â”‚  â”‚  VM-1   â”‚  â”‚  VM-2   â”‚         â”‚            â”‚  â”‚ consumer-vm  â”‚           â”‚
    â”‚  â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”˜         â”‚            â”‚  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜           â”‚
    â”‚       â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜              â”‚            â”‚         â”‚                   â”‚
    â”‚              v                     â”‚            â”‚         v                   â”‚
    â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”           â”‚            â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”         â”‚
    â”‚  â”‚ Standard ILB        â”‚           â”‚            â”‚  â”‚  PE to PLS     â”‚         â”‚
    â”‚  â”‚ frontend: 10.0.0.4  â”‚           â”‚            â”‚  â”‚  (10.1.1.5)    â”‚         â”‚
    â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜           â”‚            â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â”‚
    â”‚             v                      â”‚            â”‚          â”‚                  â”‚
    â”‚  snet-pls (10.0.2.0/24)           â”‚            â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
    â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”‚                       â”‚
    â”‚  â”‚ Private Link Service    â”‚â—„â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
    â”‚  â”‚ NAT IP: 10.0.2.4       â”‚       â”‚         Private Link connection
    â”‚  â”‚ Alias: pls-novatech... â”‚       â”‚
    â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â”‚
    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## Objetivos de aprendizagem

Após concluir este desafio, você será capaz de:

- Criar um Private Link Service (PLS) vinculado a um Standard Load Balancer
- Configurar endereços IP NAT para SNAT do tráfego de consumidores de entrada
- Desabilitar políticas de rede na sub-rede do PLS (necessário para a implantação do PLS)
- Definir restrições de visibilidade para controlar quais assinaturas podem descobrir o serviço
- Configurar aprovação automática para assinaturas de consumidores confiáveis
- Recuperar o alias do PLS para compartilhamento com consumidores
- Aprovar ou rejeitar conexões de private endpoint de consumidores
- Entender o fluxo de trabalho e responsabilidades do provedor versus consumidor

## Pré-requisitos

- Uma assinatura do Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- PowerShell com módulo Az instalado (`Install-Module Az -Force`)
- Entendimento do Azure Standard Load Balancer (interno)

## Conceitos-chave para o AZ-700

| Conceito | Detalhe |
|----------|---------|
| Private Link Service (PLS) | Recurso do lado do provedor que expõe um serviço atrás de um Standard LB via Private Link |
| Configuração de IP NAT | O PLS realiza SNAT; o IP NAT é o IP de origem visto pelo backend para tráfego de consumidores |
| Standard Load Balancer | O PLS requer SKU Standard (Basic LB não é suportado) |
| Alias | Um identificador globalmente exclusivo e anonimizado para o PLS que os consumidores usam para criar seu PE |
| Visibilidade | Controla quais assinaturas podem descobrir e se conectar ao PLS (vazio = todas, especificado = restrito) |
| Aprovação automática | Assinaturas nesta lista têm conexões aprovadas automaticamente (subconjunto da visibilidade) |
| Estados de conexão | Pending (aguardando aprovação), Approved (ativa), Rejected (negada), Removed (excluída) |
| Políticas de rede | Devem ser desabilitadas na sub-rede do PLS (`privateLinkServiceNetworkPolicies = Disabled`) |

### Responsabilidades do provedor versus consumidor

| Etapa | Provedor (proprietário do serviço) | Consumidor (cliente) |
|-------|-------------------------------------|----------------------|
| 1 | Implanta Standard LB com pool de backend | - |
| 2 | Cria PLS vinculado ao frontend do LB | - |
| 3 | Compartilha alias ou ID do recurso com o consumidor | Recebe o alias |
| 4 | - | Cria PE direcionado ao alias |
| 5 | Aprova a conexão do PE (ou aprovação automática) | Aguarda aprovação |
| 6 | Tráfego flui: PE do consumidor -> NAT do PLS -> LB -> backend | Acessa o serviço via IP privado |

:::tip Nota de exame

O exame testa a distinção entre Private Link Service (provedor cria, vinculado ao LB) e Private Endpoint (consumidor cria, obtém IP privado em sua VNet). Lembre-se de que o PLS requer um Standard LB -- esta é uma pergunta armadilha comum.

:::

---

## Tarefa 1: Criar a infraestrutura do provedor

### Azure CLI

```bash
# Create resource group
az group create \
    --name rg-pls-provider \
    --location eastus2

# Create provider VNet
az network vnet create \
    --resource-group rg-pls-provider \
    --name vnet-provider \
    --location eastus2 \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name snet-backend \
    --subnet-prefixes 10.0.1.0/24

# Create PLS subnet (will host the Private Link Service)
az network vnet subnet create \
    --resource-group rg-pls-provider \
    --vnet-name vnet-provider \
    --name snet-pls \
    --address-prefixes 10.0.2.0/24
```

### Azure PowerShell

```powershell
New-AzResourceGroup -Name "rg-pls-provider" -Location "eastus2"

$snetBackend = New-AzVirtualNetworkSubnetConfig `
    -Name "snet-backend" `
    -AddressPrefix "10.0.1.0/24"

$snetPls = New-AzVirtualNetworkSubnetConfig `
    -Name "snet-pls" `
    -AddressPrefix "10.0.2.0/24"

New-AzVirtualNetwork `
    -ResourceGroupName "rg-pls-provider" `
    -Name "vnet-provider" `
    -Location "eastus2" `
    -AddressPrefix "10.0.0.0/16" `
    -Subnet $snetBackend, $snetPls
```

---

## Tarefa 2: Implantar o Standard Internal Load Balancer

### Azure CLI

```bash
# Create Standard internal LB
az network lb create \
    --resource-group rg-pls-provider \
    --name lb-api-internal \
    --sku Standard \
    --vnet-name vnet-provider \
    --subnet snet-backend \
    --frontend-ip-name frontend-api \
    --backend-pool-name backend-pool

# Create health probe
az network lb probe create \
    --resource-group rg-pls-provider \
    --lb-name lb-api-internal \
    --name probe-http \
    --protocol Tcp \
    --port 80

# Create load balancer rule
az network lb rule create \
    --resource-group rg-pls-provider \
    --lb-name lb-api-internal \
    --name rule-http \
    --protocol Tcp \
    --frontend-port 80 \
    --backend-port 80 \
    --frontend-ip-name frontend-api \
    --backend-pool-name backend-pool \
    --probe-name probe-http \
    --idle-timeout 15 \
    --enable-tcp-reset true
```

### Azure PowerShell

```powershell
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-pls-provider" -Name "vnet-provider"
$backendSubnet = $vnet.Subnets | Where-Object { $_.Name -eq "snet-backend" }

# Create frontend IP configuration (internal)
$feIp = New-AzLoadBalancerFrontendIpConfig `
    -Name "frontend-api" `
    -SubnetId $backendSubnet.Id

# Create backend pool
$bePool = New-AzLoadBalancerBackendAddressPoolConfig -Name "backend-pool"

# Create probe
$probe = New-AzLoadBalancerProbeConfig `
    -Name "probe-http" `
    -Protocol Tcp `
    -Port 80 `
    -IntervalInSeconds 15 `
    -ProbeCount 2

# Create rule
$rule = New-AzLoadBalancerRuleConfig `
    -Name "rule-http" `
    -FrontendIpConfigurationId $feIp.Id `
    -BackendAddressPoolId $bePool.Id `
    -ProbeId $probe.Id `
    -Protocol Tcp `
    -FrontendPort 80 `
    -BackendPort 80 `
    -IdleTimeoutInMinutes 15 `
    -EnableTcpReset

# Create the Standard ILB
New-AzLoadBalancer `
    -ResourceGroupName "rg-pls-provider" `
    -Name "lb-api-internal" `
    -Location "eastus2" `
    -Sku "Standard" `
    -FrontendIpConfiguration $feIp `
    -BackendAddressPool $bePool `
    -Probe $probe `
    -LoadBalancingRule $rule
```

---

## Tarefa 3: Desabilitar políticas de rede na sub-rede do PLS

O Private Link Service requer que as políticas de rede sejam desabilitadas na sub-rede onde ele é implantado. Esta é uma configuração diferente das políticas de rede do private endpoint.

### Azure CLI

```bash
# Disable private link service network policies on the PLS subnet
az network vnet subnet update \
    --resource-group rg-pls-provider \
    --vnet-name vnet-provider \
    --name snet-pls \
    --private-link-service-network-policies Disabled
```

### Azure PowerShell

```powershell
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-pls-provider" -Name "vnet-provider"

Set-AzVirtualNetworkSubnetConfig `
    -Name "snet-pls" `
    -VirtualNetwork $vnet `
    -AddressPrefix "10.0.2.0/24" `
    -PrivateLinkServiceNetworkPoliciesFlag "Disabled"

$vnet | Set-AzVirtualNetwork
```

:::warning Configuração obrigatória

Diferente das políticas de rede do private endpoint (que desabilitam a aplicação de NSG no tráfego do PE), a política de sub-rede do PLS controla se um Private Link Service pode ser implantado na sub-rede. Sem desabilitar esta política, a criação do PLS falhará. Este é um parâmetro CLI diferente: `--private-link-service-network-policies` (não `--disable-private-endpoint-network-policies`).

:::

---

## Tarefa 4: Criar o Private Link Service

### Azure CLI

```bash
# Create Private Link Service linked to the LB frontend
az network private-link-service create \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --vnet-name vnet-provider \
    --subnet snet-pls \
    --lb-name lb-api-internal \
    --lb-frontend-ip-configs frontend-api \
    --location eastus2

# Retrieve the PLS alias (share this with consumers)
az network private-link-service show \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --query "alias" \
    --output tsv
```

### Azure PowerShell

```powershell
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-pls-provider" -Name "vnet-provider"
$plsSubnet = $vnet.Subnets | Where-Object { $_.Name -eq "snet-pls" }

$lb = Get-AzLoadBalancer -ResourceGroupName "rg-pls-provider" -Name "lb-api-internal"
$feConfig = $lb.FrontendIpConfigurations | Where-Object { $_.Name -eq "frontend-api" }

# Create NAT IP configuration for PLS
$natIpConfig = New-AzPrivateLinkServiceIpConfig `
    -Name "nat-ip-config" `
    -Subnet $plsSubnet `
    -PrivateIpAddressVersion "IPv4" `
    -Primary

# Create the Private Link Service
$pls = New-AzPrivateLinkService `
    -ResourceGroupName "rg-pls-provider" `
    -Name "pls-novatech-api" `
    -Location "eastus2" `
    -IpConfiguration $natIpConfig `
    -LoadBalancerFrontendIpConfiguration $feConfig

# Get the alias
$pls.Alias
```

---

## Tarefa 5: Configurar visibilidade e aprovação automática

### Azure CLI

```bash
# Set visibility to specific consumer subscriptions
# Only these subscriptions can discover and connect to the PLS
az network private-link-service update \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --visibility "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"

# Set auto-approval for trusted consumer subscriptions
# Connections from these subscriptions are approved automatically
az network private-link-service update \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --auto-approval "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Azure PowerShell

```powershell
$pls = Get-AzPrivateLinkService `
    -ResourceGroupName "rg-pls-provider" `
    -Name "pls-novatech-api"

# Update visibility (subscriptions that can see and connect)
$pls.Visibility = @{
    Subscriptions = @(
        "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    )
}

# Update auto-approval (subset of visibility)
$pls.AutoApproval = @{
    Subscriptions = @(
        "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    )
}

Set-AzPrivateLinkService -InputObject $pls
```

:::note Visibilidade vs aprovação automática

- **Visibilidade** controla quais assinaturas podem descobrir o PLS e criar uma conexão PE com ele. Se vazio, todas as assinaturas podem se conectar. Se especificado, apenas as assinaturas listadas podem se conectar.
- **Aprovação automática** é sempre um subconjunto da visibilidade. Assinaturas listadas têm suas conexões aprovadas automaticamente sem intervenção do provedor.
- Uma assinatura na visibilidade, mas NÃƒO na aprovação automática, terá sua conexão no estado Pending até ser aprovada manualmente.

:::

---

## Tarefa 6: Consumidor cria um private endpoint (simulado)

Isto simula o lado do consumidor. Em produção, o consumidor estaria em uma assinatura diferente.

### Azure CLI

```bash
# Create consumer resource group and VNet
az group create --name rg-pls-consumer --location eastus2

az network vnet create \
    --resource-group rg-pls-consumer \
    --name vnet-consumer \
    --location eastus2 \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name snet-consumer \
    --subnet-prefixes 10.1.1.0/24

# Get the PLS resource ID
PLS_ID=$(az network private-link-service show \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --query id \
    --output tsv)

# Consumer creates PE targeting the PLS
az network private-endpoint create \
    --resource-group rg-pls-consumer \
    --name pe-to-novatech \
    --vnet-name vnet-consumer \
    --subnet snet-consumer \
    --private-connection-resource-id $PLS_ID \
    --connection-name connection-novatech \
    --location eastus2
```

### Azure PowerShell

```powershell
New-AzResourceGroup -Name "rg-pls-consumer" -Location "eastus2"

$snet = New-AzVirtualNetworkSubnetConfig -Name "snet-consumer" -AddressPrefix "10.1.1.0/24"
$vnet = New-AzVirtualNetwork `
    -ResourceGroupName "rg-pls-consumer" `
    -Name "vnet-consumer" `
    -Location "eastus2" `
    -AddressPrefix "10.1.0.0/16" `
    -Subnet $snet

$pls = Get-AzPrivateLinkService `
    -ResourceGroupName "rg-pls-provider" `
    -Name "pls-novatech-api"

$plsConnection = New-AzPrivateLinkServiceConnection `
    -Name "connection-novatech" `
    -PrivateLinkServiceId $pls.Id `
    -RequestMessage "Please approve access for CustomerCo"

$subnet = $vnet.Subnets | Where-Object { $_.Name -eq "snet-consumer" }

New-AzPrivateEndpoint `
    -ResourceGroupName "rg-pls-consumer" `
    -Name "pe-to-novatech" `
    -Location "eastus2" `
    -Subnet $subnet `
    -PrivateLinkServiceConnection $plsConnection
```

---

## Tarefa 7: Provedor aprova a conexão

### Azure CLI

```bash
# List pending connections on the PLS
az network private-link-service connection list \
    --resource-group rg-pls-provider \
    --service-name pls-novatech-api \
    --output table

# Approve the pending connection
az network private-link-service connection update \
    --resource-group rg-pls-provider \
    --service-name pls-novatech-api \
    --name connection-novatech \
    --connection-status Approved \
    --description "Approved for CustomerCo production access"
```

### Azure PowerShell

```powershell
# Get the PLS and list connections
$pls = Get-AzPrivateLinkService `
    -ResourceGroupName "rg-pls-provider" `
    -Name "pls-novatech-api"

$pls.PrivateEndpointConnections | Format-Table Name, PrivateLinkServiceConnectionState

# Approve the connection
Approve-AzPrivateEndpointConnection `
    -ResourceGroupName "rg-pls-provider" `
    -ServiceName "pls-novatech-api" `
    -Name $pls.PrivateEndpointConnections[0].Name `
    -PrivateLinkResourceType "Microsoft.Network/privateLinkServices" `
    -Description "Approved for CustomerCo"
```

### Portal

1. Navegue até **Private Link** no portal
2. Selecione **Private link services** e escolha `pls-novatech-api`
3. Vá para **Private endpoint connections**
4. Selecione a conexão pendente e clique em **Approve**
5. Forneça uma descrição e confirme

---

## Cenários de quebra e correção

### Cenário 1: Criação do PLS falha - Load Balancer SKU Basic

**Sintoma:** `az network private-link-service create` retorna um erro indicando que o load balancer não é compatível.

**Diagnóstico:**

```bash
# Check the LB SKU
az network lb show \
    --resource-group rg-pls-provider \
    --name lb-api-internal \
    --query "sku.name" \
    --output tsv
```

**Causa raiz:** O Private Link Service requer um Standard SKU Load Balancer. Basic LB não é suportado.

**Correção:** Recrie o load balancer com SKU Standard:

```bash
# Delete the Basic LB
az network lb delete \
    --resource-group rg-pls-provider \
    --name lb-api-internal

# Recreate with Standard SKU
az network lb create \
    --resource-group rg-pls-provider \
    --name lb-api-internal \
    --sku Standard \
    --vnet-name vnet-provider \
    --subnet snet-backend \
    --frontend-ip-name frontend-api \
    --backend-pool-name backend-pool
```

---

### Cenário 2: PE do consumidor rejeitado - assinatura não está na lista de visibilidade

**Sintoma:** O consumidor cria um PE mas o estado da conexão mostra imediatamente `Rejected` ou a criação falha com um erro de acesso.

**Diagnóstico:**

```bash
# Check PLS visibility settings (provider side)
az network private-link-service show \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --query "visibility.subscriptions" \
    --output tsv

# Check consumer's subscription ID
az account show --query "id" --output tsv
```

**Causa raiz:** O PLS possui uma lista de visibilidade configurada, e a assinatura do consumidor não está nela.

**Correção (lado do provedor):**

```bash
# Add the consumer's subscription to the visibility list
az network private-link-service update \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --visibility "existing-sub-id" "new-consumer-sub-id"
```

---

### Cenário 3: Exaustão de IP NAT

**Sintoma:** Novas conexões de consumidores são bem-sucedidas, mas relatam falhas de conectividade intermitentes. Conexões existentes podem cair sob carga.

**Diagnóstico:**

```bash
# Check current NAT IP configurations
az network private-link-service show \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --query "ipConfigurations" \
    --output table

# Check number of active connections
az network private-link-service connection list \
    --resource-group rg-pls-provider \
    --service-name pls-novatech-api \
    --query "length(@)"
```

**Causa raiz:** Cada IP NAT suporta aproximadamente 64.000 conexões simultâneas (exaustão de portas). Com muitos consumidores ou contagens de conexão altas, um único IP NAT pode ser insuficiente.

**Correção:** Adicione configurações de IP NAT adicionais:

```bash
# Add a secondary NAT IP to the PLS
az network private-link-service update \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --ip-configs name=nat-ip-secondary subnet=snet-pls private-ip-address="" private-ip-address-version=IPv4
```

```powershell
$pls = Get-AzPrivateLinkService `
    -ResourceGroupName "rg-pls-provider" `
    -Name "pls-novatech-api"

$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-pls-provider" -Name "vnet-provider"
$plsSubnet = $vnet.Subnets | Where-Object { $_.Name -eq "snet-pls" }

$newNatIp = New-AzPrivateLinkServiceIpConfig `
    -Name "nat-ip-secondary" `
    -Subnet $plsSubnet `
    -PrivateIpAddressVersion "IPv4"

$pls.IpConfigurations += $newNatIp
Set-AzPrivateLinkService -InputObject $pls
```

---

### Cenário 4: Políticas de rede não desabilitadas na sub-rede do PLS

**Sintoma:** A criação do PLS falha com um erro sobre políticas de rede.

**Diagnóstico:**

```bash
az network vnet subnet show \
    --resource-group rg-pls-provider \
    --vnet-name vnet-provider \
    --name snet-pls \
    --query "privateLinkServiceNetworkPolicies" \
    --output tsv
```

**Causa raiz:** A sub-rede ainda possui `privateLinkServiceNetworkPolicies` definido como `Enabled`.

**Correção:**

```bash
az network vnet subnet update \
    --resource-group rg-pls-provider \
    --vnet-name vnet-provider \
    --name snet-pls \
    --private-link-service-network-policies Disabled
```

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-36-q1",
    question: "Qual SKU de load balancer é necessário para o Azure Private Link Service?",
    options: [
      "Basic",
      "Standard ✅",
      "Gateway",
      "Qualquer SKU é suportado"
    ],
    correctIndex: 1,
    explanation: "O Private Link Service requer um Load Balancer com SKU Standard (interno ou público). O SKU Basic não é suportado. Isso ocorre porque o PLS depende dos recursos do Standard LB para alta disponibilidade e redundância de zona."
  },
  {
    id: "az700-36-q2",
    question: "Um consumidor cria um private endpoint para seu Private Link Service, mas o status da conexão mostra 'Pending'. A assinatura do consumidor ESTÁ na lista de visibilidade, mas NÃO está na aprovação automática. O que deve acontecer?",
    options: [
      "O consumidor deve atualizar sua assinatura",
      "O provedor deve aprovar manualmente a conexão ✅",
      "O PLS deve ser reiniciado",
      "O consumidor deve recriar o PE com --manual-request false"
    ],
    correctIndex: 1,
    explanation: "Quando a assinatura de um consumidor está na lista de visibilidade (pode conectar), mas não na lista de aprovação automática, a conexão entra no estado Pending. O provedor (proprietário do serviço) deve aprovar manualmente a conexão antes que o tráfego possa fluir."
  },
  {
    id: "az700-36-q3",
    question: "Qual é a relação entre visibilidade e aprovação automática em um Private Link Service?",
    options: [
      "São configurações independentes sem relação",
      "A aprovação automática deve ser um subconjunto da lista de visibilidade ✅",
      "A visibilidade deve ser um subconjunto da aprovação automática",
      "A aprovação automática substitui a visibilidade quando configurada"
    ],
    correctIndex: 1,
    explanation: "A aprovação automática é sempre um subconjunto da visibilidade. Uma assinatura deve primeiro estar visível (autorizada a conectar) antes de poder ser aprovada automaticamente. Se a aprovação automática listar uma assinatura que não está na visibilidade, essa assinatura ainda não poderá se conectar."
  },
  {
    id: "az700-36-q4",
    question: "Qual configuração no nível da sub-rede deve ser definida antes de implantar um Private Link Service?",
    options: [
      "--disable-private-endpoint-network-policies true",
      "--private-link-service-network-policies Disabled ✅",
      "--enable-private-link true",
      "--network-security-group none"
    ],
    correctIndex: 1,
    explanation: "A sub-rede do PLS requer que privateLinkServiceNetworkPolicies esteja como Disabled. Esta é uma configuração diferente das políticas de rede do private endpoint. Sem isso, a implantação do PLS falha. O parâmetro da CLI é --private-link-service-network-policies Disabled."
  },
  {
    id: "az700-36-q5",
    question: "Qual é a finalidade da configuração de NAT IP em um Private Link Service?",
    options: [
      "Fornece o IP público para os consumidores se conectarem",
      "Realiza source NAT para que os servidores backend vejam o NAT IP como a origem do tráfego do consumidor ✅",
      "Atribui um nome DNS ao PLS",
      "Roteia o tráfego do PLS para a internet"
    ],
    correctIndex: 1,
    explanation: "O NAT IP realiza tradução de endereço de rede de origem (SNAT) no tráfego do consumidor. Os servidores backend atrás do LB veem o NAT IP como endereço de origem, não o IP privado do consumidor. Isso previne conflitos de IP entre os espaços de endereçamento do provedor e do consumidor."
  },
  {
    id: "az700-36-q6",
    question: "Um alias de PLS se parece com 'pls-novatech-api.abc123.eastus2.azure.privatelinkservice'. Qual é o benefício de usar o alias em vez do resource ID ao compartilhar com consumidores?",
    options: [
      "O alias fornece velocidades de conexão mais rápidas",
      "O alias oculta os detalhes de assinatura e grupo de recursos do provedor para privacidade ✅",
      "O alias habilita a resolução DNS automaticamente",
      "O alias é necessário para conexões entre regiões"
    ],
    correctIndex: 1,
    explanation: "O alias é uma string globalmente única e anonimizada que oculta os detalhes internos do Azure do provedor (ID da assinatura, nome do grupo de recursos, etc.). Os consumidores podem usar o alias para criar seu PE sem conhecer a topologia Azure do provedor. O resource ID exporia esses detalhes."
  }
]} />

---

## Limpeza

Remova todos os recursos criados neste desafio para interromper a cobrança:

```bash
# Delete both provider and consumer resource groups
az group delete --name rg-pls-provider --yes --no-wait
az group delete --name rg-pls-consumer --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-pls-provider" -Force -AsJob
Remove-AzResourceGroup -Name "rg-pls-consumer" -Force -AsJob
```

:::danger Aviso de custo

Este desafio implanta um Standard Load Balancer (~$0,025/h) e um Private Link Service (~$0,01/h). Se você também implantou VMs de backend para testes, elas geram cobranças adicionais. Exclua ambos os grupos de recursos imediatamente após concluir o laboratório. O custo total estimado é de aproximadamente $0,05/h sem VMs.

:::

---

## Referências adicionais

- [What is Azure Private Link Service?](https://learn.microsoft.com/en-us/azure/private-link/private-link-service-overview)
- [Create a Private Link Service - Azure CLI](https://learn.microsoft.com/en-us/azure/private-link/create-private-link-service-cli)
- [Manage Private Link Service connections](https://learn.microsoft.com/en-us/azure/private-link/private-link-service-overview#control-service-access)
- [Private Link Service properties (visibility, auto-approval, NAT)](https://learn.microsoft.com/en-us/azure/private-link/private-link-service-overview#properties)
- [Disable network policies for Private Link Service](https://learn.microsoft.com/en-us/azure/private-link/disable-private-link-service-network-policy)
