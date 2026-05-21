---
sidebar_position: 15
title: "Challenge 15: Azure SQL Security"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 15: Azure SQL Security

## Exam skills covered

- Plan and implement platform-level security for Azure SQL Database
- Configure Transparent Data Encryption (TDE) with customer-managed keys
- Configure Azure SQL auditing and threat detection
- Implement dynamic data masking for sensitive columns
- Configure Azure SQL firewall rules and virtual network integration
- Implement Microsoft Entra authentication for Azure SQL

## Scenario

Contoso Ltd is migrating their on-premises SQL Server databases to Azure SQL Database. The databases contain employee records, financial transactions, and customer PII. The compliance team requires that all data be encrypted with customer-managed keys, access be restricted to specific networks, all database operations be audited, and sensitive fields be masked for non-privileged users. As the security engineer, you must implement a comprehensive security posture for the Azure SQL environment.

---

## Prerequisites

- Azure subscription with Contributor role
- Azure CLI installed and authenticated (`az login`)
- Azure Key Vault (or willingness to create one)
- Microsoft Entra ID (Azure AD) tenant with admin access

---

## Task 1: Deploy Azure SQL with secure configuration

Create an Azure SQL server and database with security best practices from the start.

```bash
# Set variables
RG="rg-sc500-sql-security"
LOCATION="eastus"
SQL_SERVER="sql-sc500-contoso-$(openssl rand -hex 4)"
SQL_DB="sqldb-contoso-hr"
SQL_ADMIN="sqladmincontoso"
SQL_PASSWORD="P@ssw0rd$(openssl rand -hex 4)!"

# Create resource group
az group create --name $RG --location $LOCATION

# Create SQL Server with minimal attack surface
az sql server create \
  --name $SQL_SERVER \
  --resource-group $RG \
  --location $LOCATION \
  --admin-user $SQL_ADMIN \
  --admin-password $SQL_PASSWORD \
  --public-network-access Disabled \
  --minimal-tls-version 1.2

# Create SQL Database
az sql db create \
  --name $SQL_DB \
  --server $SQL_SERVER \
  --resource-group $RG \
  --edition Standard \
  --capacity 10 \
  --max-size 10GB

# Disable public network access (enforce private endpoints only)
az sql server update \
  --name $SQL_SERVER \
  --resource-group $RG \
  --set publicNetworkAccess="Disabled"

# Verify settings
az sql server show \
  --name $SQL_SERVER \
  --resource-group $RG \
  --query "{Name:name, MinTls:minimalTlsVersion, PublicAccess:publicNetworkAccess, State:state}"
```

---

## Task 2: Configure Microsoft Entra authentication

Set up Microsoft Entra ID as the authentication provider and configure an Entra admin.

```bash
# Enable public access temporarily for configuration (or use private endpoint)
az sql server update \
  --name $SQL_SERVER \
  --resource-group $RG \
  --set publicNetworkAccess="Enabled"

# Get current user info for Entra admin
CURRENT_USER_ID=$(az ad signed-in-user show --query id -o tsv)
CURRENT_USER_UPN=$(az ad signed-in-user show --query userPrincipalName -o tsv)

# Set Microsoft Entra admin for the SQL server
az sql server ad-admin create \
  --server $SQL_SERVER \
  --resource-group $RG \
  --display-name "SQL Entra Admin" \
  --object-id $CURRENT_USER_ID

# Enable Azure AD-only authentication (disable SQL auth)
az sql server ad-only-auth enable \
  --server $SQL_SERVER \
  --resource-group $RG

# Verify Entra-only authentication is enabled
az sql server ad-only-auth get \
  --server $SQL_SERVER \
  --resource-group $RG

# Create a firewall rule to allow current IP for testing
MY_IP=$(curl -s ifconfig.me)
az sql server firewall-rule create \
  --server $SQL_SERVER \
  --resource-group $RG \
  --name "AllowMyIP" \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP
```

---

## Task 3: Configure Transparent Data Encryption with customer-managed keys

Set up TDE with a customer-managed key stored in Azure Key Vault.

