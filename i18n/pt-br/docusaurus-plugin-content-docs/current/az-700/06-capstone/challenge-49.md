---
sidebar_position: 1
title: "Challenge 49: Enterprise Multi-Region Network (Capstone)"
sidebar_label: "Challenge 49 - Capstone"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 49: Rede empresarial multi-região (CAPSTONE)

:::info Tempo e custo estimados

**180-240 minutos** | **~$4,50/h** (VPN Gateways, Firewalls, AppGW, Front Door) | **Peso no exame: Todos os domínios**

:::

:::danger Aviso de custo

Este laboratório implanta múltiplos recursos caros, incluindo VPN Gateways (~$0,57/h cada para VpnGw2AZ), Azure Firewalls (~$1,25/h cada), Application Gateways (~$0,25/h cada) e Front Door Premium. **Custo total estimado: $4-5/hora**. Conclua a seção de limpeza imediatamente após terminar. Não deixe esses recursos em execução durante a noite.

:::

## Cenário

A Contoso Global Financial Services está implantando uma nova plataforma de negociação em duas regiões do Azure (East US e West Europe). Como arquiteto de rede sênior, você deve projetar e implementar a infraestrutura de rede completa abrangendo todos os cinco domínios do exame AZ-700. Este desafio capstone valida sua capacidade de integrar topologias hub-spoke, conectividade híbrida, segurança centralizada, entrega de aplicativos, acesso privado, resolução DNS, proteção contra DDoS e monitoramento de rede em uma arquitetura empresarial coesa.

### Requisitos de arquitetura

| Componente | East US | West Europe |
|-----------|---------|-------------|
| VNet Hub | 10.10.0.0/16 | 10.20.0.0/16 |
| VNet Spoke Web | 10.11.0.0/16 | 10.21.0.0/16 |
| VNet Spoke Dados | 10.12.0.0/16 | 10.22.0.0/16 |
| Local (NYC) | 192.168.0.0/16 | N/A |

### Habilidades do exame abordadas

| Domínio | Habilidades |
|--------|--------|
| Projetar e implementar rede principal | Design de VNet, peering, roteamento |
| Projetar e implementar roteamento | UDR, BGP, tunelamento forçado |
| Proteger e monitorar redes | Azure Firewall, DDoS, NSG, logs de fluxo |
| Projetar e implementar acesso privado | Private Endpoints, Private Link, DNS |
| Projetar e implementar balanceamento de carga | Application Gateway, Front Door, WAF |

## Pré-requisitos

- Assinatura do Azure com funções de Contributor + Network Contributor
- Azure CLI 2.60+ ou Azure PowerShell Az 12.0+
- Conclusão dos Challenges 1-48 (ou experiência equivalente em todos os cinco domínios)
- Compreensão de BGP, IPsec, encaminhamento DNS e conceitos de WAF

---

## Tarefa 1: Fundação -- Topologia hub-spoke multi-região

Crie as VNets hub e spoke em ambas as regiões com todas as sub-redes necessárias e depois estabeleça os relacionamentos de peering.

### Azure CLI

```bash
# Variables
RG="rg-contoso-capstone"
LOCATION_EAST="eastus"
LOCATION_WEST="westeurope"

# Create resource group
az group create --name $RG --location $LOCATION_EAST

# ============================================================
# EAST US - Hub VNet
# ============================================================
az network vnet create \
  --resource-group $RG \
  --name vnet-hub-eastus \
  --location $LOCATION_EAST \
  --address-prefixes 10.10.0.0/16 \
  --subnet-name AzureFirewallSubnet \
  --subnet-prefixes 10.10.0.0/26

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-eastus \
  --name GatewaySubnet \
  --address-prefixes 10.10.1.0/27

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-eastus \
  --name AzureBastionSubnet \
  --address-prefixes 10.10.2.0/26

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-eastus \
  --name snet-nva \
  --address-prefixes 10.10.3.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-eastus \
  --name snet-shared \
  --address-prefixes 10.10.4.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-eastus \
  --name snet-dns-inbound \
  --address-prefixes 10.10.5.0/28 \
  --delegations "Microsoft.Network/dnsResolvers"

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-eastus \
  --name snet-dns-outbound \
  --address-prefixes 10.10.5.16/28 \
  --delegations "Microsoft.Network/dnsResolvers"

# EAST US - Web Spoke
az network vnet create \
  --resource-group $RG \
  --name vnet-spoke-web-eastus \
  --location $LOCATION_EAST \
  --address-prefixes 10.11.0.0/16 \
  --subnet-name snet-appgw \
  --subnet-prefixes 10.11.0.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-spoke-web-eastus \
  --name snet-web \
  --address-prefixes 10.11.1.0/24

# EAST US - Data Spoke
az network vnet create \
  --resource-group $RG \
  --name vnet-spoke-data-eastus \
  --location $LOCATION_EAST \
  --address-prefixes 10.12.0.0/16 \
  --subnet-name snet-data \
  --subnet-prefixes 10.12.0.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-spoke-data-eastus \
  --name snet-pe \
  --address-prefixes 10.12.1.0/24

# ============================================================
# WEST EUROPE - Hub VNet
# ============================================================
az network vnet create \
  --resource-group $RG \
  --name vnet-hub-westeurope \
  --location $LOCATION_WEST \
  --address-prefixes 10.20.0.0/16 \
  --subnet-name AzureFirewallSubnet \
  --subnet-prefixes 10.20.0.0/26

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-westeurope \
  --name GatewaySubnet \
  --address-prefixes 10.20.1.0/27

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-westeurope \
  --name AzureBastionSubnet \
  --address-prefixes 10.20.2.0/26

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-westeurope \
  --name snet-nva \
  --address-prefixes 10.20.3.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-westeurope \
  --name snet-shared \
  --address-prefixes 10.20.4.0/24

# WEST EUROPE - Web Spoke
az network vnet create \
  --resource-group $RG \
  --name vnet-spoke-web-westeurope \
  --location $LOCATION_WEST \
  --address-prefixes 10.21.0.0/16 \
  --subnet-name snet-appgw \
  --subnet-prefixes 10.21.0.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-spoke-web-westeurope \
  --name snet-web \
  --address-prefixes 10.21.1.0/24

# WEST EUROPE - Data Spoke
az network vnet create \
  --resource-group $RG \
  --name vnet-spoke-data-westeurope \
  --location $LOCATION_WEST \
  --address-prefixes 10.22.0.0/16 \
  --subnet-name snet-data \
  --subnet-prefixes 10.22.0.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-spoke-data-westeurope \
  --name snet-pe \
  --address-prefixes 10.22.1.0/24

# ============================================================
# PEERING - Hub to Spokes (East US)
# NOTE: --use-remote-gateways on spoke peerings requires the VPN Gateway
# to be deployed first (see Task 2). Initially create without this flag,
# then update peerings after gateway deployment in Task 2.
# ============================================================
az network vnet peering create \
  --resource-group $RG \
  --name hub-to-web-eastus \
  --vnet-name vnet-hub-eastus \
  --remote-vnet vnet-spoke-web-eastus \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --allow-gateway-transit

az network vnet peering create \
  --resource-group $RG \
  --name web-to-hub-eastus \
  --vnet-name vnet-spoke-web-eastus \
  --remote-vnet vnet-hub-eastus \
  --allow-vnet-access \
  --allow-forwarded-traffic

az network vnet peering create \
  --resource-group $RG \
  --name hub-to-data-eastus \
  --vnet-name vnet-hub-eastus \
  --remote-vnet vnet-spoke-data-eastus \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --allow-gateway-transit

az network vnet peering create \
  --resource-group $RG \
  --name data-to-hub-eastus \
  --vnet-name vnet-spoke-data-eastus \
  --remote-vnet vnet-hub-eastus \
  --allow-vnet-access \
  --allow-forwarded-traffic

# PEERING - Hub to Spokes (West Europe)
az network vnet peering create \
  --resource-group $RG \
  --name hub-to-web-westeurope \
  --vnet-name vnet-hub-westeurope \
  --remote-vnet vnet-spoke-web-westeurope \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --allow-gateway-transit

az network vnet peering create \
  --resource-group $RG \
  --name web-to-hub-westeurope \
  --vnet-name vnet-spoke-web-westeurope \
  --remote-vnet vnet-hub-westeurope \
  --allow-vnet-access \
  --allow-forwarded-traffic

az network vnet peering create \
  --resource-group $RG \
  --name hub-to-data-westeurope \
  --vnet-name vnet-hub-westeurope \
  --remote-vnet vnet-spoke-data-westeurope \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --allow-gateway-transit

az network vnet peering create \
  --resource-group $RG \
  --name data-to-hub-westeurope \
  --vnet-name vnet-spoke-data-westeurope \
  --remote-vnet vnet-hub-westeurope \
  --allow-vnet-access \
  --allow-forwarded-traffic

# GLOBAL PEERING - Hub to Hub
az network vnet peering create \
  --resource-group $RG \
  --name hub-eastus-to-hub-westeurope \
  --vnet-name vnet-hub-eastus \
  --remote-vnet vnet-hub-westeurope \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --allow-gateway-transit

az network vnet peering create \
  --resource-group $RG \
  --name hub-westeurope-to-hub-eastus \
  --vnet-name vnet-hub-westeurope \
  --remote-vnet vnet-hub-eastus \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --allow-gateway-transit
```

### Azure PowerShell

