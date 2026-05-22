---
sidebar_position: 8
title: "Challenge 08: User-Defined Routes & Forced Tunneling"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 08: User-defined routes & forced tunneling

:::info Estimated time and cost

**90-120 minutes** | **~$2-4/hour** (NVA VMs running) | **Exam weight: 15-20%**

:::

:::note Prerequisite

AZ-104 Challenge 24 covers basic UDR concepts (creating a route table, adding a single route, associating with a subnet). This challenge builds on that foundation with enterprise forced tunneling, multi-path routing, BGP route propagation control, and effective route troubleshooting.

:::

## Scenario

Contoso's security team requires ALL internet-bound traffic from Azure spoke VNets to flow through a centralized Network Virtual Appliance (NVA) firewall in the hub VNet for inspection. Additionally, specific traffic destined to on-premises networks should use different NVAs based on destination. The network team must implement multi-path routing with UDRs, configure forced tunneling for compliance, and troubleshoot routing conflicts between BGP-learned routes and static UDRs.

**Network topology:**

```
On-Premises (192.168.0.0/16)
        |
   VPN Gateway (with BGP)
        |
  Hub VNet (10.0.0.0/16)
   ├── GatewaySubnet (10.0.0.0/27)
   ├── NVA-A Subnet (10.0.1.0/24) — NVA-A: 10.0.1.4
   └── NVA-B Subnet (10.0.2.0/24) — NVA-B: 10.0.2.4
        |
  Peered to:
  Spoke VNet (10.1.0.0/16)
   ├── Workload Subnet (10.1.1.0/24)
   └── App Subnet (10.1.2.0/24)
```

## Learning objectives

After completing this challenge you will be able to:

- Create route tables with BGP route propagation disabled
- Implement forced tunneling using UDRs with 0.0.0.0/0 prefix
- Configure multi-path routing with different NVAs per destination
- Enable IP forwarding on NVA network interfaces
- Analyze effective routes to verify routing behavior
- Use Network Watcher next-hop to diagnose routing issues
- Resolve conflicts between BGP-learned routes and UDRs

## Prerequisites

- An Azure subscription with Contributor access
- Azure CLI installed and authenticated (`az login`)
- Network Watcher enabled in the target region
- Basic understanding of routing concepts (from AZ-104 Challenge 24)

## Key concepts for AZ-700

| Concept | Detail |
|---------|--------|
| Route priority | UDR > BGP > System routes |
| Longest prefix match | Most specific prefix always wins regardless of source |
| Forced tunneling | 0.0.0.0/0 next-hop to VirtualAppliance or VNetGateway |
| BGP propagation | When disabled on a route table, BGP routes are not injected into that subnet |
| IP forwarding | Must be enabled on the NVA NIC; otherwise Azure drops forwarded packets |
| Next-hop VirtualAppliance | Must reference an IP in a directly reachable subnet |

---

## Task 1: Create resource group and network infrastructure

Set up the hub-spoke topology with NVA subnets.

### Step 1: Create the resource group

```bash
az group create \
    --name rg-routing-lab \
    --location eastus2
```

### Step 2: Create the hub virtual network with NVA subnets

```bash
az network vnet create \
    --resource-group rg-routing-lab \
    --name vnet-hub \
    --location eastus2 \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name snet-nva-a \
    --subnet-prefixes 10.0.1.0/24

az network vnet subnet create \
    --resource-group rg-routing-lab \
    --vnet-name vnet-hub \
    --name snet-nva-b \
    --address-prefixes 10.0.2.0/24

az network vnet subnet create \
    --resource-group rg-routing-lab \
    --vnet-name vnet-hub \
    --name GatewaySubnet \
    --address-prefixes 10.0.0.0/27
```

### Step 3: Create the spoke virtual network

```bash
az network vnet create \
    --resource-group rg-routing-lab \
    --name vnet-spoke \
    --location eastus2 \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name snet-workload \
    --subnet-prefixes 10.1.1.0/24

az network vnet subnet create \
    --resource-group rg-routing-lab \
    --vnet-name vnet-spoke \
    --name snet-app \
    --address-prefixes 10.1.2.0/24
```

