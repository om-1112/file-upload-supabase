require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 🔑 Connect to Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 📂 SQLite for metadata
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));
db.run(`CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT,
  filename TEXT,
  storage_path TEXT,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

const app = express();
app.use(cors());
app.use(express.static('public'));

// 📤 Upload setup
const upload = multer({ storage: multer.memoryStorage() }); // memory since we push to Supabase

// 📤 Upload route
app.post('/upload', upload.single('file'), async (req, res) => {
  const { product_id } = req.body;
  const file = req.file;

  if (!file || !product_id) {
    return res.status(400).json({ msg: 'File and Application Code required' });
  }

  // Upload to Supabase Storage
  const uniqueName = Date.now() + "_" + file.originalname;
  const { error } = await supabase.storage.from('files').upload(uniqueName, file.buffer, {
    contentType: file.mimetype
  });

  if (error) return res.status(500).json({ msg: 'Supabase upload failed', error });

  // Save metadata
  db.run("INSERT INTO files (product_id, filename, storage_path) VALUES (?, ?, ?)",
    [product_id, file.originalname, uniqueName],
    function(err) {
      if (err) return res.status(500).json({ msg: 'DB error' });
      res.json({ msg: 'File uploaded successfully', file_id: this.lastID });
    }
  );
});

// 🔍 Search route
app.get('/search', (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ msg: 'Query required' });

  db.all("SELECT * FROM files WHERE product_id = ?", [q], (err, rows) => {
    if (err) return res.status(500).json({ msg: 'DB error' });
    res.json({ results: rows });
  });
});

// 📥 Download route (signed URL)
app.get('/download/:id', async (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM files WHERE id = ?", [id], async (err, row) => {
    if (err || !row) return res.status(404).send('File not found');

    // Generate signed URL valid for 1 hour
    const { data, error } = await supabase.storage.from('files')
      .createSignedUrl(row.storage_path, 60 * 60);

    if (error) return res.status(500).json({ msg: 'Error creating signed URL' });

    res.json({ downloadUrl: data.signedUrl });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
