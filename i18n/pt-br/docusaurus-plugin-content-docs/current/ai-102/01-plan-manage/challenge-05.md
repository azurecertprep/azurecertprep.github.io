---
sidebar_position: 6
title: "CI/CD para SoluÃ§Ãµes de IA"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 05: CI/CD para SoluÃ§Ãµes de IA

:::info Tempo Estimado
**60 min** | **Custo**: ~$0 (apenas definiÃ§Ã£o de pipeline) | **DomÃ­nio**: Planejar e Gerenciar SoluÃ§Ãµes de IA (20-25%)
:::

## Habilidades do exame cobertas
- Integrar Azure AI services em um pipeline de CI/CD
- Automatizar a implantaÃ§Ã£o de modelos com infraestrutura como cÃ³digo
- Implementar testes automatizados para endpoints de IA
- Gerenciar versionamento de modelos e estratÃ©gias de implantaÃ§Ã£o
- Configurar implantaÃ§Ãµes especÃ­ficas por ambiente (dev/staging/prod)

## VisÃ£o Geral

SoluÃ§Ãµes de IA em produÃ§Ã£o requerem o mesmo rigor de CI/CD que qualquer outro sistema de softwareâ€”testes automatizados, infraestrutura como cÃ³digo, promoÃ§Ã£o entre ambientes e capacidades de rollback. O exame AI-102 testa seu entendimento sobre como automatizar a implantaÃ§Ã£o de recursos e modelos Azure AI atravÃ©s de pipelines.

Este desafio cobre o ciclo de vida completo de CI/CD para soluÃ§Ãµes Azure AI: definir infraestrutura com templates Bicep, implantar modelos Azure OpenAI atravÃ©s de GitHub Actions, implementar smoke tests que validam a disponibilidade do endpoint de IA e gerenciar configuraÃ§Ãµes especÃ­ficas por ambiente. VocÃª construirÃ¡ um pipeline que segue o padrÃ£o: **lint â†’ implantar infraestrutura â†’ implantar modelo â†’ smoke test**.

Conceitos-chave do exame incluem o uso de service principals para autenticaÃ§Ã£o de pipelines, gerenciamento de segredos no GitHub Actions ou Azure DevOps, entendimento de deployment slots e estratÃ©gias blue-green para endpoints de IA, e implementaÃ§Ã£o de health checks que verificam a disponibilidade do modelo sem consumir tokens excessivos.

## Arquitetura

VocÃª criarÃ¡ um pipeline de CI/CD completo que provisiona infraestrutura Azure AI, implanta modelos e valida a implantaÃ§Ã£oâ€”tudo acionado por mudanÃ§as no cÃ³digo.

![Challenge 05 topology](/img/ai-102/challenge-05-topology.svg)

## PrÃ©-requisitos
- RepositÃ³rio GitHub com Actions habilitado
- Assinatura Azure com um service principal (role Contributor)
- Azure CLI 2.50+ instalado
- Familiaridade com sintaxe YAML de pipelines e Bicep

## ImplementaÃ§Ã£o

### Tarefa 1: Definir Infraestrutura como CÃ³digo com Bicep

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# generate_bicep.py - Generate and validate Bicep template programmatically
import subprocess
import json
import os

# Bicep template content for Azure OpenAI with deployment
bicep_template = """
targetScope = 'resourceGroup'

@description('Base name for all resources')
param baseName string

@description('Location for resources')
param location string = resourceGroup().location

@description('OpenAI model name')
param modelName string = 'gpt-4o'

@description('Model version')
param modelVersion string = '2024-08-06'

@description('Deployment capacity in thousands of TPM')
param capacityTPM int = 30

resource openai 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: '${baseName}-openai'
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: '${baseName}-openai'
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

resource deployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openai
  name: '${modelName}-deploy'
  sku: {
    name: 'Standard'
    capacity: capacityTPM
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: modelName
      version: modelVersion
    }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}

output endpoint string = openai.properties.endpoint
output resourceId string = openai.id
output deploymentName string = deployment.name
"""

