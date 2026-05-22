---
sidebar_position: 3
title: "Challenge 03: Azure DNS Public Zones & Delegation"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 03: Zonas DNS públicas do Azure e delegação

:::info Tempo e custo estimados

**60-90 minutos** | **~$0,50/zona/mês** (primeiras 25 zonas) | **Peso no exame: 15-20%**

:::

## Cenário

A Contoso está migrando a hospedagem de DNS de um servidor BIND local para o Azure DNS. Eles precisam criar zonas DNS públicas para seus domínios, configurar vários tipos de registro (A, AAAA, CNAME, MX, TXT, SRV, CAA), configurar registros de alias apontando para recursos Azure e delegar zonas filhas para equipes separadas. Seu trabalho é implementar a migração completa de DNS usando Azure CLI.

## Objetivos de aprendizagem

Após concluir este desafio, você será capaz de:

- Criar e configurar zonas DNS públicas do Azure
- Gerenciar conjuntos de registros DNS de todos os principais tipos
- Configurar registros de alias apontando para IPs públicos do Azure, perfis do Traffic Manager e Front Door
- Configurar delegação de zona filha para gerenciamento de subdomínios
- Configurar ajustes de DNS da VNet para resolução de nomes personalizada
- Verificar a resolução DNS usando ferramentas de linha de comando

## Pré-requisitos

- Uma assinatura Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- Um grupo de recursos para este laboratório (ou permissão para criar um)
- Compreensão básica de conceitos de DNS (zonas, registros, delegação)

---

## Tarefa 1: Criar uma zona DNS pública e examinar os registros NS

Crie uma zona DNS pública no Azure DNS e revise os servidores de nomes atribuídos automaticamente.

### Etapa 1: Criar o grupo de recursos

```bash
az group create \
    --name rg-dns-lab \
    --location eastus2
```

### Etapa 2: Criar a zona DNS pública

```bash
az network dns zone create \
    --resource-group rg-dns-lab \
    --name contoso.com
```

### Etapa 3: Recuperar os servidores de nomes atribuídos

```bash
az network dns zone show \
    --resource-group rg-dns-lab \
    --name contoso.com \
    --query nameServers \
    --output tsv
```

O Azure DNS atribui quatro servidores de nomes de um pool (por exemplo, `ns1-04.azure-dns.com`, `ns2-04.azure-dns.net`, `ns3-04.azure-dns.org`, `ns4-04.azure-dns.info`). Para concluir a delegação, você configuraria estes como os registros NS no seu registrador de domínio.

### Etapa 4: Visualizar os registros SOA e NS criados automaticamente

```bash
az network dns record-set list \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --output table
```

Toda nova zona recebe um registro SOA e um conjunto de registros NS no apex (`@`) automaticamente.

:::tip Nota para o exame

No seu registrador, você deve configurar todos os quatro servidores de nomes do Azure DNS. Usar menos de quatro reduz a redundância. Os servidores de nomes não precisam compartilhar o mesmo domínio de nível superior que a sua zona.

:::

---

## Tarefa 2: Criar registros DNS de vários tipos

Adicione registros DNS padrão à zona cobrindo os tipos de registro mais comuns testados no exame.

### Registro A (mapeamento de endereço IPv4)

```bash
az network dns record-set a add-record \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --record-set-name www \
    --ipv4-address 203.0.113.10
```

### Registro AAAA (mapeamento de endereço IPv6)

```bash
az network dns record-set aaaa add-record \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --record-set-name www \
    --ipv6-address "2001:db8:85a3::8a2e:370:7334"
```

### Registro CNAME (alias de nome canônico)

Registros CNAME usam `set-record` em vez de `add-record` porque o padrão DNS permite apenas um CNAME por nome de conjunto de registros.

```bash
az network dns record-set cname set-record \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --record-set-name portal \
    --cname contoso.azurewebsites.net
```

### Registro MX (troca de e-mail)

```bash
az network dns record-set mx add-record \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --record-set-name "@" \
    --exchange mail.contoso.com \
    --preference 10
```

