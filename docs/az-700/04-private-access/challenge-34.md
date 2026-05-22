---
sidebar_position: 1
title: "Challenge 34: Private Endpoints & DNS Integration"
sidebar_label: "Challenge 34"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 34: Private endpoints & DNS integration

:::info Estimated time and cost

**45-60 minutes** | **~$0.01/h** | **Exam weight: 10-15%**

:::

## Scenario

MedSecure Health, a healthcare company, is migrating their PaaS services to private access to comply with data residency and security requirements. Their compliance team mandates that no patient data should traverse the public internet. You have been tasked with configuring private endpoints for their Azure Storage account (blob endpoint) and ensuring proper DNS resolution so that applications within the virtual network resolve the storage account FQDN to a private IP address rather than a public one.

**Architecture:**

```
                    Azure VNet (10.0.0.0/16)
                    ┌──────────────────────────────────────────────┐
                    │                                              │
                    │  snet-workloads (10.0.1.0/24)                │
                    │  ┌──────────┐                                │
                    │  │  vm-test  │ ── nslookup ──┐               │
                    │  └──────────┘                │               │
                    │                              v               │
                    │  snet-pe (10.0.2.0/24)                       │
                    │  ┌──────────────────────────┐                │
                    │  │ pe-storage (10.0.2.4)    │                │
                    │  └──────────────────────────┘                │
                    │              │                                │
                    └──────────────┼────────────────────────────────┘
                                   │ Private connection
                                   v
                    ┌──────────────────────────────┐
                    │  stmedsecure.blob.core...    │
                    │  (Storage Account - Blob)    │
                    └──────────────────────────────┘

    Private DNS Zone: privatelink.blob.core.windows.net
    A record: stmedsecure → 10.0.2.4
```

## Learning objectives

After completing this challenge you will be able to:

- Create a private endpoint for an Azure Storage blob sub-resource
- Create and configure a privatelink DNS zone for automatic name resolution
- Link a private DNS zone to a virtual network
- Use DNS zone groups for automatic DNS record management
- Enable network policies on a private endpoint subnet to allow NSG enforcement
- Verify DNS resolution returns the private IP address
- Understand private endpoint connection states (Pending, Approved, Rejected)

## Prerequisites

- An Azure subscription with Contributor access
- Azure CLI installed and authenticated (`az login`)
- PowerShell with Az module installed (`Install-Module Az -Force`)

## Key concepts for AZ-700

| Concept | Detail |
|---------|--------|
| Private endpoint | A network interface with a private IP that connects you privately to a service powered by Azure Private Link |
| Privatelink DNS zone | A private DNS zone (e.g., `privatelink.blob.core.windows.net`) used to override public DNS resolution with private IPs |
| DNS zone group | Associates a private endpoint with a private DNS zone for automatic A-record lifecycle management |
| Virtual network link | Connects a private DNS zone to a VNet so VMs in that VNet can resolve records from the zone |
| Network policies | By default, NSGs and UDRs are disabled on PE subnets; must be explicitly enabled via subnet configuration |
| Connection states | Pending (awaiting approval), Approved (active), Rejected (denied by service owner), Disconnected |
| Sub-resource (group-id) | Identifies which part of a multi-endpoint service to connect to (e.g., `blob`, `file`, `table`, `queue`) |

### DNS resolution chain for private endpoints

When a client in a linked VNet resolves `stmedsecure.blob.core.windows.net`:

1. Azure DNS receives the query
2. Public DNS returns a CNAME to `stmedsecure.privatelink.blob.core.windows.net`
3. Azure DNS checks linked private DNS zones
4. The privatelink zone returns the A record pointing to the private IP (e.g., 10.0.2.4)

Without the private DNS zone linked to the VNet, the resolution falls through to the public IP.

:::tip Exam note

The exam frequently tests the DNS resolution chain. Remember that the public DNS always returns a CNAME to the `privatelink` subdomain. It is the private DNS zone (linked to the VNet) that resolves this CNAME to the private IP. If the zone is not linked, the query resolves to the public IP.

:::

---

## Task 1: Create the resource group and virtual network

### Azure CLI

```bash
# Create resource group
az group create \
    --name rg-pe-lab \
    --location eastus2

# Create VNet with workload subnet
az network vnet create \
    --resource-group rg-pe-lab \
    --name vnet-medsecure \
    --location eastus2 \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name snet-workloads \
    --subnet-prefixes 10.0.1.0/24

# Create dedicated subnet for private endpoints
az network vnet subnet create \
    --resource-group rg-pe-lab \
    --vnet-name vnet-medsecure \
    --name snet-pe \
    --address-prefixes 10.0.2.0/24
```

