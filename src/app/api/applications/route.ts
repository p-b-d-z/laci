/*
This route is used to get, create, update, and delete applications.
GET:
- Get all applications

POST:
- Create a new application (generate a GUID and initialize all LACI fields in SSM)

*/

import { NextRequest, NextResponse } from 'next/server';
import { getFromRedisOrFetch, setCache } from '@/lib/redis/functions';
import { APPLICATIONS_CACHE_KEY, DEFAULT_TTL } from '@/constants';
import serverLogger from '@/lib/logging/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import { getApplications, getApplicationByName, addApplication, getUserByEmail, insertAuditLog } from '@/lib/mysql/queries';
import { Application } from '@/types';
import { stripAuditLogKeys } from '@/lib/general';

export async function GET(request: NextRequest) {
	try {
		const showDisabled = request.nextUrl.searchParams.get('showDisabled') === 'true';
		const applications = await getFromRedisOrFetch<Application[]>(APPLICATIONS_CACHE_KEY, getApplications, DEFAULT_TTL);
		const filteredApplications = showDisabled ? applications : applications.filter((app) => app.enabled);

		serverLogger.debug('Filtered applications:', filteredApplications);
		return NextResponse.json(filteredApplications);
	} catch (error) {
		serverLogger.error('Error fetching applications:', error);
		return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
	}
}

export async function POST(req: Request) {
	const session = await getServerSession(authOptions);
	const body = await req.json();
	serverLogger.info('Received body:', body);
	const { name } = body;
	serverLogger.info('Creating application:', name);

	try {
		if (!session || !session.user || !session.user.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!name || typeof name !== 'string') {
			return NextResponse.json({ error: 'Invalid application name' }, { status: 400 });
		}

		const existingApp = await getApplicationByName(name);

		if (existingApp) {
			return NextResponse.json({ error: 'An application with this name already exists' }, { status: 400 });
		}

		const user = await getUserByEmail(session.user.email);

		if (!user) {
			return NextResponse.json({ error: 'Unknown user' }, { status: 403 });
		}

		const newApplication: Application = {
			id: '',
			name,
			enabled: true,
			createdById: user.id,
			modifiedById: user.id,
			hitCount: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const insertedId = await addApplication(newApplication);
		newApplication.id = insertedId;
		serverLogger.info('New id:', insertedId);
		serverLogger.info('New application:', newApplication);

		await setCache(APPLICATIONS_CACHE_KEY, null);

		// Create a changes object for the audit log
		const changes = stripAuditLogKeys({
			name: newApplication.name,
			enabled: newApplication.enabled,
			createdById: newApplication.createdById,
			modifiedById: newApplication.modifiedById,
			hitCount: newApplication.hitCount,
		});

		// Add audit log entry for application creation
		await insertAuditLog({
			actor: user.id,
			action: 'add',
			target: 'application',
			targetId: insertedId,
			changes,
		});
		serverLogger.info(`[CREATE] Added audit log entry for creating application: ${insertedId}`);

		return NextResponse.json(newApplication, { status: 201 });
	} catch (error) {
		serverLogger.error('Error creating application:', error);
		return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
	}
}
