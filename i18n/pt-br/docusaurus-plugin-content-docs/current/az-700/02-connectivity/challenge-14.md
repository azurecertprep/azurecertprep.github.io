---
sidebar_position: 1
title: "Desafio 14: VPN Gateway Site a Site"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 14: Gateway VPN site a site

:::info Tempo e custo estimados

**60-90 minutos** | **~$0,19/h** (SKU VpnGw1) | **Peso no exame: 20-25%**

:::

:::warning Tempo de implantação

O provisionamento do VPN Gateway leva **30-45 minutos**. Use `--no-wait` e continue com outras tarefas enquanto o gateway é implantado.

:::

## Cenário

A Contoso possui uma rede virtual hub no Azure (`vnet-hub`, 10.1.0.0/16) e um datacenter local com o espaço de endereço 192.168.0.0/16. O dispositivo VPN local possui o IP público 203.0.113.50. A equipe de rede deve estabelecer um túnel VPN IPsec site a site entre a VNet hub do Azure e o datacenter local para habilitar a conectividade híbrida para cargas de trabalho que ainda não podem migrar para o Azure.

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

Após concluir este desafio, você será capaz de:

- Projetar e implementar uma conexão VPN site a site
- Criar e configurar um gateway de rede local representando o ambiente local
- Criar e configurar um gateway de rede virtual (tipo VPN)
- Identificar quando usar uma VPN baseada em política versus uma conexão VPN baseada em rota
- Verificar o status da conexão VPN e solucionar problemas de conectividade

## Pré-requisitos

- Uma assinatura do Azure com acesso de Colaborador
- Azure CLI instalado e autenticado (`az login`)
- PowerShell com o módulo Az instalado (`Install-Module Az -Force`)
- Um grupo de recursos e VNet já criados (ou crie-os na Tarefa 1)

## Conceitos-chave para o AZ-700

| Conceito | Detalhe |
|----------|---------|
| GatewaySubnet | Sub-rede dedicada para o gateway VPN; deve ser nomeada exatamente `GatewaySubnet`; tamanho recomendado /27 ou maior |
| Gateway de rede virtual | Endpoint VPN gerenciado pelo Azure; suporta baseado em rota (dinâmico) ou baseado em política (estático) |
| Gateway de rede local | Representação lógica do dispositivo VPN local (IP público + prefixos de endereço) |
| Conexão VPN | O túnel IPsec/IKE que conecta o gateway de rede virtual ao gateway de rede local |
| VPN baseada em rota | Usa tabelas de rotas para seleção de tráfego; suporta múltiplos túneis, P2S, VNet a VNet, coexistência com ExpressRoute |
| VPN baseada em política | Usa seletores de tráfego (ACLs); limitada a um único túnel S2S; necessária para dispositivos legados |
| Chave compartilhada (PSK) | Chave pré-compartilhada que deve coincidir em ambos os lados do túnel |

### VPN baseada em política vs baseada em rota

| Recurso | Baseada em política | Baseada em rota |
|---------|--------------------|--------------------|
| Versão IKE | Somente IKEv1 | IKEv1 e IKEv2 |
| Máximo de túneis S2S | 1 | 30 (VpnGw1) a 100 (VpnGw4/5) |
| Ponto a site | Não suportado | Suportado |
| Suporte a BGP | Não suportado | Suportado |
| VNet a VNet | Não suportado | Suportado |
| Coexistência com ExpressRoute | Não suportado | Suportado |
| SKU do gateway | Somente Basic | VpnGw1-5, VpnGw1AZ-5AZ |
| Caso de uso | Dispositivos locais legados que exigem correspondência de política IKEv1 | Todas as implantações modernas |

:::tip Nota de exame

O exame frequentemente testa quando a VPN baseada em política é necessária versus a baseada em rota. A resposta quase sempre é baseada em rota, a menos que a questão declare explicitamente um dispositivo legado que suporta apenas IKEv1 com seletores de tráfego baseados em política. Gateways baseados em rota são a recomendação padrão.

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

- O nome **deve** ser `GatewaySubnet` (sensível a maiúsculas/minúsculas, nenhum outro nome funciona)
- O tamanho mínimo recomendado é /27 (32 endereços) para permitir crescimento futuro e configurações active-active
- /28 é o mínimo absoluto, mas limita a expansibilidade futura
- Não associe um NSG ou tabela de rotas ao GatewaySubnet (isso pode interromper a operação do gateway)

:::

---

## Tarefa 2: Implantar o gateway VPN

### Etapa 1: Criar um IP público para o gateway

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

### Etapa 3: Monitorar o progresso da implantação

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

