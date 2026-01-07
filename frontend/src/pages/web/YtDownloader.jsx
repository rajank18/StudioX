import React, { useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Download, Link, Loader, CheckCircle, AlertCircle } from 'lucide-react';

const YtDownloader = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  const handleDownload = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (!validateYouTubeUrl(url.trim())) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const token = await getToken();
      const response = await fetch('http://localhost:3000/api/video/youtube/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-ID': user?.id, // Send user ID directly
          'X-User-Email': user?.emailAddresses?.[0]?.emailAddress, // Send email
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Download failed');
      }

      setResult(data.file);
    } catch (err) {
      setError(err.message || 'Failed to download video');
    } finally {
      setIsLoading(false);
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
            <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700">
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
                className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isLoading || !url.trim()}
            className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            <span>{isLoading ? 'Downloading...' : 'Download Video'}</span>
          </button>

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
                  <button
                    onClick={handleDownloadFile}
                    className="mt-3 inline-flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </button>
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
