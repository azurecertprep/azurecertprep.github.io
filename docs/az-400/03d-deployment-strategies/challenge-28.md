---
sidebar_position: 4
title: "Challenge 28: Container-based deployments"
---

# Challenge 28: Container-based deployments

## Exam skills mapped

- Implement application deployment by using containers, binaries, and scripts

## Scenario

Contoso Ltd is containerizing their monolithic e-commerce application into three microservices: Product Catalog API, Order Processing Service, and Notification Service. The team needs to build a comprehensive CI/CD pipeline that handles container image building, vulnerability scanning, registry management, and deployment to both Azure Container Apps and Azure Kubernetes Service.

**Environment details:**
- Azure Container Registry: `acrcontosoprod`
- Azure Container Apps Environment: `cae-contoso-prod`
- AKS Cluster: `aks-contoso-prod`
- Resource group: `rg-contoso-containers`
- Region: East US 2

---

## Task 1: Build Docker image in GitHub Actions

### Dockerfile for the Product Catalog API

Create `src/ProductCatalog/Dockerfile`:

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

### GitHub Actions workflow for container build

Create `.github/workflows/container-build.yml`:

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

## Task 2: Push to Azure Container Registry with proper tagging

### Provision ACR

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

### Tagging strategy

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

### Configure retention and cleanup policies

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

## Task 3: Push to GitHub Container Registry (GHCR)

### GitHub Actions workflow for GHCR

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

## Task 4: Deploy to Azure Container Apps via GitHub Actions

### Provision Azure Container Apps environment

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

### GitHub Actions deployment workflow

Create `.github/workflows/deploy-container-apps.yml`:

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

## Task 5: Deploy to AKS via Azure Pipelines

### Kubernetes deployment manifest

Create `k8s/product-catalog/deployment.yml`:

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

### Azure Pipelines YAML for AKS deployment

Create `azure-pipelines-aks.yml`:

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

## Task 6: Image scanning with Trivy and Defender for Containers

### Trivy scanning in GitHub Actions

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

### Enable Microsoft Defender for Containers on ACR

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

### Scan during ACR build (Azure-native)

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

## Task 7: Multi-architecture builds (linux/amd64, linux/arm64)

### Multi-arch build with Docker Buildx in GitHub Actions

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

### Verify multi-arch manifest

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

## Break and fix exercises

### Exercise 1: ACR authentication failure in pipeline

**Symptom:** The GitHub Actions workflow fails with `unauthorized: authentication required` when pushing to ACR.

**Investigate:**
```bash
# Check if the service principal has AcrPush role
az role assignment list \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-containers/providers/Microsoft.ContainerRegistry/registries/acrcontosoprod" \
  --query "[?roleDefinitionName=='AcrPush'].{principal:principalName, role:roleDefinitionName}"
```

**Root cause:** The service principal in the AZURE_CREDENTIALS secret only has `AcrPull` role, not `AcrPush`.

**Fix:**
```bash
# Assign AcrPush role to the service principal
SP_ID=$(az ad sp show --id <app-id> --query id -o tsv)

az role assignment create \
  --assignee $SP_ID \
  --role AcrPush \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-contoso-containers/providers/Microsoft.ContainerRegistry/registries/acrcontosoprod"
```

### Exercise 2: Container app failing health checks after deployment

**Symptom:** After deploying a new image to Azure Container Apps, the revision never becomes active. Logs show repeated restart attempts.

**Investigate:**
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

**Root cause:** The Dockerfile exposes port 8080 but the Container App ingress is configured for port 80.

**Fix:**
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

### Exercise 3: Trivy scan blocking deployment with false positive

**Symptom:** The pipeline fails because Trivy reports a CRITICAL vulnerability in a base image package that has no fix available yet.

**Root cause:** The vulnerability is in a system package in the base image with no upstream fix.

**Fix:** Create a `.trivyignore` file in the project root:
```
# No fix available - tracked in issue #1234
CVE-2024-XXXXX
```

Update the workflow to reference the ignore file:
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

---

## Knowledge check

**Question 1:** Contoso wants to build container images in their CI pipeline and push to Azure Container Registry. The pipeline uses a service principal for authentication. What is the MINIMUM RBAC role required on the ACR for the service principal to push images?

- A. Reader
- B. AcrPull
- C. AcrPush
- D. Contributor

<details>
<summary>Show answer</summary>

**C. AcrPush**

The `AcrPush` role grants permission to push (write) and pull (read) images from ACR. `AcrPull` only allows reading. `Contributor` is overly permissive and includes management plane access. `Reader` provides no data plane access to container images.

</details>

**Question 2:** A container deployed to Azure Container Apps keeps restarting. The application listens on port 8080, but the Container App ingress is configured with `targetPort: 80`. What is the correct fix?

- A. Change the application to listen on port 80
- B. Update the Container App ingress target port to 8080
- C. Add a port mapping rule in the Container Apps environment
- D. Configure a reverse proxy between port 80 and 8080

<details>
<summary>Show answer</summary>

**B. Update the Container App ingress target port to 8080**

The `targetPort` in Azure Container Apps ingress must match the port the container application listens on. If the application is configured to listen on port 8080 (via `ASPNETCORE_URLS` or Dockerfile `EXPOSE`), the Container App ingress must route to that same port.

</details>

**Question 3:** Contoso builds their container images with both `semver` tags (e.g., `1.2.3`) and `sha` tags (e.g., `abc1234`). In production Kubernetes manifests, which tag type should be referenced for reproducible deployments?

- A. `latest` tag for automatic updates
- B. Semver major version tag (e.g., `1`)
- C. Git SHA-based tag (e.g., `abc1234`)
- D. Semver minor version tag (e.g., `1.2`)

<details>
<summary>Show answer</summary>

**C. Git SHA-based tag (e.g., `abc1234`)**

SHA-based tags are immutable and directly correlate to a specific commit, ensuring reproducibility. A given SHA tag always points to exactly one image. Semver tags can be overwritten (moving `1.2.3` to a different image), and `latest` is mutable by definition. For production deployments, immutable references ensure you can trace exactly what code is running.

</details>

**Question 4:** Contoso needs their container images to run on both AMD64 (cloud VMs) and ARM64 (edge devices) architectures. What must be configured in the CI pipeline to produce images for both platforms?

- A. Build the image twice with different Dockerfiles for each architecture
- B. Use Docker Buildx with `platforms: linux/amd64,linux/arm64` and QEMU emulation
- C. Create separate container registries for each architecture
- D. Use Windows containers which support both architectures natively

<details>
<summary>Show answer</summary>

**B. Use Docker Buildx with `platforms: linux/amd64,linux/arm64` and QEMU emulation**

Docker Buildx supports multi-platform builds using QEMU for cross-platform emulation. A single `docker buildx build --platform linux/amd64,linux/arm64` command produces a manifest list containing images for both architectures. The correct image is automatically pulled based on the client's architecture.

</details>

---

## Cleanup

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
