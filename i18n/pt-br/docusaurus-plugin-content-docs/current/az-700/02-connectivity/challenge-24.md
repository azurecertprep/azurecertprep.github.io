---
sidebar_position: 11
title: "Desafio 24: Solução de Problemas de Conectividade Híbrida"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 24: SoluÃ§Ã£o de problemas de conectividade hÃ­brida

:::info Tempo e custo estimados

**60â€“90 minutos** | **~$0,19/h** (Gateway VPN) + **~$1,20/h** (Circuito ER) | **Peso no exame: 20â€“25%**

:::

## CenÃ¡rio

A equipe de operaÃ§Ãµes de rede da Contoso recebeu trÃªs tickets de escalonamento esta manhÃ£:

1. **Ticket 1 -- Instabilidade da VPN S2S:** O tÃºnel VPN site a site entre a sede (local) e o Azure continua desconectando a cada 5-10 minutos. Os usuÃ¡rios relatam conectividade intermitente com aplicaÃ§Ãµes hospedadas no Azure.

2. **Ticket 2 -- Falhas de autenticaÃ§Ã£o P2S:** Trabalhadores remotos usando o cliente VPN ponto a site estÃ£o recebendo erros de autenticaÃ§Ã£o. Alguns usuÃ¡rios recebem "falha na validaÃ§Ã£o do certificado" enquanto outros veem erros de "incompatibilidade de tipo de tÃºnel".

3. **Ticket 3 -- ExpressRoute nÃ£o provisionado:** Um circuito ExpressRoute recÃ©m-solicitado mostra "Provider Provisioning State: NotProvisioned" mesmo que o provedor de serviÃ§os afirme ter concluÃ­do sua parte da configuraÃ§Ã£o.

A equipe deve usar ferramentas de diagnÃ³stico do Azure para identificar sistematicamente as causas raiz e resolver cada problema.

## Habilidades de exame avaliadas

| Habilidade | DescriÃ§Ã£o |
|-------|-------------|
| Diagnosticar e resolver problemas de conectividade do gateway de rede virtual | Solucionar problemas de conexÃµes VPN S2S, integridade do gateway e falhas IKE |
| Diagnosticar e resolver problemas de autenticaÃ§Ã£o e do lado do cliente (P2S) | Solucionar problemas de certificados, tipos de tÃºnel e pools de endereÃ§os |
| Diagnosticar e resolver problemas de conexÃ£o ExpressRoute | Verificar estado do circuito, configuraÃ§Ã£o de peering, tabelas ARP e tabelas de rotas |

## PrÃ©-requisitos

Este desafio assume que os seguintes recursos existem (de desafios anteriores ou de uma configuraÃ§Ã£o de laboratÃ³rio):

- Grupo de recursos com Gateway VPN (VpnGw1 ou superior)
- ConexÃ£o VPN S2S ativa
- ConfiguraÃ§Ã£o de VPN P2S com autenticaÃ§Ã£o por certificado
- Circuito ExpressRoute (pode usar um circuito de teste/simulaÃ§Ã£o)

---

## Tarefa 1: Solucionar problemas da VPN S2S -- verificar status da conexÃ£o

Comece examinando o objeto de conexÃ£o VPN para determinar o estado atual e coletar mÃ©tricas.

### Azure CLI

```bash
RG="rg-hybrid-challenge24"
GW_NAME="vpngw-contoso"
CONNECTION_NAME="conn-onprem-hq"

# Check VPN connection status and traffic counters
az network vpn-connection show \
  --name $CONNECTION_NAME \
  --resource-group $RG \
  --query "{
    connectionStatus: connectionStatus,
    ingressBytes: ingressBytesTransferred,
    egressBytes: egressBytesTransferred,
    connectionType: connectionType,
    sharedKey: sharedKey,
    provisioningState: provisioningState,
    ipsecPolicies: ipsecPolicies
  }"

# List all connections on the gateway
az network vpn-connection list \
  --resource-group $RG \
  --vnet-gateway $GW_NAME \
  --output table
```

