import React, { useState, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, Loader, ArrowLeft, CheckCircle, AlertCircle, Link } from 'lucide-react';

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB, match backend

const VideoToGif = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // YouTube link support
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoadingYt, setIsLoadingYt] = useState(false);
  // metadata returned from backend after you download the yt video (filename, sizeBytes, etc.)
  const [ytFileMeta, setYtFileMeta] = useState(null);

  const videoRef = useRef(null);

  // Timeline UI refs & state
  const timelineRef = useRef(null);
  const selectionRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startLeft: 0 });

  const [thumbnails, setThumbnails] = useState([]);
  const [thumbsError, setThumbsError] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Keep track of the last generated object URL so we can revoke it to free memory
  const objectUrlRef = useRef(null);

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
    setStartTime(0);
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
          'X-User-Email': user?.primaryEmailAddress || user?.emailAddresses?.[0]?.emailAddress || '',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: youtubeUrl.trim(), quality }),
      });

      const dlData = await dlRes.json();
      if (!dlRes.ok) throw new Error(dlData.error || 'YouTube download failed');

      const file = dlData.file;
      const fullUrl = `http://localhost:3000${file.url}`;

      // Use downloaded file for preview/timeline. We do NOT automatically convert here.
      setVideoUrl(fullUrl);
      setFile(null);
      setStartTime(0);
      setYtFileMeta(file);
    } catch (err) {
      setError(err.message || 'YouTube download failed');
    } finally {
      setIsLoadingYt(false);
    }
  };

  const onLoadedMetadata = () => {
    const dur = videoRef.current?.duration || 0;
    setVideoDuration(dur);
    setStartTime(0);
    // Ensure timeline width is measured once metadata loads (layout can shift)
    const el = timelineRef.current;
    if (el) setTimeout(() => setContainerWidth(Math.floor(el.clientWidth || 0)), 50);
  };

  const handleConvert = async () => {
    if (!file && !videoUrl) return setError('Please select a video or provide a YouTube link before converting');
    setError('');
    setIsLoading(true);
    setResultUrl(null);
    setSuccess(false);

    try {
      // Only set Authorization header if token available (avoids empty header causing preflight issues)
      let token = null;
      try { token = await getToken(); } catch (e) { token = null; }

      // If user provided a YouTube link (downloaded to server and exposed as a public URL),
      // fetch that file from the server as a Blob and construct a File to send via FormData.
      let uploadFile = file;
      if (!uploadFile && videoUrl) {
        const resp = await fetch(videoUrl);
        if (!resp.ok) throw new Error('Failed to fetch video from server');
        const blob = await resp.blob();
        if (blob.size > MAX_BYTES) throw new Error('File is too large (max 500MB)');
        const filename = (ytFileMeta && ytFileMeta.filename) || videoUrl.split('/').pop() || 'video.mp4';
        uploadFile = new File([blob], filename, { type: blob.type || 'video/mp4' });
      }

      const fd = new FormData();
      fd.append('video', uploadFile);
      fd.append('startTime', String(Math.max(0, parseFloat(startTime) || 0)));

      const headers = {
        'X-User-Id': user?.id || '',
        'X-User-Email': user?.primaryEmailAddress || user?.emailAddresses?.[0]?.emailAddress || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('http://localhost:3000/api/video/to-gif', {
        method: 'POST',
        headers,
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');

      const fullUrl = `http://localhost:3000${data.url}`;
      setResultUrl(fullUrl);
      setSuccess(true);
      setIsLoading(false);
      // clear selected file so user can start over easily
      setFile(null);
      setVideoUrl('');
      setYtFileMeta(null);
      setYoutubeUrl('');
    } catch (err) {
      setError(err.message || 'Conversion error');
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
      a.download = resultUrl.split('/').pop();
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // After successful download, reset UI so upload box returns
      setResultUrl(null);
      setSuccess(false);
      setError('');
      setFile(null);
      setVideoUrl('');
    } catch (err) {
      setError(err.message || 'Failed to download');
    }
  };

  // ---------- Timeline helpers & handlers ----------

  const formatTime = (seconds) => {
    const s = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Derived layout values
  // Math explanation:
  // - selectionWidthPx: width in pixels of the 5-second window on the timeline.
  //   selectionWidthPx = (5 seconds / videoDuration) * containerWidth. If videoDuration <= 5,
  //   the window fills the timeline. We enforce a min pixel width for usability.
  // - startLeftPx: left position (px) of the window = (startTime / videoDuration) * containerWidth,
  //   clamped so that the window does not overflow the timeline. Corresponding allowed startTime
  //   range is [0, videoDuration - 5]. The maxLeftPx equals containerWidth - selectionWidthPx.
  const minSelPx = 56; // minimum px width for the draggable window (for usability)
  const selectionWidthPx = (() => {
    if (!containerWidth || !videoDuration) return Math.max(minSelPx, (5 / 5) * minSelPx);
    if (videoDuration <= 5) return containerWidth; // full timeline
    return Math.max(minSelPx, (5 / videoDuration) * containerWidth);
  })();

  const maxLeftPx = Math.max(0, containerWidth - selectionWidthPx);

  const startLeftPx = (() => {
    if (!containerWidth || !videoDuration) return 0;
    if (videoDuration <= 5) return 0;
    // Map startTime (0 .. videoDuration-5) to left px clamped to [0, maxLeftPx]
    const ratio = startTime / Math.max(1, videoDuration);
    const px = ratio * containerWidth;
    return Math.max(0, Math.min(px, maxLeftPx));
  })();

  const leftOverlayWidth = Math.max(0, startLeftPx);
  const rightOverlayWidth = Math.max(0, Math.round(containerWidth - (startLeftPx + selectionWidthPx)));

  // Resize observer to track timeline width
  React.useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;

    const update = () => setContainerWidth(Math.floor(el.clientWidth || 0));
    // Force-measure now and a couple of short retries to ensure layout has settled after video load
    update();
    setTimeout(update, 50);
    setTimeout(update, 150);

    let ro;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(update);
      ro.observe(el);
    } else {
      window.addEventListener('resize', update);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', update);
    };
  }, [timelineRef, videoUrl, thumbnails.length]);

  // Generate thumbnails across the duration (best-effort). Falls back on failure (CORS).
  React.useEffect(() => {
    let cancelled = false;
    const gen = async () => {
      setThumbsError(false);
      setThumbnails([]);
      if (!videoUrl || !videoDuration || !containerWidth) return;

      // Decide how many thumbnails to generate based on width
      const approxThumbW = 120; // px per thumb
      const count = Math.max(6, Math.min(24, Math.round(containerWidth / approxThumbW)));

      const off = document.createElement('video');
      off.crossOrigin = 'anonymous';
      off.muted = true;
      off.src = videoUrl;

      try {
        await new Promise((res, rej) => {
          const onLoaded = () => res();
          const onErr = () => rej(new Error('Failed to load video for thumbs'));
          off.addEventListener('loadedmetadata', onLoaded, { once: true });
          off.addEventListener('error', onErr, { once: true });
          off.load();
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const thumbH = 72;
        const thumbW = Math.max(80, Math.round(containerWidth / count));
        canvas.width = thumbW;
        canvas.height = thumbH;

        const results = [];
        for (let i = 0; i < count; i++) {
          if (cancelled) return;
          const t = Math.min(videoDuration - 0.01, (i / Math.max(1, count - 1)) * videoDuration);
          off.currentTime = Math.max(0, t - 0.01);

          await new Promise((res, rej) => {
            const onSeeked = () => {
              try {
                ctx.drawImage(off, 0, 0, thumbW, thumbH);
                results.push(canvas.toDataURL('image/jpeg', 0.6));
                res();
              } catch (err) {
                rej(err);
              }
            };
            const onErr = () => rej(new Error('Seek failed'));
            off.addEventListener('seeked', onSeeked, { once: true });
            off.addEventListener('error', onErr, { once: true });
            // safety timeout for cross-origin or other failures
            setTimeout(() => rej(new Error('Thumbnail generation timeout')), 3000);
          }).catch((err) => {
            // if any frame fails (commonly CORS), stop and fallback
            console.warn('[VideoToGif] thumbnail generation failed:', err);
            setThumbsError(true);
          });

          if (thumbsError) break;
        }

        if (!cancelled && !thumbsError) {
          setThumbnails(results);
        }
      } catch (err) {
        console.warn('[VideoToGif] thumbs error', err);
        setThumbsError(true);
      }
    };

    gen();
    return () => { cancelled = true; };
  }, [videoUrl, videoDuration, containerWidth]);

  // Pointer dragging handlers (declarative handlers only)
  // Use pointer capture on the selection element and fall back to touch handlers for environments
  // that don't provide stable PointerEvent support. No manual window addEventListener calls here.

  const rafRef = useRef(null);
  const pendingLeftRef = useRef(null);
  const activePointerIdRef = useRef(null);

  const onPointerDown = (e) => {
    if (!timelineRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    // Capture this pointer on the selection element so we receive move/up events even if pointer leaves
    try { selectionRef.current?.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }

    activePointerIdRef.current = e.pointerId;
    dragRef.current = { active: true, startX: e.clientX, startLeft: startLeftPx };
    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.active) return;
    // If pointerId is set, ensure same pointer controls the drag
    if (activePointerIdRef.current && e.pointerId !== activePointerIdRef.current) return;
    e.preventDefault();

    const dx = e.clientX - dragRef.current.startX;
    let newLeft = dragRef.current.startLeft + dx;
    newLeft = Math.max(0, Math.min(newLeft, maxLeftPx));
    pendingLeftRef.current = newLeft;

    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const left = pendingLeftRef.current;
        pendingLeftRef.current = null;
        if (left == null) return;
        let newStart = (left / Math.max(1, containerWidth)) * videoDuration;
        newStart = Math.max(0, Math.min(newStart, Math.max(0, videoDuration - 5)));
        setStartTime(newStart);
      });
    }
  };

  const onPointerUp = (e) => {
    if (activePointerIdRef.current && e.pointerId !== activePointerIdRef.current) return;
    dragRef.current.active = false;
    activePointerIdRef.current = null;
    setIsDragging(false);
    try { selectionRef.current?.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; pendingLeftRef.current = null; }
    document.body.style.cursor = '';
  };

  // Touch fallback handlers for environments without PointerEvent support or where touch is unreliable
  const onTouchStart = (e) => {
    if (!timelineRef.current) return;
    const t = e.touches[0];
    e.preventDefault();
    e.stopPropagation();
    activePointerIdRef.current = 'touch';
    dragRef.current = { active: true, startX: t.clientX, startLeft: startLeftPx };
    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
  };

  const onTouchMove = (e) => {
    if (!dragRef.current.active) return;
    const t = e.touches[0];
    e.preventDefault();
    const dx = t.clientX - dragRef.current.startX;
    let newLeft = dragRef.current.startLeft + dx;
    newLeft = Math.max(0, Math.min(newLeft, maxLeftPx));
    pendingLeftRef.current = newLeft;

    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const left = pendingLeftRef.current;
        pendingLeftRef.current = null;
        if (left == null) return;
        let newStart = (left / Math.max(1, containerWidth)) * videoDuration;
        newStart = Math.max(0, Math.min(newStart, Math.max(0, videoDuration - 5)));
        setStartTime(newStart);
      });
    }
  };

  const onTouchEnd = (e) => {
    dragRef.current.active = false;
    activePointerIdRef.current = null;
    setIsDragging(false);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; pendingLeftRef.current = null; }
    document.body.style.cursor = '';
  };

  // Allow quick jump by tapping/clicking timeline background (ignore clicks on selection itself)
  const onTimelineClick = (e) => {
    if (!timelineRef.current) return;
    if (selectionRef.current && selectionRef.current.contains(e.target)) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // center selection on clicked x
    const desiredLeft = Math.max(0, Math.min(x - selectionWidthPx / 2, maxLeftPx));
    const newStart = (desiredLeft / Math.max(1, containerWidth)) * videoDuration;
    setStartTime(Math.max(0, Math.min(newStart, Math.max(0, videoDuration - 5))));
  };

  // Revoke object URL when the selected file is cleared to free memory
  React.useEffect(() => {
    if (objectUrlRef.current && !videoUrl) {
      try { URL.revokeObjectURL(objectUrlRef.current); } catch (e) {}
      objectUrlRef.current = null;
    }
  }, [videoUrl]);

  // When a local file is selected, store its URL so we can revoke later
  React.useEffect(() => {
    if (file && videoUrl && videoUrl.startsWith('blob:')) {
      objectUrlRef.current = videoUrl;
    }
  }, [file, videoUrl]);

  // Keep startTime clamped if videoDuration changes
  React.useEffect(() => {
    if (!videoDuration) return;
    if (videoDuration <= 5) {
      setStartTime(0);
    } else {
      setStartTime((s) => Math.max(0, Math.min(s, videoDuration - 5)));
    }
  }, [videoDuration]);

  // Timeline drag state for declarative handlers
  const timelineDragRef = useRef({ active: false, startX: 0, initialLeft: 0, moved: false, pointerId: null });

  // Timeline pointer/touch handlers
  // Behavior:
  // - On pointerdown (outside selection) we start a timeline drag but DO NOT immediately jump.
  // - If pointer moves beyond a small threshold we treat it as a drag and move the selection continuously.
  // - On pointerup: if there was no movement it's a tap -> perform jump to center under pointer.
  const onTimelinePointerDown = (e) => {
    if (!timelineRef.current) return;
    // don't initiate timeline drag if user pressed inside selection (selection stops propagation in capture)
    if (selectionRef.current && selectionRef.current.contains(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    // init drag
    timelineDragRef.current = { active: true, startX: e.clientX, initialLeft: startLeftPx, moved: false, pointerId: e.pointerId };

    // capture pointer on the timeline so we receive move/up events
    try { timelineRef.current.setPointerCapture(e.pointerId); } catch (err) {}
  };

  const onTimelinePointerMove = (e) => {
    if (!timelineDragRef.current.active) return;
    if (timelineDragRef.current.pointerId && timelineDragRef.current.pointerId !== e.pointerId) return;
    e.preventDefault();

    const dx = e.clientX - timelineDragRef.current.startX;
    if (Math.abs(dx) > 3) timelineDragRef.current.moved = true; // threshold

    let newLeft = timelineDragRef.current.initialLeft + dx;
    newLeft = Math.max(0, Math.min(newLeft, maxLeftPx));

    // map px to time
    let newStart = (newLeft / Math.max(1, containerWidth)) * videoDuration;
    newStart = Math.max(0, Math.min(newStart, Math.max(0, videoDuration - 5)));
    setStartTime(newStart);
  };

  const onTimelinePointerUp = (e) => {
    if (!timelineDragRef.current.active) return;
    if (timelineDragRef.current.pointerId && timelineDragRef.current.pointerId !== e.pointerId) return;

    const moved = timelineDragRef.current.moved;
    const startX = timelineDragRef.current.startX;

    // release pointer capture
    try { timelineRef.current.releasePointerCapture(e.pointerId); } catch (err) {}

    timelineDragRef.current = { active: false, startX: 0, initialLeft: 0, moved: false, pointerId: null };

    // If it was a tap (no movement), jump to clicked pos
    if (!moved) {
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const desiredLeft = Math.max(0, Math.min(x - selectionWidthPx / 2, maxLeftPx));
      const newStart = (desiredLeft / Math.max(1, containerWidth)) * videoDuration;
      setStartTime(Math.max(0, Math.min(newStart, Math.max(0, videoDuration - 5))));
    }
  };

  // Touch fallbacks for timeline
  const onTimelineTouchStart = (e) => {
    if (!timelineRef.current) return;
    if (selectionRef.current && selectionRef.current.contains(e.target)) return;
    const t = e.touches[0];
    timelineDragRef.current = { active: true, startX: t.clientX, initialLeft: startLeftPx, moved: false, pointerId: 'touch' };
  };

  const onTimelineTouchMove = (e) => {
    if (!timelineDragRef.current.active) return;
    const t = e.touches[0];
    const dx = t.clientX - timelineDragRef.current.startX;
    if (Math.abs(dx) > 3) timelineDragRef.current.moved = true;
    let newLeft = timelineDragRef.current.initialLeft + dx;
    newLeft = Math.max(0, Math.min(newLeft, maxLeftPx));
    let newStart = (newLeft / Math.max(1, containerWidth)) * videoDuration;
    newStart = Math.max(0, Math.min(newStart, Math.max(0, videoDuration - 5)));
    setStartTime(newStart);
  };

  const onTimelineTouchEnd = (e) => {
    if (!timelineDragRef.current.active) return;
    const moved = timelineDragRef.current.moved;
    timelineDragRef.current = { active: false, startX: 0, initialLeft: 0, moved: false, pointerId: null };
    if (!moved) {
      // treat as tap
      const rect = timelineRef.current.getBoundingClientRect();
      // use last touch point if available
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      const x = t.clientX - rect.left;
      const desiredLeft = Math.max(0, Math.min(x - selectionWidthPx / 2, maxLeftPx));
      const newStart = (desiredLeft / Math.max(1, containerWidth)) * videoDuration;
      setStartTime(Math.max(0, Math.min(newStart, Math.max(0, videoDuration - 5))));
    }
  };

  // ---------- End timeline helpers ----------

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary-50 rounded-full">
            <Upload className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Video to GIF</h1>
        <p className="text-gray-600">Upload a short video and convert any 5-second segment into a smooth GIF.</p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="space-y-6">
          {/* Upload Section - hidden when a file is selected or when a result is present */}
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
                  className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary-50 transition-colors"
                >
                  <div className="text-center">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">Click to upload a video file</p>
                    <p className="text-xs text-gray-500">MP4, WebM, MOV supported • Max 500MB</p>
                  </div>
                </label>
              </div>

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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                    disabled={isLoading || isLoadingYt}
                  />
                  <button
                    onClick={handleUseLink}
                    disabled={isLoadingYt || !youtubeUrl.trim()}
                    className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isLoadingYt ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <Link className="w-4 h-4 text-primary" />}
                    <span className="ml-1">Use link</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">No upload needed — we will download the video and let you choose the 5s segment (max 500MB).</p>
              </div>
            </div>
          )}

          {/* Video preview & timeline-based 5s selection (responsive) */}
          {videoUrl && (
            <div>
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full rounded-lg bg-black"
                controls
                onLoadedMetadata={onLoadedMetadata}
              />

              {/* Timeline container */}
              <div className="mt-4">
                <div className="text-sm text-gray-700 mb-2 flex items-center justify-between">
                  <div className="font-medium">Selection: <span className="text-gray-600">{formatTime(startTime)} → {formatTime(Math.min(startTime + 5, videoDuration))}</span></div>
                  <div className="text-xs text-gray-500">Drag the 5s window to set start time</div>
                </div>

                <div
                  ref={timelineRef}
                  onPointerDown={onTimelinePointerDown}
                  onPointerMove={onTimelinePointerMove}
                  onPointerUp={onTimelinePointerUp}
                  onTouchStart={onTimelineTouchStart}
                  onTouchMove={onTimelineTouchMove}
                  onTouchEnd={onTimelineTouchEnd}
                  className="relative w-full h-28 md:h-24 rounded-lg overflow-hidden bg-gray-100"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none' }}
                >
                  {/* Thumbnails row (fallback to plain bar when thumbsError) */}
                  {!thumbsError ? (
                    <div className="absolute inset-0 flex items-stretch">
                      {thumbnails.length > 0 ? (
                        thumbnails.map((t, i) => (
                          <div key={i} style={{ flex: 1 }} className="h-full bg-black/5">
                            <img src={t} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                          </div>
                        ))
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
                      )}
                    </div>
                  ) : (
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
                  )}

                  {/* Dim overlays (left & right unselected areas) */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="left-overlay" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${leftOverlayWidth}px`, background: 'rgba(0,0,0,0.45)' }} />
                    <div className="right-overlay" style={{ position: 'absolute', left: `${startLeftPx + selectionWidthPx}px`, top: 0, bottom: 0, right: 0, background: 'rgba(0,0,0,0.45)' }} />
                  </div>

                  {/* Fixed 5s draggable window */}
                  <div
                    ref={selectionRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    role="slider"
                    tabIndex={0}
                    aria-valuemin={0}
                    aria-valuemax={Math.max(0, videoDuration - 5)}
                    aria-valuenow={startTime}
                    className="absolute top-1/2 -translate-y-1/2 h-20 md:h-16 rounded-lg shadow-lg flex items-center justify-center"
                    style={{
                      left: startLeftPx + 'px',
                      width: selectionWidthPx + 'px',
                      cursor: isDragging ? 'grabbing' : 'grab',
                      boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
                      border: '2px solid rgba(255,255,255,0.9)',
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                      backdropFilter: 'blur(2px)',
                      touchAction: 'none',
                      zIndex: 50,
                      pointerEvents: 'auto'
                    }}
                    onKeyDown={(ev) => {
                      // Keyboard nudges: left/right arrows nudge startTime by 0.5s
                      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
                        ev.preventDefault();
                        const delta = ev.key === 'ArrowLeft' ? -0.5 : 0.5;
                        setStartTime((s) => Math.max(0, Math.min(s + delta, Math.max(0, videoDuration - 5))));
                      }
                    }}
                    onPointerDownCapture={(ev) => {
                      // stop propagation in capture phase to ensure timeline doesn't react
                      ev.stopPropagation();
                    }}
                  >
                    <div className="pointer-events-none text-sm text-white font-medium drop-shadow">{formatTime(startTime)} → {formatTime(Math.min(startTime + 5, videoDuration))}</div>

                    {/* Tooltip while dragging */}
                    {isDragging && (
                      <div className="absolute -top-8 px-2 py-1 rounded bg-black text-white text-xs drop-shadow">Start: {formatTime(startTime)} → End: {formatTime(Math.min(startTime + 5, videoDuration))}</div>
                    )}
                  </div>

                  {/* Selection touch fallback handlers are attached so touch devices can drag reliably */}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleConvert}
              disabled={isLoading || !(file || videoUrl)}
              className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
              <span>{isLoading ? 'Converting...' : 'Convert to GIF & Download'}</span>
            </button>

            <button
              onClick={() => { setFile(null); setVideoUrl(''); setResultUrl(null); setError(''); setSuccess(false); }}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>

            {resultUrl && (
              <button onClick={handleDownload} className="ml-auto inline-flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-600 transition-colors">
                <Download className="w-4 h-4" />
                <span>Download GIF</span>
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-900">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && resultUrl && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-green-900">Conversion Complete!</h3>
                <p className="text-sm text-green-700">Your GIF is ready. Preview below or download it.</p>
              </div>
            </div>
          )}

          {/* Result Preview */}
          {resultUrl && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Result</h3>
              <img src={resultUrl} alt="result gif" className="w-full rounded shadow" />
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3">How it works</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Upload a video file (MP4, WebM, MOV)</li>
          <li>• Choose the start time for a 5-second GIF</li>
          <li>• GIF is generated on the server using FFmpeg at 10 FPS</li>
          <li>• GIFs are available for a short time for download</li>
        </ul>
      </div>
    </div>
  );
};

export default VideoToGif;