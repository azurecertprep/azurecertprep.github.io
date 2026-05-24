---
sidebar_position: 20
title: "Desafio 20: Microsoft Entra Private Access"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 20: Microsoft Entra Private Access

## Habilidades do exame cobertas

- Planejar e implementar Microsoft Entra Private Access
- Configurar segmentos de aplicação para acesso a recursos privados
- Implementar Quick Access para acesso amplo à rede
- Configurar políticas de Conditional Access para Private Access
- Implantar e gerenciar o cliente Global Secure Access
- Monitorar conexões e uso do Private Access

## Cenário

A Contoso Ltd deseja substituir sua solução VPN legada pelo Microsoft Entra Private Access para fornecer acesso de rede zero-trust (ZTNA) a aplicações internas. A empresa possui aplicações web on-premises (portal de RH em 10.0.1.10:443, sistema ERP em 10.0.2.0/24 portas 8080-8443) e compartilhamentos de arquivos (10.0.3.0/24 porta 445) que os trabalhadores remotos precisam acessar. A equipe de segurança exige políticas de acesso por aplicação com imposição de Conditional Access, eliminando o acesso amplo à rede que as VPNs fornecem. Você deve configurar o Private Access com segmentos de aplicação e políticas de Conditional Access apropriadas.

> **Nota**: O Microsoft Entra Private Access requer uma licença do Microsoft Entra Private Access (incluída no Microsoft Entra Suite ou como P1/P2 avulso). O cliente Global Secure Access deve ser implantado nos dispositivos dos usuários finais.

---

## Pré-requisitos

- Licença Microsoft Entra ID P1 ou P2
- Licença Microsoft Entra Private Access (ou Entra Suite)
- Assinatura Azure com função de Conditional Access Administrator
- Servidor de conector on-premises (ou disposição para simular)
- Azure CLI e módulo Microsoft Graph PowerShell
- Função Global Secure Access Administrator no Entra ID

---

## Tarefa 1: Habilitar o Global Secure Access e o Private Access

Ative o serviço Global Secure Access e habilite o Private Access no centro de administração do Entra.

```bash
# Note: Initial activation is typically done in the Entra admin center
# Navigate to: Entra Admin Center > Global Secure Access > Connect > Traffic forwarding

# Verify Global Secure Access is available via Microsoft Graph
az rest --method GET \
  --url "https://graph.microsoft.com/beta/networkAccess/settings/forwardingOptions" \
  --headers "Content-Type=application/json"

# Enable Private Access traffic forwarding profile
az rest --method PATCH \
  --url "https://graph.microsoft.com/beta/networkAccess/forwardingProfiles/private" \
  --headers "Content-Type=application/json" \
  --body '{"state": "enabled"}'

# Verify Private Access profile is enabled
az rest --method GET \
  --url "https://graph.microsoft.com/beta/networkAccess/forwardingProfiles" \
  --headers "Content-Type=application/json" \
  --query "value[?trafficForwardingType=='private'].{Name:name, State:state}"

# Check connector groups (private network connectors)
az rest --method GET \
  --url "https://graph.microsoft.com/beta/onPremisesPublishingProfiles/applicationProxy/connectorGroups" \
  --headers "Content-Type=application/json"
```

---

## Tarefa 2: Instalar e configurar o Private Network Connector

Implante o conector de rede privada em um servidor na rede corporativa para estabelecer conectividade.

