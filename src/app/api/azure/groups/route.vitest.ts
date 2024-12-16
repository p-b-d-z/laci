import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import * as azureAuth from '@/lib/auth/azure-auth';
import * as redisFunctions from '@/lib/redis/functions';
import { NextRequest } from 'next/server';
import { mockAzureGroups, TEST_BASE_URL } from '@/constants/index.tests';
import { ONE_WEEK_TTL } from '@/constants';

// Mock external dependencies
vi.mock('@/lib/auth/azure-auth', () => ({
	getGroups: vi.fn(),
}));

vi.mock('@/lib/redis/functions', () => ({
	getFromRedisOrFetch: vi.fn(),
	setCache: vi.fn(),
	getTTL: vi.fn(),
}));

describe('Azure Groups API Route', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET /api/azure/groups', () => {
		it('should return cached groups without refresh when TTL is high', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(mockAzureGroups);
			vi.mocked(redisFunctions.getTTL).mockResolvedValue(ONE_WEEK_TTL);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/groups`));

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(mockAzureGroups);
			expect(redisFunctions.setCache).not.toHaveBeenCalled();
		});

		it('should trigger background refresh when TTL is low', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(mockAzureGroups);
			vi.mocked(redisFunctions.getTTL).mockResolvedValue(600); // 10 minutes
			vi.mocked(azureAuth.getGroups).mockResolvedValue(mockAzureGroups);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/groups`));

			// Wait for any pending promises
			await new Promise(process.nextTick);

			expect(response.status).toBe(200);
			expect(redisFunctions.setCache).toHaveBeenCalledWith(expect.any(String), mockAzureGroups, ONE_WEEK_TTL);
		});

		it('should return cached groups when available', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(mockAzureGroups);
			vi.mocked(redisFunctions.getTTL).mockResolvedValue(ONE_WEEK_TTL);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/groups`));

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(mockAzureGroups);
			expect(redisFunctions.getFromRedisOrFetch).toHaveBeenCalled();
			expect(azureAuth.getGroups).not.toHaveBeenCalled();
			expect(redisFunctions.setCache).not.toHaveBeenCalled();
		});

		it('should fetch fresh groups when noCache is true', async () => {
			vi.mocked(azureAuth.getGroups).mockResolvedValue(mockAzureGroups);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/groups?noCache=true`));

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(mockAzureGroups);
			expect(azureAuth.getGroups).toHaveBeenCalled();
			expect(redisFunctions.setCache).toHaveBeenCalled();
		});

		it('should handle errors gracefully', async () => {
			const testError = new Error('Failed to fetch groups');
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockRejectedValue(testError);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/groups`));

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data).toEqual({
				error: 'Failed to fetch groups',
				details: testError.message,
				code: undefined,
			});
		});

		it('should handle Azure AD specific errors with error codes', async () => {
			const azureError = new Error('Azure AD Error');
			Object.assign(azureError, { code: 'InvalidAuthenticationToken' });
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockRejectedValue(azureError);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/groups`));

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data).toEqual({
				error: 'Failed to fetch groups',
				details: azureError.message,
				code: 'InvalidAuthenticationToken',
			});
		});
	});
});
