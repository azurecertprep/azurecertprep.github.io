---
sidebar_position: 12
title: "Challenge 12: Design Identity Governance"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 12: Design Identity Governance

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $0-2 | **Peso no Exame: 25-30%**

:::

## Introducao

A Velocity Dynamics e uma firma global de engenharia com 4.000 funcionarios, 800 contratados e uma taxa anual de rotatividade de 25%. Uma auditoria de seguranca recente revelou descobertas alarmantes: 40% dos usuarios tinham acesso a recursos e aplicacoes do Azure que nao precisavam mais para sua funcao atual, 15% das contas de contratados externos permaneciam ativas meses apos o termino de seus contratos, e tres ex-funcionarios ainda tinham acesso de Contributor a subscriptions de producao semanas apos a saida. A auditoria tambem descobriu que 12 contas de servico tinham privilegios permanentes de Global Administrator sem justificativa ou processo de revisao.

O CISO recebeu um mandato do conselho para implementar principios de zero-standing-access e gerenciamento automatizado de ciclo de vida de identidades em 6 meses. Os requisitos incluem: todo acesso privilegiado deve ser just-in-time (ativado apenas quando necessario com limites de tempo), acesso a recursos sensiveis deve ser revisado trimestralmente com revogacao automatica para revisores nao responsivos, novos funcionarios devem receber automaticamente acesso basico com base em seu departamento e funcao, e contratados devem ter acesso que expira automaticamente quando seu engajamento termina. A empresa usa licencas Microsoft Entra ID P2.

O desafio e equilibrar rigor de seguranca com eficiencia operacional. Engenheiros frequentemente precisam de acesso elevado para troubleshooting (mas nao permanentemente). Equipes de projeto se formam e dissolvem a cada 3-6 meses, exigindo concessoes dinamicas de acesso. O sistema de RH (Workday) e a fonte autoritativa para eventos de ciclo de vida de funcionarios (contratacao, transferencia, desligamento), mas o onboarding de contratados e gerenciado por gerentes de projeto individuais sem sistema centralizado.

## Habilidades do Exame Cobertas

- Recomendar uma solucao para governanca de identidade

## Tarefas de Design

### Parte 1: Privileged Identity Management (PIM)

1. Projete a configuracao de PIM para funcoes de recursos do Azure. Defina quais funcoes devem ser elegiveis (ativadas sob demanda) versus permanentemente atribuidas. Para cada funcao privilegiada (Global Administrator, Subscription Owner, Subscription Contributor, Key Vault Administrator), especifique: duracao maxima de ativacao, requisitos de aprovacao e aplicacao de MFA.
2. Projete o PIM para funcoes de diretorio do Entra ID. Determine quais funcoes de diretorio (Global Admin, User Administrator, Security Administrator, Privileged Role Administrator) precisam de politicas de ativacao, e defina o fluxo de trabalho de aprovacao (quem aprova, caminho de escalonamento, condicoes de auto-aprovacao).
3. Especifique a configuracao de alertas e notificacoes para PIM. Defina quem recebe notificacoes quando: uma funcao e ativada, uma ativacao de funcao esta pendente de aprovacao, uma atribuicao permanente e feita fora do PIM, ou uma atribuicao elegivel esta prestes a expirar.
4. Projete a estrategia para as 12 contas de servico com acesso permanente de Global Administrator. Determine como transiciona-las para acesso de menor privilegio (o que pode exigir dividi-las em multiplos service principals com atribuicoes de funcao especificas).

### Parte 2: Access Reviews

5. Projete o programa de access reviews para a Velocity Dynamics. Defina escopos de revisao: quais grupos, funcoes, atribuicoes de aplicacao e atribuicoes de funcao de recursos do Azure precisam de revisao periodica. Especifique a frequencia de revisao (trimestral, semestral) com base no nivel de risco.
6. Defina a estrategia de atribuicao de revisores. Para cada tipo de revisao, determine quem revisa: gerente revisa acesso de subordinados diretos, proprietarios de grupo revisam membros, proprietarios de recurso revisam acesso a seus recursos, ou auto-atestacao. Aborde cenarios onde o revisor designado nao responde.
7. Configure as opcoes de auto-aplicacao para access reviews. Determine quando o acesso deve ser automaticamente revogado (revisor nao responde em 14 dias, revisor explicitamente nega, recomendacoes indicam acesso nao utilizado) versus quando intervencao humana e necessaria.
8. Projete access reviews especificamente para usuarios externos/convidados. Defina a cadencia de revisao, criterios para remocao automatica (sem login por 90 dias), e o fluxo de notificacao antes da revogacao de acesso.