### Step 4: Peer the hub and spoke VNets

```bash
az network vnet peering create \
    --resource-group rg-routing-lab \
    --name hub-to-spoke \
    --vnet-name vnet-hub \
    --remote-vnet vnet-spoke \
    --allow-forwarded-traffic \
    --allow-gateway-transit

az network vnet peering create \
    --resource-group rg-routing-lab \
    --name spoke-to-hub \
    --vnet-name vnet-spoke \
    --remote-vnet vnet-hub \
    --allow-forwarded-traffic \
    --use-remote-gateways false
```

### Step 5: Deploy simulated NVA VMs (Linux with IP forwarding)

```bash
az vm create \
    --resource-group rg-routing-lab \
    --name vm-nva-a \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --vnet-name vnet-hub \
    --subnet snet-nva-a \
    --private-ip-address 10.0.1.4 \
    --public-ip-address pip-nva-a \
    --admin-username azureuser \
    --generate-ssh-keys \
    --no-wait

az vm create \
    --resource-group rg-routing-lab \
    --name vm-nva-b \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --vnet-name vnet-hub \
    --subnet snet-nva-b \
    --private-ip-address 10.0.2.4 \
    --public-ip-address pip-nva-b \
    --admin-username azureuser \
    --generate-ssh-keys \
    --no-wait
```

### Step 6: Deploy a workload VM in the spoke

```bash
az vm create \
    --resource-group rg-routing-lab \
    --name vm-workload \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --vnet-name vnet-spoke \
    --subnet snet-workload \
    --private-ip-address 10.1.1.4 \
    --public-ip-address pip-workload \
    --admin-username azureuser \
    --generate-ssh-keys
```

---

## Task 2: Create route tables with BGP propagation disabled

In enterprise hub-spoke topologies, you typically disable BGP route propagation on spoke subnets so that on-premises routes learned via the VPN/ExpressRoute gateway do not override your UDRs.

### Step 1: Create a route table with BGP propagation disabled

```bash
az network route-table create \
    --resource-group rg-routing-lab \
    --name rt-spoke-workload \
    --location eastus2 \
    --disable-bgp-route-propagation true
```

The `--disable-bgp-route-propagation true` parameter prevents BGP-learned routes from being injected into this route table. This is critical when you want UDRs to take full control of routing decisions.

### Step 2: Create a second route table for the app subnet

```bash
az network route-table create \
    --resource-group rg-routing-lab \
    --name rt-spoke-app \
    --location eastus2 \
    --disable-bgp-route-propagation true
```

### Step 3: Verify the route table configuration

```bash
az network route-table show \
    --resource-group rg-routing-lab \
    --name rt-spoke-workload \
    --query "{Name:name, DisableBgp:disableBgpRoutePropagation}" \
    --output table
```

Expected output shows `DisableBgp: true`.

:::tip Exam note

When `disableBgpRoutePropagation` is set to `true`, BGP routes from VPN Gateway or ExpressRoute are NOT propagated to the subnet. This means the only routes available are system routes and your explicit UDRs. If you still need the subnet to reach on-premises, you must add explicit UDRs for those prefixes.

:::

---

## Task 3: Add UDRs for forced tunneling

Forced tunneling sends all internet-bound traffic (0.0.0.0/0) to an NVA or VPN gateway instead of directly to the internet. This is a compliance requirement for many organizations.

### Step 1: Add the forced tunneling route (default route to NVA-A)

```bash
az network route-table route create \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-workload \
    --name route-forced-tunnel \
    --address-prefix 0.0.0.0/0 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.1.4
```

This route overrides the system default route (0.0.0.0/0 to Internet) and forces all internet-bound traffic through NVA-A at 10.0.1.4.

### Step 2: Add specific routes for different on-premises destinations

Route traffic to different NVAs based on the destination on-premises subnet:

```bash
# Traffic to on-prem subnet 192.168.1.0/24 goes via NVA-A
az network route-table route create \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-workload \
    --name route-onprem-site-a \
    --address-prefix 192.168.1.0/24 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.1.4

# Traffic to on-prem subnet 192.168.2.0/24 goes via NVA-B
az network route-table route create \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-workload \
    --name route-onprem-site-b \
    --address-prefix 192.168.2.0/24 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.2.4
```

