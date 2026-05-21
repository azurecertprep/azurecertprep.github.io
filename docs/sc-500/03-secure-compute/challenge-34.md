---
sidebar_position: 34
title: "Challenge 34: Azure Arc for Hybrid/Multicloud Servers & Defender for Servers"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 34: Azure Arc for Hybrid/Multicloud Servers & Defender for Servers

## Exam skills covered

- Onboard hybrid and multicloud servers to Azure Arc
- Enable and configure Microsoft Defender for Servers on Arc-connected machines
- Implement vulnerability assessment for non-Azure servers
- Configure endpoint detection and response (EDR) via Defender for Endpoint integration
- Monitor and remediate security recommendations for Arc-enabled servers
- Manage extensions and compliance for hybrid infrastructure

## Scenario

Contoso Ltd operates a hybrid environment with 200 servers in an on-premises datacenter (Windows Server 2019/2022) and 50 servers in AWS EC2. The security team must bring all servers under unified security management using Azure Arc, enable threat protection via Defender for Servers, and ensure consistent vulnerability scanning and endpoint protection across all environments.

---

## Prerequisites

- Azure subscription with Contributor access
- Microsoft Defender for Servers Plan 2 enabled
- On-premises server with network access to Azure (HTTPS 443 outbound)
- Azure CLI installed on the management workstation
- Service principal or managed identity for at-scale onboarding
- Local administrator access on target servers

---

## Task 1: Onboard servers to Azure Arc

Connect on-premises and multicloud servers to Azure Arc for unified management.

```bash
# Create resource group for Arc servers
az group create --name "rg-contoso-arc-servers" --location "eastus"

# Generate the onboarding script for a single server (interactive)
# Note: Single-server onboarding is done by running azcmagent on the target machine.
# The Azure CLI can generate the onboarding script via the portal or REST API.
# On the target server, after installing the agent:
# azcmagent connect --resource-group "rg-contoso-arc-servers" --name "srv-onprem-web01" --location "eastus" --tenant-id "{tenant-id}" --subscription-id "{sub-id}"

# For at-scale onboarding, create a service principal
az ad sp create-for-rbac \
    --name "sp-arc-onboarding" \
    --role "Azure Connected Machine Onboarding" \
    --scopes "/subscriptions/{sub-id}/resourceGroups/rg-contoso-arc-servers"
```

Generate the at-scale onboarding script:

```bash
# Download the Connected Machine agent installer script
# For Windows servers:
cat << 'EOF' > install-arc-agent-windows.ps1
# Azure Arc Agent Installation Script - Windows
$ServicePrincipalId = "your-sp-app-id"
$ServicePrincipalSecret = "your-sp-secret"
$TenantId = "your-tenant-id"
$SubscriptionId = "your-subscription-id"
$ResourceGroup = "rg-contoso-arc-servers"
$Location = "eastus"

# Download and install the agent
Invoke-WebRequest -Uri "https://aka.ms/AzureConnectedMachineAgent" -OutFile "$env:TEMP\install_windows_azcmagent.msi"
Start-Process msiexec.exe -Wait -ArgumentList "/i $env:TEMP\install_windows_azcmagent.msi /quiet"

# Connect to Azure Arc
& "$env:ProgramW6432\AzureConnectedMachineAgent\azcmagent.exe" connect `
    --service-principal-id $ServicePrincipalId `
    --service-principal-secret $ServicePrincipalSecret `
    --tenant-id $TenantId `
    --subscription-id $SubscriptionId `
    --resource-group $ResourceGroup `
    --location $Location `
    --tags "Environment=Production,Team=Infrastructure,OS=Windows"
EOF

# For Linux servers:
cat << 'EOF' > install-arc-agent-linux.sh
#!/bin/bash
export SERVICE_PRINCIPAL_ID="your-sp-app-id"
export SERVICE_PRINCIPAL_SECRET="your-sp-secret"
export TENANT_ID="your-tenant-id"
export SUBSCRIPTION_ID="your-subscription-id"
export RESOURCE_GROUP="rg-contoso-arc-servers"
export LOCATION="eastus"

# Download and install the agent
wget https://aka.ms/azcmagent -O ~/install_linux_azcmagent.sh
bash ~/install_linux_azcmagent.sh