```bash
# Create Key Vault for TDE key
KV_NAME="kv-sc500-sqltde-$(openssl rand -hex 4)"
az keyvault create \
  --name $KV_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --enable-purge-protection true \
  --retention-days 90

# Create RSA key for TDE
az keyvault key create \
  --vault-name $KV_NAME \
  --name "sql-tde-key" \
  --kty RSA \
  --size 2048

# Get the key URI (with version)
KEY_URI=$(az keyvault key show \
  --vault-name $KV_NAME \
  --name "sql-tde-key" \
  --query "key.kid" -o tsv)

# Assign managed identity to SQL Server
az sql server update \
  --name $SQL_SERVER \
  --resource-group $RG \
  --assign-identity

# Get SQL Server identity
SQL_IDENTITY=$(az sql server show \
  --name $SQL_SERVER \
  --resource-group $RG \
  --query "identity.principalId" -o tsv)

# Grant Key Vault permissions to SQL Server
az keyvault set-policy \
  --name $KV_NAME \
  --object-id $SQL_IDENTITY \
  --key-permissions get wrapKey unwrapKey list

# Configure TDE with customer-managed key
az sql server tde-key set \
  --server $SQL_SERVER \
  --resource-group $RG \
  --server-key-type AzureKeyVault \
  --kid $KEY_URI

# Verify TDE encryption on the database
az sql db tde show \
  --database $SQL_DB \
  --server $SQL_SERVER \
  --resource-group $RG

# Verify the TDE protector
az sql server tde-key show \
  --server $SQL_SERVER \
  --resource-group $RG \
  --query "{Type:serverKeyType, Uri:uri, Thumbprint:thumbprint}"
```

---

## Task 4: Configure SQL auditing and Advanced Threat Protection

Enable comprehensive auditing and threat detection for security monitoring.

```bash
# Create storage account for audit logs
AUDIT_STORAGE="staudit$(openssl rand -hex 4)"
az storage account create \
  --name $AUDIT_STORAGE \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS

# Create Log Analytics workspace
WORKSPACE_NAME="law-sc500-sql"
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --location $LOCATION

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --query id -o tsv)

# Enable server-level auditing to Log Analytics
az sql server audit-policy update \
  --server $SQL_SERVER \
  --resource-group $RG \
  --state Enabled \
  --lats Enabled \
  --lawri $WORKSPACE_ID

# Enable database-level auditing with additional actions
az sql db audit-policy update \
  --database $SQL_DB \
  --server $SQL_SERVER \
  --resource-group $RG \
  --state Enabled \
  --lats Enabled \
  --lawri $WORKSPACE_ID \
  --actions "DATABASE_PRINCIPAL_CHANGE_GROUP" \
            "SCHEMA_OBJECT_ACCESS_GROUP" \
            "DATABASE_OBJECT_CHANGE_GROUP" \
            "BACKUP_RESTORE_GROUP" \
            "BATCH_COMPLETED_GROUP"

# Enable Advanced Threat Protection (ATP)
az sql server advanced-threat-protection-setting update \
  --server $SQL_SERVER \
  --resource-group $RG \
  --state Enabled

# Configure security contact for ATP email notifications
# (managed through Microsoft Defender for Cloud, not per-server)
az security contact create \
  --name "default" \
  --emails "security@contoso.com" \
  --alert-notifications '{"state":"On","minimalSeverity":"Medium"}' \
  --notifications-by-role '{"state":"On","roles":["Owner"]}'

# Enable Vulnerability Assessment
az sql server va-setting update \
  --server $SQL_SERVER \
  --resource-group $RG \
  --storage-account $AUDIT_STORAGE \
  --email-subscription-admins true \
  --recurring-scans true

# Verify auditing configuration
az sql server audit-policy show \
  --server $SQL_SERVER \
  --resource-group $RG \
  --query "{State:state, LogAnalytics:isAzureMonitorTargetEnabled}"
```

---

## Task 5: Configure dynamic data masking

Apply data masking to protect sensitive columns from non-privileged users.

