import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const stats = [
  { number: '327', label: 'Challenges' },
  { number: '8', label: 'Exams' },
  { number: '100%', label: 'Coverage' },
  { number: 'v2026.07', label: 'Exam Objectives' },
];

const examCards = [
  {
    icon: '☁️',
    code: 'AZ-900',
    level: 'Fundamentals',
    role: 'Azure Fundamentals',
    tagline: 'Cloud concepts, services & pricing',
    challenges: 24,
    href: '/docs/az-900/overview',
  },
  {
    icon: '🔧',
    code: 'AZ-104',
    level: 'Associate',
    role: 'Azure Administrator',
    tagline: 'Identity, networking, compute & storage',
    challenges: 28,
    href: '/docs/az-104/overview',
  },
  {
    icon: '🏗️',
    code: 'AZ-305',
    level: 'Expert',
    role: 'Solutions Architect',
    tagline: 'Design, architecture & trade-offs',
    challenges: 50,
    href: '/docs/az-305/overview',
  },
  {
    icon: '🚀',
    code: 'AZ-400',
    level: 'Expert',
    role: 'DevOps Engineer',
    tagline: 'CI/CD, IaC & monitoring',
    challenges: 51,
    href: '/docs/az-400/overview',
  },
  {
    icon: '🛡️',
    code: 'SC-500',
    level: 'Specialty',
    role: 'Security Operations',
    tagline: 'Sentinel, Defender & IAM',
    challenges: 52,
    href: '/docs/sc-500/overview',
  },
  {
    icon: '🌐',
    code: 'AZ-700',
    level: 'Associate',
    role: 'Network Engineer',
    tagline: 'VPN, ExpressRoute, Firewall & LB',
    challenges: 49,
    href: '/docs/az-700/overview',
  },
  {
    icon: '🧠',
    code: 'AI-901',
    level: 'Fundamentals',
    role: 'Azure AI Fundamentals',
    tagline: 'AI Concepts & Azure Foundry',
    challenges: 24,
    href: '/docs/ai-901/overview',
  },
  {
    icon: '🤖',
    code: 'AI-103',
    level: 'Associate',
    role: 'AI Apps & Agents Developer',
    tagline: 'GenAI, RAG, Agents & Orchestration',
    challenges: 49,
    href: '/docs/ai-103/overview',
  },
  {
    icon: '🧪',
    code: 'Open Lab',
    level: 'Sandbox',
    role: 'Free exploration',
    tagline: 'Your own Azure playground',
    challenges: null,
    href: 'https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1',
    external: true,
  },
];

const challenges = [
  { num: '01', title: 'Entra ID: Users & Groups', domain: 'identity', href: '/docs/az-104/identity/challenge-01' },
  { num: '02', title: 'RBAC & Access Management', domain: 'identity', href: '/docs/az-104/identity/challenge-02' },
  { num: '03', title: 'Azure Policy & Governance', domain: 'identity', href: '/docs/az-104/identity/challenge-03' },
  { num: '04', title: 'Storage Accounts & Access', domain: 'storage', href: '/docs/az-104/storage/challenge-04' },
  { num: '05', title: 'Blob Storage & Azure Files', domain: 'storage', href: '/docs/az-104/storage/challenge-05' },
  { num: '06', title: 'Storage Security & Lifecycle', domain: 'storage', href: '/docs/az-104/storage/challenge-06' },
  { num: '07', title: 'ARM Templates & Bicep', domain: 'compute', href: '/docs/az-104/compute/challenge-07' },
  { num: '08', title: 'VMs & Scale Sets', domain: 'compute', href: '/docs/az-104/compute/challenge-08' },
  { num: '09', title: 'Containers in Azure', domain: 'compute', href: '/docs/az-104/compute/challenge-09' },
  { num: '10', title: 'Azure App Service', domain: 'compute', href: '/docs/az-104/compute/challenge-10' },
  { num: '11', title: 'Virtual Networks & Subnets', domain: 'networking', href: '/docs/az-104/networking/challenge-11' },
  { num: '12', title: 'Network Security', domain: 'networking', href: '/docs/az-104/networking/challenge-12' },
  { num: '13', title: 'DNS & Load Balancing', domain: 'networking', href: '/docs/az-104/networking/challenge-13' },
  { num: '14', title: 'Azure Monitor & Alerts', domain: 'monitor', href: '/docs/az-104/monitor/challenge-14' },
  { num: '15', title: 'Backup & Recovery', domain: 'monitor', href: '/docs/az-104/monitor/challenge-15' },
  { num: '16', title: 'Capstone: Day in the Life', domain: 'monitor', href: '/docs/az-104/capstone/challenge-16' },
  { num: '17', title: 'Management Groups & Subscriptions', domain: 'identity', href: '/docs/az-104/identity/challenge-17' },
  { num: '18', title: 'Cost Management & Azure Advisor', domain: 'identity', href: '/docs/az-104/identity/challenge-18' },
  { num: '19', title: 'AzCopy & Storage Migration', domain: 'storage', href: '/docs/az-104/storage/challenge-19' },
  { num: '20', title: 'Storage Encryption & Data Protection', domain: 'storage', href: '/docs/az-104/storage/challenge-20' },
  { num: '21', title: 'VM Extensions & Automation', domain: 'compute', href: '/docs/az-104/compute/challenge-21' },
  { num: '22', title: 'VM Disks & Encryption', domain: 'compute', href: '/docs/az-104/compute/challenge-22' },
  { num: '23', title: 'App Service Advanced Config', domain: 'compute', href: '/docs/az-104/compute/challenge-23' },
  { num: '24', title: 'User-Defined Routes & Traffic Control', domain: 'networking', href: '/docs/az-104/networking/challenge-24' },
  { num: '25', title: 'Private Endpoints & Service Endpoints', domain: 'networking', href: '/docs/az-104/networking/challenge-25' },
  { num: '26', title: 'Network Watcher & Diagnostics', domain: 'networking', href: '/docs/az-104/networking/challenge-26' },
  { num: '27', title: 'Log Analytics & KQL Deep Dive', domain: 'monitor', href: '/docs/az-104/monitor/challenge-27' },
  { num: '28', title: 'Azure Advisor & Service Health', domain: 'monitor', href: '/docs/az-104/monitor/challenge-28' },
];

