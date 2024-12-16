import { NextResponse } from 'next/server';
import { approveApplication, revokeApproval, insertAuditLog } from '@/lib/mysql/queries';
import { getCurrentUserId } from '@/lib/user';
import serverLogger from '@/lib/logging/server';
import { canApprove } from '@/lib/auth/admins';
import { APPLICATION_APPROVALS_CACHE_KEY } from '@/constants';
import { clearCache } from '@/lib/redis/functions';

async function clearApprovalCache(): Promise<void> {
	const cacheKey = `${APPLICATION_APPROVALS_CACHE_KEY}`;
	await clearCache(cacheKey);
}

export async function POST(request: Request, { params }: { params: { guid: string } }) {
	const { guid } = params;

	try {
		const { approve } = await request.json();
		const hasPermission = await canApprove();
		if (!hasPermission) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const userId = await getCurrentUserId();
		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		await clearApprovalCache();

		if (approve) {
			await approveApplication(guid, userId);
			await insertAuditLog({
				actor: userId,
				action: 'change',
				target: 'application',
				targetId: guid,
				changes: { approval: 'approved' },
			});
		} else {
			await revokeApproval(guid);
			await insertAuditLog({
				actor: userId,
				action: 'change',
				target: 'application',
				targetId: guid,
				changes: { approval: 'revoked' },
			});
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		serverLogger.error('Error updating approval status:', error);
		return NextResponse.json({ error: 'Failed to update approval status' }, { status: 500 });
	}
}
