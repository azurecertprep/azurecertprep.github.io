---
sidebar_position: 19
title: "Desafio 19: AzCopy & Migração de Armazenamento"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 19: AzCopy & migração de armazenamento

:::info Tempo Estimado e Custo

**60-75 minutos** | **Custo estimado**: ~$0,50 | **Peso no Exame: 15-20%**


:::
## Cenário

A Contoso Ltd. está consolidando armazenamento após adquirir uma empresa menor. Você precisa migrar terabytes de dados blob entre contas de armazenamento, copiar dados entre regiões para recuperação de desastres e configurar sincronização contínua para um file share. A equipe de operações tem usado o Portal do Azure para baixar e re-enviar arquivos manualmente | o que leva dias. Você vai apresentar a eles o AzCopy e o Storage Explorer para movimentação de dados eficiente e de alto desempenho.

## Habilidades do exame cobertas

| Habilidade | Peso |
|------------|------|
| Configurar e usar AzCopy para transferência de dados | Alto |
| Gerenciar dados usando Azure Storage Explorer | Médio |
| Copiar dados entre contas de armazenamento | Alto |
| Configurar replicação de objetos | Médio |
| Usar tokens SAS para autenticação com AzCopy | Alto |

## Referência sysadmin ↔ Azure

| On-Prem / Sysadmin | Equivalente Azure | Notas |
|---------------------|-------------------|-------|
| Robocopy /MIR | azcopy sync | Espelhar origem para destino |
| xcopy /s | azcopy copy --recursive | Operações de cópia recursiva |
| rsync via SSH | azcopy copy (service-to-service) | Cópia direta server-side |
| SCP com autenticação por chave | AzCopy + token SAS | Autenticação baseada em token |
| Windows Explorer arrastar-e-soltar | Azure Storage Explorer | Gerenciamento de arquivos via GUI |
| Tarefa agendada de robocopy | azcopy sync em cron/Task Scheduler | Sincronização contínua |
| Teste de desempenho com iperf | azcopy bench | Benchmark de throughput de transferência |

## Tarefas

### Tarefa 1: configurar o ambiente do laboratório

Crie duas contas de armazenamento para simular um cenário de migração:

```bash
# Criar grupo de recursos
az group create --name rg-azcopy-lab --location eastus

# Criar conta de armazenamento de origem
az storage account create \
  --name stsource$RANDOM \
  --resource-group rg-azcopy-lab \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Criar conta de armazenamento de destino (região diferente para cenário de dr)
az storage account create \
  --name stdest$RANDOM \
  --resource-group rg-azcopy-lab \
  --location westus2 \
  --sku Standard_LRS \
  --kind StorageV2

# Armazenar nomes das contas para uso posterior
SOURCE_ACCOUNT=$(az storage account list -g rg-azcopy-lab --query "[?contains(name,'source')].name" -o tsv | head -1)
DEST_ACCOUNT=$(az storage account list -g rg-azcopy-lab --query "[?contains(name,'dest')].name" -o tsv | head -1)

# Criar contêineres
az storage container create --name documents --account-name $SOURCE_ACCOUNT --auth-mode login
az storage container create --name backups --account-name $SOURCE_ACCOUNT --auth-mode login
az storage container create --name documents --account-name $DEST_ACCOUNT --auth-mode login
az storage container create --name archives --account-name $DEST_ACCOUNT --auth-mode login

# Enviar arquivos de exemplo para a origem
for i in $(seq 1 10); do
  echo "This is document $i content for migration testing at $(date)" > doc$i.txt
  az storage blob upload \
    --container-name documents \
    --file doc$i.txt \
    --name "folder1/doc$i.txt" \
    --account-name $SOURCE_ACCOUNT \
    --auth-mode login
done

# Criar um arquivo maior para teste de desempenho
dd if=/dev/urandom of=largefile.bin bs=1M count=50 2>/dev/null
az storage blob upload \
  --container-name documents \
  --file largefile.bin \
  --name "data/largefile.bin" \
  --account-name $SOURCE_ACCOUNT \
  --auth-mode login

# Limpar arquivos temporários locais
rm -f doc*.txt largefile.bin
```

### Tarefa 2: instalar e autenticar o AzCopy

```bash
# Verificar se o AzCopy está instalado
azcopy --version

# Login com Entra ID (interativo)
azcopy login

# Alternativa: login com tenant ID
azcopy login --tenant-id $(az account show --query tenantId -o tsv)
```

:::tip Dica

Se o AzCopy não estiver instalado:
- **Linux**: `wget https://aka.ms/downloadazcopy-v10-linux && tar -xf downloadazcopy* && sudo mv azcopy_linux*/azcopy /usr/local/bin/`
- **Windows**: Baixe de https://aka.ms/downloadazcopy-v10-windows
- **macOS**: `brew install azcopy`


:::
### Tarefa 3: copiar blobs entre contêineres (Mesma conta)

