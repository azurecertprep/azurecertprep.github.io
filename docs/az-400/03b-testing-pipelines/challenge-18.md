---
sidebar_position: 3
title: "Challenge 18: Code coverage analysis"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 18: Code coverage analysis

:::info Platform: GitHub Actions-first
Primary walkthrough uses GitHub Actions. Azure Pipelines equivalent noted where applicable.
:::

## Exam skills measured

- Implement code coverage analysis
- Configure and integrate code coverage tools with CI/CD pipelines
- Design quality gates based on coverage metrics

---

## Scenario

Contoso Ltd's engineering director has observed a pattern: services with low test coverage experience three times more production incidents. A new policy is now in effect:

1. No pull request merges if overall line coverage drops below 80%
2. Coverage must not decrease compared to the base branch (ratchet policy)
3. New code in a PR must have at least 90% coverage (diff coverage)
4. Coverage trends must be visible to the team across sprints

The platform team manages three services in different languages:
- **Checkout API** (Node.js, Jest)
- **Inventory service** (Python, pytest)
- **Payment gateway** (.NET, xUnit)

You must implement coverage collection, enforcement, and reporting across all three stacks.

---

## Tasks

### Task 1: Configure Jest coverage for the Node.js service

Create `jest.config.js` with coverage settings:

```javascript
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/__tests__/**',
    '!src/**/index.js',
    '!src/migrations/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'cobertura', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

Create the GitHub Actions workflow `.github/workflows/coverage.yml`:

```yaml
name: Code Coverage

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  coverage-node:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./services/checkout-api

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: './services/checkout-api/package-lock.json'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npx jest --coverage --ci

      - name: Upload coverage to artifact
        uses: actions/upload-artifact@v4
        with:
          name: coverage-node
          path: services/checkout-api/coverage/

      - name: Coverage summary comment
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const summary = JSON.parse(
              fs.readFileSync('services/checkout-api/coverage/coverage-summary.json', 'utf8')
            );
            const { lines, branches, functions, statements } = summary.total;

            const body = `## Checkout API coverage report

            | Metric | Coverage | Threshold | Status |
            |--------|----------|-----------|--------|
            | Lines | ${lines.pct}% | 80% | ${lines.pct >= 80 ? 'Passed' : 'FAILED'} |
            | Branches | ${branches.pct}% | 80% | ${branches.pct >= 80 ? 'Passed' : 'FAILED'} |
            | Functions | ${functions.pct}% | 80% | ${functions.pct >= 80 ? 'Passed' : 'FAILED'} |
            | Statements | ${statements.pct}% | 80% | ${statements.pct >= 80 ? 'Passed' : 'FAILED'} |`;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: body
            });
```

### Task 2: Configure pytest coverage for the Python service

Create `services/inventory-service/pyproject.toml` coverage configuration:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "--cov=src --cov-report=xml:coverage/coverage.xml --cov-report=html:coverage/html --cov-report=term-missing --cov-fail-under=80"

[tool.coverage.run]
source = ["src"]
omit = [
    "src/migrations/*",
    "src/__init__.py",
    "tests/*",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "if __name__ == .__main__.",
    "raise NotImplementedError",
    "pass",
]
fail_under = 80
show_missing = true
```

Add the Python coverage job to the workflow:

```yaml
  coverage-python:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./services/inventory-service

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'
          cache-dependency-path: './services/inventory-service/requirements-dev.txt'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements-dev.txt

      - name: Run tests with coverage
        run: pytest

      - name: Upload coverage artifact
        uses: actions/upload-artifact@v4
        with:
          name: coverage-python
          path: services/inventory-service/coverage/

      - name: Publish coverage report
        if: github.event_name == 'pull_request'
        uses: orgoro/coverage@v3.2
        with:
          coverageFile: services/inventory-service/coverage/coverage.xml
          token: ${{ secrets.GITHUB_TOKEN }}
          thresholdAll: 0.80
          thresholdNew: 0.90
```

### Task 3: Configure .NET coverage for the payment gateway

Create the test project configuration in `services/payment-gateway/tests/PaymentGateway.Tests.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.9.0" />
    <PackageReference Include="xunit" Version="2.7.0" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.5.7" />
    <PackageReference Include="coverlet.collector" Version="6.0.2" />
    <PackageReference Include="coverlet.msbuild" Version="6.0.2" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\src\PaymentGateway\PaymentGateway.csproj" />
  </ItemGroup>
</Project>
```

Add the .NET coverage job:

```yaml
  coverage-dotnet:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./services/payment-gateway

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Restore dependencies
        run: dotnet restore

      - name: Run tests with coverage
        run: |
          dotnet test \
            --no-restore \
            --collect:"XPlat Code Coverage" \
            --results-directory ./coverage \
            -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=cobertura \
               DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.ExcludeByFile="**/Migrations/**"

      - name: Install ReportGenerator
        run: dotnet tool install -g dotnet-reportgenerator-globaltool

      - name: Generate coverage report
        run: |
          reportgenerator \
            -reports:"coverage/**/coverage.cobertura.xml" \
            -targetdir:"coverage/report" \
            -reporttypes:"Html;Cobertura;JsonSummary"

      - name: Upload coverage artifact
        uses: actions/upload-artifact@v4
        with:
          name: coverage-dotnet
          path: services/payment-gateway/coverage/report/
```

### Task 4: Create a coverage gate that fails PRs below threshold

Create `.github/workflows/coverage-gate.yml` as a required status check:

```yaml
name: Coverage Gate

on:
  pull_request:
    branches: [main]

jobs:
  coverage-gate:
    runs-on: ubuntu-latest
    needs: [coverage-node, coverage-python, coverage-dotnet]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download all coverage artifacts
        uses: actions/download-artifact@v4
        with:
          path: ./coverage-artifacts

      - name: Evaluate coverage gate
        run: |
          FAILED=false

          # Check Node.js coverage
          if [ -f "./coverage-artifacts/coverage-node/coverage-summary.json" ]; then
            NODE_COV=$(jq '.total.lines.pct' ./coverage-artifacts/coverage-node/coverage-summary.json)
            echo "Checkout API coverage: ${NODE_COV}%"
            if (( $(echo "$NODE_COV < 80" | bc -l) )); then
              echo "::error::Checkout API coverage ${NODE_COV}% is below 80% threshold"
              FAILED=true
            fi
          fi

          # Check Python coverage
          if [ -f "./coverage-artifacts/coverage-python/coverage.xml" ]; then
            PYTHON_COV=$(python3 -c "
            import xml.etree.ElementTree as ET
            tree = ET.parse('./coverage-artifacts/coverage-python/coverage.xml')
            root = tree.getroot()
            print(float(root.attrib['line-rate']) * 100)
            ")
            echo "Inventory service coverage: ${PYTHON_COV}%"
            if (( $(echo "$PYTHON_COV < 80" | bc -l) )); then
              echo "::error::Inventory service coverage ${PYTHON_COV}% is below 80% threshold"
              FAILED=true
            fi
          fi

          # Check .NET coverage
          if [ -f "./coverage-artifacts/coverage-dotnet/Summary.json" ]; then
            DOTNET_COV=$(jq '.summary.linecoverage' ./coverage-artifacts/coverage-dotnet/Summary.json)
            echo "Payment gateway coverage: ${DOTNET_COV}%"
            if (( $(echo "$DOTNET_COV < 80" | bc -l) )); then
              echo "::error::Payment gateway coverage ${DOTNET_COV}% is below 80% threshold"
              FAILED=true
            fi
          fi

          if [ "$FAILED" = true ]; then
            echo "::error::Coverage gate FAILED. One or more services below threshold."
            exit 1
          fi

          echo "All coverage gates passed."

      - name: Post coverage summary
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            let summary = '## Coverage gate results\n\n';
            summary += '| Service | Coverage | Threshold | Status |\n';
            summary += '|---------|----------|-----------|--------|\n';

            try {
              const nodeData = JSON.parse(
                fs.readFileSync('./coverage-artifacts/coverage-node/coverage-summary.json', 'utf8')
              );
              const nodeCov = nodeData.total.lines.pct;
              summary += `| Checkout API (Node.js) | ${nodeCov}% | 80% | ${nodeCov >= 80 ? 'Passed' : 'FAILED'} |\n`;
            } catch (e) {
              summary += '| Checkout API (Node.js) | N/A | 80% | ERROR |\n';
            }

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: summary
            });
```

### Task 5: Track coverage trends over time

Create a workflow that stores coverage data on each merge to `main`:

