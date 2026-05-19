---
sidebar_position: 20
title: "Desafio 20: Criptografia de Armazenamento & Proteção de Dados"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 20: criptografia de armazenamento & proteção de dados

:::info Tempo Estimado e Custo

**60-75 minutos** | **Custo estimado**: ~$1,00 (Key Vault + armazenamento) | **Peso no Exame: 15-20%**


:::
## Cenário

A equipe de compliance da Contoso Ltd. sinalizou um requisito regulatório: todo armazenamento contendo dados financeiros ou de saúde deve usar chaves de criptografia gerenciadas pelo cliente (CMK) para fins de trilha de auditoria. Além disso, dados regulatórios (como registros financeiros e logs de auditoria) devem ser armazenados em contêineres imutáveis (WORM | Write Once, Read Many) onde os dados não podem ser modificados ou excluídos por um período de retenção específicado. Você foi encarregado de implementar esses controles de criptografia e proteção de dados.

## Habilidades do exame cobertas

| Habilidade | Peso |
|------------|------|
| Configurar criptografia de conta de armazenamento | Alto |
| Configurar chaves gerenciadas pelo cliente (CMK) | Alto |
| Configurar criptografia de infraestrutura (criptografia dupla) | Médio |
| Configurar políticas de imutabilidade (retenção baseada em tempo) | Alto |
| Configurar retenção legal em contêineres blob | Médio |
| Configurar Azure Key Vault para CMK | Médio |

## Referência sysadmin ↔ Azure

| On-Prem / Sysadmin | Equivalente Azure | Notas |
|---------------------|-------------------|-------|
| BitLocker (criptografia de disco) | Storage Service Encryption (SSE) | Sempre habilitado, transparente |
| EFS (Encrypting File System) | Criptografia no lado do cliente | Aplicação gerencia as chaves |
| Gerenciamento de chaves empresarial (HSM) | Azure Key Vault | Ciclo de vida centralizado de chaves |
| Chave mestra mantida pela TI | Chaves gerenciadas pela Microsoft (padrão) | Zero esforço administrativo |
| Controle de chaves exigido por compliance | Chaves gerenciadas pelo cliente (CMK) | Você controla rotação e acesso |
| Backup em fita WORM | Blob Storage imutável | Não pode ser modificado ou excluído |
| Retenção legal de documentos | Política de retenção legal | Imutabilidade indefinida para litígio |
| Cronogramas de retenção de fita | Política de retenção baseada em tempo | Auto-expiração após N dias |

## Tarefas

### Tarefa 1: criar o ambiente do laboratório

```bash
# Criar grupo de recursos
az group create --name rg-encryption-lab --location eastus

# Criar um Azure Key Vault para CMK
az keyvault create \
  --name kv-contoso-cmk-$RANDOM \
  --resource-group rg-encryption-lab \
  --location eastus \
  --enable-purge-protection true \
  --retention-days 7

# Armazenar nome do Key Vault
KV_NAME=$(az keyvault list -g rg-encryption-lab --query "[0].name" -o tsv)
```

### Tarefa 2: criar uma conta de armazenamento com criptografia de infraestrutura

A criptografia de infraestrutura (criptografia dupla) adiciona uma segunda camada de criptografia no nível de infraestrutura usando um algoritmo diferente:

```bash
# Criar conta de armazenamento com criptografia de infraestrutura habilitada
az storage account create \
  --name stencrypt$RANDOM \
  --resource-group rg-encryption-lab \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --require-infrastructure-encryption true

# Armazenar nome da conta
STORAGE_NAME=$(az storage account list -g rg-encryption-lab --query "[?contains(name,'encrypt')].name" -o tsv | head -1)

# Verificar se a criptografia de infraestrutura está habilitada
az storage account show \
  --name $STORAGE_NAME \
  --resource-group rg-encryption-lab \
  --query "{Name:name, InfraEncryption:encryption.requireInfrastructureEncryption, KeySource:encryption.keySource}" -o table
```

:::tip Dica

Ao criar uma conta de armazenamento no portal:
1. Vá para a aba **Avançado**
2. Em **Criptografia**, marque **Habilitar criptografia de infraestrutura**
3. Nota: Isso não pode ser alterado após a criação da conta


:::
### Tarefa 3: criar uma chave no Azure Key Vault

```bash
# Criar uma chave RSA para criptografia de armazenamento
az keyvault key create \
  --vault-name $KV_NAME \
  --name storage-cmk-key \
  --kty RSA \
  --size 2048

# Obter a URI da chave (necessária para configuração da conta de armazenamento)
KEY_URI=$(az keyvault key show \
  --vault-name $KV_NAME \
  --name storage-cmk-key \
  --query "key.kid" -o tsv)

echo "Key URI: $KEY_URI"
```

### Tarefa 4: configurar chaves gerenciadas pelo cliente (cmk) na conta de armazenamento

```bash
# Atribuir uma identidade gerenciada pelo sistema à conta de armazenamento
az storage account update \
  --name $STORAGE_NAME \
  --resource-group rg-encryption-lab \
  --assign-identity

# Obter o principal ID da identidade gerenciada
IDENTITY_ID=$(az storage account show \
  --name $STORAGE_NAME \
  --resource-group rg-encryption-lab \
  --query "identity.principalId" -o tsv)

# Conceder à conta de armazenamento a função Key Vault crypto Service encryption user
az role assignment create \
  --assignee $IDENTITY_ID \
  --role "Key Vault Crypto Service Encryption User" \
  --scope $(az keyvault show --name $KV_NAME --query id -o tsv)

# Configurar CMK na conta de armazenamento
az storage account update \
  --name $STORAGE_NAME \
  --resource-group rg-encryption-lab \
  --encryption-key-source Microsoft.Keyvault \
  --encryption-key-vault $(az keyvault show --name $KV_NAME --query "properties.vaultUri" -o tsv) \
  --encryption-key-name storage-cmk-key

# Verificar configuração CMK
az storage account show \
  --name $STORAGE_NAME \
  --resource-group rg-encryption-lab \
  --query "{KeySource:encryption.keySource, KeyVaultUri:encryption.keyVaultProperties.keyVaultUri, KeyName:encryption.keyVaultProperties.keyName}" -o table
```

### Tarefa 5: configurar política de imutabilidade (Retenção baseada em tempo)

```bash
# Criar um contêiner para dados regulatórios
az storage container create \
  --name regulatory-data \
  --account-name $STORAGE_NAME \
  --auth-mode login

# Enviar dados de teste
echo "Financial audit record - $(date)" > audit-record.txt
az storage blob upload \
  --container-name regulatory-data \
  --file audit-record.txt \
  --name "2024/Q1/audit-record.txt" \
  --account-name $STORAGE_NAME \
  --auth-mode login

# Definir política de imutabilidade baseada em tempo (retenção de 30 dias)
az storage container immutability-policy create \
  --account-name $STORAGE_NAME \
  --container-name regulatory-data \
  --period 30 \
  --allow-protected-append-writes true

# Verificar a política
az storage container show \
  --name regulatory-data \
  --account-name $STORAGE_NAME \
  --auth-mode login \
  --query "{ImmutabilityPolicy:properties.immutabilityPolicy, HasLegalHold:properties.hasLegalHold}"

rm -f audit-record.txt
```

:::tip Dica

Uma política de imutabilidade começa em estado **desbloqueado**. Enquanto desbloqueada, você pode aumentar ou diminuir o período de retenção ou excluir a política. Uma vez que você **bloqueia** a política:
- O período de retenção só pode ser aumentado, nunca diminuído
- A política não pode ser excluída
- Blobs não podem ser excluídos até que o período de retenção expire

Só bloqueie uma política quando tiver certeza sobre os requisitos de retenção.


:::
### Tarefa 6: configurar retenção legal

```bash
# Criar um contêiner para dados de litígio
az storage container create \
  --name litigation-docs \
  --account-name $STORAGE_NAME \
  --auth-mode login

# Enviar um documento
echo "Contract evidence document - $(date)" > evidence.txt
az storage blob upload \
  --container-name litigation-docs \
  --file evidence.txt \
  --name "case-2024-001/evidence.txt" \
  --account-name $STORAGE_NAME \
  --auth-mode login

# Aplicar retenção legal com tags
az storage container legal-hold set \
  --account-name $STORAGE_NAME \
  --container-name litigation-docs \
  --tags "case2024001" "litigationhold"

# Verificar retenção legal
az storage container show \
  --name litigation-docs \
  --account-name $STORAGE_NAME \
  --auth-mode login \
  --query "{HasLegalHold:properties.hasLegalHold, LegalHoldTags:properties.legalHold.tags}"

# Tentar excluir o blob (deve falhar enquanto a retenção legal estiver ativa)
az storage blob delete \
  --container-name litigation-docs \
  --name "case-2024-001/evidence.txt" \
  --account-name $STORAGE_NAME \
  --auth-mode login

rm -f evidence.txt
```

