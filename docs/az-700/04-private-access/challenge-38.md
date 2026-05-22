---
sidebar_position: 5
title: "Challenge 38: Service Endpoints & Policies"
sidebar_label: "Challenge 38"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 38: Service endpoints & policies

:::info Estimated time and cost

**45-60 minutes** | **~$0.01** (no additional charge for service endpoints) | **Exam weight: 10-15%**

:::

## Scenario

Fourth Coffee is a financial services company concerned about data exfiltration. Development teams have Azure VMs that access Azure Storage accounts, but the security team discovered that developers could potentially copy data to unauthorized storage accounts. The company wants to use service endpoint policies to restrict outbound access from their subnets to only approved storage accounts, while also understanding when Private Endpoints might be a better fit.

Your task is to enable service endpoints, create policies that restrict access to specific storage accounts, and validate that unauthorized storage accounts are blocked. You will also compare service endpoints with Private Endpoints to recommend the best approach for different scenarios.

### Service endpoints vs Private Endpoints

| Feature | Service Endpoints | Private Endpoints |
|---------|-------------------|-------------------|
| Traffic path | Optimized route over Azure backbone, still uses public IP of PaaS | Traffic goes to a private IP in your VNet |
| DNS | No DNS changes needed | Requires Private DNS zone or custom DNS |
| On-premises access | Not accessible from on-prem via SE alone | Accessible from on-prem (with DNS config) |
| Cost | Free | ~$0.01/h per endpoint + data processing |
| Data exfiltration protection | Requires SE policies (limited to Storage) | Inherent -- traffic stays private |
| IP seen by PaaS | VNet subnet IP (source NAT changes) | Private IP from VNet |
| Granularity | Subnet level | Per-resource |
| Service support for policies | Only Azure Storage | N/A (inherently restricted) |

---

## Task 1: Create storage accounts and a VNet with service endpoints

### Azure CLI

```bash
# Variables
RG="rg-challenge38"
LOCATION="eastus"
VNET_NAME="vnet-workload"
SUBNET_NAME="snet-app"
ALLOWED_STORAGE="stallowedc38$(shuf -i 1000-9999 -n 1)"
BLOCKED_STORAGE="stblockedc38$(shuf -i 1000-9999 -n 1)"

# Create resource group
az group create --name $RG --location $LOCATION

# Create two storage accounts (one allowed, one to be blocked)
az storage account create \
  --resource-group $RG \
  --name $ALLOWED_STORAGE \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

az storage account create \
  --resource-group $RG \
  --name $BLOCKED_STORAGE \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Create VNet and subnet with Microsoft.Storage service endpoint enabled
az network vnet create \
  --resource-group $RG \
  --name $VNET_NAME \
  --location $LOCATION \
  --address-prefixes "10.1.0.0/16" \
  --subnet-name $SUBNET_NAME \
  --subnet-prefixes "10.1.0.0/24"

# Enable service endpoint on the subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --service-endpoints Microsoft.Storage
```

### Azure PowerShell

```powershell
# Variables
$rg = "rg-challenge38"
$location = "eastus"
$vnetName = "vnet-workload"
$subnetName = "snet-app"
$allowedStorage = "stallowedc38$(Get-Random -Minimum 1000 -Maximum 9999)"
$blockedStorage = "stblockedc38$(Get-Random -Minimum 1000 -Maximum 9999)"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Create storage accounts
New-AzStorageAccount -ResourceGroupName $rg -Name $allowedStorage `
  -Location $location -SkuName Standard_LRS -Kind StorageV2

New-AzStorageAccount -ResourceGroupName $rg -Name $blockedStorage `
  -Location $location -SkuName Standard_LRS -Kind StorageV2

# Create VNet
$subnet = New-AzVirtualNetworkSubnetConfig `
  -Name $subnetName `
  -AddressPrefix "10.1.0.0/24" `
  -ServiceEndpoint "Microsoft.Storage"

New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name $vnetName `
  -Location $location `
  -AddressPrefix "10.1.0.0/16" `
  -Subnet $subnet
```

### Portal

1. Create a resource group `rg-challenge38` in **East US**.
2. Create two storage accounts: one named with "allowed" and one with "blocked" in their names.
3. Create a VNet `vnet-workload` with address space `10.1.0.0/16`.
4. Add subnet `snet-app` with prefix `10.1.0.0/24`.
5. In the subnet settings, under **Service endpoints**, add `Microsoft.Storage`.

---

## Task 2: Create a service endpoint policy

Service endpoint policies restrict which Azure Storage accounts can be accessed from a subnet via service endpoints.

