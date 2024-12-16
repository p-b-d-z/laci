import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import * as redisFunctions from '@/lib/redis/functions';
import { mockApplication, mockUser } from '@/constants/index.tests';
import { v4 as uuidv4 } from 'uuid';

// Mock Redis configuration
vi.mock('@/lib/redis/config', () => ({
	isRedisConfigured: vi.fn().mockReturnValue(true),
	REDIS_CONFIG: {
		host: 'localhost',
		port: 6379,
	},
}));

describe('Application Approvals API Route', () => {
	const mockApprovalData = {
		applicationId: mockApplication.id,
		approvalId: uuidv4(),
		approverId: mockUser.id,
		approvedAt: new Date().toISOString(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return approval data from cache', async () => {
		vi.spyOn(redisFunctions, 'getFromRedisOrFetch').mockResolvedValue([mockApprovalData]);

		const response = await GET();
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual([mockApprovalData]);
		expect(redisFunctions.getFromRedisOrFetch).toHaveBeenCalledTimes(1);
	});

	it('should handle empty approval data', async () => {
		vi.spyOn(redisFunctions, 'getFromRedisOrFetch').mockResolvedValue([]);

		const response = await GET();
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual([]);
	});

	it('should handle errors gracefully', async () => {
		vi.spyOn(redisFunctions, 'getFromRedisOrFetch').mockRejectedValue(new Error('Test error'));

		const response = await GET();
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data).toEqual({ error: 'Failed to fetch application approvals' });
	});
});
