---
sidebar_position: 50
title: "Desafio 50: Resposta Integrada a Ameaças – Sentinel + Defender XDR + Security Copilot"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 50: Resposta Integrada a Ameaças – Sentinel + Defender XDR + Security Copilot

## Habilidades do exame cobertas

- Projetar fluxos de trabalho integrados de detecção e resposta a ameaças
- Criar regras de análise do Sentinel com KQL
- Investigar incidentes no portal unificado do Defender XDR
- Usar o Security Copilot para enriquecimento de incidentes e orientação de resposta
- Correlacionar alertas entre cargas de trabalho de identidade, endpoint e nuvem
- Configurar sincronização bidirecional entre Sentinel e Defender XDR

## Cenário

O SOC da Contoso Ltd recebe um alerta: uma conta de usuário apresenta sinais de comprometimento — login suspeito de uma localização incomum seguido de acesso a recursos sensíveis do Azure. Você deve rastrear esse ataque por todo o pipeline de detecção-investigação-resposta usando as três plataformas trabalhando em conjunto: **Sentinel** detecta e correlaciona, **Defender XDR** fornece capacidades profundas de investigação, e **Security Copilot** enriquece a análise e recomenda ações.

Este desafio simula um fluxo de trabalho realista de triagem de incidentes que um analista SOC seguiria durante uma investigação ativa.

---

## Pré-requisitos

- Assinatura do Azure com role Owner ou Contributor
- Workspace do Microsoft Sentinel com data connectors ativos
- Microsoft Defender XDR habilitado com licenciamento E5 security
- 🔒 **Licença necessária**: Unidades de computação do Security Copilot (para Tarefas 4-5)
- Azure CLI com extensão `sentinel` instalada
- Proficiência em KQL para criação de regras de análise
- Permissões: Security Administrator, Microsoft Sentinel Contributor

---

## Tarefa 1: Criar regras de análise do Sentinel para detecção de ataque multi-estágio

Construa regras de detecção que identifiquem os indicadores iniciais de comprometimento.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-unified-soc"
LOCATION="eastus"
WORKSPACE_NAME="law-contoso-unified"

# Create resource group and workspace
az group create --name $RG_NAME --location $LOCATION

az monitor log-analytics workspace create \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION

# Enable Sentinel on the workspace
az sentinel onboarding-state create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --name "default"

# Get workspace resource ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name $WORKSPACE_NAME \
  --resource-group $RG_NAME \
  --query id -o tsv)
```

### Regra de Análise 1: Login suspeito seguido de acesso a recursos do Azure

```bash
# Create scheduled analytics rule for impossible travel + resource access
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "rule-suspicious-signin-resource-access" \
  --scheduled \
  --name "Suspicious Sign-in Followed by Azure Resource Access" \
  --description "Detects sign-ins from unusual locations followed by access to sensitive Azure resources within 1 hour" \
  --severity "High" \
  --enabled true \
  --query "let timeframe = 1h;
let suspicious_signins = SigninLogs
| where TimeGenerated > ago(timeframe)
| where ResultType == 0
| where RiskLevelDuringSignIn in ('high', 'medium')
| where LocationDetails.city != '' 
| project SignInTime=TimeGenerated, UserPrincipalName, IPAddress, 
          City=tostring(LocationDetails.city), 
          Country=tostring(LocationDetails.countryOrRegion),
          RiskLevel=RiskLevelDuringSignIn, AppDisplayName;
let resource_access = AzureActivity
| where TimeGenerated > ago(timeframe)
| where CategoryValue == 'Administrative'
| where OperationNameValue has_any ('Microsoft.KeyVault', 'Microsoft.Storage', 'Microsoft.Sql')
| project AccessTime=TimeGenerated, Caller, ResourceGroup, 
          OperationName=OperationNameValue, ResourceId;
suspicious_signins
| join kind=inner (resource_access) on \$left.UserPrincipalName == \$right.Caller
| where AccessTime > SignInTime
| where datetime_diff('minute', AccessTime, SignInTime) < 60
| project SignInTime, AccessTime, UserPrincipalName, IPAddress, City, Country, 
          RiskLevel, OperationName, ResourceId" \
  --query-frequency "PT15M" \
  --query-period "PT1H" \
  --trigger-operator "GreaterThan" \
  --trigger-threshold 0 \
  --tactics "InitialAccess" "Collection" \
  --techniques "T1078" "T1530"
