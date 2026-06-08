const { Sequelize } = require('sequelize');

const dialect = process.env.DB_DIALECT || 'sqlite';
const config = {
  dialect,
  logging: false,
};

if (dialect === 'mysql') {
  config.host = process.env.DB_HOST || '127.0.0.1';
  config.port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
} else {
  config.storage = process.env.DB_STORAGE || './backend-database.sqlite';
}

const sequelize = new Sequelize(
  process.env.DB_NAME || 'cctv_hub',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  config
);

module.exports = { sequelize };
