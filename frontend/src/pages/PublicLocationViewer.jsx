import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function PublicLocationViewer() {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    fetch(`/api/public/locations/${locationId}/cameras`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setLocation(data.location);
        setCameras(data.cameras || []);
      })
      .catch(() => setError('Unable to load location streams'))
      .finally(() => setLoading(false));
  }, [locationId]);

  const handleBack = () => {
    navigate('/dashboard'); // Direct navigation back to dashboard console (works even if opened in a new tab)
  };

  // PUBLIC READ-ONLY EMBED MODE (No login token present)
  // Renders ONLY the pure live feed grid without sidebar, headers, or console buttons
  if (!token) {
    if (loading) {
      return (
        <div className="viewer-loading-box" style={{ margin: '80px auto' }}>
          <p>Loading CCTV monitor grid...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="viewer-error-box" style={{ margin: '80px auto' }}>
          <h2>Connection Error</h2>
          <p>{error}</p>
        </div>
      );
    }
    if (cameras.length === 0) {
      return (
        <div className="viewer-empty-box" style={{ margin: '80px auto' }}>
          <p>No active cameras found at this location.</p>
        </div>
      );
    }
    return (
      <div className="public-embed-container" style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <div className="cctv-grid legacy-grid">
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
              <div className="cctv-cell-info" style={{ padding: '8px 12px' }}>
                <div className="cctv-cell-header" style={{ marginBottom: 0 }}>
                  <span className="cctv-name" style={{ fontSize: '0.85rem' }}>{camera.camera_name}</span>
                  <span className={`status-badge ${camera.stream_status === 'ready' || camera.stream_status === 'created' || camera.stream_status === 'seeded' ? 'badge-online' : 'badge-offline'}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // INTERNAL ADMIN/STAFF INSPECTOR MODE (Login token present)
  // Renders the full split dashboard layout with Sidebar metadata and Return to Console buttons
  return (
    <div className="legacy-viewer-layout">
      {/* 1. Top Bar */}
      <header className="legacy-viewer-topbar">
        <div className="topbar-title-section">
          <span className="live-pulse-dot"></span>
          <span className="topbar-title">e-Anudhan CCTV Surveillance Compliance Feed</span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleBack} style={{ margin: 0 }}>
            ← Return to Console
          </button>
        </div>
      </header>

      <div className="legacy-viewer-main">
        {/* 2. Legacy Information Sidebar */}
        <aside className="legacy-viewer-sidebar">
          {loading ? (
            <p className="loading-text">Loading campus details...</p>
          ) : error ? (
            <div className="sidebar-error">Error loading details</div>
          ) : (
            <>
              <div className="sidebar-section">
                <h3>ORGANIZATION (NGO)</h3>
                <p className="ngo-org-name">{location?.Organization?.name || 'NGO'}</p>
                {location?.Organization?.registration_number && (
                  <span className="ngo-reg-no">Reg: {location?.Organization?.registration_number}</span>
                )}
              </div>

              <div className="sidebar-section">
                <h3>CAMPUS LOCATION</h3>
                <p className="loc-name">📍 {location?.location_name}</p>
              </div>

              <div className="sidebar-section">
                <h3>ADDRESS DETAILS</h3>
                <p className="loc-address">
                  {location?.address}<br />
                  {location?.city}, {location?.state}<br />
                  PIN: {location?.pincode}
                </p>
              </div>

              <div className="sidebar-section">
                <h3>COMPLIANCE METRICS</h3>
                <p className="stat-value">{cameras.length} Camera Feed{cameras.length !== 1 ? 's' : ''}</p>
                <div className="compliance-shield-badge">
                  🛡️ VERIFIED COMPLIANCE
                </div>
              </div>
            </>
          )}
        </aside>

        {/* 3. CCTV Grid Content Panel */}
        <main className="legacy-viewer-content">
          {error ? (
            <div className="viewer-error-box">
              <h2>Connection Error</h2>
              <p>{error}</p>
            </div>
          ) : loading ? (
            <div className="viewer-loading-box">
              <p>Establishing connections to surveillance streams...</p>
            </div>
          ) : cameras.length === 0 ? (
            <div className="viewer-empty-box">
              <p>No active cameras are configured at this campus location yet.</p>
            </div>
          ) : (
            <div className="cctv-grid legacy-grid">
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
                  <div className="cctv-cell-info" style={{ padding: '8px 12px' }}>
                    <div className="cctv-cell-header" style={{ marginBottom: 0 }}>
                      <span className="cctv-name" style={{ fontSize: '0.85rem' }}>{camera.camera_name}</span>
                      <span className={`status-badge ${camera.stream_status === 'ready' || camera.stream_status === 'created' || camera.stream_status === 'seeded' ? 'badge-online' : 'badge-offline'}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default PublicLocationViewer;
