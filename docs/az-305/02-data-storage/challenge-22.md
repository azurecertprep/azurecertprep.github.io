---
sidebar_position: 9
title: "Challenge 22: Design a Data Integration Pipeline"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 22: Design a Data Integration Pipeline

:::info Estimated Time and Cost

**75-90 min** | **Estimated cost**: $5-12 | **Exam Weight: 20-25%**

:::

## Introduction

FreshMart is a national retail chain with 200 stores, each running a local SQL Server database for point-of-sale transactions. Every night, headquarters needs aggregated sales data from all stores loaded into a central Azure Synapse Analytics data warehouse for inventory planning and financial reporting. Additionally, the supply chain team requires inventory data from an on-premises SAP system, and the marketing department needs campaign performance data pulled from Salesforce via REST API.

The current process relies on manual CSV exports and email attachments, resulting in data arriving 2-3 days late, frequent formatting errors, and no visibility into failures. The CTO requires an automated, monitored pipeline that delivers all three data sources to the warehouse by 6:00 AM daily, with automatic retry on failures and email alerts when pipelines fail after all retries are exhausted.

Your challenge is to design and implement a data integration solution using Azure Data Factory (or Synapse Pipelines), including orchestration across multiple sources, a self-hosted integration runtime for on-premises connectivity, appropriate trigger mechanisms, and comprehensive monitoring.

## Exam Skills Covered

- Recommend a solution for data integration

## Design Tasks

### Part 1: Select Integration Service and Design Architecture

1. Create a decision matrix comparing these integration services for FreshMart's requirements:
   - Azure Data Factory
   - Synapse Pipelines (integrated within Synapse workspace)
   - Azure Logic Apps
   - Azure Functions with custom code

   Evaluate on: connector ecosystem, on-premises support, orchestration complexity, monitoring capabilities, cost model, and team skill requirements.

2. Document your service selection with rationale. Consider that FreshMart's data team has SQL expertise but limited coding experience.

3. Design the high-level pipeline architecture showing:
   - Source systems (200 SQL Servers, SAP, Salesforce)
   - Integration runtime placement (cloud vs self-hosted)
   - Staging areas (Azure Data Lake Storage Gen2)
   - Destination (Synapse Analytics dedicated SQL pool)
   - Orchestration flow (master pipeline with child pipelines)

### Part 2: Implement Data Factory Pipelines

4. Deploy an Azure Data Factory instance and create the following linked services:
   - Azure SQL Database (simulating on-premises SQL Server via self-hosted IR)
   - Azure Data Lake Storage Gen2 (staging layer)
   - Azure Synapse Analytics (destination)

5. Design and create a parameterized pipeline for the store sales data ingestion:
   - Use a Lookup activity to retrieve the list of active stores
   - Use a ForEach activity to iterate over stores and copy data in parallel
   - Configure the Copy activity with appropriate source query, sink settings, and column mapping
   - Add fault tolerance settings (skip incompatible rows, log skipped rows)

6. Design the pipeline for SAP data extraction:
   - Document why a self-hosted integration runtime is required for on-premises sources
   - Describe the installation and configuration of the self-hosted IR on an on-premises machine
   - Design the copy activity using the SAP Table connector or SAP ODP connector
   - Address network considerations (ExpressRoute, VPN, or firewall rules for port 443)

7. Design the pipeline for Salesforce REST API data:
   - Use the REST connector or Salesforce connector in Data Factory
   - Handle OAuth 2.0 authentication and token refresh
   - Implement pagination for large result sets
   - Map the API response to the staging format

### Part 3: Orchestration, Triggers, and Error Handling

8. Create a master orchestration pipeline that:
   - Executes the three source pipelines (stores, SAP, Salesforce) in parallel
   - Waits for all three to complete before running a transformation pipeline
   - Uses an "Upon Completion" dependency (not "Upon Success") to handle partial failures gracefully

9. Configure a Schedule trigger to run the master pipeline at 11:00 PM nightly (allowing time for all stores to close and flush transactions).

10. Implement error handling and retry logic:
    - Set retry count to 3 with 10-minute intervals on copy activities
    - Add a Web activity to send failure notifications via webhook/email
    - Log pipeline run metadata (start time, duration, rows copied, errors) to a monitoring table
    - Design an alerting rule using Azure Monitor for consecutive pipeline failures

### Part 4: ETL vs ELT Design Decision

