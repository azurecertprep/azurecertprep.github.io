---
sidebar_position: 3
title: "Desafio 06: Segurança de Armazenamento & Ciclo de Vida"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 06: seguranÃ§a de Storage & ciclo de vida

:::info Tempo e Custo Estimados

**60-75 min** | **Custo estimado**: ~$1.00 (duas storage accounts) | **Peso no Exame: 15-20%
**

:::

## IntroduÃ§Ã£o

A conta do Azure Storage da Contoso triplicou no Ãºltimo trimestre. O culpado: ninguÃ©m estÃ¡ limpando dados antigos. Arquivos de log de 2023 estÃ£o na camada Hot junto com dados de produÃ§Ã£o atuais, e nÃ£o hÃ¡ polÃ­tica automatizada para mover dados envelhecendo para camadas mais baratas. AlÃ©m disso, a equipe de seguranÃ§a quer acesso baseado em identidade para Azure Files em vez de chaves compartilhadas, e a equipe de conformidade precisa de dados replicados para uma segunda regiÃ£o.

Sua missÃ£o: implementar polÃ­ticas de gerenciamento de ciclo de vida para controlar custos, configurar acesso baseado em identidade e configurar replicaÃ§Ã£o de objetos entre regiÃµes para continuidade de negÃ³cios.

## Habilidades do exame cobertas

- Configurar acesso baseado em identidade para Azure Files
- Criar e configurar polÃ­ticas de acesso armazenadas
- Configurar polÃ­ticas de gerenciamento de ciclo de vida
- Configurar replicaÃ§Ã£o de objetos entre storage accounts

## ReferÃªncia sysadmin â†” Azure

| On-Prem / Sysadmin | Equivalente no Azure | ObservaÃ§Ãµes |
|---------------------|----------------------|-------------|
| Cotas de servidor de arquivos & polÃ­ticas de arquivamento | Gerenciamento de ciclo de vida | Automatizar transiÃ§Ãµes de camada & exclusÃ£o |
| DFS Replication | ReplicaÃ§Ã£o de objetos | ReplicaÃ§Ã£o assÃ­ncrona de blob entre regiÃµes |
| ACLs NTFS em compartilhamentos de arquivos | Acesso baseado em identidade (Entra ID) | PermissÃµes por usuÃ¡rio/grupo no compartilhamento |
| PolÃ­ticas de retenÃ§Ã£o de dados | Regras de gerenciamento de ciclo de vida | Limpeza automatizada de dados por idade |
| Arquivamento em fita | Migrar para camada Archive apÃ³s N dias | Armazenamento frio, horas para recuperar |
| Backup para site de DR | GRS + ReplicaÃ§Ã£o de objetos | RedundÃ¢ncia geogrÃ¡fica |

## DescriÃ§Ã£o

### Parte 1: configurar o ambiente

1. Criar duas storage accounts em regiÃµes diferentes (necessÃ¡rio para replicaÃ§Ã£o de objetos):

```bash
RG="rg-lifecycle-challenge"
LOCATION_PRIMARY="eastus"
LOCATION_SECONDARY="westus2"
STORAGE_PRIMARY="stlifecyclepri$RANDOM"
STORAGE_SECONDARY="stlifecyclesec$RANDOM"

az group create --name $RG --location $LOCATION_PRIMARY

# Primary storage account
az storage account create \
  --name $STORAGE_PRIMARY \
  --resource-group $RG \
  --location $LOCATION_PRIMARY \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

# Secondary storage account (different region)
az storage account create \
  --name $STORAGE_SECONDARY \
  --resource-group $RG \
  --location $LOCATION_SECONDARY \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot
```

2. Habilitar versionamento de blob em ambas as contas (necessÃ¡rio para replicaÃ§Ã£o de objetos) e habilitar change feed na origem:

```bash
# Enable versioning on both accounts
az storage account blob-service-properties update \
  --account-name $STORAGE_PRIMARY --resource-group $RG \
  --enable-versioning true --enable-change-feed true

az storage account blob-service-properties update \
  --account-name $STORAGE_SECONDARY --resource-group $RG \
  --enable-versioning true
```

3. Criar containers e fazer upload de dados de teste:

```bash
CONN_PRIMARY=$(az storage account show-connection-string --name $STORAGE_PRIMARY --resource-group $RG -o tsv)
CONN_SECONDARY=$(az storage account show-connection-string --name $STORAGE_SECONDARY --resource-group $RG -o tsv)

# Create containers on primary
az storage container create --name app-logs --connection-string "$CONN_PRIMARY"
az storage container create --name documents --connection-string "$CONN_PRIMARY"
az storage container create --name replicated-data --connection-string "$CONN_PRIMARY"

# Create matching container on secondary for replication
az storage container create --name replicated-data --connection-string "$CONN_SECONDARY"

# Upload test data
for i in $(seq 1 10); do
  echo "Log entry $i | $(date -u +%Y-%m-%dT%H:%M:%SZ)" > log-$i.txt
  az storage blob upload --container-name app-logs --file log-$i.txt --name "2025/01/log-$i.txt" --connection-string "$CONN_PRIMARY" --overwrite 2>/dev/null
done

echo "Important document for replication test" > repl-test.txt
az storage blob upload --container-name replicated-data --file repl-test.txt --name repl-test.txt --connection-string "$CONN_PRIMARY"
```

### Parte 2: polÃ­ticas de gerenciamento de ciclo de vida

4. Criar uma polÃ­tica de gerenciamento de ciclo de vida com as seguintes regras:

:::info InformaÃ§Ã£o

**Gerenciamento de ciclo de vida** transiciona automaticamente blobs entre camadas e os exclui com base na idade. Esta Ã© a principal ferramenta para controlar custos de armazenamento em escala.

:::
<Tabs>
<TabItem value="cli" label="Azure CLI">

```bash
cat <<'EOF' > lifecycle-policy.json
{
  "rules": [
    {
      "enabled": true,
      "name": "MoveToCoolAfter30Days",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "tierToCool": {
              "daysAfterModificationGreaterThan": 30
            }
          }
        },
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["app-logs/"]
        }
      }
    },
    {
      "enabled": true,
      "name": "MoveToArchiveAfter90Days",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "tierToArchive": {
              "daysAfterModificationGreaterThan": 90
            }
          }
        },
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["app-logs/"]
        }
      }
    },
    {
      "enabled": true,
      "name": "DeleteAfter365Days",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "delete": {
              "daysAfterModificationGreaterThan": 365
            }
          }
        },
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["app-logs/"]
        }
      }
    },
    {
      "enabled": true,
      "name": "CleanupSnapshots",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "snapshot": {
            "delete": {
              "daysAfterCreationGreaterThan": 90
            }
          },
          "version": {
            "delete": {
              "daysAfterCreationGreaterThan": 90
            }
          }
        },
        "filters": {
          "blobTypes": ["blockBlob"]
        }
      }
    }
  ]
}
EOF

az storage account management-policy create \
  --account-name $STORAGE_PRIMARY \
  --resource-group $RG \
  --policy @lifecycle-policy.json
```

</TabItem>
<TabItem value="portal" label="Portal">

1. VÃ¡ para sua **Storage account** â†’ **Data management** â†’ **Lifecycle management**
2. Clique em **+ Add a rule**
3. **Regra 1**: Nome: `MoveToCoolAfter30Days`
   - Escopo: Limitar blobs com filtros â†’ Prefixo: `app-logs/`
   - Base blobs: Mover para armazenamento Cool â†’ 30 dias apÃ³s Ãºltima modificaÃ§Ã£o
4. **Regra 2**: Nome: `MoveToArchiveAfter90Days`
   - Mesmo filtro â†’ Mover para armazenamento Archive â†’ 90 dias apÃ³s Ãºltima modificaÃ§Ã£o
5. **Regra 3**: Nome: `DeleteAfter365Days`
   - Mesmo filtro â†’ Excluir o blob â†’ 365 dias apÃ³s Ãºltima modificaÃ§Ã£o
6. **Regra 4**: Nome: `CleanupSnapshots`
   - Sem filtro de prefixo â†’ Excluir snapshots â†’ 90 dias apÃ³s criaÃ§Ã£o
   - Excluir versÃµes â†’ 90 dias apÃ³s criaÃ§Ã£o

</TabItem>
</Tabs>

5. Verificar a polÃ­tica de ciclo de vida:

```bash
az storage account management-policy show \
  --account-name $STORAGE_PRIMARY \
  --resource-group $RG \
  --query "policy.rules[].{Name:name, Enabled:enabled}" -o table
```

