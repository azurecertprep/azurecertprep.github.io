---
sidebar_position: 15
title: "Challenge 48: Design Network Connectivity"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 48: Design Network Connectivity

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $5-20 | **Exam Weight: 30-35%**

:::

## Introduction

NexaGlobal is a multinational financial services company with offices in 5 countries (United States, United Kingdom, Germany, Singapore, Japan) and 2 on-premises data centers (New York, London). They are expanding their Azure presence from a single region (East US) to 3 regions (East US, UK South, Southeast Asia) to serve regional users with low latency.

The connectivity requirements include: secure site-to-site connections from both data centers to all Azure regions, point-to-site VPN for 2,000 remote workers, private access to Azure PaaS services (Azure SQL, Storage, Key Vault) without exposing them to the internet, optimized routing for latency-sensitive trading applications (single-digit millisecond requirements), DNS resolution that works seamlessly across on-premises and all Azure regions, and branch office connectivity for 15 satellite offices with varying bandwidth needs (10-100Mbps each).

The network team must design a solution that balances cost, performance, and operational complexity while meeting strict regulatory requirements for data residency and network encryption.

## Exam Skills Covered

- Recommend a connectivity solution that connects Azure resources to the internet
- Recommend a connectivity solution that connects Azure resources to on-premises networks
- Recommend a solution to optimize network performance

## Design Tasks

### Part 1: Hybrid Connectivity Design

1. Compare connectivity options for the 2 data centers to 3 Azure regions:
   - VPN Gateway (S2S VPN): cost per gateway, bandwidth limits by SKU, encryption overhead
   - ExpressRoute: Standard vs. Premium, bandwidth options (50Mbps to 10Gbps), peering locations
   - ExpressRoute with VPN failover: design for high availability
2. Design the ExpressRoute topology:
   - How many ExpressRoute circuits are needed? (one per data center? shared?)
   - Standard vs. Premium SKU (Premium required for cross-region/global connectivity)
   - ExpressRoute Global Reach for direct data center-to-data center connectivity via Microsoft backbone
   - Redundancy: dual circuits per location or single circuit with VPN backup
3. Design point-to-site (P2S) VPN for 2,000 remote workers:
   - VPN Gateway P2S capacity by SKU (VpnGw1-VpnGw5, max concurrent connections)
   - Authentication method: Entra ID, certificate-based, or RADIUS
   - Split tunneling vs. forced tunneling considerations for remote workers

### Part 2: Azure Network Topology

4. Design the Azure VNet architecture across 3 regions:
   - Hub-spoke topology in each region with peered hub VNets
   - vs. Azure Virtual WAN (managed hub with automated connectivity)
   - Address space planning (non-overlapping ranges for all VNets, on-premises networks, and future growth)
5. Design VNet peering strategy:
   - Regional peering (within same region, low cost)
   - Global peering (cross-region, data transfer charges apply)
   - Transit connectivity: how spoke VNets in one region reach spoke VNets in another region
   - When to use Virtual WAN hub vs. custom NVA/Azure Firewall for transit routing
6. Design NAT Gateway configuration for workloads requiring outbound internet access:
   - Which subnets need NAT Gateway (application subnets, not gateway subnets)
   - Static outbound IP requirements for third-party API allowlisting

### Part 3: Private Connectivity to PaaS Services

7. Design Private Endpoint strategy for Azure PaaS services:
   - Azure SQL Database, Storage Accounts, Key Vault: private endpoint in each region's hub VNet
   - DNS resolution for private endpoints (Private DNS Zones)
   - Cross-region access patterns: do spoke VNets in Asia need private access to SQL in East US?
8. Design the Private DNS Zone architecture:
   - Zone hosting strategy (centralized vs. per-region)
   - VNet links for DNS resolution from all spokes
   - Conditional forwarding from on-premises DNS to Azure Private DNS (via DNS forwarders in hub VNets)
   - On-premises to Azure private endpoint DNS resolution flow
9. Compare Private Endpoint vs. Service Endpoint vs. public access with firewall rules. Document when each approach is appropriate and the security implications of each.

### Part 4: DNS and Routing Optimization

10. Design the end-to-end DNS architecture:
    - On-premises DNS servers (Active Directory Integrated DNS)
    - Azure DNS Private Resolver (inbound and outbound endpoints)
    - Conditional forwarding rules for Azure private zones (privatelink.database.windows.net, etc.)
    - Forward lookup: on-premises client resolving Azure private endpoint
    - Reverse lookup: Azure VM resolving on-premises servers
