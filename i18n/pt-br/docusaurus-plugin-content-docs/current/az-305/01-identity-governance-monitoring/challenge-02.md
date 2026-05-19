---
sidebar_position: 2
title: "Desafio 02: Projetar Roteamento e Filtragem de Logs"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 02: Projetar Roteamento e Filtragem de Logs

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-10 | **Peso no Exame: 25-30%**

:::

## Introdução

A Contoso Financial Services é uma instituição financeira regulada que executa um portfolio de serviços Azure incluindo App Services, Azure SQL Databases, Azure Key Vault e Azure Kubernetes Service. A equipe de conformidade determinou que todos os logs de auditoria de segurança devem ser encaminhados para o SIEM Splunk on-premises dentro de 5 minutos apos a geracao. Além disso, todos os logs devem ser arquivados por 7 anos para atender requisitos regulatorios financeiros (ao menor custo possível), e a equipe de operações precisa de alertas em tempo real sobre eventos críticos de infraestrutura.

O estado atual e caotico: alguns recursos tem configurações de diagnóstico apontando para uma storage account que ninguém monitora, outros não tem configurações de diagnóstico, e a equipe de segurança esta exportando logs manualmente semanalmente pelo portal. A fatura mensal do Azure para logging tem aumentado constantemente devido a dados duplicados sendo enviados para múltiplos destinos sem filtragem.

Sua tarefa é projetar uma arquitetura abrangente de roteamento de logs que satisfaca requisitos de conformidade, operacionais e de custos, eliminando fluxos de dados redundantes.

## Habilidades do Exame Cobertas

- Recomendar uma solução para roteamento de logs
- Recomendar uma solução de logging
- Recomendar uma solução de monitoramento

## Tarefas de Design

### Parte 1: Arquitetura de Roteamento de Logs

1. Projete a arquitetura de roteamento para os logs da Contoso considerando estes destinos:
   - **SIEM (Splunk)**: Logs de auditoria de segurança, entrega quase em tempo real
   - **Arquivo de longo prazo**: Todos os logs, retencao de 7 anos, menor custo
   - **Log Analytics**: Logs operacionais para alertas e troubleshooting
   - **Processamento de stream em tempo real**: Eventos críticos para resposta automatizada

2. Para cada destino, determine o serviço Azure apropriado:
   - Event Hub, Storage Account, Log Analytics workspace ou solução de parceiro
   - Documente por que cada destino foi escolhido em vez de alternativas

3. Crie um diagrama de fluxo de dados mostrando como os logs se movem dos recursos de origem para cada destino.

### Parte 2: Configuração de Diagnostic Settings

4. Projete configurações de diagnóstico para os seguintes tipos de recurso, especificando quais categorias de log vao para quais destinos:
   - Azure Key Vault (logs AuditEvent)
   - Azure SQL Database (SQLSecurityAuditEvents, QueryStoreRuntimeStatistics)
   - Azure App Service (AppServiceHTTPLogs, AppServiceConsoleLogs, AppServiceAppLogs)
   - Azure Kubernetes Service (kube-audit, kube-controller-manager, cluster-autoscaler)

5. Implemente configurações de diagnóstico para pelo menos dois tipos de recurso usando Azure CLI.

### Parte 3: Data Collection Rules

6. Projete data collection rules (DCRs) para filtrar e transformar logs antes da ingestao no Log Analytics:
   - Filtrar requisicoes HTTP de health check (status 200, path "/health") dos logs do App Service
   - Transformar logs do AKS para extrair apenas mensagens de nível warning e error
   - Reduzir a verbosidade dos logs de auditoria do Key Vault removendo operações somente leitura em ambientes não-produção

7. Implemente uma DCR usando Azure CLI ou ARM template que demonstre filtragem de logs com uma transformacao KQL.

### Parte 4: Otimização de Custos por Roteamento

8. Calcule o impacto de custo de enviar todos os logs para todos os destinos vs. roteamento seletivo. Considere:
   - Custo de ingestao do Log Analytics por GB
   - Custos de throughput unit do Event Hub
   - Custo da storage account (tier cool) por GB
   - Custos de exportacao de dados

