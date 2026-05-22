---
sidebar_position: 4
title: "Challenge 28: Application Gateway fundamentals"
sidebar_label: "Challenge 28"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 28: Application Gateway fundamentals

:::info Estimated time and cost

**60-90 minutes** | **~$0.27/h (WAF_v2 SKU)** | **Exam weight: 15-20%**

:::

:::warning Cost alert
Application Gateway v2 is billed per hour even when idle. The WAF_v2 SKU costs approximately $0.443/gateway-hour plus $0.0144/capacity-unit-hour. Delete the gateway immediately after completing this challenge to avoid unexpected charges.
:::

## Scenario

You are the network engineer for Contoso SaaS, a company that hosts multiple web applications behind a single Application Gateway. The platform serves two distinct customer brands:

- **contoso.com** - Main corporate site with a marketing frontend and an API backend under `/api/*`
- **fabrikam.com** - Partner portal with a static documentation site and a webhook endpoint under `/hooks/*`

Your task is to deploy an Application Gateway v2 instance with multi-site listeners, dedicated backend pools for each application, and path-based routing rules that direct traffic to the correct backend based on the URL path.

## Architecture overview

```
Internet
   |
   v
[Public IP] --> [Application Gateway v2]
                     |
         +-----------+-----------+
         |                       |
   [Listener:                [Listener:
    contoso.com]              fabrikam.com]
         |                       |
    [Path Map]              [Path Map]
    /api/* -> API Pool      /hooks/* -> Hooks Pool
    /*    -> Web Pool       /*      -> Docs Pool
```

## Prerequisites

- Azure subscription with Contributor access
- Azure CLI 2.50+ or Azure PowerShell Az module 10.0+
- A virtual network with a dedicated subnet for Application Gateway (minimum /24 recommended)

---

## Task 1: Create the network infrastructure

Application Gateway requires a dedicated subnet with no other resources deployed in it. The subnet name does not need to be "AppGwSubnet" but this is the common convention.

### Azure CLI

```bash
# Create resource group
az group create \
  --name rg-appgw-lab \
  --location eastus2

# Create virtual network with Application Gateway subnet
az network vnet create \
  --resource-group rg-appgw-lab \
  --name vnet-appgw \
  --address-prefixes 10.0.0.0/16 \
  --subnet-name AppGwSubnet \
  --subnet-prefixes 10.0.0.0/24

# Create backend subnet for VMs or App Services
az network vnet subnet create \
  --resource-group rg-appgw-lab \
  --vnet-name vnet-appgw \
  --name BackendSubnet \
  --address-prefixes 10.0.1.0/24

# Create public IP (Standard SKU, static allocation required for v2)
az network public-ip create \
  --resource-group rg-appgw-lab \
  --name pip-appgw \
  --sku Standard \
  --allocation-method Static \
  --zone 1 2 3
```

### Azure PowerShell

```powershell
# Create resource group
New-AzResourceGroup -Name "rg-appgw-lab" -Location "eastus2"

# Create subnet configurations
$appgwSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "AppGwSubnet" `
  -AddressPrefix "10.0.0.0/24"

$backendSubnet = New-AzVirtualNetworkSubnetConfig `
  -Name "BackendSubnet" `
  -AddressPrefix "10.0.1.0/24"

# Create virtual network
$vnet = New-AzVirtualNetwork `
  -ResourceGroupName "rg-appgw-lab" `
  -Name "vnet-appgw" `
  -Location "eastus2" `
  -AddressPrefix "10.0.0.0/16" `
  -Subnet $appgwSubnet, $backendSubnet

# Create public IP
$pip = New-AzPublicIpAddress `
  -ResourceGroupName "rg-appgw-lab" `
  -Name "pip-appgw" `
  -Location "eastus2" `
  -Sku Standard `
  -AllocationMethod Static `
  -Zone 1, 2, 3
```

### Portal

1. Navigate to **Create a resource** and search for **Application Gateway**
2. On the **Basics** tab, select your subscription and resource group
3. Under **Instance details**, provide a name and select region
4. Under **Virtual network**, create a new VNet with the address space 10.0.0.0/16
5. Create a dedicated subnet named AppGwSubnet with prefix 10.0.0.0/24

---

## Task 2: Deploy the Application Gateway

### Azure CLI

```bash
# Create Application Gateway with WAF_v2 SKU
az network application-gateway create \
  --resource-group rg-appgw-lab \
  --name appgw-multisite \
  --location eastus2 \
  --sku WAF_v2 \
  --capacity 2 \
  --vnet-name vnet-appgw \
  --subnet AppGwSubnet \
  --public-ip-address pip-appgw \
  --frontend-port 80 \
  --http-settings-port 80 \
  --http-settings-protocol Http \
  --priority 100
```

### Azure PowerShell

```powershell
# Get subnet and IP references
$vnet = Get-AzVirtualNetwork -ResourceGroupName "rg-appgw-lab" -Name "vnet-appgw"
$subnet = Get-AzVirtualNetworkSubnetConfig -Name "AppGwSubnet" -VirtualNetwork $vnet
$pip = Get-AzPublicIpAddress -ResourceGroupName "rg-appgw-lab" -Name "pip-appgw"

# Create gateway IP configuration
$gipconfig = New-AzApplicationGatewayIPConfiguration `
  -Name "appGwIPConfig" `
  -Subnet $subnet

# Create frontend IP configuration
$fipconfig = New-AzApplicationGatewayFrontendIPConfig `
  -Name "appGwFrontendIP" `
  -PublicIPAddress $pip

# Create frontend port
$frontendPort = New-AzApplicationGatewayFrontendPort `
  -Name "frontendPort80" `
  -Port 80

# Create default backend pool
$defaultPool = New-AzApplicationGatewayBackendAddressPool `
  -Name "defaultPool"

# Create default HTTP settings
$defaultSettings = New-AzApplicationGatewayBackendHttpSetting `
  -Name "defaultHttpSettings" `
  -Port 80 `
  -Protocol Http `
  -RequestTimeout 30

# Create default listener
$defaultListener = New-AzApplicationGatewayHttpListener `
  -Name "defaultListener" `
  -Protocol Http `
  -FrontendIPConfiguration $fipconfig `
  -FrontendPort $frontendPort

# Create default routing rule
$defaultRule = New-AzApplicationGatewayRequestRoutingRule `
  -Name "defaultRule" `
  -RuleType Basic `
  -Priority 100 `
  -HttpListener $defaultListener `
  -BackendAddressPool $defaultPool `
  -BackendHttpSettings $defaultSettings

# Create SKU
$sku = New-AzApplicationGatewaySku -Name WAF_v2 -Tier WAF_v2 -Capacity 2

# Create the Application Gateway
New-AzApplicationGateway `
  -ResourceGroupName "rg-appgw-lab" `
  -Name "appgw-multisite" `
  -Location "eastus2" `
  -Sku $sku `
  -GatewayIpConfigurations $gipconfig `
  -FrontendIpConfigurations $fipconfig `
  -FrontendPorts $frontendPort `
  -BackendAddressPools $defaultPool `
  -BackendHttpSettingsCollection $defaultSettings `
  -HttpListeners $defaultListener `
  -RequestRoutingRules $defaultRule
```

---

## Task 3: Configure multi-site listeners

Multi-site listeners use the `--host-name` parameter to match incoming requests based on the Host header. Each listener binds to the same frontend IP and port but routes to different backends based on the hostname.

### Azure CLI

```bash
# Create named frontend port
az network application-gateway frontend-port create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name frontendPort80 \
  --port 80

# Create frontend port for HTTPS (if needed later)
az network application-gateway frontend-port create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name port443 \
  --port 443

# Create listener for contoso.com
az network application-gateway http-listener create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name listener-contoso \
  --frontend-port frontendPort80 \
  --host-name "contoso.com"

# Create listener for fabrikam.com
az network application-gateway http-listener create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name listener-fabrikam \
  --frontend-port frontendPort80 \
  --host-name "fabrikam.com"
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-lab" -Name "appgw-multisite"
$fipconfig = Get-AzApplicationGatewayFrontendIPConfig -ApplicationGateway $appgw -Name "appGwFrontendIP"
$fp80 = Get-AzApplicationGatewayFrontendPort -ApplicationGateway $appgw -Name "frontendPort80"

# Add listener for contoso.com
$appgw = Add-AzApplicationGatewayHttpListener `
  -ApplicationGateway $appgw `
  -Name "listener-contoso" `
  -Protocol Http `
  -FrontendIPConfiguration $fipconfig `
  -FrontendPort $fp80 `
  -HostName "contoso.com"

# Add listener for fabrikam.com
$appgw = Add-AzApplicationGatewayHttpListener `
  -ApplicationGateway $appgw `
  -Name "listener-fabrikam" `
  -Protocol Http `
  -FrontendIPConfiguration $fipconfig `
  -FrontendPort $fp80 `
  -HostName "fabrikam.com"

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

---

## Task 4: Create backend pools

Each application component gets its own backend pool. Backend pools can contain IP addresses, FQDNs, Virtual Machine Scale Sets, or App Services.

### Azure CLI

```bash
# Backend pool for Contoso web frontend
az network application-gateway address-pool create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name pool-contoso-web \
  --servers 10.0.1.4 10.0.1.5

