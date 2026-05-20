---
sidebar_position: 32
title: "Challenge 32: VM Security – Disk Encryption & Secure Boot (vTPM, Integrity Monitoring)"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 32: VM Security – Disk Encryption & Secure Boot (vTPM, Integrity Monitoring)

## Exam skills covered

- Configure Azure Disk Encryption (ADE) and server-side encryption with customer-managed keys
- Enable Trusted Launch with vTPM and Secure Boot for Azure VMs
- Implement boot integrity monitoring and attestation
- Configure confidential computing VMs with encrypted memory
- Monitor disk encryption compliance and remediate non-compliant VMs

## Scenario

Contoso Ltd's compliance team has mandated that all Azure VMs must implement defense-in-depth disk protection and verified boot integrity. New regulatory requirements (PCI-DSS 4.0 and NIST 800-53) require encryption at rest with customer-managed keys, secure boot verification, and runtime integrity attestation. Several legacy VMs currently use platform-managed keys and lack Trusted Launch features.

---

## Prerequisites

- Azure subscription with Contributor access
- Azure Key Vault with appropriate access policies
- Azure CLI installed
- Understanding of Azure VM generations (Gen1 vs Gen2)
- Defender for Cloud enabled

---

## Task 1: Create a Trusted Launch VM with Secure Boot and vTPM

Deploy a Gen2 VM with full Trusted Launch security features enabled.

```bash
# Create resource group
az group create --name "rg-contoso-vm-security" --location "eastus"

# Create a Trusted Launch VM with Secure Boot and vTPM
az vm create \
    --resource-group "rg-contoso-vm-security" \
    --name "vm-trusted-web01" \
    --image "Canonical:ubuntu-24_04-lts:server:latest" \
    --size "Standard_D4s_v5" \
    --security-type "TrustedLaunch" \
    --enable-secure-boot true \
    --enable-vtpm true \
    --admin-username "azadmin" \
    --generate-ssh-keys \
    --os-disk-encryption-type "DiskWithVMGuestState" \
    --public-ip-address "" \
    --vnet-name "vnet-contoso-prod" \
    --subnet "subnet-web"

# Verify Trusted Launch settings
az vm show \
    --resource-group "rg-contoso-vm-security" \
    --name "vm-trusted-web01" \
    --query "securityProfile" -o json
```

---

## Task 2: Enable boot integrity monitoring

Configure the Guest Attestation extension and integrity monitoring for Trusted Launch VMs.

```bash
# Install the Guest Attestation extension for boot integrity
az vm extension set \
    --resource-group "rg-contoso-vm-security" \
    --vm-name "vm-trusted-web01" \
    --name "GuestAttestation" \
    --publisher "Microsoft.Azure.Security.LinuxAttestation" \
    --version "1.0" \
    --enable-auto-upgrade true

# For Windows VMs, use:
# --publisher "Microsoft.Azure.Security.WindowsAttestation"

# Verify attestation status
az vm get-instance-view \
    --resource-group "rg-contoso-vm-security" \
    --name "vm-trusted-web01" \
    --query "instanceView.bootDiagnostics"

# Check integrity monitoring status in Defender for Cloud
az security assessment list \
    --query "[?contains(displayName, 'boot') || contains(displayName, 'integrity')]" \
    --output table
```

Enable Defender for Cloud boot integrity monitoring:

1. Navigate to **Defender for Cloud** → **Environment settings** → Select subscription
2. Under **Defender plans** → **Servers** → **Settings**
3. Enable **Boot integrity monitoring**
4. This automatically alerts if:
   - Secure Boot keys are modified
   - Boot chain is tampered with
   - Unsigned kernel modules are loaded

---

## Task 3: Configure Azure Disk Encryption with customer-managed keys

Set up encryption using customer-managed keys (CMK) stored in Azure Key Vault.

```bash
# Create Key Vault for disk encryption keys
az keyvault create \
    --name "kv-contoso-disk-enc" \
    --resource-group "rg-contoso-vm-security" \
    --location "eastus" \
    --sku "premium" \
    --enabled-for-disk-encryption true \
    --enable-purge-protection true \
    --enable-rbac-authorization true

# Create a key encryption key (KEK)
az keyvault key create \
    --vault-name "kv-contoso-disk-enc" \
    --name "disk-encryption-key" \
    --kty "RSA" \
    --size 4096 \
    --protection "hsm"

# Get Key Vault ID and key URL
KV_ID=$(az keyvault show --name "kv-contoso-disk-enc" --query "id" -o tsv)
KEY_URL=$(az keyvault key show --vault-name "kv-contoso-disk-enc" --name "disk-encryption-key" --query "key.kid" -o tsv)

# Create Disk Encryption Set with CMK
az disk-encryption-set create \
    --name "des-contoso-cmk" \
    --resource-group "rg-contoso-vm-security" \
    --location "eastus" \
    --source-vault $KV_ID \
    --key-url $KEY_URL \
    --encryption-type "EncryptionAtRestWithCustomerKey"

# Get the DES identity to grant Key Vault access
DES_IDENTITY=$(az disk-encryption-set show \
    --name "des-contoso-cmk" \
    --resource-group "rg-contoso-vm-security" \
    --query "identity.principalId" -o tsv)

# Grant the DES identity access to Key Vault
az role assignment create \
    --assignee $DES_IDENTITY \
    --role "Key Vault Crypto Service Encryption User" \
    --scope $KV_ID
```

