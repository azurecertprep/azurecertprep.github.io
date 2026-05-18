---
sidebar_position: 1
title: "Challenge 11 — Virtual Networks & Subnets"
---

# Challenge 11 — Virtual Networks & Subnets

:::info Estimated Time & Cost
⏱️ **45–60 minutes** | 💰 **~$0.10** (VMs for testing, deallocate promptly) | 📊 **Exam Weight: 15–20%**
:::

## Scenario

Contoso is building a multi-tier architecture with a hub-spoke network topology. The hub VNet contains shared services (firewalls, DNS), while spoke VNets host application workloads. You need to design the network with proper segmentation, peering, and routing — then prove it all works with connectivity tests.

## Exam Skills Covered

| Skill | Weight |
|-------|--------|
| Create and configure VNets and subnets | High |
| Configure VNet peering | High |
| Configure public IP addresses | Medium |
| Configure user-defined routes (UDRs) | High |
| Troubleshoot network connectivity | High |

## Sysadmin ↔ Azure Reference

| Traditional | Azure Equivalent |
|-------------|-----------------|
| VLANs | Subnets within a VNet |
| Inter-VLAN routing | VNet peering |
| Static routes on a router | User-Defined Routes (UDRs) |
| Dedicated WAN link between sites | VNet peering (private backbone) |
| `ping` / `traceroute` | Network Watcher (IP flow verify, next hop) |
| Network diagram | VNet topology view in Network Watcher |

## Tasks

### Task 1 — Create the Hub VNet

```bash
# Create a resource group
az group create --name rg-network-lab --location eastus

# Create the Hub VNet with two subnets
az network vnet create \
  --resource-group rg-network-lab \
  --name vnet-hub \
  --address-prefix 10.0.0.0/16 \
  --subnet-name snet-frontend \
  --subnet-prefix 10.0.1.0/24

# Add a backend subnet
az network vnet subnet create \
  --resource-group rg-network-lab \
  --vnet-name vnet-hub \
  --name snet-backend \
  --address-prefix 10.0.2.0/24

# Verify the VNet
az network vnet show -g rg-network-lab -n vnet-hub \
  --query "{Name:name, AddressSpace:addressSpace.addressPrefixes, Subnets:subnets[].{Name:name, Prefix:addressPrefix}}" -o json
```

### Task 2 — Create the Spoke VNet

```bash
# Create the Spoke VNet
az network vnet create \
  --resource-group rg-network-lab \
  --name vnet-spoke \
  --address-prefix 10.1.0.0/16 \
  --subnet-name snet-workloads \
  --subnet-prefix 10.1.1.0/24

# Verify
az network vnet list -g rg-network-lab -o table
```

### Task 3 — Create Bidirectional VNet Peering

```bash
# Get VNet resource IDs
HUB_ID=$(az network vnet show -g rg-network-lab -n vnet-hub --query id -o tsv)
SPOKE_ID=$(az network vnet show -g rg-network-lab -n vnet-spoke --query id -o tsv)

# Create peering: Hub → Spoke
az network vnet peering create \
  --resource-group rg-network-lab \
  --name hub-to-spoke \
  --vnet-name vnet-hub \
  --remote-vnet $SPOKE_ID \
  --allow-vnet-access true \
  --allow-forwarded-traffic true

# Create peering: Spoke → Hub
az network vnet peering create \
  --resource-group rg-network-lab \
  --name spoke-to-hub \
  --vnet-name vnet-spoke \
  --remote-vnet $HUB_ID \
  --allow-vnet-access true \
  --allow-forwarded-traffic true

# Verify peering status (should be "Connected")
az network vnet peering list -g rg-network-lab --vnet-name vnet-hub -o table
az network vnet peering list -g rg-network-lab --vnet-name vnet-spoke -o table
```

### Task 4 — Deploy VMs and Test Connectivity

