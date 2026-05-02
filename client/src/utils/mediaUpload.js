/**
 * Supabase Storage — direct browser uploads
 *
 * 1. Create a bucket (e.g. `chat-media`). For public read + anon upload you can use:
 *    - Public bucket: Storage → New bucket → Public
 *    - Policies (SQL example):
 *      insert: bucket_id = 'chat-media' AND auth.role() = 'anon'
 *      select: bucket_id = 'chat-media' AND auth.role() = 'anon'
 *    Tighten paths/size in production (e.g. check (storage.foldername(name))[1] = roomId).
 *
 * 2. Env (Vite):
 *    VITE_SUPABASE_URL=https://xxxx.supabase.co
 *    VITE_SUPABASE_ANON_KEY=eyJ...
 *    VITE_SUPABASE_CHAT_BUCKET=chat-media   (optional)
 */
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient';

export const CHAT_MEDIA_BUCKET =
  import.meta.env.VITE_SUPABASE_CHAT_BUCKET || 'chat-media';

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/jpg'
]);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

export { isSupabaseConfigured as isSupabaseMediaEnabled };

function sanitizeSegment(s) {
  return String(s || '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 120);
}

function extFromMime(mime, fileName) {
  const fromName = (fileName || '').split('.').pop();
  if (fromName && /^[a-zA-Z0-9]{1,8}$/.test(fromName)) return fromName.toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'video/mp4') return 'mp4';
  if (mime === 'video/webm') return 'webm';
  return 'bin';
}

export function validateChatMediaFile(file) {
  if (!file || !file.type) return { ok: false, error: 'Invalid file' };
  if (IMAGE_TYPES.has(file.type)) {
    if (file.size > MAX_IMAGE_BYTES) {
      return { ok: false, error: `Image too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)} MB)` };
    }
    return { ok: true, kind: 'image' };
  }
  if (VIDEO_TYPES.has(file.type)) {
    if (file.size > MAX_VIDEO_BYTES) {
      return { ok: false, error: `Video too large (max ${MAX_VIDEO_BYTES / (1024 * 1024)} MB)` };
    }
    return { ok: true, kind: 'video' };
  }
  return { ok: false, error: 'Use JPG, PNG, GIF, WebP, MP4, or WebM' };
}

/**
 * @returns {{ publicUrl: string, path: string }}
 */
export async function uploadChatMedia(file, { roomId, messageId }) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)');
  }

  const v = validateChatMediaFile(file);
  if (!v.ok) throw new Error(v.error);

  const roomSeg = sanitizeSegment(roomId);
  const idSeg = sanitizeSegment(messageId);
  const ext = extFromMime(file.type, file.name);
  const path = `${roomSeg}/${idSeg}.${ext}`;

  const { data, error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || undefined
    });

  if (error) throw error;

  const { data: pub } = supabase.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(data.path);
  if (!pub?.publicUrl) throw new Error('Could not get public URL for upload');

  return { publicUrl: pub.publicUrl, path: data.path };
}

export function isHttpsMediaUrl(s) {
  return typeof s === 'string' && /^https?:\/\//i.test(s.trim());
}

export function isImageMessagePayload(s) {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  return t.startsWith('data:image') || isHttpsMediaUrl(t);
}

export function isVideoMessagePayload(s) {
  if (typeof s !== 'string') return false;
  return isHttpsMediaUrl(s.trim());
}