---

## Task 4: Apply disk encryption to existing VMs

Enable Azure Disk Encryption on existing VMs and configure new VMs to use the Disk Encryption Set.

```bash
# Option 1: Server-side encryption with CMK (for new disks)
DES_ID=$(az disk-encryption-set show \
    --name "des-contoso-cmk" \
    --resource-group "rg-contoso-vm-security" \
    --query "id" -o tsv)

# Create a new VM with server-side CMK encryption
az vm create \
    --resource-group "rg-contoso-vm-security" \
    --name "vm-cmk-db01" \
    --image "MicrosoftWindowsServer:WindowsServer:2022-datacenter-g2:latest" \
    --size "Standard_D4s_v5" \
    --security-type "TrustedLaunch" \
    --enable-secure-boot true \
    --enable-vtpm true \
    --os-disk-encryption-set $DES_ID \
    --admin-username "azadmin" \
    --admin-password "C0nt0s0!SecureP@ss2024" \
    --public-ip-address ""

# Option 2: Azure Disk Encryption (ADE) for existing VMs - encrypts at guest OS level
az vm encryption enable \
    --resource-group "rg-contoso-vm-security" \
    --name "vm-legacy-app01" \
    --disk-encryption-keyvault "kv-contoso-disk-enc" \
    --key-encryption-key "disk-encryption-key" \
    --key-encryption-keyvault "kv-contoso-disk-enc" \
    --volume-type "All"

# Verify encryption status
az vm encryption show \
    --resource-group "rg-contoso-vm-security" \
    --name "vm-legacy-app01" \
    --query "{osVolume: .disks[0].statuses[0].displayStatus, dataVolumes: .disks[1:]}"
```

---

## Task 5: Enable Confidential VM capabilities

Deploy a confidential VM with encrypted memory (AMD SEV-SNP) for the most sensitive workloads.

```bash
# Create a Confidential VM with AMD SEV-SNP
az vm create \
    --resource-group "rg-contoso-vm-security" \
    --name "vm-confidential-hr01" \
    --image "Canonical:0001-com-ubuntu-confidential-vm-jammy:22_04-lts-cvm:latest" \
    --size "Standard_DC4as_v5" \
    --security-type "ConfidentialVM" \
    --os-disk-security-encryption-type "VMGuestStateOnly" \
    --enable-secure-boot true \
    --enable-vtpm true \
    --admin-username "azadmin" \
    --generate-ssh-keys \
    --public-ip-address ""

# Verify confidential computing settings
az vm show \
    --resource-group "rg-contoso-vm-security" \
    --name "vm-confidential-hr01" \
    --query "{securityType: securityProfile.securityType, encryptionType: securityProfile.uefiSettings, size: hardwareProfile.vmSize}"

# For full disk confidential encryption (DiskWithVMGuestState)
az vm create \
    --resource-group "rg-contoso-vm-security" \
    --name "vm-confidential-finance01" \
    --image "Canonical:0001-com-ubuntu-confidential-vm-jammy:22_04-lts-cvm:latest" \
    --size "Standard_DC4as_v5" \
    --security-type "ConfidentialVM" \
    --os-disk-security-encryption-type "DiskWithVMGuestState" \
    --os-disk-secure-vm-disk-encryption-set $DES_ID \
    --enable-secure-boot true \
    --enable-vtpm true \
    --admin-username "azadmin" \
    --generate-ssh-keys \
    --public-ip-address ""
```

---

## Task 6: Monitor encryption compliance with Azure Policy

Create and assign policies to enforce disk encryption across all VMs.

