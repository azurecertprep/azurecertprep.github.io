---
sidebar_position: 2
title: "Challenge 32: Desired state configuration"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 32: Desired state configuration

:::info Platform: ADO-first
This challenge focuses on Azure DevOps Pipelines. GitHub Actions equivalents are noted where relevant.
:::

## Exam skills mapped

- Design and implement desired state configuration for environments, including Azure Automation State Configuration, Azure Resource Manager, Bicep, and Azure Machine Configuration

## Scenario

Contoso Ltd operates 50 Windows Server VMs and 20 Linux VMs across their Azure estate. These machines host line-of-business applications and must maintain consistent security configurations:

- TLS 1.2 enforced (TLS 1.0/1.1 disabled)
- Windows Firewall enabled with specific rules
- Required software installed (monitoring agent, antivirus definitions)
- Prohibited software removed (legacy FTP clients, unauthorized remote access tools)
- Password policies enforced (minimum length 14, complexity enabled)
- Audit logging configured

Operations staff frequently make ad-hoc changes to resolve incidents, creating compliance drift. The security team reports that 40% of VMs fail their monthly compliance scan. Contoso needs automated desired state enforcement with visibility into compliance posture.

## Task 1: Configure Azure Machine Configuration (formerly Guest Configuration)

Azure Machine Configuration uses Azure Policy to audit and enforce settings inside VMs. Set up the prerequisites:

```bash
# Register the required resource provider
az provider register --namespace Microsoft.GuestConfiguration

# Verify registration
az provider show --namespace Microsoft.GuestConfiguration --query "registrationState"

# VMs must have a system-assigned managed identity
az vm identity assign \
  --resource-group rg-contoso-vms \
  --name vm-contoso-web-01

# For existing VMs at scale, use Azure Policy to assign managed identities
# Policy: "Add system-assigned managed identity to enable Guest Configuration on VMs"
az policy assignment create \
  --name "assign-vm-identity" \
  --display-name "Assign system-assigned identity to VMs" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/3cf2ab00-13f1-4d0c-8971-2ac904541a7e" \
  --scope "/subscriptions/{subscription-id}/resourceGroups/rg-contoso-vms"

# Deploy the Guest Configuration extension (required for Machine Configuration)
az vm extension set \
  --resource-group rg-contoso-vms \
  --vm-name vm-contoso-web-01 \
  --name AzurePolicyforWindows \
  --publisher Microsoft.GuestConfiguration \
  --version 1.1
```

Verify Machine Configuration agent is working:

```bash
# Check guest assignment compliance for a specific VM
az rest --method GET \
  --url "https://management.azure.com/subscriptions/{sub-id}/resourceGroups/rg-contoso-vms/providers/Microsoft.Compute/virtualMachines/vm-contoso-web-01/providers/Microsoft.GuestConfiguration/guestConfigurationAssignments?api-version=2022-01-25"
```

## Task 2: Create a custom Machine Configuration package

Author a custom configuration to enforce Contoso's security baseline:

```powershell
# Install the GuestConfiguration module on authoring workstation
Install-Module -Name GuestConfiguration -Force
Install-Module -Name PSDesiredStateConfiguration -RequiredVersion 2.0.7 -Force

# Create DSC configuration for Windows security baseline
Configuration ContosoSecurityBaseline {
    Import-DscResource -ModuleName PSDscResources -ModuleVersion 2.12.0.0

    Node 'ContosoWindows' {

        # Enforce TLS 1.2
        Registry 'DisableTLS10' {
            Ensure    = 'Present'
            Key       = 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.0\Server'
            ValueName = 'Enabled'
            ValueType = 'DWord'
            ValueData = '0'
        }

        Registry 'DisableTLS11' {
            Ensure    = 'Present'
            Key       = 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.1\Server'
            ValueName = 'Enabled'
            ValueType = 'DWord'
            ValueData = '0'
        }

        Registry 'EnableTLS12' {
            Ensure    = 'Present'
            Key       = 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Server'
            ValueName = 'Enabled'
            ValueType = 'DWord'
            ValueData = '1'
        }

        # Ensure Windows Firewall is enabled
        Service 'WindowsFirewall' {
            Name        = 'MpsSvc'
            State       = 'Running'
            StartupType = 'Automatic'
        }

        # Ensure monitoring agent is installed
        WindowsFeature 'MonitoringAgent' {
            Ensure = 'Present'
            Name   = 'RSAT-AD-Tools'
        }

        # Audit password policy via security policy
        Registry 'MinPasswordLength' {
            Ensure    = 'Present'
            Key       = 'HKLM:\SYSTEM\CurrentControlSet\Services\Netlogon\Parameters'
            ValueName = 'MinimumPasswordLength'
            ValueType = 'DWord'
            ValueData = '14'
        }
    }
}

# Compile the configuration
ContosoSecurityBaseline -OutputPath ./compiled

# Create the Machine Configuration package
New-GuestConfigurationPackage `
    -Name 'ContosoSecurityBaseline' `
    -Configuration './compiled/ContosoWindows.mof' `
    -Type AuditAndSet `
    -Force
```

Test the package locally before publishing:

```powershell
# Test the configuration package locally
$result = Test-GuestConfigurationPackage `
    -Path './ContosoSecurityBaseline/ContosoSecurityBaseline.zip'

$result.resources | Format-Table ResourceName, InDesiredState, Reasons
```

## Task 3: Publish and assign configuration via Azure Policy

Upload the package to Azure Storage and create a policy definition:

```powershell
# Upload package to blob storage
$storageAccount = Get-AzStorageAccount -ResourceGroupName 'rg-contoso-configs' -Name 'stcontosoconfigs'
$container = Get-AzStorageContainer -Name 'guestconfiguration' -Context $storageAccount.Context

Set-AzStorageBlobContent `
    -Container 'guestconfiguration' `
    -File './ContosoSecurityBaseline/ContosoSecurityBaseline.zip' `
    -Blob 'ContosoSecurityBaseline.zip' `
    -Context $storageAccount.Context `
    -Force

# Generate SAS token (valid for 3 years for policy access)
$sasToken = New-AzStorageBlobSASToken `
    -Container 'guestconfiguration' `
    -Blob 'ContosoSecurityBaseline.zip' `
    -Context $storageAccount.Context `
    -Permission r `
    -ExpiryTime (Get-Date).AddYears(3)

$packageUri = "$($storageAccount.Context.BlobEndPoint)guestconfiguration/ContosoSecurityBaseline.zip$sasToken"

# Create the Azure Policy definition
$policyId = (New-Guid).Guid
New-GuestConfigurationPolicy `
    -ContentUri $packageUri `
    -DisplayName 'Contoso Security Baseline - Windows VMs' `
    -Description 'Audits and enforces TLS, firewall, and password settings on Windows VMs' `
    -Path './policy-definitions' `
    -Platform Windows `
    -Mode ApplyAndAutoCorrect `
    -Version '1.0.0'

# Publish the policy definition
$definition = New-AzPolicyDefinition `
    -Name 'contoso-security-baseline' `
    -Policy './policy-definitions/ContosoSecurityBaseline_AuditIfNotExists.json'

# Assign the policy to the VM resource group
New-AzPolicyAssignment `
    -Name 'contoso-baseline-assignment' `
    -DisplayName 'Enforce Contoso Security Baseline' `
    -PolicyDefinition $definition `
    -Scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-vms" `
    -IdentityType SystemAssigned `
    -Location 'eastus2'
```

## Task 4: Monitor compliance status

Query and visualize compliance across the VM fleet:

```bash
# Check overall policy compliance
az policy state summarize \
  --filter "policyDefinitionName eq 'contoso-security-baseline'" \
  --output table

# Get non-compliant resources
az policy state list \
  --filter "policyDefinitionName eq 'contoso-security-baseline' and complianceState eq 'NonCompliant'" \
  --query "[].{VM:resourceId, Reason:policyAssignmentName}" \
  --output table

# Get detailed guest configuration assignment results
az rest --method GET \
  --url "https://management.azure.com/subscriptions/{sub-id}/providers/Microsoft.GuestConfiguration/guestConfigurationAssignments?api-version=2022-01-25" \
  --query "value[?properties.complianceStatus=='NonCompliant'].{Name:name,VM:properties.targetResourceId,Status:properties.complianceStatus}"
```

