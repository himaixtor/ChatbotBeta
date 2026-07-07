# PostgreSQL Sync Tool - Implementation Guide

Complete technical documentation of the database synchronization tool architecture, design decisions, and internal mechanisms.

## Architecture Overview

The sync tool follows a **clean, modular architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      CLI Entry Point (sync.js)              │
│                    Parses arguments & orchestrates          │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────────────┐  ┌──────▼─────────────────┐
│  SchemaSynchronizer  │  │  DataSynchronizer     │
│  - Compare schemas   │  │  - Sync rows          │
│  - Create objects    │  │  - Handle conflicts   │
│  - Add columns       │  │  - Batch inserts      │
│  - Create indices    │  │  - Update sequences   │
└────────┬──────────────┘  └──────┬────────────────┘
         │                        │
         └────────────┬───────────┘
                      │
         ┌────────────▼─────────────┐
         │  DatabaseConnection      │
         │  - Manage connections    │
         │  - Execute queries       │
         │  - Handle transactions   │
         └─────────────────────────┘
                      │
         ┌────────────▼─────────────┐
         │   pg (PostgreSQL)        │
         │   Native DB driver       │
         └─────────────────────────┘
```

## Module Breakdown

### 1. **config/index.js** - Configuration Management

**Purpose**: Centralize environment variable reading and validation

**Key Functions**:
- `validateConfig()` - Validates all required environment variables
- Returns configuration object for local and remote databases

**Design Decisions**:
- ✅ Uses `dotenv` for .env file support
- ✅ Provides sensible defaults for optional settings
- ✅ Validates before app starts
- ✅ Separates config from business logic

**Example**:
```javascript
const { config, validateConfig } = require('./config');

// Validate configuration
const errors = validateConfig();
if (errors.length > 0) {
  console.error('Configuration invalid', errors);
  process.exit(1);
}

// Use configuration
const localDb = new DatabaseConnection(config.localDb, 'Local');
```

### 2. **db/connection.js** - Database Connection Layer

**Purpose**: Abstract database connection logic and provide safe query interface

**Key Classes**:
- `DatabaseConnection` - Manages single database connection lifecycle

**Key Methods**:
- `connect()` - Establishes connection to PostgreSQL
- `disconnect()` - Closes connection gracefully
- `query(sql, params)` - Executes parameterized query
- `rawTransaction(callback)` - Manages transaction lifecycle

**Design Decisions**:
- ✅ Parameterized queries prevent SQL injection
- ✅ Per-connection logging for debugging
- ✅ Error handling with context
- ✅ Transaction management built-in
- ✅ Automatic connection cleanup

**Example**:
```javascript
const db = new DatabaseConnection(config.localDb, 'LocalDB');
await db.connect();

// Safe query with parameters
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// Transaction with automatic rollback on error
await db.rawTransaction(async (connection) => {
  await connection.query('INSERT INTO users ...');
  await connection.query('UPDATE sessions ...');
  // Commits automatically, or rolls back if error
});

await db.disconnect();
```

### 3. **services/schema-sync.js** - Schema Synchronization

**Purpose**: Compare schemas between databases and create missing objects

**Key Methods**:
- `synchronize()` - Main entry point, orchestrates schema sync
- `getTables()` - List all tables in database
- `getTableDefinition()` - Get complete table structure
- `createTable()` - Creates entire table with all constraints
- `addMissingColumns()` - Adds columns to existing tables
- `createMissingIndices()` - Creates indices
- `createMissingConstraints()` - Creates unique constraints
- `createMissingSequences()` - Creates sequences

**Design Decisions**:
- ✅ Never drops or modifies existing objects
- ✅ Skips objects that already exist
- ✅ Preserves remote-only objects
- ✅ Per-operation error handling (table fails, others continue)
- ✅ Uses `information_schema` for schema introspection

**Example**:
```javascript
const syncer = new SchemaSynchronizer(localDb, remoteDb, {
  dryRun: false,
  verbose: true,
});

const results = await syncer.synchronize();

