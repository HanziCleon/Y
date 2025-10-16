// api/chat/fetch.js
const { jsonbin } = require('../api/_config');

module.exports = async (req, res) => {
  try {
    const code = req.query.code;
    const since = req.query.since; // optional ISO timestamp
    if (!code) return res.status(400).json({ error: 'code required' });
    const master = await jsonbin.getMaster();
    if (!master || !master.rooms || !master.rooms[code]) return res.status(404).json({ error: 'room not found' });
    const binId = master.rooms[code].binId;
    const room = (await jsonbin.getBin(binId)) || {};
    let chat = room.chat || [];
    if (since) chat = chat.filter(m => new Date(m.ts) > new Date(since));
    return res.json({ room, chat });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
};