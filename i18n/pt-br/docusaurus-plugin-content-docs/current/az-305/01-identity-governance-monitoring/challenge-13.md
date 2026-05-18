---
sidebar_position: 13
title: "Challenge 13: Design Governance for a Multi-Team Organization"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 13: Design Governance for a Multi-Team Organization

:::info Tempo Estimado e Custo

**90-120 min** | **Custo estimado**: $2-5 | **Peso no Exame: 25-30%**

:::

## Introducao

A Contoso Consulting e uma firma de consultoria em tecnologia com 500 pessoas atendendo clientes em tres industrias altamente regulamentadas: saude, servicos financeiros e varejo. Cada engajamento de cliente (tipicamente 6-18 meses) recebe seu proprio ambiente Azure dedicado para garantir isolamento de dados. A qualquer momento, a Contoso executa 30-40 engajamentos ativos em 12 equipes de projeto. Consultores rotacionam entre engajamentos a cada 3-6 meses, e alguns arquitetos senior trabalham em multiplos engajamentos simultaneamente.

O estado atual e insustentavel. A Contoso tem 45 subscriptions do Azure sem estrutura consistente: alguns engajamentos compartilham subscriptions, outros tem multiplas subscriptions para um unico cliente. O tagging e inconsistente (alguns usam a tag "Client", outros usam "Customer" ou "Project"), tornando a atribuicao de custos para faturamento de clientes quase impossivel. Cada equipe de engajamento implanta sua propria governanca, resultando em posturas de conformidade muito diferentes - um problema critico quando clientes de saude requerem conformidade HIPAA, clientes financeiros requerem PCI-DSS, e clientes de varejo tem seus proprios requisitos de privacidade de dados. Quando consultores saem de um engajamento, seu acesso frequentemente permanece por meses porque nao ha desprovisionamento automatizado vinculado ao ciclo de vida do engajamento.

O CTO alocou orcamento para um redesign abrangente de governanca. A solucao deve: (1) fornecer isolamento completo de dados do cliente com limites de conformidade comprovanveis, (2) habilitar rastreamento de custos por engajamento para faturamento preciso de clientes, (3) aplicar politicas de conformidade especificas da industria sem configuracao manual por engajamento, (4) automatizar o ciclo de vida de acesso de consultores vinculado a atribuicoes de engajamento, e (5) escalar para suportar um crescimento planejado de mais de 60 engajamentos simultaneos em dois anos. Esta e a culminacao do seu trabalho de design de governanca - integrando estrutura de management groups, tagging, politica e governanca de identidade em uma solucao coesa.

## Habilidades do Exame Cobertas

- Recomendar uma estrutura para management groups, subscriptions e resource groups
- Recomendar uma estrategia para tagging de recursos
- Recomendar uma solucao para gerenciamento de conformidade
- Recomendar uma solucao para governanca de identidade

## Tarefas de Design

### Parte 1: Arquitetura de Management Groups e Subscriptions

1. Projete a hierarquia completa de management groups para a Contoso Consulting. Considere grupos para: plataforma/servicos compartilhados, landing zones especificas por industria (saude, financeiro, varejo), ambientes sandbox/treinamento e engajamentos descomissionados. Referencie os padroes de design do Challenge 09.
2. Defina a estrategia de subscription para engajamentos de clientes. Decida: uma subscription por engajamento, uma subscription por cliente (com resource groups por engajamento), ou uma subscription por industria. Justifique a escolha considerando isolamento de dados, rastreamento de custos, heranca de politicas e limites de escala.
3. Projete o modelo de servicos compartilhados. Determine como networking hub (Azure Firewall, DNS, VPN), monitoramento centralizado e servicos de identidade sao estruturados. Todos os ambientes de engajamento devem rotear atraves de um firewall central para filtragem e logging de saida.
4. Defina o ciclo de vida do engajamento para subscriptions: como uma nova subscription de engajamento e provisionada (subscription vending), como e configurada com as politicas corretas baseadas na industria do cliente, e como e descomissionada (dados retidos conforme contrato, recursos deletados, subscription movida para management group "Decommissioned").

### Parte 2: Estrategia de Tagging para Faturamento de Clientes

5. Projete a taxonomia de tags obrigatorias para a Contoso. Inclua tags para: nome do cliente, ID do engajamento, vertical da industria, gerente do engajamento, codigo de faturamento, data de inicio e data de termino esperada. Referencie os padroes do Challenge 10.
6. Defina como tags habilitam atribuicao de custos por engajamento para faturamento de clientes. Aborde custos compartilhados (networking, monitoramento, ferramentas de seguranca) que devem ser alocados proporcionalmente entre engajamentos.
7. Projete politicas de aplicacao de tags. Determine quais tags usam `deny` (devem existir antes da criacao do recurso), quais usam `modify` (auto-herdar do resource group), e quais usam `audit` (sinalizar para acompanhamento). Considere que equipes de engajamento usam diferentes ferramentas de IaC e algumas implantacoes manuais via Portal.
8. Aborde o plano de migracao de tags para as 45 subscriptions existentes. Determine como normalizar nomes de tags inconsistentes ("Client" vs. "Customer" vs. "Project") na nova taxonomia padrao.

