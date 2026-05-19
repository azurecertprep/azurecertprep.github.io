---
sidebar_position: 2
title: "Challenge 08 | Virtual Machines & Scale Sets"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Desafio 08: Virtual machines & scale sets

:::info Informação

**Tempo estimado: 60–75 minutos** | **Custo estimado: ~$0.50** (desaloque rapidamente!) | **Peso no exame: 20–25%**

:::
:::danger Aviso de Custo

Máquinas virtuais geram cobranças enquanto estão em execução. **Desaloque todas as VMs** assim que terminar cada tarefa. O script de limpeza no final exclui tudo | execute-o quando terminar.

:::
## Cenário

A Contoso precisa implantar uma frota de servidores web para sua aplicação voltada ao cliente. Comece com uma única VM Linux para validar a configuração, depois escale para um VM Scale Set (VMSS) para a carga de trabalho de produção. A infraestrutura deve suportar falhas de zona de disponibilidade e escalar automaticamente durante picos de tráfego.

## Habilidades do exame cobertas

| Habilidade | Peso |
|------------|------|
| Criar e configurar uma VM | Alto |
| Configurar discos de VM (anexar, redimensionar, criptografar) | Alto |
| Gerenciar tamanhos de VM | Médio |
| Mover VMs entre grupos de recursos | Médio |
| Implantar VMs em zonas/conjuntos de disponibilidade | Alto |
| Implantar e configurar VM Scale Sets | Alto |
| Configurar autoscale de VMSS | Alto |

## Referência sysadmin ↔ Azure

| Tradicional | Equivalente no Azure |
|-------------|---------------------|
| Hyper-V / VMware ESXi | Azure Virtual Machines |
| Templates de VM / imagens golden | Imagens de VM do Azure / Shared Image Gallery |
| Armazenamento SAN / NAS conectado | Azure Managed Disks |
| Diversidade física de racks | Availability Zones (nível de datacenter) |
| Cluster de servidores idênticos | VM Scale Sets (VMSS) |
| Load balancer + auto-provisionamento | Regras de autoscale do VMSS |

## Tarefas

### Tarefa 1: criar uma VM Linux com chaves SSH

```bash
# Criar um grupo de recursos
az group create --name rg-vm-lab --location eastus

# Criar uma VM ubuntu com autenticação por chave SSH
az vm create \
  --resource-group rg-vm-lab \
  --name vm-web-01 \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --output table

# Verificar se a VM está em execução
az vm show --resource-group rg-vm-lab --name vm-web-01 \
  --query "{Name:name, State:powerState, Size:hardwareProfile.vmSize}" -o table

# Conectar via SSH na VM (use o IP público da saída do create)
VM_IP=$(az vm show -g rg-vm-lab -n vm-web-01 -d --query publicIps -o tsv)
echo "SSH com: ssh azureuser@$VM_IP"
```

### Tarefa 2: anexar e montar um disco de dados

```bash
# Anexar um disco de dados de 128 GB
az vm disk attach \
  --resource-group rg-vm-lab \
  --vm-name vm-web-01 \
  --name disk-data-01 \
  --size-gb 128 \
  --sku Premium_LRS \
  --new

# Listar discos anexados à VM
az vm show -g rg-vm-lab -n vm-web-01 \
  --query "storageProfile.dataDisks[].{Name:name, SizeGB:diskSizeGb, LUN:lun}" -o table
```

<details>
<summary>Dica | Formatar e montar o disco dentro da VM</summary>

Conecte via SSH na VM e execute:
```bash
# Encontrar o novo disco
lsblk

# Particionar e formatar (geralmente /dev/sdc)
sudo parted /dev/sdc --script mklabel gpt mkpart primary ext4 0% 100%
sudo mkfs.ext4 /dev/sdc1

# Montar
sudo mkdir /data
sudo mount /dev/sdc1 /data

# Tornar persistente entre reinicializações
echo '/dev/sdc1 /data ext4 defaults 0 2' | sudo tee -a /etc/fstab

# Verificar
df -h /data
```
</details>

### Tarefa 3: redimensionar a VM

