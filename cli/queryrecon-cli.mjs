#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { clearLine, cursorTo } from 'node:readline';
import { createInterface } from 'node:readline/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL_DIR = join(ROOT, '.queryrecon-local');
const CONFIG_FILE = join(LOCAL_DIR, 'cli-config.json');
const SESSION_FILE = join(LOCAL_DIR, 'cli-session.json');
const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => color ? `\x1b[${code}m${text}\x1b[0m` : String(text);
const cyan = text => paint('96', text);
const blue = text => paint('38;5;69', text);
const violet = text => paint('38;5;141', text);
const green = text => paint('92', text);
const amber = text => paint('93', text);
const red = text => paint('91', text);
const bold = text => paint('1', text);
const dim = text => paint('2', text);
const line = (label = '') => dim(`--${label ? ` ${label} ` : ''}${'-'.repeat(Math.max(2, 58 - label.length))}`);
const BRAND = [
  '   ___                         ____                       ',
  '  / _ \\ _   _  ___ _ __ _   _|  _ \\ ___  ___ ___  _ __ ',
  " | | | | | | |/ _ \\ '__| | | | |_) / _ \\/ __/ _ \\| '_ \\",
  ' | |_| | |_| |  __/ |  | |_| |  _ <  __/ (_| (_) | | | |',
  '  \\__\\_\\__,_|\\___|_|   \\__, |_| \\_\\___|\\___\\___/|_| |_|',
  '                         |___/                            ',
];

function banner() {
  console.log();
  BRAND.forEach((row, index) => console.log(index < 2 ? cyan(row) : index < 4 ? blue(row) : violet(row)));
  console.log(`${bold('  HERMES COMMAND DECK')} ${dim('// local agent interface v2')}`);
  console.log(line());
}

function notice(title, body, tone = 'cyan') {
  const accent = { cyan, green, amber, red }[tone] || cyan;
  console.log(`${accent('◆')} ${bold(title)}${body ? `  ${dim(body)}` : ''}`);
}

const runtimeLabel = config => config.provider ? `${config.provider}/${config.model}` : config.model;

export function safeLocalEndpoint(value) {
  const url = new URL(value.trim().replace(/\/+$/, ''));
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)) throw new Error('Hermes endpoint must use localhost, 127.0.0.1, or ::1.');
  return url.origin;
}

export function parseHermesReply(message = {}) {
  let content = typeof message.content === 'string' ? message.content.trim() : '';
  let thinking = typeof message.reasoning_content === 'string' ? message.reasoning_content.trim() : typeof message.thinking === 'string' ? message.thinking.trim() : '';
  const tagged = content.match(/<think>([\s\S]*?)<\/think>/i);
  if (!thinking && tagged) thinking = tagged[1].trim();
  if (tagged) content = content.replace(tagged[0], '').trim();
  if (!thinking && content.includes('</think>')) {
    const [trace, answer] = content.split('</think>', 2);
    thinking = trace.trim();
    content = answer.trim();
  }
  if (!content) throw new Error('Hermes returned no visible assistant message.');
  return { content, thinking: thinking || undefined };
}

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}

async function saveJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 });
}

export function envValue(source, name) {
  const match = String(source).match(new RegExp(`^\\s*${name}\\s*=\\s*(.*?)\\s*$`, 'm'));
  return match ? match[1].replace(/^(['"])(.*)\1$/, '$2') : '';
}

async function detectHermesConfig() {
  const home = process.env.HERMES_HOME || (process.platform === 'win32'
    ? join(process.env.LOCALAPPDATA || homedir(), 'hermes')
    : join(homedir(), '.hermes'));
  const source = await readFile(join(home, '.env'), 'utf8').catch(() => '');
  const host = envValue(source, 'API_SERVER_HOST') || '127.0.0.1';
  const port = envValue(source, 'API_SERVER_PORT') || '8642';
  return {
    endpoint: safeLocalEndpoint(process.env.QUERYRECON_HERMES_ENDPOINT || `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`),
    apiKey: envValue(source, 'API_SERVER_KEY'),
    provider: '',
    model: 'hermes-agent',
    timeoutMs: 180000,
  };
}

function headers(apiKey) {
  return { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) };
}

function spinner(label) {
  if (!process.stdout.isTTY) return () => {};
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let index = 0;
  const timer = setInterval(() => {
    cursorTo(process.stdout, 0); clearLine(process.stdout, 0);
    process.stdout.write(`${violet(frames[index++ % frames.length])} ${bold(label)} ${dim('thinking')}${'.'.repeat((index % 3) + 1)}`);
  }, 80);
  return () => { clearInterval(timer); cursorTo(process.stdout, 0); clearLine(process.stdout, 0); };
}

async function requestJson(url, options, timeoutMs = 180000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.text();
    if (!response.ok) throw new Error(`Hermes HTTP ${response.status}: ${body.slice(0, 400)}`);
    return body ? JSON.parse(body) : {};
  } finally { clearTimeout(timer); }
}

export async function callHermes(config, messages, prompt) {
  const endpoint = safeLocalEndpoint(config.endpoint);
  const data = await requestJson(`${endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: headers(config.apiKey),
    body: JSON.stringify({
      model: config.model || 'hermes-agent',
      ...(config.provider ? { provider: config.provider } : {}),
      stream: false,
      messages: [
        { role: 'system', content: `You are Hermes Agent running through QueryRecon CLI. Working directory: ${process.cwd()}. Use every tool, skill, memory, browser, terminal, delegation, and other capability enabled by the user's Hermes configuration when useful. Respect Hermes permissions, ask before consequential or destructive actions, and report only actions actually completed.` },
        ...messages.slice(-30).map(({ role, content }) => ({ role, content: String(content).slice(0, 12000) })),
        { role: 'user', content: prompt },
      ],
    }),
  }, config.timeoutMs || 180000);
  return parseHermesReply(data.choices?.[0]?.message);
}

