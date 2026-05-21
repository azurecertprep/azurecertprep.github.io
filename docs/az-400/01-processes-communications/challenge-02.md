---
sidebar_position: 2
title: "Challenge 02: Feedback cycles and work tracking"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 02: Feedback cycles and work tracking

## Exam skills covered

- Design and implement a strategy for feedback cycles, including notifications and GitHub issues
- Design and implement integration for tracking work, including GitHub projects, Azure Boards, and repositories

## Platform focus

Comparison (GitHub Projects v2 and Azure Boards)

## Scenario

Contoso Ltd's product development is in disarray. Project managers maintain spreadsheets that are outdated within hours. Developers track their work on physical sticky notes or personal to-do lists. The QA team finds out about new features only when code hits the staging environment. Sprint planning is guesswork because nobody has data on velocity or remaining work. The Director of Engineering wants a unified work tracking system with proper feedback loops so that every stakeholder has real-time visibility into project status.

---

## Prerequisites

- A GitHub organization with a repository (`contoso-webapp`)
- An Azure DevOps organization with a project (Agile process template)
- GitHub CLI installed and authenticated
- Azure DevOps CLI extension installed (`az extension add --name azure-devops`)
- Azure CLI authenticated (`az login`)

---

## Task 1: Set up GitHub Projects (v2) with custom fields and automation

GitHub Projects v2 uses a flexible table/board layout with custom fields, views, and built-in automation.

### Create the project

```bash
# Create an organization-level project
gh project create \
  --owner "contoso-org" \
  --title "Contoso Web Platform Q1"

# Note the project number from output (e.g., 5)
PROJECT_NUMBER=5

# List projects to confirm creation
gh project list --owner "contoso-org"
```

### Add custom fields

```bash
# Add a Priority field (single select)
gh project field-create $PROJECT_NUMBER \
  --owner "contoso-org" \
  --name "Priority" \
  --data-type "SINGLE_SELECT" \
  --single-select-options "Critical,High,Medium,Low"

# Add a Sprint field (iteration)
gh project field-create $PROJECT_NUMBER \
  --owner "contoso-org" \
  --name "Sprint" \
  --data-type "ITERATION"

# Add a Team field (single select)
gh project field-create $PROJECT_NUMBER \
  --owner "contoso-org" \
  --name "Team" \
  --data-type "SINGLE_SELECT" \
  --single-select-options "Frontend,Backend,Platform,QA"

# Add a Story Points field (number)
gh project field-create $PROJECT_NUMBER \
  --owner "contoso-org" \
  --name "Story Points" \
  --data-type "NUMBER"
```

### Create views for different stakeholders

```bash
# Create a board view for developers
gh project view-create $PROJECT_NUMBER \
  --owner "contoso-org" \
  --title "Sprint Board" \
  --layout "board"

# Create a table view for project managers
gh project view-create $PROJECT_NUMBER \
  --owner "contoso-org" \
  --title "Backlog Table" \
  --layout "table"

# Create a roadmap view for leadership
gh project view-create $PROJECT_NUMBER \
  --owner "contoso-org" \
  --title "Roadmap" \
  --layout "roadmap"
```

### Configure built-in automation

In the project settings (via the UI or GraphQL API), enable these automations:

```bash
# Using GraphQL to enable auto-add for a repository
gh api graphql -f query='
mutation {
  updateProjectV2(
    input: {
      projectId: "PROJECT_NODE_ID"
      title: "Contoso Web Platform Q1"
    }
  ) {
    projectV2 {
      id
    }
  }
}'

# Auto-add items from repository using project workflow settings
# Navigate to: Project > Settings > Workflows
# Enable:
#   - Item added to project -> Set Status to "Backlog"
#   - Pull request merged -> Set Status to "Done"
#   - Item reopened -> Set Status to "In Progress"
```

---

## Task 2: Set up Azure Boards with sprints, queries, and dashboards

### Configure the Azure DevOps project

