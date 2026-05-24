---
sidebar_position: 3
title: "Desafio 16: Seleção de SKU do VPN Gateway & Políticas IPsec Personalizadas"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 16: SeleÃ§Ã£o de SKU do VPN Gateway e polÃ­ticas IPsec personalizadas

:::info Tempo e custo estimados

**45-60 minutos** | **~$0,19-1,17/h** (varia por SKU) | **Peso no exame: 20-25%**

:::

## CenÃ¡rio

A Contoso precisa se conectar a um parceiro de serviÃ§os financeiros (Woodgrove Bank) cujos requisitos de conformidade exigem algoritmos criptogrÃ¡ficos especÃ­ficos para o tÃºnel VPN: AES256 para criptografia IKE, SHA384 para integridade IKE, DHGroup14 para troca de chaves e GCMAES256 para criptografia de dados IPsec. As polÃ­ticas padrÃ£o do Azure VPN usam algoritmos diferentes que nÃ£o atendem a esses requisitos. AlÃ©m disso, a equipe precisa dimensionar corretamente o SKU do VPN Gateway para lidar com o throughput esperado de 2 Gbps com suporte a BGP e 50 tÃºneis S2S simultÃ¢neos.

**Arquitetura:**

```text
Contoso Azure (10.1.0.0/16)              Woodgrove Bank (172.16.0.0/12)
                                         Compliance requirement:
[VPN Gateway: VpnGw3]                      - IKE: AES256 / SHA384 / DHGroup14
     |                                     - IPsec: GCMAES256 / GCMAES256
     |â”€â”€â”€â”€ Custom IPsec Policy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ [Partner VPN Device]
     |                                       198.51.100.100
  vnet-hub
    â””â”€â”€ GatewaySubnet (10.1.255.0/27)
```

## Objetivos de aprendizagem

ApÃ³s concluir este desafio, vocÃª serÃ¡ capaz de:

- Selecionar um SKU de VPN Gateway apropriado com base em throughput, contagem de tÃºneis e requisitos de recursos
- Criar e configurar uma polÃ­tica IPsec/IKE personalizada em uma conexÃ£o VPN
- Configurar parÃ¢metros do IKE Fase 1 (Main Mode)
- Configurar parÃ¢metros do IKE Fase 2 / IPsec (Quick Mode)
- Diferenciar entre o comportamento de VPN Gateway baseado em polÃ­tica e baseado em rota com polÃ­ticas personalizadas
- Solucionar problemas de falhas na negociaÃ§Ã£o IPsec causadas por parÃ¢metros incompatÃ­veis

## PrÃ©-requisitos

- ConclusÃ£o do Challenge 14 (compreensÃ£o bÃ¡sica de VPN S2S)
- Uma assinatura do Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- PowerShell com mÃ³dulo Az instalado

## Conceitos-chave para o AZ-700

### ComparaÃ§Ã£o de SKUs do VPN Gateway

| SKU | MÃ¡x. tÃºneis S2S | MÃ¡x. P2S (IKEv2/OpenVPN) | Throughput agregado | BGP | GeraÃ§Ã£o |
|-----|----------------|-------------------------|---------------------|-----|-----------|
| Basic | 10 | NÃ£o suportado | 100 Mbps | NÃ£o | Gen1 |
| VpnGw1 | 30 | 250 | 650 Mbps | Sim | Gen1/Gen2 |
| VpnGw2 | 30 | 500 | 1 Gbps (Gen1) / 1,25 Gbps (Gen2) | Sim | Gen1/Gen2 |
| VpnGw3 | 30 | 1000 | 1,25 Gbps (Gen1) / 2,5 Gbps (Gen2) | Sim | Gen1/Gen2 |
| VpnGw4 | 100 | 5000 | 5 Gbps | Sim | Gen2 |
| VpnGw5 | 100 | 10000 | 10 Gbps | Sim | Gen2 |

As variantes com redundÃ¢ncia de zona (VpnGw1AZ atÃ© VpnGw5AZ) possuem desempenho idÃªntico, mas sÃ£o implantadas em zonas de disponibilidade.

### ParÃ¢metros do IKE Fase 1 (Main Mode)

| ParÃ¢metro | Finalidade | Valores comuns |
|-----------|---------|---------------|
| IKE Encryption | Criptografa mensagens de negociaÃ§Ã£o IKE | AES256, AES128, GCMAES256, GCMAES128 |
| IKE Integrity | Autentica mensagens IKE | SHA384, SHA256, SHA1, GCMAES256, GCMAES128 |
| DH Group | ForÃ§a do algoritmo de troca de chaves | DHGroup14, DHGroup24, ECP256, ECP384 |
| SA Lifetime | Tempo antes da renegociaÃ§Ã£o da Fase 1 | Segundos (padrÃ£o: 28800 = 8 horas) |

### ParÃ¢metros do IKE Fase 2 / IPsec (Quick Mode)

| ParÃ¢metro | Finalidade | Valores comuns |
|-----------|---------|---------------|
| IPsec Encryption | Criptografa trÃ¡fego de dados | GCMAES256, GCMAES128, AES256, AES128 |
| IPsec Integrity | Autentica pacotes de dados | GCMAES256, GCMAES128, SHA256, SHA1 |
| PFS Group | Grupo de Perfect Forward Secrecy | PFS24, PFS14, ECP256, ECP384, None |
| SA Lifetime | Tempo antes da renegociaÃ§Ã£o da Fase 2 | Segundos (padrÃ£o: 3600 = 1 hora) |
| SA Data Size | Volume de dados antes da renegociaÃ§Ã£o | Kilobytes (padrÃ£o: 102400000 KB) |

### ReferÃªncia de valores de parÃ¢metros vÃ¡lidos

**IKE Encryption (`--ike-encryption`):**
DES, DES3, AES128, AES192, AES256, GCMAES128, GCMAES256

**IKE Integrity (`--ike-integrity`):**
MD5, SHA1, SHA256, SHA384, GCMAES128, GCMAES256

**DH Group (`--dh-group`):**
None, DHGroup1, DHGroup2, DHGroup14, DHGroup2048, DHGroup24, ECP256, ECP384

**IPsec Encryption (`--ipsec-encryption`):**
None, DES, DES3, AES128, AES192, AES256, GCMAES128, GCMAES256

**IPsec Integrity (`--ipsec-integrity`):**
MD5, SHA1, SHA256, GCMAES128, GCMAES256

**PFS Group (`--pfs-group`):**
None, PFS1, PFS2, PFS2048, PFS14, PFS24, ECP256, ECP384, PFSMM

:::warning RestriÃ§Ãµes importantes

- Ao usar GCMAES para criptografia IKE, vocÃª **deve** usar o valor GCMAES correspondente para integridade IKE (ex.: criptografia GCMAES256 requer integridade GCMAES256)
- Ao usar GCMAES para criptografia IPsec, vocÃª **deve** usar o valor GCMAES correspondente para integridade IPsec
- DES e MD5 estÃ£o obsoletos e devem ser usados apenas para testes de compatibilidade retroativa
- Ambos os lados do tÃºnel VPN devem usar parÃ¢metros IPsec/IKE idÃªnticos

:::

---

## Tarefa 1: Selecionar o SKU de VPN Gateway apropriado

Com base nos requisitos da Contoso (throughput de 2 Gbps, suporte a BGP, 50 tÃºneis S2S), avalie as opÃ§Ãµes de SKU:

| Requisito | VpnGw1 | VpnGw2 | VpnGw3 (Gen2) | VpnGw4 | DecisÃ£o |
|-------------|---------|---------|---------------|---------|----------|
| Throughput de 2 Gbps | 650 Mbps (insuficiente) | 1,25 Gbps (insuficiente) | 2,5 Gbps (atende) | 5 Gbps (excede) | VpnGw3 mÃ­nimo |
| Suporte a BGP | Sim | Sim | Sim | Sim | Todos qualificam |
| 50 tÃºneis S2S | 30 (insuficiente) | 30 (insuficiente) | 30 (insuficiente) | 100 (atende) | VpnGw4 mÃ­nimo |

**ConclusÃ£o:** VpnGw4 (Generation 2) Ã© o SKU mÃ­nimo que satisfaz todos os requisitos (throughput de 5 Gbps, 100 tÃºneis S2S, suporte a BGP).

