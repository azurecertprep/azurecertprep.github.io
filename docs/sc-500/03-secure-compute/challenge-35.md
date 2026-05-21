---
sidebar_position: 35
title: "Challenge 35: Agentless Scanning and Machine Configuration Enforcement"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 35: Agentless Scanning and Machine Configuration Enforcement

## Exam skills covered

- Configure agentless scanning in Defender for Cloud (CSPM and Servers)
- Implement Azure Machine Configuration (formerly Guest Configuration) policies
- Enforce OS-level security baselines without deploying agents
- Monitor machine configuration compliance and remediate drift
- Configure custom Machine Configuration policies for regulatory requirements

## Scenario

Contoso Ltd has 500+ Azure VMs and 200 Arc-connected servers. The operations team cannot install additional agents on production servers due to change management restrictions. The security team needs agentless vulnerability scanning and OS-level compliance enforcement using Machine Configuration policies to verify servers meet CIS benchmarks and internal security baselines without deploying traditional monitoring agents.

---

## Prerequisites

- Azure subscription with Contributor access
- Microsoft Defender CSPM enabled (for agentless scanning)
- Microsoft Defender for Servers Plan 2 (for agentless VA)
- Azure VMs or Arc-connected machines
- Azure Policy Contributor role
- Azure CLI installed

---

## Task 1: Enable agentless scanning in Defender for Cloud

Configure agentless scanning for vulnerability assessment and software inventory without deploying agents.

```bash
# Enable Defender CSPM with agentless scanning
az security pricing create \
    --name "CloudPosture" \
    --tier "Standard"

# Enable agentless scanning extensions
az rest --method PUT \
    --uri "https://management.azure.com/subscriptions/{sub-id}/providers/Microsoft.Security/pricings/VirtualMachines?api-version=2024-01-01" \
    --body '{
        "properties": {
            "pricingTier": "Standard",
            "subPlan": "P2",
            "extensions": [
                {"name": "AgentlessVmScanning", "isEnabled": "True"},
                {"name": "MdeDesignatedSubscription", "isEnabled": "True"}
            ]
        }
    }'

# Verify agentless scanning is enabled
az security pricing show --name "VirtualMachines" \
    --query "{tier: pricingTier, subPlan: subPlan}"

az security pricing show --name "CloudPosture" \
    --query "{tier: pricingTier}"
```

Configure scanning scope:

1. Navigate to **Defender for Cloud** → **Environment settings** → Select subscription
2. Under **Defender plans** → **Servers** → Click **Settings**
3. Verify **Agentless scanning for machines** is enabled
4. Configure scanning settings:
   - **Scanning frequency**: Every 24 hours
   - **Disk snapshot location**: Same region as VM
   - **Exclusion tags**: `SkipAgentlessScan=true` (for exemptions)

---

## Task 2: Review agentless scanning results

Examine vulnerability findings and software inventory discovered without agents.

```bash
# List security assessments from agentless scanning
az security assessment list \
    --query "[?contains(id, 'agentless') || resourceDetails.source == 'Azure']" \
    --output table

# Get vulnerability findings from agentless scanning
az security sub-assessment list \
    --assessment-name "1195afff-c881-495e-9bc5-1486211ae03f" \
    --assessed-resource-id "/subscriptions/{sub-id}" \
    --query "[?status.severity == 'High'].{vm: resourceDetails.id, vuln: displayName, severity: status.severity, remediation: remediation}" \
    --output table

# Query software inventory via Resource Graph
az graph query -q "
    securityresources
    | where type == 'microsoft.security/assessments/subassessments'
    | where properties.id contains 'va-'
    | extend vmId = tostring(properties.resourceDetails.id),
             vulnId = tostring(properties.id),
             severity = tostring(properties.status.severity)
    | summarize VulnCount=count() by vmId, severity
    | order by VulnCount desc
"
```

---

