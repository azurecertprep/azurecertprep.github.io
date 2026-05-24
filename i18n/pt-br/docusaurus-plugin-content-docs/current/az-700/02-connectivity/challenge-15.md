---
sidebar_position: 2
title: "Desafio 15: VPN S2S Alta Disponibilidade & Multi-Site"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 15: Alta disponibilidade de VPN S2S e vÃ¡rios sites

:::info Tempo e custo estimados

**75-120 minutos** | **~$0,55/h** (SKU VpnGw2AZ) | **Peso no exame: 20-25%**

:::

:::warning Tempo de implantaÃ§Ã£o

O provisionamento do VPN Gateway active-active leva **30-45 minutos**. Use `--no-wait` e continue com o aprendizado conceitual enquanto o gateway Ã© implantado.

:::

## CenÃ¡rio

A VPN site a site da Contoso estabelecida no Challenge 14 usa uma Ãºnica instÃ¢ncia de VPN gateway, criando um ponto Ãºnico de falha. Durante um evento recente de manutenÃ§Ã£o do Azure, o tÃºnel VPN ficou inativo por 15 minutos, causando uma interrupÃ§Ã£o nos negÃ³cios. A equipe de rede deve implementar alta disponibilidade para o VPN gateway usando configuraÃ§Ã£o active-active com SKUs com redundÃ¢ncia de zona, conectar-se a vÃ¡rios sites locais e configurar BGP para troca dinÃ¢mica de rotas. AlÃ©m disso, a equipe precisa entender o Azure Extended Network para um projeto futuro de migraÃ§Ã£o Layer 2.

**Arquitetura:**

```text
On-prem Site A (Dallas)           Azure (East US)              On-prem Site B (Chicago)
(10.10.0.0/16)                   (10.1.0.0/16)               (10.20.0.0/16)
                                       |
[VPN Device A]  â”€â”€â”€ Tunnel 1 â”€â”€â–º [pip-vgw-1]                [VPN Device B]
  203.0.113.10                        |                        198.51.100.25
                                  [VPN Gateway]
[VPN Device A]  â”€â”€â”€ Tunnel 2 â”€â”€â–º [pip-vgw-2]                [VPN Device B]
  203.0.113.10                        |                        198.51.100.25
                                  Active-Active
                               (VpnGw2AZ, Zone 1+2)
                                  BGP ASN: 65010
```

## Objetivos de aprendizagem

ApÃ³s concluir este desafio, vocÃª serÃ¡ capaz de:

- Projetar e implementar uma conexÃ£o VPN site a site com alta disponibilidade
- Implantar um VPN gateway active-active com SKUs com redundÃ¢ncia de zona
- Configurar BGP em VPN gateways para roteamento dinÃ¢mico
- Conectar vÃ¡rios sites locais a um Ãºnico VPN gateway (vÃ¡rios sites)
- Explicar a finalidade e o caso de uso do Azure Extended Network

## PrÃ©-requisitos

- ConclusÃ£o do Challenge 14 (ou compreensÃ£o dos conceitos bÃ¡sicos de VPN S2S)
- Uma assinatura do Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- PowerShell com o mÃ³dulo Az instalado

## Conceitos-chave para o AZ-700

| Conceito | Detalhe |
|----------|---------|
| Gateway active-active | Duas instÃ¢ncias de gateway, cada uma com seu prÃ³prio IP pÃºblico; ambos os tÃºneis ativos simultaneamente |
| Gateway com redundÃ¢ncia de zona | SKUs terminados em "AZ" (ex.: VpnGw2AZ) implantam instÃ¢ncias em zonas de disponibilidade |
| BGP (Border Gateway Protocol) | Protocolo de roteamento dinÃ¢mico; anuncia rotas automaticamente em vez de local-address-prefixes estÃ¡ticos |
| ASN (Autonomous System Number) | Identificador Ãºnico para um speaker BGP; o padrÃ£o do Azure Ã© 65515 |
| VPN de vÃ¡rios sites | VÃ¡rios gateways de rede local conectados a um Ãºnico VPN gateway (uma conexÃ£o por site) |
| Azure Extended Network | Overlay Layer 2 que estende uma sub-rede local para o Azure para migraÃ§Ã£o ao vivo sem re-IP |

