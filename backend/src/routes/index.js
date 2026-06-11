const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const organizationController = require('../controllers/organizationController');
const locationController = require('../controllers/locationController');
const cameraController = require('../controllers/cameraController');
const heartbeatController = require('../controllers/heartbeatController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/heartbeat', heartbeatController.processHeartbeat);

router.get('/organizations', authMiddleware, organizationController.listOrganizations);
router.get('/organizations/:id', authMiddleware, organizationController.getOrganization);
router.patch('/organizations/:id', authMiddleware, organizationController.updateOrganization);
router.delete('/organizations/:id', authMiddleware, organizationController.deleteOrganization);
router.get('/ngos', authMiddleware, organizationController.listOrganizations);
router.post('/ngos', authMiddleware, organizationController.createOrganizationByAdmin);
router.get('/admin/reports', authMiddleware, organizationController.getAdminReports);

router.post('/locations', authMiddleware, locationController.createLocation);
router.get('/locations', authMiddleware, locationController.listLocations);

router.post('/cameras', authMiddleware, cameraController.createCamera);
router.get('/cameras', authMiddleware, cameraController.listCameras);
router.post('/cameras/test', authMiddleware, cameraController.testCamera);
router.post('/cameras/discover', authMiddleware, cameraController.discoverChannels);
router.post('/cameras/:id/test', authMiddleware, cameraController.testSavedCamera);
router.get('/cameras/:id/dns-lookup', authMiddleware, cameraController.dnsLookup);

router.get('/public/view/:streamKey', cameraController.getCameraByStreamKey);
router.get('/public/locations/:locationId/cameras', cameraController.getPublicLocationCameras);

module.exports = router;
