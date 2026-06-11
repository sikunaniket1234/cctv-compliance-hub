const Location = require('../models/location');
const Camera = require('../models/camera');
const mediamtxService = require('../services/mediamtxService');
const { decryptText, encryptText, buildRtspUrl } = require('./cameraController');

exports.processHeartbeat = async (req, res) => {
  try {
    const { device_id } = req.body;

    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    // 1. Verify Authentication Token
    const expectedToken = process.env.HEARTBEAT_SECRET_TOKEN || 'my-secret-123';
    const receivedToken = req.headers['x-token'];

    if (receivedToken !== expectedToken) {
      console.warn(`Heartbeat authentication failed for device ${device_id}. Received: ${receivedToken}`);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // 2. Extract Client Public WAN IP
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Handle multiple proxies (comma separated)
    if (clientIp && clientIp.includes(',')) {
      clientIp = clientIp.split(',')[0].trim();
    }

    // Clean up IPv6-mapped IPv4 addresses (e.g. ::ffff:192.168.1.1)
    if (clientIp && clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.substring(7);
    }

    // Clean up localhost loopback addresses
    if (clientIp === '::1') {
      clientIp = '127.0.0.1';
    }

    console.log(`Heartbeat received from device "${device_id}". Extracted IP: ${clientIp}`);

    // 3. Find Location associated with device_id
    const location = await Location.findOne({ where: { heartbeat_id: device_id } });
    if (!location) {
      console.warn(`Heartbeat received for unknown or disabled device: "${device_id}"`);
      return res.status(404).json({ error: `Location not configured for heartbeat device: "${device_id}"` });
    }

    // 4. Find all cameras for this location
    const cameras = await Camera.findAll({ where: { location_id: location.id } });
    console.log(`Found ${cameras.length} cameras associated with location "${location.location_name}"`);

    let updatedCount = 0;

    for (const camera of cameras) {
      if (camera.host !== clientIp) {
        console.log(`Updating camera ${camera.id} (${camera.camera_name}) host from ${camera.host} to ${clientIp}`);

        const username = decryptText(camera.encrypted_username);
        const password = decryptText(camera.encrypted_password);

        // Rebuild RTSP connection string with the new IP address
        const newRtspUrl = buildRtspUrl({
          connection_method: camera.connection_method,
          rtsp_url: camera.rtsp_url,
          host: clientIp,
          port: camera.port,
          username,
          password,
          channel_number: camera.channel_number,
          custom_rtsp_path: camera.custom_rtsp_path,
        });

        // Save new values to database
        camera.host = clientIp;
        camera.encrypted_rtsp = encryptText(newRtspUrl);
        await camera.save();

        // Push new stream route to MediaMTX immediately
        try {
          await mediamtxService.restartStream({
            streamKey: camera.stream_key,
            rtspUrl: newRtspUrl,
          });
          console.log(`Successfully updated MediaMTX stream path for camera: ${camera.camera_name}`);
        } catch (streamSyncError) {
          console.error(`Failed to push updated stream to MediaMTX for camera ${camera.id}:`, streamSyncError.message);
        }

        updatedCount++;
      }
    }

    return res.status(200).json({
      status: 'success',
      device_id,
      detected_ip: clientIp,
      location_name: location.location_name,
      cameras_checked: cameras.length,
      cameras_updated: updatedCount,
    });
  } catch (error) {
    console.error('Heartbeat processing failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
