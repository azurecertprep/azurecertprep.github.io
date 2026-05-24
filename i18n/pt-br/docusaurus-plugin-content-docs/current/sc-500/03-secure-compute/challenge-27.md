---
sidebar_position: 27
title: "Desafio 27: Segurança de IA – Proteção em Tempo Real do Copilot Studio & Gerenciamento de Agentes M365"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 27: Segurança de IA – Proteção em Tempo Real do Copilot Studio & Gerenciamento de Agentes M365

## Habilidades do exame cobertas

- Configurar políticas de proteção em tempo real para agentes do Copilot Studio
- Gerenciar implantação e governança de agentes do Microsoft 365 Copilot
- Implementar políticas de DLP para conteúdo gerado por IA
- Monitorar interações de agentes e detectar violações de política
- Configurar controles de conformidade do Purview para agentes personalizados do Copilot

## Cenário

A Contoso Ltd tem múltiplas unidades de negócios construindo agentes personalizados no Copilot Studio que se conectam a fontes de dados internas, incluindo sistemas de RH, bancos de dados financeiros e CRM de clientes. A equipe de segurança deve implementar proteção em tempo real para impedir que agentes vazem dados sensíveis, aplicar políticas de governança sobre quais agentes podem ser implantados e monitorar interações de agentes para detectar violações de conformidade.

---

## Pré-requisitos

- 🔒 **Licença necessária**: Microsoft 365 E5 + licença do Copilot Studio + acesso ao portal de conformidade do Microsoft Purview
- Função de Power Platform Administrator
- Função de Compliance Administrator
- Acesso ao portal Microsoft Purview
- Acesso ao Power Platform Admin Center

---

## Tarefa 1: Configurar políticas de DLP para agentes do Copilot Studio

Crie políticas de Data Loss Prevention que se aplicam às interações de agentes do Copilot Studio para prevenir vazamento de dados sensíveis.

1. Navegue até **Power Platform Admin Center** → **Policies** → **Data policies**
2. Clique em **+ New Policy**
3. Configure a política:
   - **Name**: "Copilot Studio - Sensitive Data Protection"
   - **Scope**: All environments (ou ambientes específicos)
4. Classifique os conectores:
   - Grupo **Business**: SharePoint, Dataverse, Office 365, Outlook
   - Grupo **Non-Business**: Conectores HTTP externos, conectores personalizados
   - Grupo **Blocked**: APIs externas anônimas/não aprovadas

```powershell
# Install Power Platform admin module
Install-Module -Name Microsoft.PowerApps.Administration.PowerShell -Force

# Connect to Power Platform
Add-PowerAppsAccount

# Create a DLP policy for Copilot Studio
$policyConfig = @{
    DisplayName = "Copilot Studio - Sensitive Data Protection"
    EnvironmentType = "AllEnvironments"
    DefaultConnectorsClassification = "Blocked"
}

# Get existing policies to verify
Get-DlpPolicy | Select-Object DisplayName, CreatedTime, EnvironmentType
```

---

## Tarefa 2: Habilitar proteção em tempo real para o Copilot Studio

Configure o Purview para monitorar e proteger interações de agentes do Copilot Studio em tempo real.

1. Navegue até **Microsoft Purview portal** → **Solutions** → **DSPM for AI**
2. Selecione **Microsoft Copilot experiences** → **Copilot Studio**
3. Habilite **Real-time data protection**:
   - Ative "Monitor agent conversations for sensitive information"
   - Ative "Block responses containing sensitive data patterns"
4. Configure a detecção de informações sensíveis:
   - Clique em **+ Add sensitive info types**
   - Selecione: Credit Card Numbers, SSN, Bank Account Numbers, Health records (HIPAA)
   - Defina a ação: **Block and notify** para correspondências de Alta confiança
   - Defina a ação: **Warn** para correspondências de Média confiança
5. Configure **Prompt injection protection**:
   - Habilite "Detect and block prompt injection attempts"
   - Defina sensibilidade: **High**
   - Habilite o log de todas as tentativas bloqueadas

