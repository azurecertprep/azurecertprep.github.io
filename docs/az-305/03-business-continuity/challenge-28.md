---
sidebar_position: 4
title: "Challenge 28: Design Backup & Recovery for Unstructured Data"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 28: Design Backup & Recovery for Unstructured Data

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $5-15 | **Exam Weight: 15-20%**

:::

## Introduction

Vivid Creative Agency is a 200-person design firm that produces advertising campaigns for Fortune 500 clients. Their creative assets totaling 200 TB include high-resolution photography (RAW files, 50-100 MB each), 4K/8K video projects (individual files up to 500 GB), Adobe project files (Photoshop, Premiere, After Effects), and client deliverables in various formats. All assets are stored in Azure Blob Storage and Azure Files (for shared project workspaces).

The biggest operational risk is accidental deletion. Last quarter alone, designers accidentally deleted the wrong folder three times, once losing 2 weeks of work on a $500K campaign. The existing recovery process required restoring from nightly backups, meaning up to 24 hours of work could be lost. The creative director demands sub-hour recovery for recent deletions while the CFO insists on long-term archive protection (some client contracts require asset retention for 7 years post-campaign).

The challenge is balancing multiple protection layers: instant recovery for the "oops I deleted the wrong folder" scenario, scheduled backups for point-in-time recovery, and immutable archival for long-term compliance. Storage costs are already high at 200 TB, so the backup strategy must be cost-conscious and avoid doubling storage expenses.

## Exam Skills Covered

- Recommend a backup and recovery solution for unstructured data

## Design Tasks

### Part 1: Blob Storage Data Protection Design

1. Evaluate and configure the following native protection features for the blob storage accounts. For each, document what it protects against, its cost impact, and its limitations:

| Feature | Protects Against | Cost Impact | Retention |
|---------|-----------------|-------------|-----------|
| Blob soft delete | | | |
| Container soft delete | | | |
| Blob versioning | | | |
| Point-in-time restore | | | |

2. Design a layered protection strategy:
   - **Layer 1 (Instant recovery)**: Which features provide self-service restore within minutes?
   - **Layer 2 (Scheduled backup)**: What provides daily backup with 30-day retention?
   - **Layer 3 (Long-term archive)**: What provides 7-year retention at lowest cost?

3. Configure blob soft delete and container soft delete for the production storage accounts:

```bash
# Enable blob soft delete (30-day retention)
az storage account blob-service-properties update \
  --account-name stvividcreative \
  --resource-group rg-creative-assets \
  --enable-delete-retention true \
  --delete-retention-days 30

# Enable container soft delete (30-day retention)
az storage account blob-service-properties update \
  --account-name stvividcreative \
  --resource-group rg-creative-assets \
  --enable-container-delete-retention true \
  --container-delete-retention-days 30
```

### Part 2: Versioning and Point-in-Time Restore

4. Enable blob versioning and analyze its impact on the 200 TB storage estate:
   - How does versioning affect storage costs when files are frequently overwritten?
   - For video files that are rarely modified, is versioning cost-effective?
   - For Adobe project files that are saved hundreds of times daily, what is the cost risk?

5. Design lifecycle management rules to manage version costs:
   - Move previous versions to Cool tier after 7 days
   - Move previous versions to Archive tier after 30 days
   - Delete previous versions older than 90 days (except for compliance-tagged blobs)

6. Configure point-in-time restore and understand its prerequisites:
   - Which other features must be enabled for point-in-time restore to work?
   - What is the maximum retention period for point-in-time restore?
   - Can you restore a single container, or must you restore the entire account?
   - What are the limitations? (e.g., cannot be used with Data Lake Storage Gen2 hierarchical namespace)

### Part 3: Azure Backup for Blobs (Vaulted Backup)

7. Design the Azure Backup configuration for blob data using the Backup vault:
   - Compare operational backup (continuous, uses native blob features) vs. vaulted backup (scheduled, stored in vault)
   - Which approach works for the 200 TB estate given cost constraints?
   - What is the backup frequency and retention range for vaulted blob backup?

8. Configure an operational backup policy for the creative assets:

```bash
# Create a Backup vault
az dataprotection backup-vault create \
  --resource-group rg-creative-assets \
  --vault-name bv-vivid-creative \
  --location eastus \
  --storage-setting "[{type:LocallyRedundant,datastore-type:VaultStore}]"

# Create a backup policy for blobs (operational tier)
az dataprotection backup-policy create \
  --resource-group rg-creative-assets \
  --vault-name bv-vivid-creative \
  --name policy-blob-30day \
  --policy '{backupRules:[{name:Default,trigger:{kind:ScheduleBased,schedule:{repeatingTimeIntervals:["R/2024-01-01T00:00:00+00:00/P1D"]}},dataStore:{dataStoreType:OperationalStore,objectType:DataStoreInfoBase}}],objectType:BackupPolicy,datasourceTypes:["Microsoft.Storage/storageAccounts/blobServices"]}'
```

9. Evaluate whether vaulted backup is needed in addition to operational backup for the 7-year compliance requirement. Document the trade-offs:
   - Vaulted backup stores data independently (isolated from source account deletion)
   - Vaulted backup supports cross-region restore
   - Vaulted backup has additional storage costs

### Part 4: Azure Files Backup and Recovery

10. The design team uses Azure Files (Premium, 10 TB share) for active project collaboration. Design the backup strategy:
    - Azure Backup for Azure Files uses share snapshots
    - Configure daily backup with 30-day retention
    - Configure yearly backup for compliance (stored as snapshot)

11. Compare Azure Files backup limitations with blob backup:
    - Maximum number of snapshots per share (200)
    - Snapshot storage costs (differential, only changed blocks)
    - Restore options: full share restore vs. individual file/folder restore

