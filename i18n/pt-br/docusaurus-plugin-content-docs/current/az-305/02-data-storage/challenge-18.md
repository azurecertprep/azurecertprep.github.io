---
sidebar_position: 5
title: "Challenge 18: Design a Semi-Structured Data Solution"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 18: Design a Semi-Structured Data Solution

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $10-25 | **Peso no Exame: 20-25%**

:::

## Introducao

SensorGrid e uma plataforma de IoT industrial que monitora 50.000 dispositivos implantados em instalacoes de manufatura na America do Norte, Europa e Asia-Pacifico. Cada dispositivo transmite eventos de telemetria (temperatura, vibracao, pressao, umidade) a cada 5 segundos, resultando em aproximadamente 1 milhao de eventos por segundo no pico. Os eventos sao documentos JSON com esquema variavel: diferentes tipos de dispositivos incluem diferentes leituras de sensores, versoes de firmware adicionam novos campos ao longo do tempo, e alguns eventos incluem arrays aninhados de sub-leituras.

A plataforma tem dois padroes de acesso primarios. Primeiro, operadores precisam de dashboards em tempo real mostrando o estado mais recente de qualquer dispositivo com latencia de leitura inferior a 10ms (leituras pontuais por device ID). Segundo, engenheiros executam consultas analiticas historicas abrangendo dias ou semanas de dados para uma instalacao ou tipo de dispositivo especifico, onde tempos de resposta de 2-5 segundos sao aceitaveis. O volume de dados atual e 2TB e cresce 500GB por mes.

O orcamento da SensorGrid para a camada de dados e $3.000/mes. O CTO quer minimizar a sobrecarga operacional (sem gerenciar clusters ou shards manualmente) e requer disponibilidade multi-regiao com failover automatico. A equipe de engenharia tem experiencia com sintaxe de consulta MongoDB de um projeto anterior, mas esta aberta a outras APIs se os trade-offs justificarem. A politica de retencao de dados requer dados quentes por 90 dias, apos os quais devem ser arquivados ou movidos para armazenamento frio para controlar custos.

## Habilidades do Exame Cobertas

- Recomendar uma solucao para armazenamento de dados semi-estruturados

## Tarefas de Design

### Parte 1: Selecao de Servico e API

1. Avalie Azure Cosmos DB como o armazenamento de dados primario para os requisitos da SensorGrid. Compare-o com alternativas (Azure Table Storage, MongoDB Atlas no Azure) e justifique sua recomendacao.
2. Selecione a API Cosmos DB mais apropriada para esta carga de trabalho. Compare as APIs NoSQL (nativa), MongoDB, PostgreSQL, Cassandra e Gremlin. Considere a experiencia da equipe com MongoDB, os padroes de consulta necessarios e flexibilidade de longo prazo.
3. Se voce recomendar a API NoSQL, explique como consultas tipo SQL e o change feed fornecem vantagens sobre a API MongoDB para este cenario de IoT. Se recomendar a API MongoDB, explique como a compatibilidade de protocolo wire reduz o esforco de migracao.
4. Avalie se Azure Table Storage poderia lidar com qualquer porcao desta carga de trabalho a um custo menor (para lookups key-value mais simples do estado do dispositivo).

### Parte 2: Modelagem de Dados e Particionamento

5. Projete a estrategia de partition key para o container de eventos de telemetria. Avalie candidatos: device ID, facility ID, tipo de dispositivo, timestamp ou uma chave sintetica combinando multiplos campos. Considere os padroes de acesso (leituras pontuais por dispositivo, consultas de intervalo por tempo, consultas por instalacao).
6. Calcule o consumo esperado de RU (Request Unit) para os dois padroes de acesso primarios: (a) leitura pontual do estado mais recente do dispositivo, (b) consulta retornando 1 hora de historico para um unico dispositivo. Estime o throughput provisionado necessario.
7. Projete a estrutura do documento para eventos de telemetria. Decida se deve armazenar cada leitura como um documento individual ou agrupar multiplas leituras em um unico documento (padrao de bucketing). Analise os trade-offs em custo de RU, flexibilidade de consulta e throughput de escrita.
8. Projete uma estrategia de TTL (time-to-live) para expirar automaticamente os dados apos 90 dias, reduzindo custos de armazenamento sem jobs de limpeza manuais.

### Parte 3: Consistencia e Distribuicao Global

