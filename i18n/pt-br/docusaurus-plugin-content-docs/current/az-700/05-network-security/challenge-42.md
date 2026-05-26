---
sidebar_position: 3
title: "Desafio 42: Implantação e Regras do Azure Firewall"
sidebar_label: "Challenge 42"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 42: Implantação do Azure Firewall e regras

:::info Tempo e custo estimados
**60-90 minutos** | **~$1,25/hora** | **Peso no exame: 15-20%**
:::

:::danger Aviso de custo
O Azure Firewall Standard custa aproximadamente $1,25/hora ($912/mês). Implante apenas pela duração deste laboratório e exclua imediatamente após. Considere usar o portal para verificar conceitos se quiser evitar cobranças totalmente.
:::

## Cenário

A Contoso Financial Services está implementando uma arquitetura de rede hub-spoke. Todo o tráfego com destino à internet a partir de VNets spoke deve passar por um Azure Firewall centralizado na VNet hub para inspeção. O firewall deve:

- Permitir acesso de saída apenas para FQDNs aprovados (domínios microsoft.com, servidores de atualização Ubuntu)
- Bloquear todo o tráfego de saída para a internet por padrão
- Permitir tráfego DNS (UDP/53) e NTP (UDP/123) no nível de rede para servidores específicos
- Publicar uma aplicação web interna para a internet via DNAT (Destination NAT)
- Habilitar inteligência contra ameaças no modo Alerta e Negar para bloquear IPs maliciosos conhecidos

## Habilidades do exame abordadas

| Habilidade | Peso |
|-------|--------|
| Implantar Azure Firewall (SKU Standard) | Alto |
| Criar e configurar políticas de firewall | Alto |
| Configurar regras de aplicativo (filtragem por FQDN) | Alto |
| Configurar regras de rede (filtragem por IP) | Alto |
| Configurar regras DNAT (NAT de entrada) | Médio |
| Habilitar inteligência contra ameaças e proxy DNS | Médio |
| Configurar UDR para roteamento pelo firewall | Alto |

## Pré-requisitos

- Assinatura do Azure com a função Contributor
- Azure CLI 2.60+ com a extensão `azure-firewall`
- Azure PowerShell Az 12.0+
- Compreensão de arquitetura hub-spoke e conceitos de UDR

## Tarefa 1: Implantar a VNet hub com AzureFirewallSubnet

O Azure Firewall requer uma sub-rede dedicada chamada `AzureFirewallSubnet` com um tamanho mínimo de /26 (64 endereços).

:::warning Requisitos de sub-rede
- O nome da sub-rede deve ser exatamente `AzureFirewallSubnet`
- O tamanho mínimo é /26 (suporta até ~60 instâncias de firewall durante a expansão)
- A Microsoft recomenda /26 para todas as implantações
- Nenhum outro recurso pode ser implantado nesta sub-rede
:::

### Azure CLI

```bash
# Set variables
RG="rg-firewall-challenge"
LOCATION="eastus2"

# Create resource group
az group create --name $RG --location $LOCATION

# Create hub VNet with AzureFirewallSubnet
az network vnet create \
  --resource-group $RG \
  --name vnet-hub \
  --location $LOCATION \
  --address-prefixes 10.0.0.0/16 \
  --subnet-name AzureFirewallSubnet \
  --subnet-prefixes 10.0.1.0/26

# Create a spoke VNet for workloads
az network vnet create \
  --resource-group $RG \
  --name vnet-spoke \
  --location $LOCATION \
  --address-prefixes 10.1.0.0/16 \
  --subnet-name snet-workload \
  --subnet-prefixes 10.1.1.0/24

# Peer hub and spoke
az network vnet peering create \
  --resource-group $RG \
  --name hub-to-spoke \
  --vnet-name vnet-hub \
  --remote-vnet vnet-spoke \
  --allow-vnet-access \
  --allow-forwarded-traffic

az network vnet peering create \
  --resource-group $RG \
  --name spoke-to-hub \
  --vnet-name vnet-spoke \
  --remote-vnet vnet-hub \
  --allow-vnet-access \
  --allow-forwarded-traffic

# Create public IP for the firewall
az network public-ip create \
  --resource-group $RG \
  --name pip-firewall \
  --location $LOCATION \
  --sku Standard \
  --allocation-method Static
```

