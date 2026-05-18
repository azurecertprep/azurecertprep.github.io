---
sidebar_position: 1
title: "Challenge 14: Design a Relational Data Platform"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 14: Design a Relational Data Platform

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-15 | **Peso no Exame: 20-25%**

:::

## Introducao

ShopWave e uma empresa de e-commerce de medio porte que atualmente opera tres bancos de dados separados on-premises. Seu banco de dados transacional principal lida com 2.000 pedidos por minuto durante horarios de pico e armazena catalogo de produtos, inventario e dados de clientes em SQL Server 2019. Uma segunda instancia de SQL Server serve como banco de dados de relatorios, executando consultas analiticas complexas que fazem join em mais de 50 tabelas e as vezes levam 10-15 minutos para completar. Alem disso, a ShopWave adquiriu recentemente um concorrente menor cujo sistema de avaliacoes de produtos roda em PostgreSQL 14 com 200GB de dados e extensoes customizadas (PostGIS para filtragem de avaliacoes baseada em localizacao e pg_trgm para busca de texto fuzzy).

O CTO definiu um orcamento firme de $2.000/mes para todas as cargas de trabalho de banco de dados no Azure. O banco de dados transacional deve manter latencia de escrita inferior a 20ms durante horarios de pico. O banco de dados de relatorios pode tolerar latencia maior, mas precisa lidar com consultas que abrangem bilhoes de linhas. O banco de dados PostgreSQL deve manter suas extensoes e minimizar alteracoes de codigo durante a migracao. A equipe tem recursos limitados de DBA (um administrador de banco de dados em tempo parcial) e deseja servicos gerenciados sempre que possivel.

ShopWave tambem requer que todos os bancos de dados suportem backups automatizados com restauracao point-in-time de pelo menos 7 dias, e que o banco de dados transacional tenha um SLA de 99,99%. A empresa opera exclusivamente na regiao US East hoje, mas planeja expandir para a Europa dentro de 18 meses.

## Habilidades do Exame Cobertas

- Recomendar uma solucao para armazenamento de dados relacionais

## Tarefas de Design

### Parte 1: Selecao de Servico

1. Para cada um dos tres bancos de dados da ShopWave, recomende o servico Azure mais apropriado (Azure SQL Database, Azure SQL Managed Instance, Azure Database for PostgreSQL Flexible Server ou Azure Database for MySQL Flexible Server). Justifique cada selecao com base nos requisitos de compatibilidade, necessidades de recursos e complexidade de migracao.
2. Para o banco de dados transacional SQL Server, determine se um modelo de implantacao de banco de dados unico ou elastic pool e mais apropriado dadas as caracteristicas da carga de trabalho.
3. Avalie se Azure SQL Managed Instance seria uma opcao melhor do que Azure SQL Database para a carga de trabalho transacional. Documente pelo menos tres fatores em sua decisao.
4. Identifique quais recursos do PostgreSQL Flexible Server (versus Single Server, que esta desativado) suportam os requisitos de extensao da empresa adquirida.

### Parte 2: Planejamento de Migracao

5. Projete uma abordagem de migracao para cada banco de dados. Especifique se voce usaria migracao online ou offline, e qual ferramenta (Azure Database Migration Service, backup/restore nativo ou replicacao de dados) e mais apropriada.
6. Determine a estrategia de migracao com tempo de inatividade minimo para o banco de dados transacional, considerando que ele processa pedidos 24/7.
7. Identifique quaisquer alteracoes de esquema ou aplicacao necessarias para a migracao do PostgreSQL manter a funcionalidade de PostGIS e pg_trgm.

### Parte 3: Otimizacao de Custos

