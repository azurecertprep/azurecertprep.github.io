---
sidebar_position: 16
title: "Challenge 16: Defender for Databases"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 16: Defender for Databases

## Exam skills covered

- Enable and configure Microsoft Defender for Azure SQL
- Enable and configure Microsoft Defender for open-source relational databases
- Enable and configure Microsoft Defender for Azure Cosmos DB
- Investigate and respond to database security alerts
- Configure vulnerability assessment for database services

## Scenario

Contoso Ltd operates a multi-database environment with Azure SQL Database for transactional workloads, Azure Database for PostgreSQL for their analytics platform, and Azure Cosmos DB for their global e-commerce application. After a recent security audit revealed that none of these databases had threat protection enabled, the CISO mandated the deployment of Microsoft Defender across all database services. You must enable Defender for each database type, configure vulnerability assessments, and establish alert response procedures.

---

## Prerequisites

- Azure subscription with Security Admin or Contributor role
- Azure CLI installed and authenticated (`az login`)
- Basic understanding of Azure database services (SQL, PostgreSQL, Cosmos DB)
- Microsoft Defender for Cloud enabled

---

## Task 1: Enable Defender for Azure SQL at subscription level

Enable Microsoft Defender for Azure SQL to protect all SQL databases in the subscription.

```bash
# Set variables
RG="rg-sc500-defender-db"
LOCATION="eastus"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create resource group
az group create --name $RG --location $LOCATION

# Enable Defender for Azure SQL (covers SQL DB and Managed Instance)
az security pricing create \
  --name SqlServers \
  --tier Standard

# Enable Defender for SQL on VMs (covers SQL Server on IaaS)
az security pricing create \
  --name SqlServerVirtualMachines \
  --tier Standard

# Verify Defender pricing tiers
az security pricing list \
  --query "[?contains(name, 'Sql')].{Name:name, Tier:pricingTier}" -o table

# Create a SQL Server for testing
SQL_SERVER="sql-defender-$(openssl rand -hex 4)"
SQL_ADMIN="sqladmin"
SQL_PASSWORD="D3fender!$(openssl rand -hex 4)"

az sql server create \
  --name $SQL_SERVER \
  --resource-group $RG \
  --location $LOCATION \
  --admin-user $SQL_ADMIN \
  --admin-password $SQL_PASSWORD

# Create a database
az sql db create \
  --name "sqldb-contoso-app" \
  --server $SQL_SERVER \
  --resource-group $RG \
  --edition Standard \
  --capacity 10

# Enable Advanced Threat Protection on the server
az sql server advanced-threat-protection-setting update \
  --resource-group $RG \
  --server $SQL_SERVER \
  --state Enabled

# Verify threat protection status
az sql server advanced-threat-protection-setting show \
  --server $SQL_SERVER \
  --resource-group $RG \
  --query "{State:state}"
```

---

## Task 2: Configure SQL Vulnerability Assessment

Set up automated vulnerability assessment scanning for Azure SQL databases.

```bash
# Create storage account for vulnerability assessment results
VA_STORAGE="stva$(openssl rand -hex 4)"
az storage account create \
  --name $VA_STORAGE \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS

# Enable vulnerability assessment on the SQL server
az sql server va-setting update \
  --server $SQL_SERVER \
  --resource-group $RG \
  --storage-account $VA_STORAGE \
  --email-subscription-admins true \
  --recurring-scans true

# Verify VA settings
az sql server va-setting show \
  --server $SQL_SERVER \
  --resource-group $RG \
  --query "{RecurringScans:recurringScans, StorageContainerPath:storageContainerPath}"

# Run an on-demand vulnerability assessment scan on the database
az sql db va-scan execute \
  --database "sqldb-contoso-app" \
  --server $SQL_SERVER \
  --resource-group $RG

# List scan results
az sql db va-scan list \
  --database "sqldb-contoso-app" \
  --server $SQL_SERVER \
  --resource-group $RG \
  -o table

# Set a baseline for a specific vulnerability rule (acknowledge known state)
# First, get scan results
SCAN_ID=$(az sql db va-scan list \
  --database "sqldb-contoso-app" \
  --server $SQL_SERVER \
  --resource-group $RG \
  --query "[0].scanId" -o tsv)

echo "Latest scan ID: $SCAN_ID"
```

