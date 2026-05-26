---
sidebar_position: 4
title: "Desafio 17: VPN Ponto a Site & Configuração do Cliente"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Desafio 17: VPN ponto a site e configuração de cliente

:::info Tempo e custo estimados

**60-90 minutos** | **~$0,19/h** (VPN Gateway) | **Peso no exame: 20-25%**

:::

## Cenário

A força de trabalho remota da Contoso precisa de acesso seguro às redes virtuais do Azure a partir de seus laptops pessoais e corporativos. A equipe de rede deve configurar a conectividade VPN ponto a site (P2S) em um gateway VPN existente, suportando múltiplos tipos de túnel para acomodar clientes Windows, macOS e Linux. Eles precisam gerar e distribuir pacotes de configuração de cliente VPN e entender quando recomendar cada tipo de túnel com base nos requisitos organizacionais.

## Habilidades de exame abordadas

| Habilidade | Descrição |
|------------|-----------|
| Selecionar um SKU de gateway de rede virtual apropriado | Escolher um SKU que suporte P2S e os tipos de túnel necessários |
| Selecionar e configurar um tipo de túnel | Configurar OpenVPN, IKEv2 ou SSTP com base nos requisitos do SO do cliente |
| Implementar um arquivo de configuração de cliente VPN | Gerar e distribuir pacotes de cliente VPN |
| Especificar os requisitos do Azure para o Azure Network Adapter | Entender a configuração simplificada de P2S via Windows Admin Center |

## Visão geral da arquitetura

```text
Remote Clients                        Azure
+------------------+                  +---------------------------+
| Windows laptop   |---[OpenVPN]----->|                           |
| macOS laptop     |---[IKEv2]------->|   VPN Gateway (VpnGw1)   |
| Linux laptop     |---[OpenVPN]----->|   P2S Address Pool:       |
| Windows (corp)   |---[SSTP]-------->|   172.16.201.0/24         |
+------------------+                  +---------------------------+
                                              |
                                      +-------+-------+
                                      |  VNet         |
                                      | 10.60.0.0/16  |
                                      +---------------+
```

## Pré-requisitos

Este desafio baseia-se em um gateway VPN implantado em um desafio anterior. Se você não tiver um, implante o gateway primeiro usando os comandos de configuração na Tarefa 1.

---

## Tarefa 1: Implantar o gateway VPN base (se ainda não estiver implantado)

Se você já possui um gateway VPN do Desafio 14, pule para a Tarefa 2.

### Azure CLI

```bash
# Variables
RG="rg-p2s-lab"
LOCATION="eastus"
VNET_NAME="vnet-contoso-p2s"
GW_SUBNET_PREFIX="10.60.255.0/27"
VNET_PREFIX="10.60.0.0/16"
GW_NAME="vpngw-contoso-p2s"
GW_PIP="pip-vpngw-p2s"

# Create resource group and VNet
az group create --name $RG --location $LOCATION

az network vnet create \
  --resource-group $RG \
  --name $VNET_NAME \
  --address-prefixes $VNET_PREFIX \
  --subnet-name GatewaySubnet \
  --subnet-prefixes $GW_SUBNET_PREFIX

# Create public IP for VPN gateway
az network public-ip create \
  --resource-group $RG \
  --name $GW_PIP \
  --allocation-method Static \
  --sku Standard

# Create VPN gateway (takes 30-45 minutes)
az network vnet-gateway create \
  --resource-group $RG \
  --name $GW_NAME \
  --vnet $VNET_NAME \
  --gateway-type Vpn \
  --vpn-type RouteBased \
  --sku VpnGw1 \
  --vpn-gateway-generation Generation1 \
  --public-ip-addresses $GW_PIP \
  --no-wait
```

### Azure PowerShell

```powershell
# Variables
$rg = "rg-p2s-lab"
$location = "eastus"
$vnetName = "vnet-contoso-p2s"
$gwSubnetPrefix = "10.60.255.0/27"
$vnetPrefix = "10.60.0.0/16"
$gwName = "vpngw-contoso-p2s"
$gwPipName = "pip-vpngw-p2s"

# Create resource group
New-AzResourceGroup -Name $rg -Location $location

# Create VNet with GatewaySubnet
$gwSubnet = New-AzVirtualNetworkSubnetConfig -Name "GatewaySubnet" -AddressPrefix $gwSubnetPrefix
$vnet = New-AzVirtualNetwork -Name $vnetName -ResourceGroupName $rg `
  -Location $location -AddressPrefix $vnetPrefix -Subnet $gwSubnet

