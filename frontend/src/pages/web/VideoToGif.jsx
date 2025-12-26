// VideoToGif.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Link2, Play, Pause, Download, Loader, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GIF from 'gif.js.optimized'; // make sure: npm install gif.js.optimized

const WORKER_SCRIPT = '/gif.worker.js'; // <-- put gif.worker.js into your public/ folder (or change this path)

const VideoToGif = () => {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [encodeProgress, setEncodeProgress] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const thumbsRef = useRef(null);
  const selectionRef = useRef(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [thumbsError, setThumbsError] = useState(false);
  const [startPercent, setStartPercent] = useState(0); // 0..1 for draggable selection
  const [dragging, setDragging] = useState(false);

  // Handle file upload (unchanged)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCurrentVideo(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // ======= Edited URL handling: validate before setting as currentVideo =======
  // Attempt to verify the provided URL is a direct video resource and playable.
  // If validation succeeds, sets currentVideo(url) and clears input.
  // If it fails, shows an alert and keeps the URL in input so user can correct it.
  const handleUrlSubmit = async () => {
    const url = (videoUrl || '').trim();
    if (!url) return;

    // quick rejection for obvious non-file URLs (optional)
    const lower = url.toLowerCase();
    // If it ends with common container extension, try directly (but still validate)
    const likelyFile = /\.(mp4|webm|ogg|mov|m4v|mkv)(\?.*)?$/.test(lower);

    // Create an offscreen video element to test the URL
    const off = document.createElement('video');
    off.muted = true;
    off.playsInline = true;
    // Try to allow crossOrigin — if server doesn't allow it, canvas read will still fail later.
    off.crossOrigin = 'anonymous';
    let settled = false;

    const cleanup = () => {
      try {
        off.pause();
        off.src = '';
      } catch (e) {}
    };

    const timeoutMs = 7000; // 7 seconds to decide
    try {
      const result = await new Promise((resolve, reject) => {
        const onLoadedMeta = () => {
          if (settled) return;
          settled = true;
          off.removeEventListener('loadedmetadata', onLoadedMeta);
          off.removeEventListener('error', onError);
          clearTimeout(timer);
          resolve({ ok: true, reason: 'loadedmetadata' });
        };
        const onError = (ev) => {
          if (settled) return;
          settled = true;
          off.removeEventListener('loadedmetadata', onLoadedMeta);
          off.removeEventListener('error', onError);
          clearTimeout(timer);
          // ev may be a MediaError; pass message
          const msg = ev && ev.target && ev.target.error && ev.target.error.message
            ? ev.target.error.message
            : 'Media failed to load';
          resolve({ ok: false, reason: 'error', message: msg });
        };
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          off.removeEventListener('loadedmetadata', onLoadedMeta);
          off.removeEventListener('error', onError);
          resolve({ ok: false, reason: 'timeout' });
        }, timeoutMs);

        off.addEventListener('loadedmetadata', onLoadedMeta, { once: true });
        off.addEventListener('error', onError, { once: true });

        // set src last to start loading
        try {
          off.src = url;
          // Some browsers require load() call
          off.load();
        } catch (err) {
          clearTimeout(timer);
          settled = true;
          resolve({ ok: false, reason: 'exception', message: String(err) });
        }
      });

      if (result.ok) {
        // URL is playable by <video>. Accept it.
        setCurrentVideo(url);
        setVideoUrl(''); // clear input now that it's loaded
        // cleanup offscreen
        cleanup();
        return;
      } else {
        // Not directly playable. Provide helpful message.
        // Common scenarios:
        // - URL is a YouTube/Vimeo watch page — not a direct file
        // - URL is direct but server blocks CORS (video can play in video tag but canvas will fail later)
        // - server doesn't return a video at that URL
        let friendly = 'Cannot load the provided URL as a direct video file.';
        if (result.reason === 'timeout') {
          friendly += ' Loading timed out — the URL may be slow or blocked.';
        } else if (result.reason === 'error') {
          friendly += ` Media error: ${result.message || 'unknown'}.`;
        } else if (result.reason === 'exception') {
          friendly += ` Error: ${result.message || 'invalid URL'}.`;
        }
        friendly += '\n\nUse one of:\n• A direct video file URL ending with .mp4/.webm/.ogg (and served with CORS allowed),\n• Upload a local file (recommended),\n• Or provide a downloadable link (server-side) — public watch pages (e.g., YouTube watch pages) will not work here.';
        // if likely file extension present, show a hint about CORS
        if (likelyFile && !result.ok) {
          friendly += '\n\nNote: even if the URL ends with .mp4, the server might block access via CORS. In that case upload the file or enable CORS on the server.';
        }
        alert(friendly);
        cleanup();
        return;
      }
    } catch (err) {
      cleanup();
      alert('Error validating URL: ' + (err?.message || err));
      return;
    }
  };

  // Update video metadata (unchanged)
  useEffect(() => {
    if (videoRef.current && currentVideo) {
      const handleLoadedMetadata = () => {
        const duration = videoRef.current.duration;
        setVideoDuration(duration);
        setEndTime(Math.min(5, duration));
        setStartPercent(0);
        setStartTime(0);
        // generate thumbnails (best-effort)
        generateThumbnails();
      };
      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => {
        videoRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [currentVideo]);

  // Generate thumbnails (unchanged)
  const generateThumbnails = async () => {
    setThumbsError(false);
    setThumbnails([]);
    if (!currentVideo) return;
    try {
      const off = document.createElement('video');
      off.crossOrigin = 'anonymous';
      off.muted = true;
      off.src = currentVideo;
      await new Promise((res, rej) => {
        const onload = () => res();
        const onerr = () => rej(new Error('Failed loading offscreen video'));
        off.addEventListener('loadedmetadata', onload, { once: true });
        off.addEventListener('error', onerr, { once: true });
      });

      const duration = off.duration || videoDuration || 0;
      if (!duration || !isFinite(duration)) return;

      const maxThumbs = Math.min(24, Math.max(6, Math.floor(duration)));
      const times = [];
      for (let i = 0; i < maxThumbs; i++) times.push((i / (maxThumbs - 1)) * duration);

      const thumbCanvas = document.createElement('canvas');
      const thumbCtx = thumbCanvas.getContext('2d');
      const thumbW = 120;
      const thumbH = 68;
      thumbCanvas.width = thumbW;
      thumbCanvas.height = thumbH;

      const results = [];
      for (const t of times) {
        off.currentTime = Math.min(t, duration - 0.01);
        await new Promise((res) => {
          const onseek = () => {
            try {
              thumbCtx.drawImage(off, 0, 0, thumbW, thumbH);
              const data = thumbCanvas.toDataURL('image/jpeg', 0.6);
              results.push(data);
            } catch (err) {
              console.warn('Thumbnail generation failed (CORS?)', err);
              setThumbsError(true);
              results.length = 0;
            }
            off.removeEventListener('seeked', onseek);
            setTimeout(res, 10);
          };
          off.addEventListener('seeked', onseek, { once: true });
        });
        if (thumbsError) break;
      }
      setThumbnails(results);
    } catch (err) {
      console.warn('generateThumbnails error', err);
      setThumbsError(true);
      setThumbnails([]);
    }
  };

  // Keep startTime/endTime in sync when startPercent changes (unchanged)
  useEffect(() => {
    if (!videoDuration) return;
    const newStart = Math.max(0, Math.min(1, startPercent)) * Math.max(0, videoDuration - 5);
    setStartTime(newStart);
    setEndTime(Math.min(newStart + 5, videoDuration));
  }, [startPercent, videoDuration]);

  // Pointer handlers (unchanged)
  const onPointerDownSelection = (e) => {
    if (!thumbsRef.current) return;
    e.preventDefault();
    setDragging(true);
  };

  const onPointerMoveSelection = (e) => {
    if (!dragging || !thumbsRef.current) return;
    const rect = thumbsRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let percent = x / rect.width;
    const selWidth = videoDuration ? Math.min(1, 5 / videoDuration) : 0;
    percent = Math.max(0, Math.min(1 - selWidth, percent));
    setStartPercent(percent);
  };

  const onPointerUpSelection = (e) => {
    if (!dragging) return;
    setDragging(false);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('pointermove', onPointerMoveSelection);
      window.addEventListener('pointerup', onPointerUpSelection);
    }
    return () => {
      window.removeEventListener('pointermove', onPointerMoveSelection);
      window.removeEventListener('pointerup', onPointerUpSelection);
    };
  }, [dragging, videoDuration]);

  // Update current time as video plays (unchanged)
  useEffect(() => {
    if (!videoRef.current) return;
    const handleTimeUpdate = () => {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.currentTime >= endTime) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };
    videoRef.current.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      videoRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [endTime]);

  // Play/Pause control (unchanged)
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.currentTime = Math.max(startTime, videoRef.current.currentTime);
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Start/end handlers (unchanged)
  const handleStartTimeChange = (value) => {
    const newStart = parseFloat(value);
    if (newStart < endTime) {
      setStartTime(newStart);
      if (videoRef.current) videoRef.current.currentTime = newStart;
    }
  };
  const handleEndTimeChange = (value) => {
    const newEnd = parseFloat(value);
    if (newEnd > startTime && newEnd <= videoDuration) setEndTime(newEnd);
  };

  // generateGif (unchanged from your final working version)
  const generateGif = async () => {
    if (!videoRef.current) return;
    setIsLoading(true);
    setEncodeProgress(0);

    try {
      // 1) Ensure worker script is reachable (common pitfall)
      try {
        const resp = await fetch(WORKER_SCRIPT, { method: 'HEAD' });
        if (!resp.ok) {
          throw new Error(`Worker script not reachable (status ${resp.status})`);
        }
      } catch (err) {
        throw new Error(
          `Cannot reach gif worker at "${WORKER_SCRIPT}".\nPlace gif.worker.js in your public/ folder or update WORKER_SCRIPT path.\nOriginal: ${err.message}`
        );
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Choose a safe size for canvas to reduce memory (you can keep original if you want)
      const maxWidth = 640;
      const vidW = video.videoWidth || 640;
      const vidH = video.videoHeight || 360;
      if (vidW > maxWidth) {
        const ratio = vidH / vidW;
        canvas.width = maxWidth;
        canvas.height = Math.round(maxWidth * ratio);
      } else {
        canvas.width = vidW;
        canvas.height = vidH;
      }

      // 2) Extract frames
      const fps = 10;
      const desiredDuration = Math.max(0.001, endTime - startTime);
      const totalFrames = Math.ceil(desiredDuration * fps);
      if (totalFrames <= 0) throw new Error('Invalid duration (0 frames).');

      const frames = [];
      console.log(`[GIF] extracting frames: ${totalFrames} frames @ ${fps}fps`);
      for (let i = 0; i < totalFrames; i++) {
        const time = startTime + (i / fps);
        const seekTime = Math.min(time, endTime - 0.001);
        video.currentTime = seekTime;

        // Wait for seek + draw (with timeout)
        await new Promise((resolve, reject) => {
          let settled = false;
          const onSeeked = () => {
            try {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              frames.push(canvas.toDataURL('image/png'));
              settled = true;
              video.removeEventListener('seeked', onSeeked);
              resolve();
            } catch (err) {
              video.removeEventListener('seeked', onSeeked);
              reject(err);
            }
          };
          video.addEventListener('seeked', onSeeked, { once: true });
          // safety timeout for cross-origin or unsupported cases
          setTimeout(() => {
            if (!settled) {
              video.removeEventListener('seeked', onSeeked);
              reject(new Error('Timeout waiting for video seek. If using remote URL, CORS may block reading frames.'));
            }
          }, 5000);
        });
      }

      if (frames.length === 0) throw new Error('No frames extracted (CORS or invalid video).');

      // 3) Set up GIF encoder
      const gif = new GIF({
        workers: 2,
        workerScript: WORKER_SCRIPT,
        quality: 10,
        width: canvas.width,
        height: canvas.height,
      });

      gif.on('progress', (p) => {
        console.log(`[GIF] progress ${(p * 100).toFixed(1)}%`);
        setEncodeProgress(p);
      });

      let finished = false;
      const finishedPromise = new Promise((resolve, reject) => {
        gif.on('finished', (blob) => {
          finished = true;
          try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `video-to-gif-${Date.now()}.gif`;
            document.body.appendChild(a);
            const evt = new MouseEvent('click', { view: window, bubbles: true, cancelable: true });
            a.dispatchEvent(evt);
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            resolve();
          } catch (err) {
            reject(err);
          }
        });

        gif.on('error', (err) => {
          reject(err || new Error('Unknown GIF encoding error'));
        });

        gif.on('abort', () => {
          reject(new Error('GIF encoding aborted'));
        });
      });

      // 4) Add frames
      for (let i = 0; i < frames.length; i++) {
        await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              gif.addFrame(img, { delay: Math.round(1000 / fps) });
              resolve();
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = () => {
            reject(new Error('Failed to load frame image for encoding. Possibly CORS or corrupt data.'));
          };
          img.src = frames[i];
        });
      }

      // 5) render
      gif.render();
      await finishedPromise;

      console.log('[GIF] done');
      setIsLoading(false);
      setEncodeProgress(0);
    } catch (err) {
      console.error('[generateGif] error:', err);
      if (String(err).toLowerCase().includes('cors')) {
        alert('Error: CORS prevented reading video frames. Use a local upload or a URL with CORS enabled.');
      } else {
        alert('Error generating GIF: ' + (err?.message || err));
      }
      setIsLoading(false);
      setEncodeProgress(0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    const secsStr = secs.toString().padStart(5, '0');
    return `${mins}:${secsStr}`;
  };

  // --- Remainder of your original JSX UI is unchanged ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/home')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Video to GIF Converter</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {!currentVideo ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-8"
          >
            <div className="bg-white rounded-2xl p-8 border border-gray-200 space-y-6">
              {/* Upload Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Upload Video</h2>
                <div className="border-2 border-dashed border-emerald-300 rounded-2xl p-12 text-center hover:border-emerald-500 hover:bg-emerald-50/50 transition-all cursor-pointer group">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="videoUpload"
                  />
                  <label htmlFor="videoUpload" className="cursor-pointer block">
                    <Upload className="w-16 h-16 text-emerald-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                    <p className="text-lg text-gray-700 font-semibold mb-1">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">MP4, WebM, or other video formats (Max 500MB)</p>
                  </label>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-gray-500 font-medium text-sm">OR</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>

              {/* URL Input Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Video URL</h2>
                <p className="text-sm text-gray-600">Paste a video URL from a public source</p>
                <div className="flex gap-3">
                  <input
                    type="url"
                    placeholder="https://example.com/video.mp4"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleUrlSubmit}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  >
                    <Link2 className="w-5 h-5" />
                    Load
                  </button>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">About Video to GIF</h3>
                <p className="text-sm text-blue-800">Convert any video to a 5-second GIF. Perfect for social media, presentations, and more.</p>
              </div>
              <div className="bg-purple-50 rounded-2xl p-6 border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2">How it works</h3>
                <p className="text-sm text-purple-800">Upload or paste a video URL, select your 5-second segment, and download your GIF instantly.</p>
              </div>
            </div>
          </motion.div>
        ) : (
          // ... the rest of the UI (player, trim, actions) remains unchanged from your file.
          // For brevity I assume it is identical to what you already have and included above.
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
            {/* Video Player Section */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Video Preview</h2>
              <div className="bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  src={currentVideo}
                  className="w-full max-h-96 object-contain"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
              {/* ... (rest of controls and UI are unchanged) */}
              <div className="flex gap-3 items-center">
                <button
                  onClick={() => setCurrentVideo(null)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Choose Different Video
                </button>
                <button
                  onClick={generateGif}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Generating GIF...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Convert to GIF & Download
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VideoToGif;
