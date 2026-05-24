---
sidebar_position: 8
title: "Desafio 21: ExpressRoute Microsoft Peering & Criptografia [SIMULAÇÃO]"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 21: ExpressRoute Microsoft peering e criptografia

:::caution Modo de simulação
Este desafio é baseado em simulação. O ExpressRoute requer um provedor de conectividade física e custa $55--$10.000+/mês. Você aprenderá os comandos CLI, padrões de configuração e saídas esperadas sem implantar recursos reais.
:::

:::info Tempo e custo estimados
**45--60 minutos** | **Sem custo (simulação)** | **Peso no exame: 20--25%**
:::

## Objetivos

Após concluir este desafio, você será capaz de:

- Configurar Microsoft peering em um circuito ExpressRoute
- Criar e configurar filtros de rota com valores de comunidade BGP
- Associar filtros de rota ao Microsoft peering
- Recomendar configurações de anúncio de rotas
- Configurar criptografia MACsec no ExpressRoute Direct

## Cenário

A Contoso usa o Microsoft 365 e serviços Azure PaaS (Azure Storage, Azure SQL Database) extensivamente. Eles querem rotear o tráfego para esses serviços pelo circuito ExpressRoute existente, em vez da internet pública, aproveitando a largura de banda dedicada e a latência previsível.

Eles também possuem uma conexão ExpressRoute Direct que requer criptografia MACsec para conformidade regulatória â€” todos os dados que trafegam pelo link físico devem ser criptografados na Camada 2.

---

## Tarefa 1: Configurar Microsoft peering

O Microsoft peering fornece conectividade aos serviços online da Microsoft (Microsoft 365, Dynamics 365) e serviços Azure PaaS (Azure Storage, Azure SQL Database, Azure Cosmos DB) através de endereços IP públicos.

### Requisitos do Microsoft peering

| Requisito | Detalhe |
|---|---|
| Prefixos IP públicos | Você deve possuir IPs públicos registrados em RIR/IRR |
| Sub-rede primária | Sub-rede pública IPv4 /30 para o link BGP primário |
| Sub-rede secundária | Sub-rede pública IPv4 /30 para o link BGP secundário |
| ASN do cliente | Seu número AS público ou privado |
| ID de VLAN | Tag VLAN única (diferente do private peering) |
| Registro de roteamento | RIR onde seus prefixos/ASN estão registrados |
| Filtro de rota | Necessário para receber quaisquer anúncios de rotas |

### Private peering vs Microsoft peering

| Aspecto | Private peering | Microsoft peering |
|---|---|---|
| Endereçamento IP | IPs privados RFC 1918 | IPs públicos (registrados em RIR) |
| Serviços alcançados | VNets do Azure (IaaS, PaaS via Private Endpoints) | Microsoft 365, endpoints públicos Azure PaaS |
| Filtro de rota necessário | Não | Sim (obrigatório desde agosto de 2017) |
| Caso de uso | Conectividade híbrida para VMs, aplicativos internos | Acesso direto ao Microsoft SaaS/PaaS |

### Criar Microsoft peering

```bash
az network express-route peering create \
  --resource-group rg-contoso-network \
  --circuit-name er-circuit-contoso-sv \
  --peering-type MicrosoftPeering \
  --peer-asn 65020 \
  --primary-peer-subnet 203.0.113.0/30 \
  --secondary-peer-subnet 203.0.113.4/30 \
  --vlan-id 300 \
  --advertised-public-prefixes 203.0.113.0/24 \
  --customer-asn 65020 \
  --routing-registry-name ARIN
```

**Detalhes dos parâmetros:**

| Parâmetro | Valor | Finalidade |
|---|---|---|
| `--peering-type` | MicrosoftPeering | Especifica Microsoft peering (não private) |
| `--primary-peer-subnet` | 203.0.113.0/30 | /30 público para o link BGP primário |
| `--secondary-peer-subnet` | 203.0.113.4/30 | /30 público para o link BGP secundário |
| `--advertised-public-prefixes` | 203.0.113.0/24 | Prefixos que você possui e deseja anunciar |
| `--customer-asn` | 65020 | Seu ASN registrado no registro de roteamento |
| `--routing-registry-name` | ARIN | Onde seus prefixos estão registrados |

**Saída esperada:**

