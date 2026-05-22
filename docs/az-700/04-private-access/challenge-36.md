---
sidebar_position: 3
title: "Challenge 36: Private Link Service (Provider Side)"
sidebar_label: "Challenge 36"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 36: Private Link service (provider side)

:::info Estimated time and cost

**60-75 minutes** | **~$0.05/h** | **Exam weight: 10-15%**

:::

## Scenario

NovaTech Solutions, an ISV company, has built an internal API platform behind an Azure Standard Load Balancer. They want to offer this API service to external customers (consumers) using Azure Private Link, so consumers can access NovaTech's service through a private endpoint in their own virtual networks without any exposure to the public internet. You are the network engineer responsible for configuring the provider-side Private Link Service, managing NAT IP addresses, configuring visibility and auto-approval policies, and handling consumer connection approvals.

**Architecture:**

<div style={{textAlign: 'center', margin: '20px 0'}}>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 340" style={{maxWidth: '650px', height: 'auto'}} font-family="Segoe UI, Arial, sans-serif">
  <defs>
    <marker id="arrow-ch36" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#666"/>
    </marker>
  </defs>
  <!-- PROVIDER VNet -->
  <rect x="15" y="10" width="295" height="320" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2"/>
  <text x="162" y="30" text-anchor="middle" font-size="11" font-weight="bold">PROVIDER — NovaTech VNet</text>
  <text x="162" y="45" text-anchor="middle" font-size="9" fill="#555">10.0.0.0/16</text>
  <!-- snet-backend -->
  <rect x="30" y="55" width="265" height="80" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="1"/>
  <text x="162" y="72" text-anchor="middle" font-size="9" font-weight="bold">snet-backend (10.0.1.0/24)</text>
  <rect x="45" y="80" width="80" height="28" rx="4" fill="#f5f5f5" stroke="#666" stroke-width="1"/>
  <text x="85" y="98" text-anchor="middle" font-size="9">VM-1</text>
  <rect x="140" y="80" width="80" height="28" rx="4" fill="#f5f5f5" stroke="#666" stroke-width="1"/>
  <text x="180" y="98" text-anchor="middle" font-size="9">VM-2</text>
  <!-- Standard ILB -->
  <rect x="45" y="148" width="240" height="40" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="1.5"/>
  <text x="165" y="166" text-anchor="middle" font-size="10" font-weight="bold">Standard ILB</text>
  <text x="165" y="181" text-anchor="middle" font-size="9" fill="#555">frontend: 10.0.0.4</text>
  <line x1="130" y1="108" x2="130" y2="146" stroke="#666" stroke-width="1" marker-end="url(#arrow-ch36)"/>
  <!-- PLS -->
  <rect x="30" y="210" width="265" height="100" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2"/>
  <text x="162" y="228" text-anchor="middle" font-size="9" font-weight="bold">snet-pls (10.0.2.0/24)</text>
  <rect x="45" y="238" width="235" height="55" rx="4" fill="#f5f5f5" stroke="#82b366" stroke-width="1"/>
  <text x="162" y="256" text-anchor="middle" font-size="10" font-weight="bold">Private Link Service</text>
  <text x="162" y="272" text-anchor="middle" font-size="9" fill="#555">NAT IP: 10.0.2.4</text>
  <text x="162" y="286" text-anchor="middle" font-size="9" fill="#555">Alias: pls-novatech...</text>
  <line x1="165" y1="188" x2="165" y2="208" stroke="#666" stroke-width="1" marker-end="url(#arrow-ch36)"/>
  <!-- CONSUMER VNet -->
  <rect x="360" y="10" width="275" height="200" rx="8" fill="#fff2cc" stroke="#d6b656" stroke-width="2"/>
  <text x="497" y="30" text-anchor="middle" font-size="11" font-weight="bold">CONSUMER — Customer VNet</text>
  <text x="497" y="45" text-anchor="middle" font-size="9" fill="#555">10.1.0.0/16</text>
  <!-- snet-consumer -->
  <rect x="375" y="55" width="245" height="140" rx="6" fill="#f5f5f5" stroke="#666" stroke-width="1"/>
  <text x="497" y="72" text-anchor="middle" font-size="9" font-weight="bold">snet-consumer (10.1.1.0/24)</text>
  <rect x="420" y="82" width="120" height="28" rx="4" fill="#fff2cc" stroke="#d6b656" stroke-width="1"/>
  <text x="480" y="100" text-anchor="middle" font-size="9">consumer-vm</text>
  <!-- PE to PLS -->
  <rect x="400" y="130" width="160" height="45" rx="4" fill="#e1d5e7" stroke="#9673a6" stroke-width="1.5"/>
  <text x="480" y="150" text-anchor="middle" font-size="10" font-weight="bold">PE to PLS</text>
  <text x="480" y="167" text-anchor="middle" font-size="9" fill="#555">(10.1.1.5)</text>
  <line x1="480" y1="110" x2="480" y2="128" stroke="#666" stroke-width="1" marker-end="url(#arrow-ch36)"/>
  <!-- Private Link connection -->
  <line x1="398" y1="152" x2="312" y2="260" stroke="#9673a6" stroke-width="2.5" stroke-dasharray="8,4" marker-end="url(#arrow-ch36)"/>
  <text x="385" y="240" font-size="9" fill="#9673a6" font-weight="bold">Private Link</text>
  <text x="385" y="253" font-size="9" fill="#9673a6">connection</text>
