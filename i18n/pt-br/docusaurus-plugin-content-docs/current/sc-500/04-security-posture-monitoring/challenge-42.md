---
sidebar_position: 42
title: "Desafio 42: Conectores Multicloud (AWS, GCP) no Defender for Cloud"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 42: Conectores Multicloud (AWS, GCP) no Defender for Cloud

## Habilidades do exame cobertas

- Configurar conectores de segurança multicloud para AWS e GCP
- Gerenciar avaliação de postura de segurança entre nuvens
- Avaliar proteção de cargas de trabalho multicloud
- Monitorar recomendações de segurança entre provedores de nuvem

## Cenário

A Contoso Ltd opera um ambiente híbrido de nuvem com cargas de trabalho no Azure, AWS e Google Cloud Platform. O CISO exige visibilidade unificada de segurança por meio do Microsoft Defender for Cloud. Você deve configurar conectores multicloud para integrar contas AWS e projetos GCP, habilitando CSPM e proteção de cargas de trabalho nas três nuvens a partir de um painel único.

---

## Pré-requisitos

- Assinatura Azure com função Owner ou Security Admin
- Azure CLI instalado e autenticado
- (Opcional) Conta AWS com acesso de administrador para configuração completa do conector
- (Opcional) Projeto GCP com acesso de proprietário para configuração completa do conector
- Plano Defender CSPM ou Defender for Servers habilitado

---

## Tarefa 1: Entender a arquitetura dos conectores multicloud

Revise os requisitos dos conectores e crie o grupo de recursos para recursos multicloud.

```bash
# Set variables
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_NAME="rg-contoso-multicloud"
LOCATION="eastus"

# Create resource group for multicloud connectors
az group create --name $RG_NAME --location $LOCATION

# List current security connectors
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Security/securityConnectors?api-version=2024-03-01-preview" \
  --query "value[].{Name:name, Cloud:properties.environmentName, Hierarchy:properties.hierarchyIdentifier}" -o table

# Check which Defender plans support multicloud
az security pricing list \
  --query "[?pricingTier=='Standard'].{Plan:name, Tier:pricingTier}" -o table
```

## Tarefa 2: Criar um conector AWS

Configure um conector de segurança para integrar uma conta AWS ao Defender for Cloud.

```bash
# Create AWS security connector with CSPM and Servers protection
# Replace AWS_ACCOUNT_ID with your actual AWS account ID
AWS_ACCOUNT_ID="123456789012"

az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Security/securityConnectors/contoso-aws-connector?api-version=2024-03-01-preview" \
  --body "{
    \"location\": \"${LOCATION}\",
    \"properties\": {
      \"environmentName\": \"AWS\",
      \"hierarchyIdentifier\": \"${AWS_ACCOUNT_ID}\",
      \"environmentData\": {
        \"environmentType\": \"AwsAccount\",
        \"accountType\": \"SingleAccount\"
      },
      \"offerings\": [
        {
          \"offeringType\": \"CspmMonitorAws\",
          \"nativeCloudConnection\": {
            \"cloudRoleArn\": \"arn:aws:iam::${AWS_ACCOUNT_ID}:role/CspmMonitorAws\"
          }
        },
        {
          \"offeringType\": \"DefenderForServersAws\",
          \"defenderForServers\": {
            \"cloudRoleArn\": \"arn:aws:iam::${AWS_ACCOUNT_ID}:role/DefenderForServersAws\"
          },
          \"arcAutoProvisioning\": {
            \"enabled\": true,
            \"cloudRoleArn\": \"arn:aws:iam::${AWS_ACCOUNT_ID}:role/ArcAutoProvisioningRole\"
          },
          \"subPlan\": \"P2\"
        }
      ]
    }
  }"

echo "AWS connector created - configure IAM roles in AWS console to complete setup"
```

## Tarefa 3: Criar um conector GCP

Configure um conector de segurança para integrar um projeto GCP.

```bash
# Create GCP security connector
# Replace GCP_PROJECT_ID and GCP_PROJECT_NUMBER with actual values
GCP_PROJECT_ID="contoso-prod-project"
GCP_PROJECT_NUMBER="1234567890"

az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Security/securityConnectors/contoso-gcp-connector?api-version=2024-03-01-preview" \
  --body "{
    \"location\": \"${LOCATION}\",
    \"properties\": {
      \"environmentName\": \"GCP\",
      \"hierarchyIdentifier\": \"${GCP_PROJECT_NUMBER}\",
      \"environmentData\": {
        \"environmentType\": \"GcpProject\",
        \"projectDetails\": {
          \"projectId\": \"${GCP_PROJECT_ID}\",
          \"projectNumber\": \"${GCP_PROJECT_NUMBER}\"
        }
      },
      \"offerings\": [
        {
          \"offeringType\": \"CspmMonitorGcp\",
          \"nativeCloudConnection\": {
            \"serviceAccountEmailAddress\": \"defender-cspm@${GCP_PROJECT_ID}.iam.gserviceaccount.com\",
            \"workloadIdentityProviderId\": \"cspm-provider\"
          }
        },
        {
          \"offeringType\": \"DefenderForServersGcp\",
          \"defenderForServers\": {
            \"serviceAccountEmailAddress\": \"defender-servers@${GCP_PROJECT_ID}.iam.gserviceaccount.com\",
            \"workloadIdentityProviderId\": \"servers-provider\"
          },
          \"arcAutoProvisioning\": {
            \"enabled\": true
          },
          \"subPlan\": \"P2\"
        }
      ]
    }
  }"

echo "GCP connector created - configure workload identity federation in GCP to complete setup"
```

## Tarefa 4: Verificar a saúde do conector e o status de integração

Verifique o status dos conectores multicloud e seus recursos descobertos.

```bash
# Check connector status
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Security/securityConnectors?api-version=2024-03-01-preview" \
  --query "value[].{Name:name, Cloud:properties.environmentName, Account:properties.hierarchyIdentifier}" -o table

# Query cross-cloud security recommendations using Resource Graph
az graph query -q "
  securityresources
  | where type == 'microsoft.security/assessments'
  | where properties.status.code == 'Unhealthy'
  | extend cloud = tostring(properties.resourceDetails.Source)
  | summarize count() by cloud
" -o table

# List AWS resources discovered by Defender for Cloud
az graph query -q "
  securityresources
  | where type == 'microsoft.security/assessments'
  | where properties.resourceDetails.Source == 'Aws'
  | project ResourceId=properties.resourceDetails.Id,
            Recommendation=properties.displayName,
            Severity=properties.metadata.severity
  | take 20
" -o table
```

## Tarefa 5: Configurar integração com AWS CloudTrail

Configure o encaminhamento de logs do CloudTrail para monitoramento de eventos de segurança.

```bash
# Configure the AWS connector to include CloudTrail monitoring
az rest --method PATCH \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Security/securityConnectors/contoso-aws-connector?api-version=2024-03-01-preview" \
  --body "{
    \"properties\": {
      \"offerings\": [
        {
          \"offeringType\": \"CspmMonitorAws\",
          \"nativeCloudConnection\": {
            \"cloudRoleArn\": \"arn:aws:iam::${AWS_ACCOUNT_ID}:role/CspmMonitorAws\"
          }
        },
        {
          \"offeringType\": \"DefenderForServersAws\",
          \"defenderForServers\": {
            \"cloudRoleArn\": \"arn:aws:iam::${AWS_ACCOUNT_ID}:role/DefenderForServersAws\"
          },
          \"arcAutoProvisioning\": {
            \"enabled\": true,
            \"cloudRoleArn\": \"arn:aws:iam::${AWS_ACCOUNT_ID}:role/ArcAutoProvisioningRole\"
          },
          \"subPlan\": \"P2\"
        },
        {
          \"offeringType\": \"DefenderForContainersAws\",
          \"cloudWatchToKinesis\": {
            \"cloudRoleArn\": \"arn:aws:iam::${AWS_ACCOUNT_ID}:role/DefenderForContainersCloudWatch\"
          },
          \"kinesisToS3\": {
            \"cloudRoleArn\": \"arn:aws:iam::${AWS_ACCOUNT_ID}:role/DefenderForContainersKinesis\"
          }
        }
      ]
    }
  }"

echo "AWS connector updated with container protection and CloudWatch integration"
```

## Tarefa 6: Consultar a postura de segurança multicloud

Use o Resource Graph para comparar a postura de segurança entre nuvens.

```bash
# Cross-cloud Secure Score comparison
az graph query -q "
  securityresources
  | where type == 'microsoft.security/securescores'
  | project name, Score=properties.score.current, Max=properties.score.max
" -o table

# Multicloud recommendations summary by severity and cloud
az graph query -q "
  securityresources
  | where type == 'microsoft.security/assessments'
  | where properties.status.code == 'Unhealthy'
  | extend Cloud = case(
      properties.resourceDetails.Source == 'Azure', 'Azure',
      properties.resourceDetails.Source == 'Aws', 'AWS',
      properties.resourceDetails.Source == 'Gcp', 'GCP',
      'Unknown'
    )
  | extend Severity = tostring(properties.metadata.severity)
  | summarize Count=count() by Cloud, Severity
  | order by Cloud, Severity
" -o table

# Find internet-exposed resources across all clouds
az graph query -q "
  securityresources
  | where type == 'microsoft.security/assessments'
  | where properties.displayName contains 'internet' or properties.displayName contains 'public'
  | where properties.status.code == 'Unhealthy'
  | extend Cloud = tostring(properties.resourceDetails.Source)
  | project Cloud, Resource=properties.resourceDetails.Id, Finding=properties.displayName
  | take 20
" -o table
```

---

## Quebre & Conserte

### Cenário 1: Conector AWS mostra status "Unhealthy"

O conector AWS foi criado mas mostra um status de conexão não saudável no Defender for Cloud.

<details>
<summary>Mostrar solução</summary>

```bash
# Check connector health details
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Security/securityConnectors/contoso-aws-connector?api-version=2024-03-01-preview" \
  --query "properties"

# Common causes:
# 1. IAM role in AWS doesn't have the correct trust policy
# 2. The external ID or role ARN is misconfigured
# 3. AWS CloudFormation stack failed to deploy

# In AWS, verify the IAM role trust relationship includes:
# - Principal: The Azure AD application ID from the connector
# - Condition: sts:ExternalId matches the connector's external ID

# Get the required CloudFormation template URL
az rest --method POST \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Security/securityConnectors/contoso-aws-connector/devOpsConfiguration?api-version=2024-03-01-preview" \
  --body '{}'

# Deploy the CloudFormation stack in AWS or manually create the IAM roles
# with the correct trust policy and permissions
```

</details>

### Cenário 2: Recursos GCP não aparecem nas recomendações de segurança

O conector GCP aparece como saudável, mas nenhum recurso GCP aparece nas recomendações.

<details>
<summary>Mostrar solução</summary>

```bash
# Verify the GCP connector offerings are properly configured
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Security/securityConnectors/contoso-gcp-connector?api-version=2024-03-01-preview" \
  --query "properties.offerings[].offeringType" -o tsv

# Common causes:
# 1. Workload identity federation not configured in GCP
# 2. Service account missing required IAM roles in GCP
# 3. GCP APIs not enabled (Security Command Center, Compute Engine API)

# Required GCP APIs:
# - securitycenter.googleapis.com
# - compute.googleapis.com
# - container.googleapis.com (for containers)

# Required GCP IAM roles for the service account:
# - roles/viewer (project-level)
# - roles/securitycenter.viewer
# - roles/iam.serviceAccountTokenCreator

# Verify in GCP CLI:
# gcloud projects get-iam-policy $GCP_PROJECT_ID \
#   --filter="bindings.members:defender-cspm@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

# It can also take up to 24 hours for first scan results to appear
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual mecanismo de autenticação o Defender for Cloud usa para se conectar a projetos GCP?",
    options: [
      "Chave de API armazenada no Azure Key Vault",
      "Workload identity federation com contas de serviço",
      "Credenciais de cliente OAuth 2.0 armazenadas no conector",
      "Par de chaves SSH"
    ],
    correctIndex: 1,
    explanation: "O Defender for Cloud usa workload identity federation para se conectar ao GCP. Isso cria uma relação de confiança entre o Azure AD e o IAM do GCP, permitindo que o Defender assuma a identidade de uma conta de serviço GCP sem armazenar credenciais de longa duração."
  },
  {
    question: "Ao integrar uma organização AWS ao Defender for Cloud, qual é a abordagem recomendada?",
    options: [
      "Criar conectores individuais para cada conta AWS",
      "Usar um único conector em nível de organização com integração ao AWS Organizations",
      "Implantar agentes em cada instância EC2 manualmente",
      "Usar o AWS Security Hub como intermediário"
    ],
    correctIndex: 1,
    explanation: "A abordagem recomendada é usar conectores em nível de organização que aproveitam o AWS Organizations. Isso descobre e integra automaticamente novas contas, usando um conector de conta de gerenciamento com CloudFormation StackSets para implantar as funções IAM necessárias nas contas membros."
  },
  {
    question: "Qual oferta do Defender for Cloud habilita o CSPM (gerenciamento de postura) para recursos AWS?",
    options: [
      "DefenderForServersAws",
      "CspmMonitorAws",
      "DefenderForContainersAws",
      "SecurityConnectorAws"
    ],
    correctIndex: 1,
    explanation: "A oferta CspmMonitorAws habilita o Cloud Security Posture Management para AWS. Ela fornece recomendações de segurança, contribuição para o Secure Score e avaliações de conformidade para recursos AWS."
  },
  {
    question: "Como o Defender for Servers protege instâncias AWS EC2?",
    options: [
      "Lendo apenas logs do CloudWatch",
      "Integrando instâncias EC2 ao Azure Arc e implantando o Defender for Endpoint",
      "Escaneando buckets S3 em busca de vulnerabilidades",
      "Apenas através da integração com o AWS GuardDuty"
    ],
    correctIndex: 1,
    explanation: "O Defender for Servers protege instâncias AWS EC2 provisionando automaticamente o agente Azure Arc Connected Machine, que então implanta o Microsoft Defender for Endpoint. Isso habilita avaliação de vulnerabilidades, detecção de endpoint e monitoramento de integridade de arquivos nas instâncias EC2."
  }
]} />

## Limpeza

```bash
# Delete AWS connector
az rest --method DELETE \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Security/securityConnectors/contoso-aws-connector?api-version=2024-03-01-preview"

# Delete GCP connector
az rest --method DELETE \
  --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG_NAME}/providers/Microsoft.Security/securityConnectors/contoso-gcp-connector?api-version=2024-03-01-preview"

# Delete resource group
az group delete --name $RG_NAME --yes --no-wait

# Note: Also clean up in AWS/GCP:
# AWS: Delete the CloudFormation stack and IAM roles
# GCP: Delete the service accounts and workload identity pool

echo "Cleanup complete - multicloud connectors removed"
```
