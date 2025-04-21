
import express from 'express';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import { randomBytes } from 'crypto';

const app = express();
const port = process.env.PORT || 5000;

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientBuildPath = join(__dirname, '../client/dist');
const uploadsPath = join(__dirname, '../uploads');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: uploadsPath,
  filename: (req, file, cb) => {
    const uniqueId = randomBytes(8).toString('hex');
    cb(null, `${uniqueId}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// MySQL Connection Pool
const pool = mysql.createPool({
  host: '0.0.0.0',
  user: 'root',
  password: 'your_password',
  database: 'fileshare',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware
app.use(express.json());
app.use(express.static(clientBuildPath));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// File upload endpoint
app.post('/api/files/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const code = randomBytes(4).toString('hex');
    const file = {
      name: req.file.originalname,
      path: req.file.filename,
      size: req.file.size,
      code
    };

    // Store file info in database
    await pool.query(
      'INSERT INTO files (name, path, size, code) VALUES (?, ?, ?, ?)',
      [file.name, file.path, file.size, file.code]
    );

    res.json({ code });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// File download endpoint
app.get('/api/files/:code', async (req, res) => {
  const { code } = req.params;
  
  try {
    const [files] = await pool.query('SELECT * FROM files WHERE code = ?', [code]);
    const file = files[0];
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(join(uploadsPath, file.path), file.name);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(clientBuildPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
