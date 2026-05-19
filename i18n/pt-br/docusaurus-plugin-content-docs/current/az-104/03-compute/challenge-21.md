---
sidebar_position: 21
title: "Desafio 21: Extensões de VM & Automação"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 21: extensões de VM & automação

:::info Tempo Estimado e Custo

**60-75 minutos** | **Custo estimado**: ~$2,00 (VM + Automation Account) | **Peso no Exame: 15-20%**


:::
## Cenário

A Contoso Ltd. tem uma frota de 50 VMs distribuídas em ambientes de desenvolvimento, staging e produção. A equipe de operações está cansada de fazer SSH manualmente em cada VM para instalar agentes de monitoramento, configurar software e executar scripts de manutenção. Toda vez que uma nova VM é provisionada, alguém esquece uma etapa de configuração, levando a inconsistências. Você foi encarregado de automatizar a configuração pós-implantação usando extensões de VM, Custom Script Extension, Run Command e Azure Automation.

## Habilidades do exame cobertas

| Habilidade | Peso |
|------------|------|
| Configurar extensões de VM | Alto |
| Usar Custom Script Extension para configuração pós-implantação | Alto |
| Usar Run Command para operações ad-hoc em VMs | Médio |
| Configurar contas do Azure Automation | Médio |
| Criar e gerenciar runbooks | Médio |
| Configurar extensão de diagnóstico de VM | Médio |

## Referência sysadmin ↔ Azure

| On-Prem / Sysadmin | Equivalente Azure | Notas |
|---------------------|-------------------|-------|
| Scripts pós-instalação (kickstart, cloud-init) | Custom Script Extension | Executa uma vez após deploy da VM |
| SSH no servidor para executar comandos | Run Command | Sem necessidade de sessão SSH/RDP |
| Agente Puppet/Chef/Ansible | Extensões de VM | Configuração baseada em agente |
| Cron job para manutenção | Runbooks do Azure Automation | Agendado ou orientado a eventos |
| Task Scheduler (Windows) | Agendamentos do Automation | Tarefas recorrentes |
| Agente de monitoramento Nagios/SNMP | Extensão de diagnóstico | Coleta de métricas e logs |
| CMDB (Configuration Management DB) | Automation State Configuration (DSC) | Imposição de estado desejado |

## Tarefas

### Tarefa 1: criar o ambiente do laboratório

```bash
# Criar grupo de recursos
az group create --name rg-automation-lab --location eastus

# Criar uma VM Linux
az vm create \
  --name vm-linux-auto \
  --resource-group rg-automation-lab \
  --image Ubuntu2404 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --tags Environment=Development Department=IT

# Criar uma VM Windows
az vm create \
  --name vm-win-auto \
  --resource-group rg-automation-lab \
  --image Win2022Datacenter \
  --size Standard_B2s \
  --admin-username azureuser \
  --admin-password "P@ssw0rd2024!" \
  --tags Environment=Development Department=IT
```

### Tarefa 2: implantar custom script extension (Linux)

Instale o Nginx na VM Linux usando a Custom Script Extension:

```bash
# Implantar custom script extension para instalar nginx
az vm extension set \
  --resource-group rg-automation-lab \
  --vm-name vm-linux-auto \
  --name customScript \
  --publisher Microsoft.Azure.Extensions \
  --version 2.1 \
  --settings '{
    "commandToExecute": "apt-get update && apt-get install -y nginx && systemctl enable nginx && systemctl start nginx && echo \"<h1>Configured by Custom Script Extension</h1>\" > /var/www/html/index.html"
  }'

# Verificar o status da extensão
az vm extension show \
  --resource-group rg-automation-lab \
  --vm-name vm-linux-auto \
  --name customScript \
  --query "{Name:name, Status:provisioningState, Publisher:publisher}" -o table
```

### Tarefa 3: implantar custom script extension (Windows)

Instale o IIS na VM Windows usando Custom Script Extension:

```bash
# Implantar custom script extension para Windows
az vm extension set \
  --resource-group rg-automation-lab \
  --vm-name vm-win-auto \
  --name CustomScriptExtension \
  --publisher Microsoft.Compute \
  --version 1.10 \
  --settings '{
    "commandToExecute": "powershell.exe -Command \"Install-WindowsFeature -name Web-Server -IncludeManagementTools; Set-Content -Path C:\\inetpub\\wwwroot\\index.html -Value \\\"<h1>Configured by Custom Script Extension</h1>\\\"\""
  }'

# Verificar status da extensão
az vm extension show \
  --resource-group rg-automation-lab \
  --vm-name vm-win-auto \
  --name CustomScriptExtension \
  --query "{Name:name, Status:provisioningState}" -o table
```

### Tarefa 4: usar custom script extension com script externo

Hospede um script de configuração em uma conta de armazenamento e referencie-o:

```bash
# Criar uma conta de armazenamento para scripts
az storage account create \
  --name stscripts$RANDOM \
  --resource-group rg-automation-lab \
  --location eastus \
  --sku Standard_LRS

SCRIPT_ACCOUNT=$(az storage account list -g rg-automation-lab --query "[?contains(name,'script')].name" -o tsv | head -1)

# Criar um contêiner
az storage container create \
  --name scripts \
  --account-name $SCRIPT_ACCOUNT \
  --auth-mode login

# Criar um script de configuração
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

# Enviar o script
az storage blob upload \
  --container-name scripts \
  --file configure-vm.sh \
  --name configure-vm.sh \
  --account-name $SCRIPT_ACCOUNT \
  --auth-mode login

# Gerar URL SAS para o script
SCRIPT_URL="https://$SCRIPT_ACCOUNT.blob.core.windows.net/scripts/configure-vm.sh"
SCRIPT_SAS=$(az storage blob generate-sas \
  --account-name $SCRIPT_ACCOUNT \
  --container-name scripts \
  --name configure-vm.sh \
  --permissions r \
  --expiry $(date -u -d "+1 hour" +%Y-%m-%dT%H:%MZ) \
  -o tsv)

# Remover extensão existente antes de reimplantar
az vm extension delete \
  --resource-group rg-automation-lab \
  --vm-name vm-linux-auto \
  --name customScript

# Implantar com referência a script externo
az vm extension set \
  --resource-group rg-automation-lab \
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

### Tarefa 5: usar run command para operações Ad-Hoc

Execute comandos em VMs sem acesso SSH/RDP:

```bash
# Linux: verificar espaço em disco
az vm run-command invoke \
  --resource-group rg-automation-lab \
  --name vm-linux-auto \
  --command-id RunShellScript \
  --scripts "df -h && echo '---' && free -m && echo '---' && uptime"

# Linux: verificar se o nginx está rodando
az vm run-command invoke \
  --resource-group rg-automation-lab \
  --name vm-linux-auto \
  --command-id RunShellScript \
  --scripts "systemctl status nginx --no-pager"

# Windows: obter informações do sistema
az vm run-command invoke \
  --resource-group rg-automation-lab \
  --name vm-win-auto \
  --command-id RunPowerShellScript \
  --scripts "Get-ComputerInfo | Select-Object WindowsProductName, OsArchitecture, CsProcessors, OsTotalVisibleMemorySize"

# Windows: verificar status do IIS
az vm run-command invoke \
  --resource-group rg-automation-lab \
  --name vm-win-auto \
  --command-id RunPowerShellScript \
  --scripts "Get-Service W3SVC | Format-Table Name, Status, StartType"
```

### Tarefa 6: listar e gerenciar extensões de VM

```bash
# Listar todas as extensões em uma VM
az vm extension list \
  --resource-group rg-automation-lab \
  --vm-name vm-linux-auto \
  --query "[].{Name:name, Publisher:publisher, Version:typeHandlerVersion, State:provisioningState}" -o table

# Listar tipos de extensões disponíveis
az vm extension image list \
  --location eastus \
  --publisher Microsoft.Azure.Extensions \
  --query "[].{Name:name, Publisher:publisher}" -o table --latest
```

### Tarefa 7: criar uma conta do Azure automation

```bash
# Criar conta do automation
az automation account create \
  --name auto-contoso-ops \
  --resource-group rg-automation-lab \
  --location eastus

# Verificar a conta
az automation account show \
  --name auto-contoso-ops \
  --resource-group rg-automation-lab \
  --query "{Name:name, State:state, Location:location}" -o table
