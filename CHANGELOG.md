# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.1.0](https://github.com/AFixt/cookie-banner/compare/v1.0.7...v1.1.0) (2026-04-07)


### Features

* **ci:** Implement AFixt repository standardization ([ada49db](https://github.com/AFixt/cookie-banner/commit/ada49db61d36d354725f164470513db1f2911bf6)), closes [#32](https://github.com/AFixt/cookie-banner/issues/32)
* **test:** Add visual regression test baselines ([5dfd215](https://github.com/AFixt/cookie-banner/commit/5dfd2158d9d661eb72d55b1debb2486e86bcdc6b))


### Bug Fixes

* **ci:** Correct script names in CI workflow ([95da582](https://github.com/AFixt/cookie-banner/commit/95da5822f7adce423db501241572e98737e66514))
* **ci:** Make ESLint and Prettier checks non-blocking ([ed5384f](https://github.com/AFixt/cookie-banner/commit/ed5384f7247142810d4887d94c0aab740c6b4228)), closes [#32](https://github.com/AFixt/cookie-banner/issues/32)
* **ci:** Make visual tests non-blocking ([720de1a](https://github.com/AFixt/cookie-banner/commit/720de1aa3e5e54bcf2dcdb9ca67a4fe1ca610b69))
* **ci:** Remove CodeQL job that conflicts with default setup ([d7f7143](https://github.com/AFixt/cookie-banner/commit/d7f7143f26c8b5afcbbe644042119cc4021de213))
* **ci:** Run CI workflow on PRs to develop branch ([631e5bd](https://github.com/AFixt/cookie-banner/commit/631e5bdb94fe2e4d37c1fabcbbd83dd425f7f208))
* **ci:** Start server before running visual tests ([4b61ff5](https://github.com/AFixt/cookie-banner/commit/4b61ff51e44f1eb84cc233612431d0256e92ad71))
* **lint:** Add reports directory to eslint ignore list ([d4fc748](https://github.com/AFixt/cookie-banner/commit/d4fc7483bd4ebbc9d1959b31fbea2d3d76598adc))
* **test:** Add toHaveScreenshot config for visual thresholds ([5589d10](https://github.com/AFixt/cookie-banner/commit/5589d1031b1dc66828cf2853276864fc323ecdfe))
* **test:** Correct visual tests URL and improve server wait ([907bb85](https://github.com/AFixt/cookie-banner/commit/907bb85b8108bfc0e4b4b5c8e4b306eb235b54f9))
* **test:** Increase maxDiffPixels to 25000 for cross-platform ([b2e31e5](https://github.com/AFixt/cookie-banner/commit/b2e31e5ce7c8fb725537f300c9c1c178506485e5))
* **test:** Increase visual comparison threshold for cross-platform ([df2fd56](https://github.com/AFixt/cookie-banner/commit/df2fd5617ec5309d47215b016364b469c05eb1c9))

### 1.0.7 (2026-02-01)


### Features

* **changelog:** Add automatic changelog generation ([16f3f07](https://github.com/AFixt/cookie-banner/commit/16f3f07384c861725c6310bf2668b5ac14c80d5b))


### Bug Fixes

* **core:** Resolve ESM timing issue and update gitignore ([43fca49](https://github.com/AFixt/cookie-banner/commit/43fca495f122ea9a1ce04cc6670bc6b3114ec51c))
* Properly set script src for non-blocked scripts ([aaf1e87](https://github.com/AFixt/cookie-banner/commit/aaf1e87a86ff309b7d5bc9909e5ccefdead7666e))
* resolve text scaling accessibility test failure ([a4747f4](https://github.com/AFixt/cookie-banner/commit/a4747f4cde1c38b2548a2210d36d8477d04339d0))
* **security:** Resolve CodeQL security alerts ([d9ba005](https://github.com/AFixt/cookie-banner/commit/d9ba00551fc6700afe509b971723182ed43a6616)), closes [#1-8](https://github.com/AFixt/cookie-banner/issues/1-8) [#13](https://github.com/AFixt/cookie-banner/issues/13)
* Update GitHub workflows and test configuration ([c94baba](https://github.com/AFixt/cookie-banner/commit/c94baba4071aae613dffea925708dcbdadec6ee2))


### Code Refactoring

* Clean up repository structure and remove unused files ([eda3ebd](https://github.com/AFixt/cookie-banner/commit/eda3ebd0b06433f529b420e6983934fa5cce1998))
* reorganize examples directory structure ([de8b8bd](https://github.com/AFixt/cookie-banner/commit/de8b8bddbe0683d632ef4b38bc7603b7dac43a7b))

### 1.0.6 (2026-02-01)


### Bug Fixes

* Properly set script src for non-blocked scripts ([aaf1e87](https://github.com/AFixt/cookie-banner/commit/aaf1e87a86ff309b7d5bc9909e5ccefdead7666e))
* resolve text scaling accessibility test failure ([a4747f4](https://github.com/AFixt/cookie-banner/commit/a4747f4cde1c38b2548a2210d36d8477d04339d0))
* Update GitHub workflows and test configuration ([c94baba](https://github.com/AFixt/cookie-banner/commit/c94baba4071aae613dffea925708dcbdadec6ee2))


### Code Refactoring

* Clean up repository structure and remove unused files ([eda3ebd](https://github.com/AFixt/cookie-banner/commit/eda3ebd0b06433f529b420e6983934fa5cce1998))
* reorganize examples directory structure ([de8b8bd](https://github.com/AFixt/cookie-banner/commit/de8b8bddbe0683d632ef4b38bc7603b7dac43a7b))