```bash
# Assign built-in policy: "Virtual machines should encrypt temp disks, caches, and data flows"
az policy assignment create \
    --name "enforce-vm-encryption" \
    --display-name "Enforce VM Disk Encryption" \
    --policy "/providers/Microsoft.Authorization/policyDefinitions/0961003e-5a0a-4549-abde-af6a37f2724d" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-vm-security" \
    --enforcement-mode "Default"

# Assign built-in policy: "Trusted Launch should be enabled on VMs"
az policy assignment create \
    --name "require-trusted-launch" \
    --display-name "Require Trusted Launch for VMs" \
    --policy "/providers/Microsoft.Authorization/policyDefinitions/c95b54ad-0614-4633-ab29-104b01235cbf" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-vm-security" \
    --enforcement-mode "Default"

# Check compliance status
az policy state list \
    --resource-group "rg-contoso-vm-security" \
    --filter "complianceState eq 'NonCompliant'" \
    --query "[].{resource: resourceId, policy: policyAssignmentName, state: complianceState}" \
    --output table

# Trigger a compliance evaluation
az policy state trigger-scan \
    --resource-group "rg-contoso-vm-security" \
    --no-wait
```

---

## Break & Fix

### Scenario 1: Azure Disk Encryption fails with "KeyVault access denied" error

An attempt to enable ADE on a production VM fails with error: "Key Vault operation failed. Key Vault is returning 403 Forbidden."

<details>
<summary>Show solution</summary>

```bash
# 1. Check Key Vault access configuration
az keyvault show --name "kv-contoso-disk-enc" \
    --query "{enabledForDiskEncryption: properties.enabledForDiskEncryption, rbacAuth: properties.enableRbacAuthorization}"

# 2. If using RBAC authorization, ensure the VM identity has access
VM_IDENTITY=$(az vm show \
    --resource-group "rg-contoso-vm-security" \
    --name "vm-legacy-app01" \
    --query "identity.principalId" -o tsv)

# If VM has no identity, enable system-assigned identity
az vm identity assign \
    --resource-group "rg-contoso-vm-security" \
    --name "vm-legacy-app01"

# 3. Ensure Key Vault is enabled for disk encryption
az keyvault update \
    --name "kv-contoso-disk-enc" \
    --enabled-for-disk-encryption true

# 4. If using RBAC, assign the correct role
az role assignment create \
    --assignee $VM_IDENTITY \
    --role "Key Vault Crypto Service Encryption User" \
    --scope $KV_ID

# 5. If using access policies (non-RBAC), add policy
az keyvault set-policy \
    --name "kv-contoso-disk-enc" \
    --object-id $VM_IDENTITY \
    --key-permissions get wrapKey unwrapKey

# 6. Check for network restrictions on Key Vault
az keyvault network-rule list --name "kv-contoso-disk-enc"
# If restricted, add the VM's VNet/subnet or set to "Allow"
az keyvault network-rule add \
    --name "kv-contoso-disk-enc" \
    --vnet-name "vnet-contoso-prod" \
    --subnet "subnet-web"

# 7. Retry encryption
az vm encryption enable \
    --resource-group "rg-contoso-vm-security" \
    --name "vm-legacy-app01" \
    --disk-encryption-keyvault "kv-contoso-disk-enc" \
    --volume-type "All"
```

</details>

### Scenario 2: Boot integrity monitoring reports "Secure Boot validation failed"

Defender for Cloud generates an alert: "Boot integrity monitoring detected that Secure Boot validation failed" on a production VM. The VM is running but may be compromised.

<details>
<summary>Show solution</summary>

```bash
# 1. Get the attestation details
az vm get-instance-view \
    --resource-group "rg-contoso-vm-security" \
    --name "vm-trusted-web01" \
    --query "instanceView.extensions[?name=='GuestAttestation']"

# 2. Check boot diagnostics for evidence of tampering
az vm boot-diagnostics get-boot-log \
    --resource-group "rg-contoso-vm-security" \
    --name "vm-trusted-web01"

# 3. DO NOT immediately reboot - preserve forensic evidence
# Instead, capture a disk snapshot for investigation
az snapshot create \
    --resource-group "rg-contoso-vm-security" \
    --name "snapshot-forensic-web01-$(date +%Y%m%d)" \
    --source "/subscriptions/{sub-id}/resourceGroups/rg-contoso-vm-security/providers/Microsoft.Compute/disks/vm-trusted-web01_OsDisk_1"

# 4. Check Defender for Cloud for correlated alerts
az security alert list \
    --query "[?contains(compromisedEntity, 'vm-trusted-web01')]" \
    --output json

# 5. If legitimate change (e.g., kernel update), the fix is:
# Re-register the new boot measurements
az vm extension set \
    --resource-group "rg-contoso-vm-security" \
    --vm-name "vm-trusted-web01" \
    --name "GuestAttestation" \
    --publisher "Microsoft.Azure.Security.LinuxAttestation" \
    --force-update

# 6. If potential compromise, isolate the VM
az network nsg rule create \
    --resource-group "rg-contoso-vm-security" \
    --nsg-name "nsg-web01" \
    --name "DenyAllOutbound-Emergency" \
    --priority 100 \
    --direction "Outbound" \
    --access "Deny" \
    --source-address-prefixes "*" \
    --destination-address-prefixes "*" \
    --protocol "*"
```

