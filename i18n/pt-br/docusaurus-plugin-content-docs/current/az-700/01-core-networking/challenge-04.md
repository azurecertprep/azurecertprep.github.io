---
sidebar_position: 4
title: "Desafio 04: Azure DNS Zonas Privadas & Registro Automático"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 04: Zonas DNS privadas do Azure e registro automático

:::info Tempo e custo estimados

**60-90 minutos** | **~$0,50/zona/mês** (primeiras 25 zonas privadas) | **Peso no exame: 15-20%**

:::

## Cenário

A Contoso opera uma topologia de rede hub-spoke. Eles precisam implementar zonas DNS privadas para habilitar a resolução de nomes entre VMs em VNets emparelhadas sem servidores DNS personalizados. A equipe deve configurar o registro automático para a VNet hub, vincular VNets spoke adicionais para resolução (sem registro automático) e configurar DNS privado para Azure Private Endpoints (zonas privatelink).

## Objetivos de aprendizagem

Após concluir este desafio, você será capaz de:

- Criar e configurar zonas DNS privadas do Azure
- Vincular redes virtuais com e sem registro automático
- Entender o comportamento e as restrições do registro automático
- Configurar zonas DNS privatelink para Azure Private Endpoints
- Verificar a resolução de nomes entre VNets através de DNS privado
- Gerenciar registros DNS manualmente e entender o comportamento de SOA/NS

## Pré-requisitos

- Uma assinatura do Azure com acesso de Contribuidor
- Azure CLI instalado e autenticado (`az login`)
- Módulo Azure PowerShell `Az.PrivateDns` instalado
- Um grupo de recursos para este laboratório (ou permissão para criar um)
- Entendimento básico de conceitos de DNS e emparelhamento de VNet do Azure

---

## Tarefa 1: Criar a infraestrutura de rede hub-spoke

Construa as VNets fundamentais que serão vinculadas às zonas DNS privadas.

### Etapa 1: Criar o grupo de recursos

```bash
az group create \
    --name rg-privatedns-lab \
    --location eastus2
```

### Etapa 2: Criar a VNet hub

```bash
az network vnet create \
    --resource-group rg-privatedns-lab \
    --name vnet-hub \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name subnet-hub-default \
    --subnet-prefixes 10.0.1.0/24 \
    --location eastus2
```

### Etapa 3: Criar as VNets spoke

```bash
az network vnet create \
    --resource-group rg-privatedns-lab \
    --name vnet-spoke1 \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name subnet-spoke1-default \
    --subnet-prefixes 10.1.1.0/24 \
    --location eastus2

az network vnet create \
    --resource-group rg-privatedns-lab \
    --name vnet-spoke2 \
    --address-prefixes 10.2.0.0/16 \
    --subnet-name subnet-spoke2-default \
    --subnet-prefixes 10.2.1.0/24 \
    --location eastus2
```

### Etapa 4: Estabelecer emparelhamento de VNet entre hub e spokes

```bash
az network vnet peering create \
    --resource-group rg-privatedns-lab \
    --name hub-to-spoke1 \
    --vnet-name vnet-hub \
    --remote-vnet vnet-spoke1 \
    --allow-vnet-access

az network vnet peering create \
    --resource-group rg-privatedns-lab \
    --name spoke1-to-hub \
    --vnet-name vnet-spoke1 \
    --remote-vnet vnet-hub \
    --allow-vnet-access

az network vnet peering create \
    --resource-group rg-privatedns-lab \
    --name hub-to-spoke2 \
    --vnet-name vnet-hub \
    --remote-vnet vnet-spoke2 \
    --allow-vnet-access

az network vnet peering create \
    --resource-group rg-privatedns-lab \
    --name spoke2-to-hub \
    --vnet-name vnet-spoke2 \
    --remote-vnet vnet-hub \
    --allow-vnet-access
```

:::tip Nota para o exame

O emparelhamento de VNet não é necessário para a resolução DNS privada. Qualquer VNet vinculada a uma zona DNS privada pode resolver registros nessa zona, independentemente do emparelhamento. No entanto, o emparelhamento é necessário para a conectividade de rede real entre VMs em VNets diferentes.

:::

---

## Tarefa 2: Criar uma zona DNS privada e vincular à VNet hub com registro automático

Crie a zona DNS privada principal e vincule-a à VNet hub com registro automático habilitado para que as VMs implantadas no hub obtenham registros DNS automaticamente.

