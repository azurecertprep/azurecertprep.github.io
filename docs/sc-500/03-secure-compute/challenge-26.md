---
sidebar_position: 26
title: "Challenge 26: AI Security – Data Overexposure in SharePoint & Purview DSPM"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 26: AI Security – Data Overexposure in SharePoint & Purview DSPM

## Exam skills covered

- Identify and mitigate data overexposure risks before deploying AI workloads
- Configure Microsoft Purview Data Security Posture Management (DSPM) for AI
- Assess SharePoint site permissions for oversharing
- Implement sensitivity labels to protect data surfaced by Copilot
- Monitor data exposure risks through Purview compliance portal

## Scenario

Contoso Ltd is preparing to deploy Microsoft 365 Copilot to 5,000 users. The CISO is concerned that Copilot will surface sensitive documents that are currently overshared via SharePoint Online — including HR records, financial forecasts, and M&A documents stored in broadly permissioned sites. You must assess and remediate data overexposure risks using Purview DSPM for AI before enabling Copilot.

---

## Prerequisites

- 🔒 **License required**: Microsoft 365 E5 + Microsoft Purview DSPM for AI add-on
- Global Administrator or Compliance Administrator role in Microsoft 365
- SharePoint Administrator role
- Microsoft Purview portal access
- Azure AD PowerShell module or Microsoft Graph PowerShell SDK installed

---

## Task 1: Assess current SharePoint oversharing risks

Run the SharePoint Advanced Management (SAM) oversharing report to identify sites with broad access.

```powershell
# Connect to SharePoint Online
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"

# Get sites with "Everyone except external users" permissions
Get-SPOSite -Limit All | ForEach-Object {
    $site = $_
    $groups = Get-SPOSiteGroup -Site $site.Url
    $overshared = $groups | Where-Object {
        $_.Users -contains "c:0-.f|rolemanager|spo-grid-all-users/$($site.Url)"
    }
    if ($overshared) {
        [PSCustomObject]@{
            SiteUrl = $site.Url
            Title = $site.Title
            OversharedGroups = ($overshared.Title -join ", ")
            StorageUsageMB = $site.StorageUsageCurrent
        }
    }
} | Export-Csv -Path "oversharing-report.csv" -NoTypeInformation
```

```powershell
# Identify sites with anonymous sharing links
Get-SPOSite -Limit All -IncludePersonalSite $false | Where-Object {
    $_.SharingCapability -eq "ExternalUserAndGuestSharing" -or
    $_.SharingCapability -eq "Anyone"
} | Select-Object Url, Title, SharingCapability
```

---

## Task 2: Enable Purview DSPM for AI

Configure the Data Security Posture Management dashboard for AI workloads.

1. Navigate to **Microsoft Purview portal** → **Solutions** → **DSPM for AI**
2. Click **Get started** to activate the DSPM for AI solution
3. Under **Data assessments**, click **New assessment**
4. Configure the assessment:
   - **Name**: "Pre-Copilot Data Exposure Assessment"
   - **Scope**: All SharePoint Online sites
   - **Assessment type**: Oversharing detection
5. Click **Start assessment** and wait for completion (may take 24-48 hours)

```powershell
# Use Microsoft Graph API to check DSPM assessment status
Connect-MgGraph -Scopes "InformationProtection.Read.All"

# Query Purview DSPM assessments via Graph
$uri = "https://graph.microsoft.com/beta/security/informationProtection/datasecurityposture/assessments"
Invoke-MgGraphRequest -Method GET -Uri $uri
```

---

## Task 3: Configure sensitivity labels for AI-critical content

Create and apply sensitivity labels to protect high-value content from being surfaced by Copilot.

