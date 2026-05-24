---
sidebar_position: 17
title: "Desafio 17: Grupos de Gerenciamento & Assinaturas"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 17: grupos de gerenciamento & assinaturas

:::info Tempo Estimado e Custo

**60-75 minutos** | **Custo estimado**: Gratuito (operaÃ§Ãµes do plano de gerenciamento) | **Peso no Exame: 20-25%**


:::
## CenÃ¡rio

A Contoso Ltd. estÃ¡ crescendo rÃ¡pido. O que comeÃ§ou como uma Ãºnica assinatura do Azure se transformou em seis assinaturas distribuÃ­das em trÃªs departamentos (TI, FinanÃ§as e Engenharia). O CTO quer uma hierarquia de governanÃ§a que aplique polÃ­ticas de forma consistente em todas as assinaturas sem duplicar esforÃ§o. Seu trabalho Ã© projetar e implementar uma estrutura de grupos de gerenciamento que reflita o organograma da empresa e aplicar governanÃ§a nos nÃ­veis adequados.

## Habilidades do exame cobertas

| Habilidade | Peso |
|------------|------|
| Configurar grupos de gerenciamento | Alto |
| Gerenciar assinaturas e governanÃ§a | Alto |
| Mover assinaturas entre grupos de gerenciamento | MÃ©dio |
| Implementar bloqueios de recursos entre assinaturas | MÃ©dio |
| Aplicar RBAC no escopo do grupo de gerenciamento | Alto |

## ReferÃªncia sysadmin â†” Azure

| On-Prem / Sysadmin | Equivalente Azure | Notas |
|---------------------|-------------------|-------|
| OUs do Active Directory | Grupos de gerenciamento | ContÃªineres hierÃ¡rquicos de governanÃ§a |
| Group Policy vinculada Ã  OU | Azure Policy no escopo do MG | Herdada por todas as assinaturas filhas |
| Admin de domÃ­nio sobre Ã¡rvore de OUs | RBAC no escopo do MG | Cascateia para assinaturas e recursos |
| Mover computadores entre OUs | Mover assinaturas entre MGs | PolÃ­ticas de governanÃ§a mudam imediatamente |
| AdministraÃ§Ã£o delegada de OU | RBAC no nÃ­vel da assinatura | Acesso administrativo com escopo |
| DomÃ­nio raiz da floresta | Tenant Root Group | Topo da hierarquia, nÃ£o pode ser movido |

## Tarefas

### Tarefa 1: criar uma hierarquia de grupos de gerenciamento

Projete e crie a seguinte estrutura de grupos de gerenciamento:

```text
Tenant Root Group
â””â”€â”€ mg-contoso (Contoso Ltd.)
    â”œâ”€â”€ mg-production (Production)
    â”‚   â”œâ”€â”€ mg-prod-it (IT Production)
    â”‚   â””â”€â”€ mg-prod-finance (Finance Production)
    â””â”€â”€ mg-nonproduction (Non-Production)
        â”œâ”€â”€ mg-dev (Development)
        â””â”€â”€ mg-sandbox (Sandbox)
```

```bash
# Criar o grupo de gerenciamento de nÃ­vel superior
az account management-group create \
  --name "mg-contoso" \
  --display-name "Contoso Ltd."

# Criar hierarquia de produÃ§Ã£o
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

# Criar hierarquia de nÃ£o-produÃ§Ã£o
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

Navegue atÃ© **Portal do Azure** > **Grupos de gerenciamento**. Clique em **+ Criar** e especifique o grupo pai, ID e nome de exibiÃ§Ã£o para cada grupo.


:::
### Tarefa 2: mover uma assinatura para um grupo de gerenciamento

Mova sua assinatura atual para o grupo de gerenciamento `mg-dev`:

```bash
# Obter o ID da sua assinatura
SUB_ID=$(az account show --query id -o tsv)

# Mover assinatura para mg-dev
az account management-group subscription add \
  --name "mg-dev" \
  --subscription $SUB_ID

# Verificar a movimentaÃ§Ã£o
az account management-group show \
  --name "mg-dev" \
  --expand \
  --recurse
```

### Tarefa 3: atribuir Azure Policy no escopo do grupo de gerenciamento

Aplique a polÃ­tica integrada "Require a tag and its value on resources" no escopo `mg-production`:

```bash
# Obter o ID da definiÃ§Ã£o da polÃ­tica
POLICY_DEF=$(az policy definition list \
  --query "[?displayName=='Require a tag and its value on resources'].id" -o tsv)

# Atribuir a polÃ­tica no escopo do grupo de gerenciamento
az policy assignment create \
  --name "require-env-tag-prod" \
  --display-name "Require Environment Tag (Production)" \
  --policy "$POLICY_DEF" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-production" \
  --params '{"tagName": {"value": "Environment"}, "tagValue": {"value": "Production"}}'
