---
sidebar_position: 6
title: "Desafio 06: Projetar Autorização para Recursos Azure"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 06: projetar autorização para recursos Azure

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $0-5 | **Peso no Exame: 25-30%**

:::

## Introdução

A Fabrikam Inc. é uma empresa de software com 200 engenheiros organizados em 5 equipes de produto. Eles operam um ambiente Azure maduro com a seguinte estrutura:
- 3 assinaturas: Development, Staging, Production
- 15 resource groups por assinatura (3 por equipe de produto: compute, data, networking)
- Resource group de serviços compartilhados em cada assinatura (gerenciado pela equipe de plataforma)

O modelo de acesso atual esta quebrado: a maioria dos engenheiros tem Contributor em toda a assinatura Development, três lideres de equipe tem Owner em Production (acumulado ao longo do tempo sem revisao), e não ha como conceder acesso elevado temporário para resposta a incidentes. No mes passado, um desenvolvedor junior acidentalmente excluiu um banco de dados de produção porque tinha acesso Contributor desnecessário concedido durante uma escalação anterior que nunca foi revogada.

O CTO determinou um modelo de autorização zero-trust: privilegio mínimo por padrão, elevação just-in-time quando necessário, e nenhum acesso permanente a produção para qualquer engenheiro. Sua tarefa é projetar é implementar parcialmente este modelo.

## Habilidades do exame cobertas

- Recomendar uma solução para autorizar acesso a recursos Azure
- Recomendar uma solução de gerenciamento de identidade
- Recomendar uma solução para gerenciamento de conformidade

## Tarefas de design

### Parte 1: design da hierarquia de escopo RBAC

1. Projete a hierarquia de escopo RBAC para a Fabrikam:

```
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

2. Determine em qual escopo cada atribuicao de função deve ser feita:
   - Equipe de plataforma (gerenciamento completo de infraestrutura em todas as assinaturas)
   - Engenheiros de equipe de produto (leitura/escrita dentro dos resource groups de sua equipe apenas)
   - Engenheiros de plantao (acesso elevado temporário a produção durante incidentes)
   - Auditores de segurança (acesso somente leitura em todas as assinaturas)
   - Analistas de custos (acesso somente leitura a dados de faturamento e custos apenas)

### Parte 2: design de função personalizada

3. Projete uma função RBAC personalizada para engenheiros de equipe de produto que permita:
   - Implantar é gerenciar App Services, Functions e Container Apps
   - Ler e escrever nos bancos de dados Azure SQL de sua equipe
   - Visualizar (mas não modificar) recursos de rede
   - Não pode excluir resource groups
   - Não pode modificar atribuicoes RBAC
   - Não pode acessar segredos do Key Vault (função separada para isso)

4. Projete uma função personalizada para "Incident Responder" que forneça:
   - Reiniciar qualquer recurso de computacao (VMs, App Services, AKS)
   - Visualizar todas as configurações de recursos e logs
   - Escalar verticalmente/horizontalmente recursos de computacao
   - Não pode modificar dados ou excluir recursos
   - Não pode alterar configurações de rede ou segurança

### Parte 3: Attribute-Based access control (abac)

5. Projete condições ABAC para acesso a storage accounts:
   - Engenheiros só podem acessar blobs em containers marcados com o nome de sua equipe
   - Containers de dados de produção só podem ser acessados por usuários com um atributo específico (ex.: `department = "platform-engineering"`)
   - Todo acesso deve ser limitado a correspondencias específicas de blob index tags

6. Implemente uma condição ABAC usando Azure CLI que restrinja o acesso a blobs com base no nome do container ou blob index tags.

### Parte 4: design de acesso Just-in-Time

7. Projete o fluxo de trabalho de acesso just-in-time (JIT) para incidentes de produção:
   - Quem pode solicitar acesso elevado?
   - Quais funções estao disponíveis para elevação?
   - Quem aprova a solicitacao?
   - Duracao máxima do acesso elevado?
   - Qual trilha de auditoria e gerada?

8. Integre PIM for Azure Resources com o design RBAC:
   - Atribuicoes elegiveis para a função Contributor de produção
   - Requisitos de ativacao (MFA, justificativa, aprovacao)
   - Duracao máxima ativa (4 horas para incidentes)
   - Configuração de alertas quando qualquer função de produção e ativada

### Parte 5: deny assignments e Resource locks

9. Projete deny assignments e resource locks para recursos críticos:
   - Impedir qualquer usuário (incluindo Owners) de excluir o SQL Server de produção
   - Impedir modificacao de network security groups em produção
   - Permitir apenas a equipe de plataforma modificar resource locks

10. Implemente resource locks é um deny assignment (ou documente por que deny assignments são limitados a aplicações gerenciadas).

### Parte 6: implementar prova de conceito

11. Crie uma definicao de função RBAC personalizada para a função "Product Team Engineer".

12. Crie uma atribuicao de função no escopo de resource group para um usuário de teste.

## Criterios de sucesso

<SuccessChecklist
  storageKey="az305-challenge-06"
  items={[
    "RBAC scope hierarchy documented with apprópriate assignment levels for each user category",
    "Custom role definitions created for Product Team Engineer and Incident Responder",
    "ABAC conditions designed for storage account access with team-based restrictions",
    "Just-in-time access workflow documented with PIM integration for production roles",
    "Resource lock strategy designed for critical production resources",
    "At least one custom role deployed and role assignment verified"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Melhores Práticas de Escopo RBAC</summary>

Atribua funções no escopo mais restrito que atenda ao requisito:
- **Management Group**: Políticas em toda a organização (Security Reader para auditores)
- **Subscription**: Acesso em todo o ambiente (Platform team Contributor em Dev)
- **Resource Group**: Acesso com escopo de equipe (Engenheiros nos RGs de sua equipe)
- **Resource**: Acesso a recurso único (raramente necessário, dificil de gerenciar em escala)

Principios-chave:
- Funções atribuidas em escopos pais são herdadas por todos os filhos
- Você não pode substituir um Allow herdado com um Deny em um escopo inferior (a menos que use deny assignments)
- Use grupos para atribuicoes de função, nunca usuários individuais
- Convencao de nomes para grupos: `rbac-{scope}-{role}` (ex.: `rbac-prod-reader`)

</details>

<details>
<summary>Dica 2: Criando Funções Personalizadas</summary>

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
<summary>Dica 3: Condições ABAC para Storage</summary>

O Azure ABAC (Attribute-Based Access Control) adiciona condições a atribuicoes de função. As condições usam atributos `@Resource` e `@Principal`:

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

As condições ABAC podem referenciar:
- Nome do container: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name]`
- Blob index tags: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers/blobs/tags:Project<$key_case_sensitive$>]`
- Atributos de ambiente (preview): `@Environment[isPrivateLink]`

As condições suportam: `StringEquals`, `StringNotEquals`, `StringLike`, `StringStartsWith`, e operadores booleanos (`AND`, `OR`, `NOT`).

</details>

<details>
<summary>Dica 4: Resource Locks</summary>

Resource locks impedem exclusão ou modificacao acidental:

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

Importante: Permissões de gerenciamento de locks:
- Criar/excluir locks requer ações `Microsoft.Authorization/locks/*`
- Apenas Owner e User Access Administrator tem isso por padrão
- Você pode criar uma função personalizada que nega `Microsoft.Authorization/locks/delete` para impedir remocao de locks

Nota: Deny assignments não podem ser criados diretamente por usuários. Eles são criados apenas por Azure Blueprints e Azure Managed Applications para proteger recursos gerenciados.

</details>

<details>
<summary>Dica 5: PIM for Azure Resources</summary>

PIM for Azure Resources habilita acesso just-in-time em qualquer escopo RBAC:

1. **Torne funções elegiveis (não ativas):**
   - Engenheiros de plantao recebem Contributor "elegivel" em resource groups de produção
   - Eles veem a função no portal PIM mas não podem usa-la até ativa-la

2. **Requisitos de ativacao:**
   - MFA obrigatório
   - Texto de justificativa (vinculado ao ticket do incidente)
   - Aprovacao do lider da equipe de plataforma
   - Duracao máxima: 4 horas

3. **Monitoramento:**
   - Alerta dispara quando qualquer função de produção e ativada
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

## Verificação de conhecimento

<details>
<summary>1. Um desenvolvedor junior precisa implantar App Services no resource group de desenvolvimento de sua equipe, mas não deve poder excluir o resource group ou modificar recursos de rede. A função Contributor integrada e muito ampla. O que você deve recomendar?</summary>

**Crie uma função RBAC personalizada** com escopo na assinatura de desenvolvimento que inclua `Microsoft.Web/sites/*` e `Microsoft.Web/serverFarms/*` em Actions, enquanto exclui explicitamente `Microsoft.Resources/subscriptions/resourceGroups/delete` e `Microsoft.Network/*/write` em NotActions. Funções personalizadas permitem criar acesso de privilegio mínimo que corresponde exatamente ao que o engenheiro precisa. Atribua esta função no escopo de resource group (não assinatura) para limitar o raio de impacto.

</details>

<details>
<summary>2. A Fabrikam quer impedir qualquer usuário, incluindo Owners de assinatura, de excluir o SQL Server de produção. Quais mecanismos conseguem isso?</summary>

**Use um resource lock CanNotDelete** no recurso SQL Server. Resource locks se aplicam a todos os usuários independentemente de sua função RBAC (mesmo Owners não podem excluir um recurso bloqueado sem primeiro remover o lock). Para impedir remocao não autorizada do lock, restrinja a permissão `Microsoft.Authorization/locks/delete` apenas a equipe de plataforma, garantindo que outras funções não incluam esta acao. Nota: Deny assignments são criados apenas por Azure Blueprints e Managed Applications; não podem ser criados manualmente por administradores.

</details>

<details>
<summary>3. Cinco equipes de produto precisam cada uma de acesso aos seus próprios containers de armazenamento, mas não devem ver dados de outras equipes. Todos os containers estao na mesma storage account. Como você deve projetar o controle de acesso?</summary>

**Use condições ABAC em atribuicoes de função.** Atribua a função "Storage Blob Data Contributor" a cada grupo de equipe no escopo da storage account, mas adicione uma condição restringindo o acesso a containers nomeados com o prefixo de sua equipe (ex.: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringStartsWith 'team-alpha-'`). Isso evita criar cinco storage accounts separadas ou usar gerenciamento complexo de tokens SAS. Cada equipe ve apenas seus containers apesar de compartilhar a mesma conta.

</details>

<details>
<summary>4. Durante um incidente de produção, um engenheiro de plantao precisa de acesso Contributor a um resource group de produção por até 4 horas. Como isso deve ser projetado para manter o privilegio mínimo?</summary>

**Use PIM for Azure Resources com atribuicoes de função elegiveis.** Configure a função Contributor de produção como "elegivel" (não permanentemente ativa) para engenheiros de plantao. Quando um incidente ocorre, o engenheiro ativa a função através do PIM, fornecendo justificativa e número do ticket do incidente. Defina a duracao máxima de ativacao para 4 horas com expiracao automática. Exija MFA para ativacao é opcionalmente exija aprovacao de um lider da equipe de plataforma. Isso fornece acesso just-in-time, com duracao limitada e auditado, sem privilegios permanentes.

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

**Próximo**: [Challenge 07: Design Authorization for On-Premises Resources](/docs/az-305/identity-governance-monitoring/challenge-07)