```powershell
# Connect to Security & Compliance PowerShell
Connect-IPPSSession

# Create sensitivity label for highly confidential data
New-Label -DisplayName "Highly Confidential - No AI" `
    -Name "HC-NoAI" `
    -Tooltip "Content excluded from AI processing" `
    -Comment "Applied to content that should not be surfaced by Microsoft 365 Copilot" `
    -ContentType "File, Email, Site"

# Configure label encryption settings
Set-Label -Identity "HC-NoAI" `
    -EncryptionEnabled $true `
    -EncryptionProtectionType "Template" `
    -EncryptionDoNotForward $false `
    -EncryptionOfflineAccessDays 30

# Create auto-labeling policy for financial documents
New-AutoSensitivityLabelPolicy -Name "Auto-Label-Financial-NoAI" `
    -SharePointLocation "All" `
    -ExchangeLocation "All" `
    -Mode "Simulate"

New-AutoSensitivityLabelRule -Policy "Auto-Label-Financial-NoAI" `
    -Name "Financial-Pattern-Match" `
    -SensitiveInformationType @{
        Name = "Credit Card Number"; minCount = 1
    }, @{
        Name = "U.S. Bank Account Number"; minCount = 1
    } `
    -ApplySensitivityLabel "HC-NoAI"
```

---

## Task 4: Restrict SharePoint site access to reduce oversharing

Remediate the top overshared sites identified in Task 1.

```powershell
# Remove "Everyone except external users" from specific sites
$sitesToRemediate = @(
    "https://contoso.sharepoint.com/sites/HRConfidential",
    "https://contoso.sharepoint.com/sites/Finance-MA",
    "https://contoso.sharepoint.com/sites/ExecutiveComp"
)

foreach ($siteUrl in $sitesToRemediate) {
    # Restrict site sharing capability
    Set-SPOSite -Identity $siteUrl -SharingCapability "Disabled"

    # Remove broad access groups
    $groups = Get-SPOSiteGroup -Site $siteUrl
    foreach ($group in $groups) {
        $broadUsers = $group.Users | Where-Object {
            $_ -like "*spo-grid-all-users*" -or
            $_ -like "*nt:s-1-1-0*"
        }
        if ($broadUsers) {
            foreach ($user in $broadUsers) {
                Remove-SPOUser -Site $siteUrl -Group $group.Title -LoginName $user
                Write-Host "Removed $user from $($group.Title) on $siteUrl"
            }
        }
    }
}
```

```powershell
# Enable Restricted Access Control for sensitive sites
Set-SPOSite -Identity "https://contoso.sharepoint.com/sites/HRConfidential" `
    -RestrictedAccessControl $true

# Configure site-level Conditional Access policy
Set-SPOSite -Identity "https://contoso.sharepoint.com/sites/Finance-MA" `
    -ConditionalAccessPolicy "AllowLimitedAccess" `
    -LimitedAccessFileType "WebPreviewableFiles"
```

---

## Task 5: Monitor DSPM for AI recommendations

Review and act on DSPM recommendations to improve data security posture before Copilot deployment.

1. Navigate to **Microsoft Purview portal** → **DSPM for AI** → **Recommendations**
2. Review the following recommendation categories:
   - **Overshared content**: Sites with broad permissions containing sensitive data
   - **Unlabeled sensitive content**: Files matching sensitive info types without labels
   - **External sharing risks**: Content shared externally that AI could reference
3. For each high-priority recommendation:
   - Click **View details** to see affected sites/files
   - Click **Take action** to apply suggested remediation
   - Set **Priority** to track remediation progress

```powershell
# Use Graph API to retrieve DSPM recommendations
$uri = "https://graph.microsoft.com/beta/security/informationProtection/datasecurityposture/recommendations"
$recommendations = Invoke-MgGraphRequest -Method GET -Uri $uri

