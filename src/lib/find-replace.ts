import { getAllEntries, getEntriesByApplicationId, updateEntry } from '@/lib/mysql/queries';
import { Entry } from '@/types';
import serverLogger from '@/lib/logging/server';

export async function findAndReplaceUsers(
	applicationId: string | null,
	findUser: string,
	replaceUser: string,
	modifiedBy: string,
): Promise<number> {
	serverLogger.info('Starting find-and-replace operation');
	serverLogger.info(`Application ID: ${applicationId ? applicationId : 'All applications'}`);
	serverLogger.info(`Find: "${findUser}", Replace with: "${replaceUser}"`);

	let entries: Entry[];
	if (applicationId) {
		entries = await getEntriesByApplicationId(applicationId);
	} else {
		entries = await getAllEntries();
	}

	let replacedCount = 0;

	for (const entry of entries) {
		let wasUpdated = false;
		const updatedAssignedUsers = entry.assignedUsers.map((user: string) => {
			if (user === findUser) {
				wasUpdated = true;
				return replaceUser;
			}
			return user;
		});

		if (wasUpdated) {
			await updateEntry({
				...entry,
				assignedUsers: updatedAssignedUsers,
				modifiedById: modifiedBy,
			});
			replacedCount++;
		}
	}

	serverLogger.info(`Find-and-replace operation completed. Replaced ${replacedCount} entries.`);
	return replacedCount;
}
