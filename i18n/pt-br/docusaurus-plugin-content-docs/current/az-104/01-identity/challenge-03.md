---
sidebar_position: 3
title: "Challenge 03 | Azure Policy & Governance"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 03: Azure Policy & Governança

> **Tempo estimado**: 60-75 min | **Custo estimado**: Gratuito (avaliação de política) | **Peso no exame**: 15-20%

## Introdução

O CTO da Contoso Ltd. acabou de voltar de uma conferência de segurança em nuvem e está preocupado. "Ouvi dizer que uma empresa implantou cargas de trabalho de produção na região errada e foi penalizada por violações de soberania de dados. Isso pode acontecer conosco?" Seu trabalho: configurar barreiras de proteção para que ninguém possa implantar recursos sem tags adequadas, fora das regiões aprovadas ou sem seguir os padrões da empresa.

Azure Policy é seu mecanismo de aplicação. Pense nele como Group Policy para a nuvem | mas em vez de controlar configurações de desktop, você está controlando quais recursos podem ser criados e como eles devem ser configurados.

## Habilidades do Exame Cobertas

- ✅ Criar e gerenciar atribuições de Azure Policy
- ✅ Criar e gerenciar definições e iniciativas de política
- ✅ Gerenciar bloqueios de recursos
- ✅ Gerenciar tags de recursos
- ✅ Gerenciar grupos de recursos
- ✅ Gerenciar assinaturas e grupos de gerenciamento
- ✅ Configurar e gerenciar recomendações do Azure Advisor
- ✅ Configurar e gerenciar orçamentos e alertas de custo

## Referência Sysadmin ↔ Azure

| On-Prem / Sysadmin | Equivalente no Azure | Observações |
|---------------------|----------------------|-------------|
| Group Policy Objects (GPO) | Azure Policy | Aplicar regras em recursos |
| Configurações de "Deny" no GPO | Policy com efeito Deny | Bloquear implantações não conformes |
| Auditoria via GPO | Policy com efeito Audit | Relatar não conformidade sem bloquear |
| Metadados obrigatórios de arquivos | Tags de recursos | Pares chave-valor em recursos |
| Conformidade WSUS / SCCM | Azure Advisor | Recomendações de melhores práticas |
| Sistema de arquivos somente leitura | Bloqueio ReadOnly de recurso | Prevenir modificações |
| Proteção contra exclusão | Bloqueio CanNotDelete de recurso | Prevenir exclusão acidental |
| Hierarquia de OUs no AD | Management groups | Organização hierárquica de assinaturas |
| Planilha de rastreamento de orçamento | Azure Budgets | Alertas automatizados de custo |

## Descrição

### Parte 1: Grupos de Recursos & Tags

1. Criar dois grupos de recursos para este desafio:

```bash
az group create --name rg-policy-prod --location eastus --tags Environment=Production CostCenter=IT-001
az group create --name rg-policy-dev --location eastus --tags Environment=Development CostCenter=IT-002
```

2. Adicionar tags a ambos os grupos de recursos:
   - `Environment` = Production ou Development
   - `CostCenter` = IT-001 ou IT-002
   - `Owner` = seu nome

3. Praticar operações em massa com tags | listar todos os recursos com uma tag específica:

```bash
az resource list --tag Environment=Production -o table
```

### Parte 2: Azure Policy | Exigir Tags

4. Atribuir a política interna **"Require a tag and its value on resources"** ao `rg-policy-prod`:
   - Nome da tag: `CostCenter`
   - Efeito: **Deny**

5. Testar a política tentando criar uma conta de armazenamento **sem** a tag `CostCenter` no `rg-policy-prod`:

```bash
# This should FAIL after policy takes effect
az storage account create \
  --name stpolicytest$RANDOM \
  --resource-group rg-policy-prod \
  --location eastus \
  --sku Standard_LRS
```

6. Agora criar a conta de armazenamento **com** a tag obrigatória:

```bash
# This should SUCCEED
az storage account create \
  --name stpolicytest$RANDOM \
  --resource-group rg-policy-prod \
  --location eastus \
  --sku Standard_LRS \
  --tags CostCenter=IT-001
```

### Parte 3: Azure Policy | Localizações Permitidas

7. Atribuir a política interna **"Allowed locations"** ao `rg-policy-prod`:
   - Localizações permitidas: East US, West US 2

