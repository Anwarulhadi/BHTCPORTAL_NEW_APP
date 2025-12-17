import { useEffect, useState } from 'react';
import apiClient from '@/integrations/apiClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
// Removed accordion for simple inline list
import { Search, User, BookOpen, Loader2, MessageCircle, Send, X, Camera, Edit, Download, Lock, Construction, Settings, MoreVertical, Pencil, Trash2, Reply, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { exportGradeReport } from '@/lib/pdfExport';
import { calculateGradeLetter } from '@/lib/gradeUtils';
import { parseStudentNameMetadata } from '@/lib/studentMetadata';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

interface Student {
  student_id: string;
  name: string;
  photo_url: string | null;
  show_final_grade_letter?: boolean;
  password?: string;
  locked?: boolean;
}

interface Grade {
  id: string;
  subject: string;
  grade: number;
  total?: string | number;
}

interface Comment {
  id: string;
  student_id: string;
  message: string;
  sender_type: 'student' | 'teacher';
  created_at: string;
}

const getGradeColor = (grade: number): string => {
  if (grade >= 90) return 'bg-green-500';
  if (grade >= 80) return 'bg-green-400';
  if (grade >= 70) return 'bg-blue-500';
  if (grade >= 60) return 'bg-yellow-500';
  if (grade >= 50) return 'bg-orange-500';
  return 'bg-red-500';
};

export const StudentView = () => {
  const { t } = useLanguage();
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [studentCourseFilter, setStudentCourseFilter] = useState<'all' | 'cinematography' | 'videoediting'>('cinematography');
  const [showCelebration, setShowCelebration] = useState(false);
  const [isPortalEnabled, setIsPortalEnabled] = useState(true);
  const [dismissedComments, setDismissedComments] = useState<string[]>(() => {
    const saved = localStorage.getItem('dismissedStudentComments');
    return saved ? JSON.parse(saved) : [];
  });
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editMessageText, setEditMessageText] = useState('');

  // Lockout state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLocked && lockTimer > 0) {
      interval = setInterval(() => {
        setLockTimer((prev) => prev - 1);
      }, 1000);
    } else if (lockTimer === 0 && isLocked) {
      setIsLocked(false);
      setFailedAttempts(0);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockTimer]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await apiClient.getSchoolSettings();
        if (data) {
          setIsPortalEnabled(data.is_portal_enabled ?? true);
        }
      } catch (e) {
        console.error("Failed to fetch settings", e);
      }
    };
    fetchSettings();

    // Polling fallback (every 5 seconds)
    const interval = setInterval(fetchSettings, 5000);

    // Realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'school_settings',
        },
        (payload) => {
          if (payload.new && typeof payload.new.is_portal_enabled === 'boolean') {
            setIsPortalEnabled(payload.new.is_portal_enabled);
            if (!payload.new.is_portal_enabled) {
               // Force logout/reset state when portal is closed
               setStudent(null);
               setGrades([]);
               setHasSearched(false);
               setPassword('');
               setStudentId('');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const handleDismissComment = async (commentId: string) => {
    // Try to mark as read in DB first
    try {
      await apiClient.markCommentsRead([commentId]);
    } catch (e) {
      console.warn('Could not mark as read in DB, falling back to local dismiss', e);
    }
    
    const newDismissed = [...dismissedComments, commentId];
    setDismissedComments(newDismissed);
    localStorage.setItem('dismissedStudentComments', JSON.stringify(newDismissed));
    toast.success('Message removed');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow only numbers and max 4 digits
    if (/^\d{0,4}$/.test(val)) {
      setPassword(val);
    }
  };

  const handleSearch = async () => {
    if (isLocked) return;

    if (!studentId.trim()) {
      setError('Please enter a student ID');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');
    setHasSearched(true);
    try {
      // Fetch student
      const studentData = await apiClient.getStudent(studentId.trim().toUpperCase());
      if (!studentData) {
        setError('Student not found. Please check your ID.');
        setStudent(null);
        setGrades([]);
        setIsLoading(false);
        return;
      }

      // Check password
      if (studentData.password !== password) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setIsLocked(true);
          setLockTimer(30); // 30 seconds lock
          setError(''); // Clear error to show lock screen
        } else {
          setError(`Incorrect password. ${3 - newAttempts} attempts remaining.`);
        }
        
        setStudent(null);
        setGrades([]);
        setIsLoading(false);
        return;
      }

      // Reset attempts on success
      setFailedAttempts(0);

      if (studentData.locked) {

        setError(`ውድ ተማሪያችን ${studentData.name.split('|||')[0]} የትምህርት ቤት ክፍያዎን ስላልከፈሉ ውጤትዎን በትክክል ማየት አይችሉም። ክፍያዎን በአግባቡ በመፈጸም ድጋሜ ወደዚህ ገፅ መመለስ ይችላሉ!\nት/ቤቱ`);
        setStudent(null);
        setGrades([]);
        setIsLoading(false);
        return;
      }
      const metadata = parseStudentNameMetadata(studentData.name);
      studentData.name = metadata.realName;
      (studentData as Student).show_final_grade_letter = typeof (studentData as any).show_final_grade_letter === 'boolean'
        ? (studentData as any).show_final_grade_letter
        : !!metadata.showGradeLetter;
      (studentData as any).batch_number = metadata.batch || undefined;
      const studentCourse = (studentData as any).course || metadata.course;
      // Use extraTokens as description if present
      let description = undefined;
      if (metadata.extraTokens && metadata.extraTokens.length > 0) {
        description = metadata.extraTokens.join(' ');
      }
      setStudent({ ...studentData, description });
      // Fetch grades
      const gradesData = await apiClient.getGrades(studentId.trim().toUpperCase());
      const parsedGrades = (gradesData || []).map((g: any) => {
        const parts = g.subject.split('|||');
        if (parts.length >= 3 && (parts[0] === 'cinematography' || parts[0] === 'videoediting')) {
          return {
            ...g,
            course: parts[0],
            subject: parts[1],
            total: parts[2]
          } as any;
        }
        if (parts.length === 2 && (parts[0] === 'cinematography' || parts[0] === 'videoediting')) {
          return {
            ...g,
            course: parts[0],
            subject: parts[1],
            total: undefined
          } as any;
        }
        if (parts.length > 1) {
          return {
            ...g,
            subject: parts[0],
            total: parts[1],
            course: g.course || studentCourse
          } as any;
        }
        return {
          ...g,
          course: g.course || studentCourse
        } as any;
      });
      setGrades(parsedGrades);
      // Fetch comments (if supported)
      try {
        const commentsData = await apiClient.getComments(studentId.trim().toUpperCase());
        setComments(commentsData || []);
      } catch { setComments([]); }
    } catch (err) {
      console.error('Search error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !student) return;
    try {
      await apiClient.postComment({
        student_id: student.student_id,
        message: newComment.trim(),
        sender_type: 'student',
      });
      setNewComment('');
      toast.success('Message sent!');
      // Refresh comments
      const commentsData = await apiClient.getComments(student.student_id);
      setComments(commentsData || []);
    } catch (err) {
      console.error('Error sending comment:', err);
      toast.error('Failed to send message');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await apiClient.deleteComment(commentId);
      toast.success('Message deleted');
      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleUpdateComment = async () => {
    if (!editingComment || !editMessageText.trim()) return;
    try {
      await apiClient.updateComment(editingComment.id, editMessageText.trim());
      toast.success('Message updated');
      setEditingComment(null);
      setEditMessageText('');
      // Refresh comments
      if (student) {
        const commentsData = await apiClient.getComments(student.student_id);
        setComments(commentsData || []);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Failed to update message');
    }
  };

  

  const handleSignOut = () => {
    // Clear state and return to initial home view
    setStudent(null);
    setGrades([]);
    setError('');
    setHasSearched(false);
    setStudentId('');
    setPassword('');
    setShowCelebration(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const visibleGrades = studentCourseFilter === 'all' ? grades : grades.filter((g: any) => (g.course || '').toLowerCase() === studentCourseFilter.toLowerCase());
  const totalGrade = visibleGrades.reduce((s, g) => s + Number(g.grade || 0), 0);
  const averageGrade = visibleGrades.length ? Math.round(totalGrade / visibleGrades.length) : 0;
  const celebrationActive = visibleGrades.length > 0 && averageGrade >= 80;

  useEffect(() => {
    if (celebrationActive) {
      setShowCelebration(true);
      const timeout = setTimeout(() => setShowCelebration(false), 2500);
      return () => clearTimeout(timeout);
    }
    setShowCelebration(false);
  }, [celebrationActive, averageGrade]);

  if (!isPortalEnabled) {
    return (
      <div className="space-y-6">
        <Card className="mt-6 border-l-4 border-l-orange-500 bg-white">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="relative">
                <div className="absolute -top-3 -right-3">
                   <Settings className="w-12 h-12 text-orange-300 animate-[spin_3s_linear_infinite] opacity-50" />
                </div>
                <div className="absolute -bottom-2 -left-2">
                   <Settings className="w-8 h-8 text-orange-300 animate-[spin_4s_linear_infinite_reverse] opacity-50" />
                </div>
                <div className="p-5 bg-white rounded-full shadow-md relative z-10 ring-4 ring-orange-100">
                  <Construction className="w-12 h-12 text-orange-500 animate-pulse" />
                </div>
              </div>
              
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-orange-800">
                  {t('portalUnderMaintenance')}
                </h2>
                <p className="text-orange-700/80 font-medium">
                  {t('portalClosedMessage')}
                </p>
                <div className="text-sm text-orange-600 bg-orange-100/50 py-2 px-4 rounded-lg inline-block mt-2">
                  {t('portalContactMessage')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="space-y-6">
        <Card className="mt-6 border-l-4 border-l-primary bg-card">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="p-5 bg-primary/10 rounded-full shadow-md relative z-10 ring-4 ring-primary/20">
                <Lock className="w-12 h-12 text-primary" />
              </div>
              
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-foreground">
                  Locked
                </h2>
                <p className="text-muted-foreground font-medium">
                  Too many failed attempts. Please wait.
                </p>
                <div className="text-3xl font-bold text-primary mt-4">
                  {lockTimer}s
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Search className="w-5 h-5 text-primary" />
            {t('studentSearchTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Input
              placeholder={t('enterStudentIdPlaceholder')}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <div className="flex gap-2 relative">
              <div className="relative flex-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={handlePasswordChange}
                  onKeyPress={handleKeyPress}
                  className="pr-10"
                  maxLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={isLoading}
                className="bg-student hover:bg-student/90"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t('signIn')
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
              <div className="text-destructive font-medium whitespace-pre-line">{error}</div>
            </div>
          )}

          {hasSearched && !student && !isLoading && !error && (
            <p className="text-center text-muted-foreground py-4">
              {t('noResultsFound')}
            </p>
          )}
        </CardContent>
      </Card>

      {student && (
        <>
          {/* Student Info & Grades Card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Student Info */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={student.photo_url || undefined} />
                  <AvatarFallback className="bg-student text-white">
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{student.name}</h3>
                  <p className="text-muted-foreground text-sm">ID: {student.student_id}</p>
                  {/* Description Box */}
                  {student.description && (
                    <div className="mt-2">
                      <div className="bg-muted/50 border border-border rounded-lg p-3 max-w-full overflow-y-auto break-words max-h-40">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{student.description}</p>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSearch}
                  disabled={isLoading}
                  title="Refresh"
                >
                  <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Grades */}
              {grades.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between relative">
                      {showCelebration && (
                        <div className="absolute inset-0 pointer-events-none flex justify-center items-center gap-6">
                          <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                          <span className="w-2 h-2 rounded-full bg-yellow-300 animate-ping delay-150" />
                          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping delay-300" />
                        </div>
                      )}
                      <h4 className="font-medium flex items-center gap-2 text-base sm:text-lg">
                        <BookOpen className="w-4 h-4 text-student" />
                        {t('yourGrades')}
                      </h4>
                      <div className={`inline-flex items-center justify-center h-9 px-3 rounded-md font-bold text-sm ${getGradeColor(totalGrade)}`}>
                        <span className="text-white">
                          {totalGrade}%
                          {student?.show_final_grade_letter ? ` ${calculateGradeLetter(totalGrade)}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={studentCourseFilter === 'cinematography' ? 'default' : 'outline'}
                        onClick={() => setStudentCourseFilter('cinematography')}
                        className={studentCourseFilter === 'cinematography' ? 'bg-student hover:bg-student/90 flex items-center gap-2' : 'flex items-center gap-2'}
                      >
                        <Camera className="w-4 h-4" />
                        <span>{t('cinematography')}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant={studentCourseFilter === 'videoediting' ? 'default' : 'outline'}
                        onClick={() => setStudentCourseFilter('videoediting')}
                        className={studentCourseFilter === 'videoediting' ? 'bg-student hover:bg-student/90 flex items-center gap-2' : 'flex items-center gap-2'}
                      >
                        <Edit className="w-4 h-4" />
                        <span>{t('videoEditing')}</span>
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {visibleGrades.length > 0 ? (
                      visibleGrades.map((grade) => (
                        <div
                          key={grade.id}
                          className="flex items-center justify-between p-3 bg-card border rounded-lg"
                        >
                          <span className="font-medium flex-1">{grade.subject}</span>
                          <span className="w-px h-6 bg-border mx-3" aria-hidden="true" />
                          <span className="font-bold text-right min-w-[80px]">
                            {grade.grade}{grade.total ? ` / ${grade.total}` : '%'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <div>
                          {t('teacherNotSubmitted')}{' '}
                          <span 
                            onClick={() => document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' })}
                            className="text-blue-600 underline cursor-pointer hover:text-blue-800 font-medium"
                          >
                            {t('pleaseContactThem')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 flex justify-end items-center gap-2">
                    {visibleGrades.length > 0 && (
                      <Button
                        onClick={async () => {
                          if (!student || visibleGrades.length === 0) {
                            toast.error('No grades to export');
                            return;
                          }
                          const avg = Math.round(visibleGrades.reduce((s, g) => s + Number(g.grade || 0), 0) / (visibleGrades.length || 1));
                          try {
                            const res = await exportGradeReport(
                              { name: student.name, student_id: student.student_id, batch_number: (student as any).batch_number },
                              visibleGrades.map(g => ({ subject: g.subject, grade: g.grade, total: g.total })),
                              avg,
                              { openInNewTab: false, showGradeLetter: !!student.show_final_grade_letter, courseTitle: studentCourseFilter === 'cinematography' ? 'Cinematography' : (studentCourseFilter === 'videoediting' ? 'Vision & Sound Editing' : 'All'), logoPath: '/Bilal%20Videography%20Logo%20only%20white.png' }
                            );
                            if (res?.saved) toast.success('PDF download started');
                          } catch (err) {
                            console.error('Export error', err);
                            toast.error('Failed to export PDF');
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white gap-2"
                      >
                        <Download className="w-4 h-4" />
                        {t('exportGradeReport')}
                      </Button>
                    )}
                  </div>

                  {/* Grade Letter Conversion Table */}
                  <div className="mt-8 border rounded-xl overflow-hidden shadow-sm bg-card">
                    <div className="bg-muted/50 p-4 border-b">
                      <h4 className="font-semibold text-base flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-primary rounded-full"/>
                        Grade Letter Conversion
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b bg-muted/20">
                            <th className="px-6 py-3 font-medium text-muted-foreground">Percentage (%)</th>
                            <th className="px-6 py-3 font-medium text-muted-foreground">Grade Letter</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          <tr className="hover:bg-muted/50 transition-colors"><td className="px-6 py-3 font-medium">95 – 100</td><td className="px-6 py-3 font-bold text-emerald-600">A+</td></tr>
                          <tr className="hover:bg-muted/50 transition-colors"><td className="px-6 py-3 font-medium">92 – 94.99</td><td className="px-6 py-3 font-bold text-emerald-600">A</td></tr>
                          <tr className="hover:bg-muted/50 transition-colors"><td className="px-6 py-3 font-medium">89 – 91.99</td><td className="px-6 py-3 font-bold text-emerald-500">A-</td></tr>
                          <tr className="hover:bg-muted/50 transition-colors"><td className="px-6 py-3 font-medium">86 – 88.99</td><td className="px-6 py-3 font-bold text-blue-600">B+</td></tr>
                          <tr className="hover:bg-muted/50 transition-colors"><td className="px-6 py-3 font-medium">83 – 85.99</td><td className="px-6 py-3 font-bold text-blue-600">B</td></tr>
                          <tr className="hover:bg-muted/50 transition-colors"><td className="px-6 py-3 font-medium">80 – 82.99</td><td className="px-6 py-3 font-bold text-blue-500">B-</td></tr>
                          <tr className="hover:bg-muted/50 transition-colors"><td className="px-6 py-3 font-medium">77 – 79.99</td><td className="px-6 py-3 font-bold text-amber-600">C+</td></tr>
                          <tr className="hover:bg-muted/50 transition-colors"><td className="px-6 py-3 font-medium">74 – 76.99</td><td className="px-6 py-3 font-bold text-amber-600">C</td></tr>
                          <tr className="hover:bg-muted/50 transition-colors bg-red-50/50"><td className="px-6 py-3 font-medium">&lt; 74</td><td className="px-6 py-3 font-bold text-red-600">NON CMPITANT</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={handleSignOut}
                    >
                      {t('signOut')}
                    </Button>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  {t('noGradesAvailable')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Teacher Comments Card */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-primary">{t('recentTeacherComments')}</span>
                  {comments.filter(c => c.sender_type === 'teacher' && !dismissedComments.includes(c.id)).length > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse whitespace-nowrap flex items-center justify-center shrink-0">
                      {comments.filter(c => c.sender_type === 'teacher' && !dismissedComments.includes(c.id)).length} {t('newLabel')}
                    </span>
                  )}
                </div>
                {comments.filter(c => c.sender_type === 'teacher' && !dismissedComments.includes(c.id)).length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 px-3"
                    onClick={async () => {
                      const allIds = comments.filter(c => c.sender_type === 'teacher' && !dismissedComments.includes(c.id)).map(c => c.id);
                      
                      // Mark as read in DB (if student can mark teacher comments as read)
                      // Assuming 'is_read' logic applies here too, or we just rely on local dismiss if DB update is not allowed for students on this table.
                      // But user asked for "forever", so we try to update DB.
                      try {
                        await apiClient.markCommentsRead(allIds);
                      } catch (e: any) {
                         console.warn('Could not mark as read in DB, falling back to local dismiss', e);
                         toast.error(`Failed to sync with server: ${e.message || 'Unknown error'}`);
                      }

                      const newDismissed = [...dismissedComments, ...allIds];
                      setDismissedComments(newDismissed);
                      localStorage.setItem('dismissedComments', JSON.stringify(newDismissed));
                      toast.success('All messages cleared');
                    }}
                  >
                    {t('clearAll')}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {comments
                .filter(c => c.sender_type === 'teacher' && !dismissedComments.includes(c.id))
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5)
                .map((comment) => (
                  <div key={comment.id} className="flex items-start justify-between p-3 bg-muted rounded-lg border border-border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">Teacher</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm">{comment.message}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 -mt-1 -mr-1">
                      <Button
                        size="sm"
                        className="h-6 px-3 bg-green-500 hover:bg-green-600 text-white rounded-full text-xs font-medium"
                        onClick={() => document.getElementById('chat-section')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        {t('reply')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDismissComment(comment.id)}
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              {comments.filter(c => c.sender_type === 'teacher' && !dismissedComments.includes(c.id)).length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">{t('noRecentComments')}</p>
              )}
            </CardContent>
          </Card>

          {/* Chat with Teacher Card */}
          <Card id="chat-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-student" />
                {t('chatWithTeacher')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">{t('noMessagesYet')}</p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-3 rounded-lg group relative ${
                        comment.sender_type === 'student' ? 'bg-student/10 ml-8' : 'bg-muted mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {comment.sender_type === 'student' ? t('youLabel') : t('teacherLabel')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>

                        {/* Allow editing/deleting own messages */}
                        {comment.sender_type === 'student' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-70 hover:opacity-100">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setEditingComment(comment);
                                setEditMessageText(comment.message);
                              }}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t('editMessage')}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('deleteMessage')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <div className="text-sm whitespace-pre-wrap break-words">{comment.message}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t('messagePlaceholder')}
                />
                <Button
                  onClick={handleSendComment}
                  disabled={!newComment.trim()}
                  className="bg-student hover:bg-student/90"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={!!editingComment} onOpenChange={(open) => !open && setEditingComment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editMessage')}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editMessageText}
            onChange={(e) => setEditMessageText(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingComment(null)}>{t('cancel')}</Button>
            <Button onClick={handleUpdateComment}>{t('saveChanges')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