### Tarefa 7: verificar configurações de criptografia

```bash
# Verificar escopo de criptografia no nível da conta
az storage account show \
  --name $STORAGE_NAME \
  --resource-group rg-encryption-lab \
  --query "{
    Name:name,
    KeySource:encryption.keySource,
    InfrastructureEncryption:encryption.requireInfrastructureEncryption,
    KeyVaultUri:encryption.keyVaultProperties.keyVaultUri,
    KeyName:encryption.keyVaultProperties.keyName,
    KeyVersion:encryption.keyVaultProperties.keyVersion
  }" -o json

# Verificar o status da chave no Key Vault
az keyvault key show \
  --vault-name $KV_NAME \
  --name storage-cmk-key \
  --query "{Name:key.kid, Enabled:attributes.enabled, Created:attributes.created}" -o table
```

### Tarefa 8: rotacionar a chave gerenciada pelo cliente

```bash
# Criar uma nova versão da chave
az keyvault key create \
  --vault-name $KV_NAME \
  --name storage-cmk-key \
  --kty RSA \
  --size 2048

# A conta de armazenamento detecta automaticamente a nova versão da chave (se a versão não estiver fixa)
# Verificar se a versão da chave foi atualizada
az storage account show \
  --name $STORAGE_NAME \
  --resource-group rg-encryption-lab \
  --query "encryption.keyVaultProperties.{KeyName:keyName, KeyVersion:keyVersion}" -o table
```

## Critérios de sucesso

<SuccessChecklist
  storageKey="az104-challenge-20"
  items={[
    "Conta de armazenamento tem criptografia de infraestrutura (criptografia dupla) habilitada",
    "Azure Key Vault existe com uma chave RSA para criptografia",
    "Conta de armazenamento usa chaves gerenciadas pelo cliente (CMK) do Key Vault",
    "Política de imutabilidade baseada em tempo (30 dias) está definida no contêiner regulatory-data",
    "Retenção legal está aplicada no contêiner litigation-docs",
    "Exclusão de blob falha em contêineres com retenção legal ativa ou retenção não expirada",
    "Rotação de chave foi realizada e verificada"
  ]}
/>
## Dicas

<details>
<summary>Dica 1: Criptografia de infraestrutura não pode ser alterada após a criação</summary>

A criptografia de infraestrutura (criptografia dupla) deve ser habilitada no momento da criação da conta de armazenamento. Você não pode habilitar ou desabilitar em uma conta existente. Se você esqueceu de habilitar, precisa criar uma nova conta e migrar os dados.

</details>

<details>
<summary>Dica 2: Acesso ao Key Vault para CMK</summary>

A identidade gerenciada da conta de armazenamento precisa da função **Key Vault Crypto Service Encryption User** (abordagem RBAC recomendada) ou a política de acesso legacy do Key Vault com permissões Get, Wrap Key e Unwrap Key. A abordagem RBAC é preferida para novas implantações.

</details>

<details>
<summary>Dica 3: Imutabilidade vs Retenção Legal</summary>

- **Retenção baseada em tempo**: Blobs não podem ser excluídos até que o período de retenção expire. O período pode ser estendido, mas nunca reduzido (uma vez bloqueado).
- **Retenção legal**: Blobs não podem ser excluídos indefinidamente até que TODAS as tags de retenção legal sejam removidas. Sem limite de tempo | persiste até ser explicitamente removida.
- Ambas podem estar ativas simultaneamente no mesmo contêiner.

</details>

<details>
<summary>Dica 4: Proteção contra purge no Key Vault</summary>

A proteção contra purge deve estar habilitada no Key Vault usado para CMK. Sem ela, excluir o Key Vault ou a chave poderia tornar os dados da conta de armazenamento permanentemente inacessíveis. Este é um requisito obrigatório do Azure.

</details>

## Quebrar & consertar

### Cenário a: chave CMK desabilitada

Desabilite a chave de criptografia no Key Vault. O que acontece com as operações de leitura/escrita na conta de armazenamento? (Resposta: Todas as operações do plano de dados falham com erro 403 após a chave em cache expirar, geralmente em algumas horas.)

```bash
# Desabilitar a chave (cuidado: afeta o acesso ao armazenamento)
az keyvault key set-attributes \
  --vault-name $KV_NAME \
  --name storage-cmk-key \
  --enabled false

# Tentar listar blobs (eventualmente falhará)
az storage blob list --container-name regulatory-data --account-name $STORAGE_NAME --auth-mode login

# Reabilitar a chave para restaurar o acesso
az keyvault key set-attributes \
  --vault-name $KV_NAME \
  --name storage-cmk-key \
  --enabled true
```

