---
sidebar_position: 15
title: "Desafio 15: Segurança do Azure SQL"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 15: Segurança do Azure SQL

## Habilidades do exame cobertas

- Planejar e implementar segurança em nível de plataforma para Azure SQL Database
- Configurar Transparent Data Encryption (TDE) com chaves gerenciadas pelo cliente
- Configurar auditoria e detecção de ameaças do Azure SQL
- Implementar mascaramento dinâmico de dados para colunas sensíveis
- Configurar regras de firewall e integração de rede virtual do Azure SQL
- Implementar autenticação Microsoft Entra para Azure SQL

## Cenário

A Contoso Ltd está migrando seus bancos de dados SQL Server on-premises para o Azure SQL Database. Os bancos de dados contêm registros de funcionários, transações financeiras e PII de clientes. A equipe de conformidade requer que todos os dados sejam criptografados com chaves gerenciadas pelo cliente, o acesso seja restrito a redes específicas, todas as operações de banco de dados sejam auditadas e campos sensíveis sejam mascarados para usuários não privilegiados. Como engenheiro de segurança, você deve implementar uma postura de segurança abrangente para o ambiente Azure SQL.

---

## Pré-requisitos

- Assinatura Azure com role de Contributor
- Azure CLI instalado e autenticado (`az login`)
- Azure Key Vault (ou disposição para criar um)
- Tenant Microsoft Entra ID (Azure AD) com acesso de administrador

---

## Task 1: Implantar Azure SQL com configuração segura

Crie um servidor e banco de dados Azure SQL com melhores práticas de segurança desde o início.

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
  --enable-public-network false \
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

## Task 2: Configurar autenticação Microsoft Entra

Configure o Microsoft Entra ID como provedor de autenticação e configure um administrador Entra.

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

## Task 3: Configurar Transparent Data Encryption com chaves gerenciadas pelo cliente

Configure o TDE com uma chave gerenciada pelo cliente armazenada no Azure Key Vault.

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

## Task 4: Configurar auditoria SQL e Advanced Threat Protection

Habilite auditoria abrangente e detecção de ameaças para monitoramento de segurança.

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
az sql server threat-policy update \
  --server $SQL_SERVER \
  --resource-group $RG \
  --state Enabled \
  --email-addresses "security@contoso.com" \
  --email-account-admins true

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

## Task 5: Configurar mascaramento dinâmico de dados

Aplique mascaramento de dados para proteger colunas sensíveis de usuários não privilegiados.

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

## Task 6: Configurar isolamento de rede com regras de rede virtual

Configure service endpoints de rede virtual e private endpoint para o servidor SQL.

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

## Quebre &amp; Conserte

### Cenário 1: Rotação da chave TDE falha com "Access Denied"

Após uma alteração na política de acesso do Key Vault, o SQL Server não consegue mais acessar a chave TDE. O banco de dados fica inacessível com o erro "The server key is not available".

<details>
<summary>Mostrar solução</summary>

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

### Cenário 2: Aplicação não consegue conectar após habilitar autenticação somente Entra

Após habilitar a autenticação somente Azure AD, uma aplicação legada usando autenticação SQL não consegue conectar ao banco de dados.

<details>
<summary>Mostrar solução</summary>

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

### Cenário 3: Logs de auditoria não aparecem no Log Analytics

A auditoria SQL foi habilitada mas nenhum log de auditoria aparece no workspace do Log Analytics após 24 horas.

<details>
<summary>Mostrar solução</summary>

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

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a principal diferença entre auditoria em nível de servidor e em nível de banco de dados no Azure SQL?",
    options: [
      "Auditoria em nível de servidor captura apenas eventos de login enquanto em nível de banco de dados captura todos os eventos",
      "Auditoria em nível de servidor se aplica a todos os bancos de dados no servidor; em nível de banco de dados fornece seleção granular de grupos de ações por banco de dados",
      "Auditoria em nível de banco de dados é mais cara que em nível de servidor",
      "Auditoria em nível de servidor requer um SKU premium"
    ],
    correctIndex: 1,
    explanation: "A auditoria em nível de servidor aplica uma política a todos os bancos de dados no servidor SQL, enquanto a auditoria em nível de banco de dados permite configurar grupos de ações de auditoria específicos para bancos de dados individuais, fornecendo controle mais granular sobre o que é capturado."
  },
  {
    question: "Quando o Transparent Data Encryption (TDE) é configurado com uma chave gerenciada pelo cliente e a chave se torna inacessível, o que acontece com o banco de dados?",
    options: [
      "O banco de dados volta para criptografia gerenciada pela Microsoft",
      "O banco de dados se torna inacessível e é eventualmente definido como estado 'Inaccessible' após aproximadamente 24 horas",
      "Apenas operações de escrita são bloqueadas; leituras continuam funcionando",
      "O banco de dados é automaticamente deletado após 48 horas"
    ],
    correctIndex: 1,
    explanation: "Se a chave protetora do TDE se tornar inacessível (deletada, expirada ou permissões revogadas), o banco de dados se torna inacessível. Após aproximadamente 24 horas, o Azure SQL marca o banco de dados como 'Inaccessible'. O banco de dados não é deletado e pode ser recuperado restaurando o acesso à chave."
  },
  {
    question: "Qual recurso do Azure SQL permite ocultar dados sensíveis de usuários não privilegiados sem modificar consultas da aplicação?",
    options: [
      "Always Encrypted",
      "Transparent Data Encryption",
      "Dynamic Data Masking",
      "Row-Level Security"
    ],
    correctIndex: 2,
    explanation: "O Dynamic Data Masking (DDM) oculta dados sensíveis nos resultados de consulta aplicando funções de mascaramento a colunas designadas. Usuários não privilegiados veem dados mascarados enquanto os dados reais permanecem inalterados no banco de dados. Nenhuma alteração na aplicação é necessária."
  },
  {
    question: "Qual é a abordagem recomendada para desabilitar completamente a autenticação SQL em um servidor Azure SQL?",
    options: [
      "Deletar a conta de administrador SQL",
      "Habilitar autenticação somente Microsoft Entra",
      "Definir uma senha em branco no administrador SQL",
      "Remover todas as regras de firewall SQL"
    ],
    correctIndex: 1,
    explanation: "Habilitar a autenticação somente Microsoft Entra (Azure AD-only auth) desabilita completamente a autenticação SQL. Todas as conexões devem usar tokens Microsoft Entra. Esta é a abordagem mais segura pois elimina logins SQL baseados em senha."
  }
]} />

## Limpeza

```bash
# Delete the resource group and all resources
az group delete --name $RG --yes --no-wait

# Purge Key Vault
az keyvault purge --name $KV_NAME --no-wait
```
