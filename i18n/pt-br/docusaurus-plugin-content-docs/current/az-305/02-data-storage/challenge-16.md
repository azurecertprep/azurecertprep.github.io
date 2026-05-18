---
sidebar_position: 3
title: "Challenge 16: Design Database Scalability"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 16: Design Database Scalability

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $8-20 | **Peso no Exame: 20-25%**

:::

## Introducao

GlobalNews Network (GNN) e uma plataforma internacional de noticias com 10 milhoes de leitores ativos diarios e apenas 100 editores de conteudo. A equipe editorial esta baseada exclusivamente na regiao US East e escreve artigos, faz upload de metadados de midia e gerencia agendamento de conteudo. Os leitores estao distribuidos globalmente: 40% na America do Norte, 30% na Europa, 20% na Asia-Pacifico e 10% em outras regioes. A plataforma experimenta picos dramaticos de trafego durante eventos de noticias urgentes, onde o trafego de leitura pode saltar para 10x o normal em minutos e sustentar esse nivel por horas.

A arquitetura atual usa um unico Azure SQL Database (Business Critical, 8 vCores) no US East. Durante operacoes normais, o banco de dados lida com aproximadamente 50.000 consultas de leitura por segundo e 500 operacoes de escrita por segundo. Durante picos de noticias urgentes, as consultas de leitura saltam para 500.000 por segundo enquanto as escritas permanecem estaveis em 500/segundo. O banco de dados unico atual nao consegue lidar com esses picos, resultando em erros de timeout e experiencia degradada do usuario durante os momentos mais criticos.

Os requisitos da GNN sao: (1) Escritores devem sempre ter acesso consistente e de baixa latencia ao banco de dados no US East; (2) Leitores em todo o mundo devem experimentar latencia de consulta inferior a 100ms para recuperacao de artigos; (3) O sistema deve lidar com picos de trafego de leitura de 10x sem intervencao manual; (4) Consistencia de dados entre regioes pode tolerar ate 5 segundos de atraso de replicacao para consultas de leitura; (5) A solucao deve ser economica, reduzindo quando o trafego normaliza.

## Habilidades do Exame Cobertas

- Recomendar uma solucao para escalabilidade de banco de dados

## Tarefas de Design

### Parte 1: Arquitetura de Read Scale-Out

1. Projete uma estrategia de read scale-out que separe as cargas de trabalho de leitura e escrita. Determine como rotear editores de conteudo para a instancia primaria (leitura-escrita) e leitores para replicas somente leitura.
2. Avalie as seguintes opcoes para fornecer replicas de leitura e recomende a melhor combinacao para os requisitos da GNN:
   - Replicas de leitura integradas (camada Business Critical)
   - Active geo-replication
   - Named replicas Hyperscale
   - Auto-failover groups com roteamento de read-intent
3. Determine o numero e posicionamento ideais de replicas de leitura para servir leitores na America do Norte, Europa e Asia-Pacifico com latencia inferior a 100ms.
4. Projete a estrategia de connection string para aplicacoes rotearem trafego de leitura para replicas (ApplicationIntent=ReadOnly, ou conexao direta para geo-replicas).

### Parte 2: Tratamento de Picos de Trafego

5. Projete uma abordagem de auto-scaling para replicas de leitura durante eventos de noticias urgentes. Considere named replicas Hyperscale que podem ser escaladas independentemente e criadas sob demanda.
6. Avalie se elastic pools poderiam ajudar a gerenciar uma frota de bancos de dados de replicas de leitura durante periodos de pico.
7. Projete uma camada de cache (Azure Cache for Redis ou cache em nivel de aplicacao) para reduzir a carga do banco de dados durante picos. Determine quais consultas se beneficiam mais do cache e valores de TTL apropriados.
8. Calcule a capacidade de replica de leitura necessaria durante um pico de 10x (500.000 consultas/segundo) e projete um plano de escalonamento que alcance isso sem provisionar excessivamente durante periodos normais.

### Parte 3: Escalabilidade de Escrita e Distribuicao de Dados

9. Avalie se a carga de trabalho de escrita (500 operacoes/segundo) requer escalonamento alem de um unico primario. Discuta cenarios onde sharding ou particionamento de escrita poderiam ser necessarios no futuro.
10. Projete uma topologia de geo-replicacao que forneca tanto recuperacao de desastres quanto read scale-out. Determine o modo de replicacao apropriado (sincrono vs assincrono) e atraso de replicacao aceitavel.
11. Proponha uma estrategia de monitoramento e alertas para detectar quando replicas de leitura ficam atrasadas em relacao ao primario e quando o trafego se aproxima dos limites de capacidade. Identifique metricas-chave para monitorar (atraso de replicacao, utilizacao de DTU/vCore, contagem de conexoes).

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

Azure SQL Database oferece multiplos mecanismos de replica de leitura: (1) A camada Business Critical inclui uma replica de leitura integrada gratuita (mesma regiao); (2) Active geo-replication suporta ate 4 secundarios legiveis em qualquer regiao; (3) A camada Hyperscale suporta ate 30 named replicas com escalonamento de computacao independente; (4) Auto-failover groups fornecem um endpoint de listener unico de leitura-escrita e somente-leitura com failover automatico. Para os leitores globais da GNN, geo-replicacao ou named replicas Hyperscale em multiplas regioes sao necessarias.

</details>

<details>
<summary>Dica 2: Hyperscale para Read Scale Elastico</summary>

