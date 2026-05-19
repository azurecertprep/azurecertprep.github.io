---
sidebar_position: 6
title: "Challenge 06: Integrations and webhooks"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 06: Integrations and webhooks

## Exam skills covered

- Configure integration by using webhooks
- Configure integration between Azure Boards and GitHub repositories
- Configure integration between GitHub or Azure DevOps and Microsoft Teams

## Platform focus

Comparison (GitHub, Azure DevOps, and Microsoft Teams)

## Scenario

Contoso Ltd uses GitHub for source control and CI/CD, Azure Boards for project management (the PM team prefers its sprint planning features), and Microsoft Teams for all internal communication. Currently, nothing is connected. The PM team has to manually check Azure Boards for status because they do not receive notifications when PRs close work items. The on-call team misses deployment failures because alerts go to email which nobody checks after hours. Developers context-switch between three tools without any cross-linking. The Platform Engineering team must build integrations that create a seamless flow of information across all three systems.

---

## Prerequisites

- A GitHub organization with a repository (`contoso-webapp`)
- An Azure DevOps organization with Azure Boards configured
- A Microsoft Teams workspace with permission to add apps/connectors
- GitHub CLI installed and authenticated
- Azure CLI with the DevOps extension installed
- Node.js installed (for building the webhook receiver)
- An Azure subscription (for deploying the webhook receiver as a Function)

---

## Task 1: Configure Azure Boards and GitHub integration

### Install the Azure Boards app on GitHub

```bash
# After installing the Azure Boards app from GitHub Marketplace,
# verify the installation
gh api repos/{owner}/contoso-webapp/installations \
  --jq '.[] | select(.app_slug == "azure-boards") | {id: .id, app: .app_slug}'

# List all GitHub connections in Azure DevOps
az devops invoke \
  --area build \
  --resource builds \
  --http-method GET \
  --api-version 7.1 \
  --query-parameters "repositoryType=GitHub" \
  --org https://dev.azure.com/contoso-org \
  --query "value[].repository.id"
```

### Configure the connection in Azure DevOps

```bash
# The connection is configured via Project Settings > GitHub connections
# After connecting, verify the link works:

# Create a work item
WORK_ITEM_ID=$(az boards work-item create \
  --type "User Story" \
  --title "Add payment retry logic" \
  --output tsv \
  --query "id")

echo "Created work item: $WORK_ITEM_ID"

# Now create a commit that references it
git checkout -b feature/payment-retry
cat > src/payments/retry.js << 'EOF'
class PaymentRetryHandler {
  constructor(maxRetries = 3, backoffMs = 1000) {
    this.maxRetries = maxRetries;
    this.backoffMs = backoffMs;
  }

  async execute(paymentFn) {
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await paymentFn();
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          const delay = this.backoffMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }
}

module.exports = PaymentRetryHandler;
EOF

git add -A
git commit -m "feat(payments): add retry logic with exponential backoff

Implements configurable retry with exponential backoff for
transient payment gateway failures.

AB#${WORK_ITEM_ID}"

git push origin feature/payment-retry

# Create PR with Azure Boards reference
gh pr create \
  --title "feat: payment retry logic" \
  --body "Adds retry handling for transient payment failures.

Fixes AB#${WORK_ITEM_ID}" \
  --base main
```

### Verify bidirectional linking

```bash
# Check the work item now has a GitHub link
az boards work-item show --id $WORK_ITEM_ID --expand relations \
  --query "relations[?attributes.name=='GitHub Commit' || attributes.name=='GitHub Pull Request']"

# After PR merges, verify state transition
gh pr merge --squash --delete-branch
sleep 5
az boards work-item show --id $WORK_ITEM_ID --query "fields.\"System.State\""
```

---

## Task 2: Set up GitHub webhooks to a custom endpoint

### Create a webhook

