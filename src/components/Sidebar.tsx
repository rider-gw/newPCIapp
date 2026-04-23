import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Auth } from 'aws-amplify';

const Sidebar: FC = () => {
  const handleLogout = async () => {
    try {
      await Auth.signOut();
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
        <li>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'black', cursor: 'pointer' }}>Logout</button>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;