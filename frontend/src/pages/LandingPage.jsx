import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Scissors, Type, MicOff, FileText, Sparkles, 
  VolumeX, Gauge, Image as ImageIcon, Crop, 
  BookOpen, Download, Layout, Check, 
  Section
} from 'lucide-react';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const FeatureCard = ({ icon: Icon, title, description }) => (
  <motion.div
    variants={fadeInUp}
    whileHover={{ y: -5 }}
    className="relative p-6 rounded-2xl bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 group"
  >
    <div className="relative z-10">
      <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center mb-4 group-hover:border-emerald-600 transition-colors duration-300 shadow-sm">
        <Icon className="text-gray-700 group-hover:text-emerald-600 transition-colors duration-300" size={22} strokeWidth={2} />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-2 tracking-tight">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

const PricingCard = ({ name, price, period, features, isPopular }) => (
  <motion.div
    variants={fadeInUp}
    className={`relative p-8 rounded-2xl border-2 transition-all duration-300 ${
      isPopular 
        ? 'bg-gray-800 border-gray-100 shadow-xl shadow-gray-700/30' 
        : 'bg-white border-gray-200 hover:border-emerald-600 hover:shadow-lg'
    }`}
  >
    {isPopular && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-700 text-white text-sm font-semibold rounded-full">
        Most Popular
      </div>
    )}
    <div className="mb-6">
      <h3 className={`text-xl font-bold mb-2 ${isPopular ? 'text-white' : 'text-gray-900'}`}>{name}</h3>
      <div className="flex items-baseline gap-1">
        <span className={`text-4xl font-bold ${isPopular ? 'text-white' : 'text-gray-900'}`}>{price}</span>
        {period && <span className={`text-base ${isPopular ? 'text-emerald-100' : 'text-gray-600'}`}>/{period}</span>}
      </div>
    </div>
    <ul className="space-y-3 mb-8">
      {features.map((feature, idx) => (
        <li key={idx} className="flex items-start gap-3">
          <Check className={`mt-0.5 flex-shrink-0 ${isPopular ? 'text-emerald-200' : 'text-emerald-600'}`} size={18} strokeWidth={2.5} />
          <span className={`text-sm ${isPopular ? 'text-emerald-50' : 'text-gray-700'}`}>{feature}</span>
        </li>
      ))}
    </ul>
    <button className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
      isPopular 
        ? 'bg-white text-emerald-600 hover:bg-emerald-50' 
        : 'bg-gray-800 text-white hover:bg-emerald-700'
    }`}>
      Get Started
    </button>
  </motion.div>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const features = [
    { icon: Scissors, title: "AI Reel Cutter", description: "Automatically turn long videos into engaging shorts." },
    { icon: Type, title: "Auto Subtitles", description: "Generate accurate captions in seconds." },
    { icon: MicOff, title: "Silence Remover", description: "Cut out awkward pauses automatically." },
    { icon: FileText, title: "AI Video Summary", description: "Get quick summaries of long content." },
    { icon: Sparkles, title: "Quality Enhancer", description: "Upscale and improve video clarity." },
    { icon: VolumeX, title: "Noise Reduction", description: "Remove background noise for crisp audio." },
    { icon: Gauge, title: "Speed Controls", description: "Adjust playback speed with precision." },
    { icon: ImageIcon, title: "Video-to-GIF", description: "Convert memorable moments into GIFs." },
    { icon: Crop, title: "Crop & Resize", description: "Optimize for any social platform." },
    { icon: BookOpen, title: "Chapter Generation", description: "Auto-generate timestamps and chapters." },
    { icon: Download, title: "YouTube Downloader", description: "Save videos directly for editing." },
    { icon: Layout, title: "Thumbnail Generator", description: "Create click-worthy thumbnails instantly." },
  ];

  return (
    <div className="overflow-hidden bg-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden bg-gradient-to-b from-gray-100 to-gray-800">
        {/* Subtle Pattern Background */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl mx-auto"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-gray-50 ">
              <div className="w-2 h-2 rounded-full bg-gray-800" />
              <span className="text-black text-sm font-medium">AI-Powered Video Studio</span>
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-6 leading-tight">
              One tool to manage
              <br />
              videos and your content
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              StudioX helps legal teams work faster, smarter and more efficiently, delivering top visibility and data-driven insights to mitigate risk and ensure compliance.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => navigate('/sign-up')}
                className="group relative w-full sm:w-auto px-8 py-4 rounded-lg bg-gray-900 text-white font-semibold text-base overflow-hidden shadow-lg hover:shadow-xl hover:bg-gray-800 cursor-pointer transition-all duration-300"
              >
                Start for Free
              </button>
              <button 
                onClick={() => navigate('/sign-in')}
                className="relative w-full sm:w-auto px-8 py-4 rounded-lg bg-white border-2 cursor-pointer border-gray-300 text-gray-700 font-semibold text-base hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
              >
                Get a Demo
              </button>
            </motion.div>

            {/* Social Proof */}
            <motion.div variants={fadeInUp} className="mt-16">
              <p className="text-sm text-gray-500 mb-6">More than 100+ companies partner</p>
              <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
                <span className="text-gray-400 font-semibold text-lg">HubSpot</span>
                <span className="text-gray-400 font-semibold text-lg">Dropbox</span>
                <span className="text-gray-400 font-semibold text-lg">Square</span>
                <span className="text-gray-400 font-semibold text-lg">Intercom</span>
                <span className="text-gray-400 font-semibold text-lg">Community</span>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-800 relative">
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-block px-4 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium mb-4">
              StudioX FEATURES
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-200 mb-4 tracking-tight">
              Latest advanced technologies to ensure everything you needs
            </h2>
            <p className=" text-gray-400 text-lg ">
              Maximize your team's productivity and security without affordability, user-friendly contract management system.
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-gray-800 to-gray-50 relative">
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-block px-4 py-1.5 rounded-full bg-gray-50 text-black text-sm font-medium mb-4">
              PRICING
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-200 mb-4 tracking-tight">
              Choose Your Plan
            </h2>
            <p className="text-gray-600 text-lg font-light">
              Simple, transparent pricing for teams of all sizes
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          >
            <PricingCard
              name="Free"
              price="$0"
              period=""
              features={[
                "AI Reel Cutter (5 videos/month)",
                "Auto Subtitles",
                "Basic video editing",
                "720p export quality",
                "Community support",
                "Watermark on exports"
              ]}
              isPopular={false}
            />
            <PricingCard
              name="Standard"
              price="$29"
              period="month"
              features={[
                "AI Reel Cutter (unlimited)",
                "Auto Subtitles (unlimited)",
                "All editing tools",
                "1080p export quality",
                "Priority support",
                "No watermark",
                "Cloud storage (50GB)",
                "Batch processing"
              ]}
              isPopular={true}
            />
            <PricingCard
              name="Advanced"
              price="$79"
              period="month"
              features={[
                "Everything in Standard",
                "4K export quality",
                "AI Video Summary",
                "Advanced analytics",
                "Team collaboration",
                "Cloud storage (500GB)",
                "API access",
                "Dedicated support"
              ]}
              isPopular={false}
            />
          </motion.div>
        </div>
      </section>

      

      {/* Why StudioX Section */}
      <section id="why" className="py-24 bg-gradient-to-b from-gray-50 to-gray-50 text-gray-900 relative overflow-hidden  border-gray-200">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Why StudioX?</h2>
            <p className="text-gray-600 text-lg font-light">Built for speed, quality, and simplicity.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Lightning Fast", desc: "Process videos in seconds with optimized cloud rendering." },
              { title: "Studio Quality", desc: "Export in 4K with professional-grade audio and visuals." },
              { title: "Private & Secure", desc: "Your content is encrypted and auto-deleted after processing." }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="p-8 rounded-2xl bg-white border-2 border-gray-200 hover:border-emerald-600 hover:shadow-lg transition-all duration-300"
              >
                <h3 className="text-xl font-semibold mb-3 text-gray-900">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed text-base font-light">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="bg-gray-800 rounded-2xl p-12 md:p-20 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.1)_1px,transparent_1px)] bg-[size:32px_32px]" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Ready to Create?</h2>
              <p className="text-emerald-50 text-lg mb-10 max-w-2xl mx-auto font-light">
                Join thousands of creators who are making professional videos without the hassle.
              </p>
              <button className="group relative px-10 py-4 bg-white text-emerald-600 rounded-lg font-semibold text-base overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-emerald-50">
                <span className="relative inline-flex items-center gap-2">
                  Get Started Free
                  <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
  