### Azure PowerShell

```powershell
$RG = "rg-hybrid-challenge24"
$GwName = "vpngw-contoso"
$ConnName = "conn-onprem-hq"

# Get connection details
$conn = Get-AzVirtualNetworkGatewayConnection `
  -ResourceGroupName $RG `
  -Name $ConnName

# Display key diagnostic properties
$conn | Select-Object `
  Name,
  ConnectionStatus,
  IngressBytesTransferred,
  EgressBytesTransferred,
  ConnectionProtocol,
  ProvisioningState

# Check if the connection has custom IPsec policies
$conn.IpsecPolicies
```

### Valores de status da conexÃ£o

| Status | Significado |
|--------|---------|
| Connected | O tÃºnel estÃ¡ ativo e passando trÃ¡fego |
| Connecting | NegociaÃ§Ã£o IKE em andamento |
| NotConnected | O tÃºnel estÃ¡ inativo, nenhuma negociaÃ§Ã£o ativa |
| Unknown | O gateway nÃ£o consegue determinar o estado (geralmente durante atualizaÃ§Ãµes) |

---

## Tarefa 2: Analisar diagnÃ³sticos de VPN com o Network Watcher

Use a soluÃ§Ã£o de problemas de VPN do Network Watcher para executar diagnÃ³sticos automatizados que analisam logs IKE, descartes de pacotes e integridade do gateway.

### Azure CLI

```bash
STORAGE_ACCOUNT="stdiagcontoso"
CONTAINER_NAME="vpn-diagnostics"
STORAGE_PATH="https://${STORAGE_ACCOUNT}.blob.core.windows.net/${CONTAINER_NAME}"

# Start VPN troubleshooting on the connection
az network watcher troubleshooting start \
  --resource $CONNECTION_NAME \
  --resource-group $RG \
  --resource-type vpnConnection \
  --storage-account $STORAGE_ACCOUNT \
  --storage-path $STORAGE_PATH

# Alternatively, troubleshoot the gateway itself
az network watcher troubleshooting start \
  --resource $GW_NAME \
  --resource-group $RG \
  --resource-type vnetGateway \
  --storage-account $STORAGE_ACCOUNT \
  --storage-path $STORAGE_PATH

# Check results of the last troubleshooting operation
az network watcher troubleshooting show \
  --resource $GW_NAME \
  --resource-group $RG \
  --resource-type vnetGateway
```

### Azure PowerShell

```powershell
$StorageAccount = Get-AzStorageAccount -ResourceGroupName $RG -Name "stdiagcontoso"

# Start gateway troubleshooting
$gw = Get-AzVirtualNetworkGateway -ResourceGroupName $RG -Name $GwName

Start-AzNetworkWatcherResourceTroubleshooting `
  -NetworkWatcher (Get-AzNetworkWatcher -ResourceGroupName "NetworkWatcherRG" -Name "NetworkWatcher_eastus") `
  -TargetResourceId $gw.Id `
  -StorageId $StorageAccount.Id `
  -StoragePath "https://stdiagcontoso.blob.core.windows.net/vpn-diagnostics"
