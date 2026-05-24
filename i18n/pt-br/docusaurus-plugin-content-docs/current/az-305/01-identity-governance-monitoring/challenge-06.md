---
sidebar_position: 6
title: "Desafio 06: Projetar AutorizaÃ§Ã£o para Recursos Azure"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 06: projetar autorizaÃ§Ã£o para recursos Azure

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $0-5 | **Peso no Exame: 25-30%**

:::

## IntroduÃ§Ã£o

A Fabrikam Inc. Ã© uma empresa de software com 200 engenheiros organizados em 5 equipes de produto. Eles operam um ambiente Azure maduro com a seguinte estrutura:
- 3 assinaturas: Development, Staging, Production
- 15 resource groups por assinatura (3 por equipe de produto: compute, data, networking)
- Resource group de serviÃ§os compartilhados em cada assinatura (gerenciado pela equipe de plataforma)

O modelo de acesso atual esta quebrado: a maioria dos engenheiros tem Contributor em toda a assinatura Development, trÃªs lideres de equipe tem Owner em Production (acumulado ao longo do tempo sem revisao), e nÃ£o ha como conceder acesso elevado temporÃ¡rio para resposta a incidentes. No mes passado, um desenvolvedor junior acidentalmente excluiu um banco de dados de produÃ§Ã£o porque tinha acesso Contributor desnecessÃ¡rio concedido durante uma escalaÃ§Ã£o anterior que nunca foi revogada.

O CTO determinou um modelo de autorizaÃ§Ã£o zero-trust: privilegio mÃ­nimo por padrÃ£o, elevaÃ§Ã£o just-in-time quando necessÃ¡rio, e nenhum acesso permanente a produÃ§Ã£o para qualquer engenheiro. Sua tarefa Ã© projetar Ã© implementar parcialmente este modelo.

## Habilidades do exame cobertas

- Recomendar uma soluÃ§Ã£o para autorizar acesso a recursos Azure
- Recomendar uma soluÃ§Ã£o de gerenciamento de identidade
- Recomendar uma soluÃ§Ã£o para gerenciamento de conformidade

## Tarefas de design

### Parte 1: design da hierarquia de escopo RBAC

1. Projete a hierarquia de escopo RBAC para a Fabrikam:

```text
Management Group (Fabrikam Root)
  |-- Subscription: Development
  |     |-- RG: team-alpha-compute-dev
  |     |-- RG: team-alpha-data-dev
  |     |-- RG: shared-services-dev
  |-- Subscription: Staging
  |-- Subscription: Production
        |-- RG: team-alpha-compute-prod
        |-- RG: shared-services-prod
```

2. Determine em qual escopo cada atribuicao de funÃ§Ã£o deve ser feita:
   - Equipe de plataforma (gerenciamento completo de infraestrutura em todas as assinaturas)
   - Engenheiros de equipe de produto (leitura/escrita dentro dos resource groups de sua equipe apenas)
   - Engenheiros de plantao (acesso elevado temporÃ¡rio a produÃ§Ã£o durante incidentes)
   - Auditores de seguranÃ§a (acesso somente leitura em todas as assinaturas)
   - Analistas de custos (acesso somente leitura a dados de faturamento e custos apenas)

### Parte 2: design de funÃ§Ã£o personalizada

3. Projete uma funÃ§Ã£o RBAC personalizada para engenheiros de equipe de produto que permita:
   - Implantar Ã© gerenciar App Services, Functions e Container Apps
   - Ler e escrever nos bancos de dados Azure SQL de sua equipe
   - Visualizar (mas nÃ£o modificar) recursos de rede
   - NÃ£o pode excluir resource groups
   - NÃ£o pode modificar atribuicoes RBAC
   - NÃ£o pode acessar segredos do Key Vault (funÃ§Ã£o separada para isso)

4. Projete uma funÃ§Ã£o personalizada para "Incident Responder" que forneÃ§a:
   - Reiniciar qualquer recurso de computacao (VMs, App Services, AKS)
   - Visualizar todas as configuraÃ§Ãµes de recursos e logs
   - Escalar verticalmente/horizontalmente recursos de computacao
   - NÃ£o pode modificar dados ou excluir recursos
   - NÃ£o pode alterar configuraÃ§Ãµes de rede ou seguranÃ§a

### Parte 3: Attribute-Based access control (abac)

5. Projete condiÃ§Ãµes ABAC para acesso a storage accounts:
   - Engenheiros sÃ³ podem acessar blobs em containers marcados com o nome de sua equipe
   - Containers de dados de produÃ§Ã£o sÃ³ podem ser acessados por usuÃ¡rios com um atributo especÃ­fico (ex.: `department = "platform-engineering"`)
   - Todo acesso deve ser limitado a correspondencias especÃ­ficas de blob index tags

