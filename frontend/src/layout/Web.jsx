import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/web/Sidebar';
import Navbar from '../components/web/Navbar';
import Footer from '../components/web/Footer';

const WebLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('studiox-theme') === 'dark';
    } catch (_) {
      return false;
    }
  });
  const { getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const onThemeUpdated = (event) => {
      const nextTheme = event?.detail?.theme;
      if (nextTheme === 'dark' || nextTheme === 'light') {
        setIsDarkMode(nextTheme === 'dark');
      }
    };

    window.addEventListener('studiox-theme-change', onThemeUpdated);
    return () => window.removeEventListener('studiox-theme-change', onThemeUpdated);
  }, []);

  // Bootstrap: ensure the signed-in user exists in backend DB
  useEffect(() => {
    (async () => {
      try {
        if (!user?.id) return; // wait until Clerk user is loaded
        const token = await getToken();
        if (!token) return; // wait until token is available
        
        const userEmail = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress;
        console.log('[Bootstrap] User ID:', user.id);
        console.log('[Bootstrap] User email:', userEmail);
        console.log('[Bootstrap] Full user object:', user);
        
        await fetch('http://localhost:3000/api/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-User-Id': user.id,
            'X-User-Email': userEmail || '',
          },
        });
      } catch (err) {
        console.error('[Bootstrap] Error:', err);
        // silently ignore to avoid UI noise; backend will create on demand
      }
    })();
  }, [getToken, user?.id]);

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'web-theme-dark bg-black' : 'bg-gray-50'}`}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className={`flex-1 flex flex-col ${isSidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default WebLayout;
