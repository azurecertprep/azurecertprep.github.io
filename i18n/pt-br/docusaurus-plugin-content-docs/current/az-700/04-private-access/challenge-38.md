---
sidebar_position: 5
title: "Desafio 38: Service Endpoints & Políticas"
sidebar_label: "Challenge 38"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 38: Service endpoints e políticas

:::info Tempo e custo estimados

**45-60 minutos** | **~$0,01** (sem custo adicional para service endpoints) | **Peso do exame: 10-15%**

:::

## Cenário

A Fourth Coffee é uma empresa de serviços financeiros preocupada com exfiltração de dados. As equipes de desenvolvimento possuem VMs no Azure que acessam contas de Azure Storage, mas a equipe de segurança descobriu que os desenvolvedores poderiam copiar dados para contas de armazenamento não autorizadas. A empresa deseja usar políticas de service endpoint para restringir o acesso de saída de suas sub-redes apenas a contas de armazenamento aprovadas, além de entender quando Private Endpoints podem ser mais adequados.

Sua tarefa é habilitar service endpoints, criar políticas que restrinjam o acesso a contas de armazenamento específicas e validar que contas de armazenamento não autorizadas sejam bloqueadas. Você também comparará service endpoints com Private Endpoints para recomendar a melhor abordagem para diferentes cenários.

### Service endpoints vs Private Endpoints

| Recurso | Service Endpoints | Private Endpoints |
|---------|-------------------|-------------------|
| Caminho do tráfego | Rota otimizada pelo backbone do Azure, ainda usa IP público do PaaS | Tráfego vai para um IP privado na sua VNet |
| DNS | Nenhuma alteração de DNS necessária | Requer zona de Private DNS ou DNS personalizado |
| Acesso local (on-premises) | Não acessível do on-premises apenas via SE | Acessível do on-premises (com configuração de DNS) |
| Custo | Gratuito | ~$0,01/h por endpoint + processamento de dados |
| Proteção contra exfiltração de dados | Requer políticas de SE (limitado a Storage) | Inerente — tráfego permanece privado |
| IP visto pelo PaaS | IP da sub-rede da VNet (mudança de NAT de origem) | IP privado da VNet |
| Granularidade | Nível de sub-rede | Por recurso |
| Suporte de serviço para políticas | Apenas Azure Storage | N/A (inerentemente restrito) |

---

## Tarefa 1: Criar contas de armazenamento e uma VNet com service endpoints

### Azure CLI

```bash
# Variables
RG="rg-challenge38"
LOCATION="eastus"
VNET_NAME="vnet-workload"
SUBNET_NAME="snet-app"
ALLOWED_STORAGE="stallowedc38$(shuf -i 1000-9999 -n 1)"
BLOCKED_STORAGE="stblockedc38$(shuf -i 1000-9999 -n 1)"

# Create resource group
az group create --name $RG --location $LOCATION

# Create two storage accounts (one allowed, one to be blocked)
az storage account create \
  --resource-group $RG \
  --name $ALLOWED_STORAGE \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

az storage account create \
  --resource-group $RG \
  --name $BLOCKED_STORAGE \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Create VNet and subnet with Microsoft.Storage service endpoint enabled
az network vnet create \
  --resource-group $RG \
  --name $VNET_NAME \
  --location $LOCATION \
  --address-prefixes "10.1.0.0/16" \
  --subnet-name $SUBNET_NAME \
  --subnet-prefixes "10.1.0.0/24"

# Enable service endpoint on the subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --service-endpoints Microsoft.Storage
```

### Azure PowerShell

```powershell
# Variables
$rg = "rg-challenge38"
$location = "eastus"
$vnetName = "vnet-workload"
$subnetName = "snet-app"
$allowedStorage = "stallowedc38$(Get-Random -Minimum 1000 -Maximum 9999)"
$blockedStorage = "stblockedc38$(Get-Random -Minimum 1000 -Maximum 9999)"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Create storage accounts
New-AzStorageAccount -ResourceGroupName $rg -Name $allowedStorage `
  -Location $location -SkuName Standard_LRS -Kind StorageV2

New-AzStorageAccount -ResourceGroupName $rg -Name $blockedStorage `
  -Location $location -SkuName Standard_LRS -Kind StorageV2

# Create VNet
$subnet = New-AzVirtualNetworkSubnetConfig `
  -Name $subnetName `
  -AddressPrefix "10.1.0.0/24" `
  -ServiceEndpoint "Microsoft.Storage"

New-AzVirtualNetwork `
  -ResourceGroupName $rg `
  -Name $vnetName `
  -Location $location `
  -AddressPrefix "10.1.0.0/16" `
  -Subnet $subnet
```

### Portal

1. Crie um grupo de recursos `rg-challenge38` em **East US**.
2. Crie duas contas de armazenamento: uma com "allowed" e outra com "blocked" no nome.
3. Crie uma VNet `vnet-workload` com espaço de endereço `10.1.0.0/16`.
4. Adicione a sub-rede `snet-app` com prefixo `10.1.0.0/24`.
5. Nas configurações da sub-rede, em **Service endpoints**, adicione `Microsoft.Storage`.

---

## Tarefa 2: Criar uma política de service endpoint

As políticas de service endpoint restringem quais contas de Azure Storage podem ser acessadas a partir de uma sub-rede via service endpoints.

### Azure CLI

```bash
# Get the allowed storage account resource ID
ALLOWED_STORAGE_ID=$(az storage account show \
  --name $ALLOWED_STORAGE \
  --resource-group $RG \
  --query id --output tsv)

# Create a service endpoint policy
az network service-endpoint policy create \
  --resource-group $RG \
  --name "sep-allowed-storage" \
  --location $LOCATION

# Add a policy definition restricting to the allowed storage account
az network service-endpoint policy-definition create \
  --resource-group $RG \
  --policy-name "sep-allowed-storage" \
  --name "allow-specific-storage" \
  --service "Microsoft.Storage" \
  --service-resources $ALLOWED_STORAGE_ID
```

### Azure PowerShell

```powershell
# Get the allowed storage account resource ID
$storageAccount = Get-AzStorageAccount -ResourceGroupName $rg -Name $allowedStorage
$resourceId = $storageAccount.Id

# Create the policy definition
$policyDefinition = New-AzServiceEndpointPolicyDefinition `
  -Name "allow-specific-storage" `
  -Description "Allow only approved storage account" `
  -Service "Microsoft.Storage" `
  -ServiceResource $resourceId

# Create the service endpoint policy
$sepolicy = New-AzServiceEndpointPolicy `
  -ResourceGroupName $rg `
  -Name "sep-allowed-storage" `
  -Location $location `
  -ServiceEndpointPolicyDefinition $policyDefinition
```

### Portal

1. Pesquise por **Service endpoint policies** e selecione **+ Create**.
2. Defina o grupo de recursos como `rg-challenge38`, nome como `sep-allowed-storage`, região como **East US**.
3. Selecione **Next: Policy definitions**.
4. Selecione **+ Add a resource**:
   - Service: `Microsoft.Storage`
   - Scope: **Single account**
   - Selecione a conta de armazenamento permitida.
5. Selecione **Add**, depois **Review + create** e então **Create**.

---

## Tarefa 3: Associar a política à sub-rede

### Azure CLI

```bash
# Associate the service endpoint policy to the subnet
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --service-endpoints Microsoft.Storage \
  --service-endpoint-policy "sep-allowed-storage"
```

### Azure PowerShell

```powershell
$virtualNetwork = Get-AzVirtualNetwork -ResourceGroupName $rg -Name $vnetName

Set-AzVirtualNetworkSubnetConfig `
  -VirtualNetwork $virtualNetwork `
  -Name $subnetName `
  -AddressPrefix "10.1.0.0/24" `
  -ServiceEndpoint "Microsoft.Storage" `
  -ServiceEndpointPolicy $sepolicy

$virtualNetwork | Set-AzVirtualNetwork
```

### Portal

1. Navegue até a política de service endpoint `sep-allowed-storage`.
2. Expanda **Settings** e selecione **Associated subnets**.
3. Selecione **+ Edit subnet association**.
4. Selecione a VNet `vnet-workload` e a sub-rede `snet-app`.
5. Selecione **Apply**.

:::warning Atenção
Uma vez que uma política de service endpoint é aplicada a uma sub-rede, todo o acesso ao armazenamento via service endpoint é restrito apenas às contas listadas na política. Certifique-se de que todas as contas de armazenamento necessárias estejam incluídas antes de aplicar a política.
:::

---

## Tarefa 4: Configurar o firewall da conta de armazenamento com regras de VNet

### Azure CLI

```bash
# Set default action to Deny on the allowed storage account
az storage account update \
  --resource-group $RG \
  --name $ALLOWED_STORAGE \
  --default-action Deny

# Add a VNet rule allowing access from the subnet
az storage account network-rule add \
  --resource-group $RG \
  --account-name $ALLOWED_STORAGE \
  --vnet-name $VNET_NAME \
  --subnet $SUBNET_NAME
```

### Azure PowerShell

```powershell
# Set default action to Deny
Update-AzStorageAccountNetworkRuleSet `
  -ResourceGroupName $rg `
  -Name $allowedStorage `
  -DefaultAction Deny

# Add VNet rule
$subnet = Get-AzVirtualNetwork -ResourceGroupName $rg -Name $vnetName | `
  Get-AzVirtualNetworkSubnetConfig -Name $subnetName

Add-AzStorageAccountNetworkRule `
  -ResourceGroupName $rg `
  -Name $allowedStorage `
  -VirtualNetworkResourceId $subnet.Id
```

### Portal

1. Navegue até a conta de armazenamento permitida.
2. Em **Security + networking**, selecione **Networking**.
3. Defina **Public network access** como **Enabled from selected virtual networks and IP addresses**.
4. Em **Virtual networks**, selecione **+ Add existing virtual network**.
5. Selecione a VNet `vnet-workload` e a sub-rede `snet-app`.
6. Selecione **Add** e depois **Save**.

---

## Tarefa 5: Validar a política de service endpoint

Implante uma VM de teste na sub-rede e verifique se apenas a conta de armazenamento permitida está acessível.

```bash
# Create a test VM in the subnet
az vm create \
  --resource-group $RG \
  --name "vm-test" \
  --image Ubuntu2204 \
  --vnet-name $VNET_NAME \
  --subnet $SUBNET_NAME \
  --admin-username azureuser \
  --generate-ssh-keys \
  --size Standard_B1s \
  --no-wait

# After VM is running, SSH in and test connectivity
# This should SUCCEED (allowed storage account)
curl -s -o /dev/null -w "%{http_code}" \
  "https://$ALLOWED_STORAGE.blob.core.windows.net/?comp=list"
# Expected: 403 (auth required, but connection works)

# This should FAIL (blocked storage account - connection refused by SE policy)
curl -s -o /dev/null -w "%{http_code}" \
  "https://$BLOCKED_STORAGE.blob.core.windows.net/?comp=list"
# Expected: connection timeout or drop (SE policy blocks it)
```

---

## Cenários de quebra e correção

### Cenário 1: Política de service endpoint bloqueando todo o acesso ao armazenamento

**Sintoma**: Após aplicar a política de service endpoint, nenhuma conta de armazenamento está acessível a partir da sub-rede — mesmo as contas "permitidas" retornam falhas de conexão.

**Causa raiz**: O valor de `--service-resources` na definição da política usa um formato de ID de recurso incorreto. O ID do recurso deve ser o ID completo do recurso ARM da conta de armazenamento.

**Correção**:

```bash
# Verify the policy definition has the correct resource ID
az network service-endpoint policy-definition show \
  --resource-group $RG \
  --policy-name "sep-allowed-storage" \
  --name "allow-specific-storage" \
  --query "serviceResources" -o tsv

# If incorrect, delete and recreate with the proper resource ID
az network service-endpoint policy-definition delete \
  --resource-group $RG \
  --policy-name "sep-allowed-storage" \
  --name "allow-specific-storage"

CORRECT_ID=$(az storage account show --name $ALLOWED_STORAGE --resource-group $RG --query id -o tsv)

az network service-endpoint policy-definition create \
  --resource-group $RG \
  --policy-name "sep-allowed-storage" \
  --name "allow-specific-storage" \
  --service "Microsoft.Storage" \
  --service-resources $CORRECT_ID
```

**Insight principal**: O parâmetro `--service-resources` deve ser o ID completo do recurso ARM no formato `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/{name}`. IDs parciais ou nomes não funcionarão.