```powershell
# Variables
$RG = "rg-contoso-capstone"
$LocationEast = "eastus"
$LocationWest = "westeurope"

# Create resource group
New-AzResourceGroup -Name $RG -Location $LocationEast

# East US Hub VNet
$fwSubnet = New-AzVirtualNetworkSubnetConfig -Name "AzureFirewallSubnet" -AddressPrefix "10.10.0.0/26"
$gwSubnet = New-AzVirtualNetworkSubnetConfig -Name "GatewaySubnet" -AddressPrefix "10.10.1.0/27"
$bastionSubnet = New-AzVirtualNetworkSubnetConfig -Name "AzureBastionSubnet" -AddressPrefix "10.10.2.0/26"
$nvaSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-nva" -AddressPrefix "10.10.3.0/24"
$sharedSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-shared" -AddressPrefix "10.10.4.0/24"

$hubEast = New-AzVirtualNetwork `
  -Name "vnet-hub-eastus" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -AddressPrefix "10.10.0.0/16" `
  -Subnet $fwSubnet, $gwSubnet, $bastionSubnet, $nvaSubnet, $sharedSubnet

# East US Web Spoke
$appgwSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-appgw" -AddressPrefix "10.11.0.0/24"
$webSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-web" -AddressPrefix "10.11.1.0/24"

$spokeWebEast = New-AzVirtualNetwork `
  -Name "vnet-spoke-web-eastus" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -AddressPrefix "10.11.0.0/16" `
  -Subnet $appgwSubnet, $webSubnet

# Create hub-to-spoke peering (East US)
Add-AzVirtualNetworkPeering `
  -Name "hub-to-web-eastus" `
  -VirtualNetwork $hubEast `
  -RemoteVirtualNetworkId $spokeWebEast.Id `
  -AllowForwardedTraffic `
  -AllowGatewayTransit

Add-AzVirtualNetworkPeering `
  -Name "web-to-hub-eastus" `
  -VirtualNetwork $spokeWebEast `
  -RemoteVirtualNetworkId $hubEast.Id `
  -AllowForwardedTraffic
```

### Etapas no portal

1. Navegue até **Virtual networks** e crie `vnet-hub-eastus` em East US com espaço de endereço 10.10.0.0/16
2. Adicione sub-redes: AzureFirewallSubnet (/26), GatewaySubnet (/27), AzureBastionSubnet (/26), snet-nva (/24), snet-shared (/24)
3. Repita para o hub West Europe e todas as VNets spoke
4. Navegue até cada VNet hub, selecione **Peerings** e crie peerings para cada spoke com "Allow gateway transit" habilitado no lado do hub (nota: habilite "Use remote gateways" no lado do spoke somente após implantar o VPN Gateway na Tarefa 2)
5. Crie peering global entre os dois hubs com "Allow forwarded traffic" e "Allow gateway transit" habilitados em ambos os lados

:::tip Nota sobre peering
O flag `--use-remote-gateways` nos peerings do spoke falhará até que um gateway seja realmente implantado no hub. Você pode criar esses peerings sem esse flag primeiro e depois atualizá-los após a Tarefa 2.
:::

---

## Tarefa 2: Conectividade híbrida -- VPN site-a-site com BGP

Implante um VPN Gateway ativo-ativo no hub East US com BGP habilitado e estabeleça conectividade com o datacenter local de NYC.

### Azure CLI

```bash
# Create two public IPs for active-active gateway (zone-redundant)
az network public-ip create \
  --resource-group $RG \
  --name pip-vpngw-eastus-1 \
  --location $LOCATION_EAST \
  --sku Standard \
  --allocation-method Static \
  --zone 1 2 3

az network public-ip create \
  --resource-group $RG \
  --name pip-vpngw-eastus-2 \
  --location $LOCATION_EAST \
  --sku Standard \
  --allocation-method Static \
  --zone 1 2 3

# Create VPN Gateway (active-active, zone-redundant, BGP enabled)
# Note: This takes 30-45 minutes to deploy
az network vnet-gateway create \
  --name vpngw-hub-eastus \
  --resource-group $RG \
  --vnet vnet-hub-eastus \
  --gateway-type Vpn \
  --vpn-type RouteBased \
  --sku VpnGw2AZ \
  --vpn-gateway-generation Generation2 \
  --public-ip-addresses pip-vpngw-eastus-1 pip-vpngw-eastus-2 \
  --asn 65010 \
  --no-wait

# Create Local Network Gateway for NYC datacenter
az network local-gateway create \
  --resource-group $RG \
  --name lgw-nyc-datacenter \
  --location $LOCATION_EAST \
  --gateway-ip-address 203.0.113.1 \
  --local-address-prefixes 192.168.0.0/16 \
  --asn 65001 \
  --bgp-peering-address 192.168.1.1

# Create S2S VPN connection with custom IPsec policy
az network vpn-connection create \
  --resource-group $RG \
  --name conn-eastus-to-nyc \
  --vnet-gateway1 vpngw-hub-eastus \
  --local-gateway2 lgw-nyc-datacenter \
  --location $LOCATION_EAST \
  --shared-key "C0nt0s0!SecureKey2024" \
  --enable-bgp

# Apply custom IPsec policy (IKEv2, AES256, SHA256, PFS2048)
az network vpn-connection ipsec-policy add \
  --resource-group $RG \
  --connection-name conn-eastus-to-nyc \
  --ike-encryption AES256 \
  --ike-integrity SHA256 \
  --dh-group DHGroup14 \
  --ipsec-encryption AES256 \
  --ipsec-integrity SHA256 \
  --pfs-group PFS2048 \
  --sa-lifetime 14400 \
  --sa-max-size 102400000
```

### Azure PowerShell

```powershell
# Create public IPs for active-active VPN gateway
$pip1 = New-AzPublicIpAddress `
  -Name "pip-vpngw-eastus-1" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -Sku Standard `
  -AllocationMethod Static `
  -Zone 1, 2, 3

$pip2 = New-AzPublicIpAddress `
  -Name "pip-vpngw-eastus-2" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -Sku Standard `
  -AllocationMethod Static `
  -Zone 1, 2, 3

# Get GatewaySubnet
$hubVnet = Get-AzVirtualNetwork -Name "vnet-hub-eastus" -ResourceGroupName $RG
$gwSubnet = Get-AzVirtualNetworkSubnetConfig -Name "GatewaySubnet" -VirtualNetwork $hubVnet

# Create IP configurations for active-active
$ipconfig1 = New-AzVirtualNetworkGatewayIpConfig -Name "gwipconfig1" -SubnetId $gwSubnet.Id -PublicIpAddressId $pip1.Id
$ipconfig2 = New-AzVirtualNetworkGatewayIpConfig -Name "gwipconfig2" -SubnetId $gwSubnet.Id -PublicIpAddressId $pip2.Id

# Create VPN Gateway (active-active with BGP)
New-AzVirtualNetworkGateway `
  -Name "vpngw-hub-eastus" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -IpConfigurations $ipconfig1, $ipconfig2 `
  -GatewayType Vpn `
  -VpnType RouteBased `
  -GatewaySku VpnGw2AZ `
  -VpnGatewayGeneration Generation2 `
  -EnableActiveActiveFeature `
  -EnableBgp $true `
  -Asn 65010

# Create Local Network Gateway
New-AzLocalNetworkGateway `
  -Name "lgw-nyc-datacenter" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -GatewayIpAddress "203.0.113.1" `
  -AddressPrefix "192.168.0.0/16" `
  -Asn 65001 `
  -BgpPeeringAddress "192.168.1.1"

# Create custom IPsec policy
$ipsecPolicy = New-AzIpsecPolicy `
  -IkeEncryption AES256 `
  -IkeIntegrity SHA256 `
  -DhGroup DHGroup14 `
  -IpsecEncryption AES256 `
  -IpsecIntegrity SHA256 `
  -PfsGroup PFS2048 `
  -SALifeTimeSeconds 14400 `
  -SADataSizeKilobytes 102400000

# Create VPN Connection with custom IPsec policy
$gateway = Get-AzVirtualNetworkGateway -Name "vpngw-hub-eastus" -ResourceGroupName $RG
$localGw = Get-AzLocalNetworkGateway -Name "lgw-nyc-datacenter" -ResourceGroupName $RG

New-AzVirtualNetworkGatewayConnection `
  -Name "conn-eastus-to-nyc" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -VirtualNetworkGateway1 $gateway `
  -LocalNetworkGateway2 $localGw `
  -ConnectionType IPsec `
  -SharedKey "C0nt0s0!SecureKey2024" `
  -EnableBgp $true `
  -IpsecPolicies $ipsecPolicy

# Update spoke peerings to use gateway transit (now that gateway exists)
$hubVnet = Get-AzVirtualNetwork -Name "vnet-hub-eastus" -ResourceGroupName $RG
$spokeWeb = Get-AzVirtualNetwork -Name "vnet-spoke-web-eastus" -ResourceGroupName $RG
$spokeData = Get-AzVirtualNetwork -Name "vnet-spoke-data-eastus" -ResourceGroupName $RG

# Update spoke-to-hub peerings
$peerWebToHub = Get-AzVirtualNetworkPeering -VirtualNetworkName "vnet-spoke-web-eastus" -ResourceGroupName $RG -Name "web-to-hub-eastus"
$peerWebToHub.UseRemoteGateways = $true
Set-AzVirtualNetworkPeering -VirtualNetworkPeering $peerWebToHub

