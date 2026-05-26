---
sidebar_position: 3
title: "Desafio 02: Criar e Configurar Recursos do Azure AI"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 02: Criar e Configurar Recursos do Azure AI

:::info Tempo Estimado
**45 min** | **Custo**: ~$0.50 | **Domínio**: Planejar e Gerenciar Soluções de IA (20-25%)
:::

## Habilidades do exame cobertas
- Criar um recurso do Azure AI
- Escolher modelos de IA apropriados
- Determinar o endpoint padrão de um serviço
- Configurar acesso de rede para recursos do Azure AI
- Gerenciar chaves e proteger o acesso aos recursos

## Visão Geral

Criar e configurar recursos do Azure AI corretamente é a base de todo cenário do AI-102. Este desafio vai além de clicar em "Criar" no portal—você provisionará recursos programaticamente, configurará restrições de rede, recuperará e rotacionará chaves, e validará a conectividade do endpoint.

Entender a relação entre tipos de recursos, SKUs, endpoints e chaves é crítico. Um recurso multi-serviço expõe um único endpoint como `https://<region>.api.cognitive.microsoft.com/` enquanto recursos de serviço único podem ter padrões de endpoint específicos do serviço. Você precisa saber qual formato de endpoint cada serviço usa e como configurar regras de rede virtual e private endpoints para cargas de trabalho de produção.

Este desafio também cobre a configuração de definições de diagnóstico, nomes de subdomínio personalizados (necessários para autenticação Microsoft Entra), e a diferença entre endpoints regionais e personalizados.

## Arquitetura

Você criará recursos com subdomínios personalizados, configurará regras de rede, validará a conectividade e configurará logging de diagnóstico—simulando uma implantação de serviços de IA pronta para produção.

![Topologia do Desafio 02](/img/ai-102/challenge-02-topology.svg)

## Pré-requisitos
- Assinatura Azure com role de Contributor
- Azure CLI 2.50+ instalado
- Python 3.9+ com `pip` ou .NET 8 SDK
- Pacotes Python `azure-identity`, `azure-mgmt-cognitiveservices`

## Implementação

### Tarefa 1: Criar um Recurso com Subdomínio Personalizado

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient
from azure.mgmt.cognitiveservices.models import (
    Account, Sku, AccountProperties, NetworkRuleSet, NetworkRuleAction
)

credential = DefaultAzureCredential()
subscription_id = "YOUR_SUBSCRIPTION_ID"
client = CognitiveServicesManagementClient(credential, subscription_id)

# Create with custom subdomain (required for Entra ID auth)
account = client.accounts.begin_create(
    resource_group_name="rg-ai102-challenge02",
    account_name="ai102-mycompany-ai",
    account=Account(
        sku=Sku(name="S0"),
        kind="AIServices",
        location="eastus",
        properties=AccountProperties(
            custom_sub_domain_name="ai102-mycompany-ai",
            public_network_access="Enabled"
        )
    )
).result()

print(f"Resource: {account.name}")
print(f"Endpoint: {account.properties.endpoint}")
print(f"Custom domain: https://{account.properties.custom_sub_domain_name}.cognitiveservices.azure.com/")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.CognitiveServices;
using Azure.ResourceManager.CognitiveServices.Models;

var credential = new DefaultAzureCredential();
var client = new ArmClient(credential);

var subscription = await client.GetDefaultSubscriptionAsync();
var resourceGroup = await subscription
    .GetResourceGroupAsync("rg-ai102-challenge02");

var collection = resourceGroup.Value.GetCognitiveServicesAccounts();

// Custom subdomain enables Entra ID authentication
var data = new CognitiveServicesAccountData(Azure.Core.AzureLocation.EastUS)
{
    Kind = "CognitiveServices",
    Sku = new CognitiveServicesSku("S0"),
    Properties = new CognitiveServicesAccountProperties
    {
        CustomSubDomainName = "ai102-mycompany-ai",
        PublicNetworkAccess = ServiceAccountPublicNetworkAccess.Enabled
    }
};

var result = await collection.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "ai102-mycompany-ai", data);

