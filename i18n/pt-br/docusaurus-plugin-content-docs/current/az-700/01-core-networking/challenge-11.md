---
sidebar_position: 11
title: "Desafio 11: Diagnósticos do Network Watcher"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 11: Diagnósticos do Network Watcher

:::info Tempo e custo estimados

**60-90 minutos** | **~$1-2/hora** (duas VMs B1s em execução) | **Peso no exame: 10-15%**

:::

## Cenário

A equipe de operações da Contoso recebe chamados sobre VMs que não conseguem se conectar a serviços. Eles precisam usar as ferramentas de diagnóstico do Azure Network Watcher para identificar e resolver sistematicamente problemas de conectividade de rede -- desde configurações incorretas de NSG até problemas de roteamento e falhas de DNS. Neste desafio, você usará IP flow verify, next hop, connection troubleshoot, captura de pacotes e diagnósticos de NSG para diagnosticar e corrigir problemas comuns de rede.

**Topologia de rede:**

```text
  Internet
      |
  VNet (10.0.0.0/16)
   ├── snet-web (10.0.1.0/24)
   │    └── vm-web: 10.0.1.4 (NSG: nsg-web)
   ├── snet-app (10.0.2.0/24)
   │    └── vm-app: 10.0.2.4 (NSG: nsg-app)
   └── Route Table: rt-app (attached to snet-app)
```

## Objetivos de aprendizagem

Após completar este desafio, você será capaz de:

- Verificar se o Network Watcher está habilitado para uma região
- Usar IP flow verify para determinar se as regras de NSG permitem ou negam tráfego específico
- Usar next hop para determinar para onde o tráfego é roteado para um determinado destino
- Usar connection troubleshoot para testar a conectividade de ponta a ponta entre recursos
- Capturar pacotes usando a captura de pacotes do Network Watcher
- Usar diagnósticos de NSG para ver todas as regras avaliadas para um fluxo de tráfego específico

## Pré-requisitos

- Uma assinatura do Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- Conhecimento básico de NSGs e roteamento (de desafios anteriores)

## Conceitos-chave para o AZ-700

| Conceito | Detalhe |
|----------|---------|
| Network Watcher | Habilitado automaticamente por região no resource group NetworkWatcherRG |
| IP flow verify | Testa um único fluxo de 5 tuplas contra regras de NSG; retorna Allow ou Deny mais o nome da regra |
| Next hop | Retorna o tipo de próximo salto e o IP para o tráfego de uma VM para um determinado destino |
| Connection troubleshoot | Teste de alcançabilidade de ponta a ponta com análise de caminho salto a salto |
| Captura de pacotes | Requer a extensão de VM do Network Watcher Agent na VM de destino |
| Diagnósticos de NSG | Mostra TODAS as regras avaliadas (não apenas a vencedora) para um determinado fluxo |

---

## Tarefa 1: Criar o ambiente de laboratório

Configure a VNet, sub-redes, NSGs e VMs para testes de diagnóstico.

### Etapa 1: Criar o resource group

```bash
az group create \
    --name rg-nw-diag-lab \
    --location eastus
```

### Etapa 2: Criar a rede virtual e sub-redes

```bash
az network vnet create \
    --resource-group rg-nw-diag-lab \
    --name vnet-diag \
    --location eastus \
    --address-prefixes 10.0.0.0/16 \
    --subnet-name snet-web \
    --subnet-prefixes 10.0.1.0/24

az network vnet subnet create \
    --resource-group rg-nw-diag-lab \
    --vnet-name vnet-diag \
    --name snet-app \
    --address-prefixes 10.0.2.0/24
```

### Etapa 3: Criar NSGs com restrições intencionais

