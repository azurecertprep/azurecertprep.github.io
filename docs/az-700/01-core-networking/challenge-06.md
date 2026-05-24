---
sidebar_position: 6
title: "Challenge 06: VNet Peering & Gateway Transit"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 06: VNet peering & gateway transit

:::info Estimated time and cost

**90-120 minutes** | **~$1.50/hour** (VPN Gateway is the major cost driver) | **Exam weight: 20-25%**

:::

## Scenario

Contoso has a hub-spoke network where the hub VNet contains a VPN Gateway connecting to on-premises. Spoke VNets need to access on-premises resources through the hub's VPN Gateway (gateway transit). Additionally, some spokes need to communicate with each other via the hub (service chaining through an NVA), since VNet peering is non-transitive by default.

## Learning objectives

After completing this challenge you will be able to:

- Create a hub-spoke topology with VNet peering
- Configure gateway transit so spoke VNets use the hub's VPN Gateway
- Explain and demonstrate the non-transitive nature of VNet peering
- Implement service chaining with user-defined routes (UDRs) and a network virtual appliance (NVA)
- Configure global VNet peering across regions
- Verify peering status, effective routes, and end-to-end connectivity

## Prerequisites

- An Azure subscription with Contributor access
- Azure CLI installed and authenticated (`az login`)
- A resource group for this lab (or permission to create one)
- Basic understanding of IP routing and address spaces

---

## Task 1: Create the hub-spoke topology with VNet peering

Build a hub VNet and two spoke VNets, then establish peering connections between hub and each spoke.

### Step 1: Create the resource group

```bash
az group create \
    --name rg-peering-lab \
    --location eastus2
```

### Step 2: Create the hub VNet

```bash
az network vnet create \
    --resource-group rg-peering-lab \
    --name vnet-hub \
    --location eastus2 \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name GatewaySubnet \
    --subnet-prefixes 10.0.0.0/27
```

Add a subnet for the NVA:

```bash
az network vnet subnet create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name subnet-nva \
    --address-prefixes 10.0.1.0/24
```

Add a workload subnet in the hub:

```bash
az network vnet subnet create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name subnet-hub-workload \
    --address-prefixes 10.0.2.0/24
```

### Step 3: Create spoke VNets

```bash
az network vnet create \
    --resource-group rg-peering-lab \
    --name vnet-spoke1 \
    --location eastus2 \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name subnet-workload \
    --subnet-prefixes 10.1.1.0/24
```

```bash
az network vnet create \
    --resource-group rg-peering-lab \
    --name vnet-spoke2 \
    --location eastus2 \
    --address-prefixes 10.2.0.0/16 \
    --subnet-name subnet-workload \
    --subnet-prefixes 10.2.1.0/24
```

### Step 4: Create peering from hub to spoke1

```bash
az network vnet peering create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke1 \
    --remote-vnet vnet-spoke1 \
    --allow-vnet-access true \
    --allow-forwarded-traffic true
```

### Step 5: Create peering from spoke1 to hub

```bash
az network vnet peering create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke1 \
    --name spoke1-to-hub \
    --remote-vnet vnet-hub \
    --allow-vnet-access true \
    --allow-forwarded-traffic true
```

### Step 6: Create peering between hub and spoke2

```bash
az network vnet peering create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke2 \
    --remote-vnet vnet-spoke2 \
    --allow-vnet-access true \
    --allow-forwarded-traffic true
```

```bash
az network vnet peering create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke2 \
    --name spoke2-to-hub \
    --remote-vnet vnet-hub \
    --allow-vnet-access true \
    --allow-forwarded-traffic true
```

### Step 7: Verify peering status

Both sides must show `Connected` for traffic to flow:

```bash
az network vnet peering list \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --output table
```

```bash
az network vnet peering show \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke1 \
    --query peeringState \
    --output tsv
```

:::tip Exam note

Peering must be created on both sides. If only one side is created, the state is `Initiated` on that side and `Disconnected` on the other. Traffic does not flow until both sides reach `Connected` state.

:::

---

## Task 2: Configure gateway transit

Configure the hub VPN Gateway and enable gateway transit so spoke VNets can reach on-premises networks through the hub's gateway.

### Step 1: Create a public IP for the VPN Gateway

```bash
az network public-ip create \
    --resource-group rg-peering-lab \
    --name pip-vpn-gateway \
    --allocation-method Static \
    --sku Standard \
    --location eastus2
```

### Step 2: Create the VPN Gateway (takes 30-45 minutes)

