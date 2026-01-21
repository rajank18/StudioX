import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { 
  Download, Trash2, Play, Calendar, HardDrive, 
  Video, FileText, AlertCircle, Loader 
} from 'lucide-react';

const Projects = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchUserVideos();
  }, []);

  const fetchUserVideos = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch('http://localhost:3000/api/video/user/videos', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': user?.id || '',
          'X-User-Email': user?.emailAddresses?.[0]?.emailAddress || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const data = await response.json();
      setVideos(data.videos || []);
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
    if (!window.confirm('Are you sure you want to delete this video?')) return;

    try {
      setDeletingId(videoId);
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
        throw new Error('Failed to delete video');
      }

      setVideos(videos.filter(v => v.id !== videoId));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Projects</h1>
          <p className="text-gray-600">Manage all your downloaded videos and projects</p>
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
                <p className="text-sm text-gray-600">From YouTube</p>
                <p className="text-2xl font-bold text-gray-900">
                  {videos.filter(v => v.service === 'youtube').length}
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
            <p className="text-gray-600 mb-6">Download your first video to see it here</p>
            <button 
              onClick={() => window.location.href = '/yt-downloader'}
              className="btn-primary"
            >
              Download Video
            </button>
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
                      <FileText className="w-4 h-4" />
                      <span>YouTube Downloader</span>
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
                      className="flex-1 btn-primary text-sm py-2"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(video.id)}
                      disabled={deletingId === video.id}
                      className="px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
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