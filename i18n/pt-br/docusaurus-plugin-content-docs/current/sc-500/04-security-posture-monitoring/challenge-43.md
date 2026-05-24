---
sidebar_position: 43
title: "Desafio 43: Defender Vulnerability Management e EASM"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 43: Defender Vulnerability Management e EASM

## Habilidades do exame cobertas

- Configurar o Microsoft Defender Vulnerability Management (DVM)
- Planejar e configurar o External Attack Surface Management (EASM)
- Identificar e priorizar vulnerabilidades em todo o ambiente
- Integrar dados de vulnerabilidade com recomendações do Defender for Cloud

## Cenário

A equipe de segurança da Contoso Ltd foi encarregada de obter visibilidade tanto das vulnerabilidades internas em sua frota de servidores quanto da superfície de ataque externa visível para adversários na internet. Você deve configurar o Defender Vulnerability Management para identificar e priorizar vulnerabilidades de software, e configurar o External Attack Surface Management (EASM) para descobrir ativos expostos à internet que possam ser explorados.

---

## Pré-requisitos

- Assinatura Azure com função Owner ou Security Admin
- Azure CLI instalado e autenticado
- Defender for Servers Plan 2 habilitado (para integração com DVM)
- Pelo menos uma VM com software conhecido instalado

---

## Tarefa 1: Verificar a integração do Defender Vulnerability Management

Confirme que o DVM está ativo como parte do Defender for Servers e revise as vulnerabilidades descobertas.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-vuln-lab"
LOCATION="eastus"

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Verify Defender for Servers P2 is enabled (includes DVM)
az security pricing show --name VirtualMachines \
  --query "{Plan:name, Tier:pricingTier, SubPlan:subPlan}" -o table

# List vulnerability assessment findings via Sub-Assessments
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/subAssessments?api-version=2019-01-01-preview" \
  --query "value[?properties.status.code=='Unhealthy'].{CVE:properties.id, Severity:properties.status.severity, Description:properties.displayName}" -o table \
  | head -20

# Get vulnerability summary per resource
az graph query -q "
  securityresources
  | where type == 'microsoft.security/assessments/subassessments'
  | where properties.status.code == 'Unhealthy'
  | extend severity = tostring(properties.additionalData.severity)
  | summarize VulnCount=count() by severity
  | order by VulnCount desc
" -o table
```

## Tarefa 2: Consultar o inventário de software

Use a API de segurança para listar o software descoberto e identificar versões desatualizadas.

```bash
# Query software inventory across VMs using Resource Graph
az graph query -q "
  securityresources
  | where type == 'microsoft.security/assessments/subassessments'
  | where properties.category == 'Software'
  | extend software = tostring(properties.displayName),
           version = tostring(properties.additionalData.version),
           cve = tostring(properties.id)
  | project software, version, cve
  | take 30
" -o table

# Find VMs with critical vulnerabilities
az graph query -q "
  securityresources
  | where type == 'microsoft.security/assessments/subassessments'
  | where properties.status.code == 'Unhealthy'
  | where properties.additionalData.severity == 'Critical'
  | extend resourceId = tostring(properties.resourceDetails.id)
  | summarize CriticalVulns=count() by resourceId
  | order by CriticalVulns desc
  | take 10
" -o table
```

## Tarefa 3: Criar uma linha de base de avaliação de vulnerabilidades

Configure exceções para riscos aceitos para reduzir o ruído de alertas.

```bash
# Create a vulnerability assessment rule to suppress a known accepted risk
# This marks a specific CVE as "Not Applicable" for a resource
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Compute/virtualMachines/vm-contoso-prod01/providers/Microsoft.Security/assessments/vulnerabilityAssessment/rules/CVE-2023-0001?api-version=2019-01-01-preview" \
  --body '{
    "properties": {
      "status": {
        "code": "NotApplicable",
        "cause": "AcceptedRisk",
        "description": "Compensating control in place - network segmentation prevents exploitation"
      },
      "expiresOn": "2025-12-31T00:00:00Z"
    }
  }' 2>/dev/null || echo "Note: Replace CVE-2023-0001 with an actual CVE from your environment"

echo "Baseline rule created - CVE will be suppressed in findings"
```

## Tarefa 4: Implantar o External Attack Surface Management (EASM)

Crie um workspace EASM para descobrir os ativos da Contoso expostos à internet.

```bash
# Register the EASM resource provider
az provider register --namespace Microsoft.Easm --wait

# Create an EASM workspace
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Easm/workspaces/easm-contoso?api-version=2024-03-01-preview" \
  --body "{
    \"location\": \"${LOCATION}\",
    \"properties\": {}
  }"

# Verify EASM workspace creation
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Easm/workspaces/easm-contoso?api-version=2024-03-01-preview" \
  --query "{Name:name, Location:location, State:properties.provisioningState}" -o table
