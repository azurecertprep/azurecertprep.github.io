---
sidebar_position: 27
title: "Challenge 27: AI Security – Copilot Studio Real-Time Protection & M365 Agent Management"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 27: AI Security – Copilot Studio Real-Time Protection & M365 Agent Management

## Exam skills covered

- Configure real-time protection policies for Copilot Studio agents
- Manage Microsoft 365 Copilot agent deployment and governance
- Implement DLP policies for AI-generated content
- Monitor agent interactions and detect policy violations
- Configure Purview compliance controls for custom Copilot agents

## Scenario

Contoso Ltd has multiple business units building custom agents in Copilot Studio that connect to internal data sources including HR systems, financial databases, and customer CRM. The security team must implement real-time protection to prevent agents from leaking sensitive data, enforce governance policies on which agents can be deployed, and monitor agent interactions for compliance violations.

---

## Prerequisites

- 🔒 **License required**: Microsoft 365 E5 + Copilot Studio license + Microsoft Purview compliance portal access
- Power Platform Administrator role
- Compliance Administrator role
- Microsoft Purview portal access
- Access to Power Platform Admin Center

---

## Task 1: Configure DLP policies for Copilot Studio agents

Create Data Loss Prevention policies that apply to Copilot Studio agent interactions to prevent sensitive data leakage.

1. Navigate to **Power Platform Admin Center** → **Policies** → **Data policies**
2. Click **+ New Policy**
3. Configure the policy:
   - **Name**: "Copilot Studio - Sensitive Data Protection"
   - **Scope**: All environments (or specific environments)
4. Classify connectors:
   - **Business** group: SharePoint, Dataverse, Office 365, Outlook
   - **Non-Business** group: External HTTP connectors, custom connectors
   - **Blocked** group: Anonymous/unapproved external APIs

```powershell
# Install Power Platform admin module
Install-Module -Name Microsoft.PowerApps.Administration.PowerShell -Force

# Connect to Power Platform
Add-PowerAppsAccount

# Create a DLP policy for Copilot Studio
$policyConfig = @{
    DisplayName = "Copilot Studio - Sensitive Data Protection"
    EnvironmentType = "AllEnvironments"
    DefaultConnectorsClassification = "Blocked"
}

# Get existing policies to verify
Get-DlpPolicy | Select-Object DisplayName, CreatedTime, EnvironmentType
```

---

## Task 2: Enable real-time protection for Copilot Studio

Configure Purview to monitor and protect Copilot Studio agent interactions in real-time.

1. Navigate to **Microsoft Purview portal** → **Solutions** → **DSPM for AI**
2. Select **Microsoft Copilot experiences** → **Copilot Studio**
3. Enable **Real-time data protection**:
   - Toggle ON "Monitor agent conversations for sensitive information"
   - Toggle ON "Block responses containing sensitive data patterns"
4. Configure sensitive information detection:
   - Click **+ Add sensitive info types**
   - Select: Credit Card Numbers, SSN, Bank Account Numbers, Health records (HIPAA)
   - Set action: **Block and notify** for High confidence matches
   - Set action: **Warn** for Medium confidence matches
5. Configure **Prompt injection protection**:
   - Enable "Detect and block prompt injection attempts"
   - Set sensitivity: **High**
   - Enable logging for all blocked attempts

```powershell
# Use Graph API to configure Purview AI protection policies
Connect-MgGraph -Scopes "InformationProtection.ReadWrite.All"

# Create a communication compliance policy for AI interactions
$policyBody = @{
    displayName = "Copilot Studio Real-Time Protection"
    description = "Monitors Copilot Studio agent interactions for sensitive data"
    isActive = $true
    policyType = "dataLossPrevention"
    conditions = @(
        @{
            conditionType = "sensitiveInformationType"
            sensitiveTypes = @(
                @{ name = "Credit Card Number"; minCount = 1; confidenceLevel = "high" }
                @{ name = "U.S. Social Security Number"; minCount = 1; confidenceLevel = "high" }
            )
        }
    )
    actions = @(
        @{ actionType = "blockContent"; notifyUser = $true }
    )
} | ConvertTo-Json -Depth 5

$uri = "https://graph.microsoft.com/beta/security/informationProtection/policies"
Invoke-MgGraphRequest -Method POST -Uri $uri -Body $policyBody
```

