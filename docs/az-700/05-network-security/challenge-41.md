---
sidebar_position: 2
title: "Challenge 41: VNet flow logs and traffic analytics"
sidebar_label: "Challenge 41"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 41: VNet flow logs and traffic analytics

:::info Estimated time and cost
**45-60 minutes** | **~$0.10/hour** (storage + Log Analytics ingestion) | **Exam weight: 10-15%**
:::

## Scenario

Northwind Traders' compliance team requires full visibility into all network traffic flowing through their Azure environment. They need to detect anomalous patterns, verify that microsegmentation rules are working as intended, and produce audit reports showing traffic flows between tiers. The security operations center also requires Azure Bastion for secure VM access without exposing RDP/SSH ports to the internet.

You will enable VNet flow logs (the recommended replacement for NSG flow logs), configure Traffic Analytics for intelligent insights, use Network Watcher diagnostic tools to verify connectivity, and configure the required NSG rules for Azure Bastion.

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Configure VNet flow logs | High |
| Enable and configure Traffic Analytics | Medium |
| Use Network Watcher IP flow verify and connection troubleshoot | High |
| Configure NSG rules for Azure Bastion | Medium |
| Analyze flow log data with Log Analytics | Medium |

## Prerequisites

- Azure subscription with Contributor role
- Azure CLI 2.60+ or Azure PowerShell Az 12.0+
- Existing VNet (use the one from Challenge 40, or create a new one)
- Network Watcher enabled in your region (auto-enabled for most subscriptions)

## Task 1: Create supporting resources (storage account and Log Analytics workspace)

Flow logs require a storage account in the same region as the target resource. Traffic Analytics additionally requires a Log Analytics workspace.

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

## Task 2: Enable VNet flow logs with Traffic Analytics

VNet flow logs are the current recommended approach, replacing the older NSG flow logs. They capture flow information at the VNet level, providing broader visibility including traffic between subnets within the same VNet.

:::warning VNet flow logs vs NSG flow logs
VNet flow logs (using `--vnet`) are the newer, recommended method. NSG flow logs (using `--nsg`) are legacy. VNet flow logs capture all flows traversing the VNet, while NSG flow logs only capture traffic evaluated by a specific NSG. For the AZ-700 exam, understand both but prefer VNet flow logs for new deployments.
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

### Key parameters explained

| Parameter | Purpose |
|-----------|---------|
| `--vnet` | Targets a VNet (replaces `--nsg` for legacy NSG flow logs) |
| `--log-version 2` | Version 2 includes byte/packet counts and flow state |
| `--traffic-analytics true` | Enables Traffic Analytics processing |
| `--workspace` | Log Analytics workspace for Traffic Analytics aggregation |
| `--format JSON` | Flow log output format |

## Task 3: Use IP flow verify to test connectivity

IP flow verify tests whether a packet is allowed or denied to/from a VM based on current NSG rules. This is critical for troubleshooting without needing to log into the VM.

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

## Task 4: View network topology

Network Watcher can generate a topology view showing resources and their relationships.

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

## Task 5: Configure NSG rules for Azure Bastion

Azure Bastion requires specific NSG rules on the AzureBastionSubnet. Missing any of these rules will cause Bastion connectivity failures.

:::warning Required Bastion NSG rules
The AzureBastionSubnet NSG must allow specific control plane and data plane traffic. Missing any of these rules causes Bastion deployment or connection failures.
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

### Bastion NSG rules summary

| Direction | Rule | Source | Destination | Port | Protocol |
|-----------|------|--------|-------------|------|----------|
| Inbound | AllowHttpsInbound | Internet | * | 443 | TCP |
| Inbound | AllowGatewayManager | GatewayManager | * | 443 | TCP |
| Inbound | AllowAzureLoadBalancer | AzureLoadBalancer | * | 443 | TCP |
| Inbound | AllowBastionHostComm | VirtualNetwork | VirtualNetwork | 8080, 5701 | Any |
| Outbound | AllowSshRdpOutbound | * | VirtualNetwork | 22, 3389 | Any |
| Outbound | AllowAzureCloud | * | AzureCloud | 443 | TCP |
| Outbound | AllowBastionCommOut | VirtualNetwork | VirtualNetwork | 8080, 5701 | Any |
| Outbound | AllowHttpOutbound | * | Internet | 80 | Any |

