import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DELETE } from './route';
import * as queries from '@/lib/mysql/queries';
import * as userLib from '@/lib/user';
import * as redisLib from '@/lib/redis/functions';
import { NextRequest } from 'next/server';
import { mockApplication, mockEntry, mockUser, TEST_BASE_URL } from '@/constants/index.tests';

vi.mock('@/lib/mysql/queries');
vi.mock('@/lib/user');
vi.mock('@/lib/redis/functions');
vi.mock('@/lib/redis/config', () => ({
	isRedisConfigured: vi.fn().mockReturnValue(true),
	REDIS_CONFIG: {
		host: 'localhost',
		port: 6379,
	},
}));
vi.mock('@/lib/logging/server', () => ({
	default: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

describe('DELETE /api/applications/[guid]/delete', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(userLib.getCurrentUserId).mockResolvedValue(mockUser.id);
		vi.mocked(redisLib.getFromRedisOrFetch).mockResolvedValue(mockApplication);
		vi.mocked(queries.getEntriesByApplicationId).mockResolvedValue([mockEntry]);
		vi.mocked(queries.deleteEntriesByApplicationId).mockResolvedValue();
		vi.mocked(queries.deleteApplication).mockResolvedValue();
		vi.mocked(redisLib.removeCachedApplication).mockResolvedValue();
		vi.mocked(redisLib.removeCachedEntries).mockResolvedValue();
		vi.mocked(queries.insertAuditLog).mockResolvedValue();

		console.log(`IDs | mockApp ${mockApplication.id} mockEntry ${mockEntry.id} mockUser ${mockUser.id}`);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should delete an application and its entries successfully', async () => {
		const request = new NextRequest(`${TEST_BASE_URL}/api/applications/${mockApplication.id}/delete`, {
			method: 'DELETE',
		});

		const response = await DELETE(request, { params: { guid: mockApplication.id } });
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual({ message: 'Application and associated entries deleted successfully' });

		// Verify all operations were called in correct order
		expect(redisLib.getFromRedisOrFetch).toHaveBeenCalledWith(`application:${mockApplication.id}`, expect.any(Function));
		expect(queries.getEntriesByApplicationId).toHaveBeenCalledWith(mockApplication.id);
		expect(queries.deleteEntriesByApplicationId).toHaveBeenCalledWith(mockApplication.id);
		expect(queries.deleteApplication).toHaveBeenCalledWith(mockApplication.id);
		expect(redisLib.removeCachedApplication).toHaveBeenCalledWith(mockApplication.id);
		expect(redisLib.removeCachedEntries).toHaveBeenCalledWith(mockApplication.id);
		expect(queries.insertAuditLog).toHaveBeenCalledWith({
			actor: mockUser.id,
			action: 'delete',
			target: 'application',
			targetId: mockApplication.id,
			changes: {
				id: mockApplication.id,
				name: mockApplication.name,
				hitCount: mockApplication.hitCount,
				enabled: mockApplication.enabled,
			},
		});
	});

	it('should return 401 when user is not authenticated', async () => {
		vi.mocked(userLib.getCurrentUserId).mockResolvedValue(null);

		const request = new NextRequest(`${TEST_BASE_URL}/api/applications/${mockApplication.id}/delete`, {
			method: 'DELETE',
		});

		const response = await DELETE(request, { params: { guid: mockApplication.id } });
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data).toEqual({ error: 'Unauthorized' });
		expect(queries.deleteApplication).not.toHaveBeenCalled();
	});

	it('should return 404 when application is not found', async () => {
		vi.mocked(redisLib.getFromRedisOrFetch).mockResolvedValue(null);

		const request = new NextRequest(`${TEST_BASE_URL}/api/applications/${mockApplication.id}/delete`, {
			method: 'DELETE',
		});

		const response = await DELETE(request, { params: { guid: mockApplication.id } });
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data).toEqual({ error: 'Application not found' });
		expect(queries.deleteApplication).not.toHaveBeenCalled();
	});

	it('should handle database errors gracefully', async () => {
		vi.mocked(queries.deleteEntriesByApplicationId).mockRejectedValue(new Error('Database error'));

		const request = new NextRequest(`${TEST_BASE_URL}/api/applications/${mockApplication.id}/delete`, {
			method: 'DELETE',
		});

		const response = await DELETE(request, { params: { guid: mockApplication.id } });
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data).toEqual({ error: 'Failed to delete application and associated entries' });
	});
});
