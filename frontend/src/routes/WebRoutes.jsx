import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import WebLayout from '../layout/Web';
import LandingPage from '../pages/LandingPage';
import OnBoarding from '../pages/OnBoarding';
import Home from '../pages/web/Home';
import YtDownloader from '../pages/web/YtDownloader';
import Projects from '../pages/web/Projects';
import RemoveSilence from '../pages/web/RemoveSilence';
import VideoToGif from '../pages/web/VideoToGif';
import NoiseReduction from '../pages/web/NoiseReduction';
import ThumbnailGenerator from '../pages/web/ThumbnailGenerator';
import CropResize from '../pages/web/CropResize';
import AiVideoSummary from '../pages/web/AiVideoSummary';
import AutoSubtitles from '../pages/web/AutoSubtitles';

const WebRoutes = () => {
  return (
    <Routes>
      {/* Public landing page (no sidebar/layout) */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/onboarding"
        element={
          <>
            <SignedIn>
              <Navigate to="/home" replace />
            </SignedIn>
            <SignedOut>
              <OnBoarding />
            </SignedOut>
          </>
        }
      />
      
      {/* Protected app routes wrapped in WebLayout (with sidebar) */}
      <Route element={<WebLayout />}>
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
        <Route path="/yt-downloader" element={
          <>
            <SignedIn>
              <YtDownloader />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
        <Route path="/projects" element={
          <>
            <SignedIn>
              <Projects />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
        <Route path="/remove-silence" element={
          <>
            <SignedIn>
              <RemoveSilence />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
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
        <Route path="/noise-reduction" element={
          <>
            <SignedIn>
              <NoiseReduction />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
        <Route path="/thumbnail-generator" element={
          <>
            <SignedIn>
              <ThumbnailGenerator />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
        <Route path="/crop-resize" element={
          <>
            <SignedIn>
              <CropResize />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
        <Route path="/ai-video-summary" element={
          <>
            <SignedIn>
              <AiVideoSummary />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
        <Route path="/auto-subtitles" element={
          <>
            <SignedIn>
              <AutoSubtitles />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
      </Route>
    </Routes>
  );
};

export default WebRoutes;
