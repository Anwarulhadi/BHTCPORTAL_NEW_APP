import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, User, MessageCircle, Send, Download, LogOut, X } from 'lucide-react';
import { calculateGradeLetter, calculateAverageGrade } from '@/lib/gradeUtils';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { exportGradeReport } from '@/lib/pdfExport';
import { showNotification, playNotificationSound } from '@/lib/notifications';
import { registerPushNotifications } from '@/integrations/push';
import { parseStudentNameMetadata } from '@/lib/studentMetadata';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  }, [studentId]);

  const getGradeColor = (avgGrade: number): string => {
    const letter = calculateGradeLetter(avgGrade);
    if (letter === 'A+' || letter === 'A') return 'bg-green-600 text-white';
    if (letter === 'B') return 'bg-green-400 text-gray-900';
    if (letter === 'C') return 'bg-yellow-400 text-gray-900';
    if (letter === 'D') return 'bg-red-300 text-gray-900';
    return 'bg-red-600 text-white';
  };

  const fetchStudentData = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Fetch student
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (studentError || !studentData) {
        setError('Student record not found');
        setIsLoading(false);
        return;
      }

      const metadata = parseStudentNameMetadata(studentData.name);
      studentData.name = metadata.realName;
      (studentData as Student).show_final_grade_letter = typeof (studentData as any).show_final_grade_letter === 'boolean'
        ? (studentData as any).show_final_grade_letter
        : !!metadata.showGradeLetter;

      // Check if student is locked
      if (studentData.locked) {
        setError(`ውድ ተማሪያችን ${studentData.name} የትምህርት ቤት ክፍያዎን ስላልከፈሉ ውጤትዎን በትክክል ማየት አይችሉም። ክፍያዎን በአግባቡ በመፈጸም ድጋሜ ወደዚህ ገፅ መመለስ ይችላሉ!\nት/ቤቱ`);
        setStudent(null);
        setGrades([]);
        setIsLoading(false);
        return;
      }

      setStudent(studentData);

      // Fetch grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', studentId)
        .order('subject');

      if (gradesError) throw gradesError;
      
      // Parse subject to extract outOf if present (format: "Subject|||OutOf")
      const parsedGrades = (gradesData || []).map((g: any) => {
        const parts = g.subject.split('|||');
        if (parts.length > 1) {
          // If packed as course|||subject|||outOf we might have extra parts; take last two as subject/outOf
          if (parts.length >= 3) {
            return { ...g, subject: parts[1], total: parts[2] };
          }
          return { ...g, subject: parts[0], total: parts[1] };
        }
        return g;
      });

      // Treat explicit 'None' subject as no grade; filter these out from student-facing list
      const filtered = parsedGrades.filter((pg: any) => {
        const s = (pg.subject || '').toString().trim().toLowerCase();
        if (!s) return false;
        if (s === 'none') return false;
        return true;
      });

      setGrades(filtered);

      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;
      setComments((commentsData as Comment[]) || []);

      // Set up real-time subscriptions
      const gradesChannel = supabase
        .channel(`grades:${studentId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'grades',
            filter: `student_id=eq.${studentId}`,
          },
          () => {
            supabase
              .from('grades')
              .select('*')
              .eq('student_id', studentId)
              .order('subject')
              .then(({ data }) => {
                if (data) {
                  const parsed = data.map((g: any) => {
                    const parts = g.subject.split('|||');
                    if (parts.length > 1) {
                      return { ...g, subject: parts[0], total: parts[1] };
                    }
                    return g;
                  });
                  setGrades(parsed);
                }
              });
          }
        )
        .subscribe();

      const commentsChannel = supabase
        .channel(`comments:${studentId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comments',
            filter: `student_id=eq.${studentId}`,
          },
          (payload) => {
            supabase
              .from('comments')
              .select('*')
              .eq('student_id', studentId)
              .order('created_at', { ascending: true })
              .then(({ data }) => {
                if (data) {
                  setComments(data as Comment[]);
                  if (payload.eventType === 'INSERT' && payload.new.sender_type === 'teacher') {
                    setUnreadCount(prev => prev + 1);
                    showNotification('New Message from Teacher', 'You have a new message');
                    playNotificationSound();
                    setLastMessage(payload.new as Comment);
                    setShowNewMessagePopup(true);
                  }
                }
              });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(gradesChannel);
        supabase.removeChannel(commentsChannel);
      };
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
      const { error } = await supabase
        .from('comments')
        .insert({
          student_id: student.student_id,
          message: newComment.trim(),
          sender_type: 'student',
        });

      if (error) throw error;
      setNewComment('');
      toast.success('Comment sent!');
    } catch (error) {
      console.error('Error sending comment:', error);
      toast.error('Failed to send comment');
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
          Sign Out
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
            <div className="flex items-center justify-center p-6 bg-blue-600 rounded-lg">
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
                <p className="text-muted-foreground text-sm">Student ID: {student.student_id}</p>
              </div>
            </div>

            {grades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No grades have been submitted yet.
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
                          <p className="text-sm opacity-90">Total Subjects</p>
                          <p className="text-2xl font-bold">{grades.length}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-sm opacity-90">Total Grade</p>
                            <p className="text-2xl font-bold">{total}%</p>
                          </div>
                          <div className={`inline-flex items-center justify-center h-9 px-3 rounded-md font-bold text-sm ${getGradeColor(total)}`}>
                            <span className="text-white">
                              {total}%
                              {student?.show_final_grade_letter ? ` ${calculateGradeLetter(total)}` : ''}
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
                      See all results
                      <span className="text-muted-foreground">{showResults ? '▾' : '▸'}</span>
                    </button>
                    <div>
                      <Button
                        onClick={handleDownloadPDF}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Export
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
              <h3 className="font-bold text-lg">Recent Teacher Comments</h3>
            </div>
            {comments.filter(c => c.sender_type === 'teacher' && !dismissedComments.includes(c.id)).length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse whitespace-nowrap flex items-center justify-center">
                {comments.filter(c => c.sender_type === 'teacher' && !dismissedComments.includes(c.id)).length} new
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
              <p className="text-center text-muted-foreground text-sm py-4">No recent comments</p>
            )}
          </div>
        </Card>
      )}

      {/* Chat with Teacher Section */}
      {student && (
        <Card className="p-4 sm:p-6 shadow-lg" id="comments-section">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-student" />
            <h3 className="font-bold text-lg">Chat with Teacher</h3>
          </div>

          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No comments yet</p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-3 rounded-lg ${
                    comment.sender_type === 'student'
                      ? 'bg-student/10 ml-8'
                      : 'bg-muted mr-8'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {comment.sender_type === 'student' ? 'You' : 'Teacher'}
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
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ask a question or report a correction..."
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

      <Dialog open={showNewMessagePopup} onOpenChange={setShowNewMessagePopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-student">
              <MessageCircle className="w-5 h-5" />
              New Message
            </DialogTitle>
            <DialogDescription>
              You have received a new message from your teacher.
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
              View & Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