```

### Tarefa 8: criar um runbook para Iniciar/Parar VMs

```bash
# Criar um runbook PowerShell
az automation runbook create \
  --resource-group rg-automation-lab \
  --automation-account-name auto-contoso-ops \
  --name "Stop-DevVMs" \
  --type PowerShell \
  --description "Stop all development VMs to save costs after business hours"

# Criar o conteúdo do script do runbook
cat > stop-dev-vms.ps1 << 'EOF'
<#
.SYNOPSIS
    Stops all VMs tagged with Environment=Development
.DESCRIPTION
    This runbook finds all VMs with the Development tag and stops them.
    Used for cost savings outside business hours.
#>

param(
    [string]$ResourceGroupName = "rg-automation-lab",
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

# Enviar o conteúdo do runbook
az automation runbook replace-content \
  --resource-group rg-automation-lab \
  --automation-account-name auto-contoso-ops \
  --name "Stop-DevVMs" \
  --content @stop-dev-vms.ps1

# Publicar o runbook
az automation runbook publish \
  --resource-group rg-automation-lab \
  --automation-account-name auto-contoso-ops \
  --name "Stop-DevVMs"

rm -f stop-dev-vms.ps1
```

### Tarefa 9: agendar o runbook

```bash
# Criar um agendamento (dias úteis às 19h)
az automation schedule create \
  --resource-group rg-automation-lab \
  --automation-account-name auto-contoso-ops \
  --name "weekday-evening-shutdown" \
  --frequency Day \
  --interval 1 \
  --start-time "2024-01-01T19:00:00-05:00" \
  --description "Runs every weekday at 7 PM ET to stop dev VMs"

# Vincular o agendamento ao runbook
az automation job-schedule create \
  --resource-group rg-automation-lab \
  --automation-account-name auto-contoso-ops \
  --runbook-name "Stop-DevVMs" \
  --schedule-name "weekday-evening-shutdown"
```

## Critérios de sucesso

<SuccessChecklist
  storageKey="az104-challenge-21"
  items={[
    "Custom Script Extension instala Nginx na VM Linux",
    "Custom Script Extension instala IIS na VM Windows",
    "Script externo da conta de armazenamento executado via Custom Script Extension",
    "Run Command executa comandos ad-hoc com sucesso em ambas as VMs",
    "Todas as extensões instaladas são visíveis via az vm extension list",
    "Conta do Azure Automation existe com um runbook publicado",
    "Runbook está vinculado a um agendamento diário",
    "Lógica do runbook identifica corretamente VMs por tag"
  ]}
/>
## Dicas

<details>
<summary>Dica 1: Apenas uma Custom Script Extension por vez</summary>

Uma VM só pode ter uma instância da Custom Script Extension instalada por vez. Para executar um novo script, você deve primeiro remover a extensão existente e depois definir a nova. Alternativamente, use Run Command para scripts ad-hoc sem gerenciar o ciclo de vida da extensão.

</details>

<details>
<summary>Dica 2: Timeout de execução da extensão</summary>

A Custom Script Extension tem um timeout padrão de 90 minutos. Para scripts que demoram mais, use a configuração `--timeout`. Se a extensão mostrar estado "Transitioning" por muito tempo, verifique o log da extensão dentro da VM em `/var/log/azure/custom-script/handler.log` (Linux) ou `C:\WindowsAzure\Logs\Plugins\Microsoft.Compute.CustomScriptExtension` (Windows).

</details>

<details>
<summary>Dica 3: Run Command vs Custom Script Extension</summary>

- **Custom Script Extension**: Melhor para configuração pós-implantação, executa uma vez (ou quando atualizada), persiste como parte da configuração da VM
- **Run Command**: Melhor para operações ad-hoc, não persiste, cada invocação é independente

Use extensões para configuração repetível e Run Command para troubleshooting ou tarefas pontuais.

</details>

<details>
<summary>Dica 4: Identidade da Conta do Automation</summary>

Para o runbook gerenciar recursos do Azure, a Conta do Automation precisa de uma identidade gerenciada (atribuída pelo sistema ou pelo usuário) com funções RBAC apropriadas. Atribua a função "Virtual Machine Contributor" para permitir que o runbook inicie/pare VMs.

</details>

## Quebrar & consertar

### Cenário a: extensão falha ao instalar

Implante uma Custom Script Extension com um erro intencional (ex: referenciando uma URL de arquivo inexistente). Verifique o status da extensão e diagnostique a falha:

```bash
# Verificar estado de provisionamento da extensão
az vm extension show \
  --resource-group rg-automation-lab \
  --vm-name vm-linux-auto \
  --name customScript \
  --query "{Status:provisioningState, Message:instanceView.statuses[0].message}"

# Usar run command para verificar logs da extensão
az vm run-command invoke \
  --resource-group rg-automation-lab \
  --name vm-linux-auto \
  --command-id RunShellScript \
  --scripts "cat /var/log/azure/custom-script/handler.log | tail -20"
```

### Cenário b: timeout do run command

Execute um script Run Command que dorme por 5 minutos. O que acontece quando o timeout padrão é excedido? Como você lida com operações de longa duração?

### Cenário c: falha de autenticação do runbook

Crie um runbook que tenta acessar recursos, mas a identidade gerenciada da Conta do Automation não tem atribuição RBAC. Observe o erro na saída do job e diagnostique as permissões ausentes.

## Verificação de conhecimento

<details>
<summary>1. Quantas Custom Script Extensions podem executar simultaneamente em uma VM?</summary>

Apenas **uma** Custom Script Extension pode ser instalada em uma VM por vez. Se você precisa executar um novo script, deve remover a extensão existente primeiro, depois instalar a nova. Alternativamente, atualize a extensão com novas configurações (o que dispara uma re-execução). Para múltiplos scripts, combine-os em um único script wrapper.

</details>

<details>
<summary>2. Qual é a diferença entre Run Command e Custom Script Extension?</summary>

**Custom Script Extension**: É uma extensão que persiste na VM. Executa durante o provisionamento ou quando atualizada. Melhor para configuração inicial. A saída é armazenada nos logs da extensão na VM.

**Run Command**: É uma invocação baseada em API que não instala nada na VM. Usa o agente de VM existente para executar scripts. Melhor para troubleshooting ad-hoc. A saída é retornada diretamente na resposta da API.

</details>

<details>
<summary>3. Qual método de autenticação os runbooks do Azure Automation devem usar?</summary>

A melhor prática moderna é usar **Identidade Gerenciada** (atribuída pelo sistema ou pelo usuário) para a Conta do Automation. A antiga "Run As Account" (service principal com certificado) está descontinuada. Identidades gerenciadas requerem atribuições de função RBAC apropriadas nos recursos alvo.

</details>

<details>
<summary>4. Onde ficam armazenados os logs da Custom Script Extension em uma VM Linux?</summary>

Logs de extensão no Linux ficam em:
- Log do handler: `/var/log/azure/custom-script/handler.log`
- Saída do script: `/var/lib/waagent/custom-script/download/0/stdout` e `stderr`

No Windows:
- `C:\WindowsAzure\Logs\Plugins\Microsoft.Compute.CustomScriptExtension\<version>\`
- Saída do script: `C:\Packages\Plugins\Microsoft.Compute.CustomScriptExtension\<version>\Downloads\`

</details>

## Limpeza

```bash
# Excluir a conta do automation
az automation account delete \
  --name auto-contoso-ops \
  --resource-group rg-automation-lab \
  --yes

# Excluir o grupo de recursos (VMs, armazenamento, extensões)
az group delete --name rg-automation-lab --yes --no-wait

echo "Limpeza concluída."
```

## Recursos de aprendizagem

- [Visão geral de extensões de VM](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/overview)
- [Custom Script Extension para Linux](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-linux)
- [Custom Script Extension para Windows](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-windows)
- [Run Command em VMs do Azure](https://learn.microsoft.com/en-us/azure/virtual-machines/run-command-overview)
- [Visão geral do Azure Automation](https://learn.microsoft.com/en-us/azure/automation/overview)
- [Criar e gerenciar runbooks](https://learn.microsoft.com/en-us/azure/automation/manage-runbooks)
