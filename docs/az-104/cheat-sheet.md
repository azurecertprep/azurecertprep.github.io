---
sidebar_position: 5
title: "Azure CLI Cheat Sheet"
---

# Azure CLI Cheat Sheet

Quick reference for the most common Azure CLI commands, organized by exam domain. Bookmark this page.

:::tip PowerShell equivalents

Most commands show the Azure CLI version. Where PowerShell differs significantly, the equivalent is shown. For the exam, know BOTH `az` CLI and `Az` PowerShell syntax.
:::

## General

```bash
# Login
az login
az login --use-device-code          # For Codespaces/remote

# Account management
az account list --output table
az account set --subscription "NAME"
az account show

# Resource groups
az group create --name myRG --location eastus
az group list --output table
az group delete --name myRG --yes --no-wait
```

## 🔐 Identity & Governance

```bash
# Entra ID Users
az ad user create --display-name "John Doe" --user-principal-name john@contoso.com --password "P@ssw0rd!"
az ad user list --output table
az ad user delete --id john@contoso.com

# Entra ID Groups
az ad group create --display-name "Admins" --mail-nickname "admins"
az ad group member add --group "Admins" --member-id USER_OBJECT_ID
az ad group member list --group "Admins" --output table

# RBAC
az role assignment create --assignee USER_ID --role "Contributor" --scope /subscriptions/SUB_ID
az role assignment list --assignee USER_ID --output table
az role definition list --name "Contributor"

# Azure Policy
az policy definition list --output table
az policy assignment create --name "require-tag" --policy POLICY_ID --scope /subscriptions/SUB_ID
az policy assignment list --output table

# Resource locks
az lock create --name "no-delete" --lock-type CanNotDelete --resource-group myRG
az lock list --resource-group myRG --output table

# Tags
az tag create --name "Environment"
az resource tag --tags Environment=Dev --ids RESOURCE_ID

# Management groups
az account management-group create --name "MyMG" --display-name "My Management Group"
```

## 💾 Storage

```bash
# Storage accounts
az storage account create --name mystorageacct --resource-group myRG --location eastus --sku Standard_LRS
az storage account list --resource-group myRG --output table
az storage account show-connection-string --name mystorageacct

# Blob storage
az storage container create --name mycontainer --account-name mystorageacct
az storage blob upload --container-name mycontainer --file ./data.txt --name data.txt --account-name mystorageacct
az storage blob list --container-name mycontainer --account-name mystorageacct --output table

# Azure Files
az storage share create --name myshare --account-name mystorageacct
az storage file upload --share-name myshare --source ./file.txt --account-name mystorageacct

# SAS tokens
az storage account generate-sas --account-name mystorageacct --permissions rwdlacup --expiry 2026-12-31 --resource-types sco --services bfqt

# AzCopy
azcopy copy "./local/" "https://mystorageacct.blob.core.windows.net/mycontainer?SAS" --recursive
azcopy sync "./local/" "https://mystorageacct.blob.core.windows.net/mycontainer?SAS"

# Lifecycle management
az storage account management-policy create --account-name mystorageacct --resource-group myRG --policy @policy.json
```

## ⚙️ Compute

```bash
# Virtual Machines
az vm create --resource-group myRG --name myVM --image Ubuntu2204 --admin-username azureuser --generate-ssh-keys
az vm list --resource-group myRG --output table
az vm start --resource-group myRG --name myVM
az vm stop --resource-group myRG --name myVM
az vm deallocate --resource-group myRG --name myVM
az vm resize --resource-group myRG --name myVM --size Standard_DS2_v2
az vm delete --resource-group myRG --name myVM --yes

# VM disks
az vm disk attach --resource-group myRG --vm-name myVM --name myDisk --new --size-gb 128
az disk list --resource-group myRG --output table

# VMSS
az vmss create --resource-group myRG --name myVMSS --image Ubuntu2204 --instance-count 2 --admin-username azureuser --generate-ssh-keys
az vmss scale --resource-group myRG --name myVMSS --new-capacity 5

# ARM / Bicep
az deployment group create --resource-group myRG --template-file main.bicep
az deployment group validate --resource-group myRG --template-file main.bicep
az bicep decompile --file template.json
az group export --name myRG > exported.json

# Container Registry
az acr create --resource-group myRG --name myacr --sku Basic
az acr build --registry myacr --image myapp:v1 .
az acr login --name myacr

# Container Instances
az container create --resource-group myRG --name mycontainer --image nginx --ports 80 --dns-name-label myapp

# Container Apps
az containerapp create --name myapp --resource-group myRG --environment myEnv --image nginx --target-port 80

# App Service
az appservice plan create --name myPlan --resource-group myRG --sku B1
az webapp create --name myApp --resource-group myRG --plan myPlan --runtime "NODE:18-lts"
az webapp deployment slot create --name myApp --resource-group myRG --slot staging
az webapp deployment slot swap --name myApp --resource-group myRG --slot staging
```

## 🌐 Networking

```bash
# Virtual Networks
az network vnet create --resource-group myRG --name myVNet --address-prefix 10.0.0.0/16 --subnet-name default --subnet-prefix 10.0.0.0/24
az network vnet subnet create --resource-group myRG --vnet-name myVNet --name backend --address-prefix 10.0.1.0/24
az network vnet peering create --resource-group myRG --name peer1to2 --vnet-name vnet1 --remote-vnet vnet2 --allow-vnet-access

# NSGs
az network nsg create --resource-group myRG --name myNSG
az network nsg rule create --resource-group myRG --nsg-name myNSG --name AllowHTTP --priority 100 --destination-port-ranges 80 --access Allow --protocol Tcp --direction Inbound

# Public IPs
az network public-ip create --resource-group myRG --name myPublicIP --sku Standard

# Load Balancer
az network lb create --resource-group myRG --name myLB --sku Standard --public-ip-address myPublicIP

# Azure DNS
az network dns zone create --resource-group myRG --name contoso.com
az network dns record-set a add-record --resource-group myRG --zone-name contoso.com --record-set-name www --ipv4-address 1.2.3.4

# Azure Bastion
az network bastion create --resource-group myRG --name myBastion --vnet-name myVNet --public-ip-address myBastionIP

# Network Watcher
az network watcher show-topology --resource-group myRG
az network watcher test-ip-flow --resource-group myRG --vm myVM --direction Inbound --protocol TCP --local 10.0.0.4:80 --remote 1.2.3.4:*
```

## 📊 Monitor & Maintain

```bash
# Azure Monitor
az monitor metrics list --resource RESOURCE_ID --metric "Percentage CPU" --output table
az monitor log-analytics workspace create --resource-group myRG --workspace-name myWorkspace

# Alerts
az monitor metrics alert create --resource-group myRG --name "High CPU" --scopes RESOURCE_ID --condition "avg Percentage CPU > 80" --action ACTION_GROUP_ID

# Action Groups
az monitor action-group create --resource-group myRG --name "EmailAdmins" --short-name "email" --action email admin admin@contoso.com

# Azure Backup
az backup vault create --resource-group myRG --name myVault --location eastus
az backup protection enable-for-vm --resource-group myRG --vault-name myVault --vm myVM --policy-name DefaultPolicy
az backup protection backup-now --resource-group myRG --vault-name myVault --item-name myVM --container-name myVM

# Site Recovery (basic)
az site-recovery vault create --resource-group myRG --name mySRVault --location eastus
```

---

:::note

This cheat sheet covers the most common commands. Each challenge includes detailed command explanations with all required parameters.
:::
