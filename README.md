# frontend-config

Shared frontend tooling for Weni microfrontends. Published on npm under the `@weni` scope.

## Packages

| Package | Status | Description |
| --- | --- | --- |
| [`@weni/rspack-config`](./packages/rspack-config) | v0.1.0 (unreleased) | Shared Rspack preset (`defineWeniConfig`) |
| `@weni/vitest-config` | later | Shared Vitest preset |
| `@weni/eslint-config` | later | Migrated from the standalone repo |

## Development

```bash
npm install
npm run build
npm run changeset
```

Requires Node.js 22.12 or later.

Local consumers can point at the package with `file:` or `npm link` after `npm run build`.

## Release

Changesets open a version PR on `main`. Merging that PR publishes `@weni/*` to npm.
