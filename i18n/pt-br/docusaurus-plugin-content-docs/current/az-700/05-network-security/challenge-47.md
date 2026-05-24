---
sidebar_position: 8
title: "Desafio 47: Hub-Spoke com Encadeamento de Tráfego NVA"
sidebar_label: "Challenge 47"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 47: Hub-spoke com encadeamento de tráfego via NVA

:::info Tempo e custo estimados

**90-120 minutos** | **~$0,50/hora** (múltiplas VMs + balanceador de carga) | **Peso no exame: 15-20%**

:::

## Cenário

Sua empresa adotou uma topologia de rede hub-spoke. Todo o tráfego spoke-para-spoke e spoke-para-internet deve ser inspecionado por um Dispositivo Virtual de Rede (NVA) baseado em Linux executando iptables na VNet hub. Você deve implantar duas instâncias de NVA atrás de um balanceador de carga interno para alta disponibilidade, configurar Rotas Definidas pelo Usuário (UDR) para encadear o tráfego através do NVA e implementar microssegmentação com Application Security Group (ASG) nos spokes.

Um requisito crítico é que o tráfego retornando do ambiente local via gateway VPN também deve atravessar o NVA -- prevenindo roteamento assimétrico.

---

## Visão geral da arquitetura

```text
                    +-----------+
                    |  Internet |
                    +-----+-----+
                          |
              +-----------+-----------+
              |     Hub VNet          |
              |   10.0.0.0/16        |
              |                       |
              |  +------+ +------+   |
              |  | NVA1 | | NVA2 |   |
              |  +--+---+ +--+---+   |
              |     |   ILB   |      |
              |     +----+----+      |
              |  GatewaySubnet       |
              +-+--------+--------+--+
                |                 |
       +--------+---+     +------+------+
       | Spoke1 VNet|     | Spoke2 VNet |
       | 10.1.0.0/16|     | 10.2.0.0/16 |
       +------------+     +-------------+
```

---

## Tarefa 1: Implantar a topologia hub-spoke

### Azure CLI

```bash
# Variables
RG="rg-hubspoke-lab"
LOCATION="eastus"
HUB_VNET="vnet-hub"
SPOKE1_VNET="vnet-spoke1"
SPOKE2_VNET="vnet-spoke2"

# Create resource group
az group create --name $RG --location $LOCATION

# Create hub VNet with subnets
az network vnet create \
  --resource-group $RG \
  --name $HUB_VNET \
  --address-prefixes 10.0.0.0/16 \
  --subnet-name nva-subnet \
  --subnet-prefixes 10.0.1.0/24 \
  --location $LOCATION

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $HUB_VNET \
  --name GatewaySubnet \
  --address-prefixes 10.0.255.0/27

# Create spoke VNets
az network vnet create \
  --resource-group $RG \
  --name $SPOKE1_VNET \
  --address-prefixes 10.1.0.0/16 \
  --subnet-name workload-subnet \
  --subnet-prefixes 10.1.1.0/24 \
  --location $LOCATION

az network vnet create \
  --resource-group $RG \
  --name $SPOKE2_VNET \
  --address-prefixes 10.2.0.0/16 \
  --subnet-name workload-subnet \
  --subnet-prefixes 10.2.1.0/24 \
  --location $LOCATION

# Create hub-to-spoke1 peering (hub side)
az network vnet peering create \
  --resource-group $RG \
  --name hub-to-spoke1 \
  --vnet-name $HUB_VNET \
  --remote-vnet $SPOKE1_VNET \
  --allow-vnet-access true \
  --allow-forwarded-traffic true \
  --allow-gateway-transit true

# Create spoke1-to-hub peering (spoke side)
az network vnet peering create \
  --resource-group $RG \
  --name spoke1-to-hub \
  --vnet-name $SPOKE1_VNET \
  --remote-vnet $HUB_VNET \
  --allow-vnet-access true \
  --allow-forwarded-traffic true \
  --use-remote-gateways false

# Create hub-to-spoke2 peering (hub side)
az network vnet peering create \
  --resource-group $RG \
  --name hub-to-spoke2 \
  --vnet-name $HUB_VNET \
  --remote-vnet $SPOKE2_VNET \
  --allow-vnet-access true \
  --allow-forwarded-traffic true \
  --allow-gateway-transit true

# Create spoke2-to-hub peering (spoke side)
az network vnet peering create \
  --resource-group $RG \
  --name spoke2-to-hub \
  --vnet-name $SPOKE2_VNET \
  --remote-vnet $HUB_VNET \
  --allow-vnet-access true \
  --allow-forwarded-traffic true \
  --use-remote-gateways false
```

