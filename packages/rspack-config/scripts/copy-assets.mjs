import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');

await mkdir(join(dist, 'loaders'), { recursive: true });
await mkdir(join(dist, 'types'), { recursive: true });

await copyFile(
  join(src, 'loaders/pinia-hmr.js'),
  join(dist, 'loaders/pinia-hmr.js'),
);
await copyFile(
  join(src, 'loaders/package.json'),
  join(dist, 'loaders/package.json'),
);
await copyFile(
  join(src, 'types/webpackHot.d.ts'),
  join(dist, 'types/webpackHot.d.ts'),
);
