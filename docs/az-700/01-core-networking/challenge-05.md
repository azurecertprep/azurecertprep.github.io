---
sidebar_position: 5
title: "Challenge 05: Azure DNS Private Resolver"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 05: Azure DNS Private Resolver

:::info Estimated time and cost

**90-120 minutes** | **~$0.18/hour per endpoint** | **Exam weight: 15-20%**

:::

## Scenario

Contoso has a hybrid environment with on-premises DNS servers (Active Directory DNS at 10.1.0.4 and 10.1.0.5) and Azure workloads using Azure Private DNS zones. Currently, conditional forwarders on the on-prem DNS servers point to a pair of IaaS DNS forwarder VMs in the hub VNet. The team wants to eliminate these VMs and replace them with Azure DNS Private Resolver for bidirectional DNS resolution between on-premises and Azure.

The architecture requires:
- On-premises clients resolving Azure Private DNS zone records (such as `db.contoso.internal` linked to a private endpoint) via the inbound endpoint
- Azure workloads in spoke VNets resolving on-premises Active Directory domains (such as `corp.contoso.com`) via the outbound endpoint and forwarding rules

## Learning objectives

After completing this challenge you will be able to:

- Deploy an Azure DNS Private Resolver in a hub virtual network
- Configure an inbound endpoint for on-premises to Azure DNS resolution
- Configure an outbound endpoint for Azure to on-premises DNS resolution
- Create DNS forwarding rulesets and rules targeting on-premises DNS servers
- Link forwarding rulesets to spoke virtual networks
- Validate bidirectional hybrid DNS resolution

## Prerequisites

- An Azure subscription with Contributor access
- Azure CLI installed and authenticated (`az login`)
- The `dns-resolver` CLI extension (auto-installs on first use, requires CLI version 2.75.0+)
- A resource group and hub VNet (or permission to create them)
- Understanding of Azure Private DNS zones and hybrid DNS concepts
- (Optional) On-premises DNS servers reachable via ExpressRoute or VPN for end-to-end testing

---

## Task 1: Create the hub VNet with dedicated resolver subnets

The DNS Private Resolver requires two dedicated subnets (one for inbound, one for outbound), each with a minimum size of /28 and delegated to `Microsoft.Network/dnsResolvers`.

### Step 1: Create the resource group

```bash
az group create \
    --name rg-dns-resolver-lab \
    --location eastus2
```

### Step 2: Create the hub virtual network

```bash
az network vnet create \
    --resource-group rg-dns-resolver-lab \
    --name vnet-hub \
    --address-prefixes 10.0.0.0/16 \
    --location eastus2
```

### Step 3: Create the inbound endpoint subnet with delegation

```bash
az network vnet subnet create \
    --resource-group rg-dns-resolver-lab \
    --vnet-name vnet-hub \
    --name snet-dns-inbound \
    --address-prefixes 10.0.0.0/28 \
    --delegations Microsoft.Network/dnsResolvers
```

### Step 4: Create the outbound endpoint subnet with delegation

```bash
az network vnet subnet create \
    --resource-group rg-dns-resolver-lab \
    --vnet-name vnet-hub \
    --name snet-dns-outbound \
    --address-prefixes 10.0.0.16/28 \
    --delegations Microsoft.Network/dnsResolvers
```

:::tip Exam note

Both subnets must be delegated to `Microsoft.Network/dnsResolvers`. You cannot use the same subnet for both inbound and outbound endpoints. The minimum subnet size is /28 (16 addresses). No other resources can reside in these delegated subnets.

:::

### Step 5: Create a spoke VNet (for later ruleset linking)

```bash
az network vnet create \
    --resource-group rg-dns-resolver-lab \
    --name vnet-spoke-01 \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name snet-workload \
    --subnet-prefixes 10.1.1.0/24 \
    --location eastus2
```

---

## Task 2: Deploy the Azure DNS Private Resolver

Create the DNS Private Resolver resource in the hub VNet.

### Step 1: Create the DNS Private Resolver

```bash
az dns-resolver create \
    --name dnspr-hub-eastus2 \
    --resource-group rg-dns-resolver-lab \
    --location eastus2 \
    --id "/subscriptions/<subscription-id>/resourceGroups/rg-dns-resolver-lab/providers/Microsoft.Network/virtualNetworks/vnet-hub"
```

