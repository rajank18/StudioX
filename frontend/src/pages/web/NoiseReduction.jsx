import React, { useState, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Upload, Download, Loader, CheckCircle, AlertCircle, Volume2, Mic, Sliders } from 'lucide-react';
import ToolInfoFaqSection from '../../components/web/ToolInfoFaqSection';

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

const NoiseReduction = () => {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);

  // Processing mode: 'preset' or 'custom'
  const [mode, setMode] = useState('preset');
  
  // Preset selection
  const [selectedPreset, setSelectedPreset] = useState('balanced');
  
  // Custom settings
  const [noiseReduction, setNoiseReduction] = useState(70);
  const [voiceEnhancement, setVoiceEnhancement] = useState(70);

  // Available presets
  const presets = {
    light: {
      name: 'Light',
      description: 'Subtle noise reduction for clean environments',
      icon: '🔇',
      useCases: ['Studio recordings', 'Quiet indoor spaces']
    },
    balanced: {
      name: 'Balanced',
      description: 'Moderate noise reduction for typical scenarios',
      icon: '🔊',
      useCases: ['General vlogs', 'Office recordings', 'Indoor events']
    },
    aggressive: {
      name: 'Aggressive',
      description: 'Maximum noise reduction for very noisy environments',
      icon: '💪',
      useCases: ['Busy streets', 'Crowded places', 'Construction sites']
    },
    speech: {
      name: 'Speech Focus',
      description: 'Optimized for clear speech in moderate noise',
      icon: '🎤',
      useCases: ['Interviews', 'Presentations', 'Lectures']
    },
    podcast: {
      name: 'Podcast',
      description: 'Professional podcast audio quality',
      icon: '🎙️',
      useCases: ['Podcast recordings', 'Voice-overs', 'Narration']
    }
  };

  const videoRef = useRef(null);
  const resultVideoRef = useRef(null);

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
    
    setFile(f);
    const url = URL.createObjectURL(f);
    setVideoUrl(url);
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Please select a video file');
      return;
    }

    setError('');
    setIsLoading(true);
    setResultUrl(null);
    setSuccess(false);
    setProgress(0);

    try {
      let token = null;
      try { token = await getToken(); } catch (e) { token = null; }

      const fd = new FormData();
      fd.append('video', file);

      let endpoint = '';
      if (mode === 'preset') {
        endpoint = 'http://localhost:3000/api/noise-reduction/preset';
        fd.append('preset', selectedPreset);
      } else {
        endpoint = 'http://localhost:3000/api/noise-reduction/custom';
        fd.append('noiseReduction', String(noiseReduction));
        fd.append('voiceEnhancement', String(voiceEnhancement));
      }

      const headers = {
        'X-User-Id': user?.id || '',
        'X-User-Email': user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Simulate progress (since we can't track FFmpeg progress from frontend)
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + Math.random() * 15, 95));
      }, 500);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: fd,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Processing failed');

      const fullUrl = `http://localhost:3000${data.url}`;
      setResultUrl(fullUrl);
      setSuccess(true);
      setIsLoading(false);
      
      // Clear selected file
      setFile(null);
      setVideoUrl('');
    } catch (err) {
      setError(err.message || 'Processing error');
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleDownload = async () => {
    if (!resultUrl) return;
    try {
      // Extract filename from URL
      const filename = resultUrl.split('/').pop();
      // Use dedicated download endpoint
      const downloadUrl = `http://localhost:3000/download/${filename}`;
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `clean_video_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message || 'Failed to download');
    }
  };

  const handleNewProcess = () => {
    setResultUrl(null);
    setSuccess(false);
    setError('');
    setFile(null);
    setVideoUrl('');
    setProgress(0);
  };

  const handleProcessAnother = () => {
    setResultUrl(null);
    setSuccess(false);
    setError('');
    setProgress(0);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary-50 rounded-full">
            <Volume2 className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">AI Noise Reduction</h1>
        <p className="text-gray-600">Remove background noise and enhance voice clarity using advanced audio processing</p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="space-y-6">
          {/* Upload Section */}
          {!(file || videoUrl || resultUrl) && (
            <div className="space-y-2">
              <label htmlFor="video-file" className="block text-sm font-medium text-gray-700">Select Video File</label>
              <div className="relative">
                <input
                  id="video-file"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  className="hidden"
                />
                <label
                  htmlFor="video-file"
                  className="flex items-center justify-center w-full px-4 py-12 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary-50 transition-colors"
                >
                  <div className="text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700">Click to upload a video file</p>
                    <p className="text-xs text-gray-500 mt-1">MP4, WebM, MOV supported • Max 500MB</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Video Preview & Settings */}
          {videoUrl && !resultUrl && (
            <div className="space-y-6">
              {/* Original Video Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Original Video</label>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full rounded-lg bg-black"
                  controls
                />
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Processing Mode</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setMode('preset')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                      mode === 'preset'
                        ? 'border-primary bg-primary-50 text-primary'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Mic className="w-5 h-5 mx-auto mb-1" />
                    Quick Presets
                  </button>
                  <button
                    onClick={() => setMode('custom')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                      mode === 'custom'
                        ? 'border-primary bg-primary-50 text-primary'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Sliders className="w-5 h-5 mx-auto mb-1" />
                    Custom Settings
                  </button>
                </div>
              </div>

              {/* Preset Mode */}
              {mode === 'preset' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Select Preset</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(presets).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedPreset(key)}
                        className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                          selectedPreset === key
                            ? 'border-primary bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{preset.icon}</span>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{preset.name}</h3>
                            <p className="text-xs text-gray-600 mt-1">{preset.description}</p>
                            <div className="mt-2 space-y-1">
                              {preset.useCases.map((useCase, idx) => (
                                <p key={idx} className="text-xs text-gray-500">• {useCase}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Mode */}
              {mode === 'custom' && (
                <div className="space-y-6">
                  {/* Noise Reduction Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">Noise Reduction</label>
                      <span className="text-sm font-semibold text-primary">{noiseReduction}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={noiseReduction}
                      onChange={(e) => setNoiseReduction(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Subtle</span>
                      <span>Moderate</span>
                      <span>Aggressive</span>
                    </div>
                  </div>

                  {/* Voice Enhancement Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">Voice Enhancement</label>
                      <span className="text-sm font-semibold text-primary">{voiceEnhancement}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={voiceEnhancement}
                      onChange={(e) => setVoiceEnhancement(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Natural</span>
                      <span>Balanced</span>
                      <span>Maximum</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processing Progress */}
          {isLoading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Processing audio...</span>
                <span className="font-semibold text-primary">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Applying advanced noise reduction filters...
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {!resultUrl ? (
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleProcess}
                disabled={isLoading || !file}
                className="flex-1 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
                <span>{isLoading ? 'Processing...' : 'Clean Audio'}</span>
              </button>

              <button
                onClick={handleNewProcess}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleDownload}
                className="flex-1 btn-primary flex items-center justify-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>Download Clean Video</span>
              </button>
              
              <button
                onClick={handleProcessAnother}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Process Again
              </button>

              <button
                onClick={handleNewProcess}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                New Video
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-900">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && resultUrl && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-green-900">Processing Complete!</h3>
                <p className="text-sm text-green-700">Your video with clean audio is ready. Compare below or download it.</p>
              </div>
            </div>
          )}

          {/* Result Preview */}
          {resultUrl && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Original */}
                {videoUrl && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Original (with noise)
                    </h3>
                    <video
                      src={videoUrl}
                      className="w-full rounded-lg bg-black shadow-md"
                      controls
                    />
                  </div>
                )}
                
                {/* Processed */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Processed (clean audio)
                  </h3>
                  <video
                    ref={resultVideoRef}
                    src={resultUrl}
                    className="w-full rounded-lg bg-black shadow-md"
                    controls
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ToolInfoFaqSection toolKey="noise-reduction" />
    </div>
  );
};

export default NoiseReduction;