### Implantar o gateway com dimensionamento correto

```bash
az group create \
    --name rg-vpn-ipsec-lab \
    --location eastus

az network vnet create \
    --resource-group rg-vpn-ipsec-lab \
    --name vnet-hub \
    --location eastus \
    --address-prefixes 10.1.0.0/16 \
    --subnet-name snet-workloads \
    --subnet-prefixes 10.1.1.0/24

az network vnet subnet create \
    --resource-group rg-vpn-ipsec-lab \
    --vnet-name vnet-hub \
    --name GatewaySubnet \
    --address-prefixes 10.1.255.0/27

az network public-ip create \
    --resource-group rg-vpn-ipsec-lab \
    --name pip-vgw-hub \
    --location eastus \
    --allocation-method Static \
    --sku Standard

az network vnet-gateway create \
    --resource-group rg-vpn-ipsec-lab \
    --name vgw-hub \
    --vnet vnet-hub \
    --gateway-type Vpn \
    --vpn-type RouteBased \
    --sku VpnGw4 \
    --vpn-gateway-generation Generation2 \
    --public-ip-addresses pip-vgw-hub \
    --no-wait
```

:::tip OrientaÃ§Ã£o de seleÃ§Ã£o de SKU para o exame

- **Basic:** Apenas legado, sem BGP, sem IPsec personalizado, mÃ¡x. 10 tÃºneis
- **VpnGw1:** Cargas de trabalho pequenas, atÃ© 30 tÃºneis, 650 Mbps
- **VpnGw2:** Cargas de trabalho mÃ©dias, atÃ© 30 tÃºneis, 1-1,25 Gbps
- **VpnGw3:** Cargas de trabalho grandes, atÃ© 30 tÃºneis, 1,25-2,5 Gbps
- **VpnGw4:** Empresarial com muitos sites, atÃ© 100 tÃºneis, 5 Gbps
- **VpnGw5:** Desempenho mÃ¡ximo, atÃ© 100 tÃºneis, 10 Gbps
- Adicione o sufixo "AZ" para redundÃ¢ncia de zona (mesmo desempenho, maior disponibilidade)

:::

---

## Tarefa 2: Criar uma polÃ­tica IPsec/IKE personalizada

### Etapa 1: Criar o gateway de rede local para o parceiro

```bash
az network local-gateway create \
    --resource-group rg-vpn-ipsec-lab \
    --name lgw-woodgrove \
    --gateway-ip-address 198.51.100.100 \
    --local-address-prefixes 172.16.0.0/12 \
    --location eastus
```

### Etapa 2: Criar a conexÃ£o VPN (aguardar o provisionamento do gateway)

```bash
az network vpn-connection create \
    --resource-group rg-vpn-ipsec-lab \
    --name conn-to-woodgrove \
    --vnet-gateway1 vgw-hub \
    --local-gateway2 lgw-woodgrove \
    --shared-key "W00dgrove!Secure#2024"
```

### Etapa 3: Adicionar a polÃ­tica IPsec/IKE personalizada

```bash
az network vpn-connection ipsec-policy add \
    --resource-group rg-vpn-ipsec-lab \
    --connection-name conn-to-woodgrove \
    --ike-encryption AES256 \
    --ike-integrity SHA384 \
    --dh-group DHGroup14 \
    --ipsec-encryption GCMAES256 \
    --ipsec-integrity GCMAES256 \
    --pfs-group PFS14 \
    --sa-lifetime 3600 \
    --sa-data-size 102400000
```

### Azure PowerShell

```powershell
# Create the custom IPsec policy object
$ipsecPolicy = New-AzIpsecPolicy `
    -IkeEncryption AES256 `
    -IkeIntegrity SHA384 `
    -DhGroup DHGroup14 `
    -IpsecEncryption GCMAES256 `
    -IpsecIntegrity GCMAES256 `
    -PfsGroup PFS14 `
    -SALifeTimeSeconds 3600 `
    -SADataSizeKilobytes 102400000

# Create local gateway
$lgw = New-AzLocalNetworkGateway `
    -ResourceGroupName "rg-vpn-ipsec-lab" `
    -Name "lgw-woodgrove" `
    -Location "eastus" `
    -GatewayIpAddress "198.51.100.100" `
    -AddressPrefix "172.16.0.0/12"

