---
sidebar_position: 20
title: "Challenge 20: Microsoft Entra Private Access"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 20: Microsoft Entra Private Access

## Exam skills covered

- Plan and implement Microsoft Entra Private Access
- Configure application segments for private resource access
- Implement Quick Access for broad network access
- Configure Conditional Access policies for Private Access
- Deploy and manage the Global Secure Access client
- Monitor Private Access connections and usage

## Scenario

Contoso Ltd wants to replace their legacy VPN solution with Microsoft Entra Private Access to provide zero-trust network access (ZTNA) to internal applications. The company has on-premises web applications (HR portal on 10.0.1.10:443, ERP system on 10.0.2.0/24 ports 8080-8443), and file shares (10.0.3.0/24 port 445) that remote workers need to access. The security team requires per-app access policies with Conditional Access enforcement, eliminating the broad network access that VPNs provide. You must configure Private Access with application segments and appropriate Conditional Access policies.

> **Note**: Microsoft Entra Private Access requires a Microsoft Entra Private Access license (included in Microsoft Entra Suite or as standalone P1/P2). The Global Secure Access client must be deployed to end-user devices.

---

## Prerequisites

- Microsoft Entra ID P1 or P2 license
- Microsoft Entra Private Access license (or Entra Suite)
- Azure subscription with Conditional Access Administrator role
- On-premises connector server (or willingness to simulate)
- Azure CLI and Microsoft Graph PowerShell module
- Global Secure Access Administrator role in Entra ID

---

## Task 1: Enable Global Secure Access and Private Access

Activate the Global Secure Access service and enable Private Access in the Entra admin center.

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

## Task 2: Install and configure Private Network Connector

Deploy the private network connector on a server in the corporate network to establish connectivity.

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

## Task 3: Configure Private Access application segments

Create enterprise applications with specific application segments for granular access control.

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

## Task 4: Configure Conditional Access policies for Private Access

Create Conditional Access policies that enforce security requirements for private resource access.

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

## Task 5: Deploy and configure the Global Secure Access client

Configure client deployment and verify connectivity.

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

## Task 6: Monitor Private Access usage and troubleshoot

Configure monitoring and review connection logs for Private Access.

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

## Break & Fix

### Scenario 1: Users cannot access private applications — connector offline

Remote users report they cannot access the HR Portal. The Global Secure Access client shows "Connected" but connections to 10.0.1.10:443 time out.

<details>
<summary>Show solution</summary>

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

### Scenario 2: Conditional Access blocks all Private Access connections

After deploying a new Conditional Access policy, all users (including admins) are blocked from accessing any Private Access applications.

<details>
<summary>Show solution</summary>

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

### Scenario 3: DNS resolution fails for internal hostnames

Users with the Global Secure Access client installed cannot resolve internal hostnames (e.g., hrportal.contoso.internal) even though IP-based access works.

<details>
<summary>Show solution</summary>

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

## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "What is the primary security advantage of Microsoft Entra Private Access over traditional VPN?",
    options: [
      "It provides faster network throughput",
      "It enables per-application access with identity-based Conditional Access instead of broad network access",
      "It eliminates the need for encryption",
      "It works without any client software"
    ],
    correctIndex: 1,
    explanation: "Microsoft Entra Private Access provides Zero Trust Network Access (ZTNA) by granting per-application access based on identity and Conditional Access policies, instead of the broad network-level access that VPN provides. Users only access the specific applications they're authorized for."
  },
  {
    question: "What role does the Private Network Connector play in Microsoft Entra Private Access?",
    options: [
      "It encrypts traffic between the user's device and Microsoft's cloud",
      "It acts as a reverse proxy in the corporate network, establishing outbound connections to relay traffic to private applications",
      "It manages user authentication tokens",
      "It assigns IP addresses to remote users"
    ],
    correctIndex: 1,
    explanation: "The Private Network Connector is installed on a server in the corporate network and establishes outbound connections to Microsoft's cloud. It relays authorized traffic to private applications, eliminating the need for inbound firewall rules or exposing applications to the internet."
  },
  {
    question: "What is the difference between 'Quick Access' and per-app application segments in Microsoft Entra Private Access?",
    options: [
      "Quick Access is faster but less secure; per-app segments are slower but more secure",
      "Quick Access provides broad network access to IP ranges (like VPN), while per-app segments provide granular access to specific applications",
      "Quick Access works without connectors; per-app requires connectors",
      "There is no difference; they are the same feature"
    ],
    correctIndex: 1,
    explanation: "Quick Access provides broad access to IP ranges and ports, similar to VPN (useful during VPN-to-ZTNA migration). Per-app application segments provide granular, zero-trust access to specific applications with individual Conditional Access policies. Per-app is the recommended long-term approach."
  },
  {
    question: "Which device requirement must be met for the Global Secure Access client to function with Private Access?",
    options: [
      "The device must be domain-joined to on-premises Active Directory only",
      "The device must be Microsoft Entra joined or Microsoft Entra hybrid joined",
      "The device must have a VPN client already installed",
      "The device must run Windows Server 2019 or later"
    ],
    correctIndex: 1,
    explanation: "The Global Secure Access client requires the device to be Microsoft Entra joined or Microsoft Entra hybrid joined. This ensures the device identity is known to Entra ID, enabling device-based Conditional Access policies and secure tunnel establishment."
  }
]} />

## Cleanup

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