# Create public IP
$gwPip = New-AzPublicIpAddress -Name $gwPipName -ResourceGroupName $rg `
  -Location $location -AllocationMethod Static -Sku Standard

# Get subnet reference
$gwSubnetRef = Get-AzVirtualNetworkSubnetConfig -Name "GatewaySubnet" -VirtualNetwork $vnet

# Create IP configuration
$gwIpConfig = New-AzVirtualNetworkGatewayIpConfig -Name "gwIpConfig" `
  -SubnetId $gwSubnetRef.Id -PublicIpAddressId $gwPip.Id

# Create VPN gateway (takes 30-45 minutes)
New-AzVirtualNetworkGateway -Name $gwName -ResourceGroupName $rg `
  -Location $location -IpConfigurations $gwIpConfig `
  -GatewayType Vpn -VpnType RouteBased `
  -GatewaySku VpnGw1 -VpnGatewayGeneration Generation1 -AsJob
```

---

## Tarefa 2: Configurar P2S com tipo de túnel OpenVPN

OpenVPN é o tipo de túnel recomendado para suporte multiplataforma (Windows, macOS, Linux). Ele usa TLS e opera na porta 443.

### Azure CLI

```bash
# Configure P2S address pool and OpenVPN protocol
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --address-prefixes "172.16.201.0/24" \
  --client-protocol OpenVPN

# Verify P2S configuration
az network vnet-gateway show \
  --resource-group $RG \
  --name $GW_NAME \
  --query "vpnClientConfiguration" \
  --output json
```

### Azure PowerShell

```powershell
# Get the gateway
$gw = Get-AzVirtualNetworkGateway -Name $gwName -ResourceGroupName $rg

# Configure P2S with OpenVPN
Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
  -VpnClientAddressPool "172.16.201.0/24" `
  -VpnClientProtocol "OpenVPN"

# Verify configuration
$gw = Get-AzVirtualNetworkGateway -Name $gwName -ResourceGroupName $rg
$gw.VpnClientConfiguration | Format-List
```

:::tip Dica de exame
OpenVPN é o único tipo de túnel que suporta todos os três principais métodos de autenticação: certificados, Microsoft Entra ID e RADIUS. Ele também funciona em Windows, macOS, Linux, iOS e Android.
:::

---

## Tarefa 3: Configurar tipo de túnel IKEv2

IKEv2 é uma solução VPN IPsec baseada em padrões, suportada nativamente no Windows 10+ e macOS sem software de cliente adicional.

### Azure CLI

```bash
# Configure P2S with both IKEv2 and OpenVPN protocols
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --address-prefixes "172.16.201.0/24" \
  --client-protocol IkeV2 OpenVPN

# Verify the updated configuration
az network vnet-gateway show \
  --resource-group $RG \
  --name $GW_NAME \
  --query "vpnClientConfiguration.vpnClientProtocols" \
  --output tsv
```

### Azure PowerShell

```powershell
$gw = Get-AzVirtualNetworkGateway -Name $gwName -ResourceGroupName $rg

# Configure both IKEv2 and OpenVPN
Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
  -VpnClientAddressPool "172.16.201.0/24" `
  -VpnClientProtocol "IkeV2", "OpenVPN"
```

:::note Considerações sobre IKEv2
- IKEv2 usa portas UDP 500 e 4500, que podem ser bloqueadas por alguns firewalls corporativos
- Suporta no máximo 128 conexões simultâneas por instância de gateway
- Necessário para configuração Always On VPN com túneis de nível de máquina
- Suporte nativo no cliente Windows 10/11 e macOS (sem necessidade de aplicativo de terceiros)
:::

---

## Tarefa 4: Configurar tipo de túnel SSTP

SSTP (Secure Socket Tunneling Protocol) é um protocolo exclusivo para Windows que usa a porta TCP 443, sendo ideal para conexões atrás de firewalls restritivos.

### Azure CLI

