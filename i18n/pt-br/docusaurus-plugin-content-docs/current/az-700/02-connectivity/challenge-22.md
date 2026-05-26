---
sidebar_position: 9
title: "Desafio 22: Virtual WAN Hub-Spoke"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 22: Virtual WAN hub-spoke

:::info Tempo e custo estimados

**90–120 minutos** | **~$0,36/h** (Virtual WAN Standard + Gateway VPN) | **Peso no exame: 20–25%**

:::

## Cenário

A Contoso está migrando de uma topologia hub-spoke configurada manualmente (VNet peering com rotas definidas pelo usuário) para o Azure Virtual WAN para simplificar o gerenciamento de conectividade de branches e spokes. Eles operam em duas regiões do Azure -- East US e West Europe -- e precisam de conectividade automatizada spoke-to-spoke, gateways VPN integrados para filiais e roteamento centralizado sem manter tabelas UDR manualmente.

A arquitetura atual exige dezenas de relações de peering e tabelas de rotas. A equipe de rede deseja consolidar isso em uma implantação Virtual WAN Standard que suporte roteamento de trânsito entre spokes, VPN site-to-site para branches locais e futura integração com ExpressRoute.

## Habilidades de exame avaliadas

| Habilidade | Descrição |
|------------|-----------|
| Selecionar um SKU do Virtual WAN | Escolher entre Basic e Standard com base nos requisitos de conectividade |
| Projetar uma arquitetura Virtual WAN | Selecionar tipos e serviços incluindo posicionamento de hub e tipos de gateway |
| Criar um hub virtual no Virtual WAN | Implantar hubs com prefixos de endereço e configurações de SKU corretos |
| Escolher uma unidade de escala apropriada | Dimensionar unidades de escala do gateway para requisitos de throughput e conexão |
| Implantar um gateway em um hub virtual | Provisionar gateways VPN dentro da infraestrutura do hub virtual |

## Visão geral da arquitetura

![Challenge 22 - Topologia de Rede](/img/az-700/challenge-22-topology.svg)


## Conceitos-chave

### Comparação de SKUs do Virtual WAN

| Recurso | Basic | Standard |
|---------|-------|----------|
| VPN site-to-site | Sim | Sim |
| VPN ponto-a-site | Não | Sim |
| ExpressRoute | Não | Sim |
| Trânsito VNet-to-VNet pelo hub | Não | Sim |
| Conectividade hub-to-hub | Não | Sim |
| Azure Firewall no hub | Não | Sim |
| NVA no hub | Não | Sim |

### Unidades de escala

Cada unidade de escala do gateway VPN fornece aproximadamente 500 Mbps de throughput agregado. Configurações comuns:

| Unidades de escala | Throughput agregado | Máx. de conexões S2S |
|--------------------|---------------------|----------------------|
| 1 | 500 Mbps | 500 |
| 2 | 1 Gbps | 500 |
| 20 | 10 Gbps | 1000 |
| 40 | 20 Gbps | 2000 |

---

## Tarefa 1: Criar o recurso Virtual WAN

Provisione um recurso Virtual WAN com o SKU Standard para suportar roteamento de trânsito, múltiplos tipos de gateway e comunicação hub-to-hub.

### Azure CLI

```bash
# Define variables
RG="rg-vwan-challenge22"
LOCATION="eastus"
VWAN_NAME="vwan-contoso"

# Create resource group
az group create \
  --name $RG \
  --location $LOCATION

# Create Virtual WAN with Standard SKU
az network vwan create \
  --name $VWAN_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --type Standard \
  --branch-to-branch-traffic true
```

### Azure PowerShell

```powershell
# Define variables
$RG = "rg-vwan-challenge22"
$Location = "eastus"
$VwanName = "vwan-contoso"

# Create resource group
New-AzResourceGroup -Name $RG -Location $Location

# Create Virtual WAN with Standard SKU
New-AzVirtualWan `
  -ResourceGroupName $RG `
  -Name $VwanName `
  -Location $Location `
  -VirtualWANType Standard `
  -AllowBranchToBranchTraffic