$peerDataToHub = Get-AzVirtualNetworkPeering -VirtualNetworkName "vnet-spoke-data-eastus" -ResourceGroupName $RG -Name "data-to-hub-eastus"
$peerDataToHub.UseRemoteGateways = $true
Set-AzVirtualNetworkPeering -VirtualNetworkPeering $peerDataToHub
```

### Etapas no portal

1. Navegue até **Virtual network gateways** e crie com: VNet = vnet-hub-eastus, SKU = VpnGw2AZ, Generation = Generation2, Active-active = Enabled, Configure BGP = Yes, ASN = 65010
2. Crie um **Local network gateway** com o IP público do datacenter NYC e o espaço de endereço local
3. Crie uma **Connection** do tipo Site-to-site, habilite BGP e configure a política IPsec/IKE personalizada

### Pós-gateway: Habilitar use-remote-gateways nos peerings do spoke

Após o VPN Gateway ser provisionado, atualize os peerings do spoke para usar o gateway do hub:

```bash
# Enable use-remote-gateways on spoke peerings (East US)
az network vnet peering update \
  --resource-group $RG \
  --name web-to-hub-eastus \
  --vnet-name vnet-spoke-web-eastus \
  --set useRemoteGateways=true

az network vnet peering update \
  --resource-group $RG \
  --name data-to-hub-eastus \
  --vnet-name vnet-spoke-data-eastus \
  --set useRemoteGateways=true

# Note: West Europe spokes do NOT set useRemoteGateways because no gateway exists
# in the West Europe hub. West Europe spokes reach on-premises via UDR through
# West Europe Firewall → global peering → East US hub → VPN Gateway.
# Gateway transit is only configured on East US spokes.
```

---

## Tarefa 3: Segurança centralizada -- Azure Firewall com hierarquia de políticas

Implante o Azure Firewall em cada hub com uma hierarquia de políticas pai-filho para gerenciamento centralizado de regras.

### Azure CLI

```bash
# Create parent firewall policy (baseline rules)
az network firewall policy create \
  --resource-group $RG \
  --name fwpolicy-parent-baseline \
  --location $LOCATION_EAST \
  --sku Standard

# Enable DNS proxy (required for FQDN-based network rules)
az network firewall policy update \
  --resource-group $RG \
  --name fwpolicy-parent-baseline \
  --enable-dns-proxy true

# Create child policy for East US (inherits from parent)
az network firewall policy create \
  --resource-group $RG \
  --name fwpolicy-child-eastus \
  --location $LOCATION_EAST \
  --sku Standard \
  --base-policy fwpolicy-parent-baseline

# Create child policy for West Europe (inherits from parent)
az network firewall policy create \
  --resource-group $RG \
  --name fwpolicy-child-westeurope \
  --location $LOCATION_WEST \
  --sku Standard \
  --base-policy fwpolicy-parent-baseline

# Add baseline network rules to parent policy (DNS, NTP)
az network firewall policy rule-collection-group create \
  --resource-group $RG \
  --policy-name fwpolicy-parent-baseline \
  --name DefaultNetworkRuleCollectionGroup \
  --priority 200

az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name fwpolicy-parent-baseline \
  --rule-collection-group-name DefaultNetworkRuleCollectionGroup \
  --name allow-dns-ntp \
  --collection-priority 100 \
  --action Allow \
  --rule-type NetworkRule \
  --rule-name allow-dns \
  --source-addresses "10.0.0.0/8" \
  --destination-addresses "*" \
  --ip-protocols UDP TCP \
  --destination-ports 53

az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name fwpolicy-parent-baseline \
  --rule-collection-group-name DefaultNetworkRuleCollectionGroup \
  --name allow-ntp \
  --collection-priority 110 \
  --action Allow \
  --rule-type NetworkRule \
  --rule-name allow-ntp \
  --source-addresses "10.0.0.0/8" \
  --destination-fqdns "ntp.ubuntu.com" "time.windows.com" \
  --ip-protocols UDP \
  --destination-ports 123

# Add application rules to East US child policy
az network firewall policy rule-collection-group create \
  --resource-group $RG \
  --policy-name fwpolicy-child-eastus \
  --name DefaultApplicationRuleCollectionGroup \
  --priority 300

az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name fwpolicy-child-eastus \
  --rule-collection-group-name DefaultApplicationRuleCollectionGroup \
  --name allow-web-eastus \
  --collection-priority 100 \
  --action Allow \
  --rule-type ApplicationRule \
  --rule-name allow-microsoft \
  --source-addresses "10.10.0.0/16" "10.11.0.0/16" "10.12.0.0/16" \
  --protocols Https=443 \
  --target-fqdns "*.microsoft.com" "*.azure.com" "*.windows.net"

# Add DNAT rule for published services in East US
az network firewall policy rule-collection-group create \
  --resource-group $RG \
  --policy-name fwpolicy-child-eastus \
  --name DefaultDnatRuleCollectionGroup \
  --priority 100

# Deploy Azure Firewall in East US hub
az network public-ip create \
  --resource-group $RG \
  --name pip-azfw-eastus \
  --location $LOCATION_EAST \
  --sku Standard \
  --allocation-method Static

az network firewall create \
  --resource-group $RG \
  --name azfw-hub-eastus \
  --location $LOCATION_EAST \
  --sku AZFW_VNet \
  --tier Standard \
  --firewall-policy fwpolicy-child-eastus

az network firewall ip-config create \
  --resource-group $RG \
  --firewall-name azfw-hub-eastus \
  --name azfw-ipconfig \
  --public-ip-address pip-azfw-eastus \
  --vnet-name vnet-hub-eastus

# Deploy Azure Firewall in West Europe hub
az network public-ip create \
  --resource-group $RG \
  --name pip-azfw-westeurope \
  --location $LOCATION_WEST \
  --sku Standard \
  --allocation-method Static

az network firewall create \
  --resource-group $RG \
  --name azfw-hub-westeurope \
  --location $LOCATION_WEST \
  --sku AZFW_VNet \
  --tier Standard \
  --firewall-policy fwpolicy-child-westeurope

az network firewall ip-config create \
  --resource-group $RG \
  --firewall-name azfw-hub-westeurope \
  --name azfw-ipconfig \
  --public-ip-address pip-azfw-westeurope \
  --vnet-name vnet-hub-westeurope

# Get firewall private IPs for UDR configuration
AZFW_EAST_IP=$(az network firewall show \
  --resource-group $RG \
  --name azfw-hub-eastus \
  --query "ipConfigurations[0].privateIpAddress" -o tsv)

AZFW_WEST_IP=$(az network firewall show \
  --resource-group $RG \
  --name azfw-hub-westeurope \
  --query "ipConfigurations[0].privateIpAddress" -o tsv)

# Create UDRs for East US spokes (force traffic through firewall)
az network route-table create \
  --resource-group $RG \
  --name rt-spoke-eastus \
  --location $LOCATION_EAST

az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-eastus \
  --name default-to-firewall \
  --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address $AZFW_EAST_IP

az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-eastus \
  --name to-westeurope-spokes \
  --address-prefix 10.20.0.0/14 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address $AZFW_EAST_IP

# Associate UDR with spoke subnets
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-spoke-web-eastus \
  --name snet-web \
  --route-table rt-spoke-eastus

az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-spoke-data-eastus \
  --name snet-data \
  --route-table rt-spoke-eastus
```

### Azure PowerShell

```powershell
# Create parent firewall policy
$parentPolicy = New-AzFirewallPolicy `
  -Name "fwpolicy-parent-baseline" `
  -ResourceGroupName $RG `
  -Location $LocationEast

# Create child policy inheriting from parent
$childPolicyEast = New-AzFirewallPolicy `
  -Name "fwpolicy-child-eastus" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -BasePolicy $parentPolicy.Id

# Create Azure Firewall
$pip = New-AzPublicIpAddress `
  -Name "pip-azfw-eastus" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -Sku Standard `
  -AllocationMethod Static

$hubVnet = Get-AzVirtualNetwork -Name "vnet-hub-eastus" -ResourceGroupName $RG

$azfw = New-AzFirewall `
  -Name "azfw-hub-eastus" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -VirtualNetwork $hubVnet `
  -PublicIpAddress $pip `
  -FirewallPolicyId $childPolicyEast.Id

# Create UDR
$fwPrivateIp = $azfw.IpConfigurations[0].PrivateIpAddress
$route = New-AzRouteConfig -Name "default-to-firewall" `
  -AddressPrefix "0.0.0.0/0" `
  -NextHopType VirtualAppliance `
  -NextHopIpAddress $fwPrivateIp

$routeTable = New-AzRouteTable `
  -Name "rt-spoke-eastus" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -Route $route
```

---

## Tarefa 4: Entrega de aplicativos web -- Application Gateway com WAF

Implante o Application Gateway WAF_v2 em cada região com listeners multi-site e roteamento baseado em caminho.

### Azure CLI

