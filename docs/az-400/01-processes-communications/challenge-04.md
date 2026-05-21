---
sidebar_position: 4
title: "Challenge 04: DevOps metrics and dashboards"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 04: DevOps metrics and dashboards

## Exam skills covered

- Design and implement a dashboard, including flow of work (cycle times, time to recovery, lead time)
- Design and implement appropriate metrics and queries for project planning, development, testing, security, delivery, and operations

## Platform focus

Comparison (GitHub and Azure DevOps)

## Scenario

Contoso Ltd's CTO walks into the all-hands meeting and asks three questions: "How fast do we ship features? How often do we break production? How quickly do we recover when things go wrong?" The room goes silent. Nobody has answers because the organization has never measured its software delivery performance. Teams report anecdotal estimates, and there is no data to distinguish high-performing teams from those struggling. The CTO wants DORA metrics tracked automatically, displayed on dashboards, and used to drive improvement conversations in monthly engineering reviews.

---

## Prerequisites

- A GitHub repository with at least 30 days of commit and deployment history
- An Azure DevOps project with work items and pipeline runs
- GitHub CLI and Azure DevOps CLI installed
- Familiarity with basic analytics concepts (averages, percentiles)
- Azure DevOps Analytics extension enabled

---

## Task 1: Understand the four DORA metrics

DORA (DevOps Research and Assessment) identifies four key metrics that predict software delivery performance:

### Deployment frequency

How often code is deployed to production.

| Level | Frequency |
|-------|-----------|
| Elite | On demand (multiple deploys per day) |
| High | Between once per day and once per week |
| Medium | Between once per week and once per month |
| Low | Between once per month and once every six months |

### Lead time for changes

Time from code commit to running in production.

| Level | Lead time |
|-------|-----------|
| Elite | Less than one hour |
| High | Between one day and one week |
| Medium | Between one week and one month |
| Low | Between one month and six months |

### Mean time to recovery (MTTR)

How long it takes to restore service after a production incident.

| Level | Recovery time |
|-------|--------------|
| Elite | Less than one hour |
| High | Less than one day |
| Medium | Between one day and one week |
| Low | More than one week |

### Change failure rate

Percentage of deployments that result in degraded service requiring remediation.

| Level | Failure rate |
|-------|-------------|
| Elite | 0-15% |
| High | 16-30% |
| Medium | 31-45% |
| Low | 46-60% |

---

## Task 2: Calculate DORA metrics from GitHub data

### Deployment frequency

```bash
# Count deployments per week for the last 90 days
gh api repos/{owner}/{repo}/deployments \
  --paginate \
  --jq '[.[] | select(.environment == "production")] | 
    group_by(.created_at[:10]) | 
    length' 

# More detailed: deployments per week
gh api repos/{owner}/{repo}/deployments \
  --paginate \
  --jq '[.[] | select(.environment == "production") | .created_at[:10]] | 
    sort | 
    group_by(.[0:7]) | 
    map({week: .[0][0:7], count: length})'

# Alternative: count merged PRs to main as a deployment proxy
gh pr list --state merged --base main --limit 100 \
  --json mergedAt \
  --jq 'group_by(.mergedAt[:10]) | map({date: .[0].mergedAt[:10], count: length})'
```

### Lead time for changes

```bash
# Calculate time from first commit in PR to merge
gh pr list --state merged --base main --limit 50 \
  --json number,createdAt,mergedAt \
  --jq '.[] | {
    pr: .number,
    created: .createdAt,
    merged: .mergedAt,
    lead_time_hours: ((.mergedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) / 3600
  }'

# Average lead time
gh pr list --state merged --base main --limit 50 \
  --json createdAt,mergedAt \
  --jq '[.[] | ((.mergedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) / 3600] | 
    (add / length) | 
    "Average lead time: \(. | floor) hours"'
```

### Change failure rate