# Get VPN gateway
$vgw = Get-AzVirtualNetworkGateway `
    -ResourceGroupName "rg-vpn-ipsec-lab" `
    -Name "vgw-hub"

# Create connection with custom IPsec policy
New-AzVirtualNetworkGatewayConnection `
    -ResourceGroupName "rg-vpn-ipsec-lab" `
    -Name "conn-to-woodgrove" `
    -Location "eastus" `
    -VirtualNetworkGateway1 $vgw `
    -LocalNetworkGateway2 $lgw `
    -ConnectionType IPsec `
    -SharedKey "W00dgrove!Secure#2024" `
    -IpsecPolicies $ipsecPolicy
```

---

## Tarefa 3: Entender os parÃ¢metros do IKE Fase 1

O IKE Fase 1 (Main Mode) estabelece o canal seguro usado para negociar o tÃºnel IPsec. Ambos os lados devem concordar com os mesmos parÃ¢metros.

### Detalhamento dos parÃ¢metros para o exame

| ParÃ¢metro | Valor da Contoso | Finalidade |
|-----------|---------------|---------|
| `--ike-encryption AES256` | AES256 | Criptografa mensagens de controle IKE durante a negociaÃ§Ã£o |
| `--ike-integrity SHA384` | SHA384 | HMAC para autenticaÃ§Ã£o de mensagens IKE (previne adulteraÃ§Ã£o) |
| `--dh-group DHGroup14` | DHGroup14 (2048-bit MODP) | Grupo Diffie-Hellman para troca segura de chaves |
| `--sa-lifetime 3600` | 3600 segundos (1 hora) | Tempo antes que a SA da Fase 1 expire e precise ser renegociada |

### ComparaÃ§Ã£o de forÃ§a dos grupos DH

| Grupo DH | Tamanho da chave | NÃ­vel de seguranÃ§a | RecomendaÃ§Ã£o |
|----------|----------|----------------|----------------|
| DHGroup1 | 768-bit | Fraco | NÃ£o usar |
| DHGroup2 | 1024-bit | Fraco | NÃ£o usar |
| DHGroup14 | 2048-bit | AceitÃ¡vel | MÃ­nimo recomendado |
| DHGroup24 | 2048-bit MODP | Forte | Bom para a maioria dos casos |
| ECP256 | 256-bit EC | Forte | Curva elÃ­ptica, moderno |
| ECP384 | 384-bit EC | Muito forte | Requisitos de alta seguranÃ§a |

---

## Tarefa 4: Entender os parÃ¢metros do IKE Fase 2 / IPsec

O IKE Fase 2 (Quick Mode) negocia as Security Associations IPsec que protegem o trÃ¡fego real de dados.

### Detalhamento dos parÃ¢metros

| ParÃ¢metro | Valor da Contoso | Finalidade |
|-----------|---------------|---------|
| `--ipsec-encryption GCMAES256` | GCMAES256 | Criptografa pacotes de dados no tÃºnel |
| `--ipsec-integrity GCMAES256` | GCMAES256 | Autentica pacotes de dados (GCM fornece ambos) |
| `--pfs-group PFS14` | PFS14 (2048-bit) | Perfect Forward Secrecy para cada nova SA |
| `--sa-lifetime 3600` | 3600 segundos | Tempo antes da renegociaÃ§Ã£o da SA IPsec |
| `--sa-data-size 102400000` | ~100 GB | Volume de dados antes da renegociaÃ§Ã£o da SA |

:::note Modo GCM

Ao usar GCMAES (Galois/Counter Mode com AES) para criptografia IPsec, ele fornece tanto criptografia quanto autenticaÃ§Ã£o em uma Ãºnica operaÃ§Ã£o (cifra AEAD). O valor de `--ipsec-integrity` deve corresponder ao valor de criptografia (criptografia GCMAES256 requer integridade GCMAES256). Isso Ã© mais eficiente do que abordagens separadas de criptografar-e-entÃ£o-MAC.

:::

---

## Tarefa 5: Verificar e listar polÃ­ticas IPsec

### Azure CLI

```bash
# List IPsec policies on a connection
az network vpn-connection ipsec-policy list \
    --resource-group rg-vpn-ipsec-lab \
    --connection-name conn-to-woodgrove \
    --output table

