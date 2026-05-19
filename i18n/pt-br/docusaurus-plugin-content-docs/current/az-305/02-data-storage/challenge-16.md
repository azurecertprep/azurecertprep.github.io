---
sidebar_position: 3
title: "Desafio 16: Projetar Escalabilidade de Banco de Dados"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 16: Projetar Escalabilidade de Banco de Dados

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $8-20 | **Peso no Exame: 20-25%**

:::

## Introdução

GlobalNews Network (GNN) é uma plataforma internacional de noticias com 10 milhões de leitores ativos diarios e apenas 100 editores de conteúdo. A equipe editorial esta baseada exclusivamente na região US East e escreve artigos, faz upload de metadados de midia e gerencia agendamento de conteúdo. Os leitores estao distribuidos globalmente: 40% na América do Norte, 30% na Europa, 20% na Asia-Pacifico e 10% em outras regiões. A plataforma experimenta picos dramaticos de trafego durante eventos de noticias urgentes, onde o trafego de leitura pode saltar para 10x o normal em minutos e sustentar esse nível por horas.

A arquitetura atual usa um único Azure SQL Database (Business Critical, 8 vCores) no US East. Durante operações normais, o banco de dados lida com aproximadamente 50.000 consultas de leitura por segundo e 500 operações de escrita por segundo. Durante picos de noticias urgentes, as consultas de leitura saltam para 500.000 por segundo enquanto as escritas permanecem estaveis em 500/segundo. O banco de dados único atual não consegue lidar com esses picos, resultando em erros de timeout e experiência degradada do usuário durante os momentos mais críticos.

Os requisitos da GNN sao: (1) Escritores devem sempre ter acesso consistente e de baixa latência ao banco de dados no US East; (2) Leitores em todo o mundo devem experimentar latência de consulta inferior a 100ms para recuperação de artigos; (3) O sistema deve lidar com picos de trafego de leitura de 10x sem intervencao manual; (4) Consistência de dados entre regiões pode tolerar até 5 segundos de atraso de replicação para consultas de leitura; (5) A solução deve ser economica, reduzindo quando o trafego normaliza.

## Habilidades do Exame Cobertas

- Recomendar uma solução para escalabilidade de banco de dados

## Tarefas de Design

### Parte 1: Arquitetura de Read Scale-Out

1. Projete uma estratégia de read scale-out que separe as cargas de trabalho de leitura e escrita. Determine como rotear editores de conteúdo para a instância primária (leitura-escrita) e leitores para replicas somente leitura.
2. Avalie as seguintes opcoes para fornecer replicas de leitura e recomende a melhor combinacao para os requisitos da GNN:
   - Replicas de leitura integradas (camada Business Critical)
   - Active geo-replication
   - Named replicas Hyperscale
   - Auto-failover groups com roteamento de read-intent
3. Determine o número e posicionamento ideais de replicas de leitura para servir leitores na América do Norte, Europa e Asia-Pacifico com latência inferior a 100ms.
4. Projete a estratégia de connection string para aplicações rotearem trafego de leitura para replicas (ApplicationIntent=ReadOnly, ou conexão direta para geo-replicas).

### Parte 2: Tratamento de Picos de Trafego

5. Projete uma abordagem de auto-scaling para replicas de leitura durante eventos de noticias urgentes. Considere named replicas Hyperscale que podem ser escaladas independentemente é criadas sob demanda.
6. Avalie se elastic pools poderiam ajudar a gerenciar uma frota de bancos de dados de replicas de leitura durante períodos de pico.
7. Projete uma camada de cache (Azure Cache for Redis ou cache em nível de aplicação) para reduzir a carga do banco de dados durante picos. Determine quais consultas se beneficiam mais do cache e valores de TTL apropriados.
8. Calcule a capacidade de replica de leitura necessária durante um pico de 10x (500.000 consultas/segundo) e projete um plano de escalonamento que alcance isso sem provisionar excessivamente durante períodos normais.

### Parte 3: Escalabilidade de Escrita e Distribuição de Dados

