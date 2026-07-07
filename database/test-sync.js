#!/usr/bin/env node

/**
 * Test Script for PostgreSQL Sync Tool
 *
 * This script runs a test synchronization on a demo table
 * to verify the sync tool works correctly before running on production data.
 *
 * Usage:
 *   node test-sync.js           # Run full test
 *   node test-sync.js --clean   # Clean up test tables
 */

const { Client } = require('pg');
const { config, validateConfig } = require('./config');
const { Logger } = require('./utils/logger');
const { safeIdentifier } = require('./utils/sql-utils');

const logger = new Logger('TestSync');
const TEST_TABLE = 'SyncTestTable';

async function cleanupTestTables() {
  logger.info('Cleaning up test tables...');

  const localDb = new Client({
    host: config.localDb.host,
    port: config.localDb.port,
    database: config.localDb.database,
    user: config.localDb.user,
    password: config.localDb.password,
  });

  const remoteDb = new Client({
    host: config.remoteDb.host,
    port: config.remoteDb.port,
    database: config.remoteDb.database,
    user: config.remoteDb.user,
    password: config.remoteDb.password,
  });

  try {
    await localDb.connect();
    await remoteDb.connect();

    const safeTable = safeIdentifier(TEST_TABLE);

    try {
      await localDb.query(`DROP TABLE IF EXISTS ${safeTable}`);
      logger.info(`✔ Dropped test table from local database`);
    } catch (error) {
      logger.warn(`Could not drop test table from local: ${error.message}`);
    }

    try {
      await remoteDb.query(`DROP TABLE IF EXISTS ${safeTable}`);
      logger.info(`✔ Dropped test table from remote database`);
    } catch (error) {
      logger.warn(`Could not drop test table from remote: ${error.message}`);
    }

    logger.success('✅ Cleanup complete');
  } catch (error) {
    logger.error(`Cleanup failed: ${error.message}`);
    throw error;
  } finally {
    await localDb.end();
    await remoteDb.end();
  }
}

