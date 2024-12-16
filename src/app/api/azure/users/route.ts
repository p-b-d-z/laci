import { NextResponse } from 'next/server';
import { getUsers } from '@/lib/auth/azure-auth';
import { getFromRedisOrFetch, setCache, getTTL } from '@/lib/redis/functions';
import { ONE_WEEK_TTL, AZURE_USERS_CACHE_KEY } from '@/constants';
import { AzureEntity } from '@/types';
import serverLogger from '@/lib/logging/server';

const REFRESH_THRESHOLD = 15 * 60;

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const noCache = searchParams.has('noCache');

	try {
		const users = await fetchUsers(noCache);
		return NextResponse.json(users);
	} catch (error) {
		serverLogger.error('Error fetching users:', error);
		return NextResponse.json(
			{
				error: 'Failed to fetch users',
				details: error instanceof Error ? error.message : String(error),
				code: error instanceof Error && 'code' in error ? (error as { code?: string }).code : undefined,
			},
			{ status: 500 },
		);
	}
}

async function fetchUsers(forceUpdate = false): Promise<AzureEntity[]> {
	if (forceUpdate) {
		const users = await getUsers();
		await setCache(AZURE_USERS_CACHE_KEY, users, ONE_WEEK_TTL);
		return users;
	}

	const users = await getFromRedisOrFetch<AzureEntity[]>(AZURE_USERS_CACHE_KEY, () => getUsers(), ONE_WEEK_TTL);

	const ttl = await getTTL(AZURE_USERS_CACHE_KEY);
	if (ttl && ttl < REFRESH_THRESHOLD) {
		serverLogger.info(`Users cache TTL (${ttl}s) below threshold, refreshing in background`);
		refreshUsersInBackground();
	}

	return users;
}

async function refreshUsersInBackground() {
	try {
		const freshUsers = await getUsers();
		await setCache(AZURE_USERS_CACHE_KEY, freshUsers, ONE_WEEK_TTL);
		serverLogger.info('Background users cache refresh completed');
	} catch (error) {
		serverLogger.error('Background users cache refresh failed:', error);
	}
}