Console.WriteLine($"Resource: {result.Value.Data.Name}");
Console.WriteLine($"Endpoint: {result.Value.Data.Properties.Endpoint}");
Console.WriteLine($"Custom: https://{result.Value.Data.Properties.CustomSubDomainName}.cognitiveservices.azure.com/");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Create resource group
az group create --name rg-ai102-challenge02 --location eastus

# Create multi-service resource with custom subdomain
az cognitiveservices account create \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --kind AIServices \
  --sku S0 \
  --location eastus \
  --custom-domain ai102-mycompany-ai \
  --yes

# Verify the endpoint
az cognitiveservices account show \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --query "{endpoint: properties.endpoint, customDomain: properties.customSubDomainName}" \
  -o json
```

</TabItem>
</Tabs>

### Tarefa 2: Recuperar e Gerenciar Chaves

<Tabs>
<TabItem value="python" label="Python SDK">

```python
# Retrieve access keys
keys = client.accounts.list_keys(
    resource_group_name="rg-ai102-challenge02",
    account_name="ai102-mycompany-ai"
)
print(f"Key 1: {keys.key1[:8]}...")
print(f"Key 2: {keys.key2[:8]}...")

# Regenerate key 1 (rotate without downtime using key 2)
from azure.mgmt.cognitiveservices.models import RegenerateKeyParameters, KeyName

new_keys = client.accounts.regenerate_key(
    resource_group_name="rg-ai102-challenge02",
    account_name="ai102-mycompany-ai",
    parameters=RegenerateKeyParameters(key_name=KeyName.KEY1)
)
print(f"New Key 1: {new_keys.key1[:8]}...")
print("Key 2 unchanged—zero-downtime rotation complete")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
var account = await collection.GetAsync("ai102-mycompany-ai");
var resource = account.Value;

// Get current keys
var keys = await resource.GetKeysAsync();
Console.WriteLine($"Key 1: {keys.Value.Key1[..8]}...");
Console.WriteLine($"Key 2: {keys.Value.Key2[..8]}...");

// Regenerate key 1
var regenerated = await resource.RegenerateKeyAsync(
    new RegenerateKeyContent(CognitiveServicesKeyName.Key1));
Console.WriteLine($"New Key 1: {regenerated.Value.Key1[..8]}...");
Console.WriteLine("Key 2 unchanged—zero-downtime rotation complete");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# List keys
az cognitiveservices account keys list \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  -o json

# Regenerate key1 (use key2 during rotation)
az cognitiveservices account keys regenerate \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --key-name key1

# Verify connectivity with the new key
ENDPOINT=$(az cognitiveservices account show \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --query "properties.endpoint" -o tsv)

KEY=$(az cognitiveservices account keys list \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --query "key1" -o tsv)

curl -s "${ENDPOINT}language/:analyze-text?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"kind":"LanguageDetection","parameters":{"modelVersion":"latest"},"analysisInput":{"documents":[{"id":"1","text":"Hello world"}]}}'
```

</TabItem>
</Tabs>

### Tarefa 3: Configurar Acesso de Rede

<Tabs>
<TabItem value="python" label="Python SDK">

```python
from azure.mgmt.cognitiveservices.models import (
    NetworkRuleSet, NetworkRuleAction, IpRule, VirtualNetworkRule
)

# Update resource with network restrictions
account = client.accounts.begin_create(
    resource_group_name="rg-ai102-challenge02",
    account_name="ai102-mycompany-ai",
    account=Account(
        sku=Sku(name="S0"),
        kind="AIServices",
        location="eastus",
        properties=AccountProperties(
            custom_sub_domain_name="ai102-mycompany-ai",
            public_network_access="Enabled",
            network_acls=NetworkRuleSet(
                default_action=NetworkRuleAction.DENY,
                ip_rules=[
                    IpRule(value="203.0.113.0/24"),  # Corporate IP range
                    IpRule(value="198.51.100.42")     # Developer IP
                ]
            )
        )
    )
).result()