```bash
# Copiar todos os blobs do contêiner documents para backups (mesma conta)
azcopy copy \
  "https://$SOURCE_ACCOUNT.blob.core.windows.net/documents/*" \
  "https://$SOURCE_ACCOUNT.blob.core.windows.net/backups/" \
  --recursive

# Listar os arquivos copiados
az storage blob list \
  --container-name backups \
  --account-name $SOURCE_ACCOUNT \
  --auth-mode login \
  --query "[].name" -o tsv
```

### Tarefa 4: copiar blobs entre contas de armazenamento usando tokens SAS

Gere tokens SAS e realize a cópia entre contas:

```bash
# Gerar token SAS para origem (leitura + listagem)
SOURCE_SAS=$(az storage account generate-sas \
  --account-name $SOURCE_ACCOUNT \
  --permissions rl \
  --resource-types co \
  --services b \
  --expiry $(date -u -d "+1 hour" +%Y-%m-%dT%H:%MZ) \
  -o tsv)

# Gerar token SAS para destino (escrita + criação + adição)
DEST_SAS=$(az storage account generate-sas \
  --account-name $DEST_ACCOUNT \
  --permissions wca \
  --resource-types co \
  --services b \
  --expiry $(date -u -d "+1 hour" +%Y-%m-%dT%H:%MZ) \
  -o tsv)

# Copiar entre contas usando tokens SAS (cópia server-side)
azcopy copy \
  "https://$SOURCE_ACCOUNT.blob.core.windows.net/documents?$SOURCE_SAS" \
  "https://$DEST_ACCOUNT.blob.core.windows.net/documents?$DEST_SAS" \
  --recursive

# Verificar a cópia
az storage blob list \
  --container-name documents \
  --account-name $DEST_ACCOUNT \
  --auth-mode login \
  --query "[].{Name:name, Size:properties.contentLength}" -o table
```

### Tarefa 5: operações de sincronização (Espelhar origem para destino)

```bash
# Adicionar novos arquivos à origem
echo "New file added after initial copy" > newfile.txt
az storage blob upload \
  --container-name documents \
  --file newfile.txt \
  --name "folder1/newfile.txt" \
  --account-name $SOURCE_ACCOUNT \
  --auth-mode login

# Sync: copia apenas arquivos novos/modificados (não exclui extras no destino)
azcopy sync \
  "https://$SOURCE_ACCOUNT.blob.core.windows.net/documents" \
  "https://$DEST_ACCOUNT.blob.core.windows.net/documents" \
  --recursive

# Sync com flag delete-destination (comportamento de espelho como robocopy /mir)
azcopy sync \
  "https://$SOURCE_ACCOUNT.blob.core.windows.net/documents" \
  "https://$DEST_ACCOUNT.blob.core.windows.net/documents" \
  --recursive \
  --delete-destination=true

rm -f newfile.txt
```

### Tarefa 6: benchmark de desempenho de transferência

```bash
# Benchmark de desempenho de upload para a conta de destino
azcopy bench \
  "https://$DEST_ACCOUNT.blob.core.windows.net/archives" \
  --file-count 100 \
  --size-per-file 1M

# Benchmark com arquivos maiores
azcopy bench \
  "https://$DEST_ACCOUNT.blob.core.windows.net/archives" \
  --file-count 5 \
  --size-per-file 100M
```

### Tarefa 7: usar AzCopy com padrões de Inclusão/Exclusão

```bash
# Copiar apenas arquivos .txt
azcopy copy \
  "https://$SOURCE_ACCOUNT.blob.core.windows.net/documents/*" \
  "https://$DEST_ACCOUNT.blob.core.windows.net/archives/" \
  --recursive \
  --include-pattern "*.txt"

# Copiar tudo exceto arquivos .bin
azcopy copy \
  "https://$SOURCE_ACCOUNT.blob.core.windows.net/documents/*" \
  "https://$DEST_ACCOUNT.blob.core.windows.net/archives/" \
  --recursive \
  --exclude-pattern "*.bin"
```

### Tarefa 8: visualizar histórico de jobs e logs

```bash
# Listar jobs recentes do AzCopy
azcopy jobs list

# Mostrar detalhes do job mais recente
azcopy jobs show <job-id>

# Visualizar localização do arquivo de log
azcopy env
```

## Critérios de sucesso

<SuccessChecklist
  storageKey="az104-challenge-19"
  items={[
    "Duas contas de armazenamento existem em regiões diferentes",
    "AzCopy está instalado e autenticado",
    "Blobs foram copiados entre contêineres na mesma conta",
    "Blobs foram copiados entre contas usando tokens SAS",
    "Operação de sync detectou e copiou apenas arquivos novos/modificados",
    "Benchmark foi concluído e métricas de throughput foram observadas",
    "Filtragem baseada em padrões (include/exclude) foi usada com sucesso",
    "Histórico de jobs do AzCopy mostra transferências concluídas"
  ]}
/>
## Dicas

<details>
<summary>Dica 1: Métodos de autenticação do AzCopy</summary>

O AzCopy suporta três métodos de autenticação:
1. **Entra ID (azcopy login)** | Melhor para uso interativo e acesso baseado em RBAC
2. **Tokens SAS** | Anexados à URL, com limite de tempo, melhor para automação
3. **Chave da conta de armazenamento** | Definida via variável de ambiente `ACCOUNT_KEY` (não recomendado)

