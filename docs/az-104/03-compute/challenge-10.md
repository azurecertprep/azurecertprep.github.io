---
sidebar_position: 4
title: "Challenge 10: Azure App Service"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 10: Azure App Service

:::info Estimated Time and Cost

**60–75 minutes** | **~$0.20** (S1 tier, delete promptly) | **Exam Weight: 20–25%**

:::
## Scenario

Contoso's marketing team needs a web application deployed for an upcoming campaign. The site must support zero-downtime deployments, auto-scaling during traffic spikes, and regular backups. You'll deploy it to Azure App Service with production best practices | deployment slots, autoscale, and networking controls.

## Exam Skills Covered

| Skill | Weight |
|-------|--------|
| Provision an App Service plan | High |
| Configure scaling for App Service | High |
| Create an App Service web app | High |
| Configure deployment slots | High |
| Configure TLS/SSL and certificates | Medium |
| Map existing custom DNS domain | Medium |
| Configure backup for App Service | Medium |
| Configure networking settings | Medium |

## Sysadmin ↔ Azure Reference

| Traditional | Azure Equivalent |
|-------------|-----------------|
| IIS / Apache / Nginx on a VM | Azure App Service |
| Load balancer + multiple IIS servers | App Service scale-out |
| DNS CNAME record | Custom domain mapping |
| web.config / .htaccess | App Service Configuration (App Settings, Connection Strings) |
| Blue-green deployment | Deployment slots + swap |
| VM snapshots / cron backup scripts | App Service Backup |
| Firewall rules on web server | App Service Access Restrictions |

## Tasks

### Task 1: Create an App Service Plan

```bash
# Create a resource group
az group create --name rg-appservice-lab --location eastus

# Create an App Service plan (Standard S1: required for deployment slots)
az appservice plan create \
  --resource-group rg-appservice-lab \
  --name plan-contoso-web \
  --sku S1 \
  --is-linux

# Verify the plan
az appservice plan show -g rg-appservice-lab -n plan-contoso-web \
  --query "{Name:name, SKU:sku.name, Tier:sku.tier, Workers:sku.capacity}" -o table
```

### Task 2: Create a Web App

```bash
# Create a web app with Node.js runtime
az webapp create \
  --resource-group rg-appservice-lab \
  --plan plan-contoso-web \
  --name contoso-web-$RANDOM \
  --runtime "NODE:18-lts"

# Store the app name for later
APP_NAME=$(az webapp list -g rg-appservice-lab --query "[0].name" -o tsv)
echo "App Name: $APP_NAME"

# Verify it's running
az webapp show -g rg-appservice-lab -n $APP_NAME \
  --query "{Name:name, State:state, URL:defaultHostName}" -o table
```

### Task 3: Deploy Sample Code

```bash
# Create a simple Node.js app
mkdir webapp && cd webapp

cat > index.js << 'EOF'
const http = require('http');
const port = process.env.PORT || 8080;
const version = process.env.APP_VERSION || 'v1';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<h1>Contoso Marketing - ${version}</h1><p>Server time: ${new Date()}</p>`);
});

server.listen(port, () => console.log(`Running on port ${port}`));
EOF

cat > package.json << 'EOF'
{
  "name": "contoso-web",
  "version": "1.0.0",
  "scripts": { "start": "node index.js" },
  "engines": { "node": ">=18.0.0" }
}
EOF

# Deploy using zip deploy
zip -r app.zip index.js package.json
az webapp deploy \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --src-path app.zip \
  --type zip

# Set an app setting
az webapp config appsettings set \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --settings APP_VERSION=v1

# Test the deployment
echo "Visit: https://$APP_NAME.azurewebsites.net"
```

### Task 4: Create a Staging Deployment Slot

```bash
# Create a staging slot
az webapp deployment slot create \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --slot staging

# Verify the slot
az webapp deployment slot list -g rg-appservice-lab -n $APP_NAME -o table