### Azure CLI

```bash
# Get the allowed storage account resource ID
ALLOWED_STORAGE_ID=$(az storage account show \
  --name $ALLOWED_STORAGE \
  --resource-group $RG \
  --query id --output tsv)

# Create a service endpoint policy
az network service-endpoint policy create \
  --resource-group $RG \
  --name "sep-allowed-storage" \
  --location $LOCATION

# Add a policy definition restricting to the allowed storage account
az network service-endpoint policy-definition create \
  --resource-group $RG \
  --policy-name "sep-allowed-storage" \
  --name "allow-specific-storage" \
  --service "Microsoft.Storage" \
  --service-resources $ALLOWED_STORAGE_ID
```

### Azure PowerShell

```powershell
# Get the allowed storage account resource ID
$storageAccount = Get-AzStorageAccount -ResourceGroupName $rg -Name $allowedStorage
$resourceId = $storageAccount.Id

# Create the policy definition
$policyDefinition = New-AzServiceEndpointPolicyDefinition `
  -Name "allow-specific-storage" `
  -Description "Allow only approved storage account" `
  -Service "Microsoft.Storage" `
  -ServiceResource $resourceId

# Create the service endpoint policy
$sepolicy = New-AzServiceEndpointPolicy `
  -ResourceGroupName $rg `
  -Name "sep-allowed-storage" `
  -Location $location `
  -ServiceEndpointPolicyDefinition $policyDefinition
```

### Portal

1. Search for **Service endpoint policies** and select **+ Create**.
2. Set resource group to `rg-challenge38`, name to `sep-allowed-storage`, region to **East US**.
3. Select **Next: Policy definitions**.
4. Select **+ Add a resource**:
   - Service: `Microsoft.Storage`
   - Scope: **Single account**
   - Select the allowed storage account.
5. Select **Add**, then **Review + create**, then **Create**.

---

## Task 3: Associate the policy with the subnet

### Azure CLI

```bash
# Associate the service endpoint policy to the subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --service-endpoints Microsoft.Storage \
  --service-endpoint-policy "sep-allowed-storage"
```

### Azure PowerShell

```powershell
$virtualNetwork = Get-AzVirtualNetwork -ResourceGroupName $rg -Name $vnetName

Set-AzVirtualNetworkSubnetConfig `
  -VirtualNetwork $virtualNetwork `
  -Name $subnetName `
  -AddressPrefix "10.1.0.0/24" `
  -ServiceEndpoint "Microsoft.Storage" `
  -ServiceEndpointPolicy $sepolicy

$virtualNetwork | Set-AzVirtualNetwork
```

### Portal

1. Navigate to the service endpoint policy `sep-allowed-storage`.
2. Expand **Settings** and select **Associated subnets**.
3. Select **+ Edit subnet association**.
4. Select VNet `vnet-workload` and subnet `snet-app`.
5. Select **Apply**.

:::warning
Once a service endpoint policy is applied to a subnet, all storage access via the service endpoint is restricted to only the accounts listed in the policy. Ensure all necessary storage accounts are included before applying the policy.
:::

---

## Task 4: Configure storage account firewall with VNet rules

### Azure CLI

```bash
# Set default action to Deny on the allowed storage account
az storage account update \
  --resource-group $RG \
  --name $ALLOWED_STORAGE \
  --default-action Deny

# Add a VNet rule allowing access from the subnet
az storage account network-rule add \
  --resource-group $RG \
  --account-name $ALLOWED_STORAGE \
  --vnet-name $VNET_NAME \
  --subnet $SUBNET_NAME
```

### Azure PowerShell

```powershell
# Set default action to Deny
Update-AzStorageAccountNetworkRuleSet `
  -ResourceGroupName $rg `
  -Name $allowedStorage `
  -DefaultAction Deny

# Add VNet rule
$subnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name $vnetName | `
  Get-AzVirtualNetworkSubnetConfig -Name $subnetName

Add-AzStorageAccountNetworkRule `
  -ResourceGroupName $rg `
  -Name $allowedStorage `
  -VirtualNetworkResourceId $subnet.Id
```

### Portal

1. Navigate to the allowed storage account.
2. Under **Security + networking**, select **Networking**.
3. Set **Public network access** to **Enabled from selected virtual networks and IP addresses**.
4. Under **Virtual networks**, select **+ Add existing virtual network**.
5. Select VNet `vnet-workload` and subnet `snet-app`.
6. Select **Add**, then **Save**.

---

## Task 5: Validate the service endpoint policy

