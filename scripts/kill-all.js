const { spawnSync } = require('child_process');
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

function killPid(pid) {
  if (!pid) return true;

  if (process.platform === 'win32') {
    const result = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return result.status === 0;
  }

  try {
    process.kill(-pid, 'SIGTERM');
    return true;
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
      return true;
    } catch {
      return false;
    }
  }
}

const pids = readPids();
const names = Object.keys(pids);

if (names.length === 0) {
  console.log('No saved services found.');
  process.exit(0);
}

for (const name of names) {
  const ok = killPid(pids[name].pid);
  console.log(`${ok ? 'stopped' : 'not running'} ${name} (pid ${pids[name].pid})`);
}

try {
  fs.unlinkSync(pidFile);
} catch {}
