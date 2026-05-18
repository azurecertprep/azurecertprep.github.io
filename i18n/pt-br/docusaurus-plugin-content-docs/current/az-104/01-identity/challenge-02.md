---
sidebar_position: 2
title: "Challenge 02 | RBAC & Access Management"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 02: RBAC & Gerenciamento de Acesso

:::info Tempo e Custo Estimados

**45-60 min** | **Custo estimado**: Gratuito | **Peso no Exame: 20-25%**

:::

## Introdução

Agora que a Contoso Ltd. tem usuários e grupos no Entra ID, você precisa controlar **quem pode fazer o quê** no Azure. O VP de Engenharia acabou de perguntar: "Por que o estagiário consegue ver nossa assinatura de produção?" Hora de trancar tudo com Role-Based Access Control.

RBAC é o guardião do Azure. Cada ação | criar uma VM, ler uma conta de armazenamento, excluir um grupo de recursos | é controlada por funções atribuídas a identidades em escopos específicos. Se errar nisso, você vai bloquear sua equipe ou expor seu ambiente.

## Habilidades do Exame Cobertas

- Gerenciar funções internas do Azure
- Atribuir funções em diferentes escopos (grupo de gerenciamento, assinatura, grupo de recursos, recurso)
- Interpretar atribuições de acesso
- Criar e atribuir funções personalizadas
- Gerenciar atribuições de funções do Microsoft Entra

## Referência Sysadmin ↔ Azure

| On-Prem / Sysadmin | Equivalente no Azure | Observações |
|---------------------|----------------------|-------------|
| Permissões NTFS (Controle Total) | Função Owner | Acesso total + pode atribuir funções |
| Permissões NTFS (Modificar) | Função Contributor | Acesso total mas não pode atribuir funções |
| Permissões NTFS (Leitura) | Função Reader | Visualizar tudo, alterar nada |
| Grupo Domain Admins | Owner no escopo da assinatura | Acesso administrativo amplo |
| Permissões delegadas em pastas | RBAC no escopo do grupo de recursos | Controle de acesso com escopo definido |
| icacls / cacls | az role assignment | Gerenciamento de permissões via CLI |
| "Deny" ACE no NTFS | Deny assignments | Negação explícita (raro, geralmente via Blueprints) |
| Delegação personalizada no AD | Funções RBAC personalizadas | Definições granulares de permissão |

## Descrição

### Parte 1: Explorar Funções Internas

1. Listar as 4 funções internas fundamentais e entender o que cada uma permite:
   - **Owner** | Acesso total a todos os recursos + pode atribuir funções a outros
   - **Contributor** | Acesso total a todos os recursos mas não pode atribuir funções
   - **Reader** | Visualizar todos os recursos mas não pode fazer alterações
   - **User Access Administrator** | Gerenciar acesso de usuários aos recursos do Azure

2. Explorar funções internas adicionais relevantes para o exame:
   - Virtual Machine Contributor
   - Storage Blob Data Reader
   - Network Contributor

### Parte 2: Atribuir Funções em Diferentes Escopos

:::warning Atenção

Para estas tarefas, você precisará de um grupo de recursos. Crie um chamado `rg-rbac-challenge` na sua assinatura primeiro.

:::
3. Criar um grupo de recursos para este desafio:

```bash
az group create --name rg-rbac-challenge --location eastus
```

4. Atribuir a função **Reader** para Alice no escopo da **assinatura**
5. Atribuir a função **Contributor** para o grupo `IT-Team` no escopo do **grupo de recursos** (`rg-rbac-challenge`)
6. Atribuir a função **Virtual Machine Contributor** para Bob no escopo do **grupo de recursos**

### Parte 3: Verificar & Interpretar Acesso

7. Listar todas as atribuições de função para Alice | ela deve ter Reader no nível da assinatura e (herdado via IT-Team) Contributor no nível do grupo de recursos
8. Verificar o acesso efetivo do Bob no grupo de recursos
9. Listar todas as atribuições de função no escopo do grupo de recursos

### Parte 4: Criar uma Função Personalizada

10. Criar uma função personalizada chamada `VM-Reader` com as seguintes permissões:
    - **Ações permitidas**: `Microsoft.Compute/virtualMachines/read`, `Microsoft.Compute/virtualMachines/instanceView/read`, `Microsoft.Network/networkInterfaces/read`
    - **Escopo**: Sua assinatura
    - Esta função deve permitir apenas a leitura de informações de VM, sem modificar nada

11. Atribuir a função personalizada `VM-Reader` para Carol no escopo do grupo de recursos

### Parte 5: Auditar Acesso

12. Gerar um relatório de todas as atribuições de função na sua assinatura
13. Encontrar todos os usuários com a função **Owner** em qualquer escopo

## Critérios de Sucesso

- [ ] Consegue explicar a diferença entre as 4 funções internas fundamentais
- [ ] Alice tem a função Reader no escopo da assinatura
- [ ] O grupo IT-Team tem a função Contributor no escopo do grupo de recursos
- [ ] Bob tem a função Virtual Machine Contributor no escopo do grupo de recursos
- [ ] A função personalizada `VM-Reader` existe com permissões somente leitura para VMs
- [ ] Carol tem a função personalizada `VM-Reader` atribuída
- [ ] Consegue listar e interpretar atribuições de função usando CLI ou Portal

## Dicas

<details>
<summary>Dica 1: Listando funções internas</summary>

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

