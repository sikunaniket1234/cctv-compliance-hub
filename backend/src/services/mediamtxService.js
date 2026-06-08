const MEDIAMTX_BASE_URL = process.env.MEDIAMTX_BASE_URL || 'http://localhost:8889';
const MEDIAMTX_PUBLIC_URL = process.env.MEDIAMTX_PUBLIC_URL || 'http://localhost:8889';
const MEDIAMTX_STREAM_PREFIX = process.env.MEDIAMTX_STREAM_PREFIX || 'cam_';
const MEDIAMTX_API_URL = process.env.MEDIAMTX_API_URL || 'http://localhost:9997';

const createStream = async ({ streamKey, rtspUrl }) => {
  const streamId = `${MEDIAMTX_STREAM_PREFIX}${streamKey}`;
  const viewerUrl = `${MEDIAMTX_PUBLIC_URL}/${streamId}`;

  try {
    const response = await fetch(`${MEDIAMTX_API_URL}/v3/config/paths/add/${streamId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: rtspUrl,
        sourceOnDemand: true,
      }),
    });
    
    if (!response.ok && response.status !== 400) {
      const text = await response.text();
      console.warn(`MediaMTX createStream API returned status ${response.status}: ${text}`);
    }
  } catch (error) {
    console.error('Failed to register stream with MediaMTX API:', error.message);
  }

  return {
    streamId,
    viewerUrl,
    status: 'created',
  };
};

const deleteStream = async ({ streamKey }) => {
  const streamId = `${MEDIAMTX_STREAM_PREFIX}${streamKey}`;

  try {
    const response = await fetch(`${MEDIAMTX_API_URL}/v3/config/paths/delete/${streamId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      console.warn(`MediaMTX deleteStream API returned status ${response.status}: ${text}`);
    }
  } catch (error) {
    console.error('Failed to delete stream from MediaMTX API:', error.message);
  }

  return {
    streamId,
    status: 'deleted',
  };
};

const restartStream = async ({ streamKey, rtspUrl }) => {
  const streamId = `${MEDIAMTX_STREAM_PREFIX}${streamKey}`;

  try {
    await deleteStream({ streamKey });
    await createStream({ streamKey, rtspUrl });
  } catch (error) {
    console.error('Failed to restart stream:', error.message);
  }

  return {
    streamId,
    status: 'restarted',
  };
};

const checkStatus = async ({ streamKey }) => {
  const streamId = `${MEDIAMTX_STREAM_PREFIX}${streamKey}`;
  let status = 'offline';

  try {
    const response = await fetch(`${MEDIAMTX_API_URL}/v3/paths/list`);
    if (response.ok) {
      const data = await response.json();
      const pathData = data.items?.find((item) => item.name === streamId);
      if (pathData) {
        status = pathData.ready ? 'ready' : 'offline';
      }
    }
  } catch (error) {
    console.error('Failed to check stream status from MediaMTX API:', error.message);
  }

  return {
    streamId,
    status,
    updatedAt: new Date().toISOString(),
  };
};

module.exports = {
  createStream,
  deleteStream,
  restartStream,
  checkStatus,
};
