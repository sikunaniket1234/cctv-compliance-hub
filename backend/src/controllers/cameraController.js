const net = require('net');
const crypto = require('crypto');
const Camera = require('../models/camera');
const Location = require('../models/location');
const Organization = require('../models/organization');
const mediamtxService = require('../services/mediamtxService');

const ENCRYPTION_KEY = process.env.CAMERA_ENCRYPTION_KEY || 'default_camera_encryption_key_32bytes!';
const ENCRYPTION_KEY_BYTES = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

const encryptText = (value) => {
  if (value == null) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY_BYTES, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptText = (value) => {
  if (!value) return null;
  const [ivHex, encryptedHex] = String(value).split(':');
  if (!ivHex || !encryptedHex) return null;
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY_BYTES, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};

exports.encryptText = encryptText;
exports.decryptText = decryptText;

const parseRtspHost = (rtspUrl) => {
  try {
    const url = new URL(rtspUrl);
    const hostname = url.hostname;
    const port = url.port ? Number(url.port) : 554;
    const pathname = url.pathname || '/';
    const search = url.search || '';
    return { hostname, port, pathname, search, auth: { username: url.username, password: url.password } };
  } catch {
    return null;
  }
};

const buildAuthHeader = (auth) => {
  if (!auth || !auth.username) return null;
  const credentials = `${auth.username}:${auth.password || ''}`;
  return `Authorization: Basic ${Buffer.from(credentials, 'utf8').toString('base64')}`;
};

const parseAuthChallenge = (headerValue) => {
  if (!headerValue) return null;
  const challenge = {};
  const [scheme, ...rest] = headerValue.split(' ');
  challenge.scheme = scheme;
  const params = rest.join(' ').trim();
  const regex = /([a-zA-Z0-9]+)=("([^"]*)"|[^,\s]+)/g;
  let match;
  while ((match = regex.exec(params)) !== null) {
    challenge[match[1]] = match[3] || match[2];
  }
  return challenge;
};

