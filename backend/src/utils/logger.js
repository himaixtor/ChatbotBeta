/**
 * Minimal logging — suppress verbose logs in production.
 */
function log(...args) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
}

function logError(...args) {
  console.error(...args);
}

module.exports = { log, logError };