```

### Regra de Análise 2: Acesso a credenciais após comprometimento inicial

Crie uma regra Near Real-Time (NRT) para detectar coleta de credenciais pós-comprometimento:

```bash
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "rule-post-compromise-cred-access" \
  --nrt \
  --name "Post-Compromise Credential Access Attempt" \
  --description "NRT rule detecting Key Vault secret access or password changes after a risky sign-in" \
  --severity "High" \
  --enabled true \
  --query "let risky_users = SigninLogs
| where TimeGenerated > ago(15m)
| where RiskLevelDuringSignIn in ('high')
| where ResultType == 0
| distinct UserPrincipalName;
let keyvault_access = AzureDiagnostics
| where TimeGenerated > ago(15m)
| where ResourceProvider == 'MICROSOFT.KEYVAULT'
| where OperationName in ('SecretGet', 'SecretList', 'KeyGet', 'CertificateGet')
| project TimeGenerated, CallerIPAddress, 
          identity_claim_upn_s, OperationName, ResourceId;
let password_changes = AuditLogs
| where TimeGenerated > ago(15m)
| where OperationName has_any ('Change password', 'Reset password', 'Add app role assignment')
| extend InitiatedBy = tostring(InitiatedBy.user.userPrincipalName)
| project TimeGenerated, InitiatedBy, OperationName, TargetResources;
union
  (keyvault_access | where identity_claim_upn_s in (risky_users) 
   | project TimeGenerated, User=identity_claim_upn_s, Action=OperationName, Resource=ResourceId),
  (password_changes | where InitiatedBy in (risky_users)
   | project TimeGenerated, User=InitiatedBy, Action=OperationName, Resource=tostring(TargetResources))" \
  --tactics "CredentialAccess" "Persistence" \
  --techniques "T1555" "T1098"
```

### Regra de Análise 3: Detecção de movimento lateral

```bash
az sentinel alert-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "rule-lateral-movement-detection" \
  --scheduled \
  --name "Lateral Movement via Azure Resource Access Escalation" \
  --description "Detects when a compromised account accesses resources across multiple subscriptions or resource groups" \
  --severity "Medium" \
  --enabled true \
  --query "AzureActivity
| where TimeGenerated > ago(1h)
| where CategoryValue == 'Administrative'
| where ActivityStatusValue == 'Success'
| summarize 
    ResourceGroupCount = dcount(ResourceGroup),
    SubscriptionCount = dcount(SubscriptionId),
    OperationCount = count(),
    ResourceGroups = make_set(ResourceGroup, 10),
    Operations = make_set(OperationNameValue, 10)
    by Caller, bin(TimeGenerated, 5m)
| where ResourceGroupCount > 3 or SubscriptionCount > 1
| where OperationCount > 10
| project TimeGenerated, Caller, ResourceGroupCount, SubscriptionCount, 
          OperationCount, ResourceGroups, Operations" \
  --query-frequency "PT5M" \
  --query-period "PT1H" \
  --trigger-operator "GreaterThan" \
  --trigger-threshold 0 \
  --tactics "LateralMovement" "Discovery" \
  --techniques "T1580" "T1087"
```

---

## Tarefa 2: Configurar sincronização bidirecional Sentinel-Defender XDR

Garanta que os incidentes fluam entre Sentinel e Defender XDR para investigação unificada.

```bash
# Enable the Microsoft Defender XDR data connector in Sentinel
az sentinel data-connector create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --data-connector-id "MicrosoftThreatProtection" \
  --microsoft-threat-protection \
  --tenant-id $(az account show --query tenantId -o tsv) \
  --data-types-incidents-state "Enabled" \
  --data-types-alerts-state "Enabled"