```bash
az network vnet-gateway create \
    --resource-group rg-peering-lab \
    --name vpngw-hub \
    --vnet vnet-hub \
    --gateway-type Vpn \
    --vpn-type RouteBased \
    --sku VpnGw1 \
    --public-ip-addresses pip-vpn-gateway \
    --no-wait
```

The `--no-wait` flag returns immediately. Check provisioning status with:

```bash
az network vnet-gateway show \
    --resource-group rg-peering-lab \
    --name vpngw-hub \
    --query provisioningState \
    --output tsv
```

Wait until the output shows `Succeeded` before proceeding.

### Step 3: Update hub-to-spoke peering to allow gateway transit

```bash
az network vnet peering update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke1 \
    --set allowGatewayTransit=true
```

```bash
az network vnet peering update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke2 \
    --set allowGatewayTransit=true
```

### Step 4: Update spoke-to-hub peering to use remote gateways

```bash
az network vnet peering update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke1 \
    --name spoke1-to-hub \
    --set useRemoteGateways=true
```

```bash
az network vnet peering update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke2 \
    --name spoke2-to-hub \
    --set useRemoteGateways=true
```

:::warning Important

The `useRemoteGateways` setting will fail if the hub VNet does not have a gateway deployed and in `Succeeded` provisioning state. You must wait for the VPN Gateway creation to complete before setting this flag on the spoke peering.

:::

### Step 5: Verify gateway transit configuration

```bash
az network vnet peering show \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke1 \
    --query '{allowGatewayTransit:allowGatewayTransit, peeringState:peeringState}' \
    --output json
```

```bash
az network vnet peering show \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke1 \
    --name spoke1-to-hub \
    --query '{useRemoteGateways:useRemoteGateways, peeringState:peeringState}' \
    --output json
```

:::tip Exam note

Gateway transit allows spoke VNets to use the hub gateway as if it were their own. The hub side sets `allowGatewayTransit=true` and each spoke sets `useRemoteGateways=true`. A VNet cannot use remote gateways if it already has its own gateway deployed. Global peering supports gateway transit only with VpnGw1 or higher gateways (not Basic SKU).

:::

---

## Task 3: Demonstrate non-transitivity of VNet peering

Peering is non-transitive: even though Spoke1 peers with Hub and Hub peers with Spoke2, Spoke1 cannot automatically reach Spoke2. This task demonstrates this behavior by deploying VMs and checking effective routes.

### Step 1: Deploy a test VM in spoke1

```bash
az vm create \
    --resource-group rg-peering-lab \
    --name vm-spoke1 \
    --vnet-name vnet-spoke1 \
    --subnet subnet-workload \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --admin-username azureuser \
    --generate-ssh-keys \
    --no-wait
```

### Step 2: Deploy a test VM in spoke2

```bash
az vm create \
    --resource-group rg-peering-lab \
    --name vm-spoke2 \
    --vnet-name vnet-spoke2 \
    --subnet subnet-workload \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --admin-username azureuser \
    --generate-ssh-keys \
    --no-wait
```

### Step 3: Check effective routes on the spoke1 VM NIC

Once the VM is provisioned, retrieve the effective routes to verify what destinations the spoke1 VM can reach:

```bash
az network nic show-effective-route-table \
    --resource-group rg-peering-lab \
    --name vm-spoke1VMNic \
    --output table
```

You will see routes for:
- `10.1.0.0/16` (local VNet) with next hop `VnetLocal`
- `10.0.0.0/16` (hub VNet via peering) with next hop `VNetPeering`

You will NOT see a route for `10.2.0.0/16` (spoke2). This confirms non-transitivity: spoke1 can reach the hub, but not spoke2 through the hub.

### Step 4: Attempt connectivity from spoke1 to spoke2

```bash
az network watcher test-connectivity \
    --resource-group rg-peering-lab \
    --source-resource vm-spoke1 \
    --dest-address 10.2.1.4 \
    --dest-port 22
```

This test should return `ConnectionStatus: Unreachable` because there is no direct peering or route between the two spokes.

:::tip Exam note

VNet peering is always non-transitive. If VNet A peers with VNet B and VNet B peers with VNet C, VNet A has no path to VNet C unless you either (a) peer A directly with C, or (b) route traffic through an NVA or Azure Firewall in VNet B using UDRs (service chaining).

:::

---

## Task 4: Implement service chaining with UDRs

Enable spoke-to-spoke communication by routing traffic through a network virtual appliance (NVA) in the hub VNet.

### Step 1: Deploy an NVA in the hub

```bash
az vm create \
    --resource-group rg-peering-lab \
    --name vm-nva \
    --vnet-name vnet-hub \
    --subnet subnet-nva \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --admin-username azureuser \
    --generate-ssh-keys \
    --private-ip-address 10.0.1.4
```

