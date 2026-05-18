---
sidebar_position: 3
title: "Challenge 09: Containers in Azure"
---

# Challenge 09: Containers in Azure

:::info Estimated Time & Cost

**45–60 minutes** | **~$0.30** | **Exam Weight: 20–25%**

:::
## Scenario

Contoso's development team has containerized their internal dashboard application. The Dockerfile is ready, but the team has been running containers on a developer's laptop. You need to set up proper container infrastructure in Azure: a private registry to store images, and a hosting platform to run them at scale.

## Exam Skills Covered

| Skill | Weight |
|-------|--------|
| Create and manage Azure Container Registry (ACR) | High |
| Provision Azure Container Instances (ACI) | High |
| Provision Azure Container Apps (ACA) | High |
| Manage container sizing and scaling | Medium |
| Choose between ACI, Container Apps, and AKS | Medium |

## Sysadmin ↔ Azure Reference

| Traditional | Azure Equivalent |
|-------------|-----------------|
| Docker private registry (Harbor, Nexus) | Azure Container Registry (ACR) |
| `docker run` on a VM | Azure Container Instances (ACI) |
| Docker Compose + reverse proxy | Azure Container Apps (ACA) |
| `docker-compose scale web=5` | ACA scaling rules |
| Kubernetes cluster (self-managed) | AKS (managed Kubernetes) |

## Tasks

### Task 1: Create an Azure Container Registry

```bash
# Create a resource group
az group create --name rg-containers-lab --location eastus

# Create an ACR (Basic SKU for lab purposes)
# Name must be globally unique, 5-50 alphanumeric characters
az acr create \
  --resource-group rg-containers-lab \
  --name contosoreglab$RANDOM \
  --sku Basic \
  --admin-enabled true

# Store the registry name for later use
ACR_NAME=$(az acr list -g rg-containers-lab --query "[0].name" -o tsv)
echo "ACR Name: $ACR_NAME"

# Verify the registry
az acr show --name $ACR_NAME --query "{Name:name, SKU:sku.name, LoginServer:loginServer}" -o table
```

### Task 2: Build and Push an Image to ACR

Use `az acr build` to build directly in the cloud | no local Docker needed:

```bash
# Create a simple app directory
mkdir container-app && cd container-app

# Create a simple Dockerfile
cat > Dockerfile << 'EOF'
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
EOF

# Create a sample page
cat > index.html << 'EOF'
<!DOCTYPE html>
<html><body>
<h1>Contoso Dashboard</h1>
<p>Running on Azure Containers</p>
</body></html>
EOF

# Build and push using ACR Tasks (builds in the cloud)
az acr build \
  --registry $ACR_NAME \
  --image contoso-dashboard:v1 \
  .

# Verify the image is in the registry
az acr repository list --name $ACR_NAME -o table
az acr repository show-tags --name $ACR_NAME --repository contoso-dashboard -o table
```

### Task 3: Deploy to Azure Container Instances

```bash
# Get ACR credentials
ACR_LOGIN=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# Deploy to ACI
az container create \
  --resource-group rg-containers-lab \
  --name aci-dashboard \
  --image "$ACR_LOGIN/contoso-dashboard:v1" \
  --registry-login-server $ACR_LOGIN \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label contoso-aci-$RANDOM \
  --ports 80 \
  --cpu 0.5 \
  --memory 0.5

# Get the FQDN and test
az container show -g rg-containers-lab -n aci-dashboard \
  --query "{FQDN:ipAddress.fqdn, State:instanceView.state, IP:ipAddress.ip}" -o table

ACI_FQDN=$(az container show -g rg-containers-lab -n aci-dashboard --query ipAddress.fqdn -o tsv)
echo "Test: http://$ACI_FQDN"

# View container logs
az container logs -g rg-containers-lab -n aci-dashboard
```

### Task 4: Create a Container Apps Environment

```bash
# Install/update the Container Apps extension
az extension add --name containerapp --upgrade

# Register required providers
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights

# Create a Container Apps environment
az containerapp env create \
  --resource-group rg-containers-lab \
  --name cae-contoso-lab \
  --location eastus
```

### Task 5: Deploy to Container Apps

```bash
# Enable managed identity access to ACR (preferred over admin credentials)
az containerapp create \
  --resource-group rg-containers-lab \
  --name ca-dashboard \
  --environment cae-contoso-lab \
  --image "$ACR_LOGIN/contoso-dashboard:v1" \
  --registry-server $ACR_LOGIN \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --target-port 80 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 5

# Get the URL
az containerapp show -g rg-containers-lab -n ca-dashboard \
  --query "properties.configuration.ingress.fqdn" -o tsv
```

### Task 6: Configure Container Apps Scaling

```bash
# Add an HTTP scaling rule (scale when concurrent requests > 10 per replica)
az containerapp update \
  --resource-group rg-containers-lab \
  --name ca-dashboard \
  --min-replicas 1 \
  --max-replicas 10 \
  --scale-rule-name http-scaling \
  --scale-rule-type http \
  --scale-rule-http-concurrency 10

# Verify scaling configuration
az containerapp show -g rg-containers-lab -n ca-dashboard \
  --query "properties.template.scale" -o json

# Check current replica count
az containerapp replica list -g rg-containers-lab -n ca-dashboard -o table
```

