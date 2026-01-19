/**
 * Performance Optimization Utilities
 * Helps reduce re-renders, optimize data processing, and improve app responsiveness
 */

/**
 * Debounce function to limit how often a function can be called
 * Useful for search inputs, window resize handlers, etc.
 */
export const debounce = (func, delay = 300) => {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle function to ensure a function is called at most once per time interval
 * Useful for scroll handlers, resize handlers
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return function throttled(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Virtual scroll utility for rendering large lists
 * Only renders visible items + buffer to reduce DOM nodes
 */
export class VirtualScroller {
  constructor(items, itemHeight, containerHeight, bufferSize = 5) {
    this.items = items;
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
    this.bufferSize = bufferSize;
    this.scrollOffset = 0;
  }

  setScrollOffset(offset) {
    this.scrollOffset = Math.max(0, offset);
  }

  getVisibleRange() {
    const startIndex = Math.max(
      0,
      Math.floor(this.scrollOffset / this.itemHeight) - this.bufferSize
    );
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight) + this.bufferSize * 2;
    const endIndex = Math.min(startIndex + visibleCount, this.items.length);

    return {
      startIndex,
      endIndex,
      offset: startIndex * this.itemHeight,
      visibleItems: this.items.slice(startIndex, endIndex),
    };
  }

  getTotalHeight() {
    return this.items.length * this.itemHeight;
  }
}

/**
 * Lazy load images with intersection observer
 * Requires img elements to have data-src attribute
 */
export const lazyLoadImages = () => {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach((img) => {
      observer.observe(img);
    });

    return observer;
  }
};

/**
 * Memoization helper for expensive computations
 */
export const memoize = (func) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = func(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Request idle callback polyfill for scheduling non-urgent work
 */
export const scheduleIdleTask = (callback) => {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback);
  } else {
    return setTimeout(callback, 1);
  }
};

/**
 * Performance monitoring utility
 */
export const measurePerformance = (name, func) => {
  const start = performance.now();
  const result = func();
  const end = performance.now();
  console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  return result;
};

/**
 * Async performance measurement
 */
export const measurePerformanceAsync = async (name, func) => {
  const start = performance.now();
  const result = await func();
  const end = performance.now();
  console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  return result;
};

/**
 * Generate unique cache key for memoization
 */
export const getCacheKey = (...args) => {
  return JSON.stringify(args);
};

/**
 * Batch multiple state updates to reduce re-renders
 * Usage: const batchUpdate = createBatcher();
 *        batchUpdate(() => setState1(...));
 *        batchUpdate(() => setState2(...));
 *        // All updates applied in single render
 */
export const createBatcher = (flushCallback) => {
  let updates = [];
  let isScheduled = false;

  return (updateFn) => {
    updates.push(updateFn);

    if (!isScheduled) {
      isScheduled = true;
      scheduleIdleTask(() => {
        updates.forEach((fn) => fn());
        flushCallback();
        updates = [];
        isScheduled = false;
      });
    }
  };
};