# Backend pool for Contoso API
az network application-gateway address-pool create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name pool-contoso-api \
  --servers 10.0.1.6 10.0.1.7

# Backend pool for Fabrikam docs
az network application-gateway address-pool create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name pool-fabrikam-docs \
  --servers 10.0.1.8

# Backend pool for Fabrikam webhooks
az network application-gateway address-pool create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name pool-fabrikam-hooks \
  --servers 10.0.1.9
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-lab" -Name "appgw-multisite"

$appgw = Add-AzApplicationGatewayBackendAddressPool `
  -ApplicationGateway $appgw `
  -Name "pool-contoso-web" `
  -BackendIPAddresses "10.0.1.4", "10.0.1.5"

$appgw = Add-AzApplicationGatewayBackendAddressPool `
  -ApplicationGateway $appgw `
  -Name "pool-contoso-api" `
  -BackendIPAddresses "10.0.1.6", "10.0.1.7"

$appgw = Add-AzApplicationGatewayBackendAddressPool `
  -ApplicationGateway $appgw `
  -Name "pool-fabrikam-docs" `
  -BackendIPAddresses "10.0.1.8"

$appgw = Add-AzApplicationGatewayBackendAddressPool `
  -ApplicationGateway $appgw `
  -Name "pool-fabrikam-hooks" `
  -BackendIPAddresses "10.0.1.9"

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

---

## Task 5: Configure HTTP settings with custom probe

HTTP settings define how Application Gateway communicates with backend servers. A custom health probe allows you to specify a path, match conditions, and interval.

### Azure CLI

```bash
# Create custom health probe for the API backend
az network application-gateway probe create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name probe-api-health \
  --protocol Http \
  --host "localhost" \
  --path "/health" \
  --interval 30 \
  --timeout 30 \
  --threshold 3 \
  --match-status-codes "200-399" \
  --match-body "healthy"

# Create HTTP settings for web frontends (port 80)
az network application-gateway http-settings create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name settings-web \
  --port 80 \
  --protocol Http \
  --cookie-based-affinity Disabled \
  --timeout 30

# Create HTTP settings for API backends (port 8080 with custom probe)
az network application-gateway http-settings create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name settings-api \
  --port 8080 \
  --protocol Http \
  --cookie-based-affinity Disabled \
  --timeout 60 \
  --probe probe-api-health
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-lab" -Name "appgw-multisite"

# Create health probe match condition
$match = New-AzApplicationGatewayProbeHealthResponseMatch `
  -StatusCode "200-399" `
  -Body "healthy"

# Add custom probe
$appgw = Add-AzApplicationGatewayProbeConfig `
  -ApplicationGateway $appgw `
  -Name "probe-api-health" `
  -Protocol Http `
  -HostName "localhost" `
  -Path "/health" `
  -Interval 30 `
  -Timeout 30 `
  -UnhealthyThreshold 3 `
  -Match $match

# Add HTTP settings for web
$appgw = Add-AzApplicationGatewayBackendHttpSetting `
  -ApplicationGateway $appgw `
  -Name "settings-web" `
  -Port 80 `
  -Protocol Http `
  -CookieBasedAffinity Disabled `
  -RequestTimeout 30

# Add HTTP settings for API with probe
$probe = Get-AzApplicationGatewayProbeConfig -ApplicationGateway $appgw -Name "probe-api-health"
$appgw = Add-AzApplicationGatewayBackendHttpSetting `
  -ApplicationGateway $appgw `
  -Name "settings-api" `
  -Port 8080 `
  -Protocol Http `
  -CookieBasedAffinity Disabled `
  -RequestTimeout 60 `
  -Probe $probe

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

---

## Task 6: Create path-based routing rules

Path-based routing uses URL path maps to direct requests to different backend pools based on the URL path pattern.

### Azure CLI

```bash
# Create URL path map for contoso.com
az network application-gateway url-path-map create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name pathmap-contoso \
  --paths "/api/*" \
  --address-pool pool-contoso-api \
  --http-settings settings-api \
  --default-address-pool pool-contoso-web \
  --default-http-settings settings-web

