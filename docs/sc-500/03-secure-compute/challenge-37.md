---
sidebar_position: 37
title: "Challenge 37: Container Security – ACR, Container Instances, and Container Apps"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 37: Container Security – ACR, Container Instances, and Container Apps

## Exam skills covered

- Secure Azure Container Registry (ACR) with network isolation and vulnerability scanning
- Implement content trust and image signing for supply chain security
- Secure Azure Container Instances (ACI) deployments
- Harden Azure Container Apps with managed identity and ingress controls
- Configure Defender for Containers across all container platforms
- Implement container image lifecycle and retention policies

## Scenario

Contoso Ltd runs microservices across Azure Container Apps (production APIs), Azure Container Instances (batch processing), and stores all images in Azure Container Registry. A recent supply chain audit revealed that images are pulled from public registries without scanning, no image signing is enforced, and Container Instances run with unnecessary privileges. You must secure the entire container supply chain.

---

## Prerequisites

- Azure subscription with Contributor access
- Microsoft Defender for Containers enabled
- Azure CLI installed with `containerapp` extension
- Docker CLI for image operations
- Basic understanding of container networking

---

## Task 1: Secure Azure Container Registry

Configure ACR with network isolation, vulnerability scanning, and access controls.

```bash
# Create resource group
az group create --name "rg-contoso-container-platform" --location "eastus"

# Create Premium ACR (required for private link, content trust, retention)
az acr create \
    --resource-group "rg-contoso-container-platform" \
    --name "contosoacrprod" \
    --sku "Premium" \
    --location "eastus" \
    --admin-enabled false \
    --public-network-enabled false

# Create private endpoint for ACR
az network vnet create \
    --resource-group "rg-contoso-container-platform" \
    --name "vnet-container-platform" \
    --address-prefix "10.0.0.0/16" \
    --subnet-name "subnet-private-endpoints" \
    --subnet-prefix "10.0.1.0/24"

az network private-endpoint create \
    --resource-group "rg-contoso-container-platform" \
    --name "pe-acr-contoso" \
    --vnet-name "vnet-container-platform" \
    --subnet "subnet-private-endpoints" \
    --private-connection-resource-id "$(az acr show --name contosoacrprod --query id -o tsv)" \
    --group-ids "registry" \
    --connection-name "acr-private-connection"

# Create private DNS zone for ACR
az network private-dns zone create \
    --resource-group "rg-contoso-container-platform" \
    --name "privatelink.azurecr.io"

az network private-dns link vnet create \
    --resource-group "rg-contoso-container-platform" \
    --zone-name "privatelink.azurecr.io" \
    --name "acr-dns-link" \
    --virtual-network "vnet-container-platform" \
    --registration-enabled false

# Enable Defender for ACR vulnerability scanning
az security pricing create --name "ContainerRegistry" --tier "Standard"

# Configure retention policy (delete untagged manifests after 7 days)
az acr config retention update \
    --registry "contosoacrprod" \
    --status "enabled" \
    --days 7 \
    --type "UntaggedManifests"

# Enable soft delete for recovery
az acr config soft-delete update \
    --registry "contosoacrprod" \
    --status "enabled" \
    --days 7
```

---

## Task 2: Enable content trust and image signing

Configure Docker Content Trust to ensure only signed images can be deployed.

```bash
# Enable content trust on ACR
az acr config content-trust update \
    --registry "contosoacrprod" \
    --status "enabled"

# Configure token-based access for CI/CD (scoped to specific repositories)
az acr token create \
    --registry "contosoacrprod" \
    --name "cicd-push-token" \
    --scope-map "_repositories_push" \
    --status "enabled"

# Create a scope map for read-only pull access
az acr scope-map create \
    --registry "contosoacrprod" \
    --name "production-pull-only" \
    --description "Read-only pull access for production services" \
    --repository "contoso/api" content/read \
    --repository "contoso/frontend" content/read \
    --repository "contoso/worker" content/read

# Create token with limited pull-only scope
az acr token create \
    --registry "contosoacrprod" \
    --name "production-pull-token" \
    --scope-map "production-pull-only" \
    --status "enabled"

# Enable image quarantine (preview) - images must pass scan before availability
# Note: Quarantine is configured via ARM property, not a CLI config command
az resource update \
    --ids "$(az acr show --name contosoacrprod --query id -o tsv)" \
    --set "properties.policies.quarantinePolicy.status=enabled"
```

Sign images during CI/CD:

```bash
# In CI/CD pipeline - sign and push images
export DOCKER_CONTENT_TRUST=1
export DOCKER_CONTENT_TRUST_SERVER="https://contosoacrprod.azurecr.io"

# Build, tag, and push signed image
docker build -t contosoacrprod.azurecr.io/contoso/api:v1.5 .
docker push contosoacrprod.azurecr.io/contoso/api:v1.5
# Image will be signed with the CI/CD pipeline's delegation key

# Verify image signature
az acr manifest list-metadata \
    --registry "contosoacrprod" \
    --name "contoso/api" \
    --query "[].{tag: tags[0], signed: changeableAttributes.signable, digest: digest}" \
    --output table
```

---

## Task 3: Secure Azure Container Instances

Deploy Container Instances with security best practices.

```bash
# Create subnet for ACI (VNet integration)
az network vnet subnet create \
    --resource-group "rg-contoso-container-platform" \
    --vnet-name "vnet-container-platform" \
    --name "subnet-aci" \
    --address-prefix "10.0.2.0/24" \
    --delegations "Microsoft.ContainerInstance/containerGroups"

# Deploy ACI with VNet integration (no public IP)
az container create \
    --resource-group "rg-contoso-container-platform" \
    --name "aci-batch-processor" \
    --image "contosoacrprod.azurecr.io/contoso/worker:v1.2" \
    --vnet "vnet-container-platform" \
    --subnet "subnet-aci" \
    --cpu 2 \
    --memory 4 \
    --assign-identity "[system]" \
    --acr-identity "[system]" \
    --registry-login-server "contosoacrprod.azurecr.io" \
    --restart-policy "OnFailure" \
    --secure-environment-variables "DB_CONNECTION=Server=db.contoso.internal;Database=batch;Trusted_Connection=true"

# Deploy ACI with confidential computing (encrypted memory)
az container create \
    --resource-group "rg-contoso-container-platform" \
    --name "aci-confidential-processing" \
    --image "contosoacrprod.azurecr.io/contoso/sensitive-processor:v1.0" \
    --vnet "vnet-container-platform" \
    --subnet "subnet-aci" \
    --cpu 2 \
    --memory 4 \
    --assign-identity "[system]" \
    --sku "Confidential" \
    --cce-policy "default"

# Grant ACI managed identity access to ACR (instead of admin credentials)
ACI_IDENTITY=$(az container show \
    --resource-group "rg-contoso-container-platform" \
    --name "aci-batch-processor" \
    --query "identity.principalId" -o tsv)

az role assignment create \
    --assignee $ACI_IDENTITY \
    --role "AcrPull" \
    --scope "$(az acr show --name contosoacrprod --query id -o tsv)"
```

---

## Task 4: Secure Azure Container Apps

Deploy and harden Container Apps with ingress controls and managed identity.

```bash
# Create Container Apps environment with VNet integration
az network vnet subnet create \
    --resource-group "rg-contoso-container-platform" \
    --vnet-name "vnet-container-platform" \
    --name "subnet-container-apps" \
    --address-prefix "10.0.4.0/23"

az containerapp env create \
    --resource-group "rg-contoso-container-platform" \
    --name "cae-contoso-prod" \
    --location "eastus" \
    --infrastructure-subnet-resource-id "/subscriptions/{sub-id}/resourceGroups/rg-contoso-container-platform/providers/Microsoft.Network/virtualNetworks/vnet-container-platform/subnets/subnet-container-apps" \
    --internal-only true

# Deploy Container App with security best practices
az containerapp create \
    --resource-group "rg-contoso-container-platform" \
    --name "ca-api-prod" \
    --environment "cae-contoso-prod" \
    --image "contosoacrprod.azurecr.io/contoso/api:v1.5" \
    --target-port 8080 \
    --ingress "internal" \
    --min-replicas 2 \
    --max-replicas 10 \
    --cpu 1.0 \
    --memory "2Gi" \
    --system-assigned \
    --registry-server "contosoacrprod.azurecr.io" \
    --registry-identity "system"

# Configure IP restrictions on ingress
az containerapp ingress access-restriction set \
    --resource-group "rg-contoso-container-platform" \
    --name "ca-api-prod" \
    --rule-name "AllowVnetOnly" \
    --ip-address "10.0.0.0/16" \
    --action "Allow" \
    --description "Allow VNet traffic only"

# Configure secrets from Key Vault (not environment variables)
az containerapp secret set \
    --resource-group "rg-contoso-container-platform" \
    --name "ca-api-prod" \
    --secrets "db-connection=keyvaultref:https://kv-contoso-apps.vault.azure.net/secrets/db-connection,identityref:/subscriptions/{sub-id}/resourcegroups/rg-contoso-container-platform/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-contoso-apps"

# Enable authentication on Container App
az containerapp auth update \
    --resource-group "rg-contoso-container-platform" \
    --name "ca-api-prod" \
    --enabled true \
    --unauthenticated-client-action "Return401"
```

