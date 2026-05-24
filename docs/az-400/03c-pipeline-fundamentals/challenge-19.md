---
sidebar_position: 1
title: "Challenge 19: GitHub Actions fundamentals"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 19: GitHub Actions fundamentals

:::info Platform: GitHub-first
This challenge focuses on GitHub Actions. Azure DevOps equivalents are noted where relevant.
:::

## Exam skills mapped

- Select a deployment automation solution, including GitHub Actions
- Develop pipelines by using YAML

## Scenario

Contoso Ltd is migrating their CI/CD pipelines from Jenkins to GitHub Actions. Their primary application is a Node.js REST API (Express.js) that is containerized and deployed to Azure App Service. The team needs a complete workflow that handles building, testing, container image creation, and staged deployments.

The repository structure:

```text
contoso-api/
  src/
    index.js
    routes/
    middleware/
  tests/
    unit/
    integration/
  Dockerfile
  package.json
  .github/
    workflows/
    actions/
```

## Task 1: Create the CI workflow with build and test stages

Create `.github/workflows/ci-cd.yml` with triggers for push to `main` and pull requests:

```yaml
name: Contoso API CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        default: "staging"
        type: choice
        options:
          - staging
          - production
      skip_tests:
        description: "Skip test execution"
        required: false
        type: boolean
        default: false

env:
  NODE_VERSION: "20.x"
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    name: Build and lint
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}
      sha_short: ${{ steps.version.outputs.sha_short }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Generate version info
        id: version
        run: |
          VERSION=$(node -p "require('./package.json').version")
          SHA_SHORT=$(git rev-parse --short HEAD)
          echo "version=${VERSION}" >> $GITHUB_OUTPUT
          echo "sha_short=${SHA_SHORT}" >> $GITHUB_OUTPUT

      - name: Build application
        run: npm run build

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
          retention-days: 5

  test:
    name: Run tests
    needs: build
    runs-on: ubuntu-latest
    if: ${{ !inputs.skip_tests }}
    strategy:
      matrix:
        test-type: [unit, integration]
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run ${{ matrix.test-type }} tests
        run: npm run test:${{ matrix.test-type }}
        env:
          REDIS_URL: redis://localhost:6379
          CI: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-${{ matrix.test-type }}
          path: coverage/
```

## Task 2: Add Docker build and push to GitHub Container Registry

Add a job that builds and pushes the container image:

```yaml
  docker:
    name: Build and push container image
    needs: [build, test]
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    outputs:
      image_tag: ${{ steps.meta.outputs.tags }}
      image_digest: ${{ steps.push.outputs.digest }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata for Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=semver,pattern={{version}},value=${{ needs.build.outputs.version }}
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push image
        id: push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NODE_VERSION=${{ env.NODE_VERSION }}
            BUILD_SHA=${{ needs.build.outputs.sha_short }}
```

## Task 3: Deploy to Azure App Service with staging and production

Add deployment jobs using environments:

```yaml
  deploy-staging:
    name: Deploy to staging
    needs: docker
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://contoso-api-staging.azurewebsites.net
    steps:
      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Azure App Service (staging slot)
        uses: azure/webapps-deploy@v3
        with:
          app-name: contoso-api
          slot-name: staging
          images: ${{ needs.docker.outputs.image_tag }}

      - name: Run smoke tests against staging
        run: |
          for i in {1..10}; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://contoso-api-staging.azurewebsites.net/health)
            if [ "$STATUS" = "200" ]; then
              echo "Staging is healthy"
              exit 0
            fi
            echo "Attempt $i: Status $STATUS, retrying..."
            sleep 10
          done
          echo "Staging health check failed"
          exit 1

  deploy-production:
    name: Deploy to production
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://contoso-api.azurewebsites.net
    steps:
      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Swap staging slot to production
        run: |
          az webapp deployment slot swap \
            --resource-group contoso-rg \
            --name contoso-api \
            --slot staging \
            --target-slot production
```

## Task 4: Create a composite action for reusable steps

Create `.github/actions/setup-node-project/action.yml`:

```yaml
name: "Setup Node.js project"
description: "Installs Node.js, caches dependencies, and runs npm ci"

inputs:
  node-version:
    description: "Node.js version to use"
    required: false
    default: "20.x"
  working-directory:
    description: "Working directory for npm commands"
    required: false
    default: "."

outputs:
  cache-hit:
    description: "Whether npm cache was hit"
    value: ${{ steps.cache.outputs['cache-hit'] }}

runs:
  using: "composite"
  steps:
    - name: Set up Node.js ${{ inputs.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}

    - name: Get npm cache directory
      id: npm-cache-dir
      shell: bash
      run: echo "dir=$(npm config get cache)" >> $GITHUB_OUTPUT

    - name: Cache npm dependencies
      id: cache
      uses: actions/cache@v4
      with:
        path: ${{ steps['npm-cache-dir'].outputs.dir }}
        key: ${{ runner.os }}-node-${{ inputs.node-version }}-${{ hashFiles('**/package-lock.json') }}
        restore-keys: |
          ${{ runner.os }}-node-${{ inputs.node-version }}-

    - name: Install dependencies
      shell: bash
      working-directory: ${{ inputs.working-directory }}
      run: npm ci
```