```bash
# Create WAF policy for East US Application Gateway
az network application-gateway waf-policy create \
  --resource-group $RG \
  --name wafpolicy-appgw-eastus \
  --location $LOCATION_EAST \
  --type OWASP \
  --version 3.2

# Create custom WAF rule for rate limiting
az network application-gateway waf-policy custom-rule create \
  --policy-name wafpolicy-appgw-eastus \
  --resource-group $RG \
  --action Block \
  --name RateLimitByClientIP \
  --priority 90 \
  --rule-type RateLimitRule \
  --rate-limit-threshold 100 \
  --group-by-user-session '[{"groupByVariables":[{"variableName":"ClientAddr"}]}]'

az network application-gateway waf-policy custom-rule match-condition add \
  --policy-name wafpolicy-appgw-eastus \
  --resource-group $RG \
  --name RateLimitByClientIP \
  --match-variables RemoteAddr \
  --operator IPMatch \
  --values "255.255.255.255/32" \
  --negate true

# Create custom WAF rule for geo-blocking
az network application-gateway waf-policy custom-rule create \
  --policy-name wafpolicy-appgw-eastus \
  --resource-group $RG \
  --action Block \
  --name GeoBlockRule \
  --priority 95 \
  --rule-type MatchRule

az network application-gateway waf-policy custom-rule match-condition add \
  --policy-name wafpolicy-appgw-eastus \
  --resource-group $RG \
  --name GeoBlockRule \
  --match-variables RemoteAddr \
  --operator GeoMatch \
  --values "CN" "RU" "KP"

# Create public IP for Application Gateway
az network public-ip create \
  --resource-group $RG \
  --name pip-appgw-eastus \
  --location $LOCATION_EAST \
  --sku Standard \
  --allocation-method Static

# Create Application Gateway WAF_v2
az network application-gateway create \
  --resource-group $RG \
  --name appgw-web-eastus \
  --location $LOCATION_EAST \
  --vnet-name vnet-spoke-web-eastus \
  --subnet snet-appgw \
  --sku WAF_v2 \
  --capacity 2 \
  --public-ip-address pip-appgw-eastus \
  --http-settings-cookie-based-affinity Disabled \
  --frontend-port 80 \
  --http-settings-port 80 \
  --http-settings-protocol Http \
  --waf-policy wafpolicy-appgw-eastus \
  --priority 100

# Add backend pools for path-based routing
az network application-gateway address-pool create \
  --resource-group $RG \
  --gateway-name appgw-web-eastus \
  --name pool-api \
  --servers 10.11.1.4 10.11.1.5

az network application-gateway address-pool create \
  --resource-group $RG \
  --gateway-name appgw-web-eastus \
  --name pool-web \
  --servers 10.11.1.6 10.11.1.7

# Create URL path map for path-based routing
az network application-gateway url-path-map create \
  --resource-group $RG \
  --gateway-name appgw-web-eastus \
  --name pathmap-contoso \
  --paths "/api/*" \
  --address-pool pool-api \
  --http-settings appGatewayBackendHttpSettings \
  --default-address-pool pool-web \
  --default-http-settings appGatewayBackendHttpSettings

# Create path-based routing rule
az network application-gateway rule create \
  --resource-group $RG \
  --gateway-name appgw-web-eastus \
  --name rule-pathbased \
  --priority 200 \
  --http-listener appGatewayHttpListener \
  --rule-type PathBasedRouting \
  --url-path-map pathmap-contoso \
  --address-pool pool-web
```

### Azure PowerShell

```powershell
# Create WAF policy
$policySetting = New-AzApplicationGatewayFirewallPolicySetting `
  -Mode Prevention `
  -State Enabled `
  -MaxRequestBodySizeInKb 128 `
  -MaxFileUploadInMb 100

$managedRuleSet = New-AzApplicationGatewayFirewallPolicyManagedRuleSet `
  -RuleSetType "OWASP" `
  -RuleSetVersion "3.2"

$managedRules = New-AzApplicationGatewayFirewallPolicyManagedRule `
  -ManagedRuleSet $managedRuleSet

$wafPolicy = New-AzApplicationGatewayFirewallPolicy `
  -Name "wafpolicy-appgw-eastus" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -PolicySetting $policySetting `
  -ManagedRule $managedRules

# Create Application Gateway with WAF_v2 SKU
$sku = New-AzApplicationGatewaySku -Name WAF_v2 -Tier WAF_v2 -Capacity 2

$pip = New-AzPublicIpAddress `
  -Name "pip-appgw-eastus" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -Sku Standard `
  -AllocationMethod Static
```

### Etapas no portal

1. Crie uma **WAF policy** com regras gerenciadas OWASP 3.2 no modo Prevention
2. Adicione regras personalizadas para limitação de taxa (tipo RateLimitRule, limite 100/min) e bloqueio geográfico
3. Crie o **Application Gateway** com SKU WAF_v2 na sub-rede do spoke web
4. Configure listeners multi-site para api.contoso.com e app.contoso.com
5. Configure roteamento baseado em caminho: /api/* para pool de backend da API, /* para pool de backend web

---

## Tarefa 5: Balanceamento de carga global -- Azure Front Door Premium

Crie o Azure Front Door Premium para distribuição global de tráfego com health probes e failover.

### Azure CLI

```bash
# Create Azure Front Door Premium profile
az afd profile create \
  --resource-group $RG \
  --profile-name afd-contoso-global \
  --sku Premium_AzureFrontDoor

# Create endpoint
az afd endpoint create \
  --resource-group $RG \
  --profile-name afd-contoso-global \
  --endpoint-name contoso-trading

# Create origin group with health probes
az afd origin-group create \
  --resource-group $RG \
  --origin-group-name og-appgw-global \
  --profile-name afd-contoso-global \
  --probe-request-type GET \
  --probe-protocol Https \
  --probe-interval-in-seconds 30 \
  --probe-path /health \
  --sample-size 4 \
  --successful-samples-required 3 \
  --additional-latency-in-milliseconds 50

# Add East US origin (primary, priority 1)
az afd origin create \
  --resource-group $RG \
  --origin-group-name og-appgw-global \
  --profile-name afd-contoso-global \
  --origin-name origin-eastus \
  --host-name appgw-eastus.contoso.com \
  --origin-host-header appgw-eastus.contoso.com \
  --http-port 80 \
  --https-port 443 \
  --priority 1 \
  --weight 1000 \
  --enabled-state Enabled

# Add West Europe origin (secondary, priority 2)
az afd origin create \
  --resource-group $RG \
  --origin-group-name og-appgw-global \
  --profile-name afd-contoso-global \
  --origin-name origin-westeurope \
  --host-name appgw-westeurope.contoso.com \
  --origin-host-header appgw-westeurope.contoso.com \
  --http-port 80 \
  --https-port 443 \
  --priority 2 \
  --weight 1000 \
  --enabled-state Enabled

# Create route
az afd route create \
  --resource-group $RG \
  --profile-name afd-contoso-global \
  --endpoint-name contoso-trading \
  --route-name route-default \
  --origin-group og-appgw-global \
  --supported-protocols Http Https \
  --https-redirect Enabled \
  --forwarding-protocol MatchRequest \
  --link-to-default-domain Enabled

# Enable caching for static content
az afd route update \
  --resource-group $RG \
  --profile-name afd-contoso-global \
  --endpoint-name contoso-trading \
  --route-name route-default \
  --enable-caching true \
  --query-string-caching-behavior IgnoreQueryString
```

### Azure PowerShell

```powershell
# Create Front Door Premium profile
New-AzFrontDoorCdnProfile `
  -ResourceGroupName $RG `
  -ProfileName "afd-contoso-global" `
  -SkuName "Premium_AzureFrontDoor" `
  -Location "Global"

# Create endpoint
New-AzFrontDoorCdnEndpoint `
  -ResourceGroupName $RG `
  -ProfileName "afd-contoso-global" `
  -EndpointName "contoso-trading" `
  -Location "Global"

# Create origin group with health probes
$healthProbe = New-AzFrontDoorCdnOriginGroupHealthProbeSettingObject `
  -ProbeIntervalInSecond 30 `
  -ProbePath "/health" `
  -ProbeProtocol Https `
  -ProbeRequestType GET

$loadBalancing = New-AzFrontDoorCdnOriginGroupLoadBalancingSettingObject `
  -AdditionalLatencyInMillisecond 50 `
  -SampleSize 4 `
  -SuccessfulSamplesRequired 3

New-AzFrontDoorCdnOriginGroup `
  -ResourceGroupName $RG `
  -ProfileName "afd-contoso-global" `
  -OriginGroupName "og-appgw-global" `
  -HealthProbeSetting $healthProbe `
  -LoadBalancingSetting $loadBalancing
```

### Etapas no portal

1. Crie **Front Door and CDN profiles** com o tier Premium
2. Adicione um endpoint chamado "contoso-trading"
3. Crie um grupo de origem com caminho de health probe /health (HTTPS, intervalo de 30s)
4. Adicione a origem East US com prioridade 1 e a origem West Europe com prioridade 2
5. Crie uma rota vinculando o endpoint ao grupo de origem com redirecionamento HTTPS e cache habilitado

---

## Tarefa 6: Acesso privado -- Private Endpoints para serviços PaaS

Crie Private Endpoints para Azure SQL, Storage e Key Vault com integração DNS adequada.

### Azure CLI

```bash
# Create PaaS resources (simplified for lab)
az sql server create \
  --resource-group $RG \
  --name sql-contoso-eastus-001 \
  --location $LOCATION_EAST \
  --admin-user sqladmin \
  --admin-password "P@ssw0rd2024!Secure"

az storage account create \
  --resource-group $RG \
  --name stcontosoeastus001 \
  --location $LOCATION_EAST \
  --sku Standard_LRS

az keyvault create \
  --resource-group $RG \
  --name kv-contoso-eastus-001 \
  --location $LOCATION_EAST

# Create Private DNS Zones
az network private-dns zone create \
  --resource-group $RG \
  --name "privatelink.database.windows.net"

az network private-dns zone create \
  --resource-group $RG \
  --name "privatelink.blob.core.windows.net"

az network private-dns zone create \
  --resource-group $RG \
  --name "privatelink.file.core.windows.net"

az network private-dns zone create \
  --resource-group $RG \
  --name "privatelink.vaultcore.azure.net"

# Link DNS zones to ALL VNets
for VNET in vnet-hub-eastus vnet-spoke-web-eastus vnet-spoke-data-eastus \
            vnet-hub-westeurope vnet-spoke-web-westeurope vnet-spoke-data-westeurope; do
  for ZONE in "privatelink.database.windows.net" "privatelink.blob.core.windows.net" \
              "privatelink.file.core.windows.net" "privatelink.vaultcore.azure.net"; do
    LINK_NAME="${VNET}-${ZONE//\./-}"
    az network private-dns link vnet create \
      --resource-group $RG \
      --zone-name "$ZONE" \
      --name "$LINK_NAME" \
      --virtual-network "$VNET" \
      --registration-enabled false
  done