```bash
# NSG for web subnet: allows HTTP/HTTPS inbound, denies SSH from app subnet
az network nsg create \
    --resource-group rg-nw-diag-lab \
    --name nsg-web

az network nsg rule create \
    --resource-group rg-nw-diag-lab \
    --nsg-name nsg-web \
    --name AllowHTTP \
    --priority 100 \
    --direction Inbound \
    --access Allow \
    --protocol TCP \
    --source-address-prefixes '*' \
    --destination-address-prefixes '10.0.1.0/24' \
    --destination-port-ranges 80 443

az network nsg rule create \
    --resource-group rg-nw-diag-lab \
    --nsg-name nsg-web \
    --name DenySSHFromApp \
    --priority 200 \
    --direction Inbound \
    --access Deny \
    --protocol TCP \
    --source-address-prefixes '10.0.2.0/24' \
    --destination-address-prefixes '10.0.1.0/24' \
    --destination-port-ranges 22

# NSG for app subnet: denies all outbound internet
az network nsg create \
    --resource-group rg-nw-diag-lab \
    --name nsg-app

az network nsg rule create \
    --resource-group rg-nw-diag-lab \
    --nsg-name nsg-app \
    --name DenyInternetOutbound \
    --priority 100 \
    --direction Outbound \
    --access Deny \
    --protocol '*' \
    --source-address-prefixes '10.0.2.0/24' \
    --destination-address-prefixes 'Internet' \
    --destination-port-ranges '*'
```

### Etapa 4: Associar NSGs às sub-redes

```bash
az network vnet subnet update \
    --resource-group rg-nw-diag-lab \
    --vnet-name vnet-diag \
    --name snet-web \
    --network-security-group nsg-web

az network vnet subnet update \
    --resource-group rg-nw-diag-lab \
    --vnet-name vnet-diag \
    --name snet-app \
    --network-security-group nsg-app
```

### Etapa 5: Implantar VMs de teste

```bash
az vm create \
    --resource-group rg-nw-diag-lab \
    --name vm-web \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --vnet-name vnet-diag \
    --subnet snet-web \
    --private-ip-address 10.0.1.4 \
    --public-ip-address pip-web \
    --admin-username azureuser \
    --generate-ssh-keys \
    --no-wait

az vm create \
    --resource-group rg-nw-diag-lab \
    --name vm-app \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --vnet-name vnet-diag \
    --subnet snet-app \
    --private-ip-address 10.0.2.4 \
    --public-ip-address pip-app \
    --admin-username azureuser \
    --generate-ssh-keys
```

### Etapa 6: Criar uma tabela de rotas com uma rota blackhole (para teste de next hop)

```bash
az network route-table create \
    --resource-group rg-nw-diag-lab \
    --name rt-app \
    --location eastus

az network route-table route create \
    --resource-group rg-nw-diag-lab \
    --route-table-name rt-app \
    --name drop-172-16 \
    --address-prefix 172.16.0.0/12 \
    --next-hop-type None

az network vnet subnet update \
    --resource-group rg-nw-diag-lab \
    --vnet-name vnet-diag \
    --name snet-app \
    --route-table rt-app
```

---

## Tarefa 2: Verificar se o Network Watcher está habilitado

O Network Watcher é habilitado automaticamente para cada região do Azure quando você cria ou atualiza uma rede virtual. Verifique se ele existe.

### Etapa 1: Listar instâncias do Network Watcher

```bash
az network watcher list \
    --output table
```

Você deve ver uma entrada para `eastus` no resource group `NetworkWatcherRG`.

### Etapa 2: Se não estiver presente, habilitar o Network Watcher manualmente

```bash
az network watcher configure \
    --resource-group NetworkWatcherRG \
    --locations eastus \
    --enabled true
```

:::tip Nota para o exame

O Network Watcher é habilitado automaticamente por região quando você implanta recursos de rede. Ele reside no resource group `NetworkWatcherRG`. Você não precisa criá-lo manualmente na maioria dos casos, mas deve conhecer o comando `az network watcher configure` para cenários em que ele foi desabilitado.

:::

---

## Tarefa 3: Usar IP flow verify para verificar regras de NSG

