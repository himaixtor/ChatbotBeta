#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { config, validateConfig } = require('./config');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testConnection(dbConfig, name) {
  return new Promise((resolve) => {
    const client = new Client({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      connect_timeout: 5000,
    });

    client.connect((err) => {
      if (err) {
        log(`  ✗ ${name}: ${err.message}`, 'red');
        resolve(false);
        return;
      }

      client.query('SELECT version()', (err, result) => {
        if (err) {
          log(`  ✗ ${name}: Query failed - ${err.message}`, 'red');
          resolve(false);
          return;
        }

        const version = result.rows[0].version.split(',')[0];
        log(`  ✓ ${name}: Connected - ${version}`, 'green');
        client.end();
        resolve(true);
      });
    });
  });
}

async function checkFileStructure() {
  log('\n📁 File Structure:', 'blue');

  const files = [
    'package.json',
    '.env',
    '.env.example',
    'sync.js',
    'config/index.js',
    'db/connection.js',
    'services/schema-sync.js',
    'services/data-sync.js',
    'utils/logger.js',
    'utils/sql-utils.js',
    'utils/cli.js',
  ];

  let allExists = true;

  for (const file of files) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      log(`  ✓ ${file}`, 'green');
    } else {
      log(`  ✗ ${file} (missing)`, 'red');
      allExists = false;
    }
  }

  return allExists;
}

async function checkDependencies() {
  log('\n📦 Dependencies:', 'blue');

  const packageJson = require('./package.json');
  const requiredDeps = ['pg', 'dotenv'];

  let allInstalled = true;

  for (const dep of requiredDeps) {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      log(`  ✓ ${dep}`, 'green');
    } else {
      log(`  ✗ ${dep} (not installed)`, 'red');
      allInstalled = false;
    }
  }

  return allInstalled;
}

async function checkConfiguration() {
  log('\n⚙️  Configuration:', 'blue');

  const errors = validateConfig();

  if (errors.length === 0) {
    log('  ✓ All configuration valid', 'green');
    return true;
  }

  log('  ✗ Configuration errors:', 'red');
  errors.forEach(err => log(`    - ${err}`, 'red'));
  return false;
}

async function checkEnvironment() {
  log('\n🔧 Environment Variables:', 'blue');

  const envVars = [
    'LOCAL_DB_HOST',
    'LOCAL_DB_PORT',
    'LOCAL_DB_NAME',
    'LOCAL_DB_USER',
    'LOCAL_DB_PASSWORD',
    'REMOTE_DB_HOST',
    'REMOTE_DB_PORT',
    'REMOTE_DB_NAME',
    'REMOTE_DB_USER',
    'REMOTE_DB_PASSWORD',
  ];

  let allSet = true;

  for (const varName of envVars) {
    if (process.env[varName]) {
      const value = varName.includes('PASSWORD') ? '***' : process.env[varName];
      log(`  ✓ ${varName}=${value}`, 'green');
    } else {
      log(`  ✗ ${varName} (not set)`, 'red');
      allSet = false;
    }
  }

  return allSet;
}

async function checkNodeVersion() {
  log('\n📦 Node.js Version:', 'blue');

  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion >= 14) {
    log(`  ✓ Node.js ${nodeVersion} (minimum 14+ required)`, 'green');
    return true;
  }

  log(`  ✗ Node.js ${nodeVersion} (minimum 14+ required)`, 'red');
  return false;
}

async function main() {
  log('\n╔══════════════════════════════════════════╗', 'blue');
  log('║  PostgreSQL Sync Tool - Setup Validation  ║', 'blue');
  log('╚══════════════════════════════════════════╝\n', 'blue');

  const checks = [];

  checks.push(checkNodeVersion());
  checks.push(checkDependencies());
  checks.push(checkFileStructure());
  checks.push(checkEnvironment());
  checks.push(checkConfiguration());

  const results = await Promise.all(checks);

  if (results.every(r => r)) {
    log('\n🔌 Database Connections:', 'blue');
    const localOk = await testConnection(config.localDb, 'Local DB');
    const remoteOk = await testConnection(config.remoteDb, 'Remote DB');

    log('\n' + '═'.repeat(42), 'blue');

    if (localOk && remoteOk) {
      log('\n✅ Setup validation PASSED!', 'green');
      log('\nYou can now run:', 'blue');
      log('  npm run sync          # Full sync (schema + data)', 'yellow');
      log('  npm run sync:schema   # Schema only', 'yellow');
      log('  npm run sync:data     # Data only', 'yellow');
      log('  npm run sync:dry      # Preview changes', 'yellow');
      process.exit(0);
    } else {
      log('\n⚠️  Database connection failed!', 'red');
      log('\nPlease check:', 'yellow');
      log('  1. Database host and port are correct', 'yellow');
      log('  2. Database exists and is running', 'yellow');
      log('  3. Username and password are correct', 'yellow');
      log('  4. Network connectivity to database', 'yellow');
      process.exit(1);
    }
  } else {
    log('\n' + '═'.repeat(42), 'blue');
    log('\n❌ Setup validation FAILED!', 'red');
    log('\nPlease fix the issues above before running sync.', 'yellow');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Validation error: ${error.message}`, 'red');
  process.exit(1);
});