# Connect to Azure Arc
azcmagent connect \
    --service-principal-id "$SERVICE_PRINCIPAL_ID" \
    --service-principal-secret "$SERVICE_PRINCIPAL_SECRET" \
    --tenant-id "$TENANT_ID" \
    --subscription-id "$SUBSCRIPTION_ID" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --tags "Environment=Production,Team=Infrastructure,OS=Linux"
EOF
```

---

## Task 2: Verify Arc server connectivity and status

Confirm servers are connected and healthy.

```bash
# List all Arc-connected machines
az connectedmachine list \
    --resource-group "rg-contoso-arc-servers" \
    --query "[].{name: name, status: status, os: osName, version: agentVersion, lastSeen: lastStatusChange}" \
    --output table

# Get detailed status of a specific server
az connectedmachine show \
    --resource-group "rg-contoso-arc-servers" \
    --name "srv-onprem-web01" \
    --query "{name: name, status: status, osType: osType, provisioningState: provisioningState, extensions: extensions}"

# Check agent connectivity on the server itself (run on the Arc server)
# azcmagent show
# azcmagent check
```

---

## Task 3: Enable Defender for Servers on Arc machines

Configure Microsoft Defender for Servers to protect Arc-connected machines.

```bash
# Enable Defender for Servers Plan 2 at subscription level
az security pricing create \
    --name "VirtualMachines" \
    --tier "Standard" \
    --subplan "P2"

# Verify Defender for Servers status
az security pricing show --name "VirtualMachines" \
    --query "{name: name, tier: pricingTier, subPlan: subPlan}"

# Install the Defender for Endpoint extension on Arc servers
az connectedmachine extension create \
    --resource-group "rg-contoso-arc-servers" \
    --machine-name "srv-onprem-web01" \
    --name "MDE.Linux" \
    --publisher "Microsoft.Azure.AzureDefenderForServers" \
    --type "MDE.Linux" \
    --location "eastus" \
    --auto-upgrade true

# For Windows Arc servers
az connectedmachine extension create \
    --resource-group "rg-contoso-arc-servers" \
    --machine-name "srv-onprem-win01" \
    --name "MDE.Windows" \
    --publisher "Microsoft.Azure.AzureDefenderForServers" \
    --type "MDE.Windows" \
    --location "eastus" \
    --auto-upgrade true

# Install vulnerability assessment extension (Qualys or MDVM)
az connectedmachine extension create \
    --resource-group "rg-contoso-arc-servers" \
    --machine-name "srv-onprem-web01" \
    --name "AzureSecurityLinuxAgent" \
    --publisher "Qualys" \
    --type "QualysAgentLinux" \
    --location "eastus"
```

---

## Task 4: Configure vulnerability assessment

Enable and review vulnerability scanning for Arc-connected servers.

```bash
# Enable Microsoft Defender Vulnerability Management (MDVM) as the VA solution
# MDVM is automatically included with Defender for Servers Plan 2
# No separate command needed; ensure Plan 2 is enabled:
az security pricing create \
    --name "VirtualMachines" \
    --tier "Standard" \
    --subplan "P2"

# List vulnerability assessment results for Arc servers
az security assessment list \
    --query "[?contains(resourceDetails.source, 'OnPremise') || contains(resourceDetails.source, 'MultiCloud')]" \
    --output table

# Get specific vulnerability findings
az security sub-assessment list \
    --assessment-name "1195afff-c881-495e-9bc5-1486211ae03f" \
    --assessed-resource-id "/subscriptions/{sub-id}/resourceGroups/rg-contoso-arc-servers/providers/Microsoft.HybridCompute/machines/srv-onprem-web01" \
    --query "[].{id: id, severity: status.severity, description: displayName}" \
    --output table

# Create security auto-provisioning for all Arc machines
az security auto-provisioning-setting update \
    --name "default" \
    --auto-provision "On"
```

---

## Task 5: Configure adaptive application controls and network hardening

Apply Defender for Cloud adaptive controls to Arc-connected servers.

```bash
# List adaptive application control recommendations
az security adaptive-application-controls list \
    --query "[].{group: name, vms: vmRecommendations[].resourceId, enforcement: enforcementMode}" \
    --output json

