const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pidFile = path.join(root, '.runtime', 'pids.json');

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

const pids = readPids();
const names = Object.keys(pids);

if (names.length === 0) {
  console.log('No saved services found. Start them with: npm run dev');
  process.exit(0);
}

for (const name of names) {
  const service = pids[name];
  const state = isRunning(service.pid) ? 'running' : 'stopped';
  console.log(`${name}: ${state} (pid ${service.pid})${service.url ? ` ${service.url}` : ''}`);
}
