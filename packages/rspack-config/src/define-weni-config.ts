import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspect } from 'node:util';

import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import type { Configuration, RuleSetRule } from '@rspack/core';
import dotenv from 'dotenv';
import HtmlRspackPlugin from 'html-rspack-plugin';
import { VueLoaderPlugin } from 'vue-loader';

import {
  canonicalPublicPath,
  formatRemotes,
  toPosixPath,
} from './helpers.js';
import type {
  WeniConfigOptions,
  WeniPostcssOptions,
  WeniRspackConfig,
} from './options.js';

type StyleLoaderItem = string | { loader: string; options?: Record<string, unknown> };

const require = createRequire(import.meta.url);

const BROWSER_TARGETS = [
  'chrome >= 87',
  'edge >= 88',
  'firefox >= 78',
  'safari >= 14',
];

const SCSS_ADDITIONAL_DATA = `@use '@weni/unnnic-system/src/assets/scss/unnnic.scss' as *;`;

function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

function resolvePostcssOptions(
  postcss: WeniConfigOptions['postcss'],
): WeniPostcssOptions | undefined {
  if (!postcss) return undefined;
  if (postcss === true) {
    throw new Error(
      "@weni/rspack-config: `postcss: true` needs a prefix. Use `postcss: { prefix: '.your-app' }`.",
    );
  }
  return postcss;
}

/**
 * Inline postcss-loader options so consumers can drop `postcss.config.js`.
 * `postcss-prefixwrap` is required lazily so apps that skip `postcss` do not
 * need the peer installed.
 *
 * Never pass `prefixRootTags: true`: on postcss-prefixwrap@1.58.0 it emits
 * invalid selectors like `.app .:root`, which drops the unnnic theme block.
 */
function postcssLoader(options: WeniPostcssOptions): StyleLoaderItem {
  const postcssPrefixwrap = require('postcss-prefixwrap') as (
    prefix: string,
    opts?: {
      prefixTransform?: WeniPostcssOptions['prefixTransform'];
      ignoredSelectors?: WeniPostcssOptions['ignoredSelectors'];
    },
  ) => unknown;

  const { prefix, prefixTransform, ignoredSelectors } = options;
  const prefixwrapOptions =
    prefixTransform || ignoredSelectors
      ? {
          ...(prefixTransform ? { prefixTransform } : {}),
          ...(ignoredSelectors ? { ignoredSelectors } : {}),
        }
      : undefined;

  return {
    loader: 'postcss-loader',
    options: {
      postcssOptions: {
        plugins: [postcssPrefixwrap(prefix, prefixwrapOptions)],
      },
    },
  };
}

/**
 * Absolute path to the Pinia HMR pre-loader shipped with this package.
 * `defineWeniConfig` wires this in development; named export for custom setups.
 */
export const piniaHmrLoaderPath = join(
  dirname(fileURLToPath(import.meta.url)),
  'loaders/pinia-hmr.js',
);

/**
 * Dev: vue-style-loader chain so Vue SFC blocks hot-reload.
 * Prod: native CSS (`experiments.css`) for hashed standalone CSS files.
 *
 * Reads `NODE_ENV` (same as the original agent-builder closure).
 */
export function styleRule(
  test: RegExp,
  loadersAfterCss: StyleLoaderItem[] = [],
): RuleSetRule {
  if (isDev()) {
    return {
      test,
      use: ['vue-style-loader', 'css-loader', ...loadersAfterCss],
      type: 'javascript/auto',
    };
  }

  return {
    test,
    use: [...loadersAfterCss],
    type: 'css',
  };
}

export function assetRules(): RuleSetRule[] {
  return [
    {
      test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'assets/images/[name]-[hash][ext]',
      },
    },
    {
      test: /\.(wav|mp3|ogg|aac|flac|m4a)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'assets/audio/[name]-[hash][ext]',
      },
    },
  ];
}

