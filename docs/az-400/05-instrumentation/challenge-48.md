---
sidebar_position: 3
title: "Challenge 48: GitHub monitoring and alerts"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 48: GitHub monitoring and alerts

## Exam skills covered

- Configure monitoring in GitHub, including enabling insights and creating and configuring charts
- Configure alerts for events in GitHub Actions and Azure Pipelines

## Scenario

Contoso Ltd's engineering manager wants visibility into team velocity, workflow efficiency, and deployment patterns without leaving GitHub. Currently, no one knows the average CI build time, which workflows fail most often, or how frequently teams deploy. The manager also wants proactive alerts when critical workflows fail so the team does not discover broken builds hours later. You must configure GitHub monitoring and alerting to provide actionable engineering metrics.

## Prerequisites

- GitHub organization with multiple repositories
- GitHub Actions workflows that have run at least a few times (for historical data)
- GitHub Projects board
- GitHub CLI installed and authenticated
- A Slack workspace or Microsoft Teams channel (for alert notifications)

## Tasks

### Task 1: Enable and explore GitHub repository insights

GitHub provides built-in repository insights for traffic, contributions, and community health.

```bash
# View repository traffic (requires push access)
gh api repos/contoso/webapp/traffic/views --jq '{
  totalViews: .count,
  uniqueVisitors: .uniques,
  daily: [.views[] | {date: .timestamp, views: .count, unique: .uniques}]
}'

# View clone statistics
gh api repos/contoso/webapp/traffic/clones --jq '{
  totalClones: .count,
  uniqueCloners: .uniques,
  daily: [.clones[] | {date: .timestamp, clones: .count, unique: .uniques}]
}'

# View top referral sources
gh api repos/contoso/webapp/traffic/popular/referrers --jq '.[] | {referrer, count, uniques}'

# View popular content paths
gh api repos/contoso/webapp/traffic/popular/paths --jq '.[] | {path, title, count, uniques}'

# View contributor statistics
gh api repos/contoso/webapp/stats/contributors --jq '.[] | {
  author: .author.login,
  totalCommits: .total,
  lastWeekCommits: (.weeks[-1].c)
}'

# View commit activity (weekly)
gh api repos/contoso/webapp/stats/commit_activity --jq '.[-4:] | .[] | {
  week: (.week | todate),
  totalCommits: .total,
  dailyBreakdown: .days
}'
```

Insights available in the GitHub UI (repository > Insights tab):
- Pulse: recent activity summary
- Contributors: commit frequency per contributor
- Community: community health files (README, CONTRIBUTING, CODE_OF_CONDUCT)
- Traffic: page views, clones, referrers
- Commits: commit frequency over time
- Code frequency: additions and deletions per week
- Dependency graph: dependencies and dependents
- Network: fork network visualization
- Forks: list of forks with activity

### Task 2: Configure GitHub Actions workflow insights

```bash
# Get workflow run statistics
gh api repos/contoso/webapp/actions/workflows --jq '.workflows[] | {
  name: .name,
  id: .id,
  state: .state
}'

# Get recent runs for a specific workflow with timing
gh run list --workflow deploy.yml --limit 20 --json status,conclusion,startedAt,updatedAt \
  --jq '.[] | {
    status,
    conclusion,
    started: .startedAt,
    duration: ((.updatedAt | fromdateiso8601) - (.startedAt | fromdateiso8601) | tostring + "s")
  }'

# Calculate success rate for the last 100 runs
gh run list --workflow deploy.yml --limit 100 --json conclusion \
  --jq '{
    total: length,
    success: [.[] | select(.conclusion == "success")] | length,
    failure: [.[] | select(.conclusion == "failure")] | length,
    cancelled: [.[] | select(.conclusion == "cancelled")] | length,
    successRate: (([.[] | select(.conclusion == "success")] | length) * 100 / length | tostring + "%")
  }'

# Get average workflow duration (last 50 successful runs)
gh run list --workflow deploy.yml --limit 50 --status completed --json startedAt,updatedAt,conclusion \
  --jq '[.[] | select(.conclusion == "success") | ((.updatedAt | fromdateiso8601) - (.startedAt | fromdateiso8601))] | (add / length | floor | tostring + " seconds average")'

# Usage minutes consumed
gh api orgs/contoso/settings/billing/actions --jq '{
  totalMinutesUsed: .total_minutes_used,
  includedMinutes: .included_minutes,
  paidMinutesUsed: .total_paid_minutes_used
}'
```

### Task 3: Create custom charts in GitHub Projects

GitHub Projects (v2) support custom charts for tracking work items.

```bash
# List projects in the organization
gh api graphql -f query='
{
  organization(login: "contoso") {
    projectsV2(first: 10) {
      nodes {
        id
        title
        number
      }
    }
  }
}' --jq '.data.organization.projectsV2.nodes[]'
```

