import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TOOL_ITEMS } from '../../config/tools';

const Tools = () => {
  const navigate = useNavigate();
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

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tools</h1>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>All available StudioX tools in one place.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TOOL_ITEMS.map((tool, index) => {
            const Icon = tool.icon;

            return (
              <motion.button
                key={tool.key}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
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
  );
};

export default Tools;