---

## Task 5: Implement vulnerability scanning and image lifecycle

Configure continuous scanning and automated remediation for container images.

```bash
# Check vulnerability scan results for images in ACR
az acr repository show-manifests \
    --name "contosoacrprod" \
    --repository "contoso/api" \
    --query "[].{tag: tags[0], createdAt: createdTime}" \
    --output table

# Query Defender for container vulnerability findings
az security sub-assessment list \
    --assessment-name "dbd0cb49-b563-45e7-9724-889e799fa648" \
    --assessed-resource-id "/subscriptions/{sub-id}/resourceGroups/rg-contoso-container-platform/providers/Microsoft.ContainerRegistry/registries/contosoacrprod" \
    --query "[].{image: resourceDetails.id, severity: status.severity, cve: id, fix: additionalData.patchable}" \
    --output table

# Create ACR task for automated image patching
az acr task create \
    --registry "contosoacrprod" \
    --name "auto-rebuild-on-base-update" \
    --image "contoso/api:{{.Run.ID}}" \
    --file "Dockerfile" \
    --context "https://github.com/contoso/api-service.git" \
    --git-access-token "{github-pat}" \
    --base-image-trigger-enabled true \
    --base-image-trigger-type "All" \
    --commit-trigger-enabled false

# Purge old/vulnerable images
az acr run \
    --registry "contosoacrprod" \
    --cmd "acr purge --filter 'contoso/api:.*' --ago 30d --untagged --keep 5" \
    /dev/null
```

---

## Task 6: Monitor container security across all platforms

Set up unified monitoring for ACR, ACI, and Container Apps.

```bash
# Enable diagnostic logging for Container Apps environment
az monitor diagnostic-settings create \
    --name "container-apps-security" \
    --resource "/subscriptions/{sub-id}/resourceGroups/rg-contoso-container-platform/providers/Microsoft.App/managedEnvironments/cae-contoso-prod" \
    --workspace "/subscriptions/{sub-id}/resourceGroups/rg-contoso-container-platform/providers/Microsoft.OperationalInsights/workspaces/law-contoso-containers" \
    --logs '[{"category": "ContainerAppConsoleLogs", "enabled": true}, {"category": "ContainerAppSystemLogs", "enabled": true}]'

# Query for security-relevant events
az monitor log-analytics query \
    --workspace "law-contoso-containers-id" \
    --analytics-query "
        ContainerAppConsoleLogs_CL
        | where Log_s contains 'error' or Log_s contains 'unauthorized' or Log_s contains 'denied'
        | project TimeGenerated, ContainerAppName_s, Log_s
        | order by TimeGenerated desc
        | take 50
    "

# Create alert for failed image pulls (potential supply chain issue)
az monitor scheduled-query create \
    --name "failed-image-pull-alert" \
    --resource-group "rg-contoso-container-platform" \
    --scopes "/subscriptions/{sub-id}/resourceGroups/rg-contoso-container-platform/providers/Microsoft.OperationalInsights/workspaces/law-contoso-containers" \
    --condition "count 'ContainerAppSystemLogs_CL | where Reason_s == \"ImagePullBackOff\" or Reason_s == \"ErrImagePull\"' > 3" \
    --window-size "PT10M" \
    --evaluation-frequency "PT5M" \
    --severity 2 \
    --description "Multiple failed image pulls detected - potential supply chain issue"
```

---

## Break & Fix

### Scenario 1: Container App cannot pull images from ACR after enabling private endpoint

After making ACR private (disabling public network access), Container Apps fail to start with "ImagePullBackOff" errors.

<details>
<summary>Show solution</summary>

```bash
# 1. Check Container Apps environment VNet connectivity to ACR
# Container Apps environment must be in same VNet or peered VNet as ACR private endpoint

# 2. Verify private DNS resolution
az network private-dns record-set a list \
    --resource-group "rg-contoso-container-platform" \
    --zone-name "privatelink.azurecr.io"

# 3. Ensure the DNS zone is linked to the Container Apps VNet
az network private-dns link vnet create \
    --resource-group "rg-contoso-container-platform" \
    --zone-name "privatelink.azurecr.io" \
    --name "container-apps-dns-link" \
    --virtual-network "vnet-container-platform" \
    --registration-enabled false

# 4. If using managed identity for image pull, verify role assignment
CA_IDENTITY=$(az containerapp show \
    --resource-group "rg-contoso-container-platform" \
    --name "ca-api-prod" \
    --query "identity.principalId" -o tsv)

az role assignment create \
    --assignee $CA_IDENTITY \
    --role "AcrPull" \
    --scope "$(az acr show --name contosoacrprod --query id -o tsv)"

# 5. Update Container App to use managed identity for registry auth
az containerapp registry set \
    --resource-group "rg-contoso-container-platform" \
    --name "ca-api-prod" \
    --server "contosoacrprod.azurecr.io" \
    --identity "system"

# 6. Alternatively, if network path doesn't work, enable "trusted services" on ACR
az acr update \
    --name "contosoacrprod" \
    --allow-trusted-services true
```