## Task 6: Analyze flow log entries

After enabling flow logs and generating some traffic, examine the stored flow log data.

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

### Flow log format (version 2)

Version 2 flow logs include flow state and byte/packet counts:

```json
{
  "time": "2024-01-15T10:00:00.000Z",
  "macAddress": "00224D11CAFE",
  "flowTuples": [
    "1705312800,10.0.1.4,13.107.42.14,49152,443,T,O,A,B,1024,2048,10,15"
  ]
}
```

Fields in flow tuple: `timestamp,sourceIP,destIP,sourcePort,destPort,protocol,trafficFlow,decision,flowState,packetsSrcToDst,bytesSrcToDst,packetsDstToSrc,bytesDstToSrc`

| Field | Values |
|-------|--------|
| Protocol | T=TCP, U=UDP |
| Traffic Flow | I=Inbound, O=Outbound |
| Decision | A=Allowed, D=Denied |
| Flow State | B=Begin, C=Continuing, E=End |

## Break & fix

### Scenario 1: Flow logs not appearing (storage account in wrong region)

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

**Symptom**: The flow log creation fails or succeeds but logs never appear in the storage account.

**Root cause**: The storage account must be in the same region as the target resource (VNet or NSG). Flow log data is written directly to the storage account, and cross-region writes are not supported.

**Fix**: Use a storage account in the same region as the VNet:

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

### Scenario 2: Traffic Analytics data not appearing

**Symptom**: Flow logs are being collected but Traffic Analytics dashboard shows no data.

**Root cause**: Traffic Analytics has a processing interval (minimum 10 minutes). After initial enablement, it can take up to 30 minutes for the first data to appear. Additionally, the workspace must be in a supported region.

**Fix**: Verify the configuration and wait for the processing interval:

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

### Scenario 3: Bastion connection failing (missing NSG rules)

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

**Symptom**: Azure Bastion deployment succeeds but connections to VMs time out or fail with "Unable to connect."

**Root cause**: The GatewayManager service tag inbound rule on port 443 is mandatory. Without it, the Bastion control plane cannot communicate with the Bastion host instances, causing connection failures.

**Fix**: Add the missing GatewayManager inbound rule:

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

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-41-q1",
    question: "What is the key difference between VNet flow logs and NSG flow logs?",
    options: [
      "VNet flow logs capture all flows at the VNet level; NSG flow logs only capture traffic evaluated by a specific NSG \u2705",
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
      "10 minutes or 60 minutes \u2705",
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
      "Allow TCP 443 from GatewayManager service tag \u2705",
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
      "The storage account must be in the same region as the monitored resource \u2705",
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
      "Begin - this is the first packet observed for this flow \u2705",
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
      "az network watcher test-ip-flow \u2705",
      "az network watcher show-topology",
      "az network nsg rule list",
      "az network watcher flow-log show"
    ],
    correctIndex: 0,
    explanation: "The 'az network watcher test-ip-flow' command evaluates NSG rules to determine if a packet with specific source/destination IP, port, and protocol would be allowed or denied. It requires direction (Inbound/Outbound), local and remote addresses with ports, protocol, and the target VM."
  }
]} />

## Cleanup

Remove all resources created in this challenge.

### Azure CLI

```bash
az group delete --name rg-flowlogs-challenge --yes --no-wait
```

### Azure PowerShell

```powershell
Remove-AzResourceGroup -Name "rg-flowlogs-challenge" -Force -AsJob
```

:::tip Verify cleanup
```bash
az group show --name rg-flowlogs-challenge 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists"
```
:::

:::warning Cost
This challenge incurs costs from storage account writes (~$0.02/GB stored), Log Analytics ingestion (~$2.76/GB), and the test VM (~$0.01/hour for Standard_B1s). Traffic Analytics processing adds minimal cost. Total estimated cost for a 1-hour lab session: ~$0.10. Delete resources promptly after completing the challenge.
:::
