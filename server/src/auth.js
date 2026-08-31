import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { createUser, findByUsername, verifyPassword } from './users.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-20 characters: letters, numbers, underscore' });
    }
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const user = await createUser(username, password);
    const token = signToken(user);
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const user = findByUsername(username);
  if (!user || !(await verifyPassword(user, password))) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = signToken(user);
  res.json({ token, user: { id: user.id, username: user.username } });
});

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

authRouter.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});