async function listModels(config) {
  const data = await requestJson(`${safeLocalEndpoint(config.endpoint)}/api/model/options`, { headers: headers(config.apiKey) }, 15000);
  const providers = Array.isArray(data.providers) ? data.providers : [];
  const row = providers.find(item => item.slug === config.provider) ?? (config.provider === 'custom' ? providers.find(item => String(item.slug).startsWith('custom')) : undefined);
  return Array.isArray(row?.models) ? row.models.map(item => typeof item === 'string' ? item : item?.id || item?.model || item?.name).filter(Boolean) : [];
}

async function askSecret(rl, label) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') return rl.question(label);
  process.stdout.write(label);
  rl.pause();
  process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolveSecret, reject) => {
    let value = '';
    const finish = () => {
      process.stdin.off('data', onData); process.stdin.setRawMode(false); process.stdout.write('\n'); rl.resume(); resolveSecret(value);
    };
    const onData = chunk => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\r' || char === '\n') return finish();
        if (char === '\u0003') { process.stdin.setRawMode(false); process.stdin.off('data', onData); reject(new Error('Cancelled.')); return; }
        if (char === '\u007f' || char === '\b') { if (value) { value = value.slice(0, -1); process.stdout.write('\b \b'); } }
        else { value += char; process.stdout.write('•'); }
      }
    };
    process.stdin.on('data', onData);
  });
}

async function setup(rl, current = {}) {
  console.log(`\n${line('GATEWAY SETUP')}`);
  notice('Hermes connection', 'Secrets stay in .queryrecon-local and are ignored by Git.');
  const detected = await detectHermesConfig();
  const endpoint = current.endpoint || detected.endpoint;
  console.log(`${dim('Endpoint')}  ${green(endpoint)} ${dim('(auto-detected)')}`);
  const savedKey = current.apiKey || detected.apiKey;
  const apiKey = savedKey || await askSecret(rl, 'Gateway API key: ');
  if (savedKey) console.log(`${dim('Gateway key')}  ${green('auto-detected')}`);
  const provider = await rl.question(`Provider [${current.provider || 'Hermes default'}]: `);
  const model = await rl.question(`Model [${current.model || 'hermes-agent'}]: `);
  const timeout = await rl.question(`Timeout seconds [${Math.round((current.timeoutMs || 180000) / 1000)}]: `);
  const config = {
    endpoint: safeLocalEndpoint(endpoint),
    apiKey: apiKey || current.apiKey || detected.apiKey,
    provider: (provider || current.provider || '').trim(),
    model: (model || current.model || 'hermes-agent').trim(),
    timeoutMs: Math.max(10, Number(timeout) || Math.round((current.timeoutMs || 180000) / 1000)) * 1000,
  };
  await saveJson(CONFIG_FILE, config);
  notice('Configuration saved', runtimeLabel(config), 'green');
  return config;
}

function help() {
  console.log(`
${line('COMMAND PALETTE')}
  ${cyan('/help')}                 Show commands
  ${cyan('/setup')}                Configure gateway, provider, model, and timeout
  ${cyan('/doctor')}               Check gateway and list detected models
  ${cyan('/models')}               List models for the selected provider
  ${cyan('/provider <slug>')}      Change provider for future turns
  ${cyan('/model <id>')}           Change model for future turns
  ${cyan('/endpoint <local URL>')} Change an unusual local gateway address
  ${cyan('/config')}               Show safe configuration (key remains hidden)
  ${cyan('/new')}                  Start a fresh saved conversation
  ${cyan('/save [path]')}          Export the current conversation as Markdown
  ${cyan('/exit')}                 Save and exit

${dim('  Everything else goes to Hermes with every tool enabled in its own config.')}`);
}

