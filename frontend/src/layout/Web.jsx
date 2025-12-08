import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/web/Navbar';
import Footer from '../components/web/Footer';

const WebLayout = () => {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-purple-100 selection:text-purple-900">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default WebLayout;