```bash
# Download the connector (run on the connector server)
echo "=== Private Network Connector Installation ==="
echo "1. Navigate to: Entra Admin Center > Global Secure Access > Connect > Connectors"
echo "2. Click 'Download connector service'"
echo "3. Run the installer on a Windows Server in your corporate network"
echo ""
echo "Requirements for connector server:"
echo "  - Windows Server 2016 or later"
echo "  - Outbound HTTPS (443) to *.msappproxy.net"
echo "  - .NET Framework 4.7.1+"
echo "  - NOT on a domain controller (recommended)"
echo "  - Network access to target private applications"

# After installation, verify connector registration
az rest --method GET \
  --url "https://graph.microsoft.com/beta/onPremisesPublishingProfiles/applicationProxy/connectors" \
  --headers "Content-Type=application/json"

# Create a dedicated connector group for Private Access
az rest --method POST \
  --url "https://graph.microsoft.com/beta/onPremisesPublishingProfiles/applicationProxy/connectorGroups" \
  --headers "Content-Type=application/json" \
  --body '{
    "name": "Private Access - Corporate Network",
    "region": "nam"
  }'

# Get the connector group ID
CONNECTOR_GROUP_ID=$(az rest --method GET \
  --url "https://graph.microsoft.com/beta/onPremisesPublishingProfiles/applicationProxy/connectorGroups" \
  --headers "Content-Type=application/json" \
  --query "value[?name=='Private Access - Corporate Network'].id" -o tsv)

echo "Connector Group ID: $CONNECTOR_GROUP_ID"

# Assign connector to the group (replace CONNECTOR_ID)
# az rest --method POST \
#   --url "https://graph.microsoft.com/beta/onPremisesPublishingProfiles/applicationProxy/connectors/<CONNECTOR_ID>/memberOf/\$ref" \
#   --body "{\"@odata.id\":\"https://graph.microsoft.com/beta/onPremisesPublishingProfiles/applicationProxy/connectorGroups/$CONNECTOR_GROUP_ID\"}"
```

---

## Tarefa 3: Configurar segmentos de aplicação do Private Access

Crie aplicações empresariais com segmentos de aplicação específicos para controle de acesso granular.

```bash
# Create an enterprise application for the HR Portal
az rest --method POST \
  --url "https://graph.microsoft.com/beta/applications" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "Private Access - HR Portal",
    "signInAudience": "AzureADMyOrg"
  }'

# Create the Private Access app segment for HR Portal (10.0.1.10:443)
# Note: This is done through the Global Secure Access API
az rest --method POST \
  --url "https://graph.microsoft.com/beta/networkAccess/connectivity/remoteNetworks" \
  --headers "Content-Type=application/json" \
  --body '{
    "name": "HR Portal Segment"
  }' 2>/dev/null || true

# Configure application segments via the admin center or Graph API
echo "=== Application Segment Configuration ==="
echo ""
echo "HR Portal Application:"
echo "  Destination Type: IP Address"
echo "  IP: 10.0.1.10"
echo "  Ports: 443"
echo "  Protocol: TCP"
echo "  Connector Group: Private Access - Corporate Network"
echo ""
echo "ERP System Application:"
echo "  Destination Type: IP Range (CIDR)"
echo "  IP: 10.0.2.0/24"
echo "  Ports: 8080-8443"
echo "  Protocol: TCP"
echo "  Connector Group: Private Access - Corporate Network"
echo ""
echo "File Shares Application:"
echo "  Destination Type: IP Range (CIDR)"
echo "  IP: 10.0.3.0/24"
echo "  Ports: 445"
echo "  Protocol: TCP"
echo "  Connector Group: Private Access - Corporate Network"

# Using Quick Access for broader access (alternative to per-app segments)
# Quick Access provides VPN-like broad access but with Entra authentication
echo ""
echo "=== Quick Access Configuration (Alternative) ==="
echo "Quick Access CIDR ranges:"
echo "  10.0.0.0/8 (all corporate network)"
echo "  Ports: All"
echo "  Protocol: TCP, UDP"
echo ""
echo "NOTE: Per-app segments are preferred for zero-trust. Quick Access"
echo "should only be used during migration from VPN."
```

---

## Tarefa 4: Configurar políticas de Conditional Access para Private Access

Crie políticas de Conditional Access que impõem requisitos de segurança para acesso a recursos privados.

