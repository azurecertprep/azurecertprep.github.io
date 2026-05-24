---
sidebar_position: 11
title: "Desafio 24: Solução de Problemas de Conectividade Híbrida"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 24: Solução de problemas de conectividade híbrida

:::info Tempo e custo estimados

**60â€“90 minutos** | **~$0,19/h** (Gateway VPN) + **~$1,20/h** (Circuito ER) | **Peso no exame: 20â€“25%**

:::

## Cenário

A equipe de operações de rede da Contoso recebeu três tickets de escalonamento esta manhã:

1. **Ticket 1 -- Instabilidade da VPN S2S:** O túnel VPN site a site entre a sede (local) e o Azure continua desconectando a cada 5-10 minutos. Os usuários relatam conectividade intermitente com aplicações hospedadas no Azure.

2. **Ticket 2 -- Falhas de autenticação P2S:** Trabalhadores remotos usando o cliente VPN ponto a site estão recebendo erros de autenticação. Alguns usuários recebem "falha na validação do certificado" enquanto outros veem erros de "incompatibilidade de tipo de túnel".

3. **Ticket 3 -- ExpressRoute não provisionado:** Um circuito ExpressRoute recém-solicitado mostra "Provider Provisioning State: NotProvisioned" mesmo que o provedor de serviços afirme ter concluído sua parte da configuração.

A equipe deve usar ferramentas de diagnóstico do Azure para identificar sistematicamente as causas raiz e resolver cada problema.

## Habilidades de exame avaliadas

| Habilidade | Descrição |
|-------|-------------|
| Diagnosticar e resolver problemas de conectividade do gateway de rede virtual | Solucionar problemas de conexões VPN S2S, integridade do gateway e falhas IKE |
| Diagnosticar e resolver problemas de autenticação e do lado do cliente (P2S) | Solucionar problemas de certificados, tipos de túnel e pools de endereços |
| Diagnosticar e resolver problemas de conexão ExpressRoute | Verificar estado do circuito, configuração de peering, tabelas ARP e tabelas de rotas |

## Pré-requisitos

Este desafio assume que os seguintes recursos existem (de desafios anteriores ou de uma configuração de laboratório):

- Grupo de recursos com Gateway VPN (VpnGw1 ou superior)
- Conexão VPN S2S ativa
- Configuração de VPN P2S com autenticação por certificado
- Circuito ExpressRoute (pode usar um circuito de teste/simulação)

---

## Tarefa 1: Solucionar problemas da VPN S2S -- verificar status da conexão

Comece examinando o objeto de conexão VPN para determinar o estado atual e coletar métricas.

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

### Valores de status da conexão

| Status | Significado |
|--------|---------|
| Connected | O túnel está ativo e passando tráfego |
| Connecting | Negociação IKE em andamento |
| NotConnected | O túnel está inativo, nenhuma negociação ativa |
| Unknown | O gateway não consegue determinar o estado (geralmente durante atualizações) |

---

## Tarefa 2: Analisar diagnósticos de VPN com o Network Watcher

Use a solução de problemas de VPN do Network Watcher para executar diagnósticos automatizados que analisam logs IKE, descartes de pacotes e integridade do gateway.

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

### Códigos de erro IKE comuns nos diagnósticos

| Erro | Significado | Resolução |
|-------|---------|------------|
| ERROR_IPSEC_IKE_NO_POLICY | Incompatibilidade de política IKE Fase 1 | Alinhar criptografia, integridade, grupo DH em ambos os lados |
| ERROR_IPSEC_IKE_TIMED_OUT | Peer não responde | Verificar acessibilidade do dispositivo local, regras de firewall para UDP 500/4500 |
| ERROR_IPSEC_IKE_AUTH_FAIL | Incompatibilidade de chave pré-compartilhada | Verificar se a chave compartilhada é igual em ambos os lados |
| ERROR_IPSEC_IKE_DH_FAIL | Incompatibilidade de grupo DH | Garantir que ambos os lados usem o mesmo grupo Diffie-Hellman |
| ERROR_IPSEC_IKE_SA_DELETED | Tempo de vida da SA expirou, rekey falhou | Verificar configurações de tempo de vida da SA; padrão do Azure é 28800s (8h) para IKE |

---

## Tarefa 3: Solucionar problemas de autenticação da VPN P2S

Problemas de P2S geralmente se enquadram em três categorias: problemas de certificado, incompatibilidade de tipo de túnel ou esgotamento do pool de endereços.

### Verificar configuração P2S

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

### Problemas comuns de P2S e resolução

#### Problema 1: Falha na validação do certificado

O certificado do cliente não foi emitido por uma CA raiz que está carregada no gateway.

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

#### Problema 2: Incompatibilidade de tipo de túnel

O cliente está configurado para IKEv2, mas o gateway suporta apenas SSTP, ou vice-versa.

```bash
# Update gateway to support both IKEv2 and OpenVPN
az network vnet-gateway update \
  --name $GW_NAME \
  --resource-group $RG \
  --client-protocol IkeV2 OpenVPN
```

#### Problema 3: Esgotamento do pool de endereços

Todos os IPs de clientes P2S estão alocados. Nenhum novo cliente pode se conectar.

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

:::tip Dimensionamento do pool de endereços
Um prefixo /24 fornece aproximadamente 251 endereços de cliente utilizáveis. Para implantações maiores, use /16 ou múltiplos prefixos. O pool de endereços não deve sobrepor nenhum espaço de endereço de VNet ou intervalos locais.
:::

