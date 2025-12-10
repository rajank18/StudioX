import React from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Scissors, Type, MicOff, FileText, Sparkles, 
  VolumeX, Gauge, Image as ImageIcon, Crop, 
  BookOpen, Download, Layout, Upload, Video 
} from 'lucide-react';

const Home = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  const tools = [
    { icon: Scissors, title: "AI Reel Cutter", description: "Turn long videos into shorts" },
    { icon: Type, title: "Auto Subtitles", description: "Generate captions instantly" },
    { icon: MicOff, title: "Silence Remover", description: "Remove awkward pauses" },
    { icon: FileText, title: "AI Video Summary", description: "Quick content summaries" },
    { icon: Sparkles, title: "Quality Enhancer", description: "Upscale video clarity" },
    { icon: VolumeX, title: "Noise Reduction", description: "Crystal clear audio" },
    { icon: Gauge, title: "Speed Controls", description: "Adjust playback speed" },
    { icon: ImageIcon, title: "Video-to-GIF", description: "Create GIFs instantly" },
    { icon: Crop, title: "Crop & Resize", description: "Optimize for platforms" },
    { icon: BookOpen, title: "Chapter Generation", description: "Auto timestamps" },
    { icon: Download, title: "YouTube Downloader", description: "Save videos for editing" },
    { icon: Layout, title: "Thumbnail Generator", description: "Create thumbnails" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.firstName || 'there'}! 👋
            </h1>
            <p className="text-gray-600">Ready to create something amazing?</p>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Quick Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-8 mb-12 text-white shadow-xl"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Start Creating</h2>
              <p className="text-emerald-100">Upload your video and let AI do the magic</p>
            </div>
            <button className="flex items-center gap-3 px-8 py-4 bg-white text-emerald-600 rounded-xl font-semibold hover:bg-emerald-50 transition-all shadow-lg hover:shadow-xl">
              <Upload className="w-5 h-5" />
              Upload Video
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Videos Processed', value: '0', color: 'text-blue-600' },
            { label: 'Total Duration', value: '0m', color: 'text-purple-600' },
            { label: 'Credits Left', value: '10,000', color: 'text-emerald-600' },
            { label: 'Projects', value: '0', color: 'text-orange-600' }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-emerald-600 transition-colors"
            >
              <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* AI Tools Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">AI-Powered Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tools.map((tool, idx) => {
              const Icon = tool.icon;
              return (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -5 }}
                  onClick={() => {
                    if (tool.title === "Video-to-GIF") {
                      navigate('/video-to-gif');
                    }
                  }}
                  className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-emerald-600 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                    <Icon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{tool.title}</h3>
                  <p className="text-sm text-gray-600">{tool.description}</p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Projects</h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-6">Upload your first video to get started</p>
            <button className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors">
              Upload Video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