```

### Tarefa 4: aplicar RBAC no nÃ­vel do grupo de gerenciamento

Conceda a um usuÃ¡rio a funÃ§Ã£o "Reader" no escopo do grupo de gerenciamento `mg-contoso` (cascateando para todas as assinaturas):

```bash
# Obter o object ID do usuÃ¡rio (substitua pelo seu usuÃ¡rio de teste)
USER_ID=$(az ad user show --id "alice@yourtenant.onmicrosoft.com" --query id -o tsv)

# Atribuir funÃ§Ã£o reader no escopo do grupo de gerenciamento
az role assignment create \
  --assignee "$USER_ID" \
  --role "Reader" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso"

# Verificar a atribuiÃ§Ã£o
az role assignment list \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso" \
  --query "[?principalId=='$USER_ID']" -o table
```

### Tarefa 5: mover uma assinatura entre grupos de gerenciamento

Simule uma reorganizaÃ§Ã£o departamental movendo a assinatura de `mg-dev` para `mg-sandbox`:

```bash
# Remover assinatura do MG atual
az account management-group subscription remove \
  --name "mg-dev" \
  --subscription $SUB_ID

# Adicionar assinatura ao novo MG
az account management-group subscription add \
  --name "mg-sandbox" \
  --subscription $SUB_ID

# Verificar nova localizaÃ§Ã£o
az account management-group show \
  --name "mg-sandbox" \
  --expand \
  --recurse
```

### Tarefa 6: consultar a hierarquia de grupos de gerenciamento

```bash
# Visualizar a hierarquia completa
az account management-group list --query "[].{Name:name, DisplayName:displayName}" -o table

# Mostrar Ã¡rvore hierÃ¡rquica
az account management-group show \
  --name "mg-contoso" \
  --expand \
  --recurse \
  --query "{Name:name, Children:children[].{Name:name, Children:children[].name}}"