```

:::tip Por que Standard?
O SKU Basic suporta apenas VPN site-to-site. Ele não suporta trânsito spoke-to-spoke, ExpressRoute, ponto-a-site, Azure Firewall ou conectividade hub-to-hub. Para a maioria das implantações empresariais, o Standard é necessário.
:::

---

## Tarefa 2: Criar um hub virtual na região primária

Implante um hub virtual em East US com um prefixo de endereço dedicado. O espaço de endereço do hub não deve se sobrepor a nenhuma VNet spoke conectada.

### Azure CLI

```bash
# Create virtual hub in East US
az network vhub create \
  --name "hub-eastus" \
  --resource-group $RG \
  --vwan $VWAN_NAME \
  --address-prefix "10.1.0.0/24" \
  --location "eastus" \
  --sku Standard
```

### Azure PowerShell

```powershell
# Get the Virtual WAN object
$vwan = Get-AzVirtualWan -ResourceGroupName $RG -Name $VwanName

# Create virtual hub in East US
New-AzVirtualHub `
  -ResourceGroupName $RG `
  -Name "hub-eastus" `
  -VirtualWan $vwan `
  -AddressPrefix "10.1.0.0/24" `
  -Location "eastus" `
  -HubRoutingPreference "VpnGateway"
```

:::warning Tempo de provisionamento do hub
A criação do hub virtual leva de 20 a 30 minutos. O hub deve atingir o estado de provisionamento **Succeeded** antes que você possa conectar spokes ou implantar gateways. Monitore o status com:
```bash
az network vhub show --name "hub-eastus" --resource-group $RG --query "provisioningState"
```
:::

---

## Tarefa 3: Criar VNets spoke e conectá-las ao hub

Crie VNets spoke e estabeleça conexões com o hub virtual. O Virtual WAN gerencia automaticamente o roteamento entre spokes conectados.

### Azure CLI

```bash
# Create spoke VNets
az network vnet create \
  --name "vnet-spoke1" \
  --resource-group $RG \
  --location "eastus" \
  --address-prefixes "10.10.0.0/16" \
  --subnet-name "workload" \
  --subnet-prefixes "10.10.1.0/24"

az network vnet create \
  --name "vnet-spoke2" \
  --resource-group $RG \
  --location "eastus" \
  --address-prefixes "10.20.0.0/16" \
  --subnet-name "workload" \
  --subnet-prefixes "10.20.1.0/24"

# Connect spoke1 to the virtual hub
az network vhub connection create \
  --name "conn-spoke1" \
  --resource-group $RG \
  --vhub-name "hub-eastus" \
  --remote-vnet "vnet-spoke1" \
  --internet-security true

# Connect spoke2 to the virtual hub
az network vhub connection create \
  --name "conn-spoke2" \
  --resource-group $RG \
  --vhub-name "hub-eastus" \
  --remote-vnet "vnet-spoke2" \
  --internet-security true
```

### Azure PowerShell

```powershell
# Create spoke VNets
$spoke1 = New-AzVirtualNetwork `
  -ResourceGroupName $RG `
  -Name "vnet-spoke1" `
  -Location "eastus" `
  -AddressPrefix "10.10.0.0/16"

Add-AzVirtualNetworkSubnetConfig `
  -Name "workload" `
  -VirtualNetwork $spoke1 `
  -AddressPrefix "10.10.1.0/24"
$spoke1 | Set-AzVirtualNetwork

$spoke2 = New-AzVirtualNetwork `
  -ResourceGroupName $RG `
  -Name "vnet-spoke2" `
  -Location "eastus" `
  -AddressPrefix "10.20.0.0/16"

Add-AzVirtualNetworkSubnetConfig `
  -Name "workload" `
  -VirtualNetwork $spoke2 `
  -AddressPrefix "10.20.1.0/24"
$spoke2 | Set-AzVirtualNetwork