O IP flow verify testa se um pacote específico (definido por uma 5-tupla) é permitido ou negado pelas regras de NSG em uma determinada VM.

### Etapa 1: Testar HTTP de entrada para vm-web (deve ser permitido)

```bash
az network watcher test-ip-flow \
    --resource-group rg-nw-diag-lab \
    --vm vm-web \
    --direction Inbound \
    --protocol TCP \
    --local 10.0.1.4:80 \
    --remote 203.0.113.50:60000
```

Saída esperada: `Access: Allow` com o nome da regra `AllowHTTP`.

### Etapa 2: Testar SSH de entrada da sub-rede app para vm-web (deve ser negado)

```bash
az network watcher test-ip-flow \
    --resource-group rg-nw-diag-lab \
    --vm vm-web \
    --direction Inbound \
    --protocol TCP \
    --local 10.0.1.4:22 \
    --remote 10.0.2.4:50000
```

Saída esperada: `Access: Deny` com o nome da regra `DenySSHFromApp`.

### Etapa 3: Testar saída para internet a partir de vm-app (deve ser negado)

```bash
az network watcher test-ip-flow \
    --resource-group rg-nw-diag-lab \
    --vm vm-app \
    --direction Outbound \
    --protocol TCP \
    --local 10.0.2.4:* \
    --remote 8.8.8.8:443
```

Saída esperada: `Access: Deny` com o nome da regra `DenyInternetOutbound`.

### Etapa 4: Testar tráfego de entrada em uma porta sem regra explícita

```bash
az network watcher test-ip-flow \
    --resource-group rg-nw-diag-lab \
    --vm vm-web \
    --direction Inbound \
    --protocol TCP \
    --local 10.0.1.4:3389 \
    --remote 203.0.113.50:60000
```

Saída esperada: `Access: Deny` com o nome da regra `defaultSecurityRules/DenyAllInBound` -- a regra padrão de negar tudo captura o tráfego não correspondido por nenhuma regra explícita.

:::tip Nota para o exame

Os parâmetros `--local` e `--remote` usam o formato `IP:PORTA`. Use `*` para a porta quando a direção torna a porta irrelevante (por exemplo, `*` para a porta local em testes de saída, ou `*` para a porta remota em testes de entrada).

:::

---

## Tarefa 4: Usar next hop para determinar o roteamento

O next hop avalia as rotas efetivas de uma VM e retorna para onde o tráfego para um destino específico será enviado.

### Etapa 1: Verificar o próximo salto para tráfego com destino à internet a partir de vm-app

```bash
az network watcher show-next-hop \
    --resource-group rg-nw-diag-lab \
    --vm vm-app \
    --source-ip 10.0.2.4 \
    --dest-ip 8.8.8.8
```

Resultado esperado: `nextHopType: Internet` -- a rota de sistema padrão direciona o tráfego para a internet mesmo que o NSG o bloqueie na Camada 4.

### Etapa 2: Verificar o próximo salto para tráfego destinado a 172.16.1.10 (rota blackhole)

```bash
az network watcher show-next-hop \
    --resource-group rg-nw-diag-lab \
    --vm vm-app \
    --source-ip 10.0.2.4 \
    --dest-ip 172.16.1.10
```

Resultado esperado: `nextHopType: None` -- a UDR com `next-hop-type None` descarta esse tráfego na camada de roteamento.

### Etapa 3: Verificar o próximo salto para tráfego dentro da VNet

```bash
az network watcher show-next-hop \
    --resource-group rg-nw-diag-lab \
    --vm vm-app \
    --source-ip 10.0.2.4 \
    --dest-ip 10.0.1.4
```

Resultado esperado: `nextHopType: VnetLocal` -- o tráfego intra-VNet usa a rota local da VNet.

:::tip Nota para o exame

O next hop avalia o roteamento independentemente dos NSGs. Um próximo salto de `Internet` não significa que o tráfego alcançará a internet -- as regras de NSG ainda podem bloqueá-lo. Use next hop para diagnosticar problemas de roteamento e IP flow verify para diagnosticar problemas de NSG.