print(f"Network rules applied: default action = Deny")
print(f"Allowed IPs: 203.0.113.0/24, 198.51.100.42")
print(f"Public access: {account.properties.public_network_access}")
```

</TabItem>
<TabItem value="csharp" label="C# SDK">

```csharp
// Update with network restrictions
var updateData = new CognitiveServicesAccountData(Azure.Core.AzureLocation.EastUS)
{
    Kind = "CognitiveServices",
    Sku = new CognitiveServicesSku("S0"),
    Properties = new CognitiveServicesAccountProperties
    {
        CustomSubDomainName = "ai102-mycompany-ai",
        PublicNetworkAccess = ServiceAccountPublicNetworkAccess.Enabled,
        NetworkAcls = new CognitiveServicesNetworkRuleSet
        {
            DefaultAction = CognitiveServicesNetworkRuleAction.Deny
        }
    }
};

// Add IP rules
updateData.Properties.NetworkAcls.IPRules.Add(
    new CognitiveServicesIPRule("203.0.113.0/24"));
updateData.Properties.NetworkAcls.IPRules.Add(
    new CognitiveServicesIPRule("198.51.100.42"));

var updated = await collection.CreateOrUpdateAsync(
    Azure.WaitUntil.Completed, "ai102-mycompany-ai", updateData);

Console.WriteLine("Network rules applied: default action = Deny");
Console.WriteLine($"IP rules count: {updated.Value.Data.Properties.NetworkAcls.IPRules.Count}");
```

</TabItem>
<TabItem value="rest" label="REST API">

```bash
# Configure network rules - deny all except specific IPs
az cognitiveservices account network-rule add \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --ip-address 203.0.113.0/24

az cognitiveservices account network-rule add \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --ip-address 198.51.100.42

# Set default action to deny
az cognitiveservices account update \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --default-action Deny

# Verify network rules
az cognitiveservices account network-rule list \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  -o table

# To completely disable public access (private endpoint only)
az cognitiveservices account update \
  --name ai102-mycompany-ai \
  --resource-group rg-ai102-challenge02 \
  --public-network-access Disabled
```

</TabItem>
</Tabs>

## Saída Esperada

```text
Resource: ai102-mycompany-ai
Endpoint: https://ai102-mycompany-ai.cognitiveservices.azure.com/
Custom domain: https://ai102-mycompany-ai.cognitiveservices.azure.com/

Key 1: a3f8b2c1...
Key 2: 7d9e4f6a...
New Key 1: x1y2z3w4...
Key 2 unchanged—zero-downtime rotation complete

Network rules applied: default action = Deny
Allowed IPs: 203.0.113.0/24, 198.51.100.42
Public access: Enabled
```

## Quebra & conserta

| Cenário | Sintoma | Causa Raiz | Correção |
|---------|---------|------------|----------|
| Conflito de subdomínio personalizado | Erro `SubdomainAlreadyInUse` | Outro recurso usa o mesmo subdomínio globalmente | Escolha um nome de subdomínio único |
| Rede bloqueada | `403 Forbidden` após aplicar regras | IP do cliente não está na lista de permissões | Adicione o IP do cliente às regras de rede ou use private endpoint |
| Rotação de chave quebra o app | `401 Unauthorized` após regeneração | App ainda usando a chave antiga | Atualize para a nova chave, ou use a Key 2 durante a rotação da Key 1 |
| Autenticação Entra falha | `401` com bearer token | Recurso sem subdomínio personalizado | Subdomínio personalizado é obrigatório para autenticação Microsoft Entra; recrie com `--custom-domain` |
| Formato de endpoint errado | `404 Not Found` | Usando formato de endpoint regional com recurso de subdomínio personalizado | Use o formato `https://<subdomain>.cognitiveservices.azure.com/` |

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Por que um nome de subdomínio personalizado é obrigatório ao usar autenticação Microsoft Entra ID (Azure AD) com serviços do Azure AI?",
    options: [
      "Subdomínios personalizados fornecem tempos de resposta mais rápidos através de cache CDN",
      "Subdomínios personalizados são necessários para configuração de CORS",
      "Tokens do Microsoft Entra só podem ser validados contra endpoints de domínio personalizado",
      "Endpoints regionais não suportam HTTPS para autenticação baseada em token"
    ],
    correctAnswer: 2,
    explanation: "A autenticação Microsoft Entra ID requer um subdomínio personalizado porque a validação de token está vinculada à URL única do endpoint. Endpoints regionais compartilhados (como eastus.api.cognitive.microsoft.com) suportam apenas autenticação baseada em chave."
  },
  {
    question: "Você precisa rotacionar as chaves de API de um recurso Azure AI em produção sem nenhum tempo de inatividade. Qual é o procedimento correto?",
    options: [
      "Regenerar ambas as chaves simultaneamente, depois atualizar todas as aplicações",
      "Usar managed identity em vez disso—a rotação de chaves sempre causa tempo de inatividade",
      "Criar um novo recurso, migrar o tráfego, depois excluir o recurso antigo",
      "Atualizar todos os apps para usar a Key 2, regenerar a Key 1, atualizar os apps para a Key 1, regenerar a Key 2"
    ],
    correctAnswer: 3,
    explanation: "O padrão de rotação de chaves sem tempo de inatividade é: trocar os apps para a Key 2, regenerar a Key 1, trocar os apps de volta para a Key 1, depois regenerar a Key 2. Isso garante que pelo menos uma chave válida esteja sempre em uso."
  },
  {
    question: "Qual é o formato de endpoint padrão para um recurso multi-serviço do Azure AI criado SEM um subdomínio personalizado?",
    options: [
      "https://<resource-name>.cognitiveservices.azure.com/",
      "https://<region>.api.cognitive.microsoft.com/",
      "https://<resource-name>.openai.azure.com/",
      "https://api.cognitive.microsoft.com/<resource-name>/"
    ],
    correctAnswer: 1,
    explanation: "Sem um subdomínio personalizado, recursos multi-serviço usam o formato de endpoint regional compartilhado: https://<region>.api.cognitive.microsoft.com/. O formato de endpoint específico do recurso requer que um subdomínio personalizado esteja configurado."
  },
  {
    question: "Você configura regras de rede no seu recurso Azure AI com a ação padrão definida como 'Deny'. Qual tráfego ainda é permitido?",
    options: [
      "Apenas tráfego de regras de IP configuradas, regras de VNet e private endpoints",
      "Todo o tráfego de dentro da mesma região do Azure",
      "Todo o tráfego de serviços Azure mais as regras configuradas",
      "Apenas tráfego do portal Azure e regras configuradas"
    ],
    correctAnswer: 0,
    explanation: "Quando a ação padrão é Deny, apenas o tráfego que corresponde a regras de IP explicitamente configuradas, regras de rede virtual ou private endpoints é permitido. O acesso ao portal Azure também requer que o IP do usuário esteja na lista de permissões."
  },
  {
    question: "Qual SKU você deve escolher para um recurso multi-serviço do Azure AI de desenvolvimento/teste para minimizar custos enquanto acessa todas as APIs de serviço?",
    options: [
      "F0 (Free tier) para desenvolvimento sem custo",
      "S1 para limites de taxa mais altos durante testes",
      "S0 (Standard tier) para recursos multi-serviço",
      "P1 (Premium) para acesso a todas as APIs"
    ],
    correctAnswer: 2,
    explanation: "Recursos multi-serviço (kind: AIServices) usam o SKU S0. Não existe F0 free tier para recursos multi-serviço—free tiers estão disponíveis apenas para recursos individuais de serviço único. S0 é o SKU padrão e único disponível para multi-serviço."
  }
]} />

## Limpeza

```bash
az group delete --name rg-ai102-challenge02 --yes --no-wait
```

## Saiba Mais
- [Create a multi-service resource](https://learn.microsoft.com/azure/ai-services/multi-service-resource)
- [Configure virtual networks](https://learn.microsoft.com/azure/ai-services/cognitive-services-virtual-networks)
- [Custom subdomain names](https://learn.microsoft.com/azure/ai-services/authentication#custom-subdomain-names)
- [Diagnostic logging](https://learn.microsoft.com/azure/ai-services/diagnostic-logging)