Adicione um servidor de e-mail secundário com preferência mais alta (prioridade mais baixa):

```bash
az network dns record-set mx add-record \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --record-set-name "@" \
    --exchange mail2.contoso.com \
    --preference 20
```

### Registro TXT (verificação de texto / SPF)

```bash
az network dns record-set txt add-record \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --record-set-name "@" \
    --value "v=spf1 include:spf.protection.outlook.com -all"
```

:::note

Os valores de registro TXT têm um comprimento máximo de 255 caracteres por segmento. Valores mais longos devem ser divididos em múltiplas strings entre aspas dentro de um único registro TXT, o que o Azure DNS faz automaticamente quando o valor excede 255 caracteres.

:::

### Registro SRV (localização de serviço)

```bash
az network dns record-set srv add-record \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --record-set-name _sip._tcp \
    --priority 10 \
    --weight 60 \
    --port 5060 \
    --target sipserver.contoso.com
```

### Registro CAA (autorização de autoridade certificadora)

```bash
az network dns record-set caa add-record \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --record-set-name "@" \
    --flags 0 \
    --tag "issue" \
    --value "letsencrypt.org"
```

---

## Tarefa 3: Criar registros de alias apontando para recursos Azure

Registros de alias rastreiam dinamicamente o IP de um recurso Azure, evitando entradas DNS pendentes quando o IP de um recurso muda ou é excluído.

### Etapa 1: Criar um IP público de SKU Standard para usar como destino

```bash
az network public-ip create \
    --resource-group rg-dns-lab \
    --name pip-web-prod \
    --sku Standard \
    --allocation-method Static \
    --location eastus2
```

### Etapa 2: Obter o ID do recurso do IP público

```bash
PIP_ID=$(az network public-ip show \
    --resource-group rg-dns-lab \
    --name pip-web-prod \
    --query id \
    --output tsv)
```

### Etapa 3: Criar um registro de alias A apontando para o IP público

```bash
az network dns record-set a create \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --name web \
    --target-resource "$PIP_ID"
```

O parâmetro `--target-resource` torna este um registro de alias. Quando o IP público muda, a resposta DNS é atualizada automaticamente.

### Etapa 4: Criar um registro de alias no apex da zona para o Traffic Manager

Registros de alias resolvem a limitação "CNAME no apex". Você não pode criar um CNAME em `@`, mas pode criar um registro de alias A/AAAA apontando para um perfil do Traffic Manager ou Front Door.

```bash
# Example: creating an alias A record at the apex pointing to a Traffic Manager profile
# Replace <traffic-manager-profile-resource-id> with the actual resource ID
az network dns record-set a create \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --name "@" \
    --target-resource "<traffic-manager-profile-resource-id>"
```

:::tip Nota para o exame

Registros de alias são suportados para tipos de registro A, AAAA e CNAME. Eles podem apontar para: Azure Public IP (somente SKU Standard), perfis do Azure Traffic Manager, endpoints do Azure CDN e endpoints do Azure Front Door. O recurso de destino e a zona DNS podem estar em assinaturas diferentes, mas ambos devem ter o provedor Microsoft.Network registrado.

:::

---

## Tarefa 4: Configurar delegação de zona filha

A Contoso deseja delegar `dev.contoso.com` para uma equipe separada para que possam gerenciar seus próprios registros DNS de forma independente.

### Etapa 1: Criar a zona DNS filha

```bash
az network dns zone create \
    --resource-group rg-dns-lab \
    --name dev.contoso.com
```

### Etapa 2: Recuperar os servidores de nomes da zona filha

```bash
az network dns zone show \
    --resource-group rg-dns-lab \
    --name dev.contoso.com \
    --query nameServers \
    --output tsv
```

Anote os quatro servidores de nomes retornados (por exemplo, `ns1-09.azure-dns.com`).

### Etapa 3: Criar registros de delegação NS na zona pai

Adicione registros NS na zona pai (`contoso.com`) apontando para os servidores de nomes da zona filha. Você deve adicionar um registro NS para cada um dos quatro servidores de nomes:

```bash
az network dns record-set ns add-record \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --record-set-name dev \
    --nsdname ns1-09.azure-dns.com

az network dns record-set ns add-record \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --record-set-name dev \
    --nsdname ns2-09.azure-dns.net

az network dns record-set ns add-record \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --record-set-name dev \
    --nsdname ns3-09.azure-dns.org

az network dns record-set ns add-record \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --record-set-name dev \
    --nsdname ns4-09.azure-dns.info
```

Substitua os valores de `nsdname` pelos servidores de nomes reais retornados na Etapa 2.

### Etapa 4: Adicionar um registro de teste na zona filha

```bash
az network dns record-set a add-record \
    --resource-group rg-dns-lab \
    --zone-name dev.contoso.com \
    --record-set-name app1 \
    --ipv4-address 10.1.0.4
```

---

## Tarefa 5: Configurar valores de TTL e verificar a resolução

### Etapa 1: Criar um conjunto de registros com um TTL personalizado

```bash
az network dns record-set a create \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --name api \
    --ttl 300
```

```bash
az network dns record-set a add-record \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --record-set-name api \
    --ipv4-address 203.0.113.20
```

### Etapa 2: Atualizar o TTL em um conjunto de registros existente

```bash
az network dns record-set a update \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --name www \
    --set ttl=60
```

### Etapa 3: Verificar a resolução usando nslookup

Consulte os servidores de nomes do Azure DNS diretamente para confirmar que os registros resolvem:

```bash
# Query A record
nslookup www.contoso.com ns1-04.azure-dns.com

# Query MX record
nslookup -type=MX contoso.com ns1-04.azure-dns.com

# Query TXT record
nslookup -type=TXT contoso.com ns1-04.azure-dns.com
```

### Etapa 4: Verificar usando dig (Linux/macOS)

```bash
# Query the A record directly from Azure DNS
dig @ns1-04.azure-dns.com www.contoso.com A

# Query the child zone delegation
dig @ns1-04.azure-dns.com dev.contoso.com NS

# Verify SOA record
dig @ns1-04.azure-dns.com contoso.com SOA
```

:::tip Nota para o exame

Os valores de TTL afetam o comportamento de cache. Um TTL baixo (como 60 segundos) causa consultas mais frequentes ao servidor autoritativo, o que é útil durante migrações. Um TTL alto (como 86400 segundos / 24 horas) reduz a carga de consultas, mas atrasa a propagação de alterações. O TTL mínimo no Azure DNS é 1 segundo.

:::

---

## Tarefa 6: Configurar ajustes de DNS da VNet

Configure uma rede virtual para usar servidores DNS personalizados em vez do padrão fornecido pelo Azure (168.63.129.16).

### Etapa 1: Criar uma VNet com DNS padrão (fornecido pelo Azure)

```bash
az network vnet create \
    --resource-group rg-dns-lab \
    --name vnet-contoso \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name subnet-default \
    --subnet-prefixes 10.0.1.0/24 \
    --location eastus2
```

### Etapa 2: Atualizar a VNet para usar servidores DNS personalizados

```bash
az network vnet update \
    --resource-group rg-dns-lab \
    --name vnet-contoso \
    --dns-servers 10.0.1.4 10.0.1.5
```

Isso configura as VMs na VNet para usar os endereços IP especificados (como controladores de domínio ou encaminhadores DNS) para resolução de nomes em vez do resolvedor recursivo do Azure.

### Etapa 3: Reverter para o DNS fornecido pelo Azure

```bash
az network vnet update \
    --resource-group rg-dns-lab \
    --name vnet-contoso \
    --dns-servers ""
```

Passar uma string vazia redefine a VNet para usar o DNS fornecido pelo Azure (168.63.129.16).

### Etapa 4: Verificar a configuração atual de DNS

```bash
az network vnet show \
    --resource-group rg-dns-lab \
    --name vnet-contoso \
    --query "dhcpOptions.dnsServers" \
    --output tsv
```

:::warning Importante

Após alterar as configurações de DNS da VNet, as VMs devem ser reiniciadas (ou ter sua concessão DHCP renovada) para obter os novos endereços de servidor DNS. Este é um ponto comum de solução de problemas no exame.

:::

---

## Cenários de quebra e correção

### Cenário 1: Tipos de registro conflitantes

Um membro da equipe tenta adicionar um registro CNAME para `www` que já possui um registro A:

```bash
# This will FAIL because www already has an A record set
az network dns record-set cname set-record \
    --resource-group rg-dns-lab \
    --zone-name contoso.com \
    --record-set-name www \
    --cname contoso.azurewebsites.net
```

**Causa raiz:** O padrão DNS proíbe que um CNAME coexista com qualquer outro tipo de registro no mesmo nome. O Azure DNS aplica essa restrição.

**Correção:** Remova o conjunto de registros A existente primeiro, ou use um nome diferente para o CNAME (como `www2`). Alternativamente, use um registro de alias A que aponte para o recurso Azure, que não conflita com outros tipos de registro.

### Cenário 2: Delegação NS ausente

A zona filha `dev.contoso.com` existe no Azure DNS, mas consultas para `app1.dev.contoso.com` retornam NXDOMAIN de resolvedores externos.

**Causa raiz:** Os registros de delegação NS nunca foram adicionados na zona pai. Sem registros NS em `contoso.com` apontando para os servidores de nomes de `dev.contoso.com`, os resolvedores recursivos não têm como encontrar a zona filha.

**Correção:** Crie o conjunto de registros NS na zona pai apontando para os servidores de nomes da zona filha (conforme mostrado na Tarefa 4, Etapa 3). Se a zona pai está hospedada externamente (não no Azure DNS), configure a delegação lá.

### Cenário 3: TTL muito alto durante a migração

Após atualizar um registro A do IP antigo para o novo IP, os usuários ainda alcançam o servidor antigo por horas.

**Causa raiz:** O registro original tinha um TTL de 86400 (24 horas). Os resolvedores recursivos armazenaram a resposta antiga em cache e não farão nova consulta até que o TTL expire.

**Correção:** Antes de fazer alterações de DNS, reduza o TTL com bastante antecedência (pelo menos um período completo de TTL antes da alteração). Um padrão comum de migração é:
1. Reduzir o TTL para 60-300 segundos
2. Aguardar o período do TTL antigo expirar (para que os caches sejam atualizados)
3. Fazer a alteração no registro
4. Após verificar, aumentar o TTL de volta para o valor desejado

---

## Limpar recursos

```bash
az group delete --name rg-dns-lab --yes --no-wait
```

---

## Resumo dos conceitos-chave

| Conceito | Detalhe |
|----------|---------|
| Zona DNS pública | Hospedagem DNS autoritativa distribuída globalmente no Azure |
| Conjunto de registros | Coleção de registros com o mesmo nome e tipo |
| Restrição de CNAME | Apenas um CNAME por nome; não pode coexistir com outros tipos |
| Registros de alias | Rastreiam dinamicamente IPs de recursos Azure; suportados para A, AAAA, CNAME |
| Apex da zona | A raiz de uma zona (ex.: `contoso.com`); CNAME não é permitido aqui |
| Delegação de zona filha | Registros NS na zona pai apontando para servidores de nomes da zona filha |
| Configurações de DNS da VNet | Servidores DNS personalizados substituem o resolvedor fornecido pelo Azure (168.63.129.16) |
| TTL | Controla por quanto tempo os resolvedores armazenam uma resposta em cache (mínimo 1 segundo no Azure DNS) |

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-03-q1",
    question: "You need to create a DNS record that maps portal.contoso.com to contoso.azurewebsites.net. Which command should you use?",
    options: [
      "az network dns record-set cname set-record",
      "az network dns record-set cname add-record",
      "az network dns record-set a add-record",
      "az network dns record-set alias create"
    ],
    correctIndex: 0,
    explanation: "CNAME records use 'set-record' (not 'add-record') because the DNS standard permits only one CNAME value per record set name. The 'set-record' verb enforces this single-value constraint."
  },
  {
    id: "az700-03-q2",
    question: "You create a public DNS zone for contoso.com in Azure DNS. What must you do at your domain registrar to complete the setup?",
    options: [
      "Create an A record pointing to the Azure DNS IP address",
      "Configure all four Azure DNS name servers as the NS records for the domain",
      "Create a CNAME record pointing to the Azure DNS zone FQDN",
      "Add a TXT verification record with the zone ID"
    ],
    correctIndex: 1,
    explanation: "To delegate a domain to Azure DNS, you must update the NS records at your registrar to point to all four Azure DNS name servers assigned to your zone. Using fewer than four reduces redundancy."
  },
  {
    id: "az700-03-q3",
    question: "You need to point the zone apex (contoso.com) to an Azure Traffic Manager profile. A CNAME record is not an option. What should you create?",
    options: [
      "An MX record pointing to the Traffic Manager FQDN",
      "An A alias record with --target-resource set to the Traffic Manager profile resource ID",
      "A TXT record containing the Traffic Manager endpoint",
      "An NS record delegating to Traffic Manager name servers"
    ],
    correctIndex: 1,
    explanation: "CNAME records cannot be created at the zone apex per DNS standards. An alias A record (using --target-resource) can point to a Traffic Manager profile at the apex, dynamically resolving to the correct endpoint IP."
  },
  {
    id: "az700-03-q4",
    question: "A team creates a child zone dev.contoso.com in Azure DNS but external clients cannot resolve app1.dev.contoso.com. The record exists in the child zone. What is the most likely cause?",
    options: [
      "The child zone needs a SOA record manually created",
      "NS delegation records are missing in the parent contoso.com zone",
      "The child zone must be in the same resource group as the parent",
      "Alias records are required for child zone delegation"
    ],
    correctIndex: 1,
    explanation: "For a child zone to be reachable, the parent zone must contain NS records (at the 'dev' record set name) pointing to the child zone's name servers. Without this delegation, recursive resolvers cannot discover the child zone."
  },
  {
    id: "az700-03-q5",
    question: "After changing a VNet's DNS servers using 'az network vnet update --dns-servers', existing VMs continue to use the old DNS settings. What is the required action?",
    options: [
      "Delete and recreate the VNet",
      "Run 'az network vnet apply' to push settings",
      "Restart the VMs or renew their DHCP lease",
      "Update the NSG to allow DNS traffic on port 53"
    ],
    correctIndex: 2,
    explanation: "VNet DNS settings are delivered to VMs via DHCP. Existing VMs will not pick up the new DNS server addresses until they restart or renew their DHCP lease. New VMs deployed after the change will receive the updated settings immediately."
  },
  {
    id: "az700-03-q6",
    question: "Which parameter on 'az network dns record-set a create' converts a standard A record into an alias record?",
    options: [
      "--alias-target",
      "--target-resource",
      "--is-alias true",
      "--resource-reference"
    ],
    correctIndex: 1,
    explanation: "The --target-resource parameter accepts the resource ID of an Azure resource (such as a public IP or Traffic Manager profile) and converts the record set into an alias record that dynamically tracks the resource's IP address."
  }
]} />

---

## Recursos adicionais

- [Host your domain in Azure DNS](https://learn.microsoft.com/azure/dns/dns-delegate-domain-azure-dns)
- [Manage DNS records and record sets using Azure CLI](https://learn.microsoft.com/azure/dns/dns-operations-recordsets-cli)
- [Azure DNS alias records overview](https://learn.microsoft.com/azure/dns/dns-alias)
- [Create a child DNS zone](https://learn.microsoft.com/azure/dns/tutorial-public-dns-zones-child)
- [Configure DNS for an Azure virtual network](https://learn.microsoft.com/azure/virtual-network/manage-virtual-network#change-dns-servers)
