---
sidebar_position: 4
title: "Challenge 22: Triggers and execution order"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 22: Triggers and execution order

:::info Platform: comparison
This challenge compares trigger and execution patterns across GitHub Actions and Azure Pipelines.
:::

## Exam skills mapped

- Develop and implement pipeline trigger rules
- Design and implement a strategy for job execution order, including parallelism and multi-stage pipelines

## Scenario

Contoso Ltd maintains a monorepo containing their frontend (React), backend (Node.js API), and infrastructure code (Bicep). They want pipelines that are efficient. When a developer changes only frontend code, only the frontend pipeline stages should run. When infrastructure changes, the Bicep validation should execute but application tests should be skipped. They also need scheduled nightly builds, matrix testing across multiple Node.js versions, and proper job dependencies to enforce execution order.

Repository structure:

```
contoso-monorepo/
  frontend/
    src/
    package.json
    Dockerfile
  backend/
    src/
    package.json
    Dockerfile
  infra/
    main.bicep
    modules/
  shared/
    utils/
    types/
  .github/workflows/
  pipelines/
```

## Task 1: Path filters in GitHub Actions

Configure workflows that trigger based on changed paths:

```yaml
# .github/workflows/frontend.yml
name: Frontend CI

on:
  push:
    branches: [main]
    paths:
      - "frontend/**"
      - "shared/**"
      - ".github/workflows/frontend.yml"
  pull_request:
    branches: [main]
    paths:
      - "frontend/**"
      - "shared/**"

jobs:
  build-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test -- --coverage
```

```yaml
# .github/workflows/backend.yml
name: Backend CI

on:
  push:
    branches: [main]
    paths:
      - "backend/**"
      - "!backend/docs/**"
      - "!backend/**/*.md"
      - "shared/**"
      - ".github/workflows/backend.yml"
  pull_request:
    branches: [main]
    paths:
      - "backend/**"
      - "shared/**"

jobs:
  build-backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

```yaml
# .github/workflows/infra.yml
name: Infrastructure Validation

on:
  push:
    branches: [main]
    paths:
      - "infra/**"
  pull_request:
    branches: [main]
    paths:
      - "infra/**"

jobs:
  validate-bicep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Validate Bicep
        run: |
          az bicep build --file infra/main.bicep
          az deployment group validate \
            --resource-group contoso-rg \
            --template-file infra/main.bicep \
            --parameters @infra/parameters/dev.json
