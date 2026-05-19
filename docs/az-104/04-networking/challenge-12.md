---
sidebar_position: 2
title: "Challenge 12: Network Security"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 12: Network security

:::info Estimated Time and Cost

**60 minutes** | **~$0.30** (Bastion incurs hourly charges | delete promptly) | **Exam Weight: 15–20%**

:::
## Scenario

Contoso's security team has completed a review and issued mandates: all network traffic must be explicitly allowed, admin access must go through a bastion host (no public IPs on VMs), and database connections must use private endpoints. Your job is to lock everything down while keeping the application functional.

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Create and configure NSGs | High |
| Create and configure Application Security Groups (ASGs) | High |
| Evaluate effective security rules | Medium |
| Implement Azure Bastion | High |
| Configure service endpoints | Medium |
| Configure private endpoints | High |

## Sysadmin ↔ Azure reference

| Traditional | Azure Equivalent |
|-------------|-----------------|
| Firewall ACL rules (permit/deny) | NSG rules (Allow/Deny + priority) |
| Firewall zones (DMZ, trusted, untrusted) | Application Security Groups (ASGs) |
| Jump box / bastion host on a hardened VM | Azure Bastion (managed PaaS) |
| Direct SQL connection over the network | Private endpoint (private IP in your VNet) |
| IP allow-list on a database | Service endpoint (routes traffic over Azure backbone) |

## Tasks

### Task 1: create an NSG with rules

```bash
# Create a resource group
az group create --name rg-netsec-lab --location eastus

# Create a VNet with subnets
az network vnet create \
  --resource-group rg-netsec-lab \
  --name vnet-secure \
  --address-prefix 10.0.0.0/16 \
  --subnet-name snet-frontend \
  --subnet-prefix 10.0.1.0/24

az network vnet subnet create \
  --resource-group rg-netsec-lab \
  --vnet-name vnet-secure \
  --name snet-backend \
  --address-prefix 10.0.2.0/24

# Create an NSG
az network nsg create \
  --resource-group rg-netsec-lab \
  --name nsg-frontend

# Allow HTTP inbound
az network nsg rule create \
  --resource-group rg-netsec-lab \
  --nsg-name nsg-frontend \
  --name AllowHTTP \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 80

# Allow HTTPS inbound
az network nsg rule create \
  --resource-group rg-netsec-lab \
  --nsg-name nsg-frontend \
  --name AllowHTTPS \
  --priority 110 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 443

# Deny all other inbound traffic (explicit, lower priority)
az network nsg rule create \
  --resource-group rg-netsec-lab \
  --nsg-name nsg-frontend \
  --name DenyAllInbound \
  --priority 4000 \
  --direction Inbound \
  --access Deny \
  --protocol '*' \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges '*'

# List the rules
az network nsg rule list -g rg-netsec-lab --nsg-name nsg-frontend -o table
```

### Task 2: associate the NSG with a subnet

```bash
# Associate NSG with the frontend subnet
az network vnet subnet update \
  --resource-group rg-netsec-lab \
  --vnet-name vnet-secure \
  --name snet-frontend \
  --network-security-group nsg-frontend

# Verify the association
az network vnet subnet show -g rg-netsec-lab \
  --vnet-name vnet-secure -n snet-frontend \
  --query "networkSecurityGroup.id" -o tsv
```

### Task 3: create Application security Groups

```bash
# Create ASGs for logical grouping
az network asg create \
  --resource-group rg-netsec-lab \
  --name asg-webservers

az network asg create \
  --resource-group rg-netsec-lab \
  --name asg-dbservers

# List ASGs
az network asg list -g rg-netsec-lab -o table
```

### Task 4: create NSG rules using ASGs