```json
{
  "azureASN": 12076,
  "id": "/subscriptions/.../peerings/MicrosoftPeering",
  "microsoftPeeringConfig": {
    "advertisedCommunities": [],
    "advertisedPublicPrefixes": ["203.0.113.0/24"],
    "advertisedPublicPrefixesState": "ValidationNeeded",
    "customerASN": 65020,
    "legacyMode": 0,
    "routingRegistryName": "ARIN"
  },
  "name": "MicrosoftPeering",
  "peerASN": 65020,
  "peeringType": "MicrosoftPeering",
  "primaryPeerAddressPrefix": "203.0.113.0/30",
  "provisioningState": "Succeeded",
  "secondaryPeerAddressPrefix": "203.0.113.4/30",
  "state": "Enabled",
  "vlanId": 300
}
```

**Importante:** O campo `advertisedPublicPrefixesState` mostra `ValidationNeeded`. A Microsoft valida que você possui os prefixos anunciados verificando nos registros RIR/IRR. Essa validação pode levar de minutos a dias, dependendo do registro.

---

## Tarefa 2: Criar e configurar filtros de rota

Desde agosto de 2017, o Microsoft peering não anuncia nenhuma rota até que um filtro de rota seja anexado. Os filtros de rota usam valores de comunidade BGP para selecionar quais prefixos de serviço da Microsoft você deseja receber.

### Entendendo as comunidades BGP para serviços Microsoft

Os valores de comunidade BGP identificam grupos de prefixos pertencentes a serviços específicos da Microsoft:

| Serviço | Valor da comunidade BGP | Descrição |
|---|---|---|
| Exchange Online | 12076:5010 | Prefixos do Microsoft 365 Exchange |
| SharePoint Online | 12076:5020 | Prefixos do Microsoft 365 SharePoint |
| Skype for Business | 12076:5030 | Prefixos legados do Skype/Teams |
| Microsoft Teams | 12076:5031 | Prefixos específicos do Teams |
| Dynamics 365 | 12076:5040 | Prefixos do Dynamics 365 |
| Azure Storage | 12076:52xx | Prefixos de contas de armazenamento (específicos por região) |
| Azure SQL | 12076:51xx | Prefixos do SQL Database (específicos por região) |
| Outros Azure PaaS | 12076:51xx--52xx | Prefixos regionais de serviços |

### Listar comunidades BGP disponíveis

```bash
az network route-filter rule list-service-communities --output table
```

**Saída esperada (resumida):**

```text
Name                        BgpCommunities                   Prefixes
--------------------------  -------------------------------- ----------------
Exchange Online             12076:5010                       13.107.6.152/31...
SharePoint Online           12076:5020                       13.107.136.0/22...
Skype For Business Online   12076:5030                       13.107.64.0/18...
Dynamics 365                12076:5040                       13.107.9.0/24...
Azure West US 2             12076:51026                      20.51.0.0/16...
Azure East US 2             12076:51014                      20.36.128.0/17...
```

### Etapa 1: Criar o recurso de filtro de rota

```bash
az network route-filter create \
  --resource-group rg-contoso-network \
  --name rf-contoso-mspeering \
  --location westus2
```

**Saída esperada:**

```json
{
  "id": "/subscriptions/.../routeFilters/rf-contoso-mspeering",
  "location": "westus2",
  "name": "rf-contoso-mspeering",
  "peerings": [],
  "provisioningState": "Succeeded",
  "rules": []
}
```

### Etapa 2: Criar uma regra de filtro para permitir serviços específicos

Um filtro de rota pode ter apenas uma regra, e a regra deve ser do tipo `Allow`. No entanto, essa única regra pode conter múltiplos valores de comunidade BGP.

```bash
az network route-filter rule create \
  --resource-group rg-contoso-network \
  --filter-name rf-contoso-mspeering \
  --name allow-azure-and-exchange \
  --access Allow \
  --communities 12076:5010 12076:5040 12076:51026
```

**Detalhes dos parâmetros:**

| Parâmetro | Valor | Finalidade |
|---|---|---|
| `--filter-name` | rf-contoso-mspeering | O filtro de rota ao qual adicionar a regra |
| `--access` | Allow | Apenas Allow é suportado (sem regras Deny) |
| `--communities` | Lista separada por espaços | Valores de comunidade BGP para serviços a receber |

**Saída esperada:**

```json
{
  "access": "Allow",
  "communities": [
    "12076:5010",
    "12076:5040",
    "12076:51026"
  ],
  "id": "/subscriptions/.../rules/allow-azure-and-exchange",
  "name": "allow-azure-and-exchange",
  "provisioningState": "Succeeded",
  "routeFilterRuleType": "Community"
}
```

