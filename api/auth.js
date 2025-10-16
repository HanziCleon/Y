// api/auth.js
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  // only allow POST
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const { email, name, picture } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });

    // We're serverless: no persistent user DB — client should store userId in localStorage
    // We'll generate a user object and return it; userId stable per email (simple deterministic id)
    // For convenience we just return uuid + email (client should persist)
    const id = Buffer.from(email).toString('base64').replace(/=/g, '');
    const isAdmin = (email === (process.env.ADMIN_EMAIL || 'hanzgantengno1@gmail.com'));
    const user = { id, email, name: name || email.split('@')[0], picture: picture || null, isAdmin };
    return res.json({ user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
};