---
sidebar_position: 28
title: "Desafio 28: Segurança de IA – Entra Agent ID (Conditional Access, Raio de Explosão, Gerenciamento de Acesso)"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 28: Segurança de IA – Entra Agent ID (Conditional Access, Raio de Explosão, Gerenciamento de Acesso)

## Habilidades do exame cobertas

- Configurar Microsoft Entra Agent ID para gerenciamento de identidade de agentes de IA
- Aplicar políticas de Conditional Access a agentes de IA
- Limitar o raio de explosão de identidades de agentes de IA comprometidos
- Implementar acesso com privilégio mínimo para agentes de IA usando Entra ID
- Monitorar e auditar atividades de autenticação e autorização de agentes de IA

## Cenário

A Contoso Ltd implantou 15 agentes de IA personalizados em todas as unidades de negócios — incluindo agentes para atendimento ao cliente, helpdesk de TI e análise financeira. O CISO identificou que esses agentes atualmente usam service principals com privilégios excessivos e permissões amplas da Graph API. Após um incidente recente em que uma credencial de agente comprometida expôs dados de clientes, você deve implementar o Entra Agent ID para criar identidades dedicadas de agentes com Conditional Access, permissões com escopo definido e contenção de raio de explosão.

---

## Pré-requisitos

- 🔒 **Licença necessária**: Microsoft Entra ID P2 + Microsoft Entra Workload ID Premium
- Função de Global Administrator ou Application Administrator
- Função de Conditional Access Administrator
- Acesso ao centro de administração do Microsoft Entra
- Azure CLI com comandos `az ad` disponíveis

---

## Tarefa 1: Criar identidades dedicadas com Entra Agent ID

Crie identidades gerenciadas especificamente para agentes de IA usando Entra Agent ID, substituindo service principals compartilhados.

1. Navegue até **Microsoft Entra admin center** → **Applications** → **Agent identities** (Preview)
2. Clique em **+ New agent identity**
3. Configure a identidade do agente:
   - **Name**: "CS-Agent-CustomerService-Prod"
   - **Description**: "Customer service AI agent - Production"
   - **Owner**: Grupo da equipe de Segurança de TI
   - **Business unit**: Customer Operations
   - **Risk classification**: High (acessa PII de clientes)

```bash
# Register a workload identity for the AI agent
az ad app create \
    --display-name "CS-Agent-CustomerService-Prod" \
    --sign-in-audience "AzureADMyOrg" \
    --notes "Entra Agent ID - Customer Service AI Agent"

# Get the application ID
APP_ID=$(az ad app list --display-name "CS-Agent-CustomerService-Prod" --query "[0].appId" -o tsv)

# Create a service principal for the agent
az ad sp create --id $APP_ID

# Add identifying tags for agent governance
az ad app update --id $APP_ID \
    --set "tags=['AIAgent','AgentID','CustomerService','HighRisk']"

# Configure the agent identity with federated credentials (for workload identity)
az ad app federated-credential create --id $APP_ID \
    --parameters '{
        "name": "copilot-studio-federation",
        "issuer": "https://login.microsoftonline.com/{tenant-id}/v2.0",
        "subject": "agent:cs-agent-customerservice-prod",
        "audiences": ["api://AzureADTokenExchange"],
        "description": "Federated credential for Copilot Studio agent"
    }'
```

---

## Tarefa 2: Aplicar políticas de Conditional Access a identidades de agentes

Crie políticas de Conditional Access que restrinjam como e de onde agentes de IA podem se autenticar.

1. Navegue até **Microsoft Entra admin center** → **Protection** → **Conditional Access**
2. Clique em **+ Create new policy**
3. Configure "AI Agent - Restrict Authentication":

```bash
# Create a named location for allowed agent authentication sources
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" \
    --body '{
        "@odata.type": "#microsoft.graph.ipNamedLocation",
        "displayName": "Approved Agent Infrastructure IPs",
        "isTrusted": true,
        "ipRanges": [
            {"@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "10.0.0.0/8"},
            {"@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "172.16.0.0/12"}
        ]
    }'
```

4. Configure a política de Conditional Access:

```bash
# Create Conditional Access policy for AI agents
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
    --body '{
        "displayName": "AI Agent - Location and Risk Restriction",
        "state": "enabledForReportingButNotEnforced",
        "conditions": {
            "clientApplications": {
                "includeServicePrincipals": ["all"],
                "servicePrincipalFilter": {
                    "mode": "include",
                    "rule": "CustomSecurityAttribute.AgentClassification -eq \"AIAgent\""
                }
            },
            "locations": {
                "includeLocations": ["All"],
                "excludeLocations": ["approved-agent-infrastructure-location-id"]
            },
            "servicePrincipalRiskLevels": ["high", "medium"]
        },
        "grantControls": {
            "operator": "OR",
            "builtInControls": ["block"]
        }
    }'
```