```bash
# Note: Dynamic data masking is configured at the database level
# These commands set masking rules on specific columns

# Add masking rule for email column (email masking function)
az sql db data-masking rule create \
  --database $SQL_DB \
  --server $SQL_SERVER \
  --resource-group $RG \
  --schema "dbo" \
  --table "Employees" \
  --column "Email" \
  --masking-function "Email" \
  --rule-id "EmailMask"

# Add masking rule for SSN (partial masking showing last 4 digits)
az sql db data-masking rule create \
  --database $SQL_DB \
  --server $SQL_SERVER \
  --resource-group $RG \
  --schema "dbo" \
  --table "Employees" \
  --column "SSN" \
  --masking-function "Text" \
  --prefix-size 0 \
  --suffix-size 4 \
  --replacement-string "XXX-XX-" \
  --rule-id "SSNMask"

# Add masking rule for salary (number masking)
az sql db data-masking rule create \
  --database $SQL_DB \
  --server $SQL_SERVER \
  --resource-group $RG \
  --schema "dbo" \
  --table "Employees" \
  --column "Salary" \
  --masking-function "Number" \
  --number-from 0 \
  --number-to 0 \
  --rule-id "SalaryMask"

# Enable data masking policy
az sql db data-masking policy update \
  --database $SQL_DB \
  --server $SQL_SERVER \
  --resource-group $RG \
  --state Enabled

# List all masking rules
az sql db data-masking rule list \
  --database $SQL_DB \
  --server $SQL_SERVER \
  --resource-group $RG \
  -o table
```

---

## Task 6: Configure network isolation with virtual network rules

Set up virtual network service endpoints and private endpoint for the SQL server.

```bash
# Create virtual network with subnet for SQL access
az network vnet create \
  --name vnet-contoso-sql \
  --resource-group $RG \
  --location $LOCATION \
  --address-prefix 10.1.0.0/16 \
  --subnet-name snet-app \
  --subnet-prefix 10.1.1.0/24

# Enable Microsoft.Sql service endpoint
az network vnet subnet update \
  --name snet-app \
  --vnet-name vnet-contoso-sql \
  --resource-group $RG \
  --service-endpoints Microsoft.Sql

# Add virtual network rule
az sql server vnet-rule create \
  --server $SQL_SERVER \
  --resource-group $RG \
  --name "allow-app-subnet" \
  --vnet-name vnet-contoso-sql \
  --subnet snet-app

# Create private endpoint subnet
az network vnet subnet create \
  --name snet-private-endpoint \
  --vnet-name vnet-contoso-sql \
  --resource-group $RG \
  --address-prefix 10.1.2.0/24

# Create private endpoint for SQL Server
SQL_SERVER_ID=$(az sql server show \
  --name $SQL_SERVER \
  --resource-group $RG \
  --query id -o tsv)

az network private-endpoint create \
  --name pe-sql-contoso \
  --resource-group $RG \
  --location $LOCATION \
  --vnet-name vnet-contoso-sql \
  --subnet snet-private-endpoint \
  --connection-name pe-sql-connection \
  --private-connection-resource-id $SQL_SERVER_ID \
  --group-ids sqlServer

# Disable public network access after private endpoint is configured
az sql server update \
  --name $SQL_SERVER \
  --resource-group $RG \
  --set publicNetworkAccess="Disabled"

# Verify private endpoint connection
az network private-endpoint show \
  --name pe-sql-contoso \
  --resource-group $RG \
  --query "{Name:name, Status:privateLinkServiceConnections[0].privateLinkServiceConnectionState.status}"
```

---

## Break & Fix

### Scenario 1: TDE key rotation fails with "Access Denied"

After a Key Vault access policy change, the SQL Server can no longer access the TDE key. The database becomes inaccessible with a "The server key is not available" error.

<details>
<summary>Show solution</summary>

```bash
# Get the SQL Server managed identity
SQL_IDENTITY=$(az sql server show \
  --name $SQL_SERVER \
  --resource-group $RG \
  --query "identity.principalId" -o tsv)

# Re-grant Key Vault permissions
az keyvault set-policy \
  --name $KV_NAME \
  --object-id $SQL_IDENTITY \
  --key-permissions get wrapKey unwrapKey list

# If the key was deleted, restore it
az keyvault key recover \
  --vault-name $KV_NAME \
  --name "sql-tde-key" 2>/dev/null

# Verify the TDE protector is accessible
az sql server tde-key show \
  --server $SQL_SERVER \
  --resource-group $RG
```

</details>

### Scenario 2: Application cannot connect after enabling Entra-only authentication

After enabling Azure AD-only authentication, a legacy application using SQL authentication cannot connect to the database.

<details>
<summary>Show solution</summary>

