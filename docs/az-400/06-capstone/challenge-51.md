---
sidebar_position: 1
title: "Challenge 51: Cross-domain capstone"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 51: End-to-end DevOps lifecycle

:::info Platform: comparison
This capstone integrates GitHub and Azure DevOps across all exam domains.
:::

## Exam skills

This challenge tests skills from all five AZ-400 exam domains:
- Domain 1: Processes and communications
- Domain 2: Source control strategy
- Domain 3: Build and release pipelines
- Domain 4: Security and compliance
- Domain 5: Instrumentation strategy

## Scenario

Contoso is launching "Contoso Payments" -- a new payment processing microservice that handles credit card transactions. The service must process payments via a REST API, integrate with external payment gateways, and store transaction records in Azure SQL Database.

Due to PCI-DSS compliance requirements, every aspect of the DevOps lifecycle must be properly secured, monitored, and auditable. No secrets may exist in source control, all deployments must be traceable to approved work items, and the production environment must have continuous monitoring with automated alerting.

Your team consists of four developers, one QA engineer, and one SRE. You are the DevOps engineer responsible for designing and implementing the entire delivery pipeline from repository creation through production monitoring.

**Time estimate:** 60-90 minutes

---

## Part 1: Source control setup

### 1.1 Repository structure

Create a GitHub repository `contoso-payments` with the following structure:

```
contoso-payments/
  src/
    Contoso.Payments.Api/
    Contoso.Payments.Domain/
    Contoso.Payments.Infrastructure/
    Contoso.Payments.Sdk/
  tests/
    Contoso.Payments.Api.Tests/
    Contoso.Payments.Domain.Tests/
    Contoso.Payments.Integration.Tests/
  infra/
    modules/
    main.bicep
    parameters/
      staging.bicepparam
      production.bicepparam
  .github/
    workflows/
    CODEOWNERS
  docs/
```

### 1.2 Branch strategy

Implement a trunk-based development model with short-lived feature branches:

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Production-ready code | Require PR, 2 reviewers, CI pass, no force push |
| `release/*` | Release stabilization | Require PR, 1 reviewer, CI pass |
| `feature/*` | Development work | No direct push to main |
| `hotfix/*` | Emergency fixes | Require 1 reviewer, expedited CI |

### 1.3 CODEOWNERS configuration

```
# Default owners
* @contoso/payments-team

# Infrastructure requires platform team review
/infra/ @contoso/platform-team @contoso/payments-team

# Security-sensitive files require security team
/.github/workflows/ @contoso/security-team @contoso/payments-team
/src/Contoso.Payments.Infrastructure/Encryption/ @contoso/security-team

# SDK changes require API governance review
/src/Contoso.Payments.Sdk/ @contoso/api-governance
```

### 1.4 Branch protection rules

Configure the following for `main`:

- Require pull request reviews (minimum 2)
- Dismiss stale reviews on new pushes
- Require review from CODEOWNERS
- Require status checks: `build`, `test`, `security-scan`, `lint`
- Require branches to be up to date before merging
- Require signed commits
- Restrict who can push (team leads only)
- Require linear history (squash merge only)

---

## Part 2: Work tracking and traceability

### 2.1 GitHub Projects board

Create a GitHub Projects board with the following columns:

| Column | Automation |
|--------|-----------|
| Backlog | New issues land here |
| Sprint Ready | Manually triaged and estimated |
| In Progress | Auto-move when branch created or PR opened |
| In Review | Auto-move when PR ready for review |
| Done | Auto-move when PR merged |

### 2.2 Issue templates

Create issue templates for:

- **Feature request** -- includes fields for acceptance criteria, affected services, and PCI-DSS impact assessment
- **Bug report** -- includes reproduction steps, severity classification, and affected environment
- **Security finding** -- restricted visibility, includes CVSS score and remediation deadline

### 2.3 Commit traceability

Enforce commit message standards using a commit-lint check in CI:

```
<type>(<scope>): <description>

[optional body]

Refs: #<issue-number>
```