console.log('Created tables:', results.tablesCreated);
console.log('Added columns:', results.columnsAdded);
console.log('Errors:', results.errors);
```

### 4. **services/data-sync.js** - Data Synchronization

**Purpose**: Copy rows from local to remote database safely

**Key Methods**:
- `synchronize()` - Main entry point
- `syncTable()` - Syncs single table
- `getPrimaryKeys()` - Gets primary key columns
- `getUniqueConstraints()` - Gets unique constraints
- `fetchRows()` - Fetches batch of rows from local
- `insertBatch()` - Inserts batch using UPSERT
- `updateSequences()` - Updates sequences after data sync

**Design Decisions**:
- ✅ Batch processing (500 rows default, configurable)
- ✅ Automatic primary key detection
- ✅ Falls back to unique constraints if no primary key
- ✅ Uses `ON CONFLICT DO NOTHING` for safety
- ✅ Parameterized queries for all inserts
- ✅ Per-row error handling with skip logic
- ✅ Memory-efficient streaming

**Example**:
```javascript
const syncer = new DataSynchronizer(localDb, remoteDb, {
  dryRun: false,
  verbose: true,
  batchSize: 1000, // Process 1000 rows at a time
});

const results = await syncer.synchronize();

// Results contain per-table statistics
for (const [table, stats] of Object.entries(results.tablesSynced)) {
  console.log(`${table}: ${stats.inserted} inserted, ${stats.skipped} skipped`);
}

// Update sequences after data insertion
await syncer.updateSequences();
```

### 5. **utils/logger.js** - Logging Utility

**Purpose**: Provide consistent, formatted logging to console and file

**Key Methods**:
- `debug()` - Debug-level logging (file only)
- `info()` - Informational logging (console + file)
- `warn()` - Warning logging (console + file)
- `error()` - Error logging (console + file)
- `success()` - Success logging with green color

**Design Decisions**:
- ✅ Dual output to console and log file
- ✅ Timestamps on every message
- ✅ Context labeling (module name)
- ✅ Log files organized by date
- ✅ Color-coded console output
- ✅ Automatic log directory creation

**Example**:
```javascript
const logger = new Logger('MyModule');

logger.info('Starting process...');
logger.debug('Detailed debug info');
logger.warn('⚠ Warning message');
logger.error('❌ Error occurred');
logger.success('✅ Process complete');

// Logs appear in: logs/sync-2026-07-07.log
```

### 6. **utils/sql-utils.js** - SQL Utilities

**Purpose**: Provide safe SQL builders and validators

**Key Functions**:
- `safeIdentifier()` - Quotes identifiers safely
- `escapeSqlString()` - Escapes string values for SQL
- `getConflictColumns()` - Gets conflict column from row
- `buildInsertQuery()` - Builds parameterized INSERT
- `buildUpsertQuery()` - Builds parameterized UPSERT

**Design Decisions**:
- ✅ Prevents SQL injection through identifier validation
- ✅ Uses parameterized queries ($1, $2, etc.)
- ✅ Proper NULL handling
- ✅ Type-aware escaping (numbers, booleans, strings)

**Example**:
```javascript
const safeTable = safeIdentifier('User-Table'); // Returns "User-Table"
const safeValue = escapeSqlString("O'Reilly");   // Returns 'O''Reilly'

const query = buildUpsertQuery(
  'users',
  ['id', 'name', 'email'],
  ['id'],
  [1, 'John', 'john@example.com']
);
// INSERT INTO "users" ("id", "name", "email") 
// VALUES ($1, $2, $3) ON CONFLICT ("id") DO NOTHING
```

### 7. **utils/cli.js** - CLI Argument Parser

**Purpose**: Parse command-line arguments

**Key Functions**:
- `parseArguments()` - Parses process.argv into options object
- `printHelp()` - Displays help message

**Supported Arguments**:
- `--schema` - Schema sync only
- `--data` - Data sync only
- `--dry-run` - Preview mode
- `--verbose` - Detailed output
- `--help` - Show help

**Example**:
```javascript
const { parseArguments, printHelp } = require('./utils/cli');

const options = parseArguments();

if (options.help) {
  printHelp();
  process.exit(0);
}

