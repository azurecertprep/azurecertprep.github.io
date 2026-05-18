---
sidebar_position: 28
title: "Desafio 28: Azure Advisor & Service Health"
---

# Desafio 28: Azure Advisor & Service Health

:::info Tempo e Custo Estimados

**45-60 minutos** | **Custo estimado**: ~$0,00 (Advisor e Service Health são gratuitos) | **Peso no Exame: 5-10%**

:::

## Cenário

A Contoso Ltd. deseja monitoramento proativo com recomendações acionáveis em segurança, desempenho, custo, confiabilidade e excelência operacional. O CTO solicitou que a equipe revise regularmente as recomendações do Azure Advisor, acompanhe melhorias ao longo do tempo e configure alertas para eventos de service health (interrupções, manutenção planejada e avisos de saúde) para nunca ser pega de surpresa.

## Habilidades do Exame Cobertas

- Revisar e interpretar recomendações do Azure Advisor
- Configurar alertas do Advisor para novas recomendações
- Suprimir ou adiar recomendações do Advisor
- Configurar alertas de Service Health (problemas de serviço, manutenção planejada, avisos de saúde)
- Verificar Resource Health para recursos específicos
- Criar action groups para notificações
- Entender o Advisor Score e acompanhamento de melhorias

## Referência Sysadmin ↔ Azure

| On-Prem / Tradicional | Equivalente no Azure |
|---|---|
| Resultados de auditoria de segurança / pen test | Recomendações de Segurança do Advisor |
| Revisões de planejamento de capacidade | Recomendações de Desempenho do Advisor |
| Reuniões de otimização de custos | Recomendações de Custo do Advisor |
| Notificações de manutenção do fornecedor | Service Health (manutenção planejada) |
| Página de status (status.cloud.com) | Azure Service Health / Status |
| Monitoramento de saúde de hardware (IPMI/iLO) | Resource Health |
| Checklist de boas práticas (CIS benchmarks) | Advisor Operational Excellence |
| Planilha de acompanhamento de remediação | Advisor Score |

## Configuração Inicial

```bash
# Variables
RG="rg-az104-challenge28"
LOCATION="eastus"

# Create resource group (for action groups and alert rules)
az group create --name $RG --location $LOCATION
```

:::tip Dica

Este desafio utiliza principalmente o Azure Advisor e Service Health, que analisam os recursos existentes na sua assinatura. Você não precisa implantar VMs ou serviços para este laboratório | o Advisor analisa o que já existe na sua assinatura.

:::
## Tarefas

### Tarefa 1: Revisar Recomendações do Azure Advisor

```bash
# List all Advisor recommendations for the subscription
az advisor recommendation list -o table

# Filter by category: Cost
az advisor recommendation list \
  --category Cost -o table

# Filter by category: Security
az advisor recommendation list \
  --category Security -o table

# Filter by category: Performance
az advisor recommendation list \
  --category Performance -o table

# Filter by category: Reliability (High Availability)
az advisor recommendation list \
  --category HighAvailability -o table

# Filter by category: Operational Excellence
az advisor recommendation list \
  --category OperationalExcellence -o table

# Get detailed information about a specific recommendation
# az advisor recommendation list --category Cost --query "[0]"
```

**Passos no Portal:**
1. Navegue até **Azure Advisor** no portal
2. Revise o painel mostrando recomendações por categoria
3. Clique em cada categoria para ver recomendações detalhadas
4. Cada recomendação mostra: Impacto (Alto/Médio/Baixo), recursos afetados e passos de remediação

### Tarefa 2: Entender o Advisor Score

**Passos no Portal:**
1. Navegue até **Advisor** > **Advisor Score**
2. Visualize a pontuação geral (0-100%) e pontuações por categoria
3. Cada categoria contribui para a pontuação geral:
   - Confiabilidade
   - Segurança
   - Desempenho
   - Custo
   - Excelência Operacional

