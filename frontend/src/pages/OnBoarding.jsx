import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { 
  Sparkles, Briefcase, GraduationCap, Video, 
  Mic, Code, Music, Palette, Users, MoreHorizontal,
  Check
} from 'lucide-react';

// Define constants outside component to prevent recreate
const userTypes = [
  { id: 'personal', icon: Sparkles, label: 'Personal use' },
  { id: 'creator', icon: Video, label: 'Creator' },
  { id: 'business', icon: Briefcase, label: 'Content business' },
  { id: 'voice-actor', icon: Mic, label: 'Voice actor' },
  { id: 'engineer', icon: Code, label: 'Engineer' },
  { id: 'marketer', icon: Users, label: 'Marketer' },
  { id: 'education', icon: GraduationCap, label: 'Education' },
  { id: 'other', icon: MoreHorizontal, label: 'Other' }
];

const interests = [
  { id: 'text-to-speech', icon: Sparkles, label: 'Text to speech', color: 'bg-blue-500' },
  { id: 'audiobooks', icon: Music, label: 'Audiobooks', color: 'bg-red-500' },
  { id: 'music', icon: Music, label: 'Music', color: 'bg-orange-500' },
  { id: 'sound-effects', icon: Palette, label: 'Sound effects', color: 'bg-purple-500' },
  { id: 'dubbing', icon: Video, label: 'Dubbing', color: 'bg-green-500' },
  { id: 'voice-overs', icon: Mic, label: 'Voice overs', color: 'bg-pink-500' },
  { id: 'voice-cloning', icon: Users, label: 'Voice cloning', color: 'bg-emerald-500' },
  { id: 'speech-to-text', icon: Code, label: 'Speech to text', color: 'bg-purple-500' },
  { id: 'image-video', icon: Video, label: 'Image & Video', color: 'bg-blue-500' },
  { id: 'podcasts', icon: Mic, label: 'Podcasts', color: 'bg-orange-500' }
];

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    description: 'For hobbyists creating projects with AI audio',
    features: [
      '10k credits/month',
      'Basic editing tools',
      '720p export quality',
      'Community support'
    ]
  },
  {
    name: 'Standard',
    price: '$29',
    period: '/month',
    badge: 'Most Popular',
    discount: 'First month 50% off',
    description: 'For creators making premium content for global audiences',
    features: [
      '100k credits/month',
      'All editing tools',
      '1080p export quality',
      'Priority support',
      'No watermark'
    ],
    popular: true
  },
  {
    name: 'Advanced',
    price: '$79',
    period: '/month',
    description: 'For creators ramping up their content production',
    features: [
      '500k credits/month',
      'Everything in Standard',
      '4K export quality',
      'API access',
      'Team collaboration'
    ]
  }
];

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// --- EXTRACTED AND MEMOIZED STEP COMPONENTS ---

