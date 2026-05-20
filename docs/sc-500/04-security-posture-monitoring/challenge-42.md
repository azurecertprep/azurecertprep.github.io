---
sidebar_position: 42
title: "Challenge 42: Multicloud Connectors (AWS, GCP) in Defender for Cloud"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 42: Multicloud Connectors (AWS, GCP) in Defender for Cloud

## Exam skills covered

- Configure multicloud security connectors for AWS and GCP
- Manage cross-cloud security posture assessment
- Evaluate multicloud workload protection
- Monitor security recommendations across cloud providers

## Scenario

Contoso Ltd operates a hybrid-cloud environment with workloads in Azure, AWS, and Google Cloud Platform. The CISO mandates unified security visibility through Microsoft Defender for Cloud. You must configure multicloud connectors to onboard AWS accounts and GCP projects, enabling CSPM and workload protection across all three clouds from a single pane of glass.

---

## Prerequisites

- Azure subscription with Owner or Security Admin role
- Azure CLI installed and authenticated
- (Optional) AWS account with admin access for full connector setup
- (Optional) GCP project with owner access for full connector setup
- Defender CSPM or Defender for Servers plan enabled

---

## Task 1: Understand multicloud connector architecture

Review the connector requirements and create the resource group for multicloud resources.

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

## Task 2: Create an AWS connector

Configure a security connector to onboard an AWS account to Defender for Cloud.

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

## Task 3: Create a GCP connector

Configure a security connector to onboard a GCP project.

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

## Task 4: Verify connector health and onboarding status

Check the status of multicloud connectors and their discovered resources.

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

## Task 5: Configure AWS CloudTrail integration

Set up CloudTrail log forwarding for security event monitoring.

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

## Task 6: Query multicloud security posture

Use Resource Graph to compare security posture across clouds.

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

## Break & Fix

### Scenario 1: AWS connector shows "Unhealthy" status

The AWS connector was created but shows an unhealthy connection status in Defender for Cloud.

<details>
<summary>Show solution</summary>

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

### Scenario 2: GCP resources not appearing in security recommendations

The GCP connector shows as healthy but no GCP resources appear in the recommendations.

<details>
<summary>Show solution</summary>

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

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What authentication mechanism does Defender for Cloud use to connect to GCP projects?",
    options: [
      "API key stored in Azure Key Vault",
      "Workload identity federation with service accounts",
      "OAuth 2.0 client credentials stored in the connector",
      "SSH key pair"
    ],
    correctIndex: 1,
    explanation: "Defender for Cloud uses workload identity federation to connect to GCP. This creates a trust relationship between Azure AD and GCP's IAM, allowing Defender to assume a GCP service account identity without storing long-lived credentials."
  },
  {
    question: "When onboarding an AWS organization to Defender for Cloud, what is the recommended approach?",
    options: [
      "Create individual connectors for each AWS account",
      "Use a single organization-level connector with AWS Organizations integration",
      "Deploy agents on each EC2 instance manually",
      "Use AWS Security Hub as an intermediary"
    ],
    correctIndex: 1,
    explanation: "The recommended approach is to use organization-level connectors that leverage AWS Organizations. This automatically discovers and onboards new accounts, using a management account connector with CloudFormation StackSets to deploy required IAM roles across member accounts."
  },
  {
    question: "Which Defender for Cloud offering enables CSPM (posture management) for AWS resources?",
    options: [
      "DefenderForServersAws",
      "CspmMonitorAws",
      "DefenderForContainersAws",
      "SecurityConnectorAws"
    ],
    correctIndex: 1,
    explanation: "The CspmMonitorAws offering enables Cloud Security Posture Management for AWS. It provides security recommendations, Secure Score contribution, and compliance assessments for AWS resources."
  },
  {
    question: "How does Defender for Servers protect AWS EC2 instances?",
    options: [
      "By reading CloudWatch logs only",
      "By onboarding EC2 instances to Azure Arc and deploying Defender for Endpoint",
      "By scanning S3 buckets for vulnerabilities",
      "Through AWS GuardDuty integration only"
    ],
    correctIndex: 1,
    explanation: "Defender for Servers protects AWS EC2 instances by auto-provisioning the Azure Arc Connected Machine agent, which then deploys Microsoft Defender for Endpoint. This enables vulnerability assessment, endpoint detection, and file integrity monitoring on EC2 instances."
  }
]} />

## Cleanup

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
