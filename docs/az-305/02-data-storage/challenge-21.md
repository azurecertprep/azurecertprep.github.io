---
sidebar_position: 8
title: "Challenge 21: Design Data Durability & Protection"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 21: Design Data Durability and Protection

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $3-8 | **Exam Weight: 20-25%**

:::

## Introduction

Meridian Legal Partners is a mid-size law firm managing sensitive case documents, contracts, and court filings across Azure Storage. They have three categories of data with different protection requirements: active case files that attorneys modify daily and need instant recovery from accidental deletion, finalized legal documents that must be immutable once signed (court-mandated WORM compliance), and archived case records that must survive a complete Azure region failure for disaster recovery.

The firm's compliance officer has mandated the following: all finalized documents must have legal holds that prevent deletion during active litigation, archived cases must be geo-redundant with read access from the secondary region, and the firm must meet a 99.99% availability SLA for active case files. A recent incident where a paralegal accidentally deleted a critical case folder has elevated this project to top priority.

Your challenge is to design a comprehensive data protection strategy that combines the right redundancy option for each data category, implements immutability policies for regulatory compliance, and provides rapid recovery mechanisms for operational errors.

## Exam Skills Covered

- Recommend a data solution for protection and durability

## Design Tasks

### Part 1: Design Redundancy Strategy

1. Create a resource group and deploy three storage accounts, each representing a different data category:
   - `active-cases` - for daily attorney access (requires highest availability)
   - `finalized-docs` - for immutable legal documents (requires compliance guarantees)
   - `archived-cases` - for disaster recovery (requires geo-redundancy)
2. For each storage account, select and configure the appropriate redundancy option from: LRS, ZRS, GRS, GZRS, RA-GRS, or RA-GZRS. Document your rationale including:
   - Number of copies and their geographic distribution
   - Availability SLA achieved (99.9%, 99.99%, or 99.9999999999% durability)
   - Failover capabilities (automatic vs manual, RTO/RPO)
   - Cost implications relative to LRS baseline
3. Create a decision matrix comparing all six redundancy options with columns for: durability (nines), availability SLA, read access during outage, regional failure protection, and relative cost.

### Part 2: Implement Data Protection Features

4. Enable blob soft delete on the active-cases storage account with a 30-day retention period. Test by deleting and recovering a blob.
5. Enable container soft delete with 14-day retention to protect against accidental container deletion.
6. Enable blob versioning on the active-cases account to maintain previous versions of modified documents. Upload a file, modify it, and demonstrate version history.
7. Enable point-in-time restore for the active-cases account. Document the requirements (versioning, change feed, and soft delete must all be enabled) and the maximum restore window.

### Part 3: Implement Immutability Policies

8. On the finalized-docs storage account, create a container with a time-based immutability policy:
   - Set retention period to 2,555 days (7 years)
   - Upload a test document and verify it cannot be deleted or modified
   - Document the difference between locked and unlocked policies
9. Apply a legal hold to a specific container simulating active litigation:
   - Add a legal hold tag (e.g., "case-2024-meridian-v-smith")
   - Verify that blobs under legal hold cannot be deleted even after retention expires
   - Document how legal holds interact with time-based retention policies
10. Design a policy for transitioning documents from mutable (active case) to immutable (finalized) status, including the workflow triggers and validation steps.

### Part 4: Design Backup and Recovery

11. Configure Azure Backup for blob storage on the active-cases account:
    - Create a backup vault and backup policy
    - Set backup frequency and retention rules
    - Document RPO and RTO for operational vs vaulted backup
