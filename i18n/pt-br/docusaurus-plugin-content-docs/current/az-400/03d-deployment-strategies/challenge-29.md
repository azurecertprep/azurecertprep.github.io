---
sidebar_position: 5
title: "Desafio 29: AutomaÃ§Ã£o de deploy de banco de dados"
---

# Desafio 29: AutomaÃ§Ã£o de deploy de banco de dados

## Habilidades do exame mapeadas

- Implementar um deploy que inclua tarefas de banco de dados

## CenÃ¡rio

Os deploys da API da Contoso Ltd frequentemente quebram porque as alteraÃ§Ãµes no esquema do banco de dados nÃ£o sÃ£o coordenadas com as alteraÃ§Ãµes no cÃ³digo. Na semana passada, um desenvolvedor implantou uma nova versÃ£o da API que esperava uma tabela `CustomerPreferences` que ainda nÃ£o existia, causando erros 500 por 45 minutos atÃ© que um DBA executou manualmente a migraÃ§Ã£o. A equipe precisa de um pipeline de deploy consciente do banco de dados que garanta que as alteraÃ§Ãµes de esquema sejam aplicadas na ordem correta em relaÃ§Ã£o aos deploys da aplicaÃ§Ã£o.

**Detalhes do ambiente:**
- Azure SQL Database: `sql-contoso-prod.database.windows.net`
- Banco de dados: `ContosoWebDB`
- AplicaÃ§Ã£o: .NET 8 Web API usando Entity Framework Core
- Resource group: `rg-contoso-data`
- RegiÃ£o: East US

---

## Tarefa 1: Implementar migraÃ§Ãµes EF Core no pipeline CI/CD

### Gerar uma migraÃ§Ã£o localmente

```bash
# Add a new migration
dotnet ef migrations add AddCustomerPreferences \
  --project src/ContosoApi \
  --startup-project src/ContosoApi \
  --output-dir Data/Migrations

# Generate an idempotent SQL script (recommended for CI/CD)
dotnet ef migrations script \
  --project src/ContosoApi \
  --startup-project src/ContosoApi \
  --idempotent \
  --output migrations.sql
```

### Workflow do GitHub Actions com migraÃ§Ãµes EF Core

Crie `.github/workflows/deploy-with-migrations.yml`:

```yaml
name: Deploy with database migrations

on:
  push:
    branches: [main]
    paths:
      - 'src/ContosoApi/**'

env:
  AZURE_WEBAPP_NAME: app-contoso-api
  RESOURCE_GROUP: rg-contoso-data
  SQL_SERVER: sql-contoso-prod.database.windows.net
  SQL_DATABASE: ContosoWebDB
  DOTNET_VERSION: '8.0.x'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      - name: Install EF Core tools
        run: dotnet tool install --global dotnet-ef

      - name: Build application
        run: |
          dotnet restore src/ContosoApi/ContosoApi.csproj
          dotnet publish src/ContosoApi/ContosoApi.csproj \
            --configuration Release \
            --output ./publish

      - name: Generate idempotent migration script
        run: |
          dotnet ef migrations script \
            --project src/ContosoApi \
            --startup-project src/ContosoApi \
            --idempotent \
            --output ./publish/migrations.sql

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: deploy-package
          path: ./publish

  deploy-database:
    runs-on: ubuntu-latest
    needs: build
    environment: production
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: deploy-package
          path: ./publish

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Run database migrations
        uses: azure/sql-action@v2.3
        with:
          connection-string: ${{ secrets.SQL_CONNECTION_STRING }}
          path: ./publish/migrations.sql

      - name: Verify migration success
        run: |
          az sql db show \
            --name ${{ env.SQL_DATABASE }} \
            --server sql-contoso-prod \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --query "status" -o tsv

  deploy-application:
    runs-on: ubuntu-latest
    needs: deploy-database
    environment: production
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: deploy-package
          path: ./publish

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          slot-name: staging
          package: ./publish

      - name: Validate staging
        run: |
          STAGING_URL="https://${{ env.AZURE_WEBAPP_NAME }}-staging.azurewebsites.net/health"
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL")
          if [ "$STATUS" != "200" ]; then
            echo "Staging validation failed with status $STATUS"
            exit 1
          fi

      - name: Swap to production
        run: |
          az webapp deployment slot swap \
            --name ${{ env.AZURE_WEBAPP_NAME }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --slot staging \
            --target-slot production
```