To create charts in GitHub Projects:

1. Navigate to the Project board
2. Click the "Insights" tab (chart icon)
3. Create charts:

**Chart 1: Burn-down chart**
- Type: Line chart
- X-axis: Time
- Y-axis: Count of items
- Filter: Status != Done
- Group by: None

**Chart 2: Items by assignee**
- Type: Bar chart
- X-axis: Assignee
- Y-axis: Count
- Filter: Status = In Progress
- Group by: Priority

**Chart 3: Cycle time**
- Type: Line chart
- X-axis: Closed date
- Y-axis: Duration (days from created to closed)
- Filter: Status = Done

**Chart 4: Distribution by label**
- Type: Pie chart
- Group by: Label
- Filter: Status != Done

### Task 4: Set up workflow failure notifications

```yaml
# .github/workflows/notify-on-failure.yml
name: CI Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
      - run: npm run build

  notify-failure:
    runs-on: ubuntu-latest
    needs: [build]
    if: failure()
    steps:
      - name: Send Slack notification
        uses: slackapi/slack-github-action@v1.27.0
        with:
          payload: |
            {
              "text": "CI Pipeline Failed",
              "blocks": [
                {
                  "type": "header",
                  "text": {
                    "type": "plain_text",
                    "text": "Pipeline Failure: ${{ github.workflow }}"
                  }
                },
                {
                  "type": "section",
                  "fields": [
                    {"type": "mrkdwn", "text": "*Repository:*\n${{ github.repository }}"},
                    {"type": "mrkdwn", "text": "*Branch:*\n${{ github.ref_name }}"},
                    {"type": "mrkdwn", "text": "*Commit:*\n${{ github.sha }}"},
                    {"type": "mrkdwn", "text": "*Author:*\n${{ github.actor }}"}
                  ]
                },
                {
                  "type": "actions",
                  "elements": [
                    {
                      "type": "button",
                      "text": {"type": "plain_text", "text": "View Run"},
                      "url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                    }
                  ]
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK

      - name: Send Teams notification
        run: |
          curl -X POST "${{ secrets.TEAMS_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            --data '{
              "@type": "MessageCard",
              "summary": "CI Pipeline Failed",
              "themeColor": "FF0000",
              "title": "Pipeline Failure: ${{ github.workflow }}",
              "sections": [{
                "facts": [
                  {"name": "Repository", "value": "${{ github.repository }}"},
                  {"name": "Branch", "value": "${{ github.ref_name }}"},
                  {"name": "Author", "value": "${{ github.actor }}"},
                  {"name": "Commit", "value": "${{ github.sha }}"}
                ]
              }],
              "potentialAction": [{
                "@type": "OpenUri",
                "name": "View Run",
                "targets": [{"os": "default", "uri": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"}]
              }]
            }'
```

### Task 5: Configure branch deployment activity dashboard

```yaml
# .github/workflows/deployment-tracker.yml
name: Track deployments
on:
  deployment_status:

jobs:
  track:
    runs-on: ubuntu-latest
    if: github.event.deployment_status.state == 'success'
    steps:
      - name: Record deployment metrics
        run: |
          echo "Deployment to ${{ github.event.deployment.environment }} succeeded"
          echo "SHA: ${{ github.event.deployment.sha }}"
          echo "Created: ${{ github.event.deployment.created_at }}"

          # Post deployment frequency metric
          gh api repos/${{ github.repository }}/deployments \
            --jq '[.[] | select(.environment == "${{ github.event.deployment.environment }}")] | length' \
            | xargs -I {} echo "Total deployments to ${{ github.event.deployment.environment }}: {}"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Query deployment history:

```bash
# List recent deployments
gh api repos/contoso/webapp/deployments --jq '.[] | {
  id: .id,
  environment: .environment,
  sha: .sha[:7],
  creator: .creator.login,
  created: .created_at,
  description: .description
}' | head -20

# Deployment frequency (last 30 days)
gh api repos/contoso/webapp/deployments --jq '[
  .[] | select((.created_at | fromdateiso8601) > (now - 2592000))
] | group_by(.environment) | .[] | {
  environment: .[0].environment,
  count: length,
  frequency: (length / 30 | tostring + " per day")
}'
```

### Task 6: Azure Pipelines alerts

Configure notifications in Azure DevOps:

```bash
# Azure DevOps notification settings (via web UI):
# 1. Project Settings > Notifications
# 2. Create subscription:
#    - Category: Build
#    - Event: A build completes > with status Failed
#    - Deliver to: Team email or custom email
#    - Filter: Definition name = "Production-Deploy"