Create an Azure Monitor workbook query for compliance dashboard:

```kusto
// KQL query for compliance trend (Azure Resource Graph)
GuestConfigurationResources
| where type == "microsoft.guestconfiguration/guestconfigurationassignments"
| extend complianceStatus = properties.complianceStatus
| extend vmId = tostring(properties.targetResourceId)
| extend configName = tostring(properties.guestConfiguration.name)
| summarize
    Compliant = countif(complianceStatus == "Compliant"),
    NonCompliant = countif(complianceStatus == "NonCompliant"),
    Pending = countif(complianceStatus == "Pending")
    by configName
| extend Total = Compliant + NonCompliant + Pending
| extend ComplianceRate = round(todouble(Compliant) / todouble(Total) * 100, 1)
```

## Task 5: Azure Automation State Configuration (DSC) overview

For VMs that need pull-based configuration (legacy approach, being superseded by Machine Configuration):

```powershell
# Create Azure Automation account
az automation account create \
  --name "aa-contoso-dsc" \
  --resource-group "rg-contoso-automation" \
  --location "eastus2" \
  --sku "Basic"

# Upload DSC configuration to Automation account
Import-AzAutomationDscConfiguration `
    -AutomationAccountName 'aa-contoso-dsc' `
    -ResourceGroupName 'rg-contoso-automation' `
    -SourcePath './ContosoSecurityBaseline.ps1' `
    -Published `
    -Force

# Compile the configuration (creates node configurations)
Start-AzAutomationDscCompilationJob `
    -AutomationAccountName 'aa-contoso-dsc' `
    -ResourceGroupName 'rg-contoso-automation' `
    -ConfigurationName 'ContosoSecurityBaseline'

# Register a VM with the Automation DSC pull server
Register-AzAutomationDscNode `
    -AutomationAccountName 'aa-contoso-dsc' `
    -ResourceGroupName 'rg-contoso-automation' `
    -AzureVMName 'vm-contoso-web-01' `
    -AzureVMResourceGroup 'rg-contoso-vms' `
    -NodeConfigurationName 'ContosoSecurityBaseline.ContosoWindows' `
    -ConfigurationMode 'ApplyAndAutoCorrect' `
    -RebootNodeIfNeeded $true `
    -ActionAfterReboot 'ContinueConfiguration' `
    -RefreshFrequencyMins 30 `
    -ConfigurationModeFrequencyMins 15
```

```bash
# Check node compliance status
az automation dsc node list \
  --automation-account-name aa-contoso-dsc \
  --resource-group rg-contoso-automation \
  --query "[].{Node:name, Status:status, Config:nodeConfiguration.name}" \
  --output table
```

## Task 6: Remediation tasks for non-compliant resources

Configure automatic remediation when policy detects non-compliance:

```bash
# Create a remediation task for non-compliant VMs
az policy remediation create \
  --name "remediate-contoso-baseline" \
  --policy-assignment "contoso-baseline-assignment" \
  --resource-group "rg-contoso-vms" \
  --resource-discovery-mode ReEvaluateCompliance

# Check remediation progress
az policy remediation show \
  --name "remediate-contoso-baseline" \
  --resource-group "rg-contoso-vms" \
  --query "{Status:provisioningState, Succeeded:deploymentStatus.totalDeployments, Failed:deploymentStatus.failedDeployments}"

# List all remediation tasks
az policy remediation list \
  --resource-group "rg-contoso-vms" \
  --output table
```

For scheduled remediation, use an Azure Automation Runbook:

```powershell
# Runbook: Invoke-PolicyRemediation.ps1
param(
    [string]$ResourceGroupName = "rg-contoso-vms",
    [string]$PolicyAssignmentName = "contoso-baseline-assignment"
)

Connect-AzAccount -Identity

$assignment = Get-AzPolicyAssignment -Name $PolicyAssignmentName -Scope "/subscriptions/$((Get-AzContext).Subscription.Id)/resourceGroups/$ResourceGroupName"

$nonCompliant = Get-AzPolicyState `
    -PolicyAssignmentName $PolicyAssignmentName `
    -Filter "complianceState eq 'NonCompliant'" `
    -ResourceGroupName $ResourceGroupName

if ($nonCompliant.Count -gt 0) {
    Write-Output "Found $($nonCompliant.Count) non-compliant resources. Starting remediation."

    Start-AzPolicyRemediation `
        -Name "auto-remediate-$(Get-Date -Format 'yyyyMMdd-HHmmss')" `
        -PolicyAssignmentId $assignment.PolicyAssignmentId `
        -ResourceGroupName $ResourceGroupName `
        -ResourceDiscoveryMode ReEvaluateCompliance

    Write-Output "Remediation task created successfully."
} else {
    Write-Output "All resources are compliant. No remediation needed."
}
```

## Task 7: Integration with CI/CD (deploy configuration packages via pipeline)

Create an Azure Pipelines pipeline to build, test, and publish configuration packages:

```yaml
# azure-pipelines/guest-configuration.yml
trigger:
  branches:
    include: [main]
  paths:
    include:
      - configurations/**

pool:
  vmImage: "windows-latest"

variables:
  - group: guest-config-storage
  - name: configName
    value: "ContosoSecurityBaseline"

stages:
  - stage: Build
    displayName: "Build configuration package"
    jobs:
      - job: BuildPackage
        displayName: "Compile and package DSC"
        steps:
          - task: PowerShell@2
            displayName: "Install required modules"
            inputs:
              targetType: inline
              script: |
                Install-Module -Name GuestConfiguration -Force -Scope CurrentUser
                Install-Module -Name PSDesiredStateConfiguration -RequiredVersion 2.0.7 -Force -Scope CurrentUser
                Install-Module -Name PSDscResources -Force -Scope CurrentUser

          - task: PowerShell@2
            displayName: "Compile DSC configuration"
            inputs:
              targetType: inline
              script: |
                . ./configurations/$(configName).ps1
                $(configName) -OutputPath ./compiled

          - task: PowerShell@2
            displayName: "Create configuration package"
            inputs:
              targetType: inline
              script: |
                New-GuestConfigurationPackage `
                    -Name '$(configName)' `
                    -Configuration './compiled/ContosoWindows.mof' `
                    -Type AuditAndSet `
                    -Force

          - task: PublishPipelineArtifact@1
            displayName: "Publish package artifact"
            inputs:
              targetPath: "./$(configName)/$(configName).zip"
              artifactName: "guest-config-package"

  - stage: Test
    displayName: "Test configuration"
    dependsOn: Build
    jobs:
      - job: TestPackage
        displayName: "Validate package locally"
        steps:
          - task: DownloadPipelineArtifact@2
            inputs:
              artifactName: "guest-config-package"
              targetPath: "$(Pipeline.Workspace)/package"

          - task: PowerShell@2
            displayName: "Test configuration package"
            inputs:
              targetType: inline
              script: |
                Install-Module -Name GuestConfiguration -Force -Scope CurrentUser
                $result = Test-GuestConfigurationPackage `
                    -Path '$(Pipeline.Workspace)/package/$(configName).zip'
                if ($result.complianceStatus -eq 'NonCompliant') {
                    Write-Host "##vso[task.logissue type=warning]Test VM is non-compliant - package is valid but will make changes"
                }
                Write-Host "Package validation: PASSED"

  - stage: Publish
    displayName: "Publish to Azure"
    dependsOn: Test
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: PublishConfig
        displayName: "Upload and assign policy"
        environment: "guest-configuration-prod"
        strategy:
          runOnce:
            deploy:
              steps:
                - task: DownloadPipelineArtifact@2
                  inputs:
                    artifactName: "guest-config-package"
                    targetPath: "$(Pipeline.Workspace)/package"

                - task: AzurePowerShell@5
                  displayName: "Upload package to storage"
                  inputs:
                    azureSubscription: "contoso-config-sc"
                    ScriptType: InlineScript
                    Inline: |
                      $ctx = (Get-AzStorageAccount -ResourceGroupName 'rg-contoso-configs' -Name 'stcontosoconfigs').Context
                      Set-AzStorageBlobContent `
                          -Container 'guestconfiguration' `
                          -File '$(Pipeline.Workspace)/package/$(configName).zip' `
                          -Blob '$(configName)-$(Build.BuildNumber).zip' `
                          -Context $ctx -Force
                      Write-Host "##vso[task.setvariable variable=packageBlob]$(configName)-$(Build.BuildNumber).zip"
                    azurePowerShellVersion: LatestVersion

                - task: AzurePowerShell@5
                  displayName: "Update policy definition"
                  inputs:
                    azureSubscription: "contoso-config-sc"
                    ScriptType: InlineScript
                    Inline: |
                      $ctx = (Get-AzStorageAccount -ResourceGroupName 'rg-contoso-configs' -Name 'stcontosoconfigs').Context
                      $sas = New-AzStorageBlobSASToken -Container 'guestconfiguration' -Blob '$(packageBlob)' -Context $ctx -Permission r -ExpiryTime (Get-Date).AddYears(3)
                      $uri = "$($ctx.BlobEndPoint)guestconfiguration/$(packageBlob)$sas"

                      New-GuestConfigurationPolicy `
                          -ContentUri $uri `
                          -DisplayName 'Contoso Security Baseline v$(Build.BuildNumber)' `
                          -Description 'Auto-deployed security baseline' `
                          -Path './policy-output' `
                          -Platform Windows `
                          -Mode ApplyAndAutoCorrect `
                          -Version '$(Build.BuildNumber)'
                    azurePowerShellVersion: LatestVersion
```

## Break & fix

### Exercise 1: Fix the non-reporting Machine Configuration

A VM shows "Pending" compliance status for 24 hours after policy assignment. Diagnose:

```bash
# Check if the VM has managed identity
az vm show --resource-group rg-contoso-vms --name vm-contoso-web-01 \
  --query "identity.type"
# Returns: null  <-- ERROR: No managed identity assigned

# Check if Guest Configuration extension is installed
az vm extension list --resource-group rg-contoso-vms --vm-name vm-contoso-web-01 \
  --query "[?publisher=='Microsoft.GuestConfiguration'].{Name:name, Status:provisioningState}" \
  --output table
# Returns: empty  <-- ERROR: Extension not installed
```


<details>
<summary>Show solution</summary>

**Fix:**

```bash
# Assign system-assigned managed identity
az vm identity assign \
  --resource-group rg-contoso-vms \
  --name vm-contoso-web-01

# Install the Guest Configuration extension
az vm extension set \
  --resource-group rg-contoso-vms \
  --vm-name vm-contoso-web-01 \
  --name AzurePolicyforWindows \
  --publisher Microsoft.GuestConfiguration \
  --version 1.1

# Force a policy compliance evaluation
az policy state trigger-scan \
  --resource-group rg-contoso-vms \
  --no-wait
```

</details>

### Exercise 2: Fix the broken DSC configuration package

The pipeline builds successfully but the policy shows all VMs as compliant when they clearly are not. The issue is in the configuration:

```powershell
# BROKEN: Configuration uses 'Audit' mode instead of 'AuditAndSet'
New-GuestConfigurationPackage `
    -Name 'ContosoSecurityBaseline' `
    -Configuration './compiled/ContosoWindows.mof' `
    -Type Audit `    # ERROR: Audit only reports, doesn't enforce
    -Force

# ALSO BROKEN: Missing module dependency in package
# The PSDscResources module is referenced but not bundled
```


<details>
<summary>Show solution</summary>

**Fix:**

```powershell
# Include dependent modules and use correct mode
New-GuestConfigurationPackage `
    -Name 'ContosoSecurityBaseline' `
    -Configuration './compiled/ContosoWindows.mof' `
    -Type AuditAndSet `
    -Force `
    -FilesToInclude @(
        (Get-Module PSDscResources -ListAvailable).ModuleBase
    )
```

</details>
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the difference between Azure Machine Configuration modes \"Audit\" and \"ApplyAndAutoCorrect\"?",
    options: [
      "Audit deploys resources; ApplyAndAutoCorrect deletes non-compliant resources",
      "Audit only reports compliance status; ApplyAndAutoCorrect reports and remediates drift automatically",
      "Audit runs once; ApplyAndAutoCorrect runs on a schedule",
      "Audit works on Windows only; ApplyAndAutoCorrect works cross-platform"
    ],
    correctIndex: 1,
    explanation: "In Audit mode, Machine Configuration evaluates the VM and reports whether it is compliant or non-compliant but takes no corrective action. In ApplyAndAutoCorrect mode, it both reports compliance and actively remediates drift by reapplying the desired configuration on each evaluation cycle (every 15 minutes by default)."
  },
  {
    question: "What prerequisite must a VM have before Azure Machine Configuration can evaluate it?",
    options: [
      "The VM must be domain-joined to Azure AD",
      "The VM must have a system-assigned managed identity and the Guest Configuration extension",
      "The VM must be running Windows Server 2019 or later",
      "The VM must have Azure Monitor Agent installed"
    ],
    correctIndex: 1,
    explanation: "Azure Machine Configuration requires two things on the target VM: a system-assigned managed identity (for authentication to Azure services) and the Guest Configuration extension (AzurePolicyforWindows or AzurePolicyforLinux) which runs the configuration evaluation agent inside the VM."
  },
  {
    question: "How does Azure Policy integrate with Machine Configuration for at-scale enforcement?",
    options: [
      "Azure Policy directly modifies VM settings without any agent",
      "Azure Policy deploys an Azure Function that connects to VMs via SSH/WinRM",
      "Azure Policy assigns guest configuration definitions that the in-VM agent evaluates and reports on",
      "Azure Policy triggers Azure Automation runbooks that apply DSC configurations"
    ],
    correctIndex: 2,
    explanation: "Azure Policy acts as the orchestration layer. When a Machine Configuration policy is assigned, it ensures the target VMs have the required identity and extension, then creates guest configuration assignments. The in-VM agent picks up these assignments, evaluates the configuration, and reports compliance status back to Azure Policy."
  },
  {
    question: "What is the recommended approach for versioning Machine Configuration packages in a CI/CD pipeline?",
    options: [
      "Overwrite the same blob in storage with each deployment",
      "Use build numbers in the blob name and update the policy definition to reference the new URI",
      "Store all versions locally on the VM and reference them by path",
      "Use Azure Automation DSC pull server versioning exclusively"
    ],
    correctIndex: 1,
    explanation: "Each build should produce a uniquely named package (using build number or version), upload it to a new blob, and update the policy definition's content URI. This enables rollback (point policy back to a previous version), audit trail (which version was deployed when), and safe progressive rollout (assign new version to dev first, then production)."
  }
]} />

## Cleanup

```bash
# Remove policy assignment
az policy assignment delete --name "contoso-baseline-assignment" --resource-group "rg-contoso-vms"

# Remove policy definition
az policy definition delete --name "contoso-security-baseline"

# Remove Guest Configuration extension from VMs
az vm extension delete \
  --resource-group rg-contoso-vms \
  --vm-name vm-contoso-web-01 \
  --name AzurePolicyforWindows

# Remove Automation account (if using DSC)
az automation account delete \
  --name aa-contoso-dsc \
  --resource-group rg-contoso-automation \
  --yes

# Remove configuration storage
az storage blob delete-batch \
  --account-name stcontosoconfigs \
  --source guestconfiguration

# Remove remediation tasks
az policy remediation delete \
  --name "remediate-contoso-baseline" \
  --resource-group "rg-contoso-vms"
```
