const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Organization = require('./organization');

const Location = sequelize.define('Location', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  location_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  state: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  pincode: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  heartbeat_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
});

Location.belongsTo(Organization, { foreignKey: 'organization_id' });
Organization.hasMany(Location, { foreignKey: 'organization_id' });

module.exports = Location;
