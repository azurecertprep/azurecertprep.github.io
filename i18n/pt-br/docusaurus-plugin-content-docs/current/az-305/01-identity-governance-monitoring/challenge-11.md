---
sidebar_position: 11
title: "Desafio 11: Projetar uma Solução de Conformidade"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 11: Projetar uma Solução de Conformidade

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $1-3 | **Peso no Exame: 25-30%**

:::

## Introdução

A HealthBridge Medical Systems é uma empresa de tecnologia em saúde que fornece prontuarios eletronicos (EHR), agendamento de pacientes e plataformas de telemedicina para 150 hospitais e clinicas nos Estados Unidos. Todos os dados de pacientes sao armazenados e processados no Azure, tornando a conformidade com HIPAA um requisito legal. Além do HIPAA, a HealthBridge tem padrões internos que excedem os minimos regulatorios: todas as storage accounts devem usar chaves de criptografia gerenciadas pelo cliente, nenhuma maquina virtual pode usar um endereço IP público, apenas SKUs de VM aprovados podem ser implantados (para controlar custos é garantir conformidade de patches), e todos os recursos devem enviar logs de diagnóstico para um workspace central de Log Analytics.

No mes passado, um desenvolvedor junior acidentalmente criou uma storage account com acesso anonimo a blobs habilitado em uma subscription de produção. A configuração incorreta foi descoberta 72 horas depois durante uma verificação de rotina, resultando em uma notificação de violacao reportavel. O CISO determinou que a equipe de conformidade implemente guardrails automatizados que impedem a criação de recursos não conformes e auto-remedeiem desvios onde possível. A equipe também deve produzir um relatório mensal de conformidade para o conselho mostrando aderencia aos controles HIPAA e padrões internos.

A equipe de conformidade consiste em apenas duas pessoas e não pode revisar manualmente cada implantacao. Eles precisam de uma abordagem de policy-as-code que escale com o crescimento da organização (planejam dobrar sua presença no Azure em 18 meses). Algumas equipes de desenvolvimento tem exceções legitimas - a equipe de telemedicina precisa de endereços IP publicos para seus servidores de sinalizacao WebRTC, e a equipe de ciencia de dados precisa de SKUs de VM com GPU que não estao na lista padrão aprovada. A solução deve acomodar essas exceções sem comprometer a postura geral de conformidade.

## Habilidades do Exame Cobertas

- Recomendar uma solução para gerenciamento de conformidade

## Tarefas de Design

### Parte 1: Design do Framework de Políticas

1. Projete a estrutura de iniciativas de Azure Policy para a HealthBridge. Defina iniciativas separadas para: controles regulatorios HIPAA, padrões de segurança internos e governança de custos. Determine se deve usar a iniciativa HIPAA HITRUST integrada como esta, personaliza-la ou construir uma iniciativa customizada.
2. Para cada categoria de política abaixo, especifique o efeito da política e justificativa:
   - Storage accounts não devem permitir acesso anonimo a blobs (deny vs. audit vs. modify)
   - Todas as VMs devem usar apenas SKUs aprovados (deny com lista permitida)
   - Todo armazenamento deve usar chaves de criptografia gerenciadas pelo cliente (audit vs. deny)
   - Sem endereços IP publicos em VMs (deny com mecanismo de exceção)
   - Logs de diagnóstico devem ser enviados ao Log Analytics central (deployIfNotExists)
3. Projete a hierarquia de atribuicao de políticas. Determine quais políticas se aplicam em qual nível de management group ou subscription, considerando que algumas políticas devem ser universais enquanto outras sao específicas de ambiente (ex.: mais rigorosas em produção do que em desenvolvimento).
4. Defina um processo para criar é gerenciar definicoes de políticas customizadas versus usar políticas integradas. Identifique quais requisitos da HealthBridge sao atendidos por políticas integradas e quais requerem definicoes customizadas.

### Parte 2: Gerenciamento de Excecoes

5. Projete um fluxo de trabalho de isencao para equipes com exceções de conformidade legitimas. Defina: quem pode conceder isencoes, qual documentação é necessária, se isencoes sao limitadas no tempo (waiver) ou permanentes (mitigated), e como isencoes sao rastreadas para fins de auditoria.
6. Para o requisito de IP público da equipe de telemedicina, projete o mecanismo específico de isencao. Escolha entre: isencoes de Azure Policy no escopo do resource group, um management group separado com políticas diferentes, ou uma política customizada com condições de exclusão.
7. Para os SKUs de VM não padrão da equipe de ciencia de dados, projete um processo de atualização de parametros de política. Determine como a lista de SKUs aprovados é mantida, quem aprova adicoes e como mudanças sao implantadas sem tempo de inatividade.

### Parte 3: Auto-Remediacao

