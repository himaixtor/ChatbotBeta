function parseArguments() {
  const args = process.argv.slice(2);

  const options = {
    schema: false,
    data: false,
    dryRun: false,
    verbose: false,
    help: false,
  };

  for (const arg of args) {
    switch (arg.toLowerCase()) {
      case '--schema':
        options.schema = true;
        break;
      case '--data':
        options.data = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  if (!options.schema && !options.data) {
    options.schema = true;
    options.data = true;
  }

  return options;
}

function printHelp() {
  console.log(`
PostgreSQL Database Synchronization Tool

Usage:
  node sync.js [options]

Options:
  --schema              Synchronize schema only (tables, columns, indices, constraints)
  --data                Synchronize data only
  --dry-run             Show what changes would be made without executing
  --verbose             Print every SQL statement executed
  --help, -h            Show this help message

Examples:
  node sync.js                    # Sync both schema and data (default)
  node sync.js --schema           # Sync schema only
  node sync.js --data             # Sync data only
  node sync.js --dry-run          # Preview changes without applying
  node sync.js --verbose --schema # Sync schema with detailed output

Environment Variables:
  LOCAL_DB_HOST         Local database host (default: localhost)
  LOCAL_DB_PORT         Local database port (default: 5432)
  LOCAL_DB_NAME         Local database name (default: chatbot_db)
  LOCAL_DB_USER         Local database user (default: postgres)
  LOCAL_DB_PASSWORD     Local database password (required)

  REMOTE_DB_HOST        Remote database host (required)
  REMOTE_DB_PORT        Remote database port (default: 5432)
  REMOTE_DB_NAME        Remote database name (default: chatbot_db)
  REMOTE_DB_USER        Remote database user (default: postgres)
  REMOTE_DB_PASSWORD    Remote database password (required)

  BATCH_SIZE            Rows per batch for data sync (default: 500)
  VERBOSITY             Log level: silent, normal, verbose (default: normal)
  `);
}

module.exports = {
  parseArguments,
  printHelp,
};
