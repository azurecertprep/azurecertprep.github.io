---
sidebar_position: 11
title: "Challenge 24: Design an End-to-End Data Platform"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 24: Design an End-to-End Data Platform

:::info Tempo Estimado e Custo

**90-120 min** | **Custo estimado**: $10-20 | **Peso no Exame: 20-25%**

:::

## Introducao

TechMart e um marketplace de e-commerce conectando 5.000 vendedores com 2 milhoes de compradores ativos. A plataforma processa 50.000 pedidos por dia com picos sazonais atingindo 200.000 pedidos durante vendas de feriados. A equipe de engenharia tem operado com sistemas de dados desconectados - um SQL Server legado para pedidos, MongoDB para o catalogo de produtos, Azure Blob Storage para arquivos de midia, e uma ferramenta de analytics de terceiros - resultando em silos de dados, relatorios inconsistentes e oportunidades perdidas de personalizacao.

O VP de Engenharia garantiu um orcamento de $25.000/mes para construir uma plataforma de dados unificada que atende as seguintes necessidades: um banco de dados transacional para processamento de pedidos (latencia inferior a 10ms, compliance ACID), um armazenamento flexivel para o catalogo de produtos e avaliacoes de clientes (esquema variavel, distribuicao global), armazenamento de objetos para imagens e videos de produtos (10TB e crescendo), um motor de recomendacoes em tempo real que sugere produtos baseado em comportamento de navegacao, um pipeline de relatorios noturnos para financas e operacoes, e um arquivo imutavel de 7 anos para registros de transacoes financeiras (compliance regulatorio).

Este e o desafio capstone do Dominio 2. Voce ira sintetizar decisoes de design dos Challenges 14-23 para arquitetar a plataforma de dados completa da TechMart, justificando cada escolha de tecnologia contra alternativas e demonstrando como os componentes se integram em um todo coeso.

## Habilidades do Exame Cobertas

- Recomendar uma solucao para armazenamento de dados relacionais
- Recomendar uma camada de servico e camada de computacao de banco de dados
- Recomendar uma solucao para armazenamento de dados semi-estruturados
- Recomendar uma solucao para armazenamento de dados nao estruturados
- Recomendar uma solucao de armazenamento de dados que equilibre recursos, desempenho e custos
- Recomendar uma solucao de dados para protecao e durabilidade
- Recomendar uma solucao para integracao de dados
- Recomendar uma solucao para analise de dados

## Tarefas de Design

### Parte 1: Camada de Dados Transacionais (Pedidos e Pagamentos)

1. Selecione o servico de banco de dados relacional para processamento de pedidos. Crie uma matriz de decisao comparando:
   - Azure SQL Database (banco de dados unico vs elastic pool)
   - Azure SQL Managed Instance
   - Azure Database for PostgreSQL Flexible Server
   - Azure Cosmos DB for PostgreSQL

   Avalie em: throughput de transacoes (50K-200K pedidos/dia), requisitos de latencia de leitura/escrita, garantias ACID, estrategia de escalonamento para picos sazonais (4x a carga normal) e custo em estado estavel vs pico.

2. Projete a estrategia de escalonamento para picos de feriados:
   - Se usar Azure SQL Database: camadas DTU/vCore com auto-scaling, replicas de leitura para descarregar relatorios
   - Estrategia de connection pooling para a camada de aplicacao
   - Separacao leitura/escrita: primario para escritas, replicas para verificacoes de inventario em tempo real

3. Projete a protecao de dados para o banco de dados de pedidos:
   - Backups automatizados com restauracao point-in-time (periodo de retencao)
   - Retencao de backup de longo prazo para compliance (politica LTR de 7 anos)
   - Geo-replicacao para recuperacao de desastres (active geo-replication vs failover groups)

### Parte 2: Camada de Dados Semi-Estruturados (Catalogo de Produtos e Avaliacoes)

4. Projete o armazenamento do catalogo de produtos usando Azure Cosmos DB:
   - Selecione a API apropriada (NoSQL, MongoDB, PostgreSQL) com justificativa
   - Projete a estrategia de partition key para produtos (considere: consultas por categoria, vendedor e product ID)
   - Configure throughput: autoscale RU/s com um maximo que lida com pico de navegacao
   - Projete o modelo de dados para produtos com atributos variaveis (eletronicos vs vestuario vs alimentos)

5. Projete o sistema de avaliacoes de clientes:
   - Avalie se avaliacoes pertencem ao mesmo container do Cosmos DB ou a um armazenamento separado
   - Projete para alto throughput de leitura (paginas de produto mostram avaliacoes) e escrita moderada (novas avaliacoes)
   - Implemente um change feed para acionar moderacao de avaliacoes e atualizar classificacoes agregadas

6. Projete distribuicao global para expansao internacional:
   - Configure multi-region writes para o catalogo de produtos (vendedores atualizando de diferentes regioes)
   - Selecione o nivel de consistencia apropriado (avalie Strong vs Bounded Staleness vs Session vs Eventual para um catalogo de e-commerce)
   - Calcule o custo de replicacao multi-regiao vs regiao unica na escala atual

### Parte 3: Camada de Dados Nao Estruturados (Armazenamento de Midia)

7. Projete a arquitetura de armazenamento de midia para imagens e videos de produtos (10TB, crescendo 2TB/mes):
   - Selecao de tipo de storage account e camada de desempenho
   - Estrategia de camada de acesso: novos uploads em Hot, transicao para Cool apos 30 dias (maioria das visualizacoes acontece no primeiro mes)
   - Integracao CDN para entrega global de conteudo (Azure CDN ou Azure Front Door)

8. Projete o pipeline de upload e processamento:
   - Processamento acionado por blob: redimensionamento de imagem, geracao de thumbnails, transcodificacao de video
   - Integracao Event Grid para acionar Azure Functions na criacao de blob
   - Projete convencoes de nomeacao de armazenamento e estrutura de pastas para padroes de acesso eficientes

### Parte 4: Motor de Recomendacoes em Tempo Real

9. Projete o sistema de recomendacoes em tempo real:
   - Ingestao: capturar eventos de navegacao (visualizacoes de produto, adicoes ao carrinho, compras) via Event Hubs
   - Processamento: Stream Analytics ou Azure Functions para atualizar perfis de comportamento do usuario
   - Camada de servico: Azure Cache for Redis armazenando recomendacoes pre-computadas por usuario
   - Treinamento de modelo: atualizacao batch noturna do modelo de recomendacao usando dados historicos

10. Projete o fluxo de dados de eventos de transacao para recomendacoes:
    - Evento de conclusao de pedido atualiza o historico de compras do usuario
    - Change feed do Cosmos DB aciona recalculo de recomendacoes para produtos relacionados
    - Cache Redis e atualizado com novas recomendacoes (expiracao baseada em TTL para dados obsoletos)

### Parte 5: Pipeline de Relatorios e Arquivo de Compliance

11. Projete o pipeline de relatorios noturnos usando Azure Data Factory ou Synapse Pipelines:
    - Extrair de: Azure SQL Database (pedidos), Cosmos DB (produtos/avaliacoes), Storage (metadados de midia)
    - Transformar: calcular receita diaria, desempenho de vendedores, niveis de inventario, metricas de coorte de clientes
    - Carregar: Synapse Analytics (serverless ou dedicated) para dashboards Power BI
    - Agendar: completar ate as 6h diariamente, com logica de retry e alertas de falha

12. Projete o arquivo de compliance de 7 anos para registros de transacoes financeiras:
    - Selecao de camada de armazenamento (Cool ou Archive para otimizacao de custos)
    - Politica de imutabilidade com retencao baseada em tempo bloqueada (periodo de 7 anos/2.555 dias)
    - Redundancia: RA-GZRS para requisitos regulatorios (geo-redundante com acesso de leitura)
    - Gerenciamento de ciclo de vida: transicao automatica de Cool para Archive apos 1 ano

