---
sidebar_position: 21
title: "Challenge 21: VM Extensions & Automation"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 21: VM extensions & automation

:::info Estimated Time and Cost

**60-75 minutes** | **Estimated cost**: ~$2.00 (VM + Automation Account) | **Exam Weight: 15-20%**


:::
## Scenario

Contoso Ltd. has a fleet of 50 VMs across development, staging, and production environments. The operations team is tired of manually SSH-ing into each VM to install monitoring agents, configure software, and run maintenance scripts. Every time a new VM is provisioned, someone forgets a configuration step, leading to inconsistency. You are tasked with automating post-deployment configuration using VM extensions, Custom Script Extension, Run Command, and Azure Automation.

## Exam skills covered

| Skill | Weight |
|-------|--------|
| Configure VM extensions | High |
| Use Custom Script Extension for post-deployment configuration | High |
| Use Run Command for ad-hoc VM operations | Medium |
| Configure Azure Automation accounts | Medium |
| Create and manage runbooks | Medium |
| Configure VM diagnostics extension | Medium |

## Sysadmin ↔ Azure reference

| On-Prem / Sysadmin | Azure Equivalent | Notes |
|---------------------|------------------|-------|
| Post-install scripts (kickstart, cloud-init) | Custom Script Extension | Run once after VM deploy |
| SSH into server to run commands | Run Command | No SSH/RDP session needed |
| Puppet/Chef/Ansible agent | VM extensions | Agent-based configuration |
| Cron job for maintenance | Azure Automation runbooks | Scheduled or event-driven |
| Task Scheduler (Windows) | Automation schedules | Recurring tasks |
| Nagios/SNMP monitoring agent | Diagnostics extension | Metrics and logs collection |
| Configuration Management DB (CMDB) | Automation State Configuration (DSC) | Desired state enforcement |

## Tasks

### Task 1: create the lab environment

```bash
# Create resource group
az group create --name rg-az104-challenge21 --location eastus

# Create a Linux VM
az vm create \
  --name vm-linux-auto \
  --resource-group rg-az104-challenge21 \
  --image Ubuntu2404 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --tags Environment=Development Department=IT

# Create a Windows VM
az vm create \
  --name vm-win-auto \
  --resource-group rg-az104-challenge21 \
  --image Win2022Datacenter \
  --size Standard_B2s \
  --admin-username azureuser \
  --admin-password "P@ssw0rd2024!" \
  --tags Environment=Development Department=IT
```

### Task 2: deploy custom script extension (Linux)

Install Nginx on the Linux VM using the Custom Script Extension:

```bash
# Deploy custom script extension to install nginx
az vm extension set \
  --resource-group rg-az104-challenge21 \
  --vm-name vm-linux-auto \
  --name customScript \
  --publisher Microsoft.Azure.Extensions \
  --version 2.1 \
  --settings '{
    "commandToExecute": "apt-get update && apt-get install -y nginx && systemctl enable nginx && systemctl start nginx && echo \"<h1>Configured by Custom Script Extension</h1>\" > /var/www/html/index.html"
  }'

# Verify the extension status
az vm extension show \
  --resource-group rg-az104-challenge21 \
  --vm-name vm-linux-auto \
  --name customScript \
  --query "{Name:name, Status:provisioningState, Publisher:publisher}" -o table
```

### Task 3: deploy custom script extension (Windows)

Install IIS on the Windows VM using Custom Script Extension:

```bash
# Deploy custom script extension for Windows
az vm extension set \
  --resource-group rg-az104-challenge21 \
  --vm-name vm-win-auto \
  --name CustomScriptExtension \
  --publisher Microsoft.Compute \
  --version 1.10 \
  --settings '{
    "commandToExecute": "powershell.exe -Command \"Install-WindowsFeature -name Web-Server -IncludeManagementTools; Set-Content -Path C:\\inetpub\\wwwroot\\index.html -Value \\\"<h1>Configured by Custom Script Extension</h1>\\\"\""
  }'

# Verify extension status
az vm extension show \
  --resource-group rg-az104-challenge21 \
  --vm-name vm-win-auto \
  --name CustomScriptExtension \
  --query "{Name:name, Status:provisioningState}" -o table
```

### Task 4: use custom script extension with external script

