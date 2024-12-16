import { describe, it, expect, vi } from 'vitest';
import { GET } from './route';
import * as redisFunctions from '@/lib/redis/functions';
import * as mysqlQueries from '@/lib/mysql/queries';
import { mockUser } from '@/constants/index.tests';

// Mock external dependencies
vi.mock('@/lib/redis/functions', () => ({
	getFromRedisOrFetch: vi.fn(),
	setCache: vi.fn(),
}));

vi.mock('@/lib/mysql/queries', () => ({
	getAllUsers: vi.fn(),
}));

describe('User API Routes', () => {
	describe('GET /api/user', () => {
		it('should return all users successfully', async () => {
			const mockUsers = [mockUser];
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(mockUsers);

			const response = await GET();

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(mockUsers);
		});

		it('should return 404 when no users are found', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([]);

			const response = await GET();

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toEqual({ error: 'No users found' });
		});

		it('should return 404 when users is null', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(null);

			const response = await GET();

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toEqual({ error: 'No users found' });
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockRejectedValue(new Error('Test error'));

			const response = await GET();

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data).toEqual({ error: 'Internal Server Error' });
		});

		it('should attempt to fetch from database when cache fails', async () => {
			const mockUsers = [mockUser];
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockImplementation(async (_, fetchFn) => {
				return fetchFn();
			});
			vi.mocked(mysqlQueries.getAllUsers).mockResolvedValue(mockUsers);

			const response = await GET();

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(mockUsers);
			expect(mysqlQueries.getAllUsers).toHaveBeenCalled();
		});
	});
});
