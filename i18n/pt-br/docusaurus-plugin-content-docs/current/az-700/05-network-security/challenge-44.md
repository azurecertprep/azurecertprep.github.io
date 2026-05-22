---
sidebar_position: 5
title: "Challenge 44: Secured virtual hub (Firewall in vWAN)"
sidebar_label: "Challenge 44"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 44: Hub virtual protegido (Firewall em vWAN)

:::info Tempo e custo estimados
**90-120 minutos** | **~$1,50/hora** (Hub Virtual WAN + Azure Firewall) | **Peso no exame: 15-20%**
:::

:::danger Aviso de custo
Este desafio implanta um hub Virtual WAN ($0,25/h) e Azure Firewall Standard ($1,25/h). O custo combinado é de aproximadamente $1,50/hora. Exclua os recursos imediatamente após concluir os exercícios. Não deixe esses recursos em execução durante a noite.
:::

## Cenário

A Northwind Traders opera um ambiente distribuído globalmente com múltiplas VNets spoke conectadas via Azure Virtual WAN. A equipe de segurança exige que todo o tráfego destinado à internet e o tráfego entre spokes (privado) seja inspecionado por um firewall centralizado. Em vez de gerenciar tabelas de rotas complexas manualmente em dezenas de spokes, a equipe decidiu converter o hub Virtual WAN em um hub virtual protegido implantando o Azure Firewall diretamente dentro do hub e configurando a intenção de roteamento.

Sua tarefa é implantar um hub virtual protegido com Azure Firewall, criar uma política de firewall com regras de aplicação e rede, configurar políticas de intenção de roteamento para forçar tanto o tráfego de internet quanto o tráfego privado pelo firewall, e integrar a implantação com o Azure Firewall Manager para gerenciamento centralizado.

## Habilidades do exame abordadas

| Habilidade | Peso |
|------------|------|
| Proteger conectividade de rede com Azure Firewall em Virtual WAN | Alto |
| Configurar intenção de roteamento e políticas de roteamento | Alto |
| Criar e associar políticas de firewall | Médio |
| Integrar com Azure Firewall Manager | Médio |
| Monitorar tráfego do hub virtual protegido | Médio |

## Pré-requisitos

- Assinatura do Azure com função de Colaborador
- Azure CLI 2.55+ com as extensões `virtual-wan` e `azure-firewall`
- Azure PowerShell Az 12.0+
- Compreensão da arquitetura Virtual WAN e rede hub-spoke

## Tarefa 1: Criar o Virtual WAN e o hub

Um Virtual WAN fornece uma estrutura de rede unificada. O hub é o roteador central gerenciado. Você deve usar o tipo **Standard** (não Basic) para suportar a integração com Azure Firewall.

### Azure CLI

```bash
# Set variables
RG="rg-northwind-vwan"
LOCATION="eastus2"
VWAN_NAME="vwan-northwind"
HUB_NAME="hub-eastus2"

# Create resource group
az group create --name $RG --location $LOCATION

# Create Virtual WAN (Standard type required for firewall support)
az network vwan create \
  --name $VWAN_NAME \
  --resource-group $RG \
  --type Standard \
  --branch-to-branch-traffic true \
  --location $LOCATION

# Create Virtual Hub (this takes 10-20 minutes)
az network vhub create \
  --name $HUB_NAME \
  --resource-group $RG \
  --vwan $VWAN_NAME \
  --location $LOCATION \
  --address-prefix 10.100.0.0/23 \
  --sku Standard
```

### Azure PowerShell

```powershell
# Set variables
$rg = "rg-northwind-vwan"
$location = "eastus2"
$vwanName = "vwan-northwind"
$hubName = "hub-eastus2"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Create Virtual WAN
$vwan = New-AzVirtualWan `
  -ResourceGroupName $rg `
  -Name $vwanName `
  -Location $location `
  -VirtualWANType Standard `
  -AllowBranchToBranchTraffic

# Create Virtual Hub
New-AzVirtualHub `
  -ResourceGroupName $rg `
  -Name $hubName `
  -VirtualWan $vwan `
  -Location $location `
  -AddressPrefix "10.100.0.0/23" `
  -Sku Standard
