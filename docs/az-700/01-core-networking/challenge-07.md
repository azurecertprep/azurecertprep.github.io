---
sidebar_position: 7
title: "Challenge 07: Azure Virtual Network Manager"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 07: Azure Virtual Network Manager

:::info Estimated time and cost

**90-120 minutes** | **~$0 (AVNM is free; peerings created incur standard VNet peering costs)** | **Exam weight: 10-15%**

:::

## Scenario

Contoso's network team manages over 50 VNets across multiple subscriptions and regions. Manually creating peerings, route tables, and security rules for every new VNet is unsustainable. They decide to implement Azure Virtual Network Manager (AVNM) to centrally manage connectivity (hub-spoke and mesh topologies) and enforce security admin rules across all VNets from a single control plane.

## Learning objectives

After completing this challenge you will be able to:

- Create an Azure Virtual Network Manager instance with defined scope and access
- Organize VNets into network groups using static and dynamic membership
- Build connectivity configurations for hub-spoke and mesh topologies
- Author security admin rules that are enforced before NSGs
- Deploy (commit) configurations to target regions
- Verify effective connectivity and security admin rules on VNets

## Prerequisites

- An Azure subscription with Contributor access (Owner recommended for policy assignments)
- Azure CLI installed and authenticated (`az login`)
- The `virtual-network-manager` CLI extension (`az extension add -n virtual-network-manager`)
- A resource group for this lab (or permission to create one)

---

## Task 1: Create a Virtual Network Manager instance

Create the AVNM instance with appropriate scope and access types. The scope defines which subscriptions or management groups AVNM can manage, and the access types determine what configurations you can create.

### Step 1: Create the resource group

```bash
az group create \
    --name rg-avnm-lab \
    --location eastus2
```

### Step 2: Create the Virtual Network Manager instance

```bash
az network manager create \
    --name avnm-contoso \
    --resource-group rg-avnm-lab \
    --location eastus2 \
    --scope-accesses "Connectivity" "SecurityAdmin" \
    --network-manager-scopes subscriptions="/subscriptions/<subscriptionID>"
```

Replace `<subscriptionID>` with your subscription ID.

Key parameters:

| Parameter | Purpose |
|-----------|---------|
| `--scope-accesses` | Defines configuration types: `Connectivity`, `SecurityAdmin`, or both |
| `--network-manager-scopes` | Sets the management boundary (subscription or management group) |

:::tip Exam note

The scope determines which VNets AVNM can manage. You can scope to a management group to cover multiple subscriptions. A single AVNM instance can have both Connectivity and SecurityAdmin access enabled simultaneously.

:::

### Step 3: Verify the instance was created

```bash
az network manager show \
    --name avnm-contoso \
    --resource-group rg-avnm-lab \
    --output table
```

---

## Task 2: Create VNets and define network groups

Network groups are logical containers for VNets. Members can be added statically (manual) or dynamically (using Azure Policy conditions).

### Step 1: Create the hub VNet

```bash
az network vnet create \
    --name vnet-hub \
    --resource-group rg-avnm-lab \
    --location eastus2 \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name default \
    --subnet-prefixes 10.0.0.0/24 \
    --tags Environment=Hub
```

### Step 2: Create spoke VNets

```bash
az network vnet create \
    --name vnet-spoke-01 \
    --resource-group rg-avnm-lab \
    --location eastus2 \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name default \
    --subnet-prefixes 10.1.0.0/24 \
    --tags Environment=Prod Department=Engineering

az network vnet create \
    --name vnet-spoke-02 \
    --resource-group rg-avnm-lab \
    --location eastus2 \
    --address-prefixes 10.2.0.0/16 \
    --subnet-name default \
    --subnet-prefixes 10.2.0.0/24 \
    --tags Environment=Prod Department=Finance

az network vnet create \
    --name vnet-spoke-03 \
    --resource-group rg-avnm-lab \
    --location eastus2 \
    --address-prefixes 10.3.0.0/16 \
    --subnet-name default \
    --subnet-prefixes 10.3.0.0/24 \
    --tags Environment=Dev Department=Engineering
```

### Step 3: Create a network group for spoke VNets

```bash
az network manager group create \
    --name ng-spokes-prod \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --description "Production spoke virtual networks"
```

### Step 4: Add static members to the network group

```bash
az network manager group static-member create \
    --name vnet-spoke-01 \
    --network-group ng-spokes-prod \
    --network-manager avnm-contoso \
    --resource-group rg-avnm-lab \
    --resource-id "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/virtualNetworks/vnet-spoke-01"

az network manager group static-member create \
    --name vnet-spoke-02 \
    --network-group ng-spokes-prod \
    --network-manager avnm-contoso \
    --resource-group rg-avnm-lab \
    --resource-id "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/virtualNetworks/vnet-spoke-02"
![Challenge 07 - Network Topology](/img/az-700/challenge-07-topology.svg)


Assign the policy to the subscription scope:

```bash
az policy assignment create \
    --name "avnm-prod-vnets-assignment" \
    --policy "avnm-prod-vnets" \
    --scope "/subscriptions/<subscriptionID>"
```

:::tip Exam note

Dynamic membership uses the `Microsoft.Network.Data` policy mode and the `addToNetworkGroup` effect. Policies must be defined at or above the scope where they apply. Static and dynamic membership can coexist in the same network group.

:::

---

## Task 3: Create a hub-spoke connectivity configuration

A connectivity configuration defines how VNets in a network group connect. For hub-spoke, AVNM automatically creates peerings between the hub and each spoke.

### Step 1: Create the hub-spoke connectivity configuration

```bash
az network manager connect-config create \
    --configuration-name "cc-hub-spoke-prod" \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --connectivity-topology "HubAndSpoke" \
    --hub '[{"resourceId": "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/virtualNetworks/vnet-hub", "resourceType": "Microsoft.Network/virtualNetworks"}]' \
    --applies-to-groups '[{"networkGroupId": "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/networkManagers/avnm-contoso/networkGroups/ng-spokes-prod", "groupConnectivity": "DirectlyConnected", "useHubGateway": "False", "isGlobal": "False"}]' \
    --delete-existing-peering True \
    --description "Hub-spoke topology for production spokes with direct spoke connectivity"
```

Key parameters explained:

| Parameter | Purpose |
|-----------|---------|
| `--connectivity-topology` | `HubAndSpoke` or `Mesh` |
| `--hub` | Specifies the hub VNet (JSON format) |
| `--applies-to-groups` | Network groups that act as spokes |
| `groupConnectivity: DirectlyConnected` | Enables spoke-to-spoke communication |
| `--delete-existing-peering` | Removes manually created peerings that conflict |

### Step 2: Verify the configuration

```bash
az network manager connect-config show \
    --configuration-name "cc-hub-spoke-prod" \
    --name avnm-contoso \
    --resource-group rg-avnm-lab
```

:::tip Exam note

Setting `groupConnectivity` to `DirectlyConnected` allows spoke VNets to communicate directly without routing through the hub. Without this, spokes can only reach the hub. The `useHubGateway` option allows spokes to use a VPN/ExpressRoute gateway deployed in the hub VNet.

:::

---

## Task 4: Create a security admin configuration

Security admin rules are evaluated before NSGs and cannot be overridden by network administrators at the VNet level. This makes them ideal for organization-wide security baselines.

### Step 1: Create the security admin configuration

```bash
az network manager security-admin-config create \
    --configuration-name "sac-baseline" \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --description "Baseline security rules for all production VNets"
```

### Step 2: Create a rule collection

A rule collection groups related rules and targets specific network groups:

```bash
az network manager security-admin-config rule-collection create \
    --configuration-name "sac-baseline" \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --rule-collection-name "rc-deny-dangerous-inbound" \
    --applies-to-groups '[{"networkGroupId": "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/networkManagers/avnm-contoso/networkGroups/ng-spokes-prod"}]' \
    --description "Block dangerous inbound protocols from the internet"
