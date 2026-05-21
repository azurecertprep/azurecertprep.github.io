---
sidebar_position: 1
title: "Challenge 34: Pipeline health monitoring"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 34: Pipeline health monitoring

:::info Platform: comparison
This challenge covers both GitHub Actions and Azure Pipelines for pipeline observability.
:::

## Exam skills mapped

- Monitor pipeline health, including failure rate, duration, and flaky tests

## Scenario

Contoso Ltd's main CI pipeline (`contoso-api-ci`) takes an average of 45 minutes to complete and fails approximately 30% of all runs. The failure rate has been climbing over the past 3 months, and development teams have lost confidence in the pipeline. Common behaviors observed:

- Developers push directly to main to skip CI ("it will just fail anyway")
- The same tests pass on retry without any code changes (flaky tests)
- Build queue times spike during peak hours (9-11 AM)
- Nobody notices when the pipeline has been broken for hours

The engineering manager needs to restore trust in CI by identifying root causes, implementing flaky test management, and creating visibility into pipeline health metrics.

## Task 1: Identify flaky tests

Flaky tests pass and fail intermittently without code changes. Implement detection and management:

```yaml
# GitHub Actions - .github/workflows/ci.yml
# Add test retry with flaky test annotation
name: CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - name: Run tests with retry for flaky detection
        run: |
          # Run tests with Jest retry configuration
          npx jest --ci --reporters=default --reporters=jest-junit \
            --testResultsProcessor=jest-flaky-test-reporter \
            --forceExit --detectOpenHandles
        env:
          JEST_JUNIT_OUTPUT_DIR: ./test-results
          JEST_JUNIT_OUTPUT_NAME: junit.xml

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: ./test-results/

      - name: Publish test report
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: "Jest Tests"
          path: "./test-results/junit.xml"
          reporter: java-junit
          fail-on-error: false
```

Configure Jest to detect flaky tests:

```javascript
// jest.config.js - retry configuration for flaky detection
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  // Retry failed tests up to 2 times
  // If a test passes on retry, it is marked as flaky
  retryTimes: 2,
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' > ',
      addFileAttribute: 'true'
    }]
  ],
  // Log when a test is retried
  verbose: true
};
```

For Azure Pipelines, use the built-in flaky test detection:

```yaml
# azure-pipelines.yml - Flaky test management
trigger:
  branches:
    include: [main]

pool:
  vmImage: "ubuntu-latest"

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: "20.x"

  - script: npm ci
    displayName: "Install dependencies"

  - script: npx jest --ci --reporters=default --reporters=jest-junit
    displayName: "Run tests"
    env:
      JEST_JUNIT_OUTPUT_DIR: $(System.DefaultWorkingDirectory)/test-results
      JEST_JUNIT_OUTPUT_NAME: junit.xml

  - task: PublishTestResults@2
    displayName: "Publish test results"
    condition: always()
    inputs:
      testResultsFormat: "JUnit"
      testResultsFiles: "**/junit.xml"
      searchFolder: "$(System.DefaultWorkingDirectory)/test-results"
      # Enable flaky test detection - Azure DevOps marks tests as flaky
      # if they pass and fail on the same code commit
      failTaskOnFailedTests: false
      failTaskOnMissingResultsFile: false
```

Enable flaky test management in Azure DevOps project settings:

```bash
# Azure DevOps REST API - Enable flaky test detection
# Project Settings > Test Management > Flaky test detection
az devops invoke \
  --area testflakiness \
  --resource settings \
  --org https://dev.azure.com/contoso \
  --route-parameters project=ContosoAPI \
  --http-method PATCH \
  --in-file flaky-settings.json

# flaky-settings.json content:
# {
#   "flakySettings": {
#     "flakyDetection": {
#       "isEnabled": true,
#       "flakyDetectionType": "system"
#     },
#     "flakyInSummaryReport": true
#   }
# }
```

## Task 2: GitHub Actions workflow run analytics

Use the GitHub API to track workflow performance trends:

```bash
# Get workflow runs for analysis
gh run list --workflow=ci.yml --limit 100 --json \
  databaseId,status,conclusion,createdAt,updatedAt,headBranch \
  --jq '.[] | {id: .databaseId, status: .conclusion, duration_seconds: (((.updatedAt | fromdateiso8601) - (.createdAt | fromdateiso8601))), branch: .headBranch}'

# Calculate failure rate over last 30 days
gh run list --workflow=ci.yml --limit 200 --json conclusion \
  --jq '[.[] | .conclusion] | {total: length, failures: ([.[] | select(. == "failure")] | length), success_rate: (([.[] | select(. == "success")] | length) / length * 100)}'

# Get average duration of successful runs
gh run list --workflow=ci.yml --limit 50 --json conclusion,createdAt,updatedAt \
  --jq '[.[] | select(.conclusion == "success") | ((.updatedAt | fromdateiso8601) - (.createdAt | fromdateiso8601))] | (add / length / 60) | "Average duration: \(.) minutes"'

# Find the slowest jobs
gh run view {run-id} --json jobs \
  --jq '.jobs | sort_by(.completedAt | fromdateiso8601 - (.startedAt | fromdateiso8601)) | reverse | .[:5] | .[] | "\(.name): \(((.completedAt | fromdateiso8601) - (.startedAt | fromdateiso8601)) / 60) minutes"'
```

Create a reusable workflow for tracking metrics:

```yaml
# .github/workflows/pipeline-metrics.yml
name: Pipeline metrics collector

on:
  workflow_run:
    workflows: ["CI Pipeline"]
    types: [completed]

permissions:
  actions: read
  issues: write

jobs:
  collect-metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Collect run metrics
        uses: actions/github-script@v7
        with:
          script: |
            const run = context.payload.workflow_run;
            const duration = (new Date(run.updated_at) - new Date(run.created_at)) / 1000 / 60;

            // Get job details for breakdown
            const jobs = await github.rest.actions.listJobsForWorkflowRun({
              owner: context.repo.owner,
              repo: context.repo.repo,
              run_id: run.id
            });

            const metrics = {
              run_id: run.id,
              conclusion: run.conclusion,
              duration_minutes: duration.toFixed(2),
              branch: run.head_branch,
              triggered_by: run.triggering_actor.login,
              jobs: jobs.data.jobs.map(j => ({
                name: j.name,
                conclusion: j.conclusion,
                duration: ((new Date(j.completed_at) - new Date(j.started_at)) / 1000 / 60).toFixed(2)
              }))
            };

            console.log(JSON.stringify(metrics, null, 2));

            // Alert if duration exceeds threshold (45 min)
            if (duration > 45) {
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: `Pipeline exceeded duration threshold: ${duration.toFixed(0)} minutes`,
                body: `Run #${run.run_number} took ${duration.toFixed(1)} minutes (threshold: 45 min).\n\nJob breakdown:\n${metrics.jobs.map(j => `- ${j.name}: ${j.duration} min (${j.conclusion})`).join('\n')}`,
                labels: ['pipeline-health', 'performance']
              });
            }
```

## Task 3: Azure Pipelines analytics dashboard

Configure and use the built-in pipeline analytics in Azure DevOps:

```bash
# Access pipeline analytics via REST API
# Get pipeline run statistics for last 30 days
az devops invoke \
  --area pipelines \
  --resource runs \
  --org https://dev.azure.com/contoso \
  --route-parameters project=ContosoAPI pipelineId=42 \
  --query-parameters '$top=100' \
  --output json | \
  jq '{
    total_runs: length,
    succeeded: [.[] | select(.result == "succeeded")] | length,
    failed: [.[] | select(.result == "failed")] | length,
    canceled: [.[] | select(.result == "canceled")] | length,
    avg_duration_minutes: ([.[] | select(.result == "succeeded") | (.finishedDate | fromdateiso8601) - (.createdDate | fromdateiso8601)] | add / length / 60)
  }'
