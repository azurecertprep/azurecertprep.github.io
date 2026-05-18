---
sidebar_position: 1
title: "Challenge 04 | Storage Accounts & Access"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Desafio 04: Storage Accounts & Acesso

> **Tempo estimado**: 60-75 min | **Custo estimado**: ~$0.50 | **Peso no exame**: 15-20%

## Introdução

A equipe de aplicações da Contoso precisa de uma solução de armazenamento centralizada. O servidor de arquivos legado está ficando sem espaço, e a equipe de desenvolvimento fica enviando arquivos ZIP por email. Você foi solicitado a configurar o Azure Storage com controles de segurança adequados | chaves de acesso, tokens SAS, firewalls e criptografia. Este é o equivalente no Azure de configurar um servidor de arquivos, mas com segurança em escala de nuvem.

Storage accounts são um dos tópicos mais testados no exame AZ-104. Você precisará conhecer cada método de acesso, cada opção de redundância e cada controle de segurança por completo.

## Habilidades do Exame Cobertas

- ✅ Criar e configurar storage accounts
- ✅ Configurar redundância do Azure Storage
- ✅ Configurar criptografia de storage account (chaves gerenciadas pela Microsoft e chaves gerenciadas pelo cliente)
- ✅ Configurar firewalls e redes virtuais de storage account
- ✅ Gerar assinaturas de acesso compartilhado (SAS)
- ✅ Configurar políticas de acesso armazenadas
- ✅ Gerenciar chaves de acesso
- ✅ Fazer upload e gerenciar dados com AzCopy
- ✅ Configurar o Azure Storage Explorer

## Referência Sysadmin ↔ Azure

| On-Prem / Sysadmin | Equivalente no Azure | Observações |
|---------------------|----------------------|-------------|
| Servidor de arquivos (CIFS/SMB) | Azure Storage account | Armazenamento nativo na nuvem |
| RAID 1 (espelhamento) | LRS (Local Redundant Storage) | 3 cópias em um datacenter |
| RAID entre sites | GRS (Geo-Redundant Storage) | 6 cópias em 2 regiões |
| Permissões de compartilhamento (Everyone: Read) | Tokens SAS | Acesso limitado por tempo e escopo |
| Senha de admin para compartilhamento de arquivos | Chaves de acesso da storage account | Acesso total | proteja como uma senha |
| Robocopy / xcopy | AzCopy | Transferência de dados de alto desempenho |
| Windows Explorer para compartilhamentos | Azure Storage Explorer | Ferramenta GUI para gerenciamento de armazenamento |
| BitLocker / criptografia de disco | Storage Service Encryption (SSE) | Criptografia automática, sempre ativa |
| Regras de firewall para servidor de arquivos | Storage firewall & regras de VNet | Controle de acesso em nível de rede |

## Descrição

### Parte 1: Criar uma Storage Account

1. Criar um grupo de recursos e uma storage account:

```bash
RG="rg-storage-challenge"
LOCATION="eastus"
# Storage account names must be globally unique, 3-24 chars, lowercase + numbers only
STORAGE_NAME="ststoragechallenge$RANDOM"

az group create --name $RG --location $LOCATION

az storage account create \
  --name $STORAGE_NAME \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --min-tls-version TLS1_2 \
  --tags Environment=Lab CostCenter=IT-001
```

2. Verificar as configurações da storage account:

```bash
az storage account show --name $STORAGE_NAME --resource-group $RG \
  --query "{Name:name, SKU:sku.name, Kind:kind, AccessTier:accessTier, TLS:minimumTlsVersion}" -o table
```

### Parte 2: Configurar Redundância

3. Visualizar a configuração atual de redundância (deve ser LRS)
4. Alterar a redundância de LRS para GRS:

```bash
az storage account update --name $STORAGE_NAME --resource-group $RG --sku Standard_GRS
```

5. Verificar a alteração e entender o que cada opção de redundância oferece

### Parte 3: Chaves de Acesso & Tokens SAS

6. Recuperar as chaves de acesso da storage account:

```bash
az storage account keys list --account-name $STORAGE_NAME --resource-group $RG -o table
```

:::warning Atenção

Chaves de acesso concedem **controle total** sobre a storage account. Trate-as como senhas | nunca as envie para controle de versão nem as compartilhe em texto simples.

