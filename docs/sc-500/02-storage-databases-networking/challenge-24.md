---
sidebar_position: 24
title: "Challenge 24: Network Watcher Diagnostics"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 24: Network Watcher Diagnostics

## Exam skills covered

- Use Network Watcher to diagnose network security issues
- Analyze effective security rules for VMs and NICs
- Configure and analyze NSG flow logs
- Use IP flow verify to test connectivity
- Implement connection troubleshoot for end-to-end diagnosis
- Configure traffic analytics for network visibility

## Scenario

Contoso Ltd's operations team is receiving reports of intermittent connectivity issues between their application tiers. Web servers occasionally cannot reach application servers, and some outbound connections to external APIs are being blocked. The security team suspects NSG misconfigurations but needs diagnostic evidence before making changes. You must use Azure Network Watcher to systematically diagnose connectivity issues, capture flow logs for forensic analysis, and implement traffic analytics for ongoing visibility into network traffic patterns.

---

## Prerequisites

- Azure subscription with Network Contributor role
- Azure CLI installed and authenticated (`az login`)
- Network Watcher enabled in the target region
- Virtual machines deployed (or willingness to create test VMs)
- A Storage account for flow log storage

---

## Task 1: Verify Network Watcher and create test infrastructure

Ensure Network Watcher is enabled and deploy test VMs for diagnostics.

```bash
# Set variables
RG="rg-sc500-network-watcher"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION

# Verify Network Watcher is enabled in the region
az network watcher configure \
  --resource-group NetworkWatcherRG \
  --locations $LOCATION \
  --enabled true

# Verify Network Watcher exists
az network watcher list \
  --query "[?location=='$LOCATION'].{Name:name, Location:location, State:provisioningState}" -o table

# Create test infrastructure - VNet with NSGs
az network vnet create \
  --name vnet-diagnostics \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16 \
  --subnet-name snet-web --subnet-prefix 10.0.1.0/24

az network vnet subnet create \
  --name snet-app \
  --vnet-name vnet-diagnostics \
  --resource-group $RG \
  --address-prefix 10.0.2.0/24

# Create NSGs
az network nsg create --name nsg-web --resource-group $RG --location $LOCATION
az network nsg create --name nsg-app --resource-group $RG --location $LOCATION

# Add rules to web NSG
az network nsg rule create \
  --nsg-name nsg-web --resource-group $RG \
  --name Allow-HTTP --priority 100 --direction Inbound \
  --access Allow --protocol Tcp \
  --source-address-prefixes Internet --destination-port-ranges 80 443

az network nsg rule create \
  --nsg-name nsg-web --resource-group $RG \
  --name Deny-All-Inbound --priority 4000 --direction Inbound \
  --access Deny --protocol "*" \
  --source-address-prefixes "*" --destination-address-prefixes "*" \
  --destination-port-ranges "*"

# Add rules to app NSG (intentionally restrictive for diagnostics)
az network nsg rule create \
  --nsg-name nsg-app --resource-group $RG \
  --name Allow-From-Web --priority 100 --direction Inbound \
  --access Allow --protocol Tcp \
  --source-address-prefixes "10.0.1.0/24" --destination-port-ranges 8080

# Associate NSGs with subnets
az network vnet subnet update \
  --name snet-web --vnet-name vnet-diagnostics \
  --resource-group $RG --network-security-group nsg-web

az network vnet subnet update \
  --name snet-app --vnet-name vnet-diagnostics \
  --resource-group $RG --network-security-group nsg-app

# Create test VMs
az vm create \
  --name vm-web-01 \
  --resource-group $RG \
  --location $LOCATION \
  --image Ubuntu2204 \
  --size Standard_B1ms \
  --vnet-name vnet-diagnostics \
  --subnet snet-web \
  --nsg "" \
  --admin-username azureuser \
  --generate-ssh-keys \
  --no-wait

az vm create \
  --name vm-app-01 \
  --resource-group $RG \
  --location $LOCATION \
  --image Ubuntu2204 \
  --size Standard_B1ms \
  --vnet-name vnet-diagnostics \
  --subnet snet-app \
  --nsg "" \
  --admin-username azureuser \
  --generate-ssh-keys \
  --no-wait

# Wait for VMs to be ready
az vm wait --name vm-web-01 --resource-group $RG --created
az vm wait --name vm-app-01 --resource-group $RG --created
```

