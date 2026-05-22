---
sidebar_position: 2
title: "Challenge 15: S2S VPN High Availability & Multi-Site"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 15: Alta disponibilidade de VPN S2S e vários sites

:::info Tempo e custo estimados

**75-120 minutos** | **~$0,55/h** (SKU VpnGw2AZ) | **Peso no exame: 20-25%**

:::

:::warning Tempo de implantação

O provisionamento do VPN Gateway active-active leva **30-45 minutos**. Use `--no-wait` e continue com o aprendizado conceitual enquanto o gateway é implantado.

:::

## Cenário

A VPN site a site da Contoso estabelecida no Challenge 14 usa uma única instância de VPN gateway, criando um ponto único de falha. Durante um evento recente de manutenção do Azure, o túnel VPN ficou inativo por 15 minutos, causando uma interrupção nos negócios. A equipe de rede deve implementar alta disponibilidade para o VPN gateway usando configuração active-active com SKUs com redundância de zona, conectar-se a vários sites locais e configurar BGP para troca dinâmica de rotas. Além disso, a equipe precisa entender o Azure Extended Network para um projeto futuro de migração Layer 2.

**Arquitetura:**

```
On-prem Site A (Dallas)           Azure (East US)              On-prem Site B (Chicago)
(10.10.0.0/16)                   (10.1.0.0/16)               (10.20.0.0/16)
                                       |
[VPN Device A]  ─── Tunnel 1 ──► [pip-vgw-1]                [VPN Device B]
  203.0.113.10                        |                        198.51.100.25
                                  [VPN Gateway]
[VPN Device A]  ─── Tunnel 2 ──► [pip-vgw-2]                [VPN Device B]
  203.0.113.10                        |                        198.51.100.25
                                  Active-Active
                               (VpnGw2AZ, Zone 1+2)
                                  BGP ASN: 65010
```

## Objetivos de aprendizagem

Após concluir este desafio, você será capaz de:

- Projetar e implementar uma conexão VPN site a site com alta disponibilidade
- Implantar um VPN gateway active-active com SKUs com redundância de zona
- Configurar BGP em VPN gateways para roteamento dinâmico
- Conectar vários sites locais a um único VPN gateway (vários sites)
- Explicar a finalidade e o caso de uso do Azure Extended Network

## Pré-requisitos

- Conclusão do Challenge 14 (ou compreensão dos conceitos básicos de VPN S2S)
- Uma assinatura do Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- PowerShell com o módulo Az instalado

## Conceitos-chave para o AZ-700

| Conceito | Detalhe |
|----------|---------|
| Gateway active-active | Duas instâncias de gateway, cada uma com seu próprio IP público; ambos os túneis ativos simultaneamente |
| Gateway com redundância de zona | SKUs terminados em "AZ" (ex.: VpnGw2AZ) implantam instâncias em zonas de disponibilidade |
| BGP (Border Gateway Protocol) | Protocolo de roteamento dinâmico; anuncia rotas automaticamente em vez de local-address-prefixes estáticos |
| ASN (Autonomous System Number) | Identificador único para um speaker BGP; o padrão do Azure é 65515 |
| VPN de vários sites | Vários gateways de rede local conectados a um único VPN gateway (uma conexão por site) |
| Azure Extended Network | Overlay Layer 2 que estende uma sub-rede local para o Azure para migração ao vivo sem re-IP |

### Active-active vs active-standby

| Recurso | Active-standby (padrão) | Active-active |
|---------|-------------------------|---------------|
| Instâncias do gateway | 2 (uma ativa, uma em standby) | 2 (ambas ativas) |
| IPs públicos | 1 | 2 (um por instância) |
| Tempo de failover | 60-90 segundos | Quase instantâneo (outro túnel já ativo) |
| Túneis por site | 1 | 2 (um para cada instância) |
| Configuração on-premises | Túnel único para um IP | Dois túneis para dois IPs |
| Throughput | Largura de banda de instância única | Largura de banda agregada de ambas as instâncias |

### Nomenclatura de SKU com redundância de zona

| SKU padrão | Equivalente com redundância de zona |
|------------|-------------------------------------|
| VpnGw1 | VpnGw1AZ |
| VpnGw2 | VpnGw2AZ |
| VpnGw3 | VpnGw3AZ |
| VpnGw4 | VpnGw4AZ |
| VpnGw5 | VpnGw5AZ |

SKUs com redundância de zona exigem **IPs públicos de SKU Standard** (não Basic) com alocação **com redundância de zona**.

---

## Tarefa 1: Implantar um VPN gateway active-active com redundância de zona

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

### Etapa 2: Criar dois IPs públicos com redundância de zona (necessário para active-active)

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

:::note IPs públicos com redundância de zona

Ao usar SKUs de gateway com redundância de zona (terminados em AZ), os IPs públicos devem ser de SKU Standard. Especificar `--zone 1 2 3` torna o IP com redundância de zona, o que significa que ele sobrevive à falha de qualquer zona de disponibilidade individual.

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

## Tarefa 2: Conectar vários sites locais (VPN de vários sites)

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

### Etapa 2: Criar conexões VPN para cada site

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