```bash
# Listar tamanhos disponíveis na localização da VM
az vm list-sizes --location eastus --query "[?starts_with(name,'Standard_B')]" -o table

# Redimensionar a VM (requer reinicialização)
az vm resize \
  --resource-group rg-vm-lab \
  --name vm-web-01 \
  --size Standard_B2s

# Verificar o novo tamanho
az vm show -g rg-vm-lab -n vm-web-01 \
  --query "hardwareProfile.vmSize" -o tsv
```

### Tarefa 4: mover uma VM para outro grupo de recursos

```bash
# Criar um grupo de recursos de destino
az group create --name rg-vm-prod --location eastus

# Obter o ID do recurso da VM
VM_ID=$(az vm show -g rg-vm-lab -n vm-web-01 --query id -o tsv)

# Mover a VM e todos os recursos dependentes (nic, disco, IP público, nsg)
az resource move \
  --destination-group rg-vm-prod \
  --ids $VM_ID

# NOTA: mover VMs também requer mover recursos dependentes.
# Liste todos os recursos para obter seus IDs:
az resource list -g rg-vm-lab --query "[].id" -o tsv
```

<details>
<summary>Dica | Movendo todos os recursos dependentes</summary>

Você deve mover a VM e todos os seus recursos dependentes juntos:
```bash
RESOURCE_IDS=$(az resource list -g rg-vm-lab --query "[].id" -o tsv | tr '\n' ' ')
az resource move --destination-group rg-vm-prod --ids $RESOURCE_IDS
```
</details>

### Tarefa 5: criar um availability set e implantar uma VM

```bash
# Criar um availability set
az vm availability-set create \
  --resource-group rg-vm-lab \
  --name avset-web \
  --platform-fault-domain-count 2 \
  --platform-update-domain-count 5

# Implantar uma VM no availability set
az vm create \
  --resource-group rg-vm-lab \
  --name vm-web-avset \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --availability-set avset-web \
  --no-wait
```

### Tarefa 6: criar um VMSS com autoscale

```bash
# Criar um VM scale set com 2 instâncias
az vmss create \
  --resource-group rg-vm-lab \
  --name vmss-web \
  --image Ubuntu2204 \
  --vm-sku Standard_B1s \
  --instance-count 2 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --upgrade-policy-mode automatic \
  --load-balancer lb-vmss-web

# Verificar as instâncias
az vmss list-instances -g rg-vm-lab -n vmss-web -o table

# Criar configurações de autoscale (escalar quando CPU > 75%, reduzir quando CPU < 25%)
az monitor autoscale create \
  --resource-group rg-vm-lab \
  --resource vmss-web \
  --resource-type Microsoft.Compute/virtualMachineScaleSets \
  --name autoscale-vmss-web \
  --min-count 2 \
  --max-count 5 \
  --count 2

# Adicionar regra de scale-out
az monitor autoscale rule create \
  --resource-group rg-vm-lab \
  --autoscale-name autoscale-vmss-web \
  --condition "Percentage CPU > 75 avg 5m" \
  --scale out 1

# Adicionar regra de scale-in
az monitor autoscale rule create \
  --resource-group rg-vm-lab \
  --autoscale-name autoscale-vmss-web \
  --condition "Percentage CPU < 25 avg 5m" \
  --scale in 1
```

### Tarefa 7: testar o autoscale com carga

```bash
# Obter o IP público do load balancer
LB_IP=$(az network public-ip show -g rg-vm-lab \
  -n vmss-webLBPublicIP --query ipAddress -o tsv)

# Conectar via SSH em uma instância do VMSS e gerar carga de CPU
az vmss list-instance-connection-info -g rg-vm-lab -n vmss-web -o table

# Dentro da VM, execute um teste de estresse de CPU:
# sudo apt-get update && sudo apt-get install -y stress
# stress --cpu 4 --timeout 300

# Monitorar a atividade de autoscale
az monitor autoscale show -g rg-vm-lab -n autoscale-vmss-web \
  --query "{MinCount:profiles[0].capacity.minimum, MaxCount:profiles[0].capacity.maximum}" -o table

az vmss list-instances -g rg-vm-lab -n vmss-web -o table
```

### Tarefa 8: desalocar para parar cobranças

