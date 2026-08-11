import type { QueryNode } from './query';

export interface OsintTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  queryAst: QueryNode;
}

export const BuiltInTemplates: OsintTemplate[] = [
  {
    id: 'tpl-1',
    title: 'Admin Panel Discovery',
    description: 'Finds common admin panel login pages across a domain',
    category: 'Reconnaissance',
    tags: ['admin', 'login', 'portal'],
    queryAst: {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      children: [
        { id: '1', type: 'operator', operator: 'inurl', value: 'admin OR login OR wp-admin' },
        { id: '2', type: 'operator', operator: 'intitle', value: 'admin login OR administrator' }
      ]
    }
  },
  {
    id: 'tpl-2',
    title: 'Exposed Database Files',
    description: 'Searches for exposed database backups and SQL dumps',
    category: 'File Discovery',
    tags: ['sql', 'database', 'dump'],
    queryAst: {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      children: [
        { id: '1', type: 'operator', operator: 'ext', value: 'sql OR db OR sqlite OR mdb' },
        { id: '2', type: 'operator', operator: 'intext', value: 'insert into OR values' }
      ]
    }
  },
  {
    id: 'tpl-3',
    title: 'Env & Config Leaks',
    description: 'Finds exposed environment variables and configuration files',
    category: 'Credential Leaks',
    tags: ['env', 'config', 'secrets'],
    queryAst: {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      children: [
        { id: '1', type: 'operator', operator: 'ext', value: 'env OR conf OR config OR yaml' },
        { id: '2', type: 'operator', operator: 'intext', value: 'DB_PASSWORD OR AWS_ACCESS_KEY_ID OR API_KEY' }
      ]
    }
  },
  {
    id: 'tpl-4',
    title: 'Directory Traversal',
    description: 'Discovers open directories indexing files publicly',
    category: 'Reconnaissance',
    tags: ['index', 'directories', 'files'],
    queryAst: {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      children: [
        { id: '1', type: 'operator', operator: 'intitle', value: 'index of' },
        { id: '2', type: 'operator', operator: 'intext', value: 'parent directory OR size OR last modified' }
      ]
    }
  },
  {
    id: 'tpl-5',
    title: 'Exposed Log Files',
    description: 'Finds application, server, and access logs that might contain sensitive data',
    category: 'File Discovery',
    tags: ['logs', 'access', 'error'],
    queryAst: {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      children: [
        { id: '1', type: 'operator', operator: 'ext', value: 'log' },
        { id: '2', type: 'operator', operator: 'inurl', value: 'logs OR access OR error' }
      ]
    }
  },
  {
    id: 'tpl-6',
    title: 'Cloud Storage Buckets',
    description: 'Hunts for exposed AWS S3, Google Cloud, and Azure buckets',
    category: 'Cloud & IoT',
    tags: ['s3', 'cloud', 'buckets'],
    queryAst: {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      children: [
        { id: '1', type: 'operator', operator: 'site', value: 's3.amazonaws.com OR storage.googleapis.com' },
        { id: '2', type: 'operator', operator: 'intext', value: 'NoSuchBucket OR listbucketresult' }
      ]
    }
  },
  {
    id: 'tpl-7',
    title: 'Git Repository Exposure',
    description: 'Searches for exposed .git directories and config files',
    category: 'Credential Leaks',
    tags: ['git', 'source code', 'repos'],
    queryAst: {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      children: [
        { id: '1', type: 'operator', operator: 'inurl', value: '.git' },
        { id: '2', type: 'operator', operator: 'intitle', value: 'index of /.git' }
      ]
    }
  },
  {
    id: 'tpl-8',
    title: 'Internal Video/Media Leaks',
    description: 'Finds confidential or internal media files that are publicly accessible',
    category: 'File Discovery',
    tags: ['video', 'media', 'confidential'],
    queryAst: {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      children: [
        { id: '1', type: 'operator', operator: 'ext', value: 'mp4 OR avi OR mov' },
        { id: '2', type: 'operator', operator: 'intitle', value: 'confidential OR internal OR do not share' }
      ]
    }
  },
  {
    id: 'tpl-9',
    title: 'JIRA / Trello Board Leaks',
    description: 'Finds exposed internal project management boards',
    category: 'Reconnaissance',
    tags: ['jira', 'trello', 'boards'],
    queryAst: {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      children: [
        { id: '1', type: 'operator', operator: 'inurl', value: 'trello.com/b OR atlassian.net' },
        { id: '2', type: 'operator', operator: 'intext', value: 'password OR credentials OR internal' }
      ]
    }
  },
  {
    id: 'tpl-10',
    title: 'IoT Webcams & Devices',
    description: 'Finds publicly exposed webcams and IoT devices',
    category: 'Cloud & IoT',
    tags: ['iot', 'webcam', 'devices'],
    queryAst: {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      children: [
        { id: '1', type: 'operator', operator: 'intitle', value: 'webcamxp OR network camera OR live view' },
        { id: '2', type: 'operator', operator: 'inurl', value: 'view/view.shtml OR axis-cgi' }
      ]
    }
  },
  {
    id: 'tpl-11',
    title: 'SSH Key Exposure',
    description: 'Searches for exposed private RSA and DSA keys',
    category: 'Credential Leaks',
    tags: ['ssh', 'keys', 'rsa'],
    queryAst: {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      children: [
        { id: '1', type: 'operator', operator: 'ext', value: 'pem OR ppk OR key' },
        { id: '2', type: 'operator', operator: 'intext', value: 'BEGIN RSA PRIVATE KEY' }
      ]
    }
  },
  {
    id: 'tpl-12',
    title: 'Employee Resumes / CVs',
    description: 'Hunts for internal resumes or CVs to gather organizational intelligence',
    category: 'Social & People',
    tags: ['resume', 'cv', 'staff'],
    queryAst: {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      children: [
        { id: '1', type: 'operator', operator: 'ext', value: 'pdf OR docx' },
        { id: '2', type: 'operator', operator: 'intitle', value: 'resume OR curriculum vitae' }
      ]
    }
  }
];