# Filter high-severity recommendations
$recommendations.value | Where-Object { $_.severity -eq "high" } | ForEach-Object {
    [PSCustomObject]@{
        Title = $_.title
        Category = $_.category
        AffectedAssets = $_.affectedAssetsCount
        RecommendedAction = $_.recommendedAction
    }
}
```

---

## Task 6: Create a Copilot readiness report

Generate a summary report combining oversharing findings with DSPM insights.

```powershell
# Generate readiness summary
$report = @{
    AssessmentDate = Get-Date -Format "yyyy-MM-dd"
    TotalSitesScanned = (Get-SPOSite -Limit All).Count
    OversharedSites = (Import-Csv "oversharing-report.csv").Count
    SitesWithAnonymousLinks = (Get-SPOSite -Limit All | Where-Object {
        $_.SharingCapability -eq "Anyone"
    }).Count
    SensitivityLabelsApplied = $true
    DSPMAssessmentComplete = $true
}

$report | ConvertTo-Json | Out-File "copilot-readiness-report.json"

# Verify no remaining high-risk sites
Get-SPOSite -Limit All | Where-Object {
    $_.SharingCapability -eq "Anyone" -and
    $_.StorageUsageCurrent -gt 100
} | Select-Object Url, Title, SharingCapability | Format-Table
```

---

## Break & Fix

### Scenario 1: Copilot surfaces confidential M&A documents to all employees

Users report that Microsoft 365 Copilot is returning content from the "Project Titan" M&A site when they ask about company acquisitions. The site was created 6 months ago with "Everyone except external users" as members.

<details>
<summary>Show solution</summary>

```powershell
# Immediately restrict the site
Set-SPOSite -Identity "https://contoso.sharepoint.com/sites/ProjectTitan" `
    -SharingCapability "Disabled" `
    -RestrictedAccessControl $true

