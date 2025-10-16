// CommonJS server.js - single-file Node + Express + Socket.IO backend
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

// Load env (if using .env locally)
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hanzgantengno1@gmail.com';

// --- Simple in-memory maps (primary runtime store) ---
const users = new Map(); // userId -> { id, email, name, picture, isAdmin }
const rooms = new Map(); // roomCode -> roomState

// JSONBin helper class
class JSONBinStorage {
  constructor(masterBinId, masterApiKey) {
    this.masterBinId = masterBinId;
    this.masterApiKey = masterApiKey;
    this.apiBase = 'https://api.jsonbin.io/v3/b';
    // Note: this implementation expects v3 JSONBin. Adjust headers if using other endpoints.
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Master-Key': this.masterApiKey
    };
  }

  async getMaster() {
    if (!this.masterBinId || !this.masterApiKey) return null;
    try {
      const res = await axios.get(`${this.apiBase}/${this.masterBinId}/latest`, {
        headers: this.getHeaders()
      });
      return res.data && res.data.record ? res.data.record : null;
    } catch (e) {
      console.error('JSONBin getMaster error', e?.response?.data || e.message);
      return null;
    }
  }

  async updateMaster(payload) {
    if (!this.masterBinId || !this.masterApiKey) return null;
    try {
      const res = await axios.put(`${this.apiBase}/${this.masterBinId}`, payload, {
        headers: this.getHeaders()
      });
      return res.data;
    } catch (e) {
      console.error('JSONBin updateMaster error', e?.response?.data || e.message);
      return null;
    }
  }

  // Save metadata for a room inside master.bin.rooms -> rooms[code] = meta
  async saveRoomMeta(code, meta) {
    const master = (await this.getMaster()) || { credentials: [], rooms: {} };
    master.rooms = master.rooms || {};
    master.rooms[code] = meta;
    await this.updateMaster(master);
  }

  async deleteRoomMeta(code) {
    const master = (await this.getMaster()) || { credentials: [], rooms: {} };
    if (master.rooms && master.rooms[code]) delete master.rooms[code];
    await this.updateMaster(master);
  }
}

const storage = new JSONBinStorage(process.env.MASTER_BIN_ID, process.env.MASTER_API_KEY);

// --- Express setup ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Utilities
function makeRoomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < 6; i++) res += chars[Math.floor(Math.random() * chars.length)];
  return res;
}

function createUserRecord({ email, name, picture }) {
  const id = uuidv4();
  const isAdmin = email === ADMIN_EMAIL;
  const user = { id, email, name, picture, isAdmin };
  users.set(id, user);
  return user;
}

// --- Simple auth endpoint (client sends profile after Google sign-in) ---
app.post('/api/auth/google', (req, res) => {
  const { email, name, picture } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  // If user exists by email, return same id
  for (const u of users.values()) {
    if (u.email === email) return res.json({ user: u });
  }
  const user = createUserRecord({ email, name, picture });
  return res.json({ user });
});

// --- Rooms REST ---
app.get('/api/rooms', (req, res) => {
  const list = Array.from(rooms.values()).map(r => ({
    code: r.code,
    owner: r.ownerName,
    players: r.players.length,
    status: r.status
  }));
  res.json({ rooms: list });
});

app.post('/api/room/create', async (req, res) => {
  const { userId, roomName } = req.body;
  const user = users.get(userId);
  if (!user) return res.status(401).json({ error: 'unauthenticated' });

  // enforce per-user server creation limit (3) except admin
  const maxRooms = user.isAdmin ? Infinity : 3;
  const userRooms = Array.from(rooms.values()).filter(r => r.ownerId === userId).length;
  if (userRooms >= maxRooms && !user.isAdmin) {
    return res.status(403).json({ error: 'limit reached' });
  }

  let code;
  do { code = makeRoomCode(); } while (rooms.has(code));
  const room = {
    code,
    name: roomName || 'Untitled Room',
    ownerId: userId,
    ownerName: user.name,
    players: [],
    createdAt: new Date().toISOString(),
    status: 'waiting',
    iswin: null,
    finishedAt: null
  };
  rooms.set(code, room);

  // save meta to JSONBin master
  try { await storage.saveRoomMeta(code, { owner: userId, ownerName: user.name, createdAt: room.createdAt, status: room.status }); } catch (e) { /* ignore */ }

  res.json({ room });
});

