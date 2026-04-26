import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { format } from 'date-fns';
import { fetchUserAttributes, getCurrentUser } from '@aws-amplify/auth';
import { safeWriteAuditLog } from '../services/auditLogStore';

const Header: FC = () => {
  const [currentUser, setCurrentUser] = useState<string>('Loading...');
  const [lastLoggedOn, setLastLoggedOn] = useState<string>('Loading...');
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        const resolvedUser = attributes.email || user?.username || 'Unknown';
        setCurrentUser(resolvedUser);
        setLastLoggedOn('Session active');
        await safeWriteAuditLog({
          user: resolvedUser,
          type: 'login',
          details: 'User authenticated and opened application session',
        });
      } catch (error) {
        console.error('User not authenticated', error);
        setCurrentUser('Not logged in');
        setLastLoggedOn('N/A');
      }
    };
    fetchUser();

    // Update date/time every second
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDateTime(format(now, 'yyyy-MM-dd HH:mm:ss'));
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 20px',
      backgroundColor: '#f0f0f0',
      borderBottom: '1px solid #ccc'
    }}>
      <div>
        <div>Current user: {currentUser}</div>
        <div>Last logged on: {lastLoggedOn}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div>{currentDateTime}</div>
        <div>{timezone}</div>
      </div>
    </header>
  );
};

export default Header;