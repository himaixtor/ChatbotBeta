const fs = require('fs');
const path = require('path');

class Logger {
  constructor(context = 'App', filePath = null) {
    this.context = context;
    this.filePath = filePath || this.getLogFilePath();
    this.ensureLogDirectory();
  }

  getLogFilePath() {
    const logsDir = path.join(__dirname, '../logs');
    const date = new Date().toISOString().split('T')[0];
    return path.join(logsDir, `sync-${date}.log`);
  }

  ensureLogDirectory() {
    const logsDir = path.dirname(this.filePath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.context}] ${message}`;
  }

  writeToFile(message) {
    try {
      fs.appendFileSync(this.filePath, message + '\n');
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
    }
  }

  debug(message) {
    const formatted = this.formatMessage('DEBUG', message);
    this.writeToFile(formatted);
  }

  info(message) {
    const formatted = this.formatMessage('INFO', message);
    console.log(formatted);
    this.writeToFile(formatted);
  }

  warn(message) {
    const formatted = this.formatMessage('WARN', message);
    console.warn(formatted);
    this.writeToFile(formatted);
  }

  error(message) {
    const formatted = this.formatMessage('ERROR', message);
    console.error(formatted);
    this.writeToFile(formatted);
  }

  success(message) {
    const formatted = this.formatMessage('SUCCESS', message);
    console.log(`\x1b[32m${formatted}\x1b[0m`);
    this.writeToFile(formatted);
  }
}

module.exports = { Logger };