```bash
# Create a webhook for push, PR, and issue events
gh api repos/{owner}/contoso-webapp/hooks \
  --method POST \
  --field name="web" \
  --field active=true \
  --field events='["push","pull_request","issues","deployment_status"]' \
  --field config='{"url":"https://contoso-webhook-receiver.azurewebsites.net/api/github","content_type":"json","secret":"your-webhook-secret-here","insecure_ssl":"0"}'

# List existing webhooks
gh api repos/{owner}/contoso-webapp/hooks \
  --jq '.[] | {id: .id, url: .config.url, events: .events, active: .active}'

# Test the webhook (ping)
HOOK_ID=$(gh api repos/{owner}/contoso-webapp/hooks --jq '.[0].id')
gh api repos/{owner}/contoso-webapp/hooks/$HOOK_ID/pings --method POST
```

### Update webhook configuration

```bash
# Add more events to an existing webhook
gh api repos/{owner}/contoso-webapp/hooks/$HOOK_ID \
  --method PATCH \
  --field add_events='["workflow_run","release"]'

# Remove events
gh api repos/{owner}/contoso-webapp/hooks/$HOOK_ID \
  --method PATCH \
  --field remove_events='["issues"]'
```

### Verify webhook deliveries

```bash
# Check recent deliveries
gh api repos/{owner}/contoso-webapp/hooks/$HOOK_ID/deliveries \
  --jq '.[] | {id: .id, event: .event, status_code: .status_code, delivered_at: .delivered_at}'

# Get details of a specific delivery (for debugging)
DELIVERY_ID=$(gh api repos/{owner}/contoso-webapp/hooks/$HOOK_ID/deliveries --jq '.[0].id')
gh api repos/{owner}/contoso-webapp/hooks/$HOOK_ID/deliveries/$DELIVERY_ID \
  --jq '{event: .event, status: .status_code, request_body: .request.body | fromjson | {action, sender: .sender.login}}'

# Redeliver a failed webhook
gh api repos/{owner}/contoso-webapp/hooks/$HOOK_ID/deliveries/$DELIVERY_ID/attempts \
  --method POST
```

---

## Task 3: Create a GitHub Actions workflow triggered by webhook

Use `repository_dispatch` to trigger workflows from external systems:

```bash
# Create a workflow that responds to repository dispatch events
cat > .github/workflows/webhook-triggered.yml << 'EOF'
name: Webhook-triggered deployment

on:
  repository_dispatch:
    types: [deploy-staging, deploy-production, run-tests]

jobs:
  deploy-staging:
    if: github.event.action == 'deploy-staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.client_payload.ref || 'main' }}

      - name: Deploy to staging
        run: |
          echo "Deploying ref: ${{ github.event.client_payload.ref }}"
          echo "Triggered by: ${{ github.event.client_payload.triggered_by }}"
          echo "Reason: ${{ github.event.client_payload.reason }}"
          # Add actual deployment commands here

  deploy-production:
    if: github.event.action == 'deploy-production'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.client_payload.ref || 'main' }}

      - name: Deploy to production
        run: |
          echo "Production deployment triggered"
          echo "Version: ${{ github.event.client_payload.version }}"

  run-tests:
    if: github.event.action == 'run-tests'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run test suite
        run: |
          echo "Running tests for: ${{ github.event.client_payload.test_suite }}"
          npm ci
          npm test
EOF

git add .github/workflows/webhook-triggered.yml
git commit -m "ci: add webhook-triggered deployment workflow"
git push origin main
```

### Trigger the workflow via API

```bash
# Trigger a staging deployment
gh api repos/{owner}/contoso-webapp/dispatches \
  --method POST \
  --field event_type="deploy-staging" \
  --field client_payload='{"ref":"feature/payment-retry","triggered_by":"platform-bot","reason":"QA requested staging deploy"}'

# Trigger a production deployment
gh api repos/{owner}/contoso-webapp/dispatches \
  --method POST \
  --field event_type="deploy-production" \
  --field client_payload='{"ref":"v2.4.0","version":"2.4.0"}'

# Trigger tests from an external system
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/{owner}/contoso-webapp/dispatches \
  -d '{"event_type":"run-tests","client_payload":{"test_suite":"integration"}}'
```

