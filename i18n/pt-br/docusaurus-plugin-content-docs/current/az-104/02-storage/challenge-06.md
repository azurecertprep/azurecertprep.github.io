---
sidebar_position: 3
title: "Challenge 06 | Storage Security & Lifecycle"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 06: Segurança de Storage & Ciclo de Vida

> **Tempo estimado**: 60-75 min | **Custo estimado**: ~$1.00 (duas storage accounts) | **Peso no exame**: 15-20%

## Introdução

A conta do Azure Storage da Contoso triplicou no último trimestre. O culpado: ninguém está limpando dados antigos. Arquivos de log de 2023 estão na camada Hot junto com dados de produção atuais, e não há política automatizada para mover dados envelhecendo para camadas mais baratas. Além disso, a equipe de segurança quer acesso baseado em identidade para Azure Files em vez de chaves compartilhadas, e a equipe de conformidade precisa de dados replicados para uma segunda região.

Sua missão: implementar políticas de gerenciamento de ciclo de vida para controlar custos, configurar acesso baseado em identidade e configurar replicação de objetos entre regiões para continuidade de negócios.

## Habilidades do Exame Cobertas

- ✅ Configurar acesso baseado em identidade para Azure Files
- ✅ Criar e configurar políticas de acesso armazenadas
- ✅ Configurar políticas de gerenciamento de ciclo de vida
- ✅ Configurar replicação de objetos entre storage accounts

## Referência Sysadmin ↔ Azure

| On-Prem / Sysadmin | Equivalente no Azure | Observações |
|---------------------|----------------------|-------------|
| Cotas de servidor de arquivos & políticas de arquivamento | Gerenciamento de ciclo de vida | Automatizar transições de camada & exclusão |
| DFS Replication | Replicação de objetos | Replicação assíncrona de blob entre regiões |
| ACLs NTFS em compartilhamentos de arquivos | Acesso baseado em identidade (Entra ID) | Permissões por usuário/grupo no compartilhamento |
| Políticas de retenção de dados | Regras de gerenciamento de ciclo de vida | Limpeza automatizada de dados por idade |
| Arquivamento em fita | Migrar para camada Archive após N dias | Armazenamento frio, horas para recuperar |
| Backup para site de DR | GRS + Replicação de objetos | Redundância geográfica |

## Descrição

### Parte 1: Configurar o Ambiente

1. Criar duas storage accounts em regiões diferentes (necessário para replicação de objetos):

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

2. Habilitar versionamento de blob em ambas as contas (necessário para replicação de objetos) e habilitar change feed na origem:

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

### Parte 2: Políticas de Gerenciamento de Ciclo de Vida

4. Criar uma política de gerenciamento de ciclo de vida com as seguintes regras:

:::info Informação

**Gerenciamento de ciclo de vida** transiciona automaticamente blobs entre camadas e os exclui com base na idade. Esta é a principal ferramenta para controlar custos de armazenamento em escala.
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

1. Vá para sua **Storage account** → **Data management** → **Lifecycle management**
2. Clique em **+ Add a rule**
3. **Regra 1**: Nome: `MoveToCoolAfter30Days`
   - Escopo: Limitar blobs com filtros → Prefixo: `app-logs/`
   - Base blobs: Mover para armazenamento Cool → 30 dias após última modificação
4. **Regra 2**: Nome: `MoveToArchiveAfter90Days`
   - Mesmo filtro → Mover para armazenamento Archive → 90 dias após última modificação
5. **Regra 3**: Nome: `DeleteAfter365Days`
   - Mesmo filtro → Excluir o blob → 365 dias após última modificação
6. **Regra 4**: Nome: `CleanupSnapshots`
   - Sem filtro de prefixo → Excluir snapshots → 90 dias após criação
   - Excluir versões → 90 dias após criação

</TabItem>
</Tabs>

5. Verificar a política de ciclo de vida:

```bash
az storage account management-policy show \
  --account-name $STORAGE_PRIMARY \
  --resource-group $RG \
  --query "policy.rules[].{Name:name, Enabled:enabled}" -o table
```

### Parte 3: Acesso Baseado em Identidade para Azure Files

:::tip Dica

O acesso baseado em identidade permite que usuários se autentiquem em compartilhamentos Azure Files usando suas credenciais do Entra ID em vez de chaves de storage account. Isso é mais seguro e permite permissões por usuário/grupo no estilo NTFS.
:::

6. Criar um compartilhamento de arquivos para acesso baseado em identidade:

```bash
az storage share-rm create \
  --storage-account $STORAGE_PRIMARY \
  --resource-group $RG \
  --name secure-share \
  --quota 50
```

7. Habilitar autenticação do Entra ID Domain Services para a storage account:

<Tabs>
<TabItem value="cli" label="Azure CLI">

```bash
# Enable Entra ID Kerberos authentication
az storage account update \
  --name $STORAGE_PRIMARY \
  --resource-group $RG \
  --enable-files-aadkerb true
```

:::note

A autenticação completa via Entra ID Kerberos para Azure Files requer configuração adicional incluindo a configuração do ticket de concessão de ticket Kerberos e a configuração de permissões no nível de compartilhamento e no nível de diretório/arquivo. Para este desafio, habilitar o sinalizador de recurso é suficiente.
:::

</TabItem>
<TabItem value="portal" label="Portal">

1. Vá para sua **Storage account** → **File shares** → **Active Directory**
2. Em **Identity-based access**, clique em **Set up** ao lado de **Microsoft Entra Kerberos**
3. Siga o assistente para habilitar a autenticação do Entra ID

</TabItem>
</Tabs>

8. Atribuir permissões RBAC no nível do compartilhamento:

```bash
# Assign "Storage File Data SMB Share Contributor" role to a user or group
# This allows read/write access to the file share via SMB
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
STORAGE_ID=$(az storage account show --name $STORAGE_PRIMARY --resource-group $RG --query id -o tsv)

# Replace with your actual user or group object ID
# USER_ID=$(az ad user show --id "alice@YOUR_TENANT.onmicrosoft.com" --query id -o tsv)
# az role assignment create \
#   --assignee $USER_ID \
#   --role "Storage File Data SMB Share Contributor" \
#   --scope "$STORAGE_ID/fileServices/default/fileshares/secure-share"
```

:::info Informação

O acesso baseado em identidade do Azure Files usa um **modelo de permissão de duas camadas**:
1. **Permissões no nível do compartilhamento**: Atribuídas via RBAC (Storage File Data SMB Share Reader/Contributor/Elevated Contributor)
2. **Permissões no nível de diretório/arquivo**: Configuradas usando ACLs NTFS do Windows após montar o compartilhamento

A permissão efetiva é a **interseção** de ambas as camadas | um usuário precisa de acesso tanto no nível do compartilhamento quanto no nível do diretório.
:::

### Parte 4: Replicação de Objetos

9. Configurar replicação de objetos da conta primária para a conta secundária:

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

1. Vá para a storage account de **destino** → **Data management** → **Object replication**
2. Clique em **Set up replication rules**
3. Selecione a storage account de **origem**
4. Emparelhe os containers: `replicated-data` (origem) → `replicated-data` (destino)
5. Opcionalmente filtre por tempo de criação ou prefixo
6. Clique em **Save**

</TabItem>
</Tabs>

10. Verificar que a replicação está configurada:

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

:::warning Atenção

A replicação de objetos é **assíncrona**. Pode levar vários minutos para os blobs aparecerem na conta de destino. Não há SLA sobre o tempo de replicação para contas padrão.
:::

### Parte 5: Políticas de Acesso Armazenadas (Revisitadas)

12. Criar políticas de acesso armazenadas para controle granular:

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

13. Gerar tokens SAS a partir das políticas de acesso armazenadas:

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

14. Revogar acesso excluindo a política de acesso armazenada:

```bash
# This immediately invalidates all SAS tokens linked to this policy
az storage container policy delete \
  --container-name app-logs \
  --name "LogReadersPolicy" \
  --connection-string "$CONN_PRIMARY"
```

## Critérios de Sucesso

- [ ] Duas storage accounts existem em regiões diferentes com versionamento habilitado
- [ ] Política de gerenciamento de ciclo de vida tem 4 regras: Cool após 30d, Archive após 90d, Excluir após 365d, Limpar snapshots após 90d
- [ ] Política de ciclo de vida tem como alvo o prefixo `app-logs/`
- [ ] Compartilhamento de arquivos `secure-share` existe com Entra ID Kerberos habilitado
- [ ] Replicação de objetos está configurada da primária para a secundária para o container `replicated-data`
- [ ] Replicação pode ser verificada (blob aparece no destino)
- [ ] Políticas de acesso armazenadas criadas e testadas
- [ ] Revogação de SAS via exclusão de política demonstrada

## Dicas

<details>
<summary>Dica 1: Condições de regra de política de ciclo de vida</summary>

Regras de ciclo de vida suportam estas condições:

| Condição | Descrição | Exemplo |
|----------|-----------|---------|
| `daysAfterModificationGreaterThan` | Dias desde a última modificação do blob | Mover para Cool após 30 dias sem atividade |
| `daysAfterCreationGreaterThan` | Dias desde a criação do blob | Excluir arquivos temporários após 7 dias |
| `daysAfterLastAccessTimeGreaterThan` | Dias desde a última leitura (requer rastreamento de acesso) | Arquivar dados não lidos após 60 dias |
| `daysAfterLastTierChangeGreaterThan` | Dias desde a última mudança de camada | Prevenir mudanças rápidas de camada |

:::tip Dica

Para usar `daysAfterLastAccessTimeGreaterThan`, você deve habilitar o **rastreamento de tempo de último acesso** na storage account:
```bash
az storage account blob-service-properties update \
  --account-name $STORAGE_PRIMARY --resource-group $RG \
  --enable-last-access-tracking true
```
:::

</details>

<details>
<summary>Dica 2: Pré-requisitos para replicação de objetos</summary>

A replicação de objetos requer:
1. **Versionamento de blob** habilitado em ambas as contas de origem e destino
2. **Change feed** habilitado na conta de origem
3. Ambas as contas devem ser **StorageV2** (General Purpose v2) ou **BlobStorage**
4. As contas podem estar em **regiões diferentes** (replicação entre regiões)
5. As contas podem estar em **assinaturas diferentes** (replicação entre assinaturas)
6. As contas **não** devem ter uma política de imutabilidade no container de destino

A replicação de objetos **não** suporta:
- Snapshots de blob (apenas a versão atual é replicada)
- Blobs na camada Archive
- Blobs criptografados com chaves fornecidas pelo cliente

</details>

<details>
<summary>Dica 3: Referência de funções de acesso baseado em identidade</summary>

| Função RBAC | Nível de Permissão |
|-------------|-------------------|
| Storage File Data SMB Share Reader | Acesso de leitura a arquivos e diretórios |
| Storage File Data SMB Share Contributor | Acesso de leitura, escrita, exclusão a arquivos e diretórios |
| Storage File Data SMB Share Elevated Contributor | Acesso de leitura, escrita, exclusão, modificar ACLs NTFS |

Atribua essas funções no **escopo do compartilhamento de arquivos** (não no escopo da storage account):
```
/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/{account}/fileServices/default/fileshares/{share}
```

</details>

<details>
<summary>Dica 4: Limites da política de ciclo de vida</summary>

- Máximo de **100 regras** por política
- Cada regra pode ter múltiplas ações (transições de camada, exclusão)
- Ações são processadas uma vez por dia (não em tempo real)
- Filtros de prefixo correspondem desde o início do nome do blob
- Você pode combinar filtros de prefixo com filtros de tag de índice de blob

</details>

<details>
<summary>Dica 5: Solução de problemas de replicação de objetos</summary>

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

## Recursos de Aprendizado