5. Crie uma segunda política para restrições de tempo de vida do token:

```bash
# Restrict token lifetime for agent identities
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
    --body '{
        "displayName": "AI Agent - Short Token Lifetime",
        "state": "enabled",
        "conditions": {
            "clientApplications": {
                "includeServicePrincipals": ["all"],
                "servicePrincipalFilter": {
                    "mode": "include",
                    "rule": "CustomSecurityAttribute.AgentClassification -eq \"AIAgent\""
                }
            }
        },
        "sessionControls": {
            "signInFrequency": {
                "value": 1,
                "type": "hours",
                "isEnabled": true
            }
        }
    }'
```

---

## Tarefa 3: Implementar permissões de privilégio mínimo na Graph API

Defina o escopo das permissões do agente para o mínimo necessário usando concessões de permissão de aplicativo.

```bash
# Get the service principal object ID
SP_ID=$(az ad sp list --display-name "CS-Agent-CustomerService-Prod" --query "[0].id" -o tsv)

# Remove overprivileged permissions (if existing)
# List current permissions
az ad app permission list --id $APP_ID --output table

# Remove broad permissions like User.Read.All, Mail.ReadWrite
az ad app permission delete --id $APP_ID \
    --api "00000003-0000-0000-c000-000000000000" \
    --api-permissions "User.Read.All=Role Mail.ReadWrite=Role"

# Grant minimal required permissions
# Customer service agent only needs:
# - User.ReadBasic.All (read basic user profiles)
# - Chat.Read (read chat messages for context)
az ad app permission add --id $APP_ID \
    --api "00000003-0000-0000-c000-000000000000" \
    --api-permissions "User.ReadBasic.All=Role"

az ad app permission add --id $APP_ID \
    --api "00000003-0000-0000-c000-000000000000" \
    --api-permissions "Chat.Read=Role"

# Grant admin consent for the limited permissions
az ad app permission admin-consent --id $APP_ID
```

```bash
# Configure application access policy to restrict mailbox access
# This limits which mailboxes the agent can access even with granted permissions
Connect-ExchangeOnline

# Create a mail-enabled security group for allowed mailboxes
New-DistributionGroup -Name "Agent-Accessible-Mailboxes" \
    -Type "Security" \
    -ManagedBy "securityteam@contoso.com"

# Restrict the agent to only access specific mailboxes
New-ApplicationAccessPolicy \
    -AppId $APP_ID \
    -PolicyScopeGroupId "Agent-Accessible-Mailboxes" \
    -AccessRight "RestrictAccess" \
    -Description "Restrict CS agent to customer service mailboxes only"
```

---

## Tarefa 4: Configurar atributos de segurança personalizados para classificação de agentes

Use atributos de segurança personalizados do Entra ID para classificar e governar identidades de agentes.

```bash
# Create custom security attribute set for AI agents
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/directory/customSecurityAttributeDefinitions" \
    --body '{
        "attributeSet": "AgentGovernance",
        "description": "AI Agent classification and risk level",
        "id": "AgentGovernance_AgentClassification",
        "isCollection": false,
        "isSearchable": true,
        "name": "AgentClassification",
        "status": "Available",
        "type": "String",
        "usePreDefinedValuesOnly": true,
        "allowedValues": [
            {"id": "AIAgent", "isActive": true},
            {"id": "AutomationBot", "isActive": true},
            {"id": "ServiceIntegration", "isActive": true}
        ]
    }'

# Create risk level attribute
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/directory/customSecurityAttributeDefinitions" \
    --body '{
        "attributeSet": "AgentGovernance",
        "description": "Agent data risk classification",
        "id": "AgentGovernance_RiskLevel",
        "isCollection": false,
        "isSearchable": true,
        "name": "RiskLevel",
        "status": "Available",
        "type": "String",
        "usePreDefinedValuesOnly": true,
        "allowedValues": [
            {"id": "Critical", "isActive": true},
            {"id": "High", "isActive": true},
            {"id": "Medium", "isActive": true},
            {"id": "Low", "isActive": true}
        ]
    }'

# Assign attributes to the agent service principal
az rest --method PATCH \
    --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID" \
    --body '{
        "customSecurityAttributes": {
            "AgentGovernance": {
                "@odata.type": "#Microsoft.DirectoryServices.CustomSecurityAttributeValue",
                "AgentClassification": "AIAgent",
                "RiskLevel": "High"
            }
        }
    }'
```

---

