---
sidebar_position: 8
title: "Challenge 47: Hub-spoke with NVA traffic chaining"
sidebar_label: "Challenge 47"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 47: Hub-spoke with NVA traffic chaining

:::info Estimated time and cost

**90-120 minutes** | **~$0.50/hour** (multiple VMs + load balancer) | **Exam weight: 15-20%**

:::

## Scenario

Your enterprise has adopted a hub-spoke network topology. All spoke-to-spoke and spoke-to-internet traffic must be inspected by a Linux-based Network Virtual Appliance (NVA) running iptables in the hub VNet. You must deploy two NVA instances behind an internal load balancer for high availability, configure User-Defined Routes (UDRs) to chain traffic through the NVA, and implement Application Security Group (ASG) microsegmentation in the spokes.

A critical requirement is that traffic returning from on-premises via the VPN gateway must also traverse the NVA -- preventing asymmetric routing.

---

## Architecture overview

```text
                    +-----------+
                    |  Internet |
                    +-----+-----+
                          |
              +-----------+-----------+
              |     Hub VNet          |
              |   10.0.0.0/16        |
              |                       |
              |  +------+ +------+   |
              |  | NVA1 | | NVA2 |   |
              |  +--+---+ +--+---+   |
              |     |   ILB   |      |
              |     +----+----+      |
              |  GatewaySubnet       |
              +-+--------+--------+--+
                |                 |
       +--------+---+     +------+------+
       | Spoke1 VNet|     | Spoke2 VNet |
       | 10.1.0.0/16|     | 10.2.0.0/16 |
       +------------+     +-------------+
```

---

## Task 1: Deploy the hub-spoke topology

### Azure CLI

```bash
# Variables
RG="rg-hubspoke-lab"
LOCATION="eastus"
HUB_VNET="vnet-hub"
SPOKE1_VNET="vnet-spoke1"
SPOKE2_VNET="vnet-spoke2"

# Create resource group
az group create --name $RG --location $LOCATION

# Create hub VNet with subnets
az network vnet create \
  --resource-group $RG \
  --name $HUB_VNET \
  --address-prefixes 10.0.0.0/16 \
  --subnet-name nva-subnet \
  --subnet-prefixes 10.0.1.0/24 \
  --location $LOCATION

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $HUB_VNET \
  --name GatewaySubnet \
  --address-prefixes 10.0.255.0/27

# Create spoke VNets
az network vnet create \
  --resource-group $RG \
  --name $SPOKE1_VNET \
  --address-prefixes 10.1.0.0/16 \
  --subnet-name workload-subnet \
  --subnet-prefixes 10.1.1.0/24 \
  --location $LOCATION

az network vnet create \
  --resource-group $RG \
  --name $SPOKE2_VNET \
  --address-prefixes 10.2.0.0/16 \
  --subnet-name workload-subnet \
  --subnet-prefixes 10.2.1.0/24 \
  --location $LOCATION

# Create hub-to-spoke1 peering (hub side)
az network vnet peering create \
  --resource-group $RG \
  --name hub-to-spoke1 \
  --vnet-name $HUB_VNET \
  --remote-vnet $SPOKE1_VNET \
  --allow-vnet-access true \
  --allow-forwarded-traffic true \
  --allow-gateway-transit true

# Create spoke1-to-hub peering (spoke side)
az network vnet peering create \
  --resource-group $RG \
  --name spoke1-to-hub \
  --vnet-name $SPOKE1_VNET \
  --remote-vnet $HUB_VNET \
  --allow-vnet-access true \
  --allow-forwarded-traffic true \
  --use-remote-gateways false

# Create hub-to-spoke2 peering (hub side)
az network vnet peering create \
  --resource-group $RG \
  --name hub-to-spoke2 \
  --vnet-name $HUB_VNET \
  --remote-vnet $SPOKE2_VNET \
  --allow-vnet-access true \
  --allow-forwarded-traffic true \
  --allow-gateway-transit true

# Create spoke2-to-hub peering (spoke side)
az network vnet peering create \
  --resource-group $RG \
  --name spoke2-to-hub \
  --vnet-name $SPOKE2_VNET \
  --remote-vnet $HUB_VNET \
  --allow-vnet-access true \
  --allow-forwarded-traffic true \
  --use-remote-gateways false
```

