import React, { useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  Type,
  Upload,
  Loader,
  AlertCircle,
  Clock3,
  Tv,
  Download,
  Link as LinkIcon,
  FileText,
  Video,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const AiSubtitleGenerator = () => {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploadedVideoFile, setUploadedVideoFile] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isBusy = isFetchingInfo || isGenerating;

  const validateYouTubeUrl = (url) => {
    const patterns = [
      /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\//,
      /^https?:\/\/(www\.)?youtube\.com\/shorts\//,
    ];

    return patterns.some((pattern) => pattern.test(url));
  };

  const authHeaders = async () => {
    const token = await getToken();
    const userId = user?.id || '';
    const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-User-Id': userId,
      'X-User-Email': userEmail,
    };
  };

  const handleUpload = async () => {
    const trimmedUrl = youtubeUrl.trim();
    const isFileMode = Boolean(uploadedVideoFile);

    if (!isFileMode && !trimmedUrl) {
      setError('Please enter a YouTube URL or choose a video file');
      return;
    }

    if (!isFileMode && !validateYouTubeUrl(trimmedUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setError('');
    setVideoInfo(null);
    setResult(null);
    setIsFetchingInfo(true);

    try {
      let response;

      if (isFileMode) {
        const formData = new FormData();
        formData.append('video', uploadedVideoFile);

        const token = await getToken();
        const userId = user?.id || '';
        const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';

        response = await fetch(`${API_BASE_URL}/api/ai-subtitle/upload/info`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-User-Id': userId,
            'X-User-Email': userEmail,
          },
          body: formData,
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/ai-subtitle/youtube/info`, {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({ url: trimmedUrl }),
        });
      }

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch video info');
      }

      setVideoInfo(payload.data);
    } catch (err) {
      setError(err.message || 'Unable to fetch video info');
    } finally {
      setIsFetchingInfo(false);
    }
  };

  const handleGenerateSubtitles = async () => {
    const trimmedUrl = youtubeUrl.trim();
    const isFileMode = Boolean(uploadedVideoFile);

    if (!videoInfo) {
      setError('Please upload/fetch video info first');
      return;
    }

    setError('');
    setResult(null);
    setIsGenerating(true);

    try {
      let response;

      if (isFileMode) {
        const formData = new FormData();
        formData.append('video', uploadedVideoFile);

        const token = await getToken();
        const userId = user?.id || '';
        const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';

        response = await fetch(`${API_BASE_URL}/api/ai-subtitle/upload/generate`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-User-Id': userId,
            'X-User-Email': userEmail,
          },
          body: formData,
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/ai-subtitle/youtube/generate`, {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({ url: trimmedUrl }),
        });
      }

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate subtitles');
      }

      setResult(payload.data);
    } catch (err) {
      setError(err.message || 'Unable to generate subtitles right now');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseLink = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please paste a YouTube URL first');
      return;
    }
    setUploadedVideoFile(null);
    await handleUpload();
  };

  const handleCancel = () => {
    setYoutubeUrl('');
    setUploadedVideoFile(null);
    setVideoInfo(null);
    setResult(null);
    setError('');
  };

  const videoPreviewUrl = result?.video?.url ? `${API_BASE_URL}${result.video.url}` : null;
  const subtitleDownloadUrl = result?.subtitle?.url ? `${API_BASE_URL}${result.subtitle.url}` : null;
  const videoDownloadUrl = result?.video?.url ? `${API_BASE_URL}${result.video.url}` : null;

  const directDownload = async (url, filename) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  const handleDownloadVideo = async () => {
    if (!videoDownloadUrl) return;
    try {
      await directDownload(videoDownloadUrl, result?.video?.filename || 'subtitled-video.mp4');
    } catch (err) {
      setError(err.message || 'Unable to download video');
    }
  };

  const handleDownloadSrt = async () => {
    if (!subtitleDownloadUrl) return;
    try {
      await directDownload(subtitleDownloadUrl, result?.subtitle?.filename || 'subtitles.srt');
    } catch (err) {
      setError(err.message || 'Unable to download subtitle file');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-orange-50 rounded-full">
            <Type className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">AI Subtitle Generator</h1>
        <p className="text-gray-600">Paste YouTube link → Upload → Generate Subtitles</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 space-y-5">
        <p className="text-xl font-semibold text-gray-900">Select Video File</p>

        <label
          htmlFor="local-video"
          className="block border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-primary transition-colors"
        >
          <input
            id="local-video"
            type="file"
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setUploadedVideoFile(file);
              if (file) {
                setYoutubeUrl('');
                setError('');
              }
            }}
            className="hidden"
            disabled={isBusy}
          />
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-2xl text-gray-700 font-medium">
            {uploadedVideoFile ? uploadedVideoFile.name : 'Click to upload a video file'}
          </p>
          <p className="text-gray-500 mt-1">MP4, WebM, MOV supported · Max 500MB</p>
        </label>

        <div>
          <label htmlFor="youtube-link" className="block text-2xl font-semibold text-gray-900 mb-2">
            Or paste a YouTube link
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="youtube-link"
                type="url"
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  if (e.target.value.trim()) setUploadedVideoFile(null);
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors text-black"
                disabled={isBusy}
              />
            </div>
            <button
              type="button"
              onClick={handleUseLink}
              disabled={isBusy || !youtubeUrl.trim()}
              className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use link
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={isBusy || (!youtubeUrl.trim() && !uploadedVideoFile)}
            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            type="button"
          >
            {isFetchingInfo ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Fetching Video Info...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Upload</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isBusy}
            className="btn-outline-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>

      {videoInfo && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            {videoInfo.thumbnail && (
              <img
                src={videoInfo.thumbnail}
                alt={videoInfo.title || 'Video thumbnail'}
                className="w-full md:w-64 h-auto rounded-lg border border-gray-200"
              />
            )}
            <div className="space-y-2 flex-1">
              <h2 className="text-lg font-semibold text-gray-900">{videoInfo.title || 'Untitled video'}</h2>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-gray-500" />
                  <span>Duration: {videoInfo.duration || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-gray-500" />
                  <span>Channel: {videoInfo.channel || 'N/A'}</span>
                </div>
              </div>

              <button
                onClick={handleGenerateSubtitles}
                disabled={isBusy}
                className="mt-3 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                type="button"
              >
                {isGenerating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Generating Subtitles...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    <span>Generate Subtitles</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 space-y-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Subtitled Video Ready</h2>
              <p className="text-sm text-gray-600 mt-1">{result?.videoInfo?.title || 'Your video'}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {videoDownloadUrl && (
                <button
                  onClick={handleDownloadVideo}
                  className="btn-primary flex items-center gap-2"
                  type="button"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Video</span>
                </button>
              )}
              {subtitleDownloadUrl && (
                <button
                  onClick={handleDownloadSrt}
                  className="btn-outline-primary flex items-center gap-2"
                  type="button"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .srt</span>
                </button>
              )}
            </div>
          </div>

          {videoPreviewUrl ? (
            <div className="rounded-lg border border-gray-200 bg-black overflow-hidden">
              <video
                src={videoPreviewUrl}
                controls
                className="w-full h-auto"
                preload="metadata"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-10 text-center text-gray-500">
              <Video className="w-8 h-8 mx-auto mb-2" />
              <p>Preview unavailable</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AiSubtitleGenerator;
