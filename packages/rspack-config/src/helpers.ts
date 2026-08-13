import { sep } from 'node:path';

/** Windows source-map paths → POSIX (from bulk_send). */
export function toPosixPath(filepath: string): string {
  return sep === '/' ? filepath : filepath.replace(/\\/g, '/');
}

/**
 * Single canonical publicPath: trailing slash, fallback `/`.
 * Replaces `${URL}/`, `${URL}`, and `URL || '/'`.
 */
export function canonicalPublicPath(
  url: string | undefined = process.env.PUBLIC_PATH_URL,
): string {
  if (!url) return '/';
  return url.endsWith('/') ? url : `${url}/`;
}

/**
 * `{ connect: 'http://localhost:8080' }` →
 * `{ connect: 'connect@http://localhost:8080/remoteEntry.js' }`.
 * Falsy URLs are omitted (standalone / CI without a live host).
 */
export function formatRemotes(
  remotes: Record<string, string | undefined> = {},
): Record<string, string> {
  const formatted: Record<string, string> = {};

  for (const [name, url] of Object.entries(remotes)) {
    if (!url) continue;
    formatted[name] = `${name}@${url.replace(/\/$/, '')}/remoteEntry.js`;
  }

  return formatted;
}
