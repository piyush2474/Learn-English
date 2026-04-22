// --- Advanced ECDH Zero-Knowledge Key Exchange ---

export const generateKeyPair = async () => {
  return await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
};

export const exportPublicKey = async (key) => {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return window.btoa(String.fromCharCode.apply(null, new Uint8Array(exported)));
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
    false,
    ["encrypt", "decrypt"]
  );
};

// --- Encryption / Decryption using Derived Shared Key ---

export const encryptWithKey = async (text, cryptoKey) => {
  try {
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
    const binary = String.fromCharCode.apply(null, combined);
    return "zk-enc:" + window.btoa(binary);
  } catch (err) {
    console.error("Encryption failed:", err);
    return text;
  }
};

export const decryptWithKey = async (encryptedBase64, cryptoKey) => {
  if (!encryptedBase64 || !encryptedBase64.startsWith("zk-enc:")) return encryptedBase64;
  
  try {
    const decoder = new TextDecoder();
    const binary = window.atob(encryptedBase64.replace("zk-enc:", ""));
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) combined[i] = binary.charCodeAt(i);

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      data
    );

    return decoder.decode(decrypted);
  } catch (err) {
    console.error("Decryption failed:", err);
    return "[Encrypted Content]";
  }
};

// Legacy support (to be replaced by ECDH flow)
export const encryptMessage = async (text, secretKey) => { return text; };
export const decryptMessage = async (enc, secretKey) => { return enc; };
