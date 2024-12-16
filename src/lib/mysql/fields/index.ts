import { RowDataPacket } from 'mysql2/promise';
import { withTransaction } from '@/lib/mysql/connection';
import { Field } from '@/types';
import serverLogger from '@/lib/logging/server';

// Field queries
export async function addField(field: Field): Promise<void> {
	serverLogger.info(`SQL: Adding field: ${JSON.stringify(field)}`);
	await withTransaction(async (connection) => {
		await connection.query('INSERT INTO fields (id, name, description, `order`) VALUES (UUID_TO_BIN(?), ?, ?, ?)', [
			field.id,
			field.name,
			field.description,
			field.order,
		]);
	});
}

export async function updateField(field: Partial<Field> & { id: string }): Promise<void> {
	serverLogger.info(`SQL: Updating field: ${JSON.stringify(field)}`);
	await withTransaction(async (connection) => {
		await connection.query('UPDATE fields SET name = ?, description = ?, `order` = ? WHERE id = UUID_TO_BIN(?)', [
			field.name,
			field.description,
			field.order,
			field.id,
		]);
	});
}

export async function deleteField(id: string): Promise<void> {
	serverLogger.info(`SQL: Deleting field by id: ${id}`);
	await withTransaction(async (connection) => {
		await connection.query('DELETE FROM fields WHERE id = UUID_TO_BIN(?)', [id]);
	});
}

export async function getField(id: string): Promise<Field | null> {
	serverLogger.info(`SQL: Retrieving field by id: ${id}`);
	return withTransaction(async (connection) => {
		const [result] = await connection.query<(Field & RowDataPacket)[]>(
			'SELECT BIN_TO_UUID(id) as id, name, description, `order` FROM fields WHERE id = UUID_TO_BIN(?)',
			[id],
		);
		return result.length > 0 ? result[0] : null;
	});
}

export async function getFields(): Promise<Field[]> {
	serverLogger.info('SQL: Retrieving all fields');
	return withTransaction(async (connection) => {
		const [rows] = await connection.query<(Field & RowDataPacket)[]>(
			'SELECT BIN_TO_UUID(id) as id, name, description, `order` FROM fields ORDER BY `order`',
		);
		return rows;
	});
}
