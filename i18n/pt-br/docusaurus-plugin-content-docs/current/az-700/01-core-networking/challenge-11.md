---
sidebar_position: 11
title: "Desafio 11: Diagnósticos do Network Watcher"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';

# Challenge 11: DiagnÃ³sticos do Network Watcher

:::info Tempo e custo estimados

**60-90 minutos** | **~$1-2/hora** (duas VMs B1s em execuÃ§Ã£o) | **Peso no exame: 10-15%**

:::

## CenÃ¡rio

A equipe de operaÃ§Ãµes da Contoso recebe chamados sobre VMs que nÃ£o conseguem se conectar a serviÃ§os. Eles precisam usar as ferramentas de diagnÃ³stico do Azure Network Watcher para identificar e resolver sistematicamente problemas de conectividade de rede -- desde configuraÃ§Ãµes incorretas de NSG atÃ© problemas de roteamento e falhas de DNS. Neste desafio, vocÃª usarÃ¡ IP flow verify, next hop, connection troubleshoot, captura de pacotes e diagnÃ³sticos de NSG para diagnosticar e corrigir problemas comuns de rede.

**Topologia de rede:**

```text
  Internet
      |
  VNet (10.0.0.0/16)
   â”œâ”€â”€ snet-web (10.0.1.0/24)
   â”‚    â””â”€â”€ vm-web: 10.0.1.4 (NSG: nsg-web)
   â”œâ”€â”€ snet-app (10.0.2.0/24)
   â”‚    â””â”€â”€ vm-app: 10.0.2.4 (NSG: nsg-app)
   â””â”€â”€ Route Table: rt-app (attached to snet-app)
```

## Objetivos de aprendizagem

ApÃ³s completar este desafio, vocÃª serÃ¡ capaz de:

- Verificar se o Network Watcher estÃ¡ habilitado para uma regiÃ£o
- Usar IP flow verify para determinar se as regras de NSG permitem ou negam trÃ¡fego especÃ­fico
- Usar next hop para determinar para onde o trÃ¡fego Ã© roteado para um determinado destino
- Usar connection troubleshoot para testar a conectividade de ponta a ponta entre recursos
- Capturar pacotes usando a captura de pacotes do Network Watcher
- Usar diagnÃ³sticos de NSG para ver todas as regras avaliadas para um fluxo de trÃ¡fego especÃ­fico

## PrÃ©-requisitos

- Uma assinatura do Azure com acesso de Contributor
- Azure CLI instalado e autenticado (`az login`)
- Conhecimento bÃ¡sico de NSGs e roteamento (de desafios anteriores)

## Conceitos-chave para o AZ-700

| Conceito | Detalhe |
|----------|---------|
| Network Watcher | Habilitado automaticamente por regiÃ£o no resource group NetworkWatcherRG |
| IP flow verify | Testa um Ãºnico fluxo de 5 tuplas contra regras de NSG; retorna Allow ou Deny mais o nome da regra |
| Next hop | Retorna o tipo de prÃ³ximo salto e o IP para o trÃ¡fego de uma VM para um determinado destino |
| Connection troubleshoot | Teste de alcanÃ§abilidade de ponta a ponta com anÃ¡lise de caminho salto a salto |
| Captura de pacotes | Requer a extensÃ£o de VM do Network Watcher Agent na VM de destino |
| DiagnÃ³sticos de NSG | Mostra TODAS as regras avaliadas (nÃ£o apenas a vencedora) para um determinado fluxo |

---

## Tarefa 1: Criar o ambiente de laboratÃ³rio

Configure a VNet, sub-redes, NSGs e VMs para testes de diagnÃ³stico.

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

### Etapa 3: Criar NSGs com restriÃ§Ãµes intencionais

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

### Etapa 4: Associar NSGs Ã s sub-redes

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

## Tarefa 2: Verificar se o Network Watcher estÃ¡ habilitado

O Network Watcher Ã© habilitado automaticamente para cada regiÃ£o do Azure quando vocÃª cria ou atualiza uma rede virtual. Verifique se ele existe.

