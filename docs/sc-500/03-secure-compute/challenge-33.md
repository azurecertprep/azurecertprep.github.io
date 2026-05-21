---
sidebar_position: 33
title: "Challenge 33: Azure Bastion and JIT VM Access"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 33: Azure Bastion and JIT VM Access

## Exam skills covered

- Deploy Azure Bastion for secure RDP/SSH access without public IPs
- Configure Just-In-Time (JIT) VM access in Defender for Cloud
- Implement privileged access workstation patterns for Azure VMs
- Configure Bastion shareable links and session recording
- Integrate Bastion with Entra ID Conditional Access and PIM

## Scenario

Contoso Ltd has received audit findings that 47 production VMs have public IP addresses with RDP (3389) and SSH (22) ports open to the internet. The security team must eliminate all direct internet exposure while maintaining operational access for administrators. You must deploy Azure Bastion and JIT VM access as the exclusive management plane for VM connectivity.

---

## Prerequisites

- Azure subscription with Contributor access
- Microsoft Defender for Servers Plan 2 enabled (for JIT)
- Azure VMs deployed without public IPs (or to be remediated)
- Azure CLI installed
- Network Contributor role for Bastion deployment

---

## Task 1: Deploy Azure Bastion (Standard SKU)

Deploy Azure Bastion with Standard tier features including native client support, shareable links, and session recording.

```bash
# Create resource group
az group create --name "rg-contoso-bastion" --location "eastus"

# Create VNet with dedicated AzureBastionSubnet
az network vnet create \
    --resource-group "rg-contoso-bastion" \
    --name "vnet-contoso-hub" \
    --address-prefix "10.0.0.0/16" \
    --subnet-name "AzureBastionSubnet" \
    --subnet-prefix "10.0.1.0/24"

# Create additional subnet for VMs
az network vnet subnet create \
    --resource-group "rg-contoso-bastion" \
    --vnet-name "vnet-contoso-hub" \
    --name "subnet-servers" \
    --address-prefix "10.0.2.0/24"

# Create public IP for Bastion
az network public-ip create \
    --resource-group "rg-contoso-bastion" \
    --name "pip-bastion-hub" \
    --sku "Standard" \
    --allocation-method "Static" \
    --location "eastus"

# Deploy Azure Bastion (Standard SKU)
az network bastion create \
    --resource-group "rg-contoso-bastion" \
    --name "bastion-contoso-hub" \
    --public-ip-address "pip-bastion-hub" \
    --vnet-name "vnet-contoso-hub" \
    --sku "Standard" \
    --enable-tunneling true \
    --enable-ip-connect true \
    --scale-units 2 \
    --location "eastus"

# Enable shareable links and session recording
az network bastion update \
    --resource-group "rg-contoso-bastion" \
    --name "bastion-contoso-hub" \
    --enable-shareable-link true \
    --enable-session-recording true
```

---

## Task 2: Create test VMs without public IPs

Deploy VMs that can only be accessed through Bastion.

```bash
# Create a Linux VM without public IP
az vm create \
    --resource-group "rg-contoso-bastion" \
    --name "vm-linux-web01" \
    --image "Canonical:ubuntu-24_04-lts:server:latest" \
    --size "Standard_B2ms" \
    --vnet-name "vnet-contoso-hub" \
    --subnet "subnet-servers" \
    --public-ip-address "" \
    --nsg "" \
    --admin-username "azadmin" \
    --generate-ssh-keys

# Create a Windows VM without public IP
az vm create \
    --resource-group "rg-contoso-bastion" \
    --name "vm-win-db01" \
    --image "MicrosoftWindowsServer:WindowsServer:2022-datacenter-g2:latest" \
    --size "Standard_B2ms" \
    --vnet-name "vnet-contoso-hub" \
    --subnet "subnet-servers" \
    --public-ip-address "" \
    --nsg "" \
    --admin-username "azadmin" \
    --admin-password "C0nt0s0!SecureP@ss2024"

# Create NSG that blocks all direct RDP/SSH from internet
az network nsg create \
    --resource-group "rg-contoso-bastion" \
    --name "nsg-servers-deny-direct"

az network nsg rule create \
    --resource-group "rg-contoso-bastion" \
    --nsg-name "nsg-servers-deny-direct" \
    --name "DenyRDP-Internet" \
    --priority 100 \
    --direction "Inbound" \
    --access "Deny" \
    --source-address-prefixes "Internet" \
    --destination-port-ranges 3389 \
    --protocol "Tcp"

az network nsg rule create \
    --resource-group "rg-contoso-bastion" \
    --nsg-name "nsg-servers-deny-direct" \
    --name "DenySSH-Internet" \
    --priority 110 \
    --direction "Inbound" \
    --access "Deny" \
    --source-address-prefixes "Internet" \
    --destination-port-ranges 22 \
    --protocol "Tcp"

# Associate NSG with servers subnet
az network vnet subnet update \
    --resource-group "rg-contoso-bastion" \
    --vnet-name "vnet-contoso-hub" \
    --name "subnet-servers" \
    --network-security-group "nsg-servers-deny-direct"
```

