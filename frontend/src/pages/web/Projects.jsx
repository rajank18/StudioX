import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { 
  Download, Trash2, Play, Calendar, HardDrive, 
  Video, FileText, AlertCircle, Loader, Volume2, 
  VolumeX, Image, Film, Trash
} from 'lucide-react';

const Projects = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    fetchUserVideos();
  }, []);

  const fetchUserVideos = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const token = await getToken();
      const response = await fetch('http://localhost:3000/api/video/user/videos', {
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
      const response = await fetch(`http://localhost:3000${video.publicUrl}`);
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
      const response = await fetch(`http://localhost:3000/api/video/user/videos/${videoId}`, {
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
      const response = await fetch('http://localhost:3000/api/video/user/videos/all', {
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
      case 'ai-subtitle-generator':
        return <FileText className="w-4 h-4" />;
      case 'ai-video-summary':
        return <FileText className="w-4 h-4" />;
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
      case 'ai-subtitle-generator':
        return 'AI Subtitle Generator';
      case 'ai-video-summary':
        return 'AI Video Summary';
      default:
        return 'Video Processing';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Header Skeleton */}
          <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Projects</h1>
            <p className="text-gray-600">Manage all your videos and processing activities</p>
          </div> </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Video Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Thumbnail skeleton with shimmer */}
                <div className="aspect-video bg-gray-200 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
                {/* Content skeleton */}
                <div className="p-6">
                  <div className="h-5 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse mb-4"></div>
                  <div className="space-y-2 mb-4">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                    <div className="w-12 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Projects</h1>
            <p className="text-gray-600">Manage all your videos and processing activities</p>
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
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
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
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-primary transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Videos</p>
                <p className="text-2xl font-bold text-gray-900">{videos.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-primary transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatFileSize(videos.reduce((acc, v) => acc + v.fileSize, 0))}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-primary transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Processed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {videos.filter(v => v.service !== 'youtube').length}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-primary transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {videos.filter(v => new Date(v.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-6">Start using our tools to see your activity here</p>
            <div className="flex justify-center space-x-3">
              <button 
                onClick={() => window.location.href = '/yt-downloader'}
                className="btn-primary"
              >
                Download Video
              </button>
              <button 
                onClick={() => window.location.href = '/noise-reduction'}
                className="btn-secondary"
              >
                Process Audio
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {video.thumbnail ? (
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="w-full h-full flex items-center justify-center bg-gray-100" style={{ display: video.thumbnail ? 'none' : 'flex' }}>
                    <Video className="w-12 h-12 text-gray-400" />
                  </div>
                  
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all">
                    <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  {/* Duration badge */}
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2" title={video.title}>
                    {video.title}
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <HardDrive className="w-4 h-4" />
                      <span>{formatFileSize(video.fileSize)}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      {getServiceIcon(video.service)}
                      <span>{getServiceLabel(video.service)}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(video.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDownload(video)}
                      className="flex-1 btn-primary text-sm py-2 flex items-center justify-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(video.id)}
                      disabled={deletingId === video.id}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center"
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;