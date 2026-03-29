import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import WebLayout from '../layout/Web';
import LandingPage from '../pages/LandingPage';
import OnBoarding from '../pages/OnBoarding';
import Home from '../pages/web/Home';
import Tools from '../pages/web/Tools';
import YtDownloader from '../pages/web/YtDownloader';
import Projects from '../pages/web/Projects';
import RemoveSilence from '../pages/web/RemoveSilence';
import VideoToGif from '../pages/web/VideoToGif';
import NoiseReduction from '../pages/web/NoiseReduction';
import ThumbnailGenerator from '../pages/web/ThumbnailGenerator';
import CropResize from '../pages/web/CropResize';
import AiVideoSummary from '../pages/web/AiVideoSummary';
import AiSubtitleGenerator from '../pages/web/AiSubtitleGenerator';
import VideoEnhancer from '../pages/web/VideoEnhancer'

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
        <Route path="/tools" element={
          <>
            <SignedIn>
              <Tools />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
        <Route path="/tools/remove-silence" element={
          <>
            <SignedIn>
              <RemoveSilence />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
        <Route path="/tools/video-to-gif" element={
          <>
            <SignedIn>
              <VideoToGif />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
        <Route path="/tools/noise-reduction" element={
          <>
            <SignedIn>
              <NoiseReduction />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
        <Route path="/tools/thumbnail-generator" element={
          <>
            <SignedIn>
              <ThumbnailGenerator />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
        <Route path="/tools/crop-resize" element={
          <>
            <SignedIn>
              <CropResize />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
        <Route path="/tools/ai-video-summary" element={
          <>
            <SignedIn>
              <AiVideoSummary />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
        <Route path="/tools/ai-subtitle-generator" element={
          <>
            <SignedIn>
              <AiSubtitleGenerator />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
        <Route path="/tools/video-enhancer" element={
          <>
            <SignedIn>
              <VideoEnhancer/>
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        } />
        <Route path="/tools/ai-enhance" element={<Navigate to="/tools/video-enhancer" replace />} />
        <Route path="/tools/ai-upscale" element={<Navigate to="/tools/video-enhancer" replace />} />
        <Route path="/yt-downloader" element={<Navigate to="/tools/yt-downloader" replace />} />
        <Route path="/video-to-gif" element={<Navigate to="/tools/video-to-gif" replace />} />
        <Route path="/noise-reduction" element={<Navigate to="/tools/noise-reduction" replace />} />
        <Route path="/remove-silence" element={<Navigate to="/tools/remove-silence" replace />} />
        <Route path="/thumbnail-generator" element={<Navigate to="/tools/thumbnail-generator" replace />} />
        <Route path="/crop-resize" element={<Navigate to="/tools/crop-resize" replace />} />
        <Route path="/ai-video-summary" element={<Navigate to="/tools/ai-video-summary" replace />} />
        <Route path="/ai-subtitle-generator" element={<Navigate to="/tools/ai-subtitle-generator" replace />} />
        <Route path="/video-enhancer" element={<Navigate to="/tools/video-enhancer" replace />} />
        <Route path="/ai-upscale" element={<Navigate to="/tools/video-enhancer" replace />} />
        <Route path="/tools/yt-downloader" element={
          <>
            <SignedIn>
              <YtDownloader />
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