### Step 2: Enable IP forwarding on the NVA NIC

The NVA must forward packets that are not destined for itself. Enable IP forwarding at the Azure networking layer:

```bash
az network nic update \
    --resource-group rg-peering-lab \
    --name vm-nvaVMNic \
    --ip-forwarding true
```

Also enable IP forwarding inside the Linux VM:

```bash
az vm run-command invoke \
    --resource-group rg-peering-lab \
    --name vm-nva \
    --command-id RunShellScript \
    --scripts "sudo sysctl -w net.ipv4.ip_forward=1 && echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf"
```

### Step 3: Create a route table for spoke1

```bash
az network route-table create \
    --resource-group rg-peering-lab \
    --name rt-spoke1 \
    --location eastus2
```

Add a route directing spoke2 traffic to the NVA:

```bash
az network route-table route create \
    --resource-group rg-peering-lab \
    --route-table-name rt-spoke1 \
    --name to-spoke2 \
    --address-prefix 10.2.0.0/16 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.1.4
```

### Step 4: Create a route table for spoke2

```bash
az network route-table create \
    --resource-group rg-peering-lab \
    --name rt-spoke2 \
    --location eastus2
```

```bash
az network route-table route create \
    --resource-group rg-peering-lab \
    --route-table-name rt-spoke2 \
    --name to-spoke1 \
    --address-prefix 10.1.0.0/16 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.1.4
```

### Step 5: Associate route tables with spoke subnets

```bash
az network vnet subnet update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke1 \
    --name subnet-workload \
    --route-table rt-spoke1
```

```bash
az network vnet subnet update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke2 \
    --name subnet-workload \
    --route-table rt-spoke2
```

### Step 6: Verify effective routes now include the UDR

```bash
az network nic show-effective-route-table \
    --resource-group rg-peering-lab \
    --name vm-spoke1VMNic \
    --output table
```

You should now see a route for `10.2.0.0/16` with next hop type `VirtualAppliance` and next hop address `10.0.1.4`.

### Step 7: Test spoke-to-spoke connectivity

```bash
az network watcher test-connectivity \
    --resource-group rg-peering-lab \
    --source-resource vm-spoke1 \
    --dest-address 10.2.1.4 \
    --dest-port 22
```

The connection status should now show `Reachable` (assuming NSGs allow the traffic and the NVA is forwarding packets).

:::warning Important

For service chaining to work, `--allow-forwarded-traffic` must be set to `true` on BOTH sides of EACH peering connection. Traffic from spoke1 destined for spoke2 enters the hub as forwarded traffic (since the hub is not the original destination). If `allowForwardedTraffic` is false on the hub-to-spoke2 peering, the hub will not forward that traffic onward to spoke2.

:::

---

## Task 5: Configure global VNet peering

Create a VNet in a different region and establish global (cross-region) peering with the hub.

### Step 1: Create a VNet in a second region

```bash
az network vnet create \
    --resource-group rg-peering-lab \
    --name vnet-spoke3-westeurope \
    --location westeurope \
    --address-prefixes 10.3.0.0/16 \
    --subnet-name subnet-workload \
    --subnet-prefixes 10.3.1.0/24
```

### Step 2: Create global peering from hub to spoke3

```bash
az network vnet peering create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke3 \
    --remote-vnet vnet-spoke3-westeurope \
    --allow-vnet-access true \
    --allow-forwarded-traffic true \
    --allow-gateway-transit true
```

### Step 3: Create global peering from spoke3 to hub

```bash
az network vnet peering create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke3-westeurope \
    --name spoke3-to-hub \
    --remote-vnet vnet-hub \
    --allow-vnet-access true \
    --allow-forwarded-traffic true \
    --use-remote-gateways true
```

### Step 4: Verify global peering status

```bash
az network vnet peering show \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke3 \
    --query '{peeringState:peeringState, allowGatewayTransit:allowGatewayTransit, remoteVnetRegion:remoteVirtualNetwork.id}' \
    --output json
```

### Step 5: Deploy a VM and test latency

```bash
az vm create \
    --resource-group rg-peering-lab \
    --name vm-spoke3 \
    --vnet-name vnet-spoke3-westeurope \
    --subnet subnet-workload \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --admin-username azureuser \
    --generate-ssh-keys \
    --location westeurope \
    --no-wait
```

Cross-region peering traffic traverses the Microsoft backbone network. Expect higher latency (typically 30-80ms between US East and West Europe) compared to same-region peering (sub-2ms).

:::tip Exam note

