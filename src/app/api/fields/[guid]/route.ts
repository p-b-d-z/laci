/*
This route will be responsible for retrieving a field by its GUID.
*/

import { NextRequest, NextResponse } from 'next/server';
import { Field } from '@/types';
import { getFromRedisOrFetch, setCache } from '@/lib/redis/functions';
import { FIELDS_CACHE_KEY, ONE_WEEK_TTL } from '@/constants';
import serverLogger from '@/lib/logging/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import { getUserByEmail, insertAuditLog, getFields, updateField } from '@/lib/mysql/queries';
import { objectDiff } from '@/lib/general';

export async function GET(request: NextRequest, { params }: { params: { guid: string } }) {
	try {
		const { guid } = params;
		const fields = await getFromRedisOrFetch<Field[]>(FIELDS_CACHE_KEY, async () => await getFields(), ONE_WEEK_TTL);

		const field = fields?.find((f) => f.id === guid);
		if (!field) {
			return NextResponse.json({ error: 'Field not found' }, { status: 404 });
		}

		return NextResponse.json(field);
	} catch (error) {
		serverLogger.error('Error fetching field:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}

export async function PUT(request: NextRequest, { params }: { params: { guid: string } }) {
	try {
		const session = await getServerSession(authOptions);
		if (!session || !session.user || !session.user.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const user = await getUserByEmail(session.user.email);
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const { name, order } = await request.json();
		const { guid } = params;

		if (!name || typeof name !== 'string') {
			return NextResponse.json({ error: 'Invalid name provided' }, { status: 400 });
		}

		if (order !== undefined && (typeof order !== 'number' || order < 0)) {
			return NextResponse.json({ error: 'Invalid order provided' }, { status: 400 });
		}

		const fields = await getFromRedisOrFetch<Field[]>(FIELDS_CACHE_KEY, async () => await getFields(), ONE_WEEK_TTL);
		const existingField = fields?.find((f) => f.id === guid);

		if (!existingField) {
			return NextResponse.json({ error: 'Field not found' }, { status: 404 });
		}

		const updateData: Partial<Field> & { id: string } = { id: guid, name };
		if (order !== undefined) {
			updateData.order = order;
		}

		await updateField(updateData);

		// Invalidate cache
		await setCache(FIELDS_CACHE_KEY, null);

		// Get fresh data after update
		const updatedFields = await getFromRedisOrFetch<Field[]>(FIELDS_CACHE_KEY, async () => await getFields(), ONE_WEEK_TTL);
		const updatedField = updatedFields.find((f) => f.id === guid);

		if (existingField && updatedField) {
			const changes = objectDiff(existingField, updatedField);

			await insertAuditLog({
				actor: user.id,
				action: 'change',
				target: 'field',
				targetId: guid,
				changes: changes,
			});
			serverLogger.info(`[UPDATE] Added audit log entry for updating field: ${guid}`);
		} else {
			serverLogger.warn(`Unable to create audit log for field: ${guid}. Missing data.`);
		}

		return NextResponse.json(updatedField, { status: 200 });
	} catch (error) {
		serverLogger.error('Error updating field:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