The `--id` parameter specifies the virtual network resource ID where the resolver will be deployed.

:::note

Replace `<subscription-id>` with your actual Azure subscription ID. You can retrieve it with `az account show --query id --output tsv`.

:::

### Step 2: Verify the resolver was created

```bash
az dns-resolver show \
    --name dnspr-hub-eastus2 \
    --resource-group rg-dns-resolver-lab \
    --output table
![Challenge 05 - Network Topology](/img/az-700/challenge-05-topology.svg)


The `--ip-configurations` parameter accepts a JSON array specifying the subnet and IP allocation method. Use `Dynamic` to let Azure assign an available IP from the subnet, or `Static` with a `private-ip-address` field to pin a specific address.

### Step 2: Retrieve the assigned IP address

```bash
az dns-resolver inbound-endpoint show \
    --dns-resolver-name dnspr-hub-eastus2 \
    --name ie-inbound \
    --resource-group rg-dns-resolver-lab \
    --query "ipConfigurations[0].privateIpAddress" \
    --output tsv
```

Record this IP address (for example, `10.0.0.4`). This is the address that on-premises conditional forwarders must target instead of the old IaaS forwarder VMs.

### Step 3: (Optional) Create with a static IP

If you need a predictable IP address for firewall rules or DNS configuration:

```bash
az dns-resolver inbound-endpoint create \
    --dns-resolver-name dnspr-hub-eastus2 \
    --name ie-inbound-static \
    --resource-group rg-dns-resolver-lab \
    --location eastus2 \
    --ip-configurations "[{private-ip-address:10.0.0.10,private-ip-allocation-method:Static,id:/subscriptions/<subscription-id>/resourceGroups/rg-dns-resolver-lab/providers/Microsoft.Network/virtualNetworks/vnet-hub/subnets/snet-dns-inbound}]"
```

:::tip Exam note

The inbound endpoint IP is what you configure on your on-premises DNS servers as the conditional forwarder target for Azure Private DNS zones. After deployment, update your on-prem DNS conditional forwarders to point to this IP instead of the legacy IaaS forwarder VMs.

:::

---

## Task 4: Configure the outbound endpoint

The outbound endpoint allows the resolver to forward queries from Azure VNets to external DNS servers (such as on-premises Active Directory DNS).

### Step 1: Create the outbound endpoint

```bash
az dns-resolver outbound-endpoint create \
    --dns-resolver-name dnspr-hub-eastus2 \
    --name oe-outbound \
    --resource-group rg-dns-resolver-lab \
    --location eastus2 \
    --id "/subscriptions/<subscription-id>/resourceGroups/rg-dns-resolver-lab/providers/Microsoft.Network/virtualNetworks/vnet-hub/subnets/snet-dns-outbound"
```

The `--id` parameter for the outbound endpoint specifies the subnet resource ID (not the VNet ID as with the resolver itself).

### Step 2: Verify the outbound endpoint

```bash
az dns-resolver outbound-endpoint show \
    --dns-resolver-name dnspr-hub-eastus2 \
    --name oe-outbound \
    --resource-group rg-dns-resolver-lab \
    --output table
```

:::warning Important

The outbound endpoint subnet must have network connectivity to the target DNS servers. If the on-premises DNS servers are reachable via ExpressRoute or site-to-site VPN, ensure the route table and network security groups on the outbound subnet permit UDP/TCP port 53 traffic to those servers.

:::

---

## Task 5: Create a DNS forwarding ruleset and rules

A forwarding ruleset contains rules that define which domain queries are forwarded to which target DNS servers. The ruleset is associated with one or more outbound endpoints.

### Step 1: Create the forwarding ruleset

```bash
az dns-resolver forwarding-ruleset create \
    --name frs-contoso-onprem \
    --resource-group rg-dns-resolver-lab \
    --location eastus2 \
    --outbound-endpoints "[{id:/subscriptions/<subscription-id>/resourceGroups/rg-dns-resolver-lab/providers/Microsoft.Network/dnsResolvers/dnspr-hub-eastus2/outboundEndpoints/oe-outbound}]"