```

### CÃ³digos de erro IKE comuns nos diagnÃ³sticos

| Erro | Significado | ResoluÃ§Ã£o |
|-------|---------|------------|
| ERROR_IPSEC_IKE_NO_POLICY | Incompatibilidade de polÃ­tica IKE Fase 1 | Alinhar criptografia, integridade, grupo DH em ambos os lados |
| ERROR_IPSEC_IKE_TIMED_OUT | Peer nÃ£o responde | Verificar acessibilidade do dispositivo local, regras de firewall para UDP 500/4500 |
| ERROR_IPSEC_IKE_AUTH_FAIL | Incompatibilidade de chave prÃ©-compartilhada | Verificar se a chave compartilhada Ã© igual em ambos os lados |
| ERROR_IPSEC_IKE_DH_FAIL | Incompatibilidade de grupo DH | Garantir que ambos os lados usem o mesmo grupo Diffie-Hellman |
| ERROR_IPSEC_IKE_SA_DELETED | Tempo de vida da SA expirou, rekey falhou | Verificar configuraÃ§Ãµes de tempo de vida da SA; padrÃ£o do Azure Ã© 28800s (8h) para IKE |

---

## Tarefa 3: Solucionar problemas de autenticaÃ§Ã£o da VPN P2S

Problemas de P2S geralmente se enquadram em trÃªs categorias: problemas de certificado, incompatibilidade de tipo de tÃºnel ou esgotamento do pool de endereÃ§os.

### Verificar configuraÃ§Ã£o P2S

#### Azure CLI

```bash
# Show the VPN gateway P2S configuration
az network vnet-gateway show \
  --name $GW_NAME \
  --resource-group $RG \
  --query "{
    vpnClientConfiguration: vpnClientConfiguration.vpnClientProtocols,
    addressPool: vpnClientConfiguration.vpnClientAddressPool,
    rootCertificates: vpnClientConfiguration.vpnClientRootCertificates[].name,
    revokedCertificates: vpnClientConfiguration.vpnClientRevokedCertificates[].name,
    authenticationTypes: vpnClientConfiguration.vpnAuthenticationTypes
  }"
```

#### Azure PowerShell

```powershell
$gw = Get-AzVirtualNetworkGateway -ResourceGroupName $RG -Name $GwName

# Inspect P2S configuration
$gw.VpnClientConfiguration | Select-Object `
  VpnClientProtocols,
  VpnClientAddressPool,
  VpnAuthenticationTypes

# List root certificates
$gw.VpnClientConfiguration.VpnClientRootCertificates | 
  Select-Object Name, ProvisioningState
```

### Problemas comuns de P2S e resoluÃ§Ã£o

#### Problema 1: Falha na validaÃ§Ã£o do certificado

O certificado do cliente nÃ£o foi emitido por uma CA raiz que estÃ¡ carregada no gateway.

```bash
# List uploaded root certificates
az network vnet-gateway root-cert list \
  --gateway-name $GW_NAME \
  --resource-group $RG \
  --output table

# Upload a missing root certificate (base64-encoded .cer without header/footer)
az network vnet-gateway root-cert create \
  --gateway-name $GW_NAME \
  --resource-group $RG \
  --name "ContosoRootCA" \
  --public-cert-data "MIIDuzCCAqO..."
```

#### Problema 2: Incompatibilidade de tipo de tÃºnel

O cliente estÃ¡ configurado para IKEv2, mas o gateway suporta apenas SSTP, ou vice-versa.

```bash
# Update gateway to support both IKEv2 and OpenVPN
az network vnet-gateway update \
  --name $GW_NAME \
  --resource-group $RG \
  --client-protocol IkeV2 OpenVPN
```

#### Problema 3: Esgotamento do pool de endereÃ§os

Todos os IPs de clientes P2S estÃ£o alocados. Nenhum novo cliente pode se conectar.

```bash
# Check current address pool size
az network vnet-gateway show \
  --name $GW_NAME \
  --resource-group $RG \
  --query "vpnClientConfiguration.vpnClientAddressPool.addressPrefixes"

# Expand the address pool
az network vnet-gateway update \
  --name $GW_NAME \
  --resource-group $RG \
  --address-prefixes "172.16.0.0/16"
```

:::tip Dimensionamento do pool de endereÃ§os
Um prefixo /24 fornece aproximadamente 251 endereÃ§os de cliente utilizÃ¡veis. Para implantaÃ§Ãµes maiores, use /16 ou mÃºltiplos prefixos. O pool de endereÃ§os nÃ£o deve sobrepor nenhum espaÃ§o de endereÃ§o de VNet ou intervalos locais.
:::