Deploy a test VM in the subnet and verify that only the allowed storage account is accessible.

```bash
# Create a test VM in the subnet
az vm create \
  --resource-group $RG \
  --name "vm-test" \
  --image Ubuntu2204 \
  --vnet-name $VNET_NAME \
  --subnet $SUBNET_NAME \
  --admin-username azureuser \
  --generate-ssh-keys \
  --size Standard_B1s \
  --no-wait

# After VM is running, SSH in and test connectivity
# This should SUCCEED (allowed storage account)
curl -s -o /dev/null -w "%{http_code}" \
  "https://$ALLOWED_STORAGE.blob.core.windows.net/?comp=list"
# Expected: 403 (auth required, but connection works)

# This should FAIL (blocked storage account - connection refused by SE policy)
curl -s -o /dev/null -w "%{http_code}" \
  "https://$BLOCKED_STORAGE.blob.core.windows.net/?comp=list"
# Expected: connection timeout or drop (SE policy blocks it)
```

---

## Break & fix scenarios

### Scenario 1: Service endpoint policy blocking all storage access

**Symptom**: After applying the service endpoint policy, no storage accounts are accessible from the subnet -- even the "allowed" ones return connection failures.

**Root cause**: The `--service-resources` value in the policy definition uses an incorrect resource ID format. The resource ID must be the full ARM resource ID of the storage account.

**Fix**:

```bash
# Verify the policy definition has the correct resource ID
az network service-endpoint policy-definition show \
  --resource-group $RG \
  --policy-name "sep-allowed-storage" \
  --name "allow-specific-storage" \
  --query "serviceResources" -o tsv

# If incorrect, delete and recreate with the proper resource ID
az network service-endpoint policy-definition delete \
  --resource-group $RG \
  --policy-name "sep-allowed-storage" \
  --name "allow-specific-storage"

CORRECT_ID=$(az storage account show --name $ALLOWED_STORAGE --resource-group $RG --query id -o tsv)

az network service-endpoint policy-definition create \
  --resource-group $RG \
  --policy-name "sep-allowed-storage" \
  --name "allow-specific-storage" \
  --service "Microsoft.Storage" \
  --service-resources $CORRECT_ID
```

**Key insight**: The `--service-resources` parameter must be the full ARM resource ID in the format `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/{name}`. Partial IDs or names will not work.

---

### Scenario 2: VNet rule not taking effect

**Symptom**: The storage account firewall has a VNet rule configured, but traffic from the subnet is still being denied with a 403 (AuthorizationFailure) response.

**Root cause**: The service endpoint for `Microsoft.Storage` was not enabled on the subnet before adding the VNet rule. The VNet rule requires an active service endpoint.

**Fix**:

```bash
# Verify service endpoint is enabled on the subnet
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --query "serviceEndpoints[].service" -o tsv

# If Microsoft.Storage is not listed, enable it
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --service-endpoints Microsoft.Storage

# Verify the VNet rule on the storage account
az storage account network-rule list \
  --resource-group $RG \
  --account-name $ALLOWED_STORAGE \
  --query "virtualNetworkRules[].{subnet:virtualNetworkResourceId, state:state}" -o table
```

**Key insight**: Service endpoints and VNet rules work together. The service endpoint on the subnet optimizes the route, and the VNet rule on the storage account grants access. Both must be in place.

---

### Scenario 3: App Service access restriction using SE but internet traffic still works

**Symptom**: An App Service has a service endpoint-based access restriction configured, but internet-based clients can still reach the application.

**Root cause**: The access restriction rules have a higher-priority "Allow All" rule, or the deny-all rule is missing. App Service processes rules in priority order and stops at the first match.

**Fix**:

Check the access restriction rules and ensure a deny-all rule exists with the lowest priority:

```bash
# List current access restrictions
az webapp config access-restriction show \
  --resource-group $RG \
  --name "app-name" \
  --query "ipSecurityRestrictions[].{priority:priority, name:name, action:action, ip:ipAddress, vnetSubnetResourceId:vnetSubnetResourceId}" -o table

# Add a deny-all rule with lowest priority (highest number)
az webapp config access-restriction add \
  --resource-group $RG \
  --name "app-name" \
  --priority 999 \
  --action Deny \
  --ip-address "0.0.0.0/0" \
  --rule-name "DenyAll"
```

