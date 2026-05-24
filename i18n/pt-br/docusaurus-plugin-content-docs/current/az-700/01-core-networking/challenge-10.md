---
sidebar_position: 10
title: "Desafio 10: NAT Gateway & Conectividade de Saída"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 10: NAT Gateway e conectividade de saÃ­da

:::info Tempo e custo estimados

**60-90 minutos** | **~$1-2/hora** (NAT Gateway + Standard IP) | **Peso no exame: 10-15%**

:::

## CenÃ¡rio

A Contoso executa mais de 200 VMs atrÃ¡s de um Load Balancer interno para processamento de backend. Essas VMs precisam de acesso de saÃ­da Ã  internet para atualizaÃ§Ãµes de pacotes e chamadas de API, mas estÃ£o enfrentando falhas de conexÃ£o intermitentes causadas pelo esgotamento de portas SNAT. A equipe precisa implementar o NAT Gateway para fornecer conectividade de saÃ­da confiÃ¡vel e escalÃ¡vel sem expor as VMs ao trÃ¡fego de entrada da internet.

**Topologia atual:**

```text
Internet
    X (SNAT exhaustion)
    |
Internal Load Balancer (no outbound rules)
    |
Backend Subnet (10.0.1.0/24)
    â”œâ”€â”€ VM-1 ... VM-200+
    â””â”€â”€ No public IPs, no NAT Gateway
```

**Topologia desejada:**

```text
Internet
    |
NAT Gateway (public-ip-nat: 52.x.x.x)
    |
Backend Subnet (10.0.1.0/24)
    â”œâ”€â”€ VM-1 ... VM-200+
    â””â”€â”€ All outbound traffic uses NAT GW IP
```

## Objetivos de aprendizagem

ApÃ³s concluir este desafio, vocÃª serÃ¡ capaz de:

- Identificar casos de uso apropriados para o Azure NAT Gateway
- Criar um NAT Gateway com endereÃ§os IP pÃºblicos
- Associar um NAT Gateway a uma sub-rede de rede virtual
- Escalar a capacidade de saÃ­da usando mÃºltiplos IPs pÃºblicos ou prefixos de IP
- Configurar as definiÃ§Ãµes de tempo limite de inatividade TCP
- Verificar se a conectividade de saÃ­da utiliza o IP do NAT Gateway
- Comparar mÃ©todos de conectividade de saÃ­da no Azure

## PrÃ©-requisitos

- Uma assinatura do Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- CompreensÃ£o bÃ¡sica de conectividade de saÃ­da e SNAT (do AZ-104)

## Conceitos-chave para o AZ-700

| Conceito | Detalhe |
|----------|---------|
| Portas SNAT por IP | 64.512 portas por endereÃ§o IP pÃºblico em um NAT Gateway |
| MÃ¡ximo de IPs pÃºblicos | AtÃ© 16 IPs pÃºblicos por NAT Gateway (1.032.192 portas totais) |
| PrecedÃªncia | O NAT Gateway tem prioridade sobre regras de saÃ­da do LB e PIPs de nÃ­vel de instÃ¢ncia |
| Requisito de SKU | O NAT Gateway requer IPs pÃºblicos de SKU Standard (nÃ£o Basic) |
| Recurso zonal | O NAT Gateway Ã© implantado em zonas de disponibilidade especÃ­ficas |
| Tempo limite de inatividade TCP | ConfigurÃ¡vel de 4 a 120 minutos (padrÃ£o: 4 minutos) |
| Tempo limite de inatividade UDP | Fixo em 4 minutos (nÃ£o configurÃ¡vel) |
| DireÃ§Ã£o | Somente saÃ­da; o NAT Gateway nÃ£o permite conexÃµes iniciadas de entrada |

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

## Tarefa 2: Criar um NAT Gateway com um endereÃ§o IP pÃºblico

Implante o recurso NAT Gateway com um IP pÃºblico de SKU Standard.

### Etapa 1: Criar um IP pÃºblico de SKU Standard para o NAT Gateway

O NAT Gateway requer IPs pÃºblicos de SKU Standard. SKU Basic nÃ£o Ã© suportado.

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

ParÃ¢metros principais:

- `--public-ip-addresses`: lista separada por espaÃ§os de nomes ou IDs de IPs pÃºblicos
- `--idle-timeout`: tempo limite de inatividade TCP em minutos (4-120, padrÃ£o 4)
- `--zone`: zona(s) de disponibilidade para o NAT Gateway (omitido aqui por simplicidade)