11. Document your decision between ETL (transform in Data Factory using Data Flows) versus ELT (load raw data to staging, transform in Synapse using SQL):
    - For store sales data: small transformations (currency conversion, date formatting)
    - For SAP inventory data: complex joins across multiple SAP tables
    - For Salesforce data: simple flattening of nested JSON
    - Consider: team skills, data volume, compute costs, and debugging complexity

12. If using ELT, create stored procedures in Synapse that transform staged data into the final star schema (fact and dimension tables).

## Success Criteria

<SuccessChecklist
  storageKey="az305-challenge-22"
  items={[
    "Decision matrix comparing at least 3 integration services with rationale for final selection",
    "Data Factory deployed with linked services for source, staging, and destination",
    "Parameterized pipeline with ForEach and Copy activities handling multiple stores",
    "Self-hosted integration runtime architecture documented with network requirements",
    "Master pipeline orchestrates child pipelines with parallel execution and error handling",
    "ETL vs ELT decision documented with justification for each data source"
  ]}
/>

## Hints

<details>
<summary>Hint 1: Azure Data Factory vs Synapse Pipelines</summary>

Synapse Pipelines and Azure Data Factory share the same underlying technology and UI experience. The key difference is integration context: Synapse Pipelines are embedded within a Synapse workspace (tighter integration with Synapse SQL pools, Spark pools, and the data lake). Data Factory is standalone and better when you need pipelines independent of Synapse or connecting to many diverse destinations. For this scenario, if the destination is Synapse Analytics, either works - but Data Factory is the more common exam answer for general data integration scenarios.

</details>

<details>
<summary>Hint 2: Self-Hosted Integration Runtime</summary>

A self-hosted integration runtime (SHIR) is required to connect to on-premises data sources or data sources inside a virtual network. It runs on a Windows machine with network access to both the source (SAP, SQL Server) and Azure (outbound HTTPS on port 443). Key design considerations: install on a dedicated machine (not the database server), configure for high availability with 2+ nodes, and ensure the machine has sufficient memory for data marshaling. The SHIR does not require inbound firewall rules - it initiates outbound connections to Azure.

</details>

<details>
<summary>Hint 3: ForEach Activity Parallelism</summary>

The ForEach activity in Data Factory processes items in parallel by default (up to 50 concurrent iterations with the `batchCount` property). For 200 stores, you might set `batchCount` to 20-50 depending on source database capacity and network bandwidth. Setting `isSequential: true` processes one at a time but is rarely needed unless the source has concurrency limitations.

</details>

<details>
<summary>Hint 4: ETL vs ELT Pattern Selection</summary>

Choose ELT when: the destination has powerful compute (Synapse SQL pool), transformations are SQL-expressible, data volumes are large, and the team has SQL skills. Choose ETL (Data Flows in Data Factory) when: transformations are complex (requiring Spark), you want visual debugging, or the destination lacks transformation capability. For most enterprise data warehouse scenarios on Azure, ELT with Synapse is preferred because it leverages the MPP engine for transformations at scale.

</details>

<details>
<summary>Hint 5: Monitoring and Alerting</summary>

Data Factory provides built-in monitoring through Azure Monitor with metrics like `PipelineSucceededRuns`, `PipelineFailedRuns`, `ActivitySucceededRuns`, and `TriggerSucceededRuns`. Configure diagnostic settings to send logs to Log Analytics for advanced queries. For email alerts on failure, use Azure Monitor Action Groups rather than building custom notification logic inside pipelines.

</details>

## Learning Resources