:::
7. Criar um container de blob e fazer upload de um arquivo de teste:

```bash
# Get the connection string
CONN_STRING=$(az storage account show-connection-string --name $STORAGE_NAME --resource-group $RG -o tsv)

# Create a container
az storage container create --name testcontainer --connection-string "$CONN_STRING"

# Create a test file and upload it
echo "Hello from Azure Storage Challenge!" > testfile.txt
az storage blob upload --container-name testcontainer --file testfile.txt --name testfile.txt --connection-string "$CONN_STRING"
```

8. Gerar um token **Account SAS** (acesso amplo):

```bash
END_DATE=$(date -u -d "+1 day" '+%Y-%m-%dT%H:%MZ' 2>/dev/null || date -u -v+1d '+%Y-%m-%dT%H:%MZ')

az storage account generate-sas \
  --account-name $STORAGE_NAME \
  --services b \
  --resource-types sco \
  --permissions rl \
  --expiry $END_DATE \
  --https-only \
  -o tsv
```

9. Gerar um token **Service SAS** (com escopo para um container específico):

```bash
az storage container generate-sas \
  --name testcontainer \
  --account-name $STORAGE_NAME \
  --permissions rl \
  --expiry $END_DATE \
  --https-only \
  --connection-string "$CONN_STRING" \
  -o tsv
```

### Parte 4: Políticas de Acesso Armazenadas

10. Criar uma política de acesso armazenada no container:

```bash
az storage container policy create \
  --container-name testcontainer \
  --name "ReadPolicy" \
  --permissions rl \
  --expiry $END_DATE \
  --connection-string "$CONN_STRING"
```

11. Gerar um token SAS vinculado à política de acesso armazenada:

```bash
az storage container generate-sas \
  --name testcontainer \
  --account-name $STORAGE_NAME \
  --policy-name "ReadPolicy" \
  --connection-string "$CONN_STRING" \
  -o tsv
```

:::tip Dica

**Por que usar políticas de acesso armazenadas?** Se você precisar revogar um token SAS, não é possível invalidar um SAS autônomo sem rotacionar a chave de acesso. Mas se o SAS faz referência a uma política de acesso armazenada, você pode modificar ou excluir a política para revogar o acesso instantaneamente.

:::
### Parte 5: Firewall de Storage

12. Configurar o firewall da storage account para permitir acesso apenas do seu IP:

<Tabs>
<TabItem value="cli" label="Azure CLI">

```bash
# Get your public IP
MY_IP=$(curl -s https://api.ipify.org)

# Set default action to Deny
az storage account update --name $STORAGE_NAME --resource-group $RG --default-action Deny

# Add your IP to the allow list
az storage account network-rule add --account-name $STORAGE_NAME --resource-group $RG --ip-address $MY_IP
```

</TabItem>
<TabItem value="portal" label="Portal">

1. Vá para sua **Storage account** → **Networking**
2. Altere **Public network access** para **Enabled from selected virtual networks and IP addresses**
3. Em **Firewall**, adicione o endereço IP do seu cliente
4. Clique em **Save**

</TabItem>
</Tabs>

13. Verificar que você ainda pode acessar a storage account do seu IP

### Parte 6: Rotacionar Chaves de Acesso

14. Regenerar uma das chaves de acesso da storage account:

```bash
az storage account keys renew --account-name $STORAGE_NAME --resource-group $RG --key key1
```

:::warning Atenção

Após rotacionar uma chave, qualquer aplicação ou token SAS usando essa chave **parará de funcionar imediatamente**. Sempre atualize suas aplicações antes de rotacionar chaves em produção.

:::
### Parte 7: AzCopy

15. Usar AzCopy para fazer upload de múltiplos arquivos:

```bash
# Create some test files
mkdir -p upload-test
for i in 1 2 3 4 5; do echo "Test file $i" > upload-test/file$i.txt; done

# Generate a SAS token for AzCopy
SAS_TOKEN=$(az storage account generate-sas \
  --account-name $STORAGE_NAME \
  --services b --resource-types co \
  --permissions rwlac --expiry $END_DATE \
  --https-only -o tsv)

# Upload with AzCopy
azcopy copy "upload-test/*" "https://$STORAGE_NAME.blob.core.windows.net/testcontainer?$SAS_TOKEN" --recursive
```

