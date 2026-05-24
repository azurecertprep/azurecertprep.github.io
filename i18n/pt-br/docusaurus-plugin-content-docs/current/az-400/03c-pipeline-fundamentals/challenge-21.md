---
sidebar_position: 3
title: "Desafio 21: Infraestrutura de runners e agentes"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Desafio 21: Infraestrutura de runners e agentes

:::info Plataforma: comparaÃ§Ã£o
Este desafio compara runners do GitHub Actions e agentes do Azure DevOps lado a lado.
:::

## Habilidades do exame

- Projetar e implementar uma infraestrutura de runner do GitHub ou agente do Azure DevOps, incluindo custo, seleÃ§Ã£o de ferramentas, licenÃ§as, conectividade e manutenibilidade

## CenÃ¡rio

A Contoso Ltd possui requisitos de build diversificados em suas equipes de engenharia:

- A equipe mobile faz build de apps iOS que requerem macOS com Xcode
- A equipe de engenharia de dados executa testes de integraÃ§Ã£o contra um SQL Server on-premises atrÃ¡s de um firewall
- A equipe de plataforma faz build de imagens Docker que precisam de acesso privilegiado
- Todas as equipes precisam de builds rÃ¡pidos com dependÃªncias em cache

A configuraÃ§Ã£o atual usa runners hospedados pelo GitHub para tudo, resultando em builds lentos (sem cache persistente), incapacidade de alcanÃ§ar recursos on-premises e custos altos para runners macOS. A Contoso precisa de uma estratÃ©gia hÃ­brida de runners/agentes que equilibre custo, seguranÃ§a e capacidade.

## Tarefa 1: Comparar runners hospedados versus self-hosted

| Fator | Runners hospedados pelo GitHub | Runners self-hosted |
|-------|-------------------------------|---------------------|
| Custo | Minutos incluÃ­dos (2.000 para Team, 3.000 para Enterprise), depois cobranÃ§a por minuto | Apenas custo de infraestrutura (VM, manutenÃ§Ã£o) |
| Taxa macOS | Multiplicador de 10x sobre minutos Linux | Hardware prÃ³prio a custo fixo |
| ManutenÃ§Ã£o | Gerenciado pelo GitHub (atualizado automaticamente) | Autogerenciado (patches de SO, atualizaÃ§Ãµes de ferramentas) |
| Ambiente limpo | VM nova a cada job | Persistente (necessÃ¡rio gerenciar limpeza) |
| Acesso Ã  rede | Apenas internet pÃºblica | Pode acessar redes privadas |
| Tempo de inicializaÃ§Ã£o | 15-45 segundos (fila + provisionamento) | Quase instantÃ¢neo (jÃ¡ em execuÃ§Ã£o) |
| PersonalizaÃ§Ã£o | Limitado a ferramentas prÃ©-instaladas | Controle total sobre software instalado |
| Cache | actions/cache (round-trip de rede) | Cache em filesystem local (mais rÃ¡pido) |
| SeguranÃ§a | Isolado por design | Risco de runner compartilhado se nÃ£o for efÃªmero |

ComparaÃ§Ã£o com Azure DevOps:

| Fator | Agentes hospedados pela Microsoft | Agentes self-hosted |
|-------|----------------------------------|---------------------|
| Custo | 1 job paralelo gratuito, depois $40/job paralelo/mÃªs | $15/job paralelo/mÃªs (licenciamento) + infra |
| ManutenÃ§Ã£o | Gerenciado pela Microsoft | Autogerenciado |
| Ambiente limpo | VM nova a cada job | Persistente |
| Acesso Ã  rede | Apenas internet pÃºblica | Acesso a rede privada |
| Tempo de inicializaÃ§Ã£o | Pode ser lento devido ao provisionamento | RÃ¡pido (prÃ©-provisionado) |

## Tarefa 2: Configurar um runner self-hosted do GitHub no Linux

Provisione e configure um runner em uma VM Linux do Azure:

```bash
# Create an Azure VM for the runner
az vm create \
  --resource-group contoso-runners-rg \
  --name contoso-runner-linux-01 \
  --image Ubuntu2404 \
  --size Standard_D4s_v5 \
  --admin-username runneradmin \
  --generate-ssh-keys \
  --nsg-rule SSH \
  --vnet-name contoso-runners-vnet \
  --subnet runners-subnet \
  --public-ip-address ""

# SSH into the VM and install the runner
ssh runneradmin@<private-ip>

# Download and configure the GitHub Actions runner
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.321.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.321.0.tar.gz

# Configure the runner (get token from repo/org settings)
./config.sh \
  --url https://github.com/contoso \
  --token <REGISTRATION_TOKEN> \
  --name contoso-runner-linux-01 \
  --labels linux,docker,on-prem \
  --runnergroup contoso-internal \
  --work _work \
  --replace

# Install and start as a service
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

Instale as ferramentas de build necessÃ¡rias:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker runneradmin

# Install .NET SDK
wget https://dot.net/v1/dotnet-install.sh
chmod +x dotnet-install.sh
./dotnet-install.sh --channel 8.0

# Install Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20

# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

## Tarefa 3: Configurar runner groups e labels

Configure runner groups para controle de acesso organizacional:

```bash
# Create a runner group (requires GitHub Enterprise)
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  /orgs/contoso/actions/runner-groups \
  -f name="internal-network" \
  -f visibility="selected" \
  -F selected_repository_ids[]="<repo-id-1>" \
  -F selected_repository_ids[]="<repo-id-2>" \
  -F allows_public_repositories=false

# List runner groups
gh api /orgs/contoso/actions/runner-groups

# Add runner to a group (done during config.sh with --runnergroup)
```

Use labels nos arquivos de workflow:

```yaml
jobs:
  build-ios:
    runs-on: [self-hosted, macOS, xcode-15]
    steps:
      - uses: actions/checkout@v4
      - run: xcodebuild -scheme ContosoApp -sdk iphoneos

  integration-tests:
    runs-on: [self-hosted, linux, on-prem]
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:integration
        env:
          SQL_SERVER: sql-server.contoso.internal:1433

  docker-build:
    runs-on: [self-hosted, linux, docker]
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t contoso-api:${{ github.sha }} .
```

## Tarefa 4: Configurar agente self-hosted do Azure DevOps

Configure um agent pool e agente do Azure DevOps:

```bash
# Create an agent pool in Azure DevOps (via REST API, as CLI only supports list/show)
az devops invoke \
  --area distributedtask \
  --resource pools \
  --org "https://dev.azure.com/contoso" \
  --http-method POST \
  --in-file - <<< '{"name": "contoso-linux-pool", "autoProvision": true}'

# On the agent VM, download and configure the agent
mkdir azagent && cd azagent
curl -o vsts-agent-linux-x64-3.248.0.tar.gz -L \
  https://vstsagentpackage.azureedge.net/agent/3.248.0/vsts-agent-linux-x64-3.248.0.tar.gz
tar xzf ./vsts-agent-linux-x64-3.248.0.tar.gz

# Configure the agent with a PAT
./config.sh \
  --unattended \
  --url https://dev.azure.com/contoso \
  --auth pat \
  --token <PAT_TOKEN> \
  --pool "contoso-linux-pool" \
  --agent contoso-agent-linux-01 \
  --acceptTeeEula \
  --replace

# Install and start as a service
sudo ./svc.sh install
sudo ./svc.sh start
```

Declare capacidades do agente e demandas no pipeline:

```yaml
pool:
  name: contoso-linux-pool
  demands:
    - docker
    - Agent.OS -equals Linux
    - dotnet8

# Or use vmImage for hosted
pool:
  vmImage: "ubuntu-latest"