### Etapa 3: Verificar se o NAT Gateway foi criado

```bash
az network nat gateway show \
    --resource-group rg-natgw-lab \
    --name natgw-backend \
    --output table
```

---

## Tarefa 3: Associar o NAT Gateway Ã  sub-rede

Uma vez que um NAT Gateway Ã© associado a uma sub-rede, todo o trÃ¡fego de saÃ­da para a internet daquela sub-rede utiliza o IP pÃºblico do NAT Gateway.

### Etapa 1: Associar o NAT Gateway Ã  sub-rede de backend

```bash
az network vnet subnet update \
    --resource-group rg-natgw-lab \
    --vnet-name vnet-backend \
    --name snet-backend \
    --nat-gateway natgw-backend
```

### Etapa 2: Verificar a associaÃ§Ã£o da sub-rede

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

## Tarefa 4: Escalar a capacidade de saÃ­da com IPs pÃºblicos adicionais

Um Ãºnico IP pÃºblico fornece 64.512 portas SNAT. Para mais de 200 VMs fazendo muitas conexÃµes simultÃ¢neas, vocÃª pode precisar de mais. Ã‰ possÃ­vel adicionar atÃ© 16 IPs pÃºblicos por NAT Gateway.

### OpÃ§Ã£o A: Adicionar IPs pÃºblicos individuais

#### Etapa 1: Criar um segundo IP pÃºblico

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

Nota: O parÃ¢metro `--public-ip-addresses` substitui a lista inteira. VocÃª deve incluir todos os IPs que deseja associar, nÃ£o apenas o novo.

### OpÃ§Ã£o B: Usar um prefixo de IP pÃºblico

Um prefixo de IP pÃºblico aloca um intervalo contÃ­guo de IPs. Um prefixo `/28` fornece 16 endereÃ§os.

#### Etapa 1: Criar um prefixo de IP pÃºblico

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

VocÃª tambÃ©m pode combinar IPs pÃºblicos individuais e prefixos no mesmo NAT Gateway usando tanto `--public-ip-addresses` quanto `--public-ip-prefixes`.

---

## Tarefa 5: Configurar e testar o tempo limite de inatividade

O tempo limite de inatividade TCP determina por quanto tempo um NAT Gateway mantÃ©m uma porta SNAT para uma conexÃ£o inativa.

### Etapa 1: Atualizar o tempo limite de inatividade

```bash
az network nat gateway update \
    --resource-group rg-natgw-lab \
    --name natgw-backend \
    --idle-timeout 120
```

### ConsideraÃ§Ãµes importantes

| Protocolo | Tempo limite de inatividade | ConfigurÃ¡vel? |
|-----------|----------------------------|---------------|
| TCP | 4-120 minutos | Sim (via `--idle-timeout`) |
| UDP | 4 minutos | NÃ£o (fixo) |

Tempos limite de inatividade longos aumentam o risco de esgotamento de portas SNAT porque as portas sÃ£o mantidas por mais tempo. A Microsoft recomenda manter o tempo limite tÃ£o baixo quanto sua aplicaÃ§Ã£o permitir.

### Etapa 2: Redefinir para um valor razoÃ¡vel

```bash
az network nat gateway update \
    --resource-group rg-natgw-lab \
    --name natgw-backend \
    --idle-timeout 10
```

---

## Tarefa 6: Verificar o IP de saÃ­da e a conectividade

Implante uma VM de teste para confirmar que o trÃ¡fego de saÃ­da utiliza o IP pÃºblico do NAT Gateway.

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

O flag `--public-ip-address ""` garante que a VM nÃ£o tenha IP pÃºblico de nÃ­vel de instÃ¢ncia. Todo o trÃ¡fego de saÃ­da utilizarÃ¡ o NAT Gateway.

### Etapa 2: Verificar o endereÃ§o IP pÃºblico do NAT Gateway

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

A saÃ­da deve corresponder ao IP pÃºblico do NAT Gateway, confirmando que o trÃ¡fego de saÃ­da Ã© roteado atravÃ©s do NAT Gateway.

---

## ComparaÃ§Ã£o de conectividade de saÃ­da

Entender quando usar cada mÃ©todo de saÃ­da Ã© fundamental para o exame AZ-700.