```

### Portal do Azure

1. Pesquise por **Virtual WANs** e selecione **Create**.
2. Selecione sua assinatura, grupo de recursos, região **East US 2**, nome **vwan-northwind**, tipo **Standard**.
3. Selecione **Review + create** e depois **Create**.
4. Abra o recurso Virtual WAN, selecione **Hubs** em Connectivity e depois **New Hub**.
5. Defina a região como **East US 2**, nome **hub-eastus2**, espaço de endereços **10.100.0.0/23**.
6. Selecione **Review + create** e depois **Create**. Aguarde o provisionamento (10-20 minutos).

## Tarefa 2: Criar VNets spoke e conectar ao hub

Crie duas VNets spoke representando cargas de trabalho de produção e desenvolvimento, e depois conecte-as ao hub.

### Azure CLI

```bash
# Create spoke VNets
az network vnet create \
  --resource-group $RG \
  --name vnet-spoke-prod \
  --location $LOCATION \
  --address-prefixes 10.10.0.0/16 \
  --subnet-name snet-workload \
  --subnet-prefixes 10.10.1.0/24

az network vnet create \
  --resource-group $RG \
  --name vnet-spoke-dev \
  --location $LOCATION \
  --address-prefixes 10.20.0.0/16 \
  --subnet-name snet-workload \
  --subnet-prefixes 10.20.1.0/24

# Get VNet resource IDs
PROD_VNET_ID=$(az network vnet show --resource-group $RG --name vnet-spoke-prod --query id -o tsv)
DEV_VNET_ID=$(az network vnet show --resource-group $RG --name vnet-spoke-dev --query id -o tsv)

# Connect spoke VNets to the hub
az network vhub connection create \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --name conn-spoke-prod \
  --remote-vnet $PROD_VNET_ID

az network vhub connection create \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --name conn-spoke-dev \
  --remote-vnet $DEV_VNET_ID
```

### Azure PowerShell

```powershell
# Create spoke VNets
$subnetProd = New-AzVirtualNetworkSubnetConfig -Name "snet-workload" -AddressPrefix "10.10.1.0/24"
$vnetProd = New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-spoke-prod" `
  -Location $location `
  -AddressPrefix "10.10.0.0/16" `
  -Subnet $subnetProd

$subnetDev = New-AzVirtualNetworkSubnetConfig -Name "snet-workload" -AddressPrefix "10.20.1.0/24"
$vnetDev = New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-spoke-dev" `
  -Location $location `
  -AddressPrefix "10.20.0.0/16" `
  -Subnet $subnetDev

# Connect spoke VNets to the hub
$hub = Get-AzVirtualHub -ResourceGroupName $rg -Name $hubName
New-AzVirtualHubVnetConnection `
  -ResourceGroupName $rg `
  -VirtualHubName $hubName `
  -Name "conn-spoke-prod" `
  -RemoteVirtualNetwork $vnetProd

New-AzVirtualHubVnetConnection `
  -ResourceGroupName $rg `
  -VirtualHubName $hubName `
  -Name "conn-spoke-dev" `
  -RemoteVirtualNetwork $vnetDev
```

## Tarefa 3: Implantar Azure Firewall no hub (converter para hub protegido)

Implantar o Azure Firewall dentro de um hub Virtual WAN o converte em um **hub virtual protegido**. Você deve usar o SKU `AZFW_Hub` (não `AZFW_VNet`, que é para implantações autônomas em VNet).

### Azure CLI

```bash
# Create a firewall policy first
az network firewall policy create \
  --name fw-policy-northwind \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard \
  --threat-intel-mode Alert

# Deploy Azure Firewall in the hub (AZFW_Hub SKU)
# This takes 10-15 minutes
az network firewall create \
  --name fw-hub-eastus2 \
  --resource-group $RG \
  --location $LOCATION \
  --sku AZFW_Hub \
  --tier Standard \
  --virtual-hub $HUB_NAME \
  --firewall-policy fw-policy-northwind \
  --public-ip-count 1

