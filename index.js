/**
 * Main entry point for the accessible cookie banner library
 * 
 * This file is used as the CommonJS entry point for the package.
 * The actual implementation is built to dist/cookie-banner.js during the build process.
 * 
 * Note: The dist folder is created during 'npm run build' and contains the bundled code.
 * For development, use 'npm run dev' to watch and rebuild on changes.
 */

// Re-export the built bundle for CommonJS environments
// The dist folder is generated during build and should not be committed to git
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  try {
    module.exports = require('./dist/cookie-banner.js');
  } catch (error) {
    console.error('Cookie banner distribution not found. Please run "npm run build" first.');
    throw error;
  }
}