---

## Tarefa 4: Solucionar problemas de circuito e peering ExpressRoute

Examine o estado de provisionamento do circuito ExpressRoute, a configuraÃ§Ã£o de peering e verifique a conectividade de camada 2/3.

### Azure CLI

```bash
ER_NAME="er-contoso-equinix"

# Check circuit provisioning state
az network express-route show \
  --name $ER_NAME \
  --resource-group $RG \
  --query "{
    circuitProvisioningState: circuitProvisioningState,
    serviceProviderProvisioningState: serviceProviderProvisioningState,
    serviceProviderProperties: serviceProviderProperties,
    sku: sku,
    bandwidthInMbps: bandwidthInMbps
  }"

# Check peering configuration
az network express-route peering show \
  --circuit-name $ER_NAME \
  --resource-group $RG \
  --name "AzurePrivatePeering" \
  --query "{
    peeringType: peeringType,
    state: state,
    azureASN: azureASN,
    peerASN: peerASN,
    primaryPeerAddressPrefix: primaryPeerAddressPrefix,
    secondaryPeerAddressPrefix: secondaryPeerAddressPrefix,
    vlanId: vlanId
  }"

# Get circuit statistics (bytes in/out)
az network express-route get-stats \
  --name $ER_NAME \
  --resource-group $RG

# Get ARP table to verify layer 2 connectivity
az network express-route list-arp-tables \
  --name $ER_NAME \
  --resource-group $RG \
  --peering-name "AzurePrivatePeering" \
  --device-path "primary"

# Get route table to verify BGP route exchange
az network express-route list-route-tables \
  --name $ER_NAME \
  --resource-group $RG \
  --peering-name "AzurePrivatePeering" \
  --device-path "primary"
```

### Azure PowerShell

```powershell
$ErName = "er-contoso-equinix"

# Get circuit details
$circuit = Get-AzExpressRouteCircuit -ResourceGroupName $RG -Name $ErName

# Check provisioning states
$circuit | Select-Object `
  CircuitProvisioningState,
  ServiceProviderProvisioningState,
  @{N='Bandwidth';E={$_.ServiceProviderProperties.BandwidthInMbps}}

# Get peering details
$peering = Get-AzExpressRouteCircuitPeeringConfig `
  -ExpressRouteCircuit $circuit `
  -Name "AzurePrivatePeering"

$peering | Select-Object `
  PeeringType,
  State,
  AzureASN,
  PeerASN,
  PrimaryPeerAddressPrefix,
  SecondaryPeerAddressPrefix,
  VlanId

# Get ARP table
Get-AzExpressRouteCircuitARPTable `
  -ResourceGroupName $RG `
  -ExpressRouteCircuitName $ErName `
  -PeeringType "AzurePrivatePeering" `
  -DevicePath "Primary"

# Get route table
Get-AzExpressRouteCircuitRouteTable `
  -ResourceGroupName $RG `
  -ExpressRouteCircuitName $ErName `
  -PeeringType "AzurePrivatePeering" `
  -DevicePath "Primary"
```

### Matriz de estados do ExpressRoute

| Estado de provisionamento do circuito | Estado do provedor de serviÃ§os | Significado |
|---------------------------|----------------------|---------|
| Enabled | NotProvisioned | Circuito criado no Azure; aguardando o provedor |
| Enabled | Provisioning | Provedor estÃ¡ configurando seu lado |
| Enabled | Provisioned | Provedor concluiu; pronto para configuraÃ§Ã£o de peering |
| Deprovisioning | Deprovisioning | Circuito sendo excluÃ­do |

---

## Tarefa 5: Usar reset do gateway como Ãºltimo recurso

Quando um gateway se torna nÃ£o responsivo ou os tÃºneis ficam presos em um estado invÃ¡lido, redefinir o gateway reinicia a instÃ¢ncia ativa e forÃ§a a renegociaÃ§Ã£o IKE.

