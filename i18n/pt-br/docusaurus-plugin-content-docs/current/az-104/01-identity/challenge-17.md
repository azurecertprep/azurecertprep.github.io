---
sidebar_position: 17
title: "Desafio 17: Grupos de Gerenciamento & Assinaturas"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 17: Grupos de Gerenciamento & Assinaturas

:::info Tempo Estimado e Custo

**60-75 minutos** | **Custo estimado**: Gratuito (operações do plano de gerenciamento) | **Peso no Exame: 20-25%**


:::
## Cenário

A Contoso Ltd. está crescendo rápido. O que começou como uma única assinatura do Azure se transformou em seis assinaturas distribuídas em três departamentos (TI, Finanças e Engenharia). O CTO quer uma hierarquia de governança que aplique políticas de forma consistente em todas as assinaturas sem duplicar esforço. Seu trabalho é projetar e implementar uma estrutura de grupos de gerenciamento que reflita o organograma da empresa e aplicar governança nos níveis adequados.

## Habilidades do Exame Cobertas

| Habilidade | Peso |
|------------|------|
| Configurar grupos de gerenciamento | Alto |
| Gerenciar assinaturas e governança | Alto |
| Mover assinaturas entre grupos de gerenciamento | Médio |
| Implementar bloqueios de recursos entre assinaturas | Médio |
| Aplicar RBAC no escopo do grupo de gerenciamento | Alto |

## Referência Sysadmin ↔ Azure

| On-Prem / Sysadmin | Equivalente Azure | Notas |
|---------------------|-------------------|-------|
| OUs do Active Directory | Grupos de gerenciamento | Contêineres hierárquicos de governança |
| Group Policy vinculada à OU | Azure Policy no escopo do MG | Herdada por todas as assinaturas filhas |
| Admin de domínio sobre árvore de OUs | RBAC no escopo do MG | Cascateia para assinaturas e recursos |
| Mover computadores entre OUs | Mover assinaturas entre MGs | Políticas de governança mudam imediatamente |
| Administração delegada de OU | RBAC no nível da assinatura | Acesso administrativo com escopo |
| Domínio raiz da floresta | Tenant Root Group | Topo da hierarquia, não pode ser movido |

## Tarefas

### Tarefa 1: Criar uma Hierarquia de Grupos de Gerenciamento

Projete e crie a seguinte estrutura de grupos de gerenciamento:

```
Tenant Root Group
└── mg-contoso (Contoso Ltd.)
    ├── mg-production (Production)
    │   ├── mg-prod-it (IT Production)
    │   └── mg-prod-finance (Finance Production)
    └── mg-nonproduction (Non-Production)
        ├── mg-dev (Development)
        └── mg-sandbox (Sandbox)
```

```bash
# Criar o grupo de gerenciamento de nível superior
az account management-group create \
  --name "mg-contoso" \
  --display-name "Contoso Ltd."

# Criar hierarquia de produção
az account management-group create \
  --name "mg-production" \
  --display-name "Production" \
  --parent "mg-contoso"

az account management-group create \
  --name "mg-prod-it" \
  --display-name "IT Production" \
  --parent "mg-production"

az account management-group create \
  --name "mg-prod-finance" \
  --display-name "Finance Production" \
  --parent "mg-production"

# Criar hierarquia de não-produção
az account management-group create \
  --name "mg-nonproduction" \
  --display-name "Non-Production" \
  --parent "mg-contoso"

az account management-group create \
  --name "mg-dev" \
  --display-name "Development" \
  --parent "mg-nonproduction"

az account management-group create \
  --name "mg-sandbox" \
  --display-name "Sandbox" \
  --parent "mg-nonproduction"
```

:::tip Dica

Navegue até **Portal do Azure** > **Grupos de gerenciamento**. Clique em **+ Criar** e especifique o grupo pai, ID e nome de exibição para cada grupo.


:::
### Tarefa 2: Mover uma Assinatura para um Grupo de Gerenciamento

Mova sua assinatura atual para o grupo de gerenciamento `mg-dev`:

```bash
# Obter o ID da sua assinatura
SUB_ID=$(az account show --query id -o tsv)

# Mover assinatura para mg-dev
az account management-group subscription add \
  --name "mg-dev" \
  --subscription $SUB_ID

# Verificar a movimentação
az account management-group show \
  --name "mg-dev" \
  --expand \
  --recurse
```

