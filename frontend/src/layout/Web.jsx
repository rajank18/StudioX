import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/web/Sidebar';
import Navbar from '../components/web/Navbar';
import Footer from '../components/web/Footer';

const WebLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-gray-50">
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
