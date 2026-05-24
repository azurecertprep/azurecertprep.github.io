---
sidebar_position: 3
title: "Desafio 03: Azure Policy & Governança"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 03: Azure Policy & governanÃ§a

:::info Tempo e Custo Estimados

**60-75 min** | **Custo estimado**: Gratuito (avaliaÃ§Ã£o de polÃ­tica) | **Peso no Exame: 15-20%
**

:::

## IntroduÃ§Ã£o

O CTO da Contoso Ltd. acabou de voltar de uma conferÃªncia de seguranÃ§a em nuvem e estÃ¡ preocupado. "Ouvi dizer que uma empresa implantou cargas de trabalho de produÃ§Ã£o na regiÃ£o errada e foi penalizada por violaÃ§Ãµes de soberania de dados. Isso pode acontecer conosco?" Seu trabalho: configurar barreiras de proteÃ§Ã£o para que ninguÃ©m possa implantar recursos sem tags adequadas, fora das regiÃµes aprovadas ou sem seguir os padrÃµes da empresa.

Azure Policy Ã© seu mecanismo de aplicaÃ§Ã£o. Pense nele como Group Policy para a nuvem | mas em vez de controlar configuraÃ§Ãµes de desktop, vocÃª estÃ¡ controlando quais recursos podem ser criados e como eles devem ser configurados.

## Habilidades do exame cobertas

- Criar e gerenciar atribuiÃ§Ãµes de Azure Policy
- Criar e gerenciar definiÃ§Ãµes e iniciativas de polÃ­tica
- Gerenciar bloqueios de recursos
- Gerenciar tags de recursos
- Gerenciar grupos de recursos
- Gerenciar assinaturas e grupos de gerenciamento
- Configurar e gerenciar recomendaÃ§Ãµes do Azure Advisor
- Configurar e gerenciar orÃ§amentos e alertas de custo

## ReferÃªncia sysadmin â†” Azure

| On-Prem / Sysadmin | Equivalente no Azure | ObservaÃ§Ãµes |
|---------------------|----------------------|-------------|
| Group Policy Objects (GPO) | Azure Policy | Aplicar regras em recursos |
| ConfiguraÃ§Ãµes de "Deny" no GPO | Policy com efeito Deny | Bloquear implantaÃ§Ãµes nÃ£o conformes |
| Auditoria via GPO | Policy com efeito Audit | Relatar nÃ£o conformidade sem bloquear |
| Metadados obrigatÃ³rios de arquivos | Tags de recursos | Pares chave-valor em recursos |
| Conformidade WSUS / SCCM | Azure Advisor | RecomendaÃ§Ãµes de melhores prÃ¡ticas |
| Sistema de arquivos somente leitura | Bloqueio ReadOnly de recurso | Prevenir modificaÃ§Ãµes |
| ProteÃ§Ã£o contra exclusÃ£o | Bloqueio CanNotDelete de recurso | Prevenir exclusÃ£o acidental |
| Hierarquia de OUs no AD | Management groups | OrganizaÃ§Ã£o hierÃ¡rquica de assinaturas |
| Planilha de rastreamento de orÃ§amento | Azure Budgets | Alertas automatizados de custo |

## DescriÃ§Ã£o

### Parte 1: grupos de recursos & tags

1. Criar dois grupos de recursos para este desafio:

```bash
az group create --name rg-policy-prod --location eastus --tags Environment=Production CostCenter=IT-001
az group create --name rg-policy-dev --location eastus --tags Environment=Development CostCenter=IT-002
```

2. Adicionar tags a ambos os grupos de recursos:
   - `Environment` = Production ou Development
   - `CostCenter` = IT-001 ou IT-002
   - `Owner` = seu nome

3. Praticar operaÃ§Ãµes em massa com tags | listar todos os recursos com uma tag especÃ­fica:

```bash
az resource list --tag Environment=Production -o table
```

### Parte 2: Azure Policy | exigir tags

4. Atribuir a polÃ­tica interna **"Require a tag and its value on resources"** ao `rg-policy-prod`:
   - Nome da tag: `CostCenter`
   - Efeito: **Deny**

5. Testar a polÃ­tica tentando criar uma conta de armazenamento **sem** a tag `CostCenter` no `rg-policy-prod`:

```bash
# This should FAIL after policy takes effect
az storage account create \
  --name stpolicytest$RANDOM \
  --resource-group rg-policy-prod \
  --location eastus \
  --sku Standard_LRS
```

6. Agora criar a conta de armazenamento **com** a tag obrigatÃ³ria:

```bash
# This should SUCCEED
az storage account create \
  --name stpolicytest$RANDOM \
  --resource-group rg-policy-prod \
  --location eastus \
  --sku Standard_LRS \
  --tags CostCenter=IT-001
```

