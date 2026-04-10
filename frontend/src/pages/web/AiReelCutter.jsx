import React, { useMemo, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Scissors, Upload, Link as LinkIcon, Loader2, AlertCircle, Download, Sparkles } from 'lucide-react';
import ToolInfoFaqSection from '../../components/web/ToolInfoFaqSection';
import { useReelCutterJob } from '../../lib/useReelCutterJob';
import { useCredits } from '../../context/CreditContext';
import CreditStatusCard from '../../components/web/CreditStatusCard';
import { getAiServiceCreditLabel } from '../../config/creditCosts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const STAGE_LABELS = {
  queued: 'Queued',
  'health-check': 'Health Check',
  processing: 'Processing',
  'processing (progress stream degraded)': 'Processing (Fallback)',
  done: 'Done',
  error: 'Error',
};

const AiReelCutter = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { credits, isLoadingCredits, refreshCredits } = useCredits();

  const [inputMode, setInputMode] = useState('youtube');
  const [ytUrl, setYtUrl] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [jobId, setJobId] = useState('');

  const [options, setOptions] = useState({
    num_reels: 5,
    min_duration: 10,
    max_duration: 30,
    resolution: '720p',
    add_captions: true,
    caption_font_size: 48,
    caption_color: 'white',
  });

  const { job, connectionState } = useReelCutterJob(jobId);

  const progress = useMemo(() => {
    if (!job) return 0;
    const pct = Number(job.pct || 0);
    return Number.isFinite(pct) ? Math.max(0, Math.min(100, Math.round(pct))) : 0;
  }, [job]);

  const stageLabel = useMemo(() => {
    const stage = job?.stage || 'queued';
    return STAGE_LABELS[stage] || stage;
  }, [job]);

  const validateBeforeSubmit = () => {
    const hasYt = Boolean(ytUrl.trim());
    const hasFile = Boolean(videoFile);

    if ((hasYt && hasFile) || (!hasYt && !hasFile)) {
      return 'Provide exactly one input source: YouTube URL or video upload.';
    }

    if (options.min_duration > options.max_duration) {
      return 'Minimum duration must be less than or equal to maximum duration.';
    }

    return null;
  };

  const handleStart = async () => {
    const validationError = validateBeforeSubmit();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = await getToken();
      const formData = new FormData();

      if (inputMode === 'youtube') {
        formData.append('yt_url', ytUrl.trim());
      } else if (videoFile) {
        formData.append('video_file', videoFile);
      }

      formData.append('num_reels', String(options.num_reels));
      formData.append('min_duration', String(options.min_duration));
      formData.append('max_duration', String(options.max_duration));
      formData.append('resolution', options.resolution);
      formData.append('add_captions', String(options.add_captions));
      formData.append('caption_font_size', String(options.caption_font_size));
      formData.append('caption_color', options.caption_color);

      const response = await fetch(`${API_BASE_URL}/api/reel-cutter/generate`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-User-Id': user?.id || '',
          'X-User-Email': user?.emailAddresses?.[0]?.emailAddress || '',
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to start reel cutter');
      }

      setJobId(data.job_id);
      await refreshCredits();
    } catch (err) {
      setError(err.message || 'Failed to start reel cutter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/reel-cutter/download/${jobId}`);
      if (!response.ok) throw new Error('Failed to download reel ZIP');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = job?.output?.filename || `reels_${jobId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Failed to download reels ZIP');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="text-center md:text-left space-y-2 flex-1">
          <div className="flex justify-center md:justify-start mb-4">
            <div className="p-3 bg-primary-50 rounded-full">
              <Scissors className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">AI Reel Cutter</h1>
          <p className="text-gray-600">Generate short reels from YouTube or uploaded videos with optional captions.</p>
          <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            {getAiServiceCreditLabel('reel-cutter')}
          </span>
        </div>
        <CreditStatusCard credits={credits} isLoading={isLoadingCredits} className="self-center md:self-start min-w-[170px]" />
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 space-y-6">
        <div className="rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Input Source</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setInputMode('youtube');
                setVideoFile(null);
              }}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                inputMode === 'youtube' ? 'border-primary bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="font-semibold text-gray-900">YouTube URL</p>
              <p className="text-sm text-gray-600 mt-1">Use yt_url as input source</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setInputMode('upload');
                setYtUrl('');
              }}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                inputMode === 'upload' ? 'border-primary bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="font-semibold text-gray-900">Upload File</p>
              <p className="text-sm text-gray-600 mt-1">Use video_file as input source</p>
            </button>
          </div>

          {inputMode === 'youtube' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">YouTube URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  value={ytUrl}
                  onChange={(event) => setYtUrl(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Video File</label>
              <label className="flex items-center justify-center w-full px-4 py-10 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-100 transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(event) => setVideoFile(event.target.files?.[0] || null)}
                />
                <div className="text-center">
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    {videoFile ? videoFile.name : 'Click to upload video file'}
                  </p>
                  <p className="text-xs text-gray-500">MP4, MOV, WEBM supported</p>
                </div>
              </label>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Advanced Options
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Reels</label>
              <input
                type="number"
                min="1"
                max="20"
                value={options.num_reels}
                onChange={(event) => setOptions((prev) => ({ ...prev, num_reels: Number(event.target.value) || 5 }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
              <select
                value={options.resolution}
                onChange={(event) => setOptions((prev) => ({ ...prev, resolution: event.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Duration (sec)</label>
              <input
                type="number"
                min="5"
                max="180"
                value={options.min_duration}
                onChange={(event) => setOptions((prev) => ({ ...prev, min_duration: Number(event.target.value) || 10 }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Duration (sec)</label>
              <input
                type="number"
                min="5"
                max="300"
                value={options.max_duration}
                onChange={(event) => setOptions((prev) => ({ ...prev, max_duration: Number(event.target.value) || 30 }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Caption Font Size</label>
              <input
                type="number"
                min="18"
                max="96"
                value={options.caption_font_size}
                onChange={(event) => setOptions((prev) => ({ ...prev, caption_font_size: Number(event.target.value) || 48 }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Caption Color</label>
              <input
                type="text"
                value={options.caption_color}
                onChange={(event) => setOptions((prev) => ({ ...prev, caption_color: event.target.value || 'white' }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={options.add_captions}
              onChange={(event) => setOptions((prev) => ({ ...prev, add_captions: event.target.checked }))}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm font-medium text-gray-800">Add Captions</span>
          </label>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={submitting}
          className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scissors className="w-5 h-5" />}
          <span>{submitting ? 'Starting Reel Cutter...' : 'Generate Reels'}</span>
        </button>

        {job && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-blue-900">Progress: {stageLabel}</h3>
              <span className="text-sm font-semibold text-blue-700">{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${Math.max(2, progress)}%` }} />
            </div>
            <p className="text-xs text-blue-700">Connection: {connectionState}</p>
          </div>
        )}

        {job?.status === 'completed' && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
            <h3 className="font-medium text-green-900">Reels are ready</h3>
            <p className="text-sm text-green-700">Your reel bundle ZIP has been generated successfully.</p>
            <div className="flex justify-end">
              <button type="button" onClick={handleDownload} className="btn-primary inline-flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span>Download ZIP</span>
              </button>
            </div>
          </div>
        )}

        {(error || job?.error) && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Unable to continue</h3>
              <p className="text-sm text-red-700">{error || job?.error}</p>
              <p className="text-xs text-red-600 mt-1">Check input source rules and options, then retry.</p>
            </div>
          </div>
        )}
      </div>

      <ToolInfoFaqSection toolKey="ai-reel-cutter" />
    </div>
  );
};

export default AiReelCutter;
