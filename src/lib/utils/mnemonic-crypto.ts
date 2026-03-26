/**
 * Mnemonic encryption/decryption.
 *
 * Uses Web Crypto API (PBKDF2 + AES-GCM) when available (secure contexts),
 * falls back to @polkadot/util-crypto (naclEncrypt + blake2) for insecure
 * contexts like http://<LAN-IP>:port during development.
 *
 * Format is identical to nexus-entity-dapp/desktop-keyring.ts so encrypted
 * data is interchangeable between the two apps.
 */

// ── Helpers ─────────────────────────────────────────────────────────

function isWebCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}

// ── Web Crypto path (PBKDF2 + AES-GCM) ─────────────────────────────

async function deriveEncryptionKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptMnemonicWebCrypto(mnemonic: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(mnemonic),
  );
  // Pack: salt(16) + iv(12) + ciphertext → base64
  const packed = new Uint8Array(salt.length + iv.length + new Uint8Array(ciphertext).length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return btoa(Array.from(packed, (b) => String.fromCharCode(b)).join(''));
}

async function decryptMnemonicWebCrypto(encrypted: string, password: string): Promise<string> {
  const packed = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const salt = packed.slice(0, 16);
  const iv = packed.slice(16, 28);
  const ciphertext = packed.slice(28);
  const key = await deriveEncryptionKey(password, salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}

// ── Fallback path (nacl from @polkadot/util-crypto) ─────────────────
// Uses naclEncrypt/naclDecrypt with a key derived by hashing the password.
// Format prefix "nacl:" distinguishes from Web Crypto data.

async function deriveNaclKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const { blake2AsU8a } = await import('@polkadot/util-crypto');
  const encoder = new TextEncoder();
  const pwBytes = encoder.encode(password);
  const input = new Uint8Array(pwBytes.length + salt.length);
  input.set(pwBytes, 0);
  input.set(salt, pwBytes.length);
  return blake2AsU8a(input, 256);
}

async function encryptMnemonicFallback(mnemonic: string, password: string): Promise<string> {
  const { naclEncrypt, randomAsU8a } = await import('@polkadot/util-crypto');
  const salt = randomAsU8a(16);
  const secret = await deriveNaclKey(password, salt);
  const encoder = new TextEncoder();
  const { encrypted, nonce } = naclEncrypt(encoder.encode(mnemonic), secret);
  // Pack: salt(16) + nonce(24) + encrypted
  const packed = new Uint8Array(salt.length + nonce.length + encrypted.length);
  packed.set(salt, 0);
  packed.set(nonce, salt.length);
  packed.set(encrypted, salt.length + nonce.length);
  return 'nacl:' + btoa(Array.from(packed, (b) => String.fromCharCode(b)).join(''));
}

async function decryptMnemonicFallback(encrypted: string, password: string): Promise<string> {
  const { naclDecrypt } = await import('@polkadot/util-crypto');
  const raw = encrypted.startsWith('nacl:') ? encrypted.slice(5) : encrypted;
  const packed = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  const salt = packed.slice(0, 16);
  const nonce = packed.slice(16, 40);
  const ciphertext = packed.slice(40);
  const secret = await deriveNaclKey(password, salt);
  const plaintext = naclDecrypt(ciphertext, nonce, secret);
  if (!plaintext) throw new Error('Decryption failed');
  return new TextDecoder().decode(plaintext);
}

// ── Public API ──────────────────────────────────────────────────────

/** Encrypt a mnemonic phrase with the wallet password. Returns a base64 string. */
export async function encryptMnemonic(mnemonic: string, password: string): Promise<string> {
  if (isWebCryptoAvailable()) {
    return encryptMnemonicWebCrypto(mnemonic, password);
  }
  return encryptMnemonicFallback(mnemonic, password);
}

/** Decrypt a previously encrypted mnemonic. Throws on wrong password. */
export async function decryptMnemonic(encrypted: string, password: string): Promise<string> {
  // Detect format by prefix
  if (encrypted.startsWith('nacl:')) {
    return decryptMnemonicFallback(encrypted, password);
  }
  // Web Crypto format — requires crypto.subtle
  if (isWebCryptoAvailable()) {
    return decryptMnemonicWebCrypto(encrypted, password);
  }
  throw new Error(
    'Cannot decrypt: this mnemonic was encrypted with Web Crypto which is unavailable in insecure contexts. ' +
    'Access the app via https:// or localhost to decrypt.',
  );
}
