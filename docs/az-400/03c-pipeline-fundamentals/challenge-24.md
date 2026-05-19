---
sidebar_position: 6
title: "Challenge 24: Checks and approvals"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 24: Checks and approvals

:::info Platform: comparison
This challenge compares environment protection and approval mechanisms across GitHub Actions and Azure Pipelines.
:::

## Exam skills mapped

- Design and implement checks and approvals by using YAML-based environments

## Scenario

Contoso Ltd's compliance team has mandated the following deployment controls:

1. Staging deployments must pass automated smoke tests before production becomes eligible
2. Production deployments require approval from at least one VP-level engineer
3. No deployments to production are allowed on Fridays or weekends (business hours restriction)
4. Only the `main` branch can be deployed to production
5. Each environment must have its own set of secrets and configuration

The DevOps team needs to implement these controls using environment protection rules in both GitHub Actions and Azure Pipelines.

## Task 1: GitHub environments with protection rules

Configure GitHub environments with required reviewers and branch restrictions:

```bash
# Create the staging environment
gh api --method PUT repos/contoso/contoso-api/environments/staging \
  --input - <<EOF
{
  "wait_timer": 0,
  "reviewers": [],
  "deployment_branch_policy": {
    "protected_branches": false,
    "custom_branch_policies": true
  }
}
EOF

# Add branch policy to staging (allow main and release branches)
gh api --method POST repos/contoso/contoso-api/environments/staging/deployment-branch-policies \
  --field name="main"

gh api --method POST repos/contoso/contoso-api/environments/staging/deployment-branch-policies \
  --field name="release/*" \
  --field type="branch"

# Create the production environment with reviewers and wait timer
gh api --method PUT repos/contoso/contoso-api/environments/production \
  --input - <<EOF
{
  "wait_timer": 15,
  "prevent_self_review": true,
  "reviewers": [
    {"type": "User", "id": 12345},
    {"type": "Team", "id": 67890}
  ],
  "deployment_branch_policy": {
    "protected_branches": false,
    "custom_branch_policies": true
  }
}
EOF

# Only allow main branch to deploy to production
gh api --method POST repos/contoso/contoso-api/environments/production/deployment-branch-policies \
  --field name="main"
```

Use environments in the workflow:

```yaml
name: Production deployment with approvals

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.tag }}
    steps:
      - uses: actions/checkout@v4
      - name: Build application
        run: npm ci && npm run build
      - name: Determine version
        id: version
        run: echo "tag=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
      - uses: actions/upload-artifact@v4
        with:
          name: app-bundle
          path: dist/

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://contoso-api-staging.azurewebsites.net
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: app-bundle
          path: dist/
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Deploy to staging
        run: |
          az webapp deploy \
            --resource-group contoso-staging-rg \
            --name contoso-api-staging \
            --src-path dist/app.zip \
            --type zip

  smoke-tests:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run smoke tests
        run: |
          npm ci
          npm run test:smoke -- --base-url https://contoso-api-staging.azurewebsites.net
        env:
          SMOKE_TEST_API_KEY: ${{ secrets.STAGING_API_KEY }}
      - name: Run performance baseline
        run: |
          npx autocannon -c 10 -d 30 https://contoso-api-staging.azurewebsites.net/api/health
      - name: Verify response schema
        run: |
          RESPONSE=$(curl -s https://contoso-api-staging.azurewebsites.net/api/v1/status)
          echo "$RESPONSE" | jq -e '.status == "healthy"'

  # Production requires manual approval (configured on the environment)
  deploy-production:
    needs: smoke-tests
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://contoso-api.azurewebsites.net
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: app-bundle
          path: dist/
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Deploy to production
        run: |
          az webapp deploy \
            --resource-group contoso-prod-rg \
            --name contoso-api-prod \
            --src-path dist/app.zip \
            --type zip
      - name: Verify production health
        run: |
          sleep 30
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://contoso-api.azurewebsites.net/health)
          if [ "$STATUS" != "200" ]; then
            echo "Production health check failed"
            exit 1
          fi
```

