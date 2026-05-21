---
sidebar_position: 16
title: "Desafio 16: Defender para Bancos de Dados"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 16: Defender para Bancos de Dados

## Habilidades do exame cobertas

- Habilitar e configurar o Microsoft Defender for Azure SQL
- Habilitar e configurar o Microsoft Defender para bancos de dados relacionais de código aberto
- Habilitar e configurar o Microsoft Defender for Azure Cosmos DB
- Investigar e responder a alertas de segurança de banco de dados
- Configurar avaliação de vulnerabilidades para serviços de banco de dados

## Cenário

A Contoso Ltd opera um ambiente multi-banco de dados com Azure SQL Database para cargas de trabalho transacionais, Azure Database for PostgreSQL para sua plataforma de analytics e Azure Cosmos DB para sua aplicação global de e-commerce. Após uma auditoria de segurança recente revelar que nenhum desses bancos de dados tinha proteção contra ameaças habilitada, o CISO determinou a implantação do Microsoft Defender em todos os serviços de banco de dados. Você deve habilitar o Defender para cada tipo de banco de dados, configurar avaliações de vulnerabilidade e estabelecer procedimentos de resposta a alertas.

---

## Pré-requisitos

- Assinatura Azure com role de Security Admin ou Contributor
- Azure CLI instalado e autenticado (`az login`)
- Entendimento básico dos serviços de banco de dados Azure (SQL, PostgreSQL, Cosmos DB)
- Microsoft Defender for Cloud habilitado

---

## Task 1: Habilitar o Defender for Azure SQL no nível da assinatura

Habilite o Microsoft Defender for Azure SQL para proteger todos os bancos de dados SQL na assinatura.

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
az sql server threat-policy update \
  --server $SQL_SERVER \
  --resource-group $RG \
  --state Enabled \
  --email-addresses "security@contoso.com" \
  --email-account-admins true \
  --retention-days 90

# Verify threat protection status
az sql server threat-policy show \
  --server $SQL_SERVER \
  --resource-group $RG \
  --query "{State:state, EmailAdmins:emailAccountAdmins, RetentionDays:retentionDays}"
```

---

## Task 2: Configurar SQL Vulnerability Assessment

Configure varredura automatizada de avaliação de vulnerabilidades para bancos de dados Azure SQL.

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

## Task 3: Habilitar o Defender para bancos de dados relacionais de código aberto (PostgreSQL)

Implante e proteja um Azure Database for PostgreSQL com o Defender.

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

## Task 4: Habilitar o Defender for Azure Cosmos DB

Configure proteção contra ameaças para contas Cosmos DB.

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
  --enable-public-network true

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

## Task 5: Revisar e gerenciar alertas de segurança de banco de dados

Configure gerenciamento de alertas e fluxos de trabalho de resposta para ameaças de banco de dados.

```bash
# List all security alerts across database resources
az security alert list \
  --resource-group $RG \
  --query "[].{AlertType:alertType, Severity:severity, Status:status, Resource:resourceIdentifiers[0].azureResourceId}" \
  -o table

# Get specific alert types that Defender for Databases detects
echo "=== Tipos de Alerta do Defender for SQL ==="
echo "  - SQL.DB_BruteForce (Brute force login)"
echo "  - SQL.DB_PotentialSqlInjection (SQL Injection)"
echo "  - SQL.DB_DataExfiltration (Anomalous data export)"
echo "  - SQL.DB_UnsafeAction (Potentially unsafe action)"
echo "  - SQL.DB_Login.FromAnAnomalousLocation (Unusual login)"

echo ""
echo "=== Tipos de Alerta do Defender for PostgreSQL ==="
echo "  - PostgreSQL.BruteForce (Brute force attack)"
echo "  - PostgreSQL.Login.FromAnAnomalousCloud (Login from unusual cloud)"
echo "  - PostgreSQL.Login.FromAnAnomalousGeo (Login from unusual geo)"

echo ""
echo "=== Tipos de Alerta do Defender for Cosmos DB ==="
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
  --query "[?pricingTier=='Standard' && contains(name, 'Sql') || contains(name, 'Cosmos') || contains(name, 'OpenSource')].{Plan:name, Tier:pricingTier}" -o table
