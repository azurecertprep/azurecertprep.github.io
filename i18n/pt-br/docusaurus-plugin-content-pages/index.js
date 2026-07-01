import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

const stats = [
  { number: '327', label: 'Desafios' },
  { number: '8', label: 'Exames' },
  { number: '100%', label: 'Cobertura' },
  { number: 'v2026.05', label: 'Objetivos do Exame' },
];

const challenges = [
  { num: '01', title: 'Entra ID: Usuários & Grupos', domain: 'identity', href: '/docs/az-104/identity/challenge-01' },
  { num: '02', title: 'RBAC & Gerenciamento de Acesso', domain: 'identity', href: '/docs/az-104/identity/challenge-02' },
  { num: '03', title: 'Azure Policy & Governança', domain: 'identity', href: '/docs/az-104/identity/challenge-03' },
  { num: '04', title: 'Contas de Armazenamento & Acesso', domain: 'storage', href: '/docs/az-104/storage/challenge-04' },
  { num: '05', title: 'Blob Storage & Azure Files', domain: 'storage', href: '/docs/az-104/storage/challenge-05' },
  { num: '06', title: 'Segurança de Armazenamento & Ciclo de Vida', domain: 'storage', href: '/docs/az-104/storage/challenge-06' },
  { num: '07', title: 'Templates ARM & Bicep', domain: 'compute', href: '/docs/az-104/compute/challenge-07' },
  { num: '08', title: 'VMs & Scale Sets', domain: 'compute', href: '/docs/az-104/compute/challenge-08' },
  { num: '09', title: 'Contêineres no Azure', domain: 'compute', href: '/docs/az-104/compute/challenge-09' },
  { num: '10', title: 'Azure App Service', domain: 'compute', href: '/docs/az-104/compute/challenge-10' },
  { num: '11', title: 'Redes Virtuais & Sub-redes', domain: 'networking', href: '/docs/az-104/networking/challenge-11' },
  { num: '12', title: 'Segurança de Rede', domain: 'networking', href: '/docs/az-104/networking/challenge-12' },
  { num: '13', title: 'DNS & Balanceamento de Carga', domain: 'networking', href: '/docs/az-104/networking/challenge-13' },
  { num: '14', title: 'Azure Monitor & Alertas', domain: 'monitor', href: '/docs/az-104/monitor/challenge-14' },
  { num: '15', title: 'Backup & Recuperação', domain: 'monitor', href: '/docs/az-104/monitor/challenge-15' },
  { num: '16', title: 'Capstone: Um Dia na Vida', domain: 'monitor', href: '/docs/az-104/capstone/challenge-16' },
  { num: '17', title: 'Grupos de Gerenciamento & Assinaturas', domain: 'identity', href: '/docs/az-104/identity/challenge-17' },
  { num: '18', title: 'Gerenciamento de Custos & Azure Advisor', domain: 'identity', href: '/docs/az-104/identity/challenge-18' },
  { num: '19', title: 'AzCopy & Migração de Armazenamento', domain: 'storage', href: '/docs/az-104/storage/challenge-19' },
  { num: '20', title: 'Criptografia de Armazenamento & Proteção de Dados', domain: 'storage', href: '/docs/az-104/storage/challenge-20' },
  { num: '21', title: 'Extensões de VM & Automação', domain: 'compute', href: '/docs/az-104/compute/challenge-21' },
  { num: '22', title: 'Discos de VM & Criptografia', domain: 'compute', href: '/docs/az-104/compute/challenge-22' },
  { num: '23', title: 'App Service: Configuração Avançada', domain: 'compute', href: '/docs/az-104/compute/challenge-23' },
  { num: '24', title: 'Rotas Definidas pelo Usuário & Controle de Tráfego', domain: 'networking', href: '/docs/az-104/networking/challenge-24' },
  { num: '25', title: 'Private Endpoints & Service Endpoints', domain: 'networking', href: '/docs/az-104/networking/challenge-25' },
  { num: '26', title: 'Network Watcher & Diagnósticos', domain: 'networking', href: '/docs/az-104/networking/challenge-26' },
  { num: '27', title: 'Log Analytics & KQL em Profundidade', domain: 'monitor', href: '/docs/az-104/monitor/challenge-27' },
  { num: '28', title: 'Azure Advisor & Service Health', domain: 'monitor', href: '/docs/az-104/monitor/challenge-28' },
];

const domainLabels = {
  identity: 'Identidade & Governança',
  storage: 'Armazenamento',
  compute: 'Computação',
  networking: 'Rede',
  monitor: 'Monitoramento',
};

const az305DomainLabels = {
  'identity-gov': 'Identidade & Governança',
  'data': 'Armazenamento de Dados',
  'bcdr': 'Continuidade de Negócios',
  'infra': 'Infraestrutura',
  'capstone': 'Capstone',
};

const az400DomainLabels = {
  'processes': 'Processos & Comunicação',
  'source-control': 'Controle de Código-Fonte',
  'packages': 'Gerenciamento de Pacotes',
  'testing': 'Testes',
  'pipelines': 'Fundamentos de Pipelines',
  'deployment': 'Estratégias de Implantação',
  'iac': 'Infraestrutura como Código',
  'operations': 'Operações de Pipelines',
  'security': 'Segurança & Conformidade',
  'instrumentation': 'Instrumentação',
  'capstone': 'Capstone',
};