# The staging slot has its own URL
echo "Staging URL: https://$APP_NAME-staging.azurewebsites.net"
```

### Task 5: Deploy a New Version to Staging

```bash
# Update the version in staging
az webapp config appsettings set \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --slot staging \
  --settings APP_VERSION=v2

# Deploy updated code to staging
cd webapp
sed -i "s/Contoso Marketing/Contoso Marketing 2.0/" index.js
zip -r app-v2.zip index.js package.json

az webapp deploy \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --slot staging \
  --src-path app-v2.zip \
  --type zip

# Test the staging slot
echo "Staging: https://$APP_NAME-staging.azurewebsites.net"
echo "Production: https://$APP_NAME.azurewebsites.net"
```

### Task 6: Swap Staging and Production

```bash
# Preview what will change
az webapp deployment slot list -g rg-appservice-lab -n $APP_NAME -o table

# Swap staging to production (zero-downtime)
az webapp deployment slot swap \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --slot staging \
  --target-slot production

# Verify: production now runs v2, staging has v1
echo "Production: https://$APP_NAME.azurewebsites.net"
echo "Staging: https://$APP_NAME-staging.azurewebsites.net"
```

### Task 7: Configure Autoscale

```bash
# Get the App Service plan resource ID
PLAN_ID=$(az appservice plan show -g rg-appservice-lab -n plan-contoso-web --query id -o tsv)

# Create autoscale settings
az monitor autoscale create \
  --resource-group rg-appservice-lab \
  --resource plan-contoso-web \
  --resource-type Microsoft.Web/serverfarms \
  --name autoscale-web \
  --min-count 1 \
  --max-count 5 \
  --count 1

# Scale out when CPU > 70%
az monitor autoscale rule create \
  --resource-group rg-appservice-lab \
  --autoscale-name autoscale-web \
  --condition "CpuPercentage > 70 avg 5m" \
  --scale out 1

# Scale in when CPU < 30%
az monitor autoscale rule create \
  --resource-group rg-appservice-lab \
  --autoscale-name autoscale-web \
  --condition "CpuPercentage < 30 avg 10m" \
  --scale in 1

# Verify autoscale settings
az monitor autoscale show -g rg-appservice-lab -n autoscale-web \
  --query "profiles[0].rules[].{Metric:metricTrigger.metricName, Op:metricTrigger.operator, Threshold:metricTrigger.threshold, Direction:scaleAction.direction}" -o table
```

### Task 8: Configure Backup

```bash
# Create a storage account for backups
BACKUP_STORAGE="contosobackup$RANDOM"
az storage account create \
  --resource-group rg-appservice-lab \
  --name $BACKUP_STORAGE \
  --sku Standard_LRS

# Create a container for backups
az storage container create \
  --name webapp-backups \
  --account-name $BACKUP_STORAGE

# Generate a SAS URL for the container
EXPIRY=$(date -u -d "1 year" '+%Y-%m-%dT%H:%MZ')
SAS_URL=$(az storage container generate-sas \
  --account-name $BACKUP_STORAGE \
  --name webapp-backups \
  --permissions rwdl \
  --expiry $EXPIRY \
  --output tsv)

CONTAINER_URL="https://$BACKUP_STORAGE.blob.core.windows.net/webapp-backups?$SAS_URL"

# Configure backup
az webapp config backup update \
  --resource-group rg-appservice-lab \
  --webapp-name $APP_NAME \
  --container-url "$CONTAINER_URL" \
  --backup-name "contoso-backup" \
  --frequency 1d \
  --retain-one true
```

### Task 9: Configure Access Restrictions

```bash
# Add an IP-based access restriction (allow only your IP)
MY_IP=$(curl -s ifconfig.me)

az webapp config access-restriction add \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --rule-name "AllowMyIP" \
  --priority 100 \
  --ip-address "$MY_IP/32" \
  --action Allow

# Add a deny-all rule at lower priority
az webapp config access-restriction add \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --rule-name "DenyAll" \
  --priority 200 \
  --ip-address "0.0.0.0/0" \
  --action Deny