### Azure PowerShell

```powershell
# Set variables
$rg = "rg-firewall-challenge"
$location = "eastus2"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Create hub VNet
$fwSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "AzureFirewallSubnet" -AddressPrefix "10.0.1.0/26"

$hubVnet = New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-hub" `
  -Location $location `
  -AddressPrefix "10.0.0.0/16" `
  -Subnet $fwSubnet

# Create spoke VNet
$workloadSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-workload" -AddressPrefix "10.1.1.0/24"

$spokeVnet = New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-spoke" `
  -Location $location `
  -AddressPrefix "10.1.0.0/16" `
  -Subnet $workloadSubnet

# Create peerings
Add-AzVirtualNetworkPeering `
  -Name "hub-to-spoke" `
  -VirtualNetwork $hubVnet `
  -RemoteVirtualNetworkId $spokeVnet.Id `
  -AllowForwardedTraffic

Add-AzVirtualNetworkPeering `
  -Name "spoke-to-hub" `
  -VirtualNetwork $spokeVnet `
  -RemoteVirtualNetworkId $hubVnet.Id `
  -AllowForwardedTraffic

# Create public IP
$pip = New-AzPublicIpAddress `
  -ResourceGroupName $rg `
  -Name "pip-firewall" `
  -Location $location `
  -Sku Standard `
  -AllocationMethod Static
![Challenge 42 - Topologia de Rede](/img/az-700/challenge-42-topology.svg)


### Azure PowerShell

```powershell
# Create firewall policy
$fwPolicy = New-AzFirewallPolicy `
  -ResourceGroupName $rg `
  -Name "policy-hub-firewall" `
  -Location $location `
  -ThreatIntelMode Alert

# Get subnet and public IP references
$hubVnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-hub"
$fwSubnet = Get-AzVirtualNetworkSubnetConfig -VirtualNetwork $hubVnet -Name "AzureFirewallSubnet"
$pip = Get-AzPublicIpAddress -ResourceGroupName $rg -Name "pip-firewall"

# Deploy firewall
$firewall = New-AzFirewall `
  -ResourceGroupName $rg `
  -Name "fw-hub" `
  -Location $location `
  -VirtualNetwork $hubVnet `
  -PublicIpAddress $pip `
  -FirewallPolicyId $fwPolicy.Id

# Get private IP
$fwPrivateIp = $firewall.IpConfigurations[0].PrivateIpAddress
Write-Output "Firewall private IP: $fwPrivateIp"
```

## Tarefa 3: Configurar regras de aplicativo (filtragem por FQDN)

Regras de aplicativo filtram o tráfego HTTP/HTTPS de saída com base em FQDNs. Elas operam na Camada 7 e requerem que o proxy DNS do firewall esteja habilitado para a resolução adequada de FQDNs.

Ordem de processamento de regras no Azure Firewall:
1. **Regras DNAT** (entrada, processadas primeiro)
2. **Regras de rede** (baseadas em IP/porta, processadas em segundo)
3. **Regras de aplicativo** (baseadas em FQDN, processadas por último)

### Azure CLI

```bash
# Enable DNS proxy on the firewall policy (required for FQDN rules)
az network firewall policy update \
  --resource-group $RG \
  --name policy-hub-firewall \
  --dns-servers 168.63.129.16 \
  --enable-dns-proxy true

# Create a rule collection group
az network firewall policy rule-collection-group create \
  --resource-group $RG \
  --policy-name policy-hub-firewall \
  --name rcg-application \
  --priority 300

# Add application rule collection - Allow Microsoft domains
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name policy-hub-firewall \
  --rule-collection-group-name rcg-application \
  --name rc-allow-microsoft \
  --collection-priority 100 \
  --action Allow \
  --rule-name allow-microsoft-fqdns \
  --rule-type ApplicationRule \
  --source-addresses "10.1.0.0/16" \
  --protocols Https=443 Http=80 \
  --target-fqdns "*.microsoft.com" "*.azure.com" "*.windows.net"