Global VNet peering supports all features of regional peering with these caveats: (1) Basic SKU VPN Gateways do not support gateway transit over global peering (VpnGw1 or higher is required), (2) Basic internal load balancers are not accessible over global peering (use Standard SKU), and (3) bandwidth may be lower than same-region peering depending on VM sizes.

:::

---

## Task 6: Verify peering status, effective routes, and connectivity

Confirm the overall topology works by reviewing peering status across all connections and validating route propagation.

### Step 1: List all peerings on the hub VNet

```bash
az network vnet peering list \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --query '[].{Name:name, State:peeringState, GatewayTransit:allowGatewayTransit, ForwardedTraffic:allowForwardedTraffic}' \
    --output table
```

### Step 2: Check effective routes from the hub NVA perspective

```bash
az network nic show-effective-route-table \
    --resource-group rg-peering-lab \
    --name vm-nvaVMNic \
    --output table
```

The NVA should see routes to all peered VNets (10.1.0.0/16, 10.2.0.0/16, 10.3.0.0/16) with next hop type `VNetPeering` or `VNetGlobalPeering`.

### Step 3: Verify spoke1 has routes to on-premises via gateway transit

If the VPN Gateway has learned on-premises routes (for example, 192.168.0.0/16 via BGP), check that spoke1 inherits them:

```bash
az network nic show-effective-route-table \
    --resource-group rg-peering-lab \
    --name vm-spoke1VMNic \
    --query "[?source=='VirtualNetworkGateway']" \
    --output table
```

Routes learned from the gateway will appear with source `VirtualNetworkGateway` because `useRemoteGateways=true` causes the spoke to inherit the hub gateway's route table.

### Step 4: Run a full connectivity check

```bash
# Spoke1 to Hub NVA (should succeed - direct peering)
az network watcher test-connectivity \
    --resource-group rg-peering-lab \
    --source-resource vm-spoke1 \
    --dest-address 10.0.1.4 \
    --dest-port 22

# Spoke1 to Spoke2 (should succeed - via NVA service chaining)
az network watcher test-connectivity \
    --resource-group rg-peering-lab \
    --source-resource vm-spoke1 \
    --dest-address 10.2.1.4 \
    --dest-port 22
```

---

## Break & fix

### Scenario 1: Peering stuck in "Initiated" state

A colleague created peering from the hub to a new spoke VNet, but traffic is not flowing. You check the peering state:

```bash
az network vnet peering show \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke1 \
    --query peeringState \
    --output tsv
```

Output: `Initiated`

**Root cause:** Peering was only created on the hub side. The reverse peering (spoke to hub) was never created.

**Fix:** Create the missing peering on the spoke side:

```bash
az network vnet peering create \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke1 \
    --name spoke1-to-hub \
    --remote-vnet vnet-hub \
    --allow-vnet-access true \
    --allow-forwarded-traffic true
```

After both sides exist, the state transitions to `Connected` on both peerings.

### Scenario 2: Gateway transit fails on spoke peering

You attempt to enable `useRemoteGateways` on a spoke peering but receive an error:

```text
"Cannot use remote gateways because the referenced virtual network has no gateways"
```

**Root cause:** The VPN Gateway in the hub VNet is either not yet deployed or still in provisioning state.

**Fix:** Verify the gateway exists and is fully provisioned:

```bash
az network vnet-gateway show \
    --resource-group rg-peering-lab \
    --name vpngw-hub \
    --query provisioningState \
    --output tsv
```

Wait until it shows `Succeeded`, then retry enabling `useRemoteGateways`. If the gateway does not exist at all, deploy it first (see Task 2, Step 2).

### Scenario 3: Spoke-to-spoke traffic blocked despite UDRs

Route tables are correctly configured pointing to the NVA, and the NVA has IP forwarding enabled. However, traffic from spoke1 to spoke2 still fails.

**Root cause:** The hub-to-spoke2 peering has `allowForwardedTraffic` set to `false`. The hub receives the packet from spoke1 and routes it to the NVA, but when the NVA forwards the packet toward spoke2, the peering drops it because forwarded traffic is not permitted.

**Fix:** Update the peering to allow forwarded traffic:

```bash
az network vnet peering update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-hub \
    --name hub-to-spoke2 \
    --set allowForwardedTraffic=true
```

Also verify the spoke2-to-hub peering allows forwarded traffic (needed for return traffic):

```bash
az network vnet peering update \
    --resource-group rg-peering-lab \
    --vnet-name vnet-spoke2 \
    --name spoke2-to-hub \
    --set allowForwardedTraffic=true
```

---

## Clean up resources

Delete the resource group to remove all lab resources and stop incurring charges (especially the VPN Gateway):