---

## Tarefa 2: Implementar migraÃ§Ãµes Flyway para SQL Server

### Estrutura do projeto Flyway

```text
db/
  flyway.toml
  sql/
    V001__Create_customers_table.sql
    V002__Add_customer_preferences.sql
    V003__Add_orders_indexes.sql
    R__Create_reporting_views.sql
```

### ConfiguraÃ§Ã£o do Flyway (`flyway.toml`)

```toml
[environments.production]
url = "jdbc:sqlserver://sql-contoso-prod.database.windows.net:1433;database=ContosoWebDB;encrypt=true;trustServerCertificate=false"
user = "${FLYWAY_USER}"
password = "${FLYWAY_PASSWORD}"
schemas = ["dbo"]

[flyway]
locations = ["filesystem:sql"]
baselineOnMigrate = true
outOfOrder = false
validateOnMigrate = true
```

### Arquivos de migraÃ§Ã£o de exemplo

`V001__Create_customers_table.sql`:
```sql
CREATE TABLE dbo.Customers (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Email NVARCHAR(256) NOT NULL,
    FullName NVARCHAR(512) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_Customers_Email UNIQUE (Email)
);

CREATE INDEX IX_Customers_Email ON dbo.Customers (Email);
```

`V002__Add_customer_preferences.sql`:
```sql
CREATE TABLE dbo.CustomerPreferences (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    CustomerId UNIQUEIDENTIFIER NOT NULL,
    PreferenceKey NVARCHAR(128) NOT NULL,
    PreferenceValue NVARCHAR(MAX),
    CONSTRAINT FK_CustomerPreferences_Customers
        FOREIGN KEY (CustomerId) REFERENCES dbo.Customers(Id)
);

CREATE INDEX IX_CustomerPreferences_CustomerId
    ON dbo.CustomerPreferences (CustomerId);
```

### Flyway no GitHub Actions

```yaml
  run-flyway-migrations:
    runs-on: ubuntu-latest
    needs: build
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Run Flyway migrations
        uses: flyway/flyway-action@v1
        with:
          url: jdbc:sqlserver://sql-contoso-prod.database.windows.net:1433;database=ContosoWebDB;encrypt=true
          user: ${{ secrets.SQL_ADMIN_USER }}
          password: ${{ secrets.SQL_ADMIN_PASSWORD }}
          locations: filesystem:./db/sql
          command: migrate

      - name: Verify migration info
        uses: flyway/flyway-action@v1
        with:
          url: jdbc:sqlserver://sql-contoso-prod.database.windows.net:1433;database=ContosoWebDB;encrypt=true
          user: ${{ secrets.SQL_ADMIN_USER }}
          password: ${{ secrets.SQL_ADMIN_PASSWORD }}
          locations: filesystem:./db/sql
          command: info
```

---

## Tarefa 3: OrdenaÃ§Ã£o de deploy de banco de dados (esquema primeiro, depois aplicaÃ§Ã£o)

### Diagrama de sequÃªncia de deploy

```text
1. Run database migrations (additive/non-breaking)
2. Verify migrations applied successfully
3. Deploy new application version to staging slot
4. Validate staging with new schema
5. Swap staging to production
6. (Optional) Remove deprecated columns/tables in next release cycle
```

### Azure Pipelines com ordenaÃ§Ã£o estrita

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  azureSubscription: 'contoso-production-connection'
  resourceGroup: 'rg-contoso-data'
  sqlServer: 'sql-contoso-prod'
  sqlDatabase: 'ContosoWebDB'
  appName: 'app-contoso-api'

