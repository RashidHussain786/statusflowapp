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
 * Encode multiple StatusPayloads into a URL fragment
 */
export function encodeMultiStatus(payloads: StatusPayload[]): string {
  try {
    const jsonString = JSON.stringify(payloads);
    const compressed = compressToEncodedURIComponent(jsonString);
    return `${URL_PREFIX}${compressed}`;
  } catch (error) {
    throw new Error('Failed to encode multiple status payloads');
  }
}

/**
 * Split multiple payloads into multiple URL fragments if they exceed the limit
 */
export function splitMultiStatusPayloads(payloads: StatusPayload[]): string[] {
  const urls: string[] = [];
  let currentBatch: StatusPayload[] = [];

  for (const payload of payloads) {
    // Check if adding this payload exceeds the limit
    const testBatch = [...currentBatch, payload];
    const encoded = encodeMultiStatus(testBatch);

    if (encoded.length > 1800 && currentBatch.length > 0) {
      // Current batch is full, encode it and start a new one
      urls.push(encodeMultiStatus(currentBatch));
      currentBatch = [payload];
    } else {
      currentBatch = testBatch;
    }
  }

  // Add the last batch
  if (currentBatch.length > 0) {
    urls.push(encodeMultiStatus(currentBatch));
  }

  // Note: This simple chunking works because individual payloads are already 
  // processed. If a single payload is somehow > 1800 (rare from history), 
  // it will still be > 1800 here. 
  return urls;
}

/**
 * Decode a URL fragment into a StatusPayload or an array of them
 */
export function decodeStatus(fragment: string): StatusPayload | StatusPayload[] | null {
  try {
    if (!fragment.startsWith(URL_PREFIX)) {
      return null;
    }

    const compressed = fragment.slice(URL_PREFIX.length);
    const jsonString = decompressFromEncodedURIComponent(compressed);

    if (!jsonString) {
      return null;
    }

    const data = JSON.parse(jsonString);

    if (Array.isArray(data)) {
      return data as StatusPayload[];
    }

    const payload = data as StatusPayload;

    // Handle versions
    if (payload.v === 1 || payload.v === 2) {
      if (!payload.name || !payload.date || !Array.isArray(payload.apps)) {
        return null;
      }
      return payload;
    }

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
    const decoded = decodeStatus(fragment);
    if (!decoded) continue;

    // Handle single or multi
    const payloads = Array.isArray(decoded) ? decoded : [decoded];

    for (const payload of payloads) {
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
  // Client-side: Use DOMParser for smart splitting
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      // Parse as body to handle partials
      const doc = parser.parseFromString(html, 'text/html');
      const chunks: string[] = [];

      const traverse = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim();
          if (text) chunks.push(node.textContent!); // Keep whitespace for text nodes if needed, or outerHTML equivalent
          return;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          const tagName = el.tagName.toLowerCase();

          // Atomic blocks: These should stay together if possible
          if (tagName === 'li' || tagName === 'p' || tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'div') {
            chunks.push(el.outerHTML);
          } else if (tagName === 'ul' || tagName === 'ol') {
            // Lists: Split into Open + Children + Close
            // Construct open tag manually to avoid closing it
            let openTag = `<${tagName}`;
            Array.from(el.attributes).forEach(attr => {
              openTag += ` ${attr.name}="${attr.value}"`;
            });
            openTag += '>';
            chunks.push(openTag);

            // Recurse children
            Array.from(el.childNodes).forEach(child => traverse(child));

            // Close tag
            chunks.push(`</${tagName}>`);
          } else if (tagName === 'body') {
            Array.from(el.childNodes).forEach(child => traverse(child));
          } else {
            // Other tags (br, span, etc) - treat as atomic or recurse?
            // Br is atomic. Span might be atomic inside a P, but top level?
            // Fallback: atomic.
            chunks.push(el.outerHTML);
          }
        }
      };

      traverse(doc.body);

      // Filter out empty chunks
      return chunks.filter(c => c && c.trim().length > 0);

    } catch (e) {
      console.warn("DOM parsing failed, falling back to regex", e);
    }
  }

  // Fallback / SSR: Regex splitting (Improved)
  // Split by closing tags of blocks
  return html
    .split(/(<\/p>|<\/li>|<\/h[1-6]>|<\/div>|<br[^>]*>)/)
    .filter(chunk => chunk.trim().length > 0)
    .reduce((acc: string[], chunk) => {
      // Re-attach the separator if it was split
      if (chunk.match(/^(<\/p>|<\/li>|<\/h[1-6]>|<\/div>|<br[^>]*>)$/)) {
        if (acc.length > 0) {
          acc[acc.length - 1] += chunk;
        } else {
          acc.push(chunk);
        }
      } else {
        acc.push(chunk);
      }
      return acc;
    }, []);
}


// Keep the old function for backward compatibility
export function validatePayload(payload: StatusPayload): { valid: boolean; error?: string } {
  const result = validateAndSplitPayload(payload);
  if (result.error) {
    return { valid: false, error: result.error };
  }
  return { valid: result.urls.length === 1 };
}