Host a configuration script in a storage account and reference it:

```bash
# Create a storage account for scripts
az storage account create \
  --name stscripts$RANDOM \
  --resource-group rg-az104-challenge21 \
  --location eastus \
  --sku Standard_LRS

SCRIPT_ACCOUNT=$(az storage account list -g rg-az104-challenge21 --query "[?contains(name,'script')].name" -o tsv | head -1)

# Create a container
az storage container create \
  --name scripts \
  --account-name $SCRIPT_ACCOUNT \
  --auth-mode login

# Create a configuration script
cat > configure-vm.sh << 'EOF'
#!/bin/bash
echo "Starting VM configuration..."
apt-get update -y
apt-get install -y curl jq htop
useradd -m -s /bin/bash appuser
mkdir -p /opt/contoso/logs
echo "VM configured successfully at $(date)" > /opt/contoso/logs/setup.log
echo "Configuration complete."
EOF

# Upload the script
az storage blob upload \
  --container-name scripts \
  --file configure-vm.sh \
  --name configure-vm.sh \
  --account-name $SCRIPT_ACCOUNT \
  --auth-mode login

# Generate SAS URL for the script
SCRIPT_URL="https://$SCRIPT_ACCOUNT.blob.core.windows.net/scripts/configure-vm.sh"
SCRIPT_SAS=$(az storage blob generate-sas \
  --account-name $SCRIPT_ACCOUNT \
  --container-name scripts \
  --name configure-vm.sh \
  --permissions r \
  --expiry $(date -u -d "+1 hour" +%Y-%m-%dT%H:%MZ) \
  -o tsv)

# Remove existing extension before redeploying
az vm extension delete \
  --resource-group rg-az104-challenge21 \
  --vm-name vm-linux-auto \
  --name customScript

# Deploy with external script reference
az vm extension set \
  --resource-group rg-az104-challenge21 \
  --vm-name vm-linux-auto \
  --name customScript \
  --publisher Microsoft.Azure.Extensions \
  --version 2.1 \
  --settings "{
    \"fileUris\": [\"$SCRIPT_URL?$SCRIPT_SAS\"],
    \"commandToExecute\": \"bash configure-vm.sh\"
  }"

rm -f configure-vm.sh
```

### Task 5: use run command for Ad-Hoc operations

Run commands on VMs without SSH/RDP access:

```bash
# Linux: check disk space
az vm run-command invoke \
  --resource-group rg-az104-challenge21 \
  --name vm-linux-auto \
  --command-id RunShellScript \
  --scripts "df -h && echo '---' && free -m && echo '---' && uptime"

# Linux: check if nginx is running
az vm run-command invoke \
  --resource-group rg-az104-challenge21 \
  --name vm-linux-auto \
  --command-id RunShellScript \
  --scripts "systemctl status nginx --no-pager"

# Windows: get system information
az vm run-command invoke \
  --resource-group rg-az104-challenge21 \
  --name vm-win-auto \
  --command-id RunPowerShellScript \
  --scripts "Get-ComputerInfo | Select-Object WindowsProductName, OsArchitecture, CsProcessors, OsTotalVisibleMemorySize"

# Windows: check IIS status
az vm run-command invoke \
  --resource-group rg-az104-challenge21 \
  --name vm-win-auto \
  --command-id RunPowerShellScript \
  --scripts "Get-Service W3SVC | Format-Table Name, Status, StartType"
```

### Task 6: list and manage VM extensions

```bash
# List all extensions on a VM
az vm extension list \
  --resource-group rg-az104-challenge21 \
  --vm-name vm-linux-auto \
  --query "[].{Name:name, Publisher:publisher, Version:typeHandlerVersion, State:provisioningState}" -o table

# List available extension types
az vm extension image list \
  --location eastus \
  --publisher Microsoft.Azure.Extensions \
  --query "[].{Name:name, Publisher:publisher}" -o table --latest
```

### Task 7: create an Azure automation account

```bash
# Create automation account
az automation account create \
  --name auto-contoso-ops \
  --resource-group rg-az104-challenge21 \
  --location eastus

# Verify the account
az automation account show \
  --name auto-contoso-ops \
  --resource-group rg-az104-challenge21 \
  --query "{Name:name, State:state, Location:location}" -o table
```

