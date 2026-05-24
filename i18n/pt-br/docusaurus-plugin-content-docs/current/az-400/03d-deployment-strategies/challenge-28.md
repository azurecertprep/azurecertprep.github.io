---
sidebar_position: 4
title: "Desafio 28: Deployments baseados em containers"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 28: Deployments baseados em containers

## Habilidades do exame mapeadas

- Implementar deployment de aplicaÃ§Ã£o usando containers, binÃ¡rios e scripts

## CenÃ¡rio

A Contoso Ltd estÃ¡ containerizando sua aplicaÃ§Ã£o monolÃ­tica de e-commerce em trÃªs microsserviÃ§os: Product Catalog API, Order Processing Service e Notification Service. A equipe precisa construir um pipeline de CI/CD abrangente que lide com build de imagens de container, escaneamento de vulnerabilidades, gerenciamento de registry e deployment tanto para Azure Container Apps quanto para Azure Kubernetes Service.

**Detalhes do ambiente:**
- Azure Container Registry: `acrcontosoprod`
- Azure Container Apps Environment: `cae-contoso-prod`
- Cluster AKS: `aks-contoso-prod`
- Resource group: `rg-contoso-containers`
- RegiÃ£o: East US 2

---

## Tarefa 1: Construir imagem Docker no GitHub Actions

### Dockerfile para a Product Catalog API

Crie `src/ProductCatalog/Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["ProductCatalog.csproj", "."]
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
EXPOSE 8080

# Run as non-root user
RUN adduser --disabled-password --gecos "" appuser
USER appuser

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ProductCatalog.dll"]
```

### Workflow do GitHub Actions para build de container

Crie `.github/workflows/container-build.yml`:

```yaml
name: Container Build and Push

on:
  push:
    branches: [main]
    paths:
      - 'src/ProductCatalog/**'
  pull_request:
    branches: [main]
    paths:
      - 'src/ProductCatalog/**'

env:
  REGISTRY: acrcontosoprod.azurecr.io
  IMAGE_NAME: product-catalog-api
  RESOURCE_GROUP: rg-contoso-containers

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      security-events: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Login to Azure Container Registry
        run: az acr login --name acrcontosoprod

      - name: Generate image metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=,format=short
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: src/ProductCatalog
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Tarefa 2: Fazer push para Azure Container Registry com tagging adequado

### Provisionar o ACR

```bash
RESOURCE_GROUP="rg-contoso-containers"
LOCATION="eastus2"
ACR_NAME="acrcontosoprod"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create ACR with Premium SKU (supports geo-replication, content trust)
az acr create \
  --name $ACR_NAME \
  --resource-group $RESOURCE_GROUP \
  --sku Premium \
  --admin-enabled false

# Enable content trust (image signing)
az acr config content-trust update \
  --registry $ACR_NAME \
  --status enabled
```

### EstratÃ©gia de tagging

```bash
# Build with multiple tags: semver + git SHA + latest
IMAGE="acrcontosoprod.azurecr.io/product-catalog-api"
VERSION="1.2.3"
SHA=$(git rev-parse --short HEAD)

az acr build \
  --registry $ACR_NAME \
  --image "${IMAGE}:${VERSION}" \
  --image "${IMAGE}:${SHA}" \
  --image "${IMAGE}:latest" \
  --file src/ProductCatalog/Dockerfile \
  src/ProductCatalog/
```

### Configurar polÃ­ticas de retenÃ§Ã£o e limpeza

```bash
# Set retention policy (delete untagged manifests after 7 days)
az acr config retention update \
  --registry $ACR_NAME \
  --status enabled \
  --days 7 \
  --type UntaggedManifests

# Purge old images (keep last 10 tagged versions)
az acr run \
  --registry $ACR_NAME \
  --cmd "acr purge --filter 'product-catalog-api:.*' --ago 30d --keep 10 --untagged" \
  /dev/null