```bash
# Create a Conditional Access policy for Private Access apps
# Require compliant device + MFA for HR Portal access

# Get the HR Portal enterprise app object ID
# HR_APP_ID=$(az ad app list --display-name "Private Access - HR Portal" --query "[0].appId" -o tsv)

echo "=== Conditional Access Policy: Private Access - HR Portal ==="
echo ""
echo "Policy Configuration:"
echo "  Name: CA-PrivateAccess-HRPortal-RequireCompliance"
echo "  Users: All users (exclude break-glass accounts)"
echo "  Target resources: Private Access - HR Portal (Enterprise App)"
echo "  Conditions:"
echo "    - Any device platform"
echo "    - Any location (including trusted)"
echo "  Grant controls:"
echo "    - Require multifactor authentication"
echo "    - Require device compliance"
echo "    - Require all selected controls"
echo "  Session controls:"
echo "    - Sign-in frequency: 8 hours"

# Create CA policy via Graph API
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body '{
    "displayName": "CA-PrivateAccess-HRPortal-RequireCompliance",
    "state": "enabledForReportingButNotEnforced",
    "conditions": {
      "users": {
        "includeUsers": ["All"],
        "excludeGroups": ["<BREAK_GLASS_GROUP_ID>"]
      },
      "applications": {
        "includeApplications": ["<HR_APP_ID>"]
      },
      "clientAppTypes": ["all"]
    },
    "grantControls": {
      "operator": "AND",
      "builtInControls": ["mfa", "compliantDevice"]
    },
    "sessionControls": {
      "signInFrequency": {
        "value": 8,
        "type": "hours",
        "isEnabled": true
      }
    }
  }' 2>/dev/null || echo "Note: Replace placeholder IDs with actual values"

# Create a more restrictive policy for file share access
echo ""
echo "=== Conditional Access Policy: File Shares - Restrict to Managed Devices ==="
echo "  Additional conditions:"
echo "    - Device filter: Require Intune-managed devices only"
echo "    - Location: Allow only from named locations (corporate IPs)"
```

---

## Tarefa 5: Implantar e configurar o cliente Global Secure Access

Configure a implantação do cliente e verifique a conectividade.

```bash
# The Global Secure Access client is deployed via:
# 1. Microsoft Intune (recommended for managed devices)
# 2. Manual download from Entra admin center

echo "=== Global Secure Access Client Deployment ==="
echo ""
echo "Intune Deployment (Recommended):"
echo "  1. Navigate to Intune > Apps > Windows > Add"
echo "  2. App type: Windows app (Win32)"
echo "  3. Package: GlobalSecureAccessClient.intunewin"
echo "  4. Install command: GlobalSecureAccessClientSetup.exe /quiet"
echo "  5. Detection rule: File exists at"
echo "     C:\\Program Files\\Global Secure Access Client\\GlobalSecureAccessClient.exe"
echo "  6. Assignment: All managed devices"
echo ""
echo "Manual Deployment:"
echo "  1. Entra Admin Center > Global Secure Access > Connect > Client download"
echo "  2. Download and install on Windows 10/11 (64-bit)"
echo ""
echo "Client Requirements:"
echo "  - Windows 10/11 (64-bit), macOS, iOS, or Android"
echo "  - Device must be Entra joined or Entra hybrid joined"
echo "  - User must authenticate to Entra ID"
echo "  - Outbound HTTPS (443) to *.globalsecureaccess.microsoft.com"

# Verify client health via Graph API
az rest --method GET \
  --url "https://graph.microsoft.com/beta/networkAccess/connectivity/branches" \
  --headers "Content-Type=application/json" 2>/dev/null || true

# Check traffic forwarding profiles assigned to the tenant
az rest --method GET \
  --url "https://graph.microsoft.com/beta/networkAccess/forwardingProfiles" \
  --headers "Content-Type=application/json"
```

---

## Tarefa 6: Monitorar o uso do Private Access e solucionar problemas

Configure o monitoramento e revise os logs de conexão do Private Access.

```bash
# Query Global Secure Access logs
az rest --method GET \
  --url "https://graph.microsoft.com/beta/networkAccess/logs/traffic" \
  --headers "Content-Type=application/json" 2>/dev/null || true

# Check sign-in logs for Private Access applications
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=appDisplayName eq 'Private Access - HR Portal'&\$top=10" \
  --headers "Content-Type=application/json" 2>/dev/null || true

# Monitor connector health
az rest --method GET \
  --url "https://graph.microsoft.com/beta/onPremisesPublishingProfiles/applicationProxy/connectors" \
  --headers "Content-Type=application/json" \
  --query "value[].{Name:machineName, Status:status, Group:memberOf[0].name}"

echo ""
echo "=== Key Monitoring Points ==="
echo "1. Connector Health:"
echo "   - Entra Admin Center > Global Secure Access > Connect > Connectors"
echo "   - Check for 'Active' status on all connectors"
echo ""
echo "2. Traffic Logs:"
echo "   - Global Secure Access > Monitor > Traffic logs"
echo "   - Filter by 'Private access' traffic type"
echo "   - Check for blocked/failed connections"
echo ""
echo "3. Sign-in Logs:"
echo "   - Entra Admin Center > Monitoring > Sign-in logs"
echo "   - Filter by Private Access enterprise apps"
echo "   - Review Conditional Access policy evaluation"
echo ""
echo "4. Network Diagnostics:"
echo "   - On client: Run 'Global Secure Access Client > Advanced diagnostics'"
echo "   - Check tunnel status, DNS resolution, routing"
```

