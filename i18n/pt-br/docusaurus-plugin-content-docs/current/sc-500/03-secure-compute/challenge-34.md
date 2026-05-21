---
sidebar_position: 34
title: "Desafio 34: Azure Arc para Servidores Híbridos/Multicloud & Defender for Servers"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 34: Azure Arc para Servidores Híbridos/Multicloud & Defender for Servers

## Habilidades do exame cobertas

- Integrar servidores híbridos e multicloud ao Azure Arc
- Habilitar e configurar Microsoft Defender for Servers em máquinas conectadas ao Arc
- Implementar avaliação de vulnerabilidades para servidores não-Azure
- Configurar detecção e resposta de endpoint (EDR) via integração com Defender for Endpoint
- Monitorar e remediar recomendações de segurança para servidores habilitados com Arc
- Gerenciar extensões e conformidade para infraestrutura híbrida

## Cenário

A Contoso Ltd opera um ambiente híbrido com 200 servidores em um datacenter local (Windows Server 2019/2022) e 50 servidores no AWS EC2. A equipe de segurança deve trazer todos os servidores para gerenciamento de segurança unificado usando Azure Arc, habilitar proteção contra ameaças via Defender for Servers e garantir varredura de vulnerabilidades consistente e proteção de endpoint em todos os ambientes.

---

## Pré-requisitos

- Assinatura do Azure com acesso de Contributor
- Microsoft Defender for Servers Plan 2 habilitado
- Servidor local com acesso de rede ao Azure (HTTPS 443 saída)
- Azure CLI instalado na estação de trabalho de gerenciamento
- Service principal ou managed identity para integração em escala
- Acesso de administrador local nos servidores alvo

---

## Tarefa 1: Integrar servidores ao Azure Arc

Conecte servidores locais e multicloud ao Azure Arc para gerenciamento unificado.

```bash
# Create resource group for Arc servers
az group create --name "rg-contoso-arc-servers" --location "eastus"

# Generate the onboarding script for a single server (interactive)
az connectedmachine connect \
    --resource-group "rg-contoso-arc-servers" \
    --name "srv-onprem-web01" \
    --location "eastus"

# For at-scale onboarding, create a service principal
az ad sp create-for-rbac \
    --name "sp-arc-onboarding" \
    --role "Azure Connected Machine Onboarding" \
    --scopes "/subscriptions/{sub-id}/resourceGroups/rg-contoso-arc-servers"
```

Gere o script de integração em escala:

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

## Tarefa 2: Verificar conectividade e status dos servidores Arc

Confirme que os servidores estão conectados e saudáveis.

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

## Tarefa 3: Habilitar Defender for Servers em máquinas Arc

Configure o Microsoft Defender for Servers para proteger máquinas conectadas ao Arc.

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

## Tarefa 4: Configurar avaliação de vulnerabilidades

Habilite e revise a varredura de vulnerabilidades para servidores conectados ao Arc.

```bash
# Enable Microsoft Defender Vulnerability Management (MDVM) as the VA solution
az security va sql baseline set \
    --resource-group "rg-contoso-arc-servers"

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

## Tarefa 5: Configurar controles de aplicação adaptáveis e hardening de rede

Aplique controles adaptáveis do Defender for Cloud em servidores conectados ao Arc.

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

## Tarefa 6: Atribuir Azure Policy para conformidade de servidores Arc

Imponha baselines de segurança em servidores conectados ao Arc usando Azure Policy.

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

## Quebre & Conserte

### Cenário 1: Agente Arc mostra status "Disconnected" para múltiplos servidores

Vários servidores locais mostram status "Disconnected" no portal do Azure. Os servidores estão em execução e acessíveis na rede corporativa.

<details>
<summary>Mostrar solução</summary>

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

### Cenário 2: Defender for Endpoint não reporta para servidores Arc apesar da extensão instalada

A extensão MDE mostra "Succeeded" nas máquinas Arc, mas o portal do Defender for Endpoint não mostra dispositivos do ambiente local, e nenhum alerta de segurança é gerado.

<details>
<summary>Mostrar solução</summary>

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

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "O que é necessário para integrar um servidor não-Azure ao Azure Arc em escala sem login interativo?",
    options: [
      "Uma senha de conta de Global Administrator armazenada em cada servidor",
      "Um service principal com a role 'Azure Connected Machine Onboarding' e conectividade HTTPS de saída do servidor",
      "Um túnel VPN de cada servidor diretamente para o portal do Azure",
      "Acesso físico ao datacenter do Azure"
    ],
    correctIndex: 1,
    explanation: "A integração em escala ao Arc usa um service principal (com a role Azure Connected Machine Onboarding) para autenticação não interativa. Os servidores precisam de HTTPS de saída (443) para os endpoints de gerenciamento do Azure — nenhum VPN ou conectividade de entrada é necessário."
  },
  {
    question: "O que o Microsoft Defender for Servers Plan 2 fornece para máquinas conectadas ao Arc que o Plan 1 não fornece?",
    options: [
      "Apenas antivírus básico",
      "Varredura de vulnerabilidades sem agente, acesso JIT, controles de aplicação adaptáveis, monitoramento de integridade de arquivos e hardening de rede",
      "Apenas gerenciamento de regras de firewall",
      "Plan 1 e Plan 2 têm recursos idênticos"
    ],
    correctIndex: 1,
    explanation: "O Plan 2 inclui todos os recursos do Plan 1 (integração com Defender for Endpoint, EDR) mais varredura sem agente, acesso JIT a VMs, controles de aplicação adaptáveis, monitoramento de integridade de arquivos, hardening de rede adaptável e capacidades adicionais de avaliação de vulnerabilidades."
  },
  {
    question: "Um servidor conectado ao Arc mostra status 'Connected' mas o Defender for Cloud não mostra recomendações de segurança para ele. Qual é a causa provável?",
    options: [
      "O SO do servidor não é suportado",
      "O plano Defender for Servers não está habilitado no nível da assinatura, ou o provisionamento automático do agente de monitoramento/extensão está desabilitado",
      "Servidores conectados ao Arc nunca recebem recomendações de segurança",
      "O servidor precisa de um endereço IP público para comunicação com o Defender"
    ],
    correctIndex: 1,
    explanation: "Para o Defender for Cloud gerar recomendações, o plano Defender for Servers deve estar habilitado (tier Standard) E as extensões necessárias (agente Log Analytics ou Azure Monitor Agent, MDE, VA) devem estar implantadas — seja via provisionamento automático ou instalação manual de extensão."
  },
  {
    question: "Como os achados de avaliação de vulnerabilidades devem ser remediados para servidores conectados ao Arc em um datacenter local?",
    options: [
      "Vulnerabilidades só podem ser remediadas migrando o servidor para o Azure",
      "Use Azure Update Management ou patching manual para remediar, acompanhe a conformidade através das recomendações do Defender for Cloud",
      "O Azure aplica patches automaticamente em servidores locais através do Arc",
      "Exclua e recrie o servidor"
    ],
    correctIndex: 1,
    explanation: "O Arc fornece visibilidade e rastreamento de vulnerabilidades, mas a remediação (patching) deve ser realizada usando Azure Update Management, WSUS ou processos de patching manual. O Defender for Cloud acompanha o estado de conformidade e re-escaneia para confirmar a remediação."
  }
]} />

## Limpeza

```bash
# Disconnect Arc servers (run on each server)
# azcmagent disconnect

# Delete resource group with all Arc registrations
az group delete --name "rg-contoso-arc-servers" --yes --no-wait

# Remove service principal
az ad sp delete --id "sp-arc-onboarding-app-id"
```