### Azure CLI

```bash
# Reset the VPN gateway (affects all connections on this gateway)
az network vnet-gateway reset \
  --name $GW_NAME \
  --resource-group $RG

# Wait for the gateway to come back online
az network vnet-gateway wait \
  --name $GW_NAME \
  --resource-group $RG \
  --created

# Verify gateway status after reset
az network vnet-gateway show \
  --name $GW_NAME \
  --resource-group $RG \
  --query "{provisioningState:provisioningState, gatewayType:gatewayType, vpnType:vpnType}"
```

### Azure PowerShell

```powershell
# Reset the gateway
Reset-AzVirtualNetworkGateway `
  -VirtualNetworkGateway (Get-AzVirtualNetworkGateway -ResourceGroupName $RG -Name $GwName)

# Check gateway health after reset
Get-AzVirtualNetworkGateway -ResourceGroupName $RG -Name $GwName |
  Select-Object Name, ProvisioningState, GatewayType, VpnType
```

:::warning Impacto do reset do gateway
Redefinir um gateway:
- Interrompe TODAS as conexÃµes nesse gateway (S2S, P2S e VNet-to-VNet)
- Leva de 5 a 15 minutos para ser concluÃ­do
- NÃ£o altera a configuraÃ§Ã£o do gateway -- apenas reinicia a instÃ¢ncia ativa
- Para gateways ativo-ativo, vocÃª pode redefinir cada instÃ¢ncia separadamente usando o parÃ¢metro `--gateway-vip`
:::

---

## Tarefa 6: SoluÃ§Ã£o de problemas avanÃ§ada com captura de pacotes

Para problemas persistentes, capture pacotes no gateway VPN para analisar o handshake IKE e o trÃ¡fego do plano de dados.

### Azure CLI

```bash
# Start packet capture on the gateway (captures IKE and ESP traffic)
az network vnet-gateway packet-capture start \
  --name $GW_NAME \
  --resource-group $RG

# After reproducing the issue, stop and save the capture
# The SAS URL points to a blob where the capture is stored
az network vnet-gateway packet-capture stop \
  --name $GW_NAME \
  --resource-group $RG \
  --sas-url "https://stdiagcontoso.blob.core.windows.net/captures?sv=2023-01-01&st=..."
```

### Azure PowerShell

```powershell
$gw = Get-AzVirtualNetworkGateway -ResourceGroupName $RG -Name $GwName

# Start capture
Start-AzVirtualNetworkGatewayPacketCapture `
  -ResourceGroupName $RG `
  -Name $GwName

# Stop capture and download
Stop-AzVirtualNetworkGatewayPacketCapture `
  -ResourceGroupName $RG `
  -Name $GwName `
  -SasUrl "https://stdiagcontoso.blob.core.windows.net/captures?sv=2023-01-01&st=..."
```

---

## CenÃ¡rios de quebra e correÃ§Ã£o

### CenÃ¡rio 1: Instabilidade da conexÃ£o VPN (timeout DPD)

**Sintoma:** O tÃºnel S2S desconecta a cada 5-10 minutos, reconecta automaticamente e depois cai novamente. Os contadores de bytes transferidos sÃ£o zerados a cada vez.

**Causa raiz:** O timeout de Dead Peer Detection (DPD) estÃ¡ configurado de forma muito agressiva no dispositivo local. O Azure usa um timeout DPD de 45 segundos por padrÃ£o. Se o dispositivo local tem um timeout menor (ex.: 10 segundos) e hÃ¡ picos breves de latÃªncia, ele derruba o tÃºnel.

**DiagnÃ³stico:**
```bash
# Check the connection for custom IPsec/IKE policies
az network vpn-connection show \
  --name $CONNECTION_NAME \
  --resource-group $RG \
  --query "ipsecPolicies"

# Look for DPD-related failures in troubleshooting output
az network watcher troubleshooting start \
  --resource $CONNECTION_NAME \
  --resource-group $RG \
  --resource-type vpnConnection \
  --storage-account $STORAGE_ACCOUNT \
  --storage-path $STORAGE_PATH
```

