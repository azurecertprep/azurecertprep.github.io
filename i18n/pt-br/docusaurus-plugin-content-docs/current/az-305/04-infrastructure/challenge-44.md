---
sidebar_position: 11
title: "Challenge 44: Design a Migration Strategy Using CAF"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 44: Design a Migration Strategy Using CAF

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $0-2 | **Peso no Exame: 30-35%**

:::

## Introducao

A Precision Manufacturing e uma empresa de manufatura de medio porte operando 200 servidores em 2 data centers on-premises (primario em Chicago, DR em Dallas). O contrato de locacao do data center em Chicago expira em 18 meses, e o contrato da instalacao de Dallas expira 6 meses depois. O CEO se comprometeu a migrar inteiramente para Azure em vez de renovar os contratos, projetando uma reducao de custos de 30% em 3 anos.

O ambiente atual inclui: 80 VMs Windows Server (executando aplicacoes web IIS em .NET Framework 4.x, servidores de arquivo, controladores de dominio Active Directory), 50 VMs Linux (servidores web Apache/Nginx, aplicacoes Python customizadas, servidores de build Jenkins), 30 instancias SQL Server (versoes variando de 2012 a 2022, algumas com consultas cross-database) e 40 aplicacoes legadas com dependencias nao documentadas. Algumas aplicacoes tem requisitos de conformidade (SOX para sistemas financeiros, FDA 21 CFR Part 11 para gerenciamento de qualidade).

A equipe de TI tem experiencia limitada em cloud (2 engenheiros com certificacao AZ-104) e a organizacao nao tem landing zone Azure existente. Eles precisam de um plano de migracao estruturado usando o Microsoft Cloud Adoption Framework que enderece prontidao organizacional, planejamento tecnico e execucao em fases.

## Habilidades do Exame Cobertas

- Avaliar uma solucao de migracao que utiliza o Microsoft Cloud Adoption Framework for Azure

## Tarefas de Design

### Parte 1: Fase de Estrategia e Planejamento CAF

1. Aplique a metodologia de Estrategia do CAF: defina motivacoes de negocio (saida do data center, reducao de custos, modernizacao), resultados de negocio (KPIs mensuraveis) e justificativa financeira para a migracao.
2. Crie um plano de racionalizacao usando os 5 Rs para uma amostra representativa de workloads:
   - Controladores de dominio Active Directory (Rehost? Rearchitect para Entra ID?)
   - Aplicacoes .NET Framework 4.x IIS (Rehost para VMs? Refactor para App Service?)
   - Instancias SQL Server 2012 (Rehost para SQL em VM? Refactor para Azure SQL MI?)
   - Servidores de build Jenkins (Rehost? Replace com Azure DevOps/GitHub Actions?)
   - Servidores de arquivo (Rehost? Replace com Azure Files/SharePoint?)
3. Projete um plano de ondas de migracao que agrupe workloads em 4-6 ondas baseado em: mapeamento de dependencias, criticidade de negocio, complexidade tecnica e requisitos de conformidade. Documente quais workloads vao em cada onda e por que.

### Parte 2: Fase Ready do CAF - Design da Landing Zone

4. Projete uma landing zone Azure usando a arquitetura enterprise-scale do CAF. Documente:
   - Hierarquia de management groups (root, platform, workloads, sandbox)
   - Estrategia de subscriptions (unica vs. multiplas subscriptions por ambiente)
   - Topologia de rede (hub-spoke com hub em cada regiao)
   - Integracao de identidade (identidade hibrida com Entra Connect)
5. Defina guardrails de governanca para a landing zone usando Azure Policy:
   - Regioes permitidas (requisito de conformidade)
   - Tags obrigatorias (centro de custo, ambiente, proprietario)
   - Tipos de recurso negados (prevenir recursos nao gerenciados)
   - Baselines de seguranca (criptografia, restricoes de rede)
6. Projete a infraestrutura de servicos compartilhados que deve ser implantada antes de qualquer migracao de workload: conectividade VPN/ExpressRoute, resolucao DNS, monitoramento (Log Analytics), seguranca (Microsoft Defender for Cloud).

### Parte 3: Fase Adopt do CAF - Execucao da Migracao

7. Projete o processo de avaliacao usando Azure Migrate:
   - Descoberta e inventario (agentless vs. agent-based)
   - Mapeamento de dependencias (coleta de dados de 30 dias)
   - Recomendacoes de dimensionamento baseadas em performance
   - Estimativa de custo para alvos Azure
