const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const stateDir = path.join(root, '.runtime');
const logDir = path.join(stateDir, 'logs');
const pidFile = path.join(stateDir, 'pids.json');

const services = [
  // { name: 'backend', cwd: 'backend', command: 'node', args: ['--watch', 'src/index.js'], url: 'http://172.16.1.67:5000/health' },
  { name: 'backend', cwd: 'backend', command: 'node', args: ['--watch', 'src/index.js'], url: 'http://localhost:5000/health' },
  { name: 'chatbot', cwd: 'chatbot', command: 'node', args: ['node_modules/webpack/bin/webpack.js', '--mode', 'development', '--watch'] },
  // { name: 'chatbot-admin', cwd: 'chatbot-admin', command: 'node', args: ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'], url: 'http://172.16.1.67:5173' },
  { name: 'chatbot-admin', cwd: 'chatbot-admin', command: 'node', args: ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'], url: 'http://localhost:5173' },
  // { name: 'widget-test', cwd: 'widget-test', command: 'node', args: ['index.js'], url: 'http://172.16.1.67:8090' },
  { name: 'widget-test', cwd: 'widget-test', command: 'node', args: ['index.js'], url: 'http://localhost:8090' },
];

function ensureDirs() {
  fs.mkdirSync(logDir, { recursive: true });
}

function readPids() {
  try {
    return JSON.parse(fs.readFileSync(pidFile, 'utf8'));
  } catch {
    return {};
  }
}

function isRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function startService(service) {
  const cwd = path.join(root, service.cwd);
  const logPath = path.join(logDir, `${service.name}.log`);
  const errorPath = path.join(logDir, `${service.name}.error.log`);

  const out = fs.openSync(logPath, 'a');
  const err = fs.openSync(errorPath, 'a');

  const child = spawn(service.command, service.args, {
    cwd,
    detached: true,
    stdio: ['ignore', out, err],
    windowsHide: true,
  });

  child.unref();
  return child.pid;
}

ensureDirs();
const pids = readPids();

for (const service of services) {
  if (isRunning(pids[service.name]?.pid)) {
    console.log(`${service.name} already running (pid ${pids[service.name].pid})`);
    continue;
  }

  const pid = startService(service);
  pids[service.name] = {
    pid,
    cwd: service.cwd,
    command: `${service.command} ${service.args.join(' ')}`,
    url: service.url || '',
    startedAt: new Date().toISOString(),
  };
  console.log(`started ${service.name} (pid ${pid})${service.url ? ` -> ${service.url}` : ''}`);
}

fs.writeFileSync(pidFile, JSON.stringify(pids, null, 2));
console.log(`logs: ${path.join('.runtime', 'logs')}`);
console.log('stop all: npm run kill');
