---
sidebar_position: 2
title: "Challenge 15: Design Database Tiers and Compute"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 15: Design Database Tiers and Compute

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $5-12 | **Peso no Exame: 20-25%**

:::

## Introducao

CloudTenant e uma plataforma SaaS B2B que fornece ferramentas de gerenciamento de projetos para 300 clientes corporativos. Sua aplicacao usa Azure SQL Database como backend, e a equipe de engenharia esta enfrentando problemas tanto de custo quanto de desempenho. Durante dias uteis entre 9h e 18h, o sistema lida com uma media de 5.000 conexoes simultaneas com throughput de consultas consistente. No entanto, entre 19h e 7h (e nos finais de semana), o uso cai para menos de 50 conexoes, com apenas verificacoes de saude automatizadas e um punhado de usuarios internacionais ativos.

CloudTenant tem tres camadas de carga de trabalho distintas. A camada "Standard" (250 clientes) requer desempenho de proposito geral com SLA de 99,99% e pode tolerar breves atrasos de failover. A camada "Premium" (45 clientes) requer latencia de leitura/escrita inferior a 5ms para recursos de colaboracao em tempo real e usa In-Memory OLTP para cache de estado de sessao. A camada "Enterprise" (5 clientes) tem bancos de dados que excedem 4TB e crescem rapidamente, com padroes de consulta imprevisiveis que ocasionalmente escaneiam terabytes de dados.

A equipe financeira relata que o gasto atual com banco de dados e $18.000/mes e deseja reduzi-lo em pelo menos 30% sem degradar a experiencia do cliente. O VP de Engenharia quer entender os trade-offs entre os modelos de compra DTU e vCore e se a computacao serverless poderia ajudar com o problema de custos fora do horario comercial.

## Habilidades do Exame Cobertas

- Recomendar uma camada de servico e camada de computacao de banco de dados

## Tarefas de Design

### Parte 1: Selecao de Modelo de Compra

1. Compare os modelos de compra DTU e vCore para as cargas de trabalho da CloudTenant. Documente as vantagens e desvantagens de cada modelo para seus padroes de uso especificos.
2. Recomende qual modelo de compra usar para cada camada de cliente (Standard, Premium, Enterprise) e justifique sua escolha.
3. Determine se os bancos de dados da camada Standard se beneficiariam da simplicidade do modelo DTU ou da flexibilidade do modelo vCore em escalar computacao e armazenamento independentemente.

### Parte 2: Atribuicao de Camada de Servico

4. Para a camada Standard (250 bancos de dados), recomende a camada de servico apropriada (General Purpose, Business Critical ou Hyperscale). Considere o requisito de SLA de 99,99% e restricoes de custo.
5. Para a camada Premium (45 bancos de dados), avalie se a camada Business Critical e necessaria para latencia inferior a 5ms e suporte a In-Memory OLTP. Identifique quaisquer abordagens alternativas.
6. Para a camada Enterprise (5 bancos de dados excedendo 4TB), explique por que Hyperscale e a camada apropriada e descreva sua arquitetura (cache multi-camada, backups baseados em snapshots, named replicas).
7. Documente o tamanho maximo de banco de dados, replicas de leitura e SLA de disponibilidade para cada camada de servico.

### Parte 3: Otimizacao da Camada de Computacao

