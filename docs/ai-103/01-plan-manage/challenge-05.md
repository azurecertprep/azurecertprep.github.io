---
sidebar_position: 6
title: "Challenge 05: CI/CD for AI Solutions"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Challenge 05: CI/CD for AI Solutions

:::info Estimated Time
**60 min** | **Cost**: ~$0 (pipeline definition only) | **Domain**: Plan & Manage AI Solutions (15-20%)
:::

## Exam skills covered
- Integrate Azure AI services into a CI/CD pipeline
- Automate model deployment with infrastructure as code
- Implement automated testing for AI endpoints
- Manage model versioning and deployment strategies
- Configure environment-specific deployments (dev/staging/prod)

## Overview

Production AI solutions require the same CI/CD rigor as any other software system—automated testing, infrastructure as code, environment promotion, and rollback capabilities. The AI-103 exam tests your understanding of how to automate the deployment of Azure AI resources and models through pipelines.

This challenge covers the complete CI/CD lifecycle for Azure AI solutions: defining infrastructure with Bicep templates, deploying Azure OpenAI models through GitHub Actions, implementing smoke tests that validate AI endpoint availability, and managing environment-specific configurations. You'll build a pipeline that follows the pattern: **lint → deploy infrastructure → deploy model → smoke test**.

Key exam concepts include using service principals for pipeline authentication, managing secrets in GitHub Actions or Azure DevOps, understanding deployment slots and blue-green strategies for AI endpoints, and implementing health checks that verify model availability without consuming excessive tokens.

## Architecture

You'll create a complete CI/CD pipeline that provisions Azure AI infrastructure, deploys models, and validates the deployment—all triggered by code changes.

![Challenge 05 topology](/img/AI-103/challenge-05-topology.svg)

## Prerequisites
- GitHub repository with Actions enabled
- Azure subscription with a service principal (Contributor role)
- Azure CLI 2.50+ installed
- Familiarity with YAML pipeline syntax and Bicep

## Implementation

### Task 1: Define Infrastructure as Code with Bicep

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
    print("✓ Bicep template is valid")
else:
    print(f"✗ Validation failed: {result.stderr}")

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
    Console.WriteLine("✓ Bicep template is valid");
else
    Console.WriteLine($"✗ Validation failed: {await process.StandardError.ReadToEndAsync()}");
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

### Task 2: GitHub Actions Workflow for AI Deployment

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

print("✓ Generated .github/workflows/deploy-ai.yml")
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

Console.WriteLine("✓ Generated .github/workflows/deploy-ai.yml");
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

### Task 3: Implement Smoke Tests for AI Endpoints

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
    print(f"✓ Endpoint healthy: {endpoint}")
    print(f"✓ Model responded: {response.choices[0].message.content}")
    print(f"✓ Tokens used: {response.usage.total_tokens}")

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
    print(f"✓ Model version verified: {response.model}")

if __name__ == "__main__":
    try:
        test_endpoint_reachable()
        test_model_version()
        print("\n✓ All smoke tests passed!")
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ Smoke test failed: {e}")
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

    Console.WriteLine($"✓ Endpoint healthy: {endpoint}");
    Console.WriteLine($"✓ Model responded: {content}");
    Console.WriteLine($"✓ Tokens used: {tokens}");

    if (string.IsNullOrEmpty(content))
        throw new Exception("Empty response from model");
}
catch (Exception ex)
{
    Console.WriteLine($"✗ Smoke test failed: {ex.Message}");
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
    Console.WriteLine($"✓ Model version verified: {model}");

    if (!model.Contains("gpt-4o"))
        throw new Exception($"Unexpected model: {model}");
}
catch (Exception ex)
{
    Console.WriteLine($"✗ Model version test failed: {ex.Message}");
    Environment.Exit(1);
}

Console.WriteLine("\n✓ All smoke tests passed!");
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
  echo "✓ Endpoint healthy (HTTP 200)"
  echo "✓ Response: $(echo $BODY | python -c 'import json,sys; print(json.load(sys.stdin)["choices"][0]["message"]["content"])')"
else
  echo "✗ Endpoint unhealthy (HTTP ${HTTP_CODE})"
  echo "$BODY"
  exit 1
fi

# Test 2: Verify model name
MODEL=$(echo $BODY | python -c 'import json,sys; print(json.load(sys.stdin)["model"])')
if [[ "$MODEL" == *"gpt-4o"* ]]; then
  echo "✓ Model version verified: ${MODEL}"
else
  echo "✗ Unexpected model: ${MODEL}"
  exit 1
fi

echo ""
echo "✓ All smoke tests passed!"
```

</TabItem>
</Tabs>

## Expected Output

```text
✓ Bicep template is valid
✓ Generated .github/workflows/deploy-ai.yml

--- Pipeline Execution ---
Job: lint ✓
Job: deploy-infra ✓
  Output: endpoint = https://ai102-prod-openai.openai.azure.com/
  Output: deploymentName = gpt-4o-deploy
