import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, sep } from 'node:path';

/**
 * Fails when the preset and the app resolve different `@rspack/core` copies.
 *
 * A second copy makes the preset instantiate `ModuleFederationPlugin` from a
 * module the running `rspack build` knows nothing about. The build still
 * succeeds, but the runtime drops federation internals and the browser throws
 * `should have __webpack_require__.f.consumes` when loading the bundle.
 *
 * Set `WENI_RSPACK_SKIP_PEER_CHECK=1` to bypass.
 */
export function assertSingleRspackCore(appDirname: string): void {
  if (process.env.WENI_RSPACK_SKIP_PEER_CHECK === '1') return;

  const resolveFrom = (from: string): string | undefined => {
    try {
      return realpathSync(createRequire(from).resolve('@rspack/core'));
    } catch {
      return undefined;
    }
  };

  const presetCopy = resolveFrom(import.meta.url);
  const appCopy = resolveFrom(join(appDirname, 'package.json'));

  if (!presetCopy || !appCopy || presetCopy === appCopy) return;

  throw new Error(
    [
      '@weni/rspack-config: two copies of @rspack/core detected.',
      `  preset: ${presetCopy}`,
      `  app:    ${appCopy}`,
      'Module Federation needs a single copy, otherwise the bundle builds but fails in the browser',
      'with "should have __webpack_require__.f.consumes".',
      'When linking locally, install a packed copy instead of a symlink:',
      '  npm install -D file:../frontend-config/packages/rspack-config --install-links',
      'Bypass with WENI_RSPACK_SKIP_PEER_CHECK=1.',
    ].join('\n'),
  );
}

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
