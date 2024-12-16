/*
This route will be responsible for updating an application by its GUID.

PUT:
- Update the application's name

Applications are stored in MySQL and cached in Redis for performance.
@/lib/mysql/queries should be used to store MySQL related functions
@/lib/redis/functions should be used to store Redis related functions

*/
import { NextRequest, NextResponse } from 'next/server';
import { getApplication, updateApplication, getUserByEmail, insertAuditLog } from '@/lib/mysql/queries';
import { updateCachedApplication } from '@/lib/redis/functions';
import { Application } from '@/types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import serverLogger from '@/lib/logging/server';
import { objectDiff, stripAuditLogKeys } from '@/lib/general';

export async function PUT(request: NextRequest, { params }: { params: { guid: string } }) {
	const { guid } = params;
	serverLogger.info(`[UPDATE] Received update request for application with GUID: ${guid}`);

	try {
		const session = await getServerSession(authOptions);
		if (!session || !session.user || !session.user.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const user = await getUserByEmail(session.user.email);
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const updateData = await request.json();
		serverLogger.info(`[UPDATE] Update data received:`, updateData);

		// Fetch existing application data from MySQL
		const existingApp = await getApplication(guid);

		if (!existingApp) {
			serverLogger.warn(`[UPDATE] Application not found for GUID: ${guid}`);
			return NextResponse.json({ error: 'Application not found' }, { status: 404 });
		}

		// Merge update data with existing data
		const updatedApp: Application = {
			...existingApp,
			...updateData,
			modifiedById: user.id,
			updatedAt: new Date().toISOString(),
		};

		serverLogger.info(`[UPDATE] Merged application data:`, updatedApp);

		// Update MySQL database
		await updateApplication(updatedApp);
		serverLogger.info(`[UPDATE] Successfully updated MySQL database for application: ${guid}`);

		// Update Redis cache
		await updateCachedApplication(updatedApp);
		serverLogger.info(`[UPDATE] Successfully updated Redis cache for application: ${guid}`);

		// Create a diff of the changes
		const changes = objectDiff(existingApp, updatedApp);

		// Strip out specific keys from the changes
		const strippedChanges = stripAuditLogKeys(changes);

		// Only add audit log entry if there are changes
		if (Object.keys(strippedChanges).length > 0) {
			await insertAuditLog({
				actor: user.id,
				action: 'change',
				target: 'application',
				targetId: guid,
				changes: strippedChanges,
			});
			serverLogger.info(`[UPDATE] Added audit log entry for updating application: ${guid}`);
		} else {
			serverLogger.info(`[UPDATE] No changes detected for application: ${guid}. Skipping audit log.`);
		}

		serverLogger.info(`[UPDATE] Update operation completed successfully for application: ${guid}`);
		return NextResponse.json(updatedApp, { status: 200 });
	} catch (error) {
		serverLogger.error(`[UPDATE] Error updating application ${guid}:`, error);
		return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
	}
}
