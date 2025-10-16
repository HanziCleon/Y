// api/game/ready.js
const { jsonbin } = require('../../api/_config');
// We assume werewolf.js is CommonJS and exports roleGenerator + startGame + helper functions.
// You'll need to adapt these function names if your werewolf.js differs.
let ww;
try { ww = require('../../werewolf.js'); } catch(e) { ww = null; }

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const { user, code, ready } = req.body || {};
    if (!user || !user.id) return res.status(400).json({ error: 'user required' });
    if (!code) return res.status(400).json({ error: 'code required' });
    const master = await jsonbin.getMaster();
    if (!master || !master.rooms || !master.rooms[code]) return res.status(404).json({ error: 'room not found' });
    const binId = master.rooms[code].binId;
    const room = (await jsonbin.getBin(binId)) || {};
    room.players = room.players || [];
    const p = room.players.find(x => x.id === user.id);
    if (!p) return res.status(400).json({ error: 'user not in room' });
    p.ready = !!ready;
    await jsonbin.putBin(binId, room);

    // check all ready
    const readyCount = room.players.filter(pl => pl.ready).length;
    const minPlayers = 3; // you can change
    if (room.players.length >= minPlayers && readyCount === room.players.length) {
      // start game: assign roles using werewolf.js if available
      room.status = 'playing';
      room.day = 0;
      room.phase = 'night';
      room.game = room.game || {};
      if (ww && typeof ww.roleGenerator === 'function') {
        try {
          // roleGenerator should assign roles & update room structure
          // we'll call with (room) or (code, room) depending on implementation - try both
          if (ww.roleGenerator.length === 2) {
            await ww.roleGenerator(code, room);
          } else {
            await ww.roleGenerator(room);
          }
        } catch (e) {
          console.warn('roleGenerator error', e.message || e);
        }
      } else {
        // default simple role assignment (example: 1 werewolf if >=3)
        const players = room.players;
        const werewolfCount = Math.max(1, Math.floor(players.length / 4));
        // assign roles: array of role strings
        players.forEach(pl => pl.role = 'villager');
        for (let i = 0; i < werewolfCount; i++) {
          players[i].role = 'werewolf';
        }
      }
      await jsonbin.putBin(binId, room);
    }

    return res.json({ ok: true, room });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
};