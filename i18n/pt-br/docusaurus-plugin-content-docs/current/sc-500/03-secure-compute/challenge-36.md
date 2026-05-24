---
sidebar_position: 36
title: "Desafio 36: Segurança de Containers – Defender for Containers & Hardening de AKS"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 36: Segurança de Containers – Defender for Containers & Hardening de AKS

## Habilidades do exame cobertas

- Habilitar e configurar Microsoft Defender for Containers
- Endurecer clusters Azure Kubernetes Service (AKS) com melhores práticas de segurança
- Implementar Network Policies e Pod Security Standards
- Configurar proteção contra ameaças em tempo de execução para workloads de containers
- Impor integridade de imagem e políticas de controle de admissão
- Monitorar e responder a alertas de segurança de containers

## Cenário

A Contoso Ltd está migrando aplicações críticas para o Azure Kubernetes Service. A equipe de engenharia de plataforma implantou um cluster AKS, mas a equipe de segurança identificou várias lacunas de hardening: o cluster permite containers privilegiados, não possui Network Policies, usa acesso público ao API server e não tem detecção de ameaças em tempo de execução. Você deve proteger o cluster AKS seguindo os baselines de segurança da Microsoft e habilitar o Defender for Containers.

---

## Pré-requisitos

- Assinatura Azure com acesso de Contributor
- Plano Microsoft Defender for Containers habilitado
- Azure CLI com extensão `aks`
- `kubectl` configurado
- Conhecimento básico de networking e RBAC do Kubernetes

---

## Tarefa 1: Habilitar Defender for Containers

Ative a proteção contra ameaças em containers e configure as opções de varredura.

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

## Tarefa 2: Endurecer o acesso ao API server do AKS

Restrinja o acesso ao API server apenas para redes autorizadas.

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

## Tarefa 3: Implementar Pod Security Standards

Aplique Pod Security Standards para impedir containers privilegiados e configurações inseguras.

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

Crie uma política de segurança de pods restritiva via Azure Policy:

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

## Tarefa 4: Implementar Network Policies

Crie Network Policies do Kubernetes para impor microssegmentação entre workloads.

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

## Tarefa 5: Configurar integridade de imagem e controle de admissão

Garanta que apenas imagens verificadas de registries confiáveis possam ser executadas no cluster.

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

# Enable vulnerability scanning on the ACR
az security pricing create --name "ContainerRegistry" --tier "Standard"

# Enable continuous scanning of running images
az aks update \
    --resource-group "rg-contoso-containers" \
    --name "aks-contoso-prod" \
    --enable-defender
```

---

## Tarefa 6: Revisar e responder a alertas do Defender for Containers

Monitore alertas de segurança em tempo de execução e investigue ameaças.

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

## Quebra & conserta

### Cenário 1: Pods de aplicação falhando ao iniciar após aplicação de Pod Security Standard

Após aplicar `pod-security.kubernetes.io/enforce=restricted` no namespace de produção, todos os pods de aplicação estão presos em `CreateContainerError` com violações de contexto de segurança.

<details>
<summary>Mostrar solução</summary>

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

### Cenário 2: Defender for Containers não gera alertas apesar de ameaças conhecidas

Um teste de penetração implantou um container de crypto miner e executou comandos suspeitos, mas nenhum alerta do Defender apareceu.

<details>
<summary>Mostrar solução</summary>

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
az security alert list --query "[?alertType contains 'K8S']"
```

</details>

### Cenário 3: Network Policy bloqueando resolução DNS interna legítima

Após aplicar a Network Policy de negação padrão, os pods não conseguem resolver nomes de serviço internos do Kubernetes e toda comunicação entre serviços falha.

<details>
<summary>Mostrar solução</summary>

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

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "O que o Microsoft Defender for Containers fornece que a segurança nativa do Kubernetes não oferece?",
    options: [
      "Network Policies entre pods",
      "Detecção de ameaças em tempo de execução, avaliação de vulnerabilidades de imagens e alertas de segurança para comportamentos suspeitos como crypto mining ou reverse shells",
      "Agendamento de pods e limites de recursos",
      "Construção e push de imagens de container"
    ],
    correctIndex: 1,
    explanation: "O Defender for Containers adiciona uma camada de segurança em tempo de execução que detecta ameaças (crypto mining, reverse shells, execução anômala de processos), varre imagens de container em busca de vulnerabilidades conhecidas e gera alertas de segurança acionáveis — capacidades que não são nativas do Kubernetes."
  },
  {
    question: "Qual é o efeito de configurar `pod-security.kubernetes.io/enforce=restricted` em um namespace?",
    options: [
      "Registra avisos mas permite que todos os pods sejam executados",
      "Bloqueia a criação de pods que violam o Pod Security Standard restrito (sem root, sem privilegiado, sem hostPath, seccomp obrigatório)",
      "Afeta apenas pods com o label 'security=restricted'",
      "Criptografa todo o tráfego pod-a-pod no namespace"
    ],
    correctIndex: 1,
    explanation: "O label 'enforce=restricted' faz o Kubernetes rejeitar (negar admissão) qualquer pod que viole o Pod Security Standard restrito. Isso inclui executar como root, usar containers privilegiados, montar host paths ou não ter perfis seccomp."
  },
  {
    question: "Por que você deve desabilitar contas locais em um cluster AKS?",
    options: [
      "Para melhorar o desempenho de inicialização dos pods",
      "Para forçar toda autenticação do cluster através do Entra ID, habilitando Conditional Access, registro de auditoria e controle de acesso baseado em roles",
      "Para impedir que nós se juntem ao cluster",
      "Contas locais não têm efeito na segurança"
    ],
    correctIndex: 1,
    explanation: "Desabilitar contas locais força toda autenticação através do Entra ID (Azure AD), o que habilita políticas de Conditional Access, registro de auditoria centralizado, acesso baseado em roles com Azure RBAC e impede o uso de credenciais estáticas compartilhadas."
  }
]} />

## Limpeza

```bash
# Delete AKS cluster and resources
az group delete --name "rg-contoso-containers" --yes --no-wait
```