### Azure PowerShell

```powershell
# Create resource group
New-AzResourceGroup -Name "rg-pe-lab" -Location "eastus2"

# Create subnet configurations
$snetWorkloads = New-AzVirtualNetworkSubnetConfig `
    -Name "snet-workloads" `
    -AddressPrefix "10.0.1.0/24"

$snetPe = New-AzVirtualNetworkSubnetConfig `
    -Name "snet-pe" `
    -AddressPrefix "10.0.2.0/24"

# Create VNet
New-AzVirtualNetwork `
    -ResourceGroupName "rg-pe-lab" `
    -Name "vnet-medsecure" `
    -Location "eastus2" `
    -AddressPrefix "10.0.0.0/16" `
    -Subnet $snetWorkloads, $snetPe
```

---

## Task 2: Create the storage account

### Azure CLI

```bash
# Create storage account (must be globally unique name)
az storage account create \
    --resource-group rg-pe-lab \
    --name stmedsecurelab01 \
    --location eastus2 \
    --sku Standard_LRS \
    --kind StorageV2
```

### Azure PowerShell

```powershell
# Create storage account
$storageAccount = New-AzStorageAccount `
    -ResourceGroupName "rg-pe-lab" `
    -Name "stmedsecurelab01" `
    -Location "eastus2" `
    -SkuName "Standard_LRS" `
    -Kind "StorageV2"
```

---

## Task 3: Create the private endpoint for blob storage

### Azure CLI

```bash
# Get the storage account resource ID
STORAGE_ID=$(az storage account show \
    --resource-group rg-pe-lab \
    --name stmedsecurelab01 \
    --query "id" \
    --output tsv)

# Create private endpoint for blob sub-resource
az network private-endpoint create \
    --resource-group rg-pe-lab \
    --name pe-storage-blob \
    --vnet-name vnet-medsecure \
    --subnet snet-pe \
    --private-connection-resource-id $STORAGE_ID \
    --group-id blob \
    --connection-name pec-storage-blob \
    --location eastus2
```

### Azure PowerShell

```powershell
# Get storage account and VNet references
$storageAccount = Get-AzStorageAccount `
    -ResourceGroupName "rg-pe-lab" `
    -Name "stmedsecurelab01"

$vnet = Get-AzVirtualNetwork `
    -ResourceGroupName "rg-pe-lab" `
    -Name "vnet-medsecure"

$subnet = $vnet | Select-Object -ExpandProperty Subnets | `
    Where-Object { $_.Name -eq "snet-pe" }

# Create private link service connection
$plsConnection = New-AzPrivateLinkServiceConnection `
    -Name "pec-storage-blob" `
    -PrivateLinkServiceId $storageAccount.Id `
    -GroupId "blob"

# Create private endpoint
New-AzPrivateEndpoint `
    -ResourceGroupName "rg-pe-lab" `
    -Name "pe-storage-blob" `
    -Location "eastus2" `
    -Subnet $subnet `
    -PrivateLinkServiceConnection $plsConnection
```

### Portal steps

1. Search for **Private endpoints** and select **Create**
2. In **Basics**: select resource group `rg-pe-lab`, name it `pe-storage-blob`, region `East US 2`
3. In **Resource**: resource type `Microsoft.Storage/storageAccounts`, select your storage account, target sub-resource `blob`
4. In **Virtual Network**: select `vnet-medsecure`, subnet `snet-pe`
5. In **DNS**: configure in the next task
6. Select **Review + create**, then **Create**

:::note Connection states

When creating a PE to a resource in your own subscription, the connection is auto-approved (state: Approved). When connecting to a resource in another subscription or to a Private Link Service, the state starts as Pending until the resource owner approves it.

:::

---

## Task 4: Configure private DNS zone and link to VNet

### Azure CLI

```bash
# Create the privatelink DNS zone for blob storage
az network private-dns zone create \
    --resource-group rg-pe-lab \
    --name "privatelink.blob.core.windows.net"

# Link the DNS zone to the VNet
az network private-dns link vnet create \
    --resource-group rg-pe-lab \
    --zone-name "privatelink.blob.core.windows.net" \
    --name link-vnet-medsecure \
    --virtual-network vnet-medsecure \
    --registration-enabled false