### Azure PowerShell

```powershell
$rg = "rg-hubspoke-lab"
$location = "eastus"

New-AzResourceGroup -Name $rg -Location $location

# Create hub VNet
$nvaSub = New-AzVirtualNetworkSubnetConfig -Name "nva-subnet" -AddressPrefix "10.0.1.0/24"
$gwSub = New-AzVirtualNetworkSubnetConfig -Name "GatewaySubnet" -AddressPrefix "10.0.255.0/27"
$hubVnet = New-AzVirtualNetwork -Name "vnet-hub" -ResourceGroupName $rg `
  -Location $location -AddressPrefix "10.0.0.0/16" -Subnet $nvaSub, $gwSub

# Create spoke VNets
$spoke1Sub = New-AzVirtualNetworkSubnetConfig -Name "workload-subnet" -AddressPrefix "10.1.1.0/24"
$spoke1Vnet = New-AzVirtualNetwork -Name "vnet-spoke1" -ResourceGroupName $rg `
  -Location $location -AddressPrefix "10.1.0.0/16" -Subnet $spoke1Sub

$spoke2Sub = New-AzVirtualNetworkSubnetConfig -Name "workload-subnet" -AddressPrefix "10.2.1.0/24"
$spoke2Vnet = New-AzVirtualNetwork -Name "vnet-spoke2" -ResourceGroupName $rg `
  -Location $location -AddressPrefix "10.2.0.0/16" -Subnet $spoke2Sub

# Create peerings
Add-AzVirtualNetworkPeering -Name "hub-to-spoke1" `
  -VirtualNetwork $hubVnet -RemoteVirtualNetworkId $spoke1Vnet.Id `
  -AllowForwardedTraffic -AllowGatewayTransit

Add-AzVirtualNetworkPeering -Name "spoke1-to-hub" `
  -VirtualNetwork $spoke1Vnet -RemoteVirtualNetworkId $hubVnet.Id `
  -AllowForwardedTraffic

Add-AzVirtualNetworkPeering -Name "hub-to-spoke2" `
  -VirtualNetwork $hubVnet -RemoteVirtualNetworkId $spoke2Vnet.Id `
  -AllowForwardedTraffic -AllowGatewayTransit

Add-AzVirtualNetworkPeering -Name "spoke2-to-hub" `
  -VirtualNetwork $spoke2Vnet -RemoteVirtualNetworkId $hubVnet.Id `
  -AllowForwardedTraffic
```

### Etapas no portal

1. Crie um grupo de recursos chamado **rg-hubspoke-lab** em East US.
2. Crie **vnet-hub** (10.0.0.0/16) com as sub-redes: **nva-subnet** (10.0.1.0/24) e **GatewaySubnet** (10.0.255.0/27).
3. Crie **vnet-spoke1** (10.1.0.0/16) com a sub-rede **workload-subnet** (10.1.1.0/24).
4. Crie **vnet-spoke2** (10.2.0.0/16) com a sub-rede **workload-subnet** (10.2.1.0/24).
5. Para cada emparelhamento, navegue até a VNet, selecione **Peerings**, clique em **Add** e habilite **Allow forwarded traffic** e **Allow gateway transit** no lado do hub.

---

## Tarefa 2: Implantar VMs NVA com encaminhamento de IP

:::warning Conceito crítico do exame

O encaminhamento de IP deve ser habilitado em **dois níveis** para que um NVA funcione:
1. **Nível da NIC do Azure** -- a configuração `--ip-forwarding true` na interface de rede
2. **Nível do sistema operacional** -- `sysctl net.ipv4.ip_forward=1` dentro da VM Linux

Esquecer qualquer um dos níveis é uma causa frequente de o tráfego não fluir através do NVA.

:::

### Azure CLI

```bash
# Create NVA1
az vm create \
  --resource-group $RG \
  --name vm-nva1 \
  --image Ubuntu2404 \
  --size Standard_B2s \
  --vnet-name $HUB_VNET \
  --subnet nva-subnet \
  --private-ip-address 10.0.1.4 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --no-wait

