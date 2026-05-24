---
sidebar_position: 32
title: "Desafio 32: Segurança de VM – Criptografia de Disco & Secure Boot (vTPM, Monitoramento de Integridade)"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 32: Segurança de VM – Criptografia de Disco & Secure Boot (vTPM, Monitoramento de Integridade)

## Habilidades do exame cobertas

- Configurar Azure Disk Encryption (ADE) e criptografia do lado do servidor com chaves gerenciadas pelo cliente
- Habilitar Trusted Launch com vTPM e Secure Boot para VMs do Azure
- Implementar monitoramento de integridade de boot e atestação
- Configurar VMs de computação confidencial com memória criptografada
- Monitorar conformidade de criptografia de disco e remediar VMs não conformes

## Cenário

A equipe de conformidade da Contoso Ltd determinou que todas as VMs do Azure devem implementar proteção de disco em camadas (defense-in-depth) e integridade de boot verificada. Novos requisitos regulatórios (PCI-DSS 4.0 e NIST 800-53) exigem criptografia em repouso com chaves gerenciadas pelo cliente, verificação de secure boot e atestação de integridade em tempo de execução. Várias VMs legadas atualmente usam chaves gerenciadas pela plataforma e não possuem recursos de Trusted Launch.

---

## Pré-requisitos

- Assinatura do Azure com acesso de Contributor
- Azure Key Vault com políticas de acesso apropriadas
- Azure CLI instalado
- Compreensão das gerações de VMs do Azure (Gen1 vs Gen2)
- Defender for Cloud habilitado

---

## Tarefa 1: Criar uma VM com Trusted Launch, Secure Boot e vTPM

Implante uma VM Gen2 com todos os recursos de segurança Trusted Launch habilitados.

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

## Tarefa 2: Habilitar monitoramento de integridade de boot

Configure a extensão Guest Attestation e o monitoramento de integridade para VMs com Trusted Launch.

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

Habilite o monitoramento de integridade de boot no Defender for Cloud:

1. Navegue até **Defender for Cloud** → **Environment settings** → Selecione a assinatura
2. Em **Defender plans** → **Servers** → **Settings**
3. Habilite **Boot integrity monitoring**
4. Isso alerta automaticamente se:
   - As chaves do Secure Boot forem modificadas
   - A cadeia de boot for adulterada
   - Módulos de kernel não assinados forem carregados

---

## Tarefa 3: Configurar Azure Disk Encryption com chaves gerenciadas pelo cliente

Configure a criptografia usando chaves gerenciadas pelo cliente (CMK) armazenadas no Azure Key Vault.

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

## Tarefa 4: Aplicar criptografia de disco em VMs existentes

Habilite Azure Disk Encryption em VMs existentes e configure novas VMs para usar o Disk Encryption Set.

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

## Tarefa 5: Habilitar capacidades de Confidential VM

Implante uma VM confidencial com memória criptografada (AMD SEV-SNP) para as cargas de trabalho mais sensíveis.

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

## Tarefa 6: Monitorar conformidade de criptografia com Azure Policy

Crie e atribua políticas para impor criptografia de disco em todas as VMs.

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

## Quebra & conserta

### Cenário 1: Azure Disk Encryption falha com erro "KeyVault access denied"

Uma tentativa de habilitar ADE em uma VM de produção falha com o erro: "Key Vault operation failed. Key Vault is returning 403 Forbidden."

<details>
<summary>Mostrar solução</summary>

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

### Cenário 2: Monitoramento de integridade de boot reporta "Secure Boot validation failed"

O Defender for Cloud gera um alerta: "Boot integrity monitoring detected that Secure Boot validation failed" em uma VM de produção. A VM está em execução, mas pode estar comprometida.

<details>
<summary>Mostrar solução</summary>

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

### Cenário 3: Confidential VM falha ao implantar com erro "UnsupportedSecurityType"

A tentativa de criar uma Confidential VM retorna o erro: "The requested VM size does not support the requested security type ConfidentialVM."

<details>
<summary>Mostrar solução</summary>

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

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a diferença entre Azure Disk Encryption (ADE) e criptografia do lado do servidor com chaves gerenciadas pelo cliente (SSE+CMK)?",
    options: [
      "ADE criptografa no nível do sistema operacional convidado usando BitLocker/DM-Crypt, enquanto SSE+CMK criptografa no nível da infraestrutura de armazenamento com CMK no Key Vault",
      "ADE é gratuito e SSE+CMK requer uma licença premium",
      "ADE criptografa apenas discos do SO enquanto SSE+CMK criptografa todos os discos",
      "Eles são idênticos — apenas nomes diferentes para o mesmo recurso"
    ],
    correctIndex: 0,
    explanation: "ADE usa BitLocker (Windows) ou DM-Crypt (Linux) para criptografar dentro do sistema operacional convidado, fornecendo defesa contra roubo de disco offline. SSE+CMK criptografa na camada de plataforma do Azure Storage usando chaves gerenciadas pelo cliente no Key Vault, fornecendo criptografia com controle de chave pelo cliente no nível de infraestrutura."
  },
  {
    question: "O que o vTPM (virtual Trusted Platform Module) fornece para VMs do Azure com Trusted Launch?",
    options: [
      "Criptografia de tráfego de rede entre VMs",
      "Armazenamento seguro de chaves e atestação de boot medido que verifica a integridade da cadeia de boot",
      "Patch automático do SO sem reinicializações",
      "Proteção DDoS no nível da VM"
    ],
    correctIndex: 1,
    explanation: "O vTPM fornece um módulo de segurança virtual baseado em hardware que armazena chaves criptográficas e mede cada etapa do processo de boot (UEFI, bootloader, kernel). Esses dados de atestação podem ser verificados para garantir que a cadeia de boot não foi adulterada."
  },
  {
    question: "Quando você deve usar uma Confidential VM (AMD SEV-SNP) em vez de uma VM padrão com Trusted Launch?",
    options: [
      "Para todas as cargas de trabalho voltadas para a web, independentemente da sensibilidade dos dados",
      "Quando você precisa proteger dados em uso (criptografia de memória) do operador de nuvem e do hypervisor",
      "Apenas para ambientes de desenvolvimento e teste",
      "Quando você precisa de maior throughput de rede"
    ],
    correctIndex: 1,
    explanation: "VMs Confidenciais com AMD SEV-SNP criptografam a memória da VM para que nem o hypervisor do Azure nem os operadores possam acessar os dados sendo processados. Isso é necessário para cenários onde os dados devem ser protegidos em uso, não apenas em repouso e em trânsito."
  },
  {
    question: "Um alerta do Defender for Cloud indica 'Boot integrity validation failed' em uma VM de produção. Qual é a primeira resposta correta?",
    options: [
      "Reiniciar imediatamente a VM para restaurar a integridade",
      "Ignorar — falsos positivos são comuns após atualizações de kernel",
      "Capturar um snapshot do disco para forense, investigar alertas correlacionados e então determinar se é uma mudança legítima ou comprometimento",
      "Excluir a VM e recriá-la a partir do backup"
    ],
    correctIndex: 2,
    explanation: "A resposta correta é preservar evidências (snapshot do disco), investigar a causa raiz verificando alertas de segurança correlacionados e mudanças recentes (como atualizações de kernel), e então determinar se a falha de integridade é de uma mudança legítima ou indica comprometimento antes de tomar ação de remediação."
  }
]} />

## Limpeza

```bash
# Delete all VMs and resources
az group delete --name "rg-contoso-vm-security" --yes --no-wait
```
