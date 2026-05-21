---
sidebar_position: 26
title: "Challenge 26: Network Watcher & Diagnostics"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 26: Network watcher & diagnostics

:::info Estimated Time and Cost

**60-75 minutes** | **Estimated cost**: ~$0.20 | **Exam Weight: 10-15%**

:::

## Scenario

Contoso Ltd. is troubleshooting connectivity issues between their Azure VMs and external services. The network team needs to use Azure diagnostic tools to identify why certain connections fail, verify NSG rules are correct, trace packet flows, and set up continuous monitoring. You must become proficient with Network Watcher's full toolkit.

## Exam skills covered

- Enable and use Azure Network Watcher
- Use IP Flow Verify to test NSG rules
- Use Next Hop to diagnose routing
- Configure and use Packet Capture
- Configure Connection Monitor
- Analyze NSG flow logs
- Use Network Watcher topology view
- Check effective security rules

## Sysadmin ↔ Azure reference

| On-Prem / Traditional | Azure Equivalent |
|---|---|
| Wireshark / tcpdump | Network Watcher Packet Capture |
| traceroute / tracert | Next Hop analysis |
| iptables -L / netsh advfirewall show | IP Flow Verify / Effective Security Rules |
| Nagios / PRTG connectivity checks | Connection Monitor |
| NetFlow / sFlow logs | NSG Flow Logs |
| Network topology diagram (Visio) | Network Watcher Topology |
| ping / telnet to test ports | Connection Troubleshoot |

## Setup

```bash
# Variables
RG="rg-az104-challenge26"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION

# Create VNet with subnets
az network vnet create \
  --resource-group $RG \
  --name vnet-diag \
  --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-web \
  --subnet-prefix 10.0.1.0/24

az network vnet subnet create \
  --resource-group $RG \
  --vnet-name vnet-diag \
  --name subnet-db \
  --address-prefix 10.0.2.0/24

# Create NSG with rules
az network nsg create --resource-group $RG --name nsg-web
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name AllowHTTP \
  --priority 100 \
  --direction Inbound \
  --source-address-prefixes "*" \
  --destination-port-ranges 80 443 \
  --protocol Tcp \
  --access Allow

az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name DenySSHFromInternet \
  --priority 200 \
  --direction Inbound \
  --source-address-prefixes Internet \
  --destination-port-ranges 22 \
  --protocol Tcp \
  --access Deny

# Associate NSG with web subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name vnet-diag \
  --name subnet-web \
  --network-security-group nsg-web

# Create VMs for testing
az vm create \
  --resource-group $RG \
  --name vm-web \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-diag \
  --subnet subnet-web \
  --public-ip-address vm-web-pip \
  --nsg "" \
  --admin-username azureuser \
  --generate-ssh-keys

az vm create \
  --resource-group $RG \
  --name vm-db \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --vnet-name vnet-diag \
  --subnet subnet-db \
  --public-ip-address "" \
  --nsg "" \
  --admin-username azureuser \
  --generate-ssh-keys
```

## Tasks

### Task 1: enable Network watcher

```bash
# Network watcher is auto-enabled for most subscriptions
# Verify it exists for your region
az network watcher list -o table

# If not enabled, create it
az network watcher configure \
  --resource-group NetworkWatcherRG \
  --locations $LOCATION \
  --enabled true

# Verify
az network watcher list \
  --query "[?location=='$LOCATION'] | [0].{Name:name, Location:location, State:provisioningState}" -o table
```

### Task 2: IP flow verify

Test whether traffic is allowed or denied by NSG rules:

```bash
# Get VM resource IDs
VM_WEB_ID=$(az vm show -g $RG -n vm-web --query "id" -o tsv)
VM_WEB_NIC=$(az vm show -g $RG -n vm-web \
  --query "networkProfile.networkInterfaces[0].id" -o tsv)
VM_WEB_IP=$(az vm show -g $RG -n vm-web -d \
  --query "privateIps" -o tsv)

# Test: can internet reach port 80 on the web VM? (Should allow)
az network watcher test-ip-flow \
  --direction Inbound \
  --protocol Tcp \
  --local "$VM_WEB_IP:80" \
  --remote "1.2.3.4:12345" \
  --vm $VM_WEB_ID \
  --nic $VM_WEB_NIC

# Test: can internet reach port 22 on the web VM? (Should deny)
az network watcher test-ip-flow \
  --direction Inbound \
  --protocol Tcp \
  --local "$VM_WEB_IP:22" \
  --remote "1.2.3.4:12345" \
  --vm $VM_WEB_ID \
  --nic $VM_WEB_NIC

# Test: can the web VM reach the internet on port 443? (Should allow)
az network watcher test-ip-flow \
  --direction Outbound \
  --protocol Tcp \
  --local "$VM_WEB_IP:12345" \
  --remote "8.8.8.8:443" \
  --vm $VM_WEB_ID \
  --nic $VM_WEB_NIC
```