---

## Tarefa 3: Associar filtro de rota ao Microsoft peering

O filtro de rota deve ser anexado ao Microsoft peering antes que quaisquer rotas sejam anunciadas.

```bash
az network express-route peering update \
  --resource-group rg-contoso-network \
  --circuit-name er-circuit-contoso-sv \
  --name MicrosoftPeering \
  --route-filter rf-contoso-mspeering
```

**Saída esperada:**

```json
{
  "name": "MicrosoftPeering",
  "peeringType": "MicrosoftPeering",
  "provisioningState": "Succeeded",
  "routeFilter": {
    "id": "/subscriptions/.../routeFilters/rf-contoso-mspeering"
  },
  "state": "Enabled"
}
```

### Atualizar o filtro de rota para adicionar mais comunidades

Se você precisar adicionar mais serviços posteriormente, atualize a regra existente:

```bash
az network route-filter rule update \
  --resource-group rg-contoso-network \
  --filter-name rf-contoso-mspeering \
  --name allow-azure-and-exchange \
  --add communities "12076:5020"
```

### Desanexar um filtro de rota (interrompe todos os anúncios)

```bash
az network express-route peering update \
  --resource-group rg-contoso-network \
  --circuit-name er-circuit-contoso-sv \
  --name MicrosoftPeering \
  --remove routeFilter
```

Uma vez desanexado, nenhum prefixo é anunciado através da sessão BGP para o Microsoft peering.

---

## Tarefa 4: Melhores práticas de anúncio de rotas

### O que você deve anunciar

- Apenas prefixos que você possui e que estão registrados em um RIR/IRR
- Prefixos específicos /24 ou mais longos para seus intervalos de IP público
- Apenas sub-redes que precisam se comunicar diretamente com serviços Microsoft

### O que você NÃƒO deve anunciar

| Anti-padrão | Risco |
|---|---|
| 0.0.0.0/0 (rota padrão) | Atrai todo o tráfego da internet para sua rede |
| Endereços RFC 1918 | Não roteáveis no Microsoft peering (apenas IPs públicos) |
| Prefixos que você não possui | Falha na validação; potencial sequestro de rotas |
| Prefixos muito amplos (ex.: /8) | Rejeitados pelos filtros de prefixo da Microsoft |

### Verificar rotas anunciadas e recebidas

```bash
# View routes advertised from your side to Microsoft
az network express-route list-route-tables \
  --resource-group rg-contoso-network \
  --name er-circuit-contoso-sv \
  --path primary \
  --peering-name MicrosoftPeering
```

**Saída esperada:**

```json
{
  "value": [
    {
      "locPrf": "",
      "network": "203.0.113.0/24",
      "nextHop": "203.0.113.1",
      "path": "65020",
      "weight": 0
    }
  ]
}
```

```bash
# View routes received from Microsoft
az network express-route list-route-tables \
  --resource-group rg-contoso-network \
  --name er-circuit-contoso-sv \
  --path primary \
  --peering-name MicrosoftPeering \
  --query "value[?starts_with(path, '12076')]"
```

**Saída esperada (rotas que a Microsoft anuncia para você):**

```json
[
  {
    "locPrf": "",
    "network": "13.107.6.152/31",
    "nextHop": "203.0.113.2",
    "path": "12076",
    "weight": 0
  },
  {
    "locPrf": "",
    "network": "40.96.0.0/13",
    "nextHop": "203.0.113.2",
    "path": "12076",
    "weight": 0
  }
]
```

---

## Tarefa 5: Configurar criptografia MACsec no ExpressRoute Direct

O MACsec (IEEE 802.1AE) fornece criptografia ponto a ponto na Camada 2 entre seus dispositivos de rede e os roteadores de borda da Microsoft. Ele está disponível apenas em conexões ExpressRoute Direct.

### Pré-requisitos do MACsec

| Requisito | Detalhe |
|---|---|
| Tipo de conexão | Apenas ExpressRoute Direct |
| Armazenamento de chaves | Azure Key Vault (para segredos CAK e CKN) |
| Conjuntos de cifras | GcmAes128, GcmAes256, GcmAesXpn128, GcmAesXpn256 |
| Estado SCI | Pode ser habilitado ou desabilitado |

### Como as chaves MACsec funcionam

O MACsec usa duas chaves:

- **CKN (Connectivity Key Name):** Identifica a associação de segurança. Armazenado como um segredo no Azure Key Vault.
- **CAK (Connectivity Association Key):** A própria chave de criptografia. Também armazenada como um segredo no Azure Key Vault.