---

### Cenário 2: Regra de VNet não entrando em vigor

**Sintoma**: O firewall da conta de armazenamento tem uma regra de VNet configurada, mas o tráfego da sub-rede ainda está sendo negado com uma resposta 403 (AuthorizationFailure).

**Causa raiz**: O service endpoint para `Microsoft.Storage` não foi habilitado na sub-rede antes de adicionar a regra de VNet. A regra de VNet requer um service endpoint ativo.

**Correção**:

```bash
# Verify service endpoint is enabled on the subnet
az network vnet subnet show \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --query "serviceEndpoints[].service" -o tsv

# If Microsoft.Storage is not listed, enable it
az network vnet subnet update \
  --resource-group $RG \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --service-endpoints Microsoft.Storage

# Verify the VNet rule on the storage account
az storage account network-rule list \
  --resource-group $RG \
  --account-name $ALLOWED_STORAGE \
  --query "virtualNetworkRules[].{subnet:virtualNetworkResourceId, state:state}" -o table
```

**Insight principal**: Service endpoints e regras de VNet funcionam juntos. O service endpoint na sub-rede otimiza a rota, e a regra de VNet na conta de armazenamento concede o acesso. Ambos devem estar configurados.

---

### Cenário 3: Restrição de acesso do App Service usando SE, mas tráfego da internet ainda funciona

**Sintoma**: Um App Service tem uma restrição de acesso baseada em service endpoint configurada, mas clientes da internet ainda conseguem acessar a aplicação.

**Causa raiz**: As regras de restrição de acesso possuem uma regra "Allow All" com prioridade mais alta, ou a regra deny-all está ausente. O App Service processa as regras em ordem de prioridade e para na primeira correspondência.

**Correção**:

Verifique as regras de restrição de acesso e certifique-se de que uma regra deny-all existe com a prioridade mais baixa:

```bash
# List current access restrictions
az webapp config access-restriction show \
  --resource-group $RG \
  --name "app-name" \
  --query "ipSecurityRestrictions[].{priority:priority, name:name, action:action, ip:ipAddress, vnetSubnetResourceId:vnetSubnetResourceId}" -o table

# Add a deny-all rule with lowest priority (highest number)
az webapp config access-restriction add \
  --resource-group $RG \
  --name "app-name" \
  --priority 999 \
  --action Deny \
  --ip-address "0.0.0.0/0" \
  --rule-name "DenyAll"
```