async function exportSession(session, target) {
  const path = resolve(target || `queryrecon-hermes-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
  const markdown = ['# QueryRecon Hermes CLI session', '', ...session.messages.flatMap(message => [`## ${message.role === 'user' ? 'You' : 'Hermes'}`, '', ...(message.thinking ? ['<details>', '<summary>Returned thinking</summary>', '', message.thinking, '', '</details>', ''] : []), message.content, ''])].join('\n');
  await writeFile(path, markdown, 'utf8');
  notice('Session exported', path, 'green');
}

function showConfig(config, session) {
  console.log(`${line('ACTIVE LINK')}
  ${dim('Gateway')}   ${cyan(config.endpoint)}
  ${dim('Provider')}  ${bold(config.provider || 'Hermes default')}
  ${dim('Model')}     ${violet(config.model)}
  ${dim('Memory')}    ${session.messages.length} saved messages
  ${dim('Key')}       ${config.apiKey ? green('connected') : amber('not configured')}
${line()}`);
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  let config = await readJson(CONFIG_FILE, null);
  let session = await readJson(SESSION_FILE, { messages: [] });
  const args = process.argv.slice(2);
  try {
    if (args.includes('--help') || args.includes('-h')) { help(); return; }
    if (!config) {
      const detected = await detectHermesConfig();
      config = detected.apiKey ? detected : await setup(rl, detected);
      await saveJson(CONFIG_FILE, config);
    } else if (args.includes('--setup')) config = await setup(rl, config);
    const promptIndex = args.findIndex(arg => arg === '--prompt' || arg === '-p');
    if (promptIndex >= 0) {
      const prompt = args.slice(promptIndex + 1).join(' ').trim();
      if (!prompt) throw new Error('Add text after --prompt.');
      const stop = spinner(`Hermes · ${runtimeLabel(config)}`);
      try {
        const reply = await callHermes(config, session.messages, prompt); stop();
        if (reply.thinking) console.log(`${dim('\nReturned thinking')}\n${dim(reply.thinking)}\n`);
        console.log(reply.content);
        session.messages.push({ role: 'user', content: prompt }, { role: 'assistant', ...reply });
        await saveJson(SESSION_FILE, session);
      } catch (error) { stop(); throw error; }
      return;
    }

    banner();
    showConfig(config, session);
    console.log(`${dim('  Type')} ${cyan('/help')} ${dim('for commands. Your conversation is saved automatically.')}\n`);
    while (true) {
      const input = (await rl.question(`${cyan('YOU')} ${dim('>')} `)).trim();
      if (!input) continue;
      const [command, ...rest] = input.split(/\s+/);
      if (command === '/exit' || command === '/quit') break;
      if (command === '/help') { help(); continue; }
      if (command === '/setup') { config = await setup(rl, config); continue; }
      if (command === '/config') { showConfig(config, session); continue; }
      if (command === '/new' || command === '/clear') { session = { messages: [] }; await saveJson(SESSION_FILE, session); notice('Fresh session', 'Previous context cleared.', 'green'); continue; }
      if (command === '/save') { await exportSession(session, rest.join(' ') || undefined); continue; }
      if (command === '/provider' || command === '/model') {
        const value = rest.join(' ').trim();
        if (!value) { console.log(`Current ${command.slice(1)}: ${config[command.slice(1)]}`); continue; }
        config = { ...config, [command.slice(1)]: value }; await saveJson(CONFIG_FILE, config); notice(`${command.slice(1)} updated`, value, 'green'); continue;
      }
      if (command === '/endpoint') {
        const value = rest.join(' ').trim();
        if (!value) { console.log(`Current endpoint: ${config.endpoint}`); continue; }
        config = { ...config, endpoint: safeLocalEndpoint(value) }; await saveJson(CONFIG_FILE, config); notice('endpoint updated', config.endpoint, 'green'); continue;
      }
      if (command === '/models' || command === '/doctor') {
        const stop = spinner('Checking Hermes gateway');
        try { const models = await listModels(config); stop(); notice('Hermes gateway online', `${models.length} model${models.length === 1 ? '' : 's'} detected`, 'green'); console.log(models.length ? models.map((item, index) => `  ${dim(String(index + 1).padStart(2, '0'))}  ${item === config.model ? green(item) : item}`).join('\n') : dim('  No models returned for this provider.')); }
        catch (error) { stop(); notice('Gateway check failed', error.message, 'red'); }
        continue;
      }
      const stop = spinner(`Hermes is working · ${runtimeLabel(config)}`);
      try {
        const reply = await callHermes(config, session.messages, input); stop();
        if (reply.thinking) console.log(`${line('RETURNED REASONING')}\n${dim(reply.thinking)}\n`);
        console.log(`${violet('HERMES')} ${dim('>')} ${reply.content}\n`);
        session.messages.push({ role: 'user', content: input }, { role: 'assistant', ...reply });
        session.messages = session.messages.slice(-100);
        await saveJson(SESSION_FILE, session);
      } catch (error) { stop(); notice('Hermes request failed', error.message, 'red'); console.log(); }
    }
    await saveJson(SESSION_FILE, session);
  } finally { rl.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { notice('QueryRecon CLI failed', error.message, 'red'); process.exitCode = 1; });
