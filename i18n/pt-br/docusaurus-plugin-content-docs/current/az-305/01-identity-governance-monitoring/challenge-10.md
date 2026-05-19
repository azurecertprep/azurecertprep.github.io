---
sidebar_position: 10
title: "Desafio 10: Projetar uma Estratégia de Marcação de Recursos"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 10: projetar uma estratégia de marcação de recursos

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $0-1 | **Peso no Exame: 25-30%**

:::

## Introdução

A Cloudvista Technologies é uma empresa SaaS que cresceu de 20 para 350 funcionários em três anos. Seus gastos com Azure cresceram 300% ano a ano, agora ultrapassando $180.000 por mes, mas a equipe financeira não consegue determinar qual equipe, projeto ou cliente é responsável por qual parte da fatura. Durante um incidente recente em produção, o engenheiro de plantao gastou 45 minutos identificando o proprietario de uma Azure Function com falha porque não havia metadados indicando quem a construiu ou qual projeto ela suportava.

O VP de Engenharia determinou uma estratégia abrangente de tagging que atende a três necessidades urgentes: (1) O Financeiro deve ser capaz de atribuir 100% dos custos do Azure a unidades de negocio, projetos e centros de custo específicos até o próximo trimestre; (2) Operações deve ser capaz de identificar o proprietario e o nível de suporte de qualquer recurso em 30 segundos durante um incidente; (3) a equipe de Segurança precisa classificar recursos por nível de sensibilidade de dados para fins de auditoria. Além disso, a equipe de DevOps quer tags que indiquem o mecanismo de implantacao (Terraform, Bicep, manual) e a data da última implantacao para detecção de desvios.

O desafio é a aplicação: a Cloudvista tem 15 equipes de desenvolvimento, cada uma usando diferentes ferramentas de implantacao (Terraform, Bicep, Azure CLI, Portal). Algumas equipes sao disciplinadas com tagging; outras ignoram completamente. A solução deve aplicar tags minimas obrigatorias enquanto permite que as equipes adicionem tags personalizadas para suas próprias necessidades operacionais. Recursos que não podem receber tags (alguns recursos filhos) devem ser contabilizados através de tagging do recurso pai ou métodos alternativos de atribuicao.

## Habilidades do exame cobertas

- Recomendar uma estratégia para tagging de recursos

## Tarefas de design

### Parte 1: design da taxonomia de tags

1. Projete a taxonomia completa de tags para a Cloudvista. Categorize as tags em: obrigatorias (devem existir em todos os recursos), condicionais (obrigatorias em contextos específicos) e opcionais (a criterio da equipe). Para cada tag, especifique: nome da tag, valores permitidos (texto livre vs. vocabulario controlado) e propósito.
2. Defina as tags minimas obrigatorias para atribuicao de custos. Estas devem permitir que o Financeiro gere relatórios mostrando custo por: unidade de negocio, projeto/aplicação, centro de custo e ambiente.
3. Defina tags operacionais que suportem resposta a incidentes. No mínimo: proprietario do recurso (individuo ou equipe), nível de suporte (P1-P4) e mecanismo de implantacao.
4. Defina tags de segurança e conformidade: nível de classificacao de dados (público, interno, confidencial, restrito), escopo regulatorio (GDPR, SOC2, HIPAA) e se o recurso lida com PII.

### Parte 2: aplicação de tags com Azure Policy

5. Projete definicoes de Azure Policy para aplicar as tags obrigatorias. Para cada tag obrigatória, determine o efeito de política apropriado: tags ausentes devem ser negadas (impedir criação), auditadas (sinalizar não conformidade) ou auto-remediadas (herdar ou aplicar um valor padrão)?
6. Crie uma estratégia de política para validação de valores de tags. Determine quais tags precisam de vocabularios controlados (apenas valores específicos permitidos) versus texto livre.
7. Projete uma estratégia de remediacao para os mais de 1.400 recursos existentes que não possuem tags. Determine se deve usar tarefas de remediacao do Azure Policy com efeito `modify`, scripts em massa ou um processo de triagem manual.
8. Aborde as limitacoes de herança de tags. Tags do Azure não herdam automaticamente de resource groups ou subscriptions para recursos filhos. Projete uma solução para garantir que recursos herdem tags do pai (opcoes: Azure Policy com efeito `modify`, templates de implantacao ou automacao pós-implantacao).