### Task 7: Compare ACI vs Container Apps

Run both deployments and compare:

```bash
# Compare ACI details
echo "=== ACI ==="
az container show -g rg-containers-lab -n aci-dashboard \
  --query "{Name:name, CPU:containers[0].resources.requests.cpu, Memory:containers[0].resources.requests.memoryInGb, State:instanceView.state}" -o table

# Compare Container Apps details
echo "=== Container Apps ==="
az containerapp show -g rg-containers-lab -n ca-dashboard \
  --query "{Name:name, Replicas:properties.template.scale, Ingress:properties.configuration.ingress.fqdn}" -o json
```

<details>
<summary>💡 Hint | When to use ACI vs Container Apps vs AKS</summary>

| Feature | ACI | Container Apps | AKS |
|---------|-----|---------------|-----|
| **Best for** | Simple, short-lived tasks | Microservices, APIs | Complex orchestration |
| **Scaling** | Manual only | Auto (HTTP, KEDA) | Auto (HPA, KEDA) |
| **Networking** | Basic | Built-in ingress | Full Kubernetes networking |
| **Cost model** | Per-second billing | Per-second + free tier | Cluster + node VMs |
| **Startup** | Seconds | Seconds | Minutes (cluster) |
| **Complexity** | Very low | Low | High |
</details>

## ✅ Success Criteria

- [ ] ACR created and contains the `contoso-dashboard:v1` image
- [ ] ACI running and accessible via HTTP
- [ ] Container Apps environment created
- [ ] Container App deployed and accessible via HTTPS
- [ ] Scaling rules configured on Container Apps
- [ ] Can articulate when to use ACI vs Container Apps vs AKS

## Break & Fix Scenarios

### Scenario A: Wrong Image Name
```bash
# Deploy ACI with a misspelled image name
az container create \
  --resource-group rg-containers-lab \
  --name aci-broken \
  --image "$ACR_LOGIN/contoso-dashbord:v1" \
  --registry-login-server $ACR_LOGIN \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --ports 80
# What error do you get? Check: az container show -g rg-containers-lab -n aci-broken --query "instanceView"
```

### Scenario B: ACR Permission Issue
```bash
# Try deploying Container Apps without providing registry credentials
az containerapp create \
  --resource-group rg-containers-lab \
  --name ca-broken \
  --environment cae-contoso-lab \
  --image "$ACR_LOGIN/contoso-dashboard:v1" \
  --target-port 80 \
  --ingress external
# How do you fix ACR authentication? (Hint: managed identity or admin credentials)
```

### Scenario C: Port Mismatch
```bash
# Deploy with wrong target port
az containerapp create \
  --resource-group rg-containers-lab \
  --name ca-wrong-port \
  --environment cae-contoso-lab \
  --image "$ACR_LOGIN/contoso-dashboard:v1" \
  --registry-server $ACR_LOGIN \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --target-port 8080 \
  --ingress external
# The app runs but returns 502 errors. Why?
```

## 📝 Knowledge Check

**1. What are the differences between ACR SKUs?**

<details>
<summary>Show Answer</summary>

| Feature | Basic | Standard | Premium |
|---------|-------|----------|---------|
| Storage | 10 GB | 100 GB | 500 GB |
| Webhooks | 2 | 10 | 500 |
| Geo-replication | ❌ | ❌ | ✅ |
| Private Link | ❌ | ❌ | ✅ |
| Content trust | ❌ | ❌ | ✅ |
| Customer-managed keys | ❌ | ❌ | ✅ |
</details>

**2. When should you use ACI vs Container Apps vs AKS?**

<details>
<summary>Show Answer</summary>

- **ACI**: Simple batch jobs, build agents, sidecar containers, quick tests. No orchestration needed. Per-second billing.
- **Container Apps**: Microservices, APIs, event-driven apps, web apps. Built-in scaling with KEDA, Dapr integration, easy HTTPS ingress. Serverless pricing.
- **AKS**: Full Kubernetes needed | complex networking, custom operators, stateful workloads, multi-container pods with shared storage. You manage the cluster.
</details>

**3. What is the difference between ACR admin account and managed identity for authentication?**

<details>
<summary>Show Answer</summary>

- **Admin account**: A shared username/password. Simple but insecure | anyone with the password has full push/pull access. Disabled by default. Use only for dev/test.
- **Managed identity**: Azure AD–based authentication. No passwords to manage. Supports role-based access (AcrPull, AcrPush). Recommended for production. Works with ACI, Container Apps, AKS, and App Service.
</details>

**4. What does `az acr build` do differently from `docker build`?**

<details>
<summary>Show Answer</summary>

`az acr build` runs the build **in the cloud** using ACR Tasks. It uploads the build context to Azure, builds the image on Azure compute, and pushes the result directly into the registry. You don't need Docker installed locally. This is ideal for CI/CD pipelines and developers without Docker Desktop.
</details>

## 🧹 Cleanup

```bash
# Delete all resources
az group delete --name rg-containers-lab --yes --no-wait

# Clean up local files
rm -rf container-app

echo "Resources are being deleted in the background."
```
