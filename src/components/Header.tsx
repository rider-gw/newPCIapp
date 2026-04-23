import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const Header: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string>('Loading...');
  const [lastLoggedOn, setLastLoggedOn] = useState<string>('Loading...');
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('');

  useEffect(() => {
    // Simulate fetching user data from Cognito
    // In real app, use Auth.currentAuthenticatedUser()
    setCurrentUser('John Doe');
    setLastLoggedOn('2023-10-01 10:00 AM');

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