# Remove broad access
Get-SPOSiteGroup -Site "https://contoso.sharepoint.com/sites/ProjectTitan" | ForEach-Object {
    $broadUsers = $_.Users | Where-Object { $_ -like "*spo-grid-all-users*" }
    foreach ($user in $broadUsers) {
        Remove-SPOUser -Site "https://contoso.sharepoint.com/sites/ProjectTitan" `
            -Group $_.Title -LoginName $user
    }
}

# Apply sensitivity label to all content in the site
# This requires SharePoint PnP module
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/ProjectTitan" -Interactive
$items = Get-PnPListItem -List "Documents" -PageSize 500
foreach ($item in $items) {
    Set-PnPListItem -List "Documents" -Identity $item.Id `
        -Label "Highly Confidential - No AI"
}
```

</details>

### Scenario 2: DSPM assessment shows 0 overshared sites despite known issues

The DSPM for AI assessment completed but reports no oversharing risks, even though manual review found multiple broadly shared sites with sensitive content.

<details>
<summary>Show solution</summary>

```powershell
# Verify DSPM has proper permissions
# 1. Check that the Purview service principal has SharePoint read access
Connect-MgGraph -Scopes "Application.Read.All"
$purviewApp = Get-MgServicePrincipal -Filter "displayName eq 'Microsoft Purview'"

# 2. Ensure SharePoint sites are included in assessment scope
# Navigate to Purview portal > DSPM for AI > Settings > Data sources
# Verify "SharePoint Online" is toggled ON and scope is "All sites"

# 3. Check assessment configuration
# Navigate to DSPM for AI > Assessments > Click on the assessment
# Verify:
#   - Status is "Completed" (not "In progress" or "Failed")
#   - Scope includes all SharePoint sites (not filtered to specific sites)
#   - Sensitive info types are properly configured

# 4. Re-run assessment with corrected scope
# Click "Edit assessment" > Ensure scope is "All SharePoint Online sites"
# Enable "Include sites with fewer than 10 files" if needed
# Click "Re-run assessment"

# 5. Verify sensitive info type classifiers are active
Get-DlpSensitiveInformationType | Where-Object { $_.Publisher -eq "Microsoft" } |
    Select-Object Name, State | Where-Object { $_.State -ne "Active" }
```

</details>

### Scenario 3: Auto-labeling policy not applying labels to detected sensitive files

The auto-labeling policy was created in simulation mode and shows matches, but after enabling enforcement, labels are not being applied.

<details>
<summary>Show solution</summary>

```powershell
# Check policy status
Get-AutoSensitivityLabelPolicy -Identity "Auto-Label-Financial-NoAI" |
    Select-Object Name, Mode, Enabled, WhenChanged

# Switch from simulation to enforcement mode
Set-AutoSensitivityLabelPolicy -Identity "Auto-Label-Financial-NoAI" `
    -Mode "Enable"

# Verify the label exists and is published
Get-Label -Identity "HC-NoAI" | Select-Object Name, Enabled, ContentType

# Ensure label is published to users via a label policy
Get-LabelPolicy | Where-Object {
    $_.Labels -contains "HC-NoAI"
} | Select-Object Name, Enabled

# If no policy publishes the label, create one
New-LabelPolicy -Name "Publish-HC-NoAI-Label" `
    -Labels "HC-NoAI" `
    -ExchangeLocation "All" `
    -SharePointLocation "All"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the primary risk that Purview DSPM for AI helps address before deploying Microsoft 365 Copilot?",
    options: [
      "Copilot generating incorrect code suggestions",
      "Data overexposure through overshared content being surfaced by AI",
      "Users bypassing multi-factor authentication via Copilot",
      "External attackers exploiting Copilot API endpoints"
    ],
    correctIndex: 1,
    explanation: "DSPM for AI specifically identifies data overexposure risks where broadly permissioned content (especially in SharePoint) could be surfaced by Copilot to users who shouldn't have access to it, based on existing permissions that are too broad."
  },
  {
    question: "A SharePoint site has 'Everyone except external users' added to its Members group. What happens when Microsoft 365 Copilot is deployed?",
    options: [
      "Copilot ignores sites with broad permissions by default",
      "Copilot can surface content from that site to any internal user who asks related questions",
      "Copilot only surfaces content if the user explicitly searches for it",
      "SharePoint automatically restricts the site when Copilot is enabled"
    ],
    correctIndex: 1,
    explanation: "Microsoft 365 Copilot respects existing permissions. If a site grants access to 'Everyone except external users,' any internal user can have content from that site surfaced through Copilot queries, even if they were previously unaware the content existed."
  },
  {
    question: "Which action should be taken FIRST when preparing for a Copilot deployment from a data security perspective?",
    options: [
      "Deploy sensitivity labels to all content",
      "Disable all external sharing",
      "Run a DSPM for AI assessment to identify overshared content",
      "Revoke all SharePoint permissions and rebuild from scratch"
    ],
    correctIndex: 2,
    explanation: "The first step is to assess the current state using DSPM for AI to identify where oversharing exists. This provides a prioritized view of risks before taking remediation actions like applying labels or restricting permissions."
  },
  {
    question: "How does applying a sensitivity label with encryption affect Microsoft 365 Copilot's ability to surface that content?",
    options: [
      "Encrypted content is completely invisible to Copilot regardless of permissions",
      "Copilot can only surface encrypted content to users who have the rights to decrypt it",
      "Encryption has no effect on Copilot — it always indexes all content",
      "Copilot strips the encryption before presenting results to users"
    ],
    correctIndex: 1,
    explanation: "Sensitivity labels with encryption enforce access at the content level. Copilot respects these rights — it will only surface encrypted content to users who have been granted decryption rights through the label's protection settings."
  }
]} />

## Cleanup

```powershell
# Remove test sensitivity labels and policies (if created in test environment)
Remove-AutoSensitivityLabelPolicy -Identity "Auto-Label-Financial-NoAI" -Confirm:$false
Remove-LabelPolicy -Identity "Publish-HC-NoAI-Label" -Confirm:$false
Remove-Label -Identity "HC-NoAI" -Confirm:$false

# Disconnect sessions
Disconnect-SPOService
Disconnect-MgGraph
Disconnect-ExchangeOnline

# Remove generated reports
Remove-Item "oversharing-report.csv" -ErrorAction SilentlyContinue
Remove-Item "copilot-readiness-report.json" -ErrorAction SilentlyContinue
```
