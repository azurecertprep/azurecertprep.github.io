---
sidebar_position: 10
title: "Challenge 10: Design a Resource Tagging Strategy"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 10: Design a Resource Tagging Strategy

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $0-1 | **Peso no Exame: 25-30%**

:::

## Introducao

A Cloudvista Technologies e uma empresa SaaS que cresceu de 20 para 350 funcionarios em tres anos. Seus gastos com Azure cresceram 300% ano a ano, agora ultrapassando $180.000 por mes, mas a equipe financeira nao consegue determinar qual equipe, projeto ou cliente e responsavel por qual parte da fatura. Durante um incidente recente em producao, o engenheiro de plantao gastou 45 minutos identificando o proprietario de uma Azure Function com falha porque nao havia metadados indicando quem a construiu ou qual projeto ela suportava.

O VP de Engenharia determinou uma estrategia abrangente de tagging que atende a tres necessidades urgentes: (1) O Financeiro deve ser capaz de atribuir 100% dos custos do Azure a unidades de negocio, projetos e centros de custo especificos ate o proximo trimestre; (2) Operacoes deve ser capaz de identificar o proprietario e o nivel de suporte de qualquer recurso em 30 segundos durante um incidente; (3) a equipe de Seguranca precisa classificar recursos por nivel de sensibilidade de dados para fins de auditoria. Alem disso, a equipe de DevOps quer tags que indiquem o mecanismo de implantacao (Terraform, Bicep, manual) e a data da ultima implantacao para deteccao de desvios.

O desafio e a aplicacao: a Cloudvista tem 15 equipes de desenvolvimento, cada uma usando diferentes ferramentas de implantacao (Terraform, Bicep, Azure CLI, Portal). Algumas equipes sao disciplinadas com tagging; outras ignoram completamente. A solucao deve aplicar tags minimas obrigatorias enquanto permite que as equipes adicionem tags personalizadas para suas proprias necessidades operacionais. Recursos que nao podem receber tags (alguns recursos filhos) devem ser contabilizados atraves de tagging do recurso pai ou metodos alternativos de atribuicao.

## Habilidades do Exame Cobertas

- Recomendar uma estrategia para tagging de recursos

## Tarefas de Design

### Parte 1: Design da Taxonomia de Tags

1. Projete a taxonomia completa de tags para a Cloudvista. Categorize as tags em: obrigatorias (devem existir em todos os recursos), condicionais (obrigatorias em contextos especificos) e opcionais (a criterio da equipe). Para cada tag, especifique: nome da tag, valores permitidos (texto livre vs. vocabulario controlado) e proposito.
2. Defina as tags minimas obrigatorias para atribuicao de custos. Estas devem permitir que o Financeiro gere relatorios mostrando custo por: unidade de negocio, projeto/aplicacao, centro de custo e ambiente.
3. Defina tags operacionais que suportem resposta a incidentes. No minimo: proprietario do recurso (individuo ou equipe), nivel de suporte (P1-P4) e mecanismo de implantacao.
4. Defina tags de seguranca e conformidade: nivel de classificacao de dados (publico, interno, confidencial, restrito), escopo regulatorio (GDPR, SOC2, HIPAA) e se o recurso lida com PII.

### Parte 2: Aplicacao de Tags com Azure Policy

5. Projete definicoes de Azure Policy para aplicar as tags obrigatorias. Para cada tag obrigatoria, determine o efeito de politica apropriado: tags ausentes devem ser negadas (impedir criacao), auditadas (sinalizar nao conformidade) ou auto-remediadas (herdar ou aplicar um valor padrao)?
6. Crie uma estrategia de politica para validacao de valores de tags. Determine quais tags precisam de vocabularios controlados (apenas valores especificos permitidos) versus texto livre.
7. Projete uma estrategia de remediacao para os mais de 1.400 recursos existentes que nao possuem tags. Determine se deve usar tarefas de remediacao do Azure Policy com efeito `modify`, scripts em massa ou um processo de triagem manual.
8. Aborde as limitacoes de heranca de tags. Tags do Azure nao herdam automaticamente de resource groups ou subscriptions para recursos filhos. Projete uma solucao para garantir que recursos herdem tags do pai (opcoes: Azure Policy com efeito `modify`, templates de implantacao ou automacao pos-implantacao).

### Parte 3: Alocacao de Custos e Relatorios

9. Projete como as tags se integram com o Azure Cost Management. Especifique quais tags serao usadas como dimensoes de alocacao de custos, como recursos sem tags serao atribuidos e como recursos compartilhados (networking hub, monitoramento) serao alocados entre unidades de negocio.
10. Aborde recursos que nao podem receber tags (certos recursos filhos, recursos classicos). Defina um metodo alternativo de atribuicao de custos para estes recursos.
11. Defina um processo para higiene de tags: como valores de tags obsoletos sao detectados (ex.: um proprietario que saiu da empresa), quem e responsavel por atualiza-los e com que frequencia a conformidade de tags e revisada.

