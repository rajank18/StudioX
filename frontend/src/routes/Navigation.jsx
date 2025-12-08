import React from 'react';
import { Routes, Route } from 'react-router-dom';
import WebRoutes from './WebRoutes';
import AuthRoutes from './AuthRoutes';

const Navigation = () => {
  return (
    <>
      <WebRoutes />
      <AuthRoutes />
    </>
  );
};

export default Navigation;