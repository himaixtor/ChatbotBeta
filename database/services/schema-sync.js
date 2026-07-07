const { Logger } = require('../utils/logger');
const { safeIdentifier, escapeSqlString } = require('../utils/sql-utils');

class SchemaSynchronizer {
  constructor(localDb, remoteDb, options = {}) {
    this.localDb = localDb;
    this.remoteDb = remoteDb;
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    this.logger = new Logger('SchemaSync');
    this.results = {
      tablesCreated: [],
      tablesSkipped: [],
      columnsAdded: [],
      indicesCreated: [],
      constraintsCreated: [],
      sequencesCreated: [],
      errors: [],
    };
  }

  async synchronize() {
    try {
      await this.logger.info('Starting schema synchronization...');

      const localTables = await this.getTables(this.localDb);
      const remoteTables = await this.getTables(this.remoteDb);

      await this.createMissingTables(localTables, remoteTables);
      await this.addMissingColumns(localTables, remoteTables);
      await this.createMissingIndices(localTables, remoteTables);
      await this.createMissingConstraints(localTables, remoteTables);
      await this.createMissingSequences(localTables, remoteTables);

      this.logger.info('Schema synchronization completed');
      return this.results;
    } catch (error) {
      this.logger.error(`Schema synchronization failed: ${error.message}`);
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

  async getTableDefinition(db, tableName) {
    const safeTable = safeIdentifier(tableName);

    const columns = await db.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    const primaryKeys = await db.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid
      AND a.attnum = ANY(i.indkey)
      JOIN pg_class t ON t.oid = i.indrelid
      WHERE t.relname = $1 AND i.indisprimary
      ORDER BY a.attnum
    `, [tableName]);

    const uniqueConstraints = await db.query(`
      SELECT kcu.constraint_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE kcu.table_name = $1 AND tc.constraint_type = 'UNIQUE'
      ORDER BY kcu.ordinal_position
    `, [tableName]);

    const foreignKeys = await db.query(`
      SELECT
        rc.constraint_name,
        kcu.column_name,
        ccu.table_name AS referenced_table_name,
        ccu.column_name AS referenced_column_name
      FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu
        ON rc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_name = ccu.constraint_name
      WHERE kcu.table_name = $1
    `, [tableName]);

    const indices = await db.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = $1 AND indexname NOT LIKE $2
      ORDER BY indexname
    `, [tableName, `${tableName}_pkey`]);

    return {
      columns: columns.rows,
      primaryKeys: primaryKeys.rows.map(row => row.attname),
      uniqueConstraints: uniqueConstraints.rows,
      foreignKeys: foreignKeys.rows,
      indices: indices.rows,
    };
  }

  async createMissingTables(localTables, remoteTables) {
    const missingTables = localTables.filter(t => !remoteTables.includes(t));

    for (const tableName of missingTables) {
      try {
        await this.createTable(tableName);
        this.results.tablesCreated.push(tableName);
        this.logger.info(`✔ Table '${tableName}' created`);
      } catch (error) {
        this.results.errors.push(`Failed to create table '${tableName}': ${error.message}`);
        this.logger.error(`✗ Failed to create table '${tableName}': ${error.message}`);
      }
    }

    const onlyInRemote = remoteTables.filter(t => !localTables.includes(t));
    if (onlyInRemote.length > 0) {
      this.logger.info(`ℹ Preserved ${onlyInRemote.length} remote-only table(s)`);
    }
  }

  async createTable(tableName) {
    const definition = await this.getTableDefinition(this.localDb, tableName);
    const safeTable = safeIdentifier(tableName);

    let sql = `CREATE TABLE ${safeTable} (\n`;
    const parts = [];

    for (const column of definition.columns) {
      parts.push(this.buildColumnDefinition(column));
    }

    if (definition.primaryKeys.length > 0) {
      const pkCols = definition.primaryKeys.map(pk => safeIdentifier(pk)).join(', ');
      parts.push(`PRIMARY KEY (${pkCols})`);
    }

    for (const constraint of definition.uniqueConstraints) {
      const col = safeIdentifier(constraint.column_name);
      parts.push(`UNIQUE (${col})`);
    }

    sql += parts.join(',\n') + '\n);';

    if (this.verbose) {
      this.logger.debug(`SQL: ${sql}`);
    }

    if (!this.dryRun) {
      await this.remoteDb.query(sql);
    }

    for (const index of definition.indices) {
      try {
        const indexSql = index.indexdef.replace(
          new RegExp(`ON ${safeIdentifier(tableName)}`, 'g'),
          `ON ${safeTable}`
        );

        if (this.verbose) {
          this.logger.debug(`SQL: ${indexSql}`);
        }

        if (!this.dryRun) {
          await this.remoteDb.query(indexSql);
        }

        this.results.indicesCreated.push(index.indexname);
      } catch (error) {
        this.logger.warn(`Failed to create index '${index.indexname}': ${error.message}`);
      }
    }
  }

  buildColumnDefinition(column) {
    const safeName = safeIdentifier(column.column_name);
    let def = safeName;

    let type = column.data_type;
    if (column.character_maximum_length) {
      type += `(${column.character_maximum_length})`;
    } else if (column.numeric_precision) {
      type += `(${column.numeric_precision}`;
      if (column.numeric_scale) {
        type += `,${column.numeric_scale}`;
      }
      type += ')';
    }

    def += ` ${type}`;

    if (column.column_default) {
      if (column.column_default.includes('nextval') || column.column_default.includes('CURRENT_TIMESTAMP')) {
        def += ` DEFAULT ${column.column_default}`;
      } else {
        def += ` DEFAULT ${escapeSqlString(column.column_default)}`;
      }
    }

    if (column.is_nullable === 'NO') {
      def += ' NOT NULL';
    }

    return def;
  }

  async addMissingColumns(localTables, remoteTables) {
    for (const tableName of localTables.filter(t => remoteTables.includes(t))) {
      try {
        const localDef = await this.getTableDefinition(this.localDb, tableName);
        const remoteDef = await this.getTableDefinition(this.remoteDb, tableName);

        const remoteColNames = remoteDef.columns.map(c => c.column_name);
        const missingCols = localDef.columns.filter(c => !remoteColNames.includes(c.column_name));

        for (const col of missingCols) {
          const safeTable = safeIdentifier(tableName);
          const sql = `ALTER TABLE ${safeTable} ADD COLUMN ${this.buildColumnDefinition(col)};`;

          if (this.verbose) {
            this.logger.debug(`SQL: ${sql}`);
          }

          if (!this.dryRun) {
            await this.remoteDb.query(sql);
          }

          this.results.columnsAdded.push(`${tableName}.${col.column_name}`);
          this.logger.info(`✔ Column '${col.column_name}' added to '${tableName}'`);
        }
      } catch (error) {
        this.logger.warn(`Failed to sync columns for '${tableName}': ${error.message}`);
      }
    }
  }

  async createMissingIndices(localTables, remoteTables) {
    for (const tableName of localTables.filter(t => remoteTables.includes(t))) {
      try {
        const localDef = await this.getTableDefinition(this.localDb, tableName);
        const remoteDef = await this.getTableDefinition(this.remoteDb, tableName);

        const remoteIndexNames = remoteDef.indices.map(i => i.indexname);
        const missingIndices = localDef.indices.filter(i => !remoteIndexNames.includes(i.indexname));

        for (const index of missingIndices) {
          if (this.verbose) {
            this.logger.debug(`SQL: ${index.indexdef}`);
          }

          if (!this.dryRun) {
            await this.remoteDb.query(index.indexdef);
          }

          this.results.indicesCreated.push(index.indexname);
          this.logger.info(`✔ Index '${index.indexname}' created`);
        }
      } catch (error) {
        this.logger.warn(`Failed to sync indices for '${tableName}': ${error.message}`);
      }
    }
  }

  async createMissingConstraints(localTables, remoteTables) {
    for (const tableName of localTables.filter(t => remoteTables.includes(t))) {
      try {
        const localDef = await this.getTableDefinition(this.localDb, tableName);
        const remoteDef = await this.getTableDefinition(this.remoteDb, tableName);

        const remoteConstraints = remoteDef.uniqueConstraints.map(c => c.column_name);

        for (const constraint of localDef.uniqueConstraints) {
          if (!remoteConstraints.includes(constraint.column_name)) {
            const safeTable = safeIdentifier(tableName);
            const safeCol = safeIdentifier(constraint.column_name);
            const sql = `ALTER TABLE ${safeTable} ADD UNIQUE (${safeCol});`;

            if (this.verbose) {
              this.logger.debug(`SQL: ${sql}`);
            }

            if (!this.dryRun) {
              await this.remoteDb.query(sql);
            }

            this.results.constraintsCreated.push(`${tableName}.${constraint.column_name}`);
            this.logger.info(`✔ Constraint added to '${tableName}.${constraint.column_name}'`);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to sync constraints for '${tableName}': ${error.message}`);
      }
    }
  }

  async createMissingSequences(localTables, remoteTables) {
    try {
      const localSequences = await this.getSequences(this.localDb);
      const remoteSequences = await this.getSequences(this.remoteDb);

      const missingSequences = localSequences.filter(
        s => !remoteSequences.find(rs => rs.sequence_name === s.sequence_name)
      );

      for (const seq of missingSequences) {
        const safeName = safeIdentifier(seq.sequence_name);
        const sql = `CREATE SEQUENCE ${safeName};`;

        if (this.verbose) {
          this.logger.debug(`SQL: ${sql}`);
        }

        if (!this.dryRun) {
          await this.remoteDb.query(sql);
        }

        this.results.sequencesCreated.push(seq.sequence_name);
        this.logger.info(`✔ Sequence '${seq.sequence_name}' created`);
      }
    } catch (error) {
      this.logger.warn(`Failed to sync sequences: ${error.message}`);
    }
  }

  async getSequences(db) {
    const result = await db.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name
    `);
    return result.rows;
  }
}

module.exports = { SchemaSynchronizer };
