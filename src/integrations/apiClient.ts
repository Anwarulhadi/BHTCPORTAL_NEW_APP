import { supabase } from './supabase/client';

export async function getStudents(params?: { search?: string; course?: string }) {
  let query = supabase.from('students').select('*');
  
  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,student_id.ilike.%${params.search}%`);
  }
  
  // Course filtering would require a join with grades or a different schema structure
  // For now we return students matching the search criteria
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getStudent(id: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('student_id', id)
    .maybeSingle();
    
  if (error) throw error;
  return data;
}

export async function upsertStudent(payload: any) {
  const { data, error } = await supabase
    .from('students')
    .upsert(payload)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function getGrades(studentId: string, course?: string) {
  let query = supabase
    .from('grades')
    .select('*')
    .eq('student_id', studentId);
    
  if (course) {
    query = query.eq('subject', course);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function upsertGrades(studentId: string, items: any[]) {
  const itemsWithId = items.map(item => ({
    ...item,
    student_id: studentId
  }));
  
  const { data, error } = await supabase
    .from('grades')
    .upsert(itemsWithId)
    .select();
    
  if (error) throw error;
  return data;
}

export async function listNews() {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function postNews(payload: any) {
  const { data, error } = await supabase
    .from('news')
    .upsert(payload)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteNews(id: string) {
  const { error } = await supabase
    .from('news')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return true;
}

export async function getComments(studentId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  return data;
}

export async function postComment(payload: { student_id: string; message: string; sender_type: 'student' | 'teacher' }) {
  const { data, error } = await supabase
    .from('comments')
    .insert(payload)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateComment(id: string, message: string) {
  const { data, error } = await supabase
    .from('comments')
    .update({ message })
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteComment(id: string) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return true;
}

export async function markCommentsRead(ids: string[]) {
  const { data, error } = await supabase
    .from('comments')
    .update({ is_read: true })
    .in('id', ids)
    .select();
    
  if (error) throw error;
  return data;
}

export async function getTeachers() {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .order('name', { ascending: true });
    
  if (error) throw error;
  return data;
}

export async function upsertTeacher(payload: any) {
  const { data, error } = await supabase
    .from('teachers')
    .upsert(payload)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteTeacher(id: string) {
  const { error } = await supabase
    .from('teachers')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return true;
}

export async function getSchoolSettings() {
  const { data, error } = await supabase
    .from('school_settings')
    .select('*')
    .maybeSingle();
    
  if (error) throw error;
  return data;
}

export async function registerDeviceToken(payload: { token: string; platform?: string; userId?: string }) {
  const { data, error } = await supabase
    .from('device_tokens')
    .upsert({
      token: payload.token,
      platform: payload.platform || 'web',
      student_id: payload.userId
    }, { onConflict: 'token' })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function uploadFile(file: File, bucketName: string = 'student-photos') {
  // Check if storage is available (handles stub client case)
  if (!supabase.storage) {
    throw new Error("Supabase Storage is not initialized. Check your API keys and network connection.");
  }

  // Sanitize filename to avoid issues
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return { url: data.publicUrl };
}

export async function notifyNews(payload: { title: string; content: string }) {
  const { data, error } = await supabase.functions.invoke('notify-news', {
    body: payload,
  });
  
  if (error) throw error;
  return data;
}

export async function verifyStudentPassword(studentId: string, password: string) {
  const { data, error } = await supabase
    .from('students')
    .select('student_id, password')
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) return { data: null, error };
  if (!data) return { data: null, error: new Error('Student not found') };
  
  if (data.password === password) {
    return { data: true, error: null };
  } else {
    return { data: null, error: new Error('Invalid password') };
  }
}

export default {
  getStudents,
  getStudent,
  upsertStudent,
  getGrades,
  upsertGrades,
  listNews,
  postNews,
  notifyNews,
  deleteNews,
  getTeachers,
  upsertTeacher,
  deleteTeacher,
  getSchoolSettings,
  registerDeviceToken,
  uploadFile,
  getComments,
  postComment,
  updateComment,
  deleteComment,
  markCommentsRead,
  verifyStudentPassword,
};