Ambas devem ser armazenadas no Azure Key Vault. O recurso ExpressRoute Direct referencia os identificadores de segredo do Key Vault.

### Etapa 1: Armazenar chaves MACsec no Key Vault

```bash
# Create a Key Vault (if not already existing)
az keyvault create \
  --resource-group rg-contoso-network \
  --name kv-contoso-macsec \
  --location eastus

# Store the CKN secret
az keyvault secret set \
  --vault-name kv-contoso-macsec \
  --name macsec-ckn \
  --value "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Store the CAK secret
az keyvault secret set \
  --vault-name kv-contoso-macsec \
  --name macsec-cak \
  --value "fedcba9876543210fedcba9876543210"
```

### Etapa 2: Conceder acesso ao service principal do ExpressRoute ao Key Vault

O serviço ExpressRoute precisa de acesso para ler os segredos. O object ID do service principal do ExpressRoute varia por tenant.

```bash
# Grant GET permission on secrets to the ExpressRoute service
az keyvault set-policy \
  --vault-name kv-contoso-macsec \
  --object-id "your-expressroute-service-principal-object-id" \
  --secret-permissions get
```

### Etapa 3: Habilitar MACsec nos links do ExpressRoute Direct

O MACsec é configurado por link na porta do ExpressRoute Direct. Você deve configurar ambos os links.

```bash
# Enable MACsec on link1
az network express-route port link update \
  --resource-group rg-contoso-network \
  --port-name er-direct-contoso \
  --name link1 \
  --macsec-ckn-secret-identifier "https://kv-contoso-macsec.vault.azure.net/secrets/macsec-ckn/abcdef1234567890" \
  --macsec-cak-secret-identifier "https://kv-contoso-macsec.vault.azure.net/secrets/macsec-cak/abcdef1234567890" \
  --macsec-cipher GcmAes256
```

**Saída esperada:**

```json
{
  "adminState": "Enabled",
  "connectorType": "LC",
  "id": "/subscriptions/.../links/link1",
  "interfaceName": "Ethernet 2/2/1",
  "macSecConfig": {
    "cakSecretIdentifier": "https://kv-contoso-macsec.vault.azure.net/secrets/macsec-cak/abcdef1234567890",
    "cipher": "GcmAes256",
    "cknSecretIdentifier": "https://kv-contoso-macsec.vault.azure.net/secrets/macsec-ckn/abcdef1234567890",
    "sciState": "Disabled"
  },
  "name": "link1",
  "provisioningState": "Succeeded"
}
```

```bash
# Enable MACsec on link2
az network express-route port link update \
  --resource-group rg-contoso-network \
  --port-name er-direct-contoso \
  --name link2 \
  --macsec-ckn-secret-identifier "https://kv-contoso-macsec.vault.azure.net/secrets/macsec-ckn/abcdef1234567890" \
  --macsec-cak-secret-identifier "https://kv-contoso-macsec.vault.azure.net/secrets/macsec-cak/abcdef1234567890" \
  --macsec-cipher GcmAes256
```

### Etapa 4: Habilitar SCI (opcional)

O Secure Channel Identifier (SCI) é usado quando há múltiplos canais lógicos em um único link físico:

```bash
az network express-route port link update \
  --resource-group rg-contoso-network \
  --port-name er-direct-contoso \
  --name link1 \
  --macsec-sci-state Enabled
```

### Cifras MACsec disponíveis

| Cifra | Comprimento da chave | Suporte XPN | Caso de uso |
|---|---|---|---|
| GcmAes128 | 128 bits | Não | Criptografia padrão, menor overhead |
| GcmAes256 | 256 bits | Não | Criptografia mais forte |
| GcmAesXpn128 | 128 bits | Sim | Sessões de longa duração (numeração de pacotes estendida) |
| GcmAesXpn256 | 256 bits | Sim | Segurança máxima com sessões de longa duração |

O XPN (Extended Packet Numbering) previne o esgotamento do número de pacotes em links de alta vazão. A 100 Gbps, números de pacotes padrão de 32 bits podem estourar em minutos. O XPN usa números de pacotes de 64 bits.

---

## Tarefa 6: Verificar a configuração completa

### Verificar o status do Microsoft peering

