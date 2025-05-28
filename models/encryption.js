const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
// const IV = crypto.randomBytes(16); // fixed IV if needed, but better use random per encryption for strong security
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 chars
const IV = process.env.ENCRYPTION_IV || '1234567890123456'; // 16 chars

function encryptId(id) {
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), IV);
  let encrypted = cipher.update(String(id));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString('hex');
}

function decryptId(encryptedId) {
  const encryptedText = Buffer.from(encryptedId, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), IV);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return parseInt(decrypted.toString());
}

module.exports = {
  encryptId,
  decryptId
};