# Show full connection details including policy
az network vpn-connection show \
    --resource-group rg-vpn-ipsec-lab \
    --name conn-to-woodgrove \
    --query "{status:connectionStatus, usePolicyBased:usePolicyBasedTrafficSelectors, ipsecPolicies:ipsecPolicies}" \
    --output json
```

### Azure PowerShell

```powershell
$conn = Get-AzVirtualNetworkGatewayConnection `
    -ResourceGroupName "rg-vpn-ipsec-lab" `
    -Name "conn-to-woodgrove"

$conn.IpsecPolicies | Format-List
```

### Limpar/remover polÃ­ticas IPsec (reverter para padrÃ£o)

```bash
az network vpn-connection ipsec-policy clear \
    --resource-group rg-vpn-ipsec-lab \
    --connection-name conn-to-woodgrove
```

---

## Tarefa 6: Baseado em polÃ­tica vs baseado em rota com IPsec personalizado

Entender quando um gateway baseado em rota pode se comportar como baseado em polÃ­tica Ã© importante para o exame.

### Gateway baseado em rota com seletores de trÃ¡fego baseados em polÃ­tica

Para conexÃµes com dispositivos locais baseados em polÃ­tica, um gateway baseado em rota pode usar seletores de trÃ¡fego baseados em polÃ­tica por conexÃ£o:

```bash
az network vpn-connection create \
    --resource-group rg-vpn-ipsec-lab \
    --name conn-to-legacy-device \
    --vnet-gateway1 vgw-hub \
    --local-gateway2 lgw-woodgrove \
    --shared-key "LegacyDevice!2024" \
    --use-policy-based-traffic-selectors true
```

```powershell
New-AzVirtualNetworkGatewayConnection `
    -ResourceGroupName "rg-vpn-ipsec-lab" `
    -Name "conn-to-legacy-device" `
    -Location "eastus" `
    -VirtualNetworkGateway1 $vgw `
    -LocalNetworkGateway2 $lgw `
    -ConnectionType IPsec `
    -SharedKey "LegacyDevice!2024" `
    -UsePolicyBasedTrafficSelectors $true
```

### Quando usar cada abordagem

| CenÃ¡rio | SoluÃ§Ã£o |
|----------|----------|
| Dispositivos modernos, mÃºltiplos tÃºneis necessÃ¡rios | Gateway baseado em rota, roteamento padrÃ£o |
| Parceiro requer algoritmos criptogrÃ¡ficos especÃ­ficos | Gateway baseado em rota + polÃ­tica IPsec personalizada |
| Dispositivo legado precisa de IKEv1 + seletores de polÃ­tica | Gateway baseado em rota + `--use-policy-based-traffic-selectors true` |
| TÃºnel Ãºnico para dispositivo muito antigo somente IKEv1 | Gateway baseado em polÃ­tica (Basic SKU) como Ãºltimo recurso |

:::tip Nota de exame

O exame pode apresentar um cenÃ¡rio onde vocÃª precisa conectar um VPN Gateway baseado em rota ao dispositivo baseado em polÃ­tica de um parceiro. A resposta correta Ã© habilitar `usePolicyBasedTrafficSelectors` na conexÃ£o especÃ­fica, e nÃ£o alterar o tipo do gateway para baseado em polÃ­tica. Isso permite manter os benefÃ­cios do baseado em rota (mÃºltiplos tÃºneis, BGP, P2S) enquanto acomoda um peer legado.

:::

---

## CenÃ¡rios de quebra e correÃ§Ã£o

### CenÃ¡rio 1: ParÃ¢metros criptogrÃ¡ficos incompatÃ­veis

**Sintoma:** O status da conexÃ£o Ã© `Connecting`. A negociaÃ§Ã£o IKE falha porque o parceiro usa AES128 enquanto o Azure estÃ¡ configurado para AES256.

**Causa raiz:** A polÃ­tica IPsec personalizada no lado do Azure especifica algoritmos diferentes dos configurados no dispositivo do parceiro.

**Comando de diagnÃ³stico:**

```bash
az network vpn-connection ipsec-policy list \
    --resource-group rg-vpn-ipsec-lab \
    --connection-name conn-to-woodgrove \
    --output table
