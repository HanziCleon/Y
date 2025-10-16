// lib/jsonbin.js (CommonJS)
const axios = require('axios');

class JSONBin {
  constructor(masterBinId, masterApiKey) {
    this.masterBinId = masterBinId;
    this.masterApiKey = masterApiKey;
    this.base = 'https://api.jsonbin.io/v3';
  }

  masterHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Master-Key': this.masterApiKey
    };
  }

  async getMaster() {
    if (!this.masterBinId || !this.masterApiKey) return null;
    try {
      const res = await axios.get(`${this.base}/b/${this.masterBinId}/latest`, { headers: this.masterHeaders() });
      return res.data && res.data.record ? res.data.record : null;
    } catch (e) {
      console.error('getMaster error', e?.response?.data || e.message);
      return null;
    }
  }

  async updateMaster(payload) {
    if (!this.masterBinId || !this.masterApiKey) return null;
    try {
      const res = await axios.put(`${this.base}/b/${this.masterBinId}`, payload, { headers: this.masterHeaders() });
      return res.data;
    } catch (e) {
      console.error('updateMaster error', e?.response?.data || e.message);
      return null;
    }
  }

  // create a new room bin with initial content and return binId
  async createRoomBin(initialRecord = {}) {
    if (!this.masterApiKey) throw new Error('MASTER_API_KEY missing');
    try {
      const res = await axios.post(`${this.base}/b`, initialRecord, {
        headers: {
          'Content-Type': 'application/json',
          'X-Meta-Name': 'werewolf-room',
          'X-Collection-Id': '', // optional
          'X-Master-Key': this.masterApiKey
        }
      });
      // response contains metadata with id at res.data.metadata.id OR res.data.record? JSONBin v3 returns metadata in res.data.metadata
      const meta = res.data && res.data.metadata ? res.data.metadata : null;
      const binId = meta && (meta.id || meta.binId) ? (meta.id || meta.binId) : null;
      // Some JSONBin variants return bin id in res.headers.location or res.data... fallback:
      if (!binId && res.data) {
        // try to parse id
        return null;
      }
      return binId;
    } catch (e) {
      console.error('createRoomBin error', e?.response?.data || e.message);
      return null;
    }
  }

  // put a full record to a specific binId (replace)
  async putBin(binId, record) {
    try {
      const res = await axios.put(`${this.base}/b/${binId}`, record, {
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': this.masterApiKey
        }
      });
      return res.data;
    } catch (e) {
      console.error('putBin error', e?.response?.data || e.message);
      return null;
    }
  }

  // get latest record of bin
  async getBin(binId) {
    try {
      const res = await axios.get(`${this.base}/b/${binId}/latest`, {
        headers: {
          'X-Master-Key': this.masterApiKey
        }
      });
      return res.data && res.data.record ? res.data.record : null;
    } catch (e) {
      console.error('getBin error', e?.response?.data || e.message);
      return null;
    }
  }

  // helper: create room and register to master map
  async createRoomAndRegister(code, owner) {
    const initial = {
      roomCode: code,
      players: [],
      chat: [],
      status: 'waiting',
      day: 0,
      phase: 'waiting',
      game: {},
      winner: null,
      createdAt: new Date().toISOString()
    };
    const binId = await this.createRoomBin(initial);
    if (!binId) throw new Error('cannot create bin');
    // update master
    const master = (await this.getMaster()) || { credentials: [], rooms: {} };
    master.rooms = master.rooms || {};
    master.rooms[code] = { binId, owner, createdAt: initial.createdAt };
    await this.updateMaster(master);
    return binId;
  }
}

module.exports = JSONBin;