done

# Create Private Endpoint for SQL Server
SQL_ID=$(az sql server show \
  --resource-group $RG \
  --name sql-contoso-eastus-001 \
  --query id -o tsv)

az network private-endpoint create \
  --resource-group $RG \
  --name pe-sql-eastus \
  --location $LOCATION_EAST \
  --vnet-name vnet-spoke-data-eastus \
  --subnet snet-pe \
  --private-connection-resource-id $SQL_ID \
  --group-id sqlServer \
  --connection-name pec-sql-eastus

az network private-endpoint dns-zone-group create \
  --resource-group $RG \
  --endpoint-name pe-sql-eastus \
  --name sqlZoneGroup \
  --private-dns-zone "privatelink.database.windows.net" \
  --zone-name sql

# Create Private Endpoint for Storage (Blob)
STORAGE_ID=$(az storage account show \
  --resource-group $RG \
  --name stcontosoeastus001 \
  --query id -o tsv)

az network private-endpoint create \
  --resource-group $RG \
  --name pe-blob-eastus \
  --location $LOCATION_EAST \
  --vnet-name vnet-spoke-data-eastus \
  --subnet snet-pe \
  --private-connection-resource-id $STORAGE_ID \
  --group-id blob \
  --connection-name pec-blob-eastus

az network private-endpoint dns-zone-group create \
  --resource-group $RG \
  --endpoint-name pe-blob-eastus \
  --name blobZoneGroup \
  --private-dns-zone "privatelink.blob.core.windows.net" \
  --zone-name blob

# Create Private Endpoint for Key Vault
KV_ID=$(az keyvault show \
  --resource-group $RG \
  --name kv-contoso-eastus-001 \
  --query id -o tsv)

az network private-endpoint create \
  --resource-group $RG \
  --name pe-kv-eastus \
  --location $LOCATION_EAST \
  --vnet-name vnet-spoke-data-eastus \
  --subnet snet-pe \
  --private-connection-resource-id $KV_ID \
  --group-id vault \
  --connection-name pec-kv-eastus

az network private-endpoint dns-zone-group create \
  --resource-group $RG \
  --endpoint-name pe-kv-eastus \
  --name kvZoneGroup \
  --private-dns-zone "privatelink.vaultcore.azure.net" \
  --zone-name vault
```

### Azure PowerShell

```powershell
# Create Private DNS Zone and link
$zone = New-AzPrivateDnsZone `
  -ResourceGroupName $RG `
  -Name "privatelink.database.windows.net"

$hubVnet = Get-AzVirtualNetwork -Name "vnet-hub-eastus" -ResourceGroupName $RG

New-AzPrivateDnsVirtualNetworkLink `
  -ResourceGroupName $RG `
  -ZoneName "privatelink.database.windows.net" `
  -Name "link-hub-eastus" `
  -VirtualNetworkId $hubVnet.Id `
  -EnableRegistration $false

# Create Private Endpoint for SQL
$sqlServer = Get-AzSqlServer -ResourceGroupName $RG -ServerName "sql-contoso-eastus-001"
$dataVnet = Get-AzVirtualNetwork -Name "vnet-spoke-data-eastus" -ResourceGroupName $RG
$peSubnet = Get-AzVirtualNetworkSubnetConfig -Name "snet-pe" -VirtualNetwork $dataVnet

$peLinkConfig = New-AzPrivateLinkServiceConnection `
  -Name "pec-sql-eastus" `
  -PrivateLinkServiceId $sqlServer.ResourceId `
  -GroupId "sqlServer"

$pe = New-AzPrivateEndpoint `
  -Name "pe-sql-eastus" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -Subnet $peSubnet `
  -PrivateLinkServiceConnection $peLinkConfig

# Create DNS zone group
$dnsZone = Get-AzPrivateDnsZone -ResourceGroupName $RG -Name "privatelink.database.windows.net"
$config = New-AzPrivateDnsZoneConfig -Name "sql" -PrivateDnsZoneId $dnsZone.ResourceId

New-AzPrivateDnsZoneGroup `
  -ResourceGroupName $RG `
  -PrivateEndpointName "pe-sql-eastus" `
  -Name "sqlZoneGroup" `
  -PrivateDnsZoneConfig $config
```

### Etapas no portal

1. Crie zonas de DNS privado para cada serviço (database.windows.net, blob.core.windows.net, vaultcore.azure.net)
2. Vincule cada zona DNS a TODAS as VNets em ambas as regiões
3. Crie Private Endpoints na sub-rede de dados do spoke, selecionando o sub-recurso apropriado (sqlServer, blob, vault)
4. Verifique se os grupos de zona DNS são criados automaticamente

:::warning Etapa crítica de DNS
Cada VNet que precisa resolver FQDNs de Private Endpoint deve ter a zona DNS privada correspondente vinculada a ela. Links ausentes são a causa mais comum de falhas de resolução.
:::

---

## Tarefa 7: DNS híbrido -- Azure DNS Private Resolver

Implante um DNS Private Resolver no hub East US para resolução DNS bidirecional entre o Azure e o ambiente local.

### Azure CLI

```bash
# Create DNS Private Resolver
az dns-resolver create \
  --name resolver-hub-eastus \
  --resource-group $RG \
  --location $LOCATION_EAST \
  --id "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Network/virtualNetworks/vnet-hub-eastus"

# Create inbound endpoint (on-premises queries Azure DNS)
az dns-resolver inbound-endpoint create \
  --name endpoint-inbound \
  --dns-resolver-name resolver-hub-eastus \
  --resource-group $RG \
  --location $LOCATION_EAST \
  --ip-configurations "[{\"private-ip-allocation-method\":\"Dynamic\",\"id\":\"/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Network/virtualNetworks/vnet-hub-eastus/subnets/snet-dns-inbound\"}]"

# Create outbound endpoint (Azure forwards to on-premises DNS)
az dns-resolver outbound-endpoint create \
  --name endpoint-outbound \
  --dns-resolver-name resolver-hub-eastus \
  --resource-group $RG \
  --location $LOCATION_EAST \
  --id "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Network/virtualNetworks/vnet-hub-eastus/subnets/snet-dns-outbound"

# Create forwarding ruleset
az dns-resolver forwarding-ruleset create \
  --name ruleset-to-onprem \
  --resource-group $RG \
  --location $LOCATION_EAST \
  --outbound-endpoints "[{\"id\":\"/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Network/dnsResolvers/resolver-hub-eastus/outboundEndpoints/endpoint-outbound\"}]"

# Create forwarding rule for on-premises domain
az dns-resolver forwarding-rule create \
  --name rule-contoso-onprem \
  --ruleset-name ruleset-to-onprem \
  --resource-group $RG \
  --domain-name "corp.contoso.com." \
  --forwarding-rule-state Enabled \
  --target-dns-servers "[{\"ip-address\":\"192.168.1.10\",\"port\":53},{\"ip-address\":\"192.168.1.11\",\"port\":53}]"

# Link forwarding ruleset to hub VNet
az dns-resolver vnet-link create \
  --name link-hub-eastus \
  --ruleset-name ruleset-to-onprem \
  --resource-group $RG \
  --id "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Network/virtualNetworks/vnet-hub-eastus"
```

### Azure PowerShell

```powershell
# Create DNS Resolver
$hubVnet = Get-AzVirtualNetwork -Name "vnet-hub-eastus" -ResourceGroupName $RG

New-AzDnsResolver `
  -Name "resolver-hub-eastus" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -VirtualNetworkId $hubVnet.Id

# Create inbound endpoint
$inboundSubnet = Get-AzVirtualNetworkSubnetConfig -Name "snet-dns-inbound" -VirtualNetwork $hubVnet
$ipconfig = New-AzDnsResolverIPConfigurationObject `
  -PrivateIPAllocationMethod Dynamic `
  -SubnetId $inboundSubnet.Id

New-AzDnsResolverInboundEndpoint `
  -DnsResolverName "resolver-hub-eastus" `
  -Name "endpoint-inbound" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -IpConfiguration $ipconfig

# Create outbound endpoint
$outboundSubnet = Get-AzVirtualNetworkSubnetConfig -Name "snet-dns-outbound" -VirtualNetwork $hubVnet

New-AzDnsResolverOutboundEndpoint `
  -DnsResolverName "resolver-hub-eastus" `
  -Name "endpoint-outbound" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -SubnetId $outboundSubnet.Id

# Create forwarding ruleset
$outboundEp = Get-AzDnsResolverOutboundEndpoint `
  -DnsResolverName "resolver-hub-eastus" `
  -Name "endpoint-outbound" `
  -ResourceGroupName $RG

New-AzDnsForwardingRuleset `
  -Name "ruleset-to-onprem" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -DnsResolverOutboundEndpoint @(@{Id = $outboundEp.Id})

# Create forwarding rules
$targetDns1 = New-AzDnsResolverTargetDnsServerObject -IPAddress "192.168.1.10" -Port 53
$targetDns2 = New-AzDnsResolverTargetDnsServerObject -IPAddress "192.168.1.11" -Port 53

New-AzDnsForwardingRulesetForwardingRule `
  -ResourceGroupName $RG `
  -DnsForwardingRulesetName "ruleset-to-onprem" `
  -Name "rule-contoso-onprem" `
  -DomainName "corp.contoso.com." `
  -ForwardingRuleState "Enabled" `
  -TargetDnsServer @($targetDns1, $targetDns2)
```

### Etapas no portal

