import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/web/Navbar';
import Footer from '../components/web/Footer';

const WebLayout = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default WebLayout;