### Parte 4: Convencoes de Nomenclatura e Automacao

12. Projete convencoes de nomenclatura de tags: tratamento de sensibilidade a maiusculas/minusculas (tags do Azure sao case-insensitive para chaves mas case-sensitive para valores), comprimentos maximos (nome da tag: 512 caracteres, valor da tag: 256 caracteres) e restricoes de caracteres.
13. Defina como ferramentas de IaC (Terraform, Bicep) devem implementar tags. Especifique um padrao para tags padrao aplicadas pelo pipeline de CI/CD (ex.: timestamp de implantacao, ID de execucao do pipeline, SHA do commit git) sem exigir acao do desenvolvedor.
14. Projete um dashboard de conformidade de tags que mostre: percentual de recursos com tags por equipe, tags ausentes mais comuns e custo de recursos sem tags.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-10"
  items={[
    "Designed a complete tag taxonomy with mandatory, conditional, and optional categories",
    "Specified Azure Policy enforcement strategy with appropriate effects for each tag type",
    "Addressed tag inheritance from resource groups to child resources",
    "Defined cost allocation strategy using tags with handling for untaggable resources",
    "Created a remediation plan for existing untagged resources",
    "Documented IaC integration patterns for automatic tag application in CI/CD pipelines"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Tags Minimas Recomendadas</summary>

O Cloud Adoption Framework da Microsoft recomenda estas tags minimas: `CostCenter`, `Owner`, `Environment` (dev/test/staging/prod), `Application` ou `Workload`, `DataClassification` e `BusinessUnit`. Tags adicionais comumente usadas incluem: `CreatedBy`, `CreatedDate`, `Criticality` (mission-critical/business-critical/low) e `SupportTeam`. Mantenha tags obrigatorias em no maximo 5-7 para evitar atrito com desenvolvedores. Cada tag obrigatoria adicional aumenta a chance de nao conformidade.

</details>

<details>
<summary>Dica 2: Efeitos de Politica para Aplicacao de Tags</summary>

Use diferentes efeitos para diferentes cenarios: `deny` para tags verdadeiramente obrigatorias em producao (impede criacao de recursos sem a tag), `audit` para monitorar conformidade sem bloquear (bom para periodos de implantacao), `modify` para auto-aplicar valores padrao ou herdar de resource groups (otimo para tags como `Environment` que podem ser inferidas da subscription). O efeito `modify` requer uma managed identity na atribuicao de politica. Para heranca de tags, use a politica integrada "Inherit a tag from the resource group" com efeito `modify`.

</details>

<details>
<summary>Dica 3: Validacao de Valores de Tags</summary>

O Azure Policy pode aplicar valores especificos permitidos usando as condicoes `in` ou `notIn`. Por exemplo, aplicar que `Environment` deve ser um de: `dev`, `test`, `staging`, `prod`. Para tags com muitos valores validos (como `CostCenter`), mantenha uma lista permitida em um parametro de politica que atualiza trimestralmente. Para tags de texto livre como `Owner`, aplique padroes de formato (ex.: deve ser um endereco de email valido) usando as condicoes `match` ou `like` nas regras de politica.

</details>

<details>
<summary>Dica 4: Tratamento de Recursos Existentes</summary>

Para os mais de 1.400 recursos existentes sem tags: (1) Comece implantando politicas em modo `audit` para avaliar a lacuna. (2) Use consultas do Azure Resource Graph para identificar recursos sem tags obrigatorias e exporte para CSV para atribuicao por equipe. (3) Crie tarefas de remediacao usando o efeito `modify` para auto-aplicar tags onde valores podem ser inferidos (ex.: todos os recursos em rg-ecommerce-prod recebem `BusinessUnit: E-Commerce`, `Environment: prod`). (4) Para tags que requerem input humano (como `Owner`), atribua responsabilidade por resource group e defina um prazo de 30 dias antes de mudar politicas para `deny`.

</details>

<details>
<summary>Dica 5: Automacao de Tags com IaC</summary>

No Terraform, use um bloco `default_tags` na configuracao do provider para aplicar tags automaticamente a todos os recursos. No Bicep, crie um modulo que mescla tags obrigatorias com tags especificas do recurso. Em pipelines de CI/CD, injete tags dinamicas (SHA do commit, ID do pipeline, timestamp de implantacao) como variaveis de pipeline que passam para a ferramenta de IaC. Isso garante tagging consistente sem intervencao do desenvolvedor. Azure DevOps e GitHub Actions podem injetar esses valores automaticamente.

</details>

## Recursos de Aprendizagem

- [Define your tagging strategy](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/resource-tagging)
- [Azure tagging decision guide](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming-and-tagging-decision-guide)
- [Assign policy to enforce tagging](https://learn.microsoft.com/azure/azure-resource-manager/management/tag-policies)
- [Use tags to organize Azure resources](https://learn.microsoft.com/azure/azure-resource-manager/management/tag-resources)
- [Azure Policy built-in definitions for tags](https://learn.microsoft.com/azure/governance/policy/samples/built-in-policies#tags)
- [Cost allocation with tags in Azure Cost Management](https://learn.microsoft.com/azure/cost-management-billing/costs/cost-analysis-built-in-views)

## Verificacao de Conhecimento

<details>
<summary>1. A Cloudvista quer garantir que todo novo recurso em subscriptions de producao tenha uma tag "CostCenter" antes de poder ser criado. No entanto, em subscriptions de desenvolvimento, eles querem sinalizar nao conformidade sem bloquear. Qual configuracao de politica alcanca isso?</summary>

**Use a mesma definicao de politica com diferentes efeitos em diferentes escopos.** Atribua a politica "Require CostCenter tag" no management group de producao com efeito `deny` (bloqueia criacao sem a tag). Atribua a mesma definicao de politica no management group de desenvolvimento com efeito `audit` (registra nao conformidade no dashboard de conformidade mas permite criacao). Alternativamente, use uma politica parametrizada onde o efeito e um parametro, e use diferentes valores de parametro por atribuicao.

</details>

<details>
<summary>2. Um resource group esta com a tag "Environment: prod" mas os recursos dentro dele nao estao. Como a Cloudvista pode aplicar automaticamente a tag Environment do resource group a todos os recursos filhos?</summary>

**Use a politica integrada "Inherit a tag from the resource group" com o efeito `modify`.** Esta politica copia automaticamente a tag especificada do resource group para qualquer recurso criado dentro dele que esteja sem essa tag. Atribua-a com uma managed identity (necessaria para o efeito `modify`). Para recursos existentes que ja estao sem a tag, execute uma tarefa de remediacao que aplica retroativamente a tag aos recursos nao conformes. Nota: isso so copia na criacao ou via remediacao - nao sincroniza dinamicamente se o valor da tag do RG mudar depois.

</details>

<details>
<summary>3. Alguns recursos do Azure (como snapshots de disco gerenciado ou certos recursos filhos) nao suportam tags. Como os custos desses recursos devem ser atribuidos?</summary>

**Use multiplos metodos de atribuicao:** (1) O Azure Cost Management permite regras de alocacao de custos que distribuem custos de recursos sem tags com base em tags do recurso pai ou tags do resource group. (2) Para recursos que suportam relacionamentos pai-filho, adicione tag ao recurso pai e use analise de custos agrupando por resource group. (3) Crie regras de alocacao de custos no Azure Cost Management para dividir custos compartilhados (como networking) proporcionalmente entre unidades de negocio com base em uma formula definida. (4) Aceite que uma pequena porcentagem (tipicamente menos de 5%) dos custos exigira atribuicao manual.

</details>

<details>
<summary>4. Um desenvolvedor cria um recurso via Portal do Azure e esquece de adicionar tags obrigatorias. O recurso e criado com sucesso mas aparece como nao conforme no dashboard de politicas. Qual efeito de politica provavelmente foi usado, e o que deve mudar para aplicacao mais rigorosa?</summary>

**O efeito atual e `audit` (ou `auditIfNotExists`)**, que registra nao conformidade mas nao impede a criacao do recurso. Para aplicar rigorosamente, mude o efeito para `deny`, que retorna um erro 403 e impede que o recurso seja criado sem a tag obrigatoria. No entanto, isso pode bloquear usuarios do Portal que nao estao cientes do requisito. Um meio termo e usar `deny` para producao e `modify` para desenvolvimento (que auto-aplica um valor padrao como "unassigned" para que o recurso seja criado mas sinalizado para acompanhamento).

</details>

## Limpeza

```bash
# Remove policy assignments created for this challenge
az policy assignment delete --name "require-costcenter-tag" --scope "/subscriptions/<subscription-id>"
az policy assignment delete --name "inherit-env-tag" --scope "/subscriptions/<subscription-id>"

# Remove custom policy definitions if created
az policy definition delete --name "require-mandatory-tags-custom"

# Remove any test resource groups
az group delete --name rg-tagging-test --yes --no-wait
```

---

**Proximo**: [Challenge 11: Design a Compliance Solution](/docs/az-305/identity-governance-monitoring/challenge-11)
