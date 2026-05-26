---
sidebar_position: 10
title: "Desafio 10: NAT Gateway & Conectividade de Saída"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 10: NAT Gateway e conectividade de saída

:::info Tempo e custo estimados

**60-90 minutos** | **~$1-2/hora** (NAT Gateway + Standard IP) | **Peso no exame: 10-15%**

:::

## Cenário

A Contoso executa mais de 200 VMs atrás de um Load Balancer interno para processamento de backend. Essas VMs precisam de acesso de saída à internet para atualizações de pacotes e chamadas de API, mas estão enfrentando falhas de conexão intermitentes causadas pelo esgotamento de portas SNAT. A equipe precisa implementar o NAT Gateway para fornecer conectividade de saída confiável e escalável sem expor as VMs ao tráfego de entrada da internet.

**Topologia atual:**

```text
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

```text
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
    question: "As VMs de backend da Contoso estão enfrentando esgotamento de portas SNAT atrás de um Load Balancer interno. Qual solução fornece a conectividade de saída mais escalável?",
    options: [
      "Atribuir IPs públicos em nível de instância a cada VM",
      "Configurar regras de saída no Load Balancer interno",
      "Implantar um NAT Gateway e associá-lo à subnet de backend",
      "Habilitar o acesso de saída padrão na subnet"
    ],
    correctIndex: 2,
    explanation: "O NAT Gateway fornece 64.512 portas SNAT por endereço IP público e suporta até 16 IPs públicos (mais de 1 milhão de portas no total). É a solução recomendada para conectividade de saída escalável e problemas de esgotamento de portas SNAT."
  },
  {
    id: "az700-10-q2",
    question: "Uma VM em uma subnet tem um IP público em nível de instância (20.1.1.1). Um NAT Gateway com IP público 52.2.2.2 está associado à mesma subnet. Qual endereço IP a VM usa para tráfego de saída para a internet?",
    options: [
      "20.1.1.1 (o IP público em nível de instância)",
      "52.2.2.2 (o IP público do NAT Gateway)",
      "A VM alterna entre ambos os IPs",
      "O tráfego de saída é bloqueado devido a um conflito"
    ],
    correctIndex: 1,
    explanation: "O NAT Gateway tem precedência sobre IPs públicos em nível de instância para tráfego de saída. Quando uma subnet tem um NAT Gateway, todo o tráfego de saída para a internet daquela subnet usa o IP público do NAT Gateway, independentemente dos PIPs em nível de instância."
  },
  {
    id: "az700-10-q3",
    question: "Qual é o tempo limite de inatividade máximo que pode ser configurado para conexões UDP em um NAT Gateway?",
    options: [
      "4 minutos (fixo, não configurável)",
      "10 minutos",
      "30 minutos",
      "120 minutos"
    ],
    correctIndex: 0,
    explanation: "O tempo limite de inatividade UDP no NAT Gateway é fixo em 4 minutos e não pode ser alterado. Apenas o tempo limite de inatividade TCP é configurável (4-120 minutos). Aplicações que usam UDP devem implementar mecanismos de keepalive."
  },
  {
    id: "az700-10-q4",
    question: "Um administrador tenta criar um NAT Gateway usando um IP público de SKU Basic. O que acontece?",
    options: [
      "O NAT Gateway é criado, mas opera com desempenho reduzido",
      "O deployment falha porque o NAT Gateway requer IPs públicos de SKU Standard",
      "O IP de SKU Basic é automaticamente atualizado para SKU Standard",
      "O NAT Gateway é criado, mas não pode ser associado a uma subnet"
    ],
    correctIndex: 1,
    explanation: "O NAT Gateway suporta apenas IPs públicos de SKU Standard. Tentar usar um IP público de SKU Basic resultará em falha no deployment. Você deve criar um IP público de SKU Standard com alocação estática."
  },
  {
    id: "az700-10-q5",
    question: "Uma empresa precisa suportar 500.000 conexões de saída simultâneas a partir de uma única subnet. Quantos endereços IP públicos devem ser atribuídos ao NAT Gateway no mínimo?",
    options: [
      "4 IPs públicos",
      "8 IPs públicos",
      "12 IPs públicos",
      "16 IPs públicos"
    ],
    correctIndex: 1,
    explanation: "Cada IP público fornece 64.512 portas SNAT. Para 500.000 conexões simultâneas: 500.000 / 64.512 = 7,75, então você precisa de no mínimo 8 endereços IP públicos para suportar a carga."
  }
]} />

---

## Recursos adicionais

- [What is Azure NAT Gateway?](https://learn.microsoft.com/azure/nat-gateway/nat-overview)
- [Manage NAT Gateway](https://learn.microsoft.com/azure/nat-gateway/manage-nat-gateway)
- [NAT Gateway resource properties](https://learn.microsoft.com/azure/nat-gateway/nat-gateway-resource)
- [Troubleshoot NAT Gateway connectivity](https://learn.microsoft.com/azure/nat-gateway/troubleshoot-nat-gateway)
- [Default outbound access in Azure](https://learn.microsoft.com/azure/virtual-network/ip-services/default-outbound-access)