```bash
# Create an NSG for the backend
az network nsg create \
  --resource-group rg-netsec-lab \
  --name nsg-backend

# Allow web servers to talk to database servers on port 5432 (PostgreSQL)
az network nsg rule create \
  --resource-group rg-netsec-lab \
  --nsg-name nsg-backend \
  --name AllowWebToDb \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-webservers \
  --source-port-ranges '*' \
  --destination-asgs asg-dbservers \
  --destination-port-ranges 5432

# Deny all other inbound to backend
az network nsg rule create \
  --resource-group rg-netsec-lab \
  --nsg-name nsg-backend \
  --name DenyAllInbound \
  --priority 4000 \
  --direction Inbound \
  --access Deny \
  --protocol '*' \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges '*'

# Associate NSG with backend subnet
az network vnet subnet update \
  --resource-group rg-netsec-lab \
  --vnet-name vnet-secure \
  --name snet-backend \
  --network-security-group nsg-backend

# Deploy a VM and assign it to the web ASG
az vm create \
  --resource-group rg-netsec-lab \
  --name vm-web \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-secure \
  --subnet snet-frontend \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address "" \
  --asgs asg-webservers \
  --no-wait

# Deploy a VM and assign it to the database ASG
az vm create \
  --resource-group rg-netsec-lab \
  --name vm-db \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-secure \
  --subnet snet-backend \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address "" \
  --asgs asg-dbservers \
  --no-wait
```

### Task 5: evaluate effective security rules

```bash
# Wait for VMs to finish provisioning
az vm wait -g rg-netsec-lab -n vm-web --created
az vm wait -g rg-netsec-lab -n vm-db --created

# Get the NIC for vm-web
WEB_NIC=$(az vm show -g rg-netsec-lab -n vm-web \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)

# Show effective security rules (combines NIC-level and subnet-level NSGs)
az network nic list-effective-nsg --ids $WEB_NIC -o table

# Show effective route table
az network nic show-effective-route-table --ids $WEB_NIC -o table

# Use Network watcher to test a specific flow
WEB_PRIVATE_IP=$(az vm show -g rg-netsec-lab -n vm-web -d --query privateIps -o tsv)
DB_PRIVATE_IP=$(az vm show -g rg-netsec-lab -n vm-db -d --query privateIps -o tsv)

az network watcher test-ip-flow \
  --resource-group rg-netsec-lab \
  --vm vm-web \
  --direction Outbound \
  --protocol TCP \
  --local "$WEB_PRIVATE_IP:*" \
  --remote "$DB_PRIVATE_IP:5432"
```

### Task 6: deploy Azure bastion

```bash
# Create the required AzureBastionSubnet (must be /26 or larger, must be named exactly this)
az network vnet subnet create \
  --resource-group rg-netsec-lab \
  --vnet-name vnet-secure \
  --name AzureBastionSubnet \
  --address-prefix 10.0.3.0/26

# Create a public IP for bastion (must be Standard SKU, static)
az network public-ip create \
  --resource-group rg-netsec-lab \
  --name pip-bastion \
  --sku Standard \
  --allocation-method Static

# Create Azure bastion
az network bastion create \
  --resource-group rg-netsec-lab \
  --name bastion-secure \
  --public-ip-address pip-bastion \
  --vnet-name vnet-secure \
  --sku Basic \
  --no-wait

echo "Bastion takes 5-10 minutes to deploy."
echo "Once ready, connect to VMs via the Azure Portal → VM → Connect → Bastion"

# Verify bastion
az network bastion show -g rg-netsec-lab -n bastion-secure \
  --query "{Name:name, State:provisioningState, SKU:sku.name}" -o table
```

<details>
<summary>Hint | Connect using Bastion via CLI</summary>

For SSH via Bastion from the CLI (requires the Bastion tunnel):
```bash
az network bastion ssh \
  --resource-group rg-netsec-lab \
  --name bastion-secure \
  --target-resource-id $(az vm show -g rg-netsec-lab -n vm-web --query id -o tsv) \
  --auth-type ssh-key \
  --username azureuser \
  --ssh-key ~/.ssh/id_rsa
```
</details>

### Task 7: configure a Service endpoint

