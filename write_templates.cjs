const fs = require('fs');

const templates = `import type { QueryNode } from "./query";

export interface TemplateVariable {
  name: string;
  label: string;
  description: string;
  defaultValue?: string;
}

export interface OsintTemplate {
  id: string;
  title: string;
  description: string;
  category: 'Reconnaissance' | 'Vulnerability' | 'File Discovery' | 'Credential Leaks' | 'Social Media';
  variables: TemplateVariable[];
  queryAst: QueryNode;
  tags: string[];
}

export const BuiltInTemplates: OsintTemplate[] = [
  {
    id: 't-exposed-configs',
    title: 'Exposed Configuration Files',
    description: 'Find exposed configuration files for a target domain.',
    category: 'File Discovery',
    tags: ['config', 'secrets', 'env'],
    variables: [{ name: 'DOMAIN', label: 'Target Domain', description: 'The domain to scan', defaultValue: 'example.com' }],
    queryAst: {
      id: 'root', type: 'group', booleanOp: 'AND', children: [
        { id: '1', type: 'operator', operator: 'site', value: '{{DOMAIN}}' },
        { id: '2', type: 'group', booleanOp: 'OR', children: [
          { id: '3', type: 'operator', operator: 'ext', value: 'env' },
          { id: '4', type: 'operator', operator: 'ext', value: 'yml' },
          { id: '5', type: 'operator', operator: 'ext', value: 'json' },
          { id: '6', type: 'operator', operator: 'ext', value: 'config' }
        ]}
      ]
    }
  },
  {
    id: 't-directory-listing',
    title: 'Open Directory Listings',
    description: 'Find exposed web directories on a target domain.',
    category: 'Reconnaissance',
    tags: ['dir', 'index', 'exposed'],
    variables: [{ name: 'DOMAIN', label: 'Target Domain', description: 'The domain to scan', defaultValue: 'example.com' }],
    queryAst: {
      id: 'root', type: 'group', booleanOp: 'AND', children: [
        { id: '1', type: 'operator', operator: 'site', value: '{{DOMAIN}}' },
        { id: '2', type: 'operator', operator: 'intitle', value: 'index of' },
        { id: '3', type: 'term', value: 'parent directory' }
      ]
    }
  },
  {
    id: 't-pdf-reports',
    title: 'Public PDF Reports',
    description: 'Find public PDF reports and documents on a target domain.',
    category: 'File Discovery',
    tags: ['pdf', 'document', 'report'],
    variables: [{ name: 'DOMAIN', label: 'Target Domain', description: 'The domain to scan', defaultValue: 'example.com' }],
    queryAst: {
      id: 'root', type: 'group', booleanOp: 'AND', children: [
        { id: '1', type: 'operator', operator: 'site', value: '{{DOMAIN}}' },
        { id: '2', type: 'operator', operator: 'ext', value: 'pdf' },
        { id: '3', type: 'term', value: 'confidential' }
      ]
    }
  },
  {
    id: 't-sql-dumps',
    title: 'Exposed SQL Dumps',
    description: 'Find exposed SQL database dumps.',
    category: 'Credential Leaks',
    tags: ['sql', 'database', 'dump'],
    variables: [{ name: 'DOMAIN', label: 'Target Domain', description: 'The domain to scan', defaultValue: 'example.com' }],
    queryAst: {
      id: 'root', type: 'group', booleanOp: 'AND', children: [
        { id: '1', type: 'operator', operator: 'site', value: '{{DOMAIN}}' },
        { id: '2', type: 'operator', operator: 'ext', value: 'sql' },
        { id: '3', type: 'term', value: 'INSERT INTO' }
      ]
    }
  },
  {
    id: 't-log-files',
    title: 'Server Log Files',
    description: 'Find exposed server log files.',
    category: 'File Discovery',
    tags: ['log', 'server', 'error'],
    variables: [{ name: 'DOMAIN', label: 'Target Domain', description: 'The domain to scan', defaultValue: 'example.com' }],
    queryAst: {
      id: 'root', type: 'group', booleanOp: 'AND', children: [
        { id: '1', type: 'operator', operator: 'site', value: '{{DOMAIN}}' },
        { id: '2', type: 'operator', operator: 'ext', value: 'log' },
        { id: '3', type: 'term', value: 'error' }
      ]
    }
  },
  {
    id: 't-excel-data',
    title: 'Spreadsheets & Data',
    description: 'Find exposed Excel spreadsheets or CSV data files.',
    category: 'File Discovery',
    tags: ['excel', 'csv', 'data'],
    variables: [{ name: 'DOMAIN', label: 'Target Domain', description: 'The domain to scan', defaultValue: 'example.com' }],
    queryAst: {
      id: 'root', type: 'group', booleanOp: 'AND', children: [
        { id: '1', type: 'operator', operator: 'site', value: '{{DOMAIN}}' },
        { id: '2', type: 'group', booleanOp: 'OR', children: [
          { id: '3', type: 'operator', operator: 'ext', value: 'xlsx' },
          { id: '4', type: 'operator', operator: 'ext', value: 'csv' }
        ]}
      ]
    }
  },
  {
    id: 't-admin-panels',
    title: 'Admin Login Panels',
    description: 'Find admin login pages on a target domain.',
    category: 'Reconnaissance',
    tags: ['admin', 'login', 'panel'],
    variables: [{ name: 'DOMAIN', label: 'Target Domain', description: 'The domain to scan', defaultValue: 'example.com' }],
    queryAst: {
      id: 'root', type: 'group', booleanOp: 'AND', children: [
        { id: '1', type: 'operator', operator: 'site', value: '{{DOMAIN}}' },
        { id: '2', type: 'group', booleanOp: 'OR', children: [
          { id: '3', type: 'operator', operator: 'intitle', value: 'admin' },
          { id: '4', type: 'operator', operator: 'intitle', value: 'login' },
          { id: '5', type: 'operator', operator: 'inurl', value: 'admin' }
        ]}
      ]
    }
  },
  {
    id: 't-git-repos',
    title: 'Exposed Git Repositories',
    description: 'Find exposed .git directories.',
    category: 'Credential Leaks',
    tags: ['git', 'repo', 'source'],
    variables: [{ name: 'DOMAIN', label: 'Target Domain', description: 'The domain to scan', defaultValue: 'example.com' }],
    queryAst: {
      id: 'root', type: 'group', booleanOp: 'AND', children: [
        { id: '1', type: 'operator', operator: 'site', value: '{{DOMAIN}}' },
        { id: '2', type: 'operator', operator: 'inurl', value: '.git' },
        { id: '3', type: 'operator', operator: 'intitle', value: 'index of' }
      ]
    }
  }
];
`;

fs.writeFileSync('src/core/templates.ts', templates);
console.log('Templates written successfully.');
