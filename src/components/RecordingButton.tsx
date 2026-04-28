import React from 'react';

interface RecordingButtonProps {
  isListening: boolean;
  onClick: () => void;
}

export const RecordingButton: React.FC<RecordingButtonProps> = ({ isListening, onClick }) => {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <button
        onClick={onClick}
        className={`
          relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700
          ${isListening 
            ? 'bg-red-500 scale-110 mic-active-glow' 
            : 'premium-gradient shadow-[0_10px_40px_rgba(197,163,103,0.2)] hover:scale-105 active:scale-95'
          }
        `}
      >
        {/* Animated Rings when listening */}
        {isListening && (
          <>
            <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-25"></div>
            <div className="absolute -inset-4 rounded-full border border-red-500 animate-pulse opacity-20"></div>
          </>
        )}
        
        {isListening ? (
          <div className="flex gap-1.5 items-center">
            {[0.2, 0.4, 0.6, 0.4, 0.2].map((delay, i) => (
              <span 
                key={i}
                className="w-1.5 bg-white rounded-full animate-bounce"
                style={{ height: `${delay * 40}px`, animationDelay: `${i * 0.1}s` }}
              ></span>
            ))}
          </div>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
      <div className="text-center">
        <p className={`text-lg font-medium transition-colors duration-300 ${isListening ? 'text-red-400' : 'text-gray-400'}`}>
          {isListening ? 'System is listening...' : 'Tap to Record Measurements'}
        </p>
        <p className="text-xs text-gray-600 mt-1 uppercase tracking-widest font-bold">Voice-to-Data Engine Active</p>
      </div>
    </div>
  );
};
