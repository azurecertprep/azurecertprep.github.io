---
sidebar_position: 7
title: "Challenge 45: Defender for Cloud DevOps Security"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 45: Defender for Cloud DevOps Security

## Exam skills covered

- Configure Microsoft Defender for Cloud DevOps Security
- Integrate GitHub Advanced Security with Microsoft Defender for Cloud

## Scenario

Contoso Ltd's CISO wants a single pane of glass for all security findings across their 30 GitHub repositories and 15 Azure DevOps repositories. Currently, each platform has its own security dashboard, making it impossible to get an aggregate risk view or enforce consistent security policies. You must implement Microsoft Defender for Cloud DevOps Security to unify security posture management across both platforms.

## Prerequisites

- Azure subscription with Contributor access
- Microsoft Defender for Cloud enabled (Defender CSPM plan or Defender for DevOps)
- GitHub organization with admin access
- Azure DevOps organization with Project Collection Administrator access
- Azure CLI installed

## Tasks

### Task 1: Connect GitHub organization to Microsoft Defender for Cloud

```bash
# Ensure Microsoft Defender for Cloud is registered
az provider register --namespace Microsoft.Security

# Create a resource group for the DevOps connector
az group create --name rg-contoso-defender-devops --location eastus

# Navigate to Azure Portal:
# 1. Microsoft Defender for Cloud > Environment settings
# 2. Add environment > GitHub
# 3. Connector name: contoso-github-connector
# 4. Subscription: Select your subscription
# 5. Resource group: rg-contoso-defender-devops
# 6. Region: East US

# Authorize the connection:
# - Click "Authorize" to install the Microsoft Defender for Cloud GitHub App
# - Select the contoso organization
# - Choose repositories: All repositories (or select specific ones)

# Verify the connector via CLI
az security security-connector list \
  --query "[?environmentName=='GitHub']" -o table

# Check connector health
az security security-connector show \
  --name contoso-github-connector \
  --resource-group rg-contoso-defender-devops \
  --query "{name:name, state:properties.hierarchyIdentifier, health:properties.environmentData}"
```

### Task 2: Connect Azure DevOps organization to Defender for Cloud

```bash
# Navigate to Azure Portal:
# 1. Microsoft Defender for Cloud > Environment settings
# 2. Add environment > Azure DevOps
# 3. Connector name: contoso-azdo-connector
# 4. Subscription: Select your subscription
# 5. Resource group: rg-contoso-defender-devops
# 6. Region: East US

# Authorize the connection:
# - Sign in with Azure DevOps admin account
# - Select the contoso Azure DevOps organization
# - Choose projects: All projects (or select specific ones)
# - Grant consent to the Microsoft Defender for DevOps app

# Verify the connector
az security security-connector list \
  --query "[?environmentName=='AzureDevOps']" -o table

# Alternative: Create connector via CLI (ARM template deployment)
az deployment group create \
  --resource-group rg-contoso-defender-devops \
  --template-file defender-devops-connector.json \
  --parameters organizationName=contoso
```

ARM template for the connector:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "resources": [
    {
      "type": "Microsoft.Security/securityConnectors",
      "apiVersion": "2023-09-01-preview",
      "name": "contoso-azdo-connector",
      "location": "eastus",
      "properties": {
        "environmentName": "AzureDevOps",
        "environmentData": {
          "environmentType": "AzureDevOpsScope"
        },
        "hierarchyIdentifier": "<azdo-org-id>",
        "offerings": [
          {
            "offeringType": "CspmMonitorAzureDevOps"
          }
        ]
      }
    }
  ]
}
```

### Task 3: Configure DevOps security posture management

After connectors are established, configure what gets scanned:

```bash
# View DevOps security posture recommendations
az security assessment list \
  --query "[?contains(resourceDetails.source, 'DevOps')]" -o table

# Configure auto-discovery of new repos (default is enabled)
# In Defender for Cloud > Environment settings > GitHub connector:
# - Auto-discovery: On (new repos automatically scanned)
# - Scanning frequency: Every 24 hours (default)
```

Security posture checks that Defender performs automatically:

| Check | Description | Platform |
|-------|-------------|----------|
| Code scanning not enabled | Repos without CodeQL or equivalent | GitHub, Azure DevOps |
| Secret scanning not enabled | Repos without secret scanning | GitHub |
| Dependabot not enabled | Repos without dependency alerts | GitHub |
| Branch protection missing | Default branch unprotected | GitHub, Azure DevOps |
| Excessive permissions | Over-permissive service connections | Azure DevOps |
| No required reviewers | PRs can merge without review | GitHub, Azure DevOps |
| Inactive repos with access | Stale repos still accessible | GitHub |

### Task 4: View and triage security findings in Defender dashboard

```bash
# Get all DevOps security recommendations
az security assessment list \
  --query "[?contains(resourceDetails.source, 'DevOps')].{name:displayName, status:status.code, resource:resourceDetails.id}" -o table

