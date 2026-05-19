---
sidebar_position: 9
title: "Desafio 09: Projetar Estrutura de Grupos de Gerenciamento e Assinaturas"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 09: Projetar Estrutura de Grupos de Gerenciamento e Assinaturas

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $0-1 | **Peso no Exame: 25-30%**

:::

## Introdução

A Northwind Traders é uma empresa multinacional de varejo e logistica com mais de 200 desenvolvedores distribuidos em cinco unidades de negocio: E-Commerce, Supply Chain, In-Store Technology, Data Analytics e Corporate IT. Nos últimos três anos, eles expandiram sua presença no Azure organicamente sob uma única assinatura Enterprise Agreement. O resultado é uma confusao: 1.400 recursos em uma assinatura sem fronteiras claras de propriedade, desenvolvedores de uma equipe acidentalmente modificando recursos de outra equipe, e aplicação de políticas que ou se aplica muito amplamente ou não se aplica.

O CTO aprovou uma migração para um ambiente multi-assinatura estruturado alinhado com o Cloud Adoption Framework. Requisitos-chave incluem: cada unidade de negocio precisa de isolamento de carga de trabalho com rastreamento de custos independente, uma infraestrutura de serviços compartilhados (hub networking, DNS, monitoramento) deve ser gerenciada centralmente pela Corporate IT, ambientes de produção devem ser bloqueados com políticas mais rigorosas que desenvolvimento, e a equipe de governança precisa da capacidade de aplicar baselines de segurança em toda a organização sem impactar a autonomia individual das equipes. A empresa antecipa adquirir duas empresas menores dentro de 18 meses, e a estrutura deve acomodar novas unidades de negocio sem redesign.

Seu design deve equilibrar centralizacao de governança (segurança, conformidade) com autonomia descentralizada de carga de trabalho (cada BU gerencia suas próprias assinaturas). O CFO requer atribuicao de custos no nível de unidade de negocio, e a equipe de segurança precisa de um painel único para relatórios de conformidade em todas as assinaturas.

## Habilidades do Exame Cobertas

- Recomendar uma estrutura para management groups, assinaturas e resource groups

## Tarefas de Design

### Parte 1: Hierarquia de Management Group

1. Projete uma hierarquia de management group para a Northwind Traders. Inclua no mínimo: uma estratégia de root management group, separacao entre plataforma/serviços compartilhados e landing zones de carga de trabalho, e acomodacao para ambientes sandbox/dev que precisam de políticas relaxadas.
2. Defina quantos níveis de profundidade a hierarquia deve ter e justifique a profundidade. Documente os trade-offs de hierarquias profundas (direcionamento granular de políticas) versus hierarquias rasas (gerenciamento mais simples, limite Azure de 6 níveis de profundidade).
3. Especifique como as duas futuras aquisições serao integradas na hierarquia sem reestruturar management groups existentes.
4. Defina o modelo de herança de governança: quais políticas devem ser aplicadas no nível raiz (afetando todas as assinaturas) versus níveis inferiores de management group.

### Parte 2: Design de Assinatura

5. Determine a estratégia de assinatura para cada unidade de negocio. Avalie e escolha entre: uma assinatura por ambiente por BU, uma assinatura por carga de trabalho, ou um modelo hibrido. Documente o raciocinio.
6. Projete o modelo de assinatura de serviços compartilhados / plataforma. Determine se networking, monitoramento e serviços de identidade residem em uma única assinatura de plataforma ou sao divididos (ex.: assinatura de conectividade, assinatura de gerenciamento, assinatura de identidade conforme CAF).
7. Especifique como assinaturas sandbox devem ser tratadas: quem pode cria-las, quais limites de gastos se aplicam, e como sao impedidas de se conectar a redes de produção.
8. Defina atribuicoes RBAC no nível de assinatura. Determine quais funções (Owner, Contributor, Reader, personalizada) cada persona (lider de BU, desenvolvedor, SRE, equipe de segurança) recebe em cada nível de assinatura.

### Parte 3: Estratégia de Resource Group