```

Navigate to pipeline analytics in Azure DevOps:
1. Pipelines > Select pipeline > Analytics tab
2. Key metrics available:
   - Pass rate (last 14/30/90 days)
   - Average duration with trend
   - Test pass rate with flaky test breakdown
   - Duration breakdown by task/stage

Create a custom analytics widget for the team dashboard:

```yaml
# Use the Analytics OData endpoint for custom queries
# Example: Pipeline failure analysis by day of week
# URL: https://analytics.dev.azure.com/contoso/ContosoAPI/_odata/v4.0-preview/PipelineRuns
#   ?$apply=filter(
#     Pipeline/PipelineName eq 'contoso-api-ci'
#     and CompletedDate ge 2024-01-01T00:00:00Z
#   )
#   /groupby(
#     (CompletedDateSK, RunOutcome),
#     aggregate($count as RunCount)
#   )
```

## Task 4: Track pipeline metrics (failure rate, MTTR, queue time)

Define and track key pipeline health indicators:

```yaml
# .github/workflows/health-report.yml
name: Weekly pipeline health report

on:
  schedule:
    - cron: "0 9 * * 1"  # Every Monday at 9 AM UTC
  workflow_dispatch:

permissions:
  actions: read
  issues: write

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - name: Generate health report
        uses: actions/github-script@v7
        with:
          script: |
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            // Get all workflow runs from last week
            const runs = await github.paginate(
              github.rest.actions.listWorkflowRuns,
              {
                owner: context.repo.owner,
                repo: context.repo.repo,
                workflow_id: 'ci.yml',
                created: `>=${oneWeekAgo.toISOString().split('T')[0]}`,
                per_page: 100
              }
            );

            // Calculate metrics
            const completed = runs.filter(r => r.status === 'completed');
            const succeeded = completed.filter(r => r.conclusion === 'success');
            const failed = completed.filter(r => r.conclusion === 'failure');

            const successRate = ((succeeded.length / completed.length) * 100).toFixed(1);

            // Calculate average duration for successful runs
            const durations = succeeded.map(r =>
              (new Date(r.updated_at) - new Date(r.created_at)) / 1000 / 60
            );
            const avgDuration = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1);
            const p95Duration = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)]?.toFixed(1) || 'N/A';

            // Calculate MTTR (time from failure to next success on same branch)
            let mttrValues = [];
            const mainRuns = completed
              .filter(r => r.head_branch === 'main')
              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            for (let i = 0; i < mainRuns.length - 1; i++) {
              if (mainRuns[i].conclusion === 'failure' && mainRuns[i+1].conclusion === 'success') {
                const recovery = (new Date(mainRuns[i+1].updated_at) - new Date(mainRuns[i].created_at)) / 1000 / 60;
                mttrValues.push(recovery);
              }
            }
            const avgMTTR = mttrValues.length > 0
              ? (mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length).toFixed(0)
              : 'N/A';

            const report = `## Weekly pipeline health report

            | Metric | Value | Target |
            |--------|-------|--------|
            | Success rate | ${successRate}% | > 90% |
            | Average duration | ${avgDuration} min | < 15 min |
            | P95 duration | ${p95Duration} min | < 25 min |
            | MTTR (mean time to recovery) | ${avgMTTR} min | < 30 min |
            | Total runs | ${completed.length} | - |
            | Failed runs | ${failed.length} | - |

            ### Failure breakdown
            ${failed.slice(0, 10).map(r => `- [Run #${r.run_number}](${r.html_url}) - ${r.head_branch} - ${new Date(r.created_at).toLocaleDateString()}`).join('\n')}
            `;

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Pipeline Health Report - Week of ${oneWeekAgo.toISOString().split('T')[0]}`,
              body: report,
              labels: ['pipeline-health', 'report']
            });
