---
sidebar_position: 3
title: "Challenge 36: Design a Container-Based Solution"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 36: design a Container-Based solution

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $5-20 | **Exam Weight: 30-35%**

:::

## Introduction

CloudCart is a SaaS company migrating 20 microservices from an on-premises Kubernetes cluster to Azure. The engineering team has varying levels of Kubernetes expertise: the platform team is proficient with kubectl, Helm charts, and service meshes, but the application developers just want to deploy containers without managing infrastructure. The company needs to select the right container hosting service for each microservice based on its operational requirements.

The 20 microservices fall into three categories: (1) Eight services that require fine-grained control over networking, custom ingress controllers (NGINX with specific annotations), a service mesh (Istio) for mTLS between services, and custom Kubernetes operators for database failover. (2) Ten services that are simple stateless HTTP APIs needing only auto-scaling, revision management, and Dapr integration for pub/sub messaging. (3) Two ML inference services that require NVIDIA GPUs for real-time image classification, process requests in bursts, and need to scale to zero when no inference requests are queued.

The migration budget requires minimizing operational overhead where possible. The platform team can manage one Kubernetes cluster but does not have bandwidth to manage multiple clusters or handle day-2 operations for simple workloads.

## Exam skills covered

- Recommend a container-based solution

## Design tasks

### Part 1: Container platform selection

1. Evaluate the three primary Azure container hosting options for each microservice category:

| Criteria | AKS | Azure Container Apps | Azure Container Instances |
|----------|-----|---------------------|--------------------------|
| Kubernetes control plane | Full access | Abstracted (built on AKS) | None |
| Custom networking | Full CNI control | Limited (envoy-based) | VNet injection |
| Service mesh support | Any (Istio, Linkerd) | Built-in Dapr | None |
| GPU support | Yes (GPU node pools) | Yes (GPU workload profiles) | Yes (GPU SKUs) |
| Scale to zero | Yes (with KEDA) | Native | N/A (per-execution) |
| Minimum operational overhead | High | Low | Lowest |

2. Assign each microservice category to the appropriate platform:
   - Category 1 (complex, needs Kubernetes primitives): Which platform and why?
   - Category 2 (simple HTTP APIs with Dapr): Which platform and why?
   - Category 3 (GPU inference, scale-to-zero): Which platform and why?

3. Document why running all 20 services on AKS would be operationally wasteful, and why running the Category 1 services on Container Apps would be technically insufficient.

### Part 2: AKS cluster design

4. Design the AKS cluster for the 8 complex microservices:
   - **Networking**: Compare Azure CNI vs Azure CNI Overlay vs kubenet:
     - kubenet: Simple, uses NAT, limited to 400 nodes, no Windows support
     - Azure CNI: Every pod gets a VNet IP, consumes subnet address space
     - Azure CNI Overlay: Pods get overlay IPs, preserves VNet address space
   - Select the networking model and justify based on IP address constraints

5. Design the node pool strategy:
   - System node pool (control plane components): What size and count?
   - User node pool for application workloads: Auto-scaling bounds?
   - Should GPU workloads run in the same cluster (separate node pool) or separately?

6. Plan the cluster scaling configuration:
   - Cluster autoscaler: Min/max node counts per pool
   - KEDA (Kubernetes Event-Driven Autoscaling): For which workloads?
   - Horizontal Pod Autoscaler: CPU/memory thresholds

### Part 3: Container Apps environment design

7. Design the Azure Container Apps environment for the 10 simple HTTP APIs:
   - Environment type: Consumption-only vs Dedicated (workload profiles)?
   - Scaling rules: HTTP concurrent requests, queue length, custom metrics?
   - Revision management: Single vs multiple active revisions (traffic splitting)?

8. Configure Dapr integration for the Container Apps:
   - Which Dapr building blocks are needed (pub/sub, state, service invocation)?
   - How does Dapr service-to-service invocation work within a Container Apps environment?
   - What is the networking model between Container Apps in the same environment?

