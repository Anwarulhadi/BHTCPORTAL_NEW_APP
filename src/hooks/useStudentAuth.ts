import { useState, useEffect } from 'react';

// Mock types to replace Supabase types
interface User {
  id: string;
  email?: string;
}

interface Session {
  user: User;
  access_token: string;
}

interface StudentAuthState {
  user: User | null;
  session: Session | null;
  studentId: string | null;
  isLoading: boolean;
}

export const useStudentAuth = () => {
  const [authState, setAuthState] = useState<StudentAuthState>({
    user: null,
    session: null,
    studentId: null,
    isLoading: true,
  });

  useEffect(() => {
    // Check localStorage for existing session
    const storedSession = localStorage.getItem('mock_session');
    const storedStudentId = localStorage.getItem('mock_student_id');

    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        setAuthState({
          user: session.user,
          session: session,
          studentId: storedStudentId,
          isLoading: false,
        });
      } catch (e) {
        console.error('Failed to parse session', e);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    // Mock sign in
    console.log('Mock signing in with', email, password);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // For testing, accept any login
    const mockUser = { id: 'mock-user-id', email };
    const mockSession = { user: mockUser, access_token: 'mock-token' };
    
    localStorage.setItem('mock_session', JSON.stringify(mockSession));
    // We don't know the student ID yet, usually it comes from profile
    // For now, let's assume the email IS the student ID or related
    // Or we can just set a dummy student ID
    const mockStudentId = 'STU-001'; 
    localStorage.setItem('mock_student_id', mockStudentId);

    setAuthState({
      user: mockUser,
      session: mockSession,
      studentId: mockStudentId,
      isLoading: false,
    });

    return { error: null };
  };

  const signUp = async (email: string, password: string, studentId: string) => {
    console.log('Mock signing up with', email, password, studentId);
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockUser = { id: 'mock-user-id', email };
    const mockSession = { user: mockUser, access_token: 'mock-token' };

    localStorage.setItem('mock_session', JSON.stringify(mockSession));
    localStorage.setItem('mock_student_id', studentId);

    setAuthState({
      user: mockUser,
      session: mockSession,
      studentId: studentId,
      isLoading: false,
    });

    return { error: null };
  };

  const signOut = async () => {
    localStorage.removeItem('mock_session');
    localStorage.removeItem('mock_student_id');
    setAuthState({
      user: null,
      session: null,
      studentId: null,
      isLoading: false,
    });
    return { error: null };
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
  };
};