### Active-active vs active-standby

| Recurso | Active-standby (padrÃ£o) | Active-active |
|---------|-------------------------|---------------|
| InstÃ¢ncias do gateway | 2 (uma ativa, uma em standby) | 2 (ambas ativas) |
| IPs pÃºblicos | 1 | 2 (um por instÃ¢ncia) |
| Tempo de failover | 60-90 segundos | Quase instantÃ¢neo (outro tÃºnel jÃ¡ ativo) |
| TÃºneis por site | 1 | 2 (um para cada instÃ¢ncia) |
| ConfiguraÃ§Ã£o on-premises | TÃºnel Ãºnico para um IP | Dois tÃºneis para dois IPs |
| Throughput | Largura de banda de instÃ¢ncia Ãºnica | Largura de banda agregada de ambas as instÃ¢ncias |

### Nomenclatura de SKU com redundÃ¢ncia de zona

| SKU padrÃ£o | Equivalente com redundÃ¢ncia de zona |
|------------|-------------------------------------|
| VpnGw1 | VpnGw1AZ |
| VpnGw2 | VpnGw2AZ |
| VpnGw3 | VpnGw3AZ |
| VpnGw4 | VpnGw4AZ |
| VpnGw5 | VpnGw5AZ |

SKUs com redundÃ¢ncia de zona exigem **IPs pÃºblicos de SKU Standard** (nÃ£o Basic) com alocaÃ§Ã£o **com redundÃ¢ncia de zona**.

---

## Tarefa 1: Implantar um VPN gateway active-active com redundÃ¢ncia de zona

### Etapa 1: Criar o grupo de recursos e a VNet

```bash
az group create \
    --name rg-vpn-ha-lab \
    --location eastus

az network vnet create \
    --resource-group rg-vpn-ha-lab \
    --name vnet-hub \
    --location eastus \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name snet-workloads \
    --subnet-prefixes 10.1.1.0/24

az network vnet subnet create \
    --resource-group rg-vpn-ha-lab \
    --vnet-name vnet-hub \
    --name GatewaySubnet \
    --address-prefixes 10.1.255.0/27
```

### Etapa 2: Criar dois IPs pÃºblicos com redundÃ¢ncia de zona (necessÃ¡rio para active-active)

```bash
az network public-ip create \
    --resource-group rg-vpn-ha-lab \
    --name pip-vgw-hub-1 \
    --location eastus \
    --allocation-method Static \
    --sku Standard \
    --zone 1 2 3

az network public-ip create \
    --resource-group rg-vpn-ha-lab \
    --name pip-vgw-hub-2 \
    --location eastus \
    --allocation-method Static \
    --sku Standard \
    --zone 1 2 3
```

:::note IPs pÃºblicos com redundÃ¢ncia de zona

Ao usar SKUs de gateway com redundÃ¢ncia de zona (terminados em AZ), os IPs pÃºblicos devem ser de SKU Standard. Especificar `--zone 1 2 3` torna o IP com redundÃ¢ncia de zona, o que significa que ele sobrevive Ã  falha de qualquer zona de disponibilidade individual.

:::

### Etapa 3: Criar o VPN gateway active-active

```bash
az network vnet-gateway create \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --vnet vnet-hub \
    --gateway-type Vpn \
    --vpn-type RouteBased \
    --sku VpnGw2AZ \
    --public-ip-addresses pip-vgw-hub-1 pip-vgw-hub-2 \
    --active-active \
    --no-wait
```

### Azure PowerShell

```powershell
# Create public IPs
$pip1 = New-AzPublicIpAddress `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "pip-vgw-hub-1" `
    -Location "eastus" `
    -AllocationMethod Static `
    -Sku Standard `
    -Zone 1, 2, 3