---

## Task 3: Connect to VMs using Bastion native client

Use the Azure CLI native client tunneling feature for SSH and RDP connections.

```bash
# SSH into Linux VM via Bastion native client tunnel
az network bastion ssh \
    --resource-group "rg-contoso-bastion" \
    --name "bastion-contoso-hub" \
    --target-resource-id "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Compute/virtualMachines/vm-linux-web01" \
    --auth-type "ssh-key" \
    --username "azadmin" \
    --ssh-key "~/.ssh/id_rsa"

# RDP into Windows VM via Bastion tunnel
az network bastion rdp \
    --resource-group "rg-contoso-bastion" \
    --name "bastion-contoso-hub" \
    --target-resource-id "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Compute/virtualMachines/vm-win-db01"

# Create a tunnel for custom port forwarding
az network bastion tunnel \
    --resource-group "rg-contoso-bastion" \
    --name "bastion-contoso-hub" \
    --target-resource-id "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Compute/virtualMachines/vm-linux-web01" \
    --resource-port 22 \
    --port 2222
# Then connect: ssh azadmin@127.0.0.1 -p 2222

# Connect using Entra ID authentication (for VMs with AAD login extension)
az network bastion ssh \
    --resource-group "rg-contoso-bastion" \
    --name "bastion-contoso-hub" \
    --target-resource-id "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Compute/virtualMachines/vm-linux-web01" \
    --auth-type "AAD"
```

---

## Task 4: Configure Just-In-Time VM access

Enable JIT access to provide time-limited, approval-based connectivity to VMs.

```bash
# Create JIT VM access policy via REST API (az security jit-policy only supports list/show)
az rest --method PUT \
    --url "https://management.azure.com/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Security/locations/eastus/jitNetworkAccessPolicies/default?api-version=2020-01-01" \
    --body '{
        "kind": "Basic",
        "properties": {
            "virtualMachines": [{
                "id": "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Compute/virtualMachines/vm-linux-web01",
                "ports": [
                    {"number": 22, "protocol": "TCP", "allowedSourceAddressPrefix": "*", "maxRequestAccessDuration": "PT3H"},
                    {"number": 3389, "protocol": "TCP", "allowedSourceAddressPrefix": "*", "maxRequestAccessDuration": "PT3H"}
                ]
            }, {
                "id": "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Compute/virtualMachines/vm-win-db01",
                "ports": [
                    {"number": 3389, "protocol": "TCP", "allowedSourceAddressPrefix": "*", "maxRequestAccessDuration": "PT1H"},
                    {"number": 1433, "protocol": "TCP", "allowedSourceAddressPrefix": "10.0.0.0/8", "maxRequestAccessDuration": "PT2H"}
                ]
            }]
        }
    }'

# Request (initiate) JIT access for a specific VM
az rest --method POST \
    --url "https://management.azure.com/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Security/locations/eastus/jitNetworkAccessPolicies/default/initiate?api-version=2020-01-01" \
    --body '{
        "virtualMachines": [{
            "id": "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion/providers/Microsoft.Compute/virtualMachines/vm-linux-web01",
            "ports": [{"number": 22, "duration": "PT1H", "allowedSourceAddressPrefix": "203.0.113.50"}]
        }]
    }'

# List active JIT policies
az security jit-policy list \
    --resource-group "rg-contoso-bastion" \
    --query "[].{name: name, vms: virtualMachines[].id}" \
    --output table
```

---

## Task 5: Integrate with Entra ID and PIM for elevated access

Configure Entra ID authentication for VMs and require PIM activation for administrative access.

