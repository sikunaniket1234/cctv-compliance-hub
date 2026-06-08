const bcrypt = require('bcryptjs');
const Organization = require('../models/organization');
const Location = require('../models/location');
const Camera = require('../models/camera');

exports.listOrganizations = async (req, res) => {
  try {
    if (req.role === 'admin') {
      const organizations = await Organization.findAll({
        where: { role: 'ngo' },
        attributes: ['id', 'name', 'email', 'registration_number', 'contact_person', 'phone', 'createdAt'],
        order: [['createdAt', 'DESC']],
      });
      return res.json({ organizations });
    }

    const organization = await Organization.findOne({
      where: { id: req.organizationId },
      attributes: ['id', 'name', 'email', 'registration_number', 'contact_person', 'phone', 'createdAt'],
    });

    return res.json({ organizations: organization ? [organization] : [] });
  } catch (error) {
    console.error('List organizations failed:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    if (Number(id) !== req.organizationId) {
      return res.status(403).json({ error: 'Unauthorized organization access' });
    }

    const organization = await Organization.findByPk(id, {
      attributes: ['id', 'name', 'email', 'registration_number', 'contact_person', 'phone', 'createdAt'],
    });
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    return res.json({ organization });
  } catch (error) {
    console.error('Get organization failed:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    if (Number(id) !== req.organizationId) {
      return res.status(403).json({ error: 'Unauthorized organization update' });
    }

    const updates = {};
    const allowed = ['name', 'registration_number', 'contact_person', 'phone', 'email', 'password'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined && field !== 'password') {
        updates[field] = req.body[field];
      }
    });

    if (req.body.password) {
      updates.password_hash = await bcrypt.hash(req.body.password, 10);
    }

    const organization = await Organization.findByPk(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    await organization.update(updates);
    return res.json({ organization: { id: organization.id, name: organization.name, email: organization.email, contact_person: organization.contact_person, phone: organization.phone, registration_number: organization.registration_number } });
  } catch (error) {
    console.error('Update organization failed:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    if (Number(id) !== req.organizationId) {
      return res.status(403).json({ error: 'Unauthorized organization delete' });
    }

    const organization = await Organization.findByPk(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    await Camera.destroy({ where: { location_id: { [require('sequelize').Op.in]: (await Location.findAll({ where: { organization_id: id }, attributes: ['id'] })).map((loc) => loc.id) } } });
    await Location.destroy({ where: { organization_id: id } });
    await organization.destroy();

    return res.json({ ok: true, message: 'Organization deleted' });
  } catch (error) {
    console.error('Delete organization failed:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.createOrganizationByAdmin = async (req, res) => {
  try {
    if (req.role !== 'admin') {
      return res.status(403).json({ error: 'Admin permission required' });
    }

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
      role: 'ngo',
    });

    return res.status(201).json({
      organization: {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        contact_person: organization.contact_person,
        phone: organization.phone,
        registration_number: organization.registration_number,
      },
    });
  } catch (error) {
    console.error('Admin create organization failed:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getAdminReports = async (req, res) => {
  try {
    if (req.role !== 'admin') {
      return res.status(403).json({ error: 'Admin permission required' });
    }

    const ngos = await Organization.findAll({
      where: { role: 'ngo' },
      attributes: ['id', 'name', 'email', 'registration_number', 'phone'],
    });

    const ngoReports = [];
    for (const ngo of ngos) {
      const locations = await Location.findAll({ where: { organization_id: ngo.id } });
      const locationIds = locations.map((l) => l.id);

      let totalCameras = 0;
      let onlineCameras = 0;
      let offlineCameras = 0;

      if (locationIds.length > 0) {
        const cameras = await Camera.findAll({
          where: { location_id: locationIds },
        });
        totalCameras = cameras.length;
        onlineCameras = cameras.filter(
          (c) => c.stream_status === 'ready' || c.stream_status === 'created' || c.stream_status === 'seeded'
        ).length;
        offlineCameras = totalCameras - onlineCameras;
      }

      ngoReports.push({
        id: ngo.id,
        name: ngo.name,
        registration_number: ngo.registration_number,
        email: ngo.email,
        phone: ngo.phone,
        totalLocations: locations.length,
        totalCameras,
        onlineCameras,
        offlineCameras,
      });
    }

    const disconnectedCameras = await Camera.findAll({
      where: {
        stream_status: {
          [require('sequelize').Op.notIn]: ['ready', 'created', 'seeded'],
        },
      },
      include: [
        {
          model: Location,
          include: [{ model: Organization, attributes: ['id', 'name'] }],
        },
      ],
    });

    const failingCameras = disconnectedCameras.map((c) => ({
      id: c.id,
      camera_name: c.camera_name,
      connection_method: c.connection_method,
      stream_status: c.stream_status,
      location_name: c.Location?.location_name || 'Unknown',
      ngo_name: c.Location?.Organization?.name || 'Unknown',
    }));

    const memUsage = process.memoryUsage();
    const serverHealth = {
      uptimeSeconds: Math.floor(process.uptime()),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
      nodeVersion: process.version,
      platform: process.platform,
      cpuArch: process.arch,
    };

    return res.json({
      ngoReports,
      failingCameras,
      serverHealth,
    });
  } catch (error) {
    console.error('Get admin reports failed:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