**Insight principal**: As restrições de acesso do App Service são processadas de cima para baixo por número de prioridade (número mais baixo = prioridade mais alta). Há um "Allow All" implícito no final, a menos que você negue explicitamente. Sempre adicione uma regra catch deny-all.

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-38-q1",
    question: "Qual é a principal vantagem das políticas de service endpoint em relação aos service endpoints sozinhos?",
    options: [
      "Elas reduzem a latência de rede para serviços Azure",
      "Elas previnem exfiltração de dados restringindo o acesso a instâncias específicas de recursos Azure ✅",
      "Elas habilitam acesso baseado em IP privado a serviços PaaS",
      "Elas fornecem resolução DNS para serviços Azure"
    ],
    correctIndex: 1,
    explanation: "As políticas de service endpoint adicionam proteção contra exfiltração de dados restringindo quais instâncias específicas de recursos Azure (ex.: contas de armazenamento específicas) podem ser acessadas a partir de uma sub-rede. Sem políticas, um service endpoint permite acesso a TODAS as contas de armazenamento pela rota otimizada."
  },
  {
    id: "az700-38-q2",
    question: "Qual serviço Azure atualmente suporta políticas de service endpoint para proteção contra exfiltração de dados?",
    options: [
      "Azure SQL Database",
      "Azure Key Vault",
      "Azure Storage ✅",
      "Azure Cosmos DB"
    ],
    correctIndex: 2,
    explanation: "Na plataforma Azure atual, as políticas de service endpoint são suportadas apenas para o Azure Storage. Para outros serviços, os Private Endpoints fornecem proteção inerente contra exfiltração de dados."
  },
  {
    id: "az700-38-q3",
    question: "Como o roteamento de tráfego muda quando um service endpoint é habilitado em uma sub-rede?",
    options: [
      "O tráfego é roteado pela internet com criptografia",
      "Uma rota de sistema é adicionada direcionando o tráfego do serviço pelo backbone do Azure, com o IP de origem mudando para o IP privado da VNet ✅",
      "O tráfego é roteado por um endpoint de IP privado na VNet",
      "Nenhuma mudança de roteamento ocorre; apenas regras de firewall são aplicadas"
    ],
    correctIndex: 1,
    explanation: "Quando um service endpoint é habilitado, o Azure adiciona uma rota de sistema otimizada que direciona o tráfego para o serviço pelo backbone da Microsoft. O IP de origem do tráfego visto pelo serviço PaaS muda de um IP público para o IP privado da VNet da VM."
  },
  {
    id: "az700-38-q4",
    question: "Uma empresa precisa que clientes locais acessem o Azure Storage de forma privada. Qual abordagem devem usar?",
    options: [
      "Service Endpoints (eles se estendem ao ambiente local via VPN)",
      "Private Endpoints com configuração de encaminhamento DNS ✅",
      "Políticas de service endpoint com encaminhadores condicionais",
      "Emparelhamento de VNet com service endpoints"
    ],
    correctIndex: 1,
    explanation: "Os service endpoints se aplicam apenas ao tráfego originado de sub-redes da VNet do Azure. Eles não se estendem a redes locais. Para acesso local a serviços PaaS do Azure por conectividade privada, Private Endpoints com configuração DNS adequada são necessários."
  },
  {
    id: "az700-38-q5",
    question: "O que acontece se você associar uma política de service endpoint a uma sub-rede, mas esquecer de incluir uma conta de armazenamento necessária na política?",
    options: [
      "A política permite graciosamente todo o acesso ao armazenamento até ser atualizada",
      "Apenas as contas de armazenamento listadas na política são acessíveis; todas as outras são bloqueadas imediatamente ✅",
      "A política gera um aviso, mas não bloqueia o acesso",
      "A política só se aplica após um período de propagação de 24 horas"
    ],
    correctIndex: 1,
    explanation: "As políticas de service endpoint são negar-por-padrão uma vez aplicadas. Apenas as contas de armazenamento explicitamente listadas nas definições da política são acessíveis a partir da sub-rede via service endpoint. Todas as outras contas são bloqueadas imediatamente. Por isso você deve garantir que todas as contas necessárias estejam incluídas antes de associar a política."
  },
  {
    id: "az700-38-q6",
    question: "Qual afirmação sobre service endpoints e Private Endpoints está correta?",
    options: [
      "Service endpoints são mais caros que Private Endpoints",
      "Private Endpoints não requerem alterações de DNS e funcionam automaticamente",
      "Service endpoints expõem um IP privado na VNet para o serviço PaaS",
      "Private Endpoints fornecem um IP privado na VNet e funcionam com clientes locais via encaminhamento DNS ✅"
    ],
    correctIndex: 3,
    explanation: "Private Endpoints criam uma interface de rede com um endereço IP privado na sua VNet, habilitando o acesso do ambiente local via VPN/ExpressRoute com encaminhamento DNS. Service endpoints não criam um IP privado -- eles otimizam a rota, mas o serviço PaaS ainda usa seu endpoint público."
  }
]} />

---

## Limpeza

```bash
# Delete all resources
az group delete --name rg-challenge38 --yes --no-wait
```

```powershell
# PowerShell cleanup
Remove-AzResourceGroup -Name "rg-challenge38" -Force -AsJob
```

:::warning Gerenciamento de custos
Service endpoints e políticas de service endpoint **não têm custo adicional**. No entanto, a VM de teste e as contas de armazenamento geram cobranças mínimas. Exclua o grupo de recursos após concluir este desafio.
:::

---

## Resumo

Neste desafio, você configurou service endpoints com políticas para prevenir exfiltração de dados para contas de armazenamento não autorizadas. Você aprendeu como as políticas de service endpoint restringem o acesso de saída no nível da sub-rede, como as regras de VNet nas contas de armazenamento concedem acesso de entrada, e as distinções importantes entre service endpoints e Private Endpoints. Entender quando usar cada abordagem — e suas limitações — é um tópico essencial no exame AZ-700.