</details>

### Scenario 3: Confidential VM fails to deploy with "UnsupportedSecurityType" error

Attempting to create a Confidential VM returns error: "The requested VM size does not support the requested security type ConfidentialVM."

<details>
<summary>Show solution</summary>

```bash
# 1. Verify the VM size supports confidential computing
# Confidential VMs require DCas_v5, DCads_v5, ECas_v5, or ECads_v5 series
az vm list-sizes --location "eastus" \
    --query "[?contains(name, 'DC') && contains(name, 'v5')]" \
    --output table

# 2. Check the image supports confidential VMs
az vm image list \
    --publisher "Canonical" \
    --offer "0001-com-ubuntu-confidential-vm-jammy" \
    --all --output table

# 3. Fix: Use a supported size and image combination
az vm create \
    --resource-group "rg-contoso-vm-security" \
    --name "vm-confidential-hr01" \
    --image "Canonical:0001-com-ubuntu-confidential-vm-jammy:22_04-lts-cvm:latest" \
    --size "Standard_DC4as_v5" \
    --security-type "ConfidentialVM" \
    --os-disk-security-encryption-type "VMGuestStateOnly" \
    --enable-secure-boot true \
    --enable-vtpm true \
    --admin-username "azadmin" \
    --generate-ssh-keys

# 4. If the region doesn't support confidential VMs, check available regions
az provider show --namespace "Microsoft.Compute" \
    --query "resourceTypes[?resourceType=='virtualMachines'].locations" -o tsv
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the difference between Azure Disk Encryption (ADE) and server-side encryption with customer-managed keys (SSE+CMK)?",
    options: [
      "ADE encrypts at the guest OS level using BitLocker/DM-Crypt, while SSE+CMK encrypts at the storage infrastructure level with CMK in Key Vault",
      "ADE is free and SSE+CMK requires a premium license",
      "ADE only encrypts OS disks while SSE+CMK encrypts all disks",
      "They are identical — just different names for the same feature"
    ],
    correctIndex: 0,
    explanation: "ADE uses BitLocker (Windows) or DM-Crypt (Linux) to encrypt inside the guest OS, providing defense against offline disk theft. SSE+CMK encrypts at the Azure Storage platform layer using customer-managed keys in Key Vault, providing encryption with customer key control at the infrastructure level."
  },
  {
    question: "What does vTPM (virtual Trusted Platform Module) provide for Azure VMs with Trusted Launch?",
    options: [
      "Network traffic encryption between VMs",
      "Secure key storage and measured boot attestation that verifies the boot chain integrity",
      "Automatic OS patching without reboots",
      "DDoS protection at the VM level"
    ],
    correctIndex: 1,
    explanation: "vTPM provides a virtual hardware-based security module that stores cryptographic keys and measures each step of the boot process (UEFI, bootloader, kernel). This attestation data can be verified to ensure the boot chain hasn't been tampered with."
  },
  {
    question: "When should you use a Confidential VM (AMD SEV-SNP) instead of a standard Trusted Launch VM?",
    options: [
      "For all web-facing workloads regardless of data sensitivity",
      "When you need to protect data in use (memory encryption) from the cloud operator and hypervisor",
      "Only for development and testing environments",
      "When you need higher network throughput"
    ],
    correctIndex: 1,
    explanation: "Confidential VMs with AMD SEV-SNP encrypt VM memory so that even the Azure hypervisor and operators cannot access the data being processed. This is required for scenarios where data must be protected in use, not just at rest and in transit."
  },
  {
    question: "A Defender for Cloud alert indicates 'Boot integrity validation failed' on a production VM. What is the correct first response?",
    options: [
      "Immediately reboot the VM to restore integrity",
      "Ignore it — false positives are common after kernel updates",
      "Capture a disk snapshot for forensics, investigate correlated alerts, then determine if it's a legitimate change or compromise",
      "Delete the VM and recreate it from backup"
    ],
    correctIndex: 2,
    explanation: "The correct response is to preserve evidence (disk snapshot), investigate the root cause by checking for correlated security alerts and recent changes (like kernel updates), and then determine if the integrity failure is from a legitimate change or indicates compromise before taking remediation action."
  }
]} />

## Cleanup

```bash
# Delete all VMs and resources
az group delete --name "rg-contoso-vm-security" --yes --no-wait
```