8. Estime o custo mensal para sua arquitetura proposta e verifique se cabe no orcamento de $2.000/mes. Considere custos de computacao, armazenamento e backup.
9. Identifique pelo menos duas estrategias de otimizacao de custos (como capacidade reservada, dimensionamento correto ou consolidacao de cargas de trabalho) que poderiam reduzir o gasto mensal total em 20% ou mais.
10. Projete uma estrategia para a futura expansao europeia que minimize custos adicionais enquanto atende aos requisitos de residencia de dados.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-14"
  items={[
    "Selected appropriate Azure database services for all three workloads with documented justification",
    "Demonstrated understanding of Azure SQL Database vs SQL Managed Instance trade-offs",
    "Designed migration strategy with minimal downtime for the transactional database",
    "Validated PostgreSQL extension compatibility with Azure Database for PostgreSQL Flexible Server",
    "Total estimated monthly cost fits within the $2,000 budget constraint",
    "Documented European expansion strategy with data residency considerations"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Azure SQL Database vs Managed Instance</summary>

Azure SQL Database e um mecanismo de banco de dados PaaS totalmente gerenciado. Azure SQL Managed Instance fornece compatibilidade de quase 100% com SQL Server on-premises, incluindo suporte para consultas entre bancos de dados, SQL Server Agent, CLR e linked servers. Se a aplicacao usa recursos especificos do SQL Server alem do T-SQL (como Service Broker ou Database Mail), Managed Instance pode ser necessario. No entanto, SQL Database e tipicamente mais barato para cargas de trabalho de banco de dados unico. Consulte a [comparacao de recursos](https://learn.microsoft.com/en-us/azure/azure-sql/database/features-comparison) para detalhes.

</details>

<details>
<summary>Dica 2: Extensoes PostgreSQL no Azure</summary>

Azure Database for PostgreSQL Flexible Server suporta muitas extensoes populares incluindo PostGIS, pg_trgm, hstore e citext. Voce pode listar as extensoes suportadas no portal Azure ou executando `SELECT * FROM pg_available_extensions;` apos a implantacao. Flexible Server (nao o Single Server desativado) e a opcao de implantacao recomendada com suporte completo a extensoes.

</details>

<details>
<summary>Dica 3: Migracao Online com DMS</summary>

Azure Database Migration Service (DMS) suporta migracao online de SQL Server para Azure SQL Database e SQL Server para Azure SQL Managed Instance. A migracao online usa change data capture para replicar alteracoes em andamento durante a migracao, reduzindo o tempo de inatividade para minutos em vez de horas. Para PostgreSQL, o DMS tambem suporta migracao online usando replicacao logica.

</details>

<details>
<summary>Dica 4: Estimativa de Custos</summary>

Para estimativa de custos, considere: Azure SQL Database General Purpose (vCore) comeca em torno de $370/mes para 2 vCores. PostgreSQL Flexible Server na camada Burstable B2s comeca em torno de $25/mes. Capacidade reservada (1 ano ou 3 anos) oferece economia de 30-65% em computacao. Custos de armazenamento sao separados e tipicamente $0,115/GB/mes para a camada General Purpose.

</details>

<details>
<summary>Dica 5: Elastic Pools vs Bancos de Dados Individuais</summary>

Elastic pools sao economicos quando voce tem multiplos bancos de dados com padroes de uso variaveis e imprevisiveis. Se os bancos de dados tem horarios de pico diferentes, eles podem compartilhar recursos. Para um unico banco de dados transacional de alta vazao com carga consistente, um banco de dados unico com computacao provisionada e geralmente mais economico e oferece desempenho mais previsivel.

</details>

## Recursos de Aprendizagem

- [Features comparison: Azure SQL Database and Azure SQL Managed Instance](https://learn.microsoft.com/en-us/azure/azure-sql/database/features-comparison)
- [Azure SQL Database overview](https://learn.microsoft.com/en-us/azure/azure-sql/database/sql-database-paas-overview)
- [Azure SQL Managed Instance overview](https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/sql-managed-instance-paas-overview)
- [Azure Database for PostgreSQL Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/overview)
- [Azure Database Migration Service](https://learn.microsoft.com/en-us/azure/dms/dms-overview)
- [Choose the right deployment option in Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/azure-sql-iaas-vs-paas-what-is-overview)

## Verificacao de Conhecimento

<details>
<summary>1. Uma empresa precisa migrar um banco de dados SQL Server que usa Service Broker, consultas entre bancos de dados e jobs do SQL Server Agent. Qual servico Azure deve ser usado?</summary>

**Azure SQL Managed Instance.** Ele fornece compatibilidade de quase 100% com SQL Server on-premises, incluindo suporte para Service Broker, consultas entre bancos de dados, SQL Server Agent, CLR e outros recursos com escopo de instancia que Azure SQL Database nao suporta.

</details>

<details>
<summary>2. Quando voce deve escolher um elastic pool em vez de bancos de dados Azure SQL individuais?</summary>

**Quando voce tem multiplos bancos de dados com padroes de uso imprevisiveis ou complementares.** Elastic pools permitem que bancos de dados compartilhem um pool de recursos de computacao (eDTUs ou vCores), tornando-os economicos quando os bancos de dados tem horarios de pico de uso diferentes. Para um banco de dados unico com alta utilizacao consistente, um banco de dados dedicado unico e tipicamente mais economico.

</details>

<details>
<summary>3. Um banco de dados PostgreSQL usa extensoes PostGIS e pg_trgm. Qual e o alvo de migracao Azure recomendado?</summary>

**Azure Database for PostgreSQL Flexible Server.** Ele suporta ambas as extensoes PostGIS e pg_trgm, junto com muitas outras extensoes da comunidade. Single Server esta descontinuado e nao deve ser usado para novas implantacoes. Flexible Server oferece alta disponibilidade, desempenho inteligente e suporte completo a extensoes.

</details>

<details>
<summary>4. Qual e a principal vantagem da migracao online com Azure Database Migration Service comparada a migracao offline?</summary>

**Tempo de inatividade minimo.** A migracao online usa change data capture (CDC) ou replicacao logica para sincronizar continuamente as alteracoes da origem para o destino durante a migracao. A virada real (trocar as aplicacoes para o novo banco de dados) requer apenas minutos de inatividade, comparado a horas ou dias para migracao offline onde a origem deve ser pausada durante a copia completa dos dados.

</details>

## Limpeza

```bash
# Delete the resource group containing all database resources
az group delete --name rg-shopwave-data --yes --no-wait

# If you created a Database Migration Service instance
az group delete --name rg-shopwave-dms --yes --no-wait
```

---

**Proximo**: [Challenge 15: Design Database Tiers and Compute](/docs/az-305/data-storage/challenge-15)
