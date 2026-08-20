import '@testing-library/jest-dom/vitest'

/**
 * jsdom ships no matchMedia. The settings layer asks it for the system
 * reduced-motion preference on nearly every render, so a quiet default lives
 * here rather than in each test. A test that needs `reduce` stubs it itself.
 */
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}