# Create DNS zone group to auto-manage A records
az network private-endpoint dns-zone-group create \
    --resource-group rg-pe-lab \
    --endpoint-name pe-storage-blob \
    --name zone-group-blob \
    --private-dns-zone "privatelink.blob.core.windows.net" \
    --zone-name blob
```

### Azure PowerShell

```powershell
# Create private DNS zone
$dnsZone = New-AzPrivateDnsZone `
    -ResourceGroupName "rg-pe-lab" `
    -Name "privatelink.blob.core.windows.net"

# Link DNS zone to VNet
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-pe-lab" -Name "vnet-medsecure"

New-AzPrivateDnsVirtualNetworkLink `
    -ResourceGroupName "rg-pe-lab" `
    -ZoneName "privatelink.blob.core.windows.net" `
    -Name "link-vnet-medsecure" `
    -VirtualNetworkId $vnet.Id `
    -EnableRegistration $false

# Create DNS zone group for automatic record management
$dnsZoneConfig = New-AzPrivateDnsZoneConfig `
    -Name "blob" `
    -PrivateDnsZoneId $dnsZone.ResourceId

New-AzPrivateDnsZoneGroup `
    -ResourceGroupName "rg-pe-lab" `
    -PrivateEndpointName "pe-storage-blob" `
    -Name "zone-group-blob" `
    -PrivateDnsZoneConfig $dnsZoneConfig
```

:::tip Why registration-enabled is false

The `--registration-enabled false` parameter means VMs in the linked VNet will NOT auto-register their own DNS records in this zone. This is correct for privatelink zones -- you only want the private endpoint A records here, not VM hostnames. Set registration to true only on zones meant for VM auto-registration (e.g., `contoso.internal`).

:::

---

## Task 5: Verify DNS resolution

### Azure CLI

```bash
# Check the private endpoint's private IP
az network private-endpoint show \
    --resource-group rg-pe-lab \
    --name pe-storage-blob \
    --query "customDnsConfigs[0].ipAddresses[0]" \
    --output tsv

# List DNS records in the private zone
az network private-dns record-set a list \
    --resource-group rg-pe-lab \
    --zone-name "privatelink.blob.core.windows.net" \
    --output table
```

### From a VM inside the VNet

```bash
# Run nslookup from a VM connected to vnet-medsecure
nslookup stmedsecurelab01.blob.core.windows.net

# Expected output (private IP resolution):
# Server:  UnKnown
# Address:  168.63.129.16
#
# Non-authoritative answer:
# Name:    stmedsecurelab01.privatelink.blob.core.windows.net
# Address:  10.0.2.4
# Aliases:  stmedsecurelab01.blob.core.windows.net
```

---

## Task 6: Enable network policies on the PE subnet

By default, network policies (NSGs and UDRs) are disabled on subnets containing private endpoints. To enforce NSG rules on traffic to/from your private endpoint, you must explicitly enable network policies.

### Azure CLI

```bash
# Enable network policies on the PE subnet
# NOTE: --disable-private-endpoint-network-policies false means policies ARE ENABLED
# This is a confusing double-negative in the CLI parameter name
az network vnet subnet update \
    --resource-group rg-pe-lab \
    --vnet-name vnet-medsecure \
    --name snet-pe \
    --disable-private-endpoint-network-policies false
```

### Azure PowerShell

```powershell
# Enable network policies on the PE subnet
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-pe-lab" -Name "vnet-medsecure"

# PrivateEndpointNetworkPoliciesFlag values:
# "Enabled" = NSGs and UDRs apply to private endpoints
# "Disabled" = NSGs and UDRs are bypassed (default)
Set-AzVirtualNetworkSubnetConfig `
    -Name "snet-pe" `
    -VirtualNetwork $vnet `
    -AddressPrefix "10.0.2.0/24" `
    -PrivateEndpointNetworkPoliciesFlag "Enabled"

$vnet | Set-AzVirtualNetwork
```

:::warning Double-negative in CLI

The Azure CLI parameter `--disable-private-endpoint-network-policies` uses a double negative:
- `--disable-private-endpoint-network-policies true` = policies are DISABLED (default, NSGs do NOT apply)
- `--disable-private-endpoint-network-policies false` = policies are ENABLED (NSGs DO apply)

The PowerShell equivalent is clearer: `-PrivateEndpointNetworkPoliciesFlag "Enabled"` or `"Disabled"`.

:::

### Create an NSG rule for the PE subnet

