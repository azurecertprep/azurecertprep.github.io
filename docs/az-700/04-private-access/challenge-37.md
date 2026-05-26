---
sidebar_position: 4
title: "Challenge 37: Private Link with On-Premises Clients"
sidebar_label: "Challenge 37"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 37: Private Link with on-premises clients

:::info Estimated time and cost

**60-90 minutes** | **~$0.20/h** (DNS Private Resolver) | **Exam weight: 10-15%**

:::

## Scenario

Contoso Ltd operates a hybrid environment with an on-premises datacenter connected to Azure via a site-to-site VPN. The company has deployed Private Endpoints for Azure Storage and Azure SQL Database. However, on-premises clients cannot resolve the Private Endpoint FQDNs to private IP addresses -- they still resolve to public IPs because on-premises DNS servers have no knowledge of Azure Private DNS zones.

Your task is to deploy Azure DNS Private Resolver to enable bidirectional DNS resolution between on-premises and Azure. On-premises clients must resolve Azure Private Endpoint names to private IPs (via the inbound endpoint), and Azure workloads must resolve on-premises domain names (via the outbound endpoint with forwarding rules).

### Architecture overview

![Challenge 37 - Network Topology](/img/az-700/challenge-37-topology.svg)


### Key concepts

- **Inbound endpoint**: Receives DNS queries from on-premises (or other VNets) and resolves them using Azure DNS (including Private DNS zones linked to the VNet).
- **Outbound endpoint**: Sends DNS queries from Azure to external DNS servers (like on-premises DNS) based on forwarding rules.
- **Forwarding ruleset**: A collection of rules that map domain names to target DNS servers for conditional forwarding.
- **Subnet delegation**: Both inbound and outbound endpoints require dedicated subnets delegated to `Microsoft.Network/dnsResolvers`. Minimum size is /28.

---

## Task 1: Deploy the hub VNet with dedicated subnets

### Azure CLI

```bash
# Variables
RG="rg-challenge37"
LOCATION="eastus"
VNET_NAME="vnet-hub"
VNET_PREFIX="10.0.0.0/16"
SNET_INBOUND="snet-inbound"
SNET_OUTBOUND="snet-outbound"
SNET_WORKLOAD="snet-workload"

# Create resource group
az group create --name $RG --location $LOCATION

# Create the hub VNet
az network vnet create \
  --resource-group $RG \
  --name $VNET_NAME \
  --location $LOCATION \
  --address-prefixes $VNET_PREFIX

# Create inbound endpoint subnet with delegation (minimum /28)
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SNET_INBOUND \
  --address-prefixes "10.0.0.0/28" \
  --delegations "Microsoft.Network/dnsResolvers"

# Create outbound endpoint subnet with delegation (minimum /28)
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SNET_OUTBOUND \
  --address-prefixes "10.0.0.16/28" \
  --delegations "Microsoft.Network/dnsResolvers"

# Create a workload subnet for test VMs
az network vnet subnet create \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SNET_WORKLOAD \
  --address-prefixes "10.0.1.0/24"
```

### Azure PowerShell

```powershell
# Variables
$rg = "rg-challenge37"
$location = "eastus"
$vnetName = "vnet-hub"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Create VNet with subnets (inbound and outbound require delegation)
$inboundSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-inbound" `
  -AddressPrefix "10.0.0.0/28" `
  -Delegation (New-AzDelegation -Name "dns-resolver-delegation" -ServiceName "Microsoft.Network/dnsResolvers")

$outboundSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-outbound" `
  -AddressPrefix "10.0.0.16/28" `
  -Delegation (New-AzDelegation -Name "dns-resolver-delegation" -ServiceName "Microsoft.Network/dnsResolvers")

$workloadSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-workload" `
  -AddressPrefix "10.0.1.0/24"

New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name $vnetName `
  -Location $location `
  -AddressPrefix "10.0.0.0/16" `
  -Subnet @($inboundSubnet, $outboundSubnet, $workloadSubnet)
```

### Portal