# Create NVA2
az vm create \
  --resource-group $RG \
  --name vm-nva2 \
  --image Ubuntu2404 \
  --size Standard_B2s \
  --vnet-name $HUB_VNET \
  --subnet nva-subnet \
  --private-ip-address 10.0.1.5 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --no-wait

# Enable IP forwarding on NVA1 NIC (Azure level)
az network nic update \
  --resource-group $RG \
  --name vm-nva1VMNic \
  --ip-forwarding true

# Enable IP forwarding on NVA2 NIC (Azure level)
az network nic update \
  --resource-group $RG \
  --name vm-nva2VMNic \
  --ip-forwarding true
```

### Configurar encaminhamento de IP no nível do sistema operacional

Conecte-se via SSH em cada VM NVA e execute:

```bash
# Enable IP forwarding (immediate)
sudo sysctl -w net.ipv4.ip_forward=1

# Make persistent across reboots
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Configure iptables for NAT and forwarding
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sudo iptables -A FORWARD -i eth0 -j ACCEPT
sudo iptables -A FORWARD -o eth0 -m state --state RELATED,ESTABLISHED -j ACCEPT

# Persist iptables rules
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

### Azure PowerShell

```powershell
# Get the NIC and enable IP forwarding
$nic1 = Get-AzNetworkInterface -Name "vm-nva1VMNic" -ResourceGroupName $rg
$nic1.EnableIPForwarding = $true
Set-AzNetworkInterface -NetworkInterface $nic1

$nic2 = Get-AzNetworkInterface -Name "vm-nva2VMNic" -ResourceGroupName $rg
$nic2.EnableIPForwarding = $true
Set-AzNetworkInterface -NetworkInterface $nic2
```

---

## Tarefa 3: Criar Rotas Definidas pelo Usuário

### Azure CLI

```bash
# Create route table for spoke subnets
az network route-table create \
  --resource-group $RG \
  --name rt-spoke-to-nva \
  --location $LOCATION \
  --disable-bgp-route-propagation true

# Route all traffic to NVA (using ILB frontend IP for HA)
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-to-nva \
  --name default-to-nva \
  --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.10

# Route spoke1 traffic to NVA
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-to-nva \
  --name spoke1-to-nva \
  --address-prefix 10.1.0.0/16 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.10

# Route spoke2 traffic to NVA
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-to-nva \
  --name spoke2-to-nva \
  --address-prefix 10.2.0.0/16 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.10

# Associate route table with spoke subnets
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $SPOKE1_VNET \
  --name workload-subnet \
  --route-table rt-spoke-to-nva

az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $SPOKE2_VNET \
  --name workload-subnet \
  --route-table rt-spoke-to-nva

# Create route table for GatewaySubnet (prevents asymmetric routing)
az network route-table create \
  --resource-group $RG \
  --name rt-gateway-to-nva \
  --location $LOCATION

az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-gateway-to-nva \
  --name spoke1-via-nva \
  --address-prefix 10.1.0.0/16 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.10

az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-gateway-to-nva \
  --name spoke2-via-nva \
  --address-prefix 10.2.0.0/16 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.10

az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $HUB_VNET \
  --name GatewaySubnet \
  --route-table rt-gateway-to-nva
```

### Azure PowerShell

```powershell
# Create route table for spokes
$rtSpoke = New-AzRouteTable -Name "rt-spoke-to-nva" -ResourceGroupName $rg `
  -Location $location -DisableBgpRoutePropagation

Add-AzRouteConfig -RouteTable $rtSpoke -Name "default-to-nva" `
  -AddressPrefix "0.0.0.0/0" -NextHopType "VirtualAppliance" `
  -NextHopIpAddress "10.0.1.10" | Set-AzRouteTable