# Write Bicep template
os.makedirs("infra", exist_ok=True)
with open("infra/main.bicep", "w") as f:
    f.write(bicep_template)

# Validate the template
result = subprocess.run(
    ["az", "bicep", "build", "--file", "infra/main.bicep"],
    capture_output=True, text=True
)

if result.returncode == 0:
    print("âœ“ Bicep template is valid")
else:
    print(f"âœ— Validation failed: {result.stderr}")

# Run what-if deployment
result = subprocess.run(
    ["az", "deployment", "group", "what-if",
     "--resource-group", "rg-ai102-challenge05",
     "--template-file", "infra/main.bicep",
     "--parameters", "baseName=ai102-cicd"],
    capture_output=True, text=True
)
print(result.stdout)
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// Program.cs - Validate and deploy Bicep from C#
using System.Diagnostics;

// Bicep template for Azure OpenAI
var bicepContent = """
targetScope = 'resourceGroup'

@description('Base name for all resources')
param baseName string

@description('Location for resources')
param location string = resourceGroup().location

@description('OpenAI model name')
param modelName string = 'gpt-4o'

@description('Model version')
param modelVersion string = '2024-08-06'

@description('Deployment capacity in thousands of TPM')
param capacityTPM int = 30

resource openai 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: '${baseName}-openai'
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: '${baseName}-openai'
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

resource deployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openai
  name: '${modelName}-deploy'
  sku: {
    name: 'Standard'
    capacity: capacityTPM
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: modelName
      version: modelVersion
    }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}

output endpoint string = openai.properties.endpoint
output resourceId string = openai.id
output deploymentName string = deployment.name
""";

Directory.CreateDirectory("infra");
await File.WriteAllTextAsync("infra/main.bicep", bicepContent);

// Validate using Azure CLI
var process = Process.Start(new ProcessStartInfo
{
    FileName = "az",
    Arguments = "bicep build --file infra/main.bicep",
    RedirectStandardOutput = true,
    RedirectStandardError = true,
    UseShellExecute = false
});
await process!.WaitForExitAsync();

if (process.ExitCode == 0)
    Console.WriteLine("âœ“ Bicep template is valid");
else
    Console.WriteLine($"âœ— Validation failed: {await process.StandardError.ReadToEndAsync()}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# infra/main.bicep - Save this as your infrastructure template
cat > infra/main.bicep << 'EOF'
targetScope = 'resourceGroup'

@description('Base name for all resources')
param baseName string

@description('Location for resources')
param location string = resourceGroup().location

@description('OpenAI model name')
param modelName string = 'gpt-4o'

@description('Model version')
param modelVersion string = '2024-08-06'

@description('Deployment capacity in thousands of TPM')
param capacityTPM int = 30

resource openai 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: '${baseName}-openai'
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: '${baseName}-openai'
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

resource deployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openai
  name: '${modelName}-deploy'
  sku: {
    name: 'Standard'
    capacity: capacityTPM
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: modelName
      version: modelVersion
    }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}

output endpoint string = openai.properties.endpoint
output resourceId string = openai.id
output deploymentName string = deployment.name
EOF

# Validate the template
az bicep build --file infra/main.bicep

# Preview deployment (what-if)
az deployment group what-if \
  --resource-group rg-ai102-challenge05 \
  --template-file infra/main.bicep \
  --parameters baseName=ai102-cicd

# Deploy
az deployment group create \
  --resource-group rg-ai102-challenge05 \
  --template-file infra/main.bicep \
  --parameters baseName=ai102-cicd \
  --query "properties.outputs" -o json
