// --- Advanced ECDH Zero-Knowledge Key Exchange ---

export const generateKeyPair = async () => {
  return await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
};

export const exportKeyPair = async (keyPair) => {
  const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
  return JSON.stringify({ publicKey, privateKey });
};

export const importKeyPair = async (jsonString) => {
  const { publicKey, privateKey } = JSON.parse(jsonString);
  const pub = await window.crypto.subtle.importKey("jwk", publicKey, { name: "ECDH", namedCurve: "P-256" }, true, []);
  const priv = await window.crypto.subtle.importKey("jwk", privateKey, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);
  return { publicKey: pub, privateKey: priv };
};

function uint8ToBinaryChunked(bytes) {
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, sub);
  }
  return binary;
}

export const exportPublicKey = async (key) => {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  const buf = new Uint8Array(exported);
  return window.btoa(uint8ToBinaryChunked(buf));
};

export const importPublicKey = async (base64Key) => {
  const binary = window.atob(base64Key);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return await window.crypto.subtle.importKey(
    "spki",
    bytes,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
};

export const deriveSharedSecret = async (privateKey, publicKey) => {
  return await window.crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

export const exportSharedKey = async (key) => {
  const exported = await window.crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(exported);
};

export const importSharedKey = async (jsonString) => {
  const jwk = JSON.parse(jsonString);
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

// --- Encryption / Decryption using Derived Shared Key ---
// decryptWithKey returns { ok: true, plaintext } | { ok: false }
// encryptWithKey throws on failure (never sends plaintext by mistake)

export const encryptWithKey = async (text, cryptoKey) => {
  if (cryptoKey == null) throw new Error("Missing encryption key");
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  const binary = uint8ToBinaryChunked(combined);
  return "zk-enc:" + window.btoa(binary);
};

export const decryptWithKey = async (encryptedBase64, cryptoKey) => {
  if (!encryptedBase64 || typeof encryptedBase64 !== "string") {
    return { ok: false, error: "empty" };
  }
  if (!encryptedBase64.startsWith("zk-enc:")) {
    return { ok: true, plaintext: encryptedBase64 };
  }

  try {
    const decoder = new TextDecoder();
    const binary = window.atob(encryptedBase64.replace("zk-enc:", ""));
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) combined[i] = binary.charCodeAt(i);

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      ciphertext
    );

    return { ok: true, plaintext: decoder.decode(decrypted) };
  } catch (err) {
    console.error("Decryption failed:", err);
    return { ok: false, error: "decrypt_failed" };
  }
};

/** Convenience for displaying ciphertext or plaintext without branching at call sites */
export const decryptToPlaintext = async (encryptedBase64, cryptoKey) => {
  const r = await decryptWithKey(encryptedBase64, cryptoKey);
  return r.ok ? r.plaintext : "[Unable to decrypt]";
};

// Legacy support (to be replaced by ECDH flow)
export const encryptMessage = async (text, secretKey) => { return text; };
export const decryptMessage = async (enc, secretKey) => { return enc; };
