---
sidebar_position: 7
title: "Challenge 07: Key Vault Deployment and Configuration"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 07: Key Vault Deployment and Configuration

## Exam skills covered

- Deploy and configure Azure Key Vault
- Configure Key Vault access control (RBAC vs access policies)
- Implement Key Vault network security (firewall, private endpoints)
- Configure Key Vault diagnostic logging and monitoring
- Implement Key Vault backup and disaster recovery
- Configure soft-delete and purge protection

## Scenario

Contoso Ltd is centralizing secret management across their Azure environment. Currently, secrets are scattered across app settings, environment variables, and shared configuration files. The security team must deploy a production-grade Key Vault infrastructure with RBAC-based access control, network isolation via private endpoints, comprehensive audit logging, and disaster recovery capabilities. The deployment must comply with the company's zero-trust architecture mandate.

---

## Prerequisites

- Azure subscription with Contributor access
- Azure CLI installed and authenticated
- Understanding of Azure networking (VNets, private endpoints)
- Log Analytics workspace (or ability to create one)

---

## Task 1: Deploy Key Vault with security best practices

Create a Key Vault with RBAC authorization, soft-delete, purge protection, and premium SKU for HSM-backed keys.

```bash
# Set variables
RG_NAME="rg-contoso-keyvault-lab"
LOCATION="eastus2"
KV_NAME="kv-contoso-prod-$(openssl rand -hex 4)"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Create Key Vault with security features enabled
az keyvault create \
  --name $KV_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --sku premium \
  --enable-rbac-authorization true \
  --enable-soft-delete true \
  --retention-days 90 \
  --enable-purge-protection true \
  --public-network-access Enabled

# Verify Key Vault properties
az keyvault show --name $KV_NAME \
  --query "{name:name, sku:properties.sku.name, rbac:properties.enableRbacAuthorization, softDelete:properties.enableSoftDelete, purgeProtection:properties.enablePurgeProtection, retentionDays:properties.softDeleteRetentionInDays}" \
  -o table

# Tag the Key Vault for governance
az keyvault update --name $KV_NAME \
  --resource-group $RG_NAME \
  --tags Environment=Production Team=Security DataClassification=Confidential
```

## Task 2: Configure RBAC access control

Assign appropriate Key Vault RBAC roles following the principle of least privilege.

```bash
# Get Key Vault resource ID
KV_ID=$(az keyvault show --name $KV_NAME --query id -o tsv)

# Assign Key Vault Administrator to the security team (full management)
SECURITY_ADMIN_ID=$(az ad user show --id "securityadmin@contoso.com" --query id -o tsv 2>/dev/null || echo "placeholder-id")

az role assignment create \
  --assignee-object-id "$SECURITY_ADMIN_ID" \
  --assignee-principal-type User \
  --role "Key Vault Administrator" \
  --scope $KV_ID

# Assign Key Vault Secrets User to the web application's managed identity
# (read-only access to secrets)
# Replace with actual managed identity principal ID
# az role assignment create \
#   --assignee-object-id "$WEBAPP_IDENTITY" \
#   --assignee-principal-type ServicePrincipal \
#   --role "Key Vault Secrets User" \
#   --scope $KV_ID

# Assign Key Vault Crypto User for encryption operations (wrap/unwrap keys)
# az role assignment create \
#   --assignee-object-id "$ENCRYPTION_SVC_IDENTITY" \
#   --assignee-principal-type ServicePrincipal \
#   --role "Key Vault Crypto User" \
#   --scope $KV_ID

# Assign Key Vault Certificates Officer to DevOps team
# (manage certificates but not secrets or keys)
DEVOPS_GROUP_ID=$(az ad group create \
  --display-name "KeyVault-CertificateOfficers" \
  --mail-nickname "kv-cert-officers" \
  --query id -o tsv)

az role assignment create \
  --assignee-object-id $DEVOPS_GROUP_ID \
  --assignee-principal-type Group \
  --role "Key Vault Certificates Officer" \
  --scope $KV_ID

# List all role assignments on the Key Vault
az role assignment list --scope $KV_ID \
  --query "[].{principal:principalName, role:roleDefinitionName}" -o table
```

## Task 3: Configure Key Vault firewall and network rules

Restrict Key Vault access to specific networks and configure service endpoints.

