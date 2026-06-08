import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Register() {
  const [form, setForm] = useState({
    name: '',
    registration_number: '',
    contact_person: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setSuccess('Registry record created successfully. Redirecting to auth console...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError('System Error: Unable to establish server connection.');
    }
  };

  return (
    <div className="login-screen-wrapper">
      <main className="login-panel-card register-panel-card">
        <header className="login-panel-header">
          <div className="security-shield">
            <span className="shield-icon">📝</span>
          </div>
          <h1>ORG NODE REGISTRY</h1>
          <p className="system-status-text">
            <span className="live-dot-blink"></span> REGISTRATION TERMINAL
          </p>
        </header>

        <div className="security-divider">
          <span className="divider-line"></span>
          <span className="divider-tag">CREATE NODE CREDENTIALS</span>
          <span className="divider-line"></span>
        </div>

        <form onSubmit={handleSubmit} className="classic-form">
          <div className="form-grid-two">
            <div className="form-group">
              <label>ORGANIZATION NAME</label>
              <input name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Hope Foundation" />
            </div>

            <div className="form-group">
              <label>REGISTRATION CODE</label>
              <input name="registration_number" value={form.registration_number} onChange={handleChange} required placeholder="e.g. REG-NGO-123" />
            </div>
          </div>

          <div className="form-grid-two">
            <div className="form-group">
              <label>CONTACT REPRESENTATIVE</label>
              <input name="contact_person" value={form.contact_person} onChange={handleChange} required placeholder="e.g. Sarah Connor" />
            </div>

            <div className="form-group">
              <label>CONTACT PHONE</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="e.g. +91 9988776655" />
            </div>
          </div>

          <div className="form-group">
            <label>SECURE ACCOUNT EMAIL</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="email@organization.org" />
          </div>

          <div className="form-group">
            <label>ACCESS PASSWORD</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required placeholder="••••••••••••" />
          </div>

          {error && <div className="login-error-box">⚠️ {error}</div>}
          {success && <div className="login-success-box">✓ {success}</div>}

          <button type="submit" className="btn btn-primary btn-block">
            SUBMIT NODE REGISTRATION
          </button>
        </form>

        <footer className="login-panel-footer">
          <p className="register-notice">
            Already registered? <Link to="/login" className="footer-action-link">Return to Authentication</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

export default Register;
