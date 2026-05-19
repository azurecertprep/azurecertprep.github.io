---
sidebar_position: 1
title: "Challenge 16: Testing strategy in pipelines"
---

# Challenge 16: Testing strategy in pipelines

:::info Platform: GitHub Actions-first
Primary walkthrough uses GitHub Actions. Azure Pipelines equivalent noted where applicable.
:::

## Exam skills measured

- Design a comprehensive testing strategy, including local tests, unit tests, integration tests, and load tests
- Implement tests in a pipeline, including configuring test tasks, configuring test agents, and integration of test results

---

## Scenario

Contoso Ltd operates an e-commerce platform that deploys three times daily. The team has no automated testing in their CI/CD pipeline. Over the past month, four deployments introduced regressions that broke production checkout flows.

The CTO has issued a mandate: "Nothing reaches production without passing automated tests at every layer."

You are the DevOps engineer responsible for implementing a testing pyramid in the CI pipeline:

- **Unit tests** -- fast, isolated, no external dependencies
- **Integration tests** -- API endpoints validated against a real PostgreSQL database
- **Load tests** -- performance baseline ensuring the checkout API handles expected traffic

The application is a Node.js Express API with a PostgreSQL backend, hosted in the `contoso-ecommerce` repository.

---

## Tasks

### Task 1: Create the testing workflow with a matrix strategy

Create `.github/workflows/test-pipeline.yml` that runs unit tests across multiple Node.js versions:

```yaml
name: Test Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
      fail-fast: false

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests with coverage
        run: npx jest --coverage --ci --reporters=default --reporters=jest-junit
        env:
          JEST_JUNIT_OUTPUT_DIR: ./reports
          JEST_JUNIT_OUTPUT_NAME: junit-results.xml

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-node-${{ matrix.node-version }}
          path: ./reports/junit-results.xml

      - name: Upload coverage report
        if: matrix.node-version == 20
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: ./coverage/lcov.info
```

### Task 2: Configure Jest for unit testing with coverage

Create `jest.config.js`:

```javascript
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.js', '**/*.spec.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/__tests__/**',
    '!src/**/index.js',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'cobertura'],
  reporters: ['default', 'jest-junit'],
};
```

Add required dev dependencies:

```bash
npm install --save-dev jest jest-junit @types/jest
```

### Task 3: Add integration tests with a PostgreSQL service container

Add the integration test job to the workflow:

```yaml
  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests

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

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npx knex migrate:latest
        env:
          DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test

      - name: Seed test data
        run: npx knex seed:run
        env:
          DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test

      - name: Run integration tests
        run: npx jest --config jest.integration.config.js --ci --forceExit
        env:
          DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test
          API_PORT: 3001
          NODE_ENV: test

      - name: Upload integration test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: ./reports/integration-junit.xml
```

### Task 4: Add k6 load tests

Create `load-tests/checkout-load.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

  const cartPayload = JSON.stringify({
    items: [{ productId: 'PROD-001', quantity: 2 }],
  });

  const cartRes = http.post(`${baseUrl}/api/cart`, cartPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(cartRes, {
    'cart created': (r) => r.status === 201,
    'cart has id': (r) => r.json('id') !== undefined,
  });

  sleep(1);
}
```

Add the load test job to the workflow:

```yaml
  load-tests:
    runs-on: ubuntu-latest
    needs: integration-tests

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

      - name: Install dependencies
        run: npm ci

      - name: Setup database
        run: |
          npx knex migrate:latest
          npx knex seed:run
        env:
          DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test

      - name: Start application server
        run: |
          npm start &
          sleep 5
          curl --retry 10 --retry-delay 2 --retry-connrefused http://localhost:3000/health
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
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load tests
        run: k6 run load-tests/checkout-load.js --out json=load-test-results.json
        env:
          BASE_URL: http://localhost:3000

      - name: Upload load test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: load-test-results
          path: load-test-results.json
```

### Task 5: Post test results as PR comments

Add a job that comments test results on pull requests:

```yaml
  report-results:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests, load-tests]
    if: github.event_name == 'pull_request'

    permissions:
      pull-requests: write

    steps:
      - name: Download all test artifacts
        uses: actions/download-artifact@v4
        with:
          path: ./artifacts

      - name: Post test summary to PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const path = require('path');

            let summary = '## Test Results Summary\n\n';
            summary += '| Suite | Status |\n|-------|--------|\n';
            summary += '| Unit Tests (Node 18) | Passed |\n';
            summary += '| Unit Tests (Node 20) | Passed |\n';
            summary += '| Unit Tests (Node 22) | Passed |\n';
            summary += '| Integration Tests | Passed |\n';
            summary += '| Load Tests | Passed |\n';

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: summary
            });
```

### Task 6: Azure Pipelines equivalent

For teams using Azure DevOps, configure the equivalent pipeline in `azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: UnitTests
    displayName: 'Unit tests'
    jobs:
      - job: Test
        strategy:
          matrix:
            Node18:
              nodeVersion: '18.x'
            Node20:
              nodeVersion: '20.x'
            Node22:
              nodeVersion: '22.x'

        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '$(nodeVersion)'
            displayName: 'Install Node.js $(nodeVersion)'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: npx jest --coverage --ci --reporters=default --reporters=jest-junit
            displayName: 'Run unit tests'
            env:
              JEST_JUNIT_OUTPUT_DIR: $(System.DefaultWorkingDirectory)/results
              JEST_JUNIT_OUTPUT_NAME: junit.xml

          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '**/junit.xml'
              mergeTestResults: true
              testRunTitle: 'Unit Tests - Node $(nodeVersion)'
            condition: always()

          - task: PublishCodeCoverageResults@2
            inputs:
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/coverage/cobertura-coverage.xml'
            condition: eq(variables['nodeVersion'], '20.x')

  - stage: IntegrationTests
    displayName: 'Integration tests'
    dependsOn: UnitTests
    jobs:
      - job: IntegrationTest
        services:
          postgres:
            image: postgres:16
            ports:
              - 5432:5432
            env:
              POSTGRES_USER: contoso_test
              POSTGRES_PASSWORD: test_password_ci
              POSTGRES_DB: ecommerce_test

        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: |
              npx knex migrate:latest
              npx knex seed:run
            displayName: 'Setup database'
            env:
              DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test

          - script: npx jest --config jest.integration.config.js --ci --forceExit
            displayName: 'Run integration tests'
            env:
              DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test
              API_PORT: 3001
              NODE_ENV: test

          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '**/integration-junit.xml'
              testRunTitle: 'Integration Tests'
            condition: always()

  - stage: LoadTests
    displayName: 'Load tests'
    dependsOn: IntegrationTests
    jobs:
      - job: LoadTest
        steps:
          - script: |
              sudo gpg -k
              sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
                --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
              echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
                | sudo tee /etc/apt/sources.list.d/k6.list
              sudo apt-get update && sudo apt-get install k6
            displayName: 'Install k6'

          - script: k6 run load-tests/checkout-load.js --out json=results.json
            displayName: 'Run load tests'
            env:
              BASE_URL: http://localhost:3000

          - task: PublishPipelineArtifact@1
            inputs:
              targetPath: 'results.json'
              artifactName: 'load-test-results'
```

---

## Break and fix

### The problem

After implementing the workflow, tests pass locally on developer machines but fail in CI with the following errors:

**Symptom 1:** Integration tests fail with `ECONNREFUSED 127.0.0.1:5432`

**Symptom 2:** Unit tests fail on Node.js 22 with `TypeError: fetch is not defined`

**Symptom 3:** Load tests report 100% failure rate despite the application starting

---

### Root cause analysis

**Issue 1: Service container not ready**

The PostgreSQL service container takes time to initialize. Even though the workflow defines health checks, the application migration step begins before the database accepts connections.

The health check options only ensure the container is running, not that it is ready for the specific test database.

**Issue 2: Node.js version compatibility**

The application uses a polyfill for `fetch` that conflicts with Node.js 22's built-in `fetch`. The test configuration does not account for version differences in global APIs.

**Issue 3: Server startup race condition**

The load test job starts k6 before the Express server finishes binding to port 3000. The `sleep 5` is insufficient on CI runners under load.

---

### Fix

**Fix 1:** Add an explicit wait-for-database step before migrations:

```yaml
      - name: Wait for PostgreSQL
        run: |
          for i in $(seq 1 30); do
            pg_isready -h localhost -p 5432 -U contoso_test && break
            echo "Waiting for postgres... attempt $i"
            sleep 2
          done
```

