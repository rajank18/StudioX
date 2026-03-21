import React, { useEffect, useMemo, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, Video, ChevronRight 
} from 'lucide-react';
import { TOOL_BY_KEY, TOOL_ITEMS, DEFAULT_NEW_USER_FEATURE_KEYS } from '../../config/tools';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const Home = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [recentServices, setRecentServices] = useState([]);

  useEffect(() => {
    let ignore = false;

    const fetchRecentServices = async () => {
      if (!user?.id) return;

      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/api/video/user/videos`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-User-Id': user.id,
            'X-User-Email': user?.emailAddresses?.[0]?.emailAddress || '',
          },
        });

        if (!response.ok) return;
        const data = await response.json();
        const services = (data?.videos || []).map((item) => item?.service).filter(Boolean);
        const uniqueRecent = [...new Set(services)].filter((service) => TOOL_BY_KEY[service]);

        if (!ignore) {
          setRecentServices(uniqueRecent.slice(0, 4));
        }
      } catch (_) {
        if (!ignore) {
          setRecentServices([]);
        }
      }
    };

    fetchRecentServices();
    return () => {
      ignore = true;
    };
  }, [getToken, user?.id]);

  const featuredTools = useMemo(() => {
    if (recentServices.length > 0) {
      const recentTools = recentServices
        .map((service) => TOOL_BY_KEY[service])
        .filter(Boolean);

      const fillerTools = TOOL_ITEMS.filter((tool) => !recentServices.includes(tool.key));
      return [...recentTools, ...fillerTools].slice(0, 4);
    }

    return DEFAULT_NEW_USER_FEATURE_KEYS
      .map((key) => TOOL_BY_KEY[key])
      .filter(Boolean)
      .slice(0, 4);
  }, [recentServices]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome Section */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName || 'Creator'}!
          </h1>
        </div>
        {/* Quick Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary rounded-2xl p-8 mb-12 text-white shadow-xl"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Start Creating</h2>
              <p className="text-orange-100">Upload your video and let AI do the magic</p>
            </div>
            <button className="btn-outline-primary flex items-center gap-3">
              <Upload className="w-5 h-5" />
              Upload Video
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Videos Processed', value: '0', color: 'text-[#ff914c]' },
            { label: 'Total Duration', value: '0m', color: 'text-[#ff914c]' },
            { label: 'Credits Left', value: '10,000', color: 'text-[#ff914c]' },
            { label: 'Projects', value: '0', color: 'text-[#ff914c]' }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-primary transition-colors"
            >
              <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Featured Tools */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {recentServices.length > 0 ? 'Recently Used Tools' : 'Recommended Tools'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredTools.map((tool, idx) => {
              const Icon = tool.icon;
              return (
                <motion.button
                  style={{ cursor: 'pointer' }}
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -5 }}
                  onClick={() => navigate(tool.path)}
                  className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-primary hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mb-4 group-hover:bg-orange-100 transition-colors">
                    <Icon className="w-6 h-6 text-[#ff914c]" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{tool.title}</h3>
                  <p className="text-sm text-gray-600">{tool.description}</p>
                </motion.button>
              );
            })}
          </div>
          <div className="mt-6 flex justify-center">
            <motion.button
              onClick={() => navigate('/tools')}
              className="inline-flex items-center justify-center rounded-full border-1 px-8 py-3 font-semibold tracking-wide text-white cursor-pointer shadow-lg"
              style={{
                background: 'linear-gradient(120deg, #ff914c 0%, #ffb37b 45%, #ff914c 100%)',
                backgroundSize: '200% 200%',
                borderColor: 'orange',
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className='font-mono'>MORE TOOLS →</span>
            </motion.button>
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Projects</h2>
            <button 
              onClick={() => navigate('/projects')}
              className="text-primary hover:text-primary-600 font-medium text-sm transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-6">Upload your first video or download from YouTube to get started</p>
            <div className="flex gap-3 justify-center">
              <button className="btn-primary">
                Upload Video
              </button>
              <button 
                onClick={() => navigate('/tools/yt-downloader')}
                className="btn-outline-primary"
              >
                Download from YouTube
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