```bash
# Create a VNet and subnet for the application tier
az network vnet create \
  --name "vnet-contoso-lab" \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --address-prefix "10.0.0.0/16" \
  --subnet-name "snet-app" \
  --subnet-prefixes "10.0.1.0/24"

# Enable Key Vault service endpoint on the subnet
az network vnet subnet update \
  --name "snet-app" \
  --vnet-name "vnet-contoso-lab" \
  --resource-group $RG_NAME \
  --service-endpoints "Microsoft.KeyVault"

# Get the subnet ID
SUBNET_ID=$(az network vnet subnet show \
  --name "snet-app" \
  --vnet-name "vnet-contoso-lab" \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Configure Key Vault firewall - deny by default, allow specific networks
az keyvault update --name $KV_NAME \
  --resource-group $RG_NAME \
  --default-action Deny \
  --bypass AzureServices

# Add the application subnet to allowed networks
az keyvault network-rule add \
  --name $KV_NAME \
  --resource-group $RG_NAME \
  --subnet $SUBNET_ID

# Add specific IP addresses for admin access
az keyvault network-rule add \
  --name $KV_NAME \
  --resource-group $RG_NAME \
  --ip-address "203.0.113.50/32"

# Verify network rules
az keyvault network-rule list --name $KV_NAME \
  --query "{defaultAction:defaultAction, bypass:bypass, ipRules:ipRules[].value, virtualNetworkRules:virtualNetworkRules[].id}" -o json
```

## Task 4: Configure private endpoint for Key Vault

Deploy a private endpoint for fully private connectivity to Key Vault.

```bash
# Create a subnet for private endpoints
az network vnet subnet create \
  --name "snet-private-endpoints" \
  --vnet-name "vnet-contoso-lab" \
  --resource-group $RG_NAME \
  --address-prefixes "10.0.2.0/24"

# Disable network policies on the PE subnet
az network vnet subnet update \
  --name "snet-private-endpoints" \
  --vnet-name "vnet-contoso-lab" \
  --resource-group $RG_NAME \
  --private-endpoint-network-policies Disabled

# Create private endpoint for Key Vault
az network private-endpoint create \
  --name "pe-$KV_NAME" \
  --resource-group $RG_NAME \
  --vnet-name "vnet-contoso-lab" \
  --subnet "snet-private-endpoints" \
  --private-connection-resource-id $KV_ID \
  --group-id vault \
  --connection-name "pec-keyvault"

# Create Private DNS Zone for Key Vault
az network private-dns zone create \
  --name "privatelink.vaultcore.azure.net" \
  --resource-group $RG_NAME

# Link DNS zone to VNet
az network private-dns link vnet create \
  --name "link-keyvault-dns" \
  --resource-group $RG_NAME \
  --zone-name "privatelink.vaultcore.azure.net" \
  --virtual-network "vnet-contoso-lab" \
  --registration-enabled false

# Create DNS records for private endpoint
PE_NIC_ID=$(az network private-endpoint show \
  --name "pe-$KV_NAME" \
  --resource-group $RG_NAME \
  --query "networkInterfaces[0].id" -o tsv)

PE_IP=$(az network nic show --ids $PE_NIC_ID \
  --query "ipConfigurations[0].privateIPAddress" -o tsv)

az network private-dns record-set a add-record \
  --zone-name "privatelink.vaultcore.azure.net" \
  --resource-group $RG_NAME \
  --record-set-name $KV_NAME \
  --ipv4-address $PE_IP

# Disable public access now that private endpoint is configured
az keyvault update --name $KV_NAME \
  --resource-group $RG_NAME \
  --public-network-access Disabled

# Verify private endpoint
az network private-endpoint show \
  --name "pe-$KV_NAME" \
  --resource-group $RG_NAME \
  --query "{state:privateLinkServiceConnections[0].privateLinkServiceConnectionState.status, ip:customDnsConfigs[0].ipAddresses[0]}" -o json
```

## Task 5: Configure diagnostic logging and monitoring

Enable comprehensive audit logging for Key Vault operations and configure alerts.

```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --workspace-name "law-contoso-security" \
  --resource-group $RG_NAME \
  --location $LOCATION

LAW_ID=$(az monitor log-analytics workspace show \
  --workspace-name "law-contoso-security" \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Enable diagnostic settings for Key Vault
az monitor diagnostic-settings create \
  --name "keyvault-audit-logs" \
  --resource $KV_ID \
  --workspace $LAW_ID \
  --logs '[
    {"category": "AuditEvent", "enabled": true, "retentionPolicy": {"enabled": true, "days": 365}},
    {"category": "AzurePolicyEvaluationDetails", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}}
  ]' \
  --metrics '[
    {"category": "AllMetrics", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}}
  ]'

# Create an alert for unauthorized access attempts
az monitor metrics alert create \
  --name "keyvault-unauthorized-access" \
  --resource-group $RG_NAME \
  --scopes $KV_ID \
  --condition "total ServiceApiResult > 0 where StatusCode includes 403" \
  --description "Alert on Key Vault 403 Forbidden responses" \
  --severity 2 \
  --window-size 5m \
  --evaluation-frequency 1m

# Create an alert for Key Vault availability drops
az monitor metrics alert create \
  --name "keyvault-availability" \
  --resource-group $RG_NAME \
  --scopes $KV_ID \
  --condition "avg Availability < 99.9" \
  --description "Alert when Key Vault availability drops below 99.9%" \
  --severity 1 \
  --window-size 15m \
  --evaluation-frequency 5m

# Verify diagnostic settings
az monitor diagnostic-settings show \
  --name "keyvault-audit-logs" \
  --resource $KV_ID
```