# Alternatively, configure per-pipeline notifications via REST API:
curl -X POST \
  "https://dev.azure.com/contoso/ContosoWeb/_apis/notification/subscriptions?api-version=7.1-preview.1" \
  -H "Authorization: Basic $(echo -n :$PAT | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Notify on production pipeline failure",
    "filter": {
      "type": "Expression",
      "filterModel": {
        "clauses": [{
          "logicalOperator": "",
          "fieldName": "Definition name",
          "operator": "=",
          "value": "Production-Deploy"
        }]
      }
    },
    "channel": {
      "type": "EmailHtml"
    },
    "subscriber": {
      "id": "ops-team@contoso.com"
    }
  }'
```

Pipeline retention warnings:

```yaml
# azure-pipelines.yml - Warn before artifacts expire
schedules:
  - cron: "0 9 * * 1"
    displayName: Weekly retention audit
    branches:
      include:
        - main

steps:
  - task: PowerShell@2
    inputs:
      targetType: 'inline'
      script: |
        $headers = @{
          Authorization = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$(System.AccessToken)")))"
        }
        # Check builds with artifacts nearing retention limit
        $builds = Invoke-RestMethod -Uri "https://dev.azure.com/contoso/ContosoWeb/_apis/build/builds?api-version=7.1&minTime=$((Get-Date).AddDays(-25).ToString('o'))&maxTime=$((Get-Date).AddDays(-20).ToString('o'))" -Headers $headers
        if ($builds.count -gt 0) {
          Write-Host "##vso[task.logissue type=warning]$($builds.count) builds have artifacts expiring within 5 days"
        }