### Step 3: Add routes to the app subnet route table

```bash
az network route-table route create \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-app \
    --name route-forced-tunnel \
    --address-prefix 0.0.0.0/0 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.1.4

az network route-table route create \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-app \
    --name route-onprem-site-a \
    --address-prefix 192.168.1.0/24 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.1.4

az network route-table route create \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-app \
    --name route-onprem-site-b \
    --address-prefix 192.168.2.0/24 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.2.4
```

### Step 4: List routes in the table to verify

```bash
az network route-table route list \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-workload \
    --output table
```

:::tip Exam note

Valid `--next-hop-type` values are: `VirtualAppliance`, `VNetGateway`, `VNetLocal`, `Internet`, and `None`. The `VirtualAppliance` type requires `--next-hop-ip-address` to be specified. The `None` type drops traffic (blackhole route).

:::

---

## Task 4: Associate route tables with spoke subnets

A route table has no effect until it is associated with one or more subnets. Each subnet can have at most one route table associated.

### Step 1: Associate route table with the workload subnet

```bash
az network vnet subnet update \
    --resource-group rg-routing-lab \
    --vnet-name vnet-spoke \
    --name snet-workload \
    --route-table rt-spoke-workload
```

### Step 2: Associate route table with the app subnet

```bash
az network vnet subnet update \
    --resource-group rg-routing-lab \
    --vnet-name vnet-spoke \
    --name snet-app \
    --route-table rt-spoke-app
```

### Step 3: Verify the association

```bash
az network vnet subnet show \
    --resource-group rg-routing-lab \
    --vnet-name vnet-spoke \
    --name snet-workload \
    --query "routeTable.id" \
    --output tsv
```

:::warning Important

After associating the forced tunneling route table, VMs in the subnet will lose direct internet access. Outbound internet traffic will be routed to the NVA. If the NVA is not configured to forward or NAT this traffic, connectivity breaks. This is expected behavior for forced tunneling.

:::

---

## Task 5: Enable IP forwarding on NVA NICs

By default, Azure drops packets not addressed to a NIC's own IP. For an NVA to forward traffic between subnets, IP forwarding must be enabled at the Azure platform level (on the NIC resource) and inside the guest OS.

### Step 1: Enable IP forwarding on NVA-A NIC (Azure platform level)

```bash
az network nic update \
    --resource-group rg-routing-lab \
    --name vm-nva-aVMNic \
    --ip-forwarding true
```

### Step 2: Enable IP forwarding on NVA-B NIC

```bash
az network nic update \
    --resource-group rg-routing-lab \
    --name vm-nva-bVMNic \
    --ip-forwarding true
```

:::note Finding the NIC name

If you are unsure of the NIC name, retrieve it from the VM:

```bash
az vm show \
    --resource-group rg-routing-lab \
    --name vm-nva-a \
    --query "networkProfile.networkInterfaces[0].id" \
    --output tsv
```

:::

### Step 3: Verify IP forwarding is enabled

```bash
az network nic show \
    --resource-group rg-routing-lab \
    --name vm-nva-aVMNic \
    --query "enableIPForwarding" \
    --output tsv
```

Expected output: `true`

### Step 4: Enable IP forwarding inside the guest OS (Linux)

SSH into each NVA and enable kernel-level forwarding:

```bash
# On the NVA VM (via SSH):
sudo sysctl -w net.ipv4.ip_forward=1

# Make persistent across reboots:
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

:::tip Exam note

IP forwarding must be enabled in TWO places: (1) on the Azure NIC resource using `az network nic update --ip-forwarding true`, and (2) inside the guest operating system. Missing either one causes the NVA to drop forwarded packets silently.

:::

---

## Task 6: Verify effective routes and diagnose with Network Watcher

Effective routes show the combined result of system routes, UDRs, and BGP-learned routes. This is the primary troubleshooting tool for routing issues.

### Step 1: View effective routes on the workload VM NIC

```bash
az network nic show-effective-route-table \
    --resource-group rg-routing-lab \
    --name vm-workloadVMNic \
    --output table
