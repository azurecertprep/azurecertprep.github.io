---
sidebar_position: 24
title: "Challenge 24: User-Defined Routes & Traffic Control"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 24: User-Defined routes & Traffic control

:::info Estimated Time and Cost

**60-75 minutes** | **Estimated cost**: ~$0.25 | **Exam Weight: 15-20%**

:::

## Scenario

Contoso Ltd. has a hub-spoke network topology in Azure. The security team requires all internet-bound traffic from spoke VNets to pass through a central Network Virtual Appliance (NVA) in the hub VNet for inspection and logging. You must implement user-defined routes (UDRs) to override Azure's default routing and enforce this traffic flow pattern (forced tunneling).

## Exam skills covered

- Create and configure route tables
- Create and configure user-defined routes
- Associate route tables with subnets
- Configure forced tunneling
- Configure next-hop types (Virtual Appliance, VNet Gateway, Internet, None)
- Diagnose routing issues using effective routes

## Sysadmin ↔ Azure reference

| On-Prem / Traditional | Azure Equivalent |
|---|---|
| Static routes on routers | User-Defined Routes (UDRs) |
| Default gateway configuration | Next hop in route table |
| Router/Firewall as traffic inspector | Network Virtual Appliance (NVA) |
| Policy-based routing (PBR) | Route table associated with subnet |
| Force traffic through proxy/firewall | Forced tunneling |
| `ip route show` / `route print` | Effective routes view |
| BGP route tables | VNet Gateway route propagation |

## Setup

```bash
# Variables
RG="rg-az104-challenge24"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION
```

## Tasks

### Task 1: create Hub-Spoke VNet topology

```bash
# Create Hub VNet
az network vnet create \
  --resource-group $RG \
  --name vnet-hub \
  --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-nva \
  --subnet-prefix 10.0.1.0/24

# Add a GatewaySubnet to hub (for VPN scenarios)
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-hub \
  --name GatewaySubnet \
  --address-prefix 10.0.255.0/27

# Create spoke VNet
az network vnet create \
  --resource-group $RG \
  --name vnet-spoke \
  --address-prefix 10.1.0.0/16 \
  --subnet-name subnet-workload \
  --subnet-prefix 10.1.1.0/24

# Peer Hub to spoke
az network vnet peering create \
  --resource-group $RG \
  --name hub-to-spoke \
  --vnet-name vnet-hub \
  --remote-vnet vnet-spoke \
  --allow-forwarded-traffic \
  --allow-gateway-transit

# Peer spoke to Hub
az network vnet peering create \
  --resource-group $RG \
  --name spoke-to-hub \
  --vnet-name vnet-spoke \
  --remote-vnet vnet-hub \
  --allow-forwarded-traffic \
  --use-remote-gateways false
```

### Task 2: deploy a simulated Network Virtual appliance (nva)

```bash
# Create NVA VM in the hub
az vm create \
  --resource-group $RG \
  --name vm-nva \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-hub \
  --subnet subnet-nva \
  --private-ip-address 10.0.1.4 \
  --public-ip-address nva-pip \
  --admin-username azureuser \
  --generate-ssh-keys

# Enable IP forwarding on the NVA NIC (critical for routing)
NVA_NIC=$(az vm show -g $RG -n vm-nva \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)
NVA_NIC_NAME=$(basename $NVA_NIC)

az network nic update \
  --resource-group $RG \
  --name $NVA_NIC_NAME \
  --ip-forwarding true

# Enable IP forwarding inside the VM OS
az vm run-command invoke \
  --resource-group $RG \
  --name vm-nva \
  --command-id RunShellScript \
  --scripts "sudo sysctl -w net.ipv4.ip_forward=1 && echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf && sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE"
```

:::tip IP Forwarding

For an Azure VM to act as a router/NVA, IP forwarding must be enabled at TWO levels:
1. Azure NIC level (`az network nic update --ip-forwarding true`)
2. OS level (`sysctl net.ipv4.ip_forward=1`)

Without both, forwarded packets will be dropped.

:::
### Task 3: create a route Table

```bash
# Create a route table for the spoke subnet
az network route-table create \
  --resource-group $RG \
  --name rt-spoke-workload \
  --disable-bgp-route-propagation true

# Verify route table
az network route-table show \
  --resource-group $RG \
  --name rt-spoke-workload \
  --query "{Name:name, DisableBGP:disableBgpRoutePropagation}" -o table
```

:::tip BGP Route Propagation

Setting `--disable-bgp-route-propagation true` prevents routes learned via BGP (from VPN/ExpressRoute gateways) from being injected into the route table. This gives you full control over routing for that subnet.

