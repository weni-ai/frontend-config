# `@weni/rspack-config`

Shared Rspack preset for Weni microfrontends. ESM only in v0.x (CJS lands when `chats`, `integrations`, and `weni-webapp` migrate).

Extracted from `agent-builder-webapp` (including [PR 288](https://github.com/weni-ai/agent-builder-webapp/pull/288) Pinia HMR), plus `devtoolModuleFilenameTemplate` / `toPosixPath` from `bulk_send`.

## Install

```bash
npm install -D @weni/rspack-config
```

Peer dependencies (owned by the app, not this package): `@rspack/core`, `@rspack/cli`, `vue-loader`, `sass-loader`, `css-loader`, `vue-style-loader`, `vue`, `pinia`.

When `postcss` is enabled, also install `postcss@^8.5.15`, `postcss-loader@^8.2.1`, and `postcss-prefixwrap@^1.58.0`.

## Usage

```ts
import { defineWeniConfig } from '@weni/rspack-config';
import pkg from './package.json' with { type: 'json' };

export default defineWeniConfig({
  dirname: import.meta.dirname,
  pkg,
  port: 8081,
  entry: './src/bootstrap.js',
  federation: {
    name: 'agent_builder',
    exposes: {
      './main': './src/main.js',
    },
    remotes: { connect: process.env.MODULE_FEDERATION_CONNECT_URL },
  },
});
```

Escape hatches: `aliases` and `sharedDeps` (merged with defaults), `plugins` (concatenated), `override` (runs last).

Opt-in PostCSS (off by default — omit or `postcss: false`):

```ts
export default defineWeniConfig({
  // ...
  postcss: { prefix: '.bulk-send-webapp' },
});
```

That inserts `postcss-loader` + `postcss-prefixwrap` into the style chain and replaces `postcss.config.js`. Repos without the option do not load the loader.

`prefixRootTags` is never enabled (breaks `:root` / unnnic on prefixwrap `1.58.0`). Extra prefixwrap knobs when needed:

```ts
postcss: {
  prefix: '.chats-webapp',
  // Keep host `.dark` and scoped `.chats-webapp.dark` both matching
  prefixTransform: (selector, prefix) => {
    if (selector.startsWith('.dark')) {
      return `${prefix} ${selector}, ${prefix}${selector}`;
    }
    return `${prefix} ${selector}`;
  },
},
```

Optional: `ignoredSelectors` (also forwarded to prefixwrap).

Named internals (for assembling a config from scratch): `styleRule`, `assetRules`, `basePlugins`, `piniaHmrLoaderPath`.

## Subpath exports

| Import | What |
| --- | --- |
| `@weni/rspack-config` | `defineWeniConfig` and named blocks |
| `@weni/rspack-config/hmr` | `registerStoreHMR` (runtime, bundled into the app) |
| `@weni/rspack-config/types` | `ImportMeta.webpackHot` |

## Local testing

Install a packed copy, not a symlink:

```bash
# in frontend-config
npm run build

# in the app
npm install -D file:../frontend-config/packages/rspack-config --install-links
```

A plain `file:` install symlinks the package, so Node resolves `@rspack/core` from `frontend-config/node_modules` instead of the app. Two copies break Module Federation at runtime — the build succeeds and the browser throws `should have __webpack_require__.f.consumes`. The preset checks for this and fails early; bypass with `WENI_RSPACK_SKIP_PEER_CHECK=1`.

Re-run the install after every package rebuild.

## Debug

```bash
WENI_RSPACK_DEBUG=1 npm run dev
```

Prints the resolved config via `util.inspect`.

## What the preset generates

Given the usage example above, `defineWeniConfig` builds (invariants in **bold**):

| Option | Resolves to |
| --- | --- |
| `dirname` | `context`, `output.path` (`<dirname>/dist`), alias `@` → `<dirname>/src` |
| `port` | `devServer.port` and `devServer.client.webSocketURL` (`ws://localhost:<port>/ws`) |
| `entry` | `entry.main` |
| `federation.name` | Module Federation `name` and `output.uniqueName` |
| `federation.exposes` | Module Federation `exposes` |
| `federation.remotes.connect` | `connect@<url>/remoteEntry.js` (omitted when the URL is empty) |
| `pkg.dependencies` | `requiredVersion` for `pinia`, `vue-router`, `vue-i18n` |
| `PUBLIC_PATH_URL` | `output.publicPath` with a trailing slash, or `/` |
| `postcss: { prefix }` | `postcss-loader` + `postcss-prefixwrap(prefix)` on CSS/SCSS (omit or `false` to skip). Optional `prefixTransform` / `ignoredSelectors` |

Always included, not optional:

- **HMR (dev):** `vue-style-loader` + `css-loader`, Pinia store pre-loader, `hot: true`, `liveReload: false`, `experiments.css: false`
- **Prod styles:** native CSS (`experiments.css: true`), hashed JS filenames
- **vue-loader** + **builtin:swc-loader** for `.ts`
- **Sass:** `@use '@weni/unnnic-system/src/assets/scss/unnnic.scss' as *`
- **HtmlRspackPlugin** (`index.html`, inject `head`, chunk `main`)
- **DefinePlugin** (`process.env`, `import.meta.env.BASE_URL`)
- **Module Federation** `filename: remoteEntry.js`; shared `vue` (eager singleton `^3.0.0`)
- **Minimizers:** SWC + Lightning CSS (`chrome >= 87`, `edge >= 88`, `firefox >= 78`, `safari >= 14`)
- **Source maps (dev):** `eval-cheap-module-source-map` + `devtoolModuleFilenameTemplate` with POSIX paths
- **CORS** `Access-Control-Allow-Origin: *` on the dev server
- **`stats.warnings: false`**