```yaml
  store-coverage-baseline:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: [coverage-node, coverage-python, coverage-dotnet]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download coverage artifacts
        uses: actions/download-artifact@v4
        with:
          path: ./coverage-artifacts

      - name: Store coverage baseline
        run: |
          mkdir -p .coverage-history
          DATE=$(date +%Y-%m-%d)
          COMMIT=$(git rev-parse --short HEAD)

          NODE_COV=$(jq '.total.lines.pct' ./coverage-artifacts/coverage-node/coverage-summary.json 2>/dev/null || echo "0")

          echo "{\"date\":\"$DATE\",\"commit\":\"$COMMIT\",\"checkout_api\":$NODE_COV}" >> .coverage-history/trend.jsonl

      - name: Upload coverage baseline
        uses: actions/cache/save@v4
        with:
          path: .coverage-history/
          key: coverage-baseline-${{ github.sha }}

  compare-coverage:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    needs: [coverage-node]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Restore baseline coverage
        uses: actions/cache/restore@v4
        with:
          path: .coverage-history/
          key: coverage-baseline-
          restore-keys: |
            coverage-baseline-

      - name: Download current coverage
        uses: actions/download-artifact@v4
        with:
          name: coverage-node
          path: ./current-coverage

      - name: Compare coverage (ratchet check)
        run: |
          CURRENT=$(jq '.total.lines.pct' ./current-coverage/coverage-summary.json)

          if [ -f ".coverage-history/trend.jsonl" ]; then
            BASELINE=$(tail -1 .coverage-history/trend.jsonl | jq '.checkout_api')
            echo "Baseline coverage: ${BASELINE}%"
            echo "Current coverage: ${CURRENT}%"

            if (( $(echo "$CURRENT < $BASELINE" | bc -l) )); then
              DIFF=$(echo "$BASELINE - $CURRENT" | bc -l)
              echo "::error::Coverage decreased by ${DIFF}% (from ${BASELINE}% to ${CURRENT}%). Coverage ratchet policy violated."
              exit 1
            else
              echo "Coverage maintained or improved: ${BASELINE}% -> ${CURRENT}%"
            fi
          else
            echo "No baseline found. Using current as initial measurement."
          fi
```

### Task 6: Configure diff coverage (branch-level comparison)

Install and configure diff-cover for Python services:

```bash
pip install diff-cover
```

Add diff coverage to the Python job:

```yaml
      - name: Generate diff coverage report
        if: github.event_name == 'pull_request'
        run: |
          git fetch origin main:refs/remotes/origin/main
          diff-cover coverage/coverage.xml \
            --compare-branch=origin/main \
            --fail-under=90 \
            --html-report coverage/diff-cover.html \
            --markdown-report coverage/diff-cover.md
        working-directory: ./services/inventory-service

      - name: Post diff coverage comment
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync(
              'services/inventory-service/coverage/diff-cover.md', 'utf8'
            );
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## Diff coverage (inventory service)\n\n${report}`
            });
```

For Node.js, use a coverage comparison script:

```yaml
      - name: Generate diff coverage for Node.js
        if: github.event_name == 'pull_request'
        run: |
          # Get list of changed files in the PR
          git fetch origin main:refs/remotes/origin/main
          CHANGED_FILES=$(git diff --name-only origin/main...HEAD -- 'services/checkout-api/src/**/*.js')

          if [ -z "$CHANGED_FILES" ]; then
            echo "No source files changed in checkout-api"
            exit 0
          fi

          # Parse lcov for changed files only
          node -e "
          const fs = require('fs');
          const lcov = fs.readFileSync('services/checkout-api/coverage/lcov.info', 'utf8');
          const changedFiles = process.env.CHANGED_FILES.split('\n').filter(Boolean);

          let totalLines = 0;
          let coveredLines = 0;
          let currentFile = '';
          let inChangedFile = false;

          for (const line of lcov.split('\n')) {
            if (line.startsWith('SF:')) {
              currentFile = line.slice(3);
              inChangedFile = changedFiles.some(f => currentFile.endsWith(f.replace('services/checkout-api/', '')));
            }
            if (inChangedFile && line.startsWith('DA:')) {
              const [, hits] = line.slice(3).split(',');
              totalLines++;
              if (parseInt(hits) > 0) coveredLines++;
            }
          }

          const pct = totalLines > 0 ? ((coveredLines / totalLines) * 100).toFixed(2) : 100;
          console.log('Diff coverage: ' + pct + '% (' + coveredLines + '/' + totalLines + ' lines)');
          if (parseFloat(pct) < 90) {
            console.error('Diff coverage ' + pct + '% is below 90% threshold');
            process.exit(1);
          }
          "
        env:
          CHANGED_FILES: ${{ steps['changed-files'].outputs.files }}
        working-directory: ./services/checkout-api
