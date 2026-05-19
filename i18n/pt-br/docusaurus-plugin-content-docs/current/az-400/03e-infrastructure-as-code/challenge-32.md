---
sidebar_position: 2
title: "Desafio 32: Configuração de estado desejado"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 32: Configuração de estado desejado

:::info Plataforma: ADO-first
Este desafio foca em Azure DevOps Pipelines. Equivalentes no GitHub Actions são mencionados quando relevante.
:::

## Habilidades do exame mapeadas

- Projetar e implementar configuração de estado desejado para ambientes, incluindo Azure Automation State Configuration, Azure Resource Manager, Bicep e Azure Machine Configuration

## Cenário

A Contoso Ltd opera 50 VMs Windows Server e 20 VMs Linux em seu ambiente Azure. Essas máquinas hospedam aplicações de linha de negócios e devem manter configurações de segurança consistentes:

- TLS 1.2 obrigatório (TLS 1.0/1.1 desabilitado)
- Windows Firewall habilitado com regras específicas
- Software obrigatório instalado (agente de monitoramento, definições de antivírus)
- Software proibido removido (clientes FTP legados, ferramentas de acesso remoto não autorizadas)
- Políticas de senha aplicadas (comprimento mínimo 14, complexidade habilitada)
- Registro de auditoria configurado

A equipe de operações frequentemente realiza alterações ad-hoc para resolver incidentes, criando desvio de conformidade. A equipe de segurança reporta que 40% das VMs falham na verificação mensal de conformidade. A Contoso precisa de aplicação automatizada de estado desejado com visibilidade na postura de conformidade.

## Tarefa 1: Configurar Azure Machine Configuration (anteriormente Guest Configuration)

O Azure Machine Configuration usa Azure Policy para auditar e aplicar configurações dentro das VMs. Configure os pré-requisitos:

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

Verifique se o agente de Machine Configuration está funcionando:

```bash
# Check guest assignment compliance for a specific VM
az rest --method GET \
  --url "https://management.azure.com/subscriptions/{sub-id}/resourceGroups/rg-contoso-vms/providers/Microsoft.Compute/virtualMachines/vm-contoso-web-01/providers/Microsoft.GuestConfiguration/guestConfigurationAssignments?api-version=2022-01-25"
```

## Tarefa 2: Criar um pacote personalizado de Machine Configuration

Crie uma configuração personalizada para aplicar a baseline de segurança da Contoso:

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

Teste o pacote localmente antes de publicar:

```powershell
# Test the configuration package locally
$result = Test-GuestConfigurationPackage `
    -Path './ContosoSecurityBaseline/ContosoSecurityBaseline.zip'

