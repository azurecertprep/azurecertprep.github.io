---
sidebar_position: 8
title: "Challenge 08: Design Secrets & Certificate Management"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 08: Design Secrets & Certificate Management

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $2-5 | **Exam Weight: 25-30%**

:::

## Introduction

Meridian Financial Services is a mid-size financial technology company that processes payment transactions for over 200 merchant partners. Their platform consists of 50+ microservices running on Azure Kubernetes Service, each requiring TLS certificates for mutual authentication. The company also manages API keys for 30 external payment gateway integrations and uses customer-managed encryption keys for data-at-rest protection across multiple storage accounts and databases.

A recent compliance audit flagged several critical issues: API keys were hardcoded in application configuration files, three TLS certificates expired without warning causing a 4-hour outage, and encryption keys for different clients were stored in the same vault with no separation. The company's CISO has mandated a complete redesign of their secrets management architecture to meet PCI-DSS requirements, which demand strict key separation between production and non-production environments, audit trails for all key access, and hardware-backed key storage for cryptographic operations.

Your task is to design a comprehensive secrets and certificate management solution that addresses these compliance gaps while supporting the operational needs of their development teams. The solution must handle automatic certificate renewal, enforce key rotation policies, and provide network isolation for vaults handling the most sensitive payment processing keys. Budget constraints limit the use of Managed HSM to only the most critical workloads.

## Exam Skills Covered

- Recommend a solution to manage secrets, certificates, and keys

## Design Tasks

### Part 1: Key Vault Architecture and Segmentation

1. Design a Key Vault topology for Meridian's environment. Determine how many vaults are needed and justify the separation strategy (consider: per-environment, per-application, per-sensitivity-level, or per-compliance-boundary).
2. Identify which workloads require Azure Key Vault Managed HSM versus standard Key Vault. Document the decision criteria (FIPS 140-2 Level 3 requirements, performance needs, cost justification).
3. Define the access control model for each vault. Compare vault access policies versus Azure RBAC for Key Vault and recommend which model to use for each vault tier. Justify your choice considering the March 2026 API change making RBAC the default.
4. Design a naming convention and resource group strategy for the vault hierarchy that supports easy identification of vault purpose, environment, and owning team.

### Part 2: Certificate Lifecycle Management

5. Design a certificate management solution for the 50+ microservice TLS certificates. Address: certificate authority selection (Key Vault integrated CA vs. self-managed), automatic renewal workflows, and notification alerting for certificates approaching expiration.
6. Define certificate rotation procedures that achieve zero-downtime deployment. Consider how AKS workloads will consume renewed certificates without pod restarts.
7. Specify how wildcard certificates versus individual service certificates should be used, and document the security trade-offs of each approach.

### Part 3: Secrets and Key Rotation

8. Design an automated key rotation policy for the payment gateway API keys. Define rotation frequency, the rotation trigger mechanism, and how applications will detect and consume new key versions.
9. Define a customer-managed key (CMK) strategy for data-at-rest encryption. Specify key types (RSA vs. EC), key sizes, and how key versioning interacts with encrypted resources.
10. Design the network security model for vaults. Determine which vaults need private endpoints, which can use service endpoints, and which (if any) can remain publicly accessible. Document the rationale for each decision.

### Part 4: Monitoring and Disaster Recovery