```bash
az group delete \
    --name rg-peering-lab \
    --yes \
    --no-wait
```

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-06-q1",
    question: "You create a VNet peering from VNet-A to VNet-B but forget to create the reverse peering. What state will the peering show on VNet-A?",
    options: [
      "Connected",
      "Initiated",
      "Disconnected",
      "Failed"
    ],
    correctIndex: 1,
    explanation: "When peering is created on only one side, that side shows 'Initiated' state. The peering will not transition to 'Connected' until the reverse peering is also created from VNet-B to VNet-A. Traffic does not flow in 'Initiated' state."
  },
  {
    id: "az700-06-q2",
    question: "Contoso has a hub-spoke topology. Spoke1 peers with Hub and Hub peers with Spoke2. A VM in Spoke1 tries to reach a VM in Spoke2. What happens?",
    options: [
      "Traffic flows successfully because both spokes peer with the same hub",
      "Traffic is blocked because VNet peering is non-transitive",
      "Traffic flows but with double the latency due to the extra hop",
      "Traffic is blocked by the default NSG rules"
    ],
    correctIndex: 1,
    explanation: "VNet peering is non-transitive. Even though Spoke1 peers with Hub and Hub peers with Spoke2, Spoke1 has no route to Spoke2. You must either create a direct peering between the spokes or implement service chaining through an NVA in the hub using UDRs."
  },
  {
    id: "az700-06-q3",
    question: "You want spoke VNets to use the hub VPN Gateway to reach on-premises. Which combination of settings is correct?",
    options: [
      "Set allowGatewayTransit=true on the spoke peering and useRemoteGateways=true on the hub peering",
      "Set allowGatewayTransit=true on the hub peering and useRemoteGateways=true on the spoke peering",
      "Set useRemoteGateways=true on both sides of the peering",
      "Set allowGatewayTransit=true on both sides of the peering"
    ],
    correctIndex: 1,
    explanation: "Gateway transit requires the hub side (which owns the gateway) to set allowGatewayTransit=true, and the spoke side to set useRemoteGateways=true. This allows the spoke to inherit routes learned by the hub's gateway."
  },
  {
    id: "az700-06-q4",
    question: "Service chaining through an NVA in a hub requires which setting on the hub-to-spoke peering?",
    options: [
      "allowVnetAccess=true",
      "allowGatewayTransit=true",
      "allowForwardedTraffic=true",
      "useRemoteGateways=true"
    ],
    correctIndex: 2,
    explanation: "When an NVA in the hub forwards packets to a spoke, those packets are considered 'forwarded traffic' (they did not originate from the hub VNet). The hub-to-spoke peering must have allowForwardedTraffic=true to permit this traffic. Without it, the peering drops forwarded packets."
  },
  {
    id: "az700-06-q5",
    question: "You attempt to set useRemoteGateways=true on a spoke peering but receive an error. What is the most likely cause?",
    options: [
      "The spoke VNet already has its own VPN Gateway deployed",
      "The hub VNet does not have a gateway in Succeeded provisioning state",
      "Both A and B are valid causes for this error",
      "The peering is using global (cross-region) peering"
    ],
    correctIndex: 2,
    explanation: "The useRemoteGateways flag fails if (a) the remote VNet has no gateway deployed or the gateway is not fully provisioned, or (b) the local VNet already has its own gateway. A VNet cannot use both its own gateway and a remote gateway simultaneously."
  },
  {
    id: "az700-06-q6",
    question: "Which VPN Gateway SKU does NOT support gateway transit over global VNet peering?",
    options: [
      "VpnGw1",
      "VpnGw2",
      "Basic",
      "VpnGw1AZ"
    ],
    correctIndex: 2,
    explanation: "The Basic SKU VPN Gateway does not support gateway transit over global (cross-region) VNet peering. You must use VpnGw1 or higher (Standard SKU equivalent or above) for gateway transit to work across regions."
  }
]} />

---

## Additional resources

- [Virtual network peering overview](https://learn.microsoft.com/azure/virtual-network/virtual-network-peering-overview)
- [Create, change, or delete a virtual network peering](https://learn.microsoft.com/azure/virtual-network/virtual-network-manage-peering)
- [Configure VPN gateway transit for virtual network peering](https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-peering-gateway-transit)
- [Hub-spoke network topology in Azure](https://learn.microsoft.com/azure/architecture/networking/architecture/hub-spoke)
- [Virtual network traffic routing (UDRs)](https://learn.microsoft.com/azure/virtual-network/virtual-networks-udr-overview)
- [Tutorial: Route network traffic with a route table](https://learn.microsoft.com/azure/virtual-network/tutorial-create-route-table)
