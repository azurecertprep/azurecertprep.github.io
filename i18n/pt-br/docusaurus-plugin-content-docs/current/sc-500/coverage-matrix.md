---
sidebar_position: 99
title: "Matriz de cobertura"
---

# SC-500 matriz de cobertura de habilidades

Esta matriz mapeia cada habilidade oficial do exame para um desafio especifico. Use-a para verificar que voce praticou todas as habilidades testaveis.

## Dominio 1: Gerenciar identidade, acesso e governanca (20–25%)

### Projetar e implementar acesso privilegiado

| Habilidade | Desafio | Status |
|------------|---------|--------|
| Projetar e implementar Privileged Identity Management (PIM) para recursos Azure e roles Microsoft Entra | [Challenge 01](./01-identity-access-governance/challenge-01.md) | Coberto |
| Configurar requisitos de ativacao de role (aprovacao, justificativa, MFA) | [Challenge 01](./01-identity-access-governance/challenge-01.md) | Coberto |
| Implementar acesso just-in-time para roles administrativas | [Challenge 01](./01-identity-access-governance/challenge-01.md) | Coberto |
| Monitorar e auditar acesso privilegiado usando alertas PIM e access reviews | [Challenge 02](./01-identity-access-governance/challenge-02.md) | Coberto |
| Projetar contas de acesso de emergencia (break-glass) | [Challenge 02](./01-identity-access-governance/challenge-02.md) | Coberto |

### Projetar e implementar Conditional Access

| Habilidade | Desafio | Status |
|------------|---------|--------|
| Projetar politicas de Conditional Access para cenarios zero-trust | [Challenge 03](./01-identity-access-governance/challenge-03.md) | Coberto |
| Configurar controles de grant e sessao do Conditional Access | [Challenge 03](./01-identity-access-governance/challenge-03.md) | Coberto |
| Implementar authentication context do Conditional Access | [Challenge 03](./01-identity-access-governance/challenge-03.md) | Coberto |
| Configurar authentication strengths e metodos MFA | [Challenge 04](./01-identity-access-governance/challenge-04.md) | Coberto |
| Solucionar problemas e avaliar avaliacao de politicas de Conditional Access | [Challenge 04](./01-identity-access-governance/challenge-04.md) | Coberto |

### Gerenciar protecao de identidade e risco

| Habilidade | Desafio | Status |
|------------|---------|--------|
| Configurar politicas de sign-in risk e user risk | [Challenge 05](./01-identity-access-governance/challenge-05.md) | Coberto |
| Implementar politicas de Conditional Access baseadas em risco | [Challenge 05](./01-identity-access-governance/challenge-05.md) | Coberto |
| Investigar e remediar usuarios e sign-ins arriscados | [Challenge 05](./01-identity-access-governance/challenge-05.md) | Coberto |
| Configurar external identities e cross-tenant access settings | [Challenge 06](./01-identity-access-governance/challenge-06.md) | Coberto |
| Implementar colaboracao B2B e entitlement management | [Challenge 06](./01-identity-access-governance/challenge-06.md) | Coberto |

### Projetar e implementar governanca

| Habilidade | Desafio | Status |
|------------|---------|--------|
| Projetar e implementar custom RBAC roles para acesso least-privilege | [Challenge 07](./01-identity-access-governance/challenge-07.md) | Coberto |
| Configurar atribuicoes de role em escopo de management group, subscription e recurso | [Challenge 07](./01-identity-access-governance/challenge-07.md) | Coberto |
| Projetar e implementar Azure Policy para conformidade de seguranca | [Challenge 08](./01-identity-access-governance/challenge-08.md) | Coberto |
| Configurar modos de enforcement de policy (audit, deny, deploy-if-not-exists) | [Challenge 08](./01-identity-access-governance/challenge-08.md) | Coberto |
| Implementar resource locks e hierarquias de governanca | [Challenge 09](./01-identity-access-governance/challenge-09.md) | Coberto |
| Configurar e gerenciar access reviews para grupos, apps e roles | [Challenge 10](./01-identity-access-governance/challenge-10.md) | Coberto |
| Projetar entitlement management com access packages e catalogs | [Challenge 11](./01-identity-access-governance/challenge-11.md) | Coberto |
| Implementar administrative units para administracao delegada | [Challenge 12](./01-identity-access-governance/challenge-12.md) | Coberto |

