import React, { useState, useRef, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Upload, Download, Loader, CheckCircle, AlertCircle, Crop, Scissors, Link } from 'lucide-react';
import CropResizeTimeline from '../../components/web/CropResizeTimeline';
import CropResizeFrame from '../../components/web/CropResizeFrame';
import ToolInfoFaqSection from '../../components/web/ToolInfoFaqSection';

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB
const API_BASE = 'http://localhost:3000/api/crop-resize';

export default function CropResize() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const videoRef = useRef(null);
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const objectUrlRef = useRef(null);

  // YouTube link support
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoadingYt, setIsLoadingYt] = useState(false);
  const [ytFileMeta, setYtFileMeta] = useState(null);

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const dur = v.duration || 0;
    const w = v.videoWidth || 0;
    const h = v.videoHeight || 0;
    setVideoDuration(dur);
    setVideoWidth(w);
    setVideoHeight(h);
    setStartTime(0);
    setEndTime(Math.max(0.1, dur));
    setCrop({ x: 0, y: 0, width: w, height: h });
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setError('');
    setResultUrl(null);
    setSuccess(false);
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }
    if (f.size > MAX_BYTES) {
      setError('File is too large (max 500MB)');
      return;
    }
    if (objectUrlRef.current) {
      try { URL.revokeObjectURL(objectUrlRef.current); } catch (err) {}
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    objectUrlRef.current = url;
    setVideoUrl(url);
  };

  // YouTube helpers
  const validateYouTubeUrl = (url) => {
    const patterns = [
      /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\//,
      /^https?:\/\/(www\.)?youtube\.com\/v\//
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleUseLink = async () => {
    if (!youtubeUrl.trim()) return setError('Please enter a YouTube URL');
    if (!validateYouTubeUrl(youtubeUrl.trim())) return setError('Please enter a valid YouTube URL');

    setError('');
    setIsLoadingYt(true);
    setResultUrl(null);
    setSuccess(false);

    try {
      // Fetch info first (optional, but gives us formats)
      const infoRes = await fetch('http://localhost:3000/api/video/youtube/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });
      const infoData = await infoRes.json();
      if (!infoRes.ok) throw new Error(infoData.error || 'Failed to fetch video info');

      // Choose highest quality by default (first in array)
      const quality = (infoData.formats && infoData.formats[0] && infoData.formats[0].quality) || null;

      // Request backend to download the video and return a public URL
      let token = null;
      try { token = await getToken(); } catch (e) { token = null; }

      const dlRes = await fetch('http://localhost:3000/api/video/youtube/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id || '',
          'X-User-Email': user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: youtubeUrl.trim(), quality }),
      });

      const dlData = await dlRes.json();
      if (!dlRes.ok) throw new Error(dlData.error || 'YouTube download failed');

      const file = dlData.file;
      const fullUrl = `http://localhost:3000${file.url}`;

      // Use downloaded file for preview/cropping
      setVideoUrl(fullUrl);
      setFile(null);
      setYtFileMeta(file);
    } catch (err) {
      setError(err.message || 'YouTube download failed');
    } finally {
      setIsLoadingYt(false);
    }
  };

  const handleTrimChange = useCallback(({ startTime: s, endTime: e }) => {
    setStartTime(s);
    setEndTime(e);
  }, []);

  const handleProcess = async () => {
    if (!file && !ytFileMeta) {
      setError('Please upload a video or provide a YouTube link first');
      return;
    }
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      let token = null;
      try { token = await getToken(); } catch (err) { token = null; }

      const form = new FormData();

      // Prefer explicit local file; for YouTube we create File from the downloaded blob.
      if (file) {
        form.append('video', file);
      } else if (ytFileMeta && videoUrl) {
        const response = await fetch(videoUrl);
        if (!response.ok) throw new Error('Failed to download YouTube video for processing');
        const blob = await response.blob();
        const youtubeFile = new File([blob], ytFileMeta.filename || 'youtube-video.mp4', { type: 'video/mp4' });
        form.append('video', youtubeFile);
        // Also set file to keep future checks consistent and avoid repeated blob downloads.
        setFile(youtubeFile);
      }

      form.append('startTime', String(startTime));
      form.append('endTime', String(endTime));
      form.append('cropX', String(Math.max(0, Math.floor(crop.x))));
      form.append('cropY', String(Math.max(0, Math.floor(crop.y))));
      form.append('cropWidth', String(Math.max(1, Math.floor(crop.width))));
      form.append('cropHeight', String(Math.max(1, Math.floor(crop.height))));

      const headers = {
        'X-User-Id': user?.id || '',
        'X-User-Email': user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/process`, { method: 'POST', headers, body: form });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || data.details || 'Processing failed';
        console.error('CropResize process API failure', { status: res.status, data });
        throw new Error(msg);
      }

      const fullUrl = `http://localhost:3000${data.url}`;
      setResultUrl(fullUrl);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Processing failed');
      console.error('CropResize process error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resultUrl) return;
    try {
      const resp = await fetch(resultUrl);
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resultUrl.split('/').pop() || 'cropped-video.mp4';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Download failed');
    }
  };

  const handleNewVideo = () => {
    setFile(null);
    setVideoUrl('');
    setResultUrl(null);
    setSuccess(false);
    setError('');
    setVideoDuration(0);
    setVideoWidth(0);
    setVideoHeight(0);
    setStartTime(0);
    setEndTime(0);
    setCrop({ x: 0, y: 0, width: 0, height: 0 });
    setYoutubeUrl('');
    setYtFileMeta(null);
    if (objectUrlRef.current) {
      try { URL.revokeObjectURL(objectUrlRef.current); } catch (err) {}
      objectUrlRef.current = null;
    }
  };

  const handleResetCrop = () => {
    if (videoWidth && videoHeight) {
      setCrop({ x: 0, y: 0, width: videoWidth, height: videoHeight });
    }
  };

  const cropPct = videoWidth && videoHeight
    ? {
        x: ((crop.x / videoWidth) * 100).toFixed(1),
        y: ((crop.y / videoHeight) * 100).toFixed(1),
        width: ((crop.width / videoWidth) * 100).toFixed(1),
        height: ((crop.height / videoHeight) * 100).toFixed(1),
      }
    : null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-amber-50 rounded-full">
            <Crop className="w-8 h-8 text-amber-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Crop & Resize</h1>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="space-y-6">
          {!videoUrl && !resultUrl && (
            <div className="space-y-2">
              <label htmlFor="crop-resize-file" className="block text-sm font-medium text-gray-700">Select Video</label>
              <input
                id="crop-resize-file"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="crop-resize-file"
                className="flex items-center justify-center w-full px-4 py-10 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-amber-500 hover:bg-amber-50/50 transition-colors"
              >
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Click to upload a video file</p>
                  <p className="text-xs text-gray-500 mt-1">MP4, WebM, MOV • Max 500MB</p>
                </div>
              </label>

              {/* YouTube link option */}
              <div className="mt-3">
                <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700">Or paste a YouTube link</label>
                <div className="flex gap-2 mt-2">
                  <input
                    id="youtube-url"
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
                    disabled={isLoading || isLoadingYt}
                  />
                  <button
                    onClick={handleUseLink}
                    disabled={isLoadingYt || !youtubeUrl.trim()}
                    className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isLoadingYt ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <Link className="w-4 h-4 mr-2" />}
                    <span>Use link</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {videoUrl && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Preview</span>
                  <button
                    type="button"
                    onClick={handleResetCrop}
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Reset crop to full frame
                  </button>
                </div>
                <div
                  className="relative rounded-lg overflow-hidden bg-black w-full max-h-[400px] mx-auto"
                  style={videoWidth > 0 && videoHeight > 0 ? { aspectRatio: videoWidth / videoHeight } : {}}
                >
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="absolute inset-0 w-full h-full object-contain"
                    controls
                    onLoadedMetadata={onLoadedMetadata}
                  />
                  {videoWidth > 0 && videoHeight > 0 && (
                    <div className="absolute inset-0">
                      <CropResizeFrame
                        videoWidth={videoWidth}
                        videoHeight={videoHeight}
                        crop={crop}
                        onChange={setCrop}
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              <CropResizeTimeline
                videoDuration={videoDuration}
                startTime={startTime}
                endTime={endTime}
                onChange={handleTrimChange}
                className="mt-4"
              />

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Crop (%)</p>
                {cropPct && (
                  <p className="text-sm text-gray-600">
                    X: {cropPct.x}% · Y: {cropPct.y}% · W: {cropPct.width}% · H: {cropPct.height}%
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">Drag the orange box on the video to crop.</p>
              </div>

              {!resultUrl ? (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleProcess}
                    disabled={isLoading || (!file && !ytFileMeta)}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Scissors className="w-5 h-5" />}
                    {isLoading ? 'Processing...' : 'Crop & Trim Video'}
                  </button>
                  <button
                    type="button"
                    onClick={handleNewVideo}
                    className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    New Video
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleDownload}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download Video
                  </button>
                  <button
                    type="button"
                    onClick={() => { setResultUrl(null); setSuccess(false); }}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Process Again
                  </button>
                  <button
                    type="button"
                    onClick={handleNewVideo}
                    className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    New Video
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Error</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {success && resultUrl && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Done</p>
                    <p className="text-sm text-green-700">Your cropped and trimmed video is ready. Download below or process again.</p>
                  </div>
                </div>
              )}

              {resultUrl && (
                <div className="rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 p-2">Result preview</p>
                  <video src={resultUrl} controls className="w-full max-h-64" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ToolInfoFaqSection toolKey="crop-resize" />
    </div>
  );
}
