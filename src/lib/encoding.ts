import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { StatusPayload, NormalizedEntry } from './types';

export const URL_PREFIX = '#s=';


/**
 * Encode a StatusPayload into a URL fragment
 */
export function encodeStatus(payload: StatusPayload): string {
  try {
    const jsonString = JSON.stringify(payload);
    const compressed = compressToEncodedURIComponent(jsonString);
    return `${URL_PREFIX}${compressed}`;
  } catch (error) {
    throw new Error('Failed to encode status payload');
  }
}

/**
 * Decode a URL fragment into a StatusPayload
 */
export function decodeStatus(fragment: string): StatusPayload | null {
  try {
    if (!fragment.startsWith(URL_PREFIX)) {
      return null;
    }

    const compressed = fragment.slice(URL_PREFIX.length);
    const jsonString = decompressFromEncodedURIComponent(compressed);

    if (!jsonString) {
      return null;
    }

    const payload = JSON.parse(jsonString) as StatusPayload;

    // Basic validation
    if (payload.v !== 1 || !payload.name || !payload.date || !Array.isArray(payload.apps)) {
      return null;
    }

    return payload;
  } catch (error) {
    console.warn('Failed to decode status payload:', error);
    return null;
  }
}

/**
 * Extract status URLs from text (one per line)
 */
export function extractStatusUrls(text: string): string[] {
  const isClient = typeof window !== 'undefined';

  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false;
      // If server-side, skip origin check to allow parsing (or we could return false depends on intent)
      // Usually better to allow parsing if it looks like a valid URL or just skip if we need full URL
      const hasPrefix = line.includes(URL_PREFIX);
      if (!isClient) return hasPrefix;
      return line.startsWith(window.location.origin) && hasPrefix;
    })
    .map(line => {
      try {
        // Handle both relative and absolute URLs
        const urlString = line.startsWith('http') ? line : `http://localhost${line.startsWith('/') ? '' : '/'}${line}`;
        const url = new URL(urlString);
        return url.hash;
      } catch {
        // If parsing fails but it has the prefix, maybe it's just the fragment?
        if (line.startsWith(URL_PREFIX)) return line;
        return '';
      }
    })
    .filter(hash => hash.length > 0);
}

/**
 * Decode multiple status URLs into normalized entries
 */
export function decodeMultipleStatuses(fragments: string[]): NormalizedEntry[] {
  const entries: NormalizedEntry[] = [];
  const seen = new Set<string>(); // Prevent duplicates: name-app-date

  for (const fragment of fragments) {
    const payload = decodeStatus(fragment);
    if (!payload) continue;

    for (const app of payload.apps) {
      // Use case-insensitive key for deduplication
      const key = `${payload.name.toLowerCase().trim()}-${app.app.toLowerCase().trim()}-${payload.date}`;
      if (seen.has(key)) continue;

      seen.add(key);
      entries.push({
        name: payload.name,
        app: app.app,
        content: app.content,
      });
    }
  }

  return entries;
}

/**
 * Validate status payload size constraints
 */
export function validatePayload(payload: StatusPayload): { valid: boolean; error?: string } {
  // Check total encoded size
  try {
    const encoded = encodeStatus(payload);
    if (encoded.length > 1800) {
      return { valid: false, error: 'URL too long (max 1800 characters)' };
    }
  } catch {
    return { valid: false, error: 'Encoding failed' };
  }

  // Check individual app content sizes
  for (const app of payload.apps) {
    if (app.content.length > 600) {
      return { valid: false, error: `Content for ${app.app} too long (max 600 characters)` };
    }
  }

  return { valid: true };
}