```bash
# Configure P2S with IKEv2 + OpenVPN (cross-platform, recommended)
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --address-prefixes "172.16.201.0/24" \
  --client-protocol IkeV2 OpenVPN

# Alternative: IKEv2 + SSTP (Windows-only fallback with firewall traversal)
# az network vnet-gateway update \
#   --resource-group $RG \
#   --name $GW_NAME \
#   --address-prefixes "172.16.201.0/24" \
#   --client-protocol IkeV2 SSTP
```

### Azure PowerShell

```powershell
$gw = Get-AzVirtualNetworkGateway -Name $gwName -ResourceGroupName $rg

# IKEv2 + OpenVPN (cross-platform, recommended)
Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
  -VpnClientAddressPool "172.16.201.0/24" `
  -VpnClientProtocol "IkeV2", "OpenVPN"

# Alternative: IKEv2 + SSTP (Windows-only fallback with firewall traversal)
# Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
#   -VpnClientAddressPool "172.16.201.0/24" `
#   -VpnClientProtocol "IkeV2", "SSTP"
```

### Características do SSTP

| Propriedade | Detalhe |
|-------------|---------|
| SO suportado | Somente Windows |
| Porta | TCP 443 (mesma do HTTPS) |
| Compatibilidade com firewall | Excelente - atravessa a maioria dos firewalls e proxies |
| Máximo de conexões | 128 por instância de gateway |
| Limitação de protocolo | Não pode ser combinado com OpenVPN no mesmo gateway (ambos usam TLS; IKEv2+SSTP é válido) |

:::warning Limitação importante
SSTP e OpenVPN não podem coexistir no mesmo gateway porque ambos usam tunelamento baseado em TLS na porta TCP 443. Combinações válidas são: IKEv2+OpenVPN (multiplataforma), IKEv2+SSTP (Windows com travessia de firewall) ou IKEv2 sozinho. Se você precisa de suporte a macOS/Linux e travessia de firewall, escolha IKEv2+OpenVPN.
:::

---

## Tarefa 5: Gerar e baixar o pacote de configuração de cliente VPN

O pacote de configuração de cliente VPN contém as configurações necessárias para que dispositivos clientes se conectem via P2S.

### Azure CLI

```bash
# Generate VPN client configuration (returns a URL to download the zip file)
az network vnet-gateway vpn-client generate \
  --resource-group $RG \
  --name $GW_NAME \
  --processor-architecture Amd64

# Retrieve the pre-generated VPN client URL
az network vnet-gateway vpn-client show-url \
  --resource-group $RG \
  --name $GW_NAME
```

### Azure PowerShell

```powershell
# Generate the VPN client configuration package
$profile = New-AzVpnClientConfiguration -ResourceGroupName $rg `
  -Name $gwName -AuthenticationMethod "EapTls"

# The URL to download the client package
$profile.VPNProfileSASUrl
```

### O que contém o pacote de cliente

O arquivo ZIP baixado contém pastas para cada protocolo configurado:

```text
VpnClientConfiguration.zip
├── OpenVPN/          # OpenVPN profile (.ovpn file)
├── WindowsAmd64/    # Windows 64-bit native client installer
├── WindowsX86/      # Windows 32-bit native client installer
├── Generic/         # Profile XML for manual configuration
└── AzureVPN/        # Azure VPN Client profile (azurevpnconfig.xml)
```

| Cliente | Protocolo usado | Arquivo de configuração |
|---------|----------------|------------------------|
| Azure VPN Client (Windows/macOS) | OpenVPN | AzureVPN/azurevpnconfig.xml |
| OpenVPN Connect | OpenVPN | OpenVPN/vpnconfig.ovpn |
| VPN nativo Windows | IKEv2/SSTP | WindowsAmd64/ installer |
| VPN nativo macOS | IKEv2 | Generic/ mobileconfig |
| strongSwan (Linux) | IKEv2 | Generic/ profile |

---

## Tarefa 6: Entender o Azure Network Adapter

Azure Network Adapter é um recurso do Windows Admin Center que fornece uma experiência simplificada de configuração de VPN ponto a site para máquinas Windows Server.

### Características principais

| Recurso | Descrição |
|---------|-----------|
| Objetivo | Conectar Windows Server local à VNet do Azure sem configuração complexa de VPN |
| Interface | Plugin do Windows Admin Center |
| Protocolo usado | VPN P2S IKEv2 |
| Autenticação | Baseada em certificado (gerado automaticamente) |
| Requisito de gateway | Requer gateway VPN existente com P2S configurado |
| Caso de uso | Gerenciamento híbrido, conectividade de servidor único |

### Requisitos do Azure Network Adapter

1. Windows Admin Center instalado e registrado com o Azure
2. Um gateway VPN existente com SKU compatível com P2S (VpnGw1 ou superior)
3. O gateway deve ter o pool de endereços P2S configurado
4. Permissões de assinatura do Azure para gerenciar o gateway VPN
5. Windows Server 2012 R2 ou posterior na máquina local

:::tip Dica de exame
O Azure Network Adapter automatiza a geração de certificados, a configuração do gateway e a instalação do cliente. Você não precisa gerar certificados manualmente nem baixar pacotes de cliente ao usar este recurso. É uma experiência baseada em "assistente" através do Windows Admin Center.
:::

---

## Tarefa 7: Entender as capacidades do SKU do gateway VPN para P2S

### Comparação de SKU para P2S

| SKU | Máximo de conexões P2S | Túneis suportados | Throughput |
|-----|------------------------:|-------------------|-----------|
| Basic | 128 | Somente SSTP | 100 Mbps |
| VpnGw1 | 250 | SSTP, IKEv2, OpenVPN | 650 Mbps |
| VpnGw2 | 500 | SSTP, IKEv2, OpenVPN | 1,0 Gbps |
| VpnGw3 | 1.000 | SSTP, IKEv2, OpenVPN | 1,25 Gbps |
| VpnGw4 | 5.000 | SSTP, IKEv2, OpenVPN | 5,0 Gbps |
| VpnGw5 | 10.000 | SSTP, IKEv2, OpenVPN | 10,0 Gbps |

:::warning Limitação do SKU Basic
O SKU Basic suporta apenas o tipo de túnel SSTP (somente Windows). Ele não suporta IKEv2 ou OpenVPN. Para conectividade P2S multiplataforma, use VpnGw1 ou superior.
:::

---

## Cenários de quebra e correção

### Cenário 1: Sobreposição de pool de endereços

**Sintoma:** Os clientes se conectam à VPN, mas não conseguem acessar recursos na VNet.

**Causa raiz:** O pool de endereços P2S (172.16.201.0/24) se sobrepõe a uma sub-rede local ou outro espaço de endereço de VNet.

**Correção:** Escolha um pool de endereços P2S que não se sobreponha a nenhuma rede conectada:

```bash
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --address-prefixes "192.168.100.0/24"
```

### Cenário 2: Cliente macOS não consegue conectar (tipo de túnel incorreto)

**Sintoma:** Usuários de macOS relatam falhas de conexão. O gateway está configurado apenas com SSTP.

**Causa raiz:** SSTP é exclusivo para Windows. O macOS requer IKEv2 ou OpenVPN.

**Correção:** Adicione IKEv2 ou OpenVPN à configuração do gateway:

```bash
az network vnet-gateway update \
  --resource-group $RG \
  --name $GW_NAME \
  --client-protocol OpenVPN IkeV2
```

### Cenário 3: Pacote de configuração de cliente desatualizado

**Sintoma:** O cliente se conecta com configurações antigas após a reconfiguração do gateway.

**Causa raiz:** O cliente está usando um perfil VPN gerado antes da atualização do gateway.

**Correção:** Regenere a configuração do cliente VPN e redistribua:

```bash
az network vnet-gateway vpn-client generate \
  --resource-group $RG \
  --name $GW_NAME \
  --processor-architecture Amd64
```

### Cenário 4: Cliente OpenVPN falha na porta 443

**Sintoma:** O cliente OpenVPN relata timeout ao conectar na porta 443.

**Causa raiz:** Um proxy ou firewall intermediário está interceptando o tráfego TLS e interrompendo o handshake do OpenVPN.

**Correção:** Certifique-se de que o proxy ou firewall permita conexões TLS diretas ao IP público do gateway. Considere adicionar uma exceção para o IP do gateway na configuração do proxy, ou mude para IKEv2 (UDP 500/4500) se UDP for permitido.

---

## Limpeza

```bash
# Delete the resource group and all resources within it
az group delete --name $RG --yes --no-wait
```