</svg>
</div>

## Learning objectives

After completing this challenge you will be able to:

- Create a Private Link Service (PLS) attached to a Standard Load Balancer
- Configure NAT IP addresses for source NAT of incoming consumer traffic
- Disable network policies on the PLS subnet (required for PLS deployment)
- Set visibility restrictions to control which subscriptions can discover the service
- Configure auto-approval for trusted consumer subscriptions
- Retrieve the PLS alias for sharing with consumers
- Approve or reject consumer private endpoint connections
- Understand the provider vs consumer workflow and responsibilities

## Prerequisites

- An Azure subscription with Contributor access
- Azure CLI installed and authenticated (`az login`)
- PowerShell with Az module installed (`Install-Module Az -Force`)
- Understanding of Azure Standard Load Balancer (internal)

## Key concepts for AZ-700

| Concept | Detail |
|---------|--------|
| Private Link Service (PLS) | Provider-side resource that exposes a service behind a Standard LB via Private Link |
| NAT IP configuration | PLS performs SNAT; the NAT IP is the source IP seen by the backend for consumer traffic |
| Standard Load Balancer | PLS requires Standard SKU (Basic LB is not supported) |
| Alias | A globally unique, anonymized identifier for the PLS that consumers use to create their PE |
| Visibility | Controls which subscriptions can discover and connect to the PLS (empty = all, specified = restricted) |
| Auto-approval | Subscriptions in this list have connections automatically approved (subset of visibility) |
| Connection states | Pending (awaiting approval), Approved (active), Rejected (denied), Removed (deleted) |
| Network policies | Must be disabled on the PLS subnet (`privateLinkServiceNetworkPolicies = Disabled`) |

### Provider vs consumer responsibilities

| Step | Provider (service owner) | Consumer (customer) |
|------|-------------------------|-------------------|
| 1 | Deploys Standard LB with backend pool | - |
| 2 | Creates PLS linked to LB frontend | - |
| 3 | Shares alias or resource ID with consumer | Receives alias |
| 4 | - | Creates PE targeting the alias |
| 5 | Approves the PE connection (or auto-approved) | Waits for approval |
| 6 | Traffic flows: consumer PE -> PLS NAT -> LB -> backend | Accesses service via private IP |

:::tip Exam note

The exam tests the distinction between Private Link Service (provider creates, linked to LB) and Private Endpoint (consumer creates, gets private IP in their VNet). Remember that PLS requires a Standard LB -- this is a common trap question.

:::

---

## Task 1: Create the provider infrastructure

### Azure CLI