# Retrieve the firewall resource ID (needed for routing intent)
FW_ID=$(az network firewall show \
  --name fw-hub-eastus2 \
  --resource-group $RG \
  --query id -o tsv)
echo "Firewall ID: $FW_ID"
```

### Azure PowerShell

```powershell
# Create firewall policy
$fwPolicy = New-AzFirewallPolicy `
  -ResourceGroupName $rg `
  -Name "fw-policy-northwind" `
  -Location $location `
  -SkuTier Standard `
  -ThreatIntelMode Alert

# Get hub reference
$hub = Get-AzVirtualHub -ResourceGroupName $rg -Name $hubName

# Deploy Azure Firewall in the hub
$fw = New-AzFirewall `
  -ResourceGroupName $rg `
  -Name "fw-hub-eastus2" `
  -Location $location `
  -SkuName AZFW_Hub `
  -SkuTier Standard `
  -VirtualHubId $hub.Id `
  -FirewallPolicyId $fwPolicy.Id `
  -HubIPAddress @{PublicIPCount = 1}

$fwId = $fw.Id
```

### Portal do Azure

1. Abra seu Virtual WAN, navegue até **Hubs**, selecione **hub-eastus2**.
2. Em Security, selecione **Azure Firewall and Firewall Manager**.
3. Defina o status do Azure Firewall como **Enabled**, tier como **Standard**.
4. Em Firewall policy, selecione **Create new** ou selecione a política existente.
5. Defina a contagem de IP público como **1**.
6. Selecione **Save**. Aguarde a implantação (10-15 minutos).

:::warning AZFW_Hub vs AZFW_VNet
O SKU `AZFW_Hub` é exclusivamente para hubs virtuais protegidos em Virtual WAN. Ele não exige que você crie sub-redes ou IPs públicos manualmente; esses são gerenciados pela plataforma. O SKU `AZFW_VNet` é para implantações tradicionais autônomas em VNet onde você gerencia a AzureFirewallSubnet por conta própria. Usar o SKU errado fará a implantação falhar.
:::

## Tarefa 4: Configurar regras da política de firewall

Adicione grupos de coleções de regras de aplicação e rede para permitir tráfego controlado enquanto inspeciona tudo.

### Azure CLI

```bash
# Create a network rule collection group
az network firewall policy rule-collection-group create \
  --name DefaultNetworkRuleCollectionGroup \
  --policy-name fw-policy-northwind \
  --resource-group $RG \
  --priority 200

# Add a network rule collection allowing inter-spoke traffic
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name fw-policy-northwind \
  --rule-collection-group-name DefaultNetworkRuleCollectionGroup \
  --name AllowInterSpoke \
  --collection-priority 100 \
  --action Allow \
  --rule-name AllowSpokeToSpoke \
  --rule-type NetworkRule \
  --source-addresses "10.10.0.0/16" "10.20.0.0/16" \
  --destination-addresses "10.10.0.0/16" "10.20.0.0/16" \
  --ip-protocols TCP UDP ICMP \
  --destination-ports "*"

# Create an application rule collection group
az network firewall policy rule-collection-group create \
  --name DefaultApplicationRuleCollectionGroup \
  --policy-name fw-policy-northwind \
  --resource-group $RG \
  --priority 300

# Add application rule allowing web browsing
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group $RG \
  --policy-name fw-policy-northwind \
  --rule-collection-group-name DefaultApplicationRuleCollectionGroup \
  --name AllowWeb \
  --collection-priority 100 \
  --action Allow \
  --rule-name AllowHTTPS \
  --rule-type ApplicationRule \
  --source-addresses "10.10.0.0/16" "10.20.0.0/16" \
  --protocols Https=443 Http=80 \
  --target-fqdns "*.microsoft.com" "*.azure.com" "*.windows.net"
```

### Azure PowerShell