$pip2 = New-AzPublicIpAddress `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "pip-vgw-hub-2" `
    -Location "eastus" `
    -AllocationMethod Static `
    -Sku Standard `
    -Zone 1, 2, 3

# Get subnet reference
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-vpn-ha-lab" -Name "vnet-hub"
$gwSubnet = Get-AzVirtualNetworkSubnetConfig -Name "GatewaySubnet" -VirtualNetwork $vnet

# Create two IP configurations (one per public IP)
$ipConfig1 = New-AzVirtualNetworkGatewayIpConfig `
    -Name "gwIpConfig1" `
    -SubnetId $gwSubnet.Id `
    -PublicIpAddressId $pip1.Id

$ipConfig2 = New-AzVirtualNetworkGatewayIpConfig `
    -Name "gwIpConfig2" `
    -SubnetId $gwSubnet.Id `
    -PublicIpAddressId $pip2.Id

# Create active-active VPN gateway
New-AzVirtualNetworkGateway `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "vgw-hub-ha" `
    -Location "eastus" `
    -IpConfigurations $ipConfig1, $ipConfig2 `
    -GatewayType Vpn `
    -VpnType RouteBased `
    -GatewaySku VpnGw2AZ `
    -EnableActiveActiveFeature `
    -AsJob
```

---

## Tarefa 2: Conectar vÃ¡rios sites locais (VPN de vÃ¡rios sites)

### Etapa 1: Criar gateways de rede local para cada site

```bash
# Site A: Dallas datacenter
az network local-gateway create \
    --resource-group rg-vpn-ha-lab \
    --name lgw-dallas \
    --gateway-ip-address 203.0.113.10 \
    --local-address-prefixes 10.10.0.0/16 \
    --location eastus

# Site B: Chicago datacenter
az network local-gateway create \
    --resource-group rg-vpn-ha-lab \
    --name lgw-chicago \
    --gateway-ip-address 198.51.100.25 \
    --local-address-prefixes 10.20.0.0/16 \
    --location eastus
```

### Etapa 2: Criar conexÃµes VPN para cada site

```bash
# Connection to Dallas
az network vpn-connection create \
    --resource-group rg-vpn-ha-lab \
    --name conn-to-dallas \
    --vnet-gateway1 vgw-hub-ha \
    --local-gateway2 lgw-dallas \
    --shared-key "DallasKey!2024Secure"

# Connection to Chicago
az network vpn-connection create \
    --resource-group rg-vpn-ha-lab \
    --name conn-to-chicago \
    --vnet-gateway1 vgw-hub-ha \
    --local-gateway2 lgw-chicago \
    --shared-key "ChicagoKey!2024Secure"
```

### Azure PowerShell

```powershell
# Create local gateways
$lgwDallas = New-AzLocalNetworkGateway `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "lgw-dallas" `
    -Location "eastus" `
    -GatewayIpAddress "203.0.113.10" `
    -AddressPrefix "10.10.0.0/16"

$lgwChicago = New-AzLocalNetworkGateway `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "lgw-chicago" `
    -Location "eastus" `
    -GatewayIpAddress "198.51.100.25" `
    -AddressPrefix "10.20.0.0/16"

# Create connections
$vgw = Get-AzVirtualNetworkGateway -ResourceGroupName "rg-vpn-ha-lab" -Name "vgw-hub-ha"

New-AzVirtualNetworkGatewayConnection `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "conn-to-dallas" `
    -Location "eastus" `
    -VirtualNetworkGateway1 $vgw `
    -LocalNetworkGateway2 $lgwDallas `
    -ConnectionType IPsec `
    -SharedKey "DallasKey!2024Secure"

New-AzVirtualNetworkGatewayConnection `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "conn-to-chicago" `
    -Location "eastus" `
    -VirtualNetworkGateway1 $vgw `
    -LocalNetworkGateway2 $lgwChicago `
    -ConnectionType IPsec `
    -SharedKey "ChicagoKey!2024Secure"
```

:::tip ConsideraÃ§Ãµes sobre vÃ¡rios sites

- Cada site local requer seu prÃ³prio gateway de rede local e recurso de conexÃ£o VPN
- VPN gateways baseados em rota suportam atÃ© 30 tÃºneis S2S (VpnGw1) ou 100 (VpnGw4/5)
- Os espaÃ§os de endereÃ§o em todos os gateways de rede local nÃ£o devem se sobrepor
- Cada conexÃ£o pode ter uma chave compartilhada diferente