async function createLocalTestTable() {
  logger.info('Creating test table on local database...');

  const localDb = new Client({
    host: config.localDb.host,
    port: config.localDb.port,
    database: config.localDb.database,
    user: config.localDb.user,
    password: config.localDb.password,
  });

  try {
    await localDb.connect();

    const safeTable = safeIdentifier(TEST_TABLE);

    const createTableSql = `
      CREATE TABLE IF NOT EXISTS ${safeTable} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await localDb.query(createTableSql);
    logger.info(`✔ Created test table: ${TEST_TABLE}`);

    // Insert test data
    const insertSql = `
      INSERT INTO ${safeTable} (name, email, is_active)
      VALUES
        ($1, $2, $3),
        ($4, $5, $6),
        ($7, $8, $9),
        ($10, $11, $12),
        ($13, $14, $15)
      ON CONFLICT DO NOTHING
    `;

    const result = await localDb.query(insertSql, [
      'Alice Johnson', 'alice@example.com', true,
      'Bob Smith', 'bob@example.com', true,
      'Charlie Brown', 'charlie@example.com', false,
      'Diana Prince', 'diana@example.com', true,
      'Edward Norton', 'edward@example.com', true,
    ]);

    logger.info(`✔ Inserted ${result.rowCount} test records`);

    // Count records
    const countResult = await localDb.query(`SELECT COUNT(*) as count FROM ${safeTable}`);
    const count = countResult.rows[0].count;
    logger.info(`✔ Total records in local test table: ${count}`);

  } finally {
    await localDb.end();
  }
}

async function testSync() {
  logger.info('Running test synchronization...');

  const { DatabaseConnection } = require('./db/connection');
  const { SchemaSynchronizer } = require('./services/schema-sync');
  const { DataSynchronizer } = require('./services/data-sync');

  const localDb = new DatabaseConnection(config.localDb, 'LocalDB');
  const remoteDb = new DatabaseConnection(config.remoteDb, 'RemoteDB');

  try {
    await localDb.connect();
    await remoteDb.connect();

    logger.info('\n📋 Running Schema Sync...');
    const schemaSyncer = new SchemaSynchronizer(localDb, remoteDb, {
      verbose: true,
      dryRun: false,
    });
    const schemaResults = await schemaSyncer.synchronize();

    logger.info('Schema Sync Results:');
    logger.info(`  Tables Created: ${schemaResults.tablesCreated.length}`);
    logger.info(`  Errors: ${schemaResults.errors.length}`);

    if (schemaResults.errors.length > 0) {
      schemaResults.errors.forEach(err => logger.warn(`    - ${err}`));
    }

    logger.info('\n📊 Running Data Sync...');
    const dataSyncer = new DataSynchronizer(localDb, remoteDb, {
      verbose: true,
      dryRun: false,
      batchSize: 100,
    });
    const dataResults = await dataSyncer.synchronize();

    logger.info('Data Sync Results:');
    for (const [table, stats] of Object.entries(dataResults.tablesSynced)) {
      if (table === TEST_TABLE) {
        logger.info(`  ${table}: ${stats.inserted} inserted, ${stats.skipped} skipped`);
      }
    }

    if (dataResults.errors.length > 0) {
      dataResults.errors.forEach(err => logger.warn(`    - ${err}`));
    }

    // Verify data on remote
    logger.info('\n✔ Verifying sync results on remote database...');

    const safeTable = safeIdentifier(TEST_TABLE);
    const remoteCount = await remoteDb.query(`SELECT COUNT(*) as count FROM ${safeTable}`);
    const remoteRows = remoteCount.rows[0].count;

    const localCount = await localDb.query(`SELECT COUNT(*) as count FROM ${safeTable}`);
    const localRows = localCount.rows[0].count;

    logger.info(`Local table records:  ${localRows}`);
    logger.info(`Remote table records: ${remoteRows}`);

    if (localRows === remoteRows) {
      logger.success(`✅ TEST PASSED: All ${localRows} records synced correctly!`);
    } else {
      logger.error(`❌ TEST FAILED: Record count mismatch (${localRows} local vs ${remoteRows} remote)`);
      process.exit(1);
    }

  } finally {
    await localDb.disconnect();
    await remoteDb.disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const clean = args.includes('--clean');

  logger.info('\n╔═══════════════════════════════════════╗');
  logger.info('║  PostgreSQL Sync Tool - Test Suite    ║');
  logger.info('╚═══════════════════════════════════════╝\n');

  // Validate config
  const errors = validateConfig();
  if (errors.length > 0) {
    logger.error('Configuration validation failed:');
    errors.forEach(err => logger.error(`  - ${err}`));
    process.exit(1);
  }

  try {
    if (clean) {
      logger.info('Running cleanup mode...\n');
      await cleanupTestTables();
      logger.success('✅ Cleanup complete');
      process.exit(0);
    }

    // Run test
    logger.info('Test mode: This will create a test table and verify syncing works.\n');

    await createLocalTestTable();
    logger.info('');

    await testSync();

    logger.info('\n╔═══════════════════════════════════════╗');
    logger.info('║  Test Complete - Sync Tool is Ready!  ║');
    logger.info('╚═══════════════════════════════════════╝\n');

    logger.info('You can now run the full sync:');
    logger.info('  npm run sync          # Full sync');
    logger.info('  npm run sync:schema   # Schema only');
    logger.info('  npm run sync:data     # Data only');
    logger.info('  npm run sync:dry      # Preview mode\n');

  } catch (error) {
    logger.error(`\n❌ Test failed: ${error.message}`);
    logger.error('\nTroubleshooting:');
    logger.error('  1. Check .env configuration');
    logger.error('  2. Verify database credentials');
    logger.error('  3. Ensure databases are running');
    logger.error('  4. Run: npm run validate');
    process.exit(1);
  }
}

main();
