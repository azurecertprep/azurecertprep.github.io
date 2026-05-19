---
sidebar_position: 2
title: "Challenge 17: Quality and release gates"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 17: Quality and release gates

:::info Platform: GitHub Actions-first
Primary walkthrough uses GitHub Actions. Azure Pipelines equivalent noted where applicable.
:::

## Exam skills measured

- Design and implement quality and release gates, including security and governance
- Implement pre-deployment and post-deployment gates
- Configure environment approvals and checks

---

## Scenario

Contoso Ltd recently experienced a production incident where a deployment with known high-severity vulnerabilities passed through the pipeline without review. The release manager has mandated automated quality gates before any production deployment. No code reaches production unless:

1. All automated tests pass with greater than 80% code coverage
2. Zero critical or high vulnerabilities exist in dependencies
3. At least two team members have approved the change
4. Performance regression check confirms p95 latency remains below 200ms
5. Security scan (Defender for DevOps) reports no critical findings

You must implement these gates across GitHub Actions environments and provide the Azure Pipelines equivalent for the team's Azure DevOps projects.

---

## Tasks

### Task 1: Configure GitHub environment protection rules

Create the production environment with protection rules using the GitHub CLI:

```bash
# Create the production environment (requires admin access)
gh api repos/contoso-ltd/ecommerce-api/environments/production \
  --method PUT \
  --field wait_timer=5 \
  --field reviewers='[{"type":"Team","id":12345}]' \
  --field deployment_branch_policy='{"protected_branches":true,"custom_branch_policies":false}'
```

Configure required status checks in repository settings. Create `.github/workflows/quality-gates.yml`:

```yaml
name: Quality Gates

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-and-coverage:
    runs-on: ubuntu-latest
    outputs:
      coverage-percentage: ${{ steps.coverage.outputs.percentage }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npx jest --coverage --ci --coverageReporters=json-summary --coverageReporters=lcov

      - name: Extract coverage percentage
        id: coverage
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          echo "percentage=$COVERAGE" >> "$GITHUB_OUTPUT"
          echo "Line coverage: $COVERAGE%"

      - name: Upload coverage artifact
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  security-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run dependency audit
        run: |
          npm audit --audit-level=high --json > audit-results.json || true
          CRITICAL=$(cat audit-results.json | jq '.metadata.vulnerabilities.critical // 0')
          HIGH=$(cat audit-results.json | jq '.metadata.vulnerabilities.high // 0')
          echo "Critical: $CRITICAL, High: $HIGH"
          if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
            echo "::error::Found $CRITICAL critical and $HIGH high vulnerabilities"
            exit 1
          fi

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@0.28.0
        with:
          scan-type: 'fs'
          scan-ref: '.'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy-results.sarif

  performance-baseline:
    runs-on: ubuntu-latest
    needs: test-and-coverage

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: contoso_test
          POSTGRES_PASSWORD: test_password_ci
          POSTGRES_DB: ecommerce_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U contoso_test"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies and start server
        run: |
          npm ci
          npx knex migrate:latest
          npx knex seed:run
          npm start &
          for i in $(seq 1 30); do
            curl -s http://localhost:3000/health && break
            sleep 2
          done
        env:
          DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test
          API_PORT: 3000

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
            | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update && sudo apt-get install k6

      - name: Run performance gate test
        run: |
          k6 run --out json=perf-results.json load-tests/gate-check.js
        env:
          BASE_URL: http://localhost:3000
          K6_THRESHOLD_P95: 200

      - name: Upload performance results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: performance-results
          path: perf-results.json
```

### Task 2: Create a custom quality gate action

Create `.github/actions/quality-gate/action.yml`:

