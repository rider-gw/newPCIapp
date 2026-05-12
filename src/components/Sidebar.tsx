import { useState, type FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchUserAttributes, getCurrentUser, signOut } from '@aws-amplify/auth';
import { safeWriteAuditLog } from '../services/auditLogStore';

const navButtonStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box' as const,
  textDecoration: 'none',
  color: '#0d3b66',
  backgroundColor: '#cfe9ff',
  border: '1px solid #9bcfff',
  borderRadius: '6px',
  padding: '8px 10px',
  fontWeight: 600,
};

const subNavButtonStyle = {
  ...navButtonStyle,
  backgroundColor: '#e6f4ff',
  border: '1px solid #b8dcff',
  fontWeight: 500,
  padding: '7px 9px',
};

const Sidebar: FC = () => {
  const location = useLocation();
  const adminPaths = ['/admin', '/settings', '/diagnostics'];
  const [adminOpen, setAdminOpen] = useState(() => adminPaths.some(p => location.pathname.startsWith(p)));

  const handleAdminClick = () => setAdminOpen(prev => !prev);

  const handleLogout = async () => {
    try {
      let userName = 'unknown';
      try {
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        userName = attributes.email || user?.username || 'unknown';
      } catch {
        // Best-effort username lookup for audit logging.
      }

      await safeWriteAuditLog({
        user: userName,
        type: 'logout',
        details: 'User selected logout from sidebar',
      });

      await signOut();
      alert('Logged out successfully');
      // Optionally redirect to login page
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <nav style={{
      width: '200px',
      height: '100vh',
      backgroundColor: '#e0e0e0',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li style={{ marginBottom: '10px' }}>
          <Link to="/home" style={navButtonStyle}>Home</Link>
        </li>
        <li style={{ marginBottom: '10px' }}>
          <Link to="/pci-requirements" style={navButtonStyle}>PCI Requirements</Link>
        </li>
        <li style={{ marginBottom: '10px' }}>
          <Link to="/controls" style={navButtonStyle}>Controls</Link>
        </li>
        <li style={{ marginBottom: '10px' }}>
          <Link to="/assets" style={navButtonStyle}>Assets</Link>
        </li>
        <li style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Link to="/admin" style={{ ...navButtonStyle, flex: 1 }}>Admin</Link>
            <button
              onClick={handleAdminClick}
              style={{
                background: '#cfe9ff',
                border: '1px solid #9bcfff',
                borderRadius: '6px',
                cursor: 'pointer',
                padding: '8px 6px',
                color: '#0d3b66',
                fontWeight: 700,
                lineHeight: 1,
              }}
              aria-label="Toggle Admin submenu"
            >
              {adminOpen ? '▲' : '▼'}
            </button>
          </div>
          {adminOpen && (
            <ul style={{ listStyle: 'none', paddingLeft: '14px', marginTop: '8px' }}>
              <li style={{ marginBottom: '8px' }}>
                <Link to="/settings" style={subNavButtonStyle}>Settings</Link>
              </li>
              <li>
                <Link to="/diagnostics" style={subNavButtonStyle}>Diagnostics</Link>
              </li>
            </ul>
          )}
        </li>
        <li style={{ marginBottom: '10px' }}>
          <Link to="/audits" style={navButtonStyle}>Audits</Link>
          <ul style={{ listStyle: 'none', paddingLeft: '14px', marginTop: '8px' }}>
            <li style={{ marginBottom: '8px' }}>
              <Link to="/current-audit" style={subNavButtonStyle}>Current Audit</Link>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <Link to="/continuous-monitoring" style={subNavButtonStyle}>Continuous Monitoring</Link>
              <ul style={{ listStyle: 'none', paddingLeft: '14px', marginTop: '8px' }}>
                <li style={{ marginBottom: '8px' }}>
                  <Link to="/continuous-monitoring/home" style={subNavButtonStyle}>Home</Link>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <Link to="/continuous-monitoring/set-rules" style={subNavButtonStyle}>Set Rules</Link>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <Link to="/continuous-monitoring/reports" style={subNavButtonStyle}>Reports</Link>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <Link to="/continuous-monitoring/new-modify-rule" style={subNavButtonStyle}>New/Modify Rule</Link>
                </li>
                <li>
                  <Link to="/continuous-monitoring/test-rule" style={subNavButtonStyle}>Test Rule</Link>
                </li>
              </ul>
            </li>
            <li>
              <Link to="/past-audits" style={subNavButtonStyle}>Past Audits</Link>
            </li>
          </ul>
        </li>
        <li>
          <button onClick={handleLogout} style={{ ...navButtonStyle, cursor: 'pointer', textAlign: 'left' }}>Logout</button>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;