```bash
# Desalocar a VM standalone (para a cobrança de computação)
az vm deallocate --resource-group rg-vm-lab --name vm-web-avset --no-wait

# Desalocar instâncias do VMSS
az vmss deallocate --resource-group rg-vm-lab --name vmss-web

# Verificar o estado de energia
az vm list -g rg-vm-lab --query "[].{Name:name, State:powerState}" -o table
```

## Critérios de sucesso

<SuccessChecklist
  storageKey="az104-challenge-08"
  items={[
    "VM Linux criada com autenticação por chave SSH",
    "Disco de dados de 128 GB anexado, formatado e montado",
    "VM redimensionada para um SKU diferente",
    "VM movida para um grupo de recursos diferente",
    "Availability set criado com domínios de falha/atualização corretos",
    "VMSS em execução com 2 instâncias atrás de um load balancer",
    "Regras de autoscale configuradas (scale-out e scale-in baseados em CPU)",
    "Todas as VMs desalocadas ao terminar"
  ]}
/>
## Cenários quebre & conserte

### Cenário a: tamanho de VM indisponível
```bash
# Tente redimensionar para um tamanho não disponível na zona atual
az vm resize -g rg-vm-lab -n vm-web-avset --size Standard_M128s
# Como você encontra quais tamanhos estão disponíveis?
# az vm list-vm-resize-options -g rg-vm-lab -n vm-web-avset -o table
```

### Cenário b: mover VM com IP público
```bash
# Tente mover uma VM enquanto ela tem recursos dependentes no grupo de origem
# Qual erro você recebe? quais recursos devem ser movidos juntos?
```

### Cenário c: conflito de contagem de instâncias do VMSS
```bash
# Tente definir min-count maior que max-count
az monitor autoscale update \
  --resource-group rg-vm-lab \
  --name autoscale-vmss-web \
  --min-count 10 --max-count 5
```

## Teste seus conhecimentos

**1. Qual é a diferença entre parar e desalocar uma VM?**

<details>
<summary>Mostrar Resposta</summary>

- **Parar** (de dentro do SO): A VM é desligada, mas o Azure **ainda reserva os recursos de computação e cobra você**. O status aparece como "Parada".
- **Desalocar** (`az vm deallocate`): A VM libera os recursos de computação e **você para de pagar pela computação**. Você ainda paga por discos e IPs públicos. O status aparece como "Parada (desalocada)".
</details>

**2. Qual é a diferença entre um Availability Set e uma Availability Zone?**

<details>
<summary>Mostrar Resposta</summary>

- **Availability Set**: Distribui VMs entre domínios de falha (racks separados) e domínios de atualização (grupos de reinicialização separados) **dentro de um único datacenter**. SLA: 99,95%.
- **Availability Zone**: Distribui VMs entre **datacenters fisicamente separados** dentro de uma região. Cada zona tem energia, refrigeração e rede independentes. SLA: 99,99%.
</details>

**3. O que são domínios de falha e domínios de atualização?**

<details>
<summary>Mostrar Resposta</summary>

- **Domínio de Falha (FD)**: Um grupo de VMs compartilhando uma fonte de energia e switch de rede comuns (essencialmente um rack). Se um rack falhar, VMs em outros domínios de falha não são afetadas. Máximo: 3 FDs.
- **Domínio de Atualização (UD)**: Um grupo de VMs que o Azure reinicializa juntas durante manutenção planejada. Apenas um UD é reinicializado por vez. Máximo: 20 UDs.
</details>

**4. Quais são os modos de orquestração do VMSS?**

<details>
<summary>Mostrar Resposta</summary>

- **Uniform**: Todas as instâncias usam o mesmo modelo/configuração de VM. Melhor para cargas de trabalho stateless em grande escala. Suporta até 1.000 instâncias (3.000 com imagens personalizadas).
- **Flexible**: As instâncias podem misturar tamanhos e configurações de VM. Melhor para cargas de trabalho mistas. Suporta availability zones nativamente. Este é o modo mais novo é recomendado.
</details>

## Limpeza

```bash
# Excluir todos os recursos: execute quando terminar completamente
az group delete --name rg-vm-lab --yes --no-wait
az group delete --name rg-vm-prod --yes --no-wait

echo "Os recursos estão sendo excluídos em segundo plano."
echo "Verifique no portal que ambos os grupos de recursos foram removidos."
```
