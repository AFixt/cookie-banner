/**
 * Main entry point for the accessible cookie banner library
 */

// This file serves as the entry point when used via require('accessible-cookie-banner')
// It simply re-exports everything from the source entry point

// When using as a CommonJS module
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = require('./dist/cookie-banner.js');
}

// Content is automatically generated in the dist/cookie-banner.js file during build