---

## Task 4: Configure Microsoft Teams notifications for pipeline events

### GitHub + Teams integration

```bash
# Create a workflow that posts to Teams via incoming webhook
cat > .github/workflows/teams-notifications.yml << 'EOF'
name: Teams notifications

on:
  pull_request:
    types: [opened, closed]
  deployment_status:
  workflow_run:
    workflows: ["CI Pipeline"]
    types: [completed]

jobs:
  notify-pr:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Notify Teams about PR
        run: |
          if [ "${{ github.event.action }}" == "opened" ]; then
            TITLE="New pull request opened"
            COLOR="0078D4"
          else
            TITLE="Pull request ${{ github.event.action }}"
            COLOR="28A745"
          fi

          curl -X POST "${{ secrets.TEAMS_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d @- << PAYLOAD
          {
            "type": "message",
            "attachments": [
              {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                  "\$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                  "type": "AdaptiveCard",
                  "version": "1.4",
                  "body": [
                    {
                      "type": "TextBlock",
                      "text": "${TITLE}",
                      "weight": "Bolder",
                      "size": "Medium"
                    },
                    {
                      "type": "FactSet",
                      "facts": [
                        {"title": "Repository", "value": "${{ github.repository }}"},
                        {"title": "Author", "value": "${{ github.event.pull_request.user.login }}"},
                        {"title": "Title", "value": "${{ github.event.pull_request.title }}"}
                      ]
                    }
                  ],
                  "actions": [
                    {
                      "type": "Action.OpenUrl",
                      "title": "View PR",
                      "url": "${{ github.event.pull_request.html_url }}"
                    }
                  ]
                }
              }
            ]
          }
          PAYLOAD

  notify-deployment-failure:
    if: github.event_name == 'deployment_status' && github.event.deployment_status.state == 'failure'
    runs-on: ubuntu-latest
    steps:
      - name: Alert Teams about failed deployment
        run: |
          curl -X POST "${{ secrets.TEAMS_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d @- << PAYLOAD
          {
            "type": "message",
            "attachments": [
              {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                  "\$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                  "type": "AdaptiveCard",
                  "version": "1.4",
                  "body": [
                    {
                      "type": "TextBlock",
                      "text": "DEPLOYMENT FAILED",
                      "weight": "Bolder",
                      "size": "Medium",
                      "color": "Attention"
                    },
                    {
                      "type": "FactSet",
                      "facts": [
                        {"title": "Environment", "value": "${{ github.event.deployment.environment }}"},
                        {"title": "SHA", "value": "${{ github.event.deployment.sha }}"},
                        {"title": "Description", "value": "${{ github.event.deployment_status.description }}"}
                      ]
                    }
                  ],
                  "actions": [
                    {
                      "type": "Action.OpenUrl",
                      "title": "View deployment",
                      "url": "${{ github.event.deployment_status.target_url }}"
                    }
                  ]
                }
              }
            ]
          }
          PAYLOAD

  notify-ci-failure:
    if: github.event_name == 'workflow_run' && github.event.workflow_run.conclusion == 'failure'
    runs-on: ubuntu-latest
    steps:
      - name: Alert Teams about CI failure
        run: |
          curl -X POST "${{ secrets.TEAMS_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d @- << PAYLOAD
          {
            "type": "message",
            "attachments": [
              {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                  "\$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                  "type": "AdaptiveCard",
                  "version": "1.4",
                  "body": [
                    {
                      "type": "TextBlock",
                      "text": "CI Pipeline Failed",
                      "weight": "Bolder",
                      "size": "Medium",
                      "color": "Attention"
                    },
                    {
                      "type": "FactSet",
                      "facts": [
                        {"title": "Branch", "value": "${{ github.event.workflow_run.head_branch }}"},
                        {"title": "Commit", "value": "${{ github.event.workflow_run.head_sha }}"},
                        {"title": "Actor", "value": "${{ github.event.workflow_run.actor.login }}"}
                      ]
                    }
                  ],
                  "actions": [
                    {
                      "type": "Action.OpenUrl",
                      "title": "View run",
                      "url": "${{ github.event.workflow_run.html_url }}"
                    }
                  ]
                }
              }
            ]
          }
          PAYLOAD
EOF

git add .github/workflows/teams-notifications.yml
git commit -m "ci: add Microsoft Teams notification workflow"
git push origin main
```

