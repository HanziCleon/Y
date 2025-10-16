// api/_config.js
const path = require('path');
const JSONBin = require(path.join(__dirname, '..', 'lib', 'jsonbin'));

const MASTER_BIN_ID = "68efb31dae596e708f156b67";
const MASTER_API_KEY = "$2a$10$PsVzgljojE5fq8qZRmpE4uzMr0K9LArqfmumGVSmNY.P8F2iTKrim";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hanzgantengno1@gmail.com';

if (!MASTER_BIN_ID || !MASTER_API_KEY) {
  console.warn('WARNING: MASTER_BIN_ID or MASTER_API_KEY not set!');
}

const jsonbin = new JSONBin(MASTER_BIN_ID, MASTER_API_KEY);

module.exports = { jsonbin, MASTER_BIN_ID, MASTER_API_KEY, ADMIN_EMAIL };