11. Design a monitoring and alerting strategy for key vault operations. Include detection of unauthorized access attempts, near-expiry certificates, and throttling events.
12. Design a backup and disaster recovery strategy for the vault infrastructure. Address regional failover, key backup procedures, and RTO/RPO requirements for the payment platform.

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-08"
  items={[
    "Documented a multi-vault topology with clear segmentation rationale aligned to PCI-DSS requirements",
    "Defined criteria for standard Key Vault vs. Managed HSM usage with cost justification",
    "Selected and justified access control model (vault access policy vs. RBAC) for each vault tier",
    "Designed certificate lifecycle management with automated renewal and zero-downtime rotation",
    "Created key rotation policies with defined frequencies and application consumption patterns",
    "Specified network isolation strategy with private endpoints for sensitive vaults"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Vault Segmentation Strategy</summary>

Consider separating vaults along these boundaries: (1) production vs. non-production (compliance requirement), (2) application boundary for blast radius reduction, and (3) object type separation (certificates, secrets, keys in different vaults only when access patterns differ significantly). PCI-DSS requires that production cryptographic keys never share a vault with development keys. Key Vault has a limit of 500 access policy entries per vault and transaction rate limits per vault (4000 transactions/10 seconds for RSA operations).

</details>

<details>
<summary>Hint 2: Managed HSM Decision Criteria</summary>

Managed HSM provides FIPS 140-2 Level 3 validated hardware, single-tenant key storage, and full cryptographic control. Use it for: payment card industry encryption keys, root CA keys, and keys where regulatory requirements mandate hardware-level protection. Standard Key Vault (FIPS 140-2 Level 2) suffices for TLS certificates, application secrets, and non-regulated encryption keys. Managed HSM costs approximately $3/hour per HSM pool, so limit usage to workloads where the compliance requirement justifies the cost.

</details>

<details>
<summary>Hint 3: RBAC vs. Access Policies</summary>

Azure RBAC for Key Vault provides granular, per-key/secret/certificate permissions using standard Azure role assignments. It supports Conditional Access and PIM (just-in-time access). As of the March 2026 API update (version 2026-02-01), RBAC is the default for new vaults. Vault access policies are legacy and limited to vault-level granularity (you cannot grant access to a single secret within a vault). For new designs, prefer RBAC. The built-in roles include: Key Vault Secrets Officer, Key Vault Certificates Officer, Key Vault Crypto Officer, and Key Vault Reader.

</details>

<details>
<summary>Hint 4: Certificate Auto-Renewal</summary>

Key Vault supports integrated certificate authorities (DigiCert and GlobalSign) for automatic certificate issuance and renewal. For non-integrated CAs, Key Vault can generate CSRs that you submit externally. Configure lifetime actions to trigger renewal at 80% of certificate lifetime or 30 days before expiry. For AKS consumption, use the Key Vault CSI driver with the `secretProviderClass` configured for rotation polling (default: 2 minutes). The CSI driver mounts certificates as files that update in-place, allowing applications to detect changes without restart.

</details>

<details>
<summary>Hint 5: Network Isolation Design</summary>

Private endpoints provide the strongest network isolation (traffic stays on the Microsoft backbone). Use private endpoints for vaults containing production encryption keys and payment processing secrets. Service endpoints are a simpler alternative for vaults accessed only from Azure virtual networks. Public access can remain enabled (with firewall rules) for vaults accessed by CI/CD pipelines or developer workstations, but restrict access to known IP ranges. Consider that private endpoint DNS resolution requires either Azure Private DNS zones or custom DNS configuration in your network.

</details>

## Learning Resources

- [Azure Key Vault best practices](https://learn.microsoft.com/azure/key-vault/general/best-practices)
- [Azure Key Vault security overview](https://learn.microsoft.com/azure/key-vault/general/security-features)
- [About Azure Key Vault Managed HSM](https://learn.microsoft.com/azure/key-vault/managed-hsm/overview)
- [Azure RBAC for Key Vault data plane](https://learn.microsoft.com/azure/key-vault/general/rbac-guide)
- [Key Vault certificate renewal](https://learn.microsoft.com/azure/key-vault/certificates/overview-renew-certificate)
- [Key Vault private endpoints](https://learn.microsoft.com/azure/key-vault/general/private-link-service)
- [Encryption and key management in Azure (CAF)](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/design-area/encryption-and-keys)

## Knowledge Check

<details>
<summary>1. Meridian needs to store a root CA private key that signs all internal service certificates. The key must never leave hardware and must meet FIPS 140-2 Level 3. Which service should they use?</summary>

**Azure Key Vault Managed HSM.** Standard Key Vault only provides FIPS 140-2 Level 2 protection (software-protected or HSM-backed keys in a multi-tenant HSM). Managed HSM provides single-tenant, FIPS 140-2 Level 3 validated HSMs where keys are guaranteed to never leave the hardware boundary. This is required for root CA keys in regulated environments.

</details>

<details>
<summary>2. A development team needs read access to only the database connection strings in a shared vault, but not the API keys stored in the same vault. Which access model enables this?</summary>

**Azure RBAC for Key Vault.** RBAC allows per-object permissions using scope (e.g., assigning "Key Vault Secrets User" role at the individual secret scope). Vault access policies operate at the vault level only - you cannot restrict a principal to specific secrets within a vault using access policies. This is a key reason to adopt RBAC for fine-grained access control.

</details>

<details>
<summary>3. Meridian wants certificates to automatically renew 30 days before expiration without manual intervention. Their CA is DigiCert. What configuration enables this?</summary>

**Key Vault certificate auto-renewal with an integrated CA.** Create a certificate issuer in Key Vault linked to their DigiCert account. Configure the certificate policy with a lifetime action of "AutoRenew" triggered at either a percentage of lifetime (e.g., 80%) or a fixed number of days before expiry (30 days). Key Vault handles the CSR generation, submission to DigiCert, and certificate installation automatically.

</details>

<details>
<summary>4. During a vault failover to a secondary region, Meridian discovers their private endpoint DNS records still point to the primary region. What is the root cause and fix?</summary>

**Private DNS zone records need to be updated for the secondary region.** When using private endpoints, DNS resolution is handled by Azure Private DNS zones. During a manual failover (Key Vault supports geo-replication), the private endpoint in the secondary region has a different IP address. The fix is to ensure Private DNS zones are configured with records for both regions, or use Azure Traffic Manager / DNS-based failover for the Key Vault FQDN. Key Vault's built-in geo-replication handles this automatically for the public endpoint, but private endpoint DNS requires explicit planning.

</details>

## Cleanup

```bash
# Delete resource groups created for this challenge
az group delete --name rg-keyvault-prod --yes --no-wait
az group delete --name rg-keyvault-dev --yes --no-wait
az group delete --name rg-keyvault-hsm --yes --no-wait

# If you created a Managed HSM (note: HSM deletion has a purge protection period)
# az keyvault purge --hsm-name meridian-payment-hsm
```

---

**Next**: [Challenge 09: Design a Management Group & Subscription Structure](/docs/az-305/identity-governance-monitoring/challenge-09)
