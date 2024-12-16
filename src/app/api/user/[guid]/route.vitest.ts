import { describe, it, expect, vi } from 'vitest';
import { GET } from './route';
import * as redisFunctions from '@/lib/redis/functions';
import { NextRequest } from 'next/server';
import { mockUser, TEST_BASE_URL } from '@/constants/index.tests';

// Mock external dependencies
vi.mock('@/lib/redis/functions', () => ({
	getFromRedisOrFetch: vi.fn(),
	setCache: vi.fn(),
}));

vi.mock('@/lib/mysql/queries', () => ({
	getUserById: vi.fn(),
}));

describe('User API Route', () => {
	describe('GET /api/user/[guid]', () => {
		it('should return user data when found', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(mockUser);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/user/${mockUser.id}`), { params: { guid: mockUser.id } });

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(mockUser);
		});

		it('should return 404 when user is not found', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(null);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/user/non-existent-id`), {
				params: { guid: 'non-existent-id' },
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toEqual({ error: 'User not found' });
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockRejectedValue(new Error('Test error'));

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/user/${mockUser.id}`), { params: { guid: mockUser.id } });

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data).toEqual({ error: 'Internal Server Error' });
		});

		it('should attempt to fetch from cache first', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(mockUser);

			await GET(new NextRequest(`${TEST_BASE_URL}/api/user/${mockUser.id}`), { params: { guid: mockUser.id } });

			expect(redisFunctions.getFromRedisOrFetch).toHaveBeenCalledWith(
				`user:${mockUser.id}`,
				expect.any(Function),
				expect.any(Number),
			);
		});
	});
});
