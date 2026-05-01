import React, { useEffect, useMemo, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Upload, Gauge, Loader2, AlertCircle, CheckCircle2, Download, FileVideo, Minimize2 } from 'lucide-react';
import ToolInfoFaqSection from '../../components/web/ToolInfoFaqSection';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const FALLBACK_FLOW = [
  'User Upload',
  'Pre-analysis (resolution, bitrate, duration)',
  'Select Compression Strategy',
  'FFmpeg Compression Engine',
  'Progress Tracking',
  'Output Optimized Video',
  'Preview + Download + Size Saved %',
];

const VideoCompressor = () => {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [uploadId, setUploadId] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [flowSteps, setFlowSteps] = useState(FALLBACK_FLOW);

  const [compressionPercent, setCompressionPercent] = useState(70);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStartingCompression, setIsStartingCompression] = useState(false);

  const [jobId, setJobId] = useState('');
  const [jobStatus, setJobStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [strategy, setStrategy] = useState('Balanced');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const fetchFlow = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/video-compressor/flow`);
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore && Array.isArray(data.flow) && data.flow.length > 0) {
          setFlowSteps(data.flow);
        }
      } catch (_) {
        // best-effort
      }
    };

    fetchFlow();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  useEffect(() => {
    if (!jobId || jobStatus !== 'processing') return undefined;

    let stopped = false;

    const pollProgress = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/api/video-compressor/progress/${jobId}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-User-Id': user?.id || '',
            'X-User-Email': user?.emailAddresses?.[0]?.emailAddress || '',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch compression progress');
        }

        const data = await response.json();
        if (stopped) return;

        setProgress(Number(data.progress || 0));
        setStrategy(data.strategy || strategy);

        if (data.status === 'completed') {
          setJobStatus('completed');
          setProgress(100);
          setResult(data.result || null);
          return;
        }

        if (data.status === 'failed') {
          setJobStatus('failed');
          setError(data.error || 'Compression failed');
          return;
        }

        setTimeout(pollProgress, 900);
      } catch (err) {
        if (!stopped) {
          setJobStatus('failed');
          setError(err.message || 'Failed to fetch compression progress');
        }
      }
    };

    pollProgress();

    return () => {
      stopped = true;
    };
  }, [jobId, jobStatus, getToken, user?.id, user?.emailAddresses, strategy]);

  const fileDetails = useMemo(() => {
    if (!videoFile) return null;
    const mb = (videoFile.size / (1024 * 1024)).toFixed(2);
    return {
      name: videoFile.name,
      size: `${mb} MB`,
      type: videoFile.type || 'video/*',
    };
  }, [videoFile]);

  const handleVideoInput = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file.');
      return;
    }

    setError('');
    setResult(null);
    setAnalysis(null);
    setUploadId('');
    setJobId('');
    setJobStatus('idle');
    setProgress(0);

    if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const handleAnalyze = async () => {
    if (!videoFile) {
      setError('Please upload a video file first.');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('video', videoFile);

      const response = await fetch(`${API_BASE_URL}/api/video-compressor/analyze`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-User-Id': user?.id || '',
          'X-User-Email': user?.emailAddresses?.[0]?.emailAddress || '',
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.details || 'Failed to analyze video');

      setUploadId(data.uploadId || '');
      setAnalysis(data.analysis || null);
      setCompressionPercent(data.compression?.defaultPercent || 70);
      setJobStatus('analyzed');
    } catch (err) {
      setError(err.message || 'Video analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartCompression = async () => {
    if (!uploadId) {
      setError('Please analyze the uploaded video first.');
      return;
    }

    setIsStartingCompression(true);
    setError('');
    setResult(null);

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/video-compressor/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-User-Id': user?.id || '',
          'X-User-Email': user?.emailAddresses?.[0]?.emailAddress || '',
        },
        body: JSON.stringify({
          uploadId,
          compressionPercent,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.details || 'Failed to start compression');

      setStrategy(data.strategy || 'Balanced');
      setJobId(data.jobId || '');
      setJobStatus('processing');
      setProgress(2);
    } catch (err) {
      setError(err.message || 'Compression failed to start');
    } finally {
      setIsStartingCompression(false);
    }
  };

  const handleDownload = async () => {
    if (!result?.url) return;

    try {
      const response = await fetch(`${API_BASE_URL}${result.url}`);
      if (!response.ok) throw new Error('Failed to download compressed video');

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = result.filename || `compressed_${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err.message || 'Download failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary-50 rounded-full">
            <Minimize2 className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Video Compressor</h1>
        <p className="text-gray-600">Compress video size with quality-first tuning and track progress in real time.</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 space-y-6">
    

        <div className="space-y-2">
          <label htmlFor="compress-video" className="block text-sm font-medium text-gray-700">Select Video File</label>
          <label
            htmlFor="compress-video"
            className="flex items-center justify-center w-full px-4 py-10 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-100 transition-colors"
          >
            <input
              id="compress-video"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideoInput}
            />
            <div className="text-center">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">{videoFile ? videoFile.name : 'Click to upload a video file'}</p>
              <p className="text-xs text-gray-500">MP4, WebM, MOV supported • Max 500MB</p>
            </div>
          </label>
        </div>

        {fileDetails && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 grid md:grid-cols-3 gap-3 text-sm">
            <p className="text-gray-700"><span className="font-semibold">Name:</span> {fileDetails.name}</p>
            <p className="text-gray-700"><span className="font-semibold">Size:</span> {fileDetails.size}</p>
            <p className="text-gray-700"><span className="font-semibold">Type:</span> {fileDetails.type}</p>
          </div>
        )}

        {videoPreviewUrl && (
          <div className="rounded-lg overflow-hidden border border-gray-200 bg-black">
            <video src={videoPreviewUrl} controls className="w-full h-auto max-h-[360px]" />
          </div>
        )}

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!videoFile || isAnalyzing || jobStatus === 'processing'}
          className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Gauge className="w-5 h-5" />}
          <span>{isAnalyzing ? 'Analyzing video...' : 'Run Pre-analysis'}</span>
        </button>

        {analysis && (
          <div className="rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileVideo className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Pre-analysis Results</h2>
            </div>
            <div className="grid md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-gray-500">Resolution</p>
                <p className="font-semibold text-gray-900">{analysis.resolution}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-gray-500">Bitrate</p>
                <p className="font-semibold text-gray-900">{analysis.bitrateKbps} kbps</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-gray-500">Duration</p>
                <p className="font-semibold text-gray-900">{analysis.durationSeconds}s</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-gray-500">Original Size</p>
                <p className="font-semibold text-gray-900">{analysis.fileSizeLabel}</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="compress-percent" className="font-medium text-gray-900">Compression Target</label>
                <span className="text-primary font-semibold">{compressionPercent}%</span>
              </div>
              <input
                id="compress-percent"
                type="range"
                min="30"
                max="90"
                step="1"
                value={compressionPercent}
                onChange={(event) => setCompressionPercent(Number(event.target.value))}
                className="w-full accent-primary"
                disabled={jobStatus === 'processing'}
              />
              <p className="text-xs text-gray-500">Default is 70%. Minimum supported reduction target is 30% to keep visual quality strong.</p>
            </div>

            <button
              type="button"
              onClick={handleStartCompression}
              disabled={isStartingCompression || jobStatus === 'processing'}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStartingCompression ? <Loader2 className="w-5 h-5 animate-spin" /> : <Minimize2 className="w-5 h-5" />}
              <span>{isStartingCompression ? 'Starting compression...' : 'Start Compression'}</span>
            </button>
          </div>
        )}

        {jobStatus === 'processing' && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-blue-900">Compression in progress</h3>
              <span className="text-sm font-semibold text-blue-700">{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${Math.max(2, progress)}%` }} />
            </div>
            <p className="text-sm text-blue-800">Strategy: {strategy}</p>
          </div>
        )}

        {result && jobStatus === 'completed' && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-green-900">Compression complete</h3>
                <p className="text-sm text-green-700">
                  Saved {result.savedPercent}% ({result.savedSizeLabel}) with {result.strategy} strategy.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-green-200 bg-white p-3">
                <p className="text-gray-500">Original Size</p>
                <p className="font-semibold text-gray-900">{result.inputSizeLabel}</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-white p-3">
                <p className="text-gray-500">Compressed Size</p>
                <p className="font-semibold text-gray-900">{result.outputSizeLabel}</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-white p-3">
                <p className="text-gray-500">Saved</p>
                <p className="font-semibold text-gray-900">{result.savedPercent}%</p>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden border border-gray-200 bg-black">
              <video src={`${API_BASE_URL}${result.url}`} controls className="w-full h-auto max-h-[360px]" />
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={handleDownload} className="btn-primary inline-flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span>Download Compressed Video</span>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Something went wrong</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}
      </div>

      <ToolInfoFaqSection toolKey="video-compressor" />
    </div>
  );
};

export default VideoCompressor;
