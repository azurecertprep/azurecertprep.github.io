---
sidebar_position: 17
title: "Challenge 17: NSGs and ASGs"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 17: NSGs and ASGs

## Exam skills covered

- Plan and implement network security groups (NSGs) for traffic filtering
- Configure application security groups (ASGs) for logical grouping
- Design NSG rules for network segmentation
- Implement NSG flow logs for monitoring
- Evaluate effective security rules

## Scenario

Contoso Ltd is deploying a three-tier web application (web servers, application servers, and database servers) in Azure. The security team requires strict network segmentation where web servers only accept traffic on ports 80/443 from the internet, application servers only communicate with web servers and database servers on specific ports, and database servers only accept connections from application servers. You must implement this segmentation using NSGs and ASGs to create a maintainable, role-based network security model.

---

## Prerequisites

- Azure subscription with Network Contributor role
- Azure CLI installed and authenticated (`az login`)
- Understanding of TCP/IP networking and port numbers
- Familiarity with Azure Virtual Network concepts

---

## Task 1: Create the network infrastructure

Deploy a virtual network with three subnets for the three-tier application.

```bash
# Set variables
RG="rg-sc500-nsg-asg"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION

# Create virtual network with three subnets
az network vnet create \
  --name vnet-contoso-app \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16

# Create web tier subnet
az network vnet subnet create \
  --name snet-web \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --address-prefix 10.0.1.0/24

# Create application tier subnet
az network vnet subnet create \
  --name snet-app \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --address-prefix 10.0.2.0/24

# Create database tier subnet
az network vnet subnet create \
  --name snet-db \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --address-prefix 10.0.3.0/24
```

---

## Task 2: Create Application Security Groups

Create ASGs to logically group VMs by their role in the application.

```bash
# Create ASG for web servers
az network asg create \
  --name asg-web-servers \
  --resource-group $RG \
  --location $LOCATION

# Create ASG for application servers
az network asg create \
  --name asg-app-servers \
  --resource-group $RG \
  --location $LOCATION

# Create ASG for database servers
az network asg create \
  --name asg-db-servers \
  --resource-group $RG \
  --location $LOCATION

# Create ASG for management/jump hosts
az network asg create \
  --name asg-management \
  --resource-group $RG \
  --location $LOCATION

# List all ASGs
az network asg list --resource-group $RG -o table
```

---

## Task 3: Create NSGs with tiered security rules

Create NSGs for each subnet implementing the least-privilege access model.

