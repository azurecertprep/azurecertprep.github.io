---
sidebar_position: 5
title: "Desafio 18: Projetar uma Solução de Dados Semi-Estruturados"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 18: projetar uma solução de dados Semi-Estruturados

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $10-25 | **Peso no Exame: 20-25%**

:::

## Introdução

SensorGrid é uma plataforma de IoT industrial que monitora 50.000 dispositivos implantados em instalacoes de manufatura na América do Norte, Europa e Asia-Pacifico. Cada dispositivo transmite eventos de telemetria (temperatura, vibracao, pressao, umidade) a cada 5 segundos, resultando em aproximadamente 1 milhao de eventos por segundo no pico. Os eventos são documentos JSON com esquema variavel: diferentes tipos de dispositivos incluem diferentes leituras de sensores, versoes de firmware adicionam novos campos ao longo do tempo, e alguns eventos incluem arrays aninhados de sub-leituras.

A plataforma tem dois padrões de acesso primários. Primeiro, operadores precisam de dashboards em tempo real mostrando o estado mais recente de qualquer dispositivo com latência de leitura inferior a 10ms (leituras pontuais por device ID). Segundo, engenheiros executam consultas analiticas historicas abrangendo dias ou semanas de dados para uma instalacao ou tipo de dispositivo específico, onde tempos de resposta de 2-5 segundos são aceitaveis. O volume de dados atual e 2TB e cresce 500GB por mes.

O orcamento da SensorGrid para a camada de dados é $3.000/mes. O CTO quer minimizar a sobrecarga operacional (sem gerenciar clusters ou shards manualmente) e requer disponibilidade multi-região com failover automático. A equipe de engenharia tem experiência com sintaxe de consulta MongoDB de um projeto anterior, mas esta aberta a outras APIs se os trade-offs justificarem. A política de retenção de dados requer dados quentes por 90 dias, apos os quais devem ser arquivados ou movidos para armazenamento frio para controlar custos.

## Habilidades do exame cobertas

- Recomendar uma solução para armazenamento de dados semi-estruturados

## Tarefas de design

### Parte 1: seleção de serviço e API

1. Avalie Azure Cosmos DB como o armazenamento de dados primário para os requisitos da SensorGrid. Compare-o com alternativas (Azure Table Storage, MongoDB Atlas no Azure) e justifique sua recomendacao.
2. Selecione a API Cosmos DB mais aprópriada para esta carga de trabalho. Compare as APIs NoSQL (nativa), MongoDB, PostgreSQL, Cassandra e Gremlin. Considere a experiência da equipe com MongoDB, os padrões de consulta necessários e flexibilidade de longo prazo.
3. Se você recomendar a API NoSQL, explique como consultas tipo SQL e o change feed fornecem vantagens sobre a API MongoDB para este cenário de IoT. Se recomendar a API MongoDB, explique como a compatibilidade de protocolo wire reduz o esforco de migração.
4. Avalie se Azure Table Storage poderia lidar com qualquer porcao desta carga de trabalho a um custo menor (para lookups key-value mais simples do estado do dispositivo).

### Parte 2: modelagem de dados e particionamento

5. Projete a estratégia de partition key para o container de eventos de telemetria. Avalie candidatos: device ID, facility ID, tipo de dispositivo, timestamp ou uma chave sintetica combinando múltiplos campos. Considere os padrões de acesso (leituras pontuais por dispositivo, consultas de intervalo por tempo, consultas por instalacao).
6. Calcule o consumo esperado de RU (Request Unit) para os dois padrões de acesso primários: (a) leitura pontual do estado mais recente do dispositivo, (b) consulta retornando 1 hora de histórico para um único dispositivo. Estime o throughput provisionado necessário.
7. Projete a estrutura do documento para eventos de telemetria. Decida se deve armazenar cada leitura como um documento individual ou agrupar múltiplas leituras em um único documento (padrão de bucketing). Análise os trade-offs em custo de RU, flexibilidade de consulta e throughput de escrita.
8. Projete uma estratégia de TTL (time-to-live) para expirar automaticamente os dados apos 90 dias, reduzindo custos de armazenamento sem jobs de limpeza manuais.

### Parte 3: consistência e distribuição global