```bash
# Install AAD Login extension on Linux VM
az vm extension set \
    --resource-group "rg-contoso-bastion" \
    --vm-name "vm-linux-web01" \
    --name "AADSSHLoginForLinux" \
    --publisher "Microsoft.Azure.ActiveDirectory"

# Install AAD Login extension on Windows VM
az vm extension set \
    --resource-group "rg-contoso-bastion" \
    --vm-name "vm-win-db01" \
    --name "AADLoginForWindows" \
    --publisher "Microsoft.Azure.ActiveDirectory"

# Assign "Virtual Machine Administrator Login" role (eligible via PIM)
az role assignment create \
    --assignee "admin-group-object-id" \
    --role "Virtual Machine Administrator Login" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion"

# Assign "Virtual Machine User Login" for standard users
az role assignment create \
    --assignee "standard-users-group-id" \
    --role "Virtual Machine User Login" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion"
```

Configure PIM for Just-in-Time role activation:

1. Navigate to **Entra ID** → **Privileged Identity Management** → **Azure resources**
2. Select the subscription → **Roles** → "Virtual Machine Administrator Login"
3. Click **Settings** → Configure:
   - **Activation maximum duration**: 2 hours
   - **Require justification on activation**: Yes
   - **Require approval**: Yes (set approver group)
   - **Require MFA on activation**: Yes
4. Under **Assignment**:
   - **Allow permanent eligible assignment**: No
   - **Expire eligible assignments after**: 90 days

---

## Task 6: Remove public IPs and enforce Bastion-only access

Remediate existing VMs by removing public IPs and enforcing Bastion as the sole access path.

```bash
# Find all VMs with public IPs in the subscription
az vm list-ip-addresses \
    --query "[?virtualMachine.network.publicIpAddresses[0].id != null].{vm: virtualMachine.name, rg: virtualMachine.resourceGroup, publicIp: virtualMachine.network.publicIpAddresses[0].ipAddress}" \
    --output table

# Remove public IP from a VM (dissociate then delete)
# Get NIC details
NIC_ID=$(az vm show --resource-group "rg-contoso-bastion" --name "vm-linux-web01" --query "networkProfile.networkInterfaces[0].id" -o tsv)

# Update NIC to remove public IP
az network nic ip-config update \
    --resource-group "rg-contoso-bastion" \
    --nic-name "vm-linux-web01VMNic" \
    --name "ipconfigvm-linux-web01" \
    --remove publicIpAddress

# Assign Azure Policy to deny public IPs on VMs
az policy assignment create \
    --name "deny-vm-public-ip" \
    --display-name "Deny Public IP on VMs" \
    --policy "/providers/Microsoft.Authorization/policyDefinitions/83a86a26-fd1f-447c-b59d-e51f44264114" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion" \
    --enforcement-mode "Default"

# Assign Azure Policy to require NSG on subnets
az policy assignment create \
    --name "require-nsg-subnet" \
    --display-name "Require NSG on Subnets" \
    --policy "/providers/Microsoft.Authorization/policyDefinitions/e71308d3-144b-4262-b144-efdc3cc90517" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-bastion" \
    --enforcement-mode "Default"
```

---

## Break & Fix

### Scenario 1: Bastion connection times out — "Unable to connect to target VM"

Administrators report that Bastion connections to VMs in a peered VNet fail with timeout errors. VMs in the Bastion's local VNet work fine.

<details>
<summary>Show solution</summary>

```bash
# 1. Verify VNet peering is configured correctly
az network vnet peering list \
    --resource-group "rg-contoso-bastion" \
    --vnet-name "vnet-contoso-hub" \
    --output table

# 2. Ensure peering allows traffic from Bastion subnet
az network vnet peering show \
    --resource-group "rg-contoso-bastion" \
    --vnet-name "vnet-contoso-hub" \
    --name "hub-to-spoke" \
    --query "{allowForwarded: allowForwardedTraffic, allowGateway: allowGatewayTransit, useRemoteGateways: useRemoteGateways, peeringState: peeringState}"

# 3. Fix: Enable IP-based connection (required for cross-VNet)
az network bastion update \
    --resource-group "rg-contoso-bastion" \
    --name "bastion-contoso-hub" \
    --enable-ip-connect true

# 4. Verify NSG on target VM allows Bastion traffic
# Bastion communicates from its subnet to the VM on ports 22/3389
# Check target VM's NSG allows inbound from AzureBastionSubnet
az network nsg rule create \
    --resource-group "rg-contoso-spoke" \
    --nsg-name "nsg-spoke-servers" \
    --name "AllowBastionInbound" \
    --priority 200 \
    --direction "Inbound" \
    --access "Allow" \
    --source-address-prefixes "10.0.1.0/24" \
    --destination-port-ranges "22" "3389" \
    --protocol "Tcp"

# 5. Verify peering state is "Connected" on both sides
az network vnet peering show \
    --resource-group "rg-contoso-spoke" \
    --vnet-name "vnet-contoso-spoke" \
    --name "spoke-to-hub" \
    --query "peeringState"
```