8. Projete políticas de auto-remediacao usando o efeito `deployIfNotExists`. Defina quais lacunas de conformidade devem ser automaticamente corrigidas (ex.: habilitar log de diagnóstico, habilitar criptografia) versus quais devem apenas ser sinalizadas (ex.: deletar um IP público pode quebrar um serviço em execução).
9. Especifique os requisitos de managed identity para tarefas de remediacao. Defina as atribuicoes de função necessárias, o principio de menor privilegio para identidades de remediacao e o escopo de suas permissões.
10. Projete um mecanismo de detecção e correcao de desvios. Determine como lidar com recursos que estavam em conformidade na criação mas desviaram (ex.: alguem desabilitou a criptografia apos a implantacao inicial).

### Parte 4: Relatorios de Conformidade

11. Projete a solução de dashboard e relatórios de conformidade. Especifique como o relatório mensal do conselho e gerado, quais metricas inclui (percentual de conformidade por iniciativa, tendencia ao longo do tempo, principais violacoes) e como o dashboard de conformidade regulatoria no Microsoft Defender for Cloud se integra com o Azure Policy.
12. Defina alertas para violacoes críticas de conformidade. Determine quais violacoes disparam alertas imediatos (ex.: acesso anonimo a blobs habilitado) versus quais sao aceitaveis para incluir em relatórios semanais de conformidade.
13. Projete a trilha de auditoria para evidencias de conformidade. Especifique como demonstrar aos auditores HIPAA que controles sao continuamente aplicados (retencao de Activity Log, logs de avaliação de políticas, historico de isencoes).

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
<summary>Dica 1: Guia de Selecao de Efeitos de Política</summary>

Escolha efeitos com base no impacto e urgencia: Use `deny` para violacoes de alto risco que nunca devem ocorrer (acesso anonimo a blobs, SKUs de VM não aprovados em produção). Use `audit` durante períodos de implantacao ou para requisitos que precisam de revisao humana antes da aplicação. Use `deployIfNotExists` para configurações que podem ser auto-aplicadas com segurança (configurações de diagnóstico, políticas de backup). Use `modify` para aplicação de tags ou adicao de configurações ausentes que não interrompem workloads em execução. Sempre comece com `audit` e evolua para `deny` apos as equipes terem tido tempo para remediar a não conformidade existente.

</details>

<details>
<summary>Dica 2: Iniciativas Integradas vs. Customizadas</summary>

O Azure inclui uma iniciativa integrada de conformidade regulatoria "HIPAA HITRUST" com mais de 100 definicoes de políticas. No entanto, esta iniciativa pode ser muito ampla (políticas que você não precisa) ou muito restrita (faltando seus padrões internos). A abordagem recomendada: (1) Atribua a iniciativa HIPAA integrada para visibilidade no dashboard de conformidade regulatoria, (2) Crie uma iniciativa customizada para padrões internos que referência uma mistura de definicoes de políticas integradas (onde existem) e definicoes customizadas (para requisitos únicos). Isso oferece cobertura regulatoria mais aplicação interna em uma única visao.

</details>

<details>
<summary>Dica 3: Isencoes de Política</summary>

Isencoes de Azure Policy podem ser: `Waiver` (não conformidade reconhecida com data de expiracao - recurso permanece não conforme mas não conta contra o percentual de conformidade) ou `Mitigated` (controle compensatorio existe - recurso e excluido da avaliação). Isencoes possuem escopo (nível de recurso, resource group ou subscription) e suportam uma data `expiresOn`. Melhor prática: exigir que todos os waivers tenham uma data de expiracao é um ticket/justificativa vinculado. Use o Azure Resource Graph para consultar todas as isencoes ativas para relatórios de auditoria.

</details>

<details>
<summary>Dica 4: Tarefas de Remediacao e Managed Identity</summary>

Políticas `deployIfNotExists` e `modify` requerem uma managed identity para executar remediacao. Quando você cria uma atribuicao de política com esses efeitos, o Azure automaticamente cria uma system-assigned managed identity e concede as funções especificadas nos `roleDefinitionIds` da definicao de política. Para políticas customizadas, defina cuidadosamente as funções minimas necessárias. Tarefas de remediacao podem ser disparadas manualmente (para recursos existentes) ou automaticamente (para novos recursos não conformes). A remediacao automática aplica-se apenas a recursos recem-avaliados; recursos existentes requerem a criação de uma tarefa de remediacao manual.

</details>

<details>
<summary>Dica 5: Arquitetura de Relatorios de Conformidade</summary>

Combine três fontes de dados para relatórios abrangentes: (1) Estados de conformidade do Azure Policy (disponiveis via consulta Azure Resource Graph: `policyResources | where type == "microsoft.policyinsights/policystates"`), (2) Dashboard de conformidade regulatoria do Microsoft Defender for Cloud (mapeia políticas para IDs de controle regulatorio), (3) Entradas do Activity Log para mudanças de isencao e modificacoes de atribuicao de políticas. Exporte dados de conformidade de Policy para um workspace de Log Analytics para tendencias historicas. Use Azure Workbooks ou Power BI para o relatório mensal do conselho.