### Part 4: Container Registry and security

9. Design the Azure Container Registry (ACR) strategy:
   - Which ACR tier (Basic, Standard, Premium) meets the requirements?
   - How should images be shared between AKS and Container Apps?
   - Enable vulnerability scanning with Microsoft Defender for Containers

10. Plan the container security posture:
    - Image signing and content trust
    - Runtime security scanning
    - Network policies for pod-to-pod communication in AKS
    - Managed identity for pulling images (vs. admin credentials)

11. Design the CI/CD pipeline for deploying to both AKS (Helm charts) and Container Apps (revision deployment) from a single container registry.

## Success criteria

<SuccessChecklist
  storageKey="az305-challenge-36"
  items={[
    "Each microservice category mapped to the correct container platform with justification",
    "AKS networking model selected with IP address space analysis",
    "Node pool strategy designed with auto-scaling bounds and GPU node pool consideration",
    "Container Apps environment configured with appropriate scaling rules and Dapr integration",
    "ACR tier selected with security scanning and managed identity access configured",
    "Clear rationale documented for why a single platform for all 20 services is suboptimal"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Platform Selection Decision Tree</summary>

Use this decision flow:
1. Does the service need custom Kubernetes resources (CRDs, operators, service mesh)? → AKS
2. Does the service need GPU compute with scale-to-zero? → Container Apps with GPU workload profiles or AKS with GPU node pools
3. Is it a simple HTTP API or event-driven processor? → Azure Container Apps
4. Is it a short-lived batch task or sidecar? → Azure Container Instances (or AKS Jobs)

Container Apps is built on AKS internally but abstracts away cluster management. You get Envoy-based ingress, KEDA-based scaling, and Dapr integration without managing the control plane.

</details>

<details>
<summary>Hint 2: AKS Networking Comparison</summary>

**kubenet**: Pods get IPs from a separate address space (10.244.0.0/16 by default). Only node IPs consume VNet addresses. Limited to 400 nodes and 250 pods/node. No Windows container support. Simple but with limitations.

**Azure CNI**: Every pod gets a VNet IP. A /24 subnet (256 addresses) supports only ~8 nodes with 30 pods each. You need a large subnet (e.g., /16) for 100+ pods. Benefit: pods are directly addressable from the VNet.

**Azure CNI Overlay**: Pods get overlay network IPs (not VNet IPs). Nodes still consume VNet IPs. Best for large clusters that need VNet integration without consuming massive address space. Supports up to 1,000 nodes and 250 pods/node.

For most new AKS deployments, Azure CNI Overlay provides the best balance.

</details>

<details>
<summary>Hint 3: Container Apps GPU Workload Profiles</summary>

Azure Container Apps supports GPU workloads through dedicated workload profiles. Key considerations:
- Use a Dedicated environment (not Consumption-only) to access GPU profiles
- GPU profiles provide NVIDIA GPUs for ML inference workloads
- Scale-to-zero is supported, meaning you pay nothing when no inference requests arrive
- This eliminates the need for a separate AKS cluster just for 2 GPU services

Compare the operational cost: managing a GPU node pool in AKS (node pool configuration, driver updates, scheduling) vs. Container Apps GPU profile (fully managed, just deploy your container).

</details>

<details>
<summary>Hint 4: ACR Tier Selection</summary>

- **Basic**: 10 GiB storage, suitable for dev/test
- **Standard**: 100 GiB storage, higher throughput, suitable for most production workloads
- **Premium**: 500 GiB storage, geo-replication, private link, content trust, zone redundancy

For this scenario, **Premium** is recommended because:
- Geo-replication ensures fast pulls from AKS clusters in any region
- Private link secures the registry endpoint within the VNet
- Content trust enables image signing for supply chain security
- Defender for Containers integration for vulnerability scanning is available at all tiers but Premium provides the network isolation needed for production

</details>

## Learning resources

- [Comparing Azure container options](https://learn.microsoft.com/en-us/azure/container-apps/compare-options)
- [AKS networking concepts](https://learn.microsoft.com/en-us/azure/aks/concepts-network)
- [Azure Container Apps overview](https://learn.microsoft.com/en-us/azure/container-apps/overview)
- [Azure Container Registry service tiers](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Dapr integration with Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/dapr-overview)

## Knowledge check

<details>
<summary>1. A team needs to run an Istio service mesh with custom EnvoyFilter resources. Can they use Azure Container Apps?</summary>

**No.** Azure Container Apps uses its own managed Envoy-based ingress and Dapr sidecar architecture. You cannot install Istio, apply custom EnvoyFilters, or use Kubernetes CRDs. Container Apps abstracts the underlying Kubernetes layer, which means you cannot access the control plane or deploy custom operators. For workloads requiring a specific service mesh, custom CRDs, or direct Kubernetes API access, AKS is required. The trade-off is higher operational overhead in exchange for full Kubernetes flexibility.

</details>

<details>
<summary>2. An AKS cluster needs 500 pods but the VNet subnet is only a /24 (256 addresses). Which networking model solves this?</summary>

**Azure CNI Overlay.** With standard Azure CNI, every pod consumes a VNet IP address, making a /24 subnet insufficient for 500 pods. Azure CNI Overlay assigns pods IPs from an overlay network (not the VNet), so only node IPs consume VNet addresses. A /24 subnet can support up to 251 nodes (minus reserved addresses), each running up to 250 pods. This provides massive scale without requiring a larger VNet subnet. Kubenet is an alternative but has a 400-node limit and lacks some advanced features.

</details>

<details>
<summary>3. Why would you choose Azure Container Apps over AKS for simple stateless HTTP APIs?</summary>

**Reduced operational overhead with equivalent functionality for simple workloads.** Container Apps provides built-in auto-scaling (including scale-to-zero), revision-based deployments, traffic splitting, custom domains, TLS termination, and Dapr integration without requiring cluster management, node patching, control plane upgrades, or networking configuration. For a team that just wants to deploy a container image and define scaling rules, Container Apps eliminates the undifferentiated heavy lifting of Kubernetes operations while providing the same core platform capabilities for HTTP workloads.

</details>

<details>
<summary>4. A company has 2 GPU-based ML inference services. Should they deploy a dedicated AKS cluster with GPU node pools or use Container Apps with GPU workload profiles?</summary>

**Container Apps with GPU workload profiles, unless the services require custom Kubernetes scheduling or device plugins.** For only 2 GPU services that need scale-to-zero and burst scaling, managing an entire AKS cluster with GPU node pools introduces significant overhead (driver management, node pool configuration, KEDA setup). Container Apps GPU profiles provide a fully managed experience with native scale-to-zero. Choose AKS GPU node pools only if you need custom NVIDIA device plugins, multi-GPU scheduling, or the services are part of a larger AKS ecosystem that already exists.

</details>

## Validation lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge36 --location eastus
```

2. Create a Container Apps environment:

```bash
az containerapp env create --resource-group rg-az305-challenge36 \
  --name cae-challenge36 --location eastus
```

3. Deploy a simple HTTP container with scale-to-zero enabled:

```bash
az containerapp create --resource-group rg-az305-challenge36 \
  --name ca-hello --environment cae-challenge36 \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --target-port 80 --ingress external \
  --min-replicas 0 --max-replicas 3
```

4. Verify the app is responding and check the replica count:

```bash
az containerapp show --resource-group rg-az305-challenge36 --name ca-hello \
  --query "{FQDN:properties.configuration.ingress.fqdn, Replicas:properties.template.scale}" --output table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az group delete --name rg-az305-challenge36 --yes --no-wait
```

---

**Next**: [Challenge 37: Design a Serverless Solution](/docs/az-305/infrastructure/challenge-37)