---

## Task 3: Configure agent governance in Microsoft 365 Admin Center

Set up governance controls for which Copilot agents can be deployed and who can create them.

1. Navigate to **Microsoft 365 Admin Center** → **Settings** → **Copilot**
2. Under **Agents**, configure:
   - **Who can deploy agents**: Specific security groups only
   - **Agent approval workflow**: Require admin approval before deployment
   - **Allowed data sources**: Restrict to approved internal connectors only

3. Navigate to **Power Platform Admin Center** → **Environments**
4. For the production environment:
   - Click **Settings** → **Product** → **Features**
   - Set "Copilot Studio agent publishing" to **Require approval**
   - Set "External data connections" to **Admin-approved only**

```powershell
# Configure environment-level settings for Copilot Studio
# Set maker permissions - only approved users can create agents
$envId = "Default-contoso-environment-id"

# Restrict who can create Copilot Studio agents
Set-AdminPowerAppEnvironmentRoleAssignment `
    -EnvironmentName $envId `
    -RoleName "Environment Maker" `
    -PrincipalType "Group" `
    -PrincipalObjectId "approved-makers-group-id"
```

5. Configure the **Integrated apps** settings:
   - Navigate to **Microsoft 365 Admin Center** → **Settings** → **Integrated apps**
   - Under "User consent to apps": Set to **Do not allow user consent**
   - Under "Admin managed apps": Enable approval workflow for Copilot agents

---

## Task 4: Set up monitoring and alerting for agent interactions

Configure alerts for suspicious or non-compliant agent activity.

1. Navigate to **Microsoft Purview portal** → **Audit** → **Audit policies**
2. Create a new audit policy:
   - **Name**: "Copilot Studio Agent Activity Monitoring"
   - **Activities to audit**:
     - CopilotStudioAgentInvoked
     - CopilotStudioAgentCreated
     - CopilotStudioAgentPublished
     - CopilotStudioDataSourceConnected
   - **Alert threshold**: Any high-sensitivity data access
   - **Notification**: Security team DL

```powershell
# Connect to Security & Compliance
Connect-IPPSSession

# Search unified audit log for Copilot Studio activities
$startDate = (Get-Date).AddDays(-7)
$endDate = Get-Date

Search-UnifiedAuditLog -StartDate $startDate -EndDate $endDate `
    -Operations "CopilotInteraction","MicrosoftCopilotForMicrosoft365Interaction" `
    -ResultSize 100 | ForEach-Object {
    $auditData = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
        Timestamp = $_.CreationDate
        User = $_.UserIds
        Operation = $_.Operations
        AgentName = $auditData.CopilotEventData.AgentName
        DataSourceAccessed = $auditData.CopilotEventData.DataSource
        SensitiveDataDetected = $auditData.CopilotEventData.SensitiveInfoDetected
    }
}
```

---

## Task 5: Implement topic-level restrictions in Copilot Studio

Configure topic restrictions to prevent agents from discussing specific sensitive subjects.

1. Open **Copilot Studio** → Select the target agent
2. Navigate to **Settings** → **Generative AI** → **Content moderation**
3. Configure blocked topics:
   - Add "Employee salary information" to blocked topics
   - Add "Merger and acquisition details" to blocked topics
   - Add "Executive personal information" to blocked topics
4. Under **Knowledge sources**:
   - Remove any broadly-scoped SharePoint site connections
   - Add only approved, scoped data sources
   - Enable "Restrict to selected sources only"
5. Under **Authentication**:
   - Set to "Require user authentication"
   - Enable "On behalf of user" to ensure permissions are respected
   - Disable "No authentication" option

