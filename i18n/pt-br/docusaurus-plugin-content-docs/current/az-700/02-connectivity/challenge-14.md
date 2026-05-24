---
sidebar_position: 1
title: "Desafio 14: VPN Gateway Site a Site"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 14: Gateway VPN site a site

:::info Tempo e custo estimados

**60-90 minutos** | **~$0,19/h** (SKU VpnGw1) | **Peso no exame: 20-25%**

:::

:::warning Tempo de implantaÃ§Ã£o

O provisionamento do VPN Gateway leva **30-45 minutos**. Use `--no-wait` e continue com outras tarefas enquanto o gateway Ã© implantado.

:::

## CenÃ¡rio

A Contoso possui uma rede virtual hub no Azure (`vnet-hub`, 10.1.0.0/16) e um datacenter local com o espaÃ§o de endereÃ§o 192.168.0.0/16. O dispositivo VPN local possui o IP pÃºblico 203.0.113.50. A equipe de rede deve estabelecer um tÃºnel VPN IPsec site a site entre a VNet hub do Azure e o datacenter local para habilitar a conectividade hÃ­brida para cargas de trabalho que ainda nÃ£o podem migrar para o Azure.

**Arquitetura:**

```text
On-premises datacenter                     Azure
(192.168.0.0/16)                          (10.1.0.0/16)

[VPN Device: 203.0.113.50] ---IPsec--- [VPN Gateway: vgw-hub]
                                              |
                                         vnet-hub
                                           â”œâ”€â”€ GatewaySubnet (10.1.255.0/27)
                                           â”œâ”€â”€ snet-workloads (10.1.1.0/24)
                                           â””â”€â”€ snet-mgmt (10.1.2.0/24)
```

## Objetivos de aprendizagem

ApÃ³s concluir este desafio, vocÃª serÃ¡ capaz de:

- Projetar e implementar uma conexÃ£o VPN site a site
- Criar e configurar um gateway de rede local representando o ambiente local
- Criar e configurar um gateway de rede virtual (tipo VPN)
- Identificar quando usar uma VPN baseada em polÃ­tica versus uma conexÃ£o VPN baseada em rota
- Verificar o status da conexÃ£o VPN e solucionar problemas de conectividade

## PrÃ©-requisitos

- Uma assinatura do Azure com acesso de Colaborador
- Azure CLI instalado e autenticado (`az login`)
- PowerShell com o mÃ³dulo Az instalado (`Install-Module Az -Force`)
- Um grupo de recursos e VNet jÃ¡ criados (ou crie-os na Tarefa 1)

## Conceitos-chave para o AZ-700

| Conceito | Detalhe |
|----------|---------|
| GatewaySubnet | Sub-rede dedicada para o gateway VPN; deve ser nomeada exatamente `GatewaySubnet`; tamanho recomendado /27 ou maior |
| Gateway de rede virtual | Endpoint VPN gerenciado pelo Azure; suporta baseado em rota (dinÃ¢mico) ou baseado em polÃ­tica (estÃ¡tico) |
| Gateway de rede local | RepresentaÃ§Ã£o lÃ³gica do dispositivo VPN local (IP pÃºblico + prefixos de endereÃ§o) |
| ConexÃ£o VPN | O tÃºnel IPsec/IKE que conecta o gateway de rede virtual ao gateway de rede local |
| VPN baseada em rota | Usa tabelas de rotas para seleÃ§Ã£o de trÃ¡fego; suporta mÃºltiplos tÃºneis, P2S, VNet a VNet, coexistÃªncia com ExpressRoute |
| VPN baseada em polÃ­tica | Usa seletores de trÃ¡fego (ACLs); limitada a um Ãºnico tÃºnel S2S; necessÃ¡ria para dispositivos legados |
| Chave compartilhada (PSK) | Chave prÃ©-compartilhada que deve coincidir em ambos os lados do tÃºnel |

### VPN baseada em polÃ­tica vs baseada em rota

| Recurso | Baseada em polÃ­tica | Baseada em rota |
|---------|--------------------|--------------------|
| VersÃ£o IKE | Somente IKEv1 | IKEv1 e IKEv2 |
| MÃ¡ximo de tÃºneis S2S | 1 | 30 (VpnGw1) a 100 (VpnGw4/5) |
| Ponto a site | NÃ£o suportado | Suportado |
| Suporte a BGP | NÃ£o suportado | Suportado |
| VNet a VNet | NÃ£o suportado | Suportado |
| CoexistÃªncia com ExpressRoute | NÃ£o suportado | Suportado |
| SKU do gateway | Somente Basic | VpnGw1-5, VpnGw1AZ-5AZ |
| Caso de uso | Dispositivos locais legados que exigem correspondÃªncia de polÃ­tica IKEv1 | Todas as implantaÃ§Ãµes modernas |

