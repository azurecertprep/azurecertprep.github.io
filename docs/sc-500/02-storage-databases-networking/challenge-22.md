---
sidebar_position: 22
title: "Challenge 22: Private Link Services"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 22: Private Link Services

## Exam skills covered

- Plan and implement Azure Private Link services for custom services
- Configure Private Link services with Standard Load Balancer
- Manage private endpoint connections and approvals
- Implement NAT (Network Address Translation) for Private Link
- Configure visibility and auto-approval for Private Link services

## Scenario

Contoso Ltd's platform team operates a shared API gateway service that internal development teams across multiple subscriptions need to consume securely. Rather than exposing the service over the internet or managing complex VNet peering, the team wants to publish the service via Azure Private Link. This allows consuming teams to create private endpoints in their own VNets, accessing the service through private IP addresses without any traffic traversing the public internet. You must configure the Private Link service, manage connection approvals, and set up proper NAT configuration.

---

## Prerequisites

- Azure subscription with Network Contributor role
- Azure CLI installed and authenticated (`az login`)
- Understanding of Azure Load Balancer (Standard SKU)
- Understanding of Private Endpoints (covered in Challenge 21)

---

## Task 1: Create the service provider infrastructure

Deploy the backend service infrastructure including VNet, VMs, and Standard Load Balancer.

```bash
# Set variables
RG="rg-sc500-private-link-service"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION

# Create provider virtual network
az network vnet create \
  --name vnet-provider \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16

# Create subnet for backend servers
az network vnet subnet create \
  --name snet-backend \
  --vnet-name vnet-provider \
  --resource-group $RG \
  --address-prefix 10.0.1.0/24

# Create subnet for Private Link service (NAT subnet)
# Disable private link service network policies on this subnet
az network vnet subnet create \
  --name snet-private-link \
  --vnet-name vnet-provider \
  --resource-group $RG \
  --address-prefix 10.0.2.0/24 \
  --disable-private-link-service-network-policies true

# Create a Standard Load Balancer (required for Private Link service)
az network lb create \
  --name lb-api-gateway \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard \
  --frontend-ip-name "fe-api" \
  --backend-pool-name "be-api-servers" \
  --vnet-name vnet-provider \
  --subnet snet-backend

# Create health probe
az network lb probe create \
  --name "probe-api-health" \
  --lb-name lb-api-gateway \
  --resource-group $RG \
  --protocol Tcp \
  --port 443 \
  --interval 15

# Create load balancing rule
az network lb rule create \
  --name "rule-api-https" \
  --lb-name lb-api-gateway \
  --resource-group $RG \
  --frontend-ip-name "fe-api" \
  --backend-pool-name "be-api-servers" \
  --protocol Tcp \
  --frontend-port 443 \
  --backend-port 443 \
  --probe-name "probe-api-health" \
  --enable-tcp-reset true \
  --idle-timeout 15

# Get the frontend IP configuration ID
FE_IP_ID=$(az network lb frontend-ip show \
  --lb-name lb-api-gateway \
  --resource-group $RG \
  --name "fe-api" \
  --query id -o tsv)

echo "Frontend IP Config ID: $FE_IP_ID"
```

---

## Task 2: Create the Private Link service

Configure the Private Link service attached to the load balancer for consumption by other subscriptions.

```bash
# Create Private Link service
az network private-link-service create \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --location $LOCATION \
  --vnet-name vnet-provider \
  --subnet snet-private-link \
  --lb-frontend-ip-configs $FE_IP_ID \
  --auto-approval "subscription1-id subscription2-id" \
  --visibility "subscription1-id subscription2-id *" \
  --enable-proxy-protocol false

# Get the Private Link service ID (needed by consumers)
PLS_ID=$(az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query id -o tsv)

echo "Private Link Service ID: $PLS_ID"
echo "Share this ID with consuming teams to create private endpoints"

# View Private Link service details
az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query "{Name:name, Alias:alias, State:provisioningState, Visibility:visibility.subscriptions, AutoApproval:autoApproval.subscriptions}"
```

