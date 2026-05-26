---
sidebar_position: 1
title: "Desafio 01: Design de VNet Corporativa & Planejamento de IP"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 01: Design de VNet empresarial e planejamento de IP

:::info Tempo e custo estimados
**60-90 minutos** | **~$0,05** (VNets e IPs são praticamente gratuitos) | **Peso no exame: 25-30%**
:::

## Cenário

A Contoso Financial Services está migrando cargas de trabalho para o Azure. A equipe de rede precisa projetar uma topologia hub-spoke em duas regiões com espaços de endereçamento não sobrepostos. A VNet hub hospeda serviços compartilhados (Azure Firewall, VPN Gateway, Azure Bastion), enquanto as VNets spoke isolam cargas de trabalho de produção e dev/test. A Contoso também possui um datacenter local usando 192.168.0.0/16 que nunca deve se sobrepor ao espaço de endereçamento do Azure.

Seu trabalho é planejar o esquema de endereçamento IP, criar as VNets com sub-redes dimensionadas corretamente, criar um prefixo de IP público para IPs de saída previsíveis e alocar IPs públicos individuais a partir desse prefixo.

## Habilidades do exame abordadas

| Habilidade | Peso |
|-------|--------|
| Planejar e implementar segmentação de rede e espaços de endereçamento | Alto |
| Criar uma rede virtual (VNet) | Alto |
| Criar um prefixo para endereços IP públicos | Médio |
| Escolher quando usar um prefixo de endereço IP público | Médio |
| Planejar e implementar um prefixo de IP público personalizado (BYOIP) | Baixo |
| Criar um endereço IP público | Alto |
| Associar endereços IP públicos a recursos | Médio |

## Pré-requisitos

- Pré-requisito: Familiaridade com o AZ-104 Challenge 11 (Virtual Networks and Subnets)
- Assinatura do Azure com função de Contribuidor
- Azure CLI 2.60+ ou Azure PowerShell Az 12.0+
- Entendimento básico de notação CIDR e sub-redes

## Tarefa 1: Projetar e criar a VNet hub

A VNet hub da Contoso carrega a infraestrutura compartilhada. Cada sub-rede possui requisitos de tamanho mínimo aplicados pelo Azure:

| Sub-rede | Finalidade | Tamanho mínimo | Nossa alocação |
|--------|---------|--------------|----------------|
| GatewaySubnet | Gateway VPN/ExpressRoute | /27 | 10.0.0.0/27 (32 IPs) |
| AzureFirewallSubnet | Azure Firewall | /26 | 10.0.1.0/26 (64 IPs) |
| AzureBastionSubnet | Azure Bastion | /26 | 10.0.2.0/26 (64 IPs) |
| SharedServicesSubnet | DNS, controladores de domínio | /24 | 10.0.10.0/24 (256 IPs) |

:::warning Regras de nomenclatura de sub-redes
`GatewaySubnet`, `AzureFirewallSubnet` e `AzureBastionSubnet` são nomes reservados. O Azure rejeitará implantações de gateway, firewall ou bastion se a sub-rede usar um nome diferente.
:::

### Azure CLI

```bash
# Set variables
RG="rg-contoso-networking"
LOCATION="eastus2"

# Create resource group
az group create --name $RG --location $LOCATION

# Create the hub VNet with the GatewaySubnet
az network vnet create \
  --resource-group $RG \
  --name vnet-hub-eastus2 \
  --location $LOCATION \
  --address-prefixes 10.0.0.0/16 \
  --subnet-name GatewaySubnet \
  --subnet-prefixes 10.0.0.0/27

# Add AzureFirewallSubnet
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-eastus2 \
  --name AzureFirewallSubnet \
  --address-prefixes 10.0.1.0/26

# Add AzureBastionSubnet
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-eastus2 \
  --name AzureBastionSubnet \
  --address-prefixes 10.0.2.0/26

# Add SharedServicesSubnet
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub-eastus2 \
  --name SharedServicesSubnet \
  --address-prefixes 10.0.10.0/24
```

### Azure PowerShell

```powershell
# Set variables
$rg = "rg-contoso-networking"
$location = "eastus2"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Define subnet configurations
$gatewaySubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "GatewaySubnet" `
  -AddressPrefix "10.0.0.0/27"

$firewallSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "AzureFirewallSubnet" `
  -AddressPrefix "10.0.1.0/26"

$bastionSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "AzureBastionSubnet" `
  -AddressPrefix "10.0.2.0/26"

$sharedSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "SharedServicesSubnet" `
  -AddressPrefix "10.0.10.0/24"

# Create the hub VNet with all subnets
New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-hub-eastus2" `
  -Location $location `
  -AddressPrefix "10.0.0.0/16" `
  -Subnet $gatewaySubnet, $firewallSubnet, $bastionSubnet, $sharedSubnet
```

### Passos no portal

1. Navegue até **Virtual networks** > **Create**.
2. Defina Resource group como `rg-contoso-networking`, Name como `vnet-hub-eastus2`, Region como **East US 2**.
3. Na aba **IP Addresses**, defina o espaço de endereçamento como `10.0.0.0/16`.
4. Adicione cada sub-rede com os nomes e prefixos da tabela acima.
5. Selecione **Review + create** > **Create**.

## Tarefa 2: Criar VNets spoke

As VNets spoke isolam cargas de trabalho umas das outras e do hub. Cada spoke usa um bloco /16 separado para permitir crescimento.

### Azure CLI

```bash
# Spoke 1: Production workloads
az network vnet create \
  --resource-group $RG \
  --name vnet-spoke-prod-eastus2 \
  --location $LOCATION \
  --address-prefixes 10.1.0.0/16 \
  --subnet-name snet-web \
  --subnet-prefixes 10.1.1.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-spoke-prod-eastus2 \
  --name snet-app \
  --address-prefixes 10.1.2.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-spoke-prod-eastus2 \
  --name snet-data \
  --address-prefixes 10.1.3.0/24

# Spoke 2: Dev/Test workloads
az network vnet create \
  --resource-group $RG \
  --name vnet-spoke-dev-eastus2 \
  --location $LOCATION \
  --address-prefixes 10.2.0.0/16 \
  --subnet-name snet-dev-web \
  --subnet-prefixes 10.2.1.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-spoke-dev-eastus2 \
  --name snet-dev-app \
  --address-prefixes 10.2.2.0/24
```

### Azure PowerShell

```powershell
# Spoke 1: Production
$webSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-web" -AddressPrefix "10.1.1.0/24"
$appSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-app" -AddressPrefix "10.1.2.0/24"
$dataSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-data" -AddressPrefix "10.1.3.0/24"

New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-spoke-prod-eastus2" `
  -Location $location `
  -AddressPrefix "10.1.0.0/16" `
  -Subnet $webSubnet, $appSubnet, $dataSubnet

# Spoke 2: Dev/Test
$devWebSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-dev-web" -AddressPrefix "10.2.1.0/24"
$devAppSubnet = New-AzVirtualNetworkSubnetConfig -Name "snet-dev-app" -AddressPrefix "10.2.2.0/24"

New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-spoke-dev-eastus2" `
  -Location $location `
  -AddressPrefix "10.2.0.0/16" `
  -Subnet $devWebSubnet, $devAppSubnet
![Challenge 01 - Topologia de Rede](/img/az-700/challenge-01-topology.svg)


### Azure PowerShell

```powershell
# Create a zone-redundant public IP prefix
$prefix = New-AzPublicIpPrefix `
  -ResourceGroupName $rg `
  -Name "pip-prefix-contoso-eastus2" `
  -Location $location `
  -PrefixLength 28 `
  -Sku "Standard" `
  -IpAddressVersion "IPv4" `
  -Zone 1, 2, 3

# Allocate a public IP from the prefix
New-AzPublicIpAddress `
  -ResourceGroupName $rg `
  -Name "pip-fw-contoso-01" `
  -Location $location `
  -Sku "Standard" `
  -AllocationMethod "Static" `
  -IpAddressVersion "IPv4" `
  -Zone 1, 2, 3 `
  -PublicIpPrefix $prefix

# Allocate a second public IP from the prefix
New-AzPublicIpAddress `
  -ResourceGroupName $rg `
  -Name "pip-vpngw-contoso-01" `
  -Location $location `
  -Sku "Standard" `
  -AllocationMethod "Static" `
  -IpAddressVersion "IPv4" `
  -Zone 1, 2, 3 `
  -PublicIpPrefix $prefix
```

## Tarefa 4: Entender o prefixo de IP público personalizado (BYOIP)

A Contoso possui o intervalo registrado 203.0.113.0/24 e deseja trazê-lo para o Azure. Isso usa o recurso Custom IP Prefix (BYOIP). O processo possui três fases: validação, provisionamento e comissionamento.

:::note Consciência para o exame
O exame testa seu entendimento dos conceitos de BYOIP e do grupo de comandos `az network custom-ip prefix`. Você não precisa executar isso com um intervalo de IP real. Estude o fluxo de trabalho e os parâmetros.
:::

O comando CLI para criar um prefixo de IP personalizado é:

```bash
# Conceptual only - requires a registered IP range you own
az network custom-ip prefix create \
  --resource-group $RG \
  --name customprefix-contoso \
  --location $LOCATION \
  --cidr "203.0.113.0/24" \
  --authorization-message "<signed-message>" \
  --signed-message "<RSA-signed-authorization>" \
  --zone 1 2 3