const domainLabels = {
  identity: 'Identity & Governance',
  storage: 'Storage',
  compute: 'Compute',
  networking: 'Networking',
  monitor: 'Monitor',
};

const az305DomainLabels = {
  'identity-gov': 'Identity & Governance',
  'data': 'Data Storage',
  'bcdr': 'Business Continuity',
  'infra': 'Infrastructure',
  'capstone': 'Capstone',
};

const az400DomainLabels = {
  'processes': 'Processes & Communications',
  'source-control': 'Source Control',
  'packages': 'Package Management',
  'testing': 'Testing',
  'pipelines': 'Pipeline Fundamentals',
  'deployment': 'Deployment Strategies',
  'iac': 'Infrastructure as Code',
  'operations': 'Pipeline Operations',
  'security': 'Security & Compliance',
  'instrumentation': 'Instrumentation',
  'capstone': 'Capstone',
};

const az400Challenges = [
  { num: '01', title: 'Agile Planning & Work Tracking', domain: 'processes', href: '/docs/az-400/processes-communications/challenge-01' },
  { num: '02', title: 'Collaboration & Communication', domain: 'processes', href: '/docs/az-400/processes-communications/challenge-02' },
  { num: '03', title: 'Feedback & Retrospectives', domain: 'processes', href: '/docs/az-400/processes-communications/challenge-03' },
  { num: '04', title: 'Team Structure & Autonomy', domain: 'processes', href: '/docs/az-400/processes-communications/challenge-04' },
  { num: '05', title: 'Release Planning & Cadence', domain: 'processes', href: '/docs/az-400/processes-communications/challenge-05' },
  { num: '06', title: 'Cross-Team Coordination', domain: 'processes', href: '/docs/az-400/processes-communications/challenge-06' },
  { num: '07', title: 'Branching Strategies', domain: 'source-control', href: '/docs/az-400/source-control/challenge-07' },
  { num: '08', title: 'Pull Request Workflows', domain: 'source-control', href: '/docs/az-400/source-control/challenge-08' },
  { num: '09', title: 'Repository Structure', domain: 'source-control', href: '/docs/az-400/source-control/challenge-09' },
  { num: '10', title: 'Git Hooks & Automation', domain: 'source-control', href: '/docs/az-400/source-control/challenge-10' },
  { num: '11', title: 'Merge Strategies & Conflicts', domain: 'source-control', href: '/docs/az-400/source-control/challenge-11' },
  { num: '12', title: 'Monorepo vs Multi-Repo', domain: 'source-control', href: '/docs/az-400/source-control/challenge-12' },
  { num: '13', title: 'Package Feeds & Registries', domain: 'packages', href: '/docs/az-400/03a-package-management/challenge-13' },
  { num: '14', title: 'Versioning Strategies', domain: 'packages', href: '/docs/az-400/03a-package-management/challenge-14' },
  { num: '15', title: 'Dependency Management', domain: 'packages', href: '/docs/az-400/03a-package-management/challenge-15' },
  { num: '16', title: 'Test Strategy & Frameworks', domain: 'testing', href: '/docs/az-400/03b-testing-pipelines/challenge-16' },
  { num: '17', title: 'Integration & End-to-End Tests', domain: 'testing', href: '/docs/az-400/03b-testing-pipelines/challenge-17' },
  { num: '18', title: 'Test Automation in Pipelines', domain: 'testing', href: '/docs/az-400/03b-testing-pipelines/challenge-18' },
  { num: '19', title: 'YAML Pipeline Basics', domain: 'pipelines', href: '/docs/az-400/03c-pipeline-fundamentals/challenge-19' },
  { num: '20', title: 'Multi-Stage Pipelines', domain: 'pipelines', href: '/docs/az-400/03c-pipeline-fundamentals/challenge-20' },
  { num: '21', title: 'Pipeline Templates & Reuse', domain: 'pipelines', href: '/docs/az-400/03c-pipeline-fundamentals/challenge-21' },
  { num: '22', title: 'Triggers & Conditions', domain: 'pipelines', href: '/docs/az-400/03c-pipeline-fundamentals/challenge-22' },
  { num: '23', title: 'Agents & Runner Pools', domain: 'pipelines', href: '/docs/az-400/03c-pipeline-fundamentals/challenge-23' },
  { num: '24', title: 'Pipeline Variables & Secrets', domain: 'pipelines', href: '/docs/az-400/03c-pipeline-fundamentals/challenge-24' },
  { num: '25', title: 'Blue-Green Deployments', domain: 'deployment', href: '/docs/az-400/03d-deployment-strategies/challenge-25' },
  { num: '26', title: 'Canary Releases', domain: 'deployment', href: '/docs/az-400/03d-deployment-strategies/challenge-26' },
  { num: '27', title: 'Feature Flags', domain: 'deployment', href: '/docs/az-400/03d-deployment-strategies/challenge-27' },
  { num: '28', title: 'Rolling Deployments', domain: 'deployment', href: '/docs/az-400/03d-deployment-strategies/challenge-28' },
  { num: '29', title: 'Deployment Gates & Approvals', domain: 'deployment', href: '/docs/az-400/03d-deployment-strategies/challenge-29' },
  { num: '30', title: 'Rollback Strategies', domain: 'deployment', href: '/docs/az-400/03d-deployment-strategies/challenge-30' },
  { num: '31', title: 'Bicep & ARM Templates', domain: 'iac', href: '/docs/az-400/03e-infrastructure-as-code/challenge-31' },
  { num: '32', title: 'Terraform for Azure', domain: 'iac', href: '/docs/az-400/03e-infrastructure-as-code/challenge-32' },
  { num: '33', title: 'IaC Testing & Validation', domain: 'iac', href: '/docs/az-400/03e-infrastructure-as-code/challenge-33' },
  { num: '34', title: 'Pipeline Caching & Performance', domain: 'operations', href: '/docs/az-400/03f-pipeline-operations/challenge-34' },
  { num: '35', title: 'Self-Hosted Agents', domain: 'operations', href: '/docs/az-400/03f-pipeline-operations/challenge-35' },
  { num: '36', title: 'Pipeline Monitoring & Diagnostics', domain: 'operations', href: '/docs/az-400/03f-pipeline-operations/challenge-36' },
  { num: '37', title: 'Artifact Management & Retention', domain: 'operations', href: '/docs/az-400/03f-pipeline-operations/challenge-37' },
  { num: '38', title: 'Pipeline as Code Governance', domain: 'operations', href: '/docs/az-400/03f-pipeline-operations/challenge-38' },
  { num: '39', title: 'Secret Management', domain: 'security', href: '/docs/az-400/security-compliance/challenge-39' },
  { num: '40', title: 'Workload Identity & OIDC', domain: 'security', href: '/docs/az-400/security-compliance/challenge-40' },
  { num: '41', title: 'Dependency Scanning', domain: 'security', href: '/docs/az-400/security-compliance/challenge-41' },
  { num: '42', title: 'Static Code Analysis', domain: 'security', href: '/docs/az-400/security-compliance/challenge-42' },
  { num: '43', title: 'Container Security', domain: 'security', href: '/docs/az-400/security-compliance/challenge-43' },
  { num: '44', title: 'Compliance & Governance', domain: 'security', href: '/docs/az-400/security-compliance/challenge-44' },
  { num: '45', title: 'Supply Chain Security', domain: 'security', href: '/docs/az-400/security-compliance/challenge-45' },
  { num: '46', title: 'Application Insights', domain: 'instrumentation', href: '/docs/az-400/instrumentation/challenge-46' },
  { num: '47', title: 'Log Analytics & KQL', domain: 'instrumentation', href: '/docs/az-400/instrumentation/challenge-47' },
  { num: '48', title: 'Alerting & Incident Response', domain: 'instrumentation', href: '/docs/az-400/instrumentation/challenge-48' },
  { num: '49', title: 'DORA Metrics & Dashboards', domain: 'instrumentation', href: '/docs/az-400/instrumentation/challenge-49' },
  { num: '50', title: 'Site Reliability Engineering', domain: 'instrumentation', href: '/docs/az-400/instrumentation/challenge-50' },
  { num: '51', title: 'End-to-End DevOps Lifecycle', domain: 'capstone', href: '/docs/az-400/capstone/challenge-51' },
];

