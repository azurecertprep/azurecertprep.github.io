---
sidebar_position: 11
title: "Challenge 11: Design a Compliance Solution"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 11: Design a Compliance Solution

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $1-3 | **Peso no Exame: 25-30%**

:::

## Introducao

A HealthBridge Medical Systems e uma empresa de tecnologia em saude que fornece prontuarios eletronicos (EHR), agendamento de pacientes e plataformas de telemedicina para 150 hospitais e clinicas nos Estados Unidos. Todos os dados de pacientes sao armazenados e processados no Azure, tornando a conformidade com HIPAA um requisito legal. Alem do HIPAA, a HealthBridge tem padroes internos que excedem os minimos regulatorios: todas as storage accounts devem usar chaves de criptografia gerenciadas pelo cliente, nenhuma maquina virtual pode usar um endereco IP publico, apenas SKUs de VM aprovados podem ser implantados (para controlar custos e garantir conformidade de patches), e todos os recursos devem enviar logs de diagnostico para um workspace central de Log Analytics.

No mes passado, um desenvolvedor junior acidentalmente criou uma storage account com acesso anonimo a blobs habilitado em uma subscription de producao. A configuracao incorreta foi descoberta 72 horas depois durante uma verificacao de rotina, resultando em uma notificacao de violacao reportavel. O CISO determinou que a equipe de conformidade implemente guardrails automatizados que impedem a criacao de recursos nao conformes e auto-remedeiem desvios onde possivel. A equipe tambem deve produzir um relatorio mensal de conformidade para o conselho mostrando aderencia aos controles HIPAA e padroes internos.

A equipe de conformidade consiste em apenas duas pessoas e nao pode revisar manualmente cada implantacao. Eles precisam de uma abordagem de policy-as-code que escale com o crescimento da organizacao (planejam dobrar sua presenca no Azure em 18 meses). Algumas equipes de desenvolvimento tem excecoes legitimas - a equipe de telemedicina precisa de enderecos IP publicos para seus servidores de sinalizacao WebRTC, e a equipe de ciencia de dados precisa de SKUs de VM com GPU que nao estao na lista padrao aprovada. A solucao deve acomodar essas excecoes sem comprometer a postura geral de conformidade.

## Habilidades do Exame Cobertas

- Recomendar uma solucao para gerenciamento de conformidade

## Tarefas de Design

### Parte 1: Design do Framework de Politicas

1. Projete a estrutura de iniciativas de Azure Policy para a HealthBridge. Defina iniciativas separadas para: controles regulatorios HIPAA, padroes de seguranca internos e governanca de custos. Determine se deve usar a iniciativa HIPAA HITRUST integrada como esta, personaliza-la ou construir uma iniciativa customizada.
2. Para cada categoria de politica abaixo, especifique o efeito da politica e justificativa:
   - Storage accounts nao devem permitir acesso anonimo a blobs (deny vs. audit vs. modify)
   - Todas as VMs devem usar apenas SKUs aprovados (deny com lista permitida)
   - Todo armazenamento deve usar chaves de criptografia gerenciadas pelo cliente (audit vs. deny)
   - Sem enderecos IP publicos em VMs (deny com mecanismo de excecao)
   - Logs de diagnostico devem ser enviados ao Log Analytics central (deployIfNotExists)
3. Projete a hierarquia de atribuicao de politicas. Determine quais politicas se aplicam em qual nivel de management group ou subscription, considerando que algumas politicas devem ser universais enquanto outras sao especificas de ambiente (ex.: mais rigorosas em producao do que em desenvolvimento).
4. Defina um processo para criar e gerenciar definicoes de politicas customizadas versus usar politicas integradas. Identifique quais requisitos da HealthBridge sao atendidos por politicas integradas e quais requerem definicoes customizadas.

### Parte 2: Gerenciamento de Excecoes