# After provisioning, derive a public IP prefix from the custom prefix
az network public-ip prefix create \
  --resource-group $RG \
  --name pip-prefix-byoip \
  --location $LOCATION \
  --length 28 \
  --custom-ip-prefix-name customprefix-contoso

# Commission the prefix to start advertising via Microsoft WAN
az network custom-ip prefix update \
  --resource-group $RG \
  --name customprefix-contoso \
  --state Commission
```

Fatos importantes para o exame:
- Você deve possuir e registrar o intervalo em um Registro Regional de Internet (ARIN, RIPE, etc.)
- Uma Route Origin Authorization (ROA) deve ser criada para autorizar o ASN 8075 da Microsoft
- O tamanho mínimo de prefixo para BYOIP é /24 para IPv4
- Apenas IPs públicos de SKU Standard podem ser derivados de um prefixo personalizado
- O prefixo personalizado deve estar no estado **Provisioned** ou **Commissioned** antes de derivar prefixos de IP público

## Tarefa 5: Associar um IP público a um recurso

Crie uma NIC de teste e associe um IP público para verificar se a alocação funciona. Isso simula a anexação de um IP público a uma VM para acesso de entrada direto.

### Azure CLI

```bash
# Create a NIC in the production spoke web subnet
az network nic create \
  --resource-group $RG \
  --name nic-test-web-01 \
  --vnet-name vnet-spoke-prod-eastus2 \
  --subnet snet-web \
  --public-ip-address pip-fw-contoso-01 \
  --location $LOCATION

# Verify the public IP association
az network nic show \
  --resource-group $RG \
  --name nic-test-web-01 \
  --query "ipConfigurations[0].publicIpAddress.id" \
  --output tsv

# View the allocated public IP address value
az network public-ip show \
  --resource-group $RG \
  --name pip-fw-contoso-01 \
  --query "{name:name, ip:ipAddress, prefix:publicIpPrefix.id}" \
  --output table
```

### Azure PowerShell

```powershell
# Get the subnet reference
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-spoke-prod-eastus2"
$subnet = Get-AzVirtualNetworkSubnetConfig -VirtualNetwork $vnet -Name "snet-web"
$pip = Get-AzPublicIpAddress -ResourceGroupName $rg -Name "pip-fw-contoso-01"

# Create a NIC with the public IP
$ipConfig = New-AzNetworkInterfaceIpConfig `
  -Name "ipconfig1" `
  -SubnetId $subnet.Id `
  -PublicIpAddressId $pip.Id

New-AzNetworkInterface `
  -ResourceGroupName $rg `
  -Name "nic-test-web-01" `
  -Location $location `
  -IpConfiguration $ipConfig

# Verify association
Get-AzNetworkInterface -ResourceGroupName $rg -Name "nic-test-web-01" |
  Select-Object -ExpandProperty IpConfigurations |
  Select-Object Name, @{N='PublicIP';E={$_.PublicIpAddress.Id}}
```

## Tarefa 6: Verificar o planejamento de espaço de endereçamento e identificar sobreposições

Verifique o plano de endereçamento completo e confirme que não há sobreposições entre VNets ou com o ambiente local (192.168.0.0/16).

### Azure CLI

```bash
# List all VNets and their address spaces
az network vnet list \
  --resource-group $RG \
  --query "[].{Name:name, AddressSpace:addressSpace.addressPrefixes[0], Subnets:subnets[].{name:name, prefix:addressPrefix}}" \
  --output json

# Show detailed subnet configuration for the hub
az network vnet show \
  --resource-group $RG \
  --name vnet-hub-eastus2 \
  --query "{name:name, addressSpace:addressSpace.addressPrefixes, subnets:subnets[].{name:name, prefix:addressPrefix}}" \
  --output json

# List all public IPs and their assignments
az network public-ip list \
  --resource-group $RG \
  --query "[].{Name:name, IP:ipAddress, SKU:sku.name, Prefix:publicIpPrefix.id, AssociatedTo:ipConfiguration.id}" \
  --output table
```

### Resumo do planejamento de endereços esperado

