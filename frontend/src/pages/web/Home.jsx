import React from 'react';
import { useUser } from '@clerk/clerk-react';
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

        {/* AI Tools Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">AI-Powered Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tools.map((tool, idx) => {
              const Icon = tool.icon;
              return (
                <motion.button
                  style={{ cursor: 'pointer' }}
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -5 }}
                  onClick={() => {
                    if (tool.title === "Video-to-GIF") {
                      navigate('/video-to-gif');
                    } else if (tool.title === "YouTube Downloader") {
                      navigate('/yt-downloader');
                    } else if (tool.title === "Silence Remover") {
                      navigate('/remove-silence');
                    } else if (tool.title === "Crop & Resize") {
                      navigate('/crop-resize');
                    } else if (tool.title === "AI Video Summary") {
                      navigate('/ai-video-summary');
                    } else if (tool.title === "Noise Reduction") {
                      navigate('/noise-reduction');
                    } else if (tool.title === "Auto Subtitles") {
                      navigate('/auto-subtitles');
                    }
                  }}
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
                onClick={() => navigate('/yt-downloader')}
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
