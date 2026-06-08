import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Locations from './pages/Locations';
import Cameras from './pages/Cameras';
import Ngos from './pages/Ngos';
import Guide from './pages/Guide';
import PublicViewer from './pages/PublicViewer';
import PublicLocationViewer from './pages/PublicLocationViewer';
import Sidebar from './components/Sidebar';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('authToken');
  return token ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('authToken');
  const role = localStorage.getItem('userRole');
  if (!token) return <Navigate to="/login" replace />;
  return role === 'admin' ? children : <Navigate to="/dashboard" replace />;
}

function ProtectedLayout() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content">
        <Outlet />
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/view/:streamKey" element={<PublicViewer />} />
        <Route path="/view/location/:locationId" element={<PublicLocationViewer />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <ProtectedLayout />
            </PrivateRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="locations" element={<Locations />} />
          <Route path="cameras" element={<Cameras />} />
          <Route path="guide" element={<Guide />} />
          <Route
            path="ngos"
            element={
              <AdminRoute>
                <Ngos />
              </AdminRoute>
            }
          />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
