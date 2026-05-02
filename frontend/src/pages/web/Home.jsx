import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, Video, ChevronRight 
} from 'lucide-react';
import { TOOL_ITEMS } from '../../config/tools';
import { useCredits } from '../../context/CreditContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const Home = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { credits, isLoadingCredits } = useCredits();
  const [stats, setStats] = useState({
    videosProcessed: 0,
    totalDuration: 0,
    projectsCount: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
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

    const fetchUserStats = async () => {
      if (!user?.id) return;

      try {
        setIsLoadingStats(true);
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/api/video/user/videos`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-User-Id': user.id,
            'X-User-Email': user?.emailAddresses?.[0]?.emailAddress || '',
          },
        });

        if (!response.ok) {
          if (!ignore) setIsLoadingStats(false);
          return;
        }

        const data = await response.json();
        const videos = data?.videos || [];
        
        // Calculate stats
        let totalDurationSeconds = 0;
        videos.forEach((video) => {
          if (video?.duration) {
            const match = String(video.duration).match(/\d+/);
            if (match) totalDurationSeconds += parseInt(match[0], 10);
          }
        });

        // Format duration
        const hours = Math.floor(totalDurationSeconds / 3600);
        const minutes = Math.floor((totalDurationSeconds % 3600) / 60);
        const formattedDuration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        if (!ignore) {
          setStats({
            videosProcessed: videos.length,
            totalDuration: formattedDuration || '0m',
            projectsCount: videos.filter((v) => v.service === 'youtube').length,
          });
          setIsLoadingStats(false);
        }
      } catch (_) {
        if (!ignore) {
          setStats({
            videosProcessed: 0,
            totalDuration: '0m',
            projectsCount: 0,
          });
          setIsLoadingStats(false);
        }
      }
    };

    fetchUserStats();
    return () => {
      ignore = true;
    };
  }, [getToken, user?.id]);

  const currentPlanLabel = `${credits?.planName || 'Free'} Plan`;
  const creditsLeftLabel = credits?.isCreditExempt
    ? 'Unlimited'
    : Number(credits?.currentCredits || 0).toLocaleString();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Welcome Section */}
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-[#fff8e8]' : 'text-gray-900'}`}>
              Welcome back, {user?.firstName || 'Creator'}!
            </h1>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${isDarkMode
                ? 'border-[#3b475d] bg-[#1c2433] text-[#ffd7b0]'
                : 'border-orange-200 bg-orange-50 text-orange-700'}`}
            >
              {currentPlanLabel}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Videos Processed', value: isLoadingStats ? '...' : stats.videosProcessed, color: 'text-primary' },
            { label: 'Total Duration', value: isLoadingStats ? '...' : stats.totalDuration, color: 'text-primary' },
            { label: 'Credits Left', value: isLoadingCredits ? '...' : creditsLeftLabel, color: 'text-primary' },
            { label: 'Projects', value: isLoadingStats ? '...' : stats.projectsCount, color: 'text-primary' }
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

        {/* All Tools Grid */}
        <div className="mb-8">
          <div className="mb-6">
            <h2 className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-[#fff8e8]' : 'text-gray-900'}`}>
              Tools
            </h2>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              All available StudioX tools in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TOOL_ITEMS.map((tool, idx) => {
              const Icon = tool.icon;
              return (
                <motion.button
                  style={{ cursor: 'pointer' }}
                  key={tool.key || idx}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate(tool.path)}
                  className={`${isDarkMode 
                    ? 'bg-[linear-gradient(155deg,#1c2330_0%,#171d27_100%)] border border-[#2b3445] hover:border-[#ff914c]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(0,0,0,0.28)]' 
                    : 'bg-white border border-gray-200 hover:border-primary hover:shadow-lg'} rounded-2xl p-6 transition-all text-left group`}
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
        </div>

      </div>
    </div>
  );
};

export default Home;