# Show effective rules
az webapp config access-restriction show \
  -g rg-appservice-lab -n $APP_NAME -o table
```

## Success Criteria

<SuccessChecklist
  storageKey="az104-challenge-10"
  items={[
    "App Service plan (Standard S1) created",
    "Web app deployed and accessible via HTTPS",
    "Staging deployment slot created and receives v2",
    "Slot swap executed | production runs v2",
    "Autoscale configured with CPU-based rules",
    "Backup schedule configured with storage account",
    "Access restrictions configured on the web app"
  ]}
/>
## Break & Fix Scenarios

### Scenario A: Deploying to the Wrong Slot
```bash
# You deployed v2 to production instead of staging. How do you roll back?
# Hint: The previous version is now in the staging slot after a swap.
az webapp deployment slot swap \
  --resource-group rg-appservice-lab \
  --name $APP_NAME \
  --slot staging \
  --target-slot production
```

### Scenario B: Autoscale Min > Max
```bash
# Try setting min-count higher than max-count
az monitor autoscale update \
  --resource-group rg-appservice-lab \
  --name autoscale-web \
  --min-count 10 --max-count 3
# What error do you get?
```

### Scenario C: Slots on Free Tier
```bash
# Create a Free tier plan and try to add a slot
az appservice plan create -g rg-appservice-lab -n plan-free --sku F1 --is-linux
az webapp create -g rg-appservice-lab --plan plan-free --name free-app-$RANDOM --runtime "NODE:18-lts"
az webapp deployment slot create -g rg-appservice-lab --name free-app-$RANDOM --slot staging
# What error do you get? Which tiers support deployment slots?
```

## Knowledge Check

**1. What App Service plan tiers support deployment slots?**

<details>
<summary>Show Answer</summary>

| Tier | Slots | Custom Domains | SSL | Autoscale |
|------|-------|---------------|-----|-----------|
| Free (F1) | 0 | 0 | ❌ | ❌ |
| Shared (D1) | 0 | Custom | ❌ | ❌ |
| Basic (B1-B3) | 0 | Custom | ✅ | ❌ |
| Standard (S1-S3) | 5 | Custom | ✅ | ✅ |
| Premium (P1-P3) | 20 | Custom | ✅ | ✅ |

Deployment slots require **Standard** tier or higher.
</details>

**2. What happens during a slot swap?**

<details>
<summary>Show Answer</summary>

1. Azure applies the **target slot's settings** (connection strings, app settings marked "slot setting") to the source slot.
2. Azure **warms up** the source slot by sending an HTTP request to its root path.
3. If warm-up succeeds, Azure **swaps the routing rules** | traffic now goes to the warmed-up source slot.
4. The previous production code is now in the staging slot (instant rollback if needed).

The swap is atomic from the user's perspective | no downtime.
</details>

**3. Which deployment slot settings swap, and which don't?**

<details>
<summary>Show Answer</summary>

**Settings that DO swap** (follow the code):
- App settings (unless marked as "slot setting"), connection strings, handler mappings, public certificates, WebJobs content, virtual applications

**Settings that DON'T swap** (stay with the slot):
- Publishing endpoints, custom domain names, TLS/SSL certificates and bindings, scale settings, diagnostic settings, CORS, VNet integration, managed identities, settings ending in `_EXTENSION_VERSION`
</details>

**4. What is the difference between scale-up and scale-out?**

<details>
<summary>Show Answer</summary>

- **Scale-up** (vertical): Change the App Service plan tier/size | bigger VM, more CPU/RAM. Requires a brief restart.
- **Scale-out** (horizontal): Add more instances of the same size. App Service load balances across instances. Can be manual or automatic (autoscale rules). No downtime.
</details>

## Cleanup

```bash
# Delete all resources
az group delete --name rg-appservice-lab --yes --no-wait

# Clean up local files
rm -rf webapp

echo "Resources are being deleted in the background."
```