```

## Task 5: Implement test retry for flaky tests (with annotation)

Configure intelligent test retry that distinguishes flaky tests from genuine failures:

```yaml
# GitHub Actions - Test retry with flaky annotation
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci

      - name: Run tests (attempt 1)
        id: test1
        continue-on-error: true
        run: npx jest --ci --json --outputFile=results1.json 2>&1 || true

      - name: Identify and retry failed tests
        id: retry
        if: steps.test1.outcome == 'failure'
        run: |
          # Extract failed test names from first run
          FAILED=$(node -e "
            const r = require('./results1.json');
            const failed = r.testResults
              .filter(t => t.status === 'failed')
              .map(t => t.name);
            console.log(failed.join(' '));
          ")

          if [ -n "$FAILED" ]; then
            echo "Retrying failed tests: $FAILED"
            npx jest --ci --json --outputFile=results2.json $FAILED
            RETRY_EXIT=$?

            # Compare results - tests that pass on retry are flaky
            node -e "
              const r1 = require('./results1.json');
              const r2 = require('./results2.json');
              const flaky = r2.testResults
                .filter(t => t.status === 'passed')
                .map(t => t.name);
              if (flaky.length > 0) {
                console.log('::warning::Flaky tests detected: ' + flaky.join(', '));
                const fs = require('fs');
                fs.writeFileSync('flaky-tests.txt', flaky.join('\n'));
              }
              // Fail only if tests still fail on retry
              const stillFailing = r2.testResults.filter(t => t.status === 'failed');
              process.exit(stillFailing.length > 0 ? 1 : 0);
            "
          fi

      - name: Annotate flaky tests
        if: always() && hashFiles('flaky-tests.txt') != ''
        run: |
          while IFS= read -r test; do
            echo "::warning file=$test::This test is flaky - passed on retry without code changes"
          done < flaky-tests.txt

      - name: Upload flaky test report
        if: always() && hashFiles('flaky-tests.txt') != ''
        uses: actions/upload-artifact@v4
        with:
          name: flaky-tests
          path: flaky-tests.txt
```

## Task 6: Set up alerts for pipeline degradation

Configure alerts when pipeline health metrics cross thresholds:

```yaml
# .github/workflows/pipeline-alert.yml
name: Pipeline degradation alert

on:
  workflow_run:
    workflows: ["CI Pipeline"]
    types: [completed]

jobs:
  check-health:
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'failure'
    steps:
      - name: Check consecutive failures
        uses: actions/github-script@v7
        with:
          script: |
            // Get last 5 runs on main branch
            const runs = await github.rest.actions.listWorkflowRuns({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'ci.yml',
              branch: 'main',
              per_page: 5,
              status: 'completed'
            });

            const recentRuns = runs.data.workflow_runs;
            const consecutiveFailures = recentRuns
              .filter(r => r.conclusion === 'failure').length;

            if (consecutiveFailures >= 3) {
              // Create urgent issue
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: `ALERT: ${consecutiveFailures} consecutive pipeline failures on main`,
                body: `The CI pipeline has failed ${consecutiveFailures} times in a row on the main branch.\n\nThis indicates a systemic issue that needs immediate attention.\n\nRecent failures:\n${recentRuns.filter(r => r.conclusion === 'failure').map(r => `- [Run #${r.run_number}](${r.html_url}) at ${r.created_at}`).join('\n')}`,
                labels: ['pipeline-health', 'urgent', 'P1'],
                assignees: ['oncall-engineer']
              });

              // Optionally send to Slack/Teams via webhook
              // await fetch(process.env.SLACK_WEBHOOK, { method: 'POST', body: JSON.stringify({text: '...'}) });
            }
```

For Azure Pipelines, use Service Hooks:

```bash
# Create endpoint configuration file
cat <<EOF > endpoint-config.json
{
  "data": {},
  "name": "pipeline-alerts-webhook",
  "type": "generic",
  "url": "https://your-webhook-endpoint.example.com",
  "authorization": {
    "parameters": {
      "username": "",
      "password": ""
    },
    "scheme": "UsernamePassword"
  }
}
EOF

# Create a service endpoint for pipeline failure notifications
az devops service-endpoint create \
  --service-endpoint-configuration endpoint-config.json \
  --org https://dev.azure.com/contoso \
  --project ContosoAPI

# Create service hook subscription for build failures
# Navigate to Project Settings > Service hooks > Create subscription
# Event: Build completed (with filter: status = Failed, branch = main)
# Action: Web hook to Teams/Slack channel
```

## Task 7: Create a pipeline health dashboard

Build a comprehensive dashboard showing key metrics:

```yaml
# GitHub Actions - Generate dashboard data
# .github/workflows/dashboard-update.yml
name: Update pipeline dashboard

on:
  schedule:
    - cron: "0 */6 * * *"  # Every 6 hours

permissions:
  actions: read
  pages: write
  contents: write

