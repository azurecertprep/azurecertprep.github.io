---
sidebar_position: 3
title: "Challenge 21: Runner and agent infrastructure"
---
import KnowledgeCheck from '@site/src/components/KnowledgeCheck';


# Challenge 21: Runner and agent infrastructure

:::info Platform: comparison
This challenge compares GitHub Actions runners and Azure DevOps agents side by side.
:::

## Exam skills mapped

- Design and implement a GitHub runner or Azure DevOps agent infrastructure, including cost, tool selection, licenses, connectivity, and maintainability

## Scenario

Contoso Ltd has diverse build requirements across their engineering teams:

- The mobile team builds iOS apps that require macOS with Xcode
- The data engineering team runs integration tests against an on-premises SQL Server behind a firewall
- The platform team builds Docker images that need privileged access
- All teams need fast builds with cached dependencies

The current setup uses GitHub-hosted runners for everything, resulting in slow builds (no persistent cache), inability to reach on-premises resources, and high costs for macOS runners. Contoso needs a hybrid runner/agent strategy that balances cost, security, and capability.

## Task 1: Compare hosted versus self-hosted runners

| Factor | GitHub-hosted runners | Self-hosted runners |
|--------|----------------------|---------------------|
| Cost | Included minutes (2,000 for Team, 3,000 for Enterprise), then per-minute billing | Infrastructure cost only (VM, maintenance) |
| macOS rate | 10x Linux minute multiplier | Own hardware at fixed cost |
| Maintenance | Managed by GitHub (auto-updated) | Self-managed (OS patches, tool updates) |
| Clean environment | Fresh VM every job | Persistent (must manage cleanup) |
| Network access | Public internet only | Can access private networks |
| Startup time | 15-45 seconds (queue + provision) | Near-instant (already running) |
| Customization | Limited to pre-installed tools | Full control over installed software |
| Caching | actions/cache (network round-trip) | Local filesystem cache (fastest) |
| Security | Isolated by design | Shared runner risk if not ephemeral |

Azure DevOps comparison:

| Factor | Microsoft-hosted agents | Self-hosted agents |
|--------|------------------------|---------------------|
| Cost | 1 free parallel job, then $40/parallel job/month | $15/parallel job/month (licensing) + infra |
| Maintenance | Managed by Microsoft | Self-managed |
| Clean environment | Fresh VM every job | Persistent |
| Network access | Public internet only | Private network access |
| Startup time | Can be slow due to provisioning | Fast (pre-provisioned) |

## Task 2: Set up a self-hosted GitHub runner on Linux

Provision and configure a runner on an Azure Linux VM:

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

Install required build tools:

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

## Task 3: Configure runner groups and labels

Set up runner groups for organizational access control:

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

Use labels in workflow files:

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

## Task 4: Set up Azure DevOps self-hosted agent

Configure an Azure DevOps agent pool and agent:

```bash
# Create an agent pool in Azure DevOps
az pipelines pool create \
  --name "contoso-linux-pool" \
  --organization "https://dev.azure.com/contoso" \
  --project "ContosoProject"

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

Declare agent capabilities and demands in the pipeline:

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

## Task 5: Configure scale set agents for auto-scaling

Use Azure Virtual Machine Scale Sets (VMSS) for elastic agent pools:

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

Cloud-init configuration for agent auto-provisioning (`cloud-init-agent.yaml`):

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

For GitHub Actions, use the Actions Runner Controller (ARC) on Kubernetes:

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

Use in a workflow:

```yaml
jobs:
  build:
    runs-on: arc-runner-set  # Matches the scale set name
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test
```

## Task 6: Runner and agent security considerations

### Ephemeral versus persistent runners

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

### Security hardening checklist

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

### Runner credential management

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

## Task 7: Cost analysis

### Break-even calculation

```
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

### Decision matrix

| Requirement | Recommendation | Rationale |
|-------------|---------------|-----------|
| iOS builds (macOS) | Self-hosted Mac Mini or Orka | 10x cost multiplier for hosted macOS |
| On-premises SQL access | Self-hosted in corporate network | Hosted runners cannot reach private networks |
| Docker builds with cache | Self-hosted with local Docker cache | Avoids re-pulling base images every build |
| Simple CI (lint, unit test) | GitHub-hosted | Low cost, zero maintenance |
| Compliance (data residency) | Self-hosted in required region | Control over where code and artifacts reside |

## Break and fix

### Exercise 1: Runner connectivity failure

A self-hosted runner shows as "Offline" in GitHub. Diagnose:

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

### Exercise 2: Agent capability mismatch

An Azure DevOps pipeline fails with "No agent found in pool matching demands":

```yaml
pool:
  name: contoso-linux-pool
  demands:
    - dotnet8
    - docker
    - Agent.OS -equals Linux
```

**Diagnosis:** The agent does not advertise the `dotnet8` capability.


<details>
<summary>Solution</summary>

**Fix:** Add the capability to the agent or set it as an environment variable:

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
## Knowledge check

<KnowledgeCheck questions={[
  {
    question: "When should an organization use self-hosted runners instead of GitHub-hosted runners?",
    options: [
      "When they want to avoid maintaining runner infrastructure",
      "When builds need access to resources on a private network",
      "When they want automatic security patching of the runner OS",
      "When they need the simplest possible setup"
    ],
    correctIndex: 1,
    explanation: "Self-hosted runners are required when workflows need to access resources that are not reachable from the public internet, such as on-premises databases, internal APIs, or private network resources. This is the primary technical driver for self-hosted runners beyond cost optimization at scale."
  },
  {
    question: "What is the purpose of the '--ephemeral' flag when configuring a GitHub Actions self-hosted runner?",
    options: [
      "The runner deletes its registration after a configurable timeout",
      "The runner accepts only one job and then de-registers itself",
      "The runner uses temporary storage that is cleared between jobs",
      "The runner does not persist logs to disk"
    ],
    correctIndex: 1,
    explanation: "An ephemeral runner is designed to execute exactly one job and then automatically de-register. This provides the same clean-environment guarantee as GitHub-hosted runners while allowing self-hosted infrastructure. It prevents credential leakage or workspace contamination between jobs from different workflows."
  },
  {
    question: "In Azure DevOps, what determines whether a self-hosted agent can run a specific pipeline?",
    options: [
      "The agent's name must match the pipeline configuration",
      "The agent must be in the correct pool and satisfy all 'demands' specified in the pipeline",
      "The agent must have the same Azure subscription as the pipeline",
      "The agent's OS must match the 'vmImage' specified in the pipeline"
    ],
    correctIndex: 1,
    explanation: "Azure DevOps uses a capabilities/demands system. Agents advertise their capabilities (installed tools, OS, custom capabilities), and pipelines declare demands. The orchestrator only assigns a job to an agent when all demands are met by the agent's capabilities within the specified pool."
  },
  {
    question: "What is the primary advantage of using Azure Virtual Machine Scale Sets (VMSS) for Azure DevOps agent pools?",
    options: [
      "VMSS agents are cheaper than Microsoft-hosted agents",
      "VMSS automatically scales agent count based on queue demand and can scale to zero when idle",
      "VMSS agents have faster network connectivity than hosted agents",
      "VMSS provides built-in secret management for agents"
    ],
    correctIndex: 1,
    explanation: "VMSS-backed agent pools enable elastic scaling. Azure DevOps automatically requests more VM instances when jobs are queued and scales down during idle periods. This avoids paying for always-on infrastructure while providing faster builds than waiting for hosted agents to provision. The scale-to-zero capability means no cost when no builds are running."
  }
]} />

## Cleanup

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