## Task 3: Deploy Azure Machine Configuration extension

Install the Machine Configuration extension for OS-level compliance assessment.

```bash
# Create resource group for testing
az group create --name "rg-contoso-machine-config" --location "eastus"

# Create a test VM
az vm create \
    --resource-group "rg-contoso-machine-config" \
    --name "vm-config-test01" \
    --image "Canonical:ubuntu-24_04-lts:server:latest" \
    --size "Standard_B2ms" \
    --admin-username "azadmin" \
    --generate-ssh-keys \
    --assign-identity "[system]"

# Install Machine Configuration extension (Linux)
az vm extension set \
    --resource-group "rg-contoso-machine-config" \
    --vm-name "vm-config-test01" \
    --name "AzurePolicyforLinux" \
    --publisher "Microsoft.GuestConfiguration" \
    --enable-auto-upgrade true

# For Windows VMs
az vm extension set \
    --resource-group "rg-contoso-machine-config" \
    --vm-name "vm-config-win01" \
    --name "AzurePolicyforWindows" \
    --publisher "Microsoft.GuestConfiguration" \
    --enable-auto-upgrade true

# For Arc-connected servers
az connectedmachine extension create \
    --resource-group "rg-contoso-machine-config" \
    --machine-name "srv-onprem-web01" \
    --name "AzurePolicyforLinux" \
    --publisher "Microsoft.GuestConfiguration" \
    --type "ConfigurationForLinux" \
    --location "eastus"
```

---

## Task 4: Assign built-in Machine Configuration policies

Apply security baseline policies to enforce OS-level configurations.

```bash
# Assign policy: "Audit Linux machines that do not have the passwd file permissions set to 0644"
az policy assignment create \
    --name "audit-linux-passwd-permissions" \
    --display-name "Audit Linux passwd permissions" \
    --policy "/providers/Microsoft.Authorization/policyDefinitions/e6955644-301c-44b5-a4c4-528577de6861" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-machine-config" \
    --mi-system-assigned \
    --location "eastus"

# Assign policy: "Windows machines should meet requirements of the Azure security baseline"
az policy assignment create \
    --name "windows-security-baseline" \
    --display-name "Windows Security Baseline" \
    --policy-set-definition "/providers/Microsoft.Authorization/policySetDefinitions/72650e9f-97bc-4b2a-ab5f-9781a9fcecbc" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-machine-config" \
    --mi-system-assigned \
    --location "eastus"

# Assign policy: "Linux machines should meet requirements for the Azure security baseline"
az policy assignment create \
    --name "linux-security-baseline" \
    --display-name "Linux Security Baseline" \
    --policy-set-definition "/providers/Microsoft.Authorization/policySetDefinitions/fc9b3da7-8347-4380-8e70-0a0361d8dedd" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-machine-config" \
    --mi-system-assigned \
    --location "eastus"

# Assign DINE policy: "Configure time zone on Windows machines"
az policy assignment create \
    --name "config-windows-timezone" \
    --display-name "Configure Windows Timezone" \
    --policy "/providers/Microsoft.Authorization/policyDefinitions/08a2f2d2-94b2-4a7b-aa3b-bb3f523ee6fd" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-machine-config" \
    --mi-system-assigned \
    --location "eastus" \
    --params '{"TimeZone": {"value": "Eastern Standard Time"}}'

# Grant the policy assignment identity the required role
ASSIGNMENT_IDENTITY=$(az policy assignment show --name "config-windows-timezone" --query "identity.principalId" -o tsv)

az role assignment create \
    --assignee $ASSIGNMENT_IDENTITY \
    --role "Guest Configuration Resource Contributor" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-machine-config"
```

---

## Task 5: Create a custom Machine Configuration policy

Author a custom policy to enforce organization-specific security settings.