### Parte 3: Azure Policy | localizaÃ§Ãµes permitidas

7. Atribuir a polÃ­tica interna **"Allowed locations"** ao `rg-policy-prod`:
   - LocalizaÃ§Ãµes permitidas: East US, West US 2

8. Testar tentando criar um recurso no `rg-policy-prod` usando uma localizaÃ§Ã£o nÃ£o permitida (ex: West Europe)

### Parte 4: iniciativa de polÃ­tica

9. Criar uma iniciativa de polÃ­tica (conjunto de polÃ­ticas) chamada `Contoso-Governance` que inclua:
   - Exigir tag `CostCenter` em recursos
   - Exigir tag `Environment` em recursos
   - LocalizaÃ§Ãµes permitidas (East US, West US 2)

10. Atribuir a iniciativa ao `rg-policy-dev`

### Parte 5: bloqueios de recursos

11. Criar um bloqueio **CanNotDelete** no `rg-policy-prod`:

```bash
az lock create --name "PreventDeletion" \
  --lock-type CanNotDelete \
  --resource-group rg-policy-prod \
  --notes "Production resources - do not delete"
```

12. Tentar excluir o grupo de recursos (deve falhar)
13. Criar um bloqueio **ReadOnly** em um recurso especÃ­fico dentro do grupo

### Parte 6: Azure advisor & orÃ§amentos

14. Verificar recomendaÃ§Ãµes do Azure Advisor para sua assinatura:

```bash
az advisor recommendation list --query "[].{Category:category, Impact:impact, Description:shortDescription.problem}" -o table
```

15. Criar um alerta de orÃ§amento na sua assinatura:

<Tabs>
<TabItem value="cli" label="Azure CLI">

```bash
# Create a monthly budget of $50 with an alert at 80%
az consumption budget create \
  --budget-name "LabBudget" \
  --amount 50 \
  --time-grain Monthly \
  --start-date "2025-01-01" \
  --end-date "2025-12-31" \
  --category Cost
```

:::note

Alertas de orÃ§amento via CLI requerem configuraÃ§Ã£o adicional para limites de notificaÃ§Ã£o. Ã‰ mais fÃ¡cil configurÃ¡-los no Portal em **Cost Management + Billing** â†’ **Budgets**.

:::
</TabItem>
<TabItem value="portal" label="Portal">

1. VÃ¡ para **Cost Management + Billing** â†’ **Budgets**
2. Clique em **+ Add**
3. Defina **Amount** como $50, **Time grain** como Monthly
4. Adicione uma condiÃ§Ã£o de alerta em **80%** do orÃ§amento
5. Adicione seu email para notificaÃ§Ãµes

</TabItem>
</Tabs>

## CritÃ©rios de sucesso

<SuccessChecklist
  storageKey="az104-challenge-03"
  items={[
    "Dois grupos de recursos existem com tags adequadas (Environment, CostCenter, Owner)",
    "PolÃ­tica \"Require CostCenter tag\" estÃ¡ atribuÃ­da ao rg-policy-prod com efeito Deny",
    "Implantar um recurso sem a tag falha no rg-policy-prod",
    "Implantar um recurso com a tag tem sucesso",
    "PolÃ­tica de localizaÃ§Ãµes permitidas restringe implantaÃ§Ãµes para East US e West US 2",
    "Iniciativa de polÃ­tica Contoso-Governance foi criada com 3 polÃ­ticas e atribuÃ­da ao rg-policy-dev",
    "Bloqueio CanNotDelete existe no rg-policy-prod",
    "Tentativa de excluir o grupo de recursos bloqueado falha",
    "RecomendaÃ§Ãµes do Azure Advisor foram revisadas"
  ]}
/>
## Dicas

<details>
<summary>Dica 1: Encontrando definiÃ§Ãµes de polÃ­tica internas</summary>

```bash
# Search for tag-related policies
az policy definition list --query "[?contains(displayName, 'tag')].{Name:displayName, ID:name}" -o table

# Search for location policies
az policy definition list --query "[?contains(displayName, 'location')].{Name:displayName, ID:name}" -o table

# Get details of a specific policy
az policy definition show --name "1e30110a-5ceb-460c-a204-c1c3969c6d62"
```

</details>

<details>
<summary>Dica 2: Atribuindo uma polÃ­tica com parÃ¢metros</summary>

```bash
# Assign "Require a tag and its value on resources"
# Built-in policy ID: 1e30110a-5ceb-460c-a204-c1c3969c6d62
RG_ID=$(az group show --name rg-policy-prod --query id -o tsv)

az policy assignment create \
  --name "require-costcenter-tag" \
  --display-name "Require CostCenter tag" \
  --policy "871b6d14-10aa-478d-b466-ef6698f3ef28" \
  --scope "$RG_ID" \
  --params '{"tagName":{"value":"CostCenter"}}'
```

