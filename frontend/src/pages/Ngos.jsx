import { useState, useEffect } from 'react';

function Ngos() {
  const [ngos, setNgos] = useState([]);
  const [name, setName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('authToken');

  const fetchNgos = async () => {
    try {
      const response = await fetch('/api/ngos', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setNgos(data.organizations || []);
      }
    } catch (err) {
      console.error('Error fetching NGOs:', err);
    }
  };

  useEffect(() => {
    fetchNgos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch('/api/ngos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          registration_number: registrationNumber,
          contact_person: contactPerson,
          email,
          phone,
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to register NGO');
        setLoading(false);
        return;
      }

      setSuccess(`Successfully registered NGO: ${name}`);
      setName('');
      setRegistrationNumber('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setPassword('');
      fetchNgos();
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-container ngo-management">
      <header className="page-header">
        <div>
          <h1>NGO Management Console</h1>
          <p>Register and manage NGO compliance accounts.</p>
        </div>
      </header>

      <div className="admin-grid">
        {/* NGO Registration Form */}
        <section className="card form-card">
          <h2>Register New NGO</h2>
          <form onSubmit={handleSubmit} className="classic-form">
            <div className="form-group">
              <label>Organization Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Hope Foundation" />
            </div>

            <div className="form-group">
              <label>Registration Number</label>
              <input type="text" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} required placeholder="e.g. NGO-99887" />
            </div>

            <div className="form-group">
              <label>Contact Person</label>
              <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} required placeholder="e.g. John Doe" />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="e.g. contact@hope.org" />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +91 9876543210" />
            </div>

            <div className="form-group">
              <label>Initial Login Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Registering...' : 'Register NGO Account'}
            </button>
          </form>
        </section>

        {/* NGO List Card */}
        <section className="card list-card">
          <h2>Registered NGOs ({ngos.length})</h2>
          <div className="ngo-list-scroll">
            {ngos.length === 0 ? (
              <p className="empty-state">No NGO accounts registered yet.</p>
            ) : (
              <table className="classic-table">
                <thead>
                  <tr>
                    <th>NGO Name</th>
                    <th>Registration No.</th>
                    <th>Contact Person</th>
                    <th>Email</th>
                    <th>Registered On</th>
                  </tr>
                </thead>
                <tbody>
                  {ngos.map((ngo) => (
                    <tr key={ngo.id}>
                      <td><strong>{ngo.name}</strong></td>
                      <td><code>{ngo.registration_number}</code></td>
                      <td>{ngo.contact_person}</td>
                      <td>{ngo.email}</td>
                      <td>{new Date(ngo.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default Ngos;
