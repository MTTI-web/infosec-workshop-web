const XOR_KEY = 0x5a; // 'Z' - a single hardcoded byte, intentionally weak

function encryptPin(plainPin) {
  const bytes = Buffer.from(String(plainPin), 'utf8');
  const encrypted = Buffer.from(bytes.map((b) => b ^ XOR_KEY));
  return encrypted.toString('hex');
}

function decryptPin(hexCipher) {
  const bytes = Buffer.from(hexCipher, 'hex');
  const decrypted = Buffer.from(bytes.map((b) => b ^ XOR_KEY));
  return decrypted.toString('utf8');
}

module.exports = { encryptPin, decryptPin };