```yaml
name: 'Quality Gate Check'
description: 'Validates all quality gates pass before deployment'

inputs:
  coverage-threshold:
    description: 'Minimum code coverage percentage'
    required: true
    default: '80'
  coverage-file:
    description: 'Path to coverage summary JSON'
    required: true
  security-scan-passed:
    description: 'Whether security scan passed'
    required: true
  performance-passed:
    description: 'Whether performance gate passed'
    required: true

outputs:
  gate-passed:
    description: 'Whether all quality gates passed'
    value: ${{ steps.evaluate.outputs.passed }}
  gate-summary:
    description: 'Summary of gate results'
    value: ${{ steps.evaluate.outputs.summary }}

runs:
  using: 'composite'
  steps:
    - name: Evaluate quality gates
      id: evaluate
      shell: bash
      run: |
        PASSED=true
        SUMMARY=""

        # Check coverage
        if [ -f "${{ inputs.coverage-file }}" ]; then
          COVERAGE=$(cat "${{ inputs.coverage-file }}" | jq '.total.lines.pct')
          THRESHOLD=${{ inputs.coverage-threshold }}
          if (( $(echo "$COVERAGE >= $THRESHOLD" | bc -l) )); then
            SUMMARY="$SUMMARY\n- Coverage: ${COVERAGE}% (threshold: ${THRESHOLD}%) -- PASSED"
          else
            SUMMARY="$SUMMARY\n- Coverage: ${COVERAGE}% (threshold: ${THRESHOLD}%) -- FAILED"
            PASSED=false
          fi
        else
          SUMMARY="$SUMMARY\n- Coverage: File not found -- FAILED"
          PASSED=false
        fi

        # Check security
        if [ "${{ inputs.security-scan-passed }}" = "true" ]; then
          SUMMARY="$SUMMARY\n- Security scan: No critical/high vulnerabilities -- PASSED"
        else
          SUMMARY="$SUMMARY\n- Security scan: Vulnerabilities found -- FAILED"
          PASSED=false
        fi

        # Check performance
        if [ "${{ inputs.performance-passed }}" = "true" ]; then
          SUMMARY="$SUMMARY\n- Performance: p95 within threshold -- PASSED"
        else
          SUMMARY="$SUMMARY\n- Performance: p95 exceeded threshold -- FAILED"
          PASSED=false
        fi

        echo "passed=$PASSED" >> "$GITHUB_OUTPUT"
        echo "summary<<EOF" >> "$GITHUB_OUTPUT"
        echo -e "$SUMMARY" >> "$GITHUB_OUTPUT"
        echo "EOF" >> "$GITHUB_OUTPUT"

        if [ "$PASSED" = "false" ]; then
          echo "::error::Quality gates failed. Deployment blocked."
          exit 1
        fi
```

### Task 3: Implement the deployment job with environment gates

Add the deployment job that uses the production environment:

```yaml
  deploy-production:
    runs-on: ubuntu-latest
    needs: [test-and-coverage, security-scan, performance-baseline]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production
      url: https://api.contoso.com

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download coverage report
        uses: actions/download-artifact@v4
        with:
          name: coverage-report
          path: ./coverage

      - name: Run quality gate check
        uses: ./.github/actions/quality-gate
        with:
          coverage-threshold: '80'
          coverage-file: './coverage/coverage-summary.json'
          security-scan-passed: ${{ needs.security-scan.result == 'success' }}
          performance-passed: ${{ needs.performance-baseline.result == 'success' }}

      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          az webapp deploy \
            --resource-group contoso-prod-rg \
            --name contoso-ecommerce-api \
            --src-path ./dist \
            --type zip
        env:
          AZURE_CREDENTIALS: ${{ secrets.AZURE_CREDENTIALS }}
```

### Task 4: Create the k6 performance gate script