O gateway de rede local representa o dispositivo VPN local no Azure. Ele armazena o IP público do dispositivo local e os prefixos de endereço da rede local.

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

### Múltiplas sub-redes locais

Se a rede local tiver múltiplas sub-redes não contíguas, liste todas:

```bash
az network local-gateway create \
    --resource-group rg-vpn-lab \
    --name lgw-onprem-datacenter \
    --gateway-ip-address 203.0.113.50 \
    --local-address-prefixes 192.168.1.0/24 192.168.2.0/24 10.50.0.0/16 \
    --location eastus
```

---

## Tarefa 4: Criar a conexão VPN

Após o gateway VPN concluir o provisionamento, crie a conexão IPsec.

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

- A chave compartilhada deve ser idêntica em ambos os lados (Azure e dispositivo local)
- Máximo de 128 caracteres
- Suporta caracteres alfanuméricos e caracteres especiais
- Use uma chave forte e gerada aleatoriamente em produção

:::

---

## Tarefa 5: Verificar o status da conexão

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

### Valores de status da conexão

| Status | Significado |
|--------|-------------|
| Connected | O túnel está estabelecido e passando tráfego |
| Connecting | O lado Azure está pronto, mas aguardando resposta do dispositivo local |
| NotConnected | O objeto de conexão existe, mas o túnel não foi iniciado |
| Unknown | Não é possível determinar o estado (verifique a integridade do gateway) |

:::tip Simulação de laboratório

Em um laboratório sem um dispositivo local real, a conexão permanecerá no estado `Connecting`. Isso é esperado. Para simular um túnel totalmente conectado, implante um segundo gateway VPN em outra VNet e crie uma conexão VNet a VNet (ambos os lados estão sob seu controle).

:::

---

## Tarefa 6: Testar conectividade (simulação de laboratório com segunda VNet)

Para verificar a conectividade ponta a ponta em um laboratório, crie uma segunda VNet simulando a rede local:

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

Após ambos os gateways serem provisionados, crie conexões em ambas as direções:

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

## Cenários de quebra e correção

### Cenário 1: Incompatibilidade de chave compartilhada

**Sintoma:** O status da conexão permanece `Connecting` indefinidamente.

**Causa raiz:** A chave compartilhada na conexão Azure não corresponde Ã  chave configurada no dispositivo local.

**Comando de diagnóstico:**

```bash
az network vpn-connection show \
    --resource-group rg-vpn-lab \
    --name conn-hub-to-onprem \
    --query "connectionStatus" \
    --output tsv
# Returns: Connecting
```

**Correção:** Atualize a chave compartilhada para que ambos os lados coincidam:

```bash
az network vpn-connection update \
    --resource-group rg-vpn-lab \
    --name conn-hub-to-onprem \
    --shared-key "CorrectMatchingKey2024!"
```

### Cenário 2: GatewaySubnet ausente

**Sintoma:** A criação do gateway falha com um erro sobre sub-rede ausente.

**Causa raiz:** A VNet não possui uma sub-rede nomeada exatamente `GatewaySubnet`.

**Correção:** Crie a sub-rede com o nome exato exigido:

```bash
az network vnet subnet create \
    --resource-group rg-vpn-lab \
    --vnet-name vnet-hub \
    --name GatewaySubnet \
    --address-prefixes 10.1.255.0/27
```

### Cenário 3: Prefixos de endereço local incorretos

**Sintoma:** O túnel VPN está `Connected`, mas o tráfego para certas sub-redes locais não é roteado pelo túnel.

**Causa raiz:** O gateway de rede local está sem prefixos de endereço para algumas sub-redes locais.

**Comando de diagnóstico:**

```bash
az network local-gateway show \
    --resource-group rg-vpn-lab \
    --name lgw-onprem-datacenter \
    --query "localNetworkAddressSpace.addressPrefixes" \
    --output tsv
```

**Correção:** Atualize o gateway local com todos os prefixos locais:

```bash
az network local-gateway update \
    --resource-group rg-vpn-lab \
    --name lgw-onprem-datacenter \
    --local-address-prefixes 192.168.0.0/16 10.50.0.0/16
```

---

## Verificação de conhecimento

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

Remova todos os recursos criados neste desafio para parar a cobrança:

```bash
az group delete --name rg-vpn-lab --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-vpn-lab" -Force -AsJob
```

---

## Referências adicionais

- [Create a site-to-site VPN connection](https://learn.microsoft.com/en-us/azure/vpn-gateway/tutorial-site-to-site-portal)
- [About VPN Gateway](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways)
- [VPN Gateway FAQ](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-vpn-faq)
- [Policy-based vs route-based VPN gateways](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-connect-multiple-policybased-rm-ps)
