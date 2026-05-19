---
sidebar_position: 2
title: "Challenge 35: Pipeline optimization"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 35: Pipeline optimization

:::info Platform: comparison
This challenge covers both GitHub Actions and Azure Pipelines optimization techniques.
:::

## Exam skills mapped

- Optimize a pipeline for cost, time, performance, and reliability
- Optimize pipeline concurrency for performance and cost

## Scenario

Contoso Ltd's primary CI/CD pipeline currently has these performance characteristics:

- Total duration: 45 minutes average
- Monthly cost: $200 in GitHub Actions minutes (or Azure Pipelines hosted agent time)
- Job breakdown: Install deps (5 min), Lint (3 min), Unit tests (12 min), Integration tests (15 min), Docker build (8 min), Deploy (2 min)
- The pipeline runs 20 times per day

Target: Reduce pipeline duration to under 15 minutes and monthly cost below $100 while maintaining reliability.

The repository is a Node.js monorepo with 3 packages:

```
contoso-platform/
  packages/
    api/          (Express.js REST API)
    web/          (React frontend)
    shared/       (Shared utilities library)
  package.json
  package-lock.json
  Dockerfile.api
  Dockerfile.web
```

## Task 1: Implement caching (npm, Docker layers, actions/cache)

Add dependency and build caching to eliminate redundant work:

```yaml
# GitHub Actions - Optimized caching strategy
name: CI Pipeline (Optimized)

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "20"

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js with built-in cache
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"  # Automatically caches ~/.npm based on package-lock.json

      - name: Cache node_modules
        id: cache-modules
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-modules-${{ hashFiles('package-lock.json') }}

      - name: Install dependencies
        if: steps.cache-modules.outputs.cache-hit != 'true'
        run: npm ci

      # Persist node_modules for downstream jobs
      - name: Upload node_modules
        uses: actions/upload-artifact@v4
        with:
          name: node-modules
          path: node_modules
          retention-days: 1

  docker-build:
    runs-on: ubuntu-latest
    needs: [test-unit, lint]
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Cache Docker layers
        uses: actions/cache@v4
        with:
          path: /home/runner/.docker-cache
          key: ${{ runner.os }}-docker-${{ hashFiles('Dockerfile.api', 'package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-docker-

      - name: Build Docker image with layer cache
        uses: docker/build-push-action@v5
        with:
          context: .
          file: Dockerfile.api
          push: false
          tags: contoso-api:${{ github.sha }}
          cache-from: type=local,src=/home/runner/.docker-cache
          cache-to: type=local,dest=/home/runner/.docker-cache,mode=max
```

For Azure Pipelines, use the Cache task:

```yaml
# azure-pipelines.yml - Caching configuration
steps:
  - task: Cache@2
    displayName: "Cache npm packages"
    inputs:
      key: 'npm | "$(Agent.OS)" | package-lock.json'
      restoreKeys: |
        npm | "$(Agent.OS)"
      path: $(npm_config_cache)

  - task: Cache@2
    displayName: "Cache node_modules"
    inputs:
      key: 'node_modules | "$(Agent.OS)" | package-lock.json'
      path: node_modules

  - script: |
      if [ ! -d "node_modules" ]; then
        npm ci
      fi
    displayName: "Install dependencies (if cache miss)"

  # Docker layer caching with ACR
  - task: Docker@2
    displayName: "Build with ACR cache"
    inputs:
      command: build
      repository: contoso/api
      dockerfile: Dockerfile.api
      arguments: |
        --cache-from type=registry,ref=contosoregistry.azurecr.io/contoso/api:cache
        --cache-to type=registry,ref=contosoregistry.azurecr.io/contoso/api:cache,mode=max
```

## Task 2: Parallel job execution (split test suites)

Split tests across multiple parallel runners to reduce total time:

```yaml
# GitHub Actions - Parallel test execution
  test-unit:
    runs-on: ubuntu-latest
    needs: install
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]  # 4 parallel shards
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Download node_modules
        uses: actions/download-artifact@v4
        with:
          name: node-modules
          path: node_modules

      - name: Run unit tests (shard ${{ matrix.shard }}/4)
        run: |
          npx jest --ci --shard=${{ matrix.shard }}/4 \
            --coverage --coverageReporters=json \
            --outputFile=results-${{ matrix.shard }}.json

      - name: Upload coverage shard
        uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.shard }}
          path: coverage/coverage-final.json

  merge-coverage:
    runs-on: ubuntu-latest
    needs: test-unit
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      - run: npm ci

      - name: Download all coverage shards
        uses: actions/download-artifact@v4
        with:
          pattern: coverage-*
          merge-multiple: true
          path: coverage-parts/

      - name: Merge coverage reports
        run: |
          npx nyc merge coverage-parts/ coverage/merged.json
          npx nyc report --reporter=text --reporter=lcov \
            --temp-dir=coverage -t coverage
```

Azure Pipelines parallel test execution:

```yaml
# azure-pipelines.yml - Parallel strategy
jobs:
  - job: UnitTests
    displayName: "Unit tests"
    strategy:
      parallel: 4  # Azure DevOps auto-splits test files across 4 agents
    steps:
      - task: NodeTool@0
        inputs:
          versionSpec: "20.x"

      - script: npm ci
        displayName: "Install dependencies"

      # Azure Pipelines provides $(System.TotalJobsInPhase) and $(System.JobPositionInPhase)
      - script: |
          npx jest --ci \
            --shard=$(System.JobPositionInPhase)/$(System.TotalJobsInPhase) \
            --reporters=jest-junit
        displayName: "Run test shard"

      - task: PublishTestResults@2
        condition: always()
        inputs:
          testResultsFormat: "JUnit"
          testResultsFiles: "**/junit.xml"
```

## Task 3: Conditional job execution

Skip unnecessary work based on which files changed:

```yaml
# GitHub Actions - Path-based conditional execution
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      api: ${{ steps.filter.outputs.api }}
      web: ${{ steps.filter.outputs.web }}
      shared: ${{ steps.filter.outputs.shared }}
      docs_only: ${{ steps.filter.outputs.docs_only }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            api:
              - 'packages/api/**'
              - 'shared/**'
            web:
              - 'packages/web/**'
              - 'shared/**'
            shared:
              - 'packages/shared/**'
            docs_only:
              - '**/*.md'
              - 'docs/**'

  test-api:
    needs: [install, detect-changes]
    if: needs.detect-changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      - run: npm ci
      - run: npm run test --workspace=packages/api

  test-web:
    needs: [install, detect-changes]
    if: needs.detect-changes.outputs.web == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      - run: npm ci
      - run: npm run test --workspace=packages/web

  deploy:
    needs: [test-api, test-web, detect-changes]
    if: |
      always() &&
      needs.detect-changes.outputs.docs_only != 'true' &&
      (needs.test-api.result == 'success' || needs.test-api.result == 'skipped') &&
      (needs.test-web.result == 'success' || needs.test-web.result == 'skipped')
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying..."
```

## Task 4: Artifact optimization

Only pass necessary artifacts between jobs to reduce upload/download time:

```yaml
# BEFORE (inefficient): Uploading entire workspace
  - uses: actions/upload-artifact@v4
    with:
      name: workspace
      path: .  # Uploads everything including node_modules (500MB+)

# AFTER (optimized): Upload only build output
  build-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build --workspace=packages/api

      # Upload only the compiled output needed for deployment
      - uses: actions/upload-artifact@v4
        with:
          name: api-dist
          path: packages/api/dist/
          retention-days: 1  # Short retention for intermediate artifacts
          compression-level: 6  # Balance speed vs size

  deploy-api:
    needs: build-api
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: api-dist
          path: ./dist
      - run: |
          ls -la dist/  # Only contains compiled JS files (~5MB vs 500MB)
          # Deploy from dist/
```

For Docker builds, use multi-stage builds to minimize context:

```dockerfile
# Dockerfile.api - Optimized multi-stage build
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY packages/api/ ./packages/api/
COPY packages/shared/ ./packages/shared/
RUN npm run build --workspace=packages/api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/api/dist ./dist
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Task 5: Self-hosted runner cost analysis

Compare hosted vs self-hosted runners for cost optimization:

```yaml
# GitHub Actions hosted runner pricing (as of 2024):
# Linux: $0.008/minute
# Windows: $0.016/minute
# macOS: $0.08/minute

# Current spend: 20 runs/day * 45 min * $0.008 = $7.20/day = ~$216/month

# With optimization (target 15 min):
# 20 runs/day * 15 min * $0.008 = $2.40/day = ~$72/month

# Self-hosted runner analysis:
# Azure VM (Standard_D4s_v3, 4 vCPU, 16GB): ~$140/month
# Handles unlimited minutes but needs maintenance
# Break-even: ~$140/$0.008 = 17,500 minutes/month
# Current usage: 20 * 45 * 22 working days = 19,800 min/month (worth self-hosting)
# After optimization: 20 * 15 * 22 = 6,600 min/month (stay hosted)
```

Configure a self-hosted runner for specific workloads:

```yaml
# Use self-hosted for expensive/long jobs, hosted for short ones
jobs:
  lint:
    runs-on: ubuntu-latest  # Short job, use hosted
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

  integration-tests:
    runs-on: [self-hosted, linux, x64]  # Long job, use self-hosted
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration
```

## Task 6: Azure Pipelines caching and parallel jobs

Azure Pipelines-specific optimization patterns:

```yaml
# azure-pipelines.yml - Fully optimized pipeline
trigger:
  branches:
    include: [main]
  paths:
    exclude:
      - "**/*.md"
      - "docs/**"

pool:
  vmImage: "ubuntu-latest"

variables:
  npm_config_cache: $(Pipeline.Workspace)/.npm

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        steps:
          - task: Cache@2
            displayName: "Restore npm cache"
            inputs:
              key: 'npm | "$(Agent.OS)" | package-lock.json'
              restoreKeys: |
                npm | "$(Agent.OS)"
              path: $(npm_config_cache)

          - script: npm ci
            displayName: "Install dependencies"

          - script: npm run lint
            displayName: "Lint"

          - script: npm run build
            displayName: "Build"

          - publish: $(System.DefaultWorkingDirectory)/dist
            artifact: build-output
            displayName: "Publish build artifact"

      # Parallel test jobs (requires parallel job licenses)
      - job: UnitTests
        dependsOn: []  # Run in parallel with BuildAndTest
        strategy:
          parallel: 2
        steps:
          - task: Cache@2
            inputs:
              key: 'npm | "$(Agent.OS)" | package-lock.json'
              path: $(npm_config_cache)

          - script: npm ci
            displayName: "Install dependencies"

          - script: |
              npx jest --ci --shard=$(System.JobPositionInPhase)/$(System.TotalJobsInPhase)
            displayName: "Run test shard"
```

Understand Azure Pipelines parallel job pricing:

```
# Azure Pipelines parallel jobs:
# Free tier: 1 Microsoft-hosted parallel job (1800 min/month)
# Additional: $40/month per parallel job (unlimited minutes)
#
# Cost calculation for Contoso:
# Current: 1 job * 45 min * 20 runs = 900 min/day (exceeds free tier)
# With 4 parallel jobs: $120/month but 15 min total duration
# ROI: Developer time saved = 30 min * 20 runs * 22 days = 220 hours/month
```

## Task 7: Incremental builds (monorepo optimization)

Only build and test packages that have changed:

```yaml
# GitHub Actions - Turborepo for monorepo incremental builds
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2  # Need previous commit for comparison

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      # Use Turborepo remote cache for incremental builds
      - name: Build with Turborepo (incremental)
        run: npx turbo run build --filter='...[HEAD~1]'
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: contoso

      - name: Test only affected packages
        run: npx turbo run test --filter='...[HEAD~1]'
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: contoso
```

Alternative using `nx affected` for monorepos:

```yaml
      - name: Determine affected projects
        id: affected
        run: |
          AFFECTED=$(npx nx show projects --affected --base=HEAD~1 --head=HEAD)
          echo "projects=$AFFECTED" >> $GITHUB_OUTPUT
          if [ -z "$AFFECTED" ]; then
            echo "skip=true" >> $GITHUB_OUTPUT
          fi

      - name: Build affected projects
        if: steps.affected.outputs.skip != 'true'
        run: npx nx affected --target=build --base=HEAD~1 --head=HEAD

      - name: Test affected projects
        if: steps.affected.outputs.skip != 'true'
        run: npx nx affected --target=test --base=HEAD~1 --head=HEAD
