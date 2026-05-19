---
sidebar_position: 5
title: "Challenge 29: Database deployment automation"
---

# Challenge 29: Database deployment automation

## Exam skills mapped

- Implement a deployment that includes database tasks

## Scenario

Contoso Ltd's API deployments frequently break because database schema changes are not coordinated with code changes. Last week, a developer deployed a new API version that expected a `CustomerPreferences` table that did not exist yet, causing 500 errors for 45 minutes until a DBA manually ran the migration. The team needs a database-aware deployment pipeline that ensures schema changes are applied in the correct order relative to application deployments.

**Environment details:**
- Azure SQL Database: `sql-contoso-prod.database.windows.net`
- Database: `ContosoWebDB`
- Application: .NET 8 Web API using Entity Framework Core
- Resource group: `rg-contoso-data`
- Region: East US

---

## Task 1: Implement EF Core migrations in CI/CD pipeline

### Generate a migration locally

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

### GitHub Actions workflow with EF Core migrations

Create `.github/workflows/deploy-with-migrations.yml`:

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

## Task 2: Implement Flyway migrations for SQL Server

### Flyway project structure

```
db/
  flyway.toml
  sql/
    V001__Create_customers_table.sql
    V002__Add_customer_preferences.sql
    V003__Add_orders_indexes.sql
    R__Create_reporting_views.sql
```

### Flyway configuration (`flyway.toml`)

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

### Sample migration files

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

### Flyway in GitHub Actions

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

## Task 3: Database deployment ordering (schema first, then app)

### Deployment sequence diagram

```
1. Run database migrations (additive/non-breaking)
2. Verify migrations applied successfully
3. Deploy new application version to staging slot
4. Validate staging with new schema
5. Swap staging to production
6. (Optional) Remove deprecated columns/tables in next release cycle
```

### Azure Pipelines with strict ordering

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

## Task 4: Rollback strategies for database changes

### Strategy 1: Forward-fix with compensating migration

```bash
# If V003 introduced a bug, create V004 to fix it (preferred in production)
dotnet ef migrations add FixOrdersIndexes \
  --project src/ContosoApi \
  --startup-project src/ContosoApi
```

### Strategy 2: Point-in-time restore for catastrophic failures

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

### Strategy 3: Pre-migration backup

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

## Task 5: Blue-green with database (expand-contract pattern)

The expand-contract pattern allows safe database migrations alongside blue-green deployments.

### Phase 1: Expand (add new schema, keep old)

```sql
-- V005__Expand_add_full_name_column.sql
-- Add new column (nullable, no breaking change)
ALTER TABLE dbo.Customers ADD FullName NVARCHAR(512) NULL;

-- Backfill data from existing columns
UPDATE dbo.Customers
SET FullName = FirstName + ' ' + LastName
WHERE FullName IS NULL;
```

### Phase 2: Migrate (application uses both old and new)

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

### Phase 3: Contract (remove old schema in next release)

```sql
-- V006__Contract_remove_name_columns.sql
-- Only run after ALL application instances use FullName
ALTER TABLE dbo.Customers DROP COLUMN FirstName;
ALTER TABLE dbo.Customers DROP COLUMN LastName;

-- Make the new column non-nullable
ALTER TABLE dbo.Customers ALTER COLUMN FullName NVARCHAR(512) NOT NULL;
```

### Deployment timeline

| Release | Database change | Application change |
|---------|----------------|--------------------|
| v2.1 | Expand: Add `FullName` column | Write to both old and new columns |
| v2.2 | None | Read from new column only, stop writing old |
| v2.3 | Contract: Drop old columns | Remove old column references |

---

## Task 6: GitHub Actions workflow with migration step

Complete workflow demonstrating the full database-aware deployment pattern:

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

## Task 7: Azure Pipelines with SqlAzureDacpacDeployment task

### DACPAC-based deployment

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

## Break and fix exercises

### Exercise 1: Migration fails due to permission error

**Symptom:** The `azure/sql-action` step fails with `The server principal is not able to access the database under the current security context.`

**Investigate:**
```bash
# Check if the managed identity has access to the database
az sql db show \
  --name ContosoWebDB \
  --server sql-contoso-prod \
  --resource-group $RESOURCE_GROUP \
  --query "status"
```

**Root cause:** The service principal used by the pipeline does not have the `db_ddladmin` role in the target database.