## Critérios de Sucesso

- [ ] Storage account existe com tipo StorageV2, camada de acesso Hot, TLS 1.2
- [ ] Redundância foi alterada de LRS para GRS
- [ ] Container de blob `testcontainer` existe com um arquivo enviado
- [ ] Tokens Account SAS e Service SAS foram gerados
- [ ] Política de acesso armazenada `ReadPolicy` existe no container
- [ ] Firewall de storage está configurado com Deny padrão e seu IP permitido
- [ ] Chave de acesso foi rotacionada (key1 regenerada)
- [ ] AzCopy foi usado para fazer upload de arquivos

## Dicas

<details>
<summary>Dica 1: Entendendo as regras de nomenclatura de storage account</summary>

Nomes de storage account devem ser:
- **Globalmente únicos** (em todo o Azure)
- **3-24 caracteres** de comprimento
- **Apenas letras minúsculas e números** (sem hífens, underscores ou maiúsculas)

Use `$RANDOM` ou um timestamp para garantir unicidade:
```bash
STORAGE_NAME="stchallenge$(date +%s | tail -c 8)"
```

</details>

<details>
<summary>Dica 2: Opções de redundância explicadas</summary>

| Opção | Cópias | Regiões | Durabilidade | Caso de Uso |
|-------|--------|---------|--------------|-------------|
| LRS | 3 | 1 datacenter | 11 noves | Dev/teste, dados facilmente recriáveis |
| ZRS | 3 | 3 zonas em 1 região | 12 noves | Produção, alta disponibilidade |
| GRS | 6 | 2 regiões (primária + secundária) | 16 noves | Crítico para negócios, recuperação de desastres |
| RA-GRS | 6 | 2 regiões (secundária legível) | 16 noves | Cargas de leitura intensiva com DR |
| GZRS | 6 | 3 zonas + região secundária | 16 noves | Proteção máxima |
| RA-GZRS | 6 | 3 zonas + secundária legível | 16 noves | Proteção máxima + acesso de leitura |

</details>

<details>
<summary>Dica 3: Diferença entre tipos de token SAS</summary>

| Tipo de SAS | Escopo | Criado Com | Pode Revogar? |
|-------------|--------|------------|---------------|
| **Account SAS** | Storage account inteira (blobs, files, queues, tables) | Chaves de acesso | Apenas rotacionando a chave |
| **Service SAS** | Serviço específico (ex: um container) | Chaves de acesso | Via política de acesso armazenada |
| **User Delegation SAS** | Blob/container específico | Credenciais do Entra ID | Revogando a chave de delegação |

**User Delegation SAS** é o mais seguro | usa Entra ID em vez de chaves de acesso.

</details>

<details>
<summary>Dica 4: Solução de problemas de bloqueio por firewall</summary>

Se você configurar o firewall e se bloquear:

```bash
# Option 1: Allow your current IP
MY_IP=$(curl -s https://api.ipify.org)
az storage account network-rule add --account-name $STORAGE_NAME --resource-group $RG --ip-address $MY_IP

# Option 2: Reset to allow all networks (temporary!)
az storage account update --name $STORAGE_NAME --resource-group $RG --default-action Allow

# Option 3: Use Azure Cloud Shell (always allowed via "trusted services")
```

:::info Informação

Azure Cloud Shell e serviços confiáveis do Azure sempre podem acessar storage accounts independentemente das regras de firewall, desde que a opção **"Allow trusted Microsoft services"** esteja habilitada.

:::
</details>

<details>
<summary>Dica 5: Usando AzCopy com autenticação do Entra ID</summary>

```bash
# Login to AzCopy with Entra ID (no SAS needed)
azcopy login

# Upload using Entra ID auth (requires Storage Blob Data Contributor role)
azcopy copy "upload-test/*" "https://$STORAGE_NAME.blob.core.windows.net/testcontainer" --recursive
```

</details>

## Recursos de Aprendizado

- [Visão geral de storage account](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview)
- [Redundância do Azure Storage](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy)
- [Conceder acesso limitado com SAS](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview)
- [Configurar firewalls de storage](https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security)
- [Começar com AzCopy](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10)
- [Gerenciar chaves de storage account](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-keys-manage)