# Add application rule - Allow Ubuntu updates
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name policy-hub-firewall \
  --rule-collection-group-name rcg-application \
  --name rc-allow-updates \
  --collection-priority 200 \
  --action Allow \
  --rule-name allow-ubuntu-updates \
  --rule-type ApplicationRule \
  --source-addresses "10.1.0.0/16" \
  --protocols Https=443 Http=80 \
  --target-fqdns "archive.ubuntu.com" "security.ubuntu.com" "*.ubuntu.com"

# Add application rule - Deny all other HTTP/HTTPS (catch-all)
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name policy-hub-firewall \
  --rule-collection-group-name rcg-application \
  --name rc-deny-all-web \
  --collection-priority 1000 \
  --action Deny \
  --rule-name deny-all-internet \
  --rule-type ApplicationRule \
  --source-addresses "*" \
  --protocols Https=443 Http=80 \
  --target-fqdns "*"
```

### Azure PowerShell

```powershell
# Enable DNS proxy
$fwPolicy = Get-AzFirewallPolicy -ResourceGroupName $rg -Name "policy-hub-firewall"
$fwPolicy.DnsSettings = New-AzFirewallPolicyDnsSetting -EnableProxy
$fwPolicy | Set-AzFirewallPolicy

# Create rule collection group
$rcg = New-AzFirewallPolicyRuleCollectionGroup `
  -ResourceGroupName $rg `
  -FirewallPolicyName "policy-hub-firewall" `
  -Name "rcg-application" `
  -Priority 300

# Create application rules
$allowMsRule = New-AzFirewallPolicyApplicationRule `
  -Name "allow-microsoft-fqdns" `
  -SourceAddress "10.1.0.0/16" `
  -TargetFqdn "*.microsoft.com", "*.azure.com", "*.windows.net" `
  -Protocol "Https:443", "Http:80"

$allowMsCollection = New-AzFirewallPolicyFilterRuleCollection `
  -Name "rc-allow-microsoft" `
  -Priority 100 `
  -ActionType Allow `
  -Rule $allowMsRule

$allowUbuntuRule = New-AzFirewallPolicyApplicationRule `
  -Name "allow-ubuntu-updates" `
  -SourceAddress "10.1.0.0/16" `
  -TargetFqdn "archive.ubuntu.com", "security.ubuntu.com", "*.ubuntu.com" `
  -Protocol "Https:443", "Http:80"

$allowUbuntuCollection = New-AzFirewallPolicyFilterRuleCollection `
  -Name "rc-allow-updates" `
  -Priority 200 `
  -ActionType Allow `
  -Rule $allowUbuntuRule

# Set rule collections on the group
$rcg = Get-AzFirewallPolicyRuleCollectionGroup `
  -ResourceGroupName $rg `
  -FirewallPolicyName "policy-hub-firewall" `
  -Name "rcg-application"
$rcg.Properties.RuleCollection = @($allowMsCollection, $allowUbuntuCollection)
Set-AzFirewallPolicyRuleCollectionGroup `
  -ResourceGroupName $rg `
  -FirewallPolicyName "policy-hub-firewall" `
  -InputObject $rcg
```

## Tarefa 4: Configurar regras de rede (filtragem por IP)

Regras de rede operam na Camada 3/4 e filtram com base em endereços IP, portas e protocolos. Use-as para tráfego não-HTTP/HTTPS.

### Azure CLI

```bash
# Create a rule collection group for network rules
az network firewall policy rule-collection-group create \
  --resource-group $RG \
  --policy-name policy-hub-firewall \
  --name rcg-network \
  --priority 200

# Allow DNS traffic (UDP/53) to Azure DNS
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name policy-hub-firewall \
  --rule-collection-group-name rcg-network \
  --name rc-allow-dns \
  --collection-priority 100 \
  --action Allow \
  --rule-name allow-dns \
  --rule-type NetworkRule \
  --source-addresses "10.1.0.0/16" \
  --destination-addresses "168.63.129.16" \
  --destination-ports 53 \
  --ip-protocols UDP TCP

