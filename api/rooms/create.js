// api/rooms/create.js
const { jsonbin } = require('../_config');
const { v4: uuidv4 } = require('uuid');

function makeRoomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < 6; i++) res += chars[Math.floor(Math.random() * chars.length)];
  return res;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  try {
    const { user, roomName } = req.body || {};
    if (!user || !user.id) return res.status(400).json({ error: 'user required' });

    // Generate unique room code
    let code;
    let attempts = 0;
    const master = await jsonbin.getMaster() || { credentials: [], rooms: {} };
    
    do {
      code = makeRoomCode();
      attempts++;
      if (attempts > 10) return res.status(500).json({ error: 'Failed to generate unique code' });
    } while (master.rooms && master.rooms[code]);

    // Create room bin via helper
    const binId = await jsonbin.createRoomAndRegister(code, user.id);
    
    if (!binId) {
      return res.status(500).json({ error: 'Failed to create room' });
    }

    return res.json({ 
      ok: true, 
      code, 
      binId,
      message: 'Room created successfully' 
    });
  } catch (e) {
    console.error('Create room error:', e);
    return res.status(500).json({ error: 'server error', details: e.message });
  }
};