- [Visão geral do gerenciamento de ciclo de vida](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)
- [Configurar política de gerenciamento de ciclo de vida](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure)
- [Visão geral da replicação de objetos](https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview)
- [Acesso baseado em identidade para Azure Files](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-active-directory-overview)
- [Políticas de acesso armazenadas](https://learn.microsoft.com/en-us/rest/api/storageservices/define-stored-access-policy)
- [Configurar Microsoft Entra Kerberos para Azure Files](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-identity-auth-azure-active-directory-enable)

## Quebre & Conserte

Após completar o desafio, tente estes cenários de solução de problemas:

1. **Conflito de política de ciclo de vida**: Crie uma regra que move blobs para Archive após 30 dias E outra regra que move blobs para Cool após 60 dias. O que acontece? (A regra de Archive vence porque age primeiro. O ciclo de vida aplica a ação mais agressiva para uma determinada idade.)

2. **Replicação não está funcionando**: A replicação de objetos está configurada mas os blobs não estão aparecendo no destino. Verifique:
   - O versionamento está habilitado em **ambas** as contas?
   - O change feed está habilitado na conta de **origem**?
   - O blob está na camada Archive? (Blobs arquivados não são replicados.)
   - Tempo suficiente se passou? (A replicação é assíncrona, pode levar minutos.)

3. **Token SAS ainda funciona após exclusão da política**: Você excluiu uma política de acesso armazenada, mas o token SAS daquela política deveria parar de funcionar. Teste isso. Se ainda funcionar, verifique se o SAS foi gerado com uma expiração explícita (SAS autônomo) ou se era realmente vinculado à política.

4. **Acesso baseado em identidade negado**: Um usuário tem `Storage File Data SMB Share Contributor` no nível do compartilhamento mas recebe "Access Denied" ao abrir uma pasta. O que está errado? (ACLs NTFS no nível do diretório podem estar restringindo o acesso | lembre-se do modelo de duas camadas.)

## Teste seus Conhecimentos

<details>
<summary>1. Quais são as condições que você pode usar em regras de gerenciamento de ciclo de vida?</summary>

**Condições de base blob**:
- `daysAfterModificationGreaterThan` | dias desde a última modificação
- `daysAfterCreationGreaterThan` | dias desde a criação
- `daysAfterLastAccessTimeGreaterThan` | dias desde a última leitura (requer rastreamento de acesso)
- `daysAfterLastTierChangeGreaterThan` | dias desde a última mudança de camada

**Condições de snapshot/versão**:
- `daysAfterCreationGreaterThan` | dias desde a criação do snapshot/versão

**Opções de filtro**:
- `blobTypes` | filtrar por block blob, append blob
- `prefixMatch` | filtrar por prefixo do nome do blob (ex: `logs/`)
- `blobIndexMatch` | filtrar por tags de índice de blob

**Dica para o exame**: Saiba a diferença entre `daysAfterModification` e `daysAfterCreation`. Modification é redefinido sempre que o blob é escrito; creation é definido uma vez.

</details>

<details>
<summary>2. Quais são os pré-requisitos para replicação de objetos?</summary>

1. **Versionamento de blob** deve estar habilitado em ambas as contas de origem e destino
2. **Change feed** deve estar habilitado na conta de origem
3. Ambas as contas devem ser **General Purpose v2** (StorageV2) ou BlobStorage
4. Origem e destino podem estar em **regiões diferentes** e **assinaturas diferentes**
5. O container de destino **não** deve ter uma política de imutabilidade de blob
6. Blobs na camada **Archive** **não** são replicados
7. Blobs criptografados com **chaves fornecidas pelo cliente** não são replicados
8. O `AllowCrossTenantReplication` da conta de origem deve ser true para cenários entre tenants

</details>

<details>
<summary>3. Qual é o modelo de permissão de duas camadas para acesso baseado em identidade do Azure Files?</summary>

**Camada 1: Permissões no nível do compartilhamento** (RBAC)
- Atribuídas usando funções Azure RBAC no escopo do compartilhamento de arquivos
- Funções: Reader, Contributor, Elevated Contributor
- Controla quem pode acessar o compartilhamento

**Camada 2: Permissões no nível de diretório/arquivo** (ACLs NTFS)
- Configuradas usando ferramentas de ACL do Windows (icacls, propriedades do Windows Explorer)
- Requer montar o compartilhamento primeiro
- Controla acesso granular dentro do compartilhamento

**Permissão efetiva = interseção de ambas as camadas**

Um usuário deve ter acesso tanto no nível do compartilhamento QUANTO no nível do diretório. Se RBAC concede Contributor mas ACLs NTFS negam leitura em uma pasta, o usuário não pode ler aquela pasta.

</details>

<details>
<summary>4. Com que frequência o gerenciamento de ciclo de vida é executado?</summary>

O gerenciamento de ciclo de vida é executado **uma vez por dia**. O horário exato não é garantido | o Azure processa regras de ciclo de vida pelo menos uma vez a cada 24 horas, mas não há SLA sobre o horário exato de execução.

Para uma política recém-criada ou modificada, a primeira execução pode levar até **24 horas** para iniciar. Depois disso, é executada diariamente.

**Importante**: Isso significa que o gerenciamento de ciclo de vida **não** é adequado para gerenciamento de dados em tempo real. Se você precisa de mudanças de camada imediatas, use `az storage blob set-tier` ou a REST API diretamente.

</details>

<details>
<summary>5. Você pode replicar blobs entre storage accounts em assinaturas diferentes?</summary>

**Sim!** A replicação de objetos suporta:
- Replicação na **mesma região**
- Replicação **entre regiões**
- Replicação **entre assinaturas**
- Replicação **entre tenants** (se `AllowCrossTenantReplication` estiver habilitado)

A conta de destino cria a política de replicação e especifica a conta de origem. Ambas as contas devem atender aos pré-requisitos (versionamento, change feed, etc.).

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

**Próximo**: [Desafio 07 | ARM Templates & Bicep](/docs/az-104/compute/challenge-07)