:::
### Task 4: create User-Defined routes

```bash
# Route all internet traffic (0.0.0.0/0) through the NVA
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-workload \
  --name route-to-internet \
  --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.4

# Route traffic to hub VNet through the NVA
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-workload \
  --name route-to-hub \
  --address-prefix 10.0.0.0/16 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.4

# Create a "black hole" route to drop traffic to a specific range
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-workload \
  --name route-block-range \
  --address-prefix 192.168.0.0/16 \
  --next-hop-type None

# List all routes in the table
az network route-table route list \
  --resource-group $RG \
  --route-table-name rt-spoke-workload -o table
```

### Task 5: associate route Table with subnet

```bash
# Associate the route table with the spoke workload subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-spoke \
  --name subnet-workload \
  --route-table rt-spoke-workload

# Verify association
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name vnet-spoke \
  --name subnet-workload \
  --query "{Subnet:name, RouteTable:routeTable.id}" -o table
```

### Task 6: deploy a workload VM and verify routing

```bash
# Create a workload VM in the spoke
az vm create \
  --resource-group $RG \
  --name vm-workload \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-spoke \
  --subnet subnet-workload \
  --public-ip-address workload-pip \
  --admin-username azureuser \
  --generate-ssh-keys

# Check effective routes on the workload VM NIC
WORKLOAD_NIC=$(az vm show -g $RG -n vm-workload \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)
WORKLOAD_NIC_NAME=$(basename $WORKLOAD_NIC)

az network nic show-effective-route-table \
  --resource-group $RG \
  --name $WORKLOAD_NIC_NAME -o table
```

### Task 7: verify effective routes and diagnose

```bash
# Show effective routes (combines system routes + UDRs)
az network nic show-effective-route-table \
  --resource-group $RG \
  --name $WORKLOAD_NIC_NAME -o table

# Expected output should show:
# - 0.0.0.0/0 -> VirtualAppliance (10.0.1.4) [User route]
# - 10.0.0.0/16 -> VirtualAppliance (10.0.1.4) [User route]
# - 192.168.0.0/16 -> none [User route - black hole]
# - 10.1.0.0/16 -> VnetLocal [System route]
```

**Portal Steps:**
1. Navigate to the VM NIC > **Effective routes**
2. Compare User routes vs System routes
3. Note that User routes override System routes for the same prefix

### Task 8: understand Next-Hop types

Create routes demonstrating each next-hop type:

```bash
# Create a second route table for demonstration
az network route-table create \
  --resource-group $RG \
  --name rt-demo-nexthops

# Next-hop: VirtualAppliance (send to a specific IP | firewall/NVA)
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-demo-nexthops \
  --name demo-virtual-appliance \
  --address-prefix 172.16.0.0/12 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.4

# Next-hop: VnetGateway (send to VPN/ExpressRoute gateway)
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-demo-nexthops \
  --name demo-vnet-gateway \
  --address-prefix 192.168.100.0/24 \
  --next-hop-type VirtualNetworkGateway

# Next-hop: internet (override to force direct internet path)
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-demo-nexthops \
  --name demo-internet \
  --address-prefix 203.0.113.0/24 \
  --next-hop-type Internet

# Next-hop: none (black hole | drop traffic)
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-demo-nexthops \
  --name demo-drop \
  --address-prefix 10.99.0.0/16 \
  --next-hop-type None

# List all demo routes
az network route-table route list \
  --resource-group $RG \
  --route-table-name rt-demo-nexthops -o table
```

### Task 9: implement forced tunneling

:::tip Forced Tunneling

Forced tunneling redirects all internet-bound traffic (0.0.0.0/0) from Azure back to on-premises via a VPN gateway or through an NVA. This ensures all traffic is inspected before reaching the internet.

:::
```bash
# Forced tunneling via UDR is already in place (Task 4):
# route-to-internet: 0.0.0.0/0 -> VirtualAppliance (10.0.1.4)

# For VPN-based forced tunneling, you would:
# 1. create a VPN Gateway in the hub
# 2. configure the default route (0.0.0.0/0) via BGP from on-premises
# 3. OR create a UDR with next-hop VirtualNetworkGateway

# Verify forced tunneling is active
az network nic show-effective-route-table \
  --resource-group $RG \
  --name $WORKLOAD_NIC_NAME \
  --query "[?addressPrefix[0]=='0.0.0.0/0']" -o table
```

## Success criteria

