require('dotenv').config();

const config = {
  localDb: {
    host: process.env.LOCAL_DB_HOST || 'localhost',
    port: parseInt(process.env.LOCAL_DB_PORT || '5432', 10),
    database: process.env.LOCAL_DB_NAME || 'chatbot_db',
    user: process.env.LOCAL_DB_USER || 'postgres',
    password: process.env.LOCAL_DB_PASSWORD,
  },
  remoteDb: {
    host: process.env.REMOTE_DB_HOST,
    port: parseInt(process.env.REMOTE_DB_PORT || '5432', 10),
    database: process.env.REMOTE_DB_NAME || 'chatbot_db',
    user: process.env.REMOTE_DB_USER || 'postgres',
    password: process.env.REMOTE_DB_PASSWORD,
  },
  sync: {
    batchSize: parseInt(process.env.BATCH_SIZE || '500', 10),
    verbosity: process.env.VERBOSITY || 'normal', // silent, normal, verbose
  },
};

function validateConfig() {
  const errors = [];

  if (!config.localDb.host) errors.push('LOCAL_DB_HOST is required');
  if (!config.localDb.user) errors.push('LOCAL_DB_USER is required');
  if (!config.localDb.password) errors.push('LOCAL_DB_PASSWORD is required');

  if (!config.remoteDb.host) errors.push('REMOTE_DB_HOST is required');
  if (!config.remoteDb.user) errors.push('REMOTE_DB_USER is required');
  if (!config.remoteDb.password) errors.push('REMOTE_DB_PASSWORD is required');

  return errors;
}

module.exports = {
  config,
  validateConfig,
};
