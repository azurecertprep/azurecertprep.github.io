---
sidebar_position: 12
title: "Desafio 12: Projetar Governança de Identidade"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 12: Projetar Governança de Identidade

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $0-2 | **Peso no Exame: 25-30%**

:::

## Introdução

A Velocity Dynamics é uma firma global de engenharia com 4.000 funcionários, 800 contratados é uma taxa anual de rotatividade de 25%. Uma auditoria de segurança recente revelou descobertas alarmantes: 40% dos usuários tinham acesso a recursos e aplicações do Azure que não precisavam mais para sua função atual, 15% das contas de contratados externos permaneciam ativas meses apos o termino de seus contratos, e três ex-funcionários ainda tinham acesso de Contributor a subscriptions de produção semanas apos a saida. A auditoria também descobriu que 12 contas de serviço tinham privilegios permanentes de Global Administrator sem justificativa ou processo de revisao.

O CISO recebeu um mandato do conselho para implementar principios de zero-standing-access e gerenciamento automatizado de ciclo de vida de identidades em 6 meses. Os requisitos incluem: todo acesso privilegiado deve ser just-in-time (ativado apenas quando necessário com limites de tempo), acesso a recursos sensíveis deve ser revisado trimestralmente com revogacao automática para revisores não responsivos, novos funcionários devem receber automaticamente acesso básico com base em seu departamento e função, e contratados devem ter acesso que expira automaticamente quando seu engajamento termina. A empresa usa licencas Microsoft Entra ID P2.

O desafio é equilibrar rigor de segurança com eficiência operacional. Engenheiros frequentemente precisam de acesso elevado para troubleshooting (mas não permanentemente). Equipes de projeto se formam e dissolvem a cada 3-6 meses, exigindo concessoes dinamicas de acesso. O sistema de RH (Workday) e a fonte autoritativa para eventos de ciclo de vida de funcionários (contratacao, transferencia, desligamento), mas o onboarding de contratados é gerenciado por gerentes de projeto individuais sem sistema centralizado.

## Habilidades do Exame Cobertas

- Recomendar uma solução para governança de identidade

## Tarefas de Design

### Parte 1: Privileged Identity Management (PIM)

1. Projete a configuração de PIM para funções de recursos do Azure. Defina quais funções devem ser elegiveis (ativadas sob demanda) versus permanentemente atribuidas. Para cada função privilegiada (Global Administrator, Subscription Owner, Subscription Contributor, Key Vault Administrator), especifique: duracao máxima de ativacao, requisitos de aprovacao e aplicação de MFA.
2. Projete o PIM para funções de diretório do Entra ID. Determine quais funções de diretório (Global Admin, User Administrator, Security Administrator, Privileged Role Administrator) precisam de políticas de ativacao, e defina o fluxo de trabalho de aprovacao (quem aprova, caminho de escalonamento, condições de auto-aprovacao).
3. Especifique a configuração de alertas e notificações para PIM. Defina quem recebe notificações quando: uma função e ativada, uma ativacao de função esta pendente de aprovacao, uma atribuicao permanente e feita fora do PIM, ou uma atribuicao elegivel esta prestes a expirar.
4. Projete a estratégia para as 12 contas de serviço com acesso permanente de Global Administrator. Determine como transiciona-las para acesso de menor privilegio (o que pode exigir dividi-las em múltiplos service principals com atribuicoes de função específicas).

### Parte 2: Access Reviews

5. Projete o programa de access reviews para a Velocity Dynamics. Defina escopos de revisao: quais grupos, funções, atribuicoes de aplicação e atribuicoes de função de recursos do Azure precisam de revisao periódica. Especifique a frequência de revisao (trimestral, semestral) com base no nível de risco.
6. Defina a estratégia de atribuicao de revisores. Para cada tipo de revisao, determine quem revisa: gerente revisa acesso de subordinados diretos, proprietarios de grupo revisam membros, proprietarios de recurso revisam acesso a seus recursos, ou auto-atestacao. Aborde cenários onde o revisor designado não responde.
7. Configure as opcoes de auto-aplicação para access reviews. Determine quando o acesso deve ser automaticamente revogado (revisor não responde em 14 dias, revisor explicitamente nega, recomendacoes indicam acesso não utilizado) versus quando intervencao humana é necessária.
8. Projete access reviews especificamente para usuários externos/convidados. Defina a cadencia de revisao, criterios para remocao automática (sem login por 90 dias), e o fluxo de notificação antes da revogacao de acesso.

### Parte 3: Entitlement Management