:::

---

## Tarefa 5: Usar connection troubleshoot para testes de ponta a ponta

O connection troubleshoot realiza um teste real de conectividade a partir de uma VM de origem, mostrando o caminho percorrido e quaisquer problemas encontrados.

### Etapa 1: Testar conectividade de vm-app para vm-web na porta 80

```bash
az network watcher test-connectivity \
    --resource-group rg-nw-diag-lab \
    --source-resource vm-app \
    --dest-resource vm-web \
    --protocol TCP \
    --dest-port 80
```

Isso testa se vm-app consegue alcançar vm-web na porta 80 (TCP). A saída inclui o status da conexão, latência e detalhes dos saltos.

### Etapa 2: Testar conectividade de vm-app para um endereço na internet

```bash
az network watcher test-connectivity \
    --resource-group rg-nw-diag-lab \
    --source-resource vm-app \
    --dest-address www.bing.com \
    --protocol TCP \
    --dest-port 443
```

Resultado esperado: `connectionStatus: Unreachable` porque o NSG `DenyInternetOutbound` bloqueia o tráfego de saída para a internet a partir de vm-app.

### Etapa 3: Testar conectividade de vm-web para um endereço na internet

```bash
az network watcher test-connectivity \
    --resource-group rg-nw-diag-lab \
    --source-resource vm-web \
    --dest-address www.bing.com \
    --protocol TCP \
    --dest-port 443
```

Resultado esperado: `connectionStatus: Reachable` -- vm-web não possui regra de negação de saída, então o acesso à internet funciona.

:::note

O connection troubleshoot requer a extensão de VM do Network Watcher Agent na VM de origem. O Azure a instala automaticamente quando você executa o comando pela primeira vez. Se a extensão estiver ausente e não puder ser instalada, o comando falha.

:::

---

## Tarefa 6: Capturar pacotes com o Network Watcher

A captura de pacotes registra o tráfego de rede em uma VM para análise offline. Ela requer a extensão do Network Watcher Agent.

### Etapa 1: Instalar a extensão do Network Watcher Agent em vm-web

```bash
az vm extension set \
    --resource-group rg-nw-diag-lab \
    --vm-name vm-web \
    --name NetworkWatcherAgentLinux \
    --publisher Microsoft.Azure.NetworkWatcher
```

### Etapa 2: Criar uma conta de armazenamento para capturas

```bash
az storage account create \
    --resource-group rg-nw-diag-lab \
    --name stnwdiagcaptures$RANDOM \
    --location eastus \
    --sku Standard_LRS
```

:::note

Salve o nome da conta de armazenamento da saída -- você precisará dele na próxima etapa.

:::

### Etapa 3: Iniciar uma sessão de captura de pacotes

```bash
az network watcher packet-capture create \
    --resource-group rg-nw-diag-lab \
    --vm vm-web \
    --name capture-web-traffic \
    --storage-account <storage-account-name> \
    --time-limit 60
```

Substitua `<storage-account-name>` pelo nome da Etapa 2. Isso captura tráfego por no máximo 60 segundos.

### Etapa 4: Verificar o status da captura de pacotes

```bash
az network watcher packet-capture show \
    --name capture-web-traffic \
    --location eastus
```

A saída mostra o estado de provisionamento e o status da captura (Running, Stopped ou Failed).

### Etapa 5: Parar a captura de pacotes

```bash
az network watcher packet-capture stop \
    --name capture-web-traffic \
    --location eastus
```

### Etapa 6: Iniciar uma captura de pacotes filtrada (apenas TCP porta 80)

```bash
az network watcher packet-capture create \
    --resource-group rg-nw-diag-lab \
    --vm vm-web \
    --name capture-http-only \
    --storage-account <storage-account-name> \
    --time-limit 30 \
    --filters '[{"protocol":"TCP","localPort":"80"}]'
```

