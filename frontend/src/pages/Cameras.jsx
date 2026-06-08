import { useEffect, useState } from 'react';

function Cameras() {
  const [locations, setLocations] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [selectedNgoId, setSelectedNgoId] = useState('');
  
  const [form, setForm] = useState({
    camera_name: '',
    connection_method: 'cp_dahua',
    rtsp_url: '',
    host: '',
    port: 554,
    username: '',
    password: '',
    channel_number: '',
    custom_rtsp_path: '',
    location_id: '',
  });

  const [dnsResolutions, setDnsResolutions] = useState({});
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [discovering, setDiscovering] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalTrace, setModalTrace] = useState([]);
  const [modalSuccess, setModalSuccess] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalTesting, setModalTesting] = useState(false);

  const handleDnsLookup = async (cameraId) => {
    try {
      setDnsResolutions((prev) => ({ ...prev, [cameraId]: { loading: true } }));
      const response = await fetch(`/api/cameras/${cameraId}/dns-lookup`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setDnsResolutions((prev) => ({
          ...prev,
          [cameraId]: {
            loading: false,
            resolvedIp: data.resolvedIp,
            status: data.status,
            latencyMs: data.latencyMs,
            isIp: data.isIp,
          },
        }));
      } else {
        setDnsResolutions((prev) => ({
          ...prev,
          [cameraId]: {
            loading: false,
            error: data.error || 'Lookup failed',
          },
        }));
      }
    } catch (err) {
      setDnsResolutions((prev) => ({
        ...prev,
        [cameraId]: {
          loading: false,
          error: 'Connection failed',
        },
      }));
    }
  };
  const [discoveredChannels, setDiscoveredChannels] = useState([]);
  const [copyToast, setCopyToast] = useState(null);

  const token = localStorage.getItem('authToken');
  const role = localStorage.getItem('userRole');

  if (!token) {
    window.location.href = '/login';
  }

  const loadData = async () => {
    try {
      const [locationsRes, camerasRes] = await Promise.all([
        fetch('/api/locations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/cameras', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const locationsData = await locationsRes.json();
      const camerasData = await camerasRes.json();

      if (locationsRes.ok) {
        setLocations(locationsData.locations || []);
      }
      if (camerasRes.ok) {
        setCameras(camerasData.cameras || []);
      }
      if (!locationsRes.ok) {
        setError(locationsData.error || 'Unable to load locations');
      }
      if (!camerasRes.ok) {
        setError(camerasData.error || 'Unable to load cameras');
      }
    } catch (err) {
      setError('Connection failed');
    }
  };

  const loadNgos = async () => {
    if (role !== 'admin') return;
    try {
      const response = await fetch('/api/ngos', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (response.ok) {
        setNgos(data.organizations || []);
      }
    } catch (err) {
      console.error('Failed to load NGOs:', err);
    }
  };

  useEffect(() => {
    loadData();
    loadNgos();
  }, [role]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'connection_method') {
      setDiscoveredChannels([]);
      setTestResult(null);
      setMessage(null);
      setError(null);
    }
  };

  const handleNgoChange = (event) => {
    const value = event.target.value;
    setSelectedNgoId(value);
    setForm(prev => ({ ...prev, location_id: '' })); // reset location selection when NGO changes
  };

  // Filter locations list based on NGO selection (only for admin)
  const filteredLocations = role === 'admin' && selectedNgoId
    ? locations.filter(loc => loc.organization_id === Number(selectedNgoId))
    : locations;

  const handleDiscover = async () => {
    setError(null);
    setMessage(null);
    setTestResult(null);
    setDiscoveredChannels([]);
    setDiscovering(true);

    try {
      const response = await fetch('/api/cameras/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          connection_method: form.connection_method,
          host: form.host,
          port: form.port,
          username: form.username,
          password: form.password,
          max_channels: 4,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to discover channels');
      } else {
        setDiscoveredChannels(data.channels || []);
      }
    } catch (err) {
      setError(err.message || 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  const handleTest = async () => {
    setError(null);
    setMessage(null);
    setTestResult(null);

    setModalTitle(`Testing Connection: ${form.camera_name || 'New Camera'}`);
    setModalOpen(true);
    setModalTesting(true);
    setModalTrace([]);
    setModalSuccess(false);
    setModalError(null);

    try {
      const response = await fetch('/api/cameras/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      setModalTesting(false);
      setModalTrace(data.trace || []);
      setModalSuccess(data.ok);
      if (!data.ok) {
        setModalError(data.error || 'Connection attempt failed.');
      }
    } catch (err) {
      setModalTesting(false);
      setModalError(err.message || 'Network communication failure.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setTestResult(null);

    const response = await fetch('/api/cameras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Unable to save camera');
      return;
    }

    setMessage('Camera added successfully.');
    setForm({
      camera_name: '',
      connection_method: 'cp_dahua',
      rtsp_url: '',
      host: '',
      port: 554,
      username: '',
      password: '',
      channel_number: '',
      custom_rtsp_path: '',
      location_id: '',
    });
    setSelectedNgoId('');
    setDiscoveredChannels([]);
    loadData();
  };

  const handleAddAllOnline = async () => {
    setMessage(null);
    setError(null);
    setTestResult(null);

    if (!form.location_id) {
      setError('Please select a location first');
      return;
    }

    const onlineChannels = discoveredChannels.filter((c) => c.online);
    if (onlineChannels.length === 0) {
      setError('No online channels discovered to add');
      return;
    }

    let addedCount = 0;
    let failedCount = 0;

    for (const ch of onlineChannels) {
      const payload = {
        ...form,
        camera_name: `${form.camera_name || 'Camera'} - Ch ${ch.channel}`,
        channel_number: String(ch.channel),
      };

      try {
        const response = await fetch('/api/cameras', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (response.ok) {
          addedCount += 1;
        } else {
          failedCount += 1;
        }
      } catch (err) {
        failedCount += 1;
      }
    }

    setDiscoveredChannels([]);
    loadData();
    if (failedCount > 0) {
      setError(`Added ${addedCount} channels. Failed to add ${failedCount} channels.`);
    } else {
      setMessage(`Successfully added all ${addedCount} online channels.`);
    }
  };

  const handleSavedCameraTest = async (camera) => {
    setError(null);
    setMessage(null);
    setTestResult(null);

    setModalTitle(`Testing Saved Camera: ${camera.camera_name}`);
    setModalOpen(true);
    setModalTesting(true);
    setModalTrace([]);
    setModalSuccess(false);
    setModalError(null);

    try {
      const response = await fetch(`/api/cameras/${camera.id}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setModalTesting(false);
      setModalTrace(data.trace || []);
      setModalSuccess(data.ok);
      if (!data.ok) {
        setModalError(data.error || 'Connection attempt failed.');
      }
    } catch (err) {
      setModalTesting(false);
      setModalError(err.message || 'Network communication failure.');
    }
  };

  const handleCopyLink = (camera) => {
    const link = `${window.location.origin}/view/location/${camera.location_id}`;
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopyToast(`Copied e-Anudhan Compliance Link for ${camera.Location?.location_name || 'Location'}!`);
        setTimeout(() => setCopyToast(null), 3000);
      })
      .catch(() => {
        setError('Failed to copy to clipboard.');
      });
  };

  return (
    <main className="page-container cameras-page">
      {copyToast && (
        <div className="copy-toast-banner">
          <span>✓ {copyToast}</span>
        </div>
      )}

      <section className="card wide-card">
        <header className="page-header">
          <div>
            <h1>Surveillance Cameras</h1>
            <p>Configure DVR channels, execute discovery tests, and manage shareable streams.</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="classic-form split-form">
          <div>
            <label>
              Camera Preview Name
              <input
                name="camera_name"
                value={form.camera_name}
                onChange={handleChange}
                required
                placeholder="Main Gate, Dormitory, Kitchen"
              />
            </label>
            <label>
              Connection Method
              <select name="connection_method" value={form.connection_method} onChange={handleChange} required>
                <option value="cp_dahua">CP Plus / Dahua</option>
                <option value="hikvision">Hikvision</option>
                <option value="generic">Generic IP Camera</option>
                <option value="rtsp">Advanced RTSP</option>
              </select>
            </label>
            {(form.connection_method !== 'rtsp') && (
              <>
                <label>
                  Host / IP / DDNS Domain
                  <input name="host" value={form.host} onChange={handleChange} required placeholder="e.g. myngo.ddns.net or 192.168.29.39" />
                  <span className="input-subnote">Supports static/local IPs and Dynamic DNS domain addresses.</span>
                </label>
                <label>
                  Port
                  <input type="number" name="port" value={form.port} onChange={handleChange} required />
                </label>
                <label>
                  Username
                  <input name="username" value={form.username} onChange={handleChange} placeholder="admin" />
                </label>
                <label>
                  Password
                  <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" />
                </label>
                <label>
                  Channel Number
                  <input
                    name="channel_number"
                    value={form.channel_number}
                    onChange={handleChange}
                    placeholder="1"
                  />
                </label>
                {form.connection_method === 'cp_dahua' && (
                  <button type="button" className="btn btn-secondary" style={{ marginBottom: '15px' }} onClick={handleDiscover} disabled={discovering || !form.host}>
                    {discovering ? 'Discovering…' : 'Discover Channels'}
                  </button>
                )}
                <label>
                  Custom RTSP Path (Optional)
                  <input
                    name="custom_rtsp_path"
                    value={form.custom_rtsp_path}
                    onChange={handleChange}
                    placeholder="/cam/realmonitor?channel=1&subtype=0"
                  />
                </label>
              </>
            )}
            {form.connection_method === 'rtsp' && (
              <label>
                RTSP URL
                <input
                  name="rtsp_url"
                  value={form.rtsp_url}
                  onChange={handleChange}
                  required
                  placeholder="rtsp://admin:password@host:554/path"
                />
              </label>
            )}

            {discoveredChannels.length > 0 && (
              <div className="discover-results card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0 }}>Discovered Channels</h4>
                  {discoveredChannels.some((c) => c.online) && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddAllOnline}
                    >
                      Add All Online Channels
                    </button>
                  )}
                </div>
                <ul className="channel-scan-list">
                  {discoveredChannels.map((channel) => (
                    <li key={channel.channel} className={channel.online ? 'ch-online' : 'ch-offline'}>
                      <span className="status-indicator"></span>
                      <span>Channel {channel.channel} ({channel.online ? 'Online' : 'Offline'})</span>
                      {channel.online && (
                        <button
                          type="button"
                          className="btn btn-link btn-sm"
                          onClick={() => setForm((prev) => ({ ...prev, channel_number: String(channel.channel) }))}
                        >
                          Use
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            {role === 'admin' && (
              <label>
                NGO / Organization
                <select name="ngo_id" value={selectedNgoId} onChange={handleNgoChange} required>
                  <option value="">Select NGO...</option>
                  {ngos.map((ngo) => (
                    <option key={ngo.id} value={ngo.id}>
                      {ngo.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Assign Location
              <select name="location_id" value={form.location_id} onChange={handleChange} required>
                <option value="">Select Location...</option>
                {filteredLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.location_name} {role === 'admin' ? `(${location.Organization?.name || 'Unknown'})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="button-row" style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={handleTest}>Test Connection</button>
              <button type="submit" className="btn btn-primary">Save Camera</button>
            </div>
          </div>
        </form>

        {message && <p className="alert alert-success">{message}</p>}
        {testResult && <p className="alert alert-success">{testResult}</p>}
        {error && <p className="alert alert-error">{error}</p>}

        <div className="table-wrapper">
          <table className="classic-table">
            <thead>
              <tr>
                {role === 'admin' && <th>NGO</th>}
                <th>Camera</th>
                <th>Location</th>
                <th>Status</th>
                <th>compliance Grid</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cameras.length === 0 ? (
                <tr>
                  <td colSpan={role === 'admin' ? 6 : 5} className="empty-state">No cameras configured yet.</td>
                </tr>
              ) : (
                cameras.map((camera) => (
                  <tr key={camera.id}>
                    {role === 'admin' && <td><strong>{camera.Location?.Organization?.name || 'Unknown'}</strong></td>}
                    <td>
                      <strong>{camera.camera_name}</strong>
                      <div className="camera-host-subtext">
                        <code>{camera.host || 'RTSP URL'}</code>
                        {dnsResolutions[camera.id] ? (
                          <span className={`dns-res-badge ${dnsResolutions[camera.id].error ? 'dns-error' : 'dns-success'}`}>
                            {dnsResolutions[camera.id].loading ? (
                              ' Resolving...'
                            ) : dnsResolutions[camera.id].error ? (
                              ` 🔴 ${dnsResolutions[camera.id].error}`
                            ) : (
                              ` 🟢 IP: ${dnsResolutions[camera.id].resolvedIp} (${dnsResolutions[camera.id].latencyMs ? `${dnsResolutions[camera.id].latencyMs}ms` : 'Direct'})`
                            )}
                          </span>
                        ) : (
                          (camera.host || camera.connection_method === 'rtsp') && (
                            <button
                              type="button"
                              className="dns-resolve-small-btn"
                              onClick={() => handleDnsLookup(camera.id)}
                            >
                              🔍 Resolve DNS
                            </button>
                          )
                        )}
                      </div>
                    </td>
                    <td>{camera.Location?.location_name || 'Unknown'}</td>
                    <td>
                      <span className={`status-badge-inline ${camera.stream_status === 'ready' || camera.stream_status === 'created' || camera.stream_status === 'seeded' ? 'online' : 'offline'}`}>
                        {camera.stream_status || 'unknown'}
                      </span>
                    </td>
                    <td>
                      {camera.location_id ? (
                        <a href={`/view/location/${camera.location_id}`} target="_blank" rel="noreferrer" className="table-link">
                          Open Viewer Grid
                        </a>
                      ) : (
                        'Not available'
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleSavedCameraTest(camera)}>
                          Test
                        </button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => handleCopyLink(camera)}>
                          Copy e-Anudhan Link
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Connection Fault Diagnostics Modal */}
      {modalOpen && (
        <div className="diag-modal-overlay">
          <div className="diag-modal-card">
            <header className="diag-modal-header">
              <h2>{modalTitle}</h2>
              <button type="button" className="diag-modal-close" onClick={() => setModalOpen(false)}>×</button>
            </header>

            <div className="diag-modal-body">
              {modalTesting && (
                <div className="diag-modal-loading">
                  <span className="spinner-small"></span>
                  <span>Executing connection route diagnostics...</span>
                </div>
              )}

              {modalTrace.length > 0 && (
                <div className="diag-trace-list">
                  {modalTrace.map((t, idx) => (
                    <div key={idx} className={`diag-trace-item diag-${t.status}`}>
                      <div className="diag-trace-header">
                        <span className="diag-icon">
                          {t.status === 'success' ? '✓' : t.status === 'failed' ? '✗' : '⏳'}
                        </span>
                        <strong>{t.step}</strong>
                      </div>
                      <p className="diag-trace-detail">{t.detail}</p>
                    </div>
                  ))}
                </div>
              )}

              {!modalTesting && modalSuccess && (
                <div className="diag-summary diag-summary-success">
                  <h4>✓ CONNECTION SUCCESSFUL</h4>
                  <p>The RTSP stream response trace verified that the camera credentials and routes are fully operational.</p>
                </div>
              )}

              {!modalTesting && !modalSuccess && modalError && (
                <div className="diag-summary diag-summary-error">
                  <h4>✗ FAULT DIAGNOSTICS DETECTED</h4>
                  <p className="error-reason"><strong>Reason:</strong> {modalError}</p>
                  <p className="error-advice">
                    <strong>Triage Steps:</strong>
                    <ul>
                      <li>Verify the device host domain or static WAN IP spelling.</li>
                      <li>Double check that the RTSP server port (typically 554) is forwarded correctly in your router.</li>
                      <li>Confirm that the username and password match your camera's administrative settings.</li>
                    </ul>
                  </p>
                </div>
              )}
            </div>

            <footer className="diag-modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Close Diagnostics</button>
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}

export default Cameras;
