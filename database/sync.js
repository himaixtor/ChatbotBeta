#!/usr/bin/env node

const { config, validateConfig } = require('./config');
const { DatabaseConnection } = require('./db/connection');
const { SchemaSynchronizer } = require('./services/schema-sync');
const { DataSynchronizer } = require('./services/data-sync');
const { Logger } = require('./utils/logger');
const { parseArguments, printHelp } = require('./utils/cli');

const logger = new Logger('Main');

async function main() {
  const options = parseArguments();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const validationErrors = validateConfig();
  if (validationErrors.length > 0) {
    logger.error('Configuration validation failed:');
    validationErrors.forEach(err => logger.error(`  - ${err}`));
    logger.error('Please ensure all required environment variables are set.');
    process.exit(1);
  }

  const localDb = new DatabaseConnection(config.localDb, 'LocalDB');
  const remoteDb = new DatabaseConnection(config.remoteDb, 'RemoteDB');

  try {
    logger.info('🔄 PostgreSQL Database Synchronization Tool');
    logger.info('═══════════════════════════════════════════════');

    logger.info('Connecting to databases...');
    await localDb.connect();
    await remoteDb.connect();
    logger.info('✔ Connected successfully');
    logger.info('');

    const syncOptions = {
      dryRun: options.dryRun,
      verbose: options.verbose,
      batchSize: config.sync.batchSize,
    };

    if (options.schema) {
      logger.info('📋 Schema Synchronization');
      logger.info('───────────────────────');

      const schemaSynchronizer = new SchemaSynchronizer(localDb, remoteDb, syncOptions);
      const schemaResults = await schemaSynchronizer.synchronize();

      logger.info('');
      logger.info('Schema Sync Summary:');
      logger.info(`  Tables Created:     ${schemaResults.tablesCreated.length}`);
      logger.info(`  Tables Skipped:     ${schemaResults.tablesSkipped.length}`);
      logger.info(`  Columns Added:      ${schemaResults.columnsAdded.length}`);
      logger.info(`  Indices Created:    ${schemaResults.indicesCreated.length}`);
      logger.info(`  Constraints Added:  ${schemaResults.constraintsCreated.length}`);
      logger.info(`  Sequences Created:  ${schemaResults.sequencesCreated.length}`);

      if (schemaResults.errors.length > 0) {
        logger.warn(`  Errors:             ${schemaResults.errors.length}`);
        schemaResults.errors.forEach(err => logger.warn(`    - ${err}`));
      }

      logger.info('');
    }

    if (options.data) {
      logger.info('📊 Data Synchronization');
      logger.info('──────────────────────');

      const dataSynchronizer = new DataSynchronizer(localDb, remoteDb, syncOptions);
      const dataResults = await dataSynchronizer.synchronize();

      await dataSynchronizer.updateSequences();

      logger.info('');
      logger.info('Data Sync Summary:');
      logger.info('  Table         │ Inserted │ Skipped');
      logger.info('  ──────────────┼──────────┼────────');

      let totalInserted = 0;
      let totalSkipped = 0;

      for (const [table, stats] of Object.entries(dataResults.tablesSynced)) {
        const paddedTable = table.padEnd(13);
        const paddedInserted = String(stats.inserted).padStart(8);
        const paddedSkipped = String(stats.skipped).padStart(7);
        logger.info(`  ${paddedTable} │${paddedInserted} │${paddedSkipped}`);
        totalInserted += stats.inserted;
        totalSkipped += stats.skipped;
      }

      logger.info('  ──────────────┼──────────┼────────');
      const paddedTotal = 'TOTAL'.padEnd(13);
      const paddedTotalInserted = String(totalInserted).padStart(8);
      const paddedTotalSkipped = String(totalSkipped).padStart(7);
      logger.info(`  ${paddedTotal} │${paddedTotalInserted} │${paddedTotalSkipped}`);

      if (dataResults.skipped.length > 0) {
        logger.warn(`\n  Skipped tables (no primary key or unique constraint):`);
        dataResults.skipped.forEach(table => logger.warn(`    - ${table}`));
      }

      if (dataResults.errors.length > 0) {
        logger.error(`\n  Errors during synchronization:`);
        dataResults.errors.forEach(err => logger.error(`    - ${err}`));
      }

      logger.info('');
    }

    if (options.dryRun) {
      logger.warn('⚠ DRY-RUN MODE: No changes were applied to the remote database');
    } else {
      logger.success('✅ Synchronization completed successfully!');
    }

    logger.info('');
    logger.info('Log file: ' + logger.filePath);

  } catch (error) {
    logger.error(`❌ Fatal error: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  } finally {
    try {
      await localDb.disconnect();
      await remoteDb.disconnect();
    } catch (error) {
      logger.warn(`Failed to disconnect: ${error.message}`);
    }
  }
}

main().catch(error => {
  logger.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
