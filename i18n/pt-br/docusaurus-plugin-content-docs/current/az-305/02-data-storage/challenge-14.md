---
sidebar_position: 1
title: "Desafio 14: Projetar uma Plataforma de Dados Relacionais"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 14: projetar uma plataforma de dados relacionais

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-15 | **Peso no Exame: 20-25%**

:::

## Introdução

ShopWave é uma empresa de e-commerce de médio porte que atualmente opera três bancos de dados separados on-premises. Seu banco de dados transacional principal lida com 2.000 pedidos por minuto durante horarios de pico e armazena catálogo de produtos, inventário e dados de clientes em SQL Server 2019. Uma segunda instância de SQL Server serve como banco de dados de relatórios, executando consultas analiticas complexas que fazem join em mais de 50 tabelas e as vezes levam 10-15 minutos para completar. Além disso, a ShopWave adquiriu recentemente um concorrente menor cujo sistema de avaliacoes de produtos roda em PostgreSQL 14 com 200GB de dados e extensões customizadas (PostGIS para filtragem de avaliacoes baseada em localização e pg_trgm para busca de texto fuzzy).

O CTO definiu um orcamento firme de $2.000/mes para todas as cargas de trabalho de banco de dados no Azure. O banco de dados transacional deve manter latência de escrita inferior a 20ms durante horarios de pico. O banco de dados de relatórios pode tolerar latência maior, mas precisa lidar com consultas que abrangem bilhoes de linhas. O banco de dados PostgreSQL deve manter suas extensões é minimizar alteracoes de código durante a migração. A equipe tem recursos limitados de DBA (um administrador de banco de dados em tempo parcial) e deseja serviços gerenciados sempre que possível.

ShopWave também requer que todos os bancos de dados suportem backups automatizados com restauração point-in-time de pelo menos 7 dias, e que o banco de dados transacional tenha um SLA de 99,99%. A empresa opera exclusivamente na região US East hoje, mas planeja expandir para a Europa dentro de 18 meses.

## Habilidades do exame cobertas

- Recomendar uma solução para armazenamento de dados relacionais

## Tarefas de design

### Parte 1: seleção de serviço

1. Para cada um dos três bancos de dados da ShopWave, recomende o serviço Azure mais aprópriado (Azure SQL Database, Azure SQL Managed Instance, Azure Database for PostgreSQL Flexible Server ou Azure Database for MySQL Flexible Server). Justifique cada seleção com base nos requisitos de compatibilidade, necessidades de recursos e complexidade de migração.
2. Para o banco de dados transacional SQL Server, determine se um modelo de implantação de banco de dados único ou elastic pool e mais aprópriado dadas as caracteristicas da carga de trabalho.
3. Avalie se Azure SQL Managed Instance seria uma opcao melhor do que Azure SQL Database para a carga de trabalho transacional. Documente pelo menos três fatores em sua decisão.
4. Identifique quais recursos do PostgreSQL Flexible Server (versus Single Server, que esta desativado) suportam os requisitos de extensão da empresa adquirida.

### Parte 2: planejamento de migração

5. Projete uma abordagem de migração para cada banco de dados. Especifique se você usaria migração online ou offline, e qual ferramenta (Azure Database Migration Service, backup/restore nativo ou replicação de dados) e mais aprópriada.
6. Determine a estratégia de migração com tempo de inatividade mínimo para o banco de dados transacional, considerando que ele processa pedidos 24/7.
7. Identifique quaisquer alteracoes de esquema ou aplicação necessárias para a migração do PostgreSQL manter a funcionalidade de PostGIS e pg_trgm.

### Parte 3: otimização de custos