## Task 6: Configure Key Vault backup and disaster recovery

Set up backup procedures and prepare for geo-replication scenarios.

```bash
# Create a secondary Key Vault in a paired region for DR
KV_DR_NAME="kv-contoso-dr-$(openssl rand -hex 4)"
az keyvault create \
  --name $KV_DR_NAME \
  --resource-group $RG_NAME \
  --location "centralus" \
  --sku premium \
  --enable-rbac-authorization true \
  --enable-soft-delete true \
  --retention-days 90 \
  --enable-purge-protection true

# Backup a secret from primary vault
az keyvault secret backup \
  --vault-name $KV_NAME \
  --name "DatabaseConnectionString" \
  --file "secret-backup.blob" 2>/dev/null || echo "Secret not yet created - will backup after creation"

# Backup a key from primary vault
# az keyvault key backup --vault-name $KV_NAME --name "encryption-key" --file "key-backup.blob"

# To restore to the DR vault (only works if primary is unavailable/deleted):
# az keyvault secret restore --vault-name $KV_DR_NAME --file "secret-backup.blob"
# az keyvault key restore --vault-name $KV_DR_NAME --file "key-backup.blob"

# List all items for backup inventory
echo "=== Secrets ==="
az keyvault secret list --vault-name $KV_NAME --query "[].{name:name, enabled:attributes.enabled}" -o table
echo "=== Keys ==="
az keyvault key list --vault-name $KV_NAME --query "[].{name:name, enabled:attributes.enabled}" -o table
echo "=== Certificates ==="
az keyvault certificate list --vault-name $KV_NAME --query "[].{name:name, enabled:attributes.enabled}" -o table

# Clean up backup files
rm -f secret-backup.blob key-backup.blob
```

---

## Break & Fix

### Scenario 1: Application cannot access Key Vault after firewall configuration

After enabling the Key Vault firewall, an App Service that was previously accessing secrets successfully now receives "ForbiddenByFirewall" errors.

<details>
<summary>Show solution</summary>

```bash
# Check current firewall rules
az keyvault network-rule list --name $KV_NAME

# The App Service needs to be in an allowed network
# Option 1: Enable "Allow trusted Microsoft services" (if bypass is not set)
az keyvault update --name $KV_NAME \
  --resource-group $RG_NAME \
  --bypass AzureServices

# Option 2: Add the App Service's outbound IPs to the firewall
WEBAPP_IPS=$(az webapp show --name $WEB_APP_NAME --resource-group $RG_NAME \
  --query "outboundIpAddresses" -o tsv 2>/dev/null)

# Add each IP to the firewall
for IP in $(echo $WEBAPP_IPS | tr ',' '\n'); do
  az keyvault network-rule add --name $KV_NAME --ip-address "$IP/32"
done

# Option 3 (preferred): Use VNet integration + service endpoint
# az webapp vnet-integration add --name $WEB_APP_NAME \
#   --resource-group $RG_NAME \
#   --vnet "vnet-contoso-lab" \
#   --subnet "snet-app"

# Option 4 (best): Use private endpoint (configured in Task 4)
# Ensure the App Service is VNet-integrated to reach the private endpoint

# Verify the issue is resolved
az keyvault secret list --vault-name $KV_NAME --query "[].name" -o tsv
```

</details>

### Scenario 2: Cannot delete Key Vault due to purge protection

A test Key Vault with purge protection enabled needs to be removed, but `az keyvault delete` leaves it in a soft-deleted state and `az keyvault purge` fails.

<details>
<summary>Show solution</summary>

```bash
# Check if the vault is soft-deleted
az keyvault list-deleted --query "[?name=='$KV_NAME']" -o table

# Purge protection prevents immediate purging
# If purge protection is enabled, you CANNOT purge before the retention period expires

# Check retention period
az keyvault show-deleted --name $KV_NAME \
  --query "{scheduledPurgeDate:properties.scheduledPurgeDate, deletionDate:properties.deletionDate}" -o json

# If purge protection is NOT enabled, you can purge immediately:
# az keyvault purge --name $KV_NAME

# If purge protection IS enabled (our case), you must wait for retention period
# For testing, the only option is to recover and reuse it:
az keyvault recover --name $KV_NAME

# PREVENTION: For test/dev environments, create Key Vaults WITHOUT purge protection:
az keyvault create \
  --name "kv-contoso-test-$(openssl rand -hex 4)" \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --enable-rbac-authorization true \
  --enable-soft-delete true \
  --retention-days 7 \
  --no-wait

# Note: Once purge protection is enabled, it CANNOT be disabled
# Always use shorter retention-days (minimum 7) for non-production vaults
```