:::

---

## Tarefa 3: Configurar BGP no VPN gateway

O BGP permite a troca dinÃ¢mica de rotas, eliminando a necessidade de manter manualmente `--local-address-prefixes` nos gateways de rede local quando as redes locais mudam.

### Etapa 1: Habilitar BGP no VPN gateway

```bash
az network vnet-gateway update \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --enable-bgp true \
    --asn 65010
```

### Etapa 2: Criar um gateway de rede local com BGP habilitado

Ao usar BGP, o gateway de rede local inclui o IP do peer BGP on-premises e o ASN:

```bash
az network local-gateway create \
    --resource-group rg-vpn-ha-lab \
    --name lgw-dallas-bgp \
    --gateway-ip-address 203.0.113.10 \
    --local-address-prefixes 10.10.0.0/16 \
    --bgp-peering-address 10.10.255.254 \
    --asn 65020 \
    --location eastus
```

### Etapa 3: Criar uma conexÃ£o com BGP habilitado

```bash
az network vpn-connection create \
    --resource-group rg-vpn-ha-lab \
    --name conn-to-dallas-bgp \
    --vnet-gateway1 vgw-hub-ha \
    --local-gateway2 lgw-dallas-bgp \
    --shared-key "DallasBGP!2024Key" \
    --enable-bgp true
```

### Azure PowerShell

```powershell
# Update gateway with BGP
$vgw = Get-AzVirtualNetworkGateway -ResourceGroupName "rg-vpn-ha-lab" -Name "vgw-hub-ha"
$vgw.EnableBgp = $true
$vgw.BgpSettings.Asn = 65010
Set-AzVirtualNetworkGateway -VirtualNetworkGateway $vgw

# Create BGP-enabled local gateway
$lgwDallasBgp = New-AzLocalNetworkGateway `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "lgw-dallas-bgp" `
    -Location "eastus" `
    -GatewayIpAddress "203.0.113.10" `
    -AddressPrefix "10.10.0.0/16" `
    -BgpPeeringAddress "10.10.255.254" `
    -Asn 65020

# Create connection with BGP
New-AzVirtualNetworkGatewayConnection `
    -ResourceGroupName "rg-vpn-ha-lab" `
    -Name "conn-to-dallas-bgp" `
    -Location "eastus" `
    -VirtualNetworkGateway1 $vgw `
    -LocalNetworkGateway2 $lgwDallasBgp `
    -ConnectionType IPsec `
    -SharedKey "DallasBGP!2024Key" `
    -EnableBgp $true
```

### Etapa 4: Verificar a configuraÃ§Ã£o do BGP

```bash
# Show gateway BGP settings
az network vnet-gateway show \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --query "{bgpEnabled:enableBgp, asn:bgpSettings.asn, peerAddress:bgpSettings.bgpPeeringAddress}" \
    --output table

# List learned BGP routes
az network vnet-gateway list-learned-routes \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --output table

# List advertised routes to a specific peer
az network vnet-gateway list-advertised-routes \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --peer 10.10.255.254 \
    --output table
```

:::note Regras de ASN do BGP

- ASN reservado do Azure: 65515 (padrÃ£o para VPN gateways do Azure se nÃ£o especificado)
- NÃ£o use 65515 para dispositivos on-premises
- Faixa de ASN privado: 64512-65534 e 4200000000-4294967294
- Cada peer BGP (gateway do Azure e dispositivo on-premises) deve ter um ASN Ãºnico
- O `--bgp-peering-address` no gateway de rede local Ã© o IP interno do peer BGP do dispositivo on-premises (nÃ£o seu IP pÃºblico)

:::

---

## Tarefa 4: Verificar as instÃ¢ncias do gateway active-active

### Azure CLI

```bash
# Show both public IPs assigned to the active-active gateway
az network vnet-gateway show \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --query "ipConfigurations[].{name:name, publicIP:publicIpAddress.id}" \
    --output table

# Show both tunnel IPs
az network public-ip show \
    --resource-group rg-vpn-ha-lab \
    --name pip-vgw-hub-1 \
    --query "ipAddress" \
    --output tsv

az network public-ip show \
    --resource-group rg-vpn-ha-lab \
    --name pip-vgw-hub-2 \
    --query "ipAddress" \
    --output tsv
```