---

## Quebra & conserta

### Cenário 1: Usuários não conseguem acessar aplicações privadas — conector offline

Usuários remotos relatam que não conseguem acessar o Portal de RH. O cliente Global Secure Access mostra "Connected" mas as conexões com 10.0.1.10:443 ficam sem resposta (timeout).

<details>
<summary>Mostrar solução</summary>

```bash
# Check connector status
az rest --method GET \
  --url "https://graph.microsoft.com/beta/onPremisesPublishingProfiles/applicationProxy/connectors" \
  --headers "Content-Type=application/json" \
  --query "value[].{Name:machineName, Status:status}"

# If connector shows "Inactive":
echo "Troubleshooting steps:"
echo "1. Verify the connector server is running"
echo "2. Check the 'Microsoft AAD Application Proxy Connector' service"
echo "3. Verify outbound HTTPS (443) to *.msappproxy.net is not blocked"
echo "4. Check connector server can reach 10.0.1.10:443 locally"
echo "5. Restart the connector service:"
echo "   net stop 'Microsoft AAD Application Proxy Connector'"
echo "   net start 'Microsoft AAD Application Proxy Connector'"
echo ""
echo "6. If multiple connectors, ensure the connector group has healthy members"
echo "7. Verify the application segment points to the correct connector group"
```

</details>

### Cenário 2: Conditional Access bloqueia todas as conexões do Private Access

Após implantar uma nova política de Conditional Access, todos os usuários (incluindo administradores) são bloqueados de acessar qualquer aplicação do Private Access.

<details>
<summary>Mostrar solução</summary>

```bash
# Check Conditional Access policies targeting Private Access
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --query "value[?contains(displayName, 'PrivateAccess')].{Name:displayName, State:state}"

# The issue is likely a policy requiring device compliance when
# devices haven't been enrolled or compliance policies aren't configured.

# Fix 1: Set policy to report-only mode while troubleshooting
# az rest --method PATCH \
#   --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/<POLICY_ID>" \
#   --headers "Content-Type=application/json" \
#   --body '{"state": "enabledForReportingButNotEnforced"}'

# Fix 2: Ensure break-glass accounts are excluded
# Fix 3: Change grant controls from AND to OR (MFA OR compliant device)

echo "Resolution steps:"
echo "1. Switch overly restrictive policies to 'Report-only' mode"
echo "2. Verify break-glass accounts are excluded from all CA policies"
echo "3. Check if grant controls use AND vs OR operator"
echo "4. Verify Intune compliance policies are configured and devices are compliant"
echo "5. Use CA 'What If' tool to simulate user access"
```

</details>

### Cenário 3: Resolução DNS falha para hostnames internos

Usuários com o cliente Global Secure Access instalado não conseguem resolver hostnames internos (ex.: hrportal.contoso.internal) mesmo que o acesso baseado em IP funcione.

<details>
<summary>Mostrar solução</summary>

```bash
# Private Access application segments are IP-based by default.
# DNS resolution for private hostnames requires additional configuration.

echo "Resolution steps:"
echo ""
echo "1. Add FQDN-based application segments:"
echo "   - Destination Type: FQDN"
echo "   - FQDN: hrportal.contoso.internal"
echo "   - Ports: 443"
echo "   - This routes DNS queries through the private connector"
echo ""
echo "2. Alternatively, configure DNS suffixes in the traffic forwarding profile:"
echo "   - Add 'contoso.internal' as a private DNS suffix"
echo "   - The GSA client will route DNS queries for this suffix through Private Access"
echo ""
echo "3. Verify the connector server can resolve the FQDN:"
echo "   nslookup hrportal.contoso.internal (on connector server)"
echo ""
echo "4. Ensure the Private Access traffic forwarding profile includes DNS traffic"
```