```powershell
# Use Power Platform admin to audit agent configurations
Get-AdminPowerAppConnection -EnvironmentName $envId | Where-Object {
    $_.ConnectorName -like "*SharePoint*" -or
    $_.ConnectorName -like "*SQL*" -or
    $_.ConnectorName -like "*Dataverse*"
} | Select-Object DisplayName, ConnectorName, CreatedBy, CreatedTime

# Check for agents using unapproved connectors
Get-AdminPowerApp -EnvironmentName $envId | ForEach-Object {
    $app = $_
    $connections = Get-AdminPowerAppConnectionReferences -EnvironmentName $envId -AppName $app.AppName
    $blockedConnections = $connections | Where-Object {
        $_.ConnectorName -in @("HTTP", "SMTP", "FTP")
    }
    if ($blockedConnections) {
        [PSCustomObject]@{
            AppName = $app.DisplayName
            BlockedConnectors = ($blockedConnections.ConnectorName -join ", ")
            Owner = $app.Owner.displayName
        }
    }
}
```

---

## Task 6: Configure data residency and retention for agent interactions

Ensure Copilot Studio agent conversations comply with data residency and retention requirements.

1. Navigate to **Power Platform Admin Center** → **Environments** → Select production
2. Under **Settings** → **Privacy + Security**:
   - Verify data location matches compliance requirements (e.g., "United States")
   - Enable "Customer Lockbox" for agent data
3. Navigate to **Microsoft Purview portal** → **Data lifecycle management**
4. Create a retention policy for Copilot Studio data:

```powershell
# Create retention policy for Copilot interactions
Connect-IPPSSession

New-RetentionCompliancePolicy -Name "Copilot Studio Retention - 7 Years" `
    -CopilotLocation "All" `
    -Enabled $true

New-RetentionComplianceRule -Policy "Copilot Studio Retention - 7 Years" `
    -Name "Retain-7-Years" `
    -RetentionDuration 2555 `
    -RetentionComplianceAction "KeepAndDelete" `
    -ExpirationDateOption "ModificationAgeInDays"
```

---

## Break & Fix

### Scenario 1: Copilot Studio agent leaking customer PII in responses

A customer service agent built in Copilot Studio is returning full customer Social Security Numbers and credit card numbers when asked about customer accounts. The DLP policy exists but isn't blocking the responses.

<details>
<summary>Show solution</summary>

```powershell
# 1. Verify DLP policy is correctly scoped to the environment
Get-DlpPolicy | Where-Object { $_.DisplayName -like "*Sensitive*" } |
    Select-Object DisplayName, EnvironmentType, Environments

# 2. Check if the policy includes the correct connectors
# The issue is often that the Dataverse connector (which Copilot Studio uses)
# is in the wrong connector group

# 3. Verify real-time protection is enabled in Purview
# Navigate to Purview > DSPM for AI > Copilot Studio > Real-time protection
# Ensure "Block responses containing sensitive data" is ON

# 4. Check sensitive info type detection is configured for the correct types
# Navigate to Purview > DSPM for AI > Detection rules
# Verify SSN and Credit Card patterns are in "Block" action tier

# 5. As immediate mitigation, restrict the agent's knowledge source
# In Copilot Studio > Agent > Knowledge > Edit source
# Add a system prompt: "Never include full SSN or credit card numbers in responses.
# Always mask sensitive data as XXX-XX-1234 or ****-****-****-1234"

# 6. Enable content filtering at the Copilot Studio level
# Agent Settings > Generative AI > Content moderation > Enable strict mode
```

</details>

### Scenario 2: Unauthorized agent deployed to production without approval

A marketing team member published a Copilot Studio agent that connects to the company's customer database without going through the required approval workflow. The agent is already being used by 50+ employees.

<details>
<summary>Show solution</summary>

