import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FolderOpen, Wrench, Sparkles, ArrowUpCircle, Settings, ChevronDown, ChevronRight, PanelLeftClose, PanelLeft } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import logo from '../../assets/images/logo_orange.png';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const [isAiToolsOpen, setIsAiToolsOpen] = useState(true);
  const [isBasicToolsOpen, setIsBasicToolsOpen] = useState(true);

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Your Projects', path: '/projects', icon: FolderOpen },
  ];

  const aiTools = [
    { name: 'AI Enhancement', path: '/tools/ai-enhance' },
    { name: 'AI Upscale', path: '/tools/ai-upscale' },
  ];

  const basicTools = [
    { name: 'YouTube Downloader', path: '/yt-downloader' },
    { name: 'Video to GIF', path: '/video-to-gif' },
    { name: 'Noise Reduction', path: '/noise-reduction' },
    { name: 'Remove Silence', path: '/remove-silence' },
    { name: 'Thumbnail Generator', path: '/thumbnail-generator' },
  ];

  return (
    <div className={`${isOpen ? 'w-64' : 'w-20'} h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 fixed left-0 top-0 z-40`}>
      {/* Logo & Toggle */}
      <div className="p-6  border-gray-200 flex items-center justify-between">
        {isOpen ? (
          <>
            <Link to="/home" className="flex items-center gap-2">
              <img src={logo} alt="StudioX" className="w-[65%]" />
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <PanelLeftClose className="w-5 h-5 text-gray-600 flex-shrink-0" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors mx-auto"
          >
            <PanelLeft className="w-5 h-5 text-gray-600 flex-shrink-0" />
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
                  ? 'bg-orange-50 text-[#ff914c]'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              title={!isOpen ? item.name : ''}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span className="font-medium">{item.name}</span>}
            </Link>
          );
        })}

        {/* AI Tools Section */}
        {isOpen && (
          <div className="pt-4">
            <button
              onClick={() => setIsAiToolsOpen(!isAiToolsOpen)}
              className="flex items-center justify-between w-full px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 flex-shrink-0" />
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
                        ? 'bg-orange-50 text-[#ff914c]'
                        : 'text-gray-600 hover:bg-gray-50'
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
            className="flex items-center justify-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors w-full"
            title="AI Tools"
          >
            <Sparkles className="w-5 h-5 flex-shrink-0" />
          </button>
        )}

        {/* Basic Tools Section */}
        {isOpen && (
          <div>
            <button
              onClick={() => setIsBasicToolsOpen(!isBasicToolsOpen)}
              className="flex items-center justify-between w-full px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Wrench className="w-5 h-5 flex-shrink-0" />
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
                        ? 'bg-orange-50 text-[#ff914c]'
                        : 'text-gray-600 hover:bg-gray-50'
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
            className="flex items-center justify-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors w-full"
            title="Basic Tools"
          >
            <Wrench className="w-5 h-5 flex-shrink-0" />
          </button>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 space-y-1">
        {isOpen ? (
          <div className="flex items-center gap-3 px-3 py-3">
            <UserButton afterSignOutUrl="/" />
            <span className="text-sm text-gray-700 font-medium">My Account</span>
          </div>
        ) : (
          <div className="flex items-center justify-center px-4 py-3">
            <UserButton afterSignOutUrl="/" />
          </div>
        )}
        <Link
          to="/settings"
          className={`flex items-center ${isOpen ? 'gap-3' : 'justify-center'} px-4 py-3 rounded-lg transition-colors ${
            isActive('/settings')
              ? 'bg-orange-50 text-[#ff914c]'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          title={!isOpen ? 'Settings' : ''}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {isOpen && <span className="font-medium">Settings</span>}
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;