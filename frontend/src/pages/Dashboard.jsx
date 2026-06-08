import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function Dashboard() {
  const [locations, setLocations] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [reports, setReports] = useState(null);
  const [selectedNgoId, setSelectedNgoId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const role = localStorage.getItem('userRole');

  const token = localStorage.getItem('authToken');

  const loadData = async () => {
    try {
      const fetchPromises = [
        fetch('/api/locations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/cameras', { headers: { Authorization: `Bearer ${token}` } }),
      ];

      if (role === 'admin') {
        fetchPromises.push(
          fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${token}` } })
        );
      }

      const responses = await Promise.all(fetchPromises);
      const locationsRes = responses[0];
      const camerasRes = responses[1];
      
      const locationsData = await locationsRes.json();
      const camerasData = await camerasRes.json();

      if (locationsRes.ok) {
        setLocations(locationsData.locations || []);
      }
      if (camerasRes.ok) {
        setCameras(camerasData.cameras || []);
      }

      if (role === 'admin' && responses[2]) {
        const reportsRes = responses[2];
        const reportsData = await reportsRes.json();
        if (reportsRes.ok) {
          setReports(reportsData);
        }
      }
      
      if (!locationsRes.ok || !camerasRes.ok) {
        setError(locationsData.error || camerasData.error || 'Unable to load dashboard data');
      }
    } catch (err) {
      setError('Connection failed. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
      return;
    }
    loadData();
  }, [role, token]);

  // Calculations for general users
  const totalLocations = locations.length;
  const totalCameras = cameras.length;
  const onlineCamerasCount = cameras.filter(cam => cam.stream_status === 'ready' || cam.stream_status === 'created' || cam.stream_status === 'seeded').length;
  const offlineCamerasCount = totalCameras - onlineCamerasCount;

  // Filter cameras dynamically for admin NGO view selection
  const filteredCameras = role === 'admin'
    ? (selectedNgoId ? cameras.filter(cam => cam.Location?.organization_id === Number(selectedNgoId)) : [])
    : cameras;

  const selectedNgoName = role === 'admin' && selectedNgoId
    ? reports?.ngoReports?.find(ngo => ngo.id === Number(selectedNgoId))?.name
    : null;

  return (
    <main className="page-container dashboard-page">
      <section className="card wide-card dashboard-card">
        <header className="page-header">
          <div>
            <h1>CCTV Command Center {role === 'admin' ? '(Super Admin Console)' : ''}</h1>
            <p>Real-time system health, compliance status, and camera feed matrix.</p>
          </div>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        
        {loading ? (
          <p className="empty-state">Loading CCTV dashboard metrics...</p>
        ) : (
          <>
            {/* ADMIN DASHBOARD VIEW */}
            {role === 'admin' && reports && (
              <>
                {/* 1. Global Reports Counters */}
                <div className="stats-grid">
                  <div className="stats-card">
                    <h3>Registered NGOs</h3>
                    <p className="stats-number">{reports.ngoReports?.length || 0}</p>
                  </div>
                  <div className="stats-card">
                    <h3>Global Locations</h3>
                    <p className="stats-number">
                      {reports.ngoReports?.reduce((acc, curr) => acc + curr.totalLocations, 0) || 0}
                    </p>
                  </div>
                  <div className="stats-card">
                    <h3>Total Cameras</h3>
                    <p className="stats-number">
                      {reports.ngoReports?.reduce((acc, curr) => acc + curr.totalCameras, 0) || 0}
                    </p>
                  </div>
                  <div className="stats-card status-online">
                    <h3>Online Feeds</h3>
                    <p className="stats-number">
                      {reports.ngoReports?.reduce((acc, curr) => acc + curr.onlineCameras, 0) || 0}
                    </p>
                  </div>
                  <div className="stats-card status-offline">
                    <h3>Offline Alerts</h3>
                    <p className="stats-number">
                      {reports.ngoReports?.reduce((acc, curr) => acc + curr.offlineCameras, 0) || 0}
                    </p>
                  </div>
                </div>

                {/* 2. NGO Selector Panel for Live Video feeds */}
                <div className="cctv-monitor-section" style={{ borderTop: 'none', paddingTop: 0 }}>
                  <div className="section-title-with-actions">
                    <h2>Live Surveillance Feed (NGO Wise)</h2>
                    {selectedNgoId && (
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedNgoId(null)}>
                        ✕ Clear Filter
                      </button>
                    )}
                  </div>

                  {/* NGO Quick-Select Buttons */}
                  <div className="ngo-filter-row">
                    {reports.ngoReports.length === 0 ? (
                      <p className="empty-state">No NGOs registered to view.</p>
                    ) : (
                      reports.ngoReports.map((ngo) => (
                        <button
                          key={ngo.id}
                          className={`ngo-filter-btn ${selectedNgoId === ngo.id ? 'active' : ''}`}
                          onClick={() => setSelectedNgoId(ngo.id)}
                        >
                          <span className="ngo-dot"></span>
                          <span className="ngo-label">{ngo.name}</span>
                          <span className="ngo-count-badge">{ngo.totalCameras} Cam</span>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Dynamic CCTV Live Grid */}
                  {!selectedNgoId ? (
                    <div className="no-cameras-box select-ngo-prompt">
                      <span className="prompt-icon">🏢</span>
                      <h3>No NGO Selected</h3>
                      <p>Please click on one of the registered NGO nodes above to load their active live CCTV cameras.</p>
                    </div>
                  ) : filteredCameras.length === 0 ? (
                    <div className="no-cameras-box">
                      <p>This NGO has registered locations but no cameras configured yet.</p>
                      <Link to="/cameras" className="setup-link">Configure cameras for {selectedNgoName}</Link>
                    </div>
                  ) : (
                    <div>
                      <div className="selected-ngo-badge-label">
                        📍 Monitoring Feeds for: <strong>{selectedNgoName}</strong> ({filteredCameras.length} active feeds)
                      </div>
                      <div className="cctv-grid">
                        {filteredCameras.map((camera) => (
                          <div key={camera.id} className="cctv-cell">
                            <div className="cctv-stream-container">
                              {camera.viewer_url ? (
                                <iframe
                                  src={camera.viewer_url}
                                  title={camera.camera_name}
                                  className="cctv-iframe"
                                  allowFullScreen
                                  scrolling="no"
                                />
                              ) : (
                                <div className="cctv-offline-placeholder">
                                  <span className="offline-icon">⚠️</span>
                                  <p>Stream not active</p>
                                </div>
                              )}
                            </div>
                            <div className="cctv-cell-info">
                              <div className="cctv-cell-header">
                                <span className="cctv-name">{camera.camera_name}</span>
                                <span className={`status-badge ${camera.stream_status === 'ready' || camera.stream_status === 'created' || camera.stream_status === 'seeded' ? 'badge-online' : 'badge-offline'}`} />
                              </div>
                              <span className="cctv-location">📍 {camera.Location?.location_name || 'Unknown'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Detailed NGO Registry & Audit Report */}
                <div className="report-panel-section card-inner-section">
                  <h2>NGO Audit Breakdown & Records</h2>
                  <div className="table-wrapper">
                    <table className="classic-table">
                      <thead>
                        <tr>
                          <th>NGO Name</th>
                          <th>Reg No.</th>
                          <th>Locations</th>
                          <th>Cameras (Total)</th>
                          <th>Online Feeds</th>
                          <th>Offline Alert</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.ngoReports.map((ngo) => (
                          <tr key={ngo.id}>
                            <td><strong>{ngo.name}</strong></td>
                            <td><code>{ngo.registration_number}</code></td>
                            <td>{ngo.totalLocations}</td>
                            <td>{ngo.totalCameras}</td>
                            <td><span className="txt-online">{ngo.onlineCameras}</span></td>
                            <td><span className="txt-offline">{ngo.offlineCameras}</span></td>
                            <td>
                              <span className={`status-badge-inline ${ngo.offlineCameras === 0 && ngo.totalCameras > 0 ? 'online' : 'offline'}`}>
                                {ngo.offlineCameras === 0 && ngo.totalCameras > 0 ? 'Fully Compliant' : 'Alerts Active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. Diagnostics & System health */}
                <div className="admin-diagnostics-grid">
                  {/* Server Resource Metrics */}
                  <div className="card diag-card">
                    <h2>Server Health & Node Heap Monitor</h2>
                    <div className="server-spec-list">
                      <div className="spec-item">
                        <span>Node.js Version:</span>
                        <strong>{reports.serverHealth.nodeVersion}</strong>
                      </div>
                      <div className="spec-item">
                        <span>System OS Platform:</span>
                        <strong>{reports.serverHealth.platform} ({reports.serverHealth.cpuArch})</strong>
                      </div>
                      <div className="spec-item">
                        <span>Server Uptime:</span>
                        <strong>{Math.floor(reports.serverHealth.uptimeSeconds / 60)} minutes</strong>
                      </div>
                    </div>

                    <div className="memory-progress-section">
                      <h4>Garbage Heap Memory Allocation</h4>
                      
                      <div className="mem-bar-group">
                        <div className="mem-bar-label">
                          <span>Heap Memory Used:</span>
                          <strong>{reports.serverHealth.heapUsedMB} MB / {reports.serverHealth.heapTotalMB} MB</strong>
                        </div>
                        <div className="mem-progress-bg">
                          <div 
                            className="mem-progress-fill" 
                            style={{ width: `${Math.min(100, (reports.serverHealth.heapUsedMB / reports.serverHealth.heapTotalMB) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="mem-bar-group">
                        <div className="mem-bar-label">
                          <span>Total Resident Set (RSS):</span>
                          <strong>{reports.serverHealth.rssMB} MB</strong>
                        </div>
                        <div className="mem-progress-bg rss-bar">
                          <div 
                            className="mem-progress-fill" 
                            style={{ width: `${Math.min(100, (reports.serverHealth.rssMB / 512) * 100)}%` }}
                          />
                        </div>
                        <span className="small-disclaimer-text">Resident Set includes all stack, heap and library overhead.</span>
                      </div>
                    </div>
                  </div>

                  {/* Disconnected camera diagnostic list */}
                  <div className="card diag-card">
                    <h2>Connection Fault Log (Offline Feeds)</h2>
                    <div className="fault-log-scroll">
                      {reports.failingCameras.length === 0 ? (
                        <p className="empty-state green-state">✓ All camera connections active. No fault states logged.</p>
                      ) : (
                        <div className="fault-list">
                          {reports.failingCameras.map((fault) => (
                            <div key={fault.id} className="fault-item">
                              <div className="fault-item-header">
                                <span className="fault-cam-name">📹 {fault.camera_name}</span>
                                <span className="fault-tag">FAULT CODE: {fault.stream_status}</span>
                              </div>
                              <div className="fault-details">
                                <span>🏢 NGO: {fault.ngo_name}</span>
                                <span>📍 Location: {fault.location_name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* STANDARD NGO DASHBOARD VIEW */}
            {role !== 'admin' && (
              <>
                {/* Stats Cards */}
                <div className="stats-grid">
                  <div className="stats-card">
                    <h3>Campus Locations</h3>
                    <p className="stats-number">{totalLocations}</p>
                  </div>
                  <div className="stats-card">
                    <h3>Total Cameras</h3>
                    <p className="stats-number">{totalCameras}</p>
                  </div>
                  <div className="stats-card status-online">
                    <h3>Online Cameras</h3>
                    <p className="stats-number">{onlineCamerasCount}</p>
                  </div>
                  <div className="stats-card status-offline">
                    <h3>Offline Cameras</h3>
                    <p className="stats-number">{offlineCamerasCount}</p>
                  </div>
                </div>

                {/* Live Camera Feed Grid */}
                <div className="cctv-monitor-section">
                  <h2>CCTV Live Grid</h2>
                  {cameras.length === 0 ? (
                    <div className="no-cameras-box">
                      <p>No cameras registered yet.</p>
                      <Link to="/cameras" className="setup-link">Add cameras to start monitoring</Link>
                    </div>
                  ) : (
                    <div className="cctv-grid">
                      {cameras.map((camera) => (
                        <div key={camera.id} className="cctv-cell">
                          <div className="cctv-stream-container">
                            {camera.viewer_url ? (
                              <iframe
                                src={camera.viewer_url}
                                title={camera.camera_name}
                                className="cctv-iframe"
                                allowFullScreen
                                scrolling="no"
                              />
                            ) : (
                              <div className="cctv-offline-placeholder">
                                <span className="offline-icon">⚠️</span>
                                <p>Stream not active</p>
                              </div>
                            )}
                          </div>
                          <div className="cctv-cell-info">
                            <div className="cctv-cell-header">
                              <span className="cctv-name">{camera.camera_name}</span>
                              <span className={`status-badge ${camera.stream_status === 'ready' || camera.stream_status === 'created' || camera.stream_status === 'seeded' ? 'badge-online' : 'badge-offline'}`} />
                            </div>
                            <span className="cctv-location">📍 {camera.Location?.location_name || 'Unknown'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default Dashboard;