### Cenário b: política de imutabilidade bloqueada

Bloqueie a política de imutabilidade em um contêiner de teste, depois tente excluir um blob antes do período de retenção terminar. Observe o erro. Nota: Isso não pode ser desfeito | só faça isso em um contêiner de teste.

### Cenário c: acesso ao Key Vault perdido

Remova a atribuição de função da identidade gerenciada no Key Vault. Quanto tempo até as operações de armazenamento começarem a falhar? Como você diagnostica o problema usando o Azure Monitor?

## Verificação de conhecimento

<details>
<summary>1. Qual é a diferença entre chaves gerenciadas pela Microsoft e chaves gerenciadas pelo cliente?</summary>

**Chaves gerenciadas pela Microsoft (padrão)**: A Microsoft cuida de todo o gerenciamento de chaves | geração, armazenamento, rotação e aposentadoria. Zero esforço administrativo necessário. Chaves são rotacionadas automaticamente.

**Chaves gerenciadas pelo cliente (CMK)**: Você cria e gerencia a chave no Azure Key Vault. Você controla o cronograma de rotação, políticas de acesso e pode revogar o acesso desabilitando a chave. Necessário para cenários de compliance onde a custódia da chave deve ser demonstrável.

</details>

<details>
<summary>2. Você pode trocar de chaves gerenciadas pela Microsoft para CMK em uma conta de armazenamento existente?</summary>

**Sim.** Você pode trocar uma conta de armazenamento existente de chaves gerenciadas pela Microsoft para chaves gerenciadas pelo cliente a qualquer momento. O inverso também é possível (CMK de volta para gerenciada pela Microsoft). Nenhuma migração de dados é necessária | o Azure re-encapsula as chaves de criptografia de forma transparente.

</details>

<details>
<summary>3. O que acontece se a chave do Key Vault for excluída?</summary>

Se a chave for excluída com soft-delete (Key Vault tem soft-delete habilitado), a conta de armazenamento perde acesso após a chave em cache expirar. Você pode recuperar a chave do soft-delete para restaurar o acesso. Se a chave for permanentemente purgada (sem proteção contra purge), os dados da conta de armazenamento se tornam **permanentemente inacessíveis**. Por isso a proteção contra purge é obrigatória para cenários CMK.

</details>

<details>
<summary>4. Você pode excluir um contêiner com retenção legal ativa?</summary>

**Não.** Você não pode excluir um contêiner ou quaisquer blobs dentro dele enquanto uma retenção legal estiver ativa. Você deve primeiro remover todas as tags de retenção legal do contêiner antes que a exclusão seja permitida. Isso garante que evidências de litígio não possam ser destruídas.

</details>

## Limpeza

```bash
# Remover retenção legal antes de excluir contêineres
STORAGE_NAME=$(az storage account list -g rg-encryption-lab --query "[?contains(name,'encrypt')].name" -o tsv | head -1)

az storage container legal-hold clear \
  --account-name $STORAGE_NAME \
  --container-name litigation-docs \
  --tags "case2024001" "litigationhold" 2>/dev/null

# Excluir política de imutabilidade (apenas se desbloqueada)
az storage container immutability-policy delete \
  --account-name $STORAGE_NAME \
  --container-name regulatory-data \
  --if-match $(az storage container show --name regulatory-data --account-name $STORAGE_NAME --auth-mode login --query "properties.immutabilityPolicy.etag" -o tsv) 2>/dev/null

# Excluir o grupo de recursos inteiro
az group delete --name rg-encryption-lab --yes --no-wait

echo "Limpeza concluída. O Key Vault permanecerá em estado de soft-delete pelo período de retenção."
```

## Recursos de aprendizagem

- [Visão geral da criptografia de conta de armazenamento](https://learn.microsoft.com/en-us/azure/storage/common/storage-service-encryption)
- [Configurar chaves gerenciadas pelo cliente](https://learn.microsoft.com/en-us/azure/storage/common/customer-managed-keys-overview)
- [Criptografia de infraestrutura (criptografia dupla)](https://learn.microsoft.com/en-us/azure/storage/common/infrastructure-encryption-enable)
- [Blob Storage imutável](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview)
- [Retenção legal em contêineres](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-legal-hold-overview)
- [Visão geral do Azure Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/general/overview)