```

## CritÃ©rios de sucesso

<SuccessChecklist
  storageKey="az104-challenge-17"
  items={[
    "A hierarquia de grupos de gerenciamento corresponde Ã  estrutura especÃ­ficada (5 grupos sob mg-contoso)",
    "Pelo menos uma assinatura estÃ¡ posicionada dentro de um grupo de gerenciamento",
    "Azure Policy estÃ¡ atribuÃ­da no escopo mg-production",
    "AtribuiÃ§Ã£o de funÃ§Ã£o RBAC existe no escopo mg-contoso",
    "A assinatura foi movida com sucesso entre grupos de gerenciamento",
    "VocÃª consegue consultar e exibir a hierarquia completa"
  ]}
/>
## Dicas

<details>
<summary>Dica 1: PermissÃµes de grupos de gerenciamento</summary>

VocÃª precisa de permissÃµes especÃ­ficas para criar grupos de gerenciamento. Por padrÃ£o, qualquer usuÃ¡rio no tenant pode criar grupos de gerenciamento. Isso pode ser restringido pela configuraÃ§Ã£o no nÃ­vel do tenant "Exigir permissÃµes para criar novos grupos de gerenciamento" no Portal do Azure em Grupos de gerenciamento > ConfiguraÃ§Ãµes.

</details>

<details>
<summary>Dica 2: HeranÃ§a de polÃ­ticas</summary>

PolÃ­ticas atribuÃ­das no escopo de um grupo de gerenciamento sÃ£o herdadas por todos os grupos de gerenciamento filhos e assinaturas. VocÃª nÃ£o pode substituir ou excluir um filho de uma polÃ­tica herdada | vocÃª sÃ³ pode adicionar isenÃ§Ãµes para recursos especÃ­ficos.

</details>

<details>
<summary>Dica 3: Profundidade mÃ¡xima da hierarquia</summary>

Grupos de gerenciamento suportam atÃ© 6 nÃ­veis de profundidade (sem contar o Tenant Root Group). Planeje sua hierarquia para ficar dentro deste limite.

</details>

<details>
<summary>Dica 4: Movendo assinaturas</summary>

Mover uma assinatura entre grupos de gerenciamento altera quais polÃ­ticas e atribuiÃ§Ãµes RBAC se aplicam. A mudanÃ§a entra em vigor imediatamente, mas pode levar atÃ© 30 minutos para ser totalmente refletida nas avaliaÃ§Ãµes de conformidade de polÃ­ticas.

</details>

## Quebra & conserta

### CenÃ¡rio a: conflito de polÃ­ticas

Atribua duas polÃ­ticas conflitantes em diferentes nÃ­veis: uma exigindo a tag "Environment=Production" em mg-production e outra exigindo "Environment=Development" em mg-dev. Tente implantar um recurso em uma assinatura sob mg-dev. O que acontece quando polÃ­ticas contraditÃ³rias existem em diferentes nÃ­veis?

### CenÃ¡rio b: assinatura Ã³rfÃ£

Remova sua assinatura de todos os grupos de gerenciamento personalizados. Onde ela aparece? (Resposta: Ela retorna ao Tenant Root Group.) Como vocÃª encontra assinaturas que nÃ£o estÃ£o em nenhum grupo de gerenciamento personalizado?

### CenÃ¡rio c: bloqueado

Atribua uma atribuiÃ§Ã£o RBAC de NegaÃ§Ã£o no escopo de um grupo de gerenciamento. O que acontece com os usuÃ¡rios que anteriormente tinham acesso atravÃ©s de atribuiÃ§Ãµes no nÃ­vel da assinatura? Como as atribuiÃ§Ãµes de negaÃ§Ã£o interagem com as atribuiÃ§Ãµes de permissÃ£o?

## VerificaÃ§Ã£o de conhecimento

<details>
<summary>1. Quantos nÃ­veis de profundidade os grupos de gerenciamento podem ter?</summary>

Grupos de gerenciamento suportam **6 nÃ­veis de profundidade** abaixo do Tenant Root Group. O Tenant Root Group em si Ã© o nÃ­vel 0, entÃ£o a hierarquia total pode ter 7 nÃ­veis (raiz + 6).

</details>

<details>
<summary>2. O que acontece com as polÃ­ticas quando vocÃª move uma assinatura entre grupos de gerenciamento?</summary>

Quando uma assinatura Ã© movida, ela **perde imediatamente** as polÃ­ticas do grupo de gerenciamento antigo e **herda** as polÃ­ticas da nova hierarquia de grupos de gerenciamento. Recursos existentes nÃ£o conformes nÃ£o sÃ£o remediados automaticamente, mas serÃ£o sinalizados na prÃ³xima avaliaÃ§Ã£o de conformidade.

</details>

<details>
<summary>3. VocÃª pode mover ou renomear o Tenant Root Group?</summary>

O **Tenant Root Group nÃ£o pode ser movido ou excluÃ­do**. Ele pode ser renomeado (apenas o nome de exibiÃ§Ã£o) por um usuÃ¡rio com a funÃ§Ã£o Owner ou User Access Administrator naquele escopo. Seu ID Ã© sempre o ID do tenant.

</details>

<details>
<summary>4. Quem pode criar grupos de gerenciamento por padrÃ£o?</summary>

Por padrÃ£o, **qualquer usuÃ¡rio** no tenant do Entra ID pode criar grupos de gerenciamento. Isso pode ser restringido para que apenas usuÃ¡rios com a funÃ§Ã£o Owner, Contributor ou Management Group Contributor no escopo pai possam criÃ¡-los. Essa configuraÃ§Ã£o Ã© feita no nÃ­vel do Tenant Root Group.

</details>

## Limpeza

```bash
# Remover assinatura do MG personalizado (retorna ao tenant root group)
SUB_ID=$(az account show --query id -o tsv)
az account management-group subscription remove \
  --name "mg-sandbox" \
  --subscription $SUB_ID 2>/dev/null

# Remover atribuiÃ§Ã£o de polÃ­tica
az policy assignment delete \
  --name "require-env-tag-prod" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-production" 2>/dev/null

# Remover atribuiÃ§Ã£o RBAC (substitua user_id)
# az role assignment delete --assignee "$user_id" --scope "/providers/Microsoft.Management/managementGroups/mg-contoso"

# Excluir grupos de gerenciamento (ordem de baixo para cima Ã© obrigatÃ³ria)
az account management-group delete --name "mg-sandbox" 2>/dev/null
az account management-group delete --name "mg-dev" 2>/dev/null
az account management-group delete --name "mg-nonproduction" 2>/dev/null
az account management-group delete --name "mg-prod-it" 2>/dev/null
az account management-group delete --name "mg-prod-finance" 2>/dev/null
az account management-group delete --name "mg-production" 2>/dev/null
az account management-group delete --name "mg-contoso" 2>/dev/null

echo "Limpeza concluÃ­da."
```

## Recursos de aprendizagem

- [Organizar recursos com grupos de gerenciamento](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)
- [Criar grupos de gerenciamento](https://learn.microsoft.com/en-us/azure/governance/management-groups/create-management-group-portal)
- [VisÃ£o geral do Azure Policy](https://learn.microsoft.com/en-us/azure/governance/policy/overview)
- [Organizar assinaturas em grupos de gerenciamento](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-setup-guide/organize-resources)
- [Mover assinaturas entre grupos de gerenciamento](https://learn.microsoft.com/en-us/azure/governance/management-groups/manage)