const az400Challenges = [
  { num: '01', title: 'Planejamento Ágil & Acompanhamento', domain: 'processes', href: '/docs/az-400/processes-communications/challenge-01' },
  { num: '02', title: 'Colaboração & Comunicação', domain: 'processes', href: '/docs/az-400/processes-communications/challenge-02' },
  { num: '03', title: 'Feedback & Retrospectivas', domain: 'processes', href: '/docs/az-400/processes-communications/challenge-03' },
  { num: '04', title: 'Estrutura de Equipes & Autonomia', domain: 'processes', href: '/docs/az-400/processes-communications/challenge-04' },
  { num: '05', title: 'Planejamento de Releases & Cadência', domain: 'processes', href: '/docs/az-400/processes-communications/challenge-05' },
  { num: '06', title: 'Coordenação Entre Equipes', domain: 'processes', href: '/docs/az-400/processes-communications/challenge-06' },
  { num: '07', title: 'Estratégias de Branching', domain: 'source-control', href: '/docs/az-400/source-control/challenge-07' },
  { num: '08', title: 'Fluxos de Pull Request', domain: 'source-control', href: '/docs/az-400/source-control/challenge-08' },
  { num: '09', title: 'Estrutura de Repositórios', domain: 'source-control', href: '/docs/az-400/source-control/challenge-09' },
  { num: '10', title: 'Git Hooks & Automação', domain: 'source-control', href: '/docs/az-400/source-control/challenge-10' },
  { num: '11', title: 'Estratégias de Merge & Conflitos', domain: 'source-control', href: '/docs/az-400/source-control/challenge-11' },
  { num: '12', title: 'Monorepo vs Multi-Repo', domain: 'source-control', href: '/docs/az-400/source-control/challenge-12' },
  { num: '13', title: 'Feeds de Pacotes & Registros', domain: 'packages', href: '/docs/az-400/03a-package-management/challenge-13' },
  { num: '14', title: 'Estratégias de Versionamento', domain: 'packages', href: '/docs/az-400/03a-package-management/challenge-14' },
  { num: '15', title: 'Gerenciamento de Dependências', domain: 'packages', href: '/docs/az-400/03a-package-management/challenge-15' },
  { num: '16', title: 'Estratégia de Testes & Frameworks', domain: 'testing', href: '/docs/az-400/03b-testing-pipelines/challenge-16' },
  { num: '17', title: 'Testes de Integração & E2E', domain: 'testing', href: '/docs/az-400/03b-testing-pipelines/challenge-17' },
  { num: '18', title: 'Automação de Testes em Pipelines', domain: 'testing', href: '/docs/az-400/03b-testing-pipelines/challenge-18' },
  { num: '19', title: 'Pipelines YAML Básico', domain: 'pipelines', href: '/docs/az-400/03c-pipeline-fundamentals/challenge-19' },
  { num: '20', title: 'Pipelines Multi-Estágio', domain: 'pipelines', href: '/docs/az-400/03c-pipeline-fundamentals/challenge-20' },
  { num: '21', title: 'Templates de Pipeline & Reuso', domain: 'pipelines', href: '/docs/az-400/03c-pipeline-fundamentals/challenge-21' },
  { num: '22', title: 'Triggers & Condições', domain: 'pipelines', href: '/docs/az-400/03c-pipeline-fundamentals/challenge-22' },
  { num: '23', title: 'Agentes & Pools', domain: 'pipelines', href: '/docs/az-400/03c-pipeline-fundamentals/challenge-23' },
  { num: '24', title: 'Variáveis & Segredos de Pipeline', domain: 'pipelines', href: '/docs/az-400/03c-pipeline-fundamentals/challenge-24' },
  { num: '25', title: 'Implantação Blue-Green', domain: 'deployment', href: '/docs/az-400/03d-deployment-strategies/challenge-25' },
  { num: '26', title: 'Releases Canary', domain: 'deployment', href: '/docs/az-400/03d-deployment-strategies/challenge-26' },
  { num: '27', title: 'Feature Flags', domain: 'deployment', href: '/docs/az-400/03d-deployment-strategies/challenge-27' },
  { num: '28', title: 'Implantação Progressiva', domain: 'deployment', href: '/docs/az-400/03d-deployment-strategies/challenge-28' },
  { num: '29', title: 'Gates & Aprovações', domain: 'deployment', href: '/docs/az-400/03d-deployment-strategies/challenge-29' },
  { num: '30', title: 'Estratégias de Rollback', domain: 'deployment', href: '/docs/az-400/03d-deployment-strategies/challenge-30' },
  { num: '31', title: 'Bicep & Templates ARM', domain: 'iac', href: '/docs/az-400/03e-infrastructure-as-code/challenge-31' },
  { num: '32', title: 'Terraform para Azure', domain: 'iac', href: '/docs/az-400/03e-infrastructure-as-code/challenge-32' },
  { num: '33', title: 'Testes & Validação de IaC', domain: 'iac', href: '/docs/az-400/03e-infrastructure-as-code/challenge-33' },
  { num: '34', title: 'Cache & Performance de Pipeline', domain: 'operations', href: '/docs/az-400/03f-pipeline-operations/challenge-34' },
  { num: '35', title: 'Agentes Self-Hosted', domain: 'operations', href: '/docs/az-400/03f-pipeline-operations/challenge-35' },
  { num: '36', title: 'Monitoramento & Diagnóstico de Pipeline', domain: 'operations', href: '/docs/az-400/03f-pipeline-operations/challenge-36' },
  { num: '37', title: 'Gerenciamento de Artefatos & Retenção', domain: 'operations', href: '/docs/az-400/03f-pipeline-operations/challenge-37' },
  { num: '38', title: 'Governança de Pipeline como Código', domain: 'operations', href: '/docs/az-400/03f-pipeline-operations/challenge-38' },
  { num: '39', title: 'Gerenciamento de Segredos', domain: 'security', href: '/docs/az-400/security-compliance/challenge-39' },
  { num: '40', title: 'Workload Identity & OIDC', domain: 'security', href: '/docs/az-400/security-compliance/challenge-40' },
  { num: '41', title: 'Varredura de Dependências', domain: 'security', href: '/docs/az-400/security-compliance/challenge-41' },
  { num: '42', title: 'Análise Estática de Código', domain: 'security', href: '/docs/az-400/security-compliance/challenge-42' },
  { num: '43', title: 'Segurança de Contêineres', domain: 'security', href: '/docs/az-400/security-compliance/challenge-43' },
  { num: '44', title: 'Conformidade & Governança', domain: 'security', href: '/docs/az-400/security-compliance/challenge-44' },
  { num: '45', title: 'Segurança da Cadeia de Suprimentos', domain: 'security', href: '/docs/az-400/security-compliance/challenge-45' },
  { num: '46', title: 'Application Insights', domain: 'instrumentation', href: '/docs/az-400/instrumentation/challenge-46' },
  { num: '47', title: 'Log Analytics & KQL', domain: 'instrumentation', href: '/docs/az-400/instrumentation/challenge-47' },
  { num: '48', title: 'Alertas & Resposta a Incidentes', domain: 'instrumentation', href: '/docs/az-400/instrumentation/challenge-48' },
  { num: '49', title: 'Métricas DORA & Dashboards', domain: 'instrumentation', href: '/docs/az-400/instrumentation/challenge-49' },
  { num: '50', title: 'Engenharia de Confiabilidade', domain: 'instrumentation', href: '/docs/az-400/instrumentation/challenge-50' },
  { num: '51', title: 'Ciclo de Vida DevOps Completo', domain: 'capstone', href: '/docs/az-400/capstone/challenge-51' },
];

