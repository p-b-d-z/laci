import redis from '@/lib/redis/index';
import { DEFAULT_TTL, ENTRY_CACHE_KEY } from '@/constants';
import serverLogger from '@/lib/logging/server';
import { Application, Entry } from '@/types';

export async function getFromRedisOrFetch<T>(
	key: string,
	fetchFn: () => Promise<T>,
	expiration: number = DEFAULT_TTL,
	skipCache: boolean = false,
): Promise<T> {
	if (!redis) {
		serverLogger.info(`Redis unavailable, fetching data directly for key: ${key}`);
		return fetchFn();
	}
	if (!skipCache) {
		try {
			const cachedData = await redis.get(key);
			if (cachedData) {
				serverLogger.info(`[redis] Using cached data: ${key}`);
				return JSON.parse(cachedData) as T;
			}
		} catch (error) {
			serverLogger.warn(`Error reading from Redis for key ${key}:`, error);
		}
	}

	serverLogger.debug(`Cached data not found for: ${key}`);
	const data = await fetchFn();

	if (data && redis && !isEmptyData(data)) {
		try {
			if (!skipCache) {
				serverLogger.info(`Saving data to cache: ${key} (TTL: ${expiration})`);
				await redis.set(key, JSON.stringify(data), 'EX', expiration);
			} else {
				serverLogger.info(`Skipping cache update: ${key}`);
			}
		} catch (error) {
			serverLogger.warn(`Error writing to Redis for key ${key}:`, error);
		}
	}

	return data;
}

function isEmptyData(data: unknown): boolean {
	return (
		data === null ||
		data === undefined ||
		(Array.isArray(data) && data.length === 0) ||
		(typeof data === 'object' && Object.keys(data).length === 0)
	);
}

export async function getCachedApplications(): Promise<Application[] | null> {
	return getFromRedisOrFetch('applications', async () => null);
}

export async function cacheApplications(applications: Application[]): Promise<void> {
	if (!redis) {
		serverLogger.error('Failed to get Redis client');
		return;
	}
	if (!isEmptyData(applications)) {
		await redis.set('applications', JSON.stringify(applications), 'EX', DEFAULT_TTL);
	} else {
		serverLogger.info('Skipping caching of empty applications array');
	}
}

export async function getCache<T>(key: string): Promise<T | null> {
	return getFromRedisOrFetch(key, async () => null, DEFAULT_TTL);
}

export async function setCache(key: string, value: unknown, expirationInSeconds = DEFAULT_TTL): Promise<void> {
	if (!redis) {
		serverLogger.info(`Redis unavailable, skipping cache update for key: ${key}`);
		return;
	}

	if (isEmptyData(value)) {
		serverLogger.info(`Skipping cache update for key ${key} due to empty value`);
		return;
	}

	try {
		await redis.set(key, JSON.stringify(value), 'EX', expirationInSeconds);
		serverLogger.debug(`Updated cache: ${key} (TTL:${expirationInSeconds})`);
	} catch (error) {
		serverLogger.warn(`Error writing to Redis for key ${key}:`, error);
	}
}

export async function updateCachedApplication(application: Application): Promise<void> {
	const cachedApps = await getCachedApplications();
	if (cachedApps) {
		const updatedApps = cachedApps.map((app) => (app.id === application.id ? application : app));
		await cacheApplications(updatedApps);
	}
}

export async function removeCachedApplication(guid: string): Promise<void> {
	const cachedApps = await getCachedApplications();
	if (cachedApps) {
		const updatedApps = cachedApps.filter((app) => app.id !== guid);
		await cacheApplications(updatedApps);
	}
}

export async function clearCache(key: string): Promise<void> {
	if (!redis) {
		serverLogger.error('Failed to get Redis client');
		return;
	}
	await redis.del(key);
	serverLogger.info(`[src/lib/redis] Cleared cache for key: ${key}`);
}

export async function getCachedLaciEntries(applicationId: string): Promise<Entry[] | null> {
	const cacheKey = `${ENTRY_CACHE_KEY}:${applicationId}`;
	return getFromRedisOrFetch(cacheKey, async () => null);
}

export async function cacheLaciEntries(applicationId: string, entries: Entry[]): Promise<void> {
	if (!redis) {
		serverLogger.error('Failed to get Redis client');
		return;
	}
	const cacheKey = `${ENTRY_CACHE_KEY}:${applicationId}`;
	if (!isEmptyData(entries)) {
		await redis.set(cacheKey, JSON.stringify(entries), 'EX', DEFAULT_TTL);
	} else {
		serverLogger.info(`Skipping caching of empty LACI entries array for application ${applicationId}`);
	}
}

export async function removeCachedEntries(applicationId: string): Promise<void> {
	const cachedEntries = await getCachedLaciEntries(applicationId);
	if (cachedEntries) {
		const updatedEntries = cachedEntries.filter((entry) => entry.applicationId !== applicationId);
		await cacheLaciEntries(applicationId, updatedEntries);
		serverLogger.info(`Removed cached LACI entries for application ${applicationId}`);
	}
}

export async function getTTL(key: string): Promise<number | null> {
	if (!redis) {
		serverLogger.info(`Redis unavailable, cannot check TTL for key: ${key}`);
		return null;
	}

	try {
		const ttl = await redis.ttl(key);
		serverLogger.debug(`TTL for key ${key}: ${ttl} seconds`);
		return ttl;
	} catch (error) {
		serverLogger.warn(`Error checking TTL for key ${key}:`, error);
		return null;
	}
}
