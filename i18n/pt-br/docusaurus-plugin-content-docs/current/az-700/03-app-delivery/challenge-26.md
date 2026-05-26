---
sidebar_position: 2
sidebar_label: "Challenge 26"
title: "Desafio 26: Cenários Avançados de Load Balancer"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 26: Cenários avançados do Load Balancer

:::info Tempo e custo estimados
**60-90 minutos** | **~$0.06/h** (Load Balancer entre regiões + LBs regionais) | **Peso no exame: 10-15%**
:::

## Cenário

A Fabrikam Global Services opera em três regiões (East US, West Europe, Southeast Asia) e precisa de balanceamento de carga entre regiões para recuperação de desastres. Quando uma região inteira fica indisponível, o tráfego deve ser automaticamente redirecionado para as regiões saudáveis restantes. Além disso, a Fabrikam implanta appliances virtuais de rede (NVAs) para inspeção de pacotes e requer o Gateway Load Balancer para encadear NVAs de forma transparente no caminho dos dados. A equipe de segurança também exige controle explícito sobre o SNAT de saída para evitar exaustão de portas durante períodos de pico de tráfego.

Seu trabalho é implantar um balanceador de carga entre regiões (camada global), configurar um Gateway Load Balancer para encadeamento de NVA, configurar regras de saída com portas SNAT alocadas e configurar uma regra de portas HA para um balanceador de carga interno.

## Habilidades do exame abordadas

| Habilidade | Peso |
|------------|------|
| Configurar um balanceador de carga entre regiões (global) | Médio |
| Configurar Gateway Load Balancer para encadeamento de NVA | Médio |
| Configurar regras de saída e alocação de portas SNAT | Alto |
| Configurar regras de portas HA | Médio |
| Compreender exaustão de SNAT e estratégias de mitigação | Alto |

## Pré-requisitos

- Assinatura do Azure com função de Colaborador
- Azure CLI 2.60+ ou Azure PowerShell Az 12.0+
- Familiaridade com o Challenge 25 (noções básicas do Standard Load Balancer)
- Compreensão dos conceitos de NVA e fluxos de tráfego de rede

## Tarefa 1: Criar balanceadores de carga regionais como back-ends

Antes de criar o LB entre regiões, implante dois Standard Load Balancers regionais que servirão como back-ends.

### Azure CLI

```bash
# Set variables
RG="rg-fabrikam-global-lb"
LOCATION1="eastus"
LOCATION2="westeurope"

# Create resource group
az group create --name $RG --location $LOCATION1

# --- Regional LB: East US ---
az network public-ip create \
  --resource-group $RG \
  --name pip-lb-eastus \
  --sku Standard \
  --allocation-method Static \
  --location $LOCATION1 \
  --zone 1 2 3

az network lb create \
  --resource-group $RG \
  --name lb-regional-eastus \
  --sku Standard \
  --location $LOCATION1 \
  --frontend-ip-name fe-eastus \
  --public-ip-address pip-lb-eastus \
  --backend-pool-name bp-eastus

az network lb probe create \
  --resource-group $RG \
  --lb-name lb-regional-eastus \
  --name probe-http \
  --protocol Http \
  --port 80 \
  --path "/health" \
  --interval 5 \
  --probe-threshold 2

az network lb rule create \
  --resource-group $RG \
  --lb-name lb-regional-eastus \
  --name rule-http \
  --protocol Tcp \
  --frontend-port 80 \
  --backend-port 80 \
  --frontend-ip-name fe-eastus \
  --backend-pool-name bp-eastus \
  --probe-name probe-http \
  --enable-tcp-reset true

# --- Regional LB: West Europe ---
az network public-ip create \
  --resource-group $RG \
  --name pip-lb-westeurope \
  --sku Standard \
  --allocation-method Static \
  --location $LOCATION2 \
  --zone 1 2 3

az network lb create \
  --resource-group $RG \
  --name lb-regional-westeurope \
  --sku Standard \
  --location $LOCATION2 \
  --frontend-ip-name fe-westeurope \
  --public-ip-address pip-lb-westeurope \
  --backend-pool-name bp-westeurope

az network lb probe create \
  --resource-group $RG \
  --lb-name lb-regional-westeurope \
  --name probe-http \
  --protocol Http \
  --port 80 \
  --path "/health" \
  --interval 5 \
  --probe-threshold 2

az network lb rule create \
  --resource-group $RG \
  --lb-name lb-regional-westeurope \
  --name rule-http \
  --protocol Tcp \
  --frontend-port 80 \
  --backend-port 80 \
  --frontend-ip-name fe-westeurope \
  --backend-pool-name bp-westeurope \
  --probe-name probe-http \
  --enable-tcp-reset true
```

