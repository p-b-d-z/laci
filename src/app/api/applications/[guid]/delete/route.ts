/*
This route will be responsible for deleting an application by its GUID.

It will also delete all entries associated with the application.
*/
import { NextRequest, NextResponse } from 'next/server';
import {
	deleteApplication,
	deleteEntriesByApplicationId,
	getApplication,
	getEntriesByApplicationId,
	insertAuditLog,
} from '@/lib/mysql/queries';
import { removeCachedApplication, removeCachedEntries } from '@/lib/redis/functions';
import serverLogger from '@/lib/logging/server';
import { getCurrentUserId } from '@/lib/user';
import { getFromRedisOrFetch } from '@/lib/redis/functions';
import { Application } from '@/types';
import { stripAuditLogKeys } from '@/lib/general';

export async function DELETE(request: NextRequest, { params }: { params: { guid: string } }) {
	const { guid } = params;

	try {
		serverLogger.info(`[DELETE] Received delete request for application with GUID: ${guid}`);
		const currentUserId = await getCurrentUserId();
		if (!currentUserId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const application = await getFromRedisOrFetch<Application | null>(`application:${guid}`, async () => getApplication(guid));

		if (!application) {
			return NextResponse.json({ error: 'Application not found' }, { status: 404 });
		}

		// Get entries associated with the application
		const entries = await getEntriesByApplicationId(guid);
		serverLogger.info(`[DELETE] Found ${entries.length} entries associated with application: ${guid}`);

		// Delete the entries associated with the application
		await deleteEntriesByApplicationId(guid);
		serverLogger.info(`[DELETE] Successfully deleted entries for application: ${guid}`);

		// Delete the application from MySQL
		await deleteApplication(guid);
		serverLogger.info(`[DELETE] Successfully deleted application from MySQL: ${guid}`);

		// Remove the application from Redis cache
		await removeCachedApplication(guid);
		serverLogger.info(`[DELETE] Successfully removed cached application: ${guid}`);

		// Remove the LACI entries from Redis cache
		await removeCachedEntries(guid);
		serverLogger.info(`[DELETE] Successfully removed cached entries: ${guid}`);

		// Update audit log entry
		await insertAuditLog({
			actor: currentUserId,
			action: 'delete',
			target: 'application',
			targetId: guid,
			changes: stripAuditLogKeys(application),
		});
		serverLogger.info(`[DELETE] Added audit log entry for deleting application: ${guid}`);

		serverLogger.info(`[DELETE] Delete operation completed successfully for application: ${guid}`);
		return NextResponse.json({ message: 'Application and associated entries deleted successfully' }, { status: 200 });
	} catch (error) {
		serverLogger.error(`[DELETE] Error deleting application ${guid}:`, error);
		return NextResponse.json({ error: 'Failed to delete application and associated entries' }, { status: 500 });
	}
}
