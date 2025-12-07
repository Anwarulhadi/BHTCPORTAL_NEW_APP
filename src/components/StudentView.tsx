import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
// Removed accordion for simple inline list
import { Search, User, BookOpen, Loader2, MessageCircle, Send, X, Camera, Edit, Download } from 'lucide-react';
import { exportGradeReport } from '@/lib/pdfExport';
import { calculateGradeLetter } from '@/lib/gradeUtils';
import { parseStudentNameMetadata } from '@/lib/studentMetadata';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface Student {
  student_id: string;
  name: string;
  photo_url: string | null;
  show_final_grade_letter?: boolean;
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
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [studentCourseFilter, setStudentCourseFilter] = useState<'all' | 'cinematography' | 'videoediting'>('cinematography');
  const [showCelebration, setShowCelebration] = useState(false);
  const [dismissedComments, setDismissedComments] = useState<string[]>(() => {
    const saved = localStorage.getItem('dismissedStudentComments');
    return saved ? JSON.parse(saved) : [];
  });

  const handleDismissComment = (commentId: string) => {
    const newDismissed = [...dismissedComments, commentId];
    setDismissedComments(newDismissed);
    localStorage.setItem('dismissedStudentComments', JSON.stringify(newDismissed));
    toast.success('Message removed');
  };

  const handleSearch = async () => {
    if (!studentId.trim()) {
      setError('Please enter a student ID');
      return;
    }

    setIsLoading(true);
    setError('');
    setHasSearched(true);

    try {
      // Fetch student
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId.trim().toUpperCase())
        .single();

      if (studentError || !studentData) {
        setError('Student not found. Please check your ID.');
        setStudent(null);
        setGrades([]);
        setIsLoading(false);
        return;
      }

      // Check if student is locked
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
      // include batch number for PDF export
      (studentData as any).batch_number = metadata.batch || undefined;
      setStudent(studentData);

      // Fetch grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', studentId.trim().toUpperCase());

      if (gradesError) {
        console.error('Error fetching grades:', gradesError);
      }

      // Parse subject to extract course and outOf if present.
      // Supported formats:
      // 1) "course|||subject|||outOf"
      // 2) "subject|||outOf"
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
        if (parts.length > 1) {
          return {
            ...g,
            subject: parts[0],
            total: parts[1]
          } as any;
        }
        return g as any;
      });

      setGrades(parsedGrades);

      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('student_id', studentId.trim().toUpperCase())
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
      }
      setComments((commentsData as Comment[]) || []);
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
      const { error } = await supabase
        .from('comments')
        .insert({
          student_id: student.student_id,
          message: newComment.trim(),
          sender_type: 'student',
        });

      if (error) throw error;
      setNewComment('');
      toast.success('Message sent!');
      // Refresh comments
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('student_id', student.student_id)
        .order('created_at', { ascending: true });
      setComments((data as Comment[]) || []);
    } catch (err) {
      console.error('Error sending comment:', err);
      toast.error('Failed to send message');
    }
  };

  

  const handleSignOut = () => {
    // Clear state and return to initial home view
    setStudent(null);
    setGrades([]);
    setError('');
    setHasSearched(false);
    setStudentId('');
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

  return (
    <div className="space-y-6">
      {/* Login to Authenticated Student Portal Card */}
      <Card className="mt-6 border-2 border-student bg-gradient-to-br from-student/5 to-student/10">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-student rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-student">
                {t('studentPanelButton')}
              </h3>
              <p className="text-muted-foreground mt-1">
                {t('loginToStudentPortalDescription')}
              </p>
            </div>
            <Button
              onClick={() => navigate('/student-auth')}
              className="bg-student hover:bg-student/90 text-white font-semibold px-8 py-6 h-auto text-lg"
            >
              <User className="w-5 h-5 mr-2" />
              {t('loginToStudentPortal')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Grade Check - Public Search */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-student" />
            {t('studentSearchTitle')}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {t('quickGradeCheckDescription')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={t('enterStudentIdPlaceholder')}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch} 
              disabled={isLoading}
              className="bg-student hover:bg-student/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
              <p className="text-destructive font-medium whitespace-pre-line">{error}</p>
            </div>
          )}

          {hasSearched && !student && !isLoading && !error && (
            <p className="text-center text-muted-foreground py-4">
              No results found.
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
                <div>
                  <h3 className="font-semibold text-lg">{student.name}</h3>
                  <p className="text-muted-foreground text-sm">ID: {student.student_id}</p>
                </div>
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
                        Your Grades
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
                        <span>Cinematography</span>
                      </Button>
                      <Button
                        size="sm"
                        variant={studentCourseFilter === 'videoediting' ? 'default' : 'outline'}
                        onClick={() => setStudentCourseFilter('videoediting')}
                        className={studentCourseFilter === 'videoediting' ? 'bg-student hover:bg-student/90 flex items-center gap-2' : 'flex items-center gap-2'}
                      >
                        <Edit className="w-4 h-4" />
                        <span>Video Editing</span>
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {visibleGrades.map((grade) => (
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
                    ))}
                  </div>
                  <div className="mt-2 flex justify-end items-center gap-2">
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
                            { openInNewTab: false, showGradeLetter: !!student.show_final_grade_letter, courseTitle: studentCourseFilter === 'cinematography' ? 'Cinematography' : (studentCourseFilter === 'videoediting' ? 'Video Editing' : 'All'), logoPath: '/Bilal%20Videography%20Logo%20only%20white.png' }
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={handleSignOut}
                    >
                      {t('signOut')}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No grades available yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Teacher Comments Card */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-red-500" />
                  {t('recentTeacherComments')}
                </span>
                {comments.filter(c => c.sender_type === 'teacher' && !dismissedComments.includes(c.id)).length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse whitespace-nowrap flex items-center justify-center">
                    {comments.filter(c => c.sender_type === 'teacher' && !dismissedComments.includes(c.id)).length} {t('newLabel')}
                  </span>
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
                      <p className="text-sm">{comment.message}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive -mt-1 -mr-1"
                      onClick={() => handleDismissComment(comment.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              {comments.filter(c => c.sender_type === 'teacher' && !dismissedComments.includes(c.id)).length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">{t('noRecentComments')}</p>
              )}
            </CardContent>
          </Card>

          {/* Chat with Teacher Card */}
          <Card>
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
                      className={`p-3 rounded-lg ${
                        comment.sender_type === 'student' ? 'bg-student/10 ml-8' : 'bg-muted mr-8'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {comment.sender_type === 'student' ? t('youLabel') : t('teacherLabel')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.message}</p>
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
    </div>
  );
};