### Azure PowerShell

```powershell
# Set variables
$rg = "rg-fabrikam-global-lb"
$location1 = "eastus"
$location2 = "westeurope"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location1

# --- Regional LB: East US ---
$pipEastUS = New-AzPublicIpAddress `
  -ResourceGroupName $rg `
  -Name "pip-lb-eastus" `
  -Location $location1 `
  -Sku Standard `
  -AllocationMethod Static `
  -Zone 1, 2, 3

$feEastUS = New-AzLoadBalancerFrontendIpConfig `
  -Name "fe-eastus" `
  -PublicIpAddress $pipEastUS

$beEastUS = New-AzLoadBalancerBackendAddressPoolConfig `
  -Name "bp-eastus"

$probeEastUS = New-AzLoadBalancerProbeConfig `
  -Name "probe-http" `
  -Protocol Http `
  -Port 80 `
  -RequestPath "/health" `
  -IntervalInSeconds 5 `
  -ProbeCount 2

$ruleEastUS = New-AzLoadBalancerRuleConfig `
  -Name "rule-http" `
  -Protocol Tcp `
  -FrontendPort 80 `
  -BackendPort 80 `
  -FrontendIpConfiguration $feEastUS `
  -BackendAddressPool $beEastUS `
  -Probe $probeEastUS `
  -EnableTcpReset

New-AzLoadBalancer `
  -ResourceGroupName $rg `
  -Name "lb-regional-eastus" `
  -Location $location1 `
  -Sku Standard `
  -FrontendIpConfiguration $feEastUS `
  -BackendAddressPool $beEastUS `
  -Probe $probeEastUS `
  -LoadBalancingRule $ruleEastUS

# --- Regional LB: West Europe (same pattern) ---
$pipWestEU = New-AzPublicIpAddress `
  -ResourceGroupName $rg `
  -Name "pip-lb-westeurope" `
  -Location $location2 `
  -Sku Standard `
  -AllocationMethod Static `
  -Zone 1, 2, 3

$feWestEU = New-AzLoadBalancerFrontendIpConfig `
  -Name "fe-westeurope" `
  -PublicIpAddress $pipWestEU

$beWestEU = New-AzLoadBalancerBackendAddressPoolConfig `
  -Name "bp-westeurope"

$probeWestEU = New-AzLoadBalancerProbeConfig `
  -Name "probe-http" `
  -Protocol Http `
  -Port 80 `
  -RequestPath "/health" `
  -IntervalInSeconds 5 `
  -ProbeCount 2

$ruleWestEU = New-AzLoadBalancerRuleConfig `
  -Name "rule-http" `
  -Protocol Tcp `
  -FrontendPort 80 `
  -BackendPort 80 `
  -FrontendIpConfiguration $feWestEU `
  -BackendAddressPool $beWestEU `
  -Probe $probeWestEU `
  -EnableTcpReset

New-AzLoadBalancer `
  -ResourceGroupName $rg `
  -Name "lb-regional-westeurope" `
  -Location $location2 `
  -Sku Standard `
  -FrontendIpConfiguration $feWestEU `
  -BackendAddressPool $beWestEU `
  -Probe $probeWestEU `
  -LoadBalancingRule $ruleWestEU
```

### Portal