export function basePlugins(
  options: WeniConfigOptions,
): NonNullable<Configuration['plugins']> {
  const { pkg, federation, sharedDeps = {} } = options;
  const remotes = formatRemotes(federation.remotes);

  return [
    new HtmlRspackPlugin({
      template: './index.html',
      inject: 'head',
      chunks: ['main'],
    }),
    new rspack.DefinePlugin({
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
      'process.env': JSON.stringify(process.env),
      'import.meta.env': JSON.stringify({
        BASE_URL: '/',
      }),
    }),
    new VueLoaderPlugin(),
    new rspack.container.ModuleFederationPlugin({
      name: federation.name,
      filename: 'remoteEntry.js',
      exposes: federation.exposes,
      remotes,
      shared: {
        vue: {
          singleton: true,
          requiredVersion: '^3.0.0',
          eager: true,
        },
        pinia: {
          singleton: true,
          requiredVersion: pkg.dependencies?.pinia,
        },
        'vue-router': {
          singleton: true,
          requiredVersion: pkg.dependencies?.['vue-router'],
        },
        'vue-i18n': {
          singleton: true,
          requiredVersion: pkg.dependencies?.['vue-i18n'],
          eager: true,
        },
        ...sharedDeps,
      },
    }),
  ];
}

function debugConfig(config: WeniRspackConfig): void {
  if (process.env.WENI_RSPACK_DEBUG !== '1') return;

  console.log(
    '[@weni/rspack-config] resolved config:\n',
    inspect(config, { depth: 8, colors: true, compact: false }),
  );
}

/**
 * Factory for the shared Weni Rspack preset.
 *
 * Extracted from agent-builder-webapp (including PR 288 HMR), plus
 * `devtoolModuleFilenameTemplate` / `toPosixPath` from bulk_send.
 */
export function defineWeniConfig(
  options: WeniConfigOptions,
): WeniRspackConfig {
  dotenv.config({ path: join(options.dirname, '.env') });

  const { dirname: root, port, entry, federation, aliases = {}, plugins = [] } =
    options;
  const dev = isDev();
  const postcssOptions = resolvePostcssOptions(options.postcss);
  const postcssLoaders = postcssOptions ? [postcssLoader(postcssOptions)] : [];

  const config = defineConfig({
    ...(dev ? { devtool: 'eval-cheap-module-source-map' } : {}),
    context: root,
    devServer: {
      port,
      historyApiFallback: true,
      hot: true,
      liveReload: false,
      compress: true,
      headers: {
        // Module Federation cross-origin: the connect host fetches
        // `remoteEntry.js` from this dev server during local federation testing.
        'Access-Control-Allow-Origin': '*',
      },
      client: {
        // Federated: the host page may run on another origin/port, so the HMR
        // client must connect back to this remote's own websocket explicitly.
        webSocketURL: `ws://localhost:${port}/ws`,
      },
    },
    output: {
      path: resolve(root, './dist'),
      uniqueName: federation.name,
      publicPath: canonicalPublicPath(),
      filename: dev
        ? 'assets/js/[name].js'
        : 'assets/js/[name]-[contenthash].js',
      chunkFilename: dev
        ? 'assets/js/[name].js'
        : 'assets/js/[name]-[contenthash].js',
      assetModuleFilename: 'assets/[name]-[hash][ext]',
      devtoolModuleFilenameTemplate: (info) =>
        toPosixPath(info.absoluteResourcePath),
    },
    entry: {
      main: entry,
    },
    stats: {
      warnings: false,
    },
    resolve: {
      extensions: ['...', '.ts', '.vue'],
      alias: {
        '@': resolve(root, 'src'),
        ...aliases,
      },
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader',
          options: {
            experimentalInlineMatchResource: true,
          },
        },
        {
          test: /\.ts$/,
          exclude: [/node_modules/],
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
              },
            },
          },
          type: 'javascript/auto',
        },
        ...(dev
          ? [
              {
                test: /\.(js|ts)$/,
                include: [resolve(root, 'src/store')],
                exclude: [/node_modules/, /\.spec\./, /\.unit\./, /__tests__/],
                enforce: 'pre' as const,
                use: [piniaHmrLoaderPath],
              },
            ]
          : []),
        styleRule(/\.(scss|sass)$/, [
          ...postcssLoaders,
          {
            loader: 'sass-loader',
            options: {
              additionalData: SCSS_ADDITIONAL_DATA,
            },
          },
        ]),
        styleRule(/\.css$/, postcssLoaders),
        ...assetRules(),
      ],
    },
    plugins: [...basePlugins(options), ...plugins],
    optimization: {
      minimizer: [
        new rspack.SwcJsMinimizerRspackPlugin(),
        new rspack.LightningCssMinimizerRspackPlugin({
          minimizerOptions: { targets: BROWSER_TARGETS },
        }),
      ],
    },
    experiments: {
      // Native CSS is incompatible with vue-style-loader HMR; enable only in prod.
      css: !dev,
    },
  });

  const resolved = options.override ? options.override(config) : config;
  debugConfig(resolved);
  return resolved;
}