**CorreÃ§Ã£o:** Defina uma polÃ­tica IPsec personalizada com timeout DPD apropriado (mÃ­nimo do Azure Ã© 9 segundos, recomendado Ã© 45 segundos). Garanta tambÃ©m que o dispositivo local esteja alinhado:
```bash
az network vpn-connection ipsec-policy add \
  --connection-name $CONNECTION_NAME \
  --resource-group $RG \
  --ike-encryption AES256 \
  --ike-integrity SHA256 \
  --dh-group DHGroup14 \
  --ipsec-encryption AES256 \
  --ipsec-integrity SHA256 \
  --pfs-group PFS14 \
  --sa-lifetime 28800 \
  --sa-data-size 102400000
```

---

### CenÃ¡rio 2: Pool de endereÃ§os P2S cheio

**Sintoma:** Novos clientes VPN P2S recebem o erro "no available IP addresses" ou falham ao conectar enquanto clientes existentes permanecem conectados.

**Causa raiz:** O pool de endereÃ§os P2S foi configurado com um /28 (14 IPs utilizÃ¡veis) e todos os endereÃ§os estÃ£o alocados para sessÃµes existentes.

**DiagnÃ³stico:**
```bash
# Check current pool size
az network vnet-gateway show \
  --name $GW_NAME \
  --resource-group $RG \
  --query "vpnClientConfiguration.vpnClientAddressPool"

# Count connected clients (approximate)
az network vnet-gateway vpn-client show-health \
  --name $GW_NAME \
  --resource-group $RG 2>/dev/null || echo "Use Azure Portal > VPN Gateway > Point-to-site configuration > Connected clients"
```

**CorreÃ§Ã£o:** Expanda o pool de endereÃ§os para acomodar mais clientes:
```bash
az network vnet-gateway update \
  --name $GW_NAME \
  --resource-group $RG \
  --address-prefixes "172.16.0.0/16"
```

:::note
Alterar o pool de endereÃ§os requer que os clientes P2S existentes se reconectem. Planeje essa mudanÃ§a durante uma janela de manutenÃ§Ã£o.
:::

---

### CenÃ¡rio 3: Falha de ARP do ExpressRoute (VLAN incorreta)

**Sintoma:** O estado de peering do ExpressRoute mostra "Enabled", mas a tabela ARP retorna resultados vazios. Nenhuma rota Ã© aprendida.

**Causa raiz:** O VLAN ID configurado no peering do Azure nÃ£o corresponde ao VLAN ID configurado pelo provedor de serviÃ§os em seu roteador de borda.

**DiagnÃ³stico:**
```bash
# Check the VLAN ID in peering configuration
az network express-route peering show \
  --circuit-name $ER_NAME \
  --resource-group $RG \
  --name "AzurePrivatePeering" \
  --query "vlanId"

# Verify ARP table is empty (no layer 2 adjacency)
az network express-route list-arp-tables \
  --name $ER_NAME \
  --resource-group $RG \
  --peering-name "AzurePrivatePeering" \
  --device-path "primary"
```

**CorreÃ§Ã£o:** Coordene com o provedor de serviÃ§os para confirmar o VLAN ID correto e entÃ£o atualize o peering:
```bash
# Update peering with correct VLAN ID (example: provider confirms VLAN 200)
az network express-route peering update \
  --circuit-name $ER_NAME \
  --resource-group $RG \
  --name "AzurePrivatePeering" \
  --vlan-id 200
```

ApÃ³s a atualizaÃ§Ã£o, verifique se o ARP resolve dentro de 1-2 minutos e se as rotas BGP comeÃ§am a aparecer na tabela de rotas.

---

## Ãrvore de decisÃ£o para soluÃ§Ã£o de problemas