jobs:
  update-dashboard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate dashboard data
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');

            // Collect 30 days of data
            const since = new Date();
            since.setDate(since.getDate() - 30);

            const allRuns = await github.paginate(
              github.rest.actions.listWorkflowRuns,
              {
                owner: context.repo.owner,
                repo: context.repo.repo,
                workflow_id: 'ci.yml',
                created: `>=${since.toISOString().split('T')[0]}`,
                status: 'completed',
                per_page: 100
              }
            );

            // Group by date
            const byDate = {};
            allRuns.forEach(run => {
              const date = run.created_at.split('T')[0];
              if (!byDate[date]) byDate[date] = { success: 0, failure: 0, durations: [] };
              if (run.conclusion === 'success') {
                byDate[date].success++;
                byDate[date].durations.push(
                  (new Date(run.updated_at) - new Date(run.created_at)) / 1000 / 60
                );
              } else {
                byDate[date].failure++;
              }
            });

            const dashboardData = Object.entries(byDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, data]) => ({
                date,
                success_rate: ((data.success / (data.success + data.failure)) * 100).toFixed(1),
                avg_duration: data.durations.length > 0
                  ? (data.durations.reduce((a,b) => a+b, 0) / data.durations.length).toFixed(1)
                  : null,
                total_runs: data.success + data.failure
              }));

            fs.writeFileSync('docs/pipeline-health.json', JSON.stringify(dashboardData, null, 2));

      - name: Commit dashboard data
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add docs/pipeline-health.json
          git diff --staged --quiet || git commit -m "Update pipeline health dashboard data"
          git push
```

## Break and fix

### Exercise 1: Fix the misleading test results

The pipeline shows 100% test pass rate, but developers report bugs in production. Investigation reveals:

```yaml
# BROKEN: Tests never actually fail the build
- script: npx jest --ci || true  # ERROR: '|| true' swallows failures
  displayName: "Run tests"

- task: PublishTestResults@2
  condition: always()
  inputs:
    testResultsFormat: "JUnit"
    testResultsFiles: "**/junit.xml"
    failTaskOnFailedTests: false  # ERROR: Never fails even with test failures
```


<details>
<summary>Show solution</summary>

**Fix:**

```yaml
# FIXED: Tests properly fail the build
- script: npx jest --ci --reporters=default --reporters=jest-junit
  displayName: "Run tests"
  # No '|| true' - let the step fail naturally

- task: PublishTestResults@2
  condition: always()  # Still publish results even on failure (for visibility)
  inputs:
    testResultsFormat: "JUnit"
    testResultsFiles: "**/junit.xml"
    failTaskOnFailedTests: true  # Fail the task if any test failed
    failTaskOnMissingResultsFile: true
```

</details>

### Exercise 2: Fix the invisible flaky test problem

Tests are being retried, but there is no visibility into which tests are flaky. The team does not know which tests to prioritize fixing:

```yaml
# BROKEN: Retries mask the problem without tracking
- name: Run tests
  run: |
    for i in 1 2 3; do
      npx jest --ci && break || echo "Attempt $i failed, retrying..."
    done
  # ERROR: No tracking of which tests needed retries
  # ERROR: No annotation or reporting of flaky tests
  # ERROR: Exit code may be wrong (last command in loop)
```


<details>
<summary>Show solution</summary>

**Fix:**

```yaml
# FIXED: Retry with proper tracking and reporting
- name: Run tests with flaky tracking
  run: |
    # First attempt
    npx jest --ci --json --outputFile=attempt1.json 2>&1 || true
    FIRST_EXIT=$?

    if [ $FIRST_EXIT -ne 0 ]; then
      # Extract failed tests for targeted retry
      FAILED=$(node -p "require('./attempt1.json').testResults.filter(t => t.status === 'failed').map(t => t.testFilePath).join(' ')")

      echo "::group::Retrying ${FAILED}"
      npx jest --ci --json --outputFile=attempt2.json $FAILED
      SECOND_EXIT=$?
      echo "::endgroup::"

      if [ $SECOND_EXIT -eq 0 ]; then
        echo "::warning::Flaky tests detected - passed on retry: ${FAILED}"
        echo "FLAKY_DETECTED=true" >> $GITHUB_ENV
      else
        exit 1  # Genuine failure
      fi
    fi

