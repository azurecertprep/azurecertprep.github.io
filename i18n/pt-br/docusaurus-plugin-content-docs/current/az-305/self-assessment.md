---
sidebar_position: 2
title: "Estou Pronto?"
---

import SelfAssessment from '@site/src/components/SelfAssessment';

# Estou pronto para o AZ-305?

O AZ-305 é um exame de **nível expert**. Diferente do AZ-104, que testa habilidades de implementação, o AZ-305 testa sua capacidade de **projetar soluções** que atendam requisitos de negócio e tecnicos. Você ja deve ter forte experiência em administração do Azure antes de tentar este exame.

## Checklist de autoavaliação

Clique em cada linha para alternar entre: ✅ Confortavel | ⚠️ Preciso Revisar | ❌ Novo para Mim

### Administracao Azure (Pre-requisito)

<SelfAssessment
  storageKey="az305-admin-prereq"
  skills={[
    "I have passed AZ-104 or have equivalent Azure administration experience",
    "I can deploy and manage VMs, App Services, and container workloads",
    "I can configure VNets, NSGs, load balancers, and DNS",
    "I can manage storage accounts, RBAC, and Azure Policy",
    "I can set up monitoring, alerts, and diagnostic settings",
    "I have managed production Azure environments (not just lab/dev)",
  ]}
/>

### Habilidades de arquitetura e design

<SelfAssessment
  storageKey="az305-architecture"
  skills={[
    "I can evaluate trade-offs between cost, performance, and availability",
    "I understand SLA composition (calculating composite SLAs)",
    "I can explain the difference between RTO and RPO",
    "I know when to use IaaS vs PaaS vs serverless for a given workload",
    "I can design multi-tier applications (web, API, database, cache)",
    "I understand the Azure Well-Architected Framework pillars",
    "I can design hybrid solutions (on-prem + Azure connectivity)",
  ]}
/>

### Identidade e governanca

<SelfAssessment
  storageKey="az305-identity"
  skills={[
    "I understand Entra ID B2B vs B2C vs workforce tenants",
    "I know when to use Conditional Access, PIM, and Access Reviews",
    "I can design a management group hierarchy for a multi-team org",
    "I understand Azure Policy initiatives and compliance enforcement",
    "I know the difference between Key Vault access policies and RBAC",
  ]}
/>

### Dados e armazenamento

<SelfAssessment
  storageKey="az305-data"
  skills={[
    "I can choose between Azure SQL DB, SQL MI, PostgreSQL, and Cosmos DB",
    "I understand DTU vs vCore pricing models",
    "I know Cosmos DB consistency levels and partition key design",
    "I can design storage redundancy (LRS, ZRS, GRS, GZRS and their RA variants)",
    "I understand Data Factory pipelines and Synapse Analytics",
  ]}
/>

### Continuidade de negócios

<SelfAssessment
  storageKey="az305-bcdr"
  skills={[
    "I can design backup strategies for VMs, databases, and blobs",
    "I understand Azure Site Recovery for DR scenários",
    "I can calculate composite SLAs and design for 99.99% availability",
    "I know the HA options for SQL (failover groups, Business Critical tier)",
    "I understand Cosmos DB multi-region writes and consistency trade-offs",
  ]}
/>

### Infraestrutura e rede

<SelfAssessment
  storageKey="az305-infra"
  skills={[
    "I can choose between VPN Gateway, ExpressRoute, and Virtual WAN",
    "I understand the load balancer decision tree (LB vs App GW vs Front Door vs Traffic Manager)",
    "I can design hub-spoke network topologies",
    "I know when to use Azure Firewall vs NSGs vs WAF",
    "I understand Private Link and Private Endpoints",
    "I can design IaC deployment strategies (Bicep vs Terraform, CI/CD)",
  ]}
/>

## Como interpretar seus resultados

### Maioria ✅: você esta pronto!
Va para o [Desafio 01](/docs/az-305/identity-governance-monitoring/challenge-01) e comece a projetar.

### Mistura de ✅ e ⚠️: você esta quase pronto
Foque nós domínios onde você marcou ⚠️. Use os **Recursos de Aprendizado** em cada desafio para preencher lacunas. Considere revisar o [caminho de aprendizado Microsoft Learn para AZ-305](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-305#two-ways-to-prepare).

### Maioria ⚠️ ou ❌: construa sua base primeiro
O AZ-305 se baseia no conhecimento do AZ-104. Se você ainda não completou, faça os [desafios do AZ-104](/docs/az-104/overview) primeiro, ou adquira 6-12 meses de experiência prática com Azure antes de tentar este exame.

## Diferenças principais do AZ-104

| Aspecto | AZ-104 | AZ-305 |
|---------|--------|--------|
| Estilo de questão | "Como você faz X?" | "Qual solução atende estes requisitos?" |
| Profundidade do conhecimento | Saber uma forma correta | Conhecer todas as opções e trade-offs |
| Complexidade do cenário | Servico único | Arquitetura multi-serviço |
| Critérios de decisão | N/A | Custo, desempenho, segurança, conformidade |
| Conhecimento de frameworks | Não exigido | Well-Architected Framework, CAF |

---

**Pronto para começar?** Inicie com o [Desafio 01: Projetar uma Solução de Logging Centralizado](/docs/az-305/identity-governance-monitoring/challenge-01).
