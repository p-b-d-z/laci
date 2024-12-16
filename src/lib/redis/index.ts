import Redis from 'ioredis';
import { isRedisConfigured, REDIS_CONFIG } from '@/lib/redis/config';

let redis: Redis | null = null;
let redisHost: string = 'none';

if (isRedisConfigured()) {
	redis = new Redis({
		...REDIS_CONFIG,
		maxRetriesPerRequest: 1,
		retryStrategy: (times) => {
			if (times > 3) {
				console.warn('Redis connection failed, operating without cache');
				return null; // Stop retrying
			}
			return Math.min(times * 100, 3000); // Retry with exponential backoff
		},
	});

	redisHost = redis.options.host || process.env.REDIS_HOST || 'none';

	redis.on('error', (error) => {
		console.error('Redis error:', error);
		redis = null;
		redisHost = 'none';
	});
} else {
	console.warn('Redis is not configured');
}
export default redis;
export { redisHost };
