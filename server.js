const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8040;

// Setup database
const dbDir = process.env.DOC_DB_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(path.join(dbDir, 'docs.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Untitled Document',
    content TEXT NOT NULL DEFAULT '',
    category TEXT DEFAULT 'general',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_category ON documents(category);
  CREATE INDEX IF NOT EXISTS idx_updated ON documents(updated_at DESC);
`);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- API Routes ----

// List documents (with optional filter)
app.get('/api/documents', (req, res) => {
  const { category, search } = req.query;
  let sql = 'SELECT * FROM documents';
  const conditions = [];
  const params = [];

  if (category && category !== 'all') {
    conditions.push('category = ?');
    params.push(category);
  }
  if (search) {
    conditions.push('(title LIKE ? OR content LIKE ?)');
    const likeSearch = `%${search}%`;
    params.push(likeSearch, likeSearch);
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY updated_at DESC';

  const docs = db.prepare(sql).all(...params);
  res.json(docs);
});

// Get single document
app.get('/api/documents/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

// Create document
app.post('/api/documents', (req, res) => {
  const { title, content, category } = req.body;
  const stmt = db.prepare(
    'INSERT INTO documents (title, content, category) VALUES (?, ?, ?)'
  );
  const result = stmt.run(
    title || 'Untitled Document',
    content || '',
    category || 'general'
  );
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(doc);
});

// Update document
app.put('/api/documents/:id', (req, res) => {
  const { title, content, category } = req.body;
  const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Document not found' });

  db.prepare(
    'UPDATE documents SET title = COALESCE(?, title), content = COALESCE(?, content), category = COALESCE(?, category), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(
    title ?? existing.title,
    content ?? existing.content,
    category ?? existing.category,
    req.params.id
  );

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  res.json(doc);
});

// Delete document
app.delete('/api/documents/:id', (req, res) => {
  const result = db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Document not found' });
  res.json({ ok: true });
});

// Get categories
app.get('/api/categories', (req, res) => {
  const rows = db.prepare("SELECT DISTINCT category FROM documents ORDER BY category").all();
  res.json(rows.map(r => r.category));
});

// Export all documents
app.get('/api/export', (req, res) => {
  const docs = db.prepare('SELECT * FROM documents ORDER BY updated_at DESC').all();
  res.json(docs);
});

app.listen(PORT, () => {
  console.log(`📝 Doc Editor running at http://localhost:${PORT}`);
  console.log(`📁 Database: ${path.join(dbDir, 'docs.db')}`);
});