const buildDigestHeader = ({ auth, method, uri, challenge }) => {
  if (!auth || !auth.username || !challenge || !challenge.realm || !challenge.nonce) return null;
  const ha1 = crypto.createHash('md5').update(`${auth.username}:${challenge.realm}:${auth.password || ''}`).digest('hex');
  const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
  let response;

  if (challenge.qop) {
    const qop = challenge.qop.split(',')[0].trim();
    const cnonce = crypto.randomBytes(8).toString('hex');
    const nc = '00000001';
    response = crypto.createHash('md5')
      .update(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
      .digest('hex');
    let header = `Authorization: Digest username="${auth.username}", realm="${challenge.realm}", nonce="${challenge.nonce}", uri="${uri}", response="${response}", algorithm=MD5, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
    if (challenge.opaque) {
      header += `, opaque="${challenge.opaque}"`;
    }
    return header;
  }

  response = crypto.createHash('md5').update(`${ha1}:${challenge.nonce}:${ha2}`).digest('hex');
  let header = `Authorization: Digest username="${auth.username}", realm="${challenge.realm}", nonce="${challenge.nonce}", uri="${uri}", response="${response}", algorithm=MD5`;
  if (challenge.opaque) {
    header += `, opaque="${challenge.opaque}"`;
  }
  return header;
};

const buildRtspUrl = ({ connection_method, rtsp_url, host, port, username, password, channel_number, custom_rtsp_path }) => {
  if (connection_method === 'rtsp') {
    if (!rtsp_url) throw new Error('RTSP URL is required for RTSP method');
    return rtsp_url;
  }

  if (!host) throw new Error('Host/IP address is required');
  const portValue = port || 554;
  const isIpv6 = host.includes(':') && !host.startsWith('[') && !host.endsWith(']');
  const formattedHost = isIpv6 ? `[${host}]` : host;
  const authPart = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password || '')}@` : '';
  const hostPort = `${formattedHost}:${portValue}`;

  if (connection_method === 'cp_dahua') {
    if (!channel_number) throw new Error('Channel number is required for CP Plus / Dahua');
    return `rtsp://${authPart}${hostPort}/cam/realmonitor?channel=${channel_number}&subtype=0`;
  }

  if (connection_method === 'hikvision') {
    if (!channel_number) throw new Error('Channel number is required for Hikvision');
    const channel = String(channel_number).padStart(2, '0');
    return `rtsp://${authPart}${hostPort}/Streaming/Channels/${channel}01`;
  }

  if (connection_method === 'generic') {
    if (!custom_rtsp_path) throw new Error('Custom RTSP path is required for Generic IP Camera');
    const path = custom_rtsp_path.startsWith('/') ? custom_rtsp_path : `/${custom_rtsp_path}`;
    return `rtsp://${authPart}${hostPort}${path}`;
  }

  throw new Error('Unsupported connection method');
};

exports.buildRtspUrl = buildRtspUrl;

const testConnection = async (rtspUrl, username, password) => {
  const target = parseRtspHost(rtspUrl);
  if (!target) {
    throw new Error('Invalid RTSP URL');
  }

  const auth = target.auth.username ? target.auth : username ? { username, password } : null;
  const method = 'OPTIONS';
  const cleanRtspUrl = `rtsp://${target.hostname}:${target.port}${target.pathname}${target.search}`;
  const authorizationHeader = buildAuthHeader(auth);
  const baseHeaders = ['CSeq: 1', 'User-Agent: CCTV-Compliance/1.0'];

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeoutMs = 7000;
    let buffer = '';
    let stage = 1;
    let challenge = null;
    let cseq = 1;

    const cleanup = () => {
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);

    const sendRequest = (headerValue) => {
      const headers = [...baseHeaders];
      const cseqIndex = headers.findIndex(h => h.startsWith('CSeq:'));
      if (cseqIndex !== -1) {
        headers[cseqIndex] = `CSeq: ${cseq}`;
      }
      if (headerValue) {
        headers.push(headerValue);
      }
      const requestMessage = `${method} ${cleanRtspUrl} RTSP/1.0\r\n${headers.join('\r\n')}\r\n\r\n`;
      socket.write(requestMessage);
    };

    socket.once('connect', () => {
      sendRequest(authorizationHeader);
    });

    socket.on('data', (data) => {
      buffer += data.toString('utf8');
      if (buffer.includes('\r\n\r\n')) {
        const responseText = buffer;
        buffer = '';

        if (stage === 1) {
          if (responseText.includes('RTSP/1.0 200')) {
            cleanup();
            resolve();
            return;
          }

          if (responseText.includes('RTSP/1.0 401') && auth) {
            const wwwAuthHeader = responseText.split('\r\n').find((line) => line.toLowerCase().startsWith('www-authenticate:'));
            const challengeValue = wwwAuthHeader ? wwwAuthHeader.split(/:\s*(.+)/)[1] : null;
            challenge = parseAuthChallenge(challengeValue);

            if (challenge && challenge.scheme && challenge.scheme.toLowerCase() === 'digest') {
              stage = 2;
              cseq += 1;
              const digestHeader = buildDigestHeader({ auth, method, uri: cleanRtspUrl, challenge });
              sendRequest(digestHeader);
              return;
            }
          }

          cleanup();
          reject(new Error('RTSP service responded with error or unauthorized'));
        } else if (stage === 2) {
          if (responseText.includes('RTSP/1.0 200')) {
            cleanup();
            resolve();
            return;
          }

          if (responseText.includes('RTSP/1.0 401')) {
            const wwwAuthHeader = responseText.split('\r\n').find((line) => line.toLowerCase().startsWith('www-authenticate:'));
            const challengeValue = wwwAuthHeader ? wwwAuthHeader.split(/:\s*(.+)/)[1] : null;
            const newChallenge = parseAuthChallenge(challengeValue);

            if (newChallenge && newChallenge.scheme && newChallenge.scheme.toLowerCase() === 'digest') {
              stage = 3;
              cseq += 1;
              const pathUri = `${target.pathname}${target.search}`;
              const digestHeader = buildDigestHeader({ auth, method, uri: pathUri, challenge: newChallenge });
              sendRequest(digestHeader);
              return;
            }
          }

          cleanup();
          reject(new Error('RTSP authentication failed'));
        } else if (stage === 3) {
          if (responseText.includes('RTSP/1.0 200')) {
            cleanup();
            resolve();
            return;
          }
          cleanup();
          reject(new Error('RTSP authentication failed'));
        }
      }
    });

    socket.once('timeout', () => {
      cleanup();
      reject(new Error('Connection timed out'));
    });

    socket.once('error', (error) => {
      cleanup();
      reject(error);
    });

    socket.connect({ host: target.hostname, port: target.port });
  });
};

