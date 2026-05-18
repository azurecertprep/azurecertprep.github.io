---
sidebar_position: 2
title: "Challenge 05 | Blob Storage & Azure Files"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 05: Blob Storage & Azure Files

> **Tempo estimado**: 60-75 min | **Custo estimado**: ~$0.50 | **Peso no exame**: 15-20%

## Introdução

A equipe de aplicações da Contoso armazena imagens de perfil de usuários, arquivos de log e relatórios no Azure. Enquanto isso, a equipe de finanças precisa de um sistema de arquivos compartilhado que possam montar a partir de seus desktops Windows | assim como o servidor de arquivos local ao qual estão acostumados. Você precisa configurar tanto o Blob Storage (para dados de aplicações) quanto o Azure Files (para o drive compartilhado da equipe de finanças).

Entender a diferença entre Blob Storage e Azure Files | e quando usar cada um | é fundamental para o exame AZ-104. Este desafio oferece experiência prática com ambos.

## Habilidades do Exame Cobertas

- ✅ Criar e configurar containers de blob
- ✅ Criar e configurar compartilhamentos de arquivos
- ✅ Configurar camadas de armazenamento (Hot, Cool, Archive)
- ✅ Configurar exclusão reversível para blobs e containers
- ✅ Configurar snapshots e versionamento de blobs
- ✅ Configurar exclusão reversível para Azure Files
- ✅ Configurar snapshots de compartilhamento de arquivos

## Referência Sysadmin ↔ Azure

| On-Prem / Sysadmin | Equivalente no Azure | Observações |
|---------------------|----------------------|-------------|
| Pasta de dados de aplicação | Container de blob | Dados não estruturados (imagens, logs, backups) |
| Compartilhamento SMB (\\server\share) | Compartilhamento Azure Files | Montável via SMB 3.0 em Windows/Linux/macOS |
| Volume Shadow Copy | Snapshots de blob / Snapshots de compartilhamento de arquivos | Recuperação pontual |
| Lixeira | Exclusão reversível | Exclusão recuperável (retenção configurável) |
| Versionamento de arquivo (DFS) | Versionamento de blob | Histórico automático de versões |
| Arquivo em fita / armazenamento offsite | Camada Archive | Custo mais baixo, horas para recuperar |
| SAN / armazenamento conectado diretamente | Compartilhamentos de arquivos Premium | Baseado em SSD, baixa latência |

## Descrição

### Parte 1: Configurar o Ambiente

1. Criar um grupo de recursos e uma storage account:

```bash
RG="rg-blob-files-challenge"
LOCATION="eastus"
STORAGE_NAME="stblobfiles$RANDOM"

az group create --name $RG --location $LOCATION

az storage account create \
  --name $STORAGE_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

# Save the connection string
CONN_STRING=$(az storage account show-connection-string --name $STORAGE_NAME --resource-group $RG -o tsv)
```

### Parte 2: Containers de Blob & Camadas de Acesso

2. Criar três containers de blob com diferentes níveis de acesso:

```bash
# Private (default): no anonymous access
az storage container create --name app-data --connection-string "$CONN_STRING"

# Private: for sensitive logs
az storage container create --name logs --connection-string "$CONN_STRING"

# Private: for archived reports
az storage container create --name archive --connection-string "$CONN_STRING"
```

3. Criar arquivos de teste e fazer upload de blobs para o container `app-data`:

```bash
echo "User profile data for Alice" > profile-alice.txt
echo "User profile data for Bob" > profile-bob.txt
echo "Application log entry 2025-01-15" > app-log-2025-01-15.txt

az storage blob upload --container-name app-data --file profile-alice.txt --name profiles/alice.txt --connection-string "$CONN_STRING"
az storage blob upload --container-name app-data --file profile-bob.txt --name profiles/bob.txt --connection-string "$CONN_STRING"
az storage blob upload --container-name logs --file app-log-2025-01-15.txt --name 2025/01/app-log-2025-01-15.txt --connection-string "$CONN_STRING"
```

4. Alterar a camada de acesso de um blob de Hot para Cool:

```bash
az storage blob set-tier \
  --container-name logs \
  --name "2025/01/app-log-2025-01-15.txt" \
  --tier Cool \
  --connection-string "$CONN_STRING"
```

5. Fazer upload de um arquivo para o container `archive` e definir para a camada Archive:

```bash
echo "Quarterly Report Q3 2024" > q3-report.txt
az storage blob upload --container-name archive --file q3-report.txt --name reports/q3-2024.txt --connection-string "$CONN_STRING" --tier Archive
```

6. Verificar as camadas de acesso:

```bash
az storage blob list --container-name app-data --connection-string "$CONN_STRING" \
  --query "[].{Name:name, Tier:properties.blobTier}" -o table

az storage blob list --container-name logs --connection-string "$CONN_STRING" \
  --query "[].{Name:name, Tier:properties.blobTier}" -o table

az storage blob list --container-name archive --connection-string "$CONN_STRING" \
  --query "[].{Name:name, Tier:properties.blobTier}" -o table
```

### Parte 3: Exclusão Reversível para Blobs & Containers

7. Habilitar exclusão reversível para blobs com período de retenção de 14 dias:

```bash
az storage account blob-service-properties update \
  --account-name $STORAGE_NAME \
  --resource-group $RG \
  --enable-delete-retention true \
  --delete-retention-days 14
```

8. Habilitar exclusão reversível para containers:

```bash
az storage account blob-service-properties update \
  --account-name $STORAGE_NAME \
  --resource-group $RG \
  --enable-container-delete-retention true \
  --container-delete-retention-days 14
```

9. Testar exclusão reversível | excluir um blob e depois recuperá-lo:

```bash
# Delete the blob
az storage blob delete --container-name app-data --name profiles/alice.txt --connection-string "$CONN_STRING"

# List deleted blobs (include soft-deleted)
az storage blob list --container-name app-data --connection-string "$CONN_STRING" --include d \
  --query "[?deleted].{Name:name, Deleted:deleted}" -o table

# Undelete the blob
az storage blob undelete --container-name app-data --name profiles/alice.txt --connection-string "$CONN_STRING"
```

### Parte 4: Versionamento de Blob

10. Habilitar versionamento de blob:

```bash
az storage account blob-service-properties update \
  --account-name $STORAGE_NAME \
  --resource-group $RG \
  --enable-versioning true
```

11. Testar o versionamento fazendo upload de uma versão modificada do mesmo blob:

```bash
echo "Updated profile data for Alice | version 2" > profile-alice-v2.txt
az storage blob upload --container-name app-data --file profile-alice-v2.txt --name profiles/alice.txt --connection-string "$CONN_STRING" --overwrite

# List versions
az storage blob list --container-name app-data --connection-string "$CONN_STRING" --include v \
  --query "[?name=='profiles/alice.txt'].{Name:name, VersionId:versionId, IsCurrentVersion:isCurrentVersion}" -o table
```

### Parte 5: Snapshots de Blob

12. Criar um snapshot de um blob:

```bash
az storage blob snapshot --container-name app-data --name profiles/bob.txt --connection-string "$CONN_STRING"
```

13. Listar snapshots:

```bash
az storage blob list --container-name app-data --connection-string "$CONN_STRING" --include s \
  --query "[?snapshot!=null].{Name:name, Snapshot:snapshot}" -o table
```

### Parte 6: Azure Files | Criar & Configurar

14. Criar um compartilhamento Azure Files para a equipe de finanças:

```bash
az storage share-rm create \
  --storage-account $STORAGE_NAME \
  --resource-group $RG \
  --name finance-share \
  --quota 50
```

15. Criar diretórios e fazer upload de arquivos para o compartilhamento:

```bash
az storage directory create --share-name finance-share --name "reports" --connection-string "$CONN_STRING"
az storage directory create --share-name finance-share --name "invoices" --connection-string "$CONN_STRING"

echo "Budget Report 2025" > budget-2025.txt
az storage file upload --share-name finance-share --source budget-2025.txt --path "reports/budget-2025.txt" --connection-string "$CONN_STRING"
```

16. Mostrar como montar o compartilhamento de arquivos no Windows:

<Tabs>
<TabItem value="windows" label="Windows (CMD)">

```cmd
REM Get the storage account key
REM Replace <storage-account-name> and <storage-account-key> with your values

net use Z: \\<storage-account-name>.file.core.windows.net\finance-share /u:AZURE\<storage-account-name> <storage-account-key>
```

</TabItem>
<TabItem value="linux" label="Linux">

```bash
# Install cifs-utils if not installed
sudo apt-get install cifs-utils

# Create mount point
sudo mkdir -p /mnt/finance-share

# Mount the file share
sudo mount -t cifs //$STORAGE_NAME.file.core.windows.net/finance-share /mnt/finance-share \
  -o vers=3.0,username=$STORAGE_NAME,password=<storage-account-key>,dir_mode=0777,file_mode=0777
```

</TabItem>
<TabItem value="portal" label="Portal (Script de Conexão)">

1. Vá para sua **Storage account** → **File shares** → **finance-share**
2. Clique em **Connect**
3. Selecione seu SO (Windows / Linux / macOS)
4. Copie e execute o script de montagem gerado automaticamente

</TabItem>
</Tabs>

### Parte 7: Snapshots de Compartilhamento de Arquivos & Exclusão Reversível

17. Habilitar exclusão reversível para Azure Files:

```bash
az storage account file-service-properties update \
  --account-name $STORAGE_NAME \
  --resource-group $RG \
  --enable-delete-retention true \
  --delete-retention-days 14
```

