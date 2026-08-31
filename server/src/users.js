import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function load() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function save(users) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

let users = load();

export function findByUsername(username) {
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export function findById(id) {
  return users.find((u) => u.id === id);
}

export async function createUser(username, password) {
  if (findByUsername(username)) {
    throw new Error('Username already taken');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: nanoid(10), username, passwordHash };
  users.push(user);
  save(users);
  return user;
}

export async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.passwordHash);
}