```

</TabItem>
</Tabs>

### Tarefa 2: Workflow do GitHub Actions para ImplantaÃ§Ã£o de IA

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# generate_workflow.py - Create GitHub Actions workflow programmatically
import os
import yaml

workflow = {
    "name": "Deploy Azure AI Solution",
    "on": {
        "push": {"branches": ["main"]},
        "pull_request": {"branches": ["main"]},
        "workflow_dispatch": {}
    },
    "env": {
        "AZURE_RESOURCE_GROUP": "rg-ai102-prod",
        "BASE_NAME": "ai102-prod",
        "LOCATION": "eastus2"
    },
    "permissions": {
        "id-token": "write",
        "contents": "read"
    },
    "jobs": {
        "lint": {
            "runs-on": "ubuntu-latest",
            "steps": [
                {"uses": "actions/checkout@v4"},
                {
                    "name": "Lint Bicep",
                    "uses": "azure/CLI@v2",
                    "with": {
                        "inlineScript": "az bicep build --file infra/main.bicep"
                    }
                }
            ]
        },
        "deploy-infra": {
            "needs": "lint",
            "runs-on": "ubuntu-latest",
            "if": "github.ref == 'refs/heads/main'",
            "steps": [
                {"uses": "actions/checkout@v4"},
                {
                    "name": "Azure Login",
                    "uses": "azure/login@v2",
                    "with": {
                        "client-id": "${{ secrets.AZURE_CLIENT_ID }}",
                        "tenant-id": "${{ secrets.AZURE_TENANT_ID }}",
                        "subscription-id": "${{ secrets.AZURE_SUBSCRIPTION_ID }}"
                    }
                },
                {
                    "name": "Deploy Infrastructure",
                    "uses": "azure/arm-deploy@v2",
                    "with": {
                        "resourceGroupName": "${{ env.AZURE_RESOURCE_GROUP }}",
                        "template": "./infra/main.bicep",
                        "parameters": "baseName=${{ env.BASE_NAME }}",
                        "failOnStdErr": "false"
                    },
                    "id": "deploy"
                }
            ],
            "outputs": {
                "endpoint": "${{ steps.deploy.outputs.endpoint }}",
                "deploymentName": "${{ steps.deploy.outputs.deploymentName }}"
            }
        },
        "smoke-test": {
            "needs": "deploy-infra",
            "runs-on": "ubuntu-latest",
            "steps": [
                {"uses": "actions/checkout@v4"},
                {
                    "name": "Azure Login",
                    "uses": "azure/login@v2",
                    "with": {
                        "client-id": "${{ secrets.AZURE_CLIENT_ID }}",
                        "tenant-id": "${{ secrets.AZURE_TENANT_ID }}",
                        "subscription-id": "${{ secrets.AZURE_SUBSCRIPTION_ID }}"
                    }
                },
                {
                    "name": "Run Smoke Tests",
                    "run": "python tests/smoke_test.py",
                    "env": {
                        "AZURE_OPENAI_ENDPOINT": "${{ needs.deploy-infra.outputs.endpoint }}",
                        "DEPLOYMENT_NAME": "${{ needs.deploy-infra.outputs.deploymentName }}"
                    }
                }
            ]
        }
    }
}

os.makedirs(".github/workflows", exist_ok=True)
with open(".github/workflows/deploy-ai.yml", "w") as f:
    yaml.dump(workflow, f, default_flow_style=False, sort_keys=False)

print("âœ“ Generated .github/workflows/deploy-ai.yml")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// GenerateWorkflow.cs - Create the GitHub Actions YAML
var workflowYaml = """
name: Deploy Azure AI Solution

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

env:
  AZURE_RESOURCE_GROUP: rg-ai102-prod
  BASE_NAME: ai102-prod
  LOCATION: eastus2

permissions:
  id-token: write
  contents: read

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint Bicep
        uses: azure/CLI@v2
        with:
          inlineScript: az bicep build --file infra/main.bicep

  deploy-infra:
    needs: lint
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    outputs:
      endpoint: ${{ steps.deploy.outputs.endpoint }}
      deploymentName: ${{ steps.deploy.outputs.deploymentName }}
    steps:
      - uses: actions/checkout@v4
      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - name: Deploy Infrastructure
        id: deploy
        uses: azure/arm-deploy@v2
        with:
          resourceGroupName: ${{ env.AZURE_RESOURCE_GROUP }}
          template: ./infra/main.bicep
          parameters: baseName=${{ env.BASE_NAME }}
          failOnStdErr: false

  smoke-test:
    needs: deploy-infra
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - name: Install dependencies
        run: pip install openai azure-identity
      - name: Run Smoke Tests
        run: python tests/smoke_test.py
        env:
          AZURE_OPENAI_ENDPOINT: ${{ needs.deploy-infra.outputs.endpoint }}
          DEPLOYMENT_NAME: ${{ needs.deploy-infra.outputs.deploymentName }}
""";

Directory.CreateDirectory(Path.Combine(".github", "workflows"));
await File.WriteAllTextAsync(
    Path.Combine(".github", "workflows", "deploy-ai.yml"), workflowYaml);

Console.WriteLine("âœ“ Generated .github/workflows/deploy-ai.yml");
```

