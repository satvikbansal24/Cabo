import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRouter } from './auth.js';
import { attachSocket } from './socket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
// Only needed when the client is served from a different origin than the API
// (e.g. local dev with separate Vite/Express ports). When the client is
// served by this same process (the production build), requests are
// same-origin and this can be left unset.
const CORS_ORIGIN = process.env.CORS_ORIGIN || true;

const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.use('/api', authRouter);
app.get('/api/health', (req, res) => res.json({ ok: true }));

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

const httpServer = http.createServer(app);
attachSocket(httpServer, CORS_ORIGIN);

httpServer.listen(PORT, () => {
  console.log(`Cabo server listening on port ${PORT}`);
});
