# Changesets

This folder is used by [`@changesets/cli`](https://github.com/changesets/changesets) to version and publish packages in this monorepo.

Run `npm run changeset` in a feature branch to describe what changed. Merging that PR into `main` opens a Release PR. Merging the Release PR publishes `@weni/*` to npm.

See the [Changesets documentation](https://github.com/changesets/changesets) for details.