stages:
  - stage: Build
    jobs:
      - job: BuildApp
        steps:
          - task: UseDotNet@2
            inputs:
              packageType: 'sdk'
              version: '8.0.x'

          - script: |
              dotnet tool install --global dotnet-ef
              dotnet restore src/ContosoApi/ContosoApi.csproj
              dotnet publish src/ContosoApi/ContosoApi.csproj -c Release -o $(Build.ArtifactStagingDirectory)/app
              dotnet ef migrations script --project src/ContosoApi --startup-project src/ContosoApi --idempotent --output $(Build.ArtifactStagingDirectory)/migrations.sql
            displayName: 'Build app and generate migration script'

          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)'
              ArtifactName: 'drop'

  - stage: DeployDatabase
    displayName: 'Deploy database schema'
    dependsOn: Build
    jobs:
      - deployment: MigrateDatabase
        environment: 'production-db'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: SqlAzureDacpacDeployment@1
                  displayName: 'Run SQL migrations'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    authenticationType: 'server'
                    serverName: '$(sqlServer).database.windows.net'
                    databaseName: $(sqlDatabase)
                    sqlUsername: '$(SQL_ADMIN_USER)'
                    sqlPassword: '$(SQL_ADMIN_PASSWORD)'
                    deployType: 'SqlTask'
                    sqlFile: '$(Pipeline.Workspace)/drop/migrations.sql'

  - stage: DeployApplication
    displayName: 'Deploy application'
    dependsOn: DeployDatabase
    jobs:
      - deployment: DeployApp
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: $(azureSubscription)
                    appType: 'webAppLinux'
                    appName: $(appName)
                    deployToSlotOrASE: true
                    resourceGroupName: $(resourceGroup)
                    slotName: 'staging'
                    package: '$(Pipeline.Workspace)/drop/app'

                - task: AzureAppServiceManage@0
                  displayName: 'Swap to production'
                  inputs:
                    azureSubscription: $(azureSubscription)
                    action: 'Swap Slots'
                    webAppName: $(appName)
                    resourceGroupName: $(resourceGroup)
                    sourceSlot: 'staging'
```

---

## Tarefa 4: EstratÃ©gias de rollback para alteraÃ§Ãµes de banco de dados

### EstratÃ©gia 1: Forward-fix com migraÃ§Ã£o compensatÃ³ria

```bash
# If V003 introduced a bug, create V004 to fix it (preferred in production)
dotnet ef migrations add FixOrdersIndexes \
  --project src/ContosoApi \
  --startup-project src/ContosoApi
```

### EstratÃ©gia 2: RestauraÃ§Ã£o point-in-time para falhas catastrÃ³ficas

```bash
# Restore database to a point before the migration
az sql db restore \
  --dest-name ContosoWebDB-restored \
  --resource-group $RESOURCE_GROUP \
  --server sql-contoso-prod \
  --name ContosoWebDB \
  --time "2025-01-15T10:00:00Z"

# After verification, swap the restored database
az sql db rename \
  --name ContosoWebDB \
  --resource-group $RESOURCE_GROUP \
  --server sql-contoso-prod \
  --new-name ContosoWebDB-old

az sql db rename \
  --name ContosoWebDB-restored \
  --resource-group $RESOURCE_GROUP \
  --server sql-contoso-prod \
  --new-name ContosoWebDB
```

### EstratÃ©gia 3: Backup prÃ©-migraÃ§Ã£o

```yaml
  backup-before-migration:
    runs-on: ubuntu-latest
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Create database copy as backup
        run: |
          TIMESTAMP=$(date +%Y%m%d%H%M%S)
          az sql db copy \
            --dest-name "ContosoWebDB-backup-${TIMESTAMP}" \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --server sql-contoso-prod \
            --name ContosoWebDB \
            --dest-server sql-contoso-prod
          echo "Backup created: ContosoWebDB-backup-${TIMESTAMP}"
```

---

## Tarefa 5: Blue-green com banco de dados (padrÃ£o expand-contract)

O padrÃ£o expand-contract permite migraÃ§Ãµes seguras de banco de dados em conjunto com deploys blue-green.

### Fase 1: Expand (adicionar novo esquema, manter antigo)

```sql
-- V005__Expand_add_full_name_column.sql
-- Add new column (nullable, no breaking change)
ALTER TABLE dbo.Customers ADD FullName NVARCHAR(512) NULL;

-- Backfill data from existing columns
UPDATE dbo.Customers
SET FullName = FirstName + ' ' + LastName
WHERE FullName IS NULL;
```

### Fase 2: Migrate (aplicaÃ§Ã£o usa tanto o antigo quanto o novo)

```csharp
// Application code handles both schemas during transition
public class Customer
{
    public string? FirstName { get; set; }  // Old column (still read)
    public string? LastName { get; set; }   // Old column (still read)
    public string? FullName { get; set; }   // New column (write here)