# Associate with spoke1 subnet
$spoke1Vnet = Get-AzVirtualNetwork -Name "vnet-spoke1" -ResourceGroupName $rg
Set-AzVirtualNetworkSubnetConfig -VirtualNetwork $spoke1Vnet `
  -Name "workload-subnet" -AddressPrefix "10.1.1.0/24" `
  -RouteTableId $rtSpoke.Id | Set-AzVirtualNetwork

# Create GatewaySubnet route table (asymmetric routing prevention)
$rtGw = New-AzRouteTable -Name "rt-gateway-to-nva" -ResourceGroupName $rg `
  -Location $location

Add-AzRouteConfig -RouteTable $rtGw -Name "spoke1-via-nva" `
  -AddressPrefix "10.1.0.0/16" -NextHopType "VirtualAppliance" `
  -NextHopIpAddress "10.0.1.10" | Set-AzRouteTable
```

---

## Tarefa 4: Implantar balanceador de carga interno para alta disponibilidade do NVA

### Azure CLI

```bash
# Create internal load balancer
az network lb create \
  --resource-group $RG \
  --name ilb-nva \
  --sku Standard \
  --vnet-name $HUB_VNET \
  --subnet nva-subnet \
  --frontend-ip-name fe-nva \
  --private-ip-address 10.0.1.10 \
  --backend-pool-name bp-nva

# Create health probe
az network lb probe create \
  --resource-group $RG \
  --lb-name ilb-nva \
  --name probe-nva \
  --protocol Tcp \
  --port 22 \
  --interval 5 \
  --threshold 2

# Create HA ports rule (forwards ALL traffic)
az network lb rule create \
  --resource-group $RG \
  --lb-name ilb-nva \
  --name rule-ha-ports \
  --protocol All \
  --frontend-port 0 \
  --backend-port 0 \
  --frontend-ip-name fe-nva \
  --backend-pool-name bp-nva \
  --probe-name probe-nva \
  --enable-floating-ip false

# Add NVA NICs to backend pool
az network nic ip-config update \
  --resource-group $RG \
  --nic-name vm-nva1VMNic \
  --name ipconfig1 \
  --lb-address-pools bp-nva \
  --lb-name ilb-nva

az network nic ip-config update \
  --resource-group $RG \
  --nic-name vm-nva2VMNic \
  --name ipconfig1 \
  --lb-address-pools bp-nva \
  --lb-name ilb-nva
```

### Azure PowerShell

```powershell
# Create internal LB
$feIP = New-AzLoadBalancerFrontendIpConfig -Name "fe-nva" `
  -PrivateIpAddress "10.0.1.10" `
  -SubnetId ($hubVnet.Subnets | Where-Object Name -eq "nva-subnet").Id

$bePool = New-AzLoadBalancerBackendAddressPoolConfig -Name "bp-nva"

$probe = New-AzLoadBalancerProbeConfig -Name "probe-nva" `
  -Protocol Tcp -Port 22 -IntervalInSeconds 5 -ProbeCount 2

$lbRule = New-AzLoadBalancerRuleConfig -Name "rule-ha-ports" `
  -FrontendIpConfiguration $feIP -BackendAddressPool $bePool `
  -Probe $probe -Protocol All -FrontendPort 0 -BackendPort 0

New-AzLoadBalancer -Name "ilb-nva" -ResourceGroupName $rg `
  -Location $location -Sku Standard `
  -FrontendIpConfiguration $feIP -BackendAddressPool $bePool `
  -Probe $probe -LoadBalancingRule $lbRule
```

---

## Tarefa 5: Configurar microssegmentação baseada em ASG nos spokes

### Azure CLI