---

## Task 2: Check effective security rules

Analyze the effective security rules applied to VM network interfaces.

```bash
# Get NIC IDs for the VMs
WEB_NIC_ID=$(az vm show --name vm-web-01 --resource-group $RG \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)
WEB_NIC_NAME=$(echo $WEB_NIC_ID | awk -F'/' '{print $NF}')

APP_NIC_ID=$(az vm show --name vm-app-01 --resource-group $RG \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)
APP_NIC_NAME=$(echo $APP_NIC_ID | awk -F'/' '{print $NF}')

# Get effective security rules for web VM
echo "=== Effective Security Rules: vm-web-01 ==="
az network nic list-effective-nsg \
  --name $WEB_NIC_NAME \
  --resource-group $RG \
  --query "value[0].effectiveSecurityRules[].{Direction:direction, Priority:priority, Access:access, Protocol:protocol, SourcePrefix:sourceAddressPrefix, DestPort:destinationPortRange, Name:name}" \
  -o table

echo ""
echo "=== Effective Security Rules: vm-app-01 ==="
az network nic list-effective-nsg \
  --name $APP_NIC_NAME \
  --resource-group $RG \
  --query "value[0].effectiveSecurityRules[].{Direction:direction, Priority:priority, Access:access, Protocol:protocol, SourcePrefix:sourceAddressPrefix, DestPort:destinationPortRange, Name:name}" \
  -o table
```

---

## Task 3: Use IP Flow Verify to test connectivity

Test specific traffic flows to identify which NSG rules allow or deny traffic.

```bash
# Get VM resource IDs
WEB_VM_ID=$(az vm show --name vm-web-01 --resource-group $RG --query id -o tsv)
APP_VM_ID=$(az vm show --name vm-app-01 --resource-group $RG --query id -o tsv)

# Get private IPs
WEB_IP=$(az vm show --name vm-web-01 --resource-group $RG --show-details --query privateIps -o tsv)
APP_IP=$(az vm show --name vm-app-01 --resource-group $RG --show-details --query privateIps -o tsv)

echo "Web VM IP: $WEB_IP"
echo "App VM IP: $APP_IP"

# Test 1: Can web VM reach app VM on port 8080? (should be allowed)
echo ""
echo "=== Test 1: Web → App on port 8080 ==="
az network watcher test-ip-flow \
  --vm $WEB_VM_ID \
  --direction Outbound \
  --protocol TCP \
  --local "${WEB_IP}:*" \
  --remote "${APP_IP}:8080"

# Test 2: Can web VM reach app VM on port 3389? (should be denied)
echo ""
echo "=== Test 2: Web → App on port 3389 ==="
az network watcher test-ip-flow \
  --vm $WEB_VM_ID \
  --direction Outbound \
  --protocol TCP \
  --local "${WEB_IP}:*" \
  --remote "${APP_IP}:3389"

# Test 3: Can app VM reach internet on port 443? (should be allowed by default)
echo ""
echo "=== Test 3: App → Internet on port 443 ==="
az network watcher test-ip-flow \
  --vm $APP_VM_ID \
  --direction Outbound \
  --protocol TCP \
  --local "${APP_IP}:*" \
  --remote "8.8.8.8:443"

# Test 4: Can internet reach web VM on port 80? (should be allowed)
echo ""
echo "=== Test 4: Internet → Web on port 80 ==="
az network watcher test-ip-flow \
  --vm $WEB_VM_ID \
  --direction Inbound \
  --protocol TCP \
  --local "${WEB_IP}:80" \
  --remote "203.0.113.1:*"

# Test 5: Can internet reach web VM on port 22? (should be denied)
echo ""
echo "=== Test 5: Internet → Web on port 22 ==="
az network watcher test-ip-flow \
  --vm $WEB_VM_ID \
  --direction Inbound \
  --protocol TCP \
  --local "${WEB_IP}:22" \
  --remote "203.0.113.1:*"
```

---

## Task 4: Configure NSG Flow Logs

Enable NSG flow logs for traffic recording and forensic analysis.