    public string GetDisplayName()
    {
        // Prefer new column, fall back to old
        return FullName ?? $"{FirstName} {LastName}";
    }
}
```

### Fase 3: Contract (remover esquema antigo na prÃ³xima versÃ£o)

```sql
-- V006__Contract_remove_name_columns.sql
-- Only run after ALL application instances use FullName
ALTER TABLE dbo.Customers DROP COLUMN FirstName;
ALTER TABLE dbo.Customers DROP COLUMN LastName;

-- Make the new column non-nullable
ALTER TABLE dbo.Customers ALTER COLUMN FullName NVARCHAR(512) NOT NULL;
```

### Cronograma de deploy

| VersÃ£o | AlteraÃ§Ã£o no banco de dados | AlteraÃ§Ã£o na aplicaÃ§Ã£o |
|--------|----------------------------|------------------------|
| v2.1 | Expand: Adicionar coluna `FullName` | Escrever em ambas as colunas antiga e nova |
| v2.2 | Nenhuma | Ler apenas da nova coluna, parar de escrever na antiga |
| v2.3 | Contract: Remover colunas antigas | Remover referÃªncias Ã s colunas antigas |

---

## Tarefa 6: Workflow do GitHub Actions com etapa de migraÃ§Ã£o

Workflow completo demonstrando o padrÃ£o completo de deploy consciente do banco de dados:

```yaml
name: Database-aware deployment

on:
  push:
    branches: [main]

