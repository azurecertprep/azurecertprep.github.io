---
sidebar_position: 36
title: "Challenge 36: Container Security – Defender for Containers & AKS Hardening"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 36: Container Security – Defender for Containers & AKS Hardening

## Exam skills covered

- Enable and configure Microsoft Defender for Containers
- Harden Azure Kubernetes Service (AKS) clusters with security best practices
- Implement network policies and pod security standards
- Configure runtime threat protection for container workloads
- Enforce image integrity and admission control policies
- Monitor and respond to container security alerts

## Scenario

Contoso Ltd is migrating critical applications to Azure Kubernetes Service. The platform engineering team has deployed an AKS cluster but the security team has identified multiple hardening gaps: the cluster allows privileged containers, has no network policies, uses public API server access, and lacks runtime threat detection. You must secure the AKS cluster following Microsoft security baselines and enable Defender for Containers.

---

## Prerequisites

- Azure subscription with Contributor access
- Microsoft Defender for Containers plan enabled
- Azure CLI with `aks` extension
- `kubectl` configured
- Basic understanding of Kubernetes networking and RBAC

---

## Task 1: Enable Defender for Containers

Activate container threat protection and configure scanning options.

```bash
# Create resource group
az group create --name "rg-contoso-containers" --location "eastus"

# Enable Defender for Containers plan
az security pricing create \
    --name "Containers" \
    --tier "Standard"

# Verify the plan status
az security pricing show --name "Containers" \
    --query "{name: name, tier: pricingTier}"

# Create a hardened AKS cluster
# Note: --enable-image-integrity requires aks-preview extension (az extension add --name aks-preview)
az aks create \
    --resource-group "rg-contoso-containers" \
    --name "aks-contoso-prod" \
    --location "eastus" \
    --node-count 3 \
    --node-vm-size "Standard_D4s_v5" \
    --network-plugin "azure" \
    --network-policy "azure" \
    --enable-managed-identity \
    --enable-defender \
    --enable-workload-identity \
    --enable-oidc-issuer \
    --enable-image-integrity \
    --generate-ssh-keys \
    --kubernetes-version "1.29" \
    --tier "standard"

# Get credentials
az aks get-credentials \
    --resource-group "rg-contoso-containers" \
    --name "aks-contoso-prod"

# Verify Defender profile is installed
kubectl get pods -n kube-system | grep microsoft-defender
```

---

## Task 2: Harden AKS API server access

Restrict API server access to authorized networks only.

```bash
# Enable API server authorized IP ranges
az aks update \
    --resource-group "rg-contoso-containers" \
    --name "aks-contoso-prod" \
    --api-server-authorized-ip-ranges "203.0.113.0/24,10.0.0.0/8"

# For maximum security, enable private cluster (API server only on private network)
# Note: This must be configured at creation time or via conversion
# az aks update \
#     --resource-group "rg-contoso-containers" \
#     --name "aks-contoso-prod" \
#     --enable-private-cluster

# Disable local accounts (force Entra ID authentication)
az aks update \
    --resource-group "rg-contoso-containers" \
    --name "aks-contoso-prod" \
    --disable-local-accounts

# Enable Azure RBAC for Kubernetes authorization
az aks update \
    --resource-group "rg-contoso-containers" \
    --name "aks-contoso-prod" \
    --enable-azure-rbac

# Assign cluster admin role to the security team
az role assignment create \
    --assignee "security-team-group-id" \
    --role "Azure Kubernetes Service RBAC Cluster Admin" \
    --scope "$(az aks show --resource-group rg-contoso-containers --name aks-contoso-prod --query id -o tsv)"
```

---

## Task 3: Implement Pod Security Standards

Enforce pod security standards to prevent privileged containers and insecure configurations.

```bash
# Apply Pod Security Standards using namespace labels (Kubernetes 1.25+)
# Enforce "restricted" profile for production workloads
kubectl label namespace production \
    pod-security.kubernetes.io/enforce=restricted \
    pod-security.kubernetes.io/enforce-version=latest \
    pod-security.kubernetes.io/warn=restricted \
    pod-security.kubernetes.io/audit=restricted

# Create namespace with security standards
kubectl create namespace contoso-production

kubectl label namespace contoso-production \
    pod-security.kubernetes.io/enforce=restricted \
    pod-security.kubernetes.io/enforce-version=latest \
    pod-security.kubernetes.io/warn=restricted \
    pod-security.kubernetes.io/audit=restricted
```

Create a restricted pod security policy via Azure Policy:

```bash
# Assign built-in AKS security policy initiative
az policy assignment create \
    --name "aks-security-baseline" \
    --display-name "AKS Security Baseline" \
    --policy-set-definition "/providers/Microsoft.Authorization/policySetDefinitions/a8640138-9b0a-4a28-b8cb-1666c838647d" \
    --scope "$(az aks show --resource-group rg-contoso-containers --name aks-contoso-prod --query id -o tsv)" \
    --params '{
        "effect": {"value": "deny"},
        "excludedNamespaces": {"value": ["kube-system", "gatekeeper-system", "azure-arc"]}
    }'

# Assign policy: "Kubernetes cluster should not allow privileged containers"
az policy assignment create \
    --name "deny-privileged-containers" \
    --display-name "Deny Privileged Containers" \
    --policy "/providers/Microsoft.Authorization/policyDefinitions/95edb821-ddaf-4404-9ab7-b5e48dd6d8e0" \
    --scope "$(az aks show --resource-group rg-contoso-containers --name aks-contoso-prod --query id -o tsv)" \
    --params '{"effect": {"value": "deny"}, "excludedNamespaces": {"value": ["kube-system"]}}'

# Assign policy: "Kubernetes cluster containers should only use allowed images"
az policy assignment create \
    --name "allowed-container-images" \
    --display-name "Only Allow ACR Images" \
    --policy "/providers/Microsoft.Authorization/policyDefinitions/febd0533-8e55-448f-b837-bd0e06f16469" \
    --scope "$(az aks show --resource-group rg-contoso-containers --name aks-contoso-prod --query id -o tsv)" \
    --params '{"effect": {"value": "deny"}, "allowedContainerImagesRegex": {"value": "^contosoacr\\.azurecr\\.io/.+$"}}'
```

---

## Task 4: Implement network policies

Create Kubernetes network policies to enforce microsegmentation between workloads.

```yaml
# Save as deny-all-default.yaml
cat << 'EOF' | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: contoso-production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
# Allow frontend to talk to backend API only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: contoso-production
spec:
  podSelector:
    matchLabels:
      app: backend-api
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
---
# Allow backend to talk to database only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-db
  namespace: contoso-production
spec:
  podSelector:
    matchLabels:
      app: database
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: backend-api
    ports:
    - protocol: TCP
      port: 5432
---
# Allow DNS egress for all pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: contoso-production
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector: {}
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
EOF
```

---

## Task 5: Configure image integrity and admission control

Ensure only verified images from trusted registries can run in the cluster.

```bash
# Enable image integrity on the AKS cluster (verifies image signatures)
az aks update \
    --resource-group "rg-contoso-containers" \
    --name "aks-contoso-prod" \
    --enable-image-integrity

# Verify image integrity is active
az aks show \
    --resource-group "rg-contoso-containers" \
    --name "aks-contoso-prod" \
    --query "securityProfile.imageIntegrity"

# Create an ACR for trusted images
az acr create \
    --resource-group "rg-contoso-containers" \
    --name "contosoacr" \
    --sku "Premium" \
    --location "eastus"

# Attach ACR to AKS (allows pull without secrets)
az aks update \
    --resource-group "rg-contoso-containers" \
    --name "aks-contoso-prod" \
    --attach-acr "contosoacr"

# Note: ContainerRegistry and KubernetesService plans merged into unified 'Containers' plan
az security pricing create --name "Containers" --tier Standard

# Enable continuous scanning of running images
az aks update \
    --resource-group "rg-contoso-containers" \
    --name "aks-contoso-prod" \
    --enable-defender
```

---

## Task 6: Review and respond to Defender for Containers alerts

Monitor runtime security alerts and investigate threats.

```bash
# List container-specific security alerts
az security alert list \
    --query "[?contains(alertType, 'K8S') || contains(alertType, 'Container')]" \
    --output json | jq '.[] | {type: .alertType, severity: .severity, description: .description, resource: .compromisedEntity}'

# Common Defender for Containers alert types:
# - K8S.NODE_CryptoCoinMiner: Crypto mining detected
# - K8S.NODE_SuspectProcessTermination: Defense evasion
# - K8S_PrivilegedContainer: Privileged container created
# - K8S_ExposedDashboard: Kubernetes dashboard exposed
# - K8S_MaliciousAdmissionController: Suspicious admission webhook

# Get AKS Defender security recommendations
az security assessment list \
    --query "[?contains(displayName, 'Kubernetes') || contains(displayName, 'AKS')]" \
    --output table

# Check for vulnerable images in running pods
kubectl get pods --all-namespaces -o json | \
    jq '.items[].spec.containers[].image' | sort -u
```

---

## Break & Fix

### Scenario 1: Application pods failing to start after Pod Security Standard enforcement

After applying `pod-security.kubernetes.io/enforce=restricted` to the production namespace, all application pods are stuck in `CreateContainerError` with security context violations.

<details>
<summary>Show solution</summary>

```bash
# 1. Check the specific error
kubectl describe pod -n contoso-production <pod-name> | grep -A5 "Events"

# 2. Common violations with "restricted" profile:
# - Running as root (must set runAsNonRoot: true)
# - Missing seccompProfile
# - Privileged escalation allowed
# - Capabilities not dropped

# 3. Fix the deployment to comply with restricted profile
cat << 'EOF' | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: contoso-production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: api
        image: contosoacr.azurecr.io/backend-api:v1.2
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
              - ALL
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      volumes:
      - name: tmp
        emptyDir: {}
EOF

# 4. If immediate fix isn't possible, temporarily use "warn" instead of "enforce"
kubectl label namespace contoso-production \
    pod-security.kubernetes.io/enforce=baseline \
    pod-security.kubernetes.io/warn=restricted \
    --overwrite
```