```

**Verificação no portal para fila unificada de incidentes:**

1. Navegue até o [portal do Microsoft Defender](https://security.microsoft.com)
2. Vá para **Settings** → **Microsoft Sentinel** → **Bi-directional sync**
3. Verifique:

| Configuração | Valor Esperado |
|---------|---------------|
| Status de sincronização | Active |
| Workspace do Sentinel | law-contoso-unified |
| Direção de sincronização de incidentes | Bi-directional |
| Sincronização de alertas | Enabled |
| Sincronização de entidades | Enabled |

4. Navegue até **Incidents** no portal do Defender
5. Confirme que você vê incidentes tanto do Sentinel quanto do Defender XDR em uma única fila
6. Verifique que mudanças de status de incidentes sincronizam entre os portais

---

## Tarefa 3: Simular e investigar o ataque no Defender XDR

Percorra o fluxo de trabalho de investigação quando as regras de análise disparam.

**Cenário: O ataque se desenrola**

Um funcionário da Contoso (`alex.johnson@contoso.com`) teve suas credenciais comprometidas via email de phishing. O atacante:
1. Faz login de uma localização incomum (Europa Oriental)
2. Acessa o Azure Key Vault para recuperar chaves de conta de armazenamento
3. Baixa dados sensíveis de uma conta de armazenamento
4. Tenta criar um novo usuário administrador para persistência

**Investigação no Portal do Defender XDR:**

1. Navegue até **Incidents & alerts** → **Incidents**
2. Localize o incidente: "Multi-stage attack: Suspicious sign-in + credential access"
3. Clique no incidente para abrir a visualização de investigação

**Aba Incident Overview:**
- Revise a linha do tempo do incidente
- Observe os alertas correlacionados de múltiplas fontes:
  - Sentinel: "Suspicious Sign-in Followed by Azure Resource Access"
  - Sentinel: "Post-Compromise Credential Access Attempt"
  - Defender for Cloud Apps: "Activity from infrequent country"
  - Entra ID Protection: "Risky sign-in detected"

**Aba Evidence & Response:**
- Revise as entidades afetadas:
  - Usuário: alex.johnson@contoso.com
  - IP: 185.x.x.x (ISP da Europa Oriental)
  - Recursos: Key Vault `kv-contoso-prod`, Storage `stcontosoprod`

**Advanced Hunting (KQL no Defender XDR):**

```kql
// Trace all activities by the compromised user in the attack window
let attackStart = datetime(2025-01-15T08:30:00Z);
let attackEnd = datetime(2025-01-15T10:00:00Z);
let compromisedUser = "alex.johnson@contoso.com";
union CloudAppEvents, IdentityLogonEvents, AADSignInEventsBeta
| where Timestamp between (attackStart .. attackEnd)
| where AccountUpn == compromisedUser or 
        AccountObjectId == "user-object-id"
| project Timestamp, ActionType, Application, 
          IPAddress, Country, DeviceName
| sort by Timestamp asc
```

```kql
// Check for persistence mechanisms created by the attacker
let compromisedUser = "alex.johnson@contoso.com";
CloudAppEvents
| where Timestamp > ago(4h)
| where AccountUpn == compromisedUser
| where ActionType in ("Add member to role.", "Add user.", 
                        "Add service principal.", "Consent to application.")
| project Timestamp, ActionType, RawEventData, IPAddress
```

```kql
// Identify all resources accessed during the attack
let compromisedUser = "alex.johnson@contoso.com";
CloudAppEvents
| where Timestamp > ago(4h)
| where AccountUpn == compromisedUser
| where Application in ("Microsoft Azure", "Azure Key Vault", "Azure Storage")
| summarize Actions=make_set(ActionType), Count=count() by Application
```

**Resultados da Investigação Automatizada:**
- Revise a aba Automated Investigation
- Observe quaisquer ações de remediação automática executadas (se configuradas)
- Revise o grafo de evidências mostrando a cadeia de ataque

---

## Tarefa 4: Enriquecer a investigação com Security Copilot

Use o Security Copilot para acelerar a investigação e obter insights mais profundos.

**Abra o Security Copilot e execute prompts de investigação:**

```text
Prompt 1 - Incident Summary:
"Summarize Defender XDR incident #12345 including all correlated alerts, 
affected entities, and the attack timeline. Map each step to MITRE ATT&CK."
```

**A resposta esperada do Copilot inclui:**
- Narrativa do ataque com linha do tempo
- Mapeamento MITRE: T1078 (Valid Accounts) → T1555 (Credential Access) → T1530 (Data from Cloud Storage) → T1098 (Account Manipulation)
- Resumo das entidades afetadas
- Avaliação de severidade

```text
Prompt 2 - User Risk Assessment:
"What is the full risk profile for alex.johnson@contoso.com? Include recent 
sign-in activity, risk detections, group memberships, privileged roles, and 
any previous security incidents involving this account."
```

```text
Prompt 3 - Threat Intelligence Enrichment:
"Enrich IP address 185.x.x.x with threat intelligence. What threat actors 
are associated with this IP? What campaigns has it been seen in? What is its 
current reputation across multiple TI feeds?"
```

```text
Prompt 4 - Impact Assessment:
"What Azure resources did alex.johnson@contoso.com have access to? List all 
Key Vault secrets that were accessed, storage accounts touched, and any data 
that may have been exfiltrated. Estimate the blast radius."
```

```text
Prompt 5 - KQL Generation for Deeper Investigation:
"Write a KQL query for Sentinel that finds all sign-ins from the IP range 
185.x.x.0/24 across all user accounts in the last 30 days. I want to know 
if other accounts were targeted by the same threat actor."
```

**KQL esperado do Copilot:**

```kql
// Generated by Security Copilot - NL2KQL plugin
let suspiciousRange = "185.";
SigninLogs
| where TimeGenerated > ago(30d)
| where IPAddress startswith suspiciousRange
| summarize 
    SignInCount = count(),
    UniqueUsers = dcount(UserPrincipalName),
    Users = make_set(UserPrincipalName, 20),
    SuccessCount = countif(ResultType == 0),
    FailureCount = countif(ResultType != 0),
    FirstSeen = min(TimeGenerated),
    LastSeen = max(TimeGenerated)
    by IPAddress
