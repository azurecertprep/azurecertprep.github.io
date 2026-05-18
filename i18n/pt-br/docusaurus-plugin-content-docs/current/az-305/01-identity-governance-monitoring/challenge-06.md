---
sidebar_position: 6
title: "Challenge 06: Design Authorization for Azure Resources"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 06: Design Authorization for Azure Resources

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $0-5 | **Peso no Exame: 25-30%**

:::

## Introducao

A Fabrikam Inc. e uma empresa de software com 200 engenheiros organizados em 5 equipes de produto. Eles operam um ambiente Azure maduro com a seguinte estrutura:
- 3 assinaturas: Development, Staging, Production
- 15 resource groups por assinatura (3 por equipe de produto: compute, data, networking)
- Resource group de servicos compartilhados em cada assinatura (gerenciado pela equipe de plataforma)

O modelo de acesso atual esta quebrado: a maioria dos engenheiros tem Contributor em toda a assinatura Development, tres lideres de equipe tem Owner em Production (acumulado ao longo do tempo sem revisao), e nao ha como conceder acesso elevado temporario para resposta a incidentes. No mes passado, um desenvolvedor junior acidentalmente excluiu um banco de dados de producao porque tinha acesso Contributor desnecessario concedido durante uma escalacao anterior que nunca foi revogada.

O CTO determinou um modelo de autorizacao zero-trust: privilegio minimo por padrao, elevacao just-in-time quando necessario, e nenhum acesso permanente a producao para qualquer engenheiro. Sua tarefa e projetar e implementar parcialmente este modelo.

## Habilidades do Exame Cobertas

- Recomendar uma solucao para autorizar acesso a recursos Azure
- Recomendar uma solucao de gerenciamento de identidade
- Recomendar uma solucao para gerenciamento de conformidade

## Tarefas de Design

### Parte 1: Design da Hierarquia de Escopo RBAC

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

2. Determine em qual escopo cada atribuicao de funcao deve ser feita:
   - Equipe de plataforma (gerenciamento completo de infraestrutura em todas as assinaturas)
   - Engenheiros de equipe de produto (leitura/escrita dentro dos resource groups de sua equipe apenas)
   - Engenheiros de plantao (acesso elevado temporario a producao durante incidentes)
   - Auditores de seguranca (acesso somente leitura em todas as assinaturas)
   - Analistas de custos (acesso somente leitura a dados de faturamento e custos apenas)

### Parte 2: Design de Funcao Personalizada

3. Projete uma funcao RBAC personalizada para engenheiros de equipe de produto que permita:
   - Implantar e gerenciar App Services, Functions e Container Apps
   - Ler e escrever nos bancos de dados Azure SQL de sua equipe
   - Visualizar (mas nao modificar) recursos de rede
   - Nao pode excluir resource groups
   - Nao pode modificar atribuicoes RBAC
   - Nao pode acessar segredos do Key Vault (funcao separada para isso)

4. Projete uma funcao personalizada para "Incident Responder" que forneca:
   - Reiniciar qualquer recurso de computacao (VMs, App Services, AKS)
   - Visualizar todas as configuracoes de recursos e logs
   - Escalar verticalmente/horizontalmente recursos de computacao
   - Nao pode modificar dados ou excluir recursos
   - Nao pode alterar configuracoes de rede ou seguranca

### Parte 3: Attribute-Based Access Control (ABAC)

5. Projete condicoes ABAC para acesso a storage accounts:
   - Engenheiros so podem acessar blobs em containers marcados com o nome de sua equipe
   - Containers de dados de producao so podem ser acessados por usuarios com um atributo especifico (ex.: `department = "platform-engineering"`)
   - Todo acesso deve ser limitado a correspondencias especificas de blob index tags

6. Implemente uma condicao ABAC usando Azure CLI que restrinja o acesso a blobs com base no nome do container ou blob index tags.

### Parte 4: Design de Acesso Just-in-Time

7. Projete o fluxo de trabalho de acesso just-in-time (JIT) para incidentes de producao:
   - Quem pode solicitar acesso elevado?
   - Quais funcoes estao disponiveis para elevacao?
   - Quem aprova a solicitacao?
   - Duracao maxima do acesso elevado?
   - Qual trilha de auditoria e gerada?

8. Integre PIM for Azure Resources com o design RBAC:
   - Atribuicoes elegiveis para a funcao Contributor de producao
   - Requisitos de ativacao (MFA, justificativa, aprovacao)
   - Duracao maxima ativa (4 horas para incidentes)
   - Configuracao de alertas quando qualquer funcao de producao e ativada

