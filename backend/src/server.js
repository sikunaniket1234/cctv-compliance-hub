const app = require('./app');
const { sequelize } = require('./config/database');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await sequelize.authenticate();
    const syncOptions = { alter: true };
    await sequelize.sync(syncOptions);
    console.log('Database connected');

    // Register/Synchronize all active camera paths in MediaMTX
    try {
      const Camera = require('./models/camera');
      const { decryptText } = require('./controllers/cameraController');
      const mediamtxService = require('./services/mediamtxService');
      const cameras = await Camera.findAll();
      console.log(`Syncing ${cameras.length} cameras with MediaMTX...`);
      for (const camera of cameras) {
        const rtspUrl = decryptText(camera.encrypted_rtsp) || camera.rtsp_url;
        if (rtspUrl) {
          console.log(`Configuring MediaMTX stream path for: ${camera.camera_name} (${camera.stream_key})`);
          await mediamtxService.restartStream({ streamKey: camera.stream_key, rtspUrl });
        }
      }
      console.log('MediaMTX stream synchronization complete.');
    } catch (mtxError) {
      console.error('Failed to sync streams with MediaMTX on startup:', mtxError.message);
    }

    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

start();
