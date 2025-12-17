import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Lock } from 'lucide-react';

interface Module {
  id: string;
  title: string;
  file_url: string;
  cover_url: string;
  course_category: string;
  sub_category?: string;
}

export const ModuleSection = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchModules = async () => {
      const { data } = await supabase
        .from('modules')
        .select('*')
        .eq('is_visible', true)
        .order('order_index', { ascending: true });
      
      if (data) setModules(data);
    };
    fetchModules();
  }, []);

  const cinematographyModules = modules.filter(m => m.course_category === 'Cinematography');
  const visionModules = modules.filter(m => m.course_category === 'Vision');

  return (
    <div className="mb-8" id="text-documents-section">
      <h2 className="text-xl font-bold text-white mb-4 px-1">Text Documents</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ModuleColumn title="CINEMATOGRAPHY" modules={cinematographyModules} onSeeAll={() => navigate('/modules?category=Cinematography')} />
        <ModuleColumn title="VISION & SOUND EDITING" modules={visionModules} onSeeAll={() => navigate('/modules?category=Vision')} />
      </div>
    </div>
  );
};

const ModuleColumn = ({ title, modules, onSeeAll }: { title: string, modules: Module[], onSeeAll: () => void }) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Duplicate modules for infinite scroll illusion
  const displayModules = modules.length > 0 ? [...modules, ...modules, ...modules, ...modules] : [];

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || isPaused || displayModules.length === 0) return;

    let animationFrameId: number;
    
    const scroll = () => {
      if (scrollContainer.scrollLeft >= (scrollContainer.scrollWidth - scrollContainer.clientWidth) / 2) {
         if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth - scrollContainer.clientWidth - 1) {
             scrollContainer.scrollLeft = 0;
         } else {
             scrollContainer.scrollLeft += 0.5;
         }
      } else {
         scrollContainer.scrollLeft += 0.5;
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, displayModules.length]);

  const handleInteractionStart = () => setIsPaused(true);
  const handleInteractionEnd = () => {
    setTimeout(() => setIsPaused(false), 2000);
  };

  const handleModuleClick = (module: Module) => {
    const params = new URLSearchParams();
    params.set('category', module.course_category);
    params.set('highlight', module.id);
    if (module.sub_category) {
      params.set('sub', module.sub_category);
    }
    navigate(`/modules?${params.toString()}`);
  };

  if (modules.length === 0) {
    return (
      <Card className="p-4 sm:p-6 shadow-lg bg-white">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          </div>
          <div className="flex items-center justify-center py-8 text-gray-500 text-sm font-medium">
            No Text Documents Available
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6 shadow-lg bg-white">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <Button variant="link" className="text-primary" onClick={onSeeAll}>
            See all
          </Button>
        </div>
        
        <div 
          className="relative overflow-hidden"
          onMouseEnter={handleInteractionStart}
          onMouseLeave={handleInteractionEnd}
          onTouchStart={handleInteractionStart}
          onTouchEnd={handleInteractionEnd}
        >
          <div 
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
            style={{ scrollBehavior: 'auto' }}
          >
            {displayModules.map((module, index) => (
              <div 
                key={`${module.id}-${index}`} 
                className="flex flex-col flex-shrink-0 w-28 cursor-pointer group"
                onClick={() => handleModuleClick(module)}
              >
                <div className="aspect-[2/3] relative overflow-hidden rounded-md shadow-md hover:scale-105 transition-transform duration-200">
                  <img 
                    src={module.course_category === 'Cinematography' ? "/book_cover_138.png" : "/book_cover_137.png"}
                    alt={module.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center p-2">
                      <h3 className="text-emerald-600 font-bold text-center text-xs leading-tight drop-shadow-sm bg-white/80 p-1 rounded">
                          {module.title}
                      </h3>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Lock className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </div>
                <p className="mt-2 text-xs font-semibold text-gray-700 line-clamp-2 leading-tight px-1 text-center">
                  {module.title}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Card>
  );
};