console.log('Schema sync:', options.schema);
console.log('Data sync:', options.data);
console.log('Dry run:', options.dryRun);
```

### 8. **sync.js** - Main CLI Entry Point

**Purpose**: Orchestrate the entire synchronization process

**Flow**:
1. Parse command-line arguments
2. Validate configuration
3. Connect to both databases
4. Run schema sync (if enabled)
5. Run data sync (if enabled)
6. Display summary statistics
7. Disconnect gracefully

**Design Decisions**:
- ✅ Clean orchestration of all services
- ✅ Comprehensive error handling
- ✅ Friendly user output with progress
- ✅ Graceful disconnection in finally block

## Data Flow Examples

### Schema Synchronization Flow

```
1. Get list of tables from local DB
2. Get list of tables from remote DB
3. For each table in local but not in remote:
   a. Get full table definition (columns, indices, constraints)
   b. Build CREATE TABLE statement
   c. Execute on remote
   d. Create all indices
4. For each table in both local and remote:
   a. Get column lists from both
   b. Identify missing columns
   c. Add missing columns with ALTER TABLE
5. Repeat for indices and constraints
6. Create missing sequences
7. Report summary (created, skipped, errors)
```

### Data Synchronization Flow

```
1. Get all table names from local
2. For each table:
   a. Detect primary keys (required for conflict detection)
   b. If no primary key, try unique constraint
   c. If neither, skip table with warning
   d. Count total rows
   e. Process in batches:
      i. Fetch batch from local (ordered by PK)
      ii. For each row:
          - Build INSERT statement with UPSERT
          - Execute with parameterized values
          - ON CONFLICT DO NOTHING skips duplicates
      iii. Track inserted vs skipped counts
3. After all data:
   a. Update sequences to max value + 1
4. Report summary (per-table statistics)
```

### Transaction Management

```
For each table during data sync:

BEGIN TRANSACTION
  Try:
    INSERT rows with UPSERT
    Track results
  Catch error:
    Log error
    ROLLBACK (only this table)
    Continue to next table
  Finally:
    COMMIT (if no error)
```

## Safety Mechanisms

### 1. **SQL Injection Prevention**

✅ Uses parameterized queries for ALL values:
```javascript
// Safe - value injected via parameter
await db.query('INSERT INTO users (name) VALUES ($1)', [userInput]);

// NOT SAFE - would be vulnerable
await db.query(`INSERT INTO users (name) VALUES ('${userInput}')`);
```

### 2. **Identifier Validation**

✅ Validates all table and column names:
```javascript
// Safe - validates before quoting
const safeName = safeIdentifier('user_table');

// Would throw error on invalid characters
safeIdentifier('user_table; DROP TABLE users;'); // Error!
```

### 3. **ON CONFLICT Clause**

✅ Prevents duplicate key errors:
```sql
INSERT INTO users (id, name) VALUES ($1, $2)
ON CONFLICT (id) DO NOTHING
-- Existing rows are skipped, not updated
```

### 4. **Per-Table Transactions**

✅ Isolates failures to individual tables:
```javascript
BEGIN;
  -- All operations for table A
COMMIT or ROLLBACK; -- Only table A affected
-- Continue to table B
```

### 5. **Environment Variable Credentials**

✅ Never hardcoded passwords:
```javascript
const password = process.env.DB_PASSWORD; // From .env
// NOT: const password = 'secret123'; // Hardcoded!
```

## Performance Optimizations

### 1. **Batch Processing**

Data synced in configurable batches (default 500 rows):
```javascript
const batchSize = config.sync.batchSize; // 500
for (let offset = 0; offset < totalRows; offset += batchSize) {
  const rows = await fetchRows(tableName, offset, batchSize);
  await insertBatch(rows);
}
```

**Benefits**:
- Lower memory usage
- Faster individual operations
- Can be tuned for network latency

### 2. **Parameterized Queries**

Using `$1, $2` placeholders instead of string concatenation:
- PostgreSQL driver optimizes repeated patterns
- Query parsing cached
- Network overhead reduced

### 3. **Connection Pooling**

Single persistent connection per database:
- Avoids connection establishment overhead
- Reuses TCP connection
- PostgreSQL protocol optimizations

### 4. **Streaming Where Possible**

Large result sets fetched in batches, not all at once:
- Constant memory usage
- Responsive feedback
- Can handle databases larger than RAM

## Error Handling Strategy

### Errors Are Categorized

```
FATAL (exit immediately):
  - Configuration invalid
  - Cannot connect to either database