```powershell
# Use Graph API to configure Purview AI protection policies
Connect-MgGraph -Scopes "InformationProtection.ReadWrite.All"

# Create a communication compliance policy for AI interactions
$policyBody = @{
    displayName = "Copilot Studio Real-Time Protection"
    description = "Monitors Copilot Studio agent interactions for sensitive data"
    isActive = $true
    policyType = "dataLossPrevention"
    conditions = @(
        @{
            conditionType = "sensitiveInformationType"
            sensitiveTypes = @(
                @{ name = "Credit Card Number"; minCount = 1; confidenceLevel = "high" }
                @{ name = "U.S. Social Security Number"; minCount = 1; confidenceLevel = "high" }
            )
        }
    )
    actions = @(
        @{ actionType = "blockContent"; notifyUser = $true }
    )
} | ConvertTo-Json -Depth 5

$uri = "https://graph.microsoft.com/beta/security/informationProtection/policies"
Invoke-MgGraphRequest -Method POST -Uri $uri -Body $policyBody
```

---

## Tarefa 3: Configurar governança de agentes no Microsoft 365 Admin Center

Configure controles de governança para determinar quais agentes do Copilot podem ser implantados e quem pode criá-los.

1. Navegue até **Microsoft 365 Admin Center** → **Settings** → **Copilot**
2. Em **Agents**, configure:
   - **Who can deploy agents**: Apenas grupos de segurança específicos
   - **Agent approval workflow**: Exigir aprovação do administrador antes da implantação
   - **Allowed data sources**: Restringir apenas a conectores internos aprovados

3. Navegue até **Power Platform Admin Center** → **Environments**
4. Para o ambiente de produção:
   - Clique em **Settings** → **Product** → **Features**
   - Defina "Copilot Studio agent publishing" como **Require approval**
   - Defina "External data connections" como **Admin-approved only**

```powershell
# Configure environment-level settings for Copilot Studio
# Set maker permissions - only approved users can create agents
$envId = "Default-contoso-environment-id"

# Restrict who can create Copilot Studio agents
Set-AdminPowerAppEnvironmentRoleAssignment `
    -EnvironmentName $envId `
    -RoleName "Environment Maker" `
    -PrincipalType "Group" `
    -PrincipalObjectId "approved-makers-group-id"
```

5. Configure as configurações de **Integrated apps**:
   - Navegue até **Microsoft 365 Admin Center** → **Settings** → **Integrated apps**
   - Em "User consent to apps": Defina como **Do not allow user consent**
   - Em "Admin managed apps": Habilite o fluxo de aprovação para agentes do Copilot

---

## Tarefa 4: Configurar monitoramento e alertas para interações de agentes

Configure alertas para atividade suspeita ou não conforme de agentes.

1. Navegue até **Microsoft Purview portal** → **Audit** → **Audit policies**
2. Crie uma nova política de auditoria:
   - **Name**: "Copilot Studio Agent Activity Monitoring"
   - **Activities to audit**:
     - CopilotStudioAgentInvoked
     - CopilotStudioAgentCreated
     - CopilotStudioAgentPublished
     - CopilotStudioDataSourceConnected
   - **Alert threshold**: Qualquer acesso a dados de alta sensibilidade
   - **Notification**: Lista de distribuição da equipe de segurança

```powershell
# Connect to Security & Compliance
Connect-IPPSSession

# Search unified audit log for Copilot Studio activities
$startDate = (Get-Date).AddDays(-7)
$endDate = Get-Date

Search-UnifiedAuditLog -StartDate $startDate -EndDate $endDate `
    -Operations "CopilotInteraction","MicrosoftCopilotForMicrosoft365Interaction" `
    -ResultSize 100 | ForEach-Object {
    $auditData = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
        Timestamp = $_.CreationDate
        User = $_.UserIds
        Operation = $_.Operations
        AgentName = $auditData.CopilotEventData.AgentName
        DataSourceAccessed = $auditData.CopilotEventData.DataSource
        SensitiveDataDetected = $auditData.CopilotEventData.SensitiveInfoDetected
    }
}
```

---

## Tarefa 5: Implementar restrições a nível de tópico no Copilot Studio

Configure restrições de tópico para impedir que agentes discutam assuntos sensíveis específicos.

1. Abra **Copilot Studio** → Selecione o agente alvo
2. Navegue até **Settings** → **Generative AI** → **Content moderation**
3. Configure tópicos bloqueados:
   - Adicione "Employee salary information" aos tópicos bloqueados
   - Adicione "Merger and acquisition details" aos tópicos bloqueados
   - Adicione "Executive personal information" aos tópicos bloqueados
4. Em **Knowledge sources**:
   - Remova quaisquer conexões de sites SharePoint com escopo amplo
   - Adicione apenas fontes de dados aprovadas e com escopo definido
   - Habilite "Restrict to selected sources only"
