---
sidebar_position: 1
title: "Challenge 40: NSG rules and application security groups"
sidebar_label: "Challenge 40"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 40: NSG rules and application security groups

:::info Estimated time and cost
**60-90 minutes** | **~$0.00** (NSGs and ASGs are free) | **Exam weight: 15-20%**
:::

## Scenario

Northwind Traders is deploying a three-tier application (web, application, database) in Azure. The security team requires microsegmentation between tiers so that each layer communicates only with its adjacent layer. Specifically:

- The web tier accepts HTTP (80) and HTTPS (443) from the internet
- The application tier accepts traffic only from the web tier on port 8080
- The database tier accepts traffic only from the application tier on port 1433
- No tier should be able to communicate directly with a non-adjacent tier (web cannot reach DB directly)

You must implement this using Network Security Groups with Application Security Groups to create role-based rules that remain valid even as VMs scale in and out.

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Create and configure network security groups (NSGs) | High |
| Create and configure application security groups (ASGs) | High |
| Associate NSGs to subnets and network interfaces | High |
| Configure NSG rules with service tags and ASGs | High |
| Evaluate effective security rules | Medium |
| Understand default security rules and rule priority | Medium |

## Prerequisites

- Azure subscription with Contributor role
- Azure CLI 2.60+ or Azure PowerShell Az 12.0+
- Basic understanding of TCP/IP and port numbers

## Task 1: Create the VNet and subnets for the three-tier architecture

### Azure CLI

```bash
# Set variables
RG="rg-nsg-challenge"
LOCATION="eastus2"

# Create resource group
az group create --name $RG --location $LOCATION

# Create VNet with web subnet
az network vnet create \
  --resource-group $RG \
  --name vnet-threetier \
  --location $LOCATION \
  --address-prefixes 10.0.0.0/16 \
  --subnet-name snet-web \
  --subnet-prefixes 10.0.1.0/24

# Add application tier subnet
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-threetier \
  --name snet-app \
  --address-prefixes 10.0.2.0/24

# Add database tier subnet
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-threetier \
  --name snet-db \
  --address-prefixes 10.0.3.0/24
```

### Azure PowerShell

```powershell
# Set variables
$rg = "rg-nsg-challenge"
$location = "eastus2"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Define subnets
$webSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-web" -AddressPrefix "10.0.1.0/24"
$appSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-app" -AddressPrefix "10.0.2.0/24"
$dbSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-db" -AddressPrefix "10.0.3.0/24"

# Create VNet with all subnets
New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name "vnet-threetier" `
  -Location $location `
  -AddressPrefix "10.0.0.0/16" `
  -Subnet $webSubnet, $appSubnet, $dbSubnet
```

## Task 2: Create application security groups

Application Security Groups allow you to group VM NICs by role. Rules reference ASGs instead of IP addresses, so when you add a new web server, it automatically inherits the correct security rules simply by assigning its NIC to the ASG.

:::warning ASG constraint
All NICs assigned to the same ASG must exist in the same virtual network. You cannot use an ASG in a rule if the source/destination NIC is in a different VNet.
:::

### Azure CLI

```bash
# Create ASG for each tier
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
```

### Azure PowerShell

```powershell
# Create ASGs for each tier
New-AzApplicationSecurityGroup `
  -ResourceGroupName $rg `
  -Name "asg-web" `
  -Location $location

New-AzApplicationSecurityGroup `
  -ResourceGroupName $rg `
  -Name "asg-app" `
  -Location $location

New-AzApplicationSecurityGroup `
  -ResourceGroupName $rg `
  -Name "asg-db" `
  -Location $location
```

## Task 3: Create NSGs with rules using ASGs and service tags

NSG rules are evaluated by priority (lowest number = highest priority). Azure has default rules at priority 65000-65500 that allow VNet-to-VNet and outbound internet by default. Your custom rules must use priorities between 100-4096.

Rule processing order:
1. Inbound: NSG on subnet first, then NSG on NIC
2. Outbound: NSG on NIC first, then NSG on subnet
3. Lower priority number wins (evaluated first)
4. Once a rule matches, evaluation stops

### Azure CLI

