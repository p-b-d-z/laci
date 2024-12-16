import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/mysql/queries';
import { getFromRedisOrFetch, setCache } from '@/lib/redis/functions';
import { User } from '@/types';
import { ONE_WEEK_TTL } from '@/constants';
import serverLogger from '@/lib/logging/server';

export async function GET(request: NextRequest, { params }: { params: { guid: string } }) {
	const { guid } = params;

	try {
		const cacheKey = `user:${guid}`;
		const user = await getFromRedisOrFetch<User | null>(
			cacheKey,
			async () => {
				const fetchedUser = await getUserById(guid);
				if (fetchedUser) {
					await setCache(cacheKey, fetchedUser, ONE_WEEK_TTL);
				}
				return fetchedUser;
			},
			ONE_WEEK_TTL,
		);

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		return NextResponse.json(user);
	} catch (error) {
		serverLogger.error('Error fetching user:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