```text
TÃºnel VPN Inativo?
â”œâ”€â”€ Verificar connectionStatus
â”‚   â”œâ”€â”€ NotConnected â†’ Verificar acessibilidade do dispositivo local (UDP 500/4500)
â”‚   â”œâ”€â”€ Connecting â†’ NegociaÃ§Ã£o IKE falhando
â”‚   â”‚   â”œâ”€â”€ Verificar correspondÃªncia de chave compartilhada
â”‚   â”‚   â”œâ”€â”€ Verificar alinhamento de polÃ­tica IKE/IPsec
â”‚   â”‚   â””â”€â”€ Executar soluÃ§Ã£o de problemas do Network Watcher
â”‚   â””â”€â”€ Connected mas sem trÃ¡fego â†’ Verificar roteamento (UDR, BGP, NSG)
â”‚
VPN P2S Falhando?
â”œâ”€â”€ Erro de certificado â†’ Verificar cert raiz carregado, cert cliente nÃ£o revogado
â”œâ”€â”€ Erro de tipo de tÃºnel â†’ Alinhar protocolo do cliente com config do gateway (IKEv2/OpenVPN/SSTP)
â””â”€â”€ Sem IPs disponÃ­veis â†’ Expandir pool de endereÃ§os
â”‚
ExpressRoute NÃ£o Funcionando?
â”œâ”€â”€ Estado do Provedor = NotProvisioned â†’ Contatar provedor
â”œâ”€â”€ Estado do Peering = Disabled â†’ Verificar configuraÃ§Ã£o de peering
â”œâ”€â”€ Tabela ARP vazia â†’ Incompatibilidade de VLAN ou problema L2 com provedor
â””â”€â”€ Rotas ausentes â†’ Incompatibilidade de ASN BGP ou filtragem de prefixo
```

---

## Limpeza

```bash
# Delete resources if they were created for this challenge
az group delete --name $RG --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-hybrid-challenge24" -Force -AsJob
```

---

## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-24-q1",
    question: "Uma conexão VPN mostra connectionStatus 'Connecting' por mais de 10 minutos. O log do dispositivo on-premises mostra 'no proposal chosen'. Qual é a causa mais provável?",
    options: [
      "Incompatibilidade de política IKE Phase 1 -- configurações de criptografia, integridade ou grupo DH diferem entre Azure e on-premises",
      "A chave pré-compartilhada está incorreta no lado do Azure",
      "O gateway VPN precisa ser resetado",
      "O endereço IP público on-premises foi alterado"
    ],
    correctIndex: 0,
    explanation: "'No proposal chosen' é um erro clássico de IKE Phase 1 indicando que o respondedor não consegue encontrar uma proposta de associação de segurança compatível. Isso significa que o algoritmo de criptografia, algoritmo de integridade ou grupo Diffie-Hellman configurado no Azure não corresponde ao que o dispositivo on-premises está propondo. Uma incompatibilidade de PSK mostraria 'authentication failed' em vez disso."
  },
  {
    id: "az700-24-q2",
    question: "Qual comando inicia a solução automatizada de problemas VPN que analisa logs IKE e produz um relatório de diagnóstico?",
    options: [
      "az network watcher troubleshooting start --resource --resource-type vpnConnection --storage-account --storage-path",
      "az network vpn-connection show --query connectionStatus",
      "az network vnet-gateway reset --name --resource-group",
      "az network watcher test-connectivity --source-resource --dest-address"
    ],
    correctIndex: 0,
    explanation: "O comando 'az network watcher troubleshooting start' executa diagnósticos automatizados em gateways ou conexões VPN. Ele requer uma conta de armazenamento e caminho para armazenar os logs de diagnóstico e análise. Ele examina a negociação IKE, perda de pacotes, saúde do gateway e produz um relatório estruturado com códigos de erro e recomendações."
  },
  {
    id: "az700-24-q3",
    question: "Um circuito ExpressRoute mostra circuitProvisioningState 'Enabled' e serviceProviderProvisioningState 'NotProvisioned'. O que isso indica?",
    options: [
      "O circuito foi criado no Azure, mas o provedor de serviço ainda não completou o provisionamento nos seus roteadores de borda",
      "O circuito está mal configurado e precisa ser excluído e recriado",
      "O Azure detectou um problema de cobrança com o circuito",
      "A configuração de peering é inválida"
    ],
    correctIndex: 0,
    explanation: "circuitProvisioningState 'Enabled' significa que o recurso Azure foi implantado com sucesso. serviceProviderProvisioningState 'NotProvisioned' significa que o provedor de conectividade ainda não configurou sua infraestrutura de borda (cross-connects, VLAN tagging, etc.). Você precisa compartilhar a service key com seu provedor para que eles possam completar o provisionamento do lado deles."
  },
  {
    id: "az700-24-q4",
    question: "Clientes VPN P2S falham ao conectar com 'certificate validation failed'. O certificado da CA raiz foi renovado recentemente. Qual ação resolve isso?",
    options: [
      "Fazer upload do novo certificado da CA raiz no gateway VPN e garantir que os certificados de cliente sejam emitidos pela nova CA",
      "Resetar o gateway VPN para limpar o cache de certificados",
      "Regenerar o pacote de configuração do cliente VPN e redistribuir",
      "Alterar o tipo de túnel VPN de IKEv2 para OpenVPN"
    ],
    correctIndex: 0,
    explanation: "Quando uma CA raiz é renovada, o novo certificado deve ser carregado no gateway VPN usando 'az network vnet-gateway root-cert create'. Os certificados de cliente também devem ser reemitidos pela nova CA. O gateway valida certificados de cliente contra os certificados raiz carregados -- se o certificado raiz não estiver presente, todos os clientes emitidos por aquela CA falharão na autenticação."
  },
  {
    id: "az700-24-q5",
    question: "Após resetar um gateway VPN, qual é o impacto esperado?",
    options: [
      "Todas as conexões (S2S, P2S e VNet-to-VNet) no gateway são interrompidas por 5-15 minutos",
      "Apenas a conexão S2S específica que estava com problemas é resetada",
      "A configuração do gateway é revertida para as configurações padrão",
      "Clientes P2S permanecem conectados, mas os túneis S2S são renegociados"
    ],
    correctIndex: 0,
    explanation: "Um reset de gateway reinicia a instância ativa do gateway, o que interrompe TODAS as conexões -- túneis S2S, sessões de clientes P2S e conexões VNet-to-VNet. Leva de 5 a 15 minutos para completar. O reset não altera nenhuma configuração; apenas reinicia a instância e força a renegociação de todos os túneis. Para gateways active-active, você pode resetar uma instância por vez para minimizar o impacto."
  },
  {
    id: "az700-24-q6",
    question: "Um peering ExpressRoute mostra estado 'Enabled', mas a tabela ARP retorna resultados vazios nos caminhos primário e secundário. Qual é o problema de camada 2 mais provável?",
    options: [
      "O VLAN ID configurado no peering do Azure não corresponde à tag VLAN configurada pelo provedor de serviço",
      "O BGP ASN está mal configurado no lado do Azure",
      "A largura de banda do circuito ExpressRoute é insuficiente",
      "As máscaras de sub-rede do peering são /31 em vez de /30"
    ],
    correctIndex: 0,
    explanation: "Uma tabela ARP vazia indica uma falha de conectividade de camada 2 -- o roteador MSEE do Azure não consegue alcançar o roteador de borda do provedor/cliente no nível de quadro Ethernet. A causa mais comum é uma incompatibilidade de VLAN ID entre o que o Azure espera e o que o provedor configurou. Problemas de BGP ASN apareceriam na tabela de rotas (camada 3), não no ARP. Ambas as sub-redes /30 e /31 são suportadas para peering."
  }
]} />
