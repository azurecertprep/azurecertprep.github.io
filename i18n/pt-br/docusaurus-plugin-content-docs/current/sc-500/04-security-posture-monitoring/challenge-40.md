---
sidebar_position: 40
title: "Desafio 40: Avaliação de Conformidade com Frameworks de Segurança"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 40: Avaliação de Conformidade com Frameworks de Segurança

## Habilidades do exame cobertas

- Avaliar conformidade com frameworks de segurança (NIST, CIS, PCI-DSS)
- Configurar políticas de conformidade regulatória
- Projetar e gerenciar dashboards de conformidade
- Atribuir e remediar recomendações de conformidade

## Cenário

A Contoso Ltd está buscando a certificação PCI-DSS para suas cargas de trabalho de processamento de pagamentos e precisa demonstrar conformidade com NIST SP 800-53 para contratos governamentais. A equipe de conformidade precisa que você configure padrões de conformidade regulatória no Defender for Cloud, atribua iniciativas personalizadas e gere relatórios de conformidade mostrando a postura atual em relação a esses frameworks.

---

## Pré-requisitos

- Assinatura Azure com função Owner ou Security Admin
- Azure CLI instalado e autenticado
- Microsoft Defender for Cloud habilitado (pelo menos um plano)

---

## Tarefa 1: Adicionar padrões de conformidade regulatória

Atribua os padrões de conformidade PCI-DSS e NIST SP 800-53 à sua assinatura.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-compliance-lab"

# Create resource group for lab resources
az group create --name $RG_NAME --location eastus

# Assign PCI-DSS v4.0 regulatory compliance standard
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/regulatoryComplianceStandards/PCI-DSS-4.0?api-version=2024-01-01" \
  --body '{"properties": {"state": "Enabled"}}'

# Assign NIST SP 800-53 Rev. 5
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/regulatoryComplianceStandards/NIST-SP-800-53-Rev5?api-version=2024-01-01" \
  --body '{"properties": {"state": "Enabled"}}'

# List enabled compliance standards
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/regulatoryComplianceStandards?api-version=2024-01-01" \
  --query "value[?properties.state=='Enabled'].{Standard:name, State:properties.state, PassedControls:properties.passedControls, FailedControls:properties.failedControls}" -o table
```

## Tarefa 2: Revisar a postura de conformidade por controle

Examine os controles de conformidade e identifique avaliações reprovadas para PCI-DSS.

```bash
# List PCI-DSS controls and their state
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/regulatoryComplianceStandards/PCI-DSS-4.0/regulatoryComplianceControls?api-version=2024-01-01" \
  --query "value[?properties.state=='Failed'].{Control:name, Description:properties.description, PassedAssessments:properties.passedAssessments, FailedAssessments:properties.failedAssessments}" -o table \
  | head -20

# Drill into a specific control's assessments
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/regulatoryComplianceStandards/PCI-DSS-4.0/regulatoryComplianceControls/PCI-DSS-4.0-1.2/regulatoryComplianceAssessments?api-version=2024-01-01" \
  --query "value[].{Assessment:name, State:properties.state, Description:properties.description}" -o table
```

## Tarefa 3: Criar uma iniciativa de segurança personalizada

Crie uma iniciativa de política personalizada para os requisitos adicionais de conformidade da Contoso.

```bash
# Create a custom policy initiative (initiative definition)
az policy set-definition create \
  --name "contoso-data-protection" \
  --display-name "Contoso Data Protection Standard" \
  --description "Custom compliance standard for Contoso data handling requirements" \
  --definitions '[
    {
      "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/0961003e-5a0a-4549-abde-af6a37f2724d",
      "policyDefinitionReferenceId": "storageEncryption"
    },
    {
      "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/17k78e20-9358-41c9-923c-fb736d382a4d",
      "policyDefinitionReferenceId": "sqlAuditing"
    },
    {
      "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/1f314764-cb73-4fc9-b863-8eca98ac36e9",
      "policyDefinitionReferenceId": "diagnosticSettings"
    }
  ]' \
  --metadata '{"category": "Regulatory Compliance", "version": "1.0.0"}'

