import { RowDataPacket } from 'mysql2/promise';
import { withTransaction } from '@/lib/mysql/connection';
import { AuditLog, QueryParams } from '@/types';
import serverLogger from '@/lib/logging/server';

export async function insertAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
	/* Function for inserting audit log */
	serverLogger.info(`SQL: Inserting audit log: ${JSON.stringify(log)}`);
	await withTransaction(async (connection) => {
		await connection.query(
			'INSERT INTO audit (id, actor, action, target, targetId, changes) VALUES (UUID_TO_BIN(UUID()), UUID_TO_BIN(?), ?, ?, UUID_TO_BIN(?), ?)',
			[log.actor, log.action, log.target, log.targetId, JSON.stringify(log.changes)],
		);
	});
}

export async function getAuditLogs(lastDays?: number): Promise<AuditLog[]> {
	/* Function for retrieving audit logs */
	serverLogger.info(`SQL: Retrieving audit logs with lastDays: ${lastDays}`);
	const sql = `
		SELECT 
			BIN_TO_UUID(id) as id, 
			BIN_TO_UUID(actor) as actor, 
			action, 
			target, 
			BIN_TO_UUID(targetId) as targetId, 
			timestamp,
			changes
		FROM audit
		${lastDays !== undefined ? 'WHERE timestamp >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY)' : ''}
		ORDER BY timestamp DESC
	`;

	const params: QueryParams = lastDays !== undefined ? [lastDays] : [];

	return withTransaction(async (connection) => {
		const [rows] = await connection.query<(AuditLog & RowDataPacket)[]>(sql, params);
		return rows;
	});
}

export async function getAuditLogsAfterId(lastId: string | null, lastDays?: number): Promise<AuditLog[]> {
	/* Function for retrieving audit logs after a specific ID */
	serverLogger.info(`SQL: Retrieving audit logs after id: ${lastId} with lastDays: ${lastDays}`);
	let sql: string;
	const params: QueryParams = [];

	if (lastId === null) {
		/* If lastId is null, use a regular SELECT query */
		sql = `
			SELECT 
				BIN_TO_UUID(id) as id, 
				BIN_TO_UUID(actor) as actor, 
				action, 
				target, 
				BIN_TO_UUID(targetId) as targetId, 
				timestamp,
				changes
			FROM audit
			${lastDays !== undefined ? 'WHERE timestamp >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY)' : ''}
			ORDER BY timestamp DESC
		`;
		if (lastDays !== undefined) {
			params.push(lastDays);
		}
	} else {
		/* Use a regular SELECT query with a WHERE clause for the lastId */
		sql = `
			SELECT 
				BIN_TO_UUID(id) as id, 
				BIN_TO_UUID(actor) as actor, 
				action, 
				target, 
				BIN_TO_UUID(targetId) as targetId, 
				timestamp,
				changes
			FROM audit
			WHERE id > UUID_TO_BIN(?)
			${lastDays !== undefined ? 'AND timestamp >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY)' : ''}
			ORDER BY timestamp DESC
		`;
		params.push(lastId);
		if (lastDays !== undefined) {
			params.push(lastDays);
		}
	}

	return withTransaction(async (connection) => {
		const [rows] = await connection.query<(AuditLog & RowDataPacket)[]>(sql, params);
		return rows;
	});
}