| VNet | Espaço de endereçamento | Finalidade | Verificação de sobreposição |
|------|---------------|---------|---------------|
| vnet-hub-eastus2 | 10.0.0.0/16 | Serviços compartilhados | Sem sobreposição |
| vnet-spoke-prod-eastus2 | 10.1.0.0/16 | Produção | Sem sobreposição |
| vnet-spoke-dev-eastus2 | 10.2.0.0/16 | Dev/Test | Sem sobreposição |
| Local | 192.168.0.0/16 | DC corporativo | Sem sobreposição |

## Quebra & conserta

Estes exercícios simulam configurações incorretas comuns. Tente diagnosticar e corrigir cada uma.

### Cenário 1: Espaços de endereçamento sobrepostos impedem o emparelhamento

```bash
# Create a VNet with an address space that overlaps with the hub
az network vnet create \
  --resource-group $RG \
  --name vnet-broken-overlap \
  --location $LOCATION \
  --address-prefixes 10.0.0.0/20 \
  --subnet-name snet-overlap \
  --subnet-prefixes 10.0.0.0/24

# Attempt to peer with the hub (this will FAIL)
az network vnet peering create \
  --resource-group $RG \
  --name peer-broken-to-hub \
  --vnet-name vnet-broken-overlap \
  --remote-vnet vnet-hub-eastus2 \
  --allow-vnet-access
```

**Sintoma**: A criação do emparelhamento falha com um erro sobre espaços de endereçamento sobrepostos.

**Causa raiz**: Tanto `vnet-broken-overlap` (10.0.0.0/20) quanto `vnet-hub-eastus2` (10.0.0.0/16) contêm o intervalo 10.0.0.0. O Azure não permite emparelhamento entre VNets com espaços de endereçamento sobrepostos.

**Correção**: Use um espaço de endereçamento não sobreposto para a nova VNet:

```bash
az network vnet delete --resource-group $RG --name vnet-broken-overlap

az network vnet create \
  --resource-group $RG \
  --name vnet-fixed-nooverlap \
  --location $LOCATION \
  --address-prefixes 10.3.0.0/16 \
  --subnet-name snet-workload \
  --subnet-prefixes 10.3.1.0/24
```

### Cenário 2: GatewaySubnet muito pequena

```bash
# Create a VNet with GatewaySubnet of /29 (too small for non-Basic SKUs)
az network vnet create \
  --resource-group $RG \
  --name vnet-broken-gateway \
  --location $LOCATION \
  --address-prefixes 10.4.0.0/16 \
  --subnet-name GatewaySubnet \
  --subnet-prefixes 10.4.0.0/29
```

**Sintoma**: Quando você tenta implantar um VPN Gateway (VpnGw1 ou superior), a implantação falha porque a GatewaySubnet é muito pequena.

**Causa raiz**: Todos os SKUs de VPN Gateway exceto Basic exigem uma GatewaySubnet de /27 ou maior. Um /29 fornece apenas 8 endereços (5 utilizáveis), o que é insuficiente para VMs e serviços do gateway. A Microsoft recomenda /27 como mínimo para gateways de produção.

**Correção**: Exclua e recrie a sub-rede com /27:

```bash
az network vnet subnet delete \
  --resource-group $RG \
  --vnet-name vnet-broken-gateway \
  --name GatewaySubnet

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-broken-gateway \
  --name GatewaySubnet \
  --address-prefixes 10.4.0.0/27
```

### Cenário 3: Incompatibilidade de SKU ao alocar a partir de prefixo

```bash
# Try to create a Basic SKU public IP from a Standard prefix (this will FAIL)
az network public-ip create \
  --resource-group $RG \
  --name pip-broken-sku \
  --sku Basic \
  --allocation-method Dynamic \
  --public-ip-prefix pip-prefix-contoso-eastus2
```

**Sintoma**: O comando falha porque IPs públicos de SKU Basic não podem ser alocados a partir de um prefixo de IP público.

**Causa raiz**: Prefixos de IP público são sempre de SKU Standard. Apenas IPs públicos de SKU Standard com alocação estática podem ser alocados a partir de um prefixo. IPs de SKU Basic usam alocação dinâmica e são incompatíveis.

**Correção**: Use SKU Standard com alocação estática:

```bash
az network public-ip create \
  --resource-group $RG \
  --name pip-fixed-sku \
  --sku Standard \
  --allocation-method Static \
  --version IPv4 \
  --public-ip-prefix pip-prefix-contoso-eastus2
```

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-01-q1",
    question: "A Contoso planeja implantar um VPN Gateway com SKU VpnGw2. Qual é o tamanho mínimo para a GatewaySubnet?",
    options: [
      "/27 (32 endereços)",
      "/28 (16 endereços)",
      "/29 (8 endereços)",
      "/26 (64 endereços)"
    ],
    correctIndex: 0,
    explanation: "Todos os SKUs de VPN Gateway exceto Basic exigem uma GatewaySubnet de /27 ou maior. Embora /29 funcione apenas para o SKU Basic, a Microsoft recomenda /27 como mínimo para todas as implantações em produção. Um /28 não é suficiente para VpnGw2."
  },
  {
    id: "az700-01-q2",
    question: "Você precisa alocar um endereço IP público a partir de um prefixo de IP público. Qual combinação de SKU e método de alocação é válida?",
    options: [
      "SKU Standard com alocação Estática",
      "SKU Basic com alocação Dinâmica",
      "SKU Standard com alocação Dinâmica",
      "SKU Basic com alocação Estática"
    ],
    correctIndex: 0,
    explanation: "Prefixos de IP público são apenas SKU Standard. IPs derivados de um prefixo também devem ser SKU Standard com método de alocação Estática. SKU Basic e alocação Dinâmica não são suportados com prefixos."
  },
  {
    id: "az700-01-q3",
    question: "Duas VNets precisam ser emparelhadas (peered). VNet-A usa 10.0.0.0/16 e VNet-B usa 10.0.128.0/17. Você pode criar o peering?",
    options: [
      "Não, porque 10.0.128.0/17 está dentro do intervalo 10.0.0.0/16 e eles se sobrepõem",
      "Sim, porque /17 é uma rota mais específica que /16",
      "Sim, se você habilitar gateway transit",
      "Não, mas apenas porque estão no mesmo resource group"
    ],
    correctIndex: 0,
    explanation: "O peering de VNet no Azure exige espaços de endereço não sobrepostos. O intervalo 10.0.128.0/17 é um subconjunto de 10.0.0.0/16, portanto essas VNets se sobrepõem e não podem ser emparelhadas. A especificidade da rota é irrelevante para a validação de peering."
  },
  {
    id: "az700-01-q4",
    question: "Qual é o nome correto da subnet para implantar o Azure Bastion em uma VNet?",
    options: [
      "AzureBastionSubnet",
      "BastionSubnet",
      "bastion-subnet",
      "Qualquer nome, desde que você o selecione durante a implantação do Bastion"
    ],
    correctIndex: 0,
    explanation: "O Azure Bastion requer uma subnet com o nome exato 'AzureBastionSubnet'. Este é um nome reservado imposto pela plataforma. A subnet também deve ter no mínimo tamanho /26."
  },
  {
    id: "az700-01-q5",
    question: "A Contoso possui o intervalo de IP registrado 198.51.100.0/24 e deseja usá-lo no Azure. Qual comando cria o recurso de prefixo de IP personalizado?",
    options: [
      "az network custom-ip prefix create",
      "az network public-ip prefix create --byoip",
      "az network vnet create --custom-prefix",
      "az network public-ip create --bring-your-own-ip"
    ],
    correctIndex: 0,
    explanation: "O comando 'az network custom-ip prefix create' é usado para provisionar um intervalo de IP de propriedade do cliente (BYOIP) no Azure. Após o provisionamento e comissionamento, você deriva prefixos de IP público dele usando --custom-ip-prefix-name em 'az network public-ip prefix create'."
  },
  {
    id: "az700-01-q6",
    question: "Você cria um prefixo de IP público com --length 28. Quantos endereços IP públicos você pode alocar dele?",
    options: [
      "16",
      "14",
      "12",
      "28"
    ],
    correctIndex: 0,
    explanation: "Um prefixo /28 fornece 16 endereços IP. Diferentemente de subnets, prefixos de IP público não reservam endereços para rede/broadcast. Todos os 16 endereços em um prefixo de IP público /28 são utilizáveis e podem ser alocados como IPs públicos individuais."
  }
]} />

## Limpeza

Remova todos os recursos criados neste desafio para evitar quaisquer cobranças.

### Azure CLI

```bash
# Delete the entire resource group and all resources within it
az group delete --name rg-contoso-networking --yes --no-wait
```

### Azure PowerShell

```powershell
# Delete the entire resource group and all resources within it
Remove-AzResourceGroup -Name "rg-contoso-networking" -Force -AsJob
```

:::tip Verificar limpeza
Após alguns minutos, confirme a exclusão com:
```bash
az group show --name rg-contoso-networking 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists"
```
:::
