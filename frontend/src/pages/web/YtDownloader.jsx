import React, { useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Download, Link, Loader, CheckCircle, AlertCircle, Play } from 'lucide-react';

const YtDownloader = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [url, setUrl] = useState('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const validateYouTubeUrl = (url) => {
    const patterns = [
      /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\//,
      /^https?:\/\/(www\.)?youtube\.com\/v\//
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleStart = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (!validateYouTubeUrl(url.trim())) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsLoadingInfo(true);
    setError('');
    setVideoInfo(null);
    setSelectedQuality(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:3000/api/video/youtube/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch video info');
      }

      setVideoInfo(data);
      // Select the highest quality by default (first in list)
      if (data.formats && data.formats.length > 0) {
        setSelectedQuality(data.formats[0].quality);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch video information');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const handleDownload = async () => {
    if (!videoInfo || !selectedQuality) {
      setError('Please select a quality first');
      return;
    }

    setIsDownloading(true);
    setError('');
    setResult(null);

    try {
      const token = await getToken();
      const response = await fetch('http://localhost:3000/api/video/youtube/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Id': user?.id || '',
          'X-User-Email': user?.emailAddresses?.[0]?.emailAddress || '',
        },
        body: JSON.stringify({ 
          url: url.trim(),
          quality: selectedQuality,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Download failed');
      }

      setResult(data.file);
    } catch (err) {
      setError(err.message || 'Failed to download video');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadFile = async () => {
    if (result?.url) {
      try {
        const fullUrl = `http://localhost:3000${result.url}`;
        
        // Fetch the file as blob and trigger download
        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error('Download failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        window.URL.revokeObjectURL(url);
      } catch (err) {
        setError('Failed to download file: ' + err.message);
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleReset = () => {
    setUrl('');
    setVideoInfo(null);
    setSelectedQuality(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary-50 rounded-full">
            <Download className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">YouTube Downloader</h1>
        <p className="text-gray-600">Download YouTube videos quickly and easily - completely free!</p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="space-y-6">
          {/* URL Input */}
          <div className="space-y-2">
            <label htmlFor="youtube-url" className="block text-sm font-medium ">
              YouTube URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="youtube-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors text-black"
                disabled={isLoadingInfo || videoInfo}
              />
            </div>
          </div>

          {/* Start Button (shown when no video info loaded) */}
          {!videoInfo && (
            <button
              onClick={handleStart}
              disabled={isLoadingInfo || !url.trim()}
              className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingInfo ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              <span>{isLoadingInfo ? 'Loading...' : 'Start'}</span>
            </button>
          )}

          {/* Video Preview (shown after video info loaded) */}
          {videoInfo && !result && (
            <div className="space-y-4">
              {/* Video Thumbnail and Info */}
              <div className="flex gap-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                {videoInfo.thumbnail && (
                  <img 
                    src={videoInfo.thumbnail} 
                    alt={videoInfo.title}
                    className="w-40 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{videoInfo.title}</h3>
                  {videoInfo.duration && (
                    <p className="text-sm text-gray-600 mt-1">Duration: {videoInfo.duration}</p>
                  )}
                </div>
              </div>

              {/* Quality Selection */}
              <div className="space-y-2">
                <label htmlFor="quality-select" className="block text-sm font-medium text-gray-900">
                  Select Quality
                </label>
                <select
                  id="quality-select"
                  value={selectedQuality || ''}
                  onChange={(e) => setSelectedQuality(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors text-black bg-white"
                >
                  {videoInfo.formats && videoInfo.formats.map((format) => (
                    <option key={format.quality} value={format.quality}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Download and Reset Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading || !selectedQuality}
                  className="flex-1 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  <span>{isDownloading ? 'Downloading...' : 'Download Video'}</span>
                </button>
                <button
                  onClick={handleReset}
                  disabled={isDownloading}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Download Failed</h4>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-green-800">Download Complete!</h4>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-green-700">
                      <span className="font-medium">File:</span> {result.filename}
                    </p>
                    <p className="text-sm text-green-700">
                      <span className="font-medium">Size:</span> {formatFileSize(result.sizeBytes)}
                    </p>
                  </div>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={handleDownloadFile}
                      className="inline-flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download File</span>
                    </button>
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <span>Download Another</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Download className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">High Quality</h3>
          <p className="text-sm text-gray-600">Download videos in the best available quality, including HD and 4K formats.</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">100% Free</h3>
          <p className="text-sm text-gray-600">No credits required, no subscriptions. Download as many videos as you want.</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Link className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Easy to Use</h3>
          <p className="text-sm text-gray-600">Just paste the YouTube URL and click download. Simple and straightforward.</p>
        </div>
      </div>
    </div>
  );
};

export default YtDownloader;
