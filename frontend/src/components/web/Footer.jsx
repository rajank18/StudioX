import React from 'react';
import { Github, Twitter, Instagram, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 pt-15 pb-7 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold bg-clip-text text-gray-200 mb-4">
              StudioX
            </h3>
            <p className="text-gray-400 max-w-sm leading-relaxed">
              The all-in-one AI video toolkit designed for modern creators. 
              Edit, enhance, and transform your content with ease.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-gray-300 mb-6">Product</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-400 hover:text-purple-600 transition-colors">Features</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-600 transition-colors">Pricing</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-600 transition-colors">Tutorials</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-600 transition-colors">Updates</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-300 mb-6">Company</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-400 hover:text-purple-600 transition-colors">About</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-600 transition-colors">Careers</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-600 transition-colors">Contact</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-600 transition-colors">Privacy</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-gray-200">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            © 2025 StudioX. All rights reserved.
          </p>
          
          <div className="flex items-center space-x-6">
            <a href="#" className="text-gray-400 hover:text-purple-600 transition-colors"><Twitter size={20} /></a>
            <a href="#" className="text-gray-400 hover:text-purple-600 transition-colors"><Github size={20} /></a>
            <a href="#" className="text-gray-400 hover:text-purple-600 transition-colors"><Instagram size={20} /></a>
          </div>
        </div>
        
        <div className="text-center mt-8 text-gray-400 text-sm flex items-center justify-center gap-1">
          Made with <Heart size={14} className="text-red-400 fill-current" /> by StudioX Team
        </div>
      </div>
    </footer>
  );
};

export default Footer;
