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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('studiox-theme') === 'dark';
    } catch (_) {
      return false;
    }
  });

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
    <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome Section */}
        <div className="mb-5">
          <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-[#fff8e8]' : 'text-gray-900'}`}>
            Welcome back, {user?.firstName || 'Creator'}!
          </h1>
        </div>
        {/* Quick Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-8 mb-12 text-white shadow-xl ${isDarkMode ? 'bg-[linear-gradient(150deg,#1f2632_0%,#1a212d_55%,#171d27_100%)] border border-[#2b3445] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_32px_rgba(0,0,0,0.34)]' : 'bg-primary'}`}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-white'}`}>Start Creating</h2>
              <p className={isDarkMode ? 'text-gray-400' : 'text-orange-100'}>Upload your video and let AI do the magic</p>
            </div>
            <button className={`flex items-center gap-3 ${isDarkMode ? 'px-5 py-2.5 rounded-lg bg-[#2a3344] text-[#fff8e8] border border-[#3a4559] hover:bg-[#313c50]' : 'btn-outline-primary'}`}>
              <Upload className="w-5 h-5" />
              Upload Video
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Videos Processed', value: '0', color: 'text-gray-200' },
            { label: 'Total Duration', value: '0m', color: 'textgray-200' },
            { label: 'Credits Left', value: '10,000', color: 'text-gray-200' },
            { label: 'Projects', value: '0', color: 'text-gray-200' }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`${isDarkMode ? 'bg-[linear-gradient(155deg,#1c2330_0%,#181f2a_100%)] border border-[#2b3445] hover:border-[#ff914c]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(0,0,0,0.28)]' : 'bg-white border border-gray-200 hover:border-primary'} rounded-2xl p-6 transition-colors`}
            >
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm mb-1`}>{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Featured Tools */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-[#fff8e8]' : 'text-gray-900'}`}>
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
                  className={`${isDarkMode ? 'bg-[linear-gradient(155deg,#1c2330_0%,#171d27_100%)] border border-[#2b3445] hover:border-[#ff914c]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(0,0,0,0.28)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_18px_30px_rgba(0,0,0,0.34)]' : 'bg-white border border-gray-200 hover:border-primary hover:shadow-lg'} rounded-2xl p-6 transition-all text-left group`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${isDarkMode ? 'bg-[#252f40] group-hover:bg-[#2f3a4f]' : 'bg-orange-50 group-hover:bg-orange-100'}`}>
                    <Icon className="w-6 h-6 text-[#ad6007]" />
                  </div>
                  <h3 className={`font-semibold mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{tool.title}</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{tool.description}</p>
                </motion.button>
              );
            })}
          </div>
          <div className="mt-6 flex justify-center">
            <motion.button
              onClick={() => navigate('/tools')}
              className="inline-flex items-center justify-center rounded-full border px-8 py-3 font-semibold tracking-wide text-white cursor-pointer shadow-lg"
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
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-[#fff8e8]' : 'text-gray-900'}`}>Recent Projects</h2>
            <button 
              onClick={() => navigate('/projects')}
              className="text-primary hover:text-primary-600 font-medium text-sm transition-colors"
            >
              View All →
            </button>
          </div>
          <div className={`${isDarkMode ? 'bg-[linear-gradient(155deg,#1c2330_0%,#171d27_100%)] border border-[#2b3445] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(0,0,0,0.28)]' : 'bg-white border border-gray-200'} rounded-2xl p-12 text-center`}>
            <Video className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-[#46536d]' : 'text-gray-300'}`} />
            <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>No projects yet</h3>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Upload your first video or download from YouTube to get started</p>
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
