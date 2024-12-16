import { RowDataPacket } from 'mysql2/promise';
import { withTransaction } from '@/lib/mysql/connection';
import { Entry } from '@/types';
import serverLogger from '@/lib/logging/server';

// Entry queries
export async function getAllEntries(): Promise<Entry[]> {
	serverLogger.info('SQL: Retrieving all entries');
	return withTransaction(async (connection) => {
		const [rows] = await connection.query<(Entry & RowDataPacket)[]>(
			'SELECT BIN_TO_UUID(id) as id, BIN_TO_UUID(applicationId) as applicationId, BIN_TO_UUID(categoryId) as categoryId, BIN_TO_UUID(fieldId) as fieldId, BIN_TO_UUID(createdById) as createdBy, BIN_TO_UUID(modifiedById) as modifiedBy, assignedUsers, createdAt, updatedAt FROM entries',
		);
		return rows;
	});
}

export async function getEntriesByApplicationId(applicationId: string): Promise<Entry[]> {
	serverLogger.info(`SQL: Retrieving entries by application id: ${applicationId}`);
	return withTransaction(async (connection) => {
		const [rows] = await connection.query<(Entry & RowDataPacket)[]>(
			'SELECT BIN_TO_UUID(id) as id, BIN_TO_UUID(applicationId) as applicationId, BIN_TO_UUID(categoryId) as categoryId, BIN_TO_UUID(fieldId) as fieldId, BIN_TO_UUID(createdById) as createdBy, BIN_TO_UUID(modifiedById) as modifiedBy, assignedUsers, createdAt, updatedAt FROM entries WHERE applicationId = UUID_TO_BIN(?)',
			[applicationId],
		);
		return rows;
	});
}

export async function addEntry(entry: Entry): Promise<void> {
	serverLogger.info(`SQL: Adding entry: ${JSON.stringify(entry)}`);
	await withTransaction(async (connection) => {
		// Check if the category exists
		const [categoryExists] = await connection.query<RowDataPacket[]>(
			'SELECT EXISTS(SELECT 1 FROM categories WHERE id = UUID_TO_BIN(?)) as category_exists',
			[entry.categoryId],
		);

		if (!categoryExists[0].category_exists) {
			throw new Error(`Category with id ${entry.categoryId} does not exist`);
		}

		// Check for existing entry
		const [existingEntries] = await connection.query<RowDataPacket[]>(
			'SELECT BIN_TO_UUID(id) as id FROM entries WHERE applicationId = UUID_TO_BIN(?) AND categoryId = UUID_TO_BIN(?) AND fieldId = UUID_TO_BIN(?)',
			[entry.applicationId, entry.categoryId, entry.fieldId],
		);

		if (existingEntries.length > 0) {
			await updateEntry({
				...entry,
				id: existingEntries[0].id,
			});
		} else {
			await connection.query(
				'INSERT INTO entries (id, applicationId, categoryId, fieldId, createdById, modifiedById, assignedUsers) VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?)',
				[
					entry.id,
					entry.applicationId,
					entry.categoryId,
					entry.fieldId,
					entry.createdById,
					entry.modifiedById,
					JSON.stringify(entry.assignedUsers),
				],
			);

			await connection.query('DELETE FROM approvals WHERE applicationId = UUID_TO_BIN(?)', [entry.applicationId]);
		}
	});
}

export async function updateEntry(entry: Entry): Promise<void> {
	serverLogger.info(`SQL: Updating entry: ${JSON.stringify(entry)}`);
	await withTransaction(async (connection) => {
		await connection.query(
			'UPDATE entries SET applicationId = UUID_TO_BIN(?), categoryId = UUID_TO_BIN(?), fieldId = UUID_TO_BIN(?), modifiedById = UUID_TO_BIN(?), updatedAt = CURRENT_TIMESTAMP, assignedUsers = ? WHERE id = UUID_TO_BIN(?)',
			[entry.applicationId, entry.categoryId, entry.fieldId, entry.modifiedById, JSON.stringify(entry.assignedUsers), entry.id],
		);

		await connection.query('DELETE FROM approvals WHERE applicationId = UUID_TO_BIN(?)', [entry.applicationId]);
	});
}

export async function deleteEntry(id: string): Promise<void> {
	serverLogger.info(`SQL: Deleting entry by id: ${id}`);
	await withTransaction(async (connection) => {
		const [entry] = await connection.query<RowDataPacket[]>(
			'SELECT BIN_TO_UUID(applicationId) as applicationId FROM entries WHERE id = UUID_TO_BIN(?)',
			[id],
		);

		if (entry && entry[0]) {
			await connection.query('DELETE FROM entries WHERE id = UUID_TO_BIN(?)', [id]);

			await connection.query('DELETE FROM approvals WHERE applicationId = UUID_TO_BIN(?)', [entry[0].applicationId]);
		}
	});
}

export async function deleteEntriesByApplicationId(applicationId: string): Promise<void> {
	serverLogger.info(`SQL: Deleting entries by application id: ${applicationId}`);
	await withTransaction(async (connection) => {
		await connection.query('DELETE FROM entries WHERE applicationId = UUID_TO_BIN(?)', [applicationId]);

		await connection.query('DELETE FROM approvals WHERE applicationId = UUID_TO_BIN(?)', [applicationId]);
	});
}
