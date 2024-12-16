import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import * as redisFunctions from '@/lib/redis/functions';
import { NextRequest } from 'next/server';
import { TEST_BASE_URL, mockAzureUsers, mockAzureGroups } from '@/constants/index.tests';
import { AzureEntity } from '@/types';
import * as azureAuth from '@/lib/auth/azure-auth';
import { ONE_WEEK_TTL } from '@/constants';

// Mock external dependencies
vi.mock('@/lib/auth/azure-auth', () => ({
	getUsers: vi.fn(),
	getGroups: vi.fn(),
}));

vi.mock('@/lib/redis/functions', () => ({
	getFromRedisOrFetch: vi.fn(),
	setCache: vi.fn(),
	getTTL: vi.fn(),
}));

describe('Azure Search API Route', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET /api/azure/search', () => {
		it('should return empty results when no search term is provided', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce(mockAzureUsers);
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce(mockAzureGroups);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/search`));
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.items).toEqual(
				[...mockAzureUsers, ...mockAzureGroups].map((entity) => ({
					displayName: entity.displayName,
					mail: entity.mail === undefined ? null : entity.mail,
				})),
			);
		});

		it('should filter results based on search term', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce(mockAzureUsers);
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce(mockAzureGroups);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/search?q=test`));
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(
				data.items.every(
					(item: AzureEntity) =>
						item.displayName.toLowerCase().includes('test') || (item.mail && item.mail.toLowerCase().includes('test')),
				),
			).toBe(true);
		});

		it('should handle quoted search terms correctly', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce(mockAzureUsers);
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce(mockAzureGroups);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/search?q="Test User"`));
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.items.every((item: AzureEntity) => item.displayName.toLowerCase().includes('test user'))).toBe(true);
		});

		it('should prioritize exact matches in results', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce(mockAzureUsers);
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce(mockAzureGroups);

			const searchTerm = mockAzureUsers[0].displayName;
			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/search?q=${searchTerm}`));
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.items[0].displayName).toBe(searchTerm);
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockRejectedValue(new Error('Test error'));

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/search?q=test`));
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe('Search failed');
			expect(data.details).toBe('Test error');
		});

		it('should remove duplicate entries based on displayName', async () => {
			const duplicateUsers = [...mockAzureUsers, mockAzureUsers[0]];
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce(duplicateUsers);
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce(mockAzureGroups);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/search`));
			const data = await response.json();

			const uniqueDisplayNames = new Set(data.items.map((item: AzureEntity) => item.displayName));
			expect(uniqueDisplayNames.size).toBe(data.items.length);
		});

		it('should handle cache with high TTL without background refresh', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce(mockAzureUsers);
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce(mockAzureGroups);
			vi.mocked(redisFunctions.getTTL).mockResolvedValue(ONE_WEEK_TTL);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/search`));

			expect(response.status).toBe(200);
			expect(redisFunctions.setCache).not.toHaveBeenCalled();
		});

		it('should trigger background refresh when TTL is low', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce(mockAzureUsers);
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce(mockAzureGroups);
			vi.mocked(redisFunctions.getTTL).mockResolvedValue(600); // 10 minutes
			vi.mocked(azureAuth.getUsers).mockResolvedValue(mockAzureUsers);
			vi.mocked(azureAuth.getGroups).mockResolvedValue(mockAzureGroups);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/azure/search`));

			// Wait for any pending promises
			await new Promise(process.nextTick);

			expect(response.status).toBe(200);
			expect(redisFunctions.setCache).toHaveBeenCalledWith(expect.any(String), expect.any(Array), ONE_WEEK_TTL);
		});
	});
});
