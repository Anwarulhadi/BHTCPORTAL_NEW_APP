import { useState } from 'react';
import { GraduationCap } from 'lucide-react';

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleEnter = () => {
    setIsExiting(true);
    setTimeout(onComplete, 500); // Wait for fade out animation
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-green-600 text-white transition-opacity duration-500 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="text-center space-y-6 p-8 animate-in zoom-in-95 duration-700 fade-in">
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm border-2 border-white/20 shadow-xl">
            <GraduationCap className="w-16 h-16 text-white" />
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm md:text-base font-medium tracking-[0.3em] text-green-100 uppercase">
            Welcome To
          </p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight drop-shadow-lg">
            BILALUL HABESHI
          </h1>
          <h2 className="text-xl md:text-3xl font-bold text-green-50 tracking-wide">
            TRAINING CENTER
          </h2>
        </div>

        <div className="pt-12 relative flex justify-center">
          <div className="relative group cursor-pointer" onClick={handleEnter}>
            {/* Radar wave effects */}
            <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20 duration-1000"></div>
            <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-10 delay-150 duration-1000"></div>
            
            {/* Button */}
            <button
              className="relative z-10 px-8 py-4 bg-white text-green-800 rounded-full font-bold text-lg tracking-widest shadow-2xl hover:bg-green-50 transition-all duration-300 border-4 border-green-600/20"
              style={{ animation: 'pulse-zoom 2s ease-in-out infinite' }}
            >
              STUDENT PORTAL
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-zoom {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};