12. Create a decision tree for the recovery team:
    - "Accidentally deleted a file 5 minutes ago" -> Use which feature?
    - "Need to recover a folder from yesterday" -> Use which feature?
    - "Need to recover files from 2 years ago for legal hold" -> Use which feature?
    - "Storage account was deleted by rogue admin" -> Use which feature?

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-28"
  items={[
    "Layered protection strategy documented with soft delete, versioning, and backup vault",
    "Blob soft delete and container soft delete enabled with appropriate retention periods",
    "Lifecycle management rules configured to manage versioning costs with tier transitions",
    "Azure Backup for blobs configured with appropriate backup policy type selected",
    "Azure Files backup configured with daily snapshots and appropriate retention",
    "Recovery decision tree created mapping scenarios to correct recovery method"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Point-in-Time Restore Prerequisites</summary>

Point-in-time restore for blobs requires ALL of the following to be enabled:
1. Blob soft delete
2. Blob versioning
3. Blob change feed

Important limitations:
- Maximum retention: 14 days (you can only restore to a point within the last 14 days)
- Restores at the container level (not individual blobs - use versioning for that)
- NOT supported with hierarchical namespace (Data Lake Storage Gen2)
- NOT supported with premium block blobs
- Can only restore block blobs (not page blobs or append blobs)

This means point-in-time restore is Layer 1 protection for recent accidents, not for long-term compliance.

</details>

<details>
<summary>Hint 2: Versioning Cost Management</summary>

Blob versioning stores every previous version as a separate blob. Cost risk calculation for a 100 MB Adobe file saved 50 times/day:
- Without versioning: 100 MB stored
- With versioning (no lifecycle): 100 MB x 50 versions/day x 30 days = 150 GB per file!

Mitigation strategies:
- Use lifecycle management to move previous versions to Cool tier after 1-7 days
- Delete previous versions after 30-90 days (unless compliance-tagged)
- Use last access time tracking to archive unused versions
- Consider disabling versioning for containers with high-churn files and using Azure Backup instead

```json
{
  "rules": [{
    "name": "version-lifecycle",
    "type": "Lifecycle",
    "definition": {
      "actions": {
        "version": {
          "tierToCool": { "daysAfterCreationGreaterThan": 7 },
          "tierToArchive": { "daysAfterCreationGreaterThan": 30 },
          "delete": { "daysAfterCreationGreaterThan": 90 }
        }
      }
    }
  }]
}
```

</details>

<details>
<summary>Hint 3: Operational vs Vaulted Backup for Blobs</summary>

**Operational backup:**
- Uses native blob protection features (soft delete, versioning, change feed)
- Continuous protection (no RPO gap)
- Data stays in the source storage account
- If source account is deleted, operational backup is also lost
- No cross-region restore
- Best for: protecting against accidental deletion, corruption

**Vaulted backup:**
- Data is copied to a separate Backup vault
- Scheduled (daily/weekly) with configurable retention
- Data survives source account deletion
- Supports cross-region restore (with GRS vault)
- Additional storage cost for the vault copy
- Best for: protecting against account-level disasters, compliance requirements

For Vivid Creative: Use operational backup for day-to-day protection + vaulted backup for the 7-year compliance requirement.

</details>

<details>
<summary>Hint 4: Azure Files Snapshot Limits</summary>

Azure Files backup uses share snapshots with these constraints:
- Maximum 200 snapshots per file share
- At daily backup: 200 snapshots = ~6.5 months maximum retention
- For longer retention: fewer daily snapshots or use weekly/monthly schedule
- Snapshot storage is differential (only stores changed blocks since previous snapshot)
- Cost example: 10 TB share with 5% daily change = ~500 GB of snapshot storage for 200 snapshots

Restore options:
- Full share restore to a new share
- Individual file/folder restore (item-level recovery)
- Restore to original location or alternate location
- Cannot restore to a different storage account (same account only)

</details>

## Learning Resources

- [Soft delete for blobs](https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview)
- [Blob versioning](https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview)
- [Point-in-time restore for block blobs](https://learn.microsoft.com/en-us/azure/storage/blobs/point-in-time-restore-overview)
- [Azure Backup for Azure Blobs](https://learn.microsoft.com/en-us/azure/backup/blob-backup-overview)
- [Back up Azure file shares](https://learn.microsoft.com/en-us/azure/backup/azure-file-share-backup-overview)
- [Lifecycle management for Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)

## Knowledge Check

<details>
<summary>1. A designer accidentally deleted an entire container with 50,000 files 10 minutes ago. What is the fastest recovery method?</summary>

**Container soft delete provides instant recovery of the entire deleted container.** With container soft delete enabled, the deleted container and all its contents are retained for the configured retention period (up to 365 days). Recovery is a single "undelete" operation that restores the entire container immediately. This is faster than point-in-time restore (which requires a restore operation that can take time proportional to data size) and faster than restoring from backup vault. Container soft delete is specifically designed for this "accidental deletion of entire container" scenario.

</details>

<details>
<summary>2. A storage account has 200 TB of data with blob versioning enabled. Designers save Adobe files hundreds of times daily. What is the primary risk, and how do you mitigate it?</summary>

**The primary risk is storage cost explosion from accumulated versions.** Each save creates a new version, so a 100 MB file saved 100 times/day generates 10 GB of version data daily per file. Mitigation: implement lifecycle management policies that move previous versions to Cool tier after 1-7 days, Archive tier after 30 days, and delete after 90 days. Alternatively, disable versioning for high-churn containers and rely on Azure Backup (daily snapshots) instead, which has predictable fixed-schedule costs rather than per-save costs.

</details>

<details>
<summary>3. A company needs to guarantee blob data recovery even if a malicious administrator deletes the entire storage account. Which protection mechanism addresses this?</summary>

**Vaulted backup (Azure Backup for Blobs stored in a Backup vault) provides protection independent of the source storage account.** Operational backup relies on native features within the same storage account and is lost if the account is deleted. Vaulted backup copies data to a separate Backup vault with its own RBAC, immutability, and lifecycle. Additionally, Azure Resource Manager locks (CanNotDelete) and Azure Policy can prevent account deletion, but only vaulted backup provides recovery after the fact. Combine with immutable vault for maximum protection.

</details>

<details>
<summary>4. Point-in-time restore for blobs has a maximum retention of 14 days. What alternative provides longer point-in-time recovery capability for blob data?</summary>

**Blob versioning combined with lifecycle management provides extended point-in-time recovery.** While the built-in point-in-time restore feature is limited to 14 days, blob versioning retains every version indefinitely (until lifecycle policies delete them). You can set lifecycle rules to retain versions for 90, 180, or 365+ days. For compliance-level long-term recovery (7+ years), use vaulted backup with extended retention configured in the backup policy. The trade-off is that versioning requires you to identify the specific blob version to restore, while point-in-time restore can roll back an entire container atomically.

</details>

## Cleanup

```bash
# Delete resource groups
az group delete --name rg-creative-assets --yes --no-wait

# Note: If soft delete is enabled, storage data persists until retention expires
# If you need immediate cleanup, disable soft delete first:
# az storage account blob-service-properties update \
#   --account-name stvividcreative \
#   --resource-group rg-creative-assets \
#   --enable-delete-retention false
```

---

**Next**: [Challenge 29: Design a Disaster Recovery Plan](/docs/az-305/business-continuity/challenge-29)
