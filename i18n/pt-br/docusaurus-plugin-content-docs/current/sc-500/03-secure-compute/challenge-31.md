---
sidebar_position: 31
title: "Desafio 31: Segurança de IA – Monitoramento do Dashboard de Segurança de Dados e IA"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 31: Segurança de IA – Monitoramento do Dashboard de Segurança de Dados e IA

## Habilidades do exame cobertas

- Navegar e interpretar o dashboard de Data and AI Security no Defender for Cloud
- Monitorar a postura de segurança de cargas de trabalho de IA no Microsoft 365 e Azure
- Investigar alertas e recomendações de segurança específicos de IA
- Correlacionar sinais de segurança de IA entre Purview, Defender e Entra ID
- Configurar workbooks personalizados e alertas para métricas de segurança de IA

## Cenário

A Contoso Ltd implantou cargas de trabalho de IA através do Microsoft 365 Copilot (5.000 usuários), Azure AI Foundry (3 modelos em produção) e 12 agentes do Copilot Studio. O CISO solicitou uma capacidade de monitoramento de segurança unificada que forneça visibilidade sobre ameaças relacionadas a IA, riscos de exposição de dados, conteúdo compartilhado em excesso acessado por IA e anomalias de autenticação de agentes. Você deve configurar e operacionalizar o dashboard de Data and AI Security.

---

## Pré-requisitos

- 🔒 **Licença necessária**: Microsoft 365 E5 + Defender for Cloud (plano Defender CSPM)
- Função de Security Administrator ou Security Reader
- Acesso ao portal do Microsoft Defender for Cloud
- Acesso ao portal do Microsoft Purview
- Azure Monitor / workspace do Log Analytics configurado

---

## Tarefa 1: Acessar e explorar o dashboard de Data and AI Security

Navegue até o dashboard unificado de monitoramento de segurança de IA.

1. Navegue até **Microsoft Defender for Cloud** → **Workload protections**
2. Selecione **Data and AI Security** na navegação à esquerda
3. Revise as seções do dashboard:
   - **AI Security Posture**: Score geral de saúde para cargas de trabalho de IA
   - **Active Threats**: Detecções de ameaças específicas de IA atuais
   - **Data Exposure Risks**: Conteúdo compartilhado em excesso acessível por IA
   - **Agent Activity**: Monitoramento do Copilot Studio e agentes personalizados
   - **Recommendations**: Melhorias de segurança priorizadas

```bash
# Verify Defender for Cloud plans are enabled for AI monitoring
az security pricing list --query "[?name=='AI' || name=='CloudPosture']" --output table

# Check if AI security assessments are running
az security assessment list \
    --query "[?contains(displayName, 'AI') || contains(displayName, 'Copilot')]" \
    --output table
```

---

## Tarefa 2: Configurar avaliações de postura de segurança de IA

Habilite e revise recomendações de segurança específicas para cargas de trabalho de IA.

```bash
# List AI-related security recommendations
az security assessment list \
    --query "[?contains(displayName, 'AI') || contains(displayName, 'cognitive') || contains(displayName, 'OpenAI')]" \
    --output json | jq '.[].{name: .displayName, status: .status.code, severity: .metadata.severity}'

# Common AI security recommendations to address:
# - "Azure AI services should restrict network access"
# - "Azure AI services should have key access disabled"
# - "Azure AI services should use private link"
# - "Diagnostic logs in AI services should be enabled"

# Remediate: Restrict network access to Azure OpenAI
az cognitiveservices account update \
    --name "contoso-openai-prod" \
    --resource-group "rg-contoso-ai-security" \
    --public-network-access "Disabled"

# Remediate: Disable local (key) authentication
az cognitiveservices account update \
    --name "contoso-openai-prod" \
    --resource-group "rg-contoso-ai-security" \
    --disable-local-auth true

# Remediate: Enable diagnostic logging
az monitor diagnostic-settings create \
    --name "ai-service-diagnostics" \
    --resource "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.CognitiveServices/accounts/contoso-openai-prod" \
    --workspace "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.OperationalInsights/workspaces/law-contoso-security" \
    --logs '[{"category": "Audit", "enabled": true}, {"category": "RequestResponse", "enabled": true}, {"category": "Trace", "enabled": true}]' \
    --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

---

## Tarefa 3: Monitorar detecções de ameaças de IA

Revise e investigue alertas ativos de segurança de IA do dashboard.

1. No dashboard **Data and AI Security** → painel **Active Threats**
2. Revise as categorias de alertas:
   - **Prompt Injection Detected**: Tentativas de manipular modelos de IA
   - **Sensitive Data in AI Response**: PII ou segredos nas saídas do modelo
   - **Anomalous Token Consumption**: Potencial wallet abuse
   - **Unauthorized Agent Authentication**: Comprometimento de identidade do agente
   - **Data Exfiltration via AI**: Copilot usado para extrair grandes volumes de dados

```bash
# Query Defender alerts specific to AI workloads
az security alert list \
    --query "[?contains(alertType, 'AI') || contains(alertType, 'Cognitive')]" \
    --output json | jq '.[] | {
        alertType: .alertType,
        severity: .severity,
        status: .status,
        description: .description,
        detectedTime: .timeGeneratedUtc,
        affectedResource: .compromisedEntity
    }'