```bash
# Create storage account for flow logs
FLOW_STORAGE="stflowlogs$(openssl rand -hex 4)"
az storage account create \
  --name $FLOW_STORAGE \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Create Log Analytics workspace for Traffic Analytics
WORKSPACE_NAME="law-sc500-netwatch"
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --location $LOCATION

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME --resource-group $RG --query id -o tsv)

WORKSPACE_GUID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME --resource-group $RG --query customerId -o tsv)

WORKSPACE_LOCATION=$LOCATION

# Enable NSG Flow Logs v2 on web NSG
NSG_WEB_ID=$(az network nsg show --name nsg-web --resource-group $RG --query id -o tsv)

az network watcher flow-log create \
  --name "fl-nsg-web" \
  --nsg $NSG_WEB_ID \
  --resource-group NetworkWatcherRG \
  --location $LOCATION \
  --storage-account $FLOW_STORAGE \
  --enabled true \
  --format JSON \
  --log-version 2 \
  --retention 90 \
  --traffic-analytics true \
  --workspace $WORKSPACE_ID

# Enable NSG Flow Logs on app NSG
NSG_APP_ID=$(az network nsg show --name nsg-app --resource-group $RG --query id -o tsv)

az network watcher flow-log create \
  --name "fl-nsg-app" \
  --nsg $NSG_APP_ID \
  --resource-group NetworkWatcherRG \
  --location $LOCATION \
  --storage-account $FLOW_STORAGE \
  --enabled true \
  --format JSON \
  --log-version 2 \
  --retention 90 \
  --traffic-analytics true \
  --workspace $WORKSPACE_ID

# Verify flow log configuration
az network watcher flow-log list \
  --location $LOCATION \
  --query "[].{Name:name, Enabled:enabled, RetentionDays:retentionPolicy.days, TrafficAnalytics:flowAnalyticsConfiguration.networkWatcherFlowAnalyticsConfiguration.enabled}" -o table
```

---

## Task 5: Use Connection Troubleshoot for end-to-end diagnosis

Perform connection troubleshoot to diagnose connectivity between VMs.

```bash
# Install Network Watcher extension on VMs (required for connection troubleshoot)
az vm extension set \
  --vm-name vm-web-01 \
  --resource-group $RG \
  --name NetworkWatcherAgentLinux \
  --publisher Microsoft.Azure.NetworkWatcher

az vm extension set \
  --vm-name vm-app-01 \
  --resource-group $RG \
  --name NetworkWatcherAgentLinux \
  --publisher Microsoft.Azure.NetworkWatcher

# Connection troubleshoot: Web to App on port 8080
echo "=== Connection Troubleshoot: Web → App:8080 ==="
az network watcher test-connectivity \
  --source-resource $WEB_VM_ID \
  --dest-resource $APP_VM_ID \
  --dest-port 8080 \
  --protocol TCP

# Connection troubleshoot: Web to App on port 22 (likely blocked)
echo ""
echo "=== Connection Troubleshoot: Web → App:22 ==="
az network watcher test-connectivity \
  --source-resource $WEB_VM_ID \
  --dest-resource $APP_VM_ID \
  --dest-port 22 \
  --protocol TCP

# Connection troubleshoot: App to external service
echo ""
echo "=== Connection Troubleshoot: App → External API ==="
az network watcher test-connectivity \
  --source-resource $APP_VM_ID \
  --dest-address "api.contoso.com" \
  --dest-port 443 \
  --protocol TCP

# Next hop analysis - where does traffic to the internet go?
echo ""
echo "=== Next Hop: App VM → Internet ==="
az network watcher show-next-hop \
  --vm $APP_VM_ID \
  --source-ip $APP_IP \
  --dest-ip "8.8.8.8" \
  --resource-group $RG

# Next hop analysis - where does traffic to peer VNet go?
echo ""
echo "=== Next Hop: Web VM → App VM ==="
az network watcher show-next-hop \
  --vm $WEB_VM_ID \
  --source-ip $WEB_IP \
  --dest-ip $APP_IP \
  --resource-group $RG
```

---

## Task 6: Analyze flow logs and Traffic Analytics

Query Traffic Analytics data to understand network traffic patterns.