9. Avalie se a carga de trabalho de escrita (500 operações/segundo) requer escalonamento além de um único primário. Discuta cenários onde sharding ou particionamento de escrita poderiam ser necessários no futuro.
10. Projete uma topologia de geo-replicação que forneça tanto recuperação de desastres quanto read scale-out. Determine o modo de replicação apropriado (sincrono vs assincrono) e atraso de replicação aceitavel.
11. Proponha uma estratégia de monitoramento e alertas para detectar quando replicas de leitura ficam atrasadas em relação ao primário e quando o trafego se aproxima dos limites de capacidade. Identifique metricas-chave para monitorar (atraso de replicação, utilizacao de DTU/vCore, contagem de conexões).

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-16"
  items={[
    "Designed read/write separation with clear routing strategy for editors vs readers",
    "Selected appropriate replica technology with justification (geo-replication, named replicas, or both)",
    "Placed read replicas in regions matching reader distribution for sub-100ms latency",
    "Designed auto-scaling strategy for 10x traffic spikes without manual intervention",
    "Included caching layer to reduce direct database load during spikes",
    "Documented monitoring strategy with key metrics and alerting thresholds"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Opcoes de Replica de Leitura</summary>

Azure SQL Database oferece múltiplos mecanismos de replica de leitura: (1) A camada Business Critical inclui uma replica de leitura integrada gratuita (mesma região); (2) Active geo-replication suporta até 4 secundários legiveis em qualquer região; (3) A camada Hyperscale suporta até 30 named replicas com escalonamento de computacao independente; (4) Auto-failover groups fornecem um endpoint de listener único de leitura-escrita e somente-leitura com failover automático. Para os leitores globais da GNN, geo-replicação ou named replicas Hyperscale em múltiplas regiões sao necessárias.

</details>

<details>
<summary>Dica 2: Hyperscale para Read Scale Elástico</summary>

Named replicas Hyperscale sao ideais para cenários que requerem read scale-out elástico. Diferente das geo-replicas regulares, named replicas podem ser: (1) escaladas independentemente (contagem de vCore diferente do primário), (2) criadas e deletadas dinamicamente (para cenários de burst), (3) direcionadas diretamente via seu próprio endpoint de conexão, (4) colocadas na mesma região do primário. Para tratamento de picos, você pode criar named replicas adicionais sob demanda e rotear trafego excedente para elas.

</details>

<details>
<summary>Dica 3: Roteamento de Conexão</summary>

Para roteamento de read-intent, aplicações conectam com `ApplicationIntent=ReadOnly` na connection string para serem roteadas para uma replica de leitura. Com auto-failover groups, você obtem dois endpoints de listener: `<fog-name>.database.windows.net` (leitura-escrita) e `<fog-name>.secondary.database.windows.net` (somente-leitura). Para geo-replicas sem failover groups, conecte diretamente ao endpoint de cada replica.

</details>

<details>
<summary>Dica 4: Estratégia de Cache</summary>

Azure Cache for Redis pode descarregar consultas de leitura repetitivas do banco de dados. Para uma plataforma de noticias, considere cache de: conteúdo de artigos (TTL: 60 segundos), listas/feeds de artigos (TTL: 30 segundos), artigos em alta/populares (TTL: 15 segundos). Durante noticias urgentes, TTLs curtos garantem frescor enquanto reduzem dramaticamente a carga do banco de dados. Um cache bem projetado pode absorver 80-90% do trafego de leitura durante picos.

</details>

<details>
<summary>Dica 5: Atraso de Geo-Replicação</summary>

Active geo-replication no Azure SQL Database usa replicação assincrona. O atraso tipico de replicação e inferior a 5 segundos, mas pode aumentar durante alto throughput de escrita ou transações grandes. Você pode monitorar o atraso usando a DMV `sys.dm_geo_replication_link_status`, que reporta `replication_lag_sec`. Para a tolerância de 5 segundos da GNN, geo-replicação assincrona e apropriada. Commit sincrono esta disponível apenas dentro da mesma região (HA zone-redundant Business Critical).

</details>

## Recursos de Aprendizagem

- [Read scale-out in Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/read-scale-out)
- [Active geo-replication](https://learn.microsoft.com/en-us/azure/azure-sql/database/active-geo-replication-overview)
- [Hyperscale named replicas](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-hyperscale-replicas)
- [Auto-failover groups overview](https://learn.microsoft.com/en-us/azure/azure-sql/database/auto-failover-group-overview)
- [Azure Cache for Redis overview](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview)
- [Elastic pools for Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-pool-overview)

## Verificação de Conhecimento

<details>
<summary>1. Uma aplicação global precisa de replicas de leitura em 3 regiões com a capacidade de escalar independentemente a computacao de cada replica. Qual recurso do Azure SQL Database você deve usar?</summary>

**Named replicas Hyperscale ou active geo-replication.** Para escalonamento independente de computacao, named replicas Hyperscale sao ideais (até 30 replicas, cada uma com alocacao independente de vCore). Active geo-replication também suporta secundários legiveis em até 4 regiões, mas com controle de escalonamento menos granular. Se o escalonamento independente por replica e a prioridade, named replicas Hyperscale sao a melhor escolha.

</details>

<details>
<summary>2. Como ApplicationIntent=ReadOnly funciona em uma connection string do Azure SQL Database?</summary>

**Ele roteia a conexão para uma replica somente-leitura em vez do primário.** Quando um banco de dados Business Critical ou Hyperscale tem replicas de leitura habilitadas, conexões com `ApplicationIntent=ReadOnly` sao automaticamente direcionadas para uma replica somente-leitura. Isso descarrega consultas de relatórios e analytics do primário sem requerer endpoints de conexão separados. A replica serve dados de read-committed snapshot com atraso mínimo.

</details>

<details>
<summary>3. Durante um pico subito de trafego de 10x, qual é a maneira mais rápida de adicionar capacidade de leitura a um banco de dados Azure SQL Hyperscale?</summary>

**Criar named replicas Hyperscale adicionais.** Named replicas podem ser provisionadas em minutos e imediatamente servir trafego de leitura da camada de armazenamento compartilhado do Hyperscale (page servers). Elas não requerem uma copia completa de dados porque usam a mesma infraestrutura subjacente de page server. Elas também podem ser deletadas apos o pico diminuir para reduzir custos.

</details>

<details>
<summary>4. Qual é o atraso tipico de replicação para active geo-replication no Azure SQL Database?</summary>

**Menos de 5 segundos em condições normais.** Active geo-replication usa replicação assincrona para bancos de dados secundários. Enquanto o atraso tipico e inferior a 5 segundos, pode aumentar durante períodos de alto throughput de transações, transações de longa duracao ou quando o secundário esta sob carga pesada de leitura. Monitore o atraso com `sys.dm_geo_replication_link_status`. Replicação sincrona esta disponível apenas dentro da mesma região para alta disponibilidade (Business Critical zone-redundant).

</details>

## Limpeza

```bash
# Delete the resource group containing all GNN database resources
az group delete --name rg-gnn-databases --yes --no-wait

# Delete the Redis cache resource group (if created separately)
az group delete --name rg-gnn-cache --yes --no-wait
```

---

**Próximo**: [Challenge 17: Design Database Protection](/docs/az-305/data-storage/challenge-17)