8. Avalie a computacao serverless para os bancos de dados da camada Standard. Calcule a economia potencial dado o padrao de uso (ativo 9 horas em dias uteis, uso minimo caso contrario). Considere o atraso de auto-pause e as implicacoes de latencia de cold-start.
9. Determine se computacao provisionada com capacidade reservada (termos de 1 ano ou 3 anos) seria mais economica do que serverless para qualquer uma das camadas de carga de trabalho.
10. Projete uma estrategia de auto-scaling para a camada Enterprise usando named replicas Hyperscale para lidar com cargas de trabalho de leitura imprevisiveis sem provisionar excessivamente o primario.
11. Calcule o custo mensal projetado apos a otimizacao e verifique se atinge a meta de reducao de 30%.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-15"
  items={[
    "Clearly articulated DTU vs vCore trade-offs with a recommendation for each workload tier",
    "Assigned appropriate service tiers (General Purpose, Business Critical, Hyperscale) with documented justification",
    "Evaluated serverless compute for off-hours cost savings with cold-start trade-off analysis",
    "Designed Hyperscale architecture for the Enterprise tier including named replicas",
    "Projected monthly cost demonstrates at least 30% reduction from current $18,000/month spend"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Modelo DTU vs vCore</summary>

O modelo DTU (Database Transaction Unit) agrupa computacao, armazenamento e I/O em uma unica unidade. E mais simples de entender, mas menos flexivel. O modelo vCore permite que voce escolha independentemente computacao (vCores, memoria) e armazenamento, e suporta computacao serverless. O modelo vCore tambem permite Azure Hybrid Benefit (usando licencas existentes de SQL Server) para economia de ate 55%. Se a equipe ja possui licencas de SQL Server, vCore e quase sempre mais economico.

</details>

<details>
<summary>Dica 2: Capacidades das Camadas de Servico</summary>

General Purpose: armazenamento remoto, SLA de 99,99%, ate 128 vCores, maximo de 4TB (banco de dados unico) ou 16TB (Managed Instance). Business Critical: armazenamento SSD local, latencia inferior a 5ms, In-Memory OLTP, replica de leitura integrada, SLA de 99,995% com redundancia de zona. Hyperscale: arquitetura de armazenamento distribuido, ate 100TB, backups quase instantaneos independente do tamanho, ate 30 named replicas, scale-up/down rapido.

</details>

<details>
<summary>Dica 3: Computacao Serverless</summary>

Serverless esta disponivel apenas no modelo vCore na camada General Purpose (e Hyperscale). Ele escala automaticamente a computacao com base na demanda da carga de trabalho e pode pausar automaticamente o banco de dados apos um periodo configuravel de inatividade (minimo 1 hora). Quando pausado, voce paga apenas pelo armazenamento. O cold start (retomada da pausa) leva aproximadamente 1-2 minutos. Serverless e ideal para cargas de trabalho intermitentes e imprevisiveis. NAO e adequado para cargas de trabalho que requerem latencia baixa constante.

</details>

<details>
<summary>Dica 4: Named Replicas Hyperscale</summary>

Named replicas Hyperscale sao nos de computacao de escala de leitura independentes com seu proprio objetivo de nivel de servico. Diferente das replicas de leitura regulares, elas podem ser escaladas independentemente do primario e podem servir como endpoints de conexao para cargas de trabalho especificas (como relatorios ou analytics). Voce pode ter ate 30 named replicas por banco de dados primario. Named replicas tambem estao disponiveis na camada de computacao serverless.

</details>

<details>
<summary>Dica 5: Capacidade Reservada</summary>

Capacidade reservada do Azure SQL Database oferece desconto de 30-65% comparado ao preco pay-as-you-go para compromissos de 1 ano ou 3 anos. Reservas se aplicam apenas aos custos de computacao vCore (nao armazenamento ou I/O). Para cargas de trabalho com uso de baseline previsivel, combinar capacidade reservada para a baseline com serverless ou auto-scale provisionado para picos pode otimizar custos significativamente.

</details>

## Recursos de Aprendizagem

- [Azure SQL Database purchasing models](https://learn.microsoft.com/en-us/azure/azure-sql/database/purchasing-models)
- [Azure SQL Database service tiers](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tiers-general-purpose-business-critical)
- [Serverless compute tier for Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-overview)
- [Hyperscale service tier](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-hyperscale)
- [Hyperscale named replicas](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-hyperscale-replicas)
- [Azure SQL Database reserved capacity](https://learn.microsoft.com/en-us/azure/azure-sql/database/reserved-capacity-overview)
- [DTU-based resource limits](https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-dtu-single-databases)
- [vCore-based resource limits](https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-vcore-single-databases)

## Verificacao de Conhecimento

<details>
<summary>1. Um banco de dados e muito utilizado durante o horario comercial mas tem atividade quase zero a noite e nos finais de semana. A aplicacao pode tolerar um atraso de cold start de 1-2 minutos para a primeira conexao apos inatividade. Qual camada de computacao minimiza o custo?</summary>

**Camada de computacao Serverless (General Purpose, modelo vCore).** Serverless pausa automaticamente o banco de dados apos um periodo configuravel de inatividade e retoma na proxima conexao. Quando pausado, voce paga apenas pelo armazenamento. Isso e ideal para cargas de trabalho intermitentes onde a latencia de cold-start e aceitavel.

</details>

<details>
<summary>2. Qual camada de servico e necessaria para In-Memory OLTP e latencia de leitura/escrita inferior a 5ms?</summary>

**Business Critical.** Esta camada usa armazenamento SSD local (em vez de Azure Premium Storage remoto usado pela General Purpose) e fornece capacidades de In-Memory OLTP. A arquitetura de armazenamento local elimina a latencia de rede para operacoes de I/O, permitindo latencia consistente inferior a 5ms tanto para leituras quanto escritas. Tambem inclui uma replica de leitura de alta disponibilidade integrada sem custo extra.

</details>

<details>
<summary>3. Um banco de dados cresceu para 8TB e requer restauracao point-in-time quase instantanea independente do tamanho do banco de dados. Qual camada de servico voce deve recomendar?</summary>

**Hyperscale.** Suporta bancos de dados de ate 100TB e usa uma arquitetura de backup baseada em snapshots que fornece backups e restauracoes quase instantaneos independente do tamanho do banco de dados. General Purpose e limitado a 4TB por banco de dados, e Business Critical tem limitacoes de tamanho similares. A arquitetura de armazenamento distribuido do Hyperscale (page servers + log service) permite essa escalabilidade.

</details>

<details>
<summary>4. Uma organizacao tem licencas existentes de SQL Server Enterprise com Software Assurance. Como eles podem reduzir os custos do Azure SQL Database?</summary>

**Azure Hybrid Benefit.** Com o modelo de compra vCore, clientes com Software Assurance ativo em licencas de SQL Server Enterprise ou Standard podem troca-las por tarifas com desconto no Azure SQL Database (economia de ate 55%). Este beneficio se aplica a computacao provisionada e serverless no modelo vCore, mas NAO esta disponivel com o modelo DTU.

</details>

## Limpeza

```bash
# Delete resource groups for each tier
az group delete --name rg-cloudtenant-standard --yes --no-wait
az group delete --name rg-cloudtenant-premium --yes --no-wait
az group delete --name rg-cloudtenant-enterprise --yes --no-wait

# Cancel any reserved capacity purchases (if testing in a lab, use a short-term reservation)
# Note: Reserved capacity cancellations may incur early termination fees
```

---

**Proximo**: [Challenge 16: Design Database Scalability](/docs/az-305/data-storage/challenge-16)
