**Migration Audit**

Overview
-
- Purpose: inventory all usages of Supabase in the repository and map them to concrete backend endpoints and migration steps so the project can be decoupled from Supabase progressively.
- Location: `docs/migration-audit.md`

1) Supabase surface in the project
-
- Client creation
  - `src/integrations/supabase/client.ts` — creates the Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

- Edge functions
  - `supabase/functions/notify-news/index.ts` — Deno function that reads `device_tokens` from the DB and sends FCM notifications.

- Storage buckets
  - `student-photos` — used in:
    - `src/components/AdminView.tsx` (upload, getPublicUrl)
    - `src/components/TeacherManagement.tsx` (upload, getPublicUrl)

- Tables referenced (by feature)
  - students: CRUD, metadata parsing (`students.name` tokens), `show_final_grade_letter` fallback
    - components: `AdminView.tsx`, `StudentView.tsx`, `AuthenticatedStudentView.tsx`, `useStudentAuth.ts`
  - grades: insert/upsert, course-prefixed subject packing
    - components: `AdminView.tsx`, `StudentView.tsx`, `AuthenticatedStudentView.tsx`
  - comments: read/insert for student comments
    - components: `AdminView.tsx`, `StudentView.tsx`, `AuthenticatedStudentView.tsx`
  - news: insert/list used by `NewsSection` and `NewsManagement`
  - student_profiles: links auth user to student_id (used in `useStudentAuth`)
  - device_tokens: stores push tokens for `notify-news` edge function and `push.ts`
  - admin_settings, user_roles, teachers

- Realtime channels
  - `students-changes`, `grades-changes`, `comments-changes`, `news-changes`
  - Subscriptions created in `AdminView.tsx`, `AuthenticatedStudentView.tsx`, and other components.

2) Files and locations (quick list)
-
- `src/integrations/supabase/client.ts` — client creation
- `src/integrations/push.ts` — device token registration and push helpers
- `supabase/functions/notify-news/index.ts` — push notification function
- `src/hooks/useStudentAuth.ts` — auth flows using `supabase.auth`
- `src/components/AdminView.tsx` — heavy usage: students, grades, comments, storage upload, realtime channels
- `src/components/AuthenticatedStudentView.tsx` — student portal, grades fetch, realtime channels
- `src/components/StudentView.tsx`, `StudentNotificationPanel.tsx`, `TeacherManagement.tsx`, `NewsManagement.tsx`, `NewsSection.tsx` — various DB + storage calls

3) Behavior & semantics to preserve when replacing Supabase
-
- Auth:
  - signUp (email + password), signIn (password), OAuth via Google
  - session persistence and onAuthStateChange
  - student profile creation linking user_id -> student_id
- Storage:
  - uploads (file picker) and returning public URLs for photos
- DB semantics:
  - grade subject packing (`course|||subject|||outOf` or `subject|||outOf`)
  - show_final_grade_letter column fallback via `students.name` metadata
  - editing-all-grades logic that deletes only grades for a course
- Realtime:
  - push events to admin UI when students/grades/comments/news change
  - subscriptions used for live updates and sounds/notifications
- Edge function:
  - notify-news: iterate `device_tokens` and call FCM; expects service key env var

4) Recommended API endpoint map (implement these on your new backend)
-
-- Students
- GET /api/students?search=&batch=&gender=&course=&limit=&offset=
- GET /api/students/:id  -> includes grades/comments (optionally filter by course)
- POST /api/students     -> create or upsert student (accepts photo URL or signed upload token)
- DELETE /api/students/:id

-- Grades
- GET /api/students/:id/grades?course=
- POST /api/students/:id/grades   -> insert or bulk upsert grades (respect course packing rules)
- DELETE /api/grades/:gradeId

-- Comments
- GET /api/students/:id/comments
- POST /api/students/:id/comments

-- News
- GET /api/news?limit=5
- POST /api/news  -> triggers notification job (server-side)

-- Auth / Profiles
- POST /api/auth/signup  (email, password, studentId) -> create user and student_profiles entry
- POST /api/auth/signin
- POST /api/auth/signout
- GET  /api/auth/session

-- Device tokens / Notifications
- POST /api/device-tokens  -> register token (for notify-news)
- POST /api/notify/news     -> server endpoint to send FCM notifications (replaces edge function)

-- Uploads
- POST /api/uploads/sign   -> returns signed PUT URL for S3-compatible storage

-- Realtime
- WebSocket endpoint or Server-Sent-Events at /api/realtime
  - Events: students:created/updated/deleted, grades:created/updated/deleted, comments:created, news:created

5) Migration plan (phased)
-
Phase 0 — preparation
- Backup DB and storage. Export SQL dump and storage assets.
- Keep Supabase running while migrating.

Phase 1 — API scaffold & mappings (low-risk)
- Implement backend endpoints above using Node + Express/Fastify + `pg`.
- Implement `POST /api/uploads/sign` with S3 (or minio) and test upload flow from AdminView.
- Implement `POST /api/notify/news` to call FCM and optionally maintain `device_tokens`.

Phase 2 — Frontend integration layer
- Add `src/integrations/apiClient.ts` that exposes the same logical operations used now (getStudents, upsertStudent, uploadSign, signIn, signUp, getNews, postNews, registerToken).
- Replace calls component-by-component, starting with less critical views (News, TeacherManagement), then AdminView, StudentAuth (auth is sensitive), Student portal.

Phase 3 — Data & storage migration
- Migrate `student-photos` from Supabase storage to S3; update DB photo URLs (or continue to proxy via server). Keep both storage buckets accessible until cutover.
- Migrate `students.course` metadata into real `students.course` column (I added migration scripts for this earlier). Run SQL or Node migrate script.

Phase 4 — Realtime replacement
- Add WS server endpoints; update frontend optimistic flows to use WS subscriptions.

Phase 5 — Cutover and cleanup
- Switch env vars to point to new backend; remove supabase-js usage; delete `supabase` project if desired.

6) Priority task list (short-term)
-
1. Create `migration-audit.md` (this file) — done.
2. Scaffold minimal backend with students/grades/news endpoints and upload signing.
3. Implement `src/integrations/apiClient.ts` to provide a drop-in replacement surface.
4. Migrate `students.course` metadata into `course` column (run SQL or Node script) and verify.
5. Migrate storage and switch photo URLs.
6. Replace auth (or keep Supabase Auth while migrating other parts).

7) Risks & recommendations
-
- Replace Auth last or keep Supabase Auth temporarily to avoid account migration complexity.
- Realtime and background notification are the trickiest parts — consider using a managed pub/sub (Pusher, Ably) initially.
- Keep migrations idempotent and test on a copy of your DB.

8) Next steps I can implement for you
-
- I can scaffold the minimal backend and produce `src/integrations/apiClient.ts` with example usage.
- I can create the data migration scripts (SQL + Node dry-run) and a safe runbook.
- I can help replace Auth flows (migrate accounts) if you choose to move off Supabase Auth.

---
Generated: 2025-12-07