---

## Task 3: Configure NAT IP addresses for the Private Link service

Configure NAT (Network Address Translation) to map consumer private endpoint IPs to provider subnet IPs.

```bash
# List current NAT IP configurations
az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query "ipConfigurations[].{Name:name, PrivateIP:privateIPAddress, Primary:primary, Subnet:subnet.id}"

# Add additional NAT IP for scalability
az network private-link-service update \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --ip-configs "[{\"name\":\"nat-ip-1\",\"privateIPAddress\":\"10.0.2.10\",\"privateIPAllocationMethod\":\"Static\",\"subnet\":{\"id\":\"$(az network vnet subnet show --name snet-private-link --vnet-name vnet-provider --resource-group $RG --query id -o tsv)\"},\"primary\":true},{\"name\":\"nat-ip-2\",\"privateIPAddress\":\"10.0.2.11\",\"privateIPAllocationMethod\":\"Static\",\"subnet\":{\"id\":\"$(az network vnet subnet show --name snet-private-link --vnet-name vnet-provider --resource-group $RG --query id -o tsv)\"},\"primary\":false}]"

# Verify NAT configuration
az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query "ipConfigurations[].{Name:name, PrivateIP:privateIPAddress, Primary:primary}" -o table

echo ""
echo "NAT IP Explanation:"
echo "  When a consumer connects via private endpoint, the source IP"
echo "  seen by the backend servers will be one of the NAT IPs (10.0.2.10/11)"
echo "  rather than the consumer's actual IP. This provides IP isolation."
echo ""
echo "  Each NAT IP can handle ~64,000 TCP connections."
echo "  Add more NAT IPs for higher connection counts."
```

---

## Task 4: Create a consumer private endpoint (simulating another subscription)

Simulate a consuming team creating a private endpoint to access the Private Link service.

```bash
# Create consumer virtual network (simulating another subscription/team)
az network vnet create \
  --name vnet-consumer-team1 \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 172.16.0.0/16

az network vnet subnet create \
  --name snet-consumer-pe \
  --vnet-name vnet-consumer-team1 \
  --resource-group $RG \
  --address-prefix 172.16.1.0/24

# Create private endpoint connecting to the Private Link service
az network private-endpoint create \
  --name "pe-team1-api-gateway" \
  --resource-group $RG \
  --location $LOCATION \
  --vnet-name vnet-consumer-team1 \
  --subnet snet-consumer-pe \
  --connection-name "pec-team1-api" \
  --private-connection-resource-id $PLS_ID \
  --request-message "Team 1 requesting access to shared API gateway"

# Check the connection status (may need approval)
az network private-endpoint show \
  --name "pe-team1-api-gateway" \
  --resource-group $RG \
  --query "manualPrivateLinkServiceConnections[0].privateLinkServiceConnectionState"

# Verify the private IP assigned to the consumer endpoint
az network private-endpoint show \
  --name "pe-team1-api-gateway" \
  --resource-group $RG \
  --query "networkInterfaces[0].id" -o tsv

# Get the private IP
PE_NIC_ID=$(az network private-endpoint show \
  --name "pe-team1-api-gateway" \
  --resource-group $RG \
  --query "networkInterfaces[0].id" -o tsv)

az network nic show \
  --ids $PE_NIC_ID \
  --query "ipConfigurations[0].privateIPAddress" -o tsv
```

---

## Task 5: Manage Private Link service connections (approve/reject)

Manage incoming private endpoint connection requests from consumers.