```bash
# Create NSG for web tier
az network nsg create \
  --name nsg-web-tier \
  --resource-group $RG \
  --location $LOCATION

# Allow HTTP/HTTPS from internet to web servers
az network nsg rule create \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  --name "Allow-HTTP-Inbound" \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes Internet \
  --destination-asgs asg-web-servers \
  --destination-port-ranges 80 443

# Allow health probe from Azure Load Balancer
az network nsg rule create \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  --name "Allow-AzureLB-Inbound" \
  --priority 110 \
  --direction Inbound \
  --access Allow \
  --protocol "*" \
  --source-address-prefixes AzureLoadBalancer \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*"

# Allow SSH from management ASG only
az network nsg rule create \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  --name "Allow-SSH-Management" \
  --priority 200 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-management \
  --destination-asgs asg-web-servers \
  --destination-port-ranges 22

# Deny all other inbound traffic
az network nsg rule create \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  --name "Deny-All-Inbound" \
  --priority 4000 \
  --direction Inbound \
  --access Deny \
  --protocol "*" \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*"

# --- NSG for Application Tier ---
az network nsg create \
  --name nsg-app-tier \
  --resource-group $RG \
  --location $LOCATION

# Allow traffic from web servers to app servers on port 8080
az network nsg rule create \
  --nsg-name nsg-app-tier \
  --resource-group $RG \
  --name "Allow-Web-To-App" \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-web-servers \
  --destination-asgs asg-app-servers \
  --destination-port-ranges 8080 8443

# Allow SSH from management
az network nsg rule create \
  --nsg-name nsg-app-tier \
  --resource-group $RG \
  --name "Allow-SSH-Management" \
  --priority 200 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-management \
  --destination-asgs asg-app-servers \
  --destination-port-ranges 22

# Deny all other inbound
az network nsg rule create \
  --nsg-name nsg-app-tier \
  --resource-group $RG \
  --name "Deny-All-Inbound" \
  --priority 4000 \
  --direction Inbound \
  --access Deny \
  --protocol "*" \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*"

# --- NSG for Database Tier ---
az network nsg create \
  --name nsg-db-tier \
  --resource-group $RG \
  --location $LOCATION

# Allow SQL traffic from app servers only
az network nsg rule create \
  --nsg-name nsg-db-tier \
  --resource-group $RG \
  --name "Allow-App-To-DB" \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-app-servers \
  --destination-asgs asg-db-servers \
  --destination-port-ranges 1433 5432

# Allow SSH from management
az network nsg rule create \
  --nsg-name nsg-db-tier \
  --resource-group $RG \
  --name "Allow-SSH-Management" \
  --priority 200 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-management \
  --destination-asgs asg-db-servers \
  --destination-port-ranges 22

# Deny all other inbound (including from web tier directly)
az network nsg rule create \
  --nsg-name nsg-db-tier \
  --resource-group $RG \
  --name "Deny-All-Inbound" \
  --priority 4000 \
  --direction Inbound \
  --access Deny \
  --protocol "*" \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*"
```

---

## Task 4: Associate NSGs with subnets and NICs with ASGs

Associate NSGs with subnets and create test VMs assigned to ASGs.

```bash
# Associate NSGs with subnets
az network vnet subnet update \
  --name snet-web \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --network-security-group nsg-web-tier

az network vnet subnet update \
  --name snet-app \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --network-security-group nsg-app-tier

az network vnet subnet update \
  --name snet-db \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --network-security-group nsg-db-tier

# Create a web server NIC associated with the web ASG
az network nic create \
  --name nic-web-01 \
  --resource-group $RG \
  --vnet-name vnet-contoso-app \
  --subnet snet-web \
  --application-security-groups asg-web-servers

# Create an app server NIC associated with the app ASG
az network nic create \
  --name nic-app-01 \
  --resource-group $RG \
  --vnet-name vnet-contoso-app \
  --subnet snet-app \
  --application-security-groups asg-app-servers

# Create a database server NIC associated with the db ASG
az network nic create \
  --name nic-db-01 \
  --resource-group $RG \
  --vnet-name vnet-contoso-app \
  --subnet snet-db \
  --application-security-groups asg-db-servers

# Verify NIC ASG associations
az network nic show \
  --name nic-web-01 \
  --resource-group $RG \
  --query "ipConfigurations[0].applicationSecurityGroups[].id" -o tsv
```

---

## Task 5: Verify effective security rules

Validate the security configuration using effective security rules analysis.

```bash
# List rules in each NSG
echo "=== Web Tier NSG Rules ==="
az network nsg rule list \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  -o table --include-default

echo ""
echo "=== App Tier NSG Rules ==="
az network nsg rule list \
  --nsg-name nsg-app-tier \
  --resource-group $RG \
  -o table --include-default

echo ""
echo "=== DB Tier NSG Rules ==="
az network nsg rule list \
  --nsg-name nsg-db-tier \
  --resource-group $RG \
  -o table --include-default

# Show effective security rules for a specific NIC
# (Requires a VM attached to the NIC for full evaluation)
az network nic list-effective-nsg \
  --name nic-web-01 \
  --resource-group $RG 2>/dev/null || echo "Note: Effective NSG evaluation requires a running VM attached to the NIC"

# Verify subnet-NSG associations
az network vnet subnet show \
  --name snet-web \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --query "{Subnet:name, NSG:networkSecurityGroup.id}"

az network vnet subnet show \
  --name snet-app \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --query "{Subnet:name, NSG:networkSecurityGroup.id}"

az network vnet subnet show \
  --name snet-db \
  --vnet-name vnet-contoso-app \
  --resource-group $RG \
  --query "{Subnet:name, NSG:networkSecurityGroup.id}"
```

