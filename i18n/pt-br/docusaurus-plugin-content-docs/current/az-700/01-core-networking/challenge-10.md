---
sidebar_position: 10
title: "Challenge 10: NAT Gateway & Outbound Connectivity"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 10: NAT Gateway e conectividade de saída

:::info Tempo e custo estimados

**60-90 minutos** | **~$1-2/hora** (NAT Gateway + Standard IP) | **Peso no exame: 10-15%**

:::

## Cenário

A Contoso executa mais de 200 VMs atrás de um Load Balancer interno para processamento de backend. Essas VMs precisam de acesso de saída à internet para atualizações de pacotes e chamadas de API, mas estão enfrentando falhas de conexão intermitentes causadas pelo esgotamento de portas SNAT. A equipe precisa implementar o NAT Gateway para fornecer conectividade de saída confiável e escalável sem expor as VMs ao tráfego de entrada da internet.

**Topologia atual:**

```
Internet
    X (SNAT exhaustion)
    |
Internal Load Balancer (no outbound rules)
    |
Backend Subnet (10.0.1.0/24)
    ├── VM-1 ... VM-200+
    └── No public IPs, no NAT Gateway
```

**Topologia desejada:**

```
Internet
    |
NAT Gateway (public-ip-nat: 52.x.x.x)
    |
Backend Subnet (10.0.1.0/24)
    ├── VM-1 ... VM-200+
    └── All outbound traffic uses NAT GW IP
```

## Objetivos de aprendizagem

Após concluir este desafio, você será capaz de:

- Identificar casos de uso apropriados para o Azure NAT Gateway
- Criar um NAT Gateway com endereços IP públicos
- Associar um NAT Gateway a uma sub-rede de rede virtual
- Escalar a capacidade de saída usando múltiplos IPs públicos ou prefixos de IP
- Configurar as definições de tempo limite de inatividade TCP
- Verificar se a conectividade de saída utiliza o IP do NAT Gateway
- Comparar métodos de conectividade de saída no Azure

## Pré-requisitos

- Uma assinatura do Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- Compreensão básica de conectividade de saída e SNAT (do AZ-104)

## Conceitos-chave para o AZ-700

| Conceito | Detalhe |
|----------|---------|
| Portas SNAT por IP | 64.512 portas por endereço IP público em um NAT Gateway |
| Máximo de IPs públicos | Até 16 IPs públicos por NAT Gateway (1.032.192 portas totais) |
| Precedência | O NAT Gateway tem prioridade sobre regras de saída do LB e PIPs de nível de instância |
| Requisito de SKU | O NAT Gateway requer IPs públicos de SKU Standard (não Basic) |
| Recurso zonal | O NAT Gateway é implantado em zonas de disponibilidade específicas |
| Tempo limite de inatividade TCP | Configurável de 4 a 120 minutos (padrão: 4 minutos) |
| Tempo limite de inatividade UDP | Fixo em 4 minutos (não configurável) |
| Direção | Somente saída; o NAT Gateway não permite conexões iniciadas de entrada |

---

## Tarefa 1: Criar grupo de recursos e rede virtual

Configure a infraestrutura de rede que simula o ambiente de backend da Contoso.

### Etapa 1: Criar o grupo de recursos

```bash
az group create \
    --name rg-natgw-lab \
    --location eastus2
```

### Etapa 2: Criar a rede virtual com uma sub-rede de backend

```bash
az network vnet create \
    --resource-group rg-natgw-lab \
    --name vnet-backend \
    --location eastus2 \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name snet-backend \
    --subnet-prefixes 10.0.1.0/24
```

---

## Tarefa 2: Criar um NAT Gateway com um endereço IP público

Implante o recurso NAT Gateway com um IP público de SKU Standard.

### Etapa 1: Criar um IP público de SKU Standard para o NAT Gateway

O NAT Gateway requer IPs públicos de SKU Standard. SKU Basic não é suportado.

```bash
az network public-ip create \
    --resource-group rg-natgw-lab \
    --name public-ip-nat \
    --sku Standard \
    --allocation-method Static \
    --location eastus2 \
    --zone 1 2 3
```

### Etapa 2: Criar o recurso NAT Gateway

```bash
az network nat gateway create \
    --resource-group rg-natgw-lab \
    --name natgw-backend \
    --location eastus2 \
    --public-ip-addresses public-ip-nat \
    --idle-timeout 10
```

Parâmetros principais:

- `--public-ip-addresses`: lista separada por espaços de nomes ou IDs de IPs públicos
- `--idle-timeout`: tempo limite de inatividade TCP em minutos (4-120, padrão 4)
- `--zone`: zona(s) de disponibilidade para o NAT Gateway (omitido aqui por simplicidade)

### Etapa 3: Verificar se o NAT Gateway foi criado

```bash
az network nat gateway show \
    --resource-group rg-natgw-lab \
    --name natgw-backend \
    --output table
```

---

## Tarefa 3: Associar o NAT Gateway à sub-rede

Uma vez que um NAT Gateway é associado a uma sub-rede, todo o tráfego de saída para a internet daquela sub-rede utiliza o IP público do NAT Gateway.

### Etapa 1: Associar o NAT Gateway à sub-rede de backend

```bash
az network vnet subnet update \
    --resource-group rg-natgw-lab \
    --vnet-name vnet-backend \
    --name snet-backend \
    --nat-gateway natgw-backend
```

### Etapa 2: Verificar a associação da sub-rede

```bash
az network vnet subnet show \
    --resource-group rg-natgw-lab \
    --vnet-name vnet-backend \
    --name snet-backend \
    --query "natGateway.id" \
    --output tsv
```

Isso deve retornar o ID do recurso `natgw-backend`.

---

## Tarefa 4: Escalar a capacidade de saída com IPs públicos adicionais

Um único IP público fornece 64.512 portas SNAT. Para mais de 200 VMs fazendo muitas conexões simultâneas, você pode precisar de mais. É possível adicionar até 16 IPs públicos por NAT Gateway.

### Opção A: Adicionar IPs públicos individuais

#### Etapa 1: Criar um segundo IP público

```bash
az network public-ip create \
    --resource-group rg-natgw-lab \
    --name public-ip-nat2 \
    --sku Standard \
    --allocation-method Static \
    --location eastus2 \
    --zone 1 2 3
```

#### Etapa 2: Atualizar o NAT Gateway para incluir ambos os IPs

```bash
az network nat gateway update \
    --resource-group rg-natgw-lab \
    --name natgw-backend \
    --public-ip-addresses public-ip-nat public-ip-nat2
```

Nota: O parâmetro `--public-ip-addresses` substitui a lista inteira. Você deve incluir todos os IPs que deseja associar, não apenas o novo.

### Opção B: Usar um prefixo de IP público

Um prefixo de IP público aloca um intervalo contíguo de IPs. Um prefixo `/28` fornece 16 endereços.

#### Etapa 1: Criar um prefixo de IP público

```bash
az network public-ip prefix create \
    --resource-group rg-natgw-lab \
    --name public-ip-prefix-nat \
    --location eastus2 \
    --length 28
```

#### Etapa 2: Criar um NAT Gateway usando o prefixo (abordagem alternativa)

```bash
az network nat gateway create \
    --resource-group rg-natgw-lab \
    --name natgw-prefix-demo \
    --location eastus2 \
    --public-ip-prefixes public-ip-prefix-nat \
    --idle-timeout 10
```

Você também pode combinar IPs públicos individuais e prefixos no mesmo NAT Gateway usando tanto `--public-ip-addresses` quanto `--public-ip-prefixes`.

---

## Tarefa 5: Configurar e testar o tempo limite de inatividade

O tempo limite de inatividade TCP determina por quanto tempo um NAT Gateway mantém uma porta SNAT para uma conexão inativa.

### Etapa 1: Atualizar o tempo limite de inatividade

```bash
az network nat gateway update \
    --resource-group rg-natgw-lab \
    --name natgw-backend \
    --idle-timeout 120
```

### Considerações importantes

| Protocolo | Tempo limite de inatividade | Configurável? |
|-----------|----------------------------|---------------|
| TCP | 4-120 minutos | Sim (via `--idle-timeout`) |
| UDP | 4 minutos | Não (fixo) |

Tempos limite de inatividade longos aumentam o risco de esgotamento de portas SNAT porque as portas são mantidas por mais tempo. A Microsoft recomenda manter o tempo limite tão baixo quanto sua aplicação permitir.

### Etapa 2: Redefinir para um valor razoável

```bash
az network nat gateway update \
    --resource-group rg-natgw-lab \
    --name natgw-backend \
    --idle-timeout 10
```

---

## Tarefa 6: Verificar o IP de saída e a conectividade

Implante uma VM de teste para confirmar que o tráfego de saída utiliza o IP público do NAT Gateway.

### Etapa 1: Criar uma VM de teste na sub-rede de backend