```bash
# Count deployments with rollbacks or hotfixes
# Assuming failed deployments have a "failure" status
gh api repos/{owner}/{repo}/deployments \
  --paginate \
  --jq '{
    total: [.[] | select(.environment == "production")] | length,
    failed: [.[] | select(.environment == "production") | 
      select(.statuses[0].state == "failure" or .statuses[0].state == "error")] | length
  } | "Failure rate: \(.failed)/\(.total) = \(.failed * 100 / .total)%"'

# Alternative: count reverts and hotfix branches
gh pr list --state merged --base main --limit 200 \
  --json title \
  --jq '[.[] | select(.title | test("revert|hotfix|rollback"; "i"))] | length'
```

### Mean time to recovery

```bash
# Using GitHub Issues labeled as incidents
gh issue list --label "incident" --state closed --limit 50 \
  --json number,createdAt,closedAt \
  --jq '[.[] | {
    issue: .number,
    recovery_hours: ((.closedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) / 3600
  }] | 
  (map(.recovery_hours) | add / length) |
  "Average MTTR: \(. | floor) hours"'
```

---

## Task 3: Create an Azure DevOps dashboard with analytics widgets

### Create the dashboard

```bash
# Create a team dashboard
az devops invoke \
  --area dashboard \
  --resource dashboards \
  --http-method POST \
  --api-version 7.1-preview.3 \
  --route-parameters team="Backend Team" \
  --in-file - << 'EOF'
{
  "name": "Engineering Metrics",
  "description": "DORA metrics and team performance dashboard",
  "widgets": []
}
EOF
```

### Add widgets via REST API

```bash
DASHBOARD_ID="<dashboard-id-from-above>"

# Add a Burndown widget
az devops invoke \
  --area dashboard \
  --resource widgets \
  --http-method POST \
  --api-version 7.1-preview.2 \
  --route-parameters team="Backend Team" dashboardId=$DASHBOARD_ID \
  --in-file - << 'EOF'
{
  "name": "Sprint Burndown",
  "position": {"row": 1, "column": 1},
  "size": {"rowSpan": 2, "columnSpan": 3},
  "contributionId": "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.BurndownWidget",
  "settings": "{\"timePeriod\":\"currentIteration\",\"aggregation\":\"storyPoints\"}"
}
EOF

# Add a Velocity widget
az devops invoke \
  --area dashboard \
  --resource widgets \
  --http-method POST \
  --api-version 7.1-preview.2 \
  --route-parameters team="Backend Team" dashboardId=$DASHBOARD_ID \
  --in-file - << 'EOF'
{
  "name": "Velocity",
  "position": {"row": 1, "column": 4},
  "size": {"rowSpan": 2, "columnSpan": 3},
  "contributionId": "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.VelocityWidget",
  "settings": "{\"numberOfSprints\":6}"
}
EOF

# Add a Cycle Time widget
az devops invoke \
  --area dashboard \
  --resource widgets \
  --http-method POST \
  --api-version 7.1-preview.2 \
  --route-parameters team="Backend Team" dashboardId=$DASHBOARD_ID \
  --in-file - << 'EOF'
{
  "name": "Cycle Time",
  "position": {"row": 3, "column": 1},
  "size": {"rowSpan": 2, "columnSpan": 3},
  "contributionId": "ms.vss-analytics-widgets.Microsoft.VisualStudioOnline.Analytics.CycleTimeWidget",
  "settings": "{\"timePeriod\":\"last30Days\",\"workItemType\":\"User Story\"}"
}
EOF
```

---

## Task 4: Use Azure DevOps Analytics with OData queries

Azure DevOps Analytics provides OData endpoints for advanced querying.

### Query cycle time data