// Step 1: Personal Info
// Wrapped in React.memo to prevent re-render on parent state changes (e.g., currentStep change)
const PersonalInfoStep = React.memo(({ formData, setFormData, months }) => {
    // Helper function to update a single field using functional state update
    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Help us personalize your experience
            </h1>
            
            <div className="mt-12 space-y-6">
                <div>
                    <label className="block text-gray-400 mb-2">What's your name?</label>
                    <div className="grid grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="First name"
                            value={formData.firstName}
                            onChange={(e) => updateField('firstName', e.target.value)}
                            className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-600"
                        />
                        <input
                            type="text"
                            placeholder="Last name"
                            value={formData.lastName}
                            onChange={(e) => updateField('lastName', e.target.value)}
                            className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-600"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-gray-400 mb-2">What's your date of birth?</label>
                    <div className="grid grid-cols-3 gap-4">
                        <input
                            type="number"
                            placeholder="Day"
                            min="1"
                            max="31"
                            value={formData.day}
                            onChange={(e) => updateField('day', e.target.value)}
                            className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-600"
                        />
                        <select
                            value={formData.month}
                            onChange={(e) => updateField('month', e.target.value)}
                            className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-600"
                        >
                            <option value="">Month</option>
                            {months.map((month, idx) => (
                                <option key={idx} value={month}>{month}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            placeholder="Year"
                            min="1900"
                            max="2024"
                            value={formData.year}
                            onChange={(e) => updateField('year', e.target.value)}
                            className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-600"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-gray-400 mb-2">What's your country?</label>
                    <input
                        type="text"
                        placeholder="Enter your country"
                        value={formData.country}
                        onChange={(e) => updateField('country', e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-600"
                    />
                </div>
            </div>
        </div>
    );
});


// Step 2: User Type
const UserTypeStep = React.memo(({ formData, setFormData, userTypes }) => (
    <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center">
            Which one describes you the best?
        </h1>
        
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {userTypes.map((type) => {
                const Icon = type.icon;
                return (
                    <button
                        key={type.id}
                        onClick={() => setFormData(prev => ({...prev, userType: type.id}))}
                        className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                            formData.userType === type.id
                                ? 'bg-zinc-800 border-emerald-600'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                        }`}
                    >
                        <Icon className="w-8 h-8 text-white mx-auto mb-3" />
                        <p className="text-white font-medium">{type.label}</p>
                    </button>
                );
            })}
        </div>
    </div>
));

// Step 3: Interests
const InterestsStep = React.memo(({ formData, toggleInterest, interests }) => (
    <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 text-center">
            What would you like to do with StudioX?
        </h1>
        <p className="text-gray-400 text-center mb-12">Select all that apply</p>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {interests.map((interest) => {
                const Icon = interest.icon;
                const isSelected = formData.interests.includes(interest.id);
                return (
                    <button
                        key={interest.id}
                        onClick={() => toggleInterest(interest.id)}
                        className={`p-6 rounded-2xl border-2 transition-all duration-300 relative ${
                            isSelected
                                ? 'bg-zinc-800 border-emerald-600'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-xl ${interest.color} flex items-center justify-center mx-auto mb-3`}>
                            <Icon className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-white font-medium text-sm">{interest.label}</p>
                    </button>
                );
            })}
        </div>
    </div>
));

// Step 4: Plans
const PlansStep = React.memo(({ formData, setFormData, plans }) => (
    <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 text-center">
            Do more with StudioX
        </h1>
        <p className="text-gray-400 text-center mb-12">Select a plan based on your needs</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
                <button
                    key={plan.name}
                    onClick={() => setFormData(prev => ({...prev, plan: plan.name}))}
                    className={`text-left p-8 rounded-2xl border-2 transition-all duration-300 relative ${
                        formData.plan === plan.name
                            ? 'bg-zinc-800 border-emerald-600'
                            : plan.popular
                            ? 'bg-zinc-900 border-emerald-600'
                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                >
                    {plan.badge && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-600 text-white text-sm font-semibold rounded-full">
                            ⭐ {plan.badge}
                        </div>
                    )}
                    {plan.discount && (
                        <div className="mb-2 px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-full inline-block">
                            {plan.discount}
                        </div>
                    )}
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="mb-4">
                        <span className="text-4xl font-bold text-white">{plan.price}</span>
                        <span className="text-gray-400">{plan.period}</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-6">{plan.description}</p>
                    <ul className="space-y-3">
                        {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="text-gray-300 text-sm">{feature}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-6 pt-6 border-t border-zinc-800">
                        <div className={`w-full py-3 rounded-lg font-semibold text-center ${
                            formData.plan === plan.name
                                ? 'bg-emerald-600 text-white'
                                : 'bg-zinc-800 text-white'
                        }`}>
                            {formData.plan === plan.name ? 'Selected' : 'Select plan'}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    </div>
));


// --- MAIN COMPONENT ---

const OnBoarding = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    day: '',
    month: '',
    year: '',
    country: '',
    userType: '',
    interests: [],
    plan: ''
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save onboarding data and redirect to home
      navigate('/home');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep === totalSteps - 1) {
      navigate('/home');
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const toggleInterest = useCallback((interestId) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId]
    }));
  }, []);
  
  // Array of step components for simple rendering
  const stepComponents = [
    <PersonalInfoStep formData={formData} setFormData={setFormData} months={months} key={0} />,
    <UserTypeStep formData={formData} setFormData={setFormData} userTypes={userTypes} key={1} />,
    <InterestsStep formData={formData} toggleInterest={toggleInterest} interests={interests} key={2} />,
    <PlansStep formData={formData} setFormData={setFormData} plans={plans} key={3} />,
  ];

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 relative overflow-hidden">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-zinc-900 z-50">
        <div 
          className="h-full bg-emerald-600 transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto pt-8">
        {/* Render the current step component */}
        {stepComponents[currentStep]}

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-12">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleSkip}
            className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Skip
          </button>
          {currentStep < totalSteps - 1 ? (
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
            >
              Get Started
            </button>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? 'w-8 bg-white'
                  : idx < currentStep
                  ? 'w-2 bg-emerald-600'
                  : 'w-2 bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnBoarding;