import '@testing-library/jest-dom'

// ResizeObserver is not available in jsdom. Provide a stub that fires once
// with a 800×600 rect so components that depend on it render correctly.
global.ResizeObserver = class ResizeObserver {
  private cb: ResizeObserverCallback
  constructor(cb: ResizeObserverCallback) { this.cb = cb }
  observe(el: Element) {
    this.cb(
      [{ contentRect: { width: 800, height: 600 } } as ResizeObserverEntry],
      this
    )
  }
  unobserve() {}
  disconnect() {}
}