```bash
# Install the GuestConfiguration PowerShell module
# Install-Module -Name GuestConfiguration -Force

# Create a custom configuration (PowerShell DSC)
cat << 'EOF' > ContosSecurityBaseline.ps1
Configuration ContosoSecurityBaseline {
    Import-DscResource -ModuleName 'PSDscResources'

    Node 'localhost' {
        # Ensure SSH max auth tries is limited
        Script 'SSHMaxAuthTries' {
            GetScript = {
                $content = Get-Content '/etc/ssh/sshd_config' -ErrorAction SilentlyContinue
                $maxAuth = ($content | Select-String 'MaxAuthTries').ToString().Split(' ')[1]
                return @{ Result = $maxAuth }
            }
            TestScript = {
                $content = Get-Content '/etc/ssh/sshd_config' -ErrorAction SilentlyContinue
                $line = $content | Select-String '^MaxAuthTries\s+[1-4]$'
                return $null -ne $line
            }
            SetScript = {
                $content = Get-Content '/etc/ssh/sshd_config'
                $content = $content -replace '^#?MaxAuthTries.*', 'MaxAuthTries 4'
                Set-Content '/etc/ssh/sshd_config' -Value $content
            }
        }

        # Ensure password expiration is set
        Script 'PasswordMaxDays' {
            GetScript = {
                $content = Get-Content '/etc/login.defs'
                $maxDays = ($content | Select-String 'PASS_MAX_DAYS').ToString().Split("`t")[-1].Trim()
                return @{ Result = $maxDays }
            }
            TestScript = {
                $content = Get-Content '/etc/login.defs'
                $line = $content | Select-String '^PASS_MAX_DAYS\s+90$'
                return $null -ne $line
            }
            SetScript = {
                $content = Get-Content '/etc/login.defs'
                $content = $content -replace '^PASS_MAX_DAYS.*', 'PASS_MAX_DAYS    90'
                Set-Content '/etc/login.defs' -Value $content
            }
        }
    }
}
EOF
```

```powershell
# Compile and package the configuration (run in PowerShell)
# . ./ContosoSecurityBaseline.ps1
# ContosoSecurityBaseline -OutputPath './output'

# Create the Machine Configuration package
# New-GuestConfigurationPackage `
#     -Name 'ContosoSecurityBaseline' `
#     -Configuration './output/localhost.mof' `
#     -Type AuditAndSet `
#     -Force

# Upload to Azure Storage
# Publish-GuestConfigurationPackage `
#     -Path './ContosoSecurityBaseline.zip' `
#     -ResourceGroupName 'rg-contoso-machine-config'

# Create the Azure Policy definition from the package
# New-GuestConfigurationPolicy `
#     -ContentUri "https://storageaccount.blob.core.windows.net/packages/ContosoSecurityBaseline.zip" `
#     -DisplayName "Contoso Linux Security Baseline" `
#     -Description "Enforces Contoso-specific security settings on Linux servers" `
#     -Path './policy' `
#     -Platform 'Linux' `
#     -Mode 'ApplyAndAutoCorrect'

# Publish the policy
# Publish-GuestConfigurationPolicy -Path './policy'
```

---

## Task 6: Monitor compliance and remediate configuration drift

Track machine configuration compliance and set up alerting for drift.

```bash
# Check guest configuration assignment compliance
az policy state list \
    --resource-group "rg-contoso-machine-config" \
    --filter "policyDefinitionAction eq 'auditIfNotExists' or policyDefinitionAction eq 'deployIfNotExists'" \
    --query "[].{resource: resourceId, policy: policyDefinitionName, compliance: complianceState}" \
    --output table

# Query Machine Configuration assignment results via Resource Graph
az graph query -q "
    guestconfigurationresources
    | where type == 'microsoft.guestconfiguration/guestconfigurationassignments'
    | extend complianceStatus = properties.complianceStatus,
             assignmentName = properties.guestConfiguration.name,
             vmId = properties.targetResourceId
    | where complianceStatus == 'NonCompliant'
    | project vmId, assignmentName, complianceStatus, properties.lastComplianceStatusChecked
    | order by vmId asc