```

### Step 3: Create a rule to deny inbound SSH from the internet

```bash
az network manager security-admin-config rule-collection rule create \
    --configuration-name "sac-baseline" \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --rule-collection-name "rc-deny-dangerous-inbound" \
    --rule-name "deny-ssh-from-internet" \
    --kind "Custom" \
    --protocol "Tcp" \
    --access "Deny" \
    --priority 100 \
    --direction "Inbound" \
    --sources address-prefix="*" address-prefix-type="IPPrefix" \
    --destinations address-prefix="*" address-prefix-type="IPPrefix" \
    --dest-port-ranges 22 \
    --description "Block SSH from all external sources"
```

### Step 4: Create a rule to deny inbound RDP from the internet

```bash
az network manager security-admin-config rule-collection rule create \
    --configuration-name "sac-baseline" \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --rule-collection-name "rc-deny-dangerous-inbound" \
    --rule-name "deny-rdp-from-internet" \
    --kind "Custom" \
    --protocol "Tcp" \
    --access "Deny" \
    --priority 110 \
    --direction "Inbound" \
    --sources address-prefix="*" address-prefix-type="IPPrefix" \
    --destinations address-prefix="*" address-prefix-type="IPPrefix" \
    --dest-port-ranges 3389 \
    --description "Block RDP from all external sources"
```

### Step 5: Create an Always Allow rule for internal monitoring

```bash
az network manager security-admin-config rule-collection rule create \
    --configuration-name "sac-baseline" \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --rule-collection-name "rc-deny-dangerous-inbound" \
    --rule-name "always-allow-monitoring" \
    --kind "Custom" \
    --protocol "Tcp" \
    --access "AlwaysAllow" \
    --priority 50 \
    --direction "Inbound" \
    --sources address-prefix="10.0.0.0/8" address-prefix-type="IPPrefix" \
    --destinations address-prefix="*" address-prefix-type="IPPrefix" \
    --dest-port-ranges 443 \
    --description "Ensure monitoring from internal network is never blocked"
```

:::tip Exam note

Security admin rule actions and their evaluation order:
1. **Always Allow** -- Traffic is permitted regardless of lower-priority admin rules or NSGs
2. **Allow** -- Traffic is allowed at the admin level but can still be blocked by NSGs
3. **Deny** -- Traffic is blocked regardless of what NSGs allow

Admin rules are evaluated before NSGs. A Deny admin rule overrides any NSG Allow rule. This is how organizations enforce non-negotiable security policies.

:::

---

## Task 5: Deploy (commit) configurations to target regions

Configurations have no effect until they are deployed. Deployment commits the configuration to specific Azure regions.

### Step 1: Commit the connectivity configuration

```bash
az network manager post-commit \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --commit-type "Connectivity" \
    --configuration-ids "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/networkManagers/avnm-contoso/connectivityConfigurations/cc-hub-spoke-prod" \
    --target-locations "eastus2"
```

### Step 2: Commit the security admin configuration

```bash
az network manager post-commit \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --commit-type "SecurityAdmin" \
    --configuration-ids "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/networkManagers/avnm-contoso/securityAdminConfigurations/sac-baseline" \
    --target-locations "eastus2"
```

Key parameters:

| Parameter | Purpose |
|-----------|---------|
| `--commit-type` | Either `Connectivity` or `SecurityAdmin` |
| `--configuration-ids` | Full resource ID of the configuration to deploy |
| `--target-locations` | Azure regions where the configuration takes effect |

:::caution Important

The command is `az network manager post-commit`, not `az network manager commit`. Deployment can take several minutes to propagate. You can deploy multiple configurations of the same type in one commit by providing multiple configuration IDs.

:::

---

## Task 6: Verify effective connectivity and security rules

After deployment, verify that the configurations have been applied to the target VNets.

### Step 1: Check effective connectivity configuration on a spoke VNet

```bash
az network manager list-effective-connectivity-config \
    --resource-group rg-avnm-lab \
    --virtual-network-name vnet-spoke-01
```

This should return the hub-spoke topology configuration showing the hub VNet and group connectivity settings.

### Step 2: Check effective security admin rules on a spoke VNet

```bash
az network manager list-effective-security-admin-rules \
    --resource-group rg-avnm-lab \
    --virtual-network-name vnet-spoke-01
```

This shows all security admin rules applied to the VNet, including the deny-SSH and deny-RDP rules.

### Step 3: Verify peerings were created automatically

```bash
az network vnet peering list \
    --resource-group rg-avnm-lab \
    --vnet-name vnet-spoke-01 \
    --output table