9. Selecione o nível de consistência aprópriado para cada padrão de acesso: (a) leituras de dashboard em tempo real (estado mais recente do dispositivo), (b) consultas analiticas historicas. Avalie strong, bounded staleness, session, consistent prefix e eventual consistency. Documente as implicacoes de custo de RU de cada nível.
10. Projete a topologia de implantação multi-região. Determine quais regiões devem ter capacidade de escrita (single-write vs multi-write) e quantas regiões de leitura implantar dada a distribuição dos dispositivos.
11. Avalie multi-region writes para cenários onde dispositivos em cada região escrevem na instância Cosmos DB mais próxima. Aborde a estratégia de resolução de conflitos (Last Writer Wins vs procedimentos de merge customizados).
12. Projete uma estratégia de otimização de custos incluindo autoscale throughput, camada serverless para ambientes de desenvolvimento e hierarchical partition keys para melhor distribuição de dados.

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-18"
  items={[
    "Selected and justified the Cosmos DB API choice with clear comparison against alternatives",
    "Designed partition key strategy that avoids hot partitions and supports both access patterns",
    "Estimated RU consumption and selected apprópriate throughput provisioning mode (manual, autoscale, or serverless)",
    "Selected consistency levels apprópriate to each access pattern with documented trade-offs",
    "Designed multi-region topology with automatic failover and clear write region strategy",
    "Implemented TTL and data lifecycle strategy to control storage costs within budget"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Seleção de API do Cosmos DB</summary>

A API NoSQL (anteriormente SQL API) e a API nativa do Cosmos DB com o conjunto de recursos mais rico: linguagem de consulta tipo SQL, change feed, hierarchical partition keys, controle total de indexacao e melhor suporte de SDK. A API MongoDB fornece compatibilidade de protocolo wire para equipes migrando do MongoDB. Para projetos greenfield de IoT, a API NoSQL tipicamente oferece melhor otimização de desempenho e custos de RU mais baixos porque não tem overhead de traducao de protocolo wire. Escolha a API MongoDB apenas se você tiver código de aplicação MongoDB existente que não pode modificar.

</details>

<details>
<summary>Dica 2: Partition Key para Dados IoT</summary>

Para telemetria IoT, estratégias comuns de partition key: (1) Device ID: excelente para leituras pontuais de um único dispositivo mas cria hot partitions se um dispositivo gera muito mais dados; (2) Chave sintetica como `deviceId_YYYYMMDD`: distribui dados uniformemente e suporta consultas baseadas em tempo dentro de um dispositivo; (3) Hierarchical partition keys (preview/GA): permitem chaves multi-nível como `/tenantId/deviceId` para consultas tanto amplas quanto estreitas. Evite timestamp sozinho como partition key (cria hot partitions no tempo atual).

</details>

<details>
<summary>Dica 3: Estimativa de Request Units</summary>

Fundamentos de custo do Cosmos DB: uma leitura pontual de um documento de 1KB custa 1 RU. Escritas custam aproximadamente 5-10 RUs por documento de 1KB. O custo de consultas varia baseado na complexidade (consultas cross-partition custam mais). Para 1M escritas/segundo a 1KB cada, você precisaria de aproximadamente 5-10 milhões de RU/s, o que seria extremamente caro. E por isso que document bucketing (agrupar 10-60 leituras por documento) reduz dramaticamente os RUs de escrita ao reduzir o número de operações de escrita individuais.

</details>

<details>
<summary>Dica 4: Níveis de Consistência e Custo</summary>

Níveis de consistência do Cosmos DB do mais forte ao mais fraco: Strong, Bounded Staleness, Session, Consistent Prefix, Eventual. Strong consistency custa 2x os RUs de eventual consistency para leituras (porque deve ler do quorum). Session consistency (padrão) fornece read-your-own-writes dentro de uma sessão a 1x custo de RU. Para dashboards mostrando o estado mais recente do dispositivo, Session consistency e frequentemente suficiente. Para leituras entre regiões onde leve desatualizacao e aceitavel, Eventual ou Consistent Prefix minimiza o custo.

</details>

<details>
<summary>Dica 5: Autoscale vs Throughput Provisionado</summary>

Autoscale throughput escala automaticamente entre 10% e 100% de um máximo configurado de RU/s. Você paga pelo maior RU/s que o sistema escala em cada hora. E ideal para cargas de trabalho variaveis ou imprevisiveis. Throughput provisionado manual e mais barato quando a carga e previsível e estavel. Para IoT com 1M eventos/segundo durante picos mas volume menor fora do pico, autoscale previne provisionamento excessivo. Você também pode definir o máximo de autoscale em 4x sua baseline para lidar com picos.

</details>

## Recursos de aprendizagem

- [Azure Cosmos DB overview](https://learn.microsoft.com/en-us/azure/cosmos-db/introduction)
- [Choose an API in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/choose-api)
- [Partitioning and horizontal scaling in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview)
- [Consistency levels in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels)
- [Request Units in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/request-units)
- [Azure Cosmos DB autoscale provisioned throughput](https://learn.microsoft.com/en-us/azure/cosmos-db/provision-throughput-autoscale)
- [Distribute data globally with Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/distribute-data-globally)
- [Time to Live (TTL) in Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/time-to-live)

## Verificação de conhecimento

<details>
<summary>1. Uma plataforma IoT ingere 1 milhao de eventos por segundo de dispositivos globalmente distribuidos. Cada evento é um documento JSON de 1KB. Por que document bucketing (agrupamento) e crítico para gerenciamento de custos no Cosmos DB?</summary>

**Document bucketing reduz o número de operações de escrita e portanto o consumo total de RU.** Uma única escrita de 1KB custa aproximadamente 5-10 RUs. A 1M eventos/segundo, isso exigiria 5-10M RU/s (custando $25.000-50.000+/mes). Ao agrupar 60 leituras em um único documento de 5KB (um por dispositivo por minuto), você reduz operações de escrita para ~16.600/segundo a aproximadamente 15-20 RUs cada, reduzindo dramaticamente os custos para um nível gerenciável.

</details>

<details>
<summary>2. Um container do Cosmos DB usa device ID como partition key. Durante horarios de pico, 10% dos dispositivos geram 90% da telemetria. Qual problema ocorrera e como você resolve?</summary>

**Problema de hot partition.** Os 10% de dispositivos de alto volume sobrecarregarao suas particoes logicas, causando throttling (erros HTTP 429) enquanto outras particoes permanecem subutilizadas. Soluções: (1) Use uma partition key sintetica combinando device ID com um componente temporal (ex.: `deviceId_YYYYMMDD`) para distribuir escritas por mais particoes logicas; (2) Use hierarchical partition keys para adicionar sub-particionamento; (3) Implemente um buffer write-behind que agrupa eventos antes de escrever.

</details>

<details>
<summary>3. Uma aplicação le o estado do dispositivo do Cosmos DB. A leitura deve refletir escritas feitas pela mesma sessão da aplicação, mas leituras de outras regiões podem ser levemente desatualizadas. Qual nível de consistência e mais economico?</summary>

**Session consistency.** Garante read-your-own-writes e leituras monotonicas dentro de uma única sessão de cliente, custando o mesmo que eventual consistency (1x RU para leituras). Strong consistency custaria 2x RUs e é desnecessário já que o requisito exige apenas consistência em nível de sessão. Bounded staleness também funcionaria mas e mais caro que session consistency para escritas em uma única região.

</details>

<details>
<summary>4. Quando você deve escolher multi-region writes no Cosmos DB versus single-region writes com leituras multi-região?</summary>

**Escolha multi-region writes quando:** a latência de escrita de regiões remotas e inaceitavel (dispositivos precisam escrever na região mais próxima), ou quando disponibilidade de escrita durante uma indisponibilidade regional é necessária. **Escolha single-region writes quando:** o volume de escrita e gerenciável de uma região, a complexidade de resolução de conflitos e indesejavel, requisitos de consistência são mais simples, ou custo e a preocupação primária (multi-write adiciona aproximadamente 25% aos custos de RU). Para ingestao IoT de dispositivos globalmente distribuidos onde baixa latência de escrita e crítica, multi-region writes são frequentemente justificados apesar do custo adicional e complexidade de resolução de conflitos.

</details>

## Limpeza

```bash
# Delete the Cosmos DB account and associated resources
az group delete --name rg-sensorgrid-cosmos --yes --no-wait

# If you created a separate resource group for Table Storage testing
az group delete --name rg-sensorgrid-table --yes --no-wait
```

---

**Próximo**: [Challenge 19: Design an Unstructured Data Solution](/docs/az-305/data-storage/challenge-19)