## Dominio 2: Proteger armazenamento, bancos de dados e rede (25–30%)

### Planejar e implementar seguranca para armazenamento

| Habilidade | Desafio | Status |
|------------|---------|--------|
| Configurar criptografia de storage account (Microsoft-managed e customer-managed keys) | [Challenge 13](./02-storage-databases-networking/challenge-13.md) | Coberto |
| Configurar acesso de rede de storage account (firewalls e virtual network rules) | [Challenge 13](./02-storage-databases-networking/challenge-13.md) | Coberto |
| Configurar shared access signatures (SAS) e stored access policies | [Challenge 14](./02-storage-databases-networking/challenge-14.md) | Coberto |
| Gerenciar access keys de storage account e rotacao de chaves | [Challenge 14](./02-storage-databases-networking/challenge-14.md) | Coberto |
| Configurar lifecycle management do Azure Storage para seguranca | [Challenge 14](./02-storage-databases-networking/challenge-14.md) | Coberto |
| Implementar infrastructure encryption (double encryption) para armazenamento | [Challenge 13](./02-storage-databases-networking/challenge-13.md) | Coberto |

### Planejar e implementar seguranca para bancos de dados

| Habilidade | Desafio | Status |
|------------|---------|--------|
| Configurar firewall rules e virtual network rules do Azure SQL Database | [Challenge 15](./02-storage-databases-networking/challenge-15.md) | Coberto |
| Configurar transparent data encryption (TDE) do Azure SQL com CMK | [Challenge 15](./02-storage-databases-networking/challenge-15.md) | Coberto |
| Implementar Always Encrypted para criptografia em nivel de coluna | [Challenge 16](./02-storage-databases-networking/challenge-16.md) | Coberto |
| Configurar dynamic data masking e row-level security | [Challenge 16](./02-storage-databases-networking/challenge-16.md) | Coberto |
| Implementar auditoria e deteccao de ameacas do Azure SQL | [Challenge 17](./02-storage-databases-networking/challenge-17.md) | Coberto |
| Configurar seguranca do Cosmos DB (RBAC, restricoes de rede, criptografia) | [Challenge 17](./02-storage-databases-networking/challenge-17.md) | Coberto |

### Planejar e implementar seguranca para Azure Key Vault

| Habilidade | Desafio | Status |
|------------|---------|--------|
| Configurar controle de acesso Key Vault (RBAC vs access policies) | [Challenge 18](./02-storage-databases-networking/challenge-18.md) | Coberto |
| Configurar networking do Key Vault (private endpoint, firewall) | [Challenge 18](./02-storage-databases-networking/challenge-18.md) | Coberto |
| Implementar gerenciamento e rotacao de keys, secrets e certificados | [Challenge 19](./02-storage-databases-networking/challenge-19.md) | Coberto |
| Configurar backup, soft-delete e purge protection do Key Vault | [Challenge 19](./02-storage-databases-networking/challenge-19.md) | Coberto |

### Projetar e implementar seguranca de rede

| Habilidade | Desafio | Status |
|------------|---------|--------|
| Projetar e implementar network security groups (NSGs) e application security groups (ASGs) | [Challenge 20](./02-storage-databases-networking/challenge-20.md) | Coberto |
| Configurar NSG flow logs e traffic analytics | [Challenge 20](./02-storage-databases-networking/challenge-20.md) | Coberto |
| Projetar e implementar Azure Firewall (rules, threat intelligence, IDPS) | [Challenge 21](./02-storage-databases-networking/challenge-21.md) | Coberto |
| Configurar Azure Firewall Manager e firewall policies | [Challenge 21](./02-storage-databases-networking/challenge-21.md) | Coberto |
| Implementar private endpoints e Private Link services | [Challenge 22](./02-storage-databases-networking/challenge-22.md) | Coberto |
| Configurar private DNS zones para resolucao de private endpoint | [Challenge 22](./02-storage-databases-networking/challenge-22.md) | Coberto |
| Configurar Web Application Firewall (WAF) no Application Gateway e Front Door | [Challenge 23](./02-storage-databases-networking/challenge-23.md) | Coberto |
| Implementar planos DDoS Protection e configurar politicas de mitigacao | [Challenge 24](./02-storage-databases-networking/challenge-24.md) | Coberto |
| Configurar Azure Bastion para acesso remoto seguro | [Challenge 25](./02-storage-databases-networking/challenge-25.md) | Coberto |
| Implementar estrategias de segmentacao de rede e micro-segmentacao | [Challenge 25](./02-storage-databases-networking/challenge-25.md) | Coberto |

## Dominio 3: Proteger computacao (20–25%)

### Proteger workloads de IA

| Habilidade | Desafio | Status |
|------------|---------|--------|
| Identificar e mitigar riscos de exposicao de dados antes de implantar workloads de IA | [Challenge 26](./03-secure-compute/challenge-26.md) | Coberto |
| Configurar Microsoft Purview Data Security Posture Management (DSPM) para IA | [Challenge 26](./03-secure-compute/challenge-26.md) | Coberto |
| Avaliar permissoes de site SharePoint para oversharing (Copilot readiness) | [Challenge 27](./03-secure-compute/challenge-27.md) | Coberto |
| Implementar sensitivity labels para proteger dados exibidos pelo Copilot | [Challenge 27](./03-secure-compute/challenge-27.md) | Coberto |
| Configurar Azure AI content safety e politicas de content filtering | [Challenge 28](./03-secure-compute/challenge-28.md) | Coberto |
| Implementar controles de seguranca para deployments do Azure OpenAI | [Challenge 28](./03-secure-compute/challenge-28.md) | Coberto |
| Projetar e implementar deteccao e mitigacao de prompt injection | [Challenge 29](./03-secure-compute/challenge-29.md) | Coberto |
| Monitorar seguranca de workloads de IA usando Defender for Cloud | [Challenge 30](./03-secure-compute/challenge-30.md) | Coberto |

### Planejar e implementar seguranca para maquinas virtuais

| Habilidade | Desafio | Status |
|------------|---------|--------|
| Configurar Microsoft Defender for Servers (Plan 1 e Plan 2) | [Challenge 31](./03-secure-compute/challenge-31.md) | Coberto |
| Implementar just-in-time (JIT) VM access | [Challenge 31](./03-secure-compute/challenge-31.md) | Coberto |
| Configurar adaptive application controls | [Challenge 32](./03-secure-compute/challenge-32.md) | Coberto |
| Implementar endpoint protection e politicas antimalware | [Challenge 32](./03-secure-compute/challenge-32.md) | Coberto |
| Configurar disk encryption (Azure Disk Encryption, server-side encryption com CMK) | [Challenge 33](./03-secure-compute/challenge-33.md) | Coberto |
| Implementar vulnerability assessment e remediacao para VMs | [Challenge 34](./03-secure-compute/challenge-34.md) | Coberto |
| Configurar update management e conformidade de patches | [Challenge 34](./03-secure-compute/challenge-34.md) | Coberto |

### Planejar e implementar seguranca para containers e app services

| Habilidade | Desafio | Status |
|------------|---------|--------|
| Configurar Microsoft Defender for Containers (registry scanning, runtime protection) | [Challenge 35](./03-secure-compute/challenge-35.md) | Coberto |
| Implementar Azure Policy para Kubernetes admission control | [Challenge 35](./03-secure-compute/challenge-35.md) | Coberto |
| Configurar scanning de imagem de container e gerenciamento de vulnerabilidades | [Challenge 36](./03-secure-compute/challenge-36.md) | Coberto |
| Implementar acesso seguro ao container registry (ACR com private endpoint, content trust) | [Challenge 36](./03-secure-compute/challenge-36.md) | Coberto |
| Configurar seguranca do Azure App Service (TLS, access restrictions, managed identity) | [Challenge 37](./03-secure-compute/challenge-37.md) | Coberto |
| Implementar Defender for App Service e configurar alertas de seguranca | [Challenge 37](./03-secure-compute/challenge-37.md) | Coberto |
| Configurar seguranca do Azure Functions (autenticacao, restricoes de rede) | [Challenge 38](./03-secure-compute/challenge-38.md) | Coberto |
| Implementar politicas de seguranca do API Management (JWT validation, rate limiting) | [Challenge 38](./03-secure-compute/challenge-38.md) | Coberto |

## Dominio 4: Gerenciar e monitorar postura de seguranca (20–25%)

### Configurar e gerenciar Microsoft Defender for Cloud