```bash
# Create NSG for the web tier
az network nsg create \
  --resource-group $RG \
  --name nsg-web \
  --location $LOCATION

# Allow HTTP from Internet to web ASG
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name Allow-HTTP-Inbound \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes Internet \
  --source-port-ranges '*' \
  --destination-asgs asg-web \
  --destination-port-ranges 80

# Allow HTTPS from Internet to web ASG
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name Allow-HTTPS-Inbound \
  --priority 110 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes Internet \
  --source-port-ranges '*' \
  --destination-asgs asg-web \
  --destination-port-ranges 443

# Allow Azure Load Balancer health probes
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name Allow-AzureLB-Inbound \
  --priority 120 \
  --direction Inbound \
  --access Allow \
  --protocol '*' \
  --source-address-prefixes AzureLoadBalancer \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges '*'

# Deny all other inbound traffic
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name Deny-All-Inbound \
  --priority 4096 \
  --direction Inbound \
  --access Deny \
  --protocol '*' \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges '*'

# Create NSG for the app tier
az network nsg create \
  --resource-group $RG \
  --name nsg-app \
  --location $LOCATION

# Allow port 8080 from web ASG to app ASG only
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-app \
  --name Allow-Web-To-App \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-web \
  --source-port-ranges '*' \
  --destination-asgs asg-app \
  --destination-port-ranges 8080

# Deny all other inbound
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-app \
  --name Deny-All-Inbound \
  --priority 4096 \
  --direction Inbound \
  --access Deny \
  --protocol '*' \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges '*'

# Create NSG for the database tier
az network nsg create \
  --resource-group $RG \
  --name nsg-db \
  --location $LOCATION

# Allow SQL from app ASG to db ASG only
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-db \
  --name Allow-App-To-DB \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-app \
  --source-port-ranges '*' \
  --destination-asgs asg-db \
  --destination-port-ranges 1433

# Deny all other inbound
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-db \
  --name Deny-All-Inbound \
  --priority 4096 \
  --direction Inbound \
  --access Deny \
  --protocol '*' \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges '*'
```

### Azure PowerShell

```powershell
# Get ASG references
$asgWeb = Get-AzApplicationSecurityGroup -ResourceGroupName $rg -Name "asg-web"
$asgApp = Get-AzApplicationSecurityGroup -ResourceGroupName $rg -Name "asg-app"
$asgDb = Get-AzApplicationSecurityGroup -ResourceGroupName $rg -Name "asg-db"

# Web tier NSG rules
$webRule1 = New-AzNetworkSecurityRuleConfig `
  -Name "Allow-HTTP-Inbound" `
  -Priority 100 `
  -Direction Inbound `
  -Access Allow `
  -Protocol Tcp `
  -SourceAddressPrefix Internet `
  -SourcePortRange '*' `
  -DestinationApplicationSecurityGroupId $asgWeb.Id `
  -DestinationPortRange 80

$webRule2 = New-AzNetworkSecurityRuleConfig `
  -Name "Allow-HTTPS-Inbound" `
  -Priority 110 `
  -Direction Inbound `
  -Access Allow `
  -Protocol Tcp `
  -SourceAddressPrefix Internet `
  -SourcePortRange '*' `
  -DestinationApplicationSecurityGroupId $asgWeb.Id `
  -DestinationPortRange 443

$webRule3 = New-AzNetworkSecurityRuleConfig `
  -Name "Deny-All-Inbound" `
  -Priority 4096 `
  -Direction Inbound `
  -Access Deny `
  -Protocol '*' `
  -SourceAddressPrefix '*' `
  -SourcePortRange '*' `
  -DestinationAddressPrefix '*' `
  -DestinationPortRange '*'

New-AzNetworkSecurityGroup `
  -ResourceGroupName $rg `
  -Name "nsg-web" `
  -Location $location `
  -SecurityRules $webRule1, $webRule2, $webRule3

# App tier NSG rules
$appRule1 = New-AzNetworkSecurityRuleConfig `
  -Name "Allow-Web-To-App" `
  -Priority 100 `
  -Direction Inbound `
  -Access Allow `
  -Protocol Tcp `
  -SourceApplicationSecurityGroupId $asgWeb.Id `
  -SourcePortRange '*' `
  -DestinationApplicationSecurityGroupId $asgApp.Id `
  -DestinationPortRange 8080

$appRule2 = New-AzNetworkSecurityRuleConfig `
  -Name "Deny-All-Inbound" `
  -Priority 4096 `
  -Direction Inbound `
  -Access Deny `
  -Protocol '*' `
  -SourceAddressPrefix '*' `
  -SourcePortRange '*' `
  -DestinationAddressPrefix '*' `
  -DestinationPortRange '*'

