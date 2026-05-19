---
sidebar_position: 4
title: "Challenge 17: Design Database Protection"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 17: Design Database Protection

:::info Estimated Time and Cost

**60-90 min** | **Estimated cost**: $5-15 | **Exam Weight: 20-25%**

:::

## Introduction

SecureBank Financial Services is a regional bank migrating its core banking application to Azure SQL Database. The application processes customer transactions, stores personally identifiable information (PII) including Social Security numbers, account numbers, and financial records. SecureBank is subject to multiple regulatory frameworks: PCI-DSS for payment card data, SOX (Sarbanes-Oxley) for financial reporting integrity, and state privacy regulations requiring data breach notification.

The compliance team has defined the following mandatory requirements: (1) All data must be encrypted at rest and in transit with bank-managed encryption keys; (2) Customer SSNs and account numbers must never be visible to support staff or application developers, even when they query the database directly; (3) Every data access and modification must be logged in a tamper-proof audit trail retained for 7 years; (4) The bank must be able to restore any database to any point in time within the last 35 days, with monthly backups retained for 7 years for regulatory compliance; (5) Critical financial ledger tables must be cryptographically verifiable to prove data has not been tampered with.

The security architect has also noted that a recent audit finding requires that encryption keys be stored in a customer-managed Azure Key Vault with separation of duties, meaning the DBA team should not have access to the encryption keys. The estimated database size is 500GB with 2,000 transactions per second at peak.

## Exam Skills Covered

- Recommend a solution for data protection

## Design Tasks

### Part 1: Encryption Strategy

1. Design a defense-in-depth encryption strategy covering data at rest and data in transit. Specify the role of TDE (Transparent Data Encryption) and whether to use service-managed keys or customer-managed keys (CMK) stored in Azure Key Vault.
2. For the SSN and account number columns, evaluate Always Encrypted versus dynamic data masking. Determine which approach meets the requirement that support staff cannot see actual values even with direct database query access.
3. Design the Key Vault architecture for customer-managed TDE keys. Address separation of duties by specifying which roles (DBA vs security team) have access to the Key Vault versus the database.
4. Document the encryption hierarchy: Key Vault (CMK) protects the TDE protector, which encrypts the Database Encryption Key (DEK), which encrypts data/log/backup files.

### Part 2: Auditing and Compliance

5. Design an auditing solution using Azure SQL Database Auditing. Specify where audit logs should be stored (Storage Account, Log Analytics, or Event Hub) considering the 7-year retention requirement and tamper-proof needs.
6. Configure the audit scope: determine which actions to audit (data reads on sensitive tables, schema changes, permission changes, failed logins) while avoiding excessive logging that could impact performance.
7. Design a solution for the ledger table requirement. Identify which tables should use the Azure SQL Database ledger feature and explain how cryptographic verification works (database digests stored externally in Azure Confidential Ledger or Azure Blob Storage).
8. Create a compliance monitoring approach that generates alerts for suspicious access patterns (e.g., bulk data exports, access outside business hours, queries touching sensitive columns).

### Part 3: Backup and Recovery