| Habilidade | Desafio | Status |
|------------|---------|--------|
| Configurar environment settings no Microsoft Defender for Cloud | [Challenge 39](./04-security-posture-monitoring/challenge-39.md) | Coberto |
| Avaliar postura de seguranca usando Cloud Security Posture Management (CSPM) | [Challenge 39](./04-security-posture-monitoring/challenge-39.md) | Coberto |
| Identificar e remediar riscos usando attack path analysis | [Challenge 39](./04-security-posture-monitoring/challenge-39.md) | Coberto |
| Configurar Secure Score e implementar recomendacoes de seguranca | [Challenge 40](./04-security-posture-monitoring/challenge-40.md) | Coberto |
| Configurar dashboards de regulatory compliance e avaliacoes | [Challenge 40](./04-security-posture-monitoring/challenge-40.md) | Coberto |
| Configurar alertas e incidentes de seguranca do Defender for Cloud | [Challenge 41](./04-security-posture-monitoring/challenge-41.md) | Coberto |
| Implementar regras de supressao de alertas para falsos positivos | [Challenge 41](./04-security-posture-monitoring/challenge-41.md) | Coberto |
| Configurar workflow automation para respostas de seguranca | [Challenge 42](./04-security-posture-monitoring/challenge-42.md) | Coberto |
| Integrar Defender for Cloud com Microsoft Sentinel | [Challenge 42](./04-security-posture-monitoring/challenge-42.md) | Coberto |

### Configurar e gerenciar Microsoft Sentinel

| Habilidade | Desafio | Status |
|------------|---------|--------|
| Configurar data connectors para fontes Azure e non-Azure | [Challenge 43](./04-security-posture-monitoring/challenge-43.md) | Coberto |
| Configurar data collection rules (DCR) para ingestao de logs customizados | [Challenge 43](./04-security-posture-monitoring/challenge-43.md) | Coberto |
| Projetar e implementar Sentinel analytics rules (scheduled, NRT, Microsoft Security) | [Challenge 44](./04-security-posture-monitoring/challenge-44.md) | Coberto |
| Configurar deteccao Fusion para ataques avancados multi-stage | [Challenge 44](./04-security-posture-monitoring/challenge-44.md) | Coberto |
| Implementar automation rules e playbooks usando Logic Apps | [Challenge 45](./04-security-posture-monitoring/challenge-45.md) | Coberto |
| Configurar workflows SOAR (Security Orchestration, Automation, and Response) | [Challenge 45](./04-security-posture-monitoring/challenge-45.md) | Coberto |
| Projetar e configurar Sentinel workbooks para monitoramento de seguranca | [Challenge 46](./04-security-posture-monitoring/challenge-46.md) | Coberto |
| Implementar threat intelligence indicators e feeds | [Challenge 47](./04-security-posture-monitoring/challenge-47.md) | Coberto |
| Configurar threat hunting queries e bookmarks | [Challenge 47](./04-security-posture-monitoring/challenge-47.md) | Coberto |

### Monitorar seguranca usando KQL e diagnostic settings

| Habilidade | Desafio | Status |
|------------|---------|--------|
| Escrever queries KQL para investigacao de seguranca (SecurityEvent, SigninLogs, AzureActivity) | [Challenge 48](./04-security-posture-monitoring/challenge-48.md) | Coberto |
| Configurar diagnostic settings para rotear logs de seguranca para Log Analytics | [Challenge 48](./04-security-posture-monitoring/challenge-48.md) | Coberto |
| Implementar politicas de retencao de logs e estrategias de arquivamento | [Challenge 49](./04-security-posture-monitoring/challenge-49.md) | Coberto |
| Configurar alertas baseados em queries KQL e thresholds de metricas | [Challenge 49](./04-security-posture-monitoring/challenge-49.md) | Coberto |
| Implementar avaliacoes de security baseline do Azure Monitor | [Challenge 50](./04-security-posture-monitoring/challenge-50.md) | Coberto |
| Projetar e implementar procedimentos de resposta a incidentes usando Sentinel incidents | [Challenge 51](./04-security-posture-monitoring/challenge-51.md) | Coberto |
| Configurar entity behavior analytics (UEBA) para deteccao de anomalias | [Challenge 51](./04-security-posture-monitoring/challenge-51.md) | Coberto |

---

**Total de habilidades cobertas: 89/89 (100%)**
