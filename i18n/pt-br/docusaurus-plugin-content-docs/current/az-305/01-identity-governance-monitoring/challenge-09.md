---
sidebar_position: 9
title: "Challenge 09: Design a Management Group & Subscription Structure"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 09: Design a Management Group & Subscription Structure

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $0-1 | **Peso no Exame: 25-30%**

:::

## Introducao

A Northwind Traders e uma empresa multinacional de varejo e logistica com mais de 200 desenvolvedores distribuidos em cinco unidades de negocio: E-Commerce, Supply Chain, In-Store Technology, Data Analytics e Corporate IT. Nos ultimos tres anos, eles expandiram sua presenca no Azure organicamente sob uma unica assinatura Enterprise Agreement. O resultado e uma confusao: 1.400 recursos em uma assinatura sem fronteiras claras de propriedade, desenvolvedores de uma equipe acidentalmente modificando recursos de outra equipe, e aplicacao de politicas que ou se aplica muito amplamente ou nao se aplica.

O CTO aprovou uma migracao para um ambiente multi-assinatura estruturado alinhado com o Cloud Adoption Framework. Requisitos-chave incluem: cada unidade de negocio precisa de isolamento de carga de trabalho com rastreamento de custos independente, uma infraestrutura de servicos compartilhados (hub networking, DNS, monitoramento) deve ser gerenciada centralmente pela Corporate IT, ambientes de producao devem ser bloqueados com politicas mais rigorosas que desenvolvimento, e a equipe de governanca precisa da capacidade de aplicar baselines de seguranca em toda a organizacao sem impactar a autonomia individual das equipes. A empresa antecipa adquirir duas empresas menores dentro de 18 meses, e a estrutura deve acomodar novas unidades de negocio sem redesign.

Seu design deve equilibrar centralizacao de governanca (seguranca, conformidade) com autonomia descentralizada de carga de trabalho (cada BU gerencia suas proprias assinaturas). O CFO requer atribuicao de custos no nivel de unidade de negocio, e a equipe de seguranca precisa de um painel unico para relatorios de conformidade em todas as assinaturas.

## Habilidades do Exame Cobertas

- Recomendar uma estrutura para management groups, assinaturas e resource groups

## Tarefas de Design

### Parte 1: Hierarquia de Management Group

1. Projete uma hierarquia de management group para a Northwind Traders. Inclua no minimo: uma estrategia de root management group, separacao entre plataforma/servicos compartilhados e landing zones de carga de trabalho, e acomodacao para ambientes sandbox/dev que precisam de politicas relaxadas.
2. Defina quantos niveis de profundidade a hierarquia deve ter e justifique a profundidade. Documente os trade-offs de hierarquias profundas (direcionamento granular de politicas) versus hierarquias rasas (gerenciamento mais simples, limite Azure de 6 niveis de profundidade).
3. Especifique como as duas futuras aquisicoes serao integradas na hierarquia sem reestruturar management groups existentes.
4. Defina o modelo de heranca de governanca: quais politicas devem ser aplicadas no nivel raiz (afetando todas as assinaturas) versus niveis inferiores de management group.

### Parte 2: Design de Assinatura

5. Determine a estrategia de assinatura para cada unidade de negocio. Avalie e escolha entre: uma assinatura por ambiente por BU, uma assinatura por carga de trabalho, ou um modelo hibrido. Documente o raciocinio.
6. Projete o modelo de assinatura de servicos compartilhados / plataforma. Determine se networking, monitoramento e servicos de identidade residem em uma unica assinatura de plataforma ou sao divididos (ex.: assinatura de conectividade, assinatura de gerenciamento, assinatura de identidade conforme CAF).
7. Especifique como assinaturas sandbox devem ser tratadas: quem pode cria-las, quais limites de gastos se aplicam, e como sao impedidas de se conectar a redes de producao.
8. Defina atribuicoes RBAC no nivel de assinatura. Determine quais funcoes (Owner, Contributor, Reader, personalizada) cada persona (lider de BU, desenvolvedor, SRE, equipe de seguranca) recebe em cada nivel de assinatura.