6. Implemente uma condiÃ§Ã£o ABAC usando Azure CLI que restrinja o acesso a blobs com base no nome do container ou blob index tags.

### Parte 4: design de acesso Just-in-Time

7. Projete o fluxo de trabalho de acesso just-in-time (JIT) para incidentes de produÃ§Ã£o:
   - Quem pode solicitar acesso elevado?
   - Quais funÃ§Ãµes estao disponÃ­veis para elevaÃ§Ã£o?
   - Quem aprova a solicitacao?
   - Duracao mÃ¡xima do acesso elevado?
   - Qual trilha de auditoria e gerada?

8. Integre PIM for Azure Resources com o design RBAC:
   - Atribuicoes elegiveis para a funÃ§Ã£o Contributor de produÃ§Ã£o
   - Requisitos de ativacao (MFA, justificativa, aprovacao)
   - Duracao mÃ¡xima ativa (4 horas para incidentes)
   - ConfiguraÃ§Ã£o de alertas quando qualquer funÃ§Ã£o de produÃ§Ã£o e ativada

### Parte 5: deny assignments e Resource locks

9. Projete deny assignments e resource locks para recursos crÃ­ticos:
   - Impedir qualquer usuÃ¡rio (incluindo Owners) de excluir o SQL Server de produÃ§Ã£o
   - Impedir modificacao de network security groups em produÃ§Ã£o
   - Permitir apenas a equipe de plataforma modificar resource locks

10. Implemente resource locks Ã© um deny assignment (ou documente por que deny assignments sÃ£o limitados a aplicaÃ§Ãµes gerenciadas).

### Parte 6: implementar prova de conceito

11. Crie uma definicao de funÃ§Ã£o RBAC personalizada para a funÃ§Ã£o "Product Team Engineer".

