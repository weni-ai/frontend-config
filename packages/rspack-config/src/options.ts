import type { Configuration } from '@rspack/core';

/**
 * Public options for `defineWeniConfig`.
 *
 * Keep this surface small: per-repo values as inputs, invariants inside the
 * preset, one-off tweaks via `plugins` / `override`.
 */
export interface WeniPackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  [key: string]: unknown;
}

export interface WeniFederationOptions {
  name: string;
  exposes: Record<string, string>;
  /**
   * Remote name → origin URL (e.g. `process.env.MODULE_FEDERATION_CONNECT_URL`).
   * `undefined` / empty values are omitted. The preset formats
   * `{ connect: 'http://localhost:8080' }` as
   * `connect@http://localhost:8080/remoteEntry.js`.
   */
  remotes?: Record<string, string | undefined>;
}

export interface WeniPostcssOptions {
  /**
   * Class added to the mount container. Every CSS rule is wrapped under it
   * via `postcss-prefixwrap` (e.g. `.bulk-send-webapp`, `.chats-webapp`).
   */
  prefix: string;
  /**
   * Forwarded to `postcss-prefixwrap`.
   * Chats uses this so `.dark …` selectors keep working under the mount class.
   */
  prefixTransform?: (selector: string, prefix: string) => string;
  /**
   * Forwarded to `postcss-prefixwrap`.
   * Leave `html` / `body` / `*` unprefixed when document-level resets must stay global.
   */
  ignoredSelectors?: (string | RegExp)[];
}

export type WeniRspackConfig = Configuration;

export interface WeniConfigOptions {
  dirname: string;
  pkg: WeniPackageJson;
  port: number;
  entry: string;
  federation: WeniFederationOptions;
  aliases?: Record<string, string>;
  sharedDeps?: Record<string, unknown>;
  plugins?: NonNullable<Configuration['plugins']>;
  /**
   * Opt-in `postcss-loader` + `postcss-prefixwrap`.
   * Omit or `false` to skip (agent-builder). Pass `{ prefix }` to enable.
   * `true` without a prefix is invalid.
   */
  postcss?: boolean | WeniPostcssOptions;
  override?: (config: WeniRspackConfig) => WeniRspackConfig;
}
