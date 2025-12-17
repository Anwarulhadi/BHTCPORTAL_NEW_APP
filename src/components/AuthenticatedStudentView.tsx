import { useState, useEffect } from 'react';
import apiClient from '@/integrations/apiClient';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, User, MessageCircle, Send, Download, LogOut, X, Lock, Construction, Settings } from 'lucide-react';
import { calculateGradeLetter, calculateAverageGrade } from '@/lib/gradeUtils';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { exportGradeReport } from '@/lib/pdfExport';
import { showNotification, playNotificationSound } from '@/lib/notifications';
import { registerPushNotifications } from '@/integrations/push';
import { parseStudentNameMetadata } from '@/lib/studentMetadata';
import { ContactSection } from '@/components/ContactSection';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, Trash2, MoreVertical, Reply } from 'lucide-react';
// Removed accordion for simple inline list

interface Grade {
  id: string;
  subject: string;
  grade: number;
  updated_at: string;
  total?: string | number;
}

interface Student {
  student_id: string;
  name: string;
  photo_url?: string;
  locked?: boolean;
  show_final_grade_letter?: boolean;
  course?: string;
}

interface Comment {
  id: string;
  student_id: string;
  message: string;
  sender_type: 'student' | 'teacher';
  created_at: string;
}

interface AuthenticatedStudentViewProps {
  studentId: string;
  onSignOut: () => void;
}

