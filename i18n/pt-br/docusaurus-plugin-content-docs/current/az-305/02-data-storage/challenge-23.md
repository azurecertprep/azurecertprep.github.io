---
sidebar_position: 10
title: "Desafio 23: Projetar uma Solução de Análise de Dados"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 23: projetar uma solução de análise de dados

:::info Tempo Estimado e Custo

**75-90 min** | **Custo estimado**: $8-15 | **Peso no Exame: 20-25%**

:::

## Introdução

TransGlobal Logistics opera uma frota de 10.000 caminhoes na América do Norte, gerando eventos de telemetria GPS a cada 5 segundos (2 milhões de eventos por segundo no pico). A empresa tem três requisitos de analytics distintos que variam dramaticamente em latência, volume e perfil de usuário:

Primeiro, o centro de operações precisa de rastreamento de frota em tempo real com latência inferior a um minuto para detectar desvios de rota, prever atrasos e acionar alertas quando caminhoes entram em zonas restritas. Segundo, gerentes regionais precisam de dashboards operacionais diarios mostrando desempenho de entregas, eficiência de combustivel e horas dos motoristas - atualizados toda manha até as 7h com dados do dia anterior. Terceiro, a equipe de data science retreina modelos de ML mensalmente usando 6 meses de dados historicos de rotas para otimizar rotas de entrega e prever necessidades de manutenção.

Cada carga de trabalho tem diferente tolerância de custo: o sistema em tempo real justifica precos premium por velocidade, os dashboards precisam de custos previsiveis, e o treinamento de ML deve minimizar custos mesmo se levar mais tempo para processar. Seu desafio é projetar uma arquitetura de analytics que atenda todas as três necessidades eficientemente sem provisionar excessivamente nenhuma carga de trabalho individual.

## Habilidades do exame cobertas

- Recomendar uma solução para análise de dados

## Tarefas de design

### Parte 1: projetar Analytics em tempo real (Rastreamento de frota)

1. Projete a camada de ingestao para 2 milhões de eventos/segundo de telemetria GPS:
   - Compare Azure Event Hubs (Standard vs Premium vs Dedicated) para este throughput
   - Calcule o número necessário de throughput units ou processing units
   - Documente a estratégia de particao para garantias de ordenamento por caminhao (particionar por truck ID)

2. Projete a camada de processamento de stream:
   - Compare Azure Stream Analytics vs Apache Spark Structured Streaming (no Databricks ou Synapse Spark)
   - Para Stream Analytics: projete funções de janelamento (tumbling, hopping, sliding) para detecção de desvio de rota
   - Defina os output sinks: dashboard em tempo real (Power BI streaming dataset), sistema de alertas (Azure Functions) e armazenamento warm (Cosmos DB para posicoes recentes)

3. Projete a lógica de alertas:
   - Detecção de violacao de geofence (caminhao entra em zona restrita)
   - Detecção de anomalia de velocidade (eventos de desaceleracao subita)
   - Predicao de atraso de entrega (posicao atual + distância restante vs horario agendado)

### Parte 2: projetar Batch Analytics (Dashboards operacionais)

4. Projete a camada de data warehouse para dashboards diarios:
   - Compare dedicated SQL pool vs serverless SQL pool no Synapse Analytics:
     - Dedicated: DWU provisionado, desempenho previsivel, melhor para consultas concorrentes
     - Serverless: pay-per-query, auto-scales, melhor para exploracao ad-hoc
   - Selecione a opcao apropriada para 50 gerentes consultando dashboards simultaneamente toda manha
   - Projete o star schema com tabelas fato (entregas, eventos de combustivel, turnos de motoristas) e dimensoes (caminhoes, rotas, motoristas, tempo)

5. Projete a integração com Power BI:
   - Compare DirectQuery (consultas ao vivo contra o Synapse) vs modo Import (refresh agendado)
   - Projete o modelo semantico com tabelas de agregacao apropriadas para renderizacao rápida de dashboard
   - Documente o cronograma de refresh e requisitos de frescor de dados