### Etapa 1: Listar instÃ¢ncias do Network Watcher

```bash
az network watcher list \
    --output table
```

VocÃª deve ver uma entrada para `eastus` no resource group `NetworkWatcherRG`.

### Etapa 2: Se nÃ£o estiver presente, habilitar o Network Watcher manualmente

```bash
az network watcher configure \
    --resource-group NetworkWatcherRG \
    --locations eastus \
    --enabled true
```

:::tip Nota para o exame

O Network Watcher Ã© habilitado automaticamente por regiÃ£o quando vocÃª implanta recursos de rede. Ele reside no resource group `NetworkWatcherRG`. VocÃª nÃ£o precisa criÃ¡-lo manualmente na maioria dos casos, mas deve conhecer o comando `az network watcher configure` para cenÃ¡rios em que ele foi desabilitado.

:::

---

## Tarefa 3: Usar IP flow verify para verificar regras de NSG

O IP flow verify testa se um pacote especÃ­fico (definido por uma 5-tupla) Ã© permitido ou negado pelas regras de NSG em uma determinada VM.

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

SaÃ­da esperada: `Access: Allow` com o nome da regra `AllowHTTP`.

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

SaÃ­da esperada: `Access: Deny` com o nome da regra `DenySSHFromApp`.

### Etapa 3: Testar saÃ­da para internet a partir de vm-app (deve ser negado)

```bash
az network watcher test-ip-flow \
    --resource-group rg-nw-diag-lab \
    --vm vm-app \
    --direction Outbound \
    --protocol TCP \
    --local 10.0.2.4:* \
    --remote 8.8.8.8:443
```

SaÃ­da esperada: `Access: Deny` com o nome da regra `DenyInternetOutbound`.

### Etapa 4: Testar trÃ¡fego de entrada em uma porta sem regra explÃ­cita

```bash
az network watcher test-ip-flow \
    --resource-group rg-nw-diag-lab \
    --vm vm-web \
    --direction Inbound \
    --protocol TCP \
    --local 10.0.1.4:3389 \
    --remote 203.0.113.50:60000
```

SaÃ­da esperada: `Access: Deny` com o nome da regra `defaultSecurityRules/DenyAllInBound` -- a regra padrÃ£o de negar tudo captura o trÃ¡fego nÃ£o correspondido por nenhuma regra explÃ­cita.

:::tip Nota para o exame

Os parÃ¢metros `--local` e `--remote` usam o formato `IP:PORTA`. Use `*` para a porta quando a direÃ§Ã£o torna a porta irrelevante (por exemplo, `*` para a porta local em testes de saÃ­da, ou `*` para a porta remota em testes de entrada).

:::

---

## Tarefa 4: Usar next hop para determinar o roteamento

O next hop avalia as rotas efetivas de uma VM e retorna para onde o trÃ¡fego para um destino especÃ­fico serÃ¡ enviado.

### Etapa 1: Verificar o prÃ³ximo salto para trÃ¡fego com destino Ã  internet a partir de vm-app

```bash
az network watcher show-next-hop \
    --resource-group rg-nw-diag-lab \
    --vm vm-app \
    --source-ip 10.0.2.4 \
    --dest-ip 8.8.8.8
```

Resultado esperado: `nextHopType: Internet` -- a rota de sistema padrÃ£o direciona o trÃ¡fego para a internet mesmo que o NSG o bloqueie na Camada 4.

### Etapa 2: Verificar o prÃ³ximo salto para trÃ¡fego destinado a 172.16.1.10 (rota blackhole)

```bash
az network watcher show-next-hop \
    --resource-group rg-nw-diag-lab \
    --vm vm-app \
    --source-ip 10.0.2.4 \
    --dest-ip 172.16.1.10
```

Resultado esperado: `nextHopType: None` -- a UDR com `next-hop-type None` descarta esse trÃ¡fego na camada de roteamento.

### Etapa 3: Verificar o prÃ³ximo salto para trÃ¡fego dentro da VNet