```bash
# Get average cycle time for user stories in the last 30 days
ANALYTICS_URL="https://analytics.dev.azure.com/contoso-org/Contoso%20Web%20Platform/_odata/v4.0-preview"

curl -s -u ":$AZURE_DEVOPS_PAT" \
  "$ANALYTICS_URL/WorkItems?\$filter=WorkItemType eq 'User Story' and StateCategory eq 'Completed' and CompletedDate gt 2025-01-01T00:00:00Z&\$select=WorkItemId,Title,CycleTimeDays&\$orderby=CompletedDate desc&\$top=50" | \
  jq '.value[] | {id: .WorkItemId, title: .Title, cycle_time_days: .CycleTimeDays}'

# Get lead time distribution
curl -s -u ":$AZURE_DEVOPS_PAT" \
  "$ANALYTICS_URL/WorkItems?\$filter=WorkItemType eq 'User Story' and StateCategory eq 'Completed' and CompletedDate gt 2024-12-01T00:00:00Z&\$apply=groupby((Area/AreaPath),aggregate(LeadTimeDays with average as AvgLeadTime, LeadTimeDays with max as MaxLeadTime, \$count as Count))" | \
  jq '.value'

# Pipeline pass rate over time
curl -s -u ":$AZURE_DEVOPS_PAT" \
  "$ANALYTICS_URL/PipelineRuns?\$filter=CompletedDate gt 2025-01-01T00:00:00Z and Pipeline/PipelineName eq 'contoso-webapp-ci'&\$apply=groupby((CompletedDateSK),aggregate(\$count as TotalRuns, SucceededCount with sum as Passed))" | \
  jq '.value[] | {date: .CompletedDateSK, total: .TotalRuns, passed: .Passed, pass_rate: (.Passed * 100 / .TotalRuns)}'
```

### Query deployment frequency from pipelines

```bash
# Count production deployments per week
curl -s -u ":$AZURE_DEVOPS_PAT" \
  "$ANALYTICS_URL/PipelineRuns?\$filter=Pipeline/PipelineName eq 'contoso-webapp-deploy' and RunOutcome eq 'Succeed' and CompletedDate gt 2024-10-01T00:00:00Z&\$apply=groupby((CompletedDate/WeekStartingMonday),aggregate(\$count as DeployCount))&\$orderby=CompletedDate/WeekStartingMonday desc" | \
  jq '.value'
```

---

## Task 5: Implement a GitHub Actions workflow that tracks deployment frequency

```bash
cat > .github/workflows/track-deployment.yml << 'EOF'
name: Track deployment metrics

on:
  deployment_status:
  workflow_run:
    workflows: ["Deploy to Production"]
    types: [completed]

jobs:
  record-deployment:
    runs-on: ubuntu-latest
    if: github.event.deployment_status.state == 'success' || github.event.workflow_run.conclusion == 'success'
    steps:
      - uses: actions/checkout@v4

      - name: Record deployment event
        uses: actions/github-script@v7
        with:
          script: |
            const now = new Date().toISOString();
            const sha = context.sha;
            
            // Get the first commit time for this deployment
            const commits = await github.rest.repos.listCommits({
              owner: context.repo.owner,
              repo: context.repo.repo,
              sha: sha,
              per_page: 1
            });
            
            const commitTime = commits.data[0]?.commit?.author?.date;
            const deployTime = now;
            
            // Calculate lead time in hours
            const leadTimeMs = new Date(deployTime) - new Date(commitTime);
            const leadTimeHours = (leadTimeMs / (1000 * 60 * 60)).toFixed(1);
            
            core.info(`Deployment recorded:`);
            core.info(`  SHA: ${sha}`);
            core.info(`  Deploy time: ${deployTime}`);
            core.info(`  Commit time: ${commitTime}`);
            core.info(`  Lead time: ${leadTimeHours} hours`);
            
            // Create a deployment annotation
            await github.rest.repos.createDeploymentStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              deployment_id: context.payload.deployment?.id || 0,
              state: 'success',
              description: `Lead time: ${leadTimeHours}h`,
              environment: 'production'
            });

      - name: Check for change failure
        uses: actions/github-script@v7
        with:
          script: |
            // Look for rollback deployments in the last 24 hours
            const deployments = await github.rest.repos.listDeployments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              environment: 'production',
              per_page: 10
            });
            
            const now = new Date();
            const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
            
            const recentDeployments = deployments.data.filter(
              d => new Date(d.created_at) > oneDayAgo
            );
            
            if (recentDeployments.length > 3) {
              core.warning(
                `${recentDeployments.length} deployments in last 24h - possible instability`
              );
            }
            
            core.info(`Deployments in last 24h: ${recentDeployments.length}`);
EOF

git add .github/workflows/track-deployment.yml
git commit -m "ci: add deployment metrics tracking workflow"
git push origin main
```

