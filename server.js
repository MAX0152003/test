import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// In Cloud Run multi-container setups, nginx-container listens on port 8080 and reverse-proxies
// to app-container on port 3000. When Cloud Run sets PORT=8080 globally, the app container
// must bind to port 3000 to avoid conflicting with nginx on 8080.
const PORT = (process.env.PORT && process.env.PORT !== '8080')
  ? Number(process.env.PORT)
  : 3000;

const distDir = path.join(__dirname, 'dist');
const indexPath = path.join(distDir, 'index.html');

// Lightweight health check endpoints for Cloud Run TCP/HTTP probes & reverse proxies
app.get(['/health', '/__health', '/ping'], (req, res) => {
  res.status(200).send('OK');
});

app.head(['/health', '/__health', '/ping'], (req, res) => {
  res.status(200).end();
});

// Serve static assets from dist
app.use(express.static(distDir, {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// SPA Fallback: all non-file GET / HEAD routes return index.html
app.get('*', (req, res) => {
  if (fs.existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(indexPath);
  } else {
    res.status(503).send('Application is building, please refresh in a few moments.');
  }
});

app.head('*', (req, res) => {
  if (fs.existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).end();
  } else {
    res.status(503).end();
  }
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`ClassPulse 2.0 server listening on http://0.0.0.0:${PORT}`);
});

// Recommended Keep-Alive settings for Google Cloud Run load balancers to avoid 502 connection resets
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Graceful termination
const shutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down ClassPulse server gracefully...`);
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