| where UniqueUsers > 1 or FailureCount > 5
| sort by SignInCount desc
```

```text
Prompt 6 - Containment Recommendations:
"Based on this investigation, provide specific containment and remediation 
steps in priority order. Include both immediate actions and long-term fixes."
```

**Recomendações esperadas do Copilot:**
1. **Imediato**: Revogar todas as sessões de alex.johnson@contoso.com
2. **Imediato**: Redefinir senha e exigir novo registro de MFA
3. **Imediato**: Rotacionar todos os segredos do Key Vault que foram acessados
4. **Curto prazo**: Bloquear o range de IP do atacante no nível de rede
5. **Curto prazo**: Revisar e remover quaisquer mecanismos de persistência (novos usuários, consentimentos de app)
6. **Longo prazo**: Implementar PIM para acesso ao Key Vault
7. **Longo prazo**: Habilitar Conditional Access exigindo dispositivo em conformidade para acesso ao Key Vault

---

## Tarefa 5: Executar contenção e criar automação para incidentes futuros

Com base nas recomendações do Copilot, execute a contenção e construa automação.

```bash
# Immediate containment: Revoke user sessions
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/users/alex.johnson@contoso.com/revokeSignInSessions"

# Block the attacker IP in Conditional Access (via Graph API)
# First, create a named location for the malicious IP range
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" \
  --body '{
    "@odata.type": "#microsoft.graph.ipNamedLocation",
    "displayName": "Blocked - Attack Source IPs",
    "isTrusted": false,
    "ipRanges": [
      {"@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "185.0.0.0/24"}
    ]
  }'
```

**Criar regra de automação do Sentinel para incidentes similares futuros:**

```bash
# Create automation rule to auto-enrich and escalate similar incidents
az sentinel automation-rule create \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --automation-rule-id "auto-rule-compromise-response" \
  --name "Auto-Respond to Account Compromise Incidents" \
  --order 1 \
  --triggering-logic \
    is-enabled=true \
    triggers-on="Incidents" \
    triggers-when="Created" \
    conditions='[
      {
        "conditionType": "Property",
        "conditionProperties": {
          "propertyName": "IncidentSeverity",
          "operator": "Equals",
          "propertyValues": ["High"]
        }
      },
      {
        "conditionType": "Property", 
        "conditionProperties": {
          "propertyName": "IncidentTactics",
          "operator": "Contains",
          "propertyValues": ["InitialAccess", "CredentialAccess"]
        }
      }
    ]' \
  --actions '[
    {
      "actionType": "ModifyProperties",
      "order": 1,
      "actionConfiguration": {
        "severity": "High",
        "status": "Active",
        "owner": {
          "objectId": "soc-tier2-group-object-id",
          "assignedTo": "SOC Tier 2"
        }
      }
    },
    {
      "actionType": "RunPlaybook",
      "order": 2,
      "actionConfiguration": {
        "logicAppResourceId": "/subscriptions/'$SUBSCRIPTION_ID'/resourceGroups/'$RG_NAME'/providers/Microsoft.Logic/workflows/playbook-compromise-response",
        "tenantId": "'$(az account show --query tenantId -o tsv)'"
      }
    }
  ]'