---

## Task 6: Implement outbound NSG rules for egress control

Add outbound rules to control what traffic can leave each tier.

```bash
# Web tier: Allow outbound only to app tier on 8080/8443
az network nsg rule create \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  --name "Allow-Web-To-App-Outbound" \
  --priority 100 \
  --direction Outbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-web-servers \
  --destination-asgs asg-app-servers \
  --destination-port-ranges 8080 8443

# Web tier: Allow HTTPS to internet for updates
az network nsg rule create \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  --name "Allow-HTTPS-Outbound" \
  --priority 200 \
  --direction Outbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes "10.0.1.0/24" \
  --destination-address-prefixes Internet \
  --destination-port-ranges 443

# Web tier: Deny all other outbound
az network nsg rule create \
  --nsg-name nsg-web-tier \
  --resource-group $RG \
  --name "Deny-All-Outbound" \
  --priority 4000 \
  --direction Outbound \
  --access Deny \
  --protocol "*" \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*"

# App tier: Allow outbound only to DB tier on SQL ports
az network nsg rule create \
  --nsg-name nsg-app-tier \
  --resource-group $RG \
  --name "Allow-App-To-DB-Outbound" \
  --priority 100 \
  --direction Outbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-app-servers \
  --destination-asgs asg-db-servers \
  --destination-port-ranges 1433 5432

# DB tier: Deny all internet outbound
az network nsg rule create \
  --nsg-name nsg-db-tier \
  --resource-group $RG \
  --name "Deny-Internet-Outbound" \
  --priority 100 \
  --direction Outbound \
  --access Deny \
  --protocol "*" \
  --source-address-prefixes "*" \
  --destination-address-prefixes Internet \
  --destination-port-ranges "*"
```

---

## Break & Fix

### Scenario 1: Web servers cannot connect to application servers

After deploying the NSG rules, the web tier cannot reach the application tier on port 8080. The web tier NSG has the outbound rule but traffic is still blocked.

<details>
<summary>Show solution</summary>

```bash
# Check if the app tier NSG has a matching inbound rule
az network nsg rule list \
  --nsg-name nsg-app-tier \
  --resource-group $RG \
  --query "[?direction=='Inbound' && access=='Allow']" -o table

# The issue could be that NSG rules are evaluated per-subnet.
# Both subnets must allow the traffic:
# 1. Web subnet NSG must allow OUTBOUND to app subnet
# 2. App subnet NSG must allow INBOUND from web subnet

# Verify the source/destination in both rules match
# Check if ASGs are correctly associated with NICs
az network nic show --name nic-web-01 --resource-group $RG \
  --query "ipConfigurations[0].applicationSecurityGroups[].id"

az network nic show --name nic-app-01 --resource-group $RG \
  --query "ipConfigurations[0].applicationSecurityGroups[].id"

# If ASGs are not associated, re-associate
az network nic ip-config update \
  --nic-name nic-app-01 \
  --resource-group $RG \
  --name ipconfig1 \
  --application-security-groups asg-app-servers
```

</details>

### Scenario 2: Management SSH access blocked to all tiers

The operations team cannot SSH into any servers from the jump host. The management ASG rules exist but access is denied.

<details>
<summary>Show solution</summary>

```bash
# The issue is that no NIC is associated with the asg-management ASG
# The jump host NIC must be a member of the management ASG

# Create or update the management NIC
az network nic create \
  --name nic-mgmt-01 \
  --resource-group $RG \
  --vnet-name vnet-contoso-app \
  --subnet snet-web \
  --application-security-groups asg-management

# Or update an existing jump host NIC
# az network nic ip-config update \
#   --nic-name nic-jumphost \
#   --resource-group $RG \
#   --name ipconfig1 \
#   --application-security-groups asg-management

# Also verify the management subnet has outbound rules allowing SSH (port 22)
# to the other subnets
```