## Quebre & Conserte

Após completar o desafio, tente estes cenários de solução de problemas:

1. **Bloqueio por firewall**: Defina a ação padrão como Deny e remova seu IP da lista de permissão. Tente acessar a storage account. Como você se recupera? (Use o Azure Cloud Shell, que é um serviço confiável, para re-adicionar seu IP.)

2. **Token SAS expirado**: Gere um token SAS com expiração de 1 minuto. Espere 2 minutos, depois tente usá-lo. Qual mensagem de erro você recebe? Como isso é diferente de uma política de acesso armazenada revogada?

3. **Desastre na rotação de chave**: Faça upload de um arquivo usando uma connection string baseada na key1. Rotacione a key1. Tente baixar o arquivo usando a connection string antiga. O que acontece? Como você lidaria com isso graciosamente em produção?

4. **Redundância errada**: Crie uma storage account com LRS, depois tente alterá-la diretamente para RA-GZRS. Funciona? (Algumas mudanças de redundância requerem etapas intermediárias ou migração de dados.)

## Teste seus Conhecimentos

<details>
<summary>1. Quais são os três tipos de tokens SAS e quando você usaria cada um?</summary>

1. **Account SAS**: Concede acesso a recursos em um ou mais serviços de armazenamento (blobs, files, queues, tables). Use quando uma aplicação precisa de acesso amplo a uma storage account.

2. **Service SAS**: Concede acesso a recursos em um único serviço de armazenamento (ex: apenas blob storage). Use quando quiser limitar o acesso a um container ou blob específico.

3. **User Delegation SAS**: Assinado com credenciais do Entra ID em vez de chaves de acesso. Esta é a opção **mais segura** e é **recomendada pela Microsoft**. Funciona apenas com Blob Storage e Data Lake Storage Gen2.

**Dica para o exame**: Se uma questão perguntar pela opção SAS "mais segura", a resposta é sempre **User Delegation SAS**.

</details>

<details>
<summary>2. O que acontece quando você regenera uma chave de acesso?</summary>

Quando você regenera uma chave de acesso de storage account:
- Qualquer aplicação usando essa chave **perde acesso imediatamente**
- Qualquer token SAS gerado com essa chave **se torna inválido**
- A outra chave (key2 se você rotacionou key1) continua funcionando

**Melhor prática para rotação de chave**:
1. Atualize todas as aplicações para usar key2
2. Regenere key1
3. Atualize todas as aplicações para usar a nova key1
4. Regenere key2

</details>

<details>
<summary>3. Qual é a criptografia padrão para Azure Storage?</summary>

Todos os dados do Azure Storage são criptografados em repouso usando **criptografia AES de 256 bits** (Storage Service Encryption / SSE). Isso é:
- **Sempre ativo** | não pode ser desabilitado
- **Transparente** | sem impacto no desempenho
- **Gratuito** | sem custo adicional

Você pode escolher entre:
- **Chaves gerenciadas pela Microsoft** (padrão) | o Azure gerencia as chaves de criptografia
- **Chaves gerenciadas pelo cliente (CMK)** | Você gerencia as chaves no Azure Key Vault

</details>

<details>
<summary>4. Você pode alterar a redundância de uma storage account após a criação?</summary>

**Sim**, com algumas limitações:
- **LRS ↔ GRS/RA-GRS**: Suportado (pode levar tempo para replicação inicial)
- **LRS ↔ ZRS**: Suportado via migração ao vivo (solicitar à Microsoft) ou migração manual
- **ZRS ↔ GZRS/RA-GZRS**: Suportado
- **LRS → RA-GZRS diretamente**: Não suportado | você deve passar por etapas intermediárias (LRS → GRS → GZRS → RA-GZRS, ou LRS → ZRS → GZRS → RA-GZRS)

O exame pode testar quais transições são suportadas e quais requerem etapas intermediárias.

</details>

## Limpeza

```bash
# Delete the resource group (removes storage account and all data)
az group delete --name rg-storage-challenge --yes --no-wait

# Clean up local files
rm -f testfile.txt
rm -rf upload-test
```

---

**Próximo**: [Desafio 05 | Blob Storage & Azure Files](/docs/az-104/storage/challenge-05)