</TabItem>
<TabItem value="rest" label="REST API">

```yaml
# .github/workflows/deploy-ai.yml
name: Deploy Azure AI Solution

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

env:
  AZURE_RESOURCE_GROUP: rg-ai102-prod
  BASE_NAME: ai102-prod
  LOCATION: eastus2

permissions:
  id-token: write
  contents: read

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint Bicep
        uses: azure/CLI@v2
        with:
          inlineScript: az bicep build --file infra/main.bicep

  deploy-infra:
    needs: lint
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    outputs:
      endpoint: ${{ steps.deploy.outputs.endpoint }}
      deploymentName: ${{ steps.deploy.outputs.deploymentName }}
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy Infrastructure
        id: deploy
        uses: azure/arm-deploy@v2
        with:
          resourceGroupName: ${{ env.AZURE_RESOURCE_GROUP }}
          template: ./infra/main.bicep
          parameters: baseName=${{ env.BASE_NAME }}
          failOnStdErr: false

  smoke-test:
    needs: deploy-infra
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Install dependencies
        run: pip install openai azure-identity

      - name: Run Smoke Tests
        run: python tests/smoke_test.py
        env:
          AZURE_OPENAI_ENDPOINT: ${{ needs.deploy-infra.outputs.endpoint }}
          DEPLOYMENT_NAME: ${{ needs.deploy-infra.outputs.deploymentName }}
```

</TabItem>
</Tabs>

### Tarefa 3: Implementar Smoke Tests para Endpoints de IA

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# tests/smoke_test.py - Validate AI endpoint after deployment
import os
import sys
from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

def test_endpoint_reachable():
    """Verify the OpenAI endpoint responds."""
    endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
    deployment = os.environ["DEPLOYMENT_NAME"]

    # Use managed identity in CI/CD (no keys in pipeline)
    credential = DefaultAzureCredential()
    token_provider = get_bearer_token_provider(
        credential, "https://cognitiveservices.azure.com/.default"
    )

    client = AzureOpenAI(
        azure_endpoint=endpoint,
        azure_ad_token_provider=token_provider,
        api_version="2024-10-21"
    )

    # Minimal token usage smoke test
    response = client.chat.completions.create(
        model=deployment,
        messages=[{"role": "user", "content": "Reply with OK"}],
        max_tokens=5
    )

    assert response.choices[0].message.content is not None
    assert response.usage.total_tokens > 0
    print(f"âœ“ Endpoint healthy: {endpoint}")
    print(f"âœ“ Model responded: {response.choices[0].message.content}")
    print(f"âœ“ Tokens used: {response.usage.total_tokens}")