```

The `--outbound-endpoints` parameter accepts a JSON array of outbound endpoint resource IDs. You can reference multiple outbound endpoints for redundancy.

### Step 2: Create a forwarding rule for the on-premises AD domain

```bash
az dns-resolver forwarding-rule create \
    --ruleset-name frs-contoso-onprem \
    --name rule-corp-contoso \
    --resource-group rg-dns-resolver-lab \
    --domain-name "corp.contoso.com." \
    --forwarding-rule-state "Enabled" \
    --target-dns-servers "[{ip-address:10.1.0.4,port:53},{ip-address:10.1.0.5,port:53}]"
```

### Step 3: Create a forwarding rule for reverse DNS (PTR records)

For on-premises reverse lookups (useful when Azure VMs need to resolve PTR records for on-prem IPs):

```bash
az dns-resolver forwarding-rule create \
    --ruleset-name frs-contoso-onprem \
    --name rule-reverse-10 \
    --resource-group rg-dns-resolver-lab \
    --domain-name "1.10.in-addr.arpa." \
    --forwarding-rule-state "Enabled" \
    --target-dns-servers "[{ip-address:10.1.0.4,port:53},{ip-address:10.1.0.5,port:53}]"
```

### Step 4: Verify the rules

```bash
az dns-resolver forwarding-rule list \
    --ruleset-name frs-contoso-onprem \
    --resource-group rg-dns-resolver-lab \
    --output table
```

:::tip Exam note

The domain name in a forwarding rule must end with a trailing dot (e.g., `corp.contoso.com.`). This is standard DNS notation indicating a fully qualified domain name. The rule matches all queries for the specified domain and its subdomains. Target DNS servers are specified as an array of IP address and port pairs.

:::

---

## Task 6: Link the forwarding ruleset to spoke VNets

Linking a ruleset to a VNet enables all DNS queries originating from that VNet to be evaluated against the forwarding rules. Without this link, Azure workloads in the spoke VNet will use default Azure DNS resolution and cannot reach on-premises resources by name.

### Step 1: Link the ruleset to the spoke VNet

```bash
az dns-resolver vnet-link create \
    --ruleset-name frs-contoso-onprem \
    --name vnetlink-spoke-01 \
    --resource-group rg-dns-resolver-lab \
    --id "/subscriptions/<subscription-id>/resourceGroups/rg-dns-resolver-lab/providers/Microsoft.Network/virtualNetworks/vnet-spoke-01"
```

The `--id` parameter specifies the virtual network resource ID to link.

### Step 2: Link the ruleset to the hub VNet (if Azure workloads in the hub also need on-prem resolution)

```bash
az dns-resolver vnet-link create \
    --ruleset-name frs-contoso-onprem \
    --name vnetlink-hub \
    --resource-group rg-dns-resolver-lab \
    --id "/subscriptions/<subscription-id>/resourceGroups/rg-dns-resolver-lab/providers/Microsoft.Network/virtualNetworks/vnet-hub"
```

### Step 3: Verify the links

```bash
az dns-resolver vnet-link list \
    --ruleset-name frs-contoso-onprem \
    --resource-group rg-dns-resolver-lab \
    --output table
```

:::warning Important

A virtual network can be linked to a maximum of two DNS forwarding rulesets. If more rulesets need to apply, consolidate rules into fewer rulesets. A ruleset can be linked to up to 500 virtual networks.

:::

---

## Task 7: Verify end-to-end resolution

### Azure to on-premises (outbound path)

From an Azure VM in the spoke VNet, verify that queries for on-premises domains are forwarded correctly:

```bash
# From an Azure VM in vnet-spoke-01
nslookup dc01.corp.contoso.com
```

Expected result: resolves to the on-premises domain controller IP (e.g., 10.1.0.4).

The resolution path is: Azure VM -> Azure DNS (168.63.129.16) -> forwarding ruleset matches `corp.contoso.com.` -> outbound endpoint forwards to 10.1.0.4:53 and 10.1.0.5:53.

### On-premises to Azure (inbound path)

From an on-premises server (after updating conditional forwarders to the inbound endpoint IP):

```bash
# From an on-premises server
nslookup db.contoso.internal 10.0.0.4
```

Expected result: resolves to the private endpoint IP linked to the Azure Private DNS zone.

The resolution path is: on-prem DNS server -> conditional forwarder -> inbound endpoint (10.0.0.4) -> Azure DNS resolves the Private DNS zone record.

### Verify using dig (Linux)

```bash
# Test outbound forwarding from Azure VM
dig dc01.corp.contoso.com