```

**CorreÃ§Ã£o:** Atualize a polÃ­tica para corresponder Ã  configuraÃ§Ã£o do parceiro:

```bash
# Clear existing policy
az network vpn-connection ipsec-policy clear \
    --resource-group rg-vpn-ipsec-lab \
    --connection-name conn-to-woodgrove

# Add corrected policy matching partner
az network vpn-connection ipsec-policy add \
    --resource-group rg-vpn-ipsec-lab \
    --connection-name conn-to-woodgrove \
    --ike-encryption AES128 \
    --ike-integrity SHA256 \
    --dh-group DHGroup14 \
    --ipsec-encryption AES128 \
    --ipsec-integrity SHA256 \
    --pfs-group PFS14 \
    --sa-lifetime 3600 \
    --sa-data-size 102400000
```

### CenÃ¡rio 2: Tempo de vida da SA muito curto

**Sintoma:** O tÃºnel Ã© estabelecido mas cai a cada poucos minutos. RenegociaÃ§Ã£o frequente causa perda de pacotes.

**Causa raiz:** `--sa-lifetime` foi definido como 60 segundos em vez de 3600 segundos.

**CorreÃ§Ã£o:** Limpe e adicione novamente com o tempo de vida correto:

```bash
az network vpn-connection ipsec-policy clear \
    --resource-group rg-vpn-ipsec-lab \
    --connection-name conn-to-woodgrove

az network vpn-connection ipsec-policy add \
    --resource-group rg-vpn-ipsec-lab \
    --connection-name conn-to-woodgrove \
    --ike-encryption AES256 \
    --ike-integrity SHA384 \
    --dh-group DHGroup14 \
    --ipsec-encryption GCMAES256 \
    --ipsec-integrity GCMAES256 \
    --pfs-group PFS14 \
    --sa-lifetime 3600 \
    --sa-data-size 102400000
```

### CenÃ¡rio 3: Parceiro rejeita DES (cifra fraca)

**Sintoma:** A conexÃ£o falha durante o IKE Fase 1 porque o lado Azure usa criptografia DES, que a polÃ­tica de conformidade do parceiro rejeita.

**Causa raiz:** DES foi especificado acidentalmente como criptografia IKE. Frameworks modernos de conformidade (PCI-DSS, HIPAA) proÃ­bem DES.

**Comando de diagnÃ³stico:**

```bash
az network vpn-connection ipsec-policy list \
    --resource-group rg-vpn-ipsec-lab \
    --connection-name conn-to-woodgrove \
    --query "[].ikeEncryption" \
    --output tsv
# Returns: DES
```

**CorreÃ§Ã£o:** Substitua por uma cifra forte:

```bash
az network vpn-connection ipsec-policy clear \
    --resource-group rg-vpn-ipsec-lab \
    --connection-name conn-to-woodgrove

az network vpn-connection ipsec-policy add \
    --resource-group rg-vpn-ipsec-lab \
    --connection-name conn-to-woodgrove \
    --ike-encryption AES256 \
    --ike-integrity SHA384 \
    --dh-group DHGroup14 \
    --ipsec-encryption GCMAES256 \
    --ipsec-integrity GCMAES256 \
    --pfs-group PFS14 \
    --sa-lifetime 3600 \
    --sa-data-size 102400000
