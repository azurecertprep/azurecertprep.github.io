---
sidebar_position: 35
title: "Desafio 35: Varredura Agentless e Aplicação de Machine Configuration"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 35: Varredura Agentless e Aplicação de Machine Configuration

## Habilidades do exame cobertas

- Configurar agentless scanning no Defender for Cloud (CSPM e Servers)
- Implementar políticas de Azure Machine Configuration (anteriormente Guest Configuration)
- Aplicar baselines de segurança no nível do SO sem implantar agentes
- Monitorar conformidade de Machine Configuration e remediar desvios
- Configurar políticas personalizadas de Machine Configuration para requisitos regulatórios

## Cenário

A Contoso Ltd possui mais de 500 VMs no Azure e 200 servidores conectados via Arc. A equipe de operações não pode instalar agentes adicionais nos servidores de produção devido a restrições de gerenciamento de mudanças. A equipe de segurança precisa de varredura de vulnerabilidades agentless e aplicação de conformidade no nível do SO usando políticas de Machine Configuration para verificar se os servidores atendem aos benchmarks CIS e baselines de segurança internos sem implantar agentes de monitoramento tradicionais.

---

## Pré-requisitos

- Assinatura Azure com acesso de Contributor
- Microsoft Defender CSPM habilitado (para agentless scanning)
- Microsoft Defender for Servers Plan 2 (para VA agentless)
- VMs Azure ou máquinas conectadas via Arc
- Role de Azure Policy Contributor
- Azure CLI instalado

---

## Tarefa 1: Habilitar agentless scanning no Defender for Cloud

Configure o agentless scanning para avaliação de vulnerabilidades e inventário de software sem implantar agentes.

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

Configure o escopo da varredura:

1. Navegue até **Defender for Cloud** → **Environment settings** → Selecione a assinatura
2. Em **Defender plans** → **Servers** → Clique em **Settings**
3. Verifique se **Agentless scanning for machines** está habilitado
4. Configure as opções de varredura:
   - **Scanning frequency**: A cada 24 horas
   - **Disk snapshot location**: Mesma região da VM
   - **Exclusion tags**: `SkipAgentlessScan=true` (para exceções)

---

## Tarefa 2: Revisar resultados do agentless scanning

Examine as descobertas de vulnerabilidades e o inventário de software encontrados sem agentes.

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

## Tarefa 3: Implantar a extensão Azure Machine Configuration

Instale a extensão Machine Configuration para avaliação de conformidade no nível do SO.

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

## Tarefa 4: Atribuir políticas integradas de Machine Configuration

Aplique políticas de baseline de segurança para impor configurações no nível do SO.

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

## Tarefa 5: Criar uma política personalizada de Machine Configuration

Crie uma política personalizada para impor configurações de segurança específicas da organização.

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

## Tarefa 6: Monitorar conformidade e remediar desvios de configuração

Acompanhe a conformidade de Machine Configuration e configure alertas para desvios.

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

# Create an alert for non-compliant machines
az monitor metrics alert create \
    --name "machine-config-drift-alert" \
    --resource-group "rg-contoso-machine-config" \
    --scopes "/subscriptions/{sub-id}" \
    --condition "total NonCompliantResources > 5" \
    --description "Alert when more than 5 machines drift from security baseline" \
    --window-size "PT1H" \
    --evaluation-frequency "PT15M"
```

---

## Quebra & conserta

### Cenário 1: Agentless scanning não descobre vulnerabilidades em VMs específicas

O agentless scanning funciona para a maioria das VMs, mas reporta "No vulnerabilities found" para um conjunto de VMs de produção que são conhecidas por terem software não atualizado.

<details>
<summary>Mostrar solução</summary>

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

### Cenário 2: Machine Configuration mostra status "Pending" indefinidamente

As atribuições de Machine Configuration mostram status de conformidade "Pending" e nunca mudam para Compliant ou NonCompliant, mesmo após 48 horas.

<details>
<summary>Mostrar solução</summary>

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

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Como o agentless scanning no Defender for Cloud descobre vulnerabilidades sem instalar um agente na VM?",
    options: [
      "Ele varre o tráfego de rede para detectar serviços vulneráveis",
      "Ele tira um snapshot do disco do SO da VM, analisa-o em um ambiente separado e reporta as descobertas sem tocar na VM em execução",
      "Ele usa o Azure Fabric Controller para inspecionar a memória da VM",
      "Ele requer acesso temporário via SSH/RDP a cada VM"
    ],
    correctIndex: 1,
    explanation: "O agentless scanning cria um snapshot temporário do disco do SO da VM, copia-o para um ambiente seguro de varredura, analisa pacotes instalados e configurações em busca de vulnerabilidades conhecidas, e reporta as descobertas — tudo sem instalar nada ou se conectar à VM em execução."
  },
  {
    question: "Qual é a diferença entre os modos 'Audit' e 'ApplyAndAutoCorrect' no Azure Machine Configuration?",
    options: [
      "O modo Audit requer um agente, mas o ApplyAndAutoCorrect não",
      "O modo Audit apenas reporta o status de conformidade, enquanto o ApplyAndAutoCorrect remedia automaticamente configurações não conformes para o estado desejado",
      "Eles são iguais — ambos apenas auditam",
      "O ApplyAndAutoCorrect requer reinicialização da VM após cada correção"
    ],
    correctIndex: 1,
    explanation: "O modo Audit apenas verifica e reporta se a configuração de uma máquina corresponde ao estado desejado. O ApplyAndAutoCorrect altera ativamente a configuração da máquina para corresponder ao estado desejado quando um desvio é detectado, remediando automaticamente a não conformidade."
  },
  {
    question: "Quais pré-requisitos uma VM deve ter para que o Azure Machine Configuration avalie a conformidade?",
    options: [
      "Apenas um endereço IP público é necessário",
      "Uma managed identity atribuída pelo sistema e a extensão Machine Configuration instalada",
      "Associação ao Azure AD Domain Services",
      "Um agente Log Analytics e um agente de Dependência"
    ],
    correctIndex: 1,
    explanation: "O Machine Configuration requer dois componentes: uma managed identity atribuída pelo sistema (para autenticação no Azure) e a extensão de VM Machine Configuration (agente GuestConfiguration). A VM também precisa de conectividade HTTPS de saída para o Azure."
  },
  {
    question: "Quais VMs o agentless scanning NÃO consegue avaliar em busca de vulnerabilidades?",
    options: [
      "VMs sem endereço IP público",
      "VMs em diferentes regiões Azure",
      "VMs com discos do SO criptografados usando chaves gerenciadas pelo cliente onde o scanner não tem acesso ao Key Vault",
      "VMs executando Windows Server 2022"
    ],
    correctIndex: 2,
    explanation: "O agentless scanning precisa ler snapshots de disco. Se o disco do SO de uma VM está criptografado com CMK e a identidade de varredura não tem acesso ao Key Vault que hospeda as chaves de criptografia, ele não pode descriptografar e analisar o conteúdo do disco."
  }
]} />

## Limpeza

```bash
# Remove policy assignments
az policy assignment delete --name "audit-linux-passwd-permissions"
az policy assignment delete --name "windows-security-baseline"
az policy assignment delete --name "linux-security-baseline"
az policy assignment delete --name "config-windows-timezone"

# Delete resource group
az group delete --name "rg-contoso-machine-config" --yes --no-wait
```