```bash
# Check Advisor configuration (what resource groups are included)
az advisor configuration list -o table

# Configure Advisor to exclude specific resource groups (if needed)
az advisor configuration update \
  --exclude \
  --resource-group "rg-dev-sandbox"
```

:::tip Dica

O Advisor Score representa a porcentagem de recomendações do Advisor que foram atendidas. Uma pontuação de 100% significa que todas as recomendações foram resolvidas. Use-o para:
- Acompanhar melhorias ao longo do tempo
- Comparar entre assinaturas
- Definir metas organizacionais (ex.: manter acima de 80%)

:::
### Tarefa 3: Suprimir ou Adiar Recomendações

```bash
# List current recommendations
az advisor recommendation list --category Cost -o table

# Suppress (dismiss) a recommendation permanently
# Get the recommendation ID first
RECOMMENDATION_ID=$(az advisor recommendation list \
  --category Cost \
  --query "[0].id" -o tsv)

# Suppress for a specific resource
if [ -n "$RECOMMENDATION_ID" ]; then
  az advisor recommendation disable \
    --ids "$RECOMMENDATION_ID" \
    --days 30
fi
```

**Passos no Portal:**
1. Navegue até **Advisor** > Selecione uma recomendação
2. Clique em **Dismiss** ou **Postpone**
3. Escolha a duração: 1 dia, 1 semana, 1 mês ou para sempre
4. Opcionalmente adicione um motivo (ex.: "Risco aceito para ambiente de desenvolvimento")

:::tip Dica

Suprima recomendações quando:
- A recomendação não se aplica ao seu cenário (ex.: economia de custos para VMs de dev intencionalmente superdimensionadas)
- Você tem controles compensatórios em vigor
- O risco é reconhecido e aceito
- A recomendação é um falso positivo para sua carga de trabalho

:::
### Tarefa 4: Configurar Alertas do Advisor

```bash
# First, create an action group for notifications
az monitor action-group create \
  --resource-group $RG \
  --name ag-advisor-notifications \
  --short-name AdvisorAG \
  --action email ops-team opsTeam@contoso.com

# Create an Advisor alert for new cost recommendations
az advisor recommendation list --category Cost > /dev/null 2>&1

# Create activity log alert for new Advisor recommendations
az monitor activity-log alert create \
  --resource-group $RG \
  --name "alert-advisor-cost" \
  --description "Alert when new Cost Advisor recommendations appear" \
  --action-group ag-advisor-notifications \
  --condition category=Recommendation \
  --condition operationName="Microsoft.Advisor/recommendations/available/action"
```

**Passos no Portal:**
1. Navegue até **Advisor** > **Alerts**
2. Clique em **New alert**
3. Configure:
   - Categoria: Cost (ou All)
   - Impacto: High, Medium (selecione conforme necessário)
   - Action group: Selecione ou crie
4. Clique em **Create alert rule**

### Tarefa 5: Configurar Alertas de Service Health

```bash
# Create alert for service issues (outages) in your region
az monitor activity-log alert create \
  --resource-group $RG \
  --name "alert-service-issues" \
  --description "Alert for Azure service issues affecting our resources" \
  --action-group ag-advisor-notifications \
  --condition category=ServiceHealth \
  --condition "properties.incidentType=Incident"

# Create alert for planned maintenance
az monitor activity-log alert create \
  --resource-group $RG \
  --name "alert-planned-maintenance" \
  --description "Alert for planned maintenance events" \
  --action-group ag-advisor-notifications \
  --condition category=ServiceHealth \
  --condition "properties.incidentType=Maintenance"

# Create alert for health advisories
az monitor activity-log alert create \
  --resource-group $RG \
  --name "alert-health-advisories" \
  --description "Alert for action-required service health events" \
  --action-group ag-advisor-notifications \
  --condition category=ServiceHealth \
  --condition "properties.incidentType=ActionRequired"

# List all activity log alerts
az monitor activity-log alert list \
  --resource-group $RG -o table
```