```bash
az vm create \
    --resource-group rg-natgw-lab \
    --name vm-test-nat \
    --image Ubuntu2204 \
    --vnet-name vnet-backend \
    --subnet snet-backend \
    --size Standard_B1s \
    --admin-username azureuser \
    --generate-ssh-keys \
    --public-ip-address "" \
    --no-wait
```

O flag `--public-ip-address ""` garante que a VM não tenha IP público de nível de instância. Todo o tráfego de saída utilizará o NAT Gateway.

### Etapa 2: Verificar o endereço IP público do NAT Gateway

```bash
az network public-ip show \
    --resource-group rg-natgw-lab \
    --name public-ip-nat \
    --query "ipAddress" \
    --output tsv
```

### Etapa 3: Verificar a partir da VM usando console serial ou Run Command

```bash
az vm run-command invoke \
    --resource-group rg-natgw-lab \
    --name vm-test-nat \
    --command-id RunShellScript \
    --scripts "curl -s https://ifconfig.me"
```

A saída deve corresponder ao IP público do NAT Gateway, confirmando que o tráfego de saída é roteado através do NAT Gateway.

---

## Comparação de conectividade de saída

Entender quando usar cada método de saída é fundamental para o exame AZ-700.

| Método | Portas SNAT | Precedência | Caso de uso |
|--------|-------------|-------------|-------------|
| NAT Gateway | 64.512 por IP (até 16 IPs) | Mais alta | Cargas de trabalho de produção que precisam de saída escalável e confiável |
| IP público de nível de instância | Todas as portas disponíveis para uma única VM | Alta (substituída pelo NAT GW) | VM única que precisa de IP de saída dedicado |
| Regras de saída do LB | Configurável por pool de backend | Média | Quando o NAT Gateway não é uma opção |
| Acesso de saída padrão | Limitado, não confiável | Apenas fallback | Não recomendado para produção |

Ordem de precedência: NAT Gateway > IP público de nível de instância > regras de saída do LB > acesso de saída padrão.

:::warning Descontinuação do acesso de saída padrão

O Azure está descontinuando o acesso de saída padrão para novas implantações. Todas as novas VMs sem conectividade de saída explícita (NAT Gateway, regras de saída do LB ou PIP de nível de instância) não terão acesso de saída à internet. Sempre configure a conectividade de saída explicitamente.

:::

---

## Cenários de quebra e correção

### Cenário 1: Implantação do NAT Gateway falha com IP público de SKU Basic

**Sintoma:** O comando `az network nat gateway create` falha com um erro de incompatibilidade de SKU.

**Reproduzir o erro:**

```bash
# This will fail
az network public-ip create \
    --resource-group rg-natgw-lab \
    --name public-ip-basic \
    --sku Basic \
    --allocation-method Dynamic \
    --location eastus2

az network nat gateway create \
    --resource-group rg-natgw-lab \
    --name natgw-broken \
    --location eastus2 \
    --public-ip-addresses public-ip-basic
```

**Causa raiz:** O NAT Gateway suporta apenas IPs públicos de SKU Standard. IPs de SKU Basic não podem ser associados a um NAT Gateway.

**Correção:** Recrie o IP público com SKU Standard:

```bash
az network public-ip create \
    --resource-group rg-natgw-lab \
    --name public-ip-fixed \
    --sku Standard \
    --allocation-method Static \
    --location eastus2
```

---

### Cenário 2: IP de saída mudou inesperadamente após adicionar o NAT Gateway

**Sintoma:** Uma VM anteriormente usava seu IP público de nível de instância (ex.: 20.x.x.x) para conexões de saída. Após o NAT Gateway ser associado à sub-rede, o tráfego de saída agora usa o IP do NAT Gateway.

**Causa raiz:** O NAT Gateway tem precedência sobre IPs públicos de nível de instância para tráfego de saída. Isso é por design. Quando uma sub-rede possui um NAT Gateway, todo o tráfego de saída para a internet daquela sub-rede usa o IP público do NAT Gateway, independentemente de as VMs individuais terem seus próprios IPs públicos.

**Resolução:** Este é o comportamento esperado. Se uma VM específica precisa usar seu próprio IP público para tráfego de saída, mova-a para uma sub-rede sem NAT Gateway.

---

### Cenário 3: Conexões UDP expirando em 4 minutos

**Sintoma:** Aplicações de longa duração baseadas em UDP (ex.: resolvedores DNS, servidores de jogos, VoIP) experimentam quedas de conexão exatamente em 4 minutos de tempo ocioso, mesmo com o tempo limite de inatividade do NAT Gateway configurado para 120 minutos.

**Causa raiz:** O tempo limite de inatividade configurável no NAT Gateway aplica-se apenas a conexões TCP. O tempo limite de inatividade UDP é fixo em 4 minutos e não pode ser alterado.

**Resolução:** A aplicação deve implementar pacotes de keepalive ou lógica de reconexão para fluxos UDP. Envie um pacote UDP pelo menos uma vez a cada 4 minutos para manter a conexão ativa.

---

## Limpeza

Remova todos os recursos criados neste desafio:

```bash
az group delete \
    --name rg-natgw-lab \
    --yes \
    --no-wait
```

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-10-q1",
    question: "Contoso's backend VMs are experiencing SNAT port exhaustion behind an internal Load Balancer. Which solution provides the most scalable outbound connectivity?",
    options: [
      "Assign instance-level public IPs to each VM",
      "Configure outbound rules on the internal Load Balancer",
      "Deploy a NAT Gateway and associate it with the backend subnet",
      "Enable default outbound access on the subnet"
    ],
    correctIndex: 2,
    explanation: "NAT Gateway provides 64,512 SNAT ports per public IP address and supports up to 16 public IPs (over 1 million total ports). It is the recommended solution for scalable outbound connectivity and SNAT port exhaustion issues."
  },
  {
    id: "az700-10-q2",
    question: "A VM in a subnet has an instance-level public IP (20.1.1.1). A NAT Gateway with public IP 52.2.2.2 is associated with the same subnet. What IP address does the VM use for outbound internet traffic?",
    options: [
      "20.1.1.1 (the instance-level public IP)",
      "52.2.2.2 (the NAT Gateway public IP)",
      "The VM alternates between both IPs",
      "Outbound traffic is blocked due to a conflict"
    ],
    correctIndex: 1,
    explanation: "NAT Gateway takes precedence over instance-level public IPs for outbound traffic. When a subnet has a NAT Gateway, all outbound internet traffic from that subnet uses the NAT Gateway public IP regardless of instance-level PIPs."
  },
  {
    id: "az700-10-q3",
    question: "What is the maximum idle timeout that can be configured for UDP connections on a NAT Gateway?",
    options: [
      "4 minutes (fixed, not configurable)",
      "10 minutes",
      "30 minutes",
      "120 minutes"
    ],
    correctIndex: 0,
    explanation: "UDP idle timeout on NAT Gateway is fixed at 4 minutes and cannot be changed. Only TCP idle timeout is configurable (4-120 minutes). Applications using UDP must implement keepalive mechanisms."
  },
  {
    id: "az700-10-q4",
    question: "An administrator attempts to create a NAT Gateway using a Basic SKU public IP. What happens?",
    options: [
      "The NAT Gateway is created but operates with reduced performance",
      "The deployment fails because NAT Gateway requires Standard SKU public IPs",
      "The Basic SKU IP is automatically upgraded to Standard SKU",
      "The NAT Gateway is created but cannot be associated with a subnet"
    ],
    correctIndex: 1,
    explanation: "NAT Gateway only supports Standard SKU public IPs. Attempting to use a Basic SKU public IP will result in a deployment failure. You must create a Standard SKU public IP with static allocation."
  },
  {
    id: "az700-10-q5",
    question: "A company needs to support 500,000 concurrent outbound connections from a single subnet. How many public IP addresses must be assigned to the NAT Gateway at minimum?",
    options: [
      "4 public IPs",
      "8 public IPs",
      "12 public IPs",
      "16 public IPs"
    ],
    correctIndex: 1,
    explanation: "Each public IP provides 64,512 SNAT ports. For 500,000 concurrent connections: 500,000 / 64,512 = 7.75, so you need at minimum 8 public IP addresses to handle the load."
  }
]} />

---

## Recursos adicionais

- [What is Azure NAT Gateway?](https://learn.microsoft.com/azure/nat-gateway/nat-overview)
- [Manage NAT Gateway](https://learn.microsoft.com/azure/nat-gateway/manage-nat-gateway)
- [NAT Gateway resource properties](https://learn.microsoft.com/azure/nat-gateway/nat-gateway-resource)
- [Troubleshoot NAT Gateway connectivity](https://learn.microsoft.com/azure/nat-gateway/troubleshoot-nat-gateway)
- [Default outbound access in Azure](https://learn.microsoft.com/azure/virtual-network/ip-services/default-outbound-access)