```bash
# Set default organization and project
az devops configure --defaults \
  organization=https://dev.azure.com/contoso-org \
  project="Contoso Web Platform"

# Create a new team for the backend group
az devops team create \
  --name "Backend Team" \
  --description "Backend services development team"

# Create area paths for each team
az boards area project create \
  --name "Backend"
az boards area project create \
  --name "Frontend"
az boards area project create \
  --name "Platform"

# Create iteration paths for sprints
az boards iteration project create \
  --name "Sprint 1" \
  --start-date "2025-01-13" \
  --finish-date "2025-01-24"
az boards iteration project create \
  --name "Sprint 2" \
  --start-date "2025-01-27" \
  --finish-date "2025-02-07"
az boards iteration project create \
  --name "Sprint 3" \
  --start-date "2025-02-10" \
  --finish-date "2025-02-21"
```

### Create work items

```bash
# Create an Epic
az boards work-item create \
  --type "Epic" \
  --title "User Authentication Overhaul" \
  --description "Replace legacy auth with OAuth 2.0 and OIDC" \
  --area "Contoso Web Platform\Backend" \
  --iteration "Contoso Web Platform\Sprint 1"

# Create a Feature under the Epic
az boards work-item create \
  --type "Feature" \
  --title "Implement SSO with Microsoft Entra ID" \
  --description "Enable single sign-on using MSAL library" \
  --area "Contoso Web Platform\Backend" \
  --iteration "Contoso Web Platform\Sprint 1"

# Create User Stories
az boards work-item create \
  --type "User Story" \
  --title "As a user, I can sign in with my corporate account" \
  --area "Contoso Web Platform\Backend" \
  --iteration "Contoso Web Platform\Sprint 1" \
  --fields "Microsoft.VSTS.Scheduling.StoryPoints=5"

az boards work-item create \
  --type "User Story" \
  --title "As an admin, I can configure SSO providers" \
  --area "Contoso Web Platform\Backend" \
  --iteration "Contoso Web Platform\Sprint 1" \
  --fields "Microsoft.VSTS.Scheduling.StoryPoints=8"

# Link parent-child relationships
az boards work-item relation add \
  --id 2 \
  --relation-type "Parent" \
  --target-id 1

az boards work-item relation add \
  --id 3 \
  --relation-type "Parent" \
  --target-id 2
```

### Create useful queries

```bash
# Create a shared query for sprint backlog
az boards query create \
  --name "Current Sprint - Backend" \
  --wiql "SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [Microsoft.VSTS.Scheduling.StoryPoints] FROM WorkItems WHERE [System.AreaPath] UNDER 'Contoso Web Platform\Backend' AND [System.IterationPath] = @CurrentIteration AND [System.State] <> 'Closed' ORDER BY [Microsoft.VSTS.Common.BacklogPriority]" \
  --path "Shared Queries"

# Create a query for bugs by priority
az boards query create \
  --name "Active Bugs by Priority" \
  --wiql "SELECT [System.Id], [System.Title], [System.State], [Microsoft.VSTS.Common.Priority], [System.AssignedTo] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] <> 'Closed' ORDER BY [Microsoft.VSTS.Common.Priority]" \
  --path "Shared Queries"
```

---

## Task 3: Configure GitHub Issues with templates, labels, and milestones

### Create issue templates

```bash
cd contoso-webapp
mkdir -p .github/ISSUE_TEMPLATE

# Bug report template
cat > .github/ISSUE_TEMPLATE/bug_report.yml << 'EOF'
name: Bug Report
description: Report a bug in the application
title: "[Bug]: "
labels: ["bug", "triage"]
assignees: []
body:
  - type: markdown
    attributes:
      value: "Thank you for reporting a bug. Please fill in the details below."

  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options:
        - Critical (system down)
        - High (major feature broken)
        - Medium (feature impaired)
        - Low (cosmetic issue)
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: Description
      description: What happened?
      placeholder: Describe the bug clearly
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: Steps to reproduce
      description: How can we reproduce this?
      value: |
        1. Go to '...'
        2. Click on '...'
        3. Observe error
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
      description: What should have happened?
    validations:
      required: true

  - type: input
    id: environment
    attributes:
      label: Environment
      description: Browser, OS, and app version
      placeholder: "Chrome 120, Windows 11, v2.3.1"
    validations:
      required: true
EOF

# Feature request template
cat > .github/ISSUE_TEMPLATE/feature_request.yml << 'EOF'
name: Feature Request
description: Suggest a new feature or enhancement
title: "[Feature]: "
labels: ["enhancement"]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem statement
      description: What problem does this feature solve?
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed solution
      description: How should this work?
    validations:
      required: true

  - type: dropdown
    id: priority
    attributes:
      label: Business priority
      options:
        - Must have (blocking release)
        - Should have (important but not blocking)
        - Nice to have (future consideration)
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives considered
      description: What other approaches did you consider?
EOF

# Issue template chooser config
cat > .github/ISSUE_TEMPLATE/config.yml << 'EOF'
blank_issues_enabled: false
contact_links:
  - name: Security vulnerability
    url: https://github.com/contoso-org/contoso-webapp/security/advisories/new
    about: Report security vulnerabilities privately
  - name: Questions and discussions
    url: https://github.com/contoso-org/contoso-webapp/discussions
    about: Ask questions in GitHub Discussions
EOF
```

