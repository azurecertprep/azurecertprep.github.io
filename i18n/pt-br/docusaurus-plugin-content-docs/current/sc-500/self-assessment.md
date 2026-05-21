---
sidebar_position: 4
title: "Estou pronto?"
---

import SelfAssessment from '@site/src/components/SelfAssessment';

# Estou pronto para o SC-500?

Antes de mergulhar nos desafios, avalie sua prontidao. O SC-500 assume que voce ja tem experiencia administrando recursos Azure (nivel AZ-104) e entende conceitos basicos de seguranca.

## Checklist de autoavaliacao

Clique em cada linha para alternar entre: ✅ Confortavel | ⚠️ Preciso Revisar | ❌ Novo para Mim

### Pre-requisitos

<SelfAssessment
  storageKey="sc500-prereqs"
  skills={[
    "Tenho experiencia com administracao Azure (nivel AZ-104)",
    "Entendo conceitos de identidade (autenticacao, autorizacao, federacao)",
    "Consigo navegar o Portal Azure e usar Azure CLI para gerenciamento de recursos",
    "Entendo rede basica (subnets, NSGs, DNS, load balancers, TLS)",
    "Ja implantei e gerenciei recursos Azure (VMs, storage, bancos de dados)",
    "Entendo conceitos de criptografia (simetrica, assimetrica, hashing, TLS)",
  ]}
/>

### Dominio 1: Gerenciar identidade, acesso e governanca (20–25%)

#### Gerenciar identidade e acesso

<SelfAssessment
  storageKey="sc500-domain1-identity"
  skills={[
    "Consigo configurar Privileged Identity Management (PIM) para roles Entra e recursos Azure",
    "Consigo projetar e implementar politicas de Conditional Access com logica de avaliacao adequada",
    "Consigo configurar metodos de autenticacao multifator e authentication strengths",
    "Consigo implementar politicas de identity protection (sign-in risk, user risk)",
    "Consigo configurar external identities e cross-tenant access settings",
    "Consigo implementar Entra ID entitlement management (access packages, catalogs)",
  ]}
/>

#### Gerenciar governanca

<SelfAssessment
  storageKey="sc500-domain1-governance"
  skills={[
    "Consigo projetar e implementar custom RBAC roles (Actions, DataActions, scopes)",
    "Consigo configurar Azure Policy para enforcement de conformidade de seguranca",
    "Consigo implementar resource locks e hierarquias de management group",
    "Consigo configurar e revisar acesso usando Entra access reviews",
    "Consigo implementar administrative units para administracao delegada",
    "Consigo projetar estrategias de governanca usando management groups e subscriptions",
  ]}
/>

### Dominio 2: Proteger armazenamento, bancos de dados e rede (25–30%)

#### Proteger armazenamento e bancos de dados

<SelfAssessment
  storageKey="sc500-domain2-storage"
  skills={[
    "Consigo configurar criptografia de storage account com customer-managed keys (CMK)",
    "Consigo implementar restricoes de rede de storage account (firewalls, VNet rules, private endpoints)",
    "Consigo configurar shared access signatures (SAS) e stored access policies",
    "Consigo implementar seguranca Azure SQL (TDE, Always Encrypted, dynamic data masking)",
    "Consigo configurar firewall rules e private endpoints do Azure SQL",
    "Consigo implementar controle de acesso Key Vault (modelo RBAC vs access policies)",
    "Consigo configurar networking, backup e soft-delete/purge protection do Key Vault",
  ]}
/>

#### Proteger rede

<SelfAssessment
  storageKey="sc500-domain2-networking"
  skills={[
    "Consigo projetar e implementar regras NSG com ordenacao de prioridade adequada",
    "Consigo configurar regras Azure Firewall (network rules, application rules, DNAT)",
    "Consigo implementar private endpoints e configurar private DNS zones",
    "Consigo configurar politicas Web Application Firewall (WAF) no Application Gateway",
    "Consigo implementar planos DDoS Protection e configurar mitigacao",
    "Consigo projetar segmentacao de rede usando VNets, subnets e NSGs",
    "Consigo configurar service endpoints vs private endpoints (conhecer os trade-offs)",
    "Consigo implementar Azure Bastion para acesso seguro a VMs",
  ]}
