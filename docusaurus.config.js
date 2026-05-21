// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Azure Cert Prep',
  tagline: "Don't just study — build it.",
  favicon: 'img/logo.svg',

  markdown: {
    format: 'mdx',
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  url: 'https://azurecertprep.github.io',
  baseUrl: '/',

  organizationName: 'azurecertprep',
  projectName: 'azurecertprep.github.io',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt-br'],
    localeConfigs: {
      en: { label: 'English', htmlLang: 'en-US' },
      'pt-br': { label: 'Português (Brasil)', htmlLang: 'pt-BR' },
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/azurecertprep/azurecertprep.github.io/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        gtag: {
          trackingID: 'G-XKM46V2305',
          anonymizeIP: true,
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/social-card.png',
      colorMode: {
        defaultMode: 'dark',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Azure Cert Prep',
        logo: {
          alt: 'Azure Cert Prep Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'az900Sidebar',
            position: 'left',
            label: 'AZ-900',
          },
          {
            type: 'docSidebar',
            sidebarId: 'az104Sidebar',
            position: 'left',
            label: 'AZ-104',
          },
          {
            type: 'docSidebar',
            sidebarId: 'az305Sidebar',
            position: 'left',
            label: 'AZ-305',
          },
          {
            type: 'docSidebar',
            sidebarId: 'az400Sidebar',
            position: 'left',
            label: 'AZ-400',
          },
          {
            type: 'docSidebar',
            sidebarId: 'sc500Sidebar',
            position: 'left',
            label: 'SC-500',
          },
          {
            type: 'localeDropdown',
            position: 'right',
          },
          {
            href: 'https://github.com/azurecertprep/azurecertprep.github.io',
            label: 'GitHub',
            position: 'right',
          },
          {
            href: 'https://github.com/azurecertprep/azurecertprep.github.io/stargazers',
            label: '⭐ Star',
            position: 'right',
          },
          {
            href: 'https://codespaces.new/azurecertprep/azurecertprep.github.io?quickstart=1',
            label: 'Open Lab',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Exams',
            items: [
              {
                label: 'AZ-900: Azure Fundamentals',
                to: '/docs/az-900/overview',
              },
              {
                label: 'AZ-104: Azure Administrator',
                to: '/docs/az-104/overview',
              },
              {
                label: 'AZ-305: Solutions Architect',
                to: '/docs/az-305/overview',
              },
              {
                label: 'AZ-400: DevOps Engineer',
                to: '/docs/az-400/overview',
              },
              {
                label: 'SC-500: Cloud & AI Security',
                to: '/docs/sc-500/overview',
              },
            ],
          },
          {
            title: 'Resources',
            items: [
              {
                label: 'Microsoft Learn — AZ-900',
                href: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/',
              },
              {
                label: 'Microsoft Learn — AZ-104',
                href: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/',
              },
              {
                label: 'Microsoft Learn — AZ-305',
                href: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-solutions-architect/',
              },
              {
                label: 'Microsoft Learn — AZ-400',
                href: 'https://learn.microsoft.com/en-us/credentials/certifications/devops-engineer/',
              },
              {
                label: 'Microsoft Learn — SC-500',
                href: 'https://learn.microsoft.com/en-us/credentials/certifications/cloud-ai-security-engineer/',
              },
              {
                label: 'Free Practice Assessment',
                href: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/?practice-assessment-type=certification',
              },
              {
                label: 'Exam Sandbox',
                href: 'https://aka.ms/examdemo',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub Discussions',
                href: 'https://github.com/azurecertprep/azurecertprep.github.io/discussions',
              },
              {
                label: 'Report an Issue',
                href: 'https://github.com/azurecertprep/azurecertprep.github.io/issues',
              },
            ],
          },
          {
            title: 'Related Projects',
            items: [
              {
                label: 'Kubernetes Hackathon',
                href: 'https://k8shackathon.com',
              },
              {
                label: 'Linux Hackathon',
                href: 'https://linuxhackathon.com',
              },
              {
                label: 'AKS Learning',
                href: 'https://aks-learning.github.io',
              },
              {
                label: 'From Server to Cluster',
                href: 'https://fromservertocluster.com',
              },
              {
                label: 'AI for Infrastructure',
                href: 'https://ai4infra.com',
              },
              {
                label: 'Azure Governance',
                href: 'https://azgovernance.com',
              },
              {
                label: 'AZ-900 Study Guide',
                href: 'https://github.com/ricmmartins/study-guide-az900',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Azure Cert Prep. Not affiliated with Microsoft. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['powershell', 'bicep', 'json', 'bash'],
      },
    }),
};

export default config;