---

## Task 6: Create a metrics summary report

Build a workflow that generates a weekly DORA metrics summary:

```bash
cat > .github/workflows/weekly-metrics.yml << 'EOF'
name: Weekly DORA metrics report

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
  workflow_dispatch:

jobs:
  generate-report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Calculate deployment frequency
        id: deploy-freq
        uses: actions/github-script@v7
        with:
          script: |
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            
            const deployments = await github.rest.repos.listDeployments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              environment: 'production',
              per_page: 100
            });
            
            const thisWeek = deployments.data.filter(
              d => new Date(d.created_at) > new Date(sevenDaysAgo)
            );
            
            core.setOutput('count', thisWeek.length);
            core.setOutput('frequency', thisWeek.length >= 7 ? 'Elite' : 
              thisWeek.length >= 1 ? 'High' : 'Medium');

      - name: Calculate lead time
        id: lead-time
        uses: actions/github-script@v7
        with:
          script: |
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            
            const prs = await github.rest.pulls.list({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'closed',
              base: 'main',
              sort: 'updated',
              direction: 'desc',
              per_page: 50
            });
            
            const mergedThisWeek = prs.data.filter(
              pr => pr.merged_at && new Date(pr.merged_at) > new Date(sevenDaysAgo)
            );
            
            if (mergedThisWeek.length === 0) {
              core.setOutput('avg_hours', 'N/A');
              core.setOutput('level', 'N/A');
              return;
            }
            
            const leadTimes = mergedThisWeek.map(pr => {
              return (new Date(pr.merged_at) - new Date(pr.created_at)) / (1000 * 60 * 60);
            });
            
            const avg = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;
            core.setOutput('avg_hours', avg.toFixed(1));
            core.setOutput('level', avg < 1 ? 'Elite' : avg < 168 ? 'High' : 'Medium');

      - name: Create metrics issue
        uses: actions/github-script@v7
        with:
          script: |
            const deployCount = '${{ steps['deploy-freq'].outputs.count }}';
            const deployLevel = '${{ steps['deploy-freq'].outputs.frequency }}';
            const leadTime = '${{ steps['lead-time'].outputs.avg_hours }}';
            const leadLevel = '${{ steps['lead-time'].outputs.level }}';
            
            const today = new Date().toISOString().split('T')[0];
            const body = `## Weekly DORA metrics report - ${today}

| Metric | Value | Level |
|--------|-------|-------|
| Deployment frequency | ${deployCount} deploys/week | ${deployLevel} |
| Lead time for changes | ${leadTime} hours avg | ${leadLevel} |
| Change failure rate | TBD | TBD |
| MTTR | TBD | TBD |

### Performance levels reference
- Elite: Multiple deploys/day, <1h lead time, <15% failure, <1h recovery
- High: Weekly deploys, <1 week lead time, 16-30% failure, <1 day recovery
- Medium: Monthly deploys, <1 month lead time, 31-45% failure, <1 week recovery

### Actions
- [ ] Review metrics with engineering leads
- [ ] Identify improvement opportunities
- [ ] Update team OKRs if needed
`;
            
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `DORA Metrics Report - Week of ${today}`,
              body: body,
              labels: ['metrics', 'automated']
            });
EOF

git add .github/workflows/weekly-metrics.yml
git commit -m "ci: add weekly DORA metrics report generation"
git push origin main
```

---

## Break and fix

### Scenario 1: Analytics OData queries return 401 Unauthorized

