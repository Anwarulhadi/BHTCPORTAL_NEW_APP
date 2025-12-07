#!/usr/bin/env node
/**
 * Migration script: add `course` column to `students` and migrate embedded
 * `course=` tokens from `name` into the new column. Also removes the
 * embedded token from `name` after migrating.
 *
 * Usage:
 *  - Set `DATABASE_URL` env var to your Postgres connection string (Supabase)
 *  - Run: `node ./scripts/migrate-course.js`
 *
 * WARNING: This script modifies data. Review and backup your DB before running.
 */

import pg from 'pg';

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: Please set the DATABASE_URL environment variable (Postgres connection string).');
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

function extractCourseFromName(name) {
  if (!name) return null;
  const m = name.match(/course=([^|]+)/i);
  if (!m) return null;
  return m[1].trim().toLowerCase();
}

function removeCourseTokenFromName(name) {
  if (!name) return name;
  return name.replace(/\|\|\|course=[^|]+/i, '').trim();
}

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB');

    console.log('Starting transaction');
    await client.query('BEGIN');

    console.log('Ensuring column `course` exists');
    await client.query(`ALTER TABLE public.students ADD COLUMN IF NOT EXISTS course text;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_students_course ON public.students ((lower(course)));`);

    console.log('Selecting students for migration');
    const res = await client.query(`SELECT student_id, name FROM public.students;`);
    console.log(`Found ${res.rowCount} students`);

    let migrated = 0;
    for (const row of res.rows) {
      const course = extractCourseFromName(row.name || '');
      if (course) {
        const newName = removeCourseTokenFromName(row.name || '');
        await client.query(`UPDATE public.students SET course = $1, name = $2 WHERE student_id = $3`, [course, newName, row.student_id]);
        migrated += 1;
        console.log(`Migrated ${row.student_id} -> ${course}`);
      }
    }

    await client.query('COMMIT');
    console.log(`Migration complete. Migrated ${migrated} students.`);
  } catch (err) {
    console.error('Migration failed, rolling back:', err);
    try { await client.query('ROLLBACK'); } catch (e) { console.error('Rollback failed', e); }
    process.exit(1);
  } finally {
    await client.end();
    console.log('Connection closed');
  }
}

run();