# Test inbound resolution from on-prem (specifying the inbound endpoint IP)
dig @10.0.0.4 db.contoso.internal
```

---

## Break & fix

### Scenario 1: Inbound endpoint subnet without proper delegation

**Symptom:** Deploying the inbound endpoint fails with an error stating the subnet is not delegated correctly.

```text
(SubnetMissingDelegation) The subnet 'snet-dns-inbound' must have a delegation 
to 'Microsoft.Network/dnsResolvers' to be used by a DNS resolver.
```

**Root cause:** The subnet was created without the `--delegations Microsoft.Network/dnsResolvers` parameter. The DNS Private Resolver service requires this delegation to inject its endpoint resources into the subnet.

**Fix:** Update the subnet to add the delegation:

```bash
az network vnet subnet update \
    --resource-group rg-dns-resolver-lab \
    --vnet-name vnet-hub \
    --name snet-dns-inbound \
    --delegations Microsoft.Network/dnsResolvers
```

### Scenario 2: Forwarding rule with wrong target DNS server IP

**Symptom:** Azure VMs in the spoke VNet cannot resolve `dc01.corp.contoso.com`. Queries time out rather than returning NXDOMAIN.

**Root cause:** The target DNS server IP in the forwarding rule is incorrect (for example, `10.1.0.100` instead of `10.1.0.4`). The outbound endpoint attempts to reach a server that either does not exist or is not running DNS.

**Fix:** Update the forwarding rule with the correct target:

```bash
az dns-resolver forwarding-rule update \
    --ruleset-name frs-contoso-onprem \
    --name rule-corp-contoso \
    --resource-group rg-dns-resolver-lab \
    --target-dns-servers "[{ip-address:10.1.0.4,port:53},{ip-address:10.1.0.5,port:53}]"
```

Also verify that NSGs on the outbound subnet allow outbound UDP/TCP 53 to the target IP range.

### Scenario 3: Ruleset not linked to spoke VNet

**Symptom:** Azure VMs in `vnet-spoke-01` can resolve public DNS and Azure Private DNS zones, but queries for `corp.contoso.com` return NXDOMAIN from the Azure recursive resolver.

**Root cause:** The forwarding ruleset exists and contains the correct rule, but was never linked to the spoke VNet. Without the VNet link, DNS queries from that VNet are not evaluated against the forwarding rules.

**Fix:** Create the missing VNet link:

```bash
az dns-resolver vnet-link create \
    --ruleset-name frs-contoso-onprem \
    --name vnetlink-spoke-01 \
    --resource-group rg-dns-resolver-lab \
    --id "/subscriptions/<subscription-id>/resourceGroups/rg-dns-resolver-lab/providers/Microsoft.Network/virtualNetworks/vnet-spoke-01"