Filtros reduzem o tamanho da captura registrando apenas o tráfego que corresponde aos critérios especificados.

:::tip Nota para o exame

A captura de pacotes requer a extensão de VM do Network Watcher Agent instalada na VM de destino. Para Linux é `NetworkWatcherAgentLinux`; para Windows é `NetworkWatcherAgentWindows`. Sem ela, a criação da captura falha com um erro de extensão.

:::

---

## Tarefa 7: Usar diagnósticos de NSG para ver todas as regras avaliadas

Os diagnósticos de NSG mostram cada regra que foi avaliada para um determinado fluxo, não apenas o resultado final. Isso é útil para entender a precedência de regras.

### Etapa 1: Executar diagnósticos de NSG para HTTP de entrada em vm-web

```bash
az network watcher run-configuration-diagnostic \
    --resource vm-web \
    --resource-group rg-nw-diag-lab \
    --resource-type virtualMachines \
    --direction Inbound \
    --protocol TCP \
    --source 203.0.113.50 \
    --destination 10.0.1.4 \
    --port 80
```

A saída mostra todas as regras de NSG avaliadas em ordem, indicando qual regra correspondeu e se o tráfego foi permitido ou negado.

### Etapa 2: Executar diagnósticos de NSG para SSH da sub-rede app para vm-web

```bash
az network watcher run-configuration-diagnostic \
    --resource vm-web \
    --resource-group rg-nw-diag-lab \
    --resource-type virtualMachines \
    --direction Inbound \
    --protocol TCP \
    --source 10.0.2.4 \
    --destination 10.0.1.4 \
    --port 22
```

Esperado: a saída mostra que a regra `DenySSHFromApp` correspondeu na prioridade 200, negando o tráfego.

### Etapa 3: Visualizar a topologia de rede do resource group

```bash
az network watcher show-topology \
    --resource-group rg-nw-diag-lab
```

Isso retorna uma representação JSON de todos os recursos de rede e seus relacionamentos (VNets, sub-redes, NICs, NSGs, VMs).

:::tip Nota para o exame

Os diagnósticos de NSG (`run-configuration-diagnostic`) diferem do IP flow verify. O IP flow verify informa o resultado final de Allow/Deny. Os diagnósticos de NSG mostram a cadeia completa de avaliação de regras, o que é útil para entender por que uma regra de prioridade mais alta não correspondeu ou para auditar todas as regras aplicadas a um fluxo.

:::

---

## Cenários de quebra e correção

Esses cenários representam falhas comuns de diagnóstico que você encontrará em produção e no exame.

### Cenário 1: IP flow verify mostra Deny mas o usuário espera que o tráfego flua

**Sintoma:** Um desenvolvedor relata que vm-web não consegue receber tráfego na porta 8080 da internet, mesmo acreditando que existe uma regra de permissão.

**Diagnóstico:**

```bash
az network watcher test-ip-flow \
    --resource-group rg-nw-diag-lab \
    --vm vm-web \
    --direction Inbound \
    --protocol TCP \
    --local 10.0.1.4:8080 \
    --remote 203.0.113.50:60000
```

Resultado: `Access: Deny`, regra: `defaultSecurityRules/DenyAllInBound`.

**Causa raiz:** A regra `AllowHTTP` permite apenas as portas 80 e 443. A porta 8080 nunca foi adicionada.

**Correção:**

```bash
az network nsg rule create \
    --resource-group rg-nw-diag-lab \
    --nsg-name nsg-web \
    --name AllowPort8080 \
    --priority 110 \
    --direction Inbound \
    --access Allow \
    --protocol TCP \
    --source-address-prefixes '*' \
    --destination-address-prefixes '10.0.1.0/24' \
    --destination-port-ranges 8080
```

### Cenário 2: Next hop mostra None (o tráfego está sendo descartado)

**Sintoma:** vm-app não consegue alcançar uma rede parceira em 172.16.5.10. O connection troubleshoot relata Unreachable.

