const Location = require('../models/location');
const Organization = require('../models/organization');

exports.createLocation = async (req, res) => {
  try {
    const { location_name, address, city, state, pincode, organization_id } = req.body;
    if (!location_name || !address || !city || !state || !pincode) {
      return res.status(400).json({ error: 'All location fields are required' });
    }

    let orgId = req.organizationId;
    if (req.role === 'admin') {
      if (!organization_id) {
        return res.status(400).json({ error: 'Organization ID is required for admin' });
      }
      orgId = organization_id;
    }

    const location = await Location.create({
      organization_id: orgId,
      location_name,
      address,
      city,
      state,
      pincode,
    });

    return res.status(201).json({ location });
  } catch (error) {
    console.error('Create location failed:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.listLocations = async (req, res) => {
  try {
    const queryOptions = {
      order: [['createdAt', 'DESC']],
    };

    if (req.role === 'admin') {
      queryOptions.include = [{ model: Organization, attributes: ['id', 'name', 'email'] }];
    } else {
      queryOptions.where = { organization_id: req.organizationId };
    }

    const locations = await Location.findAll(queryOptions);
    return res.json({ locations });
  } catch (error) {
    console.error('List locations failed:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