const dnsPromises = require('dns').promises;

const testConnectionDetailed = async (rtspUrl, username, password) => {
  const trace = [];
  
  // 1. Parse RTSP Host
  trace.push({ step: '1. Parse RTSP Address', status: 'pending', detail: 'Parsing RTSP connection string' });
  const target = parseRtspHost(rtspUrl);
  if (!target) {
    trace[0].status = 'failed';
    trace[0].detail = `Invalid RTSP URL format: "${rtspUrl}"`;
    return { ok: false, error: 'Invalid RTSP URL format', trace };
  }
  trace[0].status = 'success';
  trace[0].detail = `RTSP URL parsed. Target hostname: "${target.hostname}", Port: ${target.port}`;

  // 2. DNS Resolution
  trace.push({ step: '2. Domain DNS Resolution', status: 'pending', detail: `Resolving DNS for "${target.hostname}"` });
  let resolvedIp = target.hostname;
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (!ipRegex.test(target.hostname)) {
    try {
      const startDns = Date.now();
      const addresses = await dnsPromises.resolve4(target.hostname);
      resolvedIp = addresses[0];
      const dnsDuration = Date.now() - startDns;
      trace[1].status = 'success';
      trace[1].detail = `Resolved host to IP: ${resolvedIp} (Lookup duration: ${dnsDuration}ms)`;
    } catch (dnsErr) {
      trace[1].status = 'failed';
      trace[1].detail = `DNS resolution failed: ${dnsErr.code || dnsErr.message}. Verify domain spelling or DDNS client status.`;
      return { ok: false, error: 'DNS resolution failed', trace };
    }
  } else {
    trace[1].status = 'success';
    trace[1].detail = `Host is direct IP address: ${resolvedIp}`;
  }

  // 3. TCP Socket Connection
  trace.push({ step: '3. TCP Socket Port Connection', status: 'pending', detail: `Connecting TCP socket to ${resolvedIp}:${target.port}` });
  
  const auth = target.auth.username ? target.auth : username ? { username, password } : null;
  const method = 'OPTIONS';
  const cleanRtspUrl = `rtsp://${target.hostname}:${target.port}${target.pathname}${target.search}`;
  const authorizationHeader = buildAuthHeader(auth);
  const baseHeaders = ['CSeq: 1', 'User-Agent: CCTV-Compliance/1.0'];

  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeoutMs = 6000;
    let buffer = '';
    let stage = 1;
    let challenge = null;
    let cseq = 1;

    const cleanup = () => {
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);

    const sendRequest = (headerValue) => {
      const headers = [...baseHeaders];
      const cseqIndex = headers.findIndex(h => h.startsWith('CSeq:'));
      if (cseqIndex !== -1) {
        headers[cseqIndex] = `CSeq: ${cseq}`;
      }
      if (headerValue) {
        headers.push(headerValue);
      }
      const requestMessage = `${method} ${cleanRtspUrl} RTSP/1.0\r\n${headers.join('\r\n')}\r\n\r\n`;
      socket.write(requestMessage);
    };

    socket.once('connect', () => {
      trace[2].status = 'success';
      trace[2].detail = `TCP handshake successful. Connected to ${resolvedIp}:${target.port}`;
      
      // 4. RTSP Handshake
      trace.push({ step: '4. RTSP Connection Options Handshake', status: 'pending', detail: 'Sending RTSP OPTIONS request...' });
      sendRequest(authorizationHeader);
    });

    socket.on('data', (data) => {
      buffer += data.toString('utf8');
      if (buffer.includes('\r\n\r\n')) {
        const responseText = buffer;
        buffer = '';

        const currentTraceIndex = trace.findIndex(t => t.step.startsWith('4. RTSP'));
        const responseStatusLine = responseText.split('\r\n')[0] || '';

        if (stage === 1) {
          if (responseText.includes('RTSP/1.0 200')) {
            cleanup();
            trace[currentTraceIndex].status = 'success';
            trace[currentTraceIndex].detail = `RTSP OPTIONS returned success: "${responseStatusLine}"`;
            resolve({ ok: true, trace });
            return;
          }

          if (responseText.includes('RTSP/1.0 401')) {
            trace[currentTraceIndex].status = 'success';
            trace[currentTraceIndex].detail = `RTSP service requested authorization: "${responseStatusLine}"`;
            
            // 5. Auth challenge resolution
            trace.push({ step: '5. Camera Authentication Credentials Check', status: 'pending', detail: 'Processing auth challenge...' });
            const authTraceIndex = trace.findIndex(t => t.step.startsWith('5. Camera'));

            if (!auth) {
              cleanup();
              trace[authTraceIndex].status = 'failed';
              trace[authTraceIndex].detail = 'Camera requires authentication but no username or password was provided.';
              resolve({ ok: false, error: 'Unauthorized', trace });
              return;
            }

            const wwwAuthHeader = responseText.split('\r\n').find((line) => line.toLowerCase().startsWith('www-authenticate:'));
            const challengeValue = wwwAuthHeader ? wwwAuthHeader.split(/:\s*(.+)/)[1] : null;
            challenge = parseAuthChallenge(challengeValue);

            if (challenge && challenge.scheme && challenge.scheme.toLowerCase() === 'digest') {
              stage = 2;
              cseq += 1;
              const digestHeader = buildDigestHeader({ auth, method, uri: cleanRtspUrl, challenge });
              trace[authTraceIndex].detail = `Sending Digest credentials (Realm: ${challenge.realm})`;
              sendRequest(digestHeader);
              return;
            } else {
              stage = 2;
              cseq += 1;
              const basicHeader = buildAuthHeader(auth);
              trace[authTraceIndex].detail = 'Sending Basic credentials';
              sendRequest(basicHeader);
              return;
            }
          }

          cleanup();
          trace[currentTraceIndex].status = 'failed';
          trace[currentTraceIndex].detail = `RTSP handshake error: Server returned: "${responseStatusLine}"`;
          resolve({ ok: false, error: `Handshake failed: ${responseStatusLine}`, trace });
        } else if (stage === 2) {
          const authTraceIndex = trace.findIndex(t => t.step.startsWith('5. Camera'));
          if (responseText.includes('RTSP/1.0 200')) {
            cleanup();
            trace[authTraceIndex].status = 'success';
            trace[authTraceIndex].detail = `Authentication successful. Server returned "${responseStatusLine}"`;
            resolve({ ok: true, trace });
            return;
          }

          if (responseText.includes('RTSP/1.0 401')) {
            const wwwAuthHeader = responseText.split('\r\n').find((line) => line.toLowerCase().startsWith('www-authenticate:'));
            const challengeValue = wwwAuthHeader ? wwwAuthHeader.split(/:\s*(.+)/)[1] : null;
            const newChallenge = parseAuthChallenge(challengeValue);

            if (newChallenge && newChallenge.scheme && newChallenge.scheme.toLowerCase() === 'digest') {
              stage = 3;
              cseq += 1;
              const pathUri = `${target.pathname}${target.search}`;
              const digestHeader = buildDigestHeader({ auth, method, uri: pathUri, challenge: newChallenge });
              trace[authTraceIndex].detail = `Sending secondary Digest credentials to path URI: "${pathUri}"`;
              sendRequest(digestHeader);
              return;
            }
          }

          cleanup();
          trace[authTraceIndex].status = 'failed';
          trace[authTraceIndex].detail = `Credentials rejected. Server returned: "${responseStatusLine}"`;
          resolve({ ok: false, error: 'Unauthorized (Invalid credentials)', trace });
        } else if (stage === 3) {
          const authTraceIndex = trace.findIndex(t => t.step.startsWith('5. Camera'));
          if (responseText.includes('RTSP/1.0 200')) {
            cleanup();
            trace[authTraceIndex].status = 'success';
            trace[authTraceIndex].detail = `Authentication successful. Server returned "${responseStatusLine}"`;
            resolve({ ok: true, trace });
            return;
          }
          cleanup();
          trace[authTraceIndex].status = 'failed';
          trace[authTraceIndex].detail = `Credentials rejected on secondary check. Server returned: "${responseStatusLine}"`;
          resolve({ ok: false, error: 'Unauthorized (Invalid credentials)', trace });
        }
      }
    });

    socket.once('timeout', () => {
      cleanup();
      trace[2].status = 'failed';
      trace[2].detail = 'TCP connection timed out after 6000ms. Host might be offline or port is closed.';
      resolve({ ok: false, error: 'TCP Connection Timeout', trace });
    });

    socket.once('error', (err) => {
      cleanup();
      trace[2].status = 'failed';
      trace[2].detail = `TCP connection failed: ${err.message}. Verify target IP/DDNS spelling and port forwarding.`;
      resolve({ ok: false, error: err.message, trace });
    });

    socket.connect({ host: target.hostname, port: target.port });
  });
};