app.post('/api/room/delete', async (req, res) => {
  const { userId, code } = req.body;
  const user = users.get(userId);
  if (!user) return res.status(401).json({ error: 'unauthenticated' });
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'not found' });
  if (room.ownerId !== userId && !user.isAdmin) return res.status(403).json({ error: 'not allowed' });
  rooms.delete(code);
  try { await storage.deleteRoomMeta(code); } catch (e) { /* ignore */ }
  res.json({ ok: true });
});

// moderation/report endpoint (admin-only)
app.post('/api/report', (req, res) => {
  const { userId, code, message } = req.body;
  const user = users.get(userId);
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'not allowed' });
  // For now, just log; a real app should persist reports
  console.log('REPORT', { by: user.email, code, message });
  res.json({ ok: true });
});

// --- Socket.IO real-time chat + simple room join flow ---
io.on('connection', socket => {
  // attach meta
  socket.data = {};

  socket.on('auth', (payload, cb) => {
    // payload: { userId }
    if (!payload || !payload.userId) return cb && cb({ error: 'no userId' });
    const user = users.get(payload.userId);
    if (!user) return cb && cb({ error: 'invalid user' });
    socket.data.user = user;
    return cb && cb({ ok: true, user });
  });

  socket.on('room:join', (payload, cb) => {
    // payload: { code }
    const { code } = payload || {};
    const room = rooms.get(code);
    if (!room) return cb && cb({ error: 'room not found' });
    const user = socket.data.user;
    if (!user) return cb && cb({ error: 'not authed' });

    // add player if not present
    if (!room.players.find(p => p.id === user.id)) {
      const player = { id: user.id, name: user.name, isdead: false, number: room.players.length + 1 };
      room.players.push(player);
    }

    socket.join(code);
    socket.data.room = code;

    io.to(code).emit('room:update', { room: sanitizeRoom(room) });
    cb && cb({ ok: true, room: sanitizeRoom(room) });
  });

  socket.on('chat:message', (payload, cb) => {
    // payload: { code, text }
    const { code, text } = payload || {};
    const user = socket.data.user;
    if (!user) return cb && cb({ error: 'not authed' });
    if (!rooms.has(code)) return cb && cb({ error: 'no room' });
    const m = { id: uuidv4(), userId: user.id, userName: user.name, text, ts: new Date().toISOString() };
    // broadcast
    io.to(code).emit('chat:message', m);
    cb && cb({ ok: true });
  });

  socket.on('disconnect', () => {
    const code = socket.data.room;
    const user = socket.data.user;
    if (code && rooms.has(code) && user) {
      const room = rooms.get(code);
      // remove player session only if no other sockets from same user remain in room
      // (simpler approach: keep players until manual leave or GC)
      io.to(code).emit('room:update', { room: sanitizeRoom(room) });
    }
  });
});

// basic sanitize for sending room (avoid circular large data)
function sanitizeRoom(room) {
  return {
    code: room.code,
    name: room.name,
    ownerName: room.ownerName,
    players: room.players.map(p => ({ id: p.id, name: p.name, number: p.number, isdead: !!p.isdead })),
    status: room.status,
    createdAt: room.createdAt,
    iswin: room.iswin,
    finishedAt: room.finishedAt
  };
}

// --- Game end helper: set finishedAt when iswin is set ---
function markRoomFinished(room, reason) {
  room.iswin = reason || true;
  room.finishedAt = new Date().toISOString();
  room.status = 'finished';
  // persist meta
  storage.saveRoomMeta(room.code, { owner: room.ownerId, ownerName: room.ownerName, createdAt: room.createdAt, status: room.status, finishedAt: room.finishedAt }).catch(()=>{});
}

// --- Garbage collector for rooms: remove empty or idle rooms ---
const ROOM_IDLE_MS = 24 * 60 * 60 * 1000; // 24 hours
setInterval(async () => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (!room.players || room.players.length === 0) {
      rooms.delete(code);
      try { await storage.deleteRoomMeta(code); } catch(e){}
      console.log(`Garbage deleted empty room ${code}`);
      continue;
    }
    if (room.iswin !== null && room.finishedAt) {
      if (now - new Date(room.finishedAt).getTime() > 60 * 60 * 1000) {
        rooms.delete(code);
        try { await storage.deleteRoomMeta(code); } catch(e){}
        console.log(`Garbage deleted finished room ${code}`);
      }
    }
    if (room.createdAt && (now - new Date(room.createdAt).getTime() > ROOM_IDLE_MS)) {
      rooms.delete(code);
      try { await storage.deleteRoomMeta(code); } catch(e){}
      console.log(`Garbage deleted idle room ${code}`);
    }
  }
}, 10 * 60 * 1000);

// --- Start server ---
server.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});