---

## Task 3: Enable Defender for open-source relational databases (PostgreSQL)

Deploy and protect an Azure Database for PostgreSQL with Defender.

```bash
# Enable Defender for open-source relational databases
az security pricing create \
  --name OpenSourceRelationalDatabases \
  --tier Standard

# Verify pricing tier
az security pricing show \
  --name OpenSourceRelationalDatabases \
  --query "{Name:name, Tier:pricingTier}"

# Create Azure Database for PostgreSQL Flexible Server
PG_SERVER="pg-defender-$(openssl rand -hex 4)"
PG_ADMIN="pgadmin"
PG_PASSWORD="D3fender!$(openssl rand -hex 4)"

az postgres flexible-server create \
  --name $PG_SERVER \
  --resource-group $RG \
  --location $LOCATION \
  --admin-user $PG_ADMIN \
  --admin-password $PG_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --public-access 0.0.0.0

# Enable Advanced Threat Protection on PostgreSQL
az postgres flexible-server parameter set \
  --server-name $PG_SERVER \
  --resource-group $RG \
  --name pgms_wait_sampling.query_capture_mode \
  --value all

# Configure diagnostic settings for PostgreSQL
PG_SERVER_ID=$(az postgres flexible-server show \
  --name $PG_SERVER \
  --resource-group $RG \
  --query id -o tsv)

# Create Log Analytics workspace
WORKSPACE_NAME="law-sc500-defender-db"
az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --location $LOCATION

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG \
  --query id -o tsv)

# Enable diagnostic settings
az monitor diagnostic-settings create \
  --name "pg-security-diagnostics" \
  --resource $PG_SERVER_ID \
  --workspace $WORKSPACE_ID \
  --logs '[{"category": "PostgreSQLLogs", "enabled": true}]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

---

## Task 4: Enable Defender for Azure Cosmos DB

Configure threat protection for Cosmos DB accounts.

```bash
# Enable Defender for Cosmos DB
az security pricing create \
  --name CosmosDbs \
  --tier Standard

# Verify pricing tier
az security pricing show \
  --name CosmosDbs \
  --query "{Name:name, Tier:pricingTier}"

# Create a Cosmos DB account for testing
COSMOS_ACCOUNT="cosmos-defender-$(openssl rand -hex 4)"
az cosmosdb create \
  --name $COSMOS_ACCOUNT \
  --resource-group $RG \
  --locations regionName=$LOCATION failoverPriority=0 \
  --default-consistency-level Session \
  --kind GlobalDocumentDB \
  --public-network-access ENABLED

# Disable key-based metadata access (security hardening)
az cosmosdb update \
  --name $COSMOS_ACCOUNT \
  --resource-group $RG \
  --disable-key-based-metadata-write-access true

# Configure diagnostic settings for Cosmos DB
COSMOS_ID=$(az cosmosdb show \
  --name $COSMOS_ACCOUNT \
  --resource-group $RG \
  --query id -o tsv)

az monitor diagnostic-settings create \
  --name "cosmos-security-diagnostics" \
  --resource $COSMOS_ID \
  --workspace $WORKSPACE_ID \
  --logs '[{"category": "DataPlaneRequests", "enabled": true}, {"category": "QueryRuntimeStatistics", "enabled": true}, {"category": "ControlPlaneRequests", "enabled": true}]'

# Configure IP firewall for Cosmos DB
az cosmosdb update \
  --name $COSMOS_ACCOUNT \
  --resource-group $RG \
  --ip-range-filter "203.0.113.0/24,104.42.195.92"

# Verify Cosmos DB security settings
az cosmosdb show \
  --name $COSMOS_ACCOUNT \
  --resource-group $RG \
  --query "{Name:name, DisableKeyWrite:disableKeyBasedMetadataWriteAccess, IpRules:ipRules[].ipAddressOrRange, PublicNetwork:publicNetworkAccess}"