### Etapa 1: Criar a zona DNS privada

```bash
az network private-dns zone create \
    --resource-group rg-privatedns-lab \
    --name contoso.internal
```

### Etapa 2: Visualizar os registros SOA e NS criados automaticamente

```bash
az network private-dns record-set list \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --output table
```

Cada zona DNS privada é criada com um registro SOA e um registro NS no apex da zona. Esses registros são gerenciados pelo Azure e não podem ser excluídos.

### Etapa 3: Vincular a VNet hub com registro automático habilitado

```bash
az network private-dns link vnet create \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --name link-hub-registration \
    --virtual-network vnet-hub \
    --registration-enabled true
```

### Equivalente em PowerShell

```powershell
# Create the private DNS zone
New-AzPrivateDnsZone -ResourceGroupName rg-privatedns-lab `
    -Name contoso.internal

# Link VNet with auto-registration
$hubVnet = Get-AzVirtualNetwork -ResourceGroupName rg-privatedns-lab `
    -Name vnet-hub

New-AzPrivateDnsVirtualNetworkLink -ResourceGroupName rg-privatedns-lab `
    -ZoneName contoso.internal `
    -Name link-hub-registration `
    -VirtualNetworkId $hubVnet.Id `
    -EnableRegistration
```

### Etapa 4: Verificar se o vínculo foi criado

```bash
az network private-dns link vnet show \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --name link-hub-registration \
    --query "{Name:name, VNet:virtualNetwork.id, Registration:registrationEnabled}" \
    --output table
```

:::tip Nota para o exame

As zonas DNS privadas são recursos globais, não vinculados a nenhuma região específica do Azure. Você pode vincular VNets de qualquer região à mesma zona DNS privada. O nome da zona pode ser qualquer nome que você escolher (não precisa corresponder a um domínio real que você possua).

:::

---

## Tarefa 3: Vincular VNets spoke apenas para resolução (sem registro automático)

Vincule as VNets spoke à zona DNS privada para que as VMs nessas VNets possam resolver nomes, mas seus hostnames não serão registrados automaticamente.

### Etapa 1: Vincular spoke1 apenas para resolução

```bash
az network private-dns link vnet create \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --name link-spoke1-resolution \
    --virtual-network vnet-spoke1 \
    --registration-enabled false
```

### Etapa 2: Vincular spoke2 apenas para resolução

```bash
az network private-dns link vnet create \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --name link-spoke2-resolution \
    --virtual-network vnet-spoke2 \
    --registration-enabled false
```

### Etapa 3: Listar todos os vínculos de rede virtual para a zona

```bash
az network private-dns link vnet list \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --output table
```

### Equivalente em PowerShell

```powershell
$spoke1Vnet = Get-AzVirtualNetwork -ResourceGroupName rg-privatedns-lab `
    -Name vnet-spoke1

New-AzPrivateDnsVirtualNetworkLink -ResourceGroupName rg-privatedns-lab `
    -ZoneName contoso.internal `
    -Name link-spoke1-resolution `
    -VirtualNetworkId $spoke1Vnet.Id

# Omitting -EnableRegistration defaults to registration disabled
```

:::note

Uma VNet vinculada sem registro automático é chamada de "rede virtual de resolução". As VMs nessas VNets podem consultar e resolver registros na zona, mas seus próprios hostnames não são registrados automaticamente. Você deve adicionar registros manualmente para VMs em VNets somente de resolução.

:::

---

## Tarefa 4: Implantar VMs e verificar o registro automático

Implante VMs na VNet hub e em uma VNet spoke para observar como o registro automático cria registros A automaticamente para a VM do hub, enquanto a VM do spoke requer criação manual de registros.

### Etapa 1: Implantar uma VM na VNet hub

```bash
az vm create \
    --resource-group rg-privatedns-lab \
    --name vm-hub-web01 \
    --vnet-name vnet-hub \
    --subnet subnet-hub-default \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --admin-username azureuser \
    --generate-ssh-keys \
    --public-ip-address "" \
    --no-wait
```

### Etapa 2: Implantar uma VM na VNet spoke1

```bash
az vm create \
    --resource-group rg-privatedns-lab \
    --name vm-spoke1-app01 \
    --vnet-name vnet-spoke1 \
    --subnet subnet-spoke1-default \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --admin-username azureuser \
    --generate-ssh-keys \
    --public-ip-address "" \
    --no-wait
```

