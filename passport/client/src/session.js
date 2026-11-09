import { io } from 'socket.io-client';

// Two tokens per browser: one for playing and one for hosting, so the same
// laptop can run the TV dashboard in one tab and play in another. The server
// derives the public id from the token, so ids in the room state can't be
// used to act as someone else.
//
// Which role a tab is in comes from its URL: ?host=CODE is a dashboard,
// ?room=CODE is a player. That way a reload puts each tab back where it was.
const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: works for this tab only */
  }
};

function token(key) {
  let t = read(key, null);
  if (!t) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    t = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    write(key, t);
  }
  return t;
}

export const session = {
  playerToken: token('passport.token'),
  hostToken: token('passport.hostToken'),
  get profile() {
    return read('passport.profile', { name: '', country: '' });
  },
  set profile(p) {
    write('passport.profile', p);
  },
  // { code, role: 'host' | 'player' } from the URL, or null.
  get place() {
    const q = new URLSearchParams(window.location.search);
    if (q.get('host')) return { code: q.get('host').toUpperCase(), role: 'host' };
    if (q.get('room') && q.get('play') === '1') return { code: q.get('room').toUpperCase(), role: 'player' };
    return null;
  },
  set place(p) {
    const url = !p ? window.location.pathname : p.role === 'host' ? `?host=${p.code}` : `?room=${p.code}&play=1`;
    window.history.replaceState(null, '', url);
  },
  // A ?room=CODE link without play=1 is an invite: prefill the join form.
  get inviteCode() {
    const q = new URLSearchParams(window.location.search);
    return q.get('play') ? '' : (q.get('room') || '').toUpperCase();
  },
};

export const socket = io('/', { transports: ['websocket', 'polling'] });

export function emit(event, payload) {
  return new Promise((resolve) => {
    socket.timeout(8000).emit(event, payload, (err, res) => {
      resolve(err ? { ok: false, error: 'The server didn’t respond. Check your connection.' } : res);
    });
  });
}

export const act = (action, args = {}) => emit('room:action', { action, ...args });

export function inviteUrl(code) {
  return `${window.location.origin}/?room=${code}`;
}