</details>

### Scenario 3: Default rules are overriding custom deny rules

Despite having a "Deny-All-Inbound" rule at priority 4000, some unexpected traffic is still reaching the VMs.

<details>
<summary>Show solution</summary>

```bash
# Azure NSG has default rules that cannot be deleted:
# - AllowVNetInBound (priority 65000)
# - AllowAzureLoadBalancerInBound (priority 65001)
# - DenyAllInBound (priority 65500)

# Custom rules with priority 4000 are evaluated BEFORE defaults (lower = higher priority)
# However, default AllowVNetInBound at 65000 won't apply because
# custom Deny-All at 4000 takes precedence.

# The issue is likely VNet-to-VNet traffic matching the AllowVNetInBound default
# but your custom deny rule at 4000 should block this.

# Check if there are rules between 4000 and your allow rules that inadvertently allow traffic
az network nsg rule list \
  --nsg-name nsg-db-tier \
  --resource-group $RG \
  --query "sort_by([?direction=='Inbound'], &priority)[].{Priority:priority, Name:name, Access:access, Source:sourceAddressPrefix, Dest:destinationPortRange}" \
  -o table

# If the deny rule has specific source/destination that doesn't match all traffic,
# update it to use wildcards
az network nsg rule update \
  --nsg-name nsg-db-tier \
  --resource-group $RG \
  --name "Deny-All-Inbound" \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*" \
  --protocol "*"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the primary advantage of using Application Security Groups (ASGs) over IP-based NSG rules?",
    options: [
      "ASGs provide better performance than IP-based rules",
      "ASGs allow role-based grouping that automatically applies to new VMs assigned to the group without rule changes",
      "ASGs support more protocols than IP-based rules",
      "ASGs can filter traffic between different Azure regions"
    ],
    correctIndex: 1,
    explanation: "ASGs allow you to group VMs by application role. When a new VM is added to an ASG, existing NSG rules automatically apply without modification. This simplifies management compared to updating IP addresses in rules when infrastructure changes."
  },
  {
    question: "In which order are NSG rules evaluated?",
    options: [
      "Default rules first, then custom rules",
      "Alphabetically by rule name",
      "By priority number, lowest (most specific) first; first matching rule is applied",
      "Outbound rules first, then inbound rules"
    ],
    correctIndex: 2,
    explanation: "NSG rules are evaluated in priority order from lowest number (highest priority) to highest number (lowest priority). The first rule that matches the traffic is applied, and no further rules are evaluated for that traffic flow."
  },
  {
    question: "When an NSG is associated with both a subnet and a NIC, how is traffic evaluated?",
    options: [
      "Only the subnet NSG is evaluated",
      "Only the NIC NSG is evaluated",
      "Inbound: subnet NSG first, then NIC NSG; Outbound: NIC NSG first, then subnet NSG",
      "Both NSGs are merged and evaluated as a single rule set"
    ],
    correctIndex: 2,
    explanation: "For inbound traffic, the subnet NSG is evaluated first; if allowed, the NIC NSG is evaluated next. For outbound traffic, the NIC NSG is evaluated first; if allowed, the subnet NSG is evaluated next. Traffic must be allowed by both NSGs to flow."
  },
  {
    question: "Which default NSG rule allows communication between all resources within the same virtual network?",
    options: [
      "AllowInternetOutBound",
      "AllowVNetInBound",
      "AllowAzureLoadBalancerInBound",
      "AllowAllInBound"
    ],
    correctIndex: 1,
    explanation: "The AllowVNetInBound default rule (priority 65000) allows all inbound traffic where both source and destination are in the VirtualNetwork service tag, enabling free communication between resources in the same VNet and peered VNets by default."
  }
]} />

## Cleanup

```bash
# Delete the resource group and all resources
az group delete --name $RG --yes --no-wait
```