8. Testar tentando criar um recurso no `rg-policy-prod` usando uma localização não permitida (ex: West Europe)

### Parte 4: Iniciativa de Política

9. Criar uma iniciativa de política (conjunto de políticas) chamada `Contoso-Governance` que inclua:
   - Exigir tag `CostCenter` em recursos
   - Exigir tag `Environment` em recursos
   - Localizações permitidas (East US, West US 2)

10. Atribuir a iniciativa ao `rg-policy-dev`

### Parte 5: Bloqueios de Recursos

11. Criar um bloqueio **CanNotDelete** no `rg-policy-prod`:

```bash
az lock create --name "PreventDeletion" \
  --lock-type CanNotDelete \
  --resource-group rg-policy-prod \
  --notes "Production resources - do not delete"
```

12. Tentar excluir o grupo de recursos (deve falhar)
13. Criar um bloqueio **ReadOnly** em um recurso específico dentro do grupo

### Parte 6: Azure Advisor & Orçamentos

14. Verificar recomendações do Azure Advisor para sua assinatura:

```bash
az advisor recommendation list --query "[].{Category:category, Impact:impact, Description:shortDescription.problem}" -o table
```

15. Criar um alerta de orçamento na sua assinatura:

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

Alertas de orçamento via CLI requerem configuração adicional para limites de notificação. É mais fácil configurá-los no Portal em **Cost Management + Billing** → **Budgets**.
:::

</TabItem>
<TabItem value="portal" label="Portal">

1. Vá para **Cost Management + Billing** → **Budgets**
2. Clique em **+ Add**
3. Defina **Amount** como $50, **Time grain** como Monthly
4. Adicione uma condição de alerta em **80%** do orçamento
5. Adicione seu email para notificações

</TabItem>
</Tabs>

## Critérios de Sucesso

- [ ] Dois grupos de recursos existem com tags adequadas (Environment, CostCenter, Owner)
- [ ] Política "Require CostCenter tag" está atribuída ao `rg-policy-prod` com efeito Deny
- [ ] Implantar um recurso sem a tag falha no `rg-policy-prod`
- [ ] Implantar um recurso com a tag tem sucesso
- [ ] Política de localizações permitidas restringe implantações para East US e West US 2
- [ ] Iniciativa de política `Contoso-Governance` foi criada com 3 políticas e atribuída ao `rg-policy-dev`
- [ ] Bloqueio CanNotDelete existe no `rg-policy-prod`
- [ ] Tentativa de excluir o grupo de recursos bloqueado falha
- [ ] Recomendações do Azure Advisor foram revisadas

## Dicas

<details>
<summary>Dica 1: Encontrando definições de política internas</summary>

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
<summary>Dica 2: Atribuindo uma política com parâmetros</summary>

```bash
# Assign "Require a tag and its value on resources"
# Built-in policy ID: 1e30110a-5ceb-460c-a204-c1c3969c6d62
RG_ID=$(az group show --name rg-policy-prod --query id -o tsv)

az policy assignment create \
  --name "require-costcenter-tag" \
  --display-name "Require CostCenter tag" \
  --policy "1e30110a-5ceb-460c-a204-c1c3969c6d62" \
  --scope "$RG_ID" \
  --params '{"tagName":{"value":"CostCenter"},"tagValue":{"value":"*"}}'
```

:::tip Dica

Atribuições de política podem levar **5-15 minutos** para entrar em vigor. Tenha paciência ao testar!
:::

</details>

<details>
<summary>Dica 3: Criando uma iniciativa de política</summary>

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
<summary>Dica 5: Verificando conformidade de política</summary>

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

## Recursos de Aprendizado