**Key insight**: App Service access restrictions are processed top-down by priority number (lowest number = highest priority). There is an implicit "Allow All" at the end unless you explicitly deny. Always add a deny-all catch rule.

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-38-q1",
    question: "What is the primary advantage of service endpoint policies over service endpoints alone?",
    options: [
      "They reduce network latency to Azure services",
      "They prevent data exfiltration by restricting access to specific Azure resource instances \u2705",
      "They enable private IP-based access to PaaS services",
      "They provide DNS resolution for Azure services"
    ],
    correctIndex: 1,
    explanation: "Service endpoint policies add data exfiltration protection by restricting which specific Azure resource instances (e.g., specific storage accounts) can be accessed from a subnet. Without policies, a service endpoint allows access to ALL storage accounts via the optimized route."
  },
  {
    id: "az700-38-q2",
    question: "Which Azure service currently supports service endpoint policies for data exfiltration protection?",
    options: [
      "Azure SQL Database",
      "Azure Key Vault",
      "Azure Storage \u2705",
      "Azure Cosmos DB"
    ],
    correctIndex: 2,
    explanation: "As of the current Azure platform, service endpoint policies are only supported for Azure Storage. For other services, Private Endpoints provide inherent data exfiltration protection."
  },
  {
    id: "az700-38-q3",
    question: "How does traffic routing change when a service endpoint is enabled on a subnet?",
    options: [
      "Traffic is routed through the internet with encryption",
      "A system route is added directing service traffic over the Azure backbone, with the source IP changing to the VNet private IP \u2705",
      "Traffic is routed through a private IP endpoint in the VNet",
      "No routing change occurs; only firewall rules are applied"
    ],
    correctIndex: 1,
    explanation: "When a service endpoint is enabled, Azure adds an optimized system route that directs traffic to the service over the Microsoft backbone network. The source IP of traffic as seen by the PaaS service changes from a public IP to the VNet private IP of the VM."
  },
  {
    id: "az700-38-q4",
    question: "A company needs on-premises clients to access Azure Storage privately. Which approach should they use?",
    options: [
      "Service Endpoints (they extend to on-premises via VPN)",
      "Private Endpoints with DNS forwarding configuration \u2705",
      "Service endpoint policies with conditional forwarders",
      "VNet peering with service endpoints"
    ],
    correctIndex: 1,
    explanation: "Service endpoints only apply to traffic originating from within Azure VNet subnets. They do not extend to on-premises networks. For on-premises access to Azure PaaS services over private connectivity, Private Endpoints with proper DNS configuration are required."
  },
  {
    id: "az700-38-q5",
    question: "What happens if you associate a service endpoint policy with a subnet but forget to include a required storage account in the policy?",
    options: [
      "The policy gracefully allows all storage access until updated",
      "Only the storage accounts listed in the policy are accessible; all others are blocked immediately \u2705",
      "The policy generates a warning but does not block access",
      "The policy only applies after a 24-hour propagation period"
    ],
    correctIndex: 1,
    explanation: "Service endpoint policies are deny-by-default once applied. Only storage accounts explicitly listed in the policy definitions are accessible from the subnet via the service endpoint. All other storage accounts are immediately blocked. This is why you must ensure all required accounts are included before associating the policy."
  },
  {
    id: "az700-38-q6",
    question: "Which statement about service endpoints and Private Endpoints is correct?",
    options: [
      "Service endpoints are more expensive than Private Endpoints",
      "Private Endpoints require no DNS changes and work automatically",
      "Service endpoints expose a private IP in the VNet for the PaaS service",
      "Private Endpoints provide a private IP in the VNet and work with on-premises clients via DNS forwarding \u2705"
    ],
    correctIndex: 3,
    explanation: "Private Endpoints create a network interface with a private IP address in your VNet, enabling access from on-premises via VPN/ExpressRoute with DNS forwarding. Service endpoints do not create a private IP -- they optimize the route but the PaaS service still uses its public endpoint."
  }
]} />

---

## Cleanup

```bash
# Delete all resources
az group delete --name rg-challenge38 --yes --no-wait
```

```powershell
# PowerShell cleanup
Remove-AzResourceGroup -Name "rg-challenge38" -Force -AsJob
```

:::warning Cost management
Service endpoints and service endpoint policies have **no additional cost**. However, the test VM and storage accounts do incur minimal charges. Delete the resource group after completing this challenge.
:::

---

## Summary

In this challenge, you configured service endpoints with policies to prevent data exfiltration to unauthorized storage accounts. You learned how service endpoint policies restrict outbound access at the subnet level, how VNet rules on storage accounts grant inbound access, and the important distinctions between service endpoints and Private Endpoints. Understanding when to use each approach -- and their limitations -- is a key topic on the AZ-700 exam.
