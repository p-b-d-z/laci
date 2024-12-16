import { NextResponse } from 'next/server';
import { updateCachedApplication } from '@/lib/redis/functions';
import { getFromRedisOrFetch } from '@/lib/redis/functions';
import serverLogger from '@/lib/logging/server';
import { getCurrentUserId } from '@/lib/user';
import { getApplicationByName, updateApplication, insertAuditLog, getApplications } from '@/lib/mysql/queries';
import { objectDiff } from '@/lib/general';
import { APPLICATIONS_CACHE_KEY, DEFAULT_TTL } from '@/constants';
import { Application } from '@/types';

export async function GET(request: Request, { params }: { params: { name: string } }) {
	const { name } = params;
	if (!name) {
		return NextResponse.json({ error: 'Invalid application name' }, { status: 400 });
	}

	try {
		const cleanName = name.replace(/-/g, ' ').replace(/%20/g, ' ').toLowerCase();
		const applications = await getFromRedisOrFetch<Application[]>(APPLICATIONS_CACHE_KEY, getApplications, DEFAULT_TTL);

		const application = applications.find((app) => app.name.toLowerCase() === cleanName);

		if (!application) {
			return NextResponse.json({ error: 'Application not found' }, { status: 404 });
		}

		return NextResponse.json(application);
	} catch (error) {
		serverLogger.error('Error fetching application:', error);
		return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
	}
}

export async function PUT(request: Request, { params }: { params: { name: string } }) {
	const { name } = params;

	try {
		const cleanName = name.replace(/-/g, ' ').replace(/%20/g, ' ').toLowerCase();
		const updatedData = await request.json();
		const currentUserId = await getCurrentUserId();

		if (!currentUserId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const existingApp = await getApplicationByName(cleanName);

		if (!existingApp) {
			return NextResponse.json({ error: 'Application not found' }, { status: 404 });
		}

		const updatedApp: Application = {
			...existingApp,
			...updatedData,
			modifiedById: currentUserId,
			updatedAt: new Date().toISOString(),
		};

		const changes = objectDiff(existingApp, updatedApp);

		await updateApplication(updatedApp);
		await updateCachedApplication(updatedApp);

		if (Object.keys(changes).length > 0) {
			await insertAuditLog({
				actor: currentUserId,
				action: 'change',
				target: 'application',
				targetId: existingApp.id,
				changes: changes,
			});
			serverLogger.info(`[UPDATE] Added audit log entry for updating application: ${existingApp.id}`);
		} else {
			serverLogger.info(`[UPDATE] No changes detected for application: ${existingApp.id}. Skipping audit log.`);
		}

		return NextResponse.json(updatedApp);
	} catch (error) {
		serverLogger.error('Error updating application:', error);
		return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
	}
}
