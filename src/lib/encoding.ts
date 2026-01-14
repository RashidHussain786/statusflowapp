import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { StatusPayload, AppStatus, NormalizedEntry } from './types';

export const URL_PREFIX = '#s=';


/**
 * Encode a StatusPayload into a URL fragment
 */
export function encodeStatus(payload: StatusPayload): string {
  try {
    // Ensure the payload has the correct version
    const payloadToEncode = { ...payload, v: 2 as const };
    const jsonString = JSON.stringify(payloadToEncode);
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

    // Handle version 1 (backward compatibility)
    if (payload.v === 1) {
      if (!payload.name || !payload.date || !Array.isArray(payload.apps)) {
        return null;
      }
      // Convert v1 to v2 format
      return {
        ...payload,
        v: 2 as const,
        customTags: []
      };
    }

    // Handle version 2
    if (payload.v === 2) {
      if (!payload.name || !payload.date || !Array.isArray(payload.apps)) {
        return null;
      }
      return payload;
    }

    // Invalid version
    return null;
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
      const hasPrefix = line.includes(URL_PREFIX);
      if (!isClient) return hasPrefix;
      return line.startsWith(window.location.origin) && hasPrefix;
    })
    .map(line => {
      try {
        const urlString = line.startsWith('http') ? line : `http://localhost${line.startsWith('/') ? '' : '/'}${line}`;
        const url = new URL(urlString);
        return url.hash;
      } catch {
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
  const appParts = new Map<string, string[]>(); // Collect parts for same app

  // First pass: collect all parts
  for (const fragment of fragments) {
    const payload = decodeStatus(fragment);
    if (!payload) continue;

    for (const app of payload.apps) {
      const baseAppName = app.app.replace(/ \[Part \d+\]$/, ''); // Remove part suffix
      const isPart = app.app.includes('[Part ');
      const key = `${payload.name.toLowerCase().trim()}-${baseAppName.toLowerCase().trim()}-${payload.date}`;

      if (isPart) {
        // This is a part of a larger application
        if (!appParts.has(key)) {
          appParts.set(key, []);
        }
        appParts.get(key)!.push(app.content);
      } else {
        // Regular application
        if (!seen.has(key)) {
          seen.add(key);
          entries.push({
            name: payload.name,
            app: app.app,
            content: app.content,
          });
        }
      }
    }
  }

  // Second pass: reconstruct split applications
  for (const [key, parts] of appParts) {
    if (parts.length > 0 && !seen.has(key)) {
      // Combine all parts in order
      const combinedContent = parts.join('\n\n');
      const [name, appName, date] = key.split('-');
      entries.push({
        name: name,
        app: appName,
        content: combinedContent,
      });
      seen.add(key);
    }
  }

  return entries;
}

/**
 * Validate status payload size constraints
 */
export function validateAndSplitPayload(payload: StatusPayload): { urls: string[]; error?: string } {
  try {
    const encoded = encodeStatus(payload);
    if (encoded.length <= 1800) {
      return { urls: [encoded] };
    }

    // First try splitting by applications
    const appSplitUrls = splitPayloadByApplications(payload);
    if (appSplitUrls.every(url => url.length <= 1800)) {
      return { urls: appSplitUrls };
    }

    // If application splitting still results in URLs > 1800, split content within applications
    const contentSplitUrls = splitPayloadByContent(payload);
    return { urls: contentSplitUrls };
  } catch {
    return { urls: [], error: 'Encoding failed' };
  }
}

function splitPayloadByApplications(payload: StatusPayload): string[] {
  const urls: string[] = [];
  let currentApps: AppStatus[] = [];

  for (const app of payload.apps) {
    // Try adding this app to current batch
    const testPayload: StatusPayload = {
      v: payload.v,
      name: payload.name,
      date: payload.date,
      apps: [...currentApps, app]
    };

    const testEncoded = encodeStatus(testPayload);
    if (testEncoded.length > 1800 && currentApps.length > 0) {
      // Current batch would exceed limit, save current batch and start new one
      const batchPayload: StatusPayload = {
        v: payload.v,
        name: payload.name,
        date: payload.date,
        apps: currentApps
      };
      urls.push(encodeStatus(batchPayload));
      currentApps = [app];
    } else {
      // Add to current batch
      currentApps.push(app);
    }
  }

  // Add remaining apps
  if (currentApps.length > 0) {
    const batchPayload: StatusPayload = {
      v: payload.v,
      name: payload.name,
      date: payload.date,
      apps: currentApps
    };
    urls.push(encodeStatus(batchPayload));
  }

  return urls;
}

function splitPayloadByContent(payload: StatusPayload): string[] {
  const urls: string[] = [];

  for (const app of payload.apps) {
    // Check if this single app fits
    const singleAppPayload: StatusPayload = {
      v: payload.v,
      name: payload.name,
      date: payload.date,
      apps: [app]
    };

    const singleEncoded = encodeStatus(singleAppPayload);
    if (singleEncoded.length <= 1800) {
      // App fits, add it as-is
      urls.push(singleEncoded);
    } else {
      // App is too large, split its content
      const appParts = splitApplicationContent(app, payload);
      urls.push(...appParts);
    }
  }

  return urls;
}

function splitApplicationContent(app: AppStatus, payload: StatusPayload): string[] {
  const parts: string[] = [];

  // Split HTML content by paragraphs or reasonable chunks
  const contentChunks = splitHtmlContent(app.content);

  let currentContent = '';
  let partIndex = 0;

  for (const chunk of contentChunks) {
    const testContent = currentContent + chunk;
    const testApp: AppStatus = {
      app: app.app,
      content: testContent
    };

    const testPayload: StatusPayload = {
      v: payload.v,
      name: payload.name,
      date: payload.date,
      apps: [testApp]
    };

    const testEncoded = encodeStatus(testPayload);

    if (testEncoded.length > 1700) { // Leave buffer for metadata
      // Save current content as a part
      if (currentContent.trim()) {
        const partPayload: StatusPayload = {
          v: payload.v,
          name: payload.name,
          date: payload.date,
          apps: [{
            app: `${app.app} [Part ${partIndex + 1}]`,
            content: currentContent.trim()
          }]
        };
        parts.push(encodeStatus(partPayload));
        partIndex++;
      }
      currentContent = chunk;
    } else {
      currentContent += chunk;
    }
  }

  // Add remaining content
  if (currentContent.trim()) {
    const partPayload: StatusPayload = {
      v: payload.v,
      name: payload.name,
      date: payload.date,
      apps: [{
        app: `${app.app} [Part ${partIndex + 1}]`,
        content: currentContent.trim()
      }]
    };
    parts.push(encodeStatus(partPayload));
  }

  return parts;
}

function splitHtmlContent(html: string): string[] {
  // Split by paragraphs and other block elements
  const chunks = html
    .split(/(<\/?p[^>]*>|<br[^>]*>|<div[^>]*>|<h[1-6][^>]*>)/)
    .filter(chunk => chunk.trim().length > 0);

  // If no natural breaks, split by character count
  if (chunks.length <= 1) {
    const maxChunkSize = 500; // Characters per chunk
    const textChunks: string[] = [];
    let remaining = html;

    while (remaining.length > maxChunkSize) {
      // Find a good break point (end of word/sentence)
      let breakPoint = maxChunkSize;
      for (let i = Math.min(maxChunkSize, remaining.length - 1); i > maxChunkSize - 100; i--) {
        if (remaining[i] === ' ' || remaining[i] === '.' || remaining[i] === '\n') {
          breakPoint = i + 1;
          break;
        }
      }

      textChunks.push(remaining.substring(0, breakPoint));
      remaining = remaining.substring(breakPoint);
    }

    if (remaining) {
      textChunks.push(remaining);
    }

    return textChunks;
  }

  return chunks;
}

// Keep the old function for backward compatibility
export function validatePayload(payload: StatusPayload): { valid: boolean; error?: string } {
  const result = validateAndSplitPayload(payload);
  if (result.error) {
    return { valid: false, error: result.error };
  }
  return { valid: result.urls.length === 1 };
}