```powershell
# 1. Immediately disable the unauthorized agent
# Navigate to Power Platform Admin Center > Environments > Apps
# Find the agent and toggle to "Quarantine"

# 2. Identify and disable the agent using admin PowerShell
Get-AdminPowerApp -EnvironmentName $envId | Where-Object {
    $_.DisplayName -like "*Marketing*" -and
    $_.Owner.displayName -eq "Marketing User"
} | Set-AdminPowerAppAsStopped -EnvironmentName $envId

# 3. Verify governance controls
# Check that environment maker role is restricted
Get-AdminPowerAppEnvironmentRoleAssignment -EnvironmentName $envId |
    Where-Object { $_.RoleName -eq "Environment Maker" }

# 4. Enable the approval workflow
# Power Platform Admin Center > Environments > Settings > Governance
# Set "Require admin approval for agent publishing" = ON

# 5. Review audit logs for what data was accessed
Search-UnifiedAuditLog -StartDate (Get-Date).AddDays(-30) -EndDate (Get-Date) `
    -FreeText "Marketing Agent" -RecordType "PowerPlatformAdministratorActivity" `
    -ResultSize 200

# 6. Notify affected users and trigger a data exposure review
# Use DSPM for AI to assess what sensitive data the agent may have exposed
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the primary purpose of real-time protection in Purview DSPM for AI when applied to Copilot Studio?",
    options: [
      "To speed up agent response times by caching results",
      "To monitor and block sensitive data from appearing in agent responses as they are generated",
      "To encrypt all agent conversations at rest",
      "To prevent users from accessing Copilot Studio entirely"
    ],
    correctIndex: 1,
    explanation: "Real-time protection in DSPM for AI monitors agent interactions as they happen and can block responses that contain sensitive information (like PII, financial data, or health records) before they reach the user."
  },
  {
    question: "Which governance control prevents unauthorized Copilot Studio agents from being deployed to production?",
    options: [
      "Sensitivity labels on all SharePoint sites",
      "Environment-level DLP policies with connector classification plus admin approval workflow",
      "Disabling Microsoft 365 Copilot for all users",
      "Configuring Azure AD Conditional Access for Power Platform"
    ],
    correctIndex: 1,
    explanation: "The combination of DLP policies (controlling which connectors agents can use) and admin approval workflows (requiring sign-off before publishing) provides governance over agent deployment in Copilot Studio."
  },
  {
    question: "A Copilot Studio agent is configured with 'No authentication'. What is the security risk?",
    options: [
      "The agent cannot access any data sources",
      "The agent runs with elevated service account permissions, ignoring individual user access controls",
      "The agent is visible only to the creator",
      "The agent automatically encrypts all responses"
    ],
    correctIndex: 1,
    explanation: "When an agent uses 'No authentication' or service-level authentication, it accesses data sources with its own identity rather than on behalf of the user. This means it can return data to users that they wouldn't normally have permission to access."
  },
  {
    question: "How should retention policies be configured for Copilot Studio agent conversations in a regulated industry?",
    options: [
      "Retention policies cannot be applied to Copilot Studio data",
      "Use Microsoft Purview retention policies targeting CopilotLocation to retain interactions for the required period",
      "Export all conversations to Azure Blob Storage manually",
      "Configure Power Platform Dataverse to auto-delete conversations after 30 days"
    ],
    correctIndex: 1,
    explanation: "Microsoft Purview retention policies support CopilotLocation as a workload, allowing organizations to set retention and deletion periods for Copilot Studio agent interactions to meet regulatory requirements."
  }
]} />

## Cleanup

```powershell
# Remove test DLP policies
Get-DlpPolicy | Where-Object { $_.DisplayName -like "*Copilot Studio*" } |
    Remove-DlpPolicy -Confirm:$false

# Remove test retention policies
Remove-RetentionCompliancePolicy -Identity "Copilot Studio Retention - 7 Years" -Confirm:$false

# Disconnect sessions
Disconnect-SPOService
Disconnect-MgGraph
Disconnect-ExchangeOnline
Remove-PowerAppsAccount
```
