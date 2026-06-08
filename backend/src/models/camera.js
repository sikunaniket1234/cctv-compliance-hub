const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Location = require('./location');

const Camera = sequelize.define('Camera', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  location_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  camera_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  connection_method: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  host: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  channel_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  custom_rtsp_path: {
    type: DataTypes.STRING(1024),
    allowNull: true,
  },
  encrypted_rtsp: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  encrypted_username: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  encrypted_password: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  viewer_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  stream_status: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  last_checked_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  stream_key: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
  },
});

Camera.belongsTo(Location, { foreignKey: 'location_id' });
Location.hasMany(Camera, { foreignKey: 'location_id' });

module.exports = Camera;