# Get detailed investigation data for a specific alert
az security alert show \
    --name "{alert-id}" \
    --location "centralus" \
    --query "{type: .alertType, entities: .entities, remediation: .remediationSteps}"
```

---

## Tarefa 4: Criar workbooks de monitoramento personalizados para segurança de IA

Construa workbooks do Azure Monitor para rastrear KPIs específicos de segurança de IA.

```bash
# Create Log Analytics workspace for AI security monitoring
az monitor log-analytics workspace create \
    --resource-group "rg-contoso-ai-security" \
    --workspace-name "law-ai-security-monitoring" \
    --location "eastus"

WORKSPACE_ID=$(az monitor log-analytics workspace show \
    --resource-group "rg-contoso-ai-security" \
    --workspace-name "law-ai-security-monitoring" \
    --query "customerId" -o tsv)
```

Crie consultas KQL para o workbook:

```kql
// AI Model Usage with Safety Events
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where Category == "RequestResponse"
| extend promptTokens = toint(properties_s.promptTokens)
| extend completionTokens = toint(properties_s.completionTokens)
| extend isFiltered = properties_s contains "content_filter"
| summarize
    TotalRequests = count(),
    FilteredRequests = countif(isFiltered),
    TotalPromptTokens = sum(promptTokens),
    TotalCompletionTokens = sum(completionTokens)
    by bin(TimeGenerated, 1h), Resource
| render timechart
```

```kql
// Prompt Injection Attempts Over Time
SecurityAlert
| where AlertType contains "AI" or AlertType contains "PromptInjection"
| summarize AttemptCount = count() by bin(TimeGenerated, 1h), AlertSeverity
| render barchart
```

```kql
// Copilot Usage and Data Access Patterns
OfficeActivity
| where Operation contains "Copilot"
| extend DataSource = tostring(parse_json(ModifiedProperties)[0].NewValue)
| summarize
    InteractionCount = count(),
    UniqueUsers = dcount(UserId),
    DataSourcesAccessed = dcount(DataSource)
    by bin(TimeGenerated, 1d)
| render timechart
```

```kql
// Agent Authentication Anomalies
AADServicePrincipalSignInLogs
| where AppDisplayName contains "Agent" or Tags contains "AIAgent"
| extend RiskLevel = tostring(RiskLevelDuringSignIn)
| where RiskLevel != "none"
| project TimeGenerated, AppDisplayName, IPAddress, Location, RiskLevel, Status
| order by TimeGenerated desc
```

---

## Tarefa 5: Configurar alertas de correlação de sinais cruzados

Crie alertas que correlacionam sinais de múltiplas fontes de segurança de IA.

```bash
# Alert: Data overexposure + Copilot access = High risk
az monitor scheduled-query create \
    --name "ai-data-overexposure-copilot-access" \
    --resource-group "rg-contoso-ai-security" \
    --scopes "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.OperationalInsights/workspaces/law-ai-security-monitoring" \
    --condition "count 'OfficeActivity | where Operation contains \"Copilot\" and SiteUrl has_any (\"HRConfidential\", \"Finance-MA\", \"ExecutiveComp\")' > 10" \
    --window-size "PT15M" \
    --evaluation-frequency "PT5M" \
    --severity 1 \
    --description "Copilot accessing sensitive overexposed sites"

