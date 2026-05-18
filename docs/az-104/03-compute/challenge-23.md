---
sidebar_position: 23
title: "Challenge 23: App Service Advanced Configuration"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 23: App Service Advanced Configuration

:::info Estimated Time and Cost

**75-90 minutes** | **Estimated cost**: ~$0.30 | **Exam Weight: 20-25%**

:::

## Scenario

Contoso Ltd. is hardening their production web application hosted on Azure App Service. The security and operations teams require custom domain mapping with TLS enforcement, automated backups, and network-level access restrictions. You must configure the App Service to meet enterprise production standards including VNet integration and hybrid connectivity.

## Exam Skills Covered

- Configure certificates and TLS for App Service
- Map custom DNS names to App Service
- Configure backup for App Service
- Configure networking settings for App Service
- Configure VNet integration
- Configure access restrictions

## Sysadmin ↔ Azure Reference

| On-Prem / Traditional | Azure Equivalent |
|---|---|
| Let's Encrypt / commercial SSL certs | App Service Managed Certificates |
| DNS A/CNAME records pointing to web server | Custom domain mapping with verification |
| cron + tar backup scripts | App Service Backup (scheduled) |
| iptables / Windows Firewall rules | Access Restrictions (IP allow/deny) |
| VPN tunnel to corporate network | VNet Integration + Hybrid Connections |
| Reverse proxy with IP allowlist | Access Restrictions + Service Endpoints |
| Site-to-site VPN for internal services | Hybrid Connections (no VPN required) |

## Setup

```bash
# Variables
RG="rg-az104-challenge23"
LOCATION="eastus"
SUFFIX=$RANDOM

# Create resource group
az group create --name $RG --location $LOCATION
```

## Tasks

### Task 1: Create App Service with Custom Domain Prerequisites

```bash
# Create App Service plan (Standard required for custom domains + TLS)
az appservice plan create \
  --resource-group $RG \
  --name plan-contoso-prod \
  --sku S1 \
  --is-linux

# Create web app
APP_NAME="contoso-prod-$SUFFIX"
az webapp create \
  --resource-group $RG \
  --plan plan-contoso-prod \
  --name $APP_NAME \
  --runtime "NODE:18-lts"

echo "App URL: https://$APP_NAME.azurewebsites.net"
```

### Task 2: Configure Custom Domain with DNS Verification

:::tip Custom Domain Verification

Azure requires domain ownership verification before mapping. You can use either a TXT record (asuid verification) or a CNAME record. For lab purposes, we create the DNS zone in Azure.

:::
```bash
# Create a DNS zone (simulating domain ownership)
az network dns zone create \
  --resource-group $RG \
  --name contoso-lab.com

# Add the domain verification TXT record
VERIFICATION_ID=$(az webapp show \
  --resource-group $RG \
  --name $APP_NAME \
  --query "id" -o tsv)

az network dns record-set txt add-record \
  --resource-group $RG \
  --zone-name contoso-lab.com \
  --record-set-name asuid.www \
  --value $(az webapp show -g $RG -n $APP_NAME \
    --query "hostNameSslStates[0].thumbprint" -o tsv 2>/dev/null || echo "placeholder")

# Add CNAME record pointing to the app
az network dns record-set cname set-record \
  --resource-group $RG \
  --zone-name contoso-lab.com \
  --record-set-name www \
  --cname "$APP_NAME.azurewebsites.net"

# Map the custom domain (requires real DNS delegation in production)
# az webapp config hostname add \
#   --resource-group $RG \
#   --webapp-name $APP_NAME \
#   --hostname www.contoso-lab.com
```

**Portal Steps:**
1. Navigate to your App Service > **Custom domains**
2. Click **Add custom domain**
3. Enter the domain name (e.g., `www.contoso-lab.com`)
4. Select validation method (CNAME or TXT)
5. Add the required DNS records at your registrar
6. Click **Validate** then **Add**

### Task 3: Bind a TLS Certificate (Managed Certificate)

```bash
# Create an App Service Managed Certificate (free, auto-renewed)
# Note: Requires custom domain to be validated first
# az webapp config ssl create \
#   --resource-group $RG \
#   --name $APP_NAME \
#   --hostname www.contoso-lab.com

# Bind the certificate to the custom domain
# az webapp config ssl bind \
#   --resource-group $RG \
#   --name $APP_NAME \
#   --certificate-thumbprint <THUMBPRINT> \
#   --ssl-type SNI

# Enforce HTTPS (redirect HTTP to HTTPS)
az webapp update \
  --resource-group $RG \
  --name $APP_NAME \
  --https-only true

# Set minimum TLS version
az webapp config set \
  --resource-group $RG \
  --name $APP_NAME \
  --min-tls-version 1.2

# Verify TLS settings
az webapp show -g $RG -n $APP_NAME \
  --query "{HTTPS_Only:httpsOnly, MinTLS:siteConfig.minTlsVersion}" -o table
```

