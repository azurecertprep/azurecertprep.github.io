---
sidebar_position: 3
title: "Desafio 02: Criar e Configurar Recursos do Azure AI"
---

import KnowledgeCheck from '@site/src/components/KnowledgeCheck';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 02: Criar e Configurar Recursos do Azure AI

:::info Tempo Estimado
**45 min** | **Custo**: ~$0.50 | **DomÃ­nio**: Planejar e Gerenciar SoluÃ§Ãµes de IA (20-25%)
:::

## Habilidades do exame cobertas
- Criar um recurso do Azure AI
- Escolher modelos de IA apropriados
- Determinar o endpoint padrÃ£o de um serviÃ§o
- Configurar acesso de rede para recursos do Azure AI
- Gerenciar chaves e proteger o acesso aos recursos

## VisÃ£o Geral

Criar e configurar recursos do Azure AI corretamente Ã© a base de todo cenÃ¡rio do AI-102. Este desafio vai alÃ©m de clicar em "Criar" no portalâ€”vocÃª provisionarÃ¡ recursos programaticamente, configurarÃ¡ restriÃ§Ãµes de rede, recuperarÃ¡ e rotacionarÃ¡ chaves, e validarÃ¡ a conectividade do endpoint.

Entender a relaÃ§Ã£o entre tipos de recursos, SKUs, endpoints e chaves Ã© crÃ­tico. Um recurso multi-serviÃ§o expÃµe um Ãºnico endpoint como `https://<region>.api.cognitive.microsoft.com/` enquanto recursos de serviÃ§o Ãºnico podem ter padrÃµes de endpoint especÃ­ficos do serviÃ§o. VocÃª precisa saber qual formato de endpoint cada serviÃ§o usa e como configurar regras de rede virtual e private endpoints para cargas de trabalho de produÃ§Ã£o.

Este desafio tambÃ©m cobre a configuraÃ§Ã£o de definiÃ§Ãµes de diagnÃ³stico, nomes de subdomÃ­nio personalizados (necessÃ¡rios para autenticaÃ§Ã£o Microsoft Entra), e a diferenÃ§a entre endpoints regionais e personalizados.

## Arquitetura

VocÃª criarÃ¡ recursos com subdomÃ­nios personalizados, configurarÃ¡ regras de rede, validarÃ¡ a conectividade e configurarÃ¡ logging de diagnÃ³sticoâ€”simulando uma implantaÃ§Ã£o de serviÃ§os de IA pronta para produÃ§Ã£o.

![Topologia do Desafio 02](/img/ai-102/challenge-02-topology.svg)

## PrÃ©-requisitos
- Assinatura Azure com role de Contributor
- Azure CLI 2.50+ instalado
- Python 3.9+ com `pip` ou .NET 8 SDK
- Pacotes Python `azure-identity`, `azure-mgmt-cognitiveservices`

## ImplementaÃ§Ã£o

### Tarefa 1: Criar um Recurso com SubdomÃ­nio Personalizado

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
print("Key 2 unchangedâ€”zero-downtime rotation complete")
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
Console.WriteLine("Key 2 unchangedâ€”zero-downtime rotation complete");
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

## SaÃ­da Esperada

```text
Resource: ai102-mycompany-ai
Endpoint: https://ai102-mycompany-ai.cognitiveservices.azure.com/
Custom domain: https://ai102-mycompany-ai.cognitiveservices.azure.com/

Key 1: a3f8b2c1...
Key 2: 7d9e4f6a...
New Key 1: x1y2z3w4...
Key 2 unchangedâ€”zero-downtime rotation complete

Network rules applied: default action = Deny
Allowed IPs: 203.0.113.0/24, 198.51.100.42
Public access: Enabled
```

## Quebra & conserta

| CenÃ¡rio | Sintoma | Causa Raiz | CorreÃ§Ã£o |
|---------|---------|------------|----------|
| Conflito de subdomÃ­nio personalizado | Erro `SubdomainAlreadyInUse` | Outro recurso usa o mesmo subdomÃ­nio globalmente | Escolha um nome de subdomÃ­nio Ãºnico |
| Rede bloqueada | `403 Forbidden` apÃ³s aplicar regras | IP do cliente nÃ£o estÃ¡ na lista de permissÃµes | Adicione o IP do cliente Ã s regras de rede ou use private endpoint |
| RotaÃ§Ã£o de chave quebra o app | `401 Unauthorized` apÃ³s regeneraÃ§Ã£o | App ainda usando a chave antiga | Atualize para a nova chave, ou use a Key 2 durante a rotaÃ§Ã£o da Key 1 |
| AutenticaÃ§Ã£o Entra falha | `401` com bearer token | Recurso sem subdomÃ­nio personalizado | SubdomÃ­nio personalizado Ã© obrigatÃ³rio para autenticaÃ§Ã£o Microsoft Entra; recrie com `--custom-domain` |
| Formato de endpoint errado | `404 Not Found` | Usando formato de endpoint regional com recurso de subdomÃ­nio personalizado | Use o formato `https://<subdomain>.cognitiveservices.azure.com/` |