**Passos no Portal:**
1. Navegue até **Service Health** > **Health alerts**
2. Clique em **Create service health alert**
3. Configure:
   - Assinatura: Selecione sua assinatura
   - Serviços: Selecione serviços específicos (ou Todos)
   - Regiões: Selecione suas regiões (ex.: East US)
   - Tipos de evento: Service issue, Planned maintenance, Health advisory, Security advisory
4. Selecione action group
5. Nomeie a regra de alerta e clique em **Create**

### Tarefa 6: Verificar Resource Health

```bash
# Check availability/health status of specific resources
# Resource Health is primarily a Portal feature, but you can query via REST

# Check VM health via CLI
az vm get-instance-view \
  --ids $(az vm list -g $RG --query "[].id" -o tsv 2>/dev/null) \
  --query "[].{Name:name, Status:instanceView.statuses[1].displayStatus}" -o table 2>/dev/null

# List resource health events via Activity Log
az monitor activity-log list \
  --resource-group $RG \
  --max-events 20 \
  --query "[?category.value=='ResourceHealth'].{Time:eventTimestamp, Resource:resourceId, Status:status.value}" -o table 2>/dev/null
```

**Passos no Portal:**
1. Navegue até **Service Health** > **Resource Health**
2. Filtre por assinatura, tipo de recurso e grupo de recursos
3. Verifique o status de saúde de cada recurso:
   - **Available**: Recurso está saudável
   - **Unavailable**: Azure detectou um problema afetando o recurso
   - **Degraded**: Problemas de desempenho detectados
   - **Unknown**: Nenhum sinal de saúde recebido

4. Navegue até um recurso específico > blade **Resource Health**
5. Visualize eventos históricos de saúde e análise de causa raiz

### Tarefa 7: Criar Action Groups para Notificações

```bash
# Create a comprehensive action group with multiple notification channels
az monitor action-group create \
  --resource-group $RG \
  --name ag-critical-alerts \
  --short-name CritAlert \
  --action email cto-email cto@contoso.com \
  --action email ops-email ops@contoso.com \
  --action sms ops-sms 1 5551234567

# Create an action group with webhook (for integration with ITSM tools)
az monitor action-group create \
  --resource-group $RG \
  --name ag-webhook-itsm \
  --short-name ITSM \
  --action webhook servicenow-hook "https://contoso.service-now.com/api/webhook"

# List action groups
az monitor action-group list --resource-group $RG -o table

# Test an action group (sends test notifications)
AG_ID=$(az monitor action-group show \
  --resource-group $RG \
  --name ag-critical-alerts \
  --query "id" -o tsv)

# az monitor action-group test-notifications create \
#   --resource-group $RG \
#   --action-group-name ag-critical-alerts \
#   --alert-type servicehealth \
#   --notifications '[{"notificationType":"Email","emailAddress":"ops@contoso.com"}]'
```

### Tarefa 8: Revisar o Painel de Service Health

**Passos no Portal:**
1. Navegue até **Service Health** no portal
2. Revise as quatro seções:
   - **Service issues**: Interrupções atuais afetando seus recursos
   - **Planned maintenance**: Eventos de manutenção programados
   - **Health advisories**: Recomendações e itens de ação
   - **Security advisories**: Notificações relacionadas à segurança
3. Clique em qualquer evento ativo para ver:
   - Serviços e regiões afetados
   - Linha do tempo de atualizações
   - Causa raiz (após resolução)
   - Ações recomendadas
4. Verifique o **Health history** para eventos passados

### Tarefa 9: Implementar Recomendações do Advisor

```bash
# Example: Implement a common Advisor recommendation
# (Right-size or shut down underutilized VMs)

# List VMs with recommendations
az advisor recommendation list \
  --category Cost \
  --query "[?contains(shortDescription.problem, 'virtual machine')]" -o table

# Example: Resize a VM based on Advisor recommendation
# az vm resize --resource-group $RG --name vm-oversize --size Standard_B1s

# Example: Enable soft-delete on Key Vault (security recommendation)
# az keyvault update --name my-kv --enable-soft-delete true

# After implementing, refresh Advisor to verify
az advisor recommendation list --category Cost -o table
```