Valid types: `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `security`

Every commit to `main` (via squash merge) must reference a work item. Configure a GitHub Action that validates the PR description contains a linked issue before merge is allowed.

---

## Part 3: CI pipeline

### 3.1 Build and test workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI Pipeline

on:
  pull_request:
    branches: [main, release/*]
  push:
    branches: [main]

permissions:
  contents: read
  checks: write
  security-events: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Restore dependencies
        run: dotnet restore

      - name: Build
        run: dotnet build --no-restore --configuration Release

      - name: Run unit tests with coverage
        run: |
          dotnet test tests/Contoso.Payments.Api.Tests \
            --no-build --configuration Release \
            --collect:"XPlat Code Coverage" \
            --results-directory ./coverage

      - name: Check coverage threshold
        uses: danielpalme/ReportGenerator-GitHub-Action@5
        with:
          reports: './coverage/**/coverage.cobertura.xml'
          targetdir: './coverage-report'
          reporttypes: 'TextSummary'

      - name: Enforce 80% coverage gate
        run: |
          COVERAGE=$(grep "Line coverage" coverage-report/Summary.txt | grep -oP '\d+\.?\d*')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run dotnet format check
        run: dotnet format --verify-no-changes --severity warn

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: csharp
          queries: +security-extended

      - name: Build for CodeQL
        run: dotnet build --configuration Release

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:csharp"
```

### 3.2 Dependabot configuration

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "nuget"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "automated"
    groups:
      microsoft:
        patterns:
          - "Microsoft.*"
          - "Azure.*"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "ci"
      - "automated"
```

### 3.3 Required status checks

All of the following must pass before a PR can merge:

- `build` -- compilation succeeds
- `lint` -- no formatting violations
- `security-scan` -- no high/critical findings
- `coverage-gate` -- minimum 80% line coverage
- `commit-lint` -- commit message format validated

---

## Part 4: Package management

### 4.1 Shared SDK publishing

The `Contoso.Payments.Sdk` project is a shared NuGet package consumed by other Contoso services. Publish it to GitHub Packages on every merge to `main`.

Create `.github/workflows/publish-sdk.yml`:

```yaml
name: Publish SDK

on:
  push:
    branches: [main]
    paths:
      - 'src/Contoso.Payments.Sdk/**'