```

You should see an AVNM-managed peering to `vnet-hub`. These peerings are marked as managed and cannot be manually deleted while the configuration is deployed.

### Step 4: Verify peerings on the hub side

```bash
az network vnet peering list \
    --resource-group rg-avnm-lab \
    --vnet-name vnet-hub \
    --output table
```

The hub should have peerings to all spoke VNets in the network group.

:::tip Exam note

AVNM-managed peerings display a `managedBy` property. You cannot delete or modify them directly; you must remove the VNet from the network group or delete the connectivity configuration. If you need to remove a deployment, commit with an empty configuration ID list for that region.

:::

---

## Break & fix

### Scenario 1: Configuration created but not deployed

**Symptom:** You created a connectivity configuration and added VNets to the network group, but no peerings appear and VNets cannot communicate.

**Root cause:** Configurations must be explicitly deployed (committed) to target regions. Creating a configuration only defines the desired state; it does not apply it.

**Fix:** Deploy the configuration using `az network manager post-commit`:

```bash
az network manager post-commit \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --commit-type "Connectivity" \
    --configuration-ids "/subscriptions/<subscriptionID>/resourceGroups/rg-avnm-lab/providers/Microsoft.Network/networkManagers/avnm-contoso/connectivityConfigurations/cc-hub-spoke-prod" \
    --target-locations "eastus2"
```

### Scenario 2: Security admin rule blocking legitimate traffic

**Symptom:** An NSG rule explicitly allows HTTPS inbound, but traffic is still being blocked. The application was working before AVNM was deployed.

**Root cause:** A security admin Deny rule for the same port takes precedence over NSG Allow rules. Admin rules are evaluated before NSGs.

**Diagnosis:**

```bash
az network manager list-effective-security-admin-rules \
    --resource-group rg-avnm-lab \
    --virtual-network-name vnet-spoke-01
```

**Fix:** Either change the admin rule action from `Deny` to `Allow` (letting NSGs make the final decision), or use `AlwaysAllow` if the traffic must never be blocked:

```bash
az network manager security-admin-config rule-collection rule update \
    --configuration-name "sac-baseline" \
    --network-manager-name avnm-contoso \
    --resource-group rg-avnm-lab \
    --rule-collection-name "rc-deny-dangerous-inbound" \
    --rule-name "deny-ssh-from-internet" \
    --access "Allow"
```

Then redeploy the security admin configuration.

### Scenario 3: Dynamic membership condition too broad

**Symptom:** Dev/test VNets are receiving production security rules and connectivity configurations that should only apply to production VNets.

**Root cause:** The Azure Policy condition for dynamic membership is too broad. For example, matching on VNet name prefix `vnet-` includes both prod and dev VNets.

**Diagnosis:** Check which VNets are in the network group:

```bash
az network manager group static-member list \
    --network-group ng-spokes-prod \
    --network-manager avnm-contoso \
    --resource-group rg-avnm-lab
```

**Fix:** Tighten the policy condition to use a more specific tag value or combine multiple conditions:

```json
{
  "if": {
    "allOf": [
      { "field": "type", "equals": "Microsoft.Network/virtualNetworks" },
      { "field": "tags['Environment']", "equals": "Prod" },
      { "field": "tags['ManagedByAVNM']", "equals": "true" }
    ]
  },
  "then": {
    "effect": "addToNetworkGroup",
    "details": {
      "networkGroupId": "<networkGroupResourceId>"
    }
  }
}
```

---

## Clean up resources

Remove the resource group and all resources within it:

```bash
az group delete \
    --name rg-avnm-lab \
    --yes \
    --no-wait