1. Crie dois Standard Load Balancers públicos, um em East US e outro em West Europe.
2. Cada um com uma investigação de integridade HTTP na porta 80, caminho `/health`, e uma regra HTTP na porta 80.
3. Estes servirão como back-ends para o LB global na próxima tarefa.

## Tarefa 2: Criar o balanceador de carga entre regiões (camada global)

Implante um balanceador de carga de camada global que fica à frente dos LBs regionais. O tráfego é roteado para a região saudável mais próxima.

### Azure CLI

```bash
# Create a Global tier public IP
az network public-ip create \
  --resource-group $RG \
  --name pip-lb-global \
  --sku Standard \
  --allocation-method Static \
  --location $LOCATION1 \
  --tier Global

# Create the cross-region (Global tier) Load Balancer
az network lb create \
  --resource-group $RG \
  --name lb-global-crossregion \
  --sku Standard \
  --tier Global \
  --location $LOCATION1 \
  --frontend-ip-name fe-global \
  --public-ip-address pip-lb-global \
  --backend-pool-name bp-global-regions

# Add the regional LB frontends as backend addresses
az network lb address-pool address add \
  --resource-group $RG \
  --lb-name lb-global-crossregion \
  --pool-name bp-global-regions \
  --name addr-eastus \
  --frontend-ip-address /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Network/loadBalancers/lb-regional-eastus/frontendIPConfigurations/fe-eastus

az network lb address-pool address add \
  --resource-group $RG \
  --lb-name lb-global-crossregion \
  --pool-name bp-global-regions \
  --name addr-westeurope \
  --frontend-ip-address /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Network/loadBalancers/lb-regional-westeurope/frontendIPConfigurations/fe-westeurope

# Create the cross-region LB rule
az network lb rule create \
  --resource-group $RG \
  --lb-name lb-global-crossregion \
  --name rule-http-global \
  --protocol Tcp \
  --frontend-port 80 \
  --backend-port 80 \
  --frontend-ip-name fe-global \
  --backend-pool-name bp-global-regions
![Challenge 26 - Topologia de Rede](/img/az-700/challenge-26-topology.svg)


### Portal

1. Navegue até **Load balancers** > **Criar**.
2. Defina o SKU como **Standard**, Tipo como **Público**, Camada como **Global**.
3. Crie um novo IP público de camada Global `pip-lb-global`.
4. No pool de back-end, adicione as configurações de IP de front-end dos LBs regionais como endereços de back-end.
5. Crie uma regra na porta 80 mapeando para o pool de back-end global.

:::warning Limitações do balanceador de carga entre regiões
- Suporta apenas protocolos TCP e UDP (sem ICMP).
- Os membros do pool de back-end devem ser front-ends de balanceadores de carga regionais SKU Standard.
- Máximo de 600 IPs de front-end em todos os LBs regionais no pool de back-end.
- Investigações de integridade não são configuráveis; o LB global usa o status de integridade do LB regional.
:::

## Tarefa 3: Configurar Gateway Load Balancer para encadeamento de NVA

Implante um Gateway Load Balancer que insere NVAs de forma transparente no caminho do tráfego para inspeção de pacotes.

### Azure CLI

```bash
# Create VNet for NVAs
az network vnet create \
  --resource-group $RG \
  --name vnet-nva \
  --location $LOCATION1 \
  --address-prefixes 10.50.0.0/16 \
  --subnet-name snet-nva \
  --subnet-prefixes 10.50.1.0/24

# Create the Gateway Load Balancer
az network lb create \
  --resource-group $RG \
  --name lb-gateway-nva \
  --sku Gateway \
  --location $LOCATION1 \
  --frontend-ip-name fe-gateway \
  --vnet-name vnet-nva \
  --subnet snet-nva \
  --backend-pool-name bp-nva

# Configure the backend pool with tunnel interfaces
# Internal tunnel interface (from consumer LB to NVA)
# External tunnel interface (from NVA back to consumer LB)
az network lb address-pool tunnel-interface add \
  --resource-group $RG \
  --lb-name lb-gateway-nva \
  --address-pool bp-nva \
  --type Internal \
  --protocol VXLAN \
  --identifier 800 \
  --port 10800