# Allow NTP traffic (UDP/123)
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name policy-hub-firewall \
  --rule-collection-group-name rcg-network \
  --name rc-allow-ntp \
  --collection-priority 200 \
  --action Allow \
  --rule-name allow-ntp \
  --rule-type NetworkRule \
  --source-addresses "10.1.0.0/16" \
  --destination-addresses "*" \
  --destination-ports 123 \
  --ip-protocols UDP
```

### Azure PowerShell

```powershell
# Create network rule collection group
$rcgNet = New-AzFirewallPolicyRuleCollectionGroup `
  -ResourceGroupName $rg `
  -FirewallPolicyName "policy-hub-firewall" `
  -Name "rcg-network" `
  -Priority 200

# DNS rule
$dnsRule = New-AzFirewallPolicyNetworkRule `
  -Name "allow-dns" `
  -SourceAddress "10.1.0.0/16" `
  -DestinationAddress "168.63.129.16" `
  -DestinationPort "53" `
  -Protocol UDP, TCP

$dnsCollection = New-AzFirewallPolicyFilterRuleCollection `
  -Name "rc-allow-dns" `
  -Priority 100 `
  -ActionType Allow `
  -Rule $dnsRule

# NTP rule
$ntpRule = New-AzFirewallPolicyNetworkRule `
  -Name "allow-ntp" `
  -SourceAddress "10.1.0.0/16" `
  -DestinationAddress "*" `
  -DestinationPort "123" `
  -Protocol UDP

$ntpCollection = New-AzFirewallPolicyFilterRuleCollection `
  -Name "rc-allow-ntp" `
  -Priority 200 `
  -ActionType Allow `
  -Rule $ntpRule

# Apply
$rcgNet = Get-AzFirewallPolicyRuleCollectionGroup `
  -ResourceGroupName $rg `
  -FirewallPolicyName "policy-hub-firewall" `
  -Name "rcg-network"
$rcgNet.Properties.RuleCollection = @($dnsCollection, $ntpCollection)
Set-AzFirewallPolicyRuleCollectionGroup `
  -ResourceGroupName $rg `
  -FirewallPolicyName "policy-hub-firewall" `
  -InputObject $rcgNet
```

## Tarefa 5: Configurar regras DNAT (NAT de entrada)

Regras DNAT traduzem o tráfego de entrada do IP público do firewall para um servidor interno. Isso publica serviços internos sem dar a eles IPs públicos diretamente.

### Azure CLI

```bash
# Create a rule collection group for DNAT rules
az network firewall policy rule-collection-group create \
  --resource-group $RG \
  --policy-name policy-hub-firewall \
  --name rcg-dnat \
  --priority 100

# Get the firewall public IP address
FW_PUBLIC_IP=$(az network public-ip show \
  --resource-group $RG \
  --name pip-firewall \
  --query "ipAddress" \
  --output tsv)

# Add DNAT rule: public IP port 80 -> internal web server 10.1.1.4 port 80
az network firewall policy rule-collection-group collection add-nat-collection \
  --resource-group $RG \
  --policy-name policy-hub-firewall \
  --rule-collection-group-name rcg-dnat \
  --name rc-dnat-web \
  --collection-priority 100 \
  --action DNAT \
  --rule-name dnat-to-webserver \
  --source-addresses "*" \
  --destination-addresses "$FW_PUBLIC_IP" \
  --destination-ports 80 \
  --translated-address 10.1.1.4 \
  --translated-port 80 \
  --ip-protocols TCP
```

### Azure PowerShell

```powershell
# Create DNAT rule collection group
$rcgDnat = New-AzFirewallPolicyRuleCollectionGroup `
  -ResourceGroupName $rg `
  -FirewallPolicyName "policy-hub-firewall" `
  -Name "rcg-dnat" `
  -Priority 100

# Get public IP
$fwPip = (Get-AzPublicIpAddress -ResourceGroupName $rg -Name "pip-firewall").IpAddress