## Task 2: Deployment branches and tags

Restrict which branches and tags can trigger deployments to specific environments:

```bash
# Allow only tagged releases to deploy to production
gh api --method POST repos/contoso/contoso-api/environments/production/deployment-branch-policies \
  --field name="v*" \
  --field type="tag"

# Remove any branch policies that are too permissive
gh api repos/contoso/contoso-api/environments/production/deployment-branch-policies \
  --jq '.branch_policies[] | select(.name != "main" and .name != "v*") | .id' | \
  xargs -I {} gh api --method DELETE \
    repos/contoso/contoso-api/environments/production/deployment-branch-policies/{}
```

Workflow that deploys tags to production:

```yaml
name: Release deployment

on:
  push:
    tags:
      - "v[0-9]+.[0-9]+.[0-9]+"

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://contoso-api.azurewebsites.net
    steps:
      - uses: actions/checkout@v4
      - name: Extract version from tag
        id: version
        run: echo "version=${GITHUB_REF_NAME#v}" >> $GITHUB_OUTPUT
      - name: Deploy release ${{ steps.version.outputs.version }}
        run: |
          echo "Deploying version ${{ steps.version.outputs.version }} to production"
```

## Task 3: Custom deployment protection rules

Implement a custom deployment protection rule using a GitHub App to enforce business hours:

```yaml
# The GitHub App webhook handler (Node.js Express server)
# This runs as a separate service that GitHub calls before allowing deployment
```

```javascript
// app.js - Custom deployment protection rule handler
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// Verify webhook signature
function verifySignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  const hash = 'sha256=' + crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
}

// Business hours check: Monday-Thursday, 9am-5pm ET
function isWithinBusinessHours() {
  const now = new Date();
  const etOptions = { timeZone: 'America/New_York' };
  const etHour = parseInt(now.toLocaleString('en-US', { ...etOptions, hour: 'numeric', hour12: false }));
  const etDay = now.toLocaleString('en-US', { ...etOptions, weekday: 'long' });

  const workDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const isWorkDay = workDays.includes(etDay);
  const isWorkHours = etHour >= 9 && etHour < 17;

  return isWorkDay && isWorkHours;
}

app.post('/webhook/deployment-protection', (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }

  const { action, environment, deployment_callback_url } = req.body;

  if (action !== 'requested') {
    return res.status(200).send('OK');
  }

  const approved = isWithinBusinessHours();
  const comment = approved
    ? 'Deployment approved: within business hours (Mon-Thu, 9am-5pm ET)'
    : 'Deployment rejected: outside business hours. Deployments are only allowed Monday-Thursday, 9am-5pm ET.';

  // Respond to GitHub with approval or rejection
  fetch(deployment_callback_url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_APP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      environment_name: environment,
      state: approved ? 'approved' : 'rejected',
      comment: comment
    })
  });

  res.status(200).send('OK');
});

app.listen(3000, () => console.log('Protection rule handler running on port 3000'));
```

Register the custom deployment protection rule:

```bash
# Enable the GitHub App as a deployment protection rule on the environment
gh api --method POST \
  repos/contoso/contoso-api/environments/production/deployment_protection_rules \
  --field integration_id=<github-app-id>
```

## Task 4: Azure Pipelines environments with checks

Configure Azure DevOps environments with multiple check types:

### Manual approval check

