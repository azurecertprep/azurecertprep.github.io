---
sidebar_position: 7
title: "Challenge 06: Container Deployment for AI"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 06: Container Deployment for AI

:::info Estimated Time
**45-60 min** | **Cost**: ~$0.50 (container still bills to Azure) | **Domain**: Plan & Manage AI Solutions (20-25%)
:::

## Exam skills covered
- Plan and implement container deployment for Azure AI services
- Configure disconnected containers for edge scenarios
- Manage container licensing and billing requirements

## Overview

Azure AI services can be deployed as Docker containers, enabling you to run AI capabilities on-premises, at the edge, or in disconnected environments. While the containers run locally, they still require a connection to Azure for billing purposes unless configured for disconnected mode.

Container deployment is critical for scenarios requiring data residency, low latency, or intermittent connectivity. You'll work with language detection and sentiment analysis containers, learning how to pull images from Microsoft Container Registry, configure billing endpoints, and validate container health.

Understanding the billing model is essential — containers must phone home to Azure for metering even when processing data locally, unless you've obtained a disconnected container license through a gating process.

## Architecture

The container deployment connects local Docker containers to Azure AI services for billing while processing data locally.

![Challenge 06 topology](/img/ai-102/challenge-06-topology.svg)

## Prerequisites

- Azure subscription with an Azure AI services multi-service resource
- Docker Desktop installed and running
- Azure CLI installed
- At least 8 GB RAM available for containers
- Endpoint and key from your Azure AI services resource

## Implementation

### Task 1: Create Azure AI Services Resource for Billing

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient
from azure.mgmt.cognitiveservices.models import Account, Sku

credential = DefaultAzureCredential()
client = CognitiveServicesManagementClient(credential, subscription_id="<your-subscription-id>")

# Create a multi-service resource for container billing
account = client.accounts.begin_create(
    resource_group_name="rg-ai102-challenge06",
    account_name="ai-containers-billing",
    account=Account(
        sku=Sku(name="S0"),
        kind="AIServices",
        location="eastus",
        properties={}
    )
).result()

print(f"Resource created: {account.name}")
print(f"Endpoint: {account.properties.endpoint}")