- [Azure Data Factory overview](https://learn.microsoft.com/en-us/azure/data-factory/introduction)
- [Copy activity in Azure Data Factory](https://learn.microsoft.com/en-us/azure/data-factory/copy-activity-overview)
- [Create and configure a self-hosted integration runtime](https://learn.microsoft.com/en-us/azure/data-factory/create-self-hosted-integration-runtime)
- [Pipeline execution and triggers](https://learn.microsoft.com/en-us/azure/data-factory/concepts-pipeline-execution-triggers)
- [ForEach activity in Azure Data Factory](https://learn.microsoft.com/en-us/azure/data-factory/control-flow-for-each-activity)
- [Data flows in Azure Data Factory](https://learn.microsoft.com/en-us/azure/data-factory/concepts-data-flow-overview)
- [Monitor Azure Data Factory](https://learn.microsoft.com/en-us/azure/data-factory/monitor-visually)

## Knowledge Check

<details>
<summary>1. FreshMart's SAP system is on-premises behind a corporate firewall. Which component enables Azure Data Factory to access this data without opening inbound firewall ports?</summary>

**Self-hosted integration runtime (SHIR).** The SHIR is installed on a Windows machine inside the corporate network that has access to the SAP system. It establishes outbound HTTPS connections to Azure Data Factory's service bus (no inbound ports required). Data Factory sends instructions to the SHIR via this outbound channel, and the SHIR executes copy activities locally, pushing data to Azure over the same outbound connection. This is the standard pattern for accessing on-premises sources without VPN or ExpressRoute (though those are alternatives if direct connectivity is preferred).

</details>

<details>
<summary>2. The marketing team's Salesforce API returns paginated results with 2,000 records per page and a next-page token. How should the Data Factory pipeline handle this?</summary>

**Use the REST connector with pagination rules.** Data Factory's REST connector supports configurable pagination rules that automatically follow next-page tokens until all data is retrieved. You configure the pagination rule in the REST linked service or dataset, specifying where the next-page URL or token appears in the response (e.g., a header, body field, or query parameter). The Copy activity handles the iteration transparently without requiring a loop activity.

</details>

<details>
<summary>3. A pipeline has three parallel child pipelines (stores, SAP, Salesforce). The SAP pipeline fails but the other two succeed. Using "Upon Completion" dependency, what happens to the downstream transformation pipeline?</summary>

**The transformation pipeline still executes.** "Upon Completion" means the downstream activity runs regardless of whether the upstream succeeded or failed - it only waits for the activity to finish. This allows the transformation pipeline to handle partial data loads gracefully (perhaps processing only the sources that succeeded). In contrast, "Upon Success" would skip the transformation entirely if any upstream failed. The design choice depends on whether partial data loads are acceptable for the business.

</details>

<details>
<summary>4. Why would you choose ELT (load then transform in Synapse) over ETL (transform in Data Factory Data Flows) for loading 200 store databases into a central warehouse?</summary>

**Synapse's MPP (Massively Parallel Processing) engine is optimized for large-scale transformations on data already in the warehouse.** Loading raw data via Copy activity (minimal compute cost) then running SQL transformations in Synapse leverages the dedicated SQL pool's distributed compute. Data Factory Data Flows use Spark clusters that must spin up (5-7 minute cold start), are billed per minute of compute, and are better suited for complex non-SQL transformations. For SQL-expressible transformations (joins, aggregations, type conversions), ELT in Synapse is typically faster and cheaper at scale.

</details>

## Validation Lab

Deploy a minimal proof-of-concept to validate your design:

1. Create a resource group for this lab:

```bash
az group create --name rg-az305-challenge22 --location eastus
```

2. Deploy a Data Factory and a storage account with source and sink containers:

```bash
az storage account create \
  --name staz305ch22$RANDOM \
  --resource-group rg-az305-challenge22 \
  --sku Standard_LRS \
  --kind StorageV2

az storage container create --name source --account-name <your-account-name>
az storage container create --name sink --account-name <your-account-name>

az storage blob upload \
  --account-name <your-account-name> \
  --container-name source \
  --name sales-data.csv \
  --data "store_id,date,revenue\n1,2024-01-01,5000\n2,2024-01-01,7500" \
  --type block

az datafactory create \
  --name adf-az305-ch22 \
  --resource-group rg-az305-challenge22 \
  --location eastus
```

3. Create a linked service and run a copy pipeline:

```bash
az datafactory linked-service create \
  --factory-name adf-az305-ch22 \
  --resource-group rg-az305-challenge22 \
  --name BlobStorageLS \
  --properties '{
    "type": "AzureBlobStorage",
    "typeProperties": {
      "connectionString": "'$(az storage account show-connection-string --name <your-account-name> --resource-group rg-az305-challenge22 --query connectionString -o tsv)'"
    }
  }'
```

4. Verify the Data Factory and linked service were created:

```bash
az datafactory linked-service show \
  --factory-name adf-az305-ch22 \
  --resource-group rg-az305-challenge22 \
  --name BlobStorageLS \
  --query "name"
```

:::tip
This mini-deployment validates your design decisions with real Azure resources. It is optional but recommended.
:::

## Cleanup

```bash
az group delete --name rg-az305-challenge22 --yes --no-wait
```

---

**Next**: [Challenge 23: Design a Data Analytics Solution](/docs/az-305/data-storage/challenge-23)