Job: smoke-test ✓
  ✓ Endpoint healthy: https://ai102-prod-openai.openai.azure.com/
  ✓ Model responded: OK
  ✓ Tokens used: 12
  ✓ Model version verified: gpt-4o-2024-08-06
  ✓ All smoke tests passed!
```

## Break & fix

| Scenario | Symptom | Root Cause | Fix |
|----------|---------|------------|-----|
| Federated identity fails | `AADSTS70021` in login step | Federated credential not configured for the repo/branch | Configure federated credential with correct subject (`repo:org/repo:ref:refs/heads/main`) |
| Deployment race condition | `Conflict` error on model deployment | Bicep deploying model before OpenAI resource is ready | Use `dependsOn` in Bicep (implicit via `parent` property) |
| Smoke test timeout | Test hangs after deploy | Model deployment still provisioning | Add wait/retry loop in smoke test with exponential backoff |
| Secret not available | `Login failed` in pipeline | GitHub secret name mismatch or not set | Verify secret names in repo Settings → Secrets match workflow references |
| Bicep lint warning | Pipeline fails on lint | Using deprecated API version in Bicep | Update `@2024-10-01` to latest stable API version |

## Knowledge Check

<KnowledgeCheck questions={[
  {
    question: "What is the recommended authentication method for GitHub Actions to deploy Azure AI resources?",
    options: [
      "Store Azure CLI credentials as a GitHub secret",
      "Use a service principal with client secret stored in secrets",
      "Use OpenID Connect (OIDC) with federated credentials and managed identity",
      "Use a personal access token with Azure permissions"
    ],
    correctAnswer: 2,
    explanation: "OpenID Connect (OIDC) with federated credentials is the recommended approach—it eliminates secret storage entirely. GitHub issues a short-lived token that Azure trusts via the federated identity credential, requiring no stored secrets to rotate."
  },
  {
    question: "In a CI/CD pipeline deploying Azure OpenAI models, what should the smoke test validate?",
    options: [
      "That the model achieves at least 90% accuracy on a test dataset",
      "That the endpoint is reachable and returns a valid response with expected model version",
      "That the model can handle 1000 concurrent requests without errors",
      "That the model produces identical outputs to the previous version"
    ],
    correctAnswer: 1,
    explanation: "Smoke tests verify basic functionality—endpoint reachability, valid responses, and correct model version. They should be fast and use minimal tokens. Load testing and accuracy benchmarks belong in separate, dedicated test stages."
  },
  {
    question: "How should you manage environment-specific configurations (dev/staging/prod) for Azure AI deployments in a pipeline?",
    options: [
      "Use separate Bicep templates for each environment",
      "Use Git branches—one branch per environment with different templates",
      "Hard-code environment values in the workflow YAML",
      "Use parameter files (e.g., params.dev.json, params.prod.json) with the same template"
    ],
    correctAnswer: 3,
    explanation: "Parameter files keep infrastructure DRY—one template with environment-specific parameter files. This ensures consistency across environments while allowing different capacities, SKUs, and configurations per stage."
  },
  {
    question: "What Bicep resource property ensures a model deployment waits for its parent Azure OpenAI account to be created first?",
    options: [
      "The parent property on the deployment resource that references the account",
      "An explicit dependsOn array referencing the account resource",
      "A deployment script that checks account existence before deploying",
      "Setting the deployment in a separate Bicep module with a dependency"
    ],
    correctAnswer: 0,
    explanation: "In Bicep, using the 'parent' property (e.g., parent: openai) on a child resource automatically creates an implicit dependency. The deployment won't begin until the parent account is successfully provisioned. Explicit dependsOn is unnecessary when parent is used."
  },
  {
    question: "Your pipeline deploys a new model version but the smoke test fails. What should the pipeline do?",
    options: [
      "Immediately delete the resource group and alert the team",
      "Continue the pipeline and mark the deployment as degraded",
      "Automatically rollback to the previous model version using a pipeline rollback step",
      "Retry the smoke test 10 times before failing"
    ],
    correctAnswer: 2,
    explanation: "A well-designed pipeline should automatically rollback on smoke test failure—redeploying the previous known-good model version. This can be achieved with a conditional rollback job triggered on smoke-test failure, using the previous Bicep parameters."
  }
]} />

## Cleanup

```bash
# No Azure resources to clean up (pipeline definitions only)
# If you deployed the infrastructure for testing:
az group delete --name rg-ai102-challenge05 --yes --no-wait
```

## Learn More
- [GitHub Actions for Azure](https://learn.microsoft.com/azure/developer/github/github-actions)
- [Azure/login action with OIDC](https://learn.microsoft.com/azure/developer/github/connect-from-azure)
- [Bicep for Cognitive Services](https://learn.microsoft.com/azure/templates/microsoft.cognitiveservices/accounts)
- [Azure DevOps pipelines for AI](https://learn.microsoft.com/azure/machine-learning/how-to-devops-machine-learning)
- [Deployment environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
