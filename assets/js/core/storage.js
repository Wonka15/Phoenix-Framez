/**
 * Versioned local-storage adapter.
 * Storage errors are returned to callers so the UI can offer an export/recovery path.
 */
export function createStorage(onError = () => {}) {
  return {
    read(key, fallback) {
      try {
        const value = JSON.parse(localStorage.getItem(key));
        return value ?? fallback;
      } catch (error) {
        console.warn("[PhoenixFrame] Could not read local data:", error);
        onError(error, "read");
        return fallback;
      }
    },
    write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("[PhoenixFrame] Could not save local data:", error);
        onError(error, "write");
        return false;
      }
    }
  };
}
