require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sequelize } = require('./src/config/database');
const Organization = require('./src/models/organization');
const Location = require('./src/models/location');
const Camera = require('./src/models/camera');

const ENCRYPTION_KEY = process.env.CAMERA_ENCRYPTION_KEY || 'default_camera_encryption_key_32bytes!';
const ENCRYPTION_KEY_BYTES = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

const encryptText = (value) => {
  if (value == null) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY_BYTES, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    const [adminOrg, adminCreated] = await Organization.findOrCreate({
      where: { email: 'admin@cctv.com' },
      defaults: {
        name: 'System Admin',
        registration_number: 'ADMIN-00000',
        contact_person: 'System Administrator',
        email: 'admin@cctv.com',
        phone: '0000000000',
        password_hash: await bcrypt.hash('AdminPassword123!', 10),
        role: 'admin',
      },
    });

    if (adminCreated) {
      console.log('Created system admin account:', adminOrg.email);
    } else {
      console.log('System admin already exists:', adminOrg.email);
    }

    const [organization, created] = await Organization.findOrCreate({
      where: { email: 'demo@ngo.org' },
      defaults: {
        name: 'Demo NGO',
        registration_number: 'NGO-12345',
        contact_person: 'Jane Doe',
        email: 'demo@ngo.org',
        phone: '9999999999',
        password_hash: await bcrypt.hash('Password123!', 10),
        role: 'ngo',
      },
    });

    if (created) {
      console.log('Created demo organization:', organization.email);
    } else {
      console.log('Demo organization already exists:', organization.email);
    }

    const locationsToSeed = [
      {
        location_name: 'Main Campus',
        address: '123 Demo Street',
        city: 'Sample City',
        state: 'Sample State',
        pincode: '123456',
      },
      {
        location_name: 'Girls Hostel',
        address: '456 Girls Hostel Lane',
        city: 'Sample City',
        state: 'Sample State',
        pincode: '123456',
      },
      {
        location_name: 'Old Age Home Campus',
        address: '789 Care Avenue',
        city: 'Sample City',
        state: 'Sample State',
        pincode: '123456',
      },
      {
        location_name: 'Boys Hostel',
        address: '101 Boys Hostel Rd',
        city: 'Sample City',
        state: 'Sample State',
        pincode: '123456',
      },
      {
        location_name: 'Activity Center',
        address: '202 Play Ground Lane',
        city: 'Sample City',
        state: 'Sample State',
        pincode: '123456',
      }
    ];

    let mainCampusLocation = null;

    for (const locData of locationsToSeed) {
      const [location, locationCreated] = await Location.findOrCreate({
        where: {
          organization_id: organization.id,
          location_name: locData.location_name,
        },
        defaults: {
          organization_id: organization.id,
          ...locData,
        },
      });

      if (locData.location_name === 'Main Campus') {
        mainCampusLocation = location;
      }

      if (locationCreated) {
        console.log('Created demo location:', location.location_name);
      } else {
        console.log('Demo location already exists:', location.location_name);
      }
    }

    const [camera, cameraCreated] = await Camera.findOrCreate({
      where: {
        location_id: mainCampusLocation.id,
        camera_name: 'Main Gate Channel 1',
      },
      defaults: {
        location_id: mainCampusLocation.id,
        camera_name: 'Main Gate Channel 1',
        connection_method: 'rtsp',
        encrypted_rtsp: encryptText('rtsp://admin:abcd1234@192.168.29.39:554/cam/realmonitor?channel=1&subtype=0'),
        encrypted_username: encryptText('admin'),
        encrypted_password: encryptText('abcd1234'),
        stream_status: 'seeded',
        is_public: false,
      },
    });

    if (cameraCreated) {
      console.log('Created seeded camera:', camera.camera_name);
    } else {
      console.log('Seeded camera already exists:', camera.camera_name);
    }

    console.log('Seed completed. Login with email demo@ngo.org and password Password123!');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
