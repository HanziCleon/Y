// api/game/vote.js
const { jsonbin } = require('../../api/_config');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const { user, code, targetNumber } = req.body || {};
    if (!user || !user.id) return res.status(400).json({ error: 'user required' });
    if (!code) return res.status(400).json({ error: 'code required' });
    const master = await jsonbin.getMaster();
    if (!master || !master.rooms || !master.rooms[code]) return res.status(404).json({ error: 'room not found' });
    const binId = master.rooms[code].binId;
    const room = (await jsonbin.getBin(binId)) || {};
    room.game = room.game || {};
    room.players = room.players || [];

    const voter = room.players.find(p => p.id === user.id);
    if (!voter) return res.status(400).json({ error: 'user not in room' });
    // set vote by number
    voter.vote = Number(targetNumber) || 0;
    await jsonbin.putBin(binId, room);

    // check if all alive voted
    const alive = room.players.filter(p => !p.isdead);
    const votedCount = alive.filter(p => p.vote && p.vote > 0).length;
    if (votedCount >= alive.length && alive.length > 0) {
      // tally
      const tally = {};
      alive.forEach(p => {
        if (!p.vote) return;
        tally[p.vote] = (tally[p.vote] || 0) + 1;
      });
      // find max
      let max = 0;
      for (const k of Object.keys(tally)) if (tally[k] > max) max = tally[k];
      const winners = Object.keys(tally).filter(k => tally[k] === max);
      if (winners.length === 1) {
        const number = Number(winners[0]);
        const target = room.players.find(p => p.number === number);
        if (target) {
          target.isdead = true;
          room.chat = room.chat || [];
          room.chat.push({ system: true, text: `${target.name} (no.${target.number}) was eliminated by voting.`, ts: new Date().toISOString() });
        }
      } else {
        room.chat = room.chat || [];
        room.chat.push({ system: true, text: `Vote tied. No one eliminated.`, ts: new Date().toISOString() });
      }
      // clear votes
      room.players.forEach(p => (p.vote = 0));
      // maybe check winner (simple majority rule example)
      // TODO: integrate ww.getWinner if available
      await jsonbin.putBin(binId, room);
    }

    return res.json({ ok: true, room });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
};