exports.createCamera = async (req, res) => {
  try {
    const {
      camera_name,
      connection_method,
      rtsp_url,
      host,
      port,
      username,
      password,
      channel_number,
      custom_rtsp_path,
      location_id,
    } = req.body;

    if (!camera_name || !connection_method || !location_id) {
      return res.status(400).json({ error: 'Camera name, connection method, and location are required' });
    }

    const rtspUrl = buildRtspUrl({ connection_method, rtsp_url, host, port, username, password, channel_number, custom_rtsp_path });

    const locationQuery = { id: location_id };
    if (req.role !== 'admin') {
      locationQuery.organization_id = req.organizationId;
    }
    const location = await Location.findOne({ where: locationQuery });
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    await testConnection(rtspUrl, username, password);

    const stream_key = crypto.randomBytes(12).toString('hex');
    const createdStream = await mediamtxService.createStream({ streamKey: stream_key, rtspUrl });
    const stream_status = createdStream.status || 'created';
    const viewer_url = createdStream.viewerUrl;

    const camera = await Camera.create({
      location_id,
      camera_name,
      connection_method,
      host,
      port: port || 554,
      channel_number,
      custom_rtsp_path,
      encrypted_rtsp: encryptText(rtspUrl),
      encrypted_username: encryptText(username),
      encrypted_password: encryptText(password),
      stream_key,
      viewer_url,
      stream_status,
      last_checked_at: new Date(),
      is_public: true,
    });

    const safeCamera = camera.toJSON();
    delete safeCamera.encrypted_rtsp;
    delete safeCamera.encrypted_username;
    delete safeCamera.encrypted_password;

    return res.status(201).json({ camera: safeCamera });
  } catch (error) {
    console.error('Create camera failed:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

exports.listCameras = async (req, res) => {
  try {
    const includeQuery = {
      model: Location,
      attributes: ['id', 'location_name', 'organization_id'],
    };

    if (req.role === 'admin') {
      includeQuery.include = [{ model: Organization, attributes: ['id', 'name', 'email'] }];
    } else {
      includeQuery.where = { organization_id: req.organizationId };
    }

    const cameras = await Camera.findAll({
      include: [includeQuery],
      order: [['createdAt', 'DESC']],
    });

    const safeCameras = cameras.map((camera) => {
      const cameraJson = camera.toJSON();
      delete cameraJson.encrypted_rtsp;
      delete cameraJson.encrypted_username;
      delete cameraJson.encrypted_password;
      return cameraJson;
    });

    return res.json({ cameras: safeCameras });
  } catch (error) {
    console.error('List cameras failed:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.testCamera = async (req, res) => {
  try {
    const {
      connection_method,
      rtsp_url,
      host,
      port,
      username,
      password,
      channel_number,
      custom_rtsp_path,
    } = req.body;

    console.log('Test camera request - body:', req.body);
    if (!connection_method) {
      return res.status(400).json({ error: 'Connection method is required' });
    }

    const rtspUrl = buildRtspUrl({ connection_method, rtsp_url, host, port, username, password, channel_number, custom_rtsp_path });
    const result = await testConnectionDetailed(rtspUrl, username, password);
    return res.json(result);
  } catch (error) {
    console.error('Camera test failed:', error);
    return res.status(400).json({ ok: false, error: error.message || 'Unable to connect' });
  }
};

exports.discoverChannels = async (req, res) => {
  try {
    const {
      connection_method,
      host,
      port,
      username,
      password,
      max_channels = 4,
    } = req.body;

    if (!connection_method) {
      return res.status(400).json({ error: 'Connection method is required' });
    }

    if (connection_method !== 'cp_dahua') {
      return res.status(400).json({ error: 'Channel discovery currently supports CP Plus / Dahua only' });
    }

    if (!host) {
      return res.status(400).json({ error: 'Host is required for discovery' });
    }

    const channelCount = Number(max_channels) || 4;
    const results = [];

    for (let channel = 1; channel <= channelCount; channel += 1) {
      const rtspUrl = buildRtspUrl({
        connection_method,
        host,
        port,
        username,
        password,
        channel_number: channel,
      });

      try {
        await testConnection(rtspUrl, username, password);
        results.push({ channel, online: true });
      } catch (error) {
        results.push({ channel, online: false });
      }
    }

    return res.json({ channels: results });
  } catch (error) {
    console.error('Discover channels failed:', error);
    return res.status(500).json({ error: 'Unable to discover channels' });
  }
};

exports.testSavedCamera = async (req, res) => {
  try {
    const { id } = req.params;
    const camera = await Camera.findOne({ where: { id } });
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    if (req.role !== 'admin') {
      const location = await Location.findOne({ where: { id: camera.location_id, organization_id: req.organizationId } });
      if (!location) {
        return res.status(403).json({ error: 'Unauthorized camera' });
      }
    }

    const rtspUrl = decryptText(camera.encrypted_rtsp) || camera.rtsp_url;
    const username = decryptText(camera.encrypted_username) || camera.username;
    const password = decryptText(camera.encrypted_password) || camera.password;

    const result = await testConnectionDetailed(rtspUrl, username, password);
    return res.json(result);
  } catch (error) {
    console.error('Saved camera test failed:', error);
    return res.status(400).json({ ok: false, error: error.message || 'Unable to connect' });
  }
};

exports.getCameraByStreamKey = async (req, res) => {
  try {
    const { streamKey } = req.params;
    const camera = await Camera.findOne({
      where: { stream_key: streamKey },
      include: [{ model: Location, attributes: ['location_name', 'address', 'city', 'state', 'pincode'] }],
    });

    if (!camera) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    return res.json({
      camera: {
        id: camera.id,
        camera_name: camera.camera_name,
        stream_key: camera.stream_key,
        viewer_url: camera.viewer_url,
        stream_status: camera.stream_status,
        Location: camera.Location,
      },
    });
  } catch (error) {
    console.error('Get public camera failed:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getPublicLocationCameras = async (req, res) => {
  try {
    const { locationId } = req.params;
    const location = await Location.findOne({
      where: { id: locationId },
      attributes: ['location_name', 'address', 'city', 'state', 'pincode'],
      include: [{ model: Organization, attributes: ['name', 'registration_number'] }],
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const cameras = await Camera.findAll({
      where: { location_id: locationId },
      attributes: ['id', 'camera_name', 'stream_key', 'viewer_url', 'stream_status']
    });

    return res.json({ location, cameras });
  } catch (error) {
    console.error('Get public location cameras failed:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.dnsLookup = async (req, res) => {
  try {
    const { id } = req.params;
    const camera = await Camera.findByPk(id, {
      include: [{ model: Location, attributes: ['organization_id'] }],
    });

    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    if (req.role !== 'admin' && camera.Location?.organization_id !== req.organizationId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const host = camera.host;
    if (!host) {
      if (camera.connection_method === 'rtsp' && camera.encrypted_rtsp) {
        const rtspUrl = decryptText(camera.encrypted_rtsp);
        const parsed = parseRtspHost(rtspUrl);
        if (parsed && parsed.hostname) {
          return await doLookup(parsed.hostname, res);
        }
      }
      return res.status(400).json({ error: 'No host/domain configured for this camera' });
    }

    return await doLookup(host, res);
  } catch (error) {
    console.error('DNS lookup failed:', error);
    return res.status(500).json({ error: 'Server error during resolution' });
  }
};

async function doLookup(host, res) {
  const dns = require('dns').promises;
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (ipRegex.test(host)) {
    return res.json({
      host,
      isIp: true,
      resolvedIp: host,
      status: 'Raw IP address (Direct routing)',
    });
  }

  try {
    const start = Date.now();
    const addresses = await dns.resolve4(host);
    const latency = Date.now() - start;
    return res.json({
      host,
      isIp: false,
      resolvedIp: addresses[0],
      allIps: addresses,
      status: 'Domain resolved successfully',
      latencyMs: latency,
    });
  } catch (err) {
    return res.json({
      host,
      isIp: false,
      resolvedIp: null,
      status: `Resolution fault: ${err.code || err.message}`,
      latencyMs: null,
    });
  }
}