18. Criar um snapshot de compartilhamento de arquivos:

```bash
az storage share snapshot --name finance-share --connection-string "$CONN_STRING"
```

19. Listar snapshots:

```bash
az storage share list --connection-string "$CONN_STRING" --include-snapshots \
  --query "[?name=='finance-share'].{Name:name, Snapshot:snapshot}" -o table
```

## Critérios de Sucesso

- [ ] Três containers de blob existem: `app-data`, `logs`, `archive`
- [ ] Blobs enviados com estrutura de diretório virtual correta (profiles/, 2025/01/)
- [ ] Camada do blob de log alterada de Hot para Cool
- [ ] Blob de arquivo enviado diretamente na camada Archive
- [ ] Exclusão reversível de blob habilitada (retenção de 14 dias)
- [ ] Exclusão reversível de container habilitada (retenção de 14 dias)
- [ ] Blob excluído e recuperado com sucesso usando exclusão reversível
- [ ] Versionamento de blob habilitado e múltiplas versões de um blob existem
- [ ] Um snapshot de blob foi criado
- [ ] Compartilhamento Azure Files `finance-share` existe com diretórios e arquivos
- [ ] Snapshot de compartilhamento de arquivos criado
- [ ] Exclusão reversível do Azure Files habilitada

## Dicas

<details>
<summary>Dica 1: Entendendo as camadas de acesso</summary>

| Camada | Custo de Armazenamento | Custo de Acesso | Tempo de Recuperação | Retenção Mín. | Caso de Uso |
|--------|----------------------|-----------------|---------------------|---------------|-------------|
| **Hot** | Mais alto | Mais baixo | Instantâneo | Nenhum | Dados acessados frequentemente |
| **Cool** | Mais baixo | Mais alto | Instantâneo | 30 dias | Acesso infrequente (mensal) |
| **Cold** | Ainda mais baixo | Ainda mais alto | Instantâneo | 90 dias | Acesso raro |
| **Archive** | Mais baixo | Mais alto | Horas (1-15h) | 180 dias | Backup de longo prazo, conformidade |

:::info Informação

**Penalidade por exclusão antecipada**: Se você excluir ou mover um blob de Cool/Archive antes do período mínimo de retenção, será cobrado como se o mantivesse pelo período completo. Por exemplo, excluir um blob de Cool após 10 dias = cobrado por 30 dias.
:::

</details>

<details>
<summary>Dica 2: Versionamento de blob vs. snapshots</summary>

| Recurso | Versionamento | Snapshots |
|---------|--------------|-----------|
| **Gatilho** | Automático em cada escrita | Manual (você os cria) |
| **Escopo** | Blob individual | Blob individual |
| **Identificação** | VersionId (baseado em timestamp) | Timestamp do snapshot |
| **Mutável** | Não (versões são imutáveis) | Não (snapshots são somente leitura) |
| **Excluível** | Sim (excluir versões específicas) | Sim (excluir snapshots específicos) |
| **Caso de uso** | Trilha de auditoria, histórico automático | Backup pontual |

**Dica para o exame**: Versionamento é a abordagem moderna recomendada. Snapshots são legados mas ainda são testados.

</details>

<details>
<summary>Dica 3: Reidratando um blob arquivado</summary>

Blobs arquivados não podem ser lidos diretamente. Você deve primeiro **reidratá-los**:

```bash
# Change tier from Archive to Hot (standard priority: up to 15 hours)
az storage blob set-tier \
  --container-name archive \
  --name reports/q3-2024.txt \
  --tier Hot \
  --connection-string "$CONN_STRING"

# High priority rehydration (faster, more expensive: under 1 hour for < 10 GB)
az storage blob set-tier \
  --container-name archive \
  --name reports/q3-2024.txt \
  --tier Hot \
  --rehydrate-priority High \
  --connection-string "$CONN_STRING"
```

</details>

<details>
<summary>Dica 4: Azure Files | Requisitos de porta SMB</summary>

Azure Files usa **SMB 3.0** pela **porta TCP 445**. Muitos provedores de internet e firewalls corporativos bloqueiam esta porta.

Para verificar se a porta 445 está aberta:
```powershell
Test-NetConnection -ComputerName <storage-account>.file.core.windows.net -Port 445
```

Se a porta 445 estiver bloqueada, as alternativas incluem:
- **Azure VPN Gateway** (conectar via VPN)
- **Azure File Sync** (sincronizar com servidor local)
- **REST API** (acesso programático, sem necessidade de SMB)

</details>

<details>
<summary>Dica 5: Guia de decisão Blob vs. Azure Files</summary>