# Get recommended application allowlist for a server group
az security adaptive-application-controls show \
    --group-name "GROUP1" \
    --query "{enforcement: enforcementMode, rules: pathRecommendations[].{path: path, action: action, type: type}}"

# Enable adaptive network hardening recommendations
az security adaptive-network-hardening list \
    --resource-group "rg-contoso-arc-servers" \
    --resource-name "srv-onprem-web01" \
    --resource-type "machines" \
    --resource-namespace "Microsoft.HybridCompute"
```

---

## Task 6: Assign Azure Policy for Arc server compliance

Enforce security baselines on Arc-connected servers using Azure Policy.

```bash
# Assign policy initiative: "Windows machines should meet requirements for the Azure compute security baseline"
az policy assignment create \
    --name "arc-security-baseline-windows" \
    --display-name "Arc Servers - Windows Security Baseline" \
    --policy-set-definition "/providers/Microsoft.Authorization/policySetDefinitions/72650e9f-97bc-4b2a-ab5f-9781a9fcecbc" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-arc-servers" \
    --mi-system-assigned \
    --location "eastus"

# Assign policy: "Linux machines should meet requirements for the Azure compute security baseline"
az policy assignment create \
    --name "arc-security-baseline-linux" \
    --display-name "Arc Servers - Linux Security Baseline" \
    --policy-set-definition "/providers/Microsoft.Authorization/policySetDefinitions/fc9b3da7-8347-4380-8e70-0a0361d8dedd" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-arc-servers" \
    --mi-system-assigned \
    --location "eastus"

# Assign policy: "Machines should have a vulnerability assessment solution"
az policy assignment create \
    --name "require-va-arc-servers" \
    --display-name "Require VA on Arc Servers" \
    --policy "/providers/Microsoft.Authorization/policyDefinitions/501541f7-f7e7-4cd6-868c-4190fdad3ac9" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-arc-servers"

# Check compliance status
az policy state list \
    --resource-group "rg-contoso-arc-servers" \
    --filter "complianceState eq 'NonCompliant'" \
    --query "[].{resource: resourceId, policy: policyDefinitionName}" \
    --output table
```

---

## Break & Fix

### Scenario 1: Arc agent shows "Disconnected" status for multiple servers

Several on-premises servers show "Disconnected" status in the Azure portal. The servers are running and accessible on the corporate network.

<details>
<summary>Show solution</summary>

```bash
# 1. Check agent status on the affected server (run locally on the server)
# azcmagent show
# azcmagent check

# 2. Common cause: Proxy or firewall blocking outbound HTTPS
# Required URLs that must be accessible:
# - management.azure.com
# - login.microsoftonline.com
# - his.arc.azure.com
# - guestnotificationservice.azure.com

# 3. If using a proxy, configure the agent to use it
# azcmagent config set proxy.url "http://proxy.contoso.com:8080"

# 4. Test connectivity from the server
# Windows: Test-NetConnection -ComputerName "management.azure.com" -Port 443
# Linux: curl -v https://management.azure.com 2>&1 | grep -i "connected"

# 5. If certificate inspection is blocking, add bypass for Azure URLs
# or configure the agent to trust the proxy CA certificate
# azcmagent config set proxy.bypass "*.azure.com,*.microsoft.com"

# 6. Restart the agent service after fixing connectivity
# Windows: Restart-Service -Name "himds"
# Linux: systemctl restart himdsd

# 7. If agent is corrupted, reinstall
# azcmagent disconnect --force-local-only
# Then re-run the onboarding script

# 8. Verify from Azure side
az connectedmachine show \
    --resource-group "rg-contoso-arc-servers" \
    --name "srv-onprem-web01" \
    --query "{status: status, lastStatusChange: lastStatusChange, errorDetails: errorDetails}"
```

</details>

### Scenario 2: Defender for Endpoint not reporting for Arc servers despite extension installed

The MDE extension shows "Succeeded" on Arc machines, but Defender for Endpoint portal shows no devices from on-premises, and no security alerts are generated.

<details>
<summary>Show solution</summary>

```bash
# 1. Verify extension status
az connectedmachine extension show \
    --resource-group "rg-contoso-arc-servers" \
    --machine-name "srv-onprem-web01" \
    --name "MDE.Linux" \
    --query "{status: provisioningState, message: instanceView.status.message}"

