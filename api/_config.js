// api/_config.js
const JSONBin = require('../lib/jsonbin');
const MASTER_BIN_ID = process.env.MASTER_BIN_ID;
const MASTER_API_KEY = process.env.MASTER_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hanzgantengno1@gmail.com';
const jsonbin = new JSONBin(MASTER_BIN_ID, MASTER_API_KEY);
module.exports = { jsonbin, MASTER_BIN_ID, MASTER_API_KEY, ADMIN_EMAIL };