# Get specific recommendation details
az security assessment show \
  --name "<assessment-id>" \
  --resource-group rg-contoso-defender-devops

# List all security alerts from DevOps sources
az security alert list \
  --query "[?alertType=='DevOps']" -o table
```

In the Azure Portal:

1. Microsoft Defender for Cloud > DevOps Security
2. View the unified inventory of all connected repos
3. Filter by: Severity (Critical/High/Medium/Low), Finding type, Repository
4. For each finding:
   - View the affected code/configuration
   - See remediation guidance
   - Assign to a team member
   - Set severity override if needed

### Task 5: Configure pull request annotations from Defender

Enable PR annotations so developers see security findings directly in their pull requests:

For GitHub:

1. Defender for Cloud > Environment settings > GitHub connector
2. Configure > Pull request annotations: Enable
3. Severity threshold: High and Critical (ignore Medium/Low in PRs)
4. Annotation behavior: Comment only (do not block merge)

For Azure DevOps:

1. Defender for Cloud > Environment settings > Azure DevOps connector
2. Configure > Pull request annotations: Enable
3. Configure the Microsoft Security DevOps Azure DevOps extension

Install the extension in Azure Pipelines:

```yaml
# azure-pipelines.yml - Add security scanning with PR annotations
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: MicrosoftSecurityDevOps@1
    displayName: 'Run Microsoft Security DevOps'
    inputs:
      categories: 'code,artifacts,IaC,containers'
      # Tools included: Bandit, BinSkim, ESlint, Template Analyzer,
      # Terrascan, Trivy, AntiMalware
```

For GitHub Actions:

```yaml
# .github/workflows/defender-scan.yml
name: Microsoft Defender for DevOps
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  security-events: write
  id-token: write

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Microsoft Security DevOps
        uses: microsoft/security-devops-action@v1
        id: msdo
        with:
          categories: 'code,artifacts,IaC,containers'

      - name: Upload results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: ${{ steps.msdo.outputs.sarifFile }}
```

### Task 6: Set up security alerts and policies

Configure alert rules for critical security findings:

```bash
# Create an action group for security notifications
az monitor action-group create \
  --name ag-security-critical \
  --resource-group rg-contoso-defender-devops \
  --short-name SecCritical \
  --action email security-team security-team@contoso.com \
  --action webhook security-webhook "https://contoso.webhook.office.com/webhookb2/..."

# Configure Defender for Cloud alert notifications
# Azure Portal > Defender for Cloud > Environment settings > Email notifications:
# - Recipients: security-team@contoso.com
# - Notification types: High and Critical severity
# - Alert types: All alert types
# - Frequency: Real-time for Critical, Daily digest for High
```

Create Azure Policy for DevOps security governance:

```bash
# Assign built-in policy: "GitHub repositories should have code scanning enabled"
az policy assignment create \
  --name "require-code-scanning" \
  --display-name "Require code scanning on all GitHub repos" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/built-in-id" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-defender-devops"

# Assign built-in policy: "Azure DevOps repositories should have secret scanning enabled"
az policy assignment create \
  --name "require-secret-scanning" \
  --display-name "Require secret scanning on ADO repos" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/built-in-id" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-defender-devops"
```

### Task 7: Integrate with Azure Policy for governance

Create a governance rule to auto-assign findings:

1. Defender for Cloud > Environment settings > Governance rules
2. Create rule:
   - Name: "DevOps Critical Findings"
   - Scope: All DevOps connectors
   - Priority: 1
   - Conditions: Severity = Critical
   - Owner: security-team@contoso.com
   - Remediation timeframe: 7 days
   - Grace period: 3 days
   - Notifications: Weekly email

```bash
# View compliance status across all DevOps resources
az security regulatory-compliance-assessments list \
  --query "[?contains(id, 'DevOps')]" -o table

# Export security posture data for reporting
az security assessment list \
  --query "[?contains(resourceDetails.source, 'DevOps')]" \
  -o json > devops-security-posture.json
```

Build a security dashboard in Azure Workbooks:

```
// KQL query for DevOps security findings over time
SecurityRecommendation
| where RecommendationName contains "DevOps" or RecommendationName contains "GitHub" or RecommendationName contains "Azure DevOps"
| summarize count() by RecommendationName, RecommendationState, bin(TimeGenerated, 1d)
| render timechart
```

## Break and fix

### Break scenario 1: GitHub connector shows "Disconnected" status

The Defender for Cloud GitHub connector shows unhealthy status and no new findings are being collected.

**Cause:** The GitHub App authorization was revoked by an organization admin, or the app was uninstalled from the organization.

**Diagnosis:**

```bash
# Check connector status
az security security-connector show \
  --name contoso-github-connector \
  --resource-group rg-contoso-defender-devops \
  --query "properties.environmentData"