:::tip Dica

AtribuiÃ§Ãµes de polÃ­tica podem levar **5-15 minutos** para entrar em vigor. Tenha paciÃªncia ao testar!

:::
</details>

<details>
<summary>Dica 3: Criando uma iniciativa de polÃ­tica</summary>

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

cat <<'EOF' > initiative.json
[
  {
    "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/871b6d14-10aa-478d-b466-ef6698f3ef28",
    "parameters": {
      "tagName": { "value": "CostCenter" }
    }
  },
  {
    "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/871b6d14-10aa-478d-b466-ef6698f3ef28",
    "parameters": {
      "tagName": { "value": "Environment" }
    }
  },
  {
    "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c",
    "parameters": {
      "listOfAllowedLocations": { "value": ["eastus", "westus2"] }
    }
  }
]
EOF

az policy set-definition create \
  --name "Contoso-Governance" \
  --display-name "Contoso Governance Initiative" \
  --definitions initiative.json \
  --description "Requires tags and restricts locations"
```

</details>

<details>
<summary>Dica 4: Trabalhando com bloqueios de recursos</summary>

```bash
# List locks on a resource group
az lock list --resource-group rg-policy-prod -o table

# Try to delete (will fail with CanNotDelete lock)
az group delete --name rg-policy-prod --yes
# Error: resource group is locked

# To delete, you must first remove the lock
az lock delete --name "PreventDeletion" --resource-group rg-policy-prod
```

</details>

<details>
<summary>Dica 5: Verificando conformidade de polÃ­tica</summary>

```bash
# View compliance state for a policy assignment
az policy state list \
  --resource-group rg-policy-prod \
  --query "[].{Resource:resourceId, Compliance:complianceState, Policy:policyAssignmentName}" \
  -o table

# Trigger an on-demand policy evaluation
az policy state trigger-scan --resource-group rg-policy-prod --no-wait
```

</details>

## Recursos de aprendizado

- [VisÃ£o geral do Azure Policy](https://learn.microsoft.com/en-us/azure/governance/policy/overview)
- [DefiniÃ§Ãµes internas do Azure Policy](https://learn.microsoft.com/en-us/azure/governance/policy/samples/built-in-policies)
- [Bloqueios de recursos](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources)
- [Usar tags para organizar recursos](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-resources)
- [Management groups](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)
- [Azure Advisor](https://learn.microsoft.com/en-us/azure/advisor/advisor-overview)

## Quebra & conserta

ApÃ³s completar o desafio, tente estes cenÃ¡rios de soluÃ§Ã£o de problemas:

1. **Bloqueio vs. PolÃ­tica**: VocÃª tem um bloqueio CanNotDelete em um grupo de recursos e uma Policy com efeito Deny nas exigÃªncias de tag. VocÃª tenta criar um recurso sem tags. Qual bloqueia primeiro? (Resposta: A Policy Ã© avaliada durante a implantaÃ§Ã£o; bloqueios se aplicam a operaÃ§Ãµes de exclusÃ£o/modificaÃ§Ã£o.)

2. **NÃ£o consigo excluir nada**: Aplique um bloqueio **ReadOnly** a um grupo de recursos, depois tente adicionar um novo recurso dentro dele. O que acontece? (O bloqueio ReadOnly impede quaisquer alteraÃ§Ãµes, incluindo a criaÃ§Ã£o de novos recursos dentro do grupo.)

3. **PolÃ­tica nÃ£o estÃ¡ funcionando**: VocÃª atribuiu uma polÃ­tica Deny hÃ¡ 2 minutos e ela nÃ£o estÃ¡ bloqueando nada ainda. Por quÃª? (A avaliaÃ§Ã£o de polÃ­tica pode levar atÃ© 15 minutos para novas atribuiÃ§Ãµes. Acione uma verificaÃ§Ã£o sob demanda com `az policy state trigger-scan`.)

4. **ConfusÃ£o com tag herdada**: VocÃª marcou um grupo de recursos com `Environment=Production`, mas os recursos dentro dele nÃ£o tÃªm a tag. Isso Ã© esperado? (Sim | tags NÃƒO sÃ£o herdadas de grupos de recursos para recursos por padrÃ£o. Use a polÃ­tica `Inherit a tag from the resource group` para habilitar isso.)

## Teste seus conhecimentos

<details>
<summary>1. Qual Ã© a diferenÃ§a entre os efeitos de polÃ­tica Deny, Audit e Append?</summary>

- **Deny**: Bloqueia a criaÃ§Ã£o ou modificaÃ§Ã£o do recurso se nÃ£o estiver em conformidade. AplicaÃ§Ã£o rÃ­gida.
- **Audit**: Permite o recurso mas cria uma entrada de conformidade. AplicaÃ§Ã£o flexÃ­vel | vocÃª vÃª violaÃ§Ãµes mas nÃ£o as bloqueia.
- **Append**: Adiciona automaticamente campos ao recurso durante a criaÃ§Ã£o. Por exemplo, adicionar uma tag que estÃ¡ faltando.

Outros efeitos incluem: **AuditIfNotExists**, **DeployIfNotExists** (remediaÃ§Ã£o automÃ¡tica), **Disabled** e **Modify**.

**Dica para o exame**: Saiba quando usar Deny vs. Audit vs. DeployIfNotExists.

</details>

<details>
<summary>2. Qual Ã© a diferenÃ§a entre uma definiÃ§Ã£o de polÃ­tica e uma iniciativa de polÃ­tica?</summary>

Uma **definiÃ§Ã£o de polÃ­tica** Ã© uma regra Ãºnica (ex: "exigir tag CostCenter").

Uma **iniciativa de polÃ­tica** (tambÃ©m chamada de **conjunto de polÃ­ticas**) Ã© uma coleÃ§Ã£o de definiÃ§Ãµes de polÃ­tica agrupadas. Isso facilita a atribuiÃ§Ã£o e o gerenciamento de mÃºltiplas polÃ­ticas relacionadas como uma Ãºnica unidade.

**Exemplo**: Uma iniciativa "Governance" pode incluir: exigir tags + localizaÃ§Ãµes permitidas + SKUs de VM permitidos.

</details>

<details>
<summary>3. Como funciona a hierarquia de management groups?</summary>

```text
Root Management Group (Tenant Root)
â”œâ”€â”€ MG-Production
â”‚   â”œâ”€â”€ Sub-Prod-01
â”‚   â””â”€â”€ Sub-Prod-02
â”œâ”€â”€ MG-Development
â”‚   â””â”€â”€ Sub-Dev-01
â””â”€â”€ MG-Sandbox
    â””â”€â”€ Sub-Sandbox-01
```

- Cada assinatura pertence a **exatamente um** management group
- PolÃ­ticas e RBAC atribuÃ­dos em um management group sÃ£o **herdados** por todos os management groups e assinaturas filhos
- Profundidade mÃ¡xima: **6 nÃ­veis** (sem contar o root)
- O management group root nÃ£o pode ser movido ou excluÃ­do

</details>

<details>
<summary>4. VocÃª pode aplicar um bloqueio de recurso a um recurso especÃ­fico (nÃ£o apenas a um grupo de recursos)?</summary>

**Sim!** Bloqueios de recurso podem ser aplicados em trÃªs nÃ­veis:
- NÃ­vel de **assinatura** (afeta todos os grupos de recursos e recursos)
- NÃ­vel de **grupo de recursos** (afeta todos os recursos no grupo)
- NÃ­vel de **recurso individual** (afeta apenas aquele recurso)

Bloqueios sÃ£o herdados | um bloqueio no nÃ­vel do grupo de recursos se aplica a todos os recursos dentro dele. Para excluir um recurso bloqueado, vocÃª deve primeiro remover o bloqueio.

</details>

<details>
<summary>5. Tags sÃ£o herdadas de grupos de recursos para recursos?</summary>

**NÃ£o!** Tags em um grupo de recursos **NÃƒO** sÃ£o automaticamente herdadas pelos recursos dentro dele. Esta Ã© uma pergunta de exame muito comum.

Para aplicar heranÃ§a de tags, use a polÃ­tica interna **"Inherit a tag from the resource group"** com o efeito **Modify**. Esta polÃ­tica copiarÃ¡ automaticamente tags do grupo de recursos para novos recursos criados dentro dele.

</details>

## Limpeza

```bash
# Remove the resource lock first (required before deletion)
az lock delete --name "PreventDeletion" --resource-group rg-policy-prod 2>/dev/null

# Remove policy assignments
az policy assignment delete --name "require-costcenter-tag" --scope $(az group show --name rg-policy-prod --query id -o tsv) 2>/dev/null
az policy assignment delete --name "allowed-locations" --scope $(az group show --name rg-policy-prod --query id -o tsv) 2>/dev/null

# Remove initiative assignment and definition
az policy assignment delete --name "contoso-governance-assignment" --scope $(az group show --name rg-policy-dev --query id -o tsv) 2>/dev/null
az policy set-definition delete --name "Contoso-Governance" 2>/dev/null

# Delete resource groups
az group delete --name rg-policy-prod --yes --no-wait
az group delete --name rg-policy-dev --yes --no-wait

# Clean up temp files
rm -f initiative.json
```

---

**PrÃ³ximo**: [Desafio 04 | Storage Accounts & Acesso](/docs/az-104/storage/challenge-04)
