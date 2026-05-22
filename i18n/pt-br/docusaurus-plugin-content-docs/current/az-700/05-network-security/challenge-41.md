---
sidebar_position: 2
title: "Challenge 41: VNet flow logs and traffic analytics"
sidebar_label: "Challenge 41"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 41: Logs de fluxo da VNet e Traffic Analytics

:::info Tempo e custo estimados
**45-60 minutos** | **~$0,10/hora** (armazenamento + ingestão do Log Analytics) | **Peso no exame: 10-15%**
:::

## Cenário

A equipe de conformidade da Northwind Traders requer visibilidade total de todo o tráfego de rede fluindo pelo ambiente Azure. Eles precisam detectar padrões anômalos, verificar se as regras de microssegmentação estão funcionando conforme o esperado e produzir relatórios de auditoria mostrando os fluxos de tráfego entre camadas. O centro de operações de segurança também requer o Azure Bastion para acesso seguro às VMs sem expor portas RDP/SSH à internet.

Você habilitará os logs de fluxo da VNet (a substituição recomendada para os logs de fluxo do NSG), configurará o Traffic Analytics para insights inteligentes, usará as ferramentas de diagnóstico do Network Watcher para verificar a conectividade e configurará as regras de NSG necessárias para o Azure Bastion.

## Habilidades do exame abordadas

| Habilidade | Peso |
|------------|------|
| Configurar logs de fluxo da VNet | Alto |
| Habilitar e configurar o Traffic Analytics | Médio |
| Usar IP flow verify e solução de problemas de conexão do Network Watcher | Alto |
| Configurar regras de NSG para o Azure Bastion | Médio |
| Analisar dados de logs de fluxo com o Log Analytics | Médio |

## Pré-requisitos

- Assinatura do Azure com função de Colaborador
- Azure CLI 2.60+ ou Azure PowerShell Az 12.0+
- VNet existente (use a do Challenge 40 ou crie uma nova)
- Network Watcher habilitado na sua região (habilitado automaticamente na maioria das assinaturas)

## Tarefa 1: Criar recursos de suporte (conta de armazenamento e Log Analytics workspace)

Os logs de fluxo requerem uma conta de armazenamento na mesma região do recurso de destino. O Traffic Analytics requer adicionalmente um Log Analytics workspace.

### Azure CLI

```bash
# Set variables
RG="rg-flowlogs-challenge"
LOCATION="eastus2"
STORAGE="stflowlogs${RANDOM}"
WORKSPACE="law-traffic-analytics"

# Create resource group
az group create --name $RG --location $LOCATION

# Create storage account (same region as VNet)
az storage account create \
  --resource-group $RG \
  --name $STORAGE \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group $RG \
  --workspace-name $WORKSPACE \
  --location $LOCATION \
  --retention-time 30

# Create a VNet to monitor
az network vnet create \
  --resource-group $RG \
  --name vnet-monitored \
  --location $LOCATION \
  --address-prefixes 10.0.0.0/16 \
  --subnet-name snet-workload \
  --subnet-prefixes 10.0.1.0/24
```

### Azure PowerShell

```powershell
# Set variables
$rg = "rg-flowlogs-challenge"
$location = "eastus2"
$storageName = "stflowlogs$(Get-Random -Minimum 1000 -Maximum 9999)"
$workspaceName = "law-traffic-analytics"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Create storage account
New-AzStorageAccount `
  -ResourceGroupName $rg `
  -Name $storageName `
  -Location $location `
  -SkuName Standard_LRS `
  -Kind StorageV2

# Create Log Analytics workspace
New-AzOperationalInsightsWorkspace `
  -ResourceGroupName $rg `
  -Name $workspaceName `
  -Location $location `
  -RetentionInDays 30

# Create VNet
$subnet = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-workload" -AddressPrefix "10.0.1.0/24"

New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-monitored" `
  -Location $location `
  -AddressPrefix "10.0.0.0/16" `
  -Subnet $subnet