### Azure PowerShell

```powershell
# Verify active-active configuration
$vgw = Get-AzVirtualNetworkGateway -ResourceGroupName "rg-vpn-ha-lab" -Name "vgw-hub-ha"
$vgw.ActiveActive
$vgw.IpConfigurations | Format-Table Name, PublicIpAddress
```

---

## Tarefa 5: Simular failover

Em uma configuraÃ§Ã£o active-active, se uma instÃ¢ncia do gateway ficar indisponÃ­vel, o dispositivo on-premises detecta o peer inativo (via IKE Dead Peer Detection) e faz failover para o tÃºnel ativo restante. Nenhuma aÃ§Ã£o do lado do Azure Ã© necessÃ¡ria.

### Etapas de verificaÃ§Ã£o

```bash
# Monitor connection status for both tunnels
az network vpn-connection show \
    --resource-group rg-vpn-ha-lab \
    --name conn-to-dallas \
    --query "{status:connectionStatus, tunnelStatus:tunnelConnectionStatus}" \
    --output json
```

### Compreendendo o comportamento de failover

| CenÃ¡rio | Comportamento active-standby | Comportamento active-active |
|---------|------------------------------|----------------------------|
| ManutenÃ§Ã£o planejada | 60-90 segundos de inatividade | Quase zero inatividade (outro tÃºnel permanece) |
| Falha de zona | Gateway indisponÃ­vel se na zona afetada | Sobrevive se usar SKU AZ entre zonas |
| Falha de instÃ¢ncia Ãºnica | 60-90 segundos de failover para standby | Uso imediato do outro tÃºnel ativo |
| Falha do dispositivo on-premises | TÃºnel inativo atÃ© o dispositivo recuperar | TÃºnel inativo atÃ© o dispositivo recuperar (igual) |

---

## Tarefa 6: Azure Extended Network (conceitual)

O Azure Extended Network Ã© uma tecnologia de overlay Layer 2 que estende uma sub-rede on-premises para uma VNet do Azure, permitindo que VMs mantenham seus endereÃ§os IP on-premises quando migradas para o Azure.

### Caso de uso

- MigraÃ§Ã£o ao vivo de VMs do on-premises para o Azure sem alterar endereÃ§os IP
- Evitar re-IP durante projetos de migraÃ§Ã£o em fases
- Manter dependÃªncias de rede (IPs codificados, aplicativos legados) durante a transiÃ§Ã£o

### Requisitos e limitaÃ§Ãµes

| Requisito | Detalhe |
|-----------|---------|
| On-premises | Windows Server 2019+ com Hyper-V |
| Azure | VMs com Windows Server 2019+ no Azure |
| Rede | VPN site a site ou ExpressRoute entre on-premises e Azure |
| Sub-rede | MÃ¡ximo de /24 para a sub-rede estendida |
| Escopo | Destinado apenas para migraÃ§Ã£o, nÃ£o para uso em produÃ§Ã£o a longo prazo |

### Como funciona

1. Um par de VMs appliance (uma on-premises, uma no Azure) cria um tÃºnel VXLAN sobre a VPN S2S
2. O trÃ¡fego ARP e broadcast Ã© intermediado entre os dois lados
3. VMs em ambos os lados da sub-rede estendida podem se comunicar na Layer 2
4. ApÃ³s a conclusÃ£o da migraÃ§Ã£o, o lado on-premises Ã© descomissionado

:::tip Nota de exame

O Azure Extended Network Ã© um tÃ³pico de nicho no exame. Pontos-chave a lembrar: requer Windows Server 2019+, funciona sobre VPN S2S ou ExpressRoute existente, Ã© limitado a sub-redes /24 e Ã© projetado como um auxÃ­lio temporÃ¡rio de migraÃ§Ã£o (nÃ£o uma arquitetura permanente). Se o exame perguntar sobre estender Layer 2 para o Azure, esta Ã© a resposta.

:::

