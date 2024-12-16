import { NextRequest, NextResponse } from 'next/server';
import { updateField, getUserByEmail, insertAuditLog, getFields } from '@/lib/mysql/queries';
import { getFromRedisOrFetch, setCache } from '@/lib/redis/functions';
import { FIELDS_CACHE_KEY, ONE_WEEK_TTL } from '@/constants';
import serverLogger from '@/lib/logging/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import { Field } from '@/types';

export async function GET(
	request: NextRequest,
	{ params }: { params: { guid: string } },
): Promise<NextResponse<{ description: string } | { error: string }>> {
	try {
		const { guid } = params;
		const fields = await getFromRedisOrFetch<Field[]>(FIELDS_CACHE_KEY, getFields, ONE_WEEK_TTL);
		const field = fields.find((f) => f.id === guid);

		if (!field) {
			return NextResponse.json({ error: 'Field not found' }, { status: 404 });
		}

		return NextResponse.json({ description: field.description || '' }, { status: 200 });
	} catch (error) {
		serverLogger.error('Error getting field description:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: { guid: string } },
): Promise<NextResponse<{ message: string } | { error: string }>> {
	try {
		const { description } = (await request.json()) as { description: unknown };
		const { guid } = params;

		if (typeof description !== 'string') {
			return NextResponse.json({ error: 'Invalid description provided' }, { status: 400 });
		}

		const session = await getServerSession(authOptions);
		if (!session?.user?.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const user = await getUserByEmail(session.user.email);
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const fields = await getFromRedisOrFetch<Field[]>(FIELDS_CACHE_KEY, getFields, ONE_WEEK_TTL);
		const existingField = fields.find((f) => f.id === guid);

		if (!existingField) {
			return NextResponse.json({ error: 'Field not found' }, { status: 404 });
		}

		const updatedField: Field = {
			...existingField,
			description,
		};

		await updateField(updatedField);
		await setCache(FIELDS_CACHE_KEY, null);

		await insertAuditLog({
			actor: user.id,
			action: 'change',
			target: 'field',
			targetId: guid,
			changes: {
				description: {
					old: existingField.description || '',
					new: description,
				},
			},
		});
		serverLogger.info(`[UPDATE] Added audit log entry for updating field description: ${guid}`);

		return NextResponse.json({ message: 'Field description updated successfully' }, { status: 200 });
	} catch (error) {
		serverLogger.error('Error updating field description:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