### Tarefa 3: Atribuir Azure Policy no Escopo do Grupo de Gerenciamento

Aplique a política integrada "Require a tag and its value on resources" no escopo `mg-production`:

```bash
# Obter o ID da definição da política
POLICY_DEF=$(az policy definition list \
  --query "[?displayName=='Require a tag and its value on resources'].id" -o tsv)

# Atribuir a política no escopo do grupo de gerenciamento
az policy assignment create \
  --name "require-env-tag-prod" \
  --display-name "Require Environment Tag (Production)" \
  --policy "$POLICY_DEF" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-production" \
  --params '{"tagName": {"value": "Environment"}, "tagValue": {"value": "Production"}}'
```

### Tarefa 4: Aplicar RBAC no Nível do Grupo de Gerenciamento

Conceda a um usuário a função "Reader" no escopo do grupo de gerenciamento `mg-contoso` (cascateando para todas as assinaturas):

```bash
# Obter o object ID do usuário (substitua pelo seu usuário de teste)
USER_ID=$(az ad user show --id "alice@yourtenant.onmicrosoft.com" --query id -o tsv)

# Atribuir função Reader no escopo do grupo de gerenciamento
az role assignment create \
  --assignee "$USER_ID" \
  --role "Reader" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso"

# Verificar a atribuição
az role assignment list \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso" \
  --query "[?principalId=='$USER_ID']" -o table
```

### Tarefa 5: Mover uma Assinatura Entre Grupos de Gerenciamento

Simule uma reorganização departamental movendo a assinatura de `mg-dev` para `mg-sandbox`:

```bash
# Remover assinatura do MG atual
az account management-group subscription remove \
  --name "mg-dev" \
  --subscription $SUB_ID

# Adicionar assinatura ao novo MG
az account management-group subscription add \
  --name "mg-sandbox" \
  --subscription $SUB_ID

# Verificar nova localização
az account management-group show \
  --name "mg-sandbox" \
  --expand \
  --recurse
```

### Tarefa 6: Consultar a Hierarquia de Grupos de Gerenciamento

```bash
# Visualizar a hierarquia completa
az account management-group list --query "[].{Name:name, DisplayName:displayName}" -o table

# Mostrar árvore hierárquica
az account management-group show \
  --name "mg-contoso" \
  --expand \
  --recurse \
  --query "{Name:name, Children:children[].{Name:name, Children:children[].name}}"
```

## Critérios de Sucesso

<SuccessChecklist
  storageKey="az104-challenge-17"
  items={[
    "A hierarquia de grupos de gerenciamento corresponde à estrutura especificada (5 grupos sob mg-contoso)",
    "Pelo menos uma assinatura está posicionada dentro de um grupo de gerenciamento",
    "Azure Policy está atribuída no escopo mg-production",
    "Atribuição de função RBAC existe no escopo mg-contoso",
    "A assinatura foi movida com sucesso entre grupos de gerenciamento",
    "Você consegue consultar e exibir a hierarquia completa"
  ]}
/>
## Dicas

<details>
<summary>Dica 1: Permissões de grupos de gerenciamento</summary>

Você precisa de permissões específicas para criar grupos de gerenciamento. Por padrão, qualquer usuário no tenant pode criar grupos de gerenciamento. Isso pode ser restringido pela configuração no nível do tenant "Exigir permissões para criar novos grupos de gerenciamento" no Portal do Azure em Grupos de gerenciamento > Configurações.

</details>

<details>
<summary>Dica 2: Herança de políticas</summary>

Políticas atribuídas no escopo de um grupo de gerenciamento são herdadas por todos os grupos de gerenciamento filhos e assinaturas. Você não pode substituir ou excluir um filho de uma política herdada | você só pode adicionar isenções para recursos específicos.

</details>

<details>
<summary>Dica 3: Profundidade máxima da hierarquia</summary>

Grupos de gerenciamento suportam até 6 níveis de profundidade (sem contar o Tenant Root Group). Planeje sua hierarquia para ficar dentro deste limite.

</details>

<details>
<summary>Dica 4: Movendo assinaturas</summary>

Mover uma assinatura entre grupos de gerenciamento altera quais políticas e atribuições RBAC se aplicam. A mudança entra em vigor imediatamente, mas pode levar até 30 minutos para ser totalmente refletida nas avaliações de conformidade de políticas.