```

---

## Task 5: Review and manage database security alerts

Configure alert management and response workflows for database threats.

```bash
# List all security alerts across database resources
az security alert list \
  --resource-group $RG \
  --query "[].{AlertType:alertType, Severity:severity, Status:status, Resource:resourceIdentifiers[0].azureResourceId}" \
  -o table

# Get specific alert types that Defender for Databases detects
echo "=== Defender for SQL Alert Types ==="
echo "  - SQL.DB_BruteForce (Brute force login)"
echo "  - SQL.DB_PotentialSqlInjection (SQL Injection)"
echo "  - SQL.DB_DataExfiltration (Anomalous data export)"
echo "  - SQL.DB_UnsafeAction (Potentially unsafe action)"
echo "  - SQL.DB_Login.FromAnAnomalousLocation (Unusual login)"

echo ""
echo "=== Defender for PostgreSQL Alert Types ==="
echo "  - PostgreSQL.BruteForce (Brute force attack)"
echo "  - PostgreSQL.Login.FromAnAnomalousCloud (Login from unusual cloud)"
echo "  - PostgreSQL.Login.FromAnAnomalousGeo (Login from unusual geo)"

echo ""
echo "=== Defender for Cosmos DB Alert Types ==="
echo "  - CosmosDB_DataExfiltration (Data exfiltration)"
echo "  - CosmosDB_SuspiciousListKeys (Suspicious key listing)"
echo "  - CosmosDB_AnonymousAccess (Access from Tor)"

# Configure workflow automation for critical alerts
az security automation create \
  --name "db-critical-alert-automation" \
  --resource-group $RG \
  --location $LOCATION \
  --scopes "[{\"description\":\"Full subscription\",\"scopePath\":\"/subscriptions/$SUBSCRIPTION_ID\"}]" \
  --sources "[{\"eventSource\":\"Alerts\",\"ruleSets\":[{\"rules\":[{\"propertyJPath\":\"Severity\",\"propertyType\":\"String\",\"expectedValue\":\"High\",\"operator\":\"Equals\"}]}]}]" \
  --actions "[{\"actionType\":\"EventHub\",\"eventHubResourceId\":\"/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.EventHub/namespaces/placeholder/eventhubs/alerts\",\"connectionString\":\"placeholder\"}]"

# Verify all Defender plans are enabled
az security pricing list \
  --query "[?pricingTier=='Standard' && (contains(name, 'Sql') || contains(name, 'Cosmos') || contains(name, 'OpenSource'))].{Plan:name, Tier:pricingTier}" -o table
```

---

## Break & Fix

### Scenario 1: Vulnerability Assessment scan shows "Storage not configured" error

After enabling vulnerability assessment, scans fail with an error stating that the storage account is not accessible.

<details>
<summary>Show solution</summary>

```bash
# Check VA settings
az sql server va-setting show \
  --server $SQL_SERVER \
  --resource-group $RG

# The issue is likely that the storage account firewall blocks access
# or the SQL Server doesn't have permissions

# Option 1: Grant SQL Server managed identity access to storage
SQL_IDENTITY=$(az sql server show \
  --name $SQL_SERVER \
  --resource-group $RG \
  --query "identity.principalId" -o tsv)

# If identity is null, assign one
if [ -z "$SQL_IDENTITY" ]; then
  az sql server update \
    --name $SQL_SERVER \
    --resource-group $RG \
    --assign-identity
  SQL_IDENTITY=$(az sql server show \
    --name $SQL_SERVER \
    --resource-group $RG \
    --query "identity.principalId" -o tsv)
fi

# Assign Storage Blob Data Contributor role
az role assignment create \
  --assignee-object-id $SQL_IDENTITY \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$VA_STORAGE"

# Re-configure VA settings
az sql server va-setting update \
  --server $SQL_SERVER \
  --resource-group $RG \
  --storage-account $VA_STORAGE \
  --recurring-scans true
```

</details>

### Scenario 2: Defender for Cosmos DB not generating alerts for suspicious access

Defender for Cosmos DB was enabled but no alerts are generated even when accessing from a Tor browser (in a test environment).

<details>
<summary>Show solution</summary>

```bash
# Verify Defender for Cosmos DB is enabled at subscription level
az security pricing show --name CosmosDbs