```

## Tarefa 5: Configurar seeds de descoberta do EASM

Adicione seeds de descoberta (domínios, faixas de IP) para iniciar o mapeamento da superfície externa.

```bash
# Get the EASM workspace endpoint
EASM_ENDPOINT=$(az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Easm/workspaces/easm-contoso?api-version=2024-03-01-preview" \
  --query "properties.dataPlaneEndpoint" -o tsv)

echo "EASM Data Plane Endpoint: ${EASM_ENDPOINT}"

# Create a discovery group with seed assets
# Note: Uses the EASM data plane API
az rest --method PUT \
  --uri "${EASM_ENDPOINT}/discoGroups/contoso-discovery?api-version=2024-03-01-preview" \
  --body '{
    "description": "Contoso external discovery",
    "seeds": [
      {"kind": "domain", "name": "contoso.com"},
      {"kind": "domain", "name": "contoso.io"},
      {"kind": "ipBlock", "name": "203.0.113.0/24"}
    ],
    "frequencyMilliseconds": 604800000
  }' \
  --headers "Content-Type=application/json" 2>/dev/null || echo "Note: Replace domains with actual Contoso domains"

# Run the discovery
az rest --method POST \
  --uri "${EASM_ENDPOINT}/discoGroups/contoso-discovery:run?api-version=2024-03-01-preview" \
  --body '{}' 2>/dev/null || echo "Discovery initiated"
```

## Tarefa 6: Revisar ativos descobertos pelo EASM

Consulte os ativos descobertos e suas pontuações de risco.

```bash
# List discovered assets (after discovery completes)
az rest --method GET \
  --uri "${EASM_ENDPOINT}/assets?api-version=2024-03-01-preview&filter=state='confirmed'" \
  --query "value[].{Name:name, Kind:kind, Priority:priority, CreatedDate:createdDate}" -o table 2>/dev/null || echo "Note: Results appear after discovery scan completes (may take hours)"

# Query high-priority assets
az rest --method GET \
  --uri "${EASM_ENDPOINT}/assets?api-version=2024-03-01-preview&filter=priority='high'" \
  --query "value[].{Name:name, Kind:kind, Reason:reason}" -o table 2>/dev/null || echo "Query high-priority external assets"

# Get summary of attack surface
az rest --method GET \
  --uri "${EASM_ENDPOINT}/reports/assets:getSummary?api-version=2024-03-01-preview" 2>/dev/null || echo "Attack surface summary will be available after first discovery"

echo ""
echo "EASM discoveries include:"
echo "  - Domains and subdomains"
echo "  - IP addresses and CIDR ranges"
echo "  - SSL certificates (expiry, weak algorithms)"
echo "  - Open ports and services"
echo "  - Web applications and technologies"
echo "  - Associated organizations"
```

---

## Quebra & conserta

### Cenário 1: Avaliação de vulnerabilidades não mostra resultados para uma VM

Uma VM está em execução há uma semana com Defender for Servers P2 habilitado, mas mostra zero vulnerabilidades.

<details>
<summary>Mostrar solução</summary>

```bash
# Check if the VM has been scanned
az graph query -q "
  securityresources
  | where type == 'microsoft.security/assessments'
  | where properties.displayName contains 'vulnerability'
  | where properties.resourceDetails.Id contains 'vm-contoso'
  | project Status=properties.status.code, LastScanned=properties.status.statusChangeDate
" -o table

# Common causes:
# 1. Agentless scanning hasn't completed first cycle (up to 24h)
# 2. VM is powered off (agentless scanning requires running VM snapshot)
# 3. VM OS is not supported for agentless scanning

# Check VM power state
az vm get-instance-view --resource-group $RG_NAME --name "vm-contoso-prod01" \
  --query "instanceView.statuses[?starts_with(code,'PowerState')].displayStatus" -o tsv

# Verify agentless scanning extension is enabled
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/pricings/VirtualMachines?api-version=2024-01-01" \
  --query "properties.extensions[?name=='AgentlessVmScanning'].isEnabled" -o tsv

# If agent-based is preferred, install the Qualys extension
az vm extension set \
  --resource-group $RG_NAME \
  --vm-name "vm-contoso-prod01" \
  --name QualysAgent \
  --publisher Qualys
```

</details>

### Cenário 2: Descoberta do EASM não retorna ativos

O grupo de descoberta foi criado e executado, mas nenhum ativo está sendo descoberto.

<details>
<summary>Mostrar solução</summary>

```bash
# Check discovery group status
az rest --method GET \
  --uri "${EASM_ENDPOINT}/discoGroups/contoso-discovery?api-version=2024-03-01-preview" 2>/dev/null

# Common causes:
# 1. Discovery is still running (can take 24-48 hours for full scan)
# 2. Seed domains don't resolve or are parked domains
# 3. IP ranges don't have reverse DNS or hosted services