```

---

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-16-q1",
    question: "Uma empresa precisa de um VPN Gateway que suporte 50 túneis S2S e 5 Gbps de throughput. Qual é o SKU mínimo que atende a ambos os requisitos?",
    options: [
      "VpnGw3",
      "VpnGw4",
      "VpnGw2",
      "VpnGw5"
    ],
    correctIndex: 1,
    explanation: "O VpnGw3 suporta apenas 30 túneis S2S (insuficiente para 50). O VpnGw4 suporta até 100 túneis e fornece 5 Gbps de throughput, tornando-o o SKU mínimo que atende a ambos os requisitos. O VpnGw5 também funcionaria, mas não é o mínimo."
  },
  {
    id: "az700-16-q2",
    question: "Ao configurar GCMAES256 como algoritmo de criptografia IPsec, o que deve ser definido para o parâmetro de integridade IPsec?",
    options: [
      "SHA256",
      "SHA384",
      "GCMAES256",
      "Qualquer algoritmo de integridade é válido"
    ],
    correctIndex: 2,
    explanation: "Ao usar GCMAES (Galois/Counter Mode) para criptografia IPsec, o parâmetro de integridade deve ser definido com o mesmo valor GCMAES. GCM é um modo de criptografia autenticada (AEAD) que fornece tanto confidencialidade quanto integridade em uma única operação, portanto a criptografia GCMAES256 requer integridade GCMAES256."
  },
  {
    id: "az700-16-q3",
    question: "Você tem um VPN Gateway route-based com múltiplas conexões S2S. Um parceiro requer seletores de tráfego policy-based. O que você deve fazer?",
    options: [
      "Alterar o gateway para o tipo policy-based",
      "Criar um gateway policy-based separado para esse parceiro",
      "Habilitar usePolicyBasedTrafficSelectors nessa conexão específica",
      "Pedir ao parceiro para mudar para route-based"
    ],
    correctIndex: 2,
    explanation: "Em um gateway route-based, você pode habilitar seletores de tráfego policy-based por conexão usando --use-policy-based-traffic-selectors true. Isso acomoda o requisito do parceiro sem afetar outras conexões ou perder os benefícios do route-based (múltiplos túneis, BGP, P2S)."
  },
  {
    id: "az700-16-q4",
    question: "Qual é a finalidade do parâmetro --sa-lifetime em uma política IPsec personalizada?",
    options: [
      "Tempo máximo que o VPN Gateway permanece ligado",
      "Tempo antes que a associação de segurança expire e precise ser renegociada",
      "Timeout antes que a conexão seja declarada como inativa",
      "Duração máxima de uma única sessão TCP através do túnel"
    ],
    correctIndex: 1,
    explanation: "O SA (Security Association) lifetime define por quanto tempo as chaves de criptografia negociadas são válidas antes de expirarem e uma nova negociação IKE/IPsec precisar ocorrer. Isso limita a janela de exposição caso as chaves sejam comprometidas e garante que material criptográfico novo seja estabelecido regularmente."
  },
  {
    id: "az700-16-q5",
    question: "Qual DH Group NÃO deve ser usado em produção devido à força de chave insuficiente?",
    options: [
      "DHGroup14 (2048-bit)",
      "ECP256 (curva elíptica de 256-bit)",
      "DHGroup2 (1024-bit)",
      "DHGroup24 (2048-bit MODP)"
    ],
    correctIndex: 2,
    explanation: "O DHGroup2 usa uma chave de 1024 bits que é considerada criptograficamente fraca pelos padrões modernos e não deve ser usado em produção. O NIST descontinuou o Diffie-Hellman de 1024 bits em 2013. O DHGroup14 (2048-bit) é o mínimo recomendado, e ECP256/ECP384 fornecem segurança equivalente ou superior com tamanhos de chave menores."
  }
]} />

---

## Limpeza

Remova todos os recursos criados neste desafio para interromper a cobranÃ§a:

```bash
az group delete --name rg-vpn-ipsec-lab --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-vpn-ipsec-lab" -Force -AsJob
```

---

## ReferÃªncias adicionais

- [About VPN Gateway SKUs](https://learn.microsoft.com/en-us/azure/vpn-gateway/about-gateway-skus)
- [Custom IPsec/IKE policy for S2S VPN](https://learn.microsoft.com/en-us/azure/vpn-gateway/ipsec-ike-policy-howto)
- [Cryptographic requirements and Azure VPN gateways](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-compliance-crypto)
- [Connect to policy-based VPN devices](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-connect-multiple-policybased-rm-ps)
- [VPN Gateway pricing](https://azure.microsoft.com/en-us/pricing/details/vpn-gateway/)
