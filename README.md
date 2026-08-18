# frontend-config

Shared frontend tooling for Weni microfrontends. Published on npm under the `@weni` scope.

## Packages

| Package | Status | Description |
| --- | --- | --- |
| [`@weni/rspack-config`](./packages/rspack-config) | v0.0.0 | Shared Rspack preset (`defineWeniConfig`) |
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

Publishing is handled by [Changesets](https://github.com/changesets/changesets) and npm Trusted Publishing (OIDC).

1. In the feature branch, run `npm run changeset` and commit the generated file under `.changeset/`.
2. Open a PR. CI runs `typecheck`, `build`, and `changeset status`.
3. Merge the PR into `main`. The Release workflow opens (or updates) a Release PR with version bumps and changelog entries.
4. Merge the Release PR. The same workflow publishes the packages to npm and creates git tags.
