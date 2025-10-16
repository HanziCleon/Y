// api/game/state.js
const { jsonbin } = require('../../api/_config');

module.exports = async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: 'code required' });
    const master = await jsonbin.getMaster();
    if (!master || !master.rooms || !master.rooms[code]) return res.status(404).json({ error: 'room not found' });
    const binId = master.rooms[code].binId;
    const room = (await jsonbin.getBin(binId)) || {};
    return res.json({ room });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
};