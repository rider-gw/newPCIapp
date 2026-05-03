import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { fetchUserAttributes, getCurrentUser, signOut } from '@aws-amplify/auth';
import { safeWriteAuditLog } from '../services/auditLogStore';

const Sidebar: FC = () => {
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
          <Link to="/home" style={{ textDecoration: 'none', color: 'black' }}>Home</Link>
        </li>
        <li style={{ marginBottom: '10px' }}>
          <Link to="/settings" style={{ textDecoration: 'none', color: 'black' }}>Settings</Link>
        </li>
        <li style={{ marginBottom: '10px' }}>
          <Link to="/pci-requirements" style={{ textDecoration: 'none', color: 'black' }}>PCI Requirements</Link>
        </li>
        <li style={{ marginBottom: '10px' }}>
          <Link to="/controls" style={{ textDecoration: 'none', color: 'black' }}>Controls</Link>
        </li>
        <li style={{ marginBottom: '10px' }}>
          <Link to="/assets" style={{ textDecoration: 'none', color: 'black' }}>Assets</Link>
        </li>
        <li style={{ marginBottom: '10px' }}>
          <Link to="/diagnostics" style={{ textDecoration: 'none', color: 'black' }}>Diagnostics</Link>
        </li>
        <li style={{ marginBottom: '10px' }}>
          <Link to="/admin" style={{ textDecoration: 'none', color: 'black' }}>Admin</Link>
        </li>
        <li style={{ marginBottom: '10px' }}>
          <Link to="/continuous-monitoring" style={{ textDecoration: 'none', color: 'black' }}>Continuous Monitoring</Link>
          <ul style={{ listStyle: 'none', paddingLeft: '14px', marginTop: '8px' }}>
            <li style={{ marginBottom: '8px' }}>
              <Link to="/continuous-monitoring/home" style={{ textDecoration: 'none', color: 'black' }}>Home</Link>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <Link to="/continuous-monitoring/set-rules" style={{ textDecoration: 'none', color: 'black' }}>Set Rules</Link>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <Link to="/continuous-monitoring/reports" style={{ textDecoration: 'none', color: 'black' }}>Reports</Link>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <Link to="/continuous-monitoring/new-modify-rule" style={{ textDecoration: 'none', color: 'black' }}>New/Modify Rule</Link>
            </li>
            <li>
              <Link to="/continuous-monitoring/test-rule" style={{ textDecoration: 'none', color: 'black' }}>Test Rule</Link>
            </li>
          </ul>
        </li>
        <li style={{ marginBottom: '10px' }}>
          <Link to="/current-audit" style={{ textDecoration: 'none', color: 'black' }}>Current Audit</Link>
        </li>
        <li style={{ marginBottom: '10px' }}>
          <Link to="/past-audits" style={{ textDecoration: 'none', color: 'black' }}>Past Audits</Link>
        </li>
        <li>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'black', cursor: 'pointer' }}>Logout</button>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;