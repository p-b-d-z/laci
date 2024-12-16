export function isRedisConfigured(): boolean {
	return !!process.env.REDIS_HOST && !!process.env.REDIS_PORT;
}

export const REDIS_CONFIG = {
	host: process.env.REDIS_HOST,
	port: parseInt(process.env.REDIS_PORT as string, 10),
};