```

### Task 7: Build a workflow that sends weekly metrics digest

```yaml
# .github/workflows/weekly-metrics.yml
name: Weekly engineering metrics
on:
  schedule:
    - cron: '0 9 * * 1'  # Monday 9 AM UTC
  workflow_dispatch:

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Collect metrics
        id: metrics
        run: |
          # Workflow success rates
          DEPLOY_RUNS=$(gh run list --workflow deploy.yml --limit 50 --json conclusion)
          DEPLOY_SUCCESS=$(echo "$DEPLOY_RUNS" | jq '[.[] | select(.conclusion == "success")] | length')
          DEPLOY_TOTAL=$(echo "$DEPLOY_RUNS" | jq 'length')
          DEPLOY_RATE=$(echo "scale=1; $DEPLOY_SUCCESS * 100 / $DEPLOY_TOTAL" | bc)

          CI_RUNS=$(gh run list --workflow ci.yml --limit 50 --json conclusion)
          CI_SUCCESS=$(echo "$CI_RUNS" | jq '[.[] | select(.conclusion == "success")] | length')
          CI_TOTAL=$(echo "$CI_RUNS" | jq 'length')
          CI_RATE=$(echo "scale=1; $CI_SUCCESS * 100 / $CI_TOTAL" | bc)

          # PR metrics
          PRS_MERGED=$(gh pr list --state merged --limit 100 --json mergedAt \
            --jq '[.[] | select((.mergedAt | fromdateiso8601) > (now - 604800))] | length')
          PRS_OPEN=$(gh pr list --state open --json number --jq 'length')

          # Issues
          ISSUES_CLOSED=$(gh issue list --state closed --limit 100 --json closedAt \
            --jq '[.[] | select((.closedAt | fromdateiso8601) > (now - 604800))] | length')
          ISSUES_OPEN=$(gh issue list --state open --json number --jq 'length')

          # Store metrics
          echo "deploy-rate=$DEPLOY_RATE" >> $GITHUB_OUTPUT
          echo "ci-rate=$CI_RATE" >> $GITHUB_OUTPUT
          echo "prs-merged=$PRS_MERGED" >> $GITHUB_OUTPUT
          echo "prs-open=$PRS_OPEN" >> $GITHUB_OUTPUT
          echo "issues-closed=$ISSUES_CLOSED" >> $GITHUB_OUTPUT
          echo "issues-open=$ISSUES_OPEN" >> $GITHUB_OUTPUT
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Send digest to Slack
        uses: slackapi/slack-github-action@v1.27.0
        with:
          payload: |
            {
              "blocks": [
                {
                  "type": "header",
                  "text": {"type": "plain_text", "text": "Weekly Engineering Metrics - ${{ github.repository }}"}
                },
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Pipeline:* ${{ steps.metrics.outputs['deploy-rate'] }}% success rate\n*CI Pipeline:* ${{ steps.metrics.outputs['ci-rate'] }}% success rate\n*PRs Merged:* ${{ steps.metrics.outputs['prs-merged'] }} this week\n*PRs Open:* ${{ steps.metrics.outputs['prs-open'] }}\n*Issues Closed:* ${{ steps.metrics.outputs['issues-closed'] }} this week\n*Issues Open:* ${{ steps.metrics.outputs['issues-open'] }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK

## Break and fix

### Break scenario 1: Workflow insights show 0% success rate but pipelines are passing

The GitHub Actions insights page shows failures for a workflow, but developers confirm the builds are green.

**Cause:** The workflow has a required job that is being skipped due to a path filter or conditional. Skipped jobs are counted as neutral, but the overall workflow conclusion may show as "failure" if a downstream job fails because a dependency was skipped.

**Diagnosis:**

```bash
gh run list --workflow ci.yml --limit 10 --json conclusion,status \
  --jq '.[] | {conclusion, status}'
```


<details>
<summary>Show solution</summary>

**Fix:** Ensure that conditional jobs handle skip conditions correctly:

```yaml
jobs:
  test:
    if: always()
    needs: [build]
    # Use outcome check instead of default success() which fails on skip
    steps:
      - run: echo "Tests running"
        if: needs.build.result == 'success'
```

</details>

### Break scenario 2: Slack notifications not being delivered

The `notify-on-failure` job runs successfully but no Slack message appears.

**Cause:** The Slack webhook URL has expired or the webhook was deleted from the Slack workspace.

**Diagnosis:**

```bash
# Test the webhook directly
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text": "test message"}'
# If response is "invalid_token" or "channel_not_found", the webhook is broken
```


<details>
<summary>Show solution</summary>

**Fix:** Generate a new webhook URL in Slack (Apps > Incoming Webhooks > Add new) and update the repository secret:

```bash
gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/NEW/WEBHOOK/URL"
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Contoso's engineering manager wants to know the deployment frequency for the last 30 days without leaving the terminal. Which approach provides this data?",
    options: [
      "Check the GitHub Actions billing page",
      "Query the deployments API via 'gh api repos/contoso/webapp/deployments' and filter by date",
      "Download workflow run logs and count manually",
      "Use the GitHub Insights traffic page"
    ],
    correctIndex: 1,
    explanation: "The GitHub Deployments API provides a complete record of all deployments with timestamps, environments, and creators. By querying this API and filtering by date range, you can calculate deployment frequency, deployment cadence per environment, and identify deployment patterns."
  },
  {
    question: "A GitHub Actions workflow needs to send a notification to Microsoft Teams only when the production deployment job fails. What is the correct approach?",
    options: [
      "Add a notification step at the end of the deployment job",
      "Create a separate job with 'if: failure()' that depends on the deployment job",
      "Configure GitHub webhook delivery to Teams",
      "Use the built-in GitHub email notifications"
    ],
    correctIndex: 1,
    explanation: "A separate notification job with needs: [deploy] and if: failure() runs only when the dependency job fails. This is cleaner than adding conditional steps to the deployment job (which would not run if the job fails early) and more flexible than built-in email notifications."
  },
  {
    question: "Contoso wants to track sprint progress with burn-down charts and cycle time metrics. Where should they configure these visualizations?",
    options: [
      "GitHub repository Insights tab",
      "GitHub Projects Insights (charts)",
      "GitHub Actions workflow insights",
      "Azure DevOps Analytics"
    ],
    correctIndex: 1,
    explanation: "GitHub Projects (v2) provides an Insights tab with customizable charts including burn-down charts, velocity tracking, and cycle time visualizations. These are based on project items and their status transitions. Repository Insights covers traffic and contributions, not work item tracking."
  },
  {
    question: "An Azure DevOps pipeline should send a notification when a build fails and also when a build succeeds after a previous failure (recovery notification). How should this be configured?",
    options: [
      "Create two notification subscriptions: one for failure and one for success with the filter \"previous state was failed\"",
      "Create a single notification for all build completions",
      "Use a pipeline step with conditional logic to check previous build status",
      "Configure a service hook with state transition filters"
    ],
    correctIndex: 0,
    explanation: "Azure DevOps notification subscriptions support filtering by event state. Creating one subscription for \"build fails\" and another for \"build succeeds AND last build was failed\" provides both failure alerts and recovery notifications. This is a built-in capability of the notification system without requiring custom pipeline logic."
  }
]} />

## Cleanup

```bash
# Remove workflow files
rm -f .github/workflows/notify-on-failure.yml
rm -f .github/workflows/deployment-tracker.yml
rm -f .github/workflows/weekly-metrics.yml

# Remove notification subscriptions in Azure DevOps
# Project Settings > Notifications > Delete custom subscriptions

# Remove Slack webhook secret
gh secret delete SLACK_WEBHOOK_URL
gh secret delete TEAMS_WEBHOOK_URL

git add -A && git commit -m "cleanup: remove challenge 48 monitoring workflows" && git push
```