### Task 8: create a runbook for VM Start/Stop

```bash
# Create a PowerShell runbook
az automation runbook create \
  --resource-group rg-az104-challenge21 \
  --automation-account-name auto-contoso-ops \
  --name "Stop-DevVMs" \
  --type PowerShell \
  --description "Stop all development VMs to save costs after business hours"

# Create the runbook script content
cat > stop-dev-vms.ps1 << 'EOF'
<#
.SYNOPSIS
    Stops all VMs tagged with Environment=Development
.DESCRIPTION
    This runbook finds all VMs with the Development tag and stops them.
    Used for cost savings outside business hours.
#>

param(
    [string]$ResourceGroupName = "rg-az104-challenge21",
    [string]$TagName = "Environment",
    [string]$TagValue = "Development"
)

# Connect using managed identity
Connect-AzAccount -Identity

# Get all VMs with the specified tag
$vms = Get-AzVM -ResourceGroupName $ResourceGroupName | 
    Where-Object { $_.Tags[$TagName] -eq $TagValue }

Write-Output "Found $($vms.Count) VMs with tag $TagName=$TagValue"

foreach ($vm in $vms) {
    $status = (Get-AzVM -ResourceGroupName $ResourceGroupName -Name $vm.Name -Status).Statuses | 
        Where-Object { $_.Code -like "PowerState/*" }
    
    if ($status.Code -eq "PowerState/running") {
        Write-Output "Stopping VM: $($vm.Name)"
        Stop-AzVM -ResourceGroupName $ResourceGroupName -Name $vm.Name -Force
        Write-Output "VM $($vm.Name) stopped successfully."
    } else {
        Write-Output "VM $($vm.Name) is already stopped (state: $($status.Code))"
    }
}

Write-Output "Runbook execution complete."
EOF

# Upload the runbook content
az automation runbook replace-content \
  --resource-group rg-az104-challenge21 \
  --automation-account-name auto-contoso-ops \
  --name "Stop-DevVMs" \
  --content @stop-dev-vms.ps1

# Publish the runbook
az automation runbook publish \
  --resource-group rg-az104-challenge21 \
  --automation-account-name auto-contoso-ops \
  --name "Stop-DevVMs"

rm -f stop-dev-vms.ps1
```

### Task 9: schedule the runbook

```bash
# Create a schedule (weekdays at 7 pm)
az automation schedule create \
  --resource-group rg-az104-challenge21 \
  --automation-account-name auto-contoso-ops \
  --name "weekday-evening-shutdown" \
  --frequency Day \
  --interval 1 \
  --start-time "2025-07-01T19:00:00-05:00" \
  --description "Runs every weekday at 7 PM ET to stop dev VMs"

# Link the schedule to the runbook
az automation job-schedule create \
  --resource-group rg-az104-challenge21 \
  --automation-account-name auto-contoso-ops \
  --runbook-name "Stop-DevVMs" \
  --schedule-name "weekday-evening-shutdown"
```

## Success criteria

<SuccessChecklist
  storageKey="az104-challenge-21"
  items={[
    "Custom Script Extension installs Nginx on the Linux VM",
    "Custom Script Extension installs IIS on the Windows VM",
    "External script from storage account executed via Custom Script Extension",
    "Run Command successfully executes ad-hoc commands on both VMs",
    "All installed extensions are visible via az vm extension list",
    "Azure Automation Account exists with a published runbook",
    "Runbook is linked to a daily schedule",
    "Runbook logic correctly identifies VMs by tag"
  ]}
/>
## Hints

<details>
<summary>Hint 1: Only one Custom Script Extension at a time</summary>

A VM can only have one instance of the Custom Script Extension installed at a time. To run a new script, you must first remove the existing extension and then set the new one. Alternatively, use Run Command for ad-hoc scripts without managing extension lifecycle.

</details>

<details>
<summary>Hint 2: Extension execution timeout</summary>

The Custom Script Extension has a default timeout of 90 minutes. For scripts that take longer, use the `--timeout` setting. If the extension shows "Transitioning" state for too long, check the extension log inside the VM at `/var/log/azure/custom-script/handler.log` (Linux) or `C:\WindowsAzure\Logs\Plugins\Microsoft.Compute.CustomScriptExtension` (Windows).