### Parte 3: Politicas de Conformidade Especificas por Industria

9. Projete iniciativas de politica para cada vertical de industria:
   - **Saude (HIPAA):** criptografia em repouso com CMK, sem endpoints publicos, logging de auditoria obrigatorio, tags de classificacao de dados PHI obrigatorias
   - **Financeiro (PCI-DSS):** segmentacao de rede obrigatoria, separacao de chaves (Key Vaults separados por ambiente), apenas SKUs de VM aprovados, verificacao de vulnerabilidades habilitada
   - **Varejo:** aplicacao de residencia de dados (recursos apenas em regioes aprovadas), tags de tratamento de PII, suporte a direito de exclusao GDPR
10. Projete o modelo de atribuicao de politicas que aplica automaticamente a iniciativa correta da industria quando uma subscription de engajamento e colocada no management group correspondente. Nenhuma atribuicao manual de politica deve ser necessaria.
11. Defina o processo de isencao para requisitos entre industrias. Alguns engajamentos abrangem multiplos frameworks regulatorios (ex.: um cliente de saude que tambem processa pagamentos). Projete como requisitos de conformidade sobrepostos sao tratados.
12. Projete a estrutura de relatorios de conformidade. Cada contrato de cliente requer atestacao mensal de conformidade. Defina como relatorios de conformidade por engajamento sao gerados mostrando aderencia ao framework regulatorio especifico aplicavel aquele engajamento.

### Parte 4: Governanca de Identidade para Rotacao de Consultores

13. Projete access packages para acesso no nivel de engajamento (referencie o Challenge 12). Crie templates de access packages para: "Engagement Contributor" (implantar recursos dentro da subscription do engajamento), "Engagement Reader" (acesso somente leitura para stakeholders do cliente), e "Engagement Admin" (controle total para o lider do engajamento). Cada pacote deve ter escopo para um engajamento especifico.
14. Projete o workflow de rotacao de consultores. Quando um consultor e atribuido a um novo engajamento (pelo gerente de recursos na ferramenta de gerenciamento de projetos), ele deve receber automaticamente o access package apropriado. Quando removido de um engajamento, o acesso deve ser revogado em 24 horas.
15. Projete a integracao do ciclo de vida do engajamento com access reviews. Configure access reviews trimestrais para cada engajamento onde o gerente de engajamento atesta que todos os membros da equipe ainda precisam de acesso. Defina o que acontece quando um engajamento termina oficialmente (todos os access packages expiram, contas de convidado para stakeholders do cliente sao desabilitadas).
16. Projete o modelo de acesso privilegiado para ambientes de engajamento. Determine como o acesso de emergencia "break glass" funciona dentro do ambiente isolado de um cliente, quem tem acesso privilegiado permanente (se alguem), e como a elegibilidade PIM tem escopo por engajamento.

### Parte 5: Integracao Operacional