```bash
az network watcher show-next-hop \
    --resource-group rg-nw-diag-lab \
    --vm vm-app \
    --source-ip 10.0.2.4 \
    --dest-ip 10.0.1.4
```

Resultado esperado: `nextHopType: VnetLocal` -- o trÃ¡fego intra-VNet usa a rota local da VNet.

:::tip Nota para o exame

O next hop avalia o roteamento independentemente dos NSGs. Um prÃ³ximo salto de `Internet` nÃ£o significa que o trÃ¡fego alcanÃ§arÃ¡ a internet -- as regras de NSG ainda podem bloqueÃ¡-lo. Use next hop para diagnosticar problemas de roteamento e IP flow verify para diagnosticar problemas de NSG.

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

Isso testa se vm-app consegue alcanÃ§ar vm-web na porta 80 (TCP). A saÃ­da inclui o status da conexÃ£o, latÃªncia e detalhes dos saltos.

### Etapa 2: Testar conectividade de vm-app para um endereÃ§o na internet

```bash
az network watcher test-connectivity \
    --resource-group rg-nw-diag-lab \
    --source-resource vm-app \
    --dest-address www.bing.com \
    --protocol TCP \
    --dest-port 443
```

Resultado esperado: `connectionStatus: Unreachable` porque o NSG `DenyInternetOutbound` bloqueia o trÃ¡fego de saÃ­da para a internet a partir de vm-app.

### Etapa 3: Testar conectividade de vm-web para um endereÃ§o na internet

```bash
az network watcher test-connectivity \
    --resource-group rg-nw-diag-lab \
    --source-resource vm-web \
    --dest-address www.bing.com \
    --protocol TCP \
    --dest-port 443
```

Resultado esperado: `connectionStatus: Reachable` -- vm-web nÃ£o possui regra de negaÃ§Ã£o de saÃ­da, entÃ£o o acesso Ã  internet funciona.

:::note

O connection troubleshoot requer a extensÃ£o de VM do Network Watcher Agent na VM de origem. O Azure a instala automaticamente quando vocÃª executa o comando pela primeira vez. Se a extensÃ£o estiver ausente e nÃ£o puder ser instalada, o comando falha.

:::

---

## Tarefa 6: Capturar pacotes com o Network Watcher

A captura de pacotes registra o trÃ¡fego de rede em uma VM para anÃ¡lise offline. Ela requer a extensÃ£o do Network Watcher Agent.

### Etapa 1: Instalar a extensÃ£o do Network Watcher Agent em vm-web

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

Salve o nome da conta de armazenamento da saÃ­da -- vocÃª precisarÃ¡ dele na prÃ³xima etapa.

:::

### Etapa 3: Iniciar uma sessÃ£o de captura de pacotes

```bash
az network watcher packet-capture create \
    --resource-group rg-nw-diag-lab \
    --vm vm-web \
    --name capture-web-traffic \
    --storage-account <storage-account-name> \
    --time-limit 60
```

Substitua `<storage-account-name>` pelo nome da Etapa 2. Isso captura trÃ¡fego por no mÃ¡ximo 60 segundos.

### Etapa 4: Verificar o status da captura de pacotes

```bash
az network watcher packet-capture show \
    --name capture-web-traffic \
    --location eastus
```

A saÃ­da mostra o estado de provisionamento e o status da captura (Running, Stopped ou Failed).

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

Filtros reduzem o tamanho da captura registrando apenas o trÃ¡fego que corresponde aos critÃ©rios especificados.

:::tip Nota para o exame

A captura de pacotes requer a extensÃ£o de VM do Network Watcher Agent instalada na VM de destino. Para Linux Ã© `NetworkWatcherAgentLinux`; para Windows Ã© `NetworkWatcherAgentWindows`. Sem ela, a criaÃ§Ã£o da captura falha com um erro de extensÃ£o.

:::

---

## Tarefa 7: Usar diagnÃ³sticos de NSG para ver todas as regras avaliadas

Os diagnÃ³sticos de NSG mostram cada regra que foi avaliada para um determinado fluxo, nÃ£o apenas o resultado final. Isso Ã© Ãºtil para entender a precedÃªncia de regras.

