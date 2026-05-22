---
sidebar_position: 3
title: "Challenge 16: VPN Gateway SKU Selection & Custom IPsec Policies"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 16: Seleção de SKU do VPN Gateway e políticas IPsec personalizadas

:::info Tempo e custo estimados

**45-60 minutos** | **~$0,19-1,17/h** (varia por SKU) | **Peso no exame: 20-25%**

:::

## Cenário

A Contoso precisa se conectar a um parceiro de serviços financeiros (Woodgrove Bank) cujos requisitos de conformidade exigem algoritmos criptográficos específicos para o túnel VPN: AES256 para criptografia IKE, SHA384 para integridade IKE, DHGroup14 para troca de chaves e GCMAES256 para criptografia de dados IPsec. As políticas padrão do Azure VPN usam algoritmos diferentes que não atendem a esses requisitos. Além disso, a equipe precisa dimensionar corretamente o SKU do VPN Gateway para lidar com o throughput esperado de 2 Gbps com suporte a BGP e 50 túneis S2S simultâneos.

**Arquitetura:**

```
Contoso Azure (10.1.0.0/16)              Woodgrove Bank (172.16.0.0/12)
                                         Compliance requirement:
[VPN Gateway: VpnGw3]                      - IKE: AES256 / SHA384 / DHGroup14
     |                                     - IPsec: GCMAES256 / GCMAES256
     |──── Custom IPsec Policy ────────── [Partner VPN Device]
     |                                       198.51.100.100
  vnet-hub
    └── GatewaySubnet (10.1.255.0/27)
```

## Objetivos de aprendizagem

Após concluir este desafio, você será capaz de:

- Selecionar um SKU de VPN Gateway apropriado com base em throughput, contagem de túneis e requisitos de recursos
- Criar e configurar uma política IPsec/IKE personalizada em uma conexão VPN
- Configurar parâmetros do IKE Fase 1 (Main Mode)
- Configurar parâmetros do IKE Fase 2 / IPsec (Quick Mode)
- Diferenciar entre o comportamento de VPN Gateway baseado em política e baseado em rota com políticas personalizadas
- Solucionar problemas de falhas na negociação IPsec causadas por parâmetros incompatíveis

## Pré-requisitos

- Conclusão do Challenge 14 (compreensão básica de VPN S2S)
- Uma assinatura do Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- PowerShell com módulo Az instalado

## Conceitos-chave para o AZ-700

### Comparação de SKUs do VPN Gateway

| SKU | Máx. túneis S2S | Máx. P2S (IKEv2/OpenVPN) | Throughput agregado | BGP | Geração |
|-----|----------------|-------------------------|---------------------|-----|-----------|
| Basic | 10 | Não suportado | 100 Mbps | Não | Gen1 |
| VpnGw1 | 30 | 250 | 650 Mbps | Sim | Gen1/Gen2 |
| VpnGw2 | 30 | 500 | 1 Gbps (Gen1) / 1,25 Gbps (Gen2) | Sim | Gen1/Gen2 |
| VpnGw3 | 30 | 1000 | 1,25 Gbps (Gen1) / 2,5 Gbps (Gen2) | Sim | Gen1/Gen2 |
| VpnGw4 | 100 | 5000 | 5 Gbps | Sim | Gen2 |
| VpnGw5 | 100 | 10000 | 10 Gbps | Sim | Gen2 |

As variantes com redundância de zona (VpnGw1AZ até VpnGw5AZ) possuem desempenho idêntico, mas são implantadas em zonas de disponibilidade.

### Parâmetros do IKE Fase 1 (Main Mode)

| Parâmetro | Finalidade | Valores comuns |
|-----------|---------|---------------|
| IKE Encryption | Criptografa mensagens de negociação IKE | AES256, AES128, GCMAES256, GCMAES128 |
| IKE Integrity | Autentica mensagens IKE | SHA384, SHA256, SHA1, GCMAES256, GCMAES128 |
| DH Group | Força do algoritmo de troca de chaves | DHGroup14, DHGroup24, ECP256, ECP384 |
| SA Lifetime | Tempo antes da renegociação da Fase 1 | Segundos (padrão: 28800 = 8 horas) |

### Parâmetros do IKE Fase 2 / IPsec (Quick Mode)

| Parâmetro | Finalidade | Valores comuns |
|-----------|---------|---------------|
| IPsec Encryption | Criptografa tráfego de dados | GCMAES256, GCMAES128, AES256, AES128 |
| IPsec Integrity | Autentica pacotes de dados | GCMAES256, GCMAES128, SHA256, SHA1 |
| PFS Group | Grupo de Perfect Forward Secrecy | PFS24, PFS14, ECP256, ECP384, None |
| SA Lifetime | Tempo antes da renegociação da Fase 2 | Segundos (padrão: 3600 = 1 hora) |
| SA Data Size | Volume de dados antes da renegociação | Kilobytes (padrão: 102400000 KB) |

