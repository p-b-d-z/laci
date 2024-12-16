import { NextResponse } from 'next/server';
import { getGroups } from '@/lib/auth/azure-auth';
import { getFromRedisOrFetch, setCache, getTTL } from '@/lib/redis/functions';
import { ONE_WEEK_TTL, AZURE_GROUPS_CACHE_KEY } from '@/constants';
import { AzureEntity } from '@/types';
import serverLogger from '@/lib/logging/server';

const REFRESH_THRESHOLD = 15 * 60; // 15 minutes in seconds

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const noCache = searchParams.has('noCache');

	try {
		const groups = await fetchGroups(noCache);
		return NextResponse.json(groups);
	} catch (error) {
		serverLogger.error('Error fetching groups:', error);
		return NextResponse.json(
			{
				error: 'Failed to fetch groups',
				details: error instanceof Error ? error.message : String(error),
				code: error instanceof Error && 'code' in error ? (error as { code?: string }).code : undefined,
			},
			{ status: 500 },
		);
	}
}

async function fetchGroups(forceUpdate = false): Promise<AzureEntity[]> {
	if (forceUpdate) {
		const groups = await getGroups();
		await setCache(AZURE_GROUPS_CACHE_KEY, groups, ONE_WEEK_TTL);
		return groups;
	}

	// Get current data from cache first
	const groups = await getFromRedisOrFetch<AzureEntity[]>(AZURE_GROUPS_CACHE_KEY, () => getGroups(), ONE_WEEK_TTL);

	// Check TTL and refresh in background if needed
	const ttl = await getTTL(AZURE_GROUPS_CACHE_KEY);
	if (ttl && ttl < REFRESH_THRESHOLD) {
		serverLogger.info(`Cache TTL (${ttl}s) below threshold, refreshing in background`);
		refreshCacheInBackground();
	}

	return groups;
}

async function refreshCacheInBackground() {
	try {
		const freshGroups = await getGroups();
		await setCache(AZURE_GROUPS_CACHE_KEY, freshGroups, ONE_WEEK_TTL);
		serverLogger.info('Background cache refresh completed');
	} catch (error) {
		serverLogger.error('Background cache refresh failed:', error);
	}
}