```bash
# Deploy a VM in the Hub VNet
az vm create \
  --resource-group rg-network-lab \
  --name vm-hub \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-hub \
  --subnet snet-frontend \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address pip-hub \
  --no-wait

# Deploy a VM in the Spoke VNet
az vm create \
  --resource-group rg-network-lab \
  --name vm-spoke \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-spoke \
  --subnet snet-workloads \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address pip-spoke \
  --no-wait

# Wait for both VMs to be created, then get private IPs
az vm list -g rg-network-lab \
  --query "[].{Name:name, PrivateIP:privateIps, PublicIP:publicIps}" -d -o table

# SSH into vm-hub and ping vm-spoke's private IP
HUB_PUBLIC_IP=$(az vm show -g rg-network-lab -n vm-hub -d --query publicIps -o tsv)
SPOKE_PRIVATE_IP=$(az vm show -g rg-network-lab -n vm-spoke -d --query privateIps -o tsv)

echo "SSH into hub: ssh azureuser@$HUB_PUBLIC_IP"
echo "Then ping spoke: ping $SPOKE_PRIVATE_IP"
```

<details>
<summary>💡 Hint — If ping doesn't work</summary>

ICMP (ping) may be blocked by the default NSG. Allow ICMP:
```bash
# Get the NSG name associated with the spoke VM's NIC
NSG_NAME=$(az network nsg list -g rg-network-lab --query "[?contains(name,'spoke')].name" -o tsv)

az network nsg rule create \
  --resource-group rg-network-lab \
  --nsg-name $NSG_NAME \
  --name AllowICMP \
  --priority 100 \
  --protocol Icmp \
  --direction Inbound \
  --access Allow
```
</details>

### Task 5 — Create a Public IP

```bash
# Create a static Standard public IP
az network public-ip create \
  --resource-group rg-network-lab \
  --name pip-static-web \
  --sku Standard \
  --allocation-method Static \
  --version IPv4

# Show the IP address
az network public-ip show -g rg-network-lab -n pip-static-web \
  --query "{Name:name, IP:ipAddress, SKU:sku.name, Method:publicIpAllocationMethod}" -o table
```

### Task 6 — Create a User-Defined Route (UDR)

```bash
# Create a route table
az network route-table create \
  --resource-group rg-network-lab \
  --name rt-spoke-to-hub

# Add a route that forces spoke traffic to hub's frontend subnet
# to go through a simulated NVA (vm-hub's private IP)
HUB_PRIVATE_IP=$(az vm show -g rg-network-lab -n vm-hub -d --query privateIps -o tsv)

az network route-table route create \
  --resource-group rg-network-lab \
  --route-table-name rt-spoke-to-hub \
  --name route-via-hub-nva \
  --address-prefix 10.0.1.0/24 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address $HUB_PRIVATE_IP

# Associate the route table with the spoke subnet
az network vnet subnet update \
  --resource-group rg-network-lab \
  --vnet-name vnet-spoke \
  --name snet-workloads \
  --route-table rt-spoke-to-hub

# Verify the route table association
az network vnet subnet show -g rg-network-lab \
  --vnet-name vnet-spoke -n snet-workloads \
  --query "routeTable.id" -o tsv
```

### Task 7 — Use Network Watcher to Troubleshoot

```bash
# Enable Network Watcher (usually auto-enabled)
az network watcher configure \
  --resource-group NetworkWatcherRG \
  --locations eastus \
  --enabled true 2>/dev/null || true

# IP Flow Verify — check if traffic from spoke VM to hub VM is allowed
az network watcher test-ip-flow \
  --resource-group rg-network-lab \
  --vm vm-spoke \
  --direction Outbound \
  --protocol TCP \
  --local "$SPOKE_PRIVATE_IP:*" \
  --remote "$HUB_PRIVATE_IP:80"

# Next Hop — check where traffic from spoke goes
az network watcher show-next-hop \
  --resource-group rg-network-lab \
  --vm vm-spoke \
  --source-ip $SPOKE_PRIVATE_IP \
  --dest-ip $HUB_PRIVATE_IP

# Show effective routes on the spoke VM's NIC
SPOKE_NIC=$(az vm show -g rg-network-lab -n vm-spoke \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)

az network nic show-effective-route-table \
  --ids $SPOKE_NIC -o table
```

## ✅ Success Criteria

- [ ] Hub VNet (10.0.0.0/16) with frontend and backend subnets
- [ ] Spoke VNet (10.1.0.0/16) with workloads subnet
- [ ] Bidirectional VNet peering showing "Connected" status
- [ ] VMs can ping each other over private IPs through peering
- [ ] Static public IP created
- [ ] UDR forces spoke-to-hub traffic through a virtual appliance IP
- [ ] Network Watcher IP flow verify and next hop return expected results