8. Crie uma timeline de migracao que se encaixe no prazo de 18 meses do contrato, considerando:
   - Setup da landing zone (meses 1-3)
   - Migracao piloto da Onda 1 (meses 3-5)
   - Ondas 2-4 migracao em massa (meses 5-14)
   - Onda 5 aplicacoes complexas/legadas (meses 14-17)
   - Descomissionamento e saida do contrato (mes 18)
9. Projete uma estrategia de teste e validacao para cada onda de migracao: teste pre-migracao, execucao da migracao, validacao pos-migracao, benchmarking de performance e teste de aceitacao do usuario.

### Parte 4: Fase Govern e Manage do CAF

10. Projete o modelo de governanca continua: quem aprova novas implantacoes de recursos Azure, como o custo e alocado de volta para unidades de negocio, como a conformidade e monitorada continuamente.
11. Crie um registro de riscos para a migracao identificando os 5 principais riscos (ex: dependencias nao descobertas, degradacao de performance, tempo de inatividade prolongado) com estrategias de mitigacao para cada.
12. Defina metricas de sucesso para cada fase do CAF: Strategy (business case aprovado), Plan (avaliacao completa), Ready (landing zone implantada), Adopt (workloads migrados com SLA atendido), Govern (politicas aplicadas), Manage (operacoes funcionando).

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-44"
  items={[
    "5 Rs rationalization applied to at least 5 distinct workload types with justified target state",
    "Migration wave plan groups 200 servers into 4-6 waves with dependency-based sequencing",
    "Landing zone design covers management groups, subscriptions, networking, identity, and governance policies",
    "Migration timeline fits within 18-month lease deadline with buffer for contingencies",
    "Risk register identifies top 5 migration risks with quantified impact and mitigation plans",
    "Success metrics defined for each CAF phase with measurable KPIs"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Os 5 Rs da Racionalizacao</summary>

O framework dos 5 Rs ajuda a determinar a abordagem de migracao para cada workload: **Rehost** (lift-and-shift para IaaS com mudancas minimas), **Refactor** (modificacoes menores para usar recursos PaaS), **Rearchitect** (mudancas significativas de codigo para adotar padroes cloud-native), **Rebuild** (reescrever do zero quando a arquitetura atual e muito restritiva), **Replace** (trocar para uma solucao SaaS como Microsoft 365 ou Dynamics 365). Comece com "rehost assumido" para planejamento inicial, entao refine conforme voce avalia cada workload.

</details>

<details>
<summary>Dica 2: Aceleradores de Landing Zone</summary>

A Microsoft fornece aceleradores de landing zone (anteriormente implementacoes de referencia enterprise-scale) como templates IaC. A arquitetura enterprise-scale do CAF inclui: hierarquia de management groups, rede hub-spoke, logging centralizado, governanca orientada a politicas e integracao de identidade. Comece com o acelerador e customize em vez de construir do zero. Isso reduz significativamente a timeline da fase "Ready".

</details>

<details>
<summary>Dica 3: Sequenciamento de Ondas de Migracao</summary>

Sequencie ondas por dependencia e risco: Onda 1 deve ser workloads de baixo risco e bem compreendidos para construir confianca da equipe e validar a landing zone. Ondas intermediarias lidam com a massa de workloads padrao. Ondas finais abordam workloads complexos com dependencias dificeis. Nunca coloque controladores de dominio ou DNS na primeira onda. Considere "gravidade de dependencia" - se 20 servidores dependem de um banco de dados compartilhado, o banco de dados deve migrar na mesma onda ou antes.

</details>

<details>
<summary>Dica 4: Tipos de Avaliacao do Azure Migrate</summary>

Azure Migrate oferece diferentes tipos de avaliacao: **Azure VM assessment** (dimensionamento correto para IaaS), **Azure SQL assessment** (compatibilidade com Azure SQL DB, MI ou SQL em VM), **Azure App Service assessment** (compatibilidade para migracao de web apps) e **Azure VMware Solution assessment** (para workloads VMware). Execute multiplos tipos de avaliacao para workloads que podem ter como alvo IaaS ou PaaS para comparar trade-offs de custo e recursos.

</details>

<details>
<summary>Dica 5: Consideracoes de Conformidade na Migracao</summary>

Conformidade SOX e FDA 21 CFR Part 11 requerem: trilhas de auditoria (Azure Activity Log, diagnostic logs), controles de acesso (RBAC, Conditional Access), gerenciamento de mudancas (procedimentos de migracao documentados), validacao de integridade de dados (comparacao de hash pre/pos migracao) e monitoramento continuo de conformidade (dashboard de conformidade regulatoria do Microsoft Defender for Cloud). Esses workloads podem precisar de subscriptions ou resource groups dedicados com politicas mais restritas.

</details>

## Recursos de Aprendizagem

- [Microsoft Cloud Adoption Framework overview](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/overview)
- [CAF migration methodology](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/migrate/)
- [Azure landing zone overview](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/)
- [Five Rs of rationalization](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/digital-estate/5-rs-of-rationalization)
- [Azure Migrate overview](https://learn.microsoft.com/en-us/azure/migrate/migrate-services-overview)
- [CAF enterprise-scale landing zone](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/enterprise-scale/architecture)

## Verificacao de Conhecimento

<details>
<summary>1. Uma empresa tem 200 servidores para migrar com prazo de 18 meses. A equipe de migracao quer avaliar todos os servidores antes de migrar qualquer um. Qual principio do CAF isso viola e qual e a abordagem recomendada?</summary>

**Isso viola o principio "iterar e aprender" e arrisca paralisia por analise.** O CAF recomenda uma abordagem incremental: avalie uma onda piloto (10-20 servidores), migre-os para validar a landing zone e processos, entao aplique licoes aprendidas nas ondas subsequentes. Tentar avaliar completamente todos os 200 servidores antes de migrar qualquer um consome meses da timeline sem entregar valor de negocio. Use "racionalizacao assumida" (assuma rehost) para planejamento inicial e refine avaliacoes onda a onda.

</details>

<details>
<summary>2. Durante o mapeamento de dependencias, voce descobre que 15 aplicacoes todas se conectam a uma unica instancia SQL Server 2012 usando consultas cross-database. Qual restricao de migracao isso cria?</summary>

**Consultas cross-database impedem migracao para Azure SQL Database (banco de dados unico).** Azure SQL Database nao suporta consultas cross-database dentro do mesmo servidor (cada banco de dados e isolado). Opcoes: (1) Migrar para Azure SQL Managed Instance que suporta consultas cross-database dentro da mesma instancia, (2) Rehost em SQL Server em uma Azure VM, (3) Refatorar aplicacoes para eliminar dependencias cross-database (timeline mais longa). Todas as 15 aplicacoes e o SQL Server devem estar na mesma onda de migracao pois nao podem funcionar independentemente.

</details>

<details>
<summary>3. A equipe de migracao implanta a landing zone e migra a Onda 1 com sucesso. Durante a Onda 2, descobrem que o espaco de endereco da VNet hub e muito pequeno para acomodar todas as subnets planejadas. Qual fase do CAF deveria ter prevenido isso?</summary>

**A fase Ready (design da landing zone).** A landing zone deveria ter sido dimensionada com base na avaliacao completa do estate digital da fase Plan. O planejamento de enderecos IP deve considerar todos os workloads em todas as ondas, nao apenas as necessidades imediatas. Isso destaca a importancia da transicao Plan-para-Ready: a avaliacao do estate digital informa dimensionamento de rede, estrategia de subscriptions e planejamento de capacidade de recursos. O CAF recomenda projetar a landing zone para o estado alvo, nao apenas para a primeira onda.

</details>

<details>
<summary>4. Uma aplicacao financeira sujeita a conformidade SOX precisa migrar. A equipe de conformidade insiste em um periodo de execucao paralela onde ambas as instancias on-premises e Azure funcionam simultaneamente com comparacao de dados. Qual abordagem de migracao suporta isso?</summary>

**Migracao online com periodo de validacao.** Use Azure Migrate com replicacao continua (para VMs) ou Azure Database Migration Service em modo online (para bancos de dados) para replicar mudancas em tempo quase real. Ambos os ambientes funcionam simultaneamente, permitindo que a equipe de conformidade compare outputs e valide integridade de dados. Somente apos validacao bem-sucedida (tipicamente 2-4 semanas para workloads regulados) voce faz o cutover. Essa abordagem satisfaz requisitos de gerenciamento de mudancas SOX ao fornecer um periodo de validacao documentado com capacidade de rollback.

</details>

## Limpeza

```bash
# Este challenge e primariamente focado em design
# Se voce implantou algum recurso Azure para exploracao:
az group delete --name rg-az305-challenge44 --yes --no-wait
```

---

**Proximo**: [Challenge 45: Design Server and Application Migration](/docs/az-305/infrastructure/challenge-45)