- [Visão geral do Azure Policy](https://learn.microsoft.com/en-us/azure/governance/policy/overview)
- [Definições internas do Azure Policy](https://learn.microsoft.com/en-us/azure/governance/policy/samples/built-in-policies)
- [Bloqueios de recursos](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources)
- [Usar tags para organizar recursos](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-resources)
- [Management groups](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)
- [Azure Advisor](https://learn.microsoft.com/en-us/azure/advisor/advisor-overview)

## Quebre & Conserte

Após completar o desafio, tente estes cenários de solução de problemas:

1. **Bloqueio vs. Política**: Você tem um bloqueio CanNotDelete em um grupo de recursos e uma Policy com efeito Deny nas exigências de tag. Você tenta criar um recurso sem tags. Qual bloqueia primeiro? (Resposta: A Policy é avaliada durante a implantação; bloqueios se aplicam a operações de exclusão/modificação.)

2. **Não consigo excluir nada**: Aplique um bloqueio **ReadOnly** a um grupo de recursos, depois tente adicionar um novo recurso dentro dele. O que acontece? (O bloqueio ReadOnly impede quaisquer alterações, incluindo a criação de novos recursos dentro do grupo.)

3. **Política não está funcionando**: Você atribuiu uma política Deny há 2 minutos e ela não está bloqueando nada ainda. Por quê? (A avaliação de política pode levar até 15 minutos para novas atribuições. Acione uma verificação sob demanda com `az policy state trigger-scan`.)

4. **Confusão com tag herdada**: Você marcou um grupo de recursos com `Environment=Production`, mas os recursos dentro dele não têm a tag. Isso é esperado? (Sim | tags NÃO são herdadas de grupos de recursos para recursos por padrão. Use a política `Inherit a tag from the resource group` para habilitar isso.)

## Teste seus Conhecimentos

<details>
<summary>1. Qual é a diferença entre os efeitos de política Deny, Audit e Append?</summary>

- **Deny**: Bloqueia a criação ou modificação do recurso se não estiver em conformidade. Aplicação rígida.
- **Audit**: Permite o recurso mas cria uma entrada de conformidade. Aplicação flexível | você vê violações mas não as bloqueia.
- **Append**: Adiciona automaticamente campos ao recurso durante a criação. Por exemplo, adicionar uma tag que está faltando.

Outros efeitos incluem: **AuditIfNotExists**, **DeployIfNotExists** (remediação automática), **Disabled** e **Modify**.

**Dica para o exame**: Saiba quando usar Deny vs. Audit vs. DeployIfNotExists.

</details>

<details>
<summary>2. Qual é a diferença entre uma definição de política e uma iniciativa de política?</summary>

Uma **definição de política** é uma regra única (ex: "exigir tag CostCenter").

Uma **iniciativa de política** (também chamada de **conjunto de políticas**) é uma coleção de definições de política agrupadas. Isso facilita a atribuição e o gerenciamento de múltiplas políticas relacionadas como uma única unidade.

**Exemplo**: Uma iniciativa "Governance" pode incluir: exigir tags + localizações permitidas + SKUs de VM permitidos.

</details>

<details>
<summary>3. Como funciona a hierarquia de management groups?</summary>

```
Root Management Group (Tenant Root)
├── MG-Production
│   ├── Sub-Prod-01
│   └── Sub-Prod-02
├── MG-Development
│   └── Sub-Dev-01
└── MG-Sandbox
    └── Sub-Sandbox-01
```

- Cada assinatura pertence a **exatamente um** management group
- Políticas e RBAC atribuídos em um management group são **herdados** por todos os management groups e assinaturas filhos
- Profundidade máxima: **6 níveis** (sem contar o root)
- O management group root não pode ser movido ou excluído

</details>

<details>
<summary>4. Você pode aplicar um bloqueio de recurso a um recurso específico (não apenas a um grupo de recursos)?</summary>

**Sim!** Bloqueios de recurso podem ser aplicados em três níveis:
- Nível de **assinatura** (afeta todos os grupos de recursos e recursos)
- Nível de **grupo de recursos** (afeta todos os recursos no grupo)
- Nível de **recurso individual** (afeta apenas aquele recurso)

Bloqueios são herdados | um bloqueio no nível do grupo de recursos se aplica a todos os recursos dentro dele. Para excluir um recurso bloqueado, você deve primeiro remover o bloqueio.

</details>

<details>
<summary>5. Tags são herdadas de grupos de recursos para recursos?</summary>

**Não!** Tags em um grupo de recursos **NÃO** são automaticamente herdadas pelos recursos dentro dele. Esta é uma pergunta de exame muito comum.

Para aplicar herança de tags, use a política interna **"Inherit a tag from the resource group"** com o efeito **Modify**. Esta política copiará automaticamente tags do grupo de recursos para novos recursos criados dentro dele.

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

**Próximo**: [Desafio 04 | Storage Accounts & Acesso](/docs/az-104/storage/challenge-04)
