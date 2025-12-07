# BHTC Portal Backend (Scaffold)

This is a minimal scaffold backend to help migrate away from Supabase during development. It uses an on-disk JSON store for persistence and serves uploaded files from `server/uploads`.

Quick start (PowerShell):

```powershell
cd server
npm install
npm run dev
```

The server runs on `http://localhost:5000` by default.

Notes:
- This is a development scaffold only. Replace with a production-ready backend and proper database / storage before going to production.
- The `news` endpoint does not send FCM notifications; implement that in a real service.
