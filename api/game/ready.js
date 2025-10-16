// api/game/ready.js
const path = require('path');
const { jsonbin } = require(path.join(__dirname, '..', '_config'));

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  try {
    const { user, code, ready } = req.body || {};
    
    if (!user || !user.id) {
      return res.status(400).json({ error: 'user required' });
    }
    
    if (!code) {
      return res.status(400).json({ error: 'code required' });
    }
    
    // Get master data
    const master = await jsonbin.getMaster();
    if (!master || !master.rooms || !master.rooms[code]) {
      return res.status(404).json({ error: 'room not found' });
    }
    
    // Get room data
    const binId = master.rooms[code].binId;
    const room = (await jsonbin.getBin(binId)) || {};
    
    // Initialize room data
    room.players = room.players || [];
    
    // Find player
    const player = room.players.find(x => x.id === user.id);
    if (!player) {
      return res.status(400).json({ error: 'user not in room' });
    }
    
    // Update ready status
    player.ready = !!ready;
    await jsonbin.putBin(binId, room);

    // Check if all players are ready
    const readyCount = room.players.filter(pl => pl.ready).length;
    const minPlayers = 3;
    
    if (room.players.length >= minPlayers && readyCount === room.players.length && room.status !== 'playing') {
      // Start game: assign roles
      room.status = 'playing';
      room.day = 0;
      room.phase = 'night';
      room.game = room.game || {};
      
      // Simple role assignment
      const players = room.players;
      const totalPlayers = players.length;
      const werewolfCount = Math.max(1, Math.floor(totalPlayers / 4));
      
      // Shuffle players for random assignment
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      
      // Assign roles
      shuffled.forEach((pl, index) => {
        if (index < werewolfCount) {
          pl.role = 'werewolf';
        } else {
          pl.role = 'villager';
        }
      });
      
      // Add system message
      room.chat = room.chat || [];
      room.chat.push({
        system: true,
        text: `🎮 Game started! ${werewolfCount} werewolf(s) among ${totalPlayers} players.`,
        ts: new Date().toISOString()
      });
      
      await jsonbin.putBin(binId, room);
    }

    return res.json({ ok: true, room });
  } catch (e) {
    console.error('Ready error:', e);
    return res.status(500).json({ error: 'server error', details: e.message });
  }
};