:::tip Considerações sobre vários sites

- Cada site local requer seu próprio gateway de rede local e recurso de conexão VPN
- VPN gateways baseados em rota suportam até 30 túneis S2S (VpnGw1) ou 100 (VpnGw4/5)
- Os espaços de endereço em todos os gateways de rede local não devem se sobrepor
- Cada conexão pode ter uma chave compartilhada diferente

:::

---

## Tarefa 3: Configurar BGP no VPN gateway

O BGP permite a troca dinâmica de rotas, eliminando a necessidade de manter manualmente `--local-address-prefixes` nos gateways de rede local quando as redes locais mudam.

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

### Etapa 3: Criar uma conexão com BGP habilitado

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

### Etapa 4: Verificar a configuração do BGP

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

- ASN reservado do Azure: 65515 (padrão para VPN gateways do Azure se não especificado)
- Não use 65515 para dispositivos on-premises
- Faixa de ASN privado: 64512-65534 e 4200000000-4294967294
- Cada peer BGP (gateway do Azure e dispositivo on-premises) deve ter um ASN único
- O `--bgp-peering-address` no gateway de rede local é o IP interno do peer BGP do dispositivo on-premises (não seu IP público)

:::

---

## Tarefa 4: Verificar as instâncias do gateway active-active

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

Em uma configuração active-active, se uma instância do gateway ficar indisponível, o dispositivo on-premises detecta o peer inativo (via IKE Dead Peer Detection) e faz failover para o túnel ativo restante. Nenhuma ação do lado do Azure é necessária.

### Etapas de verificação

```bash
# Monitor connection status for both tunnels
az network vpn-connection show \
    --resource-group rg-vpn-ha-lab \
    --name conn-to-dallas \
    --query "{status:connectionStatus, tunnelStatus:tunnelConnectionStatus}" \
    --output json
```

### Compreendendo o comportamento de failover

| Cenário | Comportamento active-standby | Comportamento active-active |
|---------|------------------------------|----------------------------|
| Manutenção planejada | 60-90 segundos de inatividade | Quase zero inatividade (outro túnel permanece) |
| Falha de zona | Gateway indisponível se na zona afetada | Sobrevive se usar SKU AZ entre zonas |
| Falha de instância única | 60-90 segundos de failover para standby | Uso imediato do outro túnel ativo |
| Falha do dispositivo on-premises | Túnel inativo até o dispositivo recuperar | Túnel inativo até o dispositivo recuperar (igual) |

---

## Tarefa 6: Azure Extended Network (conceitual)

O Azure Extended Network é uma tecnologia de overlay Layer 2 que estende uma sub-rede on-premises para uma VNet do Azure, permitindo que VMs mantenham seus endereços IP on-premises quando migradas para o Azure.

### Caso de uso

- Migração ao vivo de VMs do on-premises para o Azure sem alterar endereços IP
- Evitar re-IP durante projetos de migração em fases
- Manter dependências de rede (IPs codificados, aplicativos legados) durante a transição

### Requisitos e limitações

| Requisito | Detalhe |
|-----------|---------|
| On-premises | Windows Server 2019+ com Hyper-V |
| Azure | VMs com Windows Server 2019+ no Azure |
| Rede | VPN site a site ou ExpressRoute entre on-premises e Azure |
| Sub-rede | Máximo de /24 para a sub-rede estendida |
| Escopo | Destinado apenas para migração, não para uso em produção a longo prazo |

### Como funciona

1. Um par de VMs appliance (uma on-premises, uma no Azure) cria um túnel VXLAN sobre a VPN S2S
2. O tráfego ARP e broadcast é intermediado entre os dois lados
3. VMs em ambos os lados da sub-rede estendida podem se comunicar na Layer 2
4. Após a conclusão da migração, o lado on-premises é descomissionado

:::tip Nota de exame

O Azure Extended Network é um tópico de nicho no exame. Pontos-chave a lembrar: requer Windows Server 2019+, funciona sobre VPN S2S ou ExpressRoute existente, é limitado a sub-redes /24 e é projetado como um auxílio temporário de migração (não uma arquitetura permanente). Se o exame perguntar sobre estender Layer 2 para o Azure, esta é a resposta.

:::

### Comandos de referência (apenas conceitual)

O Azure Extended Network é configurado através do Windows Admin Center, não via Azure CLI ou PowerShell diretamente:

1. Instale a extensão Azure Extended Network no Windows Admin Center
2. Conecte-se ao host on-premises
3. Selecione a sub-rede a ser estendida
4. Especifique a VNet e a sub-rede do Azure para estender
5. Implante a VM appliance do Azure