/>

### Dominio 3: Proteger computacao (20–25%)

#### Proteger workloads de IA

<SelfAssessment
  storageKey="sc500-domain3-ai"
  skills={[
    "Consigo identificar e mitigar riscos de exposicao de dados antes de implantar IA (Purview DSPM)",
    "Consigo configurar sensitivity labels para proteger dados exibidos pelo Copilot",
    "Consigo implementar Azure AI content safety e content filtering",
    "Consigo avaliar e remediar oversharing no SharePoint para Copilot readiness",
    "Consigo configurar controles de seguranca para deployments do Azure OpenAI",
  ]}
/>

#### Proteger VMs e containers

<SelfAssessment
  storageKey="sc500-domain3-compute"
  skills={[
    "Consigo configurar Microsoft Defender for Servers (Plan 1 vs Plan 2)",
    "Consigo implementar just-in-time (JIT) VM access",
    "Consigo configurar adaptive application controls para VMs",
    "Consigo implementar endpoint protection e vulnerability scanning",
    "Consigo configurar Microsoft Defender for Containers (registry scanning, runtime)",
    "Consigo implementar Azure Policy para Kubernetes admission control",
    "Consigo configurar disk encryption (Azure Disk Encryption, server-side encryption)",
    "Consigo proteger Azure App Service (TLS, access restrictions, managed identity)",
  ]}
/>

### Dominio 4: Gerenciar e monitorar postura de seguranca (20–25%)

#### Gerenciamento de postura de seguranca

<SelfAssessment
  storageKey="sc500-domain4-posture"
  skills={[
    "Consigo configurar e gerenciar environment settings do Defender for Cloud",
    "Consigo avaliar e melhorar o Secure Score",
    "Consigo identificar e remediar riscos usando attack path analysis",
    "Consigo configurar Defender CSPM e cloud security graph",
    "Consigo implementar avaliacoes de regulatory compliance",
    "Consigo configurar alertas de seguranca e suprimir falsos positivos",
  ]}
/>

#### Microsoft Sentinel e monitoramento

<SelfAssessment
  storageKey="sc500-domain4-sentinel"
  skills={[
    "Consigo configurar data connectors no Microsoft Sentinel",
    "Consigo escrever queries KQL basicas para investigacao de seguranca",
    "Consigo criar e gerenciar Sentinel analytics rules (scheduled, NRT, Fusion)",
    "Consigo implementar Sentinel automation rules e playbooks (Logic Apps)",
    "Consigo projetar e configurar Sentinel workbooks para monitoramento de seguranca",
    "Consigo implementar threat intelligence indicators e hunting queries",
    "Consigo configurar diagnostic settings e rotear logs para Log Analytics",
    "Consigo implementar integracao de alertas do Microsoft Defender for Cloud com Sentinel",
  ]}
/>

## Guia de pontuacao

| Seus resultados | Recomendacao |
|-----------------|--------------|
| Maioria ✅ | Pronto para agendar o exame |
| Mix de ✅ e ⚠️ | Revise areas fracas usando os desafios relevantes, depois agende |
| Varios ⚠️ e ❌ | Complete todos os desafios nos seus dominios fracos primeiro |
| Maioria ❌ | Comece com AZ-104 ou as trilhas do Microsoft Learn, depois volte |

:::tip Prontidao para o exame

Diferente do AZ-500, o SC-500 inclui **seguranca de IA** (Purview DSPM, sensitivity labels, Copilot readiness). Se voce tem experiencia com seguranca Azure tradicional mas nao trabalhou com Purview ou seguranca do M365 Copilot, reserve tempo extra de estudo para os desafios de IA do Dominio 3.

:::