az network lb address-pool tunnel-interface add \
  --resource-group $RG \
  --lb-name lb-gateway-nva \
  --address-pool bp-nva \
  --type External \
  --protocol VXLAN \
  --identifier 801 \
  --port 10801

# Health probe for NVA instances
az network lb probe create \
  --resource-group $RG \
  --lb-name lb-gateway-nva \
  --name probe-nva-health \
  --protocol Tcp \
  --port 8080 \
  --interval 5 \
  --probe-threshold 2

# HA ports rule for Gateway LB (protocol=All, port=0 means all ports)
az network lb rule create \
  --resource-group $RG \
  --lb-name lb-gateway-nva \
  --name rule-ha-ports-nva \
  --protocol All \
  --frontend-port 0 \
  --backend-port 0 \
  --frontend-ip-name fe-gateway \
  --backend-pool-name bp-nva \
  --probe-name probe-nva-health

# Chain the Gateway LB to the consumer (regional) LB frontend
az network lb frontend-ip update \
  --resource-group $RG \
  --lb-name lb-regional-eastus \
  --name fe-eastus \
  --gateway-lb /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Network/loadBalancers/lb-gateway-nva/frontendIPConfigurations/fe-gateway
```

### Azure PowerShell

```powershell
# Create VNet for NVAs
$snetNVA = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-nva" `
  -AddressPrefix "10.50.1.0/24"

New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-nva" `
  -Location $location1 `
  -AddressPrefix "10.50.0.0/16" `
  -Subnet $snetNVA

# Create Gateway LB frontend
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-nva"
$subnet = $vnet.Subnets | Where-Object { $_.Name -eq "snet-nva" }

$feGateway = New-AzLoadBalancerFrontendIpConfig `
  -Name "fe-gateway" `
  -Subnet $subnet

# Define tunnel interfaces for the backend pool
$tunnelInt = New-AzLoadBalancerBackendAddressPoolTunnelInterfaceConfig `
  -Protocol VXLAN `
  -Type Internal `
  -Port 10800 `
  -Identifier 800

$tunnelExt = New-AzLoadBalancerBackendAddressPoolTunnelInterfaceConfig `
  -Protocol VXLAN `
  -Type External `
  -Port 10801 `
  -Identifier 801

$bePoolNVA = New-AzLoadBalancerBackendAddressPoolConfig `
  -Name "bp-nva" `
  -TunnelInterface $tunnelInt, $tunnelExt

# Health probe for NVAs
$probeNVA = New-AzLoadBalancerProbeConfig `
  -Name "probe-nva-health" `
  -Protocol Tcp `
  -Port 8080 `
  -IntervalInSeconds 5 `
  -ProbeCount 2

# HA ports rule (All protocols, all ports)
$ruleHAPorts = New-AzLoadBalancerRuleConfig `
  -Name "rule-ha-ports-nva" `
  -Protocol All `
  -FrontendPort 0 `
  -BackendPort 0 `
  -FrontendIpConfiguration $feGateway `
  -BackendAddressPool $bePoolNVA `
  -Probe $probeNVA

# Create the Gateway Load Balancer
New-AzLoadBalancer `
  -ResourceGroupName $rg `
  -Name "lb-gateway-nva" `
  -Location $location1 `
  -Sku Gateway `
  -FrontendIpConfiguration $feGateway `
  -BackendAddressPool $bePoolNVA `
  -Probe $probeNVA `
  -LoadBalancingRule $ruleHAPorts
```

### Portal

1. Navegue até **Load balancers** > **Criar**.
2. Defina o SKU como **Gateway**, Tipo como **Interno**.
3. Selecione VNet `vnet-nva`, Sub-rede `snet-nva`.
4. Na configuração do pool de back-end, adicione interfaces de túnel (Internal VXLAN:800:10800, External VXLAN:801:10801).
5. Adicione investigação de integridade (TCP porta 8080).
6. Adicione regra de portas HA (Protocolo All, Porta 0).
7. Encadeie editando o front-end do LB consumidor e selecionando o Gateway Load Balancer.

## Tarefa 4: Configurar regras de saída com alocação explícita de portas SNAT

Configure regras de saída explícitas para evitar exaustão de portas SNAT. Isso substitui o comportamento de saída padrão por contagens de portas alocadas e previsíveis.

### Azure CLI

```bash
# Create a dedicated public IP for outbound traffic
az network public-ip create \
  --resource-group $RG \
  --name pip-outbound-eastus \
  --sku Standard \
  --allocation-method Static \
  --location $LOCATION1

