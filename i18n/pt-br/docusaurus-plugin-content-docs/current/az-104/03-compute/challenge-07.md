---
sidebar_position: 1
title: "Desafio 07: ARM Templates & Bicep"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 07: ARM templates & Bicep

:::info Informação

**Tempo estimado: 60 minutos** | **Custo estimado: Gratuito** (templates + storage account apenas) | **Peso no exame: 20–25%**

:::
## Cenário

O CTO da Contoso se cansou de deploys do tipo "funciona no meu portal". Depois que um administrador júnior acidentalmente excluiu uma conta de armazenamento de produção clicando pelo Portal do Azure, a diretriz é clara: **tudo deve ser infraestrutura como código**. Nada mais de cliques no portal para provisionamento | cada recurso deve ser repetível, versionado e auditável.

Sua tarefa é pegar o primeiro recurso crítico da Contoso | uma conta de armazenamento | e defini-lo como um ARM template, depois modernizá-lo para Bicep.

## Habilidades do exame cobertas

| Habilidade | Peso |
|------------|------|
| Interpretar um ARM template | Alto |
| Modificar um ARM template existente | Alto |
| Interpretar um arquivo Bicep | Alto |
| Modificar um arquivo Bicep existente | Alto |
| Implantar recursos usando ARM templates ou Bicep | Alto |
| Exportar uma implantação como ARM template | Médio |
| Converter um ARM template para Bicep | Médio |

## Referência sysadmin ↔ Azure

| Tradicional | Equivalente no Azure |
|-------------|---------------------|
| Scripts de provisionamento PowerShell/Bash | ARM templates / Arquivos Bicep |
| Ansible playbooks | Módulos Bicep |
| Documentação de instalação manual | Templates declarativos (estado desejado) |
| Parâmetros de scripts shell | Parâmetros ARM/Bicep |
| Saída / valores de retorno de scripts | Outputs ARM/Bicep |
| Funções shell reutilizáveis | Módulos Bicep / linked templates |

## Tarefas

### Tarefa 1: examinar um ARM template

Estude este ARM template que cria uma conta de armazenamento. Identifique as cinco seções principais: `$schema`, `parameters`, `variables`, `resources` e `outputs`.

Salve como `storage.json`:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storagePrefix": {
      "type": "string",
      "minLength": 3,
      "maxLength": 11,
      "metadata": {
        "description": "Prefix for the storage account name"
      }
    },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]"
    }
  },
  "variables": {
    "uniqueStorageName": "[concat(parameters('storagePrefix'), uniqueString(resourceGroup().id))]"
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2023-01-01",
      "name": "[variables('uniqueStorageName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "Standard_LRS"
      },
      "kind": "StorageV2",
      "properties": {
        "supportsHttpsTrafficOnly": true
      }
    }
  ],
  "outputs": {
    "storageEndpoint": {
      "type": "string",
      "value": "[reference(variables('uniqueStorageName')).primaryEndpoints.blob]"
    }
  }
}
```

### Tarefa 2: modificar o ARM template

Adicione um parâmetro de tag `environment` ao template para que cada recurso implantado receba uma tag:

```bash
# Após modificar storage.json, valide-o:
az deployment group validate \
  --resource-group rg-iac-lab \
  --template-file storage.json \
  --parameters storagePrefix=contoso environment=dev
```

<details>
<summary>Dica | Onde adicionar o parâmetro de tag</summary>

Adicione um novo parâmetro:
```json
"environment": {
  "type": "string",
  "allowedValues": ["dev", "staging", "prod"],
  "defaultValue": "dev"
}
```

Em seguida, adicione uma propriedade `tags` ao recurso:
```json
"tags": {
  "environment": "[parameters('environment')]"
}
```
</details>

### Tarefa 3: implantar o ARM template

```bash
# Criar um grupo de recursos para este lab
az group create --name rg-iac-lab --location eastus

# Implantar o ARM template
az deployment group create \
  --resource-group rg-iac-lab \
  --template-file storage.json \
  --parameters storagePrefix=contoso environment=dev \
  --name deploy-storage-v1

# Verificar a implantação
az deployment group show \
  --resource-group rg-iac-lab \
  --name deploy-storage-v1 \
  --query "properties.outputs"
```

### Tarefa 4: exportar a implantação

```bash
# Exportar todo o grupo de recursos como um ARM template
az group export --name rg-iac-lab --output json > exported-template.json

# Revisar o que foi exportado
cat exported-template.json | python -m json.tool | head -50
```

### Tarefa 5: converter ARM para Bicep

```bash
# Instalar/atualizar o Bicep CLI
az bicep install
az bicep version

# Decompilar o ARM template para Bicep
az bicep decompile --file storage.json

# Isso cria storage.bicep: revise-o
cat storage.bicep
```

### Tarefa 6: modificar o arquivo Bicep

Adicione um contêiner de blob ao arquivo Bicep:

```bash
# Após modificar storage.bicep, compile-o para verificar a sintaxe
az bicep build --file storage.bicep
```

<details>
<summary>Dica | Recurso de contêiner de blob no Bicep</summary>

```bicep
param storagePrefix string
param location string = resourceGroup().location
param environment string = 'dev'

var uniqueStorageName = '${storagePrefix}${uniqueString(resourceGroup().id)}'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: uniqueStorageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  tags: {
    environment: environment
  }
  properties: {
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'appdata'
  properties: {
    publicAccess: 'None'
  }
}

output storageEndpoint string = storageAccount.properties.primaryEndpoints.blob
output storageName string = storageAccount.name
```
</details>

### Tarefa 7: implantar o arquivo Bicep

```bash
# Implantar o arquivo Bicep
az deployment group create \
  --resource-group rg-iac-lab \
  --template-file storage.bicep \
  --parameters storagePrefix=contoso environment=prod \
  --name deploy-storage-v2

# Verificar se o contêiner foi criado
STORAGE_NAME=$(az deployment group show \
  --resource-group rg-iac-lab \
  --name deploy-storage-v2 \
  --query "properties.outputs.storageName.value" -o tsv)

az storage container list --account-name $STORAGE_NAME --auth-mode login -o table
```

### Tarefa 8: visualizar alterações com What-If

```bash
# Executar um deploy what-if para visualizar alterações sem implantar
az deployment group what-if \
  --resource-group rg-iac-lab \
  --template-file storage.bicep \
  --parameters storagePrefix=contoso environment=staging
```

## Critérios de sucesso

<SuccessChecklist
  storageKey="az104-challenge-07"
  items={[
    "ARM template implanta uma conta de armazenamento com tags",
    "Template exportado corresponde aos recursos implantados",
    "ARM template convertido com sucesso para Bicep",
    "Arquivo Bicep implanta uma conta de armazenamento **e** contêiner de blob",
    "What-if mostra as alterações esperadas sem implantar"
  ]}
/>
## Cenários quebre & conserte

### Cenário a: erro de sintaxe
Implante este template quebrado e corrija o erro:
```bash
# Introduza um erro de digitação no template (ex: "Standar_LRS" em vez de "Standard_LRS")
# Implante e observe a mensagem de erro
az deployment group create \
  --resource-group rg-iac-lab \
  --template-file broken-storage.json \
  --parameters storagePrefix=contoso
```

### Cenário b: parâmetro obrigatório ausente
```bash
# Implante sem o parâmetro obrigatório storagePrefix
az deployment group create \
  --resource-group rg-iac-lab \
  --template-file storage.json \
  --name deploy-broken
# Qual erro você recebe? como o Azure valida os parâmetros?
```

### Cenário c: implantação em modo completo
```bash
# ATENÇÃO: o modo completo exclui recursos que não estão no template!
az deployment group what-if \
  --resource-group rg-iac-lab \
  --template-file storage.bicep \
  --parameters storagePrefix=contoso environment=dev \
  --mode Complete
# Compare a saída do what-if entre os modos incremental e completo
```

## Teste seus conhecimentos

**1. Qual é a diferença principal entre ARM templates e Bicep?**

<details>
<summary>Mostrar Resposta</summary>

Bicep é uma linguagem de domínio específico (DSL) que compila para ARM JSON. Oferece sintaxe mais limpa, gerenciamento automático de dependências e melhor ferramental (extensão do VS Code). Por baixo dos panos, o Azure Resource Manager só entende ARM JSON | o Bicep é transpilado antes da implantação.
</details>

**2. Qual é a diferença entre os modos de implantação Incremental e Completo?**

<details>
<summary>Mostrar Resposta</summary>

- **Incremental** (padrão): Adiciona/atualiza recursos no template mas **deixa os recursos existentes intocados**. Seguro para implantações iterativas.
- **Completo**: Implanta os recursos do template e **exclui quaisquer recursos no grupo de recursos que não estejam definidos no template**. Perigoso se você tem recursos não gerenciados pelo template.
</details>

**3. O que o `az bicep decompile` faz?**

<details>
<summary>Mostrar Resposta</summary>

Ele converte um ARM template JSON em um arquivo Bicep (.bicep). A conversão é de melhor esforço | algumas construções podem precisar de limpeza manual (avisos são exibidos). A operação inversa é `az bicep build`, que compila Bicep para ARM JSON.
</details>

**4. Por que usar `uniqueString()` em nomes de contas de armazenamento?**

<details>
<summary>Mostrar Resposta</summary>

Nomes de contas de armazenamento devem ser globalmente únicos em todo o Azure (3–24 caracteres, apenas letras minúsculas + números). `uniqueString()` gera um hash determinístico de 13 caracteres baseado na entrada (ex: `resourceGroup().id`), garantindo nomes únicos mas repetíveis por grupo de recursos.
</details>

## Limpeza

```bash
# Remover todos os recursos criados neste desafio
az group delete --name rg-iac-lab --yes --no-wait

# Limpar arquivos locais
rm -f storage.json storage.bicep exported-template.json broken-storage.json
```
