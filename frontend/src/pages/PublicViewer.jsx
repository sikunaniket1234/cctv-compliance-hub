import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

function PublicViewer() {
  const { streamKey } = useParams();
  const [camera, setCamera] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/public/view/${streamKey}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setCamera(data.camera);
      })
      .catch(() => setError('Unable to load stream details'));
  }, [streamKey]);

  return (
    <main className="page-container">
      <section className="card wide-card">
        {error ? (
          <>
            <h1>Stream unavailable</h1>
            <p className="error">{error}</p>
          </>
        ) : (
          <>
            <h1>Public Viewer</h1>
            <p><strong>Camera:</strong> {camera?.camera_name}</p>
            <p><strong>Location:</strong> {camera?.Location?.location_name}</p>
            <p><strong>Status:</strong> {camera?.stream_status || 'unknown'}</p>
            <p><strong>Viewer URL:</strong> {camera?.viewer_url}</p>
            <div className="webrtc-player">
              <p>WebRTC player placeholder</p>
              <p>Stream playback will be loaded here from the generated viewer URL.</p>
            </div>
            <p>Share this link with reviewers:</p>
            <code>{window.location.href}</code>
          </>
        )}
        <p>
          <Link to="/login">Back to login</Link>
        </p>
      </section>
    </main>
  );
}

export default PublicViewer;