```

## Break and fix

### Exercise 1: Fix the broken cache

The pipeline always reports cache miss despite having a cache configuration:

```yaml
# BROKEN: Cache key never matches
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package.json') }}  # ERROR: Wrong file
    # package.json changes with every version bump
    # Should use package-lock.json which only changes when deps change
```

**Fix:**

```yaml
# FIXED: Use lock file for stable cache key
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

### Exercise 2: Fix parallel jobs producing incomplete coverage

Test sharding works but the coverage report shows only 25% (one shard's coverage):

```yaml
# BROKEN: Each shard overwrites the same coverage file
- name: Upload coverage
  uses: actions/upload-artifact@v4
  with:
    name: coverage  # ERROR: Same name across all shards - last one wins
    path: coverage/
```

**Fix:**

```yaml
# FIXED: Unique artifact names per shard, then merge
- name: Upload coverage shard
  uses: actions/upload-artifact@v4
  with:
    name: coverage-shard-${{ matrix.shard }}  # Unique per shard
    path: coverage/coverage-final.json

# In a subsequent job:
- uses: actions/download-artifact@v4
  with:
    pattern: coverage-shard-*
    merge-multiple: true
    path: all-coverage/

- name: Merge and report
  run: |
    npx nyc merge all-coverage/ .nyc_output/merged.json
    npx nyc report --reporter=text-summary --reporter=lcov
```

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the most effective caching strategy for npm dependencies in a CI pipeline?",
    options: [
      "Cache the '~/.npm' directory keyed on 'package.json'",
      "Cache 'node_modules' keyed on 'package-lock.json' with a fallback restore key",
      "Cache the entire workspace directory",
      "Download dependencies from a private registry mirror"
    ],
    correctIndex: 1,
    explanation: "Caching node_modules keyed on package-lock.json provides the best balance. The lock file changes only when dependencies actually change (unlike package.json which changes on version bumps). A restore key like $\{\{ runner.os \}\}-modules- provides partial matches when the lock file changes, giving a warm cache even after dependency updates."
  },
  {
    question: "How does test sharding reduce pipeline duration?",
    options: [
      "It runs fewer tests by sampling a subset of the test suite",
      "It splits the test suite across multiple parallel runners, reducing wall-clock time proportionally",
      "It skips tests that passed in the previous run",
      "It runs tests faster by reducing test isolation"
    ],
    correctIndex: 1,
    explanation: "Test sharding divides the full test suite into N equal parts and runs each part on a separate runner simultaneously. With 4 shards, a 12-minute test suite takes approximately 3 minutes of wall-clock time. All tests still run; only the elapsed time is reduced by parallelization."
  },
  {
    question: "When should you choose self-hosted runners over hosted runners?",
    options: [
      "Always, because self-hosted runners are faster",
      "When monthly hosted runner costs exceed the cost of maintaining a VM, or when you need specialized hardware/software",
      "Only for production deployments",
      "When you need access to the public internet"
    ],
    correctIndex: 1,
    explanation: "Self-hosted runners make economic sense when hosted runner usage exceeds the break-even point (total cost of the VM + maintenance overhead). They also provide benefits like persistent caches, specialized hardware (GPU, ARM), access to private networks, and pre-installed tooling that would otherwise slow down each run."
  },
  {
    question: "What is the primary benefit of conditional job execution based on file paths?",
    options: [
      "It reduces repository storage by removing unchanged files",
      "It prevents merge conflicts in the changed files",
      "It avoids running expensive jobs (tests, builds, deploys) when changes do not affect those components",
      "It automatically approves pull requests that only change documentation"
    ],
    correctIndex: 2,
    explanation: "Path-based filtering skips jobs that are not relevant to the changed files. A documentation-only change should not trigger a 15-minute integration test suite. This reduces both cost (fewer minutes consumed) and developer wait time (faster PR feedback), while ensuring that meaningful changes still get full validation."
  }
]} />

## Cleanup

```bash
# Remove cached artifacts
gh cache list --json key --jq '.[].key' | \
  xargs -I {} gh cache delete "{}"

# Remove Turborepo remote cache (if using Vercel)
# This is managed via the Vercel dashboard

# Clean up self-hosted runner (if provisioned)
# Remove from GitHub Settings > Actions > Runners first, then delete VM
az vm delete --resource-group rg-contoso-runners --name vm-runner-01 --yes
az group delete --name rg-contoso-runners --yes --no-wait
```
