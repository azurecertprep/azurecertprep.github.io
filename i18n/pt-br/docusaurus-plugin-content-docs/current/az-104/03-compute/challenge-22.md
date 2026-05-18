---
sidebar_position: 22
title: "Desafio 22: Discos de VM & Criptografia"
---

# Desafio 22: Discos de VM & Criptografia

:::info Tempo Estimado e Custo

**60-75 minutos** | **Custo estimado**: ~$3,00 (VMs + managed disks) | **Peso no Exame: 15-20%**

:::

## Cenário

A Contoso Ltd. está padronizando o gerenciamento de discos em sua frota de VMs. A equipe de segurança exige que todos os discos sejam criptografados, a equipe de operações precisa de uma estratégia confiável de snapshots e imagens para recuperação de desastres, e a equipe de desenvolvimento quer desempenho de disco mais rápido para seus workloads de banco de dados. Você foi encarregado de implementar uma estratégia abrangente de gerenciamento de discos que cobre tipos de disco, criptografia, snapshots e imagens personalizadas.

## Habilidades do Exame Cobertas

| Habilidade | Peso |
|------------|------|
| Criar e configurar managed disks | Alto |
| Gerenciar discos de VM (anexar, desanexar, redimensionar) | Alto |
| Configurar Azure Disk Encryption (ADE) | Alto |
| Configurar criptografia no host | Médio |
| Criar snapshots de disco | Alto |
| Criar imagens personalizadas de VM a partir de VMs generalizadas | Alto |
| Configurar cache e desempenho de disco | Médio |

## Referência Sysadmin ↔ Azure

| On-Prem / Sysadmin | Equivalente Azure | Notas |
|---------------------|-------------------|-------|
| LUNs de SAN/NAS | Managed disks | Azure gerencia o armazenamento subjacente |
| RAID 0 (striping para velocidade) | Premium SSD / Ultra Disk | Tiers de desempenho, sem RAID manual |
| BitLocker / dm-crypt | Azure Disk Encryption (ADE) | Usa Key Vault para armazenamento de chaves |
| Criptografia de hardware (SED) | Criptografia no host | Criptografado antes de chegar ao armazenamento |
| Snapshot do VMware | Snapshot de disco do Azure | Cópia point-in-time do disco |
| Imagem Ghost / Clonezilla | Imagem personalizada de VM (generalizada) | Template para implantação de novas VMs |
| Hot swap de disco no servidor | Anexar/desanexar managed disk | Anexar online sem reboot (discos de dados) |
| Monitoramento de desempenho de disco | Métricas de disco (IOPS, throughput) | Integração com Azure Monitor |

## Tarefas

### Tarefa 1: Criar o Ambiente do Laboratório

```bash
# Criar grupo de recursos
az group create --name rg-disks-lab --location eastus

# Criar uma VM Linux com disco de SO padrão
az vm create \
  --name vm-disk-lab \
  --resource-group rg-disks-lab \
  --image Ubuntu2404 \
  --size Standard_D2s_v3 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --os-disk-size-gb 64 \
  --os-disk-caching ReadWrite \
  --storage-sku Premium_LRS \
  --tags Environment=Development Purpose=DiskLab

# Criar um Key Vault para criptografia de disco
az keyvault create \
  --name kv-disk-enc-$RANDOM \
  --resource-group rg-disks-lab \
  --location eastus \
  --enabled-for-disk-encryption true \
  --enable-purge-protection true

KV_NAME=$(az keyvault list -g rg-disks-lab --query "[0].name" -o tsv)
```

### Tarefa 2: Criar e Anexar Managed Disks

Crie discos de diferentes tiers de desempenho e anexe-os:

```bash
# Criar um disco de dados Standard HDD (econômico, IOPS baixo)
az disk create \
  --name disk-data-standard \
  --resource-group rg-disks-lab \
  --location eastus \
  --size-gb 128 \
  --sku Standard_LRS \
  --tags Purpose=Archives Tier=Standard

# Criar um disco de dados Premium SSD (IOPS alto para bancos de dados)
az disk create \
  --name disk-data-premium \
  --resource-group rg-disks-lab \
  --location eastus \
  --size-gb 256 \
  --sku Premium_LRS \
  --tags Purpose=Database Tier=Premium

# Anexar o disco Standard à VM (LUN 0)
az vm disk attach \
  --resource-group rg-disks-lab \
  --vm-name vm-disk-lab \
  --name disk-data-standard \
  --lun 0 \
  --caching None

# Anexar o disco Premium à VM (LUN 1)
az vm disk attach \
  --resource-group rg-disks-lab \
  --vm-name vm-disk-lab \
  --name disk-data-premium \
  --lun 1 \
  --caching ReadOnly

# Verificar discos anexados
az vm show \
  --resource-group rg-disks-lab \
  --name vm-disk-lab \
  --query "storageProfile.dataDisks[].{Name:name, SizeGB:diskSizeGb, Lun:lun, Caching:caching}" -o table
```

### Tarefa 3: Inicializar e Montar Discos Dentro da VM

```bash
# Usar Run Command para particionar e montar os discos
az vm run-command invoke \
  --resource-group rg-disks-lab \
  --name vm-disk-lab \
  --command-id RunShellScript \
  --scripts '
    # Particionar e formatar o disco Standard (LUN 0 = /dev/sdc)
    parted /dev/sdc --script mklabel gpt mkpart primary ext4 0% 100%
    mkfs.ext4 /dev/sdc1
    mkdir -p /mnt/archives
    mount /dev/sdc1 /mnt/archives
    echo "/dev/sdc1 /mnt/archives ext4 defaults,nofail 0 2" >> /etc/fstab
    
    # Particionar e formatar o disco Premium (LUN 1 = /dev/sdd)
    parted /dev/sdd --script mklabel gpt mkpart primary ext4 0% 100%
    mkfs.ext4 /dev/sdd1
    mkdir -p /mnt/database
    mount /dev/sdd1 /mnt/database
    echo "/dev/sdd1 /mnt/database ext4 defaults,nofail 0 2" >> /etc/fstab
    
    # Verificar montagens
    df -h /mnt/archives /mnt/database
    
    # Escrever dados de teste
    echo "Archive data stored here" > /mnt/archives/test.txt
    echo "Database files stored here" > /mnt/database/test.txt
  '
```

### Tarefa 4: Configurar Azure Disk Encryption (ADE)

Habilite o Azure Disk Encryption usando Key Vault:

```bash
# Habilitar Azure Disk Encryption na VM
az vm encryption enable \
  --resource-group rg-disks-lab \
  --name vm-disk-lab \
  --disk-encryption-keyvault $KV_NAME \
  --volume-type All

# Verificar status de criptografia (pode levar vários minutos)
az vm encryption show \
  --resource-group rg-disks-lab \
  --name vm-disk-lab \
  --query "{OsDisk:disks[?name=='os'].encryptionSettings[0], DataDisks:disks[?name!='os'].encryptionSettings[0], Status:status}" -o json

# Esperar e reverificar até a criptografia ser concluída
az vm encryption show \
  --resource-group rg-disks-lab \
  --name vm-disk-lab \
  --query "status" -o tsv
```

:::tip Dica

O Azure Disk Encryption pode levar de 15 a 30 minutos para ser concluído, dependendo do tamanho do disco. A VM permanece operacional durante a criptografia. Monitore o progresso com `az vm encryption show`.

:::

### Tarefa 5: Criar Snapshots de Disco

Crie snapshots point-in-time para fins de backup:

```bash
# Obter o resource ID do disco de SO
OS_DISK_ID=$(az vm show \
  --resource-group rg-disks-lab \
  --name vm-disk-lab \
  --query "storageProfile.osDisk.managedDisk.id" -o tsv)

# Criar um snapshot do disco de SO
az snapshot create \
  --name snap-os-disk-$(date +%Y%m%d) \
  --resource-group rg-disks-lab \
  --source $OS_DISK_ID \
  --tags Purpose=Backup Date=$(date +%Y-%m-%d)

# Criar um snapshot do disco de dados Premium
PREMIUM_DISK_ID=$(az disk show \
  --name disk-data-premium \
  --resource-group rg-disks-lab \
  --query id -o tsv)

az snapshot create \
  --name snap-premium-disk-$(date +%Y%m%d) \
  --resource-group rg-disks-lab \
  --source $PREMIUM_DISK_ID \
  --tags Purpose=Backup Date=$(date +%Y-%m-%d)

# Listar todos os snapshots
az snapshot list \
  --resource-group rg-disks-lab \
  --query "[].{Name:name, SizeGB:diskSizeGb, Source:creationData.sourceResourceId}" -o table
```

### Tarefa 6: Criar um Disco a partir de um Snapshot

```bash
# Criar um novo managed disk a partir do snapshot
SNAP_ID=$(az snapshot show \
  --name snap-premium-disk-$(date +%Y%m%d) \
  --resource-group rg-disks-lab \
  --query id -o tsv)

az disk create \
  --name disk-restored-from-snap \
  --resource-group rg-disks-lab \
  --source $SNAP_ID \
  --sku Premium_LRS \
  --size-gb 256

# Verificar o disco restaurado
az disk show \
  --name disk-restored-from-snap \
  --resource-group rg-disks-lab \
  --query "{Name:name, SizeGB:diskSizeGb, Sku:sku.name, ProvisioningState:provisioningState}" -o table
```

### Tarefa 7: Criar uma Imagem Personalizada de VM (Generalizada)

Crie uma imagem reutilizável a partir da VM para implantação rápida:

```bash
# Primeiro, generalizar a VM (ATENÇÃO: VM não pode ser usada após isso)
# Executar o comando de desprovisionamento dentro da VM
az vm run-command invoke \
  --resource-group rg-disks-lab \
  --name vm-disk-lab \
  --command-id RunShellScript \
  --scripts "waagent -deprovision+user -force"

# Desalocar a VM
az vm deallocate \
  --resource-group rg-disks-lab \
  --name vm-disk-lab

# Marcar a VM como generalizada
az vm generalize \
  --resource-group rg-disks-lab \
  --name vm-disk-lab

# Criar uma imagem personalizada a partir da VM generalizada
az image create \
  --name img-contoso-base-linux \
  --resource-group rg-disks-lab \
  --source vm-disk-lab \
  --tags Version=1.0 OS=Ubuntu2404 Purpose=BaseImage

# Verificar a imagem
az image show \
  --name img-contoso-base-linux \
  --resource-group rg-disks-lab \
  --query "{Name:name, State:provisioningState, Source:sourceVirtualMachine.id}" -o table
```

### Tarefa 8: Implantar uma Nova VM a partir da Imagem Personalizada

```bash
# Criar uma nova VM a partir da imagem personalizada
az vm create \
  --name vm-from-image \
  --resource-group rg-disks-lab \
  --image img-contoso-base-linux \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --tags CreatedFrom=CustomImage

# Verificar se a nova VM está rodando com o software pré-configurado
az vm run-command invoke \
  --resource-group rg-disks-lab \
  --name vm-from-image \
  --command-id RunShellScript \
  --scripts "cat /opt/contoso/logs/setup.log 2>/dev/null || echo 'No pre-config found (expected if image was from fresh VM)'"
```

### Tarefa 9: Redimensionar um Managed Disk

```bash
# Desalocar a nova VM para redimensionar seu disco de SO
az vm deallocate \
  --resource-group rg-disks-lab \
  --name vm-from-image

# Redimensionar o disco de SO do padrão para 128 GB
az disk update \
  --resource-group rg-disks-lab \
  --name $(az vm show -g rg-disks-lab -n vm-from-image --query "storageProfile.osDisk.name" -o tsv) \
  --size-gb 128

# Reiniciar a VM
az vm start \
  --resource-group rg-disks-lab \
  --name vm-from-image

# Expandir o filesystem dentro da VM
az vm run-command invoke \
  --resource-group rg-disks-lab \
  --name vm-from-image \
  --command-id RunShellScript \
  --scripts "growpart /dev/sda 1 && resize2fs /dev/sda1 && df -h /"
```