9. Projete uma convencao de nomes e padrão de organização de resource groups. Defina se resource groups sao organizados por aplicação, por ciclo de vida (implantar junto/excluir junto), por tipo de recurso, ou uma combinacao.
10. Especifique políticas e locks no nível de resource group. Determine quais resource groups precisam de locks CanNotDelete e quais precisam de locks ReadOnly.
11. Defina um processo para gerenciamento de ciclo de vida de resource groups: quem os cria, sob quais condições, e como resource groups orfaos sao identificados e limpos.

### Parte 4: Convencoes de Nomenclatura

12. Crie um padrão de convencao de nomenclatura para management groups, assinaturas e resource groups que codifique: ambiente, unidade de negocio, região e propósito. Garanta que nomes sejam globalmente únicos onde necessário e dentro dos limites de comprimento.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-09"
  items={[
    "Designed a management group hierarchy aligned with Cloud Adoption Framework landing zone architecture",
    "Defined subscription strategy with clear isolation boundaries per business unit and environment",
    "Specified shared services / platform subscription model with centralized networking",
    "Created governance inheritance model showing which policies apply at which MG level",
    "Documented a scalable naming convention for MGs, subscriptions, and resource groups",
    "Addressed acquisition onboarding without hierarchy restructuring"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Hierarquia de Landing Zone CAF</summary>

O Cloud Adoption Framework recomenda uma hierarquia padrão: Root MG > Platform (com filhos: Identity, Management, Connectivity) e Landing Zones (com filhos: Corp, Online). Grupos adicionais de nível superior incluem Sandbox e Decommissioned. Isso oferece controle centralizado de plataforma enquanto permite autonomia as equipes de landing zone. Você pode adicionar management groups no nível de unidade de negocio sob "Landing Zones" para direcionamento de políticas por BU. O Azure suporta até 6 níveis de profundidade abaixo do root tenant group.

</details>

<details>
<summary>Dica 2: Limites e Fronteiras de Assinatura</summary>

Assinaturas servem como unidade de: faturamento (rastreamento de custos), controle de acesso (fronteira RBAC), escopo de política e limites de recursos (ex.: 980 resource groups por assinatura, cotas de vCPU). O CAF recomenda criar novas assinaturas quando você precisa: separar ambientes para conformidade, isolar raio de impacto para produção, ou criar fronteiras de faturamento distintas. Evite criar assinaturas meramente para fins organizacionais quando resource groups seriam suficientes.

</details>

<details>
<summary>Dica 3: Herança de Políticas e Overrides</summary>

Políticas atribuidas no nível de management group se aplicam a todos os management groups filhos, assinaturas e resource groups abaixo. Você não pode sobrescrever uma política de um escopo pai - você pode apenas adicionar mais políticas ou usar exemptions. Isso significa que políticas no root MG devem ser universalmente aplicaveis (ex.: "todos os recursos devem ter uma tag CostCenter", "diagnostic logging deve ser habilitado"). Restricoes específicas de ambiente (como "sem public IPs em produção") devem ser aplicadas apenas no nível do MG de produção, não na raiz.

</details>

<details>
<summary>Dica 4: Subscription Vending</summary>

Para empresas com múltiplas equipes precisando de assinaturas, considere um padrão de "subscription vending": um processo automatizado (usando módulos Bicep/Terraform) que cria uma nova assinatura com configuração baseline (RBAC, políticas, peering de rede, configurações de diagnóstico) quando uma equipe solicita. Isso garante consistência e acelera a integração. Cada assinatura deve "nascer" com o posicionamento correto de management group, conectividade de rede e configuração de monitoramento.

</details>

<details>
<summary>Dica 5: Isolamento de Sandbox</summary>

Assinaturas sandbox precisam de tratamento especial: coloque-as em um management group dedicado com políticas relaxadas (sem políticas deny, apenas audit). Criticamente, assinaturas sandbox NAO devem ser pareadas com redes virtuais de produção. Aplique limites de gastos ou alertas de orcamento. Considere usar tipos de oferta de assinatura Azure Dev/Test para precos de computacao mais baixos. Algumas organizações excluem automaticamente recursos de sandbox apos 30 dias usando automacao.

</details>

## Recursos de Aprendizagem

- [Azure landing zone management group hierarchy](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-área/resource-org-management-groups)
- [Subscription organization and governance](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-área/resource-org-subscriptions)
- [Resource group design considerations](https://learn.microsoft.com/azure/azure-resource-manager/management/overview#resource-groups)
- [Azure naming conventions](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming)
- [Management group design considerations](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-área/resource-org-management-groups)
- [Subscription vending](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-área/subscription-vending)

## Verificação de Conhecimento

<details>
<summary>1. A equipe de segurança da Northwind quer aplicar uma política que impeca qualquer recurso de ser criado sem uma tag "CostCenter". Isso deve se aplicar a TODAS as assinaturas incluindo futuras aquisições. Onde esta política deve ser atribuida?</summary>

**No root management group (ou no management group personalizado mais alto abaixo do tenant root).** Atribuir neste nível garante que a política seja herdada por todos os management groups filhos, assinaturas e recursos atuais e futuros. Novas aquisições integradas sob a raiz herdarao automaticamente esta política. Atribuir em níveis inferiores perderia assinaturas em outros ramos da hierarquia.

</details>

<details>
<summary>2. A equipe de E-Commerce quer implantar recursos com endereços IP públicos para seus serviços voltados para internet, mas a equipe de Supply Chain opera exclusivamente em redes privadas. Como a política deve ser estruturada para acomodar ambas as necessidades?</summary>

**Use management groups separados para cada unidade de negocio (ou tipo de ambiente) e aplique a política "deny public IPs" apenas no nível do management group de Supply Chain.** NAO aplique a política de deny-public-IP na raiz, pois bloquearia a necessidade legitima do E-Commerce. Em vez disso, coloque restrições específicas de BU no nível do management group da BU. Alternativamente, use o padrão de separacao de landing zones "Corp" e "Online" do CAF onde "Corp" nega IPs públicos e "Online" os permite.

</details>

<details>
<summary>3. A Northwind esta avaliando se a equipe de Data Analytics precisa de sua própria assinatura ou pode compartilhar a assinatura de E-Commerce com separacao por resource group. Quais fatores determinam se uma nova assinatura e justificada?</summary>

**Crie uma assinatura separada quando:** (1) as equipes precisam de faturamento/rastreamento de custos independente no nível de assinatura, (2) elas tem requisitos diferentes de conformidade ou política que não podem coexistir, (3) limites de recursos (cotas de vCPU, contagem de resource groups) podem ser excedidos, (4) isolamento de raio de impacto é necessário (uma configuração incorreta em uma equipe não pode afetar a outra), ou (5) fronteiras RBAC diferentes sao necessárias (Contributor no nível de assinatura para uma equipe não deve conceder acesso a outra). Se apenas separacao organizacional é necessária e as equipes compartilham políticas e padrões RBAC, resource groups dentro da mesma assinatura podem ser suficientes.

</details>

<details>
<summary>4. Management groups Azure tem um limite de 6 níveis de profundidade. A hierarquia proposta da Northwind tem: Root > Industry > Region > BU > Environment > Workload. Eles devem usar todos os 6 níveis?</summary>

**Geralmente não - mantenha a hierarquia em 3-4 níveis.** Hierarquias mais profundas criam complexidade na solução de problemas de políticas (políticas de 6 níveis de herança sao dificeis de depurar), desaceleram a avaliação de políticas e reduzem a agilidade. A recomendacao do CAF e tipicamente 3-4 níveis (Root > Platform/Landing Zones > Environment-type ou BU > Subscriptions). Use resource groups e tags para categorizacao adicional em vez de adicionar níveis de MG. Cada nível deve servir a um propósito claro de diferenciacao de política ou RBAC - se dois níveis teriam políticas identicas, mescle-os.

</details>

## Limpeza

```bash
# Management groups and subscriptions are not typically deleted in a lab exercise.
# If you created test management groups:
az account management-group delete --name "mg-northwind-sandbox"
az account management-group delete --name "mg-northwind-landing-zones"
az account management-group delete --name "mg-northwind-platform"

# Note: You cannot delete a management group that has child subscriptions or MGs.
# Move subscriptions out first:
# az account management-group subscription add --name "yourTargetMG" --subscription "sub-id"
```

---

**Próximo**: [Challenge 10: Design a Resource Tagging Strategy](/docs/az-305/identity-governance-monitoring/challenge-10)
