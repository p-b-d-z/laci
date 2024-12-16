/*
Entries keys and data types:
- assignedUsers: string[]
- createdBy: string
- modifiedBy: string
- createdAt: string
- updatedAt: string
*/

import { NextResponse } from 'next/server';
import { findAndReplaceUsers } from '@/lib/find-replace';
import serverLogger from '@/lib/logging/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import { getUserByEmail } from '@/lib/mysql/queries';

export async function POST(request: Request, { params }: { params: { applicationId: string } }) {
	try {
		const session = await getServerSession(authOptions);
		if (!session || !session.user || !session.user.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const user = await getUserByEmail(session.user.email);
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const { findUser, replaceUser } = await request.json();
		const { applicationId } = params;

		if (!findUser || !replaceUser) {
			return NextResponse.json({ error: 'Both findUser and replaceUser are required' }, { status: 400 });
		}

		const replacedCount = await findAndReplaceUsers(applicationId !== 'all' ? applicationId : null, findUser, replaceUser, user.id);

		return NextResponse.json({ replacedCount });
	} catch (error) {
		serverLogger.error('Error in find-replace operation:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
