import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/mysql/queries';
import { getFromRedisOrFetch, setCache } from '@/lib/redis/functions';
import { User } from '@/types';
import { ONE_WEEK_TTL, USERS_CACHE_KEY } from '@/constants';
import serverLogger from '@/lib/logging/server';

export async function GET() {
	try {
		const cacheKey = `${USERS_CACHE_KEY}`;
		const users = await getFromRedisOrFetch<User[]>(
			cacheKey,
			async () => {
				const fetchedUsers = await getAllUsers();
				if (fetchedUsers) {
					await setCache(cacheKey, fetchedUsers, ONE_WEEK_TTL);
				}
				return fetchedUsers;
			},
			ONE_WEEK_TTL,
		);

		if (!users || users.length === 0) {
			return NextResponse.json({ error: 'No users found' }, { status: 404 });
		}

		return NextResponse.json(users);
	} catch (error) {
		serverLogger.error('Error fetching users:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