</details>

## Quebrar & Consertar

### Cenário A: Conflito de Políticas

Atribua duas políticas conflitantes em diferentes níveis: uma exigindo a tag "Environment=Production" em mg-production e outra exigindo "Environment=Development" em mg-dev. Tente implantar um recurso em uma assinatura sob mg-dev. O que acontece quando políticas contraditórias existem em diferentes níveis?

### Cenário B: Assinatura Órfã

Remova sua assinatura de todos os grupos de gerenciamento personalizados. Onde ela aparece? (Resposta: Ela retorna ao Tenant Root Group.) Como você encontra assinaturas que não estão em nenhum grupo de gerenciamento personalizado?

### Cenário C: Bloqueado

Atribua uma atribuição RBAC de Negação no escopo de um grupo de gerenciamento. O que acontece com os usuários que anteriormente tinham acesso através de atribuições no nível da assinatura? Como as atribuições de negação interagem com as atribuições de permissão?

## Verificação de Conhecimento

<details>
<summary>1. Quantos níveis de profundidade os grupos de gerenciamento podem ter?</summary>

Grupos de gerenciamento suportam **6 níveis de profundidade** abaixo do Tenant Root Group. O Tenant Root Group em si é o nível 0, então a hierarquia total pode ter 7 níveis (raiz + 6).

</details>

<details>
<summary>2. O que acontece com as políticas quando você move uma assinatura entre grupos de gerenciamento?</summary>

Quando uma assinatura é movida, ela **perde imediatamente** as políticas do grupo de gerenciamento antigo e **herda** as políticas da nova hierarquia de grupos de gerenciamento. Recursos existentes não conformes não são remediados automaticamente, mas serão sinalizados na próxima avaliação de conformidade.

</details>

<details>
<summary>3. Você pode mover ou renomear o Tenant Root Group?</summary>

O **Tenant Root Group não pode ser movido ou excluído**. Ele pode ser renomeado (apenas o nome de exibição) por um usuário com a função Owner ou User Access Administrator naquele escopo. Seu ID é sempre o ID do tenant.

</details>

<details>
<summary>4. Quem pode criar grupos de gerenciamento por padrão?</summary>

Por padrão, **qualquer usuário** no tenant do Entra ID pode criar grupos de gerenciamento. Isso pode ser restringido para que apenas usuários com a função Owner, Contributor ou Management Group Contributor no escopo pai possam criá-los. Essa configuração é feita no nível do Tenant Root Group.

</details>

## Limpeza

```bash
# Remover assinatura do MG personalizado (retorna ao Tenant Root Group)
SUB_ID=$(az account show --query id -o tsv)
az account management-group subscription remove \
  --name "mg-sandbox" \
  --subscription $SUB_ID 2>/dev/null

# Remover atribuição de política
az policy assignment delete \
  --name "require-env-tag-prod" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-production" 2>/dev/null

# Remover atribuição RBAC (substitua USER_ID)
# az role assignment delete --assignee "$USER_ID" --scope "/providers/Microsoft.Management/managementGroups/mg-contoso"

# Excluir grupos de gerenciamento (ordem de baixo para cima é obrigatória)
az account management-group delete --name "mg-sandbox" 2>/dev/null
az account management-group delete --name "mg-dev" 2>/dev/null
az account management-group delete --name "mg-nonproduction" 2>/dev/null
az account management-group delete --name "mg-prod-it" 2>/dev/null
az account management-group delete --name "mg-prod-finance" 2>/dev/null
az account management-group delete --name "mg-production" 2>/dev/null
az account management-group delete --name "mg-contoso" 2>/dev/null

echo "Limpeza concluída."
```

## Recursos de Aprendizagem

- [Organizar recursos com grupos de gerenciamento](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)
- [Criar grupos de gerenciamento](https://learn.microsoft.com/en-us/azure/governance/management-groups/create-management-group-portal)
- [Visão geral do Azure Policy](https://learn.microsoft.com/en-us/azure/governance/policy/overview)
- [Organizar assinaturas em grupos de gerenciamento](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-setup-guide/organize-resources)
- [Mover assinaturas entre grupos de gerenciamento](https://learn.microsoft.com/en-us/azure/governance/management-groups/manage)