# Get hub object
$hub = Get-AzVirtualHub -ResourceGroupName $RG -Name "hub-eastus"

# Connect spoke1
$spoke1Ref = Get-AzVirtualNetwork -ResourceGroupName $RG -Name "vnet-spoke1"
New-AzVirtualHubVnetConnection `
  -ResourceGroupName $RG `
  -VirtualHubName "hub-eastus" `
  -Name "conn-spoke1" `
  -RemoteVirtualNetwork $spoke1Ref `
  -EnableInternetSecurity $true

# Connect spoke2
$spoke2Ref = Get-AzVirtualNetwork -ResourceGroupName $RG -Name "vnet-spoke2"
New-AzVirtualHubVnetConnection `
  -ResourceGroupName $RG `
  -VirtualHubName "hub-eastus" `
  -Name "conn-spoke2" `
  -RemoteVirtualNetwork $spoke2Ref `
  -EnableInternetSecurity $true
```

---

## Tarefa 4: Implantar um gateway VPN no hub virtual

Implante um gateway VPN site-to-site dentro do hub. Selecione as unidades de escala com base no throughput necessário -- a Contoso precisa de 1 Gbps de largura de banda agregada.

### Azure CLI

```bash
# Deploy VPN gateway in the hub (scale unit 2 = ~1 Gbps)
az network vpn-gateway create \
  --name "vpngw-hub-eastus" \
  --resource-group $RG \
  --vhub "hub-eastus" \
  --location "eastus" \
  --scale-unit 2 \
  --no-wait
```

### Azure PowerShell

```powershell
# Deploy VPN gateway in the hub (scale unit 2 = ~1 Gbps)
New-AzVpnGateway `
  -ResourceGroupName $RG `
  -Name "vpngw-hub-eastus" `
  -VirtualHub $hub `
  -VpnGatewayScaleUnit 2
```

:::warning Provisionamento do gateway
A criação do gateway VPN dentro de um hub virtual leva de 25 a 45 minutos. Não prossiga para a criação de conexões até que o gateway atinja o estado **Succeeded**:
```bash
az network vpn-gateway show \
  --name "vpngw-hub-eastus" \
  --resource-group $RG \
  --query "provisioningState"
```
:::

---

## Tarefa 5: Criar um site VPN e conexão

Defina o branch local como um site VPN e crie a conexão S2S através do gateway VPN do Virtual WAN.

### Azure CLI

```bash
# Create a VPN site representing the on-premises branch
az network vpn-site create \
  --name "site-branch-nyc" \
  --resource-group $RG \
  --location "eastus" \
  --ip-address "203.0.113.10" \
  --address-prefixes "192.168.0.0/16" \
  --virtual-wan $VWAN_NAME \
  --device-vendor "Cisco" \
  --device-model "ISR4321" \
  --link-speed 100

# Create the VPN gateway connection to the site
az network vpn-gateway connection create \
  --name "conn-branch-nyc" \
  --resource-group $RG \
  --gateway-name "vpngw-hub-eastus" \
  --remote-vpn-site "site-branch-nyc"
```

### Azure PowerShell

```powershell
# Create a VPN site representing the on-premises branch
$vpnSite = New-AzVpnSite `
  -ResourceGroupName $RG `
  -Name "site-branch-nyc" `
  -Location "eastus" `
  -IpAddress "203.0.113.10" `
  -AddressSpace @("192.168.0.0/16") `
  -VirtualWanResourceGroupName $RG `
  -VirtualWanName $VwanName `
  -DeviceModel "ISR4321" `
  -DeviceVendor "Cisco" `
  -LinkSpeedInMbps 100

# Create VPN gateway connection
$vpnSiteObj = Get-AzVpnSite -ResourceGroupName $RG -Name "site-branch-nyc"
$vpnGw = Get-AzVpnGateway -ResourceGroupName $RG -Name "vpngw-hub-eastus"