# Alert: Multiple jailbreak attempts from same source
az monitor scheduled-query create \
    --name "repeated-jailbreak-attempts" \
    --resource-group "rg-contoso-ai-security" \
    --scopes "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.OperationalInsights/workspaces/law-ai-security-monitoring" \
    --condition "count 'AzureDiagnostics | where ResourceProvider == \"MICROSOFT.COGNITIVESERVICES\" and resultSignature_d == 400 | summarize count() by CallerIPAddress | where count_ > 20' > 0" \
    --window-size "PT10M" \
    --evaluation-frequency "PT5M" \
    --severity 2 \
    --description "Repeated prompt injection attempts detected"

# Alert: Agent accessing data outside normal hours
az monitor scheduled-query create \
    --name "agent-offhours-access" \
    --resource-group "rg-contoso-ai-security" \
    --scopes "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.OperationalInsights/workspaces/law-ai-security-monitoring" \
    --condition "count 'AADServicePrincipalSignInLogs | where Tags contains \"AIAgent\" and hourofday(TimeGenerated) !between (6 .. 22)' > 5" \
    --window-size "PT1H" \
    --evaluation-frequency "PT15M" \
    --severity 3 \
    --description "AI agent authenticating outside business hours"
```

---

## Tarefa 6: Gerar relatórios de postura de segurança de IA

Crie relatórios automatizados para métricas de segurança de IA.

```bash
# Create a Logic App for weekly AI security report
az logic workflow create \
    --resource-group "rg-contoso-ai-security" \
    --name "ai-security-weekly-report" \
    --location "eastus" \
    --definition '{
        "definition": {
            "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json",
            "triggers": {
                "Recurrence": {
                    "type": "Recurrence",
                    "recurrence": {
                        "frequency": "Week",
                        "interval": 1,
                        "schedule": {"weekDays": ["Monday"], "hours": ["8"]}
                    }
                }
            },
            "actions": {}
        }
    }'
```

Revise as métricas-chave do dashboard semanalmente:

| Métrica | Alvo | Limite de Alerta |
|---------|------|------------------|
| Tentativas de prompt injection/dia | < 10 | > 50 |
| Bloqueios de filtro de conteúdo/dia | Baseline ±20% | > 200% de aumento |
| Variação de consumo de tokens | < 30% do baseline | > 100% de pico |
| Falhas de autenticação de agentes | < 5/dia | > 20/dia |
| Dados sensíveis em respostas | 0 | Qualquer ocorrência |
| Sites compartilhados em excesso com acesso ao Copilot | Tendência de queda | Qualquer aumento |
| Alertas de alta severidade não resolvidos | 0 | > 3 não resolvidos por 24h |

---

## Quebra & conserta

### Cenário 1: Dashboard de segurança de IA não mostra dados apesar de cargas de trabalho de IA ativas

O dashboard de Data and AI Security no Defender for Cloud mostra "No data available" mesmo que a Contoso tenha implantações ativas do Azure OpenAI e M365 Copilot em uso.

<details>
<summary>Mostrar solução</summary>

```bash
# 1. Verify Defender for Cloud plans are enabled
az security pricing show --name "AI" --query "pricingTier"
# Must show "Standard" not "Free"

az security pricing show --name "CloudPosture" --query "pricingTier"
# Defender CSPM must be Standard for the dashboard

# 2. Enable Defender for AI if not active
az security pricing create --name "AI" --tier "Standard"

# 3. Check diagnostic settings on AI resources
az monitor diagnostic-settings list \
    --resource "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.CognitiveServices/accounts/contoso-openai-prod"
# Must have Audit and RequestResponse categories enabled

# 4. Enable diagnostic settings if missing
az monitor diagnostic-settings create \
    --name "ai-diagnostics" \
    --resource "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.CognitiveServices/accounts/contoso-openai-prod" \
    --workspace "/subscriptions/{sub-id}/resourceGroups/rg-contoso-ai-security/providers/Microsoft.OperationalInsights/workspaces/law-ai-security-monitoring" \
    --logs '[{"category": "Audit", "enabled": true}, {"category": "RequestResponse", "enabled": true}]' \
    --metrics '[{"category": "AllMetrics", "enabled": true}]'

# 5. For M365 Copilot visibility, ensure Purview audit logging is enabled
# Navigate to Purview > Audit > Verify "Start recording user and admin activity" is ON
# Data may take 24-48 hours to populate after enabling

# 6. Verify Log Analytics workspace is in a supported region
az monitor log-analytics workspace show \
    --resource-group "rg-contoso-ai-security" \
    --workspace-name "law-ai-security-monitoring" \
    --query "location"
