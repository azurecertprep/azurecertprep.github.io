---
sidebar_position: 2
title: "Desafio 02: Políticas de Conditional Access"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 02: Políticas de Conditional Access

## Habilidades do exame cobertas

- Projetar e implementar políticas de Conditional Access para segurança de identidade
- Configurar Conditional Access baseado em risco (risco de entrada, risco do usuário)
- Implementar controles de acesso baseados em conformidade de dispositivo
- Configurar localizações nomeadas e políticas baseadas em localização
- Implementar força de autenticação e controles de sessão
- Solucionar problemas de avaliação de políticas de Conditional Access

## Cenário

A Contoso Ltd sofreu recentemente um ataque de credential stuffing, onde senhas comprometidas de uma violação de terceiros foram usadas para acessar o e-mail corporativo a partir de endereços IP estrangeiros. A equipe de segurança precisa implementar uma estratégia em camadas de Conditional Access que imponha restrições baseadas em localização, exija dispositivos em conformidade para aplicações sensíveis e aplique controles baseados em risco que bloqueiem ou desafiem automaticamente entradas suspeitas sem interromper usuários legítimos trabalhando a partir de locais de escritório aprovados.

---

## Pré-requisitos

- Assinatura do Azure com licença Microsoft Entra ID P2 (necessária para políticas baseadas em risco)
- Função de Security Administrator ou Conditional Access Administrator
- Azure CLI instalado e autenticado
- Licença do Microsoft Intune (para integração de conformidade de dispositivo)
- Contas de usuário de teste com MFA registrado

---

## Tarefa 1: Criar localizações nomeadas para escritórios corporativos

Defina localizações de rede confiáveis representando os escritórios corporativos da Contoso para que as políticas possam diferenciar entre acesso interno e externo.

```bash
# Create a named location for the corporate headquarters
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.ipNamedLocation",
    "displayName": "Contoso HQ - Seattle",
    "isTrusted": true,
    "ipRanges": [
      {
        "@odata.type": "#microsoft.graph.iPv4CidrRange",
        "cidrAddress": "203.0.113.0/24"
      },
      {
        "@odata.type": "#microsoft.graph.iPv4CidrRange",
        "cidrAddress": "198.51.100.0/24"
      }
    ]
  }'

# Create a named location for the branch office
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.ipNamedLocation",
    "displayName": "Contoso Branch - London",
    "isTrusted": true,
    "ipRanges": [
      {
        "@odata.type": "#microsoft.graph.iPv4CidrRange",
        "cidrAddress": "192.0.2.0/24"
      }
    ]
  }'

# Create a country-based named location for blocked regions
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" \
  --headers "Content-Type=application/json" \
  --body '{
    "@odata.type": "#microsoft.graph.countryNamedLocation",
    "displayName": "Blocked Countries",
    "countriesAndRegions": ["KP", "IR", "RU", "CN"],
    "includeUnknownCountriesAndRegions": true
  }'

# List all named locations to verify
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" \
  --headers "Content-Type=application/json" \
  --query "value[].{name:displayName, type:['@odata.type']}"
```

## Tarefa 2: Criar uma política de Conditional Access baseada em risco

Implemente uma política que bloqueie entradas de alto risco e exija MFA para entradas de risco médio.

```bash
# Create policy: Block high-risk sign-ins
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "CA001: Block high-risk sign-ins",
    "state": "enabledForReportingButNotEnforced",
    "conditions": {
      "users": {
        "includeUsers": ["All"],
        "excludeUsers": [],
        "excludeRoles": ["62e90394-69f5-4237-9190-012177145e10"]
      },
      "applications": {
        "includeApplications": ["All"]
      },
      "signInRiskLevels": ["high"]
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["block"]
    }
  }'

# Create policy: Require MFA for medium-risk sign-ins
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "CA002: Require MFA for medium-risk sign-ins",
    "state": "enabledForReportingButNotEnforced",
    "conditions": {
      "users": {
        "includeUsers": ["All"],
        "excludeRoles": ["62e90394-69f5-4237-9190-012177145e10"]
      },
      "applications": {
        "includeApplications": ["All"]
      },
      "signInRiskLevels": ["medium"]
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["mfa"]
    }
  }'

# Create policy: Require password change for high-risk users
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "CA003: Require password change for high-risk users",
    "state": "enabledForReportingButNotEnforced",
    "conditions": {
      "users": {
        "includeUsers": ["All"]
      },
      "applications": {
        "includeApplications": ["All"]
      },
      "userRiskLevels": ["high"]
    },
    "grantControls": {
      "operator": "AND",
      "builtInControls": ["mfa", "passwordChange"]
    }
  }'
```

## Tarefa 3: Criar política baseada em conformidade de dispositivo

Exija dispositivos gerenciados e em conformidade para acessar aplicações sensíveis como SharePoint e Exchange Online.

```bash
# Get the service principal IDs for Office 365 apps
# Exchange Online: 00000002-0000-0ff1-ce00-000000000000
# SharePoint Online: 00000003-0000-0ff1-ce00-000000000000

# Create policy: Require compliant device for Office 365
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "CA004: Require compliant device for Office 365",
    "state": "enabledForReportingButNotEnforced",
    "conditions": {
      "users": {
        "includeUsers": ["All"],
        "excludeGroups": []
      },
      "applications": {
        "includeApplications": [
          "00000002-0000-0ff1-ce00-000000000000",
          "00000003-0000-0ff1-ce00-000000000000"
        ]
      },
      "platforms": {
        "includePlatforms": ["all"],
        "excludePlatforms": []
      },
      "locations": {
        "includeLocations": ["All"],
        "excludeLocations": ["AllTrusted"]
      }
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["compliantDevice", "domainJoinedDevice"]
    }
  }'

# Create policy: Block legacy authentication
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "CA005: Block legacy authentication",
    "state": "enabledForReportingButNotEnforced",
    "conditions": {
      "users": {
        "includeUsers": ["All"]
      },
      "applications": {
        "includeApplications": ["All"]
      },
      "clientAppTypes": ["exchangeActiveSync", "other"]
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["block"]
    }
  }'
```

## Tarefa 4: Configurar política de bloqueio baseada em localização

Bloqueie o acesso de países não confiáveis e exija MFA de localizações fora da rede corporativa.

```bash
# Get the named location ID for blocked countries
BLOCKED_LOCATION_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations?\$filter=displayName eq 'Blocked Countries'" \
  --query "value[0].id" -o tsv)

# Create policy: Block access from blocked countries
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body "{
    \"displayName\": \"CA006: Block access from restricted countries\",
    \"state\": \"enabledForReportingButNotEnforced\",
    \"conditions\": {
      \"users\": {
        \"includeUsers\": [\"All\"],
        \"excludeRoles\": [\"62e90394-69f5-4237-9190-012177145e10\"]
      },
      \"applications\": {
        \"includeApplications\": [\"All\"]
      },
      \"locations\": {
        \"includeLocations\": [\"$BLOCKED_LOCATION_ID\"],
        \"excludeLocations\": []
      }
    },
    \"grantControls\": {
      \"operator\": \"OR\",
      \"builtInControls\": [\"block\"]
    }
  }"

# Create policy: Require MFA outside corporate network
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "CA007: Require MFA outside corporate network",
    "state": "enabledForReportingButNotEnforced",
    "conditions": {
      "users": {
        "includeUsers": ["All"]
      },
      "applications": {
        "includeApplications": ["All"]
      },
      "locations": {
        "includeLocations": ["All"],
        "excludeLocations": ["AllTrusted"]
      }
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["mfa"]
    },
    "sessionControls": {
      "signInFrequency": {
        "value": 4,
        "type": "hours",
        "isEnabled": true
      }
    }
  }'
```

## Tarefa 5: Configurar força de autenticação

Crie uma força de autenticação personalizada exigindo métodos resistentes a phishing para acesso ao portal de administração.

```bash
# Create a custom authentication strength
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/authenticationStrength/policies" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "Phishing-Resistant MFA",
    "description": "Requires FIDO2 security key or Windows Hello for Business",
    "allowedCombinations": [
      "fido2",
      "windowsHelloForBusiness",
      "x509CertificateMultiFactor"
    ]
  }'

# Get the authentication strength ID
AUTH_STRENGTH_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/authenticationStrength/policies?\$filter=displayName eq 'Phishing-Resistant MFA'" \
  --query "value[0].id" -o tsv)

# Create policy requiring phishing-resistant MFA for Azure portal
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body "{
    \"displayName\": \"CA008: Require phishing-resistant MFA for admin portals\",
    \"state\": \"enabledForReportingButNotEnforced\",
    \"conditions\": {
      \"users\": {
        \"includeRoles\": [
          \"62e90394-69f5-4237-9190-012177145e10\",
          \"e8611ab8-c189-46e8-94e1-60213ab1f814\",
          \"194ae4cb-b126-40b2-bd5b-6091b380977d\"
        ]
      },
      \"applications\": {
        \"includeApplications\": [
          \"797f4846-ba00-4fd7-ba43-dac1f8f63013\",
          \"c44b4083-3bb0-49c1-b47d-974e53cbdf3c\"
        ]
      }
    },
    \"grantControls\": {
      \"operator\": \"OR\",
      \"authenticationStrength\": {
        \"id\": \"$AUTH_STRENGTH_ID\"
      }
    }
  }"
```