</details>

### Scenario 2: Defender for Containers not generating alerts despite known threats

A penetration test deployed a crypto miner container and ran suspicious commands, but no Defender alerts appeared.

<details>
<summary>Show solution</summary>

```bash
# 1. Verify Defender for Containers is enabled
az security pricing show --name "Containers" --query "pricingTier"

# 2. Check if the Defender profile/daemonset is running on AKS
kubectl get pods -n kube-system -l app=microsoft-defender
kubectl get ds -n kube-system | grep defender

# 3. If Defender pods are not present, re-enable
az aks update \
    --resource-group "rg-contoso-containers" \
    --name "aks-contoso-prod" \
    --enable-defender

# 4. Check Defender sensor logs for connectivity issues
kubectl logs -n kube-system -l app=microsoft-defender --tail=50

# 5. Verify the cluster can reach Defender backend endpoints
# Required: *.ods.opinsights.azure.com, *.oms.opinsights.azure.com
kubectl exec -it -n kube-system $(kubectl get pods -n kube-system -l app=microsoft-defender -o name | head -1) -- \
    wget -qO- --timeout=5 https://eastus.ods.opinsights.azure.com

# 6. Check for NSG or firewall rules blocking outbound from nodes
az network nsg rule list --resource-group "MC_rg-contoso-containers_aks-contoso-prod_eastus" \
    --nsg-name "aks-agentpool-nsg" \
    --query "[?direction=='Outbound' && access=='Deny']"

# 7. Alert processing delay - Defender alerts can take 5-10 minutes
# Check again after waiting
az security alert list --query "[?contains(alertType, 'K8S')]"
```

</details>

### Scenario 3: Network policy blocking legitimate internal DNS resolution

After applying the default-deny network policy, pods cannot resolve internal Kubernetes service names and all inter-service communication fails.

<details>
<summary>Show solution</summary>

```bash
# 1. Verify DNS resolution is failing
kubectl exec -n contoso-production <pod-name> -- nslookup kubernetes.default

# 2. The issue is the default-deny egress policy blocks DNS
# Verify the DNS allow policy exists
kubectl get networkpolicy -n contoso-production allow-dns-egress -o yaml

# 3. Fix: Ensure DNS egress targets the correct kube-dns pods
cat << 'EOF' | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: contoso-production
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
EOF

# 4. Also ensure the kube-system namespace has the correct label
kubectl label namespace kube-system kubernetes.io/metadata.name=kube-system --overwrite

# 5. Test DNS resolution again
kubectl exec -n contoso-production <pod-name> -- nslookup backend-api.contoso-production.svc.cluster.local
```

</details>

---

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What does Microsoft Defender for Containers provide that Kubernetes built-in security does not?",
    options: [
      "Network policies between pods",
      "Runtime threat detection, vulnerability assessment of images, and security alerts for suspicious behaviors like crypto mining or reverse shells",
      "Pod scheduling and resource limits",
      "Container image building and pushing"
    ],
    correctIndex: 1,
    explanation: "Defender for Containers adds a runtime security layer that detects threats (crypto mining, reverse shells, anomalous process execution), scans container images for known vulnerabilities, and generates actionable security alerts — capabilities not native to Kubernetes."
  },
  {
    question: "What is the effect of setting `pod-security.kubernetes.io/enforce=restricted` on a namespace?",
    options: [
      "It logs warnings but allows all pods to run",
      "It blocks pod creation that violates the restricted pod security standard (no root, no privileged, no hostPath, seccomp required)",
      "It only affects pods with the 'security=restricted' label",
      "It encrypts all pod-to-pod traffic in the namespace"
    ],
    correctIndex: 1,
    explanation: "The 'enforce=restricted' label causes Kubernetes to reject (deny admission) any pod that violates the restricted Pod Security Standard. This includes running as root, using privileged containers, mounting host paths, or missing seccomp profiles."
  },
  {
    question: "Why should you disable local accounts on an AKS cluster?",
    options: [
      "To improve pod startup performance",
      "To force all cluster authentication through Entra ID, enabling Conditional Access, audit logging, and role-based access control",
      "To prevent nodes from joining the cluster",
      "Local accounts have no effect on security"
    ],
    correctIndex: 1,
    explanation: "Disabling local accounts forces all authentication through Entra ID (Azure AD), which enables Conditional Access policies, centralized audit logging, role-based access with Azure RBAC, and prevents the use of shared static credentials."
  }
]} />

## Cleanup

```bash
# Delete AKS cluster and resources
az group delete --name "rg-contoso-containers" --yes --no-wait
```