**Fix 2:** Conditionally handle the fetch polyfill in test setup:

```javascript
// jest.setup.js
if (typeof globalThis.fetch === 'undefined') {
  const { fetch, Headers, Request, Response } = require('undici');
  globalThis.fetch = fetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
}
```

**Fix 3:** Replace `sleep` with a retry loop that confirms the server responds:

```yaml
      - name: Start application server
        run: |
          npm start &
          for i in $(seq 1 30); do
            if curl -s http://localhost:3000/health > /dev/null 2>&1; then
              echo "Server is ready"
              break
            fi
            echo "Waiting for server... attempt $i"
            sleep 2
          done
          curl -f http://localhost:3000/health || exit 1
        env:
          DATABASE_URL: postgres://contoso_test:test_password_ci@localhost:5432/ecommerce_test
          API_PORT: 3000
```

---

## Knowledge check

1. **In a GitHub Actions workflow using a matrix strategy, what does `fail-fast: false` accomplish?**
   - A. It prevents the workflow from running if any matrix combination is invalid
   - B. It allows all matrix combinations to complete even if one fails
   - C. It runs matrix combinations sequentially instead of in parallel
   - D. It skips test reporting for failed matrix combinations

   <details>
   <summary>Show answer</summary>

   **B.** By default, GitHub Actions cancels all in-progress matrix jobs when any one fails. Setting `fail-fast: false` allows all combinations to run to completion, which is important when testing compatibility across multiple versions -- you want to know which versions pass and which fail.

   </details>

2. **Which health check configuration ensures a PostgreSQL service container is ready before workflow steps execute?**
   - A. Setting `ports: ['5432:5432']` in the service definition
   - B. Adding `options: --health-cmd="pg_isready" --health-interval=10s --health-retries=5`
   - C. Using `needs: postgres` in the job definition
   - D. Configuring `services.postgres.ready: true`

   <details>
   <summary>Show answer</summary>

   **B.** The `options` field passes Docker health check arguments to the container. GitHub Actions waits for the health check to pass before proceeding with job steps. `pg_isready` is the standard PostgreSQL readiness probe.

   </details>

3. **In Azure Pipelines, which task publishes JUnit test results so they appear in the Tests tab?**
   - A. `PublishPipelineArtifact@1`
   - B. `PublishTestResults@2`
   - C. `PublishCodeCoverageResults@2`
   - D. `DownloadBuildArtifacts@1`

   <details>
   <summary>Show answer</summary>

   **B.** The `PublishTestResults@2` task parses JUnit, NUnit, VSTest, xUnit, or CTest format files and publishes them to the Azure Pipelines Tests tab. `PublishCodeCoverageResults@2` is specifically for coverage data, not test pass/fail results.

   </details>

4. **What is the primary purpose of k6 thresholds in a CI pipeline?**
   - A. To set the number of virtual users for the test
   - B. To define pass/fail criteria that determine the exit code of the k6 process
   - C. To configure the duration of each load test stage
   - D. To specify which endpoints to test

   <details>
   <summary>Show answer</summary>

   **B.** Thresholds define SLO-based pass/fail criteria. If any threshold is breached, k6 exits with a non-zero code, which causes the CI step to fail. This enables automated performance regression detection in the pipeline.

   </details>

---

## Cleanup

Remove the test infrastructure after completing the challenge:

```bash
# Remove the workflow file
rm .github/workflows/test-pipeline.yml

# Remove test configuration files
rm jest.config.js jest.integration.config.js jest.setup.js

# Remove load test files
rm -rf load-tests/

# Remove Azure Pipelines file if created
rm -f azure-pipelines.yml

# Remove test dependencies
npm uninstall jest jest-junit @types/jest undici

# Clean up generated reports
rm -rf coverage/ reports/
```

# Challenge 16: Testing strategy in pipelines

:::info Platform: GitHub Actions-first

:::

## Exam skills

- Design a comprehensive testing strategy, including local tests, unit tests, integration tests, and load tests
- Implement tests in a pipeline

## Scenario

Contoso's e-commerce platform has zero automated tests in the pipeline. Deployments frequently break production. Design and implement a testing pyramid within the CI pipeline.

## Coming soon

This challenge is under development.