:::tip Nota de exame

O exame frequentemente testa quando a VPN baseada em polÃ­tica Ã© necessÃ¡ria versus a baseada em rota. A resposta quase sempre Ã© baseada em rota, a menos que a questÃ£o declare explicitamente um dispositivo legado que suporta apenas IKEv1 com seletores de trÃ¡fego baseados em polÃ­tica. Gateways baseados em rota sÃ£o a recomendaÃ§Ã£o padrÃ£o.

:::

---

## Tarefa 1: Criar a VNet hub e o GatewaySubnet

### Azure CLI

```bash
# Create resource group
az group create \
    --name rg-vpn-lab \
    --location eastus

# Create hub VNet
az network vnet create \
    --resource-group rg-vpn-lab \
    --name vnet-hub \
    --location eastus \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name snet-workloads \
    --subnet-prefixes 10.1.1.0/24

# Create the GatewaySubnet (must be named exactly "GatewaySubnet")
az network vnet subnet create \
    --resource-group rg-vpn-lab \
    --vnet-name vnet-hub \
    --name GatewaySubnet \
    --address-prefixes 10.1.255.0/27
```

### Azure PowerShell

```powershell
# Create resource group
New-AzResourceGroup -Name "rg-vpn-lab" -Location "eastus"

# Create hub VNet with subnets
$workloadsSubnet = New-AzVirtualNetworkSubnetConfig `
    -Name "snet-workloads" `
    -AddressPrefix "10.1.1.0/24"

$gatewaySubnet = New-AzVirtualNetworkSubnetConfig `
    -Name "GatewaySubnet" `
    -AddressPrefix "10.1.255.0/27"

New-AzVirtualNetwork `
    -ResourceGroupName "rg-vpn-lab" `
    -Name "vnet-hub" `
    -Location "eastus" `
    -AddressPrefix "10.1.0.0/16" `
    -Subnet $workloadsSubnet, $gatewaySubnet
```

:::note Requisitos do GatewaySubnet

- O nome **deve** ser `GatewaySubnet` (sensÃ­vel a maiÃºsculas/minÃºsculas, nenhum outro nome funciona)
- O tamanho mÃ­nimo recomendado Ã© /27 (32 endereÃ§os) para permitir crescimento futuro e configuraÃ§Ãµes active-active
- /28 Ã© o mÃ­nimo absoluto, mas limita a expansibilidade futura
- NÃ£o associe um NSG ou tabela de rotas ao GatewaySubnet (isso pode interromper a operaÃ§Ã£o do gateway)

:::

---

## Tarefa 2: Implantar o gateway VPN

### Etapa 1: Criar um IP pÃºblico para o gateway

```bash
az network public-ip create \
    --resource-group rg-vpn-lab \
    --name pip-vgw-hub \
    --location eastus \
    --allocation-method Static \
    --sku Standard
```

### Etapa 2: Criar o gateway de rede virtual

```bash
az network vnet-gateway create \
    --resource-group rg-vpn-lab \
    --name vgw-hub \
    --vnet vnet-hub \
    --gateway-type Vpn \
    --vpn-type RouteBased \
    --sku VpnGw1 \
    --vpn-gateway-generation Generation1 \
    --public-ip-addresses pip-vgw-hub \
    --no-wait
```

### Azure PowerShell

```powershell
# Create public IP
$pip = New-AzPublicIpAddress `
    -ResourceGroupName "rg-vpn-lab" `
    -Name "pip-vgw-hub" `
    -Location "eastus" `
    -AllocationMethod Static `
    -Sku Standard

# Get subnet reference
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-vpn-lab" -Name "vnet-hub"
$gwSubnet = Get-AzVirtualNetworkSubnetConfig -Name "GatewaySubnet" -VirtualNetwork $vnet

# Create IP configuration
$ipConfig = New-AzVirtualNetworkGatewayIpConfig `
    -Name "gwIpConfig" `
    -SubnetId $gwSubnet.Id `
    -PublicIpAddressId $pip.Id

# Create the VPN gateway (takes 30-45 minutes)
New-AzVirtualNetworkGateway `
    -ResourceGroupName "rg-vpn-lab" `
    -Name "vgw-hub" `
    -Location "eastus" `
    -IpConfigurations $ipConfig `
    -GatewayType Vpn `
    -VpnType RouteBased `
    -GatewaySku VpnGw1 `
    -AsJob
