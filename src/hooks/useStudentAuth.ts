import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        // Defer student profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchStudentProfile(session.user.id);
          }, 0);
        } else {
          setAuthState(prev => ({
            ...prev,
            studentId: null,
            isLoading: false,
          }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        fetchStudentProfile(session.user.id);
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchStudentProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('student_id')
        .eq('user_id', userId)
        .maybeSingle();

      setAuthState(prev => ({
        ...prev,
        studentId: data?.student_id ?? null,
        isLoading: false,
      }));
    } catch {
      setAuthState(prev => ({
        ...prev,
        studentId: null,
        isLoading: false,
      }));
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, studentId: string) => {
    const redirectUrl = `${window.location.origin}/student`;
    
    // First verify the student ID exists
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('student_id, name')
      .eq('student_id', studentId.trim().toUpperCase())
      .maybeSingle();

    if (studentError || !studentData) {
      return { error: { message: 'Student ID not found. Please check your ID and try again.' } };
    }

    // Check if student ID is already linked to an account
    const { data: existingProfile } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('student_id', studentId.trim().toUpperCase())
      .maybeSingle();

    if (existingProfile) {
      return { error: { message: 'This student ID is already linked to an account. Please sign in instead.' } };
    }

    // Create the auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) return { error };

    // If signup successful and we have a user, create the student profile link
    if (data.user) {
      const { error: profileError } = await supabase
        .from('student_profiles')
        .insert({
          user_id: data.user.id,
          student_id: studentId.trim().toUpperCase(),
        });

      if (profileError) {
        // Note: This is a rare edge case - user created but profile link failed
        console.error('Failed to link student profile:', profileError);
        return { error: { message: 'Account created but failed to link student ID. Please contact support.' } };
      }
    }

    return { data, error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthState({
      user: null,
      session: null,
      studentId: null,
      isLoading: false,
    });
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    refetchProfile: () => authState.user && fetchStudentProfile(authState.user.id),
  };
};
