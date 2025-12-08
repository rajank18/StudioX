import React from 'react';
import { Routes, Route } from 'react-router-dom';
import WebLayout from '../layout/Web';
import LandingPage from '../pages/LandingPage';

const WebRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<WebLayout />}>
        <Route index element={<LandingPage />} />
        {/* Add more web routes here if needed */}
      </Route>
    </Routes>
  );
};

export default WebRoutes;
