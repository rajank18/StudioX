import React, { useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  Type,
  Loader,
  Download,
  CheckCircle,
  AlertCircle,
  Link as LinkIcon,
  Upload,
  Clock3,
  Tv,
  Play,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const AutoSubtitles = () => {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [subtitleData, setSubtitleData] = useState(null);

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

  const handleFetchVideoInfo = async () => {
    const trimmedUrl = youtubeUrl.trim();

    if (!trimmedUrl) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (!validateYouTubeUrl(trimmedUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setError('');
    setSubtitleData(null);
    setVideoInfo(null);
    setIsFetchingInfo(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auto-subtitle/youtube/info`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please sign in again and retry.');
        }
        throw new Error(result.error || 'Failed to fetch video info');
      }

      setVideoInfo(result.data);
    } catch (err) {
      setError(err.message || 'Unable to fetch video info right now');
    } finally {
      setIsFetchingInfo(false);
    }
  };

  const handleGenerateSubtitles = async () => {
    const trimmedUrl = youtubeUrl.trim();

    if (!videoInfo) {
      setError('Please fetch video info first');
      return;
    }

    setError('');
    setSubtitleData(null);
    setIsGenerating(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auto-subtitle/youtube`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please sign in again and retry.');
        }
        throw new Error(result.error || 'Failed to generate subtitles');
      }

      setSubtitleData(result.data);
    } catch (err) {
      setError(err.message || 'Unable to generate subtitles right now');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadVideo = () => {
    if (!subtitleData?.publicUrl) return;

    const link = document.createElement('a');
    link.href = `${API_BASE_URL}${subtitleData.publicUrl}`;
    link.download = subtitleData.outputFilename || 'subtitled-video.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6 shadow-lg">
            <Type className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Auto Subtitles
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform any YouTube video into a perfectly subtitled masterpiece with AI-powered transcription
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8 mb-8">
          {/* URL Input Section */}
          <div className="mb-8">
            <label htmlFor="youtube-link" className="block text-sm font-semibold text-gray-700 mb-3">
              YouTube Video URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <LinkIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="youtube-link"
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-200 text-gray-900 placeholder-gray-400"
                disabled={isBusy}
              />
            </div>
            <button
              onClick={handleFetchVideoInfo}
              disabled={isBusy || !youtubeUrl.trim()}
              className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              type="button"
            >
              {isFetchingInfo ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Analyzing Video...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Fetch Video Details</span>
                </>
              )}
            </button>
          </div>

          {/* Video Info Display */}
          {videoInfo && (
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 mb-6 border border-gray-200/50">
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {videoInfo.thumbnail && (
                  <div className="flex-shrink-0">
                    <img
                      src={videoInfo.thumbnail}
                      alt={videoInfo.title || 'Video thumbnail'}
                      className="w-full lg:w-48 h-auto rounded-lg shadow-md border border-gray-200"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                    {videoInfo.title || 'Untitled video'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-3 text-gray-600">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Clock3 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Duration</p>
                        <p className="text-sm">{videoInfo.duration || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Tv className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Channel</p>
                        <p className="text-sm">{videoInfo.channel || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateSubtitles}
                    disabled={isBusy}
                    className="w-full lg:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    type="button"
                  >
                    {isGenerating ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Generating Subtitles...</span>
                      </>
                    ) : (
                      <>
                        <Type className="w-5 h-5" />
                        <span>Create Subtitled Video</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          )}

          {/* Success Display */}
          {subtitleData && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8 border border-green-200/50">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Subtitled Video Ready!</h3>
                  </div>
                  <p className="text-gray-600">
                    {subtitleData?.video?.title || 'Untitled video'} • {subtitleData?.segmentsCount || 0} subtitle segments generated
                  </p>
                </div>
                <button
                  onClick={handleDownloadVideo}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-3"
                  type="button"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Video</span>
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-inner p-6">
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
                  <video
                    controls
                    className="w-full h-full"
                    poster={subtitleData?.video?.thumbnail}
                  >
                    <source src={`${API_BASE_URL}${subtitleData?.publicUrl}`} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Processing Summary</h4>
                    <ul className="space-y-1">
                      <li className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-blue-500" />
                        <span>Video downloaded from YouTube</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Type className="w-4 h-4 text-purple-500" />
                        <span>AI transcription completed</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Subtitles burned into video</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Technical Details</h4>
                    <div className="space-y-1">
                      <p><span className="font-medium">Format:</span> MP4 with H.264 video</p>
                      <p><span className="font-medium">Audio:</span> AAC encoded</p>
                      <p><span className="font-medium">Subtitles:</span> Hardcoded into video</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* How it works - Footer Section */}
        <div className="mt-16 bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">How it works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
              <p className="leading-relaxed">Paste YouTube URL and fetch video details</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-semibold text-sm">2</span>
              </div>
              <p className="leading-relaxed">Download video and extract audio track</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-semibold text-sm">3</span>
              </div>
              <p className="leading-relaxed">AI transcribes audio (AssemblyAI or Whisper)</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-orange-600 font-semibold text-sm">4</span>
              </div>
              <p className="leading-relaxed">Generate subtitles and burn into video</p>
            </div>
            <div className="flex items-start gap-4 md:col-span-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 font-semibold text-sm">5</span>
              </div>
              <p className="leading-relaxed">Download your perfectly subtitled video</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoSubtitles;