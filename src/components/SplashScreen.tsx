import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleEnter = () => {
    setIsExiting(true);
    setTimeout(onComplete, 500); // Wait for fade out animation
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary text-primary-foreground transition-opacity duration-500 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="text-center space-y-6 p-8 animate-in zoom-in-95 duration-700 fade-in">
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm border-2 border-white/20 shadow-xl">
            <GraduationCap className="w-16 h-16 text-primary-foreground" />
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm md:text-base font-medium tracking-[0.3em] text-primary-foreground/80 uppercase">
            WELCOME TO
          </p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight drop-shadow-lg">
            BILALUL HABESHI
          </h1>
          <h2 className="text-xl md:text-3xl font-bold text-primary-foreground/90 tracking-wide">
            PHOTOGRAPHY & VIDEOGRAPHY TRAINING CENTER
          </h2>
        </div>

        <div className="pt-12 relative flex flex-col items-center justify-center gap-8">
          <div className="relative group cursor-pointer" onClick={handleEnter}>
            {/* Radar wave effects */}
            <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20 duration-1000"></div>
            <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-10 delay-150 duration-1000"></div>
            
            {/* Button */}
            <button
              className="relative z-10 px-8 py-4 bg-white text-primary rounded-full font-bold text-lg tracking-widest shadow-2xl hover:bg-white/90 transition-all duration-300 border-4 border-white/20"
              style={{ animation: 'pulse-zoom 2s ease-in-out infinite' }}
            >
              STUDENT PORTAL
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-16 left-0 right-0 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
        <LanguageSwitcher direction="up" splashMode={true} />
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