5. Em **Authentication**:
   - Defina como "Require user authentication"
   - Habilite "On behalf of user" para garantir que as permissões sejam respeitadas
   - Desabilite a opção "No authentication"

```powershell
# Use Power Platform admin to audit agent configurations
Get-AdminPowerAppConnection -EnvironmentName $envId | Where-Object {
    $_.ConnectorName -like "*SharePoint*" -or
    $_.ConnectorName -like "*SQL*" -or
    $_.ConnectorName -like "*Dataverse*"
} | Select-Object DisplayName, ConnectorName, CreatedBy, CreatedTime

# Check for agents using unapproved connectors
Get-AdminPowerApp -EnvironmentName $envId | ForEach-Object {
    $app = $_
    $connections = Get-AdminPowerAppConnectionReferences -EnvironmentName $envId -AppName $app.AppName
    $blockedConnections = $connections | Where-Object {
        $_.ConnectorName -in @("HTTP", "SMTP", "FTP")
    }
    if ($blockedConnections) {
        [PSCustomObject]@{
            AppName = $app.DisplayName
            BlockedConnectors = ($blockedConnections.ConnectorName -join ", ")
            Owner = $app.Owner.displayName
        }
    }
}
```

---

## Tarefa 6: Configurar residência de dados e retenção para interações de agentes

Garanta que as conversas de agentes do Copilot Studio estejam em conformidade com os requisitos de residência e retenção de dados.

1. Navegue até **Power Platform Admin Center** → **Environments** → Selecione produção
2. Em **Settings** → **Privacy + Security**:
   - Verifique se a localização dos dados corresponde aos requisitos de conformidade (ex.: "United States")
   - Habilite "Customer Lockbox" para dados de agentes
3. Navegue até **Microsoft Purview portal** → **Data lifecycle management**
4. Crie uma política de retenção para dados do Copilot Studio:

```powershell
# Create retention policy for Copilot interactions
Connect-IPPSSession

New-RetentionCompliancePolicy -Name "Copilot Studio Retention - 7 Years" `
    -CopilotLocation "All" `
    -Enabled $true

New-RetentionComplianceRule -Policy "Copilot Studio Retention - 7 Years" `
    -Name "Retain-7-Years" `
    -RetentionDuration 2555 `
    -RetentionComplianceAction "KeepAndDelete" `
    -ExpirationDateOption "ModificationAgeInDays"
```

---

## Quebra & conserta

### Cenário 1: Agente do Copilot Studio vazando PII de clientes nas respostas

Um agente de atendimento ao cliente construído no Copilot Studio está retornando números completos de Social Security Numbers e números de cartão de crédito dos clientes quando perguntado sobre contas de clientes. A política de DLP existe mas não está bloqueando as respostas.

<details>
<summary>Mostrar solução</summary>

```powershell
# 1. Verify DLP policy is correctly scoped to the environment
Get-DlpPolicy | Where-Object { $_.DisplayName -like "*Sensitive*" } |
    Select-Object DisplayName, EnvironmentType, Environments

# 2. Check if the policy includes the correct connectors
# The issue is often that the Dataverse connector (which Copilot Studio uses)
# is in the wrong connector group

# 3. Verify real-time protection is enabled in Purview
# Navigate to Purview > DSPM for AI > Copilot Studio > Real-time protection
# Ensure "Block responses containing sensitive data" is ON

# 4. Check sensitive info type detection is configured for the correct types
# Navigate to Purview > DSPM for AI > Detection rules
# Verify SSN and Credit Card patterns are in "Block" action tier

# 5. As immediate mitigation, restrict the agent's knowledge source
# In Copilot Studio > Agent > Knowledge > Edit source
# Add a system prompt: "Never include full SSN or credit card numbers in responses.
# Always mask sensitive data as XXX-XX-1234 or ****-****-****-1234"

# 6. Enable content filtering at the Copilot Studio level
# Agent Settings > Generative AI > Content moderation > Enable strict mode
```

</details>

### Cenário 2: Agente não autorizado implantado em produção sem aprovação

Um membro da equipe de marketing publicou um agente do Copilot Studio que se conecta ao banco de dados de clientes da empresa sem passar pelo fluxo de aprovação obrigatório. O agente já está sendo usado por mais de 50 funcionários.

<details>
<summary>Mostrar solução</summary>

