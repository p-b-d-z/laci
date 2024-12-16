import mysql, { PoolConnection } from 'mysql2/promise';
import serverLogger from '@/lib/logging/server';

const pool = mysql.createPool({
	host: process.env.MYSQL_HOST,
	port: parseInt(process.env.MYSQL_PORT || '3306', 10),
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DATABASE,
	connectionLimit: 10,
	waitForConnections: true,
	queueLimit: 0,
	enableKeepAlive: true,
	keepAliveInitialDelay: 0,
	connectTimeout: 10000,
	idleTimeout: 60000,
	maxIdle: 10,
});

async function closePool(): Promise<void> {
	try {
		await pool.end();
	} catch (error) {
		serverLogger.error('Error closing pool:', error);
	}
}

export async function withConnection<T>(operation: (connection: PoolConnection) => Promise<T>): Promise<T> {
	const connection = await pool.getConnection();
	try {
		return await operation(connection);
	} finally {
		connection.release();
	}
}

export async function withTransaction<T>(operation: (connection: PoolConnection) => Promise<T>): Promise<T> {
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();
		const result = await operation(connection);
		await connection.commit();
		return result;
	} catch (error) {
		await connection.rollback();
		throw error;
	} finally {
		connection.release();
	}
}

process.on('SIGTERM', async () => {
	await closePool();
	process.exit(0);
});

process.on('SIGINT', async () => {
	await closePool();
	process.exit(0);
});

export { closePool };