---

## Task 5: Azure DevOps service hooks

### Configure service hooks for Teams

```bash
# Create a service hook for build completion -> Teams
az devops invoke \
  --area hooks \
  --resource subscriptions \
  --http-method POST \
  --api-version 7.1 \
  --in-file - << 'EOF'
{
  "publisherId": "pipelines",
  "eventType": "ms.vss-pipelines.run-state-changed-event",
  "consumerId": "webHooks",
  "consumerActionId": "httpRequest",
  "publisherInputs": {
    "pipelineId": "",
    "runStateId": "4",
    "runResultId": "2"
  },
  "consumerInputs": {
    "url": "https://contoso-webhook-receiver.azurewebsites.net/api/azdo",
    "httpHeaders": "X-Custom-Auth: your-secret-token",
    "resourceDetailsToSend": "all",
    "messagesToSend": "all"
  }
}
EOF

# Create a service hook for work item updates -> Teams
az devops invoke \
  --area hooks \
  --resource subscriptions \
  --http-method POST \
  --api-version 7.1 \
  --in-file - << 'EOF'
{
  "publisherId": "tfs",
  "eventType": "workitem.updated",
  "consumerId": "webHooks",
  "consumerActionId": "httpRequest",
  "publisherInputs": {
    "areaPath": "Contoso Web Platform",
    "workItemType": "Bug"
  },
  "consumerInputs": {
    "url": "https://contoso-webhook-receiver.azurewebsites.net/api/azdo",
    "httpHeaders": "X-Custom-Auth: your-secret-token",
    "resourceDetailsToSend": "all"
  }
}
EOF

# List all service hook subscriptions
az devops invoke \
  --area hooks \
  --resource subscriptions \
  --http-method GET \
  --api-version 7.1 \
  --query "value[].{id:id, event:eventType, consumer:consumerId, status:status}"
```

### Configure the Teams incoming webhook connector

```bash
# Steps to create Teams incoming webhook:
# 1. In Teams, go to the target channel
# 2. Click "..." > Connectors (or Manage channel > Connectors)
# 3. Search for "Incoming Webhook"
# 4. Click Configure, give it a name, and copy the URL
# 5. Store the URL as a secret in your repository or pipeline

# Test the Teams webhook
TEAMS_WEBHOOK_URL="https://contoso.webhook.office.com/webhookb2/..."

curl -X POST "$TEAMS_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message",
    "attachments": [
      {
        "contentType": "application/vnd.microsoft.card.adaptive",
        "content": {
          "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
          "type": "AdaptiveCard",
          "version": "1.4",
          "body": [
            {
              "type": "TextBlock",
              "text": "Integration test successful",
              "weight": "Bolder"
            },
            {
              "type": "TextBlock",
              "text": "The webhook connection is working correctly."
            }
          ]
        }
      }
    ]
  }'
```

---

## Task 6: Build a webhook receiver (Azure Function)

### Create the Azure Function project