export const AuthenticatedStudentView = ({ studentId, onSignOut }: AuthenticatedStudentViewProps) => {
  const { t } = useLanguage();
  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNewMessagePopup, setShowNewMessagePopup] = useState(false);
  const [lastMessage, setLastMessage] = useState<Comment | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [imageViewerSrc, setImageViewerSrc] = useState<string>('');
  const [dismissedComments, setDismissedComments] = useState<string[]>(() => {
    const saved = localStorage.getItem('dismissedStudentComments');
    return saved ? JSON.parse(saved) : [];
  });
  const [globalSettings, setGlobalSettings] = useState<{ show_grade_letters: boolean; is_portal_enabled?: boolean }>({ show_grade_letters: true, is_portal_enabled: true });
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editMessageText, setEditMessageText] = useState('');

  const handleDismissComment = (commentId: string) => {
    const newDismissed = [...dismissedComments, commentId];
    setDismissedComments(newDismissed);
    localStorage.setItem('dismissedStudentComments', JSON.stringify(newDismissed));
    toast.success('Message removed');
  };

  useEffect(() => {
    // Refresh native registration without re-prompting (prompt handled globally)
    registerPushNotifications(undefined, { promptUser: false });
    fetchStudentData();
    
    const fetchSettings = async () => {
      try {
        const data = await apiClient.getSchoolSettings();
        if (data) {
          setGlobalSettings({
            show_grade_letters: data.show_grade_letters ?? true,
            is_portal_enabled: data.is_portal_enabled ?? true
          });
        }
      } catch (e) {
        console.error("Failed to fetch settings", e);
      }
    };
    fetchSettings();

    // Realtime subscription for portal status
    const channel = supabase
      .channel('schema-db-changes-auth-view')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'school_settings',
        },
        (payload) => {
          if (payload.new && typeof payload.new.is_portal_enabled === 'boolean') {
            setGlobalSettings(prev => ({ ...prev, is_portal_enabled: payload.new.is_portal_enabled }));
          }
        }
      )
      .subscribe();

    // Polling fallback (every 5 seconds)
    const interval = setInterval(fetchSettings, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [studentId]);

  const getGradeColor = (avgGrade: number): string => {
    const letter = calculateGradeLetter(avgGrade);
    if (['A+', 'A', 'A-'].includes(letter)) return 'bg-green-600 text-white';
    if (['B+', 'B', 'B-'].includes(letter)) return 'bg-green-400 text-gray-900';
    if (['C+', 'C'].includes(letter)) return 'bg-yellow-400 text-gray-900';
    return 'bg-red-600 text-white';
  };

  const fetchStudentData = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Fetch student
      const studentData = await apiClient.getStudent(studentId);
      if (!studentData) {
        setError('Student record not found');
        setIsLoading(false);
        return;
      }
      const metadata = parseStudentNameMetadata(studentData.name);
      studentData.name = metadata.realName;
      (studentData as Student).show_final_grade_letter = typeof (studentData as any).show_final_grade_letter === 'boolean'
        ? (studentData as any).show_final_grade_letter
        : !!metadata.showGradeLetter;
      (studentData as Student).course = (studentData as any).course;
      if (studentData.locked) {
        setError(`ውድ ተማሪያችን ${studentData.name} የትምህርት ቤት ክፍያዎን ስላልከፈሉ ውጤትዎን በትክክል ማየት አይችሉም። ክፍያዎን በአግባቡ በመፈጸም ድጋሜ ወደዚህ ገፅ መመለስ ይችላሉ!\nት/ቤቱ`);
        setStudent(null);
        setGrades([]);
        setIsLoading(false);
        return;
      }
      setStudent(studentData);
      // Fetch grades
      const gradesData = await apiClient.getGrades(studentId);
      // Parse subject to extract outOf if present (format: "Subject|||OutOf")
      const parsedGrades = (gradesData || []).map((g: any) => {
        const parts = g.subject.split('|||');
        if (parts.length > 1) {
          if (parts.length >= 3) {
            return { ...g, subject: parts[1], total: parts[2] };
          }
          return { ...g, subject: parts[0], total: parts[1] };
        }
        return g;
      });
      const filtered = parsedGrades.filter((pg: any) => {
        const s = (pg.subject || '').toString().trim().toLowerCase();
        if (!s) return false;
        if (s === 'none') return false;
        return true;
      });
      setGrades(filtered);
      // Fetch comments
      try {
        const commentsData = await apiClient.getComments(studentId);
        setComments(commentsData || []);
      } catch { setComments([]); }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to fetch data. Please try again.');
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
      toast.success('Comment sent!');
      // Refresh comments
      const commentsData = await apiClient.getComments(student.student_id);
      setComments(commentsData || []);
    } catch (error) {
      console.error('Error sending comment:', error);
      toast.error('Failed to send comment');
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

  const handleExportPDF = async () => {
    if (!student || grades.length === 0) return;
    const avgGrade = calculateAverageGrade(grades.map(g => g.grade));
    const res = await exportGradeReport(student, grades, avgGrade, {
      openInNewTab: true,
      showGradeLetter: !!student.show_final_grade_letter,
    });
    if (res?.opened) {
      toast.success('PDF opened in a new tab');
    } else if (res?.saved) {
      toast.success('PDF download started');
    } else {
      toast.error('Failed to open or download PDF');
    }
  };

  const handleDownloadPDF = async () => {
    if (!student || grades.length === 0) return;
    const avgGrade = calculateAverageGrade(grades.map(g => g.grade));
    const res = await exportGradeReport(student, grades, avgGrade, {
      openInNewTab: false,
      showGradeLetter: !!student.show_final_grade_letter,
    });
    if (res?.saved) {
      toast.success('PDF download started');
    } else {
      toast.error('Failed to start PDF download');
    }
  };

  const handleMessageNotificationClick = () => {
    setUnreadCount(0);
    document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const totalGrade = grades.reduce((s, g) => s + Number(g.grade || 0), 0);

  if (isLoading) {
    return (
      <Card className="p-6 shadow-lg">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-student" />
        </div>
      </Card>
    );
  }

  if (globalSettings.is_portal_enabled === false) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <Card className="p-6 shadow-lg border-l-4 border-l-orange-500 bg-white">
          <div className="flex flex-col items-center text-center gap-6 py-4">
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

            <Button onClick={onSignOut} variant="outline" className="mt-4 border-orange-200 text-orange-700 hover:bg-orange-100">
              <LogOut className="w-4 h-4 mr-2" />
              {t('signOut')}
            </Button>
          </div>
        </Card>
        
        <ContactSection />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 shadow-lg">
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive font-medium text-center">
          {error}
        </div>
        <Button
          onClick={onSignOut}
          variant="outline"
          className="w-full mt-4 gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="w-4 h-4" />
          {t('signOut')}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="icon"
            className="relative"
            onClick={handleMessageNotificationClick}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-0.5 text-xs rounded-full">
              {unreadCount}
            </span>
          </Button>
        </div>
      )}

      {imageViewerSrc && (
        <Dialog open={!!imageViewerSrc} onOpenChange={() => setImageViewerSrc('')}>
          <DialogContent className="max-w-sm">
            <div className="flex items-center justify-center p-6 bg-primary rounded-lg">
              <img src={imageViewerSrc} alt="Preview" className="w-48 h-48 rounded-full object-cover border-4 border-white" />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Student Info & Grades Section */}
      <Card className="p-4 sm:p-6 shadow-lg">
        {student && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {student.photo_url ? (
                <img
                  src={student.photo_url}
                    alt={student.name}
                    onClick={() => setImageViewerSrc(student.photo_url || '')}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-student shadow-lg cursor-pointer"
                />
              ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted flex items-center justify-center border-4 border-student shadow-lg relative">
                    <span className="absolute inset-0 rounded-full animate-ping bg-student/20"></span>
                    <User className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
                  </div>
              )}
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-student mb-1">{student.name}</h2>
                <p className="text-muted-foreground text-sm">{t('studentIdLabel')}: {student.student_id}</p>
              </div>
            </div>

            {grades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {student.course ? (
                  <p>{t('teacherNotSubmitted')} {t('pleaseContactThem')}</p>
                ) : (
                  <p>{t('teacherNotSubmitted')} {t('pleaseContactThem')}</p>
                )}
              </div>
            ) : (
              <>
                {(() => {
                  const total = grades.reduce((s, g) => s + Number(g.grade || 0), 0);
                  const avg = calculateAverageGrade(grades.map(g => Number(g.grade)));
                  return (
                    <div className={`border-2 border-student rounded-lg p-4 mb-4 ${getGradeColor(avg)}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm opacity-90">{t('totalSubjectsLabel')}</p>
                          <p className="text-2xl font-bold">{grades.length}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-sm opacity-90">{t('totalGradeLabel')}</p>
                            <p className="text-2xl font-bold">{total}%</p>
                          </div>
                          <div className={`inline-flex items-center justify-center h-9 px-3 rounded-md font-bold text-sm ${getGradeColor(total)}`}>
                            <span className="text-white">
                              {total}%
                              {student?.show_final_grade_letter && globalSettings.show_grade_letters ? ` ${calculateGradeLetter(total)}` : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Compact action row removed from top to keep modal compact on mobile.
                    Export button is moved into the expandable "See all results" area below. */}

                <div className="mt-2">
                  {/* Collapsible results header */}
                  <div className="flex items-center justify-between p-3 bg-card border rounded-lg">
                    <button
                      className="text-sm font-medium text-student flex items-center gap-2"
                      onClick={() => setShowResults(prev => !prev)}
                    >
                      {showResults ? t('hideAllResults') : t('showAllResults')}
                      <span className="text-muted-foreground">{showResults ? '▾' : '▸'}</span>
                    </button>
                    <div>
                      <Button
                        onClick={handleDownloadPDF}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        {t('export')}
                      </Button>
                    </div>
                  </div>

                  {showResults && (
                    <div className="space-y-2 mt-3">
                      {grades.map((grade) => (
                        <div
                          key={grade.id}
                          className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border hover:shadow-md transition-all"
                        >
                          <span className="font-medium text-base">{grade.subject}</span>
                          <span className="text-xl font-extrabold">
                            {grade.grade}{grade.total ? ` / ${grade.total}` : '%'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Recent Teacher Comments Section */}
      {student && (
        <Card className="p-4 sm:p-6 shadow-lg border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-red-500" />
              <h3 className="font-bold text-lg">{t('recentTeacherComments')}</h3>
            </div>
            {comments.filter(c => c.sender_type === 'teacher' && !dismissedComments.includes(c.id)).length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse whitespace-nowrap flex items-center justify-center">
                {comments.filter(c => c.sender_type === 'teacher' && !dismissedComments.includes(c.id)).length} {t('newLabel')}
              </span>
            )}
          </div>
          <div className="space-y-3">
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
                  <div className="flex flex-col items-end gap-1 -mt-1 -mr-1">
                    <Button
                      size="sm"
                      className="h-6 px-3 bg-green-500 hover:bg-green-600 text-white rounded-full text-xs font-medium"
                      onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      {t('reply')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDismissComment(comment.id)}
                      title={t('dismiss')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            {comments.filter(c => c.sender_type === 'teacher' && !dismissedComments.includes(c.id)).length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">{t('noRecentComments')}</p>
            )}
          </div>
        </Card>
      )}

      {/* Chat with Teacher Section */}
      {student && (
        <Card className="p-4 sm:p-6 shadow-lg" id="comments-section">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-student" />
            <h3 className="font-bold text-lg">{t('chatWithTeacher')}</h3>
          </div>

          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">{t('noMessagesYet')}</p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-3 rounded-lg group relative ${
                    comment.sender_type === 'student'
                      ? 'bg-student/10 ml-8'
                      : 'bg-muted mr-8'
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
                  <p className="text-sm whitespace-pre-wrap">{comment.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('messagePlaceholder')}
              className="flex-1 min-h-[60px]"
            />
            <Button
              onClick={handleSendComment}
              disabled={!newComment.trim()}
              className="bg-student hover:bg-student/90 h-auto"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
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

      <Dialog open={showNewMessagePopup} onOpenChange={setShowNewMessagePopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-student">
              <MessageCircle className="w-5 h-5" />
              {t('newMessageTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('newMessageDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm font-medium text-foreground">
              {lastMessage?.message}
            </p>
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {lastMessage && new Date(lastMessage.created_at).toLocaleString()}
            </p>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                setShowNewMessagePopup(false);
                handleMessageNotificationClick();
              }}
              className="bg-student hover:bg-student/90 w-full sm:w-auto"
            >
              {t('viewAndReply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