### Parte 3: acesso baseado em identidade para Azure Files

:::tip Dica

O acesso baseado em identidade permite que usuÃ¡rios se autentiquem em compartilhamentos Azure Files usando suas credenciais do Entra ID em vez de chaves de storage account. Isso Ã© mais seguro e permite permissÃµes por usuÃ¡rio/grupo no estilo NTFS.

:::
6. Criar um compartilhamento de arquivos para acesso baseado em identidade:

```bash
az storage share-rm create \
  --storage-account $STORAGE_PRIMARY \
  --resource-group $RG \
  --name secure-share \
  --quota 50
```

7. Habilitar autenticaÃ§Ã£o do Entra ID Domain Services para a storage account:

<Tabs>
<TabItem value="cli" label="Azure CLI">

```bash
# Enable Entra ID kerberos authentication
az storage account update \
  --name $STORAGE_PRIMARY \
  --resource-group $RG \
  --enable-files-aadkerb true
```

:::note

A autenticaÃ§Ã£o completa via Entra ID Kerberos para Azure Files requer configuraÃ§Ã£o adicional incluindo a configuraÃ§Ã£o do ticket de concessÃ£o de ticket Kerberos e a configuraÃ§Ã£o de permissÃµes no nÃ­vel de compartilhamento e no nÃ­vel de diretÃ³rio/arquivo. Para este desafio, habilitar o sinalizador de recurso Ã© suficiente.

:::
</TabItem>
<TabItem value="portal" label="Portal">

1. VÃ¡ para sua **Storage account** â†’ **File shares** â†’ **Active Directory**
2. Em **Identity-based access**, clique em **Set up** ao lado de **Microsoft Entra Kerberos**
3. Siga o assistente para habilitar a autenticaÃ§Ã£o do Entra ID

</TabItem>
</Tabs>

8. Atribuir permissÃµes RBAC no nÃ­vel do compartilhamento:

```bash
# Assign "Storage file Data SMB share contributor" role to a user or group
# This allows read/write access to the file share via SMB
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
STORAGE_ID=$(az storage account show --name $STORAGE_PRIMARY --resource-group $RG --query id -o tsv)

# Replace with your actual user or group object ID
# USER_ID=$(az ad user show --id "alice@YOUR_TENANT.onmicrosoft.com" --query id -o tsv)
# az role assignment create \
# --assignee $user_id \
# --role "Storage file Data SMB share contributor" \
# --scope "$STORAGE_ID/fileServices/default/fileshares/secure-share"
```

:::info InformaÃ§Ã£o

O acesso baseado em identidade do Azure Files usa um **modelo de permissÃ£o de duas camadas**:
1. **PermissÃµes no nÃ­vel do compartilhamento**: AtribuÃ­das via RBAC (Storage File Data SMB Share Reader/Contributor/Elevated Contributor)
2. **PermissÃµes no nÃ­vel de diretÃ³rio/arquivo**: Configuradas usando ACLs NTFS do Windows apÃ³s montar o compartilhamento

A permissÃ£o efetiva Ã© a **interseÃ§Ã£o** de ambas as camadas | um usuÃ¡rio precisa de acesso tanto no nÃ­vel do compartilhamento quanto no nÃ­vel do diretÃ³rio.

:::
### Parte 4: replicaÃ§Ã£o de objetos

9. Configurar replicaÃ§Ã£o de objetos da conta primÃ¡ria para a conta secundÃ¡ria:

<Tabs>
<TabItem value="cli" label="Azure CLI">

```bash
# Create a replication policy
cat <<EOF > replication-policy.json
{
  "sourceAccount": "$STORAGE_PRIMARY",
  "destinationAccount": "$STORAGE_SECONDARY",
  "rules": [
    {
      "sourceContainer": "replicated-data",
      "destinationContainer": "replicated-data",
      "filters": {
        "minCreationTime": "2024-01-01T00:00:00Z"
      }
    }
  ]
}
EOF

az storage account or-policy create \
  --account-name $STORAGE_SECONDARY \
  --resource-group $RG \
  --source-account $STORAGE_PRIMARY \
  --destination-account $STORAGE_SECONDARY \
  --source-container replicated-data \
  --destination-container replicated-data \
  --min-creation-time "2024-01-01T00:00:00Z"
```