### Create labels and milestones

```bash
# Create custom labels
gh label create "priority/critical" --color "B60205" --description "Requires immediate attention"
gh label create "priority/high" --color "D93F0B" --description "Important, fix soon"
gh label create "priority/medium" --color "FBCA04" --description "Normal priority"
gh label create "priority/low" --color "0E8A16" --description "Nice to have"
gh label create "team/backend" --color "1D76DB" --description "Backend team"
gh label create "team/frontend" --color "5319E7" --description "Frontend team"
gh label create "team/platform" --color "006B75" --description "Platform team"
gh label create "status/blocked" --color "B60205" --description "Blocked by dependency"
gh label create "status/needs-info" --color "D876E3" --description "Needs more information"

# Create milestones
gh api repos/{owner}/{repo}/milestones \
  --method POST \
  --field title="v2.4.0 - Auth Overhaul" \
  --field description="OAuth 2.0 migration and SSO support" \
  --field due_on="2025-02-28T00:00:00Z" \
  --field state="open"

gh api repos/{owner}/{repo}/milestones \
  --method POST \
  --field title="v2.5.0 - Performance" \
  --field description="Response time improvements and caching" \
  --field due_on="2025-03-31T00:00:00Z" \
  --field state="open"
```

---

## Task 4: Link commits and PRs to work items

### GitHub Issues linking

```bash
# Create a commit that references an issue
git commit -m "feat: add OAuth callback handler

Implements the redirect URI handler for the Microsoft Entra ID
OAuth flow. Validates state parameter and exchanges auth code
for tokens.

Fixes #42
Relates to #38"

# Create a PR that closes an issue
gh pr create \
  --title "feat: implement SSO login flow" \
  --body "Implements the complete SSO login flow using MSAL.

Closes #42
Closes #43
Part of milestone v2.4.0"
```

### Azure Boards linking (AB# syntax)

When Azure Boards is integrated with your GitHub repository, use the `AB#` syntax:

```bash
# Commit that links to Azure Boards work item
git commit -m "feat: add token refresh logic

Implements automatic token refresh when the access token
expires. Uses the refresh token stored in the secure cookie.

AB#1234"

# PR that transitions a work item
gh pr create \
  --title "feat: token refresh implementation" \
  --body "Implements token refresh as described in the design doc.

Fixes AB#1234
Related to AB#1200"
```

The `Fixes AB#1234` syntax will transition the work item to the "Done" state when the PR merges.

---

## Task 5: Set up notification rules for stakeholders

### GitHub notification configuration

```bash
# Configure repository notification settings (per-user via API)
# Watch specific events only
gh api repos/{owner}/{repo}/subscription \
  --method PUT \
  --field subscribed=true \
  --field ignored=false

# Create a CODEOWNERS file for automatic review assignments
cat > .github/CODEOWNERS << 'EOF'
# Default owner for everything
* @contoso-org/engineering-leads

# Backend team owns API and services
/src/api/ @contoso-org/backend-team
/src/services/ @contoso-org/backend-team

# Frontend team owns UI components
/src/components/ @contoso-org/frontend-team
/src/pages/ @contoso-org/frontend-team

# Platform team owns infrastructure
/infrastructure/ @contoso-org/platform-team
/.github/workflows/ @contoso-org/platform-team

# Security team must review auth changes
/src/auth/ @contoso-org/security-team
EOF

git add .github/CODEOWNERS
git commit -m "chore: add CODEOWNERS for automatic review routing"
git push origin main
```

