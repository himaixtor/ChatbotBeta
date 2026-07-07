#!/usr/bin/env node

/**
 * Diagnostic Tool for Schema Mismatches
 *
 * This script identifies tables and columns that exist in local
 * but not in remote database.
 */

const { Client } = require('pg');
const { config, validateConfig } = require('./config');
const { Logger } = require('./utils/logger');

const logger = new Logger('Diagnose');

async function compareDatabases() {
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

    logger.info('\n📊 Database Schema Comparison\n');

    // Get tables
    const localTablesResult = await localDb.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const remoteTablesResult = await remoteDb.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const localTables = localTablesResult.rows.map(r => r.table_name);
    const remoteTables = remoteTablesResult.rows.map(r => r.table_name);

    // Tables missing in remote
    const missingTables = localTables.filter(t => !remoteTables.includes(t));

    if (missingTables.length > 0) {
      logger.warn(`\n❌ MISSING TABLES IN REMOTE (${missingTables.length}):`);
      missingTables.forEach(t => logger.warn(`   - ${t}`));
    } else {
      logger.info('\n✔ All local tables exist in remote');
    }

    // Check for missing columns in existing tables
    logger.info('\n📋 Checking columns in existing tables...\n');

    let columnMismatches = 0;

    for (const tableName of localTables.filter(t => remoteTables.includes(t))) {
      const localColsResult = await localDb.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      const remoteColsResult = await remoteDb.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      const localCols = localColsResult.rows.map(r => r.column_name);
      const remoteCols = remoteColsResult.rows.map(r => r.column_name);

      const missingCols = localCols.filter(c => !remoteCols.includes(c));

      if (missingCols.length > 0) {
        logger.warn(`\n❌ Table "${tableName}" - Missing ${missingCols.length} column(s):`);
        missingCols.forEach(col => {
          const localCol = localColsResult.rows.find(r => r.column_name === col);
          logger.warn(`   - ${col} (${localCol.data_type})`);
          columnMismatches++;
        });
      }
    }

    if (columnMismatches === 0 && missingTables.length === 0) {
      logger.info('✅ Schema is fully synchronized!');
    }

    // Summary
    logger.info(`\n📊 SUMMARY:`);
    logger.info(`   Missing Tables: ${missingTables.length}`);
    logger.info(`   Missing Columns: ${columnMismatches}`);

    if (missingTables.length > 0 || columnMismatches > 0) {
      logger.warn(`\n⚠ Run this to fix: npm run sync:schema`);
    }

  } finally {
    await localDb.end();
    await remoteDb.end();
  }
}

async function main() {
  const errors = validateConfig();
  if (errors.length > 0) {
    logger.error('Configuration validation failed:');
    errors.forEach(err => logger.error(`  - ${err}`));
    process.exit(1);
  }

  try {
    await compareDatabases();
  } catch (error) {
    logger.error(`Failed: ${error.message}`);
    process.exit(1);
  }
}

main();