```

## Tarefa 5: Configurar agentes de scale set para auto-scaling

Use Azure Virtual Machine Scale Sets (VMSS) para pools de agentes elÃ¡sticos:

```bash
# Create a VMSS for Azure DevOps agents
az vmss create \
  --resource-group contoso-agents-rg \
  --name contoso-agent-vmss \
  --image Ubuntu2404 \
  --vm-sku Standard_D4s_v5 \
  --instance-count 0 \
  --upgrade-policy-mode manual \
  --single-placement-group false \
  --admin-username agentadmin \
  --generate-ssh-keys \
  --vnet-name contoso-agents-vnet \
  --subnet agents-subnet \
  --load-balancer "" \
  --custom-data cloud-init-agent.yaml

# Create scale set pool in Azure DevOps (via UI):
# Organization Settings > Agent pools > Add pool > Azure virtual machine scale set
# Configure:
#   - Minimum agents: 0
#   - Maximum agents: 10
#   - Idle timeout: 30 minutes
#   - Desired idle agents: 2
```

ConfiguraÃ§Ã£o cloud-init para provisionamento automÃ¡tico do agente (`cloud-init-agent.yaml`):

```yaml
#cloud-config
package_update: true
packages:
  - docker.io
  - curl
  - git
  - jq

runcmd:
  - usermod -aG docker agentadmin
  - systemctl enable docker
  - systemctl start docker
  - |
    # Install .NET SDK
    wget https://dot.net/v1/dotnet-install.sh -O /opt/dotnet-install.sh
    chmod +x /opt/dotnet-install.sh
    /opt/dotnet-install.sh --channel 8.0 --install-dir /usr/share/dotnet
    ln -s /usr/share/dotnet/dotnet /usr/bin/dotnet
  - |
    # Install Node.js
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
```

Para GitHub Actions, use o Actions Runner Controller (ARC) no Kubernetes:

```bash
# Install ARC using Helm
helm install arc \
  --namespace arc-systems \
  --create-namespace \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller

# Create a runner scale set
helm install contoso-runners \
  --namespace arc-runners \
  --create-namespace \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set \
  --set githubConfigUrl="https://github.com/contoso" \
  --set githubConfigSecret.github_token="<PAT>" \
  --set minRunners=1 \
  --set maxRunners=10
```

Use no workflow:

```yaml
jobs:
  build:
    runs-on: arc-runner-set  # Matches the scale set name
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test
```

## Tarefa 6: ConsideraÃ§Ãµes de seguranÃ§a de runners e agentes

### Runners efÃªmeros versus persistentes

```yaml
# GitHub: Ephemeral runner (recommended for public repos)
# Configure during setup:
./config.sh --ephemeral \
  --url https://github.com/contoso \
  --token <TOKEN> \
  --name ephemeral-runner-01

# Azure DevOps VMSS agents: configure "tear down after each use"
# In pool settings: "Automatically tear down virtual machines after every use" = Yes
```

### Checklist de hardening de seguranÃ§a

```bash
# 1. Run agent as non-root user with minimal permissions
useradd -m -s /bin/bash agentuser
# Configure runner under agentuser, not root

# 2. Restrict network access with firewall rules
az network nsg rule create \
  --resource-group contoso-runners-rg \
  --nsg-name runners-nsg \
  --name AllowGitHub \
  --priority 100 \
  --direction Outbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 443 \
  --destination-address-prefixes "140.82.112.0/20" "143.55.64.0/20"

# 3. Limit runner group to specific repositories
# 4. Use short-lived registration tokens
# 5. Enable audit logging for runner activity
# 6. Use just-in-time runner provisioning (ephemeral)
```

### Gerenciamento de credenciais do runner

```yaml
# GitHub: Use OIDC for cloud authentication (no stored secrets)
jobs:
  deploy:
    runs-on: [self-hosted, linux]
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Azure login with OIDC
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

## Tarefa 7: AnÃ¡lise de custos

### CÃ¡lculo de ponto de equilÃ­brio