### Referência de valores de parâmetros válidos

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

:::warning Restrições importantes

- Ao usar GCMAES para criptografia IKE, você **deve** usar o valor GCMAES correspondente para integridade IKE (ex.: criptografia GCMAES256 requer integridade GCMAES256)
- Ao usar GCMAES para criptografia IPsec, você **deve** usar o valor GCMAES correspondente para integridade IPsec
- DES e MD5 estão obsoletos e devem ser usados apenas para testes de compatibilidade retroativa
- Ambos os lados do túnel VPN devem usar parâmetros IPsec/IKE idênticos

:::

---

## Tarefa 1: Selecionar o SKU de VPN Gateway apropriado

Com base nos requisitos da Contoso (throughput de 2 Gbps, suporte a BGP, 50 túneis S2S), avalie as opções de SKU:

| Requisito | VpnGw1 | VpnGw2 | VpnGw3 (Gen2) | VpnGw4 | Decisão |
|-------------|---------|---------|---------------|---------|----------|
| Throughput de 2 Gbps | 650 Mbps (insuficiente) | 1,25 Gbps (insuficiente) | 2,5 Gbps (atende) | 5 Gbps (excede) | VpnGw3 mínimo |
| Suporte a BGP | Sim | Sim | Sim | Sim | Todos qualificam |
| 50 túneis S2S | 30 (insuficiente) | 30 (insuficiente) | 30 (insuficiente) | 100 (atende) | VpnGw4 mínimo |

**Conclusão:** VpnGw4 (Generation 2) é o SKU mínimo que satisfaz todos os requisitos (throughput de 5 Gbps, 100 túneis S2S, suporte a BGP).

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

:::tip Orientação de seleção de SKU para o exame

- **Basic:** Apenas legado, sem BGP, sem IPsec personalizado, máx. 10 túneis
- **VpnGw1:** Cargas de trabalho pequenas, até 30 túneis, 650 Mbps
- **VpnGw2:** Cargas de trabalho médias, até 30 túneis, 1-1,25 Gbps
- **VpnGw3:** Cargas de trabalho grandes, até 30 túneis, 1,25-2,5 Gbps
- **VpnGw4:** Empresarial com muitos sites, até 100 túneis, 5 Gbps
- **VpnGw5:** Desempenho máximo, até 100 túneis, 10 Gbps
- Adicione o sufixo "AZ" para redundância de zona (mesmo desempenho, maior disponibilidade)

:::

---

## Tarefa 2: Criar uma política IPsec/IKE personalizada

### Etapa 1: Criar o gateway de rede local para o parceiro

```bash
az network local-gateway create \
    --resource-group rg-vpn-ipsec-lab \
    --name lgw-woodgrove \
    --gateway-ip-address 198.51.100.100 \
    --local-address-prefixes 172.16.0.0/12 \
    --location eastus
```

### Etapa 2: Criar a conexão VPN (aguardar o provisionamento do gateway)

```bash
az network vpn-connection create \
    --resource-group rg-vpn-ipsec-lab \
    --name conn-to-woodgrove \
    --vnet-gateway1 vgw-hub \
    --local-gateway2 lgw-woodgrove \
    --shared-key "W00dgrove!Secure#2024"
```

### Etapa 3: Adicionar a política IPsec/IKE personalizada

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

## Tarefa 3: Entender os parâmetros do IKE Fase 1

O IKE Fase 1 (Main Mode) estabelece o canal seguro usado para negociar o túnel IPsec. Ambos os lados devem concordar com os mesmos parâmetros.

### Detalhamento dos parâmetros para o exame

| Parâmetro | Valor da Contoso | Finalidade |
|-----------|---------------|---------|
| `--ike-encryption AES256` | AES256 | Criptografa mensagens de controle IKE durante a negociação |
| `--ike-integrity SHA384` | SHA384 | HMAC para autenticação de mensagens IKE (previne adulteração) |
| `--dh-group DHGroup14` | DHGroup14 (2048-bit MODP) | Grupo Diffie-Hellman para troca segura de chaves |
| `--sa-lifetime 3600` | 3600 segundos (1 hora) | Tempo antes que a SA da Fase 1 expire e precise ser renegociada |

### Comparação de força dos grupos DH

| Grupo DH | Tamanho da chave | Nível de segurança | Recomendação |
|----------|----------|----------------|----------------|
| DHGroup1 | 768-bit | Fraco | Não usar |
| DHGroup2 | 1024-bit | Fraco | Não usar |
| DHGroup14 | 2048-bit | Aceitável | Mínimo recomendado |
| DHGroup24 | 2048-bit MODP | Forte | Bom para a maioria dos casos |
| ECP256 | 256-bit EC | Forte | Curva elíptica, moderno |
| ECP384 | 384-bit EC | Muito forte | Requisitos de alta segurança |

---

## Tarefa 4: Entender os parâmetros do IKE Fase 2 / IPsec

O IKE Fase 2 (Quick Mode) negocia as Security Associations IPsec que protegem o tráfego real de dados.

### Detalhamento dos parâmetros

| Parâmetro | Valor da Contoso | Finalidade |
|-----------|---------------|---------|
| `--ipsec-encryption GCMAES256` | GCMAES256 | Criptografa pacotes de dados no túnel |
| `--ipsec-integrity GCMAES256` | GCMAES256 | Autentica pacotes de dados (GCM fornece ambos) |
| `--pfs-group PFS14` | PFS14 (2048-bit) | Perfect Forward Secrecy para cada nova SA |
| `--sa-lifetime 3600` | 3600 segundos | Tempo antes da renegociação da SA IPsec |
| `--sa-data-size 102400000` | ~100 GB | Volume de dados antes da renegociação da SA |

:::note Modo GCM

Ao usar GCMAES (Galois/Counter Mode com AES) para criptografia IPsec, ele fornece tanto criptografia quanto autenticação em uma única operação (cifra AEAD). O valor de `--ipsec-integrity` deve corresponder ao valor de criptografia (criptografia GCMAES256 requer integridade GCMAES256). Isso é mais eficiente do que abordagens separadas de criptografar-e-então-MAC.

:::

---

## Tarefa 5: Verificar e listar políticas IPsec

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

### Limpar/remover políticas IPsec (reverter para padrão)

```bash
az network vpn-connection ipsec-policy clear \
    --resource-group rg-vpn-ipsec-lab \
    --connection-name conn-to-woodgrove
```

---

## Tarefa 6: Baseado em política vs baseado em rota com IPsec personalizado

Entender quando um gateway baseado em rota pode se comportar como baseado em política é importante para o exame.

### Gateway baseado em rota com seletores de tráfego baseados em política

Para conexões com dispositivos locais baseados em política, um gateway baseado em rota pode usar seletores de tráfego baseados em política por conexão:

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

| Cenário | Solução |
|----------|----------|
| Dispositivos modernos, múltiplos túneis necessários | Gateway baseado em rota, roteamento padrão |
| Parceiro requer algoritmos criptográficos específicos | Gateway baseado em rota + política IPsec personalizada |
| Dispositivo legado precisa de IKEv1 + seletores de política | Gateway baseado em rota + `--use-policy-based-traffic-selectors true` |
| Túnel único para dispositivo muito antigo somente IKEv1 | Gateway baseado em política (Basic SKU) como último recurso |

:::tip Nota de exame

O exame pode apresentar um cenário onde você precisa conectar um VPN Gateway baseado em rota ao dispositivo baseado em política de um parceiro. A resposta correta é habilitar `usePolicyBasedTrafficSelectors` na conexão específica, e não alterar o tipo do gateway para baseado em política. Isso permite manter os benefícios do baseado em rota (múltiplos túneis, BGP, P2S) enquanto acomoda um peer legado.

:::

---

## Cenários de quebra e correção

### Cenário 1: Parâmetros criptográficos incompatíveis

**Sintoma:** O status da conexão é `Connecting`. A negociação IKE falha porque o parceiro usa AES128 enquanto o Azure está configurado para AES256.

**Causa raiz:** A política IPsec personalizada no lado do Azure especifica algoritmos diferentes dos configurados no dispositivo do parceiro.

**Comando de diagnóstico:**

```bash
az network vpn-connection ipsec-policy list \
    --resource-group rg-vpn-ipsec-lab \
    --connection-name conn-to-woodgrove \
    --output table
```

**Correção:** Atualize a política para corresponder à configuração do parceiro:

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

### Cenário 2: Tempo de vida da SA muito curto

**Sintoma:** O túnel é estabelecido mas cai a cada poucos minutos. Renegociação frequente causa perda de pacotes.

**Causa raiz:** `--sa-lifetime` foi definido como 60 segundos em vez de 3600 segundos.

**Correção:** Limpe e adicione novamente com o tempo de vida correto:

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

### Cenário 3: Parceiro rejeita DES (cifra fraca)

**Sintoma:** A conexão falha durante o IKE Fase 1 porque o lado Azure usa criptografia DES, que a política de conformidade do parceiro rejeita.

**Causa raiz:** DES foi especificado acidentalmente como criptografia IKE. Frameworks modernos de conformidade (PCI-DSS, HIPAA) proíbem DES.

**Comando de diagnóstico:**

```bash
az network vpn-connection ipsec-policy list \
    --resource-group rg-vpn-ipsec-lab \
    --connection-name conn-to-woodgrove \
    --query "[].ikeEncryption" \
    --output tsv
# Returns: DES
```

**Correção:** Substitua por uma cifra forte:

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

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-16-q1",
    question: "A company needs a VPN gateway that supports 50 S2S tunnels and 5 Gbps throughput. What is the minimum SKU that meets both requirements?",
    options: [
      "VpnGw3",
      "VpnGw4",
      "VpnGw2",
      "VpnGw5"
    ],
    correctIndex: 1,
    explanation: "VpnGw3 supports only 30 S2S tunnels (insufficient for 50). VpnGw4 supports up to 100 tunnels and provides 5 Gbps throughput, making it the minimum SKU that meets both requirements. VpnGw5 would also work but is not the minimum."
  },
  {
    id: "az700-16-q2",
    question: "When configuring GCMAES256 as the IPsec encryption algorithm, what must be set for the IPsec integrity parameter?",
    options: [
      "SHA256",
      "SHA384",
      "GCMAES256",
      "Any integrity algorithm is valid"
    ],
    correctIndex: 2,
    explanation: "When using GCMAES (Galois/Counter Mode) for IPsec encryption, the integrity parameter must be set to the same GCMAES value. GCM is an authenticated encryption (AEAD) mode that provides both confidentiality and integrity in a single operation, so GCMAES256 encryption requires GCMAES256 integrity."
  },
  {
    id: "az700-16-q3",
    question: "You have a route-based VPN gateway with multiple S2S connections. One partner requires policy-based traffic selectors. What should you do?",
    options: [
      "Change the gateway to policy-based type",
      "Create a separate policy-based gateway for that partner",
      "Enable usePolicyBasedTrafficSelectors on that specific connection",
      "Ask the partner to change to route-based"
    ],
    correctIndex: 2,
    explanation: "On a route-based gateway, you can enable policy-based traffic selectors on a per-connection basis using --use-policy-based-traffic-selectors true. This accommodates the partner's requirement without affecting other connections or losing route-based benefits (multiple tunnels, BGP, P2S)."
  },
  {
    id: "az700-16-q4",
    question: "What is the purpose of the --sa-lifetime parameter in a custom IPsec policy?",
    options: [
      "Maximum time the VPN gateway stays powered on",
      "Time before the security association expires and must be renegotiated",
      "Timeout before the connection is declared dead",
      "Maximum duration of a single TCP session through the tunnel"
    ],
    correctIndex: 1,
    explanation: "The SA (Security Association) lifetime defines how long the negotiated encryption keys are valid before they expire and a new IKE/IPsec negotiation must occur. This limits the window of exposure if keys are compromised and ensures fresh cryptographic material is regularly established."
  },
  {
    id: "az700-16-q5",
    question: "Which DH Group should NOT be used in production due to insufficient key strength?",
    options: [
      "DHGroup14 (2048-bit)",
      "ECP256 (256-bit elliptic curve)",
      "DHGroup2 (1024-bit)",
      "DHGroup24 (2048-bit MODP)"
    ],
    correctIndex: 2,
    explanation: "DHGroup2 uses a 1024-bit key which is considered cryptographically weak by modern standards and should not be used in production. NIST deprecated 1024-bit Diffie-Hellman in 2013. DHGroup14 (2048-bit) is the minimum recommended, and ECP256/ECP384 provide equivalent or better security with shorter key sizes."
  }
]} />

---

## Limpeza

Remova todos os recursos criados neste desafio para interromper a cobrança:

```bash
az group delete --name rg-vpn-ipsec-lab --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-vpn-ipsec-lab" -Force -AsJob
```

---

## Referências adicionais

- [About VPN Gateway SKUs](https://learn.microsoft.com/en-us/azure/vpn-gateway/about-gateway-skus)
- [Custom IPsec/IKE policy for S2S VPN](https://learn.microsoft.com/en-us/azure/vpn-gateway/ipsec-ike-policy-howto)
- [Cryptographic requirements and Azure VPN gateways](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-compliance-crypto)
- [Connect to policy-based VPN devices](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-connect-multiple-policybased-rm-ps)
- [VPN Gateway pricing](https://azure.microsoft.com/en-us/pricing/details/vpn-gateway/)