:::tip IP Flow Verify

IP Flow Verify tells you which NSG rule (name and priority) is allowing or denying traffic. It checks both the NIC-level NSG and subnet-level NSG. This is the fastest way to diagnose "why can't I connect?" issues.

:::
### Task 3: next hop analysis

Determine the next hop for traffic from a VM:

```bash
# What is the next hop for traffic going to the internet?
az network watcher show-next-hop \
  --resource-group $RG \
  --vm vm-web \
  --source-ip $VM_WEB_IP \
  --dest-ip 8.8.8.8

# What is the next hop for traffic going to the DB VM?
VM_DB_IP=$(az vm show -g $RG -n vm-db -d --query "privateIps" -o tsv)
az network watcher show-next-hop \
  --resource-group $RG \
  --vm vm-web \
  --source-ip $VM_WEB_IP \
  --dest-ip $VM_DB_IP

# What is the next hop for traffic to a non-existent address?
az network watcher show-next-hop \
  --resource-group $RG \
  --vm vm-web \
  --source-ip $VM_WEB_IP \
  --dest-ip 192.168.1.1
```

### Task 4: packet capture

```bash
# Create a storage account for packet captures
CAPTURE_STORAGE="diagcapture$RANDOM"
az storage account create \
  --resource-group $RG \
  --name $CAPTURE_STORAGE \
  --sku Standard_LRS

# Start a packet capture on the web VM
az network watcher packet-capture create \
  --resource-group $RG \
  --vm vm-web \
  --name capture-web-traffic \
  --storage-account $CAPTURE_STORAGE \
  --time-limit 60 \
  --filters '[{"protocol":"TCP","localPort":"80"}]'

# Check capture status
az network watcher packet-capture show \
  --location $LOCATION \
  --name capture-web-traffic

# Generate some traffic (from another terminal or using the vm)
az vm run-command invoke \
  --resource-group $RG \
  --name vm-web \
  --command-id RunShellScript \
  --scripts "curl -s http://localhost > /dev/null; echo done"

# Stop the capture
az network watcher packet-capture stop \
  --location $LOCATION \
  --name capture-web-traffic

# List all packet captures
az network watcher packet-capture list --location $LOCATION -o table

# Delete capture when done
az network watcher packet-capture delete \
  --location $LOCATION \
  --name capture-web-traffic
```

:::tip Packet Capture

Packet captures are stored as .cap files in the storage account. You can download and analyze them with Wireshark. The Network Watcher agent must be installed on the VM (automatically installed when you create a capture).

:::
### Task 5: connection Monitor

```bash
# Create a connection Monitor to continuously test connectivity
az network watcher connection-monitor create \
  --name cm-web-to-internet \
  --location $LOCATION \
  --test-group-name tg-web-external \
  --endpoint-source-name "vm-web" \
  --endpoint-source-resource-id $VM_WEB_ID \
  --endpoint-dest-name "google-dns" \
  --endpoint-dest-address "8.8.8.8" \
  --test-config-name "tcp-443" \
  --protocol Tcp \
  --tcp-port 443 \
  --frequency 30

# Create a second test for internal connectivity
VM_DB_ID=$(az vm show -g $RG -n vm-db --query "id" -o tsv)
az network watcher connection-monitor create \
  --name cm-web-to-db \
  --location $LOCATION \
  --test-group-name tg-internal \
  --endpoint-source-name "vm-web" \
  --endpoint-source-resource-id $VM_WEB_ID \
  --endpoint-dest-name "vm-db" \
  --endpoint-dest-resource-id $VM_DB_ID \
  --test-config-name "tcp-5432" \
  --protocol Tcp \
  --tcp-port 5432 \
  --frequency 60

# Check connection monitor status
az network watcher connection-monitor list --location $LOCATION -o table

# Show test results
az network watcher connection-monitor show \
  --location $LOCATION \
  --name cm-web-to-internet
```

### Task 6: NSG flow logs

```bash
# Create a Log Analytics workspace for flow logs
az monitor log-analytics workspace create \
  --resource-group $RG \
  --workspace-name law-network-diag \
  --location $LOCATION

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RG \
  --workspace-name law-network-diag \
  --query "id" -o tsv)

# Create storage account for flow logs
FLOW_STORAGE="flowlogs$RANDOM"
az storage account create \
  --resource-group $RG \
  --name $FLOW_STORAGE \
  --sku Standard_LRS

# Get NSG resource ID
NSG_ID=$(az network nsg show -g $RG -n nsg-web --query "id" -o tsv)

# Enable NSG flow logs (version 2 for traffic analytics)
az network watcher flow-log create \
  --location $LOCATION \
  --name flowlog-nsg-web \
  --nsg $NSG_ID \
  --storage-account $FLOW_STORAGE \
  --workspace $WORKSPACE_ID \
  --enabled true \
  --format JSON \
  --log-version 2 \
  --retention 7 \
  --traffic-analytics true \
  --interval 10

# Verify flow log configuration
az network watcher flow-log show \
  --location $LOCATION \
  --name flowlog-nsg-web
```

**Portal Steps:**
1. Navigate to **Network Watcher** > **NSG flow logs**
2. Select the NSG
3. Enable flow logs with Version 2
4. Configure storage account and retention
5. Enable Traffic Analytics with Log Analytics workspace
6. Set processing interval (10 minutes recommended)

### Task 7: connection troubleshoot

```bash
# One-time connectivity check from VM to destination
az network watcher test-connectivity \
  --resource-group $RG \
  --source-resource vm-web \
  --dest-address 8.8.8.8 \
  --dest-port 443 \
  --protocol Tcp

# Test connectivity to the DB VM on port 5432
az network watcher test-connectivity \
  --resource-group $RG \
  --source-resource vm-web \
  --dest-resource vm-db \
  --dest-port 5432 \
  --protocol Tcp

# Test connectivity to a service that should be blocked
az network watcher test-connectivity \
  --resource-group $RG \
  --source-resource vm-web \
  --dest-address 10.99.99.99 \
  --dest-port 80 \
  --protocol Tcp
```

### Task 8: topology view and effective security rules

```bash
# Generate network topology
az network watcher show-topology \
  --resource-group $RG

# View effective security rules for the web VM NIC
WEB_NIC_NAME=$(basename $VM_WEB_NIC)
az network nic list-effective-nsg \
  --resource-group $RG \
  --name $WEB_NIC_NAME -o table
```

**Portal Steps for Topology:**
1. Navigate to **Network Watcher** > **Topology**
2. Select your subscription and resource group
3. View the interactive diagram showing VNets, subnets, NICs, and VMs
4. Observe the relationships between network resources

**Portal Steps for Effective Security Rules:**
1. Navigate to **Network Watcher** > **Effective security rules**
2. Select the VM or NIC
3. View the combined list of all applicable NSG rules (NIC + subnet level)
4. Identify which rule is allowing or blocking traffic

## Success criteria

<SuccessChecklist
  storageKey="az104-challenge-26"
  items={[
    "Network Watcher enabled in the target region",
    "IP Flow Verify used to test allowed/denied traffic (port 80 allowed, port 22 denied)",
    "Next Hop analysis performed for internet, internal, and unreachable destinations",
    "Packet capture created, traffic captured, and capture stopped",
    "Connection Monitor configured for external and internal connectivity tests",
    "NSG flow logs enabled with Traffic Analytics",
    "Connection Troubleshoot used to verify connectivity",
    "Topology view examined",
    "Effective security rules reviewed for combined NIC + subnet NSG impact"
  ]}
/>
## Break & fix scenarios

### Scenario a: VM cannot reach internet

```bash
# Add a deny-all outbound rule to the NSG
az network nsg rule create \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name BlockOutbound \
  --priority 100 \
  --direction Outbound \
  --source-address-prefixes "*" \
  --destination-address-prefixes "*" \
  --destination-port-ranges "*" \
  --protocol "*" \
  --access Deny

# Diagnose with IP flow verify
az network watcher test-ip-flow \
  --direction Outbound \
  --protocol Tcp \
  --local "$VM_WEB_IP:12345" \
  --remote "8.8.8.8:443" \
  --vm $VM_WEB_ID \
  --nic $VM_WEB_NIC

# Output will show: "Access: deny, rule: BlockOutbound"

# Fix: remove the blocking rule
az network nsg rule delete \
  --resource-group $RG \
  --nsg-name nsg-web \
  --name BlockOutbound
```