</details>

## Recursos de Aprendizagem

- [Azure Policy overview](https://learn.microsoft.com/azure/governance/policy/overview)
- [Azure Policy effects](https://learn.microsoft.com/azure/governance/policy/concepts/effect-basics)
- [Azure Policy initiatives (initiative definitions)](https://learn.microsoft.com/azure/governance/policy/concepts/initiative-definition-structure)
- [Remediate non-compliant resources](https://learn.microsoft.com/azure/governance/policy/how-to/remediate-resources)
- [Azure Policy exemptions](https://learn.microsoft.com/azure/governance/policy/concepts/exemption-structure)
- [Regulatory compliance in Microsoft Defender for Cloud](https://learn.microsoft.com/azure/defender-for-cloud/regulatory-compliance-dashboard)
- [Tutorial: Create a custom policy definition](https://learn.microsoft.com/azure/governance/policy/tutorials/create-custom-policy-definition)

## Verificação de Conhecimento

<details>
<summary>1. A HealthBridge implanta uma política com efeito `deny` que impede storage accounts sem chaves gerenciadas pelo cliente. Uma storage account existente que foi criada antes da política não possui CMK. Este recurso sera bloqueado de atualizações?</summary>

**Sim, se a atualização disparar avaliação de política nas propriedades cobertas pela regra de política.** O efeito `deny` avalia em operações de criação E atualização de recursos. Se a storage account existente for atualizada (ex.: alterando uma regra de rede), e a regra de política avaliar a configuração de criptografia, a atualização sera negada até que CMK seja configurado. No entanto, o recurso continua executando como esta sem modificacao. Este comportamento incentiva equipes a remediar não conformidade existente antes de fazer outras alteracoes. Para evitar este comportamento de bloqueio em atualizações, algumas equipes comecam com `audit` e migram para `deny` apos a remediacao.

</details>

<details>
<summary>2. A equipe de conformidade precisa que logs de diagnóstico sejam automaticamente habilitados em todos os novos bancos de dados Azure SQL. Nenhum banco de dados deve ser criado sem logging. Qual efeito de política e mais apropriado?</summary>

**`deployIfNotExists`.** Este efeito avalia se um recurso relacionado (a configuração de diagnóstico) existe apos o banco de dados Azure SQL ser criado. Se a configuração de diagnóstico não existir, ele implanta automaticamente um template ARM que a cria. Isso não bloqueia a criação do banco de dados (diferente de `deny`) mas garante que o logging seja configurado imediatamente apos a criação. A atribuicao de política precisa de uma managed identity com permissões para criar configurações de diagnóstico nos recursos alvo.

</details>

<details>
<summary>3. A equipe de telemedicina tem uma necessidade permanente de IPs publicos em seus servidores WebRTC. A equipe de conformidade quer essa exceção documentada mas não quer que ela impacte negativamente o percentual de conformidade da organização. Qual tipo de isencao devem usar?</summary>

**Isencao Mitigated.** Uma isencao `Mitigated` indica que um controle compensatorio existe (neste caso, os IPs publicos sao protegidos por NSGs, proteção DDoS e WAF). Isencoes mitigated excluem o recurso da avaliação de política inteiramente, entao não aparece como não conforme. Uma isencao `Waiver` ainda mostraria o recurso como não conforme mas não o contaria no percentual de conformidade. Como isso é permanente (não uma exceção temporária), `Mitigated` e apropriado com documentação dos controles compensatorios.

</details>

<details>
<summary>4. A HealthBridge atribui uma iniciativa de política com 50 políticas no nível de subscription. Um novo desenvolvedor reclama que a criação de recursos leva mais de 30 segundos a mais do que antes. O que esta acontecendo e como pode ser resolvido?</summary>

**A avaliação de política adiciona latência a requisicoes de criação de recursos.** Cada política com efeito `deny` e `append/modify` deve ser avaliada antes que a requisicao chegue ao resource provider. Com 50 políticas, essa cadeia de avaliação adiciona latência perceptivel. Para resolver: (1) Garanta que políticas usem condições eficientes (evite lógica aninhada complexa), (2) Desabilite políticas que não sao ativamente necessárias (use o efeito `disabled` ao inves de deletar), (3) Use seletores de recurso para limitar a avaliação de política a tipos de recurso específicos ao inves de avaliar todas as 50 políticas contra cada tipo de recurso. Nota: `auditIfNotExists` e `deployIfNotExists` avaliam APOS a criação do recurso e não adicionam latência de criação.

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

**Próximo**: [Challenge 12: Design Identity Governance](/docs/az-305/identity-governance-monitoring/challenge-12)