# Create URL path map for fabrikam.com
az network application-gateway url-path-map create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name pathmap-fabrikam \
  --paths "/hooks/*" \
  --address-pool pool-fabrikam-hooks \
  --http-settings settings-api \
  --default-address-pool pool-fabrikam-docs \
  --default-http-settings settings-web

# Create path-based routing rule for contoso.com
az network application-gateway rule create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name rule-contoso \
  --rule-type PathBasedRouting \
  --priority 200 \
  --http-listener listener-contoso \
  --url-path-map pathmap-contoso

# Create path-based routing rule for fabrikam.com
az network application-gateway rule create \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name rule-fabrikam \
  --rule-type PathBasedRouting \
  --priority 300 \
  --http-listener listener-fabrikam \
  --url-path-map pathmap-fabrikam
```

### Azure PowerShell

```powershell
$appgw = Get-AzApplicationGateway -ResourceGroupName "rg-appgw-lab" -Name "appgw-multisite"

$poolContosoWeb = Get-AzApplicationGatewayBackendAddressPool -ApplicationGateway $appgw -Name "pool-contoso-web"
$poolContosoApi = Get-AzApplicationGatewayBackendAddressPool -ApplicationGateway $appgw -Name "pool-contoso-api"
$poolFabrikamDocs = Get-AzApplicationGatewayBackendAddressPool -ApplicationGateway $appgw -Name "pool-fabrikam-docs"
$poolFabrikamHooks = Get-AzApplicationGatewayBackendAddressPool -ApplicationGateway $appgw -Name "pool-fabrikam-hooks"
$settingsWeb = Get-AzApplicationGatewayBackendHttpSetting -ApplicationGateway $appgw -Name "settings-web"
$settingsApi = Get-AzApplicationGatewayBackendHttpSetting -ApplicationGateway $appgw -Name "settings-api"

# Create path rule for Contoso API
$apiPathRule = New-AzApplicationGatewayPathRuleConfig `
  -Name "contoso-api-rule" `
  -Paths "/api/*" `
  -BackendAddressPool $poolContosoApi `
  -BackendHttpSettings $settingsApi

# Create URL path map for Contoso
$appgw = Add-AzApplicationGatewayUrlPathMapConfig `
  -ApplicationGateway $appgw `
  -Name "pathmap-contoso" `
  -PathRules $apiPathRule `
  -DefaultBackendAddressPool $poolContosoWeb `
  -DefaultBackendHttpSettings $settingsWeb

# Create path rule for Fabrikam hooks
$hooksPathRule = New-AzApplicationGatewayPathRuleConfig `
  -Name "fabrikam-hooks-rule" `
  -Paths "/hooks/*" `
  -BackendAddressPool $poolFabrikamHooks `
  -BackendHttpSettings $settingsApi

# Create URL path map for Fabrikam
$appgw = Add-AzApplicationGatewayUrlPathMapConfig `
  -ApplicationGateway $appgw `
  -Name "pathmap-fabrikam" `
  -PathRules $hooksPathRule `
  -DefaultBackendAddressPool $poolFabrikamDocs `
  -DefaultBackendHttpSettings $settingsWeb

$appgw = Set-AzApplicationGateway -ApplicationGateway $appgw
```

---

## Task 7: Verify backend health

### Azure CLI

```bash
# Check backend health status
az network application-gateway show-backend-health \
  --resource-group rg-appgw-lab \
  --name appgw-multisite \
  --output table
```

### Azure PowerShell

```powershell
Get-AzApplicationGatewayBackendHealth `
  -ResourceGroupName "rg-appgw-lab" `
  -Name "appgw-multisite"
```

### Portal

1. Navigate to your Application Gateway resource
2. Select **Backend health** in the left menu under **Monitoring**
3. Review the health status of each backend pool and individual servers
4. A healthy server shows status code 200 and "Healthy" status

---

## Break and fix exercises

### Issue 1: Multi-site listener conflict (missing host header)

**Symptom**: Requests to fabrikam.com are unexpectedly routed to the contoso.com backend pools.

**Root cause**: The fabrikam.com listener was created without the `--host-name` parameter, making it a basic listener that catches all unmatched traffic. When two listeners share the same frontend IP and port without distinct host headers, the routing priority determines which listener receives traffic.

**Fix**: Update the listener to include the correct host name:

```bash
az network application-gateway http-listener update \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name listener-fabrikam \
  --host-name "fabrikam.com"
