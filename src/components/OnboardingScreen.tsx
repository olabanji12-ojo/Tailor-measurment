import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const slides = [
  {
    title: "Measure with your Voice",
    description: "Keep your hands on the fabric. Call out measurements and let TailorVoice capture every detail instantly.",
    icon: "🎙️",
    color: "bg-[#0F172A]"
  },
  {
    title: "Digital Client Archive",
    description: "Every measurement, style preference, and order history stored safely in the cloud. Searchable in seconds.",
    icon: "📁",
    color: "bg-[#1E293B]"
  },
  {
    title: "Visual Context",
    description: "Attach fabric samples and style references directly to jobs. See exactly what your client envisioned.",
    icon: "📸",
    color: "bg-[#334155]"
  }
];

export const OnboardingScreen: React.FC = () => {
  const [step, setStep] = useState<'splash' | 'onboarding'>('splash');
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setStep('onboarding');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const completeOnboarding = (target: string) => {
    localStorage.setItem('tailor_onboarded', 'true');
    navigate(target);
  };

  if (step === 'splash') {
    return (
      <div className="fixed inset-0 bg-[#0F172A] flex flex-col items-center justify-center z-[200] animate-in fade-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
          <img 
            src="/icon-192.png" 
            alt="TailorVoice Logo" 
            className="w-32 h-32 relative z-10 animate-bounce-slow"
          />
        </div>
        <h1 className="mt-8 font-serif text-4xl font-bold text-[#C5A367] tracking-tighter animate-in slide-in-from-bottom-4 duration-1000">
          TailorVoice
        </h1>
        <p className="mt-2 text-gray-400 text-[10px] font-bold uppercase tracking-[0.4em] animate-pulse">
          Bespoke Precision
        </p>
      </div>
    );
  }

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-[150] overflow-hidden">
      {/* Background Gradient */}
      <div className={`absolute top-0 left-0 right-0 h-[60%] transition-colors duration-700 ${slide.color} flex items-center justify-center p-12`}>
        <div className="text-[120px] animate-in zoom-in duration-500">{slide.icon}</div>
      </div>

      {/* Content */}
      <div className="flex-1 mt-[-40px] bg-white rounded-t-[40px] relative z-10 p-10 flex flex-col shadow-2xl overflow-y-auto custom-scrollbar">
        <div className="flex gap-2 mb-8 justify-center">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-[#0F172A]' : 'w-2 bg-gray-200'}`}
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <h2 className="font-serif text-4xl font-bold text-gray-900 leading-tight mb-6 animate-in slide-in-from-bottom-2 duration-500">
            {slide.title}
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed animate-in slide-in-from-bottom-4 duration-700">
            {slide.description}
          </p>
        </div>

        <div className="flex flex-col gap-4 mt-12">
          {isLastSlide ? (
            <>
              <button 
                onClick={() => completeOnboarding('/signup')}
                className="w-full h-16 bg-[#0F172A] text-white rounded-2xl font-bold text-sm tracking-widest uppercase shadow-xl active:scale-95 transition-transform"
              >
                Get Started
              </button>
              <button 
                onClick={() => completeOnboarding('/login')}
                className="w-full h-16 bg-white text-[#0F172A] border-2 border-gray-100 rounded-2xl font-bold text-sm tracking-widest uppercase active:scale-95 transition-transform"
              >
                Sign In
              </button>
            </>
          ) : (
            <button 
              onClick={handleNext}
              className="w-full h-16 bg-[#0F172A] text-white rounded-2xl font-bold text-sm tracking-widest uppercase shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
            >
              Next
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          )}
          
          {!isLastSlide && (
            <button 
              onClick={() => {
                localStorage.setItem('tailor_onboarded', 'true');
                setCurrentSlide(slides.length - 1);
              }}
              className="py-2 text-gray-400 font-bold text-[10px] tracking-widest uppercase hover:text-gray-600"
            >
              Skip Introduction
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