```powershell
# PowerShell cleanup
Remove-AzResourceGroup -Name "rg-p2s-lab" -Force -AsJob
```

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-17-q1",
    question: "Qual tipo de túnel suporta clientes Windows, macOS e Linux?",
    options: [
      "OpenVPN",
      "SSTP",
      "IKEv2",
      "L2TP"
    ],
    correctIndex: 0,
    explanation: "O OpenVPN suporta Windows, macOS, Linux, iOS e Android. O SSTP é exclusivo para Windows. O IKEv2 suporta Windows e macOS nativamente, mas requer software adicional no Linux. O L2TP não é suportado para VPN P2S do Azure."
  },
  {
    id: "az700-17-q2",
    question: "Uma empresa precisa de conectividade VPN P2S para 300 usuários remotos simultâneos. Qual é o SKU mínimo de VPN Gateway que suporta esse requisito?",
    options: [
      "Basic",
      "VpnGw1",
      "VpnGw2",
      "VpnGw3"
    ],
    correctIndex: 2,
    explanation: "O VpnGw2 suporta até 500 conexões P2S. O VpnGw1 suporta apenas 250, o que é insuficiente para 300 usuários. O Basic suporta apenas 128 conexões e é limitado ao SSTP."
  },
  {
    id: "az700-17-q3",
    question: "Qual protocolo usa a porta TCP 443 e funciona apenas no Windows?",
    options: [
      "OpenVPN",
      "IKEv2",
      "SSTP",
      "WireGuard"
    ],
    correctIndex: 2,
    explanation: "O SSTP (Secure Socket Tunneling Protocol) usa a porta TCP 443 e é suportado apenas no Windows. O OpenVPN também usa a porta 443, mas é multiplataforma. O IKEv2 usa UDP 500 e 4500."
  },
  {
    id: "az700-17-q4",
    question: "O que o comando 'az network vnet-gateway vpn-client generate' retorna?",
    options: [
      "Uma URL para baixar o arquivo ZIP de configuração do cliente VPN",
      "A configuração XML do cliente VPN inline",
      "Uma lista de clientes P2S conectados",
      "O endereço IP público do gateway"
    ],
    correctIndex: 0,
    explanation: "O comando 'az network vnet-gateway vpn-client generate' gera a configuração do cliente VPN e retorna uma URL (SAS URL) para baixar o arquivo ZIP contendo perfis de cliente para todos os protocolos configurados."
  },
  {
    id: "az700-17-q5",
    question: "Qual tipo de túnel é necessário para Always On VPN com tunelamento em nível de máquina?",
    options: [
      "OpenVPN",
      "SSTP",
      "IKEv2",
      "GRE"
    ],
    correctIndex: 2,
    explanation: "O Always On VPN com túnel de dispositivo (máquina) requer o protocolo IKEv2. O túnel de dispositivo conecta antes de qualquer usuário fazer logon e usa autenticação por certificado de máquina. O OpenVPN pode ser usado para o túnel de usuário, mas não para o túnel de dispositivo."
  },
  {
    id: "az700-17-q6",
    question: "Qual é a finalidade do Azure Network Adapter no Windows Admin Center?",
    options: [
      "Configurar VPN site-to-site entre redes on-premises",
      "Fornecer um assistente simplificado para conectar um Windows Server a uma Azure VNet via P2S",
      "Gerenciar configurações de NIC virtual do Azure em VMs",
      "Configurar peering privado do ExpressRoute"
    ],
    correctIndex: 1,
    explanation: "O Azure Network Adapter é um recurso do Windows Admin Center que simplifica a conexão de um Windows Server on-premises a uma Azure VNet usando VPN P2S. Ele automatiza a geração de certificados, configuração do gateway e configuração do cliente."
  }
]} />

---

## Recursos adicionais

- [About Azure Point-to-Site VPN](https://learn.microsoft.com/azure/vpn-gateway/point-to-site-about)
- [Configure OpenVPN for P2S VPN Gateway](https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-howto-openvpn)
- [Azure VPN Client versions](https://learn.microsoft.com/azure/vpn-gateway/azure-vpn-client-versions)
- [Azure Network Adapter overview](https://learn.microsoft.com/windows-server/manage/windows-admin-center/azure/azure-network-adapter)
