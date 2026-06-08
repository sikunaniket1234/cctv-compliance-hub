const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  registration_number: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  contact_person: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING(50),
    defaultValue: 'ngo',
    allowNull: false,
  },
});

module.exports = Organization;