permissions:
  packages: write
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Determine version
        id: version
        run: |
          VERSION="1.0.${{ github.run_number }}"
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Pack SDK
        run: |
          dotnet pack src/Contoso.Payments.Sdk \
            --configuration Release \
            -p:PackageVersion=${{ steps.version.outputs.version }}

      - name: Publish to GitHub Packages
        run: |
          dotnet nuget push src/Contoso.Payments.Sdk/bin/Release/*.nupkg \
            --source "https://nuget.pkg.github.com/contoso/index.json" \
            --api-key ${{ secrets.GITHUB_TOKEN }}
```

### 4.2 Package versioning strategy

- Feature branches: pre-release versions (e.g., `1.0.42-feature-payments.1`)
- Main branch: stable versions (e.g., `1.0.42`)
- Release branches: release candidates (e.g., `1.0.42-rc.1`)

### 4.3 Package consumption

Configure downstream services to consume the SDK from GitHub Packages by adding a `nuget.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
    <add key="contoso" value="https://nuget.pkg.github.com/contoso/index.json" />
  </packageSources>
  <packageSourceCredentials>
    <contoso>
      <add key="Username" value="contoso-bot" />
      <add key="ClearTextPassword" value="%GITHUB_TOKEN%" />
    </contoso>
  </packageSourceCredentials>
</configuration>
```

---

## Part 5: CD pipeline

### 5.1 Multi-stage deployment

Create `.github/workflows/deploy.yml` implementing the following stages:

```
Build --> Staging (auto) --> Integration Tests --> Production (manual approval, blue-green)
```

```yaml
name: Deploy

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4

      - name: Build and push container image
        id: meta
        run: |
          IMAGE_TAG="${{ github.sha }}"
          az acr build \
            --registry contosopaymentsacr \
            --image payments-api:$IMAGE_TAG \
            --file src/Contoso.Payments.Api/Dockerfile .
          echo "tags=$IMAGE_TAG" >> $GITHUB_OUTPUT

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Login to Azure (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy to staging
        uses: azure/arm-deploy@v2
        with:
          resourceGroupName: rg-payments-staging
          template: infra/main.bicep
          parameters: infra/parameters/staging.bicepparam
          failOnStdErr: false

      - name: Update container app revision
        run: |
          az containerapp update \
            --name ca-payments-api \
            --resource-group rg-payments-staging \
            --image contosopaymentsacr.azurecr.io/payments-api:${{ needs.build.outputs['image-tag'] }}

  integration-tests:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run integration tests against staging
        run: |
          dotnet test tests/Contoso.Payments.Integration.Tests \
            --configuration Release \
            --environment "PAYMENTS_API_URL=https://ca-payments-api.staging.contoso.com"

  deploy-production:
    needs: integration-tests
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://payments.contoso.com
    steps:
      - uses: actions/checkout@v4

      - name: Login to Azure (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy infrastructure
        uses: azure/arm-deploy@v2
        with:
          resourceGroupName: rg-payments-production
          template: infra/main.bicep
          parameters: infra/parameters/production.bicepparam
          failOnStdErr: false

      - name: Blue-green deployment
        run: |
          # Deploy to inactive slot (green)
          az containerapp revision copy \
            --name ca-payments-api \
            --resource-group rg-payments-production \
            --image contosopaymentsacr.azurecr.io/payments-api:${{ needs.build.outputs['image-tag'] }} \
            --revision-suffix green-${{ github.run_number }}

          # Route 10% traffic to green for canary validation
          az containerapp ingress traffic set \
            --name ca-payments-api \
            --resource-group rg-payments-production \
            --revision-weight \
              ca-payments-api--active=90 \
              ca-payments-api--green-${{ github.run_number }}=10

      - name: Validate canary
        run: |
          sleep 120
          # Check error rate on green revision
          ERROR_RATE=$(az monitor metrics list \
            --resource /subscriptions/.../ca-payments-api \
            --metric "Requests" \
            --filter "StatusCode ge 500 and RevisionName eq 'green-${{ github.run_number }}'" \
            --interval PT5M | jq '.value[0].timeseries[0].data[-1].total // 0')

          if [ "$ERROR_RATE" -gt 5 ]; then
            echo "Canary failed: error rate too high"
            exit 1
          fi

      - name: Promote green to active
        run: |
          az containerapp ingress traffic set \
            --name ca-payments-api \
            --resource-group rg-payments-production \
            --revision-weight \
              ca-payments-api--green-${{ github.run_number }}=100
```

### 5.2 Environment protection rules

| Environment | Rules |
|-------------|-------|
| staging | No approvals, deploy on every push to main |
| production | Require 2 approvals (from `@contoso/release-managers`), wait timer of 5 minutes, restrict to `main` branch |

### 5.3 Rollback procedure

If production deployment fails canary validation:

1. Traffic is automatically routed back to the previous active revision (100%)
2. The failed green revision is deactivated
3. An incident issue is automatically created with deployment details
4. The team is notified via Microsoft Teams webhook

---

## Part 6: Security

### 6.1 Workload identity federation (OIDC)

Configure federated credentials to eliminate stored secrets for Azure authentication:

```bash
# Create app registration for each environment
az ad app create --display-name "contoso-payments-staging"
az ad app create --display-name "contoso-payments-production"

# Configure federated credential for GitHub Actions
az ad app federated-credential create \
  --id <app-object-id> \
  --parameters '{
    "name": "github-main-branch",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:contoso/contoso-payments:environment:production",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### 6.2 Key Vault integration

All application secrets must come from Azure Key Vault. No secrets in environment variables, app settings, or pipeline variables.

```bicep
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-payments-${environment}'
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      virtualNetworkRules: [
        { id: containerAppSubnetId }
      ]
    }
  }
}
```

Secrets stored in Key Vault:
- `payment-gateway-api-key` -- external payment processor credential
- `sql-connection-string` -- database connection (managed identity preferred, connection string as fallback)
- `encryption-key` -- card data encryption key (auto-rotate every 90 days)

### 6.3 Secret scanning and prevention

- Enable GitHub secret scanning with push protection
- Configure custom secret patterns for Contoso-specific tokens (format: `ctp_[a-zA-Z0-9]{32}`)
- Pre-commit hook using `gitleaks` to catch secrets before they reach remote

### 6.4 Pipeline security hardening

- Pin all GitHub Actions to SHA (not tags): `uses: actions/checkout@<full-sha>`
- Use `permissions` at job level with least-privilege
- No self-hosted runners for production deployments
- Audit log forwarding to SIEM for all workflow runs

---

## Part 7: Monitoring and observability

### 7.1 Application Insights integration

Configure Application Insights with the following:

```csharp
// Program.cs
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
    options.EnableAdaptiveSampling = true;
});

builder.Services.AddApplicationInsightsTelemetryProcessor<PciDataScrubber>();

// Custom telemetry processor to strip PCI data from traces
public class PciDataScrubber : ITelemetryProcessor
{
    private readonly ITelemetryProcessor _next;

    public PciDataScrubber(ITelemetryProcessor next) => _next = next;

    public void Process(ITelemetry item)
    {
        if (item is RequestTelemetry request)
        {
            // Strip card numbers from request telemetry
            request.Properties.Remove("cardNumber");
            request.Url = SanitizeUrl(request.Url);
        }
        _next.Process(item);
    }
}
```

### 7.2 Deployment annotations

Add deployment markers to Application Insights after each production deployment:

```yaml
      - name: Create deployment annotation
        run: |
          az monitor app-insights component update \
            --app ai-payments-production \
            --resource-group rg-payments-production \
            --tags "deployment=${{ github.sha }}"

          # Create release annotation via REST API
          ANNOTATION_BODY=$(cat <<EOF
          {
            "Id": "${{ github.run_id }}",
            "AnnotationName": "Release ${{ github.run_number }}",
            "EventTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
            "Category": "Deployment",
            "Properties": "{\"ReleaseName\":\"${{ github.run_number }}\",\"CommitSha\":\"${{ github.sha }}\"}"
          }
          EOF
          )

          az rest --method put \
            --uri "/subscriptions/{sub}/resourceGroups/rg-payments-production/providers/microsoft.insights/components/ai-payments-production/Annotations?api-version=2015-05-01" \
            --body "$ANNOTATION_BODY"
```

### 7.3 KQL alert on error spike

Create an alert rule that fires when the 5xx error rate exceeds baseline:

```kql
// Alert: Error rate spike detection
let baseline = requests
| where timestamp between (ago(7d) .. ago(1h))
| summarize baseline_rate = todouble(countif(resultCode startswith "5")) / count();
requests
| where timestamp > ago(5m)
| summarize
    current_errors = countif(resultCode startswith "5"),
    total_requests = count()
| extend current_rate = todouble(current_errors) / total_requests
| where current_rate > toscalar(baseline) * 3
    and current_errors > 10
```

Alert configuration:
- Severity: 1 (Critical)
- Evaluation frequency: 5 minutes
- Action group: page on-call SRE via PagerDuty, create incident in GitHub Issues, post to Teams channel

### 7.4 Dashboard

Create an Azure Dashboard with the following tiles:

| Tile | Metric | Visualization |
|------|--------|--------------|
| Request rate | requests per second | Time chart |
| Error rate | 5xx / total requests | Time chart with threshold line |
| Response time P95 | duration percentile | Time chart |
| Dependency health | external payment gateway latency | Time chart |
| Active revisions | container app revision traffic split | Pie chart |
| Deployment frequency | deployments per week | Bar chart (DORA) |

---

## Part 8: Pipeline operations

### 8.1 Pipeline caching

Optimize CI pipeline execution time with caching:

```yaml
      - name: Cache NuGet packages
        uses: actions/cache@v4
        with:
          path: ~/.nuget/packages
          key: nuget-${{ runner.os }}-${{ hashFiles('**/*.csproj') }}
          restore-keys: |
            nuget-${{ runner.os }}-

      - name: Cache Docker layers
        uses: actions/cache@v4
        with:
          path: /tmp/.buildx-cache
          key: docker-${{ runner.os }}-${{ hashFiles('src/Contoso.Payments.Api/Dockerfile') }}
          restore-keys: |
            docker-${{ runner.os }}-
