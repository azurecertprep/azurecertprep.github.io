---
sidebar_position: 11
title: "Desafio 44: Projetar uma Estratégia de Migração Usando CAF"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 44: projetar uma estratégia de migração usando CAF

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $0-2 | **Peso no Exame: 30-35%**

:::

## Introdução

A Precision Manufacturing é uma empresa de manufatura de médio porte operando 200 servidores em 2 data centers on-premises (primário em Chicago, DR em Dallas). O contrato de locacao do data center em Chicago expira em 18 meses, e o contrato da instalacao de Dallas expira 6 meses depois. O CEO se comprometeu a migrar inteiramente para Azure em vez de renovar os contratos, projetando uma redução de custos de 30% em 3 anos.

O ambiente atual inclui: 80 VMs Windows Server (executando aplicações web IIS em .NET Framework 4.x, servidores de arquivo, controladores de dominio Active Directory), 50 VMs Linux (servidores web Apache/Nginx, aplicações Python customizadas, servidores de build Jenkins), 30 instâncias SQL Server (versoes variando de 2012 a 2022, algumas com consultas cross-database) e 40 aplicações legadas com dependências não documentadas. Algumas aplicações tem requisitos de conformidade (SOX para sistemas financeiros, FDA 21 CFR Part 11 para gerenciamento de qualidade).

A equipe de TI tem experiência limitada em cloud (2 engenheiros com certificacao AZ-104) e a organização não tem landing zone Azure existente. Eles precisam de um plano de migração estruturado usando o Microsoft Cloud Adoption Framework que enderece prontidao organizacional, planejamento técnico e execução em fases.

## Habilidades do exame cobertas

- Avaliar uma solução de migração que utiliza o Microsoft Cloud Adoption Framework for Azure

## Tarefas de design

### Parte 1: fase de estratégia e planejamento CAF

1. Aplique a metodologia de Estratégia do CAF: defina motivacoes de negocio (saida do data center, redução de custos, modernizacao), resultados de negocio (KPIs mensuraveis) e justificativa financeira para a migração.
2. Crie um plano de racionalizacao usando os 5 Rs para uma amostra representativa de workloads:
   - Controladores de dominio Active Directory (Rehost? Rearchitect para Entra ID?)
   - Aplicações .NET Framework 4.x IIS (Rehost para VMs? Refactor para App Service?)
   - Instâncias SQL Server 2012 (Rehost para SQL em VM? Refactor para Azure SQL MI?)
   - Servidores de build Jenkins (Rehost? Replace com Azure DevOps/GitHub Actions?)
   - Servidores de arquivo (Rehost? Replace com Azure Files/SharePoint?)
3. Projete um plano de ondas de migração que agrupe workloads em 4-6 ondas baseado em: mapeamento de dependências, criticidade de negocio, complexidade técnica e requisitos de conformidade. Documente quais workloads vao em cada onda e por que.

### Parte 2: fase ready do CAF - design da landing zone

4. Projete uma landing zone Azure usando a arquitetura enterprise-scale do CAF. Documente:
   - Hierarquia de management groups (root, platform, workloads, sandbox)
   - Estratégia de subscriptions (única vs. múltiplas subscriptions por ambiente)
   - Topologia de rede (hub-spoke com hub em cada região)
   - Integração de identidade (identidade hibrida com Entra Connect)
5. Defina guardrails de governança para a landing zone usando Azure Policy:
   - Regiões permitidas (requisito de conformidade)
   - Tags obrigatorias (centro de custo, ambiente, proprietario)
   - Tipos de recurso negados (prevenir recursos não gerenciados)
   - Baselines de segurança (criptografia, restrições de rede)
6. Projete a infraestrutura de serviços compartilhados que deve ser implantada antes de qualquer migração de workload: conectividade VPN/ExpressRoute, resolução DNS, monitoramento (Log Analytics), segurança (Microsoft Defender for Cloud).

### Parte 3: fase adopt do CAF - execução da migração

7. Projete o processo de avaliação usando Azure Migrate:
   - Descoberta e inventário (agentless vs. agent-based)
   - Mapeamento de dependências (coleta de dados de 30 dias)
   - Recomendacoes de dimensionamento baseadas em performance
   - Estimativa de custo para alvos Azure
