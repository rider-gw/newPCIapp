import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { format } from 'date-fns';
import { Auth } from 'aws-amplify';

const Header: FC = () => {
  const [currentUser, setCurrentUser] = useState<string>('Loading...');
  const [lastLoggedOn, setLastLoggedOn] = useState<string>('Loading...');
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('');

  useEffect(() => {
    // Fetch user data from Cognito
    const fetchUser = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        setCurrentUser(user.attributes.email || user.username);
        const authTime = user.signInUserSession.accessToken.payload.auth_time;
        setLastLoggedOn(format(new Date(authTime * 1000), 'yyyy-MM-dd hh:mm a'));
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