17. Projete uma automacao de "onboarding de novo engajamento" que orquestra toda a configuracao: provisionamento de subscription, posicionamento em management group, verificacao de heranca de politicas, aplicacao de tags, criacao de access packages e peering de rede hub. Defina as entradas (nome do cliente, industria, roster da equipe de engajamento, duracao) e as saidas esperadas.
18. Projete monitoramento e alertas para desvio de governanca em todos os 30-40 engajamentos simultaneos. Defina como a equipe central de governanca detecta e responde a: uma subscription com violacoes de conformidade, um engajamento com acesso orfao (consultores nao mais atribuidos mas ainda com acesso), ou uma subscription se aproximando de limites de custo.
19. Projete o processo de offboarding do engajamento: retencao de dados conforme obrigacoes contratuais, exclusao de recursos apos periodo de retencao, limpeza de subscription, revogacao de acesso para todos os membros da equipe e contas de convidado, e movimentacao da subscription para o management group "Decommissioned".

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-13"
  items={[
    "Designed an integrated management group hierarchy supporting industry-specific compliance inheritance",
    "Created subscription strategy ensuring complete client data isolation with engagement-level cost tracking",
    "Defined industry-specific policy initiatives that auto-apply based on MG placement",
    "Designed tag taxonomy and enforcement enabling per-engagement client billing",
    "Implemented identity governance with access packages tied to engagement lifecycle",
    "Specified end-to-end automation for engagement onboarding and offboarding"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Design de Management Groups para Multi-Industria</summary>

Considere esta hierarquia: Root > Contoso (root customizado) > Platform (Connectivity, Identity, Management) + Landing Zones (Healthcare, Financial, Retail) + Sandbox + Decommissioned. Cada MG de industria tem a iniciativa regulatoria correspondente atribuida. Quando um novo engajamento comeca, posicione a subscription sob o MG de industria correto e ela automaticamente herda as politicas de conformidade. Para engajamentos que abrangem multiplas industrias, posicione a subscription sob o MG mais rigoroso e adicione a iniciativa adicional como uma atribuicao direta.

</details>

<details>
<summary>Dica 2: Padrao de Subscription por Engajamento</summary>

Para uma firma de consultoria com requisitos rigorosos de isolamento de clientes, uma subscription por engajamento e o limite de isolamento mais forte. Isso fornece: rastreamento limpo de custos (subscription = unidade de faturamento = engajamento), isolamento de RBAC (equipe de engajamento e Contributor apenas em sua subscription), isolamento de politica (pode aplicar politicas especificas do engajamento), e descomissionamento limpo (deletar a subscription apos retencao). A desvantagem e a proliferacao de subscriptions (mais de 60 subscriptions), mas automacao de subscription vending torna isso gerenciavel. Use resource groups dentro da subscription para organizacao de workloads (ex.: rg-networking, rg-application, rg-data).

</details>

<details>
<summary>Dica 3: Access Packages Dinamicos por Engajamento</summary>

Crie um "catalogo" por vertical de industria no Entitlement Management. Quando um novo engajamento e integrado, a automacao cria: (1) Um security group para o engajamento (ex.: "sg-engagement-ACME-2025"), (2) Atribuicoes de Azure RBAC para esse grupo na subscription do engajamento, (3) Um access package no catalogo apropriado que concede associacao ao grupo do engajamento. Consultores solicitam (ou sao auto-atribuidos via API) o access package. Defina expiracao para a data de termino do engajamento. Quando o engajamento termina, expire o access package e todos os membros perdem acesso simultaneamente.

</details>

<details>
<summary>Dica 4: Heranca de Conformidade via Posicionamento em MG</summary>

O poder do modelo MG + Policy: Atribua a iniciativa HIPAA no management group "Healthcare". Qualquer subscription posicionada sob este MG automaticamente e avaliada contra controles HIPAA sem atribuicao manual de politica. E por isso que o design da hierarquia de MG e critico - ele habilita "conformidade por posicionamento." Para a automacao de onboarding de novo engajamento, a unica entrada necessaria para conformidade e "em qual industria este cliente esta?" - a automacao posiciona a subscription no MG correto e a conformidade e herdada. Teste isso verificando o dashboard de conformidade regulatoria apos o posicionamento.

</details>

<details>
<summary>Dica 5: Sequencia de Offboarding do Engajamento</summary>

A sequencia de offboarding deve ser ordenada: (1) Notifique todos os membros da equipe que o acesso sera revogado em 7 dias, (2) Expire todos os access packages do engajamento, (3) Desabilite contas de convidado para stakeholders do cliente, (4) Crie um relatorio final de conformidade para o engajamento (entregavel contratual), (5) Exporte e arquive quaisquer dados necessarios para armazenamento de longo prazo conforme a clausula de retencao, (6) Delete todos os recursos na subscription (ou execute `az group delete` para cada resource group), (7) Mova a subscription para o management group "Decommissioned" (que nao tem politicas, impedindo criacao de novos recursos), (8) Apos o periodo de retencao contratual, cancele a subscription. Automatize isso como um Logic App multi-estagio ou Durable Function com portoes de aprovacao.

</details>

## Recursos de Aprendizagem

- [Cloud Adoption Framework landing zone architecture](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/)
- [Management group and subscription organization](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/resource-org)
- [Azure Policy governance design](https://learn.microsoft.com/azure/governance/policy/overview)
- [Microsoft Entra entitlement management](https://learn.microsoft.com/entra/id-governance/entitlement-management-overview)
- [Subscription vending automation](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/subscription-vending)
- [Tagging strategy for Azure](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/resource-tagging)
- [Azure landing zone FAQ](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/enterprise-scale/faq)

## Verificacao de Conhecimento

<details>
<summary>1. A Contoso integra um novo engajamento de cliente de saude. A automacao de onboarding cria uma subscription e a posiciona sob o management group "Healthcare". Quais politicas de conformidade sao automaticamente aplicadas sem nenhuma configuracao adicional?</summary>

**Todas as politicas atribuidas no management group Healthcare e todos os management groups pais acima dele.** Heranca de politica significa que a subscription recebe: (1) Politicas de nivel Root (tags obrigatorias, logging de diagnostico), (2) Politicas de nivel Landing Zone (se algum MG intermediario tiver politicas), e (3) Politicas do MG Healthcare (iniciativa HIPAA - criptografia, sem endpoints publicos, logging de auditoria). Este modelo de "conformidade por posicionamento" elimina atribuicao manual de politica por subscription e garante que cada engajamento de saude tenha postura de conformidade identica desde o primeiro dia.

</details>

<details>
<summary>2. Um consultor esta trabalhando em dois engajamentos simultaneamente (um cliente de saude e um financeiro). Ele precisa de acesso de Contributor a ambas as subscriptions de engajamento. Como isso deve ser gerenciado com entitlement management?</summary>

**O consultor solicita (ou recebe atribuicao de) dois access packages separados - um para cada engajamento.** Cada access package concede acesso de Contributor a subscription especifica do engajamento atraves de associacao a grupo. Cada pacote tem sua propria data de expiracao (correspondendo as datas de termino dos respectivos engajamentos), fluxo de aprovacao e cronograma de access review. Isso garante que quando um engajamento termina, apenas aquele acesso especifico e revogado enquanto o outro permanece ativo. Os pacotes podem ser de catalogos diferentes (catalogo de saude e catalogo financeiro) com politicas diferentes apropriadas para cada industria.

</details>

<details>
<summary>3. A Contoso precisa faturar o Cliente A pelo consumo Azure do mes passado. A subscription do engajamento tambem contem recursos de monitoramento compartilhados que servem multiplos engajamentos. Como os custos sao atribuidos com precisao?</summary>

**Use uma combinacao de faturamento no nivel de subscription e alocacao de custos baseada em tags para recursos compartilhados.** Custos primarios de engajamento sao facilmente atribuidos porque cada engajamento tem sua propria subscription (custo da subscription = custo do engajamento). Para recursos compartilhados na subscription de plataforma (monitoramento, networking), use regras de alocacao de custos do Azure Cost Management para distribuir custos proporcionalmente com base em: metricas de consumo por engajamento (dados ingeridos por workspace), percentuais de alocacao fixos definidos no contrato do engajamento, ou alocacao baseada em tags (marque recursos compartilhados com todos os IDs de engajamento que eles servem e divida igualmente). A tag "EngagementID" em todos os recursos garante que quaisquer custos de recursos entre subscriptions sejam atribuiveis.

</details>

<details>
<summary>4. Um engajamento termina e o processo de offboarding comeca. O contrato do cliente requer retencao de dados por 7 anos, mas os recursos da subscription devem ser deletados imediatamente para parar de incorrer em custos. Como voce reconcilia esses requisitos?</summary>

**Exporte os dados necessarios para armazenamento de arquivamento de longo prazo antes de deletar os recursos do engajamento.** O workflow de offboarding deve: (1) Identificar dados sujeitos a retencao (bancos de dados, storage accounts, logs), (2) Exportar dados para uma storage account de arquivamento dedicada na subscription de Plataforma (usando tier Archive para eficiencia de custo), (3) Marcar os dados arquivados com o ID do engajamento e data de expiracao de retencao (para exclusao automatizada apos 7 anos), (4) Deletar todos os recursos na subscription do engajamento para parar custos, (5) Mover a subscription vazia para o management group "Decommissioned", (6) Criar uma automacao que verifica datas de retencao do arquivo e purga dados apos 7 anos. Isso separa a obrigacao de retencao da obrigacao de custo operacional.

</details>

## Limpeza

```bash
# This capstone challenge creates significant infrastructure. Clean up in order:

# 1. Remove access packages and catalogs (via Portal or Graph API)
# az rest --method DELETE --url "https://graph.microsoft.com/v1.0/identityGovernance/entitlementManagement/accessPackages/<package-id>"

# 2. Remove policy assignments from management groups
az policy assignment delete --name "hipaa-initiative" --scope "/providers/Microsoft.Management/managementGroups/mg-contoso-healthcare"
az policy assignment delete --name "pcidss-initiative" --scope "/providers/Microsoft.Management/managementGroups/mg-contoso-financial"
az policy assignment delete --name "retail-privacy" --scope "/providers/Microsoft.Management/managementGroups/mg-contoso-retail"

# 3. Remove test resource groups
az group delete --name rg-engagement-demo --yes --no-wait
az group delete --name rg-contoso-platform --yes --no-wait

# 4. Remove management groups (must remove child subscriptions/MGs first)
az account management-group delete --name "mg-contoso-decommissioned"
az account management-group delete --name "mg-contoso-sandbox"
az account management-group delete --name "mg-contoso-healthcare"
az account management-group delete --name "mg-contoso-financial"
az account management-group delete --name "mg-contoso-retail"
az account management-group delete --name "mg-contoso-platform"
az account management-group delete --name "mg-contoso-root"
```

---

**Proximo**: [Challenge 14: Design a Data Storage Solution](/docs/az-305/data-storage/challenge-14)
