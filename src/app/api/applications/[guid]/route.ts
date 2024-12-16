/*
This route is used to get an application referenced by GUID.
GET:
- Get a single application by ID and retrieve all child paths
- Return a dictionary created from the child paths

Applications are stored in MySQL and cached in Redis for performance.
@/lib/mysql/connection should be used to store MySQL related functions
@/lib/redis.ts should be used to store Redis related functions

*/

import { NextResponse } from 'next/server';
import { getApplications, updateApplication, insertAuditLog } from '@/lib/mysql/queries';
import { getFromRedisOrFetch, setCache } from '@/lib/redis/functions';
import serverLogger from '@/lib/logging/server';
import { getCurrentUserId } from '@/lib/user';
import { objectDiff, stripAuditLogKeys } from '@/lib/general';
import { APPLICATIONS_CACHE_KEY, DEFAULT_TTL } from '@/constants';
import { Application } from '@/types';

export async function GET(request: Request, { params }: { params: { guid: string } }) {
	const { guid } = params;

	try {
		const applications = await getFromRedisOrFetch<Application[]>(APPLICATIONS_CACHE_KEY, getApplications, DEFAULT_TTL);

		const application = applications.find((app) => app.id === guid);

		if (!application) {
			return NextResponse.json({ error: 'Application not found' }, { status: 404 });
		}
		return NextResponse.json(application);
	} catch (error) {
		serverLogger.error('Error fetching application:', error);
		return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
	}
}

export async function PUT(request: Request, { params }: { params: { guid: string } }) {
	const { guid } = params;

	try {
		const updatedData = await request.json();
		const currentUserId = await getCurrentUserId();

		if (!currentUserId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const applications = await getFromRedisOrFetch<Application[]>(APPLICATIONS_CACHE_KEY, getApplications, DEFAULT_TTL);

		const existingApp = applications.find((app) => app.id === guid);

		if (!existingApp) {
			return NextResponse.json({ error: 'Application not found' }, { status: 404 });
		}

		const updatedApp: Application = {
			...existingApp,
			...updatedData,
			modifiedById: currentUserId,
			updatedAt: new Date().toISOString(),
		};

		await updateApplication(updatedApp);
		// Clear cache to force refresh
		await setCache(APPLICATIONS_CACHE_KEY, null);

		const changes = objectDiff(existingApp, updatedApp);
		const strippedChanges = stripAuditLogKeys(changes);

		if (Object.keys(strippedChanges).length > 0) {
			await insertAuditLog({
				actor: currentUserId,
				action: 'change',
				target: 'application',
				targetId: guid,
				changes: strippedChanges,
			});
		}

		return NextResponse.json(updatedApp);
	} catch (error) {
		serverLogger.error('Error updating application:', error);
		return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
	}
}