### Comandos de referÃªncia (apenas conceitual)

O Azure Extended Network Ã© configurado atravÃ©s do Windows Admin Center, nÃ£o via Azure CLI ou PowerShell diretamente:

1. Instale a extensÃ£o Azure Extended Network no Windows Admin Center
2. Conecte-se ao host on-premises
3. Selecione a sub-rede a ser estendida
4. Especifique a VNet e a sub-rede do Azure para estender
5. Implante a VM appliance do Azure

Para detalhes, consulte a [documentaÃ§Ã£o do Azure Extended Network](https://learn.microsoft.com/en-us/windows-server/manage/windows-admin-center/azure/azure-extended-network).

---

## CenÃ¡rios de quebra e correÃ§Ã£o

### CenÃ¡rio 1: Conflito de ASN do BGP

**Sintoma:** O peering BGP falha ao estabelecer. A conexÃ£o mostra `Connected`, mas nenhuma rota Ã© aprendida.

**Causa raiz:** Tanto o VPN gateway do Azure quanto o dispositivo on-premises estÃ£o configurados com o mesmo ASN (ex.: ambos usando 65515).

**Comando de diagnÃ³stico:**

```bash
az network vnet-gateway show \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --query "bgpSettings.asn" \
    --output tsv

az network local-gateway show \
    --resource-group rg-vpn-ha-lab \
    --name lgw-dallas-bgp \
    --query "bgpSettings.asn" \
    --output tsv
```

**CorreÃ§Ã£o:** Altere um dos lados para um ASN Ãºnico:

```bash
az network vnet-gateway update \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --asn 65010
```

### CenÃ¡rio 2: Active-active com apenas um IP pÃºblico

**Sintoma:** A criaÃ§Ã£o do gateway falha ou volta para o modo active-standby.

**Causa raiz:** Apenas um IP pÃºblico foi especificado em `--public-ip-addresses` ao criar o gateway. O modo active-active requer exatamente dois IPs pÃºblicos.

**CorreÃ§Ã£o:** Recrie o gateway com dois IPs pÃºblicos (nÃ£o Ã© possÃ­vel adicionar um segundo IP apÃ³s a criaÃ§Ã£o):

```bash
# Delete and recreate (gateway update cannot add active-active after creation)
az network vnet-gateway delete \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --no-wait

# Recreate with two public IPs
az network vnet-gateway create \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --vnet vnet-hub \
    --gateway-type Vpn \
    --vpn-type RouteBased \
    --sku VpnGw2AZ \
    --public-ip-addresses pip-vgw-hub-1 pip-vgw-hub-2 \
    --active-active \
    --no-wait
```

### CenÃ¡rio 3: SKU nÃ£o-AZ em configuraÃ§Ã£o com redundÃ¢ncia de zona

**Sintoma:** O gateway Ã© implantado, mas nÃ£o sobrevive Ã  falha de zona de disponibilidade. A inspeÃ§Ã£o mostra instÃ¢ncias em uma Ãºnica zona.

**Causa raiz:** Um SKU nÃ£o-AZ (ex.: VpnGw2 em vez de VpnGw2AZ) foi usado. SKUs nÃ£o-AZ implantam ambas as instÃ¢ncias na mesma zona ou sem zona especÃ­fica.

**Comando de diagnÃ³stico:**

```bash
az network vnet-gateway show \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --query "sku.name" \
    --output tsv
# Returns: VpnGw2 (should be VpnGw2AZ)
```

**CorreÃ§Ã£o:** Recrie o gateway com um SKU AZ (a alteraÃ§Ã£o de SKU requer exclusÃ£o e recriaÃ§Ã£o):

```bash
az network vnet-gateway delete \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --no-wait

az network vnet-gateway create \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --vnet vnet-hub \
    --gateway-type Vpn \
    --vpn-type RouteBased \
    --sku VpnGw2AZ \
    --public-ip-addresses pip-vgw-hub-1 pip-vgw-hub-2 \
    --active-active \
    --no-wait
```

---

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-15-q1",
    question: "Quantos endereços IP públicos são necessários para um VPN Gateway ativo-ativo?",
    options: [
      "1",
      "2",
      "3",
      "Nenhum (usa apenas IPs privados)"
    ],
    correctIndex: 1,
    explanation: "Um VPN Gateway ativo-ativo requer exatamente dois endereços IP públicos, um para cada instância do gateway. Cada dispositivo local deve estabelecer túneis para ambos os IPs públicos para redundância completa."
  },
  {
    id: "az700-15-q2",
    question: "Qual SKU de VPN Gateway fornece implantação com redundância de zona entre zonas de disponibilidade?",
    options: [
      "VpnGw2",
      "VpnGw2AZ",
      "VpnGw2Standard",
      "VpnGw2Zone"
    ],
    correctIndex: 1,
    explanation: "Os SKUs de VPN Gateway com redundância de zona possuem o sufixo 'AZ' (VpnGw1AZ até VpnGw5AZ). Esses SKUs implantam instâncias do gateway em múltiplas zonas de disponibilidade, sobrevivendo a falhas de uma única zona. SKUs Standard (sem AZ) não garantem distribuição entre zonas."
  },
  {
    id: "az700-15-q3",
    question: "Qual é o ASN padrão atribuído aos Azure VPN Gateways se nenhum ASN personalizado for especificado?",
    options: [
      "64512",
      "65000",
      "65515",
      "65535"
    ],
    correctIndex: 2,
    explanation: "Os Azure VPN Gateways usam o ASN 65515 por padrão. Os dispositivos locais devem usar um ASN diferente para estabelecer o peering BGP. Escolhas comuns para on-premises estão na faixa de ASN privado (64512-65534), excluindo 65515."
  },
  {
    id: "az700-15-q4",
    question: "Qual é o principal caso de uso do Azure Extended Network?",
    options: [
      "Conectividade permanente de Camada 2 entre on-premises e Azure",
      "Extensão temporária de Camada 2 para permitir migração de VMs sem alteração de IP",
      "Transferência de dados de Camada 2 de alta velocidade para fins de backup",
      "Substituição do ExpressRoute por um overlay definido por software"
    ],
    correctIndex: 1,
    explanation: "O Azure Extended Network fornece uma extensão temporária de Camada 2 entre on-premises e Azure, permitindo que VMs sejam migradas sem alterar seus endereços IP. Ele é projetado como auxílio à migração, não como uma arquitetura permanente. Requer Windows Server 2019+ e é limitado a sub-redes /24."
  },
  {
    id: "az700-15-q5",
    question: "O que acontece durante a manutenção planejada do Azure em um VPN Gateway ativo-ativo?",
    options: [
      "Ambos os túneis caem simultaneamente por 60-90 segundos",
      "Uma instância é mantida por vez; a outra continua tratando o tráfego com tempo de inatividade próximo de zero",
      "O tráfego é pausado e enfileirado até a manutenção ser concluída",
      "O gateway faz failover automaticamente para uma instância standby em outra região"
    ],
    correctIndex: 1,
    explanation: "No modo ativo-ativo, o Azure realiza manutenção rotativa em uma instância por vez. Enquanto uma instância está em manutenção, a outra instância continua tratando o tráfego VPN através de seu túnel ativo, proporcionando tempo de inatividade próximo de zero para a conexão VPN."
  }
]} />

---

## Limpeza

Remova todos os recursos criados neste desafio para interromper a cobranÃ§a:

```bash
az group delete --name rg-vpn-ha-lab --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-vpn-ha-lab" -Force -AsJob
```

---

## ReferÃªncias adicionais

- [Conectividade entre locais com alta disponibilidade](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-highlyavailable)
- [VPN gateways active-active](https://learn.microsoft.com/en-us/azure/vpn-gateway/active-active-portal)
- [Configurar BGP para VPN gateways](https://learn.microsoft.com/en-us/azure/vpn-gateway/bgp-howto)
- [VPN gateways com redundÃ¢ncia de zona](https://learn.microsoft.com/en-us/azure/vpn-gateway/about-zone-redundant-vnet-gateways)
- [Azure Extended Network](https://learn.microsoft.com/en-us/windows-server/manage/windows-admin-center/azure/azure-extended-network)