9. Projete access packages para padrões comuns de acesso baseado em função. Crie access packages para: "Engineering Team Member" (recursos básicos do Azure + ferramentas de desenvolvimento), "Production Support" (acesso de leitura a produção + escrita limitada para resposta a incidentes) e "Data Analyst" (acesso ao data lake + ferramentas de BI). Defina quais recursos cada pacote concede e o fluxo de aprovacao.
10. Projete a estrutura de catálogo de access packages. Determine se deve usar um único catálogo ou múltiplos catálogos (por departamento, por projeto, por nível de sensibilidade). Defina proprietarios de catálogo e suas responsabilidades.
11. Configure políticas de access packages para diferentes tipos de solicitantes: funcionários internos (auto-aprovado para pacotes básicos), contratados (aprovacao do gerente necessária) e solicitacoes entre departamentos (aprovacao do proprietario do recurso). Defina políticas de expiracao para cada tipo.
12. Projete organizações conectadas para acesso de contratados. Determine como organizações parceiras externas sao integradas, como seus usuários solicitam access packages e como o acesso e automaticamente removido quando o acordo de parceria termina.

### Parte 4: Lifecycle Workflows

13. Projete lifecycle workflows disparados por eventos de RH do Workday. Defina workflows para: joiner (novo contratado recebe acesso básico + acesso específico do departamento na data de início), mover (funcionario muda de departamento, acesso antigo revogado, novo acesso concedido), e leaver (todo acesso revogado no último dia, conta desabilitada, licencas recuperadas apos 30 dias).
14. Aborde a lacuna de ciclo de vida de contratados (sem sistema de RH centralizado). Projete um processo para onboarding de contratados que garanta: responsabilidade do sponsor, acesso limitado no tempo e desabilitacao automática se a data de termino do contrato passar sem renovacao.
15. Defina workflows de acesso temporário para trabalho baseado em projetos. Projete como um engenheiro obtem acesso limitado no tempo aos recursos de um projeto específico, e como esse acesso expira automaticamente quando o marco do projeto e concluido.

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
<summary>Dica 1: Configurações de Ativacao do PIM</summary>

Configurações chave do PIM por função: Duracao máxima de ativacao (padrão 8 horas, reduza para 1-4 horas para Global Admin), exigir MFA na ativacao, exigir texto de justificativa, exigir número de ticket (para trilha de auditoria), exigir aprovacao (para as funções mais sensíveis como Global Admin e Privileged Role Administrator). Para Subscription Owner em produção, exigir aprovacao da equipe de segurança. Para Subscription Contributor em desenvolvimento, permitir auto-ativacao com MFA e justificativa (sem aprovacao necessária, reduz atrito). Atribuicoes elegiveis devem expirar apos 6-12 meses e exigir re-atribuicao.

</details>

<details>
<summary>Dica 2: Melhores Práticas de Access Review</summary>

Configure revisoes com: auto-aplicação de resultados habilitada (remove acesso quando negado ou não respondido), "Se revisores não responderem" configurado para "Remover acesso" (previne aprovacao por inacao), enviar lembretes comecando 3 dias antes da data limite, e usar recurso de "Recomendacoes" (mostra se o usuário fez login no recurso nos últimos 30 dias). Para revisoes de alto risco (atribuicoes elegiveis de Global Admin), defina frequência trimestral. Para membros de grupo padrão, semestral e tipicamente suficiente. Revisoes multi-estagio permitem revisao do gerente seguida de revisao do proprietario do recurso para recursos sensíveis.

</details>

<details>
<summary>Dica 3: Estrutura de Entitlement Management</summary>

Access packages agrupam acesso a recursos relacionados: grupos (para RBAC), atribuicoes de função de aplicação e sites SharePoint em uma única unidade solicitavel. Use catálogos para organizar pacotes por dominio (ex.: "Engineering Catalog" de propriedade do VP de Engenharia). Cada access package pode ter múltiplas políticas (diferentes fluxos de aprovacao para diferentes tipos de solicitantes). Defina expiracao para corresponder a duracao esperada de necessidade: 365 dias para pacotes baseados em função de funcionários (com access review antes da expiracao), 90-180 dias para pacotes de contratados, 30 dias para acesso temporário de projeto.

</details>

<details>
<summary>Dica 4: Integração de Lifecycle Workflow</summary>

Microsoft Entra lifecycle workflows suportam gatilhos baseados em mudanças de atributos de usuário sincronizados do RH (via provisionamento do Entra ID a partir do Workday/SAP SuccessFactors). Gatilhos chave: `employeeHireDate` menos N dias (tarefas pré-contratacao como criação de conta), `employeeHireDate` (tarefas de joiner como associacao a grupo, atribuicao de licenca), mudança de atributo em `department` (tarefas de mover), e `employeeLeaveDateTime` (tarefas de leaver como desabilitar conta, remover grupos). Extensoes de tarefa customizadas podem chamar Logic Apps para workflows complexos (ex.: notificar TI para enviar laptop, disparar atribuicao de access package).

</details>

<details>
<summary>Dica 5: Ciclo de Vida de Contratados sem Sistema de RH</summary>

Para contratados sem sinal de sistema de RH: (1) Exija um "sponsor" (funcionario interno responsável pelo acesso do contratado), (2) Defina o atributo `accountExpires` da conta de convidado para a data de termino do contrato, (3) Use políticas de expiracao de access packages (acesso expira automaticamente apos 90/180 dias, contratado deve re-solicitar), (4) Configure access reviews onde o sponsor deve atestar trimestralmente que o contratado ainda precisa de acesso, (5) Use uma política de acesso condicional com risco de login que bloqueia acesso de locais inesperados. Considere criar um lifecycle workflow de "Offboarding de Contratados" disparado pela data de expiracao da conta.