### Parte 3: alocacao de custos e relatorios

9. Projete como as tags se integram com o Azure Cost Management. Especifique quais tags serao usadas como dimensoes de alocacao de custos, como recursos sem tags serao atribuidos e como recursos compartilhados (networking hub, monitoramento) serao alocados entre unidades de negocio.
10. Aborde recursos que não podem receber tags (certos recursos filhos, recursos classicos). Defina um método alternativo de atribuicao de custos para estes recursos.
11. Defina um processo para higiene de tags: como valores de tags obsoletos sao detectados (ex.: um proprietario que saiu da empresa), quem é responsável por atualiza-los e com que frequência a conformidade de tags e revisada.

### Parte 4: convencoes de nomenclatura e automacao

12. Projete convencoes de nomenclatura de tags: tratamento de sensibilidade a maiusculas/minusculas (tags do Azure sao case-insensitive para chaves mas case-sensitive para valores), comprimentos maximos (nome da tag: 512 caracteres, valor da tag: 256 caracteres) e restrições de caracteres.
13. Defina como ferramentas de IaC (Terraform, Bicep) devem implementar tags. Especifique um padrão para tags padrão aplicadas pelo pipeline de CI/CD (ex.: timestamp de implantacao, ID de execução do pipeline, SHA do commit git) sem exigir acao do desenvolvedor.
14. Projete um dashboard de conformidade de tags que mostre: percentual de recursos com tags por equipe, tags ausentes mais comuns e custo de recursos sem tags.

## Criterios de sucesso

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

O Cloud Adoption Framework da Microsoft recomenda estas tags minimas: `CostCenter`, `Owner`, `Environment` (dev/test/staging/prod), `Application` ou `Workload`, `DataClassification` e `BusinessUnit`. Tags adicionais comumente usadas incluem: `CreatedBy`, `CreatedDate`, `Criticality` (mission-critical/business-critical/low) e `SupportTeam`. Mantenha tags obrigatorias em no máximo 5-7 para evitar atrito com desenvolvedores. Cada tag obrigatória adicional aumenta a chance de não conformidade.

</details>

<details>
<summary>Dica 2: Efeitos de Política para Aplicação de Tags</summary>

Use diferentes efeitos para diferentes cenários: `deny` para tags verdadeiramente obrigatorias em produção (impede criação de recursos sem a tag), `audit` para monitorar conformidade sem bloquear (bom para períodos de implantacao), `modify` para auto-aplicar valores padrão ou herdar de resource groups (ótimo para tags como `Environment` que podem ser inferidas da subscription). O efeito `modify` requer uma managed identity na atribuicao de política. Para herança de tags, use a política integrada "Inherit a tag from the resource group" com efeito `modify`.

</details>

<details>
<summary>Dica 3: Validação de Valores de Tags</summary>

O Azure Policy pode aplicar valores específicos permitidos usando as condições `in` ou `notIn`. Por exemplo, aplicar que `Environment` deve ser um de: `dev`, `test`, `staging`, `prod`. Para tags com muitos valores válidos (como `CostCenter`), mantenha uma lista permitida em um parametro de política que atualiza trimestralmente. Para tags de texto livre como `Owner`, aplique padrões de formato (ex.: deve ser um endereço de email válido) usando as condições `match` ou `like` nas regras de política.

</details>

<details>
<summary>Dica 4: Tratamento de Recursos Existentes</summary>

Para os mais de 1.400 recursos existentes sem tags: (1) Comece implantando políticas em modo `audit` para avaliar a lacuna. (2) Use consultas do Azure Resource Graph para identificar recursos sem tags obrigatorias e exporte para CSV para atribuicao por equipe. (3) Crie tarefas de remediacao usando o efeito `modify` para auto-aplicar tags onde valores podem ser inferidos (ex.: todos os recursos em rg-ecommerce-prod recebem `BusinessUnit: E-Commerce`, `Environment: prod`). (4) Para tags que requerem input humano (como `Owner`), atribua responsabilidade por resource group e defina um prazo de 30 dias antes de mudar políticas para `deny`.

</details>

<details>
<summary>Dica 5: Automacao de Tags com IaC</summary>

