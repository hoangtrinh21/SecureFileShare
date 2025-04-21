
import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const app = express();
const port = process.env.PORT || 5000;

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientBuildPath = join(__dirname, '../dist/public');

// Middleware
app.use(express.json());
app.use(express.static(clientBuildPath));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/auth/me', (req, res) => {
  // Get user info from headers
  const userId = req.headers['x-replit-user-id'];
  const userName = req.headers['x-replit-user-name'];
  const userRoles = req.headers['x-replit-user-roles'];

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json({
    id: userId,
    name: userName,
    roles: userRoles
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(clientBuildPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
