import { db } from '../store/db';

export async function getCache<T>(id: string): Promise<T | null> {
  try {
    const entry = await db.cache.get(id);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired
      await db.cache.delete(id);
      return null;
    }
    return entry.data as T;
  } catch (err) {
    console.error('Cache get error:', err);
    return null;
  }
}

export async function setCache(id: string, data: any, ttl = 1000 * 60 * 60 * 24): Promise<void> {
  try {
    await db.cache.put({
      id,
      data,
      timestamp: Date.now(),
      ttl
    });
  } catch (err) {
    console.error('Cache set error:', err);
  }
}

export async function clearCache(prefix?: string): Promise<void> {
  try {
    if (prefix) {
      const keys = await db.cache.toCollection().primaryKeys();
      const keysToDelete = keys.filter(k => String(k).startsWith(prefix));
      await db.cache.bulkDelete(keysToDelete);
    } else {
      await db.cache.clear();
    }
  } catch (err) {
    console.error('Cache clear error:', err);
  }
}