"

# Trigger a compliance evaluation
az policy state trigger-scan \
    --resource-group "rg-contoso-machine-config" \
    --no-wait

# Create an alert for non-compliant machines (using scheduled query on Resource Graph)
# Note: NonCompliantResources is not a metric at subscription scope;
# use a scheduled query alert on policy compliance data instead
az monitor scheduled-query create \
    --name "machine-config-drift-alert" \
    --resource-group "rg-contoso-machine-config" \
    --scopes "/subscriptions/{sub-id}" \
    --condition "count 'policyresources | where type == \"microsoft.guestconfiguration/guestconfigurationassignments\" | where properties.complianceStatus == \"NonCompliant\"' > 5" \
    --description "Alert when more than 5 machines drift from security baseline" \
    --window-size "PT1H" \
    --evaluation-frequency "PT15M" \
    --severity 2
```

---

## Break & Fix

### Scenario 1: Agentless scanning not discovering vulnerabilities on specific VMs

Agentless scanning works for most VMs but reports "No vulnerabilities found" for a set of production VMs that are known to have unpatched software.

<details>
<summary>Show solution</summary>

```bash
# 1. Check if VMs have the exclusion tag
az vm show --resource-group "rg-contoso-machine-config" --name "vm-problem01" \
    --query "tags" -o json
# Look for SkipAgentlessScan=true tag

# 2. Remove exclusion tag if incorrectly applied
az vm update --resource-group "rg-contoso-machine-config" --name "vm-problem01" \
    --remove tags.SkipAgentlessScan

# 3. Check disk encryption - agentless scanning cannot read encrypted disks
# without proper access to the encryption keys
az vm encryption show --resource-group "rg-contoso-machine-config" --name "vm-problem01"

# If using CMK, ensure the scanner identity has access to the Key Vault
# Defender for Cloud needs "Key Vault Crypto Service Encryption User" on the vault

# 4. Check if the VM OS is supported for agentless scanning
# Supported: Windows Server 2012+, Ubuntu 16.04+, RHEL 7+, CentOS 7+, Debian 9+
az vm show --resource-group "rg-contoso-machine-config" --name "vm-problem01" \
    --query "{os: storageProfile.osDisk.osType, image: storageProfile.imageReference}"

# 5. Verify the VM is in a supported state (running, not deallocated)
az vm get-instance-view --resource-group "rg-contoso-machine-config" --name "vm-problem01" \
    --query "instanceView.statuses[1].displayStatus"

# 6. Check subscription-level scanner permissions
# The scanner creates disk snapshots - needs "Disk Snapshot Contributor" role
az role assignment list --scope "/subscriptions/{sub-id}" \
    --query "[?contains(principalName, 'MDCAgentlessScan')]"
```

</details>

### Scenario 2: Machine Configuration shows "Pending" status indefinitely

Machine Configuration assignments show "Pending" compliance status and never transition to Compliant or NonCompliant, even after 48 hours.

<details>
<summary>Show solution</summary>

```bash
# 1. Verify the Machine Configuration extension is installed
az vm extension list \
    --resource-group "rg-contoso-machine-config" \
    --vm-name "vm-config-test01" \
    --query "[?contains(name, 'Policy') || contains(name, 'GuestConfiguration')]" \
    --output table

# 2. If missing, install it
az vm extension set \
    --resource-group "rg-contoso-machine-config" \
    --vm-name "vm-config-test01" \
    --name "AzurePolicyforLinux" \
    --publisher "Microsoft.GuestConfiguration" \
    --enable-auto-upgrade true

# 3. Verify the VM has a system-assigned managed identity
az vm identity show \
    --resource-group "rg-contoso-machine-config" \
    --name "vm-config-test01"