</details>

### Scenario 2: ACI container running with excessive permissions despite security configuration

A Container Instance was deployed with a system-assigned managed identity that has Contributor role on the entire subscription — if compromised, it could modify any resource.

<details>
<summary>Show solution</summary>

```bash
# 1. Find the overprivileged identity
ACI_IDENTITY=$(az container show \
    --resource-group "rg-contoso-container-platform" \
    --name "aci-batch-processor" \
    --query "identity.principalId" -o tsv)

# 2. List all role assignments for this identity
az role assignment list \
    --assignee $ACI_IDENTITY \
    --all \
    --query "[].{role: roleDefinitionName, scope: scope}" \
    --output table

# 3. Remove overprivileged subscription-level Contributor role
az role assignment delete \
    --assignee $ACI_IDENTITY \
    --role "Contributor" \
    --scope "/subscriptions/{sub-id}"

# 4. Assign least-privilege roles scoped to specific resources
# For batch processor that writes to a storage account:
az role assignment create \
    --assignee $ACI_IDENTITY \
    --role "Storage Blob Data Contributor" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-container-platform/providers/Microsoft.Storage/storageAccounts/stcontosoinput"

# For reading from Key Vault:
az role assignment create \
    --assignee $ACI_IDENTITY \
    --role "Key Vault Secrets User" \
    --scope "/subscriptions/{sub-id}/resourceGroups/rg-contoso-container-platform/providers/Microsoft.KeyVault/vaults/kv-contoso-apps"

# 5. Apply Azure Policy to prevent overprivileged assignments in the future
az policy assignment create \
    --name "deny-subscription-contributor" \
    --display-name "Deny Subscription-level Contributor" \
    --policy "/providers/Microsoft.Authorization/policyDefinitions/custom-deny-broad-rbac" \
    --scope "/subscriptions/{sub-id}"
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the security benefit of enabling ACR content trust?",
    options: [
      "It encrypts images at rest in the registry",
      "It ensures only cryptographically signed images can be pulled, verifying image integrity and publisher identity",
      "It automatically patches vulnerabilities in stored images",
      "It restricts which users can view the registry"
    ],
    correctIndex: 1,
    explanation: "Content trust (Docker Content Trust/Notary) cryptographically signs images at push time. When enabled, pull operations verify the signature — ensuring the image hasn't been tampered with and was published by a trusted signer (supply chain integrity)."
  },
  {
    question: "How should Azure Container Instances authenticate to ACR without using admin credentials?",
    options: [
      "Store the admin password in an environment variable",
      "Use a system-assigned or user-assigned managed identity with AcrPull role assignment",
      "Make the ACR publicly accessible",
      "Use anonymous pull access"
    ],
    correctIndex: 1,
    explanation: "The recommended approach is to assign a managed identity to the Container Instance and grant it the AcrPull role on the ACR. This eliminates credential management, provides automatic rotation, and follows least-privilege principles."
  },
  {
    question: "What security feature does setting Container Apps ingress to 'internal' provide?",
    options: [
      "It encrypts all container-to-container traffic",
      "It restricts the app's ingress endpoint to only be accessible from within the VNet, not from the public internet",
      "It disables all HTTP traffic to the app",
      "It requires client certificate authentication"
    ],
    correctIndex: 1,
    explanation: "Setting ingress to 'internal' ensures the Container App's endpoint is only accessible from within the VNet (or peered networks). This prevents direct internet access and forces traffic through a reverse proxy, API gateway, or VPN for external consumers."
  },
  {
    question: "Why should ACR image retention policies be configured from a security perspective?",
    options: [
      "To save storage costs only",
      "To remove old unpatched images that could be accidentally deployed, reducing the attack surface of available images",
      "To comply with data residency requirements",
      "Retention policies have no security benefit"
    ],
    correctIndex: 1,
    explanation: "Retention policies automatically remove old, untagged images that may contain known vulnerabilities. Without retention policies, developers might accidentally deploy outdated images with unpatched CVEs, increasing the attack surface."
  }
]} />

## Cleanup

```bash
# Delete all resources
az group delete --name "rg-contoso-container-platform" --yes --no-wait
```
