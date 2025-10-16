// api/chat/send.js
const path = require('path');
const { jsonbin } = require(path.join(__dirname, '..', '_config'));
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    const { user, code, text } = req.body || {};
    
    if (!user || !user.id) {
      return res.status(400).json({ error: 'user required' });
    }
    
    if (!code || !text) {
      return res.status(400).json({ error: 'code & text required' });
    }

    // Get master data
    const master = await jsonbin.getMaster();
    if (!master || !master.rooms || !master.rooms[code]) {
      return res.status(404).json({ error: 'room not found' });
    }
    
    // Get room data
    const binId = master.rooms[code].binId;
    const room = (await jsonbin.getBin(binId)) || {};
    
    