# 2. Check if Defender for Servers plan includes MDE auto-provisioning
az security pricing show --name "VirtualMachines" \
    --query "{tier: pricingTier, subPlan: subPlan, extensions: extensions}"

# 3. Verify on the server that MDE service is running
# Linux: systemctl status mdatp
# Windows: Get-Service -Name "Sense"

# 4. Check MDE health on the server
# Linux: mdatp health
# Windows: "C:\Program Files\Windows Defender Advanced Threat Protection\SenseIR.exe"

# 5. Common issue: Server cannot reach MDE cloud endpoints
# Required: *.securitycenter.windows.com, *.blob.core.windows.net
# Linux: mdatp connectivity test
# Fix network access to MDE cloud URLs

# 6. If MDE was previously installed separately, uninstall and let the extension manage it
# This avoids conflicting configurations

# 7. Force extension reinstallation
az connectedmachine extension delete \
    --resource-group "rg-contoso-arc-servers" \
    --machine-name "srv-onprem-web01" \
    --name "MDE.Linux" --yes

az connectedmachine extension create \
    --resource-group "rg-contoso-arc-servers" \
    --machine-name "srv-onprem-web01" \
    --name "MDE.Linux" \
    --publisher "Microsoft.Azure.AzureDefenderForServers" \
    --type "MDE.Linux" \
    --location "eastus"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is required to onboard a non-Azure server to Azure Arc at scale without interactive login?",
    options: [
      "A Global Administrator account password stored on each server",
      "A service principal with 'Azure Connected Machine Onboarding' role and outbound HTTPS connectivity from the server",
      "A VPN tunnel from each server directly to the Azure portal",
      "Physical access to the Azure datacenter"
    ],
    correctIndex: 1,
    explanation: "At-scale Arc onboarding uses a service principal (with the Azure Connected Machine Onboarding role) for non-interactive authentication. The servers need outbound HTTPS (443) to Azure management endpoints — no VPN or inbound connectivity is required."
  },
  {
    question: "What does Microsoft Defender for Servers Plan 2 provide for Arc-connected machines that Plan 1 does not?",
    options: [
      "Basic antivirus only",
      "Agentless vulnerability scanning, JIT access, adaptive application controls, file integrity monitoring, and network hardening",
      "Only firewall rule management",
      "Plan 1 and Plan 2 have identical features"
    ],
    correctIndex: 1,
    explanation: "Plan 2 includes all Plan 1 features (Defender for Endpoint integration, EDR) plus agentless scanning, JIT VM access, adaptive application controls, file integrity monitoring, adaptive network hardening, and additional vulnerability assessment capabilities."
  },
  {
    question: "An Arc-connected server shows 'Connected' status but Defender for Cloud shows no security recommendations for it. What is the likely cause?",
    options: [
      "The server OS is not supported",
      "Defender for Servers plan is not enabled at the subscription level, or auto-provisioning of the monitoring agent/extension is disabled",
      "Arc-connected servers never receive security recommendations",
      "The server needs a public IP address for Defender communication"
    ],
    correctIndex: 1,
    explanation: "For Defender for Cloud to generate recommendations, the Defender for Servers plan must be enabled (Standard tier) AND the necessary extensions (Log Analytics agent or Azure Monitor Agent, MDE, VA) must be deployed — either via auto-provisioning or manual extension installation."
  },
  {
    question: "How should vulnerability assessment findings be remediated for Arc-connected servers in an on-premises datacenter?",
    options: [
      "Vulnerabilities can only be remediated by migrating the server to Azure",
      "Use Azure Update Management or manual patching to remediate, track compliance through Defender for Cloud recommendations",
      "Azure automatically patches on-premises servers through Arc",
      "Delete and recreate the server"
    ],
    correctIndex: 1,
    explanation: "Arc provides visibility and tracking of vulnerabilities, but remediation (patching) must be performed using Azure Update Management, WSUS, or manual patching processes. Defender for Cloud tracks the compliance state and re-scans to confirm remediation."
  }
]} />

## Cleanup

```bash
# Disconnect Arc servers (run on each server)
# azcmagent disconnect

# Delete resource group with all Arc registrations
az group delete --name "rg-contoso-arc-servers" --yes --no-wait

# Remove service principal
az ad sp delete --id "sp-arc-onboarding-app-id"
```