```bash
# Wait for flow logs to accumulate (at least 10 minutes)
echo "Flow logs take 10-60 minutes to appear in Traffic Analytics"
echo "Sample KQL queries for Log Analytics:"

# KQL query to find blocked traffic
cat << 'EOF'
=== KQL: Blocked Traffic (run in Log Analytics) ===

AzureNetworkAnalytics_CL
| where FlowStatus_s == "D"  // Denied
| summarize BlockedFlows=count() by
    SrcIP_s,
    DestIP_s,
    DestPort_d,
    NSGRule_s
| sort by BlockedFlows desc
| take 20

=== KQL: Top talkers ===

AzureNetworkAnalytics_CL
| where FlowStatus_s == "A"  // Allowed
| summarize TotalBytes=sum(InboundBytes_d + OutboundBytes_d) by SrcIP_s
| sort by TotalBytes desc
| take 10

=== KQL: Traffic by geo-location ===

AzureNetworkAnalytics_CL
| where FlowDirection_s == "I"  // Inbound
| where isnotempty(SrcPublicIPs_s)
| summarize Flows=count() by Country_s
| sort by Flows desc
| take 20

=== KQL: NSG rule hit count ===

AzureNetworkAnalytics_CL
| summarize HitCount=count() by NSGRule_s, FlowStatus_s
| sort by HitCount desc
EOF

# Check flow log storage for raw data
az storage blob list \
  --account-name $FLOW_STORAGE \
  --container-name "insights-logs-networksecuritygroupflowevent" \
  --query "[].name" -o tsv 2>/dev/null | head -5 || echo "Flow log blobs may take time to appear"

# Topology view
az network watcher show-topology \
  --resource-group $RG \
  --query "resources[].{Name:name, Type:id}" -o table
```

---

## Break & Fix

### Scenario 1: Flow logs showing no data after 24 hours

NSG flow logs were enabled but the storage account shows no flow log data and Traffic Analytics has no entries.

<details>
<summary>Show solution</summary>

```bash
# Check flow log status
az network watcher flow-log list \
  --location $LOCATION \
  --query "[].{Name:name, Enabled:enabled, StorageId:storageId}" -o table

# Verify the storage account is accessible and in the same region
az storage account show \
  --name $FLOW_STORAGE \
  --resource-group $RG \
  --query "{Name:name, Location:location, NetworkDefaultAction:networkRuleSet.defaultAction}"

# If storage firewall is blocking, add Network Watcher to trusted services
az storage account update \
  --name $FLOW_STORAGE \
  --resource-group $RG \
  --bypass AzureServices

# Verify the NSG has actual traffic flowing through it
# An NSG with no associated subnet/NIC won't generate logs
az network nsg show --name nsg-web --resource-group $RG \
  --query "subnets[].id"

# Check if the Microsoft.Insights provider is registered
az provider show --namespace Microsoft.Insights --query "registrationState"
az provider register --namespace Microsoft.Insights 2>/dev/null

# Re-create the flow log
az network watcher flow-log delete --name "fl-nsg-web" --location $LOCATION

az network watcher flow-log create \
  --name "fl-nsg-web" \
  --nsg $NSG_WEB_ID \
  --resource-group NetworkWatcherRG \
  --location $LOCATION \
  --storage-account $FLOW_STORAGE \
  --enabled true \
  --format JSON \
  --log-version 2 \
  --retention 90
```

</details>

### Scenario 2: IP Flow Verify shows "Allow" but connection still fails

IP Flow Verify confirms traffic should be allowed, but actual connectivity between VMs fails.

<details>
<summary>Show solution</summary>

```bash
# IP Flow Verify only checks NSG rules. Connection failure can be caused by:
# 1. VM-level firewall (iptables, Windows Firewall)
# 2. Application not listening on the port
# 3. Route table sending traffic to wrong next-hop
# 4. DNS resolution failure

# Check the route table / next hop
az network watcher show-next-hop \
  --vm $WEB_VM_ID \
  --source-ip $WEB_IP \
  --dest-ip $APP_IP \
  --resource-group $RG

# Use connection troubleshoot for full path analysis
az network watcher test-connectivity \
  --source-resource $WEB_VM_ID \
  --dest-resource $APP_VM_ID \
  --dest-port 8080 \
  --protocol TCP

# Check if a UDR is misrouting traffic
az network vnet subnet show \
  --name snet-web \
  --vnet-name vnet-diagnostics \
  --resource-group $RG \
  --query "routeTable"

# Check effective routes on the NIC
az network nic show-effective-route-table \
  --name $WEB_NIC_NAME \
  --resource-group $RG -o table

# The application may not be listening - this is beyond NSG scope
echo "If NSG allows traffic but connection fails, check:"
echo "1. Target VM OS firewall (iptables -L / netsh advfirewall)"
echo "2. Application is listening (netstat -tlnp | grep 8080)"
echo "3. Route table is not misrouting traffic"
```