# DNAT rule
$dnatRule = New-AzFirewallPolicyNatRule `
  -Name "dnat-to-webserver" `
  -SourceAddress "*" `
  -DestinationAddress $fwPip `
  -DestinationPort "80" `
  -Protocol TCP `
  -TranslatedAddress "10.1.1.4" `
  -TranslatedPort "80"

$dnatCollection = New-AzFirewallPolicyNatRuleCollection `
  -Name "rc-dnat-web" `
  -Priority 100 `
  -ActionType DNAT `
  -Rule $dnatRule

$rcgDnat = Get-AzFirewallPolicyRuleCollectionGroup `
  -ResourceGroupName $rg `
  -FirewallPolicyName "policy-hub-firewall" `
  -Name "rcg-dnat"
$rcgDnat.Properties.RuleCollection = @($dnatCollection)
Set-AzFirewallPolicyRuleCollectionGroup `
  -ResourceGroupName $rg `
  -FirewallPolicyName "policy-hub-firewall" `
  -InputObject $rcgDnat
```

## Tarefa 6: Habilitar inteligência contra ameaças (modo Alerta e Negar)

A inteligência contra ameaças filtra o tráfego com base no feed de inteligência contra ameaças da Microsoft de IPs e domínios maliciosos conhecidos.

| Modo | Comportamento |
|------|----------|
| Off | Desabilitado |
| Alert | Registra em log, mas permite o tráfego de/para IPs maliciosos conhecidos |
| Deny | Bloqueia e registra em log o tráfego de/para IPs maliciosos conhecidos |

### Azure CLI

```bash
# Update policy to Alert and Deny mode
az network firewall policy update \
  --resource-group $RG \
  --name policy-hub-firewall \
  --threat-intel-mode Deny
```

### Azure PowerShell

```powershell
$fwPolicy = Get-AzFirewallPolicy -ResourceGroupName $rg -Name "policy-hub-firewall"
$fwPolicy.ThreatIntelMode = "Deny"
$fwPolicy | Set-AzFirewallPolicy
```

## Tarefa 7: Criar UDR para rotear o tráfego do spoke pelo firewall

Sem uma Rota Definida pelo Usuário (UDR), as VMs do spoke usam a rota padrão do sistema para alcançar a internet diretamente, ignorando completamente o firewall.

### Azure CLI

```bash
# Create route table
az network route-table create \
  --resource-group $RG \
  --name rt-spoke-to-firewall \
  --location $LOCATION \
  --disable-bgp-route-propagation true

# Add default route pointing to firewall private IP
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-to-firewall \
  --name route-to-firewall \
  --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address $FW_PRIVATE_IP

# Associate route table with the spoke workload subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-spoke \
  --name snet-workload \
  --route-table rt-spoke-to-firewall
```

### Azure PowerShell

```powershell
# Create route table
$rt = New-AzRouteTable `
  -ResourceGroupName $rg `
  -Name "rt-spoke-to-firewall" `
  -Location $location `
  -DisableBgpRoutePropagation

# Add default route to firewall
Add-AzRouteConfig `
  -RouteTable $rt `
  -Name "route-to-firewall" `
  -AddressPrefix "0.0.0.0/0" `
  -NextHopType VirtualAppliance `
  -NextHopIpAddress $fwPrivateIp
Set-AzRouteTable -RouteTable $rt

# Associate with spoke subnet
$spokeVnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-spoke"
$workloadSubnet = Get-AzVirtualNetworkSubnetConfig -VirtualNetwork $spokeVnet -Name "snet-workload"
$workloadSubnet.RouteTable = $rt
$spokeVnet | Set-AzVirtualNetwork
```

## Quebra & conserta

### Cenário 1: Regras de FQDN não correspondem (proxy DNS não habilitado)

```bash
# Create a firewall policy without DNS proxy
az network firewall policy create \
  --resource-group $RG \
  --name policy-no-dns \
  --location $LOCATION \
  --sku Standard
```

**Sintoma**: Regras de aplicativo com destinos FQDN não correspondem a nenhum tráfego. As VMs não conseguem alcançar FQDNs aprovados mesmo com regras existentes.

**Causa raiz**: O Azure Firewall usa seu proxy DNS para resolver FQDNs nas regras de aplicativo. Sem o proxy DNS habilitado, o firewall não consegue resolver nomes de domínio e as regras baseadas em FQDN falham silenciosamente. As VMs clientes também devem usar o firewall como servidor DNS (ou usar o Azure DNS que roteia pelo firewall).

**Correção**: Habilite o proxy DNS na política de firewall:

```bash
az network firewall policy update \
  --resource-group $RG \
  --name policy-no-dns \
  --dns-servers 168.63.129.16 \
  --enable-dns-proxy true