```

After linking, queries for `corp.contoso.com` from the spoke VNet will match the forwarding rule and be sent to the on-premises DNS servers.

---

## Clean up resources

```bash
az group delete --name rg-dns-resolver-lab --yes --no-wait
```

---

## Key concepts summary

| Concept | Detail |
|---------|--------|
| DNS Private Resolver | Managed service replacing IaaS DNS forwarder VMs for hybrid DNS |
| Inbound endpoint | Provides a private IP for on-prem DNS to forward queries into Azure |
| Outbound endpoint | Enables Azure DNS to forward queries to external (on-prem) DNS servers |
| Forwarding ruleset | Collection of domain-based rules defining where queries are forwarded |
| Forwarding rule | Matches a domain suffix and specifies target DNS servers (IP + port) |
| VNet link | Associates a forwarding ruleset with a VNet to activate rule evaluation |
| Subnet delegation | Required on both endpoint subnets; `Microsoft.Network/dnsResolvers` |
| Minimum subnet size | /28 (16 addresses); dedicated, no other resources allowed |
| Maximum rulesets per VNet | 2 forwarding rulesets can be linked to a single VNet |
| Domain name format | Must end with a trailing dot (e.g., `contoso.com.`) |

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-05-q1",
    question: "What is the minimum subnet size required for an Azure DNS Private Resolver endpoint?",
    options: [
      "/30 (4 addresses)",
      "/29 (8 addresses)",
      "/28 (16 addresses)",
      "/27 (32 addresses)"
    ],
    correctIndex: 2,
    explanation: "Both inbound and outbound endpoints require a dedicated subnet with a minimum size of /28 (16 addresses). The subnet must be delegated to Microsoft.Network/dnsResolvers and cannot contain any other resources."
  },
  {
    id: "az700-05-q2",
    question: "On-premises clients need to resolve records in an Azure Private DNS zone. Which DNS Private Resolver component provides the IP address that on-prem conditional forwarders should target?",
    options: [
      "The outbound endpoint IP address",
      "The inbound endpoint IP address",
      "The Azure recursive resolver (168.63.129.16)",
      "The forwarding ruleset virtual IP"
    ],
    correctIndex: 1,
    explanation: "The inbound endpoint provides a private IP address within the hub VNet. On-premises DNS servers configure conditional forwarders pointing to this IP for Azure Private DNS zone resolution. The inbound endpoint then resolves the query using Azure DNS."
  },
  {
    id: "az700-05-q3",
    question: "Azure VMs in a spoke VNet cannot resolve on-premises Active Directory domain names. The forwarding ruleset and rule are correctly configured. What is the most likely missing step?",
    options: [
      "The inbound endpoint is not configured",
      "The spoke VNet is not linked to the forwarding ruleset",
      "The Azure Private DNS zone needs a VNet link to the spoke",
      "The on-premises DNS servers need a conditional forwarder to Azure"
    ],
    correctIndex: 1,
    explanation: "A forwarding ruleset must be linked to each VNet that needs to use its rules. Without the VNet link, DNS queries from the spoke VNet bypass the forwarding rules and are handled by default Azure DNS resolution, which cannot resolve on-premises domains."
  },
  {
    id: "az700-05-q4",
    question: "Which parameter format is correct for specifying target DNS servers in an 'az dns-resolver forwarding-rule create' command?",
    options: [
      "--target-dns-servers 10.1.0.4:53,10.1.0.5:53",
      "--target-dns-servers [{ip-address:10.1.0.4,port:53},{ip-address:10.1.0.5,port:53}]",
      "--dns-servers 10.1.0.4 10.1.0.5",
      "--forwarders [{address:10.1.0.4},{address:10.1.0.5}]"
    ],
    correctIndex: 1,
    explanation: "The --target-dns-servers parameter accepts a JSON array of objects, each with 'ip-address' and 'port' properties. The shorthand syntax uses square brackets and curly braces to define the array of server entries."
  },
  {
    id: "az700-05-q5",
    question: "What is the maximum number of DNS forwarding rulesets that can be linked to a single virtual network?",
    options: [
      "1",
      "2",
      "5",
      "10"
    ],
    correctIndex: 1,
    explanation: "A virtual network can be linked to a maximum of two DNS forwarding rulesets. If more rules are needed, they should be consolidated into fewer rulesets. A single ruleset, however, can be linked to up to 500 virtual networks."
  },
  {
    id: "az700-05-q6",
    question: "Contoso wants to replace their IaaS DNS forwarder VMs in Azure with a managed solution. After deploying the DNS Private Resolver with an inbound endpoint, what must be updated on the on-premises DNS infrastructure?",
    options: [
      "Add a new zone for Azure Private DNS on the on-prem DNS server",
      "Update conditional forwarders to point to the inbound endpoint IP instead of the old VM IPs",
      "Configure the on-prem DNS servers as secondary for the Azure Private DNS zones",
      "Create a DNS delegation from the on-prem domain to the resolver outbound endpoint"
    ],
    correctIndex: 1,
    explanation: "The inbound endpoint replaces the IaaS forwarder VMs. On-premises conditional forwarders that previously pointed to the VM IPs must be updated to the inbound endpoint IP. No zone transfers or delegations are needed; the resolver handles query resolution against Azure Private DNS zones natively."
  }
]} />

---

## Additional resources

- [What is Azure DNS Private Resolver?](https://learn.microsoft.com/azure/dns/dns-private-resolver-overview)
- [Create an Azure DNS Private Resolver using Azure CLI](https://learn.microsoft.com/azure/dns/dns-private-resolver-get-started-portal)
- [Azure DNS Private Resolver endpoints and rulesets](https://learn.microsoft.com/azure/dns/private-resolver-endpoints-rulesets)
- [az dns-resolver CLI reference](https://learn.microsoft.com/cli/azure/dns-resolver)
- [DNS Private Resolver architecture](https://learn.microsoft.com/azure/architecture/networking/architecture/azure-dns-private-resolver)