# Assign the initiative to the subscription
az policy assignment create \
  --name "contoso-data-protection-assignment" \
  --display-name "Contoso Data Protection Standard" \
  --policy-set-definition "contoso-data-protection" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}"
```

## Tarefa 4: Configurar isenções de conformidade

Crie uma isenção para um recurso que possui controles compensatórios implementados.

```bash
# Create a policy exemption for a specific resource with compensating controls
az policy exemption create \
  --name "legacy-storage-exemption" \
  --display-name "Legacy Storage - Compensating Controls" \
  --description "This storage account uses application-layer encryption as a compensating control" \
  --exemption-category Mitigated \
  --policy-assignment "contoso-data-protection-assignment" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}" \
  --expires-on "2025-12-31T00:00:00Z"

# List active exemptions
az policy exemption list \
  --query "[].{Name:name, Category:exemptionCategory, Expires:expiresOn, Scope:scope}" -o table
```

## Tarefa 5: Exportar dados de conformidade para auditores

Gere um relatório de conformidade e exporte os resultados das avaliações.

```bash
# Export compliance state via Resource Graph
az graph query -q "
  securityresources
  | where type == 'microsoft.security/regulatorycompliancestandards/regulatorycompliancecontrols/regulatorycomplianceassessments'
  | where properties.regulatoryComplianceStandardName == 'PCI-DSS-4.0'
  | summarize PassedCount=countif(properties.state == 'Passed'),
              FailedCount=countif(properties.state == 'Failed'),
              SkippedCount=countif(properties.state == 'Skipped')
" -o table

# Export all failed assessments for audit trail
az graph query -q "
  securityresources
  | where type == 'microsoft.security/regulatorycompliancestandards/regulatorycompliancecontrols/regulatorycomplianceassessments'
  | where properties.state == 'Failed'
  | project StandardName=properties.regulatoryComplianceStandardName,
            Control=properties.regulatoryComplianceControlName,
            AssessmentName=name,
            Description=properties.description
  | order by StandardName, Control
" --first 50 -o table
```

## Tarefa 6: Configurar monitoramento contínuo de conformidade

Configure a exportação contínua para transmitir alterações de conformidade para o Log Analytics.

```bash
# Create Log Analytics workspace for compliance data
az monitor log-analytics workspace create \
  --workspace-name "law-contoso-compliance" \
  --resource-group $RG_NAME \
  --location eastus

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name "law-contoso-compliance" \
  --resource-group $RG_NAME \
  --query id -o tsv)

# Configure continuous export for regulatory compliance
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/automations/export-compliance?api-version=2023-12-01-preview" \
  --body "{
    \"location\": \"eastus\",
    \"properties\": {
      \"isEnabled\": true,
      \"scopes\": [{\"scopePath\": \"/subscriptions/${SUBSCRIPTION_ID}\"}],
      \"sources\": [{
        \"eventSource\": \"RegulatoryComplianceAssessment\",
        \"ruleSets\": [{
          \"rules\": [{
            \"propertyJPath\": \"properties.state\",
            \"propertyType\": \"String\",
            \"expectedValue\": \"Failed\",
            \"operator\": \"Equals\"
          }]
        }]
      }],
      \"actions\": [{
        \"actionType\": \"LogAnalytics\",
        \"workspaceResourceId\": \"${WORKSPACE_ID}\"
      }]
    }
  }"

echo "Continuous export configured - compliance failures will stream to Log Analytics"
```

---

## Quebre & Conserte

### Cenário 1: Padrão de conformidade mostra "Não avaliado" para todos os controles

Você atribuiu o PCI-DSS, mas todos os controles mostram "Não avaliado" com 0 aprovados e 0 reprovados.

<details>
<summary>Mostrar solução</summary>

```bash
# "Not assessed" means no resources match the controls' scope
# This happens when:
# 1. The subscription has no resources (deploy something to assess)
# 2. Defender plans are not enabled for the resource types