</details>

## Recursos de Aprendizagem

- [What is Microsoft Entra ID Governance?](https://learn.microsoft.com/entra/id-governance/identity-governance-overview)
- [Plan a Microsoft Entra access reviews deployment](https://learn.microsoft.com/entra/id-governance/deploy-access-reviews)
- [What is Microsoft Entra Privileged Identity Management?](https://learn.microsoft.com/entra/id-governance/privileged-identity-management/pim-configure)
- [What is entitlement management?](https://learn.microsoft.com/entra/id-governance/entitlement-management-overview)
- [What are lifecycle workflows?](https://learn.microsoft.com/entra/id-governance/what-are-lifecycle-workflows)
- [Plan a lifecycle workflow deployment](https://learn.microsoft.com/entra/id-governance/lifecycle-workflows-deployment)

## Verificação de Conhecimento

<details>
<summary>1. Um incidente em produção requer que um engenheiro ative a função de Subscription Owner as 2 da manha. O fluxo de aprovacao padrão requer que o lider da equipe de segurança aprove, mas ele não esta disponível. Como o PIM deve ser configurado para lidar com este cenário?</summary>

**Configure um caminho de escalonamento no fluxo de trabalho de aprovacao.** O PIM suporta aprovacao multinivel com escalonamento. Configure o aprovador primário como o lider da equipe de segurança, com um aprovador de escalonamento (ex.: um grupo da equipe de segurança ou o CISO) que é notificado se a solicitacao não for aprovada em 30-60 minutos. Alternativamente, para cenários de emergencia, configure uma conta "break glass" com acesso permanente de Owner (armazenada com segurança, uso monitorado, acesso revisado mensalmente). Algumas organizações também criam uma função PIM separada de "Emergency Access" com um timeout de aprovacao mais curto e alertas.

</details>

<details>
<summary>2. Uma access review para o grupo "Production Contributors" mostra que um revisor não respondeu apos 14 dias. A revisao esta configurada com auto-aplicação e "Se revisores não responderem: Remover acesso." O que acontece em seguida?</summary>

**O acesso e automaticamente revogado.** Quando o período de revisao termina é um revisor não respondeu, a acao de "sem resposta" entra em efeito. Com "Remover acesso" configurado, o usuário e automaticamente removido do grupo. Esta e a configuração recomendada para prevenir "aprovacao automática" (onde revisores ignoram revisoes e todos mantem acesso). O usuário afetado recebe uma notificação de que seu acesso foi removido. Ele pode re-solicitar acesso através do entitlement management se ainda necessário. Para prevenir remocoes surpresa, configure emails de lembrete 3 e 7 dias antes do prazo da revisao.

</details>

<details>
<summary>3. A Velocity Dynamics precisa que um novo contratado tenha acesso a três resource groups do Azure, duas aplicações SaaS é um site SharePoint no primeiro dia. O gerente do contratado deve aprovar. Qual recurso do Entra ID Governance agrupa todo esse acesso em uma única solicitacao?</summary>

**Access packages do entitlement management.** Crie um access package que inclua: os security groups que concedem acesso aos três resource groups (via atribuicoes de grupo Azure RBAC), atribuicoes de função de aplicação para os dois apps SaaS, e o site SharePoint. Configure a política do access package para exigir aprovacao do gerente e defina uma expiracao correspondente a duracao do contrato. O contratado (ou seu gerente) submete uma única solicitacao para o pacote, e apos aprovacao, todo o acesso e provisionado automaticamente. Quando o pacote expira, todo o acesso agrupado e revogado simultaneamente.

</details>

<details>
<summary>4. Um funcionario transfere do departamento de Engenharia para o departamento de Vendas. Seu registro no Workday e atualizado. Quais ações de lifecycle workflow devem ser disparadas para garantir acesso apropriado?</summary>

**Um lifecycle workflow de "mover" deve ser disparado na mudança de atributo de departamento.** O workflow deve: (1) Remover o funcionario de grupos específicos de Engenharia (revogando acesso a recursos do Azure, atribuicoes de aplicação), (2) Adicionar o funcionario a grupos específicos de Vendas, (3) Revogar quaisquer access packages de Engenharia (ou deixa-los expirar), (4) Opcionalmente disparar uma access review de qualquer acesso remanescente que o usuário possui para garantir que nada inapropriado seja transferido. O gatilho em lifecycle workflows e a mudança de atributo (departamento de "Engineering" para "Sales") sincronizada do Workday via provisionamento do Entra ID. Um período de graca (ex.: 7 dias) antes de remover o acesso antigo pode ser configurado para lidar com períodos de transicao.

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

**Próximo**: [Challenge 13: Design Governance for a Multi-Team Organization](/docs/az-305/identity-governance-monitoring/challenge-13)