```

### Issue 2: Path map not matching

**Symptom**: Requests to `contoso.com/api/users` are routed to the default web pool instead of the API pool.

**Root cause**: The path rule was configured as `/api` instead of `/api/*`. Without the wildcard, only exact matches to `/api` will route to the API pool. Subpaths like `/api/users` fall through to the default backend.

**Fix**: Update the URL path map rule to include the wildcard:

```bash
az network application-gateway url-path-map update \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name pathmap-contoso \
  --default-address-pool pool-contoso-web \
  --default-http-settings settings-web
```

Then recreate the path rule with the correct wildcard pattern `/api/*`.

### Issue 3: Backend pool using wrong port

**Symptom**: Backend health shows all servers as unhealthy with connection timeout errors.

**Root cause**: The HTTP settings for the API backend are configured to probe on port 8080, but the backend servers only listen on port 80. The health probe cannot establish a connection because nothing is listening on the target port.

**Fix**: Update the HTTP settings to use the correct port:

```bash
az network application-gateway http-settings update \
  --resource-group rg-appgw-lab \
  --gateway-name appgw-multisite \
  --name settings-api \
  --port 80
```

---

## Knowledge check

<KnowledgeCheck questions={[{id:"q1", question:"What is the minimum recommended subnet size for an Application Gateway v2 deployment?", options:["/28 (16 addresses)","/26 (64 addresses)","/24 (256 addresses) \u2705","/29 (8 addresses)"], correctIndex:2, explanation:"Microsoft recommends a /24 subnet for Application Gateway v2. While the minimum supported size is /26, a /24 provides room for scaling instances and future growth."},{id:"q2", question:"In a multi-site configuration, what determines which listener receives an incoming request?", options:["The routing rule priority number","The Host header in the HTTP request \u2705","The source IP address of the client","The order listeners were created"], correctIndex:1, explanation:"Multi-site listeners match incoming requests based on the Host header value. Each listener specifies a host-name parameter that is compared against the Host header to determine routing."},{id:"q3", question:"What happens when a request URL does not match any path rule in a URL path map?", options:["The request is rejected with 404","The request is sent to the default backend pool \u2705","The request is forwarded to the first path rule","The gateway returns 502 Bad Gateway"], correctIndex:1, explanation:"When no path rule matches the incoming URL, Application Gateway routes the request to the default backend address pool and default HTTP settings configured in the URL path map."},{id:"q4", question:"Which routing rule type must be used with URL path maps?", options:["Basic","PathBasedRouting \u2705","MultiSite","WeightedRouting"], correctIndex:1, explanation:"The PathBasedRouting rule type must be specified when associating a routing rule with a URL path map. Basic rules cannot reference URL path maps."},{id:"q5", question:"What is the effect of setting --priority on Application Gateway routing rules?", options:["It determines the order TLS certificates are evaluated","It sets the weight for load balancing across backends","It determines evaluation order when multiple rules could match \u2705","It controls which backend pool receives the most traffic"], correctIndex:2, explanation:"The priority value (1-20000, lower number = higher priority) determines the order in which routing rules are evaluated when multiple rules could potentially match an incoming request."},{id:"q6", question:"A health probe is configured with --match-body 'OK' and the backend returns 'Server OK Ready'. What is the health status?", options:["Healthy, because the response body contains the match string \u2705","Unhealthy, because the response body does not exactly equal the match string","Unhealthy, because extra text after the match string is not allowed","Unknown, because body matching requires an exact regex pattern"], correctIndex:0, explanation:"The match-body parameter checks if the response body CONTAINS the specified string. Since 'Server OK Ready' contains 'OK', the probe is considered healthy."}]} />

---

## Cleanup

```bash
# Delete the entire resource group and all resources within it
az group delete --name rg-appgw-lab --yes --no-wait
```

```powershell
Remove-AzResourceGroup -Name "rg-appgw-lab" -Force
```

:::warning
Application Gateway v2 charges approximately $0.27/hour while deployed. Always delete your lab resources immediately after completing the exercises to avoid unnecessary costs.
:::

---

## Key takeaways

- Application Gateway requires a **dedicated subnet** with no other resources; /24 is the recommended size
- Multi-site listeners differentiate traffic using the **Host header** value in incoming requests
- Path-based routing rules use **URL path maps** to direct requests to different backend pools based on the URL path
- Path patterns must include **wildcards** (e.g., `/api/*`) to match subpaths; exact paths only match the literal string
- Custom health probes support **match conditions** for both status codes and response body content
- Routing rules require a **priority** value; lower numbers are evaluated first
- Each listener can only be associated with **one routing rule**