```

### Cenário 2: Regra DNAT não funciona (regra de rede ausente)

**Sintoma**: A regra DNAT traduz o destino corretamente, mas o servidor web interno nunca recebe o tráfego. A conexão expira.

**Causa raiz**: Para tráfego DNAT, o Azure Firewall processa as regras DNAT primeiro (traduzindo o destino) e depois aplica regras de rede ao tráfego traduzido. Se nenhuma regra de rede permitir o fluxo traduzido (origem=cliente original, destino=IP interno traduzido, porta=porta traduzida), o tráfego é descartado.

**Correção**: Adicione uma regra de rede que permita o tráfego traduzido:

```bash
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name policy-hub-firewall \
  --rule-collection-group-name rcg-network \
  --name rc-allow-dnat-translated \
  --collection-priority 50 \
  --action Allow \
  --rule-name allow-web-dnat \
  --rule-type NetworkRule \
  --source-addresses "*" \
  --destination-addresses "10.1.1.4" \
  --destination-ports 80 \
  --ip-protocols TCP
```

### Cenário 3: Tráfego ignorando o firewall (UDR ausente)

**Sintoma**: As VMs do spoke conseguem alcançar a internet diretamente (incluindo sites bloqueados). Os logs do firewall não mostram tráfego das VMs do spoke.

**Causa raiz**: Sem uma UDR apontando 0.0.0.0/0 para o IP privado do firewall, as VMs do spoke usam a rota padrão do sistema do Azure para saída à internet, que vai diretamente para a internet sem passar pelo firewall.

**Correção**: Crie e associe uma tabela de rotas com a rota padrão correta (consulte a Tarefa 7 acima).

```bash
# Verify the effective routes on a spoke VM NIC
az network nic show-effective-route-table \
  --resource-group $RG \
  --name <spoke-vm-nic-name> \
  --output table
