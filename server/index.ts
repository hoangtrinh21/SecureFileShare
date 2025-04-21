
import express from 'express';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
const port = process.env.PORT || 5000;

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientBuildPath = join(__dirname, '../dist/public');

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

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(clientBuildPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
