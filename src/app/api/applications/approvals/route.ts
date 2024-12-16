import { NextResponse } from 'next/server';
import { getApplicationApprovals } from '@/lib/mysql/queries';
import { getFromRedisOrFetch } from '@/lib/redis/functions';
import { APPLICATION_APPROVALS_CACHE_KEY, DEFAULT_TTL } from '@/constants';
import serverLogger from '@/lib/logging/server';

export async function GET() {
	try {
		const cacheKey = `${APPLICATION_APPROVALS_CACHE_KEY}`;

		const approvalData = await getFromRedisOrFetch(cacheKey, async () => getApplicationApprovals(), DEFAULT_TTL);

		serverLogger.debug(`Approval data: ${JSON.stringify(approvalData)}`);
		return NextResponse.json(approvalData);
	} catch (error) {
		serverLogger.error('Error fetching application approvals:', error);
		return NextResponse.json({ error: 'Failed to fetch application approvals' }, { status: 500 });
	}
}
