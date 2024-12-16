import { describe, it, expect, vi } from 'vitest';
import { GET } from './route';
import * as azureAuth from '@/lib/auth/azure-auth';
import * as redisFunctions from '@/lib/redis/functions';
import { NextRequest } from 'next/server';
import { mockAzureUsers, TEST_BASE_URL } from '@/constants/index.tests';
import { ONE_WEEK_TTL } from '@/constants';

// Mock external dependencies
vi.mock('@/lib/auth/azure-auth', () => ({
	getUsers: vi.fn(),
}));

vi.mock('@/lib/redis/functions', () => ({
	getFromRedisOrFetch: vi.fn(),
	setCache: vi.fn(),
	getTTL: vi.fn(),
}));

// Add at the top of the file with other imports
type CustomError = Error & {
	code?: string;
};

describe('Azure Users API Route', () => {
	describe('GET /api/azure/users', () => {
		it('should return users from cache by default', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(mockAzureUsers);
			vi.mocked(redisFunctions.getTTL).mockResolvedValue(ONE_WEEK_TTL);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/users`));

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(mockAzureUsers);
			expect(redisFunctions.getFromRedisOrFetch).toHaveBeenCalled();
			expect(azureAuth.getUsers).not.toHaveBeenCalled();
			expect(redisFunctions.setCache).not.toHaveBeenCalled();
		});

		it('should trigger background refresh when TTL is low', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(mockAzureUsers);
			vi.mocked(redisFunctions.getTTL).mockResolvedValue(600); // 10 minutes
			vi.mocked(azureAuth.getUsers).mockResolvedValue(mockAzureUsers);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/users`));

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(mockAzureUsers);

			// Wait for any pending promises
			await new Promise(process.nextTick);

			expect(redisFunctions.setCache).toHaveBeenCalledWith(expect.any(String), mockAzureUsers, ONE_WEEK_TTL);
		});

		it('should bypass cache when noCache parameter is present', async () => {
			vi.mocked(azureAuth.getUsers).mockResolvedValue(mockAzureUsers);
			vi.mocked(redisFunctions.setCache).mockResolvedValue();

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/users?noCache`));

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(mockAzureUsers);
			expect(azureAuth.getUsers).toHaveBeenCalled();
			expect(redisFunctions.setCache).toHaveBeenCalled();
		});

		it('should handle errors gracefully', async () => {
			const testError = new Error('Failed to fetch users');
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockRejectedValue(testError);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/users`));

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data).toEqual({
				error: 'Failed to fetch users',
				details: testError.message,
				code: undefined,
			});
		});

		it('should handle errors with custom error codes', async () => {
			const testError = new Error('Authentication failed') as CustomError;
			testError.code = 'AUTH_FAILED';
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockRejectedValue(testError);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/users`));

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data).toEqual({
				error: 'Failed to fetch users',
				details: testError.message,
				code: 'AUTH_FAILED',
			});
		});
	});
});