Named replicas Hyperscale sao ideais para cenarios que requerem read scale-out elastico. Diferente das geo-replicas regulares, named replicas podem ser: (1) escaladas independentemente (contagem de vCore diferente do primario), (2) criadas e deletadas dinamicamente (para cenarios de burst), (3) direcionadas diretamente via seu proprio endpoint de conexao, (4) colocadas na mesma regiao do primario. Para tratamento de picos, voce pode criar named replicas adicionais sob demanda e rotear trafego excedente para elas.

</details>

<details>
<summary>Dica 3: Roteamento de Conexao</summary>

Para roteamento de read-intent, aplicacoes conectam com `ApplicationIntent=ReadOnly` na connection string para serem roteadas para uma replica de leitura. Com auto-failover groups, voce obtem dois endpoints de listener: `<fog-name>.database.windows.net` (leitura-escrita) e `<fog-name>.secondary.database.windows.net` (somente-leitura). Para geo-replicas sem failover groups, conecte diretamente ao endpoint de cada replica.

</details>

<details>
<summary>Dica 4: Estrategia de Cache</summary>

Azure Cache for Redis pode descarregar consultas de leitura repetitivas do banco de dados. Para uma plataforma de noticias, considere cache de: conteudo de artigos (TTL: 60 segundos), listas/feeds de artigos (TTL: 30 segundos), artigos em alta/populares (TTL: 15 segundos). Durante noticias urgentes, TTLs curtos garantem frescor enquanto reduzem dramaticamente a carga do banco de dados. Um cache bem projetado pode absorver 80-90% do trafego de leitura durante picos.

</details>

<details>
<summary>Dica 5: Atraso de Geo-Replicacao</summary>

Active geo-replication no Azure SQL Database usa replicacao assincrona. O atraso tipico de replicacao e inferior a 5 segundos, mas pode aumentar durante alto throughput de escrita ou transacoes grandes. Voce pode monitorar o atraso usando a DMV `sys.dm_geo_replication_link_status`, que reporta `replication_lag_sec`. Para a tolerancia de 5 segundos da GNN, geo-replicacao assincrona e apropriada. Commit sincrono esta disponivel apenas dentro da mesma regiao (HA zone-redundant Business Critical).

</details>

## Recursos de Aprendizagem

- [Read scale-out in Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/read-scale-out)
- [Active geo-replication](https://learn.microsoft.com/en-us/azure/azure-sql/database/active-geo-replication-overview)
- [Hyperscale named replicas](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-hyperscale-replicas)
- [Auto-failover groups overview](https://learn.microsoft.com/en-us/azure/azure-sql/database/auto-failover-group-overview)
- [Azure Cache for Redis overview](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview)
- [Elastic pools for Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-pool-overview)

## Verificacao de Conhecimento

<details>
<summary>1. Uma aplicacao global precisa de replicas de leitura em 3 regioes com a capacidade de escalar independentemente a computacao de cada replica. Qual recurso do Azure SQL Database voce deve usar?</summary>

**Named replicas Hyperscale ou active geo-replication.** Para escalonamento independente de computacao, named replicas Hyperscale sao ideais (ate 30 replicas, cada uma com alocacao independente de vCore). Active geo-replication tambem suporta secundarios legiveis em ate 4 regioes, mas com controle de escalonamento menos granular. Se o escalonamento independente por replica e a prioridade, named replicas Hyperscale sao a melhor escolha.

</details>

<details>
<summary>2. Como ApplicationIntent=ReadOnly funciona em uma connection string do Azure SQL Database?</summary>

**Ele roteia a conexao para uma replica somente-leitura em vez do primario.** Quando um banco de dados Business Critical ou Hyperscale tem replicas de leitura habilitadas, conexoes com `ApplicationIntent=ReadOnly` sao automaticamente direcionadas para uma replica somente-leitura. Isso descarrega consultas de relatorios e analytics do primario sem requerer endpoints de conexao separados. A replica serve dados de read-committed snapshot com atraso minimo.

</details>

<details>
<summary>3. Durante um pico subito de trafego de 10x, qual e a maneira mais rapida de adicionar capacidade de leitura a um banco de dados Azure SQL Hyperscale?</summary>

**Criar named replicas Hyperscale adicionais.** Named replicas podem ser provisionadas em minutos e imediatamente servir trafego de leitura da camada de armazenamento compartilhado do Hyperscale (page servers). Elas nao requerem uma copia completa de dados porque usam a mesma infraestrutura subjacente de page server. Elas tambem podem ser deletadas apos o pico diminuir para reduzir custos.

</details>

<details>
<summary>4. Qual e o atraso tipico de replicacao para active geo-replication no Azure SQL Database?</summary>

**Menos de 5 segundos em condicoes normais.** Active geo-replication usa replicacao assincrona para bancos de dados secundarios. Enquanto o atraso tipico e inferior a 5 segundos, pode aumentar durante periodos de alto throughput de transacoes, transacoes de longa duracao ou quando o secundario esta sob carga pesada de leitura. Monitore o atraso com `sys.dm_geo_replication_link_status`. Replicacao sincrona esta disponivel apenas dentro da mesma regiao para alta disponibilidade (Business Critical zone-redundant).

</details>

## Limpeza

```bash
# Delete the resource group containing all GNN database resources
az group delete --name rg-gnn-databases --yes --no-wait

# Delete the Redis cache resource group (if created separately)
az group delete --name rg-gnn-cache --yes --no-wait
```

---

**Proximo**: [Challenge 17: Design Database Protection](/docs/az-305/data-storage/challenge-17)