```

---

## Tarefa 3: Fazer push para GitHub Container Registry (GHCR)

### Workflow do GitHub Actions para GHCR

```yaml
  push-to-ghcr:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Generate image metadata for GHCR
        id: meta-ghcr
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}/product-catalog-api
          tags: |
            type=semver,pattern={{version}}
            type=sha,prefix=,format=short
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push to GHCR
        uses: docker/build-push-action@v6
        with:
          context: src/ProductCatalog
          push: true
          tags: ${{ steps.meta-ghcr.outputs.tags }}
          labels: ${{ steps.meta-ghcr.outputs.labels }}
```

---

## Tarefa 4: Fazer deploy no Azure Container Apps via GitHub Actions

### Provisionar ambiente do Azure Container Apps

```bash
# Create Container Apps environment
az containerapp env create \
  --name cae-contoso-prod \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Create the container app
az containerapp create \
  --name ca-product-catalog \
  --resource-group $RESOURCE_GROUP \
  --environment cae-contoso-prod \
  --image acrcontosoprod.azurecr.io/product-catalog-api:latest \
  --registry-server acrcontosoprod.azurecr.io \
  --registry-identity system \
  --target-port 8080 \
  --ingress external \
  --min-replicas 2 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1.0Gi
```

### Workflow de deployment do GitHub Actions

Crie `.github/workflows/deploy-container-apps.yml`:

```yaml
name: Deploy to Azure Container Apps

on:
  workflow_run:
    workflows: ["Container Build and Push"]
    types: [completed]
    branches: [main]