### Etapa 3: Verificar se o registro automático criou um registro para a VM do hub

Aguarde um ou dois minutos para as VMs terminarem o provisionamento e, em seguida, verifique os registros DNS:

```bash
az network private-dns record-set a list \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --output table
```

Você deverá ver um registro A para `vm-hub-web01` apontando para seu IP privado (por exemplo, `10.0.1.4`). A VM do spoke `vm-spoke1-app01` não aparecerá porque spoke1 está vinculada apenas para resolução.

### Etapa 4: Confirmar que a VM do spoke não possui registro automático

```bash
az network private-dns record-set a show \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --name vm-spoke1-app01 2>&1 || echo "Record does not exist (expected)"
```

:::tip Nota para o exame

O registro automático funciona apenas para máquinas virtuais. Outros recursos (balanceadores de carga internos, application gateways, private endpoints) não são registrados automaticamente. Seus registros DNS devem ser criados manualmente ou através de grupos de zona DNS para private endpoints.

:::

---

## Tarefa 5: Criar zonas DNS privatelink para Azure Private Endpoints

Ao usar Azure Private Endpoints, o padrão recomendado é criar zonas DNS privatelink e vinculá-las às suas VNets para que os registros DNS de private endpoint sejam resolvidos corretamente.

### Etapa 1: Criar uma zona privatelink para Azure Blob Storage

```bash
az network private-dns zone create \
    --resource-group rg-privatedns-lab \
    --name privatelink.blob.core.windows.net
```

### Etapa 2: Criar uma zona privatelink para Azure SQL Database

```bash
az network private-dns zone create \
    --resource-group rg-privatedns-lab \
    --name privatelink.database.windows.net
```

### Etapa 3: Vincular as zonas privatelink a todas as VNets (apenas resolução)

As zonas DNS de private endpoint não devem ter o registro automático habilitado. Os registros são gerenciados automaticamente por grupos de zona DNS associados aos private endpoints.

```bash
# Link blob privatelink zone to hub
az network private-dns link vnet create \
    --resource-group rg-privatedns-lab \
    --zone-name privatelink.blob.core.windows.net \
    --name link-hub-blob \
    --virtual-network vnet-hub \
    --registration-enabled false

# Link blob privatelink zone to spoke1
az network private-dns link vnet create \
    --resource-group rg-privatedns-lab \
    --zone-name privatelink.blob.core.windows.net \
    --name link-spoke1-blob \
    --virtual-network vnet-spoke1 \
    --registration-enabled false

# Link SQL privatelink zone to hub
az network private-dns link vnet create \
    --resource-group rg-privatedns-lab \
    --zone-name privatelink.database.windows.net \
    --name link-hub-sql \
    --virtual-network vnet-hub \
    --registration-enabled false

# Link SQL privatelink zone to spoke1
az network private-dns link vnet create \
    --resource-group rg-privatedns-lab \
    --zone-name privatelink.database.windows.net \
    --name link-spoke1-sql \
    --virtual-network vnet-spoke1 \
    --registration-enabled false
```

### Etapa 4: Listar todas as zonas DNS privadas no grupo de recursos

```bash
az network private-dns zone list \
    --resource-group rg-privatedns-lab \
    --output table
```

### Equivalente em PowerShell

```powershell
New-AzPrivateDnsZone -ResourceGroupName rg-privatedns-lab `
    -Name "privatelink.blob.core.windows.net"

$hubVnet = Get-AzVirtualNetwork -ResourceGroupName rg-privatedns-lab `
    -Name vnet-hub

New-AzPrivateDnsVirtualNetworkLink -ResourceGroupName rg-privatedns-lab `
    -ZoneName "privatelink.blob.core.windows.net" `
    -Name link-hub-blob `
    -VirtualNetworkId $hubVnet.Id
```

:::note

Cada serviço do Azure possui um nome de zona privatelink específico. Exemplos comuns incluem:
- `privatelink.blob.core.windows.net` (Blob Storage)
- `privatelink.database.windows.net` (Azure SQL)
- `privatelink.vaultcore.azure.net` (Key Vault)
- `privatelink.azurewebsites.net` (App Service)
- `privatelink.azurecr.io` (Container Registry)

Uma VNet pode ser vinculada a até 1000 zonas DNS privadas para resolução. Isso torna viável suportar muitas zonas privatelink a partir de uma única VNet.

:::

---

## Tarefa 6: Gerenciar registros manualmente e entender o comportamento de SOA/NS

Adicione, atualize e remova registros manualmente na zona DNS privada. Entenda quais registros são gerenciados pelo sistema e quais são gerenciados pelo usuário.

### Etapa 1: Adicionar um registro A manual para a VM do spoke

```bash
SPOKE1_IP=$(az vm show \
    --resource-group rg-privatedns-lab \
    --name vm-spoke1-app01 \
    --show-details \
    --query privateIps \
    --output tsv)

