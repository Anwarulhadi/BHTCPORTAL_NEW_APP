import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Trash2, Edit, Plus, Save, X, Eye, EyeOff, ArrowUp, ArrowDown, FileText, Book } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

interface Module {
  id: string;
  title: string;
  file_url: string;
  cover_url: string;
  course_category: 'Cinematography' | 'Vision';
  sub_category?: string;
  is_visible: boolean;
  order_index: number;
}

const generateBookCover = (title: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 400, 600);
  gradient.addColorStop(0, '#1e293b'); // slate-800
  gradient.addColorStop(1, '#0f172a'); // slate-900
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 600);

  // Decorative elements
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 40, 600); // Spine
  
  ctx.strokeStyle = '#fbbf24'; // amber-400
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 40, 320, 520);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Wrap text
  const words = title.split(' ');
  let line = '';
  const lineHeight = 40;
  const maxWidth = 300;
  const lines = [];

  for(let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  // Adjust Y to center vertically
  let y = 300 - ((lines.length - 1) * lineHeight) / 2;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 220, y + (i * lineHeight));
  }
  
  // Footer
  ctx.font = 'italic 16px Arial';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('BHTC Module', 220, 540);

  return canvas.toDataURL('image/jpeg', 0.8);
};

export const ModuleManagement = () => {
  const { t } = useLanguage();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [activeTab, setActiveTab] = useState<'Cinematography' | 'Vision'>('Cinematography');
  const [formData, setFormData] = useState({
    title: '',
    course_category: 'Cinematography' as 'Cinematography' | 'Vision',
    sub_category: 'None',
    new_sub_category: '',
    cover_title: '',
    is_visible: true,
    order_index: 0
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [existingSubCategories, setExistingSubCategories] = useState<string[]>([]);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingCategoryName, setEditingCategoryName] = useState<{old: string, new: string} | null>(null);

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
      // Extract unique sub-categories for the current active tab
      const subs = Array.from(new Set(modules
          .filter(m => m.course_category === activeTab)
          .map(m => m.sub_category)
          .filter(Boolean)
          .filter(s => s !== 'None')
      )) as string[];
      setExistingSubCategories(subs);
  }, [modules, activeTab]);

  // Handle Back Button for Dialog
  useEffect(() => {
    if (isDialogOpen) {
      const state = { modal: 'moduleManagement' };
      window.history.pushState(state, '', window.location.href);

      const handlePopState = () => {
        setIsDialogOpen(false);
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isDialogOpen]);

  const handleCloseDialog = () => {
    if (window.history.state?.modal === 'moduleManagement') {
      window.history.back();
    } else {
      setIsDialogOpen(false);
    }
  };

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title) {
      toast.error('Title is required');
      return;
    }
    if (!file && !editingModule) {
      toast.error('File is required for new modules');
      return;
    }

    setUploading(true);
    try {
      let fileUrl = editingModule?.file_url || '';
      let coverUrl = editingModule?.cover_url || '';

      // Upload File
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('module_files') // Assuming bucket exists, need to create if not
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('module_files')
          .getPublicUrl(fileName);
          
        fileUrl = publicUrl;
      }

      // Use static cover images based on category
      // We don't need to upload generated covers anymore as per requirement
      // But we keep the field in DB for backward compatibility or if we revert
      // For now, we just set it to empty or keep existing
      
      // Determine final sub_category
      let finalSubCategory = formData.sub_category;
      if (formData.sub_category === 'new' && formData.new_sub_category) {
          finalSubCategory = formData.new_sub_category;
      }

      const moduleData = {
        title: formData.title,
        file_url: fileUrl,
        cover_url: coverUrl, // We can ignore this in UI and use static images
        course_category: formData.course_category,
        sub_category: finalSubCategory,
        is_visible: formData.is_visible,
        order_index: editingModule ? editingModule.order_index : modules.length
      };

      if (editingModule) {
        const { error } = await supabase
          .from('modules')
          .update(moduleData)
          .eq('id', editingModule.id);
        if (error) throw error;
        toast.success('Module updated');
      } else {
        const { error } = await supabase
          .from('modules')
          .insert([moduleData]);
        if (error) throw error;
        toast.success('Module added');
      }

      handleCloseDialog();
      setFile(null);
      setFormData({ title: '', course_category: activeTab, sub_category: 'None', new_sub_category: '', cover_title: '', is_visible: true, order_index: 0 });
      fetchModules();
    } catch (error: any) {
      console.error('Error saving module:', error);
      toast.error(`Failed to save module: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this module?')) return;
    try {
      const { error } = await supabase.from('modules').delete().eq('id', id);
      if (error) throw error;
      toast.success('Module deleted');
      fetchModules();
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error('Failed to delete module');
    }
  };

  const handleToggleVisibility = async (module: Module) => {
    try {
      const { error } = await supabase
        .from('modules')
        .update({ is_visible: !module.is_visible })
        .eq('id', module.id);
      if (error) throw error;
      fetchModules();
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
      if (!confirm(`Are you sure you want to delete category "${categoryName}"? This will delete ALL modules in this category!`)) return;
      
      try {
          const { error } = await supabase
              .from('modules')
              .delete()
              .eq('course_category', activeTab)
              .eq('sub_category', categoryName);
              
          if (error) throw error;
          toast.success(`Category "${categoryName}" and its modules deleted`);
          fetchModules();
      } catch (error: any) {
          console.error('Error deleting category:', error);
          toast.error(`Failed to delete category: ${error.message}`);
      }
  };

  const handleUpdateCategoryName = async () => {
      if (!editingCategoryName || !editingCategoryName.new.trim()) return;
      
      try {
          const { error } = await supabase
              .from('modules')
              .update({ sub_category: editingCategoryName.new })
              .eq('course_category', activeTab)
              .eq('sub_category', editingCategoryName.old);
              
          if (error) throw error;
          toast.success('Category updated');
          setEditingCategoryName(null);
          fetchModules();
      } catch (error: any) {
          console.error('Error updating category:', error);
          toast.error(`Failed to update category: ${error.message}`);
      }
  };

  const filteredModules = modules.filter(m => m.course_category === activeTab);

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="flex flex-col gap-4">
        <CardTitle className="text-primary">Module Management</CardTitle>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCategoryManagerOpen(true)}>
                Manage Categories
            </Button>
            <Button onClick={() => {
                setEditingModule(null);
                setFormData({ title: '', course_category: activeTab, sub_category: 'None', cover_title: '', is_visible: true, order_index: modules.length });
                setFile(null);
                setIsDialogOpen(true);
                }} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Module
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger 
              value="Cinematography"
              className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-primary border border-primary"
            >
              Cinematography
            </TabsTrigger>
            <TabsTrigger 
              value="Vision"
              className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-primary border border-primary"
            >
              Vision & Sound Editing
            </TabsTrigger>
          </TabsList>
          
          <div className="grid grid-cols-2 gap-2 md:gap-4">
            {filteredModules.map((module) => (
              <div key={module.id} className="flex flex-col justify-between p-2 sm:p-4 bg-white border rounded-lg shadow-sm gap-2 h-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 overflow-hidden w-full">
                  <div className="w-full sm:w-16 h-32 sm:h-24 bg-slate-900 rounded overflow-hidden flex-shrink-0 shadow-md relative">
                    <img 
                      src={module.course_category === 'Cinematography' ? "/book_cover_138.png" : "/book_cover_137.png"}
                      alt={module.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center p-1">
                        <h3 className="text-emerald-600 font-bold text-center text-[8px] leading-tight drop-shadow-sm bg-white/80 p-0.5 rounded">
                            {module.title}
                        </h3>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 w-full">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2 break-words">{module.title}</h4>
                    <p className="text-xs sm:text-sm text-gray-500 truncate w-full">{module.sub_category}</p>
                    <div className="flex items-center mt-1 space-x-2 flex-wrap gap-y-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${module.is_visible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {module.is_visible ? t('active') : t('closed')}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{t('orderIndexLabel')}: {module.order_index}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1 pt-2 border-t mt-auto w-full">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                    onClick={() => handleToggleVisibility(module)}
                  >
                    {module.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    <span className="hidden sm:inline ml-1">{module.is_visible ? t('active') : t('closed')}</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-admin hover:text-admin hover:bg-admin/10 h-8 px-2"
                    onClick={() => {
                        setEditingModule(module);
                        setFormData({
                          new_sub_category: '',
                          title: module.title,
                          course_category: module.course_category,
                          sub_category: module.sub_category || 'None',
                          cover_title: '',
                          is_visible: module.is_visible,
                          order_index: module.order_index
                        });
                        setIsDialogOpen(true);
                      }}
                  >
                    <Edit className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">{t('edit')}</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                    onClick={() => handleDelete(module.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">{t('delete')}</span>
                  </Button>
                </div>
              </div>
            ))}
            {filteredModules.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">No modules found in this category</div>
            )}
          </div>
        </Tabs>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseDialog();
        else setIsDialogOpen(true);
      }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingModule ? 'Edit Module' : 'Add New Module'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Module Title"
                />
              </div>
              <div className="space-y-2">
                <Label>Cover Title (Optional)</Label>
                <Input 
                  value={formData.cover_title} 
                  onChange={(e) => setFormData({ ...formData, cover_title: e.target.value })}
                  placeholder="Text to appear on book cover"
                />
              </div>
              <div className="space-y-2">
                <Label>Sub Category</Label>
                <Select 
                  value={formData.sub_category} 
                  onValueChange={(val) => setFormData({ ...formData, sub_category: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    {existingSubCategories.map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                    <SelectItem value="new">+ Add New Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.sub_category === 'new' && (
                  <div className="space-y-2">
                    <Label>New Category Name</Label>
                    <Input 
                      value={formData.new_sub_category} 
                      onChange={(e) => setFormData({ ...formData, new_sub_category: e.target.value })}
                      placeholder="Enter new category name"
                    />
                  </div>
              )}
              <div className="space-y-2">
                <Label>File (PDF, DOCX, PPT)</Label>
                <Input 
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept=".pdf,.docx,.doc,.ppt,.pptx"
                />
              </div>
              <div className="space-y-2">
                <Label>Order Index</Label>
                <Input 
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                />
              </div>
              <Button onClick={handleSave} disabled={uploading} className="w-full">
                {uploading ? 'Uploading...' : 'Save Module'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Categories ({activeTab === 'Vision' ? 'Vision & Sound Editing' : activeTab})</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {existingSubCategories.length === 0 ? (
                        <p className="text-center text-gray-500">No custom categories found.</p>
                    ) : (
                        <div className="space-y-2">
                            {existingSubCategories.map(cat => (
                                <div key={cat} className="flex items-center justify-between p-2 border rounded bg-gray-50">
                                    {editingCategoryName?.old === cat ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <Input 
                                                value={editingCategoryName.new} 
                                                onChange={(e) => setEditingCategoryName({...editingCategoryName, new: e.target.value})}
                                            />
                                            <Button size="sm" onClick={handleUpdateCategoryName}><Save className="w-4 h-4" /></Button>
                                            <Button size="sm" variant="ghost" onClick={() => setEditingCategoryName(null)}><X className="w-4 h-4" /></Button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="font-medium">{cat}</span>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => setEditingCategoryName({old: cat, new: cat})}>
                                                    <Edit className="w-4 h-4 text-blue-600" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleDeleteCategory(cat)}>
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="pt-4 border-t">
                        <p className="text-sm text-gray-500 mb-2">To add a new category, use the "Add Module" button and select "Add New Category".</p>
                        <Button className="w-full" variant="outline" onClick={() => setIsCategoryManagerOpen(false)}>Close</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </Card>
  );
};