No Terraform, use um bloco `default_tags` na configuração do provider para aplicar tags automaticamente a todos os recursos. No Bicep, crie um módulo que mescla tags obrigatorias com tags específicas do recurso. Em pipelines de CI/CD, injete tags dinamicas (SHA do commit, ID do pipeline, timestamp de implantacao) como variaveis de pipeline que passam para a ferramenta de IaC. Isso garante tagging consistente sem intervencao do desenvolvedor. Azure DevOps e GitHub Actions podem injetar esses valores automaticamente.

</details>

## Recursos de aprendizagem

- [Define your tagging strategy](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/resource-tagging)
- [Azure tagging decision guide](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming-and-tagging-decision-guide)
- [Assign policy to enforce tagging](https://learn.microsoft.com/azure/azure-resource-manager/management/tag-policies)
- [Use tags to organize Azure resources](https://learn.microsoft.com/azure/azure-resource-manager/management/tag-resources)
- [Azure Policy built-in definitions for tags](https://learn.microsoft.com/azure/governance/policy/samples/built-in-policies#tags)
- [Cost allocation with tags in Azure Cost Management](https://learn.microsoft.com/azure/cost-management-billing/costs/cost-analysis-built-in-views)

## Verificação de conhecimento

<details>
<summary>1. A Cloudvista quer garantir que todo novo recurso em subscriptions de produção tenha uma tag "CostCenter" antes de poder ser criado. No entanto, em subscriptions de desenvolvimento, eles querem sinalizar não conformidade sem bloquear. Qual configuração de política alcanca isso?</summary>

**Use a mesma definicao de política com diferentes efeitos em diferentes escopos.** Atribua a política "Require CostCenter tag" no management group de produção com efeito `deny` (bloqueia criação sem a tag). Atribua a mesma definicao de política no management group de desenvolvimento com efeito `audit` (registra não conformidade no dashboard de conformidade mas permite criação). Alternativamente, use uma política parametrizada onde o efeito é um parametro, e use diferentes valores de parametro por atribuicao.

</details>

<details>
<summary>2. Um resource group esta com a tag "Environment: prod" mas os recursos dentro dele não estao. Como a Cloudvista pode aplicar automaticamente a tag Environment do resource group a todos os recursos filhos?</summary>

**Use a política integrada "Inherit a tag from the resource group" com o efeito `modify`.** Esta política copia automaticamente a tag especificada do resource group para qualquer recurso criado dentro dele que esteja sem essa tag. Atribua-a com uma managed identity (necessária para o efeito `modify`). Para recursos existentes que já estao sem a tag, execute uma tarefa de remediacao que aplica retroativamente a tag aos recursos não conformes. Nota: isso só copia na criação ou via remediacao - não sincroniza dinamicamente se o valor da tag do RG mudar depois.

</details>

<details>
<summary>3. Alguns recursos do Azure (como snapshots de disco gerenciado ou certos recursos filhos) não suportam tags. Como os custos desses recursos devem ser atribuidos?</summary>

**Use múltiplos métodos de atribuicao:** (1) O Azure Cost Management permite regras de alocacao de custos que distribuem custos de recursos sem tags com base em tags do recurso pai ou tags do resource group. (2) Para recursos que suportam relacionamentos pai-filho, adicione tag ao recurso pai e use análise de custos agrupando por resource group. (3) Crie regras de alocacao de custos no Azure Cost Management para dividir custos compartilhados (como networking) proporcionalmente entre unidades de negocio com base em uma formula definida. (4) Aceite que uma pequena porcentagem (tipicamente menos de 5%) dos custos exigira atribuicao manual.

</details>

<details>
<summary>4. Um desenvolvedor cria um recurso via Portal do Azure e esquece de adicionar tags obrigatorias. O recurso é criado com sucesso mas aparece como não conforme no dashboard de políticas. Qual efeito de política provavelmente foi usado, e o que deve mudar para aplicação mais rigorosa?</summary>

**O efeito atual e `audit` (ou `auditIfNotExists`)**, que registra não conformidade mas não impede a criação do recurso. Para aplicar rigorosamente, mude o efeito para `deny`, que retorna um erro 403 e impede que o recurso seja criado sem a tag obrigatória. No entanto, isso pode bloquear usuários do Portal que não estao cientes do requisito. Um meio termo e usar `deny` para produção e `modify` para desenvolvimento (que auto-aplica um valor padrão como "unassigned" para que o recurso seja criado mas sinalizado para acompanhamento).

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

**Próximo**: [Challenge 11: Design a Compliance Solution](/docs/az-305/identity-governance-monitoring/challenge-11)