const az305Challenges = [
  { num: '01', title: 'Registro Centralizado', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-01' },
  { num: '02', title: 'Roteamento e Filtragem de Logs', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-02' },
  { num: '03', title: 'Monitoramento e Alertas', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-03' },
  { num: '04', title: 'Autenticacao Cloud-Native', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-04' },
  { num: '05', title: 'Gerenciamento de Identidade', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-05' },
  { num: '06', title: 'Autorizacao de Recursos Azure', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-06' },
  { num: '07', title: 'Autorizacao On-Premises', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-07' },
  { num: '08', title: 'Segredos e Certificados', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-08' },
  { num: '09', title: 'Grupos de Gerenciamento e Assinaturas', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-09' },
  { num: '10', title: 'Estrategia de Marcacao de Recursos', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-10' },
  { num: '11', title: 'Solucao de Conformidade', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-11' },
  { num: '12', title: 'Governança de Identidade', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-12' },
  { num: '13', title: 'Governança Multi-Equipe (Capstone)', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-13' },
  { num: '14', title: 'Plataforma de Dados Relacionais', domain: 'data', href: '/docs/az-305/data-storage/challenge-14' },
  { num: '15', title: 'Camadas e Computação de BD', domain: 'data', href: '/docs/az-305/data-storage/challenge-15' },
  { num: '16', title: 'Escalabilidade de BD', domain: 'data', href: '/docs/az-305/data-storage/challenge-16' },
  { num: '17', title: 'Protecao de Banco de Dados', domain: 'data', href: '/docs/az-305/data-storage/challenge-17' },
  { num: '18', title: 'Dados Semi-Estruturados', domain: 'data', href: '/docs/az-305/data-storage/challenge-18' },
  { num: '19', title: 'Dados Não Estruturados', domain: 'data', href: '/docs/az-305/data-storage/challenge-19' },
  { num: '20', title: 'Custo e Desempenho', domain: 'data', href: '/docs/az-305/data-storage/challenge-20' },
  { num: '21', title: 'Durabilidade e Protecao de Dados', domain: 'data', href: '/docs/az-305/data-storage/challenge-21' },
  { num: '22', title: 'Pipeline de Integracao', domain: 'data', href: '/docs/az-305/data-storage/challenge-22' },
  { num: '23', title: 'Solucao de Analise de Dados', domain: 'data', href: '/docs/az-305/data-storage/challenge-23' },
  { num: '24', title: 'Plataforma de Dados Completa (Capstone)', domain: 'data', href: '/docs/az-305/data-storage/challenge-24' },
  { num: '25', title: 'Objetivos de Recuperacao', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-25' },
  { num: '26', title: 'Backup para Computação', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-26' },
  { num: '27', title: 'Backup para Bancos de Dados', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-27' },
  { num: '28', title: 'Backup para Dados Não Estruturados', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-28' },
  { num: '29', title: 'Plano de DR (Capstone)', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-29' },
  { num: '30', title: 'HA para Computação', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-30' },
  { num: '31', title: 'HA para Dados Relacionais', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-31' },
  { num: '32', title: 'HA para Dados Não Relacionais', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-32' },
  { num: '33', title: 'Aplicacao Multi-Regiao (Capstone)', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-33' },
  { num: '34', title: 'Computação para Cargas de Trabalho', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-34' },
  { num: '35', title: 'Solucao Baseada em VM', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-35' },
  { num: '36', title: 'Solucao Baseada em Conteineres', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-36' },
  { num: '37', title: 'Solucao Serverless', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-37' },
  { num: '38', title: 'Arquitetura de Mensageria', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-38' },
  { num: '39', title: 'Arquitetura Orientada a Eventos', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-39' },
  { num: '40', title: 'Integracao de API', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-40' },
  { num: '41', title: 'Estrategia de Cache', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-41' },
  { num: '42', title: 'Gerenciamento de Configuracao', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-42' },
  { num: '43', title: 'Implantacao Automatizada', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-43' },
  { num: '44', title: 'Estrategia de Migracao (CAF)', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-44' },
  { num: '45', title: 'Migracao de Servidores e Apps', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-45' },
  { num: '46', title: 'Migracao de Banco de Dados', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-46' },
  { num: '47', title: 'Migracao de Dados Não Estruturados', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-47' },
  { num: '48', title: 'Conectividade de Rede', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-48' },
  { num: '49', title: 'Seguranca de Rede e Load Balancing', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-49' },
  { num: '50', title: 'Solucao Azure Completa (Capstone)', domain: 'capstone', href: '/docs/az-305/infrastructure/challenge-50' },
];

const sc500DomainLabels = {
  'identity': 'Identidade & Governança',
  'networking': 'Armazenamento & Rede',
  'compute': 'Computação Segura',
  'ai-security': 'Segurança de IA',
  'monitoring': 'Postura de Segurança',
  'capstone': 'Capstone',
};

const sc500Challenges = [
  { num: '01', title: 'Padrões de Segurança Entra ID', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-01' },
  { num: '02', title: 'Políticas de Acesso Condicional', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-02' },
  { num: '03', title: 'Gerenciamento de Identidade Privilegiada', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-03' },
  { num: '04', title: 'Proteção de Identidade & Risco', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-04' },
  { num: '05', title: 'Revisões de Acesso & Governança', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-05' },
  { num: '06', title: 'Segurança de Registro de App', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-06' },
  { num: '07', title: 'Identidades Externas & B2B', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-07' },
  { num: '08', title: 'Identidade Gerenciada & RBAC', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-08' },
  { num: '09', title: 'Azure Policy para Segurança', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-09' },
  { num: '10', title: 'Microsoft Purview DLP', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-10' },
  { num: '11', title: 'Rótulos de Sensibilidade Purview', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-11' },
  { num: '12', title: 'Auditoria & eDiscovery Purview', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-12' },
  { num: '13', title: 'Segurança de Storage Account', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-13' },
  { num: '14', title: 'Gerenciamento de Key Vault', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-14' },
  { num: '15', title: 'Segurança de SQL Database', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-15' },
  { num: '16', title: 'Segurança de Cosmos DB', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-16' },
  { num: '17', title: 'Configuração de NSG & ASG', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-17' },
  { num: '18', title: 'Azure Firewall', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-18' },
  { num: '19', title: 'Private Endpoints', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-19' },
  { num: '20', title: 'Web Application Firewall', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-20' },
  { num: '21', title: 'Proteção DDoS', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-21' },
  { num: '22', title: 'Segurança VPN & ExpressRoute', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-22' },
  { num: '23', title: 'Segmentação de Rede', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-23' },
  { num: '24', title: 'Segurança DNS', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-24' },
  { num: '25', title: 'TLS & Gerenciamento de Certificados', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-25' },
  { num: '26', title: 'Segurança de Agentes Copilot Studio', domain: 'ai-security', href: '/docs/sc-500/secure-compute/challenge-26' },
  { num: '27', title: 'Entra Agent ID & Autenticação', domain: 'ai-security', href: '/docs/sc-500/secure-compute/challenge-27' },
  { num: '28', title: 'Guardrails AI Foundry', domain: 'ai-security', href: '/docs/sc-500/secure-compute/challenge-28' },
  { num: '29', title: 'AI Gateway & APIM', domain: 'ai-security', href: '/docs/sc-500/secure-compute/challenge-29' },
  { num: '30', title: 'Defender para IA', domain: 'ai-security', href: '/docs/sc-500/secure-compute/challenge-30' },
  { num: '31', title: 'Segurança RAG & Acesso a Dados', domain: 'ai-security', href: '/docs/sc-500/secure-compute/challenge-31' },
  { num: '32', title: 'Segurança de VM & Defender', domain: 'compute', href: '/docs/sc-500/secure-compute/challenge-32' },
  { num: '33', title: 'Segurança de Container & AKS', domain: 'compute', href: '/docs/sc-500/secure-compute/challenge-33' },
  { num: '34', title: 'Segurança de App Service', domain: 'compute', href: '/docs/sc-500/secure-compute/challenge-34' },
  { num: '35', title: 'Segurança de Azure Functions', domain: 'compute', href: '/docs/sc-500/secure-compute/challenge-35' },
  { num: '36', title: 'Defender para Servidores', domain: 'compute', href: '/docs/sc-500/secure-compute/challenge-36' },
  { num: '37', title: 'Proteção de Endpoint', domain: 'compute', href: '/docs/sc-500/secure-compute/challenge-37' },
  { num: '38', title: 'Gerenciamento de Atualizações', domain: 'compute', href: '/docs/sc-500/secure-compute/challenge-38' },
  { num: '39', title: 'Setup do Defender for Cloud', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-39' },
  { num: '40', title: 'Melhoria do Secure Score', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-40' },
  { num: '41', title: 'Conformidade Regulatória', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-41' },
  { num: '42', title: 'Setup do Microsoft Sentinel', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-42' },
  { num: '43', title: 'Regras Analíticas do Sentinel', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-43' },
  { num: '44', title: 'SOAR & Playbooks', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-44' },
  { num: '45', title: 'Caça a Ameaças com KQL', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-45' },
  { num: '46', title: 'Conectores de Dados', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-46' },
  { num: '47', title: 'Workbooks & Dashboards', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-47' },
  { num: '48', title: 'Security Copilot Básico', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-48' },
  { num: '49', title: 'Security Copilot Avançado', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-49' },
  { num: '50', title: 'Gerenciamento de Incidentes', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-50' },
  { num: '51', title: 'Segurança Multi-Cloud', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-51' },
  { num: '52', title: 'Segurança Ponta a Ponta (Capstone)', domain: 'capstone', href: '/docs/sc-500/capstone/challenge-52' },
];

const az900DomainLabels = {
  'cloud-concepts': 'Conceitos de Nuvem',
  'azure-services': 'Serviços Azure',
  'management': 'Gerenciamento & Governança',
};

const az900Challenges = [
  { num: '01', title: 'O que é Computação em Nuvem?', domain: 'cloud-concepts', href: '/docs/az-900/cloud-concepts/challenge-01' },
  { num: '02', title: 'Benefícios dos Serviços em Nuvem', domain: 'cloud-concepts', href: '/docs/az-900/cloud-concepts/challenge-02' },
  { num: '03', title: 'Modelos de Preço da Nuvem', domain: 'cloud-concepts', href: '/docs/az-900/cloud-concepts/challenge-03' },
  { num: '04', title: 'IaaS — Infraestrutura como Serviço', domain: 'cloud-concepts', href: '/docs/az-900/cloud-concepts/challenge-04' },
  { num: '05', title: 'PaaS — Plataforma como Serviço', domain: 'cloud-concepts', href: '/docs/az-900/cloud-concepts/challenge-05' },
  { num: '06', title: 'SaaS — Software como Serviço', domain: 'cloud-concepts', href: '/docs/az-900/cloud-concepts/challenge-06' },
  { num: '07', title: 'Infraestrutura Global do Azure', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-07' },
  { num: '08', title: 'Hierarquia de Recursos do Azure', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-08' },
  { num: '09', title: 'Máquinas Virtuais & Disponibilidade', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-09' },
  { num: '10', title: 'Containers & Hospedagem de Apps', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-10' },
  { num: '11', title: 'Conceitos Básicos de Rede Azure', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-11' },
  { num: '12', title: 'VPN Gateway, ExpressRoute & DNS', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-12' },
  { num: '13', title: 'Storage Accounts & Tipos', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-13' },
  { num: '14', title: 'Redundância & Camadas de Armazenamento', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-14' },
  { num: '15', title: 'Opções de Migração de Dados', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-15' },
  { num: '16', title: 'Microsoft Entra ID & Autenticação', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-16' },
  { num: '17', title: 'RBAC, Acesso Condicional & IDs Externas', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-17' },
  { num: '18', title: 'Segurança — Zero Trust & Defender', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-18' },
  { num: '19', title: 'Gerenciamento de Custos & Preços', domain: 'management', href: '/docs/az-900/management-governance/challenge-19' },
  { num: '20', title: 'Governança — Policy & Resource Locks', domain: 'management', href: '/docs/az-900/management-governance/challenge-20' },
  { num: '21', title: 'Azure Cloud Shell, CLI & PowerShell', domain: 'management', href: '/docs/az-900/management-governance/challenge-21' },
  { num: '22', title: 'Azure Arc & ARM Templates', domain: 'management', href: '/docs/az-900/management-governance/challenge-22' },
  { num: '23', title: 'Azure Advisor & Service Health', domain: 'management', href: '/docs/az-900/management-governance/challenge-23' },
  { num: '24', title: 'Azure Monitor, Log Analytics & Alertas', domain: 'management', href: '/docs/az-900/management-governance/challenge-24' },
];

const az700DomainLabels = {
  'core-networking': 'Rede Principal',
  'connectivity': 'Conectividade',
  'app-delivery': 'Entrega de Apps',
  'private-access': 'Acesso Privado',
  'network-security': 'Segurança de Rede',
  'capstone': 'Capstone',
};

const az700Challenges = [
  { num: '01', title: 'Topologia Hub-Spoke VNet', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-01' },
  { num: '02', title: 'Sub-redes & Delegação', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-02' },
  { num: '03', title: 'Azure DNS & Domínios Customizados', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-03' },
  { num: '04', title: 'VNet Peering', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-04' },
  { num: '05', title: 'Peering Global & Gateway Transit', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-05' },
  { num: '06', title: 'Zonas DNS Privadas', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-06' },
  { num: '07', title: 'Rotas Definidas pelo Usuário & NVA', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-07' },
  { num: '08', title: 'Azure Virtual Network Manager', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-08' },
  { num: '09', title: 'Azure Route Server & BGP', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-09' },
  { num: '10', title: 'NAT Gateway', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-10' },
  { num: '11', title: 'Network Watcher & Diagnósticos', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-11' },
  { num: '12', title: 'Azure Bastion', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-12' },
  { num: '13', title: 'Proteção DDoS', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-13' },
  { num: '14', title: 'VPN Site-to-Site', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-14' },
  { num: '15', title: 'VPN S2S Alta Disponibilidade', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-15' },
  { num: '16', title: 'VPN SKU & Políticas IPsec', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-16' },
  { num: '17', title: 'VPN Point-to-Site', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-17' },
  { num: '18', title: 'Métodos de Autenticação P2S', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-18' },
  { num: '19', title: 'ExpressRoute Private Peering', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-19' },
  { num: '20', title: 'ExpressRoute Avançado', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-20' },
  { num: '21', title: 'ExpressRoute Microsoft Peering', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-21' },
  { num: '22', title: 'Virtual WAN Hub-Spoke', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-22' },
  { num: '23', title: 'Roteamento Virtual WAN & NVA', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-23' },
  { num: '24', title: 'Troubleshooting de Conectividade Híbrida', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-24' },
  { num: '25', title: 'Azure Load Balancer', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-25' },
  { num: '26', title: 'Cross-Region & Gateway LB', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-26' },
  { num: '27', title: 'Traffic Manager', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-27' },
  { num: '28', title: 'Fundamentos do Application Gateway', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-28' },
  { num: '29', title: 'Application Gateway TLS & Rewrites', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-29' },
  { num: '30', title: 'Escalabilidade do Application Gateway', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-30' },
  { num: '31', title: 'Azure Front Door', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-31' },
  { num: '32', title: 'Front Door Rules & Private Link', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-32' },
  { num: '33', title: 'Balanceamento Global Multi-Camada', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-33' },
  { num: '34', title: 'Private Endpoints & DNS', domain: 'private-access', href: '/docs/az-700/private-access/challenge-34' },
  { num: '35', title: 'PE para Múltiplos Serviços', domain: 'private-access', href: '/docs/az-700/private-access/challenge-35' },
  { num: '36', title: 'Private Link Service', domain: 'private-access', href: '/docs/az-700/private-access/challenge-36' },
  { num: '37', title: 'Private Link & On-Premises', domain: 'private-access', href: '/docs/az-700/private-access/challenge-37' },
  { num: '38', title: 'Service Endpoints & Políticas', domain: 'private-access', href: '/docs/az-700/private-access/challenge-38' },
  { num: '39', title: 'Migração SE para PE', domain: 'private-access', href: '/docs/az-700/private-access/challenge-39' },
  { num: '40', title: 'NSG & Application Security Groups', domain: 'network-security', href: '/docs/az-700/network-security/challenge-40' },
  { num: '41', title: 'VNet Flow Logs & Traffic Analytics', domain: 'network-security', href: '/docs/az-700/network-security/challenge-41' },
  { num: '42', title: 'Implantação do Azure Firewall', domain: 'network-security', href: '/docs/az-700/network-security/challenge-42' },
  { num: '43', title: 'Firewall Manager & Políticas', domain: 'network-security', href: '/docs/az-700/network-security/challenge-43' },
  { num: '44', title: 'Secured Virtual Hub', domain: 'network-security', href: '/docs/az-700/network-security/challenge-44' },
  { num: '45', title: 'WAF no Application Gateway', domain: 'network-security', href: '/docs/az-700/network-security/challenge-45' },
  { num: '46', title: 'WAF no Front Door', domain: 'network-security', href: '/docs/az-700/network-security/challenge-46' },
  { num: '47', title: 'Hub-Spoke com NVA Chaining', domain: 'network-security', href: '/docs/az-700/network-security/challenge-47' },
  { num: '48', title: 'Segmentação de Rede & JIT', domain: 'network-security', href: '/docs/az-700/network-security/challenge-48' },
  { num: '49', title: 'Enterprise Multi-Região (Capstone)', domain: 'capstone', href: '/docs/az-700/capstone/challenge-49' },
];

const ai900DomainLabels = {
  'ai-workloads': 'Cargas de Trabalho de IA',
  'machine-learning': 'Machine Learning',
  'computer-vision': 'Visão Computacional',
  'nlp': 'PLN',
  'generative-ai': 'IA Generativa',
  'capstone': 'Capstone',
};

const ai900Challenges = [
  { num: '01', title: 'Identificar Cargas de Trabalho de IA', domain: 'ai-workloads', href: '/docs/ai-901/ai-concepts/challenge-01' },
  { num: '02', title: 'Princípios de IA Responsável', domain: 'ai-workloads', href: '/docs/ai-901/ai-concepts/challenge-02' },
  { num: '03', title: 'Padrões e Casos de Uso de IA', domain: 'ai-workloads', href: '/docs/ai-901/ai-concepts/challenge-03' },
  { num: '04', title: 'Visão Geral dos Serviços Azure AI', domain: 'ai-workloads', href: '/docs/ai-901/ai-concepts/challenge-04' },
  { num: '05', title: 'Regressão em Machine Learning', domain: 'machine-learning', href: '/docs/ai-901/ai-concepts/challenge-05' },
  { num: '06', title: 'Classificação em Machine Learning', domain: 'machine-learning', href: '/docs/ai-901/ai-concepts/challenge-06' },
  { num: '07', title: 'Clustering em Machine Learning', domain: 'machine-learning', href: '/docs/ai-901/ai-concepts/challenge-07' },
  { num: '08', title: 'Deep Learning e Transformers', domain: 'machine-learning', href: '/docs/ai-901/ai-concepts/challenge-08' },
  { num: '09', title: 'Workspace do Azure Machine Learning', domain: 'machine-learning', href: '/docs/ai-901/ai-concepts/challenge-09' },
  { num: '10', title: 'Classificação de Imagens', domain: 'computer-vision', href: '/docs/ai-901/foundry-implementation/challenge-10' },
  { num: '11', title: 'Detecção de Objetos', domain: 'computer-vision', href: '/docs/ai-901/foundry-implementation/challenge-11' },
  { num: '12', title: 'Reconhecimento Óptico de Caracteres (OCR)', domain: 'computer-vision', href: '/docs/ai-901/foundry-implementation/challenge-12' },
  { num: '13', title: 'Detecção e Análise de Rosto', domain: 'computer-vision', href: '/docs/ai-901/foundry-implementation/challenge-13' },
  { num: '14', title: 'Análise de Texto: Frases-chave e Entidades', domain: 'nlp', href: '/docs/ai-901/foundry-implementation/challenge-14' },
  { num: '15', title: 'Análise de Sentimento e Detecção de Idioma', domain: 'nlp', href: '/docs/ai-901/foundry-implementation/challenge-15' },
  { num: '16', title: 'Reconhecimento e Síntese de Fala', domain: 'nlp', href: '/docs/ai-901/foundry-implementation/challenge-16' },
  { num: '17', title: 'Tradução de Idiomas', domain: 'nlp', href: '/docs/ai-901/foundry-implementation/challenge-17' },
  { num: '18', title: 'Serviços Azure AI Language e Speech', domain: 'nlp', href: '/docs/ai-901/foundry-implementation/challenge-18' },
  { num: '19', title: 'Fundamentos de IA Generativa', domain: 'generative-ai', href: '/docs/ai-901/foundry-implementation/challenge-19' },
  { num: '20', title: 'Azure OpenAI Service', domain: 'generative-ai', href: '/docs/ai-901/foundry-implementation/challenge-20' },
  { num: '21', title: 'Azure AI Foundry', domain: 'generative-ai', href: '/docs/ai-901/foundry-implementation/challenge-21' },
  { num: '22', title: 'Noções Básicas de Engenharia de Prompt', domain: 'generative-ai', href: '/docs/ai-901/foundry-implementation/challenge-22' },
  { num: '23', title: 'IA Responsável para IA Generativa', domain: 'generative-ai', href: '/docs/ai-901/foundry-implementation/challenge-23' },
  { num: '24', title: 'Ponta a Ponta: Portfólio Azure AI', domain: 'capstone', href: '/docs/ai-901/capstone/challenge-24' },
];

const ai102DomainLabels = {
  'plan-manage': 'Planejar & Gerenciar',
  'generative-ai': 'IA Generativa',
  'agentic': 'Agentes de IA',
  'computer-vision': 'Visão Computacional',
  'nlp': 'PLN',
  'knowledge-mining': 'Mineração de Conhecimento',
  'capstone': 'Capstone',
};

const ai102Challenges = [
  { num: '01', title: 'Selecionar o Serviço Azure AI Correto', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-01' },
  { num: '02', title: 'Criar e Configurar Recursos Azure AI', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-02' },
  { num: '03', title: 'Implantar Modelos de IA', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-03' },
  { num: '04', title: 'SDKs, REST APIs e Autenticação', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-04' },
  { num: '05', title: 'CI/CD para Soluções de IA', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-05' },
  { num: '06', title: 'Implantação em Contêiner para IA', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-06' },
  { num: '07', title: 'Monitorar Recursos Azure AI', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-07' },
  { num: '08', title: 'Gerenciamento de Custos para Serviços de IA', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-08' },
  { num: '09', title: 'Proteger Recursos Azure AI', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-09' },
  { num: '10', title: 'Implementação de IA Responsável', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-10' },
  { num: '11', title: 'Configuração do Azure AI Foundry', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-11' },
  { num: '12', title: 'Implantar Modelos de IA Generativa', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-12' },
  { num: '13', title: 'Prompt Flow', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-13' },
  { num: '14', title: 'Padrão RAG: Básico', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-14' },
  { num: '15', title: 'Padrão RAG: Avançado', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-15' },
  { num: '16', title: 'Azure OpenAI: Provisionamento e Configuração', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-16' },
  { num: '17', title: 'Engenharia de Prompt e Templates', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-17' },
  { num: '18', title: 'DALL-E e Modelos Multimodais', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-18' },
  { num: '19', title: 'Otimizar Soluções de IA Generativa', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-19' },
  { num: '20', title: 'Orquestração Multi-Modelo', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-20' },
  { num: '21', title: 'Fundamentos e Arquitetura de Agentes', domain: 'agentic', href: '/docs/ai-103/generative-ai-agents/challenge-21' },
  { num: '22', title: 'Azure AI Agent Service', domain: 'agentic', href: '/docs/ai-103/generative-ai-agents/challenge-22' },
  { num: '23', title: 'Orquestração Multi-Agente', domain: 'agentic', href: '/docs/ai-103/generative-ai-agents/challenge-23' },
  { num: '24', title: 'Azure AI Vision - Análise de Imagem', domain: 'computer-vision', href: '/docs/ai-103/computer-vision/challenge-24' },
  { num: '25', title: 'Custom Vision - Classificação de Imagens', domain: 'computer-vision', href: '/docs/ai-103/computer-vision/challenge-25' },
  { num: '26', title: 'Custom Vision - Detecção de Objetos', domain: 'computer-vision', href: '/docs/ai-103/computer-vision/challenge-26' },
  { num: '27', title: 'OCR - Extrair Texto de Imagens', domain: 'computer-vision', href: '/docs/ai-103/computer-vision/challenge-27' },
  { num: '28', title: 'Detecção e Análise de Rosto', domain: 'computer-vision', href: '/docs/ai-103/computer-vision/challenge-28' },
  { num: '29', title: 'Análise de Vídeo com Video Indexer', domain: 'computer-vision', href: '/docs/ai-103/computer-vision/challenge-29' },
  { num: '30', title: 'Análise Espacial', domain: 'computer-vision', href: '/docs/ai-103/computer-vision/challenge-30' },
  { num: '31', title: 'Análise de Texto - Frases-chave, Entidades, Sentimento', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-31' },
  { num: '32', title: 'Detecção e Redação de PII', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-32' },
  { num: '33', title: 'Tradução de Texto e Documentos', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-33' },
  { num: '34', title: 'Fala para Texto', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-34' },
  { num: '35', title: 'Texto para Fala e SSML', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-35' },
  { num: '36', title: 'Tradução de Fala', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-36' },
  { num: '37', title: 'Compreensão de Linguagem Conversacional (CLU)', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-37' },
  { num: '38', title: 'Respostas a Perguntas Personalizadas', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-38' },
  { num: '39', title: 'Modelos de Tradução Personalizados', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-39' },
  { num: '40', title: 'Azure AI Search — Índice e Skillset', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-40' },
  { num: '41', title: 'Skills Personalizadas no Azure AI Search', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-41' },
  { num: '42', title: 'Consultas de Pesquisa — Sintaxe e Filtros', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-42' },
  { num: '43', title: 'Projeções de Knowledge Store', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-43' },
  { num: '44', title: 'Pesquisa Semântica e Vetorial', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-44' },
  { num: '45', title: 'Azure Document Intelligence — Modelos Pré-construídos', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-45' },
  { num: '46', title: 'Modelos Personalizados de Document Intelligence', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-46' },
  { num: '47', title: 'Azure Content Understanding — Análise Multimodal', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-47' },
  { num: '48', title: 'Pipeline de Processamento Multi-Formato', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-48' },
  { num: '49', title: 'Solução Empresarial de IA Ponta a Ponta', domain: 'capstone', href: '/docs/ai-103/capstone/challenge-49' },
];

const coverageData = [
  {
    exam: 'AZ-900',
    title: 'Azure Fundamentals',
    challenges: 24,
    href: '/docs/az-900/overview',
    domains: [
      { name: 'Conceitos de Nuvem', weight: 27, color: 'var(--coverage-cloud-concepts)' },
      { name: 'Serviços Azure', weight: 38, color: 'var(--coverage-azure-services)' },
      { name: 'Gerenciamento & Governança', weight: 35, color: 'var(--coverage-management)' },
    ],
  },
  {
    exam: 'AZ-104',
    title: 'Azure Administrator',
    challenges: 28,
    href: '/docs/az-104/overview',
    domains: [
      { name: 'Identidade & Governança', weight: 22, color: 'var(--coverage-identity)' },
      { name: 'Armazenamento', weight: 18, color: 'var(--coverage-storage)' },
      { name: 'Computação', weight: 22, color: 'var(--coverage-compute)' },
      { name: 'Rede', weight: 18, color: 'var(--coverage-networking)' },
      { name: 'Monitorar & Manter', weight: 20, color: 'var(--coverage-monitor)' },
    ],
  },
  {
    exam: 'AZ-305',
    title: 'Solutions Architect',
    challenges: 50,
    href: '/docs/az-305/overview',
    domains: [
      { name: 'Identidade & Monitoramento', weight: 27, color: 'var(--coverage-identity)' },
      { name: 'Armazenamento de Dados', weight: 22, color: 'var(--coverage-storage)' },
      { name: 'Continuidade de Negócios', weight: 18, color: 'var(--coverage-networking)' },
      { name: 'Infraestrutura', weight: 33, color: 'var(--coverage-compute)' },
    ],
  },
  {
    exam: 'AZ-400',
    title: 'DevOps Engineer',
    challenges: 51,
    href: '/docs/az-400/overview',
    domains: [
      { name: 'Processos', weight: 12, color: 'var(--coverage-cloud-concepts)' },
      { name: 'Controle de Código-Fonte', weight: 12, color: 'var(--coverage-azure-services)' },
      { name: 'Pipelines', weight: 39, color: 'var(--coverage-compute)' },
      { name: 'Segurança', weight: 22, color: 'var(--coverage-identity)' },
      { name: 'Instrumentação', weight: 15, color: 'var(--coverage-monitor)' },
    ],
  },
  {
    exam: 'SC-500',
    title: 'Security Operations',
    challenges: 52,
    href: '/docs/sc-500/overview',
    domains: [
      { name: 'Identidade & Governança', weight: 22, color: 'var(--coverage-identity)' },
      { name: 'Armazenamento & Rede', weight: 27, color: 'var(--coverage-networking)' },
      { name: 'Segurança de IA', weight: 10, color: 'var(--coverage-ai-security)' },
      { name: 'Computação Segura', weight: 20, color: 'var(--coverage-compute)' },
      { name: 'Postura de Segurança', weight: 21, color: 'var(--coverage-monitor)' },
    ],
  },
  {
    exam: 'AZ-700',
    title: 'Network Engineer',
    challenges: 49,
    href: '/docs/az-700/overview',
    domains: [
      { name: 'Core Networking', weight: 27, color: 'var(--coverage-networking)' },
      { name: 'Conectividade', weight: 22, color: 'var(--coverage-compute)' },
      { name: 'Entrega de Apps', weight: 18, color: 'var(--coverage-azure-services)' },
      { name: 'Acesso Privado', weight: 12, color: 'var(--coverage-identity)' },
      { name: 'Segurança de Rede', weight: 21, color: 'var(--coverage-monitor)' },
    ],
  },
  {
    exam: 'AI-901',
    title: 'Azure AI Fundamentals',
    challenges: 24,
    href: '/docs/ai-901/overview',
    domains: [
      { name: 'Cargas de IA', weight: 17, color: 'var(--coverage-cloud-concepts)' },
      { name: 'Machine Learning', weight: 22, color: 'var(--coverage-compute)' },
      { name: 'Visão Computacional', weight: 17, color: 'var(--coverage-azure-services)' },
      { name: 'PLN', weight: 22, color: 'var(--coverage-identity)' },
      { name: 'IA Generativa', weight: 22, color: 'var(--coverage-networking)' },
    ],
  },
  {
    exam: 'AI-103',
    title: 'AI Apps & Agents Developer',
    challenges: 49,
    href: '/docs/ai-103/overview',
    domains: [
      { name: 'Planejar & Gerenciar', weight: 20, color: 'var(--coverage-identity)' },
      { name: 'IA Generativa', weight: 20, color: 'var(--coverage-compute)' },
      { name: 'Agentes de IA', weight: 6, color: 'var(--coverage-ai-security)' },
      { name: 'Visão Computacional', weight: 14, color: 'var(--coverage-azure-services)' },
      { name: 'PLN', weight: 18, color: 'var(--coverage-networking)' },
      { name: 'Mineração de Conhecimento', weight: 22, color: 'var(--coverage-monitor)' },
    ],
  },
];

const FeatureList = [
  {
    title: '100% de Cobertura do Exame',
    description: 'Cada habilidade dos guias de estudo oficiais da Microsoft mapeada para desafios práticos. 8 exames, 327 desafios — verificados com os objetivos atuais.',
  },
  {
    title: 'Labs Práticos',
    description: 'Sem slides, sem dumps de teoria. Cada conceito ensinado com recursos reais do Azure que você cria, configura e diagnostica.',
  },
  {
    title: 'Econômico',
    description: 'Desafios usam recursos mínimos com scripts de limpeza. Projetado para Conta Gratuita do Azure ($200 crédito) ou Azure para Estudantes.',
  },
  {
    title: 'Lab com Um Clique',
    description: 'Abra no GitHub Codespaces e tenha Azure CLI, Bicep e PowerShell prontos em minutos. Sem configuração local.',
  },
  {
    title: 'Comandos Validados',
    description: 'Cada comando Azure CLI, trecho PowerShell e template Bicep validado para correção.',
  },
  {
    title: 'Quebre & Conserte',
    description: 'Cada desafio inclui cenários de troubleshooting com configurações incorretas deliberadas para diagnosticar e corrigir. Desenvolva habilidades do mundo real.',
  },
];

function Feature({title, description}) {
  return (
    <div className="col col--4" style={{marginBottom: '1.5rem'}}>
      <div className="feature-card">
        <Heading as="h3" style={{fontSize: '1.1rem'}}>{title}</Heading>
        <p style={{fontSize: '0.95rem', margin: 0}}>{description}</p>
      </div>
    </div>
  );
}

function HomepageFeatures() {
  return (
    <section style={{padding: '3rem 0'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">Feito para Profissionais Azure</Heading>
          <p>Cada conceito Azure é ensinado através de labs práticos. Sem enrolação — apenas habilidades reais.</p>
        </div>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

const examCards = [
  {
    icon: '☁️',
    code: 'AZ-900',
    level: 'Fundamentals',
    role: 'Azure Fundamentals',
    tagline: 'Conceitos de nuvem, serviços e preços',
    challenges: 24,
    href: '/docs/az-900/overview',
  },
  {
    icon: '🔧',
    code: 'AZ-104',
    level: 'Associate',
    role: 'Azure Administrator',
    tagline: 'Identidade, rede, computação e armazenamento',
    challenges: 28,
    href: '/docs/az-104/overview',
  },
  {
    icon: '🏗️',
    code: 'AZ-305',
    level: 'Expert',
    role: 'Solutions Architect',
    tagline: 'Design, arquitetura e trade-offs',
    challenges: 50,
    href: '/docs/az-305/overview',
  },
  {
    icon: '🚀',
    code: 'AZ-400',
    level: 'Expert',
    role: 'DevOps Engineer',
    tagline: 'CI/CD, IaC e monitoramento',
    challenges: 51,
    href: '/docs/az-400/overview',
  },
  {
    icon: '🛡️',
    code: 'SC-500',
    level: 'Specialty',
    role: 'Security Operations',
    tagline: 'Sentinel, Defender e IAM',
    challenges: 52,
    href: '/docs/sc-500/overview',
  },
  {
    icon: '🌐',
    code: 'AZ-700',
    level: 'Associate',
    role: 'Network Engineer',
    tagline: 'VPN, ExpressRoute, Firewall e LB',
    challenges: 49,
    href: '/docs/az-700/overview',
  },
  {
    icon: '🧠',
    code: 'AI-901',
    level: 'Fundamentals',
    role: 'Azure AI Fundamentals',
    tagline: 'ML, Visão, NLP e IA Generativa',
    challenges: 24,
    href: '/docs/ai-901/overview',
  },
  {
    icon: '🤖',
    code: 'AI-103',
    level: 'Associate',
    role: 'AI Apps & Agents Developer',
    tagline: 'OpenAI, Search, Vision e Agentes',
    challenges: 49,
    href: '/docs/ai-103/overview',
  },
  {
    icon: '🧪',
    code: 'Open Lab',
    level: 'Sandbox',
    role: 'Exploração livre',
    tagline: 'Seu próprio playground Azure',
    challenges: null,
    href: 'https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1',
    external: true,
  },
];

function HomepageHeader() {
  return (
    <header className="hero--azure">
      <div className="container">
        <Heading as="h1" className="hero__title">
          Azure Cert Prep
        </Heading>
        <p className="hero__subtitle">"Não estude apenas — construa."</p>
        <div className="stats-bar">
          {stats.map((stat, idx) => (
            <div key={idx} className="stat-item">
              <span className="stat-number">{stat.number}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
        <div className="exam-cards-grid">
          {examCards.map((exam) => {
            const CardTag = exam.external ? 'a' : Link;
            const cardProps = exam.external
              ? { href: exam.href, target: '_blank', rel: 'noopener noreferrer' }
              : { to: exam.href };
            return (
              <CardTag key={exam.code} className="exam-card" {...cardProps}>
                <div className="exam-card__icon">{exam.icon}</div>
                <div className="exam-card__code">{exam.code}</div>
                <span className={`exam-card__level exam-card__level--${exam.level.toLowerCase()}`}>
                  {exam.level}
                </span>
                <div className="exam-card__role">{exam.role}</div>
                <div className="exam-card__tagline">{exam.tagline}</div>
                {exam.challenges && (
                  <div className="exam-card__challenges">{exam.challenges} desafios</div>
                )}
              </CardTag>
            );
          })}
        </div>
      </div>
    </header>
  );
}

function AZ900ChallengeGrid() {
  return (
    <section style={{padding: '2rem 0'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">AZ-900: Azure Fundamentals</Heading>
          <p>24 desafios baseados em exploração — entenda conceitos de nuvem através de navegação prática no portal. Custo $0.</p>
        </div>
        <div className="row">
          {az900Challenges.map((ch) => (
            <div key={ch.num} className="col col--3" style={{marginBottom: '1rem'}}>
              <Link to={ch.href} className="challenge-card">
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.5rem'}}>
                  <span className="challenge-number">{ch.num}</span>
                  <span className={`domain-badge domain-badge--${ch.domain}`}>
                    {az900DomainLabels[ch.domain]}
                  </span>
                </div>
                <strong>{ch.title}</strong>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChallengeGrid() {
  return (
    <section style={{padding: '2rem 0'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">AZ-104: Azure Administrator</Heading>
          <p>28 desafios práticos — do seu primeiro usuário Entra ID ate um capstone multidisciplinar.</p>
        </div>
        <div className="row">
          {challenges.map((ch) => (
            <div key={ch.num} className="col col--3" style={{marginBottom: '1rem'}}>
              <Link to={ch.href} className="challenge-card">
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.5rem'}}>
                  <span className="challenge-number">{ch.num}</span>
                  <span className={`domain-badge domain-badge--${ch.domain}`}>
                    {domainLabels[ch.domain]}
                  </span>
                </div>
                <strong>{ch.title}</strong>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AZ305ChallengeGrid() {
  return (
    <section style={{padding: '2rem 0', background: 'var(--ifm-color-emphasis-100)'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">AZ-305: Solutions Architect Expert</Heading>
          <p>50 desafios de design — decisões arquiteturais, trade-offs e validações de prova de conceito.</p>
        </div>
        <div className="row">
          {az305Challenges.map((ch) => (
            <div key={ch.num} className="col col--3" style={{marginBottom: '1rem'}}>
              <Link to={ch.href} className="challenge-card">
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.5rem'}}>
                  <span className="challenge-number">{ch.num}</span>
                  <span className={`domain-badge domain-badge--${ch.domain}`}>
                    {az305DomainLabels[ch.domain]}
                  </span>
                </div>
                <strong>{ch.title}</strong>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AZ400ChallengeGrid() {
  return (
    <section style={{padding: '2rem 0'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">AZ-400: DevOps Engineer Expert</Heading>
          <p>51 desafios práticos — pipelines, segurança, monitoramento e ciclo de vida completo de entrega.</p>
        </div>
        <div className="row">
          {az400Challenges.map((ch) => (
            <div key={ch.num} className="col col--3" style={{marginBottom: '1rem'}}>
              <Link to={ch.href} className="challenge-card">
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.5rem'}}>
                  <span className="challenge-number">{ch.num}</span>
                  <span className={`domain-badge domain-badge--${ch.domain}`}>
                    {az400DomainLabels[ch.domain]}
                  </span>
                </div>
                <strong>{ch.title}</strong>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SC500ChallengeGrid() {
  return (
    <section style={{padding: '2rem 0', background: 'var(--ifm-color-emphasis-100)'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">SC-500: Cloud and AI Security Engineer</Heading>
          <p>52 desafios práticos — identidade, rede, segurança de IA, Sentinel e defesa ponta a ponta.</p>
        </div>
        <div className="row">
          {sc500Challenges.map((ch) => (
            <div key={ch.num} className="col col--3" style={{marginBottom: '1rem'}}>
              <Link to={ch.href} className="challenge-card">
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.5rem'}}>
                  <span className="challenge-number">{ch.num}</span>
                  <span className={`domain-badge domain-badge--${ch.domain}`}>
                    {sc500DomainLabels[ch.domain]}
                  </span>
                </div>
                <strong>{ch.title}</strong>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AZ700ChallengeGrid() {
  return (
    <section style={{padding: '2rem 0'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">AZ-700: Azure Network Engineer Associate</Heading>
          <p>49 desafios práticos — VPN, ExpressRoute, Firewall, Load Balancer, Private Link e design de rede corporativa.</p>
        </div>
        <div className="row">
          {az700Challenges.map((ch) => (
            <div key={ch.num} className="col col--3" style={{marginBottom: '1rem'}}>
              <Link to={ch.href} className="challenge-card">
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.5rem'}}>
                  <span className="challenge-number">{ch.num}</span>
                  <span className={`domain-badge domain-badge--${ch.domain}`}>
                    {az700DomainLabels[ch.domain]}
                  </span>
                </div>
                <strong>{ch.title}</strong>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AI900ChallengeGrid() {
  return (
    <section style={{padding: '2rem 0', background: 'var(--ifm-color-emphasis-100)'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">AI-901: Azure AI Fundamentals</Heading>
          <p>24 desafios de exploração — ML, Visão Computacional, PLN e conceitos de IA Generativa. Custo $0.</p>
        </div>
        <div className="row">
          {ai900Challenges.map((ch) => (
            <div key={ch.num} className="col col--3" style={{marginBottom: '1rem'}}>
              <Link to={ch.href} className="challenge-card">
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.5rem'}}>
                  <span className="challenge-number">{ch.num}</span>
                  <span className={`domain-badge domain-badge--${ch.domain}`}>
                    {ai900DomainLabels[ch.domain]}
                  </span>
                </div>
                <strong>{ch.title}</strong>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AI102ChallengeGrid() {
  return (
    <section style={{padding: '2rem 0'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">AI-103: Azure AI Engineer Associate</Heading>
          <p>49 desafios práticos — OpenAI, Search, Visão, PLN, Agentes e soluções empresariais de IA.</p>
        </div>
        <div className="row">
          {ai102Challenges.map((ch) => (
            <div key={ch.num} className="col col--3" style={{marginBottom: '1rem'}}>
              <Link to={ch.href} className="challenge-card">
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.5rem'}}>
                  <span className="challenge-number">{ch.num}</span>
                  <span className={`domain-badge domain-badge--${ch.domain}`}>
                    {ai102DomainLabels[ch.domain]}
                  </span>
                </div>
                <strong>{ch.title}</strong>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CertificationCoverage() {
  return (
    <section style={{padding: '2rem 0'}}>
      <div className="container" style={{maxWidth: '800px', margin: '0 auto'}}>
        <div className="section-heading">
          <Heading as="h2">100% de Cobertura da Certificação</Heading>
          <p>Cada domínio dos guias de estudo oficiais mapeado para desafios práticos.</p>
        </div>
        <div className="coverage-bars">
          {coverageData.map((exam) => (
            <div key={exam.exam} className="coverage-row">
              <Link to={exam.href} className="coverage-label">
                <span className="coverage-exam">{exam.exam}</span>
                <span className="coverage-title">{exam.title}</span>
                <span className="coverage-count">{exam.challenges}</span>
              </Link>
              <div className="coverage-bar">
                {exam.domains.map((domain, idx) => (
                  <div
                    key={idx}
                    className="coverage-segment"
                    style={{width: `${domain.weight}%`, background: domain.color}}
                    title={`${domain.name}: ~${domain.weight}%`}
                  >
                    <span className="coverage-segment-label">{domain.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p style={{textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', opacity: 0.6}}>
          Alinhado com os guias de estudo oficiais da Microsoft — Maio 2026
        </p>
      </div>
    </section>
  );
}

function ExamRoadmap() {
  return (
    <section style={{padding: '2rem 0', background: 'var(--ifm-color-emphasis-100)'}}>
      <div className="container" style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Heading as="h2" style={{textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem'}}>Roadmap de Exames</Heading>
        <p style={{textAlign: 'center', color: 'var(--ifm-color-emphasis-600)', fontSize: '1.1rem', maxWidth: '600px', marginBottom: '2rem'}}>
          Mais exames em breve. Cada um seguirá o mesmo formato prático baseado em desafios.
        </p>
        <table style={{width: 'auto', borderCollapse: 'collapse'}}>
          <thead>
            <tr>
              <th style={{textAlign: 'center'}}>Exame</th>
              <th style={{textAlign: 'center'}}>Título</th>
              <th style={{textAlign: 'center'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AZ-900</strong></td>
              <td style={{textAlign: 'center'}}>Azure Fundamentals</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Disponível (24 desafios)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AZ-104</strong></td>
              <td style={{textAlign: 'center'}}>Azure Administrator</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Disponível (28 desafios)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AZ-305</strong></td>
              <td style={{textAlign: 'center'}}>Solutions Architect Expert</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Disponível (50 desafios)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AZ-400</strong></td>
              <td style={{textAlign: 'center'}}>DevOps Engineer Expert</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Disponível (51 desafios)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}><strong>SC-500</strong></td>
              <td style={{textAlign: 'center'}}>Cloud and AI Security Engineer <small style={{opacity: 0.7}}>(substitui AZ-500)</small></td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Disponível (52 desafios)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AZ-700</strong></td>
              <td style={{textAlign: 'center'}}>Azure Network Engineer Associate</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Disponível (49 desafios)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AI-901</strong></td>
              <td style={{textAlign: 'center'}}>Azure AI Fundamentals</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Disponível (24 desafios)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AI-103</strong></td>
              <td style={{textAlign: 'center'}}>Azure AI Engineer</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Disponível (49 desafios)</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Layout
      title="Preparação Hands-on para Certificação Azure"
      description="Não estude apenas — construa. Desafios práticos para certificações Azure. AZ-900, AZ-104, AZ-305, AZ-400, SC-500, AZ-700, AI-901 e AI-103 disponíveis.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <AZ900ChallengeGrid />
        <ChallengeGrid />
        <AZ305ChallengeGrid />
        <AZ400ChallengeGrid />
        <SC500ChallengeGrid />
        <AZ700ChallengeGrid />
        <AI900ChallengeGrid />
        <AI102ChallengeGrid />
        <CertificationCoverage />
        <ExamRoadmap />
      </main>
    </Layout>
  );
}