```

Expected output should show:
- `0.0.0.0/0` with next hop `VirtualAppliance` and IP `10.0.1.4` (source: User)
- `192.168.1.0/24` with next hop `VirtualAppliance` and IP `10.0.1.4` (source: User)
- `192.168.2.0/24` with next hop `VirtualAppliance` and IP `10.0.2.4` (source: User)
- `10.1.0.0/16` with next hop `VNetLocal` (source: Default)

### Step 2: Use Network Watcher next-hop to test internet-bound traffic

```bash
az network watcher show-next-hop \
    --resource-group rg-routing-lab \
    --vm vm-workload \
    --source-ip 10.1.1.4 \
    --dest-ip 8.8.8.8
```

Expected result: `nextHopType: VirtualAppliance`, `nextHopIpAddress: 10.0.1.4` — confirming forced tunneling is active.

### Step 3: Test routing to on-premises site A

```bash
az network watcher show-next-hop \
    --resource-group rg-routing-lab \
    --vm vm-workload \
    --source-ip 10.1.1.4 \
    --dest-ip 192.168.1.10
```

Expected: next hop is `VirtualAppliance` with IP `10.0.1.4` (NVA-A).

### Step 4: Test routing to on-premises site B

```bash
az network watcher show-next-hop \
    --resource-group rg-routing-lab \
    --vm vm-workload \
    --source-ip 10.1.1.4 \
    --dest-ip 192.168.2.10
```

Expected: next hop is `VirtualAppliance` with IP `10.0.2.4` (NVA-B).

### Step 5: Test routing to a hub VNet address (should use VNet peering directly)

```bash
az network watcher show-next-hop \
    --resource-group rg-routing-lab \
    --vm vm-workload \
    --source-ip 10.1.1.4 \
    --dest-ip 10.0.1.4
```

Expected: next hop type is `VNetPeering` (traffic to the peered VNet uses the peering link, not the UDR, because 10.0.0.0/16 has no explicit UDR and the system route handles it).

:::tip Exam note

The `az network watcher show-next-hop` command requires the VM to be running. It evaluates routing from the perspective of a specific VM's NIC. The `--nic` parameter is only required if the VM has multiple NICs with IP forwarding enabled.

:::

---

## Break and fix scenarios

These scenarios represent common misconfigurations you will encounter in production and on the exam.

### Scenario 1: NVA drops forwarded packets

**Symptom:** VMs in the spoke subnet cannot reach the internet even though the UDR is correctly configured.

**Root cause:** IP forwarding is not enabled on the NVA NIC at the Azure platform level.

**Diagnosis:**

```bash
az network nic show \
    --resource-group rg-routing-lab \
    --name vm-nva-aVMNic \
    --query "enableIPForwarding"
```

If the output is `false`, packets arriving at the NVA that are destined for other IPs are silently dropped.

**Fix:**

```bash
az network nic update \
    --resource-group rg-routing-lab \
    --name vm-nva-aVMNic \
    --ip-forwarding true
```

### Scenario 2: Internet access completely broken

**Symptom:** Forced tunneling route (0.0.0.0/0 to VirtualAppliance) is configured but the NVA is powered off or not performing NAT.

**Root cause:** When forced tunneling is active, all internet traffic must traverse the NVA. If the NVA is down, there is no path to the internet.

**Diagnosis:**

```bash
# Check NVA status
az vm get-instance-view \
    --resource-group rg-routing-lab \
    --name vm-nva-a \
    --query "instanceView.statuses[1].displayStatus" \
    --output tsv

# Verify the effective route still points to the NVA
az network watcher show-next-hop \
    --resource-group rg-routing-lab \
    --vm vm-workload \
    --source-ip 10.1.1.4 \
    --dest-ip 8.8.8.8
```

**Fix:** Start the NVA, or temporarily remove the forced tunneling route:

```bash
az network route-table route delete \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-workload \
    --name route-forced-tunnel