```

If you created policy definitions and assignments, remove them as well:

```bash
az policy assignment delete --name "avnm-prod-vnets-assignment"
az policy definition delete --name "avnm-prod-vnets"
```

---

## Key concepts summary

| Concept | Description |
|---------|-------------|
| Network Manager scope | Subscription or management group boundary for management |
| Network group | Logical collection of VNets (static or dynamic membership) |
| Connectivity configuration | Defines topology (Hub-spoke or Mesh) |
| Security admin configuration | Rules enforced before NSGs across the organization |
| Deployment (commit) | Applies configurations to target regions |
| Always Allow | Cannot be overridden by any other admin rule or NSG |
| Allow (admin rule) | Permits at admin level; NSGs can still block |
| Deny (admin rule) | Blocks traffic regardless of NSG rules |

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    id: "az700-07-q1",
    question: "You create a security admin rule with action 'Deny' for port 22 inbound. A VNet in the network group has an NSG rule that allows port 22 inbound. What happens to SSH traffic?",
    options: [
      "SSH traffic is blocked because security admin rules are evaluated before NSGs",
      "SSH traffic is allowed because NSG rules take precedence over admin rules",
      "The rules conflict and traffic is allowed by default",
      "The deployment fails due to conflicting rules"
    ],
    correctIndex: 0,
    explanation: "Security admin rules are evaluated before NSGs. A Deny action at the admin level blocks traffic regardless of what NSG rules permit. This is how organizations enforce non-negotiable security baselines."
  },
  {
    id: "az700-07-q2",
    question: "You created a connectivity configuration for hub-spoke topology and added VNets to the network group, but no peerings appear on the VNets. What is the most likely cause?",
    options: [
      "The VNets have overlapping address spaces",
      "The configuration was not deployed (committed) to the target region",
      "The network group has exceeded the maximum member count",
      "Hub-spoke topology requires a VPN gateway in the hub"
    ],
    correctIndex: 1,
    explanation: "Configurations must be explicitly deployed using 'az network manager post-commit' with the target region specified. Creating a configuration only defines the desired state; it does not apply it until committed."
  },
  {
    id: "az700-07-q3",
    question: "Which Azure Policy mode must be used when creating a policy for dynamic AVNM network group membership?",
    options: [
      "All",
      "Indexed",
      "Microsoft.Network.Data",
      "Microsoft.Network.VirtualNetworks"
    ],
    correctIndex: 2,
    explanation: "Dynamic membership policies for Azure Virtual Network Manager must use the 'Microsoft.Network.Data' mode. This mode enables the special 'addToNetworkGroup' effect that assigns matching VNets to a network group."
  },
  {
    id: "az700-07-q4",
    question: "In a hub-spoke connectivity configuration, what does setting 'groupConnectivity' to 'DirectlyConnected' achieve?",
    options: [
      "It connects the hub to an ExpressRoute circuit",
      "It enables spoke VNets to communicate with each other without routing through the hub",
      "It creates a full mesh between all network groups",
      "It allows the hub to route traffic to on-premises networks"
    ],
    correctIndex: 1,
    explanation: "Setting groupConnectivity to DirectlyConnected enables direct spoke-to-spoke communication. Without this setting, spokes can only reach the hub VNet and must route through it (via NVA or Azure Firewall) to reach other spokes."
  },
  {
    id: "az700-07-q5",
    question: "What is the correct CLI command to deploy an AVNM configuration to a target region?",
    options: [
      "az network manager commit",
      "az network manager deploy",
      "az network manager post-commit",
      "az network manager configuration apply"
    ],
    correctIndex: 2,
    explanation: "The correct command is 'az network manager post-commit'. It requires --commit-type (Connectivity or SecurityAdmin), --configuration-ids (full resource IDs), and --target-locations (Azure regions where the configuration should take effect)."
  },
  {
    id: "az700-07-q6",
    question: "A security admin rule has the action set to 'AlwaysAllow' for HTTPS inbound from 10.0.0.0/8. Another admin rule with higher priority number denies all inbound traffic on port 443. What happens to HTTPS traffic from 10.0.0.0/8?",
    options: [
      "Traffic is denied because the deny rule has a higher priority number",
      "Traffic is allowed because AlwaysAllow cannot be overridden by other admin rules",
      "Traffic is denied because deny takes precedence over allow",
      "Traffic is allowed only if an NSG also permits it"
    ],
    correctIndex: 1,
    explanation: "AlwaysAllow is the strongest action in security admin rules. It permits traffic regardless of any other admin rules or NSG rules. It is intended for critical traffic (such as monitoring) that must never be blocked by any network policy."
  }
]} />
