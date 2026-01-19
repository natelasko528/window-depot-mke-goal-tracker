// IndexedDB Storage Adapter
// Provides window.storage API using IndexedDB for persistence

const DB_NAME = 'WindowDepotTracker';
const DB_VERSION = 1;
const STORE_NAME = 'data';

let db = null;

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
  });
};

// Storage API implementation
const storage = {
  async get(key, defaultValue = null) {
    try {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          if (request.result) {
            try {
              // Handle different value types
              if (typeof request.result === 'string') {
                // Try to parse as JSON, but fallback to plain string if invalid
                try {
                  const parsed = JSON.parse(request.result);
                  resolve(parsed);
                } catch (parseError) {
                  // Not valid JSON, return as plain string
                  resolve(request.result);
                }
              } else {
                // Already an object/array, return as-is
                resolve(request.result);
              }
            } catch (error) {
              console.error(`Storage get parse error for ${key}:`, error);
              resolve(defaultValue);
            }
          } else {
            resolve(defaultValue);
          }
        };

        request.onerror = () => {
          console.error(`Storage get error for ${key}:`, request.error);
          resolve(defaultValue);
        };
      });
    } catch (error) {
      console.error(`Storage get error for ${key}:`, error);
      return defaultValue;
    }
  },

  async set(key, value, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const database = await initDB();
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        
        return new Promise((resolve, reject) => {
          const transaction = database.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.put(serialized, key);

          request.onsuccess = () => {
            resolve(true);
          };

          request.onerror = () => {
            if (attempt === retries) {
              console.error(`Storage set error for ${key} (attempt ${attempt}):`, request.error);
              reject(new Error(`Failed to save ${key} after ${retries} attempts`));
            } else {
              reject(request.error);
            }
          };
        });
      } catch (error) {
        console.error(`Storage set error for ${key} (attempt ${attempt}):`, error);
        if (attempt === retries) {
          throw new Error(`Failed to save ${key} after ${retries} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    return false;
  },

  async delete(key) {
    try {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error(`Storage delete error for ${key}:`, request.error);
          resolve(false);
        };
      });
    } catch (error) {
      console.error(`Storage delete error for ${key}:`, error);
      return false;
    }
  },
};

// Make storage available globally
if (typeof window !== 'undefined') {
  window.storage = storage;
}

export default storage;