### Parte 3: Estrategia de Resource Group

9. Projete uma convencao de nomes e padrao de organizacao de resource groups. Defina se resource groups sao organizados por aplicacao, por ciclo de vida (implantar junto/excluir junto), por tipo de recurso, ou uma combinacao.
10. Especifique politicas e locks no nivel de resource group. Determine quais resource groups precisam de locks CanNotDelete e quais precisam de locks ReadOnly.
11. Defina um processo para gerenciamento de ciclo de vida de resource groups: quem os cria, sob quais condicoes, e como resource groups orfaos sao identificados e limpos.

### Parte 4: Convencoes de Nomenclatura

12. Crie um padrao de convencao de nomenclatura para management groups, assinaturas e resource groups que codifique: ambiente, unidade de negocio, regiao e proposito. Garanta que nomes sejam globalmente unicos onde necessario e dentro dos limites de comprimento.

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

O Cloud Adoption Framework recomenda uma hierarquia padrao: Root MG > Platform (com filhos: Identity, Management, Connectivity) e Landing Zones (com filhos: Corp, Online). Grupos adicionais de nivel superior incluem Sandbox e Decommissioned. Isso oferece controle centralizado de plataforma enquanto permite autonomia as equipes de landing zone. Voce pode adicionar management groups no nivel de unidade de negocio sob "Landing Zones" para direcionamento de politicas por BU. O Azure suporta ate 6 niveis de profundidade abaixo do root tenant group.

</details>

<details>
<summary>Dica 2: Limites e Fronteiras de Assinatura</summary>

Assinaturas servem como unidade de: faturamento (rastreamento de custos), controle de acesso (fronteira RBAC), escopo de politica e limites de recursos (ex.: 980 resource groups por assinatura, cotas de vCPU). O CAF recomenda criar novas assinaturas quando voce precisa: separar ambientes para conformidade, isolar raio de impacto para producao, ou criar fronteiras de faturamento distintas. Evite criar assinaturas meramente para fins organizacionais quando resource groups seriam suficientes.

</details>

<details>
<summary>Dica 3: Heranca de Politicas e Overrides</summary>

Politicas atribuidas no nivel de management group se aplicam a todos os management groups filhos, assinaturas e resource groups abaixo. Voce nao pode sobrescrever uma politica de um escopo pai - voce pode apenas adicionar mais politicas ou usar exemptions. Isso significa que politicas no root MG devem ser universalmente aplicaveis (ex.: "todos os recursos devem ter uma tag CostCenter", "diagnostic logging deve ser habilitado"). Restricoes especificas de ambiente (como "sem public IPs em producao") devem ser aplicadas apenas no nivel do MG de producao, nao na raiz.

</details>

<details>
<summary>Dica 4: Subscription Vending</summary>

Para empresas com multiplas equipes precisando de assinaturas, considere um padrao de "subscription vending": um processo automatizado (usando modulos Bicep/Terraform) que cria uma nova assinatura com configuracao baseline (RBAC, politicas, peering de rede, configuracoes de diagnostico) quando uma equipe solicita. Isso garante consistencia e acelera a integracao. Cada assinatura deve "nascer" com o posicionamento correto de management group, conectividade de rede e configuracao de monitoramento.

</details>

<details>
<summary>Dica 5: Isolamento de Sandbox</summary>

Assinaturas sandbox precisam de tratamento especial: coloque-as em um management group dedicado com politicas relaxadas (sem politicas deny, apenas audit). Criticamente, assinaturas sandbox NAO devem ser pareadas com redes virtuais de producao. Aplique limites de gastos ou alertas de orcamento. Considere usar tipos de oferta de assinatura Azure Dev/Test para precos de computacao mais baixos. Algumas organizacoes excluem automaticamente recursos de sandbox apos 30 dias usando automacao.

</details>

## Recursos de Aprendizagem