```bash
# Create NSG
az network nsg create \
    --resource-group rg-pe-lab \
    --name nsg-snet-pe

# Allow HTTPS from workload subnet to PE subnet
az network nsg rule create \
    --resource-group rg-pe-lab \
    --nsg-name nsg-snet-pe \
    --name Allow-HTTPS-From-Workloads \
    --priority 100 \
    --direction Inbound \
    --source-address-prefixes 10.0.1.0/24 \
    --destination-address-prefixes 10.0.2.0/24 \
    --destination-port-ranges 443 \
    --protocol Tcp \
    --access Allow

# Deny all other inbound
az network nsg rule create \
    --resource-group rg-pe-lab \
    --nsg-name nsg-snet-pe \
    --name Deny-All-Inbound \
    --priority 4096 \
    --direction Inbound \
    --source-address-prefixes "*" \
    --destination-address-prefixes "*" \
    --destination-port-ranges "*" \
    --protocol "*" \
    --access Deny

# Associate NSG with PE subnet
az network vnet subnet update \
    --resource-group rg-pe-lab \
    --vnet-name vnet-medsecure \
    --name snet-pe \
    --network-security-group nsg-snet-pe
```

---

## Break & fix scenarios

### Scenario 1: DNS not resolving to private IP

**Symptom:** `nslookup stmedsecurelab01.blob.core.windows.net` returns the public IP address instead of 10.0.2.4.

**Diagnosis:**

```bash
# Check if the DNS zone exists
az network private-dns zone show \
    --resource-group rg-pe-lab \
    --name "privatelink.blob.core.windows.net" \
    --query "name" \
    --output tsv

# Check if the VNet link exists
az network private-dns link vnet list \
    --resource-group rg-pe-lab \
    --zone-name "privatelink.blob.core.windows.net" \
    --output table
```

**Root cause:** The private DNS zone is not linked to the VNet where the client VM resides.

**Fix:**

```bash
az network private-dns link vnet create \
    --resource-group rg-pe-lab \
    --zone-name "privatelink.blob.core.windows.net" \
    --name link-vnet-medsecure \
    --virtual-network vnet-medsecure \
    --registration-enabled false
```

---

### Scenario 2: NSG blocking traffic to private endpoint

**Symptom:** Application in snet-workloads cannot connect to storage via PE, but DNS resolves correctly to private IP.

**Diagnosis:**

```bash
# Check if network policies are enabled on the PE subnet
az network vnet subnet show \
    --resource-group rg-pe-lab \
    --vnet-name vnet-medsecure \
    --name snet-pe \
    --query "privateEndpointNetworkPolicies" \
    --output tsv
```

**Root cause:** Network policies were enabled on the subnet and an NSG was associated, but the NSG lacks an Allow rule for the required traffic. When policies are enabled, all standard NSG rules apply to PE traffic.

**Fix:** Either add an Allow rule for port 443 from the source subnet, or disable network policies if NSG enforcement is not required:

```bash
# Option A: Disable network policies (NSG rules will not apply to PE)
az network vnet subnet update \
    --resource-group rg-pe-lab \
    --vnet-name vnet-medsecure \
    --name snet-pe \
    --disable-private-endpoint-network-policies true

# Option B: Add allow rule (if policies should remain enabled)
az network nsg rule create \
    --resource-group rg-pe-lab \
    --nsg-name nsg-snet-pe \
    --name Allow-Storage-HTTPS \
    --priority 100 \
    --direction Inbound \
    --source-address-prefixes 10.0.1.0/24 \
    --destination-address-prefixes 10.0.2.0/24 \
    --destination-port-ranges 443 \
    --protocol Tcp \
    --access Allow
```

---

### Scenario 3: Private endpoint stuck in Pending state

**Symptom:** The private endpoint connection shows state `Pending` and traffic does not flow.

**Diagnosis:**

```bash
# Check connection state
az network private-endpoint show \
    --resource-group rg-pe-lab \
    --name pe-storage-blob \
    --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status" \
    --output tsv
```

**Root cause:** The PE was created with `--manual-request true` or the target resource is in a different subscription, requiring manual approval from the resource owner.

**Fix:**

