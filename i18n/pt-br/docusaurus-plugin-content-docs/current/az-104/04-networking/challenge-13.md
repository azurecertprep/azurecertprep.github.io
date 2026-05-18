---
sidebar_position: 3
title: "Challenge 13: DNS & Load Balancing"
---

# Desafio 13: DNS & Load Balancing

| | |
|---|---|
| ⏱️ **Tempo estimado** | 60 minutos |
| 💰 **Custo estimado** | ~$0,20 |
| 📊 **Peso no exame** | 15–20% |

## Cenário

A aplicação web da Contoso precisa de resolução DNS e balanceamento de carga para alta disponibilidade. A equipe de operações quer migrar dos servidores DNS on-prem e balanceadores de carga de hardware para serviços nativos do Azure. Seu trabalho é configurar o Azure DNS para resolução de nomes e o Azure Load Balancer para distribuir tráfego entre múltiplas VMs.

## Habilidades do Exame Cobertas

- Configurar Azure DNS
- Configurar load balancer interno e público
- Solucionar problemas de balanceamento de carga

## Referência Sysadmin ➜ Azure

| On-Prem / Tradicional | Equivalente no Azure |
|---|---|
| BIND / Windows DNS Server | Azure DNS |
| F5 / HAProxy | Azure Load Balancer |
| Arquivos de zona DNS | Registros de zona Azure DNS |
| VIP do load balancer de hardware | IP frontend do Load Balancer |

## Configuração

```bash
# Variables
RG="rg-az104-challenge13"
LOCATION="eastus"

# Create resource group
az group create --name $RG --location $LOCATION
```

## Tarefas

### Tarefa 1 — Criar uma Zona Azure DNS

Crie uma zona DNS para um subdomínio. Como você provavelmente não é dono de `contoso.com`, use um subdomínio como `lab.contoso.com` para praticar.

```bash
az network dns zone create \
  --resource-group $RG \
  --name lab.contoso.com
```

:::tip Dica
Você não precisa ser dono do domínio para criar uma zona DNS no Azure — você só não conseguirá resolvê-lo publicamente a menos que delegue os registros NS do domínio pai.
:::

### Tarefa 2 — Adicionar Registros DNS

Adicione os seguintes tipos de registro à sua zona DNS:

1. **Registro A** — Mapear `www.lab.contoso.com` para um endereço IP
2. **Registro CNAME** — Mapear `portal.lab.contoso.com` para `www.lab.contoso.com`
3. **Registro TXT** — Adicionar um registro TXT de verificação

<details>
<summary>💡 Dica</summary>

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

### Tarefa 3 — Criar um Load Balancer Público Standard

Crie um Load Balancer público com SKU Standard e uma configuração de IP frontend.

```bash
az network lb create \
  --resource-group $RG \
  --name lb-web \
  --sku Standard \
  --frontend-ip-name lb-frontend \
  --backend-pool-name lb-backend \
  --public-ip-address lb-pip
```

### Tarefa 4 — Criar um Backend Pool com 2 VMs

Implante duas VMs e adicione-as ao backend pool do load balancer.

<details>
<summary>💡 Dica — Criar VMs com um servidor web</summary>

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

### Tarefa 5 — Criar um Health Probe

Crie um health probe HTTP na porta 80.

```bash
az network lb probe create \
  --resource-group $RG \
  --lb-name lb-web \
  --name hp-http \
  --protocol Http \
  --port 80 \
  --path /
```

### Tarefa 6 — Criar uma Regra de Balanceamento de Carga

Crie uma regra que mapeie a porta 80 do frontend para a porta 80 do backend.

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

### Tarefa 7 — Testar o Balanceamento de Carga

Acesse o IP público do load balancer em um navegador ou com `curl`. Atualize várias vezes e observe que as respostas vêm de diferentes VMs.

```bash
LB_IP=$(az network public-ip show \
  --resource-group $RG \
  --name lb-pip \
  --query ipAddress -o tsv)

echo "Load Balancer IP: $LB_IP"
# curl http://$LB_IP (repeat several times)
```

### Tarefa 8 — Criar um Load Balancer Interno

Crie um segundo load balancer para serviços backend internos (privados).

<details>
<summary>💡 Dica</summary>

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

Nota: Sem a flag `--public-ip-address` — isso o torna interno.

</details>

### Tarefa 9 — Solucionar Problemas de Balanceamento de Carga

Verifique o status do health probe e valide a integridade do backend pool.

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

## 🔨 Quebre & Conserte

### Quebre
1. **Configuração errada do health probe** — Altere o probe para verificar a porta 8080 em vez da 80 (ou use o caminho `/healthz` quando o servidor web não tem esse endpoint). Observe que todas as instâncias do backend aparecem como não saudáveis.
2. **Adicione uma VM quebrada** — Adicione uma terceira VM ao backend pool que não tem um servidor web rodando na porta 80. Verifique como o LB lida com isso.

### Conserte
- Corrija a porta/caminho do health probe de volta para a configuração funcional
- Verifique que a integridade do backend volta ao normal
- Observe que o LB automaticamente para de enviar tráfego para instâncias não saudáveis

## 📝 Teste seus Conhecimentos

1. **Quais são as principais diferenças entre os SKUs Basic e Standard do Load Balancer?**
   - Standard suporta zonas de disponibilidade, tem um SLA e é com redundância de zona por padrão
   - Standard requer NSG na subnet; Basic não
   - Membros do backend pool do Standard devem estar na mesma VNet

2. **Quais tipos de health probe estão disponíveis?**
   - HTTP, HTTPS e TCP
   - Probes HTTP/HTTPS verificam uma resposta 200; TCP verifica uma conexão bem-sucedida

3. **Quando você usaria Load Balancer vs Application Gateway?**
   - Load Balancer = Camada 4 (TCP/UDP) — rápido, simples, qualquer protocolo
   - Application Gateway = Camada 7 (HTTP/HTTPS) — roteamento por URL, terminação SSL, WAF

4. **Quais tipos de registro DNS você deve conhecer para o exame?**
   - A (IPv4), AAAA (IPv6), CNAME (alias), MX (correio), TXT (verificação), NS (servidor de nomes), SOA (início de autoridade), SRV (localização de serviço)

## 🧹 Limpeza

```bash
az group delete --name $RG --yes --no-wait
```

## ✅ Critérios de Sucesso

- [ ] Zona Azure DNS criada com registros A, CNAME e TXT
- [ ] Load Balancer público Standard criado com 2 VMs no backend
- [ ] Health probe monitorando a porta 80
- [ ] Regra de balanceamento de carga distribuindo tráfego
- [ ] Load balancer interno criado para serviços backend
- [ ] Cenários de Quebre & Conserte concluídos
- [ ] Recursos limpos