const az305Challenges = [
  { num: '01', title: 'Centralized Logging', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-01' },
  { num: '02', title: 'Log Routing & Filtering', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-02' },
  { num: '03', title: 'Monitoring & Alerting', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-03' },
  { num: '04', title: 'Cloud-Native Authentication', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-04' },
  { num: '05', title: 'Identity Management', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-05' },
  { num: '06', title: 'Azure Resource Authorization', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-06' },
  { num: '07', title: 'On-Premises Authorization', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-07' },
  { num: '08', title: 'Secrets & Certificates', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-08' },
  { num: '09', title: 'Management Groups & Subscriptions', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-09' },
  { num: '10', title: 'Resource Tagging Strategy', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-10' },
  { num: '11', title: 'Compliance Solution', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-11' },
  { num: '12', title: 'Identity Governance', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-12' },
  { num: '13', title: 'Multi-Team Governance (Capstone)', domain: 'identity-gov', href: '/docs/az-305/identity-governance-monitoring/challenge-13' },
  { num: '14', title: 'Relational Data Platform', domain: 'data', href: '/docs/az-305/data-storage/challenge-14' },
  { num: '15', title: 'Database Tiers & Compute', domain: 'data', href: '/docs/az-305/data-storage/challenge-15' },
  { num: '16', title: 'Database Scalability', domain: 'data', href: '/docs/az-305/data-storage/challenge-16' },
  { num: '17', title: 'Database Protection', domain: 'data', href: '/docs/az-305/data-storage/challenge-17' },
  { num: '18', title: 'Semi-Structured Data', domain: 'data', href: '/docs/az-305/data-storage/challenge-18' },
  { num: '19', title: 'Unstructured Data', domain: 'data', href: '/docs/az-305/data-storage/challenge-19' },
  { num: '20', title: 'Cost & Performance Balance', domain: 'data', href: '/docs/az-305/data-storage/challenge-20' },
  { num: '21', title: 'Data Durability & Protection', domain: 'data', href: '/docs/az-305/data-storage/challenge-21' },
  { num: '22', title: 'Data Integration Pipeline', domain: 'data', href: '/docs/az-305/data-storage/challenge-22' },
  { num: '23', title: 'Data Analytics Solution', domain: 'data', href: '/docs/az-305/data-storage/challenge-23' },
  { num: '24', title: 'End-to-End Data Platform (Capstone)', domain: 'data', href: '/docs/az-305/data-storage/challenge-24' },
  { num: '25', title: 'Recovery Objectives & Strategy', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-25' },
  { num: '26', title: 'Backup for Compute', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-26' },
  { num: '27', title: 'Backup for Databases', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-27' },
  { num: '28', title: 'Backup for Unstructured Data', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-28' },
  { num: '29', title: 'Disaster Recovery Plan (Capstone)', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-29' },
  { num: '30', title: 'HA for Compute', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-30' },
  { num: '31', title: 'HA for Relational Data', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-31' },
  { num: '32', title: 'HA for Non-Relational Data', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-32' },
  { num: '33', title: 'Multi-Region Application (Capstone)', domain: 'bcdr', href: '/docs/az-305/business-continuity/challenge-33' },
  { num: '34', title: 'Compute for Workloads', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-34' },
  { num: '35', title: 'VM-Based Solution', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-35' },
  { num: '36', title: 'Container-Based Solution', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-36' },
  { num: '37', title: 'Serverless Solution', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-37' },
  { num: '38', title: 'Messaging Architecture', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-38' },
  { num: '39', title: 'Event-Driven Architecture', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-39' },
  { num: '40', title: 'API Integration', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-40' },
  { num: '41', title: 'Caching Strategy', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-41' },
  { num: '42', title: 'Configuration Management', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-42' },
  { num: '43', title: 'Automated Deployment', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-43' },
  { num: '44', title: 'Migration Strategy (CAF)', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-44' },
  { num: '45', title: 'Server & App Migration', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-45' },
  { num: '46', title: 'Database Migration', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-46' },
  { num: '47', title: 'Unstructured Data Migration', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-47' },
  { num: '48', title: 'Network Connectivity', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-48' },
  { num: '49', title: 'Network Security & Load Balancing', domain: 'infra', href: '/docs/az-305/infrastructure/challenge-49' },
  { num: '50', title: 'Complete Azure Solution (Capstone)', domain: 'capstone', href: '/docs/az-305/infrastructure/challenge-50' },
];

const sc500DomainLabels = {
  'identity': 'Identity & Governance',
  'networking': 'Storage & Networking',
  'compute': 'Secure Compute',
  'ai-security': 'AI Security',
  'monitoring': 'Security Posture',
  'capstone': 'Capstone',
};

const sc500Challenges = [
  { num: '01', title: 'Entra ID Security Defaults', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-01' },
  { num: '02', title: 'Conditional Access Policies', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-02' },
  { num: '03', title: 'Privileged Identity Management', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-03' },
  { num: '04', title: 'Identity Protection & Risk', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-04' },
  { num: '05', title: 'Access Reviews & Governance', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-05' },
  { num: '06', title: 'App Registration Security', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-06' },
  { num: '07', title: 'External Identities & B2B', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-07' },
  { num: '08', title: 'Managed Identity & RBAC', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-08' },
  { num: '09', title: 'Azure Policy for Security', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-09' },
  { num: '10', title: 'Microsoft Purview DLP', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-10' },
  { num: '11', title: 'Purview Sensitivity Labels', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-11' },
  { num: '12', title: 'Purview Audit & eDiscovery', domain: 'identity', href: '/docs/sc-500/identity-access-governance/challenge-12' },
  { num: '13', title: 'Storage Account Security', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-13' },
  { num: '14', title: 'Key Vault Management', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-14' },
  { num: '15', title: 'SQL Database Security', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-15' },
  { num: '16', title: 'Cosmos DB Security', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-16' },
  { num: '17', title: 'NSG & ASG Configuration', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-17' },
  { num: '18', title: 'Azure Firewall', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-18' },
  { num: '19', title: 'Private Endpoints', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-19' },
  { num: '20', title: 'Web Application Firewall', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-20' },
  { num: '21', title: 'DDoS Protection', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-21' },
  { num: '22', title: 'VPN & ExpressRoute Security', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-22' },
  { num: '23', title: 'Network Segmentation', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-23' },
  { num: '24', title: 'DNS Security', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-24' },
  { num: '25', title: 'TLS & Certificate Management', domain: 'networking', href: '/docs/sc-500/storage-databases-networking/challenge-25' },
  { num: '26', title: 'Copilot Studio Agent Security', domain: 'ai-security', href: '/docs/sc-500/secure-compute/challenge-26' },
  { num: '27', title: 'Entra Agent ID & Auth', domain: 'ai-security', href: '/docs/sc-500/secure-compute/challenge-27' },
  { num: '28', title: 'AI Foundry Guardrails', domain: 'ai-security', href: '/docs/sc-500/secure-compute/challenge-28' },
  { num: '29', title: 'AI Gateway & APIM', domain: 'ai-security', href: '/docs/sc-500/secure-compute/challenge-29' },
  { num: '30', title: 'Defender for AI', domain: 'ai-security', href: '/docs/sc-500/secure-compute/challenge-30' },
  { num: '31', title: 'RAG Security & Data Access', domain: 'ai-security', href: '/docs/sc-500/secure-compute/challenge-31' },
  { num: '32', title: 'VM Security & Defender', domain: 'compute', href: '/docs/sc-500/secure-compute/challenge-32' },
  { num: '33', title: 'Container Security & AKS', domain: 'compute', href: '/docs/sc-500/secure-compute/challenge-33' },
  { num: '34', title: 'App Service Security', domain: 'compute', href: '/docs/sc-500/secure-compute/challenge-34' },
  { num: '35', title: 'Azure Functions Security', domain: 'compute', href: '/docs/sc-500/secure-compute/challenge-35' },
  { num: '36', title: 'Defender for Servers', domain: 'compute', href: '/docs/sc-500/secure-compute/challenge-36' },
  { num: '37', title: 'Endpoint Protection', domain: 'compute', href: '/docs/sc-500/secure-compute/challenge-37' },
  { num: '38', title: 'Update Management', domain: 'compute', href: '/docs/sc-500/secure-compute/challenge-38' },
  { num: '39', title: 'Defender for Cloud Setup', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-39' },
  { num: '40', title: 'Secure Score Improvement', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-40' },
  { num: '41', title: 'Regulatory Compliance', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-41' },
  { num: '42', title: 'Microsoft Sentinel Setup', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-42' },
  { num: '43', title: 'Sentinel Analytics Rules', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-43' },
  { num: '44', title: 'SOAR & Playbooks', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-44' },
  { num: '45', title: 'Threat Hunting with KQL', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-45' },
  { num: '46', title: 'Data Connectors', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-46' },
  { num: '47', title: 'Workbooks & Dashboards', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-47' },
  { num: '48', title: 'Security Copilot Basics', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-48' },
  { num: '49', title: 'Security Copilot Advanced', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-49' },
  { num: '50', title: 'Incident Management', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-50' },
  { num: '51', title: 'Multi-Cloud Security', domain: 'monitoring', href: '/docs/sc-500/security-posture-monitoring/challenge-51' },
  { num: '52', title: 'End-to-End Security (Capstone)', domain: 'capstone', href: '/docs/sc-500/capstone/challenge-52' },
];

const az900DomainLabels = {
  'cloud-concepts': 'Cloud Concepts',
  'azure-services': 'Azure Services',
  'management': 'Management & Governance',
};

const az900Challenges = [
  { num: '01', title: 'What is Cloud Computing?', domain: 'cloud-concepts', href: '/docs/az-900/cloud-concepts/challenge-01' },
  { num: '02', title: 'Benefits of Cloud Services', domain: 'cloud-concepts', href: '/docs/az-900/cloud-concepts/challenge-02' },
  { num: '03', title: 'Cloud Pricing Models', domain: 'cloud-concepts', href: '/docs/az-900/cloud-concepts/challenge-03' },
  { num: '04', title: 'IaaS — Infrastructure as a Service', domain: 'cloud-concepts', href: '/docs/az-900/cloud-concepts/challenge-04' },
  { num: '05', title: 'PaaS — Platform as a Service', domain: 'cloud-concepts', href: '/docs/az-900/cloud-concepts/challenge-05' },
  { num: '06', title: 'SaaS — Software as a Service', domain: 'cloud-concepts', href: '/docs/az-900/cloud-concepts/challenge-06' },
  { num: '07', title: 'Azure Global Infrastructure', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-07' },
  { num: '08', title: 'Azure Resource Hierarchy', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-08' },
  { num: '09', title: 'Virtual Machines & Availability', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-09' },
  { num: '10', title: 'Containers & App Hosting', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-10' },
  { num: '11', title: 'Azure Networking Basics', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-11' },
  { num: '12', title: 'VPN Gateway, ExpressRoute & DNS', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-12' },
  { num: '13', title: 'Azure Storage Accounts & Types', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-13' },
  { num: '14', title: 'Storage Redundancy & Tiers', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-14' },
  { num: '15', title: 'Data Migration Options', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-15' },
  { num: '16', title: 'Microsoft Entra ID & Authentication', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-16' },
  { num: '17', title: 'RBAC, Conditional Access & External IDs', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-17' },
  { num: '18', title: 'Security — Zero Trust & Defender', domain: 'azure-services', href: '/docs/az-900/azure-services/challenge-18' },
  { num: '19', title: 'Azure Cost Management & Pricing', domain: 'management', href: '/docs/az-900/management-governance/challenge-19' },
  { num: '20', title: 'Governance — Policy & Resource Locks', domain: 'management', href: '/docs/az-900/management-governance/challenge-20' },
  { num: '21', title: 'Azure Cloud Shell, CLI & PowerShell', domain: 'management', href: '/docs/az-900/management-governance/challenge-21' },
  { num: '22', title: 'Azure Arc & ARM Templates', domain: 'management', href: '/docs/az-900/management-governance/challenge-22' },
  { num: '23', title: 'Azure Advisor & Service Health', domain: 'management', href: '/docs/az-900/management-governance/challenge-23' },
  { num: '24', title: 'Azure Monitor, Log Analytics & Alerts', domain: 'management', href: '/docs/az-900/management-governance/challenge-24' },
];

const ai900DomainLabels = {
  'ai-workloads': 'AI Workloads',
  'machine-learning': 'Machine Learning',
  'computer-vision': 'Computer Vision',
  'nlp': 'NLP',
  'generative-ai': 'Generative AI',
  'capstone': 'Capstone',
};

const ai900Challenges = [
  { num: '01', title: 'Identify AI Workloads', domain: 'ai-workloads', href: '/docs/ai-901/ai-concepts/challenge-01' },
  { num: '02', title: 'Responsible AI Principles', domain: 'ai-workloads', href: '/docs/ai-901/ai-concepts/challenge-02' },
  { num: '03', title: 'Common AI Patterns and Use Cases', domain: 'ai-workloads', href: '/docs/ai-901/ai-concepts/challenge-03' },
  { num: '04', title: 'Azure AI Services Overview', domain: 'ai-workloads', href: '/docs/ai-901/ai-concepts/challenge-04' },
  { num: '05', title: 'Regression in Machine Learning', domain: 'machine-learning', href: '/docs/ai-901/ai-concepts/challenge-05' },
  { num: '06', title: 'Classification in Machine Learning', domain: 'machine-learning', href: '/docs/ai-901/ai-concepts/challenge-06' },
  { num: '07', title: 'Clustering in Machine Learning', domain: 'machine-learning', href: '/docs/ai-901/ai-concepts/challenge-07' },
  { num: '08', title: 'Deep Learning and Transformers', domain: 'machine-learning', href: '/docs/ai-901/ai-concepts/challenge-08' },
  { num: '09', title: 'Azure Machine Learning Workspace', domain: 'machine-learning', href: '/docs/ai-901/ai-concepts/challenge-09' },
  { num: '10', title: 'Image Classification', domain: 'computer-vision', href: '/docs/ai-901/foundry-implementation/challenge-10' },
  { num: '11', title: 'Object Detection', domain: 'computer-vision', href: '/docs/ai-901/foundry-implementation/challenge-11' },
  { num: '12', title: 'Optical Character Recognition (OCR)', domain: 'computer-vision', href: '/docs/ai-901/foundry-implementation/challenge-12' },
  { num: '13', title: 'Face Detection and Analysis', domain: 'computer-vision', href: '/docs/ai-901/foundry-implementation/challenge-13' },
  { num: '14', title: 'Text Analytics: Key Phrases and Entities', domain: 'nlp', href: '/docs/ai-901/foundry-implementation/challenge-14' },
  { num: '15', title: 'Sentiment Analysis and Language Detection', domain: 'nlp', href: '/docs/ai-901/foundry-implementation/challenge-15' },
  { num: '16', title: 'Speech Recognition and Synthesis', domain: 'nlp', href: '/docs/ai-901/foundry-implementation/challenge-16' },
  { num: '17', title: 'Language Translation', domain: 'nlp', href: '/docs/ai-901/foundry-implementation/challenge-17' },
  { num: '18', title: 'Azure AI Language and Speech Services', domain: 'nlp', href: '/docs/ai-901/foundry-implementation/challenge-18' },
  { num: '19', title: 'Generative AI Fundamentals', domain: 'generative-ai', href: '/docs/ai-901/foundry-implementation/challenge-19' },
  { num: '20', title: 'Azure OpenAI Service', domain: 'generative-ai', href: '/docs/ai-901/foundry-implementation/challenge-20' },
  { num: '21', title: 'Azure AI Foundry', domain: 'generative-ai', href: '/docs/ai-901/foundry-implementation/challenge-21' },
  { num: '22', title: 'Prompt Engineering Basics', domain: 'generative-ai', href: '/docs/ai-901/foundry-implementation/challenge-22' },
  { num: '23', title: 'Responsible AI for Generative AI', domain: 'generative-ai', href: '/docs/ai-901/foundry-implementation/challenge-23' },
  { num: '24', title: 'End-to-End: Azure AI Portfolio', domain: 'capstone', href: '/docs/ai-901/capstone/challenge-24' },
];

const ai102DomainLabels = {
  'plan-manage': 'Plan & Manage',
  'generative-ai': 'Generative AI',
  'agentic': 'AI Agents',
  'computer-vision': 'Computer Vision',
  'nlp': 'NLP',
  'knowledge-mining': 'Knowledge Mining',
  'capstone': 'Capstone',
};

const ai102Challenges = [
  { num: '01', title: 'Select the Right Azure AI Service', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-01' },
  { num: '02', title: 'Create and Configure Azure AI Resources', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-02' },
  { num: '03', title: 'Deploy AI Models', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-03' },
  { num: '04', title: 'SDKs, REST APIs, and Authentication', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-04' },
  { num: '05', title: 'CI/CD for AI Solutions', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-05' },
  { num: '06', title: 'Container Deployment for AI', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-06' },
  { num: '07', title: 'Monitor Azure AI Resources', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-07' },
  { num: '08', title: 'Cost Management for AI Services', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-08' },
  { num: '09', title: 'Secure Azure AI Resources', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-09' },
  { num: '10', title: 'Responsible AI Implementation', domain: 'plan-manage', href: '/docs/ai-103/plan-manage/challenge-10' },
  { num: '11', title: 'Azure AI Foundry Setup', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-11' },
  { num: '12', title: 'Deploy Generative AI Models', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-12' },
  { num: '13', title: 'Prompt Flow', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-13' },
  { num: '14', title: 'RAG Pattern: Basic', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-14' },
  { num: '15', title: 'RAG Pattern: Advanced', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-15' },
  { num: '16', title: 'Azure OpenAI: Provisioning and Configuration', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-16' },
  { num: '17', title: 'Prompt Engineering and Templates', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-17' },
  { num: '18', title: 'DALL-E and Multimodal Models', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-18' },
  { num: '19', title: 'Optimize Generative AI Solutions', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-19' },
  { num: '20', title: 'Multi-Model Orchestration', domain: 'generative-ai', href: '/docs/ai-103/generative-ai-agents/challenge-20' },
  { num: '21', title: 'Agent Fundamentals and Architecture', domain: 'agentic', href: '/docs/ai-103/generative-ai-agents/challenge-21' },
  { num: '22', title: 'Azure AI Agent Service', domain: 'agentic', href: '/docs/ai-103/generative-ai-agents/challenge-22' },
  { num: '23', title: 'Multi-Agent Orchestration', domain: 'agentic', href: '/docs/ai-103/generative-ai-agents/challenge-23' },
  { num: '24', title: 'Azure AI Vision - Image Analysis', domain: 'computer-vision', href: '/docs/ai-103/computer-vision/challenge-24' },
  { num: '25', title: 'Custom Vision - Image Classification', domain: 'computer-vision', href: '/docs/ai-103/computer-vision/challenge-25' },
  { num: '26', title: 'Custom Vision - Object Detection', domain: 'computer-vision', href: '/docs/ai-103/computer-vision/challenge-26' },
  { num: '27', title: 'OCR - Extract Text from Images', domain: 'computer-vision', href: '/docs/ai-103/computer-vision/challenge-27' },
  { num: '28', title: 'Face Detection and Analysis', domain: 'computer-vision', href: '/docs/ai-103/computer-vision/challenge-28' },
  { num: '29', title: 'Video Analysis with Video Indexer', domain: 'computer-vision', href: '/docs/ai-103/computer-vision/challenge-29' },
  { num: '30', title: 'Spatial Analysis', domain: 'computer-vision', href: '/docs/ai-103/computer-vision/challenge-30' },
  { num: '31', title: 'Text Analytics - Key Phrases, Entities, Sentiment', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-31' },
  { num: '32', title: 'PII Detection and Redaction', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-32' },
  { num: '33', title: 'Text and Document Translation', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-33' },
  { num: '34', title: 'Speech-to-Text', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-34' },
  { num: '35', title: 'Text-to-Speech and SSML', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-35' },
  { num: '36', title: 'Speech Translation', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-36' },
  { num: '37', title: 'Conversational Language Understanding (CLU)', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-37' },
  { num: '38', title: 'Custom Question Answering', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-38' },
  { num: '39', title: 'Custom Translation Models', domain: 'nlp', href: '/docs/ai-103/text-analysis/challenge-39' },
  { num: '40', title: 'Azure AI Search — Index and Skillset', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-40' },
  { num: '41', title: 'Custom Skills in Azure AI Search', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-41' },
  { num: '42', title: 'Search Queries — Syntax and Filters', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-42' },
  { num: '43', title: 'Knowledge Store Projections', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-43' },
  { num: '44', title: 'Semantic and Vector Search', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-44' },
  { num: '45', title: 'Azure Document Intelligence — Prebuilt Models', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-45' },
  { num: '46', title: 'Custom Document Intelligence Models', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-46' },
  { num: '47', title: 'Azure Content Understanding — Multimodal Analysis', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-47' },
  { num: '48', title: 'Multi-Format Processing Pipeline', domain: 'knowledge-mining', href: '/docs/ai-103/information-extraction/challenge-48' },
  { num: '49', title: 'End-to-End Enterprise AI Solution', domain: 'capstone', href: '/docs/ai-103/capstone/challenge-49' },
];

const az700DomainLabels = {
  'core-networking': 'Core Networking',
  'connectivity': 'Connectivity',
  'app-delivery': 'App Delivery',
  'private-access': 'Private Access',
  'network-security': 'Network Security',
  'capstone': 'Capstone',
};

const az700Challenges = [
  { num: '01', title: 'Hub-Spoke VNet Topology', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-01' },
  { num: '02', title: 'Subnets & Delegation', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-02' },
  { num: '03', title: 'Azure DNS & Custom Domains', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-03' },
  { num: '04', title: 'VNet Peering', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-04' },
  { num: '05', title: 'Global Peering & Gateway Transit', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-05' },
  { num: '06', title: 'Private DNS Zones', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-06' },
  { num: '07', title: 'User-Defined Routes & NVA', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-07' },
  { num: '08', title: 'Azure Virtual Network Manager', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-08' },
  { num: '09', title: 'Azure Route Server & BGP', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-09' },
  { num: '10', title: 'NAT Gateway', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-10' },
  { num: '11', title: 'Network Watcher & Diagnostics', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-11' },
  { num: '12', title: 'Azure Bastion', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-12' },
  { num: '13', title: 'DDoS Protection', domain: 'core-networking', href: '/docs/az-700/core-networking/challenge-13' },
  { num: '14', title: 'Site-to-Site VPN', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-14' },
  { num: '15', title: 'S2S VPN High Availability', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-15' },
  { num: '16', title: 'VPN SKU & IPsec Policies', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-16' },
  { num: '17', title: 'Point-to-Site VPN', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-17' },
  { num: '18', title: 'P2S Authentication Methods', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-18' },
  { num: '19', title: 'ExpressRoute Private Peering', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-19' },
  { num: '20', title: 'ExpressRoute Advanced', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-20' },
  { num: '21', title: 'ExpressRoute Microsoft Peering', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-21' },
  { num: '22', title: 'Virtual WAN Hub-Spoke', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-22' },
  { num: '23', title: 'Virtual WAN Routing & NVA', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-23' },
  { num: '24', title: 'Hybrid Connectivity Troubleshooting', domain: 'connectivity', href: '/docs/az-700/connectivity/challenge-24' },
  { num: '25', title: 'Azure Load Balancer', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-25' },
  { num: '26', title: 'Cross-Region & Gateway LB', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-26' },
  { num: '27', title: 'Traffic Manager', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-27' },
  { num: '28', title: 'Application Gateway Fundamentals', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-28' },
  { num: '29', title: 'Application Gateway TLS & Rewrites', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-29' },
  { num: '30', title: 'Application Gateway Scaling', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-30' },
  { num: '31', title: 'Azure Front Door', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-31' },
  { num: '32', title: 'Front Door Rules & Private Link', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-32' },
  { num: '33', title: 'Multi-Tier Global Load Balancing', domain: 'app-delivery', href: '/docs/az-700/app-delivery/challenge-33' },
  { num: '34', title: 'Private Endpoints & DNS', domain: 'private-access', href: '/docs/az-700/private-access/challenge-34' },
  { num: '35', title: 'PE for Multiple Services', domain: 'private-access', href: '/docs/az-700/private-access/challenge-35' },
  { num: '36', title: 'Private Link Service', domain: 'private-access', href: '/docs/az-700/private-access/challenge-36' },
  { num: '37', title: 'Private Link & On-Premises', domain: 'private-access', href: '/docs/az-700/private-access/challenge-37' },
  { num: '38', title: 'Service Endpoints & Policies', domain: 'private-access', href: '/docs/az-700/private-access/challenge-38' },
  { num: '39', title: 'SE to PE Migration', domain: 'private-access', href: '/docs/az-700/private-access/challenge-39' },
  { num: '40', title: 'NSG & Application Security Groups', domain: 'network-security', href: '/docs/az-700/network-security/challenge-40' },
  { num: '41', title: 'VNet Flow Logs & Traffic Analytics', domain: 'network-security', href: '/docs/az-700/network-security/challenge-41' },
  { num: '42', title: 'Azure Firewall Deployment', domain: 'network-security', href: '/docs/az-700/network-security/challenge-42' },
  { num: '43', title: 'Firewall Manager & Policies', domain: 'network-security', href: '/docs/az-700/network-security/challenge-43' },
  { num: '44', title: 'Secured Virtual Hub', domain: 'network-security', href: '/docs/az-700/network-security/challenge-44' },
  { num: '45', title: 'WAF on Application Gateway', domain: 'network-security', href: '/docs/az-700/network-security/challenge-45' },
  { num: '46', title: 'WAF on Front Door', domain: 'network-security', href: '/docs/az-700/network-security/challenge-46' },
  { num: '47', title: 'Hub-Spoke with NVA Chaining', domain: 'network-security', href: '/docs/az-700/network-security/challenge-47' },
  { num: '48', title: 'Network Segmentation & JIT', domain: 'network-security', href: '/docs/az-700/network-security/challenge-48' },
  { num: '49', title: 'Enterprise Multi-Region (Capstone)', domain: 'capstone', href: '/docs/az-700/capstone/challenge-49' },
];


function HomepageHeader() {
  return (
    <header className="hero--azure">
      <div className="container">
        <Heading as="h1" className="hero__title">
          Azure Cert Prep
        </Heading>
        <p className="hero__subtitle">Hands-on challenges for Microsoft Azure certification exams.</p>
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
                  <div className="exam-card__challenges">{exam.challenges} challenges</div>
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
          <p>24 exploration-based challenges — understand cloud concepts through hands-on portal navigation. $0 cost.</p>
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
          <p>28 hands-on challenges — from your first Entra ID user to a cross-domain capstone.</p>
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
          <p>50 design challenges — architecture decisions, trade-offs, and proof-of-concept validations.</p>
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
          <p>51 hands-on challenges — pipelines, security, monitoring, and end-to-end delivery lifecycle.</p>
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
          <p>52 hands-on challenges — identity, networking, AI security, Sentinel, and end-to-end defense.</p>
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
          <p>49 hands-on challenges — VPN, ExpressRoute, Firewall, Load Balancer, Private Link, and enterprise-grade network design.</p>
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
          <p>24 exploration-based challenges — ML, Computer Vision, NLP, and Generative AI concepts. $0 cost.</p>
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
          <p>49 hands-on challenges — OpenAI, Search, Vision, NLP, Agents, and enterprise AI solutions.</p>
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

const coverageData = [
  {
    exam: 'AZ-900',
    title: 'Azure Fundamentals',
    challenges: 24,
    href: '/docs/az-900/overview',
    domains: [
      { name: 'Cloud Concepts', weight: 27, color: 'var(--coverage-cloud-concepts)' },
      { name: 'Azure Services', weight: 38, color: 'var(--coverage-azure-services)' },
      { name: 'Management & Governance', weight: 35, color: 'var(--coverage-management)' },
    ],
  },
  {
    exam: 'AZ-104',
    title: 'Azure Administrator',
    challenges: 28,
    href: '/docs/az-104/overview',
    domains: [
      { name: 'Identity & Governance', weight: 22, color: 'var(--coverage-identity)' },
      { name: 'Storage', weight: 18, color: 'var(--coverage-storage)' },
      { name: 'Compute', weight: 22, color: 'var(--coverage-compute)' },
      { name: 'Networking', weight: 18, color: 'var(--coverage-networking)' },
      { name: 'Monitor & Maintain', weight: 20, color: 'var(--coverage-monitor)' },
    ],
  },
  {
    exam: 'AZ-305',
    title: 'Solutions Architect',
    challenges: 50,
    href: '/docs/az-305/overview',
    domains: [
      { name: 'Identity & Monitoring', weight: 27, color: 'var(--coverage-identity)' },
      { name: 'Data Storage', weight: 22, color: 'var(--coverage-storage)' },
      { name: 'Business Continuity', weight: 18, color: 'var(--coverage-networking)' },
      { name: 'Infrastructure', weight: 33, color: 'var(--coverage-compute)' },
    ],
  },
  {
    exam: 'AZ-400',
    title: 'DevOps Engineer',
    challenges: 51,
    href: '/docs/az-400/overview',
    domains: [
      { name: 'Processes', weight: 12, color: 'var(--coverage-cloud-concepts)' },
      { name: 'Source Control', weight: 12, color: 'var(--coverage-azure-services)' },
      { name: 'Pipelines', weight: 39, color: 'var(--coverage-compute)' },
      { name: 'Security', weight: 22, color: 'var(--coverage-identity)' },
      { name: 'Instrumentation', weight: 15, color: 'var(--coverage-monitor)' },
    ],
  },
  {
    exam: 'SC-500',
    title: 'Security Operations',
    challenges: 52,
    href: '/docs/sc-500/overview',
    domains: [
      { name: 'Identity & Governance', weight: 22, color: 'var(--coverage-identity)' },
      { name: 'Storage & Networking', weight: 27, color: 'var(--coverage-networking)' },
      { name: 'AI Security', weight: 10, color: 'var(--coverage-ai-security)' },
      { name: 'Secure Compute', weight: 20, color: 'var(--coverage-compute)' },
      { name: 'Security Posture', weight: 21, color: 'var(--coverage-monitor)' },
    ],
  },
  {
    exam: 'AZ-700',
    title: 'Network Engineer',
    challenges: 49,
    href: '/docs/az-700/overview',
    domains: [
      { name: 'Core Networking', weight: 27, color: 'var(--coverage-networking)' },
      { name: 'Connectivity', weight: 22, color: 'var(--coverage-compute)' },
      { name: 'App Delivery', weight: 18, color: 'var(--coverage-azure-services)' },
      { name: 'Private Access', weight: 12, color: 'var(--coverage-identity)' },
      { name: 'Network Security', weight: 21, color: 'var(--coverage-monitor)' },
    ],
  },
  {
    exam: 'AI-901',
    title: 'Azure AI Fundamentals',
    challenges: 24,
    href: '/docs/ai-901/overview',
    domains: [
      { name: 'AI Workloads', weight: 17, color: 'var(--coverage-cloud-concepts)' },
      { name: 'Machine Learning', weight: 22, color: 'var(--coverage-compute)' },
      { name: 'Computer Vision', weight: 17, color: 'var(--coverage-azure-services)' },
      { name: 'NLP', weight: 22, color: 'var(--coverage-identity)' },
      { name: 'Generative AI', weight: 22, color: 'var(--coverage-networking)' },
    ],
  },
  {
    exam: 'AI-103',
    title: 'Azure AI Engineer',
    challenges: 49,
    href: '/docs/ai-103/overview',
    domains: [
      { name: 'Plan & Manage', weight: 20, color: 'var(--coverage-identity)' },
      { name: 'Generative AI', weight: 20, color: 'var(--coverage-compute)' },
      { name: 'AI Agents', weight: 6, color: 'var(--coverage-ai-security)' },
      { name: 'Computer Vision', weight: 14, color: 'var(--coverage-azure-services)' },
      { name: 'NLP', weight: 18, color: 'var(--coverage-networking)' },
      { name: 'Knowledge Mining', weight: 22, color: 'var(--coverage-monitor)' },
    ],
  },
];

function CertificationCoverage() {
  return (
    <section style={{padding: '2rem 0'}}>
      <div className="container" style={{maxWidth: '800px', margin: '0 auto'}}>
        <div className="section-heading">
          <Heading as="h2">100% Certification Coverage</Heading>
          <p>Every exam domain from the official study guides mapped to hands-on challenges.</p>
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
          Aligned with official Microsoft study guides — May 2026
        </p>
      </div>
    </section>
  );
}

function ExamRoadmap() {
  return (
    <section style={{padding: '2rem 0', background: 'var(--ifm-color-emphasis-100)'}}>
      <div className="container" style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Heading as="h2" style={{textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem'}}>Exam Roadmap</Heading>
        <p style={{textAlign: 'center', color: 'var(--ifm-color-emphasis-600)', fontSize: '1.1rem', maxWidth: '600px', marginBottom: '2rem'}}>
          More exams coming soon. Each will follow the same hands-on, challenge-based format.
        </p>
        <table style={{width: 'auto', borderCollapse: 'collapse'}}>
          <thead>
            <tr>
              <th style={{textAlign: 'center'}}>Exam</th>
              <th style={{textAlign: 'center'}}>Title</th>
              <th style={{textAlign: 'center'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AZ-900</strong></td>
              <td style={{textAlign: 'center'}}>Azure Fundamentals</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Available (24 challenges)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AZ-104</strong></td>
              <td style={{textAlign: 'center'}}>Azure Administrator</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Available (28 challenges)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AZ-305</strong></td>
              <td style={{textAlign: 'center'}}>Solutions Architect Expert</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Available (50 challenges)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AZ-400</strong></td>
              <td style={{textAlign: 'center'}}>DevOps Engineer Expert</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Available (51 challenges)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}><strong>SC-500</strong></td>
              <td style={{textAlign: 'center'}}>Cloud and AI Security Engineer <small style={{opacity: 0.7}}>(replaces AZ-500)</small></td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Available (52 challenges)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AZ-700</strong></td>
              <td style={{textAlign: 'center'}}>Azure Network Engineer Associate</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Available (49 challenges)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AI-901</strong></td>
              <td style={{textAlign: 'center'}}>Azure AI Fundamentals</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Available (24 challenges)</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}><strong>AI-103</strong></td>
              <td style={{textAlign: 'center'}}>Azure AI Engineer Associate</td>
              <td style={{textAlign: 'center'}}><span style={{color: '#27ae60', fontWeight: 600}}>Available (49 challenges)</span></td>
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
      title="Hands-on Azure Certification Prep"
      description="Don't just study — build it. Hands-on challenges for Azure certification exams. AZ-900, AZ-104, AZ-305, AZ-400, SC-500, AZ-700, AI-901, and AI-103 available.">
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