```

## Tarefa 2: Habilitar logs de fluxo da VNet com Traffic Analytics

Os logs de fluxo da VNet são a abordagem recomendada atualmente, substituindo os logs de fluxo do NSG mais antigos. Eles capturam informações de fluxo no nível da VNet, fornecendo visibilidade mais ampla, incluindo tráfego entre sub-redes dentro da mesma VNet.

:::warning Logs de fluxo da VNet vs logs de fluxo do NSG
Os logs de fluxo da VNet (usando `--vnet`) são o método mais novo e recomendado. Os logs de fluxo do NSG (usando `--nsg`) são legados. Os logs de fluxo da VNet capturam todos os fluxos que atravessam a VNet, enquanto os logs de fluxo do NSG capturam apenas o tráfego avaliado por um NSG específico. Para o exame AZ-700, entenda ambos, mas prefira os logs de fluxo da VNet para novas implantações.
:::

### Azure CLI

```bash
# Enable VNet flow logs with Traffic Analytics
az network watcher flow-log create \
  --name flowlog-vnet-monitored \
  --resource-group $RG \
  --location $LOCATION \
  --vnet vnet-monitored \
  --storage-account $STORAGE \
  --workspace $WORKSPACE \
  --traffic-analytics true \
  --enabled true \
  --log-version 2 \
  --format JSON

# Verify flow log creation
az network watcher flow-log show \
  --name flowlog-vnet-monitored \
  --location $LOCATION

# List all flow logs in the region
az network watcher flow-log list --location $LOCATION --output table
```

### Azure PowerShell

```powershell
# Get references
$storageAccount = Get-AzStorageAccount -ResourceGroupName $rg -Name $storageName
$workspace = Get-AzOperationalInsightsWorkspace -ResourceGroupName $rg -Name $workspaceName
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-monitored"

# Get or create Network Watcher
$nw = Get-AzNetworkWatcher -ResourceGroupName "NetworkWatcherRG" -Name "NetworkWatcher_$location" -ErrorAction SilentlyContinue
if (-not $nw) {
    $nw = New-AzNetworkWatcher -Name "NetworkWatcher_$location" -ResourceGroupName "NetworkWatcherRG" -Location $location
}

# Enable VNet flow log with Traffic Analytics
$flowLogConfig = @{
    Name = "flowlog-vnet-monitored"
    NetworkWatcherName = $nw.Name
    ResourceGroupName = $nw.ResourceGroupName
    TargetResourceId = $vnet.Id
    StorageId = $storageAccount.Id
    Enabled = $true
    FormatVersion = 2
    EnableTrafficAnalytics = $true
    TrafficAnalyticsWorkspaceId = $workspace.CustomerId
    TrafficAnalyticsResourceId = $workspace.ResourceId
    TrafficAnalyticsInterval = 10
}

New-AzNetworkWatcherFlowLog @flowLogConfig
```

### Parâmetros principais explicados

| Parâmetro | Finalidade |
|-----------|-----------|
| `--vnet` | Direciona a uma VNet (substitui `--nsg` para logs de fluxo do NSG legados) |
| `--log-version 2` | A versão 2 inclui contagem de bytes/pacotes e estado do fluxo |
| `--traffic-analytics true` | Habilita o processamento do Traffic Analytics |
| `--workspace` | Log Analytics workspace para agregação do Traffic Analytics |
| `--format JSON` | Formato de saída dos logs de fluxo |

## Tarefa 3: Usar IP flow verify para testar conectividade

O IP flow verify testa se um pacote é permitido ou negado de/para uma VM com base nas regras de NSG atuais. Isso é fundamental para solução de problemas sem precisar fazer login na VM.

### Azure CLI

```bash
# First, create a test VM
az vm create \
  --resource-group $RG \
  --name vm-test-01 \
  --location $LOCATION \
  --vnet-name vnet-monitored \
  --subnet snet-workload \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys

# Test inbound SSH connectivity (should be allowed by default NSG)
az network watcher test-ip-flow \
  --direction Inbound \
  --protocol TCP \
  --local 10.0.1.4:22 \
  --remote 203.0.113.5:* \
  --vm vm-test-01 \
  --resource-group $RG

# Test inbound HTTP (should be denied if no allow rule exists)
az network watcher test-ip-flow \
  --direction Inbound \
  --protocol TCP \
  --local 10.0.1.4:80 \
  --remote 203.0.113.5:* \
  --vm vm-test-01 \
  --resource-group $RG

# Test outbound internet connectivity
az network watcher test-ip-flow \
  --direction Outbound \
  --protocol TCP \
  --local 10.0.1.4:* \
  --remote 8.8.8.8:443 \
  --vm vm-test-01 \
  --resource-group $RG
```

### Azure PowerShell

```powershell
$nw = Get-AzNetworkWatcher -ResourceGroupName "NetworkWatcherRG" -Name "NetworkWatcher_$location"
$vmId = (Get-AzVM -ResourceGroupName $rg -Name "vm-test-01").Id

# Test inbound SSH
Test-AzNetworkWatcherIPFlow `
  -NetworkWatcher $nw `
  -TargetVirtualMachineId $vmId `
  -Direction Inbound `
  -Protocol TCP `
  -LocalIPAddress "10.0.1.4" `
  -LocalPort "22" `
  -RemoteIPAddress "203.0.113.5" `
  -RemotePort "*"

# Test outbound internet
Test-AzNetworkWatcherIPFlow `
  -NetworkWatcher $nw `
  -TargetVirtualMachineId $vmId `
  -Direction Outbound `
  -Protocol TCP `
  -LocalIPAddress "10.0.1.4" `
  -LocalPort "*" `
  -RemoteIPAddress "8.8.8.8" `
  -RemotePort "443"
```

## Tarefa 4: Visualizar topologia de rede

O Network Watcher pode gerar uma visualização de topologia mostrando recursos e seus relacionamentos.

### Azure CLI

```bash
# Show topology for the resource group
az network watcher show-topology \
  --resource-group $RG \
  --output json

# Show topology filtered to a specific VNet
az network watcher show-topology \
  --resource-group $RG \
  --vnet vnet-monitored \
  --output json
```

### Azure PowerShell

```powershell
$nw = Get-AzNetworkWatcher -ResourceGroupName "NetworkWatcherRG" -Name "NetworkWatcher_$location"

Get-AzNetworkWatcherTopology `
  -NetworkWatcher $nw `
  -TargetResourceGroupName $rg
```

## Tarefa 5: Configurar regras de NSG para o Azure Bastion

O Azure Bastion requer regras de NSG específicas na AzureBastionSubnet. A ausência de qualquer uma dessas regras causará falhas de conectividade do Bastion.

:::warning Regras de NSG obrigatórias para o Bastion
O NSG da AzureBastionSubnet deve permitir tráfego específico do plano de controle e do plano de dados. A ausência de qualquer uma dessas regras causa falhas na implantação ou conexão do Bastion.
:::

### Azure CLI

```bash
# Create AzureBastionSubnet
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-monitored \
  --name AzureBastionSubnet \
  --address-prefixes 10.0.255.0/26

# Create NSG for Bastion subnet
az network nsg create \
  --resource-group $RG \
  --name nsg-bastion \
  --location $LOCATION

# INBOUND RULES for AzureBastionSubnet

# Allow HTTPS from Internet (for user connections to Bastion)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-bastion \
  --name AllowHttpsInbound \
  --priority 120 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes Internet \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 443

# Allow Gateway Manager (for control plane)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-bastion \
  --name AllowGatewayManagerInbound \
  --priority 130 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes GatewayManager \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 443

# Allow Azure Load Balancer health probes
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-bastion \
  --name AllowAzureLoadBalancerInbound \
  --priority 140 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes AzureLoadBalancer \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 443