```


<details>
<summary>Solution</summary>

**Fix:**

1. Navigate to Defender for Cloud > Environment settings > GitHub connector
2. Click "Reauthorize"
3. Reinstall the Microsoft Defender for Cloud GitHub App if it was removed
4. Verify in GitHub: Organization Settings > Installed GitHub Apps > Microsoft Defender for Cloud

</details>

### Break scenario 2: PR annotations not appearing in Azure DevOps

The MicrosoftSecurityDevOps@1 task runs successfully but no annotations appear on pull requests.

**Cause:** The pipeline is running on push to main (not on PR trigger), or the SARIF results are not published correctly.


<details>
<summary>Solution</summary>

**Fix:** Ensure the pipeline triggers on pull requests and publishes results:

```yaml
trigger: none  # Do not run on push
pr:
  branches:
    include:
      - main

steps:
  - task: MicrosoftSecurityDevOps@1
    inputs:
      categories: 'code,IaC'

  # Results must be published for PR annotations to appear
  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: '$(System.DefaultWorkingDirectory)/.gdn'
      artifactName: 'SecurityResults'
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "Contoso wants to view security findings from both GitHub and Azure DevOps repositories in a single dashboard. What should they configure?",
    options: [
      "Export alerts from each platform to a shared email inbox",
      "Connect both platforms to Microsoft Defender for Cloud using DevOps security connectors",
      "Mirror all code to a single platform and scan there",
      "Use a third-party SIEM to aggregate alerts"
    ],
    correctIndex: 1,
    explanation: "Microsoft Defender for Cloud DevOps Security provides native connectors for both GitHub and Azure DevOps. Once connected, all security findings (code scanning, dependency vulnerabilities, secret scanning, IaC misconfigurations) appear in the unified Defender for Cloud dashboard with consistent severity ratings and remediation guidance."
  },
  {
    question: "After connecting GitHub to Defender for Cloud, which security posture finding would Defender automatically detect?",
    options: [
      "A SQL injection vulnerability in application code",
      "A repository without branch protection on the default branch",
      "An expired SSL certificate on a web server",
      "A misconfigured Azure VM network security group"
    ],
    correctIndex: 1,
    explanation: "DevOps security posture management checks configuration-level issues such as missing branch protection, disabled code scanning, lack of required reviewers, and disabled secret scanning. It does not scan code for vulnerabilities directly (that is CodeQL's job) or inspect Azure infrastructure (that is Defender for Cloud's cloud security posture management)."
  },
  {
    question: "Contoso wants critical security findings in pull requests to block the merge. Which configuration achieves this for GitHub repositories?",
    options: [
      "Configure Defender PR annotations with \"Block\" behavior",
      "Create a required status check that uses the Microsoft Security DevOps action with a non-zero exit code on critical findings",
      "Set branch protection to require Defender approval",
      "Configure Dependabot to block merges"
    ],
    correctIndex: 1,
    explanation: "The microsoft/security-devops-action can be configured to fail (non-zero exit code) when critical findings are detected. When this job is set as a required status check in branch protection, the PR cannot merge until the critical findings are resolved. Defender PR annotations alone only add comments but do not block merges."
  },
  {
    question: "What is the primary benefit of connecting Azure DevOps to Microsoft Defender for Cloud compared to using GHAzDO (GitHub Advanced Security for Azure DevOps) alone?",
    options: [
      "Defender provides CodeQL scanning that GHAzDO does not",
      "Defender provides a unified view across multiple platforms and integrates findings with cloud security posture",
      "Defender is free while GHAzDO requires a license",
      "Defender scans code faster than GHAzDO"
    ],
    correctIndex: 1,
    explanation: "While GHAzDO provides excellent scanning within Azure DevOps, Defender for Cloud adds cross-platform visibility (GitHub + Azure DevOps + cloud resources in one dashboard), governance rules for auto-assignment and SLA tracking, integration with Azure Policy, and correlation between DevOps security findings and cloud infrastructure security posture."
  }
]} />

## Cleanup

```bash
# Remove the security connectors
az security security-connector delete \
  --name contoso-github-connector \
  --resource-group rg-contoso-defender-devops

az security security-connector delete \
  --name contoso-azdo-connector \
  --resource-group rg-contoso-defender-devops

# Delete resource group
az group delete --name rg-contoso-defender-devops --yes --no-wait

# Remove the GitHub App (Organization Settings > Installed GitHub Apps)
# Uninstall "Microsoft Defender for Cloud" app

# Remove the Azure DevOps extension
# Organization Settings > Extensions > Microsoft Security DevOps > Uninstall

# Clean up workflow files
rm -f .github/workflows/defender-scan.yml
git add -A && git commit -m "cleanup: remove challenge 45 Defender config" && git push
```
