import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { AuthenticatedStudentView } from '@/components/AuthenticatedStudentView';
import { Loader2 } from 'lucide-react';

export const Student = () => {
  const { user, studentId, isLoading, signOut } = useStudentAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/student-auth');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-student/10 to-student/5">
        <Loader2 className="w-8 h-8 animate-spin text-student" />
      </div>
    );
  }

  if (!user || !studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-student/10 to-student/5">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No student profile linked to this account.</p>
          <button 
            onClick={() => signOut()}
            className="text-student hover:underline"
          >
            Sign out and try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-student/10 to-student/5 p-4">
      <div className="max-w-2xl mx-auto">
        <AuthenticatedStudentView studentId={studentId} onSignOut={signOut} />
      </div>
    </div>
  );
};

export default Student;
