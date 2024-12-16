import { RowDataPacket } from 'mysql2/promise';
import { withTransaction, withConnection } from '@/lib/mysql/connection';
import crypto from 'crypto';
import serverLogger from '@/lib/logging/server';

export async function getApprovalStatus(applicationId: string): Promise<{ approverId: string; approvedAt: string } | null> {
	return withConnection(async (connection) => {
		const [rows] = await connection.query<RowDataPacket[]>('SELECT approverId, approvedAt FROM approvals WHERE applicationId = ?', [
			applicationId,
		]);
		return rows[0] as { approverId: string; approvedAt: string } | null;
	});
}

export async function approveApplication(applicationId: string, approverId: string): Promise<void> {
	serverLogger.info(`SQL: Approving application by id: ${applicationId} with approver id: ${approverId}`);
	await withTransaction(async (connection) => {
		await connection.query(
			'INSERT INTO approvals (id, applicationId, approverId) VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?)) ON DUPLICATE KEY UPDATE approverId = UUID_TO_BIN(?), approvedAt = CURRENT_TIMESTAMP',
			[crypto.randomUUID(), applicationId, approverId, approverId],
		);

		await connection.query(
			'INSERT INTO audit (id, actor, action, target, targetId, changes) VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, UUID_TO_BIN(?), ?)',
			[
				crypto.randomUUID(),
				approverId,
				'change',
				'application',
				applicationId,
				JSON.stringify({ type: 'approval', status: 'approved' }),
			],
		);
	});
}

export async function revokeApproval(applicationId: string): Promise<void> {
	serverLogger.info(`SQL: Revoking approval for application by id: ${applicationId}`);
	await withTransaction(async (connection) => {
		await connection.query('DELETE FROM approvals WHERE applicationId = UUID_TO_BIN(?)', [applicationId]);
	});
}

export async function getApplicationApprovals(): Promise<
	{
		applicationId: string;
		approvalId: string;
		approverId: string;
		approvedAt: Date;
	}[]
> {
	serverLogger.info('SQL: Retrieving all approval details');
	return withConnection(async (connection) => {
		const [rows] = await connection.query<RowDataPacket[]>(
			`SELECT 
				BIN_TO_UUID(a.applicationId) as applicationId,
				BIN_TO_UUID(a.id) as approvalId,
				BIN_TO_UUID(a.approverId) as approverId,
				a.approvedAt
			FROM approvals a
			INNER JOIN applications app ON app.id = a.applicationId
			ORDER BY a.approvedAt DESC`,
		);
		return rows as {
			applicationId: string;
			approvalId: string;
			approverId: string;
			approvedAt: Date;
		}[];
	});
}
