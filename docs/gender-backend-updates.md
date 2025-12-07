# Gender Field Backend Updates

## Schema addition
```sql
-- Add gender column to students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('Male', 'Female'));
```

## Grade POST handler snippet
```ts
import type { Request, Response } from 'express';
import { supabaseClient } from '../supabase/client';

export const saveGrades = async (req: Request, res: Response) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { studentId, name, batchNumber, gender, subjects } = req.body;

  if (!studentId || !name || !gender) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const fullName = batchNumber ? `${name}|||${batchNumber}` : name;

  const { error: studentError } = await supabaseClient
    .from('students')
    .upsert({
      student_id: studentId.toUpperCase(),
      name: fullName,
      gender,
    }, { onConflict: 'student_id' });

  if (studentError) {
    return res.status(500).json({ error: studentError.message });
  }

  const formattedGrades = subjects.map((subject: any) => ({
    student_id: studentId.toUpperCase(),
    subject: subject.outOf ? `${subject.name}|||${subject.outOf}` : subject.name,
    grade: Number(subject.grade),
  }));

  const { error: gradeError } = await supabaseClient
    .from('grades')
    .upsert(formattedGrades, { onConflict: 'student_id,subject' });

  if (gradeError) {
    return res.status(500).json({ error: gradeError.message });
  }

  return res.status(200).json({ ok: true });
};
```

## Filtered fetch request helper
```ts
import { fetchStudentsWithFilters } from '@/lib/studentApi';

const loadStudents = async () => {
  const students = await fetchStudentsWithFilters({
    batchNumber: selectedBatch,
    gradeFilter: selectedGrade,
    genderFilter: selectedGender,
  });

  setStudents(students);
};
```