```

Target: CI pipeline completes in under 5 minutes for PR checks.

### 8.2 Retention policy

| Artifact | Retention |
|----------|-----------|
| CI build logs | 30 days |
| Container images (non-production) | 14 days |
| Container images (production) | 1 year |
| Test results | 90 days |
| Security scan reports | 2 years (PCI-DSS requirement) |
| Deployment logs | 1 year |

Configure Azure Container Registry retention:

```bash
az acr config retention update \
  --registry contosopaymentsacr \
  --status enabled \
  --days 14 \
  --type UntaggedManifests

# Tag production images for long-term retention
az acr repository update \
  --name contosopaymentsacr \
  --image payments-api:$TAG \
  --write-enabled false
```

### 8.3 DORA metrics tracking

Track the four DORA metrics using GitHub Actions workflow data and Application Insights:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Deployment frequency | Daily | Count of production deployments per day |
| Lead time for changes | Less than 1 day | Time from first commit to production deployment |
| Mean time to recovery (MTTR) | Less than 1 hour | Time from incident creation to resolution |
| Change failure rate | Less than 5% | Production deployments causing incidents / total deployments |

Implement a scheduled workflow that calculates and reports these metrics weekly:

```yaml
name: DORA Metrics Report

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate deployment frequency
        uses: actions/github-script@v7
        with:
          script: |
            const runs = await github.rest.actions.listWorkflowRuns({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'deploy.yml',
              status: 'success',
              created: `>=${new Date(Date.now() - 7*24*60*60*1000).toISOString()}`
            });
            console.log(`Deployments this week: ${runs.data.total_count}`);
