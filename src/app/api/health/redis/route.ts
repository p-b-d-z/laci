import { NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/redis/functions';
import redis from '@/lib/redis/index';
import { RedisValue } from '@/types';
import serverLogger from '@/lib/logging/server';
import { isRedisConfigured } from '@/lib/redis/config';

const TEST_REDIS_KEY = 'health';
const TEST_REDIS_VALUE = { status: 'ok' };

export async function GET() {
	const connectionHost = process.env.REDIS_HOST || 'Unknown';
	const isConfigured = isRedisConfigured();
	let connectionStatus: string;
	let canRead = 'Unknown';
	let canWrite = 'Unknown';

	if (!redis) {
		serverLogger.error('Failed to get Redis client');
	}
	if (!process.env.REDIS_HOST) {
		serverLogger.error('Failed to read environment variable: REDIS_HOST');
	}
	if (!process.env.REDIS_PORT) {
		serverLogger.error('Failed to read environment variable: REDIS_PORT');
	}
	if (!isConfigured) {
		serverLogger.error('Redis is not configured!');
	}

	if (isConfigured && connectionHost !== 'Unknown') {
		try {
			// Test write operation
			serverLogger.info(`Redis host: ${process.env.REDIS_HOST?.toString()}:${process.env.REDIS_PORT?.toString()}`);
			const cacheResult = await setCache(TEST_REDIS_KEY, TEST_REDIS_VALUE, 30);
			serverLogger.info('setCache attempt', cacheResult);
			canWrite = 'ok';

			// Test read operation
			const value = (await getCache(TEST_REDIS_KEY)) as RedisValue;
			serverLogger.info('getCache attempt', value);
			canRead = value && value.status === TEST_REDIS_VALUE.status ? 'ok' : 'failed';
			connectionStatus = 'ok';
		} catch (error) {
			serverLogger.error('Redis check failed:', error);
			connectionStatus = 'Failed';
			if (canWrite === 'Unknown') canWrite = 'failed';
			if (canRead === 'Unknown') canRead = 'failed';
		}
	} else {
		connectionStatus = 'Redis not initialized';
	}

	return NextResponse.json({ connectionHost, connectionStatus, canRead, canWrite });
}