1. Navigate to **Virtual networks** and select **+ Create**.
2. Set resource group to `rg-challenge37`, name to `vnet-hub`, region to **East US**.
3. Under **IP addresses**, add address space `10.0.0.0/16`.
4. Add subnet `snet-inbound` with prefix `10.0.0.0/28`. Under **Subnet delegation**, select `Microsoft.Network/dnsResolvers`.
5. Add subnet `snet-outbound` with prefix `10.0.0.16/28`. Under **Subnet delegation**, select `Microsoft.Network/dnsResolvers`.
6. Add subnet `snet-workload` with prefix `10.0.1.0/24` (no delegation).
7. Select **Review + create**, then **Create**.

---

## Task 2: Deploy Azure DNS Private Resolver

### Azure CLI

```bash
RESOLVER_NAME="dnspr-contoso"

# Create the DNS Private Resolver
az dns-resolver create \
  --name $RESOLVER_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --id "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Network/virtualNetworks/$VNET_NAME"

# Create the inbound endpoint
az dns-resolver inbound-endpoint create \
  --name "inbound-ep" \
  --dns-resolver-name $RESOLVER_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --ip-configurations "[{\"private-ip-allocation-method\":\"Dynamic\",\"id\":\"/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Network/virtualNetworks/$VNET_NAME/subnets/$SNET_INBOUND\"}]"

# Retrieve the inbound endpoint IP (this is what on-prem DNS will forward to)
az dns-resolver inbound-endpoint show \
  --name "inbound-ep" \
  --dns-resolver-name $RESOLVER_NAME \
  --resource-group $RG \
  --query "ipConfigurations[0].privateIpAddress" -o tsv

# Create the outbound endpoint
az dns-resolver outbound-endpoint create \
  --name "outbound-ep" \
  --dns-resolver-name $RESOLVER_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --id "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Network/virtualNetworks/$VNET_NAME/subnets/$SNET_OUTBOUND"
```

### Azure PowerShell

```powershell
$resolverName = "dnspr-contoso"
$subscriptionId = (Get-AzContext).Subscription.Id
$vnetId = "/subscriptions/$subscriptionId/resourceGroups/$rg/providers/Microsoft.Network/virtualNetworks/$vnetName"

# Create DNS Private Resolver
New-AzDnsResolver `
  -Name $resolverName `
  -ResourceGroupName $rg `
  -Location $location `
  -VirtualNetworkId $vnetId

# Create inbound endpoint
$inboundSubnetId = "$vnetId/subnets/snet-inbound"
$ipConfig = New-AzDnsResolverIPConfigurationObject `
  -PrivateIPAllocationMethod "Dynamic" `
  -SubnetId $inboundSubnetId

New-AzDnsResolverInboundEndpoint `
  -DnsResolverName $resolverName `
  -Name "inbound-ep" `
  -ResourceGroupName $rg `
  -Location $location `
  -IPConfiguration $ipConfig

# Get inbound endpoint IP
$inboundEp = Get-AzDnsResolverInboundEndpoint `
  -Name "inbound-ep" `
  -DnsResolverName $resolverName `
  -ResourceGroupName $rg
$inboundIp = $inboundEp.IPConfiguration[0].PrivateIPAddress
Write-Output "Inbound endpoint IP: $inboundIp"

# Create outbound endpoint
$outboundSubnetId = "$vnetId/subnets/snet-outbound"
New-AzDnsResolverOutboundEndpoint `
  -DnsResolverName $resolverName `
  -Name "outbound-ep" `
  -ResourceGroupName $rg `
  -Location $location `
  -SubnetId $outboundSubnetId
```

### Portal

1. Search for **DNS Private Resolvers** and select **+ Create**.
2. Set resource group, name to `dnspr-contoso`, and region to **East US**.
3. Select the VNet `vnet-hub`.
4. Under **Inbound Endpoints**, add one named `inbound-ep` and select subnet `snet-inbound`.
5. Under **Outbound Endpoints**, add one named `outbound-ep` and select subnet `snet-outbound`.
6. Select **Review + create**, then **Create**.
7. After deployment, note the **inbound endpoint IP** from the resource overview.

---

## Task 3: Create a DNS forwarding ruleset (Azure to on-premises)

The outbound endpoint enables Azure VMs to resolve on-premises domains by forwarding queries to on-premises DNS servers.

### Azure CLI

```bash
RULESET_NAME="fwrs-contoso"
ONPREM_DNS_IP="192.168.1.10"

