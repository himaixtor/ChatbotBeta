const { Client } = require('pg');
const { Logger } = require('../utils/logger');

class DatabaseConnection {
  constructor(config, name) {
    this.config = config;
    this.name = name;
    this.client = null;
    this.logger = new Logger(name);
  }

  async connect() {
    try {
      this.client = new Client({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        application_name: `db-sync-${this.name}`,
      });

      await this.client.connect();
      this.logger.info(`Connected to ${this.config.host}:${this.config.port}/${this.config.database}`);
      return true;
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      throw new Error(`Failed to connect to ${this.name}: ${error.message}`);
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      this.logger.info(`Disconnected from ${this.name}`);
    }
  }

  async query(sql, params = []) {
    if (!this.client) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await this.client.query(sql, params);
      return result;
    } catch (error) {
      this.logger.error(`Query failed: ${error.message}\nSQL: ${sql}`);
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.client.connect();
    const connection = { query: (sql, params) => client.query(sql, params) };

    try {
      await connection.query('BEGIN');
      const result = await callback(connection);
      await connection.query('COMMIT');
      return result;
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async rawTransaction(callback) {
    try {
      await this.client.query('BEGIN');
      const result = await callback(this);
      await this.client.query('COMMIT');
      return result;
    } catch (error) {
      await this.client.query('ROLLBACK');
      throw error;
    }
  }
}

module.exports = { DatabaseConnection };