## Tarefa 5: Conter o raio de explosão com acesso com escopo em recursos

Limite o dano que uma identidade de agente comprometida pode causar definindo o escopo de acesso a recursos específicos.

```bash
# Create a resource group specifically for the agent's resources
az group create --name "rg-agent-customerservice" --location "eastus"

# Assign minimal RBAC role scoped to the resource group only
az role assignment create \
    --assignee $SP_ID \
    --role "Reader" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-agent-customerservice"

# Create an administrative unit for user objects the agent can manage
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/directory/administrativeUnits" \
    --body '{
        "displayName": "AU-CustomerService-Agents",
        "description": "Administrative unit scoping CS agent access to customer service users",
        "visibility": "HiddenMembership"
    }'

# Add only relevant users to the AU
AU_ID=$(az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/directory/administrativeUnits?\$filter=displayName eq 'AU-CustomerService-Agents'" \
    --query "value[0].id" -o tsv)

# Assign the agent a scoped role within the AU only
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/directory/administrativeUnits/$AU_ID/scopedRoleMembers" \
    --body '{
        "roleId": "helpdesk-administrator-role-template-id",
        "roleMemberInfo": {
            "id": "'$SP_ID'"
        }
    }'
```

```bash
# Configure credential rotation and monitoring
# Set short credential lifetime (90 days max)
az ad app credential reset --id $APP_ID \
    --years 0 \
    --end-date "$(date -d '+90 days' +%Y-%m-%d)"

# Enable workload identity recommendations
# Navigate to Entra > Workload Identities > Recommendations
# Review: "Remove unused credentials", "Replace expiring credentials"
```

---

## Tarefa 6: Monitorar atividade de identidade de agentes com logs do Entra ID

Configure monitoramento contínuo para anomalias de autenticação e comportamento suspeito de agentes.

```bash
# Query sign-in logs for agent identities
az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=servicePrincipalId eq '$SP_ID' and createdDateTime ge 2024-01-01T00:00:00Z&\$top=50" |
    jq '.value[] | {timestamp: .createdDateTime, status: .status.errorCode, ipAddress: .ipAddress, location: .location.city}'

# Create alert rule for anomalous agent behavior
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/security/alerts_v2" \
    --body '{
        "title": "Anomalous AI Agent Authentication",
        "description": "Agent identity authenticated from unexpected location",
        "severity": "high",
        "status": "new"
    }'

# Monitor workload identity risk detections
az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/identityProtection/servicePrincipalRiskDetections?\$filter=servicePrincipalId eq '$SP_ID'" |
    jq '.value[] | {riskType: .riskEventType, level: .riskLevel, detectedOn: .activityDateTime}'
```

---

## Quebra & conserta

### Cenário 1: Agente de IA bloqueado após implantação da política de Conditional Access

Após implantar a política de CA baseada em localização, o agente de atendimento ao cliente não consegue mais se autenticar e todas as interações com clientes estão falhando.

<details>
<summary>Mostrar solução</summary>

```bash
# 1. Check if the agent's hosting infrastructure IP is in the allowed list
az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" |
    jq '.value[] | select(.displayName == "Approved Agent Infrastructure IPs")'

# 2. Verify the agent's actual source IP from sign-in logs
az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=servicePrincipalId eq '$SP_ID'&\$top=5&\$orderby=createdDateTime desc" |
    jq '.value[] | {ip: .ipAddress, status: .status.errorCode, failureReason: .status.failureReason}'

# 3. Update the named location to include the agent's hosting IP
# Get the named location ID
LOCATION_ID=$(az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations?\$filter=displayName eq 'Approved Agent Infrastructure IPs'" \
    --query "value[0].id" -o tsv)

# Add the missing IP range (e.g., Azure Container Apps outbound IPs)
az rest --method PATCH \
    --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations/$LOCATION_ID" \
    --body '{
        "ipRanges": [
            {"@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "10.0.0.0/8"},
            {"@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "172.16.0.0/12"},
            {"@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "20.x.x.x/24"}
        ]
    }'

# 4. Temporarily set policy to report-only while fixing
az rest --method PATCH \
    --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/{policy-id}" \
    --body '{"state": "enabledForReportingButNotEnforced"}'
```

</details>

### Cenário 2: Credencial de agente comprometida acessando dados fora do seu escopo

Alertas de segurança mostram que a identidade do agente de atendimento ao cliente está acessando o site de Finance no SharePoint e caixas de correio de executivos — muito além do seu escopo autorizado.

<details>
<summary>Mostrar solução</summary>