```

### Scenario 3: Asymmetric routing

**Symptom:** Traffic flows outbound through the NVA but return traffic bypasses it, causing stateful firewall rules to drop the return packets.

**Root cause:** A UDR exists on the spoke subnet (outbound direction) but no UDR exists on the hub subnet for return traffic from the NVA back to the spoke.

**Diagnosis:** Check effective routes on the NVA NIC. If the return path to 10.1.0.0/16 uses only the system route (VNet peering), the NVA may route return traffic correctly. However, if the NVA sends traffic to the spoke and there is an intermediate hop, you need UDRs for the return path as well.

**Fix:** Add a route table to the NVA subnet with routes for return traffic (if needed), or ensure the NVA is the first and last hop for inspected flows.

### Scenario 4: BGP route overrides UDR

**Symptom:** You configured a UDR for 192.168.1.0/24 pointing to NVA-A, but traffic goes via the VPN Gateway instead because a BGP-learned route exists for the same prefix.

**Root cause:** BGP route propagation is enabled on the route table (`disableBgpRoutePropagation: false`).

**Diagnosis:**

```bash
az network route-table show \
    --resource-group rg-routing-lab \
    --name rt-spoke-workload \
    --query "disableBgpRoutePropagation"
```

If `false`, BGP routes are being propagated. However, note that UDRs should override BGP routes for the same prefix. The actual issue is typically that the BGP route has a MORE SPECIFIC prefix (e.g., 192.168.1.0/25 from BGP vs. 192.168.1.0/24 from UDR).

**Fix:** Either disable BGP propagation or add a more specific UDR:

```bash
# Option 1: Disable BGP propagation
az network route-table update \
    --resource-group rg-routing-lab \
    --name rt-spoke-workload \
    --disable-bgp-route-propagation true

# Option 2: Add a more specific route matching the BGP prefix
az network route-table route create \
    --resource-group rg-routing-lab \
    --route-table-name rt-spoke-workload \
    --name route-onprem-site-a-specific \
    --address-prefix 192.168.1.0/25 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.1.4
```

---

## Route selection deep dive

Understanding how Azure selects routes is critical for the AZ-700 exam:

| Priority | Route source | Example |
|----------|-------------|---------|
| 1 (highest) | User-defined route (UDR) | Custom route in route table |
| 2 | BGP route | Route learned from VPN/ExpressRoute gateway |
| 3 (lowest) | System route | Azure default routes (VNet, Internet, etc.) |

**Within the same priority level**, longest prefix match wins. A /25 route is more specific than a /24 route and will be preferred regardless of the source.

**Special cases:**
- If a UDR and BGP route have the SAME prefix, the UDR wins
- If BGP advertises a MORE SPECIFIC prefix than your UDR, the BGP route wins due to longest prefix match
- Disabling BGP propagation removes BGP routes entirely from consideration

---

## Cleanup

Remove all resources created in this challenge:

```bash
az group delete \
    --name rg-routing-lab \
    --yes \
    --no-wait