# Create the forwarding ruleset linked to the outbound endpoint
az dns-resolver forwarding-ruleset create \
  --name $RULESET_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --outbound-endpoints "[{\"id\":\"/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Network/dnsResolvers/$RESOLVER_NAME/outboundEndpoints/outbound-ep\"}]"

# Create a forwarding rule for on-premises domain
az dns-resolver forwarding-rule create \
  --name "contoso-local" \
  --ruleset-name $RULESET_NAME \
  --resource-group $RG \
  --domain-name "contoso.local." \
  --forwarding-rule-state "Enabled" \
  --target-dns-servers "[{\"ip-address\":\"$ONPREM_DNS_IP\",\"port\":53}]"

# Link the forwarding ruleset to the hub VNet
az dns-resolver vnet-link create \
  --name "link-hub-vnet" \
  --ruleset-name $RULESET_NAME \
  --resource-group $RG \
  --id "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.Network/virtualNetworks/$VNET_NAME"
```

### Azure PowerShell

```powershell
$rulesetName = "fwrs-contoso"
$onpremDnsIp = "192.168.1.10"
$outboundEpId = "/subscriptions/$subscriptionId/resourceGroups/$rg/providers/Microsoft.Network/dnsResolvers/$resolverName/outboundEndpoints/outbound-ep"

# Create forwarding ruleset
$outboundEpRef = @{ Id = $outboundEpId }
New-AzDnsForwardingRuleset `
  -Name $rulesetName `
  -ResourceGroupName $rg `
  -Location $location `
  -DnsResolverOutboundEndpoint @($outboundEpRef)

# Create forwarding rule for on-premises domain
$targetDns = New-AzDnsResolverTargetDnsServerObject -IPAddress $onpremDnsIp -Port 53
New-AzDnsForwardingRulesetForwardingRule `
  -ResourceGroupName $rg `
  -DnsForwardingRulesetName $rulesetName `
  -Name "contoso-local" `
  -DomainName "contoso.local." `
  -ForwardingRuleState "Enabled" `
  -TargetDnsServer @($targetDns)

# Link ruleset to VNet
New-AzDnsForwardingRulesetVirtualNetworkLink `
  -DnsForwardingRulesetName $rulesetName `
  -ResourceGroupName $rg `
  -Name "link-hub-vnet" `
  -VirtualNetworkId $vnetId
```

### Portal

1. In the DNS Private Resolver resource, navigate to **Forwarding Rulesets** or search for **DNS forwarding rulesets**.
2. Select **+ Create**, set name to `fwrs-contoso`, select region, and choose the outbound endpoint `outbound-ep`.
3. Add a **Forwarding Rule**:
   - Rule name: `contoso-local`
   - Domain name: `contoso.local.` (trailing dot required)
   - Target DNS servers: `192.168.1.10:53`
   - State: Enabled
4. Under **Virtual Network Links**, add a link to `vnet-hub`.
5. Select **Review + create**, then **Create**.

---

## Task 4: Configure on-premises DNS conditional forwarder

On the on-premises Windows DNS server, configure conditional forwarders so that queries for Azure Private DNS zones are forwarded to the Private Resolver inbound endpoint IP.

### PowerShell (on Windows DNS server)

```powershell
# Get the inbound endpoint IP from Task 2 (e.g., 10.0.0.4)
$inboundEndpointIp = "10.0.0.4"

# Add conditional forwarders for Azure Private DNS zones
Add-DnsServerConditionalForwarderZone `
  -Name "privatelink.blob.core.windows.net" `
  -MasterServers $inboundEndpointIp `
  -ReplicationScope "Forest"

Add-DnsServerConditionalForwarderZone `
  -Name "privatelink.database.windows.net" `
  -MasterServers $inboundEndpointIp `
  -ReplicationScope "Forest"

Add-DnsServerConditionalForwarderZone `
  -Name "privatelink.vaultcore.azure.net" `
  -MasterServers $inboundEndpointIp `
  -ReplicationScope "Forest"

# Verify conditional forwarders
Get-DnsServerZone | Where-Object { $_.ZoneType -eq "Forwarder" }
```

