import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Trash2, Plus, Edit, Upload, User, Eye, EyeOff, Search, X, MessageCircle, Send, Filter, Lock, Unlock, LogOut, Key, BookOpen, Camera, GraduationCap, MoreVertical, Pencil, ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { exportGradeReport } from '@/lib/pdfExport';
import { Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { calculateGradeLetter, calculateAverageGrade } from '@/lib/gradeUtils';
import { parseStudentNameMetadata, updateGradeLetterFlagInName } from '@/lib/studentMetadata';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TeacherManagement } from '@/components/TeacherManagement';
import { NewsManagement } from '@/components/NewsManagement';
import { VideoManagement } from '@/components/VideoManagement';
import { ModuleManagement } from '@/components/ModuleManagement';
import { SliderManagement } from '@/components/SliderManagement';
import { ContactManagement } from '@/components/ContactManagement';
import { PortalManagement } from '@/components/PortalManagement';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { NewsAdminPasswordDialog } from '@/components/NewsAdminPasswordDialog';
import { StudentAdminPasswordDialog } from '@/components/StudentAdminPasswordDialog';
import { playNotificationSound } from '@/lib/notifications';

interface Student {
  student_id: string;
  name: string;
  photo_url?: string;
  locked?: boolean;
  batch_number?: string;
  gender?: string;
  show_final_grade_letter?: boolean;
  course?: string;
  password?: string;
}

interface Grade {
  id: string;
  student_id: string;
  subject: string;
  grade: number;
  total?: string;
  course?: string;
}

interface SubjectGrade {
  subject: string;
  grade: string;
  outOf: string;
  isCustom?: boolean;
  course?: 'cinematography' | 'videoediting' | null;
}

const SUBJECT_DIVIDER = '__divider__';

const VIDEO_EDITING_SUBJECTS = [
  'None',
  'Basic / Premiere Pro Exam 1 ( Theory )',
  'Basic / Premiere Pro Exam 2 ( Practical )',
  'Basic / Premiere Pro Exam 3 ( Practical )',
  SUBJECT_DIVIDER,
  'Basic / Photoshop Exam 1 ( Theory )',
  'Basic / Photoshop Exam 2 ( Practical )',
  'Basic / Photoshop Exam 3 ( Practical )',
  'Continuous Assessment',
];

const CINEMATOGRAPHY_SUBJECTS = [
  'None',
  'Cinematography ( Theory 1 )',
  'Cinematography ( Theory 2 )',
  'Shot List',
  'Practical Exam',
  'Simple Shot',
  'Final Project',
  SUBJECT_DIVIDER,
  'Shooting Material',
  'Practical Exam',
  'Project',
  SUBJECT_DIVIDER,
  'Light Theory',
  'Dramatic scene',
  'Project',
  'Participation & Attendance',
  'Continuous Assessment',
];

const ALL_STANDARD_SUBJECTS = Array.from(
  new Set([
    ...VIDEO_EDITING_SUBJECTS,
    ...CINEMATOGRAPHY_SUBJECTS.filter((subject) => subject !== SUBJECT_DIVIDER),
  ])
);

const CUSTOM_SUBJECT_VALUE = '__custom__';

const isRegisteredSubject = (name: string) =>
  ALL_STANDARD_SUBJECTS.some((subject) => subject.toLowerCase() === name.toLowerCase());

const isMissingGradeLetterColumnError = (error: PostgrestError | null) => {
  if (!error) return false;
  if (error.code === '42703') return true;
  const message = error.message?.toLowerCase() ?? '';
  return message.includes('show_final_grade_letter');
};

import { useBackButton } from '@/contexts/BackButtonContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocation } from 'react-router-dom';

interface Comment {
  id: string;
  student_id: string;
  message: string;
  sender_type: 'student' | 'teacher';
  created_at: string;
  is_read?: boolean;
}