# Verify Defender plans are enabled
az security pricing list --query "[].{Plan:name, Tier:pricingTier}" -o table

# Deploy a test resource to trigger assessments
az storage account create \
  --name "stcontosocomptest$(date +%s)" \
  --resource-group $RG_NAME \
  --sku Standard_LRS \
  --location eastus

# Assessments take 4-12 hours to populate after resource creation
# Force a reassessment trigger
az security assessment-metadata list --query "length(@)"
```

</details>

### Cenário 2: Iniciativa personalizada não aparece no dashboard de conformidade

Você criou e atribuiu uma iniciativa personalizada, mas ela não aparece em Conformidade Regulatória.

<details>
<summary>Mostrar solução</summary>

```bash
# Custom initiatives need specific metadata to appear in compliance dashboard
# The metadata must include "ASC": "true" and category "Regulatory Compliance"

# Update the initiative with correct metadata
az policy set-definition update \
  --name "contoso-data-protection" \
  --metadata '{
    "category": "Regulatory Compliance",
    "ASC": "true",
    "version": "1.0.0"
  }'

# Also verify the assignment exists and is not in a failed state
az policy assignment show \
  --name "contoso-data-protection-assignment" \
  --query "{State:provisioningState, EnforcementMode:enforcementMode}" -o table

# If state is failed, check for missing role assignments
# The managed identity needs Reader role for assessment
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual propriedade de metadados é necessária para que uma iniciativa de política personalizada apareça no dashboard de Conformidade Regulatória do Defender for Cloud?",
    options: [
      "\"category\": \"Security Center\"",
      "\"ASC\": \"true\" com category \"Regulatory Compliance\"",
      "\"compliance\": \"enabled\"",
      "\"MDC\": \"true\""
    ],
    correctIndex: 1,
    explanation: "Para que uma iniciativa personalizada apareça no dashboard de Conformidade Regulatória, os metadados devem incluir '\"ASC\": \"true\"' e a categoria deve ser definida como 'Regulatory Compliance'."
  },
  {
    question: "Qual é a diferença entre uma categoria de isenção de política 'Waiver' e 'Mitigated'?",
    options: [
      "Waiver significa excluído permanentemente; Mitigated significa excluído temporariamente",
      "Waiver significa que o requisito não é aplicável; Mitigated significa que existem controles compensatórios",
      "Não há diferença; ambas as categorias funcionam de forma idêntica",
      "Waiver é para produção; Mitigated é apenas para dev/test"
    ],
    correctIndex: 1,
    explanation: "Uma isenção 'Waiver' indica que a organização aceita o risco e o requisito não se aplica. 'Mitigated' indica que existem controles compensatórios que satisfazem a intenção da política."
  },
  {
    question: "Como a exportação contínua do Defender for Cloud ajuda na auditoria de conformidade?",
    options: [
      "Gera relatórios PDF de conformidade automaticamente",
      "Transmite alterações nas avaliações de conformidade para o Log Analytics ou Event Hub para monitoramento contínuo",
      "Envia resumos semanais por e-mail para auditores",
      "Remedia automaticamente recursos não conformes"
    ],
    correctIndex: 1,
    explanation: "A exportação contínua transmite alterações no estado das avaliações de conformidade para um workspace do Log Analytics ou Event Hub em tempo quase real, permitindo monitoramento contínuo de conformidade, alertas e geração de trilha de auditoria."
  }
]} />

## Limpeza

```bash
# Remove policy assignment
az policy assignment delete --name "contoso-data-protection-assignment"

# Remove policy exemption
az policy exemption delete --name "legacy-storage-exemption" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}"

# Remove custom initiative
az policy set-definition delete --name "contoso-data-protection"

# Remove compliance automation
az rest --method DELETE \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/automations/export-compliance?api-version=2023-12-01-preview"

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait

echo "Cleanup complete"
```
