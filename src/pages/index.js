import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const stats = [
  { number: '16', label: 'Challenges' },
  { number: '100%', label: 'AZ-104 Coverage' },
  { number: '~$3', label: 'Total Cost' },
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
];

const domainLabels = {
  identity: 'Identity & Governance',
  storage: 'Storage',
  compute: 'Compute',
  networking: 'Networking',
  monitor: 'Monitor',
};

const referenceTable = [
  { onprem: 'Active Directory', azure: 'Microsoft Entra ID', desc: 'Identity & access management' },
  { onprem: 'Group Policy (GPO)', azure: 'Azure Policy', desc: 'Compliance & governance' },
  { onprem: 'File server (SMB)', azure: 'Azure Files', desc: 'Managed file shares' },
  { onprem: 'NAS / SAN', azure: 'Azure Blob Storage', desc: 'Object & block storage' },
  { onprem: 'Hyper-V / VMware', azure: 'Azure Virtual Machines', desc: 'Compute workloads' },
  { onprem: 'IIS / Apache', azure: 'Azure App Service', desc: 'Web app hosting' },
  { onprem: 'Docker host', azure: 'Azure Container Apps', desc: 'Container workloads' },
  { onprem: 'VLAN / Subnet', azure: 'Azure VNet / Subnet', desc: 'Network isolation' },
  { onprem: 'Firewall rules', azure: 'NSG / Azure Firewall', desc: 'Traffic control' },
  { onprem: 'DNS server', azure: 'Azure DNS', desc: 'Name resolution' },
  { onprem: 'F5 / HAProxy', azure: 'Azure Load Balancer', desc: 'Traffic distribution' },
  { onprem: 'Nagios / Zabbix', azure: 'Azure Monitor', desc: 'Monitoring & alerts' },
  { onprem: 'Veeam / SCDPM', azure: 'Azure Backup', desc: 'Backup & recovery' },
  { onprem: 'DR site', azure: 'Azure Site Recovery', desc: 'Disaster recovery' },
];

function HomepageHeader() {
  return (
    <header className="hero--azure">
      <div className="container">
        <Heading as="h1" className="hero__title">
          ☁️ Azure Cert Prep
        </Heading>
        <p className="hero__subtitle">"Don't just study — build it."</p>
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
            Start with AZ-104 →
          </Link>
          <Link
            className="button button--outline button--lg"
            style={{color: 'white', borderColor: 'white', marginLeft: '1rem'}}
            href="https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1">
            🖥️ Open Lab
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
          <Heading as="h2">16 Challenges</Heading>
          <p>Progressive difficulty — from your first Entra ID user to a cross-domain capstone.</p>
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

function ReferenceTable() {
  return (
    <section style={{padding: '2rem 0', background: 'var(--ifm-color-emphasis-100)'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">Sysadmin ↔ Azure</Heading>
          <p>You already know the concepts. Here's how they translate to Azure.</p>
        </div>
        <div className="reference-table">
          <table>
            <thead>
              <tr>
                <th>On-Prem / Sysadmin</th>
                <th>Azure Equivalent</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {referenceTable.map((row, idx) => (
                <tr key={idx}>
                  <td><code>{row.onprem}</code></td>
                  <td><strong>{row.azure}</strong></td>
                  <td>{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CertificationCoverage() {
  return (
    <section style={{padding: '2rem 0'}}>
      <div className="container">
        <div className="section-heading">
          <Heading as="h2">100% Certification Coverage</Heading>
          <p>Every exam domain from the AZ-104 study guide mapped to hands-on challenges.</p>
        </div>
        <div className="row" style={{justifyContent: 'center'}}>
          <div className="col col--8">
            <table style={{width: '100%'}}>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Exam Weight</th>
                  <th>Challenges</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="domain-badge domain-badge--identity">Identity & Governance</span></td>
                  <td>20–25%</td>
                  <td>01, 02, 03</td>
                </tr>
                <tr>
                  <td><span className="domain-badge domain-badge--storage">Storage</span></td>
                  <td>15–20%</td>
                  <td>04, 05, 06</td>
                </tr>
                <tr>
                  <td><span className="domain-badge domain-badge--compute">Compute</span></td>
                  <td>20–25%</td>
                  <td>07, 08, 09, 10</td>
                </tr>
                <tr>
                  <td><span className="domain-badge domain-badge--networking">Networking</span></td>
                  <td>15–20%</td>
                  <td>11, 12, 13</td>
                </tr>
                <tr>
                  <td><span className="domain-badge domain-badge--monitor">Monitor & Maintain</span></td>
                  <td>10–15%</td>
                  <td>14, 15</td>
                </tr>
              </tbody>
            </table>
            <p style={{textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', opacity: 0.7}}>
              Aligned with the <a href="https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104">official AZ-104 study guide</a> as of April 2026.
              Challenge 16 is a cross-domain capstone.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Layout
      title="Hands-on Azure Certification Prep"
      description="Don't just study — build it. Hands-on challenges for Azure certification exams. Start with AZ-104 Azure Administrator.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <ChallengeGrid />
        <CertificationCoverage />
        <ReferenceTable />
      </main>
    </Layout>
  );
}
