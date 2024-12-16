import { RowDataPacket } from 'mysql2/promise';
import { withTransaction } from '@/lib/mysql/connection';
import { Approver } from '@/types';
import crypto from 'crypto';
import serverLogger from '@/lib/logging/server';

export async function getApprovers(): Promise<Approver[]> {
	serverLogger.info('SQL: Retrieving all approvers');
	let approvers: (Approver & RowDataPacket)[] = [];
	await withTransaction(async (connection) => {
		[approvers] = await connection.query<(Approver & RowDataPacket)[]>(
			'SELECT BIN_TO_UUID(id) as id, type, displayName, identifier, createdAt, BIN_TO_UUID(createdById) as createdById FROM approvers ORDER BY createdAt DESC',
		);
	});
	return approvers;
}

export async function addApprover(approver: Omit<Approver, 'id' | 'createdAt'>): Promise<string> {
	serverLogger.info(`SQL: Adding approver: ${JSON.stringify(approver)}`);
	const id = crypto.randomUUID();
	await withTransaction(async (connection) => {
		await connection.query(
			'INSERT INTO approvers (id, type, displayName, identifier, createdById) VALUES (UUID_TO_BIN(?), ?, ?, ?, UUID_TO_BIN(?))',
			[id, approver.type, approver.displayName, approver.identifier, approver.createdById],
		);
	});
	return id;
}

export async function removeApprover(id: string): Promise<void> {
	serverLogger.info(`SQL: Removing approver by id: ${id}`);
	await withTransaction(async (connection) => {
		await connection.query('DELETE FROM approvers WHERE id = UUID_TO_BIN(?)', [id]);
	});
}

export async function isApprover(identifier: string): Promise<boolean> {
	serverLogger.info(`SQL: Checking if approver exists by identifier: ${identifier}`);
	let result: (RowDataPacket & { count: number })[] = [];
	await withTransaction(async (connection) => {
		[result] = await connection.query<(RowDataPacket & { count: number })[]>(
			'SELECT COUNT(*) as count FROM approvers WHERE identifier = ?',
			[identifier],
		);
	});
	return result[0].count > 0;
}