```

### Etapa 3: Monitorar o progresso da implantaÃ§Ã£o

```bash
# Check provisioning state (repeat until "Succeeded")
az network vnet-gateway show \
    --resource-group rg-vpn-lab \
    --name vgw-hub \
    --query "provisioningState" \
    --output tsv
```

---

## Tarefa 3: Criar o gateway de rede local

O gateway de rede local representa o dispositivo VPN local no Azure. Ele armazena o IP pÃºblico do dispositivo local e os prefixos de endereÃ§o da rede local.

### Azure CLI

```bash
az network local-gateway create \
    --resource-group rg-vpn-lab \
    --name lgw-onprem-datacenter \
    --gateway-ip-address 203.0.113.50 \
    --local-address-prefixes 192.168.0.0/16 \
    --location eastus
```

### Azure PowerShell

```powershell
New-AzLocalNetworkGateway `
    -ResourceGroupName "rg-vpn-lab" `
    -Name "lgw-onprem-datacenter" `
    -Location "eastus" `
    -GatewayIpAddress "203.0.113.50" `
    -AddressPrefix "192.168.0.0/16"
```

### MÃºltiplas sub-redes locais

Se a rede local tiver mÃºltiplas sub-redes nÃ£o contÃ­guas, liste todas:

```bash
az network local-gateway create \
    --resource-group rg-vpn-lab \
    --name lgw-onprem-datacenter \
    --gateway-ip-address 203.0.113.50 \
    --local-address-prefixes 192.168.1.0/24 192.168.2.0/24 10.50.0.0/16 \
    --location eastus
```

---

## Tarefa 4: Criar a conexÃ£o VPN

ApÃ³s o gateway VPN concluir o provisionamento, crie a conexÃ£o IPsec.

### Azure CLI

```bash
az network vpn-connection create \
    --resource-group rg-vpn-lab \
    --name conn-hub-to-onprem \
    --vnet-gateway1 vgw-hub \
    --local-gateway2 lgw-onprem-datacenter \
    --shared-key "Contoso!VPN#2024secure"
```

### Azure PowerShell

```powershell
$vgw = Get-AzVirtualNetworkGateway -ResourceGroupName "rg-vpn-lab" -Name "vgw-hub"
$lgw = Get-AzLocalNetworkGateway -ResourceGroupName "rg-vpn-lab" -Name "lgw-onprem-datacenter"

New-AzVirtualNetworkGatewayConnection `
    -ResourceGroupName "rg-vpn-lab" `
    -Name "conn-hub-to-onprem" `
    -Location "eastus" `
    -VirtualNetworkGateway1 $vgw `
    -LocalNetworkGateway2 $lgw `
    -ConnectionType IPsec `
    -SharedKey "Contoso!VPN#2024secure"
```

:::note Requisitos da chave compartilhada

- A chave compartilhada deve ser idÃªntica em ambos os lados (Azure e dispositivo local)
- MÃ¡ximo de 128 caracteres
- Suporta caracteres alfanumÃ©ricos e caracteres especiais
- Use uma chave forte e gerada aleatoriamente em produÃ§Ã£o

:::

---

## Tarefa 5: Verificar o status da conexÃ£o

### Azure CLI

```bash
# Check connection status
az network vpn-connection show \
    --resource-group rg-vpn-lab \
    --name conn-hub-to-onprem \
    --query "{status:connectionStatus, inBytes:ingressBytesTransferred, outBytes:egressBytesTransferred}" \
    --output table
```

### Azure PowerShell

```powershell
Get-AzVirtualNetworkGatewayConnection `
    -ResourceGroupName "rg-vpn-lab" `
    -Name "conn-hub-to-onprem" | `
    Select-Object Name, ConnectionStatus, IngressBytesTransferred, EgressBytesTransferred
```

### Valores de status da conexÃ£o

| Status | Significado |
|--------|-------------|
| Connected | O tÃºnel estÃ¡ estabelecido e passando trÃ¡fego |
| Connecting | O lado Azure estÃ¡ pronto, mas aguardando resposta do dispositivo local |
| NotConnected | O objeto de conexÃ£o existe, mas o tÃºnel nÃ£o foi iniciado |
| Unknown | NÃ£o Ã© possÃ­vel determinar o estado (verifique a integridade do gateway) |

:::tip SimulaÃ§Ã£o de laboratÃ³rio

Em um laboratÃ³rio sem um dispositivo local real, a conexÃ£o permanecerÃ¡ no estado `Connecting`. Isso Ã© esperado. Para simular um tÃºnel totalmente conectado, implante um segundo gateway VPN em outra VNet e crie uma conexÃ£o VNet a VNet (ambos os lados estÃ£o sob seu controle).