### Azure PowerShell

```powershell
$rg = "rg-hubspoke-lab"
$location = "eastus"

New-AzResourceGroup -Name $rg -Location $location

# Create hub VNet
$nvaSub = New-AzVirtualNetworkSubnetConfig -Name "nva-subnet" -AddressPrefix "10.0.1.0/24"
$gwSub = New-AzVirtualNetworkSubnetConfig -Name "GatewaySubnet" -AddressPrefix "10.0.255.0/27"
$hubVnet = New-AzVirtualNetwork -Name "vnet-hub" -ResourceGroupName $rg `
  -Location $location -AddressPrefix "10.0.0.0/16" -Subnet $nvaSub, $gwSub

# Create spoke VNets
$spoke1Sub = New-AzVirtualNetworkSubnetConfig -Name "workload-subnet" -AddressPrefix "10.1.1.0/24"
$spoke1Vnet = New-AzVirtualNetwork -Name "vnet-spoke1" -ResourceGroupName $rg `
  -Location $location -AddressPrefix "10.1.0.0/16" -Subnet $spoke1Sub

$spoke2Sub = New-AzVirtualNetworkSubnetConfig -Name "workload-subnet" -AddressPrefix "10.2.1.0/24"
$spoke2Vnet = New-AzVirtualNetwork -Name "vnet-spoke2" -ResourceGroupName $rg `
  -Location $location -AddressPrefix "10.2.0.0/16" -Subnet $spoke2Sub

# Create peerings
Add-AzVirtualNetworkPeering -Name "hub-to-spoke1" `
  -VirtualNetwork $hubVnet -RemoteVirtualNetworkId $spoke1Vnet.Id `
  -AllowForwardedTraffic -AllowGatewayTransit

Add-AzVirtualNetworkPeering -Name "spoke1-to-hub" `
  -VirtualNetwork $spoke1Vnet -RemoteVirtualNetworkId $hubVnet.Id `
  -AllowForwardedTraffic

Add-AzVirtualNetworkPeering -Name "hub-to-spoke2" `
  -VirtualNetwork $hubVnet -RemoteVirtualNetworkId $spoke2Vnet.Id `
  -AllowForwardedTraffic -AllowGatewayTransit

Add-AzVirtualNetworkPeering -Name "spoke2-to-hub" `
  -VirtualNetwork $spoke2Vnet -RemoteVirtualNetworkId $hubVnet.Id `
  -AllowForwardedTraffic
```

### Portal steps

1. Create a resource group named **rg-hubspoke-lab** in East US.
2. Create **vnet-hub** (10.0.0.0/16) with subnets: **nva-subnet** (10.0.1.0/24) and **GatewaySubnet** (10.0.255.0/27).
3. Create **vnet-spoke1** (10.1.0.0/16) with subnet **workload-subnet** (10.1.1.0/24).
4. Create **vnet-spoke2** (10.2.0.0/16) with subnet **workload-subnet** (10.2.1.0/24).
5. For each peering, navigate to the VNet, select **Peerings**, click **Add**, and enable **Allow forwarded traffic** and **Allow gateway transit** on the hub side.

---

## Task 2: Deploy NVA VMs with IP forwarding

:::warning Critical exam concept

IP forwarding must be enabled at **two levels** for an NVA to function:
1. **Azure NIC level** -- the `--ip-forwarding true` setting on the network interface
2. **Operating system level** -- `sysctl net.ipv4.ip_forward=1` inside the Linux VM

Forgetting either level is a frequent cause of traffic not flowing through the NVA.

:::

### Azure CLI

```bash
# Create NVA1
az vm create \
  --resource-group $RG \
  --name vm-nva1 \
  --image Ubuntu2404 \
  --size Standard_B2s \
  --vnet-name $HUB_VNET \
  --subnet nva-subnet \
  --private-ip-address 10.0.1.4 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --no-wait