# Allow Bastion host communication (data plane)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-bastion \
  --name AllowBastionHostCommunication \
  --priority 150 \
  --direction Inbound \
  --access Allow \
  --protocol '*' \
  --source-address-prefixes VirtualNetwork \
  --source-port-ranges '*' \
  --destination-address-prefixes VirtualNetwork \
  --destination-port-ranges 8080 5701

# OUTBOUND RULES for AzureBastionSubnet

# Allow SSH/RDP to target VMs in VNet
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-bastion \
  --name AllowSshRdpOutbound \
  --priority 100 \
  --direction Outbound \
  --access Allow \
  --protocol '*' \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes VirtualNetwork \
  --destination-port-ranges 22 3389

# Allow HTTPS to Azure Cloud (for diagnostics/metrics)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-bastion \
  --name AllowAzureCloudOutbound \
  --priority 110 \
  --direction Outbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes AzureCloud \
  --destination-port-ranges 443

# Allow Bastion host communication outbound
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-bastion \
  --name AllowBastionCommunicationOutbound \
  --priority 120 \
  --direction Outbound \
  --access Allow \
  --protocol '*' \
  --source-address-prefixes VirtualNetwork \
  --source-port-ranges '*' \
  --destination-address-prefixes VirtualNetwork \
  --destination-port-ranges 8080 5701

# Allow HTTP outbound for session information
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-bastion \
  --name AllowHttpOutbound \
  --priority 130 \
  --direction Outbound \
  --access Allow \
  --protocol '*' \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes Internet \
  --destination-port-ranges 80

# Associate NSG with the Bastion subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-monitored \
  --name AzureBastionSubnet \
  --network-security-group nsg-bastion
```

### Azure PowerShell

```powershell
# Create Bastion subnet
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-monitored"
Add-AzVirtualNetworkSubnetConfig `
  -Name "AzureBastionSubnet" `
  -VirtualNetwork $vnet `
  -AddressPrefix "10.0.255.0/26"
$vnet | Set-AzVirtualNetwork

# Create NSG with Bastion-required rules
$bastionInRules = @(
  New-AzNetworkSecurityRuleConfig -Name "AllowHttpsInbound" -Priority 120 `
    -Direction Inbound -Access Allow -Protocol Tcp `
    -SourceAddressPrefix Internet -SourcePortRange '*' `
    -DestinationAddressPrefix '*' -DestinationPortRange 443
  New-AzNetworkSecurityRuleConfig -Name "AllowGatewayManagerInbound" -Priority 130 `
    -Direction Inbound -Access Allow -Protocol Tcp `
    -SourceAddressPrefix GatewayManager -SourcePortRange '*' `
    -DestinationAddressPrefix '*' -DestinationPortRange 443
  New-AzNetworkSecurityRuleConfig -Name "AllowAzureLoadBalancerInbound" -Priority 140 `
    -Direction Inbound -Access Allow -Protocol Tcp `
    -SourceAddressPrefix AzureLoadBalancer -SourcePortRange '*' `
    -DestinationAddressPrefix '*' -DestinationPortRange 443
  New-AzNetworkSecurityRuleConfig -Name "AllowBastionHostCommunication" -Priority 150 `
    -Direction Inbound -Access Allow -Protocol '*' `
    -SourceAddressPrefix VirtualNetwork -SourcePortRange '*' `
    -DestinationAddressPrefix VirtualNetwork -DestinationPortRange @("8080","5701")
  New-AzNetworkSecurityRuleConfig -Name "AllowSshRdpOutbound" -Priority 100 `
    -Direction Outbound -Access Allow -Protocol '*' `
    -SourceAddressPrefix '*' -SourcePortRange '*' `
    -DestinationAddressPrefix VirtualNetwork -DestinationPortRange @("22","3389")
  New-AzNetworkSecurityRuleConfig -Name "AllowAzureCloudOutbound" -Priority 110 `
    -Direction Outbound -Access Allow -Protocol Tcp `
    -SourceAddressPrefix '*' -SourcePortRange '*' `
    -DestinationAddressPrefix AzureCloud -DestinationPortRange 443
  New-AzNetworkSecurityRuleConfig -Name "AllowBastionCommunicationOutbound" -Priority 120 `
    -Direction Outbound -Access Allow -Protocol '*' `
    -SourceAddressPrefix VirtualNetwork -SourcePortRange '*' `
    -DestinationAddressPrefix VirtualNetwork -DestinationPortRange @("8080","5701")
)

