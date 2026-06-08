import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Access Denied: Invalid credentials');
        return;
      }

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userRole', data.organization.role || 'ngo');
      navigate('/dashboard');
    } catch (err) {
      setError('System Error: Unable to establish server connection.');
    }
  };

  return (
    <div className="login-screen-wrapper">
      <main className="login-panel-card">
        <header className="login-panel-header">
          <div className="security-shield">
            <span className="shield-icon">🛡️</span>
          </div>
          <h1>CCTV COMPLIANCE PORTAL</h1>
          <p className="system-status-text">
            <span className="live-dot-blink"></span> SYSTEM MODE: ACTIVE & SECURE
          </p>
        </header>

        <div className="security-divider">
          <span className="divider-line"></span>
          <span className="divider-tag">SECURE SIGN-IN</span>
          <span className="divider-line"></span>
        </div>

        <form onSubmit={handleSubmit} className="classic-form">
          <div className="form-group">
            <label>AUTHORIZED EMAIL ID</label>
            <div className="input-with-icon">
              <span className="input-icon-label">✉️</span>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="name@organization.org"
              />
            </div>
          </div>

          <div className="form-group">
            <label>ACCESS CONTROL PASSWORD</label>
            <div className="input-with-icon">
              <span className="input-icon-label">🔑</span>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••••••"
              />
            </div>
          </div>

          {error && <div className="login-error-box">⚠️ {error}</div>}

          <button type="submit" className="btn btn-primary btn-block">
            AUTHENTICATE & LOG IN
          </button>
        </form>

        <footer className="login-panel-footer">
          <p className="register-notice">
            New organization? <Link to="/register" className="footer-action-link">Register Node Account</Link>
          </p>
          <div className="system-disclaimer">
            <p>WARNING: AUTHORIZED PERSONNEL ONLY</p>
            <p>This system monitors all streams in real time. Unauthorized connection attempts will be logged and audited.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default Login;