11. Design routing optimization for latency-sensitive trading applications:
    - ExpressRoute Microsoft peering vs. Private peering for different traffic types
    - ExpressRoute FastPath for ultra-low-latency connectivity (bypasses gateway)
    - Proximity placement groups for co-located VMs
    - Accelerated Networking for reduced VM-to-VM latency
12. Design branch office connectivity for 15 satellite offices:
    - Virtual WAN with SD-WAN integration
    - VPN hub with multiple S2S connections
    - Compare cost and management overhead

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-48"
  items={[
    "ExpressRoute topology designed with SKU selection, redundancy model, and Global Reach justification",
    "Azure VNet architecture addresses hub-spoke topology across 3 regions with address space planning",
    "Private Endpoint strategy covers PaaS services with DNS resolution from both on-premises and Azure",
    "DNS architecture enables resolution between on-premises, Azure private zones, and public DNS",
    "Latency optimization documented for trading applications including FastPath and accelerated networking",
    "Branch office connectivity solution selected with cost and management comparison"
  ]}
/>

## Hints

<details>
<summary>Hint 1: ExpressRoute Standard vs. Premium</summary>

ExpressRoute Standard connects to Azure regions in the same geopolitical region (e.g., all US regions, all European regions). ExpressRoute Premium adds: connectivity to all Azure regions globally (e.g., circuit in London can reach East US), increased route table limits (10,000 routes vs. 4,000), and Global Reach capability. For a multinational company with circuits in different geopolitical regions needing cross-region connectivity, Premium is required. Premium costs approximately 2x the Standard circuit fee.

</details>

<details>
<summary>Hint 2: Virtual WAN vs. Custom Hub-Spoke</summary>

Azure Virtual WAN provides a managed hub with automated connectivity (VPN, ExpressRoute, P2S, VNet connections). Benefits: simplified management, any-to-any transit routing by default, integrated SD-WAN partner support, and scaling. Custom hub-spoke requires manual UDR management for transit, NVA or Azure Firewall for spoke-to-spoke routing, and more operational overhead. Choose Virtual WAN when: many branches, need SD-WAN integration, or want simplified operations. Choose custom when: you need granular route control or cost optimization for simple topologies.

</details>

<details>
<summary>Hint 3: Private DNS Zone for Private Endpoints</summary>

Each Azure PaaS service type has a specific private DNS zone name (e.g., `privatelink.database.windows.net` for Azure SQL, `privatelink.blob.core.windows.net` for Blob Storage). Create one private DNS zone per service type, link it to all VNets that need resolution, and configure on-premises DNS to forward these zones to Azure DNS (via DNS forwarder VMs or Azure DNS Private Resolver inbound endpoint at 168.63.129.16 accessible through the VNet).

</details>

<details>
<summary>Hint 4: ExpressRoute FastPath</summary>

ExpressRoute FastPath improves data path performance by bypassing the ExpressRoute virtual network gateway for data plane traffic. It sends traffic directly to VMs in the virtual network, reducing latency. FastPath is available with ExpressRoute Direct (10Gbps/100Gbps) and Ultra Performance or ErGw3AZ gateway SKUs. It does not support VNet peering transit traffic or UDR on the gateway subnet. Use it for latency-sensitive workloads where every millisecond matters.

</details>

<details>
<summary>Hint 5: Azure DNS Private Resolver</summary>

Azure DNS Private Resolver replaces the need for custom DNS forwarder VMs in hub VNets. It provides: inbound endpoints (on-premises can query Azure Private DNS zones), outbound endpoints (Azure VMs can resolve on-premises DNS zones via forwarding rules). This is a managed service with 99.99% SLA, no VM management, and automatic scaling. Deploy in the hub VNet with forwarding rulesets that specify on-premises DNS server IPs for your corporate domain zones.

</details>

## Learning Resources

