---
sidebar_position: 37
title: "Desafio 37: Segurança de Containers – ACR, Container Instances e Container Apps"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 37: Segurança de Containers – ACR, Container Instances e Container Apps

## Habilidades do exame cobertas

- Proteger o Azure Container Registry (ACR) com isolamento de rede e varredura de vulnerabilidades
- Implementar content trust e assinatura de imagens para segurança da cadeia de suprimentos
- Proteger implantações de Azure Container Instances (ACI)
- Endurecer Azure Container Apps com managed identity e controles de ingress
- Configurar Defender for Containers em todas as plataformas de containers
- Implementar políticas de ciclo de vida e retenção de imagens de container

## Cenário

A Contoso Ltd executa microsserviços em Azure Container Apps (APIs de produção), Azure Container Instances (processamento em lote) e armazena todas as imagens no Azure Container Registry. Uma auditoria recente da cadeia de suprimentos revelou que imagens são puxadas de registries públicos sem varredura, nenhuma assinatura de imagem é aplicada, e os Container Instances são executados com privilégios desnecessários. Você deve proteger toda a cadeia de suprimentos de containers.

---

## Pré-requisitos

- Assinatura Azure com acesso de Contributor
- Microsoft Defender for Containers habilitado
- Azure CLI instalado com extensão `containerapp`
- Docker CLI para operações de imagem
- Conhecimento básico de networking de containers

---

## Tarefa 1: Proteger o Azure Container Registry

Configure o ACR com isolamento de rede, varredura de vulnerabilidades e controles de acesso.

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

## Tarefa 2: Habilitar content trust e assinatura de imagens

Configure o Docker Content Trust para garantir que apenas imagens assinadas possam ser implantadas.

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
az acr config quarantine update \
    --registry "contosoacrprod" \
    --status "enabled"
```

Assine imagens durante o CI/CD:

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

## Tarefa 3: Proteger Azure Container Instances

Implante Container Instances com melhores práticas de segurança.

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

## Tarefa 4: Proteger Azure Container Apps

Implante e endureça Container Apps com controles de ingress e managed identity.

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

## Tarefa 5: Implementar varredura de vulnerabilidades e ciclo de vida de imagens

Configure varredura contínua e remediação automatizada para imagens de container.

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

## Tarefa 6: Monitorar segurança de containers em todas as plataformas

Configure monitoramento unificado para ACR, ACI e Container Apps.

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

## Quebra & conserta

### Cenário 1: Container App não consegue puxar imagens do ACR após habilitar private endpoint

Após tornar o ACR privado (desabilitando acesso à rede pública), os Container Apps falham ao iniciar com erros "ImagePullBackOff".

<details>
<summary>Mostrar solução</summary>

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

### Cenário 2: Container do ACI executando com permissões excessivas apesar da configuração de segurança

Um Container Instance foi implantado com uma managed identity atribuída pelo sistema que tem a role de Contributor em toda a assinatura — se comprometido, poderia modificar qualquer recurso.

<details>
<summary>Mostrar solução</summary>

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

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é o benefício de segurança de habilitar o content trust no ACR?",
    options: [
      "Ele criptografa as imagens em repouso no registry",
      "Ele garante que apenas imagens criptograficamente assinadas possam ser puxadas, verificando a integridade da imagem e a identidade do publicador",
      "Ele corrige automaticamente vulnerabilidades em imagens armazenadas",
      "Ele restringe quais usuários podem visualizar o registry"
    ],
    correctIndex: 1,
    explanation: "O content trust (Docker Content Trust/Notary) assina criptograficamente as imagens no momento do push. Quando habilitado, operações de pull verificam a assinatura — garantindo que a imagem não foi adulterada e foi publicada por um assinante confiável (integridade da cadeia de suprimentos)."
  },
  {
    question: "Como os Azure Container Instances devem se autenticar no ACR sem usar credenciais de administrador?",
    options: [
      "Armazenar a senha de admin em uma variável de ambiente",
      "Usar uma managed identity atribuída pelo sistema ou pelo usuário com atribuição da role AcrPull",
      "Tornar o ACR acessível publicamente",
      "Usar acesso de pull anônimo"
    ],
    correctIndex: 1,
    explanation: "A abordagem recomendada é atribuir uma managed identity ao Container Instance e conceder a role AcrPull no ACR. Isso elimina o gerenciamento de credenciais, fornece rotação automática e segue princípios de menor privilégio."
  },
  {
    question: "Qual recurso de segurança configurar o ingress do Container Apps como 'internal' fornece?",
    options: [
      "Ele criptografa todo o tráfego container-a-container",
      "Ele restringe o endpoint de ingress do app para ser acessível apenas de dentro da VNet, não da internet pública",
      "Ele desabilita todo o tráfego HTTP para o app",
      "Ele requer autenticação por certificado de cliente"
    ],
    correctIndex: 1,
    explanation: "Configurar o ingress como 'internal' garante que o endpoint do Container App seja acessível apenas de dentro da VNet (ou redes peered). Isso previne acesso direto da internet e força o tráfego através de um reverse proxy, API gateway ou VPN para consumidores externos."
  },
  {
    question: "Por que políticas de retenção de imagens no ACR devem ser configuradas do ponto de vista de segurança?",
    options: [
      "Apenas para economizar custos de armazenamento",
      "Para remover imagens antigas não atualizadas que poderiam ser implantadas acidentalmente, reduzindo a superfície de ataque das imagens disponíveis",
      "Para cumprir requisitos de residência de dados",
      "Políticas de retenção não têm benefício de segurança"
    ],
    correctIndex: 1,
    explanation: "Políticas de retenção removem automaticamente imagens antigas e sem tag que podem conter vulnerabilidades conhecidas. Sem políticas de retenção, desenvolvedores podem acidentalmente implantar imagens desatualizadas com CVEs não corrigidos, aumentando a superfície de ataque."
  }
]} />

## Limpeza

```bash
# Delete all resources
az group delete --name "rg-contoso-container-platform" --yes --no-wait
```