8. Crie uma timeline de migração que se encaixe no prazo de 18 meses do contrato, considerando:
   - Setup da landing zone (meses 1-3)
   - Migração piloto da Onda 1 (meses 3-5)
   - Ondas 2-4 migração em massa (meses 5-14)
   - Onda 5 aplicações complexas/legadas (meses 14-17)
   - Descomissionamento e saida do contrato (mes 18)
9. Projete uma estratégia de teste e validação para cada onda de migração: teste pré-migração, execução da migração, validação pós-migração, benchmarking de performance e teste de aceitacao do usuário.

### Parte 4: fase govern e manage do CAF

10. Projete o modelo de governança continua: quem aprova novas implantacoes de recursos Azure, como o custo e alocado de volta para unidades de negocio, como a conformidade e monitorada continuamente.
11. Crie um registro de riscos para a migração identificando os 5 principais riscos (ex: dependências não descobertas, degradacao de performance, tempo de inatividade prolongado) com estratégias de mitigacao para cada.
12. Defina metricas de sucesso para cada fase do CAF: Strategy (business case aprovado), Plan (avaliação completa), Ready (landing zone implantada), Adopt (workloads migrados com SLA atendido), Govern (políticas aplicadas), Manage (operações funcionando).

## Criterios de sucesso

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

O framework dos 5 Rs ajuda a determinar a abordagem de migração para cada workload: **Rehost** (lift-and-shift para IaaS com mudanças minimas), **Refactor** (modificacoes menores para usar recursos PaaS), **Rearchitect** (mudanças significativas de código para adotar padrões cloud-native), **Rebuild** (reescrever do zero quando a arquitetura atual e muito restritiva), **Replace** (trocar para uma solução SaaS como Microsoft 365 ou Dynamics 365). Comece com "rehost assumido" para planejamento inicial, entao refine conforme você avalia cada workload.

</details>

<details>
<summary>Dica 2: Aceleradores de Landing Zone</summary>

A Microsoft fornece aceleradores de landing zone (anteriormente implementações de referência enterprise-scale) como templates IaC. A arquitetura enterprise-scale do CAF inclui: hierarquia de management groups, rede hub-spoke, logging centralizado, governança orientada a políticas e integração de identidade. Comece com o acelerador e customize em vez de construir do zero. Isso reduz significativamente a timeline da fase "Ready".

</details>

<details>
<summary>Dica 3: Sequenciamento de Ondas de Migração</summary>

Sequencie ondas por dependência e risco: Onda 1 deve ser workloads de baixo risco e bem compreendidos para construir confiança da equipe é validar a landing zone. Ondas intermediarias lidam com a massa de workloads padrão. Ondas finais abordam workloads complexos com dependências dificeis. Nunca coloque controladores de dominio ou DNS na primeira onda. Considere "gravidade de dependência" - se 20 servidores dependem de um banco de dados compartilhado, o banco de dados deve migrar na mesma onda ou antes.

</details>

<details>
<summary>Dica 4: Tipos de Avaliação do Azure Migrate</summary>

Azure Migrate oferece diferentes tipos de avaliação: **Azure VM assessment** (dimensionamento correto para IaaS), **Azure SQL assessment** (compatibilidade com Azure SQL DB, MI ou SQL em VM), **Azure App Service assessment** (compatibilidade para migração de web apps) e **Azure VMware Solution assessment** (para workloads VMware). Execute múltiplos tipos de avaliação para workloads que podem ter como alvo IaaS ou PaaS para comparar trade-offs de custo e recursos.

</details>

<details>
<summary>Dica 5: Consideracoes de Conformidade na Migração</summary>

Conformidade SOX e FDA 21 CFR Part 11 requerem: trilhas de auditoria (Azure Activity Log, diagnostic logs), controles de acesso (RBAC, Conditional Access), gerenciamento de mudanças (procedimentos de migração documentados), validação de integridade de dados (comparacao de hash pré/pós migração) e monitoramento continuo de conformidade (dashboard de conformidade regulatoria do Microsoft Defender for Cloud). Esses workloads podem precisar de subscriptions ou resource groups dedicados com políticas mais restritas.

