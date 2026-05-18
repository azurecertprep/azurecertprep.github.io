---
sidebar_position: 7
title: "Challenge 07: Design Authorization for On-Premises Resources"
---

import SuccessChecklist from '@site/src/components/SuccessChecklist';

# Challenge 07: Design Authorization for On-Premises Resources

:::info Tempo Estimado e Custo

**60-90 min** | **Custo estimado**: $10-30 | **Peso no Exame: 25-30%**

:::

## Introducao

A Adventure Works Cycles e uma empresa de manufatura com 3.000 funcionarios passando por uma transformacao de nuvem hibrida. Enquanto suas novas aplicacoes sao cloud-native, eles dependem fortemente de varias aplicacoes legadas on-premises que nao podem ser facilmente modernizadas:

1. **HR Portal**: Uma aplicacao ASP.NET baseada em IIS usando Windows Integrated Authentication (Kerberos). Contem dados sensiveis de funcionarios e atualmente e acessivel apenas pela rede corporativa.
2. **Engineering File Shares**: Compartilhamentos de arquivo do Windows Server contendo desenhos CAD e especificacoes de fabricacao. Equipes de engenharia (incluindo 200 trabalhadores remotos) precisam de acesso diario.
3. **Manufacturing ERP System**: Uma aplicacao thick client conectando a um SQL Server on-premises que requer autenticacao NTLM com maquinas ingressadas no dominio.
4. **Supplier Portal**: Uma aplicacao web legada usada por 50 fornecedores externos que atualmente requer acesso VPN para ser alcancada.

A empresa deseja:
- Habilitar single sign-on (SSO) para o HR Portal e Supplier Portal de qualquer lugar sem exigir VPN
- Permitir que trabalhadores remotos acessem compartilhamentos de arquivo sem VPN
- Manter autenticacao Kerberos/NTLM para aplicacoes que a requerem
- Eventualmente migrar usuarios de thick-client para dispositivos gerenciados em nuvem mantendo acesso ao ERP

Sua tarefa e projetar solucoes que conectem identidades em nuvem com recursos on-premises, fornecendo acesso remoto seguro sem expor a rede corporativa.

## Habilidades do Exame Cobertas

- Recomendar uma solucao para autorizar acesso a recursos on-premises
- Recomendar uma solucao de autenticacao
- Recomendar uma solucao de gerenciamento de identidade

## Tarefas de Design

### Parte 1: Matriz de Selecao de Solucao

1. Para cada aplicacao, avalie e recomende a solucao de acesso apropriada:

| Application | Requirements | Options to Evaluate | Recommended Solution |
|-------------|-------------|--------------------|--------------------|
| HR Portal (Kerberos/IIS) | SSO, no VPN, secure | App Proxy, Azure AD DS, VPN, P2S | |
| Engineering File Shares | Remote access, domain-joined | Azure Files, App Proxy, VPN, Azure AD DS | |
| Manufacturing ERP (NTLM) | Domain-joined thick client | Azure AD DS, VPN, AVD | |
| Supplier Portal (external users) | B2B access, no VPN | App Proxy + B2B, SWA, modernize | |

2. Documente os criterios de decisao para cada escolha:
   - Suporte a protocolo de autenticacao (Kerberos, NTLM, header-based)
   - Requisitos de topologia de rede (linha de visao para DCs, posicionamento de conectores)
   - Impacto na experiencia do usuario
   - Implicacoes de licenciamento e custo

### Parte 2: Design do Microsoft Entra Application Proxy

3. Projete a arquitetura do Application Proxy para o HR Portal:
   - Topologia de grupo de conectores (quantos conectores, onde implantados, consideracoes de HA)
   - Metodo de pre-autenticacao (Entra ID vs. passthrough)
   - Configuracao de Kerberos Constrained Delegation (KCD)
   - Integracao com politica de Conditional Access
   - Mapeamento de URL interna vs. URL externa