```

</details>

### Cenário 2: Fadiga de alertas por alertas excessivos de IA de baixa severidade

A equipe de segurança está recebendo mais de 200 alertas por dia de cargas de trabalho de IA, a maioria dos quais são falsos positivos de gatilhos de filtros de conteúdo em consultas legítimas de negócios.

<details>
<summary>Mostrar solução</summary>

```bash
# 1. Analyze alert patterns to identify false positive sources
az security alert list \
    --query "[?contains(alertType, 'AI')]" \
    --output json | jq 'group_by(.alertType) | map({type: .[0].alertType, count: length, severity: .[0].severity})'

# 2. Tune alert thresholds for scheduled queries
# Increase the threshold for repeated attempts
az monitor scheduled-query update \
    --name "repeated-jailbreak-attempts" \
    --resource-group "rg-contoso-ai-security" \
    --condition "count 'AzureDiagnostics | where ResourceProvider == \"MICROSOFT.COGNITIVESERVICES\" and resultSignature_d == 400 | summarize count() by CallerIPAddress | where count_ > 50' > 0"

# 3. Create suppression rules for known false positive patterns
# Navigate to Defender for Cloud > Security alerts > Suppression rules
# Add rule: Suppress "ContentFilter" alerts from internal test IPs
# Add rule: Suppress low-severity alerts from dev/test environments

# 4. Implement alert tiering - only notify on High and Critical
az monitor action-group update \
    --name "AI-Security-Response" \
    --resource-group "rg-contoso-ai-security" \
    --short-name "AISec"
    # Configure separate action groups per severity

# 5. Create a summary digest instead of individual notifications
# Use Logic App to aggregate alerts and send daily digest
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual plano do Defender for Cloud deve ser habilitado para acessar o dashboard de Data and AI Security?",
    options: [
      "Defender for Servers",
      "Defender CSPM (Cloud Security Posture Management) com a extensão de segurança de IA",
      "Defender for Key Vault",
      "Defender for DNS"
    ],
    correctIndex: 1,
    explanation: "O dashboard de Data and AI Security requer que o Defender CSPM (Standard tier) esteja habilitado, o que fornece avaliação de postura de segurança, recomendações e capacidades de dashboard unificado para cargas de trabalho de IA."
  },
  {
    question: "Qual combinação de sinais indica o incidente de segurança de IA de mais alta prioridade?",
    options: [
      "Uma única tentativa de prompt injection de um IP externo",
      "Copilot acessando um site compartilhado em excesso contendo dados de M&A + volume anômalo de download de dados + atividade fora do horário",
      "Um filtro de conteúdo bloqueando uma solicitação de usuário por conteúdo prejudicial",
      "Um modelo de IA retornando uma resposta fundamentada com baixa confiança"
    ],
    correctIndex: 1,
    explanation: "A correlação de sinais cruzados de múltiplos indicadores (acesso a dados sensíveis compartilhados em excesso + padrão de exfiltração de dados + timing incomum) representa o cenário de maior risco, potencialmente indicando um ataque coordenado usando o Copilot para extrair informações sensíveis."
  },
  {
    question: "Qual é a abordagem recomendada para reduzir a fadiga de alertas do monitoramento de segurança de IA?",
    options: [
      "Desabilitar todos os alertas de segurança de IA",
      "Ajustar limites de alertas, criar regras de supressão para falsos positivos conhecidos, implementar roteamento baseado em severidade e usar digests diários para itens de baixa severidade",
      "Monitorar apenas ambientes de produção e ignorar dev/test",
      "Aumentar o limite de alerta para mais de 1000 eventos antes de disparar"
    ],
    correctIndex: 1,
    explanation: "O gerenciamento eficaz de alertas combina ajuste de limites (baseado em análise de baseline), regras de supressão para padrões benignos conhecidos, roteamento baseado em severidade (notificação imediata apenas para High/Critical) e digests agregados para alertas informativos."
  }
]} />

## Limpeza

```bash
# Delete monitoring resources
az monitor scheduled-query delete --name "ai-data-overexposure-copilot-access" --resource-group "rg-contoso-ai-security" --yes
az monitor scheduled-query delete --name "repeated-jailbreak-attempts" --resource-group "rg-contoso-ai-security" --yes
az monitor scheduled-query delete --name "agent-offhours-access" --resource-group "rg-contoso-ai-security" --yes
az logic workflow delete --name "ai-security-weekly-report" --resource-group "rg-contoso-ai-security" --yes

# Delete resource group
az group delete --name "rg-contoso-ai-security" --yes --no-wait
```