Create `load-tests/gate-check.js`:

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

  const endpoints = [
    { path: '/api/products', method: 'GET' },
    { path: '/api/cart', method: 'GET' },
    { path: '/api/health', method: 'GET' },
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${baseUrl}${endpoint.path}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

### Task 5: Azure Pipelines gates configuration

Create `azure-pipelines-gates.yml` with pre-deployment gates:

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Build
    displayName: 'Build and test'
    jobs:
      - job: BuildAndTest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: npx jest --coverage --ci
            displayName: 'Run tests'

          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '**/junit.xml'
            condition: always()

          - task: PublishCodeCoverageResults@2
            inputs:
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/coverage/cobertura-coverage.xml'

  - stage: SecurityScan
    displayName: 'Security scan'
    dependsOn: Build
    jobs:
      - job: DependencyScan
        steps:
          - task: MicrosoftSecurityDevOps@1
            displayName: 'Run Microsoft Security DevOps'
            inputs:
              categories: 'secrets,dependencies'

  - stage: DeployProduction
    displayName: 'Deploy to production'
    dependsOn: [Build, SecurityScan]
    jobs:
      - deployment: DeployProd
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to production"
                  displayName: 'Deploy application'
```

Configure the `production` environment in Azure DevOps with gates:

```bash
# Using Azure DevOps CLI to configure environment checks
az devops configure --defaults organization=https://dev.azure.com/contoso-ltd project=ecommerce

# Create the environment (done via UI or REST API)
# Navigate to Pipelines > Environments > production > Approvals and checks

# Add approvals: Require 2 reviewers from the release-approvers group
# Add gate: Azure Monitor alerts (no active alerts on production)
# Add gate: REST API health check
```

Azure Pipelines environment gate configuration (set via the portal or REST API):

```json
{
  "type": {
    "id": "fe1de3ee-a436-41b4-bb20-f6eb4cb879a7",
    "name": "InvokeRestAPI"
  },
  "settings": {
    "displayName": "Health check gate",
    "definitionRef": {
      "id": "9c94e4ce-a8cf-11e7-a3ef-0050568a4487",
      "name": "InvokeRestAPI",
      "version": "0.0.1"
    },
    "inputs": {
      "connectedServiceNameSelector": "connectedServiceName",
      "connectedServiceName": "contoso-health-endpoint",
      "method": "GET",
      "urlSuffix": "/api/health",
      "headers": "",
      "body": "",
      "waitForCompletion": "false",
      "successCriteria": "eq(root['status'], 'healthy')"
    }
  },
  "timeout": 43200,
  "retryOn": "all",
  "evaluationOptions": {
    "period": 300000,
    "timeout": 86400000,
    "initialDelay": 0
  }
}
```

### Task 6: Integrate Defender for DevOps as a release gate

Add Microsoft Security DevOps scanning to the GitHub workflow:

```yaml
  defender-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Microsoft Security DevOps
        uses: microsoft/security-devops-action@v1
        id: msdo
        with:
          categories: 'IaC,secrets,code'

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: ${{ steps.msdo.outputs.sarifFile }}

      - name: Fail on critical findings
        run: |
          if [ -f "${{ steps.msdo.outputs.sarifFile }}" ]; then
            CRITICAL_COUNT=$(cat "${{ steps.msdo.outputs.sarifFile }}" | \
              jq '[.runs[].results[] | select(.level == "error")] | length')
            if [ "$CRITICAL_COUNT" -gt 0 ]; then
              echo "::error::Found $CRITICAL_COUNT critical security findings"
              exit 1
            fi
          fi
```

---

## Break and fix

### The problem

After configuring all quality gates, the production deployment is blocked indefinitely. The workflow shows the `deploy-production` job as "Waiting" and never proceeds, even though all tests pass and the PR has been approved.

The team observes:

- The security scan job reports success
- Coverage is at 85% (above threshold)
- Performance tests pass
- Two reviewers have approved
- But the deployment job never starts

---


<details>
<summary>Solution</summary>

### Root cause analysis

**Issue 1: Circular dependency in required status checks**

The repository branch protection requires the `deploy-production` status check to pass before merging. But `deploy-production` only runs after merge to `main`. This creates a deadlock: the PR cannot merge because it is waiting for a check that only runs post-merge.

**Issue 2: False positive in the REST API health gate (Azure Pipelines)**

The Azure Pipelines gate queries the health endpoint, but the success criteria uses `eq(root['status'], 'healthy')` while the actual API returns `{"status": "ok"}`. The gate re-evaluates every 5 minutes but never passes.

**Issue 3: Environment reviewer not receiving notification**

The GitHub environment protection rule references a team ID that no longer exists (the team was renamed). GitHub silently skips the review requirement but the job remains in a pending state waiting for the configured wait timer that was set to an excessively high value.


### Fix

**Fix 1:** Remove `deploy-production` from required status checks. Only gate checks that run on PRs (tests, security scan, coverage) should be required:

```bash
# Update branch protection to only require PR-time checks
gh api repos/contoso-ltd/ecommerce-api/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["test-and-coverage","security-scan","performance-baseline"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":2}'
```

**Fix 2:** Correct the Azure Pipelines gate success criteria to match the actual API response:

```json
{
  "successCriteria": "eq(root['status'], 'ok')"
}
```

Or update the health endpoint to return the expected format. Always verify gate criteria against the actual endpoint response before enabling the gate.

**Fix 3:** Update the environment protection to reference the correct team and set a reasonable wait timer:

```bash
gh api repos/contoso-ltd/ecommerce-api/environments/production \
  --method PUT \
  --field wait_timer=0 \
  --field reviewers='[{"type":"Team","id":67890}]'
```

Verify the team exists and has members:

```bash
gh api orgs/contoso-ltd/teams/release-approvers/members --jq '.[].login'
```


</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "In GitHub Actions, what is the relationship between 'environment' protection rules and 'needs' dependencies?",
    options: [
      "'needs' replaces environment protection; they cannot be used together",
      "The job must satisfy both 'needs' (predecessor jobs succeed) and environment rules (approvals, wait timers) before executing",
      "Environment protection rules override 'needs' dependencies entirely",
      "'needs' applies to jobs; environment protection applies only to workflows"
    ],
    correctIndex: 1,
    explanation: "Both constraints must be satisfied. The needs keyword ensures predecessor jobs complete successfully, while environment protection rules add additional gates (manual approvals, wait timers, required reviewers). The job only starts when all conditions are met."
  },
  {
    question: "In Azure Pipelines, what happens when a pre-deployment gate evaluation fails?",
    options: [
      "The deployment is cancelled immediately",
      "The gate is re-evaluated at the configured interval until it passes or times out",
      "The pipeline fails and must be manually restarted",
      "The gate result is ignored and deployment proceeds"
    ],
    correctIndex: 1,
    explanation: "Azure Pipelines gates use a polling model. When a gate evaluation returns a negative result, the system waits for the configured period (re-evaluation interval) and tries again. This continues until the gate passes or the timeout is reached, at which point the deployment fails."
  },
  {
    question: "Which GitHub Actions permission is required to upload SARIF files from a security scanner?",
    options: [
      "'contents: write'",
      "'security-events: write'",
      "'actions: write'",
      "'packages: write'"
    ],
    correctIndex: 1,
    explanation: "The security-events: write permission is required to upload SARIF (Static Analysis Results Interchange Format) files to GitHub's code scanning alerts. This enables results from tools like Trivy, CodeQL, or Microsoft Security DevOps to appear in the Security tab."
  },
  {
    question: "What is the primary risk of including deployment status checks in branch protection required checks?",
    options: [
      "Deployments run on every pull request, wasting resources",
      "A circular dependency where the PR cannot merge because it waits for a post-merge check",
      "Branch protection prevents the deployment from accessing secrets",
      "Required checks slow down the CI pipeline for all contributors"
    ],
    correctIndex: 1,
    explanation: "If a deployment check only runs on the main branch (post-merge) but is listed as a required status check for merging to main, a deadlock occurs. The PR waits for a check that will never run until the PR merges. Only checks that execute on pull request events should be required."
  }
]} />

## Cleanup

Remove the quality gate infrastructure after completing the challenge:

```bash
# Remove workflow files
rm .github/workflows/quality-gates.yml

# Remove custom action
rm -rf .github/actions/quality-gate/

# Remove load test gate script
rm load-tests/gate-check.js

# Remove Azure Pipelines gates file
rm -f azure-pipelines-gates.yml

# Remove environment (requires admin)
gh api repos/contoso-ltd/ecommerce-api/environments/production --method DELETE

# Reset branch protection (be careful in real repositories)
gh api repos/contoso-ltd/ecommerce-api/branches/main/protection \
  --method DELETE
```

# Challenge 17: Quality and release gates

This challenge is under development.

