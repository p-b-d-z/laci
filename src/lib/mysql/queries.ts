import { withTransaction } from '@/lib/mysql/connection';
import serverLogger from '@/lib/logging/server';
import { RowDataPacket } from 'mysql2';

export async function validateTables(): Promise<boolean> {
	try {
		return await withTransaction(async (connection) => {
			const [rows] = await connection.query<RowDataPacket[]>(`
                SELECT COUNT(*) = 8 as valid
                FROM information_schema.tables 
                WHERE table_schema = 'laci_db'
                AND table_name IN (
                    'users',
                    'applications',
                    'categories',
                    'fields',
                    'entries',
                    'audit',
                    'approvals',
                    'approvers'
                )
            `);

			return (rows[0] as RowDataPacket)?.valid === 1;
		});
	} catch (error) {
		serverLogger.error('Error validating tables:', error);
		return false;
	}
}

export * from './applications';
export * from './categories';
export * from './fields';
export * from './entries';
export * from './users';
export * from './audit';
export * from './approvals';
export * from './approvers';