New-AzNetworkSecurityGroup `
  -ResourceGroupName $rg `
  -Name "nsg-app" `
  -Location $location `
  -SecurityRules $appRule1, $appRule2

# DB tier NSG rules
$dbRule1 = New-AzNetworkSecurityRuleConfig `
  -Name "Allow-App-To-DB" `
  -Priority 100 `
  -Direction Inbound `
  -Access Allow `
  -Protocol Tcp `
  -SourceApplicationSecurityGroupId $asgApp.Id `
  -SourcePortRange '*' `
  -DestinationApplicationSecurityGroupId $asgDb.Id `
  -DestinationPortRange 1433

$dbRule2 = New-AzNetworkSecurityRuleConfig `
  -Name "Deny-All-Inbound" `
  -Priority 4096 `
  -Direction Inbound `
  -Access Deny `
  -Protocol '*' `
  -SourceAddressPrefix '*' `
  -SourcePortRange '*' `
  -DestinationAddressPrefix '*' `
  -DestinationPortRange '*'

New-AzNetworkSecurityGroup `
  -ResourceGroupName $rg `
  -Name "nsg-db" `
  -Location $location `
  -SecurityRules $dbRule1, $dbRule2
```

## Task 4: Associate NSGs to subnets

### Azure CLI

```bash
# Associate NSGs with their respective subnets
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-threetier \
  --name snet-web \
  --network-security-group nsg-web

az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-threetier \
  --name snet-app \
  --network-security-group nsg-app

az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-threetier \
  --name snet-db \
  --network-security-group nsg-db
```

### Azure PowerShell

```powershell
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-threetier"
$nsgWeb = Get-AzNetworkSecurityGroup -ResourceGroupName $rg -Name "nsg-web"
$nsgApp = Get-AzNetworkSecurityGroup -ResourceGroupName $rg -Name "nsg-app"
$nsgDb = Get-AzNetworkSecurityGroup -ResourceGroupName $rg -Name "nsg-db"

# Associate NSG to web subnet
$webSubnetConfig = Get-AzVirtualNetworkSubnetConfig -VirtualNetwork $vnet -Name "snet-web"
$webSubnetConfig.NetworkSecurityGroup = $nsgWeb
Set-AzVirtualNetwork -VirtualNetwork $vnet

# Refresh VNet reference and associate app subnet
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-threetier"
$appSubnetConfig = Get-AzVirtualNetworkSubnetConfig -VirtualNetwork $vnet -Name "snet-app"
$appSubnetConfig.NetworkSecurityGroup = $nsgApp
Set-AzVirtualNetwork -VirtualNetwork $vnet

# Refresh and associate db subnet
$vnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name "vnet-threetier"
$dbSubnetConfig = Get-AzVirtualNetworkSubnetConfig -VirtualNetwork $vnet -Name "snet-db"
$dbSubnetConfig.NetworkSecurityGroup = $nsgDb
Set-AzVirtualNetwork -VirtualNetwork $vnet
```

## Task 5: Create VMs and assign NICs to ASGs

Create one VM per tier and assign the NIC to the corresponding ASG. The `--asgs` parameter on `az network nic create` handles ASG assignment at NIC creation time.

### Azure CLI

```bash
# Create web tier VM
az vm create \
  --resource-group $RG \
  --name vm-web-01 \
  --location $LOCATION \
  --vnet-name vnet-threetier \
  --subnet snet-web \
  --nsg "" \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --no-wait

# Create app tier VM
az vm create \
  --resource-group $RG \
  --name vm-app-01 \
  --location $LOCATION \
  --vnet-name vnet-threetier \
  --subnet snet-app \
  --nsg "" \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --no-wait

# Create db tier VM
az vm create \
  --resource-group $RG \
  --name vm-db-01 \
  --location $LOCATION \
  --vnet-name vnet-threetier \
  --subnet snet-db \
  --nsg "" \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys

# Assign NICs to their ASGs
# Get NIC names
WEB_NIC=$(az vm show --resource-group $RG --name vm-web-01 \
  --query "networkProfile.networkInterfaces[0].id" --output tsv | xargs basename)
APP_NIC=$(az vm show --resource-group $RG --name vm-app-01 \
  --query "networkProfile.networkInterfaces[0].id" --output tsv | xargs basename)
DB_NIC=$(az vm show --resource-group $RG --name vm-db-01 \
  --query "networkProfile.networkInterfaces[0].id" --output tsv | xargs basename)

# Update NICs with ASG membership
az network nic ip-config update \
  --resource-group $RG \
  --nic-name $WEB_NIC \
  --name ipconfig1 \
  --application-security-groups asg-web

az network nic ip-config update \
  --resource-group $RG \
  --nic-name $APP_NIC \
  --name ipconfig1 \
  --application-security-groups asg-app

az network nic ip-config update \
  --resource-group $RG \
  --nic-name $DB_NIC \
  --name ipconfig1 \
  --application-security-groups asg-db
```

### Azure PowerShell

```powershell
# After VM creation, assign NICs to ASGs
$webNic = Get-AzNetworkInterface -ResourceGroupName $rg | Where-Object { $_.Name -like "*web*" }
$appNic = Get-AzNetworkInterface -ResourceGroupName $rg | Where-Object { $_.Name -like "*app*" }
$dbNic = Get-AzNetworkInterface -ResourceGroupName $rg | Where-Object { $_.Name -like "*db*" }

$asgWeb = Get-AzApplicationSecurityGroup -ResourceGroupName $rg -Name "asg-web"
$asgApp = Get-AzApplicationSecurityGroup -ResourceGroupName $rg -Name "asg-app"
$asgDb = Get-AzApplicationSecurityGroup -ResourceGroupName $rg -Name "asg-db"

# Assign web NIC to web ASG
$webNic.IpConfigurations[0].ApplicationSecurityGroups = @($asgWeb)
$webNic | Set-AzNetworkInterface

# Assign app NIC to app ASG
$appNic.IpConfigurations[0].ApplicationSecurityGroups = @($asgApp)
$appNic | Set-AzNetworkInterface

# Assign db NIC to db ASG
$dbNic.IpConfigurations[0].ApplicationSecurityGroups = @($asgDb)
$dbNic | Set-AzNetworkInterface
```

## Task 6: View effective security rules

Effective security rules show the combined result of all NSGs applied to a NIC (both subnet-level and NIC-level), including default rules.

### Azure CLI

```bash
# View effective NSG rules for the web VM NIC
az network nic list-effective-nsg \
  --resource-group $RG \
  --name $WEB_NIC \
  --output table

# View effective NSG rules for the app VM NIC
az network nic list-effective-nsg \
  --resource-group $RG \
  --name $APP_NIC \
  --output table

# Use IP flow verify to test connectivity (web to app on 8080)
az network watcher test-ip-flow \
  --direction Outbound \
  --protocol TCP \
  --local 10.0.1.4:* \
  --remote 10.0.2.4:8080 \
  --vm vm-web-01 \
  --resource-group $RG

# Test blocked path (web directly to db on 1433 - should be denied)
az network watcher test-ip-flow \
  --direction Outbound \
  --protocol TCP \
  --local 10.0.1.4:* \
  --remote 10.0.3.4:1433 \
  --vm vm-web-01 \
  --resource-group $RG
```

### Azure PowerShell

```powershell
# View effective NSG rules
Get-AzEffectiveNetworkSecurityGroup `
  -NetworkInterfaceName $webNic.Name `
  -ResourceGroupName $rg

# Test IP flow (requires Network Watcher enabled)
Test-AzNetworkWatcherIPFlow `
  -NetworkWatcher (Get-AzNetworkWatcher -ResourceGroupName "NetworkWatcherRG") `
  -TargetVirtualMachineId (Get-AzVM -ResourceGroupName $rg -Name "vm-web-01").Id `
  -Direction Outbound `
  -Protocol TCP `
  -LocalIPAddress "10.0.1.4" `
  -LocalPort "*" `
  -RemoteIPAddress "10.0.2.4" `
  -RemotePort "8080"