```powershell
# Create network rule
$networkRule = New-AzFirewallPolicyFilterRuleCollection `
  -Name "AllowInterSpoke" `
  -Priority 100 `
  -ActionType Allow `
  -Rule (New-AzFirewallPolicyNetworkRule `
    -Name "AllowSpokeToSpoke" `
    -SourceAddress @("10.10.0.0/16", "10.20.0.0/16") `
    -DestinationAddress @("10.10.0.0/16", "10.20.0.0/16") `
    -Protocol @("TCP", "UDP", "ICMP") `
    -DestinationPort @("*"))

# Create network rule collection group
$networkRCG = New-AzFirewallPolicyRuleCollectionGroup `
  -ResourceGroupName $rg `
  -FirewallPolicyName "fw-policy-northwind" `
  -Name "DefaultNetworkRuleCollectionGroup" `
  -Priority 200 `
  -RuleCollection $networkRule

# Create application rule
$appRule = New-AzFirewallPolicyFilterRuleCollection `
  -Name "AllowWeb" `
  -Priority 100 `
  -ActionType Allow `
  -Rule (New-AzFirewallPolicyApplicationRule `
    -Name "AllowHTTPS" `
    -SourceAddress @("10.10.0.0/16", "10.20.0.0/16") `
    -Protocol @("Https:443", "Http:80") `
    -TargetFqdn @("*.microsoft.com", "*.azure.com", "*.windows.net"))

# Create application rule collection group
$appRCG = New-AzFirewallPolicyRuleCollectionGroup `
  -ResourceGroupName $rg `
  -FirewallPolicyName "fw-policy-northwind" `
  -Name "DefaultApplicationRuleCollectionGroup" `
  -Priority 300 `
  -RuleCollection $appRule
```

## Tarefa 5: Configurar intenção de roteamento

A intenção de roteamento é o mecanismo que instrui o hub Virtual WAN a rotear todo o tráfego destinado à internet e/ou tráfego privado pelo Azure Firewall (ou um NVA suportado). Isso substitui a necessidade de configurar manualmente tabelas de rotas em cada conexão spoke.

Existem duas políticas de roteamento:
- **InternetTraffic**: Força todo o tráfego destinado à internet pelo firewall.
- **PrivateTraffic**: Força todo o tráfego entre spokes e de branch para VNet pelo firewall.

### Azure CLI

```bash
# Create routing intent with both Internet and Private traffic policies
az network vhub routing-intent create \
  --name ri-hub-eastus2 \
  --resource-group $RG \
  --vhub $HUB_NAME \
  --routing-policies "[{name:InternetTraffic,destinations:[Internet],next-hop:$FW_ID},{name:PrivateTrafficPolicy,destinations:[PrivateTraffic],next-hop:$FW_ID}]"

# Verify routing intent was created
az network vhub routing-intent show \
  --name ri-hub-eastus2 \
  --resource-group $RG \
  --vhub $HUB_NAME
```

### Azure PowerShell

```powershell
# Get firewall resource
$fw = Get-AzFirewall -ResourceGroupName $rg -Name "fw-hub-eastus2"

# Create routing policies
$internetPolicy = New-AzRoutingPolicy `
  -Name "InternetTraffic" `
  -Destination @("Internet") `
  -NextHop $fw.Id

$privatePolicy = New-AzRoutingPolicy `
  -Name "PrivateTrafficPolicy" `
  -Destination @("PrivateTraffic") `
  -NextHop $fw.Id

# Create routing intent
New-AzRoutingIntent `
  -ResourceGroupName $rg `
  -VirtualHubName $hubName `
  -Name "ri-hub-eastus2" `
  -RoutingPolicy @($internetPolicy, $privatePolicy)
```

### Portal do Azure

1. Abra o Virtual WAN, navegue até **Hubs**, selecione **hub-eastus2**.
2. Em Routing, selecione **Routing Intent and Policies**.
3. Defina **Internet Traffic** como **Azure Firewall** e selecione seu recurso de firewall.
4. Defina **Private Traffic** como **Azure Firewall** e selecione seu recurso de firewall.
5. Selecione **Save**.

:::tip Intenção de roteamento vs tabelas de rotas manuais
Antes da intenção de roteamento, era necessário criar tabelas de rotas personalizadas com 0.0.0.0/0 apontando para o firewall em cada conexão do hub. A intenção de roteamento automatiza isso completamente. Quando habilitada, o hub programa automaticamente as rotas efetivas em todas as conexões (VNet, VPN, ExpressRoute) sem intervenção manual.
:::

## Tarefa 6: Habilitar log de diagnóstico e verificar fluxo de tráfego

### Azure CLI

```bash
# Enable diagnostic settings for the firewall
FW_RESOURCE_ID=$(az network firewall show \
  --name fw-hub-eastus2 \
  --resource-group $RG \
  --query id -o tsv)