```

A saída deve mostrar 0.0.0.0/0 com Next Hop Type = VirtualAppliance e o IP privado do firewall como endereço de próximo salto.

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-42-q1",
    question: "Em que ordem o Azure Firewall processa os tipos de regras?",
    options: [
      "Regras DNAT, depois regras de Rede, depois regras de Aplicação ✅",
      "Regras de Aplicação, depois regras de Rede, depois regras DNAT",
      "Regras de Rede, depois regras de Aplicação, depois regras DNAT",
      "Todos os tipos de regras são avaliados simultaneamente, vencendo a menor prioridade"
    ],
    correctIndex: 0,
    explanation: "O Azure Firewall processa regras nesta ordem fixa: DNAT (traduções de entrada primeiro), Rede (regras de IP/porta L3/L4 em segundo) e Aplicação (regras de FQDN L7 por último). Dentro de cada tipo, as regras são processadas por prioridade em seus grupos de coleção de regras e coleções."
  },
  {
    id: "az700-42-q2",
    question: "Qual é o tamanho mínimo de sub-rede para a AzureFirewallSubnet?",
    options: [
      "/26 (64 endereços) ✅",
      "/27 (32 endereços)",
      "/24 (256 endereços)",
      "/28 (16 endereços)"
    ],
    correctIndex: 0,
    explanation: "A AzureFirewallSubnet requer no mínimo /26 para acomodar instâncias de firewall durante operações de expansão. Isso fornece 64 endereços IP. A Microsoft recomenda /26 para todas as implantações."
  },
  {
    id: "az700-42-q3",
    question: "Por que o proxy DNS deve ser habilitado para que as regras de aplicação baseadas em FQDN funcionem?",
    options: [
      "O firewall precisa resolver FQDNs para IPs para correspondência de regras; o proxy DNS intercepta consultas DNS dos clientes para fazer isso ✅",
      "O proxy DNS é necessário apenas para otimização de desempenho, não para funcionalidade",
      "Regras de FQDN requerem validação DNSSEC que apenas o proxy suporta",
      "O proxy DNS criptografa consultas DNS para prevenir spoofing de DNS"
    ],
    correctIndex: 0,
    explanation: "O Azure Firewall corresponde regras de aplicação resolvendo FQDNs para endereços IP. O proxy DNS garante que as consultas DNS dos clientes passem pelo firewall, permitindo que ele veja o mapeamento FQDN-para-IP e corresponda corretamente o tráfego com as regras de FQDN. Sem ele, o firewall vê apenas endereços IP e não pode corresponder padrões de FQDN."
  },
  {
    id: "az700-42-q4",
    question: "Uma regra DNAT traduz o tráfego do IP público do firewall para um servidor web interno. Qual configuração adicional é necessária?",
    options: [
      "Uma regra de rede deve permitir o tráfego traduzido (mesma origem, IP e porta de destino traduzidos) ✅",
      "Nenhuma configuração adicional; regras DNAT permitem implicitamente o tráfego",
      "Uma regra de aplicação também deve corresponder ao FQDN do servidor interno",
      "Uma UDR na AzureFirewallSubnet apontando de volta para o cliente"
    ],
    correctIndex: 0,
    explanation: "Após a tradução DNAT, o Azure Firewall aplica regras de rede ao pacote traduzido. Uma regra de rede deve permitir explicitamente o tráfego da origem original para o IP e porta de destino traduzidos. Sem essa regra, o tráfego traduzido é descartado."
  },
  {
    id: "az700-42-q5",
    question: "Quais são os três modos de inteligência contra ameaças disponíveis no Azure Firewall?",
    options: [
      "Off, Alert (apenas registrar) e Deny (bloquear e registrar) ✅",
      "Disabled, Monitor e Block",
      "Off, Detect e Prevent",
      "None, Warn e Reject"
    ],
    correctIndex: 0,
    explanation: "A inteligência contra ameaças do Azure Firewall suporta três modos: Off (desabilitado), Alert (registra tráfego de/para IPs maliciosos conhecidos, mas permite) e Deny (bloqueia e registra tráfego de/para IPs e domínios maliciosos conhecidos)."
  },
  {
    id: "az700-42-q6",
    question: "VMs spoke conseguem alcançar a internet diretamente, ignorando o Azure Firewall. Qual é a causa mais provável?",
    options: [
      "A sub-rede spoke não tem uma UDR com 0.0.0.0/0 apontando para o IP privado do firewall ✅",
      "O firewall não está na mesma região que a VNet spoke",
      "O peering de VNet não suporta encaminhamento de tráfego",
      "O IP público do firewall ainda não foi alocado"
    ],
    correctIndex: 0,
    explanation: "Sem uma User-Defined Route (UDR) na sub-rede spoke direcionando 0.0.0.0/0 para o IP privado do firewall como próximo salto de Virtual Appliance, as VMs spoke usam a rota padrão do sistema que vai diretamente para a internet. A UDR é essencial para forçar o tráfego pelo firewall."
  }
]} />

## Limpeza

Remova todos os recursos imediatamente para evitar cobranças contínuas do firewall.

### Azure CLI

```bash
# Delete the entire resource group (stops billing for the firewall)
az group delete --name rg-firewall-challenge --yes --no-wait
```

### Azure PowerShell

```powershell
Remove-AzResourceGroup -Name "rg-firewall-challenge" -Force -AsJob
```

:::tip Verificar limpeza
O Azure Firewall cobra por hora mesmo quando ocioso. Verifique a exclusão:
```bash
az group show --name rg-firewall-challenge 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists - check immediately!"
```
:::

:::danger Lembrete de custo
Azure Firewall Standard: ~$1,25/hora ($912/mês). O firewall começa a cobrar assim que é provisionado, independentemente do tráfego. Sempre desaloque ou exclua após exercícios de laboratório. Não existe estado "parado" para o Azure Firewall no modo VNet; você deve excluí-lo inteiramente ou usar `az network firewall delete` para removê-lo enquanto preserva outros recursos.
:::
