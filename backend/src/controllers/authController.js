const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Organization = require('../models/organization');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';

exports.register = async (req, res) => {
  try {
    const { name, registration_number, contact_person, email, phone, password } = req.body;

    if (!name || !registration_number || !contact_person || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await Organization.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const organization = await Organization.create({
      name,
      registration_number,
      contact_person,
      email,
      phone,
      password_hash,
    });

    return res.status(201).json({ id: organization.id, email: organization.email });
  } catch (error) {
    console.error('Register failed:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const organization = await Organization.findOne({ where: { email } });
    if (!organization) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, organization.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ organizationId: organization.id, email: organization.email, role: organization.role }, JWT_SECRET, {
      expiresIn: '8h',
    });

    return res.json({
      token,
      organization: {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        role: organization.role,
      },
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