9. Design a backup strategy that meets both the 35-day point-in-time restore requirement and the 7-year long-term retention (LTR) requirement. Specify the LTR policy (weekly, monthly, yearly backup frequency).
10. Evaluate the service tier implications for backup and recovery. Compare backup storage costs between General Purpose and Business Critical tiers and how geo-redundant backup storage (GZRS) supports cross-region restore.
11. Design a recovery testing procedure that validates backup integrity without impacting production. Include how to perform point-in-time restore to a test environment and validate data consistency.
12. Document the RPO (Recovery Point Objective) and RTO (Recovery Time Objective) achievable with your design and confirm they meet SecureBank's requirements.

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-17"
  items={[
    "Designed encryption strategy with customer-managed keys in Key Vault and clear separation of duties",
    "Selected Always Encrypted for sensitive columns with justification over dynamic data masking",
    "Configured comprehensive auditing with 7-year retention in tamper-proof storage",
    "Implemented ledger tables for cryptographic verification of financial records",
    "Designed LTR backup policy meeting both 35-day PITR and 7-year retention requirements",
    "Documented RPO/RTO achievable with the designed backup and recovery strategy"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Always Encrypted vs Dynamic Data Masking</summary>

Dynamic data masking (DDM) hides data in query results but does NOT encrypt it in the database. Users with UNMASK permission or direct storage access can see the real data. Always Encrypted encrypts data client-side before it reaches the database engine. The SQL Server engine never sees the plaintext. This means even DBAs with full server access cannot read encrypted columns. For PCI-DSS compliance with SSNs/account numbers, Always Encrypted is required because DDM does not provide true cryptographic protection.

</details>

<details>
<summary>Hint 2: Customer-Managed Keys for TDE</summary>

TDE with customer-managed keys (CMK) stores the TDE protector in Azure Key Vault. The recommended setup: (1) Create a Key Vault with soft delete and purge protection enabled; (2) Grant the SQL Server identity (system-assigned managed identity) GET, WRAP KEY, and UNWRAP KEY permissions; (3) The security team manages Key Vault access; (4) The DBA team manages database operations but cannot access the Key Vault directly. This enforces separation of duties.

</details>

<details>
<summary>Hint 3: Azure SQL Database Ledger</summary>

Ledger tables create a cryptographic hash chain over all modifications. Each transaction appends a hash that incorporates the previous hash, creating an immutable, verifiable history. Database digests (the latest hash) can be stored externally in Azure Confidential Ledger or immutable Blob Storage. To verify integrity, you compare the stored digests against the computed hash chain. Ledger tables are available in append-only (insert-only) or updatable variants.

</details>

<details>
<summary>Hint 4: Long-Term Retention (LTR)</summary>

Azure SQL Database LTR lets you retain full backups for up to 10 years. The policy is configured with W (weekly), M (monthly), and Y (yearly) parameters. For example: W=4, M=12, Y=7 retains 4 weekly backups, 12 monthly backups, and 7 yearly backups. LTR backups are stored in Azure Blob Storage with RA-GRS redundancy by default. PITR (up to 35 days) is separate from LTR and uses differential/log backups.

</details>

<details>
<summary>Hint 5: Audit Log Retention</summary>

For 7-year tamper-proof audit retention, store audit logs in an Azure Storage Account with immutability policies (legal hold or time-based retention). You can also use Log Analytics for queryable short-term storage (up to 2 years) and archive older logs to storage. Event Hub is useful for real-time streaming to SIEM systems but is not suitable for long-term storage by itself.

</details>

## Learning Resources

- [Transparent Data Encryption (TDE) with customer-managed keys](https://learn.microsoft.com/en-us/azure/azure-sql/database/transparent-data-encryption-byok-overview)
- [Always Encrypted overview](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/always-encrypted-database-engine)
- [Dynamic data masking in Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/dynamic-data-masking-overview)
- [Azure SQL Database auditing](https://learn.microsoft.com/en-us/azure/azure-sql/database/auditing-overview)
- [Azure SQL Database ledger](https://learn.microsoft.com/en-us/azure/azure-sql/database/ledger-overview)
- [Long-term backup retention](https://learn.microsoft.com/en-us/azure/azure-sql/database/long-term-retention-overview)
- [Automated backups in Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/automated-backups-overview)

## Knowledge Check

<details>
<summary>1. A bank requires that database administrators cannot see plaintext values of Social Security numbers stored in a database, even with full sysadmin privileges. Which feature should you recommend?</summary>

**Always Encrypted.** It performs client-side encryption so the database engine never processes or stores plaintext values for encrypted columns. Even users with sysadmin, db_owner, or direct storage access cannot decrypt the data without the column encryption key, which resides only in the client application's key store (e.g., Azure Key Vault or Windows Certificate Store). Dynamic data masking would NOT meet this requirement because it is a display-level feature that DBAs can bypass.

</details>

<details>
<summary>2. What is the difference between point-in-time restore (PITR) and long-term retention (LTR) in Azure SQL Database?</summary>

**PITR** provides continuous restore capability to any second within a configurable retention period (1-35 days). It uses full, differential, and transaction log backups. **LTR** retains weekly, monthly, or yearly full backup copies for up to 10 years. PITR is for operational recovery (accidental deletion, corruption), while LTR is for compliance and regulatory requirements. PITR and LTR are independent features that can be configured simultaneously.

</details>

<details>
<summary>3. How does Azure SQL Database ledger prove that financial records have not been tampered with?</summary>

**Cryptographic hash chain with external digest storage.** Ledger tables append a cryptographic hash to each transaction that incorporates the previous transaction's hash, forming a blockchain-like chain. Database digests (the latest hash value) are periodically stored in an external tamper-proof store (Azure Confidential Ledger or immutable Blob Storage). To verify integrity, you run a verification process that recomputes the hash chain and compares it against the stored digests. Any modification to historical data would break the hash chain.

</details>

<details>
<summary>4. An organization uses TDE with customer-managed keys and needs separation of duties between the DBA team and the security team. How should Azure Key Vault access be configured?</summary>

**The security team manages the Key Vault (create/rotate/delete keys), and the SQL Server managed identity receives only GET, WRAP KEY, and UNWRAP KEY permissions.** The DBA team administers the database but has no Key Vault access policy. This ensures DBAs cannot export or delete encryption keys, while the SQL Server service can still encrypt/decrypt data using the TDE protector. If the security team revokes Key Vault access, the database becomes inaccessible, providing a cryptographic kill switch.

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge17 --location eastus
```

2. Deploy an Azure SQL Database with TDE enabled (default):

```bash
az sql server create --name sql-securebank-lab --resource-group rg-az305-challenge17 \
  --location eastus --admin-user sqladmin --admin-password "P@ssw0rd2025!"

az sql db create --name db-securebank-core --resource-group rg-az305-challenge17 \
  --server sql-securebank-lab --edition GeneralPurpose --compute-model Serverless \
  --family Gen5 --capacity 2
```

3. Create a Key Vault for customer-managed keys:

```bash
az keyvault create --name kv-sb-tde-lab --resource-group rg-az305-challenge17 \
  --location eastus --enable-purge-protection true

az keyvault key create --vault-name kv-sb-tde-lab --name tde-protector \
  --kty RSA --size 2048
```

4. Verify TDE status and Key Vault configuration:

```bash
az sql db tde show --resource-group rg-az305-challenge17 \
  --server sql-securebank-lab --database db-securebank-core

az keyvault key show --vault-name kv-sb-tde-lab --name tde-protector \
  --query "{name:name,keyType:key.kty,enabled:attributes.enabled}" --output table
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
# Delete the resource group containing SecureBank resources
az group delete --name rg-securebank-data --yes --no-wait

# Delete the Key Vault (requires purge if soft-delete is enabled)
az keyvault delete --name kv-securebank-tde --resource-group rg-securebank-data
# After soft-delete retention period, purge:
# az keyvault purge --name kv-securebank-tde

# Delete audit storage account
az group delete --name rg-securebank-audit --yes --no-wait
```

---

**Next**: [Challenge 18: Design a Semi-Structured Data Solution](/docs/az-305/data-storage/challenge-18)