```text
GitHub-hosted runner costs (per minute):
  Linux:   $0.008/min
  Windows: $0.016/min
  macOS:   $0.08/min

Monthly usage estimate for Contoso:
  Linux builds:   200 builds x 10 min = 2,000 min = $16/month
  macOS iOS:      50 builds x 20 min = 1,000 min = $80/month
  Total hosted:   $96/month

Self-hosted alternative:
  Azure VM (Standard_D4s_v5):
    On-demand: ~$140/month (always on)
    Spot pricing: ~$28/month (with interruption risk)
    Reserved 1yr: ~$89/month
  Maintenance overhead: ~$500/month (engineer time)

Break-even analysis:
  - Hosted is cheaper until ~50 hours/month on macOS
  - Self-hosted makes sense when:
    a) You need private network access (no hosted option)
    b) Build times exceed 5,000+ min/month on Linux
    c) macOS builds exceed 1,000 min/month
    d) You need custom hardware or persistent caches
```

### Matriz de decisÃ£o

| Requisito | RecomendaÃ§Ã£o | Justificativa |
|-----------|-------------|---------------|
| Builds iOS (macOS) | Mac Mini self-hosted ou Orka | Multiplicador de custo 10x para macOS hospedado |
| Acesso a SQL on-premises | Self-hosted na rede corporativa | Runners hospedados nÃ£o podem alcanÃ§ar redes privadas |
| Builds Docker com cache | Self-hosted com cache Docker local | Evita baixar imagens base novamente a cada build |
| CI simples (lint, teste unitÃ¡rio) | Hospedado pelo GitHub | Baixo custo, zero manutenÃ§Ã£o |
| Compliance (residÃªncia de dados) | Self-hosted na regiÃ£o exigida | Controle sobre onde cÃ³digo e artefatos residem |

## ExercÃ­cios de quebra e conserto

### ExercÃ­cio 1: Falha de conectividade do runner

Um runner self-hosted aparece como "Offline" no GitHub. Diagnostique:

```bash
# Check runner service status
sudo ./svc.sh status
# Output: active (running)

# Check runner logs
cat _diag/Runner_*.log | tail -50
# Shows: "Failed to connect. Http response code: 403"

# Root cause: Registration token expired or runner was idle too long
# Fix: Re-register the runner
./config.sh remove --token <REMOVAL_TOKEN>
./config.sh \
  --url https://github.com/contoso \
  --token <NEW_REGISTRATION_TOKEN> \
  --name contoso-runner-linux-01 \
  --labels linux,docker,on-prem \
  --replace
sudo ./svc.sh start
```

### ExercÃ­cio 2: Incompatibilidade de capacidade do agente

Um pipeline do Azure DevOps falha com "No agent found in pool matching demands":

```yaml
pool:
  name: contoso-linux-pool
  demands:
    - dotnet8
    - docker
    - Agent.OS -equals Linux
```

**DiagnÃ³stico:** O agente nÃ£o anuncia a capacidade `dotnet8`.


<details>
<summary>Mostrar soluÃ§Ã£o</summary>

**CorreÃ§Ã£o:** Adicione a capacidade ao agente ou defina-a como variÃ¡vel de ambiente:

```bash
# On the agent machine, add the capability
# Option 1: Environment variable (auto-detected)
echo 'export dotnet8=/usr/share/dotnet' >> ~/.bashrc

# Option 2: Add via Azure DevOps UI
# Organization Settings > Agent pools > contoso-linux-pool > Agents > 
# Select agent > Capabilities > Add "dotnet8" = "/usr/share/dotnet"

# Restart the agent
sudo ./svc.sh stop
sudo ./svc.sh start
```

</details>
## VerificaÃ§Ã£o de conhecimento