- name: Report flaky tests
  if: env.FLAKY_DETECTED == 'true'
  uses: actions/github-script@v7
  with:
    script: |
      // Create or update tracking issue for flaky tests
      const issues = await github.rest.issues.listForRepo({
        owner: context.repo.owner,
        repo: context.repo.repo,
        labels: 'flaky-test',
        state: 'open'
      });
      // Add comment with today's flaky occurrence
      // ... tracking logic
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is a flaky test, and how does Azure DevOps detect them automatically?",
    options: [
      "A test that takes too long; detected by comparing test duration to a threshold",
      "A test that passes and fails on the same code commit; detected by comparing results across runs without code changes",
      "A test that only fails on specific operating systems; detected by matrix build comparison",
      "A test that requires network access; detected by monitoring network calls during test execution"
    ],
    correctIndex: 1,
    explanation: "A flaky test is one that produces different results (pass/fail) on the same code. Azure DevOps system-detected flaky tests work by comparing test results across pipeline runs where the same test has both passed and failed on the same commit or without intervening code changes. Once detected, flaky tests can be excluded from the pass/fail calculation."
  },
  {
    question: "What is MTTR in the context of pipeline health, and why is it important?",
    options: [
      "Maximum Test Timeout Ratio - the longest a test should run before being killed",
      "Mean Time To Recovery - the average time from a pipeline failure to the next successful run",
      "Minimum Throughput Threshold Requirement - the minimum number of runs per day",
      "Manual Test Trigger Rate - how often tests are run manually vs automatically"
    ],
    correctIndex: 1,
    explanation: "MTTR (Mean Time To Recovery) measures how quickly the team can fix a broken pipeline. A low MTTR means failures are detected and resolved quickly. High MTTR indicates that broken pipelines sit unattended, blocking the entire team. Tracking MTTR encourages practices like immediate investigation of failures and smaller, more reviewable changes."
  },
  {
    question: "Which approach correctly handles test retries without masking genuine failures?",
    options: [
      "Run all tests with '|| true' and check the test report separately",
      "Retry only failed tests, mark those that pass on retry as flaky, and fail only for tests that fail on all attempts",
      "Run the entire test suite 3 times and use majority-vote (2/3 passes = success)",
      "Disable failing tests with 'skip' annotations until they are fixed"
    ],
    correctIndex: 1,
    explanation: "Targeted retry of only failed tests is the correct approach. Tests that pass on retry without code changes are marked as flaky (for tracking and prioritized fixing). Tests that fail on all retry attempts represent genuine regressions and should fail the build. This provides accurate signal while tracking reliability debt."
  },
  {
    question: "What is the recommended response when pipeline failure rate exceeds 30%?",
    options: [
      "Increase the number of retries to 5 to reduce visible failures",
      "Skip CI on feature branches and only run on main",
      "Analyze failure causes, quarantine flaky tests, fix infrastructure issues, and track improvement metrics",
      "Switch to manual testing until the pipeline is rewritten from scratch"
    ],
    correctIndex: 2,
    explanation: "High failure rates require systematic investigation. Categorize failures (flaky tests, infrastructure issues, genuine bugs), quarantine known-flaky tests (still run them but don't block the build), fix underlying infrastructure issues (timeout configurations, resource limits), and establish metrics to track improvement over time. Simply hiding failures erodes trust further."
  }
]} />

## Cleanup

```bash
# Close pipeline health issues
gh issue list --label "pipeline-health" --state open --json number --jq '.[].number' | \
  xargs -I {} gh issue close {}

# Remove dashboard data file if no longer needed
rm -f docs/pipeline-health.json

# Remove test result artifacts older than 7 days
gh run list --workflow=ci.yml --limit 50 --json databaseId,createdAt --jq \
  '.[] | select((.createdAt | fromdateiso8601) < (now - 604800)) | .databaseId' | \
  xargs -I {} gh api repos/{owner}/{repo}/actions/runs/{}/artifacts --jq '.artifacts[].id' | \
  xargs -I {} gh api --method DELETE repos/{owner}/{repo}/actions/artifacts/{}
```