9. Projete uma estratégia de roteamento em camadas:
   - Tier 1 (Crítico): Tempo real para Log Analytics + Event Hub
   - Tier 2 (Auditoria): Log Analytics + Storage Archive
   - Tier 3 (Verboso): Apenas Storage Archive (com restore opcional)

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-02"
  items={[
    "Log routing architecture documented with clear destination justification for each log type",
    "Diagnostic settings designed for at least 4 resource types with appropriate category-to-destination mapping",
    "At least two diagnostic settings deployed and verified",
    "Data collection rule implemented with KQL transformation that filters unnecessary log entries",
    "Cost comparison documented between full-send and selective routing approaches",
    "Near real-time SIEM delivery path designed using Event Hub"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Destinos de Diagnostic Settings</summary>

Cada recurso Azure pode ter até 5 diagnostic settings, cada um apontando para um destino diferente. Os quatro destinos suportados sao:

- **Log Analytics workspace**: Para consultas interativas, alertas e integração com Azure Monitor
- **Azure Storage account**: Para arquivamento de longo prazo a baixo custo (suporta lifecycle policies para tiering)
- **Azure Event Hub**: Para streaming para sistemas externos (SIEM, processamento customizado) com entrega quase em tempo real
- **Solução de parceiro**: Para soluções integradas de terceiros (Datadog, Elastic, etc.)

Uma única diagnostic setting pode enviar para múltiplos destinos simultaneamente, mas você não pode filtrar por nível de log dentro de uma categoria no nível da diagnostic setting -- isso requer Data Collection Rules.

</details>

<details>
<summary>Dica 2: Configurando Diagnostic Settings via CLI</summary>

```bash
# Get the resource ID of a Key Vault
KV_ID=$(az keyvault show --name contoso-prod-kv --query id -o tsv)

# Create diagnostic setting sending audit logs to Event Hub and Storage
az monitor diagnostic-settings create \
  --name "security-routing" \
  --resource "$KV_ID" \
  --event-hub-name "security-logs" \
  --event-hub-rule "/subscriptions/{sub}/resourceGroups/rg-logging/providers/Microsoft.EventHub/namespaces/eh-contoso-security/authorizationRules/RootManageSharedAccessKey" \
  --storage-account "/subscriptions/{sub}/resourceGroups/rg-logging/providers/Microsoft.Storage/storageAccounts/stcontosologarchive" \
  --logs '[{"category":"AuditEvent","enabled":true,"retentionPolicy":{"enabled":true,"days":2555}}]'

# Create diagnostic setting sending to Log Analytics
az monitor diagnostic-settings create \
  --name "ops-routing" \
  --resource "$KV_ID" \
  --workspace "/subscriptions/{sub}/resourceGroups/rg-logging/providers/Microsoft.OperationalInsights/workspaces/law-contoso-ops" \
  --logs '[{"category":"AuditEvent","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

</details>

<details>
<summary>Dica 3: Data Collection Rules com Transformacoes KQL</summary>

Data Collection Rules permitem filtrar e transformar dados antes de chegarem ao Log Analytics, reduzindo custos de ingestao. A transformacao usa KQL:

```bash
# Example DCR that filters out health check requests
# The KQL transformation filters rows where the URL path is not "/health"
az monitor data-collection rule create \
  --name "dcr-filter-healthchecks" \
  --resource-group rg-logging \
  --location centralus \
  --data-flows '[{
    "streams": ["Microsoft-Table-AppServiceHTTPLogs"],
    "destinations": ["law-contoso-ops"],
    "transformKql": "source | where CsUriStem != \"/health\" or ScStatus != 200"
  }]' \
  --destinations '{
    "logAnalytics": [{
      "workspaceResourceId": "/subscriptions/{sub}/resourceGroups/rg-logging/providers/Microsoft.OperationalInsights/workspaces/law-contoso-ops",
      "name": "law-contoso-ops"
    }]
  }'
```

</details>

<details>
<summary>Dica 4: Event Hub para Integração com SIEM</summary>

Para entrega quase em tempo real ao SIEM, Event Hub e o destino recomendado:
- Latência: Tipicamente abaixo de 1 minuto da geracao do log ao Event Hub
- O Splunk tem um add-on nativo de input do Azure Event Hub
- Use namespaces dedicados do Event Hub para logs de segurança para garantir isolamento de throughput
- Configure consumer groups: um para Splunk, um para processamento de backup

Consideracao importante de dimensionamento: 1 throughput unit = 1 MB/s de ingresso. Para 50 GB/dia de logs de segurança, você precisa de aproximadamente 1 throughput unit (50 GB / 86400 segundos = ~0.6 MB/s).

</details>

<details>
<summary>Dica 5: Estratégia de Arquivamento em Storage Account</summary>

Para arquivamento de 7 anos ao menor custo:
- Use uma Storage Account com access tier **cool** ou **archive**
- Habilite lifecycle management para mover blobs de cool para archive apos 90 dias
- Custo estimado: tier Archive e aproximadamente $0.00099/GB/mes (~$0.84/GB ao longo de 7 anos)
- Diagnostic settings exportam logs em formato JSON organizados por particoes de data/hora

```bash
# Create storage account with cool default tier
az storage account create \
  --name stcontosologarchive \
  --resource-group rg-logging \
  --location centralus \
  --sku Standard_LRS \
  --access-tier Cool