---

## Tarefa 4: Solucionar problemas de circuito e peering ExpressRoute

Examine o estado de provisionamento do circuito ExpressRoute, a configuração de peering e verifique a conectividade de camada 2/3.

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

| Estado de provisionamento do circuito | Estado do provedor de serviços | Significado |
|---------------------------|----------------------|---------|
| Enabled | NotProvisioned | Circuito criado no Azure; aguardando o provedor |
| Enabled | Provisioning | Provedor está configurando seu lado |
| Enabled | Provisioned | Provedor concluiu; pronto para configuração de peering |
| Deprovisioning | Deprovisioning | Circuito sendo excluído |

---

## Tarefa 5: Usar reset do gateway como último recurso

Quando um gateway se torna não responsivo ou os túneis ficam presos em um estado inválido, redefinir o gateway reinicia a instância ativa e força a renegociação IKE.

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
- Interrompe TODAS as conexões nesse gateway (S2S, P2S e VNet-to-VNet)
- Leva de 5 a 15 minutos para ser concluído
- Não altera a configuração do gateway -- apenas reinicia a instância ativa
- Para gateways ativo-ativo, você pode redefinir cada instância separadamente usando o parâmetro `--gateway-vip`
:::

---

## Tarefa 6: Solução de problemas avançada com captura de pacotes

Para problemas persistentes, capture pacotes no gateway VPN para analisar o handshake IKE e o tráfego do plano de dados.

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

## Cenários de quebra e correção

### Cenário 1: Instabilidade da conexão VPN (timeout DPD)

**Sintoma:** O túnel S2S desconecta a cada 5-10 minutos, reconecta automaticamente e depois cai novamente. Os contadores de bytes transferidos são zerados a cada vez.

**Causa raiz:** O timeout de Dead Peer Detection (DPD) está configurado de forma muito agressiva no dispositivo local. O Azure usa um timeout DPD de 45 segundos por padrão. Se o dispositivo local tem um timeout menor (ex.: 10 segundos) e há picos breves de latência, ele derruba o túnel.

**Diagnóstico:**
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

**Correção:** Defina uma política IPsec personalizada com timeout DPD apropriado (mínimo do Azure é 9 segundos, recomendado é 45 segundos). Garanta também que o dispositivo local esteja alinhado:
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

### Cenário 2: Pool de endereços P2S cheio

**Sintoma:** Novos clientes VPN P2S recebem o erro "no available IP addresses" ou falham ao conectar enquanto clientes existentes permanecem conectados.

**Causa raiz:** O pool de endereços P2S foi configurado com um /28 (14 IPs utilizáveis) e todos os endereços estão alocados para sessões existentes.

**Diagnóstico:**
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

**Correção:** Expanda o pool de endereços para acomodar mais clientes:
```bash
az network vnet-gateway update \
  --name $GW_NAME \
  --resource-group $RG \
  --address-prefixes "172.16.0.0/16"
```

:::note
Alterar o pool de endereços requer que os clientes P2S existentes se reconectem. Planeje essa mudança durante uma janela de manutenção.
:::

---

### Cenário 3: Falha de ARP do ExpressRoute (VLAN incorreta)

**Sintoma:** O estado de peering do ExpressRoute mostra "Enabled", mas a tabela ARP retorna resultados vazios. Nenhuma rota é aprendida.

**Causa raiz:** O VLAN ID configurado no peering do Azure não corresponde ao VLAN ID configurado pelo provedor de serviços em seu roteador de borda.

**Diagnóstico:**
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

**Correção:** Coordene com o provedor de serviços para confirmar o VLAN ID correto e então atualize o peering:
```bash
# Update peering with correct VLAN ID (example: provider confirms VLAN 200)
az network express-route peering update \
  --circuit-name $ER_NAME \
  --resource-group $RG \
  --name "AzurePrivatePeering" \
  --vlan-id 200
```

Após a atualização, verifique se o ARP resolve dentro de 1-2 minutos e se as rotas BGP começam a aparecer na tabela de rotas.

---

## Árvore de decisão para solução de problemas

```text
Túnel VPN Inativo?
â”œâ”€â”€ Verificar connectionStatus
â”‚   â”œâ”€â”€ NotConnected â†’ Verificar acessibilidade do dispositivo local (UDP 500/4500)
â”‚   â”œâ”€â”€ Connecting â†’ Negociação IKE falhando
â”‚   â”‚   â”œâ”€â”€ Verificar correspondência de chave compartilhada
â”‚   â”‚   â”œâ”€â”€ Verificar alinhamento de política IKE/IPsec
â”‚   â”‚   â””â”€â”€ Executar solução de problemas do Network Watcher
â”‚   â””â”€â”€ Connected mas sem tráfego â†’ Verificar roteamento (UDR, BGP, NSG)
â”‚
VPN P2S Falhando?
â”œâ”€â”€ Erro de certificado â†’ Verificar cert raiz carregado, cert cliente não revogado
â”œâ”€â”€ Erro de tipo de túnel â†’ Alinhar protocolo do cliente com config do gateway (IKEv2/OpenVPN/SSTP)
â””â”€â”€ Sem IPs disponíveis â†’ Expandir pool de endereços
â”‚
ExpressRoute Não Funcionando?
â”œâ”€â”€ Estado do Provedor = NotProvisioned â†’ Contatar provedor
â”œâ”€â”€ Estado do Peering = Disabled â†’ Verificar configuração de peering
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

## Verificação de conhecimento

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