```bash
# Create a storage account
STORAGE_NAME="contosodata$RANDOM"
az storage account create \
  --resource-group rg-netsec-lab \
  --name $STORAGE_NAME \
  --sku Standard_LRS \
  --kind StorageV2

# Enable a service endpoint for Microsoft.Storage on the backend subnet
az network vnet subnet update \
  --resource-group rg-netsec-lab \
  --vnet-name vnet-secure \
  --name snet-backend \
  --service-endpoints Microsoft.Storage

# Restrict the storage account to only accept traffic from the backend subnet
SUBNET_ID=$(az network vnet subnet show \
  -g rg-netsec-lab --vnet-name vnet-secure -n snet-backend --query id -o tsv)

az storage account network-rule add \
  --resource-group rg-netsec-lab \
  --account-name $STORAGE_NAME \
  --subnet $SUBNET_ID

# Set the default action to deny
az storage account update \
  --resource-group rg-netsec-lab \
  --name $STORAGE_NAME \
  --default-action Deny

# Verify network rules
az storage account show -g rg-netsec-lab -n $STORAGE_NAME \
  --query "networkRuleSet" -o json
```

### Task 8: create a private endpoint

```bash
# Disable private endpoint network policies on a subnet
az network vnet subnet update \
  --resource-group rg-netsec-lab \
  --vnet-name vnet-secure \
  --name snet-backend \
  --private-endpoint-network-policies Disabled

# Get the storage account resource ID
STORAGE_ID=$(az storage account show -g rg-netsec-lab -n $STORAGE_NAME --query id -o tsv)

# Create a private endpoint for the storage account
az network private-endpoint create \
  --resource-group rg-netsec-lab \
  --name pe-storage \
  --vnet-name vnet-secure \
  --subnet snet-backend \
  --private-connection-resource-id $STORAGE_ID \
  --group-id blob \
  --connection-name pe-storage-connection

# Verify the private endpoint
az network private-endpoint show -g rg-netsec-lab -n pe-storage \
  --query "{Name:name, Subnet:subnet.id, IP:customDnsConfigs[0].ipAddresses[0], Status:privateLinkServiceConnections[0].privateLinkServiceConnectionState.status}" -o table
```

### Task 9: verify private endpoint connectivity

```bash
# Create a private DNS zone for blob storage
az network private-dns zone create \
  --resource-group rg-netsec-lab \
  --name privatelink.blob.core.windows.net

# Link the DNS zone to the VNet
az network private-dns link vnet create \
  --resource-group rg-netsec-lab \
  --zone-name privatelink.blob.core.windows.net \
  --name link-vnet-secure \
  --virtual-network vnet-secure \
  --registration-enabled false

# Get the private endpoint's NIC IP
PE_NIC_ID=$(az network private-endpoint show -g rg-netsec-lab -n pe-storage \
  --query "networkInterfaces[0].id" -o tsv)
PE_IP=$(az network nic show --ids $PE_NIC_ID \
  --query "ipConfigurations[0].privateIpAddress" -o tsv)

# Create a DNS record pointing the storage FQDN to the private IP
az network private-dns record-set a create \
  --resource-group rg-netsec-lab \
  --zone-name privatelink.blob.core.windows.net \
  --name $STORAGE_NAME

az network private-dns record-set a add-record \
  --resource-group rg-netsec-lab \
  --zone-name privatelink.blob.core.windows.net \
  --record-set-name $STORAGE_NAME \
  --ipv4-address $PE_IP

echo "Storage account $STORAGE_NAME.blob.core.windows.net now resolves to $PE_IP inside the VNet"
echo "From vm-db, run: nslookup $STORAGE_NAME.blob.core.windows.net"
```

## Success criteria

<SuccessChecklist
  storageKey="az104-challenge-12"
  items={[
    "NSG created with HTTP/HTTPS allow rules and deny-all",
    "NSG associated with the frontend subnet",
    "ASGs created for web servers and database servers",
    "NSG rules use ASGs as source/destination",
    "Effective security rules show combined NIC + subnet rules",
    "Azure Bastion deployed | VMs accessible without public IPs",
    "Service endpoint enabled for Storage on the backend subnet",
    "Private endpoint created for the storage account",
    "DNS zone resolves storage FQDN to private IP within the VNet"
  ]}
/>
## Break & fix scenarios

### Scenario a: conflicting NSG rules
```bash
# Add a rule at priority 200 that allows SSH, then another at priority 150 that denies it
az network nsg rule create -g rg-netsec-lab --nsg-name nsg-frontend \
  --name AllowSSH --priority 200 --direction Inbound --access Allow \
  --protocol Tcp --destination-port-ranges 22

az network nsg rule create -g rg-netsec-lab --nsg-name nsg-frontend \
  --name DenySSH --priority 150 --direction Inbound --access Deny \
  --protocol Tcp --destination-port-ranges 22
# Which rule wins? (Lower number = higher priority = evaluated first)
```