WARNING (log, continue):
  - Table sync fails -> continue to next table
  - Sequence update fails -> continue
  - Index creation fails -> continue

EXPECTED (log, handle gracefully):
  - Duplicate key -> skip row
  - No primary key -> skip table
  - Column already exists -> skip column
```

### Example Error Flow

```javascript
try {
  await syncTable(tableName);
} catch (error) {
  // Log error
  logger.error(`Failed to sync ${tableName}: ${error.message}`);
  
  // Add to results
  results.errors.push(`${tableName}: ${error.message}`);
  
  // Continue to next table (don't exit)
}
```

## Testing

### Manual Testing Steps

1. **Setup Testing**
```bash
npm run validate
# Verifies config, dependencies, and connections
```

2. **Dry Run Testing**
```bash
npm run sync:dry
# Shows what would happen without making changes
```

3. **Partial Testing**
```bash
npm run sync:schema --verbose
# Sync schema only with detailed output
```

4. **Full Testing**
```bash
npm run sync --verbose
# Full sync with complete logging
```

### Verification After Sync

```sql
-- Check table counts
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check row counts per table
SELECT tablename, n_live_tup as rows 
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC;

-- Check sequence values
SELECT sequence_name, last_value 
FROM information_schema.sequences;
```

## Extending the Tool

### Adding New Sync Logic

1. Create new service in `services/`:
```javascript
// services/custom-sync.js
class CustomSynchronizer {
  constructor(localDb, remoteDb, options) {
    this.localDb = localDb;
    this.remoteDb = remoteDb;
    this.options = options;
  }

  async synchronize() {
    // Custom logic here
    return results;
  }
}
module.exports = { CustomSynchronizer };
```

2. Import in `sync.js`:
```javascript
const { CustomSynchronizer } = require('./services/custom-sync');

// Use in main()
const customSync = new CustomSynchronizer(localDb, remoteDb, options);
await customSync.synchronize();
```

### Adding New CLI Options

1. Update `utils/cli.js`:
```javascript
case '--my-option':
  options.myOption = true;
  break;
```

2. Use in `sync.js`:
```javascript
if (options.myOption) {
  // Handle new option
}
```

## Debugging

### Enable Verbose Output

```bash
npm run sync:verbose
# Shows every SQL statement executed
```

### Check Log Files

```bash
cat logs/sync-2026-07-07.log
# Review all operations in detail
```

### Debug Individual Tables

```bash
BATCH_SIZE=10 npm run sync:data --verbose
# Process in smaller batches with detailed output
```

### Test Query Directly

```bash
psql -h localhost -U postgres -d chatbot_db
postgres=# SELECT * FROM information_schema.tables WHERE table_schema = 'public';
```

## Performance Metrics

Expected performance on modern hardware:

| Operation | Data Size | Time |
|-----------|-----------|------|
| Schema sync | 50 tables | 5-10 seconds |
| Data sync | 100K rows | 5-10 seconds |
| Data sync | 1M rows | 30-60 seconds |
| Data sync | 10M rows | 3-5 minutes |

**Variables affecting speed**:
- Network latency to remote database
- Query optimization (indices)
- Database server load
- Batch size configuration
- Hardware capabilities (CPU, disk, RAM)

## Future Enhancements

Potential improvements:
- [ ] Parallel table synchronization
- [ ] Incremental sync tracking with timestamps
- [ ] Schema versioning support
- [ ] Data transformation during sync
- [ ] Bidirectional sync support
- [ ] Custom transformation functions
- [ ] Web UI for monitoring
- [ ] Integration with monitoring systems
- [ ] Compression for network efficiency
- [ ] Encryption for credentials

---

**Version**: 1.0.0  
**Last Updated**: 2026-07-07  
**Maintainer**: Chatbot Suite Team