8. Estime o custo mensal para sua arquitetura proposta e verifique se cabe no orcamento de $2.000/mes. Considere custos de computacao, armazenamento e backup.
9. Identifique pelo menos duas estratégias de otimização de custos (como capacidade reservada, dimensionamento correto ou consolidacao de cargas de trabalho) que poderiam reduzir o gasto mensal total em 20% ou mais.
10. Projete uma estratégia para a futura expansao europeia que minimize custos adicionais enquanto atende aos requisitos de residência de dados.

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-14"
  items={[
    "Selected apprópriate Azure database services for all three workloads with documented justification",
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

Azure SQL Database é um mecanismo de banco de dados PaaS totalmente gerenciado. Azure SQL Managed Instance fornece compatibilidade de quase 100% com SQL Server on-premises, incluindo suporte para consultas entre bancos de dados, SQL Server Agent, CLR e linked servers. Se a aplicação usa recursos específicos do SQL Server além do T-SQL (como Service Broker ou Database Mail), Managed Instance pode ser necessário. No entanto, SQL Database e tipicamente mais barato para cargas de trabalho de banco de dados único. Consulte a [comparacao de recursos](https://learn.microsoft.com/en-us/azure/azure-sql/database/features-comparison) para detalhes.

</details>

<details>
<summary>Dica 2: Extensoes PostgreSQL no Azure</summary>

Azure Database for PostgreSQL Flexible Server suporta muitas extensões populares incluindo PostGIS, pg_trgm, hstore e citext. Você pode listar as extensões suportadas no portal Azure ou executando `SELECT * FROM pg_available_extensions;` apos a implantação. Flexible Server (não o Single Server desativado) e a opcao de implantação recomendada com suporte completo a extensões.

</details>

<details>
<summary>Dica 3: Migração Online com DMS</summary>

Azure Database Migration Service (DMS) suporta migração online de SQL Server para Azure SQL Database e SQL Server para Azure SQL Managed Instance. A migração online usa change data capture para replicar alteracoes em andamento durante a migração, reduzindo o tempo de inatividade para minutos em vez de horas. Para PostgreSQL, o DMS também suporta migração online usando replicação lógica.

</details>

<details>
<summary>Dica 4: Estimativa de Custos</summary>

Para estimativa de custos, considere: Azure SQL Database General Purpose (vCore) começa em torno de $370/mes para 2 vCores. PostgreSQL Flexible Server na camada Burstable B2s começa em torno de $25/mes. Capacidade reservada (1 ano ou 3 anos) oferece economia de 30-65% em computacao. Custos de armazenamento são separados e tipicamente $0,115/GB/mes para a camada General Purpose.

</details>

<details>
<summary>Dica 5: Elastic Pools vs Bancos de Dados Individuais</summary>

Elastic pools são economicos quando você tem múltiplos bancos de dados com padrões de uso variaveis e imprevisiveis. Se os bancos de dados tem horarios de pico diferentes, eles podem compartilhar recursos. Para um único banco de dados transacional de alta vazao com carga consistente, um banco de dados único com computacao provisionada e geralmente mais economico e oferece desempenho mais previsível.

</details>

## Recursos de aprendizagem

- [Features comparison: Azure SQL Database and Azure SQL Managed Instance](https://learn.microsoft.com/en-us/azure/azure-sql/database/features-comparison)
- [Azure SQL Database overview](https://learn.microsoft.com/en-us/azure/azure-sql/database/sql-database-paas-overview)
- [Azure SQL Managed Instance overview](https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/sql-managed-instance-paas-overview)
- [Azure Database for PostgreSQL Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/overview)
- [Azure Database Migration Service](https://learn.microsoft.com/en-us/azure/dms/dms-overview)
- [Choose the right deployment option in Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/azure-sql-iaas-vs-paas-what-is-overview)

## Verificação de conhecimento

<details>
<summary>1. Uma empresa precisa migrar um banco de dados SQL Server que usa Service Broker, consultas entre bancos de dados e jobs do SQL Server Agent. Qual serviço Azure deve ser usado?</summary>

**Azure SQL Managed Instance.** Ele fornece compatibilidade de quase 100% com SQL Server on-premises, incluindo suporte para Service Broker, consultas entre bancos de dados, SQL Server Agent, CLR e outros recursos com escopo de instância que Azure SQL Database não suporta.

</details>

<details>
<summary>2. Quando você deve escolher um elastic pool em vez de bancos de dados Azure SQL individuais?</summary>

**Quando você tem múltiplos bancos de dados com padrões de uso imprevisiveis ou complementares.** Elastic pools permitem que bancos de dados compartilhem um pool de recursos de computacao (eDTUs ou vCores), tornando-os economicos quando os bancos de dados tem horarios de pico de uso diferentes. Para um banco de dados único com alta utilizacao consistente, um banco de dados dedicado único e tipicamente mais economico.

</details>

<details>
<summary>3. Um banco de dados PostgreSQL usa extensões PostGIS e pg_trgm. Qual é o alvo de migração Azure recomendado?</summary>

**Azure Database for PostgreSQL Flexible Server.** Ele suporta ambas as extensões PostGIS e pg_trgm, junto com muitas outras extensões da comunidade. Single Server esta descontinuado e não deve ser usado para novas implantacoes. Flexible Server oferece alta disponibilidade, desempenho inteligente e suporte completo a extensões.

</details>

<details>
<summary>4. Qual é a principal vantagem da migração online com Azure Database Migration Service comparada a migração offline?</summary>

**Tempo de inatividade mínimo.** A migração online usa change data capture (CDC) ou replicação lógica para sincronizar continuamente as alteracoes da origem para o destino durante a migração. A virada real (trocar as aplicações para o novo banco de dados) requer apenas minutos de inatividade, comparado a horas ou dias para migração offline onde a origem deve ser pausada durante a copia completa dos dados.

</details>

## Limpeza

```bash
# Delete the resource group containing all database resources
az group delete --name rg-shopwave-data --yes --no-wait

# If you created a database migration Service instance
az group delete --name rg-shopwave-dms --yes --no-wait
```

---

**Próximo**: [Challenge 15: Design Database Tiers and Compute](/docs/az-305/data-storage/challenge-15)