</details>

<details>
<summary>Hint 3: Run Command vs Custom Script Extension</summary>

- **Custom Script Extension**: Best for post-deployment configuration, runs once (or when updated), persists as part of VM configuration
- **Run Command**: Best for ad-hoc operations, does not persist, each invocation is independent

Use extensions for repeatable configuration and Run Command for troubleshooting or one-off tasks.

</details>

<details>
<summary>Hint 4: Automation Account identity</summary>

For the runbook to manage Azure resources, the Automation Account needs a managed identity (system-assigned or user-assigned) with appropriate RBAC roles. Assign the "Virtual Machine Contributor" role to allow the runbook to start/stop VMs.

</details>

## Break and fix

### Scenario a: extension fails to install

Deploy a Custom Script Extension with an intentional error (e.g., referencing a non-existent file URL). Check the extension status and diagnose the failure:

```bash
# Check extension provisioning state
az vm extension show \
  --resource-group rg-az104-challenge21 \
  --vm-name vm-linux-auto \
  --name customScript \
  --query "{Status:provisioningState, Message:instanceView.statuses[0].message}"

# Use run command to check extension logs
az vm run-command invoke \
  --resource-group rg-az104-challenge21 \
  --name vm-linux-auto \
  --command-id RunShellScript \
  --scripts "cat /var/log/azure/custom-script/handler.log | tail -20"
```

### Scenario b: run command timeout

Execute a Run Command script that sleeps for 5 minutes. What happens when the default timeout is exceeded? How do you handle long-running operations?

### Scenario c: runbook authentication failure

Create a runbook that tries to access resources but the Automation Account managed identity has no RBAC assignment. Observe the error in the job output and diagnose the missing permissions.

## Knowledge check

<details>
<summary>1. How many Custom Script Extensions can run simultaneously on a VM?</summary>

Only **one** Custom Script Extension can be installed on a VM at any time. If you need to run a new script, you must remove the existing extension first, then install the new one. Alternatively, update the extension with new settings (which triggers a re-run). For multiple scripts, combine them into a single wrapper script.

</details>

<details>
<summary>2. What is the difference between Run Command and Custom Script Extension?</summary>

**Custom Script Extension**: Is an extension that persists on the VM. It runs during provisioning or when updated. Best for initial configuration. Output is stored in extension logs on the VM.

**Run Command**: Is an API-based invocation that does not install anything on the VM. It uses the existing VM agent to execute scripts. Best for ad-hoc troubleshooting. Output is returned directly in the API response.

</details>

<details>
<summary>3. What authentication method should Azure Automation runbooks use?</summary>

Modern best practice is to use **Managed Identity** (system-assigned or user-assigned) for the Automation Account. The older "Run As Account" (service principal with certificate) is deprecated. Managed identities require appropriate RBAC role assignments on the target resources.

</details>

<details>
<summary>4. Where are Custom Script Extension logs stored on a Linux VM?</summary>

Extension logs on Linux are stored at:
- Handler log: `/var/log/azure/custom-script/handler.log`
- Script output: `/var/lib/waagent/custom-script/download/0/stdout` and `stderr`

On Windows:
- `C:\WindowsAzure\Logs\Plugins\Microsoft.Compute.CustomScriptExtension\<version>\`
- Script output: `C:\Packages\Plugins\Microsoft.Compute.CustomScriptExtension\<version>\Downloads\`

</details>

## Cleanup

```bash
# Delete the automation account
az automation account delete \
  --name auto-contoso-ops \
  --resource-group rg-az104-challenge21 \
  --yes

# Delete the resource group (VMs, storage, extensions)
az group delete --name rg-az104-challenge21 --yes --no-wait

echo "Cleanup complete."
```

## Learning resources

- [VM extensions overview](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/overview)
- [Custom Script Extension for Linux](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-linux)
- [Custom Script Extension for Windows](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-windows)
- [Run Command on Azure VMs](https://learn.microsoft.com/en-us/azure/virtual-machines/run-command-overview)
- [Azure Automation overview](https://learn.microsoft.com/en-us/azure/automation/overview)
- [Create and manage runbooks](https://learn.microsoft.com/en-us/azure/automation/manage-runbooks)