6. Projete a camada de transformacao de dados que prepara telemetria bruta para consumo dos dashboards:
   - Agregar eventos GPS em resumos de viagem (início, fim, distância, duracao, paradas)
   - Calcular KPIs: taxa de entrega no prazo, eficiência de combustivel (milhas por galao), compliance de horas dos motoristas
   - Agendar transformacoes para completar até as 6h para disponibilidade dos dashboards as 7h

### Parte 3: projetar Analytics avancado (Treinamento de modelo ml)

7. Projete o data lake histórico para treinamento ML:
   - Comparacao de formato de armazenamento: Parquet vs Delta Lake vs CSV para 6 meses de dados de rotas (~50TB)
   - Estratégia de particionamento: por data e região para scans de intervalo eficientes
   - Projete a arquitetura medallion (Bronze/Silver/Gold) para refinamento progressivo de dados

8. Projete a camada de computacao para treinamento mensal de modelos:
   - Compare Azure Databricks vs Synapse Spark pools para cargas de trabalho ML em larga escala
   - Avalie dimensionamento de cluster: auto-scaling com spot instances para minimizar custo
   - Documente os trade-offs: Databricks (integração MLflow, notebooks colaborativos, Unity Catalog) vs Synapse Spark (integrado com workspace Synapse, governança mais simples)

9. Projete otimização de custos para a carga de trabalho ML:
   - Use spot instances / nos de baixa prioridade para jobs de treinamento tolerantes a falhas
   - Agende treinamento durante horarios fora do pico para potencial economia de custos
   - Implemente auto-terminacao de cluster apos período de inatividade
   - Calcule o custo mensal de computacao para uma execução de treinamento de 72 horas em um cluster de 20 nos

### Parte 4: arquitetura unificada

10. Projete como as três cargas de trabalho de analytics compartilham infraestrutura:
    - Data Lake Storage Gen2 compartilhado como a camada de armazenamento central (zonas Bronze/Silver/Gold)
    - Event Hubs como o ponto único de ingestao, com Stream Analytics consumindo em tempo real e Data Factory capturando para o lake para batch
    - Defina o fluxo de dados da ingestao em tempo real através do processamento batch até o consumo ML

