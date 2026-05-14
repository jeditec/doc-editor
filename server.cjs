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
    category TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS categories (
    name TEXT PRIMARY KEY
  );
  CREATE INDEX IF NOT EXISTS idx_category ON documents(category);
  CREATE INDEX IF NOT EXISTS idx_updated ON documents(updated_at DESC);

  -- Seed known categories
  INSERT OR IGNORE INTO categories (name) VALUES ('to-do'), ('personal'), ('misc');

  -- Version history table
  CREATE TABLE IF NOT EXISTS document_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id)
  );
  CREATE INDEX IF NOT EXISTS idx_versions_doc ON document_versions(document_id);
`);

// Migrate old tables: change 'general' category to NULL for existing docs
const tableInfo = db.prepare('PRAGMA table_info(documents)').all();
const categoryCol = tableInfo.find(c => c.name === 'category');
if (categoryCol && categoryCol.dflt_value !== 'NULL') {
  db.exec(`
    CREATE TABLE documents_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT 'Untitled Document',
      content TEXT NOT NULL DEFAULT '',
      category TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.exec(`INSERT INTO documents_new SELECT * FROM documents;`);
  db.exec(`DROP TABLE documents;`);
  db.exec(`ALTER TABLE documents_new RENAME TO documents;`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_category ON documents(category);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_updated ON documents(updated_at DESC);`);
  console.log('🔄 Migrated database: category now allows NULL');
}

// Security headers (CSP)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';"
  );
  next();
});

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.set('Cache-Control', 'no-store');
  }
  next();
});

// API routes are defined here — don't serve static files for them

// Serve Vue build (or public for backwards compat)
const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(distPath)) {
  app.use('/assets', express.static(path.join(distPath, 'assets')));
} else if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// SPA fallback: serve index.html for any non-API, non-static route
app.get(/^(?!\/api\b|\/assets)/, (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Debug logging
app.use((req, res, next) => {
  if (req.method === 'PUT' && req.path.startsWith('/api/documents/')) {
    console.log('📥 PUT /api/documents/:id', req.body);
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

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
  const cat = category || null;
  const stmt = db.prepare(
    'INSERT INTO documents (title, content, category) VALUES (?, ?, ?)'
  );
  const result = stmt.run(
    title || 'Untitled Document',
    content || '',
    cat
  );
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(doc);
});

// Update document (with optional version save) — PATCH-style: only fields present in the body are updated
app.put('/api/documents/:id', (req, res) => {
  const { title, content, category, save_version } = req.body;
  const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Document not found' });

  // Build dynamic SET clause — only update fields that were explicitly provided
  const updates = [];
  const params = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (content !== undefined) {
    updates.push('content = ?');
    params.push(content);
  }
  if (category !== undefined) {
    updates.push('category = ?');
    params.push(category === '' ? null : capitalizeCat(category));
  }

  // If nothing to update, return existing document
  if (updates.length === 0) {
    return res.json(existing);
  }

  // Check if actual content changed (for version save)
  const actualTitle = title !== undefined ? title : existing.title;
  const actualContent = content !== undefined ? content : existing.content;
  const actualCategory = category !== undefined ? (category === '' ? null : capitalizeCat(category)) : existing.category;

  // If save_version is true and something changed, save current state first
  if (save_version === true && (actualTitle !== existing.title || actualContent !== existing.content || actualCategory !== existing.category)) {
    db.prepare(
      'INSERT INTO document_versions (document_id, title, content, category) VALUES (?, ?, ?, ?)'
    ).run(
      existing.id,
      existing.title,
      existing.content,
      existing.category
    );

    // Prune old versions (keep max 50)
    db.prepare(`
      DELETE FROM document_versions WHERE id NOT IN (
        SELECT id FROM document_versions
        WHERE document_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      )
    `).run(existing.id);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);

  db.prepare(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  res.json(doc);
});

// PATCH endpoint — truly partial update (only provided fields change; empty string means "set to NULL")
app.patch('/api/documents/:id', (req, res) => {
  const { title, content, category } = req.body;
  const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Document not found' });

  const updates = [];
  const params = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (content !== undefined) {
    updates.push('content = ?');
    params.push(content);
  }
  if (category !== undefined) {
    updates.push('category = ?');
    // Empty string -> NULL; any other value -> capitalized
    params.push(category === '' ? null : capitalizeCat(category));
  }

  if (updates.length === 0) {
    return res.json(existing);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);

  db.prepare(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  res.json(doc);
});

// Save a version manually (without updating the document)
app.post('/api/documents/:id/save-version', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  db.prepare(
    'INSERT INTO document_versions (document_id, title, content, category) VALUES (?, ?, ?, ?)'
  ).run(
    doc.id,
    doc.title,
    doc.content,
    doc.category
  );

  // Prune old versions (keep max 50)
  db.prepare(`
    DELETE FROM document_versions WHERE id NOT IN (
      SELECT id FROM document_versions 
      WHERE document_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    )
  `).run(doc.id);

  const versions = db.prepare(
    'SELECT * FROM document_versions WHERE document_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.params.id);

  res.json({ ok: true, versions });
});

// Restore a version
app.post('/api/documents/:id/restore/:version_id', (req, res) => {
  const version = db.prepare('SELECT * FROM document_versions WHERE id = ?').get(req.params.version_id);
  if (!version) return res.status(404).json({ error: 'Version not found' });

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  db.prepare(
    'UPDATE documents SET title = ?, content = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(version.title, version.content, version.category, doc.id);

  const updatedDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  res.json(updatedDoc);
});

// Delete document
app.delete('/api/documents/:id', (req, res) => {
  // Delete versions first
  db.prepare('DELETE FROM document_versions WHERE document_id = ?').run(req.params.id);
  
  const result = db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Document not found' });

  res.json({ ok: true });
});

// Get versions for a document
app.get('/api/documents/:id/versions', (req, res) => {
  const versions = db.prepare(
    'SELECT * FROM document_versions WHERE document_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.params.id);
  res.json(versions);
});

// Helper to capitalize a category name
function capitalizeCat(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Get categories (sorted alphabetically, capitalized)
app.get('/api/categories', (req, res) => {
  const rows = db.prepare("SELECT name FROM categories ORDER BY name ASC").all();
  res.json(rows.map(r => capitalizeCat(r.name)));
});

// Create a new category (capitalized)
app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name required' });
  const cat = capitalizeCat(name.trim());
  const existing = db.prepare("SELECT name FROM categories WHERE name = ?").get(cat);
  if (existing) return res.status(200).json({ ok: true, created: false });
  db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)").run(cat);
  res.json({ ok: true, created: true });
});

// Delete a category (set documents category to NULL)
app.delete('/api/categories/:name', (req, res) => {
  const catInput = capitalizeCat(req.params.name);
  // Never allow deleting General
  if (catInput.toLowerCase() === 'general') {
    return res.status(400).json({ error: 'Cannot delete the General category' });
  }
  // Get the stored name (case-insensitive)
  const stored = db.prepare('SELECT name FROM categories WHERE LOWER(name) = LOWER(?)').get(catInput);
  if (!stored) {
    return res.status(404).json({ error: 'Category not found' });
  }
  const catToDelete = stored.name;
  // Set all documents in this category to NULL (shown in "All")
  db.prepare('UPDATE documents SET category = NULL WHERE LOWER(category) = LOWER(?)').run(catToDelete);
  // Delete the category
  const result = db.prepare('DELETE FROM categories WHERE LOWER(name) = LOWER(?)').run(catToDelete);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json({ ok: true });
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

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
