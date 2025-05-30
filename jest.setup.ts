
// jest.setup.ts
import '@testing-library/jest-dom';

// Polyfill for crypto.randomUUID if it's not available (e.g., in some Node/JSDOM environments)
// Ensure crypto object exists
if (typeof global.crypto === 'undefined') {
  // @ts-ignore // Suppress TypeScript error for assigning to global
  global.crypto = {};
}

// Ensure crypto.randomUUID exists
if (typeof global.crypto.randomUUID === 'undefined') {
  // @ts-ignore // Suppress TypeScript error for assigning to global
  global.crypto.randomUUID = function randomUUID() {
    // Basic UUID v4 polyfill from MDN
    // https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID#polyfill
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

// Mock ResizeObserver
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}