</details>

### Scenario 3: RBAC role assignment not taking effect

A developer has been assigned the "Key Vault Secrets User" role but still gets "Forbidden" when trying to read secrets. The assignment was made 5 minutes ago.

<details>
<summary>Show solution</summary>

```bash
# Verify the role assignment exists and is at the correct scope
DEV_USER_ID=$(az ad user show --id "developer@contoso.com" --query id -o tsv)

az role assignment list \
  --assignee $DEV_USER_ID \
  --scope $KV_ID \
  --query "[].{role:roleDefinitionName, scope:scope}" -o table

# Common issues:
# 1. Assignment is at wrong scope (subscription level won't inherit if denied at vault)
# 2. There's a deny assignment blocking access
az role assignment list --assignee $DEV_USER_ID --all --include-inherited -o table

# 3. The Key Vault is still using access policies, not RBAC
az keyvault show --name $KV_NAME --query "properties.enableRbacAuthorization" -o tsv

# Fix: If RBAC authorization is not enabled, enable it
az keyvault update --name $KV_NAME --enable-rbac-authorization true

# 4. RBAC propagation delay (can take up to 5-10 minutes)
# Wait and retry

# 5. User needs to get a fresh token
# Have the user run: az account clear && az login

# Verify access works
az keyvault secret list --vault-name $KV_NAME --query "[].name" -o tsv
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Which Key Vault SKU is required to use HSM-protected keys?",
    options: [
      "Standard SKU with software-protected keys",
      "Premium SKU with HSM-protected keys",
      "Both Standard and Premium support HSM keys",
      "Managed HSM is the only option for HSM-protected keys"
    ],
    correctIndex: 1,
    explanation: "The Premium SKU supports HSM-protected keys (RSA-HSM, EC-HSM) where the key material is processed within a FIPS 140-2 Level 2 validated HSM. Standard SKU only supports software-protected keys. Managed HSM is a separate service for FIPS 140-2 Level 3 compliance."
  },
  {
    question: "What is the effect of enabling purge protection on an Azure Key Vault?",
    options: [
      "Soft-deleted items can be recovered but never permanently purged until the retention period expires",
      "The Key Vault cannot be deleted",
      "Only Global Administrators can delete secrets",
      "A backup is automatically created before any deletion"
    ],
    correctIndex: 0,
    explanation: "Purge protection prevents permanent deletion of soft-deleted vault items and the vault itself until the retention period expires. This protects against malicious insiders or compromised accounts permanently destroying cryptographic material. Once enabled, it cannot be disabled."
  },
  {
    question: "Contoso wants to ensure Key Vault access is only possible from their Azure VNet. Which combination provides the strongest network isolation?",
    options: [
      "Key Vault firewall with IP allow rules",
      "Private endpoint with public network access disabled",
      "Service endpoints with default deny",
      "Network Security Group on the Key Vault subnet"
    ],
    correctIndex: 1,
    explanation: "A private endpoint assigns a private IP from the VNet to Key Vault, and disabling public network access ensures all traffic flows through the private network. This is stronger than service endpoints (which still traverse Microsoft's backbone) and eliminates any public internet exposure."
  },
  {
    question: "When migrating Key Vault from access policy model to RBAC authorization, what happens to existing access policies?",
    options: [
      "Access policies are automatically converted to RBAC role assignments",
      "Access policies are ignored when RBAC is enabled; new role assignments must be created",
      "Both access policies and RBAC are evaluated simultaneously",
      "The migration fails if any access policies exist"
    ],
    correctIndex: 1,
    explanation: "When RBAC authorization is enabled, existing access policies are completely ignored (not deleted, but not evaluated). All access must be granted through RBAC role assignments. Administrators must create equivalent RBAC assignments before or immediately after enabling RBAC to avoid access disruption."
  }
]} />

## Cleanup

```bash
# Delete the resource group (this removes all resources)
az group delete --name $RG_NAME --yes --no-wait

# Note: Key Vaults with purge protection will remain in soft-deleted state
# They will be automatically purged after the retention period (90 days)

# To check soft-deleted vaults:
# az keyvault list-deleted --query "[].name" -o tsv
```
