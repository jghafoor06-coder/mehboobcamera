/**
 * Availability Cache Service
 *
 * Provides in-memory caching for rental and availability data to reduce
 * repeated Firestore reads across screens. Uses TTL-based expiry and
 * supports invalidation when data changes.
 *
 * Cache keys:
 *   - rentals:{itemId}  → Array of rental objects for an item
 *   - itemQty:{itemId}  → Total quantity for an item
 *   - allRentals        → All rentals across all customers (for dashboard)
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default

const cache = new Map();

/**
 * Get a cached value by key.
 * Returns null if not cached or expired.
 */
export const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

/**
 * Set a value in cache with optional TTL.
 */
export const setCache = (key, value, ttl = CACHE_TTL) => {
  cache.set(key, { value, timestamp: Date.now(), ttl });
};

/**
 * Invalidate (delete) a specific cache key.
 */
export const invalidateCache = (key) => {
  cache.delete(key);
};

/**
 * Invalidate all cache entries matching a prefix.
 * Useful when a rental is created/updated/deleted for a specific item.
 */
export const invalidateByPrefix = (prefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};

/**
 * Clear the entire cache.
 */
export const clearCache = () => {
  cache.clear();
};

/**
 * Get the number of active (non-expired) cache entries.
 */
export const getCacheSize = () => {
  let count = 0;
  for (const [, entry] of cache) {
    if (Date.now() - entry.timestamp <= entry.ttl) {
      count++;
    }
  }
  return count;
};

// ═══════════════════════════════════════════════════════════════════════
// Domain-specific cache helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Cache key generators for domain-specific data.
 */
export const cacheKeys = {
  rentalsForItem: (itemId) => `rentals:${itemId}`,
  itemQuantity: (itemId) => `itemQty:${itemId}`,
  allRentals: () => 'allRentals',
  equipmentAvailability: (itemId) => `equipAvail:${itemId}`,
};

/**
 * Get cached rentals for a specific item.
 * Returns the cached array or null.
 */
export const getCachedRentalsForItem = (itemId) => {
  return getCached(cacheKeys.rentalsForItem(itemId));
};

/**
 * Cache rentals for a specific item.
 */
export const setCachedRentalsForItem = (itemId, rentals) => {
  setCache(cacheKeys.rentalsForItem(itemId), rentals);
};

/**
 * Get cached total quantity for an item.
 * Returns the cached number or null.
 */
export const getCachedItemQuantity = (itemId) => {
  return getCached(cacheKeys.itemQuantity(itemId));
};

/**
 * Cache total quantity for an item.
 */
export const setCachedItemQuantity = (itemId, quantity) => {
  setCache(cacheKeys.itemQuantity(itemId), quantity);
};

/**
 * Get cached equipment availability snapshot.
 */
export const getCachedEquipmentAvailability = (itemId) => {
  return getCached(cacheKeys.equipmentAvailability(itemId));
};

/**
 * Cache equipment availability snapshot.
 */
export const setCachedEquipmentAvailability = (itemId, availability) => {
  setCache(cacheKeys.equipmentAvailability(itemId), availability);
};