1. Navegue até **DNS Private Resolvers** e crie em vnet-hub-eastus
2. Adicione um endpoint de entrada em snet-dns-inbound (anote o IP atribuído para encaminhamento DNS local)
3. Adicione um endpoint de saída em snet-dns-outbound
4. Crie um conjunto de regras de encaminhamento DNS vinculado ao endpoint de saída
5. Adicione uma regra de encaminhamento para "corp.contoso.com." apontando para os servidores DNS locais (192.168.1.10, 192.168.1.11)
6. Vincule o conjunto de regras à VNet hub

:::tip Fluxo de resolução DNS
- Local para Azure: Configure o DNS local para encaminhar zonas privadas do Azure para o IP do endpoint de entrada
- Azure para local: O conjunto de regras de encaminhamento direciona consultas corp.contoso.com para o DNS local via endpoint de saída
:::

---

## Tarefa 8: Proteção contra DDoS

Habilite a DDoS IP Protection em recursos públicos para proteção econômica no laboratório.

### Azure CLI

```bash
# Create public IP for Application Gateway (West Europe) if not already created
az network public-ip create \
  --resource-group $RG \
  --name pip-appgw-westeurope \
  --location $LOCATION_WEST \
  --sku Standard \
  --allocation-method Static

# Enable DDoS IP Protection on Application Gateway public IP (East US)
az network public-ip update \
  --resource-group $RG \
  --name pip-appgw-eastus \
  --ddos-protection-mode Enabled

# Enable DDoS IP Protection on Application Gateway public IP (West Europe)
az network public-ip update \
  --resource-group $RG \
  --name pip-appgw-westeurope \
  --ddos-protection-mode Enabled

# Verify DDoS protection status
az network public-ip show \
  --resource-group $RG \
  --name pip-appgw-eastus \
  --query "{name:name, ddosProtectionMode:ddosSettings.protectionMode}" -o table
```

### Azure PowerShell

```powershell
# Enable DDoS IP Protection on existing public IP
$pip = Get-AzPublicIpAddress -Name "pip-appgw-eastus" -ResourceGroupName $RG
$pip.DdosSettings.ProtectionMode = "Enabled"
Set-AzPublicIpAddress -PublicIpAddress $pip

# Create a new public IP with DDoS IP Protection enabled
New-AzPublicIpAddress `
  -Name "pip-appgw-westeurope" `
  -ResourceGroupName $RG `
  -Location $LocationWest `
  -Sku Standard `
  -AllocationMethod Static `
  -DdosProtectionMode Enabled
```

### Etapas no portal

1. Navegue até o recurso de IP público do Application Gateway
2. Em **Properties**, defina o modo de proteção DDoS para **IP Protection enabled**
3. Repita para todos os IPs públicos

:::info DDoS IP Protection vs Network Protection
DDoS IP Protection custa ~$199/mês por IP protegido. DDoS Network Protection custa ~$2.944/mês pelo plano (cobre todos os IPs em VNets vinculadas). Para fins de laboratório, IP Protection é significativamente mais econômico ao proteger apenas alguns IPs.
:::

---

## Tarefa 9: Monitoramento e governança

Habilite VNet Flow Logs, Traffic Analytics e implante o Azure Virtual Network Manager para governança centralizada.

### Azure CLI

```bash
# Create Log Analytics workspace for Traffic Analytics
az monitor log-analytics workspace create \
  --resource-group $RG \
  --workspace-name law-contoso-networking \
  --location $LOCATION_EAST

# Create storage account for flow logs
az storage account create \
  --resource-group $RG \
  --name stflowlogscontoso001 \
  --location $LOCATION_EAST \
  --sku Standard_LRS

# Create VNet Flow Log for East US hub
az network watcher flow-log create \
  --location $LOCATION_EAST \
  --name flowlog-hub-eastus \
  --resource-group $RG \
  --vnet vnet-hub-eastus \
  --storage-account stflowlogscontoso001 \
  --traffic-analytics true \
  --workspace law-contoso-networking \
  --interval 10

# Create VNet Flow Log for East US web spoke
az network watcher flow-log create \
  --location $LOCATION_EAST \
  --name flowlog-spoke-web-eastus \
  --resource-group $RG \
  --vnet vnet-spoke-web-eastus \
  --storage-account stflowlogscontoso001 \
  --traffic-analytics true \
  --workspace law-contoso-networking \
  --interval 10

# ============================================================
# Azure Virtual Network Manager (AVNM)
# ============================================================
SUB_ID=$(az account show --query id -o tsv)

# Create AVNM instance
az network manager create \
  --location $LOCATION_EAST \
  --name avnm-contoso-global \
  --resource-group $RG \
  --scope-accesses "Connectivity" "SecurityAdmin" \
  --network-manager-scopes subscriptions="/subscriptions/$SUB_ID"

# Create network group with dynamic membership (tag-based)
az network manager group create \
  --name ng-all-spokes \
  --network-manager-name avnm-contoso-global \
  --resource-group $RG \
  --description "All spoke VNets tagged with role=spoke"

# Add static members (dynamic membership requires Azure Policy configuration)
for VNET in vnet-spoke-web-eastus vnet-spoke-data-eastus vnet-spoke-web-westeurope vnet-spoke-data-westeurope; do
  az network manager group static-member create \
    --network-group-name ng-all-spokes \
    --network-manager-name avnm-contoso-global \
    --resource-group $RG \
    --static-member-name "member-$VNET" \
    --resource-id "/subscriptions/$SUB_ID/resourceGroups/$RG/providers/Microsoft.Network/virtualNetworks/$VNET"
done

# Create security admin configuration
az network manager security-admin-config create \
  --configuration-name secadmin-deny-direct-access \
  --network-manager-name avnm-contoso-global \
  --resource-group $RG

# Create rule collection
az network manager security-admin-config rule-collection create \
  --configuration-name secadmin-deny-direct-access \
  --network-manager-name avnm-contoso-global \
  --resource-group $RG \
  --rule-collection-name rc-deny-rdp-ssh \
  --applies-to-groups network-group-id="/subscriptions/$SUB_ID/resourceGroups/$RG/providers/Microsoft.Network/networkManagers/avnm-contoso-global/networkGroups/ng-all-spokes"

# Create security admin rule to deny direct RDP
az network manager security-admin-config rule-collection rule create \
  --configuration-name secadmin-deny-direct-access \
  --network-manager-name avnm-contoso-global \
  --resource-group $RG \
  --rule-collection-name rc-deny-rdp-ssh \
  --rule-name deny-rdp-from-internet \
  --kind Custom \
  --protocol Tcp \
  --access Deny \
  --priority 100 \
  --direction Inbound \
  --sources "[{\"addressPrefix\":\"Internet\",\"addressPrefixType\":\"ServiceTag\"}]" \
  --destinations "[{\"addressPrefix\":\"*\",\"addressPrefixType\":\"IPPrefix\"}]" \
  --dest-port-ranges 3389

# Create security admin rule to deny direct SSH
az network manager security-admin-config rule-collection rule create \
  --configuration-name secadmin-deny-direct-access \
  --network-manager-name avnm-contoso-global \
  --resource-group $RG \
  --rule-collection-name rc-deny-rdp-ssh \
  --rule-name deny-ssh-from-internet \
  --kind Custom \
  --protocol Tcp \
  --access Deny \
  --priority 110 \
  --direction Inbound \
  --sources "[{\"addressPrefix\":\"Internet\",\"addressPrefixType\":\"ServiceTag\"}]" \
  --destinations "[{\"addressPrefix\":\"*\",\"addressPrefixType\":\"IPPrefix\"}]" \
  --dest-port-ranges 22

# Deploy the security admin configuration
SUB_ID=$(az account show --query id -o tsv)

az network manager post-commit \
  --network-manager-name avnm-contoso-global \
  --resource-group $RG \
  --commit-type SecurityAdmin \
  --target-locations $LOCATION_EAST $LOCATION_WEST \
  --configuration-ids "/subscriptions/$SUB_ID/resourceGroups/$RG/providers/Microsoft.Network/networkManagers/avnm-contoso-global/securityAdminConfigurations/secadmin-deny-direct-access"
```

### Azure PowerShell

```powershell
# Create Log Analytics workspace
$workspace = New-AzOperationalInsightsWorkspace `
  -Name "law-contoso-networking" `
  -ResourceGroupName $RG `
  -Location $LocationEast

# Create storage account for flow logs
$sa = New-AzStorageAccount `
  -Name "stflowlogscontoso001" `
  -ResourceGroupName $RG `
  -Location $LocationEast `
  -SkuName Standard_LRS

# Create VNet Flow Log with Traffic Analytics
$vnet = Get-AzVirtualNetwork -Name "vnet-hub-eastus" -ResourceGroupName $RG

New-AzNetworkWatcherFlowLog `
  -Enabled $true `
  -Name "flowlog-hub-eastus" `
  -NetworkWatcherName "NetworkWatcher_eastus" `
  -ResourceGroupName "NetworkWatcherRG" `
  -StorageId $sa.Id `
  -TargetResourceId $vnet.Id `
  -FormatVersion 2 `
  -EnableTrafficAnalytics `
  -TrafficAnalyticsWorkspaceId $workspace.ResourceId `
  -TrafficAnalyticsInterval 10
```

### Etapas no portal

1. Navegue até **Network Watcher** > **Flow logs** e crie logs de fluxo de VNet para cada VNet
2. Habilite o Traffic Analytics com intervalo de processamento de 10 minutos
3. Navegue até **Network Manager** e crie uma instância com escopo Connectivity + SecurityAdmin
4. Crie um grupo de rede com associação dinâmica usando instruções condicionais (tag: role=spoke)
5. Crie uma configuração de administrador de segurança com regras negando entrada de RDP (3389) e SSH (22) da Internet

---

## Tarefa 10: Validação e solução de problemas

Verifique a conectividade ponta a ponta em todos os componentes usando as ferramentas do Network Watcher.

### Azure CLI

```bash
# Verify VNet peering status
az network vnet peering list \
  --resource-group $RG \
  --vnet-name vnet-hub-eastus \
  --query "[].{Name:name, State:peeringState}" -o table