**Passos no Portal:**
1. Navegue até **Advisor** > Selecione uma recomendação
2. Clique em **View recommendation details**
3. Revise os recursos afetados
4. Clique em **Remediate** (para recomendações com correção rápida)
5. Ou siga os passos manuais fornecidos

## Critérios de Sucesso

- [ ] Recomendações do Advisor revisadas em todas as cinco categorias
- [ ] Advisor Score visualizado e compreendido
- [ ] Pelo menos uma recomendação suprimida/adiada com motivo
- [ ] Alerta do Advisor configurado para novas recomendações
- [ ] Alertas de Service Health configurados para: problemas de serviço, manutenção planejada e avisos de saúde
- [ ] Resource Health verificado para recursos específicos
- [ ] Action groups criados com notificações por email (e opcionalmente SMS/webhook)
- [ ] Painel de Service Health explorado (problemas, manutenção, avisos)
- [ ] Pelo menos uma recomendação do Advisor implementada ou reconhecida

## Cenários de Quebrar & Consertar

### Cenário A: Alerta Não Disparando

```bash
# Check if action group is correctly configured
az monitor action-group show \
  --resource-group $RG \
  --name ag-advisor-notifications

# Check if alert rule is enabled
az monitor activity-log alert list \
  --resource-group $RG \
  --query "[].{Name:name, Enabled:enabled}" -o table

# Common causes:
# 1. Action group has invalid email/phone
# 2. Alert rule is disabled
# 3. Condition scope is too narrow (wrong region/service)
# 4. Email is going to spam/junk folder

# Fix: Enable the alert rule
az monitor activity-log alert update \
  --resource-group $RG \
  --name "alert-service-issues" \
  --enabled true
```

### Cenário B: Muitas Notificações (Fadiga de Alertas)

```bash
# Problem: Getting too many low-impact Advisor notifications

# Fix 1: Suppress low-priority recommendations
az advisor recommendation disable \
  --ids "<recommendation-id>" \
  --days 90

# Fix 2: Create separate action groups for different severities
# High impact -> email + SMS + webhook
# Medium/Low -> email only

# Fix 3: Use alert processing rules to suppress during maintenance windows
az monitor alert-processing-rule create \
  --resource-group $RG \
  --name "suppress-weekends" \
  --rule-type RemoveAllActionGroups \
  --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG" \
  --schedule-recurrence-type Weekly \
  --schedule-recurrence "Saturday" "Sunday"
```

### Cenário C: Resource Health Mostra Indisponível

```bash
# A VM shows "Unavailable" in Resource Health
# Possible causes:
# 1. Platform-initiated: Azure host issue (auto-recovery)
# 2. User-initiated: VM deallocated or stopped
# 3. Unknown: No health signal

# Check VM status
az vm get-instance-view -g $RG -n vm-affected \
  --query "instanceView.statuses[].{Code:code, Status:displayStatus}" -o table 2>/dev/null

# Check Activity Log for recent changes
az monitor activity-log list \
  --resource-group $RG \
  --max-events 10 \
  --query "[].{Time:eventTimestamp, Operation:operationName.value, Status:status.value}" \
  -o table 2>/dev/null
```

## Verificação de Conhecimento

**1. Quais são as cinco categorias do Azure Advisor?**

<details>
<summary>Mostrar Resposta</summary>

| Categoria | Área de Foco | Exemplos de Recomendações |
|----------|-----------|------------------------|
| Confiabilidade | Alta disponibilidade, recuperação de desastres | Habilitar backups de VM, configurar replicação |
| Segurança | Vulnerabilidades e ameaças | Habilitar MFA, corrigir regras NSG, habilitar criptografia |
| Desempenho | Velocidade e responsividade | Redimensionar VMs, adicionar cache, otimizar consultas |
| Custo | Reduzir gastos | Desligar VMs ociosas, usar instâncias reservadas, excluir recursos órfãos |
| Excelência Operacional | Boas práticas e eficiência | Habilitar diagnósticos, etiquetar recursos, usar automação |
</details>