```bash
# Create environment (via Azure DevOps UI or REST API)
# Project Settings > Environments > New environment

# Add approval check via REST API
az rest --method POST \
  --uri "https://dev.azure.com/contoso/ContosoApi/_apis/pipelines/checks/configurations?api-version=7.1-preview.1" \
  --headers "Content-Type=application/json" \
  --body '{
    "type": {
      "id": "8C6F20A7-A545-4486-9777-F762FAFE0D4D",
      "name": "Approval"
    },
    "settings": {
      "approvers": [
        {"id": "<user-id>", "displayName": "VP Engineering"}
      ],
      "minRequiredApprovers": 1,
      "executionOrder": "anyOrder",
      "instructions": "Review the staging deployment results before approving production deployment.",
      "blockedApprovers": [],
      "timeout": 43200
    },
    "resource": {
      "type": "environment",
      "id": "<environment-id>"
    }
  }'
```

### Business hours check

Configure in Azure DevOps (Project Settings > Environments > production > Checks > Add check > Business Hours):

- Time zone: Eastern Time (US and Canada)
- Days: Monday through Thursday
- Start time: 09:00
- End time: 17:00

In the pipeline, this manifests as a gate that holds the deployment until business hours:

```yaml
stages:
  - stage: DeployProduction
    dependsOn: DeployStaging
    jobs:
      - deployment: Production
        environment: "contoso-production"  # Has business hours check configured
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "This only runs during business hours"
```

### Azure Monitor alerts check

Add an Azure Monitor check that verifies no active alerts before deploying:

```bash
# Configure via Azure DevOps UI:
# Environment > Checks > Add check > Invoke Azure Function
# Or use the built-in "Azure Monitor alerts" check type

# The check queries Azure Monitor for active alerts on the target resource
# If there are active Sev0 or Sev1 alerts, the deployment is blocked
```

Pipeline with all checks:

```yaml
stages:
  - stage: DeployStaging
    jobs:
      - deployment: Staging
        environment: "contoso-staging"
        # Staging has: Invoke REST API check (smoke tests)
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureRmWebAppDeployment@4
                  inputs:
                    azureSubscription: "contoso-azure-connection"
                    appType: "webApp"
                    WebAppName: "contoso-api-staging"
                    packageForLinux: "$(Pipeline.Workspace)/drop/**/*.zip"

  - stage: DeployProduction
    dependsOn: DeployStaging
    jobs:
      - deployment: Production
        environment: "contoso-production"
        # Production has: Manual approval + Business hours + Azure Monitor alerts
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureRmWebAppDeployment@4
                  inputs:
                    azureSubscription: "contoso-azure-connection"
                    appType: "webApp"
                    WebAppName: "contoso-api-prod"
                    packageForLinux: "$(Pipeline.Workspace)/drop/**/*.zip"
```

## Task 5: Exclusive lock and sequential deployment

Prevent concurrent deployments to the same environment:

```yaml
# Azure Pipelines: Exclusive lock check
# Configure via: Environment > Checks > Add check > Exclusive lock

# When configured, if multiple pipeline runs target the same environment,
# only the latest run proceeds and older queued runs are cancelled.

# In the pipeline, declare the concurrency behavior:
stages:
  - stage: DeployProduction
    lockBehavior: sequential  # Options: sequential, runLatest
    jobs:
      - deployment: Production
        environment: "contoso-production"
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Only one deployment at a time"
```

```yaml
# GitHub Actions: Concurrency control
name: Deploy

on:
  push:
    branches: [main]

# Only one deployment workflow runs at a time
# If a new one starts, the in-progress one is cancelled
concurrency:
  group: production-deploy
  cancel-in-progress: false  # Queue instead of cancel (wait for current to finish)

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    # Job-level concurrency (different from workflow-level)
    concurrency:
      group: staging-deploy
      cancel-in-progress: true  # Cancel previous staging deploys
    environment: staging
    steps:
      - run: echo "Deploying to staging"

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    concurrency:
      group: production-deploy-${{ github.ref }}
      cancel-in-progress: false
    environment: production
    steps:
      - run: echo "Deploying to production"
```

## Task 6: Environment-scoped variables and secrets

Configure secrets and variables that are isolated to specific environments:

### GitHub Actions