**Diagnóstico:**

```bash
az network watcher show-next-hop \
    --resource-group rg-nw-diag-lab \
    --vm vm-app \
    --source-ip 10.0.2.4 \
    --dest-ip 172.16.5.10
```

Resultado: `nextHopType: None` -- a tabela de rotas possui uma rota `None` para 172.16.0.0/12.

**Causa raiz:** Uma UDR blackhole foi aplicada para todo o intervalo 172.16.0.0/12, que descarta todo o tráfego para esse CIDR, incluindo a rede parceira legítima.

**Correção:** Remova a rota blackhole excessivamente ampla e adicione uma rota específica para a rede parceira:

```bash
az network route-table route delete \
    --resource-group rg-nw-diag-lab \
    --route-table-name rt-app \
    --name drop-172-16

az network route-table route create \
    --resource-group rg-nw-diag-lab \
    --route-table-name rt-app \
    --name route-to-partner \
    --address-prefix 172.16.5.0/24 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.1.4
```

### Cenário 3: Captura de pacotes falha porque a extensão da VM não está instalada

**Sintoma:** A execução de `az network watcher packet-capture create` contra vm-app falha com um erro sobre a extensão ausente.

**Diagnóstico:**

```bash
az vm extension list \
    --resource-group rg-nw-diag-lab \
    --vm-name vm-app \
    --output table
```

Resultado: Nenhuma extensão `NetworkWatcherAgentLinux` está presente.

**Correção:**

```bash
az vm extension set \
    --resource-group rg-nw-diag-lab \
    --vm-name vm-app \
    --name NetworkWatcherAgentLinux \
    --publisher Microsoft.Azure.NetworkWatcher
```

Após instalar a extensão, tente novamente o comando de captura de pacotes.

---

## Limpeza

Remova todos os recursos criados neste desafio:

```bash
az group delete \
    --name rg-nw-diag-lab \
    --yes \
    --no-wait
```

---

## Verificação de conhecimento