# Add a second frontend IP for outbound (best practice: separate from inbound)
az network lb frontend-ip create \
  --resource-group $RG \
  --lb-name lb-regional-eastus \
  --name fe-outbound \
  --public-ip-address pip-outbound-eastus

# Disable outbound SNAT on the existing inbound rule
az network lb rule update \
  --resource-group $RG \
  --lb-name lb-regional-eastus \
  --name rule-http \
  --disable-outbound-snat true

# Create outbound rule with explicit port allocation
az network lb outbound-rule create \
  --resource-group $RG \
  --lb-name lb-regional-eastus \
  --name outbound-rule-snat \
  --protocol All \
  --address-pool bp-eastus \
  --frontend-ip-configs fe-outbound \
  --outbound-ports 10000 \
  --idle-timeout 15 \
  --enable-tcp-reset true
```

### Azure PowerShell

```powershell
# Create dedicated outbound public IP
$pipOutbound = New-AzPublicIpAddress `
  -ResourceGroupName $rg `
  -Name "pip-outbound-eastus" `
  -Location $location1 `
  -Sku Standard `
  -AllocationMethod Static

# Get the regional LB and add outbound frontend
$lb = Get-AzLoadBalancer -ResourceGroupName $rg -Name "lb-regional-eastus"

$lb | Add-AzLoadBalancerFrontendIpConfig `
  -Name "fe-outbound" `
  -PublicIpAddress $pipOutbound

$lb | Set-AzLoadBalancer

# Disable outbound SNAT on the inbound rule
$lb = Get-AzLoadBalancer -ResourceGroupName $rg -Name "lb-regional-eastus"
$inboundRule = $lb.LoadBalancingRules | Where-Object { $_.Name -eq "rule-http" }
$inboundRule.DisableOutboundSnat = $true
$lb | Set-AzLoadBalancer

# Add outbound rule
$lb = Get-AzLoadBalancer -ResourceGroupName $rg -Name "lb-regional-eastus"
$feOutbound = $lb.FrontendIpConfigurations | Where-Object { $_.Name -eq "fe-outbound" }
$bePool = $lb.BackendAddressPools[0]

$lb | Add-AzLoadBalancerOutboundRuleConfig `
  -Name "outbound-rule-snat" `
  -Protocol All `
  -FrontendIpConfiguration $feOutbound `
  -BackendAddressPool $bePool `
  -AllocatedOutboundPort 10000 `
  -IdleTimeoutInMinutes 15 `
  -EnableTcpReset

$lb | Set-AzLoadBalancer
```

### Portal

1. Crie um novo IP público `pip-outbound-eastus` (Standard, Static).
2. Em `lb-regional-eastus`, adicione um novo IP de front-end `fe-outbound` apontando para o novo IP.
3. Edite a regra de entrada existente `rule-http` e defina **Conversão de endereço de rede de origem de saída (SNAT)** como **(Recomendado) Usar regras de saída para fornecer aos membros do pool de back-end acesso à internet**.
4. Em **Regras de saída** > **Adicionar**: nome `outbound-rule-snat`, IP de front-end `fe-outbound`, Pool de back-end `bp-eastus`, Protocolo **All**, Portas alocadas **10000**, Tempo limite de ociosidade **15 min**, Reset TCP **Habilitado**.

:::tip Cálculo de portas SNAT
Cada IP público fornece 64.512 portas SNAT. Com alocação manual de 10.000 portas por instância: `64.512 / 10.000 = 6 instâncias de back-end` por IP público. Adicione mais IPs de front-end para suportar pools de back-end maiores.
:::

## Tarefa 5: Configurar regra de portas HA para balanceador de carga interno

Crie uma regra de portas HA que balanceia a carga de todos os protocolos e todas as portas simultaneamente, comumente usada para NVAs e SQL AlwaysOn.

### Azure CLI

```bash
# Create an internal LB with HA ports
az network lb create \
  --resource-group $RG \
  --name lb-internal-ha \
  --sku Standard \
  --location $LOCATION1 \
  --frontend-ip-name fe-ha-internal \
  --vnet-name vnet-nva \
  --subnet snet-nva \
  --backend-pool-name bp-ha