New-AzVpnConnection `
  -ResourceGroupName $RG `
  -ParentResourceName "vpngw-hub-eastus" `
  -Name "conn-branch-nyc" `
  -VpnSite $vpnSiteObj
```

---

## Tarefa 6: Verificar conectividade spoke-to-spoke

Com o SKU Standard, o roteamento de trânsito spoke-to-spoke é automático através do hub. Verifique consultando as rotas efetivas nas conexões dos spokes.

### Azure CLI

```bash
# Check effective routes for the virtual hub
az network vhub get-effective-routes \
  --name "hub-eastus" \
  --resource-group $RG

# Verify hub connection status
az network vhub connection show \
  --name "conn-spoke1" \
  --resource-group $RG \
  --vhub-name "hub-eastus" \
  --query "{name:name, status:provisioningState, routingConfig:routingConfiguration}"

# List all connections on the hub
az network vhub connection list \
  --resource-group $RG \
  --vhub-name "hub-eastus" \
  --output table
```

### Azure PowerShell

```powershell
# Get hub connection details
Get-AzVirtualHubVnetConnection `
  -ResourceGroupName $RG `
  -VirtualHubName "hub-eastus" |
  Select-Object Name, ProvisioningState, RoutingConfiguration

# Verify hub effective routes
Get-AzVirtualHubEffectiveRoute `
  -ResourceGroupName $RG `
  -VirtualHubName "hub-eastus"
```

---

## Cenários de quebra e correção

### Cenário 1: SKU Basic com gateway VPN falha

**Sintoma:** A tentativa de implantar um gateway VPN falha com um erro sobre recursos não suportados.

**Causa raiz:** O Virtual WAN foi criado com `--type Basic`, mas gateways além do S2S VPN básico exigem o SKU Standard. Além disso, o Basic não suporta trânsito spoke-to-spoke.

**Correção:**
```bash
# Upgrade from Basic to Standard
az network vwan update \
  --name $VWAN_NAME \
  --resource-group $RG \
  --type Standard
```

:::note
A atualização de Basic para Standard é uma operação não disruptiva. No entanto, o downgrade de Standard para Basic não é suportado.
:::

---

### Cenário 2: Conectividade spoke não funciona após conexão ao hub

**Sintoma:** VMs em VNets spoke não conseguem se comunicar mesmo com as conexões mostrando status Succeeded.

**Causa raiz:** O hub virtual não provisionou totalmente sua infraestrutura de roteamento. O estado de roteamento do hub deve ser **Provisioned** (não apenas a conexão).

**Diagnóstico:**
```bash
# Check hub routing state
az network vhub show \
  --name "hub-eastus" \
  --resource-group $RG \
  --query "{routingState:routingState, provisioningState:provisioningState}"
```

**Correção:** Aguarde até que `routingState` mostre `Provisioned`. Se estiver travado, remova e recrie a conexão:
```bash
az network vhub connection delete \
  --name "conn-spoke1" \
  --resource-group $RG \
  --vhub-name "hub-eastus" \
  --yes

# Wait 2 minutes, then recreate
az network vhub connection create \
  --name "conn-spoke1" \
  --resource-group $RG \
  --vhub-name "hub-eastus" \
  --remote-vnet "vnet-spoke1"
```

---

### Cenário 3: Throughput insuficiente do gateway VPN

**Sintoma:** A filial reporta conectividade lenta. O monitoramento mostra que o gateway VPN está saturado em 500 Mbps.

**Causa raiz:** O gateway foi implantado com unidade de escala 1, fornecendo apenas 500 Mbps de throughput agregado.

**Correção:**
```bash
# Update the VPN gateway scale unit
az network vpn-gateway update \
  --name "vpngw-hub-eastus" \
  --resource-group $RG \
  --scale-unit 4