### Tarefa 10: Comparar Tiers de Desempenho de Disco

```bash
# Visualizar características de desempenho dos discos
az disk list \
  --resource-group rg-disks-lab \
  --query "[].{Name:name, SKU:sku.name, SizeGB:diskSizeGb, IOPS:diskIOPSReadWrite, Throughput:diskMBpsReadWrite}" -o table
```

:::tip Dica

| Tipo de Disco | IOPS Máximo | Throughput Máximo | Caso de Uso |
|---------------|-------------|-------------------|-------------|
| Standard HDD (Standard_LRS) | 500 | 60 MB/s | Backups, dev/test, acesso infrequente |
| Standard SSD (StandardSSD_LRS) | 6.000 | 750 MB/s | Servidores web, bancos leves |
| Premium SSD (Premium_LRS) | 20.000 | 900 MB/s | Bancos em produção, I/O intensivo |
| Ultra Disk (UltraSSD_LRS) | 160.000 | 4.000 MB/s | SAP HANA, bancos de alto desempenho |

:::

## Critérios de Sucesso

- [ ] VM tem um disco de SO e pelo menos dois discos de dados (SKUs diferentes) anexados
- [ ] Discos de dados estão formatados, montados e persistem entre reboots (fstab)
- [ ] Azure Disk Encryption está habilitado em todos os volumes
- [ ] Pelo menos dois snapshots existem (disco de SO e disco de dados)
- [ ] Um novo disco foi criado a partir de um snapshot
- [ ] Uma imagem personalizada de VM existe a partir de uma VM generalizada
- [ ] Uma nova VM foi implantada com sucesso a partir da imagem personalizada
- [ ] Um managed disk foi redimensionado e o filesystem expandido

## Dicas

<details>
<summary>Dica 1: Opções de cache de disco</summary>

- **None**: Sem cache. Melhor para workloads com muita escrita (logs de banco de dados).
- **ReadOnly**: Cacheia leituras na memória. Melhor para workloads com muita leitura (discos de SO, bancos com muita leitura).
- **ReadWrite**: Cacheia tanto leituras quanto escritas. Recomendado apenas para discos de SO. Risco de perda de dados em falha do host.

Premium SSDs suportam todos os três modos. Standard HDDs suportam None e ReadOnly.

</details>

<details>
<summary>Dica 2: Imagens generalizadas vs especializadas</summary>

- **Generalizada**: VM foi desprovisionada (sysprep no Windows, waagent -deprovision no Linux). Informações específicas da máquina são removidas. Novas VMs a partir desta imagem requerem novo hostname, credenciais de admin, etc.
- **Especializada**: Cópia exata da VM incluindo toda configuração, software instalado e contas de usuário. Novas VMs a partir desta imagem inicializam como clones.

O exame frequentemente testa quando usar cada tipo.

</details>

<details>
<summary>Dica 3: Pré-requisitos do ADE</summary>

O Azure Disk Encryption requer:
1. Key Vault com política de acesso "Habilitado para criptografia de disco"
2. Key Vault e VM devem estar na mesma região e assinatura
3. Tamanho da VM deve suportar criptografia (a maioria suporta, exceto série A básica)
4. Key Vault deve ter proteção contra purge habilitada (recomendado)

</details>

<details>
<summary>Dica 4: Redimensionamento de disco é unidirecional</summary>

Você só pode aumentar o tamanho de um managed disk, nunca diminuir. Se precisar de um disco menor, crie um novo disco menor, copie os dados e troque. Sempre desaloque a VM antes de redimensionar o disco de SO (discos de dados às vezes podem ser redimensionados online).

</details>

## Quebrar & Consertar

### Cenário A: Falha na Criptografia de Disco

Tente habilitar o ADE em uma VM quando o Key Vault não tem "Habilitado para criptografia de disco" definido. Observe a mensagem de erro e remedie:

```bash
# Verificar políticas do Key Vault
az keyvault show --name $KV_NAME \
  --query "{EnabledForDiskEncryption:properties.enabledForDiskEncryption}" -o table
```

### Cenário B: Snapshot de VM em Execução

Crie um snapshot enquanto a VM está em execução e dados estão sendo escritos. O snapshot é crash-consistent ou application-consistent? Quais são as implicações para bancos de dados?

### Cenário C: Desanexar Disco Enquanto Montado

Tente desanexar um disco de dados que está atualmente montado dentro da VM sem desmontar primeiro. O que acontece? (Resposta: A operação de desanexar no nível do Azure pode ter sucesso, mas a VM experimentará erros de I/O naquele ponto de montagem.)

```bash
# Forçar desanexar um disco (perigoso)
az vm disk detach \
  --resource-group rg-disks-lab \
  --vm-name vm-from-image \
  --name disk-restored-from-snap
```

## Verificação de Conhecimento

<details>
<summary>1. Qual é a diferença entre Azure Disk Encryption (ADE) e Criptografia no Host?</summary>

**Azure Disk Encryption (ADE)**: Criptografa dados usando dm-crypt (Linux) ou BitLocker (Windows) dentro da VM. O SO convidado da VM lida com a criptografia/descriptografia. Chaves são armazenadas no Key Vault.

**Criptografia no Host**: Criptografa dados no nível do host de computação antes de chegar ao Azure Storage. Os dados são criptografados em trânsito entre host e armazenamento, e em repouso. Não requer Key Vault e não tem impacto no desempenho da VM já que a criptografia acontece no hardware do host.

Ambos podem ser usados juntos para defesa em profundidade.

</details>

<details>
<summary>2. Você pode redimensionar um managed disk para um tamanho menor?</summary>

**Não.** Managed disks só podem ser aumentados em tamanho, nunca diminuídos. Esta é uma limitação fundamental. Se você precisa de um disco menor, deve criar um novo disco com o tamanho desejado, copiar os dados usando ferramentas como dd ou AzCopy, e então trocar os discos na VM.

</details>

<details>
<summary>3. O que acontece com uma VM se você excluir a chave do Key Vault usada para ADE?</summary>

Se a chave de criptografia for perdida ou permanentemente excluída, os discos criptografados se tornam **permanentemente inacessíveis**. A VM falhará ao inicializar (para criptografia do disco de SO) ou perderá acesso aos discos de dados. Por isso a proteção contra purge no Key Vault é crítica para cenários ADE.

</details>

<details>
<summary>4. Qual é a diferença entre um snapshot e uma imagem personalizada?</summary>

**Snapshot**: Uma cópia point-in-time de um único managed disk. Usado para backup e criação de novos discos. Não inclui configuração da VM (tamanho, rede, extensões).

**Imagem personalizada**: Inclui o disco de SO (e opcionalmente discos de dados) mais metadados de configuração da VM. Criada a partir de uma VM generalizada ou especializada. Usada como template para implantar novas VMs com configuração idêntica.

</details>

## Limpeza

```bash
# Excluir o grupo de recursos inteiro e todos os recursos (VMs, discos, snapshots, imagens, Key Vault)
az group delete --name rg-disks-lab --yes --no-wait

echo "Limpeza concluída. O Key Vault permanecerá em estado de soft-delete."
```

## Recursos de Aprendizagem

- [Visão geral de managed disks](https://learn.microsoft.com/en-us/azure/virtual-machines/managed-disks-overview)
- [Tipos de disco e desempenho](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types)
- [Azure Disk Encryption para Linux](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/disk-encryption-overview)
- [Criar um snapshot de um managed disk](https://learn.microsoft.com/en-us/azure/virtual-machines/snapshot-copy-managed-disk)
- [Criar uma VM a partir de uma imagem personalizada](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/tutorial-custom-images)
- [Criptografia no host](https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption#encryption-at-host)
- [Redimensionar managed disks](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/expand-disks)