### Scenario b: asymmetric routing causes drops

```bash
# Add a UDR that routes response traffic differently than request traffic
# This causes asymmetric routing (responses take different path than requests)
# Diagnose with next hop to see unexpected routing
az network watcher show-next-hop \
  --resource-group $RG \
  --vm vm-web \
  --source-ip $VM_WEB_IP \
  --dest-ip 1.2.3.4

# If next hop shows "VirtualAppliance" but no NVA exists, traffic is black-holed
```

### Scenario c: connection Monitor shows failures

```bash
# Check connection Monitor for failures
az network watcher connection-monitor show \
  --location $LOCATION \
  --name cm-web-to-db

# Common causes:
# 1. no service listening on destination port
# 2. NSG blocking the port
# 3. OS-level firewall (iptables/ufw) blocking
# Diagnose: use IP flow verify + connection troubleshoot
```

## Knowledge check

**1. What is the difference between Connection Monitor and Connection Troubleshoot?**

<details>
<summary>Show Answer</summary>

| Feature | Connection Monitor | Connection Troubleshoot |
|---------|-------------------|------------------------|
| Type | Continuous monitoring | One-time test |
| Duration | Runs indefinitely (scheduled) | Single check |
| Alerting | Yes (integrates with Azure Monitor) | No |
| History | Maintains historical data | Point-in-time result |
| Use case | Ongoing health monitoring | Ad-hoc debugging |
</details>

**2. What information does IP Flow Verify provide?**

<details>
<summary>Show Answer</summary>

IP Flow Verify returns:
- **Access**: Allow or Deny
- **Rule Name**: The specific NSG rule causing the allow/deny
- **NSG ID**: Which NSG (NIC-level or subnet-level) contains the matching rule

It evaluates both NIC-level and subnet-level NSGs and returns the first matching rule. This is the fastest way to diagnose NSG-related connectivity issues.
</details>

**3. What are the requirements for packet capture?**

<details>
<summary>Show Answer</summary>

- Network Watcher agent VM extension must be installed (auto-installed on first capture)
- VM must be in a Running state
- Storage account in the same region (for storing .cap files)
- Maximum capture size and time limits can be configured
- Filters can be applied (protocol, local/remote IP, port)
- Output can go to storage account, local file on VM, or both
</details>

**4. What does NSG Flow Log version 2 add over version 1?**

<details>
<summary>Show Answer</summary>

Version 2 adds:
- **Bytes sent/received** per flow (bandwidth tracking)
- **Flow state** information (Begin, Continuing, End)
- **Traffic Analytics** support (requires Log Analytics workspace)

Version 1 only logs: timestamp, source/dest IP, source/dest port, protocol, traffic direction (inbound/outbound), and allow/deny.
</details>

## Cleanup

```bash
# Delete connection monitors first
az network watcher connection-monitor delete \
  --location $LOCATION --name cm-web-to-internet 2>/dev/null
az network watcher connection-monitor delete \
  --location $LOCATION --name cm-web-to-db 2>/dev/null

# Delete flow logs
az network watcher flow-log delete \
  --location $LOCATION --name flowlog-nsg-web 2>/dev/null

# Delete all resources
az group delete --name $RG --yes --no-wait

echo "Resources are being deleted in the background."
```

## Learning resources

- [Azure Network Watcher overview](https://learn.microsoft.com/azure/network-watcher/network-watcher-monitoring-overview)
- [IP Flow Verify](https://learn.microsoft.com/azure/network-watcher/network-watcher-ip-flow-verify-overview)
- [Next Hop](https://learn.microsoft.com/azure/network-watcher/network-watcher-next-hop-overview)
- [Packet Capture](https://learn.microsoft.com/azure/network-watcher/network-watcher-packet-capture-overview)
- [Connection Monitor](https://learn.microsoft.com/azure/network-watcher/connection-monitor-overview)
- [NSG Flow Logs](https://learn.microsoft.com/azure/network-watcher/nsg-flow-logs-overview)
- [Traffic Analytics](https://learn.microsoft.com/azure/network-watcher/traffic-analytics)