```

---

## Limpeza

```bash
# Delete the entire resource group and all resources
az group delete --name $RG --yes --no-wait
```

```powershell
# PowerShell cleanup
Remove-AzResourceGroup -Name "rg-vwan-challenge22" -Force -AsJob
```

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-22-q1",
    question: "A Contoso precisa de roteamento de trânsito spoke-to-spoke através de um hub Virtual WAN, conectividade ExpressRoute e integração com Azure Firewall. Qual SKU do Virtual WAN eles devem selecionar?",
    options: [
      "Standard",
      "Basic",
      "Premium",
      "Enterprise"
    ],
    correctIndex: 0,
    explanation: "O SKU Standard é necessário para trânsito spoke-to-spoke, ExpressRoute, VPN Point-to-Site, Azure Firewall no hub, NVA no hub e conectividade hub-to-hub. O SKU Basic suporta apenas VPN site-to-site sem roteamento de trânsito. Os SKUs Premium e Enterprise não existem para o Virtual WAN."
  },
  {
    id: "az700-22-q2",
    question: "Um gateway VPN em um hub Virtual WAN está configurado com 2 unidades de escala. Qual é o throughput agregado aproximado?",
    options: [
      "250 Mbps",
      "500 Mbps",
      "1 Gbps",
      "2 Gbps"
    ],
    correctIndex: 2,
    explanation: "Cada unidade de escala do gateway VPN fornece aproximadamente 500 Mbps de throughput agregado. Com 2 unidades de escala, o gateway fornece aproximadamente 1 Gbps. Unidade de escala 1 = 500 Mbps, unidade de escala 2 = 1 Gbps, unidade de escala 20 = 10 Gbps."
  },
  {
    id: "az700-22-q3",
    question: "Após criar um hub virtual e conectar duas VNets spoke, as VMs nos spokes não conseguem se comunicar. A conexão do hub mostra Succeeded. O que você deve verificar em seguida?",
    options: [
      "Verificar se o routingState do hub mostra Provisioned",
      "Criar uma UDR em cada spoke para rotear tráfego para o hub",
      "Habilitar VNet peering entre os dois spokes diretamente",
      "Adicionar uma rota à defaultRouteTable manualmente"
    ],
    correctIndex: 0,
    explanation: "No Virtual WAN, o roteamento de trânsito spoke-to-spoke é automático ao usar o SKU Standard. Nenhuma UDR ou peering manual é necessário. No entanto, o hub deve ter seu routingState como Provisioned para que o roteamento funcione. O provisioningState da conexão e o routingState do hub são separados -- ambos devem estar saudáveis."
  },
  {
    id: "az700-22-q4",
    question: "Qual comando CLI cria um site VPN representando uma filial on-premises no Azure Virtual WAN?",
    options: [
      "az network vpn-site create --ip-address --name --resource-group --virtual-wan",
      "az network vnet-gateway create --name --resource-group --vnet --gateway-type Vpn",
      "az network local-gateway create --name --resource-group --gateway-ip-address",
      "az network vpn-gateway connection create --gateway-name --name --resource-group"
    ],
    correctIndex: 0,
    explanation: "No Virtual WAN, filiais on-premises são representadas como sites VPN usando 'az network vpn-site create'. Isso é diferente da VPN tradicional onde você cria um local network gateway. O site VPN é associado ao recurso Virtual WAN e conectado através do gateway VPN do hub."
  },
  {
    id: "az700-22-q5",
    question: "O que acontece quando você tenta fazer downgrade de um Virtual WAN de Standard para o SKU Basic?",
    options: [
      "O downgrade é bem-sucedido mas desabilita todo o roteamento de trânsito",
      "O downgrade não é suportado -- você só pode fazer upgrade de Basic para Standard",
      "O downgrade requer remover todas as conexões ExpressRoute primeiro",
      "O downgrade aciona uma janela de manutenção de 30 minutos"
    ],
    correctIndex: 1,
    explanation: "O downgrade de Standard para Basic não é suportado no Azure Virtual WAN. Você só pode fazer upgrade de Basic para Standard. Se precisar de uma implantação Basic, deve criar um novo recurso Virtual WAN. O upgrade de Basic para Standard é uma operação não disruptiva."
  }
]} />
