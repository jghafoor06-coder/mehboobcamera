/**
 * Listener Management Service
 * 
 * Ensures listeners are created only once per session
 * Prevents duplicate subscriptions and memory leaks
 */

const listeners = {};

/**
 * Get or create a listener
 * @param {string} key - Unique listener identifier
 * @param {function} subscribeFn - Function that returns unsubscribe function
 * @returns {object} { unsubscribe, isNew }
 */
export const getOrCreateListener = (key, subscribeFn) => {
  if (listeners[key]) {
    return { unsubscribe: listeners[key].unsubscribe, isNew: false };
  }

  const unsubscribe = subscribeFn();
  listeners[key] = { unsubscribe, timestamp: Date.now() };
  return { unsubscribe, isNew: true };
};

/**
 * Remove a listener
 * @param {string} key - Unique listener identifier
 */
export const removeListener = (key) => {
  if (listeners[key]) {
    listeners[key].unsubscribe();
    delete listeners[key];
  }
};

/**
 * Get all active listeners
 */
export const getActiveListeners = () => {
  return Object.keys(listeners);
};

/**
 * Clear all listeners
 */
export const clearAllListeners = () => {
  Object.keys(listeners).forEach(key => {
    listeners[key].unsubscribe();
    delete listeners[key];
  });
};

export default {
  getOrCreateListener,
  removeListener,
  getActiveListeners,
  clearAllListeners,
};