### Azure DevOps notification subscriptions

```bash
# Create a team notification for high-priority bugs
az devops invoke \
  --area notification \
  --resource subscriptions \
  --http-method POST \
  --api-version 7.1 \
  --in-file - << 'EOF'
{
  "description": "High priority bug assigned to Backend Team",
  "filter": {
    "type": "Expression",
    "filterModel": {
      "clauses": [
        {
          "fieldName": "System.WorkItemType",
          "operator": "=",
          "value": "Bug"
        },
        {
          "fieldName": "Microsoft.VSTS.Common.Priority",
          "operator": "<=",
          "value": "2"
        },
        {
          "fieldName": "System.AreaPath",
          "operator": "Under",
          "value": "Contoso Web Platform\\Backend"
        }
      ]
    }
  },
  "channel": {
    "type": "EmailHtml"
  },
  "subscriber": {
    "id": "backend-team-id"
  }
}
EOF
```

---

## Task 6: Configure GitHub Actions to update project boards automatically

Create a workflow that automatically manages project board items:

```bash
cat > .github/workflows/project-automation.yml << 'EOF'
name: Project automation

on:
  issues:
    types: [opened, closed, labeled]
  pull_request:
    types: [opened, ready_for_review, closed]

jobs:
  add-to-project:
    runs-on: ubuntu-latest
    if: github.event_name == 'issues' && github.event.action == 'opened'
    steps:
      - name: Add issue to project
        uses: actions/add-to-project@v1
        with:
          project-url: https://github.com/orgs/contoso-org/projects/5
          github-token: ${{ secrets.PROJECT_TOKEN }}

  set-priority-on-label:
    runs-on: ubuntu-latest
    if: github.event_name == 'issues' && github.event.action == 'labeled'
    steps:
      - name: Set priority field based on label
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.PROJECT_TOKEN }}
          script: |
            const label = context.payload.label.name;
            const priorityMap = {
              'priority/critical': 'Critical',
              'priority/high': 'High',
              'priority/medium': 'Medium',
              'priority/low': 'Low'
            };

            if (priorityMap[label]) {
              core.info(`Setting priority to ${priorityMap[label]}`);
              // GraphQL mutation to update project item field
              // Implementation depends on project field IDs
            }

  move-pr-to-review:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' && github.event.action == 'ready_for_review'
    steps:
      - name: Move linked issues to In Review
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.PROJECT_TOKEN }}
          script: |
            const prBody = context.payload.pull_request.body || '';
            const issueRefs = prBody.match(/#(\d+)/g) || [];

            for (const ref of issueRefs) {
              const issueNumber = parseInt(ref.replace('#', ''));
              core.info(`PR is ready for review, linked issue: ${issueNumber}`);
            }

  close-linked-issues:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' && github.event.action == 'closed' && github.event.pull_request.merged == true
    steps:
      - name: Update project status for merged PR
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.PROJECT_TOKEN }}
          script: |
            core.info('PR merged - project automation will move items to Done');
EOF

git add .github/workflows/project-automation.yml
git commit -m "ci: add project board automation workflow"
git push origin main
```

---

## Break and fix

### Scenario 1: Issues are not appearing on the project board

New issues are created but do not show up in the GitHub Project.

**Diagnosis:**

```bash
# Check if the project automation workflow has the correct token
gh run list --workflow=project-automation.yml --limit 5

# Check the workflow run logs for permission errors
gh run view <run-id> --log

# Verify the PROJECT_TOKEN secret has correct scopes
# The token needs: project (read/write), issues (read)
```


<details>
<summary>Show solution</summary>

**Fix:** Ensure the Personal Access Token or GitHub App token stored in `PROJECT_TOKEN` has the `project` scope. Organization projects require `org:read` scope as well.

</details>

### Scenario 2: Azure Boards work items not transitioning on PR merge

The `Fixes AB#1234` syntax is not moving items to Done.

**Diagnosis:**

```bash
# Verify the Azure Boards GitHub integration is installed
gh api repos/{owner}/{repo}/installations --jq '.[].app_slug'
# Should include "azure-boards"

# Check the work item state
az boards work-item show --id 1234 --fields "System.State"
```