| Cenário | Use |
|---------|-----|
| App armazena/lê dados não estruturados (imagens, logs) | **Blob Storage** |
| Usuários precisam de drive mapeado (Z:) | **Azure Files** |
| Streaming de mídia ou origem CDN | **Blob Storage** |
| Lift-and-shift de servidor de arquivos local | **Azure Files** |
| Data lake para analytics | **Blob Storage (Data Lake Gen2)** |
| Arquivos de configuração compartilhados entre VMs | **Azure Files** |

</details>

## Recursos de Aprendizado

- [Visão geral do Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-overview)
- [Camadas de acesso para dados de blob](https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview)
- [Exclusão reversível para blobs](https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview)
- [Versionamento de blob](https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview)
- [Visão geral do Azure Files](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-introduction)
- [Guia de planejamento do Azure Files](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-planning)

## Quebre & Conserte

Após completar o desafio, tente estes cenários de solução de problemas:

1. **Surpresa com blob arquivado**: Tente baixar o blob que você definiu para a camada Archive. Qual erro você recebe? (`BlobArchived` | você deve reidratar primeiro.) Quanto tempo leva a reidratação padrão?

2. **Confusão com exclusão reversível**: Exclua um blob, depois exclua o mesmo blob novamente após recriá-lo. Quantas versões excluídas de forma reversível existem? Você pode recuperar uma específica?

3. **Falha na montagem do compartilhamento de arquivos**: Tente montar o compartilhamento Azure Files a partir de uma rede onde a porta 445 está bloqueada. Qual erro você vê? Quais são as opções de contorno?

4. **Sobreposição de snapshot e versionamento**: Habilite tanto versionamento quanto snapshots no mesmo container. Faça upload de um arquivo, crie um snapshot, depois sobrescreva o arquivo. Quantas cópias existem agora? (Versão original, snapshot do original e nova versão atual = 3 cópias.)

## Teste seus Conhecimentos

<details>
<summary>1. Qual é a diferença de custo entre as camadas Hot, Cool e Archive?</summary>

**Custos de armazenamento** (por GB/mês, aproximado para LRS em East US):
- Hot: ~$0.018/GB
- Cool: ~$0.010/GB
- Archive: ~$0.002/GB

**Custos de acesso** (por 10.000 operações de leitura):
- Hot: ~$0.004
- Cool: ~$0.01
- Archive: ~$5.00 (mais custo de reidratação)

**Percepção chave**: Archive é 9x mais barato para armazenar mas 1.250x mais caro para ler. Use apenas para dados que você raramente precisa acessar.

</details>

<details>
<summary>2. Quando você deve usar Blob Storage vs. Azure Files?</summary>

**Use Blob Storage quando**:
- Aplicações acessam dados via REST API ou SDKs
- Você precisa de armazenamento escalável para dados não estruturados (imagens, vídeos, logs)
- Você quer usar camadas de acesso (Hot/Cool/Archive)
- Você está construindo um data lake

**Use Azure Files quando**:
- Aplicações usam APIs padrão de sistema de arquivos (SMB/NFS)
- Você precisa de um sistema de arquivos compartilhado entre múltiplas VMs
- Você está migrando um servidor de arquivos local ("lift and shift")
- Você precisa de acesso a arquivos compatível com POSIX

</details>

<details>
<summary>3. Qual é o tamanho máximo de um compartilhamento Azure Files?</summary>

- **Compartilhamentos de arquivos Standard**: Até **100 TiB** (com compartilhamentos de arquivos grandes habilitados; padrão é 5 TiB)
- **Compartilhamentos de arquivos Premium**: Até **100 TiB** (modelo de capacidade provisionada)
- **Tamanho máximo de arquivo**: 4 TiB por arquivo individual
- **Profundidade máxima de diretório**: Sem limite prático, mas o caminho completo não pode exceder 2.048 caracteres

</details>

<details>
<summary>4. Você pode alterar a camada de um blob sem reenviá-lo?</summary>

**Sim!** Você pode alterar a camada de um blob existente a qualquer momento usando:
- Portal do Azure (propriedades do blob)
- Azure CLI: `az storage blob set-tier`
- REST API / SDKs

Mudanças de camada do **Archive** requerem **reidratação**, que pode levar horas. Mudanças entre as camadas **Hot**, **Cool** e **Cold** são instantâneas.

Nota: Mudar de camada incorre em uma **cobrança de operação de escrita** na taxa da camada de destino, mais uma taxa de exclusão antecipada se o blob não atingiu o período mínimo de retenção para sua camada atual.

</details>

## Limpeza

```bash
# Delete the resource group (removes storage account and all data)
az group delete --name rg-blob-files-challenge --yes --no-wait

# Clean up local files
rm -f profile-alice.txt profile-bob.txt profile-alice-v2.txt app-log-2025-01-15.txt q3-report.txt budget-2025.txt
```

---

**Próximo**: [Desafio 06 | Segurança de Storage & Ciclo de Vida](/docs/az-104/storage/challenge-06)
