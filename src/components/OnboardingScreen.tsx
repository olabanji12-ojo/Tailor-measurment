import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { VideoWrapper } from './ui/VideoWrapper';

const slides = [
  {
    title: "Voice-Guided Precision",
    description: "Keep your hands on the shears and fabric. Dictate measurements naturally and let TailorVoice capture every detail instantly.",
    video: "/tailor-animation/voice-recognition-animation-gif-download-12817365.mp4"
  },
  {
    title: "Bespoke Tailoring",
    description: "Configure custom garments from luxury suits to traditional wear. Lay out patterns dynamically to minimize fabric waste.",
    video: "/tailor-animation/sewing-machine-animation-gif-download-12865469.mp4"
  },
  {
    title: "The Digital Atelier",
    description: "Access client measurement histories and style lookbooks anywhere. Auto-sync offline entries once you are back online.",
    video: "/tailor-animation/diy-journal-animation-gif-download-12865474.mp4"
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
      <div className="fixed inset-0 bg-primary flex flex-col items-center justify-center z-[200] animate-in fade-in duration-750 select-none">
        <div className="relative flex flex-col items-center">
          <h1 className="font-serif text-6xl font-medium text-accent tracking-tighter animate-breath">
            TailorVoice
          </h1>
          <p className="mt-3 text-accent/50 text-[9px] font-bold uppercase tracking-[0.4em] animate-pulse">
            Bespoke Precision
          </p>
        </div>
      </div>
    );
  }

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="fixed inset-0 bg-bg-light flex flex-col lg:flex-row z-[150] overflow-hidden select-none">
      
      {/* Visual Workspace (Left Panel on Desktop / Top Panel on Mobile) */}
      <div className="w-full lg:w-1/2 h-[40vh] lg:h-full bg-white lg:bg-primary border-b lg:border-b-0 lg:border-r border-border-subtle flex flex-col items-center justify-center p-6 lg:p-12 relative transition-all duration-500">
        {/* Desktop Branding Header */}
        <div className="hidden lg:block absolute top-12 left-12">
          <span className="font-serif text-3xl font-medium text-accent tracking-tighter">TailorVoice</span>
        </div>
        
        {/* Video Portal Container */}
        <div className="w-48 h-48 lg:w-80 lg:h-80 transition-all duration-300">
          <VideoWrapper 
            src={slide.video} 
            containerClassName="shadow-xl shadow-primary/5 rounded-[40px] border-accent/20 bg-white"
          />
        </div>

        {/* Desktop Subtle Label */}
        <div className="hidden lg:block absolute bottom-12 text-accent/50 text-[9px] font-bold uppercase tracking-[0.4em]">
          Bespoke Precision — Step 0{currentSlide + 1}
        </div>
      </div>

      {/* Narrative Workspace (Right Panel on Desktop / Bottom Panel on Mobile) */}
      <div className="flex-1 mt-[-20px] lg:mt-0 bg-bg-light rounded-t-[32px] lg:rounded-none relative z-10 p-8 lg:p-16 flex flex-col justify-between border-t lg:border-t-0 border-border-subtle shadow-[0_-12px_30px_rgba(27,18,15,0.02)] lg:shadow-none">
        
        {/* Horizontal Loading Indicator Lines */}
        <div className="flex gap-2 mb-6 lg:mb-12 justify-center lg:justify-start">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={`h-[2px] rounded-full transition-all duration-300 ${
                i === currentSlide 
                  ? 'w-10 lg:w-14 bg-accent' 
                  : i < currentSlide 
                    ? 'w-3 lg:w-4 bg-primary' 
                    : 'w-3 lg:w-4 bg-primary/10'
              }`}
            />
          ))}
        </div>

        {/* Narrative Copy */}
        <div className="flex-1 flex flex-col justify-center items-center lg:items-start text-center lg:text-left max-w-md mx-auto lg:mx-0">
          <span className="text-[10px] font-bold text-accent tracking-[0.3em] uppercase mb-3">
            0{currentSlide + 1} / 03
          </span>
          <h2 className="font-serif text-3xl lg:text-5xl font-medium text-primary leading-tight mb-5 lg:mb-6 animate-in slide-in-from-bottom-2 duration-500">
            {slide.title}
          </h2>
          <p className="text-text-muted text-base lg:text-lg font-sans leading-relaxed animate-in slide-in-from-bottom-4 duration-700">
            {slide.description}
          </p>
        </div>

        {/* Actions Button Panel */}
        <div className="flex flex-col gap-4 mt-8 lg:mt-0 max-w-md w-full mx-auto lg:mx-0 shrink-0">
          {isLastSlide ? (
            <div className="flex flex-col sm:flex-row gap-3 w-full shrink-0">
              <Button 
                variant="primary"
                onClick={() => completeOnboarding('/signup')}
                className="w-full sm:flex-1 h-14 shrink-0"
              >
                Get Started
              </Button>
              <Button 
                variant="secondary"
                onClick={() => completeOnboarding('/login')}
                className="w-full sm:flex-1 h-14 shrink-0"
              >
                Sign In
              </Button>
            </div>
          ) : (
            <div className="flex justify-between items-center w-full shrink-0">
              <button 
                onClick={() => {
                  localStorage.setItem('tailor_onboarded', 'true');
                  setCurrentSlide(slides.length - 1);
                }}
                className="text-text-muted font-bold text-[9px] tracking-widest uppercase hover:text-primary transition-colors py-2"
              >
                Skip Intro
              </button>
              
              <Button 
                variant="primary"
                onClick={handleNext}
                className="h-14 px-8 flex items-center gap-2 shrink-0"
              >
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