<KnowledgeCheck questions={[
  {
    question: "Quando uma organizaÃ§Ã£o deve usar runners self-hosted em vez de runners hospedados pelo GitHub?",
    options: [
      "Quando querem evitar manter a infraestrutura de runners",
      "Quando builds precisam acessar recursos em uma rede privada",
      "Quando querem patching automÃ¡tico de seguranÃ§a do SO do runner",
      "Quando precisam da configuraÃ§Ã£o mais simples possÃ­vel"
    ],
    correctIndex: 1,
    explanation: "Runners self-hosted sÃ£o necessÃ¡rios quando workflows precisam acessar recursos que nÃ£o sÃ£o alcanÃ§Ã¡veis pela internet pÃºblica, como bancos de dados on-premises, APIs internas ou recursos de rede privada. Este Ã© o principal motivador tÃ©cnico para runners self-hosted alÃ©m da otimizaÃ§Ã£o de custos em escala."
  },
  {
    question: "Qual Ã© o propÃ³sito da flag '--ephemeral' ao configurar um runner self-hosted do GitHub Actions?",
    options: [
      "O runner exclui seu registro apÃ³s um timeout configurÃ¡vel",
      "O runner aceita apenas um job e depois se desregistra automaticamente",
      "O runner usa armazenamento temporÃ¡rio que Ã© limpo entre jobs",
      "O runner nÃ£o persiste logs em disco"
    ],
    correctIndex: 1,
    explanation: "Um runner efÃªmero Ã© projetado para executar exatamente um job e depois se desregistrar automaticamente. Isso fornece a mesma garantia de ambiente limpo dos runners hospedados pelo GitHub enquanto permite infraestrutura self-hosted. Ele previne vazamento de credenciais ou contaminaÃ§Ã£o do workspace entre jobs de diferentes workflows."
  },
  {
    question: "No Azure DevOps, o que determina se um agente self-hosted pode executar um pipeline especÃ­fico?",
    options: [
      "O nome do agente deve corresponder Ã  configuraÃ§Ã£o do pipeline",
      "O agente deve estar no pool correto e satisfazer todas as 'demands' especificadas no pipeline",
      "O agente deve ter a mesma assinatura Azure que o pipeline",
      "O SO do agente deve corresponder ao 'vmImage' especificado no pipeline"
    ],
    correctIndex: 1,
    explanation: "O Azure DevOps usa um sistema de capabilities/demands. Agentes anunciam suas capabilities (ferramentas instaladas, SO, capabilities customizadas) e pipelines declaram demands. O orquestrador sÃ³ atribui um job a um agente quando todas as demands sÃ£o satisfeitas pelas capabilities do agente dentro do pool especificado."
  },
  {
    question: "Qual Ã© a principal vantagem de usar Azure Virtual Machine Scale Sets (VMSS) para pools de agentes do Azure DevOps?",
    options: [
      "Agentes VMSS sÃ£o mais baratos que agentes hospedados pela Microsoft",
      "VMSS escala automaticamente a contagem de agentes com base na demanda da fila e pode escalar a zero quando ocioso",
      "Agentes VMSS tÃªm conectividade de rede mais rÃ¡pida que agentes hospedados",
      "VMSS fornece gerenciamento de secrets embutido para agentes"
    ],
    correctIndex: 1,
    explanation: "Pools de agentes baseados em VMSS habilitam escalabilidade elÃ¡stica. O Azure DevOps solicita automaticamente mais instÃ¢ncias de VM quando jobs estÃ£o na fila e reduz a escala durante perÃ­odos ociosos. Isso evita pagar por infraestrutura sempre ativa enquanto fornece builds mais rÃ¡pidos do que esperar por agentes hospedados serem provisionados. A capacidade de escalar a zero significa sem custo quando nenhum build estÃ¡ em execuÃ§Ã£o."
  }
]} />

## Limpeza

```bash
# Remove self-hosted GitHub runner
cd ~/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh uninstall
./config.sh remove --token <REMOVAL_TOKEN>

# Delete the Azure VM
az vm delete --resource-group contoso-runners-rg --name contoso-runner-linux-01 --yes
az network nic delete --resource-group contoso-runners-rg --name contoso-runner-linux-01VMNic
az disk delete --resource-group contoso-runners-rg --name contoso-runner-linux-01_OsDisk --yes

# Remove Azure DevOps agent pool
az pipelines pool delete --pool-id <pool-id> \
  --organization "https://dev.azure.com/contoso"

# Delete VMSS
az vmss delete --resource-group contoso-agents-rg --name contoso-agent-vmss

# Delete resource group
az group delete --name contoso-runners-rg --yes --no-wait
az group delete --name contoso-agents-rg --yes --no-wait
```