```bash
# Create ASGs
az network asg create \
  --resource-group $RG \
  --name asg-web \
  --location $LOCATION

az network asg create \
  --resource-group $RG \
  --name asg-app \
  --location $LOCATION

az network asg create \
  --resource-group $RG \
  --name asg-db \
  --location $LOCATION

# Create NSG with ASG-based rules
az network nsg create \
  --resource-group $RG \
  --name nsg-spoke1-workload \
  --location $LOCATION

# Allow web tier to app tier on port 8080
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-spoke1-workload \
  --name allow-web-to-app \
  --priority 100 \
  --direction Inbound \
  --source-asgs asg-web \
  --destination-asgs asg-app \
  --destination-port-ranges 8080 \
  --protocol Tcp \
  --access Allow

# Allow app tier to db tier on port 1433
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-spoke1-workload \
  --priority 110 \
  --name allow-app-to-db \
  --direction Inbound \
  --source-asgs asg-app \
  --destination-asgs asg-db \
  --destination-port-ranges 1433 \
  --protocol Tcp \
  --access Allow

# Deny all other intra-subnet traffic
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-spoke1-workload \
  --name deny-all-inbound \
  --priority 4000 \
  --direction Inbound \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*" \
  --protocol "*" \
  --access Deny

# Associate NSG with subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $SPOKE1_VNET \
  --name workload-subnet \
  --network-security-group nsg-spoke1-workload
```

---

## Quebra & conserta

### Cenário 1: Tráfego não flui através do NVA

**Sintoma:** VMs no spoke1 não conseguem alcançar VMs no spoke2, mesmo com o emparelhamento configurado e as UDRs apontando para o NVA.

**Causa raiz:** O encaminhamento de IP está habilitado na NIC do Azure, mas não dentro do sistema operacional Linux.

**Diagnóstico:**

```bash
# Check Azure NIC level
az network nic show \
  --resource-group $RG \
  --name vm-nva1VMNic \
  --query "enableIPForwarding"

# SSH into NVA and check OS level
cat /proc/sys/net/ipv4/ip_forward
# Returns 0 if disabled
```

**Correção:**

```bash
# Inside the NVA VM
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
```

---

### Cenário 2: Roteamento assimétrico a partir do ambiente local

**Sintoma:** Clientes locais conseguem iniciar conexões com VMs nos spokes, mas os pacotes de resposta seguem um caminho diferente (contornando o NVA). A inspeção stateful no NVA descarta o tráfego de retorno.

**Causa raiz:** O GatewaySubnet não possui uma UDR apontando os prefixos dos spokes para o NVA. O gateway envia o tráfego diretamente para o spoke via emparelhamento em vez de passar pelo NVA.

**Correção:**

```bash
# Create and associate route table on GatewaySubnet
az network route-table create \
  --resource-group $RG \
  --name rt-gateway-to-nva \
  --location $LOCATION

az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-gateway-to-nva \
  --name spoke1-via-nva \
  --address-prefix 10.1.0.0/16 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.10

az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $HUB_VNET \
  --name GatewaySubnet \
  --route-table rt-gateway-to-nva
```

---

### Cenário 3: Tráfego spoke-para-spoke falhando

**Sintoma:** O tráfego do spoke1 alcança o NVA, mas nunca chega ao spoke2.

**Causa raiz:** O emparelhamento do hub para o spoke2 não possui `--allow-forwarded-traffic true`. Como o tráfego chega ao NVA do hub (encaminhado do spoke1), o emparelhamento hub-para-spoke2 o descarta.

**Correção:**