**Fix:**
```sql
-- Run as server admin to grant DDL permissions to the pipeline identity
CREATE USER [contoso-pipeline-sp] FROM EXTERNAL PROVIDER;
ALTER ROLE db_ddladmin ADD MEMBER [contoso-pipeline-sp];
ALTER ROLE db_datareader ADD MEMBER [contoso-pipeline-sp];
ALTER ROLE db_datawriter ADD MEMBER [contoso-pipeline-sp];
```

### Exercise 2: Application deployed before migration completes

**Symptom:** The application throws `SqlException: Invalid object name 'CustomerPreferences'` because the migration stage was still running when the app deployment started.

**Root cause:** The pipeline stages did not have proper `dependsOn` configuration, allowing them to run in parallel.

**Fix:** Ensure strict ordering in the pipeline:
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

### Exercise 3: DACPAC deployment blocked by data loss

**Symptom:** DACPAC publish fails with `Rows were detected. The schema update is terminating because data loss might occur.`

**Root cause:** The DACPAC detects that a column is being removed that contains data. The `/p:BlockOnPossibleDataLoss=true` flag prevents the operation.

**Fix:** Use the expand-contract pattern instead of dropping columns directly:
```bash
# Option 1: Override for this deployment (use with caution)
# /p:BlockOnPossibleDataLoss=false

# Option 2 (recommended): Use a pre/post deployment script to handle the data first
# Pre-script: migrate data to new column
# DACPAC: schema changes
# Post-script: cleanup (in next release)
```

---

## Knowledge check

**Question 1:** Contoso deploys a new API version that requires a new database table. The pipeline deploys the application first, then runs migrations. Users see 500 errors for 2 minutes. What is the correct deployment order?

- A. Deploy application, then run migrations, then restart application
- B. Run migrations first, then deploy the application
- C. Deploy application and migrations simultaneously in parallel
- D. Run migrations during the maintenance window after deployment

<details>
<summary>Show answer</summary>

**B. Run migrations first, then deploy the application**

Database schema changes should always be applied before deploying application code that depends on them. This ensures the new tables, columns, or indexes exist when the application starts using them. If the migration adds a table the app needs, deploying the app first causes errors until the migration completes.

</details>

**Question 2:** Contoso uses the expand-contract pattern for a schema change that renames a column from `FirstName` + `LastName` to `FullName`. How many releases does this pattern typically require?

- A. 1 release (rename the column in a single migration)
- B. 2 releases (add new column, then drop old columns)
- C. 3 releases (expand with new column, migrate reads/writes, contract by removing old)
- D. 4 releases (add column, copy data, switch reads, remove old)

<details>
<summary>Show answer</summary>

**C. 3 releases (expand with new column, migrate reads/writes, contract by removing old)**

The expand-contract pattern requires at minimum three releases: (1) Expand - add the new column without removing the old, backfill data; (2) Migrate - application writes to both but reads from new, verify all instances use new schema; (3) Contract - remove old columns once no application version references them. This ensures zero-downtime compatibility throughout.

</details>

**Question 3:** Which Azure Pipelines task should be used to deploy a SQL script to Azure SQL Database?

- A. AzureCLI@2
- B. SqlAzureDacpacDeployment@1
- C. AzureRmWebAppDeployment@4
- D. PowerShell@2

<details>
<summary>Show answer</summary>

**B. SqlAzureDacpacDeployment@1**

The `SqlAzureDacpacDeployment@1` task supports both DACPAC deployments and SQL script execution against Azure SQL Database. It handles authentication (service principal, SQL auth, or connection string), firewall rule management, and provides proper error handling for database operations.

</details>

**Question 4:** A pipeline generates an idempotent EF Core migration script using `dotnet ef migrations script --idempotent`. What does the `--idempotent` flag ensure?

- A. The script runs faster on subsequent executions
- B. The script can be safely re-run without causing errors if migrations were already applied
- C. The script generates rollback statements for each migration
- D. The script validates data integrity before applying changes

<details>
<summary>Show answer</summary>

**B. The script can be safely re-run without causing errors if migrations were already applied**

The `--idempotent` flag generates a SQL script that checks the `__EFMigrationsHistory` table before applying each migration. If a migration has already been recorded, it is skipped. This makes the script safe to re-run (idempotent) in CI/CD pipelines where a retry might execute the same script again.

</details>

---

## Cleanup

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
