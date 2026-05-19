import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const stats = [
  { number: '78', label: 'Challenges' },
  { number: '2', label: 'Exams' },
  { number: '100%', label: 'Coverage' },
  { number: 'v2026.04', label: 'Exam Objectives' },
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
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/az-104/overview">
            AZ-104 (28 challenges)
          </Link>
          <Link
            className="button button--secondary button--lg"
            style={{marginLeft: '1rem'}}
            to="/docs/az-305/overview">
            AZ-305 (50 challenges)
          </Link>
          <Link
            className="button button--outline button--lg"
            style={{color: 'white', borderColor: 'white', marginLeft: '1rem'}}
            href="https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1">
            Open Lab
          </Link>
        </div>
      </div>
    </header>
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

function CertificationCoverage() {
  return (
    <section style={{padding: '2rem 0'}}>
      <div className="container" style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Heading as="h2" style={{textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem'}}>100% Certification Coverage</Heading>
        <p style={{textAlign: 'center', color: 'var(--ifm-color-emphasis-600)', fontSize: '1.1rem', maxWidth: '600px', marginBottom: '2rem'}}>
          Every exam domain from the official study guides mapped to hands-on challenges.
        </p>
        <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center'}}>
          <div>
            <h3 style={{textAlign: 'center', marginBottom: '1rem'}}>AZ-104 (28 challenges)</h3>
            <table style={{width: 'auto', borderCollapse: 'collapse'}}>
              <thead>
                <tr>
                  <th style={{textAlign: 'center'}}>Domain</th>
                  <th style={{textAlign: 'center'}}>Weight</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--identity">Identity & Governance</span></td><td style={{textAlign: 'center'}}>20-25%</td></tr>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--storage">Storage</span></td><td style={{textAlign: 'center'}}>15-20%</td></tr>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--compute">Compute</span></td><td style={{textAlign: 'center'}}>20-25%</td></tr>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--networking">Networking</span></td><td style={{textAlign: 'center'}}>15-20%</td></tr>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--monitor">Monitor & Maintain</span></td><td style={{textAlign: 'center'}}>10-15%</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 style={{textAlign: 'center', marginBottom: '1rem'}}>AZ-305 (50 challenges)</h3>
            <table style={{width: 'auto', borderCollapse: 'collapse'}}>
              <thead>
                <tr>
                  <th style={{textAlign: 'center'}}>Domain</th>
                  <th style={{textAlign: 'center'}}>Weight</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--identity-gov">Identity & Monitoring</span></td><td style={{textAlign: 'center'}}>25-30%</td></tr>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--data">Data Storage</span></td><td style={{textAlign: 'center'}}>20-25%</td></tr>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--bcdr">Business Continuity</span></td><td style={{textAlign: 'center'}}>15-20%</td></tr>
                <tr><td style={{textAlign: 'center'}}><span className="domain-badge domain-badge--infra">Infrastructure</span></td><td style={{textAlign: 'center'}}>30-35%</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <p style={{textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', opacity: 0.7}}>
          Aligned with official Microsoft study guides as of April 2026.
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
              <td style={{textAlign: 'center'}}>AZ-400</td>
              <td style={{textAlign: 'center'}}>DevOps Engineer Expert</td>
              <td style={{textAlign: 'center'}}><span style={{opacity: 0.6}}>Planned</span></td>
            </tr>
            <tr>
              <td style={{textAlign: 'center'}}>AZ-500</td>
              <td style={{textAlign: 'center'}}>Azure Security Engineer</td>
              <td style={{textAlign: 'center'}}><span style={{opacity: 0.6}}>Planned</span></td>
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
      description="Don't just study — build it. Hands-on challenges for Azure certification exams. AZ-104 and AZ-305 available.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <ChallengeGrid />
        <AZ305ChallengeGrid />
        <CertificationCoverage />
        <ExamRoadmap />

      </main>
    </Layout>
  );
}