## VerificaÃ§Ã£o de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Por que um nome de subdomÃ­nio personalizado Ã© obrigatÃ³rio ao usar autenticaÃ§Ã£o Microsoft Entra ID (Azure AD) com serviÃ§os do Azure AI?",
    options: [
      "SubdomÃ­nios personalizados fornecem tempos de resposta mais rÃ¡pidos atravÃ©s de cache CDN",
      "SubdomÃ­nios personalizados sÃ£o necessÃ¡rios para configuraÃ§Ã£o de CORS",
      "Tokens do Microsoft Entra sÃ³ podem ser validados contra endpoints de domÃ­nio personalizado",
      "Endpoints regionais nÃ£o suportam HTTPS para autenticaÃ§Ã£o baseada em token"
    ],
    correctAnswer: 2,
    explanation: "A autenticaÃ§Ã£o Microsoft Entra ID requer um subdomÃ­nio personalizado porque a validaÃ§Ã£o de token estÃ¡ vinculada Ã  URL Ãºnica do endpoint. Endpoints regionais compartilhados (como eastus.api.cognitive.microsoft.com) suportam apenas autenticaÃ§Ã£o baseada em chave."
  },
  {
    question: "VocÃª precisa rotacionar as chaves de API de um recurso Azure AI em produÃ§Ã£o sem nenhum tempo de inatividade. Qual Ã© o procedimento correto?",
    options: [
      "Regenerar ambas as chaves simultaneamente, depois atualizar todas as aplicaÃ§Ãµes",
      "Usar managed identity em vez dissoâ€”a rotaÃ§Ã£o de chaves sempre causa tempo de inatividade",
      "Criar um novo recurso, migrar o trÃ¡fego, depois excluir o recurso antigo",
      "Atualizar todos os apps para usar a Key 2, regenerar a Key 1, atualizar os apps para a Key 1, regenerar a Key 2"
    ],
    correctAnswer: 3,
    explanation: "O padrÃ£o de rotaÃ§Ã£o de chaves sem tempo de inatividade Ã©: trocar os apps para a Key 2, regenerar a Key 1, trocar os apps de volta para a Key 1, depois regenerar a Key 2. Isso garante que pelo menos uma chave vÃ¡lida esteja sempre em uso."
  },
  {
    question: "Qual Ã© o formato de endpoint padrÃ£o para um recurso multi-serviÃ§o do Azure AI criado SEM um subdomÃ­nio personalizado?",
    options: [
      "https://<resource-name>.cognitiveservices.azure.com/",
      "https://<region>.api.cognitive.microsoft.com/",
      "https://<resource-name>.openai.azure.com/",
      "https://api.cognitive.microsoft.com/<resource-name>/"
    ],
    correctAnswer: 1,
    explanation: "Sem um subdomÃ­nio personalizado, recursos multi-serviÃ§o usam o formato de endpoint regional compartilhado: https://<region>.api.cognitive.microsoft.com/. O formato de endpoint especÃ­fico do recurso requer que um subdomÃ­nio personalizado esteja configurado."
  },
  {
    question: "VocÃª configura regras de rede no seu recurso Azure AI com a aÃ§Ã£o padrÃ£o definida como 'Deny'. Qual trÃ¡fego ainda Ã© permitido?",
    options: [
      "Apenas trÃ¡fego de regras de IP configuradas, regras de VNet e private endpoints",
      "Todo o trÃ¡fego de dentro da mesma regiÃ£o do Azure",
      "Todo o trÃ¡fego de serviÃ§os Azure mais as regras configuradas",
      "Apenas trÃ¡fego do portal Azure e regras configuradas"
    ],
    correctAnswer: 0,
    explanation: "Quando a aÃ§Ã£o padrÃ£o Ã© Deny, apenas o trÃ¡fego que corresponde a regras de IP explicitamente configuradas, regras de rede virtual ou private endpoints Ã© permitido. O acesso ao portal Azure tambÃ©m requer que o IP do usuÃ¡rio esteja na lista de permissÃµes."
  },
  {
    question: "Qual SKU vocÃª deve escolher para um recurso multi-serviÃ§o do Azure AI de desenvolvimento/teste para minimizar custos enquanto acessa todas as APIs de serviÃ§o?",
    options: [
      "F0 (Free tier) para desenvolvimento sem custo",
      "S1 para limites de taxa mais altos durante testes",
      "S0 (Standard tier) para recursos multi-serviÃ§o",
      "P1 (Premium) para acesso a todas as APIs"
    ],
    correctAnswer: 2,
    explanation: "Recursos multi-serviÃ§o (kind: AIServices) usam o SKU S0. NÃ£o existe F0 free tier para recursos multi-serviÃ§oâ€”free tiers estÃ£o disponÃ­veis apenas para recursos individuais de serviÃ§o Ãºnico. S0 Ã© o SKU padrÃ£o e Ãºnico disponÃ­vel para multi-serviÃ§o."
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