```bash
# Create resource group
az group create \
    --name rg-pls-provider \
    --location eastus2

# Create provider VNet
az network vnet create \
    --resource-group rg-pls-provider \
    --name vnet-provider \
    --location eastus2 \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name snet-backend \
    --subnet-prefixes 10.0.1.0/24

# Create PLS subnet (will host the Private Link Service)
az network vnet subnet create \
    --resource-group rg-pls-provider \
    --vnet-name vnet-provider \
    --name snet-pls \
    --address-prefixes 10.0.2.0/24
```

### Azure PowerShell

```powershell
New-AzResourceGroup -Name "rg-pls-provider" -Location "eastus2"

$snetBackend = New-AzVirtualNetworkSubnetConfig `
    -Name "snet-backend" `
    -AddressPrefix "10.0.1.0/24"

$snetPls = New-AzVirtualNetworkSubnetConfig `
    -Name "snet-pls" `
    -AddressPrefix "10.0.2.0/24"

New-AzVirtualNetwork `
    -ResourceGroupName "rg-pls-provider" `
    -Name "vnet-provider" `
    -Location "eastus2" `
    -AddressPrefix "10.0.0.0/16" `
    -Subnet $snetBackend, $snetPls
```

---

## Task 2: Deploy the Standard internal load balancer

### Azure CLI

```bash
# Create Standard internal LB
az network lb create \
    --resource-group rg-pls-provider \
    --name lb-api-internal \
    --sku Standard \
    --vnet-name vnet-provider \
    --subnet snet-backend \
    --frontend-ip-name frontend-api \
    --backend-pool-name backend-pool

# Create health probe
az network lb probe create \
    --resource-group rg-pls-provider \
    --lb-name lb-api-internal \
    --name probe-http \
    --protocol Tcp \
    --port 80

# Create load balancer rule
az network lb rule create \
    --resource-group rg-pls-provider \
    --lb-name lb-api-internal \
    --name rule-http \
    --protocol Tcp \
    --frontend-port 80 \
    --backend-port 80 \
    --frontend-ip-name frontend-api \
    --backend-pool-name backend-pool \
    --probe-name probe-http \
    --idle-timeout 15 \
    --enable-tcp-reset true
```

### Azure PowerShell

```powershell
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-pls-provider" -Name "vnet-provider"
$backendSubnet = $vnet.Subnets | Where-Object { $_.Name -eq "snet-backend" }

# Create frontend IP configuration (internal)
$feIp = New-AzLoadBalancerFrontendIpConfig `
    -Name "frontend-api" `
    -SubnetId $backendSubnet.Id

# Create backend pool
$bePool = New-AzLoadBalancerBackendAddressPoolConfig -Name "backend-pool"

# Create probe
$probe = New-AzLoadBalancerProbeConfig `
    -Name "probe-http" `
    -Protocol Tcp `
    -Port 80 `
    -IntervalInSeconds 15 `
    -ProbeCount 2

# Create rule
$rule = New-AzLoadBalancerRuleConfig `
    -Name "rule-http" `
    -FrontendIpConfigurationId $feIp.Id `
    -BackendAddressPoolId $bePool.Id `
    -ProbeId $probe.Id `
    -Protocol Tcp `
    -FrontendPort 80 `
    -BackendPort 80 `
    -IdleTimeoutInMinutes 15 `
    -EnableTcpReset

# Create the Standard ILB
New-AzLoadBalancer `
    -ResourceGroupName "rg-pls-provider" `
    -Name "lb-api-internal" `
    -Location "eastus2" `
    -Sku "Standard" `
    -FrontendIpConfiguration $feIp `
    -BackendAddressPool $bePool `
    -Probe $probe `
    -LoadBalancingRule $rule
```

---

## Task 3: Disable network policies on PLS subnet

Private Link Service requires network policies to be disabled on the subnet where it is deployed. This is a different setting from the private endpoint network policies.

### Azure CLI

```bash
# Disable private link service network policies on the PLS subnet
az network vnet subnet update \
    --resource-group rg-pls-provider \
    --vnet-name vnet-provider \
    --name snet-pls \
    --private-link-service-network-policies Disabled
