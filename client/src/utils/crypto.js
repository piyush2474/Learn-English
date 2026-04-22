// Advanced End-to-End Encryption Utility (AES-GCM)
export const encryptMessage = async (text, secretKey) => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Derive a crypto key from the roomId
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(secretKey),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    
    const key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("salt-learn-english"),
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );

    // Combine IV and Encrypted Data into one string
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return as Base64 string for socket transport
    const binary = String.fromCharCode.apply(null, combined);
    return "enc:" + window.btoa(binary);
  } catch (err) {
    console.error("Encryption failed:", err);
    return text;
  }
};

export const decryptMessage = async (encryptedBase64, secretKey) => {
  if (!encryptedBase64.startsWith("enc:")) return encryptedBase64;
  
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const binary = window.atob(encryptedBase64.replace("enc:", ""));
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) combined[i] = binary.charCodeAt(i);

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(secretKey),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    
    const key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("salt-learn-english"),
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );

    return decoder.decode(decrypted);
  } catch (err) {
    console.error("Decryption failed:", err);
    return "[Encrypted Message]";
  }
};