- [Azure landing zone management group hierarchy](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/resource-org-management-groups)
- [Subscription organization and governance](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/resource-org-subscriptions)
- [Resource group design considerations](https://learn.microsoft.com/azure/azure-resource-manager/management/overview#resource-groups)
- [Azure naming conventions](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming)
- [Management group design considerations](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/resource-org-management-groups)
- [Subscription vending](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/subscription-vending)

## Verificacao de Conhecimento

<details>
<summary>1. A equipe de seguranca da Northwind quer aplicar uma politica que impeca qualquer recurso de ser criado sem uma tag "CostCenter". Isso deve se aplicar a TODAS as assinaturas incluindo futuras aquisicoes. Onde esta politica deve ser atribuida?</summary>

**No root management group (ou no management group personalizado mais alto abaixo do tenant root).** Atribuir neste nivel garante que a politica seja herdada por todos os management groups filhos, assinaturas e recursos atuais e futuros. Novas aquisicoes integradas sob a raiz herdarao automaticamente esta politica. Atribuir em niveis inferiores perderia assinaturas em outros ramos da hierarquia.

</details>

<details>
<summary>2. A equipe de E-Commerce quer implantar recursos com enderecos IP publicos para seus servicos voltados para internet, mas a equipe de Supply Chain opera exclusivamente em redes privadas. Como a politica deve ser estruturada para acomodar ambas as necessidades?</summary>

**Use management groups separados para cada unidade de negocio (ou tipo de ambiente) e aplique a politica "deny public IPs" apenas no nivel do management group de Supply Chain.** NAO aplique a politica de deny-public-IP na raiz, pois bloquearia a necessidade legitima do E-Commerce. Em vez disso, coloque restricoes especificas de BU no nivel do management group da BU. Alternativamente, use o padrao de separacao de landing zones "Corp" e "Online" do CAF onde "Corp" nega IPs publicos e "Online" os permite.

</details>

<details>
<summary>3. A Northwind esta avaliando se a equipe de Data Analytics precisa de sua propria assinatura ou pode compartilhar a assinatura de E-Commerce com separacao por resource group. Quais fatores determinam se uma nova assinatura e justificada?</summary>

**Crie uma assinatura separada quando:** (1) as equipes precisam de faturamento/rastreamento de custos independente no nivel de assinatura, (2) elas tem requisitos diferentes de conformidade ou politica que nao podem coexistir, (3) limites de recursos (cotas de vCPU, contagem de resource groups) podem ser excedidos, (4) isolamento de raio de impacto e necessario (uma configuracao incorreta em uma equipe nao pode afetar a outra), ou (5) fronteiras RBAC diferentes sao necessarias (Contributor no nivel de assinatura para uma equipe nao deve conceder acesso a outra). Se apenas separacao organizacional e necessaria e as equipes compartilham politicas e padroes RBAC, resource groups dentro da mesma assinatura podem ser suficientes.

</details>

<details>
<summary>4. Management groups Azure tem um limite de 6 niveis de profundidade. A hierarquia proposta da Northwind tem: Root > Industry > Region > BU > Environment > Workload. Eles devem usar todos os 6 niveis?</summary>

**Geralmente nao - mantenha a hierarquia em 3-4 niveis.** Hierarquias mais profundas criam complexidade na solucao de problemas de politicas (politicas de 6 niveis de heranca sao dificeis de depurar), desaceleram a avaliacao de politicas e reduzem a agilidade. A recomendacao do CAF e tipicamente 3-4 niveis (Root > Platform/Landing Zones > Environment-type ou BU > Subscriptions). Use resource groups e tags para categorizacao adicional em vez de adicionar niveis de MG. Cada nivel deve servir a um proposito claro de diferenciacao de politica ou RBAC - se dois niveis teriam politicas identicas, mescle-os.

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

**Proximo**: [Challenge 10: Design a Resource Tagging Strategy](/docs/az-305/identity-governance-monitoring/challenge-10)