# See details for Contributor
Get-AzRoleDefinition -Name "Contributor" | Select-Object -ExpandProperty Actions
```

</TabItem>
<TabItem value="portal" label="Portal">

1. Vá para sua **Subscription** → **Access control (IAM)**
2. Clique na aba **Roles**
3. Pesquise por "Owner", "Contributor", "Reader"
4. Clique em qualquer função → **View** para ver suas permissões

</TabItem>
</Tabs>

</details>

<details>
<summary>Dica 2: Atribuindo funções em diferentes escopos</summary>

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
ALICE_ID=$(az ad user show --id "alice@YOUR_TENANT.onmicrosoft.com" --query id -o tsv)

# Assign Reader to Alice at subscription scope
az role assignment create \
  --assignee $ALICE_ID \
  --role "Reader" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"

# Assign Contributor to IT-Team at resource group scope
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
<summary>Dica 4: Criando uma função personalizada</summary>

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
# Find all Owner assignments
az role assignment list --all --role "Owner" -o table

# More detailed output
az role assignment list --all --role "Owner" \
  --query "[].{Principal:principalName, Scope:scope, Type:principalType}" -o table
```

</details>

## Recursos de Aprendizado

- [Funções internas do Azure](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles)
- [Atribuir funções do Azure usando Azure CLI](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli)
- [Criar funções personalizadas](https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles-cli)
- [Entender definições de funções](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-definitions)
- [Entender escopo para Azure RBAC](https://learn.microsoft.com/en-us/azure/role-based-access-control/scope-overview)

## Quebre & Conserte

Após completar o desafio, tente estes cenários de solução de problemas:

1. **Escalação de permissão bloqueada**: Faça login como Bob (que tem VM Contributor) e tente atribuir a função Reader a outro usuário no grupo de recursos. O que acontece? Qual função o Bob precisa para atribuir funções?

2. **Permissões conflitantes**: Atribua a Alice tanto **Reader** no escopo da assinatura quanto **Contributor** no escopo do grupo de recursos. Qual é o acesso efetivo dela no grupo de recursos? (RBAC é aditivo | ela recebe Contributor naquele RG.)

3. **Negação misteriosa de acesso**: Carol tem a função personalizada `VM-Reader` mas alega que não consegue ver VMs no Portal. Verifique:
   - A função está atribuída no escopo correto?
   - A função inclui `Microsoft.Resources/subscriptions/resourceGroups/read`?
   - Você esqueceu `Microsoft.Compute/virtualMachines/*/read` para sub-recursos?

4. **Atribuições órfãs**: Exclua a conta da Alice, depois liste as atribuições de função. Você verá uma atribuição com um principal "Unknown" ou "Identity not found". Como você limpa essas atribuições?

## Teste seus Conhecimentos

<details>
<summary>1. Qual é a diferença principal entre Owner e Contributor?</summary>

A função **Owner** pode fazer tudo que o **Contributor** pode, além de poder **gerenciar atribuições de função** (atribuir/remover funções para outros usuários). A função Contributor tem explicitamente `Microsoft.Authorization/*/Write` e `Microsoft.Authorization/*/Delete` em suas `NotActions`.

**Dica para o exame**: Se uma questão perguntar "quem pode conceder acesso a outros?", a resposta é **Owner** ou **User Access Administrator**.

</details>

<details>
<summary>2. O que é uma deny assignment e como é diferente de NotActions?</summary>

**Deny assignments** são bloqueios explícitos que impedem usuários de realizar ações específicas, mesmo que uma função conceda acesso. Elas têm precedência sobre atribuições de função. Deny assignments só podem ser criadas pelo **Azure Blueprints** ou **managed apps** | você não pode criá-las diretamente.

**NotActions** simplesmente subtraem permissões da lista de `Actions` dentro de uma definição de função. Elas não negam explicitamente nada | se outra função conceder a permissão, o usuário ainda a terá.

**Ordem de precedência**: Deny Explícito → NotActions → Allow

</details>

<details>
<summary>3. Como funciona a herança de funções entre escopos?</summary>

RBAC usa uma **hierarquia de escopos**:

```
Management Group → Subscription → Resource Group → Resource
```

Uma função atribuída em um **escopo superior** é herdada por todos os **escopos inferiores**. Por exemplo:
- Reader no nível da assinatura = Reader em cada grupo de recursos e recurso nessa assinatura
- Contributor em um grupo de recursos = Contributor em cada recurso nesse grupo

**Permissões são aditivas** | se você tem Reader na assinatura e Contributor em um grupo de recursos, seu acesso efetivo naquele RG é Contributor (a combinação mais permissiva).

</details>

<details>
<summary>4. Quantas funções personalizadas você pode criar por tenant?</summary>

Cada tenant do Microsoft Entra ID pode ter até **5.000 funções personalizadas**. Funções personalizadas podem ter escopo em uma ou mais assinaturas ou grupos de gerenciamento dentro do tenant.

Funções personalizadas requerem **Microsoft Entra ID P1 ou P2** para atribuições a service principals, mas funcionam com o nível gratuito para atribuições a usuários.

</details>

<details>
<summary>5. Você pode atribuir funções RBAC a service principals e managed identities?</summary>

**Sim!** Funções RBAC podem ser atribuídas a:
- **Usuários** (membros e convidados do Entra ID)
- **Grupos** (grupos de segurança e grupos do Microsoft 365)
- **Service principals** (registros de aplicação)
- **Managed identities** (atribuídas pelo sistema e atribuídas pelo usuário)

Este é um cenário comum de exame: "Atribua a função Storage Blob Data Contributor a uma managed identity para que um aplicativo possa acessar blob storage sem armazenar credenciais."

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

**Próximo**: [Desafio 03 | Azure Policy & Governança](/docs/az-104/identity/challenge-03)