# Use IP Flow Verify (requires a VM in the spoke)
az network watcher test-ip-flow \
  --resource-group $RG \
  --vm vm-web-eastus \
  --direction Outbound \
  --protocol TCP \
  --local 10.11.1.4:* \
  --remote 8.8.8.8:443

# Check next hop from spoke VM
az network watcher show-next-hop \
  --resource-group $RG \
  --vm vm-web-eastus \
  --source-ip 10.11.1.4 \
  --dest-ip 8.8.8.8

# Connection troubleshoot (spoke to spoke through firewall)
az network watcher test-connectivity \
  --resource-group $RG \
  --source-resource vm-web-eastus \
  --dest-resource vm-data-eastus \
  --dest-port 1433

# Verify DNS resolution for Private Endpoints
az network private-endpoint dns-zone-group show \
  --resource-group $RG \
  --endpoint-name pe-sql-eastus \
  --name sqlZoneGroup

# Check Private DNS zone records
az network private-dns record-set list \
  --resource-group $RG \
  --zone-name "privatelink.database.windows.net" \
  --query "[].{Name:name, Type:type, Records:aRecords[0].ipv4Address}" -o table

# Verify Front Door health
az afd origin show \
  --resource-group $RG \
  --profile-name afd-contoso-global \
  --origin-group-name og-appgw-global \
  --origin-name origin-eastus \
  --query "{name:name, enabledState:enabledState}" -o table

# List effective routes on spoke VM NIC
az network nic show-effective-route-table \
  --resource-group $RG \
  --name nic-vm-web-eastus -o table
```

### Azure PowerShell

```powershell
# Verify peering state
Get-AzVirtualNetworkPeering `
  -ResourceGroupName $RG `
  -VirtualNetworkName "vnet-hub-eastus" | `
  Select-Object Name, PeeringState, AllowForwardedTraffic, AllowGatewayTransit

# Test IP flow
Test-AzNetworkWatcherIPFlow `
  -NetworkWatcher (Get-AzNetworkWatcher -Name "NetworkWatcher_eastus" -ResourceGroupName "NetworkWatcherRG") `
  -TargetVirtualMachineId (Get-AzVM -Name "vm-web-eastus" -ResourceGroupName $RG).Id `
  -Direction Outbound `
  -Protocol TCP `
  -RemoteIPAddress "8.8.8.8" `
  -RemotePort 443 `
  -LocalIPAddress "10.11.1.4" `
  -LocalPort "*"

# Get next hop
Get-AzNetworkWatcherNextHop `
  -NetworkWatcher (Get-AzNetworkWatcher -Name "NetworkWatcher_eastus" -ResourceGroupName "NetworkWatcherRG") `
  -TargetVirtualMachineId (Get-AzVM -Name "vm-web-eastus" -ResourceGroupName $RG).Id `
  -SourceIPAddress "10.11.1.4" `
  -DestinationIPAddress "8.8.8.8"
```

### Lista de verificação de validação

| Teste | Resultado esperado | Ferramenta |
|------|----------------|------|
| VM do spoke para internet | Tráfego roteado pelo Azure Firewall | Next Hop |
| Spoke-para-spoke (mesma região) | Tráfego roteado pelo Azure Firewall | Connection Troubleshoot |
| Spoke-para-spoke (entre regiões) | Tráfego roteado por ambos os firewalls via peering global | Connection Troubleshoot |
| DNS do Private Endpoint SQL | Resolve para 10.12.1.x (IP privado) | nslookup / registros de zona DNS |
| Local para Azure privado | Resolve via endpoint de entrada do Private Resolver | nslookup a partir do local |
| Bloqueio de SQL injection pelo WAF | Retorna 403 Forbidden | curl com payload de SQL injection |
| Failover do Front Door | Tráfego muda para West Europe quando East US está indisponível | Pare o AppGW East US, verifique o Front Door |

---

## Cenários de quebra e correção

### Cenário 1: VMs do spoke não conseguem acessar a internet

**Sintoma**: VMs no spoke web não conseguem acessar URLs externas. Conexões de saída expiram por timeout.

**Causa raiz**: O UDR na sub-rede do spoke está sem a rota padrão (0.0.0.0/0) apontando para o IP privado do Azure Firewall.

**Diagnóstico**:
```bash
# Check effective routes on the VM NIC
az network nic show-effective-route-table \
  --resource-group $RG \
  --name nic-vm-web-eastus -o table

# Check next hop -- should show VirtualAppliance, not Internet
az network watcher show-next-hop \
  --resource-group $RG \
  --vm vm-web-eastus \
  --source-ip 10.11.1.4 \
  --dest-ip 8.8.8.8
```

**Correção**:
```bash
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-eastus \
  --name default-to-firewall \
  --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address $AZFW_EAST_IP
```

---

### Cenário 2: DNS do Private Endpoint não resolve a partir da VNet spoke

**Sintoma**: `nslookup sql-contoso-eastus-001.database.windows.net` de uma VM no spoke retorna o IP público em vez do IP privado.

**Causa raiz**: A zona DNS privatelink.database.windows.net não está vinculada à VNet do spoke.

**Diagnóstico**:
```bash
# List DNS zone links -- spoke VNet should be listed
az network private-dns link vnet list \
  --resource-group $RG \
  --zone-name "privatelink.database.windows.net" \
  --query "[].{Name:name, VNet:virtualNetwork.id}" -o table
```

**Correção**:
```bash
az network private-dns link vnet create \
  --resource-group $RG \
  --zone-name "privatelink.database.windows.net" \
  --name link-spoke-web-eastus \
  --virtual-network vnet-spoke-web-eastus \
  --registration-enabled false
```

---

### Cenário 3: Ambiente local não consegue resolver recursos privados do Azure

**Sintoma**: A partir do local, `nslookup sql-contoso-eastus-001.privatelink.database.windows.net` falha com NXDOMAIN.

**Causa raiz**: O servidor DNS local não está configurado para encaminhar zonas DNS privadas do Azure (privatelink.*) para o IP do endpoint de entrada do DNS Private Resolver.

**Diagnóstico**:
```bash
# Get the inbound endpoint IP address
az dns-resolver inbound-endpoint list \
  --dns-resolver-name resolver-hub-eastus \
  --resource-group $RG \
  --query "[].ipConfigurations[0].privateIpAddress" -o tsv
```

**Correção**: Configure o servidor DNS local (ex.: Windows DNS ou BIND) para adicionar um encaminhador condicional para `privatelink.database.windows.net` (e outras zonas privatelink) apontando para o endereço IP do endpoint de entrada.

---

### Cenário 4: Tráfego spoke-para-spoke entre regiões falhando

**Sintoma**: Uma VM no spoke web de East US não consegue alcançar uma VM no spoke de dados de West Europe.

**Causa raiz**: Dois problemas -- (1) o peering global não tem "Allow forwarded traffic" habilitado, e (2) o firewall está sem uma regra de rede para permitir tráfego entre regiões.

**Diagnóstico**:
```bash
# Check peering settings
az network vnet peering show \
  --resource-group $RG \
  --vnet-name vnet-hub-eastus \
  --name hub-eastus-to-hub-westeurope \
  --query "{allowForwardedTraffic:allowForwardedTraffic, allowGatewayTransit:allowGatewayTransit}"
```

**Correção**:
```bash
# Fix peering
az network vnet peering update \
  --resource-group $RG \
  --vnet-name vnet-hub-eastus \
  --name hub-eastus-to-hub-westeurope \
  --set allowForwardedTraffic=true

# Add firewall rule for cross-region traffic
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name fwpolicy-parent-baseline \
  --rule-collection-group-name DefaultNetworkRuleCollectionGroup \
  --name allow-cross-region \
  --collection-priority 120 \
  --action Allow \
  --rule-type NetworkRule \
  --rule-name allow-east-west \
  --source-addresses "10.10.0.0/16" "10.11.0.0/16" "10.12.0.0/16" \
  --destination-addresses "10.20.0.0/16" "10.21.0.0/16" "10.22.0.0/16" \
  --ip-protocols Any \
  --destination-ports "*"
```

---

### Cenário 5: Health probe do Front Door falhando

**Sintoma**: O Front Door mostra a origem East US como indisponível. O acesso direto ao IP público do Application Gateway funciona de outras origens.

**Causa raiz**: Um NSG na sub-rede do Application Gateway (`snet-appgw`) está bloqueando tráfego de entrada do Azure Front Door. O NSG não possui uma regra permitindo a service tag `AzureFrontDoor.Backend`, então os health probes são descartados antes de alcançar o Application Gateway.

**Diagnóstico**:
```bash
# Check Front Door origin health status
az afd origin show \
  --resource-group $RG \
  --profile-name afd-contoso-global \
  --origin-group-name og-appgw-global \
  --origin-name origin-eastus

# Check the NSG rules on the AppGW subnet
az network nsg rule list \
  --resource-group $RG \
  --nsg-name nsg-appgw-eastus \
  --query "[].{Name:name, Priority:priority, Access:access, Source:sourceAddressPrefix, DestPort:destinationPortRange}" -o table
```

**Correção**:
```bash
# Allow Front Door backend traffic to the Application Gateway subnet
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-appgw-eastus \
  --name Allow-FrontDoor-Inbound \
  --priority 110 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes AzureFrontDoor.Backend \
  --source-port-ranges "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges 80 443
```