:::

---

## Tarefa 6: Testar conectividade (simulaÃ§Ã£o de laboratÃ³rio com segunda VNet)

Para verificar a conectividade ponta a ponta em um laboratÃ³rio, crie uma segunda VNet simulando a rede local:

```bash
# Create simulated on-prem VNet
az network vnet create \
    --resource-group rg-vpn-lab \
    --name vnet-onprem-sim \
    --location eastus \
    --address-prefixes 192.168.0.0/16 \
    --subnet-name snet-servers \
    --subnet-prefixes 192.168.1.0/24

az network vnet subnet create \
    --resource-group rg-vpn-lab \
    --vnet-name vnet-onprem-sim \
    --name GatewaySubnet \
    --address-prefixes 192.168.255.0/27

# Create second public IP and gateway
az network public-ip create \
    --resource-group rg-vpn-lab \
    --name pip-vgw-onprem \
    --location eastus \
    --allocation-method Static \
    --sku Standard

az network vnet-gateway create \
    --resource-group rg-vpn-lab \
    --name vgw-onprem-sim \
    --vnet vnet-onprem-sim \
    --gateway-type Vpn \
    --vpn-type RouteBased \
    --sku VpnGw1 \
    --vpn-gateway-generation Generation1 \
    --public-ip-addresses pip-vgw-onprem \
    --no-wait
```

ApÃ³s ambos os gateways serem provisionados, crie conexÃµes em ambas as direÃ§Ãµes:

```bash
# Update local gateway with actual public IP of simulated on-prem gateway
ONPREM_GW_IP=$(az network public-ip show \
    --resource-group rg-vpn-lab \
    --name pip-vgw-onprem \
    --query "ipAddress" \
    --output tsv)

az network local-gateway update \
    --resource-group rg-vpn-lab \
    --name lgw-onprem-datacenter \
    --gateway-ip-address "$ONPREM_GW_IP"

# Create the reverse local gateway (representing Azure hub from on-prem perspective)
HUB_GW_IP=$(az network public-ip show \
    --resource-group rg-vpn-lab \
    --name pip-vgw-hub \
    --query "ipAddress" \
    --output tsv)

az network local-gateway create \
    --resource-group rg-vpn-lab \
    --name lgw-azure-hub \
    --gateway-ip-address "$HUB_GW_IP" \
    --local-address-prefixes 10.1.0.0/16 \
    --location eastus

# Create reverse connection (on-prem to hub) with same shared key
az network vpn-connection create \
    --resource-group rg-vpn-lab \
    --name conn-onprem-to-hub \
    --vnet-gateway1 vgw-onprem-sim \
    --local-gateway2 lgw-azure-hub \
    --shared-key "Contoso!VPN#2024secure"
```

---

## CenÃ¡rios de quebra e correÃ§Ã£o

### CenÃ¡rio 1: Incompatibilidade de chave compartilhada

**Sintoma:** O status da conexÃ£o permanece `Connecting` indefinidamente.

**Causa raiz:** A chave compartilhada na conexÃ£o Azure nÃ£o corresponde Ã  chave configurada no dispositivo local.

**Comando de diagnÃ³stico:**

```bash
az network vpn-connection show \
    --resource-group rg-vpn-lab \
    --name conn-hub-to-onprem \
    --query "connectionStatus" \
    --output tsv
# Returns: Connecting
```

**CorreÃ§Ã£o:** Atualize a chave compartilhada para que ambos os lados coincidam:

```bash
az network vpn-connection update \
    --resource-group rg-vpn-lab \
    --name conn-hub-to-onprem \
    --shared-key "CorrectMatchingKey2024!"
```

### CenÃ¡rio 2: GatewaySubnet ausente

**Sintoma:** A criaÃ§Ã£o do gateway falha com um erro sobre sub-rede ausente.

**Causa raiz:** A VNet nÃ£o possui uma sub-rede nomeada exatamente `GatewaySubnet`.

**CorreÃ§Ã£o:** Crie a sub-rede com o nome exato exigido:

```bash
az network vnet subnet create \
    --resource-group rg-vpn-lab \
    --vnet-name vnet-hub \
    --name GatewaySubnet \
    --address-prefixes 10.1.255.0/27
```

### CenÃ¡rio 3: Prefixos de endereÃ§o local incorretos

**Sintoma:** O tÃºnel VPN estÃ¡ `Connected`, mas o trÃ¡fego para certas sub-redes locais nÃ£o Ã© roteado pelo tÃºnel.