## 🔧 Break & Fix Scenarios

### Scenario A — Overlapping Address Spaces
```bash
# Try to create a VNet with overlapping address space and peer it
az network vnet create -g rg-network-lab \
  --name vnet-overlap --address-prefix 10.0.0.0/16 \
  --subnet-name default --subnet-prefix 10.0.3.0/24

az network vnet peering create -g rg-network-lab \
  --name hub-to-overlap --vnet-name vnet-hub \
  --remote-vnet vnet-overlap --allow-vnet-access true
# What error do you get? Why can't overlapping VNets be peered?
```

### Scenario B — Invalid Next Hop
```bash
# Create a UDR with a next hop IP that doesn't exist
az network route-table route create \
  --resource-group rg-network-lab \
  --route-table-name rt-spoke-to-hub \
  --name route-to-nowhere \
  --address-prefix 192.168.0.0/24 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.99.99.99
# The route is created but traffic to 192.168.0.0/24 will blackhole. How do you diagnose?
```

### Scenario C — One-Way Peering
```bash
# Delete only one side of the peering
az network vnet peering delete -g rg-network-lab \
  --vnet-name vnet-hub --name hub-to-spoke
# Check the peering status on vnet-spoke:
az network vnet peering show -g rg-network-lab \
  --vnet-name vnet-spoke --name spoke-to-hub \
  --query peeringState -o tsv
# What state is it in? Can traffic still flow?
```

## 📝 Knowledge Check

**1. What is the difference between VNet peering and a VPN gateway?**

<details>
<summary>Show Answer</summary>

| Feature | VNet Peering | VPN Gateway |
|---------|-------------|-------------|
| **Latency** | Very low (Azure backbone) | Higher (encrypted tunnel) |
| **Bandwidth** | No limit (network bandwidth) | Up to ~1.25 Gbps |
| **Encryption** | Not encrypted (private backbone) | IPSec encrypted |
| **Cross-region** | ✅ (global peering) | ✅ |
| **Cross-subscription** | ✅ | ✅ |
| **On-premises** | ❌ | ✅ |
| **Cost** | Ingress + egress per GB | Gateway + egress per GB |
| **Transitivity** | Not transitive by default | Supports transitive routing |
</details>

**2. When should you use User-Defined Routes (UDRs)?**

<details>
<summary>Show Answer</summary>

Use UDRs when you need to override Azure's default system routes:
- **Force traffic through an NVA** (firewall, IDS/IPS) for inspection
- **Route traffic to a VPN gateway** for on-premises connectivity
- **Black-hole traffic** by setting next hop to "None"
- **Override peering routes** to force traffic through a central hub
- **BGP route override** when you need to prefer a specific path

Without UDRs, Azure uses system routes that automatically route between subnets, peered VNets, and the internet.
</details>

**3. What is the difference between system routes and custom routes?**

<details>
<summary>Show Answer</summary>

- **System routes**: Automatically created by Azure. Cover VNet address space, peered VNets, VPN/ExpressRoute gateways, and default internet route (0.0.0.0/0). You cannot delete them.
- **Custom routes (UDRs)**: Created by you via route tables. Override system routes for the same prefix (longest prefix match, then custom > system). Applied at the subnet level.
- **BGP routes**: Propagated from on-premises via VPN/ExpressRoute. Can be overridden by UDRs.

Priority: UDR > BGP > System routes (for the same prefix).
</details>

**4. How does Network Watcher IP flow verify work?**

<details>
<summary>Show Answer</summary>

IP flow verify checks whether a packet is allowed or denied by simulating the NSG rules applied to a VM's NIC and subnet:

1. You specify: VM, direction (inbound/outbound), protocol, local IP:port, remote IP:port
2. It evaluates NSG rules on both the **NIC-level NSG** and the **subnet-level NSG**
3. Returns: Allow or Deny, plus the specific NSG rule name that matched

It does **not** check UDRs, firewalls, or NVAs — only NSG rules. For routing issues, use "Next Hop" instead.
</details>

## 🧹 Cleanup

```bash
# Delete all resources
az group delete --name rg-network-lab --yes --no-wait

echo "Resources are being deleted in the background."
echo "VMs will stop billing immediately upon resource group deletion."
```
