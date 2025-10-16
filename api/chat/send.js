// api/chat/send.js
const { jsonbin } = require('../api/_config');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const { user, code, text } = req.body || {};
    if (!user || !user.id) return res.status(400).json({ error: 'user required' });
    if (!code || !text) return res.status(400).json({ error: 'code & text required' });

    const master = await jsonbin.getMaster();
    if (!master || !master.rooms || !master.rooms[code]) return res.status(404).json({ error: 'room not found' });
    const binId = master.rooms[code].binId;
    const room = (await jsonbin.getBin(binId)) || {};
    room.chat = room.chat || [];
    const msg = { id: uuidv4(), userId: user.id, userName: user.name, text, ts: new Date().toISOString() };
    room.chat.push(msg);
    // optionally keep chat length limit (e.g., last 1000)
    if (room.chat.length > 3000) room.chat = room.chat.slice(-3000);
    await jsonbin.putBin(binId, room);
    return res.json({ ok: true, msg });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
};