# Create a Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group $RG \
  --workspace-name law-northwind-fw \
  --location $LOCATION

LAW_ID=$(az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-northwind-fw \
  --query id -o tsv)

# Enable diagnostic settings
az monitor diagnostic-settings create \
  --name fw-diagnostics \
  --resource $FW_RESOURCE_ID \
  --workspace $LAW_ID \
  --logs '[{"category":"AZFWNetworkRule","enabled":true},{"category":"AZFWApplicationRule","enabled":true},{"category":"AZFWThreatIntel","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'

# Verify effective routes on a spoke connection
az network vhub connection show \
  --resource-group $RG \
  --vhub-name $HUB_NAME \
  --name conn-spoke-prod \
  --query routingConfiguration
```

### Azure PowerShell

```powershell
# Create Log Analytics workspace
$law = New-AzOperationalInsightsWorkspace `
  -ResourceGroupName $rg `
  -Name "law-northwind-fw" `
  -Location $location

# Enable diagnostic settings
$fw = Get-AzFirewall -ResourceGroupName $rg -Name "fw-hub-eastus2"

$logCategories = @(
  New-AzDiagnosticSettingLogSettingsObject -Category "AZFWNetworkRule" -Enabled $true
  New-AzDiagnosticSettingLogSettingsObject -Category "AZFWApplicationRule" -Enabled $true
  New-AzDiagnosticSettingLogSettingsObject -Category "AZFWThreatIntel" -Enabled $true
)

New-AzDiagnosticSetting `
  -ResourceId $fw.Id `
  -Name "fw-diagnostics" `
  -WorkspaceId $law.ResourceId `
  -Log $logCategories `
  -Metric (New-AzDiagnosticSettingMetricSettingsObject -Category "AllMetrics" -Enabled $true)
```

## Tarefa 7: Integrar com Azure Firewall Manager

O Azure Firewall Manager fornece uma visão centralizada de todos os hubs virtuais protegidos e implantações de firewall autônomas. Quando você implanta o Azure Firewall dentro de um hub Virtual WAN, ele se registra automaticamente no Firewall Manager.

### Portal do Azure

1. Pesquise por **Firewall Manager** no portal.
2. Selecione **Azure Firewall Policies** para visualizar todas as políticas entre os hubs protegidos.
3. Selecione **Virtual Hubs** para ver hub-eastus2 listado como um hub virtual protegido.
4. Em **Security Configuration**, verifique se as políticas de intenção de roteamento mostram tráfego de internet e privado roteados pelo firewall.
5. A partir do Firewall Manager, você pode criar novas políticas, associar políticas entre hubs e monitorar a postura de segurança a partir de um único painel.

### Azure CLI

```bash
# List all firewall policies (Firewall Manager view)
az network firewall policy list --resource-group $RG -o table

# Show the policy association with the secured hub
az network firewall show \
  --name fw-hub-eastus2 \
  --resource-group $RG \
  --query "{name:name, sku:sku.name, hub:virtualHub.id, policy:firewallPolicy.id}" \
  -o json
```

## Quebra e correção

Estes exercícios simulam configurações incorretas comuns em implantações de hub virtual protegido.

### Cenário 1: Intenção de roteamento não aplicada (hub não convertido corretamente)

```bash
# Symptom: inter-spoke traffic is not being inspected by the firewall
# Check routing intent status
az network vhub routing-intent list \
  --resource-group $RG \
  --vhub $HUB_NAME \
  -o table