Para o exame, saiba que a cópia service-to-service (entre contas) requer tokens SAS em ambos os lados OU login com Entra ID com funções RBAC apropriadas em ambas as contas.

</details>

<details>
<summary>Dica 2: Copy vs Sync</summary>

- **azcopy copy** | Sempre copia todos os arquivos especificados independentemente de existirem no destino
- **azcopy sync** | Só copia arquivos novos ou modificados (compara timestamps de última modificação). Opcionalmente exclui arquivos no destino que não estão na origem (--delete-destination)

</details>

<details>
<summary>Dica 3: Permissões do token SAS para cópia</summary>

Para cópia entre contas:
- **Origem** precisa de: permissões Read (r), List (l)
- **Destino** precisa de: permissões Write (w), Create (c), Add (a)

Se você receber erros 403, verifique se ambos os tokens SAS têm as permissões corretas e não expiraram.

</details>

<details>
<summary>Dica 4: Aumentando a velocidade de transferência</summary>

Defina a variável de ambiente `AZCOPY_CONCURRENCY_VALUE` para aumentar conexões paralelas (o padrão é baseado nos núcleos da CPU). Para redes de alta largura de banda, tente valores como 300-500. Também certifique-se de que os limites de egresso da conta de armazenamento não estão sendo atingidos.

</details>

## Quebrar & consertar

### Cenário a: token SAS expirado

Gere um token SAS com expiração de 1 minuto. Espere 2 minutos, depois tente uma cópia. Observe a mensagem de erro. Como você diagnostica expiração de SAS vs problemas de permissão?

### Cenário b: contêiner ausente no destino

Tente copiar para um contêiner que não existe no destino. O AzCopy o cria automaticamente? (Resposta: Sim, se o token SAS ou as permissões RBAC permitirem a criação de contêineres.)

### Cenário c: falha parcial na transferência

Durante uma operação de cópia grande, simule uma falha revogando o token SAS no meio da transferência. Use `azcopy jobs resume` para reiniciar o job com falha com um novo token válido.

```bash
# Retomar um job com falha
azcopy jobs resume <job-id> --source-sas="<new-sas>" --destination-sas="<new-sas>"
```

## Verificação de conhecimento

<details>
<summary>1. Qual é a diferença entre azcopy copy e azcopy sync?</summary>

**azcopy copy** copia incondicionalmente todos os arquivos que correspondem aos critérios | não verifica se os arquivos já existem no destino. É melhor para transferências únicas.

**azcopy sync** compara origem e destino pelo tempo de última modificação e só transfere arquivos alterados ou novos. É melhor para sincronização contínua. Com `--delete-destination=true`, espelha a origem exatamente (excluindo extras no destino).

</details>

<details>
<summary>2. O AzCopy pode realizar cópias server-side entre contas de armazenamento?</summary>

**Sim.** Ao copiar entre contas de armazenamento do Azure, o AzCopy usa APIs server-side (Put Block From URL / Copy Blob From URL). Os dados fluem diretamente entre os datacenters do Azure sem passar pela sua máquina local. Isso é chamado de **cópia service-to-service** e é significativamente mais rápido que baixar e re-enviar.

</details>

<details>
<summary>3. O que acontece se uma transferência do AzCopy for interrompida?</summary>

O AzCopy mantém um **journal de jobs** que rastreia o progresso da transferência. Se interrompido, você pode retomar a transferência com `azcopy jobs resume <job-id>`. Apenas arquivos que ainda não foram transferidos serão tentados novamente. O journal é armazenado localmente (verifique `azcopy env` para o caminho).

</details>

<details>
<summary>4. Qual função RBAC é necessária para o AzCopy com autenticação Entra ID?</summary>

Para operações de blob:
- **Leitura**: Storage Blob Data Reader
- **Escrita**: Storage Blob Data Contributor
- **Controle total**: Storage Blob Data Owner

Nota: As funções clássicas "Reader" ou "Contributor" na conta de armazenamento NÃO são suficientes para operações no plano de dados | você precisa das funções específicas de dados.

</details>

## Limpeza

```bash
# Remover o grupo de recursos e todas as contas de armazenamento
az group delete --name rg-azcopy-lab --yes --no-wait

# Limpar log de jobs do AzCopy (opcional)
azcopy jobs clean

# Logout do AzCopy
azcopy logout

echo "Limpeza concluída."
```

## Recursos de aprendizagem

- [Introdução ao AzCopy](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10)
- [Copiar blobs entre contas com AzCopy](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-blobs-copy)
- [Sincronizar com AzCopy](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-blobs-synchronize)
- [Autorizar AzCopy com Entra ID](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-authorize-azure-active-directory)
- [Azure Storage Explorer](https://learn.microsoft.com/en-us/azure/storage/storage-explorer/vs-azure-tools-storage-manage-with-storage-explorer)
- [Benchmark do AzCopy](https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-bench)
