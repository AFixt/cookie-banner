// Mock implementation of path module for testing

const path = jest.createMockFromModule('path');

// Mock of resolve
function resolve(...paths) {
  return paths.join('/');
}

path.resolve = resolve;

module.exports = path;