```bash
# Create environment secrets (different values per environment)
gh secret set DATABASE_URL --env staging \
  --body "postgresql://user:pass@staging-db.postgres.database.azure.com:5432/contoso"
gh secret set DATABASE_URL --env production \
  --body "postgresql://user:pass@prod-db.postgres.database.azure.com:5432/contoso"

gh secret set API_KEY --env staging --body "staging-key-abc123"
gh secret set API_KEY --env production --body "prod-key-xyz789"

# Create environment variables
gh variable set FEATURE_FLAGS --env staging --body '{"newUI":true,"betaAPI":true}'
gh variable set FEATURE_FLAGS --env production --body '{"newUI":false,"betaAPI":false}'

gh variable set LOG_LEVEL --env staging --body "debug"
gh variable set LOG_LEVEL --env production --body "warning"

gh variable set REPLICA_COUNT --env staging --body "1"
gh variable set REPLICA_COUNT --env production --body "3"
```

Access in workflow:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # This scopes which secrets/vars are available
    steps:
      - name: Deploy with environment config
        run: |
          echo "Database: connecting to environment-specific DB"
          echo "Log level: ${{ vars.LOG_LEVEL }}"
          echo "Replicas: ${{ vars.REPLICA_COUNT }}"
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}
```

### Azure Pipelines

```yaml
# Variable groups per environment
variables:
  - group: contoso-common  # Shared across all stages

stages:
  - stage: DeployStaging
    variables:
      - group: contoso-staging-secrets  # Linked to Key Vault
      - group: contoso-staging-config
    jobs:
      - deployment: Staging
        environment: "contoso-staging"
        strategy:
          runOnce:
            deploy:
              steps:
                - script: |
                    echo "Log level: $(LogLevel)"
                    echo "Replica count: $(ReplicaCount)"
                  displayName: "Use staging configuration"

  - stage: DeployProduction
    variables:
      - group: contoso-production-secrets  # Different Key Vault
      - group: contoso-production-config
    jobs:
      - deployment: Production
        environment: "contoso-production"
        strategy:
          runOnce:
            deploy:
              steps:
                - script: |
                    echo "Log level: $(LogLevel)"
                    echo "Replica count: $(ReplicaCount)"
                  displayName: "Use production configuration"
```

## Break and fix

### Exercise 1: Environment approval bypassed

A deployment reaches production without approval. Investigate:

```yaml
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    # ERROR: Missing environment declaration
    steps:
      - name: Deploy to production
        run: az webapp deploy --name contoso-api-prod ...
```


<details>
<summary>Show solution</summary>

**Fix:** The job does not reference the `production` environment, so no protection rules are evaluated. Add the `environment` key:

```yaml
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://contoso-api.azurewebsites.net
    steps:
      - name: Deploy to production
        run: az webapp deploy --name contoso-api-prod ...
```

</details>

### Exercise 2: Concurrency group cancels wanted deployments

Multiple services deploy independently but share a concurrency group, causing cancellations:

```yaml
# In service-a workflow:
concurrency:
  group: production  # ERROR: Too broad - shared across all services
  cancel-in-progress: true

# In service-b workflow:
concurrency:
  group: production  # Same group - will cancel service-a deployment
  cancel-in-progress: true
```


<details>
<summary>Show solution</summary>

**Fix:** Scope concurrency groups to the specific service:

```yaml
# In service-a workflow:
concurrency:
  group: production-service-a
  cancel-in-progress: true

# In service-b workflow:
concurrency:
  group: production-service-b
  cancel-in-progress: true
```

Or use the workflow name dynamically:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

</details>

### Exercise 3: Wait timer not working as expected

The production environment has a 15-minute wait timer configured, but deployments proceed immediately:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: Production  # ERROR: Case-sensitive mismatch
    steps:
      - run: echo "deploying"
```


<details>
<summary>Show solution</summary>