```bash
# Check if Entra-only auth is enabled
az sql server ad-only-auth get \
  --server $SQL_SERVER \
  --resource-group $RG

# Option 1: Disable Entra-only to allow SQL auth (temporary)
az sql server ad-only-auth disable \
  --server $SQL_SERVER \
  --resource-group $RG

# Option 2 (recommended): Migrate the application to use Entra authentication
# Create a managed identity for the app and grant database access
# In SQL: CREATE USER [app-identity] FROM EXTERNAL PROVIDER;
#          ALTER ROLE db_datareader ADD MEMBER [app-identity];

# After app migration, re-enable Entra-only
az sql server ad-only-auth enable \
  --server $SQL_SERVER \
  --resource-group $RG
```

</details>

### Scenario 3: Auditing logs not appearing in Log Analytics

SQL auditing was enabled but no audit logs appear in the Log Analytics workspace after 24 hours.

<details>
<summary>Show solution</summary>

```bash
# Check if auditing is properly configured
az sql server audit-policy show \
  --server $SQL_SERVER \
  --resource-group $RG

# Verify Log Analytics workspace target is enabled
az sql server audit-policy show \
  --server $SQL_SERVER \
  --resource-group $RG \
  --query "{State:state, LAEnabled:isAzureMonitorTargetEnabled, WorkspaceId:workspaceResourceId}"

# Re-enable with explicit workspace
az sql server audit-policy update \
  --server $SQL_SERVER \
  --resource-group $RG \
  --state Enabled \
  --lats Enabled \
  --lawri $WORKSPACE_ID

# Verify the diagnostic setting exists on the database
az monitor diagnostic-settings list \
  --resource "$SQL_SERVER_ID/databases/$SQL_DB"

# Ensure there is actual activity generating audit logs
# Empty databases with no queries won't produce logs
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the primary difference between server-level and database-level auditing in Azure SQL?",
    options: [
      "Server-level auditing only captures login events while database-level captures all events",
      "Server-level auditing applies to all databases on the server; database-level provides granular action group selection per database",
      "Database-level auditing is more expensive than server-level",
      "Server-level auditing requires a premium SKU"
    ],
    correctIndex: 1,
    explanation: "Server-level auditing applies a policy to all databases on the SQL server, while database-level auditing allows you to configure specific audit action groups for individual databases, providing more granular control over what is captured."
  },
  {
    question: "When Transparent Data Encryption (TDE) is configured with a customer-managed key and the key becomes inaccessible, what happens to the database?",
    options: [
      "The database falls back to Microsoft-managed encryption",
      "The database becomes inaccessible and is eventually set to 'Inaccessible' state after approximately 24 hours",
      "Only write operations are blocked; reads continue to work",
      "The database is automatically deleted after 48 hours"
    ],
    correctIndex: 1,
    explanation: "If the TDE protector key becomes inaccessible (deleted, expired, or permissions revoked), the database becomes inaccessible. After approximately 24 hours, Azure SQL marks the database as 'Inaccessible'. The database is not deleted and can be recovered by restoring key access."
  },
  {
    question: "Which Azure SQL feature allows you to hide sensitive data from non-privileged users without modifying application queries?",
    options: [
      "Always Encrypted",
      "Transparent Data Encryption",
      "Dynamic Data Masking",
      "Row-Level Security"
    ],
    correctIndex: 2,
    explanation: "Dynamic Data Masking (DDM) hides sensitive data in query results by applying masking functions to designated columns. Non-privileged users see masked data while the actual data remains unchanged in the database. No application changes are required."
  },
  {
    question: "What is the recommended approach to disable SQL authentication entirely on an Azure SQL server?",
    options: [
      "Delete the SQL admin account",
      "Enable Microsoft Entra-only authentication",
      "Set a blank password on the SQL admin",
      "Remove all SQL firewall rules"
    ],
    correctIndex: 1,
    explanation: "Enabling Microsoft Entra-only authentication (Azure AD-only auth) disables SQL authentication completely. All connections must use Microsoft Entra tokens. This is the most secure approach as it eliminates password-based SQL logins."
  }
]} />

## Cleanup

```bash
# Delete the resource group and all resources
az group delete --name $RG --yes --no-wait

# Purge Key Vault
az keyvault purge --name $KV_NAME --no-wait
```