## Tarefa 6: Testar e monitorar políticas usando o modo somente relatório

Avalie o impacto das políticas usando logs de entrada e o modo somente relatório antes da aplicação.

```bash
# List all Conditional Access policies and their state
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --query "value[].{name:displayName, state:state}" -o table

# Check sign-in logs for report-only policy evaluation
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$top=10&\$filter=createdDateTime ge 2025-01-01T00:00:00Z&\$select=userDisplayName,appDisplayName,conditionalAccessStatus,appliedConditionalAccessPolicies" \
  --headers "Content-Type=application/json"

# Enable a policy after validation (move from report-only to enabled)
POLICY_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies?\$filter=displayName eq 'CA005: Block legacy authentication'" \
  --query "value[0].id" -o tsv)

az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/$POLICY_ID" \
  --headers "Content-Type=application/json" \
  --body '{
    "state": "enabled"
  }'

# Use What If to test policy evaluation for a specific user
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/evaluate" \
  --headers "Content-Type=application/json" \
  --body "{
    \"userId\": \"$USER_ID\",
    \"applicationId\": \"00000002-0000-0ff1-ce00-000000000000\",
    \"ipAddress\": \"185.220.101.1\",
    \"country\": \"RU\"
  }"
```

---

## Break & Fix

### Cenário 1: Usuários bloqueados após implantação de política

Após habilitar uma política de Conditional Access exigindo dispositivos em conformidade, todos os usuários móveis perderam acesso ao Exchange Online, incluindo executivos em viagem de negócios com dispositivos pessoais.

<details>
<summary>Mostrar solução</summary>

```bash
# Immediately switch the problematic policy to report-only mode
POLICY_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies?\$filter=displayName eq 'CA004: Require compliant device for Office 365'" \
  --query "value[0].id" -o tsv)

az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/$POLICY_ID" \
  --headers "Content-Type=application/json" \
  --body '{
    "state": "enabledForReportingButNotEnforced"
  }'

# Create an exclusion group for executives/travelers
EXCLUDE_GROUP_ID=$(az ad group create \
  --display-name "CA-Exclude-Mobile-Users" \
  --mail-nickname "ca-exclude-mobile" \
  --query id -o tsv)

# Update the policy to exclude this group and add app protection as alternative
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/$POLICY_ID" \
  --headers "Content-Type=application/json" \
  --body "{
    \"state\": \"enabledForReportingButNotEnforced\",
    \"conditions\": {
      \"users\": {
        \"includeUsers\": [\"All\"],
        \"excludeGroups\": [\"$EXCLUDE_GROUP_ID\"]
      },
      \"applications\": {
        \"includeApplications\": [
          \"00000002-0000-0ff1-ce00-000000000000\",
          \"00000003-0000-0ff1-ce00-000000000000\"
        ]
      },
      \"platforms\": {
        \"includePlatforms\": [\"all\"]
      },
      \"locations\": {
        \"includeLocations\": [\"All\"],
        \"excludeLocations\": [\"AllTrusted\"]
      }
    },
    \"grantControls\": {
      \"operator\": \"OR\",
      \"builtInControls\": [\"compliantDevice\", \"compliantApplication\"]
    }
  }"
```

</details>

### Cenário 2: Política baseada em risco não disparando para contas comprometidas conhecidas

O Identity Protection detecta entradas de risco, mas a política de CA não está bloqueando-as. Usuários sinalizados como alto risco ainda conseguem entrar sem desafio.

<details>
<summary>Mostrar solução</summary>

```bash
# Check that the risk-based policy is in "enabled" state, not "report-only"
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies?\$filter=displayName eq 'CA001: Block high-risk sign-ins'" \
  --headers "Content-Type=application/json" \
  --query "value[0].state"

# Common issue: Policy is still in report-only mode
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/$POLICY_ID" \
  --headers "Content-Type=application/json" \
  --body '{
    "state": "enabled"
  }'

# Verify that Identity Protection is correctly feeding risk signals
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers?\$filter=riskLevel eq 'high'" \
  --headers "Content-Type=application/json"

# Ensure the user is not in an excluded group or role
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/$POLICY_ID" \
  --headers "Content-Type=application/json" \
  --query "{excludeUsers:conditions.users.excludeUsers, excludeGroups:conditions.users.excludeGroups, excludeRoles:conditions.users.excludeRoles}"

# Check if there's a conflicting policy granting access that takes precedence
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --query "value[?state=='enabled'].{name:displayName, grant:grantControls.builtInControls}"
```

