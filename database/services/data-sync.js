const { Logger } = require('../utils/logger');
const { safeIdentifier, getConflictColumns } = require('../utils/sql-utils');

class DataSynchronizer {
  constructor(localDb, remoteDb, options = {}) {
    this.localDb = localDb;
    this.remoteDb = remoteDb;
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    this.batchSize = options.batchSize || 500;
    this.logger = new Logger('DataSync');
    this.results = {
      tablesSynced: {},
      skipped: [],
      errors: [],
    };
  }

  async synchronize() {
    try {
      this.logger.info('Starting data synchronization...');

      const tables = await this.getTables(this.localDb);

      for (const tableName of tables) {
        await this.syncTable(tableName);
      }

      this.logger.info('Data synchronization completed');
      return this.results;
    } catch (error) {
      this.logger.error(`Data synchronization failed: ${error.message}`);
      this.results.errors.push(error.message);
      throw error;
    }
  }

  async getTables(db) {
    const result = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return result.rows.map(row => row.table_name);
  }

  async syncTable(tableName) {
    try {
      const safeTable = safeIdentifier(tableName);
      this.logger.info(`Syncing table '${tableName}'...`);

      const primaryKeys = await this.getPrimaryKeys(this.localDb, tableName);

      if (primaryKeys.length === 0) {
        const uniqueKeys = await this.getUniqueConstraints(this.localDb, tableName);
        if (uniqueKeys.length === 0) {
          this.logger.warn(`⚠ No primary key or unique constraint found for '${tableName}'. Skipping.`);
          this.results.skipped.push(tableName);
          return;
        }
      }

      const totalRows = await this.getRowCount(this.localDb, tableName);

      if (totalRows === 0) {
        this.results.tablesSynced[tableName] = { inserted: 0, skipped: 0 };
        this.logger.info(`✔ ${tableName}: 0 inserted, 0 skipped (empty table)`);
        return;
      }

      let inserted = 0;
      let skipped = 0;
      let offset = 0;

      while (offset < totalRows) {
        const rows = await this.fetchRows(this.localDb, tableName, offset, this.batchSize);

        if (rows.length === 0) break;

        const result = await this.insertBatch(tableName, rows, primaryKeys);
        inserted += result.inserted;
        skipped += result.skipped;

        offset += rows.length;
        this.logger.debug(`Progress: ${offset}/${totalRows} rows processed`);
      }

      this.results.tablesSynced[tableName] = { inserted, skipped };
      this.logger.info(`✔ ${tableName}: ${inserted} inserted, ${skipped} skipped`);
    } catch (error) {
      this.logger.error(`✗ Failed to sync '${tableName}': ${error.message}`);
      this.results.errors.push(`${tableName}: ${error.message}`);
    }
  }

  async getPrimaryKeys(db, tableName) {
    const result = await db.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid
      AND a.attnum = ANY(i.indkey)
      JOIN pg_class t ON t.oid = i.indrelid
      WHERE t.relname = $1 AND i.indisprimary
      ORDER BY a.attnum
    `, [tableName]);
    return result.rows.map(row => row.attname);
  }

  async getUniqueConstraints(db, tableName) {
    const result = await db.query(`
      SELECT column_name
      FROM information_schema.key_column_usage
      WHERE table_name = $1 AND constraint_type = 'UNIQUE'
      LIMIT 1
    `, [tableName]);
    return result.rows.map(row => row.column_name);
  }

  async getRowCount(db, tableName) {
    const safeTable = safeIdentifier(tableName);
    const result = await db.query(`SELECT COUNT(*) as count FROM ${safeTable}`);
    return parseInt(result.rows[0].count, 10);
  }

  async fetchRows(db, tableName, offset, limit) {
    const safeTable = safeIdentifier(tableName);
    const result = await db.query(`
      SELECT * FROM ${safeTable}
      ORDER BY (SELECT 1)
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    return result.rows;
  }

  async insertBatch(tableName, rows, primaryKeys) {
    if (rows.length === 0) {
      return { inserted: 0, skipped: 0 };
    }

    const conflictCols = getConflictColumns(rows[0], primaryKeys);

    if (conflictCols.length === 0) {
      this.logger.warn(`⚠ Cannot determine conflict columns for '${tableName}'`);
      return { inserted: 0, skipped: rows.length };
    }

    const safeTable = safeIdentifier(tableName);
    const columns = Object.keys(rows[0]);
    const safeColumns = columns.map(col => safeIdentifier(col));

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const values = columns.map(col => row[col]);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

      const conflictCond = conflictCols.map(col => `${safeIdentifier(col)}`).join(', ');
      const sql = `
        INSERT INTO ${safeTable} (${safeColumns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (${conflictCond}) DO NOTHING
      `;

      if (this.verbose) {
        this.logger.debug(`SQL: ${sql}`);
      }

      if (!this.dryRun) {
        try {
          const result = await this.remoteDb.query(sql, values);
          if (result.rowCount > 0) {
            inserted++;
          } else {
            skipped++;
          }
        } catch (error) {
          this.logger.debug(`Insert conflict (expected): ${error.message}`);
          skipped++;
        }
      } else {
        inserted++;
      }
    }

    return { inserted, skipped };
  }

  async updateSequences() {
    try {
      this.logger.info('Updating sequences...');

      const sequences = await this.getSequences(this.localDb);

      for (const seq of sequences) {
        try {
          const maxVal = await this.getMaxSequenceValue(this.localDb, seq);

          if (maxVal !== null) {
            const safeName = safeIdentifier(seq);
            const sql = `SELECT setval('${seq}', ${maxVal}, true)`;

            if (this.verbose) {
              this.logger.debug(`SQL: ${sql}`);
            }

            if (!this.dryRun) {
              await this.remoteDb.query(sql);
            }

            this.logger.debug(`✔ Updated sequence '${seq}' to ${maxVal}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to update sequence '${seq}': ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to update sequences: ${error.message}`);
    }
  }

  async getSequences(db) {
    const result = await db.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `);
    return result.rows.map(row => row.sequence_name);
  }

  async getMaxSequenceValue(db, sequenceName) {
    try {
      const tableName = sequenceName.replace(/_seq$/, '');
      const columnName = `${tableName}_id`;

      const result = await db.query(`
        SELECT MAX("${columnName}") as max_val
        FROM "${tableName}"
      `);

      return result.rows[0]?.max_val || null;
    } catch {
      return null;
    }
  }
}

module.exports = { DataSynchronizer };
