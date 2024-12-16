import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { withTransaction } from '@/lib/mysql/connection';
import { User, CreateUserInput } from '@/types';
import serverLogger from '@/lib/logging/server';

// User queries
export async function getUserById(id: string): Promise<User | null> {
	serverLogger.info(`SQL: Retrieving user by id: ${id}`);
	return withTransaction(async (connection) => {
		const [result] = await connection.query<(User & RowDataPacket)[]>(
			'SELECT BIN_TO_UUID(id) as id, name, email, enabled, first_logon, last_logon FROM users WHERE id = UUID_TO_BIN(?)',
			[id],
		);
		return result.length > 0 ? result[0] : null;
	});
}

export async function getUserByEmail(email: string): Promise<User | null> {
	serverLogger.info(`SQL: Retrieving user by email: ${email}`);
	return withTransaction(async (connection) => {
		const [result] = await connection.query<(User & RowDataPacket)[]>(
			'SELECT BIN_TO_UUID(id) as id, name, email, enabled, first_logon, last_logon FROM users WHERE email = ?',
			[email],
		);
		return result.length > 0 ? result[0] : null;
	});
}

export async function createUser(user: CreateUserInput): Promise<string> {
	serverLogger.info(`SQL: Creating user: ${JSON.stringify(user)}`);
	return withTransaction(async (connection) => {
		const [result] = await connection.query<ResultSetHeader>('INSERT INTO users (id, name, email) VALUES (UUID_TO_BIN(UUID()), ?, ?)', [
			user.name,
			user.email,
		]);
		serverLogger.debug(`User created: ${result}`);
		const [newUser] = await connection.query<(User & RowDataPacket)[]>(
			'SELECT BIN_TO_UUID(id) as id FROM users WHERE id = LAST_INSERT_ID()',
		);
		serverLogger.debug(`New user id: ${newUser[0].id}`);
		return newUser[0].id;
	});
}

export async function updateUserLastLogon(id: string): Promise<void> {
	serverLogger.info(`SQL: Updating user last logon by id: ${id}`);
	await withTransaction(async (connection) => {
		await connection.query('UPDATE users SET last_logon = CURRENT_TIMESTAMP WHERE id = UUID_TO_BIN(?)', [id]);
	});
}

export async function getAllUsers(): Promise<User[]> {
	serverLogger.info('SQL: Retrieving all users');
	return withTransaction(async (connection) => {
		const [rows] = await connection.query<(User & RowDataPacket)[]>(
			'SELECT BIN_TO_UUID(id) as id, name, email, enabled, first_logon, last_logon FROM users',
		);
		return rows;
	});
}
