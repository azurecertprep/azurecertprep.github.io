---
sidebar_position: 6
title: "Challenge 19: Design an Unstructured Data Solution"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 19: Design an Unstructured Data Solution

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $3-10 | **Exam Weight: 20-25%**

:::

## Introduction

MediaVault Studios is a film and television production company that manages 500TB of video content across various stages of production. The content library breaks down as follows: 25TB (5%) of active production footage uploaded daily and accessed frequently by editors and post-production teams; 125TB (25%) of recently completed projects accessed weekly for marketing clips, social media assets, and promotional re-edits; and 350TB (70%) of archived master copies that are accessed approximately once per year for licensing deals, anniversary re-releases, or legal proceedings.

The post-production team of 40 editors works from a central office in Los Angeles and requires SMB file share access for video editing software (Adobe Premiere Pro, DaVinci Resolve) that cannot work with object storage APIs. They need low-latency access to active project files with support for file locking to prevent concurrent edit conflicts. The editing workstations connect to Azure via a 10 Gbps ExpressRoute connection.

MediaVault's monthly storage budget is $8,000. They need to minimize cost for archival content while ensuring they can retrieve archived masters within 24 hours when a licensing request arrives. Additionally, their data analytics team wants to run Spark-based processing jobs on metadata files (JSON logs, subtitle files, color grading data) that sit alongside the video content. The company must comply with content licensing regulations that require immutability policies on finalized master copies (no modification or deletion for 5 years after release).

## Exam Skills Covered

- Recommend a solution for storing unstructured data

## Design Tasks

### Part 1: Storage Service Selection

1. Evaluate the following Azure storage services for each portion of MediaVault's content and recommend the appropriate service for each workload:
   - Azure Blob Storage (block blobs, append blobs, page blobs)
   - Azure Data Lake Storage Gen2
   - Azure Files (SMB/NFS shares)
   - Azure NetApp Files
2. For the editors' workload requiring SMB file shares with file locking, compare Azure Files Premium vs Azure NetApp Files. Consider throughput requirements (10 Gbps ExpressRoute), latency sensitivity, and cost.
3. Determine whether Azure Data Lake Storage Gen2 (hierarchical namespace enabled on Blob Storage) is appropriate for the metadata files that require Spark processing. Explain the advantages over standard Blob Storage for analytics workloads.
4. For the 500TB video archive, calculate whether standard Blob Storage (without hierarchical namespace) is more cost-effective than Data Lake Storage Gen2.

### Part 2: Access Tier and Lifecycle Management

5. Design an access tier strategy for the video content library. Map each content category to the appropriate tier:
   - Hot tier: For active production footage (daily access)
   - Cool tier: For recently completed projects (weekly access)
   - Cold tier: For content accessed less than quarterly
   - Archive tier: For masters accessed once per year
6. Design a lifecycle management policy that automatically transitions content between tiers based on last access time. Specify the rules (e.g., move to Cool after 30 days, Cold after 90 days, Archive after 180 days of no access).
7. Calculate the monthly storage cost for your tiered strategy and compare it to storing everything in the Hot tier. Verify the design fits within the $8,000/month budget.
8. Document the rehydration process and time for Archive tier content. Compare Standard rehydration (up to 15 hours) vs High Priority rehydration (under 1 hour for objects under 10GB) and their cost implications for the 24-hour retrieval requirement.

### Part 3: Data Protection and Compliance