```

## Task 2: Path filters in Azure Pipelines

Equivalent path-based triggers in Azure Pipelines YAML:

```yaml
# pipelines/frontend-pipeline.yml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - frontend/*
      - shared/*
    exclude:
      - frontend/docs/*
      - frontend/*.md

pr:
  branches:
    include:
      - main
  paths:
    include:
      - frontend/*
      - shared/*

pool:
  vmImage: "ubuntu-latest"

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: "20.x"
  - script: |
      cd frontend
      npm ci
      npm run lint
      npm run build
      npm test -- --coverage
    displayName: "Build and test frontend"
```

```yaml
# pipelines/backend-pipeline.yml
trigger:
  branches:
    include:
      - main
      - release/*
  paths:
    include:
      - backend/*
      - shared/*
    exclude:
      - backend/docs/*

pr:
  branches:
    include:
      - main
  paths:
    include:
      - backend/*
      - shared/*
  drafts: false  # Do not trigger on draft PRs

pool:
  vmImage: "ubuntu-latest"

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: "20.x"
  - script: |
      cd backend
      npm ci
      npm run lint
      npm run build
      npm test
    displayName: "Build and test backend"
```

## Task 3: Schedule triggers

Configure scheduled builds for nightly testing and dependency scanning:

```yaml
# GitHub Actions: Cron-based schedule
name: Nightly build and security scan

on:
  schedule:
    # Run at 02:00 UTC every weekday (Monday-Friday)
    - cron: "0 2 * * 1-5"
    # Run full regression at 04:00 UTC on Sundays
    - cron: "0 4 * * 0"
  workflow_dispatch: {}  # Allow manual trigger as well

jobs:
  nightly-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run dependency audit
        run: npm audit --production
      - name: Run CodeQL analysis
        uses: github/codeql-action/analyze@v3

  full-regression:
    if: github.event.schedule == '0 4 * * 0'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:regression
```

```yaml
# Azure Pipelines: Schedule triggers
trigger: none  # Disable CI trigger for this pipeline

schedules:
  - cron: "0 2 * * 1-5"
    displayName: "Weekday nightly build"
    branches:
      include:
        - main
    always: false  # Only run if there are code changes since last run
  - cron: "0 4 * * 0"
    displayName: "Sunday full regression"
    branches:
      include:
        - main
    always: true  # Run even if no changes

pool:
  vmImage: "ubuntu-latest"

stages:
  - stage: NightlyBuild
    displayName: "Nightly build"
    jobs:
      - job: Build
        steps:
          - script: npm ci && npm run build
            displayName: "Build"

  - stage: FullRegression
    displayName: "Full regression tests"
    condition: eq(variables['Build.CronSchedule.DisplayName'], 'Sunday full regression')
    jobs:
      - job: Regression
        timeoutInMinutes: 120
        steps:
          - script: npm ci && npm run test:regression
            displayName: "Run full regression suite"
```

## Task 4: Pipeline and workflow completion triggers

Trigger pipelines when another pipeline completes:

```yaml
# GitHub Actions: Trigger on workflow completion
name: Deploy after tests pass

on:
  workflow_run:
    workflows: ["Backend CI", "Frontend CI"]
    types: [completed]
    branches: [main]

jobs:
  deploy:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
      - name: Deploy to staging
        run: echo "Deploying commit ${{ github.event.workflow_run.head_sha }}"

  notify-failure:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    runs-on: ubuntu-latest
    steps:
      - name: Notify team of failure
        run: |
          echo "Workflow ${{ github.event.workflow_run.name }} failed"
          echo "Branch: ${{ github.event.workflow_run.head_branch }}"
          echo "Commit: ${{ github.event.workflow_run.head_sha }}"
```

```yaml
# Azure Pipelines: Pipeline completion trigger via resources
resources:
  pipelines:
    - pipeline: backendCI
      source: "Backend-CI-Pipeline"
      trigger:
        branches:
          include:
            - main
        stages:
          - Test  # Only trigger when Test stage completes
    - pipeline: frontendCI
      source: "Frontend-CI-Pipeline"
      trigger:
        branches:
          include:
            - main

pool:
  vmImage: "ubuntu-latest"

jobs:
  - job: Deploy
    displayName: "Deploy after upstream success"
    steps:
      - download: backendCI
        artifact: drop
      - download: frontendCI
        artifact: dist
      - script: echo "Deploying artifacts from both pipelines"
        displayName: "Deploy"
```

## Task 5: Job dependencies and execution order

Define complex job dependency graphs:

```yaml
# GitHub Actions: Job dependencies with 'needs'
name: Complex build pipeline

on:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  integration-tests:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:integration

  # This job depends on BOTH test jobs completing
  build-image:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t contoso-api .

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-image
    environment: staging
    steps:
      - run: echo "Deploying to staging"

  # Fan-out: Multiple independent verification jobs
  smoke-tests:
    runs-on: ubuntu-latest
    needs: deploy-staging
    steps:
      - run: curl -f https://staging.contoso.com/health

  performance-tests:
    runs-on: ubuntu-latest
    needs: deploy-staging
    steps:
      - run: echo "Running load tests against staging"

  # Fan-in: Wait for all verification before production
  deploy-production:
    runs-on: ubuntu-latest
    needs: [smoke-tests, performance-tests]
    environment: production
    steps:
      - run: echo "Deploying to production"
```

```yaml
# Azure Pipelines: Stage dependencies with dependsOn
stages:
  - stage: Lint
    jobs:
      - job: LintJob
        steps:
          - script: npm run lint

  - stage: UnitTest
    dependsOn: Lint
    jobs:
      - job: UnitTestJob
        steps:
          - script: npm test

  - stage: IntegrationTest
    dependsOn: Lint
    jobs:
      - job: IntegrationTestJob
        steps:
          - script: npm run test:integration

  # Fan-in: depends on both test stages
  - stage: BuildImage
    dependsOn:
      - UnitTest
      - IntegrationTest
    jobs:
      - job: DockerBuild
        steps:
          - script: docker build -t contoso-api .

  - stage: DeployStaging
    dependsOn: BuildImage
    jobs:
      - deployment: Staging
        environment: staging
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to staging"

  - stage: DeployProduction
    dependsOn: DeployStaging
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: Production
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to production"
```

## Task 6: Matrix strategies for parallel execution

Run tests across multiple versions and platforms simultaneously:

```yaml
# GitHub Actions: Matrix strategy
name: Cross-platform tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20, 22]
        exclude:
          - os: macos-latest
            node-version: 18
        include:
          - os: ubuntu-latest
            node-version: 20
            coverage: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
      - name: Upload coverage
        if: matrix.coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
```

```yaml
# Azure Pipelines: Matrix strategy
jobs:
  - job: CrossPlatformTest
    strategy:
      matrix:
        linux_node20:
          vmImage: "ubuntu-latest"
          nodeVersion: "20.x"
        linux_node22:
          vmImage: "ubuntu-latest"
          nodeVersion: "22.x"
        windows_node20:
          vmImage: "windows-latest"
          nodeVersion: "20.x"
      maxParallel: 3
    pool:
      vmImage: $(vmImage)
    steps:
      - task: NodeTool@0
        inputs:
          versionSpec: $(nodeVersion)
      - script: npm ci && npm test
        displayName: "Test on $(vmImage) with Node $(nodeVersion)"
```

## Task 7: Conditional execution

Control job and step execution with conditions:

```yaml
# GitHub Actions: Conditional execution with 'if'
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      changed_frontend: ${{ steps.changes.outputs.frontend }}
      changed_backend: ${{ steps.changes.outputs.backend }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Detect changes
        id: changes
        run: |
          if git diff --name-only HEAD~1 | grep -q '^frontend/'; then
            echo "frontend=true" >> $GITHUB_OUTPUT
          else
            echo "frontend=false" >> $GITHUB_OUTPUT
          fi
          if git diff --name-only HEAD~1 | grep -q '^backend/'; then
            echo "backend=true" >> $GITHUB_OUTPUT
          else
            echo "backend=false" >> $GITHUB_OUTPUT
          fi

  deploy-frontend:
    needs: build
    if: needs.build.outputs.changed_frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying frontend changes"

  deploy-backend:
    needs: build
    if: needs.build.outputs.changed_backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying backend changes"

  # Always runs regardless of previous job status
  notify:
    needs: [deploy-frontend, deploy-backend]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Send notification
        if: contains(needs.*.result, 'failure')
        run: echo "One or more deployments failed"
```

```yaml
# Azure Pipelines: Conditions
stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - script: npm run build

  - stage: DeployStaging
    dependsOn: Build
    # Only deploy from main branch
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - job: Deploy
        steps:
          - script: echo "Deploying to staging"

  - stage: DeployProduction
    dependsOn: DeployStaging
    # Only deploy if tagged as release
    condition: and(succeeded(), startsWith(variables['Build.SourceBranch'], 'refs/tags/v'))
    jobs:
      - job: Deploy
        steps:
          - script: echo "Deploying to production"

  - stage: Notify
    dependsOn:
      - DeployStaging
      - DeployProduction
    # Run even if previous stages failed or were skipped
    condition: always()
    jobs:
      - job: NotifyTeam
        steps:
          - script: echo "Pipeline completed"
            condition: succeededOrFailed()
```

## Task 8: Manual triggers

Configure manual trigger workflows with parameters:

```yaml
# GitHub Actions: workflow_dispatch with inputs
name: Manual deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        type: choice
        options:
          - development
          - staging
          - production
      version:
        description: "Version tag to deploy"
        required: true
        type: string
      dry_run:
        description: "Perform a dry run without actual deployment"
        required: false
        type: boolean
        default: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.version }}
      - name: Deploy
        if: ${{ !inputs.dry_run }}
        run: |
          echo "Deploying ${{ inputs.version }} to ${{ inputs.environment }}"
      - name: Dry run
        if: ${{ inputs.dry_run }}
        run: |
          echo "DRY RUN: Would deploy ${{ inputs.version }} to ${{ inputs.environment }}"
```

```yaml
# Azure Pipelines: Manual trigger with runtime parameters
trigger: none  # No automatic trigger

parameters:
  - name: environment
    displayName: "Target environment"
    type: string
    default: staging
    values:
      - development
      - staging
      - production
  - name: version
    displayName: "Version to deploy"
    type: string
  - name: dryRun
    displayName: "Dry run (no actual deployment)"
    type: boolean
    default: false

stages:
  - stage: Deploy
    displayName: "Deploy to ${{ parameters.environment }}"
    jobs:
      - deployment: DeployJob
        environment: ${{ parameters.environment }}
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                  fetchDepth: 0
                - script: git checkout ${{ parameters.version }}
                  displayName: "Checkout version ${{ parameters.version }}"
                - ${{ if not(parameters.dryRun) }}:
                    - script: echo "Deploying ${{ parameters.version }}"
                      displayName: "Deploy"
                - ${{ if parameters.dryRun }}:
                    - script: echo "DRY RUN - would deploy ${{ parameters.version }}"
                      displayName: "Dry run"
```

## Break and fix

### Exercise 1: Trigger never fires

The following workflow never triggers despite pushes to `main` that include changes in `backend/`:

```yaml
name: Backend CI

on:
  push:
    branches: [main]
    paths:
      - "backend/**"
    paths-ignore:        # ERROR: Cannot use both paths and paths-ignore
      - "backend/docs/**"
```


<details>
<summary>Show solution</summary>

**Fix:** Use only `paths` with the ignore pattern removed, or handle exclusions differently. `paths` and `paths-ignore` are mutually exclusive:

```yaml
on:
  push:
    branches: [main]
    paths:
      - "backend/**"
      - "!backend/docs/**"  # Negation pattern to exclude
```

This uses the `!` negation prefix supported by GitHub Actions to exclude specific paths while still using `paths` filters.

</details>

### Exercise 2: Job dependency cycle

```yaml
jobs:
  test:
    needs: build       # ERROR: circular dependency
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  build:
    needs: test        # ERROR: circular dependency
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
```


<details>
<summary>Show solution</summary>

**Fix:** Remove the cycle. Build must come before test:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
```

</details>

### Exercise 3: Schedule never runs

An Azure Pipeline with a schedule trigger never executes:

```yaml
trigger:
  branches:
    include:
      - main

schedules:
  - cron: "0 2 * * *"
    displayName: "Nightly"
    branches:
      include:
        - develop    # ERROR: Schedule branch doesn't match trigger branch
    always: false    # Only runs if changes exist since last run
```


<details>
<summary>Show solution</summary>

**Fix:** Ensure the schedule branch is included in the pipeline trigger, or set `always: true`:

```yaml
trigger:
  branches:
    include:
      - main
      - develop

schedules:
  - cron: "0 2 * * *"
    displayName: "Nightly"
    branches:
      include:
        - main
    always: true
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "In GitHub Actions, what happens when both 'paths' and 'paths-ignore' are specified in a trigger?",
    options: [
      "'paths-ignore' takes precedence over 'paths'",
      "'paths' is evaluated first, then 'paths-ignore' filters the results",
      "The workflow fails validation because they are mutually exclusive",
      "Both are evaluated independently and combined with OR logic"
    ],
    correctIndex: 2,
    explanation: "GitHub Actions does not allow both paths and paths-ignore in the same trigger event. Specifying both results in a validation error. You must use one or the other. Use paths to include specific directories, or paths-ignore to exclude specific directories from triggering."
  },
  {
    question: "How does 'fail-fast' in a matrix strategy affect job execution?",
    options: [
      "It causes all running matrix jobs to be cancelled when any one job fails",
      "It prevents the matrix from starting if the first configuration fails",
      "It runs all jobs sequentially and stops at the first failure",
      "It only affects which results are reported, not execution"
    ],
    correctIndex: 0,
    explanation: "When fail-fast is set to true (the default), GitHub cancels all in-progress and queued matrix jobs as soon as any job in the matrix fails. Setting fail-fast: false allows all matrix jobs to complete regardless of individual failures, which is useful when you need results from all configurations."
  },
  {
    question: "In Azure Pipelines, what is the difference between 'condition: succeeded()' and 'condition: always()' on a stage?",
    options: [
      "'succeeded()' runs if the previous stage succeeded; 'always()' runs regardless of previous stage outcome",
      "'succeeded()' checks only the immediate predecessor; 'always()' checks all predecessors",
      "They are identical in behavior for stages",
      "'always()' ignores the 'dependsOn' requirement"
    ],
    correctIndex: 0,
    explanation: "succeeded() (the default condition) means the stage runs only if all of its dependencies (defined by dependsOn) completed successfully. always() means the stage runs regardless of whether dependencies succeeded, failed, or were cancelled. This is useful for notification or cleanup stages that must execute even after failures."
  },
  {
    question: "What is the correct way to trigger a GitHub Actions workflow when another workflow completes?",
    options: [
      "Use 'on: workflow_completed' with the workflow name",
      "Use 'on: workflow_run' with 'types: [completed]' and check the conclusion",
      "Use 'on: repository_dispatch' triggered by the upstream workflow",
      "Chain workflows using 'needs' across workflow files"
    ],
    correctIndex: 1,
    explanation: "The workflow_run event triggers when a referenced workflow run is requested, in progress, or completed. To act only on successful completions, add a condition checking github.event.workflow_run.conclusion == 'success'. The needs keyword only works between jobs within a single workflow file, not across workflows."
  }
]} />

## Cleanup

```bash
# Remove test workflow files
rm .github/workflows/frontend.yml
rm .github/workflows/backend.yml
rm .github/workflows/infra.yml
rm .github/workflows/nightly.yml

# Cancel any running scheduled workflow runs
gh run list --workflow=nightly.yml --status=in_progress --json databaseId --jq '.[].databaseId' | \
  xargs -I {} gh run cancel {}

# Disable scheduled workflows (via UI or by removing the schedule trigger)
gh workflow disable nightly.yml
```
