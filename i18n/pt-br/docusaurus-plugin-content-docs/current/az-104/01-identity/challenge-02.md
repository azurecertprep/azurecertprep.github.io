---
sidebar_position: 2
title: "Desafio 02: RBAC & Gerenciamento de Acesso"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 02: RBAC & gerenciamento de acesso

:::info Tempo e Custo Estimados

**45-60 min** | **Custo estimado**: Gratuito | **Peso no Exame: 20-25%
**

:::

## IntroduÃ§Ã£o

Agora que a Contoso Ltd. tem usuÃ¡rios e grupos no Entra ID, vocÃª precisa controlar **quem pode fazer o quÃª** no Azure. O VP de Engenharia acabou de perguntar: "Por que o estagiÃ¡rio consegue ver nossa assinatura de produÃ§Ã£o?" Hora de trancar tudo com Role-Based Access Control.

RBAC Ã© o guardiÃ£o do Azure. Cada aÃ§Ã£o | criar uma VM, ler uma conta de armazenamento, excluir um grupo de recursos | Ã© controlada por funÃ§Ãµes atribuÃ­das a identidades em escopos especÃ­ficos. Se errar nisso, vocÃª vai bloquear sua equipe ou expor seu ambiente.

## Habilidades do exame cobertas

- Gerenciar funÃ§Ãµes internas do Azure
- Atribuir funÃ§Ãµes em diferentes escopos (grupo de gerenciamento, assinatura, grupo de recursos, recurso)
- Interpretar atribuiÃ§Ãµes de acesso
- Criar e atribuir funÃ§Ãµes personalizadas
- Gerenciar atribuiÃ§Ãµes de funÃ§Ãµes do Microsoft Entra

## ReferÃªncia sysadmin â†” Azure

| On-Prem / Sysadmin | Equivalente no Azure | ObservaÃ§Ãµes |
|---------------------|----------------------|-------------|
| PermissÃµes NTFS (Controle Total) | FunÃ§Ã£o Owner | Acesso total + pode atribuir funÃ§Ãµes |
| PermissÃµes NTFS (Modificar) | FunÃ§Ã£o Contributor | Acesso total mas nÃ£o pode atribuir funÃ§Ãµes |
| PermissÃµes NTFS (Leitura) | FunÃ§Ã£o Reader | Visualizar tudo, alterar nada |
| Grupo Domain Admins | Owner no escopo da assinatura | Acesso administrativo amplo |
| PermissÃµes delegadas em pastas | RBAC no escopo do grupo de recursos | Controle de acesso com escopo definido |
| icacls / cacls | az role assignment | Gerenciamento de permissÃµes via CLI |
| "Deny" ACE no NTFS | Deny assignments | NegaÃ§Ã£o explÃ­cita (raro, geralmente via Blueprints) |
| DelegaÃ§Ã£o personalizada no AD | FunÃ§Ãµes RBAC personalizadas | DefiniÃ§Ãµes granulares de permissÃ£o |

## DescriÃ§Ã£o

### Parte 1: explorar funÃ§Ãµes internas

1. Listar as 4 funÃ§Ãµes internas fundamentais e entender o que cada uma permite:
   - **Owner** | Acesso total a todos os recursos + pode atribuir funÃ§Ãµes a outros
   - **Contributor** | Acesso total a todos os recursos mas nÃ£o pode atribuir funÃ§Ãµes
   - **Reader** | Visualizar todos os recursos mas nÃ£o pode fazer alteraÃ§Ãµes
   - **User Access Administrator** | Gerenciar acesso de usuÃ¡rios aos recursos do Azure

2. Explorar funÃ§Ãµes internas adicionais relevantes para o exame:
   - Virtual Machine Contributor
   - Storage Blob Data Reader
   - Network Contributor

### Parte 2: atribuir funÃ§Ãµes em diferentes escopos

:::warning AtenÃ§Ã£o

Para estas tarefas, vocÃª precisarÃ¡ de um grupo de recursos. Crie um chamado `rg-rbac-challenge` na sua assinatura primeiro.

:::
3. Criar um grupo de recursos para este desafio:

```bash
az group create --name rg-rbac-challenge --location eastus
```

4. Atribuir a funÃ§Ã£o **Reader** para Alice no escopo da **assinatura**
5. Atribuir a funÃ§Ã£o **Contributor** para o grupo `IT-Team` no escopo do **grupo de recursos** (`rg-rbac-challenge`)
6. Atribuir a funÃ§Ã£o **Virtual Machine Contributor** para Bob no escopo do **grupo de recursos**