</details>

### Scenario 3: Traffic Analytics showing "Unknown" sources for suspicious traffic

Traffic Analytics shows large volumes of inbound traffic from "Unknown" geographic locations hitting the web tier.

<details>
<summary>Show solution</summary>

```bash
# "Unknown" in Traffic Analytics means the IP couldn't be geo-located
# This often indicates private RFC1918 IPs or newly allocated public IPs

# Query the raw flow logs for these unknown flows
cat << 'EOF'
=== KQL: Investigate Unknown Sources ===

AzureNetworkAnalytics_CL
| where Country_s == "" or Country_s == "Unknown"
| where FlowDirection_s == "I"
| summarize FlowCount=count(), TotalBytes=sum(InboundBytes_d)
    by SrcIP_s, DestPort_d, NSGRule_s
| sort by FlowCount desc
| take 20
EOF

# If the traffic is suspicious, add a deny rule for the source IPs
# identified in the flow logs

# For private IPs showing as "Unknown", this is normal for VNet-to-VNet traffic

# Ensure NSG flow logs are v2 (includes more metadata)
az network watcher flow-log show \
  --name "fl-nsg-web" \
  --location $LOCATION \
  --query "format.version"

# Upgrade to v2 if needed
az network watcher flow-log update \
  --name "fl-nsg-web" \
  --location $LOCATION \
  --log-version 2
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What does IP Flow Verify NOT check when determining if traffic is allowed or denied?",
    options: [
      "NSG rules on the subnet",
      "NSG rules on the NIC",
      "VM-level (OS) firewall rules and whether the application is listening",
      "Default NSG rules"
    ],
    correctIndex: 2,
    explanation: "IP Flow Verify only evaluates Azure NSG rules (both subnet-level and NIC-level, including default rules). It does NOT check VM-level firewalls (iptables, Windows Firewall), whether the target application is running, route tables, or DNS resolution. Use Connection Troubleshoot for more comprehensive diagnosis."
  },
  {
    question: "What is the difference between NSG Flow Logs version 1 and version 2?",
    options: [
      "Version 2 supports IPv6 while version 1 only supports IPv4",
      "Version 2 includes flow state, bytes, and packets information per flow, enabling Traffic Analytics",
      "Version 2 captures application-layer data while version 1 only captures network-layer",
      "Version 2 is real-time while version 1 has a 5-minute delay"
    ],
    correctIndex: 1,
    explanation: "NSG Flow Logs version 2 includes additional information such as flow state (beginning, continuing, termination), bytes transferred, and packet counts per flow. This additional data is required for Traffic Analytics to provide bandwidth and throughput insights."
  },
  {
    question: "What Azure component must be installed on a VM for Connection Troubleshoot to work?",
    options: [
      "Azure Monitor Agent",
      "Network Watcher Agent VM extension",
      "Log Analytics agent",
      "Azure Security agent"
    ],
    correctIndex: 1,
    explanation: "The Network Watcher Agent VM extension (NetworkWatcherAgentLinux or NetworkWatcherAgentWindows) must be installed on the source VM for Connection Troubleshoot and packet capture to function. Without this extension, these diagnostics cannot be performed."
  },
  {
    question: "How long does it typically take for NSG Flow Log data to appear in Traffic Analytics after being enabled?",
    options: [
      "Immediately (real-time)",
      "5 minutes",
      "10 to 60 minutes depending on the processing interval",
      "24 hours"
    ],
    correctIndex: 2,
    explanation: "Traffic Analytics processes flow log data at configurable intervals (10 minutes or 60 minutes). After enabling, it typically takes at least one processing interval plus some additional time for initial data aggregation before results appear in Log Analytics."
  }
]} />

## Cleanup

```bash
# Delete flow logs first
az network watcher flow-log delete --name "fl-nsg-web" --location $LOCATION
az network watcher flow-log delete --name "fl-nsg-app" --location $LOCATION

# Delete the resource group
az group delete --name $RG --yes --no-wait
```