```

### Task 7: Publish coverage to Azure Pipelines

For the Azure Pipelines equivalent, configure coverage publishing in `azure-pipelines-coverage.yml`:

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Coverage
    displayName: 'Test and coverage'
    jobs:
      - job: NodeCoverage
        displayName: 'Node.js coverage'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          - script: |
              cd services/checkout-api
              npm ci
              npx jest --coverage --ci --coverageReporters=cobertura --coverageReporters=text
            displayName: 'Run tests with coverage'

          - task: PublishCodeCoverageResults@2
            displayName: 'Publish Node.js coverage'
            inputs:
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/services/checkout-api/coverage/cobertura-coverage.xml'

      - job: PythonCoverage
        displayName: 'Python coverage'
        steps:
          - task: UsePythonVersion@0
            inputs:
              versionSpec: '3.12'

          - script: |
              cd services/inventory-service
              pip install -r requirements-dev.txt
              pytest --cov=src --cov-report=xml:coverage/coverage.xml
            displayName: 'Run tests with coverage'

          - task: PublishCodeCoverageResults@2
            displayName: 'Publish Python coverage'
            inputs:
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/services/inventory-service/coverage/coverage.xml'

      - job: DotNetCoverage
        displayName: '.NET coverage'
        steps:
          - task: UseDotNet@2
            inputs:
              packageType: 'sdk'
              version: '8.0.x'

          - script: |
              cd services/payment-gateway
              dotnet test --collect:"XPlat Code Coverage" --results-directory ./coverage \
                -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=cobertura
            displayName: 'Run tests with coverage'

          - task: PublishCodeCoverageResults@2
            displayName: 'Publish .NET coverage'
            inputs:
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/services/payment-gateway/coverage/**/coverage.cobertura.xml'

  - stage: CoverageGate
    displayName: 'Coverage gate'
    dependsOn: Coverage
    jobs:
      - job: ValidateCoverage
        displayName: 'Validate coverage threshold'
        steps:
          - task: PowerShell@2
            displayName: 'Check coverage threshold'
            inputs:
              targetType: 'inline'
              script: |
                $threshold = 80
                $coverageFiles = Get-ChildItem -Path "$(Pipeline.Workspace)" -Filter "coverage.cobertura.xml" -Recurse

                foreach ($file in $coverageFiles) {
                  [xml]$xml = Get-Content $file.FullName
                  $lineRate = [math]::Round([double]$xml.coverage.'line-rate' * 100, 2)
                  Write-Host "Coverage for $($file.Directory.Name): $lineRate%"

                  if ($lineRate -lt $threshold) {
                    Write-Error "Coverage $lineRate% is below threshold $threshold% for $($file.Directory.Name)"
                    exit 1
                  }
                }

                Write-Host "All services meet coverage threshold of $threshold%"
```

---

## Break and fix

### The problem

After implementing coverage reporting, the team observes that coverage reports show 0% across all metrics in the pipeline, even though tests clearly execute and pass. The test output shows "42 tests passed" but coverage shows:

```
Lines:       0%
Branches:    0%
Functions:   0%
Statements:  0%
```

---


<details>
<summary>Show solution</summary>

### Root cause analysis

**Issue 1: Wrong coverage reporter format**

The Jest configuration uses `coverageReporters: ['text']` but the pipeline expects a `cobertura-coverage.xml` file. The text reporter only outputs to the console and does not generate the XML file that `PublishCodeCoverageResults@2` requires.

**Issue 2: Output path mismatch**

The pytest coverage command outputs to `coverage.xml` in the current working directory, but the publish task looks for it at `$(System.DefaultWorkingDirectory)/services/inventory-service/coverage/coverage.xml`. The file exists but in the wrong location.

**Issue 3: .NET coverage file not generated**

The `dotnet test` command uses `--collect:"XPlat Code Coverage"` but the Coverlet package is not referenced in the test project. Without `coverlet.collector` as a dependency, the data collector silently produces no output.

**Issue 4: Coverage collected against compiled output, not source**

For Node.js, if `babel` or `ts-jest` transforms the code, coverage maps to transpiled files unless source maps are configured. The coverage runs against transformed code in `node_modules/.cache` and reports 0% for original source files.


### Fix

**Fix 1:** Ensure all required reporters are listed in Jest config:

```javascript
// jest.config.js - must include both text and cobertura
coverageReporters: ['text', 'text-summary', 'lcov', 'cobertura'],
```

Verify the output file exists after running tests:

```bash
npx jest --coverage
ls -la coverage/cobertura-coverage.xml
```

**Fix 2:** Correct the output path in pytest configuration or the pipeline task:

```toml
# pyproject.toml - explicit output path
[tool.pytest.ini_options]
addopts = "--cov=src --cov-report=xml:coverage/coverage.xml"
```

Or fix the pipeline to match the actual output location:

```yaml
- task: PublishCodeCoverageResults@2
  inputs:
    summaryFileLocation: '$(System.DefaultWorkingDirectory)/services/inventory-service/coverage/coverage.xml'
```