9. Design immutability policies for finalized master copies. Evaluate time-based retention policies (WORM - Write Once Read Many) versus legal holds. Determine which approach meets the 5-year no-modification requirement.
10. Design a data redundancy strategy for each content category. Consider LRS, ZRS, GRS, and GZRS based on the criticality and recoverability of each content type.
11. Implement soft delete and versioning policies to protect against accidental deletion of active production files. Specify retention periods for deleted files and previous versions.
12. Design an access control strategy using Azure RBAC and storage account firewall rules. The editing team needs read/write access to active shares, the analytics team needs read-only access to metadata, and archived content should only be accessible through an approval workflow.

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-19"
  items={[
    "Selected appropriate storage services for each workload (SMB shares, blob storage, ADLS Gen2)",
    "Designed lifecycle management policy with clear tier transition rules and timing",
    "Monthly cost estimate fits within $8,000 budget with tiered storage strategy",
    "Configured immutability policies meeting 5-year WORM compliance requirement",
    "Addressed Archive tier rehydration time within 24-hour retrieval SLA",
    "Implemented data redundancy appropriate to content criticality"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Azure Files vs Azure NetApp Files</summary>

Azure Files Premium supports SMB 3.0 with up to 100,000 IOPS and 10 GiB/s throughput per share. It uses SSD-backed storage and supports file locking. Azure NetApp Files provides enterprise-grade NAS with sub-millisecond latency, up to 4,500 MiB/s throughput per volume, and supports both SMB and NFS. Azure NetApp Files is typically chosen for workloads requiring extreme throughput or latency, like video editing, but costs more. For 40 editors with 10 Gbps ExpressRoute, Azure Files Premium may be sufficient unless sub-millisecond latency is required.

</details>

<details>
<summary>Hint 2: Access Tier Pricing (approximate)</summary>

Per-GB monthly storage costs (US East, LRS): Hot = $0.018/GB, Cool = $0.01/GB, Cold = $0.0036/GB, Archive = $0.00099/GB. Access costs increase as tiers get colder: reading from Archive costs $5.00/10,000 operations plus rehydration costs. The key design trade-off: cheaper storage vs more expensive and slower access. For 350TB in Archive vs Hot: Archive = $350/month vs Hot = $6,300/month. The savings are substantial for rarely accessed data.

</details>

<details>
<summary>Hint 3: Lifecycle Management Policies</summary>

Azure Blob Storage lifecycle management rules can automatically: (1) Transition blobs to cooler tiers based on days since creation or last access time; (2) Delete blobs after a specified period; (3) Apply rules based on blob name prefix or container. Rules evaluate daily. Example: move to Cool after 30 days of no access, to Archive after 180 days. Important: last access time tracking must be enabled explicitly on the storage account (it is not enabled by default and has a small additional cost).

</details>

<details>
<summary>Hint 4: Data Lake Storage Gen2</summary>

ADLS Gen2 is Blob Storage with a hierarchical namespace (HNS) enabled, providing directory-level operations, POSIX ACLs, and optimized performance for analytics frameworks (Spark, Synapse, Databricks). It supports the same access tiers as Blob Storage. The hierarchical namespace adds a small premium to storage costs but dramatically improves performance for analytics workloads that enumerate directories or rename files. If you only need object storage without analytics, standard Blob Storage is cheaper.

</details>

<details>
<summary>Hint 5: Immutable Storage</summary>

Azure Blob Storage immutable storage supports two policy types: (1) Time-based retention: prevents modification and deletion for a specified period (1 day to 146,000 years). Once locked, the policy cannot be shortened. (2) Legal hold: prevents modification/deletion until explicitly removed (no time limit). For MediaVault's 5-year requirement on master copies, a time-based retention policy set to 5 years (1,825 days) ensures WORM compliance. Policies can be applied at the container level or blob version level.

</details>

## Learning Resources

- [Azure Blob Storage access tiers](https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview)
- [Azure Blob Storage lifecycle management](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)
- [Azure Data Lake Storage Gen2 introduction](https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-introduction)
- [Azure Files overview](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-introduction)
- [Azure NetApp Files overview](https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-introduction)
- [Immutable storage for Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview)
- [Archive rehydration overview](https://learn.microsoft.com/en-us/azure/storage/blobs/archive-rehydrate-overview)
- [Azure Storage redundancy](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy)

## Knowledge Check

<details>
<summary>1. A video editing team of 40 people needs SMB file share access with file locking support. Their workflow requires sustained throughput of 5 GiB/s. Which Azure service should you recommend?</summary>

**Azure Files Premium or Azure NetApp Files.** Azure Files Premium supports up to 10 GiB/s throughput per share and provides SMB 3.0 with file locking on SSD-backed storage. Azure NetApp Files offers up to 4,500 MiB/s per volume with sub-millisecond latency. For 5 GiB/s sustained throughput, Azure Files Premium is likely sufficient and more cost-effective. Azure NetApp Files would be chosen if sub-millisecond latency is a hard requirement or if NFS protocol support is also needed.

</details>

<details>
<summary>2. An organization stores 350TB of video archives accessed once per year. They need to retrieve specific files within 24 hours of a request. Which access tier and rehydration priority should they use?</summary>

**Archive tier with Standard priority rehydration.** Archive tier storage costs approximately $0.00099/GB/month (saving over $6,000/month compared to Hot tier for 350TB). Standard priority rehydration completes within 15 hours, which is well within the 24-hour retrieval window. High Priority rehydration (under 1 hour) is available but costs significantly more and is unnecessary given the 24-hour SLA. Alternatively, consider Cold tier if retrieval time of minutes (rather than hours) is occasionally needed.

</details>

<details>
<summary>3. When should you enable hierarchical namespace (Data Lake Storage Gen2) versus using standard Blob Storage?</summary>

**Enable hierarchical namespace when:** your workload requires directory-level operations (rename, move, delete directories atomically), POSIX ACLs for fine-grained access control, or when using analytics frameworks like Apache Spark, Azure Synapse, or Databricks that benefit from efficient directory enumeration. **Use standard Blob Storage when:** you only need flat object storage, cost is the primary concern (HNS adds a small premium), or your workload is purely upload/download without directory operations. For MediaVault's analytics metadata files, ADLS Gen2 is appropriate; for pure video archive, standard Blob Storage is more cost-effective.

</details>

<details>
<summary>4. A media company must ensure that finalized master video files cannot be modified or deleted for 5 years after release. Which Azure Storage feature should they configure?</summary>

**Immutable storage with a time-based retention policy.** Configure a container-level time-based retention policy set to 1,825 days (5 years). Once the policy is locked, it cannot be shortened or deleted, and blobs within the container cannot be modified or deleted until the retention period expires. This provides WORM (Write Once Read Many) compliance suitable for regulatory requirements. Legal holds are an alternative but are better suited for indefinite retention tied to legal proceedings rather than fixed time periods.

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge19 --location eastus
```

2. Deploy a storage account with blob service:

```bash
az storage account create --name stmediavaultlab19 --resource-group rg-az305-challenge19 \
  --location eastus --sku Standard_LRS --kind StorageV2 --access-tier Hot
```

3. Create containers with different access tiers:

```bash
az storage container create --name active-production \
  --account-name stmediavaultlab19

az storage container create --name completed-projects \
  --account-name stmediavaultlab19

az storage container create --name archive-masters \
  --account-name stmediavaultlab19
```

4. Upload a test blob and set its tier:

```bash
echo "test content" > testfile.txt

az storage blob upload --account-name stmediavaultlab19 \
  --container-name active-production --name sample.txt --file testfile.txt

az storage blob upload --account-name stmediavaultlab19 \
  --container-name completed-projects --name sample.txt --file testfile.txt \
  --tier Cool

rm testfile.txt
```

5. Verify tier assignments:

```bash
az storage blob list --account-name stmediavaultlab19 \
  --container-name active-production \
  --query "[].{name:name,tier:properties.blobTier}" --output table

az storage blob list --account-name stmediavaultlab19 \
  --container-name completed-projects \
  --query "[].{name:name,tier:properties.blobTier}" --output table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
# Delete the resource group containing all MediaVault storage resources
az group delete --name rg-mediavault-storage --yes --no-wait

# If you created a separate Azure NetApp Files account (requires explicit cleanup)
az group delete --name rg-mediavault-netapp --yes --no-wait

# Note: Immutable storage policies must be unlocked/expired before deletion
# For testing, use unlocked policies that can be removed:
# az storage container immutability-policy delete --account-name <name> --container-name <name>
```

---

**Next**: [Challenge 20: Design Data Storage for Cost and Performance](/docs/az-305/data-storage/challenge-20)
