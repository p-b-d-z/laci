import { NextResponse } from 'next/server';
import { getApprovers, addApprover, removeApprover } from '@/lib/mysql/queries';
import { getCurrentUserId } from '@/lib/user';
import { isAdmin } from '@/lib/auth/admins';
import { APPROVERS_CACHE_KEY, DEFAULT_TTL } from '@/constants';
import { getFromRedisOrFetch, clearCache } from '@/lib/redis/functions';
import serverLogger from '@/lib/logging/server';

export async function GET() {
	try {
		const approvers = await getFromRedisOrFetch(APPROVERS_CACHE_KEY, async () => getApprovers(), DEFAULT_TTL);
		serverLogger.debug(`Fetched approvers from cache: ${approvers}`);
		return NextResponse.json(approvers);
	} catch (error) {
		serverLogger.error('Error getting approvers:', error);
		return NextResponse.json({ error: 'Failed to get approvers' }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const userId = await getCurrentUserId();
		if (!userId || !(await isAdmin())) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { type, displayName, identifier } = await request.json();
		const id = await addApprover({ type, displayName, identifier, createdById: userId });
		await clearCache(APPROVERS_CACHE_KEY);

		return NextResponse.json({ id });
	} catch (error) {
		serverLogger.error('Error adding approver:', error);
		return NextResponse.json({ error: 'Failed to add approver' }, { status: 500 });
	}
}

export async function DELETE(request: Request) {
	try {
		const userId = await getCurrentUserId();
		if (!userId || !(await isAdmin())) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await request.json();
		await removeApprover(id);
		await clearCache(APPROVERS_CACHE_KEY);

		return NextResponse.json({ success: true });
	} catch (error) {
		serverLogger.error('Error removing approver:', error);
		return NextResponse.json({ error: 'Failed to remove approver' }, { status: 500 });
	}
}