# Add lifecycle policy to move to archive after 90 days
az storage account management-policy create \
  --account-name stcontosologarchive \
  --resource-group rg-logging \
  --policy '{
    "rules": [{
      "name": "archive-old-logs",
      "type": "Lifecycle",
      "definition": {
        "filters": {"blobTypes": ["blockBlob"]},
        "actions": {
          "baseBlob": {
            "tierToArchive": {"daysAfterModificationGreaterThan": 90}
          }
        }
      }
    }]
  }'
```

</details>

## Recursos de Aprendizagem

- [Diagnostic settings in Azure Monitor](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings)
- [Data collection rules overview](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/data-collection-rule-overview)
- [Data collection transformations](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/data-collection-transformations)
- [Stream Azure monitoring data to Event Hub](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/stream-monitoring-data-event-hubs)
- [Archive Azure resource logs to storage account](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/resource-logs)
- [Azure Monitor cost and usage](https://learn.microsoft.com/en-us/azure/azure-monitor/cost-usage)

## Verificação de Conhecimento

<details>
<summary>1. A Contoso precisa de logs de auditoria de segurança entregues ao seu SIEM Splunk dentro de 5 minutos e arquivados por 7 anos ao menor custo. Qual combinacao de destinos você deve configurar nas diagnostic settings?</summary>

**Azure Event Hub para entrega ao SIEM + Azure Storage Account (tier archive) para retencao de longo prazo.** Event Hub fornece streaming quase em tempo real (latência sub-minuto) com integração nativa do Splunk via o add-on Azure Event Hub input. Storage Account com tier archive fornece o menor custo para retencao de 7 anos a aproximadamente $0.001/GB/mes. Você NAO precisa rotear pelo Log Analytics primeiro -- diagnostic settings podem enviar diretamente para Event Hub e Storage simultaneamente.

</details>

<details>
<summary>2. Uma aplicação gera 100 GB/dia de logs HTTP, mas 60% sao probes de health check (GET /health, status 200). A equipe de operações precisa apenas de logs que não sejam health check para troubleshooting. Como você reduz os custos de ingestao do Log Analytics?</summary>

**Use uma Data Collection Rule (DCR) com uma transformacao KQL** para filtrar requisicoes de health check antes da ingestao. A transformacao `source | where not(CsUriStem == "/health" and ScStatus == 200)` descarta os 60 GB/dia de health probes, reduzindo a ingestao de 100 GB para 40 GB por dia. Isso economiza aproximadamente 60% nos custos de ingestao do Log Analytics. Nota: Se você ainda precisar dos logs completos para conformidade, envie o stream não filtrado para uma Storage Account via uma diagnostic setting separada.

</details>

<details>
<summary>3. Qual é o número máximo de diagnostic settings por recurso Azure, e que restrição isso impoe na arquitetura de roteamento?</summary>

**Cada recurso suporta no máximo 5 diagnostic settings.** Cada setting pode ter um destino de cada tipo (um Log Analytics workspace, uma Storage Account, um Event Hub, uma solução de parceiro). Isso significa que um único recurso pode enviar logs para no máximo 5 Log Analytics workspaces, 5 Storage Accounts e 5 Event Hubs em todas as suas diagnostic settings. Você não pode criar duas settings apontando para o mesmo destino. Esse limite raramente impacta designs, mas deve ser considerado quando múltiplas equipes querem cada uma seu proprio destino.

</details>

<details>
<summary>4. Uma empresa quer enviar logs kube-audit do AKS para o Log Analytics para a equipe de operações e para o Event Hub para a equipe de segurança. A equipe de operações precisa apenas de entradas de nível warning e error, mas a equipe de segurança precisa de todas as entradas. Como você deve projetar isso?</summary>

**Crie duas diagnostic settings no cluster AKS:** Uma envia a categoria kube-audit para o Event Hub (sem filtro, para a equipe de segurança). A segunda envia kube-audit para o Log Analytics com uma Data Collection Rule que aplica uma transformacao KQL filtrando apenas níveis warning e error. Dessa forma, a equipe de segurança recebe dados de auditoria completos quase em tempo real, enquanto os custos de ingestao do Log Analytics sao reduzidos excluindo entradas informacionais que a equipe de operações não precisa para alertas.

</details>

## Limpeza

```bash
# Delete resource groups
az group delete --name rg-logging --yes --no-wait

# If resources were created in existing groups, delete individually:
az monitor diagnostic-settings delete --name "security-routing" --resource "$KV_ID"
az monitor diagnostic-settings delete --name "ops-routing" --resource "$KV_ID"
az monitor data-collection rule delete --name "dcr-filter-healthchecks" --resource-group rg-logging
az eventhubs namespace delete --name eh-contoso-security --resource-group rg-logging
az storage account delete --name stcontosologarchive --resource-group rg-logging --yes
```

---

**Próximo**: [Challenge 03: Design a Monitoring and Alerting Strategy](/docs/az-305/identity-governance-monitoring/challenge-03)