az network lb probe create \
  --resource-group $RG \
  --lb-name lb-internal-ha \
  --name probe-ha-tcp \
  --protocol Tcp \
  --port 443 \
  --interval 5 \
  --probe-threshold 2

# HA Ports rule: protocol=All, frontend-port=0, backend-port=0
az network lb rule create \
  --resource-group $RG \
  --lb-name lb-internal-ha \
  --name rule-ha-ports \
  --protocol All \
  --frontend-port 0 \
  --backend-port 0 \
  --frontend-ip-name fe-ha-internal \
  --backend-pool-name bp-ha \
  --probe-name probe-ha-tcp \
  --enable-tcp-reset true
```

### Azure PowerShell

```powershell
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-nva"
$subnet = $vnet.Subnets | Where-Object { $_.Name -eq "snet-nva" }

$feHA = New-AzLoadBalancerFrontendIpConfig `
  -Name "fe-ha-internal" `
  -Subnet $subnet

$beHA = New-AzLoadBalancerBackendAddressPoolConfig `
  -Name "bp-ha"

$probeHA = New-AzLoadBalancerProbeConfig `
  -Name "probe-ha-tcp" `
  -Protocol Tcp `
  -Port 443 `
  -IntervalInSeconds 5 `
  -ProbeCount 2

# HA Ports: Protocol All, Port 0 means all protocols and all ports
$ruleHA = New-AzLoadBalancerRuleConfig `
  -Name "rule-ha-ports" `
  -Protocol All `
  -FrontendPort 0 `
  -BackendPort 0 `
  -FrontendIpConfiguration $feHA `
  -BackendAddressPool $beHA `
  -Probe $probeHA `
  -EnableTcpReset

New-AzLoadBalancer `
  -ResourceGroupName $rg `
  -Name "lb-internal-ha" `
  -Location $location1 `
  -Sku Standard `
  -FrontendIpConfiguration $feHA `
  -BackendAddressPool $beHA `
  -Probe $probeHA `
  -LoadBalancingRule $ruleHA
```

### Portal

1. Crie um Standard Load Balancer interno `lb-internal-ha`.
2. Adicione investigação de integridade (TCP 443, intervalo 5s).
3. Adicione regra de balanceamento de carga: Protocolo **All**, Porta de front-end **0**, Porta de back-end **0** (isso habilita portas HA).
4. Portas HA está disponível apenas em Standard Load Balancers internos.

## Quebra & conserta

### Cenário 1: Exaustão de portas SNAT

```bash
# Misconfiguration: too few ports allocated for the number of backends
az network lb outbound-rule update \
  --resource-group $RG \
  --lb-name lb-regional-eastus \
  --name outbound-rule-snat \
  --outbound-ports 50000
```

**Sintoma**: Após adicionar mais VMs ao pool de back-end, conexões de saída falham com erros de tempo limite de conexão. O Azure Monitor mostra falhas de alocação de portas SNAT.

**Causa raiz**: Com 50.000 portas alocadas por instância e um único IP público fornecendo 64.512 portas no total, apenas 1 instância de back-end pode ser suportada (`64.512 / 50.000 = 1`). VMs adicionais recebem zero portas alocadas e não conseguem fazer conexões de saída.

**Correção**: Reduza a alocação por instância ou adicione mais IPs públicos de front-end:

```bash
# Option A: Reduce allocation to support more backends
az network lb outbound-rule update \
  --resource-group $RG \
  --lb-name lb-regional-eastus \
  --name outbound-rule-snat \
  --outbound-ports 8000