$nsgBastion = New-AzNetworkSecurityGroup `
  -ResourceGroupName $rg `
  -Name "nsg-bastion" `
  -Location $location `
  -SecurityRules $bastionInRules

# Associate with Bastion subnet
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-monitored"
$bastionSubnet = Get-AzVirtualNetworkSubnetConfig -VirtualNetwork $vnet -Name "AzureBastionSubnet"
$bastionSubnet.NetworkSecurityGroup = $nsgBastion
$vnet | Set-AzVirtualNetwork
```

### Resumo das regras de NSG do Bastion

| Direção | Regra | Origem | Destino | Porta | Protocolo |
|---------|-------|--------|---------|-------|-----------|
| Entrada | AllowHttpsInbound | Internet | * | 443 | TCP |
| Entrada | AllowGatewayManager | GatewayManager | * | 443 | TCP |
| Entrada | AllowAzureLoadBalancer | AzureLoadBalancer | * | 443 | TCP |
| Entrada | AllowBastionHostComm | VirtualNetwork | VirtualNetwork | 8080, 5701 | Qualquer |
| Saída | AllowSshRdpOutbound | * | VirtualNetwork | 22, 3389 | Qualquer |
| Saída | AllowAzureCloud | * | AzureCloud | 443 | TCP |
| Saída | AllowBastionCommOut | VirtualNetwork | VirtualNetwork | 8080, 5701 | Qualquer |
| Saída | AllowHttpOutbound | * | Internet | 80 | Qualquer |

## Tarefa 6: Analisar entradas dos logs de fluxo

Após habilitar os logs de fluxo e gerar algum tráfego, examine os dados armazenados dos logs de fluxo.

### Azure CLI

```bash
# Check flow log status
az network watcher flow-log show \
  --name flowlog-vnet-monitored \
  --location $LOCATION \
  --query "{name:name, enabled:enabled, targetResourceId:targetResourceId, storageId:storageId, trafficAnalytics:flowAnalyticsConfiguration}" \
  --output json

# Generate traffic to produce flow log entries
# SSH into the test VM or curl from it to create flows
az vm run-command invoke \
  --resource-group $RG \
  --name vm-test-01 \
  --command-id RunShellScript \
  --scripts "curl -s https://www.microsoft.com > /dev/null; curl -s https://azure.microsoft.com > /dev/null"
```

### Formato dos logs de fluxo (versão 2)

Os logs de fluxo versão 2 incluem estado do fluxo e contagem de bytes/pacotes:

```json
{
  "time": "2024-01-15T10:00:00.000Z",
  "macAddress": "00224D11CAFE",
  "flowTuples": [
    "1705312800,10.0.1.4,13.107.42.14,49152,443,T,O,A,B,1024,2048,10,15"
  ]
}
```

Campos na tupla de fluxo: `timestamp,sourceIP,destIP,sourcePort,destPort,protocol,trafficFlow,decision,flowState,packetsSrcToDst,bytesSrcToDst,packetsDstToSrc,bytesDstToSrc`

| Campo | Valores |
|-------|---------|
| Protocolo | T=TCP, U=UDP |
| Fluxo de tráfego | I=Entrada, O=Saída |
| Decisão | A=Permitido, D=Negado |
| Estado do fluxo | B=Início, C=Continuando, E=Fim |

## Quebra e correção

### Cenário 1: Logs de fluxo não aparecem (conta de armazenamento na região errada)

```bash
# Create storage account in a different region than the VNet
az storage account create \
  --resource-group $RG \
  --name "stflowwrongregion" \
  --location westus2 \
  --sku Standard_LRS