# If tier is "Free", enable it
az security pricing create \
  --name CosmosDbs \
  --tier Standard

# Ensure diagnostic logging is enabled (required for full alert coverage)
az monitor diagnostic-settings list \
  --resource $COSMOS_ID

# If no diagnostics are configured, add them
az monitor diagnostic-settings create \
  --name "cosmos-security-diagnostics" \
  --resource $COSMOS_ID \
  --workspace $WORKSPACE_ID \
  --logs '[{"category": "DataPlaneRequests", "enabled": true}, {"category": "ControlPlaneRequests", "enabled": true}]'

# Note: Defender for Cosmos DB alerts may take up to 24 hours
# to appear after first enabling the service.
# The detection engine needs time to establish baseline patterns.
```

</details>

### Scenario 3: SQL Advanced Threat Protection emails not being received

The security team reports they never receive email notifications for SQL threat alerts even though ATP is enabled.

<details>
<summary>Show solution</summary>

```bash
# Check the current advanced threat protection configuration
az sql server advanced-threat-protection-setting show \
  --server $SQL_SERVER \
  --resource-group $RG \
  --query "{State:state}"

# Fix: Enable advanced threat protection
az sql server advanced-threat-protection-setting update \
  --resource-group $RG \
  --server $SQL_SERVER \
  --state Enabled

# Also verify that the subscription admin emails are correct
# Check if email is in the correct format (semicolon-separated, no spaces)

# Verify threat protection is enabled
az sql server advanced-threat-protection-setting show \
  --server $SQL_SERVER \
  --resource-group $RG \
  --query "{State:state}"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Which Microsoft Defender plan protects Azure Database for PostgreSQL and Azure Database for MySQL?",
    options: [
      "Defender for SQL",
      "Defender for open-source relational databases",
      "Defender for App Service",
      "Defender for Cosmos DB"
    ],
    correctIndex: 1,
    explanation: "Microsoft Defender for open-source relational databases provides threat protection for Azure Database for PostgreSQL, Azure Database for MySQL, and Azure Database for MariaDB. It is a separate plan from Defender for SQL."
  },
  {
    question: "What is the purpose of setting a baseline in Azure SQL Vulnerability Assessment?",
    options: [
      "To define the minimum required security level for the database",
      "To mark specific vulnerability findings as an accepted known state that won't trigger future alerts",
      "To configure the scanning schedule",
      "To set up automatic remediation of vulnerabilities"
    ],
    correctIndex: 1,
    explanation: "Setting a baseline in Vulnerability Assessment marks specific findings as an accepted state. Future scans will only alert on deviations from the baseline, reducing noise from known configurations that have been reviewed and accepted by the security team."
  },
  {
    question: "Which Defender for Cosmos DB alert type indicates a potential data exfiltration attempt?",
    options: [
      "CosmosDB_SuspiciousListKeys",
      "CosmosDB_DataExfiltration",
      "CosmosDB_AnonymousAccess",
      "CosmosDB_UnusualActivity"
    ],
    correctIndex: 1,
    explanation: "The CosmosDB_DataExfiltration alert is triggered when Defender detects an extraction of an unusually large amount of data from a Cosmos DB account, indicating a potential data exfiltration attempt."
  },
  {
    question: "When enabling Defender for Azure SQL, what additional configuration is required for Vulnerability Assessment to store scan results?",
    options: [
      "An Azure Key Vault with encryption keys",
      "A storage account with appropriate access permissions",
      "An Event Hub namespace for streaming results",
      "A Log Analytics workspace with the SecurityBaseline solution"
    ],
    correctIndex: 1,
    explanation: "Azure SQL Vulnerability Assessment requires a storage account to store scan results, baselines, and scan history. The SQL Server's managed identity needs Storage Blob Data Contributor role on the storage account."
  }
]} />

## Cleanup

```bash
# Delete all resources
az group delete --name $RG --yes --no-wait

# Optionally disable Defender plans to stop billing
az security pricing create --name SqlServers --tier Free
az security pricing create --name OpenSourceRelationalDatabases --tier Free
az security pricing create --name CosmosDbs --tier Free
az security pricing create --name SqlServerVirtualMachines --tier Free
```