### Parte 5: Deny Assignments e Resource Locks

9. Projete deny assignments e resource locks para recursos criticos:
   - Impedir qualquer usuario (incluindo Owners) de excluir o SQL Server de producao
   - Impedir modificacao de network security groups em producao
   - Permitir apenas a equipe de plataforma modificar resource locks

10. Implemente resource locks e um deny assignment (ou documente por que deny assignments sao limitados a aplicacoes gerenciadas).

### Parte 6: Implementar Prova de Conceito

11. Crie uma definicao de funcao RBAC personalizada para a funcao "Product Team Engineer".

12. Crie uma atribuicao de funcao no escopo de resource group para um usuario de teste.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-06"
  items={[
    "RBAC scope hierarchy documented with appropriate assignment levels for each user category",
    "Custom role definitions created for Product Team Engineer and Incident Responder",
    "ABAC conditions designed for storage account access with team-based restrictions",
    "Just-in-time access workflow documented with PIM integration for production roles",
    "Resource lock strategy designed for critical production resources",
    "At least one custom role deployed and role assignment verified"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Melhores Praticas de Escopo RBAC</summary>

Atribua funcoes no escopo mais restrito que atenda ao requisito:
- **Management Group**: Politicas em toda a organizacao (Security Reader para auditores)
- **Subscription**: Acesso em todo o ambiente (Platform team Contributor em Dev)
- **Resource Group**: Acesso com escopo de equipe (Engenheiros nos RGs de sua equipe)
- **Resource**: Acesso a recurso unico (raramente necessario, dificil de gerenciar em escala)

Principios-chave:
- Funcoes atribuidas em escopos pais sao herdadas por todos os filhos
- Voce nao pode substituir um Allow herdado com um Deny em um escopo inferior (a menos que use deny assignments)
- Use grupos para atribuicoes de funcao, nunca usuarios individuais
- Convencao de nomes para grupos: `rbac-{scope}-{role}` (ex.: `rbac-prod-reader`)

</details>

<details>
<summary>Dica 2: Criando Funcoes Personalizadas</summary>

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
<summary>Dica 3: Condicoes ABAC para Storage</summary>

O Azure ABAC (Attribute-Based Access Control) adiciona condicoes a atribuicoes de funcao. As condicoes usam atributos `@Resource` e `@Principal`:

```bash
# Assign Storage Blob Data Reader with ABAC condition
# Condition: User can only read blobs in containers matching their team tag
az role assignment create \
  --assignee-object-id "<user-or-group-id>" \
  --role "Storage Blob Data Reader" \
  --scope "/subscriptions/{sub}/resourceGroups/rg-data/providers/Microsoft.Storage/storageAccounts/stfabrikamdata" \
  --condition "((!(ActionMatches{'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read'})) OR (@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringEquals 'team-alpha-data'))" \
  --condition-version "2.0"
```

As condicoes ABAC podem referenciar:
- Nome do container: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name]`
- Blob index tags: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers/blobs/tags:Project<$key_case_sensitive$>]`
- Atributos de ambiente (preview): `@Environment[isPrivateLink]`

As condicoes suportam: `StringEquals`, `StringNotEquals`, `StringLike`, `StringStartsWith`, e operadores booleanos (`AND`, `OR`, `NOT`).

</details>

<details>
<summary>Dica 4: Resource Locks</summary>

Resource locks impedem exclusao ou modificacao acidental:

```bash
# Create a CanNotDelete lock on production SQL Server
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

Importante: Permissoes de gerenciamento de locks:
- Criar/excluir locks requer acoes `Microsoft.Authorization/locks/*`
- Apenas Owner e User Access Administrator tem isso por padrao
- Voce pode criar uma funcao personalizada que nega `Microsoft.Authorization/locks/delete` para impedir remocao de locks

Nota: Deny assignments nao podem ser criados diretamente por usuarios. Eles sao criados apenas por Azure Blueprints e Azure Managed Applications para proteger recursos gerenciados.

</details>

<details>
<summary>Dica 5: PIM for Azure Resources</summary>

PIM for Azure Resources habilita acesso just-in-time em qualquer escopo RBAC:

1. **Torne funcoes elegiveis (nao ativas):**
   - Engenheiros de plantao recebem Contributor "elegivel" em resource groups de producao
   - Eles veem a funcao no portal PIM mas nao podem usa-la ate ativa-la

2. **Requisitos de ativacao:**
   - MFA obrigatorio
   - Texto de justificativa (vinculado ao ticket do incidente)
   - Aprovacao do lider da equipe de plataforma
   - Duracao maxima: 4 horas

3. **Monitoramento:**
   - Alerta dispara quando qualquer funcao de producao e ativada
   - Log de auditoria captura quem ativou, quando, justificativa e aprovador
   - O acesso expira automaticamente apos a duracao configurada

Configure no Portal: Entra ID > Privileged Identity Management > Azure Resources > Selecione subscription/RG > Roles > Settings

</details>

## Recursos de Aprendizagem

- [Azure RBAC overview](https://learn.microsoft.com/en-us/azure/role-based-access-control/overview)
- [Custom roles for Azure resources](https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles)
- [Azure ABAC conditions](https://learn.microsoft.com/en-us/azure/role-based-access-control/conditions-overview)
- [Resource locks](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources)
- [PIM for Azure resources](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-resource-roles-assign-roles)
- [Deny assignments in Azure](https://learn.microsoft.com/en-us/azure/role-based-access-control/deny-assignments)
- [Best practices for Azure RBAC](https://learn.microsoft.com/en-us/azure/role-based-access-control/best-practices)

## Verificacao de Conhecimento

<details>
<summary>1. Um desenvolvedor junior precisa implantar App Services no resource group de desenvolvimento de sua equipe, mas nao deve poder excluir o resource group ou modificar recursos de rede. A funcao Contributor integrada e muito ampla. O que voce deve recomendar?</summary>

**Crie uma funcao RBAC personalizada** com escopo na assinatura de desenvolvimento que inclua `Microsoft.Web/sites/*` e `Microsoft.Web/serverFarms/*` em Actions, enquanto exclui explicitamente `Microsoft.Resources/subscriptions/resourceGroups/delete` e `Microsoft.Network/*/write` em NotActions. Funcoes personalizadas permitem criar acesso de privilegio minimo que corresponde exatamente ao que o engenheiro precisa. Atribua esta funcao no escopo de resource group (nao assinatura) para limitar o raio de impacto.

</details>

<details>
<summary>2. A Fabrikam quer impedir qualquer usuario, incluindo Owners de assinatura, de excluir o SQL Server de producao. Quais mecanismos conseguem isso?</summary>

**Use um resource lock CanNotDelete** no recurso SQL Server. Resource locks se aplicam a todos os usuarios independentemente de sua funcao RBAC (mesmo Owners nao podem excluir um recurso bloqueado sem primeiro remover o lock). Para impedir remocao nao autorizada do lock, restrinja a permissao `Microsoft.Authorization/locks/delete` apenas a equipe de plataforma, garantindo que outras funcoes nao incluam esta acao. Nota: Deny assignments sao criados apenas por Azure Blueprints e Managed Applications; nao podem ser criados manualmente por administradores.

</details>

<details>
<summary>3. Cinco equipes de produto precisam cada uma de acesso aos seus proprios containers de armazenamento, mas nao devem ver dados de outras equipes. Todos os containers estao na mesma storage account. Como voce deve projetar o controle de acesso?</summary>

**Use condicoes ABAC em atribuicoes de funcao.** Atribua a funcao "Storage Blob Data Contributor" a cada grupo de equipe no escopo da storage account, mas adicione uma condicao restringindo o acesso a containers nomeados com o prefixo de sua equipe (ex.: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringStartsWith 'team-alpha-'`). Isso evita criar cinco storage accounts separadas ou usar gerenciamento complexo de tokens SAS. Cada equipe ve apenas seus containers apesar de compartilhar a mesma conta.

</details>

<details>
<summary>4. Durante um incidente de producao, um engenheiro de plantao precisa de acesso Contributor a um resource group de producao por ate 4 horas. Como isso deve ser projetado para manter o privilegio minimo?</summary>

**Use PIM for Azure Resources com atribuicoes de funcao elegiveis.** Configure a funcao Contributor de producao como "elegivel" (nao permanentemente ativa) para engenheiros de plantao. Quando um incidente ocorre, o engenheiro ativa a funcao atraves do PIM, fornecendo justificativa e numero do ticket do incidente. Defina a duracao maxima de ativacao para 4 horas com expiracao automatica. Exija MFA para ativacao e opcionalmente exija aprovacao de um lider da equipe de plataforma. Isso fornece acesso just-in-time, com duracao limitada e auditado, sem privilegios permanentes.

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

**Proximo**: [Challenge 07: Design Authorization for On-Premises Resources](/docs/az-305/identity-governance-monitoring/challenge-07)
