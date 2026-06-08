import { NavLink, useNavigate } from 'react-router-dom';

function Sidebar() {
  const navigate = useNavigate();
  const role = localStorage.getItem('userRole');
  const email = role === 'admin' ? 'admin@cctv.com' : 'ngo@compliance.org';

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <span className="brand-dot"></span>
        <span className="brand-text">CCTV COMPLIANCE</span>
      </div>

      <div className="user-profile-section">
        <div className="profile-avatar">{role === 'admin' ? 'A' : 'N'}</div>
        <div className="profile-details">
          <p className="profile-name">{role === 'admin' ? 'Super Admin' : 'NGO User'}</p>
          <p className="profile-email">{email}</p>
        </div>
      </div>

      <nav className="sidebar-links">
        <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">📊</span> Dashboard
        </NavLink>
        {role === 'admin' && (
          <NavLink to="/ngos" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="link-icon">🏢</span> NGO Registry
          </NavLink>
        )}
        <NavLink to="/locations" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">📍</span> Campus Locations
        </NavLink>
        <NavLink to="/cameras" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">🎥</span> Surveillance Cameras
        </NavLink>
        <NavLink to="/guide" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">📖</span> Deployment Guide
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-logout-btn" onClick={handleLogout}>
          <span className="btn-icon">🚪</span> Logout Session
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