Para detalhes, consulte a [documentação do Azure Extended Network](https://learn.microsoft.com/en-us/windows-server/manage/windows-admin-center/azure/azure-extended-network).

---

## Cenários de quebra e correção

### Cenário 1: Conflito de ASN do BGP

**Sintoma:** O peering BGP falha ao estabelecer. A conexão mostra `Connected`, mas nenhuma rota é aprendida.

**Causa raiz:** Tanto o VPN gateway do Azure quanto o dispositivo on-premises estão configurados com o mesmo ASN (ex.: ambos usando 65515).

**Comando de diagnóstico:**

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

**Correção:** Altere um dos lados para um ASN único:

```bash
az network vnet-gateway update \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --asn 65010
```

### Cenário 2: Active-active com apenas um IP público

**Sintoma:** A criação do gateway falha ou volta para o modo active-standby.

**Causa raiz:** Apenas um IP público foi especificado em `--public-ip-addresses` ao criar o gateway. O modo active-active requer exatamente dois IPs públicos.

**Correção:** Recrie o gateway com dois IPs públicos (não é possível adicionar um segundo IP após a criação):

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

### Cenário 3: SKU não-AZ em configuração com redundância de zona

**Sintoma:** O gateway é implantado, mas não sobrevive à falha de zona de disponibilidade. A inspeção mostra instâncias em uma única zona.

**Causa raiz:** Um SKU não-AZ (ex.: VpnGw2 em vez de VpnGw2AZ) foi usado. SKUs não-AZ implantam ambas as instâncias na mesma zona ou sem zona específica.

**Comando de diagnóstico:**

```bash
az network vnet-gateway show \
    --resource-group rg-vpn-ha-lab \
    --name vgw-hub-ha \
    --query "sku.name" \
    --output tsv
# Returns: VpnGw2 (should be VpnGw2AZ)
```

**Correção:** Recrie o gateway com um SKU AZ (a alteração de SKU requer exclusão e recriação):

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

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-15-q1",
    question: "How many public IP addresses are required for an active-active VPN gateway?",
    options: [
      "1",
      "2",
      "3",
      "None (uses private IPs only)"
    ],
    correctIndex: 1,
    explanation: "An active-active VPN gateway requires exactly two public IP addresses, one for each gateway instance. Each on-premises device must establish tunnels to both public IPs for full redundancy."
  },
  {
    id: "az700-15-q2",
    question: "Which VPN Gateway SKU provides zone-redundant deployment across availability zones?",
    options: [
      "VpnGw2",
      "VpnGw2AZ",
      "VpnGw2Standard",
      "VpnGw2Zone"
    ],
    correctIndex: 1,
    explanation: "Zone-redundant VPN Gateway SKUs have the 'AZ' suffix (VpnGw1AZ through VpnGw5AZ). These SKUs deploy gateway instances across multiple availability zones, surviving single-zone failures. Standard (non-AZ) SKUs do not guarantee zone distribution."
  },
  {
    id: "az700-15-q3",
    question: "What is the default ASN assigned to Azure VPN gateways if no custom ASN is specified?",
    options: [
      "64512",
      "65000",
      "65515",
      "65535"
    ],
    correctIndex: 2,
    explanation: "Azure VPN gateways use ASN 65515 by default. On-premises devices must use a different ASN to establish BGP peering. Common choices for on-prem are in the private ASN range (64512-65534), excluding 65515."
  },
  {
    id: "az700-15-q4",
    question: "What is the primary use case for Azure Extended Network?",
    options: [
      "Permanent Layer 2 connectivity between on-premises and Azure",
      "Temporary Layer 2 stretch to allow VM migration without re-IP",
      "High-speed Layer 2 data transfer for backup purposes",
      "Replacing ExpressRoute with a software-defined overlay"
    ],
    correctIndex: 1,
    explanation: "Azure Extended Network provides a temporary Layer 2 stretch between on-premises and Azure, allowing VMs to be migrated without changing their IP addresses. It is designed as a migration aid, not a permanent architecture. It requires Windows Server 2019+ and is limited to /24 subnets."
  },
  {
    id: "az700-15-q5",
    question: "What happens during planned Azure maintenance on an active-active VPN gateway?",
    options: [
      "Both tunnels go down simultaneously for 60-90 seconds",
      "One instance is maintained at a time; the other continues handling traffic with near-zero downtime",
      "Traffic is paused and queued until maintenance completes",
      "The gateway automatically fails over to a standby instance in another region"
    ],
    correctIndex: 1,
    explanation: "In active-active mode, Azure performs rolling maintenance on one instance at a time. While one instance is being maintained, the other instance continues to handle VPN traffic through its active tunnel, providing near-zero downtime for the VPN connection."
  }
]} />

---

## Limpeza

Remova todos os recursos criados neste desafio para interromper a cobrança:

```bash
az group delete --name rg-vpn-ha-lab --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-vpn-ha-lab" -Force -AsJob
```

---

## Referências adicionais

- [Conectividade entre locais com alta disponibilidade](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-highlyavailable)
- [VPN gateways active-active](https://learn.microsoft.com/en-us/azure/vpn-gateway/active-active-portal)
- [Configurar BGP para VPN gateways](https://learn.microsoft.com/en-us/azure/vpn-gateway/bgp-howto)
- [VPN gateways com redundância de zona](https://learn.microsoft.com/en-us/azure/vpn-gateway/about-zone-redundant-vnet-gateways)
- [Azure Extended Network](https://learn.microsoft.com/en-us/windows-server/manage/windows-admin-center/azure/azure-extended-network)