# Attempt to create flow log with cross-region storage
az network watcher flow-log create \
  --name flowlog-broken-region \
  --resource-group $RG \
  --location $LOCATION \
  --vnet vnet-monitored \
  --storage-account "stflowwrongregion" \
  --enabled true
```

**Sintoma**: A criação do log de fluxo falha ou é bem-sucedida, mas os logs nunca aparecem na conta de armazenamento.

**Causa raiz**: A conta de armazenamento deve estar na mesma região do recurso de destino (VNet ou NSG). Os dados dos logs de fluxo são gravados diretamente na conta de armazenamento, e gravações entre regiões não são suportadas.

**Correção**: Use uma conta de armazenamento na mesma região da VNet:

```bash
az network watcher flow-log delete \
  --name flowlog-broken-region \
  --location $LOCATION

# Use the correct same-region storage account
az network watcher flow-log create \
  --name flowlog-fixed-region \
  --resource-group $RG \
  --location $LOCATION \
  --vnet vnet-monitored \
  --storage-account $STORAGE \
  --enabled true
```

### Cenário 2: Dados do Traffic Analytics não aparecem

**Sintoma**: Os logs de fluxo estão sendo coletados, mas o painel do Traffic Analytics não mostra dados.

**Causa raiz**: O Traffic Analytics tem um intervalo de processamento (mínimo de 10 minutos). Após a habilitação inicial, pode levar até 30 minutos para os primeiros dados aparecerem. Além disso, o workspace deve estar em uma região suportada.

**Correção**: Verifique a configuração e aguarde o intervalo de processamento:

```bash
# Check Traffic Analytics configuration
az network watcher flow-log show \
  --name flowlog-vnet-monitored \
  --location $LOCATION \
  --query "flowAnalyticsConfiguration.networkWatcherFlowAnalyticsConfiguration.{enabled:enabled,workspaceId:workspaceId,trafficAnalyticsInterval:trafficAnalyticsInterval}"

# If interval is 60 (minutes), reduce to 10 for faster results
az network watcher flow-log update \
  --name flowlog-vnet-monitored \
  --location $LOCATION \
  --traffic-analytics true \
  --interval 10
```

### Cenário 3: Conexão do Bastion falhando (regras de NSG ausentes)

```bash
# Create a Bastion NSG missing the GatewayManager inbound rule
az network nsg create \
  --resource-group $RG \
  --name nsg-bastion-broken \
  --location $LOCATION

# Only add partial rules (missing GatewayManager)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-bastion-broken \
  --name AllowHttpsInbound \
  --priority 120 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes Internet \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 443
```

**Sintoma**: A implantação do Azure Bastion é bem-sucedida, mas as conexões com as VMs expiram ou falham com "Unable to connect."

**Causa raiz**: A regra de entrada da tag de serviço GatewayManager na porta 443 é obrigatória. Sem ela, o plano de controle do Bastion não consegue se comunicar com as instâncias do host Bastion, causando falhas de conexão.

**Correção**: Adicione a regra de entrada do GatewayManager ausente:

```bash
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-bastion-broken \
  --name AllowGatewayManagerInbound \
  --priority 130 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes GatewayManager \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 443