**Fix:** Environment names in GitHub are case-sensitive. If the environment was created as `production` (lowercase), the workflow must reference it exactly:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Must match exactly
    steps:
      - run: echo "deploying"
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "In GitHub Actions, what happens when a workflow targets an environment that has required reviewers configured?",
    options: [
      "The workflow fails immediately with a permissions error",
      "The job pauses and waits for an authorized reviewer to approve before proceeding",
      "The workflow skips the job and moves to the next one",
      "GitHub automatically approves if the committer is a repository admin"
    ],
    correctIndex: 1,
    explanation: "When a job references an environment with required reviewers, the job enters a \"Waiting\" state and GitHub notifies the designated reviewers. The job does not proceed until at least the minimum number of required reviewers approve. The approval can be granted from the workflow run page in the GitHub UI. If not approved within 30 days, the run is automatically cancelled."
  },
  {
    question: "How does the 'concurrency' key in GitHub Actions differ from Azure Pipelines' exclusive lock?",
    options: [
      "They are identical in behavior",
      "GitHub's 'concurrency' with 'cancel-in-progress: true' cancels queued runs, while Azure's exclusive lock with 'runLatest' behaviour cancels older runs and only keeps the latest",
      "GitHub's concurrency only applies to pull requests",
      "Azure's exclusive lock only works with deployment jobs"
    ],
    correctIndex: 1,
    explanation: "Both provide mutual exclusion, but the cancelation behavior differs. In GitHub Actions, cancel-in-progress: true cancels the currently running workflow in favor of the new one. In Azure Pipelines, the exclusive lock with runLatest behavior cancels all older queued runs and only the latest proceeds. With sequential behavior in Azure Pipelines, runs queue and execute one at a time in order."
  },
  {
    question: "What is the purpose of a wait timer on a GitHub environment?",
    options: [
      "It limits how long a deployment job can run",
      "It enforces a mandatory delay between when the job is triggered and when it can start executing",
      "It sets the timeout for reviewer approval",
      "It controls the interval between retry attempts"
    ],
    correctIndex: 1,
    explanation: "The wait timer introduces a mandatory delay (in minutes) between when a job targeting the environment becomes ready and when it actually begins execution. This provides a \"cool down\" period during which the team can inspect the previous deployment or cancel the upcoming one. The timer runs after approval (if required reviewers are also configured)."
  },
  {
    question: "In Azure Pipelines, which check type would you use to prevent deployments when the target application is experiencing an active incident?",
    options: [
      "Manual approval",
      "Business hours",
      "Azure Monitor alerts",
      "Exclusive lock"
    ],
    correctIndex: 2,
    explanation: "The Azure Monitor alerts check evaluates whether there are active alerts (at specified severity levels) on the target Azure resources. If active alerts exist matching the configured criteria (such as Sev0 or Sev1 alerts), the deployment is blocked until the alerts are resolved. This prevents deploying new code to a system that is already experiencing issues."
  }
]} />

## Cleanup

```bash
# GitHub: Remove environment protection rules
gh api --method DELETE repos/contoso/contoso-api/environments/staging
gh api --method DELETE repos/contoso/contoso-api/environments/production

# Remove environment secrets and variables
gh secret list --env staging --json name --jq '.[].name' | \
  xargs -I {} gh secret delete {} --env staging
gh secret list --env production --json name --jq '.[].name' | \
  xargs -I {} gh secret delete {} --env production

gh variable list --env staging --json name --jq '.[].name' | \
  xargs -I {} gh variable delete {} --env staging
gh variable list --env production --json name --jq '.[].name' | \
  xargs -I {} gh variable delete {} --env production

# Azure DevOps: Remove environments
# Done via UI: Project Settings > Environments > Select > Delete

# Remove the custom deployment protection rule GitHub App
gh api --method DELETE \
  repos/contoso/contoso-api/environments/production/deployment_protection_rules/<rule-id>
```