### Etapa 1: Executar diagnÃ³sticos de NSG para HTTP de entrada em vm-web

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

A saÃ­da mostra todas as regras de NSG avaliadas em ordem, indicando qual regra correspondeu e se o trÃ¡fego foi permitido ou negado.

### Etapa 2: Executar diagnÃ³sticos de NSG para SSH da sub-rede app para vm-web

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

Esperado: a saÃ­da mostra que a regra `DenySSHFromApp` correspondeu na prioridade 200, negando o trÃ¡fego.

### Etapa 3: Visualizar a topologia de rede do resource group

```bash
az network watcher show-topology \
    --resource-group rg-nw-diag-lab
```

Isso retorna uma representaÃ§Ã£o JSON de todos os recursos de rede e seus relacionamentos (VNets, sub-redes, NICs, NSGs, VMs).

:::tip Nota para o exame

Os diagnÃ³sticos de NSG (`run-configuration-diagnostic`) diferem do IP flow verify. O IP flow verify informa o resultado final de Allow/Deny. Os diagnÃ³sticos de NSG mostram a cadeia completa de avaliaÃ§Ã£o de regras, o que Ã© Ãºtil para entender por que uma regra de prioridade mais alta nÃ£o correspondeu ou para auditar todas as regras aplicadas a um fluxo.

:::

---

## CenÃ¡rios de quebra e correÃ§Ã£o

Esses cenÃ¡rios representam falhas comuns de diagnÃ³stico que vocÃª encontrarÃ¡ em produÃ§Ã£o e no exame.

### CenÃ¡rio 1: IP flow verify mostra Deny mas o usuÃ¡rio espera que o trÃ¡fego flua

**Sintoma:** Um desenvolvedor relata que vm-web nÃ£o consegue receber trÃ¡fego na porta 8080 da internet, mesmo acreditando que existe uma regra de permissÃ£o.

**DiagnÃ³stico:**

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

**CorreÃ§Ã£o:**

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

### CenÃ¡rio 2: Next hop mostra None (o trÃ¡fego estÃ¡ sendo descartado)

**Sintoma:** vm-app nÃ£o consegue alcanÃ§ar uma rede parceira em 172.16.5.10. O connection troubleshoot relata Unreachable.

**DiagnÃ³stico:**

```bash
az network watcher show-next-hop \
    --resource-group rg-nw-diag-lab \
    --vm vm-app \
    --source-ip 10.0.2.4 \
    --dest-ip 172.16.5.10
```

Resultado: `nextHopType: None` -- a tabela de rotas possui uma rota `None` para 172.16.0.0/12.

**Causa raiz:** Uma UDR blackhole foi aplicada para todo o intervalo 172.16.0.0/12, que descarta todo o trÃ¡fego para esse CIDR, incluindo a rede parceira legÃ­tima.

**CorreÃ§Ã£o:** Remova a rota blackhole excessivamente ampla e adicione uma rota especÃ­fica para a rede parceira:

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

### CenÃ¡rio 3: Captura de pacotes falha porque a extensÃ£o da VM nÃ£o estÃ¡ instalada

**Sintoma:** A execuÃ§Ã£o de `az network watcher packet-capture create` contra vm-app falha com um erro sobre a extensÃ£o ausente.

**DiagnÃ³stico:**

```bash
az vm extension list \
    --resource-group rg-nw-diag-lab \
    --vm-name vm-app \
    --output table
```

Resultado: Nenhuma extensÃ£o `NetworkWatcherAgentLinux` estÃ¡ presente.

**CorreÃ§Ã£o:**

```bash
az vm extension set \
    --resource-group rg-nw-diag-lab \
    --vm-name vm-app \
    --name NetworkWatcherAgentLinux \
    --publisher Microsoft.Azure.NetworkWatcher
```

ApÃ³s instalar a extensÃ£o, tente novamente o comando de captura de pacotes.

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

## VerificaÃ§Ã£o de conhecimento

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