9. Selecione o nivel de consistencia apropriado para cada padrao de acesso: (a) leituras de dashboard em tempo real (estado mais recente do dispositivo), (b) consultas analiticas historicas. Avalie strong, bounded staleness, session, consistent prefix e eventual consistency. Documente as implicacoes de custo de RU de cada nivel.
10. Projete a topologia de implantacao multi-regiao. Determine quais regioes devem ter capacidade de escrita (single-write vs multi-write) e quantas regioes de leitura implantar dada a distribuicao dos dispositivos.
11. Avalie multi-region writes para cenarios onde dispositivos em cada regiao escrevem na instancia Cosmos DB mais proxima. Aborde a estrategia de resolucao de conflitos (Last Writer Wins vs procedimentos de merge customizados).
12. Projete uma estrategia de otimizacao de custos incluindo autoscale throughput, camada serverless para ambientes de desenvolvimento e hierarchical partition keys para melhor distribuicao de dados.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-18"
  items={[
    "Selected and justified the Cosmos DB API choice with clear comparison against alternatives",
    "Designed partition key strategy that avoids hot partitions and supports both access patterns",
    "Estimated RU consumption and selected appropriate throughput provisioning mode (manual, autoscale, or serverless)",
    "Selected consistency levels appropriate to each access pattern with documented trade-offs",
    "Designed multi-region topology with automatic failover and clear write region strategy",
    "Implemented TTL and data lifecycle strategy to control storage costs within budget"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Selecao de API do Cosmos DB</summary>

A API NoSQL (anteriormente SQL API) e a API nativa do Cosmos DB com o conjunto de recursos mais rico: linguagem de consulta tipo SQL, change feed, hierarchical partition keys, controle total de indexacao e melhor suporte de SDK. A API MongoDB fornece compatibilidade de protocolo wire para equipes migrando do MongoDB. Para projetos greenfield de IoT, a API NoSQL tipicamente oferece melhor otimizacao de desempenho e custos de RU mais baixos porque nao tem overhead de traducao de protocolo wire. Escolha a API MongoDB apenas se voce tiver codigo de aplicacao MongoDB existente que nao pode modificar.

</details>

<details>
<summary>Dica 2: Partition Key para Dados IoT</summary>

Para telemetria IoT, estrategias comuns de partition key: (1) Device ID: excelente para leituras pontuais de um unico dispositivo mas cria hot partitions se um dispositivo gera muito mais dados; (2) Chave sintetica como `deviceId_YYYYMMDD`: distribui dados uniformemente e suporta consultas baseadas em tempo dentro de um dispositivo; (3) Hierarchical partition keys (preview/GA): permitem chaves multi-nivel como `/tenantId/deviceId` para consultas tanto amplas quanto estreitas. Evite timestamp sozinho como partition key (cria hot partitions no tempo atual).

</details>

<details>
<summary>Dica 3: Estimativa de Request Units</summary>

Fundamentos de custo do Cosmos DB: uma leitura pontual de um documento de 1KB custa 1 RU. Escritas custam aproximadamente 5-10 RUs por documento de 1KB. O custo de consultas varia baseado na complexidade (consultas cross-partition custam mais). Para 1M escritas/segundo a 1KB cada, voce precisaria de aproximadamente 5-10 milhoes de RU/s, o que seria extremamente caro. E por isso que document bucketing (agrupar 10-60 leituras por documento) reduz dramaticamente os RUs de escrita ao reduzir o numero de operacoes de escrita individuais.

</details>

<details>
<summary>Dica 4: Niveis de Consistencia e Custo</summary>

Niveis de consistencia do Cosmos DB do mais forte ao mais fraco: Strong, Bounded Staleness, Session, Consistent Prefix, Eventual. Strong consistency custa 2x os RUs de eventual consistency para leituras (porque deve ler do quorum). Session consistency (padrao) fornece read-your-own-writes dentro de uma sessao a 1x custo de RU. Para dashboards mostrando o estado mais recente do dispositivo, Session consistency e frequentemente suficiente. Para leituras entre regioes onde leve desatualizacao e aceitavel, Eventual ou Consistent Prefix minimiza o custo.

</details>

<details>
<summary>Dica 5: Autoscale vs Throughput Provisionado</summary>

Autoscale throughput escala automaticamente entre 10% e 100% de um maximo configurado de RU/s. Voce paga pelo maior RU/s que o sistema escala em cada hora. E ideal para cargas de trabalho variaveis ou imprevisiveis. Throughput provisionado manual e mais barato quando a carga e previsivel e estavel. Para IoT com 1M eventos/segundo durante picos mas volume menor fora do pico, autoscale previne provisionamento excessivo. Voce tambem pode definir o maximo de autoscale em 4x sua baseline para lidar com picos.

</details>

## Recursos de Aprendizagem

- [Azure Cosmos DB overview](https://learn.microsoft.com/en-us/azure/cosmos-db/introduction)
- [Choose an API in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/choose-api)
- [Partitioning and horizontal scaling in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview)
- [Consistency levels in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels)
- [Request Units in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/request-units)
- [Azure Cosmos DB autoscale provisioned throughput](https://learn.microsoft.com/en-us/azure/cosmos-db/provision-throughput-autoscale)
- [Distribute data globally with Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/distribute-data-globally)
- [Time to Live (TTL) in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/time-to-live)

## Verificacao de Conhecimento

<details>
<summary>1. Uma plataforma IoT ingere 1 milhao de eventos por segundo de dispositivos globalmente distribuidos. Cada evento e um documento JSON de 1KB. Por que document bucketing (agrupamento) e critico para gerenciamento de custos no Cosmos DB?</summary>

**Document bucketing reduz o numero de operacoes de escrita e portanto o consumo total de RU.** Uma unica escrita de 1KB custa aproximadamente 5-10 RUs. A 1M eventos/segundo, isso exigiria 5-10M RU/s (custando $25.000-50.000+/mes). Ao agrupar 60 leituras em um unico documento de 5KB (um por dispositivo por minuto), voce reduz operacoes de escrita para ~16.600/segundo a aproximadamente 15-20 RUs cada, reduzindo dramaticamente os custos para um nivel gerenciavel.

</details>

<details>
<summary>2. Um container do Cosmos DB usa device ID como partition key. Durante horarios de pico, 10% dos dispositivos geram 90% da telemetria. Qual problema ocorrera e como voce resolve?</summary>

**Problema de hot partition.** Os 10% de dispositivos de alto volume sobrecarregarao suas particoes logicas, causando throttling (erros HTTP 429) enquanto outras particoes permanecem subutilizadas. Solucoes: (1) Use uma partition key sintetica combinando device ID com um componente temporal (ex.: `deviceId_YYYYMMDD`) para distribuir escritas por mais particoes logicas; (2) Use hierarchical partition keys para adicionar sub-particionamento; (3) Implemente um buffer write-behind que agrupa eventos antes de escrever.

</details>

<details>
<summary>3. Uma aplicacao le o estado do dispositivo do Cosmos DB. A leitura deve refletir escritas feitas pela mesma sessao da aplicacao, mas leituras de outras regioes podem ser levemente desatualizadas. Qual nivel de consistencia e mais economico?</summary>

**Session consistency.** Garante read-your-own-writes e leituras monotonicas dentro de uma unica sessao de cliente, custando o mesmo que eventual consistency (1x RU para leituras). Strong consistency custaria 2x RUs e e desnecessario ja que o requisito exige apenas consistencia em nivel de sessao. Bounded staleness tambem funcionaria mas e mais caro que session consistency para escritas em uma unica regiao.

</details>

<details>
<summary>4. Quando voce deve escolher multi-region writes no Cosmos DB versus single-region writes com leituras multi-regiao?</summary>

**Escolha multi-region writes quando:** a latencia de escrita de regioes remotas e inaceitavel (dispositivos precisam escrever na regiao mais proxima), ou quando disponibilidade de escrita durante uma indisponibilidade regional e necessaria. **Escolha single-region writes quando:** o volume de escrita e gerenciavel de uma regiao, a complexidade de resolucao de conflitos e indesejavel, requisitos de consistencia sao mais simples, ou custo e a preocupacao primaria (multi-write adiciona aproximadamente 25% aos custos de RU). Para ingestao IoT de dispositivos globalmente distribuidos onde baixa latencia de escrita e critica, multi-region writes sao frequentemente justificados apesar do custo adicional e complexidade de resolucao de conflitos.

</details>

## Limpeza

```bash
# Delete the Cosmos DB account and associated resources
az group delete --name rg-sensorgrid-cosmos --yes --no-wait

# If you created a separate resource group for Table Storage testing
az group delete --name rg-sensorgrid-table --yes --no-wait
```

---

**Proximo**: [Challenge 19: Design an Unstructured Data Solution](/docs/az-305/data-storage/challenge-19)