```bash
# Create a new Function App project
mkdir -p webhook-receiver
cd webhook-receiver

# Initialize the Function project (Node.js)
func init --worker-runtime node --language javascript

# Create the GitHub webhook function
func new --name github-webhook --template "HTTP trigger" --authlevel anonymous

# Create the Azure DevOps webhook function
func new --name azdo-webhook --template "HTTP trigger" --authlevel anonymous
```

### Implement the GitHub webhook handler

```bash
cat > src/functions/github-webhook.js << 'EOF'
const { app } = require('@azure/functions');
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

app.http('github-webhook', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const deliveryId = request.headers.get('x-github-delivery');

    // Verify webhook signature
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret && signature) {
      if (!verifySignature(body, signature, secret)) {
        context.log('Webhook signature verification failed');
        return { status: 401, body: 'Invalid signature' };
      }
    }

    const payload = JSON.parse(body);
    context.log(`Received ${event} event (delivery: ${deliveryId})`);

    // Route based on event type
    switch (event) {
      case 'push':
        await handlePush(payload, context);
        break;
      case 'pull_request':
        await handlePullRequest(payload, context);
        break;
      case 'deployment_status':
        await handleDeploymentStatus(payload, context);
        break;
      case 'issues':
        await handleIssue(payload, context);
        break;
      case 'ping':
        context.log('Ping received - webhook is configured correctly');
        break;
      default:
        context.log(`Unhandled event type: ${event}`);
    }

    return { status: 200, body: JSON.stringify({ received: true, event }) };
  }
});

async function handlePush(payload, context) {
  const branch = payload.ref.replace('refs/heads/', '');
  const commitCount = payload.commits.length;
  const pusher = payload.pusher.name;

  context.log(`Push to ${branch}: ${commitCount} commits by ${pusher}`);

  // Forward to Teams if it is a push to main
  if (branch === 'main') {
    await notifyTeams({
      title: `New commits on main`,
      facts: [
        { title: 'Pushed by', value: pusher },
        { title: 'Commits', value: String(commitCount) },
        { title: 'Latest', value: payload.head_commit?.message || 'N/A' }
      ],
      url: payload.compare
    });
  }
}

async function handlePullRequest(payload, context) {
  const action = payload.action;
  const pr = payload.pull_request;

  context.log(`PR #${pr.number} ${action}: ${pr.title}`);

  if (action === 'opened' || action === 'closed') {
    await notifyTeams({
      title: `PR ${action}: ${pr.title}`,
      facts: [
        { title: 'Author', value: pr.user.login },
        { title: 'Branch', value: `${pr.head.ref} -> ${pr.base.ref}` },
        { title: 'Status', value: pr.merged ? 'Merged' : action }
      ],
      url: pr.html_url
    });
  }
}

async function handleDeploymentStatus(payload, context) {
  const state = payload.deployment_status.state;
  const environment = payload.deployment.environment;

  context.log(`Deployment to ${environment}: ${state}`);

  if (state === 'failure' || state === 'error') {
    await notifyTeams({
      title: `DEPLOYMENT FAILED: ${environment}`,
      facts: [
        { title: 'Environment', value: environment },
        { title: 'State', value: state },
        { title: 'Description', value: payload.deployment_status.description || 'No details' }
      ],
      url: payload.deployment_status.target_url,
      urgent: true
    });
  }
}

async function handleIssue(payload, context) {
  const action = payload.action;
  const issue = payload.issue;
  context.log(`Issue #${issue.number} ${action}: ${issue.title}`);
}

async function notifyTeams({ title, facts, url, urgent }) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const card = {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            text: title,
            weight: 'Bolder',
            size: 'Medium',
            color: urgent ? 'Attention' : 'Default'
          },
          {
            type: 'FactSet',
            facts: facts
          }
        ],
        actions: url ? [{
          type: 'Action.OpenUrl',
          title: 'View details',
          url: url
        }] : []
      }
    }]
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card)
  });
}
EOF
```

### Deploy the Function to Azure

```bash
# Create the Azure resources
RESOURCE_GROUP="rg-contoso-webhooks"
FUNCTION_APP="contoso-webhook-receiver"
STORAGE_ACCOUNT="contosowebhookstor"
LOCATION="eastus2"