export const AdminView = () => {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminRole, setAdminRole] = useState<'super_admin' | 'news_admin' | 'student_admin' | null>(null);
  const [adminPage, setAdminPage] = useState<'students' | 'management'>('students');
  const [students, setStudents] = useState<(Student & { grades?: Grade[]; comments?: Comment[] })[]>([]);
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    batchNumber: '',
    gender: '',
    password: '',
  });
  const [subjectGrades, setSubjectGrades] = useState<SubjectGrade[]>([{
    subject: '',
    grade: '',
    outOf: '',
    isCustom: false,
    course: 'cinematography',
  }]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [imageViewerSrc, setImageViewerSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [imgSrc, setImgSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingGradeId, setEditingGradeId] = useState<string>('');
  const [viewingStudent, setViewingStudent] = useState<(Student & { grades?: Grade[]; comments?: Comment[] }) | null>(null);
  const [showGradesList, setShowGradesList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newReply, setNewReply] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [editingAllGrades, setEditingAllGrades] = useState(false);
  const [originalStudentId, setOriginalStudentId] = useState<string>('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showNewsAdminPassword, setShowNewsAdminPassword] = useState(false);
  const [showStudentAdminPassword, setShowStudentAdminPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState('SuperAdmin#2018');
  const [newsAdminPassword, setNewsAdminPassword] = useState('NewsAdmin@2018');
  const [studentAdminPassword, setStudentAdminPassword] = useState('StudetAdmin@2019');
  const [unreadStudentComments, setUnreadStudentComments] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [editingComment, setEditingComment] = useState<any | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  // Course selection for add-grade form and students list filtering
  const [formCourse, setFormCourse] = useState<'all' | 'cinematography' | 'videoediting'>('cinematography');
  const [studentsCourseFilter, setStudentsCourseFilter] = useState<'all' | 'cinematography' | 'videoediting'>('cinematography');
  const [lockedCourse, setLockedCourse] = useState<'cinematography' | 'videoediting' | null>(null);

  const location = useLocation();

  useEffect(() => {
    // If AdminView is mounted via a dedicated admin route, initialize form and students filter
    if (location && location.pathname) {
      if (location.pathname.toLowerCase().includes('/admin/cinematography')) {
        setFormCourse('cinematography');
        setStudentsCourseFilter('cinematography');
      } else if (location.pathname.toLowerCase().includes('/admin/video-editing') || location.pathname.toLowerCase().includes('/admin/videoediting')) {
        setFormCourse('videoediting');
        setStudentsCourseFilter('videoediting');
      }
    }
  }, [location.pathname]);

  const normalizeCourse = (course?: string | null): 'cinematography' | 'videoediting' | null => {
    if (course === 'cinematography' || course === 'videoediting') return course;
    return null;
  };

  const getDefaultCourse = (): 'cinematography' | 'videoediting' =>
    lockedCourse ?? (formCourse === 'all' ? 'cinematography' : formCourse);

  const deriveCourseFromGrades = (grades?: (Grade & { course?: string | null })[] | null) => {
    if (!grades || grades.length === 0) return null;
    let cinema = 0;
    let video = 0;
    grades.forEach((grade) => {
      const normalized = normalizeCourse(grade.course);
      if (normalized === 'cinematography') cinema += 1;
      if (normalized === 'videoediting') video += 1;
    });
    if (!cinema && !video) return null;
    if (cinema === video) return formCourse === 'videoediting' ? 'videoediting' : 'cinematography';
    return cinema > video ? 'cinematography' : 'videoediting';
  };

  const gradeMatchesCourse = (
    grade: Grade & { course?: string | null },
    course: 'cinematography' | 'videoediting'
  ) => {
    const normalized = normalizeCourse(grade.course);
    if (course === 'cinematography') {
      return !normalized || normalized === 'cinematography';
    }
    return normalized === 'videoediting';
  };
  // Local state to track dismissed comments without database updates
  const [dismissedComments, setDismissedComments] = useState<string[]>(() => {
    const saved = localStorage.getItem('dismissedComments');
    return saved ? JSON.parse(saved) : [];
  });

  // Lockout state
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [globalSettings, setGlobalSettings] = useState<{ show_grade_letters: boolean; show_admin_avg_grades: boolean }>({ show_grade_letters: true, show_admin_avg_grades: true });
  const [avgGradeSort, setAvgGradeSort] = useState<'asc' | 'desc' | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await apiClient.getSchoolSettings();
        if (data) {
          setGlobalSettings({
            show_grade_letters: data.show_grade_letters ?? true,
            show_admin_avg_grades: data.show_admin_avg_grades ?? true
          });
        }
      } catch (e) {
        console.error("Failed to fetch settings", e);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const storedLockout = localStorage.getItem('adminLockoutEndTime');
    const storedAttempts = localStorage.getItem('adminFailedAttempts');
    
    if (storedLockout) {
      const end = parseInt(storedLockout);
      if (end > Date.now()) {
        setLockoutEndTime(end);
      } else {
        localStorage.removeItem('adminLockoutEndTime');
      }
    }
    
    if (storedAttempts) {
      setFailedAttempts(parseInt(storedAttempts));
    }
  }, []);

  useEffect(() => {
    if (lockoutEndTime && lockoutEndTime > Date.now()) {
      const interval = setInterval(() => {
        const remaining = Math.ceil((lockoutEndTime - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockoutEndTime(null);
          localStorage.removeItem('adminLockoutEndTime');
          // Return to welcome page (reload to reset state or navigate)
          window.location.href = '/';
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutEndTime]);

  useBackButton(() => {
    if (imgSrc) {
      setImgSrc('');
      return true;
    }
    if (viewingStudent) {
      setViewingStudent(null);
      setShowGradesList(false);
      return true;
    }
    if (showChangePassword) {
      setShowChangePassword(false);
      return true;
    }
    if (showNewsAdminPassword) {
      setShowNewsAdminPassword(false);
      return true;
    }
    if (showStudentAdminPassword) {
      setShowStudentAdminPassword(false);
      return true;
    }
    return false;
  });

  useEffect(() => {
    // Fetch admin password from database
    const fetchAdminPassword = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('admin_password, news_admin_password, student_admin_password')
          .single();
        
        if (error) {
          // If student_admin_password column is missing (PostgREST 42703), fallback to legacy columns
          if (error.code === '42703') {
            console.warn('Student admin column missing, fetching legacy columns');
            const { data: legacyData } = await supabase
              .from('admin_settings')
              .select('admin_password, news_admin_password')
              .single();
            
            if (legacyData) {
              setAdminPassword(legacyData.admin_password);
              if (legacyData.news_admin_password) setNewsAdminPassword(legacyData.news_admin_password);
            }
            return;
          }
          throw error;
        }
        
        if (data) {
          setAdminPassword(data.admin_password);
          if (data.news_admin_password) {
            setNewsAdminPassword(data.news_admin_password);
          }
          if (data.student_admin_password) {
            setStudentAdminPassword(data.student_admin_password);
          }
        }
      } catch (err) {
        console.error('Error fetching admin settings:', err);
      }
    };
    fetchAdminPassword();

    // Check if already authenticated from session storage
    const isAuth = sessionStorage.getItem('adminAuthenticated') === 'true';
    const storedRole = sessionStorage.getItem('adminRole') as 'super_admin' | 'news_admin' | 'student_admin' | null;
    if (isAuth) {
      setIsAuthenticated(true);
      setAdminRole(storedRole || 'super_admin'); // Default to super_admin for backward compatibility
      if (storedRole === 'news_admin') {
        setAdminPage('management');
      } else if (storedRole === 'student_admin') {
        setAdminPage('students');
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStudents();

      const studentsChannel = supabase
        .channel('students-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'students',
          },
          () => {
            fetchStudents();
          }
        )
        .subscribe();

      const gradesChannel = supabase
        .channel('grades-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'grades',
          },
          () => {
            fetchStudents();
          }
        )
        .subscribe();

      const commentsChannel = supabase
        .channel('comments-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'comments',
          },
          (payload: any) => {
            fetchStudents();
            // Play notification sound when new student comment arrives
            if (payload.new && payload.new.sender_type === 'student') {
              playNotificationSound();
              toast.info(`New message from student`, {
                description: 'Check the student comments section',
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(studentsChannel);
        supabase.removeChannel(gradesChannel);
        supabase.removeChannel(commentsChannel);
      };
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fetch latest password from database
    const { data } = await supabase
      .from('admin_settings')
      .select('admin_password, news_admin_password, student_admin_password')
      .single();
    
    const currentAdminPassword = data?.admin_password || 'SuperAdmin#2018';
    const currentNewsAdminPassword = data?.news_admin_password || 'NewsAdmin@2018';
    const currentStudentAdminPassword = data?.student_admin_password || 'StudetAdmin@2019';
    
    if (password === currentAdminPassword) {
      setIsAuthenticated(true);
      setAdminRole('super_admin');
      sessionStorage.setItem('adminAuthenticated', 'true');
      sessionStorage.setItem('adminRole', 'super_admin');
      // Reset failed attempts on success
      setFailedAttempts(0);
      localStorage.removeItem('adminFailedAttempts');
      toast.success('Login successful!');
      setPassword('');
    } else if (password === currentNewsAdminPassword) {
      setIsAuthenticated(true);
      setAdminRole('news_admin');
      setAdminPage('management');
      sessionStorage.setItem('adminAuthenticated', 'true');
      sessionStorage.setItem('adminRole', 'news_admin');
      // Reset failed attempts on success
      setFailedAttempts(0);
      localStorage.removeItem('adminFailedAttempts');
      toast.success('Login successful as News Admin!');
      setPassword('');
    } else if (password === currentStudentAdminPassword) {
      setIsAuthenticated(true);
      setAdminRole('student_admin');
      setAdminPage('students');
      sessionStorage.setItem('adminAuthenticated', 'true');
      sessionStorage.setItem('adminRole', 'student_admin');
      // Reset failed attempts on success
      setFailedAttempts(0);
      localStorage.removeItem('adminFailedAttempts');
      toast.success('Login successful as Student Admin!');
      setPassword('');
    } else {
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]);
      }
      
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('adminFailedAttempts', newAttempts.toString());
      
      let lockDuration = 0;
      // Allow 1 free attempt (attempt 1)
      // Lock starts from attempt 2
      if (newAttempts === 2) lockDuration = 30 * 1000; // 30s
      else if (newAttempts === 3) lockDuration = 60 * 1000; // 1m
      else if (newAttempts === 4) lockDuration = 90 * 1000; // 1m 30s
      else if (newAttempts > 4) lockDuration = 30 * 1000; // 30s fallback/cycle
      
      if (lockDuration > 0) {
        const endTime = Date.now() + lockDuration;
        setLockoutEndTime(endTime);
        localStorage.setItem('adminLockoutEndTime', endTime.toString());
        toast.error(`Incorrect password. Locked for ${lockDuration/1000}s`);
      } else {
        toast.error(`Incorrect password. ${2 - newAttempts} attempts remaining.`);
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminRole(null);
    sessionStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminRole');
    toast.success('Logged out successfully');
  };

  const handleLockToggle = async (studentId: string, currentLocked: boolean) => {
    const { error } = await supabase
      .from('students')
      .update({ locked: !currentLocked })
      .eq('student_id', studentId);

    if (!error) {
      fetchStudents();
      toast.success(currentLocked ? 'Student unlocked' : 'Student locked');
    } else {
      toast.error('Failed to update lock status');
    }
  };

  const handleGradeLetterToggle = async (studentId: string, newValue: boolean) => {
    const updateResult = await supabase
      .from('students')
      .update({ show_final_grade_letter: newValue })
      .eq('student_id', studentId);

    if (!updateResult.error) {
      toast.success(newValue ? 'Grade letter shown to student' : 'Grade letter hidden from student');
      fetchStudents();
      return;
    }

    if (!isMissingGradeLetterColumnError(updateResult.error)) {
      console.error('Grade letter toggle error', updateResult.error);
      toast.error('Failed to update grade letter visibility');
      return;
    }

    // Legacy fallback: encode visibility in the name metadata if the column is missing
    const { data: existingStudent, error: fetchError } = await supabase
      .from('students')
      .select('name')
      .eq('student_id', studentId)
      .single();

    if (fetchError || !existingStudent) {
      console.error('Unable to fetch student name for fallback', fetchError);
      toast.error('Failed to update grade letter visibility');
      return;
    }

    const updatedName = updateGradeLetterFlagInName(existingStudent.name, newValue);
    const fallbackResult = await supabase
      .from('students')
      .update({ name: updatedName })
      .eq('student_id', studentId);

    if (fallbackResult.error) {
      console.error('Legacy grade letter update failed', fallbackResult.error);
      toast.error('Failed to update grade letter visibility');
      return;
    }

    toast.success(newValue ? 'Grade letter shown to student' : 'Grade letter hidden from student');
    fetchStudents();
  };

  const handleBulkGradeLetterToggle = async (enable: boolean) => {
    try {
      // Optimistic update
      const updatedStudents = students.map(s => ({
        ...s,
        show_final_grade_letter: enable
      }));
      setStudents(updatedStudents);

      const { error } = await supabase
        .from('students')
        .update({ show_final_grade_letter: enable })
        .neq('student_id', '_______'); // Update all rows

      if (error) {
        if (isMissingGradeLetterColumnError(error)) {
          toast.error("Bulk update requires database column migration");
          fetchStudents(); // Revert
          return;
        }
        throw error;
      }

      toast.success(enable ? t('gradeLetterOnAll') : t('gradeLetterOffAll'));
      fetchStudents();
    } catch (error) {
      console.error('Bulk toggle error:', error);
      toast.error('Failed to update all students');
      fetchStudents(); // Revert
    }
  };

  const handleExportViewingStudentPDF = async () => {
    if (!viewingStudent) return;
    const visible = (studentsCourseFilter === 'all')
      ? (viewingStudent.grades || [])
      : (viewingStudent.grades || []).filter((g: any) => (g.course || '').toLowerCase() === studentsCourseFilter.toLowerCase());
    if (!visible || visible.length === 0) {
      toast.error('No grades to export for this student (in current course view)');
      return;
    }
    const avg = calculateAverageGrade(visible.map((g: any) => Number(g.grade)));
    try {
      const res = await exportGradeReport({ name: viewingStudent.name, student_id: viewingStudent.student_id, batch_number: (viewingStudent as any).batch_number }, visible.map((g: any) => ({ subject: g.subject, grade: g.grade, total: g.total })), avg, {
        openInNewTab: false,
        showGradeLetter: !!viewingStudent.show_final_grade_letter,
        courseTitle: studentsCourseFilter === 'cinematography' ? 'Cinematography' : (studentsCourseFilter === 'videoediting' ? 'Vision & Sound Editing' : 'All'),
        logoPath: '/Bilal%20Videography%20Logo%20only%20white.png'
      });
      if (res?.saved) toast.success('PDF download started');
      else toast.info('PDF opened');
    } catch (err) {
      console.error('Export error', err);
      toast.error('Failed to export PDF');
    }
  };


  const fetchStudents = async () => {
    const { data: studentsData } = await supabase
      .from('students')
      .select('*')
      .order('student_id');

    if (studentsData) {
      const studentsWithGradesAndComments = await Promise.all(
        studentsData.map(async (student) => {
          const { data: grades } = await supabase
            .from('grades')
            .select('id, student_id, subject, grade') // Explicitly select columns, excluding 'total'
            .eq('student_id', student.student_id);

          const metadata = parseStudentNameMetadata(student.name);
          const realName = metadata.realName;
          const batchNumber = metadata.batch;
          const genderValue = metadata.gender;
          const showGradeLetterFlag = typeof student.show_final_grade_letter === 'boolean'
            ? student.show_final_grade_letter
            : !!metadata.showGradeLetter;

          // Prefer explicit DB column `course` when present; fall back to metadata
          const courseFromDb = (student as any).course || metadata.course || undefined;

          // Parse subject to extract course and outOf if present.
          // New encoded formats supported:
          // 1) "course|||subject|||outOf"  -> parts[0]=course, parts[1]=subject, parts[2]=outOf
          // 2) "subject|||outOf"            -> parts[0]=subject, parts[1]=outOf
          const parsedGrades = (grades || []).map((g: any) => {
            const parts = g.subject.split('|||');
            if (parts.length >= 3 && (parts[0] === 'cinematography' || parts[0] === 'videoediting')) {
              return {
                ...g,
                course: parts[0],
                subject: parts[1],
                total: parts[2]
              };
            }
            if (parts.length === 2 && (parts[0] === 'cinematography' || parts[0] === 'videoediting')) {
              return {
                ...g,
                course: parts[0],
                subject: parts[1],
                total: undefined
              };
            }
            if (parts.length > 1) {
              return {
                ...g,
                subject: parts[0],
                total: parts[1],
                course: (g as any).course || courseFromDb
              };
            }
            return { ...g, course: (g as any).course || courseFromDb };
          });

          const { data: comments } = await supabase
            .from('comments')
            .select('*')
            .eq('student_id', student.student_id)
            .order('created_at', { ascending: true });
          
          return { 
            ...student, 
            name: realName, 
            batch_number: batchNumber,
            gender: genderValue || (student as any).gender || undefined,
            show_final_grade_letter: showGradeLetterFlag,
            course: courseFromDb,
            grades: parsedGrades, 
            comments: (comments as Comment[]) || [] 
          };
        })
      );
      setStudents(studentsWithGradesAndComments);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImgSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = async (): Promise<Blob | null> => {
    if (!completedCrop || !imgRef.current) return null;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleCropComplete = async () => {
    const croppedBlob = await getCroppedImg();
    if (croppedBlob) {
      const file = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' });
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(croppedBlob));
      setImgSrc('');
      toast.success('Image cropped successfully');
    }
  };

  const uploadPhoto = async (studentId: string): Promise<string | null> => {
    if (!photoFile) return null;

    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${studentId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('student-photos')
      .upload(filePath, photoFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Failed to upload photo');
      return null;
    }

    const { data } = supabase.storage.from('student-photos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { studentId, name, batchNumber, gender } = formData;
    const sanitizedId = studentId.trim().toUpperCase();
    const editingStudent = students.find(s => s.student_id === sanitizedId);

    if (!sanitizedId || !name.trim()) {
      toast.error('Please enter student ID and name');
      return;
    }

    if (!gender) {
      toast.error(t('genderRequiredMessage'));
      return;
    }

    // Collect subjects that actually have grades entered. It's valid to save
    // a student record with no numeric grades (e.g. subject 'None') — in that
    // case we simply upsert the student and skip inserting grade rows.
    const subjectsWithGrades = subjectGrades.filter(sg => sg.subject.trim() && sg.grade.trim());
    for (const sg of subjectsWithGrades) {
      const gradeValue = parseFloat(sg.grade);
      if (isNaN(gradeValue) || gradeValue < 0) {
        toast.error('Grades must be valid positive numbers');
        return;
      }
      // outOf can be empty or any text
    }

    setIsSaving(true);

    try {
      const resolveCourseForSubject = (sg: SubjectGrade): 'cinematography' | 'videoediting' =>
        normalizeCourse(sg.course) || getDefaultCourse();
      let photoUrl = null;
      if (photoFile) {
        photoUrl = await uploadPhoto(sanitizedId);
      }

      // Upsert student with photo
        // Pack batch number, gender and course into encoded name segments to avoid schema change
        const metadata: string[] = [];
        if (batchNumber.trim()) {
          metadata.push(`batch=${batchNumber.trim()}`);
        }
        metadata.push(`gender=${gender}`);
        // Persist the selected course so students saved without numeric grades
        // can still be associated with the intended course in admin lists.
        const courseToStore = getDefaultCourse();
        if (courseToStore) metadata.push(`course=${courseToStore}`);
        const fullName = [name.trim(), ...metadata].join('|||');
      
      const studentData: any = { 
        student_id: sanitizedId, 
        name: fullName,
        password: formData.password || (editingStudent?.password) || null,
      };
      // Persist explicit course column as well for robust filtering
      if (courseToStore) studentData.course = courseToStore;
      if (photoUrl) {
        studentData.photo_url = photoUrl;
      }

      // Attempt to upsert student. If the DB doesn't have the `course` column
      // yet (schema not migrated), PostgREST will return a 42703 error. In
      // that case, retry the upsert without the `course` property and keep
      // using the encoded name metadata as a fallback.
      try {
        const { error: studentError } = await supabase
          .from('students')
          .upsert(studentData, { onConflict: 'student_id' });
        if (studentError) throw studentError;
      } catch (err: any) {
        const msg = (err?.message || '').toLowerCase();
        // Check for missing columns (PostgREST error 42703)
        const isMissingCourseCol = err?.code === '42703' && (msg.includes("column \"course\"") || msg.includes('course'));
        const isMissingPasswordCol = err?.code === '42703' && (msg.includes("column \"password\"") || msg.includes('password'));

        if (isMissingCourseCol && 'course' in studentData) {
          delete studentData.course;
          // If we removed course, try again. Note: If password is ALSO missing, this retry will fail,
          // and the user will have to click save again (which will hit the password check below).
          // Ideally we'd loop, but this covers the most common cases.
          const { error: retryErr } = await supabase
            .from('students')
            .upsert(studentData, { onConflict: 'student_id' });
          
          // If the retry failed because of password, handle that too
          if (retryErr) {
             const retryMsg = (retryErr.message || '').toLowerCase();
             const isMissingPasswordColRetry = retryErr.code === '42703' && (retryMsg.includes("column \"password\"") || retryMsg.includes('password'));
             if (isMissingPasswordColRetry && 'password' in studentData) {
                delete studentData.password;
                const { error: finalErr } = await supabase
                  .from('students')
                  .upsert(studentData, { onConflict: 'student_id' });
                if (finalErr) throw finalErr;
                toast.info('Saved without course/password columns. Please run migrations.');
             } else {
                throw retryErr;
             }
          } else {
             toast.info('Saved without course DB column; using metadata fallback for course.');
          }
        } else if (isMissingPasswordCol && 'password' in studentData) {
          delete studentData.password;
          const { error: retryErr } = await supabase
            .from('students')
            .upsert(studentData, { onConflict: 'student_id' });
          if (retryErr) throw retryErr;
          toast.info('Saved without password DB column. Please run migration.');
        } else {
          throw err;
        }
      }

      // Insert/Update all subject grades
      if (editingAllGrades) {
        // When editing all grades for a course, replace only the grades that belong
        // to the selected course. Previously we deleted all grades for the student,
        // which removed other course grades as well. We'll now delete only rows
        // matching the course context and insert the new course grades.
        const targetId = originalStudentId || sanitizedId;

        // Determine the course context we're editing. Prefer explicit formCourse state.
        const courseContext = (formCourse === 'all' ? 'cinematography' : formCourse) as 'cinematography' | 'videoediting';

        // Fetch existing grade rows for the student so we can detect which rows belong to this course
        const { data: existingRows, error: fetchRowsErr } = await supabase
          .from('grades')
          .select('id, subject')
          .eq('student_id', targetId);

        if (fetchRowsErr) throw fetchRowsErr;

        // Helper: detect course from packed subject string
        const detectCourseFromPacked = (packed: string | null | undefined): 'cinematography' | 'videoediting' => {
          if (!packed) return 'cinematography';
          const parts = packed.split('|||');
          if (parts.length >= 2 && (parts[0] === 'cinematography' || parts[0] === 'videoediting')) return parts[0] as any;
          // If there's no explicit course prefix we treat it as 'cinematography' (legacy default)
          return 'cinematography';
        };

        const idsToDelete: string[] = [];
        (existingRows || []).forEach((r: any) => {
          const rowCourse = detectCourseFromPacked(r.subject);
          if (rowCourse === courseContext) idsToDelete.push(r.id);
        });

        if (idsToDelete.length > 0) {
          const { error: delErr } = await supabase
            .from('grades')
            .delete()
            .in('id', idsToDelete);
          if (delErr) throw delErr;
        }

        // Insert the new grades for this course (only those with numeric grades)
        if (subjectsWithGrades.length > 0) {
          const { error: insErr } = await supabase
            .from('grades')
            .insert(
              subjectsWithGrades.map(sg => {
                const subjectName = sg.subject.trim();
                let packedSubject = sg.outOf ? `${subjectName}|||${sg.outOf}` : subjectName;
                const courseForSubject = resolveCourseForSubject(sg);
                if (courseForSubject) packedSubject = `${courseForSubject}|||${packedSubject}`;

                return {
                  student_id: sanitizedId,
                  subject: packedSubject,
                  grade: parseFloat(sg.grade),
                  updated_by: 'admin',
                };
              })
            );
          if (insErr) throw insErr;
        }
      } else {
        // Normal add / single edit mode (upsert loop)
        for (const sg of subjectsWithGrades) {
          // Pack outOf into subject if present and include course prefix when selected
          const subjectName = sg.subject.trim();
          let packedSubject = sg.outOf ? `${subjectName}|||${sg.outOf}` : subjectName;
          const courseForSubject = resolveCourseForSubject(sg);
          if (courseForSubject) packedSubject = `${courseForSubject}|||${packedSubject}`;

          const { error: gradeError } = await supabase
            .from('grades')
            .upsert(
              {
                student_id: sanitizedId,
                subject: packedSubject,
                grade: parseFloat(sg.grade),
                updated_by: 'admin',
              },
              { onConflict: 'student_id,subject' }
            );

          if (gradeError) throw gradeError;
        }
      }

      // Vibrate on successful save
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      if (isEditing) {
        toast.success('Student updated successfully!');
      } else {
        toast.success('You added new student successfully', {
          position: 'top-center',
          duration: 1500,
          className: 'text-center font-semibold',
        });
      }
      // Optimistically update local list for fast UI feedback
      const newGrades = subjectsWithGrades.map(sg => {
        const subjectName = sg.subject.trim();
        const gradeNum = parseInt(sg.grade);
        const courseForSubject = resolveCourseForSubject(sg);
        return {
          id: `${sanitizedId}-${courseForSubject}-${subjectName}`,
          student_id: sanitizedId,
          subject: subjectName,
          grade: gradeNum,
          total: sg.outOf || undefined,
          course: courseForSubject,
        } as any;
      });

      setStudents(prev => {
        const idx = prev.findIndex(s => s.student_id === sanitizedId);
        const baseStudent = {
          student_id: sanitizedId,
          name: name.trim(),
          photo_url: photoUrl || undefined,
          locked: prev[idx]?.locked ?? false,
          batch_number: batchNumber.trim() || undefined,
          gender,
          course: courseToStore,
        } as Student;

        if (idx >= 0) {
          const mergedGrades = editingAllGrades
            ? newGrades
            : (() => {
                const existing = prev[idx].grades || [];
                const map = new Map(existing.map(g => {
                  const keyCourse = normalizeCourse((g as any).course) || 'uncategorized';
                  return [`${keyCourse}::${g.subject.toLowerCase()}`, g];
                }));
                for (const ng of newGrades) {
                  const keyCourse = normalizeCourse((ng as any).course) || 'uncategorized';
                  map.set(`${keyCourse}::${ng.subject.toLowerCase()}`, ng as any);
                }
                return Array.from(map.values());
              })();
          const updated = { ...prev[idx], ...baseStudent, grades: mergedGrades };
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [{ ...baseStudent, grades: newGrades }, ...prev];
      });

      setFormData({ studentId: '', name: '', batchNumber: '', gender: '', password: '' });
      setSubjectGrades([{ subject: '', grade: '', outOf: '', isCustom: false, course: getDefaultCourse() }]);
      setPhotoFile(null);
      setPhotoPreview('');
      setImgSrc('');
      setIsEditing(false);
      setEditingGradeId('');
      setEditingAllGrades(false);
      setOriginalStudentId('');
      setLockedCourse(null);
      // Background refresh to reconcile with server
      fetchStudents();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Failed to update grade: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditAllGrades = (student: Student & { grades?: Grade[] }) => {
    setFormData({
      studentId: student.student_id,
      name: student.name,
      batchNumber: student.batch_number || '',
      gender: student.gender || '',
      password: student.password || '',
    });
    setOriginalStudentId(student.student_id);

    const lockToCourse = studentsCourseFilter !== 'all' ? studentsCourseFilter : null;
    const studentGrades = student.grades || [];
    const detectedCourse = deriveCourseFromGrades(studentGrades as any);
    const studentCourseMeta = (student as any).course as ('cinematography' | 'videoediting' | undefined) || undefined;
    const courseContext = lockToCourse || detectedCourse || studentCourseMeta || 'cinematography';

    const filteredGrades = studentGrades.filter((grade) => gradeMatchesCourse(grade as any, courseContext));

    if (filteredGrades.length > 0) {
      setSubjectGrades(filteredGrades.map(g => {
        const normalizedSubject = g.subject.trim();
        const currentCourseSubjects = courseContext === 'cinematography' ? CINEMATOGRAPHY_SUBJECTS : VIDEO_EDITING_SUBJECTS;
        // Robust matching: ignore case and spaces
        const cleanSubject = (s: string) => s.toLowerCase().replace(/\s+/g, '');
        const target = cleanSubject(normalizedSubject);
        const standardSubject = currentCourseSubjects.find(s => cleanSubject(s) === target);
        const isStandardInCourse = !!standardSubject;
        return {
          subject: standardSubject || normalizedSubject,
          grade: g.grade.toString(),
          outOf: g.total ? g.total.toString() : '',
          isCustom: !isStandardInCourse,
          course: normalizeCourse((g as any).course) || courseContext,
        };
      }));
    } else {
      setSubjectGrades([{ subject: '', grade: '', outOf: '', isCustom: false, course: courseContext }]);
    }

    setFormCourse(courseContext);
    setLockedCourse(lockToCourse ? courseContext : null);
    setIsEditing(true);
    setEditingAllGrades(true);
    if (student.photo_url) {
      setPhotoPreview(student.photo_url);
    }
    setViewingStudent(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info('Editing all grades - Update and save');
  };

  const handleEdit = (student: Student & { grades?: Grade[] }, grade?: Grade) => {
    setFormData({
      studentId: student.student_id,
      name: student.name,
      batchNumber: student.batch_number || '',
      gender: student.gender || '',
      password: student.password || '',
    });
    setOriginalStudentId(student.student_id);
    const lockToCourse = studentsCourseFilter !== 'all' ? studentsCourseFilter : null;
    const studentGrades = student.grades || [];
    const detectedCourse = deriveCourseFromGrades(studentGrades as any);
    const studentCourseMeta = (student as any).course as ('cinematography' | 'videoediting' | undefined) || undefined;
    const fallbackCourse = lockToCourse || detectedCourse || studentCourseMeta || 'cinematography';
    
    // If editing specific grade, show only that subject
    // Otherwise, show all subjects for the student
    if (grade) {
      const normalizedSubject = grade.subject.trim();
      const gradeCourse = normalizeCourse((grade as any).course) || fallbackCourse;
      const currentCourseSubjects = gradeCourse === 'cinematography' ? CINEMATOGRAPHY_SUBJECTS : VIDEO_EDITING_SUBJECTS;
      // Robust matching: ignore case and spaces
      const cleanSubject = (s: string) => s.toLowerCase().replace(/\s+/g, '');
      const target = cleanSubject(normalizedSubject);
      const standardSubject = currentCourseSubjects.find(s => cleanSubject(s) === target);
      const isStandardInCourse = !!standardSubject;
      setSubjectGrades([{ 
        subject: standardSubject || normalizedSubject, 
        grade: grade.grade.toString(),
        outOf: grade.total ? grade.total.toString() : '',
        isCustom: !isStandardInCourse,
        course: gradeCourse,
      }]);
      setEditingGradeId(grade.id);
      setFormCourse(gradeCourse);
      setLockedCourse(lockToCourse ? gradeCourse : null);
    } else if (studentGrades.length > 0) {
      const filteredGrades = studentGrades.filter((g) => gradeMatchesCourse(g as any, fallbackCourse));

      if (filteredGrades.length > 0) {
        setSubjectGrades(filteredGrades.map(g => {
          const normalizedSubject = g.subject.trim();
          const currentCourseSubjects = fallbackCourse === 'cinematography' ? CINEMATOGRAPHY_SUBJECTS : VIDEO_EDITING_SUBJECTS;
          // Robust matching: ignore case and spaces
          const cleanSubject = (s: string) => s.toLowerCase().replace(/\s+/g, '');
          const target = cleanSubject(normalizedSubject);
          const standardSubject = currentCourseSubjects.find(s => cleanSubject(s) === target);
          const isStandardInCourse = !!standardSubject;
          return {
            subject: standardSubject || normalizedSubject,
            grade: g.grade.toString(),
            outOf: g.total ? g.total.toString() : '',
            isCustom: !isStandardInCourse,
            course: normalizeCourse((g as any).course) || fallbackCourse,
          };
        }));
      } else {
        setSubjectGrades([{ subject: '', grade: '', outOf: '', isCustom: false, course: fallbackCourse }]);
      }
      setFormCourse(fallbackCourse);
      setLockedCourse(lockToCourse ? fallbackCourse : null);
    } else {
      setSubjectGrades([{ subject: '', grade: '', outOf: '', isCustom: false, course: fallbackCourse }]);
      setFormCourse(fallbackCourse);
      setLockedCourse(lockToCourse ? fallbackCourse : null);
    }
    
    setIsEditing(true);
    if (student.photo_url) {
      setPhotoPreview(student.photo_url);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info('Editing student - Update the form and save');
  };

  const addSubjectField = () => {
    const defaultCourse = getDefaultCourse();
    setSubjectGrades([...subjectGrades, { subject: '', grade: '', outOf: '', isCustom: false, course: defaultCourse }]);
  };

  const addCustomSubjectField = () => {
    const defaultCourse = getDefaultCourse();
    setSubjectGrades([...subjectGrades, { subject: '', grade: '', outOf: '', isCustom: true, course: defaultCourse }]);
  };

  const removeSubjectField = (index: number) => {
    if (subjectGrades.length > 1) {
      setSubjectGrades(subjectGrades.filter((_, i) => i !== index));
    }
  };

  const updateSubjectGrade = <K extends keyof SubjectGrade>(index: number, field: K, value: SubjectGrade[K]) => {
    setSubjectGrades((prev) =>
      prev.map((sg, i) => (i === index ? { ...sg, [field]: value } : sg))
    );
  };

  const handleSubjectSelection = (index: number, value: string) => {
    setSubjectGrades((prev) =>
      prev.map((sg, i) => {
        if (i !== index) return sg;
        if (value === CUSTOM_SUBJECT_VALUE) {
          return { ...sg, subject: '', isCustom: true, course: sg.course || getDefaultCourse() };
        }
        return { ...sg, subject: value, isCustom: false, course: getDefaultCourse() };
      })
    );
  };

  const getGradeColor = (avgGrade: number): string => {
    const letter = calculateGradeLetter(avgGrade);
    if (['A+', 'A', 'A-'].includes(letter)) return 'bg-green-600 text-white';
    if (['B+', 'B', 'B-'].includes(letter)) return 'bg-green-400 text-gray-900';
    if (['C+', 'C'].includes(letter)) return 'bg-yellow-400 text-gray-900';
    return 'bg-red-600 text-white';
  };

  const uniqueBatches = Array.from(new Set(students.map(s => s.batch_number).filter(Boolean))).sort();

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBatch = batchFilter === 'all' || student.batch_number === batchFilter;
    const matchesGender = genderFilter === 'all' || (student.gender?.toLowerCase() === genderFilter.toLowerCase());

    if (!matchesSearch || !matchesBatch || !matchesGender) {
      return false;
    }

    // Course-level filter: include students who have grades for the selected course
    // or who were created/assigned to that course via metadata (no numeric grades saved)
    if (studentsCourseFilter !== 'all') {
      const hasCourseGrades = (student.grades || []).some((g: any) => (g.course || '').toLowerCase() === studentsCourseFilter.toLowerCase());
      const studentCourseMeta = (student as any).course;
      const matchesCourseMeta = studentCourseMeta && studentCourseMeta.toLowerCase() === studentsCourseFilter.toLowerCase();
      if (!hasCourseGrades && !matchesCourseMeta) return false;
    }

    if (gradeFilter === 'all') return true;
    
    const grades = student.grades || [];
    if (grades.length === 0) return false;
    
    const avgGrade = calculateAverageGrade(grades.map(g => g.grade));
    const letter = calculateGradeLetter(avgGrade);
    
    // Only letter grade filtering now
    if (gradeFilter === 'a+') return letter === 'A+';
    if (gradeFilter === 'a') return letter === 'A';
    if (gradeFilter === 'a-') return letter === 'A-';
    if (gradeFilter === 'b+') return letter === 'B+';
    if (gradeFilter === 'b') return letter === 'B';
    if (gradeFilter === 'b-') return letter === 'B-';
    if (gradeFilter === 'c+') return letter === 'C+';
    if (gradeFilter === 'c') return letter === 'C';
    if (gradeFilter === 'non_compitant') return letter === 'NON CMPITANT';
    
    return true;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (!avgGradeSort) return 0;

    const getAvg = (student: Student & { grades: any[] }) => {
      const allGrades = student.grades || [];
      const grades = studentsCourseFilter === 'all' ? allGrades : allGrades.filter((g: any) => (g.course || '').toLowerCase() === studentsCourseFilter.toLowerCase());
      return grades.length > 0 ? calculateAverageGrade(grades.map((g: any) => g.grade)) : 0;
    };

    const avgA = getAvg(a as any);
    const avgB = getAvg(b as any);

    if (avgGradeSort === 'asc') {
      return avgA - avgB;
    } else {
      return avgB - avgA;
    }
  });

  const handleDelete = async (studentId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete all data for ${name} (${studentId})?`)) {
      try {
        const { error } = await supabase.from('students').delete().eq('student_id', studentId);

        if (error) throw error;

        // Optimistically remove from local list for instant feedback
        setStudents(prev => prev.filter(s => s.student_id === undefined ? true : s.student_id !== studentId));
        toast.success(`Deleted ${name}`);
        // Background refresh to confirm state
        fetchStudents();
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to delete student');
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
      
      toast.success('Message deleted');
      // Refresh comments for the viewing student
      if (viewingStudent) {
        const { data: comments } = await supabase
          .from('comments')
          .select('*')
          .eq('student_id', viewingStudent.student_id)
          .order('created_at', { ascending: true });
          
        setViewingStudent(prev => prev ? { ...prev, comments: comments || [] } : null);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleUpdateComment = async () => {
    if (!editingComment || !editMessageText.trim()) return;
    try {
      const { error } = await supabase
        .from('comments')
        .update({ message: editMessageText.trim() })
        .eq('id', editingComment.id);
        
      if (error) throw error;
      
      toast.success('Message updated');
      setEditingComment(null);
      setEditMessageText('');
      
      // Refresh comments
      if (viewingStudent) {
        const { data: comments } = await supabase
          .from('comments')
          .select('*')
          .eq('student_id', viewingStudent.student_id)
          .order('created_at', { ascending: true });
          
        setViewingStudent(prev => prev ? { ...prev, comments: comments || [] } : null);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Failed to update message');
    }
  };

  const handleSendReply = async (studentId: string) => {
    if (!newReply.trim()) return;

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          student_id: studentId,
          message: newReply.trim(),
          sender_type: 'teacher',
        });

      if (error) throw error;
      setNewReply('');
      toast.success(t('replySent'));
      
      // Refresh comments for the viewing student
      if (viewingStudent) {
        const { data: comments } = await supabase
          .from('comments')
          .select('*')
          .eq('student_id', viewingStudent.student_id)
          .order('created_at', { ascending: true });
          
        setViewingStudent(prev => prev ? { ...prev, comments: comments || [] } : null);
      }
      
      fetchStudents();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(t('replyFailed'));
    }
  };

  if (lockoutEndTime && lockoutEndTime > Date.now()) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0c9488] flex flex-col items-center justify-center text-white p-4 animate-in fade-in duration-300">
        <div className="bg-white/20 p-6 rounded-full mb-6 animate-pulse">
          <Lock className="w-16 h-16 sm:w-24 sm:h-24" />
        </div>
        <h2 className="text-2xl sm:text-4xl font-bold mb-4 text-center">{t('appLockedTitle')}</h2>
        <p className="text-lg sm:text-xl mb-8 text-center max-w-md">
          {t('appLockedMessage')}
        </p>
        <div className="text-4xl sm:text-6xl font-mono font-bold bg-black/20 px-6 py-3 rounded-xl">
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
        <p className="mt-8 text-sm opacity-80">
          {t('appLockedFooter')}
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen p-4 flex items-start justify-center pt-12">
        <Card className="w-full max-w-md p-6 sm:p-8 shadow-lg bg-white">
          <div className="flex flex-col items-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <User className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-center text-primary">{t('adminAccessTitle')}</h1>
            <p className="text-primary/80 text-center mt-1 font-medium">
              {t('adminAccessSubtitle')}
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                required
                className="pr-10 border-primary/20 focus-visible:ring-primary"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-primary/60 hover:text-primary"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {t('signIn')}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Precompute visible grades for the currently viewed student so the dialog can show course-specific results
  const viewingVisibleGrades = viewingStudent
    ? (studentsCourseFilter === 'all' ? viewingStudent.grades : viewingStudent.grades.filter((g: any) => (g.course || '').toLowerCase() === studentsCourseFilter.toLowerCase()))
    : [];
  const subjectOptions = formCourse === 'cinematography'
    ? CINEMATOGRAPHY_SUBJECTS
    : VIDEO_EDITING_SUBJECTS;
  const isCinematographyButtonDisabled = lockedCourse === 'videoediting';
  const isVideoEditingButtonDisabled = lockedCourse === 'cinematography';

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-500">
        {/* Page Toggle Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          {adminRole !== 'news_admin' && (
            <Button
              onClick={() => setAdminPage('students')}
              variant={adminPage === 'students' ? 'default' : 'outline'}
              className={`w-full shadow-md border border-white/20 active:bg-admin active:text-white ${adminPage === 'students' ? 'bg-admin hover:bg-admin/90' : ''}`}
            >
              {t('studentPanelButton')}
            </Button>
          )}
          {adminRole !== 'student_admin' && (
            <Button
              onClick={() => setAdminPage('management')}
              variant={adminPage === 'management' ? 'default' : 'outline'}
              className={`w-full shadow-md border border-white/20 active:bg-admin active:text-white ${adminPage === 'management' ? 'bg-admin hover:bg-admin/90' : ''}`}
            >
              {t('managementToggleLabel')}
            </Button>
          )}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full gap-2 shadow-md border border-white/20 active:bg-white active:text-admin"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        {adminPage === 'students' && adminRole !== 'news_admin' ? (
          <>
        <Card className="p-4 sm:p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-bold flex-1 text-left text-primary">
                {editingAllGrades ? t('editAllGradesTitle') : t('addGradesTitle')}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start justify-center sm:justify-start">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 text-center sm:text-left">
                  <label className="cursor-pointer flex items-center gap-3">
                    <div className="relative">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Preview"
                          onClick={() => setImageViewerSrc(photoPreview)}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-admin"
                        />
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted flex items-center justify-center border-4 border-admin relative">
                          <span className="absolute inset-0 rounded-full animate-ping bg-admin/20"></span>
                          <User className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </div>
                    <div className="flex flex-col text-xs sm:text-sm text-admin">
                      <div className="flex items-center gap-1 hover:underline">
                        <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>{t('uploadPhoto')}</span>
                      </div>
                    </div>
                  </label>
                  {/* Course buttons aligned next to the photo for larger screens; stack on mobile. */}
                  <div className="mt-2 sm:mt-0 sm:ml-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={formCourse === 'cinematography' ? 'default' : 'outline'}
                      onClick={() => setFormCourse('cinematography')}
                      className={formCourse === 'cinematography' ? 'bg-admin hover:bg-admin/90 flex items-center gap-2' : 'flex items-center gap-2'}
                      disabled={isCinematographyButtonDisabled}
                    >
                      <Camera className="w-4 h-4" />
                      <span>Cinematography</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={formCourse === 'videoediting' ? 'default' : 'outline'}
                      onClick={() => setFormCourse('videoediting')}
                      className={formCourse === 'videoediting' ? 'bg-admin hover:bg-admin/90 flex items-center gap-2' : 'flex items-center gap-2'}
                      disabled={isVideoEditingButtonDisabled}
                    >
                      <Edit className="w-4 h-4" />
                      <span>Vision & Sound Editing</span>
                    </Button>
                  </div>
                </div>
                
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value.toUpperCase() })}
                    placeholder={t('studentIdPlaceholder')}
                    className="uppercase"
                    required
                  />
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('studentNamePlaceholder')}
                    required
                  />
                  <Input
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    placeholder={t('batchNumberPlaceholder')}
                  />
                  <Input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Password"
                    className="font-mono"
                  />
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground block">{t('genderLabel')}</label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                      <SelectTrigger className="w-full" aria-label={t('genderLabel')}>
                        <SelectValue placeholder={t('genderPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">{t('genderMale')}</SelectItem>
                        <SelectItem value="Female">{t('genderFemale')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{t('subjectsAndGrades')}</h3>
                  <div className="flex gap-2">
                    {isEditing && (
                      <Button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setEditingGradeId('');
                          setEditingAllGrades(false);
                          setFormData({ studentId: '', name: '', batchNumber: '', gender: '', password: '' });
                          setSubjectGrades([{ subject: '', grade: '', outOf: '', isCustom: false, course: getDefaultCourse() }]);
                          setPhotoPreview('');
                          setPhotoFile(null);
                          setLockedCourse(null);
                        }}
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive"
                      >
                        <X className="w-4 h-4 mr-1" />
                        {t('cancel')}
                      </Button>
                    )}
                    <Button type="button" onClick={addSubjectField} size="sm" variant="outline" className="text-admin border-admin">
                      <Plus className="w-4 h-4 mr-1" />
                      {t('addSubject')}
                    </Button>
                  </div>
                </div>

                {subjectGrades.map((sg, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="w-1 bg-admin rounded-full flex-shrink-0 self-stretch"></div>
                    <div className="flex-1 space-y-2">
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">{t('subjectNameLabel')}</label>
                          <Select
                            key={`${sg.subject}-${sg.isCustom}-${index}`}
                            value={sg.isCustom ? CUSTOM_SUBJECT_VALUE : (sg.subject || undefined)}
                            onValueChange={(value) => handleSubjectSelection(index, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjectOptions.map((subject, index) => (
                                subject === SUBJECT_DIVIDER ? (
                                  <SelectSeparator key={`divider-${index}`} />
                                ) : (
                                  <SelectItem key={`${subject}-${index}`} value={subject}>
                                            {subject}
                                          </SelectItem>
                                )
                              ))}
                              <SelectSeparator />
                              <SelectItem value={CUSTOM_SUBJECT_VALUE}>Custom Subject / Exam</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {sg.isCustom && (
                          <Input
                            type="text"
                            value={sg.subject}
                            onChange={(e) => updateSubjectGrade(index, 'subject', e.target.value)}
                            placeholder="Enter custom subject or exam name"
                            required
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">{t('gradeLabel')}</label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={sg.grade}
                            onChange={(e) => updateSubjectGrade(index, 'grade', e.target.value)}
                            placeholder={t('gradeLabel')}
                            min="0"
                            className="w-24"
                          />
                          <span className="text-muted-foreground font-bold">/</span>
                          <Input
                            type="text"
                            value={sg.outOf}
                            onChange={(e) => updateSubjectGrade(index, 'outOf', e.target.value)}
                            placeholder={t('outOfLabel')}
                            className="w-24"
                          />
                        </div>
                      </div>
                    </div>
                    {subjectGrades.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSubjectField(index)}
                        className="text-destructive mt-6"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <Button type="submit" className="w-full bg-admin hover:bg-admin/90">
              {editingAllGrades ? t('updateGrades') : t('saveGrades')}
            </Button>
          </form>
        </Card>

        {/* Recent Student Comments Section */}
        {(() => {
          const unreadComments = students.flatMap(s => 
            (s.comments || [])
              .filter(c => c.sender_type === 'student' && !c.is_read && !dismissedComments.includes(c.id))
              .map(c => ({ ...c, studentName: s.name, student: s }))
          ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          return (
            <Card className="p-4 sm:p-6 shadow-lg border-l-4 border-l-red-500">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-primary shrink-0" />
                  <h2 className="text-lg sm:text-xl font-bold text-primary">{t('recentComments')}</h2>
                  {unreadComments.length > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse flex items-center justify-center shrink-0">
                      {unreadComments.length} {t('newLabel')}
                    </span>
                  )}
                </div>
                {unreadComments.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 px-3"
                    onClick={async () => {
                      const allIds = unreadComments.map(c => c.id);
                      // Update DB to mark as read
                      const { error } = await supabase
                        .from('comments')
                        .update({ is_read: true })
                        .in('id', allIds);
                      
                      if (error) {
                        console.error('Error clearing comments:', error);
                        toast.error(`Failed to clear comments: ${error.message}`);
                        return;
                      }

                      // Update local state
                      const newDismissed = [...dismissedComments, ...allIds];
                      setDismissedComments(newDismissed);
                      localStorage.setItem('dismissedComments', JSON.stringify(newDismissed));
                      
                      // Refresh students to update UI immediately
                      fetchStudents();
                      toast.success('All messages cleared');
                    }}
                  >
                    {t('clearAll')}
                  </Button>
                )}
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {unreadComments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">{t('noNewComments')}</p>
                ) : (
                  unreadComments.map((comment) => (
                    <div key={comment.id} className="p-3 bg-muted/50 rounded-lg border border-border flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm">{comment.studentName}</span>
                          <span className="text-xs text-muted-foreground">({comment.student_id})</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{comment.message}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            // Mark as read in DB
                            const { error } = await supabase
                              .from('comments')
                              .update({ is_read: true })
                              .eq('id', comment.id);

                            if (error) {
                              console.error('Error dismissing comment:', error);
                              toast.error('Failed to dismiss');
                              return;
                            }

                            // Dismiss locally
                            const newDismissed = [...dismissedComments, comment.id];
                            setDismissedComments(newDismissed);
                            localStorage.setItem('dismissedComments', JSON.stringify(newDismissed));
                            fetchStudents(); // Refresh
                            toast.success('Message removed');
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-7 text-xs bg-admin hover:bg-admin/90"
                          onClick={() => {
                            setViewingStudent(comment.student);
                          }}
                        >
                          {t('reply')}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          );
        })()}

        {imgSrc && (
          <Dialog open={!!imgSrc} onOpenChange={() => setImgSrc('')}>
            <DialogContent 
              className="max-w-2xl"
            >
              <DialogHeader>
                <DialogTitle>Crop Image</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img ref={imgRef} src={imgSrc} alt="Crop" className="max-h-96 mx-auto" />
                </ReactCrop>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setImgSrc('')}>Cancel</Button>
                  <Button onClick={handleCropComplete} className="bg-admin hover:bg-admin/90">Apply Crop</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Card className="p-4 sm:p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-primary">{t('allStudents')} ({filteredStudents.length})</h2>
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={studentsCourseFilter === 'cinematography' ? 'default' : 'outline'}
                  onClick={() => setStudentsCourseFilter('cinematography')}
                  className={studentsCourseFilter === 'cinematography' ? 'bg-admin hover:bg-admin/90' : ''}
                >
                  Cinematography
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={studentsCourseFilter === 'videoediting' ? 'default' : 'outline'}
                  onClick={() => setStudentsCourseFilter('videoediting')}
                  className={studentsCourseFilter === 'videoediting' ? 'bg-admin hover:bg-admin/90' : ''}
                >
                  Vision & Sound Editing
                </Button>
                <Button type="button" size="sm" variant={studentsCourseFilter === 'all' ? 'default' : 'ghost'} onClick={() => setStudentsCourseFilter('all')}>All</Button>
              </div>
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:min-w-[540px]">
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger className="w-full">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder={t('filterGradesLabel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('filterGradesLabel')}</SelectItem>
                    <SelectItem value="a+">A+ (95-100%)</SelectItem>
                    <SelectItem value="a">A (92-94.99%)</SelectItem>
                    <SelectItem value="a-">A- (89-91.99%)</SelectItem>
                    <SelectItem value="b+">B+ (86-88.99%)</SelectItem>
                    <SelectItem value="b">B (83-85.99%)</SelectItem>
                    <SelectItem value="b-">B- (80-82.99%)</SelectItem>
                    <SelectItem value="c+">C+ (77-79.99%)</SelectItem>
                    <SelectItem value="c">C (74-76.99%)</SelectItem>
                    <SelectItem value="non_compitant">NON CMPITANT (Below 74%)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={batchFilter} onValueChange={setBatchFilter}>
                  <SelectTrigger className="w-full">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder={t('filterBatchLabel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('filterBatchLabel')}</SelectItem>
                    {uniqueBatches.map((batch) => (
                      <SelectItem key={batch} value={batch!}>
                        {batch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="w-full">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder={t('filterGenderLabel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('genderAllOption')}</SelectItem>
                    <SelectItem value="Male">{t('genderMale')}</SelectItem>
                    <SelectItem value="Female">{t('genderFemale')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead className="border-b border-t bg-muted/20">
                <tr className="text-left">
                  <th className="py-3 px-4 font-semibold text-sm border-r border-border">{t('photoColumn')}</th>
                  <th className="py-3 px-4 font-semibold text-sm border-r border-border">{t('idColumn')}</th>
                  <th className="py-3 px-4 font-semibold text-sm border-r border-border">{t('nameColumn')}</th>
                  <th className="py-3 px-4 font-semibold text-sm border-r border-border">{t('batchColumn')}</th>
                  <th className="py-3 px-4 font-semibold text-sm border-r border-border">Password</th>
                  <th className="py-3 px-4 font-semibold text-sm border-r border-border">{t('subjectsColumn')}</th>
                  {globalSettings.show_admin_avg_grades && (
                    <th 
                      className="py-3 px-4 font-semibold text-sm border-r border-border text-center w-[140px] cursor-pointer hover:bg-muted/50"
                      onClick={() => setAvgGradeSort(current => {
                        if (current === null) return 'desc';
                        if (current === 'desc') return 'asc';
                        return null;
                      })}
                    >
                      {t('avgGradeColumn')}
                      {avgGradeSort === 'asc' && <span className="ml-1">↑</span>}
                      {avgGradeSort === 'desc' && <span className="ml-1">↓</span>}
                    </th>
                  )}
                  <th className="py-3 px-4 font-semibold text-sm text-center w-24">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-full px-0 font-semibold hover:bg-transparent">
                          {t('gradeLetterColumn')}
                          <ChevronDown className="ml-1 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center">
                        <DropdownMenuItem onClick={() => handleBulkGradeLetterToggle(true)}>
                          {t('gradeLetterOnAll')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkGradeLetterToggle(false)}>
                          {t('gradeLetterOffAll')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </th>
                  <th className="py-3 px-4 font-semibold text-sm text-center w-28">{t('viewColumn')}</th>
                  <th className="py-3 px-4 font-semibold text-sm text-center w-20">{t('lockColumn')}</th>
                  <th className="py-3 px-4 font-semibold text-sm text-center w-20">{t('deleteColumn')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedStudents.map((student) => {
                  const allGrades = student.grades || [];
                  const grades = studentsCourseFilter === 'all' ? allGrades : allGrades.filter((g: any) => (g.course || '').toLowerCase() === studentsCourseFilter.toLowerCase());
                  const avgGrade = grades.length > 0 ? calculateAverageGrade(grades.map((g: any) => g.grade)) : 0;
                  const canView = grades.length > 0 || !!(student as any).course;
                  
                  return (
                    <tr key={student.student_id} className="hover:bg-muted/30 transition-colors border-b">
                      <td className="py-3 px-4 border-r border-border align-middle">
                        {student.photo_url ? (
                          <img
                            src={student.photo_url}
                            alt={student.name}
                            className="w-10 h-10 rounded-full object-cover mx-auto"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                            <User className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                       <td className="py-3 px-4 font-mono text-xs sm:text-sm border-r border-border align-middle">{student.student_id}</td>
                      <td className="py-3 px-4 border-r border-border align-middle">
                        <div>
                          <p className="text-sm font-medium">{student.name}</p>
                          {student.comments && student.comments.length > 0 && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MessageCircle className="w-3 h-3" />
                              {student.comments.length} comment{student.comments.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm border-r border-border align-middle">{student.batch_number || '-'}</td>
                      <td className="py-3 px-4 text-sm font-mono border-r border-border align-middle">{student.password || '-'}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-admin border-r border-border align-middle">{grades.length}</td>
                      {globalSettings.show_admin_avg_grades && (
                        <td className="py-3 px-4 border-r border-border align-middle text-center w-[140px]">
                          <div className="flex justify-center items-center w-full">
                            {grades.length > 0 ? (
                              <span className={`px-3 py-1 rounded-lg font-bold text-sm ${getGradeColor(avgGrade)} inline-flex items-center justify-center min-w-[90px]`}>
                                {avgGrade}% {globalSettings.show_grade_letters && student.show_final_grade_letter ? calculateGradeLetter(avgGrade) : ''}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">{t('noGrades')}</span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="py-3 px-4 align-middle text-center">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={!!student.show_final_grade_letter}
                            onCheckedChange={(checked) => handleGradeLetterToggle(student.student_id, checked)}
                            title={student.show_final_grade_letter ? 'Turn off grade letters' : 'Turn on grade letters'}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 align-middle text-center">
                        {canView ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingStudent(student)}
                            className="text-admin border-admin hover:bg-admin/10 mx-auto w-[82px]"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            {t('viewButton')}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 align-middle text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLockToggle(student.student_id, student.locked || false)}
                          className={student.locked ? 'text-green-600 hover:text-green-600 hover:bg-green-50 mx-auto' : 'text-orange-600 hover:text-orange-600 hover:bg-orange-50 mx-auto'}
                        >
                          {student.locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </Button>
                      </td>
                      <td className="py-3 px-4 align-middle text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(student.student_id, student.name)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 mx-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
          </>
        ) : (
          <>
            {/* Management Page Content */}
            <div className="space-y-4 sm:space-y-6">
              {adminRole === 'super_admin' && (
                <>
                  {/* Admin Password Management */}
                  <Card className="p-4 border-l-4 border-l-orange-500 bg-white shadow-lg">
                    <div className="flex items-center justify-between gap-4">
                      <div className="p-2 bg-primary rounded-full flex-shrink-0">
                        <Key className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-bold text-primary">{t('superAdminAccess')}</h3>
                        <p className="text-xs text-muted-foreground">{t('manageMasterPassword')}</p>
                      </div>
                      <Button
                        onClick={() => setShowChangePassword(true)}
                        variant="outline"
                        className="gap-2 text-admin border-admin hover:bg-admin hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                        {t('changePassword')}
                      </Button>
                    </div>
                  </Card>

                  {/* News Admin Password Management */}
                  <Card className="p-4 border-l-4 border-l-orange-500 bg-white shadow-lg">
                    <div className="flex items-center justify-between gap-4">
                      <div className="p-2 bg-primary rounded-full flex-shrink-0">
                        <Key className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-bold text-primary">{t('newsAdminAccess')}</h3>
                        <p className="text-xs text-muted-foreground">{t('manageNewsAdminAccess')}</p>
                      </div>
                      <Button
                        onClick={() => setShowNewsAdminPassword(true)}
                        variant="outline"
                        className="gap-2 text-admin border-admin hover:bg-admin hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                        {t('changePassword')}
                      </Button>
                    </div>
                  </Card>

                  {/* Student Admin Password Management */}
                  <Card className="p-4 border-l-4 border-l-orange-500 bg-white shadow-lg">
                    <div className="flex items-center justify-between gap-4">
                      <div className="p-2 bg-primary rounded-full flex-shrink-0">
                        <Key className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-bold text-primary">{t('studentAdminAccess')}</h3>
                        <p className="text-xs text-muted-foreground">{t('manageStudentAdminAccess')}</p>
                      </div>
                      <Button
                        onClick={() => setShowStudentAdminPassword(true)}
                        variant="outline"
                        className="gap-2 text-admin border-admin hover:bg-admin hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                        {t('changePassword')}
                      </Button>
                    </div>
                  </Card>

                  {/* Portal Management */}
                  <PortalManagement />

                  {/* Teacher Management */}
                  <TeacherManagement />
                </>
              )}

              {/* News Management - Visible to both */}
              <NewsManagement />

              {adminRole === 'super_admin' && (
                <>
                  {/* Video Management */}
                  <VideoManagement />
                  <div className="mt-8">
                    <ModuleManagement />
                  </div>

                  {/* Slider Management */}
                  <SliderManagement />

                  {/* Contact Information Management */}
                  <ContactManagement />
                </>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={viewingStudent !== null} onOpenChange={() => { setViewingStudent(null); setShowGradesList(false); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('studentGradeReportTitle')}</DialogTitle>
          </DialogHeader>
          
          {viewingStudent && viewingStudent.grades && (
            <div className="space-y-4">
              {/* visibleGrades used by summary and details */}
              <div className="flex items-center gap-4 mb-4">
                {viewingStudent.photo_url ? (
                  <img
                    src={viewingStudent.photo_url}
                    alt={viewingStudent.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-admin"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-admin">
                    <User className="w-7 h-7 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{viewingStudent.name}</h3>
                  <p className="text-sm text-muted-foreground">ID: {viewingStudent.student_id}</p>
                  <p className="text-sm text-muted-foreground">Password: <span className="font-mono font-bold text-black">{viewingStudent.password || 'Not Set'}</span></p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEditAllGrades(viewingStudent)}
                    className="bg-admin hover:bg-admin/90 gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    {t('editAllGradesTitle')}
                  </Button>
                </div>
              </div>

              {(() => {
                const total = viewingVisibleGrades.reduce((s, g) => s + Number(g.grade || 0), 0);
                const avg = calculateAverageGrade(viewingVisibleGrades.map(g => Number(g.grade)));
                return (
                  <>
                  <div className={`border-2 border-admin rounded-lg p-3 ${getGradeColor(avg)}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm opacity-90">{t('totalSubjectsLabel')}</p>
                          <p className="text-2xl font-bold">{viewingVisibleGrades.length}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-sm opacity-90">{t('totalGradeLabel')}</p>
                            <p className="text-2xl font-bold">{total}%</p>
                          </div>
                        {viewingStudent.show_final_grade_letter && (
                          <div className={`inline-flex items-center justify-center h-9 px-3 rounded-md font-bold text-sm bg-white/20`}>
                            <span className="text-white">{calculateGradeLetter(total)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowGradesList(!showGradesList)}
                      className="text-admin font-semibold inline-flex items-center gap-1 hover:underline"
                    >
                      {showGradesList ? t('hideAllResults') : t('showAllResults')}
                      <span className={`transition-transform ${showGradesList ? 'rotate-180' : ''}`}>▾</span>
                    </button>
                  </div>
                  </>
                );
              })()}

              {showGradesList && viewingVisibleGrades && viewingVisibleGrades.length > 0 && (
                  <div className="mt-4 border-t border-muted pt-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-admin" />
                      <h3 className="font-bold text-lg">{t('allSubjectsAndGradesTitle')}</h3>
                    </div>
                    <div>
                      <Button
                        onClick={handleExportViewingStudentPDF}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Export
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {viewingVisibleGrades.map((g: any) => (
                      <div key={g.id ?? `${viewingStudent.student_id}-${g.subject}`} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border">
                        <span className="font-medium">{g.subject}</span>
                        <span className="font-bold">
                          {g.grade}{g.total ? ` / ${g.total}` : '%'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              {viewingStudent.comments && (
                <div className="mt-6 border-t pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageCircle className="w-5 h-5 text-admin" />
                    <h3 className="font-bold text-lg">Comments</h3>
                  </div>
                  
                  <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                    {viewingStudent.comments.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-4">{t('noMessagesYet')}</p>
                    ) : (
                      viewingStudent.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className={`p-3 rounded-lg group relative ${
                            comment.sender_type === 'teacher'
                              ? 'bg-admin/10 mr-8'
                              : 'bg-muted ml-8'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">
                                {comment.sender_type === 'teacher' ? `${t('youLabel')} (${t('teacherLabel')})` : t('studentLabel')}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.created_at).toLocaleString()}
                              </span>
                            </div>
                            
                            {/* Allow editing/deleting own messages */}
                            {comment.sender_type === 'teacher' && (
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
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      placeholder={t('replyPlaceholder')}
                      className="flex-1 min-h-[60px]"
                    />
                    <Button
                      onClick={() => {
                        handleSendReply(viewingStudent.student_id);
                      }}
                      disabled={!newReply.trim()}
                      className="bg-admin hover:bg-admin/90"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {imageViewerSrc && (
        <Dialog open={!!imageViewerSrc} onOpenChange={() => setImageViewerSrc('')}>
          <DialogContent className="max-w-sm">
            <div className="flex items-center justify-center p-6 bg-blue-600 rounded-lg">
              <img src={imageViewerSrc} alt="Preview" className="w-48 h-48 rounded-full object-cover border-4 border-white" />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ChangePasswordDialog 
        open={showChangePassword} 
        onOpenChange={setShowChangePassword} 
      />

      <NewsAdminPasswordDialog 
        open={showNewsAdminPassword} 
        onOpenChange={setShowNewsAdminPassword} 
      />

      <StudentAdminPasswordDialog 
        open={showStudentAdminPassword} 
        onOpenChange={setShowStudentAdminPassword} 
      />

      <Dialog open={!!editingComment} onOpenChange={(open) => !open && setEditingComment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editMessageText}
            onChange={(e) => setEditMessageText(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingComment(null)}>Cancel</Button>
            <Button onClick={handleUpdateComment}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {isSaving && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-admin/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-admin border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-lg font-semibold text-admin animate-pulse">Saving...</p>
          </div>
        </div>
      )}
    </div>
  );
};