</TabItem>
<TabItem value="portal" label="Portal">

1. VÃ¡ para a storage account de **destino** â†’ **Data management** â†’ **Object replication**
2. Clique em **Set up replication rules**
3. Selecione a storage account de **origem**
4. Emparelhe os containers: `replicated-data` (origem) â†’ `replicated-data` (destino)
5. Opcionalmente filtre por tempo de criaÃ§Ã£o ou prefixo
6. Clique em **Save**

</TabItem>
</Tabs>

10. Verificar que a replicaÃ§Ã£o estÃ¡ configurada:

```bash
# Check replication policies on the destination account
az storage account or-policy list --account-name $STORAGE_SECONDARY --resource-group $RG -o table
```

11. Fazer upload de um novo blob na origem e verificar que ele replica:

```bash
echo "New data to replicate | $(date -u)" > new-repl-data.txt
az storage blob upload --container-name replicated-data --file new-repl-data.txt --name new-repl-data.txt --connection-string "$CONN_PRIMARY" --overwrite

# Wait a few minutes, then check the destination
sleep 60
az storage blob list --container-name replicated-data --connection-string "$CONN_SECONDARY" \
  --query "[].{Name:name, LastModified:properties.lastModified}" -o table
```

:::warning AtenÃ§Ã£o

A replicaÃ§Ã£o de objetos Ã© **assÃ­ncrona**. Pode levar vÃ¡rios minutos para os blobs aparecerem na conta de destino. NÃ£o hÃ¡ SLA sobre o tempo de replicaÃ§Ã£o para contas padrÃ£o.

:::
### Parte 5: polÃ­ticas de acesso armazenadas (Revisitadas)

12. Criar polÃ­ticas de acesso armazenadas para controle granular:

```bash
END_DATE=$(date -u -d "+7 days" '+%Y-%m-%dT%H:%MZ' 2>/dev/null || date -u -v+7d '+%Y-%m-%dT%H:%MZ')

# Read-only policy for app-logs
az storage container policy create \
  --container-name app-logs \
  --name "LogReadersPolicy" \
  --permissions rl \
  --expiry "$END_DATE" \
  --connection-string "$CONN_PRIMARY"

# Read-write policy for documents
az storage container policy create \
  --container-name documents \
  --name "DocEditorsPolicy" \
  --permissions rwdl \
  --expiry "$END_DATE" \
  --connection-string "$CONN_PRIMARY"
```

13. Gerar tokens SAS a partir das polÃ­ticas de acesso armazenadas:

```bash
# SAS from the LogReadersPolicy
LOG_SAS=$(az storage container generate-sas \
  --name app-logs \
  --policy-name "LogReadersPolicy" \
  --connection-string "$CONN_PRIMARY" \
  -o tsv)

echo "Log Reader SAS: $LOG_SAS"

# Test the SAS by listing blobs
az storage blob list --container-name app-logs \
  --account-name $STORAGE_PRIMARY \
  --sas-token "$LOG_SAS" \
  --query "[].name" -o tsv
```

14. Revogar acesso excluindo a polÃ­tica de acesso armazenada:

```bash
# This immediately invalidates all SAS tokens linked to this policy
az storage container policy delete \
  --container-name app-logs \
  --name "LogReadersPolicy" \
  --connection-string "$CONN_PRIMARY"
```

## CritÃ©rios de sucesso

<SuccessChecklist
  storageKey="az104-challenge-06"
  items={[
    "Duas storage accounts existem em regiÃµes diferentes com versionamento habilitado",
    "PolÃ­tica de gerenciamento de ciclo de vida tem 4 regras: Cool apÃ³s 30d, Archive apÃ³s 90d, Excluir apÃ³s 365d, Limpar snapshots apÃ³s 90d",
    "PolÃ­tica de ciclo de vida tem como alvo o prefixo app-logs/",
    "Compartilhamento de arquivos secure-share existe com Entra ID Kerberos habilitado",
    "ReplicaÃ§Ã£o de objetos estÃ¡ configurada da primÃ¡ria para a secundÃ¡ria para o container replicated-data",
    "ReplicaÃ§Ã£o pode ser verificada (blob aparece no destino)",
    "PolÃ­ticas de acesso armazenadas criadas e testadas",
    "RevogaÃ§Ã£o de SAS via exclusÃ£o de polÃ­tica demonstrada"
  ]}
/>
## Dicas

<details>
<summary>Dica 1: CondiÃ§Ãµes de regra de polÃ­tica de ciclo de vida</summary>

Regras de ciclo de vida suportam estas condiÃ§Ãµes:

| CondiÃ§Ã£o | DescriÃ§Ã£o | Exemplo |
|----------|-----------|---------|
| `daysAfterModificationGreaterThan` | Dias desde a Ãºltima modificaÃ§Ã£o do blob | Mover para Cool apÃ³s 30 dias sem atividade |
| `daysAfterCreationGreaterThan` | Dias desde a criaÃ§Ã£o do blob | Excluir arquivos temporÃ¡rios apÃ³s 7 dias |
| `daysAfterLastAccessTimeGreaterThan` | Dias desde a Ãºltima leitura (requer rastreamento de acesso) | Arquivar dados nÃ£o lidos apÃ³s 60 dias |
| `daysAfterLastTierChangeGreaterThan` | Dias desde a Ãºltima mudanÃ§a de camada | Prevenir mudanÃ§as rÃ¡pidas de camada |

:::tip Dica

Para usar `daysAfterLastAccessTimeGreaterThan`, vocÃª deve habilitar o **rastreamento de tempo de Ãºltimo acesso** na storage account:
```bash
az storage account blob-service-properties update \
  --account-name $STORAGE_PRIMARY --resource-group $RG \
  --enable-last-access-tracking true
```

:::
</details>

<details>
<summary>Dica 2: PrÃ©-requisitos para replicaÃ§Ã£o de objetos</summary>

A replicaÃ§Ã£o de objetos requer:
1. **Versionamento de blob** habilitado em ambas as contas de origem e destino
2. **Change feed** habilitado na conta de origem
3. Ambas as contas devem ser **StorageV2** (General Purpose v2) ou **BlobStorage**
4. As contas podem estar em **regiÃµes diferentes** (replicaÃ§Ã£o entre regiÃµes)
5. As contas podem estar em **assinaturas diferentes** (replicaÃ§Ã£o entre assinaturas)
6. As contas **nÃ£o** devem ter uma polÃ­tica de imutabilidade no container de destino

A replicaÃ§Ã£o de objetos **nÃ£o** suporta:
- Snapshots de blob (apenas a versÃ£o atual Ã© replicada)
- Blobs na camada Archive
- Blobs criptografados com chaves fornecidas pelo cliente

</details>

<details>
<summary>Dica 3: ReferÃªncia de funÃ§Ãµes de acesso baseado em identidade</summary>

| FunÃ§Ã£o RBAC | NÃ­vel de PermissÃ£o |
|-------------|-------------------|
| Storage File Data SMB Share Reader | Acesso de leitura a arquivos e diretÃ³rios |
| Storage File Data SMB Share Contributor | Acesso de leitura, escrita, exclusÃ£o a arquivos e diretÃ³rios |
| Storage File Data SMB Share Elevated Contributor | Acesso de leitura, escrita, exclusÃ£o, modificar ACLs NTFS |

Atribua essas funÃ§Ãµes no **escopo do compartilhamento de arquivos** (nÃ£o no escopo da storage account):
```text
/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/{account}/fileServices/default/fileshares/{share}
```

</details>

<details>
<summary>Dica 4: Limites da polÃ­tica de ciclo de vida</summary>

- MÃ¡ximo de **100 regras** por polÃ­tica
- Cada regra pode ter mÃºltiplas aÃ§Ãµes (transiÃ§Ãµes de camada, exclusÃ£o)
- AÃ§Ãµes sÃ£o processadas uma vez por dia (nÃ£o em tempo real)
- Filtros de prefixo correspondem desde o inÃ­cio do nome do blob
- VocÃª pode combinar filtros de prefixo com filtros de tag de Ã­ndice de blob

</details>

<details>
<summary>Dica 5: SoluÃ§Ã£o de problemas de replicaÃ§Ã£o de objetos</summary>