12. Design a recovery runbook that documents procedures for:
    - Single blob recovery (soft delete undelete)
    - Point-in-time restore for bulk corruption/ransomware
    - Regional failover using GRS for disaster scenarios
    - Recovery from accidental container deletion

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-21"
  items={[
    "Three storage accounts deployed with different redundancy options, each with documented rationale",
    "Soft delete, versioning, and point-in-time restore all enabled and tested on active-cases account",
    "Immutability policy configured with locked time-based retention preventing blob deletion",
    "Legal hold applied and verified to block deletion independently of retention policy",
    "Decision matrix comparing all 6 redundancy options across durability, availability, cost, and failover",
    "Recovery runbook covers at least 4 scenarios with specific steps and expected RTO for each"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Redundancy Options and Availability SLAs</summary>

The availability SLA depends on both the redundancy option and whether read access is configured. LRS and GRS provide 99.9% read availability. ZRS and GZRS provide 99.9% for writes. RA-GRS and RA-GZRS provide 99.99% read availability because reads can be served from the secondary region. For the highest availability SLA (99.99%), you need RA-GRS or RA-GZRS. GZRS combines the zone-level protection of ZRS in the primary with geo-replication to a secondary region.

</details>

<details>
<summary>Hint 2: Immutability Policy Locking</summary>

A time-based retention policy can be in an unlocked or locked state. While unlocked, you can increase or decrease the retention period or delete the policy. Once locked, the policy cannot be deleted or the retention period decreased (only increased). Locking is irreversible and required for SEC 17a-4(f) and CFTC 1.31(d) compliance. Always test with unlocked policies first.

</details>

<details>
<summary>Hint 3: Point-in-Time Restore Prerequisites</summary>

Point-in-time restore for block blobs requires three features to be enabled: blob versioning, blob soft delete, and blob change feed. The maximum restore window is limited to the soft delete retention period or 365 days, whichever is less. It only works with Standard general-purpose v2 accounts and cannot restore blobs in the Archive tier.

</details>

<details>
<summary>Hint 4: Legal Holds vs Time-Based Retention</summary>

Legal holds and time-based retention policies serve different purposes and can coexist on the same container. A legal hold prevents deletion indefinitely until all hold tags are removed (no time limit). Time-based retention prevents deletion until the retention period expires. If both are applied, the blob cannot be deleted until both conditions are satisfied (hold removed AND retention expired). Legal holds do not require a locked policy.

</details>

<details>
<summary>Hint 5: Geo-Redundancy Failover Considerations</summary>

With GRS/GZRS, failover to the secondary region is customer-initiated (not automatic) and typically has an RPO of up to 15 minutes (the geo-replication lag). After failover, the storage account becomes LRS in the new primary region - you must reconfigure redundancy afterward. RA-GRS/RA-GZRS allows read access to the secondary without failover, using the `-secondary` endpoint suffix, but secondary data may be stale by up to 15 minutes.

</details>

## Learning Resources

- [Azure Storage redundancy](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy)
- [Soft delete for blobs](https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview)
- [Blob versioning](https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview)
- [Point-in-time restore for block blobs](https://learn.microsoft.com/en-us/azure/storage/blobs/point-in-time-restore-overview)
- [Immutable storage for Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview)
- [Azure Backup for Azure Blobs](https://learn.microsoft.com/en-us/azure/backup/blob-backup-overview)
- [Best practices for data protection](https://learn.microsoft.com/en-us/azure/storage/blobs/data-protection-overview)

## Knowledge Check

<details>
<summary>1. A storage account uses GRS. During a regional outage in the primary region, can applications read data from the secondary region?</summary>

**No, not without RA-GRS.** Standard GRS replicates data to the secondary region but does not expose a read endpoint there. During an outage, you must initiate a failover (which takes time and makes the secondary the new primary) or wait for the primary to recover. RA-GRS (Read-Access Geo-Redundant Storage) provides a read-only endpoint at `accountname-secondary.blob.core.windows.net` that is always available, enabling reads even during a primary region outage.

</details>

<details>
<summary>2. An organization needs to store financial records that cannot be modified or deleted for 7 years (SEC compliance). After configuring a time-based retention policy, what additional step is required for regulatory compliance?</summary>

**Lock the immutability policy.** An unlocked time-based retention policy can be deleted or have its retention period reduced, which does not meet SEC 17a-4(f) requirements. Locking the policy is irreversible and ensures that no one (including storage account owners or Microsoft support) can delete the data before the retention period expires. This is the step that makes the policy truly WORM-compliant.

</details>

<details>
<summary>3. A company has enabled blob versioning, soft delete (14-day retention), and point-in-time restore on a storage account. A ransomware attack encrypts all blobs at 2:00 PM. The attack is discovered at 5:00 PM. What is the fastest recovery approach?</summary>

**Use point-in-time restore to restore all blobs to their state at 1:59 PM.** Point-in-time restore can restore all blobs in a container (or the entire account) to a previous point in time with a single operation. This is faster than manually restoring individual blob versions or undeleting individual blobs. The restore operation creates a new consistent snapshot of the account at the specified timestamp, reversing all changes made after that point.

</details>

<details>
<summary>4. What is the durability difference between ZRS and GZRS, and when would you choose one over the other?</summary>

**ZRS provides 99.9999999999% (12 nines) durability within a single region by replicating across 3 availability zones. GZRS provides the same zone-level protection plus asynchronous replication to a secondary region, protecting against complete regional failure.** Choose ZRS when zone-level protection is sufficient and you want to minimize cost and complexity. Choose GZRS when regulatory or business requirements demand protection against regional disasters (earthquakes, floods, widespread outages affecting an entire Azure region).

</details>

## Cleanup

```bash
# Delete all resources created in this challenge
az group delete --name rg-az305-challenge21 --yes --no-wait
```

---

**Next**: [Challenge 22: Design a Data Integration Pipeline](/docs/az-305/data-storage/challenge-22)