```bash
az network vnet peering update \
  --resource-group $RG \
  --name hub-to-spoke2 \
  --vnet-name $HUB_VNET \
  --set allowForwardedTraffic=true
```

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-47-q1",
    question: "Um NVA implantado no Azure não está encaminhando tráfego entre sub-redes. A NIC do Azure tem o encaminhamento de IP habilitado. Qual é a causa mais provável?",
    options: [
      "O NSG na sub-rede do NVA está bloqueando o tráfego",
      "O encaminhamento de IP não está habilitado no nível do sistema operacional dentro da VM ✅",
      "A tabela de rotas tem um endereço IP de próximo salto incorreto",
      "O peering de VNet não está configurado"
    ],
    correctIndex: 1,
    explanation: "O encaminhamento de IP deve ser habilitado TANTO no nível da NIC do Azure quanto dentro do sistema operacional da VM. A configuração da NIC do Azure permite que a plataforma entregue pacotes não endereçados à VM, mas o SO também deve ser configurado para encaminhar esses pacotes (net.ipv4.ip_forward=1 no Linux)."
  },
  {
    id: "az700-47-q2",
    question: "Qual tipo de próximo salto da UDR você deve usar ao rotear tráfego para um NVA?",
    options: [
      "VnetLocal",
      "Internet",
      "VirtualAppliance ✅",
      "VirtualNetworkGateway"
    ],
    correctIndex: 2,
    explanation: "VirtualAppliance é o tipo de próximo salto correto para rotear tráfego para um NVA. Você especifica o endereço IP privado do NVA (ou frontend do ILB) como o endereço IP do próximo salto."
  },
  {
    id: "az700-47-q3",
    question: "Você tem uma topologia hub-spoke com um gateway VPN no hub. O tráfego on-premises para VMs spoke ignora o NVA no caminho de retorno. O que você deve fazer?",
    options: [
      "Habilitar o encaminhamento de IP no gateway VPN",
      "Criar uma UDR na GatewaySubnet apontando os prefixos spoke para o NVA ✅",
      "Desabilitar a propagação de rotas BGP nas sub-redes spoke",
      "Alterar o peering para usar gateways remotos"
    ],
    correctIndex: 1,
    explanation: "Para prevenir roteamento assimétrico, você deve colocar uma UDR na GatewaySubnet que direciona o tráfego destinado aos spokes pelo NVA. Sem isso, o gateway envia o tráfego diretamente para o spoke via peering, ignorando o NVA."
  },
  {
    id: "az700-47-q4",
    question: "Qual configuração de peering de VNet deve ser habilitada no lado do hub para permitir tráfego spoke-to-spoke através de um NVA?",
    options: [
      "Allow virtual network access",
      "Use remote gateways",
      "Allow forwarded traffic ✅",
      "Allow gateway transit"
    ],
    correctIndex: 2,
    explanation: "Allow forwarded traffic deve ser habilitado no peering. Como o tráfego spoke-to-spoke é encaminhado pelo NVA no hub, o peering hub-para-spoke deve aceitar tráfego encaminhado. Sem essa configuração, o Azure descarta pacotes que foram encaminhados de outra origem."
  },
  {
    id: "az700-47-q5",
    question: "Você implanta dois NVAs atrás de um Standard Load Balancer interno para alta disponibilidade. Qual configuração de regra de balanceamento permite que TODOS os protocolos e portas sejam encaminhados?",
    options: [
      "Protocol: TCP, Frontend port: 0, Backend port: 0",
      "Protocol: All, Frontend port: 0, Backend port: 0 (HA Ports) ✅",
      "Protocol: UDP, Frontend port: *, Backend port: *",
      "Protocol: All, Frontend port: 443, Backend port: 443"
    ],
    correctIndex: 1,
    explanation: "As regras HA Ports usam Protocol: All com Frontend port: 0 e Backend port: 0. Isso encaminha todo o tráfego TCP e UDP em todas as portas para os NVAs de backend. HA Ports está disponível apenas em load balancers internos de SKU Standard."
  },
  {
    id: "az700-47-q6",
    question: "Por que você deve definir --disable-bgp-route-propagation true nas tabelas de rotas dos spokes?",
    options: [
      "Para evitar que rotas BGP do gateway VPN substituam a UDR para o NVA ✅",
      "Para reduzir o número de rotas na tabela de roteamento",
      "Para impedir que VMs spoke aprendam rotas do hub",
      "Para habilitar convergência mais rápida após failover do NVA"
    ],
    correctIndex: 0,
    explanation: "Quando um gateway VPN ou ExpressRoute propaga rotas BGP, elas podem substituir suas entradas de UDR personalizadas. Desabilitar a propagação de rotas BGP garante que a UDR apontando o tráfego para o NVA tenha precedência sobre quaisquer rotas aprendidas via BGP."
  }
]} />

---

## Limpeza

```bash
az group delete --name $RG --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-hubspoke-lab" -Force -AsJob
```

---

:::danger Aviso de custo

Este laboratório implanta múltiplas VMs (NVAs + VMs de carga de trabalho) e um Standard Load Balancer interno. O custo estimado é de aproximadamente **$0,50/hora**. Exclua o grupo de recursos imediatamente após concluir o laboratório para evitar cobranças inesperadas.

:::