</details>

---

## Verificação de Conhecimento

<KnowledgeCheck questions={[
  {
    question: "Qual é a principal vantagem de segurança do Microsoft Entra Private Access em relação ao VPN tradicional?",
    options: [
      "Ele fornece maior throughput de rede",
      "Ele permite acesso por aplicação com Conditional Access baseado em identidade em vez de acesso amplo à rede",
      "Ele elimina a necessidade de criptografia",
      "Ele funciona sem nenhum software cliente"
    ],
    correctIndex: 1,
    explanation: "O Microsoft Entra Private Access fornece Acesso de Rede Zero Trust (ZTNA) concedendo acesso por aplicação baseado em identidade e políticas de Conditional Access, em vez do acesso amplo em nível de rede que o VPN fornece. Os usuários acessam apenas as aplicações específicas para as quais estão autorizados."
  },
  {
    question: "Qual é o papel do Private Network Connector no Microsoft Entra Private Access?",
    options: [
      "Ele criptografa o tráfego entre o dispositivo do usuário e a nuvem da Microsoft",
      "Ele atua como um proxy reverso na rede corporativa, estabelecendo conexões de saída para encaminhar tráfego às aplicações privadas",
      "Ele gerencia tokens de autenticação do usuário",
      "Ele atribui endereços IP aos usuários remotos"
    ],
    correctIndex: 1,
    explanation: "O Private Network Connector é instalado em um servidor na rede corporativa e estabelece conexões de saída para a nuvem da Microsoft. Ele encaminha tráfego autorizado para aplicações privadas, eliminando a necessidade de regras de firewall de entrada ou exposição de aplicações à internet."
  },
  {
    question: "Qual é a diferença entre 'Quick Access' e segmentos de aplicação por aplicativo no Microsoft Entra Private Access?",
    options: [
      "Quick Access é mais rápido mas menos seguro; segmentos por aplicativo são mais lentos mas mais seguros",
      "Quick Access fornece acesso amplo à rede para faixas de IP (como VPN), enquanto segmentos por aplicativo fornecem acesso granular a aplicações específicas",
      "Quick Access funciona sem conectores; segmentos por aplicativo requerem conectores",
      "Não há diferença; eles são o mesmo recurso"
    ],
    correctIndex: 1,
    explanation: "O Quick Access fornece acesso amplo a faixas de IP e portas, similar ao VPN (útil durante migração de VPN para ZTNA). Os segmentos de aplicação por aplicativo fornecem acesso granular e zero-trust a aplicações específicas com políticas individuais de Conditional Access. O acesso por aplicativo é a abordagem recomendada a longo prazo."
  },
  {
    question: "Qual requisito de dispositivo deve ser atendido para que o cliente Global Secure Access funcione com o Private Access?",
    options: [
      "O dispositivo deve ser domain-joined apenas ao Active Directory on-premises",
      "O dispositivo deve ser Microsoft Entra joined ou Microsoft Entra hybrid joined",
      "O dispositivo deve ter um cliente VPN já instalado",
      "O dispositivo deve executar Windows Server 2019 ou superior"
    ],
    correctIndex: 1,
    explanation: "O cliente Global Secure Access requer que o dispositivo seja Microsoft Entra joined ou Microsoft Entra hybrid joined. Isso garante que a identidade do dispositivo seja conhecida pelo Entra ID, habilitando políticas de Conditional Access baseadas em dispositivo e estabelecimento seguro do túnel."
  }
]} />

## Limpeza

```bash
# Remove Conditional Access policies (report-only first, then delete)
echo "Manual cleanup required in Entra Admin Center:"
echo "1. Delete Conditional Access policies created for Private Access"
echo "2. Delete enterprise applications (Private Access apps)"
echo "3. Remove application segments from Global Secure Access"
echo "4. Uninstall Global Secure Access client from test devices"
echo "5. Uninstall Private Network Connector from connector server"
echo ""
echo "Disable Private Access traffic forwarding:"

az rest --method PATCH \
  --url "https://graph.microsoft.com/beta/networkAccess/forwardingProfiles/private" \
  --headers "Content-Type=application/json" \
  --body '{"state": "disabled"}' 2>/dev/null || true
```