**Portal Steps:**
1. Navigate to App Service > **TLS/SSL settings**
2. Under **Bindings**, click **Add TLS/SSL binding**
3. Select the custom domain and choose **App Service Managed Certificate**
4. Select **SNI SSL** as the binding type
5. Under **Protocol Settings**, set Minimum TLS Version to **1.2**

### Task 4: Configure App Service Backup

```bash
# Create storage account for backups
STORAGE_NAME="contosobkup$SUFFIX"
az storage account create \
  --resource-group $RG \
  --name $STORAGE_NAME \
  --sku Standard_LRS \
  --location $LOCATION

# Create container for backups
az storage container create \
  --name app-backups \
  --account-name $STORAGE_NAME

# Generate SAS token for the backup container
EXPIRY=$(date -u -d "+365 days" '+%Y-%m-%dT%H:%MZ' 2>/dev/null || date -u -v+365d '+%Y-%m-%dT%H:%MZ')
SAS_TOKEN=$(az storage container generate-sas \
  --account-name $STORAGE_NAME \
  --name app-backups \
  --permissions rwdl \
  --expiry $EXPIRY \
  --output tsv)

CONTAINER_URL="https://$STORAGE_NAME.blob.core.windows.net/app-backups?$SAS_TOKEN"

# Configure scheduled backup (every 24 hours, retain 30 days)
az webapp config backup update \
  --resource-group $RG \
  --webapp-name $APP_NAME \
  --container-url "$CONTAINER_URL" \
  --backup-name "contoso-daily" \
  --frequency 1d \
  --retain-one true \
  --retention 30

# Verify backup configuration
az webapp config backup show \
  --resource-group $RG \
  --webapp-name $APP_NAME
```

**Portal Steps:**
1. Navigate to App Service > **Backups**
2. Click **Configure**
3. Select or create a storage account and container
4. Set backup schedule (e.g., every 1 day)
5. Set retention period (e.g., 30 days)
6. Optionally include linked database
7. Click **Save**

### Task 5: Configure VNet Integration

```bash
# Create a VNet for integration
az network vnet create \
  --resource-group $RG \
  --name vnet-contoso \
  --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-webapp-integration \
  --subnet-prefix 10.0.1.0/24

# Enable VNet integration for the web app
az webapp vnet-integration add \
  --resource-group $RG \
  --name $APP_NAME \
  --vnet vnet-contoso \
  --subnet subnet-webapp-integration

# Verify VNet integration
az webapp vnet-integration list \
  --resource-group $RG \
  --name $APP_NAME -o table

# Configure "Route All" to send all outbound traffic through the VNet
az webapp config appsettings set \
  --resource-group $RG \
  --name $APP_NAME \
  --settings WEBSITE_VNET_ROUTE_ALL=1
```

:::tip VNet Integration Subnet

The integration subnet must be delegated to Microsoft.Web/serverFarms and should not contain any other resources. Use a /24 or /26 subnet dedicated to App Service integration.

:::
### Task 6: Configure Access Restrictions (IP Allow/Deny Rules)

```bash
# Get your current IP
MY_IP=$(curl -s ifconfig.me)

# Allow traffic only from your IP
az webapp config access-restriction add \
  --resource-group $RG \
  --name $APP_NAME \
  --rule-name "AllowAdmin" \
  --priority 100 \
  --ip-address "$MY_IP/32" \
  --action Allow

# Allow traffic from corporate network
az webapp config access-restriction add \
  --resource-group $RG \
  --name $APP_NAME \
  --rule-name "AllowCorporate" \
  --priority 200 \
  --ip-address "203.0.113.0/24" \
  --action Allow

# Deny all other traffic (implicit, but explicit for clarity)
az webapp config access-restriction add \
  --resource-group $RG \
  --name $APP_NAME \
  --rule-name "DenyAll" \
  --priority 300 \
  --ip-address "0.0.0.0/0" \
  --action Deny

# Also restrict the SCM (deployment) site
az webapp config access-restriction add \
  --resource-group $RG \
  --name $APP_NAME \
  --rule-name "AllowAdminSCM" \
  --priority 100 \
  --ip-address "$MY_IP/32" \
  --action Allow \
  --scm-site true

# View all access restrictions
az webapp config access-restriction show \
  --resource-group $RG \
  --name $APP_NAME -o table
```

### Task 7: Configure Hybrid Connections

:::tip Hybrid Connections

Hybrid Connections provide connectivity from App Service to on-premises resources without requiring a VPN or ExpressRoute. It uses a relay agent (Hybrid Connection Manager) installed on-premises.

:::
**Portal Steps (Hybrid Connections require Portal configuration):**
1. Navigate to App Service > **Networking** > **Hybrid connections**
2. Click **Add hybrid connection**
3. Create a new hybrid connection:
   - Name: `contoso-onprem-sql`
   - Endpoint Host: `sql-server.contoso.local`
   - Endpoint Port: `1433`
