import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

function Viewer() {
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
            <h1>Live Viewer</h1>
            <p>Camera: {camera?.camera_name}</p>
            <p>Location: {camera?.Location?.location_name}</p>
            <p>Address: {camera?.Location?.address}, {camera?.Location?.city}</p>
            <p className="stream-placeholder">Live stream placeholder for RTSP feed.</p>
            <p>Share this link with reviewers:</p>
            <code>{window.location.href}</code>
          </>
        )}
        <p>
          <Link to="/">Back to login</Link>
        </p>
      </section>
    </main>
  );
}

export default Viewer;
