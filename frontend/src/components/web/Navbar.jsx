import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import logo from '../../assets/images/logo2.png';

const Navbar = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Login', href: '/sign-in' },
    // { name: 'About Us', href: '#about' }
    
  ];

  return (
    <nav
      className={`z-50 fixed top-0 left-0 right-0 transition-all duration-500 ease-out ${
        isScrolled
          ? 'bg-gray-700 backdrop-blur-md w-[50%] left-[25%] rounded-3xl shadow-sm py-1 mt-2'
          : 'bg-gray-900 backdrop-blur-md py-5 w-full left-0'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <img src={logo} alt="StudioX" className="h-10 w-full " />
          {/* <span className="text-2xl font-bold text-gray-50 hover:text-emerald-600 transition-colors">StudioX</span> */}
        </button>

        {/*oragnge - #ff914c
        cream - #fff8e8 */}

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-gray-50 hover:text-[#ff914c] transition-colors font-medium"
            >
              {link.name}
            </a>
          ))}
          <button 
            onClick={() => navigate('/sign-in')}
            className="px-6 py-2 bg-[#ff914c] text-gray-50 rounded-lg font-semibold hover:bg-[#ff914c] transition-colors cursor-pointer"
          >
            Get Started
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-gray-700"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-gray-50 border-t border-gray-200 overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-gray-700 hover:text-emerald-600 font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