4. Download and install the **Hybrid Connection Manager** on an on-premises server
5. Register the hybrid connection in the manager

```bash
# Verify hybrid connection namespace exists
az relay namespace list --resource-group $RG -o table
```

## Success Criteria

<SuccessChecklist
  storageKey="az104-challenge-23"
  items={[
    "App Service plan created on Standard (S1) tier or higher",
    "Custom domain DNS records configured (TXT verification + CNAME)",
    "HTTPS-only mode enabled with minimum TLS 1.2",
    "Scheduled backup configured to storage account (daily, 30-day retention)",
    "VNet integration enabled with dedicated subnet",
    "Access restrictions configured (allow specific IPs, deny all others)",
    "SCM site access restrictions configured separately",
    "Hybrid connection concept understood"
  ]}
/>
## Break & Fix Scenarios

### Scenario A: Backup Fails with Storage Error

```bash
# Simulate: Revoke the SAS token by regenerating storage keys
az storage account keys renew \
  --resource-group $RG \
  --account-name $STORAGE_NAME \
  --key primary

# Trigger a manual backup: it will fail
az webapp config backup create \
  --resource-group $RG \
  --webapp-name $APP_NAME \
  --container-url "$CONTAINER_URL" \
  --backup-name "manual-test"

# Fix: Generate a new SAS token and update the backup configuration
```

### Scenario B: VNet Integration Blocks Outbound

```bash
# After enabling WEBSITE_VNET_ROUTE_ALL, external APIs stop working
# because the VNet has no internet route.
# Diagnosis: Check if the VNet has a default route to the internet
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name vnet-contoso \
  --name subnet-webapp-integration \
  --query "routeTable"

# Fix: Ensure a NAT gateway or route to internet exists
# Or set WEBSITE_VNET_ROUTE_ALL=0 for split tunneling
```

### Scenario C: Access Restrictions Lock You Out

```bash
# You accidentally denied all traffic including your own IP
# Fix via CLI (still works even when HTTP is blocked):
az webapp config access-restriction remove \
  --resource-group $RG \
  --name $APP_NAME \
  --rule-name "DenyAll"
```

## Knowledge Check

**1. What is the difference between App Service Managed Certificates and purchased certificates?**

<details>
<summary>Show Answer</summary>

| Feature | Managed Certificate | Purchased/Uploaded |
|---------|--------------------|--------------------|
| Cost | Free | Varies |
| Auto-renewal | Yes (automatic) | Must manage manually |
| Wildcard support | No | Yes |
| Naked domain | No (www only) | Yes |
| Export | No | Yes |

Managed certificates are free, auto-renewed, but limited to standard domains (no wildcards, no naked domains).
</details>

**2. What are the differences between VNet Integration and Hybrid Connections?**

<details>
<summary>Show Answer</summary>

| Feature | VNet Integration | Hybrid Connections |
|---------|-----------------|-------------------|
| Direction | Outbound from app to VNet | Outbound from app to on-prem endpoint |
| Requires VPN | No | No |
| On-prem agent | Not required | Requires Hybrid Connection Manager |
| Protocol | All TCP | TCP (specific host:port) |
| Addresses | Access entire VNet/peered VNets | Access single endpoint |
| Plan required | Standard or higher | Standard or higher |
</details>

**3. How do access restrictions interact with the SCM site?**

<details>
<summary>Show Answer</summary>

By default, the SCM (Kudu/deployment) site inherits the main site's access restrictions. You can configure them separately by:
- Unchecking "Use same restrictions as main site" in the Portal
- Using `--scm-site true` flag in CLI

This is important because you may want to restrict the main site to users but allow the SCM site access from your CI/CD pipeline IP addresses.
</details>

**4. What App Service plan tiers support VNet Integration?**

<details>
<summary>Show Answer</summary>

- **Regional VNet Integration** (recommended): Standard, Premium, PremiumV2, PremiumV3, Elastic Premium
- **Gateway-required VNet Integration** (legacy): Basic and above, but requires a VNet gateway
- Free and Shared tiers do NOT support any form of VNet integration
</details>

## Cleanup

```bash
# Delete all resources
az group delete --name $RG --yes --no-wait

echo "Resources are being deleted in the background."
```

## Learning Resources

- [Configure App Service custom domains](https://learn.microsoft.com/azure/app-service/app-service-web-tutorial-custom-domain)
- [App Service TLS/SSL certificates](https://learn.microsoft.com/azure/app-service/configure-ssl-certificate)
- [App Service backup and restore](https://learn.microsoft.com/azure/app-service/manage-backup)
- [App Service VNet integration](https://learn.microsoft.com/azure/app-service/overview-vnet-integration)
- [App Service access restrictions](https://learn.microsoft.com/azure/app-service/app-service-ip-restrictions)
- [Azure Hybrid Connections](https://learn.microsoft.com/azure/app-service/app-service-hybrid-connections)