:::tip Important
The trailing dot on domain names is implied in Windows DNS Manager but required in some contexts. When adding conditional forwarders in DNS Manager GUI, do not include the trailing dot. In the DNS Private Resolver forwarding rules, always include the trailing dot (e.g., `contoso.local.`).
:::

---

## Task 5: Validate end-to-end DNS resolution

### From an on-premises client (simulated with a VM)

```bash
# Verify that Private Endpoint FQDN resolves to private IP
nslookup contosostorage.blob.core.windows.net
# Expected: resolves to 10.0.x.x (private IP from PE)

# Verify the resolution chain
nslookup contosostorage.privatelink.blob.core.windows.net
# Expected: same private IP
```

### From an Azure VM (verify outbound forwarding)

```bash
# Verify that on-premises domain resolves via outbound endpoint
nslookup dc01.contoso.local
# Expected: resolves to 192.168.1.x (on-prem IP)

# Verify Azure Private DNS still works
nslookup contosostorage.blob.core.windows.net
# Expected: resolves to private IP
```

---

## Break & fix

### Scenario 1: On-premises DNS not forwarding correctly

**Symptom**: On-premises clients resolve `storageaccount.blob.core.windows.net` to a public IP instead of the Private Endpoint private IP.

**Root cause**: The conditional forwarder on the on-premises DNS server is pointing to the wrong IP address (e.g., the outbound endpoint IP instead of the inbound endpoint IP).

**Fix**:

```powershell
# Check current conditional forwarder configuration
Get-DnsServerZone -Name "privatelink.blob.core.windows.net"

# Remove incorrect forwarder
Remove-DnsServerZone -Name "privatelink.blob.core.windows.net" -Force

# Add correct forwarder pointing to INBOUND endpoint IP
Add-DnsServerConditionalForwarderZone `
  -Name "privatelink.blob.core.windows.net" `
  -MasterServers "10.0.0.4"
```

**Key insight**: The inbound endpoint receives queries from outside Azure (on-premises). The outbound endpoint sends queries from Azure to external servers. Confusing these is the most common misconfiguration.

---

### Scenario 2: Private Resolver inbound endpoint in wrong subnet

**Symptom**: Deployment of the inbound endpoint fails with an error about subnet delegation.

**Root cause**: The inbound endpoint was placed in a subnet that either lacks the `Microsoft.Network/dnsResolvers` delegation or is shared with other resources.

**Fix**:

```bash
# Verify subnet delegation
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SNET_INBOUND \
  --query "delegations[].serviceName" -o tsv

# If delegation is missing, update the subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SNET_INBOUND \
  --delegations "Microsoft.Network/dnsResolvers"
```

**Key insight**: DNS Resolver subnets must be dedicated -- no other resources can be deployed in them. Each subnet must be at least /28 (16 addresses).

---

### Scenario 3: DNS forwarding ruleset missing target DNS server

**Symptom**: Azure VMs cannot resolve on-premises hostnames (e.g., `dc01.contoso.local` returns NXDOMAIN).

**Root cause**: The forwarding ruleset either has no rule for the on-premises domain, or the rule has an incorrect or missing target DNS server IP.

**Fix**:

```bash
# List existing forwarding rules
az dns-resolver forwarding-rule list \
  --ruleset-name $RULESET_NAME \
  --resource-group $RG \
  --query "[].{name:name, domain:domainName, servers:targetDnsServers}" -o table

# If the rule is missing, create it
az dns-resolver forwarding-rule create \
  --name "contoso-local" \
  --ruleset-name $RULESET_NAME \
  --resource-group $RG \
  --domain-name "contoso.local." \
  --forwarding-rule-state "Enabled" \
  --target-dns-servers "[{\"ip-address\":\"192.168.1.10\",\"port\":53}]"

# Verify the VNet link exists (ruleset must be linked to the VNet)
az dns-resolver vnet-link list \
  --ruleset-name $RULESET_NAME \
  --resource-group $RG
```