```

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-08-q1",
    question: "A UDR for 192.168.0.0/16 points to NVA-A, and a BGP-learned route for 192.168.1.0/24 points to the VPN gateway. Where does traffic to 192.168.1.100 go?",
    options: [
      "NVA-A, because UDRs always override BGP routes",
      "VPN Gateway, because the BGP route has a longer prefix match (more specific)",
      "The traffic is dropped because of a routing conflict",
      "Both paths are used with equal-cost multi-path routing"
    ],
    correctIndex: 1,
    explanation: "Longest prefix match always wins regardless of route source. The BGP route for 192.168.1.0/24 is more specific than the UDR for 192.168.0.0/16, so traffic to 192.168.1.100 follows the BGP route to the VPN gateway. To override this, add a UDR with a prefix equal to or more specific than /24."
  },
  {
    id: "az700-08-q2",
    question: "You configure forced tunneling (0.0.0.0/0 to a VirtualAppliance) on a spoke subnet, but VMs still cannot reach the internet. The NVA is running and has IP forwarding enabled at the OS level. What is the most likely cause?",
    options: [
      "The route table is not associated with the subnet",
      "IP forwarding is not enabled on the Azure NIC resource",
      "The VNet peering does not allow forwarded traffic",
      "Network Watcher is not enabled in the region"
    ],
    correctIndex: 1,
    explanation: "IP forwarding must be enabled in two places: on the Azure NIC resource (az network nic update --ip-forwarding true) AND inside the guest OS. If only the OS-level forwarding is enabled but not the Azure NIC setting, Azure drops packets not addressed to the NIC before they reach the VM."
  },
  {
    id: "az700-08-q3",
    question: "What does setting --disable-bgp-route-propagation true on a route table accomplish?",
    options: [
      "It prevents the route table from being advertised to on-premises via BGP",
      "It stops BGP routes learned from VPN/ExpressRoute gateways from being injected into the associated subnets",
      "It disables BGP on the VPN gateway",
      "It removes all system routes from the subnet"
    ],
    correctIndex: 1,
    explanation: "When BGP route propagation is disabled on a route table, routes learned via BGP (from VPN Gateway or ExpressRoute) are NOT propagated to the subnets associated with that route table. The subnet only sees system routes and explicit UDRs. This gives you complete control over routing without BGP interference."
  },
  {
    id: "az700-08-q4",
    question: "You need traffic from spoke subnet A to reach on-premises network 192.168.1.0/24 via NVA-A, and 192.168.2.0/24 via NVA-B. BGP propagation is disabled. How many routes must be in the route table (minimum) to achieve this plus forced tunneling?",
    options: [
      "1 (just the default route covers everything)",
      "2 (one for each on-premises prefix)",
      "3 (default route for forced tunneling, plus one route per on-premises destination)",
      "4 (default route, two on-premises routes, and a return route)"
    ],
    correctIndex: 2,
    explanation: "You need three routes minimum: (1) 0.0.0.0/0 to NVA-A for forced tunneling of internet traffic, (2) 192.168.1.0/24 to NVA-A for site A traffic, and (3) 192.168.2.0/24 to NVA-B for site B traffic. The on-premises routes are more specific than 0.0.0.0/0 and will match first for those destinations."
  },
  {
    id: "az700-08-q5",
    question: "Which az CLI command would you use to determine the next hop for traffic leaving a VM destined for 8.8.8.8?",
    options: [
      "az network nic show-effective-route-table --name vmNic --resource-group rg",
      "az network watcher show-next-hop --vm myVm --source-ip 10.1.1.4 --dest-ip 8.8.8.8 --resource-group rg",
      "az network route-table route list --route-table-name rt --resource-group rg",
      "az network vnet subnet show --name subnet --vnet-name vnet --resource-group rg"
    ],
    correctIndex: 1,
    explanation: "The az network watcher show-next-hop command evaluates routing from a specific VM and returns the actual next hop type and IP address for traffic to a given destination. It considers all route sources (UDR, BGP, system). The effective route table shows all routes but does not evaluate which one wins for a specific destination."
  },
  {
    id: "az700-08-q6",
    question: "A route table has a UDR for 10.0.0.0/8 with next-hop-type None (blackhole). A VM in the associated subnet tries to reach 10.5.1.1. What happens?",
    options: [
      "Traffic is routed via VNet peering because system routes have higher priority",
      "Traffic is dropped because the UDR with next-hop None takes priority over system routes",
      "Traffic is sent to the internet as a fallback",
      "An error is returned to the application immediately"
    ],
    correctIndex: 1,
    explanation: "A UDR with next-hop-type None creates a blackhole route that drops matching traffic. UDRs have higher priority than system routes (including VNet peering routes), so the packet is silently dropped. No ICMP unreachable is returned to the sender by default."
  }
]} />

---

## Additional resources

- [Virtual network traffic routing](https://learn.microsoft.com/azure/virtual-network/virtual-networks-udr-overview)
- [Create, change, or delete a route table](https://learn.microsoft.com/azure/virtual-network/manage-route-table)
- [Diagnose a VM network routing problem - CLI](https://learn.microsoft.com/azure/network-watcher/diagnose-vm-network-routing-problem-cli)
- [Configure forced tunneling](https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-forced-tunneling-rm)
- [Hub-spoke network topology in Azure](https://learn.microsoft.com/azure/architecture/networking/architecture/hub-spoke)