---

## Verificação de conhecimento

<KnowledgeCheck questions={[{id:"q1", question:"In a hub-spoke topology, which peering setting must be enabled on the hub side to allow spoke VNets to use the hub's VPN Gateway for on-premises connectivity?", options:["A) Allow forwarded traffic","B) Allow gateway transit","C) Use remote gateways","D) Allow virtual network access"], correctIndex:1, explanation:"Allow gateway transit must be enabled on the hub VNet peering to let spoke VNets leverage the hub's VPN or ExpressRoute gateway. The spoke side enables 'Use remote gateways' as the complementary setting."},{id:"q2", question:"When creating an active-active VPN Gateway (Generation 2) with BGP, what is the minimum SKU that supports availability zones?", options:["A) VpnGw1","B) VpnGw2","C) VpnGw1AZ","D) VpnGw2AZ"], correctIndex:3, explanation:"VpnGw2AZ is the minimum SKU that supports both active-active mode with two public IPs and availability zones. The AZ suffix indicates zone-redundancy support, and Generation2 VPN gateways require at least VpnGw2AZ for active-active with zones."},{id:"q3", question:"In Azure Firewall policy hierarchy, what happens to rules defined in the parent policy when a child policy is applied to a firewall?", options:["A) Parent rules are ignored entirely","B) Parent rules are inherited and evaluated before child rules","C) Child rules override parent rules completely","D) Parent and child rules merge with no priority distinction"], correctIndex:1, explanation:"Child policies inherit all rules from the parent policy. Parent policy rules are evaluated first (higher priority), and child policies can only add rules -- they cannot remove or override inherited parent rules. This enables baseline security enforcement."},{id:"q4", question:"A Private Endpoint for Azure SQL is created in a spoke VNet, but VMs in a different spoke cannot resolve the FQDN to the private IP. What is the most likely cause?", options:["A) The Private Endpoint NIC does not have a DNS record","B) The privatelink.database.windows.net DNS zone is not linked to the other spoke VNet","C) Azure SQL has public access enabled","D) The Private Endpoint subnet has an NSG blocking DNS"], correctIndex:1, explanation:"Each VNet that needs to resolve Private Endpoint FQDNs must have the corresponding private DNS zone (privatelink.database.windows.net) linked to it. Without the link, DNS queries from that VNet will not see the A records and will resolve to the public IP instead."},{id:"q5", question:"What is the role of the inbound endpoint in Azure DNS Private Resolver?", options:["A) It sends queries from Azure to on-premises DNS servers","B) It receives DNS queries from on-premises or other networks for Azure resolution","C) It blocks malicious DNS queries from external sources","D) It caches DNS responses for faster resolution"], correctIndex:1, explanation:"The inbound endpoint provides an IP address that on-premises DNS servers can forward queries to. This allows on-premises clients to resolve Azure private DNS zones (including privatelink zones) through the Private Resolver, enabling hybrid DNS resolution."},{id:"q6", question:"When configuring a custom IPsec/IKE policy for a site-to-site VPN connection, which combination provides the strongest security?", options:["A) IKEv2, AES128, SHA1, DHGroup2","B) IKEv2, AES256, SHA256, DHGroup14, PFS2048","C) IKEv1, 3DES, MD5, DHGroup1","D) IKEv2, AES256, SHA1, DHGroup2"], correctIndex:1, explanation:"AES256 encryption, SHA256 integrity, DHGroup14 (2048-bit), and PFS2048 provide the strongest combination. IKEv2 is required for Azure VPN. SHA1 and DHGroup2 are considered weak, and IKEv1/3DES/MD5 are deprecated."},{id:"q7", question:"Azure Front Door is configured with priority-based routing (East US = priority 1, West Europe = priority 2). When does traffic route to West Europe?", options:["A) When West Europe latency is lower than East US","B) When the East US origin fails health probes and is marked unhealthy","C) Traffic always splits 50/50 between origins","D) When East US capacity exceeds 80%"], correctIndex:1, explanation:"With priority-based routing, Front Door sends all traffic to the highest-priority (lowest number) origin. Traffic only fails over to the next priority level when all origins at the current priority are unhealthy based on health probe responses."},{id:"q8", question:"What is the cost difference between DDoS IP Protection and DDoS Network Protection for protecting 3 public IPs?", options:["A) IP Protection is more expensive ($597/mo vs $2,944/mo)","B) Network Protection is more expensive ($2,944/mo vs $597/mo)","C) Both cost the same","D) IP Protection is free for the first 5 IPs"], correctIndex:1, explanation:"DDoS IP Protection costs ~$199/month per protected IP ($597 for 3 IPs). DDoS Network Protection costs ~$2,944/month for the plan regardless of how many IPs are protected. For fewer than ~15 IPs, IP Protection is more cost-effective."},{id:"q9", question:"In Azure Virtual Network Manager, what advantage do security admin rules have over NSG rules?", options:["A) They are faster to evaluate","B) They can be overridden by local NSG rules","C) They are evaluated before NSG rules and cannot be overridden by network admins at the VNet/subnet level","D) They support application-layer filtering"], correctIndex:2, explanation:"Security admin rules in AVNM are evaluated before NSGs and enforce organization-wide policies that local network admins cannot override. This ensures critical security rules (like denying direct RDP from internet) remain in effect regardless of NSG configurations."},{id:"q10", question:"VNet Flow Logs with Traffic Analytics are enabled. Which resource provides the storage for raw flow log data?", options:["A) Log Analytics workspace only","B) Azure Storage Account only","C) Both Storage Account (raw logs) and Log Analytics workspace (analytics)","D) Azure Event Hub"], correctIndex:2, explanation:"VNet Flow Logs require an Azure Storage Account to store raw flow log data in JSON format. When Traffic Analytics is enabled, the data is also processed and sent to a Log Analytics workspace for querying and visualization. Both resources are required."}]} />

---

## Limpeza

:::danger Exclua todos os recursos imediatamente após concluir o laboratório

Este laboratório custa aproximadamente $4-5/hora. Exclua todos os recursos assim que terminar a validação.

:::

### Azure CLI

```bash
# Delete the entire resource group (removes all resources)
az group delete --name rg-contoso-capstone --yes --no-wait

# If resources were created across multiple resource groups, also clean up:
# Network Watcher flow logs persist in NetworkWatcherRG
az network watcher flow-log delete \
  --location eastus \
  --name flowlog-hub-eastus

az network watcher flow-log delete \
  --location eastus \
  --name flowlog-spoke-web-eastus
```

### Azure PowerShell

```powershell
# Delete the entire resource group
Remove-AzResourceGroup -Name "rg-contoso-capstone" -Force -AsJob

# Clean up flow logs in NetworkWatcherRG
Remove-AzNetworkWatcherFlowLog `
  -Name "flowlog-hub-eastus" `
  -NetworkWatcherName "NetworkWatcher_eastus" `
  -ResourceGroupName "NetworkWatcherRG" `
  -Confirm:$false
```

### Ordem de exclusão (se excluindo individualmente)

Se você precisar excluir recursos individualmente (por exemplo, se a exclusão do grupo de recursos falhar), siga esta ordem para evitar erros de dependência:

1. VNet Flow Logs
2. Implantações do Azure Virtual Network Manager, depois configurações, depois grupos de rede, depois a instância do AVNM
3. Perfil do Azure Front Door (endpoint, rotas, origens, grupos de origem)
4. Application Gateways e políticas WAF
5. Azure Firewalls e políticas de firewall
6. Private Endpoints e zonas de DNS privado
7. DNS Private Resolver (regras de encaminhamento, conjunto de regras, endpoints, resolver)
8. VPN Connection, depois VPN Gateway (aguarde ~30 min para exclusão), depois Local Network Gateway
9. Peerings de VNet
10. Redes virtuais
11. IPs públicos, tabelas de rotas, contas de armazenamento, workspace do Log Analytics
12. Grupo de recursos

---

## Links de referência

| Tópico | Link |
|-------|------|
| Peering de rede virtual | https://learn.microsoft.com/azure/virtual-network/virtual-network-peering-overview |
| VPN Gateway ativo-ativo | https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-activeactive-rm-powershell |
| Política IPsec/IKE personalizada | https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-ipsecikepolicy-rm-powershell |
| BGP com VPN Gateway | https://learn.microsoft.com/azure/vpn-gateway/bgp-how-to-cli |
| Hierarquia de políticas do Azure Firewall | https://learn.microsoft.com/azure/firewall-manager/policy-overview |
| Processamento de regras do Azure Firewall | https://learn.microsoft.com/azure/firewall/rule-processing |
| WAF do Application Gateway | https://learn.microsoft.com/azure/web-application-firewall/ag/ag-overview |
| Regras personalizadas do WAF | https://learn.microsoft.com/azure/web-application-firewall/ag/custom-waf-rules-overview |
| Azure Front Door Premium | https://learn.microsoft.com/azure/frontdoor/front-door-overview |
| Private Endpoints | https://learn.microsoft.com/azure/private-link/private-endpoint-overview |
| Zonas de DNS privado | https://learn.microsoft.com/azure/dns/private-dns-privatednszone |
| DNS Private Resolver | https://learn.microsoft.com/azure/dns/dns-private-resolver-overview |
| DDoS IP Protection | https://learn.microsoft.com/azure/ddos-protection/manage-ddos-ip-protection-cli |
| VNet Flow Logs | https://learn.microsoft.com/azure/network-watcher/vnet-flow-logs-overview |
| Virtual Network Manager | https://learn.microsoft.com/azure/virtual-network-manager/overview |
| Solução de problemas do Network Watcher | https://learn.microsoft.com/azure/network-watcher/network-watcher-overview |
