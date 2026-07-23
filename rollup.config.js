/**
 * Rollup configuration file
 */

import terser from '@rollup/plugin-terser';
import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';
import analyzer from 'rollup-plugin-analyzer';

const production = !process.env.ROLLUP_WATCH;
const outputDir = 'dist';

/**
 * Bundles are emitted as `consent.*` rather than `cookie-banner.*`.
 *
 * Ad-blocker annoyance lists (EasyList Cookie List, Fanboy's Annoyance List)
 * match the substring `cookie-banner` in request paths, so a script by that
 * name can be cancelled before it executes — taking the consent UI with it.
 * See https://github.com/AFixt/cookie-banner/issues/66.
 *
 * The legacy `cookie-banner.*` names are still emitted as copies so existing
 * `<script src>` references keep working. They are deprecated and will be
 * removed in the next major version.
 */
const LEGACY_ALIASES = [
  ['consent.js', 'cookie-banner.js'],
  ['consent.min.js', 'cookie-banner.min.js'],
  ['consent.esm.js', 'cookie-banner.esm.js'],
];

export default {
  input: 'src/js/index.js',
  output: [
    {
      file: `${outputDir}/consent.js`,
      format: 'umd',
      name: 'CookieBanner',
      exports: 'named',
      sourcemap: !production,
    },
    {
      file: `${outputDir}/consent.min.js`,
      format: 'umd',
      name: 'CookieBanner',
      exports: 'named',
      plugins: [terser()],
      sourcemap: !production,
    },
    {
      file: `${outputDir}/consent.esm.js`,
      format: 'es',
      exports: 'named',
      sourcemap: !production,
    },
  ],
  plugins: [
    resolve({
      browser: true,
    }),
    commonjs(),
    json(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
    }),
    copy({
      targets: [
        { src: 'src/css/banner.css', dest: outputDir },
        // The examples link `./banner.css`, so the stylesheet has to sit next
        // to them for the same reason consent.js does. See issue #72.
        { src: 'src/css/banner.css', dest: `${outputDir}/examples` },
        { src: 'src/locales/*', dest: `${outputDir}/locales` },
        // The bundle fetches `locales/<locale>.json` relative to the page, so
        // the language-switch demos need a copy under dist/examples/ too.
        // See issue #86.
        { src: 'src/locales/*', dest: `${outputDir}/examples/locales` },
        { src: 'examples/*', dest: `${outputDir}/examples` },
        { src: 'src/types', dest: `${outputDir}` },
        { src: 'README.md', dest: outputDir },
        { src: 'LICENSE', dest: outputDir },
      ],
    }),
    // Deprecated `cookie-banner.*` aliases. Runs at writeBundle so the renamed
    // bundles exist on disk by the time they are copied.
    copy({
      hook: 'writeBundle',
      targets: [
        ...LEGACY_ALIASES.map(([from, to]) => ({
          src: `${outputDir}/${from}`,
          dest: outputDir,
          rename: to,
        })),
        // The examples load `./consent.js`, so the copy under dist/examples/
        // is self-contained wherever it is served from. See issue #72.
        { src: `${outputDir}/consent.js`, dest: `${outputDir}/examples` },
      ],
    }),
    // Add bundle analyzer only in development or when explicitly requested
    process.env.ANALYZE &&
      analyzer({
        hideDeps: true,
        limit: 10,
        summaryOnly: true,
      }),
  ],
  watch: {
    clearScreen: false,
  },
};