```

**Sintoma**: O tráfego entre VNets spoke flui diretamente sem inspeção do firewall. A execução de `az network vhub routing-intent list` retorna um resultado vazio.

**Causa raiz**: A intenção de roteamento nunca foi criada, ou o estado de provisionamento do hub não é "Succeeded". O firewall foi implantado, mas a intenção de roteamento deve ser configurada separadamente para realmente redirecionar o tráfego.

**Correção**: Crie a intenção de roteamento conforme mostrado na Tarefa 5. Certifique-se de que o estado de provisionamento do hub é "Succeeded" antes de criar a intenção de roteamento:

```bash
# Verify hub state
az network vhub show --name $HUB_NAME --resource-group $RG --query provisioningState

# Create routing intent if missing
az network vhub routing-intent create \
  --name ri-hub-eastus2 \
  --resource-group $RG \
  --vhub $HUB_NAME \
  --routing-policies "[{name:InternetTraffic,destinations:[Internet],next-hop:$FW_ID},{name:PrivateTrafficPolicy,destinations:[PrivateTraffic],next-hop:$FW_ID}]"
```

### Cenário 2: Tráfego entre spokes ignorando o firewall

```bash
# Symptom: production VM can reach dev VM directly, firewall logs show no inter-spoke traffic
# Check if PrivateTraffic policy is configured
az network vhub routing-intent show \
  --name ri-hub-eastus2 \
  --resource-group $RG \
  --vhub $HUB_NAME \
  --query "routingPolicies[?destinations[0]=='PrivateTraffic']"
```

**Sintoma**: O tráfego de internet está passando pelo firewall, mas o tráfego entre spokes (privado) está fluindo diretamente entre os spokes sem inspeção.

**Causa raiz**: A intenção de roteamento foi criada apenas com a política InternetTraffic. A política PrivateTraffic não foi incluída, então o hub não injeta uma rota 0.0.0.0/0 para tráfego RFC 1918 apontando para o firewall.

**Correção**: Atualize a intenção de roteamento para incluir ambas as políticas:

```bash
az network vhub routing-intent update \
  --name ri-hub-eastus2 \
  --resource-group $RG \
  --vhub $HUB_NAME \
  --routing-policies "[{name:InternetTraffic,destinations:[Internet],next-hop:$FW_ID},{name:PrivateTrafficPolicy,destinations:[PrivateTraffic],next-hop:$FW_ID}]"
```

### Cenário 3: Logs do firewall não mostrando tráfego

**Sintoma**: Você confirmou via intenção de roteamento que o tráfego deve fluir pelo firewall, mas o workspace do Log Analytics não mostra nenhuma entrada de log do firewall.

**Causa raiz**: As configurações de diagnóstico nunca foram definidas no recurso Azure Firewall. Por padrão, o Azure Firewall não envia logs para nenhum destino. Você deve criar explicitamente configurações de diagnóstico apontando para um workspace do Log Analytics, Storage Account ou Event Hub.

**Correção**: Crie as configurações de diagnóstico conforme mostrado na Tarefa 6. Após habilitar, aguarde 5-10 minutos para os logs aparecerem. Verifique com uma consulta KQL:

```bash
# Query firewall logs (run in Log Analytics)
# AZFWNetworkRule
# | where TimeGenerated > ago(1h)
# | project TimeGenerated, SourceIP, DestinationIP, Action, Protocol

az monitor diagnostic-settings show \
  --name fw-diagnostics \
  --resource $FW_RESOURCE_ID
