// api/rooms/join.js
const { jsonbin } = require('../api/_config');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const { user, code } = req.body || {};
    if (!user || !user.id) return res.status(400).json({ error: 'user required' });
    if (!code) return res.status(400).json({ error: 'code required' });
    const master = await jsonbin.getMaster();
    if (!master || !master.rooms || !master.rooms[code]) return res.status(404).json({ error: 'room not found' });
    const binId = master.rooms[code].binId;
    const room = (await jsonbin.getBin(binId)) || {};
    room.players = room.players || [];
    if (!room.players.find(p => p.id === user.id)) {
      room.players.push({ id: user.id, name: user.name, joinedAt: new Date().toISOString(), number: room.players.length + 1, ready: false, isdead: false });
      await jsonbin.putBin(binId, room);
    }
    return res.json({ ok: true, room });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
};