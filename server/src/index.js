const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson } = require('./data-store');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '5mb' }));

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Simple data initialization
const students = readJson('students', []);
const grades = readJson('grades', []);
const news = readJson('news', []);
const device_tokens = readJson('device_tokens', []);
const teachers = readJson('teachers', []);

function saveAll() {
  writeJson('students', students);
  writeJson('grades', grades);
  writeJson('news', news);
  writeJson('device_tokens', device_tokens);
}

// Static serving for uploaded files
app.use('/uploads', express.static(uploadDir));

// Students
app.get('/api/students', (req, res) => {
  const { search, course } = req.query;
  let out = students.slice();
  if (course) out = out.filter(s => (s.course || '').toLowerCase() === (course || '').toLowerCase());
  if (search) out = out.filter(s => (s.name || '').toLowerCase().includes(search.toLowerCase()));
  res.json({ data: out });
});

app.get('/api/students/:id', (req, res) => {
  const s = students.find(x => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  const studentGrades = grades.filter(g => g.studentId === s.id);
  const studentComments = (s.comments || []);
  res.json({ data: { ...s, grades: studentGrades, comments: studentComments } });
});

app.post('/api/students', (req, res) => {
  const body = req.body || {};
  const id = body.id || uuidv4();
  const existing = students.findIndex(s => s.id === id);
  const obj = { id, name: body.name || '', course: body.course || '', photoUrl: body.photoUrl || '', meta: body.meta || {} };
  if (existing >= 0) students[existing] = { ...students[existing], ...obj };
  else students.push(obj);
  saveAll();
  res.json({ data: obj });
});

// Grades - simple add / bulk upsert
app.get('/api/students/:id/grades', (req, res) => {
  const studentId = req.params.id;
  const course = req.query.course;
  let out = grades.filter(g => g.studentId === studentId);
  if (course) out = out.filter(g => (g.course || '').toLowerCase() === course.toLowerCase());
  res.json({ data: out });
});

app.post('/api/students/:id/grades', (req, res) => {
  const studentId = req.params.id;
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const created = [];
  for (const it of items) {
    const g = { id: uuidv4(), studentId, subject: it.subject || '', grade: it.grade ?? null, outOf: it.outOf ?? null, course: it.course || '' };
    grades.push(g);
    created.push(g);
  }
  saveAll();
  res.json({ data: created });
});

// News
app.get('/api/news', (req, res) => {
  const out = news.slice().sort((a,b) => new Date(b.published_at) - new Date(a.published_at));
  res.json({ data: out });
});

app.post('/api/news', (req, res) => {
  const body = req.body || {};
  const n = { id: uuidv4(), title: body.title || '', body: body.body || '', published_at: new Date().toISOString(), imageUrl: body.imageUrl || '' };
  news.push(n);
  saveAll();
  // NOTE: This scaffold does not send FCM; real impl should enqueue or call FCM here.
  res.json({ data: n });
});

  app.delete('/api/news/:id', (req, res) => {
    const id = req.params.id;
    const idx = news.findIndex(n => n.id === id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });
    news.splice(idx, 1);
    saveAll();
    res.json({ data: { ok: true } });
  });

  // Teachers
  app.get('/api/teachers', (req, res) => {
    const out = teachers.slice().sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    res.json({ data: out });
  });

  app.post('/api/teachers', (req, res) => {
    const body = req.body || {};
    const id = body.id || uuidv4();
    const idx = teachers.findIndex(t => t.id === id);
    const obj = { id, name: body.name || '', phone: body.phone || '', subject: body.subject || '', photo_url: body.photo_url || '', telegram: body.telegram || '' };
    if (idx >= 0) teachers[idx] = { ...teachers[idx], ...obj };
    else teachers.push(obj);
    saveAll();
    res.json({ data: obj });
  });

  app.delete('/api/teachers/:id', (req, res) => {
    const id = req.params.id;
    const idx = teachers.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });
    teachers.splice(idx, 1);
    saveAll();
    res.json({ data: { ok: true } });
  });

// Device tokens
app.post('/api/device-tokens', (req, res) => {
  const { token, platform, userId } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });
  const exists = device_tokens.find(d => d.token === token);
  if (!exists) device_tokens.push({ id: uuidv4(), token, platform: platform || '', userId: userId || '', created_at: new Date().toISOString() });
  saveAll();
  res.json({ data: { ok: true } });
});

// Uploads - accept multipart and return public URL
app.post('/api/uploads', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ data: { url } });
});

// Simple health
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Backend scaffold listening on http://localhost:${PORT}`);
});
