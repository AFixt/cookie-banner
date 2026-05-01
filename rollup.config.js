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

export default {
  input: 'src/js/index.js',
  output: [
    {
      file: `${outputDir}/cookie-banner.js`,
      format: 'umd',
      name: 'CookieBanner',
      exports: 'named',
      sourcemap: !production,
    },
    {
      file: `${outputDir}/cookie-banner.min.js`,
      format: 'umd',
      name: 'CookieBanner',
      exports: 'named',
      plugins: [terser()],
      sourcemap: !production,
    },
    {
      file: `${outputDir}/cookie-banner.esm.js`,
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
        { src: 'src/locales/*', dest: `${outputDir}/locales` },
        { src: 'src/html/banner.html', dest: `${outputDir}/examples` },
        { src: 'src/html/preferences-modal.html', dest: `${outputDir}/examples` },
        { src: 'examples/*', dest: `${outputDir}/examples` },
        { src: 'src/types', dest: `${outputDir}` },
        { src: 'README.md', dest: outputDir },
        { src: 'LICENSE', dest: outputDir },
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
