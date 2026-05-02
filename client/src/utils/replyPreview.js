import { decryptToPlaintext } from './crypto';
import { isGifDataUrl } from './imageCompressor';
export const REPLY_PREVIEW_MAX = 200;
export const REPLY_UI_MAX = 100;
export const ENCRYPTED_FALLBACK = 'Encrypted message';

export function isLikelyCiphertext(s) {
  return typeof s === 'string' && s.startsWith('zk-enc:');
}

export function isBlobOrDataImage(s) {
  return typeof s === 'string' && (s.startsWith('blob:') || s.startsWith('data:image'));
}

export function sanitizeReplyLine(text, max = REPLY_PREVIEW_MAX) {
  if (text == null || typeof text !== 'string') return '';
  if (isLikelyCiphertext(text)) return '';
  if (isBlobOrDataImage(text)) return /^data:image\/gif/i.test(text) ? 'GIF' : 'Photo';
  const t = text
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return '';
  if (t === '[Unable to decrypt]') return '';
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/**
 * Plaintext quote payload for wire + DB (no ciphertext in preview fields).
 */
export function buildReplyToPayload(replyingSnapshot) {
  if (!replyingSnapshot?.messageId) return null;
  const messageId = replyingSnapshot.messageId;
  const senderId = replyingSnapshot.senderId;
  const type = replyingSnapshot.type || 'text';

  if (type === 'video') {
    return { messageId, senderId, type, preview: 'Video', message: 'Video' };
  }

  if (type === 'image') {
    const m = replyingSnapshot.message;
    const isGif =
      typeof m === 'string' &&
      (isGifDataUrl(m) || /\.gif(\?|#|$)/i.test(m));
    const label = isGif ? 'GIF' : 'Photo';
    return { messageId, senderId, type, preview: label, message: label };
  }

  let candidate = replyingSnapshot.message;
  if (typeof candidate !== 'string') candidate = '';

  if (
    isLikelyCiphertext(candidate) &&
    typeof replyingSnapshot.rawContent === 'string' &&
    !isLikelyCiphertext(replyingSnapshot.rawContent)
  ) {
    candidate = replyingSnapshot.rawContent;
  }

  let line = sanitizeReplyLine(candidate);
  if (!line && typeof replyingSnapshot.rawContent === 'string') {
    if (isLikelyCiphertext(replyingSnapshot.rawContent)) line = ENCRYPTED_FALLBACK;
    else line = sanitizeReplyLine(replyingSnapshot.rawContent);
  }
  if (!line) line = ENCRYPTED_FALLBACK;

  return { messageId, senderId, type, preview: line, message: line };
}

/**
 * Normalize reply subdocument from server/history into display-safe shape.
 */
export async function normalizeReplyToFromServer(replyData, cryptoKey) {
  if (!replyData || !replyData.messageId) return null;

  const base = {
    messageId: replyData.messageId,
    senderId: replyData.senderId,
    type: replyData.type || 'text'
  };

  if (base.type === 'video') {
    return { ...base, preview: 'Video', message: 'Video' };
  }

  if (base.type === 'image') {
    return { ...base, preview: 'Photo', message: 'Photo' };
  }

  if (replyData.preview && typeof replyData.preview === 'string' && replyData.preview.trim()) {
    const line = sanitizeReplyLine(replyData.preview.trim()) || ENCRYPTED_FALLBACK;
    return { ...base, preview: line, message: line };
  }

  const raw = replyData.message;
  if (typeof raw === 'string' && raw && !isLikelyCiphertext(raw)) {
    const line = sanitizeReplyLine(raw) || ENCRYPTED_FALLBACK;
    return { ...base, preview: line, message: line };
  }

  if (typeof raw === 'string' && isLikelyCiphertext(raw) && cryptoKey) {
    const dec = await decryptToPlaintext(raw, cryptoKey);
    let line = sanitizeReplyLine(dec);
    if (!line) line = ENCRYPTED_FALLBACK;
    return { ...base, preview: line, message: line };
  }

  if (typeof raw === 'string' && isLikelyCiphertext(raw)) {
    return { ...base, preview: ENCRYPTED_FALLBACK, message: ENCRYPTED_FALLBACK };
  }

  return { ...base, preview: ENCRYPTED_FALLBACK, message: ENCRYPTED_FALLBACK };
}

/** One-line snippet for composer / compact bars */
export function getReplySnippetDisplay(replyTo, max = REPLY_UI_MAX) {
  if (!replyTo) return '';
  if (replyTo.type === 'video') return 'Video';
  if (replyTo.type === 'image') {
    const p = (replyTo.preview || replyTo.message || '').trim();
    if (p === 'GIF') return 'GIF';
    return 'Photo';
  }
  const src = replyTo.preview || replyTo.message;
  return sanitizeReplyLine(src, max) || ENCRYPTED_FALLBACK;
}

export function hasRenderableReply(replyTo) {
  return !!(replyTo && replyTo.messageId && (replyTo.preview || replyTo.message));
}
