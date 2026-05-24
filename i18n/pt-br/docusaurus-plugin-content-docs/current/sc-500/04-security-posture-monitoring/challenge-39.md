---
sidebar_position: 39
title: "Desafio 39: Defender CSPM – Identificação de Riscos e Caminhos de Ataque"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 39: Defender CSPM – Identificação de Riscos e Caminhos de Ataque

## Habilidades do exame cobertas

- Configurar definições de ambiente no Microsoft Defender for Cloud
- Avaliar a postura de segurança usando CSPM
- Identificar e remediar riscos usando análise de caminhos de ataque
- Configurar e gerenciar Cloud Security Posture Management (CSPM)

## Cenário

A Contoso Ltd implantou várias cargas de trabalho no Azure, incluindo máquinas virtuais, contas de armazenamento e bancos de dados. O CISO levantou preocupações sobre caminhos de exposição desconhecidos que poderiam permitir que um invasor alcançasse dados sensíveis. Você foi solicitado a habilitar o Defender CSPM, avaliar a postura de segurança da organização através do Secure Score e identificar caminhos de ataque que expõem ativos críticos a ameaças voltadas para a internet.

---

## Pré-requisitos

- Assinatura Azure com função Owner ou Security Admin
- Azure CLI instalado e autenticado (`az login`)
- Pelo menos uma VM em execução e uma conta de armazenamento na assinatura

---

## Tarefa 1: Habilitar o plano Defender CSPM

Habilite o plano Defender CSPM na sua assinatura para ativar a análise de caminhos de ataque e os recursos do Cloud Security Graph.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Enable Defender CSPM plan
az security pricing create \
  --name CloudPosture \
  --tier Standard

# Verify the plan is enabled
az security pricing show \
  --name CloudPosture \
  --query "{Name:name, Tier:pricingTier, SubPlan:subPlan}" -o table
```

## Tarefa 2: Configurar extensões do CSPM

Habilite a verificação sem agente e a descoberta de dados sensíveis para alimentar a análise de caminhos de ataque.

```bash
# Enable agentless scanning extension via REST API
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/pricings/CloudPosture?api-version=2024-01-01" \
  --body '{
    "properties": {
      "pricingTier": "Standard",
      "extensions": [
        {"name": "AgentlessVmScanning", "isEnabled": "True"},
        {"name": "AgentlessDiscoveryForKubernetes", "isEnabled": "True"},
        {"name": "SensitiveDataDiscovery", "isEnabled": "True"},
        {"name": "ContainerRegistriesVulnerabilityAssessments", "isEnabled": "True"}
      ]
    }
  }'

# Verify extensions are active
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/pricings/CloudPosture?api-version=2024-01-01" \
  --query "properties.extensions[].{Name:name, Enabled:isEnabled}" -o table
```

## Tarefa 3: Revisar Secure Score e recomendações

Consulte o Secure Score atual e liste as principais recomendações de segurança.

```bash
# Get current Secure Score
az security secure-score list \
  --query "[].{Name:name, Current:score.current, Max:score.max, Percentage:score.percentage}" -o table

# List active security recommendations
az security assessment list \
  --query "[?properties.status.code=='Unhealthy'].{Resource:properties.resourceDetails.id, Recommendation:properties.displayName, Severity:properties.metadata.severity}" -o table \
  | head -30

# Get recommendations by severity
az security assessment list \
  --query "[?properties.status.code=='Unhealthy' && properties.metadata.severity=='High'].{Recommendation:properties.displayName, Resource:properties.resourceDetails.id}" -o table
```

## Tarefa 4: Identificar caminhos de ataque

Use o Cloud Security Graph para consultar caminhos de ataque que alcançam dados sensíveis.

```bash
# List attack paths via REST API
az rest --method POST \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/attackPaths?api-version=2024-01-01" \
  --body '{}' \
  --query "value[].{DisplayName:properties.displayName, Description:properties.description, RiskLevel:properties.riskLevel}" -o table

# Query attack paths targeting internet-exposed VMs
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/attackPaths?api-version=2024-01-01" \
  --query "value[?contains(properties.displayName, 'internet')].{Path:properties.displayName, Risk:properties.riskLevel, EntryPoint:properties.entryPointEntityInformation.entityName}" -o table
```

## Tarefa 5: Consultar o Cloud Security Graph

Use o security graph para encontrar VMs com IP público e vulnerabilidades de alta severidade.

```bash
# Cloud Security Graph query - find internet-exposed VMs with vulnerabilities
az rest --method POST \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/securityGraph?api-version=2024-01-01" \
  --body '{
    "query": {
      "queryType": "securityGraph",
      "query": "where type == \"microsoft.compute/virtualmachines\" | where properties.networkProfile.publicIpAddresses != null | project name, resourceGroup, vulnerabilityCount = properties.vulnerabilitySummary.highSeverityCount"
    }
  }'
```

## Tarefa 6: Remediar uma recomendação de alto risco

Aplique uma regra de governança para atribuir automaticamente recomendações e remediar uma descoberta.

```bash
# Create a governance rule to assign high-severity findings
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/governanceRules/HighSeverityRule?api-version=2022-01-01-preview" \
  --body '{
    "properties": {
      "displayName": "Auto-assign high severity findings",
      "description": "Assign high severity recommendations to security team",
      "rulePriority": 100,
      "isDisabled": false,
      "ruleType": "Integrated",
      "sourceResourceType": "Assessments",
      "conditionSets": [
        {
          "conditions": [
            {"property": "properties.metadata.severity", "value": ["High"], "operator": "In"}
          ]
        }
      ],
      "ownerSource": {
        "type": "ByTag",
        "value": "SecurityOwner"
      },
      "governanceEmailNotification": {
        "disableManagerEmailNotification": false,
        "disableOwnerEmailNotification": false
      },
      "remediationTimeframe": "7.00:00:00"
    }
  }'