env:
  RESOURCE_GROUP: rg-contoso-data
  APP_NAME: app-contoso-api
  SQL_SERVER: sql-contoso-prod

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      has_migrations: ${{ steps.check-migrations.outputs.has_migrations }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Install EF Core tools
        run: dotnet tool install --global dotnet-ef

      - name: Check for new migrations
        id: check-migrations
        run: |
          CHANGED=$(git diff --name-only HEAD~1 HEAD -- 'src/ContosoApi/Data/Migrations/')
          if [ -n "$CHANGED" ]; then
            echo "has_migrations=true" >> $GITHUB_OUTPUT
            echo "New migrations detected: $CHANGED"
          else
            echo "has_migrations=false" >> $GITHUB_OUTPUT
            echo "No new migrations"
          fi

      - name: Build and publish
        run: |
          dotnet publish src/ContosoApi/ContosoApi.csproj \
            -c Release -o ./publish

      - name: Generate migration script
        if: steps.check-migrations.outputs.has_migrations == 'true'
        run: |
          dotnet ef migrations script \
            --project src/ContosoApi \
            --startup-project src/ContosoApi \
            --idempotent \
            --output ./publish/migrations.sql

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: deploy-package
          path: ./publish

  migrate-database:
    runs-on: ubuntu-latest
    needs: build
    if: needs.build.outputs.has_migrations == 'true'
    environment: production
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: deploy-package
          path: ./publish

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Create pre-migration backup
        run: |
          TIMESTAMP=$(date +%Y%m%d%H%M%S)
          az sql db copy \
            --dest-name "ContosoWebDB-pre-migration-${TIMESTAMP}" \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --server ${{ env.SQL_SERVER }} \
            --name ContosoWebDB \
            --dest-server ${{ env.SQL_SERVER }}

      - name: Apply migrations
        uses: azure/sql-action@v2.3
        with:
          connection-string: ${{ secrets.SQL_CONNECTION_STRING }}
          path: ./publish/migrations.sql

  deploy-application:
    runs-on: ubuntu-latest
    needs: [build, migrate-database]
    if: always() && needs.build.result == 'success' && (needs.migrate-database.result == 'success' || needs.migrate-database.result == 'skipped')
    environment: production
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: deploy-package
          path: ./publish

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to staging
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.APP_NAME }}
          slot-name: staging
          package: ./publish

      - name: Swap to production
        run: |
          az webapp deployment slot swap \
            --name ${{ env.APP_NAME }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --slot staging \
            --target-slot production
```

---

## Tarefa 7: Azure Pipelines com task SqlAzureDacpacDeployment

### Deploy baseado em DACPAC

```yaml
stages:
  - stage: DeployDatabase
    displayName: 'Deploy database with DACPAC'
    jobs:
      - deployment: DatabaseDeploy
        environment: 'production-db'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: SqlAzureDacpacDeployment@1
                  displayName: 'Deploy DACPAC to Azure SQL'
                  inputs:
                    azureSubscription: 'contoso-production-connection'
                    authenticationType: 'servicePrincipal'
                    serverName: 'sql-contoso-prod.database.windows.net'
                    databaseName: 'ContosoWebDB'
                    deployType: 'DacpacTask'
                    deploymentAction: 'Publish'
                    dacpacFile: '$(Pipeline.Workspace)/drop/ContosoApi.dacpac'
                    additionalArguments: '/p:BlockOnPossibleDataLoss=true /p:DropObjectsNotInSource=false'

  - stage: DeploySqlScript
    displayName: 'Deploy using SQL script'
    jobs:
      - deployment: SqlScriptDeploy
        environment: 'production-db'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: SqlAzureDacpacDeployment@1
                  displayName: 'Run migration SQL script'
                  inputs:
                    azureSubscription: 'contoso-production-connection'
                    authenticationType: 'servicePrincipal'
                    serverName: 'sql-contoso-prod.database.windows.net'
                    databaseName: 'ContosoWebDB'
                    deployType: 'SqlTask'
                    sqlFile: '$(Pipeline.Workspace)/drop/migrations.sql'
```

---

## ExercÃ­cios de quebra e conserto

### ExercÃ­cio 1: MigraÃ§Ã£o falha por erro de permissÃ£o

**Sintoma:** A etapa `azure/sql-action` falha com `The server principal is not able to access the database under the current security context.`

**Investigar:**
```bash
# Check if the managed identity has access to the database
az sql db show \
  --name ContosoWebDB \
  --server sql-contoso-prod \
  --resource-group $RESOURCE_GROUP \
  --query "status"
```

<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**Causa raiz:** O service principal usado pelo pipeline nÃ£o possui o role `db_ddladmin` no banco de dados de destino.

**CorreÃ§Ã£o:**
```sql
-- Run as server admin to grant DDL permissions to the pipeline identity
CREATE USER [contoso-pipeline-sp] FROM EXTERNAL PROVIDER;
ALTER ROLE db_ddladmin ADD MEMBER [contoso-pipeline-sp];
ALTER ROLE db_datareader ADD MEMBER [contoso-pipeline-sp];
ALTER ROLE db_datawriter ADD MEMBER [contoso-pipeline-sp];
```

</details>

### ExercÃ­cio 2: AplicaÃ§Ã£o implantada antes da migraÃ§Ã£o ser concluÃ­da

**Sintoma:** A aplicaÃ§Ã£o lanÃ§a `SqlException: Invalid object name 'CustomerPreferences'` porque o estÃ¡gio de migraÃ§Ã£o ainda estava em execuÃ§Ã£o quando o deploy da aplicaÃ§Ã£o iniciou.

<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**Causa raiz:** Os estÃ¡gios do pipeline nÃ£o tinham configuraÃ§Ã£o adequada de `dependsOn`, permitindo que fossem executados em paralelo.

**CorreÃ§Ã£o:** Garanta a ordenaÃ§Ã£o estrita no pipeline:
```yaml
stages:
  - stage: DeployDatabase
    dependsOn: Build
    # ...

  - stage: DeployApplication
    dependsOn: DeployDatabase  # Must wait for DB migration
    condition: succeeded('DeployDatabase')
    # ...
```

</details>

### ExercÃ­cio 3: Deploy de DACPAC bloqueado por perda de dados

**Sintoma:** O publish do DACPAC falha com `Rows were detected. The schema update is terminating because data loss might occur.`

<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**Causa raiz:** O DACPAC detecta que uma coluna sendo removida contÃ©m dados. A flag `/p:BlockOnPossibleDataLoss=true` impede a operaÃ§Ã£o.

**CorreÃ§Ã£o:** Use o padrÃ£o expand-contract em vez de remover colunas diretamente:
```bash
# Option 1: Override for this deployment (use with caution)
# /p:BlockOnPossibleDataLoss=false

# Option 2 (recommended): Use a pre/post deployment script to handle the data first
# Pre-script: migrate data to new column
# DACPAC: schema changes
# Post-script: cleanup (in next release)
```

</details>

---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso implanta uma nova versÃ£o da API que requer uma nova tabela no banco de dados. O pipeline implanta a aplicaÃ§Ã£o primeiro e depois executa as migraÃ§Ãµes. Os usuÃ¡rios veem erros 500 por 2 minutos. Qual Ã© a ordem correta de deploy?",
    options: [
      "Implantar a aplicaÃ§Ã£o, depois executar as migraÃ§Ãµes, depois reiniciar a aplicaÃ§Ã£o",
      "Executar as migraÃ§Ãµes primeiro, depois implantar a aplicaÃ§Ã£o",
      "Implantar a aplicaÃ§Ã£o e as migraÃ§Ãµes simultaneamente em paralelo",
      "Executar as migraÃ§Ãµes durante a janela de manutenÃ§Ã£o apÃ³s o deploy"
    ],
    correctIndex: 1,
    explanation: "As alteraÃ§Ãµes no esquema do banco de dados devem sempre ser aplicadas antes de implantar o cÃ³digo da aplicaÃ§Ã£o que depende delas. Isso garante que as novas tabelas, colunas ou Ã­ndices existam quando a aplicaÃ§Ã£o comeÃ§ar a utilizÃ¡-los."
  },
  {
    question: "A Contoso usa o padrÃ£o expand-contract para uma alteraÃ§Ã£o de esquema que renomeia uma coluna de FirstName + LastName para FullName. Quantas versÃµes esse padrÃ£o normalmente requer?",
    options: [
      "1 versÃ£o (renomear a coluna em uma Ãºnica migraÃ§Ã£o)",
      "2 versÃµes (adicionar nova coluna, depois remover colunas antigas)",
      "3 versÃµes (expand com nova coluna, migrar leituras/escritas, contract removendo antigas)",
      "4 versÃµes (adicionar coluna, copiar dados, alternar leituras, remover antigas)"
    ],
    correctIndex: 2,
    explanation: "O padrÃ£o expand-contract requer no mÃ­nimo trÃªs versÃµes: (1) Expand - adicionar a nova coluna sem remover a antiga, preencher dados; (2) Migrate - a aplicaÃ§Ã£o escreve em ambas mas lÃª da nova; (3) Contract - remover colunas antigas quando nenhuma versÃ£o da aplicaÃ§Ã£o as referencia."
  },
  {
    question: "Qual task do Azure Pipelines deve ser usada para implantar um script SQL no Azure SQL Database?",
    options: [
      "AzureCLI@2",
      "SqlAzureDacpacDeployment@1",
      "AzureRmWebAppDeployment@4",
      "PowerShell@2"
    ],
    correctIndex: 1,
    explanation: "A task SqlAzureDacpacDeployment@1 suporta tanto deploys de DACPAC quanto execuÃ§Ã£o de scripts SQL contra o Azure SQL Database. Ela gerencia autenticaÃ§Ã£o, regras de firewall e fornece tratamento adequado de erros para operaÃ§Ãµes de banco de dados."
  },
  {
    question: "Um pipeline gera um script de migraÃ§Ã£o idempotente do EF Core usando dotnet ef migrations script --idempotent. O que a flag --idempotent garante?",
    options: [
      "O script executa mais rÃ¡pido em execuÃ§Ãµes subsequentes",
      "O script pode ser re-executado com seguranÃ§a sem causar erros se as migraÃ§Ãµes jÃ¡ foram aplicadas",
      "O script gera instruÃ§Ãµes de rollback para cada migraÃ§Ã£o",
      "O script valida a integridade dos dados antes de aplicar alteraÃ§Ãµes"
    ],
    correctIndex: 1,
    explanation: "A flag --idempotent gera um script SQL que verifica a tabela __EFMigrationsHistory antes de aplicar cada migraÃ§Ã£o. Se uma migraÃ§Ã£o jÃ¡ foi registrada, ela Ã© ignorada. Isso torna o script seguro para re-execuÃ§Ã£o em pipelines CI/CD onde uma nova tentativa pode executar o mesmo script novamente."
  }
]} />

---

## Limpeza

```bash
# Delete backup databases
az sql db list \
  --server sql-contoso-prod \
  --resource-group $RESOURCE_GROUP \
  --query "[?contains(name, 'backup') || contains(name, 'pre-migration')].name" -o tsv | \
  xargs -I {} az sql db delete \
    --name {} \
    --server sql-contoso-prod \
    --resource-group $RESOURCE_GROUP \
    --yes

# Delete the resource group
az group delete --name rg-contoso-data --yes --no-wait
```