<details>
<summary>Show solution</summary>

**Fix:** Ensure the Azure Boards GitHub App is installed on the repository and that the keyword `Fixes` (not just `AB#`) is used. The connection must be configured in Azure DevOps under Project Settings > GitHub connections.

</details>

### Scenario 3: CODEOWNERS not triggering review requests

PRs that modify backend files are not automatically requesting reviews from the backend team.

**Diagnosis:**

```bash
# Check if branch protection requires CODEOWNER reviews
gh api repos/{owner}/{repo}/branches/main/protection/required_pull_request_reviews \
  --jq '.require_code_owner_reviews'

# Verify CODEOWNERS file is in the correct location
# Must be in: .github/CODEOWNERS, CODEOWNERS, or docs/CODEOWNERS
gh api repos/{owner}/{repo}/contents/.github/CODEOWNERS --jq '.name'

# Check if the team exists and has repository access
gh api orgs/{org}/teams/backend-team/repos --jq '.[].name'
```


<details>
<summary>Show solution</summary>

**Fix:** Branch protection must have "Require review from Code Owners" enabled. The team referenced in CODEOWNERS must have at least read access to the repository.


</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "In GitHub Projects v2, what is the difference between a view and a field?",
    options: [
      "Views are for admins only; fields are visible to everyone",
      "Fields define the data stored on each item; views define how items are displayed and filtered",
      "Views are permanent; fields can be changed",
      "Fields only apply to issues; views apply to pull requests"
    ],
    correctIndex: 1,
    explanation: "Fields are custom metadata (priority, sprint, story points) attached to each project item. Views are saved configurations that define layout (table, board, roadmap), grouping, filtering, and sorting of those items."
  },
  {
    question: "Which syntax in a PR description will automatically transition an Azure Boards work item to the resolved/closed state when the PR merges?",
    options: [
      "'AB#1234'",
      "'Linked AB#1234'",
      "'Fixes AB#1234'",
      "'Closes AB#1234'"
    ],
    correctIndex: 2,
    explanation: "The Fixes AB#1234 keyword triggers state transition. Using just AB#1234 creates a link without transitioning. The Fixes keyword is the required trigger."
  },
  {
    question: "What is the purpose of the CODEOWNERS file in a GitHub repository?",
    options: [
      "It restricts who can clone the repository",
      "It automatically assigns reviewers to PRs based on which files are modified",
      "It defines who can merge pull requests",
      "It configures repository access permissions"
    ],
    correctIndex: 1,
    explanation: "CODEOWNERS maps file paths to teams or individuals who are automatically requested as reviewers when those files change in a PR. Combined with \"require CODEOWNER review\" in branch protection, it enforces domain expertise sign-off."
  },
  {
    question: "When configuring Azure Boards iteration paths for sprint planning, what does the '@CurrentIteration' macro do in a query?",
    options: [
      "It returns work items from all past and current iterations",
      "It dynamically resolves to the iteration that contains today's date based on the team context",
      "It shows only items in the next upcoming iteration",
      "It returns the iteration with the most work items"
    ],
    correctIndex: 1,
    explanation: "@CurrentIteration is a dynamic macro that resolves to whichever iteration path contains the current date for the team's configured iteration schedule. This means dashboard queries automatically shift to the active sprint without manual updates."
  }
]} />

## Cleanup

```bash
# Delete the GitHub project
gh project delete $PROJECT_NUMBER --owner "contoso-org" --yes

# Delete Azure Boards work items (if in a test project)
az boards work-item delete --id 1 --yes --destroy
az boards work-item delete --id 2 --yes --destroy
az boards work-item delete --id 3 --yes --destroy

# Remove labels
gh label delete "priority/critical" --yes
gh label delete "priority/high" --yes
gh label delete "priority/medium" --yes
gh label delete "priority/low" --yes
gh label delete "team/backend" --yes
gh label delete "team/frontend" --yes
gh label delete "team/platform" --yes

# Remove milestones
gh api repos/{owner}/{repo}/milestones/1 --method DELETE
gh api repos/{owner}/{repo}/milestones/2 --method DELETE
```