echo "Governance rule created - high severity findings will be auto-assigned"
```

---

## Quebra & conserta

### Cenário 1: Caminhos de ataque não aparecem após habilitar o CSPM

Você habilitou o Defender CSPM há 30 minutos, mas nenhum caminho de ataque aparece no portal. As extensões mostram que estão habilitadas.

<details>
<summary>Mostrar solução</summary>

```bash
# Attack paths require agentless scanning to complete its first scan (up to 24 hours)
# Verify extensions are properly enabled
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/pricings/CloudPosture?api-version=2024-01-01" \
  --query "properties.extensions[?name=='AgentlessVmScanning'].isEnabled" -o tsv

# Check if there are resources to scan
az vm list --query "[].{Name:name, RG:resourceGroup, PowerState:powerState}" -o table

# Attack path analysis requires:
# 1. AgentlessVmScanning enabled (wait up to 24h for first scan)
# 2. At least one VM or resource with a discoverable vulnerability
# 3. A network path from an entry point to a target
# Force a rescan if needed by disabling/re-enabling the extension
```

</details>

### Cenário 2: Secure Score mostra 0% apesar de ter recursos

A assinatura possui vários recursos, mas o Secure Score exibe 0%.

<details>
<summary>Mostrar solução</summary>

```bash
# Check if Defender plans are enabled (Secure Score requires at least one plan)
az security pricing list \
  --query "[?pricingTier=='Standard'].name" -o tsv

# If no plans show Standard, enable at minimum the free tier assessments
az security pricing create --name VirtualMachines --tier Standard

# Also verify the subscription is registered with Security provider
az provider show --namespace Microsoft.Security --query "registrationState" -o tsv

# If not registered:
az provider register --namespace Microsoft.Security

# Secure Score takes 4-8 hours to populate after initial enablement
# Verify assessments are being generated
az security assessment list --query "length(@)"
```

</details>

### Cenário 3: Regra de governança não dispara notificações por e-mail

Você criou uma regra de governança, mas os membros da equipe não estão recebendo e-mails de atribuição.

<details>
<summary>Mostrar solução</summary>

```bash
# Verify the governance rule configuration
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/governanceRules?api-version=2022-01-01-preview" \
  --query "value[].{Name:properties.displayName, Disabled:properties.isDisabled, EmailOwner:properties.governanceEmailNotification.disableOwnerEmailNotification}" -o table

# Common issues:
# 1. ownerSource is ByTag but resources don't have the specified tag
# Check resources for the SecurityOwner tag
az resource list --query "[?tags.SecurityOwner != null].{Name:name, Owner:tags.SecurityOwner}" -o table

# 2. Fix: Tag a resource with the security owner
az resource tag --ids <resource-id> --tags SecurityOwner=security-team@contoso.com

# 3. Verify email notification is not disabled
# disableOwnerEmailNotification should be false
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "O que é necessário para o Defender CSPM gerar análise de caminhos de ataque?",
    options: [
      "Apenas o tier Gratuito do Defender for Cloud",
      "Plano Standard do Defender CSPM com verificação sem agente habilitada",
      "Agente do Log Analytics instalado em todas as VMs",
      "Azure Monitor Agent com DCR configurado"
    ],
    correctIndex: 1,
    explanation: "A análise de caminhos de ataque requer o plano Standard do Defender CSPM com a extensão AgentlessVmScanning habilitada. Ela usa verificação sem agente para descobrir vulnerabilidades sem necessidade de agentes nas VMs."
  },
  {
    question: "Quanto tempo normalmente leva para os caminhos de ataque aparecerem após habilitar o Defender CSPM?",
    options: [
      "Imediatamente (em minutos)",
      "1-2 horas",
      "Até 24 horas para o primeiro ciclo de verificação",
      "7 dias"
    ],
    correctIndex: 2,
    explanation: "Após habilitar o Defender CSPM, o primeiro ciclo de verificação sem agente pode levar até 24 horas para ser concluído. Os caminhos de ataque são gerados após os dados da verificação serem processados pelo Cloud Security Graph."
  },
  {
    question: "Qual componente no Defender CSPM mapeia relacionamentos entre recursos para identificar riscos de movimentação lateral?",
    options: [
      "Motor do Azure Policy",
      "Cloud Security Graph",
      "Azure Resource Graph",
      "Microsoft Sentinel UEBA"
    ],
    correctIndex: 1,
    explanation: "O Cloud Security Graph mapeia relacionamentos entre recursos de nuvem (conectividade de rede, permissões, vulnerabilidades) para identificar potenciais caminhos de ataque que um adversário poderia usar para movimentação lateral."
  },
  {
    question: "Uma regra de governança no Defender for Cloud pode atribuir automaticamente recomendações com base em quais critérios?",
    options: [
      "Apenas tipo de recurso",
      "Apenas nível de severidade",
      "Severidade, tipo de recurso ou condições personalizadas com atribuição de proprietário baseada em tags",
      "Apenas o escopo da assinatura"
    ],
    correctIndex: 2,
    explanation: "Regras de governança suportam conjuntos de condições flexíveis incluindo severidade, tipo de recurso e condições personalizadas. Elas atribuem propriedade via tags, usuários específicos ou gerentes, e definem prazos de remediação."
  }
]} />

## Limpeza

```bash
# Disable Defender CSPM (stops billing)
az security pricing create --name CloudPosture --tier Free

# Remove governance rule
az rest --method DELETE \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/governanceRules/HighSeverityRule?api-version=2022-01-01-preview"

echo "Cleanup complete - Defender CSPM disabled"
```