```

### Azure PowerShell

```powershell
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-pls-provider" -Name "vnet-provider"

Set-AzVirtualNetworkSubnetConfig `
    -Name "snet-pls" `
    -VirtualNetwork $vnet `
    -AddressPrefix "10.0.2.0/24" `
    -PrivateLinkServiceNetworkPoliciesFlag "Disabled"

$vnet | Set-AzVirtualNetwork
```

:::warning Required configuration

Unlike private endpoint network policies (which disable NSG enforcement on PE traffic), the PLS subnet policy controls whether a Private Link Service can be deployed in the subnet at all. Without disabling this policy, PLS creation will fail. This is a different CLI parameter: `--private-link-service-network-policies` (not `--disable-private-endpoint-network-policies`).

:::

---

## Task 4: Create the Private Link Service

### Azure CLI

```bash
# Create Private Link Service linked to the LB frontend
az network private-link-service create \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --vnet-name vnet-provider \
    --subnet snet-pls \
    --lb-name lb-api-internal \
    --lb-frontend-ip-configs frontend-api \
    --location eastus2

# Retrieve the PLS alias (share this with consumers)
az network private-link-service show \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --query "alias" \
    --output tsv
```

### Azure PowerShell

```powershell
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-pls-provider" -Name "vnet-provider"
$plsSubnet = $vnet.Subnets | Where-Object { $_.Name -eq "snet-pls" }

$lb = Get-AzLoadBalancer -ResourceGroupName "rg-pls-provider" -Name "lb-api-internal"
$feConfig = $lb.FrontendIpConfigurations | Where-Object { $_.Name -eq "frontend-api" }

# Create NAT IP configuration for PLS
$natIpConfig = New-AzPrivateLinkServiceIpConfig `
    -Name "nat-ip-config" `
    -Subnet $plsSubnet `
    -PrivateIpAddressVersion "IPv4" `
    -Primary

# Create the Private Link Service
$pls = New-AzPrivateLinkService `
    -ResourceGroupName "rg-pls-provider" `
    -Name "pls-novatech-api" `
    -Location "eastus2" `
    -IpConfiguration $natIpConfig `
    -LoadBalancerFrontendIpConfiguration $feConfig

# Get the alias
$pls.Alias
```

---

## Task 5: Configure visibility and auto-approval

### Azure CLI

```bash
# Set visibility to specific consumer subscriptions
# Only these subscriptions can discover and connect to the PLS
az network private-link-service update \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --visibility "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"

# Set auto-approval for trusted consumer subscriptions
# Connections from these subscriptions are approved automatically
az network private-link-service update \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --auto-approval "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Azure PowerShell

```powershell
$pls = Get-AzPrivateLinkService `
    -ResourceGroupName "rg-pls-provider" `
    -Name "pls-novatech-api"

