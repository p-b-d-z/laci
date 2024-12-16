import { RowDataPacket } from 'mysql2/promise';
import { withTransaction } from '@/lib/mysql/connection';
import { Application } from '@/types';
import crypto from 'crypto';
import serverLogger from '@/lib/logging/server';

const SELECT_FIELDS = `
    BIN_TO_UUID(id) as id, 
    name, 
    enabled, 
    BIN_TO_UUID(createdById) as createdById, 
    BIN_TO_UUID(modifiedById) as modifiedById, 
    hitCount, 
    createdAt, 
    updatedAt
`;

export async function getApplication(id: string): Promise<Application | null> {
	serverLogger.info(`SQL: Retrieving application by id: ${id}`);
	return withTransaction(async (connection) => {
		const [rows] = await connection.query<(Application & RowDataPacket)[]>(
			`SELECT ${SELECT_FIELDS} FROM applications WHERE id = UUID_TO_BIN(?)`,
			[id],
		);
		return rows.length > 0 ? rows[0] : null;
	});
}

export async function getApplications(): Promise<Application[]> {
	serverLogger.info('SQL: Retrieving all applications');
	return withTransaction(async (connection) => {
		const [rows] = await connection.query<(Application & RowDataPacket)[]>(`SELECT ${SELECT_FIELDS} FROM applications`);
		return rows;
	});
}

export async function getApplicationByName(name: string): Promise<Application | null> {
	serverLogger.info(`SQL: Retrieving application by name: ${name}`);
	return withTransaction(async (connection) => {
		const [rows] = await connection.query<(Application & RowDataPacket)[]>(`SELECT ${SELECT_FIELDS} FROM applications WHERE name = ?`, [
			name,
		]);
		return rows.length > 0 ? rows[0] : null;
	});
}

export async function addApplication(application: Application): Promise<string> {
	const newId = crypto.randomUUID();
	serverLogger.info(`SQL: Adding application: ${JSON.stringify(application)}`);
	await withTransaction(async (connection) => {
		await connection.query(
			'INSERT INTO applications (id, name, enabled, createdById, modifiedById, hitCount, createdAt, updatedAt) VALUES (UUID_TO_BIN(?), ?, ?, UUID_TO_BIN(?), UUID_TO_BIN(?), ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
			[newId, application.name, application.enabled, application.createdById, application.modifiedById, application.hitCount],
		);
	});
	return newId;
}

export async function updateApplication(application: Application): Promise<void> {
	serverLogger.info(`SQL: Updating application: ${JSON.stringify(application.name)}`);
	await withTransaction(async (connection) => {
		await connection.query(
			'UPDATE applications SET name = ?, modifiedById = UUID_TO_BIN(?), hitCount = ?, updatedAt = CURRENT_TIMESTAMP, enabled = ? WHERE id = UUID_TO_BIN(?)',
			[application.name, application.modifiedById, application.hitCount, application.enabled, application.id],
		);
	});
}

export async function deleteApplication(id: string): Promise<void> {
	serverLogger.info(`SQL: Deleting application by id: ${id}`);
	await withTransaction(async (connection) => {
		await connection.query('DELETE FROM applications WHERE id = UUID_TO_BIN(?)', [id]);
	});
}
