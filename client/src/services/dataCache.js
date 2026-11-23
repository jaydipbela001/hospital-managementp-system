/**
 * In-memory client-side cache with Time-To-Live (TTL).
 * Supports Stale-While-Revalidate and 5-minute cache for static data
 * (Doctors, Departments).
 */

const cacheStore = new Map();
const DEFAULT_STATIC_TTL = 5 * 60 * 1000; // 5 minutes

export const dataCache = {
  get(key, maxAge = null) {
    const entry = cacheStore.get(key);
    if (!entry) return null;
    if (maxAge && Date.now() - entry.timestamp > maxAge) {
      cacheStore.delete(key);
      return null;
    }
    return entry.data;
  },

  set(key, data) {
    cacheStore.set(key, { data, timestamp: Date.now() });
  },

  // Per-section persistent limit preference in localStorage
  getLimit(section, defaultVal = 5) {
    const stored = localStorage.getItem(`hms_limit_${section}`);
    if (stored) {
      const n = Number(stored);
      if (n === 5 || n === 10) return n;
    }
    return defaultVal;
  },

  setLimit(section, limitVal) {
    localStorage.setItem(`hms_limit_${section}`, String(limitVal));
  },

  // Specialized 5-minute TTL check for static resources (Doctors, Departments)
  getStatic(key) {
    return this.get(key, DEFAULT_STATIC_TTL);
  },

  clear(key) {
    if (key) {
      cacheStore.delete(key);
    } else {
      cacheStore.clear();
    }
  },
};

