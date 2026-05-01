import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FolderOpen, Wrench, Boxes, Sparkles, Settings, ChevronDown, ChevronRight, PanelLeftClose, PanelLeft, Moon, Sun, UserCircle2, LogOut } from 'lucide-react';
import { useClerk, useUser } from '@clerk/clerk-react';
import logo from '../../assets/images/logo_orange.png';
import logoDark from '../../assets/images/dark-mode-logo.jpg';
import styles from './Sidebar.module.css';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const accountMenuRef = useRef(null);
  const [isAiToolsOpen, setIsAiToolsOpen] = useState(true);
  const [isBasicToolsOpen, setIsBasicToolsOpen] = useState(true);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
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
    const onDocumentMouseDown = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };

    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentMouseDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const toggleDarkMode = () => {
    const nextIsDark = !isDarkMode;
    setIsDarkMode(nextIsDark);
    const nextTheme = nextIsDark ? 'dark' : 'light';
    localStorage.setItem('studiox-theme', nextTheme);
    window.dispatchEvent(new CustomEvent('studiox-theme-change', { detail: { theme: nextTheme } }));
  };

  const isActive = (path) => location.pathname === path;

  const userInitials = useMemo(() => {
    const first = user?.firstName?.[0] || '';
    const last = user?.lastName?.[0] || '';
    const fallback = user?.username?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || 'U';
    return (first + last || fallback).toUpperCase();
  }, [user]);

  const menuItems = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Your Projects', path: '/projects', icon: FolderOpen },
    { name: 'All Tools', path: '/tools', icon: Boxes },
  ];

  const aiTools = [
    { name: 'AI Reel Cutter', path: '/tools/ai-reel-cutter' },
    { name: 'AI Subtitle Generator', path: '/tools/ai-subtitle-generator' },
    { name: 'AI Video Summary', path: '/tools/ai-video-summary' },
    
  ];

  const basicTools = [
    { name: 'YouTube Downloader', path: '/tools/yt-downloader' },
    { name: 'Video to GIF', path: '/tools/video-to-gif' },
    { name: 'Video Compressor', path: '/tools/video-compressor' },
    { name: 'Video Enhancer', path: '/tools/video-enhancer' },
    { name: 'Noise Reduction', path: '/tools/noise-reduction' },
    { name: 'Remove Silence', path: '/tools/remove-silence' },
    { name: 'Thumbnail Generator', path: '/tools/thumbnail-generator' },
  ];

  return (
    <div className={`${isOpen ? 'w-64' : 'w-20'} h-screen ${isDarkMode ? 'bg-black border-gray-500' : 'bg-white border-gray-200'} border-r flex flex-col transition-all duration-300 fixed left-0 top-0 z-40`}>
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
      <nav className={`flex-1 overflow-y-auto p-4 space-y-1 ${styles.customScrollbar}`}> 
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
      <div className={`p-4 border-t space-y-1 relative ${isDarkMode ? 'border-[#283243]' : 'border-gray-200'}`} ref={accountMenuRef}>
        

        <button
          onClick={toggleDarkMode}
          className={`flex items-center ${isOpen ? 'gap-3' : 'justify-center'} w-full px-4 py-3 cursor-pointer rounded-lg transition-colors ${isDarkMode ? 'text-[#d5dceb] hover:bg-[#1a2230]' : 'text-gray-700 hover:bg-gray-50'}`}
          title={!isOpen ? 'Toggle Dark Mode' : ''}
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 shrink-0" />
          ) : (
            <Moon className="w-5 h-5 shrink-0" />
          )}
          {isOpen && <span className="font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {isOpen ? (
          <button
            type="button"
            onClick={() => setIsAccountMenuOpen((prev) => !prev)}
            className={`cursor-pointer flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors text-left ${isDarkMode ? 'text-[#d5dceb] hover:bg-[#1a2230]' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <div className="w-5 h-5 cursor-pointer rounded-full bg-[#ef5644] text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
              {userInitials}
            </div>
            <span className="text-base font-medium">My Account</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsAccountMenuOpen((prev) => !prev)}
            className={`flex items-center justify-center w-full px-4 py-3 rounded-lg transition-colors ${isDarkMode ? 'text-[#d5dceb] hover:bg-[#1a2230]' : 'text-gray-700 hover:bg-gray-50'}`}
            title="My Account"
          >
            <div className="w-5 h-5 rounded-full bg-[#ef5644] text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
              {userInitials}
            </div>
          </button>
        )}

        {isAccountMenuOpen && (
          <div
            className={`absolute z-50 rounded-2xl border shadow-xl p-2 ${
              isOpen
                ? `left-4 right-4 bottom-full mb-2 ${isDarkMode ? 'bg-[#0f141d] border-[#2a3446]' : 'bg-white border-gray-200'}`
                : `left-full ml-2 bottom-0 w-56 ${isDarkMode ? 'bg-[#0f141d] border-[#2a3446]' : 'bg-white border-gray-200'}`
            }`}
          >
            <button
              type="button"
              onClick={() => {
                openUserProfile();
                setIsAccountMenuOpen(false);
              }}
              className={`flex items-center cursor-pointer gap-3 w-full px-3 py-2 rounded-lg transition-colors ${isDarkMode ? 'text-[#d5dceb] hover:bg-[#1a2230]' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <UserCircle2 className="w-4 h-4 shrink-0" />
              <span>Profile</span>
            </button>
            <Link
              to="/settings"
              onClick={() => setIsAccountMenuOpen(false)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors ${isDarkMode ? 'text-[#d5dceb] hover:bg-[#1a2230]' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </Link>
            <button
              type="button"
              onClick={() => signOut({ redirectUrl: '/' })}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-[#f2b7b3] hover:bg-[#2b1a20]' : 'text-[#c0392b] hover:bg-gray-50'}`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;