**Causa raiz:** O gateway de rede local estÃ¡ sem prefixos de endereÃ§o para algumas sub-redes locais.

**Comando de diagnÃ³stico:**

```bash
az network local-gateway show \
    --resource-group rg-vpn-lab \
    --name lgw-onprem-datacenter \
    --query "localNetworkAddressSpace.addressPrefixes" \
    --output tsv
```

**CorreÃ§Ã£o:** Atualize o gateway local com todos os prefixos locais:

```bash
az network local-gateway update \
    --resource-group rg-vpn-lab \
    --name lgw-onprem-datacenter \
    --local-address-prefixes 192.168.0.0/16 10.50.0.0/16
```

---

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-14-q1",
    question: "Qual deve ser o nome da sub-rede dedicada para um VPN Gateway?",
    options: [
      "GatewaySubnet",
      "VpnGatewaySubnet",
      "gateway-subnet",
      "Qualquer nome com uma tag 'gateway'"
    ],
    correctIndex: 0,
    explanation: "A sub-rede deve ser nomeada exatamente como 'GatewaySubnet' (sensível a maiúsculas/minúsculas). O Azure não implantará um gateway de rede virtual em uma sub-rede com qualquer outro nome."
  },
  {
    id: "az700-14-q2",
    question: "Uma organização parceira possui um dispositivo VPN legado que suporta apenas IKEv1 com seletores de tráfego baseados em política. Qual tipo de VPN você deve configurar no Azure VPN Gateway?",
    options: [
      "Route-based com política IPsec personalizada",
      "Policy-based",
      "Route-based com BGP habilitado",
      "Route-based com túnel forçado"
    ],
    correctIndex: 1,
    explanation: "VPN Gateways policy-based utilizam IKEv1 com seletores de tráfego definidos por ACLs (políticas de acesso). Eles são necessários quando o dispositivo local suporta apenas negociações policy-based. Gateways route-based utilizam IKEv2 com tabelas de rotas e não suportam dispositivos legados que requerem apenas IKEv1 com correspondência de política."
  },
  {
    id: "az700-14-q3",
    question: "Qual recurso do Azure representa o dispositivo VPN local em uma configuração de VPN site-to-site?",
    options: [
      "Virtual network gateway",
      "Conexão VPN",
      "Local network gateway",
      "Interface de rede"
    ],
    correctIndex: 2,
    explanation: "O Local network gateway é o recurso do Azure que representa o dispositivo VPN local. Ele armazena o endereço IP público do dispositivo local e os prefixos de endereço da rede on-premises, permitindo que o Azure saiba para onde rotear o tráfego destinado à rede local."
  },
  {
    id: "az700-14-q4",
    question: "Uma conexão VPN mostra o status 'Connecting' por mais de 30 minutos. Qual é a causa mais provável?",
    options: [
      "O SKU do VPN Gateway é muito pequeno",
      "A chave compartilhada (PSK) não corresponde entre os dois lados",
      "A GatewaySubnet é muito grande",
      "O Local network gateway está na região errada"
    ],
    correctIndex: 1,
    explanation: "Um estado persistente de 'Connecting' tipicamente indica que a negociação IKE está falhando. A causa mais comum é uma incompatibilidade da chave compartilhada entre a conexão do Azure e o dispositivo local. Outras causas incluem regras de firewall bloqueando UDP 500/4500 ou parâmetros IKE/IPsec incompatíveis."
  },
  {
    id: "az700-14-q5",
    question: "Qual das seguintes opções NÃO é uma limitação dos VPN Gateways policy-based?",
    options: [
      "Máximo de um túnel S2S",
      "Sem suporte a BGP",
      "Sem suporte a IKEv1",
      "Sem suporte a Point-to-Site"
    ],
    correctIndex: 2,
    explanation: "VPN Gateways policy-based utilizam exclusivamente IKEv1, portanto 'sem suporte a IKEv1' é incorreto como limitação. As limitações reais são: apenas um túnel S2S, sem BGP, sem P2S, sem VNet-to-VNet e apenas o SKU Basic."
  }
]} />

---

## Limpeza

Remova todos os recursos criados neste desafio para parar a cobranÃ§a:

```bash
az group delete --name rg-vpn-lab --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-vpn-lab" -Force -AsJob
```

---

## ReferÃªncias adicionais

- [Create a site-to-site VPN connection](https://learn.microsoft.com/en-us/azure/vpn-gateway/tutorial-site-to-site-portal)
- [About VPN Gateway](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways)
- [VPN Gateway FAQ](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-vpn-faq)
- [Policy-based vs route-based VPN gateways](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-connect-multiple-policybased-rm-ps)