```bash
# List all private endpoint connections on the Private Link service
az network private-link-service connection list \
  --service-name "pls-api-gateway" \
  --resource-group $RG \
  --query "[].{Name:name, Status:privateLinkServiceConnectionState.status, Description:privateLinkServiceConnectionState.description}" -o table

# Approve a pending connection
CONN_NAME=$(az network private-link-service connection list \
  --service-name "pls-api-gateway" \
  --resource-group $RG \
  --query "[?privateLinkServiceConnectionState.status=='Pending'].name" -o tsv | head -1)

if [ -n "$CONN_NAME" ]; then
  az network private-link-service connection update \
    --service-name "pls-api-gateway" \
    --resource-group $RG \
    --name "$CONN_NAME" \
    --connection-status Approved \
    --description "Approved by security team - verified team ownership"
  echo "Connection approved: $CONN_NAME"
fi

# To reject a connection:
# az network private-link-service connection update \
#   --service-name "pls-api-gateway" \
#   --resource-group $RG \
#   --name "connection-name" \
#   --connection-status Rejected \
#   --description "Rejected - unauthorized subscription"

# To delete/remove a connection:
# az network private-link-service connection delete \
#   --service-name "pls-api-gateway" \
#   --resource-group $RG \
#   --name "connection-name"

# Verify final connection status
az network private-link-service connection list \
  --service-name "pls-api-gateway" \
  --resource-group $RG \
  -o table
```

---

## Task 6: Configure visibility and auto-approval settings

Control which subscriptions can discover and automatically connect to the Private Link service.

```bash
# Update visibility settings (who can see/discover the service)
# "*" means visible to all subscriptions
# Specific subscription IDs restrict visibility
az network private-link-service update \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --visibility "*"

# Configure auto-approval for trusted subscriptions
# Connections from these subscriptions are automatically approved
TRUSTED_SUB_1="$(az account show --query id -o tsv)"

az network private-link-service update \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --auto-approval "$TRUSTED_SUB_1"

# Verify updated settings
az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query "{Name:name, Alias:alias, Visibility:visibility.subscriptions, AutoApproval:autoApproval.subscriptions}" -o json

# Show the Private Link service alias (alternative to resource ID for consumers)
PLS_ALIAS=$(az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query alias -o tsv)

echo ""
echo "Private Link Service Alias: $PLS_ALIAS"
echo "Consumers can use either the resource ID or this alias to create endpoints."
echo "The alias format is: <name>.<random>.<region>.azure.privatelinkservice"

# Enable proxy protocol to get the original consumer IP (optional)
az network private-link-service update \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --enable-proxy-protocol true

echo ""
echo "Proxy Protocol enabled. Backend servers will now receive"
echo "the consumer's original private endpoint IP in the PROXY protocol header."
echo "Backend application must support PROXY protocol v2 to parse this."
```

---

## Break & Fix

### Scenario 1: Private Link service creation fails — subnet policies not disabled

Attempting to create a Private Link service fails with an error about network policies on the subnet.

<details>
<summary>Show solution</summary>

```bash
# Check if private link service network policies are disabled on the subnet
az network vnet subnet show \
  --name snet-private-link \
  --vnet-name vnet-provider \
  --resource-group $RG \
  --query "privateLinkServiceNetworkPolicies"

# The value must be "Disabled" for Private Link SERVICE (not endpoint)
az network vnet subnet update \
  --name snet-private-link \
  --vnet-name vnet-provider \
  --resource-group $RG \
  --disable-private-link-service-network-policies true

# Verify
az network vnet subnet show \
  --name snet-private-link \
  --vnet-name vnet-provider \
  --resource-group $RG \
  --query "{Name:name, PLSNetworkPolicies:privateLinkServiceNetworkPolicies}"

# Note: This is different from private ENDPOINT network policies
# --private-endpoint-network-policies (for PE subnets)
# --disable-private-link-service-network-policies (for PLS subnets)
```

</details>

### Scenario 2: Consumer cannot discover the Private Link service

A consuming team in another subscription reports they cannot find the Private Link service when trying to create a private endpoint.

<details>
<summary>Show solution</summary>

```bash
# Check visibility settings
az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query "visibility.subscriptions"

# If the consumer's subscription is not in the visibility list, add it
CONSUMER_SUB_ID="<consumer-subscription-id>"

# Update visibility to include the consumer subscription
az network private-link-service update \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --visibility "$CONSUMER_SUB_ID"

# Alternatively, set visibility to all subscriptions
az network private-link-service update \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --visibility "*"

# Provide the consumer with the Private Link service alias or resource ID
az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query "{ResourceId:id, Alias:alias}"
```

</details>

### Scenario 3: Backend servers see NAT IP instead of real consumer IP

The API gateway logs show all traffic coming from the NAT IP addresses (10.0.2.10/11) instead of the actual consumer IPs, making audit logging impossible.

<details>
<summary>Show solution</summary>

```bash
# Enable Proxy Protocol v2 on the Private Link service
az network private-link-service update \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --enable-proxy-protocol true

# After enabling, the backend servers receive the PROXY protocol header
# containing the original consumer private endpoint IP address.

# The backend application/load balancer must be configured to parse
# PROXY protocol v2 headers.

echo "Backend configuration required:"
echo "  - NGINX: set 'proxy_protocol on;' in stream block"
echo "  - HAProxy: set 'accept-proxy' on bind line"
echo "  - Application: Parse the PROXY protocol header to get real client IP"
echo ""
echo "Note: If backends don't support PROXY protocol, enabling this"
echo "will break connectivity as they'll misinterpret the header as data."

# Verify proxy protocol is enabled
az network private-link-service show \
  --name "pls-api-gateway" \
  --resource-group $RG \
  --query "enableProxyProtocol"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the key difference between a Private Endpoint and a Private Link Service?",
    options: [
      "Private Endpoints are free; Private Link Services have a per-hour charge",
      "A Private Endpoint is a consumer-side NIC providing access, while a Private Link Service is a provider-side resource exposing a service behind a Standard Load Balancer",
      "Private Link Services only work with Microsoft PaaS services",
      "Private Endpoints require VNet peering; Private Link Services do not"
    ],
    correctIndex: 1,
    explanation: "A Private Endpoint is a network interface in the consumer's VNet that provides private access. A Private Link Service is configured by the service provider on their Standard Load Balancer to expose their service for consumption via Private Endpoints. They work together: consumers create PEs that connect to the provider's PLS."
  },
  {
    question: "Why must 'privateLinkServiceNetworkPolicies' be disabled on the subnet used for a Private Link service?",
    options: [
      "To allow the Private Link service to use dynamic IP allocation",
      "To prevent NSGs and UDRs from blocking the Private Link service's source NAT traffic",
      "To enable DNS resolution for the service",
      "To allow the service to communicate with Azure management plane"
    ],
    correctIndex: 1,
    explanation: "Disabling Private Link service network policies on the subnet prevents NSGs and UDRs from interfering with the source NAT traffic that the Private Link service generates. The NAT IPs assigned from this subnet need unrestricted network access to function correctly."
  },
  {
    question: "How can a Private Link service provider see the real IP address of the consumer's private endpoint?",
    options: [
      "Check the Azure Activity Log",
      "Enable Proxy Protocol v2 on the Private Link service",
      "Look at the NSG flow logs",
      "Query the Azure Resource Manager API"
    ],
    correctIndex: 1,
    explanation: "By default, backend servers only see the NAT IP addresses. Enabling Proxy Protocol v2 on the Private Link service adds a header to each TCP connection containing the consumer's actual private endpoint IP address. The backend application must support parsing Proxy Protocol v2 headers."
  },
  {
    question: "What does the 'auto-approval' setting on a Private Link service control?",
    options: [
      "It automatically creates private endpoints in specified subscriptions",
      "Private endpoint connections from listed subscriptions are automatically approved without manual intervention",
      "It approves all connections regardless of source subscription",
      "It automatically rotates NAT IP addresses"
    ],
    correctIndex: 1,
    explanation: "The auto-approval setting lists subscription IDs whose private endpoint connection requests are automatically approved. Connections from unlisted subscriptions remain in 'Pending' state until manually approved or rejected by the service provider."
  }
]} />

## Cleanup

```bash
# Delete the resource group and all resources
az group delete --name $RG --yes --no-wait
```