4. Projete o Application Proxy para o Supplier Portal:
   - Integracao de acesso de convidado B2B
   - Como fornecedores externos se autenticam
   - Requisitos de Conditional Access para usuarios externos
   - Controles de sessao (frequencia de login, requisitos de MFA)

5. Implante um conector de Application Proxy (ou documente a arquitetura de implantacao se recursos on-premises nao estiverem disponiveis).

### Parte 3: Design do Microsoft Entra Domain Services

6. Avalie se o Microsoft Entra Domain Services (Entra DS) e apropriado para a Adventure Works:
   - Quais cenarios se beneficiam do Entra DS vs. AD DS tradicional vs. Application Proxy
   - Design de VNet para implantacao do Entra DS
   - Requisitos de sincronizacao de hash de senha
   - Limitacoes comparadas ao AD DS completo (sem extensoes de schema, sem relacoes de confianca, sem flexibilidade de GPO)

7. Projete a implantacao do Entra DS para o cenario do ERP de manufatura:
   - Requisitos de VNet e subnet
   - Integracao com Entra Connect sync existente
   - Como dispositivos gerenciados em nuvem se autenticarao no ERP (NTLM/Kerberos atraves do Entra DS)
   - Configuracao de DNS

### Parte 4: Azure Files para Acesso Hibrido a Arquivos

8. Projete a integracao do Azure Files para os compartilhamentos de arquivo de engenharia:
   - Autenticacao baseada em identidade (Entra DS, on-prem AD DS, ou Entra Kerberos)
   - Permissoes em nivel de compartilhamento (RBAC) vs. permissoes em nivel de diretorio/arquivo (NTFS ACLs)
   - Selecao de camada de acesso (Hot vs. Cool para arquivos CAD)
   - Consideracoes de Azure File Sync para cache em filiais
   - Selecao de protocolo (SMB 3.0 com criptografia)

9. Projete o caminho de migracao dos compartilhamentos de arquivo on-premises para o Azure Files:
   - Estrategia de coexistencia durante a transicao (Azure File Sync como ponte)
   - Como manter permissoes NTFS existentes
   - Conectividade do cliente (private endpoint vs. public endpoint com restricoes)

### Parte 5: Implementar Prova de Conceito

10. Crie um compartilhamento Azure Files com autenticacao baseada em identidade habilitada.

11. Documente a arquitetura completa de implantacao do Application Proxy para o HR Portal, incluindo posicionamento de conectores, configuracao de KCD e politicas de Conditional Access.

## Criterios de Sucesso

<SuccessChecklist
  storageKey="az305-challenge-07"
  items={[
    "Solution selection matrix completed with justified recommendations for all four applications",
    "Application Proxy architecture designed with connector groups, KCD, and Conditional Access",
    "Entra Domain Services evaluated with clear documentation of when to use vs. alternatives",
    "Azure Files designed with identity-based authentication and hybrid permissions model",
    "Migration path from on-premises file shares documented with coexistence strategy",
    "At least one component deployed (Azure Files share or Application Proxy connector architecture)"
  ]}
/>

## Dicas

<details>
<summary>Dica 1: Arquitetura do Application Proxy</summary>

O Microsoft Entra Application Proxy consiste em:
- **Servico em nuvem**: Hospedado pela Microsoft, lida com URLs externas e pre-autenticacao
- **Conector(es)**: Agentes leves instalados em Windows Servers dentro da sua rede (sem regras de firewall de entrada necessarias)
- **Aplicacao publicada**: A aplicacao on-premises tornada acessivel via URL externa

Decisoes-chave de arquitetura:
- Instale 2+ conectores por grupo de conectores para alta disponibilidade
- Posicione conectores proximos aos servidores de aplicacao (mesmo segmento de rede)
- Conectores fazem conexoes HTTPS somente de saida (sem portas de entrada necessarias)
- Use grupos de conectores para segregar aplicacoes (conectores HR vs. conectores de fornecedores)
- Para KCD: conectores devem ser ingressados no dominio e capazes de obter tickets Kerberos em nome dos usuarios