**2. Quais são os tipos de eventos do Service Health?**

<details>
<summary>Mostrar Resposta</summary>

| Tipo de Evento | Descrição | Ação Necessária |
|-----------|-------------|----------------|
| Service issues | Interrupções ativas afetando seus recursos | Monitorar, fazer failover se possível |
| Planned maintenance | Eventos de manutenção programada | Planejar para indisponibilidade, preparar failover |
| Health advisories | Mudanças que requerem ação (descontinuações, etc.) | Atualizar configurações antes do prazo |
| Security advisories | Notificações relacionadas à segurança | Aplicar patches, atualizar configurações |

Service Health mostra apenas eventos que afetam SEUS recursos (não todos os problemas do Azure globalmente).
</details>

**3. Qual é a diferença entre Service Health, Resource Health e Azure Status?**

<details>
<summary>Mostrar Resposta</summary>

| Recurso | Escopo | Personalizado | Caso de Uso |
|---------|-------|--------------|----------|
| Azure Status (status.azure.com) | Global, todos os clientes | Não | Verificar se há interrupção geral do Azure |
| Service Health | Sua assinatura | Sim | Ver problemas afetando seus serviços/regiões |
| Resource Health | Recurso individual | Sim | Diagnosticar por que um recurso específico está com problema |

Use Resource Health para troubleshooting de recursos individuais, Service Health para consciência em nível de assinatura e Azure Status para informações sobre incidentes globais.
</details>

**4. Quais tipos de ações um action group pode executar?**

<details>
<summary>Mostrar Resposta</summary>

| Tipo de Ação | Descrição |
|-------------|-------------|
| Email | Enviar notificação por email |
| SMS | Enviar mensagem de texto |
| Voice | Chamada telefônica automatizada |
| Push notification | App móvel do Azure |
| Webhook | HTTP POST para uma URL |
| Logic App | Acionar um Azure Logic App |
| Azure Function | Invocar uma function |
| ITSM | Criar ticket no ServiceNow, etc. |
| Automation Runbook | Executar um runbook |
| Event Hub | Transmitir para Event Hub |
| Secure Webhook | Webhook com autenticação AAD |

Limites de taxa se aplicam: Email (100/hora), SMS (1/5 min), Voice (1/5 min).
</details>

## Limpeza

```bash
# Delete alert rules and action groups
az monitor activity-log alert delete -g $RG --name "alert-service-issues" 2>/dev/null
az monitor activity-log alert delete -g $RG --name "alert-planned-maintenance" 2>/dev/null
az monitor activity-log alert delete -g $RG --name "alert-health-advisories" 2>/dev/null
az monitor activity-log alert delete -g $RG --name "alert-advisor-cost" 2>/dev/null

# Delete the resource group
az group delete --name $RG --yes --no-wait

echo "Resources are being deleted in the background."
```

## Recursos de Aprendizagem

- [Visão geral do Azure Advisor](https://learn.microsoft.com/azure/advisor/advisor-overview)
- [Advisor Score](https://learn.microsoft.com/azure/advisor/azure-advisor-score)
- [Azure Service Health](https://learn.microsoft.com/azure/service-health/overview)
- [Visão geral do Resource Health](https://learn.microsoft.com/azure/service-health/resource-health-overview)
- [Criar alertas de Service Health](https://learn.microsoft.com/azure/service-health/alerts-activity-log-service-notifications-portal)
- [Action groups](https://learn.microsoft.com/azure/azure-monitor/alerts/action-groups)
- [Alertas do Advisor](https://learn.microsoft.com/azure/advisor/advisor-alerts-portal)