def test_model_version():
    """Verify the expected model version is deployed."""
    endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
    deployment = os.environ["DEPLOYMENT_NAME"]

    credential = DefaultAzureCredential()
    token_provider = get_bearer_token_provider(
        credential, "https://cognitiveservices.azure.com/.default"
    )

    client = AzureOpenAI(
        azure_endpoint=endpoint,
        azure_ad_token_provider=token_provider,
        api_version="2024-10-21"
    )

    response = client.chat.completions.create(
        model=deployment,
        messages=[{"role": "user", "content": "Hi"}],
        max_tokens=1
    )

    # Verify model identifier matches expected deployment
    assert "gpt-4o" in response.model
    print(f"âœ“ Model version verified: {response.model}")

if __name__ == "__main__":
    try:
        test_endpoint_reachable()
        test_model_version()
        print("\nâœ“ All smoke tests passed!")
        sys.exit(0)
    except Exception as e:
        print(f"\nâœ— Smoke test failed: {e}")
        sys.exit(1)
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// tests/SmokeTest.cs - Validate AI endpoint after deployment
using Azure.Identity;
using Azure.AI.OpenAI;
using OpenAI.Chat;

var endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!;
var deploymentName = Environment.GetEnvironmentVariable("DEPLOYMENT_NAME")!;

// Use managed identity (no keys in CI/CD)
var credential = new DefaultAzureCredential();
var client = new AzureOpenAIClient(new Uri(endpoint), credential);
var chatClient = client.GetChatClient(deploymentName);

// Test 1: Endpoint reachable
try
{
    var response = await chatClient.CompleteChatAsync(
        new[] { new UserChatMessage("Reply with OK") },
        new ChatCompletionOptions { MaxOutputTokenCount = 5 }
    );

    var content = response.Value.Content[0].Text;
    var tokens = response.Value.Usage.TotalTokenCount;

    Console.WriteLine($"âœ“ Endpoint healthy: {endpoint}");
    Console.WriteLine($"âœ“ Model responded: {content}");
    Console.WriteLine($"âœ“ Tokens used: {tokens}");

    if (string.IsNullOrEmpty(content))
        throw new Exception("Empty response from model");
}
catch (Exception ex)
{
    Console.WriteLine($"âœ— Smoke test failed: {ex.Message}");
    Environment.Exit(1);
}

// Test 2: Model version
try
{
    var response = await chatClient.CompleteChatAsync(
        new[] { new UserChatMessage("Hi") },
        new ChatCompletionOptions { MaxOutputTokenCount = 1 }
    );

    var model = response.Value.Model;
    Console.WriteLine($"âœ“ Model version verified: {model}");

    if (!model.Contains("gpt-4o"))
        throw new Exception($"Unexpected model: {model}");
}
catch (Exception ex)
{
    Console.WriteLine($"âœ— Model version test failed: {ex.Message}");
    Environment.Exit(1);
}

Console.WriteLine("\nâœ“ All smoke tests passed!");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
#!/bin/bash
# tests/smoke_test.sh - Validate AI endpoint after deployment

ENDPOINT="${AZURE_OPENAI_ENDPOINT}"
DEPLOYMENT="${DEPLOYMENT_NAME}"

# Get token using managed identity (CI/CD environment)
TOKEN=$(az account get-access-token \
  --resource "https://cognitiveservices.azure.com" \
  --query "accessToken" -o tsv)

echo "Testing endpoint: ${ENDPOINT}"
echo "Testing deployment: ${DEPLOYMENT}"

# Test 1: Endpoint responds
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${ENDPOINT}openai/deployments/${DEPLOYMENT}/chat/completions?api-version=2024-10-21" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Reply with OK"}],"max_tokens":5}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "âœ“ Endpoint healthy (HTTP 200)"
  echo "âœ“ Response: $(echo $BODY | python -c 'import json,sys; print(json.load(sys.stdin)["choices"][0]["message"]["content"])')"
else
  echo "âœ— Endpoint unhealthy (HTTP ${HTTP_CODE})"
  echo "$BODY"
  exit 1