</details>

## Recursos de aprendizagem

- [Microsoft Cloud Adoption Framework overview](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/overview)
- [CAF migration methodology](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/migrate/)
- [Azure landing zone overview](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/)
- [Five Rs of rationalization](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/digital-estate/5-rs-of-rationalization)
- [Azure Migrate overview](https://learn.microsoft.com/en-us/azure/migrate/migrate-services-overview)
- [CAF enterprise-scale landing zone](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/enterprise-scale/architecture)

## Verificação de conhecimento

<details>
<summary>1. Uma empresa tem 200 servidores para migrar com prazo de 18 meses. A equipe de migração quer avaliar todos os servidores antes de migrar qualquer um. Qual principio do CAF isso viola e qual é a abordagem recomendada?</summary>

**Isso viola o principio "iterar e aprender" e arrisca paralisia por análise.** O CAF recomenda uma abordagem incremental: avalie uma onda piloto (10-20 servidores), migre-os para validar a landing zone e processos, entao aplique licoes aprendidas nas ondas subsequentes. Tentar avaliar completamente todos os 200 servidores antes de migrar qualquer um consome meses da timeline sem entregar valor de negocio. Use "racionalizacao assumida" (assuma rehost) para planejamento inicial e refine avaliacoes onda a onda.

</details>

<details>
<summary>2. Durante o mapeamento de dependências, você descobre que 15 aplicações todas se conectam a uma única instância SQL Server 2012 usando consultas cross-database. Qual restrição de migração isso cria?</summary>

**Consultas cross-database impedem migração para Azure SQL Database (banco de dados único).** Azure SQL Database não suporta consultas cross-database dentro do mesmo servidor (cada banco de dados e isolado). Opcoes: (1) Migrar para Azure SQL Managed Instance que suporta consultas cross-database dentro da mesma instância, (2) Rehost em SQL Server em uma Azure VM, (3) Refatorar aplicações para eliminar dependências cross-database (timeline mais longa). Todas as 15 aplicações e o SQL Server devem estar na mesma onda de migração pois não podem funcionar independentemente.

</details>

<details>
<summary>3. A equipe de migração implanta a landing zone e migra a Onda 1 com sucesso. Durante a Onda 2, descobrem que o espaço de endereço da VNet hub e muito pequeno para acomodar todas as subnets planejadas. Qual fase do CAF deveria ter prevenido isso?</summary>

**A fase Ready (design da landing zone).** A landing zone deveria ter sido dimensionada com base na avaliação completa do estate digital da fase Plan. O planejamento de endereços IP deve considerar todos os workloads em todas as ondas, não apenas as necessidades imediatas. Isso destaca a importância da transicao Plan-para-Ready: a avaliação do estate digital informa dimensionamento de rede, estratégia de subscriptions e planejamento de capacidade de recursos. O CAF recomenda projetar a landing zone para o estado alvo, não apenas para a primeira onda.

</details>

<details>
<summary>4. Uma aplicação financeira sujeita a conformidade SOX precisa migrar. A equipe de conformidade insiste em um período de execução paralela onde ambas as instâncias on-premises e Azure funcionam simultaneamente com comparacao de dados. Qual abordagem de migração suporta isso?</summary>

**Migração online com período de validação.** Use Azure Migrate com replicação continua (para VMs) ou Azure Database Migration Service em modo online (para bancos de dados) para replicar mudanças em tempo quase real. Ambos os ambientes funcionam simultaneamente, permitindo que a equipe de conformidade compare outputs e valide integridade de dados. Somente apos validação bem-sucedida (tipicamente 2-4 semanas para workloads regulados) você faz o cutover. Essa abordagem satisfaz requisitos de gerenciamento de mudanças SOX ao fornecer um período de validação documentado com capacidade de rollback.

</details>

## Limpeza

```bash
# Este challenge e primariamente focado em design
# Se você implantou algum recurso Azure para exploracao:
az group delete --name rg-az305-challenge44 --yes --no-wait
```

---

**Próximo**: [Challenge 45: Design Server and Application Migration](/docs/az-305/infrastructure/challenge-45)