12. Crie uma atribuicao de funÃ§Ã£o no escopo de resource group para um usuÃ¡rio de teste.

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-06"
  items={[
    "RBAC scope hierarchy documented with apprÃ³priate assignment levels for each user category",
    "Custom role definitions created for Product Team Engineer and Incident Responder",
    "ABAC conditions designed for storage account access with team-based restrictions",
    "Just-in-time access workflow documented with PIM integration for production roles",
    "Resource lock strategy designed for critical production resources",
    "At least one custom role deployed and role assignment verified"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Melhores PrÃ¡ticas de Escopo RBAC</summary>

Atribua funÃ§Ãµes no escopo mais restrito que atenda ao requisito:
- **Management Group**: PolÃ­ticas em toda a organizaÃ§Ã£o (Security Reader para auditores)
- **Subscription**: Acesso em todo o ambiente (Platform team Contributor em Dev)
- **Resource Group**: Acesso com escopo de equipe (Engenheiros nos RGs de sua equipe)
- **Resource**: Acesso a recurso Ãºnico (raramente necessÃ¡rio, dificil de gerenciar em escala)

Principios-chave:
- FunÃ§Ãµes atribuidas em escopos pais sÃ£o herdadas por todos os filhos
- VocÃª nÃ£o pode substituir um Allow herdado com um Deny em um escopo inferior (a menos que use deny assignments)
- Use grupos para atribuicoes de funÃ§Ã£o, nunca usuÃ¡rios individuais
- Convencao de nomes para grupos: `rbac-{scope}-{role}` (ex.: `rbac-prod-reader`)

</details>

<details>
<summary>Dica 2: Criando FunÃ§Ãµes Personalizadas</summary>

```bash
# Create custom role definition JSON
cat << 'EOF' > product-team-engineer.json
{
  "Name": "Product Team Engineer",
  "IsCustom": true,
  "Description": "Deploy and manage application resources without infrastructure modification rights",
  "Actions": [
    "Microsoft.Web/sites/*",
    "Microsoft.Web/serverFarms/*",
    "Microsoft.App/containerApps/*",
    "Microsoft.App/managedEnvironments/read",
    "Microsoft.Sql/servers/databases/*",
    "Microsoft.Network/*/read",
    "Microsoft.Resources/subscriptions/resourceGroups/read",
    "Microsoft.Insights/alertRules/*",
    "Microsoft.Insights/metrics/read",
    "Microsoft.Insights/diagnosticSettings/*"
  ],
  "NotActions": [
    "Microsoft.Resources/subscriptions/resourceGroups/delete",
    "Microsoft.Authorization/roleAssignments/*",
    "Microsoft.Authorization/roleDefinitions/*",
    "Microsoft.KeyVault/vaults/secrets/*"
  ],
  "DataActions": [
    "Microsoft.Sql/servers/databases/data/*"
  ],
  "NotDataActions": [],
  "AssignableScopes": [
    "/subscriptions/{dev-subscription-id}",
    "/subscriptions/{staging-subscription-id}"
  ]
}
EOF

# Create the custom role
az role definition create --role-definition product-team-engineer.json

# Assign the role to a group at resource group scope
az role assignment create \
  --assignee-object-id $(az ad group show -g "team-alpha-engineers" --query id -o tsv) \
  --role "Product Team Engineer" \
  --scope "/subscriptions/{sub-id}/resourceGroups/team-alpha-compute-dev"
```

</details>

<details>
<summary>Dica 3: CondiÃ§Ãµes ABAC para Storage</summary>

O Azure ABAC (Attribute-Based Access Control) adiciona condiÃ§Ãµes a atribuicoes de funÃ§Ã£o. As condiÃ§Ãµes usam atributos `@Resource` e `@Principal`:

```bash
# Assign Storage Blob Data reader with ABAC condition
# Condition: user can only read blobs in containers matching their team tag
az role assignment create \
  --assignee-object-id "<user-or-group-id>" \
  --role "Storage Blob Data Reader" \
  --scope "/subscriptions/{sub}/resourceGroups/rg-data/providers/Microsoft.Storage/storageAccounts/stfabrikamdata" \
  --condition "((!(ActionMatches{'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read'})) OR (@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringEquals 'team-alpha-data'))" \
  --condition-version "2.0"
```

As condiÃ§Ãµes ABAC podem referenciar:
- Nome do container: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name]`
- Blob index tags: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers/blobs/tags:Project<$key_case_sensitive$>]`
- Atributos de ambiente (preview): `@Environment[isPrivateLink]`

As condiÃ§Ãµes suportam: `StringEquals`, `StringNotEquals`, `StringLike`, `StringStartsWith`, e operadores booleanos (`AND`, `OR`, `NOT`).

</details>

<details>
<summary>Dica 4: Resource Locks</summary>

Resource locks impedem exclusÃ£o ou modificacao acidental:

```bash
# Create a CanNotDelete lock on production SQL server
az lock create \
  --name "protect-prod-sql" \
  --resource-group rg-team-alpha-data-prod \
  --resource-name sql-fabrikam-prod \
  --resource-type Microsoft.Sql/servers \
  --lock-type CanNotDelete \
  --notes "Critical production database - requires platform team approval for removal"

# Create a ReadOnly lock on production NSG
az lock create \
  --name "protect-prod-nsg" \
  --resource-group rg-shared-networking-prod \
  --resource-name nsg-prod-default \
  --resource-type Microsoft.Network/networkSecurityGroups \
  --lock-type ReadOnly \
  --notes "Network security - change requires CAB approval"
```

Importante: PermissÃµes de gerenciamento de locks:
- Criar/excluir locks requer aÃ§Ãµes `Microsoft.Authorization/locks/*`
- Apenas Owner e User Access Administrator tem isso por padrÃ£o
- VocÃª pode criar uma funÃ§Ã£o personalizada que nega `Microsoft.Authorization/locks/delete` para impedir remocao de locks

Nota: Deny assignments nÃ£o podem ser criados diretamente por usuÃ¡rios. Eles sÃ£o criados apenas por Azure Blueprints e Azure Managed Applications para proteger recursos gerenciados.

</details>

<details>
<summary>Dica 5: PIM for Azure Resources</summary>

PIM for Azure Resources habilita acesso just-in-time em qualquer escopo RBAC:

1. **Torne funÃ§Ãµes elegiveis (nÃ£o ativas):**
   - Engenheiros de plantao recebem Contributor "elegivel" em resource groups de produÃ§Ã£o
   - Eles veem a funÃ§Ã£o no portal PIM mas nÃ£o podem usa-la atÃ© ativa-la

2. **Requisitos de ativacao:**
   - MFA obrigatÃ³rio
   - Texto de justificativa (vinculado ao ticket do incidente)
   - Aprovacao do lider da equipe de plataforma
   - Duracao mÃ¡xima: 4 horas

3. **Monitoramento:**
   - Alerta dispara quando qualquer funÃ§Ã£o de produÃ§Ã£o e ativada
   - Log de auditoria captura quem ativou, quando, justificativa e aprovador
   - O acesso expira automaticamente apos a duracao configurada

Configure no Portal: Entra ID > Privileged Identity Management > Azure Resources > Selecione subscription/RG > Roles > Settings

</details>

## Recursos de aprendizagem

- [Azure RBAC overview](https://learn.microsoft.com/en-us/azure/role-based-access-control/overview)
- [Custom roles for Azure resources](https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles)
- [Azure ABAC conditions](https://learn.microsoft.com/en-us/azure/role-based-access-control/conditions-overview)
- [Resource locks](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources)
- [PIM for Azure resources](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-resource-roles-assign-roles)
- [Deny assignments in Azure](https://learn.microsoft.com/en-us/azure/role-based-access-control/deny-assignments)
- [Best practices for Azure RBAC](https://learn.microsoft.com/en-us/azure/role-based-access-control/best-practices)

## VerificaÃ§Ã£o de conhecimento

<details>
<summary>1. Um desenvolvedor junior precisa implantar App Services no resource group de desenvolvimento de sua equipe, mas nÃ£o deve poder excluir o resource group ou modificar recursos de rede. A funÃ§Ã£o Contributor integrada e muito ampla. O que vocÃª deve recomendar?</summary>

**Crie uma funÃ§Ã£o RBAC personalizada** com escopo na assinatura de desenvolvimento que inclua `Microsoft.Web/sites/*` e `Microsoft.Web/serverFarms/*` em Actions, enquanto exclui explicitamente `Microsoft.Resources/subscriptions/resourceGroups/delete` e `Microsoft.Network/*/write` em NotActions. FunÃ§Ãµes personalizadas permitem criar acesso de privilegio mÃ­nimo que corresponde exatamente ao que o engenheiro precisa. Atribua esta funÃ§Ã£o no escopo de resource group (nÃ£o assinatura) para limitar o raio de impacto.

</details>

<details>
<summary>2. A Fabrikam quer impedir qualquer usuÃ¡rio, incluindo Owners de assinatura, de excluir o SQL Server de produÃ§Ã£o. Quais mecanismos conseguem isso?</summary>

**Use um resource lock CanNotDelete** no recurso SQL Server. Resource locks se aplicam a todos os usuÃ¡rios independentemente de sua funÃ§Ã£o RBAC (mesmo Owners nÃ£o podem excluir um recurso bloqueado sem primeiro remover o lock). Para impedir remocao nÃ£o autorizada do lock, restrinja a permissÃ£o `Microsoft.Authorization/locks/delete` apenas a equipe de plataforma, garantindo que outras funÃ§Ãµes nÃ£o incluam esta acao. Nota: Deny assignments sÃ£o criados apenas por Azure Blueprints e Managed Applications; nÃ£o podem ser criados manualmente por administradores.

</details>

<details>
<summary>3. Cinco equipes de produto precisam cada uma de acesso aos seus prÃ³prios containers de armazenamento, mas nÃ£o devem ver dados de outras equipes. Todos os containers estao na mesma storage account. Como vocÃª deve projetar o controle de acesso?</summary>

**Use condiÃ§Ãµes ABAC em atribuicoes de funÃ§Ã£o.** Atribua a funÃ§Ã£o "Storage Blob Data Contributor" a cada grupo de equipe no escopo da storage account, mas adicione uma condiÃ§Ã£o restringindo o acesso a containers nomeados com o prefixo de sua equipe (ex.: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringStartsWith 'team-alpha-'`). Isso evita criar cinco storage accounts separadas ou usar gerenciamento complexo de tokens SAS. Cada equipe ve apenas seus containers apesar de compartilhar a mesma conta.

</details>

<details>
<summary>4. Durante um incidente de produÃ§Ã£o, um engenheiro de plantao precisa de acesso Contributor a um resource group de produÃ§Ã£o por atÃ© 4 horas. Como isso deve ser projetado para manter o privilegio mÃ­nimo?</summary>

**Use PIM for Azure Resources com atribuicoes de funÃ§Ã£o elegiveis.** Configure a funÃ§Ã£o Contributor de produÃ§Ã£o como "elegivel" (nÃ£o permanentemente ativa) para engenheiros de plantao. Quando um incidente ocorre, o engenheiro ativa a funÃ§Ã£o atravÃ©s do PIM, fornecendo justificativa e nÃºmero do ticket do incidente. Defina a duracao mÃ¡xima de ativacao para 4 horas com expiracao automÃ¡tica. Exija MFA para ativacao Ã© opcionalmente exija aprovacao de um lider da equipe de plataforma. Isso fornece acesso just-in-time, com duracao limitada e auditado, sem privilegios permanentes.

</details>

## Limpeza

```bash
# Delete custom role definition
az role definition delete --name "Product Team Engineer"
az role definition delete --name "Incident Responder"

# Remove role assignments
az role assignment delete --assignee "<group-id>" --role "Product Team Engineer" --scope "/subscriptions/{sub-id}/resourceGroups/team-alpha-compute-dev"

# Remove resource locks
az lock delete --name "protect-prod-sql" --resource-group rg-team-alpha-data-prod --resource-name sql-fabrikam-prod --resource-type Microsoft.Sql/servers
az lock delete --name "protect-prod-nsg" --resource-group rg-shared-networking-prod --resource-name nsg-prod-default --resource-type Microsoft.Network/networkSecurityGroups

# Delete test resource groups if created
az group delete --name rg-rbac-poc --yes --no-wait
```

---

**PrÃ³ximo**: [Challenge 07: Design Authorization for On-Premises Resources](/docs/az-305/identity-governance-monitoring/challenge-07)