- [Azure ExpressRoute overview](https://learn.microsoft.com/en-us/azure/expressroute/expressroute-introduction)
- [Azure Virtual WAN overview](https://learn.microsoft.com/en-us/azure/virtual-wan/virtual-wan-about)
- [Private endpoint DNS configuration](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns)
- [Azure DNS Private Resolver](https://learn.microsoft.com/en-us/azure/dns/dns-private-resolver-overview)
- [VPN Gateway design](https://learn.microsoft.com/en-us/azure/vpn-gateway/design)
- [Hub-spoke network topology](https://learn.microsoft.com/en-us/azure/architecture/networking/architecture/hub-spoke)

## Knowledge Check

<details>
<summary>1. A company has ExpressRoute circuits in New York (connected to East US) and London (connected to UK South). Their Azure workload in Southeast Asia needs private connectivity to both data centers. What do they need?</summary>

**ExpressRoute Premium SKU and Global Reach.** Standard ExpressRoute only connects to regions within the same geopolitical boundary. To reach Southeast Asia from circuits in the US and Europe, both circuits must be upgraded to Premium (or a new Premium circuit created in a Singapore peering location). Additionally, ExpressRoute Global Reach enables direct traffic between the New York and London data centers over the Microsoft backbone without hairpinning through Azure VNets. For optimal latency to Southeast Asia, consider adding a third circuit at a Singapore peering location.

</details>

<details>
<summary>2. An on-premises application needs to resolve the private IP of an Azure SQL Database configured with a private endpoint. The DNS query for `mydb.database.windows.net` currently returns the public IP. How do you fix this?</summary>

**Configure conditional DNS forwarding from on-premises DNS to Azure DNS.** The resolution flow should be: (1) On-premises DNS receives query for `mydb.database.windows.net`, (2) CNAME redirects to `mydb.privatelink.database.windows.net`, (3) On-premises DNS has a conditional forwarder for `privatelink.database.windows.net` pointing to Azure DNS Private Resolver inbound endpoint (or DNS forwarder VMs in the hub VNet), (4) Azure DNS resolves the private DNS zone record and returns the private IP (10.x.x.x). Without this conditional forwarding, on-premises DNS resolves against public DNS and returns the public IP.

</details>

<details>
<summary>3. A Virtual WAN hub connects 15 branch offices via S2S VPN, 2 data centers via ExpressRoute, and 3 spoke VNets. A branch office user needs to access a VM in a spoke VNet. Does this work by default?</summary>

**Yes, Virtual WAN provides any-to-any transit routing by default.** This is a key differentiator from custom hub-spoke where you must manually configure UDRs and NVAs for transit routing. In Virtual WAN, branch-to-VNet (VPN to VNet connection), VNet-to-VNet (via hub), and branch-to-branch traffic all routes through the hub automatically. You can restrict this using routing policies or route tables if needed. In custom hub-spoke, branch-to-spoke traffic requires a firewall/NVA in the hub and UDRs on the spoke subnets.

</details>

## Validation Lab

This lab proves VNet isolation and peering behavior through direct observation. You will deploy two VNets, attempt connectivity before peering (it will fail), enable peering, and confirm that private connectivity is established -- all without any public internet exposure.

### Step 1: Create the resource group and two VNets (simulating hub and spoke)

```bash
az group create \
  --name rg-az305-challenge48 \
  --location eastus
```

```bash
az network vnet create \
  --resource-group rg-az305-challenge48 \
  --name vnet-hub \
  --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-hub \
  --subnet-prefix 10.0.1.0/24
```

```bash
az network vnet create \
  --resource-group rg-az305-challenge48 \
  --name vnet-spoke \
  --address-prefix 10.1.0.0/16 \
  --subnet-name subnet-spoke \
  --subnet-prefix 10.1.1.0/24
```

:::note[Architect Insight]
VNets in Azure are fully isolated by default -- even VNets in the same subscription, same region, and same resource group cannot communicate. This is secure by design: you must explicitly opt in to connectivity. On the AZ-305 exam, remember that VNet isolation is the starting posture, not openness.
:::

### Step 2: Deploy a VM in each VNet

```bash
az vm create \
  --resource-group rg-az305-challenge48 \
  --name vm-hub \
  --vnet-name vnet-hub \
  --subnet subnet-hub \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address "" \
  --no-wait
```

```bash
az vm create \
  --resource-group rg-az305-challenge48 \
  --name vm-spoke \
  --vnet-name vnet-spoke \
  --subnet subnet-spoke \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address ""
```

Wait for both VMs to be ready:

```bash
az vm wait \
  --resource-group rg-az305-challenge48 \
  --name vm-hub \
  --created
```

Get the private IPs for later use:

```bash
HUB_IP=$(az vm show \
  --resource-group rg-az305-challenge48 \
  --name vm-hub \
  --show-details \
  --query privateIps -o tsv)

SPOKE_IP=$(az vm show \
  --resource-group rg-az305-challenge48 \
  --name vm-spoke \
  --show-details \
  --query privateIps -o tsv)

echo "Hub VM IP: $HUB_IP"
echo "Spoke VM IP: $SPOKE_IP"
```

### Step 3: Test connectivity BEFORE peering (expect FAILURE)

```bash
az vm run-command invoke \
  --resource-group rg-az305-challenge48 \
  --name vm-hub \
  --command-id RunShellScript \
  --scripts "ping -c 3 -W 2 $SPOKE_IP 2>&1 || echo 'PING FAILED: No route to host'"
```

The output should show packet loss or "Network is unreachable." This proves the default isolation behavior.

:::note[Architect Insight]
This failure is the critical observation. Many candidates assume VNets in the same region can communicate -- they cannot. The AZ-305 exam tests whether you understand that connectivity must be explicitly designed. Every peering, gateway, or NVA is a deliberate architectural choice.
:::

### Step 4: Create bidirectional VNet peering

```bash
az network vnet peering create \
  --resource-group rg-az305-challenge48 \
  --name hub-to-spoke \
  --vnet-name vnet-hub \
  --remote-vnet vnet-spoke \
  --allow-vnet-access
```

```bash
az network vnet peering create \
  --resource-group rg-az305-challenge48 \
  --name spoke-to-hub \
  --vnet-name vnet-spoke \
  --remote-vnet vnet-hub \
  --allow-vnet-access
```

### Step 5: Verify peering state shows "Connected"

```bash
az network vnet peering show \
  --resource-group rg-az305-challenge48 \
  --vnet-name vnet-hub \
  --name hub-to-spoke \
  --query "peeringState" -o tsv
```

```bash
az network vnet peering show \
  --resource-group rg-az305-challenge48 \
  --vnet-name vnet-spoke \
  --name spoke-to-hub \
  --query "peeringState" -o tsv
```

Both should return "Connected". A peering in "Initiated" state means only one side was created -- both directions must exist for traffic to flow.

### Step 6: Test connectivity AFTER peering (expect SUCCESS)

```bash
az vm run-command invoke \
  --resource-group rg-az305-challenge48 \
  --name vm-hub \
  --command-id RunShellScript \
  --scripts "ping -c 3 $SPOKE_IP"
```

The output should show successful replies with round-trip times. The traffic traverses the Microsoft backbone network -- it never touches the public internet.

:::note[Architect Insight]
Peering traffic stays on the Microsoft backbone network and is never exposed to the public internet. This is a key selling point for compliance-sensitive workloads. On the AZ-305 exam, know that peering provides private, low-latency connectivity without requiring VPN gateways or public IPs.
:::

### Step 7: Examine effective routes to see peering in action

```bash
HUB_NIC=$(az vm show \
  --resource-group rg-az305-challenge48 \
  --name vm-hub \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)

az network nic show-effective-route-table \
  --ids $HUB_NIC \
  --output table
```

Look for a route with source "VNetPeering" and the address prefix 10.1.0.0/16 (the spoke VNet range). This route was injected automatically when peering was established -- you did not create it manually.

:::note[Architect Insight]
Peering is non-transitive. If you peer VNet-A with VNet-B and VNet-B with VNet-C, VNet-A and VNet-C still cannot communicate. The effective route table only shows directly peered networks. On the AZ-305 exam, transitive routing requires either a hub NVA/Azure Firewall with UDRs or Azure Virtual WAN. This is one of the most commonly tested networking concepts.
:::

:::tip[Design Validation]
This lab proved three critical networking principles: (1) VNet isolation is the default posture -- Azure is secure by design with no implicit connectivity between VNets, (2) VNet peering enables private connectivity without gateways or public IPs, with traffic staying on the Microsoft backbone, and (3) effective routes reveal how Azure networking actually works under the hood -- peering automatically injects routes that you can inspect and reason about when troubleshooting.
:::

## Cleanup

```bash
az group delete \
  --name rg-az305-challenge48 \
  --yes \
  --no-wait
```

---

**Next**: [Challenge 49: Design Network Security and Load Balancing](/docs/az-305/infrastructure/challenge-49)