### Parte 3: verificar & interpretar acesso

7. Listar todas as atribuiÃ§Ãµes de funÃ§Ã£o para Alice | ela deve ter Reader no nÃ­vel da assinatura e (herdado via IT-Team) Contributor no nÃ­vel do grupo de recursos
8. Verificar o acesso efetivo do Bob no grupo de recursos
9. Listar todas as atribuiÃ§Ãµes de funÃ§Ã£o no escopo do grupo de recursos

### Parte 4: criar uma funÃ§Ã£o personalizada

10. Criar uma funÃ§Ã£o personalizada chamada `VM-Reader` com as seguintes permissÃµes:
    - **AÃ§Ãµes permitidas**: `Microsoft.Compute/virtualMachines/read`, `Microsoft.Compute/virtualMachines/instanceView/read`, `Microsoft.Network/networkInterfaces/read`
    - **Escopo**: Sua assinatura
    - Esta funÃ§Ã£o deve permitir apenas a leitura de informaÃ§Ãµes de VM, sem modificar nada

11. Atribuir a funÃ§Ã£o personalizada `VM-Reader` para Carol no escopo do grupo de recursos

### Parte 5: auditar acesso

12. Gerar um relatÃ³rio de todas as atribuiÃ§Ãµes de funÃ§Ã£o na sua assinatura
13. Encontrar todos os usuÃ¡rios com a funÃ§Ã£o **Owner** em qualquer escopo

## CritÃ©rios de sucesso

<SuccessChecklist
  storageKey="az104-challenge-02"
  items={[
    "Consegue explicar a diferenÃ§a entre as 4 funÃ§Ãµes internas fundamentais",
    "Alice tem a funÃ§Ã£o Reader no escopo da assinatura",
    "O grupo IT-Team tem a funÃ§Ã£o Contributor no escopo do grupo de recursos",
    "Bob tem a funÃ§Ã£o Virtual Machine Contributor no escopo do grupo de recursos",
    "A funÃ§Ã£o personalizada VM-Reader existe com permissÃµes somente leitura para VMs",
    "Carol tem a funÃ§Ã£o personalizada VM-Reader atribuÃ­da",
    "Consegue listar e interpretar atribuiÃ§Ãµes de funÃ§Ã£o usando CLI ou Portal"
  ]}
/>
## Dicas

<details>
<summary>Dica 1: Listando funÃ§Ãµes internas</summary>

<Tabs>
<TabItem value="cli" label="Azure CLI">

```bash
# List fundamental roles
az role definition list \
  --query "[?roleName=='Owner' || roleName=='Contributor' || roleName=='Reader' || roleName=='User Access Administrator'].{Name:roleName, Description:description}" \
  -o table

# See all actions for a specific role
az role definition list --name "Contributor" --query "[].{actions:permissions[0].actions, notActions:permissions[0].notActions}"
```

</TabItem>
<TabItem value="powershell" label="PowerShell">

```powershell
# List fundamental roles
Get-AzRoleDefinition | Where-Object {
  $_.Name -in @('Owner','Contributor','Reader','User Access Administrator')
} | Select-Object Name, Description | Format-Table

# See details for contributor
Get-AzRoleDefinition -Name "Contributor" | Select-Object -ExpandProperty Actions
```

</TabItem>
<TabItem value="portal" label="Portal">

1. VÃ¡ para sua **Subscription** â†’ **Access control (IAM)**
2. Clique na aba **Roles**
3. Pesquise por "Owner", "Contributor", "Reader"
4. Clique em qualquer funÃ§Ã£o â†’ **View** para ver suas permissÃµes

</TabItem>
</Tabs>

</details>

<details>
<summary>Dica 2: Atribuindo funÃ§Ãµes em diferentes escopos</summary>

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
ALICE_ID=$(az ad user show --id "alice@YOUR_TENANT.onmicrosoft.com" --query id -o tsv)

# Assign reader to alice at subscription scope
az role assignment create \
  --assignee $ALICE_ID \
  --role "Reader" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"

# Assign contributor to IT-Team at resource group scope
IT_GROUP_ID=$(az ad group show --group "IT-Team" --query id -o tsv)
az role assignment create \
  --assignee $IT_GROUP_ID \
  --role "Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-rbac-challenge"
```

</details>

<details>
<summary>Dica 3: Verificando acesso efetivo</summary>

```bash
# List all role assignments for a specific user
az role assignment list --assignee "alice@YOUR_TENANT.onmicrosoft.com" -o table