```bash
# 1. IMMEDIATELY revoke all tokens for the compromised agent
az ad sp credential delete --id $SP_ID --key-id "all"

# Revoke active tokens via continuous access evaluation
az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID/revokeSignInSessions"

# 2. Disable the service principal
az ad sp update --id $SP_ID --set "accountEnabled=false"

# 3. Investigate the scope of compromise
az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=servicePrincipalId eq '$SP_ID' and createdDateTime ge $(date -d '-7 days' +%Y-%m-%dT00:00:00Z)" |
    jq '.value[] | {time: .createdDateTime, ip: .ipAddress, resource: .resourceDisplayName}'

# 4. Check what data was accessed
az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=initiatedBy/app/servicePrincipalId eq '$SP_ID'" |
    jq '.value[] | {activity: .activityDisplayName, target: .targetResources[0].displayName}'

# 5. After investigation, rotate credentials and re-enable with tighter controls
az ad app credential reset --id $APP_ID --years 0 --end-date "$(date -d '+30 days' +%Y-%m-%d)"
az ad sp update --id $SP_ID --set "accountEnabled=true"

# 6. Add continuous access evaluation enforcement
# Ensure CAE is enabled for workload identities in CA policy
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é o principal objetivo do Microsoft Entra Agent ID?",
    options: [
      "Criar contas de usuário para operadores humanos gerenciando sistemas de IA",
      "Fornecer gerenciamento dedicado do ciclo de vida de identidade para agentes de IA com controles de governança",
      "Criptografar pesos de modelos de IA armazenados no Azure",
      "Autenticar usuários finais acessando aplicações com IA"
    ],
    correctIndex: 1,
    explanation: "O Entra Agent ID fornece gerenciamento de identidade construído especificamente para agentes de IA, incluindo identidades dedicadas, Conditional Access, detecção de risco e controles de governança separados das identidades de usuários humanos."
  },
  {
    question: "Como o Conditional Access para identidades de carga de trabalho difere do Conditional Access baseado em usuário?",
    options: [
      "O CA de carga de trabalho não pode exigir MFA pois agentes não podem realizar autenticação interativa",
      "O CA de carga de trabalho é idêntico ao CA de usuário em todos os aspectos",
      "O CA de carga de trabalho só funciona com recursos Azure, não com Microsoft 365",
      "O CA de carga de trabalho não pode usar condições baseadas em localização"
    ],
    correctIndex: 0,
    explanation: "Diferente do CA baseado em usuário, o CA de identidade de carga de trabalho não pode exigir MFA (agentes se autenticam de forma não interativa). Em vez disso, ele se baseia em restrições de localização, níveis de risco, limites de tempo de vida do token e controles de bloqueio para proteger a autenticação do agente."
  },
  {
    question: "Qual é a abordagem recomendada para conter o raio de explosão de uma identidade de agente de IA comprometida?",
    options: [
      "Conceder ao agente a função de Global Administrator com acesso limitado por tempo",
      "Usar unidades administrativas, políticas de acesso de aplicativo e RBAC com escopo em recursos para limitar o que o agente pode acessar",
      "Compartilhar um único service principal entre todos os agentes para facilitar o monitoramento",
      "Desabilitar todas as políticas de Conditional Access durante a operação do agente"
    ],
    correctIndex: 1,
    explanation: "A contenção de raio de explosão combina unidades administrativas (definindo escopo de acesso ao diretório), políticas de acesso de aplicativo (limitando acesso a caixas de correio/recursos) e RBAC com escopo em recursos para garantir que um agente comprometido só possa acessar seus recursos designados."
  },
  {
    question: "Quando uma detecção de risco de identidade de carga de trabalho é acionada para um agente de IA, qual é a sequência correta de resposta a incidentes?",
    options: [
      "Excluir a identidade do agente e recriá-la do zero",
      "Revogar tokens, desabilitar o service principal, investigar logs de acesso, rotacionar credenciais e depois reabilitar com controles aprimorados",
      "Simplesmente alterar a senha do agente e continuar as operações",
      "Aguardar o risco se resolver automaticamente em 24 horas"
    ],
    correctIndex: 1,
    explanation: "A sequência correta é: revogar tokens imediatamente e desabilitar o principal para parar o ataque, investigar o que foi acessado, rotacionar credenciais e reabilitar com controles de Conditional Access mais rígidos para prevenir recorrência."
  }
]} />

## Limpeza

```bash
# Delete test agent identity
az ad app delete --id $APP_ID

# Remove resource group
az group delete --name "rg-agent-customerservice" --yes --no-wait

# Remove administrative unit
az rest --method DELETE \
    --uri "https://graph.microsoft.com/v1.0/directory/administrativeUnits/$AU_ID"

# Remove Conditional Access policies (by ID)
# az rest --method DELETE --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/{policy-id}"
```