```bash
# Approve the pending connection (run from the storage account owner's context)
az network private-endpoint-connection approve \
    --resource-group rg-pe-lab \
    --name <connection-name> \
    --resource-name stmedsecurelab01 \
    --type Microsoft.Storage/storageAccounts \
    --description "Approved for MedSecure VNet access"
```

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-34-q1",
    question: "A VM inside a VNet resolves stmedsecure.blob.core.windows.net to a public IP despite a private endpoint existing. What is the most likely cause?",
    options: [
      "The private DNS zone privatelink.blob.core.windows.net is not linked to the VM's VNet \u2705",
      "The private endpoint is using the wrong group-id",
      "The storage account firewall is blocking the VM's IP",
      "The private endpoint subnet does not have a route table"
    ],
    correctIndex: 0,
    explanation: "DNS resolution to a private IP requires the privatelink DNS zone to be linked to the VNet where the client resides. Without the link, Azure DNS cannot find the A record and the resolution falls through to the public IP via the CNAME chain."
  },
  {
    id: "az700-34-q2",
    question: "What does the Azure CLI parameter --disable-private-endpoint-network-policies false accomplish?",
    options: [
      "It ENABLES network policies (NSGs/UDRs) on the private endpoint subnet \u2705",
      "It DISABLES network policies on the private endpoint subnet",
      "It removes the private endpoint from the subnet",
      "It prevents new private endpoints from being created in the subnet"
    ],
    correctIndex: 0,
    explanation: "The parameter name is a double negative. Setting --disable-private-endpoint-network-policies to false means 'do NOT disable policies', which enables them. When enabled, NSG rules and UDRs apply to traffic destined to private endpoints in that subnet."
  },
  {
    id: "az700-34-q3",
    question: "A private endpoint connection to a storage account in another subscription shows state 'Pending'. What must happen for traffic to flow?",
    options: [
      "The consumer must upgrade their subscription tier",
      "The resource owner must approve the private endpoint connection \u2705",
      "The private endpoint must be recreated with --manual-request false",
      "A VPN connection must be established between subscriptions"
    ],
    correctIndex: 1,
    explanation: "When a private endpoint targets a resource in another subscription, the connection enters a Pending state. The owner of the target resource must explicitly approve the connection before it transitions to Approved and traffic can flow."
  },
  {
    id: "az700-34-q4",
    question: "Which group-id value is used when creating a private endpoint for Azure Storage blob access?",
    options: [
      "storage",
      "blobStorage",
      "blob \u2705",
      "Microsoft.Storage/blobServices"
    ],
    correctIndex: 2,
    explanation: "The group-id (sub-resource) for Azure Storage blob is simply 'blob'. Other storage sub-resources are 'file', 'table', 'queue', 'web', and 'dfs'. These values identify which specific service endpoint of the storage account the private endpoint connects to."
  },
  {
    id: "az700-34-q5",
    question: "What is the purpose of a DNS zone group on a private endpoint?",
    options: [
      "It routes traffic from the private endpoint to the DNS server",
      "It automatically creates and manages A records in the linked private DNS zone when the PE is created or deleted \u2705",
      "It encrypts DNS queries between the PE and the DNS zone",
      "It enables conditional DNS forwarding for the PE subnet"
    ],
    correctIndex: 1,
    explanation: "A DNS zone group creates a strong association between the private endpoint and a private DNS zone. It automatically manages the lifecycle of A records -- creating them when the PE is provisioned and removing them when the PE is deleted. This eliminates the need for manual DNS record management."
  },
  {
    id: "az700-34-q6",
    question: "In the DNS resolution chain for a private endpoint, what does public DNS return for stmedsecure.blob.core.windows.net?",
    options: [
      "The private IP address of the endpoint directly",
      "A CNAME record pointing to stmedsecure.privatelink.blob.core.windows.net \u2705",
      "An error indicating the record does not exist",
      "The public IP address of the storage account"
    ],
    correctIndex: 1,
    explanation: "Public DNS always returns a CNAME to the privatelink subdomain (stmedsecure.privatelink.blob.core.windows.net). It is then the private DNS zone (if linked to the VNet) that resolves this CNAME to the private IP. If no private zone is linked, the CNAME resolves back to the public IP through the normal public resolution path."
  }
]} />

---

## Cleanup

Remove all resources created in this challenge to stop billing:

```bash
az group delete --name rg-pe-lab --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-pe-lab" -Force -AsJob
```

:::danger Cost warning

Private endpoints incur charges of approximately $0.01/hour per endpoint. While minimal, ensure you clean up after completing the lab to avoid unnecessary costs. The storage account also incurs charges for stored data.

:::

---

## Additional references

- [What is a private endpoint?](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview)
- [Azure Private Endpoint DNS configuration](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns)
- [Create a private endpoint - Azure CLI](https://learn.microsoft.com/en-us/azure/private-link/create-private-endpoint-cli)
- [Manage network policies for private endpoints](https://learn.microsoft.com/en-us/azure/private-link/disable-private-endpoint-network-policy)
- [Private endpoint DNS integration](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration)
