import { RowDataPacket } from 'mysql2/promise';
import { withTransaction } from '@/lib/mysql/connection';
import { Category } from '@/types';
import crypto from 'crypto';
import serverLogger from '@/lib/logging/server';

// Category queries
export async function addCategory(category: Omit<Category, 'id' | 'order'>): Promise<string> {
	serverLogger.info(`SQL: Adding category: ${JSON.stringify(category)}`);
	const newId = crypto.randomUUID();

	return withTransaction(async (connection) => {
		const [orderResult] = await connection.query<(RowDataPacket & { maxOrder: number })[]>(
			'SELECT MAX(`order`) as maxOrder FROM categories',
		);
		const newOrder = (orderResult[0].maxOrder || 0) + 1;

		await connection.query('INSERT INTO categories (id, name, description, `order`) VALUES (UUID_TO_BIN(?), ?, ?, ?)', [
			newId,
			category.name,
			category.description,
			newOrder,
		]);

		return newId;
	});
}

export async function updateCategory(category: Category): Promise<void> {
	serverLogger.info(`SQL: Updating category: ${JSON.stringify(category)}`);
	await withTransaction(async (connection) => {
		await connection.query('UPDATE categories SET name = ?, description = ?, `order` = ? WHERE id = UUID_TO_BIN(?)', [
			category.name,
			category.description,
			category.order,
			category.id,
		]);
	});
}

export async function deleteCategory(id: string): Promise<void> {
	serverLogger.info(`SQL: Deleting category by id: ${id}`);
	await withTransaction(async (connection) => {
		await connection.query('DELETE FROM categories WHERE id = UUID_TO_BIN(?)', [id]);
	});
}

export async function getCategory(id: string): Promise<Category | null> {
	serverLogger.info(`SQL: Retrieving category by id: ${id}`);
	return withTransaction(async (connection) => {
		const [rows] = await connection.query<(Category & RowDataPacket)[]>(
			'SELECT BIN_TO_UUID(id) as id, name, description, `order` FROM categories WHERE id = UUID_TO_BIN(?)',
			[id],
		);
		return rows.length > 0 ? rows[0] : null;
	});
}

export async function getCategories(): Promise<Category[]> {
	serverLogger.info('SQL: Retrieving all categories');
	return withTransaction(async (connection) => {
		const [rows] = await connection.query<(Category & RowDataPacket)[]>(
			'SELECT BIN_TO_UUID(id) as id, name, description, `order` FROM categories ORDER BY `order`',
		);
		return rows;
	});
}
