import React, { useMemo, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import FeatureGuide from '../../components/web/FeatureGuide';
import {
  FileText,
  Loader,
  Copy,
  Download,
  CheckCircle,
  AlertCircle,
  Link as LinkIcon,
  Upload,
  Clock3,
  Tv,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const AiVideoSummary = () => {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploadedVideoFile, setUploadedVideoFile] = useState(null);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

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
    setSummaryData(null);
    setVideoInfo(null);
    setIsFetchingInfo(true);

    try {
      let response;

      if (isFileMode) {
        const formData = new FormData();
        formData.append('video', uploadedVideoFile);

        const token = await getToken();
        const userId = user?.id || '';
        const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';

        response = await fetch(`${API_BASE_URL}/api/ai-video-summary/upload/info`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-User-Id': userId,
            'X-User-Email': userEmail,
          },
          body: formData,
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/ai-video-summary/youtube/info`, {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({ url: trimmedUrl }),
        });
      }

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

  const handleGenerateSummary = async () => {
    const trimmedUrl = youtubeUrl.trim();
    const isFileMode = Boolean(uploadedVideoFile);

    if (!videoInfo) {
      setError('Please fetch video info first');
      return;
    }

    setError('');
    setSummaryData(null);
    setIsGenerating(true);

    try {
      let response;

      if (isFileMode) {
        const formData = new FormData();
        formData.append('video', uploadedVideoFile);

        const token = await getToken();
        const userId = user?.id || '';
        const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';

        response = await fetch(`${API_BASE_URL}/api/ai-video-summary/upload`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-User-Id': userId,
            'X-User-Email': userEmail,
          },
          body: formData,
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/ai-video-summary/youtube`, {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({ url: trimmedUrl }),
        });
      }

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please sign in again and retry.');
        }
        throw new Error(result.error || 'Failed to generate summary');
      }

      setSummaryData(result.data);
    } catch (err) {
      setError(err.message || 'Unable to generate summary right now');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    setYoutubeUrl('');
    setUploadedVideoFile(null);
    setVideoInfo(null);
    setSummaryData(null);
    setError('');
  };

  const cleanedSummary = useMemo(() => {
    if (!summaryData?.summary) return '';

    return summaryData.summary
      .replace(/\*\*/g, '')
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/^\s*TL\s*;?\s*DR\s*:?\s*$/gim, 'One-line Summary')
      .replace(/^[-]{3,}\s*$/gm, '')
      .replace(/^\s*[-*]\s+/gm, '• ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }, [summaryData]);

  const formattedLines = useMemo(() => {
    if (!cleanedSummary) return [];

    return cleanedSummary.split('\n').map((line) => line.trim()).filter(Boolean);
  }, [cleanedSummary]);

  const handleCopy = async () => {
    if (!cleanedSummary) return;

    await navigator.clipboard.writeText(cleanedSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadTxt = () => {
    if (!cleanedSummary) return;

    const fileContent = [
      'AI Video Summary',
      '================',
      `Title: ${summaryData?.video?.title || 'N/A'}`,
      `Duration: ${summaryData?.video?.duration || 'N/A'}`,
      `Channel: ${summaryData?.video?.channel || 'N/A'}`,
      '',
      cleanedSummary,
    ].join('\n');

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video-summary-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isHeading = (line) => /^(summary|one-line summary|tldr|tl;dr|key points|actionable takeaways)\s*:?$/i.test(line);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-orange-50 rounded-full">
            <FileText className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">AI Video Summary</h1>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 space-y-6">
        <div className="space-y-2">
          <label htmlFor="local-video" className="block text-sm font-medium text-gray-700">Select Video File</label>

          <label
            htmlFor="local-video"
            className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary-50 transition-colors"
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
            <div className="text-center">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                {uploadedVideoFile ? uploadedVideoFile.name : 'Click to upload a video file'}
              </p>
              <p className="text-xs text-gray-500">MP4, WebM, MOV supported • Max 500MB</p>
            </div>
          </label>
        </div>

        <div className="mt-3">
          <label htmlFor="youtube-link" className="block text-sm font-medium text-gray-700">
            Or paste a YouTube link
          </label>
          <div className="mt-2">
            <div className="relative w-full">
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
                className="w-full pl-10 pr-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors text-gray-900 placeholder:text-gray-400"
                disabled={isBusy}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleFetchVideoInfo}
            disabled={isBusy || (!youtubeUrl.trim() && !uploadedVideoFile)}
            className="flex-1 btn-primary px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            className="btn-outline-primary px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                onClick={handleGenerateSummary}
                disabled={isBusy}
                className="mt-3 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                type="button"
              >
                {isGenerating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Generating Summary...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    <span>Generate Summary</span>
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

      {cleanedSummary && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 space-y-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Summary Result</h2>
              <p className="text-sm text-gray-600 mt-1">{summaryData?.video?.title || 'Untitled video'}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="btn-outline-primary flex items-center gap-2 cursor-pointer"
                type="button"
              >
                {copied ? <CheckCircle className="w-4 h-3" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handleDownloadTxt}
                className="btn-primary flex items-center gap-2 cursor-pointer"
                type="button"
              >
                <Download className="w-4 h-3" />
                <span>Download .txt</span>
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 space-y-3">
            {formattedLines.map((line, idx) => (
              <p
                key={`${line}-${idx}`}
                className={isHeading(line) ? 'text-base font-semibold text-gray-900 mt-2' : 'text-sm leading-6 text-gray-800'}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      <FeatureGuide
        description="Get concise extractive summaries from video audio/text for quick consumption and note-taking."
        steps={[
          'Paste a YouTube URL or upload a video file.',
          'Fetch video info then click Generate Summary.',
          'Review, edit, copy or download the summary text.'
        ]}
        tips={[
          'Use shorter videos first when trying this feature.',
          'If audio is noisy, consider pre-processing with Noise Reduction.'
        ]}
      />
    </div>
  );
};

export default AiVideoSummary;