5. Projete um fluxo de trabalho de isencao para equipes com excecoes de conformidade legitimas. Defina: quem pode conceder isencoes, qual documentacao e necessaria, se isencoes sao limitadas no tempo (waiver) ou permanentes (mitigated), e como isencoes sao rastreadas para fins de auditoria.
6. Para o requisito de IP publico da equipe de telemedicina, projete o mecanismo especifico de isencao. Escolha entre: isencoes de Azure Policy no escopo do resource group, um management group separado com politicas diferentes, ou uma politica customizada com condicoes de exclusao.
7. Para os SKUs de VM nao padrao da equipe de ciencia de dados, projete um processo de atualizacao de parametros de politica. Determine como a lista de SKUs aprovados e mantida, quem aprova adicoes e como mudancas sao implantadas sem tempo de inatividade.

### Parte 3: Auto-Remediacao

8. Projete politicas de auto-remediacao usando o efeito `deployIfNotExists`. Defina quais lacunas de conformidade devem ser automaticamente corrigidas (ex.: habilitar log de diagnostico, habilitar criptografia) versus quais devem apenas ser sinalizadas (ex.: deletar um IP publico pode quebrar um servico em execucao).
9. Especifique os requisitos de managed identity para tarefas de remediacao. Defina as atribuicoes de funcao necessarias, o principio de menor privilegio para identidades de remediacao e o escopo de suas permissoes.
10. Projete um mecanismo de deteccao e correcao de desvios. Determine como lidar com recursos que estavam em conformidade na criacao mas desviaram (ex.: alguem desabilitou a criptografia apos a implantacao inicial).

### Parte 4: Relatorios de Conformidade

11. Projete a solucao de dashboard e relatorios de conformidade. Especifique como o relatorio mensal do conselho e gerado, quais metricas inclui (percentual de conformidade por iniciativa, tendencia ao longo do tempo, principais violacoes) e como o dashboard de conformidade regulatoria no Microsoft Defender for Cloud se integra com o Azure Policy.
12. Defina alertas para violacoes criticas de conformidade. Determine quais violacoes disparam alertas imediatos (ex.: acesso anonimo a blobs habilitado) versus quais sao aceitaveis para incluir em relatorios semanais de conformidade.
13. Projete a trilha de auditoria para evidencias de conformidade. Especifique como demonstrar aos auditores HIPAA que controles sao continuamente aplicados (retencao de Activity Log, logs de avaliacao de politicas, historico de isencoes).

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-11"
  items={[
    "Designed policy initiative structure separating regulatory, security, and cost governance concerns",
    "Selected appropriate policy effects for each compliance requirement with justified rationale",
    "Created an exemption workflow with time-bound waivers and audit documentation",
    "Specified auto-remediation policies with appropriate managed identity permissions",
    "Designed compliance reporting that produces board-ready monthly summaries",
    "Addressed drift detection for resources that become non-compliant after creation"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Guia de Selecao de Efeitos de Politica</summary>

Escolha efeitos com base no impacto e urgencia: Use `deny` para violacoes de alto risco que nunca devem ocorrer (acesso anonimo a blobs, SKUs de VM nao aprovados em producao). Use `audit` durante periodos de implantacao ou para requisitos que precisam de revisao humana antes da aplicacao. Use `deployIfNotExists` para configuracoes que podem ser auto-aplicadas com seguranca (configuracoes de diagnostico, politicas de backup). Use `modify` para aplicacao de tags ou adicao de configuracoes ausentes que nao interrompem workloads em execucao. Sempre comece com `audit` e evolua para `deny` apos as equipes terem tido tempo para remediar a nao conformidade existente.

</details>

<details>
<summary>Dica 2: Iniciativas Integradas vs. Customizadas</summary>

O Azure inclui uma iniciativa integrada de conformidade regulatoria "HIPAA HITRUST" com mais de 100 definicoes de politicas. No entanto, esta iniciativa pode ser muito ampla (politicas que voce nao precisa) ou muito restrita (faltando seus padroes internos). A abordagem recomendada: (1) Atribua a iniciativa HIPAA integrada para visibilidade no dashboard de conformidade regulatoria, (2) Crie uma iniciativa customizada para padroes internos que referencia uma mistura de definicoes de politicas integradas (onde existem) e definicoes customizadas (para requisitos unicos). Isso oferece cobertura regulatoria mais aplicacao interna em uma unica visao.

</details>

<details>
<summary>Dica 3: Isencoes de Politica</summary>

Isencoes de Azure Policy podem ser: `Waiver` (nao conformidade reconhecida com data de expiracao - recurso permanece nao conforme mas nao conta contra o percentual de conformidade) ou `Mitigated` (controle compensatorio existe - recurso e excluido da avaliacao). Isencoes possuem escopo (nivel de recurso, resource group ou subscription) e suportam uma data `expiresOn`. Melhor pratica: exigir que todos os waivers tenham uma data de expiracao e um ticket/justificativa vinculado. Use o Azure Resource Graph para consultar todas as isencoes ativas para relatorios de auditoria.

</details>

<details>
<summary>Dica 4: Tarefas de Remediacao e Managed Identity</summary>

Politicas `deployIfNotExists` e `modify` requerem uma managed identity para executar remediacao. Quando voce cria uma atribuicao de politica com esses efeitos, o Azure automaticamente cria uma system-assigned managed identity e concede as funcoes especificadas nos `roleDefinitionIds` da definicao de politica. Para politicas customizadas, defina cuidadosamente as funcoes minimas necessarias. Tarefas de remediacao podem ser disparadas manualmente (para recursos existentes) ou automaticamente (para novos recursos nao conformes). A remediacao automatica aplica-se apenas a recursos recem-avaliados; recursos existentes requerem a criacao de uma tarefa de remediacao manual.

</details>

<details>
<summary>Dica 5: Arquitetura de Relatorios de Conformidade</summary>

Combine tres fontes de dados para relatorios abrangentes: (1) Estados de conformidade do Azure Policy (disponiveis via consulta Azure Resource Graph: `policyResources | where type == "microsoft.policyinsights/policystates"`), (2) Dashboard de conformidade regulatoria do Microsoft Defender for Cloud (mapeia politicas para IDs de controle regulatorio), (3) Entradas do Activity Log para mudancas de isencao e modificacoes de atribuicao de politicas. Exporte dados de conformidade de Policy para um workspace de Log Analytics para tendencias historicas. Use Azure Workbooks ou Power BI para o relatorio mensal do conselho.

</details>

## Recursos de Aprendizagem

- [Azure Policy overview](https://learn.microsoft.com/azure/governance/policy/overview)
- [Azure Policy effects](https://learn.microsoft.com/azure/governance/policy/concepts/effect-basics)
- [Azure Policy initiatives (initiative definitions)](https://learn.microsoft.com/azure/governance/policy/concepts/initiative-definition-structure)
- [Remediate non-compliant resources](https://learn.microsoft.com/azure/governance/policy/how-to/remediate-resources)
- [Azure Policy exemptions](https://learn.microsoft.com/azure/governance/policy/concepts/exemption-structure)
- [Regulatory compliance in Microsoft Defender for Cloud](https://learn.microsoft.com/azure/defender-for-cloud/regulatory-compliance-dashboard)
- [Tutorial: Create a custom policy definition](https://learn.microsoft.com/azure/governance/policy/tutorials/create-custom-policy-definition)

## Verificacao de Conhecimento

<details>
<summary>1. A HealthBridge implanta uma politica com efeito `deny` que impede storage accounts sem chaves gerenciadas pelo cliente. Uma storage account existente que foi criada antes da politica nao possui CMK. Este recurso sera bloqueado de atualizacoes?</summary>

**Sim, se a atualizacao disparar avaliacao de politica nas propriedades cobertas pela regra de politica.** O efeito `deny` avalia em operacoes de criacao E atualizacao de recursos. Se a storage account existente for atualizada (ex.: alterando uma regra de rede), e a regra de politica avaliar a configuracao de criptografia, a atualizacao sera negada ate que CMK seja configurado. No entanto, o recurso continua executando como esta sem modificacao. Este comportamento incentiva equipes a remediar nao conformidade existente antes de fazer outras alteracoes. Para evitar este comportamento de bloqueio em atualizacoes, algumas equipes comecam com `audit` e migram para `deny` apos a remediacao.

</details>

<details>
<summary>2. A equipe de conformidade precisa que logs de diagnostico sejam automaticamente habilitados em todos os novos bancos de dados Azure SQL. Nenhum banco de dados deve ser criado sem logging. Qual efeito de politica e mais apropriado?</summary>

**`deployIfNotExists`.** Este efeito avalia se um recurso relacionado (a configuracao de diagnostico) existe apos o banco de dados Azure SQL ser criado. Se a configuracao de diagnostico nao existir, ele implanta automaticamente um template ARM que a cria. Isso nao bloqueia a criacao do banco de dados (diferente de `deny`) mas garante que o logging seja configurado imediatamente apos a criacao. A atribuicao de politica precisa de uma managed identity com permissoes para criar configuracoes de diagnostico nos recursos alvo.

</details>

<details>
<summary>3. A equipe de telemedicina tem uma necessidade permanente de IPs publicos em seus servidores WebRTC. A equipe de conformidade quer essa excecao documentada mas nao quer que ela impacte negativamente o percentual de conformidade da organizacao. Qual tipo de isencao devem usar?</summary>

**Isencao Mitigated.** Uma isencao `Mitigated` indica que um controle compensatorio existe (neste caso, os IPs publicos sao protegidos por NSGs, protecao DDoS e WAF). Isencoes mitigated excluem o recurso da avaliacao de politica inteiramente, entao nao aparece como nao conforme. Uma isencao `Waiver` ainda mostraria o recurso como nao conforme mas nao o contaria no percentual de conformidade. Como isso e permanente (nao uma excecao temporaria), `Mitigated` e apropriado com documentacao dos controles compensatorios.

</details>

<details>
<summary>4. A HealthBridge atribui uma iniciativa de politica com 50 politicas no nivel de subscription. Um novo desenvolvedor reclama que a criacao de recursos leva mais de 30 segundos a mais do que antes. O que esta acontecendo e como pode ser resolvido?</summary>

**A avaliacao de politica adiciona latencia a requisicoes de criacao de recursos.** Cada politica com efeito `deny` e `append/modify` deve ser avaliada antes que a requisicao chegue ao resource provider. Com 50 politicas, essa cadeia de avaliacao adiciona latencia perceptivel. Para resolver: (1) Garanta que politicas usem condicoes eficientes (evite logica aninhada complexa), (2) Desabilite politicas que nao sao ativamente necessarias (use o efeito `disabled` ao inves de deletar), (3) Use seletores de recurso para limitar a avaliacao de politica a tipos de recurso especificos ao inves de avaliar todas as 50 politicas contra cada tipo de recurso. Nota: `auditIfNotExists` e `deployIfNotExists` avaliam APOS a criacao do recurso e nao adicionam latencia de criacao.

</details>

## Limpeza

```bash
# Remove policy assignments
az policy assignment delete --name "hipaa-initiative" --scope "/subscriptions/<subscription-id>"
az policy assignment delete --name "internal-standards" --scope "/subscriptions/<subscription-id>"

# Remove custom policy definitions (must remove assignments first)
az policy set-definition delete --name "healthbridge-internal-standards"
az policy definition delete --name "deny-anonymous-blob-access-custom"

# Remove exemptions
az policy exemption delete --name "telehealth-public-ip" --scope "/subscriptions/<subscription-id>/resourceGroups/rg-telehealth"

# Remove test resources
az group delete --name rg-compliance-test --yes --no-wait
```

---

**Proximo**: [Challenge 12: Design Identity Governance](/docs/az-305/identity-governance-monitoring/challenge-12)