env:
  RESOURCE_GROUP: rg-contoso-containers
  CONTAINER_APP: ca-product-catalog
  REGISTRY: acrcontosoprod.azurecr.io
  IMAGE_NAME: product-catalog-api

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - uses: actions/checkout@v4

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Get image tag from triggering workflow
        id: image-tag
        run: |
          SHA=$(echo "${{ github.event.workflow_run.head_sha }}" | cut -c1-7)
          echo "tag=${SHA}" >> $GITHUB_OUTPUT

      - name: Deploy to Container Apps
        run: |
          az containerapp update \
            --name ${{ env.CONTAINER_APP }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --image ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.image-tag.outputs.tag }}

      - name: Verify deployment
        run: |
          FQDN=$(az containerapp show \
            --name ${{ env.CONTAINER_APP }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --query "properties.configuration.ingress.fqdn" -o tsv)

          for i in {1..10}; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$FQDN/health")
            if [ "$STATUS" == "200" ]; then
              echo "Deployment verified successfully"
              exit 0
            fi
            echo "Attempt $i: status=$STATUS, waiting..."
            sleep 15
          done
          echo "Deployment verification failed"
          exit 1

      - name: Rollback on failure
        if: failure()
        run: |
          # Get the previous revision
          PREVIOUS_REVISION=$(az containerapp revision list \
            --name ${{ env.CONTAINER_APP }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --query "[-2].name" -o tsv)

          az containerapp ingress traffic set \
            --name ${{ env.CONTAINER_APP }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --revision-weight "$PREVIOUS_REVISION=100"
```

---

## Tarefa 5: Fazer deploy no AKS via Azure Pipelines

### Manifesto de deployment do Kubernetes

Crie `k8s/product-catalog/deployment.yml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-catalog-api
  namespace: contoso-apps
  labels:
    app: product-catalog-api
    version: "1.0"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: product-catalog-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: product-catalog-api
    spec:
      containers:
        - name: product-catalog-api
          image: acrcontosoprod.azurecr.io/product-catalog-api:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          env:
            - name: ASPNETCORE_ENVIRONMENT
              value: "Production"
            - name: ConnectionStrings__DefaultConnection
              valueFrom:
                secretKeyRef:
                  name: product-catalog-secrets
                  key: db-connection-string
---
apiVersion: v1
kind: Service
metadata:
  name: product-catalog-api
  namespace: contoso-apps
spec:
  selector:
    app: product-catalog-api
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

### YAML do Azure Pipelines para deployment no AKS

Crie `azure-pipelines-aks.yml`:

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - src/ProductCatalog/**

pool:
  vmImage: 'ubuntu-latest'

variables:
  azureSubscription: 'contoso-production-connection'
  resourceGroup: 'rg-contoso-containers'
  acrName: 'acrcontosoprod'
  aksCluster: 'aks-contoso-prod'
  imageRepository: 'product-catalog-api'
  namespace: 'contoso-apps'
  tag: '$(Build.BuildId)'

stages:
  - stage: Build
    displayName: 'Build and push image'
    jobs:
      - job: BuildImage
        steps:
          - task: Docker@2
            displayName: 'Build and push to ACR'
            inputs:
              containerRegistry: 'acr-contoso-connection'
              repository: $(imageRepository)
              command: 'buildAndPush'
              Dockerfile: 'src/ProductCatalog/Dockerfile'
              buildContext: 'src/ProductCatalog'
              tags: |
                $(tag)
                latest

  - stage: Deploy
    displayName: 'Deploy to AKS'
    dependsOn: Build
    jobs:
      - deployment: DeployToAKS
        environment: 'production.contoso-apps'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: KubernetesManifest@1
                  displayName: 'Deploy to AKS'
                  inputs:
                    action: 'deploy'
                    connectionType: 'azureResourceManager'
                    azureSubscriptionConnection: $(azureSubscription)
                    azureResourceGroup: $(resourceGroup)
                    kubernetesCluster: $(aksCluster)
                    namespace: $(namespace)
                    manifests: |
                      k8s/product-catalog/deployment.yml
                    containers: |
                      $(acrName).azurecr.io/$(imageRepository):$(tag)

                - task: Kubernetes@1
                  displayName: 'Verify rollout status'
                  inputs:
                    connectionType: 'Azure Resource Manager'
                    azureSubscriptionEndpoint: $(azureSubscription)
                    azureResourceGroup: $(resourceGroup)
                    kubernetesCluster: $(aksCluster)
                    namespace: $(namespace)
                    command: 'rollout'
                    arguments: 'status deployment/product-catalog-api --timeout=300s'
```

---

## Tarefa 6: Escaneamento de imagem com Trivy e Defender for Containers

### Escaneamento com Trivy no GitHub Actions

```yaml
  scan-image:
    runs-on: ubuntu-latest
    needs: build-and-push
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: '${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

      - name: Upload Trivy scan results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

### Habilitar Microsoft Defender for Containers no ACR

```bash
# Enable Defender for Containers (includes vulnerability assessment)
az security pricing create \
  --name Containers \
  --tier Standard

# Check scan results for an image
az acr repository show \
  --name $ACR_NAME \
  --image product-catalog-api:latest \
  --query "changeableAttributes"
```

### Escaneamento durante build no ACR (nativo do Azure)

```bash
# Build with automatic Defender scanning
az acr build \
  --registry $ACR_NAME \
  --image product-catalog-api:$(git rev-parse --short HEAD) \
  --file src/ProductCatalog/Dockerfile \
  src/ProductCatalog/

# Query vulnerability assessment results
az acr repository show-manifests \
  --name $ACR_NAME \
  --repository product-catalog-api \
  --query "[0].digest" -o tsv
```

---

## Tarefa 7: Builds multi-arquitetura (linux/amd64, linux/arm64)

### Build multi-arch com Docker Buildx no GitHub Actions

```yaml
  build-multi-arch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU (for cross-platform builds)
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Azure Container Registry
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Login to ACR
        run: az acr login --name acrcontosoprod

      - name: Build and push multi-arch image
        uses: docker/build-push-action@v6
        with:
          context: src/ProductCatalog
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            acrcontosoprod.azurecr.io/product-catalog-api:${{ github.sha }}
            acrcontosoprod.azurecr.io/product-catalog-api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Verificar manifesto multi-arch

```bash
# Inspect the multi-arch manifest
az acr manifest list-metadata \
  --registry $ACR_NAME \
  --name product-catalog-api \
  --query "[0].{digest:digest, architecture:architecture, os:os}"

# Check specific architecture support
docker manifest inspect acrcontosoprod.azurecr.io/product-catalog-api:latest
```

---

## ExercÃ­cios de quebra e conserto

### ExercÃ­cio 1: Falha de autenticaÃ§Ã£o no ACR no pipeline

**Sintoma:** O workflow do GitHub Actions falha com `unauthorized: authentication required` ao fazer push para o ACR.

**Investigar:**
```bash
# Check if the service principal has AcrPush role
az role assignment list \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-containers/providers/Microsoft.ContainerRegistry/registries/acrcontosoprod" \
  --query "[?roleDefinitionName=='AcrPush'].{principal:principalName, role:roleDefinitionName}"
```


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**Causa raiz:** O service principal no secret AZURE_CREDENTIALS possui apenas a role `AcrPull`, nÃ£o `AcrPush`.


**CorreÃ§Ã£o:**
```bash
# Assign AcrPush role to the service principal
SP_ID=$(az ad sp show --id <app-id> --query id -o tsv)

az role assignment create \
  --assignee $SP_ID \
  --role AcrPush \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-containers/providers/Microsoft.ContainerRegistry/registries/acrcontosoprod"
```

</details>

### ExercÃ­cio 2: Container app falhando health checks apÃ³s deployment

**Sintoma:** ApÃ³s fazer deploy de uma nova imagem no Azure Container Apps, a revisÃ£o nunca se torna ativa. Os logs mostram tentativas repetidas de reinicializaÃ§Ã£o.

**Investigar:**
```bash
# Check revision status
az containerapp revision list \
  --name ca-product-catalog \
  --resource-group $RESOURCE_GROUP \
  --query "[0].{name:name, healthy:properties.healthState, running:properties.runningState}"

# Check container logs
az containerapp logs show \
  --name ca-product-catalog \
  --resource-group $RESOURCE_GROUP \
  --type console
```


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**Causa raiz:** O Dockerfile expÃµe a porta 8080 mas o ingress do Container App estÃ¡ configurado para a porta 80.


**CorreÃ§Ã£o:**
```bash
az containerapp update \
  --name ca-product-catalog \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars "ASPNETCORE_URLS=http://+:8080"

az containerapp ingress update \
  --name ca-product-catalog \
  --resource-group $RESOURCE_GROUP \
  --target-port 8080
```

</details>

### ExercÃ­cio 3: Escaneamento do Trivy bloqueando deployment com falso positivo

**Sintoma:** O pipeline falha porque o Trivy reporta uma vulnerabilidade CRITICAL em um pacote da imagem base que nÃ£o tem correÃ§Ã£o disponÃ­vel ainda.


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**Causa raiz:** A vulnerabilidade estÃ¡ em um pacote de sistema na imagem base sem correÃ§Ã£o upstream.


**CorreÃ§Ã£o:** Crie um arquivo `.trivyignore` na raiz do projeto:
```text
# No fix available - tracked in issue #1234
CVE-2024-XXXXX
```

Atualize o workflow para referenciar o arquivo de ignore:
```yaml
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: '${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
          trivyignores: '.trivyignore'
```


</details>
## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "A Contoso quer construir imagens de container em seu pipeline de CI e fazer push para o Azure Container Registry. O pipeline usa um service principal para autenticaÃ§Ã£o. Qual Ã© a role RBAC MÃNIMA necessÃ¡ria no ACR para o service principal fazer push de imagens?",
    options: [
      "Reader",
      "AcrPull",
      "AcrPush",
      "Contributor"
    ],
    correctIndex: 2,
    explanation: "A role AcrPush concede permissÃ£o para fazer push (escrita) e pull (leitura) de imagens do ACR. AcrPull permite apenas leitura. Contributor Ã© excessivamente permissiva e inclui acesso ao plano de gerenciamento. Reader nÃ£o fornece acesso ao plano de dados de imagens de container."
  },
  {
    question: "Um container implantado no Azure Container Apps continua reiniciando. A aplicaÃ§Ã£o escuta na porta 8080, mas o ingress do Container App estÃ¡ configurado com 'targetPort: 80'. Qual Ã© a correÃ§Ã£o correta?",
    options: [
      "Alterar a aplicaÃ§Ã£o para escutar na porta 80",
      "Atualizar a porta alvo do ingress do Container App para 8080",
      "Adicionar uma regra de mapeamento de porta no ambiente do Container Apps",
      "Configurar um proxy reverso entre a porta 80 e 8080"
    ],
    correctIndex: 1,
    explanation: "O targetPort no ingress do Azure Container Apps deve corresponder Ã  porta em que a aplicaÃ§Ã£o do container escuta. Se a aplicaÃ§Ã£o estÃ¡ configurada para escutar na porta 8080 (via ASPNETCORE_URLS ou Dockerfile EXPOSE), o ingress do Container App deve rotear para essa mesma porta."
  },
  {
    question: "A Contoso constrÃ³i suas imagens de container com tags 'semver' (ex: '1.2.3') e tags 'sha' (ex: 'abc1234'). Nos manifestos Kubernetes de produÃ§Ã£o, qual tipo de tag deve ser referenciado para deployments reproduzÃ­veis?",
    options: [
      "Tag 'latest' para atualizaÃ§Ãµes automÃ¡ticas",
      "Tag de versÃ£o major semver (ex: '1')",
      "Tag baseada em Git SHA (ex: 'abc1234')",
      "Tag de versÃ£o minor semver (ex: '1.2')"
    ],
    correctIndex: 2,
    explanation: "Tags baseadas em SHA sÃ£o imutÃ¡veis e correlacionam diretamente a um commit especÃ­fico, garantindo reprodutibilidade. Uma tag SHA especÃ­fica sempre aponta para exatamente uma imagem. Tags semver podem ser sobrescritas (movendo 1.2.3 para uma imagem diferente), e latest Ã© mutÃ¡vel por definiÃ§Ã£o. Para deployments de produÃ§Ã£o, referÃªncias imutÃ¡veis garantem que vocÃª pode rastrear exatamente qual cÃ³digo estÃ¡ executando."
  },
  {
    question: "A Contoso precisa que suas imagens de container executem tanto em arquiteturas AMD64 (VMs na nuvem) quanto ARM64 (dispositivos edge). O que deve ser configurado no pipeline de CI para produzir imagens para ambas as plataformas?",
    options: [
      "Construir a imagem duas vezes com Dockerfiles diferentes para cada arquitetura",
      "Usar Docker Buildx com 'platforms: linux/amd64,linux/arm64' e emulaÃ§Ã£o QEMU",
      "Criar registries de container separados para cada arquitetura",
      "Usar containers Windows que suportam ambas as arquiteturas nativamente"
    ],
    correctIndex: 1,
    explanation: "O Docker Buildx suporta builds multi-plataforma usando QEMU para emulaÃ§Ã£o cross-platform. Um Ãºnico comando docker buildx build --platform linux/amd64,linux/arm64 produz uma lista de manifestos contendo imagens para ambas as arquiteturas. A imagem correta Ã© automaticamente baixada com base na arquitetura do cliente."
  }
]} />

## Limpeza

```bash
# Delete Container App
az containerapp delete \
  --name ca-product-catalog \
  --resource-group $RESOURCE_GROUP \
  --yes

# Delete Container Apps environment
az containerapp env delete \
  --name cae-contoso-prod \
  --resource-group $RESOURCE_GROUP \
  --yes

# Delete ACR
az acr delete --name $ACR_NAME --yes

# Delete resource group
az group delete --name rg-contoso-containers --yes --no-wait
```
