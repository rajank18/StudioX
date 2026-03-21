import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FolderOpen, Wrench, Sparkles, ArrowUpCircle, Settings, ChevronDown, ChevronRight, PanelLeftClose, PanelLeft, Moon, Sun } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import logo from '../../assets/images/logo_orange.png';
import logoDark from '../../assets/images/dark-mode-logo.jpg';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const [isAiToolsOpen, setIsAiToolsOpen] = useState(true);
  const [isBasicToolsOpen, setIsBasicToolsOpen] = useState(true);
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

  const toggleDarkMode = () => {
    const nextIsDark = !isDarkMode;
    setIsDarkMode(nextIsDark);
    const nextTheme = nextIsDark ? 'dark' : 'light';
    localStorage.setItem('studiox-theme', nextTheme);
    window.dispatchEvent(new CustomEvent('studiox-theme-change', { detail: { theme: nextTheme } }));
  };

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Your Projects', path: '/projects', icon: FolderOpen },
    { name: 'Tools', path: '/tools', icon: Wrench },
  ];

  const aiTools = [
    { name: 'AI Subtitle Generator', path: '/tools/ai-subtitle-generator' },
    { name: 'AI Video Summary', path: '/tools/ai-video-summary' },
    { name: 'AI Enhancement', path: '/tools/ai-enhance' },
    { name: 'AI Upscale', path: '/tools/ai-upscale' },
  ];

  const basicTools = [
    { name: 'YouTube Downloader', path: '/tools/yt-downloader' },
    { name: 'Video to GIF', path: '/tools/video-to-gif' },
    { name: 'Noise Reduction', path: '/tools/noise-reduction' },
    { name: 'Remove Silence', path: '/tools/remove-silence' },
    { name: 'Thumbnail Generator', path: '/tools/thumbnail-generator' },
  ];

  return (
    <div className={`${isOpen ? 'w-64' : 'w-20'} h-screen ${isDarkMode ? 'bg-[#10141c] border-[#283243]' : 'bg-white border-gray-200'} border-r flex flex-col transition-all duration-300 fixed left-0 top-0 z-40`}>
      {/* Logo & Toggle */}
      <div className="p-6  border-gray-200 flex items-center justify-between">
        {isOpen ? (
          <>
            <Link to="/home" className="flex items-center gap-2">
              <img src={isDarkMode ? logoDark : logo} alt="StudioX" className="w-[65%]" />
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-[#1b2330]' : 'hover:bg-gray-100'}`}
            >
              <PanelLeftClose className={`w-5 h-5 shrink-0 ${isDarkMode ? 'text-[#c2cada]' : 'text-gray-600'}`} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className={`p-1 rounded-lg transition-colors mx-auto ${isDarkMode ? 'hover:bg-[#1b2330]' : 'hover:bg-gray-100'}`}
          >
            <PanelLeft className={`w-5 h-5 shrink-0 ${isDarkMode ? 'text-[#c2cada]' : 'text-gray-600'}`} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {/* Main Menu Items */}
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center ${isOpen ? 'gap-3' : 'justify-center'} px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? isDarkMode ? 'bg-[#242d3d] text-[#ffb782]' : 'bg-orange-50 text-[#ff914c]'
                  : isDarkMode ? 'text-[#c2cada] hover:bg-[#1a2230]' : 'text-gray-700 hover:bg-gray-50'
              }`}
              title={!isOpen ? item.name : ''}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {isOpen && <span className="font-medium">{item.name}</span>}
            </Link>
          );
        })}

        {/* AI Tools Section */}
        {isOpen && (
          <div className="pt-4">
            <button
              onClick={() => setIsAiToolsOpen(!isAiToolsOpen)}
              className={`flex items-center justify-between w-full px-4 py-2 rounded-lg ${isDarkMode ? 'text-[#c2cada] hover:bg-[#1a2230]' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 shrink-0" />
                <span className="font-medium">AI Tools</span>
              </div>
              {isAiToolsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {isAiToolsOpen && (
              <div className="ml-8 mt-1 space-y-1">
                {aiTools.map((tool) => (
                  <Link
                    key={tool.path}
                    to={tool.path}
                    className={`block px-4 py-2 rounded-lg text-sm transition-colors ${
                      isActive(tool.path)
                        ? isDarkMode ? 'bg-[#242d3d] text-[#ffb782]' : 'bg-orange-50 text-[#ff914c]'
                        : isDarkMode ? 'text-[#97a3b8] hover:bg-[#1a2230]' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tool.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Tools Collapsed */}
        {!isOpen && (
          <button
            onClick={() => {
              setIsOpen(true);
              setIsAiToolsOpen(true);
            }}
            className={`flex items-center justify-center px-4 py-3 rounded-lg transition-colors w-full ${isDarkMode ? 'text-[#c2cada] hover:bg-[#1a2230]' : 'text-gray-700 hover:bg-gray-50'}`}
            title="AI Tools"
          >
            <Sparkles className="w-5 h-5 shrink-0" />
          </button>
        )}

        {/* Basic Tools Section */}
        {isOpen && (
          <div>
            <button
              onClick={() => setIsBasicToolsOpen(!isBasicToolsOpen)}
              className={`flex items-center justify-between w-full px-4 py-2 rounded-lg ${isDarkMode ? 'text-[#c2cada] hover:bg-[#1a2230]' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                <Wrench className="w-5 h-5 shrink-0" />
                <span className="font-medium">Basic Tools</span>
              </div>
              {isBasicToolsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {isBasicToolsOpen && (
              <div className="ml-8 mt-1 space-y-1">
                {basicTools.map((tool) => (
                  <Link
                    key={tool.path}
                    to={tool.path}
                    className={`block px-4 py-2 rounded-lg text-sm transition-colors ${
                      isActive(tool.path)
                        ? isDarkMode ? 'bg-[#242d3d] text-[#ffb782]' : 'bg-orange-50 text-[#ff914c]'
                        : isDarkMode ? 'text-[#97a3b8] hover:bg-[#1a2230]' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tool.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Basic Tools Collapsed */}
        {!isOpen && (
          <button
            onClick={() => {
              setIsOpen(true);
              setIsBasicToolsOpen(true);
            }}
            className={`flex items-center justify-center px-4 py-3 rounded-lg transition-colors w-full ${isDarkMode ? 'text-[#c2cada] hover:bg-[#1a2230]' : 'text-gray-700 hover:bg-gray-50'}`}
            title="Basic Tools"
          >
            <Wrench className="w-5 h-5 shrink-0" />
          </button>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className={`p-4 border-t space-y-1 ${isDarkMode ? 'border-[#283243]' : 'border-gray-200'}`}>
        {isOpen ? (
          <div className="flex items-center gap-3 px-3 py-3">
            <UserButton afterSignOutUrl="/" />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-[#d5dceb]' : 'text-gray-700'}`}>My Account</span>
          </div>
        ) : (
          <div className="flex items-center justify-center px-4 py-3">
            <UserButton afterSignOutUrl="/" />
          </div>
        )}
        <button
          onClick={toggleDarkMode}
          className={`flex items-center ${isOpen ? 'gap-3' : 'justify-center'} w-full px-4 py-3 rounded-lg transition-colors ${isDarkMode ? 'text-[#d5dceb] hover:bg-[#1a2230]' : 'text-gray-700 hover:bg-gray-50'}`}
          title={!isOpen ? 'Toggle Dark Mode' : ''}
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 shrink-0" />
          ) : (
            <Moon className="w-5 h-5 shrink-0" />
          )}
          {isOpen && <span className="font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <Link
          to="/settings"
          className={`flex items-center ${isOpen ? 'gap-3' : 'justify-center'} px-4 py-3 rounded-lg transition-colors ${
            isActive('/settings')
              ? isDarkMode ? 'bg-[#242d3d] text-[#ffb782]' : 'bg-orange-50 text-[#ff914c]'
              : isDarkMode ? 'text-[#c2cada] hover:bg-[#1a2230]' : 'text-gray-700 hover:bg-gray-50'
          }`}
          title={!isOpen ? 'Settings' : ''}
        >
          <Settings className="w-5 h-5 shrink-0" />
          {isOpen && <span className="font-medium">Settings</span>}
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;