az network private-dns record-set a add-record \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --record-set-name vm-spoke1-app01 \
    --ipv4-address $SPOKE1_IP
```

### Etapa 2: Adicionar um registro CNAME para um alias de serviço

```bash
az network private-dns record-set cname create \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --name webapp

az network private-dns record-set cname set-record \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --record-set-name webapp \
    --cname vm-hub-web01.contoso.internal
```

### Etapa 3: Atualizar um registro (alterar endereço IP)

Para atualizar um registro A, remova a entrada antiga e adicione a nova:

```bash
# Remove the old record
az network private-dns record-set a remove-record \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --record-set-name vm-spoke1-app01 \
    --ipv4-address $SPOKE1_IP

# Add the updated record
az network private-dns record-set a add-record \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --record-set-name vm-spoke1-app01 \
    --ipv4-address 10.1.1.100
```

### Etapa 4: Excluir um conjunto de registros inteiramente

```bash
az network private-dns record-set a delete \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --name vm-spoke1-app01 \
    --yes
```

### Etapa 5: Tentar excluir o registro SOA (falhará)

```bash
# This will FAIL - SOA records cannot be deleted
az network private-dns record-set soa delete \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal 2>&1 || echo "SOA records are system-managed and cannot be deleted"
```

### Equivalente em PowerShell para gerenciamento manual de registros

```powershell
# Create a new A record set
New-AzPrivateDnsRecordSet -Name "db-server" -RecordType A `
    -ZoneName contoso.internal `
    -ResourceGroupName rg-privatedns-lab -Ttl 3600 `
    -PrivateDnsRecords (New-AzPrivateDnsRecordConfig -IPv4Address "10.1.1.50")

# Remove a record set
Remove-AzPrivateDnsRecordSet -Name "db-server" -RecordType A `
    -ZoneName contoso.internal `
    -ResourceGroupName rg-privatedns-lab
```

### Etapa 6: Visualizar todos os registros incluindo entradas registradas automaticamente

```bash
az network private-dns record-set list \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --output table
```

Registros automáticos possuem `isAutoRegistered: true` em seus metadados. Registros criados manualmente possuem `isAutoRegistered: false` ou o campo está ausente.

:::warning Importante

Você não pode editar ou excluir manualmente registros automáticos. Se precisar substituir um registro automático, você deve desabilitar o registro automático para aquela VNet ou alterar o nome da VM/configuração da NIC. Registros automáticos são gerenciados inteiramente pela plataforma.

:::

---

## Cenários de quebra e correção

### Cenário 1: Tentativa de registro automático em duas zonas para a mesma VNet

Um membro da equipe tenta habilitar o registro automático em uma segunda zona DNS privada para a VNet hub:

```bash
# Create a second private DNS zone
az network private-dns zone create \
    --resource-group rg-privatedns-lab \
    --name contoso.cloud

# This will FAIL because vnet-hub already has auto-registration
# enabled on contoso.internal
az network private-dns link vnet create \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.cloud \
    --name link-hub-cloud-registration \
    --virtual-network vnet-hub \
    --registration-enabled true
```

**Causa raiz:** Uma rede virtual pode ser vinculada a apenas uma zona DNS privada com registro automático habilitado. A VNet hub já está registrada com `contoso.internal`.

**Correção:** Desabilite o registro automático no vínculo existente primeiro, ou vincule a segunda zona com `--registration-enabled false` apenas para resolução.

```bash
# Option A: Link for resolution only
az network private-dns link vnet create \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.cloud \
    --name link-hub-cloud-resolution \
    --virtual-network vnet-hub \
    --registration-enabled false
```

### Cenário 2: Falha na resolução DNS a partir da VNet spoke

Uma VM em spoke2 não consegue resolver `vm-hub-web01.contoso.internal` apesar do emparelhamento de VNet estar estabelecido.

**Causa raiz:** A VNet spoke2 não está vinculada à zona DNS privada `contoso.internal`. O emparelhamento de VNet fornece conectividade de rede, mas a resolução DNS através de zonas privadas requer um vínculo de rede virtual explícito.