# Retrieve keys for container billing configuration
keys = client.accounts.list_keys(
    resource_group_name="rg-ai102-challenge06",
    account_name="ai-containers-billing"
)
print(f"Key1: {keys.key1}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.CognitiveServices;
using Azure.ResourceManager.CognitiveServices.Models;
using Azure.ResourceManager.Resources;

var credential = new DefaultAzureCredential();
var armClient = new ArmClient(credential);

SubscriptionResource subscription = await armClient.GetDefaultSubscriptionAsync();
ResourceGroupResource resourceGroup = await subscription
    .GetResourceGroups()
    .GetAsync("rg-ai102-challenge06");

// Create multi-service resource for container billing
var accountData = new CognitiveServicesAccountData(Azure.Core.AzureLocation.EastUS)
{
    Kind = "CognitiveServices",
    Sku = new CognitiveServicesSku("S0"),
    Properties = new CognitiveServicesAccountProperties()
};

var operation = await resourceGroup
    .GetCognitiveServicesAccounts()
    .CreateOrUpdateAsync(Azure.WaitUntil.Completed, "ai-containers-billing", accountData);

var account = operation.Value;
Console.WriteLine($"Resource created: {account.Data.Name}");
Console.WriteLine($"Endpoint: {account.Data.Properties.Endpoint}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Set variables
RESOURCE_GROUP="rg-ai102-challenge06"
LOCATION="eastus"
ACCOUNT_NAME="ai-containers-billing"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create multi-service Cognitive Services resource
az cognitiveservices account create \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --kind AIServices \
  --sku S0 \
  --location $LOCATION

# Get endpoint and key for container billing
ENDPOINT=$(az cognitiveservices account show \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.endpoint" -o tsv)

KEY=$(az cognitiveservices account keys list \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "key1" -o tsv)

echo "Endpoint: $ENDPOINT"
echo "Key: $KEY"
```

</TabItem>
</Tabs>

### Task 2: Pull and Run Language Detection Container

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import subprocess
import requests
import time
import os

ENDPOINT = os.environ["AZURE_AI_ENDPOINT"]
KEY = os.environ["AZURE_AI_KEY"]

# Pull the language detection container
subprocess.run([
    "docker", "pull",
    "mcr.microsoft.com/azure-cognitive-services/textanalytics/language:latest"
], check=True)

# Run the container with billing configuration
container_id = subprocess.run([
    "docker", "run", "-d",
    "--name", "language-detection",
    "-p", "5000:5000",
    "-e", f"Eula=accept",
    "-e", f"Billing={ENDPOINT}",
    "-e", f"ApiKey={KEY}",
    "--memory", "4g",
    "--cpus", "2",
    "mcr.microsoft.com/azure-cognitive-services/textanalytics/language:latest"
], capture_output=True, text=True, check=True)

print(f"Container started: {container_id.stdout.strip()}")

# Wait for container to be ready
time.sleep(30)

# Health check
response = requests.get("http://localhost:5000/status")
print(f"Container health: {response.json()}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using System.Diagnostics;
using System.Net.Http;
using System.Text.Json;

string endpoint = Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")!;
string key = Environment.GetEnvironmentVariable("AZURE_AI_KEY")!;

// Pull the language detection container
var pullProcess = Process.Start(new ProcessStartInfo
{
    FileName = "docker",
    Arguments = "pull mcr.microsoft.com/azure-cognitive-services/textanalytics/language:latest",
    RedirectStandardOutput = true
});
await pullProcess!.WaitForExitAsync();
Console.WriteLine("Container image pulled successfully");

// Run the container with billing configuration
var runProcess = Process.Start(new ProcessStartInfo
{
    FileName = "docker",
    Arguments = $"run -d --name language-detection -p 5000:5000 " +
                $"-e Eula=accept " +
                $"-e Billing={endpoint} " +
                $"-e ApiKey={key} " +
                $"--memory 4g --cpus 2 " +
                $"mcr.microsoft.com/azure-cognitive-services/textanalytics/language:latest",
    RedirectStandardOutput = true
});
await runProcess!.WaitForExitAsync();

// Wait for container readiness
await Task.Delay(TimeSpan.FromSeconds(30));

// Health check
using var httpClient = new HttpClient();
var response = await httpClient.GetStringAsync("http://localhost:5000/status");
Console.WriteLine($"Container health: {response}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Pull the language detection container image
docker pull mcr.microsoft.com/azure-cognitive-services/textanalytics/language:latest

# Run container with billing endpoint and API key
docker run -d \
  --name language-detection \
  -p 5000:5000 \
  -e Eula=accept \
  -e Billing=$ENDPOINT \
  -e ApiKey=$KEY \
  --memory 4g \
  --cpus 2 \
  mcr.microsoft.com/azure-cognitive-services/textanalytics/language:latest

# Wait for container to initialize
sleep 30

# Check container health
curl -s http://localhost:5000/status | jq .

# View container logs
docker logs language-detection --tail 20
```

</TabItem>
</Tabs>

### Task 3: Test Language Detection Container Locally

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.ai.textanalytics import TextAnalyticsClient
from azure.core.credentials import AzureKeyCredential

# Point the SDK client at the local container
# The container exposes the same API as the cloud service
client = TextAnalyticsClient(
    endpoint="http://localhost:5000",
    credential=AzureKeyCredential("not-needed-for-local")
)

documents = [
    "Hello, this is a test document in English.",
    "Bonjour, ceci est un document de test en français.",
    "Hola, este es un documento de prueba en español.",
    "Dies ist ein Testdokument auf Deutsch.",
    "これはテスト用のドキュメントです。"
]

response = client.detect_language(documents=documents)

for doc in response:
    if not doc.is_error:
        print(f"Text: '{doc.input[:40]}...'")
        print(f"  Language: {doc.primary_language.name}")
        print(f"  ISO Code: {doc.primary_language.iso6391_name}")
        print(f"  Confidence: {doc.primary_language.confidence_score:.2f}")
    else:
        print(f"Error: {doc.error.message}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure;
using Azure.AI.TextAnalytics;

// Point SDK client at the local container endpoint
var client = new TextAnalyticsClient(
    new Uri("http://localhost:5000"),
    new AzureKeyCredential("not-needed-for-local")
);

var documents = new List<string>
{
    "Hello, this is a test document in English.",
    "Bonjour, ceci est un document de test en français.",
    "Hola, este es un documento de prueba en español.",
    "Dies ist ein Testdokument auf Deutsch.",
    "これはテスト用のドキュメントです。"
};

DetectLanguageResultCollection response = await client.DetectLanguageBatchAsync(documents);

foreach (DetectLanguageResult result in response)
{
    if (!result.HasError)
    {
        Console.WriteLine($"Text: '{result.Input[..Math.Min(40, result.Input.Length)]}...'");
        Console.WriteLine($"  Language: {result.PrimaryLanguage.Name}");
        Console.WriteLine($"  ISO Code: {result.PrimaryLanguage.Iso6391Name}");
        Console.WriteLine($"  Confidence: {result.PrimaryLanguage.ConfidenceScore:F2}");
    }
    else
    {
        Console.WriteLine($"Error: {result.Error.Message}");
    }
}
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Test language detection against local container
curl -X POST "http://localhost:5000/text/analytics/v3.1/languages" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {"id": "1", "text": "Hello, this is a test document in English."},
      {"id": "2", "text": "Bonjour, ceci est un document de test en français."},
      {"id": "3", "text": "Hola, este es un documento de prueba en español."},
      {"id": "4", "text": "Dies ist ein Testdokument auf Deutsch."},
      {"id": "5", "text": "これはテスト用のドキュメントです。"}
    ]
  }' | jq '.documents[] | {id, detectedLanguage: .detectedLanguage.name, confidence: .detectedLanguage.confidenceScore}'
```

</TabItem>
</Tabs>

### Task 4: Run Sentiment Analysis Container and Configure Docker Compose

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import yaml
import os

ENDPOINT = os.environ["AZURE_AI_ENDPOINT"]
KEY = os.environ["AZURE_AI_KEY"]

# Generate docker-compose.yml for multi-container deployment
compose_config = {
    "version": "3.8",
    "services": {
        "language-detection": {
            "image": "mcr.microsoft.com/azure-cognitive-services/textanalytics/language:latest",
            "ports": ["5000:5000"],
            "environment": {
                "Eula": "accept",
                "Billing": ENDPOINT,
                "ApiKey": KEY
            },
            "deploy": {
                "resources": {
                    "limits": {"cpus": "2", "memory": "4G"},
                    "reservations": {"cpus": "1", "memory": "2G"}
                }
            },
            "healthcheck": {
                "test": ["CMD", "curl", "-f", "http://localhost:5000/status"],
                "interval": "30s",
                "timeout": "10s",
                "retries": 3,
                "start_period": "60s"
            }
        },
        "sentiment-analysis": {
            "image": "mcr.microsoft.com/azure-cognitive-services/textanalytics/sentiment:latest",
            "ports": ["5001:5000"],
            "environment": {
                "Eula": "accept",
                "Billing": ENDPOINT,
                "ApiKey": KEY
            },
            "deploy": {
                "resources": {
                    "limits": {"cpus": "2", "memory": "4G"},
                    "reservations": {"cpus": "1", "memory": "2G"}
                }
            },
            "healthcheck": {
                "test": ["CMD", "curl", "-f", "http://localhost:5000/status"],
                "interval": "30s",
                "timeout": "10s",
                "retries": 3,
                "start_period": "60s"
            }
        }
    }
}

with open("docker-compose.yml", "w") as f:
    yaml.dump(compose_config, f, default_flow_style=False)

print("docker-compose.yml generated")
print("Run: docker compose up -d")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using System.Text;

string endpoint = Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")!;
string key = Environment.GetEnvironmentVariable("AZURE_AI_KEY")!;

// Generate docker-compose.yml for multi-container deployment
var compose = new StringBuilder();
compose.AppendLine("version: '3.8'");
compose.AppendLine("services:");
compose.AppendLine("  language-detection:");
compose.AppendLine("    image: mcr.microsoft.com/azure-cognitive-services/textanalytics/language:latest");
compose.AppendLine("    ports:");
compose.AppendLine("      - '5000:5000'");
compose.AppendLine("    environment:");
compose.AppendLine("      Eula: accept");
compose.AppendLine($"      Billing: {endpoint}");
compose.AppendLine($"      ApiKey: {key}");
compose.AppendLine("    deploy:");
compose.AppendLine("      resources:");
compose.AppendLine("        limits:");
compose.AppendLine("          cpus: '2'");
compose.AppendLine("          memory: 4G");
compose.AppendLine("    healthcheck:");
compose.AppendLine("      test: ['CMD', 'curl', '-f', 'http://localhost:5000/status']");
compose.AppendLine("      interval: 30s");
compose.AppendLine("      timeout: 10s");
compose.AppendLine("      retries: 3");
compose.AppendLine("  sentiment-analysis:");
compose.AppendLine("    image: mcr.microsoft.com/azure-cognitive-services/textanalytics/sentiment:latest");
compose.AppendLine("    ports:");
compose.AppendLine("      - '5001:5000'");
compose.AppendLine("    environment:");
compose.AppendLine("      Eula: accept");
compose.AppendLine($"      Billing: {endpoint}");
compose.AppendLine($"      ApiKey: {key}");
compose.AppendLine("    deploy:");
compose.AppendLine("      resources:");
compose.AppendLine("        limits:");
compose.AppendLine("          cpus: '2'");
compose.AppendLine("          memory: 4G");
compose.AppendLine("    healthcheck:");
compose.AppendLine("      test: ['CMD', 'curl', '-f', 'http://localhost:5000/status']");
compose.AppendLine("      interval: 30s");
compose.AppendLine("      timeout: 10s");
compose.AppendLine("      retries: 3");

await File.WriteAllTextAsync("docker-compose.yml", compose.ToString());
Console.WriteLine("docker-compose.yml generated");
Console.WriteLine("Run: docker compose up -d");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Pull sentiment analysis container
docker pull mcr.microsoft.com/azure-cognitive-services/textanalytics/sentiment:latest

# Run sentiment container on different port
docker run -d \
  --name sentiment-analysis \
  -p 5001:5000 \
  -e Eula=accept \
  -e Billing=$ENDPOINT \
  -e ApiKey=$KEY \
  --memory 4g \
  --cpus 2 \
  mcr.microsoft.com/azure-cognitive-services/textanalytics/sentiment:latest

# Wait for initialization
sleep 30

# Test sentiment analysis
curl -X POST "http://localhost:5001/text/analytics/v3.1/sentiment" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {"id": "1", "text": "The new Azure AI containers are fantastic and easy to deploy!"},
      {"id": "2", "text": "The service went down and we lost hours of productivity."}
    ]
  }' | jq '.documents[] | {id, sentiment, confidenceScores}'

# Check both containers are healthy
echo "Language Detection:" && curl -s http://localhost:5000/status | jq .
echo "Sentiment Analysis:" && curl -s http://localhost:5001/status | jq .
```

</TabItem>
</Tabs>

### Task 5: Configure Disconnected Container Mode

<Tabs>
<TabItem value="python" label="Python SDK">

```python
import subprocess
import os

# Note: Disconnected containers require a commitment plan and gating approval
# from Microsoft. This shows the configuration once approved.

# Download the disconnected container license
# (Obtained from Azure portal after gating approval)
LICENSE_PATH = "/path/to/license/file.lic"

# For disconnected mode, the container is configured with:
# - DownloadLicense=True to download the license initially
# - Mounts: volume for license file persistence

# Step 1: Download license (requires initial connectivity)
print("Step 1: Downloading disconnected container license...")
subprocess.run([
    "docker", "run", "-d",
    "--name", "language-download-license",
    "-e", "Eula=accept",
    "-e", f"Billing={os.environ['AZURE_AI_ENDPOINT']}",
    "-e", f"ApiKey={os.environ['AZURE_AI_KEY']}",
    "-e", "DownloadLicense=True",
    "-v", "license-data:/license",
    "-e", "Containers:Billing:License:Mount=/license",
    "mcr.microsoft.com/azure-cognitive-services/textanalytics/language:latest"
], check=True)

print("License downloaded. Container can now run disconnected.")

# Step 2: Run in disconnected mode (no internet required)
print("\nStep 2: Running in disconnected mode...")
subprocess.run([
    "docker", "run", "-d",
    "--name", "language-disconnected",
    "-p", "5000:5000",
    "-e", "Eula=accept",
    "-v", "license-data:/license",
    "-e", "Containers:Billing:License:Mount=/license",
    "--network", "none",  # No network access - truly disconnected
    "mcr.microsoft.com/azure-cognitive-services/textanalytics/language:latest"
], check=True)

print("Container running in disconnected mode (no network).")
print("License validity period: defined by commitment plan duration.")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using System.Diagnostics;

string endpoint = Environment.GetEnvironmentVariable("AZURE_AI_ENDPOINT")!;
string key = Environment.GetEnvironmentVariable("AZURE_AI_KEY")!;

// Note: Disconnected containers require a commitment plan and gating approval
// from Microsoft. This shows the configuration once approved.

// Step 1: Download license (requires initial connectivity)
Console.WriteLine("Step 1: Downloading disconnected container license...");
var downloadProcess = Process.Start(new ProcessStartInfo
{
    FileName = "docker",
    Arguments = "run -d --name language-download-license " +
                "-e Eula=accept " +
                $"-e Billing={endpoint} " +
                $"-e ApiKey={key} " +
                "-e DownloadLicense=True " +
                "-v license-data:/license " +
                "-e Containers:Billing:License:Mount=/license " +
                "mcr.microsoft.com/azure-cognitive-services/textanalytics/language:latest",
    RedirectStandardOutput = true
});
await downloadProcess!.WaitForExitAsync();
Console.WriteLine("License downloaded successfully.");

// Step 2: Run in fully disconnected mode
Console.WriteLine("\nStep 2: Running in disconnected mode...");
var disconnectedProcess = Process.Start(new ProcessStartInfo
{
    FileName = "docker",
    Arguments = "run -d --name language-disconnected " +
                "-p 5000:5000 " +
                "-e Eula=accept " +
                "-v license-data:/license " +
                "-e Containers:Billing:License:Mount=/license " +
                "--network none " +
                "mcr.microsoft.com/azure-cognitive-services/textanalytics/language:latest",
    RedirectStandardOutput = true
});
await disconnectedProcess!.WaitForExitAsync();
Console.WriteLine("Container running in disconnected mode (no network).");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Disconnected containers require commitment plan approval from Microsoft
# Once approved, follow this process:

# Step 1: Download license (initial internet connectivity required)
docker run -d \
  --name language-download-license \
  -e Eula=accept \
  -e Billing=$ENDPOINT \
  -e ApiKey=$KEY \
  -e DownloadLicense=True \
  -v license-data:/license \
  -e "Containers:Billing:License:Mount=/license" \
  mcr.microsoft.com/azure-cognitive-services/textanalytics/language:latest

# Wait for license download
sleep 30
docker logs language-download-license | grep -i license

# Step 2: Stop the download container
docker stop language-download-license
docker rm language-download-license

# Step 3: Run in fully disconnected mode (no network)
docker run -d \
  --name language-disconnected \
  -p 5000:5000 \
  -e Eula=accept \
  -v license-data:/license \
  -e "Containers:Billing:License:Mount=/license" \
  --network none \
  mcr.microsoft.com/azure-cognitive-services/textanalytics/language:latest

# Verify container runs without network
docker inspect language-disconnected --format '{{.HostConfig.NetworkMode}}'
# Expected: none

# Test the container (from host - container has no external network)
curl -s http://localhost:5000/status | jq .
```

</TabItem>
</Tabs>

## Expected Output

```json
// Language detection response from local container
{
  "documents": [
    {
      "id": "1",
      "detectedLanguage": {
        "name": "English",
        "iso6391Name": "en",
        "confidenceScore": 1.0
      }
    },
    {
      "id": "2",
      "detectedLanguage": {
        "name": "French",
        "iso6391Name": "fr",
        "confidenceScore": 1.0
      }
    }
  ]
}

// Container health check
{
  "service": "Language",
  "status": "ready",
  "apiStatus": "Valid",
  "apiStatusMessage": "Api Key is valid."
}
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Container won't start | Exit code 1, "Billing endpoint required" | Missing `Billing` environment variable | Add `-e Billing=<endpoint>` to docker run |
| Container starts but returns 401 | HTTP 401 on all requests | Invalid or missing API key | Verify `ApiKey` environment variable matches Azure resource key |
| Container crashes with OOM | Exit code 137 | Insufficient memory allocated | Increase `--memory` to at least 4g for text analytics containers |
| Billing validation fails | "Unable to reach billing endpoint" | Firewall blocking outbound HTTPS | Allow outbound to `*.cognitiveservices.azure.com` on port 443 |
| Disconnected container license expired | "License expired" error on startup | Commitment plan period ended | Reconnect to Azure to renew license, or renew commitment plan |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What is required for an Azure AI container to function in connected mode?",
    options: [
      "A billing endpoint and API key from an Azure AI services resource",
      "A local SQL Server database for storing results",
      "An Azure Active Directory token embedded in the container image",
      "A VPN connection to the Azure virtual network"
    ],
    correctAnswer: 0,
    explanation: "Azure AI containers in connected mode require a billing endpoint (Billing) and API key (ApiKey) from an Azure AI services resource. The container processes data locally but reports usage to Azure for billing purposes."
  },
  {
    question: "What Docker parameter must be set to true when accepting the container license agreement?",
    options: [
      "AcceptTerms=yes",
      "License=accepted",
      "Eula=accept",
      "ACCEPT_EULA=Y"
    ],
    correctAnswer: 2,
    explanation: "Azure AI containers require the environment variable Eula=accept to acknowledge the license terms. Without this, the container will not start."
  },
  {
    question: "What is the minimum RAM recommended for running the Text Analytics language detection container?",
    options: [
      "1 GB",
      "2 GB",
      "4 GB",
      "8 GB"
    ],
    correctAnswer: 2,
    explanation: "The Text Analytics containers (language, sentiment, etc.) require a minimum of 4 GB RAM to function properly. Allocating less may cause out-of-memory errors or degraded performance."
  },
  {
    question: "How does a disconnected Azure AI container handle billing?",
    options: [
      "It does not require any billing — it is completely free",
      "It uses a pre-downloaded license tied to a commitment plan",
      "It caches billing data locally and uploads when reconnected",
      "It requires manual invoice submission to Microsoft"
    ],
    correctAnswer: 1,
    explanation: "Disconnected containers use a license file obtained through a commitment plan. The license is downloaded initially (requiring connectivity), then the container operates offline for the duration of the commitment plan period."
  },
  {
    question: "Which endpoint can you use to verify that an Azure AI container is healthy and ready to accept requests?",
    options: [
      "http://localhost:5000/health",
      "http://localhost:5000/status",
      "http://localhost:5000/api/ping",
      "http://localhost:5000/v1/ready"
    ],
    correctAnswer: 1,
    explanation: "Azure AI containers expose a /status endpoint that returns the container's health state, API validation status, and readiness to process requests."
  }
]} />

## Cleanup

```bash
# Stop and remove containers
docker stop language-detection sentiment-analysis language-disconnected 2>/dev/null
docker rm language-detection sentiment-analysis language-disconnected language-download-license 2>/dev/null

# Remove Docker volume
docker volume rm license-data 2>/dev/null

# Remove Azure resources
az group delete --name rg-ai102-challenge06 --yes --no-wait
```

## Learn More

- [Install and run Azure AI containers](https://learn.microsoft.com/en-us/azure/ai-services/cognitive-services-container-support)
- [Use Docker containers in disconnected environments](https://learn.microsoft.com/en-us/azure/ai-services/containers/disconnected-containers)
- [Text Analytics container configuration](https://learn.microsoft.com/en-us/azure/ai-services/language-service/language-detection/how-to/use-containers)
- [Container requirements and recommendations](https://learn.microsoft.com/en-us/azure/ai-services/containers/container-reuse-recipe)