```bash
# Check if the Analytics extension is enabled
az devops extension show \
  --publisher-id ms \
  --extension-id vss-analytics \
  --org https://dev.azure.com/contoso-org

# If disabled, enable it
az devops extension install \
  --publisher-id ms \
  --extension-id vss-analytics \
  --org https://dev.azure.com/contoso-org
```


<details>
<summary>Show solution</summary>

**Fix:** The Azure DevOps Analytics extension must be installed on the organization. The PAT must have Analytics (read) scope. Verify with:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -u ":$AZURE_DEVOPS_PAT" \
  "https://analytics.dev.azure.com/contoso-org/_odata/v4.0-preview/\$metadata"
# Should return 200
```

</details>

### Scenario 2: Deployment frequency shows zero despite active deployments

**Diagnosis:**

```bash
# Check if deployments use the correct environment name
gh api repos/{owner}/{repo}/deployments --jq '.[].environment' | sort -u

# Common issue: environment is "Production" (capitalized) but query uses "production"
```


<details>
<summary>Show solution</summary>

**Fix:** GitHub deployment environments are case-sensitive. Ensure your workflow creates deployments with a consistent environment name, and queries match exactly.

</details>

### Scenario 3: Lead time calculation is inflated by stale PRs

Old PRs that sat open for weeks skew the average lead time.


<details>
<summary>Show solution</summary>

**Fix:** Filter to PRs created within the measurement window, or use the p50 (median) instead of mean:

```bash
gh pr list --state merged --base main --limit 100 \
  --json createdAt,mergedAt \
  --jq '[.[] | ((.mergedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) / 3600] | sort | .[length/2 | floor]'
```


</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Which DORA metric measures the time between a developer committing code and that code running in production?",
    options: [
      "Deployment frequency",
      "Lead time for changes",
      "Mean time to recovery",
      "Change failure rate"
    ],
    correctIndex: 1,
    explanation: "Lead time for changes measures the elapsed time from when a code change is committed to when it is successfully running in production. This includes code review time, CI/CD pipeline execution, and any manual approval gates."
  },
  {
    question: "An organization deploys to production three times per week and has an average lead time of four days. According to DORA classifications, what performance level do these metrics indicate?",
    options: [
      "Elite for both",
      "High for deployment frequency, Medium for lead time",
      "High for both",
      "Medium for deployment frequency, High for lead time"
    ],
    correctIndex: 2,
    explanation: "Three deployments per week falls in the High category (between daily and weekly). Four days lead time also falls in the High category (between one day and one week)."
  },
  {
    question: "What is the primary purpose of the Azure DevOps Analytics OData endpoint?",
    options: [
      "To store build artifacts",
      "To provide a queryable reporting layer over Azure DevOps operational data with aggregation support",
      "To replace Azure Boards queries",
      "To sync data between Azure DevOps and GitHub"
    ],
    correctIndex: 1,
    explanation: "The Analytics OData endpoint provides a read-optimized, queryable data warehouse over Azure DevOps data. It supports aggregation, filtering, and grouping operations that would be expensive or impossible against the operational APIs directly."
  },
  {
    question: "A team wants to improve their change failure rate. Which practice would most directly reduce this metric?",
    options: [
      "Deploying more frequently",
      "Implementing comprehensive automated testing, progressive rollouts, and feature flags",
      "Reducing the number of developers",
      "Increasing the number of manual approvals"
    ],
    correctIndex: 1,
    explanation: "Change failure rate is reduced by catching issues before they reach production (automated testing), limiting blast radius when issues do occur (progressive rollouts, canary deployments), and enabling instant rollback without redeployment (feature flags)."
  }
]} />

## Cleanup

```bash
# Remove workflow files
rm -f .github/workflows/track-deployment.yml
rm -f .github/workflows/weekly-metrics.yml

# Close any auto-generated metrics issues
gh issue list --label "metrics,automated" --json number --jq '.[].number' | \
  xargs -I {} gh issue close {}

# Remove the metrics label
gh label delete "metrics" --yes
gh label delete "automated" --yes

# Commit cleanup
git add -A
git commit -m "chore: remove metrics lab artifacts"
git push origin main
```