fi

# Test 2: Verify model name
MODEL=$(echo $BODY | python -c 'import json,sys; print(json.load(sys.stdin)["model"])')
if [[ "$MODEL" == *"gpt-4o"* ]]; then
  echo "âœ“ Model version verified: ${MODEL}"
else
  echo "âœ— Unexpected model: ${MODEL}"
  exit 1
fi

echo ""
echo "âœ“ All smoke tests passed!"
```

</TabItem>
</Tabs>

## SaÃ­da Esperada

```text
âœ“ Bicep template is valid
âœ“ Generated .github/workflows/deploy-ai.yml

--- Pipeline Execution ---
Job: lint âœ“
Job: deploy-infra âœ“
  Output: endpoint = https://ai102-prod-openai.openai.azure.com/
  Output: deploymentName = gpt-4o-deploy
Job: smoke-test âœ“
  âœ“ Endpoint healthy: https://ai102-prod-openai.openai.azure.com/
  âœ“ Model responded: OK
  âœ“ Tokens used: 12
  âœ“ Model version verified: gpt-4o-2024-08-06
  âœ“ All smoke tests passed!
```

## Quebra & conserta

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| Identidade federada falha | `AADSTS70021` no passo de login | Credencial federada nÃ£o configurada para o repo/branch | Configure a credencial federada com o subject correto (`repo:org/repo:ref:refs/heads/main`) |
| CondiÃ§Ã£o de corrida na implantaÃ§Ã£o | Erro `Conflict` na implantaÃ§Ã£o do modelo | Bicep implantando modelo antes do recurso Azure OpenAI estar pronto | Use `dependsOn` no Bicep (implÃ­cito via propriedade `parent`) |
| Timeout no smoke test | Teste trava apÃ³s deploy | ImplantaÃ§Ã£o do modelo ainda provisionando | Adicione loop de espera/retry no smoke test com backoff exponencial |
| Segredo nÃ£o disponÃ­vel | `Login failed` no pipeline | Nome do segredo no GitHub nÃ£o corresponde ou nÃ£o estÃ¡ configurado | Verifique se os nomes dos segredos em Settings â†’ Secrets do repo correspondem Ã s referÃªncias no workflow |
| Aviso de lint no Bicep | Pipeline falha no lint | Usando versÃ£o de API obsoleta no Bicep | Atualize `@2024-10-01` para a versÃ£o estÃ¡vel mais recente da API |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual Ã© o mÃ©todo de autenticaÃ§Ã£o recomendado para GitHub Actions implantar recursos Azure AI?",
    options: [
      "Armazenar credenciais do Azure CLI como segredo do GitHub",
      "Usar um service principal com client secret armazenado em secrets",
      "Usar OpenID Connect (OIDC) com credenciais federadas e managed identity",
      "Usar um personal access token com permissÃµes Azure"
    ],
    correctAnswer: 2,
    explanation: "OpenID Connect (OIDC) com credenciais federadas Ã© a abordagem recomendadaâ€”elimina completamente o armazenamento de segredos. O GitHub emite um token de curta duraÃ§Ã£o que o Azure confia via credencial de identidade federada, sem necessidade de segredos armazenados para rotacionar."
  },
  {
    question: "Em um pipeline de CI/CD que implanta modelos Azure OpenAI, o que o smoke test deve validar?",
    options: [
      "Que o modelo atinge pelo menos 90% de acurÃ¡cia em um dataset de teste",
      "Que o endpoint estÃ¡ acessÃ­vel e retorna uma resposta vÃ¡lida com a versÃ£o esperada do modelo",
      "Que o modelo pode lidar com 1000 requisiÃ§Ãµes simultÃ¢neas sem erros",
      "Que o modelo produz saÃ­das idÃªnticas Ã  versÃ£o anterior"
    ],
    correctAnswer: 1,
    explanation: "Smoke tests verificam funcionalidade bÃ¡sicaâ€”acessibilidade do endpoint, respostas vÃ¡lidas e versÃ£o correta do modelo. Devem ser rÃ¡pidos e usar o mÃ­nimo de tokens. Testes de carga e benchmarks de acurÃ¡cia pertencem a estÃ¡gios de teste separados e dedicados."
  },
  {
    question: "Como vocÃª deve gerenciar configuraÃ§Ãµes especÃ­ficas por ambiente (dev/staging/prod) para implantaÃ§Ãµes Azure AI em um pipeline?",
    options: [
      "Usar templates Bicep separados para cada ambiente",
      "Usar branches Gitâ€”um branch por ambiente com templates diferentes",
      "Codificar valores de ambiente diretamente no YAML do workflow",
      "Usar arquivos de parÃ¢metros (ex: params.dev.json, params.prod.json) com o mesmo template"
    ],
    correctAnswer: 3,
    explanation: "Arquivos de parÃ¢metros mantÃªm a infraestrutura DRYâ€”um template com arquivos de parÃ¢metros especÃ­ficos por ambiente. Isso garante consistÃªncia entre ambientes enquanto permite diferentes capacidades, SKUs e configuraÃ§Ãµes por estÃ¡gio."
  },
  {
    question: "Qual propriedade de recurso Bicep garante que uma implantaÃ§Ã£o de modelo espere a criaÃ§Ã£o da conta Azure OpenAI pai primeiro?",
    options: [
      "A propriedade parent no recurso de implantaÃ§Ã£o que referencia a conta",
      "Um array dependsOn explÃ­cito referenciando o recurso da conta",
      "Um deployment script que verifica a existÃªncia da conta antes de implantar",
      "Colocar a implantaÃ§Ã£o em um mÃ³dulo Bicep separado com uma dependÃªncia"
    ],
    correctAnswer: 0,
    explanation: "No Bicep, usar a propriedade 'parent' (ex: parent: openai) em um recurso filho cria automaticamente uma dependÃªncia implÃ­cita. A implantaÃ§Ã£o nÃ£o comeÃ§arÃ¡ atÃ© que a conta pai seja provisionada com sucesso. O dependsOn explÃ­cito Ã© desnecessÃ¡rio quando parent Ã© usado."
  },
  {
    question: "Seu pipeline implanta uma nova versÃ£o do modelo mas o smoke test falha. O que o pipeline deve fazer?",
    options: [
      "Deletar imediatamente o resource group e alertar a equipe",
      "Continuar o pipeline e marcar a implantaÃ§Ã£o como degradada",
      "Fazer rollback automaticamente para a versÃ£o anterior do modelo usando um passo de rollback no pipeline",
      "Tentar o smoke test novamente 10 vezes antes de falhar"
    ],
    correctAnswer: 2,
    explanation: "Um pipeline bem projetado deve fazer rollback automaticamente em caso de falha no smoke testâ€”reimplantando a versÃ£o anterior conhecida e funcional do modelo. Isso pode ser alcanÃ§ado com um job de rollback condicional acionado na falha do smoke-test, usando os parÃ¢metros Bicep anteriores."
  }
]} />

## Limpeza

```bash
# No Azure resources to clean up (pipeline definitions only)
# If you deployed the infrastructure for testing:
az group delete --name rg-ai102-challenge05 --yes --no-wait
```

## Saiba Mais
- [GitHub Actions for Azure](https://learn.microsoft.com/azure/developer/github/github-actions)
- [Azure/login action with OIDC](https://learn.microsoft.com/azure/developer/github/connect-from-azure)
- [Bicep for Cognitive Services](https://learn.microsoft.com/azure/templates/microsoft.cognitiveservices/accounts)
- [Azure DevOps pipelines for AI](https://learn.microsoft.com/azure/machine-learning/how-to-devops-machine-learning)
- [Deployment environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