```powershell
# 1. Immediately disable the unauthorized agent
# Navigate to Power Platform Admin Center > Environments > Apps
# Find the agent and toggle to "Quarantine"

# 2. Identify and disable the agent using admin PowerShell
Get-AdminPowerApp -EnvironmentName $envId | Where-Object {
    $_.DisplayName -like "*Marketing*" -and
    $_.Owner.displayName -eq "Marketing User"
} | Set-AdminPowerAppAsStopped -EnvironmentName $envId

# 3. Verify governance controls
# Check that environment maker role is restricted
Get-AdminPowerAppEnvironmentRoleAssignment -EnvironmentName $envId |
    Where-Object { $_.RoleName -eq "Environment Maker" }

# 4. Enable the approval workflow
# Power Platform Admin Center > Environments > Settings > Governance
# Set "Require admin approval for agent publishing" = ON

# 5. Review audit logs for what data was accessed
Search-UnifiedAuditLog -StartDate (Get-Date).AddDays(-30) -EndDate (Get-Date) `
    -FreeText "Marketing Agent" -RecordType "PowerPlatformAdministratorActivity" `
    -ResultSize 200

# 6. Notify affected users and trigger a data exposure review
# Use DSPM for AI to assess what sensitive data the agent may have exposed
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é o principal objetivo da proteção em tempo real no Purview DSPM for AI quando aplicada ao Copilot Studio?",
    options: [
      "Acelerar os tempos de resposta do agente através de cache de resultados",
      "Monitorar e bloquear dados sensíveis de aparecerem nas respostas do agente conforme são geradas",
      "Criptografar todas as conversas do agente em repouso",
      "Impedir que usuários acessem o Copilot Studio completamente"
    ],
    correctIndex: 1,
    explanation: "A proteção em tempo real no DSPM for AI monitora as interações do agente conforme acontecem e pode bloquear respostas que contenham informações sensíveis (como PII, dados financeiros ou registros de saúde) antes que cheguem ao usuário."
  },
  {
    question: "Qual controle de governança impede que agentes não autorizados do Copilot Studio sejam implantados em produção?",
    options: [
      "Rótulos de sensibilidade em todos os sites SharePoint",
      "Políticas de DLP a nível de ambiente com classificação de conectores mais fluxo de aprovação do administrador",
      "Desabilitar o Microsoft 365 Copilot para todos os usuários",
      "Configurar Conditional Access do Azure AD para o Power Platform"
    ],
    correctIndex: 1,
    explanation: "A combinação de políticas de DLP (controlando quais conectores os agentes podem usar) e fluxos de aprovação do administrador (exigindo aprovação antes da publicação) fornece governança sobre a implantação de agentes no Copilot Studio."
  },
  {
    question: "Um agente do Copilot Studio está configurado com 'No authentication'. Qual é o risco de segurança?",
    options: [
      "O agente não pode acessar nenhuma fonte de dados",
      "O agente é executado com permissões elevadas de conta de serviço, ignorando controles de acesso individuais dos usuários",
      "O agente é visível apenas para o criador",
      "O agente criptografa automaticamente todas as respostas"
    ],
    correctIndex: 1,
    explanation: "Quando um agente usa 'No authentication' ou autenticação a nível de serviço, ele acessa fontes de dados com sua própria identidade em vez de em nome do usuário. Isso significa que pode retornar dados a usuários que normalmente não teriam permissão para acessá-los."
  },
  {
    question: "Como as políticas de retenção devem ser configuradas para conversas de agentes do Copilot Studio em um setor regulado?",
    options: [
      "Políticas de retenção não podem ser aplicadas a dados do Copilot Studio",
      "Usar políticas de retenção do Microsoft Purview direcionando CopilotLocation para reter interações pelo período exigido",
      "Exportar todas as conversas para Azure Blob Storage manualmente",
      "Configurar o Dataverse do Power Platform para excluir automaticamente conversas após 30 dias"
    ],
    correctIndex: 1,
    explanation: "As políticas de retenção do Microsoft Purview suportam CopilotLocation como uma carga de trabalho, permitindo que organizações definam períodos de retenção e exclusão para interações de agentes do Copilot Studio para atender requisitos regulatórios."
  }
]} />

## Limpeza

```powershell
# Remove test DLP policies
Get-DlpPolicy | Where-Object { $_.DisplayName -like "*Copilot Studio*" } |
    Remove-DlpPolicy -Confirm:$false

# Remove test retention policies
Remove-RetentionCompliancePolicy -Identity "Copilot Studio Retention - 7 Years" -Confirm:$false

# Disconnect sessions
Disconnect-SPOService
Disconnect-MgGraph
Disconnect-ExchangeOnline
Remove-PowerAppsAccount
```