# Update visibility (subscriptions that can see and connect)
$pls.Visibility = @{
    Subscriptions = @(
        "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    )
}

# Update auto-approval (subset of visibility)
$pls.AutoApproval = @{
    Subscriptions = @(
        "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    )
}

Set-AzPrivateLinkService -InputObject $pls
```

:::note Visibility vs auto-approval

- **Visibility** controls which subscriptions can discover the PLS and create a PE connection to it. If empty, all subscriptions can connect. If specified, only listed subscriptions can connect.
- **Auto-approval** is always a subset of visibility. Listed subscriptions have their connections automatically approved without provider intervention.
- A subscription in visibility but NOT in auto-approval will have its connection in Pending state until manually approved.

:::

---

## Task 6: Consumer creates a private endpoint (simulated)

This simulates the consumer side. In production, the consumer would be in a different subscription.

### Azure CLI

```bash
# Create consumer resource group and VNet
az group create --name rg-pls-consumer --location eastus2

az network vnet create \
    --resource-group rg-pls-consumer \
    --name vnet-consumer \
    --location eastus2 \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name snet-consumer \
    --subnet-prefixes 10.1.1.0/24

# Get the PLS resource ID
PLS_ID=$(az network private-link-service show \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --query id \
    --output tsv)

# Consumer creates PE targeting the PLS
az network private-endpoint create \
    --resource-group rg-pls-consumer \
    --name pe-to-novatech \
    --vnet-name vnet-consumer \
    --subnet snet-consumer \
    --private-connection-resource-id $PLS_ID \
    --connection-name connection-novatech \
    --location eastus2
```

### Azure PowerShell

```powershell
New-AzResourceGroup -Name "rg-pls-consumer" -Location "eastus2"

$snet = New-AzVirtualNetworkSubnetConfig -Name "snet-consumer" -AddressPrefix "10.1.1.0/24"
$vnet = New-AzVirtualNetwork `
    -ResourceGroupName "rg-pls-consumer" `
    -Name "vnet-consumer" `
    -Location "eastus2" `
    -AddressPrefix "10.1.0.0/16" `
    -Subnet $snet

$pls = Get-AzPrivateLinkService `
    -ResourceGroupName "rg-pls-provider" `
    -Name "pls-novatech-api"

$plsConnection = New-AzPrivateLinkServiceConnection `
    -Name "connection-novatech" `
    -PrivateLinkServiceId $pls.Id `
    -RequestMessage "Please approve access for CustomerCo"

$subnet = $vnet.Subnets | Where-Object { $_.Name -eq "snet-consumer" }

New-AzPrivateEndpoint `
    -ResourceGroupName "rg-pls-consumer" `
    -Name "pe-to-novatech" `
    -Location "eastus2" `
    -Subnet $subnet `
    -PrivateLinkServiceConnection $plsConnection
```

---

## Task 7: Provider approves the connection

### Azure CLI

```bash
# List pending connections on the PLS
az network private-link-service connection list \
    --resource-group rg-pls-provider \
    --service-name pls-novatech-api \
    --output table

# Approve the pending connection
az network private-link-service connection update \
    --resource-group rg-pls-provider \
    --service-name pls-novatech-api \
    --name connection-novatech \
    --connection-status Approved \
    --description "Approved for CustomerCo production access"
```

### Azure PowerShell

```powershell
# Get the PLS and list connections
$pls = Get-AzPrivateLinkService `
    -ResourceGroupName "rg-pls-provider" `
    -Name "pls-novatech-api"

$pls.PrivateEndpointConnections | Format-Table Name, PrivateLinkServiceConnectionState

# Approve the connection
Approve-AzPrivateEndpointConnection `
    -ResourceGroupName "rg-pls-provider" `
    -ServiceName "pls-novatech-api" `
    -Name $pls.PrivateEndpointConnections[0].Name `
    -PrivateLinkResourceType "Microsoft.Network/privateLinkServices" `
    -Description "Approved for CustomerCo"
```

### Portal steps

1. Navigate to **Private Link** in the portal
2. Select **Private link services** and choose `pls-novatech-api`
3. Go to **Private endpoint connections**
4. Select the pending connection and click **Approve**
5. Provide a description and confirm

---

## Break & fix scenarios

### Scenario 1: PLS creation fails - Basic SKU load balancer

**Symptom:** `az network private-link-service create` returns an error indicating the load balancer is not compatible.

**Diagnosis:**

```bash
# Check the LB SKU
az network lb show \
    --resource-group rg-pls-provider \
    --name lb-api-internal \
    --query "sku.name" \
    --output tsv
```

**Root cause:** Private Link Service requires a Standard SKU Load Balancer. Basic LB is not supported.

**Fix:** Recreate the load balancer with Standard SKU:

```bash
# Delete the Basic LB
az network lb delete \
    --resource-group rg-pls-provider \
    --name lb-api-internal

# Recreate with Standard SKU
az network lb create \
    --resource-group rg-pls-provider \
    --name lb-api-internal \
    --sku Standard \
    --vnet-name vnet-provider \
    --subnet snet-backend \
    --frontend-ip-name frontend-api \
    --backend-pool-name backend-pool
```

---

### Scenario 2: Consumer PE rejected - subscription not in visibility list

**Symptom:** Consumer creates a PE but the connection immediately shows state `Rejected` or the creation fails with an access error.

**Diagnosis:**

```bash
# Check PLS visibility settings (provider side)
az network private-link-service show \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --query "visibility.subscriptions" \
    --output tsv

# Check consumer's subscription ID
az account show --query "id" --output tsv
```

**Root cause:** The PLS has a visibility list configured, and the consumer's subscription is not in it.

**Fix (provider side):**

```bash
# Add the consumer's subscription to the visibility list
az network private-link-service update \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --visibility "existing-sub-id" "new-consumer-sub-id"
```

---

### Scenario 3: NAT IP exhaustion

**Symptom:** New consumer connections succeed but report intermittent connectivity failures. Existing connections may drop under load.

**Diagnosis:**

```bash
# Check current NAT IP configurations
az network private-link-service show \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --query "ipConfigurations" \
    --output table

# Check number of active connections
az network private-link-service connection list \
    --resource-group rg-pls-provider \
    --service-name pls-novatech-api \
    --query "length(@)"
```

**Root cause:** Each NAT IP supports approximately 64,000 concurrent connections (port exhaustion). With many consumers or high connection counts, a single NAT IP may be insufficient.

**Fix:** Add additional NAT IP configurations:

```bash
# Add a secondary NAT IP to the PLS
az network private-link-service update \
    --resource-group rg-pls-provider \
    --name pls-novatech-api \
    --ip-configs name=nat-ip-secondary subnet=snet-pls private-ip-address="" private-ip-address-version=IPv4
```

```powershell
$pls = Get-AzPrivateLinkService `
    -ResourceGroupName "rg-pls-provider" `
    -Name "pls-novatech-api"

$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-pls-provider" -Name "vnet-provider"
$plsSubnet = $vnet.Subnets | Where-Object { $_.Name -eq "snet-pls" }

$newNatIp = New-AzPrivateLinkServiceIpConfig `
    -Name "nat-ip-secondary" `
    -Subnet $plsSubnet `
    -PrivateIpAddressVersion "IPv4"

$pls.IpConfigurations += $newNatIp
Set-AzPrivateLinkService -InputObject $pls
```

---

### Scenario 4: Network policies not disabled on PLS subnet

**Symptom:** PLS creation fails with an error about network policies.

**Diagnosis:**

```bash
az network vnet subnet show \
    --resource-group rg-pls-provider \
    --vnet-name vnet-provider \
    --name snet-pls \
    --query "privateLinkServiceNetworkPolicies" \
    --output tsv
```

**Root cause:** The subnet still has `privateLinkServiceNetworkPolicies` set to `Enabled`.

**Fix:**

```bash
az network vnet subnet update \
    --resource-group rg-pls-provider \
    --vnet-name vnet-provider \
    --name snet-pls \
    --private-link-service-network-policies Disabled
```

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-36-q1",
    question: "Which load balancer SKU is required for Azure Private Link Service?",
    options: [
      "Basic",
      "Standard \u2705",
      "Gateway",
      "Any SKU is supported"
    ],
    correctIndex: 1,
    explanation: "Private Link Service requires a Standard SKU Load Balancer (internal or public). Basic SKU is not supported. This is because PLS relies on Standard LB features for high availability and zone redundancy."
  },
  {
    id: "az700-36-q2",
    question: "A consumer creates a private endpoint to your Private Link Service but the connection status shows 'Pending'. The consumer's subscription IS in your visibility list but NOT in auto-approval. What must happen?",
    options: [
      "The consumer must upgrade their subscription",
      "The provider must manually approve the connection \u2705",
      "The PLS must be restarted",
      "The consumer must recreate the PE with --manual-request false"
    ],
    correctIndex: 1,
    explanation: "When a consumer's subscription is in the visibility list (can connect) but not in the auto-approval list, the connection enters a Pending state. The provider (service owner) must manually approve the connection before traffic can flow."
  },
  {
    id: "az700-36-q3",
    question: "What is the relationship between visibility and auto-approval on a Private Link Service?",
    options: [
      "They are independent settings with no relationship",
      "Auto-approval must be a subset of the visibility list \u2705",
      "Visibility must be a subset of auto-approval",
      "Auto-approval replaces visibility when configured"
    ],
    correctIndex: 1,
    explanation: "Auto-approval is always a subset of visibility. A subscription must first be visible (allowed to connect) before it can be auto-approved. If auto-approval lists a subscription not in visibility, that subscription still cannot connect."
  },
  {
    id: "az700-36-q4",
    question: "What subnet-level setting must be configured before deploying a Private Link Service?",
    options: [
      "--disable-private-endpoint-network-policies true",
      "--private-link-service-network-policies Disabled \u2705",
      "--enable-private-link true",
      "--network-security-group none"
    ],
    correctIndex: 1,
    explanation: "The PLS subnet requires privateLinkServiceNetworkPolicies to be Disabled. This is a different setting from private endpoint network policies. Without this, PLS deployment fails. The CLI parameter is --private-link-service-network-policies Disabled."
  },
  {
    id: "az700-36-q5",
    question: "What is the purpose of the NAT IP configuration on a Private Link Service?",
    options: [
      "It provides the public IP for consumers to connect to",
      "It performs source NAT so backend servers see the NAT IP as the source of consumer traffic \u2705",
      "It assigns a DNS name to the PLS",
      "It routes traffic from the PLS to the internet"
    ],
    correctIndex: 1,
    explanation: "The NAT IP performs source network address translation (SNAT) on consumer traffic. Backend servers behind the LB see the NAT IP as the source address, not the consumer's private IP. This prevents IP conflicts between the provider and consumer address spaces."
  },
  {
    id: "az700-36-q6",
    question: "A PLS alias looks like 'pls-novatech-api.abc123.eastus2.azure.privatelinkservice'. What is the benefit of using the alias instead of the resource ID when sharing with consumers?",
    options: [
      "The alias provides faster connection speeds",
      "The alias masks the provider's subscription and resource group details for privacy \u2705",
      "The alias enables DNS resolution automatically",
      "The alias is required for cross-region connections"
    ],
    correctIndex: 1,
    explanation: "The alias is a globally unique, anonymized string that hides the provider's internal Azure details (subscription ID, resource group name, etc.). Consumers can use the alias to create their PE without knowing the provider's Azure topology. The resource ID would expose these details."
  }
]} />