```bash
# Check replication status on a specific blob
az storage blob show \
  --container-name replicated-data \
  --name repl-test.txt \
  --account-name $STORAGE_PRIMARY \
  --query "properties.objectReplicationSourceProperties" \
  --connection-string "$CONN_PRIMARY"

# List all replication policies
az storage account or-policy list --account-name $STORAGE_SECONDARY --resource-group $RG

# Check rules within a policy
POLICY_ID=$(az storage account or-policy list --account-name $STORAGE_SECONDARY --resource-group $RG --query "[0].policyId" -o tsv)
az storage account or-policy rule list --account-name $STORAGE_SECONDARY --resource-group $RG --policy-id $POLICY_ID -o table
```

</details>

## Recursos de aprendizado

- [VisÃ£o geral do gerenciamento de ciclo de vida](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)
- [Configurar polÃ­tica de gerenciamento de ciclo de vida](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)
- [VisÃ£o geral da replicaÃ§Ã£o de objetos](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview)
- [Acesso baseado em identidade para Azure Files](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-active-directory-overview)
- [PolÃ­ticas de acesso armazenadas](https://learn.microsoft.com/en-us/rest/api/storageservices/define-stored-access-policy)
- [Configurar Microsoft Entra Kerberos para Azure Files](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-identity-auth-azure-active-directory-enable)

## Quebra & conserta

ApÃ³s completar o desafio, tente estes cenÃ¡rios de soluÃ§Ã£o de problemas:

1. **Conflito de polÃ­tica de ciclo de vida**: Crie uma regra que move blobs para Archive apÃ³s 30 dias E outra regra que move blobs para Cool apÃ³s 60 dias. O que acontece? (A regra de Archive vence porque age primeiro. O ciclo de vida aplica a aÃ§Ã£o mais agressiva para uma determinada idade.)

2. **ReplicaÃ§Ã£o nÃ£o estÃ¡ funcionando**: A replicaÃ§Ã£o de objetos estÃ¡ configurada mas os blobs nÃ£o estÃ£o aparecendo no destino. Verifique:
   - O versionamento estÃ¡ habilitado em **ambas** as contas?
   - O change feed estÃ¡ habilitado na conta de **origem**?
   - O blob estÃ¡ na camada Archive? (Blobs arquivados nÃ£o sÃ£o replicados.)
   - Tempo suficiente se passou? (A replicaÃ§Ã£o Ã© assÃ­ncrona, pode levar minutos.)

3. **Token SAS ainda funciona apÃ³s exclusÃ£o da polÃ­tica**: VocÃª excluiu uma polÃ­tica de acesso armazenada, mas o token SAS daquela polÃ­tica deveria parar de funcionar. Teste isso. Se ainda funcionar, verifique se o SAS foi gerado com uma expiraÃ§Ã£o explÃ­cita (SAS autÃ´nomo) ou se era realmente vinculado Ã  polÃ­tica.

4. **Acesso baseado em identidade negado**: Um usuÃ¡rio tem `Storage File Data SMB Share Contributor` no nÃ­vel do compartilhamento mas recebe "Access Denied" ao abrir uma pasta. O que estÃ¡ errado? (ACLs NTFS no nÃ­vel do diretÃ³rio podem estar restringindo o acesso | lembre-se do modelo de duas camadas.)

## Teste seus conhecimentos

<details>
<summary>1. Quais sÃ£o as condiÃ§Ãµes que vocÃª pode usar em regras de gerenciamento de ciclo de vida?</summary>

**CondiÃ§Ãµes de base blob**:
- `daysAfterModificationGreaterThan` | dias desde a Ãºltima modificaÃ§Ã£o
- `daysAfterCreationGreaterThan` | dias desde a criaÃ§Ã£o
- `daysAfterLastAccessTimeGreaterThan` | dias desde a Ãºltima leitura (requer rastreamento de acesso)
- `daysAfterLastTierChangeGreaterThan` | dias desde a Ãºltima mudanÃ§a de camada

**CondiÃ§Ãµes de snapshot/versÃ£o**:
- `daysAfterCreationGreaterThan` | dias desde a criaÃ§Ã£o do snapshot/versÃ£o

**OpÃ§Ãµes de filtro**:
- `blobTypes` | filtrar por block blob, append blob
- `prefixMatch` | filtrar por prefixo do nome do blob (ex: `logs/`)
- `blobIndexMatch` | filtrar por tags de Ã­ndice de blob

**Dica para o exame**: Saiba a diferenÃ§a entre `daysAfterModification` e `daysAfterCreation`. Modification Ã© redefinido sempre que o blob Ã© escrito; creation Ã© definido uma vez.

</details>

<details>
<summary>2. Quais sÃ£o os prÃ©-requisitos para replicaÃ§Ã£o de objetos?</summary>

1. **Versionamento de blob** deve estar habilitado em ambas as contas de origem e destino
2. **Change feed** deve estar habilitado na conta de origem
3. Ambas as contas devem ser **General Purpose v2** (StorageV2) ou BlobStorage
4. Origem e destino podem estar em **regiÃµes diferentes** e **assinaturas diferentes**
5. O container de destino **nÃ£o** deve ter uma polÃ­tica de imutabilidade de blob
6. Blobs na camada **Archive** **nÃ£o** sÃ£o replicados
7. Blobs criptografados com **chaves fornecidas pelo cliente** nÃ£o sÃ£o replicados
8. O `AllowCrossTenantReplication` da conta de origem deve ser true para cenÃ¡rios entre tenants

</details>

<details>
<summary>3. Qual Ã© o modelo de permissÃ£o de duas camadas para acesso baseado em identidade do Azure Files?</summary>

**Camada 1: PermissÃµes no nÃ­vel do compartilhamento** (RBAC)
- AtribuÃ­das usando funÃ§Ãµes Azure RBAC no escopo do compartilhamento de arquivos
- FunÃ§Ãµes: Reader, Contributor, Elevated Contributor
- Controla quem pode acessar o compartilhamento

**Camada 2: PermissÃµes no nÃ­vel de diretÃ³rio/arquivo** (ACLs NTFS)
- Configuradas usando ferramentas de ACL do Windows (icacls, propriedades do Windows Explorer)
- Requer montar o compartilhamento primeiro
- Controla acesso granular dentro do compartilhamento

**PermissÃ£o efetiva = interseÃ§Ã£o de ambas as camadas**

Um usuÃ¡rio deve ter acesso tanto no nÃ­vel do compartilhamento QUANTO no nÃ­vel do diretÃ³rio. Se RBAC concede Contributor mas ACLs NTFS negam leitura em uma pasta, o usuÃ¡rio nÃ£o pode ler aquela pasta.

</details>

<details>
<summary>4. Com que frequÃªncia o gerenciamento de ciclo de vida Ã© executado?</summary>

O gerenciamento de ciclo de vida Ã© executado **uma vez por dia**. O horÃ¡rio exato nÃ£o Ã© garantido | o Azure processa regras de ciclo de vida pelo menos uma vez a cada 24 horas, mas nÃ£o hÃ¡ SLA sobre o horÃ¡rio exato de execuÃ§Ã£o.

Para uma polÃ­tica recÃ©m-criada ou modificada, a primeira execuÃ§Ã£o pode levar atÃ© **24 horas** para iniciar. Depois disso, Ã© executada diariamente.

**Importante**: Isso significa que o gerenciamento de ciclo de vida **nÃ£o** Ã© adequado para gerenciamento de dados em tempo real. Se vocÃª precisa de mudanÃ§as de camada imediatas, use `az storage blob set-tier` ou a REST API diretamente.

</details>

<details>
<summary>5. VocÃª pode replicar blobs entre storage accounts em assinaturas diferentes?</summary>

**Sim!** A replicaÃ§Ã£o de objetos suporta:
- ReplicaÃ§Ã£o na **mesma regiÃ£o**
- ReplicaÃ§Ã£o **entre regiÃµes**
- ReplicaÃ§Ã£o **entre assinaturas**
- ReplicaÃ§Ã£o **entre tenants** (se `AllowCrossTenantReplication` estiver habilitado)

A conta de destino cria a polÃ­tica de replicaÃ§Ã£o e especÃ­fica a conta de origem. Ambas as contas devem atender aos prÃ©-requisitos (versionamento, change feed, etc.).

</details>

## Limpeza

```bash
# Delete the resource group (removes both storage accounts and all data)
az group delete --name rg-lifecycle-challenge --yes --no-wait

# Clean up local files
rm -f lifecycle-policy.json replication-policy.json
rm -f log-*.txt repl-test.txt new-repl-data.txt
```

---

**PrÃ³ximo**: [Desafio 07 | ARM Templates & Bicep](/docs/az-104/compute/challenge-07)