Use the composite action in the workflow:

```yaml
      - name: Setup project
        uses: ./.github/actions/setup-node-project
        with:
          node-version: ${{ env.NODE_VERSION }}
```

## Task 5: Configure secrets and environment variables

Configure the following secrets and variables at the repository and environment levels:

```bash
# Repository secrets (available to all workflows)
gh secret set AZURE_CREDENTIALS --body '{"clientId":"...","clientSecret":"...","subscriptionId":"...","tenantId":"..."}'

# Environment-specific secrets
gh secret set DB_CONNECTION_STRING --env staging --body "Server=staging-db.database.windows.net;..."
gh secret set DB_CONNECTION_STRING --env production --body "Server=prod-db.database.windows.net;..."

# Repository variables
gh variable set APP_NAME --body "contoso-api"
gh variable set AZURE_RESOURCE_GROUP --body "contoso-rg"

# Environment variables
gh variable set APP_SERVICE_PLAN --env staging --body "contoso-plan-staging"
gh variable set APP_SERVICE_PLAN --env production --body "contoso-plan-prod"
```

## Break & fix

### Exercise 1: Fix the failing workflow

The following workflow has errors. Identify and fix them:

```yaml
name: Broken Workflow

on:
  push:
    branches: main    # ERROR 1: Should be an array [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set output
        run: echo "result=success" >> $GITHUB_OUTPUT  # ERROR 2: Missing id field

      - name: Use output
        run: echo ${{ steps.set-output.outputs.result }}  # ERROR 3: step id doesn't match

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.APP_NAME }}  # ERROR 4: env context not available, use vars
          images: ${{ needs.build.outputs.image }}  # ERROR 5: build job has no outputs defined
```

**Corrected version:**

```yaml
name: Fixed Workflow

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps['set-output'].outputs.result }}
    steps:
      - uses: actions/checkout@v4

      - name: Set output
        id: set-output
        run: echo "result=success" >> $GITHUB_OUTPUT

      - name: Use output
        run: echo ${{ steps['set-output'].outputs.result }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ vars.APP_NAME }}
          images: ${{ needs.build.outputs.image }}
```

### Exercise 2: Debug the permissions issue

A workflow that pushes to GHCR fails with `denied: permission_denied`. The workflow file contains:

```yaml
permissions:
  contents: read
```


<details>
<summary>Show solution</summary>

**Fix:** Add `packages: write` permission to allow pushing to GHCR:

```yaml
permissions:
  contents: read
  packages: write
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "In GitHub Actions, what is the correct way to pass data between jobs?",
    options: [
      "Use environment variables set with 'export'",
      "Write to a shared file in the workspace",
      "Use job outputs with '$GITHUB_OUTPUT' and the 'needs' context",
      "Use repository variables as intermediary storage"
    ],
    correctIndex: 2,
    explanation: "Job outputs are defined using echo \"key=value\" >> $GITHUB_OUTPUT in a step with an id, declared in the job's outputs section, and consumed in downstream jobs using ${{ needs.job_id.outputs.key }}. Environment variables and workspace files do not persist between jobs since each job runs on a fresh runner."
  },
  {
    question: "Which trigger configuration allows manual workflow execution with custom parameters?",
    options: [
      "'on: manual'",
      "'on: workflow_dispatch' with 'inputs'",
      "'on: repository_dispatch' with 'inputs'",
      "'on: push' with 'if: github.event.manual'"
    ],
    correctIndex: 1,
    explanation: "workflow_dispatch allows manual triggering from the GitHub UI or API with typed inputs (string, boolean, choice, environment). repository_dispatch is triggered via the API with a client_payload but does not provide the same UI-driven input experience."
  },
  {
    question: "What is the primary advantage of a composite action over a reusable workflow?",
    options: [
      "Composite actions can use secrets directly",
      "Composite actions run in the same job, sharing the workspace and runner",
      "Composite actions support matrix strategies",
      "Composite actions can trigger other workflows"
    ],
    correctIndex: 1,
    explanation: "Composite actions run as steps within the calling job, meaning they share the same workspace, environment variables, and runner. Reusable workflows run as a separate job (or set of jobs) with their own runner instance. This makes composite actions better for grouping related steps that need shared state."
  },
  {
    question: "Which 'permissions' value is required for a workflow to push container images to GitHub Container Registry (ghcr.io)?",
    options: [
      "'contents: write'",
      "'packages: write'",
      "'deployments: write'",
      "'registry: write'"
    ],
    correctIndex: 1,
    explanation: "GHCR uses the packages permission scope. The workflow needs packages: write to push images and packages: read to pull them. When permissions is explicitly set, only the listed permissions are granted (principle of least privilege)."
  }
]} />

## Cleanup

```bash
# Remove the test workflow runs (optional)
gh run list --workflow=ci-cd.yml --limit 5 --json databaseId --jq '.[].databaseId' | \
  xargs -I {} gh run delete {}

# Delete environment if no longer needed
gh api --method DELETE repos/{owner}/{repo}/environments/staging
gh api --method DELETE repos/{owner}/{repo}/environments/production

# Remove GHCR images
gh api --method DELETE /user/packages/container/contoso-api/versions/{version_id}
```