<KnowledgeCheck questions={[
  {
    id: "az700-11-q1",
    question: "Você executa az network watcher test-ip-flow e recebe 'Access: Deny' com o nome de regra 'defaultSecurityRules/DenyAllInBound'. O que isso indica?",
    options: [
      "O NSG não está associado à subnet",
      "Nenhuma regra de permissão explícita correspondeu ao tráfego, então a regra padrão deny-all o bloqueou",
      "O firewall da VM (iptables) está bloqueando o tráfego",
      "O Network Watcher não está habilitado na região"
    ],
    correctIndex: 1,
    explanation: "A regra padrão deny-all de entrada tem a prioridade mais baixa em todo NSG. Se nenhuma regra de prioridade mais alta corresponder ao tráfego (com base em origem, destino, porta e protocolo), a regra padrão o nega. Isso significa que você precisa adicionar uma regra de permissão explícita para o tráfego desejado."
  },
  {
    id: "az700-11-q2",
    question: "Qual é a diferença entre IP flow verify e diagnósticos de NSG (run-configuration-diagnostic)?",
    options: [
      "IP flow verify funciona em subnets; diagnósticos de NSG funcionam em VMs",
      "IP flow verify retorna apenas Allow ou Deny com a regra correspondente; diagnósticos de NSG mostram TODAS as regras avaliadas em ordem",
      "Diagnósticos de NSG testam conectividade real; IP flow verify apenas verifica regras",
      "IP flow verify requer a extensão Network Watcher Agent; diagnósticos de NSG não"
    ],
    correctIndex: 1,
    explanation: "O IP flow verify retorna o veredito final (Allow/Deny) e o nome da única regra responsável. Os diagnósticos de NSG mostram a cadeia completa de avaliação de todas as regras em ordem de prioridade, sendo útil para entender a precedência de regras e identificar por que certas regras corresponderam ou não."
  },
  {
    id: "az700-11-q3",
    question: "Você executa az network watcher show-next-hop e o resultado é 'nextHopType: None'. O que isso significa?",
    options: [
      "A VM não existe",
      "O Network Watcher não consegue determinar a rota por causa de um erro de serviço",
      "O tráfego para aquele destino é descartado na camada de roteamento (rota blackhole)",
      "O tráfego será roteado para a internet como fallback"
    ],
    correctIndex: 2,
    explanation: "Um next hop type de 'None' significa que existe uma rota para o prefixo de destino com next-hop-type definido como None, que atua como um blackhole. O tráfego que corresponde a essa rota é descartado silenciosamente na camada de rede antes de qualquer avaliação de NSG ocorrer."
  },
  {
    id: "az700-11-q4",
    question: "A criação de uma captura de pacotes falha em uma VM Linux. Qual é o pré-requisito mais provável que está faltando?",
    options: [
      "A VM não tem um endereço IP público",
      "A extensão de VM NetworkWatcherAgentLinux não está instalada",
      "O NSG está bloqueando a porta 443 de saída",
      "A conta de armazenamento está em uma região diferente"
    ],
    correctIndex: 1,
    explanation: "A captura de pacotes requer a extensão de VM Network Watcher Agent instalada na VM de destino. Para VMs Linux, a extensão é 'NetworkWatcherAgentLinux' (publisher: Microsoft.Azure.NetworkWatcher). Sem ela, o serviço de captura de pacotes não consegue se comunicar com a VM para iniciar a captura."
  },
  {
    id: "az700-11-q5",
    question: "Você precisa testar se vm-app consegue estabelecer uma conexão TCP com vm-web na porta 443. Qual ferramenta do Network Watcher fornece teste de conectividade ponta a ponta com informações de caminho hop-by-hop?",
    options: [
      "az network watcher test-ip-flow",
      "az network watcher show-next-hop",
      "az network watcher test-connectivity",
      "az network watcher show-topology"
    ],
    correctIndex: 2,
    explanation: "O comando test-connectivity (connection troubleshoot) realiza um teste de conectividade real ponta a ponta de uma VM de origem até um destino. Ele retorna o status da conexão (Reachable/Unreachable), latência e o caminho completo hop-by-hop com quaisquer problemas identificados em cada salto. O IP flow verify apenas verifica regras de NSG; o next hop apenas verifica roteamento."
  },
  {
    id: "az700-11-q6",
    question: "Qual é o formato correto para o parâmetro --local em az network watcher test-ip-flow?",
    options: [
      "Apenas endereço IP (ex.: 10.0.1.4)",
      "Formato IP:PORTA (ex.: 10.0.1.4:80)",
      "Notação CIDR (ex.: 10.0.1.0/24)",
      "Formato IP/PORTA com barra (ex.: 10.0.1.4/80)"
    ],
    correctIndex: 1,
    explanation: "Os parâmetros --local e --remote usam o formato IP:PORTA (ex.: 10.0.1.4:80). Você pode usar '*' para a porta quando a direção torna isso irrelevante -- por exemplo, '*' para a porta local em testes de saída ou '*' para a porta remota em testes de entrada."
  }
]} />

---

## Recursos adicionais

- [Network Watcher overview](https://learn.microsoft.com/azure/network-watcher/network-watcher-monitoring-overview)
- [Diagnose VM network traffic filtering - CLI](https://learn.microsoft.com/azure/network-watcher/diagnose-vm-network-traffic-filtering-problem-cli)
- [Diagnose VM network routing - CLI](https://learn.microsoft.com/azure/network-watcher/diagnose-vm-network-routing-problem-cli)
- [Connection troubleshoot](https://learn.microsoft.com/azure/network-watcher/connection-troubleshoot-manage)
- [Packet capture overview](https://learn.microsoft.com/azure/network-watcher/packet-capture-manage)
- [NSG diagnostics](https://learn.microsoft.com/azure/network-watcher/diagnose-network-security-rules)