---

## Cleanup

Remove all resources created in this challenge to stop billing:

```bash
# Delete both provider and consumer resource groups
az group delete --name rg-pls-provider --yes --no-wait
az group delete --name rg-pls-consumer --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-pls-provider" -Force -AsJob
Remove-AzResourceGroup -Name "rg-pls-consumer" -Force -AsJob
```

:::danger Cost warning

This challenge deploys a Standard Load Balancer (~$0.025/h) and a Private Link Service (~$0.01/h). If you also deployed backend VMs for testing, those incur additional charges. Delete both resource groups promptly after completing the lab. Total estimated cost is approximately $0.05/h without VMs.

:::

---

## Additional references

- [What is Azure Private Link Service?](https://learn.microsoft.com/en-us/azure/private-link/private-link-service-overview)
- [Create a Private Link Service - Azure CLI](https://learn.microsoft.com/en-us/azure/private-link/create-private-link-service-cli)
- [Manage Private Link Service connections](https://learn.microsoft.com/en-us/azure/private-link/private-link-service-overview#control-service-access)
- [Private Link Service properties (visibility, auto-approval, NAT)](https://learn.microsoft.com/en-us/azure/private-link/private-link-service-overview#properties)
- [Disable network policies for Private Link Service](https://learn.microsoft.com/en-us/azure/private-link/disable-private-link-service-network-policy)