az group create --name $RESOURCE_GROUP --location $LOCATION

az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

az functionapp create \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --storage-account $STORAGE_ACCOUNT \
  --consumption-plan-location $LOCATION \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4

# Configure app settings
az functionapp config appsettings set \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --settings \
    GITHUB_WEBHOOK_SECRET="your-webhook-secret" \
    TEAMS_WEBHOOK_URL="https://contoso.webhook.office.com/webhookb2/..."

# Deploy the function
func azure functionapp publish $FUNCTION_APP
```

### Test the deployed webhook receiver

```bash
# Get the function URL
FUNCTION_URL=$(az functionapp function show \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --function-name github-webhook \
  --query "invokeUrlTemplate" -o tsv)

echo "Webhook URL: $FUNCTION_URL"

# Send a test payload
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: ping" \
  -H "X-GitHub-Delivery: test-123" \
  -d '{"zen": "Keep it logically awesome.", "hook_id": 12345}'

# Update the GitHub webhook to point to the Function
gh api repos/{owner}/contoso-webapp/hooks/$HOOK_ID \
  --method PATCH \
  --field config="{\"url\":\"$FUNCTION_URL\",\"content_type\":\"json\",\"secret\":\"your-webhook-secret\"}"
```

---

## Break and fix

### Scenario 1: GitHub webhook deliveries return 401

Webhook deliveries show a 401 response.

**Diagnosis:**

```bash
# Check recent deliveries
gh api repos/{owner}/contoso-webapp/hooks/$HOOK_ID/deliveries \
  --jq '.[:5] | .[] | {id: .id, status: .status_code, event: .event}'

# Get the response body of a failed delivery
gh api repos/{owner}/contoso-webapp/hooks/$HOOK_ID/deliveries/{delivery_id} \
  --jq '.response.body'
```


<details>
<summary>Show solution</summary>

**Fix:** The webhook secret configured in GitHub must match the `GITHUB_WEBHOOK_SECRET` environment variable in the Function App. Regenerate and sync:

```bash
# Generate a new secret
NEW_SECRET=$(openssl rand -hex 32)

# Update GitHub webhook
gh api repos/{owner}/contoso-webapp/hooks/$HOOK_ID \
  --method PATCH \
  --field config="{\"url\":\"$FUNCTION_URL\",\"content_type\":\"json\",\"secret\":\"$NEW_SECRET\"}"

# Update Function App
az functionapp config appsettings set \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --settings GITHUB_WEBHOOK_SECRET="$NEW_SECRET"
```

</details>

### Scenario 2: Teams notifications are not appearing

The webhook receiver logs show successful processing but Teams messages never arrive.

**Diagnosis:**

```bash
# Check Function App logs
az functionapp log stream \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP

# Verify the Teams webhook URL is still valid
curl -X POST "$TEAMS_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"message","attachments":[{"contentType":"application/vnd.microsoft.card.adaptive","content":{"type":"AdaptiveCard","version":"1.4","body":[{"type":"TextBlock","text":"Test"}]}}]}'
```


<details>
<summary>Show solution</summary>

**Fix:** Teams incoming webhook URLs expire when the connector is removed or the channel is deleted. Recreate the connector in Teams and update the `TEAMS_WEBHOOK_URL` app setting.

</details>

### Scenario 3: Azure Boards integration stops linking commits

The `AB#` syntax no longer creates links in Azure Boards.

**Diagnosis:**

```bash
# Verify the GitHub connection is still active in Azure DevOps
az devops invoke \
  --area build \
  --resource builds \
  --http-method GET \
  --api-version 7.1 \
  --query-parameters "repositoryType=GitHub"

# Check if the Azure Boards GitHub App is still installed
gh api repos/{owner}/contoso-webapp/installations \
  --jq '.[] | select(.app_slug == "azure-boards")'
```