### Parte 6: Arquitetura Unificada e Orcamento

13. Crie um diagrama de arquitetura abrangente mostrando todos os componentes e seus fluxos de dados:
    - Camada transacional (Azure SQL Database)
    - Camada semi-estruturada (Cosmos DB)
    - Camada de midia (Blob Storage + CDN)
    - Camada em tempo real (Event Hubs + Stream Analytics/Functions + Redis)
    - Camada de analytics (Data Factory + Synapse/Data Lake)
    - Camada de compliance (Immutable Storage + GZRS)

14. Crie uma estimativa de custo mensal para a plataforma completa detalhada por componente, validando que cabe no orcamento de $25.000/mes:
    - Azure SQL Database: computacao + armazenamento + geo-replica
    - Cosmos DB: RU/s + armazenamento + replicacao multi-regiao
    - Blob Storage: capacidade (por camada) + operacoes + egress CDN
    - Event Hubs + Stream Analytics: throughput units + streaming units
    - Redis Cache: selecao de camada e tamanho
    - Data Factory + Synapse: execucoes de pipeline + computacao
    - Total nao deve exceder $25.000/mes

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-24"
  items={[
    "Relational database selected with scaling strategy handling 4x peak load without downtime",
    "Cosmos DB configured with appropriate API, partition key strategy, and consistency level justified",
    "Media storage architecture includes lifecycle management and CDN for global delivery",
    "Real-time recommendations design shows complete data flow from event ingestion to cache serving",
    "Reporting pipeline design covers extraction from 3+ sources with nightly schedule and error handling",
    "Compliance archive uses immutable storage with locked retention policy and geo-redundancy"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Design de Partition Key do Cosmos DB</summary>

Para um catalogo de produtos de e-commerce, a escolha da partition key impacta significativamente desempenho e custo. Usar `categoryId` agrupa produtos relacionados para consultas de navegacao mas pode criar hot partitions para categorias populares. Usar `productId` fornece distribuicao uniforme mas torna consultas de categoria cross-partition. Um padrao comum e usar uma partition key sintetica como `categoryId-subcategoryId` que equilibra distribuicao com localidade de consulta. Para avaliacoes, particione por `productId` ja que avaliacoes sao sempre lidas no contexto de uma pagina de produto especifica.

</details>

<details>
<summary>Dica 2: Escalonamento do Azure SQL Database para Picos</summary>

Para picos sazonais (4x a carga normal), considere: (1) Camada Hyperscale com auto-scale de computacao (0-30 segundos para escalar, sem movimentacao de dados), (2) modelo vCore com read scale-out para consultas de relatorios, ou (3) Camada de computacao Serverless se periodos de pico sao previsiveis mas intermitentes. Elastic pools sao melhores para SaaS multi-tenant com muitos bancos de dados pequenos em vez de um unico banco de dados de alto throughput. Para o unico banco de dados grande de pedidos da TechMart, Hyperscale ou Business Critical com replicas de leitura e mais apropriado.

</details>

<details>
<summary>Dica 3: Arquitetura de Recomendacoes em Tempo Real</summary>

O sistema de recomendacoes nao precisa computar recomendacoes em tempo real para cada requisicao. Uma abordagem hibrida funciona melhor: treinar o modelo ML em batch noturno (filtragem colaborativa, fatoracao de matrizes) e armazenar recomendacoes pre-computadas no Redis. Sinais em tempo real (navegacao da sessao atual) ajustam a lista pre-computada usando regras simples (impulsionar categorias visualizadas recentemente, rebaixar itens ja comprados). Isso mantem a latencia de servico abaixo de 10ms enquanto ainda e personalizado.

</details>

<details>
<summary>Dica 4: Alocacao de Orcamento de Custo</summary>

Para uma plataforma de dados de e-commerce de $25K/mes, uma alocacao tipica poderia ser: Banco de dados (SQL + Cosmos DB): 40-50% ($10-12K), Storage + CDN: 10-15% ($2,5-3,5K), Analytics (Synapse + Data Factory): 15-20% ($3,5-5K), Tempo real (Event Hubs + Stream Analytics + Redis): 15-20% ($3,5-5K), Arquivo de compliance: 5% ($1,2K). Use a Calculadora de Precos do Azure para validar suas estimativas contra precos reais de servicos na regiao alvo.

</details>

<details>
<summary>Dica 5: Padroes de Integracao Entre Camadas</summary>

Use eventos e change feeds para manter camadas sincronizadas sem acoplamento forte: (1) Triggers do Azure SQL ou Change Data Capture (CDC) publicam eventos de pedidos no Event Hubs, (2) Change feed do Cosmos DB envia atualizacoes de produtos/avaliacoes para o pipeline de analytics, (3) Event Grid notifica sistemas downstream de novos uploads de blob, (4) Data Factory orquestra o batch noturno que le de todas as fontes. Evite consultas cross-service diretas em caminhos de producao - cada camada deve ter seu proprio armazenamento de dados otimizado para seu padrao de acesso.

</details>

## Recursos de Aprendizagem

- [Azure SQL Database overview](https://learn.microsoft.com/en-us/azure/azure-sql/database/sql-database-paas-overview)
- [Azure Cosmos DB for NoSQL](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/)
- [Azure Cosmos DB partitioning](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview)
- [Azure Blob Storage access tiers](https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview)
- [Immutable storage for Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview)
- [Azure Event Hubs and Stream Analytics](https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-introduction)
- [Azure Cache for Redis](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview)
- [Azure Data Factory overview](https://learn.microsoft.com/en-us/azure/data-factory/introduction)
- [Azure Architecture Center - E-commerce reference](https://learn.microsoft.com/en-us/azure/architecture/industries/retail)

## Verificacao de Conhecimento

<details>
<summary>1. TechMart precisa que o catalogo de produtos lide com 50.000 leituras/segundo durante flash sales com compradores globais. O catalogo tem 500.000 produtos em 200 categorias. Qual configuracao do Cosmos DB e mais apropriada?</summary>

**Cosmos DB for NoSQL com autoscale throughput (max 50.000 RU/s), particionado por categoria com chave sintetica, e replicas de leitura multi-regiao.** Autoscale lida com o burst de flash sale sem provisionar excessivamente durante trafego normal (escala para baixo ate 10% do maximo). Particionamento por chave sintetica (ex.: `categoryId-subcategoryId`) distribui carga enquanto mantem consultas de navegacao por categoria eficientes. Leituras multi-regiao colocam dados proximos a compradores globais, reduzindo latencia. Session consistency garante que cada comprador veja suas proprias escritas (carrinho, avaliacoes) sem pagar o custo de Strong consistency entre regioes.

</details>

<details>
<summary>2. A equipe de compliance requer que registros de transacoes financeiras armazenados por 7 anos nao possam ser modificados ou excluidos por ninguem, incluindo administradores. Qual combinacao de recursos do Azure Storage satisfaz este requisito?</summary>

**Armazenamento imutavel de blob com politica de retencao baseada em tempo bloqueada (2.555 dias) em uma storage account com redundancia RA-GZRS.** A politica bloqueada e critica - uma politica desbloqueada pode ser deletada por admins, anulando o proposito de compliance. Uma vez bloqueada, mesmo o proprietario da storage account e o suporte Microsoft nao podem deletar os dados antes da expiracao. RA-GZRS garante que os dados sobrevivam a um desastre regional completo com acesso de leitura da regiao secundaria. Protecoes adicionais: habilite resource locks na storage account para prevenir exclusao acidental da conta, e use Azure Policy para impor imutabilidade em novos containers.

</details>

<details>
<summary>3. O motor de recomendacoes da TechMart precisa servir sugestoes de produtos personalizadas em menos de 10ms por requisicao durante trafego de pico (100.000 usuarios concorrentes). Qual arquitetura de servico alcanca isso?</summary>

**Azure Cache for Redis (camada Premium ou Enterprise) armazenando listas de recomendacoes pre-computadas por usuario.** Redis fornece latencia de leitura sub-milissegundo para lookups key-value. Pre-compute recomendacoes em batch (treinamento noturno do modelo escreve top-N product IDs por usuario no Redis) e sirva diretamente do cache. A camada Premium suporta clustering para escalonamento horizontal entre nos. Para 100K usuarios concorrentes com ~1KB de payload de recomendacao cada, um Redis clusterizado com 2-3 shards fornece memoria e throughput suficientes. A aplicacao simplesmente realiza uma operacao `GET user:{userId}:recommendations` - nenhuma inferencia ML em tempo real necessaria no caminho quente.

</details>

<details>
<summary>4. Durante o pipeline de relatorios noturnos, o Data Factory precisa extrair pedidos alterados do Azure SQL Database (apenas pedidos modificados desde a ultima execucao). Qual e o padrao de extracao mais eficiente?</summary>

**Extracao incremental usando uma coluna de watermark (ex.: `lastModifiedDate`).** A atividade Copy do Data Factory suporta um padrao de watermark: armazene o ultimo timestamp de extracao bem-sucedida, depois consulte `WHERE lastModifiedDate > @lastWatermark`. Isso e mais eficiente que extracao completa (que le todos os 50K+ pedidos diarios mais dados historicos) e mais confiavel que CDC para um batch noturno simples. O valor do watermark e armazenado em uma tabela de controle ou variavel do Data Factory. Para rastreamento de mudancas mais complexo (exclusoes, mudancas de esquema), o Change Data Capture (CDC) integrado do Azure SQL Database pode ser usado, mas adiciona overhead ao banco de dados de transacoes.

</details>

## Laboratorio de Validacao

Implante uma prova de conceito minima para validar seu design:

1. Crie um resource group para este laboratorio:

```bash
az group create --name rg-az305-challenge24 --location eastus
```

2. Implante uma storage account (camada de midia) e um Azure SQL Database (camada transacional):

```bash
az storage account create \
  --name staz305ch24$RANDOM \
  --resource-group rg-az305-challenge24 \
  --sku Standard_LRS \
  --kind StorageV2

az sql server create \
  --name sql-az305-ch24 \
  --resource-group rg-az305-challenge24 \
  --location eastus \
  --admin-user sqladmin \
  --admin-password "P@ssw0rd2024!"

az sql db create \
  --name orders-db \
  --resource-group rg-az305-challenge24 \
  --server sql-az305-ch24 \
  --service-objective Basic
```

3. Implante um Data Factory e crie linked services conectando ambos os armazenamentos de dados:

```bash
az datafactory create \
  --name adf-az305-ch24 \
  --resource-group rg-az305-challenge24 \
  --location eastus

az datafactory linked-service create \
  --factory-name adf-az305-ch24 \
  --resource-group rg-az305-challenge24 \
  --name BlobStorageLS \
  --properties '{
    "type": "AzureBlobStorage",
    "typeProperties": {
      "connectionString": "'$(az storage account show-connection-string --name <your-account-name> --resource-group rg-az305-challenge24 --query connectionString -o tsv)'"
    }
  }'

az datafactory linked-service create \
  --factory-name adf-az305-ch24 \
  --resource-group rg-az305-challenge24 \
  --name SqlDatabaseLS \
  --properties '{
    "type": "AzureSqlDatabase",
    "typeProperties": {
      "connectionString": "Server=tcp:sql-az305-ch24.database.windows.net,1433;Database=orders-db;User ID=sqladmin;Password=P@ssw0rd2024!;Encrypt=true;"
    }
  }'
```

4. Verifique que ambos os linked services estao registrados:

```bash
az datafactory linked-service list \
  --factory-name adf-az305-ch24 \
  --resource-group rg-az305-challenge24 \
  --query "[].name" -o tsv
```

:::tip
Esta mini-implantacao valida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge24 --yes --no-wait
```

---

**Proximo**: [Challenge 25: Design Backup and Recovery for Azure Workloads](/docs/az-305/business-continuity/challenge-25)
