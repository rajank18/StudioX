import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Download, Trash2, Play, Calendar, HardDrive, 
  Video, FileText, AlertCircle, Loader, Volume2, 
  VolumeX, Image, Film, Trash, X, Eye, Copy, Check
} from 'lucide-react';
import { API_BASE_URL, getMediaUrl } from '../../config/api';

const Projects = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [imgErrors, setImgErrors] = useState({});
  const [previewItem, setPreviewItem] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textCopied, setTextCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('studiox-theme') === 'dark';
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    fetchUserVideos();
  }, []);

  useEffect(() => {
    const onThemeUpdated = (event) => {
      const nextTheme = event?.detail?.theme;
      if (nextTheme === 'dark' || nextTheme === 'light') {
        setIsDarkMode(nextTheme === 'dark');
      }
    };

    window.addEventListener('studiox-theme-change', onThemeUpdated);
    return () => window.removeEventListener('studiox-theme-change', onThemeUpdated);
  }, []);

  const fetchUserVideos = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/video/user/videos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': user?.id || '',
          'X-User-Email': user?.emailAddresses?.[0]?.emailAddress || '',
        },
      });

      // if (!response.ok) {
      //   throw new Error('Failed to fetch videos');
      // }

      const data = await response.json();
      setVideos(data.videos || []);
      setError(''); // Clear error on success
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (video) => {
    try {
      const response = await fetch(getMediaUrl(video.publicUrl));
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = video.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download: ' + err.message);
    }
  };

  const handleDelete = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      setDeletingId(videoId);
      setError(''); // Clear any previous errors
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/video/user/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': user?.id || '',
          'X-User-Email': user?.emailAddresses?.[0]?.emailAddress || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      setVideos(videos.filter(v => v.id !== videoId));
      setError(''); // Clear error on success
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`Are you sure you want to delete all ${videos.length} items? This action cannot be undone.`)) return;

    try {
      setDeletingAll(true);
      setError(''); // Clear any previous errors
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/video/user/videos/all`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': user?.id || '',
          'X-User-Email': user?.emailAddresses?.[0]?.emailAddress || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete all items');
      }

      setVideos([]);
      setError(''); // Clear error on success
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingAll(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getServiceIcon = (service) => {
    switch (service) {
      case 'youtube':
        return <Download className="w-4 h-4" />;
      case 'noise-reduction':
        return <Volume2 className="w-4 h-4" />;
      case 'silence-remover':
        return <VolumeX className="w-4 h-4" />;
      case 'video-to-gif':
        return <Image className="w-4 h-4" />;
      case 'video-compressor':
        return <Film className="w-4 h-4" />;
      case 'crop-resize':
        return <Video className="w-4 h-4" />;
      case 'ai-subtitle-generator':
        return <FileText className="w-4 h-4" />;
      case 'ai-video-summary':
        return <FileText className="w-4 h-4" />;
      case 'reel-cutter':
        return <Film className="w-4 h-4" />;
      default:
        return <Film className="w-4 h-4" />;
    }
  };

  const getServiceLabel = (service) => {
    switch (service) {
      case 'youtube':
        return 'YouTube Downloader';
      case 'noise-reduction':
        return 'Noise Reduction';
      case 'silence-remover':
        return 'Silence Remover';
      case 'video-to-gif':
        return 'Video to GIF';
      case 'video-compressor':
        return 'Video Compressor';
      case 'crop-resize':
        return 'Crop & Resize';
      case 'ai-subtitle-generator':
        return 'AI Subtitle Generator';
      case 'ai-video-summary':
        return 'AI Video Summary';
      case 'reel-cutter':
        return 'AI Reel Cutter';
      default:
        return 'Video Processing';
    }
  };

  const getFileTypeInfo = (video) => {
    const filename = (video?.filename || '').toLowerCase();
    const service = (video?.service || '').toLowerCase();

    if (filename.endsWith('.txt') || service === 'ai-video-summary') {
      return {
        type: 'txt',
        label: 'TXT',
        category: 'Text Summary',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        downloadLabel: 'Download .txt',
        icon: FileText,
        isVideo: false,
        isText: true,
      };
    }

    if (filename.endsWith('.gif') || service === 'video-to-gif') {
      return {
        type: 'gif',
        label: 'GIF',
        category: 'Animated GIF',
        badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        downloadLabel: 'Download .gif',
        icon: Image,
        isVideo: false,
        isText: false,
      };
    }

    if (filename.endsWith('.zip') || service === 'reel-cutter') {
      return {
        type: 'zip',
        label: 'ZIP',
        category: 'Reels Bundle',
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        downloadLabel: 'Download .zip',
        icon: Film,
        isVideo: false,
        isText: false,
      };
    }

    if (filename.endsWith('.mp3') || filename.endsWith('.wav') || filename.endsWith('.m4a') || service === 'silence-remover') {
      return {
        type: 'audio',
        label: 'AUDIO',
        category: 'Audio File',
        badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
        downloadLabel: 'Download Audio',
        icon: Volume2,
        isVideo: false,
        isText: false,
      };
    }

    return {
      type: 'video',
      label: 'VIDEO',
      category: 'Video File',
      badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      downloadLabel: 'Download Video',
      icon: Video,
      isVideo: true,
      isText: false,
    };
  };

  const handleOpenPreview = async (video) => {
    setPreviewItem(video);
    const fileInfo = getFileTypeInfo(video);

    if (fileInfo.isVideo) {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl(null);
      }
      setPreviewLoading(true);
      const mediaUrl = getMediaUrl(video.publicUrl);
      try {
        const res = await fetch(mediaUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        setPreviewBlobUrl(blobUrl);
      } catch (err) {
        console.warn('Direct blob load failed, fallback to direct url:', err);
      } finally {
        setPreviewLoading(false);
      }
    } else if (fileInfo.isText) {
      setTextContent('');
      setTextCopied(false);
      try {
        const res = await fetch(getMediaUrl(video.publicUrl));
        if (res.ok) {
          const text = await res.text();
          setTextContent(text);
        } else {
          setTextContent('Unable to load document preview.');
        }
      } catch (err) {
        setTextContent('Unable to load document preview: ' + err.message);
      }
    }
  };

  const handleClosePreview = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
    setPreviewItem(null);
    setTextContent('');
    setTextCopied(false);
  };

  const handleCopyText = async () => {
    if (!textContent) return;
    try {
      await navigator.clipboard.writeText(textContent);
      setTextCopied(true);
      setTimeout(() => setTextCopied(false), 2000);
    } catch (_) {}
  };

  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Header Skeleton */}
          <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Projects</h1>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Manage all your videos and processing activities</p>
          </div> </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`${isDarkMode ? 'bg-[linear-gradient(155deg,#1c2330_0%,#171d27_100%)] border border-[#2b3445]' : 'bg-white border border-gray-200'} rounded-lg p-6`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg animate-pulse ${isDarkMode ? 'bg-[#2b3445]' : 'bg-gray-200'}`}></div>
                  <div className="flex-1">
                    <div className={`h-3 w-16 rounded animate-pulse mb-2 ${isDarkMode ? 'bg-[#2b3445]' : 'bg-gray-200'}`}></div>
                    <div className={`h-6 w-12 rounded animate-pulse ${isDarkMode ? 'bg-[#2b3445]' : 'bg-gray-200'}`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Video Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`${isDarkMode ? 'bg-[linear-gradient(155deg,#1c2330_0%,#171d27_100%)] border border-[#2b3445]' : 'bg-white border border-gray-200'} rounded-xl overflow-hidden`}>
                {/* Thumbnail skeleton with shimmer */}
                <div className={`aspect-video relative overflow-hidden ${isDarkMode ? 'bg-[#1a2230]' : 'bg-gray-200'}`}>
                  <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
                {/* Content skeleton */}
                <div className="p-6">
                  <div className={`h-5 rounded animate-pulse mb-2 ${isDarkMode ? 'bg-[#2b3445]' : 'bg-gray-200'}`}></div>
                  <div className={`h-5 w-3/4 rounded animate-pulse mb-4 ${isDarkMode ? 'bg-[#2b3445]' : 'bg-gray-200'}`}></div>
                  <div className="space-y-2 mb-4">
                    <div className={`h-4 w-20 rounded animate-pulse ${isDarkMode ? 'bg-[#2b3445]' : 'bg-gray-200'}`}></div>
                    <div className={`h-4 w-32 rounded animate-pulse ${isDarkMode ? 'bg-[#2b3445]' : 'bg-gray-200'}`}></div>
                    <div className={`h-4 w-28 rounded animate-pulse ${isDarkMode ? 'bg-[#2b3445]' : 'bg-gray-200'}`}></div>
                  </div>
                  <div className="flex space-x-2">
                    <div className={`flex-1 h-10 rounded-lg animate-pulse ${isDarkMode ? 'bg-[#2b3445]' : 'bg-gray-200'}`}></div>
                    <div className={`w-12 h-10 rounded-lg animate-pulse ${isDarkMode ? 'bg-[#2b3445]' : 'bg-gray-200'}`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-[#fff8e8]' : 'text-gray-900'}`}>My Projects</h1>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Manage all your videos and processing activities</p>
          </div>
          {videos.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="btn-danger flex items-center space-x-2"
            >
              {deletingAll ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Trash className="w-4 h-4" />
              )}
              <span>Delete All</span>
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Error</h4>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${isDarkMode ? 'bg-[linear-gradient(155deg,#1c2330_0%,#171d27_100%)] border border-[#2b3445] hover:border-[#ff914c]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(0,0,0,0.28)]' : 'bg-white border border-gray-200 hover:border-primary'} rounded-lg p-6 transition-colors`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Videos</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{videos.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`${isDarkMode ? 'bg-[linear-gradient(155deg,#1c2330_0%,#171d27_100%)] border border-[#2b3445] hover:border-[#ff914c]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(0,0,0,0.28)]' : 'bg-white border border-gray-200 hover:border-primary'} rounded-lg p-6 transition-colors`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Size</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  {formatFileSize(videos.reduce((acc, v) => acc + v.fileSize, 0))}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`${isDarkMode ? 'bg-[linear-gradient(155deg,#1c2330_0%,#171d27_100%)] border border-[#2b3445] hover:border-[#ff914c]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(0,0,0,0.28)]' : 'bg-white border border-gray-200 hover:border-primary'} rounded-lg p-6 transition-colors`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Processed</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  {videos.filter(v => v.service !== 'youtube').length}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`${isDarkMode ? 'bg-[linear-gradient(155deg,#1c2330_0%,#171d27_100%)] border border-[#2b3445] hover:border-[#ff914c]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(0,0,0,0.28)]' : 'bg-white border border-gray-200 hover:border-primary'} rounded-lg p-6 transition-colors`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>This Month</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  {videos.filter(v => new Date(v.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <div className={`${isDarkMode ? 'bg-[linear-gradient(155deg,#1c2330_0%,#171d27_100%)] border border-[#2b3445] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(0,0,0,0.28)]' : 'bg-white border border-gray-200'} rounded-2xl p-12 text-center`}>
            <Video className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-[#46536d]' : 'text-gray-300'}`} />
            <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>No projects yet</h3>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Start using our tools to see your activity here</p>
            <div className="flex justify-center space-x-3">
              <button 
                onClick={() => navigate('/tools/yt-downloader')}
                className="btn-primary"
              >
                Download Video
              </button>
              <button 
                onClick={() => navigate('/tools/noise-reduction')}
                className="btn-secondary"
              >
                Process Audio
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, index) => {
              const fileType = getFileTypeInfo(video);
              const hasValidThumbnail = video.thumbnail && !imgErrors[video.id];

              return (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`${isDarkMode ? 'bg-[linear-gradient(155deg,#1c2330_0%,#171d27_100%)] border border-[#2b3445] hover:border-[#ff914c]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(0,0,0,0.28)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_18px_30px_rgba(0,0,0,0.34)]' : 'bg-white border border-gray-200 hover:shadow-lg'} rounded-xl overflow-hidden transition-shadow group flex flex-col`}
                >
                  {/* Thumbnail & Preview Area */}
                  <div className={`aspect-video relative overflow-hidden ${isDarkMode ? 'bg-[#111722]' : 'bg-gray-100'}`}>
                    {/* Top Right Marker Badge */}
                    <div className={`absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-md flex items-center gap-1.5 ${fileType.badgeClass}`}>
                      <fileType.icon className="w-3.5 h-3.5" />
                      <span>{fileType.label}</span>
                    </div>

                    {/* Thumbnail Image, Video Frame, or Document Placeholder */}
                    {hasValidThumbnail ? (
                      <img 
                        src={getMediaUrl(video.thumbnail)} 
                        alt={video.title}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                        onError={() => setImgErrors(prev => ({ ...prev, [video.id]: true }))}
                      />
                    ) : fileType.isVideo ? (
                      <div className="w-full h-full relative bg-black/60 flex items-center justify-center">
                        <video 
                          src={`${getMediaUrl(video.publicUrl)}#t=0.5`}
                          preload="metadata"
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 bg-black/25 pointer-events-none" />
                      </div>
                    ) : fileType.isText ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#16202e] to-[#0f1520] p-4 text-center">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-1.5 text-emerald-400">
                          <FileText className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-semibold text-gray-200">AI Summary Document</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">Click to view content</span>
                      </div>
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-[#1a2230]' : 'bg-gray-100'}`}>
                        <fileType.icon className={`w-12 h-12 ${isDarkMode ? 'text-[#46536d]' : 'text-gray-400'}`} />
                      </div>
                    )}

                    {/* Play / View Overlay (clickable to preview) */}
                    <div 
                      onClick={() => handleOpenPreview(video)}
                      className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-10"
                      title={fileType.isVideo ? "Click to play video" : "Click to view content"}
                    >
                      {fileType.isVideo ? (
                        <div className="w-12 h-12 rounded-full bg-primary/95 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 fill-current ml-0.5" />
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-600/90 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg transform group-hover:scale-105 transition-transform">
                          <Eye className="w-4 h-4" />
                          <span>Preview</span>
                        </div>
                      )}
                    </div>

                    {/* Duration badge (only for video or audio) */}
                    {video.duration && fileType.isVideo && (
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded font-mono z-10">
                        {video.duration}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className={`font-semibold mb-2 line-clamp-2 break-words [overflow-wrap:anywhere] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`} title={video.title}>
                        {video.title}
                      </h3>
                      
                      <div className="space-y-2 mb-4">
                        <div className={`flex items-center space-x-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <HardDrive className="w-4 h-4 shrink-0" />
                          <span>{formatFileSize(video.fileSize)}</span>
                        </div>
                        <div className={`flex items-center space-x-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {getServiceIcon(video.service)}
                          <span>{getServiceLabel(video.service)}</span>
                        </div>
                        <div className={`flex items-center space-x-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>{formatDate(video.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={() => handleDownload(video)}
                        className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>{fileType.downloadLabel}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(video.id)}
                        disabled={deletingId === video.id}
                        className="px-3.5 py-2 border border-red-200 dark:border-red-900/40 text-red-500 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer"
                        title="Delete item"
                      >
                        {deletingId === video.id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18202d] border border-[#2b3548] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#252f42] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border shrink-0 ${getFileTypeInfo(previewItem).badgeClass}`}>
                  {getFileTypeInfo(previewItem).label}
                </span>
                <h3 className="font-semibold text-white text-base truncate" title={previewItem.title}>
                  {previewItem.title}
                </h3>
              </div>
              <button
                onClick={handleClosePreview}
                className="w-8 h-8 rounded-lg bg-[#252f42] hover:bg-[#303c54] text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-clean-scroll">
              {getFileTypeInfo(previewItem).isVideo ? (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-[#2b3548]">
                  {previewLoading && !previewBlobUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/75 z-10 text-white gap-2">
                      <Loader className="w-6 h-6 animate-spin text-orange-500" />
                      <span className="text-sm font-medium">Loading video preview...</span>
                    </div>
                  )}
                  <video
                    key={previewBlobUrl || getMediaUrl(previewItem.publicUrl)}
                    src={previewBlobUrl || getMediaUrl(previewItem.publicUrl)}
                    controls
                    autoPlay
                    playsInline
                    preload="auto"
                    className="w-full h-full max-h-[60vh] object-contain"
                  >
                    <source src={previewBlobUrl || getMediaUrl(previewItem.publicUrl)} type="video/mp4" />
                    Your browser does not support HTML5 video playback.
                  </video>
                </div>
              ) : getFileTypeInfo(previewItem).isText ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 pb-1">
                    <span>Document Content ({formatFileSize(previewItem.fileSize)})</span>
                    <button
                      onClick={handleCopyText}
                      className="px-2.5 py-1 rounded bg-[#252f42] hover:bg-[#323f58] text-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {textCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className={textCopied ? 'text-emerald-400 font-semibold' : ''}>{textCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="bg-[#0f141f] border border-[#252f42] rounded-xl p-4 font-mono text-sm text-gray-200 whitespace-pre-wrap max-h-[50vh] overflow-y-auto custom-clean-scroll leading-relaxed selection:bg-orange-500/30">
                    {textContent || 'Loading document preview...'}
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center text-gray-400">
                  <p>Preview is not available for this file type.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-[#252f42] flex items-center justify-between gap-3 bg-[#131a26]">
              <div className="text-xs text-gray-400 space-x-3 hidden sm:block">
                <span>Size: {formatFileSize(previewItem.fileSize)}</span>
                {previewItem.duration && <span>Duration: {previewItem.duration}</span>}
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={handleClosePreview}
                  className="px-4 py-2 rounded-lg bg-[#252f42] hover:bg-[#303c54] text-gray-300 text-sm font-medium transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownload(previewItem)}
                  className="btn-primary text-sm py-2 px-5 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{getFileTypeInfo(previewItem).downloadLabel}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;