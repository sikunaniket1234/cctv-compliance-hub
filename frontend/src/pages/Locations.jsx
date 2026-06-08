import { useEffect, useState } from 'react';

function Locations() {
  const [locations, setLocations] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [form, setForm] = useState({ location_name: '', address: '', city: '', state: '', pincode: '', organization_id: '' });
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [copyToast, setCopyToast] = useState(null);
  const role = localStorage.getItem('userRole');

  const handleCopyLink = (locationId, locationName) => {
    const link = `${window.location.origin}/view/location/${locationId}`;
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopyToast(`Copied e-Anudhan Compliance Link for ${locationName}!`);
        setTimeout(() => setCopyToast(null), 3000);
      })
      .catch(() => {
        setError('Failed to copy to clipboard.');
      });
  };

  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.href = '/login';
  }

  const loadLocations = async () => {
    try {
      const response = await fetch('/api/locations', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (response.ok) {
        setLocations(data.locations || []);
      } else {
        setError(data.error || 'Unable to load locations');
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
    loadLocations();
    loadNgos();
  }, [role]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const payload = { ...form };
    if (role === 'admin' && !payload.organization_id) {
      setError('Please select an NGO/Organization');
      return;
    }

    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to save location');
        return;
      }

      setMessage('Location added successfully.');
      setForm({ location_name: '', address: '', city: '', state: '', pincode: '', organization_id: '' });
      loadLocations();
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <main className="page-container locations-page">
      {copyToast && (
        <div className="copy-toast-banner">
          <span>✓ {copyToast}</span>
        </div>
      )}
      <section className="card wide-card">
        <header className="page-header">
          <div>
            <h1>Compliance Locations</h1>
            <p>Manage NGO campus locations where surveillance cameras are deployed.</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="classic-form split-form">
          <div>
            {role === 'admin' && (
              <label>
                Assign NGO/Organization
                <select name="organization_id" value={form.organization_id} onChange={handleChange} required>
                  <option value="">Select NGO...</option>
                  {ngos.map(ngo => (
                    <option key={ngo.id} value={ngo.id}>{ngo.name} ({ngo.registration_number})</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Location Name
              <input name="location_name" value={form.location_name} onChange={handleChange} placeholder="e.g. Hostele Campus" required />
            </label>
            <label>
              Address
              <input name="address" value={form.address} onChange={handleChange} placeholder="e.g. 12 Main St" required />
            </label>
          </div>
          <div>
            <label>
              City
              <input name="city" value={form.city} onChange={handleChange} placeholder="e.g. Mumbai" required />
            </label>
            <label>
              State
              <input name="state" value={form.state} onChange={handleChange} placeholder="e.g. Maharashtra" required />
            </label>
            <label>
              PIN Code
              <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="e.g. 400001" required />
            </label>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '20px' }}>Add Location</button>
          </div>
        </form>

        {message && <p className="alert alert-success">{message}</p>}
        {error && <p className="alert alert-error">{error}</p>}

        <div className="table-wrapper">
          <table className="classic-table">
            <thead>
              <tr>
                {role === 'admin' && <th>NGO</th>}
                <th>Location</th>
                <th>Address</th>
                <th>City</th>
                <th>State</th>
                <th>PIN</th>
                <th>Compliance Grid</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={role === 'admin' ? 8 : 7} className="empty-state">No locations registered yet.</td>
                </tr>
              ) : (
                locations.map((item) => (
                  <tr key={item.id}>
                    {role === 'admin' && <td><strong>{item.Organization?.name || 'Admin'}</strong></td>}
                    <td>{item.location_name}</td>
                    <td>{item.address}</td>
                    <td>{item.city}</td>
                    <td>{item.state}</td>
                    <td>{item.pincode}</td>
                    <td>
                      <a href={`/view/location/${item.id}`} target="_blank" rel="noreferrer" className="table-link">
                        Open Viewer Grid
                      </a>
                    </td>
                    <td>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleCopyLink(item.id, item.location_name)}>
                        Copy e-Anudhan Link
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default Locations;