### Scenario b: locked out of a VM
```bash
# What if you accidentally remove the SSH allow rule and can't connect?
# Azure bastion bypasses NSG rules on the AzureBastionSubnet
# Connect via Azure portal → VM → connect → bastion
```

### Scenario c: wrong bastion subnet name
```bash
# Try creating bastion with a differently named subnet
az network vnet subnet create -g rg-netsec-lab \
  --vnet-name vnet-secure --name BastionSubnet --address-prefix 10.0.4.0/26
# Bastion requires the subnet to be named EXACTLY "AzureBastionSubnet"
```

## Knowledge check

**1. How does NSG rule priority work?**

<details>
<summary>Show Answer</summary>

- Rules are evaluated from **lowest number (highest priority) to highest number**.
- Priority range: **100 to 4096**.
- The **first matching rule wins** | Azure stops evaluating after a match.
- Default rules (65000-65500) cannot be deleted but can be overridden by lower-priority custom rules.
- If no custom rule matches, the default rules apply (allow VNet-to-VNet, allow load balancer, deny all other inbound).
</details>

**2. What are the default NSG rules?**

<details>
<summary>Show Answer</summary>

**Default Inbound Rules:**
| Priority | Name | Action |
|----------|------|--------|
| 65000 | AllowVNetInBound | Allow VNet ↔ VNet |
| 65001 | AllowAzureLoadBalancerInBound | Allow health probes |
| 65500 | DenyAllInBound | Deny everything else |

**Default Outbound Rules:**
| Priority | Name | Action |
|----------|------|--------|
| 65000 | AllowVNetOutBound | Allow VNet ↔ VNet |
| 65001 | AllowInternetOutBound | Allow outbound internet |
| 65500 | DenyAllOutBound | Deny everything else |
</details>

**3. How are inbound rules processed when NSGs exist on both NIC and subnet?**

<details>
<summary>Show Answer</summary>

**Inbound traffic**: Subnet NSG is evaluated **first**, then NIC NSG. Traffic must be allowed by **both** NSGs.

**Outbound traffic**: NIC NSG is evaluated **first**, then subnet NSG. Traffic must be allowed by **both** NSGs.

This means the most restrictive combination applies. If the subnet NSG allows port 80 but the NIC NSG denies it, traffic is denied.
</details>

**4. What is the difference between service endpoints and private endpoints?**

<details>
<summary>Show Answer</summary>

| Feature | Service Endpoint | Private Endpoint |
|---------|-----------------|-----------------|
| **How it works** | Routes traffic to Azure service over Azure backbone; service still uses public IP | Creates a private IP in your VNet mapped to the service |
| **DNS resolution** | Public IP (but traffic stays on backbone) | Private IP via Private DNS Zone |
| **Access from on-premises** | ❌ Not supported | ✅ Supported (via VPN/ExpressRoute + DNS) |
| **Cost** | Free | Charges for the private endpoint + data processing |
| **Granularity** | Subnet-level | Resource-level (specific storage account, SQL server) |
| **Exam tip** | Simpler to set up, limited to Azure backbone | More secure, works with hybrid networks |
</details>

**5. What are the Azure Bastion subnet requirements?**

<details>
<summary>Show Answer</summary>

- Subnet must be named **exactly** `AzureBastionSubnet` (case-sensitive)
- Minimum size: **/26** (64 addresses) or larger
- Must be in the **same VNet** as the VMs you want to connect to (or peered VNets)
- Requires a **Standard SKU, Static** public IP
- **No other resources** can be deployed in the AzureBastionSubnet
- NSG on AzureBastionSubnet must allow specific inbound/outbound rules (Azure manages this with Basic SKU)
</details>

## Cleanup

```bash
# Delete all resources: bastion incurs hourly charges so clean up promptly!
az group delete --name rg-netsec-lab --yes --no-wait

echo "Resources are being deleted in the background."
echo "IMPORTANT: Verify in the portal that the resource group is deleted."
echo "Azure Bastion charges ~$0.19/hour while running."
```