| MÃ©todo | Portas SNAT | PrecedÃªncia | Caso de uso |
|--------|-------------|-------------|-------------|
| NAT Gateway | 64.512 por IP (atÃ© 16 IPs) | Mais alta | Cargas de trabalho de produÃ§Ã£o que precisam de saÃ­da escalÃ¡vel e confiÃ¡vel |
| IP pÃºblico de nÃ­vel de instÃ¢ncia | Todas as portas disponÃ­veis para uma Ãºnica VM | Alta (substituÃ­da pelo NAT GW) | VM Ãºnica que precisa de IP de saÃ­da dedicado |
| Regras de saÃ­da do LB | ConfigurÃ¡vel por pool de backend | MÃ©dia | Quando o NAT Gateway nÃ£o Ã© uma opÃ§Ã£o |
| Acesso de saÃ­da padrÃ£o | Limitado, nÃ£o confiÃ¡vel | Apenas fallback | NÃ£o recomendado para produÃ§Ã£o |

Ordem de precedÃªncia: NAT Gateway > IP pÃºblico de nÃ­vel de instÃ¢ncia > regras de saÃ­da do LB > acesso de saÃ­da padrÃ£o.

:::warning DescontinuaÃ§Ã£o do acesso de saÃ­da padrÃ£o

O Azure estÃ¡ descontinuando o acesso de saÃ­da padrÃ£o para novas implantaÃ§Ãµes. Todas as novas VMs sem conectividade de saÃ­da explÃ­cita (NAT Gateway, regras de saÃ­da do LB ou PIP de nÃ­vel de instÃ¢ncia) nÃ£o terÃ£o acesso de saÃ­da Ã  internet. Sempre configure a conectividade de saÃ­da explicitamente.

:::

---

## CenÃ¡rios de quebra e correÃ§Ã£o

### CenÃ¡rio 1: ImplantaÃ§Ã£o do NAT Gateway falha com IP pÃºblico de SKU Basic

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

**Causa raiz:** O NAT Gateway suporta apenas IPs pÃºblicos de SKU Standard. IPs de SKU Basic nÃ£o podem ser associados a um NAT Gateway.

**CorreÃ§Ã£o:** Recrie o IP pÃºblico com SKU Standard:

```bash
az network public-ip create \
    --resource-group rg-natgw-lab \
    --name public-ip-fixed \
    --sku Standard \
    --allocation-method Static \
    --location eastus2
```

---

### CenÃ¡rio 2: IP de saÃ­da mudou inesperadamente apÃ³s adicionar o NAT Gateway

**Sintoma:** Uma VM anteriormente usava seu IP pÃºblico de nÃ­vel de instÃ¢ncia (ex.: 20.x.x.x) para conexÃµes de saÃ­da. ApÃ³s o NAT Gateway ser associado Ã  sub-rede, o trÃ¡fego de saÃ­da agora usa o IP do NAT Gateway.

**Causa raiz:** O NAT Gateway tem precedÃªncia sobre IPs pÃºblicos de nÃ­vel de instÃ¢ncia para trÃ¡fego de saÃ­da. Isso Ã© por design. Quando uma sub-rede possui um NAT Gateway, todo o trÃ¡fego de saÃ­da para a internet daquela sub-rede usa o IP pÃºblico do NAT Gateway, independentemente de as VMs individuais terem seus prÃ³prios IPs pÃºblicos.

**ResoluÃ§Ã£o:** Este Ã© o comportamento esperado. Se uma VM especÃ­fica precisa usar seu prÃ³prio IP pÃºblico para trÃ¡fego de saÃ­da, mova-a para uma sub-rede sem NAT Gateway.

---

### CenÃ¡rio 3: ConexÃµes UDP expirando em 4 minutos

**Sintoma:** AplicaÃ§Ãµes de longa duraÃ§Ã£o baseadas em UDP (ex.: resolvedores DNS, servidores de jogos, VoIP) experimentam quedas de conexÃ£o exatamente em 4 minutos de tempo ocioso, mesmo com o tempo limite de inatividade do NAT Gateway configurado para 120 minutos.

**Causa raiz:** O tempo limite de inatividade configurÃ¡vel no NAT Gateway aplica-se apenas a conexÃµes TCP. O tempo limite de inatividade UDP Ã© fixo em 4 minutos e nÃ£o pode ser alterado.

**ResoluÃ§Ã£o:** A aplicaÃ§Ã£o deve implementar pacotes de keepalive ou lÃ³gica de reconexÃ£o para fluxos UDP. Envie um pacote UDP pelo menos uma vez a cada 4 minutos para manter a conexÃ£o ativa.

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

## VerificaÃ§Ã£o de conhecimento

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