# If no identity, assign one
az vm identity assign \
    --resource-group "rg-contoso-machine-config" \
    --name "vm-config-test01"

# 4. Check if the guest configuration service is running on the VM
# SSH into the VM and run:
# systemctl status GCAgent  (Linux)
# Get-Service -Name "GuestConfig" (Windows)

# 5. Verify outbound connectivity from the VM to required endpoints
# Required: *.guestconfiguration.azure.com (port 443)

# 6. Check the policy assignment has the required managed identity role
ASSIGNMENT_IDENTITY=$(az policy assignment show --name "linux-security-baseline" \
    --query "identity.principalId" -o tsv)

az role assignment list --assignee $ASSIGNMENT_IDENTITY \
    --query "[].roleDefinitionName" -o tsv
# Must include "Guest Configuration Resource Contributor"

# If missing:
az role assignment create \
    --assignee $ASSIGNMENT_IDENTITY \
    --role "Guest Configuration Resource Contributor" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-machine-config"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "How does agentless scanning in Defender for Cloud discover vulnerabilities without installing an agent on the VM?",
    options: [
      "It scans network traffic to detect vulnerable services",
      "It takes a snapshot of the VM's OS disk, analyzes it in a separate environment, and reports findings without touching the running VM",
      "It uses the Azure Fabric Controller to inspect VM memory",
      "It requires temporary SSH/RDP access to each VM"
    ],
    correctIndex: 1,
    explanation: "Agentless scanning creates a temporary snapshot of the VM's OS disk, copies it to a secure scanning environment, analyzes installed packages and configurations for known vulnerabilities, and reports findings — all without installing anything on or connecting to the running VM."
  },
  {
    question: "What is the difference between 'Audit' and 'ApplyAndAutoCorrect' modes in Azure Machine Configuration?",
    options: [
      "Audit mode requires an agent but ApplyAndAutoCorrect does not",
      "Audit mode reports compliance status only, while ApplyAndAutoCorrect automatically remediates non-compliant settings to the desired state",
      "They are the same — both only audit",
      "ApplyAndAutoCorrect requires rebooting the VM after each correction"
    ],
    correctIndex: 1,
    explanation: "Audit mode only checks and reports whether a machine's configuration matches the desired state. ApplyAndAutoCorrect actively changes the machine's configuration to match the desired state when drift is detected, automatically remediating non-compliance."
  },
  {
    question: "What prerequisites must a VM have for Azure Machine Configuration to evaluate compliance?",
    options: [
      "Only a public IP address is needed",
      "A system-assigned managed identity and the Machine Configuration extension installed",
      "Azure AD Domain Services membership",
      "A Log Analytics agent and Dependency agent"
    ],
    correctIndex: 1,
    explanation: "Machine Configuration requires two components: a system-assigned managed identity (for authentication to Azure) and the Machine Configuration VM extension (GuestConfiguration agent). The VM also needs outbound HTTPS connectivity to Azure."
  },
  {
    question: "Which VMs can agentless scanning NOT assess for vulnerabilities?",
    options: [
      "VMs with no public IP address",
      "VMs in different Azure regions",
      "VMs with OS disks encrypted using customer-managed keys where the scanner lacks Key Vault access",
      "VMs running Windows Server 2022"
    ],
    correctIndex: 2,
    explanation: "Agentless scanning needs to read disk snapshots. If a VM's OS disk is encrypted with CMK and the scanning identity doesn't have access to the Key Vault hosting the encryption keys, it cannot decrypt and analyze the disk contents."
  }
]} />

## Cleanup

```bash
# Remove policy assignments
az policy assignment delete --name "audit-linux-passwd-permissions"
az policy assignment delete --name "windows-security-baseline"
az policy assignment delete --name "linux-security-baseline"
az policy assignment delete --name "config-windows-timezone"

# Delete resource group
az group delete --name "rg-contoso-machine-config" --yes --no-wait
```