```bash
az network express-route peering show \
  --resource-group rg-contoso-network \
  --circuit-name er-circuit-contoso-sv \
  --name MicrosoftPeering \
  --query "{PeeringType:peeringType, State:state, VlanId:vlanId, PeerAsn:peerASN, RouteFilter:routeFilter.id, AdvertisedPrefixes:microsoftPeeringConfig.advertisedPublicPrefixes, PrefixState:microsoftPeeringConfig.advertisedPublicPrefixesState}" \
  --output json
```

**Saída esperada:**

```json
{
  "PeeringType": "MicrosoftPeering",
  "State": "Enabled",
  "VlanId": 300,
  "PeerAsn": 65020,
  "RouteFilter": "/subscriptions/.../routeFilters/rf-contoso-mspeering",
  "AdvertisedPrefixes": ["203.0.113.0/24"],
  "PrefixState": "Configured"
}
```

### Verificar configuração MACsec nas portas Direct

```bash
az network express-route port link list \
  --resource-group rg-contoso-network \
  --port-name er-direct-contoso \
  --query "[].{Name:name, AdminState:adminState, MACsecCipher:macSecConfig.cipher, SCIState:macSecConfig.sciState}" \
  --output table
```

**Saída esperada:**

```text
Name    AdminState  MACsecCipher  SCIState
------  ----------  ------------  --------
link1   Enabled     GcmAes256     Disabled
link2   Enabled     GcmAes256     Disabled
```

---

## Cenários de quebra e correção

### Cenário A: Microsoft peering sem filtro de rota (nenhuma rota recebida)

**Sintoma:** O Microsoft peering está configurado e mostra "Enabled", mas você não está recebendo nenhuma rota da Microsoft. A tabela de rotas do peering está vazia.

**Causa raiz:** Desde agosto de 2017, o Microsoft peering requer que um filtro de rota seja anexado antes que quaisquer prefixos sejam anunciados. Sem um filtro de rota, zero rotas são enviadas.

**Resolução:**

```bash
# Create and attach a route filter
az network route-filter create \
  --resource-group rg-contoso-network \
  --name rf-contoso-mspeering \
  --location westus2

az network route-filter rule create \
  --resource-group rg-contoso-network \
  --filter-name rf-contoso-mspeering \
  --name allow-services \
  --access Allow \
  --communities 12076:5010 12076:5020

az network express-route peering update \
  --resource-group rg-contoso-network \
  --circuit-name er-circuit-contoso-sv \
  --name MicrosoftPeering \
  --route-filter rf-contoso-mspeering
```

### Cenário B: Valores de comunidade BGP incorretos

**Sintoma:** O filtro de rota está anexado, mas você só vê algumas rotas esperadas, não todos os serviços necessários.

**Causa raiz:** Os valores de comunidade na regra do filtro de rota não incluem a comunidade para o serviço ausente.

**Resolução:** Liste as comunidades disponíveis e adicione a correta:

```bash
# List communities to find the right value
az network route-filter rule list-service-communities \
  --query "[?contains(name, 'SharePoint')]" \
  --output table

# Add the missing community
az network route-filter rule update \
  --resource-group rg-contoso-network \
  --filter-name rf-contoso-mspeering \
  --name allow-services \
  --add communities "12076:5020"
```

### Cenário C: Incompatibilidade de cifra MACsec

**Sintoma:** O link do ExpressRoute Direct mostra `adminState: Enabled`, mas nenhum tráfego passa. O LED do link físico está ligado, mas os frames de dados são descartados.

**Causa raiz:** A cifra MACsec configurada no lado do Azure (ex.: GcmAes256) não corresponde Ã  cifra configurada no seu roteador CE (ex.: GcmAes128). Ambos os lados devem usar o mesmo conjunto de cifras e valores CKN/CAK correspondentes.

**Resolução:** Verifique e alinhe a cifra em ambos os lados:

```bash
# Check current Azure-side configuration
az network express-route port link show \
  --resource-group rg-contoso-network \
  --port-name er-direct-contoso \
  --name link1 \
  --query "macSecConfig"
```

```json
{
  "cakSecretIdentifier": "https://kv-contoso-macsec.vault.azure.net/secrets/macsec-cak/...",
  "cipher": "GcmAes256",
  "cknSecretIdentifier": "https://kv-contoso-macsec.vault.azure.net/secrets/macsec-ckn/...",
  "sciState": "Disabled"
}
```

Em seguida, verifique se seu roteador CE usa a mesma cifra (GcmAes256) e valores de chave correspondentes. Atualize o lado do Azure se necessário:

```bash
az network express-route port link update \
  --resource-group rg-contoso-network \
  --port-name er-direct-contoso \
  --name link1 \
  --macsec-cipher GcmAes128
```

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-21-q1",
    question: "Por que o Microsoft peering configurado após agosto de 2017 não recebe nenhum anúncio de rota por padrão?",
    options: [
      "O circuito deve ser atualizado para o tier Premium primeiro",
      "Um route filter deve ser associado ao peering antes que as rotas sejam anunciadas",
      "O Microsoft peering requer aprovação manual do suporte da Microsoft",
      "A sessão BGP deve ser iniciada manualmente após a criação do peering"
    ],
    correctIndex: 1,
    explanation: "Desde agosto de 2017, o Microsoft peering requer que um route filter seja associado. Sem um route filter, nenhum prefixo é anunciado pela sessão BGP. Você deve criar um route filter com os valores apropriados de BGP community e associá-lo ao peering."
  },
  {
    id: "az700-21-q2",
    question: "Qual comando associa um route filter a um Microsoft peering em um circuito ExpressRoute?",
    options: [
      "az network route-filter attach --peering MicrosoftPeering",
      "az network express-route peering update --route-filter <filter-name>",
      "az network express-route peering create --route-filter <filter-id>",
      "az network route-filter rule create --peering MicrosoftPeering"
    ],
    correctIndex: 1,
    explanation: "Use az network express-route peering update com o parâmetro --route-filter para associar um route filter existente ao Microsoft peering. Você também pode especificar --route-filter durante a criação do peering."
  },
  {
    id: "az700-21-q3",
    question: "A criptografia MACsec está disponível em qual tipo de conexão ExpressRoute?",
    options: [
      "Qualquer circuito ExpressRoute com tier Premium",
      "Apenas conexões Layer 3 gerenciadas por provedor",
      "Apenas conexões ExpressRoute Direct",
      "Qualquer circuito ExpressRoute com sub-rede de peering /30"
    ],
    correctIndex: 2,
    explanation: "O MACsec (criptografia ponto a ponto de Camada 2) está disponível exclusivamente no ExpressRoute Direct porque requer conectividade física direta entre seu equipamento de rede e os roteadores de edge da Microsoft. Conexões baseadas em provedor possuem equipamentos intermediários que não podem participar do MACsec."
  },
  {
    id: "az700-21-q4",
    question: "Qual é o valor de BGP community para os serviços do Exchange Online nos route filters do Microsoft peering do ExpressRoute?",
    options: [
      "12076:5000",
      "12076:5010",
      "12076:5020",
      "12076:5040"
    ],
    correctIndex: 1,
    explanation: "O valor de BGP community 12076:5010 identifica os prefixos do Exchange Online. SharePoint Online é 12076:5020, Skype/Teams legado é 12076:5030 e Dynamics 365 é 12076:5040."
  },
  {
    id: "az700-21-q5",
    question: "Por que você escolheria GcmAesXpn256 em vez de GcmAes256 para MACsec em um link ExpressRoute Direct de 100 Gbps?",
    options: [
      "GcmAesXpn256 fornece criptografia mais forte que GcmAes256",
      "GcmAesXpn256 usa numeração estendida de pacotes para evitar esgotamento de contador em links de alto throughput",
      "GcmAesXpn256 é obrigatório para links de 100 Gbps",
      "GcmAesXpn256 permite rotação de chaves sem interrupção de sessão"
    ],
    correctIndex: 1,
    explanation: "O XPN (Extended Packet Numbering) usa números de pacote de 64 bits em vez de 32 bits. A 100 Gbps, os números de pacote padrão de 32 bits podem sofrer wrap muito rapidamente, exigindo renegociação frequente da associação de segurança. O XPN previne isso estendendo o espaço do contador."
  }
]} />

---

## Recursos adicionais

- [Configure Microsoft peering for ExpressRoute using CLI](https://learn.microsoft.com/azure/expressroute/howto-routing-cli#microsoft-peering)
- [Configure route filters for Microsoft peering](https://learn.microsoft.com/azure/expressroute/how-to-routefilter-portal)
- [ExpressRoute routing requirements - BGP communities](https://learn.microsoft.com/azure/expressroute/expressroute-routing#bgp)
- [Configure MACsec on ExpressRoute Direct](https://learn.microsoft.com/azure/expressroute/expressroute-howto-macsec)
- [About ExpressRoute Direct](https://learn.microsoft.com/azure/expressroute/expressroute-erdirect-about)