Opcoes de pre-autenticacao:
- **Microsoft Entra ID**: Usuario se autentica com Entra ID antes de alcancar a aplicacao (habilita Conditional Access, MFA)
- **Passthrough**: Sem pre-autenticacao, a aplicacao lida com autenticacao diretamente (menos seguro, cenarios limitados)

</details>

<details>
<summary>Dica 2: Kerberos Constrained Delegation (KCD) para SSO</summary>

Para SSO em aplicacoes IIS usando Windows Integrated Authentication:

1. Registre um Service Principal Name (SPN) para a aplicacao backend
2. Configure a conta de computador do conector do Application Proxy para KCD no AD
3. Defina a aplicacao do Application Proxy para usar "Integrated Windows Authentication" para SSO

```powershell
# On Active Directory (domain controller or admin workstation)
# 1. Register SPN for the backend app service account
setspn -S HTTP/hrportal.adventureworks.local svc_hrportal

# 2. Configure KCD on the connector computer account
# In AD Users & Computers:
# Connector computer account > Properties > Delegation tab
# "Trust this computer for delegation to specified services only"
# "Use any authentication protocol"
# Add: HTTP/hrportal.adventureworks.local
```

O fluxo de autenticacao:
1. Usuario acessa a URL externa (https://hrportal-adventureworks.msappproxy.net)
2. Entra ID autentica o usuario (MFA, Conditional Access)
3. Token e enviado ao conector
4. Conector solicita um ticket Kerberos para o usuario via KCD
5. Conector apresenta o ticket Kerberos para a aplicacao IIS
6. Usuario obtem SSO sem ver uma tela de login

</details>

<details>
<summary>Dica 3: Entra Domain Services vs. AD DS vs. Application Proxy</summary>

| Feature | Entra Domain Services | On-Prem AD DS | Application Proxy |
|---------|----------------------|---------------|-------------------|
| Kerberos/NTLM auth | Yes | Yes | Yes (via KCD) |
| Domain join cloud VMs | Yes | Yes (with VPN/ER) | No |
| LDAP support | Yes (read-only LDAPS) | Yes (full LDAP) | No |
| Group Policy | Limited (built-in GPOs) | Full GPO | No |
| Schema extensions | No | Yes | N/A |
| Forest trusts | No | Yes | N/A |
| Management overhead | Low (PaaS) | High (IaaS) | Low (SaaS) |
| Best for | Lift-and-shift legacy apps | Full AD functionality | Web app remote access |

Use **Application Proxy** quando: Aplicacao web precisa de acesso remoto com SSO, sem VPN desejada
Use **Entra DS** quando: Aplicacoes precisam de domain-join ou LDAP, nao podem ser colocadas atras de um reverse proxy
Use **On-Prem AD DS (em Azure VMs)** quando: Precisa de funcionalidade completa do AD (trusts, extensoes de schema, GPO complexo)

</details>

<details>
<summary>Dica 4: Azure Files com Autenticacao Baseada em Identidade</summary>

```bash
# Create storage account with Azure AD DS authentication
az storage account create \
  --name stadventureworksfiles \
  --resource-group rg-files \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Enable identity-based authentication (on-premises AD DS)
az storage account update \
  --name stadventureworksfiles \
  --resource-group rg-files \
  --enable-files-adds true \
  --domain-name "adventureworks.local" \
  --net-bios-domain-name "ADVENTUREWORKS" \
  --forest-name "adventureworks.local" \
  --domain-guid "<domain-guid>" \
  --domain-sid "<domain-sid>" \
  --azure-storage-sid "<storage-account-sid>"

# Create the file share
az storage share-rm create \
  --storage-account stadventureworksfiles \
  --resource-group rg-files \
  --name engineering-cad \
  --quota 5120 \
  --access-tier Hot

# Assign share-level RBAC (Storage File Data SMB Share Contributor)
az role assignment create \
  --assignee-object-id $(az ad group show -g "Engineering-Team" --query id -o tsv) \
  --role "Storage File Data SMB Share Contributor" \
  --scope "/subscriptions/{sub}/resourceGroups/rg-files/providers/Microsoft.Storage/storageAccounts/stadventureworksfiles/fileServices/default/fileshares/engineering-cad"
```

Modelo de acesso (duas camadas):
1. **Nivel de compartilhamento**: Funcoes Azure RBAC (Storage File Data SMB Share Reader/Contributor/Elevated Contributor)
2. **Nivel de arquivo/diretorio**: Windows NTFS ACLs (definidas via compartilhamento montado a partir de maquina ingressada no dominio)

</details>

<details>
<summary>Dica 5: Azure File Sync para Cenarios Hibridos</summary>

O Azure File Sync habilita cache em filiais e coexistencia de migracao:

Arquitetura:
- **Cloud endpoint**: Compartilhamento Azure Files (fonte de verdade)
- **Server endpoint**: Caminho em um Windows Server (cache local)
- **Sync group**: Vincula cloud endpoint a um ou mais server endpoints
- **Cloud tiering**: Automaticamente migra arquivos pouco acessados para o Azure, mantendo apenas arquivos quentes no disco local

Estrategia de migracao com coexistencia:
1. Implante o agente Azure File Sync nos file servers existentes
2. Crie um sync group vinculando o compartilhamento Azure Files ao caminho do compartilhamento on-premises
3. A sincronizacao inicial envia todos os dados para o Azure Files (pode levar dias para grandes conjuntos de dados)
4. Durante a coexistencia: usuarios acessam arquivos de qualquer localizacao, mudancas sincronizam bidirecionalmente
5. Cutover: redirecione usuarios para o Azure Files diretamente (via private endpoint) ou mantenha o File Sync para cache

```bash
# Create Storage Sync Service
az storagesync create \
  --name sync-adventureworks \
  --resource-group rg-files \
  --location eastus

# Create Sync Group
az storagesync sync-group create \
  --name sg-engineering-cad \
  --storage-sync-service sync-adventureworks \
  --resource-group rg-files
```

</details>

## Recursos de Aprendizagem

- [Microsoft Entra Application Proxy](https://learn.microsoft.com/en-us/entra/identity/app-proxy/overview-what-is-app-proxy)
- [KCD for SSO with Application Proxy](https://learn.microsoft.com/en-us/entra/identity/app-proxy/how-to-configure-sso-with-kcd)
- [Microsoft Entra Domain Services overview](https://learn.microsoft.com/en-us/entra/identity/domain-services/overview)
- [Azure Files identity-based authentication](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-active-directory-overview)
- [Azure File Sync planning](https://learn.microsoft.com/en-us/azure/storage/file-sync/file-sync-planning)
- [Enable B2B external collaboration](https://learn.microsoft.com/en-us/entra/external-id/what-is-b2b)
- [Conditional Access for Application Proxy apps](https://learn.microsoft.com/en-us/entra/identity/app-proxy/how-to-configure-conditional-access)

## Verificacao de Conhecimento

<details>
<summary>1. A Adventure Works tem uma aplicacao web IIS on-premises usando Windows Integrated Authentication. Usuarios remotos precisam de SSO sem VPN. Qual solucao fornece isso com a menor mudanca de infraestrutura?</summary>

**Microsoft Entra Application Proxy com Kerberos Constrained Delegation (KCD).** O Application Proxy fornece acesso externo sem modificar a aplicacao ou abrir portas de firewall de entrada. O conector (instalado em um servidor ingressado no dominio dentro da rede) usa KCD para obter tickets Kerberos em nome de usuarios pre-autenticados. O usuario se autentica com o Entra ID (incluindo MFA via Conditional Access), e o conector traduz isso em um ticket Kerberos para a aplicacao IIS. Sem VPN, sem mudancas no codigo da aplicacao, sem portas de entrada.

</details>

<details>
<summary>2. Fornecedores externos precisam de acesso a uma aplicacao web on-premises. Eles devem se autenticar com suas proprias contas corporativas e ter MFA aplicado. Como voce deve projetar isso?</summary>

**Use Application Proxy combinado com colaboracao Entra ID B2B.** (1) Convide fornecedores como usuarios convidados B2B no seu tenant Entra ID. (2) Publique o portal de fornecedores via Application Proxy com pre-autenticacao Entra ID. (3) Crie uma politica de Conditional Access direcionada a usuarios convidados acessando o portal de fornecedores que exija MFA. (4) Fornecedores se autenticam com suas proprias credenciais organizacionais (federadas via B2B), sua politica de Conditional Access aplica MFA, e o Application Proxy fornece acesso a aplicacao on-premises. Fornecedores nunca precisam de acesso VPN.

</details>

<details>
<summary>3. Uma empresa quer fornecer dispositivos Windows gerenciados em nuvem (Entra joined, nao domain-joined) com acesso a compartilhamentos de arquivo SMB que requerem autenticacao Kerberos. Quais opcoes estao disponiveis?</summary>

**Duas opcoes:** (1) **Microsoft Entra Kerberos para Azure Files** -- habilita dispositivos Entra-joined a acessar compartilhamentos Azure Files usando tickets Kerberos emitidos pelo Entra ID (sem domain controller necessario, sem linha de visao para AD on-prem). Isso funciona apenas para Azure Files, nao para file servers on-premises. (2) **Microsoft Entra Domain Services** -- fornece funcionalidade de domain controller como servico gerenciado; dispositivos Entra-joined podem ser configurados para usar Entra DS para autenticacao Kerberos em recursos na mesma VNet. Para file servers puramente on-premises sem migracao para Azure Files, voce ainda precisaria de VPN/ExpressRoute mais hybrid-join ou Azure AD DS.

</details>

<details>
<summary>4. Quando voce deve implantar o Microsoft Entra Domain Services em vez de promover uma VM a domain controller no Azure IaaS?</summary>

**Escolha Entra Domain Services quando:** (1) Voce precisa de servicos de dominio basicos (LDAP, Kerberos, NTLM, Group Policy) sem gerenciar VMs de domain controller, (2) Suas aplicacoes nao requerem extensoes de schema, GPOs customizados alem de templates integrados, ou forest trusts, (3) Voce quer uma experiencia PaaS com patching automatico, replicacao e HA, (4) Seus usuarios ja sincronizam do AD on-prem via Entra Connect (Entra DS sincroniza do Entra ID). **Escolha AD DS em VMs IaaS quando:** Voce precisa de forest trusts, extensoes de schema, controle granular de GPO, ou acesso direto de escrita LDAP. Entra DS e LDAP somente leitura e nao suporta schema customizado -- aplicacoes que dependem desses recursos devem usar AD DS completo.

</details>

## Limpeza

```bash
# Delete Azure Files resources
az storage account delete --name stadventureworksfiles --resource-group rg-files --yes
az storagesync delete --name sync-adventureworks --resource-group rg-files --yes

# Delete resource group
az group delete --name rg-files --yes --no-wait

# Note: Application Proxy connectors are uninstalled from the on-premises server
# Entra Domain Services deletion is done via the portal:
# Entra ID > Domain Services > Select domain > Delete

# Delete any published enterprise applications
az ad app delete --id $(az ad app list --display-name "HR Portal - App Proxy" --query "[0].appId" -o tsv)
```

---

**Proximo**: [Challenge 08: Design Secrets & Certificate Management](/docs/az-305/identity-governance-monitoring/challenge-08)