# Check discovery run status
az rest --method GET \
  --uri "${EASM_ENDPOINT}/discoGroups/contoso-discovery/runs?api-version=2024-03-01-preview" \
  --query "value[0].{State:state, Started:startedDate, Completed:completedDate}" -o table 2>/dev/null

# Verify seeds are reachable
nslookup contoso.com
curl -s -o /dev/null -w "%{http_code}" https://contoso.com

# Try adding more specific seeds (subdomains, known IPs)
# Assets in 'candidate' state need manual confirmation
az rest --method GET \
  --uri "${EASM_ENDPOINT}/assets?api-version=2024-03-01-preview&filter=state='candidate'" 2>/dev/null
```

</details>

### Cenário 3: Exceção de linha de base de vulnerabilidade expirou, mas CVE continua suprimido

Uma exceção de vulnerabilidade foi configurada para expirar, mas as descobertas permanecem suprimidas após a data de expiração.

<details>
<summary>Mostrar solução</summary>

```bash
# Check the rule's current status and expiry
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Compute/virtualMachines/vm-contoso-prod01/providers/Microsoft.Security/assessments/vulnerabilityAssessment/rules?api-version=2019-01-01-preview" \
  --query "value[].{CVE:name, Status:properties.status.code, Expires:properties.expiresOn}"

# The issue is that rule expiry evaluation is not real-time
# It processes during the next assessment scan cycle

# Force a fresh assessment by triggering a new scan
# For agentless: wait for next scan cycle (every 12-24 hours)
# For agent-based: restart the assessment agent

# To immediately remove the suppression:
az rest --method DELETE \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Compute/virtualMachines/vm-contoso-prod01/providers/Microsoft.Security/assessments/vulnerabilityAssessment/rules/CVE-2023-0001?api-version=2019-01-01-preview"

echo "Rule deleted - CVE will appear in next scan results"
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a principal diferença entre o Defender Vulnerability Management (DVM) e o External Attack Surface Management (EASM)?",
    options: [
      "O DVM escaneia recursos internos em busca de vulnerabilidades; o EASM descobre ativos expostos à internet visíveis para atacantes externos",
      "O DVM é apenas para Azure; o EASM é para multicloud",
      "O DVM é gratuito; o EASM requer uma licença separada",
      "O DVM substitui o EASM; eles não podem ser usados juntos"
    ],
    correctIndex: 0,
    explanation: "O DVM foca em descobrir e priorizar vulnerabilidades de software em recursos internos/gerenciados (VMs, contêineres). O EASM adota a perspectiva de um atacante, descobrindo todos os ativos expostos à internet associados a uma organização que poderiam ser alvos externos."
  },
  {
    question: "Como o EASM descobre ativos associados a uma organização?",
    options: [
      "Escaneando segmentos de rede interna",
      "Partindo de ativos seed (domínios, IPs) e descobrindo recursivamente infraestrutura relacionada por meio de DNS, WHOIS, certificados e web crawling",
      "Lendo inventários de recursos do Azure",
      "Integrando-se com o CMDB da organização"
    ],
    correctIndex: 1,
    explanation: "O EASM parte de ativos seed (domínios, blocos de IP, hosts conhecidos) e descobre recursivamente infraestrutura relacionada seguindo relacionamentos por meio de registros DNS, dados WHOIS, SANs de certificados SSL, links de páginas web e outras técnicas de OSINT."
  },
  {
    question: "Qual plano do Defender for Servers inclui o Microsoft Defender Vulnerability Management como capacidade integrada?",
    options: [
      "Apenas o tier gratuito",
      "Plan 1 (P1)",
      "Plan 2 (P2)",
      "Requer uma licença standalone separada independentemente do plano"
    ],
    correctIndex: 2,
    explanation: "O Defender for Servers Plan 2 inclui o Defender Vulnerability Management como capacidade integrada. O P1 fornece avaliação básica de vulnerabilidades, mas o P2 adiciona o conjunto completo de recursos do DVM, incluindo inventário de software, extensões de navegador, certificados e linhas de base de segurança."
  },
  {
    question: "O que acontece quando uma descoberta do EASM encontra um ativo no estado 'candidate'?",
    options: [
      "Ele é automaticamente adicionado ao inventário confirmado",
      "Ele requer revisão manual e confirmação antes de aparecer no inventário da superfície de ataque",
      "Ele é imediatamente sinalizado como um risco de segurança",
      "Ele é excluído após 30 dias se não for confirmado"
    ],
    correctIndex: 1,
    explanation: "Ativos no estado 'candidate' foram descobertos por mapeamento de relacionamentos, mas requerem revisão humana para confirmar que pertencem à organização. Isso evita falsos positivos de infraestrutura compartilhada, CDNs ou serviços de terceiros aparecendo na superfície de ataque."
  }
]} />

## Limpeza

```bash
# Delete EASM workspace
az rest --method DELETE \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Easm/workspaces/easm-contoso?api-version=2024-03-01-preview"

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait

echo "Cleanup complete - EASM workspace and resources deleted"
```
