---
sidebar_position: 3
title: "Challenge 13: DNS & Load Balancing"
---

# Challenge 13: DNS & Load Balancing

| | |
|---|---|
| **Estimated Time** | 60 minutes |
| **Cost Estimate** | ~$0.20 |
| **Exam Weight** | 15–20% |

## Scenario

Contoso's web application needs DNS resolution and load balancing for high availability. The operations team wants to move away from on-prem DNS servers and hardware load balancers to Azure-native services. Your job is to configure Azure DNS for name resolution and Azure Load Balancer to distribute traffic across multiple VMs.

## Exam Skills Covered

- Configure Azure DNS
- Configure internal and public load balancer
- Troubleshoot load balancing

## Sysadmin ↔ Azure Reference

| On-Prem / Traditional | Azure Equivalent |
|---|---|
| BIND / Windows DNS Server | Azure DNS |
| F5 / HAProxy | Azure Load Balancer |
| DNS zone files | Azure DNS zone records |
| Hardware load balancer VIP | Load Balancer frontend IP |

## Setup

```bash
# Variables
RG="rg-az104-challenge13"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION
```

## Tasks

### Task 1: Create an Azure DNS Zone

Create a DNS zone for a subdomain. Since you likely don't own `contoso.com`, use a subdomain like `lab.contoso.com` for practice.

```bash
az network dns zone create \
  --resource-group $RG \
  --name lab.contoso.com
```

:::tip

You don't need to own the domain to create a DNS zone in Azure | you just won't be able to resolve it publicly unless you delegate NS records from the parent domain.

:::
### Task 2: Add DNS Records

Add the following record types to your DNS zone:

1. **A Record** | Map `www.lab.contoso.com` to an IP address
2. **CNAME Record** | Map `portal.lab.contoso.com` to `www.lab.contoso.com`
3. **TXT Record** | Add a verification TXT record

<details>
<summary>💡 Hint</summary>

```bash
# A record
az network dns record-set a add-record \
  --resource-group $RG \
  --zone-name lab.contoso.com \
  --record-set-name www \
  --ipv4-address 10.0.0.4

# CNAME record
az network dns record-set cname set-record \
  --resource-group $RG \
  --zone-name lab.contoso.com \
  --record-set-name portal \
  --cname www.lab.contoso.com

# TXT record
az network dns record-set txt add-record \
  --resource-group $RG \
  --zone-name lab.contoso.com \
  --record-set-name @ \
  --value "contoso-verification=12345"
```

</details>

### Task 3: Create a Public Standard Load Balancer

Create a Standard SKU public load balancer with a frontend IP configuration.

```bash
az network lb create \
  --resource-group $RG \
  --name lb-web \
  --sku Standard \
  --frontend-ip-name lb-frontend \
  --backend-pool-name lb-backend \
  --public-ip-address lb-pip
```

### Task 4: Create a Backend Pool with 2 VMs

Deploy two VMs and add them to the load balancer's backend pool.

<details>
<summary>💡 Hint | Create VMs with a web server</summary>

```bash
# Create a VNet and subnet
az network vnet create \
  --resource-group $RG \
  --name vnet-lb \
  --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-backend \
  --subnet-prefix 10.0.1.0/24

# Create VMs (repeat for vm-web-1 and vm-web-2)
for i in 1 2; do
  az vm create \
    --resource-group $RG \
    --name vm-web-$i \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --vnet-name vnet-lb \
    --subnet subnet-backend \
    --nsg "" \
    --public-ip-address "" \
    --custom-data cloud-init-web.txt \
    --admin-username azureuser \
    --generate-ssh-keys
done
```

</details>

### Task 5: Create a Health Probe

Create an HTTP health probe on port 80.

```bash
az network lb probe create \
  --resource-group $RG \
  --lb-name lb-web \
  --name hp-http \
  --protocol Http \
  --port 80 \
  --path /
```

### Task 6: Create a Load Balancing Rule

Create a rule that maps frontend port 80 to backend port 80.

```bash
az network lb rule create \
  --resource-group $RG \
  --lb-name lb-web \
  --name rule-http \
  --frontend-ip-name lb-frontend \
  --backend-pool-name lb-backend \
  --probe-name hp-http \
  --protocol Tcp \
  --frontend-port 80 \
  --backend-port 80
```

### Task 7: Test Load Balancing

Access the load balancer's public IP in a browser or with `curl`. Refresh multiple times and observe that responses come from different VMs.

```bash
LB_IP=$(az network public-ip show \
  --resource-group $RG \
  --name lb-pip \
  --query ipAddress -o tsv)

echo "Load Balancer IP: $LB_IP"
# curl http://$LB_IP (repeat several times)
```

### Task 8: Create an Internal Load Balancer

Create a second load balancer for internal (private) backend services.

<details>
<summary>💡 Hint</summary>

```bash
az network lb create \
  --resource-group $RG \
  --name lb-internal \
  --sku Standard \
  --frontend-ip-name lb-internal-frontend \
  --backend-pool-name lb-internal-backend \
  --vnet-name vnet-lb \
  --subnet subnet-backend
```

Note: No `--public-ip-address` flag | this makes it internal.

</details>

### Task 9: Troubleshoot Load Balancing

Check the health probe status and verify backend pool health.

```bash
# Check health probe status
az network lb probe show \
  --resource-group $RG \
  --lb-name lb-web \
  --name hp-http

# Check backend pool health (via Portal: Load Balancer > Insights)
# Or check individual VM health:
az vm get-instance-view \
  --resource-group $RG \
  --name vm-web-1 \
  --query instanceView.statuses
```

## 🔨 Break & Fix

### Break It
1. **Misconfigure the health probe** | Change the probe to check port 8080 instead of 80 (or use path `/healthz` when the web server doesn't have that endpoint). Observe that all backend instances show as unhealthy.
2. **Add a broken VM** | Add a third VM to the backend pool that doesn't have a web server running on port 80. Check how the LB handles it.

### Fix It
- Correct the health probe port/path back to the working configuration
- Verify backend health returns to normal
- Observe that the LB automatically stops sending traffic to unhealthy instances

## 📝 Knowledge Check

1. **What are the key differences between Basic and Standard Load Balancer SKUs?**
   - Standard supports availability zones, has an SLA, and is zone-redundant by default
   - Standard requires NSG on the subnet; Basic doesn't
   - Standard backend pool members must be in the same VNet

2. **What health probe types are available?**
   - HTTP, HTTPS, and TCP
   - HTTP/HTTPS probes check for a 200 response; TCP checks for a successful connection

3. **When would you use Load Balancer vs Application Gateway?**
   - Load Balancer = Layer 4 (TCP/UDP) | fast, simple, any protocol
   - Application Gateway = Layer 7 (HTTP/HTTPS) | URL routing, SSL termination, WAF

4. **Which DNS record types should you know for the exam?**
   - A (IPv4), AAAA (IPv6), CNAME (alias), MX (mail), TXT (verification), NS (name server), SOA (start of authority), SRV (service location)

## 🧹 Cleanup

```bash
az group delete --name $RG --yes --no-wait
```

## ✅ Success Criteria

- [ ] Azure DNS zone created with A, CNAME, and TXT records
- [ ] Public Standard Load Balancer created with 2 backend VMs
- [ ] Health probe monitoring port 80
- [ ] Load balancing rule distributing traffic
- [ ] Internal load balancer created for backend services
- [ ] Break & Fix scenarios completed
- [ ] Resources cleaned up