$result.resources | Format-Table ResourceName, InDesiredState, Reasons
```

## Tarefa 3: Publicar e atribuir configuração via Azure Policy

Faça upload do pacote para o Azure Storage e crie uma definição de política:

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

## Tarefa 4: Monitorar status de conformidade

Consulte e visualize a conformidade em toda a frota de VMs:

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

Crie uma consulta de workbook do Azure Monitor para o painel de conformidade:

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

## Tarefa 5: Visão geral do Azure Automation State Configuration (DSC)

Para VMs que precisam de configuração baseada em pull (abordagem legada, sendo substituída pelo Machine Configuration):

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

## Tarefa 6: Tarefas de remediação para recursos não conformes

Configure remediação automática quando a política detectar não-conformidade:

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

Para remediação agendada, use um Runbook do Azure Automation:

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

## Tarefa 7: Integração com CI/CD (deploy de pacotes de configuração via pipeline)

Crie um pipeline do Azure Pipelines para compilar, testar e publicar pacotes de configuração:

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

## Exercícios de quebra e conserto

### Exercício 1: Corrigir o Machine Configuration que não reporta

Uma VM mostra status de conformidade "Pending" por 24 horas após a atribuição da política. Diagnostique:

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
<summary>Mostrar solução</summary>

**Correção:**

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

### Exercício 2: Corrigir o pacote de configuração DSC com defeito

O pipeline compila com sucesso, mas a política mostra todas as VMs como conformes quando claramente não estão. O problema está na configuração:

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
<summary>Mostrar solução</summary>

**Correção:**

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
## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a diferença entre os modos \"Audit\" e \"ApplyAndAutoCorrect\" do Azure Machine Configuration?",
    options: [
      "Audit faz deploy de recursos; ApplyAndAutoCorrect exclui recursos não conformes",
      "Audit apenas reporta o status de conformidade; ApplyAndAutoCorrect reporta e remedia drift automaticamente",
      "Audit executa uma vez; ApplyAndAutoCorrect executa em um agendamento",
      "Audit funciona apenas no Windows; ApplyAndAutoCorrect funciona em múltiplas plataformas"
    ],
    correctIndex: 1,
    explanation: "No modo Audit, o Machine Configuration avalia a VM e reporta se ela está conforme ou não-conforme, mas não toma nenhuma ação corretiva. No modo ApplyAndAutoCorrect, ele tanto reporta a conformidade quanto remedia drift ativamente reaplicando a configuração desejada em cada ciclo de avaliação (a cada 15 minutos por padrão)."
  },
  {
    question: "Qual pré-requisito uma VM deve ter antes que o Azure Machine Configuration possa avaliá-la?",
    options: [
      "A VM deve estar ingressada no domínio Azure AD",
      "A VM deve ter uma identidade gerenciada atribuída pelo sistema e a extensão Guest Configuration",
      "A VM deve estar executando Windows Server 2019 ou posterior",
      "A VM deve ter o Azure Monitor Agent instalado"
    ],
    correctIndex: 1,
    explanation: "O Azure Machine Configuration requer duas coisas na VM alvo: uma identidade gerenciada atribuída pelo sistema (para autenticação nos serviços Azure) e a extensão Guest Configuration (AzurePolicyforWindows ou AzurePolicyforLinux) que executa o agente de avaliação de configuração dentro da VM."
  },
  {
    question: "Como o Azure Policy se integra com o Machine Configuration para aplicação em escala?",
    options: [
      "O Azure Policy modifica diretamente as configurações da VM sem nenhum agente",
      "O Azure Policy faz deploy de uma Azure Function que se conecta às VMs via SSH/WinRM",
      "O Azure Policy atribui definições de guest configuration que o agente dentro da VM avalia e reporta",
      "O Azure Policy dispara runbooks do Azure Automation que aplicam configurações DSC"
    ],
    correctIndex: 2,
    explanation: "O Azure Policy atua como a camada de orquestração. Quando uma política de Machine Configuration é atribuída, ela garante que as VMs alvo tenham a identidade e extensão necessárias, e então cria atribuições de guest configuration. O agente dentro da VM busca essas atribuições, avalia a configuração e reporta o status de conformidade de volta ao Azure Policy."
  },
  {
    question: "Qual é a abordagem recomendada para versionamento de pacotes de Machine Configuration em um pipeline CI/CD?",
    options: [
      "Sobrescrever o mesmo blob no storage a cada deploy",
      "Usar números de build no nome do blob e atualizar a definição da política para referenciar a nova URI",
      "Armazenar todas as versões localmente na VM e referenciá-las por caminho",
      "Usar exclusivamente o versionamento do pull server do Azure Automation DSC"
    ],
    correctIndex: 1,
    explanation: "Cada build deve produzir um pacote com nome único (usando número do build ou versão), fazer upload para um novo blob e atualizar a URI de conteúdo da definição da política. Isso permite rollback (apontar a política de volta para uma versão anterior), rastro de auditoria (qual versão foi implantada quando) e rollout progressivo seguro (atribuir nova versão ao dev primeiro, depois produção)."
  }
]} />

## Limpeza

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