</details>

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Uma política de Conditional Access está configurada para bloquear o acesso de localizações não confiáveis. Um usuário se conecta por uma VPN corporativa, mas ainda é bloqueado. Qual é a causa mais provável?",
    options: [
      "O endereço IP público da VPN não está incluído nas localizações nomeadas confiáveis",
      "O dispositivo do usuário não está registrado no Intune",
      "A política está no modo somente relatório",
      "O usuário não se registrou para MFA"
    ],
    correctIndex: 0,
    explanation: "Localizações nomeadas são avaliadas com base no endereço IP de origem da conexão. Se o IP de saída da VPN não estiver listado em nenhuma localização nomeada confiável, a conexão é tratada como vindo de uma localização não confiável, independentemente da rede subjacente."
  },
  {
    question: "A Contoso quer garantir que apenas métodos de autenticação resistentes a phishing sejam aceitos quando administradores acessam o portal do Azure. Qual controle de concessão do Conditional Access deve ser usado?",
    options: [
      "Exigir autenticação multifator",
      "Exigir força de autenticação (Phishing-resistant MFA)",
      "Exigir dispositivo em conformidade",
      "Exigir aplicativo cliente aprovado"
    ],
    correctIndex: 1,
    explanation: "Políticas de força de autenticação permitem especificar quais combinações de métodos de autenticação são aceitáveis. A força integrada 'Phishing-resistant MFA' exige FIDO2, Windows Hello for Business ou autenticação baseada em certificado, que são todos resistentes a ataques de phishing, ao contrário de SMS ou MFA baseado em telefone."
  },
  {
    question: "Quando múltiplas políticas de Conditional Access se aplicam a uma entrada, como seus controles de concessão são avaliados?",
    options: [
      "Apenas a política mais restritiva se aplica",
      "Apenas a primeira política correspondente se aplica",
      "Todas as políticas aplicáveis são avaliadas e TODOS os controles de concessão devem ser satisfeitos",
      "As políticas são avaliadas em ordem alfabética e o primeiro bloqueio prevalece"
    ],
    correctIndex: 2,
    explanation: "Quando múltiplas políticas de Conditional Access se aplicam a uma única entrada, TODAS as políticas são avaliadas e todos os controles de concessão exigidos de todas as políticas aplicáveis devem ser satisfeitos. Se qualquer política bloquear, a entrada é bloqueada. É por isso que o gerenciamento cuidadoso de exclusões é crítico."
  },
  {
    question: "Qual é a abordagem recomendada antes de habilitar uma nova política de Conditional Access em produção?",
    options: [
      "Habilitar a política no estado 'desabilitada' e verificar os logs após 24 horas",
      "Implantar a política no modo 'somente relatório' e analisar o impacto nos logs de entrada",
      "Criar a política em um tenant de teste e exportá-la",
      "Habilitar a política apenas durante o horário comercial"
    ],
    correctIndex: 1,
    explanation: "O modo somente relatório avalia a política contra todas as entradas e registra qual teria sido o resultado sem realmente aplicá-la. Isso permite que os administradores avaliem o impacto nos usuários antes de habilitar a aplicação, prevenindo bloqueios acidentais."
  }
]} />

## Limpeza

```bash
# Delete all Conditional Access policies created in this lab
for POLICY_NAME in "CA001" "CA002" "CA003" "CA004" "CA005" "CA006" "CA007" "CA008"; do
  POLICY_ID=$(az rest --method GET \
    --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
    --headers "Content-Type=application/json" \
    --query "value[?contains(displayName,'$POLICY_NAME')].id" -o tsv)
  if [ -n "$POLICY_ID" ]; then
    az rest --method DELETE \
      --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/$POLICY_ID"
    echo "Deleted policy: $POLICY_NAME"
  fi
done

# Delete named locations
for LOCATION_NAME in "Contoso HQ - Seattle" "Contoso Branch - London" "Blocked Countries"; do
  LOC_ID=$(az rest --method GET \
    --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations?\$filter=displayName eq '$LOCATION_NAME'" \
    --query "value[0].id" -o tsv)
  if [ -n "$LOC_ID" ]; then
    az rest --method DELETE \
      --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations/$LOC_ID"
    echo "Deleted location: $LOCATION_NAME"
  fi
done

# Delete authentication strength policy
az rest --method DELETE \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/authenticationStrength/policies/$AUTH_STRENGTH_ID"

# Delete exclusion group
az ad group delete --group "CA-Exclude-Mobile-Users"
```