**Correção:** Crie um vínculo de rede virtual entre a VNet spoke2 e a zona DNS privada:

```bash
az network private-dns link vnet create \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --name link-spoke2-resolution \
    --virtual-network vnet-spoke2 \
    --registration-enabled false
```

### Cenário 3: Registro automático da VM não está funcionando

Uma nova VM implantada em spoke1 não obtém um registro A na zona DNS privada, mesmo que a VNet esteja vinculada.

**Causa raiz:** O vínculo da VNet spoke1 tem `registration-enabled` definido como `false`. Somente VNets vinculadas com registro automático habilitado terão seus registros de VM criados automaticamente.

**Diagnóstico:**

```bash
az network private-dns link vnet show \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --name link-spoke1-resolution \
    --query registrationEnabled
```

**Correção:** Atualize o vínculo existente para habilitar o registro, ou adicione o registro manualmente. Para atualizar o vínculo:

```bash
az network private-dns link vnet update \
    --resource-group rg-privatedns-lab \
    --zone-name contoso.internal \
    --name link-spoke1-resolution \
    --registration-enabled true
```

Observe que habilitar o registro em spoke1 só é válido se spoke1 ainda não tiver o registro automático habilitado em outra zona DNS privada.

---

## Limpeza de recursos

```bash
az group delete --name rg-privatedns-lab --yes --no-wait
```

---

## Resumo dos conceitos-chave

