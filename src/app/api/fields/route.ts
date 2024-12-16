/*
This route will be responsible for enumerating all configured fields.

A field is a subtype of category. Categories contain 1 or more fields.
*/

import { NextResponse } from 'next/server';
import { getFields, addField } from '@/lib/mysql/queries';
import { getFromRedisOrFetch, clearCache } from '@/lib/redis/functions';
import { FIELDS_CACHE_KEY, ONE_WEEK_TTL } from '@/constants';
import { v4 as uuidv4 } from 'uuid';
import serverLogger from '@/lib/logging/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import { Field } from '@/types';
import { getUserByEmail, insertAuditLog } from '@/lib/mysql/queries';

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const noCache = searchParams.has('noCache') || false;

		const fields = await getFromRedisOrFetch(FIELDS_CACHE_KEY, getFields, ONE_WEEK_TTL, noCache);
		return NextResponse.json(fields);
	} catch (error) {
		serverLogger.error('Error fetching fields:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}

export async function PUT(request: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const user = await getUserByEmail(session.user.email);
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const { name } = await request.json();
		if (!name || typeof name !== 'string') {
			return NextResponse.json({ error: 'Invalid field name' }, { status: 400 });
		}

		const newField: Field = {
			id: uuidv4(),
			name,
			order: 0,
			description: '',
		};

		await addField(newField);
		await clearCache(FIELDS_CACHE_KEY);

		await insertAuditLog({
			actor: user.id,
			action: 'add',
			target: 'field',
			targetId: newField.id,
			changes: newField,
		});
		serverLogger.info(`[ADD] Added audit log entry for creating field: ${newField.id}`);

		return NextResponse.json(newField, { status: 201 });
	} catch (error) {
		serverLogger.error('Error creating field:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