```

---

## Break and fix scenarios

### Scenario 1: Production 500 errors after deployment

**Situation:** The deploy pipeline completed successfully. All integration tests passed in staging. However, within 10 minutes of production deployment, Application Insights shows a spike in 500 errors on the `POST /api/payments` endpoint.

**Investigation steps:**

1. Check the Application Insights error spike alert that fired
2. Examine the exception telemetry -- you find: `SqlException: Invalid column name 'PaymentMethodToken'`
3. Review the deployment diff -- a new column was added to the `Payments` table in code but the Entity Framework migration was never applied to the production database
4. The staging environment had the migration applied manually during development, but no automated migration step exists in the CD pipeline


<details>
<summary>Show solution</summary>

**Root cause:** The CD pipeline deploys the application code but does not run database migrations. The staging environment had the migration applied out-of-band, so integration tests passed.


**Fix:**

Add a migration step to the deployment pipeline that runs before the application update:

```yaml
      - name: Run database migrations
        run: |
          dotnet tool install --global dotnet-ef
          dotnet ef database update \
            --project src/Contoso.Payments.Infrastructure \
            --startup-project src/Contoso.Payments.Api \
            --connection "${{ secrets.SQL_CONNECTION_STRING }}"
```

**Prevention:** Add a CI check that compares pending migrations against the target database schema and fails if migrations are not included in the deployment.


</details>

### Scenario 2: False positive security scan blocking deployment

**Situation:** A developer submits a PR that adds input validation for credit card numbers. CodeQL flags the code as a potential "Cleartext storage of sensitive information" finding because the validation method accepts a card number parameter.

**The flagged code:**

```csharp
public static bool IsValidCardNumber(string cardNumber)
{
    // Luhn algorithm validation - no storage occurs
    int sum = 0;
    bool alternate = false;
    for (int i = cardNumber.Length - 1; i >= 0; i--)
    {
        int digit = cardNumber[i] - '0';
        if (alternate) digit *= 2;
        if (digit > 9) digit -= 9;
        sum += digit;
        alternate = !alternate;
    }
    return sum % 10 == 0;
}
```

**Investigation steps:**

1. Review the CodeQL alert in the Security tab
2. Confirm the method performs validation only -- no logging, no persistence, no network calls
3. The variable name `cardNumber` triggers the pattern match, but the data is never stored


<details>
<summary>Show solution</summary>

**Fix:**

Create a CodeQL configuration to suppress this specific false positive:

```yaml
# .github/codeql/codeql-config.yml
name: "Contoso Payments CodeQL Config"
queries:
  - uses: security-extended