| Conceito | Detalhe |
|----------|---------|
| Zona DNS privada | Recurso global que fornece resolução de nomes dentro de VNets vinculadas |
| Vínculo de VNet com registro | VNet vinculada com registro automático; registros de VM criados automaticamente |
| Vínculo de VNet de resolução | VNet vinculada sem registro; pode consultar mas não registra automaticamente |
| Limite de registro automático | Uma VNet pode ter registro automático habilitado em apenas 1 zona DNS privada |
| Limite de vínculos de resolução | Uma VNet pode ser vinculada a até 1000 zonas DNS privadas para resolução |
| Limite de conjuntos de registros | 25.000 conjuntos de registros por zona DNS privada |
| Escopo do registro automático | Funciona apenas para máquinas virtuais (não para balanceadores de carga, private endpoints, etc.) |
| Registros SOA e NS | Criados automaticamente e gerenciados pelo sistema; não podem ser excluídos |
| Zonas privatelink | Zonas especiais (ex.: `privatelink.blob.core.windows.net`) para private endpoints |
| Grupos de zona DNS | Gerenciam automaticamente registros A em zonas privatelink para private endpoints |
| Independência de região | Zonas DNS privadas são globais; VNets de qualquer região podem ser vinculadas |

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-04-q1",
    question: "Uma rede virtual já tem auto-registration habilitado na zona DNS privada 'app.internal'. O que acontece quando você tenta criar um segundo link com auto-registration habilitado para 'db.internal' para a mesma VNet?",
    options: [
      "Ambas as zonas registrarão registros de VM da VNet",
      "A operação falha porque uma VNet só pode ter auto-registration habilitado em uma zona DNS privada",
      "O primeiro link é automaticamente rebaixado para somente resolução",
      "A segunda zona tem prioridade e a primeira para de registrar"
    ],
    correctIndex: 1,
    explanation: "Uma rede virtual específica pode ser vinculada a apenas uma zona DNS privada com registro automático habilitado. Tentar criar um segundo link de registro para a mesma VNet falhará com um erro."
  },
  {
    id: "az700-04-q2",
    question: "Você vincula spoke-vnet à zona DNS privada 'contoso.internal' com --registration-enabled false. Uma VM em spoke-vnet tenta resolver 'vm-hub.contoso.internal'. Qual é o resultado?",
    options: [
      "A resolução falha porque o registro está desabilitado",
      "A resolução é bem-sucedida porque a VNet está vinculada para resolução",
      "A resolução só funciona se o peering de VNet estiver configurado",
      "A resolução requer um servidor DNS personalizado para encaminhar a consulta"
    ],
    correctIndex: 1,
    explanation: "Uma VNet vinculada a uma zona DNS privada (mesmo sem auto-registration) pode resolver todos os registros naquela zona. O link de rede virtual de resolução fornece acesso de leitura aos registros da zona. O peering de VNet não é necessário para resolução DNS através de zonas privadas."
  },
  {
    id: "az700-04-q3",
    question: "Quais recursos se beneficiam do auto-registration de zona DNS privada?",
    options: [
      "Máquinas virtuais, load balancers internos e application gateways",
      "Somente máquinas virtuais",
      "Todos os recursos com um IP privado na VNet vinculada",
      "Máquinas virtuais e private endpoints"
    ],
    correctIndex: 1,
    explanation: "O auto-registration funciona apenas para máquinas virtuais. Registros DNS para todos os outros recursos (load balancers internos, private endpoints, application gateways) devem ser criados manualmente ou através de DNS zone groups."
  },
  {
    id: "az700-04-q4",
    question: "Você precisa garantir que VMs em três VNets (hub, spoke1, spoke2) possam resolver umas às outras usando a zona DNS privada 'corp.local'. Nenhuma das VNets tem auto-registration habilitado em outra zona. Qual é a configuração mínima?",
    options: [
      "Vincular todas as três VNets com auto-registration habilitado",
      "Vincular todas as três VNets à zona (auto-registration em pelo menos uma) e criar registros manuais para VMs em VNets somente resolução",
      "Configurar peering de VNet entre todas as três VNets; o DNS resolve automaticamente através do peering",
      "Implantar Azure DNS Private Resolver na VNet hub"
    ],
    correctIndex: 0,
    explanation: "A configuração mínima é vincular todas as três VNets com auto-registration habilitado em 'corp.local'. O limite é uma zona de auto-registration POR VNET (não uma VNet por zona). Até 100 VNets podem ter auto-registration habilitado na mesma zona. Como nenhuma dessas VNets já faz auto-registration em outra zona, todas as três podem se registrar automaticamente em 'corp.local', dando a cada VM um registro A automático e acesso completo à resolução."
  },
  {
    id: "az700-04-q5",
    question: "Qual comando cria corretamente um link de rede virtual para uma zona DNS privada com auto-registration habilitado?",
    options: [
      "az network private-dns link vnet create --zone-name corp.internal --name mylink --virtual-network myVnet --registration-enabled true",
      "az network dns link vnet create --zone-name corp.internal --name mylink --virtual-network myVnet --auto-register true",
      "az network private-dns vnet-link create --zone corp.internal --name mylink --vnet myVnet --enable-registration",
      "az network private-dns link vnet create --zone-name corp.internal --name mylink --virtual-network myVnet --auto-registration true"
    ],
    correctIndex: 0,
    explanation: "O comando correto é 'az network private-dns link vnet create' com o parâmetro --registration-enabled (não --auto-register ou --auto-registration). O parâmetro --resource-group também é necessário, mas foi omitido aqui por brevidade."
  },
  {
    id: "az700-04-q6",
    question: "Sua organização usa privatelink.blob.core.windows.net para private endpoints de contas de armazenamento. Uma VM em spoke-vnet não consegue resolver o FQDN do private endpoint. A VNet hub está vinculada à zona privatelink. O que você deve fazer?",
    options: [
      "Habilitar auto-registration na zona privatelink para spoke-vnet",
      "Criar um link de VNet da zona privatelink para spoke-vnet com registro desabilitado",
      "Adicionar um conditional forwarder nas configurações DNS de spoke-vnet",
      "Criar um peering de VNet entre spoke-vnet e a VNet da conta de armazenamento"
    ],
    correctIndex: 1,
    explanation: "Para que uma VNet resolva registros em uma zona DNS privada, ela deve estar vinculada a essa zona. Criar um link de rede virtual com registro desabilitado permite que as VMs de spoke-vnet resolvam os registros do private endpoint. O auto-registration não deve ser habilitado em zonas privatelink."
  }
]} />

---

## Recursos adicionais

- [Azure Private DNS overview](https://learn.microsoft.com/azure/dns/private-dns-overview)
- [What is the autoregistration feature?](https://learn.microsoft.com/azure/dns/private-dns-autoregistration)
- [Virtual network links](https://learn.microsoft.com/azure/dns/private-dns-virtual-network-links)
- [Quickstart: Create a private DNS zone using Azure CLI](https://learn.microsoft.com/azure/dns/private-dns-getstarted-cli)
- [Azure Private Endpoint DNS configuration](https://learn.microsoft.com/azure/private-link/private-endpoint-dns)
- [Azure DNS limits](https://learn.microsoft.com/azure/azure-resource-manager/management/azure-subscription-service-limits#azure-dns-limits)
