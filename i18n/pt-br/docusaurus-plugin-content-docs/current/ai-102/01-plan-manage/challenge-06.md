---
sidebar_position: 7
title: "Desafio 06: Implantação em Contêiner para IA"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 06: Implantação em Contêiner para IA

:::info Tempo Estimado
**45-60 min** | **Custo**: ~$0.50 (contêiner ainda é cobrado no Azure) | **Domínio**: Planejar e Gerenciar Soluções de IA (20-25%)
:::

## Habilidades do exame cobertas
- Planejar e implementar implantação em contêiner para Azure AI services
- Configurar contêineres desconectados para cenários de borda
- Gerenciar requisitos de licenciamento e cobrança de contêineres

## Visão Geral

Os Azure AI services podem ser implantados como contêineres Docker, permitindo que você execute capacidades de IA on-premises, na borda ou em ambientes desconectados. Embora os contêineres sejam executados localmente, eles ainda requerem uma conexão com o Azure para fins de cobrança, a menos que estejam configurados para o modo desconectado.

A implantação em contêiner é crítica para cenários que exigem residência de dados, baixa latência ou conectividade intermitente. Você trabalhará com contêineres de detecção de idioma e análise de sentimento, aprendendo como baixar imagens do Microsoft Container Registry, configurar endpoints de cobrança e validar a saúde do contêiner.

Entender o modelo de cobrança é essencial — os contêineres precisam se comunicar com o Azure para medição mesmo quando processam dados localmente, a menos que você tenha obtido uma licença de contêiner desconectado por meio de um processo de aprovação.

## Arquitetura

A implantação em contêiner conecta contêineres Docker locais aos Azure AI services para cobrança enquanto processa dados localmente.

![Challenge 06 topology](/img/ai-102/challenge-06-topology.svg)

## Pré-requisitos

- Assinatura do Azure com um recurso multi-serviço de Azure AI services
- Docker Desktop instalado e em execução
- Azure CLI instalado
- Pelo menos 8 GB de RAM disponível para contêineres
- Endpoint e chave do seu recurso Azure AI services

## Implementação

### Tarefa 1: Criar Recurso Azure AI Services para Cobrança

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

### Tarefa 2: Baixar e Executar Contêiner de Detecção de Idioma

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

### Tarefa 3: Testar Contêiner de Detecção de Idioma Localmente

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

### Tarefa 4: Executar Contêiner de Análise de Sentimento e Configurar Docker Compose

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

### Tarefa 5: Configurar Modo de Contêiner Desconectado

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

## Saída Esperada

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

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Contêiner não inicia | Código de saída 1, "Billing endpoint required" | Variável de ambiente `Billing` ausente | Adicione `-e Billing=<endpoint>` ao docker run |
| Contêiner inicia mas retorna 401 | HTTP 401 em todas as requisições | Chave API inválida ou ausente | Verifique se a variável de ambiente `ApiKey` corresponde à chave do recurso Azure |
| Contêiner crasha com OOM | Código de saída 137 | Memória insuficiente alocada | Aumente `--memory` para pelo menos 4g para contêineres de text analytics |
| Validação de cobrança falha | "Unable to reach billing endpoint" | Firewall bloqueando HTTPS de saída | Permita saída para `*.cognitiveservices.azure.com` na porta 443 |
| Licença do contêiner desconectado expirou | Erro "License expired" na inicialização | Período do plano de compromisso encerrado | Reconecte ao Azure para renovar a licença, ou renove o plano de compromisso |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "O que é necessário para um contêiner Azure AI funcionar no modo conectado?",
    options: [
      "Um endpoint de cobrança e uma chave API de um recurso Azure AI services",
      "Um banco de dados SQL Server local para armazenar resultados",
      "Um token do Azure Active Directory embutido na imagem do contêiner",
      "Uma conexão VPN com a rede virtual do Azure"
    ],
    correctAnswer: 0,
    explanation: "Contêineres Azure AI no modo conectado requerem um endpoint de cobrança (Billing) e uma chave API (ApiKey) de um recurso Azure AI services. O contêiner processa dados localmente mas reporta o uso ao Azure para fins de cobrança."
  },
  {
    question: "Qual parâmetro Docker deve ser definido como true ao aceitar o contrato de licença do contêiner?",
    options: [
      "AcceptTerms=yes",
      "License=accepted",
      "Eula=accept",
      "ACCEPT_EULA=Y"
    ],
    correctAnswer: 2,
    explanation: "Contêineres Azure AI requerem a variável de ambiente Eula=accept para reconhecer os termos de licença. Sem isso, o contêiner não iniciará."
  },
  {
    question: "Qual é a RAM mínima recomendada para executar o contêiner de detecção de idioma do Text Analytics?",
    options: [
      "1 GB",
      "2 GB",
      "4 GB",
      "8 GB"
    ],
    correctAnswer: 2,
    explanation: "Os contêineres Text Analytics (idioma, sentimento, etc.) requerem no mínimo 4 GB de RAM para funcionar corretamente. Alocar menos pode causar erros de falta de memória ou desempenho degradado."
  },
  {
    question: "Como um contêiner Azure AI desconectado lida com a cobrança?",
    options: [
      "Não requer nenhuma cobrança — é completamente gratuito",
      "Usa uma licença pré-baixada vinculada a um plano de compromisso",
      "Armazena dados de cobrança localmente e faz upload quando reconectado",
      "Requer envio manual de fatura para a Microsoft"
    ],
    correctAnswer: 1,
    explanation: "Contêineres desconectados usam um arquivo de licença obtido por meio de um plano de compromisso. A licença é baixada inicialmente (requerendo conectividade), e então o contêiner opera offline pela duração do período do plano de compromisso."
  },
  {
    question: "Qual endpoint você pode usar para verificar se um contêiner Azure AI está saudável e pronto para aceitar requisições?",
    options: [
      "http://localhost:5000/health",
      "http://localhost:5000/status",
      "http://localhost:5000/api/ping",
      "http://localhost:5000/v1/ready"
    ],
    correctAnswer: 1,
    explanation: "Contêineres Azure AI expõem um endpoint /status que retorna o estado de saúde do contêiner, status de validação da API e prontidão para processar requisições."
  }
]} />

## Limpeza

```bash
# Stop and remove containers
docker stop language-detection sentiment-analysis language-disconnected 2>/dev/null
docker rm language-detection sentiment-analysis language-disconnected language-download-license 2>/dev/null

# Remove Docker volume
docker volume rm license-data 2>/dev/null

# Remove Azure resources
az group delete --name rg-ai102-challenge06 --yes --no-wait
```

## Saiba Mais

- [Install and run Azure AI containers](https://learn.microsoft.com/en-us/azure/ai-services/cognitive-services-container-support)
- [Use Docker containers in disconnected environments](https://learn.microsoft.com/en-us/azure/ai-services/containers/disconnected-containers)
- [Text Analytics container configuration](https://learn.microsoft.com/en-us/azure/ai-services/language-service/language-detection/how-to/use-containers)
- [Container requirements and recommendations](https://learn.microsoft.com/en-us/azure/ai-services/containers/container-reuse-recipe)