```

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-41-q1",
    question: "What is the key difference between VNet flow logs and NSG flow logs?",
    options: [
      "VNet flow logs capture all flows at the VNet level; NSG flow logs only capture traffic evaluated by a specific NSG ✅",
      "VNet flow logs are free; NSG flow logs are paid",
      "NSG flow logs support version 2 format; VNet flow logs only support version 1",
      "VNet flow logs require Premium tier Network Watcher"
    ],
    correctIndex: 0,
    explanation: "VNet flow logs target the entire virtual network and capture all traffic traversing it, regardless of NSG associations. NSG flow logs only capture traffic evaluated by the specific NSG they are attached to. VNet flow logs are the newer, recommended approach."
  },
  {
    id: "az700-41-q2",
    question: "What are the available processing intervals for Traffic Analytics?",
    options: [
      "10 minutes or 60 minutes ✅",
      "1 minute or 5 minutes",
      "5 minutes or 30 minutes",
      "15 minutes or 60 minutes"
    ],
    correctIndex: 0,
    explanation: "Traffic Analytics supports two processing intervals: 10 minutes (for near-real-time analysis at higher cost) and 60 minutes (default, more cost-effective). The 10-minute interval processes flow logs more frequently, providing faster insights."
  },
  {
    id: "az700-41-q3",
    question: "Which NSG inbound rule is REQUIRED for Azure Bastion to function on the AzureBastionSubnet?",
    options: [
      "Allow TCP 443 from GatewayManager service tag ✅",
      "Allow TCP 22 from Internet",
      "Allow TCP 3389 from VirtualNetwork",
      "Allow UDP 443 from AzureCloud"
    ],
    correctIndex: 0,
    explanation: "The GatewayManager service tag inbound rule on TCP port 443 is mandatory for Bastion control plane communication. Without it, Bastion cannot manage its host instances, causing all connection attempts to fail."
  },
  {
    id: "az700-41-q4",
    question: "A flow log is configured but no data appears in the storage account. The VNet is in East US 2 and the storage account is in West US 2. What is the issue?",
    options: [
      "The storage account must be in the same region as the monitored resource ✅",
      "Flow logs require a Premium storage account",
      "The storage account needs a private endpoint to the VNet",
      "Cross-region flow logs require Network Watcher Premium tier"
    ],
    correctIndex: 0,
    explanation: "Flow log storage accounts must be in the same Azure region as the target resource (VNet or NSG). Cross-region storage is not supported for flow log data writes."
  },
  {
    id: "az700-41-q5",
    question: "In a version 2 flow log tuple, what does the flow state 'B' indicate?",
    options: [
      "Begin - this is the first packet observed for this flow ✅",
      "Blocked - the flow was denied by an NSG rule",
      "Bidirectional - traffic flows in both directions",
      "Bytes - the tuple contains byte count data"
    ],
    correctIndex: 0,
    explanation: "Version 2 flow logs include flow state tracking. 'B' means Begin (first packet), 'C' means Continuing (ongoing flow), and 'E' means End (flow terminated). This enables analysis of flow duration and connection patterns."
  },
  {
    id: "az700-41-q6",
    question: "Which command tests whether a specific packet would be allowed or denied by NSG rules applied to a VM?",
    options: [
      "az network watcher test-ip-flow ✅",
      "az network watcher show-topology",
      "az network nsg rule list",
      "az network watcher flow-log show"
    ],
    correctIndex: 0,
    explanation: "The 'az network watcher test-ip-flow' command evaluates NSG rules to determine if a packet with specific source/destination IP, port, and protocol would be allowed or denied. It requires direction (Inbound/Outbound), local and remote addresses with ports, protocol, and the target VM."
  }
]} />

## Limpeza

Remova todos os recursos criados neste desafio.

### Azure CLI

```bash
az group delete --name rg-flowlogs-challenge --yes --no-wait
```

### Azure PowerShell

```powershell
Remove-AzResourceGroup -Name "rg-flowlogs-challenge" -Force -AsJob
```

:::tip Verificar limpeza
```bash
az group show --name rg-flowlogs-challenge 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists"
```
:::

:::warning Custo
Este desafio incorre em custos de gravações na conta de armazenamento (~$0,02/GB armazenado), ingestão do Log Analytics (~$2,76/GB) e a VM de teste (~$0,01/hora para Standard_B1s). O processamento do Traffic Analytics adiciona custo mínimo. Custo total estimado para uma sessão de laboratório de 1 hora: ~$0,10. Exclua os recursos imediatamente após concluir o desafio.
:::