```

---

## Quebre &amp; Conserte

### Cenário 1: Varredura de Vulnerability Assessment mostra erro "Storage not configured"

Após habilitar a avaliação de vulnerabilidades, as varreduras falham com um erro informando que a storage account não está acessível.

<details>
<summary>Mostrar solução</summary>

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

### Cenário 2: Defender for Cosmos DB não gera alertas para acesso suspeito

O Defender for Cosmos DB foi habilitado mas nenhum alerta é gerado mesmo ao acessar de um navegador Tor (em ambiente de teste).

<details>
<summary>Mostrar solução</summary>

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

### Cenário 3: Emails de Advanced Threat Protection SQL não estão sendo recebidos

A equipe de segurança relata que nunca recebe notificações por email para alertas de ameaças SQL mesmo com o ATP habilitado.

<details>
<summary>Mostrar solução</summary>

```bash
# Check the current threat policy configuration
az sql server threat-policy show \
  --server $SQL_SERVER \
  --resource-group $RG \
  --query "{State:state, Emails:emailAddresses, EmailAdmins:emailAccountAdmins}"

# Fix: Update with correct email addresses and enable admin emails
az sql server threat-policy update \
  --server $SQL_SERVER \
  --resource-group $RG \
  --state Enabled \
  --email-addresses "security@contoso.com;soc@contoso.com" \
  --email-account-admins true

# Also verify that the subscription admin emails are correct
# Check if email is in the correct format (semicolon-separated, no spaces)

# Verify no disabled alert types (all types should be active)
az sql server threat-policy show \
  --server $SQL_SERVER \
  --resource-group $RG \
  --query "disabledAlerts"

# If specific alert types are disabled, clear the disabled list
az sql server threat-policy update \
  --server $SQL_SERVER \
  --resource-group $RG \
  --disabled-alerts ""
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual plano do Microsoft Defender protege o Azure Database for PostgreSQL e o Azure Database for MySQL?",
    options: [
      "Defender for SQL",
      "Defender para bancos de dados relacionais de código aberto",
      "Defender for App Service",
      "Defender for Cosmos DB"
    ],
    correctIndex: 1,
    explanation: "O Microsoft Defender para bancos de dados relacionais de código aberto fornece proteção contra ameaças para Azure Database for PostgreSQL, Azure Database for MySQL e Azure Database for MariaDB. É um plano separado do Defender for SQL."
  },
  {
    question: "Qual é o propósito de definir uma baseline na Azure SQL Vulnerability Assessment?",
    options: [
      "Definir o nível mínimo de segurança necessário para o banco de dados",
      "Marcar descobertas específicas de vulnerabilidade como um estado conhecido aceito que não acionará alertas futuros",
      "Configurar o agendamento de varredura",
      "Configurar remediação automática de vulnerabilidades"
    ],
    correctIndex: 1,
    explanation: "Definir uma baseline na Vulnerability Assessment marca descobertas específicas como um estado aceito. Varreduras futuras alertarão apenas sobre desvios da baseline, reduzindo ruído de configurações conhecidas que foram revisadas e aceitas pela equipe de segurança."
  },
  {
    question: "Qual tipo de alerta do Defender for Cosmos DB indica uma potencial tentativa de exfiltração de dados?",
    options: [
      "CosmosDB_SuspiciousListKeys",
      "CosmosDB_DataExfiltration",
      "CosmosDB_AnonymousAccess",
      "CosmosDB_UnusualActivity"
    ],
    correctIndex: 1,
    explanation: "O alerta CosmosDB_DataExfiltration é acionado quando o Defender detecta uma extração de uma quantidade incomumente grande de dados de uma conta Cosmos DB, indicando uma potencial tentativa de exfiltração de dados."
  },
  {
    question: "Ao habilitar o Defender for Azure SQL, qual configuração adicional é necessária para a Vulnerability Assessment armazenar resultados de varredura?",
    options: [
      "Um Azure Key Vault com chaves de criptografia",
      "Uma storage account com permissões de acesso apropriadas",
      "Um namespace do Event Hub para streaming de resultados",
      "Um workspace do Log Analytics com a solução SecurityBaseline"
    ],
    correctIndex: 1,
    explanation: "A Azure SQL Vulnerability Assessment requer uma storage account para armazenar resultados de varredura, baselines e histórico de varreduras. A identidade gerenciada do SQL Server precisa da role Storage Blob Data Contributor na storage account."
  }
]} />

## Limpeza

```bash
# Delete all resources
az group delete --name $RG --yes --no-wait

# Optionally disable Defender plans to stop billing
az security pricing create --name SqlServers --tier Free
az security pricing create --name OpenSourceRelationalDatabases --tier Free
az security pricing create --name CosmosDbs --tier Free
az security pricing create --name SqlServerVirtualMachines --tier Free
```