<details>
<summary>Show solution</summary>

**Fix:** The Azure Boards GitHub App may have lost access due to organization permission changes. Re-authorize the app in GitHub organization settings, and verify the repository is still linked in Azure DevOps Project Settings > GitHub connections.


</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the purpose of the 'X-Hub-Signature-256' header in GitHub webhook deliveries?",
    options: [
      "It identifies which GitHub user triggered the event",
      "It contains a HMAC-SHA256 signature of the payload for the receiver to verify the request authenticity",
      "It encrypts the webhook payload",
      "It specifies the API version of the webhook"
    ],
    correctIndex: 1,
    explanation: "GitHub computes an HMAC-SHA256 hash of the payload body using the webhook secret as the key and sends it in the X-Hub-Signature-256 header. The receiver computes the same hash and compares them using a timing-safe comparison to verify the request came from GitHub."
  },
  {
    question: "What is the difference between a GitHub webhook and a 'repository_dispatch' event?",
    options: [
      "Webhooks send data to external systems; repository_dispatch triggers workflows from external systems",
      "They are the same mechanism with different names",
      "Webhooks are faster; repository_dispatch has a delay",
      "Webhooks support all events; repository_dispatch only supports push events"
    ],
    correctIndex: 0,
    explanation: "Webhooks are outbound: GitHub sends event data to a URL you specify. repository_dispatch is inbound: an external system sends a POST request to the GitHub API to trigger a workflow run, optionally including a custom payload."
  },
  {
    question: "When configuring Azure DevOps service hooks, what determines which events trigger the hook?",
    options: [
      "The repository branch configuration",
      "Publisher inputs that filter the event type, such as pipeline ID, area path, or work item type",
      "The consumer endpoint capabilities",
      "The Azure subscription tier"
    ],
    correctIndex: 1,
    explanation: "Service hooks use publisher inputs as filters. You specify the publisher (e.g., pipelines, tfs), the event type (e.g., run-state-changed, workitem.updated), and additional filters (specific pipeline, area path, work item type) to control which events fire the hook."
  },
  {
    question: "A Contoso developer commits with 'AB#5678' in the message but the Azure Boards work item shows no link. What is the most likely cause?",
    options: [
      "The commit message format is wrong",
      "The Azure Boards GitHub App is not installed on the repository, or the repository is not linked in the Azure DevOps project settings",
      "Azure Boards only supports linking from PR descriptions, not commits",
      "The work item must be in the Active state"
    ],
    correctIndex: 1,
    explanation: "The AB# syntax requires the Azure Boards GitHub App to be installed on the repository AND the repository must be linked in the Azure DevOps project settings under Boards > GitHub connections. Without both, the integration cannot detect the reference."
  }
]} />

## Cleanup

```bash
# Delete the webhook
gh api repos/{owner}/contoso-webapp/hooks/$HOOK_ID --method DELETE

# Delete the Azure Function resources
az group delete --name rg-contoso-webhooks --yes --no-wait

# Remove the webhook receiver code
cd ..
rm -rf webhook-receiver

# Delete Azure DevOps service hooks
SUBSCRIPTION_ID=$(az devops invoke \
  --area hooks \
  --resource subscriptions \
  --http-method GET \
  --api-version 7.1 \
  --query "value[0].id" -o tsv)

az devops invoke \
  --area hooks \
  --resource subscriptions \
  --http-method DELETE \
  --api-version 7.1 \
  --route-parameters subscriptionId=$SUBSCRIPTION_ID

# Remove workflow files
rm -f .github/workflows/webhook-triggered.yml
rm -f .github/workflows/teams-notifications.yml

# Commit cleanup
git add -A
git commit -m "chore: remove integrations lab artifacts"
git push origin main
```
