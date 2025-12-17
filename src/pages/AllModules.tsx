import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Lock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { ModuleAuthDialog } from '@/components/ModuleAuthDialog';
import { ModuleReaderDialog } from '@/components/ModuleReaderDialog';
import { useBackButton } from '@/contexts/BackButtonContext';

interface Module {
  id: string;
  title: string;
  file_url: string;
  cover_url: string;
  course_category: string;
  sub_category?: string;
}

import { App } from '@capacitor/app';

const AllModules = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [filteredModules, setFilteredModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category');
  const highlightParam = searchParams.get('highlight');
  const subPreset = searchParams.get('sub');
  const { t } = useLanguage();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubCategory, setActiveSubCategory] = useState<string>(subPreset || 'All');

  // Auth & Reader State
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showReaderDialog, setShowReaderDialog] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [highlightedModuleId, setHighlightedModuleId] = useState<string | null>(highlightParam);
  const moduleRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleBackButton = useCallback(async () => {
    if (showReaderDialog || showAuthDialog) {
      return false;
    }
    
    // Navigate to home and scroll to text documents
    navigate('/', { state: { scrollTo: 'module-section' } });
    return true;
  }, [showReaderDialog, showAuthDialog, navigate]);

  useBackButton(handleBackButton);

  useEffect(() => {
    fetchModules();
  }, [category]);

  useEffect(() => {
    setHighlightedModuleId(highlightParam);
  }, [highlightParam]);

  useEffect(() => {
    if (subPreset) {
      setActiveSubCategory(subPreset);
    }
  }, [subPreset]);

  useEffect(() => {
    let result = modules;

    // Filter by sub-category
    if (activeSubCategory && activeSubCategory !== 'All') {
      result = result.filter(m => m.sub_category === activeSubCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => m.title.toLowerCase().includes(query));
    }

    setFilteredModules(result);
  }, [modules, searchQuery, activeSubCategory]);

  const fetchModules = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('modules')
        .select('*')
        .eq('is_visible', true)
        .order('order_index', { ascending: true });

      if (category) {
        // Map category names if needed, or use directly
        // The category passed in URL is like "Basic Premiere Pro" which is actually sub_category in some contexts
        // But in ModuleSection it passes "Basic Premiere Pro" as category param
        // Let's check ModuleSection again. 
        // onSeeAll={() => navigate('/modules?category=Basic Premiere Pro')}
        // But in DB, course_category is 'Cinematography' or 'Vision', and sub_category is 'Basic Premiere Pro'
        
        // If the category param matches a sub_category, filter by that.
        // If it matches course_category, filter by that.
        
        // For now, let's fetch all and filter in memory or try to be smart.
        // Or better, let's just fetch all visible modules and let the client side filtering handle it if it's complex,
        // but for performance, let's try to filter.
        
        // Actually, let's just fetch all and filter client side for simplicity as the dataset is small.
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let fetchedModules = data || [];
      
      if (category) {
         fetchedModules = fetchedModules.filter(m => 
             m.course_category === category || m.sub_category === category || (category === 'Vision' && m.course_category === 'Vision')
         );
      }

      setModules(fetchedModules);
      setFilteredModules(fetchedModules);
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModuleClick = (module: Module) => {
    setSelectedModule(module);
    setHighlightedModuleId(module.id);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('highlight', module.id);
    if (module.course_category) {
      newParams.set('category', module.course_category);
    }
    setSearchParams(newParams);
    if (isAuthenticated) {
      setShowReaderDialog(true);
    } else {
      setShowAuthDialog(true);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setShowAuthDialog(false);
    setShowReaderDialog(true);
  };

  const handleGoToAllModules = () => {
    setSearchQuery('');
    setActiveSubCategory('All');
    setHighlightedModuleId(null);
    setSelectedModule(null);
    setSearchParams(new URLSearchParams());
    navigate('/');
    setTimeout(() => {
      const section = document.getElementById('text-documents-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  useEffect(() => {
    if (!highlightedModuleId) return;
    const target = modules.find(m => m.id === highlightedModuleId);
    if (!target) return;
    const targetSub = target.sub_category || 'All';
    if (activeSubCategory !== 'All' && activeSubCategory !== targetSub) {
      setActiveSubCategory(targetSub);
    }
  }, [highlightedModuleId, modules, activeSubCategory]);

  useEffect(() => {
    if (highlightedModuleId) {
        const timer = setTimeout(() => {
            setHighlightedModuleId(null);
        }, 3000); // Remove highlight after 3 seconds
        return () => clearTimeout(timer);
    }
  }, [highlightedModuleId]);

  useEffect(() => {
    if (!highlightedModuleId) return;
    const node = moduleRefs.current[highlightedModuleId];
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [highlightedModuleId, filteredModules]);

  // Extract unique sub-categories for filter chips
  let subCategories: string[] = [];
  
  if (category === 'Vision' || category === 'Cinematography') {
      const dynamicSubs = [...new Set(modules
        .filter(m => m.course_category === category)
        .map(m => m.sub_category)
        .filter(Boolean)
        .filter(s => s !== 'None')
      )];
      if (dynamicSubs.length > 0) {
          subCategories = ['All', ...dynamicSubs];
      } else {
          subCategories = ['All'];
      }
  } else {
      // Fallback for general view if accessed directly without category
      subCategories = ['All', ...new Set(modules
        .map(m => m.sub_category)
        .filter(Boolean)
        .filter(s => s !== 'None')
      )];
  }

  const HighlightText = ({ text, highlight }: { text: string, highlight: string }) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? <span key={i} className="bg-yellow-200 text-black">{part}</span> : part
        )}
      </span>
    );
  };

  const getPageTitle = () => {
      if (category === 'Cinematography') return 'Cinematography Text Documents';
      if (category === 'Vision') return 'Vision & Sound Editing Text Documents';
      return 'All Modules';
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Button 
            variant="ghost" 
            className="w-fit pl-0 hover:bg-transparent hover:text-primary" 
            onClick={handleGoToAllModules}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary uppercase">
                {getPageTitle()}
              </h1>
              <p className="text-muted-foreground mt-1">
                {filteredModules.length} modules available
              </p>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Filter Chips */}
          {subCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {subCategories.map(sub => {
                 let label = sub;
                 if (sub === 'Basic Premiere Pro') label = 'PREMIERE PRO';
                 if (sub === 'Basic Photoshop' || sub === 'Photoshop') label = 'PHOTOSHOP';
                 
                 return (
                <Button
                  key={sub}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                      setActiveSubCategory(sub as string);
                  }}
                  className={`rounded-md font-semibold uppercase border-0 shadow-sm ${
                    activeSubCategory === sub
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white" 
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </Button>
              )})}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {filteredModules.map((module) => {
            const isHighlighted = highlightedModuleId === module.id;
            return (
              <Card 
                key={module.id}
                ref={(node) => { moduleRefs.current[module.id] = node; }}
                className={`group cursor-pointer transition-all duration-300 border-0 bg-white overflow-hidden ${isHighlighted ? 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-background shadow-2xl scale-105' : 'shadow-md hover:scale-105'}`}
                onClick={() => handleModuleClick(module)}
              >
                <div className="p-3 pb-0">
                  <div className="aspect-[2/3] relative rounded-md overflow-hidden shadow-sm">
                      <img 
                      src={module.course_category === 'Cinematography' ? "/book_cover_138.png" : "/book_cover_137.png"}
                      alt={module.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                          <h3 className="text-emerald-600 font-bold text-center text-sm sm:text-base leading-tight drop-shadow-sm bg-white/80 p-1 rounded">
                              {module.title}
                          </h3>
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Lock className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </div>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm truncate text-center text-gray-900" title={module.title}>
                    <HighlightText text={module.title} highlight={searchQuery} />
                  </h3>
                  {module.sub_category && (
                    <p className="text-xs text-center text-muted-foreground mt-1 truncate">
                      {module.sub_category}
                    </p>
                  )}
                  {isHighlighted && (
                    <p className="text-[11px] text-center text-emerald-600 font-semibold mt-2 animate-pulse">
                      Selected from home
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {filteredModules.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">There are no module files available</p>
          </div>
        )}
      </div>

      <ModuleAuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog} 
        onSuccess={handleAuthSuccess} 
      />

      <ModuleReaderDialog 
        open={showReaderDialog} 
        onOpenChange={setShowReaderDialog} 
        module={selectedModule} 
      />
    </div>
  );
};

export default AllModules;