```

**Criar o KQL de resposta do playbook para o Logic App:**

```kql
// This query runs inside the playbook to gather context
let incidentEntities = dynamic(["alex.johnson@contoso.com"]);
let lookback = 4h;
// Gather all activities by compromised entities
let allActivities = union SigninLogs, AuditLogs, AzureActivity
| where TimeGenerated > ago(lookback)
| where UserPrincipalName in (incidentEntities) or Caller in (incidentEntities);
// Generate containment summary
allActivities
| summarize 
    TotalEvents = count(),
    SignIns = countif(Type == "SigninLogs"),
    AdminActions = countif(Type == "AzureActivity"),
    DirectoryChanges = countif(Type == "AuditLogs"),
    UniqueIPs = dcount(IPAddress),
    IPAddresses = make_set(IPAddress, 20)
    by UserPrincipalName
```

---

## Quebra & conserta

### Cenário 1: A regra de análise do Sentinel dispara mas o Defender XDR não mostra o incidente

A regra de análise dispara corretamente no Sentinel, mas o incidente não aparece na fila unificada de incidentes do Defender XDR.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** A sincronização bidirecional não está configurada corretamente, ou a severidade do incidente não atende o limiar de sincronização.

**Correção:**
1. Navegue até o portal do Defender → **Settings** → **Microsoft Sentinel**
2. Verifique que a sincronização bidirecional está **Active**
3. Verifique se há um filtro de severidade:
   - Garanta que "Sync all severities" está selecionado (não apenas High/Critical)
4. Verifique se o workspace do Sentinel está conectado:
   ```bash
   az sentinel data-connector show \
     --resource-group $RG_NAME \
     --workspace-name $WORKSPACE_NAME \
     --data-connector-id "MicrosoftThreatProtection"
   ```
5. Se desconectado, recrie o data connector
6. Aguarde 5-10 minutos e dispare a regra novamente para verificar a sincronização

</details>

### Cenário 2: Security Copilot retorna "I don't have access to that incident"

Ao consultar sobre o incidente #12345 do Defender XDR, o Security Copilot diz que não consegue acessar o incidente.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** A conta do usuário não tem permissões no workspace do Defender XDR, ou o plugin do Defender XDR está mal configurado.

**Correção:**
1. Verifique que o usuário possui no mínimo a role **Security Reader** no Defender XDR:
   - Navegue até o portal do Defender → **Settings** → **Permissions** → **Roles**
   - Confirme que o grupo de segurança do usuário tem as permissões apropriadas
2. Verifique a configuração do plugin do Security Copilot:
   - Navegue até Security Copilot → **Settings** → **Plugins**
   - Verifique que o plugin do Defender XDR mostra **Connected**
   - Re-autentique se necessário
3. Verifique se o ID do incidente está correto:
   - Defender XDR usa IDs numéricos enquanto o Sentinel usa GUIDs
   - Garanta que você está usando o ID de incidente do Defender XDR, não o ID do Sentinel
4. Teste com um prompt mais simples: "List my recent incidents in Defender XDR"

</details>

### Cenário 3: Regra NRT não dispara apesar de haver eventos correspondentes

A regra de análise Near Real-Time para acesso a credenciais não dispara mesmo havendo eventos de acesso ao Key Vault correspondentes nos logs.

<details>
<summary>Mostrar solução</summary>

**Causa raiz:** Os logs de diagnóstico do Key Vault não estão sendo enviados para o workspace do Sentinel, ou há um atraso na ingestão de logs.

**Correção:**
1. Verifique se os diagnósticos do Key Vault estão configurados:
   ```bash
   az monitor diagnostic-settings list \
     --resource "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG_NAME/providers/Microsoft.KeyVault/vaults/kv-contoso-prod"
   ```
2. Se não existem configurações de diagnóstico, crie-as:
   ```bash
   az monitor diagnostic-settings create \
     --name "send-to-sentinel" \
     --resource "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG_NAME/providers/Microsoft.KeyVault/vaults/kv-contoso-prod" \
     --workspace $WORKSPACE_ID \
     --logs '[{"category":"AuditEvent","enabled":true}]'
   ```
3. Verifique o status da regra NRT:
   ```bash
   az sentinel alert-rule show \
     --resource-group $RG_NAME \
     --workspace-name $WORKSPACE_NAME \
     --rule-id "rule-post-compromise-cred-access"
   ```
4. Verifique o horário da última execução da regra e quaisquer erros no blade de saúde
5. Regras NRT executam aproximadamente a cada ~1 minuto — aguarde o próximo ciclo de execução

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Em um SOC integrado usando Sentinel, Defender XDR e Security Copilot, qual plataforma é primariamente responsável por correlacionar alertas de múltiplas fontes em um incidente unificado?",
    options: [
      "O Security Copilot correlaciona alertas usando IA",
      "O Microsoft Sentinel correlaciona alertas via regras de análise e fusion",
      "O Defender XDR só correlaciona alertas de endpoint",
      "Cada plataforma lida com correlação independentemente sem integração"
    ],
    correctIndex: 1,
    explanation: "O Microsoft Sentinel é o SIEM que correlaciona alertas de múltiplas fontes (Defender XDR, Entra ID, Azure Activity, etc.) em incidentes unificados via regras de análise, regras de fusion e correlação baseada em ML. O Defender XDR correlaciona dentro do seu escopo, e a sincronização bidirecional unifica as filas de incidentes."
  },
  {
    question: "Um analista SOC deseja que o Security Copilot escreva uma consulta KQL baseada em linguagem natural. Qual plugin deve estar habilitado?",
    options: [
      "Plugin do Microsoft Sentinel",
      "Plugin do Microsoft Defender XDR",
      "Plugin Natural Language to KQL",
      "Plugin do Microsoft Entra"
    ],
    correctIndex: 2,
    explanation: "O plugin Natural Language to KQL (NL2KQL) traduz especificamente perguntas em linguagem natural em consultas KQL que podem ser executadas em um workspace Log Analytics especificado. Enquanto o plugin do Sentinel fornece dados de incidentes, o NL2KQL lida com a geração de consultas."
  },
  {
    question: "Qual tipo de regra de análise do Sentinel fornece a detecção mais rápida com alertas em tempo quase real?",
    options: [
      "Regra agendada com frequência de 5 minutos",
      "Regra Fusion",
      "Regra Near Real-Time (NRT)",
      "Regra Microsoft Security"
    ],
    correctIndex: 2,
    explanation: "Regras Near Real-Time (NRT) executam aproximadamente a cada 1 minuto e fornecem o tempo de detecção mais rápido no Sentinel. Regras agendadas têm frequência mínima de 5 minutos. Regras NRT são ideais para detecções de alta prioridade onde cada minuto conta."
  },
  {
    question: "Durante a contenção de incidentes, qual é o método correto da Graph API para impedir imediatamente um usuário comprometido de acessar quaisquer recursos?",
    options: [
      "DELETE na conta do usuário",
      "POST para /users/{id}/revokeSignInSessions",
      "PATCH no usuário para definir accountEnabled=false",
      "POST para /users/{id}/invalidateAllRefreshTokens"
    ],
    correctIndex: 1,
    explanation: "POST para /users/{id}/revokeSignInSessions invalida imediatamente todos os refresh tokens e cookies de sessão do usuário, forçando re-autenticação em todos os lugares. Esta é a ação de contenção mais rápida. Desabilitar a conta (PATCH accountEnabled=false) também é eficaz mas impede o usuário de re-autenticar mesmo após redefinição de senha."
  },
  {
    question: "Na sincronização bidirecional entre Sentinel e Defender XDR, o que acontece quando um analista fecha um incidente no Defender XDR?",
    options: [
      "Nada - mudanças só fluem do Sentinel para o Defender",
      "O incidente também é fechado no Sentinel automaticamente",
      "O incidente permanece aberto no Sentinel com uma flag de conflito de sincronização",
      "O incidente do Sentinel é excluído"
    ],
    correctIndex: 1,
    explanation: "Sincronização bidirecional significa que mudanças de status em qualquer direção são propagadas. Quando um analista fecha um incidente no Defender XDR, o incidente correspondente no Sentinel também é fechado automaticamente, mantendo consistência entre ambas as plataformas."
  }
]} />

---

## Limpeza

```bash
# Remove analytics rules
az sentinel alert-rule delete \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "rule-suspicious-signin-resource-access" --yes

az sentinel alert-rule delete \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "rule-post-compromise-cred-access" --yes

az sentinel alert-rule delete \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --rule-id "rule-lateral-movement-detection" --yes

# Remove automation rules
az sentinel automation-rule delete \
  --resource-group $RG_NAME \
  --workspace-name $WORKSPACE_NAME \
  --automation-rule-id "auto-rule-compromise-response" --yes

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait
```
