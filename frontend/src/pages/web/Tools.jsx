import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TOOL_ITEMS } from '../../config/tools';

const Tools = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tools</h1>
          <p className="text-gray-600">All available StudioX tools in one place.</p>
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
    </div>
  );
};

export default Tools;