```

### Portal steps

1. Navigate to **Virtual machines** > select **vm-web-01**
2. Under **Networking** > **Network settings**, click **Effective security rules**
3. Review the combined list of rules from subnet NSG and any NIC-level NSG
4. Use the **Connection troubleshoot** tab to test connectivity between VMs

## Break and fix

### Scenario 1: Rule priority conflict (deny evaluated before allow)

```bash
# Create a deny-all rule at a LOW priority number (evaluated first)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name Deny-All-Inbound \
  --priority 200 \
  --direction Inbound \
  --access Deny \
  --protocol '*' \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges '*'

# Create an allow rule for SSH at a HIGHER priority number (evaluated after the deny)
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name Allow-SSH-Broken \
  --priority 4095 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 22
```

**Symptom**: SSH traffic is denied even though an Allow rule exists for port 22.

**Root cause**: The Deny-All-Inbound rule has priority 200 and the Allow-SSH-Broken rule has priority 4095. Because lower priority numbers are evaluated first, the Deny rule at 200 matches all inbound traffic and blocks it before the Allow rule at 4095 is ever reached.

**Fix**: Change the Allow-SSH rule to a priority number lower than the Deny rule (200) so it is evaluated first, while avoiding conflicts with existing rules at priorities 100 and 110:

```bash
az network nsg rule delete \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name Allow-SSH-Broken

az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name Allow-SSH-Fixed \
  --priority 150 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-asgs asg-web \
  --destination-port-ranges 22
```

### Scenario 2: ASG used across VNets (not supported)

```bash
# Create a second VNet
az network vnet create \
  --resource-group $RG \
  --name vnet-separate \
  --location $LOCATION \
  --address-prefixes 10.1.0.0/16 \
  --subnet-name snet-other \
  --subnet-prefixes 10.1.1.0/24

# Create a NIC in the second VNet and try to assign it to the same ASG
az network nic create \
  --resource-group $RG \
  --name nic-crossvnet \
  --vnet-name vnet-separate \
  --subnet snet-other \
  --application-security-groups asg-web
```

**Symptom**: The command fails with an error indicating the ASG and NIC must be in the same virtual network.

**Root cause**: Application Security Groups have a VNet-scope constraint. All NICs assigned to a given ASG must reside in the same virtual network. This is a platform limitation by design.

**Fix**: Create a separate ASG in the second VNet if you need the same logical grouping:

```bash
az network asg create \
  --resource-group $RG \
  --name asg-web-vnet2 \
  --location $LOCATION

az network nic create \
  --resource-group $RG \
  --name nic-crossvnet \
  --vnet-name vnet-separate \
  --subnet snet-other \
  --application-security-groups asg-web-vnet2
```

### Scenario 3: Misunderstanding stateful behavior

```bash
# A student adds an explicit outbound deny rule blocking all traffic from DB tier
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-db \
  --name Deny-All-Outbound \
  --priority 4000 \
  --direction Outbound \
  --access Deny \
  --protocol '*' \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges '*'
```

**Symptom**: The student expects that existing SQL connections from app to DB will break because return traffic (DB to app) is now blocked.

**Root cause**: NSGs are stateful. Once an inbound connection is allowed (app to DB on 1433), the return traffic for that established connection is automatically allowed regardless of outbound rules. The outbound deny rule will only affect NEW outbound connections initiated by the DB tier.

**Lesson**: You do not need explicit outbound allow rules for return traffic on established connections. The stateful tracking handles this automatically.

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-40-q1",
    question: "NSG rules are evaluated in order of priority. Which statement is correct about rule evaluation?",
    options: [
      "Lower priority number = evaluated first; once matched, evaluation stops \u2705",
      "Higher priority number = evaluated first; all rules are always evaluated",
      "Rules are evaluated alphabetically by name",
      "Inbound and outbound rules are evaluated simultaneously"
    ],
    correctIndex: 0,
    explanation: "NSG rules are processed in priority order from lowest number (100) to highest (4096). The first matching rule determines the action (Allow or Deny), and no further rules are evaluated for that traffic flow."
  },
  {
    id: "az700-40-q2",
    question: "You create an ASG named 'asg-web' in VNet-A. A colleague tries to assign a NIC in VNet-B to this ASG. What happens?",
    options: [
      "The operation fails because ASG members must be in the same VNet \u2705",
      "It succeeds but the ASG rules are not enforced cross-VNet",
      "It succeeds and rules are enforced via VNet peering",
      "The operation requires enabling ASG global peering first"
    ],
    correctIndex: 0,
    explanation: "Application Security Groups are VNet-scoped. All NICs assigned to an ASG must reside in the same virtual network. This is a hard platform constraint that cannot be overridden."
  },
  {
    id: "az700-40-q3",
    question: "A VM has an NSG on its subnet that allows TCP/443 inbound and an NSG on its NIC that denies all inbound. What is the result for HTTPS traffic?",
    options: [
      "Traffic is denied because both the subnet NSG and NIC NSG must allow it \u2705",
      "Traffic is allowed because the subnet NSG allow rule takes precedence",
      "Traffic is allowed because the NIC NSG is evaluated before the subnet NSG",
      "Traffic is denied but only if the VM has no public IP"
    ],
    correctIndex: 0,
    explanation: "For inbound traffic, the subnet-level NSG is evaluated first, then the NIC-level NSG. Traffic must be allowed by BOTH NSGs to reach the VM. If either NSG denies the traffic, it is dropped."
  },
  {
    id: "az700-40-q4",
    question: "Which of the following are default NSG rules that cannot be deleted?",
    options: [
      "AllowVNetInBound, AllowAzureLoadBalancerInBound, DenyAllInBound \u2705",
      "AllowInternetInBound, AllowVNetOutBound, DenyAllOutBound",
      "AllowSSHInBound, AllowRDPInBound, DenyAllInBound",
      "AllowVNetInBound, AllowInternetOutBound, AllowAzureLoadBalancerInBound"
    ],
    correctIndex: 0,
    explanation: "Every NSG includes three default inbound rules (AllowVNetInBound at 65000, AllowAzureLoadBalancerInBound at 65001, DenyAllInBound at 65500) and three default outbound rules (AllowVNetOutBound at 65000, AllowInternetOutBound at 65001, DenyAllOutBound at 65500). These cannot be deleted but can be overridden by higher-priority custom rules."
  },
  {
    id: "az700-40-q5",
    question: "An inbound allow rule permits TCP/1433 from the app tier to the database tier. Do you need a separate outbound rule on the database NSG for return traffic?",
    options: [
      "No, NSGs are stateful and return traffic is automatically allowed \u2705",
      "Yes, you must create an explicit outbound allow for port 1433",
      "Yes, but only if the source port is ephemeral",
      "No, but only because default outbound rules already allow VNet traffic"
    ],
    correctIndex: 0,
    explanation: "NSGs are stateful. When an inbound connection is permitted, the return traffic for that established session is automatically allowed without needing a separate outbound rule. This applies regardless of any outbound deny rules."
  },
  {
    id: "az700-40-q6",
    question: "With augmented security rules, what is the maximum number of rules per NSG?",
    options: [
      "1,000 (up from 200 with standard rules) \u2705",
      "500",
      "5,000",
      "200 (same as standard)"
    ],
    correctIndex: 0,
    explanation: "Augmented security rules allow combining service tags and ASGs in the same rule and support up to 1,000 rules per NSG (versus the default 200). You can request an increase up to 1,000 through Azure support or subscription limits."
  }
]} />

## Cleanup

Remove all resources created in this challenge.

### Azure CLI

```bash
az group delete --name rg-nsg-challenge --yes --no-wait
```

### Azure PowerShell

```powershell
Remove-AzResourceGroup -Name "rg-nsg-challenge" -Force -AsJob
```

:::tip Verify cleanup
After a few minutes, confirm deletion:
```bash
az group show --name rg-nsg-challenge 2>&1 | grep -q "not found" && echo "Deleted" || echo "Still exists"
```
:::

:::warning Cost
NSGs and ASGs are free resources. The only costs in this challenge come from the VMs created in Task 5. If you skip VM creation and focus only on NSG/ASG configuration, the cost is $0.00. If you create the VMs, expect approximately $0.03/hour for three Standard_B1s instances.
:::