### Parte 3: Entitlement Management

9. Projete access packages para padroes comuns de acesso baseado em funcao. Crie access packages para: "Engineering Team Member" (recursos basicos do Azure + ferramentas de desenvolvimento), "Production Support" (acesso de leitura a producao + escrita limitada para resposta a incidentes) e "Data Analyst" (acesso ao data lake + ferramentas de BI). Defina quais recursos cada pacote concede e o fluxo de aprovacao.
10. Projete a estrutura de catalogo de access packages. Determine se deve usar um unico catalogo ou multiplos catalogos (por departamento, por projeto, por nivel de sensibilidade). Defina proprietarios de catalogo e suas responsabilidades.
11. Configure politicas de access packages para diferentes tipos de solicitantes: funcionarios internos (auto-aprovado para pacotes basicos), contratados (aprovacao do gerente necessaria) e solicitacoes entre departamentos (aprovacao do proprietario do recurso). Defina politicas de expiracao para cada tipo.
12. Projete organizacoes conectadas para acesso de contratados. Determine como organizacoes parceiras externas sao integradas, como seus usuarios solicitam access packages e como o acesso e automaticamente removido quando o acordo de parceria termina.

### Parte 4: Lifecycle Workflows

13. Projete lifecycle workflows disparados por eventos de RH do Workday. Defina workflows para: joiner (novo contratado recebe acesso basico + acesso especifico do departamento na data de inicio), mover (funcionario muda de departamento, acesso antigo revogado, novo acesso concedido), e leaver (todo acesso revogado no ultimo dia, conta desabilitada, licencas recuperadas apos 30 dias).
14. Aborde a lacuna de ciclo de vida de contratados (sem sistema de RH centralizado). Projete um processo para onboarding de contratados que garanta: responsabilidade do sponsor, acesso limitado no tempo e desabilitacao automatica se a data de termino do contrato passar sem renovacao.
15. Defina workflows de acesso temporario para trabalho baseado em projetos. Projete como um engenheiro obtem acesso limitado no tempo aos recursos de um projeto especifico, e como esse acesso expira automaticamente quando o marco do projeto e concluido.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-12"
  items={[
    "Designed PIM configuration eliminating permanent privileged access with appropriate activation policies",
    "Created access review program covering groups, roles, and guest users with auto-apply settings",
    "Designed entitlement management access packages for common role-based access patterns",
    "Specified lifecycle workflows for joiner/mover/leaver scenarios integrated with HR system",
    "Addressed contractor lifecycle management with time-bound access and sponsor accountability",
    "Defined alerting and escalation procedures for governance events"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Configuracoes de Ativacao do PIM</summary>

Configuracoes chave do PIM por funcao: Duracao maxima de ativacao (padrao 8 horas, reduza para 1-4 horas para Global Admin), exigir MFA na ativacao, exigir texto de justificativa, exigir numero de ticket (para trilha de auditoria), exigir aprovacao (para as funcoes mais sensiveis como Global Admin e Privileged Role Administrator). Para Subscription Owner em producao, exigir aprovacao da equipe de seguranca. Para Subscription Contributor em desenvolvimento, permitir auto-ativacao com MFA e justificativa (sem aprovacao necessaria, reduz atrito). Atribuicoes elegiveis devem expirar apos 6-12 meses e exigir re-atribuicao.

</details>

<details>
<summary>Dica 2: Melhores Praticas de Access Review</summary>

Configure revisoes com: auto-aplicacao de resultados habilitada (remove acesso quando negado ou nao respondido), "Se revisores nao responderem" configurado para "Remover acesso" (previne aprovacao por inacao), enviar lembretes comecando 3 dias antes da data limite, e usar recurso de "Recomendacoes" (mostra se o usuario fez login no recurso nos ultimos 30 dias). Para revisoes de alto risco (atribuicoes elegiveis de Global Admin), defina frequencia trimestral. Para membros de grupo padrao, semestral e tipicamente suficiente. Revisoes multi-estagio permitem revisao do gerente seguida de revisao do proprietario do recurso para recursos sensiveis.

</details>

<details>
<summary>Dica 3: Estrutura de Entitlement Management</summary>

Access packages agrupam acesso a recursos relacionados: grupos (para RBAC), atribuicoes de funcao de aplicacao e sites SharePoint em uma unica unidade solicitavel. Use catalogos para organizar pacotes por dominio (ex.: "Engineering Catalog" de propriedade do VP de Engenharia). Cada access package pode ter multiplas politicas (diferentes fluxos de aprovacao para diferentes tipos de solicitantes). Defina expiracao para corresponder a duracao esperada de necessidade: 365 dias para pacotes baseados em funcao de funcionarios (com access review antes da expiracao), 90-180 dias para pacotes de contratados, 30 dias para acesso temporario de projeto.

</details>

<details>
<summary>Dica 4: Integracao de Lifecycle Workflow</summary>

Microsoft Entra lifecycle workflows suportam gatilhos baseados em mudancas de atributos de usuario sincronizados do RH (via provisionamento do Entra ID a partir do Workday/SAP SuccessFactors). Gatilhos chave: `employeeHireDate` menos N dias (tarefas pre-contratacao como criacao de conta), `employeeHireDate` (tarefas de joiner como associacao a grupo, atribuicao de licenca), mudanca de atributo em `department` (tarefas de mover), e `employeeLeaveDateTime` (tarefas de leaver como desabilitar conta, remover grupos). Extensoes de tarefa customizadas podem chamar Logic Apps para workflows complexos (ex.: notificar TI para enviar laptop, disparar atribuicao de access package).

</details>

<details>
<summary>Dica 5: Ciclo de Vida de Contratados sem Sistema de RH</summary>

Para contratados sem sinal de sistema de RH: (1) Exija um "sponsor" (funcionario interno responsavel pelo acesso do contratado), (2) Defina o atributo `accountExpires` da conta de convidado para a data de termino do contrato, (3) Use politicas de expiracao de access packages (acesso expira automaticamente apos 90/180 dias, contratado deve re-solicitar), (4) Configure access reviews onde o sponsor deve atestar trimestralmente que o contratado ainda precisa de acesso, (5) Use uma politica de acesso condicional com risco de login que bloqueia acesso de locais inesperados. Considere criar um lifecycle workflow de "Offboarding de Contratados" disparado pela data de expiracao da conta.

</details>

## Recursos de Aprendizagem

- [What is Microsoft Entra ID Governance?](https://learn.microsoft.com/entra/id-governance/identity-governance-overview)
- [Plan a Microsoft Entra access reviews deployment](https://learn.microsoft.com/entra/id-governance/deploy-access-reviews)
- [What is Microsoft Entra Privileged Identity Management?](https://learn.microsoft.com/entra/id-governance/privileged-identity-management/pim-configure)
- [What is entitlement management?](https://learn.microsoft.com/entra/id-governance/entitlement-management-overview)
- [What are lifecycle workflows?](https://learn.microsoft.com/entra/id-governance/what-are-lifecycle-workflows)
- [Plan a lifecycle workflow deployment](https://learn.microsoft.com/entra/id-governance/lifecycle-workflows-deployment)

## Verificacao de Conhecimento

<details>
<summary>1. Um incidente em producao requer que um engenheiro ative a funcao de Subscription Owner as 2 da manha. O fluxo de aprovacao padrao requer que o lider da equipe de seguranca aprove, mas ele nao esta disponivel. Como o PIM deve ser configurado para lidar com este cenario?</summary>

**Configure um caminho de escalonamento no fluxo de trabalho de aprovacao.** O PIM suporta aprovacao multinivel com escalonamento. Configure o aprovador primario como o lider da equipe de seguranca, com um aprovador de escalonamento (ex.: um grupo da equipe de seguranca ou o CISO) que e notificado se a solicitacao nao for aprovada em 30-60 minutos. Alternativamente, para cenarios de emergencia, configure uma conta "break glass" com acesso permanente de Owner (armazenada com seguranca, uso monitorado, acesso revisado mensalmente). Algumas organizacoes tambem criam uma funcao PIM separada de "Emergency Access" com um timeout de aprovacao mais curto e alertas.

</details>

<details>
<summary>2. Uma access review para o grupo "Production Contributors" mostra que um revisor nao respondeu apos 14 dias. A revisao esta configurada com auto-aplicacao e "Se revisores nao responderem: Remover acesso." O que acontece em seguida?</summary>

**O acesso e automaticamente revogado.** Quando o periodo de revisao termina e um revisor nao respondeu, a acao de "sem resposta" entra em efeito. Com "Remover acesso" configurado, o usuario e automaticamente removido do grupo. Esta e a configuracao recomendada para prevenir "aprovacao automatica" (onde revisores ignoram revisoes e todos mantem acesso). O usuario afetado recebe uma notificacao de que seu acesso foi removido. Ele pode re-solicitar acesso atraves do entitlement management se ainda necessario. Para prevenir remocoes surpresa, configure emails de lembrete 3 e 7 dias antes do prazo da revisao.

</details>

<details>
<summary>3. A Velocity Dynamics precisa que um novo contratado tenha acesso a tres resource groups do Azure, duas aplicacoes SaaS e um site SharePoint no primeiro dia. O gerente do contratado deve aprovar. Qual recurso do Entra ID Governance agrupa todo esse acesso em uma unica solicitacao?</summary>

**Access packages do entitlement management.** Crie um access package que inclua: os security groups que concedem acesso aos tres resource groups (via atribuicoes de grupo Azure RBAC), atribuicoes de funcao de aplicacao para os dois apps SaaS, e o site SharePoint. Configure a politica do access package para exigir aprovacao do gerente e defina uma expiracao correspondente a duracao do contrato. O contratado (ou seu gerente) submete uma unica solicitacao para o pacote, e apos aprovacao, todo o acesso e provisionado automaticamente. Quando o pacote expira, todo o acesso agrupado e revogado simultaneamente.

</details>

<details>
<summary>4. Um funcionario transfere do departamento de Engenharia para o departamento de Vendas. Seu registro no Workday e atualizado. Quais acoes de lifecycle workflow devem ser disparadas para garantir acesso apropriado?</summary>

**Um lifecycle workflow de "mover" deve ser disparado na mudanca de atributo de departamento.** O workflow deve: (1) Remover o funcionario de grupos especificos de Engenharia (revogando acesso a recursos do Azure, atribuicoes de aplicacao), (2) Adicionar o funcionario a grupos especificos de Vendas, (3) Revogar quaisquer access packages de Engenharia (ou deixa-los expirar), (4) Opcionalmente disparar uma access review de qualquer acesso remanescente que o usuario possui para garantir que nada inapropriado seja transferido. O gatilho em lifecycle workflows e a mudanca de atributo (departamento de "Engineering" para "Sales") sincronizada do Workday via provisionamento do Entra ID. Um periodo de graca (ex.: 7 dias) antes de remover o acesso antigo pode ser configurado para lidar com periodos de transicao.

</details>

## Limpeza

```bash
# Remove PIM role settings (done via Portal or PowerShell/Graph)
# Remove access reviews
# Remove access packages and catalogs
# These are Entra ID configurations - use the Portal or Microsoft Graph:

# Example: Remove test groups created for this challenge
az ad group delete --group "sg-production-contributors"
az ad group delete --group "sg-engineering-team"
az ad group delete --group "sg-data-analysts"

# Remove any test guest users
az ad user delete --id "contractor@externaldomain.com"
```

---

**Proximo**: [Challenge 13: Design Governance for a Multi-Team Organization](/docs/az-305/identity-governance-monitoring/challenge-13)