11. Crie um modelo de custo para a arquitetura completa de analytics:
    - Tempo real: Event Hubs + Stream Analytics + Cosmos DB hot store
    - Batch: Synapse dedicated SQL pool (pausado fora do horario comercial) + Power BI
    - ML: Databricks/Synapse Spark (burst mensal) + ADLS Gen2 storage
    - Identifique quais componentes podem ser pausados/reduzidos quando não estao em uso

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-23"
  items={[
    "Real-time ingestion architecture sized for 2M events/second with partition strategy documented",
    "Stream processing solution selected with windowing design for route deviation detection",
    "Dedicated vs serverless SQL pool comparison with selection rationale for dashboard workload",
    "ML compute platform selected with cost optimization strategy (spot instances, auto-termination)",
    "Unified architecture diagram showing data flow from ingestion through all three analytics tiers",
    "Monthly cost model for complete architecture with identification of pause/scale opportunities"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Dimensionamento de Throughput do Event Hubs</summary>

Event Hubs Standard tier fornece 1 MB/s de ingress e 2 MB/s de egress por throughput unit (TU), com máximo de 40 TUs por namespace (auto-inflate). Para 2M eventos/segundo a ~200 bytes cada, isso é aproximadamente 400 MB/s de ingress - bem além da capacidade da camada Standard. Event Hubs Premium usa Processing Units (PU) com limites mais altos, ou Event Hubs Dedicated fornece capacidade reservada. Calcule: (eventos/segundo * tamanho do evento) para determinar o throughput necessário, depois selecione a camada que suporta.

</details>

<details>
<summary>Dica 2: Stream Analytics vs Spark Streaming</summary>

Azure Stream Analytics é um serviço totalmente gerenciado com linguagem de consulta tipo SQL, funções de janelamento integradas e sem gerenciamento de cluster. E ideal quando a equipe tem habilidades SQL e precisa de processamento sub-segundo com ordenamento garantido. Spark Structured Streaming (Databricks/Synapse) oferece mais flexibilidade (Python/Scala), cenários complexos de ML-in-stream e semanticas exactly-once, mas requer gerenciamento de cluster e tem latência mais alta (micro-batch, tipicamente 1-10 segundos). Para detecção simples de geofence e agregacao, Stream Analytics e mais simples e mais barato.

</details>

<details>
<summary>Dica 3: Dedicated vs Serverless SQL Pool</summary>

Dedicated SQL pool (anteriormente SQL DW) e provisionado em Data Warehouse Units (DWU) e cobrado por hora independente de consultas rodarem ou não. Excele em cargas de trabalho de consultas previsiveis e concorrentes (como 50 gerentes acessando dashboards simultaneamente). Serverless SQL pool e pay-per-query (por TB de dados processados) sem provisionamento - ideal para exploracao ad-hoc ou consultas infrequentes. Para o cenário de dashboard com alta concorrencia toda manha, dedicated e mais previsivel. Dica: pause o dedicated pool fora do horario comercial (noites/finais de semana) para economizar até 60% em custos de computacao.

</details>

<details>
<summary>Dica 4: Delta Lake para Cargas de Trabalho ML</summary>

Delta Lake adiciona transações ACID, imposicao de esquema e time travel a arquivos Parquet no data lake. Para treinamento ML, os beneficios do Delta Lake incluem: capacidade de ler um snapshot consistente enquanto novos dados estao sendo escritos, evolucao de esquema conforme o formato de telemetria muda, e upserts eficientes para a camada Silver. O leve overhead versus Parquet bruto e negligivel para leituras de treinamento ML e os beneficios de confiabilidade sao significativos para uma plataforma de dados de produção.

</details>

<details>
<summary>Dica 5: Zonas da Arquitetura Medallion</summary>

Zona Bronze: dados brutos como-estao das fontes (JSON, CSV, Parquet bruto). Zona Silver: dados limpos, deduplicados, padronizados (esquema validado, tratamento de nulos, conversoes de tipo). Zona Gold: agregados de nível de negocio e tabelas de features prontas para consumo (resumos de viagem, KPIs diarios, vetores de features ML). Cada zona é uma estrutura de pastas no ADLS Gen2, tipicamente particionada por data. A equipe ML le de Silver/Gold; dashboards leem de Gold; tempo real escreve em Bronze.

</details>

## Recursos de aprendizagem

- [Azure Event Hubs overview](https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-about)
- [Azure Stream Analytics overview](https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-introduction)
- [Synapse Analytics dedicated SQL pool](https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/sql-data-warehouse-overview-what-is)
- [Serverless SQL pool in Azure Synapse](https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/on-demand-workspace-overview)
- [Azure Databricks overview](https://learn.microsoft.com/en-us/azure/databricks/introduction/)
- [Delta Lake on Azure](https://learn.microsoft.com/en-us/azure/databricks/delta/)
- [Power BI integration with Synapse](https://learn.microsoft.com/en-us/azure/synapse-analytics/get-started-visualize-power-bi)

## Verificação de conhecimento

<details>
<summary>1. TransGlobal precisa detectar quando um caminhao desvia de sua rota planejada dentro de 30 segundos do desvio ocorrer. Qual serviço Azure e mais apropriado para isso, e por que?</summary>

**Azure Stream Analytics com um dataset de referência geoespacial.** Stream Analytics suporta funções geoespaciais integradas (ST_WITHIN, ST_DISTANCE) que podem comparar coordenadas GPS de entrada contra poligonos de geofence armazenados como dados de referência. Com janelas temporais tao pequenas quanto 1 segundo, pode detectar desvios dentro do requisito de 30 segundos. A linguagem de consulta tipo SQL o torna acessível para a equipe, e a natureza totalmente gerenciada elimina operações de cluster. Spark Streaming também poderia funcionar mas introduz complexidade desnecessaria e latência mais alta para este cenário simples de correspondencia de padrões.

</details>

<details>
<summary>2. Os dashboards diarios sao consultados por 50 gerentes simultaneamente entre 7h e 9h. Fora desses horarios, ninguém consulta o warehouse. Qual opcao de SQL pool minimiza custos enquanto garante desempenho consistente durante horarios de pico?</summary>

**Dedicated SQL pool com auto-pause ou agendamento de pausa manual.** Durante o pico das 7-9h, dedicated SQL pool fornece computacao DWU garantida para desempenho de consulta consistente entre 50 usuários concorrentes. Fora desses horarios, o pool pode ser pausado (zero custo de computacao, apenas cobrangas de armazenamento). Serverless SQL pool escalaria por consulta mas o desempenho pode variar com 50 consultas de dashboard complexas concorrentes, e o custo se torna imprevisivel. O padrão de horarios de pico previsiveis com zero uso fora do pico torna o dedicated pool com pausa/retomada a escolha mais economica.

</details>

<details>
<summary>3. A equipe de data science precisa processar 50TB de dados GPS historicos para treinamento ML mensal. Eles querem minimizar custos e podem tolerar que o job leve até 72 horas. Qual estratégia de computacao devem usar?</summary>

**Azure Databricks com spot instances auto-scaling (ou Synapse Spark com nos de baixa prioridade).** Spot instances fornecem até 60-90% de desconto sobre precos on-demand. Como treinamento ML e tolerante a falhas (checkpointing permite reiniciar do último checkpoint se uma spot instance e recuperada), este é um caso de uso ideal para computacao spot. Auto-scaling garante que o cluster cresce quando o processamento de dados esta ativo e diminui durante esperas de I/O. Combinado com auto-terminacao apos 15-30 minutos de inatividade, isso minimiza computacao desperdicada. Agendar jobs durante horarios fora do pico (noites/finais de semana) pode reduzir ainda mais o risco de recuperação de spot instance.

</details>

<details>
<summary>4. Qual é a vantagem de usar a arquitetura medallion (Bronze/Silver/Gold) em vez de carregar dados brutos diretamente no data warehouse?</summary>

**Separacao de preocupações, reprocessabilidade e suporte a múltiplos consumidores.** Bronze preserva dados brutos exatamente como recebidos (trilha de auditoria, capacidade de reprocessamento). Silver fornece uma camada limpa e validada que múltiplos consumidores podem usar (dashboards, ML, consultas ad-hoc) sem cada um reimplementar lógica de qualidade de dados. Gold fornece visoes otimizadas para casos de uso específicos. Se a lógica de transformacao mudar, você reprocessa de Bronze sem re-ingerir dos sistemas de origem. Isso desacopla a confiabilidade de ingestao da corretude de transformacao e permite que cada carga de trabalho de analytics consuma dados no nível de qualidade apropriado.

</details>

## Laboratório de validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um resource group é uma storage account para o workspace Synapse:

```bash
az group create --name rg-az305-challenge23 --location eastus

az storage account create \
  --name staz305ch23$RANDOM \
  --resource-group rg-az305-challenge23 \
  --sku Standard_LRS \
  --kind StorageV2 \
  --enable-hierarchical-namespace true
```

2. Implante um workspace Synapse com um endpoint SQL serverless:

```bash
az synapse workspace create \
  --name synw-az305-ch23 \
  --resource-group rg-az305-challenge23 \
  --storage-account <your-account-name> \
  --file-system synapsefs \
  --sql-admin-login sqladmin \
  --sql-admin-login-password "P@ssw0rd2024!" \
  --location eastus
```

3. Abra o firewall para permitir seu IP de cliente:

```bash
az synapse workspace firewall-rule create \
  --name AllowClient \
  --resource-group rg-az305-challenge23 \
  --workspace-name synw-az305-ch23 \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255
```

4. Verifique que o workspace esta pronto e exiba sua identidade gerenciada e endpoints SQL:

```bash
az synapse workspace show \
  --name synw-az305-ch23 \
  --resource-group rg-az305-challenge23 \
  --query "{name:name, sqlEndpoint:connectivityEndpoints.sql, sqlOnDemand:connectivityEndpoints.sqlOnDemand, identity:identity.principalId}"
```

:::tip
Esta mini-implantacao válida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge23 --yes --no-wait
```

---

**Próximo**: [Challenge 24: Design an End-to-End Data Platform](/docs/az-305/data-storage/challenge-24)