# Create NVA2
az vm create \
  --resource-group $RG \
  --name vm-nva2 \
  --image Ubuntu2404 \
  --size Standard_B2s \
  --vnet-name $HUB_VNET \
  --subnet nva-subnet \
  --private-ip-address 10.0.1.5 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --no-wait

# Enable IP forwarding on NVA1 NIC (Azure level)
az network nic update \
  --resource-group $RG \
  --name vm-nva1VMNic \
  --ip-forwarding true

# Enable IP forwarding on NVA2 NIC (Azure level)
az network nic update \
  --resource-group $RG \
  --name vm-nva2VMNic \
  --ip-forwarding true
```

### Configure IP forwarding at the OS level

SSH into each NVA VM and run:

```bash
# Enable IP forwarding (immediate)
sudo sysctl -w net.ipv4.ip_forward=1

# Make persistent across reboots
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Configure iptables for NAT and forwarding
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sudo iptables -A FORWARD -i eth0 -j ACCEPT
sudo iptables -A FORWARD -o eth0 -m state --state RELATED,ESTABLISHED -j ACCEPT

# Persist iptables rules
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

### Azure PowerShell

```powershell
# Get the NIC and enable IP forwarding
$nic1 = Get-AzNetworkInterface -Name "vm-nva1VMNic" -ResourceGroupName $rg
$nic1.EnableIPForwarding = $true
Set-AzNetworkInterface -NetworkInterface $nic1

$nic2 = Get-AzNetworkInterface -Name "vm-nva2VMNic" -ResourceGroupName $rg
$nic2.EnableIPForwarding = $true
Set-AzNetworkInterface -NetworkInterface $nic2
```

---

## Task 3: Create User-Defined Routes

### Azure CLI

```bash
# Create route table for spoke subnets
az network route-table create \
  --resource-group $RG \
  --name rt-spoke-to-nva \
  --location $LOCATION \
  --disable-bgp-route-propagation true

# Route all traffic to NVA (using ILB frontend IP for HA)
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-to-nva \
  --name default-to-nva \
  --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.10

# Route spoke1 traffic to NVA
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-to-nva \
  --name spoke1-to-nva \
  --address-prefix 10.1.0.0/16 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.10

# Route spoke2 traffic to NVA
az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-spoke-to-nva \
  --name spoke2-to-nva \
  --address-prefix 10.2.0.0/16 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.10

# Associate route table with spoke subnets
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $SPOKE1_VNET \
  --name workload-subnet \
  --route-table rt-spoke-to-nva

az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $SPOKE2_VNET \
  --name workload-subnet \
  --route-table rt-spoke-to-nva

# Create route table for GatewaySubnet (prevents asymmetric routing)
az network route-table create \
  --resource-group $RG \
  --name rt-gateway-to-nva \
  --location $LOCATION

az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-gateway-to-nva \
  --name spoke1-via-nva \
  --address-prefix 10.1.0.0/16 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.10

az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-gateway-to-nva \
  --name spoke2-via-nva \
  --address-prefix 10.2.0.0/16 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.10

az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $HUB_VNET \
  --name GatewaySubnet \
  --route-table rt-gateway-to-nva
```

### Azure PowerShell

```powershell
# Create route table for spokes
$rtSpoke = New-AzRouteTable -Name "rt-spoke-to-nva" -ResourceGroupName $rg `
  -Location $location -DisableBgpRoutePropagation