**Key insight**: A forwarding ruleset only affects VNets that are linked to it. If the VNet link is missing, Azure VMs in that VNet will not use the forwarding rules.

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-37-q1",
    question: "What is the purpose of the Azure DNS Private Resolver inbound endpoint?",
    options: [
      "Sends DNS queries from Azure to on-premises DNS servers",
      "Receives DNS queries from on-premises or peered VNets and resolves them using Azure DNS \u2705",
      "Blocks DNS queries from reaching Azure Private DNS zones",
      "Provides public DNS resolution for Azure resources"
    ],
    correctIndex: 1,
    explanation: "The inbound endpoint receives DNS queries from outside Azure (on-premises networks, peered VNets) and resolves them using Azure DNS, including Private DNS zones linked to the resolver VNet."
  },
  {
    id: "az700-37-q2",
    question: "What is the minimum subnet size required for a DNS Private Resolver endpoint?",
    options: [
      "/30 (4 addresses)",
      "/29 (8 addresses)",
      "/28 (16 addresses) \u2705",
      "/27 (32 addresses)"
    ],
    correctIndex: 2,
    explanation: "Both inbound and outbound endpoint subnets require a minimum of /28 (16 IP addresses). The subnets must be delegated to Microsoft.Network/dnsResolvers and cannot contain other resources."
  },
  {
    id: "az700-37-q3",
    question: "Which delegation must be applied to subnets used by DNS Private Resolver endpoints?",
    options: [
      "Microsoft.Network/virtualNetworks",
      "Microsoft.Network/dnsResolvers \u2705",
      "Microsoft.Network/privateDnsZones",
      "Microsoft.Network/dnsForwardingRulesets"
    ],
    correctIndex: 1,
    explanation: "Subnets for both inbound and outbound endpoints must be delegated to Microsoft.Network/dnsResolvers. This ensures the subnet is exclusively used by the DNS Private Resolver service."
  },
  {
    id: "az700-37-q4",
    question: "In a hybrid scenario, what should the on-premises DNS server conditional forwarder point to for resolving Azure Private Endpoint names?",
    options: [
      "The Azure public DNS servers (168.63.129.16)",
      "The Private Resolver outbound endpoint IP",
      "The Private Resolver inbound endpoint IP \u2705",
      "The Azure Private DNS zone IP address"
    ],
    correctIndex: 2,
    explanation: "On-premises DNS conditional forwarders should point to the Private Resolver inbound endpoint IP. This IP receives DNS queries and resolves them against Azure DNS (including Private DNS zones linked to the resolver VNet)."
  },
  {
    id: "az700-37-q5",
    question: "What happens if a forwarding ruleset is created but not linked to a VNet?",
    options: [
      "The ruleset automatically applies to all VNets in the subscription",
      "The ruleset has no effect; VMs in the VNet will not use the forwarding rules \u2705",
      "The ruleset applies only to the VNet where the resolver is deployed",
      "DNS resolution fails completely for all Azure VMs"
    ],
    correctIndex: 1,
    explanation: "A forwarding ruleset must be explicitly linked to each VNet where it should apply. Without a VNet link, the forwarding rules have no effect and DNS queries from VMs in that VNet will not be forwarded."
  },
  {
    id: "az700-37-q6",
    question: "Which trailing character is required in the domain-name field when creating a DNS forwarding rule?",
    options: [
      "A semicolon (;)",
      "A forward slash (/)",
      "A trailing dot (.) \u2705",
      "No special character is required"
    ],
    correctIndex: 2,
    explanation: "The domain name in a DNS forwarding rule must end with a trailing dot (e.g., contoso.local.) to indicate it is a fully qualified domain name. This follows standard DNS naming conventions."
  }
]} />

---

## Cleanup

```bash
# Delete all resources
az group delete --name rg-challenge37 --yes --no-wait
```

```powershell
# PowerShell cleanup
Remove-AzResourceGroup -Name "rg-challenge37" -Force -AsJob
```

:::warning Cost management
Azure DNS Private Resolver charges approximately **$0.20/hour** per resolver instance (inbound + outbound endpoints). Running for a full month costs approximately **$146/month**. Delete the resolver immediately after completing this challenge to avoid unexpected charges.
:::

---

## Summary

In this challenge, you deployed Azure DNS Private Resolver to enable bidirectional DNS resolution in a hybrid environment. You configured the inbound endpoint to receive queries from on-premises, the outbound endpoint with forwarding rules for Azure-to-on-premises resolution, and validated the complete DNS resolution chain. Understanding this architecture is essential for the AZ-700 exam, as Private Resolver is the recommended solution for hybrid DNS in Azure.
