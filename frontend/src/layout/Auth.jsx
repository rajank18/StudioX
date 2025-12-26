import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/web/Sidebar';
import Navbar from '../components/web/Navbar';
import Footer from '../components/web/Footer';

const WebLayout = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default WebLayout;
