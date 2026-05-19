---
sidebar_position: 9
title: "Desafio 22: Projetar um Pipeline de Integração de Dados"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 22: projetar um pipeline de integração de dados

:::info Tempo Estimado e Custo

**75-90 min** | **Custo estimado**: $5-12 | **Peso no Exame: 20-25%**

:::

## Introdução

FreshMart é uma rede varejista nacional com 200 lojas, cada uma executando um banco de dados SQL Server local para transações de ponto de venda. Toda noite, a sede precisa de dados de vendas agregados de todas as lojas carregados em um data warehouse central Azure Synapse Analytics para planejamento de inventário e relatórios financeiros. Adicionalmente, a equipe de cadeia de suprimentos requer dados de inventário de um sistema SAP on-premises, e o departamento de marketing precisa de dados de desempenho de campanhas extraidos do Salesforce via REST API.

O processo atual depende de exportacoes manuais de CSV e anexos de e-mail, resultando em dados chegando 2-3 dias atrasados, erros frequentes de formatacao e nenhuma visibilidade sobre falhas. O CTO requer um pipeline automatizado e monitorado que entregue todas as três fontes de dados ao warehouse até as 6h diariamente, com retry automático em falhas e alertas por e-mail quando pipelines falham apos todas as tentativas serem esgotadas.

Seu desafio é projetar é implementar uma solução de integração de dados usando Azure Data Factory (ou Synapse Pipelines), incluindo orquestração através de múltiplas fontes, um self-hosted integration runtime para conectividade on-premises, mecanismos de trigger aprópriados e monitoramento abrangente.

## Habilidades do exame cobertas

- Recomendar uma solução para integração de dados

## Tarefas de design

### Parte 1: selecionar serviço de integração e projetar arquitetura

1. Crie uma matriz de decisão comparando estes serviços de integração para os requisitos da FreshMart:
   - Azure Data Factory
   - Synapse Pipelines (integrado dentro do workspace Synapse)
   - Azure Logic Apps
   - Azure Functions com código customizado

   Avalie em: ecossistema de conectores, suporte on-premises, complexidade de orquestração, capacidades de monitoramento, modelo de custo e requisitos de habilidade da equipe.

2. Documente sua seleção de serviço com justificativa. Considere que a equipe de dados da FreshMart tem experiência em SQL mas experiência limitada em programacao.

3. Projete a arquitetura de pipeline de alto nível mostrando:
   - Sistemas de origem (200 SQL Servers, SAP, Salesforce)
   - Posicionamento de integration runtime (cloud vs self-hosted)
   - Areas de staging (Azure Data Lake Storage Gen2)
   - Destino (Synapse Analytics dedicated SQL pool)
   - Fluxo de orquestração (pipeline master com pipelines filhos)

### Parte 2: implementar pipelines do Data factory

4. Implante uma instância do Azure Data Factory e crie os seguintes linked services:
   - Azure SQL Database (simulando SQL Server on-premises via self-hosted IR)
   - Azure Data Lake Storage Gen2 (camada de staging)
   - Azure Synapse Analytics (destino)

5. Projete e crie um pipeline parametrizado para a ingestao de dados de vendas das lojas:
   - Use uma atividade Lookup para recuperar a lista de lojas ativas
   - Use uma atividade ForEach para iterar sobre lojas e copiar dados em paralelo
   - Configure a atividade Copy com consulta de origem, configurações de sink e mapeamento de colunas aprópriados
   - Adicione configurações de tolerância a falhas (pular linhas incompativeis, registrar linhas puladas em log)

6. Projete o pipeline para extracao de dados SAP:
   - Documente por que um self-hosted integration runtime é necessário para fontes on-premises
   - Descreva a instalacao e configuração do self-hosted IR em uma maquina on-premises
   - Projete a atividade de copia usando o conector SAP Table ou SAP ODP
   - Aborde consideracoes de rede (ExpressRoute, VPN ou regras de firewall para porta 443)

7. Projete o pipeline para dados da REST API do Salesforce:
   - Use o conector REST ou conector Salesforce no Data Factory
   - Trate autenticação OAuth 2.0 e renovacao de token
   - Implemente paginacao para conjuntos de resultados grandes
   - Mapeie a resposta da API para o formato de staging

### Parte 3: orquestração, triggers e tratamento de erros

8. Crie um pipeline de orquestração master que:
   - Execute os três pipelines de origem (lojas, SAP, Salesforce) em paralelo
   - Aguarde todos os três completarem antes de executar um pipeline de transformacao
   - Use dependência "Upon Completion" (não "Upon Success") para tratar falhas parciais graciosamente

9. Configure um trigger de Schedule para executar o pipeline master as 23h todas as noites (permitindo tempo para todas as lojas fecharem e descarregarem transações).

10. Implemente tratamento de erros e lógica de retry:
    - Defina contagem de retry para 3 com intervalos de 10 minutos em atividades de copia
    - Adicione uma atividade Web para enviar notificações de falha via webhook/e-mail
    - Registre metadados de execução do pipeline (hora de início, duracao, linhas copiadas, erros) em uma tabela de monitoramento
    - Projete uma regra de alerta usando Azure Monitor para falhas consecutivas de pipeline