paths-ignore:
  - 'tests/**'

query-filters:
  - exclude:
      id: cs/cleartext-storage
      tags: contains security
```

For the specific method, add a suppression comment:

```csharp
[System.Diagnostics.CodeAnalysis.SuppressMessage(
    "Security", "CS0001:CleartextStorage",
    Justification = "Validation only - card number is not stored or logged")]
public static bool IsValidCardNumber(string cardNumber)
```

**Process:** Document all security scan exceptions in a `SECURITY_EXCEPTIONS.md` file that is reviewed quarterly by the security team. Each exception must include the rationale, reviewer, and expiration date.


</details>

### Scenario 3: Emergency hotfix for production payment failures

**Situation:** At 2:00 AM, the on-call SRE receives a PagerDuty alert: payment processing is failing for all transactions. Application Insights shows the external payment gateway is returning `401 Unauthorized`. Investigation reveals the gateway API key was rotated by the provider but the Key Vault secret was not updated.

**Required response:**

1. **Immediate triage (5 minutes)**
   - Confirm the issue via Application Insights dependency tracking
   - Verify the error is `401` from the payment gateway, not an internal issue
   - Check Key Vault audit logs to confirm no unauthorized access

2. **Create hotfix branch (2 minutes)**
   ```bash
   git checkout main
   git pull
   git checkout -b hotfix/payment-gateway-key-rotation
   ```

3. **Update Key Vault secret (5 minutes)**
   ```bash
   az keyvault secret set \
     --vault-name kv-payments-production \
     --name payment-gateway-api-key \
     --value "<new-key-from-provider>"
   ```

4. **Restart application to pick up new secret (3 minutes)**
   ```bash
   az containerapp revision restart \
     --name ca-payments-api \
     --resource-group rg-payments-production \
     --revision ca-payments-api--active
   ```

5. **Expedited pipeline for validation**
   - The hotfix PR triggers an expedited CI pipeline (skip integration tests, run unit tests and security scan only)
   - Single approver required (on-call lead)
   - Deploy directly to production (skip staging for Key Vault-only changes)

6. **Post-incident (next business day)**
   - Create post-incident review issue
   - Implement automated Key Vault secret expiration monitoring
   - Add alert for Key Vault secret approaching expiration (30-day warning)
   - Configure payment gateway webhook to notify on key rotation

**Pipeline configuration for hotfix branches:**

```yaml
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize]

jobs:
  determine-pipeline:
    runs-on: ubuntu-latest
    outputs:
      is-hotfix: ${{ steps.check.outputs.hotfix }}
    steps:
      - id: check
        run: |
          if [[ "${{ github.head_ref }}" == hotfix/* ]]; then
            echo "hotfix=true" >> $GITHUB_OUTPUT
          else
            echo "hotfix=false" >> $GITHUB_OUTPUT
          fi

  expedited-ci:
    needs: determine-pipeline
    if: needs['determine-pipeline'].outputs['is-hotfix'] == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: dotnet build
      - run: dotnet test tests/Contoso.Payments.Api.Tests
      # Skip integration tests for expedited path
```

---

## Validation checklist

Before considering this challenge complete, verify:

- [ ] Repository has correct branch protection rules enforced
- [ ] CODEOWNERS file routes reviews to appropriate teams
- [ ] CI pipeline enforces 80% coverage, lint, and security scan
- [ ] SDK is published to GitHub Packages with proper versioning
- [ ] CD pipeline deploys to staging automatically and production with approval
- [ ] Blue-green deployment is configured with canary validation
- [ ] No secrets exist in repository or pipeline variables (OIDC + Key Vault only)
- [ ] Application Insights is configured with PCI data scrubbing
- [ ] Deployment annotations appear on Application Insights timeline
- [ ] Error spike alert is configured and tested
- [ ] Pipeline caching reduces CI time below 5 minutes
- [ ] DORA metrics are calculated and reported weekly
- [ ] Hotfix path is available with expedited CI

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "The team wants to ensure every production deployment can be traced back to an approved work item. Which combination of configurations achieves this?",
    options: [
      "Require signed commits and branch protection rules",
      "Require linked issues on PRs, squash merge policy, and commit message linting",
      "Enable GitHub audit log and require PR reviews",
      "Configure deployment gates with work item query"
    ],
    correctIndex: 1,
    explanation: "Requiring linked issues ensures traceability to work items. Squash merge creates a clean 1:1 mapping between PRs and commits. Commit message linting enforces the Refs: #issue format."
  },
  {
    question: "A developer accidentally pushes a commit containing a test API key to a feature branch. The key is detected by GitHub secret scanning push protection. What happens?",
    options: [
      "The push is blocked and the developer must remove the secret before pushing again",
      "The push succeeds but an alert is created for the security team",
      "The push is blocked and the repository is automatically archived",
      "The push succeeds and the secret is automatically rotated"
    ],
    correctIndex: 0,
    explanation: "Push protection blocks the push at the git level. The developer must remove the secret from their commit history (using git filter-branch or git rebase) before the push will succeed. They can also request a bypass with justification."
  },
  {
    question: "The CD pipeline uses blue-green deployment with canary validation. During the canary phase, the new revision receives 10% of traffic. The error rate on the new revision exceeds the threshold. What should happen automatically?",
    options: [
      "Roll back the entire deployment and page the on-call engineer",
      "Route all traffic back to the previous revision, deactivate the failed revision, and create an incident issue",
      "Increase the canary percentage to 50% for more data before deciding",
      "Stop the pipeline and wait for manual intervention"
    ],
    correctIndex: 1,
    explanation: "Automated rollback routes traffic to the known-good revision, preventing user impact. Deactivating the failed revision prevents accidental traffic routing. Creating an incident issue ensures the team investigates the failure."
  },
  {
    question: "The pipeline authenticates to Azure using workload identity federation (OIDC). What is the primary security advantage over using a service principal secret stored in GitHub Secrets?",
    options: [
      "OIDC is faster than secret-based authentication",
      "No long-lived credentials exist that could be leaked or need rotation",
      "OIDC provides more granular permissions than service principals",
      "OIDC eliminates the need for Azure RBAC"
    ],
    correctIndex: 1,
    explanation: "Workload identity federation uses short-lived tokens issued by GitHub's OIDC provider. There is no stored secret to leak, rotate, or expire. The federated credential is scoped to a specific repository, branch, and environment."
  },
  {
    question: "Application Insights shows a spike in 500 errors after a deployment. The deployment annotation is visible on the timeline. Which KQL query helps identify the root cause?",
    options: [
      "'traces | where timestamp > ago(1h) | summarize count() by message'",
      "'exceptions | where timestamp > deploymentTime | summarize count() by type, outerMessage | top 10 by count_'",
      "'requests | where resultCode == \"500\" | project url, duration'",
      "'dependencies | where success == false | summarize count() by target'"
    ],
    correctIndex: 1,
    explanation: "Querying exceptions grouped by type and message immediately after the deployment timestamp reveals the specific error types introduced by the new code. This pinpoints the root cause rather than just showing symptoms."
  },
  {
    question: "A PCI-DSS auditor asks for evidence that all production changes are authorized, tested, and traceable. Which combination of artifacts satisfies this requirement?",
    options: [
      "Git commit history and pipeline logs",
      "Branch protection audit log, PR approval records, CI test results, deployment logs with linked work items, and Key Vault access audit",
      "Application Insights request logs and Azure Activity Log",
      "GitHub Actions workflow run history and Dependabot alerts"
    ],
    correctIndex: 1,
    explanation: "PCI-DSS requires evidence of change control (branch protection + PR approvals), testing (CI results), authorization (linked work items), deployment audit trail (deployment logs), and access control (Key Vault audit). This combination provides end-to-end traceability from requirement to production."
  }
]} />