</details>

### Scenario 2: JIT access request approved but VM remains unreachable

A JIT request was approved for port 22 on a Linux VM, but the administrator still cannot SSH to the VM through Bastion.

<details>
<summary>Show solution</summary>

```bash
# 1. Verify JIT request was properly activated
az security jit-policy list \
    --resource-group "rg-contoso-bastion" \
    --query "[].virtualMachines[].ports[].{number: number, status: status, sourceAddressPrefix: allowedSourceAddressPrefix}"

# 2. Check if the NSG rule was actually created by JIT
az network nsg rule list \
    --resource-group "rg-contoso-bastion" \
    --nsg-name "nsg-servers-deny-direct" \
    --query "[?contains(name, 'JIT')]" \
    --output table

# 3. Common issue: JIT creates the rule on the VM's NSG,
# but there's also a subnet-level NSG blocking traffic
# Check subnet NSG
az network vnet subnet show \
    --resource-group "rg-contoso-bastion" \
    --vnet-name "vnet-contoso-hub" \
    --name "subnet-servers" \
    --query "networkSecurityGroup.id"

# 4. The subnet NSG has a DenyAll rule at higher priority
# JIT only modifies the VM-level NSG, not the subnet NSG
# Fix: Ensure subnet NSG allows Bastion traffic
az network nsg rule create \
    --resource-group "rg-contoso-bastion" \
    --nsg-name "nsg-servers-deny-direct" \
    --name "AllowBastionSSH" \
    --priority 150 \
    --direction "Inbound" \
    --access "Allow" \
    --source-address-prefixes "10.0.1.0/24" \
    --destination-port-ranges 22 \
    --protocol "Tcp"

# 5. The DenyRDP/SSH rule at priority 100 blocks everything
# including Bastion. Adjust priority so Bastion allow comes first
az network nsg rule update \
    --resource-group "rg-contoso-bastion" \
    --nsg-name "nsg-servers-deny-direct" \
    --name "DenySSH-Internet" \
    --priority 200
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the minimum Bastion SKU required to use native client tunneling (az network bastion ssh/rdp)?",
    options: [
      "Basic SKU",
      "Standard SKU with tunneling enabled",
      "Premium SKU only",
      "Any SKU supports native client"
    ],
    correctIndex: 1,
    explanation: "Native client tunneling (using az network bastion ssh/rdp commands) requires the Standard SKU with the tunneling feature explicitly enabled. Basic SKU only supports browser-based connections through the Azure portal."
  },
  {
    question: "How does JIT VM access work with Azure Bastion?",
    options: [
      "JIT replaces Bastion — you don't need both",
      "JIT creates time-limited NSG rules that allow Bastion to reach the VM on specific ports, adding a time-based access control layer",
      "JIT provides a separate connection path that bypasses Bastion",
      "JIT only works with public IP addresses, not Bastion"
    ],
    correctIndex: 1,
    explanation: "JIT and Bastion are complementary: Bastion eliminates public IPs and provides the secure connection proxy, while JIT adds time-limited NSG rules that control when ports are open — even to Bastion. Together, they provide both network isolation and temporal access control."
  },
  {
    question: "What happens when an administrator's PIM role assignment for 'Virtual Machine Administrator Login' expires during an active Bastion session?",
    options: [
      "The session is immediately terminated",
      "The session continues but no new sessions can be established until re-activation",
      "PIM has no effect on active Bastion sessions",
      "The VM automatically reboots to enforce the policy"
    ],
    correctIndex: 1,
    explanation: "Existing Bastion sessions continue until disconnected (sessions are already authenticated). However, new connection attempts will fail because the role assignment has expired and the user no longer has the RBAC permission needed to connect."
  },
  {
    question: "Which Azure Policy should be enforced to prevent administrators from creating VMs with public IP addresses?",
    options: [
      "Deny all network security group modifications",
      "Network interfaces should not have public IPs (deny public IP association on NICs)",
      "All subnets must have a route table",
      "VMs must be deployed in availability zones"
    ],
    correctIndex: 1,
    explanation: "The policy 'Network interfaces should not have public IPs' (or 'Not allowed resource types: Microsoft.Network/publicIPAddresses') prevents VMs from being created with public IPs, enforcing Bastion as the only access path."
  }
]} />

## Cleanup

```bash
# Delete all resources
az group delete --name "rg-contoso-bastion" --yes --no-wait
```