```

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-44-q1",
    question: "Which SKU must be used when deploying Azure Firewall inside a Virtual WAN hub?",
    options: [
      "AZFW_Hub ✅",
      "AZFW_VNet",
      "Standard_v2",
      "Premium_Hub"
    ],
    correctIndex: 0,
    explanation: "The AZFW_Hub SKU is specifically designed for deployment inside Virtual WAN hubs (secured virtual hubs). AZFW_VNet is for standalone VNet deployments where you manage the AzureFirewallSubnet yourself. Using AZFW_VNet in a Virtual WAN hub will fail."
  },
  {
    id: "az700-44-q2",
    question: "What are the two routing policy types available in Virtual WAN routing intent?",
    options: [
      "InternetTraffic and PrivateTraffic ✅",
      "PublicTraffic and InternalTraffic",
      "InboundTraffic and OutboundTraffic",
      "NorthSouth and EastWest"
    ],
    correctIndex: 0,
    explanation: "Routing intent supports two policy types: InternetTraffic (forces 0.0.0.0/0 internet traffic through the next hop) and PrivateTraffic (forces all RFC 1918 inter-spoke and branch traffic through the next hop). Both must be configured to achieve full traffic inspection."
  },
  {
    id: "az700-44-q3",
    question: "What distinguishes a secured virtual hub from a standard Virtual WAN hub?",
    options: [
      "A secured virtual hub has Azure Firewall or a supported security partner provider deployed within it ✅",
      "A secured virtual hub uses the Premium WAN type instead of Standard",
      "A secured virtual hub encrypts all traffic between spokes automatically",
      "A secured virtual hub requires ExpressRoute connectivity"
    ],
    correctIndex: 0,
    explanation: "A secured virtual hub is simply a Virtual WAN hub with Azure Firewall (or a supported third-party security partner provider) deployed inside it. This is managed through Azure Firewall Manager. The hub type must be Standard (not Basic), but Premium is not a valid type."
  },
  {
    id: "az700-44-q4",
    question: "When routing intent with PrivateTraffic policy is enabled, what happens to inter-spoke traffic?",
    options: [
      "All inter-spoke traffic is routed through the Azure Firewall next hop specified in the policy ✅",
      "Inter-spoke traffic is blocked by default until explicit allow rules are created",
      "Traffic flows directly between spokes but is logged by the firewall",
      "Only traffic between different regions is routed through the firewall"
    ],
    correctIndex: 0,
    explanation: "When the PrivateTraffic routing policy is configured, the hub automatically programs routes so that all RFC 1918 traffic (including inter-spoke) passes through the specified next hop (Azure Firewall). The firewall policy rules then determine whether to allow or deny the traffic."
  },
  {
    id: "az700-44-q5",
    question: "Which Virtual WAN type is required to deploy Azure Firewall in a hub?",
    options: [
      "Standard ✅",
      "Basic",
      "Premium",
      "Enterprise"
    ],
    correctIndex: 0,
    explanation: "Azure Virtual WAN must be Standard type to support Azure Firewall, VPN Gateway, and ExpressRoute in hubs. The Basic type only supports site-to-site VPN. There is no Premium or Enterprise type."
  },
  {
    id: "az700-44-q6",
    question: "You deployed Azure Firewall in a Virtual WAN hub but inter-spoke traffic is not being inspected. What is the most likely cause?",
    options: [
      "Routing intent with PrivateTraffic policy was not configured ✅",
      "The firewall tier needs to be upgraded to Premium",
      "Spoke VNets need NSG rules allowing firewall inspection",
      "The AZFW_VNet SKU was accidentally used instead of AZFW_Hub"
    ],
    correctIndex: 0,
    explanation: "Deploying Azure Firewall in a hub does not automatically force traffic through it. You must configure routing intent with the PrivateTraffic policy to inject routes that direct inter-spoke traffic through the firewall. Without routing intent, traffic flows directly between connected spokes."
  }
]} />

## Limpeza

Remova todos os recursos criados neste desafio para parar de incorrer em cobranças imediatamente.

### Azure CLI

```bash
# Delete the entire resource group (includes vWAN, hub, firewall, VNets)
az group delete --name rg-northwind-vwan --yes --no-wait
```

### Azure PowerShell

```powershell
# Delete the entire resource group
Remove-AzResourceGroup -Name "rg-northwind-vwan" -Force -AsJob
```

:::tip Verificar limpeza
Hubs Virtual WAN levam 10-20 minutos para serem completamente excluídos. Confirme a exclusão com:
```bash
az group show --name rg-northwind-vwan 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists"
```
:::

:::danger Lembrete de custo pós-lab
Se o grupo de recursos ainda existir, você está sendo cobrado aproximadamente $1,50/hora. Execute os comandos de limpeza acima imediatamente após terminar.
:::