# List all role assignments at a resource group
az role assignment list --resource-group rg-rbac-challenge -o table

# List all role assignments in the subscription
az role assignment list --all -o table
```

</details>

<details>
<summary>Dica 4: Criando uma funÃ§Ã£o personalizada</summary>

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create a JSON definition for the custom role
cat <<EOF > vm-reader-role.json
{
  "Name": "VM-Reader",
  "Description": "Can view virtual machines and their instance details only",
  "Actions": [
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Compute/virtualMachines/instanceView/read",
    "Microsoft.Network/networkInterfaces/read"
  ],
  "NotActions": [],
  "AssignableScopes": [
    "/subscriptions/$SUBSCRIPTION_ID"
  ]
}
EOF

az role definition create --role-definition vm-reader-role.json
```

</details>

<details>
<summary>Dica 5: Encontrando todos os Owners na assinatura</summary>

```bash
# Find all owner assignments
az role assignment list --all --role "Owner" -o table

# More detailed output
az role assignment list --all --role "Owner" \
  --query "[].{Principal:principalName, Scope:scope, Type:principalType}" -o table
```

</details>

## Recursos de aprendizado

- [FunÃ§Ãµes internas do Azure](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles)
- [Atribuir funÃ§Ãµes do Azure usando Azure CLI](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli)
- [Criar funÃ§Ãµes personalizadas](https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles-cli)
- [Entender definiÃ§Ãµes de funÃ§Ãµes](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-definitions)
- [Entender escopo para Azure RBAC](https://learn.microsoft.com/en-us/azure/role-based-access-control/scope-overview)

## Quebra & conserta

ApÃ³s completar o desafio, tente estes cenÃ¡rios de soluÃ§Ã£o de problemas:

1. **EscalaÃ§Ã£o de permissÃ£o bloqueada**: FaÃ§a login como Bob (que tem VM Contributor) e tente atribuir a funÃ§Ã£o Reader a outro usuÃ¡rio no grupo de recursos. O que acontece? Qual funÃ§Ã£o o Bob precisa para atribuir funÃ§Ãµes?

2. **PermissÃµes conflitantes**: Atribua a Alice tanto **Reader** no escopo da assinatura quanto **Contributor** no escopo do grupo de recursos. Qual Ã© o acesso efetivo dela no grupo de recursos? (RBAC Ã© aditivo | ela recebe Contributor naquele RG.)

3. **NegaÃ§Ã£o misteriosa de acesso**: Carol tem a funÃ§Ã£o personalizada `VM-Reader` mas alega que nÃ£o consegue ver VMs no Portal. Verifique:
   - A funÃ§Ã£o estÃ¡ atribuÃ­da no escopo correto?
   - A funÃ§Ã£o inclui `Microsoft.Resources/subscriptions/resourceGroups/read`?
   - VocÃª esqueceu `Microsoft.Compute/virtualMachines/*/read` para sub-recursos?

4. **AtribuiÃ§Ãµes Ã³rfÃ£s**: Exclua a conta da Alice, depois liste as atribuiÃ§Ãµes de funÃ§Ã£o. VocÃª verÃ¡ uma atribuiÃ§Ã£o com um principal "Unknown" ou "Identity not found". Como vocÃª limpa essas atribuiÃ§Ãµes?

## Teste seus conhecimentos

<details>
<summary>1. Qual Ã© a diferenÃ§a principal entre Owner e Contributor?</summary>

A funÃ§Ã£o **Owner** pode fazer tudo que o **Contributor** pode, alÃ©m de poder **gerenciar atribuiÃ§Ãµes de funÃ§Ã£o** (atribuir/remover funÃ§Ãµes para outros usuÃ¡rios). A funÃ§Ã£o Contributor tem explicitamente `Microsoft.Authorization/*/Write` e `Microsoft.Authorization/*/Delete` em suas `NotActions`.

**Dica para o exame**: Se uma questÃ£o perguntar "quem pode conceder acesso a outros?", a resposta Ã© **Owner** ou **User Access Administrator**.

</details>

<details>
<summary>2. O que Ã© uma deny assignment e como Ã© diferente de NotActions?</summary>

**Deny assignments** sÃ£o bloqueios explÃ­citos que impedem usuÃ¡rios de realizar aÃ§Ãµes especÃ­ficas, mesmo que uma funÃ§Ã£o conceda acesso. Elas tÃªm precedÃªncia sobre atribuiÃ§Ãµes de funÃ§Ã£o. Deny assignments sÃ³ podem ser criadas pelo **Azure Blueprints** ou **managed apps** | vocÃª nÃ£o pode criÃ¡-las diretamente.

**NotActions** simplesmente subtraem permissÃµes da lista de `Actions` dentro de uma definiÃ§Ã£o de funÃ§Ã£o. Elas nÃ£o negam explicitamente nada | se outra funÃ§Ã£o conceder a permissÃ£o, o usuÃ¡rio ainda a terÃ¡.

**Ordem de precedÃªncia**: Deny ExplÃ­cito â†’ NotActions â†’ Allow

</details>

<details>
<summary>3. Como funciona a heranÃ§a de funÃ§Ãµes entre escopos?</summary>

RBAC usa uma **hierarquia de escopos**:

```text
Management Group â†’ Subscription â†’ Resource Group â†’ Resource
```

Uma funÃ§Ã£o atribuÃ­da em um **escopo superior** Ã© herdada por todos os **escopos inferiores**. Por exemplo:
- Reader no nÃ­vel da assinatura = Reader em cada grupo de recursos e recurso nessa assinatura
- Contributor em um grupo de recursos = Contributor em cada recurso nesse grupo

**PermissÃµes sÃ£o aditivas** | se vocÃª tem Reader na assinatura e Contributor em um grupo de recursos, seu acesso efetivo naquele RG Ã© Contributor (a combinaÃ§Ã£o mais permissiva).

</details>

<details>
<summary>4. Quantas funÃ§Ãµes personalizadas vocÃª pode criar por tenant?</summary>

Cada tenant do Microsoft Entra ID pode ter atÃ© **5.000 funÃ§Ãµes personalizadas**. FunÃ§Ãµes personalizadas podem ter escopo em uma ou mais assinaturas ou grupos de gerenciamento dentro do tenant.

FunÃ§Ãµes personalizadas requerem **Microsoft Entra ID P1 ou P2** para atribuiÃ§Ãµes a service principals, mas funcionam com o nÃ­vel gratuito para atribuiÃ§Ãµes a usuÃ¡rios.

</details>

<details>
<summary>5. VocÃª pode atribuir funÃ§Ãµes RBAC a service principals e managed identities?</summary>

**Sim!** FunÃ§Ãµes RBAC podem ser atribuÃ­das a:
- **UsuÃ¡rios** (membros e convidados do Entra ID)
- **Grupos** (grupos de seguranÃ§a e grupos do Microsoft 365)
- **Service principals** (registros de aplicaÃ§Ã£o)
- **Managed identities** (atribuÃ­das pelo sistema e atribuÃ­das pelo usuÃ¡rio)

Este Ã© um cenÃ¡rio comum de exame: "Atribua a funÃ§Ã£o Storage Blob Data Contributor a uma managed identity para que um aplicativo possa acessar blob storage sem armazenar credenciais."

</details>

## Limpeza

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
ALICE_ID=$(az ad user show --id "alice@YOUR_TENANT.onmicrosoft.com" --query id -o tsv 2>/dev/null)
BOB_ID=$(az ad user show --id "bob@YOUR_TENANT.onmicrosoft.com" --query id -o tsv 2>/dev/null)
CAROL_ID=$(az ad user show --id "carol@YOUR_TENANT.onmicrosoft.com" --query id -o tsv 2>/dev/null)
IT_GROUP_ID=$(az ad group show --group "IT-Team" --query id -o tsv 2>/dev/null)

# Remove role assignments
az role assignment delete --assignee $ALICE_ID --role "Reader" --scope "/subscriptions/$SUBSCRIPTION_ID" 2>/dev/null
az role assignment delete --assignee $IT_GROUP_ID --role "Contributor" --resource-group rg-rbac-challenge 2>/dev/null
az role assignment delete --assignee $BOB_ID --role "Virtual Machine Contributor" --resource-group rg-rbac-challenge 2>/dev/null
az role assignment delete --assignee $CAROL_ID --role "VM-Reader" --resource-group rg-rbac-challenge 2>/dev/null

# Delete the custom role
az role definition delete --name "VM-Reader" 2>/dev/null

# Delete the resource group
az group delete --name rg-rbac-challenge --yes --no-wait

# Clean up temp files
rm -f vm-reader-role.json
```

---

**PrÃ³ximo**: [Desafio 03 | Azure Policy & GovernanÃ§a](/docs/az-104/identity/challenge-03)