# Option B: Add more public IPs for more total SNAT ports
az network public-ip create \
  --resource-group $RG \
  --name pip-outbound-2 \
  --sku Standard \
  --allocation-method Static \
  --location $LOCATION1

az network lb frontend-ip create \
  --resource-group $RG \
  --lb-name lb-regional-eastus \
  --name fe-outbound-2 \
  --public-ip-address pip-outbound-2

az network lb outbound-rule update \
  --resource-group $RG \
  --lb-name lb-regional-eastus \
  --name outbound-rule-snat \
  --frontend-ip-configs fe-outbound fe-outbound-2
```

### Cenário 2: Encadeamento do Gateway Load Balancer não funciona

```bash
# Attempt to chain but use wrong frontend reference
az network lb frontend-ip update \
  --resource-group $RG \
  --lb-name lb-regional-eastus \
  --name fe-eastus \
  --gateway-lb /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Network/loadBalancers/lb-gateway-nva/frontendIPConfigurations/wrong-fe-name
```

**Sintoma**: O tráfego para o LB consumidor não passa pelas NVAs. A NVA não vê pacotes e a inspeção de pacotes é ignorada.

**Causa raiz**: A referência do front-end do Gateway Load Balancer no LB consumidor está incorreta. O nome da configuração de IP de front-end não corresponde ao front-end real do Gateway LB, então o encadeamento não é estabelecido.

**Correção**: Use o nome correto da configuração de IP de front-end:

```bash
az network lb frontend-ip update \
  --resource-group $RG \
  --lb-name lb-regional-eastus \
  --name fe-eastus \
  --gateway-lb /subscriptions/{sub-id}/resourceGroups/$RG/providers/Microsoft.Network/loadBalancers/lb-gateway-nva/frontendIPConfigurations/fe-gateway
```

:::tip Verificar encadeamento do Gateway Load Balancer
Verifique o front-end do LB consumidor para confirmar a referência do Gateway Load Balancer:
```bash
az network lb frontend-ip show \
  --resource-group $RG \
  --lb-name lb-regional-eastus \
  --name fe-eastus \
  --query "gatewayLoadBalancer.id"