**Fix 3:** Add the Coverlet collector package to the test project:

```bash
cd services/payment-gateway/tests
dotnet add package coverlet.collector --version 6.0.2
```

Verify it appears in the `.csproj`:

```xml
<PackageReference Include="coverlet.collector" Version="6.0.2">
  <PrivateAssets>all</PrivateAssets>
  <IncludeAssets>runtime; build; native; contentfiles; analyzers</IncludeAssets>
</PackageReference>
```

**Fix 4:** Configure source map support for transformed code:

```javascript
// jest.config.js
module.exports = {
  transform: {
    '^.+\\.js$': ['babel-jest', { sourceMaps: true }],
  },
  coverageProvider: 'v8', // Use V8 native coverage instead of babel instrumentation
};
```

For TypeScript projects using `ts-jest`:

```javascript
module.exports = {
  transform: {
    '^.+\\.ts$': ['ts-jest', { diagnostics: false }],
  },
  coverageProvider: 'v8',
};
```


</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the difference between overall coverage and diff coverage in a pull request context?",
    options: [
      "Overall coverage measures only the files changed in the PR; diff coverage measures the entire codebase",
      "Overall coverage measures the entire codebase; diff coverage measures only the new or modified lines in the PR",
      "Overall coverage includes test files; diff coverage excludes them",
      "They are identical metrics calculated by different tools"
    ],
    correctIndex: 1,
    explanation: "Overall (aggregate) coverage measures the percentage of all source lines covered by tests across the entire codebase. Diff coverage focuses exclusively on lines added or modified in the pull request, ensuring that new code is well-tested regardless of legacy coverage debt."
  },
  {
    question: "In Azure Pipelines, which task and format should you use to display code coverage results in the pipeline summary?",
    options: [
      "'PublishTestResults@2' with JUnit format",
      "'PublishCodeCoverageResults@2' with Cobertura or JaCoCo format",
      "'PublishPipelineArtifact@1' with LCOV format",
      "'PublishBuildArtifacts@1' with HTML format"
    ],
    correctIndex: 1,
    explanation: "The PublishCodeCoverageResults@2 task accepts Cobertura or JaCoCo XML format files and renders coverage data in the Azure Pipelines Code Coverage tab. LCOV and HTML formats are not supported by this task. PublishTestResults@2 handles test pass/fail results, not coverage."
  },
  {
    question: "What does a coverage \"ratchet\" policy enforce?",
    options: [
      "Coverage must increase by at least 5% with every PR",
      "Coverage can never decrease below the previously recorded baseline",
      "Only critical paths require coverage",
      "Coverage thresholds apply only to new repositories"
    ],
    correctIndex: 1,
    explanation: "A ratchet policy (also called a \"never decrease\" policy) stores the coverage percentage at each merge to the main branch. Subsequent PRs must maintain or improve this level. This prevents gradual coverage erosion while avoiding the burden of immediately achieving high coverage on legacy code."
  },
  {
    question: "Why might a coverage report show 0% even though all tests pass successfully?",
    options: [
      "The test framework has a bug that prevents coverage from working",
      "The coverage tool is not installed or configured to output the expected format, so no coverage data file is generated",
      "Tests that pass always have 100% coverage, never 0%",
      "The CI runner does not support code coverage instrumentation"
    ],
    correctIndex: 1,
    explanation: "Coverage reporting requires both running tests (which produces pass/fail results) and instrumenting code (which produces coverage data). Common causes of 0% coverage include: missing coverage collector packages, wrong reporter format configuration, output path mismatches where the pipeline looks for files in the wrong directory, or source map issues with transpiled code."
  }
]} />

## Cleanup

Remove coverage infrastructure after completing the challenge:

```bash
# Remove workflow files
rm .github/workflows/coverage.yml
rm .github/workflows/coverage-gate.yml

# Remove Node.js coverage config
rm services/checkout-api/jest.config.js

# Remove Python coverage config changes
# (revert pyproject.toml coverage settings)

# Remove .NET coverage packages
cd services/payment-gateway/tests
dotnet remove package coverlet.collector
dotnet remove package coverlet.msbuild

# Remove Azure Pipelines coverage file
rm -f azure-pipelines-coverage.yml

# Remove generated coverage data
rm -rf services/checkout-api/coverage/
rm -rf services/inventory-service/coverage/
rm -rf services/payment-gateway/coverage/

# Remove coverage history
rm -rf .coverage-history/

# Uninstall diff-cover if installed globally
pip uninstall diff-cover -y
```


