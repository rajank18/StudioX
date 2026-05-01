import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import SignIn from '../pages/auth/SignIn';
import SignUp from '../pages/auth/SignUp';

const AuthRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/sign-in" replace />} />
      <Route path="/register" element={<Navigate to="/sign-up" replace />} />
      <Route path="/sign-in" element={
        <>
          <SignedOut>
            <SignIn />
          </SignedOut>
          <SignedIn>
            <Navigate to="/home" replace />
          </SignedIn>
        </>
      } />
      <Route path="/sign-up" element={
        <>
          <SignedOut>
            <SignUp />
          </SignedOut>
          <SignedIn>
            <Navigate to="/home" replace />
          </SignedIn>
        </>
      } />
      <Route path="*" element={null} />
    </Routes>
  );
};

export default AuthRoutes;