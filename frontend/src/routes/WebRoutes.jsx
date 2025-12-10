import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import WebLayout from '../layout/Web';
import LandingPage from '../pages/LandingPage';
import OnBoarding from '../pages/OnBoarding';
import Home from '../pages/web/Home';
import VideoToGif from '../pages/web/VideoToGif';

const WebRoutes = () => {
  return (
    <Routes>
      {/* Landing page with navbar */}
      <Route path="/" element={<WebLayout />}>
        <Route index element={<LandingPage />} />
      </Route>
      
      {/* Protected onboarding - no navbar */}
      <Route path="/onboarding" element={ <OnBoarding/>
        // <>
        //   <SignedIn>
        //     <OnBoarding />
        //   </SignedIn>
        //   <SignedOut>
        //     <Navigate to="/sign-in" replace />
        //   </SignedOut>
        // </>
      } />
      
      {/* Protected home - with navbar */}
      <Route path="/home" element={
        <>
          <SignedIn>
            <Home />
          </SignedIn>
          <SignedOut>
            <Navigate to="/sign-in" replace />
          </SignedOut>
        </>
      } />
      
      {/* Video to GIF Page */}
      <Route path="/video-to-gif" element={
        <>
          <SignedIn>
            <VideoToGif />
          </SignedIn>
          <SignedOut>
            <Navigate to="/sign-in" replace />
          </SignedOut>
        </>
      } />
    </Routes>
  );
};

export default WebRoutes;