Add-AzRouteConfig -RouteTable $rtSpoke -Name "default-to-nva" `
  -AddressPrefix "0.0.0.0/0" -NextHopType "VirtualAppliance" `
  -NextHopIpAddress "10.0.1.10" | Set-AzRouteTable

# Associate with spoke1 subnet
$spoke1Vnet = Get-AzVirtualNetwork -Name "vnet-spoke1" -ResourceGroupName $rg
Set-AzVirtualNetworkSubnetConfig -VirtualNetwork $spoke1Vnet `
  -Name "workload-subnet" -AddressPrefix "10.1.1.0/24" `
  -RouteTableId $rtSpoke.Id | Set-AzVirtualNetwork

# Create GatewaySubnet route table (asymmetric routing prevention)
$rtGw = New-AzRouteTable -Name "rt-gateway-to-nva" -ResourceGroupName $rg `
  -Location $location

Add-AzRouteConfig -RouteTable $rtGw -Name "spoke1-via-nva" `
  -AddressPrefix "10.1.0.0/16" -NextHopType "VirtualAppliance" `
  -NextHopIpAddress "10.0.1.10" | Set-AzRouteTable
```

---

## Task 4: Deploy internal load balancer for NVA high availability

### Azure CLI

```bash
# Create internal load balancer
az network lb create \
  --resource-group $RG \
  --name ilb-nva \
  --sku Standard \
  --vnet-name $HUB_VNET \
  --subnet nva-subnet \
  --frontend-ip-name fe-nva \
  --private-ip-address 10.0.1.10 \
  --backend-pool-name bp-nva

# Create health probe
az network lb probe create \
  --resource-group $RG \
  --lb-name ilb-nva \
  --name probe-nva \
  --protocol Tcp \
  --port 22 \
  --interval 5 \
  --threshold 2

# Create HA ports rule (forwards ALL traffic)
az network lb rule create \
  --resource-group $RG \
  --lb-name ilb-nva \
  --name rule-ha-ports \
  --protocol All \
  --frontend-port 0 \
  --backend-port 0 \
  --frontend-ip-name fe-nva \
  --backend-pool-name bp-nva \
  --probe-name probe-nva \
  --enable-floating-ip false

# Add NVA NICs to backend pool
az network nic ip-config update \
  --resource-group $RG \
  --nic-name vm-nva1VMNic \
  --name ipconfig1 \
  --lb-address-pools bp-nva \
  --lb-name ilb-nva

az network nic ip-config update \
  --resource-group $RG \
  --nic-name vm-nva2VMNic \
  --name ipconfig1 \
  --lb-address-pools bp-nva \
  --lb-name ilb-nva
```

### Azure PowerShell

```powershell
# Create internal LB
$feIP = New-AzLoadBalancerFrontendIpConfig -Name "fe-nva" `
  -PrivateIpAddress "10.0.1.10" `
  -SubnetId ($hubVnet.Subnets | Where-Object Name -eq "nva-subnet").Id

$bePool = New-AzLoadBalancerBackendAddressPoolConfig -Name "bp-nva"

$probe = New-AzLoadBalancerProbeConfig -Name "probe-nva" `
  -Protocol Tcp -Port 22 -IntervalInSeconds 5 -ProbeCount 2

$lbRule = New-AzLoadBalancerRuleConfig -Name "rule-ha-ports" `
  -FrontendIpConfiguration $feIP -BackendAddressPool $bePool `
  -Probe $probe -Protocol All -FrontendPort 0 -BackendPort 0

New-AzLoadBalancer -Name "ilb-nva" -ResourceGroupName $rg `
  -Location $location -Sku Standard `
  -FrontendIpConfiguration $feIP -BackendAddressPool $bePool `
  -Probe $probe -LoadBalancingRule $lbRule
```

---

## Task 5: Configure ASG-based microsegmentation in spokes

### Azure CLI

```bash
# Create ASGs
az network asg create \
  --resource-group $RG \
  --name asg-web \
  --location $LOCATION

az network asg create \
  --resource-group $RG \
  --name asg-app \
  --location $LOCATION

az network asg create \
  --resource-group $RG \
  --name asg-db \
  --location $LOCATION

# Create NSG with ASG-based rules
az network nsg create \
  --resource-group $RG \
  --name nsg-spoke1-workload \
  --location $LOCATION

# Allow web tier to app tier on port 8080
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-spoke1-workload \
  --name allow-web-to-app \
  --priority 100 \
  --direction Inbound \
  --source-asgs asg-web \
  --destination-asgs asg-app \
  --destination-port-ranges 8080 \
  --protocol Tcp \
  --access Allow

# Allow app tier to db tier on port 1433
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-spoke1-workload \
  --priority 110 \
  --name allow-app-to-db \
  --direction Inbound \
  --source-asgs asg-app \
  --destination-asgs asg-db \
  --destination-port-ranges 1433 \
  --protocol Tcp \
  --access Allow

# Deny all other intra-subnet traffic
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-spoke1-workload \
  --name deny-all-inbound \
  --priority 4000 \
  --direction Inbound \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*" \
  --protocol "*" \
  --access Deny

# Associate NSG with subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $SPOKE1_VNET \
  --name workload-subnet \
  --network-security-group nsg-spoke1-workload
```

---

## Break & fix

### Scenario 1: Traffic not flowing through NVA

**Symptom:** VMs in spoke1 cannot reach VMs in spoke2, even though peering is configured and UDRs point to the NVA.

**Root cause:** IP forwarding is enabled on the Azure NIC but not inside the Linux OS.

**Diagnosis:**

```bash
# Check Azure NIC level
az network nic show \
  --resource-group $RG \
  --name vm-nva1VMNic \
  --query "enableIPForwarding"

# SSH into NVA and check OS level
cat /proc/sys/net/ipv4/ip_forward
# Returns 0 if disabled
```

**Fix:**

```bash
# Inside the NVA VM
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
```

---

### Scenario 2: Asymmetric routing from on-premises

**Symptom:** On-premises clients can initiate connections to spoke VMs, but response packets take a different path (bypassing the NVA). Stateful inspection on the NVA drops the return traffic.

**Root cause:** The GatewaySubnet does not have a UDR pointing spoke prefixes to the NVA. The gateway sends traffic directly to the spoke via peering instead of through the NVA.

**Fix:**

```bash
# Create and associate route table on GatewaySubnet
az network route-table create \
  --resource-group $RG \
  --name rt-gateway-to-nva \
  --location $LOCATION

az network route-table route create \
  --resource-group $RG \
  --route-table-name rt-gateway-to-nva \
  --name spoke1-via-nva \
  --address-prefix 10.1.0.0/16 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.0.1.10

az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $HUB_VNET \
  --name GatewaySubnet \
  --route-table rt-gateway-to-nva
```

---

### Scenario 3: Spoke-to-spoke traffic failing

**Symptom:** Traffic from spoke1 reaches the NVA but never arrives at spoke2.

**Root cause:** The peering from the hub to spoke2 does not have `--allow-forwarded-traffic true`. Because the traffic arrives at the hub NVA (forwarded from spoke1), the hub-to-spoke2 peering drops it.

**Fix:**

```bash
az network vnet peering update \
  --resource-group $RG \
  --name hub-to-spoke2 \
  --vnet-name $HUB_VNET \
  --set allowForwardedTraffic=true
```

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-47-q1",
    question: "An NVA deployed in Azure is not forwarding traffic between subnets. The Azure NIC has IP forwarding enabled. What is the most likely cause?",
    options: [
      "The NSG on the NVA subnet is blocking traffic",
      "IP forwarding is not enabled at the OS level inside the VM ✅",
      "The route table has an incorrect next-hop IP address",
      "The VNet peering is not configured"
    ],
    correctIndex: 1,
    explanation: "IP forwarding must be enabled at BOTH the Azure NIC level and inside the VM operating system. The Azure NIC setting allows the platform to deliver non-addressed packets to the VM, but the OS must also be configured to forward those packets (net.ipv4.ip_forward=1 on Linux)."
  },
  {
    id: "az700-47-q2",
    question: "Which UDR next-hop type should you use when routing traffic to an NVA?",
    options: [
      "VnetLocal",
      "Internet",
      "VirtualAppliance ✅",
      "VirtualNetworkGateway"
    ],
    correctIndex: 2,
    explanation: "VirtualAppliance is the correct next-hop type for routing traffic to an NVA. You specify the private IP address of the NVA (or ILB frontend) as the next-hop IP address."
  },
  {
    id: "az700-47-q3",
    question: "You have a hub-spoke topology with a VPN gateway in the hub. On-premises traffic to spoke VMs bypasses the NVA on the return path. What should you do?",
    options: [
      "Enable IP forwarding on the VPN gateway",
      "Create a UDR on the GatewaySubnet pointing spoke prefixes to the NVA ✅",
      "Disable BGP route propagation on the spoke subnets",
      "Change the peering to use remote gateways"
    ],
    correctIndex: 1,
    explanation: "To prevent asymmetric routing, you must place a UDR on the GatewaySubnet that directs spoke-destined traffic through the NVA. Without this, the gateway sends traffic directly to the spoke via peering, bypassing the NVA."
  },
  {
    id: "az700-47-q4",
    question: "What VNet peering setting must be enabled on the hub side to allow spoke-to-spoke traffic through an NVA?",
    options: [
      "Allow virtual network access",
      "Use remote gateways",
      "Allow forwarded traffic ✅",
      "Allow gateway transit"
    ],
    correctIndex: 2,
    explanation: "Allow forwarded traffic must be enabled on the peering. Since spoke-to-spoke traffic is forwarded by the NVA in the hub, the hub-to-spoke peering must accept forwarded traffic. Without this setting, Azure drops packets that were forwarded from another source."
  },
  {
    id: "az700-47-q5",
    question: "You deploy two NVAs behind an internal Standard Load Balancer for high availability. What load balancing rule configuration allows ALL protocols and ports to be forwarded?",
    options: [
      "Protocol: TCP, Frontend port: 0, Backend port: 0",
      "Protocol: All, Frontend port: 0, Backend port: 0 (HA Ports) ✅",
      "Protocol: UDP, Frontend port: *, Backend port: *",
      "Protocol: All, Frontend port: 443, Backend port: 443"
    ],
    correctIndex: 1,
    explanation: "HA Ports rules use Protocol: All with Frontend port: 0 and Backend port: 0. This forwards all TCP and UDP traffic on all ports to the backend NVAs. HA Ports is only available on Standard SKU internal load balancers."
  },
  {
    id: "az700-47-q6",
    question: "Why should you set --disable-bgp-route-propagation true on the spoke route tables?",
    options: [
      "To prevent BGP routes from the VPN gateway from overriding the UDR to the NVA ✅",
      "To reduce the number of routes in the routing table",
      "To prevent spoke VMs from learning hub routes",
      "To enable faster convergence after NVA failover"
    ],
    correctIndex: 0,
    explanation: "When a VPN or ExpressRoute gateway propagates BGP routes, they can override your custom UDR entries. Disabling BGP route propagation ensures that the UDR pointing traffic to the NVA takes precedence over any BGP-learned routes."
  }
]} />

---

## Cleanup

```bash
az group delete --name $RG --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-hubspoke-lab" -Force -AsJob
```

---

:::danger Cost warning

This lab deploys multiple VMs (NVAs + workload VMs) and an internal Standard Load Balancer. Estimated cost is approximately **$0.50/hour**. Delete the resource group immediately after completing the lab to avoid unexpected charges.

:::