<SuccessChecklist
  storageKey="az104-challenge-24"
  items={[
    "Hub-spoke VNet topology created with peering",
    "NVA VM deployed with IP forwarding enabled (NIC + OS level)",
    "Route table created with BGP propagation disabled",
    "UDR for internet traffic (0.0.0.0/0) pointing to NVA",
    "UDR for cross-VNet traffic pointing to NVA",
    "Black hole route (next-hop None) configured",
    "Route table associated with spoke subnet",
    "Effective routes show UDRs overriding system routes",
    "All next-hop types understood and demonstrated"
  ]}
/>
## Break & fix scenarios

### Scenario a: NVA IP forwarding missing

```bash
# Disable IP forwarding on the NVA NIC
az network nic update \
  --resource-group $RG \
  --name $NVA_NIC_NAME \
  --ip-forwarding false

# Try to reach the internet from the workload VM: it will fail
# because packets reach the NVA but are dropped (not forwarded)

# Diagnosis: check NIC IP forwarding setting
az network nic show -g $RG -n $NVA_NIC_NAME \
  --query "enableIPForwarding"

# Fix: re-enable IP forwarding
az network nic update \
  --resource-group $RG \
  --name $NVA_NIC_NAME \
  --ip-forwarding true
```

### Scenario b: wrong Next-Hop IP address

```bash
# Create a route with wrong NVA IP
az network route-table route update \
  --resource-group $RG \
  --route-table-name rt-spoke-workload \
  --name route-to-internet \
  --next-hop-ip-address 10.0.1.99

# Traffic is now sent to a non-existent IP: packets are black-holed
# Diagnosis: check effective routes and verify next-hop IP exists
# Fix: update to correct NVA IP (10.0.1.4)
az network route-table route update \
  --resource-group $RG \
  --route-table-name rt-spoke-workload \
  --name route-to-internet \
  --next-hop-ip-address 10.0.1.4
```

### Scenario c: route Table not associated

```bash
# Disassociate route table from subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-spoke \
  --name subnet-workload \
  --remove routeTable

# Traffic now uses default system routes (direct to internet)
# Diagnosis: check subnet configuration
az network vnet subnet show -g $RG --vnet-name vnet-spoke -n subnet-workload \
  --query "routeTable"

# Fix: re-associate
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-spoke \
  --name subnet-workload \
  --route-table rt-spoke-workload
```

## Knowledge check

**1. What is the order of route precedence in Azure?**

<details>
<summary>Show Answer</summary>

Route selection follows longest prefix match. When multiple routes match the same prefix:
1. **User-Defined Routes (UDRs)** | highest priority
2. **BGP routes** | from VPN/ExpressRoute gateways
3. **System routes** | Azure default routes

Within the same source, the most specific prefix (longest match) wins.
</details>

**2. What are Azure's default system routes?**

<details>
<summary>Show Answer</summary>

Every subnet automatically gets these system routes:
| Prefix | Next Hop |
|--------|----------|
| VNet address space | VNet Local |
| 0.0.0.0/0 | Internet |
| 10.0.0.0/8 | None (drop) |
| 172.16.0.0/12 | None (drop) |
| 192.168.0.0/16 | None (drop) |
| 100.64.0.0/10 | None (drop) |

The RFC 1918 "None" routes are overridden when you create subnets in those ranges.
</details>

**3. What happens when the NVA (next-hop) is unavailable?**

<details>
<summary>Show Answer</summary>

If the NVA VM is stopped or the NIC is down, traffic routed to it is **dropped** (black-holed). Azure does NOT automatically fail over to the system route. This is why production NVA deployments should use:
- Load balancer in front of multiple NVA instances
- Azure Firewall (managed, HA by default)
- Health probes to detect NVA failure
</details>

**4. What is the difference between disabling BGP route propagation and keeping it enabled?**

<details>
<summary>Show Answer</summary>

- **Enabled (default):** Routes learned via BGP from VPN/ExpressRoute gateways are automatically added to the subnet's effective routes. On-premises routes are visible.
- **Disabled:** BGP-learned routes are NOT injected. Only UDRs and system routes apply. Use this when you want full control and don't want gateway routes interfering with your custom routing.
</details>

## Cleanup

```bash
# Delete all resources
az group delete --name $RG --yes --no-wait

echo "Resources are being deleted in the background."
```

## Learning resources

- [Virtual network traffic routing](https://learn.microsoft.com/azure/virtual-network/virtual-networks-udr-overview)
- [Create and manage route tables](https://learn.microsoft.com/azure/virtual-network/manage-route-table)
- [Hub-spoke network topology](https://learn.microsoft.com/azure/architecture/reference-architectures/hybrid-networking/hub-spoke)
- [Forced tunneling](https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-forced-tunneling-rm)
- [Virtual network traffic routing diagnostics](https://learn.microsoft.com/azure/network-watcher/network-watcher-next-hop-overview)