### Parte 4: decisão de design ETL vs ELT

11. Documente sua decisão entre ETL (transformar no Data Factory usando Data Flows) versus ELT (carregar dados brutos para staging, transformar no Synapse usando SQL):
    - Para dados de vendas das lojas: transformacoes pequenas (conversao de moeda, formatacao de data)
    - Para dados de inventário SAP: joins complexos através de múltiplas tabelas SAP
    - Para dados do Salesforce: achatamento simples de JSON aninhado
    - Considere: habilidades da equipe, volume de dados, custos de computacao e complexidade de depuracao

12. Se usar ELT, crie stored procedures no Synapse que transformem dados staged no star schema final (tabelas fato e dimensão).

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-22"
  items={[
    "Decision matrix comparing at least 3 integration services with rationale for final selection",
    "Data Factory deployed with linked services for source, staging, and destination",
    "Parameterized pipeline with ForEach and Copy activities handling multiple stores",
    "Self-hosted integration runtime architecture documented with network requirements",
    "Master pipeline orchestrates child pipelines with parallel execution and error handling",
    "ETL vs ELT decision documented with justification for each data source"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Azure Data Factory vs Synapse Pipelines</summary>

Synapse Pipelines e Azure Data Factory compartilham a mesma tecnologia subjacente e experiência de UI. A diferenca chave e o contexto de integração: Synapse Pipelines estao embutidos dentro de um workspace Synapse (integração mais estreita com SQL pools Synapse, Spark pools e data lake). Data Factory e standalone e melhor quando você precisa de pipelines independentes do Synapse ou conectando a muitos destinos diversos. Para este cenário, se o destino e Synapse Analytics, ambos funcionam - mas Data Factory e a resposta de exame mais comum para cenários de integração de dados gerais.

</details>

<details>
<summary>Dica 2: Self-Hosted Integration Runtime</summary>

Um self-hosted integration runtime (SHIR) é necessário para conectar a fontes de dados on-premises ou fontes de dados dentro de uma virtual network. Ele roda em uma maquina Windows com acesso de rede tanto a origem (SAP, SQL Server) quanto ao Azure (HTTPS de saida na porta 443). Consideracoes chave de design: instale em uma maquina dedicada (não o servidor de banco de dados), configure para alta disponibilidade com 2+ nos, e garanta que a maquina tenha memoria suficiente para marshaling de dados. O SHIR não requer regras de firewall de entrada - ele inicia conexões de saida para o Azure.

</details>

<details>
<summary>Dica 3: Paralelismo da Atividade ForEach</summary>

A atividade ForEach no Data Factory processa itens em paralelo por padrão (até 50 iteracoes concorrentes com a propriedade `batchCount`). Para 200 lojas, você pode definir `batchCount` para 20-50 dependendo da capacidade do banco de dados de origem e largura de banda de rede. Definir `isSequential: true` processa um de cada vez mas raramente é necessário a menos que a origem tenha limitacoes de concorrencia.

</details>

<details>
<summary>Dica 4: Seleção de Padrão ETL vs ELT</summary>

Escolha ELT quando: o destino tem computacao poderosa (Synapse SQL pool), transformacoes são expressaveis em SQL, volumes de dados são grandes e a equipe tem habilidades SQL. Escolha ETL (Data Flows no Data Factory) quando: transformacoes são complexas (requerendo Spark), você quer depuracao visual, ou o destino carece de capacidade de transformacao. Para a maioria dos cenários de data warehouse empresarial no Azure, ELT com Synapse e preferido porque aproveita o engine MPP para transformacoes em escala.

</details>

<details>
<summary>Dica 5: Monitoramento e Alertas</summary>

Data Factory fornece monitoramento integrado através do Azure Monitor com metricas como `PipelineSucceededRuns`, `PipelineFailedRuns`, `ActivitySucceededRuns` e `TriggerSucceededRuns`. Configure diagnostic settings para enviar logs ao Log Analytics para consultas avancadas. Para alertas por e-mail sobre falhas, use Azure Monitor Action Groups em vez de construir lógica de notificação customizada dentro dos pipelines.

</details>

## Recursos de aprendizagem

- [Azure Data Factory overview](https://learn.microsoft.com/en-us/azure/data-factory/introduction)
- [Copy activity in Azure Data Factory](https://learn.microsoft.com/en-us/azure/data-factory/copy-activity-overview)
- [Create and configure a self-hosted integration runtime](https://learn.microsoft.com/en-us/azure/data-factory/create-self-hosted-integration-runtime)
- [Pipeline execution and triggers](https://learn.microsoft.com/en-us/azure/data-factory/concepts-pipeline-execution-triggers)
- [ForEach activity in Azure Data Factory](https://learn.microsoft.com/en-us/azure/data-factory/control-flow-for-each-activity)
- [Data flows in Azure Data Factory](https://learn.microsoft.com/en-us/azure/data-factory/concepts-data-flow-overview)
- [Monitor Azure Data Factory](https://learn.microsoft.com/en-us/azure/data-factory/monitor-visually)

## Verificação de conhecimento

<details>
<summary>1. O sistema SAP da FreshMart esta on-premises atras de um firewall corporativo. Qual componente permite que o Azure Data Factory acesse esses dados sem abrir portas de firewall de entrada?</summary>

**Self-hosted integration runtime (SHIR).** O SHIR e instalado em uma maquina Windows dentro da rede corporativa que tem acesso ao sistema SAP. Ele estabelece conexões HTTPS de saida para o service bus do Azure Data Factory (nenhuma porta de entrada necessária). O Data Factory envia instrucoes ao SHIR via este canal de saida, e o SHIR executa atividades de copia localmente, enviando dados ao Azure pela mesma conexão de saida. Este e o padrão normal para acessar fontes on-premises sem VPN ou ExpressRoute (embora essas sejam alternativas se conectividade direta for preferida).

</details>

<details>
<summary>2. A API do Salesforce da equipe de marketing retorna resultados paginados com 2.000 registros por pagina é um token de próxima pagina. Como o pipeline do Data Factory deve tratar isso?</summary>

**Use o conector REST com regras de paginacao.** O conector REST do Data Factory suporta regras de paginacao configuraveis que automaticamente seguem tokens de próxima pagina até que todos os dados sejam recuperados. Você configura a regra de paginacao no linked service REST ou dataset, específicando onde a URL ou token de próxima pagina aparece na resposta (ex.: um header, campo do body ou parametro de query). A atividade Copy trata a iteracao transparentemente sem requerer uma atividade de loop.

</details>

<details>
<summary>3. Um pipeline tem três pipelines filhos paralelos (lojas, SAP, Salesforce). O pipeline SAP falha mas os outros dois tem sucesso. Usando dependência "Upon Completion", o que acontece com o pipeline de transformacao downstream?</summary>

**O pipeline de transformacao ainda executa.** "Upon Completion" significa que a atividade downstream executa independente de se o upstream teve sucesso ou falhou - ela apenas espera a atividade terminar. Isso permite que o pipeline de transformacao trate carregamentos parciais de dados graciosamente (talvez processando apenas as fontes que tiveram sucesso). Em contraste, "Upon Success" pularia a transformacao inteiramente se qualquer upstream falhasse. A escolha de design depende de se carregamentos parciais de dados são aceitaveis para o negócio.

</details>

<details>
<summary>4. Por que você escolheria ELT (carregar e depois transformar no Synapse) em vez de ETL (transformar no Data Factory Data Flows) para carregar 200 bancos de dados de lojas em um warehouse central?</summary>

**O engine MPP (Massively Parallel Processing) do Synapse e otimizado para transformacoes em larga escala em dados já no warehouse.** Carregar dados brutos via atividade Copy (custo mínimo de computacao) e depois executar transformacoes SQL no Synapse aproveita a computacao distribuida do dedicated SQL pool. Data Factory Data Flows usam clusters Spark que devem inicializar (5-7 minutos de cold start), são cobrados por minuto de computacao e são mais adequados para transformacoes complexas não-SQL. Para transformacoes expressaveis em SQL (joins, agregacoes, conversoes de tipo), ELT no Synapse e tipicamente mais rápido e mais barato em escala.

</details>

## Laboratório de validação

Implante uma prova de conceito mínima para validar seu design:

1. Crie um resource group para este laboratório:

```bash
az group create --name rg-az305-challenge22 --location eastus
```

2. Implante um Data Factory é uma storage account com containers de origem e destino:

```bash
az storage account create \
  --name staz305ch22$RANDOM \
  --resource-group rg-az305-challenge22 \
  --sku Standard_LRS \
  --kind StorageV2

az storage container create --name source --account-name <your-account-name>
az storage container create --name sink --account-name <your-account-name>

az storage blob upload \
  --account-name <your-account-name> \
  --container-name source \
  --name sales-data.csv \
  --data "store_id,date,revenue\n1,2024-01-01,5000\n2,2024-01-01,7500" \
  --type block

az datafactory create \
  --name adf-az305-ch22 \
  --resource-group rg-az305-challenge22 \
  --location eastus
```

3. Crie um linked service e execute um pipeline de copia:

```bash
az datafactory linked-service create \
  --factory-name adf-az305-ch22 \
  --resource-group rg-az305-challenge22 \
  --name BlobStorageLS \
  --properties '{
    "type": "AzureBlobStorage",
    "typeProperties": {
      "connectionString": "'$(az storage account show-connection-string --name <your-account-name> --resource-group rg-az305-challenge22 --query connectionString -o tsv)'"
    }
  }'
```

4. Verifique que o Data Factory e linked service foram criados:

```bash
az datafactory linked-service show \
  --factory-name adf-az305-ch22 \
  --resource-group rg-az305-challenge22 \
  --name BlobStorageLS \
  --query "name"
```

:::tip
Esta mini-implantação válida suas decisoes de design com recursos reais do Azure. E opcional mas recomendada.
:::

## Limpeza

```bash
az group delete --name rg-az305-challenge22 --yes --no-wait
```

---

**Próximo**: [Challenge 23: Design a Data Analytics Solution](/docs/az-305/data-storage/challenge-23)