```
:::

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-26-q1",
    question: "Quais tipos de recursos podem ser adicionados ao backend pool de um Load Balancer entre regiões (camada Global)?",
    options: [
      "Configurações de IP de frontend de Standard Load Balancers regionais ✅",
      "Interfaces de rede de VMs individuais de qualquer região",
      "Endereços IP públicos de VMs diretamente",
      "Instâncias de scale set de máquinas virtuais entre regiões"
    ],
    correctIndex: 0,
    explanation: "Os backend pools do Load Balancer entre regiões podem conter apenas configurações de IP de frontend de Standard Load Balancers regionais. Você não pode adicionar VMs individuais, NICs ou IPs públicos diretamente. Os LBs regionais lidam com a distribuição local enquanto o LB global roteia entre regiões."
  },
  {
    id: "az700-26-q2",
    question: "Um Standard Load Balancer possui um IP público para saída e 10.000 portas alocadas por instância de backend. Qual é o número máximo de VMs de backend que essa configuração pode suportar?",
    options: [
      "6 VMs (64.512 portas totais / 10.000 por VM) ✅",
      "10 VMs (100.000 / 10.000)",
      "64 VMs (64.512 / 1.000)",
      "VMs ilimitadas com compartilhamento de portas"
    ],
    correctIndex: 0,
    explanation: "Cada IP público Standard fornece 64.512 portas SNAT. Com 10.000 portas alocadas por instância: 64.512 / 10.000 = 6,4, arredondado para baixo para 6 VMs. Para suportar mais VMs, reduza a alocação por instância ou adicione mais IPs públicos de frontend."
  },
  {
    id: "az700-26-q3",
    question: "Qual é o principal caso de uso do Gateway Load Balancer?",
    options: [
      "Inserir de forma transparente appliances virtuais de rede (NVAs) no caminho do tráfego para inspeção ✅",
      "Balancear carga de tráfego entre múltiplas regiões para recuperação de desastres",
      "Fornecer um gateway entre redes locais e o Azure",
      "Habilitar terminação HTTPS e offloading SSL no balanceador de carga"
    ],
    correctIndex: 0,
    explanation: "O Gateway Load Balancer permite encadeamento transparente de NVAs inserindo appliances (firewalls, DPI, IDS/IPS) no caminho do tráfego. O tráfego é tunelado via VXLAN para instâncias de NVA e de volta sem modificar a aplicação do consumidor ou o roteamento do cliente."
  },
  {
    id: "az700-26-q4",
    question: "Uma regra de portas HA está configurada em um Standard Load Balancer interno. Quais valores de protocolo e porta definem essa regra?",
    options: [
      "Protocol: All, Frontend port: 0, Backend port: 0 ✅",
      "Protocol: TCP, Frontend port: 0-65535, Backend port: 0-65535",
      "Protocol: All, Frontend port: 1-65535, Backend port: 1-65535",
      "Protocol: All, Frontend port: 80, Backend port: 80"
    ],
    correctIndex: 0,
    explanation: "Portas HA é uma configuração especial de regra usando Protocol=All com Port=0 para frontend e backend. Essa combinação instrui o LB a balancear todos os fluxos TCP e UDP em todas as portas simultaneamente. É suportado apenas em Standard Load Balancers internos."
  },
  {
    id: "az700-26-q5",
    question: "Por que você deve usar um IP de frontend separado para regras de saída em vez de compartilhar o frontend de entrada?",
    options: [
      "Separar os frontends evita conflitos de portas SNAT entre conexões de entrada e fluxos de saída ✅",
      "O Azure exige IPs separados para entrada e saída por design",
      "Frontends compartilhados dobram o custo do Load Balancer",
      "Regras de saída não são suportadas em frontends com regras de entrada"
    ],
    correctIndex: 0,
    explanation: "Usar um IP de frontend separado para saída evita conflitos de portas SNAT. Quando entrada e saída compartilham um frontend, as conexões de entrada consomem portas SNAT pré-alocadas, reduzindo a disponibilidade para saída. Um frontend de saída dedicado fornece um pool limpo de 64.512 portas exclusivamente para SNAT de saída."
  },
  {
    id: "az700-26-q6",
    question: "O Load Balancer entre regiões detecta que todos os backends em East US estão não íntegros. O que acontece com o tráfego?",
    options: [
      "O tráfego é automaticamente redirecionado para a região saudável mais próxima (West Europe) ✅",
      "Todo o tráfego é descartado até que East US se recupere",
      "O LB global entra em estado degradado e retorna erros 503",
      "O tráfego é dividido igualmente entre todas as regiões independentemente da integridade"
    ],
    correctIndex: 0,
    explanation: "O Load Balancer entre regiões usa o status de integridade dos backends regionais para decisões de roteamento. Quando um LB regional não tem instâncias de backend íntegras, o LB global roteia todo o tráfego para a região saudável mais próxima restante, fornecendo failover geográfico automático."
  }
]} />

## Limpeza

Remova todos os recursos criados neste desafio.

### Azure CLI

```bash
# Delete the resource group and all resources
az group delete --name rg-fabrikam-global-lb --yes --no-wait
```

### Azure PowerShell

```powershell
# Delete the resource group
Remove-AzResourceGroup -Name "rg-fabrikam-global-lb" -Force -AsJob
```

:::warning Lembrete de custo
O Load Balancer entre regiões incorre em cobranças de transferência de dados entre regiões, além da taxa horária padrão do LB. O Gateway Load Balancer também tem sua própria cobrança por hora. Combinados, esses recursos custam aproximadamente $0,06/hora. Exclua imediatamente após concluir o laboratório.
:::

:::tip Verificar limpeza
```bash
az group show --name rg-